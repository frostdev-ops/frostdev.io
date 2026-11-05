---
title: "The kiln command"
nav: "The kiln command"
description: "One command for a mod's whole life: create, build, cook, deploy, run, reload, test, debug, lint, pack and read logs."
status: "works"
updated: "2026-11-04"
---

`kiln` is for mod authors, on Linux and Windows. (`kilnctl` [runs servers](/kiln/wiki/servers).) It drives Kiln.Sdk, so
`kiln deploy` and `dotnet build -t:KilnDeploy` do the same thing.

```sh
kiln new items MyItems --server <server>
cd MyItems
kiln build && kiln deploy --reload    # build, copy into the server, hot reload
kiln test                             # the mod's tests, in the running server
kiln logs --mod my-items -f
kiln pack                             # my-items-0.1.0.zip, never with cooked game files
```

| Command | Does |
|---|---|
| `kiln new --list` | the templates and their options |
| `kiln new <template> <Name> [--server S] [--feed F] [--set opt=value]` | a project from a [template](/kiln/wiki/dev-kit) |
| `kiln build [-c CONFIG] [--no-cook] [-- args]` | cooks if needed, then builds; C# or native |
| `kiln cook [--check] [--game DIR]` | every `cook.json`: models, Impact, sounds. `--check` exits 1 when a cook is needed |
| `kiln deploy [--server S] [-r\|--reload]` | copies into the server; hot reloads |
| `kiln pack [-o DIR]` | `<id>-<version>.zip` |
| `kiln run [--server S] [--stop\|--restart\|--status] [--wait SECONDS]` | starts a server and follows its log until it's up |
| `kiln reload [ID]` | [hot reload](/kiln/wiki/hot-reload) |
| `kiln test [ID] [FILTER] [--exact NAME]` | runs [tests](/kiln/wiki/testing), prints the report |
| `kiln debug [--dap]` | a [debugger](/kiln/wiki/debugging) on a running local server |
| `kiln logs [-f] [--mod ID] [--level D\|I\|W\|E] [-n N]` | kiln.log, filtered |
| `kiln lint [PATH…]` | the [linter](/kiln/wiki/lint) |
| `kiln catalog status\|build\|path\|search` | the [catalog](/kiln/wiki/catalogs) |

Native mods load once per start: follow `kiln deploy` with `kiln run --restart`.

## Which project, which server

Commands act on the current folder, or take a `.csproj` or mod folder. `--server` takes a folder or a server's name, then falls
back to `$KILN_SERVER` and the project's `KilnServer`. `kiln run` starts servers the launcher or kilnctl knows.

The feed: `--feed` or `$KILN_FEED`. The game: `--game`, `$KILN_GAME`, or your Steam install.

## For scripts and agents

`--json` on any command prints one JSON document, with tool output on stderr. Errors look like
`{"ok": false, "error": {"code", "message"}}`. Exit codes: 0 ok, 1 failure, 2 usage.

```sh
kiln test my-mod Imc_ --json | jq '.failed'
kiln catalog search "bronze sword" --section items
echo '{"format": 1, "items": {"Nope": {}}}' | \
  kiln lint --json --stdin --stdin-path content/x.json
```

Test filters match part of a test's name, case-insensitive, with no spaces. `--exact` keeps one result.
