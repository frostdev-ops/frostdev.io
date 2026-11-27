---
title: "Taming: steps, costs and a pet at the end"
nav: "Taming"
description: "Let players tame a creature in steps you design (weaken it, feed it, use a tool), with exact costs, refunds and timeouts Kiln settles for you, ending in a pet, or hook into the game's own wildlife taming."
status: "pending"
updated: "2026-11-27"
---

> **New in 0.2.0-dev.32 (beta 1, mod API 0.2.27).** Beta 1 is a test build: switch the launcher's **Channel** (Settings,
> Launcher updates) to the test builds to try it. Taming ran on a dedicated lab server with a bot player (15 checks) and in
> Kiln's tests. **It has not been seen in a real game yet**: the natural bait flow, who tamed an animal, a client's progress display
> and refunds still need a player.

Kiln makes taming possible; **what taming is in your mod is your choice**: which creatures, what each step costs, whether the
paid steps come back, how long an attempt may last and which [pet](/kiln/wiki/pets) it makes. Kiln runs the attempt on the
server: it claims the target, takes each cost exactly from the slot the player picked and keeps a receipt, never pays twice for a
retried request, times the attempt out, settles refunds and creates the pet record when the tame commits.

A taming on the game's own creatures and items is server-only: players don't need your mod. The window or key that lets a
player choose the slot to feed from is your mod's own UI.

## Declare a taming

A taming has an id (`<your mod id>:<name>`), the creatures it tames, its steps in order (the last one tames) and optional timeouts,
refund policy and pet. As a block, items and pets are named the way every block names them, so your own items work:

```csharp
var bait = Blocks.Define("wolf-bait", new ItemBlock { Name = "Wolf Bait", Stack = 20 });
var pet = Blocks.Define("tame-wolf", new PetBlock { Creature = "game:enemy_wildbeast_wolf_earlygame", Name = "Tamed Wolf" });
Blocks.Define("wolf", new TamingBlock
{
    Creatures = ["game:enemy_wildbeast_wolf_earlygame"],
    Steps = [TamingStepBlock.Weaken(0.4), TamingStepBlock.Feed(bait, 2)],
    Pet = (BlockHandle<PetBlock>)pet,
    Refund = TamingRefundPolicy.RefundOnFail,
});
```

The same in `blocks/*.json`:

```json
{ "items": { "wolf-bait": { "name": "Wolf Bait", "stack": 20 } },
  "pets": { "tame-wolf": { "creature": "game:enemy_wildbeast_wolf_earlygame", "name": "Tamed Wolf" } },
  "tamings": {
    "wolf": { "creatures": ["game:enemy_wildbeast_wolf_earlygame"], "pet": "tame-wolf",
              "steps": [ { "kind": "weaken", "maxHealthFraction": 0.4 },
                         { "kind": "feed", "item": "wolf-bait", "count": 2 } ],
              "refund": "refundOnFail" } } }
```

| Step | What it asks of the player | Cost |
|---|---|---|
| `feed` | feed `count` (1 to 999) of an item, from the slot they pick | the items, taken exactly |
| `weaken` | bring the target's health to at most `maxHealthFraction` of its maximum | none |
| `tool` | use a gear item: it loses `wear` durability (it may break only if `allowBreak`) | durability |
| `native` | the game's own taming steps (petting while it eats its bait), `steps` of them | none of Kiln's |

| Setting | Default | Meaning |
|---|---|---|
| `rangeMeters` | 3 (1 to 8) | how close the player must be |
| `inactivitySeconds` | 30 (1 to 300) | an attempt with no applied step for this long ends |
| `maxAttemptSeconds` | 300 | the longest an attempt lasts |
| `refund` | `nonRefundable` | `refundOnFail`: a failure that is not the player's (the body gone, the world ended) gives paid steps back. `escrow`: also when the player cancels or the time runs out |
| `requireThresholdUntilCommit` | true | the target must still be weak enough at the last step |
| `removeTarget`, `summonPet` | true, true | with a pet: the wild body goes once the record exists and the pet comes out |

A creature that is not in `creatures` is refused before any cost is taken. A trailing `*` takes a prefix
(`game:animal_wildlife_dog_*`). A bad value is an error naming its path (`steps[1].count`); an item the game does not know is
reported once the game's items are readable, and until then the taming is not defined (`Begin` answers `DefinitionUnknown`).

With code instead of blocks, `Taming.Define(new TamingDefinition { ... })` takes the same fields, and `Taming.DefineJson(json)` reads one
definition or an array. Game items there are `game:<debug name in lower case>`.

