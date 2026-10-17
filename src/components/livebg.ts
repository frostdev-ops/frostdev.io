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
// Shaders and layers use Glaze's scene engine (vendor/glaze-scene: lib/scene.js and its three.js build), imported the first
// time either is on screen (about 150 KB gzipped). Its GPU fence guard probes untrusted shaders before a visible frame and
// waits for each sampled draw before submitting another. The shader checker loads first, before any graphics context.
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

async function run(el: HTMLElement, spec: Live, { still, current, fail }: Ctx): Promise<Stop> {
  if (spec.kind === 'shader') {
    const G = await loadGlsl();
    if (!current()) return () => {};
    if (!G || !G.check(spec.src).ok) throw new Error('refused');
  }
  const engine = await import('../../vendor/glaze-scene/lib/scene.js');
  if (!current()) return () => {};
  const canvas = canvasIn(el);
  let scene: { update(o: unknown): void; stop(): void } | null = null;
  try {
    // The engine stops itself when it can't draw (no WebGL, over its frame budget); it then tells us, and the gradient shows.
    scene = engine.start(canvas, () => true, () => { canvas.remove(); fail(); });
    scene.update({ kind: spec.kind, x: { bg: spec.kind === 'shader' ? { shader: { src: spec.src } } : { layers: spec.layers } }, palette: {}, ground: spec.ground, colors: spec.colors, dim: spec.dim, amount: spec.amount, speed: still ? 0 : spec.pace });
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
  run(s.el, s.spec, ctx).then((stop) => {
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
