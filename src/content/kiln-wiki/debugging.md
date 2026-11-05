---
title: "Debugging"
description: "Why a mod didn't load, the fault policy, crash reports, and breakpoints in a running server."
status: "works"
updated: "2026-11-04"
---

## Start with kiln.log

`kiln logs --mod my-mod`, or read `kiln/logs/kiln.log`. A mod that didn't load says why, and the others load anyway:

```
mod my-mod 0.1.0 loaded in … ms
[E] [host] mod my-mod 1.0.0 not loaded: missing dependency sample-lib ^1.0
[I] [host] mod my-mod 1.0.0 skipped: side 'client': not loaded on a server
```

Data packs log problems per file.

## The mod list

`echo mods > kiln/control/m.cmd` writes each mod's state, error, load order and cost to `kiln/control/m.result.json`.
`kiln/logs/mods.txt` always holds the current list. In code: `Mods.All`.

| State | Means |
|---|---|
| Loaded | running |
| Failed | couldn't load; `Error` says why |
| Disabled | switched off after too many faults |
| Skipped | made for the other side, or switched off |
| Unloaded | on request |

## Faults and crash reports

An exception escaping your code is a **fault**. Kiln logs it and carries on. After 5 in 60 seconds it disables the mod and writes a
crash report, and the server keeps running. Fix the cause, then `reload <id>`. Tune it in `kiln/kiln.json`:

```json
{ "mods": { "fault_limit": 5, "fault_window_s": 60, "test_timeout_s": 30 } }
```

`kiln/crash-reports/` also gets a report when an exception goes uncaught on another thread or native code faults. See them on the
launcher's **Logs** page and the admin **Crashes** page.

## Common causes

| Symptom | Likely cause |
|---|---|
| "wrong thread" | a service called from a timer or `Task.Run`; post back first |
| the server stutters | something blocks the tick thread |
| a content change isn't reapplied at world load | made in `OnLoad`; use `Content.OnReady` |
| items disappear from saves | the item's GUID changed |
| the old version runs after a reload | a thread, timer or static reference keeps it alive |

## Breakpoints

`kiln debug` attaches [netcoredbg](https://github.com/Samsung/netcoredbg) to the mods in a running local server: breakpoints, stack,
locals, watches, stepping.

> A breakpoint pauses the whole server, for everyone on it. Debug on a test server.

[VS Code](/kiln/wiki/vscode) bundles the debugger. For another editor:

1. Get netcoredbg's **win64** build (tested: 3.2.0-1092), even on Linux. Put `netcoredbg.exe` in `tools/netcoredbg/` in Kiln's data
   folder, or set `KILN_NETCOREDBG`.
2. Deploy a Debug build, so its `.pdb` goes along: `kiln deploy --reload`.
3. Start the server: `kiln run --server <name>`.
4. Use `kiln debug --server <name> --dap` as your debug adapter, and send an `attach` with no `processId`.

`kiln debug --server <name>` alone shows what it would run. Debug on the machine that built the mod: breakpoints match the
`.pdb`'s paths.

Disconnecting or closing your editor never ends the server, and a server in a Steam library is always refused. These can still hurt:

- killing netcoredbg while attached ends the server with no save: disconnect instead;
- a mod that leaks its old copy can make breakpoints miss and a disconnect end the server. `kiln debug` warns; restart first;
- watch expressions run in the server.

After `kiln reload`, disconnect and attach again.

Tested on dedicated servers under Linux and Wine. Windows servers are untested, and the game client isn't covered.
