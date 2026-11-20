---
title: "Production stations and bases"
nav: "Stations and bases"
description: "Let a mod run a base's kilns, smelters and looms: fill them from the Magic chests, stop and start them, pick their recipe, collect what they made, lend their finished items to fills and crafts, and watch them."
status: "works"
updated: "2026-11-19"
---

New in 0.2.0-dev.29.14 (mod API 0.2.6). A mod can keep a base's production stations going the way a player does with
the station's own buttons: kilns, smelters, looms, grinders, seed beds, every station that crafts by itself.

**For players:** nothing changes until a mod asks. A mod fills a station from your base's **Magic chests**, the same
chests and the same rule as the game's "fill from chests" button. **Ordinary chests are never touched** unless a mod
names them on a fill (since 0.2.0-dev.29.17). Stopping "now" works like the game's stop button (the running craft
starts over, its materials go back into the station); "after the current craft" loses nothing. A Magic chest you set to
not take deposits at the quick-stack station never receives a station's output. Since 0.2.0-dev.29.17 a mod can also
let a station lend its finished items to its base: the charcoal still in a kiln can fill the forge next to it and pay
for your crafts ([below](#station-outputs-as-stock)).

## In your project

```xml
<KilnServices>Stations</KilnServices>
```

Since 0.2.0-dev.29.15 `Stations` gives you `Stations` and `Bases` and keeps your mod `side: server` with no
`clients` need, so players without Kiln can still join a server that only automates stations. (Listing `Blocks`, as with
29.14, also works but makes the mod `side: both` and `clients: kiln`, which is only right for a mod that defines
[blocks](/kiln/wiki/blocks).)

Everything runs in the server world on the tick thread: a dedicated server, or a game while it hosts its own world. A
player who joined someone else's world has none: `Stations.Available` is false there. Such a player's half of your mod
asks its server half with [your own messages](/kiln/wiki/network).

## Bases

For the game's crafting, a base is the overlapping zones of flame altars, with the containers crafting may take from:
the **Magic chests** (and refilling fruit trees and palms) and its water sources.

```csharp
foreach (BaseInfo b in Bases.All) Log.Info($"{b} \"{b.Name}\"");
BaseInfo? home = Bases.Of(player);                                // the base the entity stands in
IReadOnlyList<EntityId> chests = Bases.Storage(home!.Id);
IReadOnlyList<EntityId> deposit = Bases.Storage(home.Id, deposit: true);   // those that take deposits
long logs = Bases.Stock(home.Id, Items.Lookup("Material_T1_Wood_Logs")!.Id);
var made = Bases.StockWithStations(home.Id);                      // plus finished items still in stations (29.15)
EntityId? room = Bases.FindRoomFor(home.Id, charcoalId);
```

- **A base's id changes** when an overlapping altar is added or removed: it is the smallest of its altars' ids. Keep
  per-base data by an altar's own id (`BaseInfo.Altars`), in `WorldData`. `BasesChangedEvent` says which ids were
  `Added`, `Removed`, `Changed` (carry your data over) or `Kept`.
- The game rebuilds its bases every step, so a base can be gone between two reads. Since 0.2.0-dev.29.15 `Storage`,
  `WaterSources`, `Stock`, `Stations.InBase` and `FindRoomFor` then answer empty or null instead of throwing.
- Nothing fires when a player puts items into a chest: poll `Bases.Stock` every few seconds.

## Read a station

```csharp
IReadOnlyList<EntityId> mine = Stations.InBase(home.Id);
StationInfo? s = Stations.Read(kiln);                             // null: not a station, or gone
Log.Info($"{s!.DisplayName}: {s.State}, {s.CraftsLoaded} crafts loaded, {s.Progress:P0}");
EntityId? near = Stations.Nearest(player, workshop: s.Workshop, radius: 8);
```

`StationInfo` has the state (`NoRecipe`, `MissingMaterials`, `Paused`, `Stopped`, `Running`, `MissingOutputSpace`),
the running and selected recipe, the crafts it holds, progress, water, `Outputs`, `Leftovers` and `StopPending`.
`Stations.RecipesOf(station)`, `Stations.Recipe(id)` and the ingredient `Categories` describe what it can make, and
`Stations.Plan(station, options)` says what a fill would do without doing it. `Stations.All()` is complete once
`Stations.Scanned` is true.

**Names for players** (0.2.0-dev.29.15): `StationInfo.DisplayName` ("Charcoal Kiln"), `StationRecipe.DisplayName`
("Charcoal"), `Stations.WorkshopName` and `Stations.RecipeName`, in the player's language. The last two and
`Items.DisplayName` work on any side, also on a joined player's game, so a menu there can name what its server half
sends. Icons: [Game UI](/kiln/wiki/game-ui#item-icons-and-names).

## Act on a station

```csharp
StationResult r = await Stations.Fill(kiln, new FillOptions { Crafts = 10 });                // hold 10 crafts in all
await Stations.Fill(kiln, new FillOptions { Crafts = 2, Mode = FillMode.Add });              // 2 more
await Stations.Fill(kiln, new FillOptions
{
    Crafts = 50,
    Keep = new Dictionary<ItemId, long> { [logsId] = 200 },                                  // leave 200 logs in the chests
});
await Stations.Stop(kiln, StopWhen.AfterCurrentCraft);
await Stations.Resume(kiln);
await Stations.Select(kiln, recipeId);                                                       // the recipe it repeats
await Stations.CollectToBase(kiln);                                                          // finished items into Magic chests
if (!r.Ok) Log.Info($"fill: {r.Status} {r.Message}");
```

| Action | What |
|---|---|
| `Fill` | the game's own "fill from chests": up to (`UpTo`) or `Add` N crafts, with reserves (`Keep`), all or nothing (`Exact`), a `DryRun`, water from the base's sources; never from a player's bag unless `Player` names one. Since 0.2.0-dev.29.17 also from up to 64 ordinary chests of the base that `Chests` names, after the Magic chests, and from [station outputs](#station-outputs-as-stock) |
| `Stop` | `Now` (the stop button: the running craft starts over) or `AfterCurrentCraft` (nothing lost; a later `Resume`, `Select` or `Stop` withdraws it; not saved over a restart) |
| `Resume` | clears the stop |
| `Select` | the recipe the station repeats; refused (`Locked`) when no player on the server has unlocked it, unless `allowLocked` |
| `Collect`, `CollectToBase` | finished items (or leftovers) into one container, or into the base's chests that take deposits |

Each action runs in the game's own transaction and answers one step later with a `StationResult`: `Status` (`Done`,
`Partial`, `NotEnough`, `NoRoom`, `NoBase`, `Locked`, `Unchanged` and more), what moved (`Changes`), what limited it
(`LimitedBy`, `ShortItem`) and whether a retry makes sense (`CanRetry`). A refusal is a result, never an exception.
Players and the game act while you await: read the station again afterwards.

The stop flag is the game's own and has no owner: players see the station stopped and can start it again.

## Station outputs as stock

New in 0.2.0-dev.29.17 (mod API 0.2.9, GitHub #68, proposed by bisdat). A station can lend its finished items to its
own base: the charcoal still in a kiln fills the forge next to it.

```csharp
Stations.SetOutputSource(charcoalKiln);                         // opt in; kept with the save
bool lends = Stations.IsOutputSource(charcoalKiln);
IReadOnlyList<EntityId> lenders = Stations.OutputSources(home.Id);
StationResult r = await Stations.Fill(forge, new FillOptions { Crafts = 5 });
Log.Info($"{r.FromOutputs} item(s) came from station outputs");
await Stations.Fill(forge, new FillOptions { Crafts = 5, UseStationOutputs = false });   // the game's sources only
await Stations.Fill(forge, new FillOptions { Crafts = 5, Chests = [woodChest] });        // an ordinary chest too
```

- **Opt-in per station.** Nothing lends by default; a base with no station opted in fills exactly as the game does.
- **Last.** A fill takes from the player's bag (when it names one), then the Magic chests, then the ordinary chests it
  names, and from opted-in stations only what those can't cover. All or nothing, inside the game's own transaction.
- **Only finished items**, and only to its own base: never a station's queued inputs (a kiln's logs stay), its
  leftovers, or an output that is also an input of its recipe.
- **A player's craft** at any crafting menu uses the same opt-in, after the bag and the Magic chests, with the game's own
  base and permission checks. A Kiln player's crafting menu counts the outputs it may use; a player without Kiln sees
  the game's normal counts and can still craft what the bag and chests cover.
- **The station screen's fill buttons** (since 0.2.0-dev.29.19, GitHub #68). On a Kiln client with a Kiln server, a
  production station's "+1" and "+10" light up when station outputs cover the fill, and pressing them fills from them.
  The server checks every press again; a press that no longer fits (the outputs were taken meanwhile) is refused by the
  game and nothing moves. The ingredients' **Available** counts, on the station screen and in the crafting menu,
  include those items too. A game without Kiln keeps the game's own buttons and counts, and other screens (building
  costs) keep the game's counts. With Creative Mode running, Kiln's crafting-menu counts stand aside. Seen in a real
  game on a test build: a Charcoal Kiln's charcoal counted as Available at a Forge, and Fill took it straight from the
  kiln; other station types, the crafting menu and players without Kiln are not checked yet. Up to
  0.2.0-dev.29.18 the buttons needed the bag and the Magic chests to cover a fill.
- An opt-in is kept beside the save with the mod that set it, and comes back after a restart while that mod is loaded.
  Touch `Stations` in `OnLoad` (an event subscription will do) so it starts in time.

Rows `stations.output_sources`, `stations.craft_sources` (server), `stations.craft_ui` (a Kiln client's counts), and
since 0.2.0-dev.29.19 `stations.stock_ui` and `stations.fill_ui` (a Kiln client's station screen and ingredient rows).
Their hooks go in only once a Kiln server's craft-stock snapshot is on, so a game with a vanilla server, or with nothing
lent, gets none of them.
`Stations.Collect` and `Stations.CollectToBase` behave as before.

**Native plugins** (`kiln_stations.h`, 0.2.0-dev.29.17): `base_stock_with_stations`, a native `collect` into the base's
Magic chests, named chests on a fill request (the new request is 104 bytes; the old 88 still works),
`set_output_source` and `output_sources` (per session), and the fill flag `KILN_STATION_FILL_NO_OUTPUTS`. Permission
checks and display names stay managed only for now.

## Events

| Event | When |
|---|---|
| `StationStateChangedEvent` | state, stop flag or recipe changed; `ByMod` or `Player` says who caused it |
| `StationCraftedEvent` | a station finished a cycle |
| `StationPlacedEvent`, `StationRemovedEvent` | a station appeared or is gone |
| `BasesChangedEvent` | altars were added, removed, merged or split |
| `StationPlayerActionEvent` | a player pressed a station's button, before the game runs it: `Cancel()` and it doesn't |
| `StationChangedEvent` | a call of `Stations` changed a station, with its result and the mod that called |

Since 0.2.0-dev.29.14 `ItemCraftedEvent` counts a station's cycle **once**, when the items are made (before, twice:
at its start and at its end), so quest objectives such as "craft N of..." count right.

## Who may change what

The actions check nothing about players: they are the server's. When your mod acts for a player, check on the server
that the station's base is theirs (`Bases.Of(player)?.Id == Stations.Read(station)?.Base`) and that they may edit it, or
use a [permission](/kiln/wiki/permissions) node of your own.

## A panel at the station's screen

Since 0.2.0-dev.29.15 a crafting panel can show next to a production station's own screen:
[Crafting menus](/kiln/wiki/game-ui#crafting-menus).

## Tested

In a real game (a hosted world, Linux, Proton): a charcoal kiln read with its recipes, select, plan, fill from the Magic
chests, stop now and resume, stop after the current craft, collect into a Magic chest, the station's screen agreeing,
a player's stop press cancelled by a mod, ordinary chests never used, and a Magic chest switched off for deposits left
out. Dedicated-server lab checks cover water stations, reserves, exact fills and restarts. Not yet seen in a real game:
a dedicated server with joined players, water stations other than the seedling bed, and recipes with ingredient
categories. The 29.15 names and panels are not yet seen in a real game. 0.2.0-dev.29.17's station outputs and named chests ran
in lab checks on a dedicated server (fills and a character's craft paid partly from a kiln's charcoal while its queued
logs stay); a Kiln player's crafting counts from station outputs, and a craft paid from them in a hosted game, are not
yet seen in a real game. Neither are 0.2.0-dev.29.19's station screen counts and fill buttons with station outputs.

The full guide is in Kiln's repository, `docs/kiln/services/stations.md`, on
[GitHub](https://github.com/frostdev-ops/kiln).
