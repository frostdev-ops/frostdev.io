---
title: "Kiln on a dedicated server"
nav: "Dedicated servers"
description: "Put Kiln on an Enshrouded dedicated server: a rented host over FTP, your own Windows PC, or a headless Linux machine."
status: "partial"
updated: "2026-11-12"
---

This page is for server owners. It shows how to put Kiln on an Enshrouded dedicated server, check that it runs, add
mods, and take Kiln off again. You don't need to build anything.

## Pick your route

| Your server | What you download | How you install |
|---|---|---|
| Rented (GTXGaming, G-Portal, ...): you only have FTP or a file manager | the [server pack](/kiln/download/server) | unzip it into the server folder |
| Your own Windows PC | the [server pack](/kiln/download/server), or the [Kiln Launcher](/kiln/download) | unzip, or the launcher's Servers page |
| Your own Linux machine, no desktop | [`kilnctl`](/kiln/download#servers) and the [Kiln runtime zip](/kiln/download/runtime) | a few `kilnctl` commands |

Downloads: the [download page](/kiln/download) has the server pack, `kilnctl`, the runtime zip and the systemd units,
each with its size and SHA-256. They are also on every [Kiln release on GitHub](https://github.com/frostdev-ops/kiln/releases),
and the optional files on [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301?tab=files). On Nexus the server pack
is the optional file **Kiln server pack**; kilnctl is in **Kiln runtime (manual install)**.

0.2.0-dev.17 and older have no server pack: unzip `kiln-runtime-<version>.zip` the same way instead.

## The server pack

`kiln-server-<version>.zip` ([download](/kiln/download/server)) holds exactly what a server needs:

| In the zip | What it is |
|---|---|
| `dinput8.dll` | loads Kiln when the server starts |
| `kiln/` | Kiln: its core, services, its own .NET runtime, the server's symbol files, the admin module, and the server parts for [other frameworks' mods](/kiln/wiki/other-mods): EML, ShroudForge, EMF and the rest |
| `KILN-SERVER-README.txt` | the short version of this page |

Unzipped into the folder with `enshrouded_server.exe`, it's a complete install: the same files `kilnctl` installs on a
Linux server. Nothing else needs installing; Kiln brings its own .NET. The server pack ships from 0.2.0-dev.18.

Before you start, every route:
- Stop the server.
- Back up the savegame folder.
- Look for a `dinput8.dll` already in the server folder. That's another mod loader. Unzipping replaces it, and that
  loader stops working, so keep a copy. `kilnctl` and the launcher keep the other loader running next to Kiln; a plain
  unzip can't. Often you don't need it anyway: Kiln runs EMF and ShroudForge mods by itself.

## Rented server

1. Stop the server in your host's panel.
2. Unzip the server pack on your PC. You get `dinput8.dll`, the `kiln` folder and the README.
3. Connect with FTP (FileZilla, WinSCP) or open the host's file manager.
4. Go to the folder with `enshrouded_server.exe`.
5. Upload `dinput8.dll` and the whole `kiln` folder into it. Keep the folders as they are.
   Some file managers can unzip: then upload the zip into that folder and unzip it there.
6. Start the server. Wait a minute.
7. Open `kiln/logs/kiln.log` and check it (see [Does it work?](#does-it-work)).

| You see | Why | What to do |
|---|---|---|
| no `kiln/logs/kiln.log` at all | the server didn't load `dinput8.dll` | check it sits next to `enshrouded_server.exe`, not in a subfolder |
| still no log, and the host runs Linux | some hosts run the Windows server under Wine, which needs `WINEDLLOVERRIDES="dinput8=n,b"` | ask the host's support to set it |
| the host deletes or blocks the DLL | some hosts don't allow custom DLLs | ask support; there's no way around it |

We haven't tried Kiln on a specific rented host yet. If you do, please tell us how it went.

## Your own Windows PC

1. Install the dedicated server: Steam's **Enshrouded Dedicated Server** (in your Library under Tools), or SteamCMD
   (app 2278520).
2. Stop the server.
3. Unzip the server pack into the server folder, usually `...\steamapps\common\EnshroudedServer`.
4. Start the server as usual. Windows loads `dinput8.dll` from that folder by itself; no setting needed.
5. Check `kiln\logs\kiln.log`.

The Kiln Launcher can do this too: its **Servers** page finds Steam's server, installs Kiln, starts and stops it, and
has admin pages. See [Run a server](/kiln/wiki/servers).

Honest note: Kiln's server side has been tested under Wine on Linux, not yet on a real Windows PC. It should behave
the same. If it doesn't, please report it. One difference is known: on a native Windows server, a mod's new items and
recipes did not register (GitHub issue 14: Kiln found no free memory within reach of the game's item data). dev.22 fixes
that. The fix was checked with replayed address-space layouts and under Wine, not yet on a Windows PC.

## Your own Linux server

On Linux the server runs under Wine. `kilnctl` does the whole job without Steam or a desktop: it installs the game with
SteamCMD, makes the Wine prefix, installs Kiln, and runs the server.

You need `steamcmd`, GE-Proton (in a Steam `compatibilitytools.d` folder) or your distro's wine, and Linux 6.14 or newer
for `/dev/ntsync` (or set `require_ntsync = false` in the instance file).

From the [download page](/kiln/download#servers), put `kilnctl` in `~/.local/bin` (on GitHub it's called
`kilnctl-<version>-linux-x86_64`) and keep [`kiln-runtime-<version>.zip`](/kiln/download/runtime) somewhere. Then:

```sh
install -Dm755 kilnctl ~/.local/bin/kilnctl
kilnctl init myserver --dir ~/srv/enshrouded/myserver --port 15637   # the instance file
kilnctl install myserver                                              # the game, through SteamCMD
kilnctl prefix myserver                                               # the Wine prefix
kilnctl deploy myserver --bundle kiln-runtime-<version>.zip           # Kiln's server parts
kilnctl preflight myserver                                            # every check; fix what fails
kilnctl start myserver                                                # returns when the world runs
kilnctl status myserver
kilnctl stop myserver                                                 # saves, then stops
```

To keep it running and start it at boot, use the systemd units (`kiln@.service`, `kiln-backup@.service`,
`kiln-backup@.timer`; from 0.2.0-dev.18 they come with each release: three separate files on the
[download page](/kiln/download#servers), and `kiln-systemd-units-<version>.tar.gz` on GitHub):

```sh
install -Dm644 -t ~/.config/systemd/user kiln@.service kiln-backup@.service kiln-backup@.timer
systemctl --user daemon-reload
systemctl --user enable --now kiln@myserver                # start now and at login
systemctl --user enable --now kiln-backup@myserver.timer   # optional: a daily savegame backup
loginctl enable-linger "$USER"                             # run without anyone logged in, start at boot
journalctl --user -u kiln@myserver -f                      # the server's output
```

Running the server under Wine yourself, without kilnctl? Unzip the server pack the same way and start Wine with
`WINEDLLOVERRIDES="dinput8=n,b"`. Don't add `mscoree=` to that variable: Kiln's .NET part needs it.

## Does it work?

Open `kiln/logs/kiln.log` after the server has started.

| Line in kiln.log | Meaning |
|---|---|
| `build <long number>: verified` and `boot complete; handing control to the game` | Kiln runs, mods load |
| `safe idle: build ... is not verified ... the game runs vanilla` | the game was updated and this Kiln doesn't know the new build yet: Kiln's hooks and C# mods stay off (see [Game updates](#game-updates)) |
| no kiln.log | `dinput8.dll` wasn't loaded: wrong folder, or Wine without the setting |

On Linux, `kilnctl status myserver` shows the same build line.

Kiln doesn't load, or mods don't? Save a support report and send that zip when you ask for help:
`kilnctl report myserver`, or `kilnctl report --dir <server folder>` for a folder kilnctl doesn't manage, or **Logs** on the
launcher's server page. See [Save a support report](/kiln/wiki/debugging#save-a-support-report).

## Admin without a desktop

| Way | Where it works | What you need |
|---|---|---|
| Chat commands (`/help` in game) | everywhere | admin rights: a user group in `enshrouded_server.json` that may kick and ban, or a rule in `kiln/config/permissions.json` |
| The console folder | everywhere, also over FTP | write access to `kiln/control/console/` |
| `kilnctl cmd myserver <command>` | your own Linux server | kilnctl |
| The Kiln Launcher's server pages | a server on the same PC, or a Linux server it reaches over SSH | the launcher ([Admin pages](/kiln/wiki/admin-pages)) |

**The console folder.** Put a text file ending in `.cmd` into `kiln/control/console/`, one command per line (the
leading `/` is optional, `//` starts a comment):

```
help
creative status
```

Within a few seconds Kiln runs it, deletes the `.cmd` file and writes `<name>.result.json` next to it with every line's
output. The lines run as the server console, with full rights. Over FTP, upload the file as `test.txt` and then rename
it to `test.cmd`, so Kiln never reads a half-uploaded file.

- At most 64 command lines per file (blank lines and comments don't count). Later lines are skipped: split a longer
  batch into several files.
- Some commands take a while: their results can take up to 10 seconds. While one still runs, the result file says
  `"running": true`.

## Mods on the server

| Mod type | Where it goes |
|---|---|
| Kiln mod | `kiln/mods/<mod>/` (the folder with its `kiln.mod.json`) |
| Native Kiln mod | `kiln/native/<mod>/` |
| EML or ShroudForge mod | `mods/<mod>/` ([EML and ShroudForge](/kiln/wiki/eml-shroudforge)) |
| EMF mod | `emf/mods/<mod>/`, then `enabled=1` in `kiln/config/emf/<mod>.ini` ([EMF mods](/kiln/wiki/emf-mods)) |
| Enshwick, Shroudtopia or Creative Mode mod | `mods/` ([More frameworks](/kiln/wiki/more-frameworks)) |
| SET mod | `shrouded_engine_tweaks/mods/<mod>/` |
| shroudlink mod | `shroudlink_mods/<name>.dll` |
| Ember mod | `ember/mods/<mod>/`: found, but not run until Ember publishes its loader |

The server pack has Kiln's part for every framework above; the README lists them. Restart the server after adding or
removing mods.

Players need some of these mods too, EML data mods above all. Kiln's join check doesn't compare other frameworks' mods
yet, so tell your players or put them in your modpack. See [Servers and players](/kiln/wiki/other-mods#servers-and-players).

### Mods with a cook recipe

Some Kiln mods make files from the game's own files on each machine (`assets/cook.json`: player animations, models,
sounds); the mod's archive doesn't carry them. A mod that gives weapons **their own attack animations** needs these files
on the server too: without them the server leaves those animations out, and then refuses every player whose game has
them. Since 0.2.0-dev.26 you can cook on the server:

```
KILN_REPO=<a Kiln source checkout> kiln cook <server folder>/kiln/mods/<mod> --game <server folder>
```

This needs Python 3 and Kiln's source (the cook tools are its `tools/` folder), so it works on your own server, not on a
rented one with only FTP. The cook makes what the server uses and skips the models, which only a player's game draws.
Cook again after every game update.

No Python on the server? Cook the mod on a PC with the game, then copy the mod's folder with its `assets/cooked` folder
and `assets/assets.json` to the server. That works when the PC's game and the server run the same Enshrouded update.

The launcher doesn't cook mods yet, so your players have to cook such a mod too, the same way against their own game
folder. A player who hasn't cooked the mod sees the plain weapon, and for a mod with attack animations the join is
refused.

What players need depends on the mod. Its `kiln.mod.json` says it in `clients`:

| `clients` | Players need | Players without it |
|---|---|---|
| `none` | nothing: plain Enshrouded works | join normally |
| `kiln` | Kiln; the server sends them the mod's new items and definitions | can't join without Kiln |
| `mod` | Kiln and the mod itself | refused, with a message naming the mod |

When a mod leaves `clients` out, Kiln guesses from the mod's `side` (a server-only mod: `none`, others: `mod`), but by
default only a value the mod states makes the server turn players away. See [Multiplayer](/kiln/wiki/multiplayer).

**Modpacks.** Players get `mod` mods from your server's modpack: build it in the Kiln Launcher (Servers > your server >
Modpack), upload the zip anywhere players can download over https, and enter the link. Kiln offers it to every player
who is refused for a missing mod, and their launcher installs it after they agree. The launcher builds the modpack from
the server's own mod folders, so on a rented host you'd work from a copy of the server folder, which we haven't tested
yet. See [Modpacks](/kiln/wiki/modpacks).

## Game updates

Every Enshrouded update changes the server program. Kiln checks the build at every start:

- **Kiln knows the build:** nothing to do.
- **Kiln doesn't know it yet:** the server runs normally, without Kiln's hooks and C# mods. Your save stays fine. Parts
  that start before the game and need no hooks can still run, such as EML data mods. A Kiln update with the new build
  usually follows; then update Kiln (below).

Players' games are separate: their Kiln needs to know their game build too. Players with the launcher get that from
Kiln updates in the launcher.

On Linux, `kilnctl update myserver` stops the server, backs up the save, updates the game through SteamCMD, says
whether Kiln knows the new build, and starts the server again.

## Updating Kiln

With the server pack:
1. Stop the server.
2. Delete `kiln/dotnet`, `kiln/host`, `kiln/services` and `kiln/sigdb`. They are Kiln's own files; your mods, settings
   and data live in other folders.
3. Upload or unzip the new pack the same way, replacing `dinput8.dll` and the files in `kiln/`. Edited
   `kiln/kiln.json`? Don't overwrite it, or make your change again after.
4. Start the server and check `kiln/logs/kiln.log`.

With kilnctl: `kilnctl stop myserver`, `kilnctl deploy myserver --bundle kiln-runtime-<new version>.zip`,
`kilnctl start myserver`. kilnctl removes files the new version no longer has, keeps your `kiln/kiln.json`, and backs
up anything it overwrites.

## Removing Kiln

With the server pack:
1. Stop the server.
2. Delete `dinput8.dll` and the `kiln` folder. To keep your mods' saved data, copy `kiln/data` (and `kiln/config` for
   their settings) somewhere first.
3. Start the server. It runs vanilla; your savegame isn't touched.

With kilnctl: `kilnctl bundle uninstall --dir ~/srv/enshrouded/myserver`. It removes Kiln's files and puts back
whatever it replaced, byte for byte (another loader's `dinput8.dll` too). The `kiln` folder stays with your mods,
settings, data and logs; delete it if you don't need them.

## Not tested yet

- A real Windows PC: the server side ran under Wine only.
- Rented hosts: none tried yet. Hosts that run Windows servers under Wine need the `WINEDLLOVERRIDES` setting from the
  host.
- A modpack built for a rented server from a local copy of its folder.

Tested: a headless Linux server set up from the 0.2.0-dev.17 release files with `kilnctl`, start to stop, Kiln running on
a verified build. The server pack holds the same files `kilnctl` installs.
