# Haunted Library

## Redesigned direction

Haunted Library is a composed storybook interior rather than an atmospheric wallpaper. It uses three explicit depth layers:

1. A moonlit pointed-arch window and masonry establish the background.
2. Full-height bookcases, varied spines, flying pages, and a shy ghost establish the midground.
3. A carved reading desk, open book, stacked volumes, and a three-arm brass candelabra create a strong foreground silhouette.

The narrative beat is friendly and restrained: on a long cycle, the ghost peeks from behind the right shelf, looks around, gives a small wave, and retreats. Three pages drift at different depths, three candle flames flicker independently, and nine dust motes rise through the warm light. The scene remains a dark tonal frame for academic content rather than competing with it.

## Concept generation

- File: `assets/product-marketing/glaze-looks/hauntedlibrary/concept.png`
- Mode: OpenAI built-in `image_gen` generation
- Taxonomy: `stylized-concept`
- Output: exact generated opaque RGB PNG, 1672 x 941
- Generation count for this redesign: one

## Final prompt

```text
Use case: stylized-concept
Asset type: polished 16:9 concept art for a subtle animated academic webpage background
Primary request: redesign Haunted Library from scratch as a richly composed, playful-gothic old library interior with unmistakable storybook architecture and narrative delight
Scene/backdrop: a tall moonlit pointed-arch window centered in the back wall, cool indigo night visible through leaded panes; floor-to-ceiling dark wood bookcases frame both sides with clear shelves and varied old books
Subject: a small friendly translucent mint ghost shyly peeking from behind the inner edge of the right bookcase, half revealed and curious rather than frightening; a few individual loose pages flying gently across the middle distance
Foreground: a large dark carved reading desk crossing the lower foreground in perspective, open book, stacked books, ink bottle, and a three-arm brass candelabra with distinct candles and warm flames; strong silhouette and overlap
Style/medium: premium storybook environment concept art, softly painterly but shape-readable, elegant gothic details, clear foreground/midground/background separation, the visual craft and charm of a polished animated game background
Composition/framing: wide 16:9; desk and candelabra anchor the lower third, shelves create side framing, arched window is a recognizable background focal point, ghost peeks from the right shelf, flying pages bridge the depth layers; central upper-middle retains controlled dark negative space for academic UI readability
Lighting/mood: deep ink and aubergine tonal hierarchy, cool moonlight behind, spectral mint rim light around the ghost, warm candle amber on the desk and book edges; cozy, magical, playful, never scary
Materials/textures: aged carved wood, brass, worn leather book covers, parchment, dusty glass, subtle floating dust in candle beams
Constraints: clearly an indoor library, not a graveyard, not a pumpkin patch, not abstract smoky wallpaper; no gore, no horror face, no bats, no pumpkins, no text, no letters, no logos, no interface, no border, no watermark
```

## Gallery implementation

`shader.glsl` follows the gallery's custom-shader contract: ASCII GLSL ES 1.00, one `vec4 scene(vec2 uv)` entry point, shared uniforms and helpers only, and no `main`, new uniforms, network access, data access, or built-in scene registration. The readable source is preserved here; the `glaze2:` code embeds Glaze's compacted equivalent.

The palette reserves spectral mint for the ghost and moonlight, candle amber for flame and gilt edges, and deep aubergine/ink for surfaces and silhouette. All six Glaze contrast pairs pass.

`shader-capture.png` is a current live Safari/WebKit capture of this exact shader, wrapped with the pinned gallery `GZ_GLSL.wrap` contract and rendered with the draft palette, ground, and amount behind representative LMS navigation and course cards. The clean page viewport was captured at device-pixel resolution and resized to a 1600 x 924 RGBA PNG. SHA-256: `56e3ba6cce5bf71c7e5d8fbf7fa9a567ff1e62ec62d49a0f598f75269526a0a1`.
