---
title: "Particle shaders and material reskins"
nav: "Shaders and reskins"
description: "Advanced: your own HLSL hooks for a particle, checked and linked by Kiln. And a material of yours in place of one of the game's."
status: "pending"
updated: "2026-11-07"
---

> **New in 0.2.0-dev.16, not yet seen in the game.** Both pass Kiln's tests on the CPU and on a real GPU (hostile hooks
> included) and were tested on a lab server: hooks linked, a reskin served, taken off at unload and handed to the next
> mod. Nobody has seen them drawn in a real game yet.

Most effects need no code: a [`VfxBlock`](/kiln/wiki/blocks#vfx) covers bursts, shapes, curves, flipbooks and streaks.
When that isn't enough (particles that swirl through noise, orbit a point, pulse), you write **hooks**: small HLSL
functions that change a particle. You don't write a whole GPU program. Kiln checks your hooks when the game starts and
links them into its own particle shader.

## Hooks

```hlsl
#include "kiln_hooks.hlsl"

void swirl_update(inout KilnSprite s, KilnContext c)
{
    s.velocity += kiln_curl(s.position * c.user0.y, 0.0f) * c.user0.x * c.dt;
}

#define KILN_UPDATE swirl_update
#include "kiln_hooks_main.hlsl"
```

| Hook | Runs | May change |
|---|---|---|
| `KILN_SPAWN` | once, when the particle is born, after Kiln placed it on the block's shape | the particle: position, velocity, life, roll, spin, one value of your own |
| `KILN_UPDATE` | every tick, after Kiln applied velocity, gravity, drag and spin | the same; `s.alive = false` kills it |
| `KILN_DRAW` | before each draw, with the look from the block's curves | scale, colour, alpha, roll; `l.visible = false` skips the draw |

The context gives the tick's time step, the effect's place, rotation and scale, the wind, the sun, the
[play parameters](/kiln/wiki/blocks#vfx) and eight constants from the block. Helpers: random numbers, smooth noise, a
curl swirl that doesn't bunch particles up, rotation.

## Build and use

```sh
kiln-vfxcook shader build --mod MyFx      # every shaders/*.hlsl to shaders/build/*.spv
```

It needs `glslangValidator` (the Vulkan SDK, or your distribution's `glslang`). Commit the source and the `.spv`: the
`.spv` ships in your mod, and players never need a compiler. Point a particle at it, with its constants:

```jsonc
"shader": { "file": "shaders/build/swirl.spv", "constants": [6, 0.8, 0.4] }
```

The mod's `kiln.mod.json` must say `"advanced": true`; the launcher shows that. Every other field of the particle still
applies: your hooks start from what the block says. The `ShaderSample` mod in the Kiln repository has a swirl, the same
effect without its hooks to compare, and a module that's refused on purpose.

**From the earlier kit:** sources that include `kiln_particle.hlsl` and `kiln_particle_main.hlsl` still build (the names
now point at the hook kit), but `.spv` files built before 0.2.0-dev.16 must be rebuilt; `kiln.log` says so. The
compiler is now `glslangValidator`, not `glslc`, and the kit has no `kiln_curve`: the block's curves arrive already
applied.

## How Kiln keeps it safe

The game never compiles your `.spv` as it is. At every start Kiln checks it and links it into its own particle shader,
and the game compiles that. Kiln trusts neither the stamp nor the compiler: a hand-written module gets the same checks.

- **Memory:** a hook only reaches its own particle's data. It can't declare or name any buffer, image or shared memory,
  so it can't touch other particles, other effects or the game's draw lists. Every array index is kept in range.
- **Loops:** every loop is capped. Past the cap it leaves the loop. No recursion.
- **Time:** each hook call has a budget of 16,384 instructions, counting every function it calls.
- **Instructions:** plain arithmetic, logic and structured control flow only. No barriers, atomics, textures or
  extensions. Size limits on the module and its local memory.
- **Results:** a position, velocity or age that isn't a finite number kills the particle; other NaN or infinite values
  fall back to safe ones. Colours and speeds are clamped.

If a check refuses a module (no Kiln stamp, built for another Kiln, over the budget, a forbidden instruction, no
`"advanced": true`), Kiln's own sprite draws the particle instead, so the effect still shows, and `kiln.log` says why
once.

**What it can't prevent.** A hook can make its own effect look wrong, and cost GPU time up to its budget. A module
that's malformed in a way these checks don't cover could still make the GPU driver's compiler fail when the effect is
first played, which can end the game like any crash. That's the same trust a player gives a mod's C# code.
`kiln-vfxcook shader build` runs the full validator before you ship.

**For players:** `kiln/config/vfx.json` with `"shaders": false` turns every mod's particle shaders off; their effects
then draw with Kiln's own particles. `"skipShaderMods": ["mod-id"]` does it for one mod.

## Reskinning a game material

A [material block](/kiln/wiki/blocks#materials) can take the place of one of the game's materials: `"replaces"` with the game
material's GUID draws yours on every item, prop or creature that uses it, with no model of your own.

```jsonc
"materials": { "workbench_frost": { "replaces": "39745562-5d58-4749-bc64-582e5630324a", "kind": "opaque",
                                    "albedo": "textures/steel.png", "tint": "#bfe0ff" } }
```

- **Keep the original's kind** (opaque, cutout, ...). The game's models are built for it: another kind draws with the
  wrong variant, and holes may fill or back faces vanish.
- Kiln's `kfc.py` lists the game's materials and which ones a model uses. A GUID that isn't one of the game's
  materials is refused, and the game draws its own.
- It's a client-side look: a mod that only reskins may be `"side": "client"`. Players need the mod (`"clients": "mod"`).
- The `MaterialSample` mod turns the workbench's wood into frost steel.

**It belongs to your mod.** Unload the mod and Kiln stops serving the reskin. If two mods reskin the same material, the
first in the load order draws, and the other takes over if the first unloads. But the game reads every material once,
when it starts: a reskin already on screen changes back only at the next game start.
