---
title: "Drawing on screen and in the world"
nav: "Drawing"
description: "Run code every frame and draw over the game: shapes, text and images in pixels, markers and labels at world positions, and outlines on entities with the game's own highlight."
status: "pending"
updated: "2026-11-23"
---

> **New in 0.2.0-dev.16, not yet seen in the game.** It passes its tests (projection, the time budget, dispatch). Nobody
> has seen a mod's drawing in a real game yet.

A client mod can subscribe to `RenderFrameEvent` and draw through it. It comes once per frame, on the game's render
thread.

```csharp
[Subscribe]
private void OnFrame(RenderFrameEvent e)
{
    e.Draw.Text(10, 10, $"{e.Fps:F0} fps");
    if (!e.Camera.Valid) return;                     // main menu, loading screen
    e.World.Marker(_home, Color.Orange);
    e.World.Label(_home, $"Home {e.World.DistanceTo(_home):F0} m");
}
```

## What you can draw

- **`e.Draw`, in pixels** from the top left: lines, rectangles, circles, triangles, polygons, arrows, text, and PNG
  images from your mod (`Ui.LoadImage("pin.png")`) or the game's item icons (`Ui.ItemImage(item)`, 0.2.0-dev.29.15).
  Since 0.2.0-dev.29.16 `ImageTrimmed` draws an image without its transparent margin and `ImagePart` a part of one (a
  sprite sheet's cell). Multiply sizes by `e.Scale`, the UI scale.
- **`e.World`, at world positions** in metres: markers, labels, icons, lines, boxes and rings. Since 0.2.0-dev.31 it draws
  nothing while one of the game's menus covers the world; `e.WorldOverMenus` takes the same calls and draws over menus too
  ([details](/kiln/wiki/station-menus#draw-over-the-games-menus)). Points behind the camera
  aren't drawn; lines, boxes and rings are cut at the screen's edge. `ToScreenClamped` puts an off-screen point on the
  edge of the screen, so you can draw an arrow towards it.
- **`e.Camera`**, the game's camera this frame: position, heading (0 is north), pitch, field of view, and `Pivot`,
  about where the character's head is. `Render.Camera` reads the latest one from any thread.

Your drawing sits over the game's picture, its HUD and menus, and under Kiln's own windows, HUD lines and toasts. It
goes away when your mod unloads.

## Rules of the render thread

- Don't touch the game from the handler. Read what your mod keeps, and use `Client.Post` to act on the game.
- Don't keep `e`, `e.Draw` or `e.World`: they're reused next frame, and drawing outside the handler does nothing.
- Keep it fast: a handler gets 2 ms per frame. One that's over that in most frames, takes 100 ms three times, or throws
  five times is turned off. Your log says why, and a toast names your mod.

With no subscribers, render events ask for no extra frames.

## Outlines on entities

> **New in 0.2.0-dev.30.3 (mod API 0.2.13).** On the current game client (build 26430625). Not checked in a real game yet.

`Ui.World.Outline(entity, options)` lights an entity's model with the game's own highlight, the outline the game draws
around the building cursor's target: the chests that just received items, or where a searched item lies (GitHub #111,
thanks Fuzen777). It isn't frame drawing: no render event, any thread, and it stays until it ends.

```csharp
private static readonly OutlineOptions Filled = new() { Color = Color.Green, Pulse = true, Duration = TimeSpan.FromSeconds(8) };

// on the client, when your server half says these chests just received items
private void OnFilled(IReadOnlyList<EntityId> chests)
{
    if (!Ui.World.OutlinesAvailable) return;     // a server, an older Kiln, a game build without it
    foreach (var chest in chests) Ui.World.Outline(chest, Filled);
}
```

| `OutlineOptions` | What |
|---|---|
| `Color` | the colour, alpha above 0. Default gold (`Ui.World.DefaultOutlineColor`) |
| `Pulse` | the colour breathes |
| `Priority` | among mods' outlines on one entity the highest wins; on a tie, the newest |
| `Duration` | null (the default): until you dispose it. Otherwise how long it lasts |

- `Outline` returns a `WorldOutline`. `Dispose()` ends it; `State` and `Reason` say where it stands: `Waiting` (`Pending`,
  `Outshone`, `NoModel`, `SwitchedOff`), `Shown`, `GameHighlight` or `Ended`. `Ui.World.ClearOutlines()` ends all of
  your mod's outlines, and they end when it unloads. It shows from the next client step.
- The id your server half sends works: replicated entities keep the server's id.
- **Two mod colours at once.** Kiln uses two of the game's highlight groups and colours them itself. A third colour
  shares the nearest one (`ColorShared`).
- **The game's highlight first.** The building cursor's highlight wins over mods' outlines. A player can change that in
  `kiln/kiln.json`: `"ui": {"outlines": "mods-first"}` puts mods' outlines first, `"off"` turns them off (they wait
  with `SwitchedOff`), and `"game-first"` is the default. It is read at the game's first outline, so a change applies
  at the next start. Other tools' highlights (Quick Deposit, Find) always show instead.
- **No through-walls outline.** What stands in front of the entity hides it.
- **Models only:** props, chests, stations, NPCs, creatures, dropped items. Voxel models and the terrain wait with
  `NoModel`, and so does an entity that isn't streamed in. Up to 64 entities light up per client step, so hundreds take a
  few steps. At most 1024 outlines per mod.
- Client only: `OutlinesAvailable` is false on a dedicated server. Nothing is hooked until a mod asks for an outline.
  Native plugins use `kiln.render` v2.

## Limits

- Client only.
- World drawing needs the game's camera, which Kiln finds on the current game build. On a build where it isn't found,
  `e.Camera.Valid` stays false and only screen drawing works.
- Camera shake (gliding) isn't included, so markers can tremble a little against the scene.
- `e.Camera` only reads the camera. To play a camera path, follow an entity or change the lens, see [Camera control](/kiln/wiki/camera).

The `RenderSample` mod in the Kiln repository has an FPS counter, a compass strip and waypoints: Ctrl+J drops one where
you stand, Ctrl+Shift+J removes the nearest, Ctrl+Alt+J hides everything. Native plugins get the same drawing through
`kiln_render.h`.
