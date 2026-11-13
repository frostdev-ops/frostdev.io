// Tests of the Kiln download statistics (stats/kiln-downloads.mjs) against a stand-in for Cloudflare's GraphQL API on
// 127.0.0.1: nothing leaves the machine and no token is involved.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildPageData, classifyAgent, cleanReferrer, collect, countedByBytes, daysToFetch, describeFile, fetchLimits,
  fetchWindow, fileKey, newestBrowsers, parsePath, readDays, reduceGroups, render, renderPage,
} from './kiln-downloads.mjs';

const ZONE = '0123456789abcdef0123456789abcdef';
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:160.0) Gecko/20100101 Firefox/160.0';
const UPDATER = 'tauri-plugin-updater/2.14.1';
const NEWEST = { chrome: 157, firefox: 160 };
const EXE = '/kiln/downloads/0.2.0-dev.26/windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe';
const EXE_SIZE = 4 * 1_048_576;

/** A stand-in for Cloudflare: `events` are single requests ({at, path, country, status, agent, bot, bytes}); a data
 *  query gets them grouped by the dimensions it asks for, most frequent first, at most `limit` groups. */
async function cloudflare(t, { events = [], fields, settings, fail } = {}) {
  const state = { queries: [], events, fail };
  const available = fields || ['clientRequestPath', 'clientCountryName', 'edgeResponseStatus', 'userAgent', 'verifiedBotCategory', 'requestSource', 'clientRequestHTTPMethodName'];
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const { query } = JSON.parse(body);
      state.queries.push(query);
      state.authorization = request.headers.authorization;
      const send = (value, status = 200) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
      if (state.fail) return send({ data: null, errors: [{ message: state.fail }] });
      if (query.includes('settings')) {
        if (settings === 'unknown') return send({ data: null, errors: [{ message: 'unknown field "settings"' }] });
        return send({ data: { viewer: { zones: [{ settings: { httpRequestsAdaptiveGroups: {
          enabled: true, maxDuration: 2_592_000, maxPageSize: state.pageSize || 10_000, notOlderThan: 2_678_400,
          availableFields: ['count', 'sum_edgeResponseBytes', ...available.map((name) => `dimensions_${name}`)] } } }] } } });
      }
      const wanted = /dimensions \{ ([^}]+) \}/.exec(query)[1].trim().split(/\s+/);
      const refused = wanted.find((name) => !available.includes(name));
      if (refused) return send({ data: null, errors: [{ message: `unknown field "${refused}" on dimensions` }] });
      const from = Date.parse(/datetime_geq: "([^"]+)"/.exec(query)[1]);
      const to = Date.parse(/datetime_lt: "([^"]+)"/.exec(query)[1]);
      const limit = Number(/limit: (\d+)/.exec(query)[1]);
      const value = { clientRequestPath: 'path', clientCountryName: 'country', edgeResponseStatus: 'status', userAgent: 'agent', verifiedBotCategory: 'bot' };
      const groups = new Map();
      for (const event of state.events) {
        if (event.at < from || event.at >= to || !event.path.startsWith('/kiln/downloads/')) continue;
        const dimensions = Object.fromEntries(wanted.map((name) => [name, event[value[name]] ?? '']));
        const key = JSON.stringify(dimensions);
        const group = groups.get(key) || { count: 0, sum: { edgeResponseBytes: 0 }, avg: { sampleInterval: 1 }, dimensions };
        group.count += 1;
        group.sum.edgeResponseBytes += event.bytes || 0;
        groups.set(key, group);
      }
      send({ data: { viewer: { zones: [{ httpRequestsAdaptiveGroups: [...groups.values()].sort((a, b) => b.count - a.count).slice(0, limit) }] } } });
    });
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  const dir = mkdtempSync(join(tmpdir(), 'kiln-stats-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  state.env = { CF_API: `http://127.0.0.1:${server.address().port}/graphql`, CF_API_TOKEN: 'secret-token-for-tests', CF_ZONE_ID: ZONE,
    DATA_DIR: join(dir, 'data'), OUT_DIR: join(dir, 'out'), FILES_DIR: join(dir, 'files') };
  state.dir = dir;
  return state;
}

