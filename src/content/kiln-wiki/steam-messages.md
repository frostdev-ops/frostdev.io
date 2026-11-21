---
title: "Steam messages: your own peer-to-peer traffic"
nav: "Steam messages"
description: "SteamMessages in Kiln.Network: a mod's own Steam networking messages between game processes, on Steam channels it leases, beside the game's connection. Opt in with \"steamMessages\": true."
status: "partial"
updated: "2026-11-21"
---

> **New in 0.2.0-dev.30.3 (mod API 0.2.13).** A C# mod opts in with `"steamMessages": true` in its `kiln.mod.json`.
> Tested with Kiln's host tests, C# tests and two game processes over a stand-in Steam library, not yet with real
> Steam.

Most mods should talk over a [channel](/kiln/wiki/network): it rides on the game's own connection, Kiln checks who
has the mod, and the server is always one end. Steam messages are for the rare mod that needs Steam's own
peer-to-peer messages instead: between two game processes that know each other's Steam id, on Steam message channels
the mod leases from Kiln. It works in a player's game (the player's Steam) and on a dedicated server (Steam's game
server side).

- **Separate from the game's connection.** These messages go through neither the game's session nor Kiln's channels,
  and Kiln's join check doesn't see them.
- **Steam does the transport.** Kiln makes one Steam call per send or receive. Nothing is buffered: a message waits in
  Steam's queue for its channel until someone receives it.
- **The game keeps running Steam.** Kiln never starts, pumps or shuts down Steam; it uses the Steam the game has.
- **Treat every message as untrusted.** All you know about a sender is its Steam id. Check sizes and contents before
  you use them.

## Opt in

Add `"steamMessages": true` to your `kiln.mod.json`. It is `false` by default. Any value other than `true` or
`false` refuses the manifest (`steamMessages must be true or false`).

```json
{
  "id": "my-steam-mod",
  "name": "My Steam Mod",
  "version": "1.0.0",
  "apiVersion": "0.2.13",
  "side": "both",
  "entryAssembly": "MySteamMod.dll",
  "steamMessages": true
}
```

With Kiln.Sdk, set the property in your project and the SDK writes the key for you:

```xml
<KilnSteamMessages>true</KilnSteamMessages>
```

Your mod reads its own setting as `ModInfo.SteamMessages`. In the test kit, `ModManifest.SteamMessages` sets it.

Without the key, `SteamMessages.Open` throws `InvalidOperationException` and nothing reaches Steam.

## Who may open a lease

- **A C# mod with `"steamMessages": true`.** When Kiln loads the mod, it admits the mod (its owner, the identity Kiln
  gives each loaded mod) to Steam leases. A reloaded mod is admitted again.
- **Kiln's own ShroudForge interpreter** in [kiln mode](/kiln/wiki/kiln-mode).
- **Nobody else.** A C# mod without the key gets `InvalidOperationException`. Native plugins can't open a lease in
  this release.

If your mod has the key but `Open` still answers `NotPermitted`, the Kiln runtime is older than the C# layer (another
build). `kiln/logs/kiln.log` says why, once per load.

## Ask first

`SteamMessages.Available` is true when this Kiln has the calls, the capability `net.steam_messages` is not off, and
Steam is ready now. `SteamMessages.Status` is a snapshot that never throws. Both work for every mod, opted in or not.

| Row | Why |
|---|---|
| `available` | Steam was found ready in this process |
| `pending` | Kiln found what it needs in the game's Steam library, and no call has found Steam ready yet (early in the start). `Open` works already |
| `symbol-missing` | a function Kiln needs is missing from the game's Steam library; the row names it |
| `service-missing` | the game's Steam library isn't loaded, or Kiln.Network did not start |
| `service-older` | the Kiln runtime has no Steam messages (older than 0.2.0-dev.30.3) |
| `policy` | Kiln started in safe idle |

When the row is off, `SteamMessages.Open` throws `KilnUnavailableException` naming `net.steam_messages`. In the
test kit the row is offline, so `Open` throws there too.

## In C#

`SteamMessages` is in Kiln.Network (`Network` in `KilnServices`). Every member works from any thread and never
waits.

