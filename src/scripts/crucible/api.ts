// Crucible's pages (src/pages/kiln/crucible/shell): the public API, the page's data from the Crucible service, and small
// DOM helpers. Everything from the API is put on the page as text (textContent, attributes), never as HTML.
export const BASE = '/kiln/crucible';
export const API = `${BASE}/api/v1`;
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const COVERS = ['forge', 'frost', 'shroud', 'wilds', 'arcane', 'builder'];

export interface User { id: string; name: string; avatarUrl: string | null }
export interface Account extends User { eligible: boolean; team: boolean; banned: boolean }
export interface Pack {
  id: string; slug: string; code: string; url: string; title: string; summary: string; body: string; icon: string | null; tags: string[];
  owner: User; visibility: string; upvotes: number; comments: number; installs: number; mods: number; builds: number[];
  sides: string | null; serverPack: boolean; latest: string | null; created: string; updated: string;
  upvoted?: boolean; mine?: boolean; expiresAt?: string; underReview?: boolean;
}
export interface Credit { kind: string; id: string; version: string | null; author: string | null; source: string | null; match: string | null; confidence: string | null; confirmed: boolean }
export interface Version {
  id: string; pack: string; number: number; version: string; changes: string; status: string; builds: number[]; kiln: string | null; api: string | null;
  size: number | null; installs: number; created: string; published: string | null; index: string | null;
  checks: { errors?: string[]; notes?: string[]; full?: boolean } | null; credits?: Credit[];
}
export interface Comment {
  id: string; parent: string | null; author: User | null; text: string | null; deleted: boolean; created: string; edited: string | null;
  pinned: boolean; hidden?: boolean; mine?: boolean; replies?: Comment[];
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public body: Record<string, unknown> = {}) { super(message); }
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API}${path}`, {
      method, credentials: 'same-origin',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'offline', "Crucible can't be reached. Check your connection and try again.");
  }
  let json: Record<string, unknown> = {};
  try { json = await r.json(); } catch { /* empty */ }
  if (!r.ok) throw new ApiError(r.status, String(json.error ?? 'error'), String(json.message ?? 'Something went wrong. Try again in a minute.'), json);
  return json as T;
}

/** The data the Crucible service put on the page (null when the page was opened some other way). */
export function pageData<T>(): T | null {
  const el = document.getElementById('crucible-data');
  try { return el ? (JSON.parse(el.textContent || 'null') as T) : null; } catch { return null; }
}

type Child = Node | string | null | undefined | false;
/** A DOM element: attrs are attributes, except text (textContent) and on* (listeners). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') el.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export const coverOf = (id: string) => COVERS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % COVERS.length];
export const coverUrl = (p: Pick<Pack, 'id' | 'icon'>, small = false) => p.icon ?? `/projects/crucible/cover-${coverOf(p.id)}${small ? '-640' : ''}.webp`;
export const packPath = (p: Pick<Pack, 'url'>) => { try { return new URL(p.url).pathname; } catch { return BASE; } };
export const creatorPath = (id: string) => `${BASE}/u/${id}`;

const nf = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const fmtNum = (n: number) => nf.format(n ?? 0);
export const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`;
export function fmtSize(b: number | null | undefined) {
  if (!b && b !== 0) return 'unknown';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function fmtWhen(iso: string | null | undefined) {
  if (!iso) return '';
  const t = Date.parse(iso);
  const s = (t - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return 'just now';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return new Date(t).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}
export const timeEl = (iso: string | null | undefined) => (iso ? h('time', { datetime: iso, title: new Date(iso).toLocaleString(), text: fmtWhen(iso) }) : null);

/** Plain text with https links made clickable (rel="nofollow ugc noopener"), as paragraphs or one block. */
export function linkified(text: string, { paragraphs = true } = {}): DocumentFragment {
  const frag = document.createDocumentFragment();
  const parts = paragraphs ? String(text ?? '').split(/\n{2,}/).filter((x) => x.trim()).slice(0, 100) : [String(text ?? '')];
  for (const para of parts) {
    const box = paragraphs ? h('p') : document.createDocumentFragment();
    String(para).split(/(https:\/\/[^\s<>"']{3,300})/g).forEach((x, i) => {
      if (i % 2) box.append(h('a', { href: x, rel: 'nofollow ugc noopener', text: x }));
      else if (x) box.append(x);
    });
    frag.append(box);
  }
  return frag;
}

export function signInUrl() {
  const u = new URL(location.href);
  u.searchParams.delete('signin');
  return `/kiln/signin/web?return=${encodeURIComponent(u.pathname + u.search)}`;
}

export function parseCode(s: string): string | null {
  const c = String(s ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (c.length !== 8 || [...c].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

export function avatar(u: User | null | undefined, size = 32) {
  return h('img', { src: u?.avatarUrl ?? '/projects/crucible/mark-64.png', width: size, height: size, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
}

/** A pack card for a list (the whole card is the pack's link). */
export function packCard(p: Pack, { extra }: { extra?: Node } = {}) {
  const stats = h('ul', { class: 'c-stats' },
    h('li', { text: `▲ ${fmtNum(p.upvotes)}`, title: plural(p.upvotes, 'upvote') }),
    h('li', { text: plural(p.installs, 'install') }),
    h('li', { text: plural(p.mods, 'mod') }),
    p.comments ? h('li', { text: plural(p.comments, 'comment') }) : null,
    p.builds?.length ? h('li', { text: `build ${p.builds[0]}` }) : null,
    p.serverPack ? h('li', { text: 'server pack' }) : null);
  return h('li', {},
    h('article', { class: 'c-card' },
      h('img', { class: 'cover', src: coverUrl(p, true), width: 640, height: 360, alt: '', loading: 'lazy' }),
      h('div', { class: 'body' },
        h('h3', {}, h('a', { href: packPath(p), text: p.title })),
        h('p', { class: 'by', text: `by ${p.owner?.name ?? 'unknown'} · updated ${fmtWhen(p.updated)}` }),
        p.summary ? h('p', { class: 'summary', text: p.summary }) : null,
        stats,
        extra ?? null)));
}

export function say(el: HTMLElement | null, text: string) { if (el) el.textContent = text; }
