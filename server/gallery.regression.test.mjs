// Socket-free adversarial cases: exercise the real request handler with mock upstreams.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Readable, Writable } from 'node:stream';
import { afterEach, mock, test } from 'node:test';
import zlib from 'node:zlib';
import vm from 'node:vm';
import ts from 'typescript';
import { gallery, networkOf, sendMail } from './gallery.mjs';
import { checkCode, loadLooks } from '../scripts/looks.mjs';

const tmp = mkdtempSync(path.resolve('.review-tests-'));
const galleries = [];
let seq = 0;
const code = () => `glaze1:${zlib.deflateRawSync(Buffer.from(JSON.stringify({ c: `${(0x2a7fd4 + ++seq * 4099).toString(16)}6fb6ff0a244004121f101a24070c12e9eef39aa7b466727f1b27332b3a4a34d399fbbf24f87171` }))).toString('base64url')}`;
const look = (over = {}) => ({ code: code(), name: `Adversarial ${seq}`, credit: 'Sam', tags: [], license: true, ...over });
const clef = (over = {}) => ({ answers: { safe: { noul: 0.99 }, quality: { score: 3 }, unique: { choice: 'distinct', probabilities: { distinct: 0.9, variant: 0.07, copy: 0.03 } }, ...over } });
const chat = (value) => ({ choices: [{ message: { content: JSON.stringify(value) } }] });
const create = async (options = {}) => {
  const g = gallery({ db: path.join(tmp, `${++seq}.db`), apiKey: 'mock', ipHeader: 'x-real-ip', ...options });
  galleries.push(g);
  await g.ready;
  return g;
};
const post = (g, body, { ip = '192.0.2.1', cookie = '', type = 'application/json', route = '/submit', origin = 'https://frostdev.io', peer = '127.0.0.1' } = {}) => new Promise((resolve, reject) => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const req = Readable.from([Buffer.from(raw)]);
  Object.assign(req, { method: 'POST', url: `/glaze/looks/api${route}`, headers: { origin, 'content-type': type, 'x-real-ip': ip, cookie }, socket: { remoteAddress: peer, destroy() {} } });
  const chunks = [];
  const res = new Writable({ write(chunk, enc, cb) { chunks.push(chunk); cb(); } });
  res.writeHead = (status, headers) => { res.statusCode = status; res.headers = headers; res.headersSent = true; };
  res.on('finish', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(Buffer.concat(chunks)) }));
  res.on('error', reject);
  g.server.emit('request', req, res);
});
afterEach(async () => { mock.restoreAll(); mock.timers.reset(); for (const g of galleries.splice(0)) await g.close(); });
process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));

// Each group is run against the immutable baseline before its fix is committed.
test('code guard bounds inflation before parsing', async () => {
  const Native = globalThis.DecompressionStream;
  let inflated = 0;
  mock.method(globalThis, 'DecompressionStream', function (format) {
    const stream = new Native(format);
    return { writable: stream.writable, readable: stream.readable.pipeThrough(new TransformStream({ transform(chunk, c) { inflated += chunk.length; c.enqueue(chunk); } })) };
  });
  const bomb = `glaze1:${zlib.deflateRawSync(Buffer.from(JSON.stringify({ c: '0'.repeat(84), l: { font: 'a'.repeat(300000) } }))).toString('base64url')}`;
  assert.ok(bomb.length < 1200);
  assert.ok((await checkCode(bomb)).problems.length);
  assert.ok(inflated <= 65536, `inflated ${inflated} bytes before refusal`);
});

test('code guard refuses whitespace aliases that evade duplicate checks and cannot render', async () => {
  assert.ok((await checkCode(`${code()}\n`)).problems.length);
});

