---
title: "Install Kiln"
description: "Install Kiln for Enshrouded, import downloaded mod archives, and play with or without mods."
status: "works"
updated: "2026-11-11"
---

> **Early access.** Download the launcher: [Windows installer](/kiln/download/windows), [Linux AppImage](/kiln/download/linux)
> or [.deb](/kiln/download/deb). The [download page](/kiln/download) has every other file, with sizes and SHA-256 checksums.
> Also on [GitHub](https://github.com/frostdev-ops/kiln/releases) and [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301).

## What you need

- Enshrouded from Steam.
- Windows 10 or 11, or Linux with glibc 2.35 or newer: Steam Deck (SteamOS), Ubuntu 22.04 and later, Fedora, Mint,
  Debian 12, Arch.
- The **Kiln Launcher** ([download](/kiln/download)): AppImage or .deb on Linux, an installer on Windows. It includes the Kiln runtime.

Any Windows user name and game folder name works, including Cyrillic, Chinese and accented letters. Before dev.22 such
a name crashed the quests part at boot, kept SET mods from loading and stopped build regions from saving. That fix was
tested under Wine with such paths, not on a Windows PC.

## Install

1. Open the launcher. It finds Enshrouded in your Steam libraries by itself; if it doesn't, use **Add a folder**.
2. Press **Install** on the Play page and confirm.
3. Drop a mod's archive (zip, 7z or rar), folder or DLL anywhere on the launcher window, or choose it with **Add mods**.
   It shows up in the list on Play, switched on; **Undo** takes it out again. A rar needs a tool that is already on your
   PC (unrar, 7-Zip, bsdtar or Windows' tar); without one the launcher says to extract it first.
4. Press **Play**.

<!-- shot: launcher-play | The launcher's Play page: every mod in one list, with Just once above it -->

Play is one list of every mod you added, for every loader, and the mods you put into the game folder by hand. Each row
has an on/off switch where Kiln can switch it, and a menu (the three dots, or a right click) with the mod's settings,
its versions, its folder and **Remove**. Removing is one click, unless you switch on **Type a mod's name to remove it**
in Settings. There is no profile to set up: Kiln keeps your mods in one profile, **My mods**, by itself. Saved sets of
mods are in Settings ([Profiles and mods](/kiln/wiki/profiles)).

Steam's Play button also starts Kiln, with the mods you switched on in the launcher.

Mods made for other frameworks (EML, ShroudForge, EMF, Enshwick, Greeneye and more) work too: drop them on the window
like Kiln mods. You don't need to install those frameworks. A mod id with capitals is fine, and so is a package shaped
like the game folder (a `mods` folder with a loader DLL beside it). Already have another tool's `dinput8.dll`, or
another framework installed? Kiln keeps it, and copies your profile's mods for that framework's own loader. See
[Mods for other frameworks](/kiln/wiki/other-mods) and [Adding mods in the launcher](/kiln/wiki/other-mods#adding-mods-in-the-launcher).

## Steam Deck

On a Steam Deck the launcher opens in **Deck mode**: a controller-friendly screen (D-pad or stick to move, A to choose,
B to go back, L1/R1 for tabs). Download the AppImage in Desktop Mode, then add it to Steam as a non-Steam game
(right-click it, **Add to Steam**) to start it from Game Mode. **Add mods** lists the mods in your Downloads folder: `.zip`, `.7z` and `.rar` files, DLLs and mod folders. A `.rar`
needs a tool on the Deck; without one, extract it first. **Mods** is the same list of every mod as on the desktop: A
switches a mod on or off, X removes it. Profiles are in Deck **Settings**, **Profile**.
If Kiln doesn't load with your Proton, set the launch option below; Deck mode's **Help** shows the steps and whether it's
set. Switch to the desktop screen in **Settings**, or start the launcher with `--desktop`.

## Updates

The launcher from this site or GitHub updates itself (AppImage and Windows installs): **Update** shows in its header when
a new version is out. The launcher from Nexus Mods doesn't update itself (Nexus Mods doesn't allow it): get new versions
from its Nexus page.
After the restart, **Update game** puts the new Kiln runtime into the game. Nothing installs without a click. A .deb install
gets a download link instead.

The **Runtime** page also updates, rolls back and uninstalls Kiln. A dropped zip there is only for rollback or test builds.
If you uninstall Kiln and install it again, the profile you used is loaded again, and a mod you drop goes into it.

## On Linux (Proton)

GE-Proton 11-11 and newer load Kiln with no launch options, and so do some recent Valve Proton builds (seen with Proton
Experimental 11.0-20261027b). Older builds need this in Steam's launch options:

```
WINEDLLOVERRIDES="dinput8=n,b" %command%
```

It does no harm where it isn't needed, so set it if you're unsure. The launcher shows what to change. It never edits
Steam's settings.

### A black launcher window

On some Linux machines (one report: NVIDIA, X11) the launcher's window stayed black. Since 0.2.0-dev.25 the launcher
notices when its page has not come up 15 seconds after the window opened, starts again without the GPU, and keeps doing
so at later starts; **Settings**, **Appearance**, **Draw the launcher without the GPU** turns it off again. To start that
way at once:

```
./Kiln*.AppImage --software-render
kiln-launcher --software-render
```

(the second for the .deb). Without the GPU the Play button has no fire. If the window is still black, start the launcher
from a terminal: its first line names its log (usually `~/.local/share/kiln/logs/launcher.log`). Send that file; its
`render:` lines say how the window was drawn.

On Fedora Atomic and Bazzite, `/home` is a link to `/var/home`. Since dev.21 ShroudForge and SET placement and modpack
installs accept that. Links inside Kiln's managed folders are still refused.

## "No Kiln": Kiln is not loading

If Steam starts the game without Kiln, the launcher says **No Kiln** (in amber) instead of waiting on "Starting", and
the Play page shows a **Kiln is not loading** banner. That works for every start except **Just once**, **Vanilla**,
which shows **Vanilla**. On a Steam Deck, Home shows a **Kiln is not loading** button that opens Help. (New in
0.2.0-dev.16; checked in the launcher's tests, not yet on a real Steam Deck.)

1. Close the game.
2. Set the launch option above in Enshrouded's Properties in Steam (the banner has it to copy), then start again from
   the launcher.
3. Still **No Kiln**, or the option is already set? Report it on [GitHub](https://github.com/frostdev-ops/kiln) or
   [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301) with these files: `kiln/logs/proxy.log` from the game
   folder (if it's missing, Steam never loaded Kiln), `kiln/logs/kiln.log`, and `~/.local/share/kiln/logs/launcher.log`.
   Add your Proton version, and whether you were in Game Mode or Desktop Mode.

## Mods from Nexus Mods

The official **0.2.0-dev.25** launcher ships with Nexus integration disabled, as every one since dev.20 did. There is no **Catalog**,
**Nexus Mods** account/settings page or Mod Manager Download (`nxm://`) handler in this build, on desktop or Deck.

It cleans up what dev.19 left behind:

- If dev.19 took over `nxm://` links, the launcher gives them back to the handler you had before (Vortex, for example).
  A stray link is forwarded to it, or you get a message on how to reset the handler. If a launcher already runs, that
  message opens a second window.
- A personal Nexus API key stored by dev.19 is deleted when the launcher starts, without being shown.

1. Open [Nexus Mods](https://www.nexusmods.com/enshrouded/mods) in your browser and use **Manual Download** on the mod's file page.
2. Drop the downloaded archive (zip, 7z or rar) on the launcher, or choose it with **Add mods**. Check its requirements
   and include the matching dependencies. A rar needs a tool already on your PC; without one, extract it and import the
   mod folder. A password-protected or split archive has to be extracted first too.
3. To update a mod, download the new archive and add it the same way. Check the result line before playing. A mod's
   menu on Play has **Use &lt;version&gt;** for the other versions you have.

[Kiln's Nexus page](https://www.nexusmods.com/enshrouded/mods/301) remains available for downloads and reports.
Downloading the launcher from Nexus and having Nexus integration inside the launcher are separate things.

A future Nexus-enabled build will use browser authorization with OAuth 2.0 + PKCE. The registration request has been sent;
approval, public client ID, scopes, redirect configuration and real-provider sign-in/refresh/sign-out/download proof remain
pending. Personal API keys are not a fallback. The older key flow belongs to dev.19 and earlier, not this build.

**Mod authors:** publish an archive with `kiln.mod.json` at its root or in one folder, as `kiln pack` makes it. Keep its
version and the Nexus file version aligned, list Kiln and other requirements on the download page, and keep `dependencies`
in the manifest for Kiln's check. Players of this build download and import that archive by hand.

## Play without mods

**Just once** on the Play page, for the next start only:

| Button | Loads |
|---|---|
| Vanilla | nothing, as if Kiln weren't installed. It warns first |
| Without mods | Kiln, no mods |

To play with another set of mods, load that profile in Settings, Profiles. Since dev.24 there is no "play a profile once".

The warning: a character carrying Kiln items can crash on a server that lets vanilla clients in, and may lose those items on other
servers. Use another character.

From Steam: `KILN_DISABLE=1 %command%`. Uninstalling on the Runtime page restores the files Kiln replaced, unchanged.

## Your saves

Kiln never writes your saves. The **Saves** page backs them up and restores them (never while the game runs). Its save
editor changes a save only when you use it.

## Steam and the game

- **Play works when Steam is closed** (Linux AppImage, since dev.24). The launcher used to start Steam with settings
  meant only for the AppImage; every game start from that Steam then ended within seconds, with no window and nothing in
  Kiln's logs, until Steam was restarted.
- **A game without a window still counts as running.** If the game's window thread ends while the rest of the process
  goes on (it still hosts and saves the world), the launcher took the game for stopped before dev.24. Stop it in Steam
  before you start it again.
- **After you quit on Linux**, Steam can show the game as running for about a minute. Steam's own networking library
  crashes while the game shuts down, and the system then writes a crash dump of several gigabytes. No Kiln or mod code is
  on either side of that crash; whether it also happens without Kiln is not known yet.

## After a game update

On a build Kiln doesn't know yet, its hooks and C# mods stay off and the game runs as normal. EML data mods, which need
no hooks, still apply.