const at = (day, hour = 12, minute = 0) => Date.parse(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
const hit = (day, extra = {}) => ({ at: at(day), path: EXE, country: 'US', status: 200, agent: CHROME, bot: '', bytes: EXE_SIZE, ...extra });

test('a path is a download only under a version folder, and never the API site, the feed index or a signature', () => {
  assert.deepEqual(parsePath(EXE), { version: '0.2.0-dev.26', file: 'windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe' });
  assert.deepEqual(parsePath('/kiln/downloads/0.2.0-dev.26/samples/hello%2D0.1.0.zip'), { version: '0.2.0-dev.26', file: 'samples/hello-0.1.0.zip' });
  assert.deepEqual(parsePath('/kiln/downloads/0.2.0-dev.26/sdk/feed/flatcontainer/kiln.api/0.2.0-dev.26/kiln.api.0.2.0-dev.26.nupkg')?.version, '0.2.0-dev.26');
  for (const path of [
    '/kiln/downloads/', '/kiln/downloads/0.2.0-dev.26', '/kiln/downloads/0.2.0-dev.26/', '/kiln/download/windows', '/glaze/x',
    '/kiln/downloads/0.2.0-dev.26/sdk/api/index.html', '/kiln/downloads/0.2.0-dev.26/sdk/feed/index.json',
    '/kiln/downloads/0.2.0-dev.26/windows/x.exe.sig', '/kiln/downloads/0.2.0-dev.26/updates/latest.json',
    '/kiln/downloads/../etc/passwd', '/kiln/downloads/0.2.0-dev.26/../../etc/passwd', '/kiln/downloads/0.2.0-dev.26/%2e%2e/%2e%2e/etc/passwd',
    '/kiln/downloads/0.2.0-dev.26/a//b', '/kiln/downloads/0.2.0-dev.26/a\\b', '/kiln/downloads/0.2.0-dev.26/%zz', '/kiln/downloads/a b/c', null,
  ]) assert.equal(parsePath(path), null, String(path));
});

test('the same file of two releases has one key, and every file has a group', () => {
  assert.equal(fileKey('0.2.0-dev.26', 'windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe'), 'windows/kiln-launcher_*_x64-setup.exe');
  assert.equal(fileKey('0.2.0-dev.25', 'windows/kiln-launcher_0.2.0-dev.25_x64-setup.exe'), 'windows/kiln-launcher_*_x64-setup.exe');
  assert.deepEqual(describeFile('windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe'), { re: describeFile('windows/a-setup.exe').re, kind: 'launcher', label: 'Windows installer' });
  assert.equal(describeFile('linux/kiln-launcher_0.2.0-dev.26_amd64.AppImage').label, 'Linux AppImage');
  assert.equal(describeFile('runtime/kiln-server-0.2.0-dev.26.zip').kind, 'server');
  assert.equal(describeFile('runtime/kiln-runtime-0.2.0-dev.26.zip').kind, 'runtime');
  assert.deepEqual(describeFile('runtime/kilnctl.exe'), { kind: 'server', label: 'kilnctl.exe' });
  assert.deepEqual(describeFile('samples/hello-0.1.0.zip'), { kind: 'samples', label: 'hello-0.1.0.zip' });
  assert.equal(describeFile('sdk/feed/flatcontainer/kiln.api/1/kiln.api.1.nupkg').label, 'kiln.api.1.nupkg (NuGet feed)');
  assert.deepEqual(describeFile('SHA256SUMS'), { kind: 'notes', label: 'SHA256SUMS' });
});

test('a User-Agent becomes a kind of program, and a browser string no person runs today is "automated"', () => {
  const kind = (agent, verifiedBot = '') => classifyAgent(agent, { verifiedBot, newest: NEWEST }).client;
  assert.deepEqual(classifyAgent(CHROME, { newest: NEWEST }), { client: 'browser', os: 'windows' });
  assert.deepEqual(classifyAgent(FIREFOX, { newest: NEWEST }), { client: 'browser', os: 'linux' });
  assert.deepEqual(classifyAgent(UPDATER), { client: 'launcher', os: '' });
  for (const [agent, expected] of [
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0', 'browser'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/31.0 Chrome/151.0.0.0 Safari/537.36', 'browser'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', 'browser'],
    ['Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', 'browser'],
    ['Mozilla/5.0 (Linux; Android 13; Pixel 4a Build/TQ2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/150.0.7000.99 Mobile Safari/537.36', 'browser'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0', 'browser'],  // an ESR, 32 versions back
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', 'browser'],
    // years behind
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36', 'automated'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36', 'automated'],
    ['Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1', 'automated'],
    // a build number desktop Chrome has not sent since 101
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7000.60 Safari/537.36', 'automated'],
    ['Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)', 'automated'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1', 'browser'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1', 'automated'],
    ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', 'bot'],
    ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.4; +https://openai.com/gptbot)', 'bot'],
    ['Mozilla/5.0 (compatible; ElevenlabsCrawler/1.0; +https://elevenlabs.io/docs/bots)', 'bot'],
    ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 AppEngine-Google; (+http://code.google.com/appengine)', 'bot'],
    ['curl/8.23.0', 'tool'], ['Wget/1.21.4', 'tool'], ['NuGet Client V3/7.9.0 (Microsoft Windows 10.0.26100)', 'tool'],
    ['NuGet .NET Core MSBuild Task/7.9.0 (Ubuntu 24.04)', 'tool'], ['Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100', 'tool'],
    ['kiln-launcher/0.2.0-dev.26', 'launcher'],
    ['win10chrome117', 'other'], ['Opera/9.80 (Windows NT 6.1; Win64; x64) Presto/2.12.388 Version/12.15', 'other'], ['', 'other'], [undefined, 'other'],
  ]) assert.equal(kind(agent), expected, String(agent));
  assert.equal(kind(CHROME, 'AI Crawler'), 'bot', 'what Cloudflare verified as a bot is one, whatever it calls itself');
  assert.equal(classifyAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.0.0 Safari/537.36').client, 'browser',
    'without a newest version to measure against, an old version alone decides nothing');
});

test('the newest browser is one at least three requests name, and never falls', () => {
  const group = (agent, count) => ({ count, dimensions: { userAgent: agent } });
  const groups = [group(CHROME, 5), group(CHROME.replace('157', '999'), 2), group(FIREFOX, 3), group('curl/8', 50)];
  assert.deepEqual(newestBrowsers(groups), { chrome: 157, firefox: 160 });
  assert.deepEqual(newestBrowsers([group(UPDATER, 9)]), { chrome: 0, firefox: 0 });
  assert.deepEqual(newestBrowsers([], { chrome: 150, firefox: 0 }), { chrome: 150, firefox: 0 });
  assert.deepEqual(newestBrowsers([group(CHROME.replace('157', '140'), 9)], { chrome: 157, firefox: 160 }), { chrome: 157, firefox: 160 });
});

test('a referring host is kept lower case without www., and nothing else gets through', () => {
  assert.equal(cleanReferrer('WWW.NexusMods.com'), 'nexusmods.com');
  assert.equal(cleanReferrer('frostdev.io'), 'frostdev.io');
  for (const bad of ['', 'a b', 'x/y', '<script>', 'a'.repeat(81), null]) assert.equal(cleanReferrer(bad), '');
});

test('the plan\'s limits are read from Cloudflare\'s own field list', async (t) => {
  const cf = await cloudflare(t);
  const limits = await fetchLimits(cf.env);
  assert.deepEqual(limits, { maxDuration: 2_592_000, maxPageSize: 10_000, notOlderThan: 2_678_400,
    fields: ['clientRequestPath', 'clientCountryName', 'edgeResponseStatus', 'userAgent', 'verifiedBotCategory'],
    filters: ['requestSource', 'clientRequestHTTPMethodName'] });
  assert.equal(cf.authorization, 'Bearer secret-token-for-tests');
  assert.match(cf.queries[0], new RegExp(`zoneTag: "${ZONE}"`));

  const bare = await cloudflare(t, { fields: ['clientRequestPath', 'clientCountryName', 'edgeResponseStatus'] });
  const bareLimits = await fetchLimits(bare.env);
  assert.deepEqual(bareLimits.fields, ['clientRequestPath', 'clientCountryName', 'edgeResponseStatus']);
  assert.deepEqual(bareLimits.filters, []);

  const without = await cloudflare(t, { fields: ['clientRequestPath', 'edgeResponseStatus'] });
  await assert.rejects(fetchLimits(without.env), /does not offer clientCountryName/);

  const unknown = await cloudflare(t, { settings: 'unknown' });
  assert.match((await fetchLimits(unknown.env)).note, /limits unknown/);

  const denied = await cloudflare(t, { fail: 'not authorized for that account' });
  await assert.rejects(fetchLimits(denied.env), /not authorized/);
  await assert.rejects(fetchLimits({ ...cf.env, CF_ZONE_ID: 'frostdev.io' }), /not a zone id/);
});

test('a window that fills a page is asked again in halves, so no group is cut off', async (t) => {
  // 40 countries in one day, a page of 16 groups
  const countries = Array.from({ length: 40 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));
  const events = countries.map((country, i) => hit('2026-11-10', { at: at('2026-11-10', Math.floor(i * 24 / 40), 30), country }));
  const cf = await cloudflare(t, { events });
  const limits = { ...(await fetchLimits(cf.env)), maxPageSize: 16 };
  const state = { queries: 0, truncated: 0 };
  const groups = await fetchWindow(cf.env, limits, new Date(at('2026-11-10', 0)), new Date(at('2026-11-11', 0)), state);
  assert.equal(groups.reduce((sum, group) => sum + group.count, 0), 40);
  assert.equal(new Set(groups.map((group) => group.dimensions.clientCountryName)).size, 40);
  assert(state.queries > 1 && state.truncated === 0, JSON.stringify(state));
});

test('a minute with more groups than a page holds is reported, and the halving ends', async (t) => {
  const start = at('2026-11-10', 8);
  const events = [['AA', 10], ['BB', 70], ['CC', 80]].map(([country, second]) => hit('2026-11-10', { at: start + second * 1000, country }));
  const cf = await cloudflare(t, { events });
  const limits = { ...(await fetchLimits(cf.env)), maxPageSize: 2 };
  const state = { queries: 0, truncated: 0 };
  // 90 seconds, three groups, two to a page: [0, 60) has one, [60, 90) has two and cannot be halved further
  const groups = await fetchWindow(cf.env, limits, new Date(start), new Date(start + 90_000), state);
  assert.equal(groups.length, 3);
  assert.deepEqual(state, { queries: 3, truncated: 1 });
});

test('a dimension Cloudflare refuses is left out and the question asked again', async (t) => {
  const cf = await cloudflare(t, { events: [hit('2026-11-10')], fields: ['clientRequestPath', 'clientCountryName', 'edgeResponseStatus', 'userAgent', 'requestSource', 'clientRequestHTTPMethodName'] });
  const limits = { maxDuration: 86_400, maxPageSize: 100, notOlderThan: 2_678_400, fields: ['clientRequestPath', 'clientCountryName', 'edgeResponseStatus', 'userAgent', 'verifiedBotCategory'], filters: [] };
  const groups = await fetchWindow(cf.env, limits, new Date(at('2026-11-10', 0)), new Date(at('2026-11-11', 0)));
  assert.equal(groups.length, 1);
  assert.deepEqual(limits.dropped, ['verifiedBotCategory']);
  assert(!limits.fields.includes('verifiedBotCategory'));
});

test('groups become rows: only full and partial answers of downloads, by kind of program', () => {
  const group = (dimensions, count, bytes) => ({ count, sum: { edgeResponseBytes: bytes }, avg: { sampleInterval: 1 }, dimensions: { clientRequestPath: EXE, clientCountryName: 'DE', edgeResponseStatus: 200, userAgent: CHROME, verifiedBotCategory: '', ...dimensions } });
  const { rows, skipped, sampled } = reduceGroups([
    group({}, 2, 2 * EXE_SIZE),
    group({ userAgent: CHROME.replace('157.0.0.0', '156.0.0.0') }, 1, EXE_SIZE),  // another browser: the same row
    group({ edgeResponseStatus: 206 }, 5, EXE_SIZE),
    group({ userAgent: UPDATER, clientCountryName: 'US' }, 3, 3 * EXE_SIZE),
    group({ userAgent: CHROME, verifiedBotCategory: 'AI Crawler' }, 4, 100),
    group({ edgeResponseStatus: 404 }, 7, 0),
    group({ edgeResponseStatus: 304 }, 2, 0),
    group({ clientRequestPath: '/kiln/downloads/0.2.0-dev.26/sdk/api/index.html' }, 9, 900),
    group({ clientCountryName: '' }, 1, 10),
  ], NEWEST);
  const v = '0.2.0-dev.26', f = 'windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe';
  assert.deepEqual(rows, [
    [v, f, 'DE', 200, 'bot', 'windows', '', 4, 100],
    [v, f, 'DE', 200, 'browser', 'windows', '', 3, 3 * EXE_SIZE],
    [v, f, 'DE', 206, 'browser', 'windows', '', 5, EXE_SIZE],
    [v, f, 'US', 200, 'launcher', 'windows', '', 3, 3 * EXE_SIZE],   // the updater names no system: the file does
    [v, f, 'XX', 200, 'browser', 'windows', '', 1, 10],
  ]);
  assert.deepEqual(skipped, { 'status 404': 7, 'status 304': 2, 'not a download': 9 });
  assert.equal(sampled, 1);
  assert.equal(reduceGroups([{ ...group({}, 1, 1), avg: { sampleInterval: 4 } }], NEWEST).sampled, 4);
  assert.equal(reduceGroups([{ count: 1, sum: { edgeResponseBytes: 1 }, dimensions: { clientRequestPath: EXE, clientCountryName: 'US', edgeResponseStatus: 200 } }]).rows[0][4], 'unknown');
});

test('a run asks for the last days and for every day Cloudflare still has that is not final', () => {
  const now = at('2026-11-13', 15);
  const all = daysToFetch([], now, 3, 2_678_400);
  assert.equal(all.at(-1), '2026-11-13');
  assert.equal(all[0], '2026-10-14');  // 31 days back from 15:00 is 10-13 15:00: the first whole day is 10-14
  assert.equal(all.length, 31);
  const stored = all.map((day) => ({ day, final: day < '2026-11-13' }));
  assert.deepEqual(daysToFetch(stored, now, 3, 2_678_400), ['2026-11-11', '2026-11-12', '2026-11-13']);
  stored.find((day) => day.day === '2026-10-20').final = false;
  assert.deepEqual(daysToFetch(stored, now, 1, 2_678_400), ['2026-10-20', '2026-11-13']);
});

test('downloads are counted from the bytes of big files and from full answers of small and text files', () => {
  assert.equal(countedByBytes('windows/x-setup.exe', EXE_SIZE), true);
  assert.equal(countedByBytes('runtime/kiln@.service', 1348), false);
  assert.equal(countedByBytes('THIRD-PARTY-NOTICES.txt', 2_784_856), false, 'Cloudflare compresses text: its bytes are not the file\'s');
  assert.equal(countedByBytes('gone.zip', 0), false);
  const v = '0.2.0-dev.26', f = 'windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe';
  const day = (name, rows, extra = {}) => ({ day: name, final: true, sampled: 1, truncated: 0, dropped: [], rows, ...extra });
  const data = buildPageData([
    day('2026-11-11', [
      [v, f, 'DE', 200, 'browser', 'windows', '', 3, 2.5 * EXE_SIZE],   // one of the three was given up half way
      [v, f, 'DE', 206, 'browser', 'windows', '', 8, 0.5 * EXE_SIZE],   // and finished in eight parts
      [v, f, 'US', 200, 'launcher', '', '', 2, 2 * EXE_SIZE],
      [v, 'RELEASE-NOTES.md', 'US', 200, 'browser', 'mac', 'github.com', 4, 9000],
      [v, 'RELEASE-NOTES.md', 'US', 206, 'browser', 'mac', 'github.com', 1, 100],
      [v, 'samples/removed-1.0.0.zip', 'US', 200, 'tool', '', '', 2, 5_000_000],  // no size known: full answers
    ]),
    day('2026-11-12', [[v, f, 'DE', 200, 'browser', 'windows', '', 1, EXE_SIZE]], { final: false, sampled: 2.4 }),
  ], { [`${v}/${f}`]: EXE_SIZE, [`${v}/RELEASE-NOTES.md`]: 23084 }, at('2026-11-12', 9));
  assert.deepEqual(data.days, [{ day: '2026-11-11', final: true }, { day: '2026-11-12', final: false }]);
  assert.deepEqual(data.files.map((file) => [file.file, file.key, file.kind, file.label, file.size, file.byBytes]), [
    [f, 'windows/kiln-launcher_*_x64-setup.exe', 'launcher', 'Windows installer', EXE_SIZE, true],
    ['RELEASE-NOTES.md', 'RELEASE-NOTES.md', 'notes', 'RELEASE-NOTES.md', 23084, false],
    ['samples/removed-1.0.0.zip', 'samples/removed-1.0.0.zip', 'samples', 'removed-1.0.0.zip', null, false],
  ]);
  assert.deepEqual(data.countries, ['DE', 'US']);
  assert.deepEqual(data.clients, ['browser', 'launcher', 'tool']);
  assert.deepEqual(data.referrers, ['', 'github.com']);
  // [day, file, country, client, system, referrer, downloads, requests]
  assert.deepEqual(data.rows, [
    [0, 0, 0, 0, 0, 0, 3, 3],      // 2.5 + 0.5 files arrived: three downloads, three full answers
    [0, 0, 1, 1, 1, 0, 2, 2],
    [0, 1, 1, 0, 2, 1, 4, 4],      // a text file: its four full answers; the partial one adds nothing
    [0, 2, 1, 2, 1, 0, 2, 2],
    [1, 0, 0, 0, 0, 0, 1, 1],
  ]);
  assert.deepEqual(data.notes, ['Cloudflare counted some of these requests from a sample (as few as 1 in 3): those counts are estimates.']);
  assert.deepEqual(data.alerts, []);
});

test('the page holds the data and no file name can break out of its script element', () => {
  const page = renderPage('<script id="d" type="application/json">/*KILN-STATS-DATA*/null</script>', { files: [{ file: '</script><script>alert(1)</script>', note: '$& $1 \u2028' }] });
  assert(!page.includes('</script><script>'), page);
  assert.equal(page.split('</script>').length, 2);
  const data = JSON.parse(/<script id="d" type="application\/json">(.*)<\/script>/s.exec(page)[1]);
  assert.equal(data.files[0].file, '</script><script>alert(1)</script>');
  assert.equal(data.files[0].note, '$& $1 \u2028');
  assert.throws(() => renderPage('<p>no marker</p>', {}), /no data marker/);
});

test('a collection stores one file per day, writes the page, and a second run changes nothing', async (t) => {
  const now = at('2026-11-13', 15);
  const events = [
    hit('2026-11-13'), hit('2026-11-13', { agent: UPDATER, country: 'CA' }), hit('2026-11-13', { status: 404, path: '/kiln/downloads/nope/x.zip', bytes: 0 }),
    hit('2026-11-12', { country: 'DE' }), hit('2026-11-12', { country: 'DE', status: 206, bytes: 100 }),
    hit('2026-11-01', { agent: 'curl/8.23.0', path: '/kiln/downloads/0.2.0-dev.26/SHA256SUMS', bytes: 500 }),
    hit('2026-10-01'),  // older than Cloudflare keeps: never asked for
    ...[1, 2, 3].map(() => hit('2026-11-12', { agent: CHROME.replace('157.0.0.0', '114.0.0.0'), country: 'CN', bytes: 1000 })),
    ...[1, 2].map(() => hit('2026-11-12', { agent: CHROME, country: 'FR' })),
  ];
  const cf = await cloudflare(t, { events });
  mkdirSync(join(cf.env.FILES_DIR, '0.2.0-dev.26', 'windows'), { recursive: true });
  writeFileSync(join(cf.env.FILES_DIR, '0.2.0-dev.26', 'windows', 'kiln-launcher_0.2.0-dev.26_x64-setup.exe'), Buffer.alloc(EXE_SIZE));
  writeFileSync(join(cf.env.FILES_DIR, '0.2.0-dev.26', 'SHA256SUMS'), 'x'.repeat(500));

  const run = await collect(cf.env, now);
  assert.equal(run.ok, true);
  assert.equal(run.days, 31);
  const days = readDays(cf.env.DATA_DIR);
  assert.equal(days.length, 31);
  assert.equal(days[0].day, '2026-10-14');
  const day = (name) => days.find((d) => d.day === name);
  assert.equal(day('2026-11-13').final, false);
  assert.equal(day('2026-11-12').final, true);   // ended 15 hours ago
  assert.equal(day('2026-11-01').final, true);
  const v = '0.2.0-dev.26', f = 'windows/kiln-launcher_0.2.0-dev.26_x64-setup.exe';
  assert.deepEqual(day('2026-11-13').rows, [[v, f, 'CA', 200, 'launcher', 'windows', '', 1, EXE_SIZE], [v, f, 'US', 200, 'browser', 'windows', '', 1, EXE_SIZE]]);
  assert.deepEqual(day('2026-11-13').skipped, { 'status 404': 1 });
  assert.deepEqual(day('2026-11-12').rows.map((row) => [row[2], row[3], row[4], row[7]]), [['CN', 200, 'automated', 3], ['DE', 200, 'browser', 1], ['DE', 206, 'browser', 1], ['FR', 200, 'browser', 2]]);
  assert.deepEqual(day('2026-11-01').rows, [[v, 'SHA256SUMS', 'US', 200, 'tool', '', '', 1, 500]]);
  assert.deepEqual(JSON.parse(readFileSync(join(cf.env.DATA_DIR, 'newest-browsers.json'), 'utf8')), { chrome: 157, firefox: 0 });
  assert.deepEqual(JSON.parse(readFileSync(join(cf.env.DATA_DIR, 'sizes.json'), 'utf8')), { [`${v}/SHA256SUMS`]: 500, [`${v}/${f}`]: EXE_SIZE });

  const page = readFileSync(join(cf.env.OUT_DIR, 'index.html'), 'utf8');
  // the page loads its own stylesheet and script and has nothing inline that runs: the server's policy refuses that
  for (const name of ['page.css', 'page.js']) assert.equal(readFileSync(join(cf.env.OUT_DIR, name), 'utf8'), readFileSync(new URL(name, import.meta.url), 'utf8'));
  assert.match(page, /<link rel="stylesheet" href="page\.css">/);
  assert.match(page, /<script src="page\.js" defer><\/script>/);
  assert.deepEqual([...page.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)].map((m) => m[0]), ['<script id="kiln-stats-data" type="application/json">']);
  assert(!/<style|\sstyle=|\son[a-z]+=/i.test(page), 'no inline style or event handler');
  assert(!/setAttribute\('style'|style: `|innerHTML|insertAdjacentHTML|document\.write/.test(readFileSync(new URL('page.js', import.meta.url), 'utf8')), 'the script sets no style attribute and builds no markup from text');
  assert(!page.includes('secret-token-for-tests') && !page.includes(ZONE), 'neither the token nor the zone id is in the page');
  assert(!page.includes('Chrome/157'), 'no User-Agent string is in the page');
  const data = JSON.parse(/<script id="kiln-stats-data" type="application\/json">(.*?)<\/script>/s.exec(page)[1]);
  assert.equal(data.days.length, 31);
  assert.equal(data.collected, new Date(now).toISOString());
  const total = data.rows.reduce((sum, row) => sum + row[6], 0);
  assert.equal(Math.round(total * 100) / 100, 6, 'six downloads: 2 on the 13th, 1 + 2 browsers on the 12th (three automated answers of 1000 bytes add 0), SHA256SUMS');
  assert(!JSON.stringify(readDays(cf.env.DATA_DIR)).includes('Mozilla'), 'no User-Agent string is stored');

  // the next hour: only the last three days are asked again, and nothing changes
  const before = JSON.stringify(readDays(cf.env.DATA_DIR).map((d) => d.rows));
  cf.queries.length = 0;
  const again = await collect(cf.env, now + 3_600_000);
  assert.equal(again.days, 3);
  assert.equal(cf.queries.length, 4);  // the limits and three days
  assert.equal(JSON.stringify(readDays(cf.env.DATA_DIR).map((d) => d.rows)), before);
  // a release that is removed keeps its sizes
  rmSync(cf.env.FILES_DIR, { recursive: true });
  assert.equal(render(cf.env, now).files.find((file) => file.file === f).size, EXE_SIZE);
});

test('when Cloudflare refuses, the stored days stay and the page says so', async (t) => {
  const now = at('2026-11-13', 15);
  const cf = await cloudflare(t, { events: [hit('2026-11-13')] });
  await collect(cf.env, now);
  const before = JSON.stringify(readDays(cf.env.DATA_DIR));
  cf.fail = 'Authentication error';
  await assert.rejects(collect(cf.env, now + 3_600_000), /Authentication error/);
  assert.equal(JSON.stringify(readDays(cf.env.DATA_DIR)), before);
  const page = readFileSync(join(cf.env.OUT_DIR, 'index.html'), 'utf8');
  const data = JSON.parse(/<script id="kiln-stats-data" type="application\/json">(.*?)<\/script>/s.exec(page)[1]);
  assert.match(data.alerts[0], /The last collection \(2026-11-13T16:00:00.000Z\) failed: Authentication error/);
  assert.equal(data.collected, null);
  assert.equal(data.rows.length, 1);
  assert(!page.includes('secret-token-for-tests'));

  const empty = await cloudflare(t);
  await assert.rejects(collect({ ...empty.env, CF_API_TOKEN: '' }, now), /CF_API_TOKEN is not set/);
  assert.equal(existsSync(join(empty.env.OUT_DIR, 'index.html')), false);
  await assert.rejects(collect({ ...empty.env, CF_API: 'http://127.0.0.1:9/' }, now), /could not be reached/);
});
