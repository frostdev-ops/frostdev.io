---
title: "Building input: build as the local player"
nav: "Building input"
description: "BuildingInput in Kiln.Client: select, place, remove, undo and dismantle through the local player's own building input. The server still checks permissions, resources and range. New in 0.2.0-dev.30.3."
status: "partial"
updated: "2026-11-21"
---

> **New in 0.2.0-dev.30.3 (mod API 0.2.13).** A supported Kiln API on the current game client (build 26430625).
> Kiln hooks the game's building input only when a mod first uses it, so nothing changes for players without such a
> mod. Tested with Kiln's host tests, C# tests and Windows tests of the input path; **not checked in a real game yet**.
> If a mod builds the wrong thing, or nothing, tell us with your kiln.log.

Building input lets a client mod build the way the player builds: pick a building item, place, remove, undo, and
dismantle a prop. Kiln writes the request into the local player's ordinary input, as if the player had pressed the
keys. Nothing is placed by the mod itself.

So the game treats it like the player's own input:

- **The server still checks everything.** Permissions, resources, range, the recipe and the placement are checked as
  for any player's input. A request that is `Dispatched` was sent as input; it says nothing about whether the server
  built anything.
- **Only the local player.** A request moves the player of this game. There is no way to build for another player, or
  on a dedicated server.
- **One at a time.** The whole client has one request slot, shared by every mod and by Kiln's ShroudForge interpreter.

To change the world from the server, without a player, use [World edits](/kiln/wiki/world-edits).

## Ask first

`BuildingInput.Available` is true when the capability `client.building_input` is available and this Kiln has the
calls. `Capabilities.Why("client.building_input")` says why not:

| Row | Why |
|---|---|
| `available` | a game client on a build Kiln has mapped: today client 26430625 |
| `symbol-missing` | Kiln has not mapped the building input for this exact client build (an older or newer game update) |
| `wrong-side` | a dedicated server |
| `service-missing` | Kiln.Client did not start |
| `policy` | Kiln started in safe idle |

When the row is off, every call throws `KilnUnavailableException` naming `client.building_input`. A mod that can't do
anything without it names `client.building_input` in `KilnFeatures`, so Kiln doesn't load it where the row is off
([Code mods](/kiln/wiki/code-mods)).

## In C#

`BuildingInput` is in Kiln.Client (`Client` in `KilnServices`). It works from any thread and never waits for the game.

```csharp
if (!BuildingInput.Available) return;                    // ask first (see above)

var r = BuildingInput.Select(plank, slot: 0);            // ItemId, actionbar slot 0..255
if (!r.Ok) { Log.Info(r.Reason); return; }               // Busy, Stale, NoLocalPlayer, ...
while (r.Request!.State is BuildingInputState.Queued or BuildingInputState.Pressed)
    await Client.NextTick();

r = BuildingInput.Place(at, Quaternion.Identity);        // WorldPosition (metres), System.Numerics.Quaternion
```

| Member | Does |
|---|---|
| `BuildingInput.Select(item, slot, material = default, expectedSession = 0)` | puts a building item, and a material, in an actionbar slot |
| `BuildingInput.Place(position, rotation, scale = null, expectedSession = 0)` | the primary building action at a transform |
| `BuildingInput.Remove(position, rotation, scale = null, expectedSession = 0)` | the secondary building action at a transform |
| `BuildingInput.Undo(expectedSession = 0)` | the game's own building undo |
| `BuildingInput.Dismantle(prop, position, rotation, scale = null, expectedSession = 0)` | dismantles one exact prop |
| `BuildingInput.Available`, `BuildingInput.Capability` | the row is available and this Kiln has the calls |

Each call returns a `BuildingInputResult` (`Ok`, `Reason`, `Refusal`, `Request`). `Ok` means queued, never
"built". The `BuildingInputRequest` has `Id`, `Action`, `ClientSession`, `State` (read now) and `Cancel()`.

- `scale` null means (1, 1, 1). `material` left out keeps the game's choice.
- `expectedSession` 0 means the client world that runs now. Pass `Client.ClientWorldSession` to make sure the
  request is for the world you saw; a world that has ended since answers `Stale`.
- The player is always the local player. A mod cannot drive another player's input.
- Nothing to declare in `kiln.mod.json` beyond `"side": "client"` or `"both"`. It is not the advanced tier: it is
  the player's own input, and the server decides.
- **Hooked at the first request.** Kiln puts its hook on the game's input path when a mod first submits, never at the
  start, so a player without such a mod never has it. That first submit takes a few milliseconds more. In the rare case
  the hook can't go in, the row turns off and the calls say so.

## Actions

| Action | What it does | What it needs |
|---|---|---|
| `Select` | puts a building item (and a material) in an actionbar slot | the item; the slot, 0 to 255 |
| `Place` | the primary building action at a transform; pressed, then released at a later frame | position, rotation, scale |
| `Remove` | the secondary building action at a transform | position, rotation, scale |
| `Undo` | the game's own building undo | nothing |
| `Dismantle` | dismantles one exact prop, held for 1.2 s like the player's own key | the prop's entity, position, rotation, scale |

