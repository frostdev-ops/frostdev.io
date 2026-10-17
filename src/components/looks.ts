// Live Look previews and gallery cards, shared by the build (curated cards, painted in the HTML) and the browser
// (community cards and the submit page, painted from the gallery server's JSON). Everything painted comes from
// describe() in scripts/looks.mjs, and is checked again here: a color must be #rrggbb, a number must be finite and
// in Glaze's range, a word must be one of Glaze's. Anything else falls back to a default, so even a wrong answer
// from the server can only paint a wrong color, never inject CSS or markup. Submitted text is only ever textContent.
// A shader or layers background is drawn live by livebg.ts from the `live` description, checked there again.
import { liveSpec, specOf, stripLive, unwatch, watch, watchBuilt } from './livebg';
export { watchBuilt };

export type Font = { id: string; name: string; group: string; fb: string; family: string } | null;
export type Described = {
  kind: string; mode: string; animated: boolean;
  colors: Record<string, string>; chips: string[];
  font: Font; head: Font; mono: Font;
  scale: number; leading: number; density: string; radius: number; glass: number; depth: number;
  bg: { kind: string; style: string; angle: number; blend: number; spread: number; colors: string[]; dim: number; blur: number; scene: string; intensity: number; image: string; imageHost: string };
  surfaces?: Record<string, unknown>;
  contrast: { label: string; min: number; ratio: number; pass: boolean }[];
  // Look parts (a glaze2 code): what the Look adds, and how to draw a shader or layers background. Both are optional.
  parts?: { background?: unknown; animations?: unknown[]; effects?: unknown[]; cursor?: unknown; nav?: unknown; rules?: unknown };
  live?: unknown;
};
export type Look = Described & {
  id: string; name: string; created: string; tags: string[]; code: string;
  author?: string; credit?: string; previews?: { mode: string; src: string }[];
};

export const ROLES = ['--gz-accent', '--gz-accent-hi', '--gz-accent-soft', '--gz-accent-ink', '--gz-surface', '--gz-surface-2', '--gz-ink', '--gz-ink-muted', '--gz-ink-faint', '--gz-line', '--gz-line-strong', '--gz-ok', '--gz-warn', '--gz-err'];
// Frost, Glaze's default palette: what a missing or malformed color falls back to.
const FROST = ['#17c8f4', '#6fdcff', '#082f49', '#04121f', '#0d1b2e', '#060d18', '#e8f2fa', '#8fa8c0', '#5c7189', '#16283f', '#24405f', '#34d399', '#fbbf24', '#f87171'];
const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const word = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const FAMILIES = ['sans', 'serif', 'mono'] as const;
export const BG_KINDS = ['solid', 'gradient', 'image', 'aurora', 'scene', 'shader', 'layers'] as const;
const STYLES = ['linear', 'radial', 'conic', 'mesh'] as const;
const DENSITY = { compact: 0.8, cozy: 1, roomy: 1.2 } as const;

// Glaze's GZ_GRADIENT (defaults.js), from the same numbers: each color holds for (1 - blend) of its share, then melts
// into the next, over `spread` of the box.
const gradient = (style: string, angle: number, blend: number, spread: number) => {
  const cols = ['var(--lp-bg-1)', 'var(--lp-bg-2)', 'var(--lp-bg-3)'];
  const pct = (v: number) => `${+(v * 100).toFixed(2)}%`;
  const stops = (list: string[], start: number, len: number) => {
    const step = len / (list.length - 1);
    const hold = ((1 - blend / 100) * step) / 2;
    return list.map((c, i) => `${c} ${pct(Math.max(start, start + i * step - hold))} ${pct(Math.min(start + len, start + i * step + hold))}`).join(', ');
  };
  const s = spread / 100;
  const at = (deg: number, r: number) => `${pct(0.5 + Math.sin((deg * Math.PI) / 180) * r)} ${pct(0.5 - Math.cos((deg * Math.PI) / 180) * r)}`;
  const linear = `linear-gradient(${angle}deg in oklab, ${stops(cols, 0.5 - s / 2, s)})`;
  if (style === 'radial') return `radial-gradient(circle farthest-corner at ${at(angle, 0.4)} in oklab, ${stops(cols, 0, s)})`;
  if (style === 'conic') return `conic-gradient(from ${angle}deg at 50% 50% in oklab, ${stops([...cols, cols[0]], 0, 1)})`;
  if (style === 'mesh') {
    const glow = (c: string, deg: number) => `radial-gradient(circle at ${at(deg, 0.5)} in oklab, ${c} ${pct((1 - blend / 100) * 0.2 * s)}, transparent ${pct(0.6 * s)})`;
    return `${glow(cols[2], angle - 90)}, ${glow(cols[0], angle + 90)}, ${linear}`;
  }
  return linear;
};

