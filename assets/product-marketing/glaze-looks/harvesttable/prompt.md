# Harvest Gathering redesign

- Taxonomy: `stylized-concept`
- Mode: built-in `image_gen` generation
- Generated once: 2026-10-20
- Output: `concept.png`

## Final prompt

```text
Use case: stylized-concept
Asset type: polished 16:9 concept art for an animated LMS background named Harvest Gathering
Primary request: an unmistakable Thanksgiving dinner table seen in a cozy dining room at autumn dusk, composed as a refined graphic scene with strong silhouettes and depth
Scene/backdrop: a large mullioned window fills the upper two-thirds; outside is a layered autumn orchard with rounded tree canopies, distant hills, and two or three windblown leaves against an amber-to-plum sunset
Subject: in the foreground, a deep walnut table with a rust-and-cream runner in perspective, two simple cream plates with dark rims, a small loaf of bread, a clearly readable pumpkin pie with one slice subtly lifted, three elegant taper candles, two small pumpkins, and a pair of wheat sprigs; delicate steam rises from the pie and bread
Style/medium: premium flat editorial illustration, precise geometric silhouettes, restrained soft gradients, subtle paper texture, sophisticated seasonal poster art rather than photography
Composition/framing: wide 16:9, low table horizon around the lower third, tableware large enough to read at thumbnail size, window frame creates depth, open low-detail space through the middle for LMS cards, asymmetric but balanced
Lighting/mood: golden candlelight against cool plum orchard shadows; intimate, gracious, unmistakably Thanksgiving
Color palette: cranberry rust, burnt orange, harvest gold, warm cream, deep walnut, muted plum, tiny sage accents
Motion planning: candle flames can flicker, steam can curl, a few leaves can drift outside; the pie-slice reveal should feel cozy and occasional
Constraints: no people, no turkey, no cornucopia, no kitsch, no clutter, no words, letters, typography, logos, branded motifs, UI, frames, watermark
Avoid: brown fog, amorphous noise clouds, photorealism, excessive tiny details, empty abstract background
```

## Shader translation

The gallery shader rebuilds the composition as crisp signed-distance silhouettes rather than a hazy approximation. A mullioned window contains layered hills, seven orchard trees, and five drifting leaves. The foreground table carries a perspective runner, paired plates, bread, a pumpkin pie, three candles, and two pumpkins. Candle flicker, steam curls, window leaves, and an occasional lifted pie slice supply four restrained motion systems. The center remains structured but low-detail enough for LMS surfaces.

## Provenance

`shader.glsl` is the gallery-only source of truth. `built-in-body.js` remains solely as evidence of the discarded first concept and is not registered or embedded in the published Look.

`shader-capture.png` is the 1280x720 reduced-motion composition reference rasterized from `preview.svg`; it replaces the rejected first shader capture without using Chrome. Shader acceptance is established separately by the vendor checker, standalone GLSL compile, and `glaze2` round-trip validation.
