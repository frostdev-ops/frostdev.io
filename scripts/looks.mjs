// The Glaze Looks gallery's checks, shared by the page build, CI and the gallery server (server/gallery.mjs).
// Curated entries are src/data/looks/<id>.json, with optional screenshots in public/projects/glaze/looks/.
// loadLooks() reads and checks them all; the gallery page builds from it and refuses to build on any problem.
// checkCode(), checkMeta() and describe() are the same checks and the same description for one code, which the
// server runs on community submissions. CI runs this file directly, which prints every problem and fails on any:
//   node scripts/looks.mjs [entries dir] [previews dir]
// Theme codes are read by Glaze's own code, pinned in vendor/glaze (scripts/vendor-glaze.sh), so a code
// passes here exactly when that Glaze would take it whole. That includes glaze2 codes (Look parts: shader and layer
// backgrounds, animations, effects, a cursor effect, a nav layout, rules for school pages), which Glaze's decoder
// cleans part by part; describe() says what they are for the cards, the live preview and both reviewers.
import crypto from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Paths are from the repository root: npm scripts, the Astro build, CI and the server's image all run there.
const root = process.cwd();
const glaze = createRequire(path.join(root, 'vendor/glaze/'));
const SHARE = glaze('./lib/share.js');
const { GZ_COLORS, GZ_SPEC, GZ_CONTRAST, GZ_BG_COLORS, GZ_SCENE_LOOK } = glaze('./defaults.js');
const COLOR = glaze('./lib/color.js');
const FONTS = glaze('./lib/fonts.js');
const XPARTS = glaze('./lib/lookparts.js');
const GLSL = glaze('./lib/glsl.js');
const MX = glaze('./lib/motionx.js');
// lib/lookparts.js looks for the shader checker and the parts registry by their global names, as Glaze loads them on a
// page; without them a shader would not be checked and rules would only be checked for their shape.
globalThis.GZ_GLSL ??= GLSL;
globalThis.GZ_PARTS ??= glaze('./lib/parts.js');
// [CSS variable, what it's for] for the 14 palette roles, in Glaze's order.
export const ROLES = GZ_COLORS.map(([v, label]) => [v, label]);
export const GLAZE_VERSION = readFileSync(path.join(root, 'vendor/glaze/VERSION'), 'utf8').trim();

// Tags a submitter picks. Kind (look or palette), light or dark, and animated come from the code itself.
// The accessibility tags and gradient, serif and monospace are checked against the code; minimal, colorful and
// seasonal are a judgment (the review model's, for community Looks); color-blind-safe is a maintainer's call,
// so only curated entries carry it.
export const TAGS = {
  minimal: 'Minimal', colorful: 'Colorful', gradient: 'Gradient', serif: 'Serif', monospace: 'Monospace', seasonal: 'Seasonal',
  'high-contrast': 'High contrast', 'low-vision': 'Low vision', 'dyslexia-friendly': 'Dyslexia-friendly', 'color-blind-safe': 'Color-blind safe',
};
export const SUBJECTIVE = ['minimal', 'colorful', 'seasonal'];
export const MAINTAINER_ONLY = ['color-blind-safe'];
export const MAX_TAGS = 6;
const KEYS = ['name', 'author', 'created', 'tags', 'previews', 'code'];
const OPTIONAL = ['previews'];
const MODES = ['light', 'dark'];
// Glaze takes codes up to 4,000 characters; a palette and a full Look are under 400.
export const MAX_CODE = 1200;
// A glaze2 code (Look parts) is up to 20,000 characters and 48 KiB of JSON in Glaze; the gallery takes all of that.
export const MAX_CODE2 = SHARE.MAX_CODE2;
const MAX_PREVIEW = 200 * 1024;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+){0,7}$/;
// GitHub's rules for a username.
const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
// Control, format (bidi overrides, zero-width) and private-use characters have no place in a name.
const ODD = /[\p{Cc}\p{Cf}\p{Co}\p{Cs}]/u;
// A community credit: a name to show, never a link or a handle to follow.
const CREDIT = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,31}$/u;
const DOMAINISH = /[\p{L}\p{N}-]\.[a-z]{2,}\b|https?|www\./iu;

