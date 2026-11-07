---
title: "Install Kiln"
description: "Add Kiln to Enshrouded with the launcher. Play with mods, or without them."
status: "works"
updated: "2026-11-06"
---

> **Early access.** [Download the launcher](/kiln#download): Windows installer, Linux AppImage or .deb. Also on
> [GitHub](https://github.com/frostdev-ops/kiln/releases) and [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301).

## What you need

- Enshrouded from Steam.
- Windows 10 or 11, or Linux with glibc 2.35 or newer: Steam Deck (SteamOS), Ubuntu 22.04 and later, Fedora, Mint,
  Debian 12, Arch.
- The **Kiln Launcher**: AppImage or .deb on Linux, an installer on Windows. It includes the Kiln runtime.

## Install

1. Open the launcher. It finds Enshrouded in your Steam libraries by itself; if it doesn't, use **Add a folder**.
2. Press **Install** on the Play page and confirm.
3. Drop a mod's zip, folder or DLL anywhere on the launcher window. It goes into your active profile ("My mods" at
   first); **Undo** takes it out again.
4. Press **Play**.

<!-- shot: launcher-play | The launcher's Play page with its one-off starts -->

Steam's Play button also starts Kiln, with the profile you last activated.

Already have another tool's `dinput8.dll`? Kiln keeps it and loads it. For EMF's loader, see
[EMF and DLL mods](/kiln/wiki/other-mods).

## Steam Deck

On a Steam Deck the launcher opens in **Deck mode**: a controller-friendly screen (D-pad or stick to move, A to choose,
B to go back, L1/R1 for tabs). Download the AppImage in Desktop Mode, then add it to Steam as a non-Steam game
(right-click it, **Add to Steam**) to start it from Game Mode. **Add mods** lists the mods in your Downloads folder.
Valve's Proton needs the launch option below; Deck mode's **Help** shows the steps. Switch to the desktop screen in
**Settings**, or start the launcher with `--desktop`.

## Updates

The launcher from this site or GitHub updates itself (AppImage and Windows installs): **Update** shows in its header when
a new version is out. The launcher from Nexus Mods doesn't update itself (Nexus Mods doesn't allow it): get new versions
from its Nexus page.
After the restart, **Update game** puts the new Kiln runtime into the game. Nothing installs without a click. A .deb install
gets a download link instead.

The **Runtime** page also updates, rolls back and uninstalls Kiln. A dropped zip there is only for rollback or test builds.

## On Linux (Proton)

GE-Proton 11-11 needs no launch options. Older builds need this in Steam's launch options:

```
WINEDLLOVERRIDES="dinput8=n,b" %command%
```

The launcher shows what to change. It never edits Steam's settings.

## Play without mods

One-off starts on the Play page, for the next start only:

| Button | Loads |
|---|---|
| Play vanilla once | nothing, as if Kiln weren't installed. It warns first |
| Play without mods once | Kiln, no mods |
| Play a profile once | another profile, without switching to it |

The warning: a character carrying Kiln items can crash on a server that lets vanilla clients in, and may lose those items on other
servers. Use another character.

From Steam: `KILN_DISABLE=1 %command%`. Uninstalling on the Runtime page restores the files Kiln replaced, unchanged.

## Your saves

Kiln never writes your saves. The **Saves** page backs them up and restores them (never while the game runs). Its save
editor changes a save only when you use it.

## After a game update

On a build Kiln doesn't know yet, its hooks and C# mods stay off and the game runs as normal.
