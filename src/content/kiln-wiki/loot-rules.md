---
title: "Loot odds and levels: lootRules and randomLoot"
nav: "Loot rules"
description: "Change how likely each rarity is in random loot and what level it rolls at, for the whole world or for enemies, barrels and chests, and follow a setting or a player's level while the world runs."
status: "pending"
updated: "2026-11-27"
---

> **New in 0.2.0-dev.32 (beta 1, mod API 0.2.27), experimental (`KILNX031`).** Beta 1 is a test build: switch the launcher's
> **Channel** (Settings, Launcher updates) to the test builds to try it. Loot edits ran on a dedicated lab server and in tests,
> including a pass the size of Loot Rarity Leveler's (about 12,700 edits) that lands in a few milliseconds. **Real loot rolls in a
> game have not been seen**: a hot reload in the middle of a pass, drop tables still preparing, and co-op or hosted worlds are still
> to be checked.

When the game rolls random loot (an enemy dies, a barrel breaks, a chest opens) two things decide what you get: **which items can
drop** (the [`loot`](/kiln/wiki/registries) registry, one entry per item) and, new in dev.32, **how rare they roll** and **at what
level**. Two registries hold those:

| Registry | Entries | What it decides |
|---|---|---|
| `lootRules` | one: `game:loot` | the **world-wide rarity weights**: how likely common, uncommon, rare, epic and legendary are, as weights (a rarity's chance is its weight divided by the weights of the rarities the item can have) |
| `randomLoot` | every random loot table | the table's **level** (`level`, `levelOffset`, `levelOffsetRange`) and its **own rarity weights** (`rarity.<rarity>.mode` and `.weight`) |

A table's rarity entry has a **mode**: `none` keeps the world-wide weight, `set` replaces it, `add` adds to it, `multiply` multiplies it. A
table whose five modes are all `none` rolls with the world-wide weights; elites, bosses and special chests set all five. The
level works the same way (`level.mode`: `none` leaves the area's level, `set` uses `value`, `add`, `multiply`).

**Ids.** The game names none of these tables, so Kiln does: `game:labels_<8 hex>` for the tables enemies and generic containers use
(barrels, crates, generic chests) and `game:world_<8 hex>_<8 hex>` for the tables of chests placed in the world. The first number is the
world's loot GUID and the second the scene node of the **first chest** that uses the table, so the id stays with the table when a game
update moves tables, but a table whose first chest changes gets a new id and edits that name the old one are refused. So **select by prefix and by
values** (`game:labels_*`, `game:world_*`, "tables whose legendary mode is `set`"), never by an id copied from another game build.

<!-- shot: loot-legendary | A boss chest with a legendary drop after a lootRules edit -->

## From a data pack

Double the world-wide legendary weight and give every enemy and generic-container table two more levels:

```json
{ "format": 1,
  "registry": { "alter": [
    { "registry": "lootRules", "select": { "id": "game:loot" }, "field": "rarityWeights.legendary", "op": { "mul": 2 } },
    { "registry": "randomLoot", "select": { "id": "game:labels_*" }, "field": "levelOffset.mode", "op": "add" },
    { "registry": "randomLoot", "select": { "id": "game:labels_*" }, "field": "levelOffset.value", "op": 2 } ] } }
```

Loot is the server's alone, so a pack with only these edits needs `"clients": "none"`: players don't need your mod or even Kiln.

## From C#

```csharp
registry.Alter(view =>
{
    var weights = view.LootRules.RarityWeights;
    weights.Legendary = weights.Legendary * 2;
    foreach (var table in view.RandomLoot.Select("game:labels_*"))        // enemies and generic containers
        if (table.Rarity.Legendary.Mode == RandomLootMode.Set)             // the elite, boss and chest tables with their own odds
            table.Rarity.Legendary.Weight = table.Rarity.Legendary.Weight * 2;
});
```

Reads leave out your own layers, so `x * 2` restates your intent every time the pass runs and never stacks (see
[the registries page](/kiln/wiki/registries#edit-from-c)). The `RegistryEdits` sample in Kiln's repository has this and the rest; the pages `docs/kiln/modding/registries/lootRules.md` and
`randomLoot.md` list every field, its range and the id rules.

## Follow a setting or a player's level

Edits that depend on a settings file or on the game's state (the highest player level in the world, say) must change **while the
world runs**. Declare a `WorldLoad` pass and ask Kiln to run it again when an input changes:

```csharp
[RegistryEntryPoints(RegistryEntryPoint.WorldLoad)]
public sealed class Leveler : Mod
{
    public override void OnLoad() => Config.Register<Settings>().Changed += _ => Kiln.Registry.Registry.Reauthor(RegistryEntryPoint.WorldLoad);
    public override void OnRegistry(RegistryContext context)
    {
        if (context.Phase != RegistryPhase.Alter) return;
        var w = Kiln.Registry.Registry.For(context).LootRules.RarityWeights;   // the values below this mod
        w.Legendary = w.Legendary * 4;                                          // never stacks
    }
}
```

What `Reauthor` promises:

- **One turn.** The pass runs on a worker thread of Kiln's, off the world tick. The tick only lands its new layers and takes the
  layers that point made before out, in one turn, so the game never sees a moment without your values, nor both the old and the new ones.
  A table is never half written.
- **It reads below its own last edit.** The new pass starts from the game's values and other mods' edits again.
- **Requests coalesce.** Asking again while a pass runs, or before the next tick, becomes one more pass after it: a burst of
  setting saves costs at most two passes, the last with the newest inputs. No debounce needed, but don't ask on every tick.
- **Read first, then ask.** Read your settings and the game state **before** calling `Reauthor`, in the handler that saw them
  change, and keep them in fields the pass reads. A tick-thread call inside a re-authored pass throws; Kiln then runs that mod's
  passes on the tick, slower, and says so once in `kiln.log`. (`Players.All` and `Progression.Get` are fine: they answer from the
  last snapshot.)
- **It answers `false`** (the reason is in `kiln.log`) for any other entry point (only `WorldLoad` is re-authored), a mod with no
  declared `WorldLoad` pass, a call from inside `OnRegistry`, or no running back-end. With no world loaded, the next world load
  authors the pass anyway.

## Limits

- **Loot already rolled keeps what it got.** An edit reaches the next roll, on the server's world.
- **One call, at most 16,384 edits of `randomLoot`** (4,096 of `lootRules`): an edit is one field of one table. A call over the cap
  is refused whole and logged, never thrown; split it over the `Alter` and `Final` phases. A pass like Loot Rarity Leveler's
  (every field of about 800 tables) fits.
- **Another mod that sets the same field** is composed or overridden in load order; the later one wins and `registry.json` says
  who. Re-authored layers are the newest, so they win over other mods' `WorldLoad` edits of the same fields until those run
  again: keep re-authored edits to fields other mods leave alone.
- **`lootRarityRates` in `gearRules` is still refused;** use `lootRules` instead.
- Not seen in a real game: the note at the top.

Related: [The dev.32 registries](/kiln/wiki/new-registries), [Registries](/kiln/wiki/registries), [Data packs](/kiln/wiki/data-packs).
