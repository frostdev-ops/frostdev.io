---
title: "Network: channels and the join"
nav: "Network"
description: "Your mod's own messages between server and players, who is connected, how a joining player's mods are checked, and network.json."
status: "works"
updated: "2026-11-23"
---

Kiln.Network is Forge's SimpleChannel and join handshake for Enshrouded. It rides on the game's own connection: no
extra port, nothing to open in a firewall. Players without Kiln never see Kiln's messages.

For what a player needs to join and what server admins set, see [Multiplayer](/kiln/wiki/multiplayer) and
[Run a server](/kiln/wiki/servers). This page is the code and the reference. For Steam's own peer-to-peer messages,
outside the game's connection (0.2.0-dev.30.3), see [Steam messages](/kiln/wiki/steam-messages).

## A channel

```csharp
public sealed record Ping(long SentMs, string Text) : INetMessage<Ping>
{
    public void Encode(NetWriter w) => w.Int64(SentMs).String(Text);
    public static Ping Decode(ref NetReader r) => new(r.Int64(), r.String(512));
}

public sealed record Pong(long SentMs) : INetMessage<Pong>
{
    public void Encode(NetWriter w) => w.Int64(SentMs);
    public static Pong Decode(ref NetReader r) => new(r.Int64());
}

private NetChannel _channel = null!;

public override void OnLoad()
{
    _channel = Network.Channel("mymod:main", version: "1")
        .Register<Ping>((m, ctx) => ctx.Reply(new Pong(m.SentMs)), NetDirection.ToServer)
        .Register<Pong>((m, ctx) => Hud.Toast($"{Environment.TickCount64 - m.SentMs} ms"), NetDirection.ToClient);
}

_channel.SendToServer(new Ping(Environment.TickCount64, "hi"));   // in the player's game
_channel.SendTo(player, message);                                 // on the server: one player (EntityId or NetPeer)
_channel.SendToAll(message, except: peer);                        // everyone with the channel
_channel.SendNear(position, 30, message);                         // players within 30 m
```

The mod runs on both sides (`side: both`), and the same name and version open the channel on both. List `Network` in
`KilnServices` (and `Ui` for `Hud`). The sample `NetSample` is a complete ping and announcement mod.

- **Message ids** follow the order of `Register` calls, so register in the same order on both sides, or pass ids.
- **Codecs:** `INetMessage<T>` (binary: `NetWriter`, `NetReader`; little-endian, bounds-checked), an explicit encode
  and decode pair, or `RegisterJson<T>(typeInfo)` with source-generated JSON. `OnRaw` sees ids nobody registered.
- **Threads:** on the server, handlers run on the tick thread, and sends belong there too. In the player's game,
  handlers run on the main thread and `SendToServer` works from any thread.
- **`required`** (default true): a player without the channel, or with another version, counts as missing it when
  they join. A send to a peer without the channel returns false.
- A channel belongs to its mod and closes when the mod unloads. After a hot reload, players get the new channel table.

## Who is connected

