---
title: "What works today"
description: "What Kiln does in the current build, what awaits a game test, what's being built and what isn't, as of November 2026."
updated: "2026-11-08"
---

Kiln is in early access: dev builds on [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301),
[GitHub](https://github.com/frostdev-ops/kiln/releases) and [this site](/kiln#download). This page describes **0.2.0-dev.20**, the current development release.

"Works" means it has run on a test server or in the game. "Seen in the game" means a player saw it in Enshrouded, in the
test sessions of 6 and 7 November 2026. Where only a game can show the result, it's under
[Built, game test pending](#built-game-test-pending) until a player has seen it. Things that failed in those sessions are
listed under [Open in the game](#open-in-the-game); some have had fixes since that still need a game test.

<a id="in-preparation-for-020-dev20"></a>

## New in 0.2.0-dev.20

These APIs and adapters are included in dev.20. Install the matching runtime and MDK before using them. The final
assembled source passed all 13 managed suites (1,538 checks, no failures or skips), native checks and the dedicated-server
checks described below. A passing server or host check does not establish client rendering, input or multiplayer behaviour.

| Area | Included in dev.20; evidence and remaining limits |
|---|---|
| [Quest and dialogue blocks](/kiln/wiki/quests#quest-and-dialogue-blocks-dev20) | typed blocks and `blocks/*.json`; first-start JSON journal compilation and lifetime cleanup. New-form journal/dialogue/reward presentation and party play need a client |
| [World blocks](/kiln/wiki/world-blocks) | crafting props and manual-station requirements, one-time container loot with save/restart journaling, lid/door controls and several collision boxes. Craft UI, animations and physical collision need a client |
| [UI blocks](/kiln/wiki/ui-blocks) | windows, HUD and keys bound to config/safe game values, with lifetime cleanup. Rendering, mouse/gamepad input and joined-server ability/effect actions need a client |
| [Templates](/kiln/wiki/dev-kit#templates), loot and recipes | block-first templates, standalone loot tables, creature drops and recipes at game stations pass build/lint and dedicated-server checks. Visible tooltips, menus and drops need a client |
| [Inventory transfers](/kiln/wiki/inventory) | state-preserving moves, container names, quick-stack/move-all rules and reports. Player slots, R-key/station behaviour and the shroudlink client addon need a client. Gear entity data is session-only; no persistent per-item payload or affix API |
| [World programs](/kiln/wiki/world-programs) | boot declarations in `kiln.programs.json`, `OnLoad` callback binding, declared other-entity writes and multiple event inputs; eight reload checks completed without failures or leaked contexts. Worker callbacks remain separate from tick-thread services; client-world programs are unsupported and replication needs a client |
| [World progress](/kiln/wiki/world-progress#changing-the-flame-level-dev20) | verified-result flame-level writes and limits readback, including stored/replicated state and restoration. The game's UI, fog and placement limits need a client |
| [EMF](/kiln/wiki/emf-mods#dev20-support) | EMF 0.6.0 / API v27: 77 full, 13 partial and no missing C slots. Official `#!emf1` networking, radial wheels, right-click events, attributes and program/spawn work are implemented. Server/host checks and offline Windows portrait archive/cache checks pass; custom/in-game portraits and hosted/joined gameplay remain unverified |
| [ShroudForge](/kiln/wiki/eml-shroudforge#dev20-pairing-with-emf) | bundled reader/publication/recovery fixes. Two mixed server boots with Lua 1.19, Beastmaster 1.13 and optional bear/beasts assets succeeded and reused identical cached output. Those earlier boots do not prove every mod pairing or the final recovery guard in a joined game |
| [SET](/kiln/wiki/more-frameworks#set) | level/flame administration, English names/text catalogs and more tool windows. The final assembled server probe passes 39/0, including event payload observation and flame restoration. Window drawing/input remains untested; game options, `Admin.send`, ImGui Debug and SET's `settings.ini` editor remain unavailable |
| [Nexus integration](/kiln/wiki/install#mods-from-nexus-mods) | **Disabled in this official build:** no Catalog, Nexus account/settings or `nxm://` handler on desktop or Deck. Download archives in a browser and import them manually. A future enabled build requires approved OAuth configuration and real-provider proof; there is no personal-key fallback |

Source/host tests and dedicated-server tests validate registration, refusals, save state and cleanup. They do not draw UI,
press keys, animate a lid or establish real-provider OAuth success. The feature pages keep those boundaries explicit.

## New in 0.2.0-dev.19

Historical release notes. The current dev.20 features and limits are listed above.

- **Frame rate fixed.** 0.2.0-dev.18 could drop the game to about 10 fps whenever a profile was active. The SET
  support checked every loaded game file on every frame; now only when a new file loads.
- **Updates install new parts.** Updating skipped parts that are new or became default, such as the EMF, EML,
  ShroudForge and Enshwick support. Only parts you turned off stay off. After a dev.18 update, the launcher's Runtime
  page shows missing parts and lets you add them.

## New in 0.2.0-dev.18

- **Mods for other frameworks.** Kiln runs mods made for EML, ShroudForge, EMF (up to 0.5.1), SET, Greeneye Loader,
  Creative Mode's Flame, Shroudtopia, Enshwick and shroudlink, unchanged, without installing those frameworks. EML,
  ShroudForge and EMF support are installed by default, and Kiln ships Enshwick's own loader. The launcher's Library
  imports mods of every framework. Ember mods are found and listed, but don't run until Ember publishes its loader.
  [Mods for other frameworks](/kiln/wiki/other-mods)
- **Server pack:** `kiln-server-<version>.zip`, one zip for rented servers and Windows PCs, now with the server parts
  for EML, ShroudForge and EMF. [Dedicated servers](/kiln/wiki/dedicated-servers)

## Mods for other frameworks

| Framework | Status |
|---|---|
| [EML](/kiln/wiki/eml-shroudforge#eml-mods) | game test pending. Mods patch the game data on test servers; a broken mod is switched off instead of stopping the game |
| [ShroudForge](/kiln/wiki/eml-shroudforge#shroudforge-mods) | game test pending. Kiln's bundled copy and a player's own copy both run mods on test servers, with live settings |
| [EMF](/kiln/wiki/emf-mods) | EMF 0.6.0 / API v27, 77 full and 13 partial C slots. Client-world programs/events remain unsupported; player-facing rendering/input and joined-game checks remain open. The older clock mod was seen in game |
| [SET](/kiln/wiki/more-frameworks#set) | server probe 39/0; game options, `Admin.send`, ImGui Debug and the `settings.ini` editor remain unavailable. Kiln tool-window drawing/input needs a client |
| [Greeneye Loader](/kiln/wiki/more-frameworks#greeneye-loader) | game test pending. The whole API, tested on Linux under Wine |
| [Creative Mode (Flame)](/kiln/wiki/more-frameworks#creative-mode-flame) | game test pending. Started on a test server |
| [Shroudtopia](/kiln/wiki/more-frameworks#shroudtopia) | game test pending. The whole API; Shroudweave's mods untried |
| [Enshwick](/kiln/wiki/more-frameworks#enshwick) | game test pending. Enshwick's own loader, shipped with Kiln; its mods ran on a test server |
| [shroudlink](/kiln/wiki/more-frameworks#shroudlink) | works on a test server (shroudlink's self-test). With players joined: pending |
| [Ember](/kiln/wiki/more-frameworks#ember) | not running: waiting for Ember's loader |
| Stand-alone `dinput8.dll` mods | works: loaded next to Kiln |

## New in 0.2.0-dev.17

- **Steam Deck:** the game no longer hangs on a white window when it starts with Kiln. Kiln's in-game overlay hooked
  the graphics a second time over its own hooks, and the game never got its window. Checked on a desktop PC (the Kiln
  menu opens as before); not yet on a Steam Deck. If you set `KILN_UI_DISABLE=1` as a workaround, take it out again.

## New in 0.2.0-dev.16

Nothing below has been seen in the game yet. The new features are listed under
[Built, game test pending](#built-game-test-pending) with what they were tested on.

- **Historical Nexus integration:** dev.16 introduced the Catalog and optional Mod Manager Download links. These are
  disabled in the current dev.20 build; use [manual archive import](/kiln/wiki/install#mods-from-nexus-mods).
- **"No Kiln"** in the launcher when Steam starts the game without Kiln, with what to do, instead of "Starting" forever.
  Some recent Valve Proton builds load Kiln without the launch option. [Install](/kiln/wiki/install#no-kiln-kiln-is-not-loading)
- **Steam Deck mode:** focus no longer gets lost after dialogs or on disabled buttons, B always closes a dialog, holding
  to uninstall stops when you let go, and long text scrolls.
- **Safer drops:** dropped mods and archives are checked more carefully (no files outside the mod, size and depth
  limits), and every modpack you drop asks before it installs.
- **Fixes from a full code review:** creative mode presets you edited are no longer overwritten, the Shroud floor drain
  can't kill in slow frames, gliding respects its speed cap, and many smaller fixes.
- **For mod authors:** [drawing on screen and in the world](/kiln/wiki/drawing);
  [creature AI and behaviour](/kiln/wiki/creature-ai); [retargeted animations](/kiln/wiki/models#animations-from-another-rig);
  [particle shaders and material reskins](/kiln/wiki/shaders), working again, now checked and linked by Kiln;
  [blocks](/kiln/wiki/blocks): PNG icons for statuses and perks, every kind of tool, piercing projectiles, props with
  your own model, sound blocks, a VFX on an item or a placed thing, spawn shapes, streaks and play parameters for VFX.

## Works

| Area | Notes |
|---|---|
| C# mods, dependencies, load order, hot reload | servers and client |
| [Events](/kiln/wiki/events): one bus, about 110 event types | servers and client. Player state and action events seen in the game |
| Configs, commands, permissions, saved data | |
| Data packs, new items and recipes, placeholders | |
| Game data and clones | a cloned perk's buff on hit: seen joined, with the mod. Kiln players without the mod: open |
| [Building blocks](/kiln/wiki/blocks): spells, wands, deliveries, effects, statuses, perks, abilities, talents, player triggers | seen in the game: Frostbolt's tooltip and recipe, Frost Edge's status on hit, abilities on a key, in chat and from an item, homing bolts, Updraft while gliding, mana while sitting, eating stopped in a fight, talents kept after a rejoin |
| [Item blocks](/kiln/wiki/blocks#items-and-weapons): materials, potions, food, arrows, tools, water containers, weapons, armour, stations, recipes, loot | seen in the game: nine weapon classes with matching tooltips, potions, a food's status for its full time, a bench that places and opens its menu; a server restart keeps it all |
| [Creature and NPC blocks](/kiln/wiki/blocks#creatures-and-npcs): game bodies with a new mind, rules, attacks, spawns; NPCs on game bodies | seen in the game: rules in real combat (a burst below half health, a rally heal), an attack override, the AI switched off and on, an NPC with his menu and journal entry |
| [World blocks](/kiln/wiki/blocks#world-blocks): props, stations with their own recipes, furniture, building materials and shapes | seen in the game: a station placed as its own object, a bench's "Pray" prompt |
| [VFX and particles](/kiln/wiki/blocks#vfx) | seen in the game: Kiln-built particle bursts with a light, the game's VFX by name, a flame that stays on the hand, many plays without a hitch |
| Screen effects | seen in the game: flash, fade to black, a cold tint under the menu, a status's screen effect, eight at once |
| Materials | load in the game and stay after a restart. How they look: open. Reskins: see below |
| Creature variants, AI tweaks, orders, guards | seen in the game: an elite Vukah, a Vukah on your side, a guard that follows and defends you |
| Key-bound abilities, per-cast spell changes | |
| Icons, retextures, weapon models | |
| World edits and schematics | seen by players without Kiln |
| Levels, experience, skill points, skill unlocks | seen by players without Kiln |
| [Talents](/kiln/wiki/talents) | game tree and Kiln trees: unlock, refund, rejoin, joined servers; unlocks kept when a mod moves a node; German labels. A Kiln tree's respec: not reported |
| [Quests and dialogue](/kiln/wiki/quests) | the game's journal, NPC menu, markers, voice, hosted and joined; one NPC per hosted world; no replayed notifications on a join. Party scope with two players: open |
| [Friendly NPCs](/kiln/wiki/npcs) | directory, trades, hand-ins, whistle, bed, follow, stay |
| [Sounds and voice](/kiln/wiki/sounds) | heard in game. Server sounds on a joined player: open |
| [Who can join](/kiln/wiki/multiplayer#who-can-join) | seen in the game: players without Kiln refused by servers whose mods they need, a Kiln player without a required mod refused with a message, modSync off letting players without Kiln in without Kiln-only things |
| [Player rules and creative mode](/kiln/wiki/player-rules) | `/creative` seen in the game: flying and building outside bases, the Shroud timer frozen, gliding. The plane-style glide: not flown yet |
| [World progress](/kiln/wiki/world-progress) | flame level, difficulty, spires, shrines, Shroud Roots, bosses, chests and a character's quests, with events. Flame-level writes and restoration also pass server checks; client UI/fog/placement effects remain open |
| Water in containers | seen in the game: a larger watering can from a mod |
| [Per-character progress](/kiln/wiki/multiplayer#per-character-progress) | talents follow the character; quests stay with the world |
| Game UI: menus, screens, crafting tabs, HUD, keys, gamepad | |
| Content and config sync to Kiln players | |
| Kiln DLL mods and stand-alone `dinput8.dll` mods | |
| [EMF mods](/kiln/wiki/emf-mods) | older mods and current Lua/Beastmaster paths on test servers; the older clock mod seen in game. Current API v27 limits: [above](#mods-for-other-frameworks) |
| The launcher: install, profiles, library, saves, save editor | Linux and Windows. Windows: checked on a Windows PC by a tester |
| Simpler first run | finds the game, installs Kiln, makes a "My mods" profile; drop a mod on the window to add it |
| Linux builds | glibc 2.35 or newer: Steam Deck (SteamOS), Ubuntu 22.04 and later |
| Nexus Mods build | no self-update: updates come from the Nexus page |
| Servers: install, run, console, backups, modpacks, admin pages | Linux and Windows. Windows dedicated servers checked end to end on a Windows PC by a tester: import, install Kiln, start, join, admin pages |
| Dev kit: `kiln`, templates, linter, analyzers, VS Code, debugger, catalogs, tests | debugger: dedicated servers on Linux and Wine |

## Open in the game

Seen failing in the game in the 6 November sessions. Some have had fixes since; each needs a new game test.

- A second status on a weapon's hit (Ember Edge's burn) showed as the first one (Chilled), in a hosted world.
- Stations with their own recipes: the menu's title and list, cycle times and the default recipe.
- A stool's stamina on sitting.
- One VFX material drew magenta; a coloured explosion showed magenta for its first frame.
- A terrain command that paints ore changed nothing.
- Hosting a world with the surface and cosmetic samples crashed the game.
- A creature's sight range set by a mod; a speed and damage override crashed a test server.
- Stopping a narration.
- Canceling an equip from an event: the item was equipped anyway.
- A creature spawned right after a hot reload that adds it reached a player before its definition.

## Awaiting a client retest

Fixed and passing on a test server since the last game test.

| Area | Fix |
|---|---|
| NPCs | the Survivors list takes its row and text from the NPC, not its tool |

## Built, game test pending

These pass offline or on a test server. What's missing is a player looking at them in the game.

| Area | Not yet |
|---|---|
| [Drawing on screen and in the world](/kiln/wiki/drawing) | new. Passes its tests (projection, budget, dispatch); not yet seen in the game |
| [Creature AI and behaviour](/kiln/wiki/creature-ai) | new. Tested on a lab server: creatures find, ignore and hunt each other, rules summon, cast and heal. Not yet watched in the game |
| [Retargeted animations](/kiln/wiki/models#animations-from-another-rig) | new. Tested offline and on a lab server; not yet seen drawn in the game |
| [Particle shaders](/kiln/wiki/shaders) | new. Tested on the CPU and a real GPU with hostile hooks, and on a lab server; not yet seen in the game |
| [Material reskins](/kiln/wiki/shaders#reskinning-a-game-material) | new. Tested on a lab server: served, taken off at unload, handed to the next mod; not yet seen in the game |
| [New blocks](/kiln/wiki/blocks): status and perk icons, tools, piercing, props with your own model, sound blocks, a VFX on a look | new. Tested on a lab server; not yet seen in the game |
| [VFX](/kiln/wiki/blocks#vfx) spawn shapes, streaks and play parameters | new. Tested in Kiln's VFX tests and on a real GPU; not yet seen in the game |
| ["No Kiln"](/kiln/wiki/install#no-kiln-kiln-is-not-loading) in the launcher | new. Checked in the launcher's tests; not yet on a real Steam Deck |
| Some blocks in play | a Frostbolt's area damage, a wand's attacks, armour's worn look, frost VFX on hits |
| Cosmetics with models of their own | not seen in the game |
| [Skinned models and animations](/kiln/wiki/models#skinned-models-and-animations) cooked from glTF | a test server's animation engine plays them on their curves; a creature with its own body not yet confirmed in the game |
| Steam Deck mode in the launcher | tested in emulation; not on a Deck yet |
| A remote server with server mods | local test servers so far |
| [Mods for other frameworks](/kiln/wiki/other-mods) | new. EML, ShroudForge, Greeneye, Creative Mode, Shroudtopia, Enshwick and shroudlink: tested on test servers and in Kiln's own tests; not yet seen in a player's game |
| [The server pack](/kiln/wiki/dedicated-servers#the-server-pack) | new. Holds the same files `kilnctl` installs; not yet tried on a rented host |

## Being built

Work in progress now. Not in a release yet.

- **Animations and skinned models in the game**: creatures and worn armour of your own, seen drawn by a player. Foot IK
  after a retarget.
- **A creature mind written in C#**, opt-in per creature, beyond the AI fields and rules above.
- **Surface shaders** for models: transparent ones next, then opaque.

## Partly built

- [Impact programs](/kiln/wiki/impact): a heal-over-time buff, and a changed projectile with a player, are open.
  Blocks write their programs for you, so most mods don't need this.
- [3D models](/kiln/wiki/models): rigid weapons work in game. Skinned models, worn looks and animations cook and run on
  a test server; not yet confirmed in the game.

## Not planned

- Ragdolls. The engine has no path for them; a creature plays a death animation instead.
