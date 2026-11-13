#!/usr/bin/env node
// Kiln download statistics: how often each file under /kiln/downloads/ was downloaded, per day, country, kind of
// program and referring site. The numbers are Cloudflare's: frostdev.io sits behind Cloudflare, which answers most
// downloads of the Windows installer and the zips from its cache, so this server never sees them and its nginx keeps
// no access log for those locations (ops/public-site.nginx.conf). Once an hour this script asks Cloudflare's GraphQL
// Analytics API for grouped request counts, adds them to one small JSON file per day and writes the private page
// /kiln/stats/ (stats/page.html with the data inside). docs/kiln-download-stats.md has the rest.
//
//   node stats/kiln-downloads.mjs collect     ask Cloudflare for the last days, store them, write the page
//   node stats/kiln-downloads.mjs render      write the page again from what is stored
//   node stats/kiln-downloads.mjs agents      print today's most frequent User-Agent strings (to tune classifyAgent);
//                                             nothing is stored
//
// Environment: CF_API_TOKEN (a token with Zone > Analytics > Read for the zone), CF_ZONE_ID, DATA_DIR (the day files),
// OUT_DIR (index.html goes here), FILES_DIR (the release folders, read-only, for file sizes; optional),
// CF_API (the endpoint, tests only), DAYS_BACK (how many days each run asks again, default 3).
//
// What is asked for and kept: per day, file, country, HTTP status, kind of program and referring host, a request count
// and the bytes sent. No IP address is asked for, and the User-Agent string is reduced to a kind ("browser", "launcher",
// "tool", "bot", "automated") and a system ("windows", "linux", ...) before anything is written.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PREFIX = '/kiln/downloads/';
const DAY_MS = 86_400_000;
/** A day is final once this long has passed after its end (Cloudflare's data settles within minutes; this is generous). */
const SETTLE_MS = 6 * 3_600_000;

// ---- what a request was -------------------------------------------------------------------------------------------

/** /kiln/downloads/<version>/<file> -> {version, file}; null for what is not a download: the API reference site, the
 *  NuGet feed's index files, updater signatures, and anything that is not under a version folder. */
export function parsePath(path) {
  if (typeof path !== 'string' || !path.startsWith(PREFIX)) return null;
  let rest;
  try {
    rest = decodeURIComponent(path.slice(PREFIX.length));
  } catch {
    return null;
  }
  const slash = rest.indexOf('/');
  if (slash <= 0 || slash === rest.length - 1) return null;
  const version = rest.slice(0, slash);
  const file = rest.slice(slash + 1);
  if (!/^[0-9A-Za-z.+-]{1,64}$/.test(version) || version === '.' || version === '..') return null;
  if (file.length > 240 || file.endsWith('/') || file.split('/').some((part) => part === '' || part === '.' || part === '..')) return null;
  if (/[\u0000-\u001f\\]/.test(file)) return null;
  if (file.startsWith('sdk/api/')) return null;
  if (file.startsWith('sdk/feed/') && !file.endsWith('.nupkg')) return null;
  if (file.startsWith('updates/') || file.startsWith('nexus/') || file.endsWith('.sig')) return null;
  return { version, file };
}

/** The file's name with its release version taken out, so the same file of two releases can be added up:
 *  windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe -> windows/kiln-launcher_*_x64-setup.exe. */
export function fileKey(version, file) {
  return file.split(version).join('*');
}

