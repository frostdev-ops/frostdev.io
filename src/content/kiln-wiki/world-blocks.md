---
title: "World and furniture blocks"
nav: "World blocks"
description: "Crafting props, nearby-prop recipes, container loot, lids, doors and collision boxes."
status: "pending"
updated: "2026-11-08"
---

> **New in 0.2.0-dev.20.** Crafting props, default loot, lid and door controls, and several collider boxes require
> the dev.20 runtime and MDK or newer. Server checks pass; visible behaviour still needs a client check.

[Blocks](/kiln/wiki/blocks) make things players place: props, stations, containers, doors, beds and seats. Define them in
`OnLoad` or in `blocks/*.json`; Kiln derives their ids. Start with `kiln new world-blocks MyWorkshop`.

## A recipe needs a nearby prop

```csharp
var table = Blocks.Define("rune-table", new PropBlock
{
    Name = "Rune Table", Provides = true,
    Visual = new VisualBlock { Like = GameItems.Prop_Decoration_Comfort1_T0_Table_Medium },
});
Blocks.Define("rune-bench", new StationBlock
{
    Name = "Rune Workbench", Kind = StationKind.Workbench,
    Recipes = [new RecipeBlock { Needs = { [GameItems.Material_T1_Twigs] = 2 },
        Output = GameItems.Material_T1_Wood_Logs, NeedsProps = [table] }],
});
```

`Provides` adds a crafting prop to the game's table. `NeedsProps` makes the game's craft check require it nearby. There
are 13 shared prop slots across all mods and at most 8 requirements per recipe. This works at manual stations such as
workbenches. Automated factory recipes reject `NeedsProps`, because their craft path has no nearby-prop context.

Players need the mod (`clients: mod`). The game reads this table at boot: a JSON prop is available on the first start, a
new C# prop on the next start. Restart the server and every client after table changes.

## A container starts with loot

```jsonc
{ "format": 1,
  "lootTables": { "supplies": { "entries": [
    { "item": "Material_T1_Wood_Logs", "countMin": 3 } ] } },
  "containers": { "supply-cache": { "name": "Supply Cache", "defaultLoot": "supplies",
    "lid": { "moves": false } } },
  "doors": { "one-way-door": { "name": "One Way Door", "opens": "front", "sides": "front" } } }
```

`DefaultLoot` rolls and fills a placed-container identity once. Progress saves with the inventory, so a restart does not
refill it. Replacing a container at the same spot does not reset that identity. Loot tables may also be quest rewards or
creature drops.

`Lid.Moves = false` keeps a lid from moving. To supply a different animation, its `Graph`, `OpenState` and `ShutState`
must exist. Doors distinguish `Opens` (the swing) from `Sides` (which side may use it): `front`, `back`, `both`.

## Several collision boxes

A prop with a model of its own can use `Colliders` instead of `Collider`: 1..16 `BoxCollider` entries, each with a `Size`
and optional `Center` in metres. This makes a table's top and legs solid separately. The placement check still uses the
enclosing box unless `Placement.Size` says otherwise.

Do not combine the two fields, use spheres or capsules in the list, or replace a borrowed game look's collision. Several
boxes need a floor or wall starter; the ceiling starter has a capsule.

## Check it

`kiln lint` checks the format and names; `kiln blocks show <name>` shows what it became. Keep names fixed after release.
A server test can check recipe refusal, one-time loot and save/restart state. A player must confirm crafting near and away
from the prop, tooltips, loot windows, lid/door animation and walking around the collider shapes.
