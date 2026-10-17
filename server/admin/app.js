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
const showError = (e) => { $('message').textContent = e.message || 'Something went wrong. Refresh and try again.'; };
let data, selection, detailRequest = 0, fileRequest = 0;
async function api(path, options = {}) {
  const response = await fetch(`${ROOT}${path}`, { credentials: 'same-origin', cache: 'no-store', ...options });
  if (response.status === 401) { location.assign(`${ROOT}/login`); throw new Error('Sign in to continue.'); }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The request failed.');
  return body;
}
function list(target, rows) {
  target.replaceChildren();
  if (!rows.length) { target.append(el('p', 'No items.')); return; }
  for (const r of rows) {
    const card = el('article', '', 'item');
    const heading = el('h3');
    heading.append(link(`#${address(r)}`, `${r.name}${r.version ? ` · ${r.version}` : ''}`));
    card.append(heading, el('span', `${r.kind === 'looks' ? 'Look' : 'Mod'} · ${r.status}`, `badge ${r.status}`),
      el('p', `By ${r.credit} · ${date(r.created)}`), el('code', r.id));
    if (r.status === 'pending') card.append(el('p', r.person || 'A person must decide this submission.', 'attention'));
    target.append(card);
  }
}
function filter(kind) {
  if (!data) return;
  const search = $(`${kind}-search`).value.trim().toLowerCase();
  const status = $(`${kind}-filter`).value;
  list($(kind), data[kind].filter((r) => (!status || r.status === status) && [r.name, r.credit, r.id, r.hash, r.version].join(' ').toLowerCase().includes(search)));
}
function audit(rows, append = false) {
  if (!append) $('audit-rows').replaceChildren();
  for (const r of rows) {
    const node = el('li');
    node.append(el('p', `${date(r.at)} · ${r.email} · ${r.action}`), link(`#${address(r)}`, `${r.id}${r.hash ? ` · ${r.hash}` : ''}`));
    if (r.reason) node.append(el('p', r.reason));
    $('audit-rows').append(node);
  }
  $('older').hidden = rows.length < 200;
  $('older').dataset.before = rows.at(-1)?.seq || '';
}
async function refresh() {
  data = await api('/api/data');
  $('email').textContent = data.email;
  list($('pending'), [...data.looks, ...data.mods].filter((r) => r.status === 'pending').sort((a, b) => a.created - b.created || a.id.localeCompare(b.id)));
  filter('looks'); filter('mods');
  $('limits').textContent = `SUBMIT_LIMITS: ${data.limits ? 'on · daily submission and review quotas apply' : 'off · daily submission and review quotas are disabled'}.`;
  const b = data.blocklist;
  $('blocklist').textContent = b ? `Blocklist: sequence ${b.seq}, expires ${date(b.expires)} · ${b.mods} mods, ${b.bundles} bundles, ${b.authors} authors.${Date.parse(b.expires) <= Date.now() ? ' Expired; existing blocks still apply.' : ''}` : 'Blocklist: none published.';
  audit(data.audit);
  $('message').textContent = `${data.looks.length} Looks · ${data.mods.length} mod versions. Queue and audit log updated.`;
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
  const label = el('label', 'Decision reason (required to decline)');
  const reason = el('textarea');
  reason.rows = 3; reason.maxLength = 300;
  label.append(reason); form.append(label);
  const buttons = el('div', '', 'buttons');
  const states = { approve: ['pending'], decline: ['pending', ...(row.kind === 'mods' ? ['queued'] : [])], remove: ['published', 'pending', ...(row.kind === 'mods' ? ['queued'] : [])] };
  for (const verb of ['approve', 'decline', 'remove']) {
    if (!states[verb].includes(row.status)) continue;
    const control = button(verb === 'remove' ? 'Remove from gallery' : verb === 'approve' ? 'Approve' : 'Decline', async () => {
      if (verb === 'decline' && !reason.value.trim()) { reason.setCustomValidity('Give the submitter a reason.'); reason.reportValidity(); reason.focus(); return; }
      reason.setCustomValidity('');
      if (verb === 'remove' && !window.confirm(`Remove ${row.name} from the gallery?`)) return;
      const value = reason.value;
      for (const node of buttons.children) node.disabled = true;
      try {
        await api(`/api/${address(row)}/${verb}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': data.csrf }, body: JSON.stringify({ reason: value }) });
        await refresh();
        await detail();
        $('message').textContent = `${row.name}: ${verb === 'approve' ? 'published' : verb === 'decline' ? 'declined' : 'removed'}. Saved to the audit log.`;
      } finally { for (const node of buttons.children) node.disabled = false; }
    });
    if (verb !== 'approve') control.className = 'secondary';
    buttons.append(control);
  }
  if (buttons.childElementCount) { form.append(buttons); parent.append(form); }
  form.addEventListener('submit', (event) => event.preventDefault());
  reason.addEventListener('input', () => reason.setCustomValidity(''));
}
async function showFile(target, url, type, name) {
  const ticket = ++fileRequest;
  target.replaceChildren(el('p', `Loading ${name}…`));
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
async function detail() {
  const match = /^#(looks\/(c-[0-9a-f]{10})|mods\/([a-z2-7]{16})\/([\w-]{43}))$/.exec(location.hash);
  const request = ++detailRequest;
  fileRequest++;
  if (!match) return;
  selection = match[1];
  const row = await api(`/api/${selection}`);
  if (request !== detailRequest) return;
  row.kind = match[2] ? 'looks' : 'mods';
  $('detail').hidden = false;
  $('detail-title').textContent = `${row.name}${row.version ? ` · ${row.version}` : ''} · ${row.status}`;
  const body = $('detail-body'); body.replaceChildren();
  field(body, 'Credit', row.credit);
  field(body, 'ID', row.id);
  field(body, 'Dates', `Submitted ${date(row.created)} · last decision ${date(row.decided)}`);
  if (row.reason) field(body, 'Decision reason', row.reason);
  const person = row.decision.person || row.decision.escalation?.reason;
  if (person) field(body, 'Why a person was asked', person);
  if (row.kind === 'looks') {
    palette(body, row.described);
    json(body, 'Theme code', row.code, true);
    json(body, 'Both reviewers · numbers, decisions, reasons and rationale', row.decision, true);
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
    json(body, 'Permissions · Glaze’s words and the author’s reasons', row.permissions, true);
    json(body, 'Review · overview, summary, recommendation, rationale, model, commands and rounds', row.decision, true);
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
    body.append(el('h3', 'Other versions'), versions);
  }
  actions(body, row);
  $('detail-title').focus({ preventScroll: true });
  $('detail').scrollIntoView({ block: 'start', behavior: 'instant' });
}
for (const kind of ['looks', 'mods']) {
  $(`${kind}-search`).addEventListener('input', () => filter(kind));
  $(`${kind}-filter`).addEventListener('change', () => filter(kind));
}
$('refresh').addEventListener('click', () => refresh().then(detail).catch(showError));
$('logout').addEventListener('click', () => api('/logout', { method: 'POST', headers: { 'x-csrf-token': data?.csrf || '' } }).then(() => location.assign(`${ROOT}/login`)).catch(showError));
$('older').addEventListener('click', async () => {
  $('older').disabled = true;
  try { audit(await api(`/api/audit?before=${$('older').dataset.before}`), true); } catch (e) { showError(e); }
  finally { $('older').disabled = false; }
});
window.addEventListener('hashchange', () => detail().catch(showError));
window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
refresh().then(detail).catch(showError);
