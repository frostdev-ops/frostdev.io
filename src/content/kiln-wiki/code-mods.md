---
title: "Code mods"
description: "The Mod class, the tick thread, events, configs, commands, permissions, saved data, other mods, and what a call does when it cannot work."
status: "works"
updated: "2026-11-13"
---

## The mod

```csharp
public sealed class MyMod : Mod
{
    public override void OnLoad()
    {
        Log.Info("hello");
        Context.Tick.Pre += OnPre;              // every server step
    }

    private void OnPre(in TickInfo tick) { }

    public override void OnUnload() { }         // server stop, reload, a dependency going
}
```

What you register through Kiln (ticks, events, commands, channels, game data changes) is removed at unload. Release only
what you made: threads, timers, files, sockets. Do not reuse callbacks or handles from an old load.
dev.20+ [world programs](/kiln/wiki/world-programs) keep inert scheduler declarations until restart while their callbacks
are drained on unload.

`Context` has `Info`, `Log`, `Tick`, `GameLog`, `Scheduler`, `Messages` and `DataDirectory`.

## The tick thread

The server steps its world about 24 times a second. `OnLoad`, handlers and every `await` run on that thread, between
steps. Game state may only be touched there.

- From a timer or web request, come back first: `Context.Scheduler.Post(() => ...)` or
  `await Context.Scheduler.NextTick()`.
- Never block it (`.Result`, `.Wait()`, `Thread.Sleep`). Use `await`.
- `Game.IsTickThread` tells you where you are.

The client works the same way, with its main thread. See [Multiplayer](/kiln/wiki/multiplayer).

## Events

```csharp
[Subscribe]
private void OnJoin(PlayerJoinedEvent e) => Log.Info($"{e.Player.Name} joined");

[Subscribe(EventPriority.High)]
private void OnChat(ChatMessageEvent e) { if (e.Text.Contains("spoiler")) e.Cancel(); }
```

