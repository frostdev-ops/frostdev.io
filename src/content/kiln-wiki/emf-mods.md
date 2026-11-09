---
title: "EMF mods"
nav: "EMF mods"
description: "Install EMF DLL and Lua mods with API v27 support, current differences and server/client evidence limits."
status: "partial"
updated: "2026-11-08"
---

**0.2.0-dev.20** runs mods made for EMF (the Enshrouded Modding Framework), including EMF 0.6.0 / API v27 and
older DLL/Lua mods. You do not need EMF's `dinput8.dll` or its core. Kiln's EMF part is installed by default.

The C table has **90 slots: 77 full, 13 partial, none missing**. That describes implemented contracts, not a claim that
every mod or player-facing feature has been tested. [Remaining differences](#what-doesnt-work-yet) and client checks are below.

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
- A mod that needs an EMF API newer than v27 is refused, with the version it needs.

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

An older EMF 0.3.3 core goes idle on the tested game build, and Kiln's log says how to hand its mods to Kiln.
Put `;` in front of EMF's line in `kiln/chain.ini`, then restart. EMF's files can stay in `emf/`; only its loader must
not run.

<a id="dev20-support-in-preparation"></a>

## dev.20 support

API v27 includes `net_channel`, `net_to_server`, `net_to_player`, `net_to_players` and `net_peer`. Messages use EMF's
**official `#!emf1` hidden-chat wire**, not Kiln's own mod-network protocol. Host checks cover upstream-wire interoperability;
the dedicated-server API v27 probe passes 11 checks. Remote delivery needs a welcomed peer and matching mod/channel
versions. A refusal can mean no peer, a direction/version mismatch, a size limit or a rate limit. Joined upstream-client
handshake and gameplay remain unverified.

Radial wheels, right-click window events, health/stamina/mana access, spawn-time extra components, program hooks,
declared other-entity writes and multiple event inputs are implemented. The v27 table is 728 bytes with the unchanged
688-byte v26 prefix. Client-world ECS programs and event listeners remain unsupported. Wheel drawing/input, window
interaction and joined-client replication still need game checks.

**Beastmaster and ShroudForge together:** two dedicated-server checks loaded unmodified EMF Lua 1.19 and Beastmaster 1.13
beside ShroudForge and the enabled bear 2.1 / beasts 2.2 asset packs. Each framework started once, and each API v27 probe
finished at 11/0. The first boot committed 89 resources and added two items; the next reused identical patched resource
hashes. This verifies those asset/startup paths, including the earlier Wine **Access denied** fix. The current bundle also
includes later recovery-path hardening; those earlier boots are not a fresh joined-client test of that guard or every mod pair.

The separate GPL renderer produced textured wolf PNGs from a read-only client archive and reused its cache through the
actual Windows DLL on Wine C: and mounted Z: paths. Native path review is complete: symbolic/junction redirects are
refused, with no writes outside the portrait cache. Dedicated-server archives lack render models. Automatic startup and
custom-pack portraits displayed in Beastmaster remain unverified. Capture/release, stable E prompts, wheel choices,
commands and joined-player synchronization still need hosted and joined game checks. See
[ShroudForge](/kiln/wiki/eml-shroudforge#dev20-pairing-with-emf).

## What doesn't work yet

These are the current API v27 differences and evidence limits, replacing the older dev.19 gap list.

| What | In dev.20 |
|---|---|
| Mod programs and event listeners | server world only, including a world you host; not the game client's own world |
| HUD and notifications | client overlay; on a server, HUD lines are retained and notes logged. Only the older clock display has been seen in game |
| Attributes and progression | health, stamina and mana work. XP/level adapters retain queued progression timing, thread and request-limit differences |
| Setting a player's level | queued for a later server step; a nonzero XP adjustment follows the level result and can take more steps |
| Mod windows | left/right clicks implemented, with Kiln's plain ImGui look. Refused on dedicated servers, as in EMF; client interaction still needs verification |
| Spawn with an E prompt | the prompt appears a step or two after the spawn |
| Images and portraits | decoded-pixel limits plus a 64 MB encoded-file limit. Offline archive/cache proof does not establish in-game presentation |
| Radial-wheel input, joined messages and replication | implemented paths with host/server checks; real-client checks remain open |
| EMF's console window, debug bridge, save backups and profile manager | EMF's own tools, outside Kiln's EMF C API |

Inspect `kiln/logs/kiln.log` and `kiln/state/emf.json` for the mod's state and refusals. A full API contract does not mean a
call can succeed in the wrong world, without its dependencies or without a welcomed peer.

## Tested

The final source has host/ABI/adapter checks, the dedicated-server conformance probe and the two mixed-server boots above.
Earlier compatibility checks loaded all 13 DLL mods shipped with EMF 0.3.3, and its Lua host ran eight Lua mods. The clock
mod's time display was seen in game. No new physical-client session has verified API v27 networking, wheels, windows,
portraits, E prompts, taming or multiplayer behaviour. Install matching Lua/dependency versions on every side the mod requires.
