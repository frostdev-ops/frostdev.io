# Particles, lights, the game's VFX

Wiki: [blocks, VFX](https://frostdev.io/kiln/wiki/blocks#vfx), [shaders](https://frostdev.io/kiln/wiki/shaders). Page
in the repository: `docs/kiln/modding/vfx.md`. `kiln lint` checks all of it.

## What's been seen in a real game
The status page lists Kiln-built particle bursts with a light, the game's VFX by name, a flame that stays on the hand
and many plays without a hitch as seen in the game; one VFX material drew magenta, and a coloured explosion showed
magenta for its first frame (open). The dev.29 VFX budget and registration ran in host tests only. Say "needs a client
check" about how a new effect looks, or whether it shows. A dedicated server draws nothing. Kept current at
https://frostdev.io/kiln/wiki/status.

## Writing one
- Scaffold: `kiln new vfx MyFx`. Bigger example: `mods/samples/VfxSample`.
- A `vfx` section in `blocks/*.json`, or `Blocks.Define("name", new VfxBlock { ... })` with `KilnServices` `Blocks`. Prefer data: a block in a file is there from the first start, and one from code from the next, because the game lists VFX once (dev.27+: Kiln.Sdk bakes code-defined VFX into the mod at build, so they are there from the first start too).
- A particle block needs `burst` or `rate`. Textures are PNGs in `vfx/`, power of two, 4 to 2048.
- Attach with a `Vfx` field on an effect, area, on-hit, cast, projectile or status: a block's name, `"other-mod:name"`, `"game:<name>"` or a GUID. From code: `Vfx.PlayAt`, `Vfx.PlayOn`, `Vfx.Stop`.

## The game's VFX
- Never guess a name: `kiln catalog search fireball --section vfx`, then `kiln vfx info <name>` for its length and parameters.
- VFX have no names of their own. A name is a template or sequence that uses it. Catalog entries without `byName` only have a label: write `"game:<guid>"`. `kiln lint` says when (KL323).
- `GameVfx.*` constants hold GUIDs and need `<KilnGameIds>Vfx</KilnGameIds>` and a catalog. Don't use them in a project others build without one.
- **Parameters** only work on an effect, area or on-hit, and only on a game VFX: `{ "name": "game:X", "parameters": { "radius": 3, "color": "#ff0000", "count": { "int": 7 } } }`. Kiln refuses them on a cast, projectile, status or a VFX block. The game ignores a wrong name or type silently, so run `kiln lint` with a catalog (KL321).

## Rules that matter
- A new VFX needs `side` both and `clients` `mod` (KL211). Only naming the game's VFX doesn't.
- All mods share room for 473 new VFX, 386 meshes, about 240 KB of mesh memory and 10 sounds in VFX (KL320). Past a limit Kiln refuses the whole mod.
  dev.29+: `Vfx.ResourceBudget` reads what is left from the game's own table once a client world runs; asset-file and
  native VFX count too. `Blocks.Define(name, vfxBlock, options)` answers registered, accepted for the next start, or
  refused (`Blocks.GetVfxRegistration(id)`).
- A VFX block's `sound` is counted but not played yet. No decals, fog, custom meshes or custom shaders yet.
- From code, a play reaches only Kiln clients near it, and joiners don't see it. For what every player must see, attach it to data.
