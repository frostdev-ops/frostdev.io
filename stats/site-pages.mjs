// frostdev.io page views: how often each page of the public site was opened, per day, country, kind of program and
// referring site. Cloudflare's numbers, like Kiln's downloads (stats/kiln-downloads.mjs, whose Cloudflare questions and
// User-Agent kinds this module shares): answers of type html with status 200 to GET requests from visitors, for the
// host frostdev.io. stats/collect.mjs runs it once an hour; the private dashboard (/hq, docs/hq.md) draws site.json.
//
// Only the static site's own pages count: a path whose page is in the built site (SITE_DIR), or the API reference of a
// Kiln release. Rimeward's application (sign-in, dashboards, share links) and everything else is left out, so no
// account route or link token is ever stored.
//
// Glaze's pages are never counted, not even as a total. Glaze promises "No product analytics, tracking pixels, session
// replay or engagement reporting to Frostdev" and "No invisible audience" (src/pages/glaze/privacy.astro), and the Looks
// gallery "records nothing about which Looks you view" (src/pages/privacy.astro). Any path naming Glaze is dropped before
// anything is written, including its guides.
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import {
  CloudflareError, DAY, SETTLE, classifyAgent, cleanReferrer, dayName, dayStart, daysToFetch, fetchLimits, fetchWindow,
  readDays, redactStatsError, writeAtomic,
} from './kiln-downloads.mjs';

export const HOST = 'frostdev.io';
export const SCOPE = { filters: [`clientRequestHTTPHost: "${HOST}"`, 'edgeResponseContentTypeName: "html"', 'edgeResponseStatus: 200',
  'clientRequestHTTPMethodName: "GET"', 'requestSource: "eyeball"'], useOptionalFilters: false };
/** How many days site.json holds in full; older day files stay on disk. */
export const KEEP_DAYS = 120;

/** Any path that names Glaze, in any case, also percent-encoded, including its guides. */
export const isGlaze = (path) => {
  const raw = String(path);
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* the raw text decides */ }
  return /glaze/i.test(raw) || /glaze/i.test(decoded);
};

