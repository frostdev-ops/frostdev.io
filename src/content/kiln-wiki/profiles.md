---
title: "Profiles and mods"
nav: "Profiles and mods"
description: "Keep sets of mods as profiles, build a mod library, and change mod settings in the launcher or in game."
status: "works"
updated: "2026-11-10"
---

## Profiles

A profile is a list of mods with its own folder of settings. Create, duplicate, delete and activate them on the **Profiles**
page. Every game start uses the active one, Steam's included.

<!-- shot: launcher-profiles | A profile's Mods tab with the load-order preview -->

| Tab | Holds |
|---|---|
| Mods | Kiln mods: on or off, version, add from the library, with a load-order preview |
| Native | DLL mods by load time; drag to reorder within a group. The chain card: other DLLs, **Load after Kiln and ShroudForge**, hook overlaps and compat rules ([closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods)) |
| EMF | EMF mods |
| Engines | mods for the [other frameworks](/kiln/wiki/other-mods): EML, ShroudForge, SET, Greeneye, Creative Mode, Shroudtopia, Enshwick, shroudlink, Ember |
| Configs | mod settings |
| Saves | backups made while playing this profile |

A broken profile file means **no mods at all**, with the reason in the log. Kiln never silently loads another set.

**Play a profile once** (on the Play page) starts another profile without switching to it. Since dev.21 that start also
follows the other profile's compat rules and late DLLs. The next normal start is back to the active profile's.

## The library

Drop a mod's zip, folder or DLL on the **Library** page. The launcher identifies it (Kiln, DLL, EMF or [another framework](/kiln/wiki/other-mods)), keeps every
version, and can clean up versions no profile uses.

- **Remove** names what uses the version, and its button waits for that list. It refuses if something it didn't name
  uses the version.
- **Clean up** removes versions in no profile. It never lists a version the game's active profile uses.
- **While Enshrouded runs**, both are refused: "Close Enshrouded first: the game may be reading this mod". Force doesn't
  change that. A running server blocks removal only when its profile points into the Library. (New in dev.21.)

## Without a profile

Kiln loads the drop-in folders `kiln/mods`, `kiln/native`, `kiln/plugins` and `emf/mods`, and the other frameworks'
own folders ([where they are](/kiln/wiki/other-mods#where-the-mods-go)). A profile can include them too.
An empty `.disabled` file in a mod's folder switches it off.

## Mod settings

Each mod has a commented JSON file in the profile's config folder. Change it:

- in the launcher, on the **Configs** tab;
- in game, in the **Kiln menu**: press **Insert**, or choose **Mods** in the main or pause menu, then **Config**.

Kiln checks every value. Most apply at once; the form says which need a restart.

## The Kiln menu

<!-- shot: kiln-menu | The in-game Kiln menu, Mods tab -->

| Tab | Shows |
|---|---|
| Mods | each mod's version, state, errors and settings |
| Network | the server's Kiln version, mods and warnings |
| Keys | key bindings: click one, press the new key |
| Overlay | display scale and a test message |

It works with gamepad, mouse and keyboard.

## Logs

The **Logs** page follows Kiln's, the game's and each mod's log, and lists crash reports.
