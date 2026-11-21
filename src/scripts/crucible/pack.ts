// A pack's page (DESIGN.md 1.3, 7): what it is, who made it, credits with links, versions, size, game build, checks,
// comments, upvotes, reports, and "Open in Kiln" (kiln://crucible/<code>) with the "Get Kiln" steps when nothing opens.
import { $, type Account, api, ApiError, avatar, type Comment, coverUrl, creatorPath, failed, fmtNum, fmtSize, h, linkified, pageData, type Pack, plural, say, signInUrl, timeEl, type Version } from './api.ts';
import { me } from './account.ts';
import { checksView, kindLabel } from '../../lib/crucibleView.ts';

/** Mods shown before "Show all": a big pack's table stays short until asked. */
const CREDITS_SHOWN = 20;

interface Data { kind: 'pack'; pack: Pack; latest: Version | null }
const MATCH: Record<string, [string, string]> = {
  kiln: ["Kiln's own mod", 'kiln'], crucible: ['Credited before on Crucible', 'ok'], github: ['GitHub release', 'ok'],
  nexus: ['Nexus Mods', 'ok'], manifest: ["From the mod's manifest", ''], manual: ['Given by the creator', ''],
};

let pack: Pack;
let latest: Version | null;
let commentsPage = 1;

async function start() {
  let d = pageData<Data>();
  if (!d || d.kind !== 'pack') {
    // Opened without the service's data (a cached shell): find the pack from the address.
    const m = /\/kiln\/crucible\/(?:p\/([A-Za-z0-9-]{8,9})|([a-z0-9-]{3,48}))\/?$/.exec(location.pathname);
    try {
      if (m?.[1]) { const c = await api<{ pack: Pack }>('GET', `/codes/${m[1]}`); d = { kind: 'pack', ...(await api<{ pack: Pack; latest: Version | null }>('GET', `/packs/${c.pack.id}`)) }; }
      else if (m?.[2]) d = { kind: 'pack', ...(await api<{ pack: Pack; latest: Version | null }>('GET', `/packs/${m[2]}`)) };
    } catch { /* below */ }
    if (!d) {
      $('c-pack').replaceWith(h('section', { class: 'c-empty' },
        h('img', { src: '/projects/crucible/empty.webp', width: 480, height: 360, alt: '' }),
        h('h1', { text: 'This pack is not on Crucible' }),
        h('p', { text: "We couldn't find that pack. It may have been deleted or taken down; copies people installed keep working." }),
        h('p', {}, h('a', { class: 'c-btn secondary', href: '/kiln/crucible', text: 'Browse packs' }))));
      return;
    }
  }
  pack = d.pack;
  latest = d.latest;
  renderHead();
  renderBody();
  renderCredits();
  renderChecks();
  wireOpen();
  wireCopy();
  wireUpvote();
  wireReport();
  $('c-pack').removeAttribute('aria-busy');
  $('c-side').removeAttribute('inert');
  loadVersions();
  const account = await me();
  if (account) {
    // The signed-in view: whether I upvoted, and whether the pack is mine.
    try { const r = await api<{ pack: Pack }>('GET', `/packs/${pack.id}`); pack = { ...pack, ...r.pack }; } catch { /* keep the public view */ }
    setUpvote(Boolean(pack.upvoted), pack.upvotes);
  }
  renderCompose();
  loadComments();
}

