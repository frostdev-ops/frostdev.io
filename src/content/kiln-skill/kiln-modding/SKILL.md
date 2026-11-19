---
name: kiln-modding
description: Build, test and debug Enshrouded mods with Kiln.Sdk, C# APIs, JSON blocks, data packs and assets. Use for Kiln mod projects, the kiln CLI, local test servers, hot reload, lint and mod-load failures; not for Kiln launcher or framework internals.
---

# Kiln modding

Kiln is a mod framework and launcher for Enshrouded. Mods are C# assemblies (.NET 10) that Kiln loads into the dedicated
server and the game client, plus optional JSON data and asset files. This skill covers mods, not Kiln's own services or the
launcher's code.

Enshrouded is a trademark of Keen Games GmbH. Kiln is unofficial.

## Before you start

1. Read the page for what you're using: https://frostdev.io/kiln/wiki. [references/docs-map.md](references/docs-map.md) says
   which one.
2. The current build is **0.2.0-dev.29.18**, with mod API 0.2.10 and the matching 0.2.0-dev.29.18 MDK. A mark like
   **dev.20+**, **dev.28+** or **dev.29.17+** means that runtime and its MDK or newer; check the installed build
   (`Mods.RuntimeApiVersion`). Which build added what, and what a real game has shown:
   [references/versions.md](references/versions.md). Much of dev.28 to dev.29.18 ran only on test servers, in host tests
   or under Wine: take the verification status from the release notes' "Checked" and "Not yet" text and never claim more.
   Server/offline verification does not establish client rendering, input or multiplayer behavior. The official
   launcher has Nexus integration switched off: import downloaded archives by hand.
3. Decide the side and what players need, before writing code:
   - `side`: `server` (default), `client`, or `both`;
   - `clients`: `none` (vanilla players can join), `kiln` (players need Kiln; the server sends definitions), or `mod`
     (players need this mod, from a server modpack). A stated `kiln` or `mod` makes servers refuse vanilla clients.

## Workflow

1. **Scaffold**: `kiln new <template> <Name> --server <server>` (`kiln new --list`; or `dotnet new kiln-mod`). Never by hand.
   [references/setup.md](references/setup.md).
2. **Write**: to make something new, building blocks first (`kiln new spell`, `Blocks.Define`, `blocks/*.json`; [references/docs-map.md](references/docs-map.md)): no GUIDs, no base items. `kiln blocks show <name>` says what a block became. Data over code where you can.
   [references/blocks.md](references/blocks.md) for the block families, then [references/data-packs.md](references/data-packs.md),
   [references/quests-talents-sounds.md](references/quests-talents-sounds.md),
   [references/vfx.md](references/vfx.md),
   [references/api.md](references/api.md),
   [references/gameplay.md](references/gameplay.md) (queries, terrain, refusable events, stations, gems).
   Data the game reads once at start (Flame Altars, experience per level): OnBoot and resource patches,
   [references/boot.md](references/boot.md). Heavy work: Kiln tasks, [references/tasks.md](references/tasks.md).
3. **Check names**: `kiln catalog search`. Never guess game ids or field paths.
4. **Build and deploy** to a local test server: `kiln build && kiln deploy`, then `kiln run`.
5. **Check the log**: `kiln logs --mod <id>` for `mod <id> <version> loaded in … ms`, or the reason it didn't load.
6. **Hot reload** after each change: `kiln deploy --reload`.
7. **Test** in the server with `[KilnTest]` methods: `kiln test`. dev.26+: the same methods offline under `dotnet test`
   (`Kiln.TestKit`), and `[ClientCheck]` for what a player must see. [references/testing.md](references/testing.md).
8. **Package**: `kiln pack`. dev.28+: `kiln publish` makes a GitHub release in steps you confirm, and `updates` in the
   manifest gives players update notices ([references/devkit.md](references/devkit.md)).

`--json` on any `kiln` command gives one JSON document; exit 0 ok, 1 failure, 2 usage.
[references/devkit.md](references/devkit.md).

Never deploy to a server players are using. Use a separate local test server.

## Rules that matter

- **Tick thread.** `OnLoad`, `OnUnload` and ordinary server event handlers run on the tick thread; their `await`
  continuations return there. Game state must be touched there. ECS/system-hook callbacks instead run on game workers;
  see [references/world-programs.md](references/world-programs.md). From other threads, use `Context.Scheduler.Post(...)`
  or `await Context.Scheduler.NextTick()`. Never block the tick thread (`.Result`, `.Wait()`, `Thread.Sleep`); commands
  run there too. dev.29.18+: move heavy work into a Kiln task (`Context.Tasks.Run`) and hand results back in small pieces.
