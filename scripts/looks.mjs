// The Glaze Looks gallery's checks, shared by the page build, CI and the gallery server (server/gallery.mjs).
// Curated entries are src/data/looks/<id>.json, with optional screenshots in public/projects/glaze/looks/.
// loadLooks() reads and checks them all; the gallery page builds from it and refuses to build on any problem.
// checkCode(), checkMeta() and describe() are the same checks and the same description for one code, which the
// server runs on community submissions. CI runs this file directly, which prints every problem and fails on any:
//   node scripts/looks.mjs [entries dir] [previews dir]
// Theme codes are read by Glaze's own code, pinned in vendor/glaze (scripts/vendor-glaze.sh), so a code
// passes here exactly when that Glaze would take it whole.
import crypto from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Paths are from the repository root: npm scripts, the Astro build, CI and the server's image all run there.
const root = process.cwd();
const glaze = createRequire(path.join(root, 'vendor/glaze/'));
const SHARE = glaze('./lib/share.js');
const { GZ_COLORS, GZ_SPEC, GZ_CONTRAST, GZ_BG_COLORS } = glaze('./defaults.js');
const COLOR = glaze('./lib/color.js');
const FONTS = glaze('./lib/fonts.js');
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

// One theme code: { problems, look } where look is what Glaze decodes it to (null when it refuses it).
export async function checkCode(code) {
  if (typeof code !== 'string' || !/^glaze1:[\w-]+$/.test(code) || code !== code.trim() || code.length > MAX_CODE) return { problems: [`the code must be a Glaze theme code of at most ${MAX_CODE} characters`], look: null };
  let got;
  try { got = await SHARE.decode(code); } catch (err) { return { problems: [`Glaze ${GLAZE_VERSION} refuses the code: ${err.message}`], look: null }; }
  const problems = [];
  // An image address is fetched by whoever wears the Look, so it's only allowed where it's shown.
  if (got.bg.image && got.bg.kind !== 'image') problems.push("the code carries a background image address it doesn't use; clear the image in Glaze and copy the code again");
  if (got.bg.image && !got.bg.image.startsWith('https:')) problems.push('a background image must be an https: address');
  // Pictures for the course menu or the course cards would load from other sites too, with no host shown here.
  if (got.nav.u || got.cards.some((c) => c.u)) problems.push('the code links pictures for the course menu or course cards; the gallery takes a background image only, so remove those pictures in Glaze and copy the code again');
  const canonical = JSON.stringify(got, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : v);
  return { problems, look: got, fingerprint: crypto.createHash('sha256').update(canonical).digest('base64url') };
}

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

// A look group is more than a palette when it sets something other than the surface defaults Glaze 3 always decodes.
const isLook = (got) => Object.keys(got.bg).length > 0
  || Object.entries(got.look).some(([k, v]) => !/^(surface|shadow)/.test(k) || JSON.stringify(v) !== JSON.stringify(GZ_SPEC.look[k][0]));
const d = (g, k, got) => got[g][k] ?? GZ_SPEC[g][k][0];
const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ''; } };

// Everything a card and a live preview need from a decoded code. Every value came through GZ_SANITIZE: colors
// are #rrggbb, numbers are in Glaze's ranges, words are from its fixed lists. A palette keeps the wearer's own
// fonts, shape and background, so those are Glaze's defaults here, and font is null.
export function describe(got) {
  const kind = isLook(got) ? 'look' : 'palette';
  const L = (k) => d('look', k, got);
  const B = (k) => d('bg', k, got);
  const text = kind === 'look' ? font(L('font')) : null;
  const bgKind = kind === 'look' ? B('kind') : 'solid';
  return {
    kind,
    mode: COLOR.brightness(COLOR.parse(got.colors['--gz-surface'])) < 0.5 ? 'dark' : 'light',
    animated: ['scene', 'aurora'].includes(bgKind),
    colors: Object.fromEntries(GZ_COLORS.map(([v]) => [v, got.colors[v]])),
    chips: ['--gz-surface-2', '--gz-surface', '--gz-accent', '--gz-accent-hi', '--gz-ink-muted', '--gz-ink'].map((v) => got.colors[v]),
    font: text,
    head: kind === 'look' ? (L('head') === 'auto' ? text : font(L('head'))) : null,
    mono: kind === 'look' && L('mono') !== 'auto' ? font(L('mono')) : null,
    scale: L('scale'), leading: L('leading'), density: L('density'),
    radius: L('radius'), glass: L('glass'), depth: L('depth'),
    bg: {
      kind: bgKind, style: B('style'), angle: B('angle'), blend: B('blend'), spread: B('spread'),
      colors: GZ_BG_COLORS(B('colors'), got.colors), dim: B('dim'), blur: B('blur'), grain: B('grain'),
      scene: bgKind === 'scene' ? B('scene') : '', intensity: B('intensity'),
      image: bgKind === 'image' ? B('image') : '', imageHost: bgKind === 'image' ? hostOf(B('image')) : '',
    },
    contrast: GZ_CONTRAST(got.colors).map(({ label, min, ratio, pass }) => ({ label, min, ratio: Math.round(ratio * 100) / 100, pass })),
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
// difference). 0 is the same Look. For scale: Glaze's own dark palettes Frost and Midnight (cyan and violet accents
// on near-black) are 4.6 apart, as palettes; a Look and the palette it's built on are about 20 apart. It ranks
// neighbours for the review; it decides nothing itself.
export function distance(a, b) {
  const colors = mean(GZ_COLORS.map(([v]) => delta(a.colors[v], b.colors[v])));
  const fontGap = a.font?.id === b.font?.id ? 0 : a.font?.family === b.font?.family ? 5 : 10;
  const bgGap = a.bg.kind !== b.bg.kind ? 10
    : (a.bg.kind === 'scene' && a.bg.scene !== b.bg.scene) || (a.bg.kind === 'gradient' && a.bg.style !== b.bg.style) ? 5
      : a.bg.kind === 'solid' ? 0 : mean(a.bg.colors.map((c, i) => delta(c, b.bg.colors[i]))) / 2;
  return Math.round((colors + fontGap + bgGap) * 10) / 10;
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
