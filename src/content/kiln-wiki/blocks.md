---
title: "Building blocks"
description: "Say what you mean: a spell, a sword, a potion, a status, a creature. Kiln picks the game data, the ids and the programs."
status: "works"
updated: "2026-11-07"
---

> **Works** since 0.2.0-dev.14: on test servers, and much of it seen in the game (spells, abilities, items, creature rules,
> VFX). A few things are open in the game; see [What works today](/kiln/wiki/status).

A block is one thing your mod adds, said in its own terms: a spell with a mana cost and a projectile, a sword with a level
and an on-hit effect, a status that ticks. Kiln chooses which game entry to start from, derives the ids from your mod id and
the block's name, writes the [Impact programs](/kiln/wiki/impact), fills in the tooltip and works out what players' games
need. There's no `base` to name and no GUID to write.

The older ways still work and stay there for what blocks don't cover yet: [new items](/kiln/wiki/new-items) by clone,
[game data](/kiln/wiki/game-data) and string paths.

## Setup

In the mod project:

```xml
<KilnServices>Blocks</KilnServices>
```

Or start from a template: `kiln new spell MySpells`. The samples `FrostboltBlock`, `ItemBlocks`, `AbilityBlocks`,
`CreatureBlocks` and `StationBlocks` in the Kiln repository show every block below.

## C# or JSON

`Blocks.Define(name, block)` in `OnLoad`, or the same object in `blocks/*.json`. Both make the same thing with the same ids.

```csharp
var chilled = Blocks.Define("chilled", new StatusBlock
{
    Name = "Chilled", Seconds = 8, TickEvery = 2, Look = StatusLook.Frost,
    OnTick = [new EffectBlock { Damage = Damage.Ice(3), Flinch = Flinch.None }],
    Modifies = { [Stat.MoveSpeed] = -0.5 },
});

var burst = Blocks.Define("frost-burst", new EffectBlock { Damage = Damage.Ice(40), Knockback = Knockback.Small, Applies = chilled });

Blocks.Define("frostbolt", new SpellBlock
{
    Name = "Frostbolt",
    Cast = new CastBlock { ManaCost = 30 },
    Delivery = new ProjectileBlock { Speed = 30, OnImpact = [new EffectBlock { Area = new AreaBlock { Radius = 3, Effects = [burst] } }] },
    Recipe = new RecipeBlock { Makes = 10, Needs = { [GameItems.Material_T1_Twigs] = 2 } },
});
```

```jsonc
{ "format": 1,
  "statuses": { "chilled": { "name": "Chilled", "seconds": 8, "tickEvery": 2, "look": "frost",
      "onTick": [ { "damage": { "ice": 3 }, "flinch": "none" } ], "modifies": { "move-speed": -0.5 } } },
  "effects": { "frost-burst": { "damage": { "ice": 40 }, "knockback": "small", "applies": "chilled" } },
  "spells": { "frostbolt": { "name": "Frostbolt", "cast": { "manaCost": 30 },
      "delivery": { "type": "projectile", "speed": 30, "onImpact": [ { "area": { "radius": 3, "effects": [ "frost-burst" ] } } ] },
      "recipe": { "makes": 10, "needs": { "Material_T1_Twigs": 2 } } } } }
```

The JSON schema gives VS Code completion and errors. A field that takes a block takes it inline, as what `Define`
returned, or by name: a block of this mod, or `"other-mod:name"`.

For comparison, the same spell without blocks was a cloned ammo item, a cloned buff, two cloned templates, a recipe, five
hand-made GUIDs and a dozen game field paths.

## The blocks

