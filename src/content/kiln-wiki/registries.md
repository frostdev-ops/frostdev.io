---
title: "Registries: game data by stable names"
nav: "Registries"
description: "Edit items, recipes, loot, drops and balance through names Kiln supplies and keeps stable across game updates: entry points, transactions, adding and hiding entries, how mods stack, and what is still refused."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.31 (dev.31+, mod API 0.2.17), experimental.** The registry types carry the diagnostic `KILNX031` and
> may change in any release until each registry is marked stable; at API 1.0.0 the stable ones are frozen (additive
> only). Edits ran on a dedicated server and in offline tests. Not yet seen in a real game client.

A registry is a piece of the game's data under names Kiln gives it. You edit `items.maxStack` of
`game:material_t1_wood_logs`, never a game function, a field path or an address. Kiln maps each field onto the game for
every game build it supports. When a game update moves something, Kiln's mapping breaks and a Kiln update repairs it;
your mod doesn't. A field Kiln hasn't proven on the running build is refused with a reason, never guessed.

Registries hold data only. [Data packs](/kiln/wiki/data-packs), [game data](/kiln/wiki/game-data) and the services
(`Items`, `Content`, `World`) stay as they are: the older paths keep working, and registry edits layer on top of them.

| Registry | Entries | Fields |
|---|---|---|
| `items` | every item | stack size, rarity, levels, power, speed, damage and armour kinds, stamina and mana cost, perks, socket |
| `recipes` | every crafting recipe | inputs, outputs, duration, unlock |
| `loot` | random loot, one entry per item | stack sizes, rarities |
| `drops` | the game's drop tables | each entry's item, count, chance and weight |
| `balance` | one entry, `game:balance` | experience and levels, flame altars, water sources, build-zone sizes, fog resistance, durability, sockets, perk costs |

## Ids

An id is `<namespace>:<name>`, lower case, never reused. The game's entries are `game:<stable name>`: an item's debug name
in lower case (`Material_T1_Wood_Logs` is `game:material_t1_wood_logs`), a recipe's likewise, a loot entry has its item's
id. Your own entries are `<your mod id>:<name>`; the namespaces `game` and `kiln` are reserved. When a game update renames
an entry, Kiln keeps the id it had, so your edit still finds it. An entry a game update removes refuses every edit that
names it. `registry.Items.Select("game:material_*")` lists the entries that match a pattern.

## Edit from C#

Add `Registry` to `KilnServices` and opt in to the experimental diagnostic:

```xml
<PropertyGroup>
  <KilnServices>Registry</KilnServices>
  <NoWarn>$(NoWarn);KILNX031</NoWarn>
</PropertyGroup>
```

Override `Mod.OnRegistry`. It runs once per pass and point you declare:

```csharp
using Kiln;
using Kiln.Registry;
using DataRegistry = Kiln.Registry.Registry;

[RegistryEntryPoints(RegistryEntryPoint.GameStart | RegistryEntryPoint.WorldLoad)]
public sealed class Stacks : Mod
{
    public override void OnRegistry(RegistryContext context)
    {
        var registry = DataRegistry.For(context);
        registry.Alter(view => view.Items["game:material_t1_wood_logs"].MaxStack = 500);
        registry.Items.Final("game:material_t1_*", item => item.MaxStack = Math.Min(item.MaxStack, 2000));
    }
}
```

An assignment is an absolute edit in the **alter** pass; `registry.Final(...)` is the explicit **final** pass and
`registry.Add(...)` the **add** pass; `registry.Items.Final(pattern, edit)` edits a selection in the final pass. Nothing is submitted until your handler returns without throwing. Keep copied
values, not the context, an entry or a list: they stop working when the callback returns (`RegistryContextException`,
with a `Code` such as `Closed`, `WrongThread` or `WorldChanged`).

The class attribute is constant metadata that Kiln reads without running your mod. With no attribute, you author at
**GameStart** only.

| Entry point | Runs | Inputs |
|---|---|---|
| `GameStart` | at resources-ready, before the game uses its data | global settings; no world; no other mod's runtime exports |
| `ModLoad` | after your mod's `OnLoad`, once the base registry exists | global settings; follows the mod across worlds |
| `WorldLoad` | for each world, a new one included | the world's settings once bound; ends with that world |
| `HotReload` | for the replacement instance after a hot reload | replaces `ModLoad` for that pass |

