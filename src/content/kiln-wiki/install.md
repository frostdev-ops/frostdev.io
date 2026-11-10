---
title: "Install Kiln"
description: "Install Kiln for Enshrouded, import downloaded mod archives, and play with or without mods."
status: "works"
updated: "2026-11-10"
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

Mods made for other frameworks (EML, ShroudForge, EMF, Enshwick, Greeneye and more) work too: drop them on the window
like Kiln mods. You don't need to install those frameworks. Already have another tool's `dinput8.dll`, or another
framework installed? Kiln keeps it. See [Mods for other frameworks](/kiln/wiki/other-mods).

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

On Fedora Atomic and Bazzite, `/home` is a link to `/var/home`. Since dev.21 ShroudForge and SET placement and modpack
installs accept that. Links inside Kiln's managed folders are still refused.

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

The official **0.2.0-dev.21** launcher ships with Nexus integration disabled, as dev.20 did. There is no **Catalog**,
**Nexus Mods** account/settings page or Mod Manager Download (`nxm://`) handler in this build, on desktop or Deck.

It cleans up what dev.19 left behind:

- If dev.19 took over `nxm://` links, the launcher gives them back to the handler you had before (Vortex, for example).
  A stray link is forwarded to it, or you get a message on how to reset the handler. If a launcher already runs, that
  message opens a second window.
- A personal Nexus API key stored by dev.19 is deleted when the launcher starts, without being shown.

1. Open [Nexus Mods](https://www.nexusmods.com/enshrouded/mods) in your browser and use **Manual Download** on the mod's file page.
2. Drop the downloaded zip on the launcher, or choose it with **Add mods**. Check its requirements and include the
   matching dependencies. For a 7z or RAR archive, unpack it first and import the mod folder.
3. To update a mod, download the new archive and import it into the same profile. Check the Library's result before playing.

[Kiln's Nexus page](https://www.nexusmods.com/enshrouded/mods/301) remains available for downloads and reports.
Downloading the launcher from Nexus and having Nexus integration inside the launcher are separate things.

A future Nexus-enabled build will use browser authorization with OAuth 2.0 + PKCE. The registration request has been sent;
approval, public client ID, scopes, redirect configuration and real-provider sign-in/refresh/sign-out/download proof remain
pending. Personal API keys are not a fallback. The older key flow belongs to dev.19 and earlier, not this build.

**Mod authors:** publish an archive with `kiln.mod.json` at its root or in one folder, as `kiln pack` makes it. Keep its
version and the Nexus file version aligned, list Kiln and other requirements on the download page, and keep `dependencies`
in the manifest for Kiln's check. Players of this build download and import that archive by hand.

## Play without mods

One-off starts on the Play page, for the next start only:

| Button | Loads |
|---|---|
| Play vanilla once | nothing, as if Kiln weren't installed. It warns first |
| Play without mods once | Kiln, no mods |
| Play a profile once | another profile, without switching to it, with its compat rules |

The warning: a character carrying Kiln items can crash on a server that lets vanilla clients in, and may lose those items on other
servers. Use another character.

From Steam: `KILN_DISABLE=1 %command%`. Uninstalling on the Runtime page restores the files Kiln replaced, unchanged.

## Your saves

Kiln never writes your saves. The **Saves** page backs them up and restores them (never while the game runs). Its save
editor changes a save only when you use it.

## After a game update

On a build Kiln doesn't know yet, its hooks and C# mods stay off and the game runs as normal. EML data mods, which need
no hooks, still apply.
