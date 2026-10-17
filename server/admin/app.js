/* All submission data goes through textContent. No submitted HTML, JavaScript, SVG or Lottie is executed. */
'use strict';
const ROOT = '/glaze/admin';
const $ = (id) => document.getElementById(id);
const el = (tag, text = '', cls = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  if (cls) node.className = cls;
  if (tag === 'pre') node.tabIndex = 0;
  return node;
};
const link = (href, text) => Object.assign(el('a', text), { href });
const button = (text, run) => {
  const node = el('button', text);
  node.type = 'button';
  node.addEventListener('click', () => Promise.resolve().then(run).catch(showError));
  return node;
};
const date = (v) => v ? new Date(v).toLocaleString(undefined, { timeZone: 'UTC', timeZoneName: 'short' }) : '—';
const address = (r) => `${r.kind}/${encodeURIComponent(r.id)}${r.hash ? `/${encodeURIComponent(r.hash)}` : ''}`;
const status = (text, state = '') => { $('message').textContent = text; $('message').className = `status ${state}`; };
const showError = (e) => status(`${e.message || 'Something went wrong.'} Use Refresh to try again.`, 'error');
const badge = (row) => el('span', `${row.kind === 'looks' ? 'Look' : 'Mod'} · ${row.status}`, `badge ${row.status}`);
let data, selection, detailRequest = 0, fileRequest = 0, refreshRequest = 0;
async function api(path, options = {}) {
  const response = await fetch(`${ROOT}${path}`, { credentials: 'same-origin', cache: 'no-store', ...options });
  if (response.status === 401) { location.assign(`${ROOT}/login`); throw new Error('Sign in to continue.'); }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The request failed.');
  return body;
}
function list(target, rows, empty) {
  target.replaceChildren();
  if (!rows.length) { target.append(el('p', empty, 'empty')); return; }
  for (const r of rows) {
    const selected = address(r) === selection;
    const card = el('article', '', `item${selected ? ' selected' : ''}`);
    const heading = el('h3');
    const open = link(`#${address(r)}`, `${r.name}${r.version ? ` · ${r.version}` : ''}`);
    open.ariaCurrent = selected ? 'true' : 'false';
    open.addEventListener('click', () => { if (location.hash === open.hash) detail().catch(showError); });
    heading.append(open);
    card.append(badge(r), heading, el('p', `By ${r.credit}`), el('p', date(r.created)), el('code', r.id));
    if (r.status === 'pending') card.append(el('p', r.person || 'A person must decide this submission.', 'attention'));
    target.append(card);
  }
}
function filter(kind) {
  if (!data) return;
  const search = $(`${kind}-search`).value.trim().toLowerCase();
  const status = $(`${kind}-filter`).value;
  const rows = data[kind].filter((r) => (!status || r.status === status) && [r.name, r.credit, r.id, r.hash, r.version].join(' ').toLowerCase().includes(search));
  $(`${kind}-count`).textContent = `${rows.length} of ${data[kind].length}`;
  list($(kind), rows, search || status ? 'No matches. Try another search or choose Every status.' : `No ${kind === 'looks' ? 'Looks' : 'mods'} submitted yet.`);
}
function lists() {
  if (!data) return;
  const rows = [...data.looks, ...data.mods];
  const pending = rows.filter((r) => r.status === 'pending').sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
  $('queue-count').textContent = $('nav-count').textContent = pending.length;
  $('published-count').textContent = rows.filter((r) => r.status === 'published').length;
  $('total-count').textContent = rows.length;
  list($('pending'), pending, 'All caught up. No submissions are waiting for a person.');
  filter('looks'); filter('mods');
}
function audit(rows, append = false) {
  if (!append) $('audit-rows').replaceChildren();
  if (!append && !rows.length) $('audit-rows').append(el('li', 'No decisions yet. Saved decisions will appear here.', 'empty'));
  for (const r of rows) {
    const node = el('li');
    node.append(el('p', `${date(r.at)} · ${r.email} · ${r.action}`, 'audit-meta'), link(`#${address(r)}`, `${r.id}${r.hash ? ` · ${r.hash}` : ''}`));
    if (r.reason) node.append(el('p', r.reason, 'audit-reason'));
    $('audit-rows').append(node);
  }
  $('older').hidden = rows.length < 200;
  $('older').dataset.before = rows.at(-1)?.seq || '';
}
async function refresh() {
  const request = ++refreshRequest;
  $('refresh').disabled = true; $('refresh').textContent = 'Refreshing…';
  status('Updating the gallery…', 'loading');
  for (const id of ['queue', 'looks', 'mods']) $(id).ariaBusy = 'true';
  try {
    const next = await api('/api/data');
    if (request !== refreshRequest) return;
    data = next;
    $('email').textContent = data.email;
    $('logout').disabled = false;
    lists();
    $('limits').textContent = data.limits ? 'On · Daily submission and review quotas apply.' : 'Off · Daily submission and review quotas are disabled.';
    const b = data.blocklist;
    $('blocklist').textContent = b ? `Sequence ${b.seq} · expires ${date(b.expires)}. ${b.mods} mods, ${b.bundles} bundles, ${b.authors} authors.${Date.parse(b.expires) <= Date.now() ? ' Expired; existing blocks still apply.' : ''}` : 'None published.';
    audit(data.audit);
    status(`Gallery updated · ${data.looks.length} Looks · ${data.mods.length} mod versions. All times UTC.`);
  } catch (e) {
    if (request !== refreshRequest) return;
    if (!data) {
      for (const id of ['pending', 'looks', 'mods']) $(id).replaceChildren(el('p', 'Unable to load submissions. Use Refresh to try again.', 'empty'));
      $('audit-rows').replaceChildren(el('li', 'Audit log unavailable. Use Refresh to try again.', 'empty'));
      $('limits').textContent = $('blocklist').textContent = 'Unavailable until the gallery loads.';
    }
    throw e;
  } finally {
    if (request === refreshRequest) {
      $('refresh').disabled = false; $('refresh').textContent = 'Refresh';
      for (const id of ['queue', 'looks', 'mods']) $(id).ariaBusy = 'false';
    }
  }
}
function field(parent, name, value) {
  const section = el('div', '', 'field');
  section.append(el('h3', name), el('p', value ?? '—'));
  parent.append(section);
}
function json(parent, name, value, open = false) {
  const details = el('details');
  details.open = open;
  details.append(el('summary', name), el('pre', typeof value === 'string' ? value : JSON.stringify(value, null, 2)));
  parent.append(details);
}
function review(parent, name, record) {
  if (!record) return;
  const panel = el('div', '', 'review-summary');
  panel.append(el('h3', name));
  for (const [key, label] of Object.entries({ model: 'Reviewer', decision: 'Decision', quality: 'Quality', choice: 'Uniqueness', overview: 'Overview', summary: 'Summary', recommendation: 'Recommendation', reason: 'Reason', rationale: 'Rationale' })) {
    if (record[key] !== undefined) field(panel, label, record[key]);
  }
  parent.append(panel);
}
function palette(parent, described) {
  // Reuses the submit page's server description, decoded by vendored Glaze. It never loads third-party backgrounds.
  const box = el('div', '', 'preview');
  for (const [key, value] of Object.entries(described.colors || {})) {
    if (/^--gz-[a-z-]+$/.test(key) && /^#[a-f\d]{6}$/i.test(value)) box.style.setProperty(key, value);
  }
  const radius = described.radius;
  if (typeof radius === 'number' && Number.isFinite(radius)) box.style.borderRadius = `${Math.min(24, Math.max(0, radius))}px`;
  box.append(el('p', 'BIO 201 · Cell Biology', 'preview-top'), el('h3', 'Lab 4: Osmosis'),
    el('p', 'Bring your notebook. We meet on Thursday.'), el('p', 'Dr. Rivera · 2 hours ago', 'preview-muted'), el('span', 'Start lab', 'preview-button'));
  parent.append(el('h3', 'Palette preview'), box, el('p', 'Uses the same Glaze decoder as the submit page. Fonts, backgrounds and Look parts are described below; check attached media separately.', 'muted'));
}
function actions(parent, row) {
  const form = el('form', '', 'actions');
  form.append(el('h3', 'Make a decision'), el('p', 'Check the review and attached files before approving.', 'section-note'));
  const label = el('label', 'Decision reason (required to decline)');
  const reason = el('textarea');
  reason.id = 'decision-reason'; reason.setAttribute('aria-describedby', 'decision-help');
  reason.placeholder = 'Explain your decision to the submitter…';
  reason.rows = 3; reason.maxLength = 300;
  label.append(reason); form.append(label);
  const help = el('p', 'Up to 300 characters. Your reason is saved with the decision.', 'help'); help.id = 'decision-help'; form.append(help);
  const buttons = el('div', '', 'buttons');
  const error = el('p', '', 'action-error'); error.role = 'alert';
  const states = { approve: ['pending'], decline: ['pending', ...(row.kind === 'mods' ? ['queued'] : [])], remove: ['published', 'pending', ...(row.kind === 'mods' ? ['queued'] : [])] };
  for (const verb of ['approve', 'decline', 'remove']) {
    if (!states[verb].includes(row.status)) continue;
    const control = button(verb === 'remove' ? 'Remove from gallery' : verb === 'approve' ? 'Approve' : 'Decline', async () => {
      if (verb === 'decline' && !reason.value.trim()) { reason.setCustomValidity('Give the submitter a reason.'); reason.reportValidity(); reason.focus(); return; }
      reason.setCustomValidity('');
      if (verb !== 'approve' && !window.confirm(verb === 'decline' ? `Decline ${row.name}? Your reason will be saved with this decision.` : `Remove ${row.name} from the gallery?`)) return;
      const value = reason.value;
      error.textContent = '';
      for (const node of buttons.children) node.disabled = true;
      const text = control.textContent; control.textContent = 'Saving…'; form.ariaBusy = 'true';
      try {
        await api(`/api/${address(row)}/${verb}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': data.csrf }, body: JSON.stringify({ reason: value }) });
        await refresh();
        await detail(false);
        $('detail-title').focus({ preventScroll: true });
        status(`${row.name}: ${verb === 'approve' ? 'published' : verb === 'decline' ? 'declined' : 'removed'}. Saved to the audit log.`);
      } catch (e) { error.textContent = e.message || 'Unable to save. Try again.'; throw e; }
      finally { for (const node of buttons.children) node.disabled = false; control.textContent = text; form.ariaBusy = 'false'; }
    });
    if (verb !== 'approve') control.className = 'danger';
    buttons.append(control);
  }
  if (buttons.childElementCount) { form.append(buttons, error); parent.append(form); }
  form.addEventListener('submit', (event) => event.preventDefault());
  reason.addEventListener('input', () => reason.setCustomValidity(''));
}
async function showFile(target, url, type, name) {
  const ticket = ++fileRequest;
  target.replaceChildren(el('p', `Loading ${name}…`, 'loading'));
  if (type.startsWith('image/') || type.startsWith('video/')) {
    const media = el(type.startsWith('video/') ? 'video' : 'img');
    media.ariaLabel = name;
    if (type.startsWith('video/')) { media.controls = true; media.preload = 'metadata'; media.playsInline = true; } else media.alt = name;
    media.src = url;
    media.addEventListener('error', () => { target.replaceChildren(el('p', 'This browser could not display the media. Download it to inspect it.')); });
    target.replaceChildren(media);
  } else {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}view=text`, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.startsWith('text/plain')) throw new Error('This file is unavailable as text. Use its download link.');
    const text = await response.text();
    if (ticket === fileRequest) target.replaceChildren(el('pre', text));
  }
}
async function detail(moveFocus = true) {
  const pattern = /^#(looks\/(c-[0-9a-f]{10})|mods\/([a-z2-7]{16})\/([\w-]{43}))$/;
  const match = pattern.exec(location.hash) || (!moveFocus && selection ? pattern.exec(`#${selection}`) : null);
  if (!match) return;
  const request = ++detailRequest;
  fileRequest++;
  selection = match[1];
  lists();
  $('close-detail').hidden = false;
  $('detail-title').textContent = 'Loading submission…';
  $('detail').ariaBusy = 'true';
  const body = $('detail-body'); body.replaceChildren(el('p', 'Loading review and files…', 'empty loading'));
  if (moveFocus) {
    $('detail-title').focus({ preventScroll: true });
    $('detail').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  let row;
  try { row = await api(`/api/${selection}`); }
  catch (e) {
    if (request !== detailRequest) return;
    $('detail-title').textContent = 'Review unavailable';
    const empty = el('div', '', 'empty');
    empty.append(el('p', e.message || 'Unable to load this submission.'), button('Try again', async () => {
      await detail(false); $('detail-title').focus({ preventScroll: true });
    }));
    body.replaceChildren(empty);
    throw e;
  } finally { if (request === detailRequest) $('detail').ariaBusy = 'false'; }
  if (request !== detailRequest) return;
  row.kind = match[2] ? 'looks' : 'mods';
  $('detail').hidden = false;
  $('detail-title').textContent = `${row.name}${row.version ? ` · ${row.version}` : ''}`;
  body.replaceChildren();
  const meta = el('div', '', 'detail-meta'); meta.append(badge(row), el('span', `By ${row.credit}`, 'muted small')); body.append(meta);
  const fields = el('div', '', 'metadata'); body.append(fields);
  field(fields, 'Submission ID', row.id);
  field(fields, 'Submitted', date(row.created));
  if (row.decided) field(fields, 'Last decision', date(row.decided));
  if (row.reason) field(body, 'Decision reason', row.reason);
  const person = row.decision.person || row.decision.escalation?.reason;
  if (person) body.append(el('p', person, 'attention'));
  if (row.kind === 'looks') {
    palette(body, row.described);
    review(body, 'First review', row.decision.first);
    review(body, 'Second review', row.decision.escalation);
    json(body, 'Theme code', row.code);
    json(body, 'Full review record · numbers, decisions, reasons and rationale', row.decision);
    json(body, 'Look description and parts', row.described);
    if (row.media) {
      const viewer = el('div', '', 'viewer');
      const type = row.described.media?.type;
      body.append(el('h3', 'Background file · check before approving'), link(row.media, 'Open background file'), viewer);
      if (type === 'video' || type === 'image') {
        // The sniffed MIME is supplied by the file response, never by submitted text.
        showFile(viewer, row.media, row.mediaType || 'text/plain', 'Look background').catch((e) => viewer.replaceChildren(el('p', e.message)));
      } else showFile(viewer, row.media, 'text/plain', 'Lottie JSON').catch((e) => viewer.replaceChildren(el('p', e.message)));
    }
  } else {
    field(body, 'Author key', row.key); field(body, 'Bundle hash', row.hash);
    field(body, 'Hosts', (row.summary.hosts || []).join(', ') || 'None');
    for (const warning of row.summary.warnings || []) body.append(el('p', warning, 'attention'));
    for (const permission of row.permissions) {
      const panel = el('div', '', 'review-summary');
      panel.append(el('h3', permission.label || permission.id));
      field(panel, 'What it means', permission.means); field(panel, 'Author’s reason', permission.why); body.append(panel);
    }
    if (!row.permissions.length) body.append(el('p', 'No additional permissions requested.', 'muted small'));
    review(body, 'Bundle review', row.decision.review);
    json(body, 'Permissions · full record', row.permissions);
    json(body, 'Full review record · commands, rounds and rationale', row.decision);
    json(body, 'What it adds', row.summary.adds || []);
    body.append(link(`${ROOT}/bundles/${selection}`, 'Download .glazemod'));
    if (row.fileError) body.append(el('p', row.fileError, 'attention'));
    const files = el('div', '', 'files'), viewer = el('div', '', 'viewer');
    body.append(el('h3', 'Bundle files'), el('p', 'Text is shown as text. Pictures and videos have a media viewer; Lottie is shown as JSON.'), files, viewer);
    for (const file of row.files) {
      const url = `${ROOT}/files/${selection}?path=${encodeURIComponent(file.path)}`;
      const line = el('div', '', 'file');
      const view = button('View', () => showFile(viewer, url, file.type, file.path));
      view.ariaLabel = `View ${file.path}`;
      const download = link(`${url}&download=1`, 'Download');
      download.ariaLabel = `Download ${file.path}`;
      line.append(el('code', `${file.path} · ${file.bytes.toLocaleString()} bytes`), view, download);
      files.append(line);
    }
    const bg = row.summary.media;
    if (bg) {
      body.append(el('p', `Background: ${bg.path} (${bg.type}). A human must check this before approving.`, 'attention'));
      const file = row.files.find((f) => f.path === bg.path);
      if (file) showFile(viewer, `${ROOT}/files/${selection}?path=${encodeURIComponent(file.path)}`, file.type, file.path).catch((e) => viewer.replaceChildren(el('p', e.message)));
    }
    const versions = el('ul');
    for (const v of row.versions) { const item = el('li'); item.append(link(`#mods/${v.id}/${v.hash}`, `${v.version} · ${v.status} · ${date(v.created)}`)); versions.append(item); }
    body.append(el('h3', 'Version history'), versions);
  }
  actions(body, row);
}
for (const kind of ['looks', 'mods']) {
  $(`${kind}-search`).addEventListener('input', () => filter(kind));
  $(`${kind}-filter`).addEventListener('change', () => filter(kind));
}
$('close-detail').addEventListener('click', () => {
  detailRequest++; fileRequest++; selection = undefined;
  $('detail').ariaBusy = 'false'; $('close-detail').hidden = true;
  $('detail-title').textContent = 'Choose a submission';
  $('detail-body').replaceChildren(el('p', 'Select an item from the queue or the lists below to read its review.', 'empty detail-empty'));
  lists(); location.hash = '#queue'; $('queue-title').focus({ preventScroll: true }); $('queue').scrollIntoView({ block: 'start', behavior: 'instant' });
});
$('refresh').addEventListener('click', () => refresh().then(() => detail(false)).catch(showError));
$('logout').addEventListener('click', () => api('/logout', { method: 'POST', headers: { 'x-csrf-token': data?.csrf || '' } }).then(() => location.assign(`${ROOT}/login`)).catch(showError));
$('older').addEventListener('click', async () => {
  $('older').disabled = true;
  try { audit(await api(`/api/audit?before=${$('older').dataset.before}`), true); } catch (e) { showError(e); }
  finally { $('older').disabled = false; }
});
window.addEventListener('hashchange', () => detail().catch(showError));
window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
refresh().then(detail).catch(showError);
