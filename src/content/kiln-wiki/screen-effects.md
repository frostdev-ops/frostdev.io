---
title: "Screen effects"
description: "Tint, grade, vignette, flash or fade the player's screen: as a block on a status or spell, or from code on one player, near a place or for everyone."
status: "works"
updated: "2026-11-17"
---

Colour grading, a tint, a vignette, fades and flashes, drawn over each frame of the player's game. No shader, no
compiler, no game data. Seen in the game: a flash, a fade to black, a cold tint under the menu, a status's screen effect,
and eight effects at once.

## As a block

```csharp
var cold = Blocks.Define("cold", new ScreenEffectBlock
{
    Temperature = -0.6f, Saturation = 0.7f,
    Vignette = new ScreenVignette { Color = "#10243a", Amount = 0.6f },
    FadeIn = 1, FadeOut = 1,
});
Blocks.Define("frozen", new StatusBlock { Name = "Frozen", Seconds = 10, Screen = cold });
```

```jsonc
{ "format": 1,
  "screenEffects": {
    "cold":  { "temperature": -0.6, "saturation": 0.7, "vignette": { "color": "#10243a", "amount": 0.6 }, "fadeIn": 1, "fadeOut": 1 },
    "flash": { "fill": "#ffffff", "seconds": 0.2, "fadeOut": 1.5 } },
  "statuses": { "frozen": { "name": "Frozen", "seconds": 10, "screen": "cold" } },
  "effects":  { "flashbang": { "screen": "flash" } } }
```

| Field that takes one | Shows |
|---|---|
| `StatusBlock.Screen` | on the screen of the player who has the status, while they have it, then by its fade out |
| `EffectBlock.Screen` | for the target when it is a player; at a place, for the players within its `range` (default 30 m). It needs `seconds` |

See [Building blocks](/kiln/wiki/blocks) for statuses and effects.

## From code

```csharp
var h = ScreenEffects.Play(new ScreenEffect { Fill = "#000000", FadeIn = 1.5f });          // fade to black, until stopped
ScreenEffects.Stop(h);                                                                    // fades out by its FadeOut
ScreenEffects.Play(new ScreenEffect { Fill = "#ffffff", Seconds = 0, FadeOut = 0.4f });  // a flash
ScreenEffects.SetStrength(h, 0.3f);                                                       // follow a value while it plays
ScreenEffects.PlayFor(player, effect);                                                    // server: that player
ScreenEffects.PlayNear(position, 20, effect);                                             // server: players within 20 m
```

`ScreenEffects` is in the service `Vfx` (list it in `KilnServices`); the block comes with `Blocks`. In a player's game,
`Play` shows it there, from any thread. On the server, `Play` sends it to every Kiln player. Up to
8 effects play at once; a ninth is refused. A mod's effects stop when it unloads.

| Field | Range, default | What |
|---|---|---|
| `Exposure` | -8 to 8 stops, 0 | 1 is twice as bright |
| `Temperature` | -1 to 1, 0 | cold to warm |
| `Contrast`, `Saturation`, `Gamma` | 1 changes nothing | saturation 0 is grey |
| `Tint` | `"#rrggbb"`, or with an amount | multiplies the picture |
| `Vignette` | an amount, or color, radius and softness | darker or coloured edges |
| `Fill` | as `Tint` | the whole picture goes to this colour: fades and flashes |
| `Strength` | 0 to 1, 1 | how much of the whole effect shows |
| `FadeIn`, `Seconds`, `FadeOut` | `Seconds` left out: until stopped | |
| `Order` | 0 | several at once: lower first |

## What players need

Nothing for the effect itself (`clients: none`): each play is sent whole to the Kiln players who should see it. A player
without Kiln just doesn't see it. The status or spell that carries it needs what it always needs.

The effect goes on the finished frame, so it covers the game's HUD and menus; Kiln's own windows draw over it. It works
with SDR and HDR screens, and costs nothing while no effect plays.

**If something goes wrong,** `kiln/config/screen.json` with `{"enabled": false}` turns screen effects off. A failure turns
them off by itself with one kiln.log line, `screen: off, the game carries on: ...`.

The sample `ScreenEffects` shows both ways. The full reference is in Kiln's repository,
`docs/kiln/modding/screen-effects.md` and `docs/kiln/services/screen.md`, on [GitHub](https://github.com/frostdev-ops/kiln).
