---
title: "EML and ShroudForge mods"
nav: "EML and ShroudForge"
description: "Kiln runs EML data mods and ShroudForge's Lua mods unchanged, with no extra loader and no Wine settings."
status: "pending"
updated: "2026-11-19"
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
   drop-in is on ([Drop-in folders](/kiln/wiki/profiles#drop-in-folders)); the list on the launcher's **Play** shows it,
   marked **Game folder**, with **Load them** when that switch is off.
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
- **Back to vanilla.** Switch off every EML mod and the next start through Kiln puts back the game data Kiln can prove
  it wrote. **Game files Kiln can't prove it wrote are never overwritten or deleted** (since dev.24): leftovers of
  older versions are moved to `kiln/eml/displaced` in the game folder, and the launcher names them (Logs, **Engines**,
  and the **Engines** view from the list on Play). When Kiln can't prove the data is its own, it leaves it and says why;
  Steam's **Verify integrity of game files** is the other way back.
- **A failed start says why** (0.2.0-dev.29). When Kiln's EML part can't prepare the game's data, the log and each
  mod's status name the step and the cause, for example a backup of the game's data that no longer matches what Kiln
  recorded, with what to do: verify the game files in Steam, then start through Kiln again. Before, every EML mod said
  only "the EML run failed (Failed to create AppState)".
- **Kiln asset packs win.** If a Kiln mod's assets and an EML mod change the same game resource, the Kiln mod's
  version is the one you see.
- **A Kiln mod in EML's `mods` folder says so** (0.2.0-dev.29.18). A Kiln mod's folder or zip there, or one unzipped
  loose, used to be listed as "skipped: no mod.json (not an EML mod)". Now kiln.log warns that it is a Kiln mod and to
  add its zip in the launcher (Library, Add mods; on a server, unzip it into `kiln/mods/<mod>/`). Other zips without a
  `mod.json` say so too, instead of "specified file not found in archive".
- **EML installed too.** When EML's own loader runs, Kiln stands aside: EML has already applied the mods. When EML's file
  is there but didn't start (Proton without its setting), Kiln runs the mods. Since dev.22 Kiln checks that the
  `dbghelp.dll` is really the loaded code. Without a DLL override under Proton it isn't, so Kiln runs the mods. That
  was tested under Wine with a stand-in `dbghelp.dll`, not yet on a Steam Deck.
- **Your profile's EML mods under EML's own loader.** EML reads only `mods/`, never Kiln's Library. So while EML's
  `dbghelp.dll` is installed, the launcher copies the profile's EML mods into `mods/<name>/` for it, and removes
  its copies when the loader is gone. Press **Play** in the launcher once after you install EML's loader. If you already have the
  same mod in `mods/` under another folder name, Kiln adds no second copy (EML stops the game on a duplicate id) and
  yours runs. `kiln/state/eml.json` lists each profile mod as `own-loader` (EML runs Kiln's copy) or `not-loaded` with
  the reason, and kiln.log warns about each one that doesn't load. [Details](/kiln/wiki/other-mods#your-other-loader-is-installed-too).

### Restore the game's data

New in 0.2.0-dev.29. If Kiln's EML mods all fail because the game folder holds game data and backups another mod loader
made, the launcher's **Engines** view (Logs, Engines) offers **Restore the game's data**:

1. Verify the game files in Steam (the game's Properties, Installed Files, "Verify integrity of game files"). If Steam
   repaired files, start the game once more: Kiln reads the list of leftover files at a start.
2. **Restore the game's data** lists the leftover files and moves them into a folder under `kiln/eml/displaced`.
   Nothing is deleted, and **Undo move** puts them back.

It isn't offered while ShroudForge prepares the game's data for your profile, and it has not run on Windows or on a real
game folder yet. If it doesn't appear or refuses, the manual way still works: move the extra `enshrouded_NNN.dat` files
and the two `.bak` files out of the game folder.

### EML mods that bring their own DLL

Some EML mods come with a DLL that ShroudForge loads (Quiver & Spellbook, Auto Loot Plus, Endless Chests). Since
0.2.0-dev.29 they run whole even when your profile has no ShroudForge mod: Kiln starts ShroudForge for them by itself.
Before, only the mod's data was applied and its extra slots never appeared; the mod's own page warns that the game drops
what is in those slots at the next save in that state. Where ShroudForge can't run (its part of Kiln isn't installed, or
you switched it off), the mod is skipped entirely with the reason, never half. After updating, start once and check that
the mod's slots are there before you save.

With EML's own loader in the game folder (its `dbghelp.dll`, or in a DLL chain), ShroudForge can't start, so such a mod's
DLL would never run. Activating the profile and **Play** then stop and name the mods and the loader: switch those mods
off, or remove that loader. Mods that only patch game data are unchanged.

On Windows, with ShroudForge mods in the profile, these mods now switch on: ShroudForge writes its folder as
`\\?\C:\...`, and Kiln used to compare the two spellings letter by letter. An `extended.mod.json` you made by hand as a
workaround can stay; Kiln takes it as its own switch. Kiln's in-game Mods page treats that folder as the same folder
however ShroudForge spells it.

### EML mods with a Shroudtopia module

Some mods come as an EML mod (its `mod.json` and Lua) with a Shroudtopia module beside it in the same folder: Skill
Search (the module draws its search box) and the In Game Ping System (its markers). The launcher adds such a mod as an
EML mod. Since 0.2.0-dev.29.13 Kiln also loads the Shroudtopia module of an EML mod that is switched on, so both halves
run; before, the module started only with Shroudtopia's drop-in folder on. If you removed its `mod.json` and `src`
folder as a workaround, add the mod again as it came.

### EML mods with a modified loader

Some mods ship EML's `dbghelp.dll` rebuilt with code of their own, such as Put Away Your Weapon's holster hotkey. Kiln
runs such a mod's EML part (its Lua), but never that DLL: it is a whole EML loader that would patch the game's data a
second time. Since 0.2.0-dev.29.16 the launcher marks the mod **Only partly runs** and says what doesn't run, as do
kiln.log and the support report; before, it called the DLL "not needed".

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
2. Turn it on and set its options. Use the launcher (its switch in the list on **Play**, and **Settings** in its
   menu), Kiln's in-game **Mods** menu (since dev.24 a page per ShroudForge mod with its switch, its settings and its
   buttons), ShroudForge's in-game Modloader window, or the mod's `extended.mod.json`. A setting marked "live" changes
   while you play.
3. Start the game or the server through Kiln.

`kiln/logs/kiln.log` names the runtime that runs (`ShroudForge runtime: bundled ...`) and shows ShroudForge's own log
as `[sf] ...` lines. Since 0.2.0-dev.29.18 ShroudForge's own errors and warnings keep their level there, so the support
report's counts and the launcher's log filters include them. On Linux and the Steam Deck you need no Wine setting
beyond Kiln's own.

**Shortcuts** of ShroudForge mods work with the ShroudForge that Kiln brings along since dev.24; you no longer need
ShroudForge installed for them. This is what broke steering with W and S on the glider with ShroudForge's Unlimited
Flight; that steering was seen working in a real game (Linux, Proton). With ShroudForge mods on, Kiln's **Mods** entry
is in the game's main menu again (also seen in a real game). In 0.2.0-dev.26 that entry was missing in every start in
which Kiln ran ShroudForge; 0.2.0-dev.27 brings it back, with Kiln's ShroudForge and with **Use my installed
ShroudForge**. Kiln brings ShroudForge 1.7.9; 1.8.0 is not released yet,
and Kiln will support it when it is out.

How the launcher places the mods: it puts a profile's ShroudForge package in ShroudForge's mods folder as `<name>/`.
ShroudForge drops every package whose id it finds twice, so when a folder there (your own copy) holds the same package
id already, Kiln leaves its copy out and yours runs. A mods folder set to another drive in ShroudForge's settings
(`paths.mods`, for example `C:\sfmods` under Proton) is found the way ShroudForge finds it, through the game's Wine
prefix; before 0.2.0-dev.27 the launcher copied the mods into the game's own `mods` folder there, where ShroudForge
didn't look. Since dev.22, with the **ShroudForge mods** drop-in on, Kiln hosts
ShroudForge for the packages you put in its mods folder by hand too, not only for a ShroudForge mod in the profile. Once
ShroudForge runs, it runs the whole folder, switch or not.

**A ShroudForge mod you had before Kiln** stays your own folder when you add it to your list: Kiln never moves,
replaces or switches a folder it did not put there, and says so once. Since 0.2.0-dev.26 you can still change its
settings in the launcher (the mod's menu, Settings): Kiln writes only the setting you change. When two of your folders
hold the same package, ShroudForge leaves the package out and the launcher asks you to keep one. Changing a setting in
ShroudForge's own in-game menu no longer makes Kiln treat its copy of a mod as yours.

**An EML mod you copied into ShroudForge's folder yourself** (0.2.0-dev.28). While your profile has a ShroudForge mod
on, ShroudForge runs the EML mods in its folder, but only those switched on there, and it keeps a mod you copied in by
hand switched off. Kiln says so in these words: "You put this mod into ShroudForge's folder yourself, and ShroudForge
has it switched off. Switch it on in Kiln's in-game menu (Mods > ShroudForge), or remove the folder and add the mod
with Add mods." Kiln never writes into a folder it did not put there; a mod you add with Add mods runs from Kiln's own
copy, which Kiln switches on for ShroudForge. The launcher's list of mods in the game folder no longer says such a mod
loads. On a dedicated server, which has no in-game menu, only the second way is named.

**Spawning mods** (SpiderHook's grapple, for one) did nothing under Kiln in earlier releases: Kiln changed the start of
five of the game's building functions for every player, and ShroudForge reads one of them to find the game's spawn code.
Since 0.2.0-dev.29 Kiln leaves those functions alone unless one of your Kiln mods uses build events or protection zones.
With such a mod in your profile, the ShroudForge that Kiln ships should find that code anyway (frostdev-ops/shroudforge
pull request 1 by AlexK-Notable, with a follow-up of ours, and pull request 2). That was seen in ShroudForge's own
tests and under Wine, not in a game yet: SpiderHook itself hasn't been run beside a Kiln mod that uses building. kiln.log
says which way ShroudForge's check went (`[sf] ... executable file accepted ...` or `refused: <reason>`). Other loaders'
code patches (EMF's memory writes, SET, Flame) can still hide the spawn code from it.

**Faster starts with asset mods** (0.2.0-dev.29.16). With a ShroudForge asset mod that also exports a file (Holster
Toggle, for one), every start restored the game's data and applied all asset mods again: over two minutes on a Steam
Deck. ShroudForge now keeps a record beside its backup (`enshrouded.kfc.prepared.json`) and skips that step while the
mods, the game build, the game's data files and the exported files are as the last start left them. Any change, or
anything it can't check, applies them again, and so does another program replacing the game's data file. Its status
file is also written every 3 seconds instead of about 1.5 times a second. Not yet checked in a real game.

### When one startup mod fails

New in 0.2.0-dev.29.18. ShroudForge writes its startup mods (the ones that change game data) into the game files in one
pass before the game starts. When one of them failed there, for example because another mod had changed the same data,
ShroudForge put the game data back and the game started with none of them. The ShroudForge that comes with Kiln now
runs that pass once more without the mod that failed (and without mods that need it), so the others load.

- kiln.log names the mod and its error. The launcher (**Engines** from the list on Play, the Deck's Home) and the
  support report warn with its name and error, and suggest turning it off or checking for a clash with another mod.
  From there you can also send it to Kiln support ([Kiln's Discord in the launcher](/kiln/wiki/install#kilns-discord-in-the-launcher)).
- It tries again only once, and not for failures that are not one mod's (access denied, the game's files). When the
  second pass fails too, the game starts without the startup mods, as before.

Tested on a dedicated lab server with one and with two failing mods; not yet on a game client.

### Settings changed in the game, in copy mode

Since 0.2.0-dev.29.18 ShroudForge mod settings changed in the game's Kiln menu (MODS) apply on a Steam Deck with the
game on an SD card. There the launcher often runs the game in copy path mode, and the menu changed a second copy of the
mod's settings that ShroudForge never reads: the values looked saved, the game started with the old ones, and the next
profile update put that copy back. The menu now changes the copy ShroudForge runs (its FOLDER line names
`mods\<mod>`), and profile updates keep what you set. A copy an older Kiln changed that way is kept in `kiln/backups/`
at the next profile update, and the launcher says so. On a Deck, change a ShroudForge mod's settings in the game's Kiln
menu, or in the launcher's desktop screens with the game closed: Deck mode itself has only on, off and remove for mods
so far. Thanks to ljam for the report and the photos. Not yet checked on a Deck.

**A ShroudForge mod with a `native-plugin.ini`** (Unified Tweaks) is listed once, under ShroudForge, since
0.2.0-dev.29.18; before, the Mods page also listed it under XHL as "Not loaded". While a ShroudForge mod that is also an
XHL-Core plugin is off, Kiln keeps XHL-Core from loading it ([XHL mods](/kiln/wiki/other-mods#xhl-mods)).

### ShroudForge's own loader in the game folder

New in 0.2.0-dev.29: when ShroudForge's own loader is in the game folder, Kiln says so. The Engines view's ShroudForge
row names the loader file, and the mod list shows one notice when your profile has ShroudForge mods. If that loader
runs, Kiln's ShroudForge steps aside and ShroudForge reads its own mods folder: your profile's switches still update the
ShroudForge mods Kiln placed there, while folders you put there yourself keep their own switches. The way out is in the
notice: remove that file, or **Let Kiln manage ShroudForge**. kiln.log says at each start whether that loader actually
ran. Nothing about what loads has changed.

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
- **On Linux and the Steam Deck, with `dbghelp=n,b` and `winmm=n,b` in Steam's launch options**, ShroudForge 1.7.9's
  own loader runs and can't write its mods into the game data (it fails at every start under Proton). The launcher says
  so on the Deck's Home, in the desktop's **Engines** view and in the support report, and names the mods that didn't
  load. Take those two out of `WINEDLLOVERRIDES` (keep `dinput8=n,b`) and Kiln's own ShroudForge runs the mods. Kiln
  doesn't take over from a loader the launch options start.

**Engine hooks (dev.21).** When Kiln hosts ShroudForge, ShroudForge's six engine hooks go through Kiln's
[hook registry](/kiln/wiki/hooks). Another DLL's hook on one of them (XHL, a closed-source mod) no longer switches
ShroudForge's native runtime off. On the current game build these hooks are dormant: no shipped game profile names them.
`KILN_SF_ENGINE_HOOKS=self` in the launch options keeps the old behaviour. If a closed-source DLL still clashes, load it
[after Kiln and ShroudForge](/kiln/wiki/other-mods#closed-source-dll-mods).

**Linked home folder.** Since dev.21 ShroudForge placement no longer refuses a game folder just because `/home` is a
link to `/var/home` (Fedora Atomic, Bazzite). Links inside the managed folders are still refused. Since
0.2.0-dev.29.12 a game folder that is itself a link or junction works too: the Engines view no longer shows ShroudForge
with "invalid game path" for it, and says why when a game folder really is unusable.

To start once without ShroudForge mods, use **Just once**, **Without mods** on the launcher's Play, or set
`KILN_SHROUDFORGE=0` in the launch options. That variable switches ShroudForge off until you remove it: setting it to 0
does not mean "default". Since 0.2.0-dev.29.7 an EML mod that needs ShroudForge says so when it is skipped for that
reason: remove the variable, restart Steam and the Kiln launcher, and start the game again. Since 0.2.0-dev.29.8 the
support report lists such a mod as "on, not applied" with the reason, not as "off". Going back to ShroudForge alone no longer needs a reinstall (dev.24): Kiln's
EML part used to put the game's data files back from a backup although ShroudForge had patched them.

## EML and ShroudForge together

ShroudForge contains EML. Both change the game's files before the game starts, and two writers in a row would undo each
other. So Kiln lets only one write per start:

- When ShroudForge runs, it applies the ShroudForge mods and the EML mods in its mods folder (`mods/` by default), but
  only those its own switch for that mod has on. Keep your EML mods there.
- EML mods that are only in Kiln's EML folder (`kiln/eml/mods`) don't apply in a start where ShroudForge runs. The log
  says which writer ran. EML mods you added in the launcher do apply when a ShroudForge mod is on too: the launcher
  copies them into ShroudForge's mods folder, and since dev.24 it sets ShroudForge's switch for each of them from your
  list, also on Linux when EML's own `dbghelp.dll` is still in the game folder. Before, nobody applied those copies, and
  Kiln said they ran. `kiln/state/eml.json` lists them as `own-loader`.
- **When ShroudForge doesn't run one.** The launcher and the in-game Mods menu say why: switched off in ShroudForge, made
  for the other side, or a file ShroudForge refuses. They suggest a switch only where a switch helps. A folder you put
  in ShroudForge's mods folder yourself is never written. Values you set in ShroudForge for an EML mod are kept when the
  mod is switched off, removed, or Kiln is uninstalled.
- **One failing mod no longer stops the whole pass** (0.2.0-dev.29.18). The ShroudForge that comes with Kiln runs its
  startup pass again without the mod that failed, and the launcher names it
  ([When one startup mod fails](#when-one-startup-mod-fails)).
- **An EML mod you put into the game's `mods` folder yourself** runs from your folder while ShroudForge runs the EML
  mods. The launcher says so, and when ShroudForge has it switched off, where to switch it on: Kiln's in-game menu,
  **Mods**, **ShroudForge**, or ShroudForge's own Modloader. Kiln doesn't write into folders you installed.
- With no ShroudForge mod in use, Kiln's EML part applies every EML mod, as before.

## On a server

Both run on dedicated servers. The [server pack](/kiln/wiki/dedicated-servers#the-server-pack) includes them. Put the
mods in the server's `mods/` folder, or sync them from the launcher's server **Mods** page. Players need the same EML
data mods as the server; Kiln's join check doesn't compare them yet. See
[Servers and players](/kiln/wiki/other-mods#servers-and-players).

## Not tested yet

- In a player's game: an EML mod's effect, ShroudForge's Modloader window and most in-game mods. On test servers
  both ran their mods and their settings changed live. dev.24 saw two things in a real game (Linux, Proton, one client):
  Kiln's main-menu entries with ShroudForge mods on, and W and S steering with ShroudForge's Unlimited Flight. dev.24's
  ShroudForge switch for EML mods was tested on Linux hosts and dedicated test servers, not in a game.
- dev.21's faster EML starts and dev.22's first start (no full read) on a real client install, with the progress window
  and the Play page line.
- EML's own `dbghelp.dll` in the game folder, with a profile's EML mods copied for it, on Windows. And the same
  folder under Proton without a DLL override on a Steam Deck. Both ran with stand-in loader DLLs under Wine.
- An EML mod on a `/home -> /var/home` host (Fedora Atomic, Bazzite).
- EML mods that add new items, checked in a player's game.
- 0.2.0-dev.29.18's second startup pass on a game client, and ShroudForge mod settings on a Steam Deck in copy mode.

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
