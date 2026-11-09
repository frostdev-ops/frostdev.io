---
title: "EMF mods"
nav: "EMF mods"
description: "Install EMF DLL and Lua mods; released support and the staged EMF 0.6.0 / API v27 additions."
status: "partial"
updated: "2026-11-08"
---

Released 0.2.0-dev.19 runs mods made for EMF (the Enshrouded Modding Framework), from 0.3.3 up to 0.5.1. It gives them the EMF
0.5.1 API with the gaps below, built on Kiln. DLL mods and EMF's Lua mods both work. You don't need EMF's `dinput8.dll` or its core.

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

## dev.20 support in preparation

**Staged, absent from released dev.19.** The adapter is being updated to EMF 0.6.0 / API v27, including the five mod-message
functions (`net_channel`, `net_to_server`, `net_to_player`, `net_to_players`, `net_peer`). It uses EMF's upstream hidden-chat
wire protocol; it is not a Kiln-only channel or a claim that a joined upstream client has already been tested. Hosted/offline
messages travel in process. Remote delivery needs a peer handshake and the same mod/channel version on both sides. A send
refusal can mean no welcomed peer, a direction/version mismatch, a size limit or a rate limit.

This work also adds radial-wheel support, right-click window events, stamina/mana attributes and the newer program/spawn
paths. Client-world ECS programs remain unsupported. Windows still need a game client and retain Kiln's overlay look.
The full API slot count and final integration results are still being checked.

**Beastmaster and ShroudForge together:** two dedicated-server dev.20 runs loaded EMF Lua 1.19 and Beastmaster 1.13 beside
ShroudForge, each once per run. Each network probe finished with 11 passes and no failures. The optionalbear/beasts
asset-pack run failed at startup under Wine with **Access denied**; pack startup and portrait-manifest handling remain
unresolved. These checks do not verify portraits, player UI or gameplay. API v27 support is needed by that Lua/Beastmaster path. Install
the matching Lua host and mod dependencies on the sides the mod requires. A successful load, a network fixture or an
unchanged ShroudForge setting does not verify capture, stable offers/portraits, wheel choices, commands or joined-player
synchronization. That pairing still needs hosted and joined game checks. See also
[ShroudForge](/kiln/wiki/eml-shroudforge#dev20-pairing-with-emf).

## What doesn't work yet

These are the gaps in released dev.19; the staged changes above do not make it a newer build.

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
