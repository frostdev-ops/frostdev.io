---
title: "Your first mod"
description: "Make a mod from a template, build it into a test server, change it while the server runs, and test it."
status: "works"
updated: "2026-11-12"
---

## What you need

- The .NET 10 SDK.
- A test server with Kiln, not one people play on. See [Run a server](/kiln/wiki/servers).
- Kiln's matching SDK/MDK download and the [`kiln` command](/kiln/wiki/cli), both under
  [Mod authors](/kiln/download#authors) on the download page, or a source-built MDK. Unpack the download:
  the folder holding the `.nupkg` files is the local package "feed". Point `kiln new` at it with `--feed` or `$KILN_FEED`.
  Use the full package version (`0.2.0-dev.26` for this release), not the API base `0.2.0`.
  Since 0.2.0-dev.26 the packages are also on a NuGet feed, for `dotnet` and your IDE: the source is
  `https://frostdev.io/kiln/downloads/0.2.0-dev.26/sdk/feed/index.json`. `kiln new` still takes the unpacked folder.

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
dotnet new install "<feed>/Kiln.Templates.0.2.0-dev.26.nupkg" # once; use your MDK's full version
dotnet new kiln-mod -n MyMod --feed <feed> --server <folder> --tests
dotnet build -t:KilnDeploy                                 # add -p:KilnReload=true to reload
dotnet build -t:KilnPack
```