function renderHead() {
  document.title = `${pack.title} · Crucible`;
  const cover = $<HTMLImageElement>('c-cover');
  cover.src = coverUrl(pack);
  say($('c-title'), pack.title);
  const owner = $<HTMLAnchorElement>('c-owner');
  owner.href = creatorPath(pack.owner.id);
  owner.replaceChildren(avatar(pack.owner, 28), h('span', { text: `by ${pack.owner.name}` }));
  $('c-version').replaceChildren(...(latest ? [`v${latest.version}`, h('span', { 'aria-hidden': 'true', text: ' · ' }), timeEl(latest.published ?? latest.created) ?? ''] : []));
  say($('c-summary'), pack.summary);
  $('c-tagsline').replaceChildren(...pack.tags.map((t) => h('li', {}, h('a', { class: 'c-chip', href: `/kiln/crucible?tags=${encodeURIComponent(t)}`, text: t }))));
  say($('c-code'), pack.code);
  setUpvote(Boolean(pack.upvoted), pack.upvotes);
  const facts: [string, Node | string][] = [];
  if (latest) facts.push(['Download', fmtSize(latest.size)]);
  facts.push(['Mods', String(pack.mods)]);
  const builds = latest?.builds?.length ? latest.builds : pack.builds;
  facts.push(['Game build', builds?.length ? `Made for ${builds.join(', ')}` : 'Not given']);
  if (latest?.kiln) facts.push(['Needs Kiln', latest.kiln.replace(/^>=\s*/, '') + (latest.kiln.startsWith('>=') ? ' or newer' : '')]);
  facts.push(['Runs', pack.sides === 'server' ? 'On a dedicated server' : pack.sides === 'client' ? 'In your game' : pack.sides === 'client+server' ? 'In your game and on servers' : 'In your game']);
  if (pack.serverPack) facts.push(['Server pack', 'Yes']);
  facts.push(['Installs', fmtNum(pack.installs)]);
  facts.push(['Updated', timeEl(pack.updated) ?? '']);
  if (pack.visibility !== 'public') facts.push(['Shared', 'By link only (not listed)']);
  $('c-facts').replaceChildren(...facts.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', {}, v)]));
}

function renderBody() {
  const box = $('c-body');
  box.replaceChildren();
  if (pack.body?.trim()) box.append(linkified(pack.body));
  else box.append(h('p', { class: 'muted', text: pack.summary || 'The creator has not written a description.' }));
}

function renderCredits() {
  const box = $('c-credits');
  const credits = latest?.credits ?? [];
  if (!credits.length) { box.replaceChildren(h('p', { class: 'muted', text: 'This pack lists no mods yet.' })); return; }
  const rows = credits.map((c, i) => {
    const [label, tone] = MATCH[c.match ?? 'manual'] ?? MATCH.manual;
    let src: Node | string = h('span', { class: 'muted', text: 'no link' });
    if (c.source) {
      let host = c.source;
      try { host = new URL(c.source).host.replace(/^www\./, ''); } catch { /* shown as is */ }
      src = h('a', { href: c.source, rel: 'nofollow ugc noopener', text: host, 'aria-label': `Source of ${c.id}: ${host}` });
    }
    return h('tr', { hidden: i >= CREDITS_SHOWN },
      h('th', { scope: 'row' }, h('span', { class: 'mod', text: c.id }), h('span', { class: 'kind', text: kindLabel(c.kind) })),
      h('td', { text: c.version ?? '' }),
      h('td', {}, c.author ? h('span', { text: c.author }) : h('span', { class: 'muted', text: 'not credited yet' })),
      h('td', {}, src),
      h('td', {}, h('span', { class: `c-chip ${tone}`, text: label })));
  });
  const tbody = h('tbody', {}, ...rows);
  const all = credits.length > CREDITS_SHOWN
    ? h('div', { class: 'c-more' }, h('button', { class: 'c-btn secondary', type: 'button', 'aria-controls': 'c-credits-table', text: `Show all ${credits.length} mods`, onclick: (e: Event) => {
      tbody.querySelectorAll('tr[hidden]').forEach((r) => r.removeAttribute('hidden'));
      (e.currentTarget as HTMLElement).parentElement?.remove();
      box.querySelector<HTMLElement>('.c-table-wrap')?.focus();
    } }))
    : null;
  box.replaceChildren(
    h('p', { class: 'muted', text: `${plural(credits.length, 'mod')} in this version, each credited to its author with a link to where it comes from.` }),
    h('div', { class: 'c-table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Mods table' },
      h('table', { class: 'c-table', id: 'c-credits-table' },
        h('thead', {}, h('tr', {}, ...['Mod', 'Version', 'Author', 'Source', 'Credit'].map((t) => h('th', { scope: 'col', text: t })))),
        tbody)),
    ...(all ? [all] : []));
}

function renderChecks() {
  const box = $('c-checks');
  const v = checksView(latest?.checks);
  const head = h('p', { class: `c-note ${({ ok: 'good', note: '', warn: 'warn', bad: 'bad', wait: 'wait', none: '' } as const)[v.tone]}` },
    h('strong', { text: `${v.title}.` }), v.lead ? ` ${v.lead}` : '');
  const chip = { problem: 'bad', warning: 'warn', note: '' } as const;
  const list = h('ul', { class: 'c-checks' }, ...v.items.map((i) => h('li', {}, h('span', { class: `c-chip ${chip[i.level]}`, text: i.level }), h('span', { text: i.text }))));
  list.hidden = !v.items.length;
  box.replaceChildren(head, list, v.foot ? h('p', { class: 'muted c-checks-foot', text: v.foot }) : '');
}

async function loadVersions() {
  const ol = $('c-versions');
  let vs: Version[] = [];
  try { vs = (await api<{ versions: Version[] }>('GET', `/packs/${pack.id}/versions`)).versions; } catch (e) {
    ol.replaceChildren(h('li', { class: 'c-plain' }, failed(e instanceof ApiError ? e.message : "Versions couldn't be loaded.", loadVersions)));
    return;
  }
  ol.replaceChildren(...vs.map((v) => h('li', {},
    h('div', { class: 'head' }, h('strong', { text: `v${v.version}` }),
      timeEl(v.published ?? v.created), h('span', { class: 'muted', text: fmtSize(v.size) }),
      v.status === 'withdrawn' ? h('span', { class: 'c-chip warn', text: 'withdrawn' }) : null,
      v.id === pack.latest ? h('span', { class: 'c-chip ok', text: 'current' }) : null),
    v.changes ? h('div', { class: 'c-prose' }, linkified(v.changes)) : h('p', { class: 'muted', text: 'No notes for this version.' }))));
}

// ---- Open in Kiln -----------------------------------------------------------------------------------------------
function wireOpen() {
  const open = $<HTMLAnchorElement>('c-open');
  const kiln = `kiln://crucible/${pack.code}`;
  const download = `/kiln/download?crucible=${encodeURIComponent(pack.code)}`;
  open.href = kiln;
  $<HTMLAnchorElement>('c-getkiln').href = download;
  say($('c-nokiln-pack'), pack.title);
  $<HTMLAnchorElement>('c-getkiln2').href = download;
  open.addEventListener('click', () => {
    // When Kiln takes the link the browser loses focus or hides the page; still here after 2 s: show the steps.
    let left = false;
    const away = () => { left = true; };
    window.addEventListener('blur', away, { once: true });
    document.addEventListener('visibilitychange', away, { once: true });
    setTimeout(() => {
      window.removeEventListener('blur', away);
      document.removeEventListener('visibilitychange', away);
      if (!left && document.hasFocus()) { $('c-nokiln').hidden = false; $('c-getkiln2').hidden = true; }
    }, 2000);
  });
}

function wireCopy() {
  $('c-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pack.url); say($('c-copied'), 'Link copied.'); } catch { say($('c-copied'), `Copy this link: ${pack.url}`); }
  });
}

