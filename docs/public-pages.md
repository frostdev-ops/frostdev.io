# Public pages

The hub `/` links five projects and the guide index. `/rimeward`, `/crosspane` and
`/rimewire` contain public product descriptions and demonstrations. `/privacy`
describes current storage, provider connections and local versus shared data.

The desktop project carousel animates and supports dragging, arrow keys and
pause/resume. Phones use native horizontal scrolling with snap points, so vertical
swipes scroll the page normally. All five project links remain available without
JavaScript and with reduced motion. Phone rotation preserves the horizontal layout.

The background redraws immediately after drawing-buffer changes and blends quality
reductions. A controlled 260-frame WebGL replay reproduced a blank frame and an
abrupt detail change before the fix; the fixed replay contains no blank frames.

`/guides` links five comprehensive project guides:

- `/guides/rimeward-first-workspace`
- `/guides/crosspane-two-computers`
- `/guides/rimewire-agent-handoffs`
- `/guides/frostsim-first-simulation`
- `/guides/loothing-raid-loot`

Every article has chapter navigation, practical steps, troubleshooting and project
references. Animated examples are finite or offer pause/play, respect reduced
motion and make no real application or model calls. Chapter navigation follows
scrolling and remains usable on small screens. Content is present without JavaScript.

All eleven routes have HTTPS canonical URLs, anonymous access and indexable
metadata. Robots and sitemap list the public content. Existing publisher metadata
and ads.txt are inert; the site loads no advertising script.

Production nginx serves only these pages, crawler files, `/_site/` and `/projects/`
from this static release. Unknown guides return 404. Account, dashboard, API,
Rimeward `/_astro/` assets and remote runtime routes keep their existing server
handling and authentication. Crawler directives do not provide access control.

The Website workflow runs Node 22, a clean install, TypeScript checking, an Astro
build and static artifact assertions. Public browser acceptance covers all eleven
pages at 1440, 390 and 320 pixels, canonical metadata, all 39 chapter anchors,
mobile navigation, demo controls and loaded assets. Publication additionally
checks every HTML page and crawler file against the immutable release at the
origin and public HTTPS. Rimeward tests and installer workflows are separate.
Carousel acceptance additionally covers Chromium touch gestures, all five
destinations, keyboard navigation, rotation and reduced motion at 320, 390 and
760 pixels. WebKit checks cover layout and keyboard focus at those widths.
These are browser checks, not physical-device acceptance.