```csharp
private SteamMessageLease? _lease;
private readonly byte[] _buffer = new byte[SteamMessages.MaxMessageBytes];   // never drops a message for size

var r = SteamMessages.Open(firstChannel: 7100, lastChannel: 7101, answerSessions: true);
if (!r.Ok) { Log.Info(r.Reason); return; }                  // Taken, NotPermitted, ClosedForExit, Fault
_lease = r.Lease!;
_lease.SetAcceptPolicy(SteamAcceptMode.Listed, new[] { friendSteamId });

var sent = _lease.Send(friendSteamId, 7100, payload);          // reliable by default
if (!sent.Ok) Log.Info($"{sent.Refusal}: {sent.Reason}");

// in a tick: take what waits on the channel, one message per call
while (_lease.Receive(7100, _buffer) is { Ok: true } got)
    Handle(got.Message.Sender, _buffer.AsSpan(0, got.Message.Length));

_lease.Dispose();                                              // or let the mod's unload close it
```

| Member | Does |
|---|---|
| `SteamMessages.Status` | Steam ready or not, this process's Steam id (`LocalSteamId`), the accept policy in force, sessions accepted and refused since the start |
| `SteamMessages.Open(firstChannel, lastChannel, answerSessions = false)` | a lease on Steam channels `firstChannel` to `lastChannel`, inclusive. Call it from mod code |
| `lease.Send(steamId, channel, data, flags = SteamSendFlags.Reliable)` | one message, up to 524,288 bytes (`SteamMessages.MaxMessageBytes`); `SteamResult` is Steam's own answer (1 = OK) |
| `lease.Receive(channel, buffer)` | takes at most one message off the channel: `Sender`, `Channel`, `Length`, `Reliable` |
| `lease.Accept(steamId)` | accepts a pending session with one Steam id by hand |
| `lease.SetAcceptPolicy(mode, steamIds = null)` | who may start a session (the session lease only) |
| `lease.IsOpen` | false once the lease is closed |
| `lease.Dispose()` | closes the lease; twice is fine |

Results (`SteamLeaseResult`, `SteamSendResult`, `SteamReceiveResult`, `SteamAcceptResult`, `SteamPolicyResult`)
have `Ok`, `Reason` and `Refusal` (a `SteamMessagesRefusal`). `Send` and `Receive` results are structs, so the
message path allocates nothing.

## Leases

A lease is a range of Steam message channels, first to last inclusive, in 0 to 65535. It belongs to the mod that
opened it.

- Leases never overlap, across every mod and Kiln itself. At most 16 are open in the process
  (`SteamMessages.MaxLeases`). An overlap answers `Taken`, and names the other mod when it is one.
- Sends and receives name a channel inside the lease.
- **Only your mod reaches your lease.** Kiln passes your mod's owner with every lease call, and the native side checks
  it. Another mod's lease looks to you exactly like a closed one, so you can't send on it, drain it, change its policy
  or close it.
- **Handles stay hidden.** Behind each lease is a handle of 64 random bits, drawn from the system's cryptographic
  generator. `SteamMessageLease` never shows it: not as a property, not in `ToString()`, not in a result. Hold the
  lease object; that is your access.

## When a lease closes

- At `lease.Dispose()`, from any thread. Twice is fine. Closing the session lease sets the accept policy to `None`.
- When your mod unloads. Kiln closes the mod's leases as it unloads, and the native side closes every lease of the
  mod's owner when Kiln revokes that owner. A lease never outlives its mod.
- A closed lease answers `LeaseClosed` and calls no Steam function. `IsOpen` is false.
- `Open` while your mod is unloading throws `InvalidOperationException`.

## Who may start a session

Steam asks before a new peer may message this process (a session request). One lease in the process, opened with
`answerSessions: true`, answers those requests with its accept policy:

| `SteamAcceptMode` | Means |
|---|---|
| `None` | answer no request; Steam times it out. The default, and what closing the session lease sets |
| `Any` | accept every Steam user |
| `Listed` | accept only the listed Steam ids, at most 256 (`SteamMessages.MaxListedIds`) |

- `None` is in force at once, also before Steam is ready. `Any` and `Listed` need Steam ready: before that they
  answer `SteamNotReady` and change nothing, so set them again later.
- Steam accepts a session with a peer this process sent to first, so a mod that only talks to peers it messaged needs
  no session lease. `Accept(steamId)` on any lease accepts one pending request by hand.
- `Any` lets every Steam user reach your mod. Prefer `Listed`.

## Send and receive

- **Send flags** (`SteamSendFlags`): `Unreliable`, `Reliable` (the default) and `RestartBrokenSession` (a session
  that failed is opened again instead of failing every later send), alone or together.
- **Receive** answers `NoMessage` when nothing waits: call it from your own loop, a tick or a task, until it does.
  Nothing calls you. A message bigger than your buffer, or one with no sender, is taken off the queue and dropped
  (`Dropped`); a buffer of `SteamMessages.MaxMessageBytes` never drops for size.