| Block | What it makes | More |
|---|---|---|
| `EffectBlock` | What happens: damage, heal, restore or drain mana and stamina, apply or remove a status, knockback, an area, a spawn, a sound, a VFX, a chance, more effects after | below |
| `StatusBlock` | A buff or debuff: time, look, effects on apply, every tick and on expiry, stats it changes while it runs | below |
| `SpellBlock` | A staff spell: an ammo item with a cast, a delivery and a recipe | [Abilities](/kiln/wiki/abilities) |
| `WandBlock` | A wand whose primary, heavy and special attacks are spells, with no ammo | |
| Deliveries | How it gets there: projectile (with homing), self, around, cone, beam, zone, chain, summon | |
| `AbilityBlock` | Cast on a key, a chat command, an item, or from code; costs and cooldown | [Abilities](/kiln/wiki/abilities) |
| `PerkBlock` | An enhancement on an item: stat changes, on-hit, on-kill, on-hit-taken | |
| `TalentBlock`, `TalentTreeBlock` | A node in the game's skill tree, or a tree of your own | [Talents](/kiln/wiki/talents) |
| `TriggerBlock` | Effects when a player enters a state or does something: sits, glides, eats; can stop the action | |
| `ItemBlock` | Material, potion, food, arrow, axe or pickaxe, watering can or water pouch | [New items](/kiln/wiki/new-items) |
| `WeaponBlock` | A weapon of one of 11 classes, with exact tooltip numbers | |
| `ArmorBlock`, `CosmeticBlock` | Armour by slot and set; a vanity piece | [3D models](/kiln/wiki/models) |
| `RecipeBlock`, `LootBlock` | Where it's made and from what; where it drops | |
| `StationBlock`, props, furniture | Things players place: a station with its own recipes, a rack, a chair | |
| Building materials, shapes, terrain | New building blocks and shapes for the hammer | |
| `CreatureBlock` | A creature: body, animation, AI, behaviour, stats, spawns | [Creatures](/kiln/wiki/creatures) |
| `NpcBlock` | A friendly NPC: body, talk, wares, roster place | [Friendly NPCs](/kiln/wiki/npcs) |
| `VfxBlock` | Particles and a light, from nothing | below |

Sounds a block plays are your cues from [Sounds and voice](/kiln/wiki/sounds), named in an effect's `Sound`.

## Effects

An effect is what happens. It has no game entry of its own: it becomes part of the program of whatever triggers it, so
the same effect works on a spell, a weapon, a status or a talent.

| Part | What it does |
|---|---|
| `Chance` | 0 to 1: the whole effect happens this often |
| `On` | `EffectOn.Target` (default) or `EffectOn.Caster`: who cast or who wields |
| `Area` | everyone in `Radius` metres gets `Effects`; enemies, or friends with `Affects` |
| `Spawns` | a game template there, at the spawner's level and faction |
| `Vfx`, `Sound`, `Screen` | a VFX, a sound, a full-screen effect for a player |
| `Damage`, `Knockback`, `Flinch` | a hit: `Damage.Ice(40) + Damage.Fire(10)` |
| `Heal`, `Restores` | `Restore.Mana(20) + Restore.Stamina(10)`; below 0 drains |
| `Removes`, `Applies` | statuses taken off or put on: your blocks or the game's (`GameBuffs`) |
| `Then` | more effects after this one, at the same target or place |
| `Casts` | an ability the target casts, with its costs and cooldown |

Where an effect runs and what its target is:

| Trigger | Target |
|---|---|
| a projectile's `OnImpact` | none, a place: use an `Area` |
| a projectile's `OnHit` | what it struck |
| a spell's `OnCast` | the caster |
| a status's `OnApply`, `OnTick`, `OnExpire` | who has it |
| a weapon's `OnHit`, `OnKill`; armour's `OnHitTaken` | what was hit or killed; who hit |
| a perk's or talent's `OnHit`, `OnKill`, `OnHitTaken` | as on a weapon |
| an ability's `OnCast`, an item's `OnUse` or `OnEat`, a trigger's `Do` | the caster, the user, the player |

A hit an effect deals doesn't trigger these again, so an effect can't loop on itself.

## Statuses

`Seconds`, `Kind` (buff or debuff), `Look` (`StatusLook.Frost`, `Poison`, `Fire`: the icon and body effect), `Refreshes`,
`TickEvery`, the three triggers, `Description`, and:

