---
title: "UI as blocks"
nav: "UI blocks"
description: "Define windows, HUD lines and keys in JSON or typed blocks, with config bindings and actions."
status: "pending"
updated: "2026-11-08"
---

> **New in 0.2.0-dev.20.** These blocks require the dev.20 runtime and MDK or newer. Their rendering, clicks, key/gamepad input and
> actions on a joined server still need a client check.

`WindowBlock`, `HudLineBlock` and `KeyBindingBlock` describe UI without a draw function. The same shape goes in the
`windows`, `hudLines` and `keyBindings` sections of `blocks/*.json`. Use `kiln new ui MyUi --set blocks=true`.

```jsonc
{ "format": 1,
  "windows": { "info": { "title": "My mod", "width": 360, "rows": [
    { "type": "value", "label": "FPS", "bind": "game.fps", "format": "0" },
    { "type": "button", "label": "Close", "does": { "closeWindow": "info" } } ] } },
  "hudLines": { "fps": { "text": "{game.fps:0} fps", "when": "game.inGame", "refresh": 1 } },
  "keyBindings": { "open-info": { "key": "F8", "does": { "openWindow": "info" } } } }
```

Players need the mod (`clients: mod`): the server cannot send these UI definitions. A dedicated server checks and keeps
blocks but draws and binds nothing. For free drawing, input fields, images, tables or tabs, use
[Game UI](/kiln/wiki/game-ui) in C#.

## Rows and values

Rows are `text`, `value`, `toggle`, `slider`, `choice`, `separator` and `button`. A window may be an overlay (`kind:
window`) or a screen in the game's look (`kind: screen`, Escape closes it). Its `menu` can add a main-menu or pause-menu
entry.

`config.<path>` binds an entry of this mod's config. Register the config before defining a block that names it. Toggles,
sliders and choices write through the config's validation; server and synced entries become read-only while joined to a
server. Slider edits wait until the drag rests before writing.

`game.*` exposes only safe values: `fps`, `frameMs`, `state`, `inGame`, `screen`, `language`, `clock`. `clock` is the
computer's time, not the world's time of day. There is no health, mana, position or inventory binding.

`{game.fps:0.0}` formats text. `when` accepts a value, `!value`, a comparison, or comparisons joined with `&&`; there is no
`||` or arithmetic. Text may be a string or a language map such as `{ "en": "Close", "de": "Schließen" }`.

## Buttons and keys

Each `does` performs exactly one action:

| Action | Where it acts |
|---|---|
| `command` | this game's command registry, on its tick |
| `toggle`, `set` | this mod's config, on the tick |
| `castAbility`, `applyEffect` | asks the server; it needs the same mod, with normal costs/cooldowns |
| `openWindow`, `closeWindow`, `toast` | this game's UI |

**A UI `command` does not send a chat command to a joined server.** Use an ability/effect action when the server must do
something. A refusal shows as a toast.

Keys use `<mod>:<name>` in the Kiln menu's Keys tab. The player's rebinding survives a restart; say `was` if you rename a
key block so that choice follows it.

## Refresh and unload

`refresh` is 0.1..3600 seconds (window default 0.25, HUD default 1). Values and conditions update at that pace, rather than
each frame. A closed window and a hidden HUD line draw nothing.

Unload removes the mod's windows, menu entries, HUD lines and keys and drops pending commands/config writes. A callback
already copied by a frame or key event checks its original mod lifetime before acting. Do not keep an old handle across
reload. Check visible behaviour after both a fresh load and a reload; a dedicated-server pass cannot do that.
