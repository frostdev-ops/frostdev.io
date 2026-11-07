---
title: "Drawing on screen and in the world"
nav: "Drawing"
description: "Run code every frame and draw over the game: shapes, text and images in pixels, markers and labels at world positions."
status: "pending"
updated: "2026-11-07"
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
  images from your mod (`Ui.LoadImage("pin.png")`). Multiply sizes by `e.Scale`, the UI scale.
- **`e.World`, at world positions** in metres: markers, labels, icons, lines, boxes and rings. Points behind the camera
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

## Limits

- Client only.
- World drawing needs the game's camera, which Kiln finds on the current game build. On a build where it isn't found,
  `e.Camera.Valid` stays false and only screen drawing works.
- Camera shake (gliding) isn't included, so markers can tremble a little against the scene.

The `RenderSample` mod in the Kiln repository has an FPS counter, a compass strip and waypoints: Ctrl+J drops one where
you stand, Ctrl+Shift+J removes the nearest, Ctrl+Alt+J hides everything. Native plugins get the same drawing through
`kiln_render.h`.
