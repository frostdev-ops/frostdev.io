---
title: "Join a modded server"
nav: "Join a modded server"
description: "What a modded server needs from your game, and how the launcher installs its modpack with your consent."
status: "works"
updated: "2026-11-19"
---

## What a server needs from you

| The mod needs | You need | Typical mods |
|---|---|---|
| nothing | nothing | server rules, chat commands, world edits, creature and loot changes |
| Kiln | Kiln: the server sends the rest | new items made from the game's own models |
| the mod | the mod itself | quests, NPCs, talents, new icons, models, sounds, keys and screens |

With Kiln you also get the server's item and recipe changes as you join, with nothing to install.

Mods made for [other frameworks](/kiln/wiki/other-mods) count too. EML data mods (stacks, recipes, new items) must match
the server, or items can go missing. Kiln doesn't check those mods when you join yet, so ask the server which ones it
runs, or install its modpack.

## Who gets in

> **Not yet in the real game.** The rules here pass on test servers. They haven't run with a real client.

- A game without Kiln is held before world data until the server decides. It's refused when a mod states it needs Kiln or a mod, unless
  the server's `modSync` is `off`.
- With Kiln, missing a mod that states `clients: "mod"` means you're refused by default and told which mods. A server with `modSync`
  set to `warn` or `off` lets you in, without that mod's entities.
- Playing vanilla with a character carrying Kiln items can crash on a server that lets you in, and may lose those items elsewhere.
- **Update Kiln on both sides.** In 0.2.0-dev.29 every Kiln player who joined a world run by Kiln (a friend's hosted
  world or a dedicated server) was turned away after a few seconds ("Your Kiln handshake did not complete before
  admission timed out"). 0.2.0-dev.29.1 fixes that; the host or server and every player need it.
- **A mod switched off is not required** (0.2.0-dev.29.11). Kiln used to list a mod switched off in the host's or
  server's profile as one players need, so a game hosting its own world refused its own player and a server refused
  players without it. A mod a server skips because it is only for clients is still listed.

How Kiln's handshake and mod check work: [Kiln.Network](/kiln/wiki/network).

## When a server refuses you

You see a message listing the missing mods, then the game's own "An update of the game is available" error. The game
shows that for any refused login. The Kiln message says what's actually missing. Without Kiln you only get the game's error.

## Install the server's modpack

If the server offers a modpack, the **Play** page shows a banner after the refusal, with:

- the server, and the pack's name, version, size and checksum;
- the mods you're missing;
- whether it holds native code, with a warning that mods run code on your PC.

<!-- shot: modpack-banner | The modpack consent banner on the Play page -->

Tick the box and install. The launcher:

1. downloads the pack (https only, unless you allow http in Settings);
2. checks its checksum, and each mod's against what the server asked for;
3. adds the mods to your library and makes a profile named **Server: &lt;name&gt;**. A pack can hold mods for other
   frameworks too, such as EML data mods;
4. backs up your saves and loads the profile. Play names it at the top ("Profile: Server: &lt;name&gt;"); to go back
   to your own mods, load **My mods** in Settings, Profiles.

Press **Launch** and join again. Nothing downloads until you agree. Dismiss the banner and that server's pack won't be
offered again.

This flow has run in a real game, on a server with `modSync` set to `refuse`.

**ShroudForge mods and other engines' mods keep one hash** (0.2.0-dev.29.18). A server used to tell joining players a
hash of such a mod's whole folder, with its settings and the files the mod writes there, so it changed every minute: the
launcher never found the mod in a player's Library, and a modpack built from the server stopped matching a minute
later. A server now names Kiln's copy of a mod by its Library entry, and its modpack still carries the mods with the
owner's settings.

- **Players:** if the launcher refuses a server's modpack with "the modpack lacks what the server requires", update the
  Kiln launcher to 0.2.0-dev.29.18 or newer. If it is up to date, ask the server's owner to build the modpack again; the
  message says so too.
- **Server owners:** your modpack doesn't need building again for this update, but players need the updated launcher.

Joining a server never checked these mods, and still doesn't. Not yet seen in a real game.

## Leaving a server

Synced items and settings are put back, and your own mod settings return.
