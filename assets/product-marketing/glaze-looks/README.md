# Gallery Look sources

These seven designs are sources and review evidence for the Glaze Looks gallery. They are not extension built-ins and are not copied into a Glaze extension package.

Each Look was submitted through the public gallery API as a self-contained `glaze2:` code and passed the same automated review as any community submission. Its animated background is embedded as a custom `vec4 scene(vec2 uv)` shader, so it can be previewed and imported without registering a built-in scene.

The per-Look folders keep the generated concept, image-generation prompt, SVG composition study, readable gallery shader, settings draft, and a current render capture. None of these source files are copied into the extension. The published community records hold the reviewed self-contained codes.

The gallery shader validation is performed by `scripts/looks.mjs` and the gallery test suite. The render captures are visual review evidence, not substitutes for those checks.

## Looks

- General: Starlit Observatory, Koi Garden, Rainy Neon
- Halloween: Haunted Library, Witch's Brew
- Thanksgiving: Harvest Gathering, Home for Thanksgiving

## Community records

- Harvest Gathering: `c-4a44bdb5d7`
- Haunted Library: `c-8e9567ece3`
- Home for Thanksgiving: `c-f3eb5b1810`
- Koi Garden: `c-a9c6081ae6`
- Rainy Neon: `c-ed131987a7`
- Starlit Observatory: `c-e2b0a535c4`
- Witch's Brew: `c-08f04dac43`
