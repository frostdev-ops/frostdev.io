---
title: "Cloth and bone chains on models"
nav: "Cloth and chains"
description: "Make a banner, cape or skirt hang and sway as cloth, and a tail, braid or pendant swing on a chain of bones: cooked into your model, simulated by the game on each player's machine."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.31 (dev.31+).** On, and **not yet confirmed in a game**: the cook writes cloth and chains with no
> switch, and a dedicated-server lab reads the cooked files back through the game's own reflection, but nothing is
> drawn there. The game has not yet been seen to draw a Kiln-cooked cloth or chain (guided check 16e-cc16e). If yours
> hangs wrong, the cook's fabric or its fixed tuning may be why: please report it.

Models built with a [recipe](/kiln/wiki/models) can now carry **cloth** (one glTF primitive the game simulates as cloth: a
banner, a cape, a skirt) and **bone chains** (2 to 8 joints of the model's own skeleton that swing: a pendant, a tail, a
braid). The game simulates them on each player's machine with its own cloth and chain code. A dedicated server only
serves the cooked files, and Kiln adds no hook and no runtime call. Players need the mod.

## Step by step

1. **Model it.** Cloth is a primitive of its own (its own material slot in Blender) with real triangles: a quad strip, a
   cape. Chains are a line of bones of **your own skeleton**, each link with a length and nothing hanging below the last.
   Keep scale 1 everywhere.
2. **Say what moves** in `assets/physics.json`: for cloth, a `pin` per particle (1 holds it on the model, 0 lets it hang); for a chain,
   its first and last swinging bone. A creature's body block can hold the same entries.
3. **Cook it** like any model: a `model` step in `assets/cook.json` names the glTF, then `kiln build` (or `kiln cook` in the mod's
   folder). The cook refuses, naming the field, anything it can't write, and writes nothing then.
4. **Look at it in the game**: place, wear or spawn the thing, walk past it, turn, teleport and reload.
   `assets/cooked/cook-report.json` lists each model's cloth particles and chain joints.

## assets/physics.json

One file names every model's physics, by the model file's path in the mod:

```json
{ "format": 1,
  "models": {
    "models/banner.gltf": { "cloth": [ { "mesh": 0, "primitive": 0, "particleIds": [0, 1, 2, 3], "pin": [1, 1, 0, 0], "massKg": 0.3 } ] },
    "models/pendant.glb": { "chains": [ { "rootJoint": "pendant_0", "tipJoint": "pendant_2" } ] } } }
```

| Field | Default, range | Meaning |
|---|---|---|
| `mesh`, `primitive` | required | the glTF mesh and primitive, by index |
| `particleIds` | every vertex its own | equal ids weld the copies a UV or normal seam made |
| `pin` | required, 0 to 1 each | one per particle: 1 holds it on the model, 0 lets it hang; between is heavier and limits its motion |
| `massKg` | 1, 0.001 to 100 | the whole cloth's mass |
| `gravity`, `damping`, `stiffness` | 9.81, 0.4, 0.8 | cloth tuning |
| `colliders` | none | spheres and capsules in bind pose; on a skinned model each names the joint it follows; at most 32 spheres, a capsule counting two |
| `rootJoint`, `tipJoint` | required | a chain from the first joint that swings to the last, along one branch |
| `particleMassKg`, `damping`, `stiffness`, `bendStiffness` | 1, 0.01, 10000, 5 | chain tuning |

Everything else is fixed by Kiln (wind, drag, inertia, solver rate and so on). The `ModelPhysics` sample in the Kiln
repository shows the banner and the pendant.

**From Blender.** `tools/modelcook/blender/kiln_physics_export.py` writes a model's entry from what you painted: a vertex
group `pin` on the cloth mesh and the bone names of each chain, and exports the glTF so the ids match.

## On a creature's body

A creature's body of your own ([Creature blocks](/kiln/wiki/blocks)) carries the same entries as `cloth` and `chains` (a model's
physics come from one place: a body or `physics.json`, never both). Written as C# records:

```csharp
new BodyBlock
{
    Model = "models/caped.glb",
    Cloth = [new ModelClothBlock { Mesh = 0, Primitive = 1, Pin = [1, 1, 1, 0, 0, 0], MassKg = 0.8,
                                   Colliders = [new ClothCapsuleBlock(new(0, 1.2, 0.1, 0.15, "spine"), new(0, 0.7, 0.1, 0.12, "spine"))] }],
    Chains = [new ModelChainBlock { RootJoint = "tail_0", TipJoint = "tail_3", ParticleMassKg = 0.5 }],
}
```

The cook reads bodies from `blocks/*.json` only: a body that carries cloth or chains is refused at `Define` unless its model
was cooked with exactly these, so build the mod again after changing them. Keep the body's scale unset or 1. A game body keeps its own
physics (`Cloth` and `Chains` are refused there). A roster NPC's [authored body](/kiln/wiki/survivors#a-body-of-your-own)
has a boot build of its own: writing cloth or chains for it is not evidence that the body is built or drawn yet.

## What the cook checks

Each refusal names the field.

- **Cloth:** every triangle has an area, a face appears once (no back faces), an edge is in at most two triangles, and every
  connected piece has a pinned particle. At most 65,535 particles per cloth mesh and 255 cloth meshes per model. A model with
  cloth has one LOD, scale 1 and no morph target on a cloth primitive.
- **Chains** need a skeleton of the mod's own: the game's skeletons, the player's too, are moved by the game's animations,
  so none of their joints can swing. The root's parent stays animated, a chain has 2 to 8 joints, no joint swings in two
  chains, nothing hangs below a swinging joint, and **no clip of the skeleton animates a swinging joint**.
- A cloth vertex may not be weighted to a swinging joint.
- Not written: sleeves, simulated morph targets, per-vertex stiffness, a second cloth LOD, scaled physics.

**The fabric is Kiln's own, not the game's cooker.** Every triangle edge is a distance constraint, each particle is
tethered to its nearest pinned one, and the mass is spread by area. It may hang stiffer or looser than the game's own
cloth. A game update that moves the game's cloth or chain types makes the cook refuse physics for that build; models
without physics cook as before.
