---
title: "Player rules and creative mode"
nav: "Player rules, creative"
description: "Let players fly and build anywhere, fly through walls with NoClip, change building costs and digging, keep health or water full, freeze the Shroud timer. /creative is one preset."
status: "works"
updated: "2026-11-13"
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
- a steered glider (new in dev.24): no stamina and no gravity; S raises the glider's nose (up to 85 degrees), letting go
  holds the pitch, W lowers it as in the game, and Shift speeds it up along the nose (up to 35 m/s). An analog stick
  steers in proportion. A player whose Kiln is older, or whose controls use the game's other pitch mode, glides as
  before: like a plane, S climbs and W dives along a path, and letting go settles into a normal glide

It grants no levels, experience, skill points or unlocks, and other players' bases stay theirs. It ends with
`/creative off`, when the player leaves or when the world closes; builds placed outside bases stay in the save. The
player needs Kiln on their game. To change what it gives on a server, edit `rules/creative.json` in the server's Kiln
config folder.

**The steered glider's rule.** It is `glideSteer` in `rules/creative.json`; the file's header says how to switch it off
(`"glideSteer": null`, or delete its `glideSteer` block: the glide is then the plane-like one). `"allowGlideSteer": false`
in the server's `rules.json` switches it off for every player. `/creative` tells a player when their game cannot steer.
The steered glider with an analog stick, with the game's other pitch mode, and another player's steered glider seen
from a second game are not checked in a game yet.

## NoClip

`/noclip` lets an admin fly through the ground, walls, building blocks and props. Asked for on GitHub (issue 25), new in
0.2.0-dev.27.

| Command | Does |
|---|---|
| `/noclip` | switches it for yourself |
| `/noclip on\|off <player>` | for someone else |
| `/noclip status` | whether it works here, whether the server allows it, and who has it |

- **Off until the server allows it.** Set `"allowNoClip": true` in `kiln/config/rules.json` of the server (for a world
  you host, of your game folder). It needs the Admin level or the permission node `kiln.command.noclip`.
- **The player's game needs this release too.** A player without Kiln, or with an older Kiln, never gets it.
- It flies as character flight does: jump climbs, sneak sinks, sprint is faster. It takes off at once, also from the
  ground and from water, and never lands. It grants nothing else: no invulnerability.
- It ends when you die or teleport; ask for it again after. Turned off inside something, you are first put back at the
  last place where you were in open space, and only then does collision return.

Limits: it was tried in one real game (a hosting game on Linux and Proton), switching on and off. It doesn't work while
the Creative Mode mod runs, which flies the character itself; `/noclip status` says so. Inside a prop (a rock, a chest)
the game's own collision decides. A player who leaves the game while inside the ground is saved there; the game's
**Unstuck** frees the character.

From a mod: `PlayerRules.NoClip` is a rule like the others (`NoClip = true` in a rule set), and `NoClip.Set(player, on)`
is Kiln's own switch for a player, with a result (`Ok`, `On`, `Reason`, a message). `NoClip.Of(player)` says how it
stands, `NoClip.Available` and the capability `rules.noclip` whether this game build can do it, and
`PlayerNoClipEndedEvent` why it ended (`RuleEnded`, `Death`, `Teleport`).

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
| `GlideSteer` | the glider's nose follows the movement keys: S raises it (up to `MaxClimbAngle` degrees, 85), a centred stick holds the pitch, W dives as in the game. Only for a player whose game confirms it steers too; others glide as before |
| `NoClip` | flies through terrain, building blocks and props ([NoClip](#noclip)); only if the server allows it |
| `Water` | water containers refilled: `WaterRule.KeepFull(items)` or `WaterRule.Rate(chargesPerSecond, items)` |

**How rule sets combine.** A switch is on if any rule set turns it on, unless one says `false`: a denial wins, so an arena
that bans flight beats creative mode. Multipliers multiply. Floors take the highest. Then the server's limits apply.

A rule set belongs to the mod that applied it and ends when that mod unloads. Rules aren't saved: a restart starts from
the game's rules. `Rules.Of(player)` says what applies now, also right after `RuleSet.Update` (since 0.2.0-dev.27);
`PlayerRulesChangedEvent` says when it changes.

**Presets** are rules as JSON in the server's `rules/` config folder; `Rules.Apply(player, Rules.Preset("easy-farming")!)`.

```jsonc
// rules/easy-farming.json
{ "water": { "chargesPerSecond": 2, "items": ["Tool_T1_WateringCan"] }, "digDamage": 3, "minStamina": 0.5 }
```

## Server limits

`rules.json` in the server's Kiln config folder caps what any mod may give: `allowFlyAnywhere`, `allowBuildOutsideBases`,
`allowInvulnerable`, `allowIgnoreBasePermissions` (off by default), `minBuildCost`, `maxDigDamage`, `maxGlideSpeed`,
`allowGlideSteer` (on by default), `maxGlideSteerAngle` (0 to 85 degrees), `allowNoClip` (off by default) and more. Edits apply within a second.

## Who needs what

Costs, digging, vitals, the Shroud timer and water are the server's: they work for every player. Flying, NoClip, building
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

A [tracked world write](/kiln/wiki/world-programs#tracked-writes-from-the-tick-thread) to a container's `Fuel` is
written over while a refill (`KeepFull`, or a player's `Water` rule such as creative mode's) covers it: end or narrow
the refill first. The write's result names the refill (`WrittenOverBy`).

Watering cans and pouches of your own: [Building blocks](/kiln/wiki/blocks#items-and-weapons).
