---
title: "Game UI"
description: "Menu entries, your own screens, the pointer and drag and drop, crafting tabs and panels, HUD lines, toasts, key bindings and raw key presses, the game's inventory slots, item icons and names, and values in the game's own UI."
status: "works"
updated: "2026-11-21"
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

Since 0.2.0-dev.27 the pause menu scrolls when mods add more entries than fit. Since 0.2.0-dev.29 it scrolls whenever
its entries are taller than the screen, so Quit to Desktop stays reachable at every resolution, with Kiln's and other
mods' entries (SET's tools and Creative pushed it off a 1280x720 or 1080p screen); a menu that fits is drawn as the game
draws it. Auto, the default for mods' entries, now shows every mod's entry whenever the menu can scroll. Where a menu
can't scroll (the main menu, or a game build where Kiln can't make the pause menu scroll) and has more than 3 mods'
entries, they aren't drawn there:
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

A screen takes the mouse and keyboard while open. Escape closes it. The draw function runs every frame: hand real work
to `Client.Post`.

Looks: `UiStyle.Game` uses the game's colours and font, `UiStyle.Kiln` Kiln's ember look, and `UiStyle.Player` the look
the player chose. **Since 0.2.0-dev.29.16 `UiStyle.Player` is the default** for windows, screens and crafting panels;
before, windows defaulted to Kiln's look. Your own theme and font: [Looks, themes and fonts](/kiln/wiki/ui-looks).

### The pointer, held buttons and drag and drop

New in 0.2.0-dev.30.3 (mod API 0.2.13), GitHub #113 (thanks Fuzen777): for a two-pane item screen with drag and drop
between the panes, or a "hold the button on a cell" action.

```csharp
// where the pointer is and what is held
if (ui.Pointer is { } p && ui.ButtonHeld(UiMouseButton.Left))
    ui.DrawRect(p.X - 3, p.Y - 3, p.X + 3, p.Y + 3, Color.White);

// drag and drop: a source after one widget, a target after another
foreach (var s in _backpack)
{
    ui.Selectable(s.Name + "##b" + s.Slot);
    ui.DragSource("stack", s.Slot.ToString(), s.Name);       // while dragged: "Iron Bar" by the pointer
}
ui.Selectable("Chest");
if (ui.DropTarget("stack") is { } slot) Client.Post(() => MoveToChest(int.Parse(slot)));   // once, on the release
```

| Member | What |
|---|---|
| `ui.Pointer` | where the pointer is now, a `Vector2` in the overlay's pixels (the space `DrawRect` draws in); null until the overlay has seen the cursor |
| `ui.ButtonHeld(button)` | the button (`UiMouseButton.Left`, `Right`, `Middle`) is down now, wherever the pointer is |
| `ui.DragSource(kind, payload, preview)` | after a widget, every frame: the widget can be dragged; true on the frames it is. `payload` is text, at most 4096 bytes; `preview` is drawn by the pointer |
| `ui.DropTarget(kind)` | after a widget, every frame: the payload on the frame a drag of that kind is released over it, else null |

- **Kinds are your mod's own.** Another mod's target named `"stack"` never gets your payload, nor you theirs.
- The pointer means something only while one is shown: a Kiln window or screen, the Kiln menu, or one of the game's
  menus. In the play view the game recentres the cursor for mouse look. A drag works inside interactive windows; a panel
  with `Interactive = false` gets no presses.
- Released over anything but a target of its kind, a drag does nothing. If the source stops being drawn while the button
  is held (a list that scrolled), the drag goes on with its last payload.
- On an older Kiln: `Pointer` is null, `ButtonHeld` and `DragSource` false, `DropTarget` null.

Not checked in a real game yet.

## Crafting menus

```csharp
Ui.Crafting.AddTab(workshop: 0, UiText.Of(("en", "Frost"), ("de", "Frost")),
    new[] { frostEdgeRecipe });
Ui.Crafting.AddPanel("Recipe info", (ui, c) => ui.Text($"recipe {c.Recipe:x8}"));
```

Workshop 0 is the hand menu. Panels sit next to any open crafting menu. The game has a fixed number of tabs; past that, an addition
is refused.

**At production stations** (0.2.0-dev.29.15): a kiln's, smelter's or loom's screen is not a crafting menu, so tabs never
show there. A panel shows there only when it asks:

