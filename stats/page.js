// The private Kiln statistics page (stats/page.html): reads the numbers from the page's JSON element and draws the
// filters, the daily chart and the tables. Everything that comes from the data goes in as text, never as markup.
'use strict';
(() => {
  const data = JSON.parse(document.getElementById('kiln-stats-data').textContent);
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name === 'style') Object.assign(node.style, value);  // properties, never a style attribute: the page's policy refuses those
      else node.setAttribute(name, value);
    }
    node.append(...children);
    return node;
  };
  const svg = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  if (!data || !data.days || !data.days.length) {
    $('updated').textContent = 'Nothing has been collected yet.';
    for (const id of ['filters', 'kinds']) $(id).hidden = true;
    return;
  }

  // ---- names ------------------------------------------------------------------------------------------------------
  const KINDS = [
    { id: 'people', name: 'People', color: 'var(--people)', clients: ['browser'] },
    { id: 'launcher', name: 'Launcher updates', color: 'var(--launcher)', clients: ['launcher'] },
    { id: 'tool', name: 'Tools', color: 'var(--tool)', clients: ['tool'] },
    { id: 'auto', name: 'Automated', color: 'var(--auto)', clients: ['bot', 'automated', 'other', 'unknown'] },
  ];
  // a kind of program this page does not know counts as automated
  const kindOfClient = data.clients.map((client) => { const i = KINDS.findIndex((kind) => kind.clients.includes(client)); return i < 0 ? 3 : i; });
  const GROUPS = [['', 'All files'], ['launcher', 'Launcher'], ['server', 'Dedicated servers'], ['runtime', 'Runtime zip'], ['sdk', 'SDK and tools'], ['samples', 'Sample mods'], ['source', 'Source'], ['notes', 'Notes and checksums']];
  const SYSTEMS = { windows: 'Windows', linux: 'Linux', mac: 'macOS', android: 'Android', ios: 'iOS', chromeos: 'ChromeOS', '': 'Not said' };
  const regions = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
  const countryName = (code) => {
    if (code === 'XX') return 'Unknown';
    if (code === 'T1') return 'Tor network';
    try { return (regions && regions.of(code)) || code; } catch { return code; }
  };
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const fmt = (value) => (value > 0 && value < 0.5 ? '<1' : number.format(Math.round(value)));
  const dayLabel = (name, long) => new Date(name + 'T12:00:00Z').toLocaleDateString('en-US', long ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' });
  // newest release first; a folder that is not a version number (a hotfix) after them
  const versionOrder = (a, b) => (/^\d/.test(b) - /^\d/.test(a)) || b.localeCompare(a, 'en', { numeric: true });

  // ---- state and filters ------------------------------------------------------------------------------------------
  const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [0, 'All']];
  const state = { range: data.days.length >= 30 ? 30 : 0, version: '', group: '', kinds: new Set(['people', 'launcher', 'tool']) };
  // nothing but automated or unknown programs (a zone without the User-Agent): show them, or the page is empty
  if (kindOfClient.every((kind) => kind === 3)) state.kinds.add('auto');

  for (const [days, label] of RANGES) {
    if (days > data.days.length) continue;  // "All" is that range
    const button = el('button', { type: 'button', text: label, 'aria-pressed': String(state.range === days) });
    button.addEventListener('click', () => { state.range = days; for (const other of $('range').children) other.setAttribute('aria-pressed', String(other === button)); draw(); });
    $('range').append(button);
  }
  const versions = [...new Set(data.files.map((file) => file.version))].sort(versionOrder);
  $('version').append(el('option', { value: '', text: 'All versions' }), ...versions.map((version) => el('option', { value: version, text: version })));
  $('version').addEventListener('change', () => { state.version = $('version').value; draw(); });
  const usedGroups = new Set(data.files.map((file) => file.kind));
  $('group').append(...GROUPS.filter(([id]) => !id || usedGroups.has(id)).map(([id, label]) => el('option', { value: id, text: label })));
  $('group').addEventListener('change', () => { state.group = $('group').value; draw(); });
  const kindButtons = KINDS.map((kind) => {
    const count = el('b');
    const button = el('button', { class: 'kind', type: 'button', 'aria-pressed': String(state.kinds.has(kind.id)) }, el('span', { class: 'swatch', style: { background: kind.color } }), el('span', { text: kind.name }), count);
    button.addEventListener('click', () => {
      if (state.kinds.has(kind.id)) state.kinds.delete(kind.id); else state.kinds.add(kind.id);
      button.setAttribute('aria-pressed', String(state.kinds.has(kind.id)));
      draw();
    });
    $('kinds').append(button);
    return { button, count };
  });
  $('daily-toggle').addEventListener('click', () => {
    const table = $('daily-table').hidden;
    $('daily-table').hidden = !table;
    $('daily').hidden = table;
    $('daily-toggle').textContent = table ? 'Show as chart' : 'Show as table';
    $('daily-toggle').setAttribute('aria-pressed', String(table));
  });

  // ---- header -----------------------------------------------------------------------------------------------------
  const when = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  $('updated').textContent = `Collected ${when(data.collected || data.generated)} (your time) · ${data.days.length === 1 ? dayLabel(data.days[0].day) : `${dayLabel(data.days[0].day)} to ${dayLabel(data.days.at(-1).day)}, ${data.days.length} days`}`;
  for (const alert of data.alerts || []) $('warnings').append(el('p', { class: 'warn', text: alert }));
  for (const note of data.notes || []) $('notes').append(el('p', { text: note }));

  // ---- drawing ----------------------------------------------------------------------------------------------------
  const tip = el('div', { class: 'tip', hidden: '' });
  $('daily').append(tip);

  /** Rows: a name (and a second line), four numbers by kind. Drawn as a table whose bar column is the chart. */
  function ranked(target, rows, { nameHead, limit = 0 }) {
    target.replaceChildren();
    const shown = state.kinds;
    const total = (row) => KINDS.reduce((sum, kind, i) => sum + (shown.has(kind.id) ? row.values[i] : 0), 0);
    const list = rows.map((row) => ({ ...row, total: total(row) })).filter((row) => row.total > 0);
    if (!rows.sorted) list.sort((a, b) => b.total - a.total);
    if (!list.length) { target.append(el('p', { class: 'empty', text: 'No downloads here.' })); return list; }
    const all = list.reduce((sum, row) => sum + row.total, 0);
    const most = Math.max(...list.map((row) => row.total));
    const body = el('tbody');
    for (const row of limit ? list.slice(0, limit) : list) {
      const stack = el('div', { class: 'stack', role: 'img', 'aria-label': KINDS.map((kind, i) => (shown.has(kind.id) && row.values[i] > 0 ? `${kind.name} ${fmt(row.values[i])}` : '')).filter(Boolean).join(', ') });
      KINDS.forEach((kind, i) => {
        if (!shown.has(kind.id) || !(row.values[i] > 0)) return;
        stack.append(el('span', { style: { background: kind.color, width: `${(row.values[i] / most * 100).toFixed(2)}%` }, title: `${kind.name}: ${fmt(row.values[i])}` }));
      });
      // the bar sits under its name, so a narrow card still has room for both
      const name = el('td', { class: 'name' }, el('span', { text: row.name }));
      if (row.detail && row.detail !== row.name) name.append(el('small', { text: row.detail }));
      name.append(stack);
      body.append(el('tr', {}, name, el('td', { class: 'num', text: fmt(row.total) }), el('td', { class: 'num', text: `${(row.total / all * 100).toFixed(row.total / all < 0.1 ? 1 : 0)}%` })));
    }
    target.append(el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: nameHead }), el('th', { class: 'num', text: 'Downloads' }), el('th', { class: 'num', text: 'Share' }))), body));
    return list;
  }

  /** A y axis for counts: whole-number steps of 1, 2 or 5 times a power of ten, at most six of them. */
  function axis(most) {
    const rough = Math.max(1, most) / 5;
    const power = 10 ** Math.floor(Math.log10(rough));
    const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough));
    return { step, max: Math.ceil(Math.max(1, most) / step) * step };
  }

  function daily(days) {
    const host = $('daily');
    host.querySelector('svg')?.remove();
    const shown = KINDS.map((kind, i) => (state.kinds.has(kind.id) ? i : -1)).filter((i) => i >= 0);
    const totals = days.map((day) => shown.reduce((sum, i) => sum + day.values[i], 0));
    const width = Math.max(320, host.clientWidth || 800);
    const height = 250, left = 44, right = 8, top = 10, bottom = 26;
    const plotW = width - left - right, plotH = height - top - bottom;
    const { step, max } = axis(Math.max(...totals));
    const band = plotW / days.length;
    const barW = Math.max(1, Math.min(24, band - 2));
    const y = (value) => top + plotH - value / max * plotH;
    const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', tabindex: '0', 'aria-label': `Downloads per day, ${days.length} days. Use the left and right arrow keys to read a day; the table view has every number.` });
    for (let value = 0; value <= max; value += step) {
      root.append(svg('line', { x1: left, x2: width - right, y1: y(value), y2: y(value), stroke: value ? 'var(--grid)' : 'var(--axis)', 'stroke-width': 1 }));
      const label = svg('text', { x: left - 8, y: y(value) + 4, 'text-anchor': 'end' });
      label.textContent = max >= 10000 ? `${value / 1000}K` : number.format(value);
      root.append(label);
    }
    const every = Math.max(1, Math.ceil(64 / band));
    const marks = [];
    days.forEach((day, d) => {
      const x = left + band * d + (band - barW) / 2;
      const mark = svg('rect', { x: left + band * d, y: top, width: band, height: plotH + 4, fill: 'transparent' });
      root.append(mark);
      let base = 0;
      const last = shown.filter((i) => day.values[i] > 0).at(-1);
      for (const i of shown) {
        const value = day.values[i];
        if (!(value > 0)) continue;
        const y1 = y(base + value), y0 = y(base);
        const gap = base > 0 && y0 - y1 > 3 ? 2 : 0;  // the surface gap between two segments
        const h = Math.max(1, y0 - y1 - gap);
        const r = i === last ? Math.min(4, barW / 2, h) : 0;
        root.append(svg('path', { d: `M${x},${y1 + h}V${y1 + r}q0,${-r} ${r},${-r}h${barW - 2 * r}q${r},0 ${r},${r}V${y1 + h}Z`, fill: KINDS[i].color, 'pointer-events': 'none' }));
        base += value;
      }
      if ((days.length - 1 - d) % every === 0) {
        const label = svg('text', { x: left + band * d + band / 2, y: height - 8, 'text-anchor': 'middle' });
        label.textContent = dayLabel(day.day);
        root.append(label);
      }
      marks.push(mark);
      mark.addEventListener('pointerenter', () => point(d));
      mark.addEventListener('pointermove', () => point(d));
    });
    let at = -1;
    function point(d) {
      if (at >= 0) marks[at].setAttribute('fill', 'transparent');
      at = d;
      if (d < 0) { tip.hidden = true; return; }
      marks[d].setAttribute('fill', 'var(--wash)');
      const day = days[d];
      tip.replaceChildren(el('div', { class: 'when', text: dayLabel(day.day, true) + (day.final ? '' : ' (so far)') }));
      for (const i of shown) tip.append(el('div', { class: 'row' }, el('span', { class: 'key', style: { background: KINDS[i].color } }), el('span', { text: KINDS[i].name }), el('b', { text: fmt(day.values[i]) })));
      if (shown.length > 1) tip.append(el('div', { class: 'row total' }, el('span', { text: 'All' }), el('b', { text: fmt(totals[d]) })));
      tip.hidden = false;
      const center = (left + band * d + band / 2) / width * host.clientWidth;
      const tipW = tip.offsetWidth;
      tip.style.left = `${Math.max(0, Math.min(host.clientWidth - tipW, center > host.clientWidth / 2 ? center - tipW - 12 : center + 12))}px`;
      tip.style.top = '8px';
    }
    root.addEventListener('pointerleave', () => point(-1));
    root.addEventListener('blur', () => point(-1));
    root.addEventListener('focus', () => point(at >= 0 ? at : days.length - 1));
    root.addEventListener('keydown', (event) => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!step) return;
      event.preventDefault();
      point(Math.max(0, Math.min(days.length - 1, (at < 0 ? days.length - 1 : at) + step)));
    });
    host.prepend(root);

    const head = el('tr', {}, el('th', { text: 'Day' }), ...shown.map((i) => el('th', { class: 'num', text: KINDS[i].name })), el('th', { class: 'num', text: 'All' }));
    const body = el('tbody');
    for (let d = days.length - 1; d >= 0; d--) {
      body.append(el('tr', {}, el('td', { text: dayLabel(days[d].day, true) + (days[d].final ? '' : ' (so far)') }), ...shown.map((i) => el('td', { class: 'num', text: fmt(days[d].values[i]) })), el('td', { class: 'num', text: fmt(totals[d]) })));
    }
    $('daily-table').replaceChildren(el('table', {}, el('thead', {}, head), body));
  }

  function draw() {
    const count = state.range ? Math.min(state.range, data.days.length) : data.days.length;
    const first = data.days.length - count;
    const before = first - count;  // the same number of days before, for the change
    const zero = () => [0, 0, 0, 0];
    const days = data.days.slice(first).map((day) => ({ ...day, values: zero() }));
    const add = (map, key, make) => { if (!map.has(key)) map.set(key, make()); return map.get(key); };
    const byFile = new Map(), byCountry = new Map(), byVersion = new Map(), bySystem = new Map(), byReferrer = new Map();
    const kinds = zero();
    let earlier = 0, requests = 0;
    for (const [d, f, c, client, system, referrer, downloads, answers] of data.rows) {
      const file = data.files[f];
      if (state.version && file.version !== state.version) continue;
      if (state.group && file.kind !== state.group) continue;
      const kind = kindOfClient[client];
      if (d < first) { if (d >= before && state.kinds.has(KINDS[kind].id)) earlier += downloads; continue; }
      kinds[kind] += downloads;
      days[d - first].values[kind] += downloads;
      if (state.kinds.has(KINDS[kind].id)) requests += answers;
      const key = state.version ? `${file.version}/${file.file}` : file.key;
      const entry = add(byFile, key, () => ({ name: file.label, detail: state.version ? file.file : file.key.replace('*', '<version>'), values: zero() }));
      entry.values[kind] += downloads;
      add(byCountry, c, () => ({ name: countryName(data.countries[c]), values: zero() })).values[kind] += downloads;
      add(byVersion, file.version, () => ({ name: file.version, values: zero() })).values[kind] += downloads;
      add(bySystem, system, () => ({ name: SYSTEMS[data.systems[system]] || data.systems[system], values: zero() })).values[kind] += downloads;
      add(byReferrer, referrer, () => ({ name: data.referrers[referrer] || 'No referring site', values: zero() })).values[kind] += downloads;
    }
    KINDS.forEach((kind, i) => { kindButtons[i].count.textContent = fmt(kinds[i]); });
    const total = KINDS.reduce((sum, kind, i) => sum + (state.kinds.has(kind.id) ? kinds[i] : 0), 0);

    const tile = (label, value, note) => {
      const node = el('div', { class: 'card tile' }, el('div', { class: 'label', text: label }), el('div', { class: 'value', text: value }));
      if (note) node.append(note);
      return node;
    };
    let change = null;
    if (before >= 0 && earlier >= 5) {
      const pct = (total - earlier) / earlier * 100;
      change = el('div', { class: 'delta' }, el('span', { class: pct >= 0 ? 'up' : 'down', text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%` }), ` vs the ${count} days before (${fmt(earlier)})`);
    }
    const daysText = count === 1 ? '1 day' : `${count} days`;
    const rangeText = state.range && count < data.days.length ? `the last ${daysText}` : daysText;
    daily(days);
    const files = ranked($('files'), [...byFile.values()], { nameHead: 'File' });
    $('files-sub').textContent = state.version ? `${files.length} files of ${state.version}.` : `${files.length} files; the same file of every version added up.`;
    const places = ranked($('countries'), [...byCountry.values()], { nameHead: 'Country' });
    $('countries-sub').textContent = 'Where Cloudflare places the address.';
    $('tiles').replaceChildren(
      tile(`Downloads in ${rangeText}`, fmt(total), change),
      tile('Average per day', (total / count).toFixed(total / count < 10 ? 1 : 0), el('div', { class: 'delta', text: `${fmt(requests)} complete answers` })),
      tile('Countries', String(places.length), null),
    );
    const versionRows = [...byVersion.values()].sort((a, b) => versionOrder(a.name, b.name));
    versionRows.sorted = true;
    ranked($('versions'), versionRows, { nameHead: 'Version' });
    ranked($('systems'), [...bySystem.values()], { nameHead: 'System' });
    const hasReferrers = data.referrers.some((host) => host);
    $('referrers-card').hidden = !hasReferrers;
    if (hasReferrers) ranked($('referrers'), [...byReferrer.values()], { nameHead: 'Site' });
  }

  draw();
  let resize = 0;
  new ResizeObserver(() => { clearTimeout(resize); resize = setTimeout(draw, 120); }).observe($('daily'));
})();
