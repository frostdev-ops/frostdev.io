---
title: "Inventory transfers"
nav: "Inventory transfers"
description: "Move gear with its state, put items on and take them off, swap whole sets of gear, read and set container names, keep items out of quick stack or move all, and keep data on one item."
status: "pending"
updated: "2026-11-27"
---

> **New in 0.2.0-dev.20.** These APIs require the dev.20 runtime and MDK or newer. Server evidence and pending client checks are tracked on
> [What works today](/kiln/wiki/status#new-in-020-dev20).

`Kiln.Items` adds moves that preserve the item's entity: level, upgrades, gem slot and durability follow it. A take followed
by a give creates new gear. Everything here runs on the tick thread; moves finish in a later simulation step.
Sockets and gems (`Gems.AddSocket`, socketing at the Shroud Forge from code) are on [Gems](/kiln/wiki/gems).

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

**Moves into a player** (0.2.0-dev.30.3, GitHub #109, thanks Fuzen777). Before, a move into a player without `toSlot`
could put a stack into an empty ring or other equipment slot, where the player never saw it. Now:

- A stack moved into a player or an NPC lands only in the **backpack**: the backpack's own pages, then the pages of a
  worn backpack. Never an equipment, currency or customization slot, and the action bar only with `MoveOptions.ActionBar`.
  When nothing fits, the result is `NoRoom` and nothing moves.
- A `toSlot` in a player must be a slot the item may enter: a backpack slot, a currency slot for a currency item, or a
  worn equipment slot of the same type to top up the stack there (arrows onto the worn arrows). A named **empty
  equipment slot is `Refused`**: a move is not an equip, use `Items.Equip`. A `toSlot` that is full or holds another item
  gives way to the backpack search.
- **Kiln checks after the move.** If any of it landed somewhere else, or left the slot without arriving, the move is
  rolled back and `Refused`. So `Done` means the items are where the player can take them.
- Chests and other containers keep the old rule: every page.

Covered by host tests; a real player's backpack is not checked in a game yet. To have the player eat or drink what you
moved, see [Use an item for a player](/kiln/wiki/abilities#use-an-item-for-a-player).

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

Since 0.2.0-dev.29 a player's equipment input can be refused before it happens with `PlayerEquippingEvent`
([Refusing a death, a pickup or an equip](/kiln/wiki/events#refusing-a-death-a-pickup-or-an-equip)).

### Equipment sets

```csharp
EquipmentSetCaptureResult day = Items.CaptureSet(player);         // all 20 slots
var rings = day.Set! with { Entries = day.Set!.Entries.Where(e => e.Slot is EquipmentSlot.Ring0 or EquipmentSlot.Ring1).ToArray() };
EquipmentSetResult r = await Items.EquipSet(player, rings);       // only the two ring slots change
if (!r.Ok) Log.Info($"{r.Status}: {r.Reason}");                   // a refusal is a result: nothing changed
using var plan = Items.PlanSet(player, rings).Plan;              // the steps, without changing anything
```

New in 0.2.0-dev.29 (`items.equip_sets`, server side). `Items.CaptureSet` reads a player's 20 equipment slots,
`Items.PlanSet` says what applying a set would do without doing it, and `Items.EquipSet` applies it in one transaction:
every slot changes or none does. One `PlayerEquippingEvent` decides the whole set, `EquipmentSetChangedEvent` follows a
set that went in, and the result says exactly what changed.

- Sets live for the current world session only; they are not saved loadouts. The hotbar and the main hand are not
  touched, and backpack changes in a set are refused for now.
- On this game build a set with several direct swaps can be refused before anything changes (`UnsupportedSwaps`):
  split it into two sets. Two worn items can exchange slots through a free backpack slot.
- The one exception to "all or nothing" is `InvariantFailure`: the game left the inventory neither as asked nor as
  before, or faulted inside the transaction. Then Kiln warns that the inventory may be in an unknown state
  (`EquipmentSetFaultedEvent`), and sets and single equips switch off until the server, or the hosting player's game,
  restarts.

Sets ran on a dedicated lab server with a stand-in character, including a failure at every step of every form, each
compared byte for byte after the rollback. A real player, a second player watching, and a set kept over leaving and
rejoining are not yet confirmed.

## Names, rules and reports

```csharp
if (Items.ContainerNamesAvailable && Items.ContainerName(chest) == "Ores")
    await Items.QuickStack(player, chest);
bool renamed = await Items.SetContainerName(chest, "Ores");     // 0.2.0-dev.30.3

using var keep = Items.Transfers.Keep(slot);
using var keepTorches = Items.Transfers.KeepItem(torchItemId, player);
using var deny = Items.Transfers.Deny(vault, TransferKinds.QuickStack);
```

`ContainerName` reads the name a player or a mod gave a container. An unnamed chest returns null. To rename one, see
[Rename a container](#rename-a-container).

Rules keep a source slot, keep an item for an owner, or deny quick stack/move all into or out of a container. They end when
disposed or the mod unloads. They cover the game's quick stack and move all, including a Quick Stack Station.
`InventoryTransferEvent` reports the result on the tick thread afterwards; it is not cancelable. To cancel a player's
incoming request, handle `PlayerClientActionEvent` only when `e.Name == "inventoryTransferAction"` and `e.CanCancel`.
Then parse `e.Payload` with `Items.Transfers.ParseAction` and cancel the held action if your rule requires it. The parser
does not identify an action from its bytes. Joined-client events cannot cancel the server's action; a station has no
such client request.

**What kind of inventory is this? (dev.31+)** `Items.FindInventoryOwners` answers a kind (player, villager, player storage, production station,
base storage, or unknown) for each container it finds, only where Kiln can prove it:
[Station tabs, inventory owners and menu extras](/kiln/wiki/station-menus#what-kind-of-inventory-is-this).

### Rename a container

> **New in 0.2.0-dev.30.3 (mod API 0.2.13).** Lab-tested on a test server. Players seeing the name in a real game is not
> checked yet.

```csharp
foreach (var chest in Items.FindInventories(InventoryKinds.Containers))
    if (Items.ContainerName(chest) is null) await Items.SetContainerName(chest, "Unsorted");
```

`Items.SetContainerName(entity, name)` does what a player's Rename button does, through the game's own rename on the
server: the name reaches every player, goes into the save, and shows in the game's Rename screen and in `ContainerName`
(GitHub #112, thanks Fuzen777). The task completes in the next step: `true` when the game took the name (also when the
chest already had it), `false` when the rename couldn't run (the chest went away, the game's table of 1024 different
names was full, the world closed). `kiln/logs/kiln.log` says why.

- **Where:** `Items.ContainerRenameAvailable` is true where the server world runs, on a dedicated server or in a hosting
  player's game (capability `items.rename`). On a joined client the call throws `InvalidOperationException`: let your
  mod's server half rename.
- **Name limits**, as in the game's Rename field: at most 48 characters and 64 bytes of UTF-8
  (`Items.ContainerNameMaxChars`, `Items.ContainerNameMaxBytes`), no control characters except tab. Any script and
  emoji, kept as given: no trimming and no profanity filter. `""` clears the name.
- **Only containers:** an entity with an inventory of its own that is neither a player's nor an NPC's. A Flame Altar is
  refused.
- **Refusals throw at the call:** `ArgumentException` (no such entity, not a container, a name the field wouldn't take;
  the message says which), `KilnUnavailableException` on an older Kiln or an unknown game build.

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

## Exact costs and receipts

New in 0.2.0-dev.32 (beta 1, a test build). `ItemCosts` (Kiln.Items, server) takes **one cost from one slot you name**, exactly once,
and gives you a **receipt**. Taming's steps and a pet's revive pay through it; any server mod may.

```csharp
var twigs = Items.Lookup("Material_T1_Twigs")!.Id;
var slot = ItemCosts.Choose(EntityRef.Of(player), twigs, 3);                 // the first plain stack that can pay; null: none
if (slot is not { } selection) return;
CostReceipt receipt = await ItemCosts.Take(selection, 3, Guid.NewGuid());    // all or nothing, from that slot only
if (receipt.Committed) Log.Info($"took {receipt.Taken}");
else if (receipt.Uncertain) Log.Warn($"unknown whether paid: {receipt.Reason}");   // never submit it again as if nothing happened
else Log.Info($"refused: {receipt.Refusal}");                                // StaleSelection, NotAStack, ...
CostReceipt back = await ItemCosts.Refund(receipt, Guid.NewGuid());          // a committed take, once
```

- **Nothing is searched when the cost runs.** The selection is a snapshot of one slot; if the slot changed (another item, another
  count, gear), the cost is refused (`StaleSelection`) and nothing is taken. A player's game never names a slot id of its own: the
  server builds the selection from its own read.
- **One request id, one debit.** The same id with the same cost gives the same receipt; the same id with another cost is a
  conflict. A retry after a network hiccup sends the same id and can never pay twice.
- **Wear** takes durability off a gear item through the game's own durability debit (`ItemCosts.Wear`); it refuses to break the tool
  unless you allow it. **Refund** gives a committed take back to the same owner (or a wear's durability back to the same item), once.
- A receipt is **Committed**, **Refused** (nothing changed, with a reason) or **Uncertain** (a fault inside the game's change:
  whether it was paid is not known; it is never refunded).
- Not promised: atomicity with anything else. A pet record or your own data is another store and is saved on its own.
- A walkthrough (a blessing that costs three twigs, refunded if it fails) is `docs/kiln/modding/item-costs.md` in Kiln's repository, on [GitHub](https://github.com/frostdev-ops/kiln).

## With shroudlink and with players

The transfer implementation is ported from shroudlink's MIT API and calls the game's own transactions. Kiln's hooks can
chain with [shroudlink](/kiln/wiki/more-frameworks#shroudlink); rule disposal ends the rule, not the process-lifetime hook.

A joined player must still confirm the visible slot updates, equipped-item behaviour, R-key transfers, station reports,
renamed chests and the optional shroudlink client addon's slot locks. A server test cannot show those interactions.
