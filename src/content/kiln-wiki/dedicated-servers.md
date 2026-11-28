---
title: "Kiln on a dedicated server"
nav: "Dedicated servers"
description: "Put Kiln on an Enshrouded dedicated server: a rented host over FTP, your own Windows PC, or a headless Linux machine."
status: "partial"
updated: "2026-11-27"
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

Honest note: Kiln's own tests of the server side run under Wine on Linux, not on a real Windows PC. A player has run
0.2.0-dev.26 on Windows Server 2022 with Windows 11 games and reports that it works (GitHub issue 23). If something
behaves differently for you, please report it. One difference is known: on a native Windows server, a mod's new items and
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

### What a slow start is doing

Since 0.2.0-dev.27 Kiln writes the step it is in to `kiln/state/progress.json` while the server starts: what it works
on, how far it got, and what every finished step took. The file stops changing when the start is over: `state` is then
`ready` (the world runs with the mods loaded), `idle` (safe idle; `why` says why) or `failed` (`why`). A file whose
`pid` isn't the running server's is from an earlier start.

```sh
jq -r '"\(.state) after \(.atMs / 1000) s"' kiln/state/progress.json
jq '.steps[]' kiln/state/progress.json    # the step without tookMs is the one running
```

Over FTP, download the file and open it in any text editor.

### When Kiln stops the start

Kiln ends a start on purpose, before any world loads, when going on would cost a world its mods' progress. The process
then exits with a code that says why, and restarting gives the same stop every time. **Don't restart it: fix the mod
list.** The last kiln.log lines and the file in `kiln/state/` name the mods.

