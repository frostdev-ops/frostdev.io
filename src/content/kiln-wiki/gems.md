---
title: "Gems and the Shroud Forge"
nav: "Gems"
description: "Change the game's gems, make new ones with their own effects, run the Shroud Forge's actions from code, give rings and armour a socket, and offer chest gems at the forge."
status: "pending"
updated: "2026-11-17"
---

New in 0.2.0-dev.29.11 (mod API 0.2.5), with chest gems at the forge in 0.2.0-dev.29.15 (mod API 0.2.7, GitHub #61).

**For players:** nothing changes until a mod asks. Without a gem mod, gems, the forge and its lists work as in the
game. With one:

- **Rings, armour and shields with a socket** are listed at the Shroud Forge on a Kiln client. Take the piece off first:
  the forge lists what is in your backpack and action bars, not what you wear.
- **Chest gems at the forge** (29.15): on a server whose mod offers them, the gems in your chests show in the forge's
  own GEMS list after your own, and you can insert, upgrade and recycle them without moving them first. The mod can
  let a chest or your base's Magic chests pay the essence. This needs Kiln 0.2.0-dev.29.15 or newer in your own game;
  without it the forge works as usual.
- **A removed mod's gem** stays in your inventory or socket as `[Missing: ...]` after a restart. It no longer turns into
  its base gem: a gem whose effect was the mod's code does nothing; a copy of a game gem keeps that gem's effect with
  the game's numbers.

## How a gem works

A gem is an item with a level from 1 to 105. It names an [Impact program](/kiln/wiki/impact) and the numbers that
program reads (`impactValues`), scaled by the gem's level. While its carrier is worn or held, the game runs that program
for the wearer: most gems react to the wearer's hits (a crit, a kill, a backstab, a block), two are passive. A gem
reacts to every hit of its wearer, not only to the hits of the weapon that carries it.

## Change a game gem with a data pack

```json
{ "format": 1, "items": {
    "T1_Gem_GemOfBleeding":   { "impactValues.0x5e34f09b": { "mul": 2 }, "impactValues.0x3ff81f2b": 10 },
    "T5_Gem_GemOfNecromancy": { "impactValues.0x952ec6b4": 8 } } }
```

That doubles the Gem of Bleeding's cut damage, makes its bleed last 10 s at level 1, and sets the Necromancy gems'
wait to 8 s. The tooltip's numbers follow. See [Game data](/kiln/wiki/game-data).

The game copies a gem's numbers when its effect starts (equipping, switching the hotbar to the weapon, a socket
change): after a change, tell players to switch the hotbar away from the weapon and back. The effect runs on the server,
so it is right for everyone; the tooltip numbers are each player's own (Kiln players get the synced values).

## Read gems and their events

```csharp
foreach (var g in Gems.Catalog) Log.Info($"{g.DisplayName ?? g.Name}: {g.Rarity}");
foreach (var eq in Gems.Equipped(player))                        // the gems running for this player now
    Log.Info($"{eq.Slot}: {Gems.Get(eq.Socket.Gem)?.DisplayName} level {eq.Socket.Level}");
if (Gems.Socket(Items.Held(player)) is { } s) Log.Info($"held: {s.Gem} level {s.Level}");

[Subscribe]
private void OnGem(GemTriggeredEvent e) => Log.Info($"{e.Player}'s gem hit {e.Target}");
```

| Event | When |
|---|---|
| `GemTriggeredEvent` | a socketed gem did something: damage, a buff, a spawn (observe only) |
| `GemSocketChangedEvent` | a socket of a player's item was filled, emptied, upgraded or its gem destroyed, however it happened (a few steps late) |
| `GemCraftingEvent` | a player is about to use a forge: cancel it and nothing is paid or moved |
| `GemCraftedEvent` | a forge action happened, a player's or code's, with the price and the levels before and after |
| `GemForgeOpenedEvent` | a Kiln player's forge screen opened or is still open (29.15) |

Capability `gems.read`. The reads and events run on the server and in a game that hosts its own world.

## New gems

A new gem is a copy of a game gem with its own GUID, name, texts, icon, rarity and level range. The forge lists,
sockets, upgrades and recycles it like a game gem. A data pack alone can make one that runs its base gem's program, or
any other loaded Impact program, with its own numbers:

```json
{ "format": 1, "items": {
    "add": [ { "guid": "580482cb-9771-4d5e-bdc2-24a268f33407", "name": "MyMod_Gem_DeepCuts",
               "base": "T1_Gem_GemOfBleeding", "icon": "icons/deep-cut.png", "displayName": "Gem of Deep Cuts",
               "fields": { "rarity": "Rare", "itemLevelRange.minLevel": 1, "itemLevelRange.maxLevel": 105 } } ],
    "MyMod_Gem_DeepCuts": { "impactValues.0x5e34f09b": 14 } } }
```

Set both ends of `itemLevelRange`: a gem with one level can't be upgraded. Keep the `guid` forever; saves keep it.

With C#, `Gems.Register` gives the gem an effect in your own code:

```csharp
public override void OnLoad()                 // on every side that has the mod: players need the item to show it
{
    GemHandle gem = Gems.Register(new GemDefinition
    {
        Id = "mymod:reaper", BaseOn = "T1_Gem_GemOfBleeding", DisplayName = "Gem of the Reaper",
        Trigger = GemTrigger.OnKill(),
        OnTrigger = ctx => Log.Info($"{ctx.Player} killed {ctx.Target} with a level {ctx.Level} gem in {ctx.Slot}"),
    });
    if (!gem.Ok) Log.Warn(gem.Reason!);
}
```