for (const [label, answers] of [
  ['out-of-range quality', { quality: { score: 999 } }],
  ['unknown choice', { unique: { choice: 'publish', probabilities: { distinct: 0.9 } } }],
  ['invalid choice probabilities', { unique: { choice: 'distinct', probabilities: { distinct: 0.9, variant: -2, copy: 5 } } }],
]) test(`model schema rejects ${label} without quota`, async () => {
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(clef(answers))));
  const g = await create();
  const r = await post(g, look());
  assert.equal(r.status, 503);
  assert.equal(g.db.prepare("SELECT COALESCE(SUM(n), 0) n FROM quota").get().n, 0);
});

for (const value of [
  { decision: 'accept', reason: 12 },
  { decision: 'accept', reason: ['fine'] },
  { decision: 'accept', reason: 'fine', extra: 'outside schema' },
]) test(`model schema sends invalid LLM response to human: ${JSON.stringify(value)}`, async () => {
  mock.method(globalThis, 'fetch', async (url) => new Response(JSON.stringify(String(url).endsWith('/decisions') ? clef({ safe: { noul: 0.8 } }) : chat(value))));
  const g = await create();
  const r = await post(g, look());
  assert.equal(r.body.outcome, 'pending');
  assert.equal(g.db.prepare("SELECT n FROM quota WHERE kind = 'all'").get().n, 1);
});

test('model retries share one stage deadline', async () => {
  const signals = [];
  mock.method(globalThis, 'fetch', async (url, options) => {
    signals.push(options.signal);
    return signals.length === 1 ? new Response('{}', { status: 500 }) : new Response(JSON.stringify(clef()));
  });
  const g = await create();
  assert.equal((await post(g, look())).body.outcome, 'published');
  assert.equal(signals.length, 2);
  assert.equal(signals[0], signals[1], 'retry resets the stage timeout');
});

test('network identity canonicalizes mapped IPv4 aliases', async () => {
  assert.equal(networkOf('::ffff:c000:201'), '192.0.2.1');
  assert.equal(networkOf('::FFFF:192.0.2.1'), '192.0.2.1');
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(clef())));
  const g = await create();
  assert.equal((await post(g, look())).status, 200);
  assert.equal((await post(g, look(), { ip: '::ffff:c000:201' })).status, 429);
});

test('check limiter keeps only expiring keyed network hashes', async () => {
  const nativeSet = Map.prototype.set;
  const seen = [];
  mock.method(Map.prototype, 'set', function (key, value) {
    if (value && typeof value === 'object' && 'left' in value) seen.push({ map: this, key });
    return nativeSet.call(this, key, value);
  });
  let clock = Date.parse('2026-10-16T12:00:00Z');
  const g = await create({ now: () => clock });
  await post(g, { code: code() }, { route: '/check' });
  assert.equal(seen.length, 1);
  assert.match(seen[0].key, /^[\w-]{43}$/);
  clock += 60001;
  g.sweep();
  assert.equal(seen[0].map.size, 0);
});

test('check limiter evicts inactive network buckets', async () => {
  const nativeSet = Map.prototype.set;
  let buckets;
  mock.method(Map.prototype, 'set', function (key, value) {
    if (value && typeof value === 'object' && 'left' in value) buckets = this;
    return nativeSet.call(this, key, value);
  });
  let clock = Date.parse('2026-10-16T12:00:00Z');
  const g = await create({ now: () => clock });
  await post(g, { code: code() }, { route: '/check' });
  clock += 60001;
  g.sweep();
  assert.equal(buckets.size, 0);
});

for (const same of ['name', 'code']) test(`concurrent submissions reserve the same ${same} across SQLite connections`, async () => {
  let calls = 0;
  mock.method(globalThis, 'fetch', async () => { calls++; await new Promise((r) => setTimeout(r, 20)); return new Response(JSON.stringify(clef())); });
  const db = path.join(tmp, `shared-${++seq}.db`);
  const g = await create({ db });
  const g2 = await create({ db });
  const first = look();
  const second = look({ [same]: same === 'name' ? first.name.toUpperCase() : first.code });
  const responses = await Promise.all([post(g, first), post(g2, second, { ip: '192.0.2.2' })]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 422]);
  assert.equal(calls, 1);
  assert.equal(g.db.prepare("SELECT n FROM quota WHERE kind = 'all'").get().n, 1);
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM looks').get().n, 1);
});

