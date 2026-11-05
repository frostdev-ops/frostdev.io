---
title: "EMF and DLL mods"
nav: "EMF and DLL mods"
description: "Kiln loads EMF mods and plain DLL mods next to Kiln mods, from a profile or the drop-in folders."
status: "works"
updated: "2026-11-04"
---

## EMF mods

Kiln loads unmodified EMF 0.3.3 mods, DLL and Lua, without EMF's loader.

1. Put the mod in `emf/mods/<id>/` with its `mod.json` and DLL, or as `emf/mods/<name>.dll`, or add it to a profile. Lua
   mods also need EMF's `lua` mod.
2. Switch it on: most start off. Kiln creates `kiln/config/emf/<id>.ini` at first start. Set `enabled=1` there.
3. Start the game or server. Kiln's log has one line per EMF mod.

Kiln takes old settings from EMF's config at first start. After that, edit Kiln's file: it rewrites EMF's copy each start.

While the game runs: `emf.settings <mod>` and `emf.set <mod> <key> <value>`.

If Kiln chains EMF's own loader, EMF loads the mods itself, but 0.3.3 stays idle on current game builds. To hand them to
Kiln, put `;` in front of EMF's line in `kiln/chain.ini` and restart.

Radial wheels aren't supported yet. `kiln/state/emf.json` lists, per mod, any functions Kiln doesn't support.

## DLL mods

One or more DLLs, with a small `native.json` naming them and when they load:

| When | Use |
|---|---|
| `dllmain` | before any game code (listed by the launcher) |
| `early` | first thing when Kiln starts (default) |
| `boot` | after Kiln's own services |
| `world` | when the first world starts |

Add them to a profile (the **Native** tab), or drop them into `kiln/native/<folder>/`. One that crashes while loading is
marked failed with a crash report, and the game carries on. DLL mods never unload, so changes need a restart.

## Other dinput8 tools

Only one file can be the game's `dinput8.dll`. Kiln moves another tool's aside and loads it itself, listed in
`kiln/chain.ini`.
