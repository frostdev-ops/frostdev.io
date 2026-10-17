// Local HTTP Google fake and real gallery/SQLite/bundle reader. No credentials or external services.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, before, test } from 'node:test';
import vm from 'node:vm';
import { gallery, fromEnv, modFacts } from './gallery.mjs';
import { adminFileType } from './gallery-admin.mjs';
import { checkCode, describe } from '../scripts/looks.mjs';

const ORIGIN = 'https://frostdev.io', ROOT = '/glaze/admin';
const CLIENT = 'fake-client', SECRET = 'fake-secret', EMAIL = 'owner@example.edu';
const tmp = mkdtempSync(path.join(os.tmpdir(), 'gallery-admin-test-'));
const MB = createRequire(import.meta.url)('../vendor/glaze/lib/modbundle.js');
const MEDIA = createRequire(import.meta.url)('../vendor/glaze/lib/media.js');
const te = new TextEncoder();
const KEY = await MB.makeKey();
const curated = JSON.parse(readFileSync(`src/data/looks/${readdirSync('src/data/looks').find((f) => f.endsWith('.json'))}`, 'utf8'));
const described = describe((await checkCode(curated.code)).look);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3u8AAAAASUVORK5CYII=', 'base64');
const HOSTILE = '<img src=x onerror="alert(1)"></script><script>alert(2)</script>';
const codes = new Map(), exchanges = [];
let g, base, clock, dir, googleBase, seq = 0, flowSeq = 0;
const sha = (v) => crypto.createHash('sha256').update(v).digest('base64url');
const token = (claims, header = { alg: 'RS256', typ: 'JWT' }) => [header, claims].map((v) => Buffer.from(JSON.stringify(v)).toString('base64url')).concat('signature-from-trusted-token-endpoint').join('.');
const google = http.createServer((req, res) => {
  let body = '';
  req.on('data', (b) => { body += b; });
  req.on('end', () => {
    const args = Object.fromEntries(new URLSearchParams(body)); exchanges.push(args);
    const expected = codes.get(args.code); codes.delete(args.code);
    if (!expected || args.client_id !== CLIENT || args.client_secret !== SECRET || args.redirect_uri !== `${ORIGIN}${ROOT}/callback`
      || args.grant_type !== 'authorization_code' || sha(args.code_verifier || '') !== expected.challenge) {
      res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{}');
    }
    res.writeHead(expected.status || 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id_token: expected.token || token({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '1234', exp: clock / 1000 + 3600,
      iat: clock / 1000, nonce: expected.nonce, email: EMAIL, email_verified: true, ...expected.claims }) }));
  });
});
before(async () => { await new Promise((r) => google.listen(0, '127.0.0.1', r)); googleBase = `http://127.0.0.1:${google.address().port}`; });
after(() => { google.closeAllConnections(); google.close(); rmSync(tmp, { recursive: true, force: true }); });
afterEach(async () => { await g?.close(); g = null; });
const options = (over = {}) => ({ db: path.join(dir, 'gallery.db'), now: () => clock, ipHeader: 'x-real-ip',
  googleClientId: CLIENT, googleClientSecret: SECRET, adminEmails: ` ${EMAIL.toUpperCase()},second@example.edu `,
  googleFetch: (url, init) => { assert.equal(url, 'https://oauth2.googleapis.com/token'); assert.equal(init.redirect, 'error'); return fetch(`${googleBase}/token`, init); }, ...over });
