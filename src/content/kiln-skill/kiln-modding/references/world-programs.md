# ECS world programs and wraps of the game's programs (dev.20+)

Use this only when ordinary tick events and service APIs cannot express the work. Wiki:
[world programs](https://frostdev.io/kiln/wiki/world-programs). Pages in the repository: `docs/kiln/modding/ecs-programs.md`,
`docs/kiln/services/systems.md`, `docs/kiln/services/world.md`. Every callback here runs inside the game's step, often
on its worker threads: never call tick-thread services there, never keep a span or pointer past the callback, and send
service work back with `Context.Scheduler.Post` (or `slice.Post` in a wrap).

## Boot declarations: `kiln.programs.json` + `EcsPrograms.Bind`
Ship strict JSON at the mod root; Kiln.Sdk copies it for build, deploy and pack:

```json
{ "format": 1, "programs": { "count": {} } }
```

The native service reserves this scheduler declaration before worlds finalize. Bind that key in `OnLoad`:

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

Here the default is a host-only system program (one worker callback per step, no entity query). A tick handler can read
`Volatile.Read(ref _updates)` to report it. Do not log or call tick-thread game services from every worker callback.

Declarations support `tpl`, `tplOptional`, `read`, `readOptional`, `write`, `writeOptional`, `singletonsRead`,
`singletonsWrite`, `otherTpl`, `otherRead`, `otherWrite`, `with`, `without`, `anyOf`, `eventsIn`, `eventsOut`, `flags`,
and dev.29+ `world`. For an entity query, specify `flags: ["hostOnly"]` and a required query list; do not keep the default
`system` flag with an entity query. Match real component and event names and exact layouts from the installed API and
catalog; never guess sizes or copy private engine offsets.

Inside the callback, `TryRead<T>` / `TryWrite<T>` use declared current-entity access; `TryReadOther<T>` /
`TryWriteOther<T>` declared other-entity access. dev.29.18+: `TryReadWritable<T>(component, out v)` /
`TryGetWritable<T>(out v)` read a component declared under `write`, before or after writing it, without a second `read`
entry. They take the component size from kiln.types: without it they return false and the mod log says so once per
program. Writes mark the game's save and replication tracking (server world). `ReadEvents(name)` returns payload
copies for each declared input. `EmitEvent(name, bytes)` uses a declared output with the exact payload size (under 256
bytes) and returns false when full. `QueueAdd` / `QueueRemove` apply at the end of the step.

The file is strict JSON (no comments, trailing commas or duplicate keys), at most 64 KiB, 1 to 32 declarations per mod
(8 before dev.29). All mods and Kiln share 64 program slots (32 before dev.29; the last 8 are Kiln's), plus the game's
own table (`World.GetProgramBudget()`). Changing declarations needs a restart. Dispose on the tick thread. Unloading
drains bound callbacks and makes the entry inert; a hot reload binds the same declaration again.

## A program in the player's client world (dev.29+)
- Declare it with `"world": "client"`, `"both"` or `"prediction"` and bind it in `OnLoad` of a client or both mod:
  `EcsPrograms.TryBind(key, callback, WorldKind.Client)` → `EcsProgramBinding` (`Ok`, `Reason`, `Handle`). Template
  `kiln new client-program`.
- It runs in that player's game only; nobody else sees what it does. In a client world `TryWrite` marks nothing for the
  save or replication, and `TryWriteOther` answers false.
- Bind on the game's main thread: `OnLoad` (a client mod loads in the main menu) or `Client.Post` work. KILN109 warns
  about a client bind off that thread; on a host the server's tick thread is not the main thread.
- Entities the server sends keep the server's ids in a client's world. A `SlotAttachment` write by a client program is
  drawn from the next client step (dev.29.18 notes).
- Seen in a real game (dev.29.18): a mod's program registered in the player's own world.

## Wrap the game's own programs: `Kiln.Systems` (dev.29+)
```csharp
if (!Capabilities.Is("systems.wraps") || Systems.Find("fuel_setup") is null) return;   // no world yet: try at a later step
var made = Systems.Wrap("fuel_setup");
if (!made.Ok) { Log.Warn($"no wrap: {made.Reason}"); return; }
_wrap = made.Wrap!.After((ref Slice slice) => slice.Post(() => Log.Debug("fuel_setup ran")));
```
- Stages: `Before`, `After`, `Replace` (one per program) per slice; `BeforeEach`, `AfterEach` per entity with an
  `EntityView` (`Has`, `Read`, `Write`, `Attribute`); `WhenArchetype(has, lacks)`. Writes through a view reach the save
  and other players and raise `ComponentWrittenEvent` (`Writer = "<modid>/wrap:<program>"`); `Attribute32.Changed`
  runs the game's attribute formulas. Dispose the wrap on unload.
- Typed: `Systems.Wrap<Ecs.Programs.FuelSetup>()` (Kiln.Game, `Game` in `KilnServices`) with `AroundEach(capture, apply)`.
  A program a game update changed is refused with the lists that changed. Sample `WaterWorks`; template
  `kiln new system-wrap`.
- Make a wrap on a running world, from the tick thread. Handlers run on the game's workers once a player is in the
  world: tick-thread APIs throw inside them. A throw turns that stage off. Wraps are refused while native SET is loaded.
- `Spawn` and `Destroy` inside a stage are refused: use `slice.Post`.
- Client world: `new WrapOptions { World = WorldKind.Client }`. dev.29.18+ prediction storage:
  `WorldKind.Prediction` (`Systems.PredictionCapability`), Before and After stages only. The player's own client runs
  the local character's server programs again there, so a server wrap that changes what a player's own character does
  needs the same stage there to show on that player's screen. Make it while a client world runs, on Kiln's tick thread.
- dev.29.18+: a wrap's write in the client world or the prediction storage to a slot the game has no tracker for is
  written unmarked, as the game does, instead of throwing.

## A program of your own over a query: `Systems.Define` (dev.29+)
Write a `[Query(...)]` struct (`IQuery<T>`). The build writes it into `kiln.programs.json` (KILN036 on a bad entry)
under the attribute's `Key`, or the struct's full name with `.` and `+` as `_` (`MyMod.Containers` → `MyMod_Containers`);
pass that key to `Define`,
the server reserves it at start, and `Systems.Define<T>(key, options, (ref T q) => ...)` binds the handler, once per
matching entity on the game's workers. A key not reserved at boot, or a `[Query]` changed since, answers `Ok = false`:
rebuild and restart the server. Capability `systems.define`.

## Tests
`KilnHarness.Programs` (Kiln.TestKit) declares the game programs a mod wraps and runs its stages over the fake world's
entities each step. It does not model `Systems.Define`, client-world wraps, worker threads or a native fault.

## Hooks around game systems
`GameSystems.Hook(name, before: callback, after: callback)` observes a real system update once per slice, on game worker
threads. Dispose on the tick thread; unload removes and drains the hook. A second hook for the same update function fails.
A hook has only the original system's access rights. `Spawn`/`Destroy` inside it still go through with a kiln.log
warning (dev.29+); prefer a wrap. A callback exception disables the callback; check the log.
