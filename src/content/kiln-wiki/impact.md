---
title: "Impact programs"
description: "Read the game's spell programs as text, clone and change them, write new ones, and call your own C#."
status: "partial"
updated: "2026-11-05"
---

> **Partly built.** Reading, writing, checking and cooking work for all of the game's programs, and a changed program has run
> on a test server. A heal-over-time buff still needs a buff bound to it, and a changed projectile needs a player check.

Every spell, attack, perk, buff and enemy attack runs a small **Impact program** on the server. A mod can read them as text,
write new ones, clone one under a new GUID and change it, and call **Kiln natives**: functions you write in C#.

Check first whether a value does the job. Damage, radius, durations, buffs and costs are [game data](/kiln/wiki/game-data).
Programs are for new behaviour.

## The tool

```sh
python3 impact.py natives                 # the functions programs can call
python3 impact.py dis <program GUID>      # a game program as text
python3 impact.py asm my.kimp -o my.bin   # assemble and check
python3 impact.py lint my.bin             # the checks Kiln runs before loading
kiln cook                                 # build a mod's programs
```

It reads your installed game, read-only. The [VS Code extension](/kiln/wiki/vscode) does this in the editor.

## Ship a recipe, not the game's code

Listings of the game's programs are game data: never commit or ship them. Ship a **recipe** instead: the program's GUID plus
your edits. The cook applies them on the player's machine.

```
MyMod/
  impact/
    my_effect.kimp       your own programs
    chain.kpatch         code you insert into clones
    natives.json         the Kiln natives your programs call
    cook.json            the recipe
  assets/
    assets.json          loads the cooked programs
    cooked/              made on the player's machine, never shipped
```

## Kiln natives

```csharp
Abilities.Natives.Register("Chill", argc: 2, call =>
{
    var target = call.GetEntity(1);
    Combat.Damage(target, (int)(call.GetFloat(0) * 3), call.Impact.Root);
    return 1;
});
```

A program calls it as `mymod.Chill`. Declare it in `impact/natives.json`.

## Queries and hits

Query results include a creature's child entities: weak spots and VFX links. The game keeps one hit per root target and impact, so a
hit kept on a VFX link is lost. Filter to what has health with `fetchOptionalAttribute`.

## Rules the checker enforces

Kiln refuses a program that could crash the server: too deep a stack, a path past the end, a jump into an instruction, an
unknown function. The linter warns about a loop with no way out. A registered program can't be replaced while it runs: clone
it to a new GUID.
