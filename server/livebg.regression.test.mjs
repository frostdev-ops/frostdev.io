// Preview lifecycle checks use the real shader checker and mocked DOM/WebGL; no browser or network is started.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const GLSL = require('../vendor/glaze/lib/glsl.js');
const SHADER = 'vec4 scene(vec2 uv) { return vec4(uv, sin(uTime), 1.); }';
const BASE = { ground: '#001122', colors: ['#112233', '#445566', '#778899'], dim: 0.5, amount: 0.5, pace: 1 };
const shader = (src = SHADER) => ({ kind: 'shader', src, ...BASE });
const layers = () => ({ kind: 'layers', layers: [{ k: 'noise', blend: 'normal', amount: 70, speed: 100, scale: 40 }], ...BASE });
const flush = () => new Promise((resolve) => setImmediate(resolve));

class Target {
  listeners = new Map();
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type) { for (const fn of [...(this.listeners.get(type) || [])]) fn({ preventDefault() {} }); }
}

function page({ loaded = true, hidden = false, reduced = false } = {}) {
  const stats = { contexts: 0, peak: 0, created: 0, draws: 0, engineStarts: 0, engineStops: 0 };
  const document = Object.assign(new Target(), { hidden });
  const scripts = [], canvases = [], resizes = [], frames = new Map();
  let intersection, frame = 0;
  const motion = Object.assign(new Target(), { matches: reduced });
  const gl = () => {
    stats.created++; stats.contexts++; stats.peak = Math.max(stats.peak, stats.contexts);
    let lost = false;
    const api = new Proxy({
      getExtension: () => ({ loseContext() { if (!lost) { lost = true; stats.contexts--; } } }),
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}), getUniformLocation: () => ({}),
      drawArrays: () => { stats.draws++; },
    }, { get: (o, k) => k in o ? o[k] : () => {} });
    return api;
  };
  document.head = { append: (s) => scripts.push(s) };
  document.createElement = (tag) => {
    if (tag === 'script') return {};
    assert.equal(tag, 'canvas');
    const canvas = Object.assign(new Target(), { clientWidth: 320, clientHeight: 180, setAttribute() {}, remove() { this.removed = true; }, getContext: gl });
    canvases.push(canvas);
    return canvas;
  };
  const engine = { start(canvas) {
    stats.engineStarts++;
    const context = canvas.getContext('webgl2');
    return { update() {}, stop() { stats.engineStops++; context.getExtension('WEBGL_lose_context').loseContext(); } };
  } };
  const context = vm.createContext({
    exports: {}, document, performance: { now: () => 0 }, matchMedia: () => motion,
    IntersectionObserver: class { constructor(callback) { intersection = callback; } observe() {} unobserve() {} },
    ResizeObserver: class { constructor(callback) { this.callback = callback; resizes.push(this); } observe() {} disconnect() { this.stopped = true; } },
    requestAnimationFrame: (fn) => { frames.set(++frame, fn); return frame; }, cancelAnimationFrame: (id) => frames.delete(id),
    require: (name) => {
      if (name === '../../vendor/glaze/lib/glsl.js?url') return '/glsl.js';
      if (name === '../../vendor/glaze-scene/lib/scene.js') return engine;
      throw new Error(`Unexpected import ${name}`);
    },
    ...(loaded && { GZ_GLSL: GLSL }),
  });
  const source = ts.transpile(readFileSync('src/components/livebg.ts', 'utf8'), { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true });
  vm.runInContext(source, context);
  const preview = () => ({ dataset: {}, querySelector: (selector) => selector === '.lp-bg' ? { append(canvas) { canvas.host = this; } } : null });
  return {
    ...context.exports, stats, document, motion, canvases, frames, resizes, preview,
    intersect: (shown, gone = []) => intersection([...gone.map((target) => ({ target, isIntersecting: false })), ...shown.map((target) => ({ target, isIntersecting: true }))]),
    load() { context.GZ_GLSL = GLSL; for (const s of scripts) s.onload(); },
    hide(value) { document.hidden = value; document.emit('visibilitychange'); },
  };
}

test('canceled shader loads never allocate contexts beyond the eight live previews', async () => {
  const p = page({ loaded: false });
  const groups = Array.from({ length: 3 }, () => Array.from({ length: 8 }, () => p.preview()));
  for (const group of groups) for (const el of group) p.watch(el, shader());
  p.intersect(groups[0]);
  p.intersect(groups[1], groups[0]);
  p.intersect(groups[2], groups[1]);
  p.load();
  await flush();
  assert.equal(p.stats.created, 8, 'canceled loads reached WebGL');
  assert.equal(p.stats.peak, 8, 'canceled loads temporarily exceeded the context cap');
  for (const group of groups) for (const el of group) p.unwatch(el);
  assert.equal(p.stats.contexts, 0);
});

test('canceled layer imports never start their scene engine', async () => {
  const p = page();
  const el = p.preview();
  p.watch(el, layers());
  p.intersect([el]);
  p.unwatch(el);
  await flush();
  assert.equal(p.stats.engineStarts, 0);
  assert.equal(p.stats.contexts, 0);
});

test('hidden pages do not start previews when an intersection arrives', async () => {
  const p = page({ hidden: true });
  const el = p.preview();
  p.watch(el, shader());
  p.intersect([el]);
  await flush();
  assert.equal(p.stats.created, 0);
  p.hide(false);
  await flush();
  assert.equal(p.stats.contexts, 1);
  p.unwatch(el);
});

test('hiding a page cancels pending starts and releases running preview resources', async () => {
  const p = page({ loaded: false });
  const el = p.preview();
  p.watch(el, shader());
  p.intersect([el]);
  p.hide(true);
  p.load();
  await flush();
  assert.equal(p.stats.created, 0, 'a loader completion drew in a hidden tab');
  p.hide(false);
  await flush();
  assert.equal(p.stats.contexts, 1);
  p.hide(true);
  assert.equal(p.stats.contexts, 0);
  assert.equal(p.frames.size, 0);
  for (const resize of p.resizes) if (!resize.stopped) resize.callback();
  assert.equal(p.stats.draws, 1, 'a hidden resize drew a frame');
  p.unwatch(el);
});

test('shader checks refuse invalid source before allocating a WebGL context', async () => {
  const p = page();
  const el = p.preview();
  p.watch(el, shader('void main() {}'));
  p.intersect([el]);
  await flush();
  assert.equal(p.stats.created, 0);
  assert.equal(el.dataset.live, undefined);
});

test('shader previews free their slot and canvas after context loss', async () => {
  const p = page();
  const els = Array.from({ length: 9 }, () => p.preview());
  for (const el of els) p.watch(el, shader());
  p.intersect(els);
  await flush();
  assert.equal(p.stats.contexts, 8);
  p.canvases[0].emit('webglcontextlost');
  await flush();
  assert.equal(p.stats.contexts, 8);
  assert.equal(p.canvases[0].removed, true);
  assert.equal(els[0].dataset.live, undefined);
  assert.equal(els[8].dataset.live, 'on');
  for (const el of els) p.unwatch(el);
});

test('reduced motion draws one shader frame and changes restart the current preview', async () => {
  const p = page({ reduced: true });
  const el = p.preview();
  p.watch(el, shader());
  p.intersect([el]);
  await flush();
  assert.equal(p.stats.draws, 1);
  assert.equal(p.frames.size, 0);
  p.motion.matches = false;
  p.motion.emit('change');
  await flush();
  assert.equal(p.stats.contexts, 1);
  assert.equal(p.frames.size, 1);
  p.unwatch(el);
  assert.equal(p.frames.size, 0);
});
