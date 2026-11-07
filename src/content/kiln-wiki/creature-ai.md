---
title: "Creature AI and behaviour"
nav: "Creature AI"
description: "Who a creature fights, how it sees, hears, roams and flees, and rules that heal, summon, cast and apply statuses in a fight."
status: "pending"
updated: "2026-11-07"
---

> **New in 0.2.0-dev.16, not yet seen in the game.** Tested on a lab server without players: creatures find, ignore and
> hunt each other through the game's own targeting with Kiln's answers in it, and rules summon, cast and heal. Nobody has
> watched it in a real game yet.

A [`CreatureBlock`](/kiln/wiki/blocks#creatures-and-npcs) has an AI (how it notices, chases, wanders and runs, and who
it treats as an enemy) and a behaviour (rules on top of the game's combat). Both run on the server, so on a game body
players without Kiln watch the result.

```csharp
Blocks.Define("warden", new CreatureBlock
{
    Body = Bodies.Vukah,
    AI = AIs.Vukah with
    {
        NightSight = 0.5,
        Flee = new FleeBlock { Below = 0.25, Min = 12, Max = 24, Seconds = 6 },
        Relations = new Dictionary<Faction, Relation> { [Faction.Player] = Relation.Neutral, [Faction.Scavenger] = Relation.Hostile },
    },
    Behaviour = Behaviours.VukahMelee with
    {
        Rules = [new RuleBlock { Every = 10, Chance = 0.3, When = [Is.HealthBelow(0.5), Is.SummonsBelow(2)],
                                 Do = [Act.Summon("Enemy_Vukah_Melee", 2), Act.Heal(0.1)] }],
    },
});
```

Below half health, every 10 seconds, 30% of the time, this warden calls two helpers and heals a little. It ignores
players and hunts Scavengers. The `CreatureAi` sample in the Kiln repository has a feud between Vukahs and Scavengers,
this warden, a caller written in JSON that summons and throws ice, and a ranger on the players' side.

## Who fights whom

The game decides by faction whether one creature fights another. Kiln lets you change that in three ways, most specific
first:

| Way | Applies to | Example |
|---|---|---|
| `SenseFilter` | one creature, about one creature or player | `(npc, other) => !Friends.Contains(other)` |
| `Relations` | one creature, about a faction | `{ [Faction.Vukah] = Relation.Hostile }` |
| `Factions.Relate` | every creature of a faction: the world's table | `Factions.Relate(Faction.Vukah, Faction.Scavenger, Relation.Hostile)` |

A relation is `Hostile` (fights), `Friendly` (on its side: helps, doesn't fight), `Neutral` (ignores) or `Game` (the
game's own answer). A creature's relations and filter are its own view: a Scavenger still fights a creature that is
neutral to Scavengers, unless the world's table or the Scavenger's own block says otherwise.

- A sense filter runs on the tick thread every `SenseEvery` seconds (0.5 by default), for up to 256 others nearby.
  `false` makes it ignore that one until it asks again. Keep it short. One that throws is turned off for that creature.
  In JSON, name it (`"senseFilter": "tokens"`) and register it in `OnLoad` with `Blocks.SenseFilter("tokens", ...)`.
- `Factions.Reset()` gives back what your mod set in the world's table, and it all goes when the mod unloads. Two mods
  on one pair: the last to set it wins.
- A fighter on the players' side is a creature block with `Faction = Faction.PlayerAlly`. A villager from an
  [`NpcBlock`](/kiln/wiki/npcs) has no combat AI to change.
- If a game update moves the game's faction checks, Kiln leaves the game's answers in place and says so in its log.

## AI fields

An AI starts from a game creature's tuning (`AIs.Vukah`, `AIs.Scavenger`, `AIs.Heavy`, `AIs.Still`). Each creature of
the block gets its own copy of the values, so the game's other creatures stay as they are. In `blocks/*.json` the same
names are camelCase.

| Field | What it does |
|---|---|
| `Sight`, `SightAngle`, `Aggro`, `Leash` | how far it sees by day, half its view cone, how close a seen target is engaged at once, its home zone's radius |
| `NightSight` | share of `Sight` at night, 0 to 4 |
| `Hears`, `Hearing` | reacts to noise at all; share of the game's noise ranges |
| `Threat` | how much it draws enemies' attention, 1 as the game has it |
| `Roam { Min, Max, FromHome }` | wanders while idle |
| `Flee { Below, Min, Max, Seconds }` | runs from a fight below a share of its health, as far and as long as said |
| `ReturnsHome = false` | never walks home after a fight |
| `CallsForHelp`, `HelpRadius` | calls the friends around it into its fights |
| `Enable`, `Disable` | the game's feature switches (`EnemyFeatures.Prowl`, `Circling`, ...) |
| `Faction`, `Relations`, `SenseFilter`, `SenseEvery` | its side, and its view of others (above) |
| `Tune` | any other game field by path; wins over the fields above |

## Rules

`RuleBlock { On, Every, Cooldown, Chance, When, Do }` goes into the game's own rule list, so the game decides when it
runs. A rule can mix the game's conditions and actions with Kiln's.

| Kind | Conditions | Actions |
|---|---|---|
| The game's own | `Is.HealthBelow`, `Is.TargetWithin`, `Is.InCombat`, `Is.InState`, `Is.HasTarget`, `Is.TargetIsPlayer`, `Is.TargetHealthBelow`, `Is.HitWithin`, `Is.Chance`, `Is.TargetAtHome` | `Act.Flee`, `Act.BackOff`, `Act.Play`, `Act.Immune`, `Act.Pause`, `Act.EnableFeature`, `Act.DisableFeature`, `Act.SetPhase`, `Act.Attack` |
| Kiln's, reading the world | `Is.EnemiesNear(count, metres)`, `Is.AlliesNear(count, metres)`, `Is.SummonsBelow(n)` | |
| Kiln's, changing the world | | `Act.Summon`, `Act.Cast`, `Act.Heal`, `Act.Apply`, `Act.Effect`, `Act.Custom` |

- **Summon** puts a creature block, a variant or a game creature around it, on its side and after its target.
  `seconds` removes them after that long.
- **Cast** fires a delivery, such as a projectile, from where it stands at its target, without an animation. For a
  cast with an animation, give the creature an attack with that delivery and use `Act.Attack`.
- **Heal** takes a share of its health (`Act.Heal(0.1)`); **Apply** puts a status on it or its target.

Kiln's conditions are checked every half second on the tick thread. Its actions run on the tick thread in the next
step. JSON takes the same: `{ "summonsBelow": 2 }`, `{ "summon": { "creature": "imp", "count": 2 } }`,
`{ "cast": { "type": "projectile", "speed": 25, "onHit": [ ... ] } }`, `{ "heal": 0.1 }`, `{ "flee": true }`.

## Limits

So summons can't run away:

| What | At most |
|---|---|
| Living or pending summons | 16 per creature, 128 per mod, 256 in all |
| Summon generations | 3 (a summon may call helpers, theirs may too, and that's it) |
| Queued actions | 4 per creature, 64 per tick; more are dropped |
| A summon's radius and lifetime | 200 m, one day |

These hold even without an `Is.SummonsBelow` condition. Use `Every` and `Cooldown` for pacing.

## Mistakes

Refused with the block and the field: `block creature warden, ai.flee.below: 2 is outside 0..1`,
`behaviour.rules[0].do[0].summon: count 99 is outside 1..16`. `kiln lint` checks the AI and rules against the schema.
