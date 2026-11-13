# Public pages

The hub `/` links seven projects and the guide index. `/rimeward`, `/crosspane`,
`/rimewire` and `/glaze` contain public product descriptions and demonstrations. `/privacy`
describes current website storage, provider connections and local versus shared data.
Glaze has dedicated `/glaze/privacy` and `/glaze/terms` pages with its permanent
free/no-paid-gates commitment, local-processing and optional-sharing disclosures. Motion is finite
and disabled under reduced motion. The Glaze footer, overview and guides link both.
Only these two nested Glaze paths are added to the public nginx routes; the existing
`/glaze/looks` gallery keeps its separate handler.

Glaze's primary install action matches desktop Safari or Chrome and keeps its
visual guide beside it. Safari on Mac links to the signed 3.0.5 installer disk image;
Chrome links to the extension store, with a separate 3.0.6 GitHub package. The page
labels each platform’s published version, and the Firefox preview stays on 3.0.5.
Other browsers and visitors without JavaScript
retain both platform-labelled choices. A separate Firefox preview link explains the
Firefox 140+ temporary desktop installation and its session-only lifetime. Downloads begin only when a link is chosen.

The Glaze page features its latest cover and the films of `src/data/glazeFilms.ts` in a media carousel.
One native player shows the chosen film, with sound controlled by the visitor,
English captions and no automatic playback or advancement. Clicking or tapping the
poster or a thumbnail starts playback. Each film starts at the smallest resolution
that covers the player's width in physical pixels: 720p, 1080p or 4K. Resuming a
paused film preserves its position and quality. The thumbnail rail uses
native horizontal scrolling and snap points. Previous/next controls and the rail's
arrow, Home and End keys select a film.
Reduced motion disables animated rail movement. Without JavaScript, all the
thumbnail links open their films directly. No Seedance concepts are included.
The public nginx include serves caption files as `text/vtt` and MP4 video with
byte-range support for seeking.

The Glaze page wears a seasonal skin, one flag in `src/pages/glaze.astro` (`thanksgiving`; false takes the colours,
decorations and seasonal note off together). Its art is in `public/projects/glaze/thanksgiving/`, decoration only
(`alt=""`, `aria-hidden`), and its falling leaves, garland and turkey hold still under reduced motion. Halloween's skin,
art and three films are gone.

**New in <version>** on the Glaze page and both Glaze guides is the release's changelog entry as it is grouped (Added,
Changed, Fixed), drawn by `src/components/marketing/GlazeChangelog.astro` from `changes` in `src/data/glazeRelease.json`.
`scripts/prepare-glaze-release.mjs` writes it from Glaze's CHANGELOG.md with `scripts/glaze-changelog.mjs`
(`node --test scripts/glaze-changelog.test.mjs`); `summary` is the same items as one paragraph.

The desktop project carousel animates and supports dragging, arrow keys and
pause/resume. Phones use native horizontal scrolling with snap points, so vertical
swipes scroll the page normally. All seven project links remain available without
JavaScript and with reduced motion; in that static grid a lone last card sits in the middle column. Phone rotation preserves the horizontal layout.

The background redraws immediately after drawing-buffer changes and blends quality
reductions. A controlled 260-frame WebGL replay reproduced a blank frame and an
abrupt detail change before the fix; the fixed replay contains no blank frames.

`/glaze/looks` is the Glaze Looks gallery: curated Looks built into the page, each with a live
preview painted from its code (and optional screenshots), palette chips, Copy code and "Use this Look
in Glaze", plus community Looks added in the browser from the gallery server. `/glaze/looks/submit` is
where students submit one for automated review. Search, filters, community Looks and submitting need
JavaScript; without it every curated Look and its code are still listed. The pages load nothing from
other sites. See [docs/looks-gallery.md](looks-gallery.md). Production nginx needs the `/glaze/looks`,
`/glaze/looks/submit` and `/glaze/looks/api/` locations from `ops/public-site.nginx.conf`, and the
gallery server (`ops/deploy-gallery.sh`).

`/kiln` is Kiln's product page: a mod framework and launcher for Enshrouded in early access. Its download section
shows the main files (Windows installer, Linux AppImage, .deb, .rpm when the release has one, the server pack) and
leads to `/kiln/download`, which lists every file of the release. It and the wiki hub link Kiln's public repository, never a file in it. Kiln's pages wear
Kiln's own brand (charcoal, ember and gold from Kiln's
`branding/palette.json`, the Fraunces display face) inside the site's header and footer, without the frost background
animation; `src/layouts/KilnLayout.astro` and `src/styles/kiln.css`. `/kiln/wiki` and `/kiln/wiki/<page>` are its
wiki: 43 Markdown pages in `src/content/kiln-wiki/`, ordered by `src/data/kiln.ts` (the build fails when the two
disagree), written for people from Kiln's own docs, with no reverse-engineering details and no paths into Kiln's
repository. Pages built but not fully tried in a real game carry a "Game test pending" badge. `/kiln/agents` shows
Kiln's agent skill (a SKILL.md and nine reference files) and offers `/kiln/agents/kiln-modding.zip` (a stored zip built
at build time, byte-for-byte reproducible) and each file as `text/markdown` under `/kiln/agents/kiln-modding/`. The
skill's canonical copy is in Kiln's repository (`agent/skills/kiln-modding/`); `scripts/mirror-kiln-skill.sh <kiln
checkout>` copies it into `src/content/kiln-skill/`. Production nginx needs the `/kiln/` location and the `kiln` entry
of the product-page location from `ops/public-site.nginx.conf`. Every Kiln page ends with "Enshrouded is a trademark of
Keen Games GmbH. Kiln is unofficial."

