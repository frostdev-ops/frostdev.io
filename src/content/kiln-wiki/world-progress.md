---
title: "World progress"
description: "Read how far a world and each character are: flame level, difficulty, spires, shrines, Shroud Roots, bosses, chests, quests. With events."
status: "works"
updated: "2026-11-07"
---

`WorldProgress` answers "how far is this world, and this character?" in typed values, read from the game's own data and
rules. It's read only: to change progress, grant knowledge or move [quests](/kiln/wiki/quests).

It's part of the Quests service: `<KilnServices>Quests</KilnServices>` in the project.

## What you can read

| Fact | Per | Read as |
|---|---|---|
| Flame level, altars, water sources | world | `WorldProgress.Flame` |
| Difficulty: preset and every setting | world | `WorldProgress.Difficulty` |
| Ancient Spire unlocked, beacon lit | world (per character in personal progression) | `spire.Unlocked`, `spire.UnlockedFor(player)`, `spire.BeaconLit` |
| Spire top reached | character | `spire.TopReachedBy(player)` |
| Flame Shrine or Sanctum found | character | `shrine.FoundBy(player)` |
| Shroud Root destroyed, Elixir Well cleared | character | `root.DestroyedBy(player)`, `WorldProgress.ElixirWells` |
| Ancient Obelisk read | character | `obelisk.ReadBy(player)` |
| Boss killed | world, or character | `boss.Killed`, `boss.KilledBy(player)`; 13 of the game's 30 placed bosses keep a record |
| Survivor rescued | world | `survivor.Rescued` |
| Chest opened or looted | world, while its area is loaded | `WorldProgress.Chest(at)` |
| Quest status and step, the game's and Kiln's | character | `Quests.Of(player)` |

Personal progression and the game's rules for world and character facts apply as in the game's journal.

## Example

```csharp
Log.Info($"{WorldProgress.Flame}");                         // flame level 4, 2 altar(s) ...
if (WorldProgress.Difficulty is { } d) Log.Info($"{d.Preset}, enemy damage x{d.Number("enemyDamageFactor")}");

await WorldProgress.WhenReady(bosses: true);                // the lists are read in the background, in a second or two
var dragon = WorldProgress.Boss("enemy_boss_fog_dragon");
Log.Info($"the dragon is {(dragon?.Killed == true ? "dead" : "alive")}");

var me = WorldProgress.For(player);
Log.Info($"{me.ShrinesFound.Count} of {WorldProgress.Shrines.Count} shrines found");

foreach (var q in Quests.Of(player).Active) Log.Info($"{q.Name ?? q.Id}: step {q.Step + 1} of {q.Steps}");
```

Reads run on the tick thread. Before the world runs, or when a part of the game's data can't be read, a value is
`null` and `WorldProgress.Status` says why. Nothing throws into the game.

## Ids

Readable and stable for a game build, the same as `kiln catalog` lists them (sections `spires`, `shrines`, `shroudRoots`,
`obelisks`, `bosses`):

- spires: the region, `grassland`, `coldheights`, `desert`
- shrines, roots, obelisks: the game's achievement names, `grassland_flameshrine_01`, `desert_well_09`
- bosses: the template, lower case, `enemy_boss_fog_dragon`
- quests: `quest:0x<id>` for the game's, `<mod>:<quest>` for Kiln's

## Events

On the tick thread, never cancelable: they report what already happened.

| Event | When |
|---|---|
| `FlameLevelChangedEvent` | the world's flame level changed |
| `SpireUnlockedEvent` | a spire was unlocked, for the world or a character, or a character reached its top |
| `ShrineFoundEvent` | a character found a Flame Shrine or Sanctum |
| `ShroudRootDestroyedEvent` | a character destroyed a Shroud Root (`Root.ElixirWell` for a well) |
| `BossKilledEvent` | a boss died: `Boss`, `Killer`, `KillerPlayer` |
| `ChestLootedEvent` | a loaded chest was emptied |
| `QuestStatusChangedEvent` | a player's quest changed status or step |

```csharp
[Subscribe] void OnBoss(BossKilledEvent e) => Log.Info($"{e.Boss?.Id ?? e.Template} killed by {e.KillerPlayer?.Name}");
```

More on events: [Events](/kiln/wiki/events).
