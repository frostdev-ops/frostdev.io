---
title: "Station tabs, inventory owners and menu extras"
nav: "Station tabs and owners"
description: "Lay out a station's crafting menu in tabs, ask what kind of inventory an entity is, list a base's chests, draw world markers over the game's menus, and give config sliders a step."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.31 (dev.31+, mod API 0.2.17).** Station tabs: offline tests, host tests and a dedicated-server lab with fake
> Kiln clients; **not seen in a game client** (checks 16a-c1 to c11). The owner query and `Bases.Chests` ran in labs and tests. Drawing
> over menus and slider steps are not yet checked in a real game.

Five small additions that came with the same release.

## Station tabs

A station with a workshop of its own can lay out its crafting menu: **tabs** with names, **sets** of recipes in each tab, a heading
above every set but the first. You name recipes by a key of yours (`MenuKey`), never by the game's names.

```csharp
var forge = Blocks.Define("rune-forge", new StationBlock
{
    Name = "Rune Forge", Kind = StationKind.Forge, Processing = new ProcessingBlock(),
    Menu = new MenuBlock
    {
        Like = StationKind.Workbench,        // the menu whose tab icons it reuses
        Tabs =
        [
            new StationMenuTabBlock { Key = "metal", Name = "Metal", IconFromTab = 0,
                Sets = [new StationMenuSetBlock { Key = "main", Recipes = ["reclaim", "bolts"] }] },
            new StationMenuTabBlock { Key = "fine", Name = "Fine", IconFromTab = 1,
                Sets = [new StationMenuSetBlock { Key = "main", Recipes = ["wire"] },
                        new StationMenuSetBlock { Key = "plates", Heading = "Fine work", Recipes = ["other-mod:plate"] }] },
        ],
    },
    Recipes = [new RecipeBlock { MenuKey = "reclaim", Seconds = 6, Needs = { [GameItems.Material_T1_Metal_Sheets] = 1 }, Output = GameItems.Material_T1_Metal_Scraps }],
});
```

The same goes in `blocks/*.json` as `"menu": { "like": "workbench", "tabs": [ ... ] }` with `"menuKey"` on the recipes.

