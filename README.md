# frostdev.io

The public Frostdev website, product pages and practical guides. This repository
owns the content served at [frostdev.io](https://frostdev.io).

Rimeward's native app and authenticated server live in
[frostdev-ops/rimeward](https://github.com/frostdev-ops/rimeward). Rimewire's board
tool lives in [frostdev-ops/rimewire](https://github.com/frostdev-ops/rimewire).
Website changes run only this repository's **Website** workflow. They do not
build, publish or restart Rimeward.

## Development

Use Node 22.18 or newer:

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

Astro generates fourteen static pages with independent `/_site/` assets. No database,
authentication service, native runtime or account data is included. `/login` and
other application routes are provided by the existing Rimeward server in production.

## Publication

Commit reviewed source on `main`, wait for the Website workflow, then run
`ops/deploy.sh` from a clean checkout. It builds only this site, verifies a SHA256
manifest and activates an immutable release under `/opt/frostdev-public/`.
Failed HTTP verification restores the previous public release. It leaves the
Rimeward service and its release process unchanged.

Public HTML sets `Cache-Control: no-cache, no-transform` so Cloudflare preserves
the built pages for exact release verification. See
[Cloudflare response inspection](https://developers.cloudflare.com/rules/configuration-rules/response-body-inspection/).

First installation requires `ops/deploy.sh stage`, a `current` symlink to that
verified release, and the nginx include in `ops/public-site.nginx.conf`. Install
the include as `/etc/nginx/snippets/frostdev-public.conf` inside the existing apex
HTTPS server before its catch-all proxy; preserve every authentication, API,
stream and runtime relay location. Back up nginx, run `nginx -t`, reload, then run
`ops/deploy.sh activate` to verify the public pages at both origin and public HTTPS.

To roll back later, use a clean checkout of a previously deployed commit and run
`ops/deploy.sh activate`. Keep prior releases. Initial integration rollback also
requires restoring the previous nginx configuration.

## Content and provenance

The site was extracted from public-only source in Rimeward commit
`6bef4629fac273a638637bb9a0dba8639161cedb`, based on its stable `main`. It has its own
package, lockfile, static build, CI and deployment. Shared runtime imports were
replaced with public icons, brand assets and static product metadata.

Guides cover Rimeward, Crosspane, Rimewire, Frostsim, Loothing and Glaze. Glaze has
separate Safari and Chrome walkthroughs. Their source is
in `src/pages/guides/`, shared presentation in `GuideLayout.astro` and `guides.css`.
Examples use demonstration data and make no provider or model calls. Interface
images are public product captures; see [asset provenance](docs/assets.md).

See [public routes and validation](docs/public-pages.md) and
[AdSense follow-up](docs/adsense-review.md). Review captures live in
`docs/screenshots/`; requested website and extension baselines live in
`docs/goldens/`. Both are separate from Rimeward's golden screenshots.
