# Asset provenance

Published artwork was copied unchanged from Rimeward's public website source at
`6bef4629fac273a638637bb9a0dba8639161cedb`. Rimeward marks are Frostdev SVG assets;
public interface captures use demonstration data. Private project files and
application profiles are not included.

Website-only Blender masters, earlier design directions, capture provenance and
marketing screenshots were migrated from the native repository unchanged. The
32 source files were checked by SHA-256 before the native cleanup release removes
them. Unpublished artwork and capture work remain in a local ignored archive;
they are not part of Git or the static build.

- Frostdev's crystal icon and static/animated wordmark come from the user's
  Blender containment-cradle artwork. The reduced-motion variant is a still image.
- Frostsim's image comes from its public brand assets, Loothing's from its public
  repository, Crosspane's from its banner logo and Rimewire's from its board logo.
- Crosspane Settings and Windows images were exported from its native demo model
  at source `ce3dee9`. The animation adds illustrative pointer/window motion; no
  machine was paired or controlled to capture them.
- Rimewire's plan, progress and ready captures use its actual board renderer at
  source `93c6f7a`, a disposable tracker and sample updates. The replay makes no
  journal writes or agent calls.
- Rimeward editor, chat, notes and phone captures use an isolated disposable
  profile with synthetic Orbital content. Replies and timelines are seeded examples,
  not evidence of model performance or provider calls.
- Guide browser screenshots in `docs/screenshots/` show this static site at desktop
  and phone widths. They are review evidence, separate from native golden images.
- Glaze branding comes unchanged from its repository. Its editor, popup and course
  preview captures use the actual unpacked 2.0.1 extension in a disposable Chromium
  profile, with the built-in sample course and real extension storage. Captured UI
  source is `63cb89d`; the later `418f347` publishing/docs commit leaves those files
  unchanged. No institution account or real coursework is captured.
- Glaze captures use the Frost palette, reduced motion, device scale 1 and a fixed
  October 11 clock. Dimensions: editor 1440 × 1000, popup 320 × 297, course preview
  1000 × 1020, narrow editor 390 × 844. PNG goldens retain the browser pixels;
  published images are WebP encodings. The popup is its real extension page rendered
  at its native width. Shared Safari UI sources match byte-for-byte; these images
  do not establish a Safari app installation or a live institution workflow.
- `glaze-horizon.webp` and `glaze-backgrounds.webp` are WebP encodings of Glaze's
  2.0.3 store screenshots (`assets/store/screenshots/4-horizon-midnight.jpg` and
  `2-backgrounds-editor.jpg`, commit `810058e`), rendered by its own
  `scripts/store-screenshots.js` from the real extension and sample course, 1280 × 800.
- The older narrow Glaze editor capture records its version’s behavior: its full page extends
  to 452 pixels at a 390-pixel viewport. Glaze source was not changed for this website
  work. Website guides themselves are checked for horizontal overflow separately.
- Glaze 3.0.0's editor and background images (`glaze-editor-3.0.0.webp` and
  `glaze-backgrounds-3.0.0.webp`) come from a ZIP built with `package.sh` at Glaze
  source `66b98d4`, the release candidate before its version bump. They show the
  real extension editor and its fictional local Ultra preview at 1440 × 1000,
  Frost, reduced motion, in an isolated headless Chromium profile. External
  network access was blocked. PNG evidence and the capture script are in the
  T30 notes folder; the published files are WebP encodings. These demonstrate
  the shared editor UI, not a Safari installation or an authenticated LMS session.
- Requested website goldens cover the hub, guide index, Glaze page and both browser
  guides at desktop and phone widths, plus the sixth project card on a phone.
- Glaze's October 14 media refresh uses the corrected `glaze-cover-v2` artwork and
  all eight generated YouTube thumbnails from `glaze/assets/ads/`. Website images
  are WebP encodings. The eight motion ads have 720p, 1080p and 4K H.264/AAC encodings
  of their final landscape exports, with fast-start metadata and English caption tracks.
  They use sample courses, real product labels and illustrative interface animation;
  artwork is illustrative. Seedance concepts and alternate takes are excluded.
  Media is served locally without a third-party player and loads on selection.

- Glaze Looks gallery previews (`public/projects/glaze/looks/`) of the built-in Looks and
  palettes are screenshots of the actual Glaze extension on a local Canvas LMS with seeded
  sample courses (`scripts/canvas-shots.js` in Glaze), cropped to 1440×620 and encoded
  as 960-pixel WebP. Submitted previews come from their submitters.

The inline UI icons retain their Lucide/Feather attribution in
[`public/_site/lucide-license.txt`](../public/_site/lucide-license.txt). Project
code and Frostdev assets are covered by the root MIT license.
