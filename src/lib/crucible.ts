// Crucible on frostdev.io (the Kiln modpack platform; design: the kiln-wave dev29 modpack-share DESIGN.md).
//
// The pages under /kiln/crucible are served by the Crucible service (crucible repository, 127.0.0.1:8792 behind nginx):
// it reads the shells this site builds (src/pages/kiln/crucible/shell/*.astro -> dist/kiln/crucible/shell/<page>/)
// from CRUCIBLE_SITE_DIR, fills in each page's title, Open Graph tags and data, and the scripts in
// src/scripts/crucible render the page from that data and the public API (/kiln/crucible/api/v1).
//
// Legal text (the copyright page src/pages/kiln/crucible/[legal].astro and the Crucible sections of /kiln/privacy and
// /kiln/terms) was approved by the owner on 2026-11-20 and is built always.

export const CRUCIBLE = '/kiln/crucible';
export const CRUCIBLE_API = '/kiln/crucible/api/v1';
export const COVERS = ['forge', 'frost', 'shroud', 'wilds', 'arcane', 'builder'] as const;
