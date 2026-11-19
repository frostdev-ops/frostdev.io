---
title: "World reads and writes from tasks"
nav: "World from tasks"
description: "Read entities and components from a Kiln task's worker with checked copies, and change a plain component between frames by compare-exchange. Experimental (KILNX003)."
status: "pending"
updated: "2026-11-18"
---

> **New in 0.2.0-dev.29.18** (mod API 0.2.10), experimental. Not yet checked in a real game: the reads and writes have
> run only in Kiln's tests, against stand-ins for the game. They work only on the exact game builds Kiln knows,
> dedicated server 26430253 and client 26430625; other builds answer `Unavailable`.

`WorldConcurrent` (in Kiln.World) lets a [task](/kiln/wiki/tasks) read the world from its worker instead of hopping to
the tick for every look. Every read copies the bytes and checks the entity again around the copy, so you get a whole
value or a reason why not. A task can also change one kind of component itself: a plain one the game neither saves nor
sends, by compare-exchange between frames. Everything else still changes on the tick.

## KILNX003: the opt-in

`WorldConcurrent` and its types are `[Experimental("KILNX003")]`: documented and in completion, but new, and their shape
can still change. Using them is a compile error until the project opts in, next to `World` in `<KilnServices>` and
`tasks.pool` in `<KilnFeatures>` ([project setup](/kiln/wiki/tasks#project-setup)):

```xml
<PropertyGroup>
  <NoWarn>$(NoWarn);KILNX003</NoWarn>
</PropertyGroup>
```

- Put the same `NoWarn` line in the test project when its tests use them. `FakeWorld.BusyReads` and `BusyWrites` in
  Kiln.TestKit carry the same id.
- `KILNX001`, the id of Kiln's lab members, doesn't opt in to `WorldConcurrent`. Test builds before 0.2.0-dev.29.18
  used `KILNX001` for it: switch to `KILNX003`, and keep `KILNX001` only if you also call lab members.
- The mark goes once the in-game checks of the reads and the writes pass on both exact game builds.

## Where the reads work

| World | Dedicated server | A player hosting | A player joined to a server |
|---|---|---|---|
| server (`WorldKind.Server`) | yes | yes | no server world: `Unavailable` |
| client (`WorldKind.Client`) | no client world | yes | yes |
| prediction | `Unavailable` | `Unavailable` | `Unavailable` |

- **Exact game builds only.** `WorldConcurrent.IsAvailable` says whether this is a build Kiln has an exact profile for.
  On any other build every read answers `Unavailable`, and the capability row `world.ecs_read` says why.
- `WorldConcurrent.IsPresent(world)` says whether a world of that kind exists now. Both work on any thread.
- **Where to call them:** inside a Kiln task (on its worker, or after `await ctx.ToTick()`), or on the tick from your
  mod's code. Anywhere else (`Task.Run`, a thread of your own, code after `ConfigureAwait(false)`) they throw
  `InvalidOperationException`, and KILN105 reports it at build time.

## Reading

```csharp
/// <summary>CurrentTransform starts with x, y and z as 32.32 fixed-point metres.</summary>
[StructLayout(LayoutKind.Sequential)]
struct Position { public long X, Y, Z; }

/// <summary>The containers within reach, read from a task's worker; null when the reads can't answer here.</summary>
private static IReadOnlyList<EntityId>? ChestsNear(WorldPosition at, double reach)
{
    var refs = new ConcurrentEntity[64];
    var query = new EntityQuery(WorldKind.Server, "Inventory") { Center = at, Radius = reach };
    var found = WorldConcurrent.Query(query, refs);
    if (found.Status == ReadStatus.TooSmall)              // more than 64: ask again with room
    {
        refs = new ConcurrentEntity[found.Required + 16];
        found = WorldConcurrent.Query(query, refs);
    }
    if (found.Status != ReadStatus.Ok) return null;      // Unavailable, Changed: let the tick do it
    var near = new List<EntityId>();
    for (var i = 0; i < found.Count; i++)
        if (WorldConcurrent.Read<Position>(refs[i], "CurrentTransform").IsOk)   // Stale or Absent: gone since
            near.Add(refs[i].Id);
    return near;
}
```

| Member | Gives |
|---|---|
| `Open(id, world)` | a `ConcurrentEntity`: a value, not a handle; nothing is pinned |
| `Validate(entity)` | the ref's status now |
| `Read<T>(entity, component, mode)` | the first `sizeof(T)` bytes of a checked copy of the component |
| `ReadBytes(entity, component, into, mode)` | the whole component |
| `ReadMany(entity, set, mode)` | several components (`ComponentSet`), each with its own status; not one atomic read across them |
| `Query(query, into)` | every entity that has all the named components, optionally within a radius, in ascending id; complete or nothing |
| `Template(entity)` | the template the entity was spawned from, as a `Guid` |

**Statuses** (`ReadStatus`). An ordinary miss never throws:

- `Ok`: the value is whole.
- `Absent`: no such entity or component.
- `Stale`: the id names another entity now, or the world, the entity's components or your mod's load changed.
- `Unreadable`: the copy failed or the value changed during the read. Try again.
- `Unavailable`: the reads don't work here.
- `SizeMismatch`: the component is smaller than `T`.
- `TooSmall`: your buffer is too short, and `Required` says how long it must be. `Changed`: a query's matches changed
  while it ran. Ask again.
- `Busy` and `Unsupported`: frame-quiet reads only, [below](#two-read-modes).

Only misuse throws: a `default` `ConcurrentEntity` or `EntityQuery`, an empty component name, a query `Center` that is
not finite or has no radius above 0, the wrong thread. Use the game's own component names, and a struct that matches the
start of the component's layout on that game build; never guess one.

### The fallback in one line

```csharp
private static IReadOnlyList<EntityId>? ChestsNearOnTick(WorldPosition at, double reach) =>
    Nearby.Within(Items.FindInventories(), at, reach);           // the same search with tick APIs

// in the task
var near = await WorldConcurrent.OrOnTick(ctx, () => ChestsNear(at, 12), () => ChestsNearOnTick(at, 12))
           ?? await ctx.OnTick(() => ChestsNearOnTick(at, 12));
```

`WorldConcurrent.OrOnTick(ctx, offTick, onTick)` runs `offTick` at once, in the task, where the reads work, and
`onTick` through `ctx.OnTick` on the task's own world otherwise. The `??` covers a search from the task that answered
null after all. A task started on the game's main thread that needs the server world's tick writes it out:
`WorldConcurrent.IsAvailable ? offTick() : await ctx.OnTick(WorldKind.Server, onTick)`.

## Two read modes

- **`ReadMode.Stable`** (the default) copies at any time and refuses a value that changes during the copy. One limit:
  it can't tell a value a writer left half written (a thread paused in the middle of storing it) from a whole one. The
  game's own systems store whole values.
- **`ReadMode.FrameQuiet`** copies only while no server frame runs. Use it when a half-written value would hurt.
  - A frame that ran during the read gives `Busy`, with nothing copied. Retry after `await ctx.NextGateWindow()`.
  - On the tick the frame is running, so a frame-quiet read there is `Busy` at once. Read `Stable` on the tick.
  - Server world only: in a client world it is `Unsupported`. Kiln never falls back to a stable copy for it.

```csharp
ConcurrentRead<Position> where;
while ((where = WorldConcurrent.Read<Position>(entity, "CurrentTransform", ReadMode.FrameQuiet)).Status == ReadStatus.Busy)
    await ctx.NextGateWindow();   // a server frame ran during the read: try after the next step
```

`EntityQuery` has a `Mode` for a frame-quiet query, and `ReadMany` reads all its components in one frame-quiet window.

**Refs and reloads.** A `ConcurrentEntity` is a value, and every read checks it again. A component added to or removed
from the entity makes its refs `Stale`. Refs taken before your mod reloads come back `Stale` too: open the entities
again.

## Writes from a task

Tasks change the world on the tick: `World.Write`, `Items.Give` and the rest, with `ToTick`, `OnTick` or `PostToTick`.
The one exception, also experimental: a task can change a whole component itself by compare-exchange. Kiln compares the
component with the bytes you expect and writes the new bytes only when they are equal. The write runs under the
engine's own write gate, which every server frame holds for its whole update, so it lands only between frames and a
frame never sees a half-written component. Nothing waits: when the gate is taken, the call answers `Busy` at once.

```csharp
// "Charge" stands in for a plain component the game neither saves nor replicates
struct Charge { public int Value; public int Max; }

Context.Tasks.Run("recharge", async ctx =>
{
    var opened = WorldConcurrent.Open(id);
    if (!opened.IsOk) return;
    var e = opened.Value;
    while (true)
    {
        var now = WorldConcurrent.Read<Charge>(e, "Charge");
        if (!now.IsOk) return;                                  // Stale, Absent, Unavailable: give up
        var next = now.Value with { Value = Math.Min(now.Value.Max, now.Value.Value + 1) };
        var r = WorldConcurrent.TryCompareExchange(e, "Charge", now.Value, next);
        if (r.Status is ExchangeStatus.Busy or ExchangeStatus.Unreadable)
            await ctx.NextGateWindow();                         // a frame held the gate: after the step
        else if (r.Status != ExchangeStatus.Conflict)
            return;                                             // Ok, or a refusal a retry can't change
        // Conflict: something changed it first; read again and retry from the new value
    }
});
```

`WorldConcurrent.WritePolicy(component)` says whether a task may write a component on this build, and if not, why
(`Reason`, `Text`). `WorldConcurrent.CanWrite` says whether the writes are on at all.

**What may be written**, decided by rules, not by a list of names:

1. the server world: a dedicated server, or a player's game while it hosts;
2. a game build Kiln has an exact profile for, with a server world running;
3. a component the game neither saves nor replicates. A tracked component stays on the tick: use
   [`World.Write`](/kiln/wiki/world-programs#tracked-writes-from-the-tick-thread);
4. plain values all the way down: booleans, numbers, enums, bit masks and GUIDs. Strings, arrays, optionals,
   references and anything Kiln can't describe are refused;
5. at most 64 KiB.

**Outcomes** (`ExchangeStatus`). A refusal never throws:

| Status | When | Retry? |
|---|---|---|
| `Ok` | written and read back, or nothing to change | |
| `Conflict` | the component isn't what you expected; `Current` holds what it is | yes, from the new value |
| `Busy` | a frame or another Kiln writer holds the gate, your mod met a busy gate earlier in this step, or the call came from the tick | after `await ctx.NextGateWindow()` |
| `Stale` | the entity changed, the ref is another mod's, or your mod is unloading | no: open the entity again |
| `NotWritable` | the policy refuses the component | no |
| `Uncertain` | a write was tried and Kiln couldn't prove the bytes after it; that component of that entity answers this for the rest of the session | no |
| `Unavailable` | not here: no exact profile, not the server world, the world stopping | use the tick |
| `Absent` | the entity or the component is gone | |
| `Unreadable` | a read failed before any write, or a write was rolled back and the bytes are as they were | yes |

- `TryCompareExchange<T>` compares and writes every byte of `T`, padding too: `T` must be the whole component, with a
  field for every byte. `TryCompareExchangeBytes(entity, component, expected, desired, mask, current)` takes bytes,
  with an optional per-byte mask.
- On the tick, and in a task's server-world hop, a write is always `Busy` and reaches nothing; KILN105 reports a write
  in tick code. Write from a task's worker, and use `World.Write` on the tick.
- A mod writes with refs it opened itself.
- **`ComponentExchangedEvent`** comes on the server tick after each committed write: `Entity`, `Generation`,
  `ComponentHash` (`e.Is("Charge")`), `Session`, `Step`, and `Mod`, the mod that wrote (null for a Kiln service).

```csharp
[Subscribe]
private void OnExchanged(ComponentExchangedEvent e)
{
    if (e.Is("Charge") && e.Mod != "my-mod") Log.Info($"{e.Mod ?? "a Kiln service"} changed {e.Entity}");
}
```

## Testing

The [TestKit](/kiln/wiki/testing#tests-without-the-game) has the reads and writes on its fake world, with the same
rules. Your tasks run as described on [Tasks](/kiln/wiki/tasks#testing): start them, then `kiln.Tasks.Settle()`.

```csharp
kiln.Capabilities.Override("world.ecs_read", false);                 // a build with no exact profile: the tick path runs
kiln.Entities.BusyReads = 2;                                         // the next two frame-quiet reads answer Busy
kiln.Entities.Track("Inventory", save: false, replication: false);   // the kit can't know what the game tracks
kiln.Entities.BusyWrites = 1;                                        // the next write meets a busy gate
```

- A container made with `kiln.Items.AddContainer` has the game's `Inventory` component, so a query finds it.
- The reads and writes run from a task's worker between the harness's steps. `ComponentExchangedEvent` comes at the
  next `kiln.Step()`.
- In the kit a component is writable only after the test says it is untracked (`Track`). Which components the game
  really tracks only the game can say: ask `WritePolicy` on a real server.
- `kiln.Capabilities.Override("world.ecs_write", false)` is a build without the writes.
- Not modelled: the client and prediction worlds, the engine's gate and its frames, torn copies, rollbacks and
  uncertain writes.

## Not yet checked

- The reads and writes have run only in Kiln's tests, against stand-ins for the game. No real game has run them yet.
- They work only on dedicated server 26430253 and client 26430625. Other builds answer `Unavailable`, and a game update
  turns them off until Kiln knows the new build.
- How long a write holds the gate on native Windows under load has not been measured yet.
- They stay experimental (`KILNX003`) until their in-game checks pass on both builds.

The reference is in Kiln's repository, `docs/kiln/services/world.md` ("World reads from task threads" and "World writes
from task threads"), with the guide in `docs/kiln/modding/tasks.md`, on [GitHub](https://github.com/frostdev-ops/kiln).