test('failed reviews release reservations so a corrected retry works', async () => {
  let broken = true;
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(broken ? {} : clef())));
  const g = await create();
  const sub = look();
  assert.equal((await post(g, sub)).status, 503);
  broken = false;
  assert.equal((await post(g, sub)).body.outcome, 'published');
});

const mailSocket = () => {
  const sock = new EventEmitter();
  sock.setTimeout = () => sock;
  sock.write = () => true;
  sock.destroy = (error) => { if (error) sock.emit('error', error); sock.emit('close'); };
  sock.end = () => sock.emit('close');
  return sock;
};

test('SMTP close rejects so later pending mail can be retried', async () => {
  const sock = mailSocket();
  mock.method(net, 'connect', () => sock);
  const sending = sendMail('smtp://127.0.0.1:465', { from: 'a@b', to: 'c@d', subject: 'test', text: 'body' });
  sock.emit('close');
  const outcome = await Promise.race([sending.then(() => 'sent', () => 'failed'), new Promise((r) => setTimeout(() => r('hung'), 50))]);
  assert.equal(outcome, 'failed');
});

test('SMTP total deadline survives a peer that dribbles incomplete replies', async () => {
  const sock = mailSocket();
  mock.method(net, 'connect', () => sock);
  mock.timers.enable({ apis: ['setTimeout'] });
  const sending = sendMail('smtp://127.0.0.1:465', { from: 'a@b', to: 'c@d', subject: 'test', text: 'body' }).then(() => 'sent', () => 'failed');
  for (let i = 0; i < 4; i++) { sock.emit('data', Buffer.from('220-not done\r\n')); mock.timers.tick(10000); }
  // A microtask race lets an already-settled rejection win, without waiting on a real socket or clock.
  let outcome = 'hung';
  sending.then((s) => { outcome = s; });
  await new Promise((r) => setImmediate(r));
  assert.equal(outcome, 'failed');
});

test('SMTP checks the final status of a multiline response', async () => {
  const sock = mailSocket();
  sock.write = (line) => { queueMicrotask(() => sock.emit('data', Buffer.from(line.startsWith('EHLO') ? '250-mock\r\n550 refused\r\n' : '250 ok\r\n'))); return true; };
  mock.method(net, 'connect', () => sock);
  const sending = sendMail('smtp://127.0.0.1:465', { from: 'a@b', to: 'c@d', subject: 'test', text: 'body' });
  sock.emit('data', Buffer.from('220 mock\r\n'));
  await assert.rejects(sending, /EHLO/);
});

test('SMTP authenticates, sends dot-stuffed DATA, and completes after acceptance', async () => {
  const sock = mailSocket();
  const commands = [];
  sock.write = (line) => {
    commands.push(line);
    const reply = line.startsWith('EHLO') ? '250-mock\r\n250-8BITMIME\r\n250 AUTH PLAIN\r\n' : line.startsWith('AUTH') ? '235 ok\r\n' : line === 'DATA\r\n' ? '354 go\r\n' : '250 ok\r\n';
    queueMicrotask(() => sock.emit('data', Buffer.from(reply)));
    return true;
  };
  mock.method(net, 'connect', () => sock);
  const sending = sendMail('smtp://bot:mock@127.0.0.1:465', { from: 'a@b', to: 'c@d', subject: 'Hi\r\nInjected: no', text: '.one\n.\nlast' });
  sock.emit('data', Buffer.from('220 mock\r\n'));
  await sending;
  assert.ok(commands.includes(`AUTH PLAIN ${Buffer.from('\0bot\0mock').toString('base64')}\r\n`));
  assert.ok(commands.includes('MAIL FROM:<a@b> BODY=8BITMIME\r\n'));
  const data = commands.find((c) => c.startsWith('From:'));
  assert.match(data, /Subject: Hi Injected: no\r\n/);
  assert.match(data, /\r\n\.\.one\r\n\.\.\r\nlast\r\n\.\r\n$/);
});