A runtime pass reads the values from **before** the pass, without your own layers. So `item.MaxStack = item.MaxStack * 2`
restates your intent at each point (10 becomes 20 at `ModLoad` and stays 20 at `WorldLoad`) instead of doubling again.
A mod that needs another mod's runtime export picks `ModLoad` or later: at GameStart the lookup is refused with
`RegistryContextError.RuntimeExportUnavailable`.

### When an edit takes effect

Each field says so in its page, on its C# property and in `RegistrySchema`:

| Applies | Means | Typical fields |
|---|---|---|
| `now` | the next use: craft, roll, hit, payment | gear numbers, recipe inputs, loot stacks, drop chances |
| `worldLoad` | when a world loads, before its save is read | `items.maxStack` (a lower value cuts stacks in that save) |
| `restart` | after a game restart: the game reads it once | the whole `balance` table |

A later point never writes a restart field: it answers `RestartRequired`. A field Kiln hasn't traced yet ships with the
cautious value and an unproven mapping: `items.block`, `items.fuel.burnTime` and `items.comfort` in this release.

## Transactions: Registry.Change

Outside the automatic passes, on the tick thread of a loaded world, open a transaction. It lasts until you revert it or
the world ends:

```csharp
var change = DataRegistry.Change(view => view.Items["game:material_t1_wood_logs"].MaxStack = 500);
if (!change.Result.Ok) Log.Warn(change.Result.Reason ?? "registry change not applied");

// later, on the tick thread: takes out this change only, and recomposes the rest
var reverted = change.Revert();
```

