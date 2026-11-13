---
title: "Run a server"
nav: "Run a server"
description: "Install, update and run dedicated servers with Kiln, from the launcher or kilnctl on Linux."
status: "works"
updated: "2026-11-13"
---

> Rented server with only FTP, or a server without the launcher? See
> [Kiln on a dedicated server](/kiln/wiki/dedicated-servers). The launcher is on the
> [download page](/kiln/download); the [server pack](/kiln/download/server) and `kilnctl` are there too.

## Kinds of server

The launcher's **Servers** page runs four kinds:

| Kind | What it is |
|---|---|
| Linux (kilnctl) | installed with SteamCMD, runs under Wine with its own prefix |
| Steam | installed by the Steam client; started without Steam |
| Windows | on a Windows PC (tested under Wine so far) |
| Remote | a kilnctl server on another machine, over SSH |

Servers run without a window and keep running when you close the launcher.

<!-- shot: launcher-servers | The Servers page with a running server -->

## A new server

On Linux, **New server** installs the game files, writes the name and port, and sets up the Wine prefix. Then install Kiln
from **Overview**. **Import** adds a server folder you already have.

## The server pages

| Page | What you do |
|---|---|
| Overview | state, players, uptime; update the game, install or update Kiln |
| Settings | name, slots, port, difficulty, user groups, passwords, bans (while stopped) |
| Mods | see state, sync from your library, on or off. Mods for [other frameworks](/kiln/wiki/other-mods) go into the folders they're read from |
| Configs | mod settings, edited offline |
| Backups | make and restore; a running server restores at its next start |
| Console | live output, Kiln commands, log files |
| Modpack | build and publish the mods players need |
| Admin | live tools: [Admin pages](/kiln/wiki/admin-pages) |

Stopping saves first. A Steam server won't stop from the launcher while players are online.

## Modpacks for your players

On **Modpack**, build a zip of the mods players need (same mods, same file). It includes the other frameworks' mods
players need too, such as EML data mods. Upload it anywhere reachable over https and
enter the address. Joining players' launchers then offer it. See [Join a modded server](/kiln/wiki/modpacks).

## Who may join

> **Not yet in the real game.** The default refusal and the hold pass on test servers. They haven't run with a real client.

`modSync` in `kiln/config/network.json` sets what happens when a Kiln player's mods don't match:

| `modSync` | Result |
|---|---|
| not set (default) | a player missing a mod that states `clients: "mod"` is refused and told which. Other differences only warn |
| `warn` | everyone joins; differences are warnings |
| `off` | no check |
| `refuse` | players missing anything required are refused, with a list |

A player let in without a mod doesn't get that mod's entities. The check covers Kiln mods; mods for other frameworks
aren't compared yet.

A player without Kiln is held before any world data, at most `vanillaHoldSeconds` (default 5), until the server decides. They're
refused when:

- `"requireKiln": true`;
- a loaded mod states `clients: "kiln"` or `"mod"`, unless `modSync` is `off`;
- `modSync` is `refuse` and the server has required mods.

Otherwise they join, without entities of new templates. If nothing is at stake, nothing is held.

To keep a player out for good or for a while, Kiln has `/kick`, `/ban`, `/unban` and `/bans`, with a ban list of its own
next to the game's ([Kick and ban](/kiln/wiki/dedicated-servers#kick-and-ban)).

**Known limit:** a vanilla client carrying Kiln items can crash on a server that lets it in, and may lose those items elsewhere.

## Player progress

Talents [follow the character](/kiln/wiki/multiplayer#per-character-progress), from the client's copy. To keep your own copy per
character and refuse theirs, set `{"importProgress": false}` in `kiln/config/characters.json`.

## kilnctl (Linux)

```sh
kilnctl init myserver --dir ~/srv/myserver --port 15637
kilnctl install myserver      # game files via SteamCMD
kilnctl prefix myserver       # the Wine prefix
kilnctl deploy myserver       # install Kiln
kilnctl start myserver        # returns when the world is up
kilnctl status myserver
kilnctl stop myserver         # the game saves first
kilnctl backup myserver       # archive the save
kilnctl report myserver       # a zip to send when something fails
```

Keep it running: `systemctl --user enable --now kiln@myserver`.

`kilnctl update myserver` stops the server, backs it up, updates the game, checks Kiln's support and restarts. On a new
build Kiln's hooks and mods stay off until supported.
