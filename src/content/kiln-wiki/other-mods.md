---
title: "Mods for other frameworks"
nav: "Other frameworks"
description: "Kiln runs mods made for EML, ShroudForge, EMF, SET, Greeneye, Creative Mode, Shroudtopia, Enshwick and shroudlink, unchanged, next to Kiln mods."
status: "partial"
updated: "2026-11-07"
---

Kiln is a universal loader. It runs mods made for the other Enshrouded mod frameworks as they are. You don't need to
install those frameworks: Kiln comes with a part for each one. If you already use one, it keeps working.

New in 0.2.0-dev.18. Most of this has run on test servers. Where no player has seen it in the game yet, the table says
**untested in game**.

## Every framework

| Framework | Its mods | What Kiln does | Status | What you do |
|---|---|---|---|---|
| **EML** (Enshrouded Mod Loader) 0.2.0 | data mods: stats, stacks, recipes, new items | runs EML's own code before the game starts. Installed by default | untested in game (works on test servers) | drop the mod in, or import it in the launcher. [EML and ShroudForge](/kiln/wiki/eml-shroudforge) |
| **ShroudForge** | Lua mods, with settings | ships ShroudForge's runtime and runs it. Installed by default. Your own ShroudForge can be used instead | untested in game (works on test servers) | drop the mod in, or import it. [EML and ShroudForge](/kiln/wiki/eml-shroudforge) |
| **EMF** 0.3.3 to 0.5.1 | DLL and Lua mods, server tools, commands | gives EMF mods EMF's API on Kiln. Installed by default | partial: most of the API, some gaps | drop the mod in, or import it, then switch it on. [EMF mods](/kiln/wiki/emf-mods) |
| **SET** (Shrouded Engine Tweaks) 0.1.1 | Lua mods with windows and tweaks | runs SET's Lua API on Kiln, also on dedicated servers | partial: some functions and windows missing | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#set) |
| **Greeneye Loader** 1.2.2 | client mods: The Worst Map Mod, Find, Quick Deposit, Town Portals | gives them Greeneye's whole API. Works on Linux too | untested in game | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#greeneye-loader) |
| **Flame** | Creative Mode | starts Creative Mode without its loader | untested in game | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#creative-mode-flame) |
| **Shroudtopia** 0.1.1 and 1.0 | minimaps, first-person view, older tweaks | gives them Shroudtopia's whole API | untested in game. Shroudweave's mods: untried | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#shroudtopia) |
| **Enshwick** 1.0.0-alpha.13 | DLL, Luau and data-pack mods | runs Enshwick's own loader. Kiln ships it, so you don't need Enshwick | untested in game (works on test servers) | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#enshwick) |
| **shroudlink** 0.8.0 | server mods: chestsort, assistants, storage, meter, gemforge | runs shroudlink's own server part | works on a test server; with players: untested | put the mods on the server, or import them. [More frameworks](/kiln/wiki/more-frameworks#shroudlink) |
| **Ember** (server SDK) | private-chests | finds and lists the mods; doesn't run them | not yet: Ember hasn't published its loader | nothing to do yet. [More frameworks](/kiln/wiki/more-frameworks#ember) |
| Stand-alone `dinput8.dll` mods | one DLL each | loads them next to Kiln | works | install Kiln; it keeps them. [Below](#stand-alone-dinput8-mods) |
| Kiln DLL mods | DLLs with a `native.json` | loads them at the time you choose | works | add them to a profile. [Below](#kiln-dll-mods) |

The launcher's Library imports mods of every framework above. Drop a mod's zip, folder or DLL on the launcher window:
it says which framework the mod is for and puts it in your profile, on its **Engines** tab, with a switch, versions and
settings where the mod has them. Something Kiln can't run
is skipped with the reason. It is never added as a plain DLL.

## Your other loader is installed too

You don't have to remove anything.

- **Kiln steps aside.** When another framework's own loader runs in the game, Kiln's part for that framework does
  nothing, and that loader runs its mods. A mod never runs twice. `kiln/logs/kiln.log` says `steps aside`.
- **Kiln fills in.** When the other loader's files are there but it didn't start, for example on Linux or a Steam Deck
  where Proton doesn't load it, Kiln runs its mods instead.
- **Kiln never breaks it.** Kiln only takes the name `dinput8.dll`. Another tool's `dinput8.dll` is moved into Kiln's
  folder and loaded from there. Files under other names (EML's `dbghelp.dll`, Shroudtopia's `winmm.dll`, Enshwick's
  `powrprof.dll`) stay where they are. Uninstalling Kiln puts every file back as it was.
- **ShroudForge** asks first: the launcher takes over its `dinput8.dll` only after you agree. Its folder, settings and
  mods stay.

To let a framework's own loader run its mods instead of Kiln, keep that loader installed. To hand them back to Kiln,
remove that loader (or switch its line off in `kiln/chain.ini` if Kiln chained it).

## Where the mods go

Inside the game folder (or the server folder). These are the folders the frameworks use themselves, so a mod's own
install steps still work.

| Framework | Folder |
|---|---|
| EML | `mods/<mod>/` (also `kiln/eml/mods/<mod>/`) |
| ShroudForge | `mods/<mod>/`, or the folder set in ShroudForge's settings |
| EMF | `emf/mods/<mod>/` or `emf/mods/<name>.dll` |
| SET | `shrouded_engine_tweaks/mods/<mod>/` |
| Greeneye Loader | `greeneye/<mod>/` |
| Creative Mode (Flame) | `mods/creative/` |
| Shroudtopia | `mods/<mod>.dll` or `mods/<mod>/` |
| Enshwick | `mods/<author.name>/` |
| shroudlink | `shroudlink_mods/<name>.dll` (server) |
| Ember | `ember/mods/<mod>/` (server) |
| Kiln DLL mods | `kiln/native/<folder>/` |

Several frameworks share `mods/`. Kiln tells their mods apart by their files, and each part only takes its own.

With the launcher you don't need these folders: import the mod and switch it on in your profile. While your profile
lists mods for a framework, Kiln loads that list for it. Mods you put in that framework's folder by hand count only
when the profile has drop-ins on. Enshwick is the exception: its loader runs every folder in `mods/`.

## Servers and players

| Framework | Where it runs | Players need |
|---|---|---|
| EML | server and game | the same data mods as the server, or items can go missing |
| ShroudForge | server and game, as each mod says | the same mods, when a mod is for both sides |
| EMF | server and game. Mods marked `client` only in the game | client mods only for themselves |
| SET | a world you host, and dedicated servers | nothing for server mods. Windows and keys work only in the game |
| Greeneye Loader | the game (a mod can say `server`) | the mod, for themselves |
| Creative Mode | the game | the mod, for themselves |
| Shroudtopia | mostly the game; some mods on servers | the mod, for themselves |
| Enshwick | server and game | the same version of each mod that has a join check, or Enshwick refuses the join |
| shroudlink | dedicated server | nothing. shroudlink's optional client addon adds its MODS tab |
| Ember | dedicated server | nothing |

A server needs Kiln's part for each framework it runs. The [server pack](/kiln/wiki/dedicated-servers#the-server-pack)
has them. The launcher's server **Mods** page copies other frameworks' mods into the folders their parts read.

**Modpacks** carry the other frameworks' mods that players need too, for example EML data mods. Kiln's join check
doesn't compare them yet: a Kiln player who lacks a server's EML mod isn't refused. Tell your players, or put those
mods in your [modpack](/kiln/wiki/modpacks).

## Honest limits

- **Untested in game.** Most framework parts are new in 0.2.0-dev.18. They ran on test servers and in Kiln's own tests,
  not yet in a player's game. Please report what you see.
- **EMF.** No radial wheels yet. Mod programs and events run in the server's world only. Stamina and mana can't be read
  or changed. Mod windows have no right click. Mods that need an EMF API newer than 0.5.1 are refused. Details:
  [EMF mods](/kiln/wiki/emf-mods#what-doesnt-work-yet).
- **SET.** SET itself only runs in worlds you host. On Kiln its mods run on dedicated servers too, but SET's game
  options, a few admin functions and most of its overlay windows aren't there yet. If another tool's `powrprof.dll` is
  loaded (Enshwick's own, Shared XP), Kiln's SET part stays off.
- **Ember** mods are found and listed, but don't run until Ember publishes its loader.
- **Greeneye Loader** doesn't start under Wine or Proton. Kiln runs its mods there instead. That ran in tests on Linux,
  not yet in a real game.
- **Creative Mode** changes the same things as Kiln's own creative mode (building cost, flight, time of day). Use one or
  the other.
- **Shroudweave** mods use Shroudtopia's format as far as we know, but none has been tried.
- **One writer for game data.** EML and ShroudForge both change game files before the game starts. Only one does it
  per start: when ShroudForge runs, it applies your EML mods from its own mods folder. See
  [EML and ShroudForge](/kiln/wiki/eml-shroudforge#eml-and-shroudforge-together).
- **Two mods on the same thing.** Kiln doesn't stop two frameworks' mods that change the same game system (both change
  loot, both change building cost). Both apply.
- Every native mod, of any framework, runs its own code in the game. Install mods only from sources you trust.

## Stand-alone dinput8 mods

Many small mods are a single `dinput8.dll` (stat sliders, sprint toggles, HUD tweaks, shroudlink's client addon). Only
one file can have that name. When you install Kiln, it moves the other `dinput8.dll` to `kiln/chain/` and loads it
from there, listed in `kiln/chain.ini`. Kiln also reads the `dinput8-chain.ini` that EMF and other chain loaders write.
A mod with its own name (`iphlpapi.dll`, `powrprof.dll`, `dxgi.dll`) is left alone and runs next to Kiln.

## Kiln DLL mods

One or more DLLs, with a small `native.json` naming them and when they load:

| When | Use |
|---|---|
| `dllmain` | before any game code (listed by the launcher) |
| `early` | first thing when Kiln starts (default) |
| `boot` | after Kiln's own services |
| `world` | when the first world starts |

Add them to a profile (the **Native** tab), or drop them into `kiln/native/<folder>/`. One that crashes while loading is
marked failed with a crash report, and the game carries on. DLL mods never unload, so changes need a restart.

Mods you add from the launcher's [Nexus Mods catalog](/kiln/wiki/install#mods-from-nexus-mods) are imported the same
way, whatever framework they're for. Its **All Enshrouded** list marks EMF and DLL mods.

## Logs

Each framework part writes its own lines to `kiln/logs/kiln.log` (`[eml]`, `[emf:<mod>]`, `[greeneye]`, ...) and a
status file per framework in `kiln/state/`. The launcher's **Logs** page (**Engines**) shows one line per framework,
with each mod's state and the reason when it didn't load.