const open = async (over) => { g = gallery(options(over)); const a = await g.listen(0, '127.0.0.1'); base = `http://127.0.0.1:${a.port}`; };
const start = async (over) => { dir = mkdtempSync(path.join(tmp, 'g-')); clock = Date.parse('2026-10-17T12:00:00Z'); codes.clear(); exchanges.length = 0; await open(over); };
const request = (p, { cookie, method = 'GET', origin, csrf, body, headers = {} } = {}) => fetch(`${base}${ROOT}${p}`, {
  method, redirect: 'manual', headers: { ...(cookie && { cookie }), ...(origin !== undefined && { origin }), ...(csrf !== undefined && { 'x-csrf-token': csrf }),
    ...(body !== undefined && { 'content-type': 'application/json' }), ...headers }, ...(body !== undefined && { body: typeof body === 'string' ? body : JSON.stringify(body) }),
});
const cookies = (r) => r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
const begin = async (claims = {}, opts = {}) => {
  const r = await request('/login', { method: 'POST', origin: ORIGIN, ...opts });
  assert.equal(r.status, 303);
  const url = new URL(r.headers.get('location'));
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.searchParams.get('scope'), 'openid email');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('redirect_uri'), `${ORIGIN}${ROOT}/callback`);
  const code = `code-${++flowSeq}`;
  codes.set(code, { challenge: url.searchParams.get('code_challenge'), nonce: url.searchParams.get('nonce'), claims });
  return { code, state: url.searchParams.get('state'), cookie: cookies(r), response: r };
};
const finish = (f, over = {}) => request(`/callback?state=${f.state}&code=${f.code}`, { cookie: f.cookie, ...over });
const login = async (claims = {}) => {
  const r = await finish(await begin(claims));
  assert.equal(r.status, 303, await r.text());
  assert.equal(r.headers.get('location'), ROOT);
  const cookie = cookies(r);
  const data = await (await request('/api/data', { cookie })).json();
  return { cookie, csrf: data.csrf, response: r };
};
const action = (route, who, reason = '') => request(`/api/${route}`, { method: 'POST', origin: ORIGIN, ...who, body: { reason } });
const seedLook = (status = 'pending', over = {}) => {
  const row = { id: `c-${(++seq).toString(16).padStart(10, '0')}`, name: `Look ${seq}`, credit: 'Student', created: new Date(clock).toISOString(),
    tags: '[]', code: curated.code, fingerprint: `test-${seq}`, described: JSON.stringify(described), status,
    decision: JSON.stringify({ person: 'Check the background.', first: { model: 'first', quality: 2.4 }, escalation: { model: 'second', decision: 'person', rationale: 'Read it carefully.' } }),
    reason: '', token: 'private-submitter-token', decided: clock, media: '', ...over };
  const keys = Object.keys(row);
  g.db.prepare(`INSERT INTO looks (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row));
  return row;
};
const seedMod = async (status = 'pending', { manifest = {}, files = { 'page.html': te.encode(HOSTILE), 'picture.png': PNG, 'note.txt': te.encode(HOSTILE) }, ...over } = {}) => {
  const packed = await MB.pack(files, { glaze: 1, name: `Mod ${++seq}`, version: '1.0.0', author: { name: 'Student' }, ...manifest }, KEY);
  const got = await MB.read(packed.bytes), facts = modFacts(got);
  writeFileSync(path.join(dir, 'mods', `${got.hash}.glazemod`), packed.bytes);
  const row = { id: got.id, hash: got.hash, version: got.version, name: facts.name, credit: facts.credit, key: got.key, summary: JSON.stringify(facts),
    permissions: JSON.stringify(facts.permissions), status, decision: JSON.stringify({ person: 'Check its picture.', review: { overview: HOSTILE, summary: 'Local only.', recommendation: 'Ask a person.', rationale: 'Check media.', decision: 'person', model: 'fake-model', commands: ['cat page.html', 'find . -type f'], rounds: 3 } }),
    reason: '', token: 'private-submitter-token', decided: clock, created: clock, ...over };
  const keys = Object.keys(row);
  g.db.prepare(`INSERT INTO mods (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row));
  return { ...row, packed };
};

test('dashboard is entirely off without any required environment value; public gallery still works', async () => {
  for (const key of ['googleClientId', 'googleClientSecret', 'adminEmails']) {
    await start({ [key]: '' });
    for (const route of ['', '/', '/login', '/callback', '/api/data', '/app.js', '/style.css', '/logout', '/files/looks/c-0000000001']) {
      const r = await request(route, route === '/logout' ? { method: 'POST' } : {});
      assert.equal(r.status, 404, `${key}: ${route}`); assert.equal(r.headers.get('cache-control'), 'no-store');
    }
    assert.equal((await fetch(`${base}/glaze/looks/api/looks`)).status, 200);
    await g.close(); g = null;
  }
  const config = fromEnv({ GOOGLE_CLIENT_ID: CLIENT, GOOGLE_CLIENT_SECRET: SECRET, ADMIN_EMAILS: EMAIL });
  assert.equal(config.googleClientId, CLIENT); assert.equal(config.googleClientSecret, SECRET); assert.equal(config.adminEmails, EMAIL);
});

test('full login: PKCE, cookie binding, claims and exact case-insensitive allowlist; only hashes retained', async () => {
  await start();
  const f = await begin({ email: EMAIL.toUpperCase() });
  const flow = g.db.prepare('SELECT * FROM admin_flows').get();
  assert.equal(flow.state, sha(f.state)); assert.notEqual(flow.browser, f.cookie.split('=')[1]);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/glaze/admin']) assert.ok(f.response.headers.get('set-cookie').includes(flag));
  const r = await finish(f); assert.equal(r.status, 303);
  const c = cookies(r), session = g.db.prepare('SELECT * FROM admin_sessions').get();
  const raw = /__Secure-gz_admin=([^;]+)/.exec(c)[1];
  assert.equal(session.token, sha(raw)); assert.equal(session.email, EMAIL);
  assert.equal(session.expires, clock + 12 * 3600e3); assert.equal(g.db.prepare('SELECT COUNT(*) n FROM admin_flows').get().n, 0);
  assert.equal(exchanges.length, 1); assert.equal(exchanges[0].code_verifier, flow.verifier);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/glaze/admin', 'Max-Age=43200']) assert.ok(r.headers.getSetCookie().some((v) => v.includes(flag)));
  for (const p of ['', '/', '/app.js', '/style.css', '/api/data']) {
    const page = await request(p, { cookie: c }); assert.equal(page.status, 200, p);
    assert.equal(page.headers.get('cache-control'), 'no-store'); assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(!page.headers.get('content-security-policy').includes('unsafe-inline'));
  }
  assert.equal((await request('/api/data', { cookie: `${c}; __Secure-gz_admin=${raw}` })).status, 401, 'ambiguous session cookies refused');
});

