# Rainy Neon

- Taxonomy slug: `stylized-concept`
- Generation mode: built-in `image_gen`
- Generated asset: `assets/product-marketing/glaze-looks/neonrain/concept.png`
- Generation count for this redesign: one

## Final prompt

```text
Use case: stylized concept art and motion-reference keyframe for a dark ambient browser background. Create one polished wide 16:9 view from indoors through a rain-covered window at night. Make the depth layers unmistakable: in the extreme foreground, several crisp glass droplets with rounded bead heads, thin curved serpentine trails, tiny edge highlights, and a few short diagonal rain streaks; in the midground, recognizable low-rise dark building and window silhouettes, one abstract rectangular neon awning or sign shape with absolutely no letters, symbols, or text, and localized wet street or rooftop reflections directly beneath the windows and sign; in the distance, layered city towers fading into blue atmospheric haze with a cloud bank that could be briefly revealed by very faint lightning, but no dominant lightning bolt. Palette: deep navy and near-black, restrained cyan highlights, restrained muted magenta accents, a little warm white in windows. Keep the center-left dark and calm for readable UI; place the brightest architecture and reflections toward the lower right and edges. Elegant, cinematic, realistic-stylized, refined, low visual noise, sharp foreground drops against soft background depth. No people, no cars, no cyberpunk typography, no signage text, no logos, no watermarks, no generic vertical-stripe wallpaper, no excessive bloom, no harsh flash.
```

## Translation notes

The gallery shader translates the keyframe into three deliberate depth planes rather than a repeating rain texture. The foreground is deliberately sparse: three thick long-cycle drops, visibly curved tracks, bright rims, and three fixed beads. The midground uses three large side-weighted building masses, broad warm/cyan windows, a heavy window frame and sill, one unmistakable blank magenta sign, and a hard wet-street horizon with reflections localized directly below those lights. A quieter skyline and cloud shelf form the distance. A faint cloud-and-skyline reveal is contained to that far layer for less than one second in a 29-second cycle; it never creates a full-screen flash.

The second shader translation increases local cyan/magenta contrast and moves the strongest landmarks to the unobscured side and lower-right areas so the city remains recognizable after gallery dimming and around LMS cards. Course surfaces are correspondingly raised to 88% opacity to keep text quiet and readable.

The shader is a gallery-only Glaze 2 custom background using the vendor `vec4 scene(vec2 uv)` contract. It is not a built-in scene and requires no scene registry entry.

`shader-capture.png` is a 720x450 Safari capture from the repository's actual `vendor/glaze-scene` runtime at the decoded gallery values (`dim: 0.3`, `amount: 0.6`, `speed: 1.1`). Representative 88%-opaque LMS cards are composited over the live canvas so the side buildings, sign, wet horizon, reflections, window frame, and foreground drops are evaluated in the space left around real content.
