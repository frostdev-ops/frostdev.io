---
title: "Multiplayer"
description: "What players need, who can join, per-character progress, synced configs, your own network messages and client code."
status: "works"
updated: "2026-11-05"
---

## Decide what players need

Set `clients` in your [manifest](/kiln/wiki/manifest):

| `clients` | Players need | Because |
|---|---|---|
| `none` | nothing | it all happens on the server |
| `kiln` | Kiln | new items, recipes or clones: the server sends the definitions |
| `mod` | your mod | your own files, quests, NPCs, talents, or code on the player's side |

## Who can join

> **Not yet in the real game.** These rules pass on test servers. They haven't run with a real client.

| Client | Server | Result |
|---|---|---|
| no Kiln | a mod states `clients: "kiln"` or `"mod"` | held before world data, then refused, unless `modSync` is `off` |
| no Kiln | new templates, and nothing refuses (`modSync: off`, or no stated `clients`) | joins after the hold, without those entities |
| no Kiln | no stated `clients`, no new templates | joins as normal |
| Kiln, missing a stated `clients: "mod"` mod | `modSync` not set | refused, and told which mods are missing |
| Kiln, missing that mod | `modSync` is `warn` or `off` | joins without that mod's entities |

The check on a Kiln client needs `side: both`. `optionalMods` exempts a mod. See [Run a server](/kiln/wiki/servers).

**Known limit:** only entities are withheld. A vanilla client carrying Kiln items can crash on a server that lets it in, and may lose
those items elsewhere. A mod that adds items should state `clients`.

## What reaches Kiln players by itself

The server sends its changes to items, recipes and game data at join. Stack sizes, ingredients, crafting times and
tooltips match, and go back at leave. No code, and your mod needn't be on their game.

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
never receive them. A channel closes when its mod unloads.

## Code in the game client

A `both` or `client` mod also runs in the game:

- `Client.State`: `Menu`, `Hosting` (single player or hosting friends) or `Remote`.
- `Client.Tick` runs every client world step on the main thread. `Client.Post` hands work to it.
- A hosted world runs your server code as a dedicated server does. `server` mods load with each hosted world.
- `OnLoad` can run in the main menu. Register there; do world work later.
- In a hosted world, `OnLoad` sees empty world data until `WorldLoadedEvent`. Read per-world data from that event.
