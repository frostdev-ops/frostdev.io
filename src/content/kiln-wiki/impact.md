---
title: "Impact programs"
description: "Read the game's spell programs as text, clone and change them, write new ones, and call your own C#."
status: "partial"
updated: "2026-11-17"
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

A new item's `program` ([New items](/kiln/wiki/new-items)) may name a program your mod serves this way. Before
0.2.0-dev.29.11 such a `program` was refused without a reason, and the item kept its base's program.

## Kiln natives

```csharp
Abilities.Natives.Register("Chill", argc: 2, call =>
{
    var target = call.GetEntity(1);
    Combat.Damage(target, (int)(call.GetFloat(0) * 3), call.Impact.Root);
    return 1;
});
```

A program calls it as `mymod.Chill`. Declare it in `impact/natives.json`. A native registered this way suspends the
program for one step.

### Natives that answer in the same step

```csharp
[ImpactNative("OnHit")]
public static bool OnHit(in NativeContext ctx, EntityId target, ref float attackMod)
{
    attackMod *= 1.5f;            // written into the program's variable at once
    return !target.IsNone;        // what the call pushes
}
```

New in 0.2.0-dev.29, server only. Put `[ImpactNative]` on a static method with typed parameters and the build makes the
rest: its registration as a same-step native, its typed `impact/natives.json` entry and a `Natives.<Name>` reference for
your programs. Parameters are `int`, `uint`, `float`, `bool`, `TimeSpan`, `EntityId`, `Vector3` and `DamageSetup`; `ref`
is in and out, `out` is out, `Optional<T>` may be left unconnected. A shape the generator can't make is a build error
(KILN170 to KILN174).

- `Abilities.Natives.RegisterSync` registers such a native by hand (`abilities.natives.sync`). A `natives.json` entry
  with `"sync": true` binds its argument types: Kiln and the cook refuse a program that passes another type
  (`E_ARGTYPE`), and every call is checked. `Natives.DeclareTyped` does the same from C#.
- `Abilities.Natives.Attach(program, "getTransform", NativeStage.Before, handler, site, priority)` hooks a game native's
  calls in one program at one call site (0: any), `Before`, `Instead` or `After`, without cloning the program
  (`abilities.natives.attach`).
  `Natives.Wrap` and `OnDamage` now run through it, unchanged. An attachment made in `OnLoad` is `Pending` until the
  world's programs are in.
- **Other entities.** Inside a same-step native, `NativeContext.TryRead<T>` and `TryWrite<T>` reach the components the
  game's Impact program itself declares, on any entity (the caster's target, for example), in the same step. A write
  raises `ComponentWrittenEvent` with `Writer = "<modid>/native:<name>"`, and writing an attribute runs the game's
  formulas. `NativeContext.Post` hands work to the tick thread (`abilities.natives.ecs`).
- **Threads.** A handler runs on the thread that runs the program (the world's or one of the game's workers): no
  tick-thread API, no blocking. A mod's `OnUnload` waits for a call that is still inside, and kiln.log names a handler
  still inside after a second.
- **Room.** Kiln's two built-in natives and all mods' natives share 21 entries of the game's native registry, so 19 are
  left for mods. A registration past that is refused with the reason, where before it was silently left out.
  `Abilities.Natives.StateOf` and `NativeAttachment.State` say where a native or an attachment stands.

A block effect can call such a native first: [`EffectBlock.Run`](/kiln/wiki/blocks#a-block-effect-that-runs-your-native).
The sample `FrostMark` is a sword whose added Ice hit deals 1.5 times its damage on a target below a quarter of its
health, with an attachment that counts the Fireball explosion's `applyDamage` calls. Kiln.TestKit's
`kiln.ImpactNatives` runs your natives and attachments offline ([Tests without the game](/kiln/wiki/testing)). These ran
on a dedicated lab server without a player; a real hit in a real game is not yet confirmed.

## Queries and hits

Query results include a creature's child entities: weak spots and VFX links. The game keeps one hit per root target and impact, so a
hit kept on a VFX link is lost. Filter to what has health with `fetchOptionalAttribute`.

## Game types by their Impact name

Since 0.2.0-dev.28. Impact scripts name a type in their own way: `ecs.Health` for `keen::ecs::Health`, `float32` for
`keen::float32`. `GameType.ImpactName` gives that name, and `GameTypes.ByImpactName` and `FindAllByImpactName` find a
type by it:

```csharp
string? impact = GameTypes.Find("keen::ecs::Health")!.ImpactName;     // "ecs.Health"
GameType? one = GameTypes.ByImpactName("float32");                     // keen::float32
```

Capability `types.impact_names`.

## Rules the checker enforces

Kiln refuses a program that could crash the server: too deep a stack, a path past the end, a jump into an instruction, an
unknown function. The linter warns about a loop with no way out. A registered program can't be replaced while it runs: clone
it to a new GUID.
