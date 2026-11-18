// Tests of frostdev HQ's other numbers. Requests to Cloudflare and other public sources use in-process fixtures.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildSiteData, collectSite, isGlaze, pageOf, reduceSiteGroups } from './site-pages.mjs';
import { assetKind, buildPublicData, collectPublic, cwsUsers, github, SOURCES } from './public-numbers.mjs';
import { collectAll } from './collect.mjs';

const ZONE = '0123456789abcdef0123456789abcdef';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const at = (day, hour = 12) => Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00Z`);
const tmp = (t) => { const dir = mkdtempSync(join(tmpdir(), 'hq-stats-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir; };

/** Cloudflare's stand-in. An event: {at, host, path, type, status, agent, country, referrer, bytes}. A query counts the
 *  events its scope's filters match, grouped by the dimensions it asks for. */
function cloudflare(t, events, { fail } = {}) {
  const state = { queries: [], fail };
  const url = 'https://cloudflare.invalid/graphql';
  t.mock.method(globalThis, 'fetch', async (endpoint, init) => {
    assert.equal(endpoint, url);
    const { query } = JSON.parse(init.body);
    state.queries.push(query);
    const send = (value) => Response.json(value);
    const failure = typeof state.fail === 'function' ? state.fail(query) : state.fail;
    if (failure) return send({ data: null, errors: [{ message: failure }] });
    if (query.includes('settings')) return send({ data: { viewer: { zones: [{ settings: { httpRequestsAdaptiveGroups: { enabled: true, maxDuration: 2_592_000, maxPageSize: 10_000, notOlderThan: 2_678_400,
      availableFields: ['count', ...['clientRequestPath', 'clientCountryName', 'edgeResponseStatus', 'userAgent', 'verifiedBotCategory', 'clientRefererHost', 'requestSource', 'clientRequestHTTPMethodName'].map((n) => `dimensions_${n}`)] } } }] } } });
    const wanted = /dimensions \{ ([^}]+) \}/.exec(query)[1].trim().split(/\s+/);
    const from = Date.parse(/datetime_geq: "([^"]+)"/.exec(query)[1]), to = Date.parse(/datetime_lt: "([^"]+)"/.exec(query)[1]);
    const prefix = /clientRequestPath_like: "([^"%]*)%"/.exec(query)?.[1];
    const host = /clientRequestHTTPHost: "([^"]+)"/.exec(query)?.[1];
    const type = /edgeResponseContentTypeName: "([^"]+)"/.exec(query)?.[1];
    const status = /edgeResponseStatus: (\d+)/.exec(query)?.[1];
    const method = /clientRequestHTTPMethodName: "([^"]+)"/.exec(query)?.[1];
    const source = /requestSource: "([^"]+)"/.exec(query)?.[1];
    const value = { clientRequestPath: 'path', clientCountryName: 'country', edgeResponseStatus: 'status', userAgent: 'agent', verifiedBotCategory: 'bot', clientRefererHost: 'referrer' };
    const groups = new Map();
    for (const e of events) {
      if (e.at < from || e.at >= to || (prefix !== undefined && !e.path.startsWith(prefix)) || (host && e.host !== host) || (type && e.type !== type) || (status && String(e.status) !== status)) continue;
      if ((method && (e.method || 'GET') !== method) || (source && (e.source || 'eyeball') !== source)) continue;
      const dimensions = Object.fromEntries(wanted.map((name) => [name, e[value[name]] ?? '']));
      const key = JSON.stringify(dimensions);
      const group = groups.get(key) || { count: 0, sum: { edgeResponseBytes: 0 }, avg: { sampleInterval: 1 }, dimensions };
      group.count += 1; group.sum.edgeResponseBytes += e.bytes || 0; group.avg.sampleInterval = Math.max(group.avg.sampleInterval, e.sample || 1);
      groups.set(key, group);
    }
    return send({ data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [...groups.values()] }] } } });
  });
  state.env = { CF_API: url, CF_API_TOKEN: 'secret-token-for-tests', CF_ZONE_ID: ZONE };
  return state;
}
const view = (day, path, extra = {}) => ({ at: at(day), host: 'frostdev.io', path, type: 'html', status: 200, agent: CHROME, country: 'US', referrer: '', ...extra });

/** A built site with a few pages, as the static site's build lays them out. */
function site(dir) {
  for (const page of ['', 'kiln', 'kiln/wiki/install', 'guides/rimeward-first-workspace', 'glaze', 'glaze/looks', 'guides/glaze-chrome', 'privacy', 's/abc123token', 'rimeward/settings']) {
    mkdirSync(join(dir, page), { recursive: true });
    writeFileSync(join(dir, page, 'index.html'), '<!doctype html>');
  }
  return dir;
}

test('only the public site\'s own pages count, and no path naming Glaze ever does', (t) => {
  const dir = site(join(tmp(t), 'site'));
  for (const [path, page] of [['/', '/'], ['/kiln', '/kiln'], ['/kiln/', '/kiln'], ['/kiln/wiki/install', '/kiln/wiki/install'], ['/kiln/wiki/install/', '/kiln/wiki/install'], ['/kiln/wiki/install/index.html', '/kiln/wiki/install'],
    ['/kiln/downloads/0.2.0-dev.29/sdk/api/Kiln.Mods.html', '/kiln/downloads/*/sdk/api/'], ['/privacy', '/privacy']]) assert.equal(pageOf(path, dir), page, path);
  for (const path of ['/glaze', '/glaze/looks', '/Glaze/', '/gl%61ze', '/guides/glaze-chrome', '/guides/GLAZE-chrome', '/kiln/../glaze', '/login', '/dash', '/s/abc123token',
    '/index.html', '/rimeward/settings', '/kiln/missing', '/kiln/%2e%2e/glaze', 'kiln', '', null, `/${'a'.repeat(300)}`, '/kiln//wiki', '/%E0%A4%A', '/kiln/downloads/1.0/sdk/api/%25bad']) assert.equal(pageOf(path, dir), null, String(path));
  assert.ok(isGlaze('/gl%61ze/looks')); assert.ok(isGlaze('/guides/glaze-agents')); assert.ok(!isGlaze('/kiln/wiki/glass'));
  assert.equal(pageOf('/guides/anything'), null); assert.equal(pageOf('/'), null); assert.equal(pageOf('/', join(dir, 'missing')), null);
});

test('only public pages affect saved rows or sampling, and only browsers keep a system or referrer', (t) => {
  const siteDir = site(join(tmp(t), 'site'));
  const g = (path, count, d = {}) => ({ count, avg: { sampleInterval: 1 }, dimensions: { clientRequestPath: path, clientCountryName: 'DE', userAgent: CHROME, verifiedBotCategory: '', clientRefererHost: 'www.Google.com', ...d } });
  const excluded = ['/glaze', '/gl%61ze', '/gl%2561ze', '/%xx/gl%61ze', '/guides/glaze-chrome', '/login', '/s/abc123token'];
  const result = reduceSiteGroups([g('/kiln', 3), g('/kiln/', 2), ...excluded.map((p) => ({ ...g(p, 50), avg: { sampleInterval: 91 } })),
    g('/kiln', 4, { userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)' }), g('/kiln', 2, { userAgent: 'curl/8.0 (Linux)' }),
    g('/', 1, { clientCountryName: 'not a code' })], { newest: { chrome: 157, firefox: 160 }, siteDir });
  const { rows } = result;
  assert.deepEqual(rows, [['/', 'XX', 'browser', 'windows', 'google.com', 1], ['/kiln', 'DE', 'bot', '', '', 4], ['/kiln', 'DE', 'browser', 'windows', 'google.com', 5], ['/kiln', 'DE', 'tool', '', '', 2]]);
  assert.deepEqual(result, { rows, sampled: 1 });
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
  const cf = cloudflare(t, [view('2026-11-13', '/kiln'), view('2026-11-13', '/glaze/looks', { sample: 39 }), view('2026-11-12', '/guides/glaze-chrome'),
    view('2026-11-13', '/s/abc123token'), view('2026-11-13', '/kiln', { method: 'POST' }), view('2026-11-13', '/kiln', { source: 'edgeWorkerFetch' }),
    view('2026-11-13', '/kiln', { host: 'sim.frostdev.io' }), view('2026-11-13', '/kiln', { type: 'js' }), view('2026-11-13', '/kiln', { status: 404 }),
    view('2026-11-12', '/kiln/wiki/install', { referrer: 'www.nexusmods.com', country: 'DE' })]);
  const env = { ...cf.env, DATA_DIR: join(dir, 'site'), OUT_DIR: join(dir, 'out'), SITE_DIR: site(join(dir, 'built')) };
  const run = await collectSite(env, now);
  assert.equal(run.ok, true);
  const data = cf.queries.filter((q) => q.includes('httpRequestsAdaptiveGroups(limit'));
  assert.ok(data.length >= 1 && data.every((q) => q.includes('clientRequestHTTPHost: "frostdev.io"') && q.includes('edgeResponseContentTypeName: "html"') && q.includes('edgeResponseStatus: 200') && q.includes('clientRequestHTTPMethodName: "GET"') && q.includes('requestSource: "eyeball"')));
  const stored = readdirSync(join(env.DATA_DIR, 'days')).map((n) => readFileSync(join(env.DATA_DIR, 'days', n), 'utf8')).join('\n');
  assert.doesNotMatch(stored, /glaze|abc123token|Mozilla|"skipped"|"sampled":39/i);
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

test('the site collector fails closed on a missing build or a refused GET filter and preserves the previous rows', async (t) => {
  const dir = tmp(t), now = at('2026-11-13', 15);
  const cf = cloudflare(t, [view('2026-11-13', '/kiln')]);
  const env = { ...cf.env, DATA_DIR: join(dir, 'site'), OUT_DIR: join(dir, 'out'), SITE_DIR: site(join(dir, 'built')) };
  await collectSite(env, now);
  const filename = join(env.DATA_DIR, 'days', '2026-11-13.json');
  const saved = readFileSync(filename, 'utf8');
  const queriesBefore = cf.queries.length;
  await assert.rejects(collectSite({ ...env, SITE_DIR: '' }, now), /SITE_DIR does not contain the built site/);
  assert.equal(cf.queries.length, queriesBefore);
  cf.fail = (query) => query.includes('clientRequestHTTPMethodName') && 'Unknown field "clientRequestHTTPMethodName"';
  await assert.rejects(collectSite(env, now), /Unknown field "clientRequestHTTPMethodName"/);
  assert.equal(cf.queries.length, queriesBefore + 2);
  assert.equal(readFileSync(filename, 'utf8'), saved);
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

test('GitHub totals include releases after the third page, and history limits leave old source answers available', async () => {
  const release = { tag_name: 'v1', assets: [{ name: 'sample.zip', download_count: 1 }] };
  const result = await github(SOURCES['github:glaze'], { fetcher: async (url) => {
    const page = Number(new URL(url).searchParams.get('page'));
    return Response.json(page ? Array.from({ length: page <= 3 ? 100 : 1 }, () => release) : {});
  } });
  assert.equal(result.downloads, 301);
  assert.equal(result.releases.length, 30);
  const past = { day: '2025-10-01', sources: { 'github:glaze': result } };
  const data = buildPublicData([past, ...Array.from({ length: 401 }, (_, i) => ({ day: new Date(at('2025-10-02') + i * 86400e3).toISOString().slice(0, 10) }))], at('2026-11-18', 10));
  assert.equal(data.history.length, 400);
  assert.equal(data.sources['github:glaze'].latest.downloads, 301);
});

test('the whole collection: each part on its own, status.json says which failed, and the token is in nothing written', async (t) => {
  const dir = tmp(t), now = at('2026-11-13', 15);
  const cf = cloudflare(t, [view('2026-11-13', '/kiln'), { at: at('2026-11-13'), host: 'frostdev.io', path: '/kiln/downloads/0.2.0-dev.26/SHA256SUMS', type: 'text', status: 200, agent: 'curl/8.0', country: 'US', bytes: 10 }]);
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

  // Redact before provider error messages are capped, even when a token straddles the cap.
  cf.fail = `Authentication ${'x'.repeat(575)} ${env.CF_API_TOKEN}`;
  const more = await collectAll({ ...env, GITHUB_TOKEN: 'github-secret' }, now, { fetcher: fakeFetch({
    'api.nexusmods.com': () => Response.json({ errors: [{ message: `${'x'.repeat(190)}${env.CF_API_TOKEN} github-secret` }] }),
  }) });
  assert.equal(more.parts.site.ok, false);
  const outputs = [join(env.DATA_DIR, 'site', 'last-run.json'), join(env.DATA_DIR, 'kiln', 'last-run.json'), join(env.DATA_DIR, 'public', '2026-11-13.json'),
    ...readdirSync(env.OUT_DIR).map((name) => join(env.OUT_DIR, name))];
  for (const file of outputs) assert.doesNotMatch(readFileSync(file, 'utf8'), /secret-token|github-secret/, file);
});