// The CSS custom properties and data attributes one preview is painted with.
export function previewState(d: Partial<Described>) {
  const c = d.colors || {};
  const bg = (d.bg || {}) as Partial<Described['bg']>;
  const kind = word(bg.kind, BG_KINDS, 'solid');
  const style = word(bg.style, STYLES, 'linear');
  const surface = d.surfaces || {};
  const own = Array.isArray(bg.colors) ? bg.colors : [];
  const vars: Record<string, string> = Object.fromEntries(ROLES.map((r, i) => [r, hex(c[r], FROST[i])]));
  [0, 1, 2].forEach((i) => { vars[`--lp-bg-${i + 1}`] = hex(own[i], vars[['--gz-accent', '--gz-accent-hi', '--gz-ink-muted'][i]]); });
  vars['--lp-scale'] = String(num(d.scale, 0.85, 1.25, 1));
  vars['--lp-leading'] = String(num(d.leading, 1.2, 2, 1.5));
  vars['--lp-radius'] = String(num(d.radius, 0, 24, 12));
  vars['--lp-glass'] = String(num(d.glass, 0, 24, 12));
  vars['--lp-depth'] = String(num(d.depth, 0, 3, 1));
  vars['--lp-pad'] = String(DENSITY[word(d.density, ['compact', 'cozy', 'roomy'] as const, 'cozy')]);
  // A scene, a shader and layers sit toward the ground by the Look's intensity (Glaze's GZ_SCENE_LOOK); until one is drawn,
  // or when it can't be, the gradient under it shows, dimmed the same way.
  const drawn = kind === 'scene' || kind === 'shader' || kind === 'layers';
  vars['--lp-dim'] = String(num(drawn ? 75 * (1 - num(bg.intensity, 0, 100, 50) / 100) : bg.dim, 0, 90, 60) / 100);
  vars['--lp-blur'] = String(kind === 'shader' || kind === 'layers' ? 0 : num(bg.blur, 0, 20, 0));
  vars['--lp-angle'] = `${num(bg.angle, 0, 360, 135)}deg`;
  if (kind === 'gradient' || kind === 'shader' || kind === 'layers') vars['--lp-bg-image'] = gradient(style, num(bg.angle, 0, 360, 135), num(bg.blend, 0, 100, 100), num(bg.spread, 20, 200, 100));
  vars['--lp-surface-color'] = surface.surfaceCustom === true ? hex(surface.surfaceColor, vars['--gz-surface']) : vars['--gz-surface'];
  vars['--lp-surface-tint'] = `${num(surface.surfaceTint, 0, 100, 0)}%`;
  const opacity = num(surface.surfaceOpacity, -1, 100, -1);
  vars['--lp-opacity'] = `${kind === 'solid' || d.glass === 0 ? 100 : opacity < 0 ? 100 - num(d.glass, 0, 24, 12) * 1.6 : opacity}%`;
  vars['--lp-shadow-color'] = surface.shadowCustom === true ? hex(surface.shadowColor, '#000000') : '#000000';
  vars['--lp-shadow-alpha'] = `${num(surface.shadowStrength, 0, 100, 35) / 35 * num(d.depth, 0, 3, 1) * 9}%`;
  vars['--lp-border'] = `${num(surface.surfaceBorder, 0, 100, 100)}%`;
  vars['--lp-frost'] = String(num(surface.surfaceFrost, 0, 100, 0) / 100);
  const fam = (f: Font | undefined) => word(f?.family, FAMILIES, 'sans');
  const data = {
    bg: kind, font: fam(d.font), head: fam(d.head ?? d.font), mono: d.mono ? fam(d.mono) : 'mono',
    animated: String(kind === 'aurora' || kind === 'scene' || ((kind === 'shader' || kind === 'layers') && d.animated === true)),
  };
  return { vars, data };
}

