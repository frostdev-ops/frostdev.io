# Public pages

The hub `/` links five projects and the guide index. `/rimeward`, `/crosspane` and
`/rimewire` contain public product descriptions and demonstrations. `/privacy`
describes current storage, provider connections and local versus shared data.

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
