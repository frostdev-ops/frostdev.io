// The public numbers others keep about Kiln and Glaze: GitHub (stars, open issues, release downloads), Nexus Mods
// (Kiln's downloads and endorsements), Firefox Add-ons (Glaze's daily users and weekly downloads) and the Chrome Web
// Store (Glaze's users). Anyone can read them on those sites; nothing here comes from Kiln's or Glaze's own programs.
// stats/collect.mjs asks once an hour and keeps the latest answer of each day in DATA_DIR/<day>.json, so the dashboard
// (/hq, docs/hq.md) can show how they change. A source that fails keeps its last answer and says why.
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dayName, writeAtomic } from './kiln-downloads.mjs';

export const SOURCES = {
  'github:glaze': { kind: 'github', repo: 'frostdev-ops/glaze', product: 'glaze' },
  'github:kiln': { kind: 'github', repo: 'frostdev-ops/kiln', product: 'kiln' },
  'nexus:kiln': { kind: 'nexus', game: 5811, mod: 301, product: 'kiln', page: 'https://www.nexusmods.com/enshrouded/mods/301' },
  'amo:glaze': { kind: 'amo', slug: 'glaze', product: 'glaze', page: 'https://addons.mozilla.org/en-US/firefox/addon/glaze/' },
  'cws:glaze': { kind: 'cws', id: 'jmmaeoajomodnbnlmdikjooalmcilooh', product: 'glaze', page: 'https://chromewebstore.google.com/detail/jmmaeoajomodnbnlmdikjooalmcilooh' },
};
/** How many days public.json holds. */
export const KEEP_DAYS = 400;
const AGENT = 'frostdev-stats (+https://frostdev.io)';

