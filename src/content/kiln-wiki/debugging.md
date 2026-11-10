---
title: "Debugging"
description: "Why a mod didn't load, the support report to send, the fault policy, crash reports, and breakpoints in a running server."
status: "works"
updated: "2026-11-10"
---

## Start with kiln.log

`kiln logs --mod my-mod`, or read `kiln/logs/kiln.log`. A mod that didn't load says why, and the others load anyway:

```
mod my-mod 0.1.0 loaded in … ms
[E] [host] mod my-mod 1.0.0 not loaded: missing dependency sample-lib ^1.0
[I] [host] mod my-mod 1.0.0 skipped: side 'client': not loaded on a server
```

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
| a mod you extracted into the game folder doesn't run | that framework's drop-in switch is off for the profile. The profile's **In the game folder** list says so, and has a button ([Profiles and mods](/kiln/wiki/profiles#in-the-game-folder)) |
| a profile's EML mod is missing while EML's own `dbghelp.dll` is installed | the launcher copies it into `mods/` when the profile is activated. Activate the profile again ([Your other loader is installed too](/kiln/wiki/other-mods#your-other-loader-is-installed-too)) |
| a `.rar` is refused | no unrar, 7-Zip or bsdtar on the PC. Extract it and drop the folder |

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
- Kiln's state files, and `profile.json`, `chain.ini` and `kiln.json` as they are, after the removals below;
- the launcher's log;
- lists of the game folder, Kiln's folder and each framework's mods folder: names, sizes and dates only.

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

`kiln/state/hooks.json` lists every hooked function, its links in order, overlaps and the compat rules that fired. The
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