// ---- upvotes ----------------------------------------------------------------------------------------------------
function setUpvote(on: boolean, n: number) {
  const b = $('c-upvote');
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? 'Take back your upvote' : 'Upvote this pack';
  say($('c-upvote-word'), on ? 'Upvoted' : 'Upvote');
  say($('c-upvotes'), fmtNum(n));
}

function needSignIn(msgEl: HTMLElement, what: string) {
  msgEl.replaceChildren(h('a', { href: signInUrl(), text: 'Sign in with Discord' }), ` to ${what}.`);
}

/** Why a signed-in account can't upvote or comment (null when it can). */
function cannotTakePart(a: Account): (Node | string)[] | null {
  if (a.banned) return ['This account can no longer upvote or comment on Crucible.'];
  if (!a.eligible) return [h('a', { href: '/kiln/discord', text: 'Join the Kiln Discord' }), ' to upvote and comment. Your Discord account also needs to be at least 3 days old.'];
  return null;
}

function wireUpvote() {
  const b = $<HTMLButtonElement>('c-upvote');
  b.addEventListener('click', async () => {
    const msg = $('c-upvote-msg');
    const a = await me();
    if (!a) return needSignIn(msg, 'upvote');
    const why = cannotTakePart(a);
    if (why) return msg.replaceChildren(...why);
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.disabled = true;
    try {
      const r = await api<{ upvoted: boolean; upvotes: number }>(on ? 'POST' : 'DELETE', `/packs/${pack.id}/upvote`);
      setUpvote(r.upvoted, r.upvotes);
      say(msg, r.upvoted ? 'Upvoted.' : 'Upvote taken back.');
    } catch (e) { say(msg, e instanceof ApiError ? e.message : "That didn't work. Try again in a minute."); } finally { b.disabled = false; }
  });
}

