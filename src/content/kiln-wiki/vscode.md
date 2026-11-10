---
title: "VS Code extension"
nav: "VS Code extension"
description: "Schemas, lint, game-id hover, build and deploy, the Testing view, logs, a server console, a debugger and Impact assembly."
status: "works"
updated: "2026-11-04"
---

A `.vsix` you install yourself ([download](/kiln/download#authors)). It isn't on the Marketplace or Open VSX.

```sh
code --install-extension kiln-vscode-0.1.0.vsix
```

It uses the [`kiln` command](/kiln/wiki/cli) when present (`kiln.cli.path`), and `dotnet` otherwise. Lint and catalog builds need
`kiln`.

<!-- shot: vscode-hover | Hover on a game id in a data pack, with the item's icon -->

| Feature | What you get |
|---|---|
| Mod files | schemas for every Kiln JSON file; lint on save with quick fixes |
| Game ids | completion and hover from your [catalog](/kiln/wiki/catalogs), in JSON and C# strings; a **Game Data** view |
| **Mods** view | Build, Deploy, Deploy and Reload, Pack, Reload, New Mod, Send Control Command, as tasks with problem matchers |
| **Test Servers** view | your servers and their state; the selected one is what deploy, tests and logs use |
| **Testing** view | `[KilnTest]` methods; deploys, reloads and runs; failures link to the line |
| Follow kiln.log | coloured output; mod ids, stack frames and test names are links |
| Server console | a terminal on a running server with completion; `.ops` lists admin operations, `.op <name>` calls one |
| Impact assembly | highlighting, hover, completion, snippets and live checks for `.kimp` and `.kpatch` |

A folder inside a Steam library is read-only: the extension follows its log but never deploys to it or starts it.

## Debugger

<!-- shot: vscode-breakpoint | A breakpoint hit in a running server's mod -->

Add this to `launch.json` and press F5, or right-click a running server: **Attach Debugger to Test Server**.

```json
{ "type": "kiln", "request": "attach", "name": "Kiln: attach", "server": "my-server" }
```

netcoredbg comes with the extension. Deploy a Debug build: Release breakpoints never bind. See
[Debugging](/kiln/wiki/debugging).

## Impact commands

**New Impact Program**, **Cook Impact Programs**, **Disassemble Impact Program**, **FNV-1a Hash**. A disassembly opens unsaved:
it's game data, so never save it into a mod.

Impact checks and starting local test servers need Kiln's source (`kiln.root`) and `python3`.
