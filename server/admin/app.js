/* frostdev HQ, the shell: the rail, the routes and the views that are not the gallery's review (gallery.js) — the
   overview, Kiln's downloads, Glaze's numbers and the site's page views. Their numbers come from stats/collect.mjs's
   files (/hq/api/stats/<name>) and the gallery's own records (/hq/api/glaze). Text from data goes in as text only. */
'use strict';
(() => {
  const ROOT = '/hq';
  const C = globalThis.HQCharts;
  const { el, fmt, compact, spark, tile, dayLabel } = C;
  const $ = (id) => document.getElementById(id);
  const VIEWS = ['overview', 'kiln', 'glaze', 'site', 'gallery', 'activity'];
  const NAV = { overview: 'nav-overview', kiln: 'nav-kiln', glaze: 'nav-glaze', site: 'nav-site', mods: 'nav-mods', looks: 'nav-looks', activity: 'nav-activity' };
  let csrf = '', gallery = null, route = { view: 'overview' }, needsShown = -1;
  const cache = {};
  const explorers = {}, explorerState = {};

  const toast = (text, error = false) => {
    const m = $('message'); m.textContent = text; m.className = `toast${error ? ' error' : ''}`; m.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { m.hidden = true; }, error ? 7000 : 3500);
  };
  const api = async (path, init) => {
    const r = await fetch(`${ROOT}${path}`, { credentials: 'same-origin', ...init });
    if (r.status === 401) { location.assign(`${ROOT}/login${location.hash}`); throw new Error('Signed out.'); }
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || `Request failed (${r.status}).`);
    return r.json();
  };
  /** A statistics file or the gallery's numbers, kept for ten minutes; null when it is not there. */
  const get = async (name, fresh = false) => {
    const hit = cache[name];
    if (hit && !fresh && Date.now() - hit.at < 600e3) return hit.value;
    const value = await api(name === 'glaze' ? '/api/glaze' : `/api/stats/${name}`).catch((e) => ({ __error: e.message }));
    cache[name] = { at: Date.now(), value };
    return value;
  };
  const ok = (v) => v && !v.__error;
  const money = (n) => `$${(Number(n) || 0).toFixed(Number(n) >= 100 ? 0 : 2)}`;
  const ago = (iso) => {
    const s = (Date.now() - Date.parse(iso)) / 1000;
    if (!Number.isFinite(s)) return '';
    if (s < 90) return 'just now';
    if (s < 5400) return `${Math.round(s / 60)} min ago`;
    if (s < 172800) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} days ago`;
  };
  const head = (eyebrow, title, sub, ...extra) => el('div', { class: 'view-head' }, el('div', {}, el('p', { class: 'eyebrow', text: eyebrow }), el('h1', { text: title }), sub ? el('p', { class: 'sub', text: sub }) : null), ...extra);
  const card = (title, sub, ...kids) => el('section', { class: 'card' }, el('div', { class: 'card-head' }, el('div', {}, el('h2', { text: title }), sub ? el('p', { class: 'sub', text: sub }) : null)), ...kids);
  const missing = (what, value) => el('p', { class: 'warn', text: `${what}: ${value?.__error || 'not available'}` });

  // ---- kinds of program: one color per kind everywhere (style.css) -------------------------------------------------
  const KILN_KINDS = [
    { id: 'people', name: 'People', color: 'var(--people)', clients: ['browser'] },
    { id: 'launcher', name: 'Launcher updates', color: 'var(--launcher)', clients: ['launcher'] },
    { id: 'tool', name: 'Tools', color: 'var(--tool)', clients: ['tool'] },
    { id: 'auto', name: 'Automated', color: 'var(--auto)', clients: ['bot', 'automated', 'other', 'unknown'] },
  ];
  const SITE_KINDS = [
    { id: 'people', name: 'People', color: 'var(--people)', clients: ['browser'] },
    { id: 'auto', name: 'Automated', color: 'var(--auto)', clients: ['bot', 'automated', 'other', 'unknown'] },
    { id: 'tool', name: 'Tools and apps', color: 'var(--tool)', clients: ['tool', 'launcher'] },
  ];
  /** Per day for the last `n` days: the sum of the rows whose client is one of `clients`. */
  const perDay = (data, clients, n = 30) => {
    if (!data?.days?.length) return [];
    const wanted = new Set(data.clients.map((c, i) => (clients.includes(c) ? i : -1)).filter((i) => i >= 0));
    const first = Math.max(0, data.days.length - n);
    const out = data.days.slice(first).map(() => 0);
    for (const row of data.rows) if (row[0] >= first && wanted.has(row[3])) out[row[0] - first] += row[6];
    return out;
  };
  const sum = (list) => list.reduce((a, b) => a + b, 0);
  /** A number from public.json's daily history, oldest first. */
  const trend = (pub, source, field, n = 30) => (pub?.history || []).slice(-n).map((p) => p[source]?.[field]).filter((v) => typeof v === 'number');
  const latest = (pub, source) => pub?.sources?.[source]?.latest || null;
  const sinceFirst = (values) => (values.length > 1 ? values.at(-1) - values[0] : null);
  const numberTile = (product, label, value, { values = [], note = '', href = '', attention = false } = {}) => {
    const t = tile(label, value === null || value === undefined ? '—' : typeof value === 'number' ? compact(value) : value,
      note ? el('div', { class: 'note', text: note }) : null, values.length > 1 ? spark(values, { label: `${label}, last ${values.length} days` }) : null);
    if (product) t.prepend(el('span', { class: 'product', text: product }));
    if (attention) t.classList.add('attention');
    if (!href) return t;
    const a = el('a', { class: t.className, href }); a.append(...t.childNodes); return a;
  };

  // ---- overview ----------------------------------------------------------------------------------------------------
  async function overview(host) {
    const [kiln, site, pub, status, glaze] = await Promise.all(['kiln', 'site', 'public', 'status', 'glaze'].map((n) => get(n)));
    const g = gallery?.data();
    const kilnDays = ok(kiln) ? perDay(kiln, ['browser', 'launcher', 'tool']) : [];
    const siteDays = ok(site) ? perDay(site, ['browser']) : [];
    const nexus = latest(pub, 'nexus:kiln'), ghKiln = latest(pub, 'github:kiln'), ghGlaze = latest(pub, 'github:glaze');
    const cws = latest(pub, 'cws:glaze'), amo = latest(pub, 'amo:glaze');
    const needs = g ? g.looks.filter((r) => r.status === 'pending').length + g.mods.filter((r) => r.status === 'pending').length : 0;
    needsShown = needs;
    const hello = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
    const nexusDays = trend(pub, 'nexus:kiln', 'downloads');
    host.replaceChildren(
      head(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), hello, 'Kiln, Glaze and frostdev.io at a glance. Numbers are collected once an hour.'),
      el('section', { class: 'tiles', 'aria-label': 'At a glance' },
        numberTile('Glaze', 'Needs you', g ? needs : null, { note: needs ? 'Gallery submissions a reviewer handed to a person.' : 'Nothing in the gallery is waiting for you.', href: needs ? (g.mods.some((r) => r.status === 'pending') ? '#glaze/mods/pending' : '#glaze/looks/pending') : '', attention: needs > 0 }),
        numberTile('Kiln', 'Downloads, 30 days', ok(kiln) ? sum(kilnDays) : null, { values: kilnDays, note: 'People, launcher updates and tools on frostdev.io.', href: '#kiln' }),
        numberTile('Kiln', 'Nexus downloads', nexus?.downloads ?? null, { values: nexusDays, note: nexus ? `${fmt(nexus.endorsements || 0)} endorsements · ${nexus.version || ''}` : '', href: '#kiln' }),
        numberTile('Glaze', 'Chrome Web Store users', cws?.users ?? null, { note: `Firefox daily users ${amo?.users != null ? fmt(amo.users) : '—'}`, href: '#glaze' }),
        numberTile('Glaze', 'Release downloads', ghGlaze?.downloads ?? null, { values: trend(pub, 'github:glaze', 'downloads'), note: 'Every GitHub release, all time.', href: '#glaze' }),
        numberTile('frostdev.io', 'Page views, 30 days', ok(site) ? sum(siteDays) : null, { values: siteDays, note: 'People only; Glaze pages are never counted.', href: '#site' }),
      ),
      el('div', { class: 'grid two' }, healthCard(status, pub, glaze, g), card('Projects', 'Where each one lives.', projects(ghKiln, ghGlaze))),
    );
  }

  function healthCard(status, pub, glaze, g) {
    const items = [];
    const check = (state, title, detail, whenText = '') => items.push(el('li', { class: state }, el('span', { class: 'icon', 'aria-hidden': 'true', text: state === 'ok' ? '✓' : state === 'bad' ? '!' : '•' }),
      el('span', {}, el('span', { text: title }), detail ? el('small', { text: ` — ${detail}` }) : null), el('span', { class: 'when', text: whenText })));
    if (ok(status)) {
      const stale = Date.now() - Date.parse(status.at) > 3 * 3600e3;
      for (const [name, part] of Object.entries(status.parts)) {
        const label = { kiln: 'Kiln downloads', site: 'Page views', public: 'Store and GitHub numbers' }[name] || name;
        check(!part.ok ? 'bad' : stale ? 'wait' : 'ok', `${label} collected`, part.ok ? (stale ? 'no run for over 3 hours' : part.note) : part.error, ago(status.at));
      }
    } else check('bad', 'Statistics', status?.__error || 'not collected yet');
    for (const [id, error] of Object.entries(pub?.errors || {})) check('wait', `Source ${id}`, error);
    if (ok(glaze)) {
      check(glaze.mail ? 'ok' : 'wait', 'Pending-review email', glaze.mail ? 'on: a person is mailed when a submission needs them' : 'off: MAIL_URL and MAIL_FROM are required');
      check(glaze.limits ? 'ok' : 'wait', 'Submit limits', glaze.limits ? 'on' : 'OFF: anyone can submit without daily limits');
      const r = glaze.reviewsToday;
      check('ok', 'Reviews today', `${r.looks}${r.looksLimit ? ` of ${r.looksLimit}` : ''} Looks · ${r.mods}${r.modsLimit ? ` of ${r.modsLimit}` : ''} mods`);
    }
    if (g) {
      const b = g.blocklist;
      if (!b) check('wait', 'Mod blocklist', 'none published');
      else {
        const left = (Date.parse(b.expires) - Date.now()) / 86400e3;
        check(left < 0 ? 'bad' : left < 7 ? 'wait' : 'ok', `Mod blocklist #${b.seq}`, `${b.mods} mods, ${b.bundles} bundles, ${b.authors} authors · expires ${new Date(b.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
      }
    }
    return card('Health', 'Collections, mail and the gallery’s switches.', el('ul', { class: 'checks' }, ...items));
  }

  function projects(ghKiln, ghGlaze) {
    const link = (text, href) => el('a', { href, rel: href.startsWith('http') ? 'noopener noreferrer' : null, text });
    const row = (name, detail, ...links) => el('li', { class: 'ok' }, el('span', { class: 'icon', text: '❄', 'aria-hidden': 'true' }), el('span', {}, el('span', { text: name }), el('small', { text: ` — ${detail}` })), el('span', { class: 'links' }, ...links));
    return el('ul', { class: 'checks' },
      row('Kiln', ghKiln ? `${fmt(ghKiln.stars || 0)} star${ghKiln.stars === 1 ? '' : 's'} · ${fmt(ghKiln.openIssues || 0)} open issues and PRs` : 'mod framework for Enshrouded', link('Page', '/kiln'), link('Nexus', 'https://www.nexusmods.com/enshrouded/mods/301'), link('GitHub', 'https://github.com/frostdev-ops/kiln')),
      row('Glaze', ghGlaze ? `${fmt(ghGlaze.stars || 0)} star${ghGlaze.stars === 1 ? '' : 's'} · ${fmt(ghGlaze.openIssues || 0)} open issues and PRs` : 'for Blackboard, Canvas and Moodle', link('Page', '/glaze'), link('Gallery', '/glaze/looks'), link('GitHub', 'https://github.com/frostdev-ops/glaze')),
      row('Rimeward', 'the signed-in app at frostdev.io', link('Admin', '/admin/users'), link('Page', '/rimeward')),
      row('Guides', 'how-tos for every project', link('Guides', '/guides')),
    );
  }

  // ---- Kiln --------------------------------------------------------------------------------------------------------
  const versionOrder = (a, b) => (/^\d/.test(b) - /^\d/.test(a)) || b.localeCompare(a, 'en', { numeric: true });
  const GROUPS = [['', 'All files'], ['launcher', 'Launcher'], ['server', 'Dedicated servers'], ['runtime', 'Runtime zip'], ['sdk', 'SDK and tools'], ['samples', 'Sample mods'], ['source', 'Source'], ['notes', 'Notes and checksums']];

  async function kilnView(host) {
    const [kiln, pub] = await Promise.all([get('kiln'), get('public')]);
    const nexus = latest(pub, 'nexus:kiln'), gh = latest(pub, 'github:kiln');
    const nexusDays = trend(pub, 'nexus:kiln', 'downloads');
    const nexusDelta = sinceFirst(nexusDays);
    const explorer = el('div');
    explorers.kiln?.destroy();
    host.replaceChildren(
      head('Kiln', 'Downloads', 'Files under frostdev.io/kiln/downloads, from Cloudflare’s request data, plus Nexus and GitHub.',
        el('div', { class: 'links' }, el('a', { href: '/kiln/download', text: 'Download page ↗' }), el('a', { href: 'https://www.nexusmods.com/enshrouded/mods/301', rel: 'noopener noreferrer', text: 'Nexus ↗' }))),
      el('section', { class: 'tiles', 'aria-label': 'Elsewhere' },
        numberTile('Nexus', 'Downloads', nexus?.downloads ?? null, { values: nexusDays, note: nexusDelta !== null ? `${nexusDelta >= 0 ? '+' : ''}${fmt(nexusDelta)} across ${nexusDays.length} recorded days` : 'Grows a trend line as days are collected.' }),
        numberTile('Nexus', 'Endorsements', nexus?.endorsements ?? null, { note: nexus?.version ? `Listed version ${nexus.version}` : '' }),
        numberTile('GitHub', 'Stars', gh?.stars ?? null, { values: trend(pub, 'github:kiln', 'stars'), note: gh ? `${fmt(gh.forks || 0)} forks` : '' }),
        numberTile('GitHub', 'Open issues and PRs', gh?.openIssues ?? null, { note: gh ? `${fmt(gh.downloads || 0)} release asset downloads` : '' }),
      ),
      explorer,
    );
    if (!ok(kiln)) { explorer.append(missing('Kiln downloads', kiln)); return; }
    const files = kiln.files;
    explorers.kiln = C.Explorer(explorer, {
      data: kiln, measure: 'Downloads', kinds: KILN_KINDS, defaultKinds: ['people', 'launcher', 'tool'],
      answers: (row) => row[7] || 0,
      selects: [
        { id: 'version', label: 'Version', options: [['', 'All versions'], ...[...new Set(files.map((f) => f.version))].sort(versionOrder).map((v) => [v, v])], test: (row, v) => files[row[1]].version === v },
        { id: 'group', label: 'Files', options: GROUPS.filter(([id]) => !id || files.some((f) => f.kind === id)), test: (row, v) => files[row[1]].kind === v },
      ],
      item: {
        title: 'Files', head: 'File',
        of: (row, state) => { const f = files[row[1]]; return state.selects.version ? { key: `${f.version}/${f.file}`, name: f.label, detail: f.file } : { key: f.key, name: f.label, detail: f.key.replace('*', '<version>') }; },
        subOf: (state, n) => (state.selects.version ? `${n} files of ${state.selects.version}.` : `${n} files; the same file of every version added up.`),
      },
      tables: [
        { title: 'Versions', head: 'Version', sub: 'Newest first.', of: (row) => ({ key: files[row[1]].version, name: files[row[1]].version }), sort: (a, b) => versionOrder(a.name, b.name) },
        { title: 'Systems', head: 'System', sub: 'What the program said it runs on; for a launcher update, the file it fetched.', of: (row) => ({ key: row[4], name: C.SYSTEMS[kiln.systems[row[4]]] ?? kiln.systems[row[4]] }) },
        { title: 'Came from', head: 'Site', sub: 'The site the download link was on.', hideEmpty: true, of: (row) => ({ key: row[5], name: kiln.referrers[row[5]] || 'No referring site', empty: !kiln.referrers[row[5]] }) },
      ],
      notes: [
        el('p', {}, el('strong', { text: 'How this is counted. ' }), 'Cloudflare’s request statistics for /kiln/downloads/, read once an hour. For a file of a megabyte or more, a download is the file’s size in bytes sent: a download that was resumed or fetched in parts counts once, one that was given up counts as the part that arrived. For small files and text files it is a complete answer.'),
        el('p', {}, el('strong', { text: 'Who. ' }), 'People: a current web browser. Launcher updates: the Kiln launcher fetching its own update. Tools: curl, PowerShell, NuGet, download managers. Automated: crawlers, link previews, scanners, and programs that claim to be a browser nobody runs any more. A program can claim anything, so these are estimates.'),
        el('p', {}, el('strong', { text: 'What is kept. ' }), 'Per day: file, country, kind of program, system, a count and the bytes. No IP address and no User-Agent text.'),
      ],
    }, explorerState.kiln);
    if (explorers.kiln) explorerState.kiln = explorers.kiln.state;
  }

  // ---- Glaze -------------------------------------------------------------------------------------------------------
  const STATES = [
    ['published', 'Published', 'var(--good)'], ['pending', 'Sent to a person', 'var(--warn)'], ['queued', 'Waiting for review', 'var(--bright)'],
    ['declined', 'Declined', 'var(--danger)'], ['removed', 'Removed', 'var(--dim)'],
  ];
  const ASSETS = [['mac', 'Mac app'], ['mac-zip', 'Mac zip'], ['chrome', 'Chrome zip'], ['firefox', 'Firefox zip'], ['mcp', 'Agents (MCP)']];

  async function glazeView(host) {
    const [pub, glaze] = await Promise.all([get('public'), get('glaze')]);
    const cws = latest(pub, 'cws:glaze'), amo = latest(pub, 'amo:glaze'), gh = latest(pub, 'github:glaze');
    const g = gallery?.data();
    const parts = [
      head('Glaze', 'Numbers', 'What the stores and GitHub show anyone, and the gallery’s own records.'),
      el('section', { class: 'tiles', 'aria-label': 'Stores and releases' },
        numberTile('Chrome', 'Chrome Web Store users', cws?.users ?? null, { values: trend(pub, 'cws:glaze', 'users'), note: 'As the store’s page shows it.' }),
        numberTile('Firefox', 'Daily users', amo?.users ?? null, { values: trend(pub, 'amo:glaze', 'users'), note: amo ? `${fmt(amo.weeklyDownloads || 0)} downloads this week · ${amo.version || ''}` : '' }),
        numberTile('GitHub', 'Release downloads', gh?.downloads ?? null, { values: trend(pub, 'github:glaze', 'downloads'), note: 'Mac app, zips and the agents bundle; checksums left out.' }),
        numberTile('GitHub', 'Stars', gh?.stars ?? null, { note: gh ? `${fmt(gh.openIssues || 0)} open issues and PRs` : '' }),
      ),
    ];
    if (gh?.releases?.length) {
      const rows = gh.releases.slice(0, 12);
      const body = el('tbody', {}, ...rows.map((r) => el('tr', {}, el('td', { class: 'name' }, el('span', { text: r.tag }), el('small', { text: r.published ? dayLabel(r.published.slice(0, 10), true) : '' })),
        ...ASSETS.map(([k]) => el('td', { class: 'num', text: r.kinds?.[k] ? fmt(r.kinds[k]) : '—' })), el('td', { class: 'num', text: fmt(r.downloads) }))));
      parts.push(card('Releases on GitHub', 'Downloads of each release’s files since it was published. Store installs are not here.',
        el('div', { class: 'scroll' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: 'Release' }), ...ASSETS.map(([, label]) => el('th', { class: 'num', text: label })), el('th', { class: 'num', text: 'All' }))), body))));
    }
    if (ok(glaze)) {
      const looksLive = (glaze.looks.published || 0) + (glaze.curated || 0);
      const needs = (glaze.looks.pending || 0) + (glaze.mods.pending || 0);
      parts.push(el('section', { class: 'tiles', 'aria-label': 'Gallery' },
        numberTile('Gallery', 'Looks in the gallery', looksLive, { note: `${fmt(glaze.curated || 0)} curated · ${fmt(glaze.looks.published || 0)} from the community`, href: '#glaze/looks/published' }),
        numberTile('Gallery', 'Mods live', glaze.modsLive, { note: `${fmt(glaze.mods.published || 0)} published versions`, href: '#glaze/mods/published' }),
        numberTile('Gallery', 'Needs you', needs, { href: glaze.mods.pending ? '#glaze/mods/pending' : needs ? '#glaze/looks/pending' : '', attention: needs > 0, note: `${glaze.looks.pending || 0} Looks · ${glaze.mods.pending || 0} mods` }),
        numberTile('Gallery', 'Review cost, 30 days', money(glaze.spent30), { note: 'What the review models charged for the last 30 days’ submissions.' }),
      ));
      const outcome = (kind) => {
        const totals = {};
        for (const day of Object.values(glaze.days)) for (const [s, n] of Object.entries(day[kind] || {})) totals[s] = (totals[s] || 0) + n;
        const most = Math.max(1, ...Object.values(totals));
        const all = sum(Object.values(totals));
        return el('div', { class: 'bars-h' }, ...(all ? STATES.filter(([s]) => totals[s]).map(([s, label, color]) => el('div', { class: 'row' }, el('span', { text: label }),
          el('span', { class: 'bar', role: 'img', 'aria-label': `${label}: ${totals[s]}` }, el('span', { style: { width: `${(totals[s] / most * 100).toFixed(1)}%`, background: color } })), el('span', { class: 'n', text: fmt(totals[s]) })))
          : [el('p', { class: 'empty', text: 'No submissions in the last 30 days.' })]));
      };
      const r = glaze.reviewsToday;
      const allowance = (label, used, limit) => el('div', { class: 'row' }, el('span', { text: label }),
        el('span', { class: 'bar', role: 'img', 'aria-label': `${used}${limit ? ` of ${limit}` : ''}` }, el('span', { style: { width: limit ? `${Math.min(100, used / limit * 100).toFixed(1)}%` : '0%', background: 'var(--people)' } })),
        el('span', { class: 'n', text: limit ? `${used}/${limit}` : String(used) }));
      parts.push(el('div', { class: 'grid' },
        card('Looks submitted, 30 days', 'How each submission ended. Declined ones are deleted after 30 days.', outcome('looks')),
        card('Mods submitted, 30 days', 'Every version counts once.', outcome('mods')),
        card('Today’s review allowance', glaze.limits ? 'Reviews the gallery may start today (UTC); the rest wait for tomorrow.' : 'Submit limits are off: nothing is capped.', el('div', { class: 'bars-h' }, allowance('Looks', r.looks, glaze.limits ? r.looksLimit : 0), allowance('Mods', r.mods, glaze.limits ? r.modsLimit : 0))),
      ));
    } else parts.push(missing('The gallery’s numbers', glaze));
    if (g) parts.push(el('p', { class: 'sub', text: `Signed in as ${g.email}. Review the queue under Mods and Looks.` }));
    parts.push(el('section', { class: 'notes' }, el('p', {}, el('strong', { text: 'What is not here, on purpose. ' }),
      'Glaze promises no product analytics and no invisible audience: nothing is counted from Glaze itself, its update checks, its gallery’s visitors or its pages on frostdev.io. These are the stores’ and GitHub’s public numbers and the gallery’s own records of submissions.')));
    host.replaceChildren(...parts);
  }

  // ---- the site ----------------------------------------------------------------------------------------------------
  const SECTIONS = [['', 'All pages'], ['home', 'Home'], ['kiln', 'Kiln (not the wiki)'], ['wiki', 'Kiln wiki and API reference'], ['guides', 'Guides'], ['products', 'Crosspane, Rimeward, Rimewire'], ['privacy', 'Privacy']];
  const sectionOf = (page) => (page === '/' ? 'home' : /^\/kiln\/(wiki|downloads)/.test(page) ? 'wiki' : page.startsWith('/kiln') ? 'kiln' : page.startsWith('/guides') ? 'guides'
    : /^\/(crosspane|rimeward|rimewire)/.test(page) ? 'products' : page.startsWith('/privacy') ? 'privacy' : 'other');
  const pageName = (page) => (page === '/' ? 'Home' : page === '/kiln/downloads/*/sdk/api/' ? 'Kiln SDK API reference' : page.split('/').filter(Boolean).map((p) => p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())).join(' › '));

  async function siteView(host) {
    const site = await get('site');
    const explorer = el('div');
    explorers.site?.destroy();
    host.replaceChildren(head('frostdev.io', 'Page views', 'How often each page of the public site was opened, from Cloudflare’s request data.', el('div', { class: 'links' }, el('a', { href: '/', text: 'frostdev.io ↗' }))), explorer);
    if (!ok(site)) { explorer.append(missing('Page views', site)); return; }
    explorers.site = C.Explorer(explorer, {
      data: site, measure: 'Page views', kinds: SITE_KINDS, defaultKinds: ['people'],
      selects: [{ id: 'section', label: 'Pages', options: SECTIONS.filter(([id]) => !id || site.pages.some((p) => sectionOf(p) === id)), test: (row, v) => sectionOf(site.pages[row[1]]) === v }],
      item: { title: 'Pages', head: 'Page', of: (row) => ({ key: row[1], name: pageName(site.pages[row[1]]), detail: site.pages[row[1]] }), subOf: (state, n) => `${n} pages.` },
      tables: [
        { title: 'Came from', head: 'Site', sub: 'The site the link was on. People only: automated programs keep no referrer.', of: (row) => { const r = site.referrers[row[5]]; return { key: row[5], name: r === 'frostdev.io' ? 'frostdev.io (another page)' : r || 'Typed, bookmarked or not said' }; } },
        { title: 'Systems', head: 'System', sub: 'What the browser said it runs on.', of: (row) => ({ key: row[4], name: C.SYSTEMS[site.systems[row[4]]] ?? site.systems[row[4]] }) },
      ],
      notes: [
        el('p', {}, el('strong', { text: 'What counts. ' }), 'A page of the public site answered with HTML to a visitor, once an hour from Cloudflare’s request data. Rimeward’s signed-in app (sign-in, dashboards, share links) is not counted. People are current web browsers; the rest is estimated from what each program says it is.'),
        el('p', {}, el('strong', { text: 'Glaze’s pages are never counted. ' }), 'Glaze promises no analytics and no invisible audience, so its pages, its guides and its gallery are left out before anything is written — not even a total.'),
        el('p', {}, el('strong', { text: 'What is kept. ' }), 'Per day: page, country, kind of program, system, referring site and a count. No IP address and no User-Agent text. The last 120 days are shown.'),
      ],
    }, explorerState.site);
    if (explorers.site) explorerState.site = explorers.site.state;
  }

  // ---- routes ------------------------------------------------------------------------------------------------------
  // #overview · #kiln · #glaze · #site · #activity · #glaze/mods/<filter>/<id>/<hash> · #glaze/looks/<filter>/<id>
  // The old dashboard's #mods/... and #looks/... (emails already sent) still open their item.
  function readRoute() {
    let parts;
    try { parts = location.hash.slice(1).split('/').map(decodeURIComponent); } catch { return { view: 'overview' }; }
    if (parts[0] === 'mods' || parts[0] === 'looks') {
      const [section, a = '', b = '', c = ''] = parts;
      // the old mods links were #mods/<id>/<hash>, without a filter
      const old = section === 'mods' && /^[a-z2-7]{16}$/.test(a) ? ['all', a, b] : section === 'looks' && /^c-[0-9a-f]{10}$/.test(a) ? ['all', a] : [a, b, c];
      history.replaceState(null, '', `#${['glaze', section, ...old].filter(Boolean).join('/')}`);
      return readRoute();
    }
    if (parts[0] === 'glaze' && (parts[1] === 'mods' || parts[1] === 'looks')) {
      const [, section, filter = 'pending', id = '', hash = ''] = parts;
      const valid = section === 'looks' ? /^c-[0-9a-f]{10}$/.test(id) : /^[a-z2-7]{16}$/.test(id) && /^[\w-]{43}$/.test(hash);
      return { view: 'gallery', section, filter, id: valid ? id : '', hash: valid && section === 'mods' ? hash : '' };
    }
    if (parts[0] === 'activity') return { view: 'activity', section: 'activity' };
    return { view: VIEWS.includes(parts[0]) && parts[0] !== 'gallery' ? parts[0] : 'overview' };
  }
  const drawn = {};
  const views = { overview, kiln: kilnView, glaze: glazeView, site: siteView };
  async function refreshView(view) {
    if (!Object.hasOwn(views, view)) return;
    const host = $(`view-${view}`);
    if (!drawn[view]) host.replaceChildren(el('p', { class: 'muted', text: 'Loading…' }));
    try { await views[view](host); drawn[view] = true; }
    catch (e) { host.replaceChildren(el('p', { class: 'warn', text: `Couldn’t draw this view: ${e.message}` })); }
  }
  async function show() {
    route = readRoute();
    document.body.classList.remove('menu-open'); $('menu').setAttribute('aria-expanded', 'false');
    for (const v of VIEWS) { const node = v === 'activity' ? $('activity') : $(`view-${v}`); node.hidden = route.view !== v; }
    const current = route.view === 'gallery' ? route.section : route.view;
    for (const [key, id] of Object.entries(NAV)) { const a = $(id); if (key === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    document.title = `${{ overview: 'Overview', kiln: 'Kiln downloads', glaze: 'Glaze numbers', site: 'Page views', activity: 'Activity', mods: 'Mods', looks: 'Looks' }[current] || 'HQ'} · frostdev HQ`;
    gallery?.show(route.view === 'gallery' || route.view === 'activity' ? route : null);
    await refreshView(route.view);
  }

  $('menu').addEventListener('click', () => { const open = document.body.classList.toggle('menu-open'); $('menu').setAttribute('aria-expanded', String(open)); });
  document.querySelector('.skip').addEventListener('click', (event) => { event.preventDefault(); $('main').focus(); });
  $('logout').addEventListener('click', async () => {
    $('logout').disabled = true;
    try {
      await api('/logout', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': csrf }, body: '{}' });
      location.assign(`${ROOT}/login`);
    } catch (e) { $('logout').disabled = false; toast(e.message, true); }
  });
  window.addEventListener('hashchange', show);
  gallery = globalThis.HQGallery || null;
  const started = gallery ? gallery.start({
    toast,
    onData: (d) => {
      if (!csrf) $('logout').disabled = false;
      csrf = d.csrf; $('email').textContent = d.email;
      // the overview's "Needs you" follows the gallery's own refreshes
      const needs = d.looks.filter((r) => r.status === 'pending').length + d.mods.filter((r) => r.status === 'pending').length;
      if (route.view === 'overview' && drawn.overview && needs !== needsShown) overview($('view-overview')).catch(() => {});
    },
  }) : Promise.resolve();
  // the gallery's data first: the overview counts what needs you
  started.finally(show);
  // numbers are collected once an hour: look again every ten minutes while the tab is open
  setInterval(() => { if (!document.hidden && Object.hasOwn(views, route.view)) { for (const k of Object.keys(cache)) delete cache[k]; refreshView(route.view); } }, 600e3);
})();
