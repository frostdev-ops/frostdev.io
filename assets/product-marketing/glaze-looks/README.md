# Gallery Look sources

These seven designs are sources and review evidence for the Glaze Looks gallery. They are not extension built-ins and are not copied into a Glaze extension package.

Each Look's public gallery entry lives in `src/data/looks/` as a self-contained `glaze2:` code. Its animated background is embedded as a custom `vec4 scene(vec2 uv)` shader, so the Look can be previewed and imported without registering a built-in scene.

The per-Look folders keep the generated concept, image-generation prompt, SVG composition study, readable gallery shader, settings draft, and a current render capture. None of these source files are copied into the extension; the gallery consumes only the self-contained code in `src/data/looks/`.

The gallery shader validation is performed by `scripts/looks.mjs` and the gallery test suite. The render captures are visual review evidence, not substitutes for those checks.

## Looks

- General: Starlit Observatory, Koi Garden, Rainy Neon
- Halloween: Haunted Library, Witch's Brew
- Thanksgiving: Harvest Table, Home for Thanksgiving
