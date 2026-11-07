---
title: "3D models"
description: "Give an item a new mesh, or a new item its own model: model in Blender, ship glTF and a recipe, cook on the player's machine."
status: "partial"
updated: "2026-11-07"
---

> **Partly built.** Rigid weapon models work in game. Skinned models, worn looks and animations cook from glTF and run on a
> test server, but aren't yet confirmed in the game.

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
model's vertex format. Later the launcher will cook at install time.

## A new item with its own model

1. In `cook.json`, add a model with a new, fixed GUID, and a visual template copied from the base item.
2. Define the item in a data pack ([New items](/kiln/wiki/new-items)) and point its references at those GUIDs.
3. Render an icon with Kiln's `render-icon.py`.

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