```csharp
Ui.Crafting.AddPanel("Kiln helper", (ui, c) => ui.Text($"station {c.Station}"),
    new CraftingPanelOptions { AtFactories = true, When = c => c.IsFactory });
```

There `CraftingScreen.IsFactory` is true and `Station` is the station's entity; `Workshop` may be 0 or another station's,
so key on `Station`. Existing panels stay off those screens. Send `Station` to your server half, which checks the player
is near it before acting ([Production stations](/kiln/wiki/stations)). Not yet seen in a real game.

## HUD, toasts and keys

```csharp
Hud.Show("mymod.status", () => $"temp {_temp:F1}", HudAnchor.TopRight);
Hud.Toast("Saved!", ToastKind.Success, seconds: 3);
KeyBindings.Register("mymod.toggle", "F8", () => screen.Toggle(), "Toggle my window");
```

Players remap keys in the Kiln menu, and since 0.2.0-dev.29.9 can leave an action unbound. A key Kiln handles doesn't
also reach the game. Letter keys fire during play only, so typing in chat doesn't trigger them. Since 0.2.0-dev.29.3 a
binding's press comes once for one press, also when the game loses the keyboard focus for a moment, and its release
reaches you while one of your windows has a text field focused.

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

**Presses as they come: `KeyInput.Listen`** (Kiln.Ui, mod API 0.2.11, since 0.2.0-dev.29.19). For a mod that reads
presses itself: its own "press a key" field, a key it handles by state, a shortcut layer of its own. An action the
player should be able to remap stays a `KeyBindings.Register` binding.

```csharp
var listener = KeyInput.Listen(p =>
{
    if (!p.Down || p.Repeat || p.Captured || p.TextInput) return false;  // play only, presses only
    Save(p.Chord.ToString());                 // "Ctrl+K", "Backquote", "Mouse4": the names the Keys page saves
    return true;                              // keep this press from the game
});
if (!listener.Ok) Log.Info(listener.Reason!);  // no Kiln overlay here (a dedicated server)
```

- Each press has `Down` (false for a release), `Repeat`, `Captured` (a Kiln menu, screen or text field has the input),
  `TextInput`, `Mods` (Ctrl, Shift, Alt), and `Code` and `Chord` as the Keys page stores them.
  `KeyInput.PressCode(vk, scan)` gives that code for a key.
- With `KeyListenFlags.Mouse` (the default) the middle and side mouse buttons and the wheel come too;
  `KeyListenFlags.None` gets keyboard keys only.
- It runs on the game's window thread before the game gets the press: keep it short. Returning true keeps the press
  from the game; every listener still gets every press.
- The listener ends when the mod unloads (or call `Dispose()`). A handler that throws is logged under its mod. Where
  there is no Kiln overlay, `Listen` returns a listener that is not `Ok`, with a `Reason`, and never throws for that.

Not yet used in a real game.

## The game's inventory slots

`Ui.Inventory` (0.2.0-dev.30, client only) works on the slots the game draws: the backpack, the inventory menu, a chest,
a station, an NPC's crafting.

```csharp
// Ctrl+click marks an item; the game never sees the press
Ui.Inventory.OnClick(new SlotClickOptions { Modifiers = SlotModifiers.Ctrl }, click =>
{
    if (click.ItemEntity.Value == 0) return;           // an empty slot, or a plain stack (no item entity)
    SendToMyServer(click.ItemEntity);                  // your server half checks the item is the player's
    Ui.Inventory.Mark(click.ItemEntity, new SlotMark(new Color(235, 60, 50)));
});
```

- `OnClick` gets a click on a slot with the item's identity; by default the game never sees the press. Clicks count only
  on screens with a pointer, never in the play view. A click is a wish: check it on the server before acting.
- `Mark`, `MarkWhen` and `Hovered` draw a mark over an item's slot, wherever the game draws it, and say which slot is
  under the cursor.
- **Where the press was** (new in 0.2.0-dev.30.3, mod API 0.2.13, GitHub #107, thanks Fuzen777): `SlotClick.Pointer`,
  in the overlay's pixels, the space `UiDraw` draws in and `ui.Pointer` reports (0, 0 is the top left of the game's
  picture). Not UI units.
