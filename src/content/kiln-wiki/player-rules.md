---
title: "Player rules and creative mode"
nav: "Player rules, creative"
description: "Let players fly and build anywhere, change building costs and digging, keep health or water full, freeze the Shroud timer. /creative is one preset."
status: "works"
updated: "2026-11-07"
---

Some things the game decides for itself: where a player may fly and build, what building costs, how fast tools dig, how
long the Shroud timer lasts. A mod changes them with **rule sets**: rules for one player, for everyone, or for an area,
for a while or until stopped. Kiln combines every rule set that applies to a player. `/creative` is one preset of these
rules.

## Creative mode

`/creative` in chat toggles creative mode for yourself; `/creative on|off <player>` sets it for someone else;
`/creative status` lists who has it. Admins only. In a world you host, you're the admin.

It works on a dedicated server, in a co-op world a game hosts, and in a world played offline (offline has no chat: put
the line in a console file, `kiln/control/console/<name>.cmd` in the game folder).

What it gives:

- the game's building fly mode anywhere; you land where the flight ends
- building outside bases, in no-build zones, near enemies and in the Shroud
- free building (dismantling gives nothing back); tools that break blocks and terrain in one hit
- no damage; health, stamina, mana and water containers kept full
- the Shroud timer frozen
- gliding like a plane: no stamina, level flight holds altitude, look up to climb and down to dive, hold Shift to push
  along (up to 35 m/s)

It grants no levels, experience, skill points or unlocks, and other players' bases stay theirs. It ends with
`/creative off`, when the player leaves or when the world closes; builds placed outside bases stay in the save. The
player needs Kiln on their game. To change what it gives on a server, edit `rules/creative.json` in the server's Kiln
config folder.

## Rules from a mod

Add `<KilnServices>Rules</KilnServices>` to the project.

```csharp
// one player, until disposed (or the mod unloads, or the player leaves)
RuleSet fly = Rules.Apply(player, new PlayerRules { FlyAnywhere = true });
fly.Dispose();

// everyone, for a weekend: half-cost building
Rules.Apply(RuleScope.Everyone, new PlayerRules { BuildCost = 0.5, BuildRefund = 0.5 }, TimeSpan.FromDays(2), "half-cost weekend");

// an area: no stamina drain in your base
Rules.Apply(RuleScope.Cylinder(baseCenter, 40, baseCenter.Y - 20, baseCenter.Y + 60), new PlayerRules { MinStamina = 1 });

// a potion: 60 seconds of flight for whoever drinks it
[Subscribe] void OnDrink(PlayerConsumedEvent e)
{
    if (e.Item.Id == FlightPotion) Rules.Apply(e.Player.Entity, new PlayerRules { FlyAnywhere = true }, TimeSpan.FromSeconds(60));
}

// creative mode from code
Creative.Set(player, true);
```

| Rule | What |
|---|---|
| `FlyAnywhere` | the building fly mode outside bases, without its unlock |
| `BuildOutsideBases`, `IgnoreNoBuildZones`, `IgnoreEnemiesNearby`, `BuildInShroud` | lift that building refusal |
| `IgnoreBasePermissions` | build in other players' bases; only if the server allows it |
| `BuildCost`, `BuildRefund` | multipliers: 0 is free |
| `DigDamage` | multiplier for tools on terrain and blocks |
| `Invulnerable` | no damage from hits |
| `MinHealth`, `MinStamina`, `MinMana` | kept at least this full, 0 to 1 |
| `FreezeShroudTimer`, `MinShroudTime` | the Shroud timer held, or kept above a share |
| `UnlimitedGliding`, `GlideSink`, `GlideBoost` | gliding with no stamina, a slower sink, plane-like flight |
| `Water` | water containers refilled: `WaterRule.KeepFull(items)` or `WaterRule.Rate(chargesPerSecond, items)` |

**How rule sets combine.** A switch is on if any rule set turns it on, unless one says `false`: a denial wins, so an arena
that bans flight beats creative mode. Multipliers multiply. Floors take the highest. Then the server's limits apply.

A rule set belongs to the mod that applied it and ends when that mod unloads. Rules aren't saved: a restart starts from
the game's rules. `Rules.Of(player)` says what applies now; `PlayerRulesChangedEvent` says when it changes.

**Presets** are rules as JSON in the server's `rules/` config folder; `Rules.Apply(player, Rules.Preset("easy-farming")!)`.

```jsonc
// rules/easy-farming.json
{ "water": { "chargesPerSecond": 2, "items": ["Tool_T1_WateringCan"] }, "digDamage": 3, "minStamina": 0.5 }
```

## Server limits

`rules.json` in the server's Kiln config folder caps what any mod may give: `allowFlyAnywhere`, `allowBuildOutsideBases`,
`allowInvulnerable`, `allowIgnoreBasePermissions` (off by default), `minBuildCost`, `maxDigDamage`, `maxGlideSpeed` and
more. Edits apply within a second.

## Who needs what

Costs, digging, vitals, the Shroud timer and water are the server's: they work for every player. Flying, building
outside bases and gliding need Kiln on the player's game too, because the game predicts them there; a player without it
isn't given those rules.

## Water in containers

`Items.Fuel` (service Items) reads and changes the water in cans, pouches, barrels and wells, through the game's own
write, so the save keeps it:

```csharp
FuelLevel? w = Items.Fuel.Read(can);                        // units and charges, or null: it holds no water
await Items.Fuel.Fill(barrel);
using FuelKeep keep = Items.Fuel.KeepFull(player, canItem); // full every step, until disposed
```

Watering cans and pouches of your own: [Building blocks](/kiln/wiki/blocks#items-and-weapons).