## Drive an attempt

Every action carries your **request id** and the **token** of the last answer. Use a new id for each action you intend; if
a message is lost, send the **same** one again and Kiln answers with what happened, never paying twice.

```csharp
var r = Taming.Begin(player, EntityRef.Of(wolf), "my-mod:wolf", Guid.NewGuid());
if (!r.Ok || r.Progress is not { } p) { Log.Info(r.Reason ?? "refused"); return; }   // Busy, TemplateMismatch, OutOfRange, ...
// weaken has no cost, so no selection:
r = await Taming.Advance(player, p.Id, new TamingToken(Guid.NewGuid(), p.StepChallenge, p.Revision, p.CompletedSteps));
if (!r.Ok || r.Progress is not { } q) { Log.Info(r.Reason ?? "refused"); return; }
// a feed step takes the slot the player chose; the server read these rows itself
var pick = Taming.Choices(player, q.Id).Choices[0].Selection;
r = await Taming.Advance(player, q.Id, new TamingToken(Guid.NewGuid(), q.StepChallenge, q.Revision, q.CompletedSteps), pick);
if (r.Ok && r.Pet is { } tamed) { /* tamed: tamed is the new pet record */ }
```

- **Nothing is searched when a cost runs.** The slot the player picked must still hold what the server read; if it changed the
  step is refused (`StaleSelection`) and nothing is taken. A player's game never names a slot of its own: build your picker from `Taming.Choices`.
- **The last step tames.** An `Ok` answer carries the new `Pet` when the taming names one.
- **If every step is paid but the tame cannot bind yet** (a full pet roster, for example), the answer starts with `CommitDeferred`:
  nothing more is taken, and `Taming.Retry` tries again later.
- **Cancel the step you do not want** by handling `TamingBeginningEvent`, `TamingAdvancingEvent` or `TamingCommittingEvent` and
  calling `Cancel()`: nothing is spent and the token stays valid.
- **Reasons start with a word** (`Busy`, `WrongOwner`, `StaleStep`, `StaleSession`, `OutOfRange`, `TemplateMismatch`,
  `RequestConflict`): switch on that word.

## The game's own taming

Wild dogs, cats, goats, bunnies, catdeer, turkeys, yaks, capybaras and sanddiggers are tamed the game's way: you place their favourite
bait, they eat it, a player pets them while they eat (one step, about 3.75 s), and after the animal's required steps it becomes a
farm animal. Kiln changes none of that. A mod can:

- read where an animal is (`NativeTaming.Read`), and watch the progress, the bait and the tame (`NativeTamingProgressEvent`,
  `NativeBaitEatenEvent`, `NativeTamedEvent`);
- put a `native` step in a taming, so that a taming can be the game's, Kiln's, or both;
- change how many steps an animal needs with the [registry](/kiln/wiki/new-registries): `creatures.tamingSteps`
  (whether it is tameable and its favourite bait are read only).

The game does not record **who** tamed an animal; your mod decides that. Kiln cannot place bait for the game to sense (the player
places the game's own bait item), and driving a petting step from a mod is experimental.

## What is settled for you

| You decide | Kiln does |
|---|---|
| the steps and their costs | takes each cost exactly from the chosen slot, once per request id, and keeps the receipt |
| the refund policy | gives back what was surely paid, each receipt once, never an uncertain one |
| the times and the range | runs them in game time and settles a cost in flight before an attempt ends |
| the creatures | refuses others before anything is taken |
| the pet | keeps the roster slot from the start, refuses a full roster before the last cost, creates the record, removes the wild body and summons the pet |

## Limits

- Attempts run on the server. One attempt per target at a time (`Busy`).
- A refund goes back to the same player in the same world. For a player who has left it is not settled yet, so do not promise one.
- A taming that names a pet needs the pet service (`pets.records`), and that pet's body must be a creature a pet can have: an enemy that
  walks ([Pets](/kiln/wiki/pets)). The creature you tame can be any of the ones you list.
- Not seen in a real game yet: see the note at the top.

The full guides are in Kiln's repository, `docs/kiln/modding/taming.md` (a walkthrough first) and `docs/kiln/services/taming.md` (the contract),
on [GitHub](https://github.com/frostdev-ops/kiln). The complete example is `TamingSample` there (`/tame begin`, `/tame step`, `/tame feed`, `/tame retry`).
Related: [Pets](/kiln/wiki/pets), [Creatures](/kiln/wiki/creatures), [Inventory transfers](/kiln/wiki/inventory#exact-costs-and-receipts).
