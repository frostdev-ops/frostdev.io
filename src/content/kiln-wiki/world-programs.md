---
title: "ECS world programs"
nav: "World programs"
description: "Declare scheduler access before boot and bind a C# worker callback, run a program in a player's client world, or wrap the game's own programs."
status: "pending"
updated: "2026-11-19"
---

> **New in 0.2.0-dev.20.** `EcsPrograms` and `kiln.world` v2 require the dev.20 runtime and MDK or newer. Since
> 0.2.0-dev.29 a program can also run in a player's client world, and a mod can wrap the game's own programs; since
> 0.2.0-dev.29.18 also in the prediction storage. Those are on, not yet confirmed in a real game; real-client
> replication remains unchecked.

Use ordinary tick events and service APIs when they express the work. A world program is for an ECS update with declared
component and event access, running on the game's worker threads. `EcsPrograms.Available` checks boot declaration/binding
support; `SupportsOtherWrites` checks tracked writes to another entity. Heavy work of your own that needs no place in the
game's step (a search, path finding, IO) belongs in a [Kiln task](/kiln/wiki/tasks) instead, on Kiln's own workers.

## Declare before boot, bind in OnLoad

Ship `kiln.programs.json` at the mod root; Kiln.Sdk copies it for build, deploy and pack:

```json
{ "format": 1, "programs": { "count": {} } }
```

```csharp
private IDisposable? _program;
private int _updates;
public override void OnLoad()
{
    if (!EcsPrograms.Available) return;
    _program = EcsPrograms.Bind("count", _ => Interlocked.Increment(ref _updates));
}
public override void OnUnload() => _program?.Dispose();
```

The native service reserves the scheduler declaration before the world finalizes; ordinary `OnLoad` is too late for that.
`Bind` connects the current mod load to its own declared key. This default is a host-only system program: one callback
per step, no entity query. A tick handler can report `Volatile.Read(ref _updates)`.

The file is strict JSON: no comments, trailing commas or duplicate keys, at most 64 KiB and 1..32 programs per mod (8
before 0.2.0-dev.29). Kiln and all mods together may register 64 world programs (32 before); the last 8 are kept for
Kiln's own services and loaders. `World.GetProgramBudget()` reads what is left of Kiln's slots and of the world's own
table of 896, and kiln.log names who holds each slot. Changing
declarations needs a server restart. Dispose on the tick thread. Unload/disposal drains the callback and leaves an inert scheduler entry; a hot reload
may bind the same declaration again.

## Declare access

Lists are `tpl`, `tplOptional`, `read`, `readOptional`, `write`, `writeOptional`, `singletonsRead`, `singletonsWrite`,
`otherTpl`, `otherRead`, `otherWrite`, `with`, `without`, `anyOf`, `eventsIn` and `eventsOut`. `flags` defaults to `system`
and `hostOnly`. For an entity query, specify `flags: ["hostOnly"]` and a required query list; a system program cannot
also have an entity query.

Use real component/event names and exact unmanaged layouts from the installed API/catalog. Unknown names, invalid
combinations and access beyond the engine's limits are refused. Do not guess a struct layout or copy private offsets.

## Work inside the callback

| Method | Access |
|---|---|
| `TryRead<T>`, `TryWrite<T>` | declared current-entity components |
| `TryReadWritable<T>` | a component declared under `write`, read before or after you write it, without a second `read` entry (0.2.0-dev.29.18; typed: `TryGetWritable`) |
| `TryReadOther<T>`, `TryWriteOther<T>` | declared other-entity components |
| `ReadEvents(name)` | payload copies from that declared input stream; several input types are supported |
| `EmitEvent(name, bytes)` | a declared output with exact reflected size, less than 256 bytes; false when full |
| `QueueAdd`, `QueueRemove` | component changes at the end of the step |

Writes mark the game's replication/save tracking. That is not visual proof that a joined player saw a particular
change. A context or component span lasts only for its callback. Never call tick-thread game services, block, or keep a
component pointer from a worker callback. Post ordinary service work through `Context.Scheduler.Post`, rechecking the
world and the owning mod lifetime when it runs.

These boot declarations do not turn `OnLoad` into early boot or make old callback handles usable after reload.

`Spawn` and `Destroy` inside a program's callback or a wrap's stage are refused since 0.2.0-dev.29, with a message that
names `slice.Post` (or `Scheduler.Post`): creating an entity in the middle of the world's step changes the entity map
under the game's workers. Post them to the tick thread.

## In the player's client world

```json
{ "format": 1, "programs": { "glow": { "world": "client" } } }
```

```csharp
public override void OnLoad()
{
    var b = EcsPrograms.TryBind("glow", ctx => { /* this player's world only */ }, WorldKind.Client);
    if (!b.Ok) Log.Warn(b.Reason!);
}
```

New in 0.2.0-dev.29 (`world.programs.client`). A `client` or `both` mod can run a program of its own in a player's client
world (the local player, the camera, what this player sees) or in the prediction storage: `"world": "client"`, `"both"`
(one program in each world, each bound on its own) or `"prediction"` in `kiln.programs.json`. A file without the field
means the server world, as before. Bind it with `EcsPrograms.TryBind(key, callback, WorldKind.Client)` (or
`WorldKind.Prediction`) in `OnLoad`. The template `kiln-client-program` starts one.

