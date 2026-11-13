---
title: "Talents"
description: "Add nodes to the game's own skill tree, or give your mod a whole talent tree of its own."
status: "works"
updated: "2026-11-13"
---

> **Two fixes await a client retest:** keeping unlocks when a mod list moves a node, and German labels on a Kiln tree's screen. A Kiln
> tree's respec has no game result yet.

Two ways, both in `skills/*.json`, both with `"side": "both"` and `"clients": "mod"`, because the game builds the same tree
from the same files. Start with `kiln new talents MyTalents`.

| | The game's tree | A Kiln tree |
|---|---|---|
| Drawn by | the game's skill screen | a Kiln screen in the game's look, from the pause menu or a key |
| Paid with | the game's skill points | its own points, or a share of the game's |
| Effects | run by the game | attributes, buffs, game-node effects, programs, abilities, code |

## Nodes in the game's tree

<!-- shot: game-tree-nodes | New nodes in the game's skill tree -->

```json
{ "format": 1,
  "gameTree": { "nodes": [
    { "guid": "3e2f6a1b-7c48-4d95-a1e3-5b9c0d7e8f21", "name": "mymod_ember_ward",
      "class": "Mage", "like": "0xcfa5985b", "from": ["0xcfa5985b"], "offset": [170, -40],
      "cost": 1, "configs": { "0x0a0c87e7": 2 },
      "texts": { "en": { "name": "Ember Ward", "description": "+2 Intelligence." },
                 "de": { "name": "Glutwehr" } } } ] } }
```

- `guid` is fixed forever: saves keep the node's id.
- `like` copies a node's effect, values, icons and texts. `configs` and `scales` change its number values. Write `texts` for what
  that node does: `0xcfa5985b` raises Intelligence.
- `from` and `to` are links. `position`, or `near` + `offset`, place it.
- `cost` is per level. `maxLevel` is 0 (one unlock) to 7.
- Also `program`, `iconFile`, `unlocksAbility`. From code: `GameTree.Define(...)`. Since 0.2.0-dev.27 Kiln.Sdk
  [bakes](/kiln/wiki/dev-kit#definitions-baked-at-build) such nodes into the mod at build, so they count from the first
  start; with `KilnBake=false`, a dedicated server counts them from the next start.

The game's tree has room for only a few more nodes. Past that, Kiln keeps the extras in a shadow table (up to 4096 in all). The
screen shows them and the game's rules apply, but they stay out of the character save, so a character stays valid on servers
without Kiln.

Adding a mod can move a node between the game's tree and the shadow table. It no longer undoes the unlock: both directions keep
it and its level. If the game's rules refuse a node moving back, its points come back and `kiln.log` warns.

Remove a mod and its nodes are taken out and refunded at the next join. On a server without Kiln, the game resets the whole
tree instead if the save holds Kiln nodes.

## A Kiln tree

<!-- shot: ember-arts | The Ember Arts talent screen -->

```json
{ "format": 1, "trees": [ {
  "id": "mymod:ember", "name": { "en": "Ember Arts", "de": "Glutkünste" },
  "points": { "start": 1, "perLevel": 1 },
  "menu": { "en": "Ember Arts" }, "key": "K", "respec": true,
  "nodes": [
    { "id": "kindle", "name": { "en": "Kindle" },
      "description": { "en": "+1 Intelligence per level." },
      "col": 1, "row": 0, "cost": 1, "maxLevel": 3, "icon": "icons/kindle.png",
      "effects": [ { "attribute": "Intelligence", "amount": 1 } ] },
    { "id": "step", "name": { "en": "Flame Step" }, "col": 1, "row": 2,
      "requires": ["kindle"], "pointsSpent": 3, "level": 10,
      "effects": [ { "buff": "MyMod_Warmth", "refresh": 30 },
                   { "ability": "mymod:flame-step" } ] } ] } ] }
```

A data-only mod needs no code. A node's `id` is its save key: never change it. `col` and `row` run 0 to 31, levels to 99.
`requires` needs any one node, or all with `requireAll`. `pointsSpent` and `level` make tiers.

| Effect | Runs while the node is taken |
|---|---|
| `{"attribute": "Strength", "amount": n}` | n × level on any of the six attributes |
| `{"gameNode": "0x<id>"}` | that game node's effect, without unlocking it |
| `{"program": "<guid>", "configs": {...}}` | any Impact program on the player |
| `{"buff": "<GUID or clone>", "refresh": s}` | a buff, renewed; ends within refresh + 5 s of a lock |
| `{"ability": "<id>"}` | a Kiln ability only holders may cast |
| `TalentEffect.Callback(apply, remove)` | your C#, on the tick thread |

`points` is `{"start", "perLevel"}`, or `{"share": 0.5}` for half the game's total (its tree keeps its own), or
`TalentPoints.Custom(f)`.

Unlocks are per character, and [follow the character](/kiln/wiki/multiplayer#per-character-progress) to other worlds. A lock is
refused while another taken node needs it. Respec is free unless turned off.

The tree's key opens it during play only, so typing in chat doesn't trigger it. In a game hosted offline the pause menu stops the
world: the screen shows a change at once, and it applies when you resume.

In chat: `/talents`, `/talents <tree>`, `/talents <tree> unlock|lock <node>`, `/talents <tree> respec`. Admins:
`/talents <tree> grant <points> [player]`.

## From code

```csharp
Skills.Register(new TalentTree
{
    Id = "mymod:talents", Name = UiText.Of(("en", "Talents"), ("de", "Talente")),
    Points = TalentPoints.Own(start: 1, perLevel: 1),
    MenuEntry = "Talents", Key = "K",
    Nodes = [ new TalentNode { Id = "a", Name = "Strong", Column = 0, Row = 0,
        Effects = [TalentEffect.Attribute(TalentAttributes.Strength, 2)] } ],
});

var h = Skills.HolderOf(player);            // server, tick thread
Skills.Unlock("mymod:talents", "a", h);     // also Lock, Respec, Grant, Points, State

[Subscribe]
void OnUnlocking(TalentUnlockingEvent e) { if (TooSoon()) { e.Reason = "not yet"; e.Cancel(); } }
```
