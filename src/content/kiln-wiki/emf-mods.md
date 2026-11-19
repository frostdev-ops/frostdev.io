---
title: "EMF mods"
nav: "EMF mods"
description: "Install EMF DLL and Lua mods with API v46 (EMF 0.6.14) support, current differences and server/client evidence limits."
status: "partial"
updated: "2026-11-19"
---

Kiln runs mods made for EMF (the Enshrouded Modding Framework), DLL and Lua mods, up to EMF 0.6.14 / API v46 since
**0.2.0-dev.29.12** (0.6.11 / v42 since dev.28, 0.6.8 / v40 since dev.27). You do not need EMF's `dinput8.dll` or its core. Kiln's EMF part is
installed by default.

The C table has **142 slots: 76 full, 17 partial, and 49 that answer "not available" for now** (functions EMF added
between 0.6.3 and 0.6.8, and in 0.6.13 and 0.6.14). That describes implemented contracts, not a claim that every mod or player-facing feature has
been tested. [What that means for a mod](#mods-built-for-emf-063-to-068), [remaining differences](#what-doesnt-work-yet)
and client checks are below.

## Install a mod

1. Put the mod in `emf/mods/<mod>/` in the game folder, with its `mod.json` and DLL, or as a single
   `emf/mods/<name>.dll`. Or drop it on the launcher window: it shows up in the list on **Play**.
   Lua mods also need EMF's `lua` mod (`emf/mods/lua/`).
2. Switch it on. Most EMF mods start switched off. Kiln creates `kiln/config/emf/<mod>.ini` at the first start, with
   every setting at its default. Set `enabled=1` there, or use the launcher's settings editor.
3. Start the game or the server. `kiln/logs/kiln.log` has one line per EMF mod, and each mod logs as `[emf:<mod>]`.

If EMF ran in this folder before, the first start takes your old values from EMF's own config. After that, edit Kiln's
file: Kiln rewrites EMF's copy at each start.

**EMF's whole download** (0.2.0-dev.29.18). Drop EMF's zip on the launcher and its Lua mods (Beastmaster, Bounty
Board, Wandering Champion, Grave Keeper, Hand-over, Kill Counter, Life Skills, Minimap, Necromancer) come in as EMF mods,
beside its DLL mods. Before, they were left out as "not a recognised mod package".

- EMF's `lua` mod reads Lua mods only in `emf/mods`, so Kiln copies each one you switch on there. The Lua examples and
  the starter in EMF's download are left out, as EMF doesn't install them either.
- Lua mods you put into `emf/mods` yourself now show as loading instead of "Can't run". When EMF's `lua` mod is missing
  or switched off, the launcher says that instead.
- EMF's own files in its download (its core, its builder of EML content and its frame-time recorder) are no longer
  added as DLL mods, which Kiln would have loaded at every start: they are part of EMF, and Kiln says so.

Not yet checked in a real game.

Which mods load:
- A mod marked `client` doesn't load on a dedicated server.
- A mod whose required mod is missing, off or too old doesn't load, and the log says why.
- A mod that needs an EMF API newer than v46 is refused, with the version it needs.

## Mods built for EMF 0.6.3 to 0.6.8

A mod built with EMF's SDK doesn't start on a host whose table is smaller than the one it was built with. Kiln served
EMF 0.6.0's table until 0.2.0-dev.26, so every EMF DLL built since 0.6.3, and with EMF's `lua` mod every Lua mod of a
current EMF (Beastmaster, Necromancer, Bounty Board and the others), stayed off unless EMF itself was installed. Since
0.2.0-dev.27 the table is EMF 0.6.8's and they start.

EMF 0.6.10 (API v41) and 0.6.11 (v42) added no function, only two fields: `stuck_seconds` on move orders, with the
flag `EMF_MOVE_PEACEFUL_ALL`, and the door each point of a path goes through (`EmfPathResult.doors`). Since
0.2.0-dev.28 Kiln says version 42, so a mod whose `mod.json` says `"emf": 41` or `42` loads instead of being refused,
and `emf::has_v41()` and `has_v42()` answer true. `enemy_move` and `path_find`, the functions those fields belong to,
still answer "not available on Kiln yet".

EMF 0.6.13 (API v43) and 0.6.14 (v44 to v46) added seven functions: the game's own permissions of a player
(`player_permissions`), breaking player-built blocks (`break_blocks`, `block_at`, `find_wall`) and villager moves
(`villager_move`, `villager_move_cancel`, `villager_moving`). EMF 0.6.14's own Lua mod 1.39, Night Raids 1.2 and
Villager Jobs 1.5 need the whole v46 table to start, so until **0.2.0-dev.29.12** they stayed off on Kiln ("this mod
was built for EMF API v46; the core is v42"), and with that Lua mod every Lua mod. Since 0.2.0-dev.29.12 Kiln serves
the v46 table; the seven functions answer "not available on Kiln yet" for now. So on Kiln, Night Raids' raiders
don't break walls yet, and Villager Jobs lets only EMF's admins give jobs. Not yet run in a lab or a game. Since
0.2.0-dev.29.17 a mod that asks why breaking blocks is unavailable gets EMF's own "not available on this game version",
which Night Raids 1.2.1 compares (GitHub #43).

Kiln doesn't carry every function EMF added since. Chat lines without a speaker (`chat_tell_ex`, `chat_broadcast_ex`)
and `world_to_screen` work. Player join, leave and death events, item and character names, hits and hit rules, buffs,
markers, map actions, canvases, `remove_building`, paths, doors, enemy orders and move orders answer "not available",
as EMF does on a game build it doesn't know: the rest of the mod runs. `kiln.log` says once per mod and function
`... not supported (not available on Kiln yet)`, and `kiln/state/emf.json` lists the calls under `unsupported`.

What that means for EMF 0.6.8's own mods, read from their source (not seen with a player):

- **minimap** draws nothing.
- **Beastmaster**: its markers sent to players, its buff reads and removals and its move reads do nothing; the rest runs.
- **teleports**: the map action (Shift and hold on the map) isn't offered; its commands work.
- On Kiln an EMF mod's chat line always shows without a speaker's name, also a plain `chat_tell`.

On a lab server with no players, EMF 0.6.8's own mods, built from EMF's source, started on Kiln with no EMF installed:
`lua` 1.33.0 with eight Lua mods (Beastmaster 1.17.1 among them), and big_stacks, event_log, herald, raids, sleep and
teleports.

**EMF's mod check.** An EMF server can check a joining game's EMF mods and refuse games without its mods. A Kiln game
now answers that check, so such a server no longer kicks a Kiln player after a minute. When your game lacks a mod the
server needs, one note says which. Two limits: Kiln's list has no content mods yet, so a server set to refuse that also
requires content mods still refuses a Kiln game; and after leaving one server and joining another without restarting
the game, the check (and EMF mod messages) can be missing for that session when EMF's greeting arrives before the world
has loaded. Rejoining fixes it. A Kiln server answers an EMF game's check with its own list and logs the difference
(`EMF mods check: player ...`); it never refuses a join.

**Expeditions** (up to 1.2.x) kept saying "No free survivors nearby" next to your survivors, and Send said "too far
away", in a world your own game hosts, above all on slower PCs and the Steam Deck. Since 0.2.0-dev.29.15 Kiln runs that
mod's per-step work for the server side only, where all of its work happens. Thanks to Spirimtin for testing a
diagnostic build.

**What EMF mod windows do is in kiln.log** (0.2.0-dev.29.9): a window's title and the rows you can click when it opens,
then real changes, each click the mod receives and when it closes, kept short. A support report then shows whether a
window like Expeditions' opened, what it listed and whether Send was clicked.

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
688-byte v26 prefix. Since 0.2.0-dev.29 `register_program`, `register_program_def` and `on_event` with
`EMF_WORLD_CLIENT` run in the client world, hosted or joined, through Kiln's
[client-world programs](/kiln/wiki/world-programs#in-the-players-client-world); a dedicated server refuses them as before.
That path is built and not yet run in a real game. Wheel drawing/input, window interaction and joined-client replication
still need game checks.

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

These are the current differences and evidence limits, replacing the older dev.19 gap list. For the functions EMF
added in 0.6.3 to 0.6.8, see [above](#mods-built-for-emf-063-to-068).

| What | Now |
|---|---|
| Mod programs and event listeners | the server world, including a world you host, and since 0.2.0-dev.29 the game client's own world with `EMF_WORLD_CLIENT` (not yet run in a real game) |
| HUD and notifications | client overlay; on a server, HUD lines are retained and notes logged. Only the older clock display has been seen in game |
| Attributes and progression | health, stamina and mana work. XP/level adapters retain queued progression timing, thread and request-limit differences |
| Setting a player's level | queued for a later server step; a nonzero XP adjustment follows the level result and can take more steps |
| Mod windows | left/right clicks implemented, with Kiln's plain ImGui look. Since 0.2.0-dev.29 a window grows with what is in it (the Beastmaster stable, for one), up to 85 % of the screen height, and scrolls past that, as under EMF's own loader; not looked at in a game yet. Refused on dedicated servers, as in EMF; client interaction still needs verification |
| Spawn with an E prompt | the prompt appears a step or two after the spawn |
| Images and portraits | decoded-pixel limits plus a 64 MB encoded-file limit. A portrait asked for from a tick or render thread is empty until its drawing finishes. Offline archive/cache proof does not establish in-game presentation |
| Radial-wheel input, joined messages and replication | implemented paths with host/server checks; real-client checks remain open |
| EMF's console window, debug bridge, save backups and profile manager | EMF's own tools, outside Kiln's EMF C API |

Inspect `kiln/logs/kiln.log` and `kiln/state/emf.json` for the mod's state and refusals. A full API contract does not mean a
call can succeed in the wrong world, without its dependencies or without a welcomed peer.

## Tested

The final source has host/ABI/adapter checks, the dedicated-server conformance probe and the two mixed-server boots above.
Earlier compatibility checks loaded all 13 DLL mods shipped with EMF 0.3.3, and its Lua host ran eight Lua mods. The clock
mod's time display was seen in game. dev.21's hook and chat changes were tested under Wine and on lab servers. dev.27's
v40 table and the mod check were tested on a lab server and with host tests against EMF's own wire code. No
physical-client session has verified EMF networking, the mod check, wheels, windows,
portraits, E prompts, taming or multiplayer behaviour. Install matching Lua/dependency versions on every side the mod requires.
