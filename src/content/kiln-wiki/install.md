---
title: "Install Kiln"
description: "Install Kiln for Enshrouded, import downloaded mod archives, play with or without mods, play a copy of the game Steam doesn't know, Kiln's Discord in the launcher, and antivirus help."
status: "works"
updated: "2026-11-19"
---

> **Early access.** Download the launcher: [Windows installer](/kiln/download/windows), [Linux AppImage](/kiln/download/linux)
> or [.deb](/kiln/download/deb). The [download page](/kiln/download) has every other file, with sizes and SHA-256 checksums.
> Also on [GitHub](https://github.com/frostdev-ops/kiln/releases) and [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301).

## What you need

- Enshrouded from Steam, or a copy of its folder ([Custom game folders](#custom-game-folders)).
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
4. Press **Play**. The launcher shows what the start is doing until the game's main menu
   ([When you press Play](#when-you-press-play)).

<!-- shot: launcher-play | The launcher's Play page: every mod in one list, with Just once above it -->

Play is one list of every mod you added, for every loader, and the mods you put into the game folder by hand. Each row
has an on/off switch where Kiln can switch it, and a menu (the three dots, or a right click) with the mod's settings,
its versions, its folder and **Remove**. Removing is one click, unless you switch on **Type a mod's name to remove it**
in Settings. There is no profile to set up: Kiln keeps your mods in one profile, **My mods**, by itself. Saved sets of
mods are in Settings ([Profiles and mods](/kiln/wiki/profiles)).

Steam's Play button also starts Kiln, with the mods you switched on in the launcher.

**Language and look** (0.2.0-dev.29.16). The launcher's **Settings**, **Language** picks the launcher's language
(System by default) and Kiln's language in the game (the game's by default): English, and since 0.2.0-dev.29.18
Simplified Chinese ([Kiln in your language](/kiln/wiki/languages)). **Settings** also has Kiln's in-game look
([Kiln in the game](/kiln/wiki/in-game)) and, since 0.2.0-dev.29.18, a **Graphics** card for Kiln's frame cap, DLSS
settings, readout and the upscaler behind the game's FSR 3 ([Graphics](/kiln/wiki/in-game#graphics)).

**The launcher's icon** (0.2.0-dev.29.16). The Linux AppImage adds its own app-menu entry and icons in your home folder,
so taskbars and docks (GNOME, Hyprland and others) show Kiln's icon; **Settings**, **Appearance**, **Kiln Launcher in
the app menu** removes them. On a Steam Deck that entry also puts Kiln in Steam's "Add a Non-Steam Game" list. On
Windows the launcher and its pinned shortcut share one taskbar button. Not yet checked on a real desktop.

Mods made for other frameworks (EML, ShroudForge, EMF, Enshwick, Greeneye and more) work too: drop them on the window
like Kiln mods. You don't need to install those frameworks. A mod id with capitals is fine, and so is a package shaped
like the game folder (a `mods` folder with a loader DLL beside it). Already have another tool's `dinput8.dll`, or
another framework installed? Kiln keeps it, and copies your profile's mods for that framework's own loader. See
[Mods for other frameworks](/kiln/wiki/other-mods) and [Adding mods in the launcher](/kiln/wiki/other-mods#adding-mods-in-the-launcher).

**Don't copy another loader's `dinput8.dll` into the game folder** once Kiln is installed: that file is Kiln's own, and
copying over it (Ultimate ASI Loader, for example) replaces Kiln. Add the loader's download to the launcher like any
mod instead; since 0.2.0-dev.29.4 Kiln places Ultimate ASI Loader as `xinput9_1_0.dll`
([Mods that run from the game folder](/kiln/wiki/other-mods#mods-that-run-from-the-game-folder)).

### Custom game folders

New in 0.2.0-dev.29.17. The launcher can play a copy of Enshrouded that no Steam library knows: an older build you keep
for mods, a copy on another drive, a backup of the game folder. Add it on Play (**Add** under the game folder) or in
**Settings**, **Games**. Such a folder starts directly: Kiln runs its `enshrouded.exe` itself (on Linux under umu-run,
Proton or Wine, which you can pick), with the same profile, save backup, start progress, crash reports and support
report as Steam's copy.

- It needs no Steam: not installed, not running. Kiln never sets `SteamAppId`, never writes `steam_appid.txt` and never
  touches `steam_api64.dll`. Whether a given copy of the game needs Steam to run is that copy's business.
- Steam's own copy still starts through Steam by default. The choice is per game: **Starts directly** or **Starts
  through Steam**, on the game folder's line on Play.
- On Linux Kiln makes one Wine prefix per game, at the first start, in `~/.local/share/kiln-prefixes/`; the saves of that
  copy live in it. The first start takes longer. Steam Deck Game Mode is not covered.
- A game build Kiln doesn't know starts with Kiln idle: no mods load, and Play says so.

Not yet checked in a real game.

## When you press Play

A progress bar shows the step that runs: cooking a mod, Steam, each of Kiln's own steps, loading the mods and their
content, until the game's main menu. It is in the window, in the top bar and on the Steam Deck. **Running** shows once
the main menu is there.

From the second start with the same mods, it says how long is left, learned from your own earlier starts on this PC.
The first start says it is timing itself instead of guessing, and a step that takes much longer than usual says so.
The times are kept in the launcher's data folder (`state/start-times.json`); deleting that file only resets the
estimates. A game that still has an older Kiln shows what it showed before.

## Mods the launcher cooks

Some mods make their models, animations or sounds from your own game's files (a cook recipe, `assets/cook.json`). The
launcher cooks them when you press its **Play**: it says **Cooking** with the mod's name, shows the cook tool's lines,
and starts the game after. You don't need Kiln's source.

- **Cook again** in a mod's menu repeats it (Y on the mod in the Steam Deck's
  **Mods** screen).
- **Cancel** stops a cook, and a cook that hangs is stopped. A mod that could not be cooked runs on the files it has.
- **Python.** On Windows the launcher brings its own (python.org's embeddable Python, in the launcher's folder):
  nothing is installed and a Python you have is not touched. On Linux it uses the system's `python3`, 3.10 or newer;
  when something is missing, the message says what to install.
- A mod that is being cooked is not replaced or removed while you change its version or switch it off: the launcher
  asks you to wait.
- The launcher doesn't cook mods you put into the game folder by hand, nor the mods of a server it runs. Use
  `kiln cook` for those ([cooking on a server](/kiln/wiki/dedicated-servers#mods-with-a-cook-recipe)).

Cooking on Windows was compile-checked for this release, not yet run on a Windows PC.

### Game data for OnBoot mods

Since 0.2.0-dev.28 some mods put their content in before the game reads its data ([OnBoot](/kiln/wiki/onboot)), and
some of those read the game's own data while they do. For them, **Play** copies that data from your game's files once
after the cook: "Game data for OnBoot mods (about 300 MB, once per game build)". It takes half a minute to a minute and
about 300 MB in the game folder, once per game update (about 200 MB before 0.2.0-dev.29.17, which made it again once). Without such a mod nothing runs. If the step fails, the game starts
anyway and the launcher says so in one line.

Starting from Steam doesn't make it; one start through the launcher with the mod on does. Since 0.2.0-dev.29 boot mods
load in your game too (a world you host, and a server you join), with no setting: if you added `"preview"` to
`kiln/kiln.json` for dev.28, it is no longer needed, and leaving it does no harm
([Where it runs](/kiln/wiki/onboot#where-it-runs)).

## Steam Deck

On a Steam Deck the launcher opens in **Deck mode**: a controller-friendly screen (D-pad or stick to move, A to choose,
B to go back, L1/R1 for tabs, L2 to select mods and R2 to act on the selection). Download the AppImage in Desktop Mode, then add it to Steam as a non-Steam game
(right-click it, **Add to Steam**) to start it from Game Mode. **Add mods** lists the mods in your Downloads folder: `.zip`, `.7z` and `.rar` files, DLLs and mod folders. A `.rar`
needs a tool on the Deck; without one, extract it first. **Mods** is the same list of every mod as on the desktop: A
switches a mod on or off, X removes it, Y cooks it again when it has a cook recipe. **Editor** is the save editor,
used with the controller alone, with a number pad for amounts and levels ("Open a save file…" is desktop only for now).
Profiles are in Deck **Settings**, **Profile**.
If Kiln doesn't load with your Proton, set the launch option below; Deck mode's **Help** shows the steps and whether it's
set. Switch to the desktop screen in **Settings**, or start the launcher with `--desktop`.
Since 0.2.0-dev.29.18 Deck **Settings** also has **Language**, the upscaler behind the game's FSR 3 with its files
([Graphics](/kiln/wiki/in-game#graphics)) and **Show the Community page**, and a **Community** tab sits between
**Editor** and **Help** ([Kiln's Discord in the launcher](#kilns-discord-in-the-launcher)).

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

**No "One Steam setting" banner where it isn't needed** (0.2.0-dev.29.18, by bisdat, GitHub #77, pull request #78). The
launcher now reads which Proton Steam uses for Enshrouded (the game's own choice, or Steam's default for all games).
With GE-Proton 11-11 or newer, Play and the Deck's Help no longer ask for the launch option. Older and unknown Proton
builds keep the advice, and if a start really runs without Kiln (**No Kiln**), the launch option is offered again as
the fix, whatever the Proton.

**With Ultimate ASI Loader chained** next to Kiln, Wine also needs `xinput9_1_0` set to native, builtin:
`WINEDLLOVERRIDES="dinput8,xinput9_1_0=n,b" %command%`. Since 0.2.0-dev.29 the launcher's launch option names it and says
when only that part is missing; before, it showed "Already set" while Proton loaded its own `xinput9_1_0` and the
loader's `.asi` plugins never started. When Wine loads its own copy of a DLL Kiln chains, `kiln/logs/proxy.log` now says
so and names the override to set. Since 0.2.0-dev.29.4 the same goes for Ultimate ASI Loader added in the launcher.
A plugin loader Kiln places in the game folder (a `powrprof.dll` with its `plugins` folder) needs an override for its
name too (`powrprof=n,b`); the launcher's notes name it.

**Without Kiln's launcher** (Bottles, Lutris or plain Wine), set `dinput8` to native, builtin
(`WINEDLLOVERRIDES="dinput8=n,b"`, or in the runner's DLL overrides), and `xinput9_1_0` too with Ultimate ASI Loader.
Without it the game starts without Kiln, and `kiln/logs/proxy.log` isn't written.

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

Since 0.2.0-dev.29.18:

- **The launcher says when its window can't start**, instead of leaving it empty. When its page has not come up 15
  seconds after the window opened and it has nothing left to try by itself, a message from your system (not the
  launcher's page) says what it tried and where `launcher.log` is, and offers what you can still try: "Start without
  the GPU", "Start without WebKit's sandbox" (when WebKit runs it), "Open the log folder", "Quit". The cause of an empty
  window is often not known, so each button is a try.
- **WebKit's sandbox, your choice.** In a normal start WebKit doesn't use its sandbox for the launcher, so this changes
  nothing for most players. Where it would use it and it can't start (WebKit would then end the launcher at once), a
  message before the window offers "Turn the sandbox off and start" (where the launcher can), "Start anyway" or
  "Quit", and names the proper fix. The launcher never turns the sandbox off by itself. **Settings**, **Appearance**,
  **WebKit's sandbox** turns it off or back on for the next start; `--no-webkit-sandbox` or `--webkit-sandbox` do it for
  one start.
- **"Draw the launcher without the GPU" works at the start again.** Since 0.2.0-dev.29 the launcher didn't read that
  setting when it started, so one that had fallen back to drawing without the GPU drew with it again each time. If the
  setting is on for you (you turned it on, or the launcher did after a black window), the launcher now draws without the
  GPU at every start. Turn it off in **Settings**, **Appearance** to draw with the GPU again.

Not yet seen on a system that needs these messages.

On Fedora Atomic and Bazzite, `/home` is a link to `/var/home`. Since dev.21 ShroudForge and SET placement and modpack
installs accept that. Links inside Kiln's managed folders are still refused.

**A game folder that is a link or junction** (a moved Steam library often is) works again since 0.2.0-dev.29.12. The
launcher had refused the profile with "symlinks are not allowed", and the Engines view showed ShroudForge with "invalid
game path". The game folder, Kiln's data folder and a Library entry may be links themselves; a link inside them
(`mods`, `kiln` and so on) is still refused.

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

## Kiln's Discord in the launcher

New in 0.2.0-dev.29.18, all of it optional. A **Community** page (after Servers) and, on the Steam Deck, a **Community**
tab (between Editor and Help) bring the [Kiln Discord](https://discord.gg/7pjr8SMTfU) into the launcher.

- **Send to Kiln support** writes the support post for you from a [support report](/kiln/wiki/debugging#save-a-support-report).
  You write one line (on the Deck you pick what went wrong and when), the launcher shows exactly what will be posted and
  which files go, and the post appears in #support on the Kiln Discord. Your logs go to the Kiln team only, unless you
  choose to attach them to the post or not to send them. It is also on the Logs page, next to Play's problem banners
  (after the fix they already suggest) and on a notice when the game closed while Kiln wrote a crash report. When a
  report matches a known problem, its fix shows first, and you can still send.
- **Your support posts and their replies** show on the page, with a number in the header for new replies. Each post has
  Open in Discord, It's fixed and Delete my post. A system notification for replies is a switch, off until you turn it
  on.
- **Signing in.** Sending needs a Discord sign-in through frostdev.io: your browser on the desktop, a QR code for your
  phone on the Deck. The launcher keeps only a Kiln key for it, never your Discord password or a Discord token.
- **Rich Presence** shows "Playing Kiln, Enshrouded with Kiln, 12 mods on" and the time on your Discord profile while
  you play, through the Discord app on your PC. It is off until you turn it on and never shows server, world, character
  or mod names.
- **Testers.** Players with hardware the team lacks can volunteer. The launcher first shows the hardware it would share,
  and a test build's checklist shows on the page once the build has one.

Nothing is sent until you press a button on a screen that shows what goes. Opening the page loads only Kiln's news and
the list of known problems. **Settings**, **Launcher**, **Show the Community page** hides the page, the tab and every
"Send to Kiln support", and the launcher then does nothing with Discord. What is sent and kept is on the page ("What is
sent and kept") and at [frostdev.io/kiln/privacy](/kiln/privacy). Not yet used with the live service on the Kiln
Discord.

## Antivirus (Windows)

Kiln works by putting DLL files into the game folder. Kiln's `dinput8.dll` has the name of a Windows file, and Kiln
loads its other DLLs into the game and changes the game's code while it runs. Some malware works the same way, and
Kiln's files are new and not code signed yet, so some antivirus programs flag them and remove them or move them to
quarantine. Kiln, or a part of it, then doesn't load.

Since 0.2.0-dev.29.18 the launcher says so:

- **A Kiln file is missing.** The **Runtime** page says which ("1 of Kiln's files is missing:
  kiln\plugins\kiln-greeneye.dll") and offers **Repair**, which installs the same Kiln version again and puts the
  missing files back. When the file is a DLL, it says an antivirus may have removed it. A file that is there but changed
  keeps the "Changed" banner, as before.
- **An install was blocked.** When Windows didn't let Kiln write one of its files during an install, update or Repair,
  the launcher showed only "Access is denied. (os error 5)", and the install was undone. The Runtime page, Play and the
  launcher's message now say "Windows did not let Kiln write kiln\plugins\kiln-greeneye.dll. An antivirus or another
  program may be blocking it.", with what to do. A file the game holds is not blamed on an antivirus: Kiln asks you to
  quit the game. The support report says it too, also after the launcher was closed.

What to do:

1. **Add an exclusion for the game folder** first, or the antivirus removes the file again. In Windows Security: Virus &
   threat protection, Manage settings, Exclusions, Add or remove exclusions, Add an exclusion, Folder, and pick the game
   folder (in Steam: right click Enshrouded, Manage, Browse local files). Other antivirus programs call it Exclusions,
   Exceptions or Allowed list. If it also removes files from your mods, add the launcher's data folder too.
2. **Get the file back**: restore it from the quarantine (Windows Security: Protection history, the Kiln file's entry,
   Actions, Restore), or close the game and choose **Repair** on the Runtime page.
3. If the antivirus also took the launcher, or its uninstaller, restore those too or install the launcher again.

You can also report the file to your antivirus's maker as a false positive. The receipt, `kiln\.install.json` in the
game folder, lists every file Kiln installed with its SHA-256 checksum. Not yet run on a Windows PC.

## Mods from Nexus Mods

The official launcher ships with Nexus integration disabled, as every one since dev.20 did. There is no **Catalog**,
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

Since 0.2.0-dev.29.4 **Vanilla** and **Without mods** refuse to start while a loader Kiln placed in the game folder is
still there (Ultimate ASI Loader, a `powrprof.dll` plugin loader): the game would load it anyway. Switch that mod off and
press Play once first.

The warning: a character carrying Kiln items can crash on a server that lets vanilla clients in, and may lose those items on other
servers. Use another character.

From Steam: `KILN_DISABLE=1 %command%`. Uninstalling on the Runtime page restores the files Kiln replaced, unchanged.
Then remove the launcher. On Linux, delete the AppImage (or remove the .deb package); to leave nothing of Kiln behind,
also delete `~/.local/share/kiln`, `~/.config/kiln`, `~/.local/state/kiln` and `~/.local/share/io.frostdev.kiln.launcher`.

## Your saves

Kiln never writes your saves. The **Saves** page backs them up and restores them (never while the game runs); its list
says which backups are the game's and which are Kiln's. The **Editor** page changes a save only when you use it:

- Your changes stay when you leave the page. The editor asks before it drops them, for another character and for
  **Discard**. (Closing the desktop window with unsaved changes doesn't ask yet.)
- If the game wrote the save after the editor read it, the editor doesn't overwrite it: it offers **Read again**. When
  you changed nothing, it reads the save again by itself after you played.
- An item that stacks takes any amount up to 65,535, which is what the save holds, with a note when that is above the
  game's stack size (a mod can raise stack sizes).
- A save with items from a mod that is gone opens read-only.

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