// Paint a rendered preview (LookPreview.astro's markup) in the browser: setProperty and dataset only.
export function paintPreview(el: HTMLElement, d: Partial<Described>) {
  const { vars, data } = previewState(d);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  if (!vars['--lp-bg-image']) el.style.removeProperty('--lp-bg-image');
  Object.assign(el.dataset, data);
  const host = el.querySelector<HTMLElement>('[data-f="host"]');
  if (host) host.textContent = typeof d.bg?.imageHost === 'string' ? d.bg.imageHost : '';
  el.querySelector('.lp-bg img')?.remove();
  // A shader or layers background is drawn live, while the preview is on screen; anything else stops what was drawn there.
  watch(el, d.bg?.kind === 'shader' || d.bg?.kind === 'layers' ? liveSpec(d.live) : null);
}

// A https image address, or ''.
export const httpsUrl = (v: unknown) => { try { const u = new URL(String(v)); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };

// Another site's image, fetched only on the student's click, without a referrer, into a preview's background.
export function showImage(preview: HTMLElement, url: string, name: string) {
  const src = httpsUrl(url);
  if (!src) return;
  const img = Object.assign(document.createElement('img'), { src, alt: '', referrerPolicy: 'no-referrer', decoding: 'async' });
  preview.querySelector('.lp-bg')?.append(img);
  preview.dataset.imageShown = 'true';
  preview.setAttribute('aria-label', `${name}: open a large preview, with its background image`);
}

const fontLine = (d: Partial<Described>) => {
  if (d.kind !== 'look' || !d.font) return 'Keeps your fonts and background; changes your colors.';
  const head = d.head && d.head.id !== d.font.id ? `, headings in ${d.head.name}` : '';
  return `Text in ${d.font.name}${head}. Shown here in a ${d.font.family === 'serif' ? 'serif' : d.font.family === 'mono' ? 'monospace' : 'sans-serif'} stand-in: this page loads no web fonts.`;
};
export { fontLine };

// What else a Look changes, besides its colors, fonts, shape and background (a glaze2 code's parts), as badges.
export const PART_TAGS: [string, string][] = [['animations', 'Animations'], ['effects', 'Effects'], ['cursor', 'Cursor'], ['nav-layout', 'Nav layout'], ['page-tweaks', 'Page tweaks']];
export const TAG_LABELS: Record<string, string> = {
  minimal: 'Minimal', colorful: 'Colorful', gradient: 'Gradient', serif: 'Serif', monospace: 'Monospace', seasonal: 'Seasonal',
  'high-contrast': 'High contrast', 'low-vision': 'Low vision', 'dyslexia-friendly': 'Dyslexia-friendly', 'color-blind-safe': 'Color-blind safe',
  dark: 'Dark', light: 'Light', animated: 'Animated', look: 'Look', palette: 'Palette', curated: 'Curated', community: 'Community',
  ...Object.fromEntries(PART_TAGS),
};
const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : !!v && typeof v === 'object');
// Which part of a Look's `parts` each badge is for.
const PART_OF = { animations: 'animations', effects: 'effects', cursor: 'cursor', 'nav-layout': 'nav', 'page-tweaks': 'rules' } as const;
export const partTags = (p: Look['parts']) => (p && typeof p === 'object' ? PART_TAGS.map(([t]) => t).filter((t) => filled(p[PART_OF[t as keyof typeof PART_OF]])) : []);
export const cardTags = (l: Pick<Look, 'kind' | 'mode' | 'animated' | 'tags' | 'parts'>, source: string) => [source, l.kind, l.mode, ...(l.animated ? ['animated'] : []), ...partTags(l.parts), ...l.tags];
export const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const ID = /^[a-z0-9]+(?:-[a-z0-9]+){0,7}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// A community card from the page's <template> (LookCard.astro, rendered empty): text through textContent, colors
// through setProperty, the code and name into data attributes for Copy code and Glaze's own gallery script.
export function fillCard(tpl: HTMLTemplateElement, l: Look): HTMLElement | null {
  if (typeof l?.id !== 'string' || !ID.test(l.id) || typeof l.name !== 'string' || typeof l.code !== 'string' || !/^glaze[12]:[\w-]+$/.test(l.code)) return null;
  const card = (tpl.content.firstElementChild as HTMLElement).cloneNode(true) as HTMLElement;
  const f = (k: string) => card.querySelector<HTMLElement>(`[data-f="${k}"]`)!;
  const tags = cardTags({ kind: l.kind === 'look' ? 'look' : 'palette', mode: l.mode === 'light' ? 'light' : 'dark', animated: !!l.animated, parts: l.parts, tags: (Array.isArray(l.tags) ? l.tags : []).filter((t) => Object.hasOwn(TAG_LABELS, t)) }, 'community');
  const credit = typeof l.credit === 'string' ? l.credit : '';
  const created = typeof l.created === 'string' && DATE.test(l.created) ? l.created : '';
  card.id = l.id;
  Object.assign(card.dataset, { name: l.name, created, tags: tags.join(' '), search: [l.name, credit, ...tags.map((t) => TAG_LABELS[t])].join(' ').toLowerCase() });
  const preview = card.querySelector<HTMLElement>('.lp')!;
  paintPreview(preview, l);
  preview.setAttribute('aria-label', `${l.name}: open a large preview`);
  preview.dataset.title = l.name;
  f('name').textContent = l.name;
  f('name').setAttribute('href', `#${l.id}`);
  f('kind').textContent = l.kind === 'look' ? 'Look' : 'Palette';
  f('credit').textContent = credit;
  f('date').textContent = created ? day(created) : '';
  if (created) f('date').setAttribute('datetime', created);
  f('font').textContent = fontLine(l);
  const chips = f('chips');
  const colors = (Array.isArray(l.chips) ? l.chips : []).filter((c) => HEX.test(c)).slice(0, 6);
  chips.setAttribute('aria-label', `Colors: ${colors.join(', ')}`);
  for (const c of colors) { const i = document.createElement('i'); i.style.setProperty('background', c); chips.append(i); }
  for (const t of tags.filter((t) => t !== l.kind && t !== 'community')) f('tags').append(Object.assign(document.createElement('li'), { textContent: TAG_LABELS[t] }));
  const image = httpsUrl(l.bg?.image);
  if (l.bg?.kind === 'image' && image) {
    f('image').hidden = false;
    f('imagehost').textContent = new URL(image).hostname;
    f('show').dataset.image = image;
  } else f('image').remove();
  const use = f('use');
  Object.assign(use.dataset, { code: l.code, name: l.name, author: credit });
  f('copy').dataset.copy = l.code;
  f('code').textContent = l.code;
  return card;
}