const contrast = (c, a, b) => COLOR.contrast(c[a], c[b]);
// What a font setting is, with the fallback stack the preview paints with (web fonts aren't loaded there).
const font = (v) => {
  const f = typeof v === 'string' ? FONTS.resolve(v) : null;
  if (!f) return null;
  const fb = f.stack || f.fb;
  const family = /monospace$/.test(fb) ? 'mono' : /(^|, )serif$/.test(fb) ? 'serif' : 'sans';
  return { id: f.id, name: f.name, group: f.group, fb, family };
};
// The checks a tag must pass, given the decoded code: '' when it does, else why not.
const CLAIMS = {
  'high-contrast': (got) => (contrast(got.colors, '--gz-ink', '--gz-surface') >= 7 && contrast(got.colors, '--gz-ink-muted', '--gz-surface') >= 4.5
    && contrast(got.colors, '--gz-accent-ink', '--gz-accent') >= 4.5 ? '' : 'text on the surface needs 7:1, muted text 4.5:1 and text on the accent 4.5:1'),
  'low-vision': (got) => ((got.look.scale ?? 0) >= 1.1 ? '' : 'the text size needs to be 110% or more'),
  'dyslexia-friendly': (got) => {
    const f = font(got.look.font);
    return f && (f.group === 'Readable' || f.id === 'atkinson') ? '' : "the text font needs to be one of Glaze's Readable fonts";
  },
  gradient: (got) => (got.bg.kind === 'gradient' ? '' : 'the background needs to be a gradient'),
  serif: (got) => (font(got.look.font)?.family === 'serif' ? '' : 'the text font needs to be a serif font'),
  monospace: (got) => (['Mono', 'Nerd Fonts'].includes(font(got.look.font)?.group) || font(got.look.font)?.family === 'mono' ? '' : 'the text font needs to be a monospace font'),
};

// A screenshot has to decode as a whole WebP image of a sensible size, not just start like one.
const PREVIEW_SIZE = { width: [640, 2560], height: [240, 1600] };
const preview = async (file) => {
  const b = readFileSync(file);
  if (b.length < 12 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP' || b.readUInt32LE(4) + 8 !== b.length) return "isn't a whole WebP image";
  // sharp comes with Astro (its image service), so decoding adds no dependency of our own. Loaded only here: the
  // server checks codes, never screenshots, and its image has no sharp.
  const { default: sharp } = await import('sharp');
  let info;
  try { ({ info } = await sharp(b, { failOn: 'warning' }).raw().toBuffer({ resolveWithObject: true })); } catch (err) { return `doesn't decode (${err.message})`; }
  const fits = (k) => info[k] >= PREVIEW_SIZE[k][0] && info[k] <= PREVIEW_SIZE[k][1];
  return fits('width') && fits('height') ? '' : `is ${info.width}×${info.height}; previews are ${PREVIEW_SIZE.width.join('–')} wide and ${PREVIEW_SIZE.height.join('–')} tall`;
};

// A shader the way two copies of it agree: no comments, indentation or blank lines (comments are stripped at encode, but
// a code made by hand may keep them, and a copy must not become a different Look by that).
const shaderKey = (src) => src.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ' ').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
const sorted = (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v);
// What makes a Look this Look, whatever its code looks like: everything Glaze decodes, in a fixed order. A glaze1 code has
// no parts, and the decoder's `parts: null` is left out, so a glaze1 Look keeps the identity it had before parts existed.
// Parts are part of the identity: the same colors with another shader are another Look.
const identity = ({ parts, ...rest }) => {
  if (!parts) return rest;
  const x = parts.x?.bg?.shader ? { ...parts.x, bg: { ...parts.x.bg, shader: { src: shaderKey(parts.x.bg.shader.src) } } } : parts.x;
  return { ...rest, parts: { ...parts, x } };
};