test('wrong or unverified email, issuer, audience, nonce, expiry and malformed tokens are refused identically', async () => {
  await start();
  const failures = [ { email: 'stranger@example.edu' }, { email: `${EMAIL}.evil` }, { email_verified: false }, { email_verified: 'true' },
    { nonce: 'wrong' }, { exp: clock / 1000 }, { exp: '9999999999' }, { iss: 'https://evil.example' }, { aud: 'other-client' },
    { aud: [CLIENT] }, { azp: 'other-client' }, { iat: clock / 1000 + 120 }, { sub: '' } ];
  let message;
  for (let i = 0; i < failures.length; i++) {
    const f = await begin(failures[i], { headers: { 'x-real-ip': `198.51.100.${i + 1}` } });
    const r = await finish(f);
    assert.equal(r.status, 403, JSON.stringify(failures[i]));
    const text = await r.text(); message ||= text; assert.equal(text, message); assert.ok(!cookies(r).includes('__Secure-gz_admin='));
  }
  const f = await begin({}, { headers: { 'x-real-ip': '203.0.113.3' } }); codes.get(f.code).token = 'not.a.token';
  assert.equal((await finish(f)).status, 403);
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n, 0);
});

test('bad state, wrong browser, expired flow, replayed state and replayed code never authenticate', async () => {
  await start();
  const f = await begin();
  assert.equal((await finish({ ...f, state: 'x'.repeat(43) })).status, 403);
  assert.equal((await finish(f, { cookie: `__Secure-gz_admin_flow=${'x'.repeat(43)}` })).status, 403);
  assert.equal(exchanges.length, 0);
  const pair = await Promise.all([finish(f), finish(f)]);
  assert.deepEqual(pair.map((r) => r.status).sort(), [303, 403]); assert.equal(exchanges.length, 1);
  const next = await begin();
  assert.equal((await finish({ ...next, code: f.code })).status, 403, 'Google refuses already exchanged code');
  assert.equal((await finish(next)).status, 403, 'failed exchange consumes state');
  const stale = await begin(); clock += 10 * 60e3;
  assert.equal((await finish(stale)).status, 403);
  const denied = await begin();
  assert.equal((await request(`/callback?state=${denied.state}&error=access_denied`, { cookie: denied.cookie })).status, 403);
  assert.equal((await finish(denied)).status, 403);
});

