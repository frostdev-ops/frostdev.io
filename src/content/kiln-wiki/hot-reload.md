---
title: "Hot reload"
description: "Reload a mod in a running server in about a second: what it keeps, what it drops, and how to check it unloads cleanly."
status: "works"
updated: "2026-11-05"
---

```sh
kiln deploy --reload       # or: dotnet build -t:KilnDeploy -p:KilnReload=true
```

The server unloads the mod and its dependents, loads the new files, and loads everything again in order, in about a second. A mod
not loaded yet gets loaded.

## The control folder

A running server takes commands as files: write `kiln/control/<name>.cmd`, read `kiln/control/<name>.result.json`.

```sh
echo "reload my-mod" > kiln/control/r.cmd
cat kiln/control/r.result.json
```

| Command | Does |
|---|---|
| `mods` | every mod's state, errors, dependencies and cost per step |
| `load <folder>` | load `kiln/mods/<folder>` |
| `unload <id>` | unload it and its dependents |
| `reload <id>` | reload it from disk |
| `reload-test <id> <n>` | reload n times, then check nothing kept the old copies alive |
| `test <id>` | run its tests |
| `gc` | collect unloaded mods; how many are still alive |

The admin **Mods** page has the same buttons.

## What a reload keeps

| Kept | Gone |
|---|---|
| saved data (`WorldData`, `PlayerData`, `CharacterData`, `EntityData`) | static fields and the old mod instance |
| config files | threads and timers you started, unless you stop them |
| | changes to content, game data and creatures: your new code puts them back |

## Unload cleanly

Kiln removes what you registered through it. These keep the old copy in memory:

- threads, timers, sockets and open files: stop or close them in `OnUnload`;
- your objects held outside your mod, such as a static event on a .NET type.

[The analyzers](/kiln/wiki/lint) flag many of these. Run `reload-test my-mod 10` to catch the rest.
