---
title: "OnBoot: content on the first start"
nav: "OnBoot and boot mods"
description: "Boot mods: statuses, effects, items, spells, talents and changes to the game's own data that are there before the game reads them, from the very first start."
status: "pending"
updated: "2026-11-14"
---

> **New in 0.2.0-dev.28, on dedicated servers.** OnBoot and resource patches ran on dedicated test servers: a mod built
> outside Kiln's repository with the SDK patched 21 values of the game's balancing table before the game read it.
> Nobody has seen it in a player's game yet. In a player's game, a world they host or a game that joins a server, it is
> switched off until its game test ([below](#where-it-runs)).

The game reads some of its data once, when it starts: the programs behind statuses and spells, the skill tree, the
balancing table. What a mod defines in `OnLoad` comes too late for that first start; it is there from the second one.
`Mod.OnBoot` runs earlier, before the game reads any of it. What a boot mod stages there is in the game from the very
first start, with the same ids a `Define` in `OnLoad` gives it.

For players this means: a mod that adds items, spells or talents has them on a server's first start, with no second
restart, and a mod that changes values the game reads once (experience per level, Flame Altars per base) works from the
first start too. Before, its change came too late.

## Turning it on

In `kiln.mod.json` (see [the manifest](/kiln/wiki/manifest#boot-content-boot)):

```jsonc
{ "id": "frost-tokens", "boot": true }      // or "required"
```

From a project, `<KilnBoot>true</KilnBoot>` (or `required`) writes `"boot"` into the generated `kiln.mod.json`.

- `true`: the mod's `OnBoot` runs. If its boot content fails, this mod (and the mods that require it) is left out and
  named in kiln.log; the server starts without them. A broken boot mod never half-loads.
- `"required"`: a start stops with a clear message when the mod's boot content can't be applied, instead of loading a
  world without it. Use it when a world without your content would be worse than no server: a world that already
  holds your items, for example.

## What OnBoot does

```csharp
public override void OnBoot(BootContext boot)
{
    var defs = BootDefinitions.For(boot);
    defs.Define("chill", new StatusBlock { Name = "Chill", Seconds = 6 });
    defs.Define("frost-token", new ItemBlock { Name = "Frost Token", Stack = 50 });
}
```

Add `Blocks` to `KilnServices`. `OnBoot` runs once per start, before the game, on a copy of your mod that is thrown away
when it returns. The instance that later gets `OnLoad` is a new one: nothing you keep in a field survives. Hand
everything over by staging it.

- **Five kinds of block** can be staged in this release: statuses, effects, items, spells and talents, plus
  [resource patches](#resource-patches). Any other kind answers `NotInBootKinds`; define it in `OnLoad` or a data file,
  where it works as a runtime block.
- **A refusal is a result**, `Ok` false with a `Reason`: `DuplicateDefinition`, `PhaseClosed` (staged after `OnBoot`
  returned), `TooMany` (more than 4096), `NotInBootKinds`. `Ok` means staged, not yet in the game.
- **References.** A boot definition can name one the same `OnBoot` staged before it, not another mod's block and not
  one of your own `blocks/*.json` (`BootReferenceOutside`).
- **A data file wins.** A `blocks/*.json` block of the same kind and name is used, and the staged one is dropped with a
  warning.
- **Nothing of the running game.** There is no tick, world or player yet. `Blocks.Define` throws (stage with
  `BootDefinitions.For(boot).Define` instead), and a call that needs the game's tick says which member refused and that
  it belongs in `OnLoad`.

## Settings in OnBoot

`Config.Register<T>()` and its `Value` work in `OnBoot`, so a boot mod can stage with a number from its settings:

```csharp
public override void OnBoot(BootContext boot)
{
    var altars = Config.Register<Settings>().Value.Altars;   // the file's value, else the default
    BootDefinitions.For(boot).Define("more-altars", new ResourcePatchBlock
    {
        Resource = Guid.Parse("82706b40-61b1-4b8f-8b23-dcec6971bda1"),
        Type = "keen::BalancingTable",
        Set = { ["altarsPerFlameLevel[*]"] = ResourceValue.AtLeast(altars) },
    });
}
```

`Register` again in `OnLoad`: the running mod keeps that one, and it sees the same values `OnBoot` read. Writing a
setting, `Reload` and `Changed` are for `OnLoad`; in `OnBoot` they say so. A file edited between the two is read again,
and kiln.log says `OnBoot` used the earlier values.

## The game's data in OnBoot

`boot.GameData` (`IReadOnlyGameData`) reads the game's own items, templates, skill nodes and materials, as they
shipped:

```csharp
var logs = boot.GameData.Read("item:Material_T1_Wood_Logs");    // also template:, skill:0x…, material:
```

The game hasn't loaded anything yet, so the answers come from the **boot snapshot**: a copy of those records that Kiln
makes from the game's files. The launcher makes it when it starts the game with an enabled mod that has `"boot"`:
about 30 to 45 seconds and 200 MB, once per game update. On a server you start yourself, run
`kiln boot-snapshot --game <server folder>`.

- Without a snapshot of this game build, `mods.boot.game_data` is off and `Read` throws `KilnUnavailableException`.
  A mod that can do without it checks `Capabilities.Is("mods.boot.game_data")` first and keeps its own defaults.
- **Starting from Steam** makes no snapshot: it uses one that is there already. Start the game through the launcher
  once, or run `kiln boot-snapshot`, for each game version.
- The snapshot shows the game's own values: not another loader's patches, and not resource patches (they are written
  later).

## Resource patches

A boot mod can change fields of the game's data before the game reads them: the balancing table's experience per
level, or Flame Altars per flame level. In a blocks file:

```json
{
  "format": 1,
  "resourcePatches": {
    "more-altars": {
      "format": 1,
      "resource": "82706b40-61b1-4b8f-8b23-dcec6971bda1",
      "type": "keen::BalancingTable",
      "set": {
        "altarsPerFlameLevel[*]": { "min": 16 },
        "experienceNeedPerLevel[0]": 1500
      }
    }
  }
}
```

Or in `OnBoot`, with a `ResourcePatchBlock`:

```csharp
BootDefinitions.For(boot).Define("more-altars", new ResourcePatchBlock
{
    Resource = Guid.Parse("82706b40-61b1-4b8f-8b23-dcec6971bda1"),
    Type = "keen::BalancingTable",
    Set =
    {
        ["altarsPerFlameLevel[*]"] = ResourceValue.AtLeast(16),
        ["experienceNeedPerLevel[0]"] = 1500,
    },
});
```

This is the way for a mod that raises the number of Flame Altars a base may have. A change made in `OnLoad` came too
late for such data: the game had already read it.

| Path | Means |
|---|---|
| `playerLevelCap` | a member |
| `a.b.c` | a member of a nested struct |
| `list[3]` | element 3 of a list (counted from 0) |
| `list[*]` | every element, however many this game build has |

| Value | Result |
|---|---|
| `1500`, `0.5`, `true`, `"EnumName"` | the member is set to it |
| `{ "mul": 2 }`, `{ "add": 5 }` | the game's value times 2, plus 5 |
| `{ "min": 16 }`, `{ "max": 100 }` | at least 16, at most 100 |

The keys combine: the game's value times `mul`, plus `add`, then held between `min` and `max`. A path ends in a
number, a bool or an enum; strings, references to other resources and the length of a list can't be patched.

- **Checked before the start**: the type, the path and the value. Two mods on one field are not combined: the later in
  the load order is refused, and the report names both.
- **Written** when the game's resource service is up and nothing has read from it yet. A patch that fails then is in
  kiln.log and `kiln/state/boot.json`, and the start goes on without it. A required boot mod's patch that can't be
  applied stops the start instead, with the reason in boot.json.
- **Both sides need the mod.** A patch changes the data of the game it runs in. A player who joins without the mod
  keeps the game's values on their side, so what their game shows can differ from what the server does. A mod that
  patches data both sides read says `"clients": "mod"`. In this release that keeps Kiln players out of the server
  unless they switch OnBoot on: see [Where it runs](#where-it-runs).
- A blocks file with `resourcePatches` may have comments (`//`, `/* */`) and trailing commas, like every blocks file.
- **The game's own limits still hold.** The game never allows more than 16 Flame Altars, whatever the table says.
- A patch lasts while the game runs. It isn't written to disk or into a save.

## Afterwards

- `Mods.BootState(id)` says whether a mod's boot content made it: `Committed` means its definitions are in the game.
- `BootDefinitionsCommittedEvent` comes once after each `OnLoad`, when the committed definitions are active. Subscribe
  in `OnLoad`.
- `Blocks.Find` finds a block your `OnBoot` staged as soon as the boot content is committed: in `OnLoad`, by name from
  other blocks (`Applies = new StatusApply { Status = "chill" }`), and after the mod unloads.
- `Blocks.Define` in `OnLoad` under the name of a committed boot block: the same block gives back the committed one; a
  different block is refused with `RestartRequiredBoot`. What is in the game can't change before a restart: change it
  in `OnBoot` and restart.
- **After a change, restart.** At the start Kiln keeps a record of every file in a boot mod's folder and of the settings
  its `OnBoot` read. Unloading the mod and loading it again works while those are as they were. A changed file or a
  changed setting is refused with `RestartRequiredBoot`, naming the files or the setting (`altars: 4 -> 6`): restart
  the game or the server. A reload of a loaded boot mod is always refused the same way.
- Not a change: a JSON file written again with the same values (other spacing, comments), Kiln rewriting the settings
  file, files whose name starts with `.`, and what the mod and Kiln write into the mod's data folder. Don't write into
  your own mod folder while the game runs: such a file counts.
- A boot mod enabled after the start loads at the next start.
- Reading a boot mod's files costs a little time at the start, about 1 s per 300 MB.

## When a boot mod fails

- `OnBoot` throws, or a staged definition doesn't compile: the mod is out, with none of its definitions or files, and
  so is every mod that requires it. kiln.log names it.
- A bad entry in the mod's own files (an `assets/assets.json` entry with a bad GUID or a missing file, a
  `blocks/*.json`, `skills/*.json` or `quests/*.json` that isn't JSON or can't be read): Kiln logs it and leaves that
  entry out; the rest of the mod loads, as without OnBoot.
- **With `"required"`** the mod gets all of its boot content or the start stops: a failed `OnBoot`, a refused
  definition, and also one bad entry in its own files. No world or save is loaded. The process ends with exit code
  `0x4B01` (on Linux, under Wine, the exit status is 1). The last line of kiln.log names the mod, the file or entry and
  why, and `kiln/state/boot.json` has the same.
- What only the game's data or a loading world shows stops a required mod's start later, still before a player is in
  the world: a resource patch that can't be written, a skill node the tree build leaves out, an item, recipe or clone
  the world doesn't register.

## Where it runs

Dedicated servers have OnBoot in this release. On a game client, a world a player hosts and a player's game that
joins a server, it is [held until its game test](/kiln/wiki/code-mods#built-waiting-for-a-game-test):
`mods.boot.client`, and with it `mods.boot.resource_patches` and `mods.boot.vfx`. While it is held a mod with `"boot"`
doesn't load in a player's game (kiln.log: `RestartRequiredBoot: ... this process ran no boot phase`), and a game with
an enabled `"required"` mod doesn't start (exit code `0x4B01`, the reason is the last line of kiln.log). Don't ship
`"required"` to players yet. `"preview"` in `kiln.json` switches OnBoot on for a test.

**What that means for a server.** A player's game tells the server which mods it has loaded, and a boot mod isn't
among them. So when a server's boot mod has `"side": "both"` and states `"clients": "mod"` (as a mod with a resource
patch does), the server refuses
joining Kiln players for a missing mod, unless the player sets `"preview"` in their `kiln.json`, or the server sets
`modSync` in `network.json` to `warn` or `off`.

A server where the boot phase doesn't run (safe idle, .NET off) doesn't load boot mods either; the row
`mods.boot.phase` says why.

## Testing

`KilnHarness.BootPhase` in Kiln.TestKit runs your `OnBoot` under `dotnet test`, with the same staging as a start:
[Tests without the game](/kiln/wiki/testing#onboot-under-dotnet-test). The SDK's bake runs it too: a build fails
(`KILN032`) when `OnBoot` throws or a definition would not lower. The sample `boot-gallery` stages a status, an effect,
an item, a spell, a talent and a resource patch, and reads the game's data.
