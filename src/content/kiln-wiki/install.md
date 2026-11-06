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
- Linux or Windows (Windows tested under Wine so far).
- The **Kiln Launcher**: AppImage or .deb on Linux, an installer on Windows. It includes the Kiln runtime.

## Install

1. Open the launcher.
2. Press **Detect**, or **Add folder** if it doesn't find the game.
3. Press **Install Kiln** and confirm.
4. Press **Play**.

<!-- shot: launcher-play | The launcher's Play page with its one-off starts -->

Steam's Play button also starts Kiln, with the profile you last activated.

Already have another tool's `dinput8.dll`? Kiln keeps it and loads it. For EMF's loader, see
[EMF and DLL mods](/kiln/wiki/other-mods).

## Updates

The launcher updates itself (AppImage and Windows installs): **Update** shows in its header when a new version is out.
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
