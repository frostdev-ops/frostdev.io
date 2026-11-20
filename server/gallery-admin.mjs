// The private dashboard, frostdev HQ (/hq, docs/hq.md): the gallery's moderation plus Kiln's, Glaze's and the site's
// numbers, behind Google sign-in. Google tokens are accepted only from the server's direct TLS token exchange, never
// from a browser. Google documents this channel as authenticating the ID token without a second JWT signature check:
// https://developers.google.com/identity/openid-connect/openid-connect#exchangecode
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = '/hq';
// Where the dashboard was before HQ. Its addresses (bookmarks, review emails already sent) are sent on to HQ.
const LEGACY = '/glaze/admin';
// The redirect URI registered with Google for this OAuth client. It stays where it was when the dashboard moved to /hq,
// so the move needed no change in Google Cloud; moving it means adding the new URI to the client there first.
const CALLBACK = `${LEGACY}/callback`;
const SESSION = '__Secure-fd_hq';
const FLOW = '__Secure-fd_hq_flow';
const HOURS12 = 12 * 3600e3;
const MINUTES10 = 10 * 60e3;
const DAY = 86400e3;
const random = () => crypto.randomBytes(32).toString('base64url');
const hash = (v) => crypto.createHash('sha256').update(v).digest('base64url');
const cookie = (name, value, seconds, at = ROOT) => `${name}=${value}; Path=${at}; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
const cookieOf = (req, name) => {
  const values = String(req.headers.cookie || '').split(';').map((p) => p.trim()).filter((p) => p.startsWith(`${name}=`));
  const value = values.length === 1 ? values[0].slice(name.length + 1) : '';
  return /^[\w-]{43}$/.test(value) ? value : '';
};
// img-src allows the site's own brand pictures (/projects/...), which nginx serves from the same origin.
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; object-src 'none'";
const plain = 'text/plain; charset=utf-8';
const mediaTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm' };
// The numbers stats/collect.mjs writes (docs/hq.md), read from STATS_DIR, which the container mounts read-only.
const STATS = new Set(['kiln', 'site', 'public', 'status']);
const ASSETS = {
  '': ['index.html', 'text/html; charset=utf-8'], '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/charts.js': ['charts.js', 'text/javascript; charset=utf-8'],
  '/gallery.js': ['gallery.js', 'text/javascript; charset=utf-8'], '/crucible.js': ['crucible.js', 'text/javascript; charset=utf-8'], '/viewer.js': ['viewer.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
};
// No secret, and the sign-in page needs them before there is a session.
const PUBLIC_ASSETS = new Set(['/style.css', '/frostdev-icon.webp']);
const FILTER_HASH = '(?:/(?:pending|review|published|declined|removed|all))?';
const RETURN_HASHES = [
  /^#(?:overview|kiln|kiln\/crucible|crucible|glaze|site|activity)$/,
  new RegExp(`^#(?:glaze/)?looks${FILTER_HASH}(?:/c-[0-9a-f]{10})?$`),
  new RegExp(`^#(?:glaze/)?mods${FILTER_HASH}(?:/[a-z2-7]{16}/[\\w-]{43})?$`),
];
const LOGIN_SCRIPT = `document.querySelector('form').addEventListener('submit', (event) => {
  if (location.hash) event.currentTarget.action = '${ROOT}/login?' + new URLSearchParams({ returnTo: location.hash });
});`;

// The sign-in page: no script, the dashboard's stylesheet, one form that starts Google's flow.
const LOGIN = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="robots" content="noindex, nofollow"><title>Sign in · frostdev HQ</title><link rel="stylesheet" href="${ROOT}/style.css"><script src="${ROOT}/login.js" defer></script></head>
<body class="login">
  <div class="ground" aria-hidden="true"></div>
  <a class="skip" href="#sign-in">Skip to sign in</a>
  <main class="login-main" id="sign-in">
    <div class="login-card">
      <div class="brand big"><img src="${ROOT}/frostdev-icon.webp" width="56" height="56" alt=""><span class="wordmark">frostdev</span><span class="hq">HQ</span></div>
      <p class="eyebrow">Kiln · Glaze · frostdev.io</p>
      <h1>Everything behind the site, in one place.</h1>
      <p class="lead">Downloads and numbers for Kiln and Glaze, the site's page views, and the gallery's review queue.</p>
      <form method="post" action="${ROOT}/login"><button type="submit">Sign in with Google <span aria-hidden="true">→</span></button></form>
      <p class="login-note">Only approved Google accounts can sign in.</p>
    </div>
  </main>
  <footer class="login-foot"><a href="/">frostdev.io</a><span>Work · Play · Create</span></footer>
