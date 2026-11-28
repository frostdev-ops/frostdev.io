---
title: "The dev.32 registries: creatures, skills, buffs, world rules and more"
nav: "New registries"
description: "Twelve more registries: edit a creature's health, a skill's cost, a buff's length, the build rules of the world and how loot rolls, by stable names, plus a read-only view of everything else in the game's data."
status: "pending"
updated: "2026-11-28"
---

> **New in 0.2.0-dev.32 (beta 1, mod API 0.2.27), experimental (`KILNX031`).** Beta 1 is a test build: switch the launcher's
> **Channel** (Settings, Launcher updates) to the test builds to try it. A lab check on a dedicated server proved 262 of the 277
> fields (the 15 left refuse with a reason: an item's burn time and the damage of simple perks). **No registry edit has been seen in a
> real game client yet**: creatures, arsenals and perks in play, the skill screen of a joined player, buff and ability timing,
> altars above 16, gifting beyond 50 m, cleared no-build zones and real loot rolls are still to be checked. Names and shapes may
> change in any release until a registry is marked stable.

[Registries](/kiln/wiki/registries) are the game's data under names Kiln keeps stable across game updates. dev.31 shipped five
(`items`, `recipes`, `loot`, `drops`, `balance`). dev.32 adds twelve and a way to read the rest. The rules from the
[registries page](/kiln/wiki/registries) all hold: Kiln ids, `GameStart` and the other entry points, per-entry refusals, load
order, the report in `kiln/state/registry.json`.

| Registry | What it holds | Id of an entry |
|---|---|---|
| `creatures` | every creature (enemies, wildlife, farm animals, villagers): level, faction, size, health and damage scaling, 14 resistances, speeds, loot slots, an enemy's sight, a wild animal's taming steps | `game:enemy_vukah_melee` |
| `arsenals` | an enemy's attack list: each attack's chance, threat and ranges | `game:enemy_vukah_melee` (named after the first creature that uses it) |
| `perks` | what a perk grants: its value (the number the tooltip shows), the armour of simple perks | `game:perk_damage_ice` |
| `skills` | the skill tree's nodes: their cost in skill points (levels, kind, class and unlocked ability read only) | `game:skill_<node id>` |
| `stations` | the crafting stations, read only; a recipe names its station | `game:prop_production_t1_forge` |
| `buffs` | every buff and debuff: duration and what applying it again does | `game:buff_<8 hex>` |
| `abilities` | every timed action (spell casts, attacks, abilities, item uses): when it releases, hits, pays and applies a buff | `game:<stable name>` |
| `world` | the world's build rules: no-build boxes and the big dungeons' playable areas | `game:world` |
| `difficulty` | the lowest and highest value each difficulty setting accepts | `game:difficulty` |
| `limits` | numbers the game's code holds: the most Flame Altars, the gifting distance | `game:limits` |
| `lootRules` | the world-wide rarity weights of random loot | `game:loot` |
| `randomLoot` | every random loot table: its level rules and own rarity weights ([Loot odds and levels](/kiln/wiki/loot-rules)) | `game:labels_...`, `game:world_..._...` |

Entries are not added or removed in these registries (a mod's own buffs and abilities are clones or blocks; its skill nodes
come from `skills/*.json`). Each registry has a page in Kiln's repository (`docs/kiln/modding/registries/`, on [GitHub](https://github.com/frostdev-ops/kiln)) with
every field, its range, when it applies and what a joined client sees; the generated API reference has the C# types.

<!-- shot: conflicts-registry | The launcher's Conflicts view with a creatures edit and its writer -->

## A pack for each

A data pack's `registry` section, by Kiln id; no code:

```json
{ "format": 1,
  "registry": { "alter": [
    { "registry": "creatures", "select": { "id": "game:enemy_vukah_*", "has": ["enemy"] }, "field": "sight.range", "op": { "mul": 1.5 } },
    { "registry": "creatures", "select": "game:enemy_wildbeast_wolf_earlygame", "field": "level", "op": 12 },
    { "registry": "arsenals", "select": "game:enemy_vukah_melee", "field": "attacks[*].chance", "op": { "mul": 0.5 } },
    { "registry": "perks", "select": "game:perk_damage_ice", "field": "value", "op": { "mul": 2 } },
    { "registry": "skills", "select": "game:skill_4475e8dd", "field": "cost", "op": 0 },
    { "registry": "buffs", "select": "game:buff_*", "field": "duration", "op": { "mul": 2 } },
    { "registry": "limits", "select": "game:limits", "field": "giftingRange", "op": 200 } ] } }
```

(The selectors above are examples: look ids up in `kiln/data/content/dump.json` or with `kiln catalog search`; a buff's id is its 32-bit
id as 8 hex digits.) A plain `op` sets the value; `mul`, `add`, `min`, `max`, `raiseOnly` and `lowerOnly` change it relative to the value below.

Not every creature has every field: most have no size of their own, and only enemies have sight and an arsenal. Select the ones that
do (`"has": ["enemy"]`, or by id), or the edit is refused for the others and a relative edit over one of them refuses as a whole.

In C#, a typed property reads 0 or false for a creature that has no value of the field, so tell such creatures by `Kind`
(a `RegistryCreatureKind`: `Enemy`, `Wildlife`, `Animal`, `Villager`) or by id, never by a 0 (for `Resist.*` a 0 means immune). Reading
by name is stricter: `entry.Get<T>(field)` of a field the entry has no value of throws `InvalidOperationException` (before dev.32 it
returned `default`). Read it as a nullable type (`entry.Get<double?>("sight.range")` gives null), or ask with
`entry.TryGet<double>("sight.range", out var range)`.

The same in C#, from `Mod.OnRegistry` (`using Kiln.Registry;`; [the registries page](/kiln/wiki/registries#edit-from-c) has the whole mod):

```csharp
if (!Registries.Available) return;                            // in Mod.OnRegistry(RegistryContext context)
var registry = Registries.For(context);
registry.Alter(stage =>
{
    var vukah = stage.Creatures["game:enemy_vukah_melee"];
    if (vukah.Kind == RegistryCreatureKind.Enemy)             // only enemies have sight and an arsenal
        vukah.Sight.Range = vukah.Sight.Range * 1.5;
    vukah.Resist.Fire = 2.0;                                  // takes double fire damage; 0 would mean immune
    stage.Arsenals["game:enemy_vukah_melee"].Attacks[0].Chance = 0.5;
    stage.Skills["game:skill_4475e8dd"].Cost = 0;
});
```

## What an edit does, and when

- **Creatures** are edited **per kind**, never one creature (use [Creatures](/kiln/wiki/creatures) for one). Values a creature copies
  as it spawns (level, faction, size, resistances, speeds, loot) reach creatures that spawn **after** the edit; health and damage scaling and an enemy's
  sight are read at once by every creature of the entry, also those already in the world.
- **Arsenals** are shared: an edit reaches every enemy that uses it, at its next decision. An arsenal keeps its attacks (only their values
  change; adding or removing one is refused). In C# `ArsenalEntry.Attacks` is a list of `RegistryArsenalAttack`.
- **Perks:** `value` is read when the perk's effect starts (the item equipped, the perk unlocked): an effect already running keeps
  its value until it starts again. A perk whose value is a whole number takes whole numbers only (`not_exact`, never rounded). The
  damage of simple perks is refused for now: Kiln has not traced when the game reads it.
- **Skills:** the server's edit reaches a Kiln client's skill screen; a vanilla client keeps the game's costs on its screen (the
  server decides the unlock).