Triggers: `GemTrigger.OnHit()` (or `OnHit(crit: true)`), `OnKill()`, `OnBackstab()`, `OnHitTaken()` and
`Passive(interval)`. The handler runs on the server's tick thread one step after the hit, with a `GemTriggerContext`
(player, target, gem, level, carrier, slot, damage, crit, kill, backstab, blocked). Capability `gems.triggers`. The
samples `GemSample` (a data-pack gem) and `GemEffects` (Gem of Frostbite: a crit slows; Gem of Renewal: a kill heals)
show both ways.

## Forge actions from code

| Call | The forge's action |
|---|---|
| `Gems.Socket(player, carrier, gem, forge, options?)` | insert a gem into an empty socket |
| `Gems.Unsocket(player, carrier, forge, options?)` | take it out |
| `Gems.Upgrade(player, gemOrCarrier, forge, options?)` | one level up, to the gem's and the forge's cap |
| `Gems.Recycle(player, gemOrCarrier, forge, options?)` | destroy the gem for essence |

Each runs the forge's own transaction with its rules and price, and answers a `GemCraftResult`: `Done`, or why not
(`NotEnough`, `NoForge`, `NoRoom`, `MaxLevel`, `Occupied` and more), with what was paid and received. Every action needs
a forge. `GemCraftOptions`:

- `Cost`: `GemCost.Free` or another price.
- Since 0.2.0-dev.29.15: `GemHolder` and `CarrierHolder` (the gem and its carrier in different places, one
  transaction), `PayFrom` (`GemPayer.Player`, `GemPayer.From(chest)`, `GemPayer.BaseStorage` for the base's Magic
  chests, or `GemPayer.PlayerThenBaseStorage`) and `ReturnTo` (where an unsocketed gem and Recycle's essence go).

```csharp
await Gems.Upgrade(player, gemInChest, forge, new GemCraftOptions { GemHolder = chest, PayFrom = GemPayer.From(chest) });
await Gems.Unsocket(player, sword, forge, new GemCraftOptions { ReturnTo = chest });
```

The game still sets the price; when the payers can't pay, nothing is paid or moved. Capabilities `gems.craft`, and
`gems.payers` for payers other than the player.

## Chest gems in the forge's GEMS list

New in 0.2.0-dev.29.15. A server mod offers a container's gems to one player while their forge screen is open; on the
player's Kiln client they show in the game's own GEMS list:

```csharp
Events.On<GemForgeOpenedEvent>(e =>
{
    foreach (var chest in ChestsThePlayerMayUse(e.Player))   // your rule: their base, a permission, a distance
        Gems.OfferChestGems(e.Player, chest, new GemSourceOptions { PayFrom = GemPayer.From(chest), ReturnTo = chest });
});
```

- Each offer is for one player in their current session, one slot and one item, works once, lapses after its
  `Lifetime` (30 s by default, at most 120 s), and is withdrawn when the screen closes or the player leaves.
  `Gems.WithdrawChestGems` takes your offers back.
- The server checks everything again when the player acts. From the first offer in a world on, a forge request whose
  weapon is not in the player's own inventories, or that names a gem outside them without a live offer, is refused
  with nothing moved. Before any offer the forge behaves exactly as without Kiln.
- A mod needs only a server half: Kiln's own server half sends the offers to Kiln clients. Capabilities `gems.sources`
  on the server and `ui.gemforge.sources` on the client.
- The game's own forge only ever takes essence from the player's backpack. When a chest pays, it pays in the forge's
  base upgrade material.

On a game client, `Ui.Values.GemForgeCandidates()` and `SubscribeGemForgeCandidates` give a read-only copy of the GEMS
list the forge shows, with the selected row (capability `ui.gemforge.inspect`, GitHub #42).

## Sockets on rings, armour and shields

- `Gems.AllowSockets(GemSocketKinds.Rings | GemSocketKinds.Armour, rollChance)` lets new gear of those kinds roll a
  socket (weapons keep the game's roll) and makes the forge list such gear on Kiln clients. Call it on both sides.
- `Gear.GemSlot` on a give, or `"gemSlotOverride": true` on an item in a data pack: a new item with an empty socket.
- `Gems.AddSocket(item)` gives an existing piece a socket and keeps its level, upgrades, rarity, dye and durability
  (the item gets a new entity; worn items are refused). It answers `Incomplete` with `Missing` if something didn't carry
  over.
- A socketed gem works from any worn piece: up to 11 gems can run at once. Balance is your mod's.
- **Uninstall:** `Gems.ReturnSocketedGems(player)` hands back every gem in a player's non-weapon gear, free, without a
  forge. Run it before a server stops using your mod: the game's own forge can't take those gems out.

Capability `gems.sockets`.

## Tested

29.11, in a real game hosting its own world (Linux, Proton): new gems' names, icons and levels; socketing and upgrading
by hand with the four events; Frostbite and Renewal; a refused Recycle; rings with a socket at the forge; `AddSocket` and
`ReturnSocketedGems`; sockets kept after leaving and joining; a removed mod's gems doing nothing. Not yet seen: a
dedicated server with a separate Kiln client, a player without Kiln there, the German texts, tooltips after a
data-pack change. 29.15's chest gems passed lab checks on a dedicated server; the forge's GEMS list with chest gems has
not been seen in a real game yet.

The full guides are in Kiln's repository, `docs/kiln/services/gems.md` (with `gems-new.md`, `gems-forge.md` and
`gems-sockets.md`) and `docs/kiln/ui-gemforge.md`, on [GitHub](https://github.com/frostdev-ops/kiln).
