// Socket-free checks for the shared decoder, duplicate identity and reviewer evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import zlib from 'node:zlib';
import { checkCode, describe } from '../scripts/looks.mjs';

const require = createRequire(import.meta.url);
const SHARE = require('../vendor/glaze/lib/share.js');
const X = require('../vendor/glaze/lib/lookparts.js');
const { GZ_DEFAULTS } = require('../vendor/glaze/defaults.js');
const MX = require('../vendor/glaze/lib/motionx.js');
const palette = '2a7fd46fb6ff0a244004121f101a24070c12e9eef39aa7b466727f1b27332b3a4a34d399fbbf24f87171';
const encode = (raw, version = 2, padding = '') => `glaze${version}:${zlib.deflateRawSync(Buffer.from(JSON.stringify(raw) + padding)).toString('base64url')}`;
const code = (x, b) => encode({ c: palette, ...(b && { b }), x });
const SHADER = 'vec4 scene(vec2 uv) { return vec4(mix(uC1, uC2, uv.x), amt(uv.y)); }';
const digest = (s) => createHash('sha256').update(s).digest('base64url');

test('all curated glaze1 fingerprints and description bytes match the pre-parts baseline', async () => {
  // Captured from d30bdf6 with its own decoder and describe(), before glaze2 existed.
  const baseline = [
    ['aurora-night', 'y4iDdkjNS9vyc3zpLY3zVmtjpCelf7I2NmKAoL6eZd4', 'kan0BOkzvkuYXd-DtZhANK9blqMM-IYPjzMECHpIOvA'],
    ['clear', 'KSShIu6nNYfmkLnTLmuXycE3wMEeI8cXMTXUTrNu4SU', 'EVKMmIkxUnRvEY1TNW3Yp0F6BySuQ2TvFvZ2cxtAO48'],
    ['ember', 'CqHKdthNSoz1Yx58pLBx6icqw908IcrvxwwtyjKvJ4g', '34IDGl_cIh2AnfkZHkoUP7OZJZVrOVgYu1kQmESKI80'],
    ['forest', 'nsBszDjX1WPbykp1K2kf3zRpn-iraN3hIgCEMIbfPos', 'Xmuh_MeGVcPcV7HfA9iSbGpj_a9cHHpacy2_zSKdlsI'],
    ['frost', 'a1u6VkSUHtCQlaM14b6d7CXTP2trJlXuV4goKaBZm04', 'V8J4tl6lat2phXCTmN_PDrnrn_yJFUWWTUnrr89ZZ4w'],
    ['graveyard', 'OohqTsStfm66oBQTuttV3nG94mY4LujImUgyuOhINYg', '-_2PIi2FE15BUP3x_VRIp06zGYE5xds6RzYK_yYIeKM'],
    ['lagoon', 'U4IqD9MZRdxadbD6Lk0ShtJpjyPtnwlxDspCU0maeYA', 'bFZXYuaIb3gCpAaNxVNMmsTfDWxj4S6WRWbSK8E9eGc'],
    ['lava-lounge', '4tHyrt5BNUaqmgMGKIQVO-BxcrtS7ikRHntZnz_Ivv0', 'l9CbS2m3YME2xUDs63Mj7wEYTYl1Y3wfjRoNTND26Rw'],
    ['library', 'CPnrGQEKa2OtjJfO1h19zIRppXi-e50IflpRAEK4jRw', 'E7wgr4P5aAHKpOcK8blW7YQayx9-9L0RhMLcZEgOiG0'],
    ['midnight', 'gQvAyY1WEuQaJBLs4_ni9cmy0Tfp56n99zW4xjGjstY', 'd773EcHLHPSKhsWlFnPyApgwXotF64SIuDOV8zFpEOc'],
    ['paper', 'S0udaNO377wjsfmtleA9y1Xl_36rGqccmuJH42ZU_UU', 'X-OTn6xmCjtQr0d0ANiBPXlNXjCXyxNDNvNDc5XEzMc'],
    ['pumpkin-patch', 'RJEONkudKsiVHwFK8OPoNzfZvW2xK2B1KqkCkkbbMHY', 'nCjhdA3fwAEBEh2VYckwUQ9YlGm9NqY9YIQYvFd3PJ4'],
    ['rose-garden', 'C7aiDaUrUcqACwrNcX9cDK1LzkMMp6OG42Ty8bcYBdo', 'l8gGwYHSQv4kV6Caanets6Yl-SIyTgW-GI1lwpDEEsI'],
    ['rose', '59Z9c1YLTr2_H9lgPtnsjdAlpL-FsVuLYxZFLLzTk1E', 'PGjh-2yBlyUXl9nPEHVMJ-L7ZUrSfoH5HWtNcOcFVTQ'],
    ['synthwave', '6RhuBHjttjI9FIWEPwLlg9A1TroK-pPJkd9w-xqs5d4', 't8zCZQMIb8JnkKs0CkJhLquiLcwatST-BhE8y6Jn4go'],
    ['terminal', 'PEC2sygHYwJ1SZabeuMhvxgUlgXN8hPuVx-ghvC166c', 'nKhRHkjNzXJECKOCaQSTzu-EdfW1-JWbZxofUMqbTR4'],
  ];
  for (const [id, fingerprint, description] of baseline) {
    const r = await checkCode(JSON.parse(readFileSync(`src/data/looks/${id}.json`, 'utf8')).code);
    assert.deepEqual(r.problems, [], id);
    assert.equal(r.fingerprint, fingerprint, id);
    assert.equal(digest(JSON.stringify(describe(r.look))), description, id);
  }
});