/** A request path -> the built page or Kiln API reference it counts for, or null. */
export function pageOf(path, siteDir = '') {
  if (!siteDir || typeof path !== 'string' || !path.startsWith('/') || path.length > 200) return null;
  let p;
  try {
    p = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (isGlaze(path)) return null;
  if (!/^\/[A-Za-z0-9._~/-]*$/.test(p) || p.includes('//') || p.split('/').some((part) => part === '.' || part === '..')) return null;
  if (/^\/kiln\/downloads\/[0-9A-Za-z.+-]{1,64}\/sdk\/api\//.test(p)) return '/kiln/downloads/*/sdk/api/';
  if (p.length > 1) p = p.replace(/\/+$/, '');
  // Match the public routes in ops/public-site.nginx.conf before checking the build. The rest go to Rimeward.
  if (p !== '/' && !/^\/(?:crosspane|rimeward|rimewire|privacy)$|^\/(?:kiln|guides|projects)(?:\/|$)/.test(p)) return null;
  if (/^\/kiln\/(?:downloads|updates|stats)(?:\/|$)/.test(p)) return null;
  p = p.replace(/\/index\.html$/, '');
  const root = resolve(siteDir);
  for (const file of [join(p, 'index.html'), ...(p.endsWith('.html') ? [p] : [])]) {
    const target = resolve(root, `.${file}`);
    if (target.startsWith(root + sep) && isFile(target)) return p;
  }
  return null;
}

function isFile(path) {
  try { return !!statSync(path, { throwIfNoEntry: false })?.isFile(); }
  catch (error) { if (error.code === 'ENOTDIR') return false; throw error; }
}

/** Cloudflare's groups of one day -> rows [page, country, client, os, referrer, views]. Programs that are not a person
 *  (bots, scanners, old browser strings) keep their kind but not their system or referrer, so they take little room. */
export function reduceSiteGroups(groups, { newest, siteDir = '' } = {}) {
  const rows = new Map();
  const pages = new Map();
  let sampled = 1;
  for (const group of groups) {
    const d = group.dimensions || {};
    const path = d.clientRequestPath;
    if (!pages.has(path)) pages.set(path, pageOf(path, siteDir));
    const page = pages.get(path);
    if (!page) continue;
    const count = Number(group.count) || 0;
    sampled = Math.max(sampled, Number(group.avg?.sampleInterval) || 1);
    let { client, os } = 'userAgent' in d ? classifyAgent(d.userAgent, { verifiedBot: d.verifiedBotCategory, newest }) : { client: 'unknown', os: '' };
    let referrer = cleanReferrer(d.clientRefererHost);
    if (client !== 'browser') { os = ''; referrer = ''; }
    const country = /^[A-Z0-9]{2}$/.test(d.clientCountryName || '') ? d.clientCountryName : 'XX';
    const key = JSON.stringify([page, country, client, os, referrer]);
    rows.set(key, (rows.get(key) || 0) + count);
  }
  const list = [...rows].map(([key, views]) => [...JSON.parse(key), views]);
  list.sort((a, b) => (a.slice(0, 5).join('\u0001') < b.slice(0, 5).join('\u0001') ? -1 : 1));
  return { rows: list, sampled };
}

/** What the dashboard draws: the last `keep` days, names replaced by indexes. A row is
 *  [day, page, country, client, os, referrer, views]. */
export function buildSiteData(days, now, keep = KEEP_DAYS) {
  const data = { generated: new Date(now).toISOString(), host: HOST, days: [], pages: [], countries: [], clients: [], systems: [], referrers: [], rows: [], notes: [], alerts: [] };
  const maps = { pages: new Map(), countries: new Map(), clients: new Map(), systems: new Map(), referrers: new Map() };
  const index = (name, value) => {
    if (!maps[name].has(value)) { maps[name].set(value, data[name].length); data[name].push(value); }
    return maps[name].get(value);
  };
  let sampled = 1;
  let truncated = 0;
  const shown = days.filter((day) => dayStart(day.day) > now - keep * DAY);
  for (const day of shown) {
    for (let at = data.days.length ? dayStart(data.days.at(-1).day) + DAY : dayStart(day.day); at < dayStart(day.day); at += DAY) {
      data.days.push({ day: dayName(at), final: true, missing: true });
    }
    const d = data.days.length;
    data.days.push({ day: day.day, final: !!day.final });
    sampled = Math.max(sampled, day.sampled || 1);
    truncated += day.truncated || 0;
    for (const [page, country, client, os, referrer, views] of day.rows) {
      if (!(views > 0) || isGlaze(page)) continue;
      data.rows.push([d, index('pages', page), index('countries', country), index('clients', client),
        index('systems', client === 'browser' ? os : ''), index('referrers', client === 'browser' ? referrer : ''), views]);
    }
  }
  const missing = data.days.filter((day) => day.missing).length;
  if (missing) data.notes.push(`${missing} ${missing === 1 ? 'day was' : 'days were'} never collected (shown as empty).`);
  if (sampled > 1) data.notes.push(`Cloudflare counted some of these requests from a sample (as few as 1 in ${Math.ceil(sampled - 1e-9)}): those counts are estimates.`);
  if (truncated) data.notes.push('Some Cloudflare results reached the group limit. Page views for those periods may be undercounted.');
  return data;
}

function settings(env) {
  for (const name of ['DATA_DIR', 'OUT_DIR']) if (!env[name]) throw new Error(`${name} is not set`);
  return { dataDir: env.DATA_DIR, outDir: env.OUT_DIR, siteDir: env.SITE_DIR || '', newestFile: env.NEWEST_FILE || '' };
}

export function renderSite(env, now = Date.now()) {
  const s = settings(env);
  const data = buildSiteData(readDays(s.dataDir), now);
  const last = join(s.dataDir, 'last-run.json');
  if (existsSync(last)) {
    const run = JSON.parse(readFileSync(last, 'utf8'));
    data.collected = run.ok ? run.at : null;
    if (!run.ok) data.alerts.push(`The last collection (${run.at}) failed: ${run.error}. The numbers are from the collection before.`);
  }
  mkdirSync(s.outDir, { recursive: true });
  writeAtomic(join(s.outDir, 'site.json'), JSON.stringify(data));
  return data;
}

/** One collection: the last days from Cloudflare into DATA_DIR/days, then site.json. The age of a browser string is
 *  measured against Kiln's record of the newest browsers (NEWEST_FILE), so both count the same way. */
export async function collectSite(env, now = Date.now()) {
  const s = settings(env);
  if (!env.CF_API_TOKEN) throw new Error('CF_API_TOKEN is not set');
  mkdirSync(join(s.dataDir, 'days'), { recursive: true });
  const run = { at: new Date(now).toISOString(), ok: false };
  try {
    if (!s.siteDir || !isFile(join(s.siteDir, 'index.html'))) throw new Error('SITE_DIR does not contain the built site');
    const limits = await fetchLimits(env);
    const daysBack = Math.max(1, Number(env.DAYS_BACK) || 3);
    const wanted = daysToFetch(readDays(s.dataDir), now, daysBack, Math.min(limits.notOlderThan, KEEP_DAYS * DAY / 1000));
    const newest = s.newestFile && existsSync(s.newestFile) ? JSON.parse(readFileSync(s.newestFile, 'utf8')) : { chrome: 0, firefox: 0 };
    const state = { queries: 0, truncated: 0 };
    const days = [];
    for (const name of wanted) {
      const from = dayStart(name);
      const before = state.truncated;
      const groups = await fetchWindow(env, limits, new Date(from), new Date(Math.min(from + DAY, now)), state, SCOPE);
      const { rows, sampled } = reduceSiteGroups(groups, { newest, siteDir: s.siteDir });
      days.push({ day: name, fetched: run.at, final: now >= from + DAY + SETTLE, sampled, truncated: state.truncated > before, rows });
    }
    for (const day of days) writeAtomic(join(s.dataDir, 'days', `${day.day}.json`), JSON.stringify(day));
    Object.assign(run, { ok: true, days: wanted.length, queries: state.queries });
  } catch (error) {
    run.error = redactStatsError(error instanceof CloudflareError ? error.message : `${error.name}: ${error.message}`, env);
  }
  writeAtomic(join(s.dataDir, 'last-run.json'), JSON.stringify(run));
  renderSite(env, now);
  if (!run.ok) throw new Error(run.error);
  return run;
}