- **Position** is in metres, in world space, each part under 2^31 m. **Rotation** is a quaternion; Kiln normalizes it,
  and an all-zero or non-finite one is refused. **Scale** is each axis in (0, 1024] (`BuildingInput.MaxScale`).
- Select and Undo ignore the transform.
- A request waits while the player holds their own building input.

## A request's life

| `State` | Means |
|---|---|
| `Queued` | waiting for the input, at most 5 s (`BuildingInput.QueueTimeoutMilliseconds`) |
| `Pressed` | held in the player's input; released at a later frame |
| `Dispatched` | sent as ordinary input. Not the server's answer |
| `TimedOut` | not sent within 5 s of the submit (a pressed one is still released) |
| `Cancelled` | cancelled, its mod unloaded, its client world stopped, or the input could not be written |
| `Unknown` | not your mod's latest request, or it can't be read now |

- A select goes from `Queued` to `Dispatched` at once. The others go `Queued`, `Pressed`, `Dispatched`.
- `Dispatched`, `TimedOut` and `Cancelled` are final, with one exception: a pressed request that was cancelled and
  isn't released within 5 s of its submit reads `Cancelled`, then `TimedOut`. It is still released.
- **`Cancel()`** returns true while the request is your mod's latest. A queued request then ends at once. A pressed one
  answers `Cancelled` and is released at its next frame; the slot stays busy until then. A dispatched one stays
  dispatched. `Cancel()` never throws.
- A newer request of your mod replaces the older one as its latest: `State` of the older one reads `Unknown`.
- When the client world stops (leaving, the main menu), an open request of that world ends `Cancelled`.

## Refusals and exceptions

| Case | Answer |
|---|---|
| the row is off, or this Kiln has no building input | `KilnUnavailableException` naming `client.building_input` |
| a bad argument (no item, a scale out of range, a bad rotation or position, no prop) | `ArgumentException`, before anything is sent |
| called from a thread of your own, outside mod code | `InvalidOperationException` |
| no client world, or `expectedSession` names one that ended | `Ok = false`, `Stale` |
| in a world, but the local player isn't known yet | `Ok = false`, `NoLocalPlayer` |
| a request of any mod is still queued or pressed | `Ok = false`, `Busy`: try again after it ends |
| your mod is unloading | `Ok = false`, `ModUnloaded` |
| Kiln refused a field the C# checks let through (a newer rule) | `Ok = false`, `Rejected`, the code in `Reason` |
| queued | `Ok = true`, `Request` set |

Any code Kiln runs is mod code: `OnLoad`, ticks, `Client.Tick`, `Client.Post` work, event handlers, Kiln tasks.

## Native mods (C)

In `kiln_client.h`, service `kiln.client` v1. The members are appended to `KilnClientApi`; check
`header.size >= 80` before calling them, an older Kiln's table is shorter.

| Member | Answer |
|---|---|
| `building_input_submit(owner, expected_session, const KilnBuildingInput*, uint32_t* request_id)` | queues one request; `expected_session` is 0 (the live client world) or `KilnClientState.client_session`; the id is never 0 |
| `building_input_status(owner, request_id, uint32_t* state)` | `KILN_BUILDING_INPUT_*`, the same values as `BuildingInputState` |
| `building_input_cancel(owner, request_id, uint32_t* cancelled)` | 1 when it was your latest request |

`KilnBuildingInput` is 112 bytes, `size` first and set by the caller: `action` (`KILN_BUILDING_ACTION_SELECT` 0,
`PLACE` 1, `REMOVE` 2, `UNDO` 3, `DISMANTLE` 4), `player` (`KilnClientState.local_player`), `item_id`,
`material_item_id`, `slot`, `target_entity_id` (Dismantle only, else 0), `reserved` (0), then doubles
`position[3]`, `rotation[4]` (x y z w) and `scale[3]`. Errors: `KILN_ERR_INVALID_ARGUMENT`, `KILN_ERR_REVOKED`,
`KILN_ERR_UNAVAILABLE`, `KILN_CLIENT_ERR_BUILDING_STALE` (201), `KILN_CLIENT_ERR_BUILDING_BUSY` (200).

The full reference, with every field rule and the order of refusals, is `docs/kiln/services/client-building-input.md`
in Kiln's repository on [GitHub](https://github.com/frostdev-ops/kiln).

## Tested

Host tests cover every call, the request life, cancel, timeout, an unloading mod, a stopping world, several threads at
once and the hook going in at the first request; C# tests run the C# side against a stand-in of the native service.
Windows tests cover the guarded writes to the input and a selection. In the test kit (`Kiln.TestKit`) the row is
offline, so `Available` is false and the calls throw, which tests your mod's fallback. **Not seen in a real game
yet**: Kiln's client pass has guided checks for select, place, remove, undo, dismantle, your own input first and a
joined client, and the first reports from players decide what changes.

Kiln mode (ShroudForge-format mods) uses the same input for `runtime.world.building.submit`, `status` and `cancel`.

Adapted from ShroudForge by bonsaibauer (MIT).