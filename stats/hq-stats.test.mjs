// Tests of frostdev HQ's other numbers: the site's page views (stats/site-pages.mjs), the public numbers
// (stats/public-numbers.mjs) and the whole collection (stats/collect.mjs). Cloudflare is a stand-in on 127.0.0.1 and the
// other sites are a fake fetch: nothing leaves the machine.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildSiteData, collectSite, isGlaze, pageOf, reduceSiteGroups } from './site-pages.mjs';
import { assetKind, collectPublic, cwsUsers, SOURCES } from './public-numbers.mjs';
import { collectAll } from './collect.mjs';

const ZONE = '0123456789abcdef0123456789abcdef';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const at = (day, hour = 12) => Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00Z`);
const tmp = (t) => { const dir = mkdtempSync(join(tmpdir(), 'hq-stats-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir; };

/** Cloudflare's stand-in. An event: {at, host, path, type, status, agent, country, referrer, bytes}. A query counts the
 *  events its scope's filters match, grouped by the dimensions it asks for. */
async function cloudflare(t, events, { fail } = {}) {
  const state = { queries: [], fail };
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const { query } = JSON.parse(body);
      state.queries.push(query);
      const send = (value) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
      if (state.fail) return send({ data: null, errors: [{ message: state.fail }] });
      if (query.includes('settings')) return send({ data: { viewer: { zones: [{ settings: { httpRequestsAdaptiveGroups: { enabled: true, maxDuration: 2_592_000, maxPageSize: 10_000, notOlderThan: 2_678_400,
        availableFields: ['count', ...['clientRequestPath', 'clientCountryName', 'edgeResponseStatus', 'userAgent', 'verifiedBotCategory', 'clientRefererHost', 'requestSource', 'clientRequestHTTPMethodName'].map((n) => `dimensions_${n}`)] } } }] } } });
      const wanted = /dimensions \{ ([^}]+) \}/.exec(query)[1].trim().split(/\s+/);
      const from = Date.parse(/datetime_geq: "([^"]+)"/.exec(query)[1]), to = Date.parse(/datetime_lt: "([^"]+)"/.exec(query)[1]);
      const prefix = /clientRequestPath_like: "([^"%]*)%"/.exec(query)?.[1];
      const host = /clientRequestHTTPHost: "([^"]+)"/.exec(query)?.[1];
      const type = /edgeResponseContentTypeName: "([^"]+)"/.exec(query)?.[1];
      const status = /edgeResponseStatus: (\d+)/.exec(query)?.[1];
      const value = { clientRequestPath: 'path', clientCountryName: 'country', edgeResponseStatus: 'status', userAgent: 'agent', verifiedBotCategory: 'bot', clientRefererHost: 'referrer' };
      const groups = new Map();
      for (const e of events) {
        if (e.at < from || e.at >= to || (prefix !== undefined && !e.path.startsWith(prefix)) || (host && e.host !== host) || (type && e.type !== type) || (status && String(e.status) !== status)) continue;
        const dimensions = Object.fromEntries(wanted.map((name) => [name, e[value[name]] ?? '']));
        const key = JSON.stringify(dimensions);
        const group = groups.get(key) || { count: 0, sum: { edgeResponseBytes: 0 }, avg: { sampleInterval: 1 }, dimensions };
        group.count += 1; group.sum.edgeResponseBytes += e.bytes || 0;
        groups.set(key, group);
      }
      send({ data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [...groups.values()] }] } } });
    });
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  state.env = { CF_API: `http://127.0.0.1:${server.address().port}/graphql`, CF_API_TOKEN: 'secret-token-for-tests', CF_ZONE_ID: ZONE };
  return state;
}
const view = (day, path, extra = {}) => ({ at: at(day), host: 'frostdev.io', path, type: 'html', status: 200, agent: CHROME, country: 'US', referrer: '', ...extra });

/** A built site with a few pages, as the static site's build lays them out. */
function site(dir) {
  for (const page of ['', 'kiln', 'kiln/wiki/install', 'guides/rimeward-first-workspace', 'glaze', 'glaze/looks', 'guides/glaze-chrome', 'privacy']) {
    mkdirSync(join(dir, page), { recursive: true });
    writeFileSync(join(dir, page, 'index.html'), '<!doctype html>');
  }
  return dir;
}

