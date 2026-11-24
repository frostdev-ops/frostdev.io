---
title: "Replication: sidecars, watching and vanilla stand-ins"
nav: "Replication"
description: "Send your own small values on entities to Kiln clients, watch what the server sends each player, inspect the network from commands, and show players without your content a stand-in item."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.31 (dev.31+, mod API 0.2.17).** Run on dedicated-server labs and offline tests. Not confirmed in a real game
> client: what a joined client receives (`WatchReceived`, check 11-repl.receive-watch) and dropping or rewriting real
> network messages. The inspector is an **advanced** tool: it shows the game's own data under the game's component names,
> which can change with a game update.

The game sends each player its ECS world as entity messages: creates, updates and destroy lists. `Kiln.Replication` reads
that traffic, lets you add values the game can't carry, and keeps players without Kiln (or without your content) from
being sent what their game doesn't know. List `Replication` in `KilnServices` (and `Network` when you use `NetPeer`).

## A sidecar: your own value on an entity

A **replicated extension** sends a small value of your own on entities to every Kiln client that has the same extension.
The game's channels stay untouched; the value travels on Kiln's channel `kiln:repl`. A vanilla client, and a Kiln client
without the extension, never get a frame.

```csharp
[StructLayout(LayoutKind.Sequential, Pack = 1)]
public struct Water { public uint Units; public uint Max; }

private ReplicatedExtension<Water>? _water;

public override void OnLoad()
{
    // both sides, in OnLoad: Kiln advertises it in the join handshake before anyone joins
    _water = Replication.Extension<Water>("bigcan:water", 1);
    if (Mods.Side == ModSide.Server || Capabilities.Is("repl.sidecar"))
        _water.On<Ecs.Fuel>(Provide);                 // Ecs.Fuel: a game component type from Kiln.Game
}

// server, tick thread, once per step for each can a Kiln client with the extension was sent
private static bool Provide(EntityId can, ref Water value)
{
    if (Items.Fuel.Read(can) is not { } f || f.Units <= 1023 * Items.Fuel.UnitsPerCharge) return false;   // no value
    value = new Water { Units = (uint)f.Units, Max = (uint)f.Max };
    return true;
}

// client, any thread
if (_water!.TryGet(serverEntity, out var w)) Log.Debug($"{w.Units} of {w.Max}");
```

- **The type:** an unmanaged struct with `Pack = 1`, numeric fields, enums and nested structs only (analyzer rule KILN199),
  at most 1,024 bytes. Name and version identify it: the server and the client must register the same name, version,
  size and layout.
- **When it travels.** `On<TComponent>` runs your provider for the entities with that component that a peer with the
  extension was sent. A value is sent again only when it changed; returning `false` clears it. Values are keyed by the entity
  and the create the peer got, so one can't land on a reused id.
- **Client side.** `TryGet` reads the last value; `Changed` (main thread) says when one arrives or goes. A hosted world's own
  client reads the server's values directly.
- `Replication.Extension` throws `KilnUnavailableException` where `repl.sidecar` is off.

The `BigCan` sample is a 2,000-charge watering can: the game sends a container's water as two 16-bit numbers, which stop
at 1,023 charges, and the sidecar carries the true value to Kiln clients for the HUD.

## Watch what the server sends

Read only; nothing here changes the game's traffic.

```csharp
var watch = Replication.Watch(chest);                 // every peer; Replication.Watch(chest, peer) for one
watch.Sent += e =>
{
    if (e.Components.TryGetValue("Inventory", out var inv))
        Log.Info($"{e.Kind} tick {e.Tick} to {e.Peer?.Name ?? $"0x{e.PeerId:x}"}: Inventory {inv.Length} B");
};
watch.Ended += e => Log.Info($"watch over: {e.Reason}");
watch.Dispose();                                      // or let the unload do it
```

- `ReplSent` carries the **full** values of every component the message held, by component name, never the delta, plus the
  kind (`Create`, `Update`, `Destroyed`), tick and payload size. A watch ends when the entity is destroyed, its id is reused,
  the peer leaves or the world stops (`Ended`).