</body></html>`;

// Crucible (Kiln's modpacks, frostdev.io/kiln/crucible) is moderated from HQ through its local admin API (docs/hq.md,
// Crucible). Only these routes and methods pass, with their ids checked as Crucible checks them, a query rebuilt from
// known parameters and a body rebuilt from known fields. Crucible refuses any request carrying X-Real-IP or
// X-Forwarded-For, and gets neither, nor HQ's cookie: only its admin secret.
const CRUCIBLE_ROUTES = [
  { method: 'GET', path: /^\/reports$/, query: { state: /^(?:open|closed)$/ } },
  { method: 'POST', path: /^\/reports\/(rpt_[a-z2-7]{26})\/close$/, body: 'close', audit: 'closed report' },
  { method: 'GET', path: /^\/packs$/, query: { visibility: /^(?:public|link|removed|deleted)$/, hidden: /^1$/ } },
  { method: 'POST', path: /^\/packs\/([A-Za-z0-9_-]{3,64})\/takedown$/, body: 'takedown', audit: 'took down pack' },
  { method: 'POST', path: /^\/versions\/(pv_[a-z2-7]{26})\/takedown$/, body: 'takedown', audit: 'took down version' },
  { method: 'POST', path: /^\/packs\/([A-Za-z0-9_-]{3,64})\/hide$/, audit: 'hid pack' },
  { method: 'POST', path: /^\/packs\/([A-Za-z0-9_-]{3,64})\/restore$/, audit: 'restored pack' },
  { method: 'POST', path: /^\/comments\/([A-Za-z0-9_]{3,64})\/remove$/, audit: 'removed comment' },
  { method: 'POST', path: /^\/comments\/([A-Za-z0-9_]{3,64})\/restore$/, audit: 'restored comment' },
  { method: 'GET', path: /^\/blocklist$/ },
  { method: 'POST', path: /^\/blocklist$/, body: 'block', audit: 'blocked file' },
  { method: 'DELETE', path: /^\/blocklist\/([0-9a-f]{64})$/, audit: 'unblocked file' },
  { method: 'GET', path: /^\/bans$/ },
  { method: 'POST', path: /^\/bans$/, body: 'ban', audit: 'banned account' },
  { method: 'DELETE', path: /^\/bans\/(\d{17,20})$/, audit: 'unbanned account' },
  { method: 'DELETE', path: /^\/users\/(\d{17,20})$/, audit: 'deleted the data of account' },
  { method: 'GET', path: /^\/stats$/ },
];
const CRUCIBLE_MAX = 8 << 20;
// Words a person typed for a reason: no control or format characters, trimmed, at most `max` characters.
const words = (v, max) => (typeof v === 'string' ? v.replace(/[\p{Cc}\p{Cf}]/gu, ' ').trim() : null)?.slice(0, max) ?? null;
/** The body Crucible gets for a route, rebuilt from known fields, or { error } for a 400. */
export function crucibleBody(kind, b) {
  if (kind === 'close') {
    const outcome = b.outcome === undefined ? 'closed' : words(b.outcome, 200);
    return outcome ? { body: { outcome } } : { error: 'The outcome must be text.' };
  }
  if (kind === 'takedown') {
    const reason = words(b.reason, 500);
    if (!reason) return { error: 'Give a reason; the creator is told.' };
    if (b.blockAll !== undefined && typeof b.blockAll !== 'boolean') return { error: 'blockAll is true or false.' };
    return { body: { reason, blockAll: b.blockAll === true }, reason };
  }
  if (kind === 'block') {
    if (typeof b.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(b.sha256)) return { error: 'A sha256 is 64 lowercase hex characters.' };
    const reason = words(b.reason, 500);
    if (!reason) return { error: 'Give a reason for blocking the file.' };
    return { body: { sha256: b.sha256, reason }, id: b.sha256, reason };
  }
  if (kind === 'ban') {
    if (typeof b.userId !== 'string' || !/^\d{17,20}$/.test(b.userId)) return { error: 'A Discord id is 17 to 20 digits.' };
    const reason = b.reason === undefined ? '' : words(b.reason, 300);
    if (reason === null) return { error: 'The reason must be text.' };
    return { body: { userId: b.userId, reason }, id: b.userId, reason };
  }
  return { body: {} };
}

// Byte signatures, never a submitter's extension or MIME. Active formats (including SVG and Lottie) stay text.
export function adminFileType(bytes) {
  const b = Buffer.from(bytes);
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) && b.toString('ascii', 12, 16) === 'IHDR') return 'image/png';
  if (b.length >= 4 && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg';
  if (b.length >= 13 && /^GIF8[79]a$/.test(b.toString('ascii', 0, 6))) return 'image/gif';
  if (b.length >= 20 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && b.readUInt32LE(4) === b.length - 8) return 'image/webp';
  if (b.length >= 24 && b.toString('ascii', 4, 8) === 'ftyp' && b.readUInt32BE(0) >= 16 && b.readUInt32BE(0) <= b.length) {
    const brands = b.toString('ascii', 8, b.readUInt32BE(0));
    if (/avif|avis/.test(brands)) return 'image/avif';
    if (/isom|iso[2-9]|mp4[12]|avc1|M4V |dash/.test(brands)) return 'video/mp4';
  }
  if (b.length >= 16 && b.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex')) && b.subarray(4, 4096).includes(Buffer.from('webm'))) return 'video/webm';
  return plain;
}

export function galleryAdmin({ db, siteOrigin, now, clientKey, readJson, decide, decideMod, readMod, readLookMedia, permissionWords, live = () => new Map(),
  limits, blocklist, googleClientId, googleClientSecret, adminEmails, googleFetch = fetch, statsDir = '', reviewsPerDay = 0, modReviewsPerDay = 0,
  mailOn = false, curated = () => 0, publicModCount = () => 0,
  crucibleAdminUrl = '', crucibleAdminSecret = '', crucibleFetch = fetch }) {
  const crucibleBase = String(crucibleAdminUrl || 'http://127.0.0.1:8792/admin').replace(/\/+$/, '');
  const emails = new Set(String(adminEmails || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
  const enabled = !!(googleClientId && googleClientSecret && emails.size);
  db.exec(`CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, email TEXT NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_flows (state TEXT PRIMARY KEY, browser TEXT NOT NULL, verifier TEXT NOT NULL, nonce TEXT NOT NULL, expires INTEGER NOT NULL,
      return_hash TEXT NOT NULL DEFAULT '', previous_session TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS admin_login_limits (network TEXT PRIMARY KEY, started INTEGER NOT NULL, n INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit (seq INTEGER PRIMARY KEY, email TEXT NOT NULL, action TEXT NOT NULL, kind TEXT NOT NULL,
      id TEXT NOT NULL, hash TEXT NOT NULL, at INTEGER NOT NULL, reason TEXT NOT NULL);`);
  const sql = (s) => db.prepare(s);
  const flowColumns = new Set(sql('PRAGMA table_info(admin_flows)').all().map(({ name }) => name));
  for (const column of ['return_hash', 'previous_session']) {
    if (!flowColumns.has(column)) db.exec(`ALTER TABLE admin_flows ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
  }
  const sweep = () => {
    sql('DELETE FROM admin_sessions WHERE expires <= ?').run(now());
    sql('DELETE FROM admin_flows WHERE expires <= ?').run(now());
    sql('DELETE FROM admin_login_limits WHERE started <= ?').run(now() - 3600e3);
  };
  const audit = (email, action, kind, id, bundleHash, reason) => sql('INSERT INTO admin_audit (email, action, kind, id, hash, at, reason) VALUES (?, ?, ?, ?, ?, ?, ?)').run(email, action, kind, id, bundleHash, now(), reason);
  const reply = (res, status, body, type = 'application/json; charset=utf-8', headers = {}) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      // same-origin, not no-referrer: under no-referrer browsers send `Origin: null` on every POST (forms and same-origin
      // fetch alike), which the Origin checks below refuse.
      'content-security-policy': CSP, 'referrer-policy': 'same-origin', 'x-frame-options': 'DENY', ...headers });
    // a string under a JSON type is JSON already (a statistics file)
    res.end(type.startsWith('application/json') && typeof body !== 'string' ? JSON.stringify(body) : body);
  };
  const redirect = (res, to, headers = {}) => reply(res, 303, '', plain, { location: to, ...headers });
  const refuse = (res) => reply(res, 403, { error: 'Sign-in refused.' });
  const getSession = (req) => {
    const token = cookieOf(req, SESSION);
    const s = token && sql('SELECT * FROM admin_sessions WHERE token = ? AND expires > ?').get(hash(token), now());
    return s && emails.has(s.email) ? s : null;
  };
  const lookView = (r) => ({ id: r.id, name: r.name, credit: r.credit, status: r.status, created: r.created, decided: r.decided,
    reason: r.reason, decision: JSON.parse(r.decision), code: r.code, tags: JSON.parse(r.tags), described: JSON.parse(r.described),
    media: r.media ? `${ROOT}/files/looks/${r.id}` : null });
  const modView = (r) => ({ id: r.id, hash: r.hash, name: r.name, credit: r.credit, version: r.version, key: r.key,
    status: r.status, created: r.created, decided: r.decided, reason: r.reason, decision: JSON.parse(r.decision),
    summary: JSON.parse(r.summary), permissions: JSON.parse(r.permissions).map((p) => ({ ...p, ...permissionWords(p.id) })) });
  const fileReply = (req, res, bytes, name, { text = false, download = false } = {}) => {
    const type = adminFileType(bytes);
    const ext = name.split('.').pop().toLowerCase();
    if (!download && mediaTypes[ext] && type !== mediaTypes[ext]) return reply(res, 415, { error: 'The file bytes do not match its media type.' });
    // Binary formats outside the allowlist are download-only; even HTML and SVG are inert plain text.
    let utf8 = null;
    try { utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { /* binary */ }
    const binary = utf8 === null || /\x00/.test(utf8);
    const attachment = download || (type === plain && binary);
    let body = attachment ? bytes : text || type === plain ? utf8 || '' : bytes;
    const mime = attachment ? 'application/octet-stream' : text ? plain : type;
    const headers = { 'content-security-policy': "default-src 'none'; sandbox", 'content-disposition': attachment ? 'attachment; filename="gallery-file"' : 'inline' };
    let status = 200;
    if (mime.startsWith('video/')) {
      headers['accept-ranges'] = 'bytes';
      // Ignore multipart/invalid ranges and If-Range without a matching validator; always sniff the whole file first.
      const range = req.headers['if-range'] === undefined && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, bytes.length - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(bytes.length - 1, Number(range[2])) : bytes.length - 1;
        if (!Number.isSafeInteger(start) || start > end) return reply(res, 416, '', mime,
          { ...headers, 'content-range': `bytes */${bytes.length}`, 'content-length': 0 });
        body = bytes.subarray(start, end + 1);
        status = 206;
        headers['content-range'] = `bytes ${start}-${end}/${bytes.length}`;
      }
    }
    reply(res, status, body, mime, { ...headers, 'content-length': Buffer.byteLength(body) });
  };

  // Glaze's gallery in numbers, from its own records: what is in it, what came in over the last 30 days and how it went,
  // what the reviews cost and how much of today's review allowance is used. Nothing about visitors: the gallery keeps
  // nothing about them (docs/looks-gallery.md, Privacy). Declined submissions are deleted after 30 days.
  const glazeNumbers = () => {
    const today = new Date(now()).toISOString().slice(0, 10);
    const since = Date.parse(today) - 29 * DAY;
    const firstDay = new Date(since).toISOString().slice(0, 10);
    const counts = (table) => Object.fromEntries(sql(`SELECT status, COUNT(*) n FROM ${table} GROUP BY status`).all().map((r) => [r.status, r.n]));
    const parse = (text) => { try { return JSON.parse(text) || {}; } catch { return {}; } };
    const costOf = (d) => [d.first?.cost, d.escalation?.cost, d.review?.cost].reduce((sum, c) => sum + (typeof c === 'number' && c > 0 ? c : 0), 0);
    const days = {};
    const count = (day, kind, status) => { const b = (days[day] ||= { looks: {}, mods: {} })[kind]; b[status] = (b[status] || 0) + 1; };
    let spent = 0;
    for (const r of sql('SELECT status, created, decision FROM looks WHERE created >= ?').all(firstDay)) {
      count(r.created.slice(0, 10), 'looks', r.status);
      spent += costOf(parse(r.decision));
    }
    // a Look the review declined is kept only here, by day
    for (const r of sql('SELECT day, decision FROM rejected WHERE day >= ?').all(firstDay)) {
      count(r.day, 'looks', 'declined');
      spent += costOf(parse(r.decision));
    }
    for (const r of sql('SELECT status, created, decision FROM mods WHERE created >= ?').all(since)) {
      count(new Date(r.created).toISOString().slice(0, 10), 'mods', r.status);
      spent += costOf(parse(r.decision));
    }
    const used = (kind) => sql('SELECT n FROM quota WHERE kind = ? AND key = ? AND day = ?').get(kind, '', today)?.n || 0;
    return {
      looks: counts('looks'), mods: counts('mods'), modsLive: publicModCount(), curated: curated(),
      days, spent30: Math.round(spent * 1e4) / 1e4, mail: !!mailOn, limits: !!limits,
      reviewsToday: { looks: used('all'), looksLimit: reviewsPerDay || null, mods: used('mod-all'), modsLimit: modReviewsPerDay || null },
    };
  };

  // Google sends the browser back here (CALLBACK, the registered redirect URI); the session cookie it sets is HQ's.
  const callback = async (req, res, url) => {
    res.setHeader('set-cookie', cookie(FLOW, '', 0, CALLBACK));
    const state = url.searchParams.get('state') || '', browser = cookieOf(req, FLOW), code = url.searchParams.get('code');
    if (!/^[\w-]{43}$/.test(state) || !browser) return refuse(res);
    // DELETE RETURNING consumes before the asynchronous exchange, including failed exchanges and parallel replays.
    const flow = sql('DELETE FROM admin_flows WHERE state = ? AND browser = ? AND expires > ? RETURNING *').get(hash(state), hash(browser), now());
    if (!flow || !code || code.length > 4096 || url.searchParams.has('error') || url.searchParams.getAll('code').length !== 1 || url.searchParams.getAll('state').length !== 1) return refuse(res);
    try {
      const response = await googleFetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10e3),
        headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: googleClientId,
          client_secret: googleClientSecret, redirect_uri: `${siteOrigin}${CALLBACK}`, grant_type: 'authorization_code', code_verifier: flow.verifier }) });
      if (!response.ok) return refuse(res);
      const { id_token: token } = await response.json();
      if (typeof token !== 'string' || token.length > 16384 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return refuse(res);
      const [header, payload] = token.split('.').slice(0, 2).map((s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8')));
      const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
      if (header.alg !== 'RS256' || !['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss) || payload.aud !== googleClientId
        || (payload.azp !== undefined && payload.azp !== googleClientId) || !Number.isFinite(payload.exp) || payload.exp * 1000 <= now()
        || !Number.isFinite(payload.iat) || payload.iat * 1000 > now() + 60e3 || typeof payload.sub !== 'string' || !payload.sub
        || payload.nonce !== flow.nonce || payload.email_verified !== true || !emails.has(email)) return refuse(res);
      const session = random(), csrf = random();
      sql('INSERT INTO admin_sessions VALUES (?, ?, ?, ?)').run(hash(session), email, csrf, now() + HOURS12);
      if (flow.previous_session) sql('DELETE FROM admin_sessions WHERE token = ?').run(flow.previous_session);
      return redirect(res, `${ROOT}${flow.return_hash}`, { 'set-cookie': [cookie(FLOW, '', 0, CALLBACK), cookie(SESSION, session, HOURS12 / 1000)] });
    } catch { return refuse(res); }
  };

  // HQ's Crucible view: one allowlisted admin route, forwarded with Crucible's secret only (CRUCIBLE_ROUTES above).
  const crucible = async (req, res, sub, url, session) => {
    const routes = CRUCIBLE_ROUTES.filter((r) => r.path.test(sub));
    if (!routes.length) return reply(res, 404, { error: 'Crucible has no such admin route.' });
    const route = routes.find((r) => r.method === req.method);
    if (!route) return reply(res, 405, { error: 'That method is not allowed here.' }, undefined, { allow: routes.map((r) => r.method).join(', ') });
    if (req.method !== 'GET' && (req.headers.origin !== siteOrigin || req.headers['x-csrf-token'] !== session.csrf)) return reply(res, 403, { error: 'Request refused.' });
    const query = new URLSearchParams();
    for (const [name, value] of url.searchParams) {
      const allowed = route.query?.[name];
      if (!allowed || !allowed.test(value) || query.has(name)) return reply(res, 400, { error: `Invalid parameter ${name}.` });
      query.set(name, value);
    }
    let sent = null;
    if (route.body) {
      const built = crucibleBody(route.body, await readJson(req, 4096));
      if (built.error) return reply(res, 400, { error: built.error });
      sent = built;
    }
    if (!crucibleAdminSecret) return reply(res, 503, { error: 'Crucible isn’t set up on this server: CRUCIBLE_ADMIN_SECRET is missing from /etc/glaze-gallery.env.', setup: false });
    const target = `${crucibleBase}${sub}${query.size ? `?${query}` : ''}`;
    let response, text;
    try {
      response = await crucibleFetch(target, { method: req.method, redirect: 'error', signal: AbortSignal.timeout(req.method === 'GET' ? 10e3 : 30e3),
        headers: { 'x-crucible-admin': crucibleAdminSecret, accept: 'application/json', ...(sent && { 'content-type': 'application/json' }) },
        ...(sent && { body: JSON.stringify(sent.body) }) });
      if (Number(response.headers.get('content-length')) > CRUCIBLE_MAX) throw new Error('too big');
      text = await response.text();
      if (text.length > CRUCIBLE_MAX) throw new Error('too big');
    } catch {
      return reply(res, 503, { error: `Crucible isn’t answering at ${new URL(crucibleBase).host}. Is crucible.service running?` });
    }
    let body;
    try { body = JSON.parse(text); } catch { body = undefined; }
    if (!body || typeof body !== 'object') return reply(res, 502, { error: `Crucible answered ${response.status} without JSON.` });
    if (response.ok) {
      if (route.audit) audit(session.email, `crucible: ${route.audit}`, 'crucible', sent?.id || sub.match(route.path)[1] || '', '', sent?.reason || '');
      return reply(res, 200, body);
    }
    const said = typeof body.message === 'string' ? body.message.slice(0, 300) : typeof body.error === 'string' ? body.error.slice(0, 300) : '';
    // Never a 401: the page would take it for HQ's own sign-in running out.
    if (response.status === 401 || response.status === 403) return reply(res, 502, { error: 'Crucible refused HQ’s admin secret: CRUCIBLE_ADMIN_SECRET in /etc/glaze-gallery.env must match /etc/crucible.env.' });
    if (response.status >= 500) return reply(res, 502, { error: `Crucible failed (${response.status})${said ? `: ${said}` : '.'}` });
    return reply(res, [400, 404, 405, 409, 413, 429].includes(response.status) ? response.status : 400, { error: said || `Crucible refused (${response.status}).` });
  };

  const handle = async (req, res, url) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-security-policy', CSP);
    res.setHeader('x-frame-options', 'DENY');
    if (!enabled) return reply(res, 404, { error: 'Not found.' });
    if (url.pathname === CALLBACK && req.method === 'GET') return callback(req, res, url);
    if (url.pathname === LEGACY || url.pathname.startsWith(`${LEGACY}/`)) {
      // The old dashboard's addresses go to HQ; the browser keeps a #fragment (an emailed #looks/<id>) across the redirect.
      if (req.method !== 'GET' && req.method !== 'HEAD') return reply(res, 404, { error: 'The dashboard moved to /hq.' });
      return reply(res, 302, '', plain, { location: url.pathname.startsWith(`${LEGACY}/kiln-stats`) ? `${ROOT}#kiln` : ROOT });
    }
    const p = url.pathname.slice(ROOT.length);
    if (p === '/login' && req.method === 'GET') return reply(res, 200, LOGIN, 'text/html; charset=utf-8');
    if (p === '/login.js' && req.method === 'GET') return reply(res, 200, LOGIN_SCRIPT, 'text/javascript; charset=utf-8');
    if (p === '/login' && req.method === 'POST') {
      if (req.headers.origin !== siteOrigin) return refuse(res);
      sweep();
      const key = clientKey(req);
      const bucket = sql('SELECT n FROM admin_login_limits WHERE network = ?').get(key);
      if (bucket?.n >= 10) return reply(res, 429, { error: 'Try sign-in again later.' }, undefined, { 'retry-after': '3600' });
      sql('INSERT INTO admin_login_limits VALUES (?, ?, 1) ON CONFLICT(network) DO UPDATE SET n = n + 1').run(key, now());
      const state = random(), browser = random(), verifier = random(), nonce = random();
      const target = url.searchParams.get('returnTo') || '';
      const returnHash = RETURN_HASHES.some((pattern) => pattern.test(target)) ? target : '';
      sql('INSERT INTO admin_flows (state, browser, verifier, nonce, expires, return_hash, previous_session) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(hash(state), hash(browser), verifier, nonce, now() + MINUTES10, returnHash, getSession(req)?.token || '');
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      auth.search = new URLSearchParams({ client_id: googleClientId, redirect_uri: `${siteOrigin}${CALLBACK}`, response_type: 'code',
        scope: 'openid email', state, nonce, code_challenge: hash(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
      // the flow cookie goes only to the callback, the one place that reads it
      return redirect(res, auth.href, { 'set-cookie': cookie(FLOW, browser, 600, CALLBACK) });
    }
    if (PUBLIC_ASSETS.has(p) && req.method === 'GET') return reply(res, 200, readFileSync(new URL(`./admin${p}`, import.meta.url)), p.endsWith('.css') ? 'text/css; charset=utf-8' : 'image/webp');
    const session = getSession(req);
    if (!session) return (p === '' || p === '/') && req.method === 'GET' ? redirect(res, `${ROOT}/login`) : reply(res, 401, { error: 'Sign in to continue.' });
    if (p === '/api/crucible' || p.startsWith('/api/crucible/')) return crucible(req, res, p.slice('/api/crucible'.length), url, session);
    if (req.method === 'POST') {
      if (req.headers.origin !== siteOrigin || req.headers['x-csrf-token'] !== session.csrf) return reply(res, 403, { error: 'Request refused.' });
      if (p === '/logout') {
        sql('DELETE FROM admin_sessions WHERE token = ?').run(session.token);
        return reply(res, 200, { ok: true }, undefined, { 'set-cookie': cookie(SESSION, '', 0) });
      }
      const action = /^\/api\/(looks|mods)\/([^/]+)(?:\/([\w-]{43}))?\/(approve|decline|remove|requeue)$/.exec(p);
      if (!action) return reply(res, 404, { error: 'Not found.' });
      const [, kind, id, bundleHash, verb] = action;
      if (verb === 'requeue' && kind !== 'mods') return reply(res, 400, { error: 'Only mods can be sent back to review.' });
      if (!(kind === 'looks' ? /^c-[0-9a-f]{10}$/.test(id) && !bundleHash : /^[a-z2-7]{16}$/.test(id) && !!bundleHash)) return reply(res, 400, { error: 'Invalid item.' });
      const body = await readJson(req, 4096);
      if (typeof body.reason !== 'string' || body.reason.length > 1200 || (verb === 'decline' && !body.reason.replace(/[\p{Cc}\p{Cf}\s]/gu, ''))) return reply(res, 400, { error: 'Give a reason for declining.' });
      const to = { approve: 'published', decline: 'declined', remove: 'removed', requeue: 'queued' }[verb];
      const ok = kind === 'looks' ? decide(id, to, body.reason, session.email) : await decideMod(id, bundleHash, to, body.reason, session.email);
      return reply(res, ok ? 200 : 409, ok ? { ok: true } : { error: 'The item changed, is blocked, or cannot take that action. Refresh and check it.' });
    }
    if (req.method !== 'GET') return reply(res, 405, { error: 'GET or POST only.' }, undefined, { allow: 'GET, POST' });
    const asset = Object.hasOwn(ASSETS, p) && ASSETS[p];
    if (asset) return reply(res, 200, readFileSync(new URL(`./admin/${asset[0]}`, import.meta.url)), asset[1]);
    const stats = /^\/api\/stats\/([a-z]+)$/.exec(p);
    if (stats) {
      if (!STATS.has(stats[1])) return reply(res, 404, { error: 'Not found.' });
      if (!statsDir) return reply(res, 404, { error: 'This server has no statistics folder (STATS_DIR).' });
      let text;
      try { text = readFileSync(path.join(statsDir, `${stats[1]}.json`), 'utf8'); } catch { return reply(res, 404, { error: 'Nothing has been collected yet.' }); }
      return reply(res, 200, text);
    }
    if (p === '/api/glaze') return reply(res, 200, glazeNumbers());
    if (p === '/api/data') {
      // shortcut: lists fit in one response today; page in SQL when the gallery holds thousands of submissions.
      const looks = sql('SELECT * FROM looks ORDER BY created, id').all().map((r) => {
        const decision = JSON.parse(r.decision);
        return { kind: 'looks', id: r.id, name: r.name, credit: r.credit, status: r.status, created: Date.parse(r.created), person: decision.person || decision.escalation?.reason || r.reason };
      });
      const mods = sql('SELECT * FROM mods ORDER BY created, hash').all().map((r) => ({ kind: 'mods', id: r.id, hash: r.hash, name: r.name, credit: r.credit, version: r.version, status: r.status, created: r.created, person: JSON.parse(r.decision).person || r.reason, reviewing: live().has(r.hash) }));
      let list = null;
      try { list = JSON.parse(blocklist()).list; } catch { /* none */ }
      return reply(res, 200, { email: session.email, csrf: session.csrf, looks, mods, limits,
        blocklist: list ? { seq: list.seq, expires: list.expires, mods: list.mods.length, bundles: list.bundles.length, authors: list.authors.length } : null,
        audit: sql('SELECT * FROM admin_audit ORDER BY seq DESC LIMIT 200').all() });
    }
    // The running review agents' events, newest last; `?hash=` for one.
    if (p === '/api/live') {
      const hash = url.searchParams.get('hash');
      const feeds = [...live()].filter(([h]) => !hash || h === hash).map(([h, f]) => ({ hash: h, id: f.id, name: f.name, version: f.version, started: f.started, rounds: f.rounds || 0, events: f.events }));
      return reply(res, 200, { feeds });
    }
    if (p === '/api/audit') {
      const before = Number(url.searchParams.get('before'));
      if (!Number.isSafeInteger(before) || before < 1) return reply(res, 400, { error: 'Invalid audit page.' });
      return reply(res, 200, sql('SELECT * FROM admin_audit WHERE seq < ? ORDER BY seq DESC LIMIT 200').all(before));
    }
    const look = /^\/(api|files)\/looks\/(c-[0-9a-f]{10})$/.exec(p);
    if (look) {
      const row = sql('SELECT * FROM looks WHERE id = ?').get(look[2]);
      if (!row) return reply(res, 404, { error: 'No such Look.' });
      const media = row.media && await readLookMedia(row.media);
      if (look[1] === 'api') return reply(res, 200, { ...lookView(row), mediaType: media ? media.mime : null });
      if (!media) return reply(res, 404, { error: 'The media file is unavailable.' });
      return fileReply(req, res, readFileSync(media.file), row.media, { text: media.mime === 'application/json' });
    }
    const mod = /^\/(api|files|bundles)\/mods\/([a-z2-7]{16})\/([\w-]{43})$/.exec(p);
    if (mod) {
      const row = sql('SELECT * FROM mods WHERE id = ? AND hash = ?').get(mod[2], mod[3]);
      if (!row) return reply(res, 404, { error: 'No such mod.' });
      let stored;
      try { stored = await readMod(row); } catch { /* show retained review even if its bundle is missing */ }
      if (mod[1] === 'api') return reply(res, 200, { ...modView(row), fileError: stored ? '' : 'The bundle is missing or failed its signature/hash check.',
        files: stored ? Object.entries(stored.got.files).map(([p, b]) => ({ path: p, bytes: b.length, type: adminFileType(b) })) : [],
        versions: sql('SELECT id, hash, version, status, created FROM mods WHERE id = ? ORDER BY created').all(row.id) });
      if (!stored) return reply(res, 404, { error: 'The bundle is unavailable.' });
      if (mod[1] === 'bundles') return reply(res, 200, stored.bytes, 'application/zip', {
        'content-disposition': `attachment; filename="${row.id}-${row.hash}.glazemod"`, 'content-security-policy': "default-src 'none'; sandbox" });
      const file = url.searchParams.get('path');
      if (!file || !Object.hasOwn(stored.got.files, file)) return reply(res, 404, { error: 'No such file.' });
      return fileReply(req, res, stored.got.files[file], file, { text: url.searchParams.get('view') === 'text', download: url.searchParams.get('download') === '1' });
    }
    return reply(res, 404, { error: 'Not found.' });
  };
  return { handle, audit, sweep };
}
