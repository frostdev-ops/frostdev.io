# Koi Garden

Koi Garden is a quiet blue-hour pond seen from the waterline. Three readable koi move through the near water while lotus pads and one blossom frame the foreground; a small arched bridge, a stone lantern, and its broken reflection establish a distant garden bank. The composition leaves broad, calm dark-water regions behind LMS panels.

## Why the first version was rejected

The first concept stayed almost entirely top-down. Its small generic fish, scattered pads, and all-over caustic texture created a flat field instead of a place. Without a horizon, a clear foreground/background hierarchy, or a timed focal event, the shader risked reading as abstract blobs over procedural noise.

This redesign adds:

- A low garden-water viewpoint with a legible horizon and three depth planes.
- Exactly three recognizable koi with heads, tapered bodies, side fins, forked tails, eyes, barbels, and distinct markings.
- Foreground lotus pads and a pale blossom that frame rather than fill the interface.
- A distant arched bridge, stone lantern, and wavering reflection to make the setting specific without leaning on decorative stereotypes.
- Restrained motion in the koi paths and tails, water current and glints, ring ripples, fireflies, and lotus bob.
- A narrative delight moment: the central coral-and-cream koi periodically rises, briefly changes heading, releases two droplets, and sends expanding rings across the pond.

## Image generation record

- Taxonomy slug: `stylized-concept`
- Mode: built-in `image_gen`
- Output: `assets/product-marketing/glaze-looks/koi/concept.png`

### Final prompt

```text
Use case: stylized-concept
Asset type: polished 16:9 concept art for a Glaze animated LMS background Look
Primary request: redesign Koi Garden from scratch as a serene dusk pond scene viewed low across the water, with clear narrative depth and recognizable subjects rather than abstract texture
Scene/backdrop: a quiet garden pond at blue hour; a small arched dark timber footbridge spans the far bank, with a restrained stone lantern silhouette and its broken reflection among deep foliage
Subject: exactly three clearly recognizable koi near the surface, each with a distinct head, tapered body, side fins, and flowing forked tail; one coral-and-cream koi curves through the center, one pale cream koi approaches from the left, and one muted gold-coral koi turns deeper at right
Foreground: several large overlapping lotus pads with visible notches, one elegant pale lotus blossom, and concentric ripples catching soft light
Atmosphere: a few warm fireflies drifting above the back water, layered reflections, fine water glints, and a subtle suggestion that the central koi has just surfaced and made expanding rings
Style/medium: refined cinematic digital illustration, painterly but shape-readable, sophisticated editorial concept art, simplified enough to translate into procedural vector-like shader silhouettes
Composition/framing: low garden-water viewpoint with water filling most of the frame; foreground pads frame the bottom corners, three koi occupy the lower-middle without crowding, bridge and lantern form a quiet background silhouette; broad dark calm areas remain for translucent LMS panels and readable text
Lighting/mood: tranquil blue-hour glow, contemplative, intimate, premium, low contrast behind UI
Color palette: midnight teal, deep jade, smoky blue, muted coral, warm cream, tiny restrained amber lights
Constraints: no text, no logos, no watermark; no people, calligraphy, gates, shrine imagery, decorative pattern wallpaper, abstract blobs, top-down view, photorealistic clutter, or excessive saturation; preserve clear silhouettes and layered depth
```

## Production translation

The standalone gallery shader uses the vendor `vec4 scene(vec2 uv)` contract and only Glaze-provided uniforms and helpers. It stays below 8 KiB of ASCII source and uses bounded constant loops. The three koi travel on slow curved paths and articulate their tails; current bands and fine glints move at a different pace; ring ripples expand independently; six fireflies drift and pulse; the foreground lotus subtly bobs. The central surfacing beat repeats slowly enough to feel discovered rather than announced.

Deep teal and jade keep most pixels dark and quiet. Muted coral and cream are reserved for the koi, blossom, lantern aperture, and small highlights. The paired palette passes all six Glaze contrast checks, so translucent course panels and text remain primary even when the background is moving.
