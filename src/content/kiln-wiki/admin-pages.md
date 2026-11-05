---
title: "Admin pages"
description: "Live tools for a running server in the launcher: players, map, zones, world, creatures, game data, mods and more."
status: "works"
updated: "2026-11-04"
---

Open a running server and choose **Admin**. The launcher connects directly on the same machine (with a token only it can
read), or through an SSH tunnel. It reconnects after a restart. Kiln checks every change before it reaches the game.

<!-- shot: admin-map | The admin Map page with players and protection zones -->

| Page | What you can do |
|---|---|
| Players | who's online, rights, health; teleport, give items, heal, god mode, kill, inventory, message; level, XP, skill points |
| Map | live players, waypoints, graves, enemies and zones; teleport or protect an area |
| Zones | who may build, break, dig, loot, craft or interact in an area |
| Items | search; give to a player or drop in the world |
| Spawn | spawn creatures by a player or at a position; remove them |
| World | time, weather, broadcasts, live world settings |
| Combat | health, heal, damage, kill; recent deaths and killers |
| Creatures | find, inspect; change level, faction, size; orders (stay, attack, guard) |
| Game data | search spells, creatures, buffs, perks, skills; change or reset a value |
| Content | change or reset items and recipes; data packs and conflicts |
| Permissions | groups, rules, membership; why a player may or may not do something |
| Configs | every mod's settings, checked as you type |
| Mods | state, cost per tick, faults; test, reload, unload, load |
| Console | Kiln commands with completion and history; the server log |
| Saves | save now, back up, restore at the next start |
| Crashes | crash reports, newest first |

Content, Game data and Creatures changes are a layer over the game's values: **Reset** puts them back. World settings can
be made permanent from World.

In chat: `/level <player> [level]`, `/xp <player> <amount>`, `/skillpoints <player> [amount]`, `/skill <player> list`.
`/help` lists every command you may use.
