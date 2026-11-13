---
title: "3D models"
description: "Give an item a new mesh, or a new item its own model: model in Blender, ship glTF and a recipe, cook on the player's machine."
status: "partial"
updated: "2026-11-13"
---

> **Partly built.** Rigid weapon models work in game. Skinned models, worn looks and animations cook from glTF and run on a
> test server, but aren't yet confirmed in the game. Retargeted animations (new in 0.2.0-dev.16) are tested offline and on
> a lab server, and not yet seen drawn in the game.

Model in Blender (or anything that writes glTF 2.0). A recipe, `assets/cook.json`, turns it into the game's format on the player's
machine. Start with `kiln new model MyWeapons`.

<!-- shot: cube-sword | The ModelSample cube sword in a player's hand -->

## Ship sources and a recipe, never game data

Anything from the game (a model's base fields, material references) is named by GUID in the recipe and made on the player's machine.

```
MyWeapons/
  kiln.mod.json            side "both", clients "mod"
  MyWeapons.dll
  content/swords.json      the items, pointing at the models
  assets/
    assets.json            names the cooked files
    cook.json              the recipe
    src/frost_sword.gltf   your model
    cooked/                made on the player's machine; add to .gitignore
```

`kiln cook` reads the game read-only, writes `assets/cooked/`, and checks the result: valid ranges, materials that exist, the base
model's vertex format. Players don't run it: since 0.2.0-dev.27 their launcher cooks the mod when they press **Play**
([Mods the launcher cooks](/kiln/wiki/install#mods-the-launcher-cooks)), and a server owner runs `kiln cook` from a
release's `sdk/` folder ([Mods with a cook recipe](/kiln/wiki/dedicated-servers#mods-with-a-cook-recipe)).

Each cook records what it wrote in the game's `kiln/state/cook-receipts`. A cooked file no receipt of that game lists
(shipped inside a mod, copied in, or changed afterwards) loads with a warning for now, and a later release will refuse
it. So ship recipes and sources, never `assets/cooked`: `kiln pack` leaves it out. `kiln cook --force` cooks every recipe
again. A mod's assets are read from its own folder only: a link that leads out of it, or to another mod's cooked file,
is an error.

## A new item with its own model

1. In `cook.json`, add a model with a new, fixed GUID, and a visual template copied from the base item.
2. Define the item in a data pack ([New items](/kiln/wiki/new-items)) and point its references at those GUIDs.
3. Render an icon with Kiln's `render-icon.py`.

An [item block](/kiln/wiki/blocks#items-and-weapons) whose look has a `Model` of your own lies on the ground as that
model too (since 0.2.0-dev.27; before, it took the ground model of the item it was made like). The look's `Dropped`
names another item whose ground model it takes. Items written for earlier releases change their look on the ground with
this release unless they set `Dropped`.

The ModelSample mod has a Bronze Sword made of cubes and a Tower Sword with its own model.

## Modelling weapons

| | |
|---|---|
| Units | metres; the origin is the hand grip |
| Axes in Blender | blade up (+Z), crossguard along ±Y, flat of the blade facing ±X |
| Size | the one-handed Bronze Sword is about 1.1 m long, tip 0.94 m above the grip |
| Export | glTF with Blender's defaults, +Y up, transforms applied |
| Geometry | triangles, one primitive per material, up to 65,535 vertices each; no bones (a weapon is rigid) |
| UVs | with the base model's material, your UVs sample its textures |

## Skinned models and animations

Built, game test pending. The same `cook.json` cooks:

- **a skinned model**: a glTF with a skin, on a skeleton made from its armature or on one of the game's skeletons. Bind it
  in the rest pose; joints are matched by name.
- **animations**: clips from the glTF, new or replacing one of the game's, and a state machine that plays them, with
  blend spaces, layers, root motion and events on the timeline (a sound, a footstep).
- **worn looks**: a model on the body for armour and vanity pieces, skinned or on one joint, with an optional female
  shape.

A test server's animation engine plays cooked clips on their authored curves, and skinned vertices land within a few
millimetres of Blender's. Drawing in the game isn't confirmed yet. [Building blocks](/kiln/wiki/blocks#creatures-and-npcs)
use them for creatures with bodies of their own, and for armour and cosmetics.

## Your own creature

`kiln new body MyGolem` makes a creature from your own files: a skinned glTF (`models/creature.glb`; replace it with your
Blender export) as its body and animations, and blocks that give it an AI and an attack. `kiln build` cooks the
skeleton, clips, state machine and model on your machine. In game, `/my-golem` (admins) spawns one next to you. Players
need the mod (`clients: mod`).

From Blender: File > Export > glTF 2.0, +Y up, the armature at rest, each animation an action. Name the actions as the
blocks name the clips.

## Animations from another rig

New in 0.2.0-dev.16. Animation packs and other tools rarely use your skeleton's joint names or proportions. A clips step
(or an animation block) with `retarget` plays them anyway: name the skeleton they should play on, and pair the joints.

```json
"animations": { "golem-moves": { "clips": "models/anim-pack.glb", "skeleton": "golem",
    "retarget": { "map": { "mixamorig:Hips": "pelvis", "mixamorig:Spine": "spine", "mixamorig:Head": "head" } },
    "idle": "Idle", "walk": "Walking" } }
```

- Joints with the same name pair by themselves; `"retarget": {}` pairs by name alone. Joints with no pair keep their
  rest pose.
- Bone lengths and rest orientations may differ. The two rest poses must show the same posture (T-pose for T-pose), or
  `reference` names a frame of the pack that does.
- The hips' travel is scaled by the rigs' heights.
- It works onto a skeleton of your own and onto one of the game's (joints named `j<index>`). Without `retarget`, a clips
  file must use the skeleton's own joint names and rest pose.

Tested offline (the sample's clips on rigs with other names, turned rest frames and other sizes; 55 of the game's clips
moved to another rig and back) and on a lab server, where a creature plays retargeted clips as authored. Not yet seen
drawn in the game. Not done: foot IK after a retarget (feet can slide when leg lengths differ), and mirroring left onto
right.

