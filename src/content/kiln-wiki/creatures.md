---
title: "Creatures"
description: "Change one creature, make variants like an Elite Vukah, swap them into natural spawns, and give orders."
status: "works"
updated: "2026-11-07"
---

This runs on the server, so players without Kiln see the results. For a creature of your own with its AI and rules,
use a [`CreatureBlock`](/kiln/wiki/blocks#creatures-and-npcs); for who it fights and what it does in a fight, see
[Creature AI and behaviour](/kiln/wiki/creature-ai).

<!-- shot: elite-vukah | An Elite Vukah next to a normal one -->

## One creature

```csharp
CreatureRef c = Creatures.Of(entity);
c.Level = 20;                              // health follows
c.Faction = Faction.PlayerAlly;
c.Scale = 1.4f;
c.Resistance[DamageKind.Fire] = 0.5f;      // 1 = normal, 0 = immune
c.SpeedFactor = 0.8f; c.DamageFactor = 1.3f; c.XpFactor = 2;
c.Ai.Set("aggroSetup.viewRange", 30);      // this creature's senses only
c.Reset();                                 // undo your mod's changes
```

`Reset()` or unloading takes your changes off. Look creatures up with `Creatures.Template("Vukah")`.

## Variants

A base creature plus changes. Spawn it, or apply it to one that exists:

```json
{ "creatures": {
    "variants": [ {
      "id": "elite_vukah", "base": "Enemy_Vukah_Melee", "name": "Elite Vukah",
      "level": 20, "scale": 1.4, "resistances": { "Fire": 0.5 } } ],
    "spawnRules": [ {
      "replace": "Enemy_Vukah_Melee", "with": "elite_vukah", "chance": 0.2, "night": true } ] } }
```

```csharp
CreatureVariants.Register(new CreatureVariant {
    Id = "frost_vukah", Base = "Enemy_Vukah_Melee", Level = 15 });
EntityId e = await Creatures.Spawn("frost_vukah", position);
CreatureVariants.AddSpawnRule(new CreatureSpawnRule(
    "Enemy_Vukah_Melee", "frost_vukah", Chance: 0.2, NightOnly: true));
```

A spawn rule turns some of the game's spawns into your variant (works on a test server; not yet confirmed with a player).
Players without Kiln see the base creature with the new level, size, faction and behaviour. For its own permanent name,
base it on a [template clone](/kiln/wiki/game-data) and set `"clients": "kiln"`.

## Orders

```csharp
c.Command.Guard(player);                  // follow and defend
c.Command.Attack(target);
c.Command.Stay();
c.Command.MoveTo(position);
```

A guard follows, catches up when stuck or behind, and goes after whoever hurts the player. `Creatures.GuardOrders` lists them.
Following works with a real player; defending passes on a test server and is still being checked.

`CreatureStateEvent` and `CreatureTargetEvent` let you watch behaviour. They don't cancel.

## Admin commands

Call `CreatureAdminCommands.Register()` for `/creature near`, `inspect <entity>`, `set <entity> <field> <value>`,
`spawn <variant or template>`, `cmd <entity> guard` and `reset <entity>`. The admin **Creatures** page has the same as a form.

## Saved or not

Most creatures aren't saved: they respawn, and your changes last the session. For ones the game saves (villagers, tamed
animals), set `Persist` on the variant.
