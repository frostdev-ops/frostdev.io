---
title: "Lint and analyzers"
nav: "Lint and analyzers"
description: "kiln lint checks your mod's JSON before the game has to. The analyzers catch thread and hot-reload mistakes in your C#."
status: "works"
updated: "2026-11-15"
---

## kiln lint

Checks each file against its schema, in the JSON dialect its reader accepts, plus what a schema can't: ids across mods, game
references, the manifest against the mod's content, cook recipes, licences.

```sh
kiln lint                                   # the current folder
kiln lint MyMod/content/items.json          # one file, with the rest of its mod
kiln lint --json MyMod                      # for tools
kiln lint --profile <folder> MyMod          # check against other mods
kiln lint --min-severity warning --off KL601 MyMod
kiln lint --list-rules
```

```text
MyMod/kiln.mod.json:8:3: warning KL103: "dependecies": unknown key (Kiln.Host ignores it and logs a warning); did you mean "dependencies"?
kiln lint: 0 error(s), 1 warning(s), 0 info(s) in 1 file(s); no game-data catalog (kiln catalog build)
```

Exit code 1 means errors; warnings don't fail. Many findings carry a fix, which [VS Code](/kiln/wiki/vscode) offers as a quick fix.
A Kiln.Sdk project's manifest is read from its build output, so build once first.

| Codes | Check |
|---|---|
| KL0xx | reading the file |
| KL1xx | the schema |
| KL2xx | the manifest against the mod's content, such as `clients` |
| KL3xx | ids, GUIDs and names |
| KL4xx | game references (needs a [catalog](/kiln/wiki/catalogs)) |
| KL5xx | files, assets and cook recipes |
| KL6xx | licences and what may be shipped |

New in 0.2.0-dev.29: KL334 checks [building-material pools](/kiln/wiki/blocks#building-material-pools) (a material of a
mod you don't declare as a dependency, a wall shape with a roof pool), KL340 a
[`run` native](/kiln/wiki/blocks#a-block-effect-that-runs-your-native) whose parameter binds to nothing, and lint checks
`"world"` in `kiln.programs.json`. `"writes"` in `kiln.mod.json` is no longer called an unknown key.

## C# analyzers

Kiln.Sdk runs these over every mod, in `dotnet build` and live in your editor. The main ones:

| Id | Catches |
|---|---|
| `KILN101` | a tick-thread API called off the tick thread |
| `KILN102` | `async void` |
| `KILN103` | a process-wide event handler never removed |
| `KILN104` | a mod object stored in process-wide state |
| `KILN105` | a blocking call on the game thread |
| `KILN106` | a thread, timer, watcher, socket or subscription never released |
| `KILN107` | **error**: an advanced API without `KilnAdvanced` |
| `KILN108` | a service used but not listed in `KilnServices` |
| `KILN120` | a Kiln result (`IKilnResult`, for example from `Items.Equip` or `NoClip.Set`) that nobody reads |
| `KILN121` | a call that needs a capability, with no check of it first and no `catch` of `KilnUnavailableException` |
| `KILN034` | **error**: an `OnBoot` that never runs (no `"boot"` in kiln.mod.json and no `<KilnBoot>`), or the run-time `Blocks.Define` in boot code |
| `KILN035` | a tick, world or service API in boot code (`OnBoot`) |
| `KILN036` | **error**: a `[Query]` struct or a generated native the build can't reserve or write (two structs with one key, more than 32 programs in a file, a name too long) |
| `KILN037` | a hand-written `impact/natives.json` entry replaced by a generated one |
| `KILN109` | a client-world `EcsPrograms.TryBind` called off the game's main thread |
| `KILN170` to `KILN174` | an `[ImpactNative]` method the generator can't make (not static, a parameter or return type no native takes, a name used twice), or a project without a Kiln.Abilities that has it |
| `KILN180` to `KILN182` | a typed-hook descriptor the Kiln.Sigs generator can't use, descriptors without `Hooks` in `KilnServices`, a sigdb file that isn't JSON |

```csharp
Task.Run(async () =>
{
    var json = await Http.GetStringAsync(url);
    Chat.Broadcast(json);                  // KILN101: runs on a thread-pool thread
});
```

The fix: `Context.Scheduler.Post(() => Chat.Broadcast(json));`.

**KILN120 and KILN121** (new in 0.2.0-dev.27) follow [the contract](/kiln/wiki/code-mods#when-a-call-cannot-work). For
KILN120, check `result.Ok`, or write `_ = ...` to drop a result on purpose; the code fix offers both. For KILN121, ask
`Capabilities.Is("row")` (or the service's own guard property) before the call, catch `KilnUnavailableException`, or
mark the calling member `[RequiresCapability("row")]`. A check inside a helper of your own isn't followed. Switch the
rule off with `dotnet_diagnostic.KILN121.severity = none`.

**KILN034 and KILN035** (0.2.0-dev.28) are for [boot mods](/kiln/wiki/onboot). For KILN034, add `"boot": true` to
kiln.mod.json or `<KilnBoot>true</KilnBoot>` to a project without its own kiln.mod.json, or move the code to `OnLoad`;
stage blocks with `BootDefinitions.For(boot).Define(...)` instead of `Blocks.Define`. KILN035 leaves
`Config.Register<T>()` and reading its `Value` alone, and reports writing a setting (`Set`, `TrySet`, `Save`), `Reload`,
a `Changed` handler and `Config.RegisterWorld` there.

The rules new in 0.2.0-dev.29 belong to [world programs and wraps](/kiln/wiki/world-programs) (KILN036, KILN109),
[same-step natives](/kiln/wiki/impact#natives-that-answer-in-the-same-step) (KILN036, KILN037, KILN170 to KILN174) and
[typed hooks](/kiln/wiki/hooks#typed-hooks-and-calls) (KILN180 to KILN182). `KILNX028`, the experimental mark on
dev.28's capacity types, is gone: `NoWarn KILNX028` is no longer needed.

Adjust rules in `.editorconfig` (`dotnet_diagnostic.KILN105.severity = error`, or `none`), or with
`#pragma warning disable KILN101`. `<KilnAnalyzers>false</KilnAnalyzers>` turns them off. They can't see everything, so
`reload-test` still finds real leaks.

## Manifest checks

The build checks the manifest with the code that loads it: `KILN001` invalid (names the field), `KILN002` wrong `entryAssembly`,
`KILN003` a warning (unknown key, short version), `KILN004` unknown service.
