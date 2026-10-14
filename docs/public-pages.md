# Public pages

The hub `/` links six projects and the guide index. `/rimeward`, `/crosspane`,
`/rimewire` and `/glaze` contain public product descriptions and demonstrations. `/privacy`
describes current storage, provider connections and local versus shared data.

Glaze's primary install action matches desktop Safari or Chrome and keeps its
visual guide beside it. Safari on Mac links to the signed 2.1.4 installer disk image;
Chrome links to the extension store. Other browsers and visitors without JavaScript
retain both platform-labelled choices. Downloads begin only when a link is chosen.

The Glaze page features its latest cover and eight motion ads in a media carousel.
One native player shows the chosen film, with sound controlled by the visitor,
English captions and no automatic playback or advancement. Clicking or tapping the
poster or a thumbnail starts playback. Each film starts at the smallest resolution
that covers the player's width in physical pixels: 720p, 1080p or 4K. Resuming a
paused film preserves its position and quality. The thumbnail rail uses
native horizontal scrolling and snap points. Previous/next controls and the rail's
arrow, Home and End keys select a film.
Reduced motion disables animated rail movement. Without JavaScript, all eight
thumbnail links open their films directly. No Seedance concepts are included.
The public nginx include serves caption files as `text/vtt` and MP4 video with
byte-range support for seeking.

The desktop project carousel animates and supports dragging, arrow keys and
pause/resume. Phones use native horizontal scrolling with snap points, so vertical
swipes scroll the page normally. All six project links remain available without
JavaScript and with reduced motion. Phone rotation preserves the horizontal layout.

The background redraws immediately after drawing-buffer changes and blends quality
reductions. A controlled 260-frame WebGL replay reproduced a blank frame and an
abrupt detail change before the fix; the fixed replay contains no blank frames.

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

All fourteen routes have HTTPS canonical URLs, anonymous access and indexable
metadata. Robots and sitemap list the public content. Existing publisher metadata
and ads.txt are inert; the site loads no advertising script.

Production nginx serves only these pages, crawler files, `/_site/` and `/projects/`
from this static release. Unknown guides return 404. Account, dashboard, API,
Rimeward `/_astro/` assets and remote runtime routes keep their existing server
handling and authentication. Crawler directives do not provide access control.

The Website workflow runs Node 22, a clean install, TypeScript checking, an Astro
build and static artifact assertions. Public browser acceptance covers all fourteen
pages at 1440, 390 and 320 pixels, canonical metadata, all 59 chapter anchors,
mobile navigation, demo controls and loaded assets. Publication additionally
checks every HTML page and crawler file against the immutable release at the
origin and public HTTPS. Rimeward tests and installer workflows are separate.
Carousel acceptance additionally covers Chromium touch gestures, all six
destinations, keyboard navigation, rotation and reduced motion at 320, 390 and
760 pixels. WebKit checks cover layout and keyboard focus at those widths.
These are browser checks, not physical-device acceptance.
