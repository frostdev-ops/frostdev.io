# frostdev HQ

`https://frostdev.io/hq` is the owner's private dashboard for everything behind the site: Kiln's downloads, Crucible's
moderation (Kiln's modpacks), Glaze's numbers and its gallery's review queue, and the public site's page views. Google sign-in lands here. It replaced the
gallery dashboard at `/glaze/admin` and the Kiln statistics page at `/kiln/stats`; both addresses send the browser to
HQ (a review email's `#looks/<id>` still opens that Look).

`/admin` on frostdev.io is Rimeward's own admin (users, settings, monitors; the app behind nginx's `location /`), so HQ
has its own path and links there instead. Rimeward has its own accounts and sign-in.

## What it shows

| View | Address | From |
|---|---|---|
| Overview | `/hq#overview` | Everything below in tiles; what needs you; the health of the collections, mail, submit limits and the mod blocklist |
| Kiln · Downloads | `/hq#kiln` | `kiln.json` (Cloudflare, [Kiln download statistics](kiln-download-stats.md)), Nexus and GitHub from `public.json` |
| Kiln · Crucible | `/hq#crucible` (`#kiln/crucible` too) | Crucible's local admin API through `/hq/api/crucible/...` (below) |
| Glaze · Numbers | `/hq#glaze` | `public.json` (Chrome Web Store, Firefox Add-ons, GitHub releases) and the gallery's own records (`/hq/api/glaze`) |
| Glaze · Mods, Looks | `/hq#glaze/mods/<filter>/<id>/<hash>`, `/hq#glaze/looks/<filter>/<id>` | The gallery review, unchanged ([Looks gallery](looks-gallery.md), Admin dashboard) |
| Glaze · Activity | `/hq#activity` | The audit log of every decision |
| frostdev.io · Page views | `/hq#site` | `site.json` (Cloudflare) |

### What is never counted

Glaze promises "No product analytics, tracking pixels, session replay or engagement reporting to Frostdev" and "No
invisible audience" (`src/pages/glaze/privacy.astro`), and the Looks gallery "records nothing about which Looks you
view" (`src/pages/privacy.astro`). So:

- no path naming Glaze (its pages, guides, gallery, APIs; also percent-encoded) is counted in the page views, not even
  as a total or in the counts of skipped requests (`stats/site-pages.mjs`, `isGlaze`);
- nothing from Glaze itself: no update checks (`/projects/glaze/appcast.xml`), mod blocklist or "Use in Glaze" fetches;
- Glaze's numbers are only what the stores and GitHub show anyone, and the gallery's records of submissions.

Rimeward's application (sign-in, dashboards, share links under `/s/`) is not counted either: only the pages of the
built static site (`/opt/frostdev-public/current`, mounted read-only) and the Kiln SDK's API reference count, so no
account route or link token is ever stored. The page-view collector requires the built site and leaves excluded
requests out of its stored rows and skipped counts.

## How it works

```
Cloudflare GraphQL, GitHub, Nexus, AMO, Chrome Web Store
        │  once an hour (frostdev-stats.timer)
        ▼
frostdev-stats (Docker, one run) ── /var/lib/frostdev-stats/{kiln,site,public}/  day files, kept for good
        │
        └─ /var/lib/frostdev-stats/out/{kiln,site,public,status}.json
                 │ mounted read-only at /stats
                 ▼
glaze-gallery (Docker, 127.0.0.1:8788) ── /hq: Google sign-in, the gallery review, /hq/api/stats/<name>
        ▲
nginx: location = /hq and ^~ /hq/ (ops/public-site.nginx.conf)
```

- `stats/collect.mjs`: one collection, three parts that run on their own: `kiln-downloads.mjs` (Kiln's downloads),
  `site-pages.mjs` (page views) and `public-numbers.mjs` (stores, GitHub, Nexus). A part that fails leaves the others'
  numbers fresh, records why in `status.json` and makes the run exit 1. `node collect.mjs render` writes the JSON again
  from what is stored, asking nobody.
- The page views use the same Cloudflare questions and the same kinds of program as Kiln's downloads (people, tools,
  automated), measured against the same record of the newest browsers. Programs that are not a person keep no system
  or referrer. `site.json` holds the last 120 days; the day files stay.
- The public numbers keep the latest answer of each source per day in `public/<day>.json`, so the tiles grow trend
  lines. GitHub's open issue count includes pull requests. The Chrome Web Store has no API: the count comes from its
  listing page and is reported as an error when the page stops saying it.
- `server/gallery-admin.mjs` serves HQ: the sign-in, the session, the review (unchanged), Crucible's admin routes
  (`/hq/api/crucible/...`, above), `GET /hq/api/stats/<name>`
  (only `kiln`, `site`, `public` and `status`, read from `STATS_DIR`) and `GET /hq/api/glaze` (counts by status, the
  last 30 days' submissions and how they ended, the review models' cost over those days, today's review allowance,
  whether review mail is on). The page is `server/admin/` (`index.html`, `style.css`, `app.js` for the shell and
  views, `charts.js`, `gallery.js` for the review, `crucible.js` for Crucible, `viewer.js`); no inline script or style, no outside resources.
- Chart colors are fixed per kind of program and were checked with the dataviz palette validator for the dark
  surface: people `#139fd2`, launcher updates `#d95926`, tools `#9085e9`, automated `#c98500`.

## Crucible

Crucible is Kiln's modpack service (frostdev.io/kiln/crucible, its own repository and `crucible.service` on
loothing-vps, 127.0.0.1:8792). Its moderation lives in HQ at `/hq#crucible`, with a tile on the overview (open
reports, public packs, installs today) and the open-report count beside "Crucible" in the rail:

