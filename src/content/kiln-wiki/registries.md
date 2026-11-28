---
title: "Registries: game data by stable names"
nav: "Registries"
description: "Edit items, recipes, loot, drops and balance through names Kiln supplies and keeps stable across game updates: entry points, transactions, adding and hiding entries, how mods stack, and what is still refused."
status: "pending"
updated: "2026-11-28"
---

> **New in 0.2.0-dev.31 (dev.31+, mod API 0.2.17), experimental; twelve more registries, views and `Registries.Reauthor` in
> 0.2.0-dev.32 (beta 1, a test build, mod API 0.2.27).** The registry types carry the diagnostic `KILNX031` and may change in any
> release until each registry is marked stable; at API 1.0.0 the stable ones are frozen (additive only). Edits ran on dedicated
> servers and in offline tests. **Not yet seen in a real game client.**

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
| `creatures`, `arsenals`, `perks`, `skills`, `stations`, `buffs`, `abilities`, `world`, `difficulty`, `limits`, `lootRules`, `randomLoot` | dev.32 | creature values, enemy attacks, perk values, skill costs, stations, buff lengths, ability timing, the world's build rules, difficulty bounds, game limits and how loot rolls: [The dev.32 registries](/kiln/wiki/new-registries), [Loot odds and levels](/kiln/wiki/loot-rules) |

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

[RegistryEntryPoints(RegistryEntryPoint.GameStart | RegistryEntryPoint.WorldLoad)]
public sealed class Stacks : Mod
{
    public override void OnRegistry(RegistryContext context)
    {
        if (!Registries.Available) return;                    // no registry back-end here (a client without it)
        var registry = Registries.For(context);
        registry.Alter(stage => stage.Items["game:material_t1_wood_logs"].MaxStack = 500);
        registry.Items.Final("game:material_t1_*", item => item.MaxStack = Math.Min(item.MaxStack, 2000));
    }
}
```

**`Registries` since dev.32.** The entry class was `Registry` in dev.31, which is also the name of its namespace, so code inside a
`Kiln.*` namespace needed an alias (`using DataRegistry = Kiln.Registry.Registry;`). Beta 1 names it `Registries`, with the same
members. A mod built for dev.31 keeps building and running: `Registry` is still there, marked obsolete (a warning that names
`Registries`), and it goes no earlier than 1.0. The loot field `ItemLootEntry.FixedRarity` has the same treatment: the new name is
`Rarity` (a `RegistryRarity?`, null for none). The creature kind and an arsenal's attack element are `RegistryCreatureKind` and
`RegistryArsenalAttack`, so a file with `using Kiln;` and `using Kiln.Registry;` can name them. `RegistryContext`, `RegistryEntryPoint` and `RegistryPhase` live in namespace `Kiln`
with `Mod.OnRegistry`; the typed data (entries, the stage) is `Kiln.Registry`'s.

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
cautious value and an unproven mapping; in this release only `items.fuel.burnTime` and the damage of simple perks are in that state.

## Transactions: Registries.Change

Outside the automatic passes, on the tick thread of a loaded world, open a transaction. It lasts until you revert it or
the world ends:

```csharp
if (!Registries.Available) return;
var change = Registries.Change(stage => stage.Items["game:material_t1_wood_logs"].MaxStack = 500);
if (!change.Result.Ok) Log.Warn(change.Result.Reason ?? "registry change not applied");