test('login starts require the site Origin and are limited per trusted client network, including IPv6 /64', async () => {
  await start();
  assert.equal((await request('/login', { method: 'POST' })).status, 403);
  assert.equal((await request('/login', { method: 'POST', origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/login')).status, 200);
  for (let i = 0; i < 10; i++) await begin({}, { headers: { 'x-real-ip': `2001:db8:1:2::${i + 1}` } });
  const limited = await request('/login', { method: 'POST', origin: ORIGIN, headers: { 'x-real-ip': '2001:db8:1:2::beef' } });
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '3600');
  await begin({}, { headers: { 'x-real-ip': '2001:db8:1:3::1' } });
  const buckets = g.db.prepare('SELECT * FROM admin_login_limits').all(); assert.equal(buckets.length, 2); assert.ok(!JSON.stringify(buckets).includes('2001:db8'));
  clock += 3600e3; await begin({}, { headers: { 'x-real-ip': '2001:db8:1:2::1' } });
});

test('every private route refuses without a session; sessions persist, expire and sign out with CSRF and Origin', async () => {
  await start();
  const look = seedLook(), mod = await seedMod();
  const routes = ['/app.js', '/style.css', '/api/data', '/api/audit?before=20', `/api/looks/${look.id}`, `/api/mods/${mod.id}/${mod.hash}`,
    `/files/looks/${look.id}`, `/files/mods/${mod.id}/${mod.hash}?path=page.html`, `/bundles/mods/${mod.id}/${mod.hash}`, '/unknown'];
  for (const p of routes) {
    assert.equal((await request(p)).status, 401, p);
    assert.equal((await request(p, { cookie: `__Secure-gz_admin=${'a'.repeat(43)}` })).status, 401, p);
  }
  for (const p of ['/logout', `/api/looks/${look.id}/approve`, `/api/mods/${mod.id}/${mod.hash}/remove`]) assert.equal((await request(p, { method: 'POST', origin: ORIGIN, body: { reason: '' } })).status, 401);
  assert.equal((await request('')).headers.get('location'), `${ROOT}/login`);
  const who = await login();
  await g.close(); await open(); assert.equal((await request('/api/data', who)).status, 200, 'stored session survives restart');
  for (const missing of [{ cookie: who.cookie }, { cookie: who.cookie, csrf: who.csrf, origin: 'https://evil.example' }, { cookie: who.cookie, origin: ORIGIN, csrf: 'wrong' }, { cookie: who.cookie, origin: ORIGIN }]) {
    assert.equal((await request('/logout', { method: 'POST', ...missing })).status, 403);
    assert.equal((await action(`looks/${look.id}/approve`, missing)).status, 403);
  }
  assert.equal((await request(`/api/looks/${look.id}/approve`, { method: 'POST', cookie: who.cookie, csrf: who.csrf, body: { reason: '' } })).status, 403);
  const r = await request('/logout', { method: 'POST', origin: ORIGIN, ...who }); assert.equal(r.status, 200); assert.match(cookies(r), /__Secure-gz_admin=/);
  assert.equal((await request('/api/data', who)).status, 401);
  const fresh = await login(); clock += 12 * 3600e3;
  assert.equal((await request('/api/data', fresh)).status, 401);
  g.sweep(); assert.equal(g.db.prepare('SELECT COUNT(*) n FROM admin_sessions').get().n, 0);
});

test('Looks and every mod version include declined records, queue reasons, reviewer details, permissions and no submitter tokens', async () => {
  await start({ limits: false }); const who = await login();
  const a = seedLook('pending', { name: HOSTILE, credit: HOSTILE }), b = seedLook('declined');
  const mod = await seedMod('pending', { manifest: { name: 'Permissions', permissions: [{ id: 'todo', why: HOSTILE }, { id: 'network:api.weather.gov', why: 'Weather' }] }, files: { 'hooks.js': te.encode('glaze.todo();') } });
  await seedMod('declined', { manifest: { name: 'Permissions', version: '2.0.0', permissions: [{ id: 'todo', why: 'Due dates' }] }, files: { 'hooks.js': te.encode('glaze.todo();') } });
  const data = await (await request('/api/data', who)).json();
  assert.equal(data.looks.length, 2); assert.equal(data.mods.length, 2); assert.equal(data.limits, false);
  assert.equal(data.looks[0].person, 'Check the background.'); assert.ok(data.looks.some((r) => r.id === b.id));
  assert.ok(!JSON.stringify(data).includes('private-submitter-token'));
  const l = await (await request(`/api/looks/${a.id}`, who)).json(); assert.equal(l.name, HOSTILE); assert.equal(l.code, curated.code); assert.equal(l.decision.first.quality, 2.4);
  const m = await (await request(`/api/mods/${mod.id}/${mod.hash}`, who)).json();
  assert.equal(m.versions.length, 2); assert.deepEqual(m.decision.review.commands, ['cat page.html', 'find . -type f']); assert.equal(m.decision.review.rounds, 3);
  assert.equal(m.permissions[0].why, HOSTILE); assert.match(m.permissions[0].means, /To Do/); assert.ok(m.summary.hosts.includes('api.weather.gov'));
  for (const route of ['', '/app.js', '/style.css']) { const text = await (await request(route, who)).text(); assert.ok(!text.includes(HOSTILE)); assert.ok(!text.includes('private-submitter-token')); }
});

test('all six moderation actions share CLI state transitions and atomically record actor, item, time and reason', async () => {
  await start(); const who = await login();
  for (const kind of ['looks', 'mods']) for (const verb of ['approve', 'decline', 'remove']) {
    const web = kind === 'looks' ? seedLook() : await seedMod();
    const cli = kind === 'looks' ? seedLook() : await seedMod();
    const suffix = `${kind}/${web.id}${web.hash ? `/${web.hash}` : ''}/${verb}`;
    const reason = `Reason for ${verb}`;
    const r = await action(suffix, who, reason); assert.equal(r.status, 200, await r.text());
    const to = { approve: 'published', decline: 'declined', remove: 'removed' }[verb];
    assert.equal(kind === 'looks' ? g.decide(cli.id, to, reason) : await g.decideMod(cli.id, cli.hash, to, reason), true);
    const table = kind, key = kind === 'looks' ? 'id' : 'hash', value = web.hash || web.id;
    const row = g.db.prepare(`SELECT status, reason, decided FROM ${table} WHERE ${key} = ?`).get(value);
    assert.deepEqual({ ...row }, { status: to, reason, decided: clock });
    const record = g.db.prepare('SELECT * FROM admin_audit WHERE email = ? ORDER BY seq DESC LIMIT 1').get(EMAIL);
    assert.equal(record.action, to); assert.equal(record.kind, kind); assert.equal(record.id, web.id); assert.equal(record.hash, web.hash || ''); assert.equal(record.at, clock); assert.equal(record.reason, reason);
    assert.equal((await action(suffix, who, reason)).status, 409, 'stale action refused');
  }
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM admin_audit').get().n, 12, 'six browser and six CLI decisions');
  const row = seedLook();
  assert.equal((await action(`looks/${row.id}/decline`, who, '  ')).status, 400);
  assert.equal((await request(`/api/looks/${row.id}/approve`, { ...who, method: 'GET' })).status, 404);
  g.db.exec("CREATE TRIGGER reject_admin_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;");
  assert.equal((await action(`looks/${row.id}/approve`, who)).status, 500);
  assert.equal(g.db.prepare('SELECT status FROM looks WHERE id = ?').get(row.id).status, 'pending', 'no decision without audit');
});

test('CSRF, Origin, JSON type and request body limits protect decisions; blocked and altered bundles cannot be approved', async () => {
  await start(); const who = await login(); const row = seedLook();
  for (const auth of [{ cookie: who.cookie, origin: ORIGIN }, { ...who, origin: 'null' }, { ...who, origin: 'https://evil.example' }, { ...who, origin: ORIGIN, csrf: 'bad' }]) {
    assert.equal((await request(`/api/looks/${row.id}/approve`, { ...auth, method: 'POST', body: { reason: '' } })).status, 403);
  }
  assert.equal((await action(`looks/${row.id}/approve`, who, 'x'.repeat(5000))).status, 413);
  assert.equal((await request(`/api/looks/${row.id}/approve`, { ...who, origin: ORIGIN, method: 'POST', body: '{}', headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await request(`/api/looks/${row.id}/approve`, { ...who, origin: ORIGIN, method: 'POST', body: 'null' })).status, 400);
  const mod = await seedMod();
  g.db.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('blocklist', ?)").run(Buffer.from(JSON.stringify({ list: { seq: 1, mods: [mod.id], bundles: [], authors: [] } })));
  assert.equal((await action(`mods/${mod.id}/${mod.hash}/approve`, who)).status, 409);
  g.db.prepare("DELETE FROM meta WHERE k='blocklist'").run();
  writeFileSync(path.join(dir, 'mods', `${mod.hash}.glazemod`), '<html>changed</html>');
  assert.equal((await action(`mods/${mod.id}/${mod.hash}/approve`, who)).status, 409);
  assert.equal((await request(`/bundles/mods/${mod.id}/${mod.hash}`, who)).status, 404);
  const detail = await (await request(`/api/mods/${mod.id}/${mod.hash}`, who)).json(); assert.ok(detail.fileError); assert.equal(detail.decision.review.model, 'fake-model');
});

test('admin bundle/file routes serve inert text, sniff media, force binary downloads, and refuse disguises and traversal', async () => {
  await start(); const who = await login();
  const badPNG = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('<svg onload="alert(1)"></svg>')]);
  const mod = await seedMod('pending', { files: { 'page.html': te.encode(HOSTILE), 'note.txt': te.encode(HOSTILE), 'picture.png': PNG, 'bad.png': badPNG, 'font.woff2': Buffer.from('wOF2\x00binary') } });
  const route = `/files/mods/${mod.id}/${mod.hash}`;
  const text = await request(`${route}?path=page.html`, who);
  assert.equal(text.status, 200); assert.equal(text.headers.get('content-type'), 'text/plain; charset=utf-8'); assert.equal(await text.text(), HOSTILE);
  assert.equal(text.headers.get('cache-control'), 'no-store'); assert.equal(text.headers.get('x-content-type-options'), 'nosniff'); assert.match(text.headers.get('content-security-policy'), /sandbox/);
  const pic = await request(`${route}?path=picture.png`, who); assert.equal(pic.headers.get('content-type'), 'image/png'); assert.deepEqual(Buffer.from(await pic.arrayBuffer()), PNG);
  assert.equal((await request(`${route}?path=bad.png`, who)).status, 415);
  const binary = await request(`${route}?path=font.woff2`, who); assert.equal(binary.headers.get('content-type'), 'application/octet-stream'); assert.match(binary.headers.get('content-disposition'), /attachment/);
  assert.equal((await request(`${route}?path=__proto__`, who)).status, 404);
  for (const p of ['../gallery.db', '/etc/passwd', '../../mods', 'missing.txt']) assert.equal((await request(`${route}?path=${encodeURIComponent(p)}`, who)).status, 404);
  const download = await request(`/bundles/mods/${mod.id}/${mod.hash}`, who); assert.equal(download.headers.get('content-type'), 'application/zip'); assert.match(download.headers.get('content-disposition'), /attachment; filename="[a-z2-7]{16}-[\w-]{43}\.glazemod"/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), Buffer.from(mod.packed.bytes));
  for (const p of ['<svg onload="alert(1)"/>', '<html><script>alert(1)</script></html>']) assert.equal(adminFileType(Buffer.from(p)), 'text/plain; charset=utf-8');
  const modified = Buffer.from(mod.packed.bytes); modified[0] ^= 1; writeFileSync(path.join(dir, 'mods', `${mod.hash}.glazemod`), modified);
  assert.equal((await request(`${route}?path=picture.png`, who)).status, 404);
});

test('pending Look media and mod background animation are private; Lottie is plain text and decline cleans Look media', async () => {
  await start(); const who = await login();
  const lottie = Buffer.from(JSON.stringify({ v: '5.7.0', fr: 30, ip: 0, op: 60, w: 200, h: 120, layers: [] }));
  const checked = MEDIA.check(new Uint8Array(lottie), 'bg'); assert.ok(checked);
  const hash = await MEDIA.sha(checked.bytes);
  writeFileSync(path.join(dir, 'media', hash), checked.bytes);
  const row = seedLook('pending', { media: hash, described: JSON.stringify({ ...described, media: { type: 'lottie', hash } }) });
  const r = await request(`/files/looks/${row.id}`, who); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8'); assert.deepEqual(JSON.parse(await r.text()), JSON.parse(Buffer.from(checked.bytes)));
  assert.equal((await fetch(`${base}/glaze/looks/api/media/${hash}`)).status, 404);
  const mod = await seedMod('pending', { manifest: { parts: { bg: { media: { type: 'lottie', src: './motion.json' } } } }, files: { 'motion.json': checked.bytes } });
  const detail = await (await request(`/api/mods/${mod.id}/${mod.hash}`, who)).json(); assert.equal(detail.summary.media.path, 'motion.json');
  assert.equal((await request(`/files/mods/${mod.id}/${mod.hash}?path=motion.json`, who)).headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal((await action(`looks/${row.id}/decline`, who, 'Please change the background.')).status, 200);
  assert.equal((await request(`/files/looks/${row.id}`, who)).status, 404);
});

test('private video review supports bounded byte ranges without bypassing authentication or file checks', async () => {
  await start(); const who = await login();
  const box = (type, body = Buffer.alloc(0)) => {
    const header = Buffer.alloc(8); header.writeUInt32BE(body.length + 8); header.write(type, 4);
    return Buffer.concat([header, body]);
  };
  const video = Buffer.concat([box('ftyp', Buffer.from('isom\x00\x00\x00\x00isom')), box('moov', box('trak')), box('mdat', Buffer.from(HOSTILE))]);
  const checked = MEDIA.check(new Uint8Array(video), 'bg'); assert.equal(checked?.mime, 'video/mp4');
  const hash = await MEDIA.sha(checked.bytes);
  writeFileSync(path.join(dir, 'media', hash), checked.bytes);
  const look = seedLook('pending', { media: hash });
  const mod = await seedMod('pending', { manifest: { parts: { bg: { media: { type: 'video', src: './movie.mp4' } } } },
    files: { 'movie.mp4': video, 'fake.png': Buffer.concat([PNG.subarray(0, 8), Buffer.from(HOSTILE)]) } });
  const routes = [`/files/looks/${look.id}`, `/files/mods/${mod.id}/${mod.hash}?path=movie.mp4`];
  for (const route of routes) {
    const full = await request(route, who);
    assert.equal(full.status, 200); assert.equal(full.headers.get('content-length'), String(video.length));
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), video);
    for (const [range, start, end] of [['bytes=0-0', 0, 0], ['bytes=20-', 20, video.length - 1], ['bytes=-16', video.length - 16, video.length - 1], ['bytes=8-999999', 8, video.length - 1]]) {
      const r = await request(route, { ...who, headers: { range } });
      assert.equal(r.status, 206, range);
      assert.equal(r.headers.get('content-range'), `bytes ${start}-${end}/${video.length}`);
      assert.equal(r.headers.get('content-length'), String(end - start + 1));
      assert.equal(r.headers.get('accept-ranges'), 'bytes');
      assert.equal(r.headers.get('content-type'), 'video/mp4');
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(r.headers.get('content-disposition'), 'inline');
      assert.match(r.headers.get('content-security-policy'), /sandbox/);
      assert.deepEqual(Buffer.from(await r.arrayBuffer()), video.subarray(start, end + 1));
    }
    for (const range of [`bytes=${video.length}-`, 'bytes=9-2', 'bytes=-0', `bytes=${'9'.repeat(400)}-`]) {
      const r = await request(route, { ...who, headers: { range } });
      assert.equal(r.status, 416, range); assert.equal(r.headers.get('content-range'), `bytes */${video.length}`);
    }
    for (const headers of [{ range: 'bytes=0-1,4-5' }, { range: 'bytes=oops' }, { range: 'bytes=0-1', 'if-range': '"unknown"' }]) {
      const r = await request(route, { ...who, headers });
      assert.equal(r.status, 200); assert.deepEqual(Buffer.from(await r.arrayBuffer()), video);
    }
    assert.equal((await request(route, { headers: { range: 'bytes=0-1' } })).status, 401);
  }
  assert.equal((await request(`/files/mods/${mod.id}/${mod.hash}?path=fake.png`, { ...who, headers: { range: 'bytes=0-1' } })).status, 415);
  writeFileSync(path.join(dir, 'mods', `${mod.hash}.glazemod`), HOSTILE);
  assert.equal((await request(routes[1], { ...who, headers: { range: 'bytes=0-1' } })).status, 404);
  clock += 12 * 3600e3;
  assert.equal((await request(routes[0], { ...who, headers: { range: 'bytes=0-1' } })).status, 401);
});

test('audit pages can reach older records and have no public route; nginx and Docker stage the complete private surface', async () => {
  await start(); const who = await login();
  for (let i = 0; i < 205; i++) g.db.prepare('INSERT INTO admin_audit (email, action, kind, id, hash, at, reason) VALUES (?, ?, ?, ?, ?, ?, ?)').run(EMAIL, 'removed', 'looks', 'c-0000000001', '', clock, HOSTILE);
  const recent = (await (await request('/api/data', who)).json()).audit;
  assert.equal(recent.length, 200); assert.equal(recent[0].seq, 205);
  const older = await (await request(`/api/audit?before=${recent.at(-1).seq}`, who)).json(); assert.equal(older.length, 5); assert.equal(older.at(-1).seq, 1);
  assert.equal((await request('/api/audit?before=oops', who)).status, 400);
  const conf = readFileSync('ops/public-site.nginx.conf', 'utf8');
  for (const match of [/location = \/glaze\/admin \{([^}]+)\}/, /location \^~ \/glaze\/admin\/ \{([^}]+)\}/]) {
    const body = conf.match(match)?.[1]; assert.ok(body);
    for (const text of ['access_log off;', 'client_max_body_size 4k;', 'proxy_pass http://127.0.0.1:8788;', 'proxy_set_header X-Real-IP $remote_addr;', 'proxy_cache off;', 'Cache-Control "no-store"']) assert.ok(body.includes(text), text);
    assert.ok(!body.includes('Cookie ""'));
  }
  const docker = readFileSync('server/Dockerfile', 'utf8'), deploy = readFileSync('ops/deploy-gallery.sh', 'utf8');
  assert.match(docker, /COPY gallery-admin\.mjs/); assert.match(docker, /COPY admin admin\//);
  assert.match(deploy, /cp server\/gallery-admin\.mjs/); assert.match(deploy, /cp -R server\/admin/);
});