- **Recipes by key.** `MenuKey` is 1 to 64 characters of `A-Za-z0-9._-`. A menu names recipes as `"key"` (this mod's) or `"mod:key"`
  (another mod's recipe at this station). It lists exactly what it names, once each; a recipe it doesn't name stays valid but
  isn't shown. A name that matches no recipe, or two, is a mistake.
- **Limits:** 15 tabs, 28 sets a tab, 512 recipes a tab. Texts are a string or a map of languages.
- **Icons** are borrowed: `IconFromTab` is the icon of that tab (from 0) of the `Like` menu. A tab the game's menu doesn't have is
  refused when a player's game builds the menu, and the menu then shows without tabs. Icons of your own aren't supported yet.
- **Only a workshop of its own.** Tabs on a station that shares its kind's workshop are refused: the game's own stations keep the game's
  menus.
- **More than one layout.** `StationMenus.Define(station, new StationMenuDefinition { Key = ..., Tabs = [...] })` on the tick thread
  lays a layout of code over the block's; the newest wins, `Registration.Dispose()` takes it off. A refusal is `Ok = false` with a reason
  such as `PendingContent`, `ContentSyncDisabled` or `PeersLackStationMenus`. `StationMenuDefinitionChangedEvent` follows every change and,
  on a client, `StationMenuAppliedEvent` says whether the game built the menu.
- **Players.** The server sends its menus to Kiln players. While a menu exists, a player whose Kiln is too old for it is refused at the
  door ("station-menu protocol1 required"). Players without Kiln never get a mod's own station, so they aren't concerned.

[Game UI](/kiln/wiki/game-ui#crafting-menus) covers `Ui.Crafting.AddTab`, which adds a tab to the game's own crafting menus on one client.
This is for your own stations, and every Kiln player sees it. More on stations: [Stations and bases](/kiln/wiki/stations).

## What kind of inventory is this?

```csharp
foreach (var owner in Items.FindInventoryOwners(InventoryKinds.Containers))
    if (owner.Kind == InventoryOwnerKind.ProductionStation) Log.Info($"station {owner.Entity}");
```

`Items.FindInventoryOwners(kinds)` returns the entities `FindInventories` finds, each with an `InventoryOwnerKind` that Kiln can **prove**.
Server world, tick thread, capability `items.inventory_kinds` (`Items.InventoryKindsCapability`). `FindInventories` and `Bases.Storage`
are unchanged.

| Kind | Proven by |
|---|---|
| `Unknown` | nothing. Ordinary storage chests are here: no component tells a chest from another plain container. Also a base's storage while the game's bases can't be read |
| `Player` | the game's player flag on its inventory |
| `Npc` | the game's NPC flag (a villager) |
| `PlayerStorage` | a holder of a [persistent player storage](/kiln/wiki/inventory); only listed with `InventoryKinds.PlayerStorage` |
| `ProductionStation` | the entity carries the game's factory station component |
| `BaseStorage` | in a base's crafting stock this frame: a Magic storage chest, or a player-planted refilling fruit tree or palm |

Kiln never guesses from a template's name. The codes only ever get new members; a code your Kiln doesn't know reads as `Unknown`.
Moving items within one owner stays refused (`Items.Move`): take worn equipment off with `Items.Unequip`
([Inventory transfers](/kiln/wiki/inventory#equip-and-unequip)).

## A base's chests: Bases.Chests

The game's crafting stock of a base holds only the Magic chests (and refilling fruit trees and palms); **ordinary chests never are**
in it, and `Bases.Storage` and `Bases.Stock` still leave them out. `Bases.Chests(baseId)` lists the base's chests, ordinary ones too:

- the base's crafting-stock containers (kind `BaseStorage`), and
- the containers of no proven kind (`Unknown`) that the game's own position lookup puts in this base;
- **never** a player, an NPC, a player's storage or a production station.

No component of the game tells a chest from another plain container, so a plain container that isn't a chest is listed too, and
so are the base's refilling fruit trees. **Being listed grants nothing:** check the player's permission yourself before taking from or
depositing into a chest for them. It reads every container in the world and looks up each one's base, so poll it every few
seconds rather than every tick. It answers an empty list for a base id that no longer exists. Server only, tick thread; needs
`stations.read` and `items.inventory_kinds`.

## Draw over the game's menus

Since 0.2.0-dev.31 `e.World` in a [render frame](/kiln/wiki/drawing) **draws nothing while one of the game's menus covers the world**: the
map, the inventory, crafting, storage chests, the character screen, the journal, the skill tree, NPC dialog, the pause and settings
menus, and the main menu, loading and credits screens. A marker, label, icon, line, box or ring submitted then is left out for that
frame, and `Ready`, `ToScreen` and the return values stay what they would be, so your own logic sees no difference.

To draw over a menu on purpose, use `e.WorldOverMenus`: the same calls.

```csharp
[Subscribe]
private void OnFrame(RenderFrameEvent e)
{
    if (!e.Camera.Valid) return;
    e.World.Label(_home, "Home");                       // on the HUD only
    e.WorldOverMenus.Marker(_home, Color.Orange);       // also over the map and the inventory
}
```

`e.Draw` (pixels) is never hidden. On the HUD, in the text chat, on a screen Kiln doesn't know and while the screen isn't
known, `e.World` draws as before. Not yet checked in a real game.

## Slider steps: [Range(min, max, step)]

A number with a `[Range]` is a slider with a number field beside it, on the in-game config page and in the launcher. A third
argument gives the slider a step:

```csharp
public sealed class MyConfig
{
    [Comment("Chance a bolt finds its mark."), Range(0, 1, 0.05)] public double Chance { get; set; } = 0.25;   // 0, 0.05, 0.1 ...
}
```

It moves from `min` in steps of `step` (`min + n * step`, the last one at or below `max`). It is **editor metadata only**: a value typed
into the number field, read from the file, set with `TrySet` or sent by a server keeps the plain bounds check and is never rounded,
and a saved value off the step stays as it is until the slider is moved. A command argument's `[Range]` ignores the step. The
step counts only for an int or float entry (not a list or a duration), when it is positive, finite, no larger than `max - min`, and for
whole numbers a whole step and a whole `min`; any other step is ignored and the slider moves as with `[Range(min, max)]`.
`ConfigEntry.Step` and the config schema's `step` carry it.
