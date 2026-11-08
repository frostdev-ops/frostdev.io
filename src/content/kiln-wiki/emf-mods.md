---
title: "EMF mods"
nav: "EMF mods"
description: "Kiln runs EMF mods made for EMF 0.3.3 up to 0.5.1, DLL and Lua, without EMF's loader."
status: "partial"
updated: "2026-11-07"
---

Kiln runs mods made for EMF (the Enshrouded Modding Framework), from 0.3.3 up to 0.5.1. It gives them the same API EMF
0.5.1 gives them, built on Kiln. DLL mods and EMF's Lua mods both work. You don't need EMF's `dinput8.dll` or its core.

Kiln's EMF part is installed by default from 0.2.0-dev.18. Most of EMF's API works; the gaps are listed
[below](#what-doesnt-work-yet).

## Install a mod

1. Put the mod in `emf/mods/<mod>/` in the game folder, with its `mod.json` and DLL, or as a single
   `emf/mods/<name>.dll`. Or drop it on the launcher window: it goes on your profile's **EMF** tab.
   Lua mods also need EMF's `lua` mod (`emf/mods/lua/`).
2. Switch it on. Most EMF mods start switched off. Kiln creates `kiln/config/emf/<mod>.ini` at the first start, with
   every setting at its default. Set `enabled=1` there, or use the launcher's settings editor.
3. Start the game or the server. `kiln/logs/kiln.log` has one line per EMF mod, and each mod logs as `[emf:<mod>]`.

If EMF ran in this folder before, the first start takes your old values from EMF's own config. After that, edit Kiln's
file: Kiln rewrites EMF's copy at each start.

Which mods load:
- A mod marked `client` doesn't load on a dedicated server.
- A mod whose required mod is missing, off or too old doesn't load, and the log says why.
- A mod that needs an EMF API newer than 0.5.1 is refused, with the version it needs.

## Settings and commands

While the game runs: `emf.settings <mod>` lists a mod's settings, and `emf.set <mod> <key> <value>` changes one. A
setting the mod marks "live" changes at once; the switch applies at the next start.

EMF mods add commands (`/home`, `/unstuck`, `tp`, `herald.say` ...). On Kiln they run from:
- **Chat:** `/<command>`. Only you see the line and the reply. Commands a mod marks for players are for everyone; every
  other command is for admins.
- **The server's console file:** `emf/commands.txt`, one command per line. It runs as the server owner, and replies go
  to `kiln.log`.

Admins are players with the game's admin rights, or accounts listed in `kiln/config/emf/emf_core.ini`
(`[chat] admins=...`). Kiln reads EMF's own `emf/emf_core.ini` when its own file is missing.

## EMF installed too

When EMF's own core runs in the game, Kiln's EMF part steps aside and EMF runs the mods. A mod never runs twice.

EMF 0.5 runs on current game builds. EMF 0.3.3 doesn't: it goes idle, and Kiln's log says how to hand the mods to Kiln.
Put `;` in front of EMF's line in `kiln/chain.ini`, then restart. EMF's files can stay in `emf/`; only its loader must
not run.

## What doesn't work yet

| What | On Kiln |
|---|---|
| Radial wheels | not yet. Mods that open one (quick_stack, loot_magnet, bulk_craft, villager_jobs and some Lua mods) work without it |
| Mod programs and events | in the server's world only, also in a world you host. Not in the game client's own world |
| Stamina and mana | can't be read or changed. Health, level and experience can |
| Spawning with extra components | refused. Plain spawns work |
| Writing to another entity from a program, hooking a program | not yet |
| Mod windows | no right click, and a plain look. Not on a dedicated server (as in EMF) |
| Setting a player's level | arrives a game step later, then the experience after it |
| EMF's console window, debug bridge, save backups, profile manager | EMF's own tools, not part of Kiln |

When a mod calls something Kiln doesn't support, the log says so once, and `kiln/state/emf.json` lists it under that
mod. The mod goes on.

## Tested

On a test server, all 13 DLL mods that come with EMF 0.3.3 load, and the `lua` mod runs its 8 Lua mods. Kiln's own
check of EMF's API passes. In the game, the clock mod's time display was seen. Mods new in EMF 0.5, mod windows,
pictures and the E prompts haven't been checked in the game yet.