- **Client threads.** Client-world work runs on the main thread (`Client.Tick`, `Client.Post`). Draw functions run every frame:
  keep them short.
- **Register in `OnLoad`, work later.** On a client `OnLoad` can run in the main menu. Do world work from
  `ServerStartedEvent` or `Client.Tick`. What the game reads once at start is set in `OnBoot` (dev.28+), never in `OnLoad`.
- **Registrations belong to one mod lifetime.** Do not retain callbacks or handles from an old load. Release threads, timers,
  sockets, files and static references held by non-mod code. ECS bindings drain callbacks at unload but keep an inert scheduler
  entry until restart; see [references/world-programs.md](references/world-programs.md).
- **Item state (dev.20+).** Use `Items.Move` for gear transfers, not take + give. Item-entity `EntityData` is session-only.
  dev.26+: `InstanceData` keeps a value on one item (a player's inventory not yet seen by a player). dev.27+: `Affixes`
  rolls bonuses onto one item; define the kinds and pools as blocks.
  [references/api.md](references/api.md#persistent-data).
- **Changes are layers.** They come off when the mod unloads. Do content changes in `Content.OnReady(...)`.
- **Fixed ids.** GUIDs of items, recipes, clones, perks, buffs, tree nodes and NPCs, and ids of quests, steps and talents, never
  change after release. Saves keep them. For native quests and dialogue, names and option order feed the ids too.
- **Fail soft.** Check `X.Available` and degrade: services can be missing on a build Kiln doesn't know. dev.26+:
  `Capabilities.Is(name)` / `Why(name)`; an off capability throws `KilnUnavailableException`. dev.27+: every service
  does, and KILN121 warns when a `[RequiresCapability]` member is used with nothing asking first. A mod that cannot work
  without a row names it in `KilnFeatures` (`tasks.pool`), so Kiln does not load it where the row is off.
- **Read every result (dev.27+).** A refusal by the game is a result with `Ok = false` and a `Reason`, not an exception.
  KILN120 warns when nobody reads one; pass the reason on to the player or the log.
- **Never ship Kiln assemblies.** Kiln.Sdk references them with `ExcludeAssets=runtime`.
- **Never ship game data.** Models, sounds, Impact programs and catalogs are made on the user's machine. Ship your sources and a
  `cook.json`. `assets/cooked/` stays out: dev.27+ a cooked file no local cook receipt lists loads with a warning, and a
  later release refuses it.
- **Faults disable your mod, not the server.** 5 exceptions in 60 s by default. Fix the cause, then `reload <id>`.
- **Say what you haven't seen.** A dedicated server draws nothing and has no sound. Report what only a player can see or hear as
  "needs a client check" until you've seen it. What Kiln itself has confirmed: https://frostdev.io/kiln/wiki/status.

Mistakes seen in practice: [references/pitfalls.md](references/pitfalls.md). What has no API yet, hard caps and the
planned release: `docs/kiln/modding/limits.md`.

## Checks before you call it done

- `kiln build` passes with no `KILN0xx` errors and no `KILN1xx` warnings you didn't mean.
- `kiln lint` is clean (with a catalog: `kiln catalog build`).
- The log shows the mod loaded, no `[E] [mod:<id>]` lines and no data-pack problems.
- `kiln test` passes, also after a hot reload.
- `echo "reload-test <id> 10" > kiln/control/rt.cmd` reports no leaked load contexts.
- An advanced mod: `kiln/state/hooks.json` shows your link on the right function (and `linkSlots.used` does not grow on each
  command), and kiln.log has no `hooks:` warning you didn't expect.

## When something isn't documented

Don't guess at game internals. Read the wiki and the XML docs that ship with Kiln.Api. If a service doesn't offer what you need,
say so instead of patching game memory. Wrapping one of the game's own ECS programs (`Kiln.Systems`, dev.29+) is a typed
service, not the advanced tier: [references/world-programs.md](references/world-programs.md). Low-level hooks are for mods that opt into the advanced tier (`"advanced": true`);
the short rules (kiln.hooks v2: link order, `caller()`, link slots, `hooks.json`; closed DLL mods and `[late]`; EML and EMF
notes) are at the end of [api.md](references/api.md).
