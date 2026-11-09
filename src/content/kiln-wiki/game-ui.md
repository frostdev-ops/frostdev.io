---
title: "Game UI"
description: "Menu entries, your own screens, crafting tabs and panels, HUD lines, toasts and key bindings."
status: "works"
updated: "2026-11-08"
---

All client side. On a dedicated server `Ui.Available` is false and calls do nothing, so a `side: both` mod can call them freely.
`OnLoad` can add entries in the main menu, before any world.

**dev.20+ adds [UI blocks](/kiln/wiki/ui-blocks):** windows, HUD lines and keys from JSON or typed records, without a draw function. Staged; not in released dev.19.

## Menu entries

```csharp
var screen = Ui.Screen("My mod", DrawScreen);
Ui.Menus.AddToBoth(UiText.Of(("en", "My mod"), ("de", "Mein Mod")), screen.Open);
Ui.Menus.Add(MenuLocation.PauseMenu, "Teleport home", () => Client.Post(GoHome));
```

<!-- shot: menu-entry | A mod's entry in the pause menu -->

The game draws these above its Settings entry, with its look, sounds, and mouse, keyboard and gamepad navigation. Labels follow
the game's language.

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

## Also

Every mod with a config gets a generated settings page in the Kiln menu. `Ui.Screens.Current` and `ScreenChangedEvent` tell you
which screen is open. To draw shapes, text and markers over the game every frame, see [Drawing](/kiln/wiki/drawing).
