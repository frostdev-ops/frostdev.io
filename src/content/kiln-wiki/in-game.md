---
title: "Kiln in the game"
nav: "In the game"
description: "Kiln's line on the main menu (also with XHL-Core), the look of Kiln's menus, Kiln's graphics tools and the upscalers behind the game's FSR 3, Kiln's overlay next to OptiScaler, chat history, other mods' slash commands, and the keys of Kiln's menus."
status: "pending"
updated: "2026-11-21"
---

What Kiln adds to the game itself, besides your mods. The Kiln menu and its pages are on
[Profiles and mods](/kiln/wiki/profiles#the-kiln-menu); languages on [Kiln in your language](/kiln/wiki/languages).

## The line on the main menu

Since 0.2.0-dev.29.11 the main menu shows Kiln's mark and **Kiln 0.2.0-dev.29.19 - N Mods Loaded** above the game's
build number, in the game's own footer style. N counts every mod that started, of any kind: Kiln mods, native mods and
the mods of every other loader Kiln runs. A mod that is off, waiting or failed doesn't count.

With XHL-Core installed, Kiln's line names it since 0.2.0-dev.29.19: **Kiln 0.2.0-dev.29.19 with XHL-Core - N Mods
Loaded**. While XHL-Core reports a problem, its red line ("XHL: Game updated · Click to view", "Mod conflict detected.
Click to view") shows under Kiln's, in XHL-Core's words and colour, and a click, the keyboard or a pad opens XHL-Core's
diagnostics, as without Kiln. XHL-Core's green "All mods loaded" is left out, since Kiln's line says that XHL-Core runs.
Where Kiln can't read XHL-Core's state, XHL-Core's line is always drawn, so a warning is never hidden. (From 29.11 to
29.18 Kiln's line took the place of XHL-Core's.) To hide Kiln's line, switch **mainMenuFooter** off under **Mods > Kiln
settings**: the game's footer then shows XHL-Core's line as it always did. Not yet checked in a real game. (29.15 lost the mark in front of the line; 29.16 brings it back.)

## The look of Kiln's menus

Since 0.2.0-dev.29.16 Kiln's own windows (the Kiln menu, Keys, the creative menu, item details, notifications, the
radial wheel) use the game's colours and font, read from your game, instead of Kiln's red and black. Pick another look
under **Mods > Kiln settings > Look** in the game, or in the launcher's **Settings**:

| Look | What it is |
|---|---|
| Game (default) | the game's colours and font |
| Translucent | the game's look with see-through window backgrounds (how see-through is up to you) |
| Kiln | Kiln's classic ember look |
| A mod's theme | themes your mods offer, named with their mod |

Two sliders apply to every look: the overlay's **opacity** (0.3 to 1) and its **size** (0.75 to 1.5). Changes show at
once, also when made in the launcher while the game runs. In `kiln/kiln.json`:

```jsonc
"ui": { "look": "game", "theme": "", "background": 0.55, "opacity": 1, "scale": 1 }
```

`look` is `game`, `translucent`, `kiln` or `theme` (then `theme` names it, `"<mod id>:<theme>"`). Mods' windows follow
your look too, unless a mod gives its windows a [theme of its own](/kiln/wiki/ui-looks).

Not yet seen in a real game: the look was checked in Kiln's preview renderer with the game's real colours and fonts. If
something looks wrong, send `kiln/logs/kiln.log`.

## Graphics

