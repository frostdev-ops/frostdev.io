/* frostdev HQ: Crucible, Kiln's modpacks (frostdev.io/kiln/crucible). Numbers, the reports queue, recent public packs,
   what is hidden or taken down, the file blocklist, account bans and deleting a person's data. Everything goes through
   HQ's server (/hq/api/crucible/..., gallery-admin.mjs), which forwards an allowlist of Crucible's local admin routes.
   Text from packs, reports and comments reaches the page as text only. The shell (app.js) calls view(host, ctx). */
'use strict';
(() => {
  const ROOT = '/hq';
  const { el, fmt, compact, spark, tile } = globalThis.HQCharts;
  const REASONS = { malware: 'Malware', stolen: 'Stolen work', broken: 'Broken', offensive: 'Offensive', other: 'Other' };
  const TARGETS = { pack: 'Pack', version: 'Version', comment: 'Comment' };
  let ctx = null, host = null, data = {}, blockFilter = '';
  const parts = {};

  /** One admin call. Resolves { ok, status, body }; a 401 means HQ's own session ended. */
  async function call(path, { method = 'GET', body } = {}) {
    const r = await fetch(`${ROOT}/api/crucible${path}`, { method, credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'content-type': 'application/json', 'x-csrf-token': ctx.csrf() }, ...(method === 'GET' ? {} : { body: JSON.stringify(body || {}) }) });
    if (r.status === 401) { location.assign(`${ROOT}/login${location.hash}`); throw new Error('Signed out.'); }
    const out = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body: out };
  }
  const errorOf = (res) => res.body?.error || `Request failed (${res.status}).`;
  const when = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const bytes = (n) => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; n = Number(n) || 0; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; } return `${n.toFixed(i && n < 10 ? 1 : 0)} ${u[i]}`; };
  const packHref = (p) => (p.visibility === 'public' && p.slug ? `/kiln/crucible/${encodeURIComponent(p.slug)}` : p.code ? `/kiln/crucible/p/${encodeURIComponent(p.code)}` : '');
  const packLink = (p) => { const href = packHref(p); return href && p.visibility !== 'removed' && p.visibility !== 'deleted' ? el('a', { href, rel: 'noopener', text: p.title || p.id }) : el('span', { text: p.title || p.id }); };
  const section = (id, title, sub, ...kids) => {
    const h = el('h2', { id: `crucible-${id}-title`, tabindex: '-1', text: title });
    return el('section', { class: 'card', 'aria-labelledby': h.id }, el('div', { class: 'card-head' }, el('div', {}, h, sub ? el('p', { class: 'sub', text: sub }) : null)), ...kids);
  };
  const button = (label, cls, fn) => { const b = el('button', { type: 'button', class: cls, text: label }); b.addEventListener('click', () => fn(b)); return b; };
  const empty = (text) => el('p', { class: 'empty', text });
  const warn = (text) => el('p', { class: 'warn', text });

  // ---- confirm dialog: a native modal dialog (focus kept inside, Esc cancels) --------------------------------------
  /** opts: { title, text, confirm, danger, reason: { label, required, max }, check: { label } } -> { reason, check } or null */
  function ask({ title, text, confirm = 'Confirm', danger = true, reason, check, match }) {
    return new Promise((resolve) => {
      const d = el('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title', 'aria-describedby': 'dialog-text' });
      const why = reason ? el('textarea', { rows: '3', maxlength: String(reason.max || 500), required: reason.required ? '' : null }) : null;
      const box = check ? el('input', { type: 'checkbox' }) : null;
      const typed = match ? el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', inputmode: 'numeric' }) : null;
      const problem = el('p', { class: 'problem', role: 'alert' });
      const yes = el('button', { type: 'submit', class: danger ? 'danger' : '', text: confirm });
      const no = el('button', { type: 'button', class: 'secondary', text: 'Cancel' });
      const form = el('form', { method: 'dialog' },
        el('h2', { id: 'dialog-title', text: title }), el('p', { id: 'dialog-text', text }),
        why ? el('label', {}, reason.label, why) : null,
        box ? el('label', { class: 'check' }, box, el('span', { text: check.label })) : null,
        typed ? el('label', {}, `Type ${match} to confirm`, typed) : null,
        problem, el('div', { class: 'row' }, yes, no));
      d.append(form);
      let answer = null;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (why && reason.required && !why.value.trim()) { problem.textContent = 'Give a reason first.'; why.focus(); return; }
        if (typed && typed.value.trim() !== match) { problem.textContent = `That isn’t ${match}.`; typed.focus(); return; }
        answer = { reason: why ? why.value.trim() : '', check: box ? box.checked : false };
        d.close();
      });
      no.addEventListener('click', () => d.close());
      d.addEventListener('close', () => { d.remove(); resolve(answer); });
      document.body.append(d);
      d.showModal();
      (why || typed || no).focus();
    });
  }

  /** Runs one action: confirm first when asked, then the call, a toast, and a reload of what it changed. */
  async function act(btn, path, { method = 'POST', body, done, after = ['all'], dialog } = {}) {
    let extra = null;
    if (dialog) { extra = await ask(dialog); if (!extra) return null; }
    const payload = typeof body === 'function' ? body(extra) : body;
    if (btn) btn.disabled = true;
    // the button may be drawn again: focus then goes back to its section's heading
    const heading = btn?.closest('section')?.querySelector('h2');
    try {
      const res = await call(path, { method, body: payload });
      if (!res.ok) { ctx.toast(errorOf(res), true); return null; }
      ctx.toast(typeof done === 'function' ? done(res.body) : done || 'Done.');
      await load(after);
      if (btn && !btn.isConnected) heading?.focus();
      return res.body;
    } catch (e) { ctx.toast(e.message, true); return null; }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  }
  const takedownDialog = (what, name) => ({ title: `Take down ${what}?`, confirm: 'Take down',
    text: `“${name}” is removed for good and its files go on the blocklist, unless another pack still uses them. The creator is told the reason.`,
    reason: { label: 'Reason (the creator sees it)', required: true, max: 500 }, check: { label: 'Block every file, even ones other packs use' } });
  const takedownBody = (x) => ({ reason: x.reason, blockAll: x.check });

  // ---- data ----------------------------------------------------------------------------------------------------------
  const SOURCES = {
    stats: '/stats', reports: '/reports', public: '/packs?visibility=public', removed: '/packs?visibility=removed', hidden: '/packs?hidden=1', blocklist: '/blocklist',
  };
  async function load(which = ['all']) {
    const names = which.includes('all') ? Object.keys(SOURCES) : which;
    await Promise.all(names.map(async (name) => {
      try {
        const res = await call(SOURCES[name]);
        data[name] = res.ok ? res.body : { __error: errorOf(res), setup: res.body?.setup };
      } catch (e) { data[name] = { __error: e.message }; }
    }));
    if (data.stats) ctx.onStats?.(data.stats);
    draw();
  }
  const ok = (v) => v && !v.__error;
  const packById = (id) => ['public', 'hidden', 'removed'].map((n) => (ok(data[n]) ? data[n].packs : [])).flat().find((p) => p.id === id);

  // ---- drawing -------------------------------------------------------------------------------------------------------
  function draw() {
    if (!host) return;
    const setupMissing = Object.values(data).some((v) => v?.setup === false);
    if (setupMissing) {
      host.replaceChildren(ctx.head('Kiln', 'Crucible', 'Modpacks on frostdev.io/kiln/crucible.'),
        section('setup', 'Crucible isn’t set up here', 'HQ reaches Crucible’s local admin API with a shared secret.',
          el('p', { text: 'Put CRUCIBLE_ADMIN_SECRET in /etc/glaze-gallery.env, the same value as in /etc/crucible.env, and redeploy the gallery server. CRUCIBLE_ADMIN_URL is only needed when Crucible does not listen on 127.0.0.1:8792.' })));
      return;
    }
    if (!parts.root) build();
    for (const [name, fn] of Object.entries({ numbers, reports, packs, hiddenList, blocklist })) parts[name].replaceChildren(...[fn()].flat().filter(Boolean));
    if (host.firstChild !== parts.root) host.replaceChildren(parts.root);
  }

  function build() {
    const refresh = button('Refresh', 'secondary', async (b) => { b.disabled = true; await load(); b.disabled = false; ctx.toast('Crucible refreshed.'); });
    for (const n of ['numbers', 'reports', 'packs', 'hiddenList', 'blocklist']) parts[n] = el('div', { class: 'stack-v' });
    parts.root = el('div', {},
      ctx.head('Kiln', 'Crucible', 'Modpacks on frostdev.io/kiln/crucible: reports, takedowns, the file blocklist and accounts. Actions here are written to Activity.',
        el('div', { class: 'links' }, el('a', { href: '/kiln/crucible', text: 'Crucible ↗' }), el('a', { href: '/kiln/crucible/copyright', text: 'Copyright page ↗' })), refresh),
      parts.numbers,
      el('div', { class: 'crucible' },
        section('reports', 'Reports', 'Open reports, grouped by what they are about. Three accounts reporting the same thing hide it until you decide.', parts.reports),
        section('packs', 'Recent public packs', 'The 200 public packs changed most recently.', parts.packs),
        section('hidden', 'Hidden and taken down', 'Hidden packs wait for you (reports or your Hide); taken-down packs are gone for good.', parts.hiddenList),
        el('div', { class: 'grid' },
          section('blocklist', 'File blocklist', 'Files Crucible refuses to store or serve, by sha256. Takedowns add their files here.', blockForm(), parts.blocklist),
          section('bans', 'Account bans', 'A banned Discord account cannot share, publish, comment, vote or report. Crucible has no list of bans yet: ban or unban by id.', banForms()),
          section('forget', 'Delete a person’s data', 'For a deletion request: their packs (public ones are withdrawn for 30 days first), comments, upvotes and reports.', forgetForm()),
        ),
      ),
    );
  }

  function numbers() {
    const s = data.stats;
    if (!ok(s)) return warn(`Crucible’s numbers: ${s?.__error || 'not available'}`);
    const installs = [...(s.installsByDay || [])].reverse().map((d) => d.n);
    const t = (label, value, note, opts = {}) => {
      const node = tile(label, value, note ? el('div', { class: 'note', text: note }) : null, opts.values?.length > 1 ? spark(opts.values, { label: `${label}, last ${opts.values.length} days` }) : null);
      if (opts.attention) node.classList.add('attention');
      return node;
    };
    return el('section', { class: 'tiles', 'aria-label': 'Crucible in numbers' },
      t('Public packs', compact(s.packs.public), `${fmt(s.packs.link)} link-only packs`),
      t('Open reports', compact(s.openReports), s.openReports ? 'Waiting in the queue below.' : 'Nothing reported.', { attention: s.openReports > 0 }),
      t('Hidden packs', compact(s.packs.hidden), 'Hidden by reports or by you.', { attention: s.packs.hidden > 0 }),
      t('Installs today', compact(s.installsToday), `${fmt(installs.reduce((a, b) => a + b, 0))} over the last ${installs.length || 0} days`, { values: installs }),
      t('Storage', bytes(s.storageBytes), `${fmt(s.files)} files · ${fmt(s.versions)} versions`),
      t('Uploads pending', compact(s.uploadsPending), 'Started and not finished yet.'),
    );
  }

  function reports() {
    const r = data.reports;
    if (!ok(r)) return warn(`Reports: ${r?.__error || 'not available'}`);
    if (!r.reports.length) return empty('No open reports.');
    const groups = new Map();
    for (const rep of r.reports) {
      const key = `${rep.target.type}:${rep.target.id}`;
      if (!groups.has(key)) groups.set(key, { target: rep.target, pack: rep.pack, list: [] });
      groups.get(key).list.push(rep);
    }
    return el('ul', { class: 'cr-list' }, ...[...groups.values()].sort((a, b) => b.list.length - a.list.length).map(reportGroup));
  }

  function reportGroup(g) {
    const { type, id } = g.target;
    const pack = g.pack ? packById(g.pack) : null;
    const reasons = {};
    for (const rep of g.list) reasons[rep.reason] = (reasons[rep.reason] || 0) + 1;
    const label = pack ? pack.title : g.pack || id;
    const name = type === 'pack' ? label : `${TARGETS[type]} ${id}${pack || g.pack ? ` on “${label}”` : ''}`;
    const actions = [button(`Close ${g.list.length > 1 ? `all ${g.list.length}` : ''}`.trim(), 'secondary', (b) => closeAll(b, g))];
    if (type === 'pack' || type === 'version') {
      const packId = type === 'pack' ? id : g.pack;
      if (packId && !pack?.autoHidden) actions.push(button('Hide pack', 'secondary', (b) => act(b, `/packs/${packId}/hide`, { done: 'Pack hidden from Crucible.' })));
      if (packId && pack?.autoHidden) actions.push(button('Restore pack', 'secondary', (b) => act(b, `/packs/${packId}/restore`, { done: 'Pack restored; its reports are closed.' })));
      if (type === 'version') actions.push(button('Take down version…', 'danger', (b) => act(b, `/versions/${id}/takedown`, { body: takedownBody, dialog: takedownDialog('this version', `${label}, version ${id}`), done: 'Version taken down.' })));
      if (packId) actions.push(button('Take down pack…', 'danger', (b) => act(b, `/packs/${packId}/takedown`, { body: takedownBody, dialog: takedownDialog('this pack', label), done: 'Pack taken down.' })));
    } else if (type === 'comment') {
      actions.push(button('Keep comment', 'secondary', (b) => act(b, `/comments/${id}/restore`, { done: 'Comment shown again; its reports are closed.' })));
      actions.push(button('Remove comment…', 'danger', (b) => act(b, `/comments/${id}/remove`, { done: 'Comment removed.',
        dialog: { title: 'Remove this comment?', text: 'Its text is deleted and replaced by “removed”. Its reports are closed.', confirm: 'Remove' } })));
    }
    return el('li', { class: 'cr-item' },
      el('div', { class: 'cr-top' },
        el('div', {}, el('span', { class: 'badge pending', text: `${g.list.length} report${g.list.length === 1 ? '' : 's'}` }), ' ',
          el('strong', { text: name }),
          el('p', { class: 'sub', text: `${TARGETS[type] || type} · ${Object.entries(reasons).map(([k, n]) => `${REASONS[k] || k}${n > 1 ? ` ×${n}` : ''}`).join(', ')}${pack ? ` · by ${pack.owner?.name || 'unknown'}` : ''}` }),
          pack ? el('p', { class: 'sub' }, type === 'pack' ? 'Page: ' : 'On ', packLink(pack)) : null),
        el('div', { class: 'actions' }, ...actions)),
      el('ul', { class: 'cr-reports' }, ...g.list.map((rep) => el('li', {},
        el('span', { class: 'sub', text: `${REASONS[rep.reason] || rep.reason} · ${rep.by?.name || 'unknown'} (${rep.by?.id || '?'}) · ${when(rep.created)}` }),
        rep.text ? el('p', { class: 'quote', text: rep.text }) : null))));
  }

  async function closeAll(btn, g) {
    const x = await ask({ title: g.list.length > 1 ? `Close ${g.list.length} reports?` : 'Close this report?', danger: false, confirm: 'Close',
      text: 'Closing changes nothing on the pack or comment; it only takes the reports out of the queue.', reason: { label: 'Outcome (optional, kept with the report)', max: 200 } });
    if (!x) return;
    btn.disabled = true;
    let failed = '';
    for (const rep of g.list) {
      const res = await call(`/reports/${rep.id}/close`, { method: 'POST', body: x.reason ? { outcome: x.reason } : {} }).catch((e) => ({ ok: false, body: { error: e.message } }));
      if (!res.ok) { failed = errorOf(res); break; }
    }
    ctx.toast(failed || (g.list.length > 1 ? 'Reports closed.' : 'Report closed.'), !!failed);
    await load(['reports', 'stats']);
  }

  function packRow(p, { hidden = false, removed = false } = {}) {
    const actions = [];
    if (!removed) {
      if (p.autoHidden) actions.push(button('Restore', 'secondary', (b) => act(b, `/packs/${p.id}/restore`, { done: 'Pack restored.' })));
      else actions.push(button('Hide', 'secondary', (b) => act(b, `/packs/${p.id}/hide`, { done: 'Pack hidden from Crucible.',
        dialog: { title: 'Hide this pack?', text: `“${p.title}” leaves search and its page until you restore it. Nothing is deleted.`, confirm: 'Hide', danger: false } })));
      actions.push(button('Take down…', 'danger', (b) => act(b, `/packs/${p.id}/takedown`, { body: takedownBody, dialog: takedownDialog('this pack', p.title), done: 'Pack taken down.' })));
    }
    const facts = removed ? `taken down ${when(p.updated)}${p.removedReason ? ` — “${p.removedReason}”` : ''}`
      : `${fmt(p.mods || 0)} mods · ${fmt(p.installs || 0)} installs · ${fmt(p.upvotes || 0)} upvotes · ${fmt(p.comments || 0)} comments · updated ${when(p.updated)}`;
    return el('li', { class: 'cr-item' }, el('div', { class: 'cr-top' },
      el('div', {}, packLink(p), hidden || p.autoHidden ? el('span', { class: 'badge pending', text: 'Hidden' }) : null, removed ? el('span', { class: 'badge removed', text: 'Taken down' }) : null,
        el('p', { class: 'sub', text: `by ${p.owner?.name || 'unknown'} (${p.owner?.id || '?'}) · ${p.visibility}` }), el('p', { class: 'sub', text: facts })),
      actions.length ? el('div', { class: 'actions' }, ...actions) : null));
  }

  function packs() {
    const v = data.public;
    if (!ok(v)) return warn(`Public packs: ${v?.__error || 'not available'}`);
    return v.packs.length ? el('ul', { class: 'cr-list' }, ...v.packs.slice(0, 50).map((p) => packRow(p))) : empty('No public packs yet.');
  }

  function hiddenList() {
    const out = [];
    const h = data.hidden, r = data.removed;
    out.push(el('h3', { text: 'Hidden' }));
    if (!ok(h)) out.push(warn(`Hidden packs: ${h?.__error || 'not available'}`));
    else {
      const list = h.packs.filter((p) => p.visibility !== 'removed' && p.visibility !== 'deleted');
      out.push(list.length ? el('ul', { class: 'cr-list' }, ...list.map((p) => packRow(p, { hidden: true }))) : empty('Nothing is hidden.'));
    }
    out.push(el('h3', { text: 'Taken down' }));
    if (!ok(r)) out.push(warn(`Taken-down packs: ${r?.__error || 'not available'}`));
    else out.push(r.packs.length ? el('ul', { class: 'cr-list' }, ...r.packs.map((p) => packRow(p, { removed: true }))) : empty('Nothing has been taken down.'));
    return out;
  }

  const result = () => el('p', { class: 'result', role: 'status', 'aria-live': 'polite' });

  function blockForm() {
    const sha = el('input', { name: 'sha256', required: '', pattern: '[0-9a-f]{64}', maxlength: '64', autocomplete: 'off', spellcheck: 'false', placeholder: '64 hex characters' });
    const why = el('input', { name: 'reason', required: '', maxlength: '500', autocomplete: 'off' });
    const add = el('button', { type: 'submit', text: 'Block file' });
    const out = result();
    const form = el('form', { class: 'cr-form' }, el('label', {}, 'sha256', sha), el('label', {}, 'Reason', why), el('div', { class: 'row' }, add), out);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const value = sha.value.trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(value)) { out.textContent = 'A sha256 is 64 hex characters.'; sha.focus(); return; }
      if (!why.value.trim()) { out.textContent = 'Give a reason.'; why.focus(); return; }
      const done = await act(add, '/blocklist', { body: { sha256: value, reason: why.value.trim() }, after: ['blocklist'], done: 'File blocked.' });
      if (done) { out.textContent = `Blocked ${value.slice(0, 12)}…`; sha.value = ''; why.value = ''; }
    });
    const filter = el('input', { type: 'search', placeholder: 'Filter by sha256 or reason', 'aria-label': 'Filter the blocklist', value: blockFilter });
    filter.addEventListener('input', () => { blockFilter = filter.value; parts.blocklist.replaceChildren(...[blocklist()].flat()); });
    return el('div', { class: 'stack-v' }, form, filter);
  }

  function blocklist() {
    const b = data.blocklist;
    if (!ok(b)) return warn(`Blocklist: ${b?.__error || 'not available'}`);
    const q = blockFilter.trim().toLowerCase();
    const shown = b.blocked.filter((r) => !q || r.sha256.includes(q) || String(r.reason).toLowerCase().includes(q));
    if (!shown.length) return empty(q ? 'No matches.' : 'The blocklist is empty.');
    return [el('p', { class: 'sub', text: `${fmt(b.blocked.length)} blocked files${q ? `, ${fmt(shown.length)} match` : ''}${shown.length > 100 ? '; the first 100 are shown' : ''}.` }),
      el('ul', { class: 'cr-list' }, ...shown.slice(0, 100).map((r) => el('li', { class: 'cr-item' }, el('div', { class: 'cr-top' },
        el('div', {}, el('code', { text: r.sha256 }), el('p', { class: 'sub', text: `${r.reason || 'no reason'} · ${when(r.created)}` })),
        el('div', { class: 'actions' }, button('Unblock…', 'danger', (b2) => act(b2, `/blocklist/${r.sha256}`, { method: 'DELETE', after: ['blocklist'], done: 'File unblocked.',
          dialog: { title: 'Unblock this file?', text: `${r.sha256} can be uploaded and served again.`, confirm: 'Unblock' } })))))))];
  }

  const idInput = (name) => el('input', { name, required: '', inputmode: 'numeric', pattern: '[0-9]{17,20}', maxlength: '20', autocomplete: 'off', spellcheck: 'false', placeholder: 'Discord id, 17–20 digits' });
  const validId = (input, out) => { const v = input.value.trim(); if (/^\d{17,20}$/.test(v)) return v; out.textContent = 'A Discord id is 17 to 20 digits.'; input.focus(); return ''; };

  function banForms() {
    const banId = idInput('userId'), why = el('input', { name: 'reason', maxlength: '300', autocomplete: 'off' });
    const banBtn = el('button', { type: 'submit', class: 'danger', text: 'Ban…' }), out = result();
    const ban = el('form', { class: 'cr-form' }, el('label', {}, 'Discord id', banId), el('label', {}, 'Reason (kept with the ban)', why), el('div', { class: 'row' }, banBtn));
    ban.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = validId(banId, out); if (!id) return;
      const done = await act(banBtn, '/bans', { body: { userId: id, reason: why.value.trim() }, after: [], done: 'Account banned.',
        dialog: { title: 'Ban this account?', text: `Discord account ${id} can no longer share, publish, comment, vote or report on Crucible. Their packs stay; take them down separately.`, confirm: 'Ban' } });
      if (done) { out.textContent = `Banned ${id}.`; banId.value = ''; why.value = ''; }
    });
    const unbanId = idInput('userId'), unbanBtn = el('button', { type: 'submit', class: 'secondary', text: 'Unban' });
    const unban = el('form', { class: 'cr-form' }, el('label', {}, 'Discord id', unbanId), el('div', { class: 'row' }, unbanBtn));
    unban.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = validId(unbanId, out); if (!id) return;
      const done = await act(unbanBtn, `/bans/${id}`, { method: 'DELETE', after: [], done: 'Account unbanned.' });
      if (done) { out.textContent = `Unbanned ${id}.`; unbanId.value = ''; }
    });
    return el('div', { class: 'stack-v' }, el('h3', { text: 'Ban' }), ban, el('h3', { text: 'Unban' }), unban, out);
  }

  function forgetForm() {
    const id = idInput('userId'), btn = el('button', { type: 'submit', class: 'danger', text: 'Delete data…' }), out = result();
    const form = el('form', { class: 'cr-form' }, el('label', {}, 'Discord id', id), el('div', { class: 'row' }, btn), out);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const value = validId(id, out); if (!value) return;
      const done = await act(btn, `/users/${value}`, { method: 'DELETE', done: 'Their data is deleted.',
        dialog: { title: 'Delete this person’s data?', match: value, confirm: 'Delete for good',
          text: `Everything Crucible keeps about Discord account ${value}: packs, comments, upvotes and reports. This cannot be undone. A ban stays.` } });
      if (done) {
        const f = done.forgotten || {};
        out.textContent = `Deleted for ${value}: ${fmt(f.packs || 0)} packs, ${fmt(f.comments || 0)} comments, ${fmt(f.upvotes || 0)} upvotes, ${fmt(f.reports || 0)} reports.`;
        id.value = '';
      }
    });
    return form;
  }

  globalThis.HQCrucible = {
    /** ctx: { csrf(), toast(text, error), head(eyebrow, title, sub, ...extra), onStats(stats) } */
    async view(target, c) {
      ctx = c; host = target;
      await load();
    },
    /** The overview's tile: Crucible's numbers, or { __error, setup }. */
    async stats(c) {
      ctx = ctx || c;
      const res = await call('/stats');
      return res.ok ? res.body : { __error: errorOf(res), setup: res.body?.setup };
    },
  };
})();
