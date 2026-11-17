---
title: "Looks, themes and fonts"
nav: "Looks and themes"
description: "Kiln's windows in the player's chosen look, the colours of a look by role, your own theme and font for your mod's windows, and themes players can pick."
status: "pending"
updated: "2026-11-17"
---

New in 0.2.0-dev.29.16 (mod API 0.2.8). Kiln's own windows now wear the game's colours and font by default, and the
player picks the look (see [Kiln in the game](/kiln/wiki/in-game#the-look-of-kilns-menus)). Mods' windows follow the
player's look too, unless the mod gives them a theme of its own.

## The player's look is the default

| `UiStyle` | Look |
|---|---|
| `Player` | the look the player chose: the game's (default), translucent, Kiln's classic ember, or a theme a mod offers |
| `Game` | the game's menu colours and its own UI font, read from the player's game (never shipped) |
| `Kiln` | Kiln's classic ember look |

**Behaviour change:** since 0.2.0-dev.29.16 `UiStyle.Player` is the default for `Ui.Window`, `Ui.Screen` and crafting
panels; before, windows defaulted to Kiln's ember look. A window that sets `Style = UiStyle.Kiln` keeps it. Inside any
window, `using (ui.Look(UiStyle.Game)) { ... }` switches the look for part of it.

Until the game's colours and font are read (and on a dedicated server), the game look uses a neutral dark stand-in, never
Kiln's red.

## Colours by role

A look is a palette of roles: `Text`, `TextMuted`, `WindowBackground`, `PanelBackground`, `FrameBackground`, `Border`,
`Accent`, `Button`, `Header`, `Attention`, `Warning`, `Ok`. `ui.Palette` gives the colours of the look in use, so your own
drawing matches whatever the player chose:

```csharp
ui.DrawRect(x0, y0, x1, y1, ui.Palette.Accent);
```

## A theme of your own

```csharp
var frost = Ui.Themes.Define("frost", new UiThemeSpec
{
    Name = UiText.Of(("en", "Frost"), ("de", "Frost")),          // in Kiln's Look list
    Base = UiStyle.Game,                                           // what it starts from: Game or Kiln
    Roles = { [UiThemeRole.Accent] = Color.FromRgba(0x7fd4ffff) },
    Colors = { [UiColorSlot.Border] = Color.FromRgba(0x7fd4ff66) },
    Background = 0.85f,                                            // the windows' background opacity
    Rounding = 6,
    Vars = { [UiStyleVar.ItemSpacing] = new(10, 8) },
    Font = Ui.LoadFont("fonts/Frost.ttf"),
    OfferToPlayer = true,                                          // players may pick it for all of Kiln's UI
});

var window = Ui.Window("Frost tools", Draw, new UiWindowOptions { Theme = frost });
using (ui.Theme(frost)) { /* windows begun here */ }
```

- **Scope:** a theme applies only where your mod puts it: its own windows, screens and crafting panels (`Theme` in their
  options) and `ui.Theme(theme)` inside its own draw code. A mod never restyles another mod's windows or Kiln's.
- **Offering:** `OfferToPlayer` lists the theme in Kiln's Look setting as "Frost (My mod)". No call sets the player's
  look; the player picks it. `Ui.Themes.Offered` and `Ui.Themes.Player` read the list and the player's choice.
- The theme's id is `<mod id>:<name>`. Defining the same name again changes it in place. It goes when your mod unloads;
  a player who picked it then sees the game look until it is offered again.
- The player's own opacity and size apply to themed windows too.

## Fonts

`Ui.LoadFont(path)` (relative to your mod's folder) or `Ui.LoadFont(bytes)` loads a TrueType or OpenType font for your
own windows: a theme's `Font`, or `using (ui.ModFont(font)) { ... }` around some text. At most 8 mod fonts at once, each
up to 8 MiB and 24 MiB together; past that `LoadFont` returns null and kiln.log says why. `UiFont.Game` and
`UiFont.GameBold` still pick the game's own font in any look.

## Item icons in your windows

Since 0.2.0-dev.29.15 a window can draw the game's own icon of an item, and since 29.16 without its transparent margin:
[Item icons and names](/kiln/wiki/game-ui#item-icons-and-names).

## Not yet seen in a real game

The new look, its settings and mods' themes were rendered with Kiln's preview tool using the game's real colours and
fonts, and pass Kiln's tests, but nobody has seen them in the game yet. If a window looks wrong, send `kiln/logs/kiln.log`.

The full guide is in Kiln's repository, `docs/kiln/ui.md` ("Looks and themes"), on
[GitHub](https://github.com/frostdev-ops/kiln).