- **It runs in that player's game only.** Other players and vanilla clients see nothing of it, so it is for what this
  player sees; a change others must see belongs in the server world. `TryWrite` there doesn't mark the write for the
  save or for replication, and `TryWriteOther` answers false.
- **Each client world anew.** The program is registered into every client world, hosted or joined, after the game's own
  programs. A name that world lacks refuses it there only (`EcsProgramRefusedEvent`, raised on the game's main thread in
  the next Pre), and the binding runs again in a later world that takes it.
- **Entity ids.** An entity the server sends keeps the server's id in a client world, on a joined client and on a host
  alike, so the id of a player's character that your server half has names that character in every client's world. Ids
  of entities a client makes by itself are its own.
- **Threads.** The callback runs on the game's workers or the main thread, several slices at once: no tick-thread API in
  it, UI work through `Client.Post`.
- A declaration rebuilt for another world needs a restart of the game. A bind where client programs are switched off
  throws `KilnUnavailableException` with the reason. Analyzer rule KILN109, `kiln lint` and the SDK check `"world"`.
- EMF mods: `register_program`, `register_program_def` and `on_event` with `EMF_WORLD_CLIENT` run in the client world
  through the same path, hosted or joined; a dedicated server refuses them as before.

**A client program on the game's entities** (checked for its first real use in 0.2.0-dev.29.18, against the game's
client build, not in a running game). For a program that changes how the game draws an entity it didn't make, a weapon
on a character for one:

- It runs after every game program it conflicts with, so a `SlotAttachment` you write is drawn from the **next** client
  step. To act in the same step, wrap the game's program instead: a client-world `BeforeEach` on `slot_attachment`
  ([below](#wrapping-the-games-programs)).
- `tpl` gives the entity's template value of a template component (`tpl: ["ModelResource"]`), as the game's own client
  programs use it.
- Kiln.Game's `Ecs.SlotAttachment`, `Ecs.EquipmentAnimationSets` and their enums are the game's layouts on the client
  too.

Only a real client shows that the write moves the model on screen.

## Wrapping the game's programs

```csharp
var made = Systems.Wrap("fuel_setup");
if (!made.Ok) { Log.Warn(made.Reason!); return; }
made.Wrap!.AfterEach((ref EntityView e) =>
{
    var fuel = e.Attribute("Fuel");
    fuel[0] = fuel[1];   // full
    fuel.Changed();      // the game's attribute formulas
});
```

New in 0.2.0-dev.29 (`Kiln.Systems`, add `Systems` to `KilnServices`). A wrap runs your code before, after or instead of
one of the game's own programs, by name, in the program's own place and on its own thread. A world program of your own
runs in a slot of its own with the access you declared; a wrap uses the wrapped program's own components, with no
declaration.

| | A world program (`EcsPrograms.Bind`) | `GameSystems.Hook` | A wrap (`Systems.Wrap`) |
|---|---|---|---|
| Runs | in its own scheduler slot | around a game update function, per slice | in the wrapped program's slot and thread |
| Access | what `kiln.programs.json` declares (needs a restart) | none of its own | the wrapped program's own components |
| Several mods | each has its own | one per update function | any number of Befores and Afters, one Replace per program |
| Writes | marked for the save | none | marked; `ComponentWrittenEvent` with `Writer = "<modid>/wrap:<program>"` |

- **Stages.** `Before`, `After` and `Replace` per slice; `BeforeEach` and `AfterEach` per entity, with an `EntityView`
  (`Has`, `Read`, `Write`, `Attribute`). `Replace` calls `Slice.RunOriginal()` to run the game's update. One `Replace`
  per program across all mods: a second is refused and names the mod that holds it.
- **Typed wraps.** `Systems.Wrap<Ecs.Programs.FuelSetup>()` gives a per-entity stage a typed view of the program and its
  components (802 views on this game build, in `Kiln.Game` under `Ecs.Programs`), checked against the running game: a
  program a game update changed is refused, and the reason names the lists that changed. `AroundEach(capture, apply)`
  runs your code on each entity just before and just after the game's own update. The sample `WaterWorks` (wells refill
  faster) shows it; `kiln new system-wrap` starts one.
- **Filters.** `When(...)` per slice and `WhenArchetype(has, lacks)` per archetype. A filter that can't decide turns its
  stage off with a reason instead of skipping every slice.
- **Threads.** Handlers can run on the game's worker threads as soon as a player is in the server world: tick-thread
  APIs throw inside them, use `slice.Post`. Each stage has 1 ms per slice, and ten slices in a row over it turn the stage
  off; a throw turns off that stage only.
- **Client world.** In a game client, `new WrapOptions { World = WorldKind.Client }` wraps the client world's programs
  (`systems.wraps.client`).
- **Prediction storage** (0.2.0-dev.29.18, mod API 0.2.10, `systems.wraps.prediction`, on where `systems.wraps.client`
  is). The player's own client runs the local character's server programs again in its prediction storage, and the
  player's own screen follows that: `equipment_visuals`, which sets the stance, is one of them. So a server wrap that
  changes what a player's own character does needs the same stage there to show on that player's screen.
  `new WrapOptions { World = WorldKind.Prediction }` gives `Before`, `After`, `BeforeEach` and `AfterEach` (typed views
  too), no `Replace`. Make it on Kiln's tick thread (on a host the server world's, not `Client.Tick`) once a client world runs: in the main menu `Wrap` answers
  `Ok = false`, so try again in a later tick. `Systems.Find(name, WorldKind.Client)` lists a program's prediction wraps
  with its client ones. Not yet run in a real game.
