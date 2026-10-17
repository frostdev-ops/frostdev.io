/* The gallery admin: mods and Looks in separate sections, a list on the left, the chosen submission on the right.
   Everything a submitter wrote reaches the page through textContent only (h() below); never through a markup parser. */
'use strict';
(() => {
  const ROOT = '/glaze/admin';
  const $ = (id) => document.getElementById(id);
  // h('p', { className: 'x' }, 'text', child): attributes are set as properties, strings become text nodes.
  const h = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) if (v !== undefined && v !== null && v !== false) n[k] = v;
    for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    return n;
  };
  const when = (t) => (t ? new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const sentence = (t) => `${String(t).trim().replace(/[.\s]+$/, '')}.`;
  const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KiB`);

  const STATUS = { pending: 'Needs you', queued: 'Waiting for review', reviewing: 'Agent reviewing', published: 'Published', declined: 'Declined', removed: 'Removed' };
  const FILTERS = [['pending', 'Needs you'], ['review', 'In review'], ['published', 'Published'], ['declined', 'Declined'], ['removed', 'Removed'], ['all', 'All']];
  const statusOf = (r) => (r.status === 'queued' ? (r.reviewing ? 'reviewing' : 'queued') : r.status);
  const inFilter = (r, f) => f === 'all' || (f === 'review' ? r.status === 'queued' : r.status === f);
  const badge = (r) => h('span', { className: `badge ${statusOf(r)}` }, STATUS[statusOf(r)] || r.status);

  let data = null, csrf = '', state = { section: 'mods', filter: 'pending', id: '', hash: '', tab: 'review' }, search = '', liveTimer = 0, detailSeq = 0, auditBefore = 0;

  const toast = (text, error = false) => {
    const m = $('message'); m.textContent = text; m.className = `toast${error ? ' error' : ''}`; m.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { m.hidden = true; }, error ? 7000 : 3500);
  };
  const api = async (path, init) => {
    const r = await fetch(`${ROOT}${path}`, { credentials: 'same-origin', ...init });
    if (r.status === 401) { location.assign(`${ROOT}/login`); throw new Error('Signed out.'); }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `Request failed (${r.status}).`);
    return body;
  };
  const post = (path, body = {}) => api(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify(body) });

  // #mods/pending/<id>/<hash> · #looks/all/<id> · #activity
  const readHash = () => {
    const [section = 'mods', filter, id = '', hash = ''] = decodeURIComponent(location.hash.slice(1)).split('/');
    state = { ...state, section: ['mods', 'looks', 'activity'].includes(section) ? section : 'mods', filter: FILTERS.some(([f]) => f === filter) ? filter : 'pending', id, hash };
  };
  const go = (patch) => {
    const s = { ...state, ...patch };
    location.hash = [s.section, s.filter, s.id, s.hash].filter(Boolean).join('/');
  };

  async function load() {
    try {
      data = await api('/api/data');
      csrf = data.csrf; $('email').textContent = data.email;
      $('count-mods').textContent = data.mods.filter((r) => r.status === 'pending').length || '';
      $('count-looks').textContent = data.looks.filter((r) => r.status === 'pending').length || '';
      render();
    } catch (e) { $('list').replaceChildren(h('li', { className: 'empty' }, `Unable to load the gallery: ${e.message}`)); toast(e.message, true); }
  }

  function render() {
    for (const s of ['mods', 'looks', 'activity']) { const a = $(`nav-${s}`); if (state.section === s) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    $('workspace').hidden = state.section === 'activity'; $('activity').hidden = state.section !== 'activity';
    if (!data) return;
    if (state.section === 'activity') return renderActivity();
    renderList();
    renderDetail();
  }

  function renderList() {
    const rows = data[state.section];
    $('filters').replaceChildren(...FILTERS.map(([f, label]) => {
      const n = rows.filter((r) => inFilter(r, f)).length;
      const b = h('button', { type: 'button', className: 'secondary' }, label, ' ', h('span', { className: 'n' }, String(n)));
      b.setAttribute('aria-pressed', String(state.filter === f));
      b.addEventListener('click', () => go({ filter: f, id: '', hash: '' }));
      return b;
    }));
    const q = search.trim().toLowerCase();
    const shown = rows.filter((r) => inFilter(r, state.filter) && (!q || [r.name, r.credit, r.id].some((v) => String(v).toLowerCase().includes(q))))
      .sort((a, b) => (state.filter === 'pending' ? a.created - b.created : b.created - a.created));
    const empty = { pending: `Nothing needs you. ${state.section === 'mods' ? 'Mods' : 'Looks'} the reviewer sends to a person appear here.`, review: 'Nothing is being reviewed.' }[state.filter] || 'Nothing here.';
    $('list').replaceChildren(...(shown.length ? shown.map((r) => {
      const a = h('a', { href: `#${[state.section, state.filter, r.id, r.hash].filter(Boolean).join('/')}` },
        h('span', { className: 'title' }, h('span', {}, r.name, r.version ? ` ${r.version}` : ''), badge(r)),
        h('span', { className: 'meta' }, `by ${r.credit} · ${when(r.created)}`));
      if (r.id === state.id && (!r.hash || r.hash === state.hash)) a.setAttribute('aria-current', 'true');
      return h('li', {}, a);
    }) : [h('li', { className: 'empty' }, q ? 'No matches.' : empty)]));
  }

  async function renderDetail() {
    clearInterval(liveTimer);
    const pane = $('detail'), seq = ++detailSeq;
    $('workspace').classList.toggle('open', !!state.id);
    if (!state.id) {
      pane.replaceChildren(h('div', { className: 'placeholder' }, h('h2', {}, `Pick a ${state.section === 'mods' ? 'mod' : 'Look'}`), h('p', {}, 'Its review, files and actions show here.')));
      return;
    }
    const row = data[state.section].find((r) => r.id === state.id && (!r.hash || r.hash === state.hash));
    pane.replaceChildren(h('p', { className: 'muted' }, 'Loading…'));
    try {
      const item = await api(state.section === 'mods' ? `/api/mods/${state.id}/${state.hash}` : `/api/looks/${state.id}`);
      if (seq !== detailSeq) return;
      item.reviewing = row?.reviewing;
      pane.replaceChildren(...(state.section === 'mods' ? modView(item) : lookView(item)));
      pane.focus({ preventScroll: true });
    } catch (e) {
      if (seq !== detailSeq) return;
      const retry = h('button', { type: 'button', className: 'secondary' }, 'Try again'); retry.addEventListener('click', renderDetail);
      pane.replaceChildren(h('div', { className: 'placeholder' }, h('h2', {}, 'Couldn’t load this submission'), h('p', {}, e.message), retry));
    }
  }

  // The header every detail shares: where you are, what it is, its state in words, and what you can do.
  function header(item, kindLabel, explain) {
    const label = FILTERS.find(([f]) => f === state.filter)?.[1];
    const back = h('a', { className: 'back button secondary', href: `#${state.section}/${state.filter}` }, '← Back to list');
    const crumbs = h('nav', { className: 'crumbs', ariaLabel: 'You are here' }, h('a', { href: `#${state.section}/all` }, kindLabel), '›', h('a', { href: `#${state.section}/${state.filter}` }, label), '›', h('span', {}, item.name));
    const s = statusOf(item);
    return [back, crumbs,
      h('div', { className: 'head' },
        h('div', {}, h('h1', {}, item.name, item.version ? ` ${item.version}` : ''), h('p', { className: 'by' }, `by ${item.credit} · submitted ${when(item.created)}`, ' ', badge(item))),
        actions(item)),
      h('div', { className: `state ${s}` }, h('strong', {}, STATUS[s] || item.status), explain)];
  }

  function actions(item) {
    const s = statusOf(item), mod = state.section === 'mods';
    const path = mod ? `/api/mods/${item.id}/${item.hash}` : `/api/looks/${item.id}`;
    const box = h('div', { className: 'actions' }), area = h('div');
    const run = async (verb, reason = '', btn) => {
      btn && (btn.disabled = true);
      try { await post(`${path}/${verb}`, { reason }); toast({ approve: 'Published.', decline: 'Declined.', remove: 'Removed from the gallery.', requeue: 'Sent back to the reviewer.' }[verb]); await load(); }
      catch (e) { toast(e.message, true); btn && (btn.disabled = false); }
    };
    // Decline and remove ask for a reason in place, so it's clear what is about to happen.
    const ask = (verb, title, needReason) => {
      const reason = h('textarea', { rows: 3, maxLength: 1200, placeholder: needReason ? 'Why? The submitter sees this.' : 'Optional note for the audit log' });
      const yes = h('button', { type: 'button', className: 'danger' }, title), no = h('button', { type: 'button', className: 'secondary' }, 'Cancel');
      yes.addEventListener('click', () => { if (needReason && !reason.value.trim()) { toast('Give a reason first.', true); return; } run(verb, reason.value, yes); });
      no.addEventListener('click', () => area.replaceChildren());
      area.replaceChildren(h('div', { className: 'confirm' }, h('strong', {}, `${title} “${item.name}”?`), reason, h('div', { className: 'row' }, yes, no)));
      reason.focus();
    };
    const btn = (label, cls, fn) => { const b = h('button', { type: 'button', className: cls }, label); b.addEventListener('click', () => fn(b)); return b; };
    if (s === 'pending') box.append(btn('Approve', '', (b) => run('approve', '', b)), btn('Decline…', 'danger', () => ask('decline', 'Decline', true)));
    if (s === 'declined') box.append(btn('Approve anyway', 'secondary', (b) => run('approve', '', b)));
    if (s === 'published') box.append(btn('Remove…', 'danger', () => ask('remove', 'Remove', false)));
    if (mod && ['pending', 'published', 'declined'].includes(s)) box.append(btn('Send back to reviewer', 'secondary', (b) => run('requeue', '', b)));
    if (mod) box.append(h('a', { className: 'button secondary', href: `${ROOT}/bundles/mods/${item.id}/${item.hash}` }, 'Download'));
    return h('div', {}, box, area);
  }

  function tabs(defs) {
    const bar = h('div', { className: 'tabs', role: 'tablist' }), body = h('div', { className: 'panel' });
    const show = (key) => {
      state.tab = key;
      for (const b of bar.children) b.setAttribute('aria-selected', String(b.dataset.key === key));
      body.replaceChildren(...[defs.find((d) => d.key === key)?.draw()].flat().filter(Boolean));
    };
    for (const d of defs) { const b = h('button', { type: 'button', role: 'tab' }, d.label); b.dataset.key = d.key; b.addEventListener('click', () => show(d.key)); bar.append(b); }
    show(defs.some((d) => d.key === state.tab) ? state.tab : defs[0].key);
    return [bar, body];
  }
  const card = (title, ...kids) => h('section', { className: 'card' }, h('h3', {}, title), ...kids);
  const para = (t) => (t ? h('p', {}, String(t)) : null);
  const facts = (pairs) => h('dl', { className: 'facts' }, ...pairs.filter(([, v]) => v !== undefined && v !== '').flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]));

  function modView(m) {
    const review = m.decision?.review || {}, sum = m.summary || {}, s = statusOf(m);
    const explain = s === 'pending' ? `The reviewer handed this to a person: ${sentence(m.decision?.person || review.reason || 'no reason recorded')}`
      : s === 'reviewing' ? 'The review agent is working on it now. Follow along in the Agent tab.'
      : s === 'queued' ? 'Waiting for the review agent to pick it up.'
      : s === 'declined' ? `Declined: ${m.reason || review.reason || ''}` : s === 'removed' ? `Taken down. ${m.reason || ''}` : 'Live in the public gallery.';
    return [...header(m, 'Mods', explain), ...tabs([
      { key: 'review', label: 'Review', draw: () => [
        card('Reviewer’s decision', facts([['Decision', review.decision], ['Model', review.model], ['Rounds', review.rounds], ['Pictures viewed', review.viewedImages ? `${review.viewedImages.length}` : undefined]]), para(review.reason)),
        review.overview && card('Overview', para(review.overview)), review.summary && card('Summary', para(review.summary)),
        review.recommendation && card('Recommendation', para(review.recommendation)), review.rationale && card('Rationale', para(review.rationale)),
        card('What it can reach', m.permissions?.length ? m.permissions.map((p) => h('div', { className: 'perm' }, h('b', {}, p.label || p.id), h('span', {}, p.means || ''), h('span', {}, `Author’s reason: ${p.why}`)))
          : h('p', {}, 'No permissions: it reads no personal data and reaches no other sites.'), sum.warnings?.length ? h('ul', {}, ...sum.warnings.map((w) => h('li', {}, w))) : null),
        sum.adds?.length && card('What it adds', h('ul', {}, ...sum.adds.map((a) => h('li', {}, a)))),
        card('Details', facts([['Mod id', m.id], ['Bundle hash', m.hash], ['Author key', m.key], ['Has code', sum.code ? 'Yes' : 'No'], ['Size', sum.size ? kb(sum.size) : undefined], ['Decided', m.decided ? when(m.decided) : undefined]])),
      ] },
      { key: 'files', label: `Files${m.files?.length ? ` (${m.files.length})` : ''}`, draw: () => filesView(m) },
      { key: 'agent', label: s === 'reviewing' ? 'Agent · live' : 'Agent', draw: () => agentView(m, review) },
      { key: 'versions', label: `Versions (${m.versions?.length || 1})`, draw: () => card('Every version of this mod', h('ul', {}, ...(m.versions || []).map((v) =>
        h('li', {}, h('a', { href: `#mods/all/${v.id}/${v.hash}` }, `${v.version} · ${STATUS[v.status] || v.status} · ${when(v.created)}`), v.hash === m.hash ? ' (this one)' : '')))) },
    ])];
  }

  function filesView(m) {
    if (m.fileError) return card('Files', para(m.fileError));
    const viewer = h('div', { className: 'viewer-pane' }), tree = h('div', { className: 'tree', role: 'list' });
    const url = (f, extra = '') => `${ROOT}/files/mods/${m.id}/${m.hash}?path=${encodeURIComponent(f.path)}${extra}`;
    const open = async (f, b) => {
      for (const x of tree.children) x.removeAttribute('aria-current'); b.setAttribute('aria-current', 'true');
      const head = h('div', { className: 'viewer-head' }, h('strong', {}, f.path), h('span', {}, `${kb(f.bytes)} · `, h('a', { href: url(f, '&download=1') }, 'download')));
      if (f.type.startsWith('image/')) { const box = h('div'); GalleryViewer.image(box, url(f), f.path); viewer.replaceChildren(head, box); return; }
      if (f.type.startsWith('video/')) { viewer.replaceChildren(head, h('video', { src: url(f), controls: true, loop: true, muted: true, className: 'media' })); return; }
      viewer.replaceChildren(head, h('p', { className: 'muted' }, 'Loading…'));
      try {
        const r = await fetch(url(f, '&view=text'), { credentials: 'same-origin' });
        const text = await r.text(); const box = h('div'); GalleryViewer.code(box, text, f.path); viewer.replaceChildren(head, box);
      } catch { viewer.replaceChildren(head, h('p', {}, 'Couldn’t load this file.')); }
    };
    const files = [...m.files].sort((a, b) => (a.path === 'mod.json' ? -1 : b.path === 'mod.json' ? 1 : a.path.localeCompare(b.path)));
    for (const f of files) { const b = h('button', { type: 'button', role: 'listitem' }, h('span', {}, f.path), h('small', {}, kb(f.bytes))); b.addEventListener('click', () => open(f, b)); tree.append(b); }
    if (files.length) open(files[0], tree.children[0]);
    return h('div', { className: 'files' }, tree, viewer);
  }

  function agentView(m, review) {
    const s = statusOf(m), wrap = h('div', { className: 'panel' });
    const fileUrl = (p) => `${ROOT}/files/mods/${m.id}/${m.hash}?path=${encodeURIComponent(p)}`;
    // A picture the agent looked at shows as the picture itself, not just its path.
    const shown = (e) => { const p = e.kind === 'image' && /^\/mod\/(\S+)$/.exec(e.text.replace(/ \(again\)$/, '')); return p ? h('span', { className: 'text' }, h('img', { className: 'seen', src: fileUrl(p[1]), alt: p[1], loading: 'lazy' }), e.text) : h('span', { className: 'text' }, e.text); };
    const feedList = (events) => h('ol', { className: 'feed' }, ...events.map((e) => h('li', { className: e.kind }, h('span', { className: 'kind' }, e.kind), shown(e))));
    if (s === 'reviewing' || s === 'queued') {
      const status = h('p', { className: 'muted' }, s === 'queued' ? 'Waiting for the agent to start…' : 'Connecting…'), list = h('div');
      wrap.append(card('Live', status, list));
      const poll = async () => {
        try {
          const { feeds } = await api(`/api/live?hash=${encodeURIComponent(m.hash)}`);
          const f = feeds[0];
          if (!f) { if (s === 'reviewing') { clearInterval(liveTimer); status.textContent = 'The review finished.'; load(); } return; }
          status.textContent = `Round ${f.rounds} · started ${when(f.started)} · ${f.events.length} steps`;
          const near = list.lastChild ? list.scrollHeight - list.scrollTop - list.clientHeight < 80 : true;
          list.replaceChildren(feedList(f.events));
          if (near) list.lastChild?.lastChild?.scrollIntoView?.({ block: 'nearest' });
        } catch { status.textContent = 'Live view unavailable; refresh to retry.'; }
      };
      poll(); liveTimer = setInterval(poll, 2000);
      return wrap;
    }
    wrap.append(card('Run', facts([['Model', review.model], ['Rounds', review.rounds], ['Prompt tokens', review.tokens?.prompt], ['Completion tokens', review.tokens?.completion], ['Cost', review.cost ? `$${Number(review.cost).toFixed(4)}` : undefined]])));
    if (review.viewedImages?.length) wrap.append(card(`Pictures it looked at (${review.viewedImages.length})`, h('div', { className: 'thumbs' },
      ...review.viewedImages.map((p) => h('img', { src: `${ROOT}/files/mods/${m.id}/${m.hash}?path=${encodeURIComponent(p)}`, alt: p, title: p, loading: 'lazy' })))));
    wrap.append(card('Commands it ran', review.commands?.length ? h('ol', { className: 'feed' }, ...review.commands.map((c) => h('li', { className: 'bash' }, h('span', { className: 'kind' }, 'bash'), h('span', { className: 'text' }, c))))
      : h('p', {}, 'None recorded.')));
    if (review.reasoning) wrap.append(card('Its reasoning', para(review.reasoning)));
    return wrap;
  }

  function lookView(l) {
    const d = l.decision || {}, s = statusOf(l);
    const explain = s === 'pending' ? `The reviewers handed this to a person: ${sentence(d.person || d.escalation?.reason || l.reason || 'no reason recorded')}`
      : s === 'declined' ? `Declined: ${l.reason || d.escalation?.reason || ''}` : s === 'removed' ? 'Taken down.' : 'Live in the public gallery.';
    const nums = d.first ? Object.entries(d.first).filter(([, v]) => typeof v !== 'object') : [];
    return [...header(l, 'Looks', explain), ...tabs([
      { key: 'review', label: 'Review', draw: () => [
        d.escalation && card('Second reviewer', facts([['Decision', d.escalation.decision], ['Model', d.escalation.model]]), para(d.escalation.reason), para(d.escalation.rationale)),
        nums.length && card('First reviewer', facts(nums.map(([k, v]) => [k, typeof v === 'number' ? Number(v.toFixed(3)) : v]))),
        l.described && card('What it is', para(typeof l.described === 'string' ? l.described : JSON.stringify(l.described, null, 2))),
        card('Details', facts([['Look id', l.id], ['Tags', (l.tags || []).join(', ')], ['Decided', l.decided ? when(l.decided) : undefined]])),
      ] },
      { key: 'files', label: 'Theme code', draw: () => { const box = h('div'); GalleryViewer.code(box, l.code || '', 'theme.json'); return card('Theme code', box); } },
      ...(l.media ? [{ key: 'media', label: 'Background', draw: () => {
        const box = h('div');
        if (l.mediaType?.startsWith('video/')) box.append(h('video', { src: l.media, controls: true, loop: true, muted: true, className: 'media' }));
        else if (l.mediaType?.startsWith('image/')) GalleryViewer.image(box, l.media, 'background');
        else box.append(h('a', { href: l.media }, 'Open the background file'));
        return card('Background media', box);
      } }] : []),
    ])];
  }

  async function renderActivity() {
    $('limits').textContent = data.limits ? 'Submit limits are on.' : 'Submit limits are OFF (SUBMIT_LIMITS=off): anyone can submit without daily limits.';
    const row = (a) => h('li', {}, h('time', {}, when(a.at)), h('span', {}, `${a.email} ${a.action} ${a.kind === 'mods' ? 'mod' : 'Look'} ${a.id}${a.reason ? ` — “${a.reason}”` : ''}`));
    $('audit').replaceChildren(...(data.audit.length ? data.audit.map(row) : [h('li', {}, 'No decisions yet.')]));
    auditBefore = data.audit.at(-1)?.seq || 0; $('older').hidden = data.audit.length < 200;
  }
  $('older').addEventListener('click', async () => {
    try { const more = await api(`/api/audit?before=${auditBefore}`); for (const a of more) $('audit').append(h('li', {}, h('time', {}, when(a.at)), h('span', {}, `${a.email} ${a.action} ${a.kind} ${a.id}`))); auditBefore = more.at(-1)?.seq || auditBefore; $('older').hidden = more.length < 200; }
    catch (e) { toast(e.message, true); }
  });

  $('search').addEventListener('input', (e) => { search = e.target.value; if (data) renderList(); });
  $('logout').addEventListener('click', async () => { try { await post('/logout'); } catch { /* signed out anyway */ } location.assign(`${ROOT}/login`); });
  window.addEventListener('hashchange', () => { const prev = `${state.section}/${state.id}/${state.hash}`; readHash(); if (`${state.section}/${state.id}/${state.hash}` !== prev) state.tab = 'review'; render(); });
  // Keep lists fresh (new submissions, agent progress) without touching an open detail.
  setInterval(async () => { if (document.hidden || !data) return; try { const d = await api('/api/data'); data = d; $('count-mods').textContent = d.mods.filter((r) => r.status === 'pending').length || ''; $('count-looks').textContent = d.looks.filter((r) => r.status === 'pending').length || ''; if (state.section !== 'activity') renderList(); } catch { /* next time */ } }, 15000);
  readHash(); render(); load();
})();
