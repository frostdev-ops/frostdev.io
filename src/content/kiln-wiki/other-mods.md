---
title: "Mods for other frameworks"
nav: "Other frameworks"
description: "Kiln runs mods made for EML, ShroudForge, EMF, SET, Greeneye, Creative Mode, Shroudtopia, Enshwick and shroudlink, unchanged, next to Kiln mods."
status: "partial"
updated: "2026-11-10"
---

Kiln loads mods made for other Enshrouded mod frameworks without rewriting them. It supplies the runtimes listed
below, with limits for each adapter. Server startup checks do not guarantee every mod or loader combination.

Introduced in dev.18 and expanded in dev.20, dev.21 and dev.22. dev.22 is about mods that did not load: how the launcher
takes them in, lists them and hands them to another loader. Most of this has run on test servers. Where no player has
seen it in the game yet, the table says **untested in game**.

## Every framework

| Framework | Its mods | What Kiln does | Status | What you do |
|---|---|---|---|---|
| **EML** (Enshrouded Mod Loader) 0.2.0 | data mods: stats, stacks, recipes, new items | runs EML's own code before the game starts. Installed by default | untested in game (works on test servers) | drop the mod in, or import it in the launcher. [EML and ShroudForge](/kiln/wiki/eml-shroudforge) |
| **ShroudForge** | Lua mods, with settings | ships ShroudForge's runtime and runs it. Installed by default. Your own ShroudForge can be used instead | untested in game (works on test servers) | drop the mod in, or import it. [EML and ShroudForge](/kiln/wiki/eml-shroudforge) |
| **EMF** 0.3.3 through 0.6.0 / API v27 | DLL and Lua mods, server tools, commands | gives EMF mods EMF's API on Kiln. Installed by default | 77 full / 13 partial C slots; client checks remain | drop the mod in, or import it, then switch it on. [EMF mods](/kiln/wiki/emf-mods) |
| **SET** (Shrouded Engine Tweaks) 0.1.1 | Lua mods with windows and tweaks | runs SET's Lua API on Kiln, also on dedicated servers | server probe 39/0; API and client limits remain | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#set) |
| **Greeneye Loader** 1.2.2 | client mods: The Worst Map Mod, Find, Quick Deposit, Town Portals | gives them Greeneye's whole API. Works on Linux too | untested in game | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#greeneye-loader) |
| **Flame** | Creative Mode | starts Creative Mode without its loader | untested in game | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#creative-mode-flame) |
| **Shroudtopia** 0.1.1 and 1.0 | minimaps, first-person view, older tweaks | gives them Shroudtopia's whole API | untested in game. Shroudweave's mods: untried | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#shroudtopia) |
| **Enshwick** 1.0.0-alpha.13 | DLL, Luau and data-pack mods | runs Enshwick's own loader. Kiln ships it, so you don't need Enshwick | untested in game (works on test servers) | drop the mod in, or import it. [More frameworks](/kiln/wiki/more-frameworks#enshwick) |
| **shroudlink** 0.8.0 | server mods: chestsort, assistants, storage, meter, gemforge | runs shroudlink's own server part. Its client addon (the in-game MODS tab) imports as a mod of its own | works on a test server; with players: untested | put the mods on the server, or import them. [More frameworks](/kiln/wiki/more-frameworks#shroudlink) |
| **Ember** (server SDK) | private-chests | finds and lists the mods; doesn't run them | not yet: Ember hasn't published its loader | nothing to do yet. [More frameworks](/kiln/wiki/more-frameworks#ember) |
| Stand-alone `dinput8.dll` mods | one DLL each | loads them next to Kiln | works | install Kiln; it keeps them. [Below](#stand-alone-dinput8-mods) |
| Closed-source DLL mods (XHL-Core, Auto Loot Plus, trainers) | one or more DLLs | loads them next to Kiln, early or after Kiln | late loading: untested in game | switch on **Load after Kiln and ShroudForge** if they clash. [Below](#closed-source-dll-mods) |
| Kiln DLL mods | DLLs with a `native.json` | loads them at the time you choose | works | add them to a profile. [Below](#kiln-dll-mods) |

## Adding mods in the launcher

The launcher's Library imports mods of every framework above. Drop a mod on the launcher window, or choose it with
**Add mods**. The launcher says which framework the mod is for and puts it in your profile, on its **Engines** tab, with
a switch, versions and settings where the mod has them. Something Kiln can't run is skipped with the reason. It is never
added as a plain DLL. Since dev.22 mods are taken the way they are shared:

- **Archives.** `.zip`, `.7z` and `.rar`. The launcher reads 7z itself. A rar needs a tool that is already on your PC:
  `unrar`, 7-Zip, `bsdtar`, or the `tar` that comes with Windows. Without one, the launcher says to extract the archive
  first and drop the folder. A password-protected or split archive is refused the same way. A modpack must be a zip.
- **Packages shaped like the game folder.** Many authors zip a mod as it sits in the game folder: a `mods` folder, with a
  loader DLL such as `dbghelp.dll` next to it. The launcher imports every mod in that `mods` folder. The loader in the
  package is not installed, and that is one note in the result ("not needed, Kiln runs EML mods"), not an error. A tool
  that runs on its own next to Kiln (ReShade, a mod menu) is left out whole, with what to do: copy its files into the
  Enshrouded folder yourself.
- **Ids with capitals or spaces.** An EML mod called `HoardersHelper` used to be refused as "not a valid mod id". Now the
  mod's files stay as they are, and the Library lists it under an id made from its own: `hoardershelper`, with the
  mod's own id shown next to it. ShroudForge packages with upper-case ids import the same way. Kiln's own mod kinds,
  EMF mods and Enshwick mods still need a lower-case id.
- **A `dinput8.dll` mod keeps its files.** A DLL beside the `.ini`, data or picture files it reads (or `powrprof.dll` with a
  folder) is imported as one mod with all its files, and loaded from that folder, so it finds them next to its DLL. A mod
  that looks for its files in the game folder instead is not served by this: the launcher can't place files there yet.

More on the Library: [Profiles and mods](/kiln/wiki/profiles#the-library). Mods you extracted into the game folder by hand
are listed on the profile's [In the game folder](/kiln/wiki/profiles#in-the-game-folder) list.

## Your other loader is installed too

Check the guide for your framework before combining loaders; use one startup owner for each framework.

- **Kiln steps aside.** When another framework's own loader runs in the game, Kiln's part for that framework does
  nothing, and that loader runs its mods. `kiln/logs/kiln.log` says `steps aside`. A native loader arriving after a mod
  has already started can still conflict; detection cannot undo arbitrary native hooks or threads.
- **Kiln fills in.** When the other loader's files are there but it didn't start, for example on Linux or a Steam Deck
  where Proton doesn't load it, Kiln runs its mods instead. Since dev.22 Kiln checks that the file really is the loaded
  code. Before, under Proton without a DLL override, it could step aside for a loader file that never ran, and nothing
  ran the mods.
- **The launcher copies your profile's mods for that loader.** Another framework's own loader (EML's `dbghelp.dll`, for
  example) reads only its own folder (`mods/` for EML) and never Kiln's Library. A mod you added to your profile did
  not run at all while that loader was installed. Since dev.22, while such a loader is installed, the launcher copies
  the profile's mods of that framework into the folder it reads, and takes its copies out again when the loader is gone.
  A mod never runs twice. A mod you put in that folder yourself is never touched, and when it is the same mod, yours
  runs. A copy a mod changed (settings written into its folder) is left as it is.
- **Activate the profile again after you install such a loader.** The copies are made when the profile is activated.
  Install the loader later and nothing is copied until you activate the profile again. The same goes the other way:
  remove the loader, activate the profile again, and the copies go.
- **Where it can't help.** shroudlink's and Ember's own loaders can't read Kiln's layout. With one of them running, the
  profile's mods of that framework don't load, and kiln.log, the state file and the launcher's engine row say so.
- **One start with another profile.** **Play a profile once** is refused for a framework whose own loader is installed
  when that profile's mods of the framework differ from the active profile's: the loader's folder is fixed for a start.
  The message says to activate the profile. **Play without mods once** can't stop such a loader: it runs what is in its
  folder, Kiln's copies included.
- **Kiln preserves loader files.** Kiln only takes the name `dinput8.dll`. Another tool's `dinput8.dll` is moved into Kiln's
  folder and loaded from there. Files under other names (EML's `dbghelp.dll`, Shroudtopia's `winmm.dll`, Enshwick's
  `powrprof.dll`) stay where they are. Uninstalling Kiln puts every file back as it was.
- **ShroudForge** asks first: the launcher takes over its `dinput8.dll` only after you agree. Its folder, settings and
  mods stay.

To let a framework's own loader run its mods instead of Kiln, keep that loader installed. To hand them back to Kiln,
remove that loader (or switch its line off in `kiln/chain.ini` if Kiln chained it), then activate the profile again.

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

With the launcher you don't need these folders: import the mod and switch it on in your profile. Kiln loads the
profile's list for each framework. A mod you put in a framework's folder by hand is read when that framework's
**drop-in switch** is on in the profile's settings. That is the one rule for every framework, and the profile's
**In the game folder** list shows each hand-placed mod and whether it loads. [Drop-in folders](/kiln/wiki/profiles#drop-in-folders)
has the switches. Two loaders read their whole folder themselves once they run: ShroudForge, when the profile has an
enabled ShroudForge mod, and Enshwick, when it has an Enshwick mod. SET has no switch: its folder always loads.

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
| shroudlink | dedicated server | nothing. shroudlink's optional client addon adds its MODS tab: drop it on the launcher |
| Ember | dedicated server | nothing |

A server needs Kiln's part for each framework it runs. The [server pack](/kiln/wiki/dedicated-servers#the-server-pack)
has them. The launcher's server **Mods** page copies other frameworks' mods into the folders their parts read.

**Modpacks** carry the other frameworks' mods that players need too, for example EML data mods. Kiln's join check
doesn't compare them yet: a Kiln player who lacks a server's EML mod isn't refused. Tell your players, or put those
mods in your [modpack](/kiln/wiki/modpacks).

## Honest limits

- **Untested in game.** Most framework parts are new in 0.2.0-dev.18. They ran on test servers and in Kiln's own tests,
  not yet in a player's game. Please report what you see.
- **dev.22 was not run on Windows, on a Steam Deck or in a real client.** The copies for another framework's own loader,
  the drop-in switches, the game-folder list, packages shaped like the game folder and 7z and rar were tested with unit
  tests, Wine host tests with stand-in loader DLLs, and dedicated-server labs under Wine. One lab run used a real
  ShroudForge loader build. [What works today](/kiln/wiki/status#new-in-020-dev22) has the checklist.
- **Copies are made at activation.** Install another framework's own loader after you activated the profile, and its
  copies are not there until you activate the profile again.
- **A loader that was already running.** Enshwick's own loader may see a mod copied while it was running only from the
  next start.
- **EMF.** API v27 implements radial wheels, stamina/mana and right-click window events. Client-world programs/events
  remain unsupported, and player-facing rendering/input and joined delivery remain unchecked. Mods requesting above
  API v27 are refused. [Current differences](/kiln/wiki/emf-mods#what-doesnt-work-yet).
- **SET.** SET itself only runs in worlds you host. Kiln's dedicated-server probe passes 39/0; game options, `Admin.send`,
  ImGui Debug and SET's `settings.ini` editor remain unavailable. Kiln's tool windows still need client drawing/input
  checks. If another tool's `powrprof.dll` is loaded (Enshwick's own, Shared XP), Kiln's SET part stays off.
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
- **Two mods on the same game function.** Since dev.21 Kiln, EMF mods, Shroudtopia mods and a hosted ShroudForge share
  one hook per game function, in a fixed order ([Hooks and patches](/kiln/wiki/hooks)). A closed-source DLL hooks on
  its own; see [below](#closed-source-dll-mods).
- Every native mod, of any framework, runs its own code in the game. Install mods only from sources you trust.

## Stand-alone dinput8 mods

Many small mods are a single `dinput8.dll` (stat sliders, sprint toggles, HUD tweaks, shroudlink's client addon). Only
one file can have that name. When you install Kiln, it moves the other `dinput8.dll` to `kiln/chain/` and loads it
from there, listed in `kiln/chain.ini`. Kiln also reads the `dinput8-chain.ini` that EMF and other chain loaders write.
A mod with its own name (`iphlpapi.dll`, `powrprof.dll`, `dxgi.dll`) is left alone and runs next to Kiln.

A `dinput8.dll` mod you drop on the launcher is kept with the files around it and added as a native mod, loaded from its
own folder ([Adding mods in the launcher](#adding-mods-in-the-launcher)).

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

The official dev.22 launcher has no Nexus Catalog, account sign-in or Mod Manager Download handler.
[Download the archive in your browser and import it](/kiln/wiki/install#mods-from-nexus-mods), whatever framework it uses.

## Closed-source DLL mods

Mods that ship only as a DLL (XHL-Core, Auto Loot Plus, trainers, overlays) hook game functions when they load, before
Kiln has hooked anything. Kiln then hooks over them and usually works. Some clash: a feature of Kiln, ShroudForge or an
EMF mod stops working, or ShroudForge's own engine hooks refuse to start. New in 0.2.0-dev.21, three things help.

**Load it after Kiln.** On the profile's **Native** tab, each chain entry has a **Load after Kiln and ShroudForge**
switch. Switch it on and restart the game. Kiln then loads that DLL after its own services, plugins and ShroudForge:
Kiln hooks first and the DLL hooks over Kiln. kiln.log says it loaded late. Without the launcher, name the DLL in
`kiln/chain.ini` under `[late]`, and keep its line in its own list:

```ini
[chain]
chain\xhl-core-dinput8.dll
[late]
chain\xhl-core-dinput8.dll
```

A late DLL that fails to load is a warning in kiln.log, and the game goes on. An older proxy ignores `[late]` and loads
those DLLs early.

**Overlaps.** The same page shows last session's hook overlaps: functions where another DLL and Kiln, ShroudForge or an
EMF mod both hook. **Load late** next to an overlap switches that DLL to late in one click. kiln.log warns once per
overlap, names both sides and the fix. The list is in `kiln/state/hooks.json` under `overlaps`. Before the first start
with dev.21 the page says "No hook map yet".

**Compat rules.** The page lists the compat rules that apply to this profile. A rule can `warn`, load a chain DLL
`late`, or `disable` a chain DLL or a mod the profile lists. Kiln ships its own rules (`kiln/compat-rules.json`); yours go
in the profile's config folder as `compat-rules.json`, and a rule of yours with the same `id` replaces Kiln's:

```json
{ "format": 1, "rules": [
  { "id": "xhl-and-shroudforge",
    "when": [ { "module": "xhl-*.dll" }, { "engine": "shroudforge" } ],
    "action": "late", "subject": { "module": "xhl-*.dll" },
    "message": "XHL hooks the same functions as ShroudForge. It loads after Kiln so both work." } ] }
```

The launcher applies `late` and `disable` of chain entries when it writes `chain.ini`, so activate the profile (or press
**Play**) after you change a rule. Kiln itself logs `warn` rules and skips a disabled mod the profile lists. A rule it
can't apply is reported in kiln.log as not applied.

What loading late can't do:

- **EMF's own loader** always loads first. The launcher shows it as "Always loads first", without a switch.
- **A DLL another loader already started** (with EMF's loader chained, it starts the DLLs in `dinput8-chain.ini`) is
  reported as `already-loaded`. Use a compat rule, or switch one side off.
- **A disabled native mod's** late DLL doesn't load. An early or boot native mod can't require a late one.
- **`disable` on a native mod** whose DLL already loaded at `dllmain` is reported as not applied. Re-activate the
  profile in the launcher to apply it.

Status: the switch, overlaps and rules were tested under Wine and on lab servers, and the launcher pages with tests and
mock data. Nobody has tried them with XHL-Core in a real game yet.

## Logs

Each framework part writes its own lines to `kiln/logs/kiln.log` (`[eml]`, `[emf:<mod>]`, `[greeneye]`, ...) and a
status file per framework in `kiln/state/`. The launcher's **Logs** page (**Engines**) shows one line per framework,
with each mod's state and the reason when it didn't load.
