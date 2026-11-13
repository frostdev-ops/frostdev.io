---
title: "What works today"
description: "What Kiln does in the current build, what awaits a game test, what's being built and what isn't, as of November 2026."
updated: "2026-11-13"
---

Kiln is in early access: dev builds on [Nexus Mods](https://www.nexusmods.com/enshrouded/mods/301),
[GitHub](https://github.com/frostdev-ops/kiln/releases) and [this site](/kiln#download). This page describes **0.2.0-dev.27**, the current development release; check the download's version before using its new APIs.

"Works" means it has run on a test server or in the game. "Seen in the game" means a player saw it in Enshrouded, in the
test sessions of 6 and 7 November 2026, or, for dev.24 and later, in the one real game the release's notes name (Linux,
Proton, one client). Where only a game can show the result, it's under
[Built, game test pending](#built-game-test-pending) until a player has seen it. Things that failed in those sessions are
listed under [Open in the game](#open-in-the-game); some have had fixes since that still need a game test.

## New in 0.2.0-dev.27

NoClip, asked for on GitHub (issue 25), the launcher cooking the mods that need it, several mods switched at once, and
the calls mods were missing: take a buff off, see where a player looks, kick and ban, hear only the hits you care about,
put an item on a player, choose the weather, roll affixes onto an item. EMF mods built for EMF 0.6.3 and later start
again. **Seen in a real game (13 November, a hosting game on Linux and Proton):** NoClip switched on and off as a player,
and the scrolling pause menu with 10 mods' entries. The rest ran on test servers with stand-ins for players, in Kiln's
tests and in the launcher's browser test bench; what a player's own game shows waits for the guided client pass.

| Area | Included in dev.27; evidence and remaining limits |
|---|---|
| [What Play is doing](/kiln/wiki/install#when-you-press-play) | a progress bar with the step that runs, until the game's main menu; from the second start with the same mods, the time left. Launcher tests |
| [The launcher cooks](/kiln/wiki/install#mods-the-launcher-cooks) | mods with a cook recipe are cooked when you press Play, with no Kiln source; **Cook again** in a mod's menu. On Windows the launcher brings its own Python. The Windows cook is compile-checked only; the tools were run on Linux |
| [Several mods at once](/kiln/wiki/profiles#several-mods-at-once) | tick boxes, Shift+click, Ctrl+A; switch on, off or remove in one go. **All on** and **All off** with Undo. L2 and R2 on the Steam Deck. Tests and the browser test bench, not the installed launcher |
| [Changed on disk](/kiln/wiki/profiles#changed-on-disk) | a mod you edited in its own folder shows **Changed on disk** with **Use the changed files**, instead of "library hash mismatch" at Play. Tests and the browser test bench |
| [Save editor](/kiln/wiki/install#your-saves) | an **Editor** tab on the Steam Deck; changes stay when you leave the page; **Read again** instead of overwriting a save the game wrote; amounts up to 65,535 (GitHub issue 23). Browser test bench only |
| [NoClip](/kiln/wiki/player-rules#noclip) | `/noclip` for admins, off on every server until `"allowNoClip": true`. Switching it on and off: seen in a real game. Ending it inside the ground, death, other players' view and a dedicated server: not tried in a game |
| [Menu entries](/kiln/wiki/profiles#menu-entries-of-mods) | the pause menu scrolls when mods add more entries than fit; every entry is also on Kiln's Mods page. Tried in one real game at one resolution |
| [Mouse key bindings](/kiln/wiki/game-ui#hud-toasts-and-keys) | Mouse4, Mouse5, the middle button and the wheel, with Ctrl, Shift or Alt (GitHub issue 29). Unit tests and a test window under Wine, not a real game |
| [Mod settings in the game](/kiln/wiki/profiles#mod-settings) | Apply shows the new values at once, and a slider has a number field beside it (GitHub issue 28) |
| [EMF 0.6.3 to 0.6.8](/kiln/wiki/emf-mods#mods-built-for-emf-063-to-068) | EMF's newer DLL and Lua mods start again; a Kiln game answers an EMF server's mod check. Some of EMF's newer functions answer "not available" for now. A lab server with EMF 0.6.8's mods, no players |
| [ShroudForge](/kiln/wiki/eml-shroudforge#shroudforge-mods) | what **Waiting** means; a mods folder on another drive under Proton; the launcher says when ShroudForge's own loader cannot write its mods; Kiln's **MODS** entry is back in the main menu with ShroudForge mods on |
| [Kick and ban](/kiln/wiki/dedicated-servers#kick-and-ban) | `/kick`, `/ban`, `/unban`, `/bans` and a ban list of Kiln's own. Test connections on a test server, not a real player's game |
| [A slow server start](/kiln/wiki/dedicated-servers#what-a-slow-start-is-doing) | `kiln/state/progress.json` says what the start is doing. Test servers |
| [Cooking on a server](/kiln/wiki/dedicated-servers#mods-with-a-cook-recipe) | `kiln cook` from a release's `sdk/` folder alone, no `KILN_REPO`. Each cook records what it wrote; a cooked file no cook of this game made loads with a warning |
| For mod authors | mod API 0.2.2, additive. [NoClip](/kiln/wiki/player-rules#noclip), [buffs taken off and listed](/kiln/wiki/abilities#run-effects-buffs-and-animations), [where a player looks](/kiln/wiki/abilities#where-a-player-looks), [kick, bans and the login event](/kiln/wiki/multiplayer#kick-ban-and-who-may-log-in), [event filters by entity](/kiln/wiki/events#only-the-events-about-one-entity), [equip and unequip](/kiln/wiki/inventory#equip-and-unequip), [item data in players' games](/kiln/wiki/inventory#item-data-and-saves), [affixes](/kiln/wiki/affixes), [tracked world writes](/kiln/wiki/world-programs#tracked-writes-from-the-tick-thread), [weather](/kiln/wiki/code-mods#weather), [one contract for every service](/kiln/wiki/code-mods#when-a-call-cannot-work), [KILN120 and KILN121](/kiln/wiki/lint#c-analyzers), [definitions baked at build](/kiln/wiki/dev-kit#definitions-baked-at-build), [new fakes for unit tests](/kiln/wiki/testing#tests-without-the-game), [new samples and templates](/kiln/wiki/dev-kit#templates). Proven on a test server with stand-ins for players |
| Fixes | starts with many mod materials are much faster; Kiln's mods load again next to mods that hook the game first (Auto Doors), also with Greeneye Loader or ShroudForge beside them; the game no longer hangs at its start next to other loaders, and Kiln finds the game's functions after another loader changed them (both by rifters, GitHub pull request 27); the Mods page at high Windows scaling; a mod item lies on the ground as its own model; quoted names in `dinput8-chain.ini`; a quest whose completion a mod cancelled no longer gives its reward |

### Known limits (dev.27)

- NoClip was tried in one real game. It does not work while the Creative Mode mod runs, and a player who leaves inside
  the ground is saved there (the game's Unstuck frees them).
- The launcher does not cook mods you put into the game folder by hand, nor the mods of a local server it runs: run
  `kiln cook` for those.
- The scrolling pause menu was tried at one resolution, with mouse and keyboard; other UI scales and a gamepad were not.
  The main menu does not scroll: there, more than 3 mods' entries go to the Mods page.
- Kicking, banning, equip, the weather, tracked writes, item data in players' games and affixes were proven on a test
  server with stand-ins for players. A weather hold does not outlast a server restart.
- EMF: the minimap draws nothing, Beastmaster's markers, buff reads and move reads do nothing, and teleports has no map
  action. An EMF server that also requires content mods still refuses a Kiln game.
- "Changed on disk", All on and All off, the save editor's Deck tab and the menu entries on the Mods page ran in tests and
  the browser test bench only.

## New in 0.2.0-dev.26

The first of the releases that complete the mod API, and the data folder move players asked for on Nexus. **Seen in a
real game (Linux, Proton, one player on a dedicated test server):** the launcher and the game starting with this release,
item data in the backpack and in a chest through a server restart and a rejoin, mod creatures with a faction of their own,
and the sample weapons playing their own attack states after a join check that passed. The rest was tested on Linux hosts,
on dedicated test servers under Wine and in Kiln's tests. Nothing ran on native Windows or on a Steam Deck.

| Area | Included in dev.26; evidence and remaining limits |
|---|---|
| [Move Kiln's data folder](/kiln/wiki/profiles#the-data-folder) | **Settings**, **Library**, **Data folder**, **Change** moves everything Kiln keeps (mods, runtimes, modpacks, profiles, backups) to a folder or drive you choose. Kiln checks the copy before it switches and only then removes the old one; a failed or canceled move changes nothing. Tested by the launcher's own tests, not in the real launcher window and not on Windows |
| [Notes about mod folders](/kiln/wiki/profiles#in-the-game-folder) | the launcher tells you once about a folder it leaves alone, files it kept and notes on your mods, instead of at every change to your mods; **Notes** above the list shows them again, a switch in Settings turns them off, and a notice no longer covers the window. Asked for on Nexus. The launcher's tests and a browser against a stand-in for its backend, not the installed app |
| [ShroudForge settings](/kiln/wiki/eml-shroudforge#shroudforge-mods) | a ShroudForge mod you had in ShroudForge's mods folder before Kiln can have its settings changed in the launcher: Kiln writes only the setting you change. Changing a setting in ShroudForge's own in-game menu no longer makes Kiln treat its copy of the mod as yours (that kept the folder at every change and locked its settings). Kiln's tests; the menu's behaviour follows ShroudForge's source |
| Data on one item | a mod can keep a value on one particular item (kills on one sword) through moves, saves, crashes and restored backups. When Kiln can't tell two identical items apart, the value waits instead of jumping to the wrong item. Backpack and chest items through a restart and a rejoin: seen in the game. The action bar, worn items, a crash and crafting with such an item wait for a game test |
| Weapons with their own attacks | a mod's weapons can have player animation states of their own (attacks, guards, casts), timing and chains, and parts that move while held. The server and every player's game need the mod, cooked ([below](/kiln/wiki/dedicated-servers#mods-with-a-cook-recipe)); the join check compares both sides. The join and the sample weapons' states: seen in the game. How the states blend, a second player seeing them, hit timing and root motion wait for a game test |
| Cooking on a dedicated server | `kiln cook` works against a server's files: it cooks the animations a server needs and skips the models, which only a player's game draws. It needs Python and Kiln's source; the launcher doesn't cook yet, so a player who adds such a mod sees the plain weapon, and a mod with player animation states is refused at join until the player's game cooked it too. Tested against a test server's files. Since dev.27 the launcher cooks such mods at Play, and `kiln cook` needs no Kiln source |
| Mod creatures | creatures a mod defines keep their own friends and foes again (dev.24 dropped them at the first server step). Seen in the game |
| What works on this game build | `kiln/state/capabilities.json` lists what works on your game build and side and why something is off; a mod that doesn't load because the build lacks something says what and why in kiln.log and in the mod list. Test servers |
| For mod authors | mod API 0.2.1 (additive; a mod built with this MDK needs dev.26 or newer). About 120 lab and test helpers are now a build error unless a project opts in (`KILNX001`). Typed reads of every game component, tests under `dotnet test` with no game (`Kiln.TestKit`), guided client checks, one error rule. The [release notes](https://github.com/frostdev-ops/kiln/releases/tag/v0.2.0-dev.26) have the list |
| Fixes | a mod's own attack sequences work in a second world of the same game run; animations authored on a game skeleton no longer tear the body apart (cook them again); from GitHub issue 23: another tool's `POWRPROF.dll` is no longer taken for SET, a Shroudtopia mod another loader started isn't started twice, two EML loaders in one game are reported, a misplaced `chain.ini` is named in proxy.log |

## New in 0.2.0-dev.25

A hotfix for dev.24. **Seen in a real game (Linux, Proton, one client):** ShroudForge's data mods next to EML mods
(Unlock Blueprints updated 2544 recipes), ShroudForge mods' shortcuts, and ShroudForge, EML, Greeneye, shroudlink, native
DLL and Kiln mods loaded together. The rest was tested on Linux hosts, under Wine without a display and in a virtual X
display.

| Area | Included in dev.25; evidence and remaining limits |
|---|---|
| [EML next to ShroudForge](/kiln/wiki/eml-shroudforge#eml-and-shroudforge-together) | with More Gliders and Unlock Blueprints together, ShroudForge refused one write and dropped its whole startup pass, so no data mod applied. Kiln's ShroudForge 1.7.9 and Kiln's own EML runner now check a write into a value a mod created against that field's type. Seen in the game |
| XHL mods | XHL's newer mods (a `mod.json` that only names the mod) import as XHL-Core plugins instead of "Nothing to add". XHL-Core 2.x is recognised as one mod, "xhl-core". Kiln runs XHL-Core from its own copy named `xhl-core.dll` in `kiln\chain\`: as `dinput8.dll` it took itself for the game's main one and started no plugins (seen under Proton). Kiln's tests and a Wine harness; XHL plugins not yet seen in a game |
| Skill Search | its search box (a Shroudtopia module in the same folder as its EML part) loads again. Kiln's host tests |
| [A black launcher window](/kiln/wiki/install#a-black-launcher-window) (Linux) | the launcher starts again without the GPU when its page has not come up after 15 s; `--software-render` forces it. Tested on a virtual X display, not yet on the NVIDIA / X11 machine of the report |

## New in 0.2.0-dev.24

Most of dev.24 comes from players' reports on Nexus and GitHub: a launcher that shows all of your mods in one list, mods
of other loaders that really run, and nothing of yours deleted along the way. **Seen in a real game (Linux, Proton, one
client):** Kiln's entries in the main menu with ShroudForge mods on, W and S steering with ShroudForge's Unlimited Flight,
and SET's tools. Everything else was tested on Linux hosts, under Wine without a display and on dedicated test servers.
Nothing ran on native Windows or on a Steam Deck; the Deck fixes follow one player's support report.

| Area | Included in dev.24; evidence and remaining limits |
|---|---|
| [One list of every mod](/kiln/wiki/profiles#the-list-on-play) | Play lists every mod you added, for whatever loader, and the mods you put into the game folder by hand, each with an on/off switch where Kiln can switch it. A row's menu (three dots, or a right click) has its settings, versions, folder and Remove. **Load order** shows every mod in the order a start brings them up. There is no Profiles page, no profile picker on Play and no Library page any more. Tested in a browser against a stand-in for the launcher's backend, not in the installed app |
| [Profiles in Settings](/kiln/wiki/profiles#profiles) | Kiln keeps your mods in one profile, **My mods**, by itself. Settings, Profiles: load, save the current set under a name, rename, delete, **No profile**; the library's storage (size on disk, Clean up) is there too. Same test as above |
| Removing a mod | one click; typing the mod's name only with **Type a mod's name to remove it** in Settings. Uninstalling Kiln, deleting a profile or a server and restoring a backup still ask for the word |
| [Play with Steam closed](/kiln/wiki/install#steam-and-the-game) (Linux AppImage) | every game start from a Steam the launcher had started ended within seconds, with no window. Fixed |
| Adding mods on a Steam Deck | with ShroudForge installed under Proton, every mod added failed with "Read-only file system". The launcher now finds ShroudForge's mods folder through the game folder. Follows one player's report; not on a Deck |
| [Files a mod wrote](/kiln/wiki/profiles#in-the-game-folder) | carried to the new version at an update, kept in `kiln/kept-mod-files` when the mod is switched off or Kiln is uninstalled. A folder you changed yourself stays where it is |
| DLL mods | an update of a mod that comes as a DLL replaces the old version instead of becoming a second entry; the same DLL is no longer loaded twice |
| A game without a window | still counts as running, so the launcher no longer writes into the folder of a running game |
| [EML next to ShroudForge](/kiln/wiki/eml-shroudforge#eml-and-shroudforge-together) | Kiln sets ShroudForge's switch for your EML mods, so they run when a ShroudForge mod is on too; the launcher and the in-game menu say why when ShroudForge does not run one. Going back to ShroudForge alone needs no reinstall. Game files Kiln can't prove it wrote are never overwritten or deleted (leftovers go to `kiln/eml/displaced`). Values you set in ShroudForge for an EML mod are kept |
| [ShroudForge in the game](/kiln/wiki/eml-shroudforge#shroudforge-mods) | a page per ShroudForge mod in Kiln's Mods menu; shortcuts work with Kiln's ShroudForge; Kiln's **Mods** entry is back in the main menu. The main-menu entries and W and S steering with Unlimited Flight: seen in a real game |
| [Flame (Creative Mode)](/kiln/wiki/more-frameworks#creative-mode-flame) | runs from the game's `mods` folder, where it reads its own files. Without data for the current game build, Kiln's own `/creative` stays available and says why |
| Greeneye, XHL, SET, shroudlink | Greeneye mods run from their own folder in the game. XHL companion folders and settings go where they belong. [SET](/kiln/wiki/more-frameworks#set) 0.2 mods: rules, saved settings and the tools windows (tools seen in a real game). shroudlink's client addon loads before Kiln hooks the game, and its mods have one name |
| Next to ReShade or another overlay | the in-game Mods page is no longer empty: Kiln takes the graphics device over when the game makes its swapchain, if the PC has one graphics device. No test here has a second program hooking Vulkan |
| Enshwick packs | a data pack written like Enshwick's own examples imports instead of "its pack.toml is invalid" |
| [Steered glider](/kiln/wiki/player-rules#creative-mode) | in creative mode S raises the glider's nose (up to 85 degrees), W lowers it, the boost pushes along the nose. Rule `glideSteer` in `rules/creative.json`; `"allowGlideSteer": false` in `rules.json` switches it off for everyone |

### Known limits (dev.24)

- Seen in a real game (Linux, Proton, one client): Kiln's entries in the main menu with ShroudForge mods on, W and S
  steering with ShroudForge's Unlimited Flight, and SET's tools. Everything else was tested on Linux hosts, under Wine
  without a display and on dedicated test servers. Nothing ran on native Windows or on a Steam Deck; the Deck fixes
  follow one player's support report.
- The launcher's new main screen was tested in a browser against a stand-in for the launcher's backend, not in the
  installed app.
- On Linux, Steam can show the game as running for about a minute after you quit. Steam's own networking library crashes
  while the game shuts down, and the system then writes a crash dump of several gigabytes. No Kiln or mod code is on
  either side of that crash; whether it also happens without Kiln is not known yet.
- shroudlink's MODS tab has not been seen in a real game with this build.
- When one EML mod fails inside ShroudForge, ShroudForge drops its whole startup pass and none of its data mods apply
  that start. The in-game Mods menu shows them as failed; the launcher's engine view can still say they run.
- The steered glider with an analog stick, with the game's other pitch mode, and another player's steered glider seen
  from a second game are not checked in a game.
- The graphics device takeover needs a second program hooking Vulkan next to Kiln, which no test here has. With more
  than one graphics device Kiln still cannot draw in that case; kiln.log says so.
- ShroudForge 1.8.0 is not released yet. Kiln brings 1.7.9 and will support 1.8.0 when it is out.
- Enshwick 1.0.0-alpha.14 (bundled since dev.23) starts under Kiln's host tests with its real loader. On the client Kiln
  is first, so a feature of Enshwick that needs a function another program hooked first may be off, and its log then
  names a Kiln DLL. Not measured in a game.

## New in 0.2.0-dev.22

Since dev.24 the launcher's places named in this section have moved: the profile's tabs and the **Library** page are the
list on Play, **Load order**, **Native and DLLs**, **Engines** and **Configs**; profiles are in Settings; activating a
profile is **Load** there, and the launcher also brings the profile up to date when you press **Play**
([Profiles and mods](/kiln/wiki/profiles#profiles)).

dev.22 is about mods that did not load. Players reported that mods made for other frameworks were refused by the Library,
were invisible in the launcher, or sat in a profile and never ran. It also adds a mod manager in the game, takes the
48 GiB read out of the EML first start, and makes the launcher lighter. **Nothing in dev.22 was run on Windows, on a Steam
Deck or in a real client.** It was tested with unit tests, Wine host tests with stand-in loader DLLs, and dedicated-server
labs under Wine. One lab run used a real ShroudForge loader build. Nexus features stay off, as in dev.20 and dev.21.

| Area | Included in dev.22; evidence and remaining limits |
|---|---|
| [Adding mods](/kiln/wiki/other-mods#adding-mods-in-the-launcher) | zip, 7z and rar. The launcher reads 7z itself; a rar needs unrar, 7-Zip, bsdtar or Windows' tar already on the PC, and a password-protected or split archive is refused with a message to extract it first. A package shaped like the game folder imports as its mods, and a bundled loader Kiln doesn't need is one note, not an error. Ids with capitals (`HoardersHelper`) are no longer refused, and ShroudForge packages with upper-case ids import too. A `dinput8.dll` or `winmm.dll` mod keeps its `.ini` and data files. Tested with unit tests and launcher mock data, not on a real install |
| [In the game folder](/kiln/wiki/profiles#in-the-game-folder) | the profile's Mods and Engines tabs list the mods you extracted into the game folder: whether each loads with this profile and why, with one button to add it to the profile or to switch that framework's drop-in on. Your files are never moved or deleted. Tests and mock data, not a real install |
| [Drop-in switches](/kiln/wiki/profiles#drop-in-folders) | a switch for EML, ShroudForge, Greeneye, Flame, Shroudtopia, Enshwick and shroudlink next to Kiln's four. A framework's folder is read when its switch is on. Profiles from before dev.22 keep loading what they loaded. Unit tests and Wine host tests |
| [Another framework's own loader](/kiln/wiki/other-mods#your-other-loader-is-installed-too) | while EML's `dbghelp.dll` (or another framework's own loader) is installed, the launcher copies the profile's mods of that framework into the folder it reads, and removes its copies when the loader is gone. Before, those mods did not run at all. Stand-in loader DLLs under Wine, and a lab run with a real ShroudForge loader build; not with a real EML on Windows. shroudlink's and Ember's own loaders can't be served this way |
| Proton without a DLL override | a framework's loader file in the game folder does not run there. Kiln used to step aside for it anyway; it now checks that the file really is the loaded code and runs the mods itself. Stand-in DLLs under Wine; not on a Steam Deck |
| [shroudlink's client addon](/kiln/wiki/more-frameworks#shroudlink) | the addon (the in-game MODS tab) is added as a mod of its own when dropped on the launcher. Before, it was taken for a loader Kiln doesn't need and left out. Kiln still runs the core. Not seen in a real client |
| [EML first start](/kiln/wiki/eml-shroudforge#faster-starts-dev21-and-dev22) | no more reading of all game data (about 48 GiB on a full install) before the game starts. A start that was closed half way continues. A small progress window appears after two seconds, and the Play page shows the same. exFAT and FAT drives still read everything, now with progress. Byte counts measured on a synthetic 55-file data set and a 7.5 GiB lab server under Wine, not on a real install |
| [Mod manager in the game](/kiln/wiki/profiles#the-kiln-menu) | **MODS** in the game's main menu opens a full page of the mods of every framework, their state and reasons, with search and a filter for mods that need attention. Not seen in a real client |
| [Support report](/kiln/wiki/debugging#save-a-support-report) | **Save report** on the Logs page makes one zip with the logs, state files and a summary in plain sentences. User name, home folder, machine name, Steam ids, IP addresses and tokens are removed; saves, worlds and mod contents are never read. `kilnctl report` does the same for a server. Unit tests and launcher tests; no report from a real Windows PC or Steam Deck has been read |
| SET | SET mods load again with C# mods on. Kiln's SET part took Kiln's own in-game mod list for SET's runtime and stood aside |
| Non-ASCII paths | with a Cyrillic, Chinese or accented Windows user name or game folder, the quests part crashed at boot, SET mods did not load and build regions were not saved. Fixed; checked under Wine, not on Windows |
| [Native Windows servers](/kiln/wiki/dedicated-servers#your-own-windows-pc) | new items and recipes register again (GitHub issue 14, "nothing free within 2 GB"). Checked with replayed address-space layouts and under Wine; not on a Windows PC |
| Reinstall | after uninstalling and installing Kiln again, the profile you used is active again, and a dropped mod goes into it |
| Lighter launcher | next to a running game its backend used about 50 ms of CPU per second and now uses 1 to 8. The first status check after a start took 1.2 s and takes 0.05 s. While the window is not focused it refreshes every 30 s; events from the game still refresh at once. Kiln's own measurements, not on Windows or a Steam Deck |
| Steam Deck | **Add mods** lists `.7z` and `.rar` files in Downloads too. Not on a Deck |

**Breaking and behaviour changes.** With an active profile, a framework's own folder is read only when the profile's
`dropins` is `true` or a list naming that framework. Before, Greeneye, Flame, Shroudtopia, shroudlink and Ember read
their folder whenever the profile had no mod of that framework, and Enshwick's loader ran for every hand-installed
folder. Profiles made before this build keep loading what they loaded; a `profile.json` written by hand without the list
stops loading those folders. kiln-shroudforge hosts ShroudForge for the packages in its mods folder when ShroudForge
drop-ins are on, not only for a profile's ShroudForge mod. **Play a profile once** with another profile is refused for a
framework whose own loader is installed when that profile's mods of the framework differ. Mods of other frameworks are
listed in the Library under an id in lower case, with their own id next to it. Mod authors: `entryAssembly` in
`kiln.mod.json` is optional ([a mod of data only](/kiln/wiki/manifest#mods-of-data-only)); framework state files list a
profile's mods as `own-loader` or `not-loaded`, and `eml.json` can say `phase: "running"`.

### Client checklist (dev.22)

Only a real client, a Steam Deck or a Windows PC can confirm these. Please report what you see.

- Windows with EML's `dbghelp.dll` in the game folder: add an EML mod through the launcher, press **Play**. The mod runs
  once. `kiln/state/eml.json` lists it as `own-loader`, and `mods/<id>/` holds Kiln's copy. Remove `dbghelp.dll`,
  press **Play** again: the copy is gone and the mod still runs once.
- Steam Deck or Linux with ShroudForge's `dbghelp.dll` and no DLL override: the profile's mods run (kiln.log says the
  folder's loader is not the loaded code).
- The first start with EML mods on a real install takes seconds, not minutes. The progress window appears only when the
  step takes longer than two seconds, never takes focus, and is gone before the game's window.
- **MODS** in the main menu opens the mod manager; leaving returns to the menu.
- Drop a `.7z`, a `.rar` and a game-folder-shaped zip on the launcher: the result line and its Details view read well.
- The **Game folder** rows in the list on Play match what is in the folder; **Load them** and **Add it** work.
- shroudlink in singleplayer: drop its singleplayer zip on the launcher, start, and the MODS tab opens and lists the
  mods.
- A Windows user name with non-ASCII letters: the quests part starts, a SET mod loads, a build region survives a restart.
- A native Windows dedicated server: a mod's new item registers (issue 14).
- Save a support report and read `summary.txt`: nothing private is left in it.
- Uninstall Kiln, install it again: the same profile is loaded and mods load.

### Known limits (dev.22)

- Nothing in this build was run on Windows, on a Steam Deck or in a real client.
- The copies for a framework's own loader are made by the launcher. If you install such a loader afterwards, start once
  from the launcher's **Play**.
- shroudlink's and Ember's own loaders can't read Kiln's layout: with one of them running, a profile's mods of that
  framework do not load, and the state file says so.
- Enshwick's own loader may see a mod that was copied while it was already running only from the next start.
- The check that tells Wine's own DLL from a framework's loader compares the loaded image's header with the file. It
  assumes the loader leaves its own header in memory.
- exFAT and FAT game folders still read every game file at every start with EML mods; they now show progress.
- The byte counts for the EML start are measured on a synthetic 55-file data set, not on a real 48 GiB install.
- A rar needs an external tool. A password-protected or split archive is refused with a message to extract it first.
- Nexus quarantined several dev.21 files after a single antivirus engine flagged the installer. If a file is missing on
  Nexus, use this site or GitHub.
- The limits listed for dev.21 still apply.

## New in 0.2.0-dev.21

dev.21 fixes the problems found in the dev.20 review. It stops the launcher from removing mods while Enshrouded runs,
makes EML mods start much faster, moves every hook Kiln places on the game into one registry, and helps closed-source
DLL mods (XHL, trainers) work next to Kiln. Most new paths were verified only under Wine: unit tests, Wine host tests
and dedicated-server labs. Not on Windows, and not in the real client. Nexus features stay off, as in dev.20.

| Area | Included in dev.21; evidence and remaining limits |
|---|---|
| [Library guard](/kiln/wiki/profiles#the-library) | **Remove** and **Clean up** are refused while Enshrouded runs: "Close Enshrouded first: the game may be reading this mod". Clean up never lists a version the active profile uses. This is Kiln's side of GitHub issue #4; the reporter's root cause is not proven. Launcher pages covered by tests and mock data, not a real install |
| [EML starts](/kiln/wiki/eml-shroudforge#faster-starts-dev21-and-dev22) | each game file is read at most once per start, and not at all while the OS shows it unchanged. Lab server under Wine, 7.5 GiB of server data: a start that changed nothing went from 7.6 GiB read in 5.4 s to 562 B in 64 ms. Not measured on a real client. In dev.21 the first start after the update still read all game files once (about 48 GiB on a full client); dev.22 no longer does |
| [EML mods that can't be read](/kiln/wiki/eml-shroudforge#eml-mods) | a mod whose `src/mod.lua` can't be read is switched off before the long game-data step, with the reason in `state/eml.json` and kiln.log. The other mods still run |
| [Closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods) | the profile's **Native** tab (since dev.24 **Native and DLLs**, next to **Load order**) has a **Load after Kiln and ShroudForge** switch per chain entry, last session's hook overlaps with **Load late**, and the compat rules that apply. Tested under Wine and on lab servers; not yet with XHL-Core in a real game |
| Chat | Kiln's chat commands no longer depend on the game's return address, so kiln-emf's chat hook or an EMF mod's hook can't hide players' lines from them (a dev.20 bug). Tested with stand-in hooks under Wine; the real-client check is open |
| [Hooks](/kiln/wiki/hooks) | kiln.hooks v2: one registry owns one detour per game function, for Kiln's services, the core tick, EMF and Shroudtopia mods and C# mods. `kiln/state/hooks.json` maps them. About 6 ns per call through an empty chain and 59 ns through a C# handler (lab, Wine). Client UI, camera and render hooks need a client check |
| [ShroudForge](/kiln/wiki/eml-shroudforge#shroudforge-mods) | its six engine hooks go through kiln.hooks when Kiln hosts it, so another DLL's hook on one no longer switches its native runtime off. Dormant on the current game build: no shipped game profile names engine hooks. `KILN_SF_ENGINE_HOOKS=self` keeps the old behaviour |
| Linked `/home` | ShroudForge and SET placement and modpack installs accept a `/home` that links to `/var/home` (Fedora Atomic, Bazzite). Links inside the managed folders are still refused. Tested with symlinks on Linux, not on a Fedora Atomic host |
| [Nexus leftovers](/kiln/wiki/install#mods-from-nexus-mods) | a launcher build with Nexus off gives `nxm://` links back to the handler you had before (Vortex, for example). Every build deletes the personal Nexus API key dev.19 stored, without showing it |
| Smoother play | mod status lines never make the menu, tick or frame wait. [EMF portraits](/kiln/wiki/emf-mods#dev21-changes) are drawn off the boot thread, and current pictures skip the renderer. SET no longer re-reads a catalog without texts every 60 s, and handles non-ASCII Windows paths |
| File names | names Windows would change (trailing dots or spaces) are refused in mod zips, runtime bundles and modpacks |
| Mod API | [inventory](/kiln/wiki/inventory) transfer handlers also run on a dry-run move, with `KILN_TRANSFER_DRY_RUN` set. `component_change` refuses an add whose payload doesn't match the component's size. `Overrides` from a background thread belong to the mod that got the handle; without one they throw `InvalidOperationException`. `Texts.Get` returns `null` while another thread loads the catalog. `Assets.Reflect` returns `null` on builds without kiln.types. [World program](/kiln/wiki/world-programs) `TryRead`/`TryWrite` no longer allocate or lock per entity. KILN111 counts items registered with `ItemDefinition`, and a game-style name missing from your local catalog is info, not a warning |

**Breaking and behaviour changes.** `Hooks.Detour` and the v1 `detour` pass every argument to the original. EMF and
Shroudtopia mod hooks run before Kiln's own links ([all hook changes](/kiln/wiki/hooks#changes-from-dev20)). Library
removal is refused while the game runs, even with force; a running server blocks it only when its profile points into
the Library. Use kiln-emf and kiln-eml from the same release. An older proxy ignores `[late]` and loads those DLLs early.

### Client checklist (dev.21)

Only a real client or a joined player can confirm these. Please report what you see.

- Kiln's menu opens and draws; camera, render and in-game UI hooks behave as in dev.20.
- With kiln-emf's client chat bridge on, Kiln chat commands and EMF mods' chat both work, in both directions.
- Item moves and quick stack, combat, abilities, audio, quests, flight and creative rules, saves, time, spawns, NPC
  factions, VFX and world programs with a player. Their server side ran in labs.
- **Load after Kiln and ShroudForge** on XHL-Core: XHL works, kiln.log shows it loaded late, the overlaps panel updates.
- While Enshrouded starts with an EML mod active, Remove or Clean up of that version is refused, and works after the
  game closes.
- Later EML starts log `nothing changed` within a second or two. (dev.21 read about 48 GiB at the first start; dev.22 does not: see its checklist.)
- EMF portraits: the game enters the world without waiting when every picture is current, and pictures still show.
- The game starts with the new proxy on a real client. Labs covered the dedicated server only.
- Play a profile once whose compat rules differ from the active profile's: that start follows its own rules. (The
  launcher has no "play a profile once" since dev.24.)
- On a `/home -> /var/home` host, the profile's EML mod loads.
- Windows, launcher with Nexus off: `nxm://` links that dev.19 took over from Vortex point at Vortex again.

<a id="in-preparation-for-020-dev20"></a>

## New in 0.2.0-dev.20

These APIs and adapters came with dev.20 and are in dev.21 and dev.22 too. Install the matching runtime and MDK before using them. Source/host
and dedicated-server evidence is listed below; final release-artifact validation is a separate gate. A passing server
or host check does not establish client rendering, input or multiplayer behaviour.

| Area | Included in dev.20; evidence and remaining limits |
|---|---|
| [Quest and dialogue blocks](/kiln/wiki/quests#quest-and-dialogue-blocks-dev20) | typed blocks and `blocks/*.json`; first-start JSON journal compilation and lifetime cleanup. New-form journal/dialogue/reward presentation and party play need a client |
| [World blocks](/kiln/wiki/world-blocks) | crafting props and manual-station requirements, one-time container loot with save/restart journaling, lid/door controls and several collision boxes. Craft UI, animations and physical collision need a client |
| [UI blocks](/kiln/wiki/ui-blocks) | windows, HUD and keys bound to config/safe game values, with lifetime cleanup. Rendering, mouse/gamepad input and joined-server ability/effect actions need a client |
| [Templates](/kiln/wiki/dev-kit#templates), loot and recipes | block-first templates, standalone loot tables, creature drops and recipes at game stations pass build/lint and dedicated-server checks. Visible tooltips, menus and drops need a client |
| [Inventory transfers](/kiln/wiki/inventory) | state-preserving moves, container names, quick-stack/move-all rules and reports. Player slots, R-key/station behaviour and the shroudlink client addon need a client. Gear entity data is session-only; no persistent per-item payload or affix API |
| [World programs](/kiln/wiki/world-programs) | boot declarations in `kiln.programs.json`, `OnLoad` callback binding, declared other-entity writes and multiple event inputs; eight reload checks completed without failures or leaked contexts. Worker callbacks remain separate from tick-thread services; client-world programs are unsupported and replication needs a client |
| [World progress](/kiln/wiki/world-progress#changing-the-flame-level-dev20) | verified-result flame-level writes and limits readback, including stored/replicated state and restoration. The game's UI, fog and placement limits need a client |
| [EMF](/kiln/wiki/emf-mods#dev20-support) | EMF 0.6.0 / API v27: 77 full, 13 partial and no missing C slots. Official `#!emf1` networking, radial wheels, right-click events, attributes and program/spawn work are implemented. Server/host checks and offline Windows portrait archive/cache checks pass; custom/in-game portraits and hosted/joined gameplay remain unverified |
| [ShroudForge](/kiln/wiki/eml-shroudforge#dev20-pairing-with-emf) | bundled reader/publication/recovery fixes. Two mixed server boots with Lua 1.19, Beastmaster 1.13 and optional bear/beasts assets succeeded and reused identical cached output. Those earlier boots do not prove every mod pairing or the final recovery guard in a joined game |
| [SET](/kiln/wiki/more-frameworks#set) | level/flame administration, English names/text catalogs and more tool windows. The final assembled server probe passes 39/0, including event payload observation and flame restoration. Window drawing/input remains untested; game options, `Admin.send`, ImGui Debug and SET's `settings.ini` editor remain unavailable |
| [Nexus integration](/kiln/wiki/install#mods-from-nexus-mods) | **Disabled in the official dev.20, dev.21 and dev.22 builds:** no Catalog, Nexus account/settings or `nxm://` handler on desktop or Deck. Download archives in a browser and import them manually. A future enabled build requires approved OAuth configuration and real-provider proof; there is no personal-key fallback |

Source/host tests and dedicated-server tests validate registration, refusals, save state and cleanup. They do not draw UI,
press keys, animate a lid or establish real-provider OAuth success. The feature pages keep those boundaries explicit.

## New in 0.2.0-dev.19

Historical release notes. The dev.24, dev.22, dev.21 and dev.20 features and limits are listed above.

- **Frame rate fixed.** 0.2.0-dev.18 could drop the game to about 10 fps whenever a profile was active. The SET
  support checked every loaded game file on every frame; now only when a new file loads.
- **Updates install new parts.** Updating skipped parts that are new or became default, such as the EMF, EML,
  ShroudForge and Enshwick support. Only parts you turned off stay off. After a dev.18 update, the launcher's Runtime
  page shows missing parts and lets you add them.

## New in 0.2.0-dev.18

- **Mods for other frameworks.** Kiln runs mods made for EML, ShroudForge, EMF (up to 0.5.1), SET, Greeneye Loader,
  Creative Mode's Flame, Shroudtopia, Enshwick and shroudlink, unchanged, without installing those frameworks. EML,
  ShroudForge and EMF support are installed by default, and Kiln ships Enshwick's own loader. The launcher's Library
  imports mods of every framework. Ember mods are found and listed, but don't run until Ember publishes its loader.
  [Mods for other frameworks](/kiln/wiki/other-mods)
- **Server pack:** `kiln-server-<version>.zip`, one zip for rented servers and Windows PCs, now with the server parts
  for EML, ShroudForge and EMF. [Dedicated servers](/kiln/wiki/dedicated-servers)

## Mods for other frameworks

| Framework | Status |
|---|---|
| [EML](/kiln/wiki/eml-shroudforge#eml-mods) | game test pending. Mods patch the game data on test servers; a broken mod is switched off instead of stopping the game. dev.21's faster starts: measured on a lab server under Wine. dev.22: the first start no longer reads all game files (lab server and a synthetic data set under Wine; not a real install), and your profile's EML mods run under EML's own `dbghelp.dll` through copies the launcher places. dev.24: EML mods run when a ShroudForge mod is on too (Linux hosts and test servers) |
| [ShroudForge](/kiln/wiki/eml-shroudforge#shroudforge-mods) | game test pending. Kiln's bundled copy and a player's own copy both run mods on test servers, with live settings. dev.24, seen in a real game: Kiln's main-menu entries with ShroudForge mods on, and W and S steering with Unlimited Flight |
| [EMF](/kiln/wiki/emf-mods) | EMF 0.6.8 / API v40 since dev.27: of 135 C slots, 76 full, 17 partial, and 42 functions EMF added since 0.6.3 answer "not available" for now. EMF 0.6.8's own mods start on a lab server. Client-world programs/events remain unsupported; player-facing rendering/input and joined-game checks remain open. The older clock mod was seen in game |
| [SET](/kiln/wiki/more-frameworks#set) | dev.24: SET's tools seen in a real game. Server probe 39/0; game options, `Admin.send`, ImGui Debug and the `settings.ini` editor remain unavailable. Kiln tool-window drawing/input needs a client |
| [Greeneye Loader](/kiln/wiki/more-frameworks#greeneye-loader) | game test pending. The whole API, tested on Linux under Wine |
| [Creative Mode (Flame)](/kiln/wiki/more-frameworks#creative-mode-flame) | game test pending. Started on a test server. dev.24: runs from the game's `mods` folder |
| [Shroudtopia](/kiln/wiki/more-frameworks#shroudtopia) | game test pending. The whole API; Shroudweave's mods untried |
| [Enshwick](/kiln/wiki/more-frameworks#enshwick) | game test pending. Enshwick's own loader, shipped with Kiln; its mods ran on a test server |
| [shroudlink](/kiln/wiki/more-frameworks#shroudlink) | works on a test server (shroudlink's self-test). With players joined: pending. dev.22: the client addon (MODS tab) imports as a mod of its own; not seen in a real client |
| [Ember](/kiln/wiki/more-frameworks#ember) | not running: waiting for Ember's loader |
| Stand-alone `dinput8.dll` mods | works: loaded next to Kiln. dev.22: kept with their `.ini` and data files when dropped on the launcher |
| [Closed-source DLL mods](/kiln/wiki/other-mods#closed-source-dll-mods) loaded late | new in dev.21. Tested under Wine and on lab servers; not yet in a real game |

## New in 0.2.0-dev.17

- **Steam Deck:** the game no longer hangs on a white window when it starts with Kiln. Kiln's in-game overlay hooked
  the graphics a second time over its own hooks, and the game never got its window. Checked on a desktop PC (the Kiln
  menu opens as before); not yet on a Steam Deck. If you set `KILN_UI_DISABLE=1` as a workaround, take it out again.

## New in 0.2.0-dev.16

Nothing below has been seen in the game yet. The new features are listed under
[Built, game test pending](#built-game-test-pending) with what they were tested on.

- **Historical Nexus integration:** dev.16 introduced the Catalog and optional Mod Manager Download links. These are
  disabled in the current dev.22 build; use [manual archive import](/kiln/wiki/install#mods-from-nexus-mods).
- **"No Kiln"** in the launcher when Steam starts the game without Kiln, with what to do, instead of "Starting" forever.
  Some recent Valve Proton builds load Kiln without the launch option. [Install](/kiln/wiki/install#no-kiln-kiln-is-not-loading)
- **Steam Deck mode:** focus no longer gets lost after dialogs or on disabled buttons, B always closes a dialog, holding
  to uninstall stops when you let go, and long text scrolls.
- **Safer drops:** dropped mods and archives are checked more carefully (no files outside the mod, size and depth
  limits), and every modpack you drop asks before it installs.
- **Fixes from a full code review:** creative mode presets you edited are no longer overwritten, the Shroud floor drain
  can't kill in slow frames, gliding respects its speed cap, and many smaller fixes.
- **For mod authors:** [drawing on screen and in the world](/kiln/wiki/drawing);
  [creature AI and behaviour](/kiln/wiki/creature-ai); [retargeted animations](/kiln/wiki/models#animations-from-another-rig);
  [particle shaders and material reskins](/kiln/wiki/shaders), working again, now checked and linked by Kiln;
  [blocks](/kiln/wiki/blocks): PNG icons for statuses and perks, every kind of tool, piercing projectiles, props with
  your own model, sound blocks, a VFX on an item or a placed thing, spawn shapes, streaks and play parameters for VFX.

## Works

| Area | Notes |
|---|---|
| C# mods, dependencies, load order, hot reload | servers and client |
| [Events](/kiln/wiki/events): one bus, about 110 event types | servers and client. Player state and action events seen in the game |
| Configs, commands, permissions, saved data | |
| Data packs, new items and recipes, placeholders | |
| Game data and clones | a cloned perk's buff on hit: seen joined, with the mod. Kiln players without the mod: open |
| [Building blocks](/kiln/wiki/blocks): spells, wands, deliveries, effects, statuses, perks, abilities, talents, player triggers | seen in the game: Frostbolt's tooltip and recipe, Frost Edge's status on hit, abilities on a key, in chat and from an item, homing bolts, Updraft while gliding, mana while sitting, eating stopped in a fight, talents kept after a rejoin |
| [Item blocks](/kiln/wiki/blocks#items-and-weapons): materials, potions, food, arrows, tools, water containers, weapons, armour, stations, recipes, loot | seen in the game: nine weapon classes with matching tooltips, potions, a food's status for its full time, a bench that places and opens its menu; a server restart keeps it all |
| [Creature and NPC blocks](/kiln/wiki/blocks#creatures-and-npcs): game bodies with a new mind, rules, attacks, spawns; NPCs on game bodies | seen in the game: rules in real combat (a burst below half health, a rally heal), an attack override, the AI switched off and on, an NPC with his menu and journal entry |
| [World blocks](/kiln/wiki/blocks#world-blocks): props, stations with their own recipes, furniture, building materials and shapes | seen in the game: a station placed as its own object, a bench's "Pray" prompt |
| [VFX and particles](/kiln/wiki/blocks#vfx) | seen in the game: Kiln-built particle bursts with a light, the game's VFX by name, a flame that stays on the hand, many plays without a hitch |
| Screen effects | seen in the game: flash, fade to black, a cold tint under the menu, a status's screen effect, eight at once |
| Materials | load in the game and stay after a restart. How they look: open. Reskins: see below |
| Creature variants, AI tweaks, orders, guards | seen in the game: an elite Vukah, a Vukah on your side, a guard that follows and defends you |
| Key-bound abilities, per-cast spell changes | |
| Icons, retextures, weapon models | |
| World edits and schematics | seen by players without Kiln |
| Levels, experience, skill points, skill unlocks | seen by players without Kiln |
| [Talents](/kiln/wiki/talents) | game tree and Kiln trees: unlock, refund, rejoin, joined servers; unlocks kept when a mod moves a node; German labels. A Kiln tree's respec: not reported |
| [Quests and dialogue](/kiln/wiki/quests) | the game's journal, NPC menu, markers, voice, hosted and joined; one NPC per hosted world; no replayed notifications on a join. Party scope with two players: open |
| [Friendly NPCs](/kiln/wiki/npcs) | directory, trades, hand-ins, whistle, bed, follow, stay |
| [Sounds and voice](/kiln/wiki/sounds) | heard in game. Server sounds on a joined player: open |
| [Who can join](/kiln/wiki/multiplayer#who-can-join) | seen in the game: players without Kiln refused by servers whose mods they need, a Kiln player without a required mod refused with a message, modSync off letting players without Kiln in without Kiln-only things |
| [Player rules and creative mode](/kiln/wiki/player-rules) | `/creative` seen in the game: flying and building outside bases, the Shroud timer frozen, gliding. The plane-style glide: not flown yet. dev.24's steered glider: with an analog stick, with the game's other pitch mode and seen from a second game, not checked in a game |
| [World progress](/kiln/wiki/world-progress) | flame level, difficulty, spires, shrines, Shroud Roots, bosses, chests and a character's quests, with events. Flame-level writes and restoration also pass server checks; client UI/fog/placement effects remain open |
| Water in containers | seen in the game: a larger watering can from a mod |
| [Per-character progress](/kiln/wiki/multiplayer#per-character-progress) | talents follow the character; quests stay with the world |
| Game UI: menus, screens, crafting tabs, HUD, keys, gamepad | |
| Content and config sync to Kiln players | |
| Kiln DLL mods and stand-alone `dinput8.dll` mods | |
| [EMF mods](/kiln/wiki/emf-mods) | older mods and EMF 0.6.8's DLL and Lua mods on test servers; the older clock mod seen in game. Current API v40 limits: [above](#mods-for-other-frameworks) |
| The launcher: install, profiles, library, saves, save editor | Linux and Windows. Windows: checked on a Windows PC by a tester. dev.24's new main screen (one list, profiles in Settings): tested in a browser against a stand-in backend, not in the installed app |
| Simpler first run | finds the game, installs Kiln, makes a "My mods" profile; drop a mod on the window to add it |
| Linux builds | glibc 2.35 or newer: Steam Deck (SteamOS), Ubuntu 22.04 and later |
| Nexus Mods build | no self-update: updates come from the Nexus page |
| Servers: install, run, console, backups, modpacks, admin pages | Linux and Windows. Windows dedicated servers checked end to end on a Windows PC by a tester: import, install Kiln, start, join, admin pages |
| Dev kit: `kiln`, templates, linter, analyzers, VS Code, debugger, catalogs, tests | debugger: dedicated servers on Linux and Wine |

## Open in the game

Seen failing in the game in the 6 November sessions. Some have had fixes since; each needs a new game test.

- A second status on a weapon's hit (Ember Edge's burn) showed as the first one (Chilled), in a hosted world.
- Stations with their own recipes: the menu's title and list, cycle times and the default recipe.
- A stool's stamina on sitting.
- One VFX material drew magenta; a coloured explosion showed magenta for its first frame.
- A terrain command that paints ore changed nothing.
- Hosting a world with the surface and cosmetic samples crashed the game.
- A creature's sight range set by a mod; a speed and damage override crashed a test server.
- Stopping a narration.
- Canceling an equip from an event: the item was equipped anyway.
- A creature spawned right after a hot reload that adds it reached a player before its definition.

## Awaiting a client retest

Fixed and passing on a test server since the last game test.

| Area | Fix |
|---|---|
| NPCs | the Survivors list takes its row and text from the NPC, not its tool |

## Built, game test pending

These pass offline or on a test server. What's missing is a player looking at them in the game.

| Area | Not yet |
|---|---|
| [Drawing on screen and in the world](/kiln/wiki/drawing) | new. Passes its tests (projection, budget, dispatch); not yet seen in the game |
| [Creature AI and behaviour](/kiln/wiki/creature-ai) | new. Tested on a lab server: creatures find, ignore and hunt each other, rules summon, cast and heal. Not yet watched in the game |
| [Retargeted animations](/kiln/wiki/models#animations-from-another-rig) | new. Tested offline and on a lab server; not yet seen drawn in the game |
| [Particle shaders](/kiln/wiki/shaders) | new. Tested on the CPU and a real GPU with hostile hooks, and on a lab server; not yet seen in the game |
| [Material reskins](/kiln/wiki/shaders#reskinning-a-game-material) | new. Tested on a lab server: served, taken off at unload, handed to the next mod; not yet seen in the game |
| [New blocks](/kiln/wiki/blocks): status and perk icons, tools, piercing, props with your own model, sound blocks, a VFX on a look | new. Tested on a lab server; not yet seen in the game |
| [VFX](/kiln/wiki/blocks#vfx) spawn shapes, streaks and play parameters | new. Tested in Kiln's VFX tests and on a real GPU; not yet seen in the game |
| ["No Kiln"](/kiln/wiki/install#no-kiln-kiln-is-not-loading) in the launcher | new. Checked in the launcher's tests; not yet on a real Steam Deck |
| Some blocks in play | a Frostbolt's area damage, a wand's attacks, armour's worn look, frost VFX on hits |
| Cosmetics with models of their own | not seen in the game |
| [Skinned models and animations](/kiln/wiki/models#skinned-models-and-animations) cooked from glTF | a test server's animation engine plays them on their curves; a creature with its own body not yet confirmed in the game |
| Steam Deck mode in the launcher | tested in emulation; not on a Deck yet |
| A remote server with server mods | local test servers so far |
| [Mods for other frameworks](/kiln/wiki/other-mods) | new. EML, ShroudForge, Greeneye, Creative Mode, Shroudtopia, Enshwick and shroudlink: tested on test servers and in Kiln's own tests; not yet seen in a player's game |
| [The server pack](/kiln/wiki/dedicated-servers#the-server-pack) | new. Holds the same files `kilnctl` installs; not yet tried on a rented host |
| [dev.24](#new-in-020-dev24): the one list, profiles in Settings, EML next to ShroudForge, Flame from `mods`, kept mod files, the steered glider, the graphics device takeover | new. Linux hosts, Wine without a display and dedicated test servers; the launcher's main screen in a browser against a stand-in backend. Not on Windows or a Steam Deck. See [Known limits (dev.24)](#known-limits-dev24) |
| [Mod loading in dev.22](#new-in-020-dev22) | new. Copies for another framework's own loader, the game-folder list, the drop-in switches, 7z and rar, the EML first start, the in-game mod manager and the support report: unit tests, Wine host tests with stand-in loader DLLs and lab servers; not on Windows, a Steam Deck or a real client. The [client checklist](#client-checklist-dev22) is open |
| [The hook registry](/kiln/wiki/hooks), late DLL loading, the Library guard | new in dev.21. The registry and late loading: tested under Wine and on lab servers. The launcher's new pages: tests and mock data, not a real install. The [client checklist](#client-checklist-dev21) is open |

## Being built

Work in progress now. Not in a release yet.

- **Animations and skinned models in the game**: creatures and worn armour of your own, seen drawn by a player. Foot IK
  after a retarget.
- **A creature mind written in C#**, opt-in per creature, beyond the AI fields and rules above.
- **Surface shaders** for models: transparent ones next, then opaque.

## Partly built

- [Impact programs](/kiln/wiki/impact): a heal-over-time buff, and a changed projectile with a player, are open.
  Blocks write their programs for you, so most mods don't need this.
- [3D models](/kiln/wiki/models): rigid weapons work in game. Skinned models, worn looks and animations cook and run on
  a test server; not yet confirmed in the game.

## Not planned

- Ragdolls. The engine has no path for them; a creature plays a death animation instead.