`Result` tells Applied, Refused, RestartRequired, WorldRequired, Skipped (another writer's bytes were left alone),
Unverified (Kiln couldn't prove a rollback) or the pending states, with counts and a reason. `Ok` is only an applied or
reverted change with nothing refused or skipped. A later commit wins and relative edits compose, so reverting an earlier
change never puts an old snapshot over a later one. A change is not disposable: leaving a scope doesn't undo it.

- `DataRegistry.Read(view => ...)` reads live values in an expiring, read-only frame.
- `DataRegistry.Ready` (subscribe in `OnLoad`) tells when the game-start or a world-load application is ready.
  It says the registry is ready, not that every edit of yours applied: read the results.
- Adds and removes are GameStart-only. A transaction that includes one is refused with `RestartRequired` and commits none
  of its other edits. A refused field-only edit doesn't stop the valid ones.
- Limits: 16 open drafts and 256 retained changes per mod (64 and 1,024 in all), 4,096 edits a change.

## Add and hide entries

Experimental, and at **GameStart** only. A later point answers `RestartRequired`.

```csharp
if (context.EntryPoint == RegistryEntryPoint.GameStart)
{
    registry.Add(view => view.Items.AddLike(new("my-mod:stout_logs"), new("game:material_t1_wood_logs"),
        item => item.MaxStack = 100));
    registry.Alter(view => view.Loot.Remove("game:material_t1_wood_logs"));
}
```

- **`AddLike`** clones an entry you name (`like` must exist; chains end at a game entry), then applies your overrides.
  It works for `items` and `recipes`. A recipe keeps its base's station, inputs, outputs, duration and unlock rule. The new id is
  in your namespace, lower case, and a fresh name; a zero or colliding native id is refused, never minted again.
- **`Remove(pattern)`** hides, it never deletes. Records, id lookups and saves stay. Copies players already own keep
  working in inventories, equipment and chests, also after a save and load. Recipes hide from station lists and the
  all-recipes view (a running craft finishes). Loot hides from random-loot candidates only: direct drops and recipes
  stay. Item removal also hides the recipes that depend on it and sets the chance and weight of drop slots naming it to
  0, without resizing the table.
- **Not supported:** adding `loot` entries, and any entry operation on `drops` and `balance` (field edits work).
- **Stable ids survive restarts.** Kiln pins each addition's id and base in `kiln/data/registry/entry-compat.json`. Reusing an
  id over another base is refused: pick a new id. If the mod that added an item is missing, saves keep a placeholder with
  the same identity; the mod returns and adopts it.
- **Restart is the undo.** A retiring mod doesn't take back what GameStart did. Start without it and the game's original
  visibility is back.

## Several mods, one field

Every start runs three passes across **all** mods, in the load order players see: every mod's add, then alter, then
final.

- The later mod wins, and the report says it overrode the earlier.
- Relative edits stack ("composed"): ×4 then ×2 is ×8.
- `exclusive` on an edit makes any other mod's edit of that field a conflict: the later one is refused whole.
- `yield` applies an edit only where no earlier writer set the field.
- A mod's final pass sees add and alter, never other mods' finals.
- Registry edits layer on Kiln's older paths (boot patches, data packs) and on what other loaders wrote into the game's
  archive before Kiln. Old mods are never refused because of a registry edit. Conflicts inside the registry and with
  Kiln's own paths are certain; another loader's DLL patches are best effort and labelled so.

**Where to look.** The launcher's **Conflicts** view lists which mods edited the same data, which edit won and why an
edit was refused. The same facts are in `kiln/state/registry.json` (the live value and its writer chain per field,
`overridden`, `composed`, `exclusive`, `yielded`, refused edits with a reason, written at start and again at each world
load) and a short list in `kiln.log`. Check a field before relying on it:
`Capabilities.Is("registry.items.power")`.

## From a data pack

The same edits go in a pack's `registry` section (in `content/*.json`), by Kiln id:

```json
{ "format": 1,
  "registry": {
    "add": [
      { "registry": "items", "entry": "add", "id": "my-mod:stout_logs", "like": "game:material_t1_wood_logs",
        "fields": { "maxStack": 100 } }
    ],
    "alter": [
      { "registry": "items", "select": { "id": "game:material_t1_*" }, "field": "maxStack", "op": { "mul": 2, "max": 9999 } },
      { "registry": "recipes", "select": { "id": "game:ammo_arrow_t3_bronze" }, "field": "duration", "op": { "mul": 0.5 } },
      { "registry": "loot", "select": { "id": "game:material_t1_wood_logs" }, "field": "stack.max", "op": { "add": 1 } },
      { "registry": "balance", "select": { "id": "game:balance" }, "field": "xpPerLevel[0]", "op": 2222 },
      { "registry": "items", "entry": "remove", "select": { "id": "game:material_t2_wood_hardwood" } }
    ]
  } }
```

A plain `op` sets the value; an object is `mul`, `add`, `min`, `max`, `raiseOnly`, `lowerOnly` or `set`, as in
[data packs](/kiln/wiki/data-packs#values). Lists take `clear`, `append`, `remove` and `replace` in a `list` member;
a list of fixed length is edited one element at a time (`xpPerLevel[2]`). Fields that apply now or at world load follow
a pack's hot reload; adds and removes wait for a restart.

## What is unproven and what is refused

- **Item removal is refused on the current game build.** It needs the drop-table rows to be proven, and they aren't: the
  report says `drop tables not proven on this build` and **nothing** of that removal is applied. Hiding loot and recipes
  does work.
- **Unproven fields** (`items.block`, `items.fuel.burnTime`, `items.comfort`, `loot.stack.scalable`,
  `loot.stack.maxScaled`, `loot.rarities`, `loot.fixedRarity`) are refused per entry with the reason until a Kiln update
  maps them.
- **Whole-number storage.** A fractional value for a field the game stores as a whole number isn't rounded: it is
  refused with a reason that starts `not_exact:`.
- **Per-entry refusals.** At `ModLoad`, `WorldLoad` and `HotReload` an entry that can't take an edit (an exclusive
  conflict, an entry missing in this world, a value its storage can't hold) is refused alone and counted; the rest applies.
- **`balance` is restart-only**, and its `flameLevelMax` and `gear.*` constants are read-only.
- **Raw game paths** (the Advanced tier, `raw` in a pack edit) stay as they were: they work while the game's names hold.
- **Not verified:** real-client menus, equipped-item save round trips, multiplayer behaviour and hosted worlds. The native
  tests and a dedicated-server lab don't show them. Players without Kiln don't get Kiln's
  registry views by joining a Kiln server.

## Testing

`KilnHarness.Registry` in Kiln.TestKit is a recording fake: `Seed` supplies values, `Author` runs one of your passes and
returns the edits it would send. It doesn't simulate live application, pass composition or the game's mapping, so an offline
test proves your callback, not the game. Try a registry edit on a [test server](/kiln/wiki/testing) and read
`kiln/state/registry.json`.

The `RegistryEdits` sample in the Kiln repository shows an add, a hide and a setting-driven alter at `GameStart`, `WorldLoad`
and `HotReload`.
