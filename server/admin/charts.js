/* frostdev HQ: the charts. A stacked bar per day with a tooltip, keyboard reading and a table view; tables whose bar
   column is the chart; sparklines for tiles; and Explorer, the filterable view Kiln's downloads and the site's page views
   share. Everything that comes from the data goes in as text, never as markup. Series colors are fixed per kind
   (style.css, validated for the dark surface), so a filter never repaints a kind. */
'use strict';
(() => {
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name === 'style') Object.assign(node.style, value); // properties, never a style attribute: the policy refuses those
      else node.setAttribute(name, value);
    }
    node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
    return node;
  };
  const svg = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const fmt = (value) => (value > 0 && value < 0.5 ? '<1' : number.format(Math.round(value)));
  const compact = (value) => (Math.abs(value) < 10000 ? fmt(value) : short.format(value));
  const dayLabel = (name, long) => new Date(`${name}T12:00:00Z`).toLocaleDateString('en-US', long ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const regions = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
  const countryName = (code) => {
    if (code === 'XX') return 'Unknown';
    if (code === 'T1') return 'Tor network';
    try { return (regions && regions.of(code)) || code; } catch { return code; }
  };
  const SYSTEMS = { windows: 'Windows', linux: 'Linux', mac: 'macOS', android: 'Android', ios: 'iOS', chromeos: 'ChromeOS', '': 'Not said' };

  /** A y axis for counts: whole-number steps of 1, 2 or 5 times a power of ten, at most six of them. */
  function axis(most) {
    const rough = Math.max(1, most) / 5;
    const power = 10 ** Math.floor(Math.log10(rough));
    const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough));
    return { step, max: Math.ceil(Math.max(1, most) / step) * step };
  }
  /** What to say about a day that is not a complete count: today, or a day that was never collected. */
  const dayState = (day) => (day.missing ? ' (not collected)' : day.final ? '' : ' (so far)');

  /** Stacked bars, one per day. days: [{day, final, missing, values: [per kind]}]; kinds: [{name, color}]; shown: the
   *  kinds' indexes to draw. Returns the same numbers as a table, for the table view. */
  function dailyChart(host, days, kinds, shown, { measure = 'Count' } = {}) {
    host.replaceChildren();
    const tip = el('div', { class: 'tip', hidden: '' });
    const totals = days.map((day) => shown.reduce((sum, i) => sum + day.values[i], 0));
    const width = Math.max(320, host.clientWidth || 800);
    const height = 240, left = 44, right = 8, top = 10, bottom = 26;
    const plotW = width - left - right, plotH = height - top - bottom;
    const { step, max } = axis(Math.max(0, ...totals));
    const band = plotW / Math.max(1, days.length);
    const barW = Math.max(1, Math.min(24, band - 2));
    const y = (value) => top + plotH - value / max * plotH;
    const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', tabindex: '0', 'aria-label': `${measure} per day, ${days.length} days. Use the left and right arrow keys to read a day; the table view has every number.` });
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
        const gap = base > 0 && y0 - y1 > 3 ? 2 : 0; // the surface gap between two segments
        const h = Math.max(1, y0 - y1 - gap);
        const r = i === last ? Math.min(4, barW / 2, h) : 0;
        root.append(svg('path', { d: `M${x},${y1 + h}V${y1 + r}q0,${-r} ${r},${-r}h${barW - 2 * r}q${r},0 ${r},${r}V${y1 + h}Z`, fill: kinds[i].color, 'pointer-events': 'none' }));
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
      tip.replaceChildren(el('div', { class: 'when', text: dayLabel(day.day, true) + dayState(day) }));
      for (const i of shown) tip.append(el('div', { class: 'row' }, el('span', { class: 'key', style: { background: kinds[i].color } }), el('span', { text: kinds[i].name }), el('b', { text: fmt(day.values[i]) })));
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
      const move = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!move) return;
      event.preventDefault();
      point(Math.max(0, Math.min(days.length - 1, (at < 0 ? days.length - 1 : at) + move)));
    });
    host.append(root, tip);
    const head = el('tr', {}, el('th', { text: 'Day' }), ...shown.map((i) => el('th', { class: 'num', text: kinds[i].name })), el('th', { class: 'num', text: 'All' }));
    const body = el('tbody');
    for (let d = days.length - 1; d >= 0; d--) {
      body.append(el('tr', {}, el('td', { text: dayLabel(days[d].day, true) + dayState(days[d]) }), ...shown.map((i) => el('td', { class: 'num', text: fmt(days[d].values[i]) })), el('td', { class: 'num', text: fmt(totals[d]) })));
    }
    return el('table', {}, el('thead', {}, head), body);
  }

  /** Rows {name, detail, values: [per kind]} as a table whose bar column is the chart. */
  function ranked(target, rows, { nameHead, kinds, shown, measure = 'Count', limit = 0, sorted = false }) {
    target.replaceChildren();
    const total = (row) => kinds.reduce((sum, kind, i) => sum + (shown.has(i) ? row.values[i] : 0), 0);
    const list = rows.map((row) => ({ ...row, total: total(row) })).filter((row) => row.total > 0);
    if (!sorted) list.sort((a, b) => b.total - a.total);
    if (!list.length) { target.append(el('p', { class: 'empty', text: 'Nothing here.' })); return list; }
    const all = list.reduce((sum, row) => sum + row.total, 0);
    const most = Math.max(...list.map((row) => row.total));
    const body = el('tbody');
    for (const row of limit ? list.slice(0, limit) : list) {
      const stack = el('div', { class: 'stack', role: 'img', 'aria-label': kinds.map((kind, i) => (shown.has(i) && row.values[i] > 0 ? `${kind.name} ${fmt(row.values[i])}` : '')).filter(Boolean).join(', ') });
      kinds.forEach((kind, i) => {
        if (!shown.has(i) || !(row.values[i] > 0)) return;
        stack.append(el('span', { style: { background: kind.color, width: `${(row.values[i] / most * 100).toFixed(2)}%` }, title: `${kind.name}: ${fmt(row.values[i])}` }));
      });
      const name = el('td', { class: 'name' }, el('span', { text: row.name }));
      if (row.detail && row.detail !== row.name) name.append(el('small', { text: row.detail }));
      name.append(stack);
      body.append(el('tr', {}, name, el('td', { class: 'num', text: fmt(row.total) }), el('td', { class: 'num', text: `${(row.total / all * 100).toFixed(row.total / all < 0.1 ? 1 : 0)}%` })));
    }
    target.append(el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: nameHead }), el('th', { class: 'num', text: measure }), el('th', { class: 'num', text: 'Share' }))), body));
    return list;
  }

  /** A small area line for a tile: values over time, oldest first. */
  function spark(values, { color = 'var(--bright)', label = '' } = {}) {
    const w = 120, h = 34, n = values.length;
    const root = svg('svg', { class: 'spark', viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none', role: 'img', 'aria-label': label || `${n} values` });
    if (n < 2) return root;
    const lo = Math.min(...values), hi = Math.max(...values);
    const x = (i) => i / (n - 1) * w;
    const y = (v) => (hi === lo ? h / 2 : h - 3 - (v - lo) / (hi - lo) * (h - 6));
    const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    root.append(svg('path', { d: `${line}L${w},${h}L0,${h}Z`, fill: color, 'fill-opacity': '.13' }),
      svg('path', { d: line, fill: 'none', stroke: color, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }));
    return root;
  }

  const tile = (label, value, ...notes) => el('div', { class: 'card tile' }, el('div', { class: 'label', text: label }), el('div', { class: 'value', text: value }), ...notes);
  const change = (now, before, days) => {
    if (!(before >= 5)) return null;
    const pct = (now - before) / before * 100;
    return el('div', { class: 'delta' }, el('span', { class: pct >= 0 ? 'up' : 'down', text: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%` }), ` vs the ${days} days before (${fmt(before)})`);
  };

  /** The filterable view over one statistics file (Kiln's kiln.json, the site's site.json). Rows are
   *  [day, item, country, client, system, referrer, value, ...]. cfg: { data, measure, kinds: [{id, name, color, clients}],
   *  defaultKinds, item: {title, head, of(row, state) -> {key, name, detail}, sub(state, n)}, selects: [{id, label,
   *  options: [[value, label]], test(row, value)}], tables: [{title, sub, head, of(row) -> {key, name}, sort}],
   *  answers(row) (optional, a second count shown under the average), notes: [element] }. */
  function Explorer(host, cfg, previous) {
    const { data } = cfg;
    host.replaceChildren();
    const warnings = el('div');
    for (const alert of data?.alerts || []) warnings.append(el('p', { class: 'warn', text: alert }));
    host.append(warnings);
    if (!data || !data.days || !data.days.length) {
      host.append(el('p', { class: 'empty', text: 'Nothing has been collected yet.' }));
      return;
    }
    const KINDS = cfg.kinds;
    const kindOfClient = data.clients.map((client) => { const i = KINDS.findIndex((kind) => kind.clients.includes(client)); return i < 0 ? KINDS.length - 1 : i; });
    const RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [0, 'All']].filter(([days]) => days <= data.days.length);
    const rangeDays = RANGES.some(([days]) => days === previous?.range) ? previous.range : data.days.length >= 30 ? 30 : 0;
    const selects = Object.fromEntries((cfg.selects || []).map((s) => {
      const value = previous?.selects[s.id];
      return [s.id, s.options.some(([option]) => option === value) ? value : ''];
    }));
    const state = { range: rangeDays, selects, kinds: new Set(previous?.kinds ?? cfg.defaultKinds), showTable: previous?.showTable ?? false };
    // nothing but automated or unknown programs (a zone without the User-Agent): show them, or the view is empty
    if (!previous && kindOfClient.every((kind) => !state.kinds.has(KINDS[kind].id))) for (const kind of KINDS) state.kinds.add(kind.id);

    const range = el('div', { class: 'seg', role: 'group', 'aria-label': 'Time range' });
    for (const [days, label] of RANGES) {
      const button = el('button', { type: 'button', text: label, 'aria-pressed': String(state.range === days) });
      button.addEventListener('click', () => { state.range = days; for (const other of range.children) other.setAttribute('aria-pressed', String(other === button)); draw(); });
      range.append(button);
    }
    const filters = el('div', { class: 'filters-row' }, range);
    for (const s of cfg.selects || []) {
      const select = el('select', {}, ...s.options.map(([value, label]) => el('option', { value, text: label })));
      select.value = state.selects[s.id];
      select.addEventListener('change', () => { state.selects[s.id] = select.value; draw(); });
      filters.append(el('label', { class: 'pick' }, s.label, select));
    }
    const kindsBox = el('div', { class: 'kinds', role: 'group', 'aria-label': 'Who (also the key to the colors)' });
    const kindButtons = KINDS.map((kind) => {
      const count = el('b');
      const button = el('button', { class: 'kind', type: 'button', 'aria-pressed': String(state.kinds.has(kind.id)) }, el('span', { class: 'swatch', style: { background: kind.color } }), el('span', { text: kind.name }), count);
      button.addEventListener('click', () => {
        if (state.kinds.has(kind.id)) state.kinds.delete(kind.id); else state.kinds.add(kind.id);
        button.setAttribute('aria-pressed', String(state.kinds.has(kind.id)));
        draw();
      });
      kindsBox.append(button);
      return { button, count };
    });
    const tiles = el('section', { class: 'tiles', 'aria-label': 'Totals' });
    const chart = el('div', { class: 'chart' });
    const table = el('div', { class: 'scroll' });
    const toggle = el('button', { class: 'link', type: 'button' });
    const presentation = () => {
      table.hidden = !state.showTable; chart.hidden = state.showTable;
      toggle.textContent = state.showTable ? 'Show as chart' : 'Show as table';
      toggle.setAttribute('aria-pressed', String(state.showTable));
    };
    toggle.addEventListener('click', () => { state.showTable = !state.showTable; presentation(); });
    presentation();
    const daily = el('section', { class: 'card' }, el('div', { class: 'card-head' }, el('div', {}, el('h2', { text: `${cfg.measure} per day` }), el('p', { class: 'sub', text: 'Days are UTC. Today is not over yet.' })), toggle), chart, table);
    const cards = [{ ...cfg.item, item: true }, { title: 'Countries', head: 'Country', sub: 'Where Cloudflare places the address.', of: (row) => ({ key: row[2], name: countryName(data.countries[row[2]]) }) }, ...cfg.tables];
    const boxes = cards.map((c) => {
      const box = el('div', { class: 'scroll' });
      const sub = el('p', { class: 'sub', text: c.sub || '' });
      const section = el('section', { class: 'card' }, el('div', { class: 'card-head' }, el('div', {}, el('h2', { text: c.title }), sub)), box);
      return { ...c, box, sub, section };
    });
    const when = new Date(data.collected || data.generated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const span = data.days.length === 1 ? dayLabel(data.days[0].day) : `${dayLabel(data.days[0].day)} to ${dayLabel(data.days.at(-1).day)}, ${data.days.length} days`;
    const notes = el('section', { class: 'notes' }, ...(cfg.notes || []), ...(data.notes || []).map((note) => el('p', { text: note })));
    host.append(el('p', { class: 'sub', text: `${data.collected ? 'Collected' : 'Rendered'} ${when} (your time) · ${span}` }), filters, kindsBox, tiles, daily, el('div', { class: 'grid' }, ...boxes.map((b) => b.section)), notes);

    let drawDaily;
    function draw() {
      const count = state.range ? Math.min(state.range, data.days.length) : data.days.length;
      const first = data.days.length - count;
      const before = first - count; // the same number of days before, for the change
      const zero = () => KINDS.map(() => 0);
      const days = data.days.slice(first).map((day) => ({ ...day, values: zero() }));
      const groups = boxes.map(() => new Map());
      const kinds = zero();
      let earlier = 0, answers = 0;
      rows: for (const row of data.rows) {
        for (const s of cfg.selects || []) if (state.selects[s.id] && !s.test(row, state.selects[s.id])) continue rows;
        const d = row[0], value = row[6], kind = kindOfClient[row[3]];
        if (d < first) { if (d >= before && state.kinds.has(KINDS[kind].id)) earlier += value; continue; }
        kinds[kind] += value;
        days[d - first].values[kind] += value;
        if (cfg.answers && state.kinds.has(KINDS[kind].id)) answers += cfg.answers(row);
        boxes.forEach((b, i) => {
          const g = b.of(row, state);
          if (!groups[i].has(g.key)) groups[i].set(g.key, { name: g.name, detail: g.detail, empty: g.empty, values: zero() });
          groups[i].get(g.key).values[kind] += value;
        });
      }
      KINDS.forEach((kind, i) => { kindButtons[i].count.textContent = fmt(kinds[i]); });
      const shownIdx = KINDS.map((kind, i) => (state.kinds.has(kind.id) ? i : -1)).filter((i) => i >= 0);
      const shown = new Set(shownIdx);
      const total = shownIdx.reduce((sum, i) => sum + kinds[i], 0);
      const daysText = count === 1 ? '1 day' : `${count} days`;
      const rangeText = state.range && count < data.days.length ? `the last ${daysText}` : daysText;
      drawDaily = () => table.replaceChildren(dailyChart(chart, days, KINDS, shownIdx, { measure: cfg.measure }));
      drawDaily();
      let places = [];
      boxes.forEach((b, i) => {
        const rows = [...groups[i].values()];
        if (b.sort) rows.sort(b.sort);
        const list = ranked(b.box, rows, { nameHead: b.head, kinds: KINDS, shown, measure: cfg.measure, sorted: !!b.sort });
        if (b.item && b.subOf) b.sub.textContent = b.subOf(state, list.length);
        if (b.title === 'Countries') places = list;
        if (b.hideEmpty) b.section.hidden = !list.length || (list.length === 1 && list[0].empty);
      });
      const avg = total / count;
      tiles.replaceChildren(
        tile(`${cfg.measure} in ${rangeText}`, fmt(total), before >= 0 ? change(total, earlier, count) : null),
        tile('Average per day', avg.toFixed(avg < 10 ? 1 : 0), cfg.answers ? el('div', { class: 'delta', text: `${fmt(answers)} complete answers` }) : null),
        tile('Countries', String(places.length)),
        ...(cfg.extraTiles ? cfg.extraTiles(state) : []),
      );
    }
    draw();
    let width = chart.clientWidth;
    const observer = new ResizeObserver(() => {
      if (chart.clientWidth && chart.clientWidth !== width) { width = chart.clientWidth; drawDaily(); }
    });
    observer.observe(chart);
    return { state, destroy: () => observer.disconnect() };
  }

  globalThis.HQCharts = { el, svg, fmt, compact, dayLabel, countryName, SYSTEMS, axis, dailyChart, ranked, spark, tile, change, Explorer };
})();