- **Numbers**: public and link-only packs, open reports, hidden packs, installs today with the last 30 days, storage
  (files, versions), uploads not finished.
- **Reports**: open reports grouped by what they are about (pack, version or comment), with each reporter, reason,
  text and time. Close them (with an optional outcome), hide or restore the pack, take down the version or pack (a
  reason the creator sees, optionally blocking every file), keep or remove a comment.
- **Recent public packs** (the 200 changed most recently; 50 shown) with Hide, Restore and Take down, linked to their
  public page `/kiln/crucible/<slug>`.
- **Hidden and taken down**: packs hidden by reports or by Hide, and taken-down packs with their reason.
- **File blocklist**: add a sha256 with a reason, filter, unblock.
- **Account bans**: ban a Discord id with a reason, unban by id. Crucible has no list of bans yet.
- **Delete a person's data**: a Discord id's packs, comments, upvotes and reports, for a deletion request; the id
  must be typed again in the confirm dialog, and the counts deleted are shown.

Every destructive action asks first in a modal dialog. Each successful change is written to HQ's audit log (Activity)
as `crucible: <what>` with the signed-in email, the id and the reason.

How it reaches Crucible: the page calls `/hq/api/crucible/<route>` and `gallery-admin.mjs` forwards it to
`CRUCIBLE_ADMIN_URL` with the header `X-Crucible-Admin: CRUCIBLE_ADMIN_SECRET` and nothing else from the request: no
HQ cookie, no CSRF token and no visitor address (Crucible refuses any request that carries X-Real-IP or
X-Forwarded-For). Only Crucible's HQ routes pass (`CRUCIBLE_ROUTES`): `GET reports?state=`, `POST
reports/:id/close`, `GET packs?visibility=|hidden=1`, `POST packs/:id/takedown`, `POST versions/:id/takedown`,
`POST packs/:id/hide|restore`, `POST comments/:id/remove|restore`, `GET|POST blocklist`, `DELETE blocklist/:sha256`,
`POST bans`, `DELETE bans/:id`, `DELETE users/:id`, `GET stats`. Ids are checked as Crucible checks them, the query
is rebuilt from known parameters and each body from known fields (reasons lose control characters and are cut to
Crucible's lengths). POST and DELETE need HQ's Origin and CSRF checks, like the gallery's actions. Crucible's answers
pass through; when it is not set up the view says so, when it does not answer within 10 s (30 s for changes) HQ says
it isn't answering, and a refused secret is reported as a mismatch, never as HQ's own sign-in.

Settings, in `/etc/glaze-gallery.env` (root, mode 600):

```ini
CRUCIBLE_ADMIN_SECRET=<the same value as CRUCIBLE_ADMIN_SECRET in /etc/crucible.env>
# only when Crucible does not listen on 127.0.0.1:8792 (the gallery container runs with --network host)
# CRUCIBLE_ADMIN_URL=http://127.0.0.1:8792/admin
```

Then `ops/deploy-gallery.sh` (recreating the container loads the env file). Without the secret the Crucible view shows
"Crucible isn't set up" and nothing is sent.

### Sign-in

Unchanged from the gallery dashboard (Google, `openid email`, PKCE, `ADMIN_EMAILS` in `/etc/glaze-gallery.env`), with
two differences:

- the session cookie is `__Secure-fd_hq`, `Path=/hq`; everyone signs in once more after the move;
- the OAuth redirect URI stays `https://frostdev.io/glaze/admin/callback`, the one registered with Google, so the
  move needed no change in Google Cloud. The flow cookie is sent only to that path. To move the callback under `/hq`,
  add the new URI to the OAuth client in Google Cloud first, then change `CALLBACK` in `server/gallery-admin.mjs`.
