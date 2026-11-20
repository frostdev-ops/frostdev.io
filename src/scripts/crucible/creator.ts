// A creator's packs: their public packs, and to the creator themself also the packs they shared by link.
import { $, api, h, packCard, pageData, type Pack, plural, say, type User, avatar, fmtWhen } from './api.ts';
import { me } from './account.ts';

interface Data { kind: 'creator'; user: User; packs: Pack[] }

async function start() {
  let d = pageData<Data>();
  const id = /\/u\/(\d{17,20})\/?$/.exec(location.pathname)?.[1];
  if (!d && id) { try { d = { kind: 'creator', ...(await api<{ user: User; packs: Pack[] }>('GET', `/users/${id}/packs`)) }; } catch { /* below */ } }
  if (!d) { say($('c-creator-name'), 'This creator is not on Crucible'); return; }
  document.title = `Modpacks by ${d.user.name} · Crucible`;
  say($('c-creator-name'), d.user.name);
  $('c-avatar').replaceWith(Object.assign(avatar(d.user, 128), { id: 'c-avatar' }));
  const up = d.packs.reduce((n, p) => n + p.upvotes, 0), inst = d.packs.reduce((n, p) => n + p.installs, 0);
  say($('c-creator-stats'), `${plural(d.packs.length, 'public pack')} · ${plural(up, 'upvote')} · ${plural(inst, 'install')}`);
  $('c-results').replaceChildren(...d.packs.map((p) => packCard(p)));
  $('c-empty').hidden = d.packs.length > 0;
  const account = await me();
  if (account && account.id === d.user.id) {
    try {
      const mine = (await api<{ packs: Pack[] }>('GET', '/me/packs')).packs.filter((p) => p.visibility !== 'public');
      if (mine.length) {
        $('c-mine').hidden = false;
        $('c-mine-list').replaceChildren(...mine.map((p) => packCard(p, { extra: p.expiresAt ? h('p', { class: 'muted', text: `Deleted ${fmtWhen(p.expiresAt)} unless someone installs or you update it.` }) : undefined })));
      }
    } catch { /* only the public list */ }
  }
}
start();