// ---- reports ------------------------------------------------------------------------------------------------------
let reportTarget: { type: 'pack' | 'comment'; id: string } = { type: 'pack', id: '' };
function openReport(type: 'pack' | 'comment', id: string) {
  reportTarget = { type, id };
  const d = $<HTMLDialogElement>('c-report-dialog');
  say($('c-report-title'), type === 'pack' ? 'Report this pack' : 'Report this comment');
  say($('c-report-error'), '');
  $<HTMLFormElement>('c-report-form').reset();
  d.showModal();
}
function wireReport() {
  $('c-report').addEventListener('click', async () => {
    if (!(await me())) return needSignIn($('c-upvote-msg'), 'report a pack');
    openReport('pack', pack.id);
  });
  $('c-report-send').addEventListener('click', async () => {
    const f = $<HTMLFormElement>('c-report-form');
    const fd = new FormData(f);
    const reason = String(fd.get('reason') ?? '');
    if (!reason) { say($('c-report-error'), 'Choose what is wrong.'); f.querySelector<HTMLInputElement>('input[name="reason"]')?.focus(); return; }
    try {
      const r = await api<{ duplicate: boolean; hidden: boolean }>('POST', '/reports', { target: reportTarget, reason, text: String(fd.get('text') ?? '') });
      $<HTMLDialogElement>('c-report-dialog').close();
      say($('c-upvote-msg'), r.duplicate ? 'You reported this already. The Kiln team will look at it.' : 'Thanks. The Kiln team will look at your report.');
    } catch (e) { say($('c-report-error'), e instanceof ApiError ? e.message : 'The report could not be sent.'); }
  });
}

// ---- comments -----------------------------------------------------------------------------------------------------
async function renderCompose() {
  const area = $('c-compose-area');
  const account = await me();
  if (!account) {
    area.replaceChildren(h('p', { class: 'muted' }, h('a', { href: signInUrl(), text: 'Sign in with Discord' }), ' to comment. Comments show your Discord name and avatar.'));
    return;
  }
  const why = cannotTakePart(account);
  if (why) {
    area.replaceChildren(h('p', { class: 'c-note' }, ...why));
    return;
  }
  area.replaceChildren(composer({ label: 'Write a comment', onSend: async (text) => { await api('POST', `/packs/${pack.id}/comments`, { text }); commentsPage = 1; await loadComments(); } }));
}

function composer({ label, initial = '', onSend, onCancel }: { label: string; initial?: string; onSend: (t: string) => Promise<void>; onCancel?: () => void }) {
  const id = `c-ta-${Math.random().toString(36).slice(2, 8)}`;
  const ta = h('textarea', { id, maxlength: 2000, rows: 3, 'aria-describedby': `${id}-n ${id}-e` });
  ta.value = initial;
  const count = h('span', { class: 'muted', id: `${id}-n`, text: `${initial.length} / 2000` });
  const err = h('p', { class: 'c-error', id: `${id}-e`, role: 'alert' });
  const send = h('button', { class: 'c-btn primary small', type: 'submit', text: 'Post' });
  ta.addEventListener('input', () => say(count, `${ta.value.length} / 2000`));
  const form = h('form', { class: 'c-compose' }, h('label', { for: id, text: label }), ta,
    h('div', { class: 'row' }, count, h('span', {}, onCancel ? h('button', { class: 'c-btn ghost small', type: 'button', text: 'Cancel', onclick: onCancel }) : null, ' ', send)), err);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ta.value.trim()) { say(err, 'Write something first.'); ta.focus(); return; }
    send.disabled = true;
    try { await onSend(ta.value); ta.value = ''; say(count, '0 / 2000'); say(err, ''); } catch (x) { say(err, x instanceof ApiError ? x.message : 'Your comment could not be posted.'); } finally { send.disabled = false; }
  });
  return form;
}

