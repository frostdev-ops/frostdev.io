---
title: "EML and ShroudForge mods"
nav: "EML and ShroudForge"
description: "Kiln runs EML data mods and ShroudForge's Lua mods unchanged, with no extra loader and no Wine settings."
status: "pending"
updated: "2026-11-10"
---

EML (the Enshrouded Mod Loader) and ShroudForge are the frameworks with the most Enshrouded mods. Both come with Kiln
and are installed by default. New in 0.2.0-dev.18: both work on test servers, and no player has checked them in the
game yet.

## EML mods

EML mods change the game's data before the game starts: stats, stack sizes, recipes, loot, new items. Kiln runs them
with EML's own code, so they behave as they do under EML. Kiln itself stays MIT; its EML part is GPL-3, like EML.

1. Put the mod in `mods/<mod>/` in the game folder (the folder with `mod.json` and `src/mod.lua`), or as a zip. Or drop
   it on the launcher window, as a zip, 7z or rar ([what it accepts](/kiln/wiki/other-mods#adding-mods-in-the-launcher)).
   A mod id with capitals, such as `HoardersHelper`, is fine. A hand-placed mod loads when the profile's **EML mods**
   drop-in is on ([Drop-in folders](/kiln/wiki/profiles#drop-in-folders)).
2. Start the game or the server through Kiln.

`kiln/logs/kiln.log` then says how many EML mods ran, for example
`kiln-eml: 2 EML mod(s) loaded, 3 resource(s) patched`.

What you don't need:
- EML's `dbghelp.dll`.
- On Linux and the Steam Deck, the `WINEDLLOVERRIDES="dbghelp=..."` setting EML needs. Kiln starts EML's code itself.

How it behaves:
- **A broken mod doesn't stop the game.** Under EML, one bad mod stops the game with a "Fatal error". On Kiln that mod
  is switched off, the log names it, and the other mods still apply.
- **A mod that can't be read is switched off first.** Since dev.21, a mod whose `src/mod.lua` is missing or unreadable
  is switched off before the long game-data step. `kiln/state/eml.json` and kiln.log give the reason, for example
  `entry src/mod.lua: file metadata failed: ...`. A file that vanishes during the run drops only its own mod.
- **Fast starts.** When nothing changed since the last start, Kiln skips the work, and since dev.21 it reads almost no
  game data to find that out. Since dev.22 that includes the first start. [Faster starts](#faster-starts-dev21-and-dev22).
- **Game updates.** After an update Kiln applies your EML mods again, before the world loads. EML mods need none of
  Kiln's hooks, so they apply even on a game build Kiln doesn't know yet.
- **Back to vanilla.** Remove every EML mod and the next start puts the original game data back. The launcher also has
  **Restore vanilla game data** on the Logs page and the profile's Engines tab.
- **Kiln asset packs win.** If a Kiln mod's assets and an EML mod change the same game resource, the Kiln mod's
  version is the one you see.
- **EML installed too.** When EML's own loader runs, Kiln stands aside: EML has already applied the mods. When EML's file
  is there but didn't start (Proton without its setting), Kiln runs the mods. Since dev.22 Kiln checks that the
  `dbghelp.dll` is really the loaded code. Without a DLL override under Proton it isn't, so Kiln runs the mods. That
  was tested under Wine with a stand-in `dbghelp.dll`, not yet on a Steam Deck.
- **Your profile's EML mods under EML's own loader.** EML reads only `mods/`, never Kiln's Library. So while EML's
  `dbghelp.dll` is installed, the launcher copies the profile's EML mods into `mods/<name>/` for it, and removes
  its copies when the loader is gone. Activate the profile again after you install EML's loader. If you already have the
  same mod in `mods/` under another folder name, Kiln adds no second copy (EML stops the game on a duplicate id) and
  yours runs. `kiln/state/eml.json` lists each profile mod as `own-loader` (EML runs Kiln's copy) or `not-loaded` with
  the reason, and kiln.log warns about each one that doesn't load. [Details](/kiln/wiki/other-mods#your-other-loader-is-installed-too).

EML mods change data that the server and every player need to agree on. Use the same EML mods on the server and in
each player's game. A server with bigger stacks and a player without them can lose items.

## Faster starts (dev.21 and dev.22)

To know whether anything changed, EML checks the game's data files. Before dev.21 that read every file several times
per start: on a full client install (about 48 GiB) even a start that changed nothing read 48 GiB. Since dev.21 Kiln
reads each file at most once per start, and not at all while the OS shows it unchanged since it was last read. Since
dev.22 that holds for the first start too. The checks are the same; Kiln just doesn't re-read what can't have changed.

Measured on a lab server under Wine, with 7.5 GiB of real server data. Not measured on a real client yet.

| Start | Full read (`KILN_EML_FULL_HASH=1`) | dev.21 |
|---|---|---|
| nothing changed | 7.6 GiB read, 5.4 s | 562 B read, 64 ms |
| after a mod change | 30.2 GiB read, 13.4 s | 141.5 MiB read, 1.0 s |

- **The first start no longer reads all game files.** Before dev.22, a start with no cache, and the first start after a
  Kiln update, read every game file once (about 48 GiB on a full client) with nothing on screen. A Steam Deck player
  saw nothing for minutes and closed the game. Now the big data files (`.dat`) are recorded by their change stamp
  without being read. On the lab server the first start took 1.9 s, where dev.21 read the 7.8 GiB and took 6.6 s.
  For a full client install, Kiln's count is about 0.3 GiB from the drive and about 1.6 GiB in all, most of it files
  written a moment before. That count comes from the file sizes of a real install and a test on a synthetic 55-file
  data set. It was not measured on a real install.
- **A start that was closed continues.** If you close the game during a long read, the next start goes on with the
  files it had already read. With the first start this short there is rarely much to continue.
- **You can see it.** When the step takes longer than two seconds, a small window "Preparing the game data for EML
  mods" shows a line of text and a bar. It never takes the keyboard focus and is gone before the game's window appears.
  Under gamescope (Game Mode on a Steam Deck) it is meant to cover the screen, with the panel in the middle; that has not
  been seen on a Deck. It doesn't appear on a server, with `KILN_UI_DISABLE=1`, or where there is no desktop. The Play page shows the same, for example "Preparing the game data
  for EML mods: 12.3 GiB of 48.6 GiB". kiln.log says what is read and why, then a line every five seconds with the
  share done, and a warning when a read moves no byte for 15 s. `kiln/state/eml.json` says `phase: "running"` with the
  progress.
- **kiln.log** says what was read: `[eml] Fingerprints: hashed 562 B in 4 file(s), reused 22 file(s) (7.6 GiB not read)`.
  A first start says how many files it recorded unread. A start with no change says `nothing changed since the last run`.
  If it says `Change stamps are not trusted here`, it names the reason, and that start reads every file in full. Please
  report it.
- **exFAT and FAT** game folders don't keep the times Kiln needs. EML reads every game file in full at every start there,
  as before. It now shows its progress, in the window, on the Play page and in the log.
- **What this trusts.** The first record of a game file rests on its change stamp alone. A file that was already damaged
  or patched by another tool before Kiln first saw it counts as the starting point. Steam's **Verify integrity of game
  files** is the check for that. A change after the first record shows. Copying the game folder to another drive, or a
  program that touches every file, makes the next start patch again.
- **After a power loss or a hard crash of the machine**, a game file can come back changed with its old size and times.
  Start once with `KILN_EML_FULL_HASH=1` in the launch options, or let Steam verify the game files.
- `KILN_EML_FULL_HASH=1` turns the reuse off: every file is read in full, as in EML 0.2.0.
- Kiln's EML cache file (`kiln/eml/cache/files.json`) gains change stamps, and in dev.22 a list of the files it recorded
  without reading. An older Kiln still reads it, and may patch once more.

## ShroudForge mods

Kiln ships ShroudForge's runtime, built from Kiln's fork of ShroudForge. So ShroudForge mods run even if you never
installed ShroudForge.

1. Put the mod in `mods/<mod>/` in the game folder, or in the folder set in ShroudForge's settings. Or drop it on the
   launcher window, as a zip, 7z or rar. A package whose id has capitals imports too (ShroudForge's own id rule applies:
   letters of both cases, digits, `.`, `-` and `_`, at most 80 characters). A hand-placed mod is read when the profile's
   **ShroudForge mods** drop-in is on ([Drop-in folders](/kiln/wiki/profiles#drop-in-folders)).
2. Turn it on and set its options. Use the launcher (the profile's **Engines** tab, **Settings**), ShroudForge's
   in-game Modloader window, or the mod's `extended.mod.json`. A setting marked "live" changes while you play.
3. Start the game or the server through Kiln.

`kiln/logs/kiln.log` names the runtime that runs (`ShroudForge runtime: bundled ...`) and shows ShroudForge's own log
as `[sf] ...` lines. On Linux and the Steam Deck you need no Wine setting beyond Kiln's own.

How the launcher places the mods: it puts a profile's ShroudForge package in ShroudForge's mods folder as `<name>/`.
ShroudForge drops every package whose id it finds twice, so when a folder there (your own copy) holds the same package
id already, Kiln leaves its copy out and yours runs. Since dev.22, with the **ShroudForge mods** drop-in on, Kiln hosts
ShroudForge for the packages you put in its mods folder by hand too, not only for a ShroudForge mod in the profile. Once
ShroudForge runs, it runs the whole folder, switch or not.

### Your own ShroudForge

If ShroudForge is installed already, keep it.

- Installing Kiln asks before it takes over ShroudForge's `dinput8.dll`. ShroudForge's other files, its folder, your
  mods and settings stay.
- To run your installed ShroudForge instead of Kiln's copy: in the launcher, **Settings > Kiln > ShroudForge mods >
  Use my installed ShroudForge**, then restart the game. If your copy is missing or broken, Kiln uses its own and says so
  in the log.
- Kiln's copy updates with Kiln. Your own copy doesn't update itself at game start while Kiln runs it. Run ShroudForge's
  updater with the game closed. If it puts its own `dinput8.dll` back, reinstall Kiln from the launcher; your mods stay.
- If ShroudForge starts by itself next to Kiln (through its own `dbghelp.dll`), Kiln lets it and starts nothing twice.
  The launcher puts the profile's ShroudForge mods, and the profile's EML mods, into ShroudForge's mods folder for it. Without a
  DLL override under Proton that `dbghelp.dll` doesn't run, and Kiln runs the mods itself.

**Engine hooks (dev.21).** When Kiln hosts ShroudForge, ShroudForge's six engine hooks go through Kiln's
[hook registry](/kiln/wiki/hooks). Another DLL's hook on one of them (XHL, a closed-source mod) no longer switches
ShroudForge's native runtime off. On the current game build these hooks are dormant: no shipped game profile names them.
`KILN_SF_ENGINE_HOOKS=self` in the launch options keeps the old behaviour. If a closed-source DLL still clashes, load it
[after Kiln and ShroudForge](/kiln/wiki/other-mods#closed-source-dll-mods).

**Linked home folder.** Since dev.21 ShroudForge placement no longer refuses a game folder just because `/home` is a
link to `/var/home` (Fedora Atomic, Bazzite). Links inside the managed folders are still refused.

To start once without ShroudForge mods, use **Play without mods once**, or set `KILN_SHROUDFORGE=0` in the launch
options.

## EML and ShroudForge together

ShroudForge contains EML. Both change the game's files before the game starts, and two writers in a row would undo each
other. So Kiln lets only one write per start:

- When ShroudForge runs, it applies the ShroudForge mods and the EML mods in its mods folder (`mods/` by default). Keep
  your EML mods there.
- EML mods that are only in Kiln's EML folder (`kiln/eml/mods`) don't apply in a start where ShroudForge runs. The log
  says which writer ran. EML mods of a launcher profile do apply when the profile has an enabled ShroudForge mod: since
  dev.22 the launcher copies them into ShroudForge's mods folder, and `kiln/state/eml.json` lists them as `own-loader`.
  A profile with EML mods and no ShroudForge mod is run by Kiln's EML part, as before.
- With no ShroudForge mod in use, Kiln's EML part applies every EML mod.

## On a server

Both run on dedicated servers. The [server pack](/kiln/wiki/dedicated-servers#the-server-pack) includes them. Put the
mods in the server's `mods/` folder, or sync them from the launcher's server **Mods** page. Players need the same EML
data mods as the server; Kiln's join check doesn't compare them yet. See
[Servers and players](/kiln/wiki/other-mods#servers-and-players).

## Not tested yet

- In a player's game: an EML mod's effect, ShroudForge's Modloader window, keybinds and in-game mods. On test servers
  both ran their mods and their settings changed live.
- dev.21's faster EML starts and dev.22's first start (no full read) on a real client install, with the progress window
  and the Play page line.
- EML's own `dbghelp.dll` in the game folder, with a profile's EML mods copied for it, on Windows. And the same
  folder under Proton without a DLL override on a Steam Deck. Both ran with stand-in loader DLLs under Wine.
- An EML mod on a `/home -> /var/home` host (Fedora Atomic, Bazzite).
- EML mods that add new items, checked in a player's game.

## dev.20 pairing with EMF

**Included in 0.2.0-dev.20.** EMF 0.6.0 / API v27 support includes upstream-compatible mod messages used by the current
Lua/Beastmaster path. ShroudForge and EMF keep their own mod folders and settings. Kiln's join check does not prove that
every other framework's mods and settings match between server and player.

Two dedicated-server checks loaded ShroudForge beside unmodified EMF Lua 1.19 and Beastmaster 1.13, plus the enabled
bear 2.1 / beasts 2.2 asset packs. Each framework started once per run and each API v27 network probe passed 11/0. The first
boot committed 89 resources and added two items; the next reused identical patched resource hashes. Those checks verified
the earlier Wine **Access denied** startup fix. They predate the final recovery guard and do not establish every mod pair.

The bundled SF fork is pinned at `1ef3896068b9106a96743e55850b599d8cd08aad` (`1.7.9 kiln.1ef3896`). Its clean component
was rebuilt with matching source/submodule records and licenses. Reader/publication/recovery hardening and native review
are complete; recovery checks cover refusal of linked staged paths. This source and build evidence is separate from the
earlier mixed boots.

Offline portrait checks through the actual Windows DLL rendered wolf PNGs from a read-only client archive and reused the
cache on Wine C: and mounted Z: paths. Symbolic/junction redirects are refused without external mutation. Custom-pack
portraits displayed in game remain unverified. Beastmaster capture/release, stable E prompts, wheel input, commands and
joined-player synchronization still need hosted and joined game checks. The exact other SF mod from the original report
was not identified, so these records cannot establish its compatibility.

Use matching required mod/dependency versions on every side the mod requires, and keep a test copy of the world for the
check. [EMF support and limits](/kiln/wiki/emf-mods#dev20-support).