Kiln releases. The release folder from Kiln's release tooling (`kiln-<version>/`) is served at
`/kiln/downloads/<version>/` without its `nexus/` and `updates/` folders (see "Kiln Launcher self-update" in
`ops/public-site.nginx.conf`). `src/data/kilnRelease.json` describes the current release, and `/kiln`, `/kiln/download`
and the stable links all read it through `src/lib/kilnDownloads.ts`. To publish a release:

1. Put the finished folder on the download host (the Kiln repository's `tools/release/publish.sh` does).
2. Regenerate the data from that folder:
   `node scripts/kiln-release-data.mjs <release folder> --verify` (add `--released YYYY-MM-DD` when README.txt has no
   "Built" date or the date is wrong). It lists every downloadable file with its size and SHA-256 (from the folder's
   `SHA256SUMS`, computed when a file is not listed), and fails, writing nothing, when the Windows setup program,
   AppImage, .deb, runtime zip or server pack is missing. Read its warnings: an unknown file is listed under its own
   name, and a file the web server cannot read (not world-readable) is reported.
3. Review `git diff src/data/kilnRelease.json`, then `npm run check && npm run build`. The build warns when a file in
   the data has no size or SHA-256 (the data was not generated from a real folder yet).
4. Update the wiki and the Nexus-off note on `/kiln` for the release, commit and deploy.

`/kiln/stats` is not a public page: the owner's download statistics, read from Cloudflare's request data once an hour
by `stats/kiln-downloads.mjs` on the server and shown only to someone signed in to the gallery dashboard (it redirects
to `/glaze/admin/kiln-stats/`). It is not part of the static build and `robots.txt` disallows it. See
[Kiln download statistics](kiln-download-stats.md).

`/kiln/download` ("Download Kiln") groups the files by who needs them: the launcher as large buttons, then dedicated
servers (server pack, kilnctl, systemd units), manual install (the runtime zip and its instructions), mod authors
(SDK packages, the `kiln` command, the VS Code extension, the sample mods in a collapsed list) and source and notes.
Each file shows its size and SHA-256 (a disclosure; a Copy button appears when JavaScript runs), and the page explains
how to check a download and why Nexus Mods may hold some files. Without JavaScript every download is still a plain
link. The stable links `/kiln/download/windows`, `/linux`, `/deb`, `/server`, `/runtime` (and `/rpm` when the release has
an .rpm) are static pages generated from the same data: each sends the browser to the current version's file with a
zero-second meta refresh and shows the same file as a button, so they work on static hosting behind nginx and never
need editing per release. They are `noindex` and not in the sitemap. `scripts/kiln-release-data.test.mjs` tests the script.

Kiln's pages have screenshot slots, invisible to readers: `<!-- shot: name | what it shows -->` in the wiki and
`{/* shot: ... */}` on the product page. `grep -rn "shot:" src/content/kiln-wiki src/pages/kiln.astro` lists them. To
fill one, add `public/projects/kiln/shots/<name>.webp` and replace the comment with
`![what it shows](/projects/kiln/shots/<name>.webp)`.

`/guides` links seven comprehensive project guides:

- `/guides/rimeward-first-workspace`
- `/guides/crosspane-two-computers`
- `/guides/rimewire-agent-handoffs`
- `/guides/frostsim-first-simulation`
- `/guides/loothing-raid-loot`
- `/guides/glaze-safari`
- `/guides/glaze-chrome`

Every article has chapter navigation, practical steps, troubleshooting and project
references. Animated examples are finite or offer pause/play, respect reduced
motion and make no real application or model calls. Chapter navigation follows
scrolling and remains usable on small screens. Content is present without JavaScript.

All seventeen routes have HTTPS canonical URLs, anonymous access and indexable
metadata. Robots and sitemap list the public content. Existing publisher metadata
and ads.txt are inert; the site loads no advertising script.

Production nginx serves only these pages, crawler files, `/_site/` and `/projects/`
from this static release. Unknown guides return 404. Account, dashboard, API,
Rimeward `/_astro/` assets and remote runtime routes keep their existing server
handling and authentication. Crawler directives do not provide access control.

The Website workflow runs Node 22, a clean install, TypeScript checking, an Astro
build and static artifact assertions. Public browser acceptance covers all seventeen
pages at 1440, 390 and 320 pixels, canonical metadata, all 59 chapter anchors,
mobile navigation, demo controls and loaded assets. Publication additionally
checks every HTML page and crawler file against the immutable release at the
origin and public HTTPS. Rimeward tests and installer workflows are separate.
Carousel acceptance additionally covers Chromium touch gestures, all six
destinations, keyboard navigation, rotation and reduced motion at 320, 390 and
760 pixels. WebKit checks cover layout and keyboard focus at those widths.
These are browser checks, not physical-device acceptance.
