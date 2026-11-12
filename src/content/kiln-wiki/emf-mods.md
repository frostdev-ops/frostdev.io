---
title: "EMF mods"
nav: "EMF mods"
description: "Install EMF DLL and Lua mods with API v27 support, current differences and server/client evidence limits."
status: "partial"
updated: "2026-11-11"
---

**0.2.0-dev.22** runs mods made for EMF (the Enshrouded Modding Framework), including EMF 0.6.0 / API v27 and
older DLL/Lua mods. You do not need EMF's `dinput8.dll` or its core. Kiln's EMF part is installed by default.

The C table has **90 slots: 77 full, 13 partial, none missing**. That describes implemented contracts, not a claim that
every mod or player-facing feature has been tested. [Remaining differences](#what-doesnt-work-yet) and client checks are below.

## Install a mod

1. Put the mod in `emf/mods/<mod>/` in the game folder, with its `mod.json` and DLL, or as a single
   `emf/mods/<name>.dll`. Or drop it on the launcher window: it shows up in the list on **Play**.
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

When EMF's own core is detected at startup, Kiln's EMF part steps aside and EMF runs the mods. Use one startup owner
for EMF; loading another native core after mods have already started can still conflict. Since dev.22, while EMF's own
loader is installed, the launcher copies your profile's EMF mods into `emf/mods/<name>/` for it, so they load too, and
removes its copies when the loader is gone. Start once from the launcher's **Play** after you install EMF's loader. EMF's own
`emf/config/<mod>.ini` still decides whether a mod is on; `kiln/state/emf.json` lists the copies, and the reason says
when that file keeps one off.

An older EMF 0.3.3 core goes idle on the tested game build, and Kiln's log says how to hand its mods to Kiln.
Put `;` in front of EMF's line in `kiln/chain.ini`, then restart. EMF's files can stay in `emf/`; only its loader must
not run.

## dev.21 changes

- **Hooks.** An EMF mod's `hook`, `hook_pattern` and `hook_address` are now links in Kiln's
  [hook registry](/kiln/wiki/hooks), owned by `emf:<id>`. On one game function they run newest first, before Kiln's own
  links, together with Shroudtopia's mod hooks. Hooks on functions outside the game exe still use plain safetyhook.
- **Chat.** Kiln's chat commands no longer depend on the game's return address. kiln-emf's chat hook, or an EMF mod's
  hook in front of Kiln's, can no longer hide players' lines from them (a dev.20 bug). Tested with stand-in hooks under
  Wine; with kiln-emf's client chat bridge in a real client: open.
- **Portraits.** Pictures are drawn off the boot thread. When every picture is current, Kiln doesn't call the renderer
  and the game doesn't wait. `image_load("portrait:<key>")` from a tick or render thread returns a handle at once
  while the picture is still being drawn. It shows nothing until the drawing finishes, then the picture. A mod that
  calls it while its DLL loads still waits (at most 120 s for the whole start).
- **Portrait cache codes.** 5 (busy), 6 (full) and 7 (cache I/O error, tried again next start) are new. Use kiln-emf and
  kiln-eml from the same release.
- **Closed-source DLLs.** A DLL that hooks the same function as an EMF mod shows up as an overlap on **Native and DLLs**
  (next to **Load order**, from the list on Play). [Closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods).

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

| What | In dev.21 |
|---|---|
| Mod programs and event listeners | server world only, including a world you host; not the game client's own world |
| HUD and notifications | client overlay; on a server, HUD lines are retained and notes logged. Only the older clock display has been seen in game |
| Attributes and progression | health, stamina and mana work. XP/level adapters retain queued progression timing, thread and request-limit differences |
| Setting a player's level | queued for a later server step; a nonzero XP adjustment follows the level result and can take more steps |
| Mod windows | left/right clicks implemented, with Kiln's plain ImGui look. Refused on dedicated servers, as in EMF; client interaction still needs verification |
| Spawn with an E prompt | the prompt appears a step or two after the spawn |
| Images and portraits | decoded-pixel limits plus a 64 MB encoded-file limit. A portrait asked for from a tick or render thread is empty until its drawing finishes. Offline archive/cache proof does not establish in-game presentation |
| Radial-wheel input, joined messages and replication | implemented paths with host/server checks; real-client checks remain open |
| EMF's console window, debug bridge, save backups and profile manager | EMF's own tools, outside Kiln's EMF C API |

Inspect `kiln/logs/kiln.log` and `kiln/state/emf.json` for the mod's state and refusals. A full API contract does not mean a
call can succeed in the wrong world, without its dependencies or without a welcomed peer.

## Tested

The final source has host/ABI/adapter checks, the dedicated-server conformance probe and the two mixed-server boots above.
Earlier compatibility checks loaded all 13 DLL mods shipped with EMF 0.3.3, and its Lua host ran eight Lua mods. The clock
mod's time display was seen in game. dev.21's hook and chat changes were tested under Wine and on lab servers. No new physical-client session has verified API v27 networking, wheels, windows,
portraits, E prompts, taming or multiplayer behaviour. Install matching Lua/dependency versions on every side the mod requires.