// One theme code: { problems, look } where look is what Glaze decodes it to (null when it refuses it).
export async function checkCode(code) {
  // glaze1 as ever (1,200 characters here, Glaze takes 4,000); glaze2, which carries Look parts, up to Glaze's own limits.
  const v2 = typeof code === 'string' && code.startsWith('glaze2:');
  if (typeof code !== 'string' || !(v2 ? /^glaze2:[\w-]+$/ : /^glaze1:[\w-]+$/).test(code) || code !== code.trim() || code.length > (v2 ? MAX_CODE2 : MAX_CODE)) {
    return { problems: [`the code must be a Glaze theme code of at most ${MAX_CODE} characters, or a glaze2: code (Look parts) of at most ${MAX_CODE2}`], look: null };
  }
  let got;
  try { got = await SHARE.decode(code); } catch (err) { return { problems: [`Glaze ${GLAZE_VERSION} refuses the code: ${err.message}`], look: null }; }
  const problems = [];
  // An image address is fetched by whoever wears the Look, so it's only allowed where it's shown.
  if (got.bg.image && got.bg.kind !== 'image') problems.push("the code carries a background image address it doesn't use; clear the image in Glaze and copy the code again");
  if (got.bg.image && !got.bg.image.startsWith('https:')) problems.push('a background image must be an https: address');
  // Pictures for the course menu or the course cards would load from other sites too, with no host shown here.
  if (got.nav.u || got.cards.some((c) => c.u)) problems.push('the code links pictures for the course menu or course cards; the gallery takes a background image only, so remove those pictures in Glaze and copy the code again');
  if (v2) problems.push(...partsProblems(got));
  return { problems, look: got, fingerprint: crypto.createHash('sha256').update(JSON.stringify(identity(got), sorted)).digest('base64url') };
}

// What a glaze2 code may not carry in the gallery, beyond what Glaze's decoder has already refused (a shader its checker
// refuses, a rule it can't clean, any part that doesn't come back unchanged).
const partsProblems = (got) => {
  const out = [];
  const x = got.parts?.x;
  // Glaze writes glaze1 when a Look has no parts, so a glaze2 code without any is not one Glaze made.
  if (!x && !got.parts?.m) out.push('a glaze2: code must carry Look parts; this one has none, so copy it again from Glaze (it should start with glaze1:)');
  if (got.parts?.m) out.push("the code lists mods it works with; the gallery takes Look parts only for now, so remove the mods in Glaze and copy the code again");
  // A shader or layers the background doesn't use would be weight no one sees, and nothing the reviewers could judge.
  const kind = got.bg.kind;
  if (x?.bg?.shader && kind !== 'shader') out.push("the code carries a shader background it doesn't use; set the background to the shader, or remove the shader, and copy the code again");
  if (x?.bg?.layers && kind !== 'layers') out.push("the code carries background layers it doesn't use; set the background to layers, or remove them, and copy the code again");
  if (kind === 'shader' && !x?.bg?.shader) out.push('the background is a shader, but the code has no shader');
  if (kind === 'layers' && !x?.bg?.layers) out.push('the background is layers, but the code has no layers');
  return out;
};

// A name, a community credit (when given) and tags, the tags checked against the decoded code. partial: check only
// the fields given (the submit page's live check, as the student fills the form in).
export function checkMeta({ name, credit, tags }, got, { community = false, partial = false } = {}) {
  const problems = [];
  if (partial && name === undefined) { /* not typed yet */ } else if (typeof name !== 'string' || !name.trim() || name !== name.trim() || [...name].length > 40 || ODD.test(name)) problems.push('the name must be 1 to 40 plain characters, no spaces at either end');
  if (credit !== undefined && (typeof credit !== 'string' || !CREDIT.test(credit) || credit !== credit.trim() || DOMAINISH.test(credit))) {
    problems.push('the credit must be 1 to 32 letters, digits, spaces, dots, dashes or underscores, and not a link or an @handle');
  }
  if (partial && tags === undefined) return problems;
  const list = Array.isArray(tags) ? tags : [];
  if (!Array.isArray(tags) || tags.length > MAX_TAGS || new Set(tags).size !== tags.length) problems.push(`tags must be a list of up to ${MAX_TAGS} different tags`);
  for (const t of list) {
    if (typeof t !== 'string' || !Object.hasOwn(TAGS, t)) problems.push(`unknown tag "${String(t).slice(0, 40)}"; the tags are ${Object.keys(TAGS).join(', ')}`);
    else if (community && MAINTAINER_ONLY.includes(t)) problems.push(`${t} can't be checked from the code, so the gallery only gives it to Looks a maintainer has checked; leave it off`);
    else if (got) {
      const why = CLAIMS[t]?.(got);
      if (why) problems.push(`tagged ${t}, but ${why}`);
    }
  }
  return problems;
}

