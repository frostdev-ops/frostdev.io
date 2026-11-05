---
title: "Abilities"
description: "Key-bound abilities, per-cast changes to the game's spells, explosions and buffs from code, and animations."
status: "works"
updated: "2026-11-04"
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
Abilities.PlaySequence(player, emoteGuid, SequenceOptions.Queue);
int? mana = Abilities.Attributes.Get(player, AbilityResource.Mana);
```

`PlaySequence` plays the game's actions (a swing, an emote) on a player, NPC or creature. A cast played this way shows its
animation but doesn't fire the spell.

## Watch and adjust hits

`ImpactDamageEvent`, `ImpactBuffEvent` and `ImpactSpawnEvent` report what spells did. `Abilities.OnDamage` can change one hit.

## New gameplay logic

When values aren't enough, write an [Impact program](/kiln/wiki/impact).