- `Replication.Stats()` counts per peer and channel: frames, messages, bytes, creates, updates, destroy lists, refusals and
  resets. The first call by a mod turns the counters on for that mod until it unloads.
- On a client, `Replication.WatchReceived(entity)` and `ReceivedStats()` show what that client receives.
- `Replication.Component("Inventory")` gives the game's registry facts for a component: index, size, hash, codec.
- Limits: 64 send watches at a time (all mods and commands together), 16 receive watches. A full buffer drops records and
  marks the next one `Gap`. The game packs a few components (`CurrentTransform` and four more) with its own codec: a client
  sees them rounded.

### From commands

Admin only, since they show what other players are sent. From chat, the server console and Kiln.Admin:

| Command | Does |
|---|---|
| `repl` | says whether the observer is on and lists the commands |
| `repl stats`, `repl stats off` | per peer and channel counters since they were switched on |
| `repl watch <entity> [peer]` | 30 s of one entity's messages into `kiln/logs/repl-watch-<entity>-<utc>.txt` (components as hex); `repl watch stop` ends it |
| `repl capture <peer> <seconds>` | everything one peer is sent for 1 to 600 s into `kiln/logs/repl-<peer>-<utc>.jsonl` (at most 256 MiB) |
| `repl component <name>` | the registry's facts about a component |

The Kiln menu's Network page has a Replication section. A watch's details go to its file; `kiln.log` only gets a start and an end
line, without player names or bytes. Kiln hooks the game's send path only while something needs it, and a hook that faults switches itself off for the session.

## Vanilla stand-ins

A Kiln-only item, sent to a player whose game doesn't have it, must become something that game knows. Kiln does this
by itself on every server and hosted world while Kiln-only items exist. For each peer without the content, every Kiln-only
item id in an inventory, item state, equipment or pickup becomes the item's **look-alike**, or an empty slot when it has none.

```csharp
Blocks.Define("big-can", new ItemBlock
{
    Name = "Big Watering Can", Kind = ItemKind.WateringCan, Holds = 2000, LargeHolds = true,
    VanillaLook = "Tool_T1_WateringCan",      // what players without the mod see in its place
});
```

In JSON it is `"vanillaLook"` on the item (and `ItemDefinition.VanillaLook` for a definition). It names a game item of the same kind.

- **No declared look-alike means an empty slot.** A player who picks up a remapped item gets the real item on the server;
  their own inventory shows the stand-in or nothing.
- **It fails closed.** An id that is neither a game item nor a known Kiln-only item becomes 0. While Kiln-only items exist and
  the remap doesn't work (an unsupported game build), clients without Kiln are refused at the door. A server owner may let
  them in with `{"vanillaWithoutRemap": "allow"}` in `kiln/config/replication.json` (default `"refuse"`), at their own risk.
- `Replication.RemapItems(PeerSelector)` hides Kiln-only items from more peers, `Replication.RemapStats()` shows what the
  remap did, and the `ItemFallback` sample (`/fallback`) demonstrates it.
- **Not covered yet:** item ids in the game's other messages (a character's save slice, factories, traders, knowledge), and
  items other loaders add (they count as the game's).

## Filters, touch and messages

For more advanced work, with the same caution:

- `Replication.Filter<TComponent>(PeerSelector, filter)` edits one component as the server sends it to selected peers
  (`Peers.All`, `Peers.Vanilla`, `Peers.LackingContent` ...). It runs on the game's **replication job threads**, in parallel: the
  body must not allocate, lock or call a Kiln API. A fault keeps the game's bytes and removes the filter.
- `Replication.Touch(entity)` sends an entity again without changing a byte (and re-saves it once).
- `Replication.OnMessage(channel, direction, handler)` sees the game's messages as this process sends or receives them and may
  pass, drop or rewrite them; `Replication.Inject` sends one. Not confirmed on a real client: a drop or rewrite of real traffic.