- `Modifies` changes stats while it runs and puts them back after:
  `Modifies = { [Stat.MoveSpeed] = -0.5, [Stat.Strength] = 5, [Stat.ResistIce] = 0.25 }`. Whole points for attributes,
  armour and max health; shares for speed, damage and resistances (0.1 is 10%).
- `While = PlayerStateId.Gliding` keeps it on a player for as long as they're in that state, with no timer.
- `Vfx` shows on whoever has it.

```csharp
Blocks.Define("weakened", new StatusBlock
{
    Name = "Weakened", Seconds = 10,
    Modifies = { [Stat.MoveSpeed] = -0.3, [Stat.MeleeDamage] = -0.2 },
    OnExpire = [new EffectBlock { Restores = Restore.Stamina(20) }],
});
```

## Items and weapons

The block solves the game's formulas, so the tooltip shows what you wrote: `Level = 5, Power = 30` is a level 5 weapon with
30 damage. The kind of item follows from what you fill in: `Heals` or `OnUse` makes a potion, `Feeds` food, `Tool` a tool,
`Ammo` an arrow.

```csharp
var shard = Blocks.Define("ember-shard", new ItemBlock { Name = "Ember Shard", Stack = 100, Fuel = 120 });

Blocks.Define("healing-draught", new ItemBlock
{
    Name = "Healing Draught", Heals = 150, Stack = 10,
    Recipe = new RecipeBlock { Makes = 2, Needs = { [shard] = 1 } },
});

Blocks.Define("ember-sword", new WeaponBlock
{
    Name = "Ember Sword",
    Class = WeaponClass.Sword,
    Stats = new WeaponStats { Level = 5, Power = 30, Rarity = Rarity.Rare },
    OnHit = [new EffectBlock { Chance = 0.2, Damage = Damage.Fire(15) }],   // in hand, no unlock needed
    Recipe = new RecipeBlock { Needs = { [shard] = 4 } },
});
```

```jsonc
{ "format": 1,
  "items": { "ember-shard": { "name": "Ember Shard", "stack": 100, "fuel": 120 } },
  "weapons": { "ember-sword": { "name": "Ember Sword", "class": "sword",
      "stats": { "level": 5, "power": 30, "rarity": "rare" }, "recipe": { "needs": { "ember-shard": 4 } } } } }
```

- **Weapon classes:** sword, axe, mace, greatsword, greataxe, hammer, daggers, bow, staff, shield, wand.
- **Armour:** `Slot`, `Set`, `Physical`, `Magical`, `Bonus`; its look is a game item's or a model of your own.
- **Water containers:** `Kind = ItemKind.WateringCan` or `WaterPouch`, with `Holds` (charges, up to 1,023) and `Flow`
  (how fast it fills and pours).
- **Perks:** `Perks = [myPerk]` on a weapon or armour. The game's rule applies: a perk runs once its enhancement is
  unlocked at an upgrade. A weapon's own `OnHit` needs no unlock.
- **Loot:** `Like` an existing item's drops, or into drop tables.

## Abilities

```csharp
Blocks.Define("flame-step", new AbilityBlock
{
    Name = "Flame Step", Key = "G", Command = "step",
    Cast = new CastBlock { ManaCost = 20, StaminaCost = 10 }, Cooldown = 8,
    Delivery = new ConeBlock { Range = 8, Angle = 60, Effects = [new EffectBlock { Damage = Damage.Fire(30) }] },
});
```

A key needs every player to have the mod; a chat command works for anyone. `Abilities.Cast(caster, "mymod:flame-step")`
casts it from code. A `TalentBlock` can `Unlock` it, so only players with that talent can cast it.

## What players do

```csharp
Blocks.Define("rest", new TriggerBlock { On = PlayerStateId.Sitting, Do = [new EffectBlock { Restores = Restore.Mana(5) }], Cooldown = 10 });
```

