---
title: "The dev kit"
description: "Kiln.Sdk, project templates, the kiln command, a linter, analyzers, a VS Code extension, a debugger and game-id constants."
status: "works"
updated: "2026-11-09"
---

| Part | For |
|---|---|
| **Kiln.Sdk** | the MSBuild SDK for mod projects |
| **Templates** | a working project for each kind of mod |
| [**The `kiln` command**](/kiln/wiki/cli) | new, build, cook, deploy, run, reload, test, debug, lint, pack, logs, catalog |
| [**Lint and analyzers**](/kiln/wiki/lint) | checks on your JSON and your C# |
| [**VS Code extension**](/kiln/wiki/vscode) | schemas, lint, game ids, tests, logs, a debugger, Impact assembly |
| [**Catalogs**](/kiln/wiki/catalogs) | the game's ids from your own install |
| [**Testing**](/kiln/wiki/testing) | tests that run inside the server |
| [**Debugging**](/kiln/wiki/debugging) | breakpoints in a running server, logs, crash reports |

Use the SDK/MDK download matching your Kiln runtime, or build it from source. The folder holding its `.nupkg` files
is the local package "feed"; pass it to `kiln new` with `--feed <folder>` or set `$KILN_FEED`.

## Kiln.Sdk

Use the full version from your MDK pack (`0.2.0-dev.20` for this release); local packs have their own version.

```xml
<Project Sdk="Kiln.Sdk/0.2.0-dev.20">
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
| `KilnServices` | the services you use, and `Testing` |
| `KilnServer` | your test server's folder |
| `KilnTestsAutoRun` | run tests at server start and after reloads |
| `KilnModFolders` | data folders to ship; default `content;assets;skills;quests;blocks;icons;impact;audio;vfx;models` |
| `KilnAnalyzers`, `KilnGameIds` | [analyzers](/kiln/wiki/lint), [game-id constants](/kiln/wiki/catalogs) |

Items: `KilnDependency`, `KilnLoadBefore`, `KilnLoadAfter`, `KilnIncompatible`.

The `kiln` command drives the targets, which also work alone: `dotnet build -t:KilnDeploy`, `-p:KilnReload=true`, `-t:KilnPack`.

## Templates

`kiln new <template> <Name>`, or `dotnet new kiln-<template>`. The dev.20 CLI lists 23 templates with `kiln new --list`.

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

Run `kiln cook` before the first build of `model`, `sound` and `ability` with Impact. `kiln build` does it when a recipe is out of
date.

`dotnet new` makes new GUIDs each time. Recreate a project under the same name and a world that saw the first keeps its items as
placeholders. Use a fresh world or another name.

If you rebuild Kiln's packages without changing their version, clear `~/.nuget/packages/kiln.*` first.
