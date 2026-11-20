// A pack's page (DESIGN.md 1.3, 7): what it is, who made it, credits with links, versions, size, game build, checks,
// comments, upvotes, reports, and "Open in Kiln" (kiln://crucible/<code>) with the "Get Kiln" steps when nothing opens.
import { $, api, ApiError, avatar, type Comment, coverUrl, creatorPath, fmtNum, fmtSize, h, linkified, pageData, type Pack, plural, say, signInUrl, timeEl, type Version } from './api.ts';
import { me } from './account.ts';

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
    if (!d) { say($('c-title'), 'This pack is not on Crucible'); $('c-pack').removeAttribute('aria-busy'); return; }
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
  $('c-version').replaceChildren(...(latest ? [` · v${latest.version} (version ${latest.number}), `, timeEl(latest.published ?? latest.created) ?? ''] : []));
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
  const rows = credits.map((c) => {
    const [label, tone] = MATCH[c.match ?? 'manual'] ?? MATCH.manual;
    let src: Node | string = h('span', { class: 'muted', text: 'no link' });
    if (c.source) {
      let host = c.source;
      try { host = new URL(c.source).host.replace(/^www\./, ''); } catch { /* shown as is */ }
      src = h('a', { href: c.source, rel: 'nofollow ugc noopener', text: host, 'aria-label': `Source of ${c.id}: ${host}` });
    }
    return h('tr', {},
      h('th', { scope: 'row' }, h('span', { text: c.id }), h('br'), h('span', { class: 'id', text: c.kind })),
      h('td', { text: c.version ?? '' }),
      h('td', {}, c.author ? h('span', { text: c.author }) : h('span', { class: 'muted', text: 'not credited yet' })),
      h('td', {}, src),
      h('td', {}, h('span', { class: `c-chip ${tone}`, text: label })));
  });
  box.replaceChildren(
    h('p', { class: 'muted', text: `${plural(credits.length, 'mod')} in version ${latest?.number}. Credits name each mod's author and where the mod comes from.` }),
    h('div', { class: 'c-table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Mods and credits' },
      h('table', { class: 'c-table' },
        h('thead', {}, h('tr', {}, ...['Mod', 'Version', 'Author', 'Source', 'Credit'].map((t) => h('th', { scope: 'col', text: t })))),
        h('tbody', {}, ...rows))));
}

function renderChecks() {
  const box = $('c-checks');
  const c = latest?.checks;
  if (!c) { box.replaceChildren(h('p', { class: 'muted', text: 'This version has not been checked yet.' })); return; }
  const errors = c.errors ?? [], notes = c.notes ?? [];
  const head = errors.length
    ? h('p', { class: 'c-note bad' }, h('strong', { text: `Checks failed: ${plural(errors.length, 'problem')}. ` }), 'Read them before you install.')
    : h('p', { class: notes.length ? 'c-note warn' : 'c-note' }, h('strong', { text: notes.length ? `Checks: ${plural(notes.length, 'note')}.` : 'Checks passed.' }));
  const list = h('ul', { class: 'c-checks' },
    ...errors.map((t) => h('li', {}, h('span', { class: 'c-chip bad', text: 'problem' }), h('span', { text: t }))),
    ...notes.map((t) => h('li', {}, h('span', { class: 'c-chip warn', text: 'note' }), h('span', { text: t }))));
  list.hidden = !errors.length && !notes.length;
  box.replaceChildren(head, list,
    h('p', { class: 'muted', text: c.full ? 'Crucible checked the files: format, sizes, zip safety, known-bad files and a code scan.' : 'Crucible checked the pack\'s list of files. Crucible checks packs automatically but does not review them.' }));
}

