// Browse and search public packs (DESIGN.md 1.4): words, tags, game build, where it runs, server pack, number of mods,
// sort; the query lives in the address so a search can be shared and Back works.
import { $, api, ApiError, h, packCard, pageData, type Pack, say } from './api.ts';
import './account.ts';

interface Results { packs: Pack[]; page: number; more: boolean }
interface Facets { tags: { tag: string; n: number }[]; builds: { build: number; n: number }[] }

const KEYS = ['q', 'tags', 'build', 'side', 'server', 'mods', 'sort'] as const;
type State = Record<(typeof KEYS)[number], string>;
const form = $<HTMLFormElement>('c-facets');
const list = $('c-results');
const more = $<HTMLButtonElement>('c-more');
let page = 1;
let seq = 0;

function readState(): State {
  const p = new URL(location.href).searchParams;
  return Object.fromEntries(KEYS.map((k) => [k, (p.get(k) ?? '').slice(0, 200)])) as State;
}

function writeForm(s: State) {
  $<HTMLInputElement>('c-q').value = s.q;
  $<HTMLSelectElement>('c-sort').value = s.sort || 'top';
  const tags = new Set(s.tags.split(',').filter(Boolean));
  form.querySelectorAll<HTMLInputElement>('input[name="tag"]').forEach((i) => { i.checked = tags.has(i.value); });
  $<HTMLSelectElement>('c-build').value = s.build;
  form.querySelectorAll<HTMLInputElement>('input[name="side"]').forEach((i) => { i.checked = i.value === s.side; });
  form.querySelectorAll<HTMLInputElement>('input[name="mods"]').forEach((i) => { i.checked = i.value === s.mods; });
  form.querySelector<HTMLInputElement>('input[name="server"]')!.checked = s.server === '1';
}

function formState(): State {
  const fd = new FormData(form);
  return {
    q: $<HTMLInputElement>('c-q').value.trim(),
    tags: fd.getAll('tag').map(String).join(','),
    build: String(fd.get('build') ?? ''),
    side: String(fd.get('side') ?? ''),
    server: fd.get('server') ? '1' : '',
    mods: String(fd.get('mods') ?? ''),
    sort: $<HTMLSelectElement>('c-sort').value === 'top' ? '' : $<HTMLSelectElement>('c-sort').value,
  };
}

const query = (s: State, p = 1) => {
  const u = new URLSearchParams();
  for (const k of KEYS) if (s[k]) u.set(k, s[k]);
  if (p > 1) u.set('page', String(p));
  return u.toString();
};
const describe = (s: State) => {
  const bits = [];
  if (s.q) bits.push(`matching “${s.q}”`);
  if (s.tags) bits.push(`tagged ${s.tags.split(',').join(', ')}`);
  if (s.build) bits.push(`for build ${s.build}`);
  return bits.join(' ');
};

async function load(s: State, { append = false } = {}) {
  const my = ++seq;
  if (!append) { page = 1; list.setAttribute('aria-busy', 'true'); say($('c-count'), 'Loading packs…'); }
  let r: Results;
  try {
    r = await api<Results>('GET', `/search?${query(s, page)}`);
  } catch (e) {
    if (my !== seq) return;
    list.removeAttribute('aria-busy');
    say($('c-count'), e instanceof ApiError ? e.message : 'Packs could not be loaded.');
    return;
  }
  if (my !== seq) return;
  show(r, s, append);
}

function show(r: Results, s: State, append: boolean) {
  list.removeAttribute('aria-busy');
  const firstNew = list.children.length;
  if (!append) list.replaceChildren();
  for (const p of r.packs) list.append(packCard(p));
  const n = list.children.length;
  $('c-empty').hidden = n > 0;
  more.hidden = !r.more;
  say($('c-count'), n ? `${n}${r.more ? '+' : ''} pack${n === 1 && !r.more ? '' : 's'} ${describe(s)}`.trim() : 'No packs found.');
  if (append) list.children[firstNew]?.querySelector('a')?.focus();
}

async function facets(s: State) {
  let f: Facets;
  try { f = await api<Facets>('GET', '/facets'); } catch { return; }
  const box = $('c-tags');
  if (f.tags.length) {
    $('c-tags-empty').hidden = true;
    for (const t of f.tags) {
      box.append(h('label', {}, h('input', { type: 'checkbox', name: 'tag', value: t.tag }), h('span', { text: t.tag }), h('span', { class: 'n', text: String(t.n), 'aria-label': `${t.n} packs` })));
    }
  }
  const sel = $<HTMLSelectElement>('c-build');
  for (const b of f.builds) sel.append(h('option', { value: String(b.build), text: `${b.build} (${b.n})` }));
  writeForm(s);
}

function go() {
  const s = formState();
  const qs = query(s);
  history.pushState(null, '', qs ? `?${qs}` : location.pathname);
  load(s);
}

const initial = readState();
writeForm(initial);
const data = pageData<{ kind: string; results?: Results }>();
if (data?.results && !location.search) show(data.results, initial, false);
else load(initial);
facets(initial);
if (window.matchMedia('(max-width: 820px)').matches) $<HTMLDetailsElement>('c-filters').open = false;

$<HTMLFormElement>('c-search').addEventListener('submit', (e) => { e.preventDefault(); go(); });
form.addEventListener('change', go);
form.addEventListener('reset', () => setTimeout(go));
$<HTMLSelectElement>('c-sort').addEventListener('change', go);
more.addEventListener('click', () => { page++; load(readState(), { append: true }); });
window.addEventListener('popstate', () => { const s = readState(); writeForm(s); load(s); });
