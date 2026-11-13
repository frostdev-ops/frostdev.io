---
title: "Inventory transfers"
nav: "Inventory transfers"
description: "Move gear with its state, put items on and take them off, read container names, keep items out of quick stack or move all, and keep data on one item."
status: "pending"
updated: "2026-11-13"
---

> **New in 0.2.0-dev.20.** These APIs require the dev.20 runtime and MDK or newer. Server evidence and pending client checks are tracked on
> [What works today](/kiln/wiki/status#new-in-020-dev20).

`Kiln.Items` adds moves that preserve the item's entity: level, upgrades, gem slot and durability follow it. A take followed
by a give creates new gear. Everything here runs on the tick thread; moves finish in a later simulation step.

## Move a stack

```csharp
var sword = Items.Read(player)!.Slots.First(s => s.IsGear && !s.IsEquipped);
MoveResult result = await Items.Move(player, sword.Slot, chest);
if (result.Succeeded) Log.Info($"Moved {result.Done} item(s)");

await Items.Move(chest, slot, player, count: 3);
await Items.QuickStack(player, chest);       // items the chest already holds
await Items.MoveAll(chest, otherChest);      // every stack that fits
```

Check `Items.MovesAvailable` first. `count: 0` means the whole stack. `MoveResult` reports `Done`, `Partial`, `NoRoom`,
`NotEnough`, `NoInventory`, `SlotChanged`, `Refused`, `Unavailable` or `Dropped`. Its `Changes` ledger lists the first 16
changes, including source, destination, item, amount and gear entity; totals cover all changes.

`MoveOptions.DryRun` runs and rolls back, without a transfer event. Equipped/held gear and the action bar stay out by
default; `Equipped` and `ActionBar` opt in. `Silent` skips transfer rules and events.

Since dev.21 a dry-run move also runs native transfer handlers (`kiln.items` `transfer_listen`), unless it is silent too.
They see `KILN_TRANSFER_DRY_RUN` in `ev->flags`. Keep and cancel as usual, so the dry run predicts the real move, but
don't count, log or change anything outside the transfer: it is all rolled back.

## Equip and unequip

```csharp
var ring = Items.Read(player)!.Slots.First(s => s.Item == ringId);
EquipResult r = await Items.Equip(player, ring.Slot, EquipmentSlot.Ring1);   // or leave the slot out: the item's own
if (!r.Ok) Log.Info($"not equipped: {r.Reason}");
await Items.Unequip(player, EquipmentSlot.Glider);                          // into a free backpack slot
```

New in 0.2.0-dev.27. Both run the game's own equip on the server, with all its checks, and the player sees it like
their own. `EquipResult` says what moved where, or why not; `EquipOptions.DryRun` asks without changing anything, and
`EquipChangedEvent` follows each change Kiln made. Check the capability `items.equip` first. Proven on a test server with
stand-ins for players; what a player sees is not checked in a game yet. The sample `Loadouts` uses both.

## Names, rules and reports

```csharp
if (Items.ContainerNamesAvailable && Items.ContainerName(chest) == "Ores")
    await Items.QuickStack(player, chest);

using var keep = Items.Transfers.Keep(slot);
using var keepTorches = Items.Transfers.KeepItem(torchItemId, player);
using var deny = Items.Transfers.Deny(vault, TransferKinds.QuickStack);
```

`ContainerName` reads the name a player entered; it does not rename a chest. An unnamed chest returns null.

Rules keep a source slot, keep an item for an owner, or deny quick stack/move all into or out of a container. They end when
disposed or the mod unloads. They cover the game's quick stack and move all, including a Quick Stack Station.
`InventoryTransferEvent` reports the result on the tick thread afterwards; it is not cancelable. To cancel a player's
incoming request, handle `PlayerClientActionEvent` only when `e.Name == "inventoryTransferAction"` and `e.CanCancel`.
Then parse `e.Payload` with `Items.Transfers.ParseAction` and cancel the held action if your rule requires it. The parser
does not identify an action from its bytes. Joined-client events cannot cancel the server's action; a station has no
such client request.

## Item data and saves

**Gear entity data is session-only.** `EntityData.IsPersistent(gearEntity)` is false. An attachment follows `Items.Move`
within the session, but a sword has no stable world-position identity for a restart. Kiln omits those attachments from new
saves and refuses old positional gear records, so two identical swords cannot inherit each other's data. Saved world
entities such as chests retain their normal persistence.

For a value that stays with one item through moves, saves and restarts, use `InstanceData` (since 0.2.0-dev.26):

```csharp
public sealed class Notches { public int Count { get; set; } }

_notches = InstanceData.Key<Notches>("notches");                  // in OnLoad: one typed key per kind of value
sword.Get(_notches).Count++;                                       // sword: an ItemInstanceRef (Items.Held, a move result, ...)
```

`Get`, `TryGet`, `Has`, `Set` and `Remove` work on the item. When Kiln can't tell two identical items apart, the value
waits instead of jumping to the wrong item: `InstanceData.Parked(key)` lists such records, and since 0.2.0-dev.27 the
mod can put one on an item with `InstanceData.Claim(parked, item)` or drop it with `InstanceData.Discard(parked)`.
Admins do the same with `/instances claim <record> <holder> <slot>` and `/instances discard <record>`.

**In players' games (new in 0.2.0-dev.27).** A value stays on the server unless its key says who may see it:
`new InstanceKeyOptions { Sync = InstanceSync.Holder }` sends it to the player who holds the item, `InstanceSync.Nearby`
also to players near the holder. The mod runs on both sides (`"side": "both"`), declares the same key in the game, and
reads it there with `InstanceData.Synced` or `InstanceDataSyncedEvent`. A value never goes to a player the key doesn't
name, and a player without Kiln notices nothing. A mod can't draw into the game's own item tooltip yet: show the value
in a screen of your own, a HUD line or a notice. The sample `ItemData` shows its notch count this way.

Rolled bonuses on one item are [affixes](/kiln/wiki/affixes), kept as item data of Kiln's own.

## With shroudlink and with players

The transfer implementation is ported from shroudlink's MIT API and calls the game's own transactions. Kiln's hooks can
chain with [shroudlink](/kiln/wiki/more-frameworks#shroudlink); rule disposal ends the rule, not the process-lifetime hook.

A joined player must still confirm the visible slot updates, equipped-item behaviour, R-key transfers, station reports,
renamed chests and the optional shroudlink client addon's slot locks. A server test cannot show those interactions.