test('glaze1 refuses the new background kinds that require glaze2 parts', async () => {
  for (const kind of ['shader', 'layers', 'media']) {
    const legacy = encode({ c: palette, b: { kind } }, 1);
    const r = await checkCode(legacy);
    assert.equal(r.look, null);
    assert.match(r.problems[0], /glaze1:.*Look parts/);
  }
});

test('glaze2 takes a media background only as a used file: never a link, never unused', async () => {
  for (const type of ['video', 'image', 'lottie']) for (const src of ['https://media.example.edu/background', `file:${'a'.repeat(43)}`]) {
    for (const kind of ['media', 'solid']) {
      const r = await checkCode(code({ bg: { media: { type, src } } }, { kind }));
      const ok = kind === 'media' && src.startsWith('file:');
      assert.equal(r.problems.length === 0, ok, `${kind}: ${type}: ${src}: ${r.problems}`);
      if (ok) assert.deepEqual(describe(r.look).media, { type, hash: 'a'.repeat(43), fit: 'cover', dim: 40 });
    }
  }
});

test('shader identity ignores line wrapping while keeping distinct operators and directive boundaries', async () => {
  const wrapped = SHADER.replace(/\s*([(){},;])\s*/g, '$1').replace('{', '{\n  ').replace(';}', ';\n}');
  const a = await checkCode(code({ bg: { shader: { src: SHADER } } }, { kind: 'shader' }));
  const b = await checkCode(code({ bg: { shader: { src: `// heading\n${wrapped}\n\n` } } }, { kind: 'shader' }));
  assert.deepEqual(a.problems, []);
  assert.deepEqual(b.problems, []);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.equal(describe(a.look).parts.background.key, describe(b.look).parts.background.key);
  const keys = [];
  for (const expression of ['a - -uv.y', 'a-- - uv.y']) {
    const r = await checkCode(code({ bg: { shader: { src: `vec4 scene(vec2 uv) { float a = uv.x; return vec4(${expression}); }` } } }, { kind: 'shader' }));
    assert.deepEqual(r.problems, []);
    keys.push(r.fingerprint);
  }
  assert.notEqual(...keys);
  const macro = '#define VALUE .2\nvec4 scene(vec2 uv) { return vec4(VALUE); }';
  const macroA = await checkCode(code({ bg: { shader: { src: macro } } }, { kind: 'shader' }));
  const macroB = await checkCode(code({ bg: { shader: { src: macro.replace('vec4 scene', '\n  vec4\nscene') } } }, { kind: 'shader' }));
  assert.deepEqual(macroA.problems, []);
  assert.deepEqual(macroB.problems, []);
  assert.equal(macroA.fingerprint, macroB.fingerprint);
  const reordered = encode({ x: { bg: { shader: { src: SHADER } } }, b: { kind: 'shader' }, c: palette });
  assert.equal((await checkCode(reordered)).fingerprint, a.fingerprint);
});

test('rules retain action targets, moves and style values without leaking labels to the Look review', async () => {
  const rules = [
    { p: 'canvas.course-nav.assignments', do: 'hide' },
    { p: 'canvas.course-nav.home', do: 'show' },
    { p: 'canvas.course-nav.grades', do: 'move', to: 'canvas.course-nav.assignments', at: 'before' },
    { p: 'canvas.dashboard-card.title', do: 'style', st: { o: 0, fg: '#123456' } },
    { p: 'canvas.dashboard-card.title', do: 'label', t: 'My personal label' },
  ];
  const checked = await checkCode(code({ rules }));
  assert.deepEqual(checked.problems, []);
  const first = describe(checked.look);
  assert.deepEqual(first.parts.rules.items, rules.map(({ t, ...r }) => r));
  assert.deepEqual(first.partsText.labels, [{ part: 'canvas.dashboard-card.title', text: 'My personal label' }]);
  assert.doesNotMatch(JSON.stringify(first.parts), /My personal label/);
  const swapped = rules.map((r, i) => i < 2 ? { ...r, do: r.do === 'hide' ? 'show' : 'hide' } : r);
  const second = describe((await checkCode(code({ rules: swapped }))).look);
  assert.notDeepEqual(first.parts.rules, second.parts.rules);
});