async function loadVersions() {
  const ol = $('c-versions');
  let vs: Version[] = [];
  try { vs = (await api<{ versions: Version[] }>('GET', `/packs/${pack.id}/versions`)).versions; } catch (e) {
    ol.replaceChildren(h('li', { class: 'c-error', text: e instanceof ApiError ? e.message : 'Versions could not be loaded.' }));
    return;
  }
  ol.replaceChildren(...vs.map((v) => h('li', {},
    h('div', { class: 'head' }, h('strong', { text: `v${v.version}` }), h('span', { class: 'muted', text: `version ${v.number}` }),
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
    try { await navigator.clipboard.writeText(pack.url); say($('c-copied'), `Link copied: ${pack.url}`); } catch { say($('c-copied'), `Copy this link: ${pack.url}`); }
  });
}

// ---- upvotes ----------------------------------------------------------------------------------------------------
function setUpvote(on: boolean, n: number) {
  const b = $('c-upvote');
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? 'Take back your upvote' : 'Upvote this pack';
  say($('c-upvotes'), fmtNum(n));
}

function needSignIn(msgEl: HTMLElement, what: string) {
  msgEl.replaceChildren(h('a', { href: signInUrl(), text: 'Sign in with Discord' }), ` to ${what}.`);
}

function wireUpvote() {
  const b = $<HTMLButtonElement>('c-upvote');
  b.addEventListener('click', async () => {
    const msg = $('c-upvote-msg');
    if (!(await me())) return needSignIn(msg, 'upvote');
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.disabled = true;
    try {
      const r = await api<{ upvoted: boolean; upvotes: number }>(on ? 'POST' : 'DELETE', `/packs/${pack.id}/upvote`);
      setUpvote(r.upvoted, r.upvotes);
      say(msg, r.upvoted ? 'Upvoted.' : 'Upvote taken back.');
    } catch (e) { say(msg, e instanceof ApiError ? e.message : 'That did not work.'); } finally { b.disabled = false; }
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
  if (!account.eligible) {
    area.replaceChildren(h('p', { class: 'c-note', text: 'Comments and upvotes need a Discord account at least 3 days old in the Kiln Discord.' }),
      h('p', {}, h('a', { href: '/kiln/discord', text: 'Join the Kiln Discord' })));
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
    ol.replaceChildren(h('li', { class: 'c-error', text: e instanceof ApiError ? e.message : 'Comments could not be loaded.' }));
    return;
  }
  const account = await me();
  const nodes = r.comments.map((c) => commentNode(c, account?.id ?? null, false));
  if (commentsPage === 1) ol.replaceChildren(...nodes); else ol.append(...nodes);
  if (commentsPage === 1 && !nodes.length) ol.replaceChildren(h('li', { class: 'muted', text: 'No comments yet.' }));
  const more = $<HTMLButtonElement>('c-more-comments');
  more.hidden = !r.more;
  more.onclick = () => { commentsPage++; loadComments(); };
}

function commentNode(c: Comment, viewer: string | null, isReply: boolean): HTMLElement {
  const owner = viewer !== null && viewer === pack.owner.id;
  const li = h('li', { class: `c-comment${c.pinned ? ' pinned' : ''}`, id: `comment-${c.id}` });
  const text = h('p', { class: 'text' });
  if (c.deleted) text.append(h('em', { class: 'muted', text: 'This comment was deleted.' }));
  else text.append(linkified(c.text ?? '', { paragraphs: false }));
  const actions = h('div', { class: 'actions' });
  const reload = async () => { await loadComments(); };
  const act = (label: string, fn: () => unknown, aria?: string) => actions.append(h('button', { type: 'button', text: label, 'aria-label': aria, onclick: fn }));
  const who = c.author?.name ?? 'someone';
  if (!c.deleted && viewer) {
    if (!isReply) act('Reply', () => {
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
      act('Delete', async () => { if (confirm('Delete your comment?')) { await api('DELETE', `/comments/${c.id}`).catch(() => {}); await reload(); } });
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
  if (c.replies?.length) li.append(h('ol', { class: 'c-replies', 'aria-label': `Replies to ${who}` }, ...c.replies.map((r) => commentNode(r, viewer, true))));
  return li;
}

start();
