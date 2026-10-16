// The Glaze Looks gallery: entries in src/data/looks/<id>.json, previews in public/projects/glaze/looks/.
// loadLooks() reads and checks them all; the gallery page builds from it and refuses to build on any
// problem. CI runs this file directly, which prints every problem and fails on any:
//   node scripts/looks.mjs [entries dir] [previews dir]
// Theme codes are read by Glaze's own code, pinned in vendor/glaze (scripts/vendor-glaze.sh), so a code
// passes here exactly when that Glaze would take it whole.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// sharp comes with Astro (its image service), so decoding a preview adds no dependency of our own.
import sharp from 'sharp';

// Paths are from the repository root: npm scripts, the Astro build and CI all run there.
const root = process.cwd();
const glaze = createRequire(path.join(root, 'vendor/glaze/'));
const SHARE = glaze('./lib/share.js');
const { GZ_COLORS } = glaze('./defaults.js');
const COLOR = glaze('./lib/color.js');
const FONTS = glaze('./lib/fonts.js');
export const GLAZE_VERSION = readFileSync(path.join(root, 'vendor/glaze/VERSION'), 'utf8').trim();

// Tags a submitter picks. Kind (look or palette), light or dark, and animated come from the code itself.
// The accessibility tags are checked against the code where a check can tell; color-blind-safe is a
// reviewer's call.
export const TAGS = {
  minimal: 'Minimal', colorful: 'Colorful', gradient: 'Gradient', serif: 'Serif', monospace: 'Monospace', seasonal: 'Seasonal',
  'high-contrast': 'High contrast', 'low-vision': 'Low vision', 'dyslexia-friendly': 'Dyslexia-friendly', 'color-blind-safe': 'Color-blind safe',
};
const KEYS = ['name', 'author', 'created', 'tags', 'previews', 'code'];
const MODES = ['light', 'dark'];
// Glaze takes codes up to 4,000 characters; a palette and a full Look are under 400.
const MAX_CODE = 1200;
const MAX_PREVIEW = 200 * 1024;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+){0,7}$/;
// GitHub's rules for a username.
const HANDLE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
// Control, format (bidi overrides, zero-width) and private-use characters have no place in a name.
const ODD = /[\p{Cc}\p{Cf}\p{Co}\p{Cs}]/u;

const contrast = (c, a, b) => COLOR.contrast(c[a], c[b]);
// The checks an accessibility tag must pass, given the decoded code: '' when it does, else why not.
const CLAIMS = {
  'high-contrast': (got) => (contrast(got.colors, '--gz-ink', '--gz-surface') >= 7 && contrast(got.colors, '--gz-ink-muted', '--gz-surface') >= 4.5
    && contrast(got.colors, '--gz-accent-ink', '--gz-accent') >= 4.5 ? '' : 'text on the surface needs 7:1, muted text 4.5:1 and text on the accent 4.5:1'),
  'low-vision': (got) => ((got.look.scale ?? 0) >= 1.1 ? '' : 'the text size needs to be 110% or more'),
  'dyslexia-friendly': (got) => {
    const f = got.look.font && FONTS.resolve(got.look.font);
    return f && (f.group === 'Readable' || f.id === 'atkinson') ? '' : "the text font needs to be one of Glaze's Readable fonts";
  },
  gradient: (got) => (got.bg.kind === 'gradient' ? '' : 'the background needs to be a gradient'),
};

