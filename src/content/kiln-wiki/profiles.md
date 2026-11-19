---
title: "Profiles and mods"
nav: "Profiles and mods"
description: "Every mod in one list on Play, saved sets of mods as profiles in Settings, the mods in your game folder, the library, update notices, rolling back an update, and mod settings in the launcher or in game."
status: "works"
updated: "2026-11-19"
---

## Profiles

Since 0.2.0-dev.24 there is no profile to set up. Kiln keeps your mods in one profile, **My mods**, by itself, and the
launcher's main screen (**Play**) is one list of every mod you added, for whatever loader, each with an on/off switch.
Every game start uses that list, Steam's included. If you uninstall Kiln and install it again, the profile you used is
loaded again, and a mod you drop goes into it.

<!-- shot: launcher-profiles | Settings, Profiles: the saved profiles with Load, and "Save current as..." -->

A profile is a saved set of mods and their switches. For several sets (one for a server, one for a solo run), open
**Settings**, **Profiles**:

| Action | Does |
|---|---|
| Load | makes that profile the one in use. The list on Play then shows its mods |
| Save current as... | saves the mods and switches you have now under a new name. The profile you had stays loaded |
| Rename | renames a profile |
| Folders and notes | the profile's name, mod data, [drop-in folders](#drop-in-folders) and notes |
| Delete | deletes a profile, after a typed confirmation. The loaded one can't be deleted |
| No profile | no profile at all: the game folder decides, and the mods in it load as they are |