// later, on the tick thread: takes out this change only, and recomposes the rest
var reverted = change.Revert();
if (!reverted.Ok) Log.Warn(reverted.Reason ?? "registry revert not applied");
```

`Result` tells Applied, Refused, RestartRequired, WorldRequired, Skipped (another writer's bytes were left alone),
Unverified (Kiln couldn't prove a rollback) or the pending states, with counts and a reason. `Ok` is only an applied or
reverted change with nothing refused or skipped. A later commit wins and relative edits compose, so reverting an earlier
change never puts an old snapshot over a later one. A change is not disposable: leaving a scope doesn't undo it.

- `Registries.Read(stage => ...)` reads live values in an expiring, read-only frame.
- `Registries.Ready` (subscribe in `OnLoad`) tells when the game-start or a world-load application is ready.
  It says the registry is ready, not that every edit of yours applied: read the results.
- Adds and removes are GameStart-only. A transaction that includes one is refused with `RestartRequired` and commits none
  of its other edits. A refused field-only edit doesn't stop the valid ones.
- Limits: 16 open drafts and 256 retained changes per mod (64 and 1,024 in all). One change takes at most 4,096 edits of one registry
  (16,384 of `randomLoot`, since dev.32; [below](#edits-per-call)).

## Add and hide entries

Experimental, and at **GameStart** only. A later point answers `RestartRequired`.

```csharp
if (context.EntryPoint == RegistryEntryPoint.GameStart)
{
    if (Capabilities.Is("registry.items.add"))
        registry.Add(stage => stage.Items.AddLike(new("my-mod:stout_logs"), new("game:material_t1_wood_logs"),
            item => item.MaxStack = 100));
    if (Capabilities.Is("registry.loot.remove"))
        registry.Alter(stage => stage.Loot.Remove("game:material_t1_wood_logs"));
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

Two shapes new in dev.32 (beta 1). **`select` can be just the id or pattern as a plain string** (`"select": "game:material_t1_*"`); the
object form (`id`, `has`, `where`) still works. **An appended list element names a struct of its own as a nested object**, as the C#
types show it: `{ "item": "game:material_stone", "count": { "min": 1, "max": 3 }, "chance": 0.5 }` appends a drop entry (the dotted
leaf `"count.min"` of earlier packs still reads; one element names a leaf once). In C#, one element of a plain list is set by index
(`item.Perks[1] = id`) and `AppendNew()` gives a new element whose values, its item too, go in the append itself.

## Edits per call

Since 0.2.0-dev.32 a registry declares the most edits **of that registry** one call may carry: `RegistrySchema.EditsPerCall` says it,
and each registry page in Kiln's repository too. One call is one `OnRegistry` callback (that is one phase of one entry point), one
`Registries.Change`, or one batch a native plugin sends. `randomLoot` takes 16,384 (every field of every table of the game's loot
data fits with room), every other registry 4,096; each registry is counted on its own. A call over a registry's cap is
**refused whole**: nothing of it applies, `registry.json` has a row for each registry the call named (the one over its cap
with its count and the cap), `kiln.log` says so, and Kiln **never throws** for it in your code. Before dev.32 an edit past
4,096 threw, so a mod that caught it kept a cut call and one that did not lost its whole pass. Split big edits over the
phases (`Alter`, `Final`) or over several `Registries.Change` calls. An edit is one field of one entry, so count fields.

## Re-author a pass when settings change

An `OnRegistry` pass can follow a settings file or the game's state (a player's level) without a restart:
`Registries.Reauthor()` runs your declared `WorldLoad` pass again from the next host tick, in the same
world, and its new layers replace the old ones in one turn: the game never sees a moment without your values, and the pass never
stacks on its own last result. It takes no entry point (only `WorldLoad` is re-authored on request). It runs on a worker thread of
Kiln's, not on the world tick, so **read your settings and game state first**, in the handler that saw them change, and don't call
tick-thread APIs inside the pass. It answers a `RegistryReauthorResult`: `Ok` when the pass is queued, otherwise `Ok` is false with a
`Reason` (also in `kiln.log`) for a mod with no `WorldLoad` pass, a call from inside `OnRegistry`, or no running back-end. Check it
the way you check any Kiln result. Requests while one runs become one more pass, never one each. Inside the pass, `context.Pass` says
which kind it is (`Point`, `ReauthoredOnTick`, `ReauthoredOffTick`) and `context.OffTick` is true on Kiln's worker. The worked example
is [Loot odds and levels](/kiln/wiki/loot-rules#follow-a-setting-or-a-players-level).

## Read anything: views

`RegistryViews` reads every registry, and every other resource type of the running build, under Kiln names, **read only**. The
registries are stable views; everything else is an advanced view named from the game's reflection and checked per game build. See
[The dev.32 registries](/kiln/wiki/new-registries#read-anything-views).

## What players see: `clients`

Each field has a "joined client" column on its page in Kiln's repository: `serverOnly` (the client needs nothing), `now` (Kiln's
content sync sends the layer to Kiln players, who use it at their next use; vanilla players keep their own numbers), `worldLoad`
(sent, used at the next world load), `restart` (**not** sent: both sides need the same boot values and the join compares them), or
`localOnly`. Choose a registry-only pack's `clients` by the strictest field it edits:

| Fields | `clients` |
|---|---|
| `loot`, `drops`, `creatures`, `arsenals`, `buffs`, `lootRules`, `randomLoot` (all server only) | `none` |
| synced `items`, `recipes`, `perks.value`, `skills.cost`, `abilities.timing` | `kiln` for matching tooltips and prediction; `none` lets vanilla players in with their own numbers |
| `balance`, `world`, `difficulty`, `limits` (read once at start) | `mod`, with `side: "both"` |
| adding or hiding items and recipes | at least `kiln`; `mod` for assets of your own |

`kiln lint` says `KL213` when a registry-only pack's `clients` differs from what its fields need.

## After a reload

`reload <id>` of a mod with registry edits applies what its `applies` allows now and says what waits for a restart. A pack's field that
applies `now` or `worldLoad` is composed again with every other mod's. A `restart` field keeps the start's value; the reloaded value applies
at the next start. An entry added or removed the start did not have, or a section the start never read, waits too. Each such edit is a
`RestartRequired:` row in `registry.json`, in the reply of `reload <id>`, in `kilnctl status` and first in the launcher's Conflicts view
("Waits for a restart"). A pack that throws while it applies leaves none of its new registry section behind. `kilnctl registry
rollback <server>` makes the next starts run the last good start's plan instead of the mods' current registry edits, until
`kilnctl registry rollback --clear`; `registry.json` says what changed back and which mods' edits were left out.

## Other loaders' packages: conflicts and effect replay

`registry.json` and the Conflicts view also name ShroudForge and EML packages that wrote a field before Kiln, from the change journal
of the start's archive writer (hosted ShroudForge, Kiln's interpreter for ShroudForge mods in kiln mode, kiln-eml's EML pass), and a
ShroudForge package that changed a value at run time in kiln mode. **Effect replay** (dev.32) is opt-in per package: after a game
update, a package's Lua can fail and change nothing until its author updates it; Kiln records each package's last effect in
registry terms, and for a package you opt in, applies it through the registry on a later game build where its Lua was not applied.
Opt in with `kilnctl registry replay <server> --opt-in <mod>` (`<mod>` is `shroudforge:<id>` or `eml:<id>`; `--opt-out` undoes it) or
the toggle on the launcher's Conflicts page. A package with anything the registry cannot hold (a list's membership, a created entry, a field another package also changed) is
refused whole, never in part, and `registry.json` `replay` says why. Not seen in a real game: hosted ShroudForge writing its
journal, replay after a real game update and on a joined client.