// A preview has to decode as a whole WebP image of a sensible size, not just start like one.
const PREVIEW_SIZE = { width: [640, 2560], height: [240, 1600] };
const preview = async (file) => {
  const b = readFileSync(file);
  if (b.length < 12 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP' || b.readUInt32LE(4) + 8 !== b.length) return "isn't a whole WebP image";
  let info;
  try { ({ info } = await sharp(b, { failOn: 'warning' }).raw().toBuffer({ resolveWithObject: true })); } catch (err) { return `doesn't decode (${err.message})`; }
  const fits = (k) => info[k] >= PREVIEW_SIZE[k][0] && info[k] <= PREVIEW_SIZE[k][1];
  return fits('width') && fits('height') ? '' : `is ${info.width}×${info.height}; previews are ${PREVIEW_SIZE.width.join('–')} wide and ${PREVIEW_SIZE.height.join('–')} tall`;
};

// The code's shape, checked here before Glaze's decoder: Glaze up to v2.2.0 reads a look or background
// group that isn't an object as an empty one, so its settings would be dropped instead of refused.
const shape = async (code) => {
  let raw;
  try {
    const bytes = Buffer.from(code.slice(SHARE.PREFIX.length), 'base64url');
    raw = JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text());
  } catch { return ''; } // Glaze's decoder says what's wrong with it.
  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  if (!isObj(raw)) return 'the code is not a group of settings';
  const odd = ['l', 'b'].filter((k) => k in raw && !isObj(raw[k])).map((k) => (k === 'l' ? 'look' : 'background'));
  return odd.length ? `the code's ${odd.join(' and ')} settings are not a group of settings, so Glaze would drop them` : '';
};

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
    const missing = KEYS.filter((k) => !(k in e));
    if (extra.length) bad(`unknown fields: ${extra.join(', ')}`);
    if (missing.length) { bad(`missing fields: ${missing.join(', ')}`); continue; }

    const { name, author, created, tags, previews: modes, code } = e;
    if (typeof name !== 'string' || !name.trim() || name !== name.trim() || [...name].length > 40 || ODD.test(name)) bad('name must be 1 to 40 plain characters, no spaces at either end');
    else if (names.has(name.toLowerCase())) bad(`the name is also used by ${names.get(name.toLowerCase())}`);
    else names.set(name.toLowerCase(), file);
    if (typeof author !== 'string' || !HANDLE.test(author)) bad('author must be a GitHub username');
    const day = typeof created === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(created) ? new Date(`${created}T00:00:00Z`) : null;
    if (!day || Number.isNaN(+day) || day.toISOString().slice(0, 10) !== created || +day > Date.now() + 864e5) bad('created must be a real date (YYYY-MM-DD), not in the future');
    const tagList = Array.isArray(tags) ? tags : [];
    if (!Array.isArray(tags) || tags.length > 6 || new Set(tags).size !== tags.length) bad('tags must be a list of up to 6 different tags');
    for (const t of tagList) if (!Object.hasOwn(TAGS, t)) bad(`unknown tag "${t}"; the tags are ${Object.keys(TAGS).join(', ')}`);

    // The code: Glaze's own decoder, which refuses it whole if any value doesn't come through GZ_SANITIZE unchanged.
    let got = null;
    if (typeof code !== 'string' || code.length > MAX_CODE) bad(`code must be a Glaze theme code of at most ${MAX_CODE} characters`);
    else {
      const why = await shape(code);
      if (why) bad(why);
      else try { got = await SHARE.decode(code); } catch (err) { bad(`Glaze ${GLAZE_VERSION} refuses the code: ${err.message}`); }
      if (codes.has(code)) bad(`the same code is also in ${codes.get(code)}`);
      codes.set(code, file);
    }
    let mode = null;
    if (got) {
      // An image address is fetched by whoever wears the Look, so it's only allowed where it's shown.
      if (got.bg.image && got.bg.kind !== 'image') bad("the code carries a background image address it doesn't use; clear the image in Glaze and copy the code again");
      if (got.bg.image && !got.bg.image.startsWith('https:')) bad('a background image must be an https: address');
      for (const t of tagList) {
        const why = CLAIMS[t]?.(got);
        if (why) bad(`tagged ${t}, but ${why}`);
      }
      mode = COLOR.brightness(COLOR.parse(got.colors['--gz-surface'])) < 0.5 ? 'dark' : 'light';
    }

    const shots = Array.isArray(modes) ? modes : [];
    if (!Array.isArray(modes) || !modes.length || modes.some((m) => !MODES.includes(m)) || new Set(modes).size !== modes.length) bad('previews must list "light", "dark" or both');
    else if (mode && !modes.includes(mode)) bad(`this palette is ${mode}, so it needs a ${mode} preview`);
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
    if (!got) continue;
    const kind = Object.keys(got.look).length || Object.keys(got.bg).length ? 'look' : 'palette';
    looks.push({
      id, name, author, created, code, kind, mode,
      tags: tagList,
      animated: ['scene', 'aurora'].includes(got.bg.kind),
      colors: GZ_COLORS.map(([v]) => got.colors[v]),
      chips: ['--gz-surface-2', '--gz-surface', '--gz-accent', '--gz-accent-hi', '--gz-ink-muted', '--gz-ink'].map((v) => got.colors[v]),
      image: got.bg.kind === 'image' ? got.bg.image : '',
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
