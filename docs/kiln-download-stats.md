# Kiln download statistics

A private page, `https://frostdev.io/kiln/stats`, that shows how often each file under `/kiln/downloads/` was
downloaded: per day, file, release, country, kind of program, system and referring site. It opens for whoever is
signed in to the Glaze gallery dashboard (`/glaze/admin`, Google sign-in); there is no separate password.

## Where the numbers come from

frostdev.io sits behind Cloudflare, which answers most downloads of the Windows installer and the zips from its cache.
The server never sees those requests, and its nginx keeps no access log for `/kiln/downloads/` and `/kiln/updates/`
(`ops/public-site.nginx.conf`). So the numbers are Cloudflare's: once an hour `stats/kiln-downloads.mjs` asks
Cloudflare's GraphQL Analytics API (`httpRequestsAdaptiveGroups`) for grouped request counts of the zone, for paths
under `/kiln/downloads/` only, and writes them down.

What it asks for, per day: the path, the country, the HTTP status, the User-Agent, whether Cloudflare has verified the
sender as a bot, the referring host, a request count and the bytes sent. It never asks for an IP address.

What it keeps (`/var/lib/kiln-stats/days/<day>.json`): release, file, country, status (200 or 206), kind of program,
system, referring host, count and bytes. The User-Agent text is reduced to a kind and a system before anything is
written; no User-Agent string is stored or shown. The launcher's update check (`/kiln/updates/`) is not counted at all.

Cloudflare keeps this data for 31 days on the zone's plan. The first run stores every day it still has; after that
each run asks for the last three days again (today's numbers still grow) and for any earlier day that is not stored as
final. The day files are kept for good, so the page's history grows past Cloudflare's 31 days.

## What a download is

- **A file of a megabyte or more:** the bytes sent, divided by the file's size. A download that was resumed, or
  fetched in parts by a download manager, counts once; one that was given up counts as the part that arrived. Sizes
  come from the release folders (`/opt/frostdev-downloads/kiln/downloads`, mounted read-only) and are remembered in
  `sizes.json`, so a release that is removed later keeps its sizes.
- **A small file, a text file, or a file whose size is not known:** complete answers (status 200). Cloudflare
  compresses text on the way, so its bytes say nothing about how much of a text file arrived.
- **Not counted:** the API reference site (`sdk/api/`), the NuGet feed's index files (`sdk/feed/*.json`; its packages
  are counted), updater signatures (`.sig`), and every answer that is not 200 or 206.

## Who downloaded

`classifyAgent` reduces a User-Agent to one of:

| Kind | On the page | What it is |
|---|---|---|
| `browser` | People | A current web browser. |
| `launcher` | Launcher updates | Kiln's own programs: the launcher fetching its update (`tauri-plugin-updater`), `kilnctl`. |
| `tool` | Tools | curl, PowerShell, NuGet, a download manager. |
| `bot` | Automated | A crawler, link preview or scanner that says so, or that Cloudflare has verified as one. |
| `automated` | Automated | Claims to be a browser nobody runs today. |
| `other` | Automated | No User-Agent, or one nothing here knows. |

A program can send any User-Agent, so these are estimates. Most scripted downloads copy an old browser's string.
`automated` is a browser string years behind the newest one seen (30 Chrome versions or 45 Firefox versions, about
two and a half years each; the newest versions are remembered in `newest-browsers.json`), a Safari before 15,
Internet Explorer, or a desktop Chrome string from 110 on with a full build number, which Chrome itself has not sent
since version 101. In the first week of data about half of all requests were automated: the page leaves them out
until you switch them on.

To see what the classifier does with today's traffic (printed, never stored):

```sh
ssh loothing-vps 'docker run --rm --env-file /etc/kiln-stats.env kiln-stats node kiln-downloads.mjs agents'
```

## The page

`stats/page.html` with the numbers in one JSON script element, and `page.css` and `page.js`, which it loads; nothing
else is loaded and nothing is sent. Filters: time range, release, group of files, and the four kinds (which are also
the key to the colors).

## Who can open it

Whoever is signed in to the gallery dashboard: the Google accounts in `ADMIN_EMAILS` of `/etc/glaze-gallery.env`
([Looks gallery](looks-gallery.md)). nginx serves the three files from `/opt/frostdev-stats/kiln/`, and before each
one it asks the gallery server whether the visitor's cookie is a dashboard session (`auth_request` to
`GET /glaze/admin/api/live`: 200 to a session, 401 without; `server/admin.test.mjs` holds the route to that).

- The dashboard's cookie is sent only under `/glaze/admin`, so the page's real address is
  `/glaze/admin/kiln-stats/`. `/kiln/stats` redirects there.
- Without a session the browser is sent to `/glaze/admin/login`. After signing in the dashboard opens; open
  `/kiln/stats` again. A session lasts 12 hours.
- When the gallery server is down, nobody gets the page (nginx answers 500).
- No access log, `Cache-Control: no-store`, `X-Robots-Tag: noindex` (and `robots.txt` disallows both paths), never
  framed, and a content security policy that allows only the page's own stylesheet and script: nothing inline runs.

Cloudflare counts some requests from a sample when it is busy; the page says so when a stored day has such counts.

## Installing

1. A Cloudflare API token with **Zone > Analytics > Read** for the zone frostdev.io, and the zone's id. On the server,
   as root, `/etc/kiln-stats.env`, mode 600:

   ```
   CF_API_TOKEN=...
   CF_ZONE_ID=...
   ```

2. `ops/deploy-kiln-stats.sh` from a clean checkout: it runs the tests, copies the script to `/opt/kiln-stats`, builds
   the image `kiln-stats`, installs `kiln-stats.service` and `kiln-stats.timer` (seven minutes past every hour) and
   runs one collection. It fails when Cloudflare refuses the token.
3. The Kiln statistics locations of `ops/public-site.nginx.conf` in `/etc/nginx/snippets/frostdev-public.conf` (the
   installed file stays byte-identical to the repository's): back up, `nginx -t`, `systemctl reload nginx`. They need
   the gallery dashboard to be running with Google sign-in set up.

## Looking after it

- `systemctl list-timers kiln-stats.timer`, `journalctl -u kiln-stats.service -n 20`: each run logs one line, for
  example `kiln-stats: 3 days asked in 3 queries (...)`.
- When a collection fails (the token was revoked, Cloudflare is down), the stored days stay, the page shows a banner
  with the reason, and the next run tries again. A gap of less than 31 days fills itself.
- A new token: edit `/etc/kiln-stats.env`, then `systemctl start kiln-stats.service`.
- To write the page again from what is stored (after changing `page.html`): deploy, or
  `docker run --rm -v /var/lib/kiln-stats:/data -v /opt/frostdev-stats/kiln:/out kiln-stats node kiln-downloads.mjs render`.
- To change how a User-Agent is classified: `classifyAgent` and its test. Stored days keep the kinds they were
  written with; only days Cloudflare still has can be collected again (delete their files in
  `/var/lib/kiln-stats/days/` and start the service).
- Tests: `node --test stats/kiln-downloads.test.mjs` (a stand-in for Cloudflare on 127.0.0.1; nothing leaves the
  machine).
