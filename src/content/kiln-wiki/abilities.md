---
title: "Abilities"
description: "Key-bound abilities, per-cast changes to the game's spells, explosions and buffs from code, food and potions used for a player, and animations."
status: "works"
updated: "2026-11-21"
---

Spells and attacks run on the server, so this works for players without Kiln. The exception: a key binding needs Kiln and
your mod on that player's game. Chat commands and server triggers need nothing.

## A new ability

```csharp
Abilities.Register(new AbilityDefinition
{
    Id = "firenova:fire-nova", DisplayName = "Fire Nova",
    DefaultKey = "G", ChatCommand = "nova",
    Cost = AbilityCost.OfMana(40), Cooldown = TimeSpan.FromSeconds(5),
    Targeting = AbilityTargeting.Self,
    OnCast = async cast =>
    {
        await cast.Impact("Explosion_Player_Spell_Fireball_1", cast.CasterPosition,
            new ImpactConfigs { ["Damage1"] = DamageSetup.FireOnly(10f) });
    },
});
```

<!-- shot: fire-nova | Fire Nova: a ring of explosions on G -->

Register it in a `side: both` mod. Players remap keys in the Kiln menu. `/cast <id>` and `ChatCommand` work for everyone.
`Abilities.Cast(actor, id)` casts from code, for players, creatures or NPCs. Kiln checks the cooldown, cast lock, target and
cost, then runs `OnCast` on the server.

> An explosion you run yourself has no weapon behind it. Give it its own damage (`Damage1` above), or it hits for 0.

## Change the game's spells, per cast

```csharp
[Subscribe]
private void OnImpact(ImpactStartingEvent e)
{
    if (e.RootIsPlayer && IsNight()
        && e.TemplateName?.StartsWith("Explosion_Player_Spell_Fireball") == true)
        e.Scale("AttackMod", 2f);           // or e.Set(...), or e.Cancel()
}
```

`Abilities.HoldPrograms(...)` limits this to the effects you care about. For the same change every cast, use
[game data](/kiln/wiki/game-data).

## Run effects, buffs and animations

```csharp
await Abilities.RunImpact("Explosion_Player_Spell_Fireball_1", position,
    new ImpactOptions { Root = caster });
await Abilities.ApplyBuff(target, buffGuid, TimeSpan.FromSeconds(6), caster);
BuffRemoveResult off = await Abilities.RemoveBuff(target, buffGuid);   // or a buff id (GameBuffs.Ids)
IReadOnlyList<EntityBuff> buffs = Abilities.BuffsOf(target);           // id, slot, time left, level
Abilities.PlaySequence(player, emoteGuid, SequenceOptions.Queue);
int? mana = Abilities.Attributes.Get(player, AbilityResource.Mana);
```

`RemoveBuff` (new in 0.2.0-dev.27) takes a buff off a player, creature or NPC through the game's own removal. The result
is the game's answer: `Ok` is false, with a reason, when the entity didn't have the buff; `BuffRemovedEvent` follows a
removal. `BuffsOf` lists the buffs on any entity. The game keeps buffs on the server, so a joined client gets an empty
list. The buff icon disappearing from a real player's HUD is not checked in a game yet.

`PlaySequence` plays the game's actions (a swing, an emote) on a player, NPC or creature. A cast played this way shows its
animation but doesn't fire the spell.

## Use an item for a player

> **New in 0.2.0-dev.30.3 (mod API 0.2.13).** Lab-tested on a test server. Not checked with a real player yet.

```csharp
// move one mushroom from a chest into the player's backpack, then eat it
var moved = await Items.Move(chest, chestSlot, player, count: 1);
if (moved.Succeeded && moved.Changes.Count > 0)
{
    ItemUseResult r = Abilities.UseItem(player, moved.Changes[0].To);
    if (r != ItemUseResult.Started) Log.Info($"not eaten: {r}");
}
```

`Abilities.UseItem(player, slot)` makes a player eat, drink or use a potion from one of their own slots, the way the game
does for a hotbar use (GitHub #110, thanks Fuzen777). The item's own animation plays, one item leaves that slot when the
game takes it (a fraction of a second later, not at the call), and the buff gets the item's own values and time.
Everything a hand use does still applies: a `PlayerConsumeEvent` handler or a block's `CanEat` can refuse it, and
`PlayerConsumedEvent` says when the item went.

Use it rather than `ApplyBuff` for food: 148 foods and drinks share 16 buff types, and the numbers (+40 max health for
20 minutes) belong to the item. `PlaySequence` refuses food and potion animations, because it has no item to give the game.

| `ItemUseResult` | When |
|---|---|
| `Started` | the use started; the item goes when the game takes it |
| `NotConsumable` | not food, a drink or a potion (weapons, tools, materials) |
| `NotOwnSlot` | not a slot of the player's own backpack, hotbar or equipment |
| `EmptySlot` | the slot is empty |
| `SlotChanged` | the slot held another item by the time Kiln checked it again |
| `NotAPlayer` | not a player character |
| `Dead` | the player is dead |
| `NotReady` | joining, loading the terrain or respawning |
| `Busy` | another action plays (an attack, another use, an emote, a dodge), a second use in the same step, or the player sleeps, sits, climbs, glides, fishes or plays an instrument |
| `ServerOnly` | a joined client: there is no server world here |

- Server, tick thread, between steps: a tick handler, an event handler, a scheduled task. In a native handler it throws
  `InvalidOperationException`; use `Scheduler.Post`.
- There is no cooldown answer: the game has no cooldowns for players, and what looks like one is the use's own animation,
  so a second use while it plays is `Busy`. Whether a fifth food fits is the game's decision after the use starts, as
  for a hand use.
- Lab-tested: a mushroom eaten with the count going down, `Busy` for a second use, the food buff, a health potion,
  `EmptySlot`, `NotConsumable` for a sword and `NotOwnSlot`. Not yet checked with a real player: the buff bar's lines and
  time on their screen, and the animation other players see.

## Where a player looks

```csharp
if (PlayerStates.AimOf(player) is { } aim)
    await Abilities.RunImpact("Explosion_Player_Spell_Fireball_1", aim.At(20), new ImpactOptions { Root = player });
```

`PlayerStates.AimOf(player)` (new in 0.2.0-dev.27) says where a player's camera is and where it looks: `Origin`,
`Direction`, and `At(metres)` for a point along that line. The server reads it from what the player's game sends. The
camera sits behind the character, so a ray for "what is the player looking at" starts at the camera.

## Watch and adjust hits

`ImpactDamageEvent`, `ImpactBuffEvent` and `ImpactSpawnEvent` report what spells did. `Abilities.OnDamage` can change one hit.
To hear only the hits about one creature, filter the event by entity ([Events](/kiln/wiki/events#only-the-events-about-one-entity)).

## Gems

Gems are part of Kiln.Abilities too (since 0.2.0-dev.29.11): `Gems` reads the gems a player wears, registers new ones
whose effect can be your C# (`GemTrigger.OnHit`, `OnKill`, ...), and runs the Shroud Forge's actions from code. See
[Gems](/kiln/wiki/gems).

## New gameplay logic

When values aren't enough, write an [Impact program](/kiln/wiki/impact).

**Registering the same program again** (0.2.0-dev.30.3, GitHub #108, thanks Fuzen777). `Abilities.Programs.Register` with
the same bytes now succeeds, and in a new world it puts the program back, so a mod can register at every world start.
Kiln also puts every program it inserted back into each new world of the game session by itself, and `ApplyBuff` and
`RemoveBuff` look their program up at every call. Other bytes under a GUID a world already holds are still refused.
