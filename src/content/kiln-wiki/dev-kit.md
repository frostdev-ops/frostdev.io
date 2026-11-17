---
title: "The dev kit"
description: "Kiln.Sdk, project templates, the kiln command, a linter, analyzers, a VS Code extension, a debugger and game-id constants."
status: "works"
updated: "2026-11-17"
---

| Part | For |
|---|---|
| **Kiln.Sdk** | the MSBuild SDK for mod projects |
| **Templates** | a working project for each kind of mod |
| [**The `kiln` command**](/kiln/wiki/cli) | new, build, cook, deploy, run, reload, test, debug, lint, pack, logs, catalog |
| [**Lint and analyzers**](/kiln/wiki/lint) | checks on your JSON and your C# |
| [**VS Code extension**](/kiln/wiki/vscode) | schemas, lint, game ids, tests, logs, a debugger, Impact assembly |
| [**Catalogs**](/kiln/wiki/catalogs) | the game's ids from your own install |
| [**Testing**](/kiln/wiki/testing) | tests that run inside the server, and unit tests with no game |
| [**Debugging**](/kiln/wiki/debugging) | breakpoints in a running server, logs, crash reports |

Use the SDK/MDK download matching your Kiln runtime (the SDK packages, the `kiln` command and the VS Code extension are under
[Mod authors](/kiln/download#authors) on the download page), or build it from source. The folder holding its `.nupkg` files
is the local package "feed"; pass it to `kiln new` with `--feed <folder>` or set `$KILN_FEED`.

## Kiln.Sdk

Use the full version from your MDK pack (`0.2.0-dev.29.16` for this release, mod API 0.2.8); local packs have their own
version.

```xml
<Project Sdk="Kiln.Sdk/0.2.0-dev.29.16">
  <PropertyGroup>
    <KilnModId>my-mod</KilnModId>
    <Version>1.0.0</Version>
    <KilnServices>Players;Chat</KilnServices>
  </PropertyGroup>
  <ItemGroup>
    <KilnDependency Include="sample-lib" Version="^1.2" />
  </ItemGroup>
</Project>
```

It targets .NET 10 and references Kiln's API and your services without copying them. NuGet dependencies are copied next to your
mod. Without a `kiln.mod.json`, the build writes one from the properties; with one, it checks it.

| Property | Sets |
|---|---|
| `KilnModId`, `KilnModName`, `Version`, `Description`, `Authors` | identity |
| `KilnSide`, `KilnClients` | where it runs, what players need |
| `KilnServices` | the services you use, and `Testing`. Since 0.2.0-dev.29.15 `Stations` gives [Stations and Bases](/kiln/wiki/stations) alone, without `Blocks`' side and clients defaults, so players without Kiln can still join |
| `KilnServer` | your test server's folder |
| `KilnTestsAutoRun` | run tests at server start and after reloads |
| `KilnModFolders` | data folders to ship; default `content;assets;skills;quests;blocks;icons;impact;audio;vfx;models` |
| `KilnAnalyzers`, `KilnGameIds` | [analyzers](/kiln/wiki/lint), [game-id constants](/kiln/wiki/catalogs) |
| `KilnBake` | bake what the code defines into the mod at build ([below](#definitions-baked-at-build)); on by default with `Quests`, `Skills`, `Blocks` or `Vfx` |
| `KilnBoot` | `true` or `required`: the mod has [boot content](/kiln/wiki/onboot), and `"boot"` goes into its `kiln.mod.json` |
| `KilnUpdatesRepository` | the GitHub repository players' [update checks](/kiln/wiki/manifest#update-checks-updates) look at |

Items: `KilnDependency`, `KilnLoadBefore`, `KilnLoadAfter`, `KilnIncompatible`.

### Definitions baked at build

The game reads its quest journal, skill tree, VFX and materials once, when it starts, before a mod's code runs. Since
0.2.0-dev.27 the build runs your mod once without the game and writes the quests (with their NPCs and dialogues),
`GameTree.Define` nodes, VFX and materials your code defines into the mod. They are then there at the first start, on
the server and in every player's game; before, the first start after an install didn't have them. `KilnBake=false`
turns it off.

- Statuses, effects, items, spells and talent blocks aren't baked yet (the build prints "not baked" for them), so most
  [blocks](/kiln/wiki/blocks) mods still get those from the second start, unless a boot mod stages them in
  [OnBoot](/kiln/wiki/onboot) (0.2.0-dev.28, dedicated servers).
- When a baked file and the code differ, the baked file wins at every start until you build again; kiln.log warns.
- **A boot mod** (0.2.0-dev.28): its `OnBoot` runs first in the bake, as a start runs it. When it throws, or a
  definition it stages would not lower, the build fails (`KILN032`). What `OnBoot` stages isn't baked: it is in the game
  from the first start anyway.
- A build bakes again when a file the mod copies to its output changed. A baked file over 4 MiB isn't written: the build
  warns, and those definitions come from the next start, as without baking.

The `kiln` command drives the targets, which also work alone: `dotnet build -t:KilnDeploy`, `-p:KilnReload=true`, `-t:KilnPack`.

## Templates

`kiln new <template> <Name>`, or `dotnet new kiln-<template>`. `kiln new --list` lists every template of your MDK.

| Template | Gives you | Side, clients |
|---|---|---|
| `mod` | a code mod; `tests=true` adds tests | server, none |
| `datapack` | `content/*.json` edits | server, none |
| `items` | new items and recipes, with icons | both, mod |
| `creature` | a creature clone with level, scale and spawning | both, kiln |
| `ability` | an ability; `impact=true` adds a program | both, none |
| `ui` | a game UI overlay | client, mod |
| `model` | a glTF model and its recipe | both, mod |
| `body` | a creature with its own skinned body, animations, AI and attack | both, mod |
| `sound` | sounds, cues and their recipe | both, mod |
| `talents` | a talent tree | both, mod |
| `native` | a C++ mod | both |
| `test` | a separate test mod; `target=<mod>` depends on it | server, none |
| `service` | a native + managed service, inside Kiln's source | |

**New in 0.2.0-dev.20:** block-first templates `item-blocks`, `world-blocks`, `creature-blocks`, `npc`, `cosmetic`,
`building-material`, `ability-blocks`, `quest`; UI blocks with `kiln new ui MyUi --set blocks=true`. They supply typed blocks
and/or `blocks/*.json`, so keep the form you need. The `items` and `creature` templates remain available for clone-based
changes no block expresses. Confirm options with `kiln new --list` from the installed MDK; older dev.19 installations lack these
additions. [Building blocks](/kiln/wiki/blocks)

**New in 0.2.0-dev.27**, one topic each: `events` (subscribing, a cancelable event of your own), `saved-data` (world and
player data), `rules` (Kiln.Rules, NoClip through Kiln's switch), `network` (a channel between server and client side),
`screen-effect` (screen effects as blocks), and for the advanced tier `hooks` (a detour on a game function), `shader` (a particle effect with its own shader hooks)
and `world-program` (a [program of your own](/kiln/wiki/world-programs) in the game's scheduler). `unit-test` makes a
project for [tests with no game](/kiln/wiki/testing#tests-without-the-game).

**New in 0.2.0-dev.29:** `system-wrap` (your code around one of the game's own programs, a typed wrap that makes wells
refill faster: [Wrapping the game's programs](/kiln/wiki/world-programs#wrapping-the-games-programs)) and
`client-program` (a program in the player's own client world:
[In the player's client world](/kiln/wiki/world-programs#in-the-players-client-world)).

Run `kiln cook` before the first build of `model`, `sound` and `ability` with Impact. `kiln build` does it when a recipe is out of
date.

`dotnet new` makes new GUIDs each time. Recreate a project under the same name and a world that saw the first keeps its items as
placeholders. Use a fresh world or another name.

## Samples

The SDK download has sample mods, each for one topic. New in 0.2.0-dev.27, each holding to
[the contract](/kiln/wiki/code-mods#when-a-call-cannot-work) (the capability asked first, a refusal read and passed on):
`SavedData` (world, player and entity data), `AdminTools` (strikes, kick, ban, NoClip for an admin), `CalmBell` (an
interaction offer and a game setting changed for a while), `QuietServer` (pacing an empty server), `Loadouts`
(`Items.Equip` and `Items.Unequip`), `SkyControl` (the weather), `AffixSword` ([affixes](/kiln/wiki/affixes)),
`ItemData` (data on one item), and for the advanced tier `EngineRoom` (the game's systems listed, profiled and hooked).
Kiln's sample mods answer "not on this server" when a feature is off on a game build, instead of failing.

New in 0.2.0-dev.28: `boot-gallery` ([OnBoot](/kiln/wiki/onboot), with a resource patch), `OreVein`
([terrain overlays](/kiln/wiki/world-edits#terrain-overlays)), `TransformScale`, `CreatureControlSample`
([creature control](/kiln/wiki/creature-ai#creature-control)), `ValueBars` ([values in the game's UI](/kiln/wiki/game-ui#values-in-the-games-own-ui)),
`BlockKinds` ([block kinds](/kiln/wiki/blocks#block-kinds-of-your-own)) and `BlobCatalog` ([content blobs](/kiln/wiki/assets#every-content-blob)).
`NpcSample` now has a brain that walks a path found with `Queries.FindPath`.

New in 0.2.0-dev.29: `Decisions` ([refusing a death, a pickup or an equip](/kiln/wiki/events#refusing-a-death-a-pickup-or-an-equip)),
`WaterWorks` ([a typed program wrap](/kiln/wiki/world-programs#wrapping-the-games-programs): wells refill faster),
`FrostMark` (a sword whose added hit runs a [same-step native](/kiln/wiki/impact#natives-that-answer-in-the-same-step)),
`TypedHookVolume` ([a typed hook](/kiln/wiki/hooks#typed-hooks-and-calls) on an item's volume), `MaterialPools`
([building-material pools](/kiln/wiki/blocks#building-material-pools)), `equipment-sets`
([equipment sets](/kiln/wiki/inventory#equipment-sets)) and `Budgets` (the buff room and the program budget read
before defining).

New in 0.2.0-dev.29.11 ([Gems](/kiln/wiki/gems)): `GemSample` (the Gem of Deep Cuts, a Gem of Bleeding copy with its
own icon and texts, from a data pack alone, and an opt-in tweak of the game's Gem of Bleeding) and `GemEffects`
(`Gems.Register` with C# effects: the Gem of Frostbite slows on a critical hit, the Gem of Renewal heals on a kill).

If you rebuild Kiln's packages without changing their version, clear `~/.nuget/packages/kiln.*` first.
