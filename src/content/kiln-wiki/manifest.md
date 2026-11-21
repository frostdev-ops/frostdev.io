---
title: "The manifest"
description: "kiln.mod.json: id and version, where the mod runs, what players need, boot content, update checks, dependencies and load order."
status: "works"
updated: "2026-11-17"
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
  "boot": true,                   // true | "required": Mod.OnBoot runs before the game starts
  "updates": { "provider": "github", "repository": "me/my-mod" },   // where new versions are published
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

## Boot content: `boot`

Since 0.2.0-dev.28 `"boot": true` makes Kiln run the mod's `Mod.OnBoot` once before the game starts; what it stages is
in the game from the first start ([OnBoot](/kiln/wiki/onboot)). Leave it out (or `false`) for a mod without boot
content. From a project, `<KilnBoot>true</KilnBoot>` writes it.

- `true`: a failure of the mod's boot content leaves this mod, and the mods that require it, out.
- `"required"`: such a failure, or one bad entry in the mod's own files, stops the start (exit code `0x4B01`), with the
  reason in kiln.log and `kiln/state/boot.json`.
- A boot mod loads only with its boot content: one enabled after the start, or whose files or `OnBoot` settings changed
  since, loads at the next start.
- Dedicated servers and, since 0.2.0-dev.29, a player's game (a world they host and a game that joins a server)
  ([Where it runs](/kiln/wiki/onboot#where-it-runs)). With side `both`, the join compares what the boot content made on
  each side ([Settings and joining players](/kiln/wiki/onboot#settings-and-joining-players)).

## Program wraps: `systems`

Since 0.2.0-dev.29 a mod can declare which of the game's programs it replaces, for tools to read:
`"systems": { "replaces": ["fuel_setup"] }`. Nothing reads it yet; the wrap itself is code
([Wrapping the game's programs](/kiln/wiki/world-programs#wrapping-the-games-programs)). `kiln lint` no longer calls
`"writes"` an unknown key.

## Update checks: `updates`

Since 0.2.0-dev.28 `updates` names where new versions of the mod are published. The launcher and
`kiln updates check` read it and show players a notice with a link to the release page
([Mod updates](/kiln/wiki/profiles#mod-updates)). Nothing is downloaded or installed, and nothing in the game reads it.

```jsonc
"updates": {
  "provider": "github",
  "repository": "me/my-mod",            // owner/repo, not a URL
  "tagPattern": "v{version}",           // the release tag (default v{version})
  "asset": "my-mod-{version}.zip",      // the zip's name in a release (optional)
  "channel": "stable"                   // stable (default) | prerelease
}
```

From a project: `<KilnUpdatesRepository>me/my-mod</KilnUpdatesRepository>`, with `KilnUpdatesTagPattern`,
`KilnUpdatesAsset` and `KilnUpdatesChannel`. Tag each release with the manifest's `version`; in a repository of several
mods give each its own prefix (`mods/my-mod/v{version}`). A release made with [`kiln publish`](/kiln/wiki/cli#publishing-a-release)
carries a `kiln-release.json` that tells the check the zip's name, size and checksum and the API version it needs;
with it you can leave out `asset`.

A value Kiln can't read in `updates` is a warning and is ignored: the mod still loads, and `kiln lint` reports it.

## Steam messages: `steamMessages`

`"steamMessages": true` lets a C# mod lease Steam peer-to-peer message channels through `SteamMessages` in
Kiln.Network (0.2.0-dev.30.3, mod API 0.2.13). Without it, `SteamMessages.Open` refuses. It is a declaration for
trusted mods, not a sandbox: see [Steam messages](/kiln/wiki/steam-messages). Leave it out unless your mod needs
Steam's own messages; most mods talk over a [channel](/kiln/wiki/network).


## Versions

`apiVersion` is the mod API you built against (0.2 today; 0.2.0-dev.29.16 ships mod API 0.2.8, additive over 0.2.7: no
public member of 0.2.0-dev.29.15 was removed or changed). Older APIs of the same major version load. The running Kiln's
API is `Kiln.Mods.RuntimeApiVersion`.

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
