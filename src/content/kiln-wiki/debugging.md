---
title: "Debugging"
description: "Why a mod didn't load, the support report to send, the fault policy, crash reports, and breakpoints in a running server."
status: "works"
updated: "2026-11-17"
---

## Start with kiln.log

`kiln logs --mod my-mod`, or read `kiln/logs/kiln.log`. A mod that didn't load says why, and the others load anyway:

```
mod my-mod 0.1.0 loaded in … ms (layout check … ms, assemblies … ms, OnLoad … ms)
[E] [host] mod my-mod 1.0.0 not loaded: missing dependency sample-lib ^1.0
[I] [host] mod my-mod 1.0.0 skipped: side 'client': not loaded on a server
```

Since 0.2.0-dev.29.16 a mod's line splits its load time: the check of its layout, reading its assemblies, and its
`OnLoad` (with the registration of its event handlers). Kiln reads the mods' files ahead on a background thread while
the game starts (`prefetch: …` in kiln.log; `KILN_NO_PREFETCH=1` turns it off).

Data packs log problems per file.

## The mod list

`echo mods > kiln/control/m.cmd` writes each mod's state, error, load order and cost to `kiln/control/m.result.json`.
`kiln/logs/mods.txt` always holds the current list. In code: `Mods.All`.

In the game, **MODS** in the main menu opens the mod manager: the mods of every framework (Kiln, EMF, EML, ShroudForge,
SET, Greeneye and the rest) with their state and the reason, a search box and a **Needs attention** filter for mods that
failed or are missing. See [The Kiln menu](/kiln/wiki/profiles#the-kiln-menu). The launcher's **Logs** page shows the
same per framework, under **Engines**.

| State | Means |
|---|---|
| Loaded | running |
| Failed | couldn't load; `Error` says why |
| Disabled | switched off after too many faults |
| Skipped | made for the other side, or switched off |
| Unloaded | on request |

## Faults and crash reports

An exception escaping your code is a **fault**. Kiln logs it and carries on. After 5 in 60 seconds it disables the mod and writes a
crash report, and the server keeps running. Fix the cause, then `reload <id>`. Tune it in `kiln/kiln.json`:

```json
{ "mods": { "fault_limit": 5, "fault_window_s": 60, "test_timeout_s": 30 } }
```

`kiln/crash-reports/` also gets a report when an exception goes uncaught on another thread or native code faults. See them on the
launcher's **Logs** page and the admin **Crashes** page.

## Common causes

| Symptom | Likely cause |
|---|---|
| "wrong thread" | a service called from a timer or `Task.Run`; post back first |
| the server stutters | something blocks the tick thread |
| a content change isn't reapplied at world load | made in `OnLoad`; use `Content.OnReady` |
| items disappear from saves | the item's GUID changed |
| the old version runs after a reload | a thread, timer or static reference keeps it alive |
| a mod you extracted into the game folder doesn't run | that framework's drop-in switch is off for the profile. The list on the launcher's **Play** shows the mod, marked **Game folder**, with **Load them** or **Add it** ([Profiles and mods](/kiln/wiki/profiles#in-the-game-folder)) |
| an EML mod you added is missing while EML's own `dbghelp.dll` is installed | the launcher copies it into `mods/` when it sets up the profile. Start once from the launcher's **Play** ([Your other loader is installed too](/kiln/wiki/other-mods#your-other-loader-is-installed-too)) |
| an EML mod doesn't apply while a ShroudForge mod is on | ShroudForge runs an EML mod only when its own switch for it is on. The launcher and the in-game Mods menu say why it doesn't run, and suggest a switch where one helps ([EML and ShroudForge together](/kiln/wiki/eml-shroudforge#eml-and-shroudforge-together)) |
| none of ShroudForge's data mods apply | one EML mod failed inside ShroudForge, and ShroudForge dropped its whole startup pass. The in-game Mods menu shows them as failed; the launcher's **Engines** view can still say they run |
| the in-game Mods page is empty next to ReShade or another overlay | since dev.24 Kiln takes the graphics device over when the game makes its swapchain, if the PC has one graphics device. When it can't, kiln.log says why |
| Steam shows the game as running for about a minute after you quit (Linux) | Steam's networking library crashes while the game shuts down, and the system writes a crash dump of several gigabytes. No Kiln or mod code is in that crash |
| a `.rar` is refused | no unrar, 7-Zip or bsdtar on the PC. Extract it and drop the folder |
| the game slows down for seconds at each autosave, on a hard drive | fixed in 0.2.0-dev.29 and 0.2.0-dev.29.3 (GitHub issue 39): Kiln's save data is no longer written when no mod data changed, and Kiln.Saves does its file work on its own thread. The game's write of the world waits for Kiln's file at most 6 seconds; on a slower drive it goes ahead and kiln.log says so, with how long each part of a save took. If it still happens, send a support report: its `tick-stats.jsonl` tells a slow session from a stall at save time |
| the loading screen freezes for seconds at start, on a hard drive | fixed in 0.2.0-dev.29.16: Kiln's check for other mod loaders no longer reads the Windows folder's DLLs and runs on its own thread, and the mods' files are read ahead. Not yet checked on a real hard drive |
| the game or server closes at its start and names mods | Kiln stopped the start on purpose, so a world doesn't lose its mods' progress: [When Kiln stops the start](/kiln/wiki/dedicated-servers#when-kiln-stops-the-start). Don't restart; fix the mod list |
| the game crashes at its start with a frame generation mod (NVIDIA Streamline) | fixed in 0.2.0-dev.29: with Streamline installed Kiln leaves its overlay's drawing off (mod windows, on-screen drawing and screen effects), while key bindings, menu entries and mod loading keep working. `KILN_UI_OVERLAY=1` tries the drawing anyway, `KILN_UI_OVERLAY=0` switches it off. Not yet tried on a PC with such a mod |
| the overlay stays off after a crash at start | if the game closes while Kiln's overlay starts, the next start leaves its drawing off and kiln.log says why; after a minute without it, the next start tries once more. Since 0.2.0-dev.29.3, adding, removing or replacing a graphics wrapper (a frame generation mod) also allows one new try. Remove `kiln/state/overlay-start.guard`, or set `KILN_UI_OVERLAY=1`, to try again yourself |
| one key press opens and closes a mod's window at once | fixed in 0.2.0-dev.29.3 for a focus change while the key is held. If it still happens, kiln.log has a line `ui: key … went down again … ms after its last press`; send it |
| a mod's settings page says its file couldn't be saved | a read-only folder or a full disk. Since 0.2.0-dev.29 the page says so until a later save works |

## Save a support report

When mods don't load and the log doesn't say why, save a report. One zip answers what a maintainer would otherwise ask
over several posts: which Kiln, which OS and Proton, which game build, what is in the game folder, what the profile loads
and what the last start did. If you help someone, ask them to send that zip.

- **Launcher:** the **Logs** page, **Support report** above the tabs, then **Save report**. It asks where to put
  `kiln-report-<date>.zip`. **Copy summary** copies a few lines for a forum post. It works with no game found yet, and on
  a server's Logs page.
- **Servers and manual installs:** `kilnctl report [NAME] [--dir D] [--out FILE] [--print]`. `NAME` is a server
  instance, `--dir` a server or game folder. With neither it uses the game Steam knows. `--print` writes the summary to
  the terminal instead of a zip.

It only reads. Nothing is written to the game folder, and the game may be running.

**In the zip:**
- `summary.txt`: the findings in plain sentences (for example "3 mods in the game folder are not loaded by the profile
  'My mods'", with the fix), then the system, the game, Kiln in the game, the profile and the last start;
- `report.json`: the same findings for tools;
- the end of `kiln.log`, `proxy.log` and `eml.log`, and the newest crash report;
- since 0.2.0-dev.29, the end of `kiln/logs/tick-stats.jsonl`: Kiln's step times per minute and world, so a slow session
  can be told apart from a stall at save time. It says how long the game's own wait for its world jobs, each Kiln
  service or plugin and the slowest subscribers took, with a breakdown of each minute's worst step;
- since 0.2.0-dev.29.8, `kiln/state/hooks.json` has a `codePatches` list: each place where the game's code in memory
  differs from the game file, which module changed it, and for a redirected call what it called before. It finds two
  mods that change the same spot;
- since 0.2.0-dev.29.9, kiln.log lines for EMF mod windows: the title and rows when one opens, each click the mod gets,
  and when it closes;
- Kiln's state files, and `profile.json`, `chain.ini` and `kiln.json` as they are, after the removals below;
- the launcher's log, which since 0.2.0-dev.29.10 lists what each add to the Library took and each file it left out, with
  the reason;
- lists of the game folder, Kiln's folder and each framework's mods folder: names, sizes and dates only.

The report calls `steam_api64.dll` in the game folder Steam's own Steamworks DLL (since 0.2.0-dev.29.12; before, "an
unknown DLL"), lists an EML mod that is on but could not be applied as "on, not applied" with the reason (since
0.2.0-dev.29.8; before, "off"), and says what doesn't run of a mod that only partly runs under Kiln (since
0.2.0-dev.29.16).

The zip is usually under 1 MiB, and cut at 6 MiB before compression.

**Removed from every text:** your user name, your home folder, the machine name, Steam account names and ids, and IP
addresses (except your own machine's 127.x). In JSON, values of fields named like a secret or an address (token, password,
key, cookie, host and similar) are replaced.

**Never read:** saves and world data, mod settings (`kiln/config`, including `network.json`), the admin pages' data, the
contents of any mod (only names, sizes and dates), and Steam's files except the name of the compatibility tool, your
launch options and the account names it needs to remove. `summary.txt` ends with this list.

Read `summary.txt` before you post it. A character or server name you chose can appear in a log line, and the report
can't recognise that.

If something is broken, the report still works: no Kiln, no game folder, a damaged profile or an unreadable file become
lines under "Not readable", and the rest is written. Tested with unit tests and the launcher's own tests; a report made
on a real Windows PC or Steam Deck is not checked yet.

## Hooks and other DLLs

When a feature stops working next to another DLL mod, check the hook lines in kiln.log (new in dev.21):

```
[kiln] hooks: chat/ChatLogAdd chained over enshwick.dll+0x11ea80
[kiln] hooks: xhl.dll+0x4410 hooked over Kiln's chat/ChatLogAdd (Kiln's detour stays armed; it is reached through their jump)
[W] [kiln] compat: overlap: xhl-core.dll+0x11ea80 hooked chat/ChatLogAdd before chat, emf; Kiln chained over it. ...
```

`kiln/state/hooks.json` lists every hooked function, its links in order, overlaps, the compat rules that fired and
(since 0.2.0-dev.29.8) `codePatches`, every place another module changed the game's code. The
fix for an overlap is usually to load the other DLL late:
[closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods). For your own hooks: [Hooks and patches](/kiln/wiki/hooks).

## Breakpoints

`kiln debug` attaches [netcoredbg](https://github.com/Samsung/netcoredbg) to the mods in a running local server: breakpoints, stack,
locals, watches, stepping.

> A breakpoint pauses the whole server, for everyone on it. Debug on a test server.

[VS Code](/kiln/wiki/vscode) bundles the debugger. For another editor:

1. Get netcoredbg's **win64** build (tested: 3.2.0-1092), even on Linux. Put `netcoredbg.exe` in `tools/netcoredbg/` in Kiln's data
   folder, or set `KILN_NETCOREDBG`.
2. Deploy a Debug build, so its `.pdb` goes along: `kiln deploy --reload`.
3. Start the server: `kiln run --server <name>`.
4. Use `kiln debug --server <name> --dap` as your debug adapter, and send an `attach` with no `processId`.

`kiln debug --server <name>` alone shows what it would run. Debug on the machine that built the mod: breakpoints match the
`.pdb`'s paths.

Disconnecting or closing your editor never ends the server, and a server in a Steam library is always refused. These can still hurt:

- killing netcoredbg while attached ends the server with no save: disconnect instead;
- a mod that leaks its old copy can make breakpoints miss and a disconnect end the server. `kiln debug` warns; restart first;
- watch expressions run in the server.

After `kiln reload`, disconnect and attach again.

Tested on dedicated servers under Linux and Wine. Windows servers are untested, and the game client isn't covered.
