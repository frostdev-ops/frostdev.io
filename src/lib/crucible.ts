// Crucible on frostdev.io (the Kiln modpack platform; design: the kiln-wave dev29 modpack-share DESIGN.md).
//
// The pages under /kiln/crucible are served by the Crucible service (crucible repository, 127.0.0.1:8792 behind nginx):
// it reads the shells this site builds (src/pages/kiln/crucible/shell/*.astro -> dist/kiln/crucible/shell/<page>/)
// from CRUCIBLE_SITE_DIR, fills in each page's title, Open Graph tags and data, and the scripts in
// src/scripts/crucible render the page from that data and the public API (/kiln/crucible/api/v1).
//
// Legal text (the copyright page and the Crucible sections of /kiln/privacy and /kiln/terms) are drafts until the
// owner approves them: they are built only with CRUCIBLE_LEGAL_DRAFTS=1 (a preview build, never the live one;
// ops/deploy.sh refuses a build that has them).
declare const process: { env: Record<string, string | undefined> };
export const legalDrafts = process.env.CRUCIBLE_LEGAL_DRAFTS === '1';

export const CRUCIBLE = '/kiln/crucible';
export const CRUCIBLE_API = '/kiln/crucible/api/v1';
export const COVERS = ['forge', 'frost', 'shroud', 'wilds', 'arcane', 'builder'] as const;