New in 0.2.0-dev.29.18: Kiln's own graphics tools, on the Kiln menu's **Graphics** tab (Insert) and on the launcher's
**Settings**, **Graphics** card. They do what players used extra mods for. **Everything is off until you turn it on**,
and nothing changes for anyone who doesn't. Not yet checked in a real game, except AMD FSR running on an RX 9070 XT
([below](#behind-the-games-fsr-3)).

- **Frame cap.** Paces the frames the game renders, from 20 to 500 a second: the finished frame shows at once, and the
  game starts its next one on time. The lowest limit wins, so the game's own frame limit or V-Sync at a lower rate
  decides over Kiln's cap. With V-Sync, set the cap a few frames below the display's rate (57 on a 60 Hz display, 141
  on 144 Hz). It applies at once.
- **DLSS settings**, for a game that upscales with DLSS (an NVIDIA RTX card, with DLSS chosen in the game's settings):
  the render preset (J, K, L or M, the ones the game's DLSS has) and the render size (DLSS's own, one scale for each DLSS
  mode, or one scale for every mode). DLAA stays as the game has it. They apply when the game next sets DLSS up: a world
  load, or a DLSS or resolution change in the game's settings. A DLSS setting turned on for the first time applies from
  the next game start. A DLSS override you set in the NVIDIA app wins over Kiln's preset.
- **Readout.** A few lines in the top right corner: the frames rendered and shown a second, the frame time, the
  upscaler, its mode, render and output size, and the DLSS preset. It applies at once.

### Behind the game's FSR 3

Choose **FSR 3** as the upscaler in the game's graphics settings, then choose what Kiln runs in its place: on the
**Graphics** tab, on the launcher's **Settings**, **Graphics** card, or in Deck mode's **Settings**.

| Choice | What runs |
|---|---|
| The game's FSR 3 (the default) | the game's own FSR 3: nothing changes |
| AMD FSR | FSR 4 where your graphics card and driver run it (AMD's own choice: RX 9000, RX 7000, RX 6000 and recent AMD handhelds), else FSR 3.1. You can keep it on FSR 3.1 under **AMD FSR version** |
| Intel XeSS | Intel XeSS, on Intel, AMD and NVIDIA cards |

- Since 0.2.0-dev.29.19 a new choice applies at the next frame while a world runs with FSR 3. (Before, it waited for the
  game to set FSR up again, which the game doesn't do for every quality change.) A choice that needs a game restart (the
  game started with its own FSR 3, and you then chose AMD FSR or Intel XeSS) says so first: "Restart the game to use AMD
  FSR" leads the readout, sits right under the choice on the Graphics tab, and leads the launcher's Graphics card and
  the Deck's row.
- The game's FSR quality and render scale still decide the render size. Upscaling only: no frame generation yet.
- Kiln shows what runs now and, when your choice doesn't run, why: files not downloaded, a missing graphics feature,
  another upscaler tool installed, and so on. Then the game's own FSR 3 runs. The launcher shows the same while the game
  runs, and what ran in your last game after it closes.
- With DLSS chosen in the game, the DLSS settings above apply instead. The game's XeSS entry is not where Kiln's XeSS
  runs.

**The files.** AMD's and Intel's files are not inside Kiln. The launcher downloads them when you ask: **Settings**,
**Graphics**, under the upscaler choice, or the files' rows in Deck mode's **Settings**. Choose AMD FSR or Intel XeSS
without its files and the launcher offers the download right there. Before a vendor's first download you see its
licence in full (AMD's files are under the MIT licence, Intel's under Intel's own) and agree to it; on the Deck the
right stick scrolls it. Then you see the progress, and **Remove** takes the files out again. Kiln checks every file
against the size and SHA-256 it pinned, and the game checks them again before it loads them. They go into the game's
`kiln/vendor` folder, never next to the game. The `"preview": ["upscalers"]` setting is no longer needed.

**AMD FSR on AMD cards** (0.2.0-dev.29.19). In 0.2.0-dev.29.18 the game's own FSR 3 ran on AMD cards instead of AMD
FSR, because Kiln didn't pass on one graphics feature AMD FSR needs. It does now, so AMD FSR runs on AMD cards too: FSR
4 where AMD's selection picks it, else FSR 3.1. A tester saw it run on an RX 9070 XT.

**FSR 4 in dark scenes.** On that card, FSR 4 drew dark scenes far too dark in this patch's test builds. 0.2.0-dev.29.19
tries a fix: AMD FSR now measures the picture's exposure itself, as AMD recommends, and FSR 4 gets the inputs that drew
right through OptiScaler. FSR 3.1 keeps the game's values. **This change is not yet confirmed on an RX 9000 card.** If
dark scenes still look too dark for you, choose **FSR 3.1** under **AMD FSR version**, on the Graphics tab or the
launcher's **Settings**, **Graphics** card, and tell us on GitHub or Discord.

**For testers:** a text file `kiln/control/amd` in the game folder takes one setting per line, to compare each part of
that change: `exposure`, `preexposure`, `reactive`, `transparency`, `masks`, `dynres`, `planes`, `hdr` and
`colour`, each with its value (for example `exposure one`). Kiln reads it at each FSR set-up, and kiln.log's AMD FSR
set-up line names what FSR gets. Players don't need this file.

We are looking for testers with AMD, Intel and NVIDIA cards and the Steam Deck: the launcher's Community page has
"Help test Kiln" ([Kiln's Discord in the launcher](/kiln/wiki/install#kilns-discord-in-the-launcher)).

### Next to other tools

Kiln's frame cap and DLSS settings step aside on their own when OptiScaler or a DLSS frame generation mod (NVIDIA
Streamline, `EnshroudedVKFG.ini`) is installed. With DLSSTweaks or another DLSS loader, only the DLSS settings step
aside. The upscaler behind FSR 3 steps aside for OptiScaler, frame generation mods and other upscaler tools' files in
the game folder. The Graphics page says why. The frame cap and the upscaler need Kiln's overlay hooks: with the
overlay's drawing off from the start ([below](#kilns-overlay-next-to-other-tools)), they are off too.

By hand, in `kiln/kiln.json` (the game reads it again every 2 seconds):

```jsonc
"graphics": { "fpsCap": 141, "dlssPreset": "K", "readout": true, "upscaler": "amd", "amdUpscaler": "auto" }
```

`fpsCap` is 0 (off) or 20 to 500; `dlssPreset` is `default`, `J`, `K`, `L` or `M`; `dlssScale` is `game`, `perMode`
or `custom`; `upscaler` is `game`, `amd` or `xess`; `amdUpscaler` is `auto` or `fsr3`.

## Kiln's overlay next to other tools

New in 0.2.0-dev.29.18. Kiln's overlay draws its menus, mod windows and HUDs into the game's frames. Some tools do the
same, and two of them in one frame can clash.

- **OptiScaler.** Kiln recognises [OptiScaler](https://github.com/optiscaler/OptiScaler) (the upscaler and frame
  generation tool) in the game folder under any of its names. With OptiScaler's own in-game menu on (its default), or
  its frame generation set, Kiln's overlay steps aside on its own, as it does for NVIDIA Streamline. Kiln's key
  bindings, the Mods entry and mods' menu rows keep working, and the Mods entry says why ("OptiScaler's own overlay menu
  is on", or "OptiScaler's frame generation is on"). Before, both overlays hooked the same graphics calls and both menus
  opened with Insert, and Kiln's menu could stay missing.
- **To have Kiln's overlay with OptiScaler**, set `OverlayMenu=false` under `[Menu]` in `OptiScaler.ini`, and leave
  `FGInput` and `FGOutput` under `[FrameGen]` at `auto`. OptiScaler's own menu and frame generation are then off, and
  its upscaling keeps working (set it up in `OptiScaler.ini`). OptiScaler's nightly builds since October 2026 run frame
  generation with their menu off too, so turning the menu off alone is not enough. `KILN_UI_OVERLAY=1` still tries both
  at once. The launcher's Play page names OptiScaler and says what to expect.
- **When the overlay can't draw, the game goes on.** A player's game closed right after the main menu showed, with
  OptiScaler's frame generation on and its menu off: Kiln's overlay work failed, and the game died. Most likely Kiln drew
  on the queue that frame generation presents from. Now Kiln draws only on the game's own queues, and only on one that
  can draw; on a frame generation queue it draws nothing and lets every frame through as the game made it. Any other
  failure of the overlay does the same: Kiln stops drawing for the rest of that session and hands the game's frames on
  untouched. kiln.log says it once, with the reason, the Mods entry shows it, and nothing of Kiln's keeps your keyboard
  or mouse. Key bindings and mods' menu rows keep working. The next start tries the overlay again.
- **A switch for the overlay.** The launcher's **Settings**, the Kiln card, **Overlay**: `off` turns Kiln's overlay
  drawing off, the same as `KILN_UI_OVERLAY=0`. Steam on Windows can't set that variable for the game, so this is the
  way there. It is `"ui": {"overlay": "off"}` in `kiln/kiln.json` and applies from the next game start. `auto`, the
  default, changes nothing. With the overlay off, key bindings, the Mods entry and mods' menu rows keep working; mod
  windows and HUDs don't show.
- **The crash guard watches a little longer.** Since 0.2.0-dev.29 a game that closes while Kiln's overlay starts makes
  the next start leave the overlay's drawing off. It now also counts a game that closes during the overlay's first
  frames (60 of them, or 20 seconds), and one that closes within 30 seconds after the overlay turned itself off. A normal
  quit doesn't count on Linux and the Steam Deck. On Windows Kiln doesn't see a normal quit yet, so a quit in those
  moments (about a second at 60 frames a second, or those 30 seconds) costs one start without the overlay; the start
  after tries it again.
- **The crash guard starts fresh after an update** (0.2.0-dev.29.19). A lock an older Kiln left after two failed
  overlay starts kept the overlay's drawing off after an update, also when the update fixed the cause. The guard now
  notes the Kiln version that wrote it, and a record of another version starts fresh; kiln.log says so.

Not yet checked on a PC with OptiScaler. If Kiln's menu is missing or the game closes, send a
[support report](/kiln/wiki/debugging#save-a-support-report): it includes `OptiScaler.ini`.

## Chat history

New in 0.2.0-dev.29.16, by bisdat (GitHub #44). In the game's chat (the HUD's, opened with Enter, and the Social
page's), **Up** brings back what you sent before and **Down** goes forward again; past the newest line you get back
the text you hadn't sent yet.

**Off by default.** Switch it on in the launcher's **Settings** ("Chat history", under Kiln's settings in the game), or
with `"ui": {"chatHistory": true}` in `kiln/kiln.json`, then restart the game.

| | Kept |
|---|---|
| While the game runs | the last 200 lines you sent, commands and chat |
| After a restart | only lines starting with `/`, the last 200, in `kiln/data/kiln.ui/chat-history.json` in the game folder |
| Never | other players' lines, very long lines, and any line with a word that looks like a password, key or token (`password`, `pass`, `token`, `key`, `secret`, `login`, `auth`...) |

Delete the file to forget your commands. It belongs to the game folder, not to a Steam account. Up and Down with Ctrl,
Shift or Alt stay the game's, and so do the arrows while an input method (Chinese, Japanese, Korean) is composing.
There is no mod API: Kiln never reads or logs the text. Tested in the game by bisdat.

**Search with Ctrl+R** (0.2.0-dev.30.3, by bisdat, GitHub #44). With chat history on, press **Ctrl+R** while typing in
the chat to search the lines Up and Down would bring back.

- Type to filter (case doesn't matter for plain letters). Each line shows once, at its latest place. Your unsent text is
  kept apart and comes back if you cancel.
- **Ctrl+R** again or **Down** goes to the next older match, **Ctrl+Shift+R** or **Up** to a newer one. A click on a row
  picks it.
- **Enter** or **Tab** puts the line into the chat field **without sending it**; press Enter again to send. **Esc**
  cancels.
- Characters typed with AltGr (`@`, `€`, `{` on many keyboards) go into the search. Alt+Tab, leaving the chat or
  starting an input method closes it.
- While the search is open it has the keyboard: mods' key bindings and Kiln's menu key get no presses.
- Nothing new is saved, and the search text is never logged.

## Other mods' slash commands

Since 0.2.0-dev.29.17 a chat line starting with `/` that names no Kiln command passes through untouched to the game and
other mods, instead of Kiln answering "Unknown command". A server that wants Kiln's reply back sets
`"unknownCommands": "reply"` in `kiln/config/chat.json`.

## Keys in Kiln's menu

**Kiln > Keys** lists every key binding of Kiln and your mods: click one, then press the new key, a mouse side or
middle button, or turn the wheel. Since 0.2.0-dev.29.9 each action also has **Unbind**, to leave it without a key
(except Kiln's own menu key, which would lock the menu away). Since 0.2.0-dev.29.3 one key press counts once, also when
the game loses the keyboard focus for a moment; if one press still acts twice, kiln.log has a line
"ui: key ... went down again ... ms after its last press": please send it.

Since 0.2.0-dev.29.12 a Kiln window that opens only takes clicks made while it is open, so a click from play (or every
click of a hitch) no longer presses a button in a new window, and the cursor no longer jumps after a hitch.

## The creative menu for the host

Since 0.2.0-dev.29.7 the pause menu's **Creative** entry and F7 are there for the host from the start in a world your own
game hosts (offline or co-op). See [Player rules and creative mode](/kiln/wiki/player-rules).
