---
title: "Game data"
description: "Tune spells, creatures, attacks, buffs, perks and skill nodes with data packs, and clone them into new ones."
status: "works"
updated: "2026-11-05"
---

Same rules as items: changes belong to your mod, come off when it unloads, and reach Kiln players through the server. They
go in the same `content/*.json` files.

| Section | Holds |
|---|---|
| `templates` | creatures, projectiles, explosions: size, level, senses, colliders, lifetime |
| `arsenals` | enemies' attacks and when they use them |
| `sequences` | timed actions: when a cast fires, when its cost is paid |
| `buffs` | duration, effects |
| `perks` | damage bonuses, armour effects |
| `skills` | skill-tree nodes: cost, levels, values |
| `items` | also the values items pass to spells: mana cost, stamina cost, damage |

```json
{ "format": 1,
  "items": {
    "Ammo_T1_Spell_Fire_Ball_lvl10": { "impactValues.ManaCost": 30 },
    "Ability_DoubleJump": { "impactValues.StaminaCost": 5 } },
  "templates": {
    "Explosion_Player_Spell_Fireball_1": {
      "ColliderResourceComponent.colliders[0].dataArray[0].shape.radius": { "mul": 1.5 } },
    "Enemy_Vukah_*": { "@where": { "Faction.faction": "Vukah" },
                       "Enemy01BehaviorState.aggroSetup.viewRange": { "mul": 1.5 } } },
  "perks": { "Perk_Damage_Ice": {
      "damageModifier.distribution.magicalIceDamage": { "mul": 2 } } },
  "skills": { "item:Ability_DoubleJump": { "costs": 1 } } }
```

Paths use the game's field names. Template paths start with the component's name. `[i]` picks a list element, `[*]` all of
them. Find them with `kiln catalog search` or the admin **Game data** page.

## When a change shows

| Data | Takes effect |
|---|---|
| creature behaviour, attacks, colliders | at once, for every creature of that kind |
| level, size, lifetime | the next spawn |
| spell values (damage, radius, buff) | the next cast |
| costs | the next payment |
| cast timing | the next time the action plays |
| skill node costs | the next unlock |

The server decides, so players without Kiln play along. Their tooltips and some timings may show the game's values.

## Clones

A `templates` change is global. For one creature, use [Creatures](/kiln/wiki/creatures). For a new kind with its own name
and values, clone it:

```json
"templates": { "add": [ {
  "guid": "6b1e0c52-93a4-4f7e-b2d8-1c5a7e9f3d40",
  "name": "MyMod_Elite_Vukah",
  "base": "Enemy_Vukah_Melee",
  "fields": { "Level.dataStorage[0]": 20, "ScaleComponent.uniformScale": 1.4 } } ] }
```

Spawn it by name. `perks` and `buffs` take clones too, with names per language. A cloned perk has applied a cloned buff on hit
in a real game, joined, with the mod on both sides. A perk runs only once its enhancement is unlocked: the game's rule. Not checked
yet: Kiln players without the mod.

Players' games must know clones: set `"clients": "kiln"`.

## From code

`Content.Templates`, `Arsenals`, `Sequences`, `Buffs`, `Perks` and `Skills` work like `Content.Items`: get an entry, read or
set a path, reset it.