test('only the public site\'s own pages count, and no path naming Glaze ever does', (t) => {
  const dir = site(join(tmp(t), 'site'));
  for (const [path, page] of [['/', '/'], ['/index.html', '/'], ['/kiln', '/kiln'], ['/kiln/', '/kiln'], ['/kiln/wiki/install', '/kiln/wiki/install'], ['/kiln/wiki/install/', '/kiln/wiki/install'],
    ['/kiln/downloads/0.2.0-dev.29/sdk/api/Kiln.Mods.html', '/kiln/downloads/*/sdk/api/'], ['/privacy', '/privacy']]) assert.equal(pageOf(path, dir), page, path);
  for (const path of ['/glaze', '/glaze/looks', '/Glaze/', '/gl%61ze', '/guides/glaze-chrome', '/guides/GLAZE-chrome', '/kiln/../glaze', '/login', '/dash', '/s/abc123token',
    '/kiln/missing', '/../etc/passwd', '/kiln/%2e%2e/glaze', 'kiln', '', null, `/${'a'.repeat(300)}`, '/kiln//wiki', '/%E0%A4%A']) assert.equal(pageOf(path, dir), null, String(path));
  assert.ok(isGlaze('/gl%61ze/looks')); assert.ok(isGlaze('/guides/glaze-agents')); assert.ok(!isGlaze('/kiln/wiki/glass'));
  // without a built site, the public sections are trusted by name; Glaze still never is
  assert.equal(pageOf('/guides/anything'), '/guides/anything'); assert.equal(pageOf('/glaze/looks'), null); assert.equal(pageOf('/login'), null);
});

