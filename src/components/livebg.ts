// Live shader and layer backgrounds for the Look previews (gallery cards, the large preview, the submit page's live
// preview). A Look whose background is a shader or layers has a `live` description from the gallery server
// (describe() in scripts/looks.mjs); everything in it is checked again here (liveSpec), and anything unexpected is no
// background at all: the preview keeps the gradient under it, which is also what any error falls back to.
//
// Lazy: a preview draws only while it is on screen (an IntersectionObserver), at most MAX_LIVE at once (browsers keep
// about 16 WebGL contexts and drop the oldest), nothing in a hidden tab, and one still frame under
// prefers-reduced-motion. Off screen it is torn down and its context released, so a long gallery never holds more than
// the few on screen. Nothing here puts a Look's text in the page: the only values that reach the DOM are canvas drawing
// and the data-live attribute.
//
// A shader is drawn by a small raw-WebGL quad, with the vertex shader, the wrapper and the checker of Glaze's own
// lib/glsl.js, loaded as a script the first time one is needed (7 KB gzipped). Layers use Glaze's scene engine
// (vendor/glaze-scene: lib/scene.js and its three.js build), imported the first time a Look with layers is on screen
// (about 150 KB gzipped, none of it on a page without one).
import glslUrl from '../../vendor/glaze/lib/glsl.js?url';

export type Layer = {
  k: 'scene' | 'noise' | 'gradient' | 'particles'; blend: string; amount: number; speed: number;
  name?: string; style?: string; shape?: string; scale?: number; angle?: number; count?: number; size?: number; drift?: number; twinkle?: number; c?: string[];
};
type Base = { ground: string; colors: string[]; dim: number; amount: number; pace: number };
export type Live = (Base & { kind: 'shader'; src: string }) | (Base & { kind: 'layers'; layers: Layer[] });

const HEX = /^#[0-9a-f]{6}$/i;
const SCENES = ['mist', 'orbs', 'borealis', 'lava', 'contours', 'horizon', 'graveyard', 'pumpkins', 'waves', 'dust'];
const BLENDS = ['normal', 'add', 'screen', 'multiply'];
const STYLES = ['linear', 'radial', 'conic'];
const SHAPES = ['dot', 'star', 'snow', 'heart', 'leaf', 'spark'];
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const word = (v: unknown, list: string[], d: string) => (typeof v === 'string' && list.includes(v) ? v : d);
const hex = (v: unknown) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : '');

// What a preview may draw: a shader (ASCII, 8 KiB at most; Glaze's checker runs on it again before any GL) or up to four
// layers, with colors as #rrggbb and every number and word in Glaze's range or list. null for anything else.
export function liveSpec(raw: unknown): Live | null {
  if (!isObj(raw)) return null;
  const ground = hex(raw.ground);
  const colors = Array.isArray(raw.colors) && raw.colors.length === 3 ? raw.colors.map(hex) : [];
  if (!ground || colors.length !== 3 || colors.some((c) => !c)) return null;
  const base = { ground, colors, dim: num(raw.dim, 0, 1, 0.5), amount: num(raw.amount, 0, 1, 0.5), pace: num(raw.pace, 0, 2, 1) };
  if (raw.kind === 'shader') {
    const src = raw.src;
    return typeof src === 'string' && src.length > 0 && src.length <= 8192 && /^[\t\n\x20-\x7e]+$/.test(src) ? { kind: 'shader', src, ...base } : null;
  }
  if (raw.kind !== 'layers' || !Array.isArray(raw.layers)) return null;
  const layers: Layer[] = [];
  for (const l of raw.layers.slice(0, 4)) {
    if (!isObj(l) || !['scene', 'noise', 'gradient', 'particles'].includes(l.k as string)) continue;
    const out: Layer = { k: l.k as Layer['k'], blend: word(l.blend, BLENDS, 'normal'), amount: num(l.amount, 0, 100, 70), speed: num(l.speed, 0, 200, 100) };
    if (out.k === 'scene') out.name = word(l.name, SCENES, 'mist');
    if (out.k === 'noise') out.scale = num(l.scale, 1, 100, 40);
    if (out.k === 'gradient') Object.assign(out, { style: word(l.style, STYLES, 'linear'), angle: num(l.angle, 0, 360, 135) });
    if (out.k === 'particles') Object.assign(out, { count: Math.round(num(l.count, 1, 400, 60)), shape: word(l.shape, SHAPES, 'dot'), size: num(l.size, 1, 64, 6), drift: num(l.drift, 0, 360, 180), twinkle: num(l.twinkle, 0, 100, 0) });
    const c = Array.isArray(l.c) ? l.c.slice(0, 4).map(hex).filter(Boolean) : [];
    if (c.length) out.c = c;
    layers.push(out);
  }
  return layers.length ? { kind: 'layers', layers, ...base } : null;
}

