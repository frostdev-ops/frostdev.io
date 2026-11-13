---
title: "Profiles and mods"
nav: "Profiles and mods"
description: "Every mod in one list on Play, saved sets of mods as profiles in Settings, the mods in your game folder, the library, and mod settings in the launcher or in game."
status: "works"
updated: "2026-11-13"
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

- **The switch.** Off keeps the mod in your list with its version and settings.
- **The menu** (the three dots, or a right click on the row): Switch on/off, **Settings** (for mods that have them, such as
  ShroudForge's and Shroudtopia's), **Configs** (when the mod wrote a config file), **Cook again** (a Kiln mod with a
  cook recipe: [Mods the launcher cooks](/kiln/wiki/install#mods-the-launcher-cooks)), **Use &lt;version&gt;** (another
  version you have), **Open folder**, **Remove &lt;version&gt;** (one of several versions) and **Remove**.
- **Above the list:** **Filter** and **Kind** (with more than six rows), **All on** and **All off**, **Notes**, **Load
  order**, **Engines** and **Add mods** (zip, 7z, rar and DLL files). Dropping a file anywhere on the window adds a mod
  too, switched on. Settings' **Switch new mods on** (on by default) decides that; switched off, new mods are added off.
- **All on** and **All off** switch every mod the list shows, in one go. Narrow the list with **Filter** or **Kind**
  first, and the buttons say **Shown on** and **Shown off**. **Undo** in the message after it (shown for 20 seconds) puts
  the switches back; it leaves a mod you switched yourself since, and says so when the profile was changed or another one loaded
  in between.
- **Load order** shows every mod that is on, in the order a start brings them up, then the ones that are on but don't
  load (with the reason) and the ones that are off. Its neighbours are **Native and DLLs**, **Engines** and **Configs**.
- **Engines** shows which loader runs which kind of mod, how each did at the last start, and the other loaders found next
  to the game.

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

## The Kiln menu

<!-- shot: kiln-menu | The in-game Kiln menu, Mods tab -->

| Tab | Shows |
|---|---|
| Mods | the mods of every framework: version, state, errors and settings |
| Network | the server's Kiln version, mods and warnings |
| Keys | key bindings: click one, then press the new key, a mouse side or middle button, or turn the wheel |
| Overlay | display scale and a test message |

It works with gamepad, mouse and keyboard.

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
