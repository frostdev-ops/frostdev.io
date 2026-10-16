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