test('a day of groups becomes rows; Glaze is not even counted as skipped, and programs keep no system or referrer', () => {
  const g = (path, count, d = {}) => ({ count, avg: { sampleInterval: 1 }, dimensions: { clientRequestPath: path, clientCountryName: 'DE', userAgent: CHROME, verifiedBotCategory: '', clientRefererHost: 'www.Google.com', ...d } });
  const { rows, skipped } = reduceSiteGroups([g('/kiln', 3), g('/kiln/', 2), g('/glaze', 50), g('/guides/glaze-chrome', 9), g('/login', 7),
    g('/kiln', 4, { userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)' }), g('/', 1, { clientCountryName: 'not a code' })], { newest: { chrome: 157, firefox: 160 } });
  assert.deepEqual(rows, [['/', 'XX', 'browser', 'windows', 'google.com', 1], ['/kiln', 'DE', 'bot', '', '', 4], ['/kiln', 'DE', 'browser', 'windows', 'google.com', 5]]);
  assert.deepEqual(skipped, { 'not a site page': 7 });
  assert.ok(!JSON.stringify({ rows, skipped }).toLowerCase().includes('glaze'));
});

test('site.json holds the last 120 days with the gaps filled, and nothing about Glaze', () => {
  const now = at('2026-11-18');
  const days = [{ day: '2026-06-01', final: true, rows: [['/kiln', 'US', 'browser', 'linux', '', 9]] },
    { day: '2026-11-15', final: true, rows: [['/kiln', 'US', 'browser', 'linux', '', 2], ['/glaze', 'US', 'browser', 'linux', '', 5]] },
    { day: '2026-11-17', final: false, rows: [['/', 'CA', 'bot', '', '', 3]] }];
  const data = buildSiteData(days, now);
  assert.deepEqual(data.days.map((d) => d.day), ['2026-11-15', '2026-11-16', '2026-11-17']);
  assert.equal(data.days[1].missing, true);
  assert.deepEqual(data.pages, ['/kiln', '/']);
  assert.deepEqual(data.rows, [[0, 0, 0, 0, 0, 0, 2], [2, 1, 1, 1, 1, 0, 3]]);
  assert.match(data.notes[0], /1 day was never collected/);
});

test('a site collection asks Cloudflare for frostdev.io\'s HTML pages only and stores no Glaze path, token or User-Agent', async (t) => {
  const dir = tmp(t), now = at('2026-11-13', 15);
  const cf = await cloudflare(t, [view('2026-11-13', '/kiln'), view('2026-11-13', '/glaze/looks'), view('2026-11-12', '/guides/glaze-chrome'),
    view('2026-11-13', '/kiln', { host: 'sim.frostdev.io' }), view('2026-11-13', '/kiln', { type: 'js' }), view('2026-11-13', '/kiln', { status: 404 }),
    view('2026-11-12', '/kiln/wiki/install', { referrer: 'www.nexusmods.com', country: 'DE' })]);
  const env = { ...cf.env, DATA_DIR: join(dir, 'site'), OUT_DIR: join(dir, 'out'), SITE_DIR: site(join(dir, 'built')) };
  const run = await collectSite(env, now);
  assert.equal(run.ok, true);
  const data = cf.queries.filter((q) => q.includes('httpRequestsAdaptiveGroups(limit'));
  assert.ok(data.length >= 1 && data.every((q) => q.includes('clientRequestHTTPHost: "frostdev.io"') && q.includes('edgeResponseContentTypeName: "html"') && q.includes('edgeResponseStatus: 200')));
  const stored = readdirSync(join(env.DATA_DIR, 'days')).map((n) => readFileSync(join(env.DATA_DIR, 'days', n), 'utf8')).join('\n');
  assert.ok(!/glaze/i.test(stored), 'no Glaze path in a day file'); assert.ok(!stored.includes('Mozilla'));
  const out = readFileSync(join(env.OUT_DIR, 'site.json'), 'utf8');
  assert.ok(!/glaze/i.test(out)); assert.ok(!out.includes('secret-token-for-tests'));
  const json = JSON.parse(out);
  assert.equal(json.rows.reduce((s, r) => s + r[6], 0), 2, 'the one /kiln view and the wiki page');
  assert.deepEqual(json.referrers.sort(), ['', 'nexusmods.com']);
  cf.fail = 'Authentication error for secret-token-for-tests';
  await assert.rejects(collectSite(env, now + 3_600_000), /\[token\]/);
  const after = JSON.parse(readFileSync(join(env.OUT_DIR, 'site.json'), 'utf8'));
  assert.match(after.alerts[0], /failed: Authentication error for \[token\]/); assert.equal(after.rows.length, json.rows.length);
});

/** A fake fetch for GitHub, Nexus, Firefox Add-ons and the Chrome Web Store. */
const fakeFetch = (over = {}) => async (url, init = {}) => {
  const u = new URL(url);
  const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
  if (over[u.host]) return over[u.host](u, init);
  if (u.host === 'api.github.com' && u.pathname.endsWith('/releases')) return json(u.searchParams.get('page') === '1' ? [
    { tag_name: 'v2', published_at: '2026-11-15T00:00:00Z', assets: [{ name: 'glaze-2-safari-macos.dmg', download_count: 4 }, { name: 'glaze-v2.zip', download_count: 3 }, { name: 'SHA256SUMS', download_count: 99 }, { name: 'glaze-2.dmg.sha256', download_count: 9 }] },
    { tag_name: 'v1', published_at: '2026-11-01T00:00:00Z', draft: true, assets: [{ name: 'x.zip', download_count: 50 }] },
  ] : []);
  if (u.host === 'api.github.com') return json({ stargazers_count: 6, forks_count: 2, subscribers_count: 1, open_issues_count: 17, pushed_at: '2026-11-18T00:00:00Z' });
  if (u.host === 'api.nexusmods.com') { assert.equal(init.method, 'POST'); return json({ data: { mods: { nodes: [{ modId: 301, downloads: 504, endorsements: 8, version: '0.2.0-dev.29.17', updatedAt: 'x' }] } } }); }
  if (u.host === 'addons.mozilla.org') return json({ average_daily_users: 1, weekly_downloads: 2, ratings: { average: 0, count: 0 }, current_version: { version: '4.0.9' } });
  if (u.host === 'chromewebstore.google.com') return new Response('<div><a href="/category">Functionality &amp; UI</a>1,232 users</div><div>Average rating 4.7 out of 5 stars.</div>');
  throw new Error(`unexpected ${url}`);
};

test('release assets are counted by kind, without checksums or the update feed; the store page says how many users', () => {
  assert.deepEqual(['glaze-4.0.9-safari-macos.dmg', 'glaze-4.0.9-safari-macos.zip', 'glaze-v4.0.9.zip', 'glaze-v4.0.9-firefox.zip', 'glaze-mcp-4.0.9.mcpb', 'SHA256SUMS', 'a.dmg.sha256', 'appcast.xml', 'x.sig', 'kiln_x64-setup.exe', 'kiln.AppImage', 'notes.txt'].map(assetKind),
    ['mac', 'mac-zip', 'chrome', 'firefox', 'mcp', null, null, null, null, 'windows', 'linux', 'other']);
  assert.equal(cwsUsers('<a>Productivity</a>32 users</div>'), 32);
  assert.equal(cwsUsers('<a>x</a> 10,000+ users <'), 10000);
  assert.equal(cwsUsers('<p>no count here</p>'), null);
});

test('the public numbers keep the latest answer of each day; a failing source keeps today\'s earlier one and says why', async (t) => {
  const dir = tmp(t), env = { DATA_DIR: join(dir, 'public'), OUT_DIR: join(dir, 'out'), GITHUB_TOKEN: 'gh-secret' };
  const now = at('2026-11-18', 10);
  const first = await collectPublic(env, now, { fetcher: fakeFetch() });
  assert.equal(first.ok, true); assert.deepEqual(first.failed, []);
  const pub = JSON.parse(readFileSync(join(env.OUT_DIR, 'public.json'), 'utf8'));
  const gh = pub.sources['github:glaze'].latest;
  assert.equal(gh.downloads, 7, 'the draft and the checksums are left out'); assert.deepEqual(gh.releases[0].kinds, { mac: 4, chrome: 3 });
  assert.equal(pub.sources['nexus:kiln'].latest.downloads, 504); assert.equal(pub.sources['cws:glaze'].latest.users, 1232); assert.equal(pub.sources['amo:glaze'].latest.users, 1);
  assert.deepEqual(pub.history.map((p) => p.day), ['2026-11-18']); assert.equal(pub.history[0]['nexus:kiln'].downloads, 504);
  // an hour later the store page changed and GitHub is down; the token never reaches a message
  const second = await collectPublic(env, now + 3_600_000, { fetcher: fakeFetch({
    'chromewebstore.google.com': () => new Response('<p>redesigned</p>'),
    'api.github.com': () => { throw new Error('connect refused for gh-secret'); },
  }) });
  assert.equal(second.ok, true); assert.deepEqual(second.failed.sort(), ['cws:glaze', 'github:glaze', 'github:kiln']);
  const later = JSON.parse(readFileSync(join(env.OUT_DIR, 'public.json'), 'utf8'));
  assert.equal(later.sources['cws:glaze'].latest.users, 1232, 'the earlier answer stays');
  assert.match(later.errors['cws:glaze'], /no longer says how many users/);
  assert.ok(!JSON.stringify(later).includes('gh-secret'));
  // the next day starts its own point
  await collectPublic(env, at('2026-11-19', 1), { fetcher: fakeFetch() });
  assert.deepEqual(JSON.parse(readFileSync(join(env.OUT_DIR, 'public.json'), 'utf8')).history.map((p) => p.day), ['2026-11-18', '2026-11-19']);
  const none = await collectPublic({ ...env, DATA_DIR: join(dir, 'p2') }, now, { fetcher: async () => { throw new Error('offline'); } });
  assert.equal(none.ok, false); assert.equal(none.failed.length, Object.keys(SOURCES).length);
});

test('the whole collection: each part on its own, status.json says which failed, and the token is in nothing written', async (t) => {
  const dir = tmp(t), now = at('2026-11-13', 15);
  const cf = await cloudflare(t, [view('2026-11-13', '/kiln'), { at: at('2026-11-13'), host: 'frostdev.io', path: '/kiln/downloads/0.2.0-dev.26/SHA256SUMS', type: 'text', status: 200, agent: 'curl/8.0', country: 'US', bytes: 10 }]);
  const env = { ...cf.env, DATA_DIR: join(dir, 'data'), OUT_DIR: join(dir, 'data', 'out'), SITE_DIR: site(join(dir, 'built')) };
  const status = await collectAll(env, now, { fetcher: fakeFetch() });
  assert.deepEqual(Object.fromEntries(Object.entries(status.parts).map(([k, v]) => [k, v.ok])), { kiln: true, site: true, public: true });
  assert.deepEqual(readdirSync(env.OUT_DIR).sort(), ['kiln.json', 'public.json', 'site.json', 'status.json']);
  assert.deepEqual(readdirSync(env.DATA_DIR).sort(), ['kiln', 'out', 'public', 'site']);
  assert.equal(JSON.parse(readFileSync(join(env.OUT_DIR, 'kiln.json'), 'utf8')).rows.length, 1);
  cf.fail = 'Authentication error for secret-token-for-tests';
  const failed = await collectAll(env, now + 3_600_000, { fetcher: fakeFetch() });
  assert.equal(failed.parts.kiln.ok, false); assert.equal(failed.parts.site.ok, false); assert.equal(failed.parts.public.ok, true);
  for (const name of readdirSync(env.OUT_DIR)) assert.ok(!readFileSync(join(env.OUT_DIR, name), 'utf8').includes('secret-token-for-tests'), name);
  assert.match(JSON.parse(readFileSync(join(env.OUT_DIR, 'status.json'), 'utf8')).parts.kiln.error, /\[token\]/);
  assert.ok(existsSync(join(env.DATA_DIR, 'kiln', 'newest-browsers.json')), 'the site reads the browsers Kiln measured');
});
