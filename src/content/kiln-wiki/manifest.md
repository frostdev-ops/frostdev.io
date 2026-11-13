---
title: "The manifest"
description: "kiln.mod.json: id and version, where the mod runs, what players need, dependencies and load order."
status: "works"
updated: "2026-11-13"
---

Every mod folder has a `kiln.mod.json`. Kiln.Sdk writes it from your project file, or add your own. The build checks it
with the code that loads it, so a manifest that builds is one Kiln accepts.

```jsonc
{
  "id": "my-mod",                 // lower case, digits, . _ -
  "name": "My Mod",
  "version": "1.4.0",
  "apiVersion": "0.2",
  "side": "server",               // server | client | both
  "clients": "none",              // none | kiln | mod
  "dependencies": {
    "sample-lib": "^1.2",
    "extras": { "version": "*", "optional": true }
  },
  "loadAfter": ["some-mod"],
  "incompatible": { "rival": "<3" },
  "entryAssembly": "MyMod.dll",
  "writes": ["Fuel"],             // components written through the game's write tracking
  "tests": { "autoRun": true }
}
```

Comments and trailing commas are allowed.

## Where it runs: `side`

| `side` | Loads on |
|---|---|
| `server` (default) | dedicated servers, and the hosted world when a player hosts |
| `client` | the game client only |
| `both` | both |

## What players need: `clients`

| `clients` | A joining player needs | For |
|---|---|---|
| `none` | nothing | server rules, world edits, `"journal": "chat"` quests |
| `kiln` | Kiln: the server sends your definitions | new items from the game's own models |
| `mod` | your mod, from the server's modpack | quests, NPCs, talents, your own files (icons, models, sounds), client code |

Without the key, server mods mean `none`; client and both mods mean `mod`.

If you **state** `kiln` or `mod`, the server refuses players without Kiln, unless its `modSync` is `off`. The default
doesn't, since many `both` mods work for everyone. A Kiln player missing a stated `mod` mod is refused by default and told
which mods; `modSync` set to `warn` or `off` lets them in. Needs `side: both`. These rules pass on test servers, not yet in
the real game. See [Who can join](/kiln/wiki/multiplayer#who-can-join).

## Tracked writes: `writes`

Since 0.2.0-dev.27 a mod that changes components with `World.Write` and its kin lists their types in `writes`
([Tracked writes](/kiln/wiki/world-programs#tracked-writes-from-the-tick-thread)). Kiln.Sdk adds the types your code
writes. A `writes` list Kiln can't read still lets the mod load, with a warning; only its tracked writes are refused.

## Versions

`apiVersion` is the mod API you built against (0.2 today; 0.2.0-dev.27 ships mod API 0.2.2, additive over 0.2.1). Older APIs of the same major version load.

| Range | Means |
|---|---|
| `^1.2` or `1.2` | up to, not including, 2.0.0 (for 0.x, `^0.2` stops before 0.3) |
| `~1.2` | 1.2.x |
| `=1.2.3` | exactly that |
| `>=1.0 <2` | both conditions |
| `[1.0,2.0)` | Forge-style interval |
| `*` | any |

## Load order

Dependencies first, then `loadAfter` and `loadBefore`, then by id. A mod that can't load never stops the others, and
`kiln.log` says why:

```
mod x 1.0.0 not loaded: missing dependency y ^1.0
mod x 1.0.0 not loaded: dependency cycle: x -> y -> x
mod x 1.0.0 skipped: side 'client': not loaded on a server
```

A misspelt key only warns (`unknown key 'dependecies' (ignored)`). `kiln lint` catches it before you build.

## Mods of data only

Since dev.22, `entryAssembly` is optional. A folder with a `kiln.mod.json` and a `content/*.json` data pack is a mod with
nothing to run. It has its id, version, dependencies, side and a place in the load order, it shows in the mod list, and
its data packs apply.

```jsonc
// kiln/mods/pack-only/kiln.mod.json, with kiln/mods/pack-only/content/items.json beside it
{ "id": "pack-only", "version": "1.0.0", "apiVersion": "0.2", "side": "both", "clients": "kiln" }
```

```
[host] mod pack-only 1.0.0 loaded in 0.4 ms (data only: no entryAssembly)
```

A key that is there must still name a `.dll` file: an empty `entryAssembly` is refused. A code project still has to name
the assembly it builds (`KILN001`). Before dev.22 Kiln refused a manifest without it, and the folder's data packs were
skipped. Not yet tried in a real game.
