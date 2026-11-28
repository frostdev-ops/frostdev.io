---
title: "Pets: owned creatures that follow you"
nav: "Pets"
description: "Give a player a pet that follows, fights, goes down and is revived: how to define one, what Kiln keeps for you, what your mod decides, and what players see."
status: "pending"
updated: "2026-11-28"
---

> **New in 0.2.0-dev.32 (beta 1, mod API 0.2.27).** Beta 1 is a test build: switch the launcher's **Channel** (Settings,
> Launcher updates) to the test builds to try it. Pets ran on dedicated lab servers with bots and in Kiln's tests. **No player has
> seen them in a real game yet**: the pet bar, the markers, the animation, long attack orders, anchors at login and walking over
> rough terrain are still to be checked.

A pet is a creature that belongs to one character. It follows its owner, fights what the owner's mod lets it fight, and when it
is hurt past its health it **goes down** instead of dying; the owner can **revive** it. Kiln keeps all the machinery: the saved
record per character, the body, its movement, protection, the revive channel, what a revive costs and the owner's bar. **Your mod
decides what a pet is:** which creature, how strong, who it may fight, what going down means, what reviving costs, and when it
attacks.

Players need Kiln for the pet bar. A pet built on one of the game's own creatures looks like that creature to everyone else,
vanilla players included. A pet whose body is a creature block of your own needs what that block needs
([`clients: "mod"`](/kiln/wiki/manifest#what-players-need-clients)).

<!-- shot: pet-bar | The pet bar next to a summoned wolf -->

## Define a pet

A pet is a block. Its id is `<your mod id>:<name>`.

```csharp
// a game creature, by its creatures-registry id: asks nothing of players' games
Blocks.Define("hound", new PetBlock { Creature = "game:enemy_wildbeast_wolf_earlygame", Name = "Hound" });
```

Or as data, in `blocks/*.json`, section `pets`, with every choice written out:

```json
{ "pets": {
    "duelist": {
      "creature": "game:enemy_vukah_melee", "name": "Duelist",
      "level": { "mode": "ownerAtSummon" },
      "movement": { "followDistance": 4, "runDistance": 12 },
      "targets": { "pvp": "byModRule", "hostileFactions": ["vukah", "fogger"] },
      "downed": { "outcome": "absent" },
      "revive": { "channelSeconds": 5, "cost": { "item": "Material_T1_Twigs", "count": 3 } },
      "limits": { "livePerCharacter": 2 }, "hud": { "recoveryMarker": false }
    } } }
```

Without Kiln.Blocks, `Pets.Define(new PetDefinition { Id = "my-mod:hound", Creature = "game:enemy_wildbeast_wolf_earlygame" })`
does the same and answers with a `PetDefinitionResult`: `Ok`, a `Refusal` to decide by (`PetRefusal.DefinitionInUse`, `CreatureUnknown`,
`CreatureUnsupported`) and a `Reason` for your log. A definition's name is `Name` on the block and on `PetDefinition` alike.

| Choice | What you set | If you say nothing |
|---|---|---|
| The body | a game creature's id (`game:...`) or a creature block of your own | required. **Only enemy creatures that walk**: no wildlife, farm animals or flyers |
| Level and size | fixed, the owner's level at the tame, or at each summon; scale 0.25 to 4 | level 1, scale 1 |
| Following | stay-close distance, when it runs, when it catches up to its owner, how long stuck before that | 3 m, runs past 10 m, catches up past 60 m or after 5 s stuck |
| Who it fights | the creature factions it may fight; players and other players' pets: off, or by your rule | Fogger, Vukah, Scavenger, WildBeast, Skeleton, Cyclops, Drak, Ancients; no PvP |
| Going down | a recovery anchor where it fell, gone until summoned, or released for good | a recovery anchor |
| Reviving | allowed or not, channel time, range, health it returns with, one plain item as cost, what cancels it | allowed, 3 s, 3 m, half health, free, moving or being hurt cancels |
| How many | per character, live per character, live per world | 32, 1, 16 |
| The bar | a row in the owner's pet bar, a marker on the recovery anchor | both on |

In C# a duration is a `TimeSpan` (`ChannelDuration`, `StuckAfter`, `RepathInterval`); in `blocks/*.json` it is a number of seconds
(`channelSeconds`, `stuckSeconds`, `repathSeconds`). The "how many" choice is `PetLimits` in C# and `limits` in JSON.

Players are always protected by default: a pet never harms a player and a player never harms a pet, until your mod says
otherwise for two characters.

## Give, summon, order, revive

```csharp
// one place that reads every answer: a refusal is a result with a Refusal, not an exception
async Task<PetResult?> Ask(Task<PetResult> request)
{
    var r = await request;
    if (!r.Ok) Log.Info($"pet request refused ({r.Refusal}): {r.Reason}");   // decide by r.Refusal, log r.Reason
    return r.Ok ? r : null;
}

if (!Capabilities.Is("pets.records") || !Capabilities.Is("pets.summon")
    || !Capabilities.Is("pets.follow") || !Capabilities.Is("pets.downed")) return;   // a joined client has none of these
var who = PlayerRef.Of(player);                           // the player in game; their character owns the pet
var given = await Ask(Pets.Grant(who, "my-mod:hound", PetRequest.New()));      // a record, no body yet
if (given?.Pet is not { } pet) return;
if (await Ask(Pets.Summon(who, pet.Id, PetRequest.New())) is null) return;     // a protected body 2 to 4 m from the owner, following
if (await Ask(Pets.Command(who, pet.Id, PetOrder.Stay, EntityRef.None, PetRequest.New())) is null) return;
if (await Ask(Pets.Command(who, pet.Id, PetOrder.Attack, EntityRef.Of(enemy), PetRequest.New())) is null) return;
if (await Ask(Pets.Revive(who, pet.Id, PetRequest.New())) is null) return;     // the owner channels next to its recovery anchor
if (await Ask(Pets.Release(who, pet.Id, PetRequest.New())) is null) return;    // for good
foreach (var p in Pets.Of(who)) Log.Info($"{p.Label}: {p.Life} {p.Presence} {p.Health}/{p.HealthMax}");   // empty for a player not in game
```

Every call answers with a `PetResult` (the `Ask` helper above is where yours reads it): `Ok`, a `Refusal` (a `PetRefusal`: `Busy`,
`NotOwner`, `Capacity`, `NoSafeGround`, `TargetProtected`, `OutOfRange`, `RefusedByMod`, ...) to decide by, a `Reason` text for your log,
the pet as it is after, and the receipts of any cost. A refusal is not an exception; check `Ok`. Pass a fresh `PetRequest.New()` for
each action you mean (its `RequestId` is in the answer); resend the **same** one after a network hiccup and Kiln gives the first
answer back instead of doing it twice.

- **Ask first.** Each service row is a constant of `Pets` (`Pets.RecordsCapability` is `"pets.records"`, and `SummonCapability`,
  `FollowCapability`, `FightCapability`, `DownedCapability`, `ControlCapability`, `DefinitionsCapability`, `HudServerCapability`,
  `HudClientCapability`); `Capabilities.Why(row)` says why one is off. A joined player's game has none of the server rows.
- **Where a pet comes from** is your mod's choice: a quest reward, a command, a shop, or [taming](/kiln/wiki/taming).
- **Summon and dismiss** are the owner's wish. The wish stays through logout: the next login brings the pet back (a downed pet
  comes back as its recovery anchor, never with its health).
- **Attack, assist, defend:** Kiln never attacks by itself. Order an attack when your rule says so (the owner was hit, a key was
  pressed). Kiln refuses a target the pet's rule protects.

## Going down and reviving

When a pet takes a lethal hit it goes down. Its body is removed first, then what it becomes is the definition's choice: a **recovery anchor**
(a spot where it fell, marked on the owner's screen, no body, no collision, never a target), **absent** until the owner summons the
anchor next to them, or **released**. A mod can pick per pet in `PetDowningEvent`:

```csharp
Events.On<PetDowningEvent>(e =>
{
    if (e.Pet.Definition == "my-mod:hound" && FarFromOwner(e.Pet)) e.Outcome = PetDownedOutcome.Release;
});
Events.On<PetRevivingEvent>(e => { if (OnCooldown(e.Owner)) e.Cancel(); });   // nothing has been taken yet
```

A revive is **quoted first** (a read: nothing moves), then the owner channels next to the anchor. What it costs is the definition's
(`PetRevivePolicy.Cost`); the optional `selection` of `Pets.Revive` only says which of the owner's slots pays it. Walking away, being hurt (when you
say so) or leaving cancels it and takes nothing. At the end the cost is taken **once**, exactly, from one stack in the owner's
inventories with a receipt, and the pet is back with the health fraction you chose. A cost that cannot be taken (the item
is missing from the game) is your mod's error in `kiln.log`, and that pet's revives are refused with nothing taken.

## Fights between players: your rule

PvP is off. To allow consensual duels, give the pets `"pvp": "byModRule"` and call `Pets.SetHostile(a, b, true)` for two
characters when both agreed (`false` ends it). Kiln enforces the pair in every hit, knockback and order; your mod makes the
decision. The `PetsSample` in Kiln's repository has a `/pet duel` command that does this.

## Walking beside the owner

A pet walks routes next to its owner only where Kiln has a **measured clearance profile** for its creature's body at its scale on
the running game build; otherwise it still follows by catching up to its owner on safe ground. Kiln ships profiles for the creatures it
measured and for bodies three or more creatures share (most walking enemies at their normal size). A game update retires them until
a Kiln update measures again. A creature of your own needs a profile of your own, made in a lab with a Kiln source checkout on Linux
(`tools/pets-clearance/calibrate.sh`, [the guide](https://github.com/frostdev-ops/kiln)); a body wider than 2 m or taller than 3 m
cannot get one.

## The owner's bar

Kiln draws a pet bar for owners who run Kiln: one row per pet with health, and a marker over a recovery anchor. A mod can hide
it per pet (`PetHudPolicy`), a player can hide it on their own game (`PetsClient.Configure`), and a mod can draw its own from
`PetsClient.Snapshot`, read once per frame. Both throw `KilnUnavailableException` where the row `pets.hud.client`
(`Pets.HudClientCapability`) is off, a dedicated server for one, so ask first.

## What you need to know

- **Server only.** Pets are kept and run on the server; a joined player's game only draws the view the server sends.
- **Records are per world.** A pet does not follow a character into another world.
- **A pet is saved** (its id, definition, life, wish, order, level, health share, anchor), never its body. A pet whose mod is not
  loaded stays in the save, dormant, and returns when the mod does.
- **Not possible yet:** a body left lying when a pet goes down, flying pets, wildlife and farm animals as bodies, pets that cross
  worlds.

The full guides are in Kiln's repository, `docs/kiln/modding/pets.md` (a walkthrough first, then the reference) and `docs/kiln/services/pets.md`
(the contract, every event and every reason), on [GitHub](https://github.com/frostdev-ops/kiln). The API reference chips under the title are the service pages; until the reference of beta 1 is published, the `Kiln.Pets` chip opens the
[agent skill's pets file](/kiln/agents/kiln-modding/references/api-pets.md), which lists the members. Related: [Taming](/kiln/wiki/taming), [Creatures](/kiln/wiki/creatures), [Multiplayer](/kiln/wiki/multiplayer).
