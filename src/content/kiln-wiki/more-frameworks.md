---
title: "Greeneye, Enshwick, SET and more"
nav: "More frameworks"
description: "How Kiln runs mods for SET, Greeneye Loader, Creative Mode's Flame, Shroudtopia, Enshwick, shroudlink and Ember."
status: "pending"
updated: "2026-11-17"
---

Kiln has a part for each of these frameworks. All of them come with Kiln, so you don't install the framework. Each
part steps aside when the framework's own loader runs, so a mod never runs twice. Since dev.22 the launcher also copies
your profile's mods into the folder that loader reads
([details](/kiln/wiki/other-mods#your-other-loader-is-installed-too)). New in 0.2.0-dev.18: unless a section
says otherwise, they ran in Kiln's tests and on test servers, and no player has checked them in the game yet.

The launcher imports mods of all of them: drop a mod on the window and it is in the list on **Play**, switched on, with
its framework next to its name ([what it accepts](/kiln/wiki/other-mods#adding-mods-in-the-launcher)). Or put the mod in
the folder named below, inside the game folder, and switch that framework's drop-in on (the profile's **Folders and
notes**). The list on Play shows those mods too, marked **Game folder**, and whether they load
([Profiles and mods](/kiln/wiki/profiles#in-the-game-folder)). Since dev.24 files a mod wrote into its folder in the
game (settings, logs, saved values) are carried to the new version at an update, and kept in `kiln/kept-mod-files` when
the mod is switched off or Kiln is uninstalled.

## SET

Lua mods for Shrouded Engine Tweaks (SET 0.1.1).

- **Folder:** `shrouded_engine_tweaks/mods/<mod>/` with its `init.lua`.
- **You don't need** SET's `powrprof.dll`.
- **Where it runs:** SET itself only runs in a world you host. On Kiln, SET mods also run on a dedicated server. Their
  windows, drawing and keys only work in the game.
- **Console:** SET's console is part of its overlay. On Kiln, write Lua lines into a file
  `kiln/control/set/<name>.lua`. Kiln runs them at the next game step, writes the output to `kiln.log`, and deletes
  the file.
- **Limits:** Kiln runs SET mods with time limits and keeps each mod to its own folder. Only sprint-stamina and
  fall-damage systems can be switched off.
- **SET installed too:** if any other tool's `powrprof.dll` is loaded (SET's own, Enshwick's, Shared XP), Kiln's SET
  part stays off. The other way round, since 0.2.0-dev.29.4: a mod Kiln would place in the game folder as
  `powrprof.dll` (a plugin loader) is left out while SET's own `powrprof.dll` is there, and Kiln says so
  ([Mods that run from the game folder](/kiln/wiki/other-mods#mods-that-run-from-the-game-folder)).

**In dev.20:** `Admin.setLevel`, `Admin.setFlameLevel`, English item names and `Res.text` lookups are available.
General English localization tags need a locally generated client text catalog; a server without it returns nil.
Kiln.DevTools supplies Bindings, Resources, Hooks, Game Log, Status and Console views. These are Kiln views: Bindings shows
Kiln key bindings, Hooks shows Kiln hook statistics; SET's private Lua binding registry and full capture diagnostics are
not reproduced. Drawing/input still needs a client. `GameOptions.*`, `Admin.send`, ImGui Debug and SET's `settings.ini`
editor remain unavailable.

The final assembled dev.20 dedicated-server probe passed **39 checks, no failures**: names/texts, hooks, a registered
`DebugEnemyProjectileEvent` posted and observed with its payload, and flame levels changed 3 → 4 → 20 → 3 with restoration.
This supersedes the earlier 37/2 record from before the integrated event fixes. It does not establish client windows,
physical input, fog or placement limits. Status: partial for the remaining API differences and client checks above.

**In dev.21:** SET no longer re-reads a catalog without texts every 60 s, and handles non-ASCII Windows paths. SET mod
placement no longer refuses a game folder because `/home` is a link to `/var/home` (Fedora Atomic, Bazzite).

**In dev.24:** SET 0.2 mods: rules, saved settings and the tools windows. Under Proton the check for a second SET
runtime could fail and leave SET's tools out. SET's tools were seen in a real game (Linux, Proton).

**In dev.22:** SET mods load again when C# mods are on. Kiln's SET part took Kiln's own in-game mod list for SET's
runtime and stood aside. With a Cyrillic, Chinese or accented Windows user name or game folder, SET mods did not load;
that is fixed too. Neither fix has run on a Windows PC.

## Greeneye Loader

Client mods for Greeneye Loader 1.2.2: The Worst Map Mod, Find, Quick Deposit, Town Portals, Embervale Teleport,
Hollow Halls Progression.

- **Folder:** `greeneye/<mod>/` with its `mod.json` and DLL. Settings stay in the mod's own folder, as before. Since
  dev.24 a Greeneye mod added in the launcher runs from its own folder in the game too, where it keeps its settings.
- **You don't need** Greeneye's `dbgcore.dll`.
- **Linux and Steam Deck:** Greeneye Loader doesn't start under Wine or Proton. Kiln runs its mods there.
- **Mod authors:** Greeneye's hot reload works the same way.
- Greeneye's whole API is there. Its log file `kiln/logs/greeneye-loader.log` is kept for bug reports.
- **The Worst Map Mod** patches the game's code in place. Up to 0.2.0-dev.27 that switched off several of Kiln's
  features, so Kiln mods next to it did nothing; since 0.2.0-dev.28 they keep working
  ([Mods that patch the game's code](/kiln/wiki/other-mods#closed-source-dll-mods)).
- **Quick Deposit's keys** (G G, K) work under Kiln since 0.2.0-dev.29.3. Greeneye mods now find their game functions in
  the game's original code, read from the game's exe, so another loader's hook over a function no longer hides it from
  them; when the exe can't be read, Kiln looks in the live code as before. kiln.log has one line per Quick Deposit start
  that says whether both of its hooks were found.
- **Mods start when a game thread can't be opened** (0.2.0-dev.29.11). On some PCs (security software is the usual
  source of such threads) Kiln wrote no Greeneye hooks at all, so The Worst Map Mod and Continue never started and the
  start took about a minute of retries. Kiln now does as Greeneye Loader does: such threads don't hold the hooks back,
  and kiln.log names them.

Status: untested in game.

## Creative Mode (Flame)

Creative Mode (Nexus mod 146) brings its own small loader, Flame. Kiln starts Creative Mode without it.

- **Folder:** `mods/creative/`, from Creative Mode's download. You don't need its `dinput8.dll`; if you install it,
  Kiln keeps it and lets it run the mod instead.
- You can add Creative Mode in the launcher too. Since dev.24 Kiln runs it from the game's `mods` folder
  (`mods/<id>/`), where it reads its own files. What it writes there stays across updates and goes to
  `kiln/kept-mod-files` when it is switched off, removed or Kiln is uninstalled; the next time it is placed, those files
  come back.
- When Creative Mode has no data for the current game build, Kiln's own `/creative` stays available and says why.
- Creative Mode changes building cost, flight and time of day, like Kiln's own creative mode. Use one or the other.
  While it runs, Kiln's [NoClip](/kiln/wiki/player-rules#noclip) doesn't work: Creative Mode flies the character itself.
- Its server version hasn't been tried.
- Creative Mode 3.2.0 patches the game's code in place. Up to 0.2.0-dev.27 that switched off up to 22 of Kiln's
  features (moving items, chat, mod screens, player rules), so Kiln mods next to it did nothing. Since 0.2.0-dev.28
  they keep working ([Mods that patch the game's code](/kiln/wiki/other-mods#closed-source-dll-mods)).

Status: untested in game. Creative Mode 3.2.0 started on a test server.

## Shroudtopia

Mods for Shroudtopia 0.1.1 and its Enshrouded 1.0 release: minimaps, first-person view, flight, small tweaks.

- **Folder:** `mods/<mod>.dll`, or `mods/<mod>/` with its `mod.json` and DLL.
- **You don't need** Shroudtopia's `winmm.dll` or `shroudtopia.dll`.
- **Settings:** `kiln/config/shroudtopia/shroudtopia.json`, in Shroudtopia's own format. The first start copies your old
  `shroudtopia.json`. Set a mod's `active` to switch it on or off while you play. The launcher edits it too.
- Shroudweave's mods (Minimap and Weather Clock) use the same format as far as we know, but haven't been tried.
- **Hooks (dev.21):** a mod's `CreateDetour` on the game exe is a link in Kiln's [hook registry](/kiln/wiki/hooks), owned
  by `shroudtopia:<mod>`. Shroudtopia and EMF mod hooks on one function run newest first, before Kiln's own links, as
  layered hooks did before. Hooks outside the game exe still use plain safetyhook.
- **A mod that is only a DLL** is switched on since 0.2.0-dev.29. Such a mod stayed off for good although your profile
  had it on, because nothing wrote its entry in Shroudtopia's settings; Kiln now writes it at the mod's first start. A mod
  you switched off there yourself stays off, and Kiln's in-game list says where an off Shroudtopia mod is switched off.
- **A mod that never reports itself active** shows as "activating" with the reason (the mod may not support this game
  version), instead of "inactive" with an `Activating:` line in kiln.log twice a second. Kiln calls its `Activate` on
  every update, as Shroudtopia's own loader does, and says so once.
- **EML mods with a Shroudtopia module** (Skill Search, the In Game Ping System): since 0.2.0-dev.29.13 Kiln loads the
  module of such an EML mod when the mod is on, without Shroudtopia's drop-in
  ([EML mods with a Shroudtopia module](/kiln/wiki/eml-shroudforge#eml-mods-with-a-shroudtopia-module)).
- **Item Skill Descriptions next to Auto Doors** work side by side since 0.2.0-dev.29.6
  ([details](/kiln/wiki/other-mods#auto-doors-item-skill-descriptions-and-shroudlink)).
- Since 0.2.0-dev.29.16 Kiln's Shroudtopia part no longer reads mod DLLs again every half second.

Status: untested in game.

## Enshwick

Enshwick mods of every kind: DLL mods, Luau mods (`main.luau`) and data packs (`pack.toml`), for Enshwick
1.0.0-alpha.14 (bundled since dev.23).

- **Folder:** `mods/<author.name>/`.
- **You don't need Enshwick.** Kiln ships Enshwick's own loader, built from Enshwick's source, and starts it. Every
  Enshwick feature is Enshwick's own code: settings per world, the Mods screen, the server console command, the join
  check.
- **Enshwick installed too:** your own copy wins. Kiln uses the loader in `mods/enshwick/` when it's there, and its own
  copy only when it isn't (setting `"loader": "auto"` in `kiln/config/kiln-enshwick.json`). If Enshwick's
  `powrprof.dll` starts by itself, Kiln starts nothing, and since dev.22 it copies new profile mods into `mods/` for it.
  Enshwick's loader may see a mod that was copied while it was already running only from the next start.
- **Linux and Steam Deck:** you don't need the `WINEDLLOVERRIDES=powrprof=n,b` launch option.
- **Join check:** Enshwick's own. A server records its mods, and a player with a different version of a mod that has a
  join check can't join.
- To switch off an Enshwick mod you installed by hand, move it out of `mods/` (Enshwick's own rule). Mods you added in
  the launcher switch off with their switch in the list on Play.
- **Data packs** written like Enshwick's own examples (`authors = ["You"]`, `exports = [...]`, `[[setting]]`,
  `[[point]]` in `pack.toml`) import since dev.24; before, they were refused as "its pack.toml is invalid".
- **On the client Kiln is first.** Enshwick no longer hooks a function another program hooked first, so a feature of
  Enshwick that needs such a function may be off, and its log then names a Kiln DLL. Read from Enshwick's source; not
  measured in a game.
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
  Install Kiln in the game and it keeps the addon and loads it. Drop the addon on the launcher (alone, or in shroudlink's
  singleplayer package) and it is added as a mod of its own, loaded with your profile. Before dev.22 the launcher took
  it for a loader Kiln doesn't need and left it out, so the tab never appeared. You still don't need shroudlink's core:
  Kiln runs it.
- **shroudlink's own core installed:** it reads only flat DLLs in `shroudlink_mods/`, not Kiln's layout. While it runs,
  the profile's shroudlink mods don't load through Kiln, and the state file and the launcher's engine row say so.
- **Moving from shroudlink's own setup:** stop the server, delete `steam_api64.dll`, rename `steam_api64_o.dll` back to
  `steam_api64.dll` (or verify the files in Steam), keep `shroudlink_mods/`, install Kiln.

- **Mods on without the addon** (0.2.0-dev.29). When your profile switches shroudlink mods on in a player's game but
  doesn't load the client addon, the launcher's mod list says the mods still run and that the in-game MODS tab needs the
  addon, and offers to switch the addon on when it is in the Library. A support report names it too.
- **Singleplayer: an old `shroudlink_core.dll` in the game folder** (0.2.0-dev.29.4). If a core from an earlier hand
  installation is still there, the client addon starts it, and your profile's shroudlink mods (Expeditions, Assistants)
  don't load ("no mods on this server"). The launcher, kiln.log and support reports name the file Kiln found: remove
  `shroudlink_core.dll` from the game folder, and Kiln runs the mods. Keep the addon on: it draws the MODS tab.
- **The K tab next to Auto Doors** works since 0.2.0-dev.29.3
  ([details](/kiln/wiki/other-mods#auto-doors-item-skill-descriptions-and-shroudlink)).

Status: works on a test server (shroudlink's own self-test passed). With players joined: untested. The MODS tab after
dropping the addon on the launcher: not seen in a real client yet.

## Ember

Ember is a mod kit for dedicated servers. It hasn't published its loader yet, so there is nothing that could start its
mods.

- **Folder:** `ember/mods/<mod>/` in the server folder.
- Kiln finds Ember mods, lists them in the launcher and the log, and says they're waiting for Ember. It doesn't run them.
- When Ember releases its loader, Kiln plans to run Ember mods too.
- Not to be confused with the EML mod called "Ember" (Nexus mod 79): Kiln's EML part runs that one.

Status: not running yet.
