---
title: "What works today"
description: "What Kiln does in the current build, what is on but not yet confirmed in a real game, what's being built and what isn't, as of November 2026."
updated: "2026-11-28"
---

Kiln is in early access: dev builds on [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301),
[GitHub](https://github.com/frostdev-ops/kiln/releases) and [this site](/kiln#download). The tables further down were last written in full for **0.2.0-dev.29.19** (mod API 0.2.11). What came after is summarised in [New in 0.2.0-dev.32](#new-in-020-dev32-beta-1) (the newest, a test build on the beta channel) and in the release notes and the [roadmap](/kiln/roadmap); check the download's version before using a new API.

"Works" means it has run on a test server or in the game. "Seen in the game" means a player saw it in Enshrouded, in the
test sessions of 6 and 7 November 2026, or, for dev.24 and later, in the one real game the release's notes name (Linux,
Proton, one client). Where only a game can show the result, it's under
[Built, game test pending](#built-game-test-pending) and, for dev.29,
[On, not yet confirmed in a real game](#on-not-yet-confirmed-in-a-real-game) until a player has seen it. Things that failed in those sessions are
listed under [Open in the game](#open-in-the-game); some have had fixes since that still need a game test.

## New in 0.2.0-dev.32 (beta 1)

Beta 1 is a **test build** (mod API 0.2.27): in the launcher's Settings, under Launcher updates, set **Channel** to the test builds to try it. It adds
pets, taming, NPC dialogue, twelve more registries with views and `Registries.Reauthor`, exact costs with receipts, gear rules written through
the registry, effect replay of ShroudForge and EML packages, and tools for the game's terrain tiles. Everything below ran on dedicated lab
servers with test peers and bots, in host tests and in Kiln's test suites; **nothing of dev.32 has been seen in a real game client yet.**

| Area | What it brings | Not yet seen in a real game |
|---|---|---|
| [Pets](/kiln/wiki/pets) | records per character, summon, follow, orders, going down instead of dying, revives with an exact cost, the owner's bar and markers | the bar, markers, animation, attack orders over 30 s, anchors at login, terrain |
| [Taming](/kiln/wiki/taming) | attempts in steps (feed, weaken, tool, the game's own), exact costs with receipts, refunds, a pet at the end; the game's wildlife taming read and watched | the natural bait flow, who tamed an animal, a client's progress, refunds |
| [NPC dialogue](/kiln/wiki/npc-dialogue) | greeting picks, farewells, the line when a menu opens, talk pages, per-player lines | the first menu before the host answers, a per-player budget, a farewell NPC |
| [The dev.32 registries](/kiln/wiki/new-registries) | creatures, arsenals, perks, skills, stations, buffs, abilities, world rules, difficulty bounds, limits, loot rules and tables; views over everything else (262 of 277 fields proven in a lab) | creature, arsenal and perk edits in play, a joined client's skill screen, buff and ability timing, altars above 16, gifting beyond 50 m, cleared no-build zones |
| [Loot odds and levels](/kiln/wiki/loot-rules) | `lootRules` and `randomLoot`, re-authored off the world tick in one turn | real loot rolls, a hot reload mid-pass, co-op or hosted worlds |
| [Gear rules](/kiln/wiki/data-packs#gear-numbers-and-gear-rules) | `gearRules` written through the registry, byte for byte as before | gear rules on a client, tooltips and durability in play, a join with a dev.31 peer |
| [Effect replay](/kiln/wiki/eml-shroudforge#when-a-game-update-breaks-a-package-effect-replay-020-dev32-beta-1) | opt-in replay of a ShroudForge or EML package's recorded effect after a game update | hosted ShroudForge's journal, a replay after a real update, a joined client |
| [Exact costs](/kiln/wiki/inventory#exact-costs-and-receipts) | one cost from one named slot, once, with a receipt | refunds in play |
| [Terrain tiles](/kiln/wiki/world-edits#the-games-own-terrain-tiles) | tools only: a tile codec, a checker, a lab pack; no mod API | a cooked tile on a client |
| NPC speech bubbles (31.16) | seen in a real game | (the menu parts above are new) |

**Limits.** The registries are experimental (`KILNX031`) and may change in any release. Pets walk beside their owner only where Kiln
has a measured clearance profile for the creature's body; otherwise they catch up. Only enemy creatures that walk can be pets.

## New in the 0.2.0-dev.29 patches

After 0.2.0-dev.29, Kiln shipped nineteen patches. Most fix how Kiln runs other loaders' mods; seven bring a new SDK
(29.11, 29.14, 29.15, 29.16, 29.17, 29.18 and 29.19), each additive: no public member was removed or changed. **29.15 to
29.19 are not yet checked in a real game** except 29.15's chest gems at the Shroud Forge and 29.16's chat history (both by
bisdat), 29.19's AMD FSR 4 running on an RX 9070 XT, and with 29.17 a player without Kiln joining a Kiln server whose mods need nothing of players: they passed
Kiln's tests and lab checks on a dedicated server, and what a game client draws was checked against the game's code or
in Kiln's preview renderer.

| Patch | What it brought; evidence |
|---|---|
| 29.1 | players with Kiln can join a world run by Kiln again ([update both sides](/kiln/wiki/multiplayer#who-can-join)) |
| 29.2 to 29.10 | other loaders' mods: XHL mods switched off stay off, Ultimate ASI Loader and `.asi` mods, plugin loaders that run from the game folder, Greeneye, Shroudlink, Auto Doors beside Item Skill Descriptions, CharosDX loader mods, Last adds ([Mods for other loaders](/kiln/wiki/other-mods)); autosaves no longer hitch on hard drives, one key press counts once, keys can be unbound ([Kiln in the game](/kiln/wiki/in-game#keys-in-kilns-menu)); support reports show where other mods changed the game's code ([Debugging](/kiln/wiki/debugging)) |
| 29.11 | [gems](/kiln/wiki/gems) (mod API 0.2.5): read gems, new gems with C# effects, forge actions from code, sockets on rings, armour and shields. [Kiln's line on the main menu](/kiln/wiki/in-game#the-line-on-the-main-menu). A mod switched off in a profile no longer locks players out. Gems seen in a hosted world (Linux, Proton); a dedicated server with a separate client not yet |
| 29.12, 29.13 | a game folder that is a link works, EMF API v46 (EMF 0.6.14), Kiln's windows take no stray clicks, Skill Search and the In Game Ping System work |
| 29.14 | [production stations and bases](/kiln/wiki/stations) (mod API 0.2.6): fill from Magic chests, stop, resume, select, collect, station events. Seen in a hosted world (Linux, Proton); a dedicated server with joined players not yet |
| 29.15 | (mod API 0.2.7) [item icons and names](/kiln/wiki/game-ui#item-icons-and-names), panels at production stations, [chest gems at the Shroud Forge](/kiln/wiki/gems#chest-gems-in-the-forges-gems-list) (GitHub #61), [new kinds of boot patches](/kiln/wiki/onboot#lists-and-template-components); Expeditions finds survivors again (EMF). Chest gems seen in a real game (bisdat, a hosted world on Linux under Proton, with the mod Gem Forge Magic Storage): the rows in the forge's GEMS list, socket, unsocket, upgrade paid from Magic chests, a refusal with nothing lost, recycle, withdrawn offers; two players at once, stale rows, cross-base permissions and a dedicated server with a joined player not yet. Everything else: lab checks only |
| 29.16 | (mod API 0.2.8) [the game's look for Kiln's menus](/kiln/wiki/in-game#the-look-of-kilns-menus) and [themes and fonts for mods](/kiln/wiki/ui-looks), [Kiln in your language](/kiln/wiki/languages), [chat history](/kiln/wiki/in-game#chat-history) by bisdat (tested in the game by bisdat), the launcher's icon on Linux taskbars, faster starts on hard drives, ShroudForge no longer rebuilding its asset mods at every start, Linux configs edited in the launcher kept. The rest is not yet seen in a real game |
| 29.17 | (mod API 0.2.9) [custom game folders](/kiln/wiki/install#custom-game-folders), started without Steam; [station outputs as stock](/kiln/wiki/stations#station-outputs-as-stock) for fills and players' crafts (GitHub #68, proposed by bisdat), and ordinary chests named on a fill; [resource patches that copy components, clear and replace lists](/kiln/wiki/onboot#lists-and-template-components) and [boot reads of any resource](/kiln/wiki/onboot#the-games-data-in-onboot); [other mods' slash commands](/kiln/wiki/in-game#other-mods-slash-commands) reach their mods; [no more stutters of about 2 seconds when hosting from a hard drive](/kiln/wiki/debugging#common-causes); `kilnctl tick-compare` (GitHub #57); [EMF's own answer for breaking blocks](/kiln/wiki/emf-mods#mods-built-for-emf-063-to-068), which Night Raids compares (GitHub #43); [one DLL as a Kiln native mod and an `.asi`](/kiln/wiki/other-mods#kiln-dll-mods). Lab checks on a dedicated server. A player without Kiln joining a Kiln dedicated server whose mods all say `"clients": "none"` was seen in a real game. Not yet seen in a real game: a Kiln player's crafting counts from station outputs, a craft paid from them in a hosted game, and custom game folders started directly |
| 29.18 | (mod API 0.2.10) [Kiln in Simplified Chinese](/kiln/wiki/languages), translated by XiaoHuLi666; [Kiln's graphics tools](/kiln/wiki/in-game#graphics): a frame cap, DLSS settings and a readout; [AMD FSR 4, FSR 3.1 or Intel XeSS behind the game's FSR 3 option](/kiln/wiki/in-game#behind-the-games-fsr-3), their files downloaded on demand after you agree to their licence; [Kiln's Discord in the launcher](/kiln/wiki/install#kilns-discord-in-the-launcher) (Send to Kiln support, your posts and their replies, Rich Presence), all optional; [Kiln's overlay next to OptiScaler](/kiln/wiki/in-game#kilns-overlay-next-to-other-tools), the game going on when the overlay can't draw, and an overlay switch in the launcher; [ShroudForge's startup pass going on without a failing mod](/kiln/wiki/eml-shroudforge#when-one-startup-mod-fails); [EMF's Lua mods from EMF's download](/kiln/wiki/emf-mods#install-a-mod); [ShroudForge mod settings on a Steam Deck in copy mode](/kiln/wiki/eml-shroudforge#settings-changed-in-the-game-in-copy-mode) (reported by ljam); [Repair when an antivirus removed a Kiln file](/kiln/wiki/install#antivirus-windows); [the launcher's messages for an empty window and WebKit's sandbox on Linux](/kiln/wiki/install#a-black-launcher-window); [no launch option asked for with GE-Proton 11-11 and newer](/kiln/wiki/install#on-linux-proton), by bisdat; [XHL-Core no longer loading a ShroudForge mod you switched off](/kiln/wiki/other-mods#xhl-mods); [Play waiting while a profile is applied](/kiln/wiki/profiles#the-list-on-play); [one hash for a server's engine mods](/kiln/wiki/modpacks#install-the-servers-modpack). For mod authors: [the game's own texts](/kiln/wiki/languages#the-games-own-texts) and tooltip rows, [wraps in the prediction storage](/kiln/wiki/world-programs#wrapping-the-games-programs), [`TryReadWritable`](/kiln/wiki/world-programs#work-inside-the-callback), and [Kiln tasks](/kiln/wiki/tasks): mod work off the game thread, hops back to the server or client world's tick, experimental [world reads and writes from tasks](/kiln/wiki/tasks-world) (KILNX003). Kiln tasks ran only in Kiln's tests against stand-ins for the game; their exit steps have not run on native Windows. **Not yet checked in a real game**: host tests, lab checks on a dedicated server (ShroudForge's second pass with one and two failing mods, the game's texts refused on a server), the Graphics page in Kiln's preview renderer, and the release's 25 checks on a trial build, the launcher starting on a clean Ubuntu 22.04 among them. Kiln's own steps at the game's exit and the antivirus messages have not run on a Windows PC yet; the Discord features have not been used with the live service on the Kiln Discord yet |
| 29.19 | (mod API 0.2.11) [mods for AndyPimms' Enshrouded ModLoader](/kiln/wiki/more-frameworks#enshrouded-modloader) (CarryOn, Belt Lantern) without that loader; [Kiln's line on the main menu with XHL-Core](/kiln/wiki/in-game#the-line-on-the-main-menu), XHL-Core's warning line shown under Kiln's again, and a [notice for a mod switched on as both a Kiln build and an XHL-Core plugin](/kiln/wiki/other-mods#xhl-mods); [station screens' fill buttons and Available counts with station outputs](/kiln/wiki/stations#station-outputs-as-stock) (GitHub #68, proposed by bisdat); [Kiln in nine more languages](/kiln/wiki/languages): Deutsch, Español, Français, Italiano, 日本語, 한국어, Polski, Português (Brasil) and Русский, machine translations waiting for native speakers (GitHub #90 to #98); [AMD FSR on AMD cards](/kiln/wiki/in-game#behind-the-games-fsr-3), a new try for FSR 4's dark scenes, and upscaler choices that apply at once; [the Linux launcher drawing with the GPU's compositing again](/kiln/wiki/install#a-black-launcher-window), with its own way back; [kiln.log's warning before the game's impact memory runs out](/kiln/wiki/debugging#the-games-impact-memory); [support reports with Building Tools', ShroudLink's and Auto Loot Plus' logs](/kiln/wiki/debugging#save-a-support-report); a lighter ShroudLink chest-name scan; one download with a game and a server copy put in by its game copy; Discord's own refusals named in Send to Kiln support. For mod authors: [`KilnLanguage`](/kiln/wiki/languages#your-mods-texts), [`KeyInput.Listen`](/kiln/wiki/game-ui#hud-toasts-and-keys), [hooks inside another mod's DLL](/kiln/wiki/hooks#hooks-inside-another-mods-dll) (`Hooks.Module`), and for native plugins [`read_original` and `code_state`](/kiln/wiki/hooks#native-plugins-kiln_hookhpp) and [resident tasks](/kiln/wiki/tasks#native-plugins-kilntasks). Seen in a real game on this patch's test builds: AMD FSR 4 running on an RX 9070 XT. **Not yet checked in a real game**: the change for FSR 4's dark scenes (if scenes look too dark, choose FSR 3.1; `kiln/control/amd` is for testers comparing its parts), mods for Enshrouded ModLoader, the main menu line with XHL-Core, the station screens with other station types and the crafting menu's counts (a Charcoal Kiln's charcoal filling a Forge's recipe was seen working, GitHub #68), the nine languages and Cyrillic in the game, `KilnLanguage` and `KeyInput` in a mod, hooks inside another mod's DLL, the impact memory warning, ShroudLink's chest-name scan, and the Linux launcher with compositing on a PC where the old start-up error happened. Host tests, the hook tests under Wine and natively on Windows, and the release's own checks on the test builds |


## New in 0.2.0-dev.29

OnBoot now runs in a player's game, not only on a dedicated server: a boot mod such as More Flame Altars works in a
world you host and when you join a server, with no setting. In 0.2.0-dev.28 it needed `"preview"` in `kiln.json`; that
was a mistake in the release, since the capability had been tested in a real game. **Nothing ships held in dev.29:**
every capability is on, and what only a game can confirm is listed under
[On, not yet confirmed in a real game](#on-not-yet-confirmed-in-a-real-game). Also new: building-material pools,
same-step impact natives and `EffectBlock.Run`, client-world programs and program wraps, typed hooks, cancelable death,
pickup and equip events, component watches, equipment sets, an NPC roster of up to 93 mod NPCs, room for 4,096 mod buffs
and a VFX budget mods can read. The launcher keeps the version you had when a mod updates and can roll it back, replaces
a mod's DLL without rebuilding its zip, and says why when Kiln stops a start. **Evidence:** OnBoot in a hosted world was
confirmed in a real game on dev.28 with More Flame Altars. The rest ran on dedicated lab servers, under Wine, in Kiln's
tests and in the launcher's tests; the VFX budget and client-world programs ran in host tests only.

| Area | Included in dev.29; evidence and remaining limits |
|---|---|
| [OnBoot in your game](/kiln/wiki/onboot#where-it-runs) | boot mods load in a hosted world and when you join a server; `"preview"` is no longer needed (leaving it does no harm). A server no longer turns away Kiln players who have the boot mod. The join [compares what each boot mod made](/kiln/wiki/onboot#settings-and-joining-players) on both sides and warns a player whose settings differ. A boot mod's own icons show from the first start. Staging VFX or materials in `OnBoot` is not in this build |
| [When Kiln stops the start](/kiln/wiki/dedicated-servers#when-kiln-stops-the-start) | a roster that doesn't fit (0x4B02), the mods' NPCs and quests not built at all (0x4B03) or a required boot mod that failed (0x4B01) stop the start before any world loads, so a save keeps its mods' progress. The [launcher](/kiln/wiki/profiles#when-kiln-stops-the-start) shows "Kiln stopped the start" with the mods by name; `kilnctl` prints the reason; `kiln@.service` doesn't restart on statuses 1, 2 and 3 |
| [Rolling back an update](/kiln/wiki/profiles#rolling-back-an-update) | the launcher keeps the version you had (1 by default, up to 5) and offers **Roll back to &lt;version&gt;**, with the settings files it could keep; `kilnctl library rollback`. Recovery after a stop in the middle is tested by write order, not by a real power cut |
| [Replace DLL…](/kiln/wiki/profiles#replace-dll) | a new build of a native DLL mod with a patched DLL swapped in, keeping its place, switch and settings; the build before is kept for a roll back. Not run on Windows yet |
| [Notices](/kiln/wiki/profiles#the-list-on-play) | ShroudForge's own loader in the game folder, Shroudlink mods without the client addon, a clear (X) in every filter box |
| [Restore the game's data](/kiln/wiki/eml-shroudforge#restore-the-games-data) | moves the leftover game data another loader made into `kiln/eml/displaced`, with **Undo move**. Not run on Windows or on a real game folder yet |
| [Building-material pools](/kiln/wiki/blocks#building-material-pools) | a wall or roof shape of your own with its own list of materials in the build menu. Two dedicated lab servers, 18 cases; no game client has shown one in the build menu yet |
| [Same-step natives](/kiln/wiki/impact#natives-that-answer-in-the-same-step) and [`EffectBlock.Run`](/kiln/wiki/blocks#a-block-effect-that-runs-your-native) | `[ImpactNative]`, `RegisterSync`, `Attach`, reading and writing other entities from a native, a block effect that runs your native first. Server only. A dedicated lab server without a player; the sample `FrostMark` needs a real hit |
| [Program wraps](/kiln/wiki/world-programs#wrapping-the-games-programs) | `Systems.Wrap` before, after or instead of the game's own programs, typed views of 802 programs, `Systems.Define`. Dedicated lab servers with the worker threads forced; a hosted world with a second player has not run them |
| [Client-world programs](/kiln/wiki/world-programs#in-the-players-client-world) | a program in the player's own client world or prediction storage, and EMF's `EMF_WORLD_CLIENT` calls. Host tests and a lab server, where it is refused as it must be; **no game client has run it** |
| [Typed hooks](/kiln/wiki/hooks#typed-hooks-and-calls) | `Kiln.Sigs`, typed `Detour` and `Invoke`, checked against the game's code and installed only after every game thread is checked. Lab servers and Wine; no managed typed hook has run in a game client |
| [Refusing a death, a pickup or an equip](/kiln/wiki/events#refusing-a-death-a-pickup-or-an-equip) | `EntityDyingEvent`, `ItemPickingUpEvent`, `PlayerEquippingEvent`, each ending in `DecisionCompletedEvent`. Dedicated lab servers with a stand-in player |
| [Component watches](/kiln/wiki/events#watching-components-change) | `ComponentChanges.Watch`: Health, Stamina, Mana, Fuel, Inventory and SlotSelection, with who changed them where Kiln knows. A lab server without players; 0.3 to 1.2 ms a step at the full budget |
| [Equipment sets](/kiln/wiki/inventory#equipment-sets) | `Items.CaptureSet`, `PlanSet`, `EquipSet`: every slot or none, in one transaction. A lab server with a stand-in character, including a failure at every step |
| [A roster of 128](/kiln/wiki/npcs#a-roster-of-128) | 93 mod NPCs (29 before). Everyone needs dev.29 once a world's mods add more than 29. A dedicated lab server in nine boots; no game client |
| [Room for 4,096 buffs](/kiln/wiki/game-data#room-for-buff-clones) | buff clones with an answer instead of an exception, and a refused join when a player's game has too little room. A dedicated lab server with 4,096 clones; no game client |
| [The VFX budget](/kiln/wiki/blocks#the-vfx-budget) | `Vfx.ResourceBudget` and VFX definitions with an answer; asset-file and native VFX now count too, so too many no longer crash the game at start. Host tests against a simulated game |
| [64 world programs](/kiln/wiki/world-programs#declare-before-boot-bind-in-onload) | 64 for Kiln and all mods (32 before), 32 per `kiln.programs.json` (8 before), `World.GetProgramBudget()`. A dedicated lab server |
| For mod authors | mod API 0.2.4, additive. [Terrain adoption and one terrain budget](/kiln/wiki/world-edits#terrain-overlays), [kept scales only where Kiln can tell the entity](/kiln/wiki/world-edits#props), [weapon follow-ups published when they can be played](/kiln/wiki/blocks#items-and-weapons), [build and gameplay hooks only when a mod needs them](/kiln/wiki/other-mods#closed-source-dll-mods), [the `before` compat rule](/kiln/wiki/other-mods#closed-source-dll-mods), [new analyzer and lint rules](/kiln/wiki/lint#c-analyzers), [new test kit fakes](/kiln/wiki/testing#tests-without-the-game), [new samples and templates](/kiln/wiki/dev-kit#samples). The capacity types of dev.28 are no longer experimental: `NoWarn KILNX028` isn't needed |
| Fixes | [autosave hitches on hard drives](/kiln/wiki/debugging#common-causes) (GitHub issue 39, HadToRegister); [the pause menu scrolls](/kiln/wiki/game-ui#menu-entries) when its entries are taller than the screen; [`/noclip` follows `rules.json`](/kiln/wiki/player-rules#noclip) (GitHub issue 37, fixed by bisdat, pull request 38); [EML mods that bring their own DLL](/kiln/wiki/eml-shroudforge#eml-mods-that-bring-their-own-dll) (Quiver & Spellbook) run whole, and on Windows switch on beside ShroudForge mods; [ShroudForge spawning mods](/kiln/wiki/eml-shroudforge#shroudforge-mods) (SpiderHook) work without a Kiln building mod; beside one, ShroudForge's search should find the spawn code (ShroudForge pull request 1 by AlexK-Notable), not yet seen in a game; one broken `kiln.mod.json` no longer takes every mod's NPCs and quests; [frame generation mods](/kiln/wiki/debugging#common-causes) no longer crash the game at start; [Auto Loot Plus next to Ultimate ASI Loader](/kiln/wiki/other-mods#closed-source-dll-mods); [the `xinput9_1_0` override on Proton](/kiln/wiki/install#on-linux-proton); [EMF mod windows grow with their content](/kiln/wiki/emf-mods#what-doesnt-work-yet); [Shroudtopia mods that are only a DLL](/kiln/wiki/more-frameworks#shroudtopia) switch on; the launcher no longer says "Kiln has said nothing" while you play; [EML start failures say why](/kiln/wiki/eml-shroudforge#eml-mods); the ImGui popup under several chained `dinput8.dll` mods is gone |
| For players: [support reports](/kiln/wiki/debugging#save-a-support-report) | include `kiln/logs/tick-stats.jsonl`, Kiln's step times per minute and world, so a slow session can be told apart from a stall at save time |

### Known limits (dev.29)

- **The 128-entry roster is verified on dedicated servers only.** In a game client, a hosted world included, a missing
  second page is not computed again, so locked NPCs from index 64 up are kept until the game's next evaluation.
- **A roster past 29 mod NPCs and an older Kiln:** a world whose mods add more than 29 roster NPCs, opened with a Kiln
  before 0.2.0-dev.29, loses those mods' NPC and quest progress when it is saved. Update Kiln on the server and in every
  player's game before such a mod is added.
- **Kept earlier versions:** a roll back's settings wait when the game folder has moved since they were kept. A
  0.2.0-dev.28 launcher shows a kept version as one more version, and its Clean up may remove it.
- **Same-step natives** and `EffectBlock.Run` are server only, and all mods share 19 entries of the game's native
  registry.
- **Values and slots in the game UI** exist only in a player's game; after a game update they stay off until Kiln is
  updated for that build.
- **Receiving replication** (`repl.client`) is still unavailable: there is no receive implementation in this build.
- **Transform scale** accepts any finite positive size on any entity with a writable transform, players and mounts too;
  extreme sizes can break other calculations. A kept scale is matched by template and position, not proof.
- **Moving a world without `kiln/data`:** Kiln reads the cells first and adopts an overlay that is still all there; a
  quarter or more waits for your choice; below a quarter it is written again, including ground a player dug away.
- **ShroudForge's spawn search** beside other loaders' code patches (EMF's memory writes, SET, Flame) can still fall back
  to what is in memory, where a detoured function can hide the spawn code.
- **Terrain overlays** share one work budget per host; host frame time with players has not been measured.
- **Boot mods next to other loaders' mods** in a player's game were confirmed in one hosted game; the guided check of
  both loader orders has not been played.

## New in 0.2.0-dev.28

OnBoot: a mod's content, and its changes to the game's own data, are in place before the game reads them, on the very
first start. A boot mod can raise the number of Flame Altars a base may have, or change the experience each level
needs, and the game uses the new values from the first start. Also new: questions about the world and paths, terrain
overlays, follow-up moves for weapons, tool wear, values in the game's own UI, block kinds of your own, creature control,
update checks in the launcher, and `kiln publish`. Kiln mods keep working next to another loader that patched the
game's code first. **Evidence:** OnBoot and resource patches ran on dedicated test servers: a mod built outside Kiln's
repository with the SDK patched 21 values of the game's balancing table before the game read it. The rest ran on
dedicated test servers, in Kiln's tests and against recorded answers. **Nothing of dev.28 has been seen in a player's
real game yet.** What only a real game can confirm ships switched off in a player's game, some of it on servers too,
until its game test ([below](#held-until-a-game-test-dev28)); `"preview"` in `kiln.json` switches it on for a test.

| Area | Included in dev.28; evidence and remaining limits |
|---|---|
| [OnBoot](/kiln/wiki/onboot) | `"boot": true` or `"required"` in `kiln.mod.json` (`<KilnBoot>` in a project). Statuses, effects, items, spells and talents staged in `OnBoot` are in the game from the first start, with the same ids; a broken boot mod is left out and named, a required one (also for one bad entry in its own files) stops the start with exit code 0x4B01 and a last kiln.log line that names the file. `Blocks.Find` sees boot blocks from `OnLoad` on; a boot mod whose files or `OnBoot` settings changed loads again only after a restart. Settings are readable in `OnBoot`. Dedicated test servers. In a player's game, hosted or joined, a boot mod doesn't load until its game test, so a server whose boot mod states `"clients": "mod"` refuses Kiln players unless they set `"preview"` ([Where it runs](/kiln/wiki/onboot#where-it-runs)) |
| [Resource patches](/kiln/wiki/onboot#resource-patches) | fields of the game's data changed before the game reads them: experience per level, Flame Altars per flame level (`"altarsPerFlameLevel[*]": { "min": 16 }`). A mod built outside the repository with the SDK patched 21 values of the balancing table on a dedicated test server. Both sides need the mod; the game itself caps Flame Altars at 16. Off in a player's game until its game test |
| [Game data in OnBoot](/kiln/wiki/onboot#the-games-data-in-onboot) | `IReadOnlyGameData` reads the game's items, templates, skills and materials from the boot snapshot, which the launcher makes when it starts the game with an enabled mod that boots: about 30 to 45 s and 200 MB, once per game update. `kiln boot-snapshot` for a server you start yourself |
| [Mod updates](/kiln/wiki/profiles#mod-updates) | **Check for updates** above your mods, a daily check in Settings (off by default), **Updates…** in a mod's menu, and `kiln updates check`. A notice is only a link: nothing is downloaded, installed or switched. Authors name a GitHub repository in [`updates`](/kiln/wiki/manifest#update-checks-updates). Tested against recorded answers, not against GitHub itself |
| [`kiln publish`](/kiln/wiki/cli#publishing-a-release) | a packed mod as a GitHub release: a plan you read, an apply you confirm, a draft you make public. The token stays in your system's credential store. Tested against recorded answers only: make your first release to a repository you can delete |
| [Questions about the world](/kiln/wiki/world-edits#questions-about-the-world) | voxel rays, the ground below a point, voxel line of sight, entities in a sphere or a box; an answer is a hit, a miss or "unknown". 64 rays and 500 microseconds a server step for all mods together. Dedicated test servers; off on hosted worlds until its game test |
| [Paths](/kiln/wiki/world-edits#paths) | the game's own path search for a walking route up to 200 m: `Queries.FindPath`, `Queries.CanReach`. Nothing is moved. Dedicated test servers; off on hosted worlds until its game test |
| [Terrain overlays](/kiln/wiki/world-edits#terrain-overlays) | an ore vein, a mound, a tunnel, written once per world as ordinary world edits that players without Kiln see; players' changes win, also after a lost record (Kiln keeps a second one in `kiln/data/kiln.terrain`); transient edits are gone after the next restart, also in a base. Dedicated test servers; off on hosted worlds until its game test |
| [Brains that walk](/kiln/wiki/creature-ai#a-brain-of-your-own) and [creature control](/kiln/wiki/creature-ai#creature-control) | a creature run by a mod's brain now walks; mods take a lease on a creature's body. A brain's body walked on a dedicated test server; that a player sees it walk is open |
| [Block kinds of your own](/kiln/wiki/blocks#block-kinds-of-your-own) | `Blocks.RegisterKind`: other mods write your block, Kiln turns it into items, weapons, spells, statuses and effects. Dedicated test servers; a joined player without the provider is not checked in a game |
| [Weapon move follow-ups](/kiln/wiki/blocks#items-and-weapons) | `MoveBlock.FollowUps`: a block that goes on into the weapon's own parry. All moves or none, written in one step and taken back whole on a failure; `Blocks.MovesStatus`. A lab server; off everywhere, servers too, until its game test |
| [Tool wear](/kiln/wiki/blocks#items-and-weapons) | `ToolBlock.WearPerDebit`, `Items.SetToolWearPerDebit`: an axe or pickaxe wears faster, slower or not at all. Dedicated servers; hosted worlds after the game test |
| [Values in the game's own UI](/kiln/wiki/game-ui#values-in-the-games-own-ui) | `Ui.Values`: a mod's numbers and bars in the game's item details, slots and HUD, and lines in Kiln's Item details window. The picture only. Every part is off until its game test |
| [Held at the door](/kiln/wiki/multiplayer#held-at-the-door) | a server may keep a joining player on the loading screen while Kiln's own services check their game (mods don't use it directly yet): at most 25 s, then they join or are told why not. A refused player whose refusal fails gets the game's admin kick on a dedicated server. The lab's own transport; what a real player's game shows is open |
| [Held capabilities](/kiln/wiki/code-mods#built-waiting-for-a-game-test) | what waits for its game test reads `unavailable`, `game test pending: …`; `Capabilities.IsHeld` tells it from "doesn't work here"; `"preview"` in `kiln.json` switches it on for a test |
| For mod authors | mod API 0.2.3, additive: no public member of dev.27 was removed or changed. [OnBoot under `dotnet test`](/kiln/wiki/testing#onboot-under-dotnet-test), [write only if unchanged](/kiln/wiki/world-edits#shapes), [an entity's scale](/kiln/wiki/world-edits#props), [game types by Impact name](/kiln/wiki/impact#game-types-by-their-impact-name), [every content blob](/kiln/wiki/assets#every-content-blob), [`ConfigFile.TrySet` false when the file can't be written, and `LastWriteError`](/kiln/wiki/code-mods#configs), [KILN034 and KILN035](/kiln/wiki/lint#c-analyzers), [EMF 0.6.11 / API v42](/kiln/wiki/emf-mods#mods-built-for-emf-063-to-068), [frame counters per player](/kiln/wiki/multiplayer#your-own-messages), [new samples](/kiln/wiki/dev-kit#samples). Some groundwork for later releases is in it too, marked experimental (`KILNX001`, `KILNX028`); it promises no feature yet |
| [Server operators](/kiln/wiki/dedicated-servers#world-queries) | `kiln/config/kiln.queries.json` sets the rays all mods may cast in a server step. [Boot mods](/kiln/wiki/dedicated-servers#boot-mods) on a server: a required one with a bad file stops the start (exit code 0x4B01) and kiln.log's last line names it. Keep `kiln/data` in your backups: terrain records, the journal of temporary edits and the sizes mods set on props are there |
| Fixes | [Kiln mods next to a loader that patched the game's code in place](/kiln/wiki/other-mods#closed-source-dll-mods): Creative Mode 3.2.0 and The Worst Map Mod switched off up to 22 of Kiln's features (moving items, chat, mod screens, player rules); Kiln now reads the game's functions from the exe file then, and kiln.log names the patched places. Tested on the client exe with the four patched places and on test servers; not yet seen in a player's game (guided check `00-sigdb.in-place-patches`: Creative Mode 3.2.0 with Multi Planter). A creature with a mod's brain walks instead of standing still. [NoClip and character flight](/kiln/wiki/player-rules#noclip): holding sneak always sinks and letting go stops, also in the game's sneak mode (GitHub issue 25), and a player who leaves inside the ground is put back at their last free position. [Key bindings](/kiln/wiki/game-ui#hud-toasts-and-keys): a key saved as `Key223` is no longer lost at the next start, and punctuation keys work on non-US layouts (GitHub issue 33; the round-trip fix by bisdat, pull request 34). Props a mod resized keep their size after a restart. Temporary terrain no longer stays in the save inside a base, or is recorded under an earlier world of the same session. [An EML mod copied into ShroudForge's folder by hand](/kiln/wiki/eml-shroudforge#shroudforge-mods) and switched off there: Kiln says so and how to switch it on. A single start with another profile makes the boot snapshot too. `kiln lint` no longer rejects every value of the publish tag. Update checks order very long numeric prerelease versions by value. Moving the data folder is no longer refused now and then right after another step. Kiln recognises the relays other hook engines use (greeneye plugins, XHL mods) as hooks (by rifters, pull request 31) |

### Known limits (dev.28)

- Nothing of dev.28 has been seen in a player's real game yet. In a player's game (a world they host, or a game that
  joins a server), OnBoot and resource patches are off until their game tests; on a world a player hosts, so are the
  world questions, paths, terrain overlays and tool wear. Weapon move follow-ups and an entity's scale are off on
  servers too, and values in the game's UI (a client feature) are off everywhere.
- **OnBoot in a player's game:** a mod with `"boot"` doesn't load there yet, and a game with an enabled
  `"boot": "required"` mod doesn't start (exit code 0x4B01). A server whose boot mod states `"clients": "mod"` refuses
  Kiln players unless they set `"preview"` in `kiln.json` ([Where it runs](/kiln/wiki/onboot#where-it-runs)). Don't
  ship `"required"` to players yet.
- **OnBoot:** only statuses, effects, items, spells and talents can be staged; other kinds answer `NotInBootKinds` and
  work as runtime blocks in `OnLoad`. On a game client, a required mod with VFX or materials, or with a texture
  override, stops the start when that part can't be built or applied; this is proven only by its guided check. A
  dedicated server builds no VFX (each player's game does), so that never stops a server.
- **Terrain overlays:** if all of `kiln/data` is lost, or a world is moved without it, a plan with no record is a first
  install again. Removing a mod leaves its ground.
- **NoClip:** a player who is still connecting when they are put back may fall a few steps inside the rock first.
- **Weapon follow-ups:** when a failed take-back can't be verified, every change of that mod is taken off, not only the
  weapon's; its other weapons and rules come back at the next content pass.
- `kiln publish` and the update checks were tested against recorded answers, not against GitHub itself.
- Since 0.2.0-dev.29 everything dev.28 held is on, in a player's game and on servers
  ([Held until a game test (dev.28)](#held-until-a-game-test-dev28)).

## New in 0.2.0-dev.27

NoClip, asked for on GitHub (issue 25), the launcher cooking the mods that need it, several mods switched at once, and
the calls mods were missing: take a buff off, see where a player looks, kick and ban, hear only the hits you care about,
put an item on a player, choose the weather, roll affixes onto an item. EMF mods built for EMF 0.6.3 and later start
again. **Seen in a real game (13 November, a hosting game on Linux and Proton):** NoClip switched on and off as a player,
and the scrolling pause menu with 10 mods' entries. The rest ran on test servers with stand-ins for players, in Kiln's
tests and in the launcher's browser test bench; what a player's own game shows waits for the guided client pass.

| Area | Included in dev.27; evidence and remaining limits |
|---|---|
| [What Play is doing](/kiln/wiki/install#when-you-press-play) | a progress bar with the step that runs, until the game's main menu; from the second start with the same mods, the time left. Launcher tests |
| [The launcher cooks](/kiln/wiki/install#mods-the-launcher-cooks) | mods with a cook recipe are cooked when you press Play, with no Kiln source; **Cook again** in a mod's menu. On Windows the launcher brings its own Python. The Windows cook is compile-checked only; the tools were run on Linux |
| [Several mods at once](/kiln/wiki/profiles#several-mods-at-once) | tick boxes, Shift+click, Ctrl+A; switch on, off or remove in one go. **All on** and **All off** with Undo. L2 and R2 on the Steam Deck. Tests and the browser test bench, not the installed launcher |
| [Changed on disk](/kiln/wiki/profiles#changed-on-disk) | a mod you edited in its own folder shows **Changed on disk** with **Use the changed files**, instead of "library hash mismatch" at Play. Tests and the browser test bench |
| [Save editor](/kiln/wiki/install#your-saves) | an **Editor** tab on the Steam Deck; changes stay when you leave the page; **Read again** instead of overwriting a save the game wrote; amounts up to 65,535 (GitHub issue 23). Browser test bench only |
| [NoClip](/kiln/wiki/player-rules#noclip) | `/noclip` for admins, off on every server until `"allowNoClip": true`. Switching it on and off: seen in a real game. Ending it inside the ground, death, other players' view and a dedicated server: not tried in a game |
| [Menu entries](/kiln/wiki/profiles#menu-entries-of-mods) | the pause menu scrolls when mods add more entries than fit; every entry is also on Kiln's Mods page. Tried in one real game at one resolution |
| [Mouse key bindings](/kiln/wiki/game-ui#hud-toasts-and-keys) | Mouse4, Mouse5, the middle button and the wheel, with Ctrl, Shift or Alt (GitHub issue 29). Unit tests and a test window under Wine, not a real game |
| [Mod settings in the game](/kiln/wiki/profiles#mod-settings) | Apply shows the new values at once, and a slider has a number field beside it (GitHub issue 28) |
| [EMF 0.6.3 to 0.6.8](/kiln/wiki/emf-mods#mods-built-for-emf-063-to-068) | EMF's newer DLL and Lua mods start again; a Kiln game answers an EMF server's mod check. Some of EMF's newer functions answer "not available" for now. A lab server with EMF 0.6.8's mods, no players |
| [ShroudForge](/kiln/wiki/eml-shroudforge#shroudforge-mods) | what **Waiting** means; a mods folder on another drive under Proton; the launcher says when ShroudForge's own loader cannot write its mods; Kiln's **MODS** entry is back in the main menu with ShroudForge mods on |
| [Kick and ban](/kiln/wiki/dedicated-servers#kick-and-ban) | `/kick`, `/ban`, `/unban`, `/bans` and a ban list of Kiln's own. Test connections on a test server, not a real player's game |
| [A slow server start](/kiln/wiki/dedicated-servers#what-a-slow-start-is-doing) | `kiln/state/progress.json` says what the start is doing. Test servers |
| [Cooking on a server](/kiln/wiki/dedicated-servers#mods-with-a-cook-recipe) | `kiln cook` from a release's `sdk/` folder alone, no `KILN_REPO`. Each cook records what it wrote; a cooked file no cook of this game made loads with a warning |
| For mod authors | mod API 0.2.2, additive. [NoClip](/kiln/wiki/player-rules#noclip), [buffs taken off and listed](/kiln/wiki/abilities#run-effects-buffs-and-animations), [where a player looks](/kiln/wiki/abilities#where-a-player-looks), [kick, bans and the login event](/kiln/wiki/multiplayer#kick-ban-and-who-may-log-in), [event filters by entity](/kiln/wiki/events#only-the-events-about-one-entity), [equip and unequip](/kiln/wiki/inventory#equip-and-unequip), [item data in players' games](/kiln/wiki/inventory#item-data-and-saves), [affixes](/kiln/wiki/affixes), [tracked world writes](/kiln/wiki/world-programs#tracked-writes-from-the-tick-thread), [weather](/kiln/wiki/code-mods#weather), [one contract for every service](/kiln/wiki/code-mods#when-a-call-cannot-work), [KILN120 and KILN121](/kiln/wiki/lint#c-analyzers), [definitions baked at build](/kiln/wiki/dev-kit#definitions-baked-at-build), [new fakes for unit tests](/kiln/wiki/testing#tests-without-the-game), [new samples and templates](/kiln/wiki/dev-kit#templates). Proven on a test server with stand-ins for players |
| Fixes | starts with many mod materials are much faster; Kiln's mods load again next to mods that hook the game first (Auto Doors), also with Greeneye Loader or ShroudForge beside them; the game no longer hangs at its start next to other loaders, and Kiln finds the game's functions after another loader changed them (both by rifters, GitHub pull request 27; since dev.28 also when a loader patched them in place); the Mods page at high Windows scaling; a mod item lies on the ground as its own model; quoted names in `dinput8-chain.ini`; a quest whose completion a mod cancelled no longer gives its reward |

### Known limits (dev.27)

- NoClip was tried in one real game. It does not work while the Creative Mode mod runs, and a player who leaves inside
  the ground is saved there (the game's Unstuck frees them).
- The launcher does not cook mods you put into the game folder by hand, nor the mods of a local server it runs: run
  `kiln cook` for those.
- The scrolling pause menu was tried at one resolution, with mouse and keyboard; other UI scales and a gamepad were not.
  The main menu does not scroll: there, more than 3 mods' entries go to the Mods page.
- Kicking, banning, equip, the weather, tracked writes, item data in players' games and affixes were proven on a test
  server with stand-ins for players. A weather hold does not outlast a server restart.
- EMF: the minimap draws nothing, Beastmaster's markers, buff reads and move reads do nothing, and teleports has no map
  action. An EMF server that also requires content mods still refuses a Kiln game.
- "Changed on disk", All on and All off, the save editor's Deck tab and the menu entries on the Mods page ran in tests and
  the browser test bench only.

## New in 0.2.0-dev.26

The first of the releases that complete the mod API, and the data folder move players asked for on Nexus. **Seen in a
real game (Linux, Proton, one player on a dedicated test server):** the launcher and the game starting with this release,
item data in the backpack and in a chest through a server restart and a rejoin, mod creatures with a faction of their own,
and the sample weapons playing their own attack states after a join check that passed. The rest was tested on Linux hosts,
on dedicated test servers under Wine and in Kiln's tests. Nothing ran on native Windows or on a Steam Deck.

| Area | Included in dev.26; evidence and remaining limits |
|---|---|
| [Move Kiln's data folder](/kiln/wiki/profiles#the-data-folder) | **Settings**, **Library**, **Data folder**, **Change** moves everything Kiln keeps (mods, runtimes, modpacks, profiles, backups) to a folder or drive you choose. Kiln checks the copy before it switches and only then removes the old one; a failed or canceled move changes nothing. Tested by the launcher's own tests, not in the real launcher window and not on Windows |
| [Notes about mod folders](/kiln/wiki/profiles#in-the-game-folder) | the launcher tells you once about a folder it leaves alone, files it kept and notes on your mods, instead of at every change to your mods; **Notes** above the list shows them again, a switch in Settings turns them off, and a notice no longer covers the window. Asked for on Nexus. The launcher's tests and a browser against a stand-in for its backend, not the installed app |
| [ShroudForge settings](/kiln/wiki/eml-shroudforge#shroudforge-mods) | a ShroudForge mod you had in ShroudForge's mods folder before Kiln can have its settings changed in the launcher: Kiln writes only the setting you change. Changing a setting in ShroudForge's own in-game menu no longer makes Kiln treat its copy of the mod as yours (that kept the folder at every change and locked its settings). Kiln's tests; the menu's behaviour follows ShroudForge's source |
| Data on one item | a mod can keep a value on one particular item (kills on one sword) through moves, saves, crashes and restored backups. When Kiln can't tell two identical items apart, the value waits instead of jumping to the wrong item. Backpack and chest items through a restart and a rejoin: seen in the game. The action bar, worn items, a crash and crafting with such an item wait for a game test |
| Weapons with their own attacks | a mod's weapons can have player animation states of their own (attacks, guards, casts), timing and chains, and parts that move while held. The server and every player's game need the mod, cooked ([below](/kiln/wiki/dedicated-servers#mods-with-a-cook-recipe)); the join check compares both sides. The join and the sample weapons' states: seen in the game. How the states blend, a second player seeing them, hit timing and root motion wait for a game test |
| Cooking on a dedicated server | `kiln cook` works against a server's files: it cooks the animations a server needs and skips the models, which only a player's game draws. It needs Python and Kiln's source; the launcher doesn't cook yet, so a player who adds such a mod sees the plain weapon, and a mod with player animation states is refused at join until the player's game cooked it too. Tested against a test server's files. Since dev.27 the launcher cooks such mods at Play, and `kiln cook` needs no Kiln source |
| Mod creatures | creatures a mod defines keep their own friends and foes again (dev.24 dropped them at the first server step). Seen in the game |
| What works on this game build | `kiln/state/capabilities.json` lists what works on your game build and side and why something is off; a mod that doesn't load because the build lacks something says what and why in kiln.log and in the mod list. Test servers |
| For mod authors | mod API 0.2.1 (additive; a mod built with this MDK needs dev.26 or newer). About 120 lab and test helpers are now a build error unless a project opts in (`KILNX001`). Typed reads of every game component, tests under `dotnet test` with no game (`Kiln.TestKit`), guided client checks, one error rule. The [release notes](https://github.com/frostdev-ops/kiln/releases/tag/v0.2.0-dev.26) have the list |
| Fixes | a mod's own attack sequences work in a second world of the same game run; animations authored on a game skeleton no longer tear the body apart (cook them again); from GitHub issue 23: another tool's `POWRPROF.dll` is no longer taken for SET, a Shroudtopia mod another loader started isn't started twice, two EML loaders in one game are reported, a misplaced `chain.ini` is named in proxy.log |

## New in 0.2.0-dev.25

A hotfix for dev.24. **Seen in a real game (Linux, Proton, one client):** ShroudForge's data mods next to EML mods
(Unlock Blueprints updated 2544 recipes), ShroudForge mods' shortcuts, and ShroudForge, EML, Greeneye, shroudlink, native
DLL and Kiln mods loaded together. The rest was tested on Linux hosts, under Wine without a display and in a virtual X
display.

| Area | Included in dev.25; evidence and remaining limits |
|---|---|
| [EML next to ShroudForge](/kiln/wiki/eml-shroudforge#eml-and-shroudforge-together) | with More Gliders and Unlock Blueprints together, ShroudForge refused one write and dropped its whole startup pass, so no data mod applied. Kiln's ShroudForge 1.7.9 and Kiln's own EML runner now check a write into a value a mod created against that field's type. Seen in the game |
| XHL mods | XHL's newer mods (a `mod.json` that only names the mod) import as XHL-Core plugins instead of "Nothing to add". XHL-Core 2.x is recognised as one mod, "xhl-core". Kiln runs XHL-Core from its own copy named `xhl-core.dll` in `kiln\chain\`: as `dinput8.dll` it took itself for the game's main one and started no plugins (seen under Proton). Kiln's tests and a Wine harness; XHL plugins not yet seen in a game |
| Skill Search | its search box (a Shroudtopia module in the same folder as its EML part) loads again. Kiln's host tests |
| [A black launcher window](/kiln/wiki/install#a-black-launcher-window) (Linux) | the launcher starts again without the GPU when its page has not come up after 15 s; `--software-render` forces it. Tested on a virtual X display, not yet on the NVIDIA / X11 machine of the report |

## New in 0.2.0-dev.24

Most of dev.24 comes from players' reports on Nexus and GitHub: a launcher that shows all of your mods in one list, mods
of other loaders that really run, and nothing of yours deleted along the way. **Seen in a real game (Linux, Proton, one
client):** Kiln's entries in the main menu with ShroudForge mods on, W and S steering with ShroudForge's Unlimited Flight,
and SET's tools. Everything else was tested on Linux hosts, under Wine without a display and on dedicated test servers.
Nothing ran on native Windows or on a Steam Deck; the Deck fixes follow one player's support report.

| Area | Included in dev.24; evidence and remaining limits |
|---|---|
| [One list of every mod](/kiln/wiki/profiles#the-list-on-play) | Play lists every mod you added, for whatever loader, and the mods you put into the game folder by hand, each with an on/off switch where Kiln can switch it. A row's menu (three dots, or a right click) has its settings, versions, folder and Remove. **Load order** shows every mod in the order a start brings them up. There is no Profiles page, no profile picker on Play and no Library page any more. Tested in a browser against a stand-in for the launcher's backend, not in the installed app |
| [Profiles in Settings](/kiln/wiki/profiles#profiles) | Kiln keeps your mods in one profile, **My mods**, by itself. Settings, Profiles: load, save the current set under a name, rename, delete, **No profile**; the library's storage (size on disk, Clean up) is there too. Same test as above |
| Removing a mod | one click; typing the mod's name only with **Type a mod's name to remove it** in Settings. Uninstalling Kiln, deleting a profile or a server and restoring a backup still ask for the word |
| [Play with Steam closed](/kiln/wiki/install#steam-and-the-game) (Linux AppImage) | every game start from a Steam the launcher had started ended within seconds, with no window. Fixed |
| Adding mods on a Steam Deck | with ShroudForge installed under Proton, every mod added failed with "Read-only file system". The launcher now finds ShroudForge's mods folder through the game folder. Follows one player's report; not on a Deck |
| [Files a mod wrote](/kiln/wiki/profiles#in-the-game-folder) | carried to the new version at an update, kept in `kiln/kept-mod-files` when the mod is switched off or Kiln is uninstalled. A folder you changed yourself stays where it is |
| DLL mods | an update of a mod that comes as a DLL replaces the old version instead of becoming a second entry; the same DLL is no longer loaded twice |
| A game without a window | still counts as running, so the launcher no longer writes into the folder of a running game |
| [EML next to ShroudForge](/kiln/wiki/eml-shroudforge#eml-and-shroudforge-together) | Kiln sets ShroudForge's switch for your EML mods, so they run when a ShroudForge mod is on too; the launcher and the in-game menu say why when ShroudForge does not run one. Going back to ShroudForge alone needs no reinstall. Game files Kiln can't prove it wrote are never overwritten or deleted (leftovers go to `kiln/eml/displaced`). Values you set in ShroudForge for an EML mod are kept |
| [ShroudForge in the game](/kiln/wiki/eml-shroudforge#shroudforge-mods) | a page per ShroudForge mod in Kiln's Mods menu; shortcuts work with Kiln's ShroudForge; Kiln's **Mods** entry is back in the main menu. The main-menu entries and W and S steering with Unlimited Flight: seen in a real game |
| [Flame (Creative Mode)](/kiln/wiki/more-frameworks#creative-mode-flame) | runs from the game's `mods` folder, where it reads its own files. Without data for the current game build, Kiln's own `/creative` stays available and says why |
| Greeneye, XHL, SET, shroudlink | Greeneye mods run from their own folder in the game. XHL companion folders and settings go where they belong. [SET](/kiln/wiki/more-frameworks#set) 0.2 mods: rules, saved settings and the tools windows (tools seen in a real game). shroudlink's client addon loads before Kiln hooks the game, and its mods have one name |
| Next to ReShade or another overlay | the in-game Mods page is no longer empty: Kiln takes the graphics device over when the game makes its swapchain, if the PC has one graphics device. No test here has a second program hooking Vulkan |
| Enshwick packs | a data pack written like Enshwick's own examples imports instead of "its pack.toml is invalid" |
| [Steered glider](/kiln/wiki/player-rules#creative-mode) | in creative mode S raises the glider's nose (up to 85 degrees), W lowers it, the boost pushes along the nose. Rule `glideSteer` in `rules/creative.json`; `"allowGlideSteer": false` in `rules.json` switches it off for everyone |

### Known limits (dev.24)

- Seen in a real game (Linux, Proton, one client): Kiln's entries in the main menu with ShroudForge mods on, W and S
  steering with ShroudForge's Unlimited Flight, and SET's tools. Everything else was tested on Linux hosts, under Wine
  without a display and on dedicated test servers. Nothing ran on native Windows or on a Steam Deck; the Deck fixes
  follow one player's support report.
- The launcher's new main screen was tested in a browser against a stand-in for the launcher's backend, not in the
  installed app.
- On Linux, Steam can show the game as running for about a minute after you quit. Steam's own networking library crashes
  while the game shuts down, and the system then writes a crash dump of several gigabytes. No Kiln or mod code is on
  either side of that crash; whether it also happens without Kiln is not known yet.
- shroudlink's MODS tab has not been seen in a real game with this build.
- When one EML mod fails inside ShroudForge, ShroudForge drops its whole startup pass and none of its data mods apply
  that start. The in-game Mods menu shows them as failed; the launcher's engine view can still say they run.
- The steered glider with an analog stick, with the game's other pitch mode, and another player's steered glider seen
  from a second game are not checked in a game.
- The graphics device takeover needs a second program hooking Vulkan next to Kiln, which no test here has. With more
  than one graphics device Kiln still cannot draw in that case; kiln.log says so.
- ShroudForge 1.8.0 is not released yet. Kiln brings 1.7.9 and will support 1.8.0 when it is out.
- Enshwick 1.0.0-alpha.14 (bundled since dev.23) starts under Kiln's host tests with its real loader. On the client Kiln
  is first, so a feature of Enshwick that needs a function another program hooked first may be off, and its log then
  names a Kiln DLL. Not measured in a game.

## New in 0.2.0-dev.22

Since dev.24 the launcher's places named in this section have moved: the profile's tabs and the **Library** page are the
list on Play, **Load order**, **Native and DLLs**, **Engines** and **Configs**; profiles are in Settings; activating a
profile is **Load** there, and the launcher also brings the profile up to date when you press **Play**
([Profiles and mods](/kiln/wiki/profiles#profiles)).

dev.22 is about mods that did not load. Players reported that mods made for other frameworks were refused by the Library,
were invisible in the launcher, or sat in a profile and never ran. It also adds a mod manager in the game, takes the
48 GiB read out of the EML first start, and makes the launcher lighter. **Nothing in dev.22 was run on Windows, on a Steam
Deck or in a real client.** It was tested with unit tests, Wine host tests with stand-in loader DLLs, and dedicated-server
labs under Wine. One lab run used a real ShroudForge loader build. Nexus features stay off, as in dev.20 and dev.21.

| Area | Included in dev.22; evidence and remaining limits |
|---|---|
| [Adding mods](/kiln/wiki/other-mods#adding-mods-in-the-launcher) | zip, 7z and rar. The launcher reads 7z itself; a rar needs unrar, 7-Zip, bsdtar or Windows' tar already on the PC, and a password-protected or split archive is refused with a message to extract it first. A package shaped like the game folder imports as its mods, and a bundled loader Kiln doesn't need is one note, not an error. Ids with capitals (`HoardersHelper`) are no longer refused, and ShroudForge packages with upper-case ids import too. A `dinput8.dll` or `winmm.dll` mod keeps its `.ini` and data files. Tested with unit tests and launcher mock data, not on a real install |
| [In the game folder](/kiln/wiki/profiles#in-the-game-folder) | the profile's Mods and Engines tabs list the mods you extracted into the game folder: whether each loads with this profile and why, with one button to add it to the profile or to switch that framework's drop-in on. Your files are never moved or deleted. Tests and mock data, not a real install |
| [Drop-in switches](/kiln/wiki/profiles#drop-in-folders) | a switch for EML, ShroudForge, Greeneye, Flame, Shroudtopia, Enshwick and shroudlink next to Kiln's four. A framework's folder is read when its switch is on. Profiles from before dev.22 keep loading what they loaded. Unit tests and Wine host tests |
| [Another framework's own loader](/kiln/wiki/other-mods#your-other-loader-is-installed-too) | while EML's `dbghelp.dll` (or another framework's own loader) is installed, the launcher copies the profile's mods of that framework into the folder it reads, and removes its copies when the loader is gone. Before, those mods did not run at all. Stand-in loader DLLs under Wine, and a lab run with a real ShroudForge loader build; not with a real EML on Windows. shroudlink's and Ember's own loaders can't be served this way |
| Proton without a DLL override | a framework's loader file in the game folder does not run there. Kiln used to step aside for it anyway; it now checks that the file really is the loaded code and runs the mods itself. Stand-in DLLs under Wine; not on a Steam Deck |
| [shroudlink's client addon](/kiln/wiki/more-frameworks#shroudlink) | the addon (the in-game MODS tab) is added as a mod of its own when dropped on the launcher. Before, it was taken for a loader Kiln doesn't need and left out. Kiln still runs the core. Not seen in a real client |
| [EML first start](/kiln/wiki/eml-shroudforge#faster-starts-dev21-and-dev22) | no more reading of all game data (about 48 GiB on a full install) before the game starts. A start that was closed half way continues. A small progress window appears after two seconds, and the Play page shows the same. exFAT and FAT drives still read everything, now with progress. Byte counts measured on a synthetic 55-file data set and a 7.5 GiB lab server under Wine, not on a real install |
| [Mod manager in the game](/kiln/wiki/profiles#the-kiln-menu) | **MODS** in the game's main menu opens a full page of the mods of every framework, their state and reasons, with search and a filter for mods that need attention. Not seen in a real client |
| [Support report](/kiln/wiki/debugging#save-a-support-report) | **Save report** on the Logs page makes one zip with the logs, state files and a summary in plain sentences. User name, home folder, machine name, Steam ids, IP addresses and tokens are removed; saves, worlds and mod contents are never read. `kilnctl report` does the same for a server. Unit tests and launcher tests; no report from a real Windows PC or Steam Deck has been read |
| SET | SET mods load again with C# mods on. Kiln's SET part took Kiln's own in-game mod list for SET's runtime and stood aside |
| Non-ASCII paths | with a Cyrillic, Chinese or accented Windows user name or game folder, the quests part crashed at boot, SET mods did not load and build regions were not saved. Fixed; checked under Wine, not on Windows |
| [Native Windows servers](/kiln/wiki/dedicated-servers#your-own-windows-pc) | new items and recipes register again (GitHub issue 14, "nothing free within 2 GB"). Checked with replayed address-space layouts and under Wine; not on a Windows PC |
| Reinstall | after uninstalling and installing Kiln again, the profile you used is active again, and a dropped mod goes into it |
| Lighter launcher | next to a running game its backend used about 50 ms of CPU per second and now uses 1 to 8. The first status check after a start took 1.2 s and takes 0.05 s. While the window is not focused it refreshes every 30 s; events from the game still refresh at once. Kiln's own measurements, not on Windows or a Steam Deck |
| Steam Deck | **Add mods** lists `.7z` and `.rar` files in Downloads too. Not on a Deck |

**Breaking and behaviour changes.** With an active profile, a framework's own folder is read only when the profile's
`dropins` is `true` or a list naming that framework. Before, Greeneye, Flame, Shroudtopia, shroudlink and Ember read
their folder whenever the profile had no mod of that framework, and Enshwick's loader ran for every hand-installed
folder. Profiles made before this build keep loading what they loaded; a `profile.json` written by hand without the list
stops loading those folders. kiln-shroudforge hosts ShroudForge for the packages in its mods folder when ShroudForge
drop-ins are on, not only for a profile's ShroudForge mod. **Play a profile once** with another profile is refused for a
framework whose own loader is installed when that profile's mods of the framework differ. Mods of other frameworks are
listed in the Library under an id in lower case, with their own id next to it. Mod authors: `entryAssembly` in
`kiln.mod.json` is optional ([a mod of data only](/kiln/wiki/manifest#mods-of-data-only)); framework state files list a
profile's mods as `own-loader` or `not-loaded`, and `eml.json` can say `phase: "running"`.

### Client checklist (dev.22)

Only a real client, a Steam Deck or a Windows PC can confirm these. Please report what you see.

- Windows with EML's `dbghelp.dll` in the game folder: add an EML mod through the launcher, press **Play**. The mod runs
  once. `kiln/state/eml.json` lists it as `own-loader`, and `mods/<id>/` holds Kiln's copy. Remove `dbghelp.dll`,
  press **Play** again: the copy is gone and the mod still runs once.
- Steam Deck or Linux with ShroudForge's `dbghelp.dll` and no DLL override: the profile's mods run (kiln.log says the
  folder's loader is not the loaded code).
- The first start with EML mods on a real install takes seconds, not minutes. The progress window appears only when the
  step takes longer than two seconds, never takes focus, and is gone before the game's window.
- **MODS** in the main menu opens the mod manager; leaving returns to the menu.
- Drop a `.7z`, a `.rar` and a game-folder-shaped zip on the launcher: the result line and its Details view read well.
- The **Game folder** rows in the list on Play match what is in the folder; **Load them** and **Add it** work.
- shroudlink in singleplayer: drop its singleplayer zip on the launcher, start, and the MODS tab opens and lists the
  mods.
- A Windows user name with non-ASCII letters: the quests part starts, a SET mod loads, a build region survives a restart.
- A native Windows dedicated server: a mod's new item registers (issue 14).
- Save a support report and read `summary.txt`: nothing private is left in it.
- Uninstall Kiln, install it again: the same profile is loaded and mods load.

### Known limits (dev.22)

- Nothing in this build was run on Windows, on a Steam Deck or in a real client.
- The copies for a framework's own loader are made by the launcher. If you install such a loader afterwards, start once
  from the launcher's **Play**.
- shroudlink's and Ember's own loaders can't read Kiln's layout: with one of them running, a profile's mods of that
  framework do not load, and the state file says so.
- Enshwick's own loader may see a mod that was copied while it was already running only from the next start.
- The check that tells Wine's own DLL from a framework's loader compares the loaded image's header with the file. It
  assumes the loader leaves its own header in memory.
- exFAT and FAT game folders still read every game file at every start with EML mods; they now show progress.
- The byte counts for the EML start are measured on a synthetic 55-file data set, not on a real 48 GiB install.
- A rar needs an external tool. A password-protected or split archive is refused with a message to extract it first.
- Nexus quarantined several dev.21 files after a single antivirus engine flagged the installer. If a file is missing on
  Nexus, use this site or GitHub.
- The limits listed for dev.21 still apply.

## New in 0.2.0-dev.21

dev.21 fixes the problems found in the dev.20 review. It stops the launcher from removing mods while Enshrouded runs,
makes EML mods start much faster, moves every hook Kiln places on the game into one registry, and helps closed-source
DLL mods (XHL, trainers) work next to Kiln. Most new paths were verified only under Wine: unit tests, Wine host tests
and dedicated-server labs. Not on Windows, and not in the real client. Nexus features stay off, as in dev.20.

| Area | Included in dev.21; evidence and remaining limits |
|---|---|
| [Library guard](/kiln/wiki/profiles#the-library) | **Remove** and **Clean up** are refused while Enshrouded runs: "Close Enshrouded first: the game may be reading this mod". Clean up never lists a version the active profile uses. This is Kiln's side of GitHub issue #4; the reporter's root cause is not proven. Launcher pages covered by tests and mock data, not a real install |
| [EML starts](/kiln/wiki/eml-shroudforge#faster-starts-dev21-and-dev22) | each game file is read at most once per start, and not at all while the OS shows it unchanged. Lab server under Wine, 7.5 GiB of server data: a start that changed nothing went from 7.6 GiB read in 5.4 s to 562 B in 64 ms. Not measured on a real client. In dev.21 the first start after the update still read all game files once (about 48 GiB on a full client); dev.22 no longer does |
| [EML mods that can't be read](/kiln/wiki/eml-shroudforge#eml-mods) | a mod whose `src/mod.lua` can't be read is switched off before the long game-data step, with the reason in `state/eml.json` and kiln.log. The other mods still run |
| [Closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods) | the profile's **Native** tab (since dev.24 **Native and DLLs**, next to **Load order**) has a **Load after Kiln and ShroudForge** switch per chain entry, last session's hook overlaps with **Load late**, and the compat rules that apply. Tested under Wine and on lab servers; not yet with XHL-Core in a real game |
| Chat | Kiln's chat commands no longer depend on the game's return address, so kiln-emf's chat hook or an EMF mod's hook can't hide players' lines from them (a dev.20 bug). Tested with stand-in hooks under Wine; the real-client check is open |
| [Hooks](/kiln/wiki/hooks) | kiln.hooks v2: one registry owns one detour per game function, for Kiln's services, the core tick, EMF and Shroudtopia mods and C# mods. `kiln/state/hooks.json` maps them. About 6 ns per call through an empty chain and 59 ns through a C# handler (lab, Wine). Client UI, camera and render hooks need a client check |
| [ShroudForge](/kiln/wiki/eml-shroudforge#shroudforge-mods) | its six engine hooks go through kiln.hooks when Kiln hosts it, so another DLL's hook on one no longer switches its native runtime off. Dormant on the current game build: no shipped game profile names engine hooks. `KILN_SF_ENGINE_HOOKS=self` keeps the old behaviour |
| Linked `/home` | ShroudForge and SET placement and modpack installs accept a `/home` that links to `/var/home` (Fedora Atomic, Bazzite). Links inside the managed folders are still refused. Tested with symlinks on Linux, not on a Fedora Atomic host |
| [Nexus leftovers](/kiln/wiki/install#mods-from-nexus-mods) | a launcher build with Nexus off gives `nxm://` links back to the handler you had before (Vortex, for example). Every build deletes the personal Nexus API key dev.19 stored, without showing it |
| Smoother play | mod status lines never make the menu, tick or frame wait. [EMF portraits](/kiln/wiki/emf-mods#dev21-changes) are drawn off the boot thread, and current pictures skip the renderer. SET no longer re-reads a catalog without texts every 60 s, and handles non-ASCII Windows paths |
| File names | names Windows would change (trailing dots or spaces) are refused in mod zips, runtime bundles and modpacks |
| Mod API | [inventory](/kiln/wiki/inventory) transfer handlers also run on a dry-run move, with `KILN_TRANSFER_DRY_RUN` set. `component_change` refuses an add whose payload doesn't match the component's size. `Overrides` from a background thread belong to the mod that got the handle; without one they throw `InvalidOperationException`. `Texts.Get` returns `null` while another thread loads the catalog. `Assets.Reflect` returns `null` on builds without kiln.types. [World program](/kiln/wiki/world-programs) `TryRead`/`TryWrite` no longer allocate or lock per entity. KILN111 counts items registered with `ItemDefinition`, and a game-style name missing from your local catalog is info, not a warning |

**Breaking and behaviour changes.** `Hooks.Detour` and the v1 `detour` pass every argument to the original. EMF and
Shroudtopia mod hooks run before Kiln's own links ([all hook changes](/kiln/wiki/hooks#changes-from-dev20)). Library
removal is refused while the game runs, even with force; a running server blocks it only when its profile points into
the Library. Use kiln-emf and kiln-eml from the same release. An older proxy ignores `[late]` and loads those DLLs early.

### Client checklist (dev.21)

Only a real client or a joined player can confirm these. Please report what you see.

- Kiln's menu opens and draws; camera, render and in-game UI hooks behave as in dev.20.
- With kiln-emf's client chat bridge on, Kiln chat commands and EMF mods' chat both work, in both directions.
- Item moves and quick stack, combat, abilities, audio, quests, flight and creative rules, saves, time, spawns, NPC
  factions, VFX and world programs with a player. Their server side ran in labs.
- **Load after Kiln and ShroudForge** on XHL-Core: XHL works, kiln.log shows it loaded late, the overlaps panel updates.
- While Enshrouded starts with an EML mod active, Remove or Clean up of that version is refused, and works after the
  game closes.
- Later EML starts log `nothing changed` within a second or two. (dev.21 read about 48 GiB at the first start; dev.22 does not: see its checklist.)
- EMF portraits: the game enters the world without waiting when every picture is current, and pictures still show.
- The game starts with the new proxy on a real client. Labs covered the dedicated server only.
- Play a profile once whose compat rules differ from the active profile's: that start follows its own rules. (The
  launcher has no "play a profile once" since dev.24.)
- On a `/home -> /var/home` host, the profile's EML mod loads.
- Windows, launcher with Nexus off: `nxm://` links that dev.19 took over from Vortex point at Vortex again.

<a id="in-preparation-for-020-dev20"></a>

## New in 0.2.0-dev.20

These APIs and adapters came with dev.20 and are in dev.21 and dev.22 too. Install the matching runtime and MDK before using them. Source/host
and dedicated-server evidence is listed below; final release-artifact validation is a separate gate. A passing server
or host check does not establish client rendering, input or multiplayer behaviour.

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
| [Nexus integration](/kiln/wiki/install#mods-from-nexus-mods) | **Disabled in the official dev.20, dev.21 and dev.22 builds:** no Catalog, Nexus account/settings or `nxm://` handler on desktop or Deck. Download archives in a browser and import them manually. A future enabled build requires approved OAuth configuration and real-provider proof; there is no personal-key fallback |

Source/host tests and dedicated-server tests validate registration, refusals, save state and cleanup. They do not draw UI,
press keys, animate a lid or establish real-provider OAuth success. The feature pages keep those boundaries explicit.

## New in 0.2.0-dev.19

Historical release notes. The dev.24, dev.22, dev.21 and dev.20 features and limits are listed above.

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
| [EML](/kiln/wiki/eml-shroudforge#eml-mods) | game test pending. Mods patch the game data on test servers; a broken mod is switched off instead of stopping the game. dev.21's faster starts: measured on a lab server under Wine. dev.22: the first start no longer reads all game files (lab server and a synthetic data set under Wine; not a real install), and your profile's EML mods run under EML's own `dbghelp.dll` through copies the launcher places. dev.24: EML mods run when a ShroudForge mod is on too (Linux hosts and test servers) |
| [ShroudForge](/kiln/wiki/eml-shroudforge#shroudforge-mods) | game test pending. Kiln's bundled copy and a player's own copy both run mods on test servers, with live settings. dev.24, seen in a real game: Kiln's main-menu entries with ShroudForge mods on, and W and S steering with Unlimited Flight. dev.29: EML mods with their own DLL run whole without a ShroudForge mod; spawning mods beside Kiln (ShroudForge's own tests and Wine, not yet in a game); a notice when ShroudForge's own loader is in the game folder |
| [EMF](/kiln/wiki/emf-mods) | EMF 0.6.14 / API v46 since dev.29.12 (0.6.11 / v42 since dev.28, 0.6.8 / v40 since dev.27): of 142 C slots, 76 full, 17 partial, and 49 functions EMF added since 0.6.3 answer "not available" for now. EMF 0.6.8's own mods start on a lab server. dev.29: client-world programs and events with `EMF_WORLD_CLIENT` (host tests; not yet run in a game), windows that grow with their content. Player-facing rendering/input and joined-game checks remain open. The older clock mod was seen in game |
| [SET](/kiln/wiki/more-frameworks#set) | dev.24: SET's tools seen in a real game. Server probe 39/0; game options, `Admin.send`, ImGui Debug and the `settings.ini` editor remain unavailable. Kiln tool-window drawing/input needs a client |
| [Greeneye Loader](/kiln/wiki/more-frameworks#greeneye-loader) | game test pending. The whole API, tested on Linux under Wine. dev.28: Kiln mods keep working next to The Worst Map Mod, which patches the game's code in place |
| [Creative Mode (Flame)](/kiln/wiki/more-frameworks#creative-mode-flame) | game test pending. Started on a test server. dev.24: runs from the game's `mods` folder. dev.28: Kiln mods keep working next to Creative Mode 3.2.0, which patches the game's code in place |
| [Shroudtopia](/kiln/wiki/more-frameworks#shroudtopia) | game test pending. The whole API; Shroudweave's mods untried. dev.29: mods that are only a DLL switch on |
| [Enshwick](/kiln/wiki/more-frameworks#enshwick) | game test pending. Enshwick's own loader, shipped with Kiln; its mods ran on a test server |
| [shroudlink](/kiln/wiki/more-frameworks#shroudlink) | works on a test server (shroudlink's self-test). With players joined: pending. dev.22: the client addon (MODS tab) imports as a mod of its own; not seen in a real client |
| [Ember](/kiln/wiki/more-frameworks#ember) | not running: waiting for Ember's loader |
| Stand-alone `dinput8.dll` mods | works: loaded next to Kiln. dev.22: kept with their `.ini` and data files when dropped on the launcher |
| [Closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods) loaded late | new in dev.21. Tested under Wine and on lab servers; not yet in a real game |

## New in 0.2.0-dev.17

- **Steam Deck:** the game no longer hangs on a white window when it starts with Kiln. Kiln's in-game overlay hooked
  the graphics a second time over its own hooks, and the game never got its window. Checked on a desktop PC (the Kiln
  menu opens as before); not yet on a Steam Deck. If you set `KILN_UI_DISABLE=1` as a workaround, take it out again.

## New in 0.2.0-dev.16

Nothing below has been seen in the game yet. The new features are listed under
[Built, game test pending](#built-game-test-pending) with what they were tested on.

- **Historical Nexus integration:** dev.16 introduced the Catalog and optional Mod Manager Download links. These are
  disabled in the current dev.22 build; use [manual archive import](/kiln/wiki/install#mods-from-nexus-mods).
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
| [Player rules and creative mode](/kiln/wiki/player-rules) | `/creative` seen in the game: flying and building outside bases, the Shroud timer frozen, gliding. The plane-style glide: not flown yet. dev.24's steered glider: with an analog stick, with the game's other pitch mode and seen from a second game, not checked in a game. dev.27's [NoClip](/kiln/wiki/player-rules#noclip): switching it on and off seen in a real game |
| [World progress](/kiln/wiki/world-progress) | flame level, difficulty, spires, shrines, Shroud Roots, bosses, chests and a character's quests, with events. Flame-level writes and restoration also pass server checks; client UI/fog/placement effects remain open |
| Water in containers | seen in the game: a larger watering can from a mod |
| [Per-character progress](/kiln/wiki/multiplayer#per-character-progress) | talents follow the character; quests stay with the world |
| Game UI: menus, screens, crafting tabs, HUD, keys, gamepad | dev.27's scrolling pause menu with 10 mods' entries: seen in one real game at one resolution. dev.29: the pause menu scrolls whenever its entries are taller than the screen; not yet seen in a real game at every resolution |
| Content and config sync to Kiln players | |
| Kiln DLL mods and stand-alone `dinput8.dll` mods | |
| [EMF mods](/kiln/wiki/emf-mods) | older mods and EMF 0.6.8's DLL and Lua mods on test servers; the older clock mod seen in game. Current API v42 limits: [above](#mods-for-other-frameworks) |
| The launcher: install, profiles, library, saves, save editor | Linux and Windows. Windows: checked on a Windows PC by a tester. dev.24's new main screen (one list, profiles in Settings): tested in a browser against a stand-in backend, not in the installed app. dev.27's cooking at Play, several mods at once, Changed on disk and the save editor's Deck tab: tests and the browser test bench. dev.28's [update checks](/kiln/wiki/profiles#mod-updates): against recorded answers. dev.29's [roll back](/kiln/wiki/profiles#rolling-back-an-update), [Replace DLL…](/kiln/wiki/profiles#replace-dll) and the stopped-start notice: the launcher's tests |
| Simpler first run | finds the game, installs Kiln, makes a "My mods" profile; drop a mod on the window to add it |
| Linux builds | glibc 2.35 or newer: Steam Deck (SteamOS), Ubuntu 22.04 and later |
| Nexus Mods build | no self-update: updates come from the Nexus page |
| Servers: install, run, console, backups, modpacks, admin pages | Linux and Windows. Windows dedicated servers checked end to end on a Windows PC by a tester: import, install Kiln, start, join, admin pages. dev.27's [kick and ban](/kiln/wiki/dedicated-servers#kick-and-ban): test connections on a test server. dev.28's [boot mods](/kiln/wiki/dedicated-servers#boot-mods): dedicated test servers |
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
| [dev.28](#new-in-020-dev28): OnBoot on servers, questions about the world, paths, terrain overlays, weapon follow-ups, tool wear, values in the game's UI, block kinds, update checks, `kiln publish` | dedicated test servers, Kiln's tests and recorded answers; OnBoot and resource patches also in one hosted game. See [Known limits (dev.28)](#known-limits-dev28) and, for dev.29, [On, not yet confirmed in a real game](#on-not-yet-confirmed-in-a-real-game) |
| [dev.27](#new-in-020-dev27): the launcher's cooking at Play, several mods at once, Changed on disk, the save editor's Deck tab, mouse key bindings, kick and ban, equip, the weather, tracked writes, item data in players' games, affixes, EMF 0.6.8's mods | test servers with stand-ins for players, Kiln's tests and the launcher's browser test bench; the Windows cook compile-checked only. See [Known limits (dev.27)](#known-limits-dev27) |
| [dev.24](#new-in-020-dev24): the one list, profiles in Settings, EML next to ShroudForge, Flame from `mods`, kept mod files, the steered glider, the graphics device takeover | new. Linux hosts, Wine without a display and dedicated test servers; the launcher's main screen in a browser against a stand-in backend. Not on Windows or a Steam Deck. See [Known limits (dev.24)](#known-limits-dev24) |
| [Mod loading in dev.22](#new-in-020-dev22) | new. Copies for another framework's own loader, the game-folder list, the drop-in switches, 7z and rar, the EML first start, the in-game mod manager and the support report: unit tests, Wine host tests with stand-in loader DLLs and lab servers; not on Windows, a Steam Deck or a real client. The [client checklist](#client-checklist-dev22) is open |
| [The hook registry](/kiln/wiki/hooks), late DLL loading, the Library guard | new in dev.21. The registry and late loading: tested under Wine and on lab servers. The launcher's new pages: tests and mock data, not a real install. The [client checklist](#client-checklist-dev21) is open |

## On, not yet confirmed in a real game

Nothing in 0.2.0-dev.29 ships held: each of these is on, subject to its normal dependencies and sides, and only a real
game can confirm what it does there. Each has a guided check a player can run in the game
([guided checks](/kiln/wiki/testing#guided-checks-in-the-game)). If one misbehaves, report what you saw, with kiln.log and, if you ran a guided
check, its ledger.

| Capability | Ran on | A real game must show |
|---|---|---|
| `events.death`, `events.pickup`, `events.equip`: [refusable events](/kiln/wiki/events#refusing-a-death-a-pickup-or-an-equip) | dedicated lab servers with a stand-in player | your screen during the steps a refused death spends at 0 health, what a second player without Kiln sees, a save in that step, a walk-over pickup, gear after a refused equip |
| `events.component_net`: [component watches](/kiln/wiki/events#watching-components-change) | a lab server without players, on stand-in entities | a watch following you in a hosted world, origins named right; `Watch` refused on a joined client |
| `hooks.typed`: [typed hooks](/kiln/wiki/hooks#typed-hooks-and-calls) | lab servers and Wine | the sample's hook installed in a game client, water doubled with it on, two minutes without a stutter |
| `systems.wraps`, `systems.wraps.typed`, `systems.threads`, `systems.define`: [program wraps](/kiln/wiki/world-programs#wrapping-the-games-programs) | dedicated lab servers with the workers forced | a hosted world with a second player, where the game spreads a program over its workers: the well's water bar visibly faster, no stutter |
| `systems.wraps.client`, `world.programs.client`: [the client world](/kiln/wiki/world-programs#in-the-players-client-world) | host tests and a lab server | no game client has run them: a start without client programs looks as before, hosted and joined programs run, leaving and rejoining, a save after client writes |
| `abilities.natives.sync`, `abilities.natives.attach`, `abilities.natives.ecs`, `EffectBlock.Run`: [same-step natives](/kiln/wiki/impact#natives-that-answer-in-the-same-step) | a dedicated lab server without a player | the FrostMark sword on two enemies, one at 20 % health; a Fireball explosion that looks and sounds as the game's own |
| `worldtables.material_pools`: [building-material pools](/kiln/wiki/blocks#building-material-pools) | two dedicated lab servers, 18 cases | a shape's own materials in the build menu, in order, the previews, cost and mining, the game's own lists unchanged |
| `items.equip_sets`: [equipment sets](/kiln/wiki/inventory#equipment-sets) | a lab server with a stand-in character | one decision for the whole set, the pieces appearing at once, no in-between state for a second player, the result kept over a rejoin |
| `npcs.expanded_roster`: [a roster of 128](/kiln/wiki/npcs#a-roster-of-128) | a dedicated lab server, nine boots | entries past 64 in the Survivors directory of a hosted world, a second world, and the message box of a stopped start |
| `gamedata.expanded_buff_room`: [room for 4,096 buffs](/kiln/wiki/game-data#room-for-buff-clones) | a dedicated lab server | the first and the last clone on the buff bar, after a rejoin and in a second world; the refusal of a player with too little room |
| `vfx.budget`, `blocks.vfx_registration`: [the VFX budget](/kiln/wiki/blocks#the-vfx-budget) | host tests against a simulated game | a ready budget of about 2,048 in a game client, effects accepted for the next start and playing after a restart |
| 64 world programs | a dedicated lab server | what a second player without Kiln sees of a server with that many |

### Held until a game test (dev.28)

These shipped switched off in 0.2.0-dev.28 because only a real game could confirm them. **Since 0.2.0-dev.29 they are
on**, in a player's game and on servers, and `"preview"` is no longer needed. The guided checks below still confirm
them in a real game; until a player has run them, they are on, not yet confirmed.

| Capability | Held in dev.28 | Since dev.29 |
|---|---|---|
| `mods.boot.client`: [OnBoot](/kiln/wiki/onboot) | in a player's game | on; confirmed in one hosted game with More Flame Altars. Other loaders' order: not yet played |
| `mods.boot.resource_patches`: [resource patches](/kiln/wiki/onboot#resource-patches) | in a player's game | on; confirmed in the same hosted game (42 values patched) |
| `mods.boot.vfx`: VFX and materials of boot mods | in a player's game | not in this build: a player's game builds every mod's VFX and materials at its start, as before |
| `queries.voxel_ray`, `queries.ground`, `queries.line_of_sight`, `queries.overlap_origins`: [questions about the world](/kiln/wiki/world-edits#questions-about-the-world) | in a player's game | on; to confirm: ground, walls and query-only safety |
| `queries.path`, `queries.reachability`: [paths](/kiln/wiki/world-edits#paths) | in a player's game | on; to confirm: routes around a wall, cleanup and reload |
| `terrain.overlays`: [terrain overlays](/kiln/wiki/world-edits#terrain-overlays) | in a player's game | on; to confirm: what a hosting and a joined player see |
| `items.tool_wear_debit`: [tool wear](/kiln/wiki/blocks#items-and-weapons) | in a player's game | on; to confirm: a pickaxe worn 7 per debit, and its bar |
| `assets.blob_catalog`: [every content blob](/kiln/wiki/assets#every-content-blob) | in a player's game | on; to confirm: the catalog in a game client |
| `blocks.move_followups`: [weapon move follow-ups](/kiln/wiki/blocks#items-and-weapons) | everywhere, servers too | on; to confirm: the handoffs, held block and shield recovery |
| `world.transform_scale`: [an entity's scale](/kiln/wiki/world-edits#props) | everywhere, servers too | on; to confirm: drawn size, collision and the save |
| `ui.values.detail`, `ui.values.slot`: [values in the game's UI](/kiln/wiki/game-ui#values-in-the-games-own-ui) | in a player's game (client only) | on; to confirm: detail numbers and slot bars |
| `ui.values.hud` | in a player's game (client only) | on; to confirm: HUD values kept after the game's own update |
| `ui.values.held` | in a player's game (client only) | on; to confirm: held water |
| `ui.values.tooltip_lines` | in a player's game (client only) | on; to confirm: Kiln's Item details window |
| `ui.slots.inspect` | in a player's game (client only) | on; to confirm: cursor, gamepad, geometry and chest transfer |
| `repl.client` | | still unavailable: receiving replication has no implementation in this build |

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