const KINDS = [
  { re: /^windows\/.+-setup\.exe$/, kind: 'launcher', label: 'Windows installer' },
  { re: /^linux\/.+\.AppImage$/, kind: 'launcher', label: 'Linux AppImage' },
  { re: /^linux\/.+\.deb$/, kind: 'launcher', label: 'Linux .deb package' },
  { re: /^linux\/.+\.rpm$/, kind: 'launcher', label: 'Linux .rpm package' },
  { re: /^runtime\/kiln-server-.+\.zip$/, kind: 'server', label: 'Server pack' },
  { re: /^runtime\/kilnctl(\.exe)?$/, kind: 'server', label: null },
  { re: /^runtime\/kiln-runtime-.+\.zip$/, kind: 'runtime', label: 'Runtime zip' },
  { re: /^runtime\//, kind: 'server', label: null },
  { re: /^sdk\/feed\/.+\.nupkg$/, kind: 'sdk', label: null },
  { re: /^sdk\//, kind: 'sdk', label: null },
  { re: /^samples\//, kind: 'samples', label: null },
  { re: /^source\//, kind: 'source', label: null },
];
/** {kind, label}: which group of the download page a file belongs to, and a short name for it. */
export function describeFile(file) {
  const hit = KINDS.find((entry) => entry.re.test(file));
  const name = file.slice(file.lastIndexOf('/') + 1);
  if (!hit) return { kind: 'notes', label: name };
  if (hit.label) return hit;
  return { kind: hit.kind, label: file.startsWith('sdk/feed/') ? `${name} (NuGet feed)` : name };
}

const BOT = /bot\b|bot[/;) ]|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|phantomjs|lighthouse|virustotal|scan|monitor|uptime|archive\.org|google-safety|appengine-google|feedfetcher|censys|zgrab|nmap|masscan|httpx|nuclei|harness/i;
const LAUNCHER = /kiln|tauri/i;
const TOOL = /^(curl|wget|libcurl|aria2|httpie|python|go-http-client|node|undici|axios|okhttp|java|ureq|reqwest|rust|nuget|dotnet|powershell|apt|dnf|yum|pacman|git|microsoft|winhttp|bits|steam|lua|ruby|perl|php|libwww|fdm|idm)|powershell|windowspowershell|nuget|msbuild|wininet|bitsadmin|download ?manager|aria2|jdownloader/i;

/** The browser versions a User-Agent names: {chrome, firefox, safari} (major numbers, 0 when it names none). */
export function browserVersions(agent) {
  const ua = typeof agent === 'string' ? agent : '';
  const chrome = Number(/(?:Chrome|CriOS)\/(\d+)/.exec(ua)?.[1]) || 0;
  const firefox = Number(/(?:Firefox|FxiOS)\/(\d+)/.exec(ua)?.[1]) || 0;
  // Safari names itself in Version/; Chrome on Android's web view does too, so only where there is no Chrome
  const safari = !chrome && !firefox && /Safari\//.test(ua) ? Number(/Version\/(\d+)/.exec(ua)?.[1]) || 0 : 0;
  return { chrome, firefox, safari };
}

/** A User-Agent string -> {client, os}. client is one of:
 *    "browser"    a current browser: someone clicked a download link
 *    "launcher"   Kiln's own programs: the launcher's self-update (tauri-plugin-updater), kilnctl
 *    "tool"       curl, PowerShell, NuGet, a download manager
 *    "bot"        a crawler, link preview or scanner that says so, or that Cloudflare has verified as one
 *    "automated"  claims to be a browser but is not one a person runs today (see below)
 *    "other"      no User-Agent, or one nothing here knows
 *  A program can send any User-Agent, so these are estimates. Most scripted downloads copy an old browser's string:
 *  "automated" is a browser string whose version is years behind the newest seen (`newest`, from browserVersions over
 *  the same answer: 30 Chrome versions or 45 Firefox versions, each about two and a half years), a Safari before 15
 *  (2021; its numbers went from 18 to 26 in one step, so no distance is used), Internet Explorer, or a desktop Chrome
 *  string from 110 on with a full build number, which Chrome itself has not sent since version 101 (it sends
 *  157.0.0.0). os is set where the string names one. */
export function classifyAgent(agent, { verifiedBot = '', newest = { chrome: 0, firefox: 0 } } = {}) {
  const ua = typeof agent === 'string' ? agent.trim() : '';
  const os = /windows|win32|win64/i.test(ua) ? 'windows'
    : /android/i.test(ua) ? 'android'
    : /iphone|ipad|ipod/i.test(ua) ? 'ios'
    : /mac os x|macintosh|darwin/i.test(ua) ? 'mac'
    : /cros/i.test(ua) ? 'chromeos'
    : /linux|x11|ubuntu|debian|fedora/i.test(ua) ? 'linux' : '';
  if (verifiedBot) return { client: 'bot', os };
  if (!ua) return { client: 'other', os };
  if (BOT.test(ua)) return { client: 'bot', os };
  if (LAUNCHER.test(ua)) return { client: 'launcher', os };
  if (TOOL.test(ua)) return { client: 'tool', os };
  if (/msie |trident\//i.test(ua)) return { client: 'automated', os };
  if (/^mozilla\/5\.0 /i.test(ua) && /(chrome|chromium|crios|firefox|fxios|safari|edg|opr|vivaldi|gecko)\//i.test(ua)) {
    const { chrome, firefox, safari } = browserVersions(ua);
    const stale = (chrome && newest.chrome && chrome < newest.chrome - 30) || (firefox && newest.firefox && firefox < newest.firefox - 45)
      || (safari && safari < 15);
    const fullBuild = chrome >= 110 && !/(?:Chrome|CriOS)\/\d+\.0\.0\.0/.test(ua) && !/android|; wv\)|iphone|ipad/i.test(ua);
    return { client: stale || fullBuild ? 'automated' : 'browser', os };
  }
  return { client: 'other', os };
}

/** The newest Chrome and Firefox among the browser strings of an answer: the highest version that at least three
 *  requests name (one request can claim anything), never lower than `known` (what earlier runs saw). */
export function newestBrowsers(groups, known = { chrome: 0, firefox: 0 }) {
  const seen = { chrome: new Map(), firefox: new Map() };
  for (const group of groups) {
    const versions = browserVersions(group.dimensions?.userAgent);
    for (const name of ['chrome', 'firefox']) {
      if (versions[name]) seen[name].set(versions[name], (seen[name].get(versions[name]) || 0) + (Number(group.count) || 0));
    }
  }
  const newest = (name) => Math.max(known[name] || 0, ...[...seen[name]].filter(([, count]) => count >= 3).map(([version]) => version));
  return { chrome: newest('chrome'), firefox: newest('firefox') };
}

/** A referring host, lower case, "frostdev.io" for the site itself; "" when there was none. */
export function cleanReferrer(host) {
  if (typeof host !== 'string') return '';
  const h = host.trim().toLowerCase().replace(/^www\./, '');
  return /^[a-z0-9.-]{1,80}$/.test(h) ? h : '';
}

// ---- Cloudflare ---------------------------------------------------------------------------------------------------

const DATASET = 'httpRequestsAdaptiveGroups';
/** The dimensions asked for. Without a required one nothing can be counted; an optional one is left out when the
 *  zone's plan does not offer it (the page then shows what it has). */
export const REQUIRED = ['clientRequestPath', 'clientCountryName', 'edgeResponseStatus'];
export const OPTIONAL = ['userAgent', 'verifiedBotCategory', 'clientRefererHost'];
export const DEFAULT_LIMITS = { maxDuration: DAY_MS / 1000, maxPageSize: 10_000, notOlderThan: 30 * DAY_MS / 1000, fields: [...REQUIRED, ...OPTIONAL], filters: ['requestSource', 'clientRequestHTTPMethodName'] };

export class CloudflareError extends Error {}

/** One GraphQL request. Throws CloudflareError with Cloudflare's own words; the token is never part of a message. */
export async function cfQuery(env, query) {
  const endpoint = env.CF_API || 'https://api.cloudflare.com/client/v4/graphql';
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new CloudflareError(`Cloudflare could not be reached: ${error.cause?.code || error.name}`);
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new CloudflareError(`Cloudflare answered ${response.status} without JSON`);
  }
  if (body?.errors?.length) throw new CloudflareError(body.errors.map((e) => e.message).join('; ').slice(0, 600));
  if (!response.ok || !body?.data) throw new CloudflareError(`Cloudflare answered ${response.status}`);
  return body.data;
}

const zoneOf = (env) => {
  if (!/^[0-9a-f]{32}$/.test(env.CF_ZONE_ID || '')) throw new CloudflareError('CF_ZONE_ID is not a zone id (32 hex characters)');
  return env.CF_ZONE_ID;
};

/** What the zone's plan allows for the dataset: the longest window of one query, the page size, how far back, and
 *  which of our dimensions exist. When Cloudflare does not answer the settings question, the usual limits are used. */
export async function fetchLimits(env) {
  const query = `{ viewer { zones(filter: {zoneTag: "${zoneOf(env)}"}) { settings { ${DATASET} { enabled maxDuration maxPageSize notOlderThan availableFields } } } } }`;
  let node;
  try {
    node = (await cfQuery(env, query)).viewer?.zones?.[0]?.settings?.[DATASET];
  } catch (error) {
    if (/authenticat|authoriz|permission|not allowed|access/i.test(error.message)) throw error;
    return { ...DEFAULT_LIMITS, note: `limits unknown (${error.message.slice(0, 120)})` };
  }
  if (!node) throw new CloudflareError('Cloudflare knows no such zone for this token (check CF_ZONE_ID and the token\'s zone)');
  if (node.enabled === false) throw new CloudflareError(`${DATASET} is not available on this zone's plan`);
  // Cloudflare lists them as dimensions_clientRequestPath, sum_edgeResponseBytes, ...
  const available = Array.isArray(node.availableFields) ? new Set(node.availableFields.map((f) => String(f).replace(/^dimensions[_.]/, ''))) : null;
  const has = (name) => !available || available.has(name);
  const missing = REQUIRED.filter((name) => !has(name));
  if (missing.length) throw new CloudflareError(`this zone's plan does not offer ${missing.join(', ')} in ${DATASET}`);
  return {
    maxDuration: Number(node.maxDuration) > 0 ? Number(node.maxDuration) : DEFAULT_LIMITS.maxDuration,
    maxPageSize: Number(node.maxPageSize) > 0 ? Number(node.maxPageSize) : DEFAULT_LIMITS.maxPageSize,
    notOlderThan: Number(node.notOlderThan) > 0 ? Number(node.notOlderThan) : DEFAULT_LIMITS.notOlderThan,
    fields: [...REQUIRED, ...OPTIONAL.filter(has)],
    filters: DEFAULT_LIMITS.filters.filter(has),
  };
}

function windowQuery(env, limits, from, to) {
  const filters = [`datetime_geq: "${from.toISOString()}"`, `datetime_lt: "${to.toISOString()}"`, `clientRequestPath_like: "${PREFIX}%"`];
  if (limits.filters.includes('requestSource')) filters.push('requestSource: "eyeball"');
  if (limits.filters.includes('clientRequestHTTPMethodName')) filters.push('clientRequestHTTPMethodName: "GET"');
  return `{ viewer { zones(filter: {zoneTag: "${zoneOf(env)}"}) { ${DATASET}(limit: ${limits.maxPageSize}, filter: {${filters.join(', ')}}, orderBy: [count_DESC]) { count sum { edgeResponseBytes } avg { sampleInterval } dimensions { ${limits.fields.join(' ')} } } } } }`;
}

/** Every group of [from, to). A window that fills a whole page is asked again in two halves, so nothing is cut off
 *  (down to one minute; a minute that still fills a page is reported in `truncated`). An optional dimension or filter
 *  Cloudflare refuses is dropped from `limits` and the window is asked again. */
export async function fetchWindow(env, limits, from, to, state = { queries: 0, truncated: 0 }) {
  const span = to - from;
  const longest = limits.maxDuration * 1000;
  if (span > longest) {
    const out = [];
    for (let at = from.getTime(); at < to.getTime(); at += longest) {
      out.push(...await fetchWindow(env, limits, new Date(at), new Date(Math.min(at + longest, to.getTime())), state));
    }
    return out;
  }
  let groups;
  for (;;) {
    state.queries++;
    try {
      groups = (await cfQuery(env, windowQuery(env, limits, from, to))).viewer?.zones?.[0]?.[DATASET];
      break;
    } catch (error) {
      const refused = [...OPTIONAL.filter((n) => limits.fields.includes(n)), ...limits.filters].find((name) => error.message.includes(name));
      if (!(error instanceof CloudflareError) || !refused) throw error;
      limits.fields = limits.fields.filter((name) => name !== refused);
      limits.filters = limits.filters.filter((name) => name !== refused);
      (limits.dropped ||= []).push(refused);
    }
  }
  if (!Array.isArray(groups)) throw new CloudflareError('Cloudflare knows no such zone for this token (check CF_ZONE_ID and the token\'s zone)');
  if (groups.length < limits.maxPageSize) return groups;
  if (span <= 60_000) {
    state.truncated++;
    return groups;
  }
  // halves on whole minutes, never shorter than one: both are shorter than the window, so this ends
  const middle = new Date(from.getTime() + Math.max(60_000, Math.floor(span / 2 / 60_000) * 60_000));
  return [...await fetchWindow(env, limits, from, middle, state), ...await fetchWindow(env, limits, middle, to, state)];
}

// ---- the day files ------------------------------------------------------------------------------------------------

/** Cloudflare's groups of one day -> the rows kept for it: [version, file, country, status, client, os, referrer,
 *  requests, bytes], one per combination, status 200 and 206 only (a full answer and a part of a file). Everything
 *  else is counted in `skipped` by reason. `newest` is what classifyAgent measures a browser string's age against. */
export function reduceGroups(groups, newest = newestBrowsers(groups)) {
  const rows = new Map();
  const skipped = {};
  let sampled = 1;
  const skip = (why, n) => { skipped[why] = (skipped[why] || 0) + n; };
  for (const group of groups) {
    const d = group.dimensions || {};
    const count = Number(group.count) || 0;
    const bytes = Number(group.sum?.edgeResponseBytes) || 0;
    sampled = Math.max(sampled, Number(group.avg?.sampleInterval) || 1);
    const status = Number(d.edgeResponseStatus);
    if (status !== 200 && status !== 206) { skip(`status ${status || '?'}`, count); continue; }
    const target = parsePath(d.clientRequestPath);
    if (!target) { skip('not a download', count); continue; }
    let { client, os } = 'userAgent' in d ? classifyAgent(d.userAgent, { verifiedBot: d.verifiedBotCategory, newest }) : { client: 'unknown', os: '' };
    // the launcher's updater names no system: the file it fetches says which one it runs on
    if (!os && client === 'launcher') os = target.file.startsWith('windows/') ? 'windows' : target.file.startsWith('linux/') ? 'linux' : '';
    const country = /^[A-Z0-9]{2}$/.test(d.clientCountryName || '') ? d.clientCountryName : 'XX';
    const key = JSON.stringify([target.version, target.file, country, status, client, os, cleanReferrer(d.clientRefererHost)]);
    const row = rows.get(key) || [0, 0];
    row[0] += count;
    row[1] += bytes;
    rows.set(key, row);
  }
  const list = [...rows].map(([key, [count, bytes]]) => [...JSON.parse(key), count, bytes]);
  list.sort((a, b) => (a.slice(0, 7).join('\u0001') < b.slice(0, 7).join('\u0001') ? -1 : 1));
  return { rows: list, skipped, sampled };
}

const dayName = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayStart = (name) => Date.parse(`${name}T00:00:00Z`);

function writeAtomic(path, text) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

export function readDays(dataDir) {
  const dir = join(dataDir, 'days');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => /^\d{4}-\d\d-\d\d\.json$/.test(name)).sort()
    .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')));
}

/** Which days a run asks Cloudflare for: the last `daysBack` days (today included, they still change), and every
 *  earlier day Cloudflare still has that is not stored as final. */
export function daysToFetch(stored, now, daysBack, notOlderThanSeconds) {
  const today = dayStart(dayName(now));
  // a whole day must lie inside what Cloudflare keeps, with an hour to spare
  const oldest = dayStart(dayName(now - notOlderThanSeconds * 1000 + 3_600_000)) + DAY_MS;
  const final = new Set(stored.filter((day) => day.final).map((day) => day.day));
  const out = [];
  for (let at = oldest; at <= today; at += DAY_MS) {
    const name = dayName(at);
    if (at > today - daysBack * DAY_MS || !final.has(name)) out.push(name);
  }
  return out;
}

/** Sizes of the files in the release folders, remembered in sizes.json so a release that is removed keeps its sizes. */
export function fileSizes(dataDir, filesDir, wanted) {
  const path = join(dataDir, 'sizes.json');
  const sizes = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  let changed = false;
  if (filesDir) {
    const root = resolve(filesDir);
    for (const [version, file] of wanted) {
      const key = `${version}/${file}`;
      if (key in sizes) continue;
      const target = resolve(root, version, file);
      if (!target.startsWith(root + sep)) continue;
      try {
        const stat = statSync(target);
        if (stat.isFile()) { sizes[key] = stat.size; changed = true; }
      } catch { /* not there (an old release that was removed before its first count): requests are counted instead */ }
    }
  }
  if (changed) writeAtomic(path, JSON.stringify(sizes));
  return sizes;
}

// ---- the page -----------------------------------------------------------------------------------------------------

/** Whether a file's downloads are counted from the bytes sent (bytes / size: a download that was resumed, or fetched
 *  in parts by a download manager, counts once, and one that was given up counts as the part that arrived). Only for
 *  files of a megabyte or more that are sent as they are: Cloudflare compresses text on the way, so its bytes say
 *  nothing about how much of a text file arrived. Other files count full answers (status 200). */
export const countedByBytes = (file, size) => size >= 1_048_576 && !/\.(txt|md|json|xml|html?|css|js|svg|ya?ml)$/i.test(file);

/** Everything the page needs, small: the stored rows of every day with names replaced by indexes, and downloads
 *  worked out per row. A row is [day, file, country, client, os, referrer, downloads, requests]. */
export function buildPageData(days, sizes, now) {
  const index = (list, map, value) => {
    if (!map.has(value)) { map.set(value, list.length); list.push(value); }
    return map.get(value);
  };
  const data = { generated: new Date(now).toISOString(), days: [], files: [], countries: [], clients: [], systems: [], referrers: [], rows: [], notes: [], alerts: [] };
  const maps = { files: new Map(), countries: new Map(), clients: new Map(), systems: new Map(), referrers: new Map() };
  let sampled = 1;
  let truncated = 0;
  const dropped = new Set();
  for (const day of days) {
    const dayIndex = data.days.length;
    data.days.push({ day: day.day, final: !!day.final });
    sampled = Math.max(sampled, day.sampled || 1);
    truncated += day.truncated || 0;
    for (const name of day.dropped || []) dropped.add(name);
    const merged = new Map();
    for (const [version, file, country, status, client, os, referrer, count, bytes] of day.rows) {
      const size = sizes[`${version}/${file}`];
      const byBytes = countedByBytes(file, size || 0);
      const downloads = byBytes ? bytes / size : (status === 200 ? count : 0);
      const requests = status === 200 ? count : 0;
      if (!downloads && !requests) continue;
      let fileIndex = maps.files.get(`${version}/${file}`);
      if (fileIndex === undefined) {
        fileIndex = data.files.length;
        maps.files.set(`${version}/${file}`, fileIndex);
        data.files.push({ version, file, key: fileKey(version, file), ...describeFile(file), size: size ?? null, byBytes });
      }
      const key = [fileIndex, index(data.countries, maps.countries, country), index(data.clients, maps.clients, client),
        index(data.systems, maps.systems, os), index(data.referrers, maps.referrers, referrer)].join(',');
      const row = merged.get(key) || [0, 0];
      row[0] += downloads;
      row[1] += requests;
      merged.set(key, row);
    }
    for (const [key, [downloads, requests]] of merged) {
      data.rows.push([dayIndex, ...key.split(',').map(Number), Math.round(downloads * 1000) / 1000, requests]);
    }
  }
  if (sampled > 1) data.notes.push(`Cloudflare counted some of these requests from a sample (as few as 1 in ${Math.ceil(sampled - 1e-9)}): those counts are estimates.`);
  if (truncated) data.notes.push(`${truncated} one-minute windows had more groups than one answer holds: their counts are too low.`);
  if (dropped.has('userAgent')) data.notes.push('This zone\'s plan gives no User-Agent: every program counts as "unknown".');
  if (dropped.has('clientRefererHost')) data.notes.push('This zone\'s plan gives no referring host.');
  return data;
}

/** The page: the template with the data in its one script element. "<" is escaped, so no file name, referrer or
 *  country can end the element. */
export function renderPage(template, data) {
  const marker = '/*KILN-STATS-DATA*/null';
  if (!template.includes(marker)) throw new Error('stats/page.html has no data marker');
  return template.replace(marker, () => JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'));
}

// ---- the commands -------------------------------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));

function settings(env) {
  for (const name of ['DATA_DIR', 'OUT_DIR']) if (!env[name]) throw new Error(`${name} is not set`);
  return { dataDir: env.DATA_DIR, outDir: env.OUT_DIR, filesDir: env.FILES_DIR || '', template: env.TEMPLATE || join(here, 'page.html') };
}

export function render(env, now = Date.now()) {
  const s = settings(env);
  const days = readDays(s.dataDir);
  const wanted = new Map();
  for (const day of days) for (const row of day.rows) wanted.set(`${row[0]}/${row[1]}`, [row[0], row[1]]);
  const data = buildPageData(days, fileSizes(s.dataDir, s.filesDir, wanted.values()), now);
  const last = join(s.dataDir, 'last-run.json');
  if (existsSync(last)) {
    const run = JSON.parse(readFileSync(last, 'utf8'));
    data.collected = run.ok ? run.at : null;
    if (!run.ok) data.alerts.push(`The last collection (${run.at}) failed: ${run.error}. The numbers are from the collection before.`);
  }
  mkdirSync(s.outDir, { recursive: true });
  writeAtomic(join(s.outDir, 'index.html'), renderPage(readFileSync(s.template, 'utf8'), data));
  return data;
}

export async function collect(env, now = Date.now()) {
  const s = settings(env);
  if (!env.CF_API_TOKEN) throw new Error('CF_API_TOKEN is not set');
  mkdirSync(join(s.dataDir, 'days'), { recursive: true });
  const run = { at: new Date(now).toISOString(), ok: false };
  try {
    const limits = await fetchLimits(env);
    const daysBack = Math.max(1, Number(env.DAYS_BACK) || 3);
    const wanted = daysToFetch(readDays(s.dataDir), now, daysBack, limits.notOlderThan);
    const state = { queries: 0, truncated: 0 };
    const answers = [];
    for (const name of wanted) {
      const from = dayStart(name);
      const before = state.truncated;
      const groups = await fetchWindow(env, limits, new Date(from), new Date(Math.min(from + DAY_MS, now)), state);
      answers.push({ name, from, groups, truncated: state.truncated - before });
    }
    // what a browser string's age is measured against: the newest versions of this run and of the runs before
    const newestPath = join(s.dataDir, 'newest-browsers.json');
    const newest = newestBrowsers(answers.flatMap((answer) => answer.groups), existsSync(newestPath) ? JSON.parse(readFileSync(newestPath, 'utf8')) : undefined);
    writeAtomic(newestPath, JSON.stringify(newest));
    for (const { name, from, groups, truncated } of answers) {
      const { rows, skipped, sampled } = reduceGroups(groups, newest);
      const day = { day: name, fetched: run.at, final: now >= from + DAY_MS + SETTLE_MS, sampled, truncated, dropped: limits.dropped || [], skipped, rows };
      writeAtomic(join(s.dataDir, 'days', `${name}.json`), JSON.stringify(day));
    }
    Object.assign(run, { ok: true, days: wanted.length, queries: state.queries, fields: limits.fields, note: limits.note });
  } catch (error) {
    run.error = error instanceof CloudflareError ? error.message : `${error.name}: ${error.message}`;
  }
  writeAtomic(join(s.dataDir, 'last-run.json'), JSON.stringify(run));
  // the page is written either way: after a failure it says so and shows what the collection before stored
  render(env, now);
  if (!run.ok) throw new Error(run.error);
  return run;
}

/** Today's most frequent User-Agent strings with their kind, for tuning classifyAgent. Printed, never stored. */
export async function agents(env, now = Date.now()) {
  const limits = await fetchLimits(env);
  if (!limits.fields.includes('userAgent')) throw new Error('this zone\'s plan gives no User-Agent');
  limits.fields = ['clientRequestPath', 'edgeResponseStatus', 'userAgent', ...limits.fields.filter((name) => name === 'verifiedBotCategory')];
  const groups = await fetchWindow(env, limits, new Date(now - DAY_MS + 60_000), new Date(now));
  const newest = newestBrowsers(groups);
  const byAgent = new Map();
  for (const group of groups) {
    const d = group.dimensions;
    if (!parsePath(d.clientRequestPath) || ![200, 206].includes(Number(d.edgeResponseStatus))) continue;
    const key = JSON.stringify([d.userAgent, d.verifiedBotCategory || '']);
    byAgent.set(key, (byAgent.get(key) || 0) + group.count);
  }
  return [...byAgent].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([key, count]) => {
    const [agent, verifiedBot] = JSON.parse(key);
    return { count, ...classifyAgent(agent, { verifiedBot, newest }), agent: String(agent).slice(0, 160) };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const command = process.argv[2];
  try {
    if (command === 'collect') {
      const run = await collect(process.env);
      console.log(`kiln-stats: ${run.days} days asked in ${run.queries} queries (${run.fields.join(', ')})${run.note ? `; ${run.note}` : ''}`);
    } else if (command === 'render') {
      const data = render(process.env);
      console.log(`kiln-stats: page written, ${data.days.length} days, ${data.rows.length} rows`);
    } else if (command === 'agents') {
      for (const line of await agents(process.env)) console.log(`${String(line.count).padStart(6)}  ${line.client.padEnd(8)} ${line.os.padEnd(8)} ${line.agent}`);
    } else {
      console.error('usage: kiln-downloads.mjs collect | render | agents');
      process.exit(2);
    }
  } catch (error) {
    console.error(`kiln-stats: ${error.message}`);
    process.exit(1);
  }
}