- **The right slot at every resolution** (0.2.0-dev.30.3, GitHub #107). Through 0.2.0-dev.30.2 Kiln scaled the game's UI
  by the wrong size, so marks, clicks, `Hovered` and docked panels missed the slot whenever the game's pixels per UI
  unit aren't 1: above it at 1440p and 4K (at twice its position at 3840x2160), below it at 1280x720 or with a UI scale
  above 1 at 1080p. The fix follows the game's code; marks and clicks at two resolutions and UI scales are a guided
  check not yet run in a real game.

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

The sample `ValueBars` shows it. Every part was held in 0.2.0-dev.28 and is on since 0.2.0-dev.29, not yet confirmed in a
real game (`ui.values.detail`, `ui.values.slot`, `ui.values.held`, `ui.values.hud`, `ui.values.tooltip_lines`,
`ui.slots.inspect`). They exist only in a player's game, never on a dedicated server; hooks go in on first use by a
mod, and after a game update these rows stay off until Kiln is updated for that build.

## Item icons and names

New in 0.2.0-dev.29.15: the game's own icon of an item in any Kiln window, screen or crafting panel, and its name in the
player's language.

```csharp
ui.ItemIcon(item, 48 * ui.Scale);                          // the icon the inventory shows
ui.SameLine();
ui.Text(Items.DisplayName(item) ?? "?");                   // "Holzscheite" in a German game
var img = Ui.ItemImage(item);                              // for Image, ImageButton, RenderDraw.Image
if (img != null && ui.ImageButton("pick", img, 40 * ui.Scale, 40 * ui.Scale)) Pick(item);
```

- The icon is read from the player's own game data when a mod first draws it; nothing loads before. A new item shows
  its base item's icon until its own is served. An unknown id, or an icon still loading, draws a grey placeholder of the
  same size, so the layout never jumps.
- `Items.DisplayName` works on any side, also on a joined player's game and in the main menu. On a dedicated server
  (whose data has no texts) it gives the English name. A server has no icons: `Ui.ItemImage` is null and
  `Ui.ItemIconsAvailable` false there.
- **Trimmed** (0.2.0-dev.29.16): the game's icons sit small inside a wide transparent margin. `ui.ItemIconTrimmed`,
  `ui.ImageTrimmed` and `ui.ImageButtonTrimmed` (and `RenderDraw.ImageTrimmed`) draw only the art, as large as fits.
  `ui.ImagePart` and `RenderDraw.ImagePart` draw part of an image, such as one cell of a sprite sheet.
- The overlay holds up to 960 images (fonts, mods' PNGs and item icons together), at most 8 new ones a frame; Kiln keeps
  up to 256 icons and drops those not drawn for a while.

Not yet seen in a real game: lab checks and host tests only.

## Also

Every mod with a config gets a generated settings page in the Kiln menu. A slider there has a number field beside it, for
values that are hard to reach by dragging on a wide `[Range]`. `Ui.Screens.Current` and `ScreenChangedEvent` tell you
which screen is open. To draw shapes, text and markers over the game every frame, see [Drawing](/kiln/wiki/drawing).

**When Kiln's overlay doesn't draw** (next to a frame generation mod, and since 0.2.0-dev.29.18 next to OptiScaler,
with the launcher's overlay switch off or after the overlay failed during a session: [Kiln's overlay next to other
tools](/kiln/wiki/in-game#kilns-overlay-next-to-other-tools)), windows and full screens stay closed (their `Show` and
`Open` calls don't throw), HUDs, toasts and drawing don't show, `Ui.Status.Error` carries the reason, and the rows
`ui.windows`, `ui.draw`, `ui.menu_page`, `render.draw` and `kiln.screen` are unavailable with it. Menu entries, key
bindings and UI ticks keep working. Native plugins: `KilnUiStatus.error` gives the reason, frame and pre-overlay
callbacks are no longer called, and `wheel_open` returns `KILN_ERR_UNAVAILABLE`.

**Kiln's graphics tools** ([Graphics](/kiln/wiki/in-game#graphics), 0.2.0-dev.29.18) have no managed call in this
release. Native plugins read what they do with `graphics_status` in `kiln_ui.h`: the cap, the frame rates, the DLSS in
use, the upscaler behind the game's FSR 3 and a stable reason code when the chosen one doesn't run (the struct is 248
bytes; a 72-byte caller still gets the fields it knows). `graphics_set` is Kiln's own: a plugin's call is refused.
Tools such as the launcher read `kiln/state/graphics.json` in the game folder, written only when it changes.