// ---- running one -----------------------------------------------------------------------------------------------------
type Glsl = { VERT: string; wrap(src: string): string; check(src: string): { ok: boolean } };
declare global { var GZ_GLSL: Glsl | undefined; }
let glsl: Promise<Glsl | null> | null = null;
// lib/glsl.js is a classic script that defines GZ_GLSL; it is added to the page once, the first time a shader needs it.
const loadGlsl = () => (glsl ||= new Promise((resolve) => {
  if (globalThis.GZ_GLSL) return resolve(globalThis.GZ_GLSL);
  const s = Object.assign(document.createElement('script'), { src: glslUrl, async: true });
  s.onload = () => resolve(globalThis.GZ_GLSL ?? null);
  s.onerror = () => resolve(null);
  document.head.append(s);
}));

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
// Frames at most this wide are drawn (Glaze draws custom shaders at 0.6 of the screen's size); a preview is small.
const MAX_PIXELS = 640;
const FPS = 30;

type Stop = () => void;
type Ctx = { still: boolean; current: () => boolean; fail: () => void };

function canvasIn(el: HTMLElement) {
  const host = el.querySelector<HTMLElement>('.lp-bg');
  if (!host) throw new Error('no background');
  const canvas = document.createElement('canvas');
  canvas.className = 'lp-live';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  return canvas;
}

async function runShader(el: HTMLElement, spec: Extract<Live, { kind: 'shader' }>, { still, current, fail }: Ctx): Promise<Stop> {
  const G = await loadGlsl();
  if (!current()) return () => {};
  // The shader has been through Glaze's checker twice already (the code's decoder, the server); a third time before any GL.
  if (!G || !G.check(spec.src).ok) throw new Error('refused');
  const canvas = canvasIn(el);
  let gl: WebGLRenderingContext | null = null;
  const lose = () => { gl?.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove(); };
  try {
    gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: still }) as WebGLRenderingContext | null;
    if (!gl) throw new Error('no WebGL');
    const g = gl;
    const make = (type: number, text: string) => {
      const s = g.createShader(type)!;
      g.shaderSource(s, text);
      g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error('compile');
      return s;
    };
    const program = g.createProgram()!;
    g.attachShader(program, make(g.VERTEX_SHADER, G.VERT));
    g.attachShader(program, make(g.FRAGMENT_SHADER, G.wrap(spec.src)));
    g.bindAttribLocation(program, 0, 'position');
    g.bindAttribLocation(program, 1, 'uv');
    g.linkProgram(program);
    if (!g.getProgramParameter(program, g.LINK_STATUS)) throw new Error('link');
    g.useProgram(program);
    g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 0, 0, 1, -1, 0, 1, 0, -1, 1, 0, 0, 1, 1, 1, 0, 1, 1]), g.STATIC_DRAW);
    g.enableVertexAttribArray(0);
    g.vertexAttribPointer(0, 3, g.FLOAT, false, 20, 0);
    g.enableVertexAttribArray(1);
    g.vertexAttribPointer(1, 2, g.FLOAT, false, 20, 12);
    const at = (n: string) => g.getUniformLocation(program, n);
    // The colors sit toward the ground by `dim`, as Glaze's scene engine hands them to its shaders.
    const ground = rgb(spec.ground);
    g.uniform3f(at('uGround'), ground[0], ground[1], ground[2]);
    spec.colors.forEach((c, i) => { const v = rgb(c).map((x, k) => x + (ground[k] - x) * spec.dim); g.uniform3f(at(`uC${i + 1}`), v[0], v[1], v[2]); });
    g.uniform1f(at('uAmount'), spec.amount);
    const uTime = at('uTime'), uAspect = at('uAspect'), uPx = at('uPx');
    let scale = 0.6, time = 0, raf = 0, last = performance.now(), slow = 0, stopped = false;
    const fit = () => {
      const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      const s = Math.min(scale, MAX_PIXELS / w);
      canvas.width = Math.max(1, Math.round(w * s));
      canvas.height = Math.max(1, Math.round(h * s));
      g.viewport(0, 0, canvas.width, canvas.height);
      g.uniform1f(uAspect, w / h);
      g.uniform1f(uPx, canvas.height / 1000);
    };
    const draw = () => {
      g.uniform1f(uTime, time);
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    };
    // ponytail: a rough guard, not Glaze's fence-timed one. Frames more than 150 ms apart four times running (a slow
    // device, or a shader that is heavy for it) halve the resolution once, then hold one still frame. lib/glsl.js's cost
    // limit is what bounds a shader before it ever draws.
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      const dt = now - last;
      if (dt < 1000 / FPS - 1) return;
      slow = dt > 150 ? slow + 1 : Math.max(0, slow - 1);
      if (slow >= 4) {
        slow = 0;
        if (scale > 0.3) { scale /= 2; fit(); } else { cancelAnimationFrame(raf); raf = 0; draw(); return; }
      }
      time += (Math.min(dt, 100) / 1000) * spec.pace;
      last = now;
      draw();
    };
    const onLost = (e: Event) => { e.preventDefault(); if (!stopped) fail(); };
    const onVisible = () => { last = performance.now(); slow = 0; };
    canvas.addEventListener('webglcontextlost', onLost);
    document.addEventListener('visibilitychange', onVisible);
    const resize = new ResizeObserver(() => { if (!stopped) { fit(); draw(); } });
    resize.observe(canvas);
    fit();
    draw();
    if (!still) raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
      canvas.removeEventListener('webglcontextlost', onLost);
      lose();
    };
  } catch (e) { lose(); throw e; }
}