async function loadComments() {
  const ol = $('c-comments');
  let r: { comments: Comment[]; more: boolean };
  try { r = await api('GET', `/packs/${pack.id}/comments?page=${commentsPage}`); } catch (e) {
    const box = h('li', { class: 'c-plain' }, failed(e instanceof ApiError ? e.message : "Comments couldn't be loaded.", () => { box.remove(); loadComments(); }));
    if (commentsPage === 1) ol.replaceChildren(box); else { commentsPage--; ol.append(box); }
    return;
  }
  const account = await me();
  const nodes = r.comments.map((c) => commentNode(c, account, false));
  if (commentsPage === 1) ol.replaceChildren(...nodes); else ol.append(...nodes);
  if (commentsPage === 1 && !nodes.length) ol.replaceChildren(h('li', { class: 'muted c-plain', text: 'No comments yet.' }));
  const more = $<HTMLButtonElement>('c-more-comments');
  more.hidden = !r.more;
  more.onclick = () => { commentsPage++; loadComments(); };
}

function commentNode(c: Comment, account: Account | null, isReply: boolean): HTMLElement {
  const viewer = account?.id ?? null;
  const owner = viewer !== null && viewer === pack.owner.id;
  const canWrite = Boolean(account && !cannotTakePart(account));
  const li = h('li', { class: `c-comment${c.pinned ? ' pinned' : ''}`, id: `comment-${c.id}` });
  const text = h('p', { class: 'text' });
  if (c.deleted) text.append(h('em', { class: 'muted', text: 'This comment was deleted.' }));
  else text.append(linkified(c.text ?? '', { paragraphs: false }));
  const actions = h('div', { class: 'actions' });
  const reload = async () => { await loadComments(); };
  const act = (label: string, fn: () => unknown, aria?: string) => actions.append(h('button', { type: 'button', text: label, 'aria-label': aria, onclick: fn }));
  const who = c.author?.name ?? 'someone';
  if (!c.deleted && viewer) {
    if (!isReply && canWrite) act('Reply', () => {
      const box = li.querySelector('.c-reply-box') ?? li.appendChild(h('div', { class: 'c-reply-box' }));
      const form = composer({ label: `Reply to ${who}`, onSend: async (t) => { await api('POST', `/packs/${pack.id}/comments`, { text: t, parent: c.id }); await reload(); }, onCancel: () => box.replaceChildren() });
      box.replaceChildren(form);
      form.querySelector('textarea')?.focus();
    }, `Reply to ${who}`);
    if (c.mine) {
      act('Edit', () => {
        const form = composer({ label: 'Edit your comment', initial: c.text ?? '', onSend: async (t) => { await api('PATCH', `/comments/${c.id}`, { text: t }); await reload(); }, onCancel: () => form.replaceWith(text) });
        text.replaceWith(form);
        form.querySelector('textarea')?.focus();
      });
      act('Delete', async () => { if (confirm('Delete your comment? This cannot be undone.')) { await api('DELETE', `/comments/${c.id}`).catch(() => {}); await reload(); } });
    } else act('Report', () => openReport('comment', c.id), `Report the comment by ${who}`);
    if (owner) {
      if (!isReply) act(c.pinned ? 'Unpin' : 'Pin', async () => { await api('POST', `/comments/${c.id}/pin`, { pinned: !c.pinned }).catch(() => {}); await reload(); });
      act(c.hidden ? 'Show' : 'Hide', async () => { await api('POST', `/comments/${c.id}/hide`, { hidden: !c.hidden }).catch(() => {}); await reload(); }, c.hidden ? 'Show this comment to everyone' : 'Hide this comment on your pack');
    }
  }
  li.append(
    h('div', { class: 'meta' }, c.author ? avatar(c.author, 26) : null, h('strong', { text: c.deleted ? 'deleted' : who }),
      c.author && c.author.id === pack.owner.id ? h('span', { class: 'c-chip kiln', text: 'creator' }) : null,
      timeEl(c.created), c.edited ? h('span', { text: '(edited)' }) : null,
      c.pinned ? h('span', { class: 'c-chip warn', text: 'pinned' }) : null,
      c.hidden ? h('span', { class: 'c-chip', text: 'hidden from others' }) : null),
    text, actions);
  if (c.replies?.length) li.append(h('ol', { class: 'c-replies', 'aria-label': `Replies to ${who}` }, ...c.replies.map((r) => commentNode(r, account, true))));
  return li;
}

start();
