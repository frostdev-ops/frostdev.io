---
title: "Data packs"
description: "Change items, recipes, loot and drops with JSON in your mod. They apply at world load and come off with the mod."
status: "works"
updated: "2026-11-04"
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
| `recipes` | ingredients, results, crafting time, unlock |
| `loot` | random loot of chests and pickups, per item |
| `drops` | enemy drops and fixed chests, by table |

The same files hold [game data](/kiln/wiki/game-data) and [new items](/kiln/wiki/new-items).

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

## When two mods disagree

Later entries win within a pack, the later mod between packs, and code over packs. Conflicts and problems are logged per
file and don't stop the rest.

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
