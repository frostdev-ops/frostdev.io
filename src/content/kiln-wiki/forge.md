---
title: "Coming from Forge"
description: "Minecraft Forge concepts and their Kiln equivalents."
updated: "2026-11-17"
---

| Forge | Kiln |
|---|---|
| `mods.toml` | [`kiln.mod.json`](/kiln/wiki/manifest) |
| `Dist` | `side`: `server`, `client`, `both` |
| dependencies, ordering, incompatible mods | `dependencies`, `loadBefore` / `loadAfter`, `incompatible` |
| ModList | `Mods.All`, `Mods.Get(id)` |
| InterModComms | `Mods.Send`, `Context.Messages.On` |
| `FMLLoadCompleteEvent`, server lifecycle events | `ModsLoadedEvent`, `ServerStartingEvent`, `ServerStartedEvent`, `ServerStoppingEvent` |
| `EVENT_BUS`, `@SubscribeEvent` | `Events`, `[Subscribe]`, priorities, cancelable events |
| `ForgeConfigSpec` | `Config.Register<T>()`, `[Comment]`, `[Range]`, `[RequiresRestart]`, `[Synced]` |
| Brigadier commands | `[Command]` or `Commands.Literal/Argument`, `@p @a @e` |
| PermissionAPI (with LuckPerms-style groups) | [`Permissions.Register / Has / Explain`, `permissions.json`](/kiln/wiki/permissions) |
| SavedData, capabilities | `WorldData`, `PlayerData`, `EntityData` |
| registries, DeferredRegister | [`Blocks.Define`](/kiln/wiki/blocks), or `Content.Items`, `Content.Recipes`, `.Register(...)` |
| data packs, loot modifiers, `/reload` | `content/*.json`; reapplied when a file changes |
| missing registry entries | placeholders that keep saved items |
| resource packs | `assets/assets.json` |
| SoundEvent, `playSound` | [`cook.json` cues, `Sound`, `Voiceover`](/kiln/wiki/sounds) |
| SimpleChannel, the FML handshake | [`Network.Channel(...).Register<T>()`, mod sync at the join](/kiln/wiki/network) |
| KeyMappings, Screens, overlays, toasts | `KeyBindings`, `Ui.Screen`, `Hud`, `Hud.Toast` |
| GUI themes, item rendering in screens | [`Ui.Themes.Define`](/kiln/wiki/ui-looks), [`ui.ItemIcon`](/kiln/wiki/game-ui#item-icons-and-names) |
| language files (`lang/*.json`) | [`locales/<language>.json`, `Mod.Text`](/kiln/wiki/languages) |
| title and pause screen buttons | `Ui.Menus.Add` |
| advancements, FTB Quests | [`quests/*.json`, `Quests.Define`](/kiln/wiki/quests) |
| villagers, trades | [`npcs` clones, `roster`, `vendor`](/kiln/wiki/npcs) |
| GameTest | `Kiln.Testing`, `[KilnTest]` |
| MDK, ForgeGradle | `Kiln.Sdk`, `kiln new`, `kiln deploy`, `kiln pack` |
| crash reports | `kiln/crash-reports/` |
| mixins, access transformers | [hooks and patches](/kiln/wiki/hooks), for the advanced tier |
| launchers with instances | the Kiln Launcher: one list of every mod, profiles in Settings, server modpacks |

## What Kiln has that Forge doesn't

- **Hot reload** of a mod and its dependents on a running server, checked for leaks.
- **Changes as layers**: unload a mod and the game's values come back, live.
- **Players without Kiln** can join servers whose mods only change the server.
- **Live administration** in the launcher.
- **Compile-time checks** for threads and hot reload, and a [linter](/kiln/wiki/lint) for data files.

## Not there yet

The official launcher, like every one since dev.20, has no online mod Catalog or account integration; import downloaded archives manually.
[Drawing](/kiln/wiki/drawing), [particle shaders](/kiln/wiki/shaders) and particles (`VfxBlock`) have implementations with
explicit test limits. Surface shaders for models remain work in progress. See [What works today](/kiln/wiki/status).
