---
title: "The kiln command"
nav: "The kiln command"
description: "One command for a mod's whole life: create, build, cook, deploy, run, reload, test, debug, lint, pack, publish and read logs."
status: "works"
updated: "2026-11-17"
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
| `kiln cook [--check] [--force] [--game DIR]` | every `cook.json`: models, Impact, sounds. `--check` exits 1 when a cook is needed; `--force` cooks every recipe again |
| `kiln deploy [--server S] [-r\|--reload]` | copies into the server; hot reloads |
| `kiln pack [-o DIR]` | `<id>-<version>.zip` |
| `kiln run [--server S] [--stop\|--restart\|--status] [--wait SECONDS]` | starts a server and follows its log until it's up |
| `kiln reload [ID]` | [hot reload](/kiln/wiki/hot-reload) |
| `kiln test [ID] [FILTER] [--exact NAME]` | runs [tests](/kiln/wiki/testing), prints the report |
| `kiln debug [--dap]` | a [debugger](/kiln/wiki/debugging) on a running local server |
| `kiln logs [-f] [--mod ID] [--level D\|I\|W\|E] [-n N]` | kiln.log, filtered |
| `kiln lint [PATH…]` | the [linter](/kiln/wiki/lint) |
| `kiln catalog status\|build\|path\|search` | the [catalog](/kiln/wiki/catalogs) |
| `kiln blocks list [--mod ID]`, `kiln blocks show NAME [--programs]` | what a server's mods' [building blocks](/kiln/wiki/blocks) became, and what went wrong |
| `kiln vfx info <name\|guid>` | one game VFX from the catalog: what finds it, how long it runs, what it takes |
| `kiln skeleton player OUT.glb [--body male\|female\|none]` | the player's skeleton from your game, to weight a worn model against. It holds the game's data: keep it out of your mod |
| `kiln publish …` | a packed mod as a GitHub release, in steps you confirm ([below](#publishing-a-release)) |
| `kiln updates check [--offline] [--refresh]` | looks for a newer version of every installed mod; a notice and a link per mod, nothing downloaded or changed ([Mod updates](/kiln/wiki/profiles#mod-updates)) |
| `kiln boot-snapshot --game DIR [--force]` | the game-data snapshot [OnBoot](/kiln/wiki/onboot#the-games-data-in-onboot) reads, once per game build: about a minute and 200 MB the first time |

Native mods load once per start: follow `kiln deploy` with `kiln run --restart`.

## Which project, which server

Commands act on the current folder, or take a `.csproj` or mod folder. `--server` takes a folder or a server's name, then falls
back to `$KILN_SERVER` and the project's `KilnServer`. `kiln run` starts servers the launcher or kilnctl knows.

The feed: `--feed` or `$KILN_FEED`. The game: `--game`, `$KILN_GAME`, or your Steam install.

## Publishing a release

New in 0.2.0-dev.28. `kiln publish` makes a GitHub release of a packed mod: the zip, its checksum and a
`kiln-release.json` that Kiln's [update check](/kiln/wiki/manifest#update-checks-updates) reads. A `kiln.publish.json`
next to your project names the repository, the tag (`v{version}`) and the full commit id; it never holds a token.

```sh
kiln publish --store-token github                                   # paste the token; read from standard input
kiln publish --project . --to github --plan release-plan.json       # 1. a plan you read; sends nothing
kiln publish --apply release-plan.json --confirm                    # 2. a draft release with three files
kiln publish --publish-draft <transaction> --confirm                # 3. the draft goes public
```

- **The plan** checks the zip for game data, cooked files, saves and secrets, and freezes it. Change the zip, the notes
  or the config, and make a new plan.
- **The apply** makes a draft. A run that stopped goes on with `--resume <transaction> --confirm`, and never uploads
  anything twice: Kiln asks GitHub what exists first.
- **The token** is a fine-grained GitHub token for that one repository, kept in your system's credential store. Where
  there is none, a CI job for example, it is read from `KILN_PUBLISH_GITHUB_TOKEN`. It is never written to the plan,
  the journal, a log or an error.

Not yet tested against GitHub itself, only against recorded answers: make your first release to a repository you can
delete.

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
