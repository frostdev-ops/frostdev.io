---
title: "What works today"
description: "What Kiln does in the current build, what awaits a game test, what's being built and what isn't, as of November 2026."
updated: "2026-11-07"
---

Kiln is in early access: dev builds on [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301),
[GitHub](https://github.com/frostdev-ops/kiln/releases) and [this site](/kiln#download). This page describes 0.2.0-dev.15.

"Works" means it has run on a test server or in the game. "Seen in the game" means a player saw it in Enshrouded, in the
test sessions of 6 and 7 November 2026. Where only a game can show the result, it's under
[Built, game test pending](#built-game-test-pending) until a player has seen it. Things that failed in those sessions are
listed under [Open in the game](#open-in-the-game); some have had fixes since that still need a game test.

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
| Materials | load in the game and stay after a restart. How they look: open |
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
| [World progress](/kiln/wiki/world-progress) | flame level, difficulty, spires, shrines, Shroud Roots, bosses, chests, a character's quests, with events. Read only. Test servers |
| Water in containers | seen in the game: a larger watering can from a mod |
| [Per-character progress](/kiln/wiki/multiplayer#per-character-progress) | talents follow the character; quests stay with the world |
| Game UI: menus, screens, crafting tabs, HUD, keys, gamepad | |
| Content and config sync to Kiln players | |
| EMF mods and DLL mods | |
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
| Some blocks in play | a Frostbolt's area damage, a wand's attacks, armour's worn look, frost VFX on hits |
| Cosmetics with models of their own | not seen in the game |
| [Skinned models and animations](/kiln/wiki/models#skinned-models-and-animations) cooked from glTF | a test server's animation engine plays them on their curves; a creature with its own body not yet confirmed in the game |
| Steam Deck mode in the launcher | tested in emulation; not on a Deck yet |
| A remote server with server mods | local test servers so far |

## Being built

Work in progress now. Not in a release yet.

- **Gaps in building blocks**, such as a look that carries a VFX.
- **Animations and skinned models in the game**: creatures and worn armour of your own.
- **NPC AI and behaviour blocks**: your own targeting and a creature mind written in C#.
- **VFX, materials and custom shaders** beyond what's above.
- **Render events** for mods.
- **An online mod catalog** in the launcher. Today mods come from files and server modpacks.

## Partly built

- [Impact programs](/kiln/wiki/impact): a heal-over-time buff, and a changed projectile with a player, are open.
  Blocks write their programs for you, so most mods don't need this.
- [3D models](/kiln/wiki/models): rigid weapons work in game. Skinned models, worn looks and animations cook and run on
  a test server; not yet confirmed in the game.

## Not planned

- Ragdolls. The engine has no path for them; a creature plays a death animation instead.
