// node --test server/gallery.test.mjs (npm run test:gallery), from the repository root. OpenRouter and the mail
// server are mocks on 127.0.0.1; nothing leaves this computer.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, before, test } from 'node:test';
import zlib from 'node:zlib';
import { BANDS, SAFETY_QUESTIONS, cleanReason, gallery, mailMessage, networkOf, summarize } from './gallery.mjs';

const ORIGIN = 'https://frostdev.io';
const tmp = mkdtempSync(path.join(os.tmpdir(), 'glaze-gallery-test-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

// A palette code (or a Look, with look settings) that no curated entry has.
let seq = 0;
const code = (look) => {
  seq++;
  const hex = (n) => n.toString(16).padStart(6, '0');
  const c = [0x2a7fd4 + seq * 4099, 0x6fb6ff, 0x0a2440, 0x04121f, 0x101a24, 0x070c12, 0xe9eef3, 0x9aa7b4, 0x66727f, 0x1b2733, 0x2b3a4a, 0x34d399, 0xfbbf24, 0xf87171].map(hex).join('');
  const raw = JSON.stringify({ c, ...(look && { l: look }) });
  return `glaze1:${zlib.deflateRawSync(Buffer.from(raw)).toString('base64url')}`;
};

// ---- mocks ----------------------------------------------------------------------------------------------------------
// The two decisions calls of a review run at once; the mock tells them apart by the questions asked.
const calls = { decisions: [], safety: [], chat: [] };
const plan = {};
const decisionSays = ({ quality = 3.4, distinct = 0.9, choice = 'distinct', tags = {} } = {}) => ({
  status: 200,
  json: {
    id: 'd1', model: 'liquid/d1-ultra', provider: 'Cloudflare', usage: { cost: 0.0004, input_tokens: 2600, output_tokens: 0 },
    answers: {
      quality: { score: quality, legend: [], probabilities: [], confidence: 0.8 },
      unique: { choice, probabilities: { distinct, variant: (1 - distinct) * 0.7, copy: (1 - distinct) * 0.3 }, confidence: 0.7 },
      ...Object.fromEntries(Object.entries(tags).map(([t, v]) => [`tag.${t}`, { type: 'noul', noul: v }])),
    },
  },
});
const safetySays = ({ abuse = 0.04, personal = 0.05, official = 0.01, ad = 0.03 } = {}) => ({
  status: 200,
  json: {
    id: 'd2', model: 'liquid/d1-ultra', provider: 'Cloudflare', usage: { cost: 0.0001, input_tokens: 700, output_tokens: 0 },
    answers: Object.fromEntries(Object.entries({ abuse, personal, official, ad }).map(([k, v]) => [k, { type: 'noul', noul: v }])),
  },
});
const llmSays = (decision, reason = 'Because.', reasoning) => ({ status: 200, json: { model: 'openai/gpt-6-luna-pro', usage: { completion_tokens_details: { reasoning_tokens: 42 } }, choices: [{ message: { content: JSON.stringify({ decision, reason }), ...(reasoning && { reasoning }) } }] } });
const mock = http.createServer((req, res) => {
  let b = '';
  req.on('data', (d) => { b += d; });
  req.on('end', () => {
    const body = JSON.parse(b);
    const kind = req.url === '/alpha/decisions' ? (body.questions?.abuse ? 'safety' : 'decisions') : req.url === '/v1/chat/completions' ? 'chat' : '';
    calls[kind]?.push({ body, auth: req.headers.authorization });
    const next = (Array.isArray(plan[kind]) ? plan[kind].shift() : plan[kind]) || { status: 404, json: { error: { code: 404, message: 'no' } } };
    res.writeHead(next.status, { 'content-type': 'application/json' });
    res.end(typeof next.json === 'string' ? next.json : JSON.stringify(next.json));
  });
});
// A plain SMTP server: it accepts mail (or refuses AUTH while `smtpRefuse` is set) and keeps what it got.
const mails = [];
let smtpRefuse = false;
const smtp = net.createServer((sock) => {
  let buf = '', data = null;
  sock.write('220 mock ESMTP\r\n');
  sock.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (data !== null) {
        if (line === '.') { mails.push(data.join('\r\n')); data = null; sock.write('250 queued\r\n'); } else data.push(line);
      } else if (/^EHLO/.test(line)) sock.write('250-mock\r\n250-8BITMIME\r\n250 AUTH PLAIN\r\n');
      else if (/^AUTH PLAIN/.test(line)) sock.write(smtpRefuse ? '535 no\r\n' : '235 ok\r\n');
      else if (/^(MAIL|RCPT)/.test(line)) sock.write('250 ok\r\n');
      else if (line === 'DATA') { data = []; sock.write('354 go\r\n'); } else if (line === 'QUIT') sock.end('221 bye\r\n');
    }
  });
});
let mockUrl, smtpPort;
const listenMock = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
});
before(async () => {
  await listenMock(mock);
  await listenMock(smtp);
  mockUrl = `http://127.0.0.1:${mock.address().port}`;
  smtpPort = smtp.address().port;
});
after(() => { mock.close(); smtp.close(); });

