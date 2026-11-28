---
title: "Data packs"
description: "Change items, recipes, loot and drops with JSON in your mod. They apply at world load and come off with the mod."
status: "works"
updated: "2026-11-28"
---

JSON files in your mod's `content/` folder. Kiln applies them at world load, before the save is read, in mod load order. Unload
the mod and they come off. Edit a file on a running server and they apply again within seconds.

```json
{
  "format": 1,
  "items": {
    "Material_T1_Wood_Logs": { "maxStackSize": 1000 },
    "Weapon_T1_1H_SwordEpic_01": { "damageSetup.dmgMod": 1.25, "rarity": "Epic" }
  },
  "recipes": { "Ammo_Arrow_T1_Flint": { "outputs": { "mul": 2 } } },
  "loot": { "Material_T1_Wood_Logs": { "stackSizeMin": 5, "stackSizeMax": 20 } },
  "drops": { "*": { "count": { "mul": 2 } } }
}
```

| Section | Changes |
|---|---|
| `items` | stack size, rarity, damage, armour, fuel, comfort, any item field |
| `recipes` | ingredients, results, crafting time, water, unlock |
| `loot` | random loot of chests and pickups, per item |
| `drops` | enemy drops and fixed chests, by table |
| `gear` | a weapon's or armour's numbers as the tooltip shows them: power, armour, rarity, levels (dev.30+) |
| `gearRules` | the game's balancing values for gear: durability per rarity, socket chances, the workbench's unlock cost (dev.30+; needs `"boot": true`) |
| `registry` | the same data, and creatures, loot odds, world rules and more, by names Kiln keeps stable (dev.31+; twelve more in dev.32 beta 1) |

The same files hold [game data](/kiln/wiki/game-data) and [new items](/kiln/wiki/new-items).

Since 0.2.0-dev.31 (dev.31+) a pack's `registry` section edits the same data, and more, by names Kiln keeps stable across
game updates: [Registries](/kiln/wiki/registries). Since 0.2.0-dev.32 (beta 1, mod API 0.2.27, a test build on the launcher's beta channel) twelve more registries are there: creatures,
arsenals, perks, skills, buffs, abilities, the world's build rules, difficulty bounds, limits and loot odds
([The dev.32 registries](/kiln/wiki/new-registries), [Loot odds and levels](/kiln/wiki/loot-rules)).

## Picking entries

By name (`"Material_T1_Wood_Logs"`), id (`"0x2b0cf1d5"`), pattern (`"Material_*"`, `"*"`), or conditions on the game's
original values:

```json
"*": { "@where": { "maxStackSize": ">1", "category": "Materials" },
       "maxStackSize": { "mul": 4, "max": 9999 } }
```

Don't guess names or paths: use `kiln catalog search` ([catalogs](/kiln/wiki/catalogs)) or `Content.Dump()`, which writes
every entry to `kiln/data/content/dump.json`. `kiln lint` checks them.

## Values

A plain value sets the field: a number, `true`/`false`, a name (`"Epic"`), seconds for times. An object changes the game's
original value:

| Op | Does |
|---|---|
| `{"mul": 4}` | multiply |
| `{"add": 10}` | add |
| `{"min": 1, "max": 9999}` | keep within limits |
| `{"raiseOnly": true}` | only ever raise it |
| `{"set": 5}` | set it |

## A recipe's water

New in 0.2.0-dev.30.3 (thanks netjunk). `"water"` on a new recipe, or `"waterCharges"` in a change to a game recipe, is
the game's own recipe water: **charges a craft**, what the recipe screen shows as its Water row ("Water 92 / 2": 92 at
hand, 2 a craft). A whole number from 0 to 1023. The game takes it when a craft starts:

| Where the recipe is crafted | Where the water comes from |
|---|---|
| one of the **6 stations with a tank**: Seedbed (150 charges), Oven, Cooking Station, Laboratory, Coffee Brewer (100 each), Beehive (50) | the station's own tank, which the player fills with a watering can or the station's Fill |
| a **crafting menu**: `"hand"`, the Workbench, the Kitchen, an NPC's crafting | the player and the base: the crafter's water containers, then the base's wells and barrels |
| a factory station **without** a tank (Smelter, Forge, Kiln, Loom...) | nowhere: it never starts the recipe |

```json
{ "format": 1, "recipes": {
    "add": [ { "guid": "1f0c8a52-3b7e-4d21-9a6c-2e5d8b4f7a10", "name": "MyMod_Herb_Tea", "station": "0x6b8247d6", "water": 5,
               "inputs": [ { "item": "Food_T7_raw_herb_Thyme", "count": 2 } ],
               "outputs": [ { "item": "Food_T7_dish_hydration_ThymeTea", "count": 1 } ] } ],
    "Food_T3_Meat_Chicken_Soup": { "waterCharges": 3 } } }
```