`On` takes any of the game's player states and actions: entering a state, starting an action, eating. `When`, `Unless`,
`Cooldown`, `OnEnd` when a state is left, and `Stop` to stop the action.

## Creatures and NPCs

A creature is four parts: a body, an animation, an AI and a behaviour. Each has premades taken from the game's
creatures (`Bodies.Vukah`, `AIs.Vukah`, `Behaviours.VukahMelee`) that you can change with `with { ... }`.

```csharp
Blocks.Define("vengeful-vukah", new CreatureBlock
{
    Body = Bodies.Vukah, Animation = Animations.Vukah,
    AI = AIs.Vukah with { Sight = 36, Aggro = 16 },
    Behaviour = Behaviours.VukahMelee with
    {
        Rules = [new RuleBlock { Every = 1, When = [Is.HealthBelow(0.5)], Do = [Act.SetPhase("enraged"), Act.Effect(burst)] }],
    },
    Stats = new CreatureStats { Level = 20 },
    Spawns = [new SpawnBlock { Replaces = "Enemy_Vukah_Melee", Chance = 0.15 }],
});
```

A game body with a new mind needs nothing on the players' side. A body and clips of your own are cooked from glTF and need
every player to have the mod; they run on test servers but aren't yet confirmed in the game. `Is.Custom` and
`Act.Custom` take your C#, and run on the tick thread. An `NpcBlock` uses a game NPC's body and adds talk, a vendor and a
roster place: see [Friendly NPCs](/kiln/wiki/npcs) and [Creatures](/kiln/wiki/creatures).

## World blocks

Things players place: a `StationBlock` that opens a game workshop's menu or has recipes of its own and works from its own
inventory over time, like the drying rack or the forge; props; furniture (containers with a lock, beds that set a
spawn point, seats, things to use with an effect); changes to how hard a game material is to dig; new building materials,
shapes and terrain materials. A world block in `blocks/*.json` is there from the first start. One defined in
C# is there from the next start, because the game reads these tables once.

## VFX

`VfxBlock` makes particles and a light from nothing: no game data, no compiler.

```csharp
var sparks = Blocks.Define("frost_sparks", new VfxBlock
{
    Particles = [new ParticleBlock { Burst = 24, Lifetime = (0.4f, 0.9f), Speed = (2f, 5f), Spread = Shape.Cone(35),
                                     Color = Gradient.Of("#ffffff", "#7fd4ff"), Texture = "vfx/shard.png", Blend = Blend.Additive }],
    Light = new LightBlock { Color = "#7fd4ff", Radius = 6f, Brightness = 4f, Lifetime = 0.6f },
});
```

Attach it with a `Vfx` field on a cast, a projectile, an effect, an area or a status, or name one of the game's with
`"game:<name>"`. A VFX in a data file is there from the first start; one from code from the next. Kiln-built bursts
and the game's VFX by name have been seen in the game; frost VFX on hits haven't yet.

## What players' games need

Kiln works it out from your blocks and writes `clients` for you:

| Your blocks contain | Players need |
|---|---|
| effects and triggers only | nothing |
| new items, spells, statuses, perks, abilities | Kiln (they get the definitions from the server) |
| your own sounds, icons, models or VFX, a key, talents | the mod |

## Below a block

`Tweak` sets any game field the block doesn't cover, on what the block made:

```csharp
Blocks.Define("frostbolt", new SpellBlock { /* ... */ Tweak = { { GameFields.Items.MaxStackSize, 5 } } });
```

## Names, ids and mistakes

- Ids come from your mod id and the block's name. Keep names: saves hold the ids. To rename, keep the old name in
  `Was = "frostbolt"`.
- A mistake names the block and field: `block spell bad, cast.manaCost: -1 is less than 0`. A broken block makes nothing;
  the file's other blocks still load. Analyzers and `kiln lint` catch most of these before a server starts.
- `kiln blocks list` and `kiln blocks show frostbolt --programs` show what a block became. In a test,
  `Blocks.Lowered(name)`.