- **Buffs and abilities** are the same data as a data pack's `buffs` and `sequences` sections (the game's paths still work); a registry
  edit is the later layer and wins. A spell's cost is its item's (`items.manaCost`, `items.staminaCost`). Moving an ability's timing
  makes the server spawn, hit, pay and apply a buff at the new moment; a vanilla client keeps playing its animation at the old
  times.
- **World, difficulty, limits** are read once at start (`restart` fields): `GameStart` only, and **both sides need the same
  values**: the join compares them. Such a pack needs `"clients": "mod"` and `"side": "both"`.
- **`lootRules`, `randomLoot`, `creatures`, `arsenals`, `buffs`** are the server's alone: `"clients": "none"` is enough.

## What existing mods did that these cover

| A mod | The registry field |
|---|---|
| EMBER (build anywhere, no boundary) | `world.noBuildZones` and `world.playableAreas`, cleared |
| XHL Enemy Difficulty Limits (raised bounds) | `difficulty.<setting>.max` |
| XHL Unlimited Gifting Range | `limits.giftingRange` |
| More Flame Altars (altars above 16) | `limits.maxAltars` with `balance.altarsPerFlameLevel` above 16 |
| Loot Rarity Leveler | `lootRules` and `randomLoot` with `Registries.Reauthor` |

Not covered: the settings screen's slider steps (only a game client has them; resource patches still edit them), and what those
mods do beyond a number (Enemy Difficulty Limits' wider perception, More Flame Altars' merged bases). Past 16 altars, the game's
bases still count 16: the extra altars give build zones without the base features (comfort, base chests, survivor beds, animals, the
journal). A mod with its own hook on the same game check as a `limits` field is never refused: both stay in one chain, the first
answers, and `registry.json` and the launcher's Conflicts view report it. Use one of the two.

## Read anything: views

`RegistryViews` is a **read-only** view over every registry and over every other resource type of the running build (quests, NPC
dialogs, materials, UI data: the long tail no registry covers yet). Registries are *stable* views; the others are *advanced*: named
by Kiln from the game's reflection, checked per game build, never written.

```csharp
if (!RegistryViews.Available) return;                           // kiln.registry.view: every read below needs it
if (RegistryViews.Find("quest") is { } quests)
    foreach (var id in quests.Select("game:quest_*"))
        if (quests[id].TryGet<int>("xpReward", out var xp, out var why)) Log.Info($"{id.Value}: {xp} xp");
        else Log.Info(why);                                      // this entry has no value of it, in Kiln words
```

The first read is slow (4 to 11 seconds for a registry's first resolved read, about 0.2 seconds to list an advanced view): do it
off the game's thread, never in a tick. To write, use a registry field where one covers the member (`CoveredBy` says which) or the
old path. By name from code that does not know a registry's typed property: `stage.Entries("creatures")["game:enemy_vukah_melee"].Set("health.perPlayer", 1.2)` inside a pass.

## Re-author when settings change

An `OnRegistry` pass can be asked to run again, in the same world, without a restart:
`Registries.Reauthor()` (it takes no entry point: only `WorldLoad` is re-authored). It runs off the world tick, replaces your layers in
one turn and never stacks, and it answers a `RegistryReauthorResult` to check (`Ok`, else a `Reason`).
The [loot page](/kiln/wiki/loot-rules#follow-a-setting-or-a-players-level) shows it in use. One call takes at most 4,096 edits of
a registry (16,384 for `randomLoot`); a call over the cap is refused whole and logged, never thrown.

For field-by-field ranges, ids and "joined client" columns, see the registry pages in Kiln's repository. Related:
[Registries](/kiln/wiki/registries), [Data packs](/kiln/wiki/data-packs), [Game data](/kiln/wiki/game-data),
[Multiplayer](/kiln/wiki/multiplayer).