// One <dialog> per page shows a preview large: a copy of the clicked one. Esc closes it (the browser's own), and
// focus goes back to the preview that opened it.
export function wireDialog(root: ParentNode = document) {
  const dialog = document.querySelector<HTMLDialogElement>('#look-dialog');
  if (!dialog) return;
  const stage = dialog.querySelector<HTMLElement>('.look-dialog-stage')!;
  const title = dialog.querySelector<HTMLElement>('.look-dialog-title')!;
  let opener: HTMLElement | null = null;
  root.addEventListener('click', (e) => {
    const p = (e.target as Element).closest?.<HTMLElement>('button.lp');
    if (!p || dialog.contains(p)) return;
    opener = p;
    const copy = p.cloneNode(true) as HTMLElement;
    copy.removeAttribute('aria-label');
    copy.setAttribute('tabindex', '-1');
    copy.setAttribute('aria-hidden', 'true');
    stripLive(copy);
    stage.replaceChildren(copy);
    // The large preview draws its own copy of a shader or layers background.
    watch(copy, specOf(p));
    title.textContent = p.dataset.title || 'Preview';
    dialog.showModal();
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { for (const lp of stage.querySelectorAll<HTMLElement>('.lp')) unwatch(lp); stage.replaceChildren(); opener?.focus(); opener = null; });
}