async function runLayers(el: HTMLElement, spec: Extract<Live, { kind: 'layers' }>, { still, current, fail }: Ctx): Promise<Stop> {
  // Glaze's own engine and its three.js build, as a chunk of their own: fetched when the first Look with layers is on screen.
  const engine = await import('../../vendor/glaze-scene/lib/scene.js');
  if (!current()) return () => {};
  const canvas = canvasIn(el);
  let scene: { update(o: unknown): void; stop(): void } | null = null;
  try {
    // The engine stops itself when it can't draw (no WebGL, over its frame budget); it then tells us, and the gradient shows.
    scene = engine.start(canvas, () => true, () => { canvas.remove(); fail(); });
    scene.update({ kind: 'layers', x: { bg: { layers: spec.layers } }, palette: {}, ground: spec.ground, colors: spec.colors, dim: spec.dim, amount: spec.amount, speed: still ? 0 : spec.pace });
  } catch (e) { scene?.stop(); canvas.remove(); throw e; }
  const s = scene;
  return () => { s.stop(); canvas.remove(); };
}

// ---- which previews are drawing --------------------------------------------------------------------------------------
type Session = { el: HTMLElement; spec: Live; visible: boolean; failed: boolean; token: number; stop: Stop | null; busy: boolean };
const MAX_LIVE = 8;
const sessions = new Map<HTMLElement, Session>();
const specs = new WeakMap<HTMLElement, Live>();
let active = 0;
const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

const release = (s: Session) => {
  s.token++;
  const was = s.busy;
  s.busy = false;
  const stop = s.stop;
  s.stop = null;
  stop?.();
  delete s.el.dataset.live;
  if (was) active--;
};
const pump = () => {
  if (document.hidden) return;
  for (const s of sessions.values()) {
    if (active >= MAX_LIVE) return;
    if (s.visible && !s.busy && !s.failed) begin(s);
  }
};
function begin(s: Session) {
  s.busy = true;
  active++;
  const token = ++s.token;
  const current = () => s.token === token;
  const ctx: Ctx = { still: !!motion?.matches, current, fail: () => { if (current()) { s.failed = true; release(s); pump(); } } };
  (s.spec.kind === 'shader' ? runShader(s.el, s.spec, ctx) : runLayers(s.el, s.spec, ctx)).then((stop) => {
    // Gone off screen (or replaced) while it was loading.
    if (s.token !== token) { stop(); return; }
    s.stop = stop;
    s.el.dataset.live = 'on';
  }, () => { if (s.token === token) { s.failed = true; release(s); pump(); } });
}
const observer = typeof IntersectionObserver === 'function'
  ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = sessions.get(e.target as HTMLElement);
      if (!s) continue;
      s.visible = e.isIntersecting;
      if (!s.visible && s.busy) release(s);
    }
    pump();
  }, { rootMargin: '80px' })
  : null;
// A change of the system's motion setting starts what is drawing over, as a still frame or moving.
motion?.addEventListener('change', () => { for (const s of sessions.values()) if (s.busy) release(s); pump(); });
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.hidden) { for (const s of sessions.values()) if (s.busy) release(s); }
  else pump();
});

// Draw `spec` in the background of a preview (LookPreview.astro's markup) while it is on screen.
export function watch(el: HTMLElement, spec: Live | null) {
  unwatch(el);
  if (!spec || !observer) return;
  specs.set(el, spec);
  sessions.set(el, { el, spec, visible: false, failed: false, token: 0, stop: null, busy: false });
  observer.observe(el);
}
export function unwatch(el: HTMLElement) {
  const s = sessions.get(el);
  if (!s) return;
  observer?.unobserve(el);
  release(s);
  sessions.delete(el);
  specs.delete(el);
  pump();
}
export const specOf = (el: HTMLElement) => specs.get(el) ?? null;
// A copy of a preview (the large one in the dialog) has no canvas of its own: drop the original's, if it was cloned.
export function stripLive(copy: HTMLElement) {
  copy.querySelector('.lp-live')?.remove();
  delete copy.dataset.live;
}
// The previews a page was built with (curated Looks) carry their description in a JSON script inside the preview.
export function watchBuilt(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('.lp')) {
    const tag = el.querySelector('script.lp-spec');
    if (!tag) continue;
    try { watch(el, liveSpec(JSON.parse(tag.textContent || ''))); } catch { /* the gradient stays */ }
  }
}