## What is unproven and what is refused

- **Item removal works on the current game build** (server 1287369): its drop-table rows are proven, so a hide of an item also
  hides the recipes that depend on it and sets its direct-drop slots to chance and weight 0. A game build Kiln has not proven yet
  refuses it **whole** with `drop tables not proven on this build` and nothing of that removal applies. Hiding loot and recipes
  alone always works.
- **One field is off on the current build:** `items.fuel.burnTime` (no game code reads an item's burn time, so an edit would change
  nothing) and the damage of simple perks (`perks.damage.*`: Kiln has not traced when the game reads it). Every edit of them is
  refused with the reason. The fields that were unproven in dev.31 (`items.block`, `items.comfort`, the `loot` rarity fields) are
  mapped now.
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
returns the edits it would send. Since dev.32, `Reauthors` lists the `Registries.Reauthor()` requests your mod made, `RunReauthored`
runs your `WorldLoad` pass the way a re-author does (off the world tick by default, where a tick-thread API throws as in a game), and
`Refused` says why Kiln would refuse the call whole (for example a registry over its edits-per-call cap). It doesn't simulate live
application, pass composition or the game's mapping, so an offline test proves your callback, not the game. Try a registry edit on a [test server](/kiln/wiki/testing) and read
`kiln/state/registry.json`.

The `RegistryEdits` sample in the Kiln repository shows an add, a hide and a setting-driven alter at `GameStart`, `WorldLoad`
and `HotReload`.