On the server, `Network.Peers` is every connected machine, with or without Kiln. A `NetPeer` has `Name`, `Player`,
`AccountId`, `State` (`Connecting`, `Ready`, `Vanilla`, `Rejected`, `Closed`), `KilnVersion`, `Mods`, `Properties`,
`Warnings` and `RoundTrip`, and counters (`FramesIn`, `FramesOut`, `BytesIn`, `BytesOut`). `Network.PeerOf(player)`
finds one. `Network.Kick(peer, reason)` refuses a connection; for players use `Players.Kick` and Kiln's ban list
([Kick, ban and who may log in](/kiln/wiki/multiplayer#kick-ban-and-who-may-log-in)).

| Event (server, tick thread) | When |
|---|---|
| `NetClientHandshakeEvent` | a Kiln player's mod list arrived: `Missing`, `Extra`; set `Refuse` and `Reason`, or cancel to refuse |
| `NetPeerReadyEvent` | the handshake is done |
| `NetVanillaClientEvent` | a player gave no sign of Kiln in time; `Kick` says whether they are refused |
| `NetPeerLeftEvent` | the peer is gone |

In the player's game, `Network.Server` is the server's connection and `Network.ServerHasKiln` says whether it runs
Kiln. The C# events `Network.ServerReady`, `Network.Rejected` (reason and details), `Network.ServerVanilla` and
`Network.Disconnected` run on the main thread.

`Network.SetHandshakeProperty(key, () => value)` adds your own key and value to the handshake in both directions; the
other side reads them in `NetPeer.Properties`.

## The join, step by step

1. A player's Kiln sends its proof of Kiln, then its **hello**: Kiln's version, its `both` and `client` mods, its
   channels and properties. Against a server without Kiln, nothing answers and the player's Kiln marks the server
   `Vanilla`.
2. The server compares. **Missing:** a server mod with `side: both` the player lacks or has in a version
   `versionMatch` refuses, a required channel, another protocol, or (since 0.2.0-dev.29) a boot mod in the same version
   whose [boot content](/kiln/wiki/onboot#settings-and-joining-players) differs, or (since 0.2.0-dev.31) the [NPC bodies](/kiln/wiki/survivors#a-body-of-your-own)
   the server built that the player's game didn't build the same way. **Extra:** a player's `both` mod the
   server doesn't have.
3. `modSync` decides (below). A refused player's Kiln shows the server's name and the missing mods, and the launcher can
   offer the server's [modpack](/kiln/wiki/modpacks).
4. **Welcome:** the server's version, policy, mods, channel table and warnings. Both sides then use the server's
   channel ids.

A player without Kiln is held before any world data while the server decides, at most `vanillaHoldSeconds`. Then
they are refused, or let in without the entities only Kiln has: the table is on
[Multiplayer](/kiln/wiki/multiplayer#who-can-join).

Since 0.2.0-dev.28 Kiln's own services can also hold a Kiln player at the door, at most 25 s, while they finish
something with that player's game ([Held at the door](/kiln/wiki/multiplayer#held-at-the-door)). Since 0.2.0-dev.29.1 a
joining Kiln player answers while held; 0.2.0-dev.29 turned every Kiln player away with "Your Kiln handshake did not
complete before admission timed out", so update both sides.

## network.json

`kiln/config/network.json` on the server. `Network.ReloadConfig()`, or the admin pages, read it again.

| Key | Default | Means |
|---|---|---|
| `modSync` | not set | `off` (no check), `warn` (let in, with warnings), `refuse` (refuse on anything missing). Not set: as `warn`, but a player missing a mod that **states** `clients: "mod"` is refused. `off` also waives the check of custom NPC bodies: such a player may crash when the game loads that NPC ([Survivors](/kiln/wiki/survivors#a-body-of-your-own)) |
| `versionMatch` | `exact` | `exact`, `major` (same major; for 0.x the same minor) or `any` |
| `requireKiln` | false | refuse every player without Kiln |
| `optionalMods` | `[]` | mod ids never counted as missing |
| `kickReason` | 1 | the game's login error a refused player gets (1 "Version", 5 "Generic"); a player with Kiln also sees Kiln's own message |
| `vanillaHoldSeconds` | 5 | how long a player without proof of Kiln is held (1 to 20) |
| `definitionsWaitSeconds` | 5 | how long Kiln-only entities wait for a Kiln player's content (1 to 30) |
| `maxMessageBytes` | 262144 | the largest message, either way |
| `messagesPerSecond`, `bytesPerSecond` | 200, 524288 | per player, with a 2 s burst; more is dropped |
| `floodKickDrops` | 2000 | that many drops within 10 s kick the player |
| `serverName`, `serverId` | the game's name, generated | what players' launchers show |
| `modpack` | null | `{url, sha256, name?, version?, size?}`: where players get the mods |
| `advertise` | true | send the server's name, modpack and required mods with a welcome or refusal |

## Limits

- One frame carries up to 8000 bytes; Kiln splits bigger messages and puts them together again, up to
  `maxMessageBytes`. A channel can set a smaller limit.
- At most 16 half-received messages per player; an unfinished one is dropped after 15 s.
- Kiln pings Ready peers every 10 s (`NetPeer.RoundTrip`).
- Nothing throws when the transport is missing: channels open, sends return false and peer lists are empty.
  `Network.Kick` needs the capability `players.kick`.

Your own small values on entities, rather than messages, are [replication sidecars](/kiln/wiki/replication#a-sidecar-your-own-value-on-an-entity).

The wire format, the lab tests and every detail of the hold are in Kiln's repository, `docs/kiln/network.md`, on
[GitHub](https://github.com/frostdev-ops/kiln).

## Tested

Lab tests on a dedicated server with fake clients cover the handshake, messages both ways, big messages, flooding,
every policy, players without Kiln and hot reloads. In a real game: the handshake on a hosted world and a dedicated
server, NetSample's ping (26 to 29 ms), the refusal with its message and a rejoin, and the Kiln menu's **Network** tab.
