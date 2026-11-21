---
title: "Kiln mode for ShroudForge mods"
nav: "Kiln mode"
description: "Kiln can run ShroudForge mods on its own interpreter. A preview, off by default in 0.2.0-dev.30.2: how to turn it on, what works, what doesn't yet, and what a mod author can see."
status: "pending"
updated: "2026-11-21"
---

> **New in 0.2.0-dev.30.2, as a preview.** Kiln mode is off by default and stays off unless you turn it on. It passed
> Kiln's tests, but nobody has checked it in a real game yet.

Kiln mode is a second way to run ShroudForge mods. Kiln reads your mod and runs it on its own interpreter, with no
separate ShroudForge runtime in the game. The default does not change: Kiln's bundled ShroudForge runs ShroudForge mods
for every install, new and existing, unless a player picks kiln mode.

For how players install ShroudForge mods and how Kiln runs them by default, see
[EML and ShroudForge mods](/kiln/wiki/eml-shroudforge#shroudforge-mods).

## Turn it on

1. Add the preview line to `kiln/kiln.json` in the game folder (no trailing comma):

   ```json
   { "preview": ["kiln-sfi.interpreter"] }
   ```

   If the file already has other keys, add `"preview"` next to them.
2. In the launcher, open **Settings** and choose **Kiln's interpreter** on the **ShroudForge** card. The choice is
   greyed out until the preview line is there.
3. Start the game through Kiln. The choice is per game and applies from the next start; the card shows what the last
   start used.

To go back, choose **Kiln's bundled ShroudForge** on the same card. Your mods, their settings and your own mod folders
stay as they were.

If something looks wrong in kiln mode, switch back and tell us on GitHub or Discord with `kiln/logs/kiln.log` and
`kiln/state/sfi.json`.

## What your mod needs

Nothing. Kiln mode runs ShroudForge packages as they are:

- `mod.json` and `extended.mod.json` packages;
- their startup pass, which changes game data before the game starts;
- their Lua runtime;
- their DLLs, loaded at the start.

Before Play, the launcher checks the ShroudForge mods of the profile. A mod Kiln cannot run whole is skipped for that
start, with its reason, and a dialog lists it before the game opens. Nothing is switched off or deleted.

## What works and what doesn't yet

| Works in kiln mode | Not yet |
|---|---|
| Settings, the startup pass, the Lua runtime | Mod keyboard shortcuts (`shroudforge.input`): they answer "not pressed" for now |
| The mod menu key (F9 by default): Kiln's ShroudForge page with the mods of this start, their settings and their action buttons | In-game world changes (entity queries and writes, props, voxels, in-game asset reads): they answer "unavailable" |
| Mod DLLs that Kiln has a reviewed rule for | A DLL Kiln has no reviewed rule for is skipped, with the reason |
| The ShroudForge 1.7.9 mod API | Mods that need ShroudForge 1.8: they keep working on the default backend |

A function Kiln does not provide yet gives ShroudForge's own "unavailable" answer: `nil` or `false` plus a reason,
never a surprise `nil`. Guard optional features as you would for ShroudForge: ask `runtime.has` first, or wrap the
call in `pcall` and keep running without the feature when it fails.

```lua
local ok, err = pcall(function()
  -- a call that may answer "unavailable" in kiln mode
end)
if not ok then
  -- carry on without the feature; err says why
end
```

## Differences you can see

- **A long callback ends the mod.** A callback that runs over 10 s of Lua time ends that mod for the rest of the start.
- **Heavy Lua is slower.** Compute-heavy Lua runs slower than under ShroudForge; a tight arithmetic loop about 2.5 times.
- **Live reload takes Lua-only mods.** An edited mod needs a restart.
- **Settings apply at the next start.** Settings changed in kiln mode, in the launcher or on Kiln's ShroudForge page in
  the game, apply when the game starts again.

## Mods with save data

Some mods keep data in the player's saves (Quiver & Spellbook's ammo, for example). When such a mod is off for a start,
the warning before Play, a banner in the game, a badge on the mod's row and a marker on the pause menu's **Mods** entry
all say the same: do not save while this mod is off; restore it and restart first. If your mod keeps data in saves,
tell your players this too.

Adapted from ShroudForge by bonsaibauer (MIT).
