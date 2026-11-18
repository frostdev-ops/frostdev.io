# Kiln download statistics

How often each file under `/kiln/downloads/` was downloaded: per day, file, release, country, kind of program, system
and referring site. The numbers are shown in [frostdev HQ](hq.md), the private dashboard, at `https://frostdev.io/hq#kiln`
(`/kiln/stats` sends you there). They used to be a page of their own; since HQ, the collection writes `kiln.json` and
HQ draws it. The collection is one part of HQ's hourly `frostdev-stats` run, beside the site's page views and the
public numbers.

## Where the numbers come from

frostdev.io sits behind Cloudflare, which answers most downloads of the Windows installer and the zips from its cache.
The server never sees those requests, and its nginx keeps no access log for `/kiln/downloads/` and `/kiln/updates/`
(`ops/public-site.nginx.conf`). So the numbers are Cloudflare's: once an hour `stats/kiln-downloads.mjs` asks
Cloudflare's GraphQL Analytics API (`httpRequestsAdaptiveGroups`) for grouped request counts of the zone, for paths
under `/kiln/downloads/` only, and writes them down.

What it asks for, per day: the path, the country, the HTTP status, the User-Agent, whether Cloudflare has verified the
sender as a bot, the referring host, a request count and the bytes sent. It never asks for an IP address.

What it keeps (`/var/lib/frostdev-stats/kiln/days/<day>.json`; before HQ, `/var/lib/kiln-stats`): release, file, country, status (200 or 206), kind of program,
system, referring host, count and bytes. The User-Agent text is reduced to a kind and a system before anything is
written; no User-Agent string is stored or shown. The launcher's update check (`/kiln/updates/`) is not counted at all.

Cloudflare keeps this data for 31 days on the zone's plan. The first run stores every day it still has; after that
each run asks for the last three days again (today's numbers still grow) and for any earlier day that is not stored as
final. The day files are kept for good, so the page's history grows past Cloudflare's 31 days.

## What a download is

- **A file of a megabyte or more:** the bytes sent, divided by the file's size. A download that was resumed, or
  fetched in parts by a download manager, counts once; one that was given up counts as the part that arrived. Sizes
  come from the release folders (`/opt/frostdev-downloads/kiln/downloads`, mounted read-only), measured again at
  every run. Each stored day keeps the sizes it was collected with, and `sizes.json` remembers the last one, so a
  release that is removed keeps its sizes and a file that is replaced does not change what earlier days counted.
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
`automated` is a browser string years behind the current one (30 Chrome versions or 45 Firefox versions, about
two and a half years each), a Safari before 15, Internet Explorer, or a string that is exactly desktop Chrome's from
110 on but with a full build number, which Chrome itself has not sent since version 101 (other Chromium browsers add
their own name and may send it).

"The current one" is kept in `newest-browsers.json`: the version most counted requests name. A request can claim any
version, so it never falls and rises by one release at most every two weeks; requests that are not counted (refused
ones, other paths, bots) do not take part. In the first week of data about half of all requests were automated: the page leaves them out
until you switch them on.

To see what the classifier does with today's traffic (printed, never stored):

```sh
ssh loothing-vps 'docker run --rm --env-file /etc/frostdev-stats.env frostdev-stats node kiln-downloads.mjs agents'
```

## The view in HQ

HQ's Kiln view (`server/admin/app.js`, `charts.js`) draws `kiln.json`: filters for the time range, release, group of
files, and the four kinds (which are also the key to the colors), the downloads per day with a table view, and the
files, countries, versions, systems and referring sites. Nexus's and GitHub's numbers sit above it. Who can open it,
how it is installed and looked after: [frostdev HQ](hq.md).

Cloudflare counts some requests from a sample when it is busy; the view says so when a stored day has such counts.

- To change how a User-Agent is classified: `classifyAgent` and its test. Stored days keep the kinds they were
  written with; only days Cloudflare still has can be collected again (delete their files in
  `/var/lib/frostdev-stats/kiln/days/` and start `frostdev-stats.service`).
- Tests: `node --test stats/kiln-downloads.test.mjs` (a stand-in for Cloudflare on 127.0.0.1; nothing leaves the
  machine).
