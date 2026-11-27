# The mod API: network and client

Part of the mod API guides ([api.md](api.md) is the index). Here: Kiln network channels, Steam messages, and the client
(state, `BuildingInput`, `SteamGuard`). Signatures are the common ones; the XML docs and the generated API reference
([docs-map.md](docs-map.md)) have the rest.

## Network
```csharp
var ch = Network.Channel("mymod:main", version: "1")
    .Register<Ping>((m, ctx) => ctx.Reply(new Pong(...)), NetDirection.ToServer)
    .Register<Pong>((m, ctx) => Hud.Toast("pong"), NetDirection.ToClient);
ch.SendToServer(new Ping(...)); ch.SendTo(player, msg); ch.SendToAll(msg);
```
Register messages in the same order on both sides. Server handlers on the tick thread, client handlers on the main
thread. Content changes reach Kiln clients without any code (content sync); configs need `[Synced]`.
dev.28+: `NetPeer.FramesIn` / `FramesOut` count Kiln-channel frames per player. A refused player whose refusal fails is
kicked (`net.disconnect`). dev.29+: the join compares each `side: both` boot mod's committed content
(`docs/kiln/network.md`).
dev.30.3+ (mod API 0.2.13): `SteamMessages` (Kiln.Network, any thread, never waits): a mod's own Steam peer-to-peer
messages, outside the game's connection. `SteamMessages.Open(first, last, answerSessions)` → `SteamLeaseResult`
(`Lease`: a `SteamMessageLease` on Steam channels `first..last`, 0..65535, no overlap, at most 16 in the process; closed
at `Dispose()` or the mod's unload). `lease.Send(steamId, channel, data, SteamSendFlags.Reliable)` (≤ 524,288 bytes;
`SteamResult` = Steam's EResult), `lease.Receive(channel, buffer)` (one message or `NoMessage`; too big for the buffer:
taken and `Dropped`), `lease.Accept(steamId)`, `lease.SetAcceptPolicy(SteamAcceptMode.None | Any | Listed, ids)` (the
session lease only, ≤ 256 ids; `Any`/`Listed` need Steam ready), `SteamMessages.Status` (never throws), `Available`.
Results carry `Refusal` (`SteamMessagesRefusal`: `NotPermitted`, `Taken`, `SteamNotReady`, `LeaseClosed`,
`ClosedForExit`, `SteamRefused`, `Dropped`, `NoMessage`, `Fault`). Capability `net.steam_messages` (`pending` until
Steam is ready; `Open` works then). **A mod opts in with `"steamMessages": true` in its kiln.mod.json
(`ModInfo.SteamMessages`); without it `Open` throws `InvalidOperationException`. A lease is the mod's own: kiln.net
checks the mod's owner on every lease call and closes its leases when it unloads.** Prefer channels. Treat every message as untrusted. Page:
`docs/kiln/services/net-steam-messages.md`; wiki `steam-messages`.

## Client
`Client.State` (`Menu`, `DedicatedServer`, `Hosting`, `Remote`), `Client.IsClient`, `IsHosting`, `LocalPlayer`,
`Client.Tick += (in TickInfo t) => ...`, `Client.Post(action)`, `await Client.NextTick()`.
dev.26+, experimental (`KILNX002`), never run in a real client: `SteamGuard` (Kiln.Client, client only, any thread) stops
the game client reporting achievements to Steam. `SteamGuard.Hold(reason)` (an `IDisposable`; throws
`KilnUnavailableException` when it cannot protect), `TryHold(reason, out hold)`, `Latch(reason)` (until the game exits),
`Status` (`SteamGuardStatus`), `Protecting`. Call `Hold`/`TryHold`/`Latch` on the game's tick thread. Not covered: the game's
own stat reset, other mods' Steam calls, a player without Kiln.
dev.30.3+ (mod API 0.2.13): `BuildingInput` (Kiln.Client, client only, any thread, never waits): the local player's
ordinary building input, as if the player pressed it; the server still checks permissions, resources, range and
placement. `BuildingInput.Select(item, slot, material)`, `Place(position, rotation, scale)`, `Remove(...)`, `Undo()`,
`Dismantle(prop, position, rotation, scale)` (each with `expectedSession = 0`, or `Client.ClientWorldSession`) →
`BuildingInputResult` (`Ok` = queued, never "built"; `Refusal`: `Busy`, `Stale`, `NoLocalPlayer`, `ModUnloaded`,
`Rejected`; `Request`). `BuildingInputRequest.State` (`Queued`, `Pressed`, `Dispatched` = sent as input, not the
server's answer, `TimedOut` after 5 s, `Cancelled`, `Unknown` = not your latest), `Cancel()`. One request slot for the
whole client. Bad arguments throw `ArgumentException` (scale each in (0, 1024], a finite non-zero rotation).
Capability `client.building_input`: a supported API on game client 26430625 (available; Kiln hooks the input path at
the first request), `symbol-missing` on other builds, where every call throws `KilnUnavailableException`; ask
`BuildingInput.Available` first. **Not checked in a real game yet.** Native: kiln.client `building_input_submit`,
`_status`, `_cancel` and `KilnBuildingInput` are in the SDK's `kiln_client.h` (table 80 bytes; check `header.size`). Page:
`docs/kiln/services/client-building-input.md`; wiki `building-input`.