| Exit code (Windows) | Under Wine | Why | Says more |
|---|---|---|---|
| 0x4B01 (19201) | 1 | a required boot mod's content could not be applied | `kiln/state/boot.json` |
| 0x4B02 (19202) | 2 | the mods add more NPCs to the [roster](/kiln/wiki/npcs#a-roster-of-128) than this server can hold | `kiln/state/roster-refused.json` |
| 0x4B03 (19203) | 3 | the mods' NPCs and quests could not be built at all (since 0.2.0-dev.29) | `kiln/state/content-refused.json` |

- The release's `kiln@.service` has `RestartPreventExitStatus=1 2 3` since 0.2.0-dev.29, so systemd doesn't restart on
  these: install the new unit file from the [download page](/kiln/download#servers) and run
  `systemctl --user daemon-reload`. A unit of your own with `Restart=on-failure` or `Restart=always` needs that line too.
- Tell a hosting panel or a restart script the same: status 1, 2 or 3 (19201, 19202 or 19203 on Windows) is a
  configuration error, not a crash.
- Under Wine, statuses 1, 2 and 3 also come from ordinary failures, so a server kept down this way may have failed for
  another reason: read `kiln.log` before you start it again. On Windows the whole code is Kiln's.
- `kilnctl run`, `start` and `status` print the reason, and the launcher shows it.

## Admin without a desktop

| Way | Where it works | What you need |
|---|---|---|
| Chat commands (`/help` in game) | everywhere | admin rights: a user group in `enshrouded_server.json` that may kick and ban, or a rule in `kiln/config/permissions.json` ([Permissions](/kiln/wiki/permissions)) |
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

### Kick and ban

Since 0.2.0-dev.27 Kiln has commands of its own, for the Admin level or the [permission nodes](/kiln/wiki/permissions)
`kiln.command.kick`, `kiln.command.ban`, `kiln.command.unban` and `kiln.command.bans`:

| Command | Does |
|---|---|
| `/kick <player> [reason]` | kicks a player who is in game; they can join again. A player with Kiln reads the reason, one without gets the game's "could not join" |
| `/ban <player\|steamid> [30m\|12h\|7d] [reason]` | bans by Steam id, for a while or for good, and kicks the player if in game |
| `/unban <steamid>` | takes a ban off |
| `/bans` | lists the bans |

The ban list is `kiln/data/kiln-players/bans.json`, kept for every world of the server and apart from the game's own
ban list. A ban that can't be written to disk is refused instead of
holding until the next restart. Tested with test connections on a test server, not yet with a real player's game.

**NoClip is off until you allow it.** `/noclip` lets an admin fly through the ground and walls; set
`"allowNoClip": true` in `kiln/config/rules.json` to allow it (edits apply within a second). See
[NoClip](/kiln/wiki/player-rules#noclip).

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

### EML mods on a server that runs ShroudForge

When the server's `mods/` holds a switched-on ShroudForge mod, or ShroudForge ran there before, Kiln lets ShroudForge run
the EML mods too. ShroudForge runs an EML mod only while its `extended.mod.json` says `"enabled": true`. An EML mod you
unzip yourself has no such file, so ShroudForge keeps it off, and a server has no in-game menu to switch it on.

Put this file into each EML mod's folder (`mods/<mod>/`, next to its `mod.json`) as `extended.mod.json`. If the mod
already has one, set its `"enabled"` to `true`:

```json
{"schemaVersion":1,"launcher":"EML","enabled":true,"targets":["client","server"],"settings":{}}
```

Then restart the server. Without ShroudForge, Kiln runs the EML mods itself and the file does no harm.

Since 0.2.0-dev.30.3 `kiln/logs/kiln.log` names the EML mods nothing runs, in one warning at the start:
`kiln-eml: 2 EML package(s) in … are switched off in ShroudForge or refused by it, so nothing runs them (…)`.
`kiln/state/eml.json` lists each as `off-in-shroudforge` with what to do. EML mods in `kiln/eml/mods` don't run in such
a start either, because ShroudForge reads only its own folder: move them to `mods/`.

### Mods with a cook recipe

Some Kiln mods make files from the game's own files on each machine (`assets/cook.json`: player animations, models,
sounds); the mod's archive doesn't carry them. A mod that gives weapons **their own attack animations** needs these files
on the server too: without them the server leaves those animations out, and then refuses every player whose game has
them. Cook it on the server:

```
kiln cook <server folder>/kiln/mods/<mod> --game <server folder>
```

`kiln` is the command line tool in a release's `sdk/` folder ([download page](/kiln/download#authors)). Since
0.2.0-dev.27 it carries the cook tools itself and unpacks them on first use: no Kiln source and no `KILN_REPO` are
needed (a checkout still wins when `KILN_REPO` names one). It needs Python 3.10 or newer on the machine, and says what
is missing; on Windows, set `KILN_PYTHON` to a `python.exe`. So this works on your own server, not on a rented one with
only FTP. The cook makes what the server uses and skips the models, which only a player's game draws. Cook again after
every game update.

**Cook receipts.** Each cook records what it wrote, in the server's `kiln/state/cook-receipts`. A cooked file no
receipt lists (copied from a PC, from a download, or cooked by 0.2.0-dev.26 or older) still loads, with a warning in
kiln.log. After updating to 0.2.0-dev.27 you don't have to do anything, but run the `kiln cook` line once for each mod
with a recipe: it writes the missing receipts and the warnings go. A later release will refuse cooked files without a
receipt; `"cooked": "local"` in `kiln/kiln.json` does so now, and `"cooked": "any"` loads them without a word (for a
development server).

No Python on the server? Cook the mod on a PC with the game, then copy the mod's folder with its `assets/cooked` folder
and `assets/assets.json` to the server. That works when the PC's game and the server run the same Enshrouded update.
Those copied files have no receipt on the server, so they load with the warning above.

Your players' launchers cook such a mod when they press **Play** ([Mods the launcher
cooks](/kiln/wiki/install#mods-the-launcher-cooks)). A player who starts the game without it cooked sees the plain
weapon, and for a mod with attack animations the join is refused.

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

### Boot mods

Since 0.2.0-dev.28 a Kiln mod with `"boot"` in its `kiln.mod.json` puts its content, and its changes to the game's own
data, in place before the game reads them ([OnBoot](/kiln/wiki/onboot)). On a dedicated server that works from the
very first start: no second restart for new items, spells or talents, and a mod that changes experience per level or
Flame Altars per base works at once.

- **Restart after changes.** A boot mod you add, enable or update while the server runs loads at the next start.
- **A required boot mod** (`"boot": "required"`) whose content can't be applied stops the start before any world or
  save is loaded, also for one bad entry in its own files. What only a loading world shows (a skill node the tree build
  leaves out, an item, recipe or clone the world does not register) stops it while that world loads, before a player
  is in it. The process ends with exit code `0x4B01` (1 under Wine), the last kiln.log line says which file of which
  mod to fix, and `kiln/state/boot.json` has the same. A boot mod that
  isn't required is left out instead, and named in kiln.log; a bad entry in its files is left out on its own.
- **Game data for OnBoot.** A boot mod that reads the game's data needs a snapshot of the server's game files. Make it
  once per game update, with the `kiln` tool from a release's `sdk/` folder (it needs Python, as the cook does):

  ```
  kiln boot-snapshot --game <server folder>
  ```

  It takes about a minute and 200 MB the first time. Without it such a mod finds the game's data "not ready" and does
  without, or is left out; kiln.log says which.
- Players who join need a mod that [changes the game's data](/kiln/wiki/onboot#resource-patches) too: put it in your
  modpack. Since 0.2.0-dev.29 a boot mod loads in a player's game, so a server no longer turns away players who have
  Kiln and the mod. At the join Kiln compares what each boot mod made on both sides: a player whose settings of the mod
  differ from yours gets a warning that names the mod (or is turned away under `modSync: refuse`), and should take your
  settings and restart the game ([Settings and joining players](/kiln/wiki/onboot#settings-and-joining-players)). Give
  players your mod settings with the modpack.
- **Keep `kiln/data` in your backups.** It holds the terrain records that stop a terrain mod from rebuilding its ground
  over your players' changes (`kiln/data/kiln.terrain`), the journal of temporary edits
  (`kiln/data/kiln.build/transient`), and the sizes mods set on props. If you remove the mod that set a size, those
  props go back to normal size.

### World queries

Mods can ask the world where the ground is, whether a wall stands between two creatures and how to walk somewhere
([Questions about the world](/kiln/wiki/world-edits#questions-about-the-world)). All mods together share a budget of
rays each server step. `kiln/config/kiln.queries.json` sets it, read once at the start:

```json
{ "format": 1, "maxRaysPerStep": 64, "maxRayMicrosecondsPerStep": 500 }
```

`maxRaysPerStep` is 1 to 4096, `maxRayMicrosecondsPerStep` 1 to 10000. A file that is wrong gives both defaults and a
warning in kiln.log.

### Room for mods' content

- **Buffs.** Since 0.2.0-dev.29 a server can carry up to 4,096 mods' buffs (1,024 before). Joining needs Kiln; a player
  whose game has less room than the server uses is turned away at the join, with both numbers in the message.
- **NPCs.** The Survivors roster holds 93 mod NPCs (29 before). A server whose mods add more than 29 needs Kiln
  0.2.0-dev.29 or later on the server and in every player's game ([A roster of 128](/kiln/wiki/npcs#a-roster-of-128)).
- **Terrain.** All mods' terrain work shares one budget per server step: 4,096 written and 32,768 read cells and 2 ms.
  A large terrain patch now takes a few seconds instead of one long hitch.

## Game updates

Every Enshrouded update changes the server program. Kiln checks the build at every start:

- **Kiln knows the build:** nothing to do.
- **Kiln doesn't know it yet:** the server runs normally, without Kiln's hooks and C# mods. Your save stays fine. Parts
  that start before the game and need no hooks can still run, such as EML data mods. A Kiln update with the new build
  usually follows; then update Kiln (below).

Players' games are separate: their Kiln needs to know their game build too. Players with the launcher get that from
Kiln updates in the launcher.

Registry edits (since dev.31) have their own commands: `kilnctl registry rollback <server>` runs the next starts on the last good start's
plan instead of the mods' current registry edits (`--clear` ends it), and, since 0.2.0-dev.32 (beta 1, on the beta channel), `kilnctl registry replay <server>
--opt-in <mod>` lets Kiln re-apply a ShroudForge or EML package's recorded effect after a game update that broke its Lua
([Registries](/kiln/wiki/registries#other-loaders-packages-conflicts-and-effect-replay)). The launcher's Conflicts page shows both.

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

Update the server and your players together when a release changes the join: in 0.2.0-dev.29 every player with Kiln
was turned away from a server run by Kiln, and 0.2.0-dev.29.1 (needed on both sides) fixed it.

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

- A real Windows PC in Kiln's own tests: they run the server side under Wine. One player reports 0.2.0-dev.26
  working on Windows Server 2022.
- Rented hosts: none tried yet. Hosts that run Windows servers under Wine need the `WINEDLLOVERRIDES` setting from the
  host.
- A modpack built for a rented server from a local copy of its folder.

Tested: a headless Linux server set up from the 0.2.0-dev.17 release files with `kilnctl`, start to stop, Kiln running on
a verified build. The server pack holds the same files `kilnctl` installs.