for (const type of ['application/json-patch+json', 'application/json.evil']) test(`HTTP rejects non-JSON media type ${type}`, async () => {
  const g = await create();
  assert.equal((await post(g, { code: code() }, { route: '/check', type })).status, 415);
});

test('retention deletes quota at two days and rejected reviews at thirty days', async () => {
  let clock = Date.parse('2026-10-16T12:00:00Z');
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(clef({ safe: { noul: 0.2 } }))));
  const g = await create({ now: () => clock });
  assert.equal((await post(g, look())).body.outcome, 'declined');
  clock += 2 * 864e5;
  g.sweep();
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM quota').get().n, 0);
});

test('retention deletes rejected reviews at the thirty-day cutoff', async () => {
  let clock = Date.parse('2026-10-16T12:00:00Z');
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(clef({ safe: { noul: 0.2 } }))));
  const g = await create({ now: () => clock });
  await post(g, look());
  clock += 30 * 864e5;
  g.sweep();
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM rejected').get().n, 0);
});

test('CLI decisions cannot overwrite a concurrent takedown', async () => {
  mock.method(globalThis, 'fetch', async (url) => new Response(JSON.stringify(String(url).endsWith('/decisions') ? clef({ safe: { noul: 0.8 } }) : chat({ decision: 'human', reason: 'Unsure' }))));
  const db = path.join(tmp, `cli-race-${++seq}.db`);
  const g = await create({ db });
  const g2 = await create({ db });
  const r = await post(g, look());
  const proto = Object.getPrototypeOf(g.db.prepare('SELECT 1'));
  const get = proto.get;
  let raced = false;
  mock.method(proto, 'get', function (...args) {
    const row = get.apply(this, args);
    // A second CLI takes it down after the first reads pending, before its UPDATE.
    if (!raced && args[0] === r.body.id && row?.status === 'pending') {
      raced = true;
      assert.equal(g2.decide(r.body.id, 'removed'), true);
    }
    return row;
  });
  assert.equal(g.decide(r.body.id, 'published'), false);
  assert.equal(g.db.prepare('SELECT status FROM looks WHERE id = ?').get(r.body.id).status, 'removed');
});

// A small DOM harness for the submit script's async ordering; no rendering or browser process.
const submitPage = (fetch) => {
  class Element {
    constructor(tag = 'div') { this.tagName = tag; this.value = ''; this.checked = false; this.hidden = false; this.children = []; this.events = {}; this.attrs = {}; this.dataset = {}; this.style = { setProperty() {} }; }
    addEventListener(type, cb) { this.events[type] = cb; }
    replaceChildren(...children) { this.children = children; }
    append(...children) { this.children.push(...children); }
    setAttribute(key, value) { this.attrs[key] = value; }
    removeAttribute(key) { delete this.attrs[key]; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    scrollIntoView() {}
    focus() {}
  }
  const nodes = new Map();
  const get = (id) => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  const preview = new Element('button');
  let timer;
  const doc = { getElementById: get, createElement: (tag) => new Element(tag), querySelector: () => preview };
  const source = readFileSync('src/pages/glaze/looks/submit.astro', 'utf8').split('<script>')[1].split('</script>')[0].replace(/import .*? from .*?;/s, '');
  const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None });
  vm.runInNewContext(js, {
    document: doc, location: { hash: '', origin: 'https://frostdev.io' }, URLSearchParams,
    paintPreview() {}, wireDialog() {}, fontLine: () => 'font', fetch,
    clearTimeout() { timer = null; }, window: { setTimeout(cb) { timer = cb; return 1; } },
  });
  return { get, check: () => timer(), preview };
};

