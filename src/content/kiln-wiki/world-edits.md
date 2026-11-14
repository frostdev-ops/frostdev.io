---
title: "World edits"
description: "Dig, build, flatten and paint terrain, place props, paste schematics, lay terrain overlays, and ask the world about ground, sight and paths. Players without Kiln see it all."
status: "works"
updated: "2026-11-14"
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

**Write only if nothing changed (0.2.0-dev.28).** Another mod's `BuildEditingEvent` handler runs inside a write, so cells
you read may differ by the time it commits. `Build.WriteIfUnchanged` writes only if the world still holds the cells you
read when the write commits, after every handler; otherwise it returns `BuildRefusal.Changed` and writes nothing.

```csharp
await Build.Load(box);
var before = Build.Read(box);
var r = Build.WriteIfUnchanged(box, Carve(before), before);
if (r.Refusal == BuildRefusal.Changed) { /* someone edited it: read again, or leave it */ }
```

## Props

```csharp
EntityId chest = Build.PlaceProp("Prop_Decoration_T1_Storage_24", position, rotation);
Build.RemoveProp(chest);
var placed = Build.Props(box);    // what players built in an area
```

**Scale (0.2.0-dev.28).** `World.SetTransformScale(entity, new Scale3(1.25f, 0.75f, 1.5f))` sets an entity's scale for
each axis as one tracked write: list `CurrentTransform` under [`writes`](/kiln/wiki/manifest#tracked-writes-writes)
(Kiln.Sdk adds it). It changes the drawn size, not collision. It survives a save and a restart: the game's save doesn't
keep a scale, so Kiln keeps it beside the save and sets it again in your mod's name when the entity loads, while your
mod is loaded. `EntityScaleResult.Persisted` says whether it comes back; entities the save doesn't keep (most enemies,
loot pickups) keep it for the session only. Remove the mod and its props go back to the game's size. The row is decided
by the time `OnLoad` runs. Capability `world.transform_scale`, switched off until its game
test, on a server as well ([preview](/kiln/wiki/code-mods#built-waiting-for-a-game-test) switches it on). Sample
`TransformScale`.

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

## Terrain overlays

New in 0.2.0-dev.28 (service Terrain). An overlay is a bounded patch of ground: an ore vein, a mound, a tunnel, a small
dungeon shell. `Terrain.Apply` writes it **once per world**, a batch each tick, and remembers which mod owns it and at
which version.

```csharp
// a 3 m mound, added on top of the ground, once per world
var heights = new float[16 * 16];
for (var z = 0; z < 16; z++)
for (var x = 0; x < 16; x++)
    heights[z * 16 + x] = MathF.Max(0, 6f - MathF.Sqrt((x - 7.5f) * (x - 7.5f) + (z - 7.5f) * (z - 7.5f)));
var corner = Build.CellOf(position);
var mound = new TerrainPatch("mound", 1, new CellBox(corner.X, corner.Y, corner.Z, 16, 6, 16),
    new TerrainHeightfield(heights, Fill: 1, Mode: TerrainHeightMode.AddOnTop), [new TerrainPaletteEntry(1)]);

var report = await Terrain.Inspect(mound);          // what would happen; writes nothing
var result = await Terrain.Apply(mound);            // one batch a tick
if (!result.Ok) Log.Warn($"mound: {result.State}, {result.Reason}");
```

A patch is a C# record (`TerrainPatch`) or the same in JSON (`TerrainPatch.FromJson`): a box of cells (0.5 m each), a
palette, and a source, either a voxel volume or a heightfield. `Apply` waits for the world to run, so you can call it
from `OnLoad`. The sample `OreVein` makes a mound from C# and a vein from `vein.json`.

- **Everyone sees it.** The cells are ordinary world edits: the game saves them and sends them to every player, also to
  a player without Kiln.
- **Players' changes win.** A new version of a patch never writes over ground a player changed since the last one; it
  gives up that block and the result says `Conflict`. A change another mod makes to the same spot while an overlay is
  applied is kept too: overlays write with `Build.WriteIfUnchanged`.
- **Game materials only.** A player without the mod has no look for a material of a mod's own, so a patch refuses one.
- **Removing a mod leaves its ground.** `Terrain.Forget` only drops the record; nothing can take a saved edit out
  again. Two mods' patches are kept apart only while both are installed.
- **Bounded:** at most 128 m across and 1,048,576 cells, 64 kept patches per mod and world.
- **A lost record is told from a first install.** Kiln keeps a second record of each world's kept patches
  (`kiln/data/kiln.terrain`). A patch whose world lost its Kiln data is refused ("ownership lost"); a first install over
  ground that already looks like the patch is accepted. `Apply` writes nothing when that record can't be written. If
  all of `kiln/data` is lost, or a world is moved without it, a patch is a first install again: keep `kiln/data` in
  your backups.
- **Transient patches** (`TerrainPersistence.Transient`, and `BuildFlags.Transient` for a `Build` edit) are gone after
  the next restart, also inside a player base or next to a kept edit: Kiln notes them before each save and puts back
  what was there at the next start. A cell someone changed since keeps that change. `Transient` with `Unloaded` is
  refused.

Dedicated servers have it. On a world a player hosts, `terrain.overlays` is
[switched off until its game test](/kiln/wiki/code-mods#built-waiting-for-a-game-test).

## Questions about the world

New in 0.2.0-dev.28 (service Queries). Read-only questions, on the server's tick thread:

| Member | Answers |
|---|---|
| `Queries.RaycastVoxels(from, to)` | the first terrain or building voxel on a segment, or that it is clear |
| `Queries.GroundBelow(from, maxDown)` | the first voxel surface below a point (a roof counts) |
| `Queries.VoxelLineOfSight(from, to)` | whether voxels stand between two entities |
| `Queries.EntitiesInSphere(center, radius)`, `EntitiesInBox(center, halfExtents)` | the entities whose origin is inside, nearest first |

- **Three answers, never two.** A ray answers a hit, a miss (the whole segment was read and is clear) or "unknown"
  (`Ok` false: the terrain there is not loaded, for example). It never reports open space it could not read; "not
  known" is not "hidden".
- **Voxels only.** Rays see terrain and buildings, not props, chests, doors, creatures or players: a clear ray is not a
  clear path. The overlaps look at one point per entity, its origin.
- **A shared budget.** All mods together have 64 rays and 500 microseconds of ray time in a server step. A ray beyond
  that answers `BudgetExceeded`, which means "next step": spread work over steps. Server operators can change the
  limits in `kiln/config/kiln.queries.json` ([Dedicated servers](/kiln/wiki/dedicated-servers#world-queries)).
- Not from inside a [world program](/kiln/wiki/world-programs) or a hook: cast the ray in a tick handler and hand the
  result in.
- Kiln.TestKit fakes the queries (`kiln.Queries`), so this code runs under `dotnet test`.

### Paths

`Queries.FindPath` asks the game's own path search, the one its creatures use, for a walking route between two points at
most 200 m apart. `Queries.CanReach` asks only whether one arrives.

```csharp
var result = await Queries.FindPath(new QueryPathRequest(anchor, from, to));
if (result.Ok && result.ReachesTarget) foreach (var p in result.Points) { /* walk it yourself */ }
```

- **Nothing is moved.** The answer comes some server steps later and is a copy of the route's points from the step the
  game answered. A creature's [brain](/kiln/wiki/creature-ai#a-brain-of-your-own) walks the points itself, one after
  another with `MoveTo`.
- **The anchor** is an entity with the game's spawn marker: one the game or `Spawn` put into the world. For a player or a
  saved entity, spawn a helper pickup (`Base_LootPickup_Generic_Gravity`) at the start, use it as the anchor and
  destroy it afterwards.
- At most 32 requests are open at once, 8 for one mod; a request ends after 10 s and 150 steps.

Dedicated servers have the queries. On a world a player hosts they are
[switched off until their game test](/kiln/wiki/code-mods#built-waiting-for-a-game-test).

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
