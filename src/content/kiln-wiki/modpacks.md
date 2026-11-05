---
title: "Join a modded server"
nav: "Join a modded server"
description: "What a modded server needs from your game, and how the launcher installs its modpack with your consent."
status: "works"
updated: "2026-11-05"
---

## What a server needs from you

| The mod needs | You need | Typical mods |
|---|---|---|
| nothing | nothing | server rules, chat commands, world edits, creature and loot changes |
| Kiln | Kiln: the server sends the rest | new items made from the game's own models |
| the mod | the mod itself | quests, NPCs, talents, new icons, models, sounds, keys and screens |

With Kiln you also get the server's item and recipe changes as you join, with nothing to install.

## Who gets in

> **Not yet in the real game.** The rules here pass on test servers. They haven't run with a real client.

- A game without Kiln is held before world data until the server decides. It's refused when a mod states it needs Kiln or a mod, unless
  the server's `modSync` is `off`.
- With Kiln, missing a mod that states `clients: "mod"` means you're refused by default and told which mods. A server with `modSync`
  set to `warn` or `off` lets you in, without that mod's entities.
- Playing vanilla with a character carrying Kiln items can crash on a server that lets you in, and may lose those items elsewhere.

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
3. adds the mods to your library and makes a profile named **Server: &lt;name&gt;**;
4. backs up your saves and activates the profile.

Press **Launch** and join again. Nothing downloads until you agree. Dismiss the banner and that server's pack won't be
offered again.

This flow has run in a real game, on a server with `modSync` set to `refuse`.

## Leaving a server

Synced items and settings are put back, and your own mod settings return.
