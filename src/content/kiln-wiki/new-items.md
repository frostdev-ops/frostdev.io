---
title: "New items and recipes"
nav: "New items"
description: "Add items and recipes, borrow other items' models, name them in every language, and place them in loot and traders."
status: "works"
updated: "2026-11-21"
---

A new item is a copy of an existing one (its **base**) with its own GUID, name, texts and values.

> **Generate a GUID once and never change it after release.** Saves store the id made from it.

To create an item without choosing a base or a GUID, start with [blocks](/kiln/wiki/blocks). dev.20+ adds the
`item-blocks` template and reusable loot-table blocks. To move existing gear while keeping its state, use
[inventory transfers](/kiln/wiki/inventory). Data on one item is [`InstanceData`](/kiln/wiki/inventory#item-data-and-saves),
rolled bonuses are [affixes](/kiln/wiki/affixes), and new gems and gem sockets are on [Gems](/kiln/wiki/gems).

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

**A gem socket on any gear (0.2.0-dev.29.11).** `"fields": { "gemSlotOverride": true }` gives your item a socket whenever
the game makes one, also on a ring, armour or a shield. Players can use the Shroud Forge on such a piece only while a mod
allows sockets on that kind of gear on their game (`Gems.AllowSockets`). See [Gems](/kiln/wiki/gems).

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

`Items.DisplayName(item)` (since 0.2.0-dev.29.15) gives any item's name in the player's language, read from the game's
texts, also on a joined client; for a new item, its `texts` for that language. A dedicated server answers the English name.
To draw an item's icon in a mod's window, see [Game UI](/kiln/wiki/game-ui).

## Recipes

`station` is `"hand"` (the crafting menu), a recipe whose station to use, or a station's id. Traders are stations, so a
trade offer is a recipe at the trader, on its crafting tab. New recipes appear in a matching
crafting tab, with no unlock by default: players see them once they know an ingredient.

**Water** (0.2.0-dev.30.3, mod API 0.2.13, thanks netjunk): `"water": 5` asks 5 charges a craft from the station's tank,
or from the player and the base in a crafting menu ([A recipe's water](/kiln/wiki/data-packs#a-recipes-water)). In code it
is `RecipeDefinition.Water`:

```csharp
Content.Recipes.Register(new RecipeDefinition
{
    Guid = Guid.Parse("1f0c8a52-3b7e-4d21-9a6c-2e5d8b4f7a10"), Name = "MyMod_Herb_Tea", Station = "0x6b8247d6",
    Inputs = [("Food_T7_raw_herb_Thyme", 2)], Outputs = [("Food_T7_dish_hydration_ThymeTea", 1)],
    Water = 5,                                       // charges from the station's tank each craft
});
```

`Water` is 0 to 1023 (`ArgumentException` otherwise); null keeps the base recipe's, 0 clears it. Give either `Water` or
`Fields["waterCharges"]`, not both (`ArgumentException`).

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
`[Missing: <mod>:<item>]`. Stacks and gear survive, and the item returns with the mod. Since 0.2.0-dev.29.11 a mod's
gems stay as such placeholders too, in the inventory or in a socket, instead of turning into their base gem; a gem whose
effect was the mod's own code then does nothing ([Gems](/kiln/wiki/gems)).