test('browser UI keeps hostile names, reviews and source in text sinks, filters records and posts a reason with CSRF', async () => {
  class Node {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.events = {}; this.dataset = {}; this.style = { setProperty() {} }; this.value = ''; this._text = ''; }
    set textContent(text) { this._text = String(text); this.children = []; }
    get textContent() { return this._text + this.children.map((n) => n.textContent).join(''); }
    set innerHTML(_) { throw new Error('untrusted markup sink'); }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this._text = ''; this.children = nodes; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    async fire(type) { for (const fn of this.events[type] || []) await fn({ preventDefault() {} }); }
    get childElementCount() { return this.children.length; }
    focus() {} scrollIntoView() {} setCustomValidity() {} reportValidity() {}
  }
  const ids = ['email', 'message', 'pending', 'looks', 'mods', 'looks-search', 'looks-filter', 'mods-search', 'mods-filter', 'limits', 'blocklist', 'audit-rows', 'older', 'refresh', 'logout', 'detail', 'detail-title', 'detail-body'];
  const nodes = Object.fromEntries(ids.map((id) => [id, new Node()]));
  const id = 'c-0000000001', hash = 'a'.repeat(43), modId = 'a'.repeat(16);
  const row = { kind: 'looks', id, name: HOSTILE, credit: HOSTILE, status: 'pending', created: Date.parse('2026-10-17'), person: HOSTILE };
  const mod = { kind: 'mods', id: modId, hash, name: 'Media', credit: 'Student', version: '1.0.0', status: 'declined', created: 1 };
  const posts = [], links = [], events = {}, location = { hash: `#looks/${id}`, assign(v) { links.push(v); }, reload() {} };
  const fakeFetch = async (url, init = {}) => {
    if (url.endsWith('/api/data')) return Response.json({ email: EMAIL, csrf: 'session-csrf', looks: [row], mods: [mod], audit: [], limits: true, blocklist: null });
    if (url.endsWith(`/api/looks/${id}`)) return Response.json({ ...row, decision: { first: { model: HOSTILE }, escalation: { rationale: HOSTILE } }, described, code: HOSTILE });
    if (url.endsWith(`/api/looks/${id}/decline`)) { posts.push({ url, init }); row.status = 'declined'; return Response.json({ ok: true }); }
    if (url.endsWith('/logout')) { posts.push({ url, init }); return Response.json({ ok: true }); }
    throw new Error(`Unexpected UI fetch ${url}`);
  };
  vm.runInNewContext(readFileSync('server/admin/app.js', 'utf8'), { document: { getElementById: (id) => nodes[id], createElement: (tag) => new Node(tag) },
    location, window: { addEventListener: (k, fn) => { events[k] = fn; }, confirm: () => true }, fetch: fakeFetch, console });
  const wait = async (f) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 2)); assert.ok(f()); };
  await wait(() => nodes['detail-body'].textContent.includes('Decision reason'));
  assert.ok(nodes.pending.textContent.includes(HOSTILE)); assert.ok(nodes['detail-body'].textContent.includes(HOSTILE));
  const find = (node, tag, text) => node.tagName === tag && (!text || node.textContent === text) ? node : node.children.map((n) => find(n, tag, text)).find(Boolean);
  assert.ok(find(nodes['detail-body'], 'pre', HOSTILE), 'source is literal text in a pre element');
  nodes['looks-search'].value = 'no match'; await nodes['looks-search'].fire('input'); assert.equal(nodes.looks.textContent, 'No items.');
  nodes['mods-filter'].value = 'pending'; await nodes['mods-filter'].fire('change'); assert.equal(nodes.mods.textContent, 'No items.');
  const textarea = find(nodes['detail-body'], 'textarea'); textarea.value = HOSTILE;
  await find(nodes['detail-body'], 'button', 'Decline').fire('click');
  await wait(() => posts.length === 1 && nodes.message.textContent.includes('Saved to the audit log'));
  assert.equal(posts[0].init.headers['x-csrf-token'], 'session-csrf'); assert.equal(posts[0].init.method, 'POST'); assert.deepEqual(JSON.parse(posts[0].init.body), { reason: HOSTILE });
  await nodes.logout.fire('click'); await wait(() => links.length); assert.equal(links[0], `${ROOT}/login`);
});

