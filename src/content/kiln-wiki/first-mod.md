---
title: "Your first mod"
description: "Make a mod from a template, build it into a test server, change it while the server runs, and test it."
status: "works"
updated: "2026-11-04"
---

## What you need

- The .NET 10 SDK.
- A test server with Kiln, not one people play on. See [Run a server](/kiln/wiki/servers).
- Kiln's packages and the [`kiln` command](/kiln/wiki/cli). Before release, both are built from Kiln's source. Point `kiln` at
  the packages' folder (a "feed") with `--feed` or `$KILN_FEED`.

## 1. Make the mod

```sh
kiln new mod MyMod --server <server folder> --set tests=true
cd MyMod
```

You get a project file, a mod class and a test class. `kiln new --list` shows every template.

## 2. Build it into the server

```sh
kiln build && kiln deploy
kiln run                    # or start the server from the launcher
```

The mod lands in `<server>/kiln/mods/my-mod/`, and the log says:

```
mod my-mod 0.1.0 loaded in … ms
```

If it didn't load, the log says why: `kiln logs --mod my-mod`.

## 3. Change it while the server runs

Edit the code, then:

```sh
kiln deploy --reload
```

The server reloads your mod within a second. See [Hot reload](/kiln/wiki/hot-reload).

## 4. Test it

Tests run at server start and after every reload, or with `kiln test`. See [Testing](/kiln/wiki/testing).

## 5. Package it

```sh
kiln pack
```

You get `my-mod-0.1.0.zip`. Players add it to their launcher library. Admins unzip it into `kiln/mods`.

## Without `kiln`

```sh
dotnet new install Kiln.Templates --add-source <feed>      # once
dotnet new kiln-mod -n MyMod --feed <feed> --server <folder> --tests
dotnet build -t:KilnDeploy                                 # add -p:KilnReload=true to reload
dotnet build -t:KilnPack
```
