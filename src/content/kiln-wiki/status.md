---
title: "What works today"
description: "What Kiln does in the current build, what awaits a game test, what's being built and what isn't, as of November 2026."
updated: "2026-11-05"
---

Kiln isn't released yet. "Works" means it has run on a test server or in the game.

## Works

| Area | Notes |
|---|---|
| C# mods, dependencies, load order, hot reload | servers and client |
| Events, configs, commands, permissions, saved data | |
| Data packs, new items and recipes, placeholders | |
| Game data and clones | a cloned perk's buff on hit: seen joined, with the mod. Kiln players without the mod: open |
| Creature variants, AI tweaks, orders, guards | guards defending: open |
| Key-bound abilities, per-cast spell changes | |
| Icons, retextures, weapon models | |
| World edits and schematics | seen by players without Kiln |
| Levels, experience, skill points, skill unlocks | seen by players without Kiln |
| [Talents](/kiln/wiki/talents) | game tree and Kiln trees: unlock, refund, rejoin, joined servers. A Kiln tree's respec: not reported |
| [Quests and dialogue](/kiln/wiki/quests) | the game's journal, NPC menu, markers, voice, hosted and joined. Party scope with two players: open |
| [Friendly NPCs](/kiln/wiki/npcs) | directory, trades, hand-ins, whistle, bed, follow, stay |
| [Sounds and voice](/kiln/wiki/sounds) | heard in game. Server sounds on a joined player: open |
| [Per-character progress](/kiln/wiki/multiplayer#per-character-progress) | talents follow the character; quests stay with the world |
| Game UI: menus, screens, crafting tabs, HUD, keys, gamepad | |
| Content and config sync to Kiln players | |
| EMF mods and DLL mods | |
| The launcher: install, profiles, library, saves, save editor | Linux; Windows under Wine so far |
| Servers: install, run, console, backups, modpacks, admin pages | |
| Dev kit: `kiln`, templates, linter, analyzers, VS Code, debugger, catalogs, tests | debugger: dedicated servers on Linux and Wine |

## Awaiting a client retest

Fixed and passing on a test server since the last game test.

| Area | Fix |
|---|---|
| Talents | adding a mod keeps unlocks when nodes move between the game tree and the shadow table; German labels on a Kiln tree's screen |
| Quests | an NPC placed in a second hosted world of one session; done quests no longer notify after a world switch |
| NPCs | the Survivors list takes its row and text from the NPC, not its tool |

## Built, game test pending

These pass offline or on a test server.

| Area | Not yet |
|---|---|
| [Who can join](/kiln/wiki/multiplayer#who-can-join): holding and refusing clients without Kiln, refusing a Kiln client without a required mod, keeping a missing mod's entities from a client | a real client |
| A Windows PC | the launcher and servers, under Wine so far |
| A remote server with server mods | local test servers so far |

## Being built

Not available yet.

- **Building blocks:** typed `Blocks.Define` for spells, items and effects, and nested Body, Animation, AI and Behaviour blocks for
  fully custom NPCs.
- **A glTF animation converter.**
- **Skinned bodies.**
- **VFX, particles, materials and custom shaders.**

## Partly built

- [Impact programs](/kiln/wiki/impact): a heal-over-time buff, and a changed projectile with a player, are open.
- [3D models](/kiln/wiki/models): rigid weapons work. Worn armour and animations aren't built.

## Not yet

- Render events from mods.
- An online mod catalog: mods come from files and server modpacks.
