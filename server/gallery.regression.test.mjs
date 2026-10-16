// Socket-free adversarial cases: exercise the real request handler with mock upstreams.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterEach, mock, test } from 'node:test';
import zlib from 'node:zlib';
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
afterEach(async () => { mock.restoreAll(); for (const g of galleries.splice(0)) await g.close(); });
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