Or `Events.On<T>(handler)`. Some events cancel; a few let you change values (a hit's damage, a chat line). Every family of events, results, your own events and threads: [Events](/kiln/wiki/events).

| Lifecycle event | When |
|---|---|
| `ModsLoadedEvent` | once, after every `OnLoad` |
| `ServerStartingEvent` | right after; the world is still loading |
| `ServerStartedEvent` | the world is live: do world work from here |
| `WorldLoadedEvent` | the world's save is loaded (service Saves) |
| `ServerStoppingEvent` | stopping, world intact: save your state |

In the client, `OnLoad` can run in the main menu: register there, act later.

In a hosted world, `OnLoad` sees empty world data until `WorldLoadedEvent`, about 10 s later. Read per-world data from that event.
On a dedicated server it's there from `OnLoad`.

## Configs

```csharp
public sealed class MyConfig
{
    [Comment("How many homes a player may set."), Range(1, 50)]
    public int MaxHomes { get; set; } = 3;
}

_config = Config.Register<MyConfig>();     // kiln/config/my-mod.json
var homes = _config.Value.MaxHomes;        // always current
```

Kiln writes a commented file, keeps the player's values, fixes bad ones and reloads on change. `[RequiresRestart]` applies
at the next load. `[Synced]` sends the server's value to players.

**New in 0.2.0-dev.20:** `Config.RegisterWorld<MyConfig>()` keeps one config beside each world's sidecar. Values switch
before `WorldLoadedEvent`; with no world, they are defaults. `[RequiresRestart]` changes apply when that world next opens.
`Context.Locale.Get(key, args)` reads this mod's `locales/<language>.json`, falling back to English and then the key.
`StatusLines.Set("state", "waiting for the world")` or `Add(() => cachedText)` reports status in mod lists. A status source
may run on a worker, so read snapshots produced on the tick thread rather than live game state. Since dev.21 a mod list
shows the last snapshot and refreshes it a moment later, so a status line never makes the menu, tick or frame wait.

## Commands and permissions

```csharp
[Command("heal", Description = "heals a player", Permission = CommandPermission.Admin)]
private string Heal(Player target, [Range(1, 1000)] int amount = 100) =>
    $"healed {target.Name}";
```

Typed arguments (players, `~` positions, items, durations, `@p`/`@a`/`@e`), `/help` and tab completion come with it.
`Permissions.Register("mymod.fly", PermissionLevel.Everyone)` and `Permissions.Has(player, "mymod.fly")` add your own
nodes, which admins map to groups.

## Saved data

```csharp
var ledger = WorldData.Get<Ledger>("ledger");             // saved with the world
var wallet = PlayerData.Get<Wallet>(steamId, "wallet");   // per player, online or not
EntityData.Set(chest, "owner", new Owner { Name = name }); // follows one entity

var who = CharacterData.KeyOf(player.Entity);
var standing = CharacterData.Get<Standing>(who, "standing");   // this world, this character
var perks = CharacterData.Carried.Get<Perks>(who, "perks");    // goes with the character
```

Change the objects in place. They save with the world and survive a reload. `PlayerData` is per Steam id, not per character. See
[Per-character progress](/kiln/wiki/multiplayer#per-character-progress).

## Other mods

- **Dependencies**: in the manifest, with version ranges.
- **Messages**: `Mods.Send("other-mod", "method", payload)`, received with `Context.Messages.On("method", m => ...)`.
- **Shared APIs**: put your API in its own assembly and list it in `exports`.
- `Mods.All`, `Mods.IsLoaded(id)`, `Mods.Get(id)`: every mod and its state.

## Services

Each part of the game is a service. List the ones you use in `KilnServices`:

| Service | For |
|---|---|
| Players, Chat | who's online, chat, commands, [progression](/kiln/wiki/progression) |
| Items, Spawn, World | inventories, spawning, positions, teleport |
| Combat, Gameplay | health, damage, deaths; interactions, crafting, loot, zones |
| Time, Settings, Saves | time, weather, world settings, saved data, backups |
| Content | [data packs](/kiln/wiki/data-packs), [game data](/kiln/wiki/game-data) |
| Creatures, Abilities | [creatures](/kiln/wiki/creatures), [abilities](/kiln/wiki/abilities) |
| Skills, Quests | [talents](/kiln/wiki/talents), [quests](/kiln/wiki/quests), [NPCs](/kiln/wiki/npcs) |
| Build | [world edits](/kiln/wiki/world-edits) |
| Ui, Client, Network | [game UI](/kiln/wiki/game-ui), [multiplayer](/kiln/wiki/multiplayer) |
| Assets, Audio | [icons and textures](/kiln/wiki/assets), [sounds](/kiln/wiki/sounds) |

## When a call cannot work

Since 0.2.0-dev.27 every service answers the same way (mod API 0.2.2):

| What happened | What you get |
|---|---|
| the game refused (the player left, the slot is full) | a result with `Ok == false` and a `Reason` |
| your argument is wrong (unknown id, out of range) | an `ArgumentException` |
| the capability is off (service not loaded, this game build lacks it, wrong side) | a `KilnUnavailableException` naming the capability |

```csharp
if (!Capabilities.Is("items.equip")) return "not on this server";
EquipResult r = await Items.Equip(player, from);
if (!r.Ok) return $"not equipped: {r.Reason}";
```

`KilnUnavailableException` is still a `NotSupportedException`, so an existing `catch` keeps working. Capability rows
are there from the first tick: session rows are pending until a server world runs, and a service whose native part is
missing lowers its features and takes that back when the part appears. `kiln/state/capabilities.json` lists them.
Results are kiln results (`IKilnResult`, with `Ok` and `Reason`), and the analyzers warn about one nobody reads and a
capability nobody checks ([KILN120 and KILN121](/kiln/wiki/lint#c-analyzers)). Members carry what they need
(`[RequiresCapability]`, `[ServerOnly]`, `[TickThreadOnly]`, `[AnyThread]`).

## Weather

```csharp
WeatherResult w = await Time.SetWeather("rain", TimeSpan.FromMinutes(10));   // no duration: until ReleaseWeather
await Time.ReleaseWeather();
```

New in 0.2.0-dev.27 (service Time). `Time.SetWeather` starts a weather phenomenon by its name, on every weather layer
that has one of that name, or on one layer; `"none"` is a clear sky. The game runs the change, with its fades, and tells
every player's game. `Time.WeatherPhenomena` lists the names, `Time.Weather` the layers, and `WeatherChangedEvent`
reports every change, the game's own rolls too (`ByKiln` tells them apart). Capability `time.weather_choose`. A hold
doesn't outlast a server restart. The sample `SkyControl` uses it.

## The advanced tier

Low-level hooks into the game's code, for the rare mod that needs them. Opt in with `"advanced": true`. Detours, mid
hooks, memory patches, symbols, and the hook registry new in 0.2.0-dev.21: [Hooks and patches](/kiln/wiki/hooks).
