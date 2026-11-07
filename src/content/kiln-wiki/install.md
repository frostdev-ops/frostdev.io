---
title: "Install Kiln"
description: "Add Kiln to Enshrouded with the launcher, get mods from Nexus Mods, and play with them or without."
status: "works"
updated: "2026-11-07"
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
If Kiln doesn't load with your Proton, set the launch option below; Deck mode's **Help** shows the steps and whether it's
set. Switch to the desktop screen in **Settings**, or start the launcher with `--desktop`.

## Updates

The launcher from this site or GitHub updates itself (AppImage and Windows installs): **Update** shows in its header when
a new version is out. The launcher from Nexus Mods doesn't update itself (Nexus Mods doesn't allow it): get new versions
from its Nexus page.
After the restart, **Update game** puts the new Kiln runtime into the game. Nothing installs without a click. A .deb install
gets a download link instead.

The **Runtime** page also updates, rolls back and uninstalls Kiln. A dropped zip there is only for rollback or test builds.

## On Linux (Proton)

GE-Proton 11-11 and newer load Kiln with no launch options, and so do some recent Valve Proton builds (seen with Proton
Experimental 11.0-20261027b). Older builds need this in Steam's launch options:

```
WINEDLLOVERRIDES="dinput8=n,b" %command%
```

It does no harm where it isn't needed, so set it if you're unsure. The launcher shows what to change. It never edits
Steam's settings.

## "No Kiln": Kiln is not loading

If Steam starts the game without Kiln, the launcher says **No Kiln** (in amber) instead of waiting on "Starting", and
the Play page shows a **Kiln is not loading** banner. That works for every start except **Play vanilla once**, which
shows **Vanilla**. On a Steam Deck, Home shows a **Kiln is not loading** button that opens Help. (New in
0.2.0-dev.16; checked in the launcher's tests, not yet on a real Steam Deck.)

1. Close the game.
2. Set the launch option above in Enshrouded's Properties in Steam (the banner has it to copy), then start again from
   the launcher.
3. Still **No Kiln**, or the option is already set? Report it on [GitHub](https://github.com/frostdev-ops/kiln) or
   [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301) with these files: `kiln/logs/proxy.log` from the game
   folder (if it's missing, Steam never loaded Kiln), `kiln/logs/kiln.log`, and `~/.local/share/kiln/logs/launcher.log`.
   Add your Proton version, and whether you were in Game Mode or Desktop Mode.

## Mods from Nexus Mods

> **New in 0.2.0-dev.16.** The mod list has been read from the real Nexus Mods, without an account. Adding and updating
> mods was tested against a stand-in for Nexus, not yet with a real account.

The **Catalog** (desktop: in the top bar; Deck mode: the Catalog tab) lists Enshrouded's mods on Nexus Mods.

1. In **Settings > Nexus Mods**, paste your personal API key (on nexusmods.com: Settings, API Keys) and press **Save**.
   The launcher checks it with Nexus first, keeps it in your system keyring (or, without one, in its own folder,
   readable only by you), and never shows it again.
2. Open the **Catalog**. **Kiln mods** shows mods made for Kiln. **All Enshrouded** shows every mod, and marks the EMF,
   native and DLL mods Kiln can load too. **Installed** shows what you added from here. Search by name or author, and
   sort.
3. Pick a mod for its pictures, description, author, version, requirements and files.
   - **Premium accounts:** **Add** downloads it, checks it against Nexus's file list and puts it in your active profile.
     The toast has **Undo**, and **Get** for each mod it needs that you don't have.
   - **Free accounts:** Nexus wants free downloads to go through its website. **Download on Nexus Mods** opens the
     file's page, where you press **Mod Manager Download**. With the next step turned on, the mod comes straight back
     into the launcher.
4. **Mod Manager Download links** are off until you turn them on in **Settings > Nexus Mods**. Then Enshrouded links
   open in Kiln, and links for other games still go to the manager you had before (Vortex, Mod Organizer 2). Turning it
   off gives every link back to that manager.
5. **Updates:** when a mod you added has a newer file, its card says **Update** and a banner lists it. Nothing updates
   by itself.

Without a key the Catalog still lists every Enshrouded mod, but can't tell which are Kiln mods or download them. The
launcher from Nexus Mods has the Catalog too: it downloads only the mods you pick, never itself. Only zip files are
taken; for a 7z or RAR, download it by hand and unpack it.

**Mod authors:** your mod shows as a Kiln mod when a file on its Nexus page is a zip with `kiln.mod.json` at its root or
in one folder, as `kiln pack` makes it. Put it in your main file, keep the Nexus version and the one in `kiln.mod.json`
the same, and upload new versions into the same file so players see them as updates. Set requirements on the file (add
Kiln's page, mod 301, too), keep `dependencies` in `kiln.mod.json` for Kiln's own check, and leave Mod Manager Download
on: free players add your mod through it.

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