test('submit result survives an older live check response', async () => {
  let resolveCheck;
  const checkResponse = new Promise((r) => { resolveCheck = r; });
  const ui = submitPage((url) => url.endsWith('/check') ? checkResponse : Promise.resolve(new Response(JSON.stringify({ outcome: 'published', url: '/glaze/looks#c-1234567890', token: 'x'.repeat(32), numbers: { safe: 1, quality: 3, unique: 'distinct', distinct: 0.9 } }))));
  ui.get('f-code').value = code();
  ui.get('f-name').value = 'New Look';
  ui.get('f-credit').value = 'Sam';
  ui.get('f-license').checked = true;
  ui.get('f-code').events.input();
  const checking = ui.check();
  await ui.get('submit-form').events.submit({ preventDefault() {} });
  assert.equal(ui.get('submit-status').hidden, false);
  resolveCheck(new Response(JSON.stringify({ look: null, problems: [], nearest: [] })));
  await checking;
  assert.equal(ui.get('submit-status').hidden, false, 'older preview hides the published result and status link');
});

test('live-check errors announce themselves and credit errors focus credit', async () => {
  const ui = submitPage(() => Promise.resolve(new Response(JSON.stringify({ look: null, problems: ['the code is invalid'], nearest: [] }))));
  ui.get('f-code').value = code();
  ui.get('f-name').value = 'New Look';
  ui.get('f-code').events.input();
  await ui.check();
  // Live checking has its own persistent status so checking never overwrites review outcomes.
  assert.ok(ui.get('check-status').textContent?.includes('1 problem'));
  await ui.get('submit-form').events.submit({ preventDefault() {} });
  assert.equal(ui.get('f-credit').attrs['aria-invalid'], 'true');
  assert.equal(ui.get('f-code').attrs['aria-invalid'], undefined);
});

test('submit form cannot leak fields through a default GET before scripts initialize', () => {
  const page = readFileSync('src/pages/glaze/looks/submit.astro', 'utf8');
  assert.ok(/<form[^>]*id="submit-form"[^>]*method="post"/.test(page));
  assert.ok(/<button[^>]*id="f-submit"[^>]*disabled/.test(page));
  assert.ok(/<noscript>[\s\S]*?issues\/new/.test(page));
});

test('removed Look cannot return through a recompressed code alias', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(clef())));
  const g = await create();
  const sub = look();
  const published = await post(g, sub);
  assert.equal(g.decide(published.body.id, 'removed'), true);
  const raw = zlib.inflateRawSync(Buffer.from(sub.code.slice(7), 'base64url'));
  const alias = `glaze1:${zlib.deflateRawSync(raw, { level: 0 }).toString('base64url')}`;
  assert.notEqual(alias, sub.code);
  const r = await post(g, look({ code: alias }), { ip: '192.0.2.2' });
  assert.equal(r.status, 422);
  assert.equal(g.db.prepare("SELECT n FROM quota WHERE kind = 'all'").get().n, 1);
});

test('fingerprint migration backfills existing rows before serving', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(clef())));
  const db = path.join(tmp, `migration-${++seq}.db`);
  const g = await create({ db });
  const sub = look();
  const r = await post(g, sub);
  assert.equal(g.decide(r.body.id, 'removed'), true);
  await g.close();
  galleries.splice(galleries.indexOf(g), 1);
  const legacy = new DatabaseSync(db);
  legacy.exec('ALTER TABLE looks DROP COLUMN fingerprint');
  legacy.close();
  const reopened = await create({ db });
  assert.match(reopened.db.prepare('SELECT fingerprint FROM looks').get().fingerprint, /^[\w-]{43}$/);
  const raw = JSON.parse(zlib.inflateRawSync(Buffer.from(sub.code.slice(7), 'base64url')));
  const alias = `glaze1:${zlib.deflateRawSync(Buffer.from(JSON.stringify(raw, null, 2))).toString('base64url')}`;
  assert.equal((await post(reopened, look({ code: alias }))).status, 422);
});
