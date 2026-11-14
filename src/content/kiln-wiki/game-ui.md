---
title: "Game UI"
description: "Menu entries, your own screens, crafting tabs and panels, HUD lines, toasts, key bindings, and values in the game's own UI."
status: "works"
updated: "2026-11-14"
---

All client side. On a dedicated server `Ui.Available` is false and calls do nothing, so a `side: both` mod can call them freely.
`OnLoad` can add entries in the main menu, before any world.

**dev.20+ adds [UI blocks](/kiln/wiki/ui-blocks):** windows, HUD lines and keys from JSON or typed records, without a draw function. Requires the dev.20 runtime and MDK or newer; rendering and input checks remain on the feature page.

## Menu entries

```csharp
var screen = Ui.Screen("My mod", DrawScreen);
Ui.Menus.AddToBoth(UiText.Of(("en", "My mod"), ("de", "Mein Mod")), screen.Open);
Ui.Menus.Add(MenuLocation.PauseMenu, "Teleport home", () => Client.Post(GoHome));
```

<!-- shot: menu-entry | A mod's entry in the pause menu -->

The game draws these above its Settings entry, with its look, sounds, and mouse, keyboard and gamepad navigation. Labels follow
the game's language.

Since 0.2.0-dev.27 the pause menu scrolls when mods add more entries than fit. Where a menu can't scroll (the main menu,
or a game build where Kiln can't make the pause menu scroll) and has more than 3 mods' entries, they aren't drawn there:
the player chooses them on Kiln's **Mods** page, under **Menu entries**, where your `OnClick` runs the same way. The
player's setting `modEntries` decides ([Menu entries of mods](/kiln/wiki/profiles#menu-entries-of-mods)). Your code
doesn't change. The capability `ui.menu_scroll` says whether the pause menu scrolls.

## Your own screens

```csharp
var screen = Ui.Screen("Waypoints", ui =>
{
    ui.Slider("Radius", ref _radius, 1, 100);
    ui.InputText("Name", ref _name, 64);
    if (ui.Button("Save")) Client.Post(Save);
    if (ui.Button("Close")) ui.CloseScreen();
}, new UiScreenOptions { Style = UiStyle.Game, Width = 640, Height = 480 });
```

<!-- shot: ui-screen | A mod's own screen in the game's style -->

A screen takes the mouse and keyboard while open. Escape closes it. `UiStyle.Game` uses the game's colours and font, `UiStyle.Kiln`
Kiln's. The draw function runs every frame: hand real work to `Client.Post`.

## Crafting menus

```csharp
Ui.Crafting.AddTab(workshop: 0, UiText.Of(("en", "Frost"), ("de", "Frost")),
    new[] { frostEdgeRecipe });
Ui.Crafting.AddPanel("Recipe info", (ui, c) => ui.Text($"recipe {c.Recipe:x8}"));
```

Workshop 0 is the hand menu. Panels sit next to any open crafting menu. The game has a fixed number of tabs; past that, an addition
is refused.

## HUD, toasts and keys

```csharp
Hud.Show("mymod.status", () => $"temp {_temp:F1}", HudAnchor.TopRight);
Hud.Toast("Saved!", ToastKind.Success, seconds: 3);
KeyBindings.Register("mymod.toggle", "F8", () => screen.Toggle(), "Toggle my window");
```

Players remap keys in the Kiln menu. A key Kiln handles doesn't also reach the game. Letter keys fire during play only, so typing in
chat doesn't trigger them.

Since 0.2.0-dev.27 a binding can use the mouse: `Mouse4`, `Mouse5`, `MouseMiddle`, `WheelUp`, `WheelDown`, `WheelLeft`
and `WheelRight`, with Ctrl, Shift and Alt (`"Ctrl+WheelUp"`, `"Shift+Mouse4"`; GitHub issue 29). One wheel notch is one
press, and it fires nothing while a Kiln screen has the mouse. The left and right buttons can't be bound. On an older
Kiln these names don't parse: check with `KeyChord.TryParse` if your mod should still load there. Mouse bindings were
tested in unit tests and a test window under Wine, not yet in a real game.

Since 0.2.0-dev.28 every key has a name that reads back at the next start (GitHub issue 33). A key with no name of its
own is saved as `Key` and its code (`Key223`), and the OEM keys have names (`Oem8`, `IntlBackslash` and the others).
In 0.2.0-dev.27 such a key was lost at the next start; a `keybinds.json` of dev.27 loads and fires on that key again.

Punctuation names (`Backquote`, `Minus`, `Equals`, `Comma`, `Slash` and the others) now mean the key at that place on a
US keyboard, on every layout: a default of `Backquote` is the key left of 1 on UK, German and French keyboards too.
Letters, digits and every other key stay as before: `K` is the key that types K. A punctuation key a layout moves
somewhere else (AZERTY's `,`, Dvorak, the Japanese Yen key) counts as its code's US place. On a non-US layout a binding
saved under a punctuation name in dev.27 may now be a different key: set it again in Kiln > Keys if it moved.
Tested in unit and host tests; a UK layout in a real game is a guided check, not yet run.

## Values in the game's own UI

New in 0.2.0-dev.28, for client mods. `Ui.Values` replaces the numbers and bars the game itself draws for an item and
for the local player:

| Member | Replaces |
|---|---|
| `ItemBar(item, provider)` | the number, bar and label of an item's detail view |
| `SlotBar(item, provider)` | the bar on an inventory slot |
| `HeldBar(provider)` | the held item's indicator (a watering can's water) |
| `Hud(HudValue, provider)` | the local player's health, stamina and mana |
| `TooltipLines(item, provider)` | adds lines for an item to Kiln's **Item details** window |
| `Slots()`, `SubscribeSlots(onFrame)` | reads the slots the game drew in the last frame |

- **The picture only.** The server keeps the real values: nothing heals, spends or holds more. A player without the mod
  sees the game unchanged.
- A provider answers `UiProviderDecision.Pass`, `.Replace(new UiBarEdit(...))` or `.Refuse(reason)`. Providers run in
  the order they were registered; the last one that writes a field wins. Five errors in a row remove a provider.
- Providers run inside the game's own UI frame, on its main thread: read values a tick cached, never wait, and never
  call the server world. Keep a label fixed and put changing numbers into the value: each new text is kept until the
  game ends.
- Extra lines don't go into the game's tooltip, which has no room for them: they show in Kiln's **Item details** window
  (the pause menu's "Item details" entry, or `OpenTooltipDetails()`).

The sample `ValueBars` shows it. **Every part is switched off until its game test**
([held capabilities](/kiln/wiki/code-mods#built-waiting-for-a-game-test): `ui.values.detail`, `ui.values.slot`,
`ui.values.held`, `ui.values.hud`, `ui.values.tooltip_lines`, `ui.slots.inspect`); `"preview"` in `kiln.json` switches
them on for a test.

## Also

Every mod with a config gets a generated settings page in the Kiln menu. A slider there has a number field beside it, for
values that are hard to reach by dragging on a wide `[Range]`. `Ui.Screens.Current` and `ScreenChangedEvent` tell you
which screen is open. To draw shapes, text and markers over the game every frame, see [Drawing](/kiln/wiki/drawing).