const get = async (fetcher, url, init = {}) => {
  const response = await fetcher(url, { ...init, headers: { 'user-agent': AGENT, ...init.headers }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return response;
};
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);

/** A release asset's kind, from its name: the files people download, not checksums or the update feed. */
export function assetKind(name) {
  const n = String(name).toLowerCase();
  if (/sha256|sums|\.sig$|appcast\.xml$/.test(n)) return null;
  if (n.endsWith('.dmg')) return 'mac';
  if (/safari.*\.zip$/.test(n)) return 'mac-zip';
  if (/firefox.*\.zip$/.test(n)) return 'firefox';
  if (n.endsWith('.mcpb')) return 'mcp';
  if (n.endsWith('.zip')) return 'chrome';
  if (/\.(exe|msi)$/.test(n)) return 'windows';
  if (/\.(appimage|deb|rpm)$/.test(n)) return 'linux';
  return 'other';
}

export async function github(source, { fetcher = fetch, token = '' } = {}) {
  const headers = { accept: 'application/vnd.github+json', ...(token && { authorization: `Bearer ${token}` }) };
  const repo = await (await get(fetcher, `https://api.github.com/repos/${source.repo}`, { headers })).json();
  const releases = [];
  for (let page = 1; page <= 3; page++) {
    const list = await (await get(fetcher, `https://api.github.com/repos/${source.repo}/releases?per_page=100&page=${page}`, { headers })).json();
    if (!Array.isArray(list)) throw new Error('GitHub answered something other than a list of releases');
    releases.push(...list);
    if (list.length < 100) break;
  }
  let downloads = 0;
  const shown = releases.filter((r) => !r.draft).map((r) => {
    const kinds = {};
    let total = 0;
    for (const asset of r.assets || []) {
      const kind = assetKind(asset.name);
      if (!kind) continue;
      const n = num(asset.download_count) || 0;
      kinds[kind] = (kinds[kind] || 0) + n;
      total += n;
    }
    downloads += total;
    return { tag: String(r.tag_name || '').slice(0, 40), published: r.published_at || null, prerelease: !!r.prerelease, downloads: total, kinds };
  });
  return {
    stars: num(repo.stargazers_count), forks: num(repo.forks_count), watchers: num(repo.subscribers_count),
    openIssues: num(repo.open_issues_count), pushed: repo.pushed_at || null, downloads, releases: shown.slice(0, 30),
  };
}

export async function nexus(source, { fetcher = fetch } = {}) {
  const query = `{ mods(filter:{gameId:[{value:"${source.game}"}], modId:[{value:"${source.mod}"}]}) { nodes { modId downloads endorsements version updatedAt } } }`;
  const body = await (await get(fetcher, 'https://api.nexusmods.com/v2/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) })).json();
  if (body?.errors?.length) throw new Error(`Nexus: ${String(body.errors[0].message).slice(0, 200)}`);
  const mod = body?.data?.mods?.nodes?.find((m) => Number(m.modId) === source.mod);
  if (!mod) throw new Error('Nexus knows no such mod');
  return { downloads: num(mod.downloads), endorsements: num(mod.endorsements), version: String(mod.version || '').slice(0, 40), updated: mod.updatedAt || null };
}

export async function amo(source, { fetcher = fetch } = {}) {
  const a = await (await get(fetcher, `https://addons.mozilla.org/api/v5/addons/addon/${source.slug}/`)).json();
  return { users: num(a.average_daily_users), weeklyDownloads: num(a.weekly_downloads), rating: num(a.ratings?.average), ratings: num(a.ratings?.count), version: String(a.current_version?.version || '').slice(0, 40) };
}

/** The Chrome Web Store has no API for this: the listing page says "N users" once, in its header. */
export function cwsUsers(html) {
  const m = /<\/a>\s*([\d,.]+)\+?\s*users?\s*</i.exec(html) || />\s*([\d,.]+)\+?\s*users?\s*</i.exec(html);
  if (!m) return null;
  return num(m[1].replace(/[,.]/g, ''));
}
export async function cws(source, { fetcher = fetch } = {}) {
  const html = await (await get(fetcher, `https://chromewebstore.google.com/detail/${source.id}?hl=en`, { headers: { 'accept-language': 'en-US,en;q=0.8' } })).text();
  const users = cwsUsers(html);
  if (users === null) throw new Error('the Chrome Web Store page no longer says how many users');
  return { users };
}

const ASK = { github, nexus, amo, cws };

/** One run: every source asked, today's file updated (a source that failed keeps today's earlier answer, or nothing). */
export async function collectPublic(env, now = Date.now(), { fetcher = fetch, sources = SOURCES } = {}) {
  if (!env.DATA_DIR || !env.OUT_DIR) throw new Error('DATA_DIR and OUT_DIR must be set');
  mkdirSync(env.DATA_DIR, { recursive: true });
  const day = dayName(now);
  const file = join(env.DATA_DIR, `${day}.json`);
  const today = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { day, sources: {} };
  const errors = {};
  await Promise.all(Object.entries(sources).map(async ([id, source]) => {
    try {
      today.sources[id] = { at: new Date(now).toISOString(), ...await ASK[source.kind](source, { fetcher, token: env.GITHUB_TOKEN || '' }) };
    } catch (error) {
      errors[id] = String(error.message || error).split(env.GITHUB_TOKEN || '\u0000').join('[token]').slice(0, 300);
    }
  }));
  today.errors = errors;
  writeAtomic(file, JSON.stringify(today));
  const data = renderPublic(env, now, sources);
  const failed = Object.keys(errors);
  return { ok: failed.length < Object.keys(sources).length, failed, data };
}

/** public.json: per source the latest answer and a daily history of its numbers. */
export function buildPublicData(days, now, sources = SOURCES) {
  const data = { generated: new Date(now).toISOString(), sources: {}, history: [], errors: {} };
  for (const [id, source] of Object.entries(sources)) data.sources[id] = { ...source, latest: null };
  for (const d of days.slice(-KEEP_DAYS)) {
    const point = { day: d.day };
    for (const [id, value] of Object.entries(d.sources || {})) {
      if (!data.sources[id]) continue;
      data.sources[id].latest = value;
      const { releases, ...flat } = value;
      point[id] = Object.fromEntries(Object.entries(flat).filter(([, v]) => typeof v === 'number'));
    }
    data.history.push(point);
  }
  data.errors = days.at(-1)?.errors || {};
  return data;
}

export function renderPublic(env, now = Date.now(), sources = SOURCES) {
  const days = existsSync(env.DATA_DIR) ? readdirSync(env.DATA_DIR).filter((n) => /^\d{4}-\d\d-\d\d\.json$/.test(n)).sort()
    .map((n) => JSON.parse(readFileSync(join(env.DATA_DIR, n), 'utf8'))) : [];
  const data = buildPublicData(days, now, sources);
  mkdirSync(env.OUT_DIR, { recursive: true });
  writeAtomic(join(env.OUT_DIR, 'public.json'), JSON.stringify(data));
  return data;
}