- **Steam not ready** (early in the start, or Steam not running): calls answer `SteamNotReady` and send or take
  nothing.
- **At exit** every call answers `ClosedForExit` from the moment Kiln's exit begins.

## Refusals and exceptions

| Case | Answer |
|---|---|
| the row is off, or this Kiln has no Steam messages | `Open` throws `KilnUnavailableException` (a `pending` row does not) |
| your `kiln.mod.json` doesn't say `"steamMessages": true` | `Open` throws `InvalidOperationException` |
| `Open` from a thread of your own, outside mod code, or while your mod is unloading | `InvalidOperationException` |
| a bad argument: first above last, a channel outside the lease, a Steam id of 0, too many bytes, unknown flags, ids with a mode other than `Listed`, more than 256 ids, an id of 0 | `ArgumentException` or `ArgumentOutOfRangeException`, before anything reaches Steam |
| `SetAcceptPolicy` on a lease opened without `answerSessions` | `InvalidOperationException` |
| `Open`: Kiln did not admit your mod (an older runtime), or your mod is being unloaded | `Ok = false`, `NotPermitted` |
| `Open`: the channels overlap a lease, a session lease is open already, or 16 leases are open | `Ok = false`, `Taken` |
| Steam not ready | `Ok = false`, `SteamNotReady` |
| the game is exiting | `Ok = false`, `ClosedForExit` |
| the lease is closed (disposed, or its mod unloaded) | `Ok = false`, `LeaseClosed` |
| a Steam call faulted, or Kiln answered an internal error | `Ok = false`, `Fault` (kiln.log has one line per kind) |
| `Send`: Steam's answer was not OK | `Ok = false`, `SteamRefused`, `SteamResult` set |
| `Receive`: nothing waits | `Ok = false`, `NoMessage` |
| `Receive`: too big for the buffer, or no sender | `Ok = false`, `Dropped` |
| `Accept`: no request of that Steam id is pending, or Steam said no | `Ok = false`, `SteamRefused` |

## Native side (C)

In `kiln_net.h`, service `kiln.net` v1, now in the SDK's headers. The members are appended to `KilnNetApi` (184
bytes); check `header.size >= 184` before calling them. Native plugins can't open a lease in this release:
`steam_open` answers `KILN_ERR_UNAVAILABLE` for them. `steam_status` works for everyone.

| Member | Answer |
|---|---|
| `steam_status(KilnSteamMessagesStatus*)` | a snapshot; `KILN_OK` also when Steam is not ready (the flags say what there is) |
| `steam_open(owner, const KilnSteamMessagesOpen*, KilnHandle* lease)` | a lease on `[first_channel, last_channel]`; flag `KILN_STEAM_OPEN_SESSIONS` makes it the session lease |
| `steam_close(owner, lease)` | idempotent |
| `steam_maintain(owner, lease, const KilnSteamAcceptPolicy*, KilnSteamMessagesStatus* out)` | the session lease's accept policy |
| `steam_send(owner, lease, peer, data, len, channel, flags, int32_t* steam_result)` | one message; flags 0, 8, 32 or 40 |
| `steam_receive(owner, lease, channel, buffer, cap, KilnSteamMessageInfo*, uint32_t* got)` | `*got` 0 or 1 |
| `steam_accept(owner, lease, peer, uint32_t* accepted)` | a pending session accepted by hand |

Every member but `steam_status` checks the owner: owner 0 answers `KILN_ERR_INVALID_ARGUMENT`, a revoked owner
`KILN_ERR_REVOKED`. A lease that is not an open lease of that owner answers `KILN_ERR_NOT_FOUND`, exactly as a closed
one; `steam_close` answers `KILN_OK` for it and closes nothing. `steam_open` answers `KILN_ERR_INTERNAL` when no
random handle could be drawn.

The full reference, with the order of refusals for each member, is `docs/kiln/services/net-steam-messages.md` in
Kiln's repository on [GitHub](https://github.com/frostdev-ops/kiln).

## Tested

Host tests cover leases, the owner check on every call, random handles, owners revoked while a lease opens, the accept
policy, sends and receives, accept by hand, faulting Steam calls and exit, also from several threads at once. C# tests
run the C# side, with the opt-in, against a stand-in of the native service. Under Wine and on Windows, two processes
exchanged messages over a stand-in Steam library. Not yet: real Steam, in a player's game or on a dedicated server.

Steam interface lookup and the session-request answer adapted from ShroudForge by bonsaibauer (MIT).