// ---- a gallery per test -----------------------------------------------------------------------------------------------
let g, base, clock;
let dbn = 0;
const start = async (opts = {}) => {
  clock = Date.parse('2026-10-16T12:00:00Z');
  g = gallery({
    db: path.join(tmp, `g${++dbn}.db`), apiKey: 'test-key', openrouter: mockUrl, ipHeader: 'x-real-ip',
    mailUrl: `smtp://bot:pw@127.0.0.1:${smtpPort}`, mailFrom: 'gallery@frostdev.io', now: () => clock, ...opts,
  });
  const a = await g.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${a.port}/glaze/looks/api`;
  calls.decisions = []; calls.safety = []; calls.chat = []; mails.length = 0; smtpRefuse = false;
  plan.decisions = decisionSays(); plan.safety = safetySays(); plan.chat = llmSays('accept');
};
afterEach(async () => { await g?.close(); g = null; });

let ipSeq = 0;
const post = async (p, body, { cookie = `gz_gallery=${'a'.repeat(21)}${(ipSeq % 10)}`, ip = `203.0.113.${++ipSeq % 250}`, origin = ORIGIN, type = 'application/json' } = {}) => {
  const r = await fetch(`${base}${p}`, { method: 'POST', headers: { origin, 'content-type': type, 'x-real-ip': ip, ...(cookie && { cookie }) }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: r.status, headers: r.headers, body: await r.json() };
};
let nameSeq = 0;
const look = (over = {}) => ({ code: code(), name: `Test Look ${++nameSeq}`, credit: 'Sam', tags: [], license: true, ...over });
const fresh = () => ({ cookie: `gz_gallery=${Math.random().toString(36).slice(2).padEnd(22, 'x').slice(0, 22)}`, ip: `198.51.100.${++ipSeq % 250}` });
const status = async (token) => (await fetch(`${base}/status/${token}`)).json();
const waitFor = async (f) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => setTimeout(r, 20)); assert.ok(f()); };

// ---- tests ------------------------------------------------------------------------------------------------------------
test('a clear accept publishes the Look, and GET /looks lists it with its description', async () => {
  await start();
  const sub = look({ code: code({ font: 'lora', scale: 1.1 }), tags: ['serif'] });
  const r = await post('/submit', sub, fresh());
  assert.equal(r.status, 200);
  assert.equal(r.body.outcome, 'published');
  assert.match(r.body.url, /^\/glaze\/looks#c-[0-9a-f]{10}$/);
  assert.equal(r.body.escalated, false);
  assert.equal(calls.chat.length, 0);
  // What the decision model saw: the submission and its neighbours, never a cookie or an address.
  const sent = calls.decisions[0];
  assert.equal(sent.auth, 'Bearer test-key');
  assert.equal(sent.body.model, 'liquid/d1-ultra');
  assert.equal(sent.body.state.submission.name, sub.name);
  assert.equal(sent.body.state.nearest.length, 3);
  assert.deepEqual(Object.keys(sent.body.questions).sort(), ['quality', 'unique']);
  assert.equal('credit' in sent.body.state.submission, false);
  // Safety is its own call, at the same time, on the name and credit alone, with the calibrated questions.
  const risk = calls.safety[0];
  assert.equal(calls.safety.length, 1);
  assert.equal(risk.auth, 'Bearer test-key');
  assert.deepEqual(risk.body.state, { name: sub.name, credit: sub.credit });
  assert.deepEqual(risk.body.questions, SAFETY_QUESTIONS);
  assert.deepEqual(Object.keys(SAFETY_QUESTIONS).sort(), ['abuse', 'ad', 'official', 'personal']);
  for (const q of Object.values(SAFETY_QUESTIONS)) assert.ok(q.type === 'noul' && q.criteria.true && q.criteria.false);
  assert.ok(r.body.numbers.safe > 0.9 && r.body.numbers.safety.personal === 0.05);
  assert.equal(sent.body.questions.quality.criteria.length, 5);
  assert.doesNotMatch(JSON.stringify([sent.body, risk.body]), /203\.0\.113|198\.51\.100|gz_gallery/);

  const list = await fetch(`${base}/looks`);
  assert.equal(list.headers.get('cache-control'), 'public, max-age=60');
  assert.equal(list.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(list.headers.get('access-control-allow-origin'), null);
  const { looks } = await list.json();
  assert.equal(looks.length, 1);
  const l = looks[0];
  for (const k of ['id', 'name', 'credit', 'created', 'tags', 'code', 'kind', 'mode', 'colors', 'chips', 'font', 'bg', 'contrast', 'scale', 'radius']) assert.ok(k in l, k);
  assert.equal(l.name, sub.name);
  assert.equal(l.font.name, 'Lora');
  assert.equal(Object.keys(l.colors).length, 14);
  assert.equal((await status(r.body.token)).status, 'published');
});

test('the cookie is random, HttpOnly, Secure, SameSite=Strict, scoped to the API, for a day', async () => {
  await start();
  const r = await post('/check', { code: code() }, { cookie: '' });
  const c = r.headers.get('set-cookie');
  assert.match(c, /^gz_gallery=[\w-]{22}; Max-Age=86400; Path=\/glaze\/looks\/api; HttpOnly; Secure; SameSite=Strict$/);
  const again = await post('/check', { code: code() }, { cookie: c.split(';')[0] });
  assert.equal(again.headers.get('set-cookie'), null);
  // Stored only as a keyed hash.
  const raw = c.split(';')[0].split('=')[1];
  await post('/submit', look(), { cookie: c.split(';')[0], ip: '192.0.2.9' });
  const rows = g.db.prepare('SELECT key FROM quota').all().map((x) => x.key);
  assert.ok(rows.length >= 2 && !rows.some((k) => k.includes(raw) || k.includes('192.0.2')));
});

test('check: problems, the description and the 3 nearest Looks, without a model or quota', async () => {
  await start();
  const r = await post('/check', { code: code({ font: 'jetbrains-mono' }), name: 'Frost', tags: ['low-vision'] });
  assert.equal(r.status, 200);
  assert.equal(r.body.look.font.group, 'Mono');
  assert.equal(r.body.nearest.length, 3);
  assert.ok(r.body.nearest.every((n) => typeof n.distance === 'number' && n.name));
  assert.ok(r.body.problems.some((p) => /name is already/.test(p)));
  assert.ok(r.body.problems.some((p) => /tagged low-vision/.test(p)));
  assert.equal(calls.decisions.length, 0);
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM quota').get().n, 0);
  const bad = await post('/check', { code: 'glaze1:nope' });
  assert.equal(bad.body.look, null);
  assert.ok(bad.body.problems.length);
});

for (const [gate, says, risks, pattern] of [
  ['safety', {}, { personal: 0.85, official: 0.72, abuse: 0.4 }, /^The name or credit looks like it has personal information and claims to be official,.*85% sure; it declines from 70%/],
  ['quality', { quality: 1.1 }, {}, /rated it 1\.1 out of 4/],
  ['unique', { distinct: 0.05, choice: 'variant' }, {}, /light variant of ".+".*5% distinct/],
]) {
  test(`a clear decline on ${gate} says why in plain words, with the numbers`, async () => {
    await start();
    plan.decisions = decisionSays(says);
    plan.safety = safetySays(risks);
    const sub = look();
    const r = await post('/submit', sub, fresh());
    assert.equal(r.body.outcome, 'declined');
    assert.match(r.body.reasons.join(' '), pattern);
    assert.equal(r.body.reasons.length, 1);
    assert.ok(!r.body.reasons.join(' ').includes(sub.name));
    assert.equal(r.body.escalated, false);
    assert.equal(calls.chat.length, 0);
    // Kept 30 days for tuning, with no identifiers.
    const rej = g.db.prepare('SELECT * FROM rejected').all();
    assert.equal(rej.length, 1);
    assert.deepEqual(Object.keys(rej[0]).sort(), ['code', 'day', 'decision', 'name']);
    clock += 31 * 864e5;
    g.sweep();
    assert.equal(g.db.prepare('SELECT COUNT(*) n FROM rejected').get().n, 0);
  });
}

test('the bands: everything between them goes to the LLM', async () => {
  assert.deepEqual(BANDS.accept, { safety: 0.30, quality: 2.5, distinct: 0.40 });
  assert.deepEqual(BANDS.decline, { safety: 0.70, quality: 1.5, distinct: 0.10 });
  await start();
  // Between the edges: a safety concern from 0.30 to under 0.70, quality under 2.5, P(distinct) under 0.40, or a
  // confident Look that the model still calls a variant.
  for (const [unsure, risks] of [[{}, { abuse: 0.34 }], [{}, { personal: 0.3 }], [{}, { ad: 0.69 }], [{ quality: 2.4 }, {}], [{ distinct: 0.39 }, {}], [{ distinct: 0.8, choice: 'variant' }, {}]]) {
    calls.chat = [];
    plan.decisions = decisionSays(unsure);
    plan.safety = safetySays(risks);
    const r = await post('/submit', look(), fresh());
    assert.equal(r.body.escalated, true, JSON.stringify([unsure, risks]));
    assert.equal(calls.chat.length, 1);
  }
  const sent = calls.chat[0].body;
  assert.equal(sent.model, 'openai/gpt-6-luna-pro');
  assert.equal(sent.response_format.json_schema.strict, true);
  assert.deepEqual(sent.response_format.json_schema.schema.properties.decision.enum, ['accept', 'decline', 'human']);
  // xhigh reasoning, kept (not excluded): its summary goes with the decision and the maintainer's mail.
  assert.deepEqual(sent.reasoning, { effort: 'xhigh' });
  assert.equal(sent.max_tokens, 32000);
  assert.match(sent.messages[0].content, /untrusted data/);
  const user = JSON.parse(sent.messages[1].content);
  assert.ok(user.submission && user.nearest && user.firstReview);
  // The second reviewer judges the credit too, and gets all four safety numbers.
  assert.equal(user.submission.credit, 'Sam');
  assert.deepEqual(user.firstReview.safety, { abuse: 0.04, personal: 0.05, official: 0.01, ad: 0.03 });
});

test('each kind of safety problem declines in plain words, without quoting', async () => {
  await start();
  for (const [kind, words] of [['abuse', 'has inappropriate words'], ['personal', 'has personal information'], ['official', 'claims to be official'], ['ad', 'is advertising']]) {
    plan.safety = safetySays({ [kind]: 0.7 });
    const sub = look({ name: `Probe ${kind} ${nameSeq}` });
    const r = await post('/submit', sub, fresh());
    assert.equal(r.body.outcome, 'declined', kind);
    assert.match(r.body.reasons[0], new RegExp(`looks like it ${words}, `));
    assert.ok(!r.body.reasons[0].includes(sub.name) && !r.body.reasons[0].includes(sub.credit));
  }
  // All four just under the accept edge: published without a second reviewer.
  plan.safety = safetySays({ abuse: 0.299, personal: 0.299, official: 0.299, ad: 0.299 });
  assert.equal((await post('/submit', look(), fresh())).body.outcome, 'published');
  assert.equal(calls.chat.length, 0);
});

test('a palette is summarized without fonts, text size, shape or background', () => {
  const base = { mode: 'dark', animated: false, colors: {}, contrast: [], scale: 1, leading: 1.5, density: 'normal', radius: 8, glass: 0, depth: 1, surfaces: { surfaceColor: '#101010' }, bg: { kind: 'solid' } };
  const p = summarize({ ...base, kind: 'palette', font: null, head: null });
  for (const k of ['font', 'headings', 'textSize', 'lineHeight', 'density', 'shape', 'background']) assert.equal(k in p, false, k);
  assert.match(p.kind, /keeps their own fonts, text size, shape and background/);
  const l = summarize({ ...base, kind: 'look', font: { name: 'Lora', group: 'Serif' }, head: { name: 'Lora', group: 'Serif' } });
  assert.equal(l.font, 'Lora (Serif)');
  assert.equal(l.shape.surfaceColor, '#101010');
  assert.equal(l.background.kind, 'solid');
});

test('the LLM accepts, declines with its reason, or hands it to a person (who gets mail)', async () => {
  await start();
  plan.decisions = decisionSays({ quality: 2 });
  plan.chat = llmSays('accept');
  assert.equal((await post('/submit', look(), fresh())).body.outcome, 'published');

  plan.decisions = decisionSays({ quality: 2 });
  plan.chat = llmSays('decline', 'The muted text is\u0007 hard to read on the cards. ' + 'x'.repeat(400), 'Private thoughts about the muted text.');
  const d = await post('/submit', look(), fresh());
  assert.equal(d.body.outcome, 'declined');
  assert.match(d.body.reasons[0], /^The muted text is hard to read/);
  assert.ok(d.body.reasons[0].length <= 300);
  assert.ok(!JSON.stringify(d.body).includes('Private thoughts'), 'the reasoning is never sent to the student');

  plan.safety = safetySays({ personal: 0.3 });
  plan.chat = llmSays('human', 'The credit might be a real person.', 'Weighing the credit\u0007: it\r\ncould be a real name.');
  const sub = look({ name: 'Señor Café' });
  const h = await post('/submit', sub, fresh());
  assert.equal(h.body.outcome, 'pending');
  assert.match(h.body.token, /^[\w-]{32}$/);
  assert.equal((await status(h.body.token)).status, 'pending');
  assert.ok(!JSON.stringify(h.body).includes('Weighing') && !JSON.stringify(await status(h.body.token)).includes('Weighing'));
  // A pending Look holds its name and code.
  const dup = await post('/submit', { ...look(), name: sub.name }, fresh());
  assert.equal(dup.status, 422);
  await waitFor(() => mails.length === 1);
  const m = mails[0];
  assert.match(m, /^Subject: =\?UTF-8\?B\?/m);
  for (const part of [sub.code, 'The credit might be a real person.', `--approve ${h.body.id}`, `--decline ${h.body.id}`, 'Sam', 'personal 0.3', 'Its reasoning (summary, 42 reasoning tokens):', 'Weighing the credit: it\r\ncould be a real name.']) assert.ok(m.includes(part), part);
  assert.doesNotMatch(m, /203\.0\.113|198\.51\.100|gz_gallery/);
  assert.equal(g.list('pending')[0].unmailed, 0);
});

test('an LLM error or an invalid answer goes to a person; quota is used once', async () => {
  await start();
  for (const bad of [{ status: 500, json: { error: { code: 500, message: 'x' } } }, { status: 200, json: { choices: [{ message: { content: '{"decision":"publish","reason":"x"}' } }] } }, { status: 200, json: { choices: [{ message: { content: 'not json' } }] } }]) {
    plan.decisions = decisionSays({ quality: 2.2 });
    plan.chat = [bad, bad];
    const who = fresh();
    const r = await post('/submit', look(), who);
    assert.equal(r.body.outcome, 'pending');
    assert.equal(g.db.prepare("SELECT n FROM quota WHERE kind = 'all'").get().n >= 1, true);
    const again = await post('/submit', look(), who);
    assert.equal(again.status, 429);
  }
  assert.equal(g.db.prepare("SELECT n FROM quota WHERE kind = 'all'").get().n, 3);
});

test('a subjective tag the decision model doubts is dropped, not a rejection', async () => {
  await start();
  plan.decisions = decisionSays({ tags: { colorful: 0.3, minimal: 0.8 } });
  const r = await post('/submit', look({ tags: ['colorful', 'minimal'] }), fresh());
  assert.equal(r.body.outcome, 'published');
  assert.deepEqual(r.body.tags, ['minimal']);
  assert.deepEqual(r.body.dropped, ['colorful']);
  assert.deepEqual(Object.keys(calls.decisions[0].body.questions).filter((k) => k.startsWith('tag.')).sort(), ['tag.colorful', 'tag.minimal']);
  // Tags the code can show are checked, never asked; color-blind-safe is for maintainers only.
  const cb = await post('/submit', look({ tags: ['color-blind-safe'] }), fresh());
  assert.equal(cb.status, 422);
});

test('one review a day per cookie', async () => {
  await start();
  const cookie = fresh().cookie;
  assert.equal((await post('/submit', look(), { cookie, ip: '192.0.2.1' })).status, 200);
  const r = await post('/submit', look(), { cookie, ip: '192.0.2.2' });
  assert.equal(r.status, 429);
  assert.equal(r.body.limit, 'cookie');
  assert.equal(r.body.resets, '2026-10-17T00:00:00.000Z');
  clock += 864e5;
  assert.equal((await post('/submit', look(), { cookie, ip: '192.0.2.3' })).status, 200);
});

test('one review a day per network: an IPv4 address or an IPv6 /64', async () => {
  assert.equal(networkOf('2001:db8:1:2:aaaa::1'), '2001:db8:1:2::/64');
  assert.equal(networkOf('::ffff:192.0.2.7'), '192.0.2.7');
  await start();
  assert.equal((await post('/submit', look(), { cookie: fresh().cookie, ip: '2001:db8:1:2::1' })).status, 200);
  const r = await post('/submit', look(), { cookie: fresh().cookie, ip: '2001:db8:1:2:ffff:1:2:3' });
  assert.equal(r.status, 429);
  assert.equal(r.body.limit, 'network');
  assert.equal((await post('/submit', look(), { cookie: fresh().cookie, ip: '2001:db8:1:3::1' })).status, 200);
  // X-Real-IP counts only from a trusted proxy.
  await g.close();
  await start({ trustedProxies: '10.9.9.9' });
  assert.equal((await post('/submit', look(), { ...fresh(), ip: '192.0.2.50' })).status, 200);
  assert.equal((await post('/submit', look(), { ...fresh(), ip: '192.0.2.51' })).body.limit, 'network');
});

test('a global cap bounds a day\'s reviews', async () => {
  await start({ reviewsPerDay: 2 });
  assert.equal((await post('/submit', look(), fresh())).status, 200);
  assert.equal((await post('/submit', look(), fresh())).status, 200);
  const r = await post('/submit', look(), fresh());
  assert.equal(r.status, 429);
  assert.equal(r.body.limit, 'all');
});

test('deterministic failures and 503s use no quota', async () => {
  await start();
  const who = fresh();
  for (const bad of [{ ...look(), license: false }, { ...look(), credit: 'see https://x.io' }, { ...look(), credit: '@sam' }, { ...look(), name: '' }, { ...look(), code: 'glaze1:AAAA' }, { ...look(), name: 'Frost' }]) {
    const r = await post('/submit', bad, who);
    assert.equal(r.status, 422, JSON.stringify(bad));
    assert.ok(r.body.problems.length);
  }
  assert.equal(calls.decisions.length, 0);
  // Upstream down (after one retry), a timeout or no key: reviews are paused, nothing used.
  plan.decisions = [{ status: 502, json: {} }, { status: 503, json: {} }];
  const p = await post('/submit', look(), who);
  assert.equal(p.status, 503);
  assert.match(p.body.error, /paused/);
  assert.equal(calls.decisions.length, 2);
  plan.decisions = { status: 200, json: { answers: {} } };
  assert.equal((await post('/submit', look(), who)).status, 503);
  plan.decisions = decisionSays();
  // Either call failing fails the whole review: the safety call down, or answering outside its questions.
  plan.safety = [{ status: 500, json: {} }, { status: 500, json: {} }];
  assert.equal((await post('/submit', look(), who)).status, 503);
  for (const bad of [{ abuse: 1.2 }, { personal: 'low' }]) {
    plan.safety = safetySays(bad);
    assert.equal((await post('/submit', look(), who)).status, 503, JSON.stringify(bad));
  }
  plan.safety = { status: 200, json: { answers: { abuse: { noul: 0.01 } } } };
  assert.equal((await post('/submit', look(), who)).status, 503);
  plan.safety = safetySays();
  assert.equal((await post('/submit', look(), who)).body.outcome, 'published');
  await g.close();
  await start({ apiKey: '' });
  assert.equal((await post('/submit', look(), who)).status, 503);
  assert.equal(g.db.prepare('SELECT COALESCE(SUM(n), 0) n FROM quota').get().n, 0);
});

test('posts need the site\'s Origin, JSON, and at most 16 KB', async () => {
  await start();
  assert.equal((await post('/check', { code: code() }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('/submit', look(), { origin: '' })).status, 403);
  assert.equal((await post('/check', 'code=x', { type: 'application/x-www-form-urlencoded' })).status, 415);
  assert.equal((await post('/check', '[1]')).status, 400);
  const big = await fetch(`${base}/check`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ code: 'x'.repeat(17000) }) }).catch((e) => e);
  assert.ok(big instanceof Error || big.status === 413);
});

test('duplicate names and codes, curated or community, and taken-down codes stay blocked', async () => {
  await start();
  const sub = look();
  const r = await post('/submit', sub, fresh());
  assert.equal(r.body.outcome, 'published');
  const sameName = await post('/submit', { ...look(), name: sub.name.toUpperCase() }, fresh());
  assert.ok(sameName.body.problems.some((p) => /name/.test(p)));
  const sameCode = await post('/submit', { ...look(), code: sub.code }, fresh());
  assert.ok(sameCode.body.problems.some((p) => /exact code/.test(p)));
  const curatedCode = (await import('node:fs')).readFileSync('src/data/looks/frost.json', 'utf8');
  const cc = await post('/submit', { ...look(), code: JSON.parse(curatedCode).code }, fresh());
  assert.ok(cc.body.problems.some((p) => /exact code/.test(p)));
  assert.ok(g.decide(r.body.id, 'removed'));
  assert.equal((await (await fetch(`${base}/looks`)).json()).looks.length, 0);
  assert.equal((await status(r.body.token)).status, 'removed');
  const back = await post('/submit', { ...look(), code: sub.code }, fresh());
  assert.ok(back.body.problems.some((p) => /taken down/.test(p)));
});

test('the network key rotates every UTC day and old keys are deleted', async () => {
  await start();
  await post('/submit', look(), fresh());
  const first = g.db.prepare('SELECT * FROM salts').all();
  clock += 864e5;
  await post('/submit', look(), fresh());
  const second = g.db.prepare('SELECT * FROM salts').all();
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.notEqual(first[0].day, second[0].day);
  assert.notDeepEqual(first[0].salt, second[0].salt);
  clock += 3 * 864e5;
  g.sweep();
  assert.equal(g.db.prepare('SELECT COUNT(*) n FROM quota').get().n, 0);
});

test('mail: one-line subject (no header injection), RFC 2047 for non-ASCII, CRLF and dot-stuffing', () => {
  const m = mailMessage({ from: 'a@frostdev.io', to: 'admin@frostdev.io\r\nBcc: x@evil.example', subject: 'Hi\r\nBcc: x@evil.example\u0000', text: 'one\n.two\r\nthree' });
  const head = m.split('\r\n\r\n')[0];
  assert.equal(head.split('\r\n').filter((l) => /^Bcc:/i.test(l)).length, 0);
  assert.match(head, /^Subject: Hi Bcc: x@evil\.example$/m);
  assert.match(m, /\r\none\r\n\.\.two\r\nthree\r\n\.\r\n$/);
  assert.match(mailMessage({ from: 'a@b', to: 'c@d', subject: 'Café', text: '' }), /^Subject: =\?UTF-8\?B\?Q2Fmw6k=\?=$/m);
  assert.equal(cleanReason('a\r\nb‮ c '), 'a b c');
});

test('a failed send leaves the Look pending and unmailed, and the next try sends it', async () => {
  await start();
  smtpRefuse = true;
  plan.safety = safetySays({ official: 0.4 });
  plan.chat = llmSays('human', 'Unsure.');
  const r = await post('/submit', look(), fresh());
  assert.equal(r.body.outcome, 'pending');
  await g.mailPending();
  assert.equal(mails.length, 0);
  assert.equal(g.list('pending')[0].unmailed, 1);
  smtpRefuse = false;
  await g.mailPending();
  assert.equal(mails.length, 1);
  assert.equal(g.list('pending')[0].unmailed, 0);
});

test('the CLI approves and declines pending Looks; the status link shows it', async () => {
  await start();
  plan.safety = safetySays({ official: 0.4 });
  plan.chat = llmSays('human', 'Unsure.');
  const a = await post('/submit', look(), fresh());
  plan.safety = safetySays({ official: 0.4 });
  plan.chat = llmSays('human', 'Unsure.');
  const b = await post('/submit', look(), fresh());
  const env = { ...process.env, DB: path.join(tmp, `g${dbn}.db`) };
  const cli = (...args) => execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/gallery.mjs', ...args], { env, encoding: 'utf8' });
  assert.match(cli('--pending'), new RegExp(a.body.id));
  assert.match(cli('--approve', a.body.id), /published/);
  assert.match(cli('--decline', b.body.id, 'Too close to Frost.\nTry new colors.'), /declined/);
  const sa = await status(a.body.token);
  assert.equal(sa.status, 'published');
  assert.equal(sa.url, `/glaze/looks#${a.body.id}`);
  const sb = await status(b.body.token);
  assert.deepEqual([sb.status, sb.reason], ['declined', 'Too close to Frost. Try new colors.']);
  assert.match(cli('--list'), new RegExp(`${a.body.id}\\tpublished`));
  assert.equal((await fetch(`${base}/status/${'x'.repeat(32)}`)).status, 404);
});