Each profile shows how many mods it has (of every kind) and the server it is for. A [server's modpack](/kiln/wiki/modpacks)
makes a profile named **Server: &lt;name&gt;**, listed here too. When a profile other than **My mods** is loaded, Play
names it in one small link at the top ("Profile: Ember run"), which opens Settings, Profiles.

**A mod dropped while no profile is loaded** asks which profile to add it to; **New profile…** there makes an empty
one under the name you give, and the message after it has **Load it**.

A broken profile file means **no mods at all**, with the reason in the log. Kiln never silently loads another set.

The launcher no longer has a **Profiles** page, a profile picker on Play, a profile's Mods, Native, EMF, Engines, Configs
and Saves tabs, or a **Library** page. Where those went:

| Was | Now |
|---|---|
| a profile's **Mods** and **EMF** tabs, the **Library** page | the list on **Play** |
| **Native** tab | **Native and DLLs**, next to **Load order** (from the list on Play) |
| **Engines** tab | **Engines**, from the list on Play |
| **Configs** tab | **Configs** in a mod's menu, or next to **Load order** |
| **Saves** tab | the **Saves** page |
| **Play a profile once** | gone. Load the other profile in Settings, Profiles. **Just once** on Play still has **Vanilla** and **Without mods** |

## The list on Play

One row per mod, by name: its switch, its kind (Kiln, EMF, EML, ShroudForge, SET, Greeneye, Flame, Native and so on),
its version, and a short note only when there is something to say ("Starts with your world", "Will not run",
"Failed at the last start", "Left in the game folder"). The line above it counts every kind: "12 mods on, 3 off."

- **Runs from the game folder** (0.2.0-dev.29.7): a mod Kiln copies into the game folder for the game to load itself,
  such as a `powrprof.dll` plugin loader or Ultimate ASI Loader with `.asi` mods
  ([Mods that run from the game folder](/kiln/wiki/other-mods#mods-that-run-from-the-game-folder)). Load order lists
  them under "From the game folder". "Will not run" stays for mods that really don't load.
- **Only partly runs** (0.2.0-dev.29.16): a mod that ships a modified EML loader with code of its own. Kiln runs its EML
  part, not that DLL, and says what doesn't run
  ([EML mods with a modified loader](/kiln/wiki/eml-shroudforge#eml-mods-with-a-modified-loader)).
- **The switch.** Off keeps the mod in your list with its version and settings.
- **The menu** (the three dots, or a right click on the row): Switch on/off, **Settings** (for mods that have them, such as
  ShroudForge's and Shroudtopia's), **Configs** (when the mod wrote a config file), **Cook again** (a Kiln mod with a
  cook recipe: [Mods the launcher cooks](/kiln/wiki/install#mods-the-launcher-cooks)), **Use &lt;version&gt;** (another
  version you have), **Roll back to &lt;version&gt;** ([after an update](#rolling-back-an-update)), **Replace DLL…** (a
  native DLL mod: [below](#replace-dll)), **Open folder**, **Remove &lt;version&gt;** (one of several versions) and
  **Remove**.
- **Above the list:** **Filter** and **Kind** (with more than six rows), **All on** and **All off**, **Notes**, **Load
  order**, **Engines** and **Add mods** (zip, 7z, rar and DLL files). Dropping a file anywhere on the window adds a mod
  too, switched on. Settings' **Switch new mods on** (on by default) decides that; switched off, new mods are added off.
  Since 0.2.0-dev.29.18 a newer file of a mod you have says "Updated Night Owl: 1.2.0 → 1.3.0" instead of "Added", on the
  desktop and on the Deck.
- **Play waits while a profile is being applied** (0.2.0-dev.29.18). Loading a profile, adding a mod, installing a
  modpack or updating Kiln writes your mods into the game folder, which can take a while. Play now says "Applying
  profile…" (or "Installing Kiln…", "Removing Kiln…") and stays off until that work is done or has failed, whatever
  started it, on the desktop and on the Deck. **Without mods** and the other ways to start wait too. Before, Play could
  be pressed in the middle of it.
- **What an add left out** (0.2.0-dev.29.10). When an add left a file out or found one not needed, its message stays
  until you close it. **Last adds** above the list shows your last 10 adds with those details, also after a restart, and
  `launcher.log` lists them, so a support report carries them.
- **All on** and **All off** switch every mod the list shows, in one go. Narrow the list with **Filter** or **Kind**
  first, and the buttons say **Shown on** and **Shown off**. **Undo** in the message after it (shown for 20 seconds) puts
  the switches back; it leaves a mod you switched yourself since, and says so when the profile was changed or another one loaded
  in between.
- **Load order** shows every mod that is on, in the order a start brings them up, then the ones that are on but don't
  load (with the reason) and the ones that are off. Its neighbours are **Native and DLLs**, **Engines** and **Configs**.
- **Engines** shows which loader runs which kind of mod, how each did at the last start, and the other loaders found next
  to the game.
- **Filter and search boxes** (the mod list, Logs, a server's Mods, its console and Kiln commands, the Catalog and the
  item search) have a clear (X) button while they hold text, and Esc empties them. Esc in an empty box still closes the
  dialog it is in.
- **Notices in the list** (0.2.0-dev.29). When ShroudForge's own loader is in the game folder and your profile has
  ShroudForge mods, the list shows one notice and the Engines view's ShroudForge row names the loader file
  ([ShroudForge's own loader](/kiln/wiki/eml-shroudforge#shroudforges-own-loader-in-the-game-folder)). When Shroudlink
  mods are on in your game but Shroudlink's client addon isn't, the list says the mods still run and that the in-game
  MODS tab needs the addon, and offers to switch the addon on when it is in the Library.

### When Kiln stops the start

New in 0.2.0-dev.29. Kiln ends a start before any world loads when going on would cost a world its mods' progress: the
mods' NPCs don't fit the Survivors roster, the mods' NPCs and quests couldn't be built at all, or a boot mod the profile
requires failed. Where the launcher used to go back to Play as if you had quit, it now shows **Kiln stopped the start**
with the reason, the mods by name and a button to the mod list filtered to them. Switch those mods off or update them,
then press Play again. `kilnctl run`, `start` and `status` print the same reason.

The launcher also no longer says "Kiln has said nothing for ... s" for a whole session while you play: a start whose
main menu Kiln didn't see now ends at your first world, and kiln.log names what didn't come. A selection made right after
switching profiles is no longer lost.

### Several mods at once

Each row has a tick box. Shift+click ticks a range, Ctrl+A every mod the list shows, Esc none. A bar above the list then
has **Switch on**, **Switch off**, **Remove…** and **Clear** for the ticked mods. Removing asks once, naming them all and
the other profiles that list them; a mod that can't go (a running server uses it) stays, with the reason, while the
others go. On the Steam Deck, L2 selects a mod and R2 acts on the selection.

### Changed on disk

A mod you edit in its own folder (its menu, **Open folder**, then its `mod.json` or its files) shows **Changed on disk**,
with **Use the changed files**. One click makes your edit the mod's files, and the list shows its new name. **Play** and
**Load** name the changed mod and offer the same; before 0.2.0-dev.27 they said "library hash mismatch" and the mod had
to be zipped and added again.

- Extra files you put in the folder (a settings file beside a plugin) come along.
- When the library already holds a file of the same name with other contents, it stops and deletes nothing.
- A mod that is already copied into the game (an EML mod in the game's `mods` folder) runs with the old files until it
  is placed again.

### Mod updates

New in 0.2.0-dev.28. The launcher can tell you when a mod has a newer version: press **Check for updates** above your
mods, or switch on **Check for mod updates once a day** in Settings, Launcher (off by default). A mod with a newer
version shows **Update 1.1.0** in its row; **New upload** means the same version was published again as another file.

- **A notice is only a link** to the mod's page. Nothing is downloaded, installed or switched for you, and the version
  your profile uses stays the one you chose.
- **Updates…** in a mod's menu shows what the last check said, in words, or lets you tell Kiln where a mod is published.
  Kiln looks where you said, then where its author said (`updates` in the [manifest](/kiln/wiki/manifest#update-checks-updates));
  it never guesses from a name. A mod with neither shows "No update source".
- **What a check sends:** for a GitHub source, a request for the repository's public release list, with no account and
  nothing about you, your PC or your other mods. A check never downloads a mod.
- "Update unknown" and "Update check is stale" mean the check could not tell; they never mean up to date.

Mod authors: `kiln updates check` runs the same check from a terminal ([The kiln command](/kiln/wiki/cli)).

### Rolling back an update

New in 0.2.0-dev.29. When you update a mod (drop its new version on the launcher, add it from the Catalog, or pick
another version with **Use &lt;version&gt;**), Kiln keeps the version you had in your Library, with a copy of the
settings files that mod had written into its folder in the game. That works for every kind of mod Kiln holds.

- **Roll back to &lt;version&gt;** in the mod's menu puts that version back into your profile, switched on or off as it
  was. The message has **Undo**, and nothing is downloaded. A mod Kiln placed in the game folder gets its earlier
  version back with the settings files Kiln could keep at the update. A Kiln mod's own profile settings stay as they are.
- **A setting you change after a roll back stays yours:** Kiln only puts back a settings file that is still as it was
  before the roll back.
- **Roll back twice.** The version you rolled back from is kept now, so you can go back to it the same way.
- **How many.** Settings, Launcher, **Earlier versions to keep**: 1 by default, up to 5 per mod and profile, 0 keeps
  none. Kiln doesn't keep a version when your disk would get too full; the update says so and goes on. Settings,
  **Library** lists every kept version with its size; **Clean up** never removes one.
- **If the launcher or the PC stops** in the middle of an update or a roll back, the next start finishes or undoes what
  it can still verify. If it can't, it keeps the recovery files and says what needs attention. A real power cut has not
  been tested, only the order in which things are written. A mod whose folder you placed by hand is never taken over.
- A roll back's settings wait when the game folder has moved since they were kept (the launcher says so). A 0.2.0-dev.28
  launcher shows a kept version as one more version, and its Clean up may remove it.

From a terminal: `kilnctl library rollback <profile> kind:id[@version]`.

### Replace DLL…

New in 0.2.0-dev.29. For a patched DLL you got from a mod's author or its forum. A native DLL mod from the Library that is
in your profile has **Replace DLL…** in its menu: choose the DLL, and Kiln makes a new build of the same mod with that
one file swapped. The mod keeps its place in your list, its switch and its settings.

- **Which file is replaced:** the one with the same file name. When the mod has exactly one DLL and yours has another
  name, Kiln asks first, and the file keeps the mod's name, because the loader finds it by that name. A different kind
  of DLL than the one it replaces is asked about too.
- **The build you had is kept** for **Roll back to … (earlier build)**, under the same Earlier versions to keep setting.
  If keeping it is switched off or the disk check refuses, the result says so and the old build stays an ordinary
  Library version.
- **The version stays the author's.** The row shows it with "replaced DLL" and the date, and update notices still offer
  a later release.
- Adding a bare DLL as before still makes a new mod. Not run on Windows yet.

From a terminal: `kilnctl library replace-dll native:<id> <file> --profile <profile-id>`.

## In the game folder

Mod pages often say "extract it into the game folder". The list on Play shows every mod you put there by hand, marked
**Game folder**, with whether it loads and why. Copies Kiln placed or synced itself, Kiln's own plugins and hidden
entries are not listed. Your files are never moved or deleted.

A game-folder mod has no switch: nothing per mod could honour one. It shows its state and, where it helps, a fix:

| State | Means | What you can do |
|---|---|---|
| Loads from the game folder | the profile reads that folder, or the framework's own loader runs it | nothing |
| Does not load | the framework's drop-in switch is off (for ShroudForge and Enshwick also: the profile has no enabled mod of theirs). Or the mod sits in a folder its loader doesn't read (an EMF mod in `mods`), or the folder holds several mods, or Kiln isn't installed | one of the two fixes below |
| A copy is in your list | your list has the same mod | nothing: the list's copy wins |
| Can't run | Kiln doesn't know it as a mod, it is a link, an Ember mod, or a DLL over 64 MiB | nothing; hover for the reason |

The two fixes:

- **Load them** switches that framework's [drop-in folder](#drop-in-folders) on, when that is enough.
- **Add it** adds the mod to the library and to your list, switched on. Your folder stays as it is.

When a framework's own loader is in the game folder, the launcher says so ("EML's own loader (dbghelp.dll) is installed:
it runs the EML mods in mods/"). On Windows a loader under a proxy name (`dbghelp.dll`, `powrprof.dll`) always runs.
Under Wine and Proton it runs only with a DLL override, which the launcher can't see. So there a mod counts as loading
only when Kiln reads its folder, and the line names the loader.

**Files a mod wrote are kept.** Since dev.24, files a mod wrote into its folder in the game (settings, logs, saved
values) are carried to the new version at an update, and kept in `kiln/kept-mod-files` when the mod is switched off or
Kiln is uninstalled. A folder you changed yourself stays where it is; the launcher says so, and whether that mod may
still run.

Since 0.2.0-dev.29.18:

- **A changed mod copy is never thrown away without a word.** In copy path mode (on Linux, when the game can't reach
  the Library through Wine's `Z:` drive: a Flatpak Steam, or often a Steam Deck with the game on an SD card), Kiln
  keeps copies of your mods under `kiln/profiles/` in the game folder. A profile update used to replace such a copy
  silently when it had been changed there. A copy whose only change is the mod's own settings file (an EML mod's
  `config.txt`, say) now stays as it is. Any other changed copy goes to `kiln/backups/` before the Library's files go
  in, and the launcher's notes name it.
- **Mod files are never read-only.** A mod added from a folder kept a read-only file read-only, in the Library and in the
  game, so its settings could not be saved. Kiln now makes those files writable for you (nothing else about their
  permissions changes), and the next profile update fixes copies placed before.

**Notes about mod folders.** Since 0.2.0-dev.26 the launcher tells you once about a folder it leaves alone, files it
kept and its notes on your mods, not at every change to your mods. **Notes** above the list shows them again. In
Settings, **Show notes about mod folders** turns them off; the one notice that still comes is the first about a
folder that may still run a mod you switched off. A long notice shows its first lines and **Show all**.

## Drop-in folders

A profile's **Folders and notes** (Settings, Profiles; also on the **Load order** view) has one switch per kind of folder:

| Switch | Folder |
|---|---|
| Kiln mods, Native mods, Plugins, EMF mods | `kiln/mods`, `kiln/native`, `kiln/plugins`, `emf/mods` |
| EML mods | `mods`, `kiln/eml/mods` |
| ShroudForge mods | ShroudForge's mods folder (`mods` unless its settings say otherwise) |
| Greeneye mods | `greeneye` |
| Flame mods | `mods` |
| Shroudtopia mods | `mods` |
| Enshwick mods | `mods` |
| shroudlink mods (servers) | `shroudlink_mods` |

**The one rule.** With a profile loaded, a framework's own folder is read when its switch is on, and not otherwise.
Every framework follows it since dev.22. Before, Greeneye, Flame, Shroudtopia, shroudlink and Ember read their folder
whenever the profile had no mod of that framework, and Enshwick's loader ran for every hand-installed folder.

**Profiles from before dev.22 keep loading what they loaded.** The launcher shows their switches as on, and saving the
settings writes them down. Only a `profile.json` you wrote by hand, without the list of switches, stops loading those
folders.

Some loaders read their whole folder themselves once they run: ShroudForge, when Kiln hosts it for an enabled ShroudForge
mod of the profile, and Enshwick's loader, once the profile has an Enshwick mod. The switch doesn't change that. SET has
no switch: `shrouded_engine_tweaks/mods` always loads. Ember's mods are found but don't run yet.

## The library

The library is where Kiln keeps every mod's files, by version. You don't open it to add a mod: drop the mod's archive
(zip, 7z or rar), folder or DLL on the launcher window, or choose it with **Add mods** above the list on Play. The
launcher identifies it (Kiln, DLL, EMF or [another framework](/kiln/wiki/other-mods)) and adds it to the list, switched
on. What it accepts, and how mods with capitals in their id or a loader DLL in the package are handled:
[Adding mods in the launcher](/kiln/wiki/other-mods#adding-mods-in-the-launcher). A mod for another framework is listed
under its id in lower case, with its own id shown next to it.

**Settings**, **Library** shows how many mods and versions it holds, its size on disk and its folder (**Open**).

- **Remove** is in a mod's menu on Play. The mod leaves your list, then its versions leave the library. It is one click
  with a plain confirmation; to type the mod's name first, switch on **Type a mod's name to remove it** in Settings.
  Another profile that lists the mod is named in the confirmation, and shows it as missing afterwards. **Remove
  &lt;version&gt;** removes one of several versions.
- **Clean up** (Settings, Library) removes every version no profile and no game uses, after a typed confirmation. It never
  lists a version the game's loaded profile uses.
- **While Enshrouded runs**, removing is refused: "Close Enshrouded first: the game may be reading this mod". Force doesn't
  change that. A running server blocks removal only when its profile points into the library. (New in dev.21.)

### The data folder

Everything Kiln keeps lives in one data folder: the library, runtimes, modpacks, profiles and backups. It starts as
`%LOCALAPPDATA%\Kiln` on Windows and `~/.local/share/kiln` on Linux. Since 0.2.0-dev.26 you can move it: **Settings**, **Library**,
**Data folder**, **Change**, then pick a folder or a drive (a drive root such as `D:\` becomes `D:\Kiln`).

- Kiln copies everything, checks the copy, switches to it and only then removes the old folder. A move that fails or that
  you cancel changes nothing.
- An interrupted move removes only the files Kiln can prove it copied; anything else stays and is listed.
- A place whose paths would be too long for the game is refused, with the reason.
- After a move, start only 0.2.0-dev.26 or newer: an older launcher doesn't know the new place and starts empty.
- Close Enshrouded and stop your servers first: the move is refused while one of them runs.

The move was tested by the launcher's own tests, not yet in the installed launcher or on Windows. Keep a copy of your
backups elsewhere before the first move.

## Without a profile

With **No profile** (Settings, Profiles), Kiln loads the drop-in folders `kiln/mods`, `kiln/native`, `kiln/plugins` and
`emf/mods`, and the other frameworks' own folders ([where they are](/kiln/wiki/other-mods#where-the-mods-go)). Play then
says "No profile is loaded: the mods in the game folder load as they are.", and the switches stay off until you load a
profile. With a profile, each folder is read when its [switch](#drop-in-folders) is on. An empty `.disabled` file in a
mod's folder switches it off.

## Mod settings

Each mod has a commented JSON file in the profile's config folder. Change it:

- in the launcher: **Configs** in the mod's menu on Play (it opens the config editor on that mod's file), or the
  **Configs** view next to **Load order**. ShroudForge and Shroudtopia mods also have **Settings** in their menu;
- in game, in the **Kiln menu**: press **Insert**, or choose **Mods** in the main or pause menu, then **Config**.

Kiln checks every value. Most apply at once; the form says which need a restart. In the game, **Apply** shows the
applied values at once, and a slider has a number field beside it: type the value (on a wide range, a value such as 2.5
is hard to reach by dragging).

Since 0.2.0-dev.29.16:

- **A config Kiln can't read at start is never reset.** If a mod's config file is locked or unreadable when the game
  starts, Kiln leaves it alone and reads it again, instead of writing the mod's defaults over it.
- **Linux: values set in the launcher stay.** With a Flatpak or Snap Steam (or a Wine prefix without `Z:`), the
  launcher works on a copy of the configs, and a value you set on **Configs** was replaced by the game's older copy at
  the next start or mod update. Now only what the game changed is copied back. When both sides changed a file, the newer
  wins and the other is kept as `<name>.conflict-<time>`, with a warning. The first start after the update may leave such
  a file where the two copies already differed. Not yet checked in a real game.

## The Kiln menu

<!-- shot: kiln-menu | The in-game Kiln menu, Mods tab -->

| Tab | Shows |
|---|---|
| Mods | the mods of every framework: version, state, errors and settings. Its **Kiln settings** row has Kiln's own settings: **Look** (since 0.2.0-dev.29.16), **Language** and Kiln's configs |
| Network | the server's Kiln version, mods and warnings |
| Keys | key bindings: click one, then press the new key, a mouse side or middle button, or turn the wheel. **Reset** puts the default back; since 0.2.0-dev.29.9 **Unbind** leaves an action without a key (not Kiln's own menu key, which would lock the menu away) |
| Graphics | since 0.2.0-dev.29.18: the frame cap, DLSS settings, the readout and the upscaler behind the game's FSR 3, with what runs now ([Graphics](/kiln/wiki/in-game#graphics)) |
| Overlay | display scale and a test message |

It works with gamepad, mouse and keyboard. Since 0.2.0-dev.29.16 Kiln's menus use the game's colours and font; pick
another look under **Mods > Kiln settings > Look** or in the launcher's Settings (not yet checked in a real game). The
look, chat history and Kiln's line in the main menu: [Kiln in the game](/kiln/wiki/in-game). The language:
[Kiln in your language](/kiln/wiki/languages).

**The mod manager in the main menu.** Since dev.22 **MODS** in the game's main menu opens this menu's Mods tab as a
page in the game's own look. Its left column has **All mods**, **Needs attention** (only when a mod failed or its folder
is missing) and one row per framework with its count. The middle column lists the mods with a state: Loaded, Waiting,
Off, Failed, Not loaded or Missing, and has a search box (every word must match the name, id or framework). The right
column shows the selected mod with the full reason and what to do about it. Escape, or B on a gamepad, goes back to the
main menu. In a world, **Mods** in the pause menu, or Insert, opens the same list over the game. Where the game's menu
page can't be used (another game build, say), **Mods** in the main menu opens that list over the game as well. The page
itself has not been reported from a real client yet.

Since dev.24 each ShroudForge mod has a page there with its switch, its settings and its buttons, and an EML mod that
ShroudForge does not run says why. With ShroudForge mods on, Kiln's entries are in the main menu again (ShroudForge wraps
the game's menu entries, and Kiln's were lost behind it); that was seen in a real game (Linux, Proton). A ShroudForge mod that does all its work at startup shows "applied" instead of "Waiting".
Next to ReShade or another overlay the page is no longer empty; when Kiln still can't draw, kiln.log says why.

A ShroudForge mod that shows **Waiting** says what it waits for in its details. SF Unlimited Flight, for one, waits
whenever you are not gliding, and works only in a world your own game hosts.

### Menu entries of mods

Mods can add entries to the game's main menu and pause menu. When they add more than fit, the pause menu scrolls (mouse
wheel, arrow keys, gamepad), so **Quit** stays reachable. The main menu doesn't scroll: there a menu shows mods'
entries while there are 3 or fewer and leaves the rest to the Mods page. The same goes for the pause menu on a game build
where it can't scroll.

Every mod's entry is also on Kiln's **Mods** page under **Menu entries**, each doing what its row in the menu does.
**Kiln settings** on that page has the choice, `modEntries`: **Auto** (the default: every entry where the pause menu
scrolls, else as Few), **Few** (only while a menu has 3 or fewer), **Always** or **Never**.

The scrolling was tried in one real game before 0.2.0-dev.27 shipped. Should it ever end the game, Kiln switches it off
for that Kiln version and game build by itself and says so at the next start; delete `kiln/state/menu-scroll.off` to try
again.

## Logs

The **Logs** page follows Kiln's, the game's and each mod's log, and lists crash reports. Its **Save report** button
makes a zip to send when mods don't load: [Save a support report](/kiln/wiki/debugging#save-a-support-report).
