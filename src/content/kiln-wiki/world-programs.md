---
title: "ECS world programs"
nav: "World programs"
description: "Declare scheduler access before boot, then bind a C# worker callback when the mod loads."
status: "pending"
updated: "2026-11-13"
---

> **New in 0.2.0-dev.20.** `EcsPrograms` and `kiln.world` v2 require the dev.20 runtime and MDK or newer.
> Client-world ECS programs remain unsupported; real-client replication remains unchecked.

Use ordinary tick events and service APIs when they express the work. A world program is for an ECS update with declared
component and event access, running on the game's worker threads. `EcsPrograms.Available` checks boot declaration/binding
support; `SupportsOtherWrites` checks tracked writes to another entity.

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

The file is strict JSON: no comments, trailing commas or duplicate keys, at most 64 KiB and 1..8 programs per mod. Programs share a 32-slot world-service limit and the game's remaining scheduler capacity. Changing
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
| `TryReadOther<T>`, `TryWriteOther<T>` | declared other-entity components |
| `ReadEvents(name)` | payload copies from that declared input stream; several input types are supported |
| `EmitEvent(name, bytes)` | a declared output with exact reflected size, less than 256 bytes; false when full |
| `QueueAdd`, `QueueRemove` | component changes at the end of the step |

Writes mark the game's replication/save tracking. That is not visual proof that a joined player saw a particular
change. A context or component span lasts only for its callback. Never call tick-thread game services, block, or keep a
component pointer from a worker callback. Post ordinary service work through `Context.Scheduler.Post`, rechecking the
world and the owning mod lifetime when it runs.

These boot declarations do not turn `OnLoad` into early boot, add a client-world EMF program path, or make old callback
handles usable after reload.

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

## Hooks around game systems

`GameSystems.Hook(name, before: callback, after: callback)` observes a real system update once per slice, on game worker
threads. Dispose on the tick thread; unload removes and drains the hook. A second hook for the same update function fails,
including differently named systems sharing that function. A hook has only the original system's access rights: it cannot
add scheduler permissions. `GameSystems.Profile` measures the existing runner separately. Missing symbols or a conflicting
runtime can make hooks unavailable. A callback exception disables the callback; check the log.

## Components at spawn

`SpawnOptions.Components` takes up to 64 `SpawnComponent.Of(name, bytes)` or unmanaged values, applied with a spawn before
its first tick. Check `Spawn.SupportsComponents`; each payload must match the reflected component size. There is one value
per component, and a `SpawnTime` override needs `SpawnFlags.NoTrack`. This is separate from `QueueAdd` / `QueueRemove`
inside a program, which alter the component set at the end of a later step.
