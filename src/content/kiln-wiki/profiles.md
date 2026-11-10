---
title: "Profiles and mods"
nav: "Profiles and mods"
description: "Keep sets of mods as profiles, build a mod library, see the mods in your game folder, and change mod settings in the launcher or in game."
status: "works"
updated: "2026-11-10"
---

## Profiles

A profile is a list of mods with its own folder of settings. Create, duplicate, delete and activate them on the **Profiles**
page. Every game start uses the active one, Steam's included. If you uninstall Kiln and install it again, the profile you
used is active again, and a mod you drop goes into it.

<!-- shot: launcher-profiles | A profile's Mods tab with the load-order preview -->

| Tab | Holds |
|---|---|
| Mods | Kiln mods: on or off, version, add from the library, with a load-order preview. Below them, [In the game folder](#in-the-game-folder) |
| Native | DLL mods by load time; drag to reorder within a group. The chain card: other DLLs, **Load after Kiln and ShroudForge**, hook overlaps and compat rules ([closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods)) |
| EMF | EMF mods |
| Engines | mods for the [other frameworks](/kiln/wiki/other-mods): EML, ShroudForge, SET, Greeneye, Creative Mode, Shroudtopia, Enshwick, shroudlink, Ember. Below them, [In the game folder](#in-the-game-folder) for those frameworks |
| Configs | mod settings |
| Saves | backups made while playing this profile |

A broken profile file means **no mods at all**, with the reason in the log. Kiln never silently loads another set.

**Play a profile once** (on the Play page) starts another profile without switching to it. Since dev.21 that start also
follows the other profile's compat rules and late DLLs. The next normal start is back to the active profile's. Since
dev.22 it is refused for a framework whose own loader is installed (EML's `dbghelp.dll`, for example) when the other
profile's mods of that framework differ from the active profile's: that loader's folder is fixed for a start. The
message says to activate the profile instead.

## In the game folder

Mod pages often say "extract it into the game folder". The profile's **Mods** tab (every kind of mod) and **Engines**
tab (the other frameworks) list those mods under **In the game folder**: every mod you put there by hand, whether it
loads with this profile, and why. Copies Kiln placed or synced itself, Kiln's own plugins and hidden entries are not
listed. Your files are never moved or deleted.

| State | Means | What you can do |
|---|---|---|
| Loads | this profile reads that folder, or the framework's own loader runs it | nothing |
| Not loaded | the framework's drop-in switch is off (for ShroudForge and Enshwick also: the profile has no enabled mod of theirs). Or the mod sits in a folder its loader doesn't read (an EMF mod in `mods`), or the folder holds several mods, or Kiln isn't installed | one of the two buttons below |
| In this profile | the profile lists the same mod | nothing: the profile's copy wins |
| Can't run | Kiln doesn't know it as a mod, it is a link, an Ember mod, or a DLL over 64 MiB | nothing; the line says why |

The two buttons:

- **Load the game-folder EML mods** (the name follows the framework: Greeneye, Flame and so on) switches that
  framework's drop-in on, when that is enough.
- **Add to this profile** adds the mod: the Library imports it from your folder and the profile lists it, switched on.
  Your folder stays as it is.

When a framework's own loader is in the game folder, the tab says so ("EML's own loader (dbghelp.dll) is in the game
folder and loads its mods itself"). On Windows a loader under a proxy name (`dbghelp.dll`, `powrprof.dll`) always runs.
Under Wine and Proton it runs only with a DLL override, which the launcher can't see. So there a mod counts as loading
only when Kiln reads its folder, and the line names the loader.

The Play page shows one line when the active profile leaves some of these out ("3 mods in the game folder do not load
with this profile") and links here. The list is cheap to make: one listing per folder, at most 512 entries, no mod
opened.

## Drop-in folders

The profile's **Settings** has one switch per kind of folder, under **Drop-in folders** (Kiln's own) and **Other
engines' folders**:

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

**The one rule.** With an active profile, a framework's own folder is read when its switch is on, and not otherwise.
Every framework follows it since dev.22. Before, Greeneye, Flame, Shroudtopia, shroudlink and Ember read their folder
whenever the profile had no mod of that framework, and Enshwick's loader ran for every hand-installed folder.

**Profiles from before dev.22 keep loading what they loaded.** The launcher shows their switches as on, and saving the
settings writes them down. Only a `profile.json` you wrote by hand, without the list of switches, stops loading those
folders.

Some loaders read their whole folder themselves once they run: ShroudForge, when Kiln hosts it for an enabled ShroudForge
mod of the profile, and Enshwick's loader, once the profile has an Enshwick mod. The switch doesn't change that. SET has
no switch: `shrouded_engine_tweaks/mods` always loads. Ember's mods are found but don't run yet.

## The library

Drop a mod's archive (zip, 7z or rar), folder or DLL on the **Library** page. The launcher identifies it (Kiln, DLL, EMF
or [another framework](/kiln/wiki/other-mods)), keeps every version, and can clean up versions no profile uses. What it
accepts, and how mods with capitals in their id or a loader DLL in the package are handled:
[Adding mods in the launcher](/kiln/wiki/other-mods#adding-mods-in-the-launcher). A mod for another framework is listed
under its id in lower case, with its own id shown next to it.

- **Remove** names what uses the version, and its button waits for that list. It refuses if something it didn't name
  uses the version.
- **Clean up** removes versions in no profile. It never lists a version the game's active profile uses.
- **While Enshrouded runs**, both are refused: "Close Enshrouded first: the game may be reading this mod". Force doesn't
  change that. A running server blocks removal only when its profile points into the Library. (New in dev.21.)

## Without a profile

With no active profile, Kiln loads the drop-in folders `kiln/mods`, `kiln/native`, `kiln/plugins` and `emf/mods`, and
the other frameworks' own folders ([where they are](/kiln/wiki/other-mods#where-the-mods-go)). With a profile, each is
read when its [switch](#drop-in-folders) is on. An empty `.disabled` file in a mod's folder switches it off.

## Mod settings

Each mod has a commented JSON file in the profile's config folder. Change it:

- in the launcher, on the **Configs** tab;
- in game, in the **Kiln menu**: press **Insert**, or choose **Mods** in the main or pause menu, then **Config**.

Kiln checks every value. Most apply at once; the form says which need a restart.

## The Kiln menu

<!-- shot: kiln-menu | The in-game Kiln menu, Mods tab -->

| Tab | Shows |
|---|---|
| Mods | the mods of every framework: version, state, errors and settings |
| Network | the server's Kiln version, mods and warnings |
| Keys | key bindings: click one, press the new key |
| Overlay | display scale and a test message |

It works with gamepad, mouse and keyboard.

**The mod manager in the main menu.** Since dev.22 **MODS** in the game's main menu opens this menu's Mods tab as a
page in the game's own look. Its left column has **All mods**, **Needs attention** (only when a mod failed or its folder
is missing) and one row per framework with its count. The middle column lists the mods with a state: Loaded, Waiting,
Off, Failed, Not loaded or Missing, and has a search box (every word must match the name, id or framework). The right
column shows the selected mod with the full reason and what to do about it. Escape, or B on a gamepad, goes back to the
main menu. In a world, **Mods** in the pause menu, or Insert, opens the same list over the game. Where the game's menu
page can't be used (another game build, say), **Mods** in the main menu opens that list over the game as well. Not yet
seen in a real client.

## Logs

The **Logs** page follows Kiln's, the game's and each mod's log, and lists crash reports. Its **Save report** button
makes a zip to send when mods don't load: [Save a support report](/kiln/wiki/debugging#save-a-support-report).