- Links to individual views or review items are restored after sign-in. A successful sign-in replaces the prior HQ
  session when one was present on the login request.

## Installing

1. `/etc/frostdev-stats.env` on loothing-vps, root, mode 600: `CF_API_TOKEN` (Zone > Analytics > Read for
   frostdev.io), `CF_ZONE_ID`, optionally `GITHUB_TOKEN` (no scopes needed). The first deploy copies it from the old
   `/etc/kiln-stats.env` when it is missing.
2. `ops/deploy-stats.sh` from a clean checkout: runs `stats/*.test.mjs`, stages the four scripts and the Dockerfile
   in `/opt/frostdev-stats`, builds the image, copies Kiln's stored days from `/var/lib/kiln-stats` the first time,
   installs `frostdev-stats.service` and `.timer` and runs one collection. It switches off the old `kiln-stats` timer
   after the first successful run and keeps the legacy page available until nginx is updated.
3. `ops/deploy-gallery.sh`: the gallery server, now with `-v /var/lib/frostdev-stats/out:/stats:ro -e STATS_DIR=/stats`.
   For the Crucible view, `CRUCIBLE_ADMIN_SECRET` in `/etc/glaze-gallery.env` first (Crucible, above).
4. nginx: the `/hq` locations and the new `/kiln/stats` redirect from `ops/public-site.nginx.conf` into
   `/etc/nginx/snippets/frostdev-public.conf` (the installed file stays byte-identical to the repository's): back up,
   `nginx -t`, `systemctl reload nginx`. The old Kiln statistics locations and their `auth_request` are gone.

## Looking after it

- `systemctl list-timers frostdev-stats.timer`, `journalctl -u frostdev-stats.service -n 20`: one line a run, for
  example `frostdev-stats: kiln ok (3 days in 3 queries); site ok (3 days in 3 queries); public ok (every source answered)`.
  The Overview's Health card shows the same, and says when no run has finished for three hours.
- The server prunes unused Docker images every night (`/etc/cron.d/docker-image-prune`, `docker image prune -af
  --filter until=24h`), and the collection's image is unused between runs. The service builds it again from
  `/opt/frostdev-stats` when it is gone (that emptied the Kiln page twice, on 2026-11-15 and 2026-11-18).
- Cloudflare keeps 31 days: a gap shorter than that fills itself on the next run.
- A new token: edit `/etc/frostdev-stats.env`, then `systemctl start frostdev-stats.service`.
- Tests: `node --test stats/*.test.mjs` and `npm run test:gallery` (`server/admin.test.mjs`).
