---
title: "Sounds, music and voice"
nav: "Sounds and voice"
description: "New and replaced sounds, music, voice-over and narration from your own audio files."
status: "works"
updated: "2026-11-05"
---

> **Not yet tried in a real game:** server code's sounds relayed to a joined player.

A mod can add sounds and **cues** (what the game and code play: UI sounds, 3D sounds, loops, ambience, music), replace the game's
sounds or change its cues, and add **voice-over** per language or narration no NPC speaks.

Only players with Kiln and your mod hear them: use `"side": "both"` (or `"client"`) and `"clients": "mod"`. Start with
`kiln new sound MySounds`.

## Ship sources and a recipe, never game audio

```
MySounds/
  MySounds.dll             a tiny Mod class is enough
  audio/ui/click.wav       your sources
  audio/sfx/boom_1.flac
  audio/vo/en/hello.wav
  assets/
    cook.json              the recipe
    assets.json            written by the cook
    cooked/                made on the player's machine; never shipped
```

New sounds need no game. Only an override reads your install, read-only.

## cook.json

Plain JSON: no comments, no trailing commas.

```json
{
  "format": 1,
  "tool": "soundcook",
  "out": "cooked",
  "guidNamespace": "<a uuid4 you pick once>",
  "inputs": {
    "confirm": { "guid": "b096387a-cc73-475a-bacd-69ce8cad9fc9",
                 "type": "keen::SoundContainerResource" }
  },
  "steps": [
    { "op": "sound", "name": "click", "src": "../audio/ui/click.wav",
      "channels": "mono", "cue": { "scene": "Ui", "volume": 0.8 } },
    { "op": "sound", "name": "boom_1", "src": "../audio/sfx/boom_1.flac",
      "channels": "mono", "normalize": -23 },
    { "op": "cue", "name": "boom", "sounds": ["boom_1"],
      "positional": { "min": 3, "max": 60 }, "volume": 0.5 },
    { "op": "cue", "name": "confirm", "base": "confirm", "guid": "@confirm",
      "mode": "override", "sounds": ["click"] },
    { "op": "voiceover", "name": "hello", "fallback": "en",
      "languages": { "en": ["../audio/vo/en/hello.wav"],
                     "de": ["../audio/vo/de/hello.wav"] },
      "subtitles": { "en": "Hello, traveller.", "de": "Hallo, Reisender." } },
    { "op": "voiceover", "name": "intro", "narration": true, "fallback": null,
      "languages": { "en": ["../audio/vo/en/intro.flac"] } }
  ]
}
```

| Step | Is |
|---|---|
| `sound` | one source file; `cue` also makes a one-take cue |
| `cue` | what's played; takes picked at random |
| `cue` with `mode: override` | changes a game cue everywhere |
| `voiceover` | takes per language: `en`, `de`, `fr`, `es`, `zh` |
| `voiceover` with `narration` | no speaker, plays in the lore queue; music dips |

Run `kiln cook` (`--check`: is one needed?). It decodes its output again and writes a report. Never change `guidNamespace` or a name:
other mods and game data use the GUIDs made from them.

## Sources

- **Formats:** WAV, FLAC, Ogg Vorbis, MP3, at any rate (the game plays 48 kHz; others are resampled).
- **Channels:** 3D sounds should be mono. Music and UI may be stereo.
- **Length:** up to 1 s starts at once. Longer sounds stream, so the first play waits.
- **Levels:** `"normalize": -28` sets loudness, `"gain": -6` a fixed change. The game's voice-over sits near −28 dBFS, UI −30, enemy
  effects −23.
- **Loops:** the game loops whole sounds. Cut the source to loop cleanly.

## Playing them

Game data plays cues by GUID: point a sequence, template or item at yours. From code:

```csharp
var boom = SoundId.Named(Context, "boom");
SoundHandle h = Sound.PlayAt(boom, position);
var hum = Sound.PlayOn(SoundId.Named(Context, "hum"), Client.LocalPlayer);   // follows
Sound.SetVolume(hum, 0.3f, TimeSpan.FromMilliseconds(200));
Sound.Stop(hum, TimeSpan.FromMilliseconds(100));
Sound.Play2D(SoundId.Named(Context, "click"));
Sound.PlayMusic(SoundId.Named(Context, "forest"), 0.8f, TimeSpan.FromSeconds(1));

Voiceover.Play(VoiceoverId.Named(Context, "hello"), speaker: npc);
Voiceover.Narrate(VoiceoverId.Named(Context, "intro"));
```

Calls work from any thread. Server code calls the same methods, and Kiln relays them to Kiln players nearby. A mod's sounds stop when
it unloads.

## Voice languages

The player's voice-over setting picks the slot; other languages get English. An empty slot is silent, so use `"fallback": "en"`.
Subtitles follow the text language and show even when the line is silent.

## Limits

A queued narration can't be pulled back. No lip-sync: the game has none.
