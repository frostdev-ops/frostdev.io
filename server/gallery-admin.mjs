// The private gallery surface. Google tokens are accepted only from the server's direct TLS token exchange,
// never from a browser. Google documents this channel as authenticating the ID token without a second JWT
// signature check: https://developers.google.com/identity/openid-connect/openid-connect#exchangecode
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const ROOT = '/glaze/admin';
const SESSION = '__Secure-gz_admin';
const FLOW = '__Secure-gz_admin_flow';
const HOURS12 = 12 * 3600e3;
const MINUTES10 = 10 * 60e3;
const random = () => crypto.randomBytes(32).toString('base64url');
const hash = (v) => crypto.createHash('sha256').update(v).digest('base64url');
const cookie = (name, value, seconds) => `${name}=${value}; Path=${ROOT}; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
const cookieOf = (req, name) => {
  const values = String(req.headers.cookie || '').split(';').map((p) => p.trim()).filter((p) => p.startsWith(`${name}=`));
  const value = values.length === 1 ? values[0].slice(name.length + 1) : '';
  return /^[\w-]{43}$/.test(value) ? value : '';
};
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
const plain = 'text/plain; charset=utf-8';
const mediaTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm' };

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

export function galleryAdmin({ db, siteOrigin, now, clientKey, readJson, decide, decideMod, readMod, readLookMedia, permissionWords,
  limits, blocklist, googleClientId, googleClientSecret, adminEmails, googleFetch = fetch }) {
  const emails = new Set(String(adminEmails || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
  const enabled = !!(googleClientId && googleClientSecret && emails.size);
  db.exec(`CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, email TEXT NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_flows (state TEXT PRIMARY KEY, browser TEXT NOT NULL, verifier TEXT NOT NULL, nonce TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_login_limits (network TEXT PRIMARY KEY, started INTEGER NOT NULL, n INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_audit (seq INTEGER PRIMARY KEY, email TEXT NOT NULL, action TEXT NOT NULL, kind TEXT NOT NULL,
      id TEXT NOT NULL, hash TEXT NOT NULL, at INTEGER NOT NULL, reason TEXT NOT NULL);`);
  const sql = (s) => db.prepare(s);
  const sweep = () => {
    sql('DELETE FROM admin_sessions WHERE expires <= ?').run(now());
    sql('DELETE FROM admin_flows WHERE expires <= ?').run(now());
    sql('DELETE FROM admin_login_limits WHERE started <= ?').run(now() - 3600e3);
  };
  const audit = (email, action, kind, id, bundleHash, reason) => sql('INSERT INTO admin_audit (email, action, kind, id, hash, at, reason) VALUES (?, ?, ?, ?, ?, ?, ?)').run(email, action, kind, id, bundleHash, now(), reason);
  const reply = (res, status, body, type = 'application/json; charset=utf-8', headers = {}) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      'content-security-policy': CSP, 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', ...headers });
    res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
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

  const handle = async (req, res, url) => {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-security-policy', CSP);
    res.setHeader('x-frame-options', 'DENY');
    if (!enabled) return reply(res, 404, { error: 'Not found.' });
    const p = url.pathname.slice(ROOT.length);
    if (p === '/login' && req.method === 'GET') return reply(res, 200,
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Gallery sign-in</title><main><h1>Glaze gallery admin</h1><form method="post" action="/glaze/admin/login"><button>Sign in with Google</button></form></main></html>', 'text/html; charset=utf-8');
    if (p === '/login' && req.method === 'POST') {
      if (req.headers.origin !== siteOrigin) return refuse(res);
      sweep();
      const key = clientKey(req);
      const bucket = sql('SELECT n FROM admin_login_limits WHERE network = ?').get(key);
      if (bucket?.n >= 10) return reply(res, 429, { error: 'Try sign-in again later.' }, undefined, { 'retry-after': '3600' });
      sql('INSERT INTO admin_login_limits VALUES (?, ?, 1) ON CONFLICT(network) DO UPDATE SET n = n + 1').run(key, now());
      const state = random(), browser = random(), verifier = random(), nonce = random();
      sql('INSERT INTO admin_flows VALUES (?, ?, ?, ?, ?)').run(hash(state), hash(browser), verifier, nonce, now() + MINUTES10);
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      auth.search = new URLSearchParams({ client_id: googleClientId, redirect_uri: `${siteOrigin}${ROOT}/callback`, response_type: 'code',
        scope: 'openid email', state, nonce, code_challenge: hash(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
      return redirect(res, auth.href, { 'set-cookie': cookie(FLOW, browser, 600) });
    }
    if (p === '/callback' && req.method === 'GET') {
      res.setHeader('set-cookie', cookie(FLOW, '', 0));
      const state = url.searchParams.get('state') || '', browser = cookieOf(req, FLOW), code = url.searchParams.get('code');
      if (!/^[\w-]{43}$/.test(state) || !browser) return refuse(res);
      // DELETE RETURNING consumes before the asynchronous exchange, including failed exchanges and parallel replays.
      const flow = sql('DELETE FROM admin_flows WHERE state = ? AND browser = ? AND expires > ? RETURNING *').get(hash(state), hash(browser), now());
      if (!flow || !code || code.length > 4096 || url.searchParams.has('error') || url.searchParams.getAll('code').length !== 1 || url.searchParams.getAll('state').length !== 1) return refuse(res);
      try {
        const response = await googleFetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10e3),
          headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: googleClientId,
            client_secret: googleClientSecret, redirect_uri: `${siteOrigin}${ROOT}/callback`, grant_type: 'authorization_code', code_verifier: flow.verifier }) });
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
        sql('DELETE FROM admin_sessions WHERE token = ?').run(hash(cookieOf(req, SESSION)));
        sql('INSERT INTO admin_sessions VALUES (?, ?, ?, ?)').run(hash(session), email, csrf, now() + HOURS12);
        return redirect(res, ROOT, { 'set-cookie': [cookie(FLOW, '', 0), cookie(SESSION, session, HOURS12 / 1000)] });
      } catch { return refuse(res); }
    }
    const session = getSession(req);
    if (!session) return (p === '' || p === '/') && req.method === 'GET' ? redirect(res, `${ROOT}/login`) : reply(res, 401, { error: 'Sign in to continue.' });
    if (req.method === 'POST') {
      if (req.headers.origin !== siteOrigin || req.headers['x-csrf-token'] !== session.csrf) return reply(res, 403, { error: 'Request refused.' });
      if (p === '/logout') {
        sql('DELETE FROM admin_sessions WHERE token = ?').run(session.token);
        return reply(res, 200, { ok: true }, undefined, { 'set-cookie': cookie(SESSION, '', 0) });
      }
      const action = /^\/api\/(looks|mods)\/([^/]+)(?:\/([\w-]{43}))?\/(approve|decline|remove)$/.exec(p);
      if (!action) return reply(res, 404, { error: 'Not found.' });
      const [, kind, id, bundleHash, verb] = action;
      if (!(kind === 'looks' ? /^c-[0-9a-f]{10}$/.test(id) && !bundleHash : /^[a-z2-7]{16}$/.test(id) && !!bundleHash)) return reply(res, 400, { error: 'Invalid item.' });
      const body = await readJson(req, 4096);
      if (typeof body.reason !== 'string' || body.reason.length > 1200 || (verb === 'decline' && !body.reason.replace(/[\p{Cc}\p{Cf}\s]/gu, ''))) return reply(res, 400, { error: 'Give a reason for declining.' });
      const to = { approve: 'published', decline: 'declined', remove: 'removed' }[verb];
      const ok = kind === 'looks' ? decide(id, to, body.reason, session.email) : await decideMod(id, bundleHash, to, body.reason, session.email);
      return reply(res, ok ? 200 : 409, ok ? { ok: true } : { error: 'The item changed, is blocked, or cannot take that action. Refresh and check it.' });
    }
    if (req.method !== 'GET') return reply(res, 405, { error: 'GET or POST only.' }, undefined, { allow: 'GET, POST' });
    const asset = { '': ['index.html', 'text/html; charset=utf-8'], '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] }[p];
    if (asset) return reply(res, 200, readFileSync(new URL(`./admin/${asset[0]}`, import.meta.url)), asset[1]);
    if (p === '/api/data') {
      // shortcut: lists fit in one response today; page in SQL when the gallery holds thousands of submissions.
      const looks = sql('SELECT * FROM looks ORDER BY created, id').all().map((r) => {
        const decision = JSON.parse(r.decision);
        return { kind: 'looks', id: r.id, name: r.name, credit: r.credit, status: r.status, created: Date.parse(r.created), person: decision.person || decision.escalation?.reason || r.reason };
      });
      const mods = sql('SELECT * FROM mods ORDER BY created, hash').all().map((r) => ({ kind: 'mods', id: r.id, hash: r.hash, name: r.name, credit: r.credit, version: r.version, status: r.status, created: r.created, person: JSON.parse(r.decision).person || r.reason }));
      let list = null;
      try { list = JSON.parse(blocklist()).list; } catch { /* none */ }
      return reply(res, 200, { email: session.email, csrf: session.csrf, looks, mods, limits,
        blocklist: list ? { seq: list.seq, expires: list.expires, mods: list.mods.length, bundles: list.bundles.length, authors: list.authors.length } : null,
        audit: sql('SELECT * FROM admin_audit ORDER BY seq DESC LIMIT 200').all() });
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
