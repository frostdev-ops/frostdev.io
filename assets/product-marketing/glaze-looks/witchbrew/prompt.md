# Witch's Brew

- Taxonomy: `stylized-concept`
- Generation mode: built-in `image_gen`
- Output: `assets/product-marketing/glaze-looks/witchbrew/concept.png`

## Final prompt

```text
Use case: stylized-concept
Asset type: polished 16:9 concept art for a gallery-only animated browser Look called Witch's Brew
Primary request: redesign from scratch as a whimsical witch workshop with a huge, instantly readable black cauldron dominating the lower foreground; its thick rim, curled side handles and sturdy feet are unmistakable, with a small restrained amber fire glowing beneath. The brew is a narrow luminous acid-lime surface, not a bowl of soup. Slow round bubbles rise above it and three broad, elegant steam ribbons curl upward in distinct shapes. A rare magical moment is visible: a handful of tiny geometric sparks briefly connect into an abstract constellation above the steam.
Scene/backdrop: cozy shadowed apothecary interior. Ingredient shelves with simple bottle, jar and herb silhouettes occupy one side; an arched moonlit window and a small curious black cat silhouette perched on the sill occupy the other. Keep background architecture quiet and readable.
Style/medium: premium stylized storybook concept illustration with crisp shape language, soft painterly gradients, controlled texture, and layered silhouettes suitable for translation into a low-power GLSL scene
Composition/framing: wide 16:9. Cauldron fills roughly the lower 45 percent and remains the dominant silhouette at thumbnail size. Rim and handles must not merge into the background. Cat and shelves are clearly midground, never competing with the cauldron. Preserve calm negative space behind the steam.
Lighting/mood: friendly, mysterious, cozy, polished; amber firelight from below, soft violet moonlight through the window, restrained lime reflections around the brew
Color palette: near-black and deep plum foundation, dusky violet midtones, acid-lime used only for brew, bubbles and a few sparks, warm amber-orange used only for fire and select bottle highlights
Materials/textures: matte cast iron cauldron, old wood shelves, translucent glass silhouettes, soft vapor ribbons
Narrative delight: the cat watches one bubble while the rare spark constellation quietly reveals itself above the steam
Constraints: no pumpkins, no graveyard, no gore, no horror face, no people, no witch character, no floating soup ingredients, no chaotic particle cloud; strong foreground/midground/background separation; production-ready and readable behind interface panels
Avoid: text, letters, numbers, logos, watermark, readable runes, soup-like noise, excessive neon, photorealism, clutter
```

## Translation to the live Look

The shader uses the same three-stage composition: a large foreground cauldron and localized fire, a quiet workshop with fixed ingredient shelves and an arched window, and a cat silhouette on the sill. Five bubbles, three shaped steam ribbons, four flickering flames, the cat's tail and blink, and a rare five-point constellation provide restrained motion without procedural fog or soup-like surface noise.

## Gallery live-preview correction

The production shader adapts the concept to the gallery's real 16:10 course-page preview. The cauldron is deliberately smaller and shifted into the unobscured lower-right band; shelves occupy the lower-left band; and the moon window and cat sit on the far-right edge. Higher scene intensity and brighter plum/amber silhouettes preserve the workshop read after Glaze applies its live color dimming, while the central course cards remain quiet and readable.

The checked capture in `shader-capture.png` comes from the built gallery's large live preview in headless WebKit, not from the SVG. The preview reported `data-live="on"`, a 1022 by 638.75 CSS-pixel stage, and a 613 by 383 scene-engine canvas at Glaze's 0.6 custom-shader scale.