// A look group is more than a palette when it sets something other than the surface defaults Glaze 3 always decodes,
// or when it carries Look parts.
const isLook = (got) => Object.keys(got.bg).length > 0 || !!got.parts?.x
  || Object.entries(got.look).some(([k, v]) => !/^(surface|shadow)/.test(k) || JSON.stringify(v) !== JSON.stringify(GZ_SPEC.look[k][0]));
const d = (g, k, got) => got[g][k] ?? GZ_SPEC[g][k][0];
const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ''; } };

// ---- Look parts ---------------------------------------------------------------------------------------------------------
// What a glaze2 code's parts (x) come to, in three pieces. Every value came through Glaze's own cleaners (lib/lookparts.js),
// so colors are palette tokens or #rrggbb, numbers are in range and words are from Glaze's lists.
//   parts: a faithful, compact description, which the reviewers read and the cards' badges come from. No free text in it:
//          names are Glaze's own (moments, events, kinds, part names), and a link is its host.
//   text:  the free text the parts carry (group labels, link names and addresses, rule labels), which only the safety
//          review reads: it is judged as the name and credit are, and the host of a link counts as advertising.
//   live:  what the preview draws a shader or layers background with (the shader's source, the colors, how far they sit
//          from the ground), already resolved to #rrggbb.
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const spans = (stops, key) => { const v = stops.map((s) => s[key]).filter((n) => n !== undefined); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
const byKey = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const hash12 = (x) => crypto.createHash('sha256').update(x).digest('base64url').slice(0, 12);
function describeParts(x, got, bgKind) {
  const ink = (c) => (c[0] === '#' ? c : got.colors[`--gz-${c}`]);
  const out = {}, text = {};
  let live = null, animated = false;
  if (bgKind === 'shader' && x.bg?.shader) {
    const src = x.bg.shader.src;
    out.background = { kind: 'shader', bytes: src.length, lines: src.split('\n').length, estimatedCost: GLSL.estimate(src), costLimit: GLSL.COST_LIMIT, key: hash12(shaderKey(src)) };
    animated = /\buTime\b/.test(src);
    live = { kind: 'shader', src };
  } else if (bgKind === 'layers' && x.bg?.layers) {
    const layers = x.bg.layers.map((l) => ({ ...XPARTS.DEFAULTS.layer[l.k], ...l, ...(l.c && { c: l.c.map(ink) }) }));
    out.background = { kind: 'layers', layers, key: hash12(JSON.stringify(layers.map(({ c, ...rest }) => rest))) };
    animated = layers.some((l) => l.k !== 'gradient' && l.speed > 0);
    live = { kind: 'layers', layers };
  }
  if (live) {
    const t = GZ_SCENE_LOOK(d('bg', 'intensity', got));
    // The ground and the three colors a scene is drawn with, and how far they sit from it, as Glaze's content.js hands them to lib/scene.js.
    Object.assign(live, { ground: got.colors['--gz-surface-2'], colors: GZ_BG_COLORS(d('bg', 'colors', got), got.colors), dim: t.dim, amount: t.amount, pace: t.pace });
  }
  if (x.anim) {
    out.animations = MX.MOMENTS.filter((m) => x.anim[m]).map((m) => {
      const a = x.anim[m];
      const ranges = Object.fromEntries(Object.keys(MX.RANGE).map((k) => [k, spans(a.s, k)]).filter(([, r]) => r));
      return { moment: m, stops: a.s.length, ...pick(a, ['ms', 'delay', 'stagger']), ranges };
    });
  }
  if (x.fx) out.effects = MX.EVENTS.filter((e) => x.fx[e]).map((e) => ({ event: e, ...pick(x.fx[e], ['kind', 'count', 'life', 'size']) }));
  if (x.cursor) out.cursor = pick(x.cursor, ['kind', 'size', 'len', 'fade']);
  if (x.nav) {
    const n = x.nav;
    const host = Object.fromEntries((n.links || []).map((l) => [`link:${l.id}`, `link:${hostOf(l.u)}`]));
    out.nav = {
      ...(n.place && { place: n.place }),
      ...(n.groups && { groups: n.groups.map((g) => ({ labelled: !!g.label, items: g.items.map((id) => host[id] || id) })) }),
      ...(n.hidden && { hidden: n.hidden }),
      ...(n.links && { links: n.links.map((l) => ({ host: hostOf(l.u), icon: l.i })) }),
      ...(n.icons && { icons: Object.keys(n.icons).length }),
    };
    const groups = (n.groups || []).map((g) => g.label).filter(Boolean);
    if (groups.length) text.groups = groups;
    if (n.links?.length) text.links = n.links.map((l) => ({ name: l.n, url: l.u }));
  }
  if (x.rules) {
    const count = (key) => byKey(x.rules.reduce((o, r) => ({ ...o, [r[key]]: (o[r[key]] || 0) + 1 }), {}));
    out.rules = { count: x.rules.length, byAction: count('do'), byPart: count('p') };
    const labels = x.rules.filter((r) => r.t).map((r) => ({ part: r.p, text: r.t }));
    if (labels.length) text.labels = labels;
  }
  return { parts: out, text: Object.keys(text).length ? text : null, live, animated };
}

// Everything a card and a live preview need from a decoded code. Every value came through GZ_SANITIZE: colors
// are #rrggbb, numbers are in Glaze's ranges, words are from its fixed lists. A palette keeps the wearer's own
// fonts, shape and background, so those are Glaze's defaults here, and font is null. A glaze2 code's parts come with
// it (describeParts): `parts` and `live` for a code that has them, `partsText` when they carry free text.
export function describe(got) {
  const kind = isLook(got) ? 'look' : 'palette';
  const L = (k) => d('look', k, got);
  const B = (k) => d('bg', k, got);
  const text = kind === 'look' ? font(L('font')) : null;
  const bgKind = kind === 'look' ? B('kind') : 'solid';
  const more = got.parts?.x ? describeParts(got.parts.x, got, bgKind) : null;
  return {
    kind,
    mode: COLOR.brightness(COLOR.parse(got.colors['--gz-surface'])) < 0.5 ? 'dark' : 'light',
    animated: ['scene', 'aurora'].includes(bgKind) || !!more?.animated,
    colors: Object.fromEntries(GZ_COLORS.map(([v]) => [v, got.colors[v]])),
    chips: ['--gz-surface-2', '--gz-surface', '--gz-accent', '--gz-accent-hi', '--gz-ink-muted', '--gz-ink'].map((v) => got.colors[v]),
    font: text,
    head: kind === 'look' ? (L('head') === 'auto' ? text : font(L('head'))) : null,
    mono: kind === 'look' && L('mono') !== 'auto' ? font(L('mono')) : null,
    scale: L('scale'), leading: L('leading'), density: L('density'),
    radius: L('radius'), glass: L('glass'), depth: L('depth'),
    surfaces: Object.fromEntries(Object.keys(GZ_SPEC.look).filter((k) => /^(surface|shadow)/.test(k)).map((k) => [k, L(k)])),
    bg: {
      kind: bgKind, style: B('style'), angle: B('angle'), blend: B('blend'), spread: B('spread'),
      colors: GZ_BG_COLORS(B('colors'), got.colors), dim: B('dim'), blur: B('blur'), grain: B('grain'),
      scene: bgKind === 'scene' ? B('scene') : '', intensity: B('intensity'),
      image: bgKind === 'image' ? B('image') : '', imageHost: bgKind === 'image' ? hostOf(B('image')) : '',
    },
    contrast: GZ_CONTRAST(got.colors).map(({ label, min, ratio, pass }) => ({ label, min, ratio: Math.round(ratio * 100) / 100, pass })),
    ...(more && { parts: more.parts, ...(more.live && { live: more.live }), ...(more.text && { partsText: more.text }) }),
  };
}

// ---- distance between two Looks -------------------------------------------------------------------------------------
// OKLab (perceptual): 0.01 is about the smallest color step people notice side by side.
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const oklab = (hex) => {
  const { r, g, b } = COLOR.parse(hex);
  const [l, m, s] = [[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]]
    .map(([x, y, z]) => Math.cbrt(x * lin(r) + y * lin(g) + z * lin(b)));
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const delta = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i])) * 100;
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
// How far apart two described Looks are: the mean perceptual color difference over the 14 palette roles (OKLab x100,
// so ~1 is a just-noticeable step), plus 10 for a different text font (5 if it's the same kind of font), plus 10 for
// a different background kind (5 for a different scene or gradient style, else half the background colors' mean
// difference), plus 3 for each other kind of part that differs. 0 is the same Look. For scale: Glaze's own dark palettes Frost and Midnight (cyan and violet accents
// on near-black) are 4.6 apart, as palettes; a Look and the palette it's built on are about 20 apart. It ranks
// neighbours for the review; it decides nothing itself.
export function distance(a, b) {
  const colors = mean(GZ_COLORS.map(([v]) => delta(a.colors[v], b.colors[v])));
  const fontGap = a.font?.id === b.font?.id ? 0 : a.font?.family === b.font?.family ? 5 : 10;
  // A shader or a layer stack is a background of its own: another one is as different as another kind of background, and
  // the same one with other colors is only a recolor (half the background colors' difference, as for a gradient).
  const custom = ['shader', 'layers'].includes(a.bg.kind);
  const bgGap = a.bg.kind !== b.bg.kind || (custom && a.parts?.background?.key !== b.parts?.background?.key) ? 10
    : (a.bg.kind === 'scene' && a.bg.scene !== b.bg.scene) || (a.bg.kind === 'gradient' && a.bg.style !== b.bg.style) ? 5
      : a.bg.kind === 'solid' ? 0 : mean(a.bg.colors.map((c, i) => delta(c, b.bg.colors[i]))) / 2;
  // Each other part that differs (animations, effects, the cursor, the nav layout, the rules) adds 3. Looks without parts
  // have none, so two of them are as far apart as ever.
  const partsGap = ['animations', 'effects', 'cursor', 'nav', 'rules'].filter((k) => JSON.stringify(a.parts?.[k]) !== JSON.stringify(b.parts?.[k])).length * 3;
  return Math.round((colors + fontGap + bgGap + partsGap) * 10) / 10;
}

