---
title: "Multiplayer"
description: "What players need, who can join, a short hold at the door, kicks and bans, per-character progress, synced configs, your own network messages and client code."
status: "works"
updated: "2026-11-17"
---

## Decide what players need

Set `clients` in your [manifest](/kiln/wiki/manifest):

| `clients` | Players need | Because |
|---|---|---|
| `none` | nothing | it all happens on the server |
| `kiln` | Kiln | new items, recipes or clones: the server sends the definitions |
| `mod` | your mod | your own files, quests, NPCs, talents, or code on the player's side |

## Who can join

> **Partly seen in a real game:** a player without Kiln refused by a server whose mods they need, a Kiln player
> without a required mod refused with a message, and `modSync: off` letting players without Kiln in. The rest of these
> rules, the hold before world data among them, pass on test servers.

| Client | Server | Result |
|---|---|---|
| no Kiln | a mod states `clients: "kiln"` or `"mod"` | held before world data, then refused, unless `modSync` is `off` |
| no Kiln | new templates, and nothing refuses (`modSync: off`, or no stated `clients`) | joins after the hold, without those entities |
| no Kiln | no stated `clients`, no new templates | joins as normal |
| Kiln, missing a stated `clients: "mod"` mod | `modSync` not set | refused, and told which mods are missing |
| Kiln, missing that mod | `modSync` is `warn` or `off` | joins without that mod's entities |
| Kiln, a boot mod in the same version with other boot content | `modSync` not set or `warn` | joins with a warning that names the mod; `refuse` turns them away, `off` doesn't compare |
| Kiln, other building-material pools than the server's | a mod with pools | refused before any block data, with the pools named |
| Kiln, less room for mod buffs than the server uses | a server with many mod buffs | refused, with how many the server uses and how much room the game has |

The check on a Kiln client needs `side: both`. `optionalMods` exempts a mod. See [Run a server](/kiln/wiki/servers), and
[Network](/kiln/wiki/network#the-join-step-by-step) for the handshake step by step and every `network.json` key.

- **Update both sides to 0.2.0-dev.29.1 or newer.** In 0.2.0-dev.29 every Kiln player who joined a world run by Kiln
  was turned away after a few seconds ("Your Kiln handshake did not complete before admission timed out"); 29.1 fixed it.
- Since 0.2.0-dev.29.11 a mod switched off in the host's or server's profile no longer counts as a mod players need.
  Before, a game hosting its own world could refuse its own player ("This server requires mods you do not have").

The check covers Kiln mods. Mods made for [other frameworks](/kiln/wiki/other-mods) aren't compared yet, except by their
own framework (Enshwick has its own join check). A server's modpack can carry them.

**Known limit:** only entities are withheld. A vanilla client carrying Kiln items can crash on a server that lets it in, and may lose
those items elsewhere. A mod that adds items should state `clients`.

### Held at the door

Since 0.2.0-dev.28 Kiln's own services can hold a joining player with Kiln at the door, before the world is theirs,
while they finish something with that player's game. For the player it is a little longer on the loading screen: at
most 25 s, with Kiln's messages flowing both ways while they wait, and then they join or get a message saying why not.
Mods don't use this directly; it is for the services built on it in later releases (capabilities `net.admission` and
`net.gate.hold_all`).

When the game's own refusal of a player fails, a dedicated server falls back to the game's admin kick (capability
`net.disconnect`), so a refused player never stays connected half-way. Without it, on a world a player hosts, such a
player stays connected but gets no world data until they leave. What a real player's game shows while held is a guided
check of the game test, not yet run.

## Kick, ban and who may log in

```csharp
KickResult k = await Players.Kick((PlayerRef)player, "Back in five minutes.");
Bans.Add((PlayerRef)player, "griefing", TimeSpan.FromDays(7));     // or by Steam id; no duration: for good

[Subscribe]
private void OnLogin(PlayerLoginEvent e)                          // a whitelist
{
    if (!_allowed.Contains(e.SteamId)) { e.Reason = "This server is invite only."; e.Cancel(); }
}
```

