---
title: "New items and recipes"
nav: "New items"
description: "Add items and recipes, borrow other items' models, name them in every language, and place them in loot and traders."
status: "works"
updated: "2026-11-08"
---

A new item is a copy of an existing one (its **base**) with its own GUID, name, texts and values.

> **Generate a GUID once and never change it after release.** Saves store the id made from it.

To create an item without choosing a base or a GUID, start with [blocks](/kiln/wiki/blocks). dev.20+ adds the
`item-blocks` template and reusable loot-table blocks. To move existing gear while keeping its state, use
[inventory transfers](/kiln/wiki/inventory); persistent per-item data and affixes are not supplied.

## In a data pack

```json
{ "format": 1,
  "items": { "add": [ {
    "guid": "7d3e9b52-1c84-4f0a-a6d7-5e2b8c9f1a03",
    "name": "MyMod_Glacier",
    "base": "Weapon_T1_1H_SwordEpic_01",
    "model": "item:Weapon_T4_1H_SwordEpic_02",
    "icon": "icons/glacier.png",
    "texts": { "en": { "name": "Glacier", "description": "A blade of old ice." },
               "de": { "name": "Gletscher" } },
    "fields": { "damageSetup.dmgMod": 1.6, "rarity": "Epic" } } ] },
  "recipes": { "add": [ {
    "guid": "84d38550-b3df-426d-a42d-5b1259156447",
    "name": "MyMod_Glacier_Recipe",
    "station": "hand",
    "inputs": [ { "item": "Material_T1_Twigs", "count": 2 } ],
    "outputs": [ { "item": "MyMod_Glacier", "count": 1 } ] } ] } }
```

<!-- shot: item-tooltip | A new item's tooltip with its own icon and German name -->

Later rules can change it too.

## In code

```csharp
public override void OnLoad()     // definitions go in before the save is read
{
    Content.Items.Register(new ItemDefinition
    {
        Guid = Guid.Parse("54b131f3-525f-451c-9976-a4bbcd8393c6"),
        Name = "MyMod_FrostEdge",
        BaseOn = "Weapon_T1_1H_SwordEpic_01",
        DisplayName = "Frost Edge",
        Fields = new Dictionary<string, object> {
            ["damageSetup.dmgMod"] = 1.5, ["rarity"] = "Rare" },
    });
}
```

## Looks: borrow from other items

| Key | Takes |
|---|---|
| `model` | another item's whole look: held, worn, on the ground |
| `icon` | another item's icon, or your own PNG |
| `perks` | other items' perks, per slot |
| `weaponType` | another weapon's category (skills and bonuses follow) |

Or your own: [3D models](/kiln/wiki/models), [icons](/kiln/wiki/assets).

## Texts

`texts` holds name, description, lore and more per language (`en`, `de`, `pt-BR`, …), falling back to English.
`displayName` and `description` set every language.

## Recipes

`station` is `"hand"` (the crafting menu), a recipe whose station to use, or a station's id. Traders are stations, so a
trade offer is a recipe at the trader, on its crafting tab. New recipes appear in a matching
crafting tab, with no unlock by default: players see them once they know an ingredient.

## Loot and drops

```json
"loot":  { "like": "Material_T1_Metal_Scraps", "stackSizeMin": 2, "stackSizeMax": 4 },
"drops": [ { "table": "like:Material_T1_Metal_Scraps",
             "countMin": 1, "countMax": 2, "chance": 0.25 } ]
```

`loot` makes it turn up wherever its `like` item does, as often. `drops` adds it to a table by GUID, or every table that
drops a `like:` item.

## What players need

`"clients": "kiln"`: the server sends definitions to Kiln players and refuses players without Kiln. Your own PNGs and
models aren't sent this way, so use `"clients": "mod"` and a modpack. With `modSync: off`, a player without Kiln can join, but
a Kiln item can crash their game. See [Who can join](/kiln/wiki/multiplayer#who-can-join).

## When a mod is removed

Its items stay valid until restart, and its recipes leave the menu. After a restart, saves keep the item as a placeholder,
`[Missing: <mod>:<item>]`. Stacks and gear survive, and the item returns with the mod.