// The `n` nearest of `looks` (each with a .described) to a described Look.
export const nearest = (desc, looks, n = 3) => looks.map((l) => ({ look: l, distance: distance(desc, l.described) }))
  .sort((x, y) => x.distance - y.distance).slice(0, n);

export async function loadLooks(entries = 'src/data/looks', previews = 'public/projects/glaze/looks') {
  const dir = path.resolve(root, entries);
  const pics = path.resolve(root, previews);
  const errors = [];
  const looks = [];
  const names = new Map();
  const codes = new Map();
  const files = readdirSync(dir).filter((f) => !f.startsWith('.')).sort();
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    const bad = (why) => errors.push(`${entries}/${file}: ${why}`);
    if (!file.endsWith('.json') || !ID.test(id)) { bad('the file name must be lowercase words joined by hyphens, ending .json'); continue; }
    let e;
    try { e = JSON.parse(readFileSync(path.join(dir, file), 'utf8')); } catch (err) { bad(`not valid JSON (${err.message})`); continue; }
    if (!e || typeof e !== 'object' || Array.isArray(e)) { bad('must be a JSON object'); continue; }
    const extra = Object.keys(e).filter((k) => !KEYS.includes(k));
    const missing = KEYS.filter((k) => !(k in e) && !OPTIONAL.includes(k));
    if (extra.length) bad(`unknown fields: ${extra.join(', ')}`);
    if (missing.length) { bad(`missing fields: ${missing.join(', ')}`); continue; }

    const { name, author, created, tags, previews: modes = [], code } = e;
    const { problems, look: got, fingerprint } = await checkCode(code);
    for (const p of problems) bad(p);
    for (const p of checkMeta({ name, tags }, got)) bad(p);
    if (typeof name === 'string' && name.trim()) {
      if (names.has(name.toLowerCase())) bad(`the name is also used by ${names.get(name.toLowerCase())}`);
      else names.set(name.toLowerCase(), file);
    }
    if (typeof code === 'string') {
      if (fingerprint && codes.has(fingerprint)) bad(`the same code is also in ${codes.get(fingerprint)}`);
      if (fingerprint) codes.set(fingerprint, file);
    }
    if (typeof author !== 'string' || !HANDLE.test(author)) bad('author must be a GitHub username');
    const day = typeof created === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(created) ? new Date(`${created}T00:00:00Z`) : null;
    if (!day || Number.isNaN(+day) || day.toISOString().slice(0, 10) !== created || +day > Date.now() + 864e5) bad('created must be a real date (YYYY-MM-DD), not in the future');
    const described = got && !problems.length ? describe(got) : null;

    // Screenshots are optional: the live preview is drawn from the code.
    const shots = Array.isArray(modes) ? modes : [];
    if (!Array.isArray(modes) || modes.some((m) => !MODES.includes(m)) || new Set(modes).size !== modes.length) bad('previews must list "light", "dark", both or neither');
    else if (described && modes.length && !modes.includes(described.mode)) bad(`this palette is ${described.mode}, so a screenshot of it needs to be ${described.mode} too`);
    for (const m of shots.filter((x) => MODES.includes(x))) {
      const pic = path.join(pics, `${id}-${m}.webp`);
      const rel = `${previews}/${id}-${m}.webp`;
      if (!existsSync(pic)) bad(`the preview ${rel} is missing`);
      else if (statSync(pic).size > MAX_PREVIEW) bad(`the preview ${rel} is over ${MAX_PREVIEW / 1024} KB`);
      else {
        const why = await preview(pic);
        if (why) bad(`the preview ${rel} ${why}`);
      }
    }
    if (!described) continue;
    looks.push({
      id, name, author, created, code, ...described,
      tags: Array.isArray(tags) ? tags : [],
      previews: MODES.filter((m) => shots.includes(m)).map((m) => ({ mode: m, src: `/${path.relative('public', `${previews}/${id}-${m}.webp`)}` })),
    });
  }
  // Preview files that no entry names: a leftover or a typo.
  if (existsSync(pics)) {
    const ids = new Set(files.map((f) => f.replace(/\.json$/, '')));
    for (const f of readdirSync(pics)) {
      const m = /^(.+)-(light|dark)\.webp$/.exec(f);
      if (!f.startsWith('.') && !(m && ids.has(m[1]))) errors.push(`${previews}/${f}: no entry uses this file`);
    }
  }
  return { looks, errors, checked: files.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [entries, previews] = process.argv.slice(2);
  const { errors, checked } = await loadLooks(entries, previews);
  for (const e of errors) console.error(`✗ ${e}`);
  console.log(`Checked ${checked} entries with Glaze ${GLAZE_VERSION}: ${errors.length} problem${errors.length === 1 ? '' : 's'}.`);
  if (errors.length) process.exitCode = 1;
}
