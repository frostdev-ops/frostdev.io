---
title: "Affixes: bonuses on one item"
nav: "Affixes"
description: "Roll bonuses such as +5 Strength onto one particular item. Kiln applies them while the item is in hand or worn."
status: "pending"
updated: "2026-11-13"
---

> **New in 0.2.0-dev.27.** Proven on a test server with stand-ins for players. What a player feels and sees is a check
> of the guided client pass.

"+5 Strength", "+10% Move Speed", "+17% Resist Fire": a bonus that belongs to one sword, not to every sword of its kind.
Your mod says which affixes there are and which items roll them. Kiln keeps each item's rolls with that item, and
applies them to whoever holds or wears it. Add `<KilnServices>Blocks</KilnServices>` to the project. The sample
`AffixSword` is a sword with one of three.

## Define and roll

Affix kinds and pools are [blocks](/kiln/wiki/blocks): `Blocks.Define` in C#, or the `affixes` and `affixPools`
sections of a `blocks/*.json` file.

```csharp
Blocks.Define("bear", new AffixBlock
{
    Name = "of the Bear", Stat = Stat.Strength,
    Tiers = [new AffixTier { Min = 2, Max = 4 }, new AffixTier { Min = 5, Max = 8, Weight = 0.5, MinItemLevel = 20 }],
});
AffixPoolHandle blades = Blocks.Define("blades", new AffixPoolBlock
{
    Items = [GameItems.Weapon_T1_1H_SwordEpic_01],
    Affixes = [new AffixEntry { Affix = "bear" }],
});

AffixResult rolled = blades.Roll(sword);              // sword: an ItemInstanceRef (Items.Held, a give result, ...)
if (rolled.Ok) Log.Info(rolled.Affixes[0].Text);      // "+3 Strength (of the Bear)"
```

```jsonc
// blocks/affixes.json: the same as data
{ "format": 1,
  "affixes": { "bear": { "name": "of the Bear", "stat": "strength", "tiers": [ { "min": 2, "max": 4 } ] } },
  "affixPools": { "blades": { "items": [ "Weapon_T1_1H_SwordEpic_01" ], "affixes": [ { "affix": "bear" } ] } } }
```

`Affixes.Define`, `Affixes.DefinePool` and `Affixes.Load` are the same registration. A roll picks `Min` to `Max`
different affixes by weight (never two of one `Group`), a tier among those the item's level allows, and a value in the
tier's range. A pool that can never reach its minimum is refused when it is defined, and a roll that can't reach it is
refused with a reason; the item keeps what it had.

| Call | Does |
|---|---|
| `Affixes.Of(item)` | the item's affixes, each with `Text` ("+5 Strength (of the Bear)") |
| `Affixes.Roll(item, pool)` / `pool.Roll(item)` | rolls the pool onto the item |
| `Affixes.Add`, `Set`, `Remove`, `Clear` | add one, give exactly these, take one or all off |
| `Affixes.Active(player)` | what Kiln holds on the player now |

`AffixesChangedEvent` reports every change to an item's affixes, `AffixesAppliedEvent` every change to what a player
gets. The capability `blocks.affixes` says whether rolls work, `blocks.affixes.effects` whether worn and held affixes
change stats.

## How they act

All 39 stats of the game work, from `Strength` to `ResistFire`. The item **in hand** and the items in the **equipment
slots** act (not the vanity slots); within half a second of putting an item on or away, its bonuses start or stop. Two
items with the same affix add up, unless the affix says `Stacks = false`. Rolls stay with the item through moves, saves
and restarts, as [item data](/kiln/wiki/inventory#item-data-and-saves). The stat changes are the game's own, so vanilla
players need nothing and the game's bars and numbers follow.

## Rules and limits

- An affix or a pool can't share its name with another kind of block of its mod (a `BlockError`). The same name and kind
  again replaces the earlier one.
- At most 8 affixes on one item, 16 tiers per affix. A value is at most 1,000,000 either way.
- What is stored on an item isn't trusted (a save edited by hand): data that doesn't read as rolls is left out, kiln.log
  says so once per item, and one item's bad data never stops anybody else's bonuses.
- Players with Kiln near the item get its rolls as item data, so a mod's client side can show them in a window, a HUD
  line or a notice. The game's own item tooltip can't show them yet.
- Not yet: flat damage on a hit, a share of a pool ("+5% of max stamina"), and rolls by themselves on a drop or a craft:
  a pool rolls when your code says so.
- An NPC or a creature that holds an item gets nothing: only players.
