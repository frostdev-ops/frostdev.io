---
title: "Lint and analyzers"
nav: "Lint and analyzers"
description: "kiln lint checks your mod's JSON before the game has to. The analyzers catch thread and hot-reload mistakes in your C#."
status: "works"
updated: "2026-11-04"
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

## C# analyzers

Kiln.Sdk runs these over every mod, in `dotnet build` and live in your editor. Six have code fixes.

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

```csharp
Task.Run(async () =>
{
    var json = await Http.GetStringAsync(url);
    Chat.Broadcast(json);                  // KILN101: runs on a thread-pool thread
});
```

The fix: `Context.Scheduler.Post(() => Chat.Broadcast(json));`.

Adjust rules in `.editorconfig` (`dotnet_diagnostic.KILN105.severity = error`, or `none`), or with
`#pragma warning disable KILN101`. `<KilnAnalyzers>false</KilnAnalyzers>` turns them off. They can't see everything, so
`reload-test` still finds real leaks.

## Manifest checks

The build checks the manifest with the code that loads it: `KILN001` invalid (names the field), `KILN002` wrong `entryAssembly`,
`KILN003` a warning (unknown key, short version), `KILN004` unknown service.
