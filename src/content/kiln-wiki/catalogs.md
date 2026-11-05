---
title: "Game-data catalogs"
nav: "Catalogs"
description: "Every game id from your own install: search them, check data packs against them, and use them as C# constants."
status: "works"
updated: "2026-11-04"
---

The **catalog** lists the game's items, recipes, templates, perks, buffs, skills, sound cues and more, made from your own install,
read-only. It's Keen Games' data, so it's never committed, bundled or downloaded.

```sh
kiln catalog build                  # every installed side; skipped when current
kiln catalog status                 # file, game build, current?, counts
kiln catalog path                   # where it lives
kiln catalog search "bronze sword" --section items
```

A build takes about a second. Rebuild when `status` says the game changed. It refuses while Steam is updating, and never writes
into game folders. A dedicated server's catalog has no texts or sounds.

[`kiln lint`](/kiln/wiki/lint) checks names against it, and [VS Code](/kiln/wiki/vscode) completes and explains them.

## C# constants

Kiln.Sdk adds a generator to every mod:

```csharp
using Kiln.GameIds;

Content.Items.Get(GameItems.Weapon_T1_1H_SwordEpic_01)!.Set("maxStackSize", 5);
// hover on the constant: "Bronze Sword (Weapons, …)"
uint id = GameItems.Ids.Weapon_T1_1H_SwordEpic_01;
string guid = GameItems.Guids.Weapon_T1_1H_SwordEpic_01;
Content.Buffs.Get(GameBuffs.Rested_cdbe9c80);
```

`GameItems`, `GamePerks`, `GameRecipes`, `GameTemplates`, `GameSequences` and `GameSounds` hold names. `GameBuffs`, `GameSkills` and
`GameWorkshops` hold `0x` ids. `GameCatalog` names the build.

`<KilnGameIds>` picks the sections: default `Items;Perks;Buffs;Skills;Workshops`, also `Recipes`, `Templates`, `Sequences`,
`Sounds`, `All` (about 58,000 constants) or `None`.

No catalog gives `KILN190`, and code using the constants won't compile. Run `kiln catalog build`.