- Without `"water"`, a new recipe has its base recipe's water, or none with only a `station`; `0` clears a base's.
- A recipe that asks more than its station's tank holds never starts.
- **Not the "Water" item.** `Food_T1_raw_hydration_Water_Pouch_Filled_DEPRECATED` is the game's old canteen. As an
  input, a craft takes that item from the player, never tank water, even though the recipe screen borrows its name and
  icon for the water row. `kiln lint` warns about it and about water at a station without a tank
  ([KL408](/kiln/wiki/lint#kiln-lint)).

From code: `RecipeDefinition.Water` and `ContentEntry.CraftingWater` ([below](#from-code)).

## Gear numbers and gear rules

Two sections edit gear (dev.30+, mod API 0.2.12). `gear` speaks in the numbers the game's tooltip shows ("power 30", "physical
armour 45") instead of solving damage multipliers by hand:

```jsonc
{ "format": 1,
  "gear": {
    "Weapon_T1_1H_Sword_Craft": { "power": 30, "damage": { "cut": 0.75, "fire": 0.25 }, "levels": [5, 5] },
    "Armor_T2_*":               { "@where": { "rarity": "Rare" }, "armor": { "physical": { "mul": 1.2 } } } },
  "gearRules": { "rarityDurability": [0.9, 0.95, 1, 1.1, 1.25], "socketChance": { "epic": 0.75 } } }
```

`gearRules` changes values the game reads once, when it starts, so the mod needs `"boot": true` (see
[OnBoot](/kiln/wiki/onboot#resource-patches)). One wrong value leaves that file's `gearRules` out, with the reason in `kiln.log`, and two mods
that set the same member conflict. The server's values act for everyone; a Kiln client shows them in its tooltips, a player without
Kiln plays with them and sees the game's numbers.

**Since 0.2.0-dev.32 (beta 1, on the beta channel)** each `gearRules` key is also a field of the `balance` [registry](/kiln/wiki/registries) of the same name
(`rarityDurability.<rarity>`, `socketChance.<rarity>`, `durability.start`, `unlockCost.seed`, and so on: 19 fields), and Kiln writes
a file's values through that mapping **where it gives the same bytes**. At every start Kiln builds the table both ways and serves the
registry's copy only when the two are identical; otherwise the old way, with the reason in `kiln/state/registry.json`
(`frontEnds`). Nothing changes in your file or in the game. A registry edit of the same field still wins over the file. The `gear`
section stays a data pack on purpose: one registry edit per gear key doesn't always mean what the rule means. `lootRarityRates` is
still refused: use [`lootRules`](/kiln/wiki/loot-rules). Not seen in a real game: gear rules through the registry on a client, tooltip numbers
and durability in play. A walkthrough (a mod of one manifest and one data file) is `docs/kiln/modding/gear-rules.md` in Kiln's repository, on [GitHub](https://github.com/frostdev-ops/kiln).

## When two mods disagree

Later entries win within a pack, the later mod between packs, and code over packs. Conflicts and problems are logged per
file and don't stop the rest. Registry edits (dev.31+) are reported alongside these: the launcher's Conflicts view shows
which edit won and why one was refused ([Registries](/kiln/wiki/registries#several-mods-one-field)).

## From code

```csharp
Content.OnReady(_ =>
{
    Content.Items.Get("Material_T1_Wood_Logs")!.MaxStack = 2000;
    Content.Recipes.Get("Tool_basic_FishingRod_T0_PK")!.CraftingDuration =
        TimeSpan.FromSeconds(5);
});
```

`OnReady` runs after the packs at every world load. `Content.Apply(json)` takes the pack format from code.

A recipe's water (0.2.0-dev.30.3, mod API 0.2.13): `Content.Recipes.Get(...)!.CraftingWater = 3` sets a game recipe's
charges a craft (0 to 1023; `Reset("waterCharges")` puts the game's back), and `RecipeDefinition.Water` gives a new
recipe its water ([New items and recipes](/kiln/wiki/new-items#recipes)).

## What players see

Kiln players get the server's values. Players without Kiln:

| Change | Without Kiln |
|---|---|
| loot and drops | works: rolled on the server |
| stack size | right on the server; splitting may look odd for a moment |
| recipes | the server crafts by its recipe; their menu shows the old one |
| item stats | the server's values apply; tooltips show the old numbers |

## Big stacks and removing mods

Safe while the server runs. After a restart without the mod, stacks above the game's size are cut down the next time they
move. That's the game's own rule.
