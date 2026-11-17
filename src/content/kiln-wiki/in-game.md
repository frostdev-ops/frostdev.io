---
title: "Kiln in the game"
nav: "In the game"
description: "Kiln's line on the main menu, the look of Kiln's menus, chat history, and the keys of Kiln's menus."
status: "pending"
updated: "2026-11-17"
---

What Kiln adds to the game itself, besides your mods. The Kiln menu and its pages are on
[Profiles and mods](/kiln/wiki/profiles#the-kiln-menu); languages on [Kiln in your language](/kiln/wiki/languages).

## The line on the main menu

Since 0.2.0-dev.29.11 the main menu shows Kiln's mark and **Kiln 0.2.0-dev.29.16 - N Mods Loaded** above the game's
build number, in the game's own footer style. N counts every mod that started, of any kind: Kiln mods, native mods and
the mods of every other loader Kiln runs. A mod that is off, waiting or failed doesn't count.

With XHL-Core installed, Kiln's line takes the place of XHL-Core's ("All mods loaded", or its warnings such as "Game
updated" and "Mod conflict"). To get XHL-Core's line back, switch **mainMenuFooter** off under **Mods > Kiln
settings**. (29.15 lost the mark in front of the line; 29.16 brings it back.)

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
