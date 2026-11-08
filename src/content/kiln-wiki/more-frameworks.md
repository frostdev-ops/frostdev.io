---
title: "Greeneye, Enshwick, SET and more"
nav: "More frameworks"
description: "How Kiln runs mods for SET, Greeneye Loader, Creative Mode's Flame, Shroudtopia, Enshwick, shroudlink and Ember."
status: "pending"
updated: "2026-11-07"
---

Kiln has a part for each of these frameworks. All of them come with Kiln, so you don't install the framework. Each
part steps aside when the framework's own loader runs, so a mod never runs twice. New in 0.2.0-dev.18: unless a section
says otherwise, they ran in Kiln's tests and on test servers, and no player has checked them in the game yet.

The launcher imports mods of all of them: drop a mod on the window and it goes on your profile's **Engines** tab. Or put
the mod in the folder named below, inside the game folder.

## SET

Lua mods for Shrouded Engine Tweaks (SET 0.1.1).

- **Folder:** `shrouded_engine_tweaks/mods/<mod>/` with its `init.lua`.
- **You don't need** SET's `powrprof.dll`.
- **Where it runs:** SET itself only runs in a world you host. On Kiln, SET mods also run on a dedicated server. Their
  windows, drawing and keys only work in the game.
- **Console:** SET's console is part of its overlay. On Kiln, write Lua lines into a file
  `kiln/control/set/<name>.lua`. Kiln runs them at the next game step, writes the output to `kiln.log`, and deletes
  the file.
- **Missing:** SET's game options, its text lookups, a few admin functions (`send`, `setLevel`, `setFlameLevel`), and
  its overlay windows except the Systems view. Only two game systems can be switched off (sprint stamina and fall
  damage).
- **Limits:** Kiln runs SET mods with time limits and keeps each mod to its own folder.
- **SET installed too:** if any other tool's `powrprof.dll` is loaded (SET's own, Enshwick's, Shared XP), Kiln's SET
  part stays off.

Status: partial. Tested on a test server and in Kiln's own tests; windows and drawing not yet seen in the game.

## Greeneye Loader

Client mods for Greeneye Loader 1.2.2: The Worst Map Mod, Find, Quick Deposit, Town Portals, Embervale Teleport,
Hollow Halls Progression.

- **Folder:** `greeneye/<mod>/` with its `mod.json` and DLL. Settings stay in the mod's own folder, as before.
- **You don't need** Greeneye's `dbgcore.dll`.
- **Linux and Steam Deck:** Greeneye Loader doesn't start under Wine or Proton. Kiln runs its mods there.
- **Mod authors:** Greeneye's hot reload works the same way.
- Greeneye's whole API is there. Its log file `kiln/logs/greeneye-loader.log` is kept for bug reports.

Status: untested in game.

## Creative Mode (Flame)

Creative Mode (Nexus mod 146) brings its own small loader, Flame. Kiln starts Creative Mode without it.

- **Folder:** `mods/creative/`, from Creative Mode's download. You don't need its `dinput8.dll`; if you install it,
  Kiln keeps it and lets it run the mod instead.
- A profile can hold Creative Mode too, from the launcher's library.
- Creative Mode changes building cost, flight and time of day, like Kiln's own creative mode. Use one or the other.
- Its server version hasn't been tried.

Status: untested in game. Creative Mode 3.2.0 started on a test server.

## Shroudtopia

Mods for Shroudtopia 0.1.1 and its Enshrouded 1.0 release: minimaps, first-person view, flight, small tweaks.

- **Folder:** `mods/<mod>.dll`, or `mods/<mod>/` with its `mod.json` and DLL.
- **You don't need** Shroudtopia's `winmm.dll` or `shroudtopia.dll`.
- **Settings:** `kiln/config/shroudtopia/shroudtopia.json`, in Shroudtopia's own format. The first start copies your old
  `shroudtopia.json`. Set a mod's `active` to switch it on or off while you play. The launcher edits it too.
- Shroudweave's mods (Minimap and Weather Clock) use the same format as far as we know, but haven't been tried.

Status: untested in game.

## Enshwick

Enshwick mods of every kind: DLL mods, Luau mods (`main.luau`) and data packs (`pack.toml`), for Enshwick
1.0.0-alpha.13.

- **Folder:** `mods/<author.name>/`.
- **You don't need Enshwick.** Kiln ships Enshwick's own loader, built from Enshwick's source, and starts it. Every
  Enshwick feature is Enshwick's own code: settings per world, the Mods screen, the server console command, the join
  check.
- **Enshwick installed too:** your own copy wins. Kiln uses the loader in `mods/enshwick/` when it's there, and its own
  copy only when it isn't (setting `"loader": "auto"` in `kiln/config/kiln-enshwick.json`). If Enshwick's
  `powrprof.dll` starts by itself, Kiln starts nothing.
- **Linux and Steam Deck:** you don't need the `WINEDLLOVERRIDES=powrprof=n,b` launch option.
- **Join check:** Enshwick's own. A server records its mods, and a player with a different version of a mod that has a
  join check can't join.
- To switch off an Enshwick mod you installed by hand, move it out of `mods/` (Enshwick's own rule). Mods from a
  launcher profile switch off in the profile.
- Without any Enshwick mod, the loader doesn't start at all.

Status: untested in game. On a test server Enshwick's DLL mods, a Luau mod and a data pack ran, next to Kiln's own
features.

## shroudlink

Server mods for shroudlink 0.8.0: chestsort, assistants, storage, meter, gemforge, and any mod built on shroudlink's
kit.

- **Folder:** `shroudlink_mods/<name>.dll` in the server folder.
- **You don't need** shroudlink's `steam_api64.dll`, so a Steam file check or game update no longer removes it.
- Kiln runs shroudlink's own server part, so mods behave as under shroudlink, hot reload included.
- shroudlink's EML data mods (bigger stacks, bigger chests) go to Kiln's EML part.
- **Players:** shroudlink's optional client addon (a `dinput8.dll`) adds the MODS tab, chest search and slot locks.
  Install Kiln in the game and it keeps the addon and loads it.
- **Moving from shroudlink's own setup:** stop the server, delete `steam_api64.dll`, rename `steam_api64_o.dll` back to
  `steam_api64.dll` (or verify the files in Steam), keep `shroudlink_mods/`, install Kiln.

Status: works on a test server (shroudlink's own self-test passed). With players joined: untested.

## Ember

Ember is a mod kit for dedicated servers. It hasn't published its loader yet, so there is nothing that could start its
mods.

- **Folder:** `ember/mods/<mod>/` in the server folder.
- Kiln finds Ember mods, lists them in the launcher and the log, and says they're waiting for Ember. It doesn't run them.
- When Ember releases its loader, Kiln plans to run Ember mods too.
- Not to be confused with the EML mod called "Ember" (Nexus mod 79): Kiln's EML part runs that one.

Status: not running yet.
