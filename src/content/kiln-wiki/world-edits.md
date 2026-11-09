---
title: "World edits"
description: "Dig, build, flatten and paint terrain, place props, paste schematics. Players without Kiln see it all."
status: "works"
updated: "2026-11-08"
---

Kiln uses the game's own building and terraforming, so every player sees the edits. It adds the areas it edits to the save, so
they're kept like a base.

<!-- shot: world-edit | A Kiln crater and a pasted schematic -->

To author new placeable definitions, see [World blocks](/kiln/wiki/world-blocks). For declared worker-thread ECS updates,
see [World programs](/kiln/wiki/world-programs) (both have dev.20+ additions).

## Shapes

```csharp
await Build.Dig(BuildShape.Sphere(position, 3));
await Build.Add(BuildShape.Box(position, 2, 0.5, 2), Build.MaterialOf(woodBlockItemId));
await Build.Flatten(BuildShape.Cylinder(position, 6, 4), levelY: position.Y);
await Build.Smooth(BuildShape.Sphere(position, 4), strength: 0.7f, passes: 2);
await Build.Paint(BuildShape.Sphere(position, 4), material: 2);
```

Sizes are in metres. Each call returns cells changed, whether the game kept them, or why it refused (a zone, a base, an unloaded
area).

## Props

```csharp
EntityId chest = Build.PlaceProp("Prop_Decoration_T1_Storage_24", position, rotation);
Build.RemoveProp(chest);
var placed = Build.Props(box);    // what players built in an area
```

## Schematics

```csharp
Schematic hut = await Schematic.CaptureAsync(Build.BoxBetween(cornerA, cornerB),
    new() { Name = "hut" });
hut.Save(Path.Combine(Context.DataDirectory, "hut.kschem"));
await Schematic.Load(file).Paste(target, new PasteOptions { Rotation = 1 });  // 90 degrees
```

`Build.PlaceOnce("my-outpost", schematic, position)` places a structure once per world, across restarts.

`await Build.Undo()` reverts your mod's newest edit this session, where the world still holds what Kiln wrote. A player's later
change wins.

## Admin commands

The Schematics sample registers `/build`:

```
/build pos1 | pos2           corners of a selection (your position)
/build capture <name>        selection → <name>.kschem
/build paste <name> [90]     paste, rotated
/build dig sphere 3          shapes at your position
/build prop <template>
/build undo | history
```

## Protection zones

`Gameplay.Protect(new ProtectionZone { ... })` stops players (except those you allow) building, breaking, digging, looting,
crafting or interacting in an area. The admin **Zones** and **Map** pages edit them.

Kiln's own edits leave bases alone unless asked (`BuildFlags.InBases`), and follow zones when asked (`BuildFlags.RespectZones`).

## Limits

4 million cells per call, 4096 per side. Very large edits push other parts of the world out of the server's memory until players
come near. Edits in a hosted game aren't tested yet.
