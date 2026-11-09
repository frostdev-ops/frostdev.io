---
title: "Inventory transfers"
nav: "Inventory transfers"
description: "Move gear with its state, read container names, and keep items out of quick stack or move all."
status: "pending"
updated: "2026-11-08"
---

> **dev.20+ — staged.** These APIs are absent from released 0.2.0-dev.19. Server and client checks are tracked on
> [What works today](/kiln/wiki/status#in-preparation-for-020-dev20).

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

This does not add persistent per-item payloads or affixes. Moving the game's own gear state and saving a mod-defined tag
on that gear are separate capabilities.

## With shroudlink and with players

The transfer implementation is ported from shroudlink's MIT API and calls the game's own transactions. Kiln's hooks can
chain with [shroudlink](/kiln/wiki/more-frameworks#shroudlink); rule disposal ends the rule, not the process-lifetime hook.

A joined player must still confirm the visible slot updates, equipped-item behaviour, R-key transfers, station reports,
renamed chests and the optional shroudlink client addon's slot locks. A server test cannot show those interactions.
