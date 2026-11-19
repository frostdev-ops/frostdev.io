---
title: "Tasks: work off the game thread"
nav: "Tasks"
description: "Run a mod's heavy work (a search, path finding, a big calculation, files, the network) on Kiln's worker threads, and hand the result back to the game's tick in small pieces."
status: "pending"
updated: "2026-11-18"
---

> **New in 0.2.0-dev.29.18** (mod API 0.2.10). Not yet checked in a real game: the C# side of tasks, the hops back to
> the tick and the [world reads and writes](/kiln/wiki/tasks-world) have run only in Kiln's tests, against stand-ins
> for the game. The exit order has not run on native Windows. See [Not yet checked](#not-yet-checked).

A mod's tick handlers, event handlers and commands run on the game's tick thread, and every millisecond they take comes
out of the frame. A dedicated server steps its world about 24 times a second, so the game and every mod share about
41 ms a step. A Kiln task moves the heavy part of the work onto Kiln's own worker threads and brings the result back to
the tick in small pieces.

The sample `FetchNearby` shows the whole pattern: `/fetch <item> [count]` looks for the containers near a player in a
task, and the mod's tick code moves the items.

## Project setup

```xml
<PropertyGroup>
  <KilnServices>World;Items;Chat</KilnServices>
  <!-- Kiln loads the mod only where its task pool runs -->
  <KilnFeatures>tasks.pool</KilnFeatures>
  <!-- only for the world reads and writes from tasks, which are experimental -->
  <NoWarn>$(NoWarn);KILNX003</NoWarn>
</PropertyGroup>
```

- **`<KilnFeatures>tasks.pool</KilnFeatures>`** puts `"features": ["tasks.pool"]` in kiln.mod.json, so Kiln loads the
  mod only where its task pool runs. The `kiln-mod` template has the line as a comment. Without it, KILN121 warns at
  every `Context.Tasks.Run`. A mod that also works without tasks leaves the line out and asks
  `Capabilities.Is("tasks.pool")` before it starts one.
- **`World`** goes in `<KilnServices>` when your tasks read or write the world.
- **`KILNX003`** opts in to `WorldConcurrent`, the [world reads and writes from tasks](/kiln/wiki/tasks-world#kilnx003-the-opt-in).
  A mod that doesn't use them leaves it out. Put the same `NoWarn` line in the test project when its tests call them
  (the `kiln-unit-test` template has it as a comment). `KILNX001`, the lab members' id, doesn't opt in to them.

## What to run as a task

A task is for work that takes long and needs little of the game while it runs:

- a search over many entities, with the [world reads](/kiln/wiki/tasks-world);
- path finding, planning, sorting, compressing, hashing;
- reading and writing files, talking to a web service.

What stays on the game thread:

- work of a few microseconds: the trip to a worker and back costs more;
- work made of tick-only calls (moving items, spawning, chat): it has to run on the tick anyway;
- anything that must happen in this very step: a task's result comes back in a later step;
- changes to the world: `World.Write`, `Items.Give` and the rest run on the tick. The one exception is a
  [compare-exchange write](/kiln/wiki/tasks-world#writes-from-a-task) of a plain component the game neither saves nor
  sends.

Tasks run on a dedicated server and in a player's game, hosting a world or joined to someone else's.

## A task

```csharp
private KilnTask? _route;

[Command("route", Description = "plans a route to your marker")]
private string Route(CommandContext c)
{
    if (!Chat.Available) throw new CommandException("chat is off on this server");
    var player = c.Source.Player;
    var from = World.Position(player) ?? throw new CommandException("you are not in the world yet");
    var to = _marker;                                       // the mod's own data
    _route?.Cancel();                                       // a new request replaces the last one
    _route = Context.Tasks.Run("route", async ctx =>
    {
        var steps = PlanRoute(from, to, ctx.Cancellation);  // on a worker: take the time it needs
        await ctx.ToTick();                                 // the rest of the method runs on the tick
        Chat.Tell(player, $"{steps.Count} waypoints");      // tick-only APIs work here
    });
    return "planning";
}
```

On the tick, copy what the task needs (here the player's id and position), then start it. `Context.Tasks.Run` returns a
`KilnTask` at once. The work gets a `KilnTaskContext`, `ctx` here. The name is what kiln.log and the statistics show.

- **Plain or async.** The work can be a plain method or an `async` one. `Context.Tasks.Run<T>` with an `async` lambda
  that returns a `T` gives a `KilnTask<T>`.
- **Results.** `await task` gives the result, or throws the task's exception or `OperationCanceledException`. A task
  ends `Completed`, `Faulted` (`Fault` holds the exception) or `Cancelled`; `State` says which. `KilnTask<T>.Result`
  throws until the task has ended.
- **Never wait for one.** `Wait()` is refused on the tick, on the game's main thread and inside a task. Await it.
- **Faults.** An exception that ends a task faults that task only. kiln.log says `task '<name>' faulted: ...` once,
  under your mod's name, and it doesn't count toward the [faults](/kiln/wiki/debugging#faults-and-crash-reports) that
  switch a mod off.

### Options and limits

```csharp
Context.Tasks.Run("prices", async ctx =>
{
    while (true)
    {
        Volatile.Write(ref _prices, await FetchPricesAsync(ctx.Cancellation));   // read by the tick code
        await Task.Delay(TimeSpan.FromMinutes(5), ctx.Cancellation);
    }
}, new KilnTaskOptions(LongRunning: true));
```

- **`LongRunning: true`** is for work that runs for seconds or longer, or loops until it is cancelled: it gets a thread
  of its own instead of holding one of the shared workers.
- **`Priority`** (`KilnTaskPriority.Low`, `Normal`, `High`) orders your own mod's queued tasks. It never gives a mod
  more than its share.
- **Per mod:** 2 tasks at once on the shared workers (a task waiting at an `await` doesn't count), 1024 tasks that have
  not ended (`KilnTaskQueueFullException` past that) and 2 long-running ones. All mods together run 8 long-running tasks
  by default.

## What a task may touch

- Its own data, .NET and IO: everything that isn't the game's.
- Members marked `[AnyThread]`, for example `Players.All`, `Context.Tasks.Run` and `ctx.Cancellation`.
- The [world reads](/kiln/wiki/tasks-world) (`WorldConcurrent`), which are made for this.

Everything else that touches the game belongs to the tick: members marked `[TickThreadOnly]` and the APIs documented
"tick thread" (`World.Position`, `Items.Read`, `Chat.Tell`, ...). Off the tick they throw `InvalidOperationException`.

**Pass values, not live views.** `EntityId`, `ItemId`, `WorldPosition`, numbers and your own records can cross between
the tick and a task. Spans and pointers into component memory, lists Kiln reuses, and the `ModContext` of a mod that
unloads can't: copy what you need on the tick, then start the task with the copy.

**Raw threads and `Task.Run`** are not tasks. Kiln doesn't track them, an unload leaves them running against unloaded
code, and the world reads refuse them. Use `Context.Tasks.Run`.

## Back to the tick

```csharp
Context.Tasks.Run("stock", async ctx =>
{
    ctx.PostToTick(() => Chat.Tell(player, "working on it"));                // hand it over, go on at once
    var has = await ctx.OnTick(() => Items.Read(chest)?.Count(wood) ?? 0);  // one call, its result back here
    await ctx.ToTick();                                                     // the rest on the tick...
    Chat.Tell(player, $"{has} wood");
    await ctx.NextGateWindow();                                             // ...until this takes it back to a worker
});
```

| | What it does | Use it for |
|---|---|---|
| `await ctx.ToTick()` | the rest of the method runs on the tick, and stays there (later awaits come back to the tick) | a stretch of tick-only work |
| `await ctx.OnTick(() => ...)` | runs one function on the tick and gives its result back; the method goes on on its worker | one tick-only read or call |
| `ctx.PostToTick(() => ...)` | hands a function to the tick and goes on at once | telling the tick something; the task ends only once its posts ran |
| `await ctx.NextGateWindow()` | goes back to a worker after a later step, without holding a worker while it waits | leaving the tick; retrying a world read or write that met a busy frame |

A hop runs in a later step, before the mods' `Tick.Pre` handlers. Each step, a mod's hops and posts get up to 64 items
or 2 ms, and all mods together 4 ms; in a client world, 64 items or 1 ms per mod and 2 ms for all. What doesn't fit
waits for the next step and is never dropped. So hand back small pieces: a 30 ms `OnTick` costs the very frame the task
was meant to save.

**When a hop can't happen:**

- **The task was cancelled** (by `Cancel()`, the mod's unload or its world stopping): the hop never runs. The await
  throws the task's own `OperationCanceledException`, the task ends `Cancelled`, kiln.log says nothing, and your
  `finally` blocks still run, on a worker. A queued `PostToTick` is dropped.
- **No world of that kind here, and the task has none yet**: the main menu, the server world on a player joined to
  someone else's server, the client world on a dedicated server. The call throws `KilnUnavailableException` at once,
  naming `tasks.pool`. The task is not cancelled: a world may still come.

**Move items on the tick, not in the task.** A move is two transactions, a take and a give, each answered in a later
step. An unload or a world stop between them would stop the rest of the method and leave the items taken but not given.
FetchNearby's task returns a plan instead, and the mod's tick code awaits the task (`sources = await search;`) and moves
the items. A fetch cancelled before the plan moves nothing.

## The client world

A task belongs to the world it was started in, and its hops go back there. `ctx.TickWorld` says which.

| Started from | Its hops go to |
|---|---|
| a dedicated server's tick code: `Tick.Pre`, events, commands, `OnLoad` | the server world |
| a hosting player's server-side code: `Context.Tick`, events, chat commands, a server mod's `OnLoad` | the server world |
| the game's main thread: `Client.Tick`, `Client.Post`, Kiln's UI callbacks, `Context.Tick` on a joined client, a client or `both` mod's `OnLoad` in the main menu | the client world, on the game's main thread |
| inside a task | its parent's world |
| anywhere else: `Task.Run`, your own threads | the server world |

The overloads with a `WorldKind` name the other world: `ToTick(WorldKind.Client)`, `OnTick(WorldKind.Server, ...)`,
`PostToTick(WorldKind.Client, ...)`, `NextGateWindow(WorldKind.Client)`. `WorldKind.Prediction` is no hop target.

```csharp
// started on the game's main thread, so the task's own world is the client world
Context.Tasks.Run("from-client", async ctx =>
{
    try
    {
        await ctx.ToTick(WorldKind.Server);   // the server world of a player who hosts
        Chat.Tell(player, "hello from the client");
    }
    catch (KilnUnavailableException)
    {
        // joined to someone else's server: there is no server world here
    }
});
```

- **Where a client-world hop lands.** On the game's main thread, at the client world's step, before that step's
  `Client.Tick` handlers. On a joined client that is the mods' tick (`Game.IsTickThread` is true). On a client
  that hosts it is main-thread work like a `Client.Tick` handler, and the server world's tick-only APIs (`Items.Read`,
  `Chat.Tell`) need `ToTick(WorldKind.Server)`.
- **A task stays with its world.** It is bound to one session per world kind and never comes into a later world of that
  kind. When the player leaves, joins another server or quits to the menu, the task's hops there end it `Cancelled`. A
  task that only computes and never hops back runs on and finishes. On a client that hosts, the client world stops first
  and the server world about half a second later.
- **`Client.Post` is not a hop.** It still works from a task, but the task doesn't track it, doesn't cancel it and
  doesn't count it in the budget. Use `PostToTick(WorldKind.Client, ...)` when the task should track it. Don't
  `await Client.NextTick()` in a task: the rest of the method would leave the task. Write
  `await ctx.ToTick(WorldKind.Client)`.

**A loop that hops runs once per world.** Start it from code of the world it serves, and start a new one in the next
world:

```csharp
// a Client.Tick handler: each client world starts its own loop at its first step
private void OnClientTick(in TickInfo t)
{
    if (_marksWorld == Client.ClientWorldSession && _marks?.State is KilnTaskState.Queued or KilnTaskState.Running) return;
    _marksWorld = Client.ClientWorldSession;
    _marks = Context.Tasks.Run("marks", async ctx =>
    {
        while (true)
        {
            var marks = ComputeMarks();       // on a worker
            await ctx.ToTick();               // this client world's step, on the game's main thread
            _shown = marks;                   // once that world has stopped, the loop ends Cancelled at the hop
            await ctx.NextGateWindow();       // back to a worker after the next step
        }
    }, new KilnTaskOptions(LongRunning: true));
}
```

A server-side loop does the same from `ServerStartedEvent` or the world's first `Context.Tick`. A loop for the mod's
whole life, like the prices above, doesn't hop: it publishes through a field the tick code reads, so no world can end
it, only the unload.

## Cancellation and unload

- **`task.Cancel()`** asks a task to stop. The work sees it through `ctx.Cancellation`: a long loop calls
  `ctx.Cancellation.ThrowIfCancellationRequested()`. An `OperationCanceledException` of that token ends the task
  `Cancelled`.
- **When a mod unloads or reloads**, before its `OnUnload`, Kiln takes no new task of it, ends its queued tasks
  `Cancelled` without running them, and signals the running and waiting ones through `ctx.Cancellation`. Their hops and
  posts never run. Their `catch` and `finally` blocks still run, on a worker.
- **The unload never waits on the tick.** The mod's code stays loaded until its tasks have ended. A task still running
  2 s later is named once in kiln.log, and the old code unloads when it ends. A reload loads the new copy at once, while
  the old tasks finish beside it.

```csharp
public override void OnUnload() => _route?.Cancel();   // Kiln cancels a mod's tasks at unload anyway
```

## At exit

When the game or the server exits, queued tasks may never start, and neither a task's end nor its `finally` blocks are
promised. Don't rely on a task to save at exit: save on the tick, in `OnUnload` or as you go.

Kiln's exit steps run in this order on every platform:

1. New tasks are refused.
2. On a normal exit, every mod's queued tasks are cancelled and its running ones are signalled.
3. Kiln's own services stop. The engine's write gate closes for good, so no task can write the world any more.
4. The task pool parks: no task starts after this. Kiln waits up to 500 ms for the tasks still running and names any
   that are left in kiln.log (`kiln.tasks: parked at exit`).
5. Native plugins' `on_unload` handlers run.

| | Under Wine and Proton (Linux servers, the Steam Deck) | On native Windows |
|---|---|---|
| Kiln's own steps 1 to 4 | run | run |
| native plugins' `on_unload` | run, after the park | only with `"unloadAtExit": "on"` in `kiln/kiln.json`; the default, `"auto"`, runs Kiln's own steps only |

`"unloadAtExit": "off"` places no exit step anywhere: the process exit just ends the pool's threads. **The exit on
native Windows has not run on Windows yet.** Under Wine it has run in Kiln's tests.

## Analyzer warnings

The analyzers follow a task's hops: code after `await ctx.ToTick()` is on the tick, code after
`await ctx.NextGateWindow()` is back on a worker.

```csharp
Context.Tasks.Run("loot-scan", async ctx =>
{
    var found = Scan(area);                  // a worker: compute and IO are fine here
    Chat.Broadcast("scan done");             // KILN101: a tick-thread API on a task worker
    ctx.ToTick();                            // KILN105: never awaited, so it hops nothing
    await ctx.ToTick();
    Chat.Broadcast($"{found} found");        // on the tick after the hop: fine
    await ctx.NextGateWindow();
    Chat.Broadcast("applied");               // KILN101: NextGateWindow took the work back to a worker
});
```

- **KILN101**: a tick-thread API in a task's work. Hop first (`await ctx.ToTick()`), or hand the call over with
  `ctx.PostToTick(...)` or `ctx.OnTick(...)`.
- **KILN105** in and around tasks:
  - blocking on a task: `KilnTask.Wait()`, or `.Result`, `.Wait()` and `GetAwaiter().GetResult()` on the `Task` from
    `AsTask()`. Await the `KilnTask` instead;
  - a `ctx.ToTick()` nobody awaits;
  - `await Client.NextTick()` inside a task: write `await ctx.ToTick(WorldKind.Client)`;
  - a world read or write where the task's scope is gone: after `ConfigureAwait(false)`, in `Task.Run` or in a thread
    of your own. Drop `ConfigureAwait(false)` (a task's awaits already come back into the task), or
    `await ctx.NextGateWindow()` first;
  - a compare-exchange write in tick code, where it is always `Busy`.
- **KILN121**: `Context.Tasks.Run` in a mod without `tasks.pool` in `<KilnFeatures>` and without a capability check.

Not caught: an awaitable configured in one place and awaited in another (`var later = io.ConfigureAwait(false); ...
await later;`). Write `ConfigureAwait` where you await. More on the analyzers: [Lint and analyzers](/kiln/wiki/lint#c-analyzers).

## In kiln.log and the statistics

- A watchdog writes one warning for a task that runs, or waits in the queue, for more than 30 s. It never stops a task.
- A worker running a task is named `<mod>/<task>`, which a debugger shows, and crash reports list the running tasks.
- Once a minute, `kiln/logs/tick-stats.jsonl` gets a `"tasks"` object: per mod, the tasks queued, running, completed,
  faulted and cancelled, their CPU and wall time and the longest piece of work, and what came back to the tick. Compare
  a mod's CPU time in tasks with the tick time it no longer spends to see what the move bought.

**Settings** in `kiln/kiln.json`: `"tasks": {"workers": 2}`. A `"tasks"` block in the file's
`"server"` or `"client"` section changes only that side.

| Key | Range | Default |
|---|---|---|
| `workers` | 1 to 8 | a quarter of the CPU cores, 1 to 4 |
| `long_running_global` | 1 to 16 | 8 |
| `watchdog_running_s` | 5 to 600 | 30 |
| `watchdog_queued_s` | 5 to 600 | 30 |

A value of the wrong type or out of range gives the default and one warning in kiln.log. The per-mod limits are fixed.

## Testing

`Kiln.TestKit` runs a mod's tasks under `dotnet test` ([Tests without the game](/kiln/wiki/testing#tests-without-the-game)):

```csharp
[Fact]
public void The_route_comes_back_to_the_player()
{
    using var kiln = new KilnHarness();
    kiln.Load<MyMod.MyModMod>();
    var ada = kiln.Players.Join("Ada", position: new WorldPosition(10, 0, 10));
    kiln.Step();
    kiln.RunCommand(ada, "route");
    kiln.Tasks.Settle();                   // runs the mod's tasks to their end, stepping for their hops
    Assert.Contains(ada.Chat, l => l.Text.Contains("waypoints"));
}
```

- **The workers** are two real threads, as on Kiln's pool. Hops run in the harness's steps, before `Tick.Pre`, and
  `NextGateWindow` resumes after a step.
- **`kiln.Tasks.Settle()`** waits while the tasks work and steps whenever all of them wait for the tick, until every
  task has ended. It returns the steps it took. A task that never ends fails the test with a `TimeoutException` that
  names it (after 10 s or 1000 steps; `Settle(maxSteps, timeout)` sets both), so a loop for the mod's whole life fails
  it too. `kiln.Tasks.Live` counts the tasks that haven't ended.
- **Not modelled:** the per-mod limits and the per-step budgets.
- **The joined and the hosting client.**
  `new KilnHarness(new KilnHarnessOptions { Side = HarnessSide.JoinedClient })` has no server world, so a server-world
  hop throws `KilnUnavailableException` and your fallback runs; the client world steps on the harness's tick thread.
  `HarnessSide.HostingClient` has both worlds, the client world on a main thread of its own: `kiln.OnMainThread(...)`
  runs code there, and a task started there comes back there. `kiln.LeaveWorld()` and `kiln.EnterWorld()` end and
  start the worlds' sessions, as leaving and hosting or joining again do.
- **World reads and writes** in tests: `kiln.Entities.BusyReads`, `BusyWrites` and the rest are on
  [their page](/kiln/wiki/tasks-world#testing).

## Native plugins: kiln.tasks

A native plugin gets the same pool, with the same per-owner limits, through the service `kiln.tasks`, version 1
(`native/core/abi/services/kiln_tasks.h`):

```c
static void KILN_CALL scan(const KilnTaskRun* run, void* user) {
    for (int i = 0; i < 1000 && !run->cancelled(run); i++) { /* your own work; no game calls */ }
}
static void KILN_CALL scan_done(KilnHandle task, uint32_t state, void* user) {
    /* exactly once, on a pool worker: free `user` here */
}

/* in kiln_plugin_main */
const KilnTasksApi* tasks = (const KilnTasksApi*)api->service((KilnStr){"kiln.tasks", 10}, 1);
KilnTaskInfo info = {sizeof info, KILN_TASK_AFTER_STEP, {"scan", 4}, KILN_TASK_PRIORITY_NORMAL, 0};
KilnHandle task = 0;
uint32_t refusal = 0;
if (tasks && tasks->header.size >= 56)   /* submit_in was appended: check the size first */
    tasks->submit_in(owner, &info, KILN_WORLD_CLIENT, 0, scan, scan_done, NULL, &task, &refusal);
```

- **`submit`** queues a body. It runs on a pool worker, never on a game thread, and its `done` runs exactly once after
  it, also on a pool worker. A body touches the game only through members documented as callable from any thread; the
  rest goes back with `KilnApi.post` or `post_world`.
- **`submit_in`**, appended to the table, binds a task to one session of `KILN_WORLD_SERVER` or `KILN_WORLD_CLIENT`
  (session 0: the one live now). It is refused (`NO_WORLD`) when that world has no such live session, and a task still
  queued when that session ends is cancelled, with its `done`. With `KILN_TASK_AFTER_STEP` it waits for that world's
  next step. The table is 56 bytes with it, 48 without: check `header.size` before you call it.
- **`cancel`, `status`, `release` and `drain_owner`.** `release` frees a finished task's record and may run inside its
  `done`. At unload, `drain_owner(owner, 0, &running)` on the tick seals the plugin and cancels its queued tasks without
  waiting; a drain with a timeout only off the tick.
- **Faults.** A native fault in a body quarantines the plugin: its queued tasks are cancelled and new ones are refused.
  **A stack overflow in a native body is not yet confirmed contained on native Windows.** Under Wine and Proton it is
  not caught: the worker stays stuck, the watchdog names the task, only that plugin's slots are held, and the exit
  leaves the worker behind.
- **At exit** a `done` is not promised: free what you must in `on_unload`, and don't wait for your own tasks there.

## Not yet checked

- The C# side of tasks, the hops back to the tick in both worlds and the
  [world reads and writes](/kiln/wiki/tasks-world) have run only in Kiln's tests, against stand-ins for the game. No
  real game has run them yet.
- The exit order has run under Wine in Kiln's tests, not on native Windows.
- A stack overflow in a native task body is not yet confirmed contained on native Windows.
- The world reads and writes work only on the exact game builds Kiln knows: dedicated server 26430253 and client
  26430625. Other builds answer `Unavailable`. The task pool itself doesn't depend on the game build.

The full guide is in Kiln's repository, `docs/kiln/modding/tasks.md`, and the pool's contract (limits, states, settings,
exit, the native table) in `docs/kiln/services/tasks.md`, on [GitHub](https://github.com/frostdev-ops/kiln).