test('the gallery accepts complete parts and exposes every free text field only in partsText', async () => {
  const x = {
    bg: { layers: [{ k: 'gradient', c: ['accent', 'ok'] }] },
    anim: { 'page.enter': { s: [{ at: 0, o: 0 }, { at: 1, o: 1 }] } },
    fx: { complete: { kind: 'ring' } }, cursor: { kind: 'glow' },
    nav: { links: [{ id: 'abcdefghijkl', n: 'Link name token', u: 'https://library.example.edu/path-token?q=query-token#hash-token', i: 'book' }], groups: [{ label: 'Group label token', items: ['link:abcdefghijkl'] }] },
    rules: [{ p: 'canvas.dashboard-card.title', do: 'label', t: 'Rule label token' }],
  };
  const r = await checkCode(code(x, { kind: 'layers' }));
  assert.deepEqual(r.problems, []);
  const d = describe(r.look);
  assert.deepEqual(d.partsText, { groups: ['Group label token'], links: [{ name: 'Link name token', url: x.nav.links[0].u }], labels: [{ part: 'canvas.dashboard-card.title', text: 'Rule label token' }] });
  assert.doesNotMatch(JSON.stringify(d.parts), /label token|name token|path-token|query-token|hash-token/);
  for (const raw of [{ c: palette }, { c: palette, x: { cursor: { kind: 'glow', size: 999 } } }, { c: palette, x: { media: {} } }, { c: palette, x, m: [{ id: 'abcdefghijklmnop', h: 'a'.repeat(43), name: 'A mod' }] }]) {
    assert.ok((await checkCode(encode(raw))).problems.length);
  }
});

test('inflated byte limits are inclusive for both versions and compression remains bounded', async () => {
  for (const [version, cap, raw] of [[1, 8192, { c: palette }], [2, 48 * 1024, { c: palette, x: { cursor: { kind: 'glow' } } }]]) {
    const json = JSON.stringify(raw);
    const atLimit = encode(raw, version, ' '.repeat(cap - Buffer.byteLength(json)));
    assert.deepEqual((await checkCode(atLimit)).problems, []);
    const tooLarge = encode(raw, version, ' '.repeat(cap + 1 - Buffer.byteLength(json)));
    assert.equal((await checkCode(tooLarge)).look, null);
  }
  const noise = Array.from({ length: 200 }, (_, i) => digest(String(i))).join('');
  const links = Array.from({ length: 8 }, (_, i) => ({ id: String(i).padStart(12, 'a'), n: '😀'.repeat(40), u: `https://library.example.edu/${noise.slice(i, i + 484)}`, i: 'book' }));
  const x = {
    bg: { shader: { src: `${SHADER}\n//${noise.slice(0, 8192 - SHADER.length - 3)}` } },
    anim: Object.fromEntries(MX.MOMENTS.map((m) => [m, { s: Array.from({ length: 8 }, (_, i) => ({ at: Math.round(i / 7 * 1000) / 1000, x: 200, y: -200, sc: 1.5, r: 180, kx: 30, ky: -30, o: 1, bl: 20, br: 2, sa: 2, hu: -180 })), ms: 2000, ease: [1, 3, 0, -3], delay: 1000, stagger: 200 }])),
    fx: Object.fromEntries(MX.EVENTS.map((e) => [e, { kind: 'confetti', count: 60, shapes: ['dot', 'star', 'snow', 'heart'], c: ['accent', 'ok', 'warn', 'err', 'ink', 'surface'], spread: 360, gravity: 2, life: 2500, size: 48 }])),
    cursor: { kind: 'trail', c: ['accent', 'ok', 'warn'], size: 48, len: 24, fade: 2000 },
    nav: { links, groups: links.slice(0, 6).map((l) => ({ label: '😀'.repeat(24), items: [`link:${l.id}`] })), hidden: ['help'], icons: { calendar: 'calendar' } },
    rules: Array.from({ length: 64 }, () => ({ p: 'canvas.dashboard-card.title', do: 'label', t: '😀'.repeat(60) })),
  };
  const encoded = await SHARE.encode({ ...GZ_DEFAULTS, bg: { ...GZ_DEFAULTS.bg, kind: 'shader' } }, {}, { x });
  assert.ok(encoded.length <= 20000);
  assert.deepEqual((await checkCode(encoded)).problems, []);
  assert.deepEqual((await checkCode(code(x, { kind: 'shader' }))).problems, []);
  assert.ok(Buffer.byteLength(JSON.stringify({ x })) < X.MAX_JSON);
  assert.equal((await checkCode(`glaze2:${'A'.repeat(20000)}`)).look, null);
});