New in 0.2.0-dev.27, on the server. `Players.Kick` (or `Network.Kick(peer, reason)`) refuses a connection with a reason:
a player with Kiln reads it, one without gets the game's own "could not join". A kick is not a ban; the player can join
again. `Bans` is Kiln's own ban list (`Add`, `Remove`, `Find`, `All`), kept with the server's Kiln data and enforced
whenever a connection names its account. `PlayerLoginEvent` is posted once for each connection when it first names its
player; cancel it to refuse the player. `PlayerKickedEvent`, `PlayerBannedEvent` and `PlayerUnbannedEvent` report the
changes. Admins have the same as commands ([Kick and ban](/kiln/wiki/dedicated-servers#kick-and-ban)). Tested with test
connections on a test server, not yet with a real player's game.

## What reaches Kiln players by itself

The server sends its changes to items, recipes and game data at join. Stack sizes, ingredients, crafting times and
tooltips match, and go back at leave. No code, and your mod needn't be on their game.

Not so for a [resource patch](/kiln/wiki/onboot#resource-patches): it changes data the game read at its own start, so
both sides need the mod. Since 0.2.0-dev.29 a boot mod loads in a player's game too, and the join compares what it
made on both sides: a player whose settings of the mod differ from the server's is told to take the server's and restart
([Settings and joining players](/kiln/wiki/onboot#settings-and-joining-players)).

## Per-character progress

| Data | Follows the character? |
|---|---|
| Talents, shadow nodes, your `CharacterData.Carried` | yes |
| The game's skill nodes and player knowledge | yes, in the character's save |
| Quests, your `CharacterData` | no: this world, this character |
| World quests, `WorldData` | no: this world |

So one character on two worlds has the same talents and separate quests. Two characters on one world have separate everything.

The server keeps this per character. A Kiln client also keeps a sidecar file, `kiln/data/characters/<id>.json`. It offers the file at
join, the newest revision wins, and the server sends changes back at each world save.

A server can refuse imports: `"importProgress": false` in `kiln/config/characters.json`. It keeps its own copy per character and
leaves the client's file alone.

The sidecar is client-side and editable, like a character save, so don't put what a server must trust in `Carried`. Talent trees are
checked when they arrive, as the game checks a tree at login.

## Synced configs

```csharp
public sealed class MyRules
{
    [Synced, Range(1, 50)] public int MaxHomes { get; set; } = 3;   // the server's value
    public string Motd { get; set; } = "hi";                         // stays on the server
}
```

A synced value is read-only on a connected player. Their own returns when they leave.

## Your own messages

```csharp
public sealed record Ping(long SentMs, string Text) : INetMessage<Ping>
{
    public void Encode(NetWriter w) => w.Int64(SentMs).String(Text);
    public static Ping Decode(ref NetReader r) => new(r.Int64(), r.String(512));
}

var channel = Network.Channel("mymod:main", version: "1")
    .Register<Ping>((m, ctx) => ctx.Reply(new Pong(m.SentMs)), NetDirection.ToServer)
    .Register<Pong>((m, ctx) => Hud.Toast("pong"), NetDirection.ToClient);

channel.SendToServer(new Ping(Environment.TickCount64, "hi"));   // on the client
channel.SendToAll(message);                                       // on the server
```

Channels use the game's connection: no extra port. Register messages in the same order on both sides. Players without Kiln
never receive them. A channel closes when its mod unloads. Sends, peers, events, limits and threads:
[Network](/kiln/wiki/network).

`NetPeer.FramesIn` and `NetPeer.FramesOut` (0.2.0-dev.28) count the frames each player's game and the server have sent
on Kiln's channel; a player without Kiln sends none.

## Code in the game client

A `both` or `client` mod also runs in the game:

- `Client.State`: `Menu`, `Hosting` (single player or hosting friends) or `Remote`.
- `Client.Tick` runs every client world step on the main thread. `Client.Post` hands work to it.
- A hosted world runs your server code as a dedicated server does. `server` mods load with each hosted world.
- `OnLoad` can run in the main menu. Register there; do world work later.
- In a hosted world, `OnLoad` sees empty world data until `WorldLoadedEvent`. Read per-world data from that event.
