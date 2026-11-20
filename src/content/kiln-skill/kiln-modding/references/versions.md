# Builds, mod API versions, and what a real game has shown

A mark like **dev.28+** or **dev.29.17+** in this skill means: that runtime and its MDK, or newer. Check the installed
build before using an API (`Mods.RuntimeApiVersion`, `Game.KilnVersion`). A patch that ships "the launcher and the
runtime only" keeps the SDK of the patch before it. The release notes are in the repository's
`docs/kiln/release-notes/`; the dated wiki page https://frostdev.io/kiln/wiki/status is the source for what has
been seen in a game.

| Build | Mod API | Use the MDK | New for mod authors |
|---|---|---|---|
| dev.27 | 0.2.2 | dev.27 | results everywhere, KILN120/121, NoClip, kick and ban, equip, affixes, weather, tracked world writes, baked definitions, mouse keys |
| dev.28 | 0.2.3 | dev.28 | OnBoot and resource patches, world queries and paths, terrain overlays, weapon follow-ups, tool wear, `Ui.Values`, block kinds, creature control, `updates`, `kiln publish`, held capabilities |
| dev.29 | 0.2.4 | dev.29 | refusable events (death, pickup, equip), program wraps (`Kiln.Systems`), `Systems.Define`, typed hooks, same-step Impact natives, `[ImpactNative]`, `EffectBlock.Run`, component watches, client-world programs, equipment sets, material pools, budgets (4,096 buffs, 93 mod NPCs, 64 world programs, VFX), nothing held |
| dev.29.1 to dev.29.10 | 0.2.4 | dev.29 | runtime only (29.3: no doubled key press; 29.4 to 29.6: compat-rule actions `defer`, `original-code`) |
| dev.29.11 | 0.2.5 | dev.29.11 | gems: read, events, new gems, forge actions, sockets on other gear |
| dev.29.12, dev.29.13 | 0.2.5 | dev.29.11 | runtime only (29.12: EmfApi v46) |
| dev.29.14 | 0.2.6 | dev.29.14 | `Bases` and `Stations` |
| dev.29.15 | 0.2.7 | dev.29.15 | item icons and names in UI, panels at production stations, Shroud Forge payers and chest gems, boot patches `append`, `addComponents`, `removeComponents` |
| dev.29.16 | 0.2.8 | dev.29.16 | looks and themes (`UiStyle.Player` default), trimmed icons, `Assets.ReadResidentBlob` |
| dev.29.17 | 0.2.9 | dev.29.17 | station outputs as stock, ordinary chests in a fill, patches `copyComponents`, `clear`, `replace`, boot reads of any resource, `kilnctl tick-compare`; unknown slash commands pass through |
| dev.29.18 | 0.2.10 | dev.29.18 | Kiln tasks, `WorldConcurrent` (KILNX003), `Content.Text` / `TooltipValues`, wraps in the prediction storage, `TryReadWritable`, KILN105 on commands, `graphics.json` |
| dev.29.19 | 0.2.11 | dev.29.19 | `KilnLanguage`, `KeyInput.Listen`, `Hooks.Module` (hooks inside another mod's DLL), `KilnHarness.LogFile` / `ReadLogFile`; native: kiln.hooks `read_original`, `code_state`, `open_module`, `module_scan`, `KILN_TASK_RESIDENT`; station outputs on Kiln clients' station screens; the impact memory watch |

Every API bump since dev.27 was additive: no public member was removed or changed.

## What a real game has shown, and what not
Take this from the notes' "Checked" and "Not yet" text, never claim more. A dedicated-server lab, host tests or Wine runs
do not prove what a player sees, hears or does.

- **dev.26** was released without a client pass (contract and capabilities, typed ECS reads, `Kiln.TestKit`,
  `[ClientCheck]`, `SteamGuard`, `InstanceData`, player animation states, weapon moves). **dev.27** was proven on test
  servers with stand-ins for players; of it only NoClip on and off and the scrolling pause menu were tried in a real
  game. Many dev.21 to dev.24 paths ran only under Wine and in labs.
- **dev.28** shipped game-only features switched off (held) until a guided check; dev.29 opened all of them. OnBoot and
  resource patches were confirmed in a hosted game (More Flame Altars).
- **dev.29, on but not confirmed in a real game:** component watches, refusable death, pickup and equip, the 4,096-buff
  room, 64 world programs with vanilla players, typed hooks in a client, same-step natives, `EffectBlock.Run`,
  material pools, the VFX budget, equipment sets, the 128-entry roster on a client, tool wear for joined players,
  queries and paths on a hosted world, program wraps and `Systems.Define` with a second player, client-world wraps,
  terrain overlays as players see them, `Ui.Values` and slot reads, transform scale. Boot mods next to other loaders: one
  hosted game.
- **dev.29.11 gems:** checked on a client hosting its own world (new gems, forge actions with the events, sockets on rings,
  `AddSocket`, `ReturnSocketedGems`). Not seen: a dedicated server with a separate Kiln client, a player without Kiln,
  tooltips after a data-pack change.
- **dev.29.14 stations:** checked on a hosting client (read, select, fill, stop, resume, collect, a cancelled player
  press). Not seen: a dedicated server with joined players, other water stations, ingredient categories.
- **dev.29.15:** lab and host tests only. Not seen: icons and names on screen, chest gems in the forge's list, panels at
  production stations, anything on a joined client.
- **dev.29.16:** host tests, a server lab and preview renders. Not seen: the new look in the game.
- **dev.29.17:** host tests and labs. Not seen: a Kiln client's crafting counts from station outputs, a craft paid from
  them on a hosted game.
- **dev.29.18:** seen on Linux (Proton, NVIDIA): Kiln tasks on a hosting client, a mod's program in the player's own
  world and a wrap's write there, prediction wraps. Not seen: the game's texts and tooltip rows for mods, Kiln tasks on a
  dedicated server and their world writes, anything on Windows.
- **dev.29.19:** host tests; the hook tests under Wine and natively on Windows. Not seen in a real game: `KilnLanguage`
  and `KeyInput` in a mod, a mod's hooks inside another mod's DLL, the station screens' counts and fill buttons with
  station outputs, the impact memory warning, mods for Enshrouded ModLoader run by Kiln.

The official launcher has Nexus integration switched off: import downloaded archives by hand (no Catalog, no account
sign-in, no `nxm://` handler).