- Wraps are refused while native SET is loaded. List a program you replace under `"systems": { "replaces": [...] }` in
  [kiln.mod.json](/kiln/wiki/manifest#program-wraps-systems) for tools.

### A program of your own: `Systems.Define`

```csharp
[Query(Template = ["FuelSetup"], Write = ["Fuel"], HostOnly = true)]
public ref struct Containers : IQuery<Containers>
{
    public EcsProgramContext Context;
    public static Containers Bind(EcsProgramContext context) => new() { Context = context };
}

var r = Systems.Define("MyMod_Containers", new ProgramOptions { HostOnly = true }, (ref Containers c) => { /* ... */ });
if (!r.Ok) Log.Warn(r.Reason!);   // "not reserved at boot: rebuild the mod and restart the server"
```

The build writes each `[Query]` struct into `kiln.programs.json` (a wrong entry, or two structs with one key, stops the
build with KILN036), Kiln reserves it when the server starts, and `Systems.Define` binds your handler, which then runs
once per matching entity on the game's workers (`systems.define`). A `[Query]` that differs from what was reserved at
boot answers `Ok = false` and names the first difference: a rebuilt declaration is in the game only after a server
restart.

### When a world stops

When you leave a world, Kiln waits for the game's own jobs of that world before mods hear the world stop, on a game
client as on a server, so a wrap stage or a client-world program is not still running when its world is freed. The rows
`world.stop_drain.server`, `.client` and `.prediction` say whether this build has that wait; where it is missing, a
2-second safety wait is all there is. If the wait ever stalls, kiln.log says "still waiting for world jobs" after 5
seconds.

Program wraps run under `dotnet test` too: `KilnHarness.Programs` ([Tests without the game](/kiln/wiki/testing)).

## Tracked writes from the tick thread

```csharp
WorldWriteResult r = await World.Write(can, new Ecs.Fuel { /* ... */ });
if (!r.Ok) Log.Info(r.ToString());
await World.WriteField(entity, "ScaleComponent", "uniformScale", 1.5f);
```

New in 0.2.0-dev.27, no program needed. `World.Write`, `World.Update`, `World.WriteField` and `World.WriteAt` change a
component of an entity through the game's own write tracking: the change is saved with the world and is still there
after a restart. List the component types your mod writes under `"writes"` in [kiln.mod.json](/kiln/wiki/manifest)
(Kiln.Sdk adds the types your code writes). The write runs in the next simulation step, and the result says what became
of it. Capability `world.tracked_writes`; `ComponentWrittenEvent` follows a change.

- A write goes to the entity its id named at the call, never to another entity that got the id since.
- A value something else writes every step is written over one step later: the result says so (`Kept` is false) and
  names a Kiln water refill when one did it (`WrittenOverBy`).
- 512 writes run per step; all mods together share 91 component types. Tracked writes work in a server world only (a
  dedicated server or a hosting game).
- `World.TryWrite` still works and is obsolete: it is `World.WriteRaw` now, a raw store the game neither saves nor
  sends, for inputs the game reads in the coming step.
- From a task's worker, a plain component the game neither saves nor sends can be changed between frames by
  [compare-exchange](/kiln/wiki/tasks-world#writes-from-a-task) (0.2.0-dev.29.18, experimental).

## Hooks around game systems

`GameSystems.Hook(name, before: callback, after: callback)` observes a real system update once per slice, on game worker
threads. Dispose on the tick thread; unload removes and drains the hook. A second hook for the same update function fails,
including differently named systems sharing that function. A hook has only the original system's access rights: it cannot
add scheduler permissions. `GameSystems.Profile` measures the existing runner separately. Missing symbols or a conflicting
runtime can make hooks unavailable. A callback exception disables the callback; check the log. `Spawn` and `Destroy`
inside a `GameSystems.Hook` callback still go through, with a warning in kiln.log once per mod and call kind; a wrap
is the better place for new work.

## Components at spawn

`SpawnOptions.Components` takes up to 64 `SpawnComponent.Of(name, bytes)` or unmanaged values, applied with a spawn before
its first tick. Check `Spawn.SupportsComponents`; each payload must match the reflected component size. There is one value
per component, and a `SpawnTime` override needs `SpawnFlags.NoTrack`. This is separate from `QueueAdd` / `QueueRemove`
inside a program, which alter the component set at the end of a later step.
