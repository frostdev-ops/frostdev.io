# Kiln tasks: heavy work off the game thread (dev.29.18+)

Wiki: [tasks](https://frostdev.io/kiln/wiki/tasks), [world reads from tasks](https://frostdev.io/kiln/wiki/tasks-world).
Pages in the repository: `docs/kiln/modding/tasks.md` (the guide), `docs/kiln/services/tasks.md` (limits, exit).
Samples: `mods/samples/FetchNearby`, `SampleTasks`. Seen in a real game on a hosting client; not yet on a dedicated
server, and task world writes not yet in a game.

Use a task for a search over many entities, path planning, a big calculation, files or the network. Not for a few
microseconds of work, not for work made of tick-only calls, not for something that must happen in this step.

## Project
```xml
<KilnFeatures>tasks.pool</KilnFeatures>          <!-- Kiln loads the mod only where the pool runs; without it KILN121 warns -->
<KilnServices>World;Items;Chat</KilnServices>    <!-- World for WorldConcurrent -->
```
A mod that also works without tasks leaves the feature out and asks `Capabilities.Is("tasks.pool")` first.

## Starting one
```csharp
[Command("scan", Description = "counts things near you")]
private string Scan(CommandContext c, Player player)
{
    if (Players.PositionOf(player.Entity) is not { } at) return "not in the world";   // copy values on the tick
    _ = Context.Tasks.Run<int>("scan", async ctx =>
    {
        var n = await WorldConcurrent.OrOnTick(ctx, () => CountFromTask(at), () => CountOnTick(at));
        ctx.Cancellation.ThrowIfCancellationRequested();
        await ctx.ToTick();                                    // the rest runs on the tick
        Chat.Tell(player.Entity, $"{n} found");
        return n;
    }, new KilnTaskOptions(Priority: KilnTaskPriority.Low));
    return "scanning";
}
```
- `Context.Tasks.Run(name, work, options)` returns a `KilnTask` (`KilnTask<T>` with a result) at once. It ends
  `Completed`, `Faulted` (`Fault`) or `Cancelled`. `await` it. `Wait()` is refused on the tick, on the game's main thread
  and inside a task; `.Result` throws until it has ended.
- `KilnTaskOptions(LongRunning: true)` for work of seconds or a loop until cancelled; `Priority` orders the mod's own
  queue. Limits: 2 running tasks per mod on the shared workers, 1024 not yet ended (`KilnTaskQueueFullException`),
  2 long-running per mod (8 in all).
- `task.Cancel()` reaches the work through `ctx.Cancellation`. Kiln cancels a mod's tasks when it unloads. A task's fault
  is logged once and does not count toward the mod's fault limit.

## Back to the tick
| | Does |
|---|---|
| `await ctx.ToTick()` | the rest of the method runs on the tick, until `await ctx.NextGateWindow()` |
| `await ctx.OnTick(() => ...)` | one function on the tick, its result back on the worker |
| `ctx.PostToTick(() => ...)` | hands a function to the tick and goes on at once |

- A task goes back to the world it started in: the server world from server code, the client world (main thread) from
  client code. `ToTick(WorldKind.Server)` names one. No such world here (the main menu, a joined client for the server
  world): `KilnUnavailableException` at once.
- Budget per step: server world 64 items or 2 ms per mod (4 ms for all mods), client world 64 items or 1 ms per mod.
  The rest waits for the next step. Hand back small pieces.
- dev.30+ (mod API 0.2.12) `ToTick(WorldKind.Menu)` / `OnTick(WorldKind.Menu, ...)` / `PostToTick(WorldKind.Menu, ...)`:
  the game's UI frame on a client while no world runs (main menu, between worlds), ~30/s, 64 items or 1 ms per mod
  (2 ms all). Only any-thread and main-thread UI APIs there: `Game.IsTickThread` is false, tick-only APIs throw
  `InvalidOperationException` ("menu hop"). A world's start cancels waiting menu hops (task ends `Cancelled`); each menu
  stretch is its own session. In a world or on a server: `KilnUnavailableException`. No `NextGateWindow(WorldKind.Menu)`
  (`ArgumentOutOfRangeException`). A task started in the menu on the main thread still belongs to the client world:
  name `WorldKind.Menu`.
- What may cross: values (`EntityId`, `ItemId`, `WorldPosition`, your own records). Not spans into component memory,
  lists Kiln reuses, or the `ModContext` of an unloading mod.
- Item moves, spawns and chat stay on the tick. Return a plan from the task and carry it out in tick code.

## World reads from a task: `WorldConcurrent` (Kiln.World)
- `Open(id)`, `Read<T>(entity, component)`, `ReadMany`, `ReadBytes`, `Query(in query, span)`, `Template`, `Validate`.
  Each read copies and checks the entity around the copy, and answers a `ConcurrentRead<T>` (`IsOk`, `Status`,
  `Value`). `ReadStatus`: `Ok`, `Absent`, `Stale`, `Unreadable` (try again), `Unavailable`, `SizeMismatch`, `TooSmall`,
  `Changed`, `Busy`, `Unsupported`. A miss never throws.
- Writes: `TryCompareExchange<T>(entity, component, expected, desired)`, made under the engine's write gate between
  frames; `WritePolicy(component)` says whether a type can be written; `CanWrite`. In tick code it is always busy.
- Works only on the two game builds Kiln has exact profiles for (server 26430253, client 26430625). Elsewhere
  `IsAvailable` is false and every call answers `Unavailable` (rows `world.ecs_read`, `world.ecs_write`). Always have a
  tick fallback: `WorldConcurrent.OrOnTick(ctx, offTick, onTick)`.
- Since 0.2.0-dev.30.7, mod API 0.2.16 (no longer experimental). First shipped in dev.29.18 with the
  `KILNX003` opt-in; neither mod nor test projects need it now. Old suppressions are harmless.
  Threading, bounds and capability checks are unchanged; unrelated experimental APIs retain their opt-ins.

## Analyzers
- KILN101: a tick-thread API inside a task's work.
- KILN105: `KilnTask.Wait()`, blocking on `AsTask()`, a `ToTick()` nobody awaits, a world read after
  `ConfigureAwait(false)` (the code has left the task), a compare-exchange in tick code. dev.29.18+ also any blocking wait
  in `[Command]` methods, `Commands.Register`/`Executes` handlers and `Chat.Received` handlers.
- KILN121: `Context.Tasks.Run` without `tasks.pool` in `KilnFeatures` or a capability check.

## Tests
Kiln.TestKit runs a mod's tasks on its own pool: `kiln.Tasks.Settle()` waits for them and steps the server while they
wait for the tick; `kiln.Tasks.Live` counts the running ones. `KilnHarnessOptions.Side` picks a dedicated server, a
hosting client or a joined client (`EnterWorld`, `LeaveWorld`, `OnMainThread`; dev.30+ `MenuFrame()` after `LeaveWorld` runs
one main-menu UI frame with its menu hops). `FakeWorld.BusyReads` / `BusyWrites`
make the next reads or writes answer busy, with no experimental opt-in.

## Native plugins (`kiln_tasks.h`)
The same pool. dev.29.19+ `KILN_TASK_RESIDENT`, only together with `KILN_TASK_LONG_RUNNING` (else
`KILN_ERR_INVALID_ARGUMENT` + `KILN_TASK_REFUSAL_ARGUMENT`), is for a body meant to run until it is cancelled (a
plugin's service loop). It holds one of the owner's two LongRunning threads; an owner has at most one resident task (a
second is refused the same way). The watchdog's running-too-long warning counts only from its cancellation, its first
start writes one kiln.log line, and its time is not in tick-stats' `cpu_ms` / `wall_ms`. Poll `run->cancelled(run)` at
least every 50 ms. The table's version and size are unchanged: an older Kiln refuses the flag with the same
`INVALID_ARGUMENT`, so retry without it. C# `KilnTaskOptions` has no resident flag.

## Not
Raw threads, `Task.Run` and code after `ConfigureAwait(false)` have no task scope: Kiln does not cancel them at unload,
and `WorldConcurrent` refuses them. At the game's exit Kiln cancels queued tasks and waits up to 500 ms for running
bodies: a task's end is not guaranteed at exit.
