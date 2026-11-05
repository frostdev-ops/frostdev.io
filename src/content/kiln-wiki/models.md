---
title: "3D models"
description: "Give an item a new mesh, or a new item its own model: model in Blender, ship glTF and a recipe, cook on the player's machine."
status: "partial"
updated: "2026-11-04"
---

> **Partly built.** Rigid weapon models work in game. Worn armour and animations aren't built yet.

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
| Geometry | triangles, one primitive per material, up to 65,535 vertices each; no bones or morph targets yet |
| UVs | with the base model's material, your UVs sample its textures |