test('byte sniffing permits only the explicit media formats; renamed active documents remain text', () => {
  const webp = Buffer.alloc(20); webp.write('RIFF'); webp.writeUInt32LE(12, 4); webp.write('WEBP', 8);
  const avif = Buffer.alloc(24); avif.writeUInt32BE(24); avif.write('ftypavif', 4);
  const mp4 = Buffer.from(avif); mp4.write('isom', 8);
  const webm = Buffer.concat([Buffer.from('1a45dfa3', 'hex'), Buffer.from('....webm............')]);
  for (const [bytes, type] of [[PNG, 'image/png'], [Buffer.from('ffd8ffe0', 'hex'), 'image/jpeg'], [Buffer.from('GIF89a123456789'), 'image/gif'], [webp, 'image/webp'], [avif, 'image/avif'], [mp4, 'video/mp4'], [webm, 'video/webm']]) assert.equal(adminFileType(bytes), type);
  for (const bytes of [Buffer.from('<html/>'), Buffer.from('<svg/>'), Buffer.from('{"v":"5.7"}'), Buffer.from('RIFF<script>WEBP'), Buffer.from('not a PNG'), Buffer.alloc(0)]) assert.equal(adminFileType(bytes), 'text/plain; charset=utf-8');
});

test('revoking an allowlisted email invalidates its persisted session; Google errors consume the flow without a session', async () => {
  await start(); const who = await login();
  await g.close(); await open({ adminEmails: 'different@example.edu' });
  assert.equal((await request('/api/data', who)).status, 401);
  await g.close(); await open();
  for (const status of [400, 500]) {
    const f = await begin(); codes.get(f.code).status = status;
    assert.equal((await finish(f)).status, 403); assert.equal((await finish(f)).status, 403);
  }
  const f = await begin(); codes.get(f.code).token = token({ nonce: 'wrong' }, { alg: 'none' });
  assert.equal((await finish(f)).status, 403);
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM admin_flows').get().n, 0);
});
