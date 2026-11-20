// The bar on every Crucible page: "Got a code?" and the account (sign in with Discord through the Kiln relay, which
// sets the __Secure-crucible cookie; sign out; "Sign out and forget me").
import { $, api, ApiError, type Account, avatar, BASE, creatorPath, h, parseCode, say, signInUrl } from './api.ts';

let current: Promise<Account | null> | null = null;
/** The signed-in account, or null (asked once per page). */
export function me(): Promise<Account | null> {
  current ??= api<{ account: Account | null }>('GET', '/me').then((r) => r.account, () => null);
  return current;
}

function renderAccount(a: Account | null) {
  const box = $('c-account');
  if (!box) return;
  box.replaceChildren();
  if (!a) {
    box.append(h('a', { class: 'c-btn secondary small', href: signInUrl(), text: 'Sign in with Discord' }));
    return;
  }
  const menu = h('div', { class: 'menu' },
    h('a', { href: creatorPath(a.id), text: 'My packs' }),
    h('button', { type: 'button', text: 'Sign out', onclick: signOut }),
    h('button', { type: 'button', class: 'danger', text: 'Sign out and forget me…', onclick: () => $<HTMLDialogElement>('c-forget-dialog')?.showModal() }));
  const details = h('details', {},
    h('summary', { 'aria-label': `Signed in as ${a.name}. Account menu` }, avatar(a, 28), h('span', { text: a.name })),
    menu);
  details.addEventListener('keydown', (e) => { if (e.key === 'Escape' && details.open) { details.open = false; details.querySelector('summary')?.focus(); } });
  document.addEventListener('click', (e) => { if (details.open && !details.contains(e.target as Node)) details.open = false; });
  box.append(details);
}

async function signOut() {
  try { await api('POST', '/signout'); } catch { /* the cookie is cleared either way */ }
  location.reload();
}

function wireForget() {
  const dialog = $<HTMLDialogElement>('c-forget-dialog');
  const go = $<HTMLButtonElement>('c-forget-confirm');
  if (!dialog || !go) return;
  go.addEventListener('click', async () => {
    go.disabled = true;
    say($('c-forget-error'), '');
    try {
      await api('POST', '/me/forget');
      dialog.close();
      location.assign(BASE);
    } catch (e) {
      say($('c-forget-error'), e instanceof ApiError ? e.message : 'That did not work. Try again in a minute.');
    } finally { go.disabled = false; }
  });
}

function wireCode() {
  const form = $<HTMLFormElement>('c-code-form');
  const input = $<HTMLInputElement>('c-code-input');
  if (!form || !input) return;
  const open = (raw: string) => {
    const code = parseCode(raw);
    if (!code) { say($('c-code-error'), "That isn't a code. Codes look like H7QK-3MZP."); input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    location.assign(`${BASE}/p/${code}`);
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); open(input.value); });
  input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); say($('c-code-error'), ''); });
  const q = new URL(location.href).searchParams.get('code');
  if (q) open(q);
}

function signinNotice() {
  const u = new URL(location.href);
  if (u.searchParams.get('signin') !== 'cancelled') return;
  say($('c-code-error'), 'Sign-in was cancelled. You can keep browsing without signing in.');
  u.searchParams.delete('signin');
  history.replaceState(null, '', u.pathname + u.search + u.hash);
}

wireCode();
wireForget();
signinNotice();
me().then(renderAccount, (e) => { if (!(e instanceof ApiError)) throw e; renderAccount(null); });
