---
title: "OnBoot: content on the first start"
nav: "OnBoot and boot mods"
description: "Boot mods: statuses, effects, items, spells, talents and changes to the game's own data that are there before the game reads them, from the very first start."
status: "works"
updated: "2026-11-19"
---

> **New in 0.2.0-dev.28 on dedicated servers, and since 0.2.0-dev.29 in a player's game too** (a world they host and a
> game that joins a server). On dedicated test servers a mod built outside Kiln's repository with the SDK patched 21
> values of the game's balancing table before the game read it. In a real game, a hosted world on 0.2.0-dev.28, More
> Flame Altars' `OnBoot` ran and 42 values of `altarsPerFlameLevel` were patched before the game read them
> ([Where it runs](#where-it-runs)).

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

### Settings and joining players

New in 0.2.0-dev.29. Each game and each server makes its boot content once, at its start, from its own settings, and
nothing syncs it later. A player whose settings of your mod differ from the server's has other game data: the server's
values decide, while the player's game shows and predicts its own (a server set to 8 Flame Altars, a player set to 4).
So the join compares them. For each boot mod with side `both`, both sides send a fingerprint of what their boot content
committed (the staged definitions and the mod's resource patches, also those in `blocks/*.json`), and the server treats a
difference like another version of the mod:

| `modSync` on the server | A player whose boot content differs |
|---|---|
| `refuse` | is turned away: "The boot content of More Flame Altars on your game differs from this server's ... Use this server's settings of More Flame Altars and restart the game." |
| `warn`, or not set | joins, with that warning on the Kiln menu's Network page and in their kiln.log |
| `off` | nothing is compared |

The player takes the server's settings of the mod (its file in `kiln/config`, from the server's operator or its
modpack) and restarts the game: a config sync or a reload can't change boot content. Not compared: an older Kiln on
either side, a mod in `optionalMods`, a mod with side `client` or `server`, and another version that the server's
`versionMatch` lets in.

So read in `OnBoot` only settings a server and its players share, such as balance values the server sets for everyone,
and say on your mod's page that players take the server's. A setting that may differ per player belongs in `OnLoad`.
Stage the same content for every role too: content that depends on `boot.Roles` differs between a player's game and a
dedicated server, and the join counts that as a difference. Not yet seen between a real server and a real game.

## The game's data in OnBoot

`boot.GameData` (`IReadOnlyGameData`) reads the game's own items, templates, skill nodes and materials, as they
shipped:

```csharp
var logs = boot.GameData.Read("item:Material_T1_Wood_Logs");    // also template:, skill:0x…, material:
```

The game hasn't loaded anything yet, so the answers come from the **boot snapshot**: a copy of those records that Kiln
makes from the game's files. The launcher makes it when it starts the game with an enabled mod that has `"boot"`:
half a minute to a minute and about 300 MB, once per game update. On a server you start yourself, run
`kiln boot-snapshot --game <server folder>`.

**Any resource** (0.2.0-dev.29.17). `names:resources/<qualified type name>` lists every resource of a type
(`names:resources/keen::SceneResource`), and `resource:<GUID>/<type>/<part>` reads one of any type, not only items and
templates. The snapshot holds them since 0.2.0-dev.29.17 (that is why it grew from about 200 MB); an older snapshot is
made again once, at the next start through the launcher.

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
number, a bool or an enum; strings and references to other resources can't be patched.

### Lists and template components

New in 0.2.0-dev.29.15. Besides `set`, a patch can change the shape of a resource:

| Key | On | Does |
|---|---|---|
| `append` | a list of numbers, bools or enum members | adds `values` at its end; `"aboveLast": true` adds only values greater than the list's last, so a sorted list stays sorted |
| `addComponents` | a template | gives it components of these game types, zeroed; one it already has stays as it is |
| `removeComponents` | a template | takes out components of these types; what an actor needs to live is refused |

```json
"ground-pickup": {
  "resource": "9bf5aac3-6ae0-43b1-9f27-18c2f98abfca",
  "type": "keen::ecs::TemplateResource",
  "removeComponents": ["SpawnTime"],
  "addComponents": ["PickupItemZone"],
  "set": { "PickupItemZone.lastAttempt.value": 0, "Gravity.isActive": false }
},
"more-steps": {
  "resource": "46e14df6-fb8f-4f66-9463-e23b9e19e48e",
  "type": "keen::FbUiBundle",
  "append": { "difficultySettings.settingValues.enemyDamage.steps": { "values": [3, 5, 10], "aboveLast": true } }
}
```

On a template a path starts with a component's type name (`Gravity.isActive`; `Gravity#1.isActive` for a second one):
that is how an added component's fields are filled in. Name components by type, never by their place in the list. In C#:
`RemoveComponents`, `AddComponents` and `Append` (with `ResourceListAppend { Values = [3, 5, 10], AboveLast = true }`)
on the `ResourcePatchBlock`.

Since 0.2.0-dev.29.17 three more:

| Key | On | Does |
|---|---|---|
| `copyComponents` | a template | `{ "<component type>": "<template GUID>" }`: copies the whole component, with all its data, from that other template. Added when the template has none of that type, its own replaced when it has. The source is read as the game has it, before any patch of this start |
| `clear` | lists of anything | `["<list path>", …]`: each list made empty |
| `replace` | a list of numbers, bools or enum members | `{ "<list path>": { "values": [ … ] } }`: the list holds exactly these values afterwards, fewer or more than before |

```json
"area-deposit-chest": {
  "resource": "65baa890-022a-454b-9cb7-b92cb8c06cd4",
  "type": "keen::ecs::TemplateResource",
  "copyComponents": { "InventoryCraftingStock": "955ba32f-08ea-414d-bd98-ac75990aef04" }
},
"damage-steps": {
  "resource": "46e14df6-fb8f-4f66-9463-e23b9e19e48e",
  "type": "keen::FbUiBundle",
  "replace": { "difficultySettings.settingValues.enemyDamage.steps": { "values": [0.25, 0.5, 1, 2, 4] } }
}
```

(The first gives an ordinary storage chest the Magic chest's crafting stock component.) In C#: `CopyComponents`,
`Clear` and `Replace` (with `ResourceListReplace`). A list path of `clear`, `replace` or `append` names one list: `[i]`
on the way is fine, `[*]` is not.

**The order.** On one resource every patch's `removeComponents` come first, then every patch's `addComponents`, then
`copyComponents`, `clear`, `replace`, `append` and last `set`, each group in load order. The order in which a patch
writes its keys doesn't matter. Two mods are combined when they can't step on each other; when they can (both clear or
replace one list with different values, one clears a list another appends to or sets inside, one copies a component and
another counts on what it held), the later mod in the load order is refused before the game starts, and the report names
both. Another mod's plain value `set` on a copied component is fine.

**A patch applies whole or not at all** (since 0.2.0-dev.29.15): if any of its changes fails, none is kept, and the
resource is what the other patches make it. kiln.log and `kiln/state/boot.json` name the mod, the patch and the reason.

**Finding records by name.** In `OnBoot`, the game-data queries `names:items`, `names:templates`, `names:skills` and
`names:materials` list the names a kind holds, `names:templates/<component type>` (`names:templates/MiningNode`)
the templates with that component, and since 0.2.0-dev.29.17 `names:resources/<type>` every resource of a type
([The game's data in OnBoot](#the-games-data-in-onboot)).

- **Checked before the start**: the type, the path and the value. Two mods on one field are not combined: the later in
  the load order is refused, and the report names both.
- **Written** when the game's resource service is up and nothing has read from it yet. A patch that fails then is in
  kiln.log and `kiln/state/boot.json`, and the start goes on without it. A required boot mod's patch that can't be
  applied stops the start instead, with the reason in boot.json.
- **Both sides need the mod.** A patch changes the data of the game it runs in. A player who joins without the mod
  keeps the game's values on their side, so what their game shows can differ from what the server does. A mod that
  patches data both sides read says `"clients": "mod"`. Since 0.2.0-dev.29 a boot mod loads in a player's game too, and
  the join compares the two sides' boot content ([Settings and joining players](#settings-and-joining-players)).
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
- **Icons** of staged items, statuses and game-tree talents are files in your mod's folder with a relative path, as in
  `OnLoad` (`Visual = new VisualBlock { Icon = "icons/token.png" }`), and show from the first start since 0.2.0-dev.29;
  before, a boot-staged item or talent kept the icon of the one it was made from. A missing file, or a path that leaves
  the folder, costs only the icon: kiln.log says so once and the SDK's bake warns (KILN030).
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

- **Dedicated servers** since 0.2.0-dev.28.
- **A player's game**, a world they host and a game that joins a server, since 0.2.0-dev.29, with no setting: the rows
  `mods.boot.client` and `mods.boot.resource_patches` are open. In 0.2.0-dev.28 a boot mod didn't load there unless
  `"preview"` was set in `kiln/kiln.json`; that setting is no longer needed, and leaving it does no harm. A server that
  runs a boot mod its players need no longer turns away players who have Kiln and the mod.
- A player's game builds every mod's VFX and material files at its start, as it always did. Staging VFX or materials
  in `OnBoot` is not in this build (`mods.boot.vfx` reads unavailable, "not in this build", on a client). A required
  boot mod with a broken VFX or material file stops the start in a player's game too, and the stop line names the file;
  an optional boot mod loses only that file, with a line in kiln.log.
- A boot mod's resource patches are never lost without notice: if the game's resource service was up before the boot
  content was ready, the mod is left out (or the start stops for a required one) and kiln.log says why.
- A server where the boot phase doesn't run (safe idle, .NET off) doesn't load boot mods either; the row
  `mods.boot.phase` says why.

Next to other loaders' mods in a player's game, boot mods were confirmed in one hosted game; the guided check of both
loader orders has not been played yet.

## Testing

`KilnHarness.BootPhase` in Kiln.TestKit runs your `OnBoot` under `dotnet test`, with the same staging as a start:
[Tests without the game](/kiln/wiki/testing#onboot-under-dotnet-test). The SDK's bake runs it too: a build fails
(`KILN032`) when `OnBoot` throws or a definition would not lower. The sample `boot-gallery` stages a status, an effect,
an item, a spell, a talent and a resource patch, and reads the game's data.
