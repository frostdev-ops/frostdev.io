// /kiln/download?crucible=<CODE>: the pack page's "Get Kiln" (src/lib/crucibleResume.ts says how the launcher picks the
// pack up). Shows the two steps with the pack's name, saves the Windows installer and the AppImage as
// <name>.crucible-<CODE>.<ext> (the download attribute: the files are on this origin), and on a launcher download click
// copies the pack's link for the launcher's first start. Without a valid code the page is unchanged.
import { crucibleCode, crucibleFileName, crucibleLink } from '../../lib/crucibleResume.ts';

const code = crucibleCode(new URL(location.href).searchParams.get('crucible'));
const box = document.getElementById('kiln-crucible');
if (code && box) {
  const link = crucibleLink(code, location.origin);
  const path = new URL(link).pathname;
  const packLink = document.getElementById('kiln-crucible-pack') as HTMLAnchorElement;
  const back = document.getElementById('kiln-crucible-back') as HTMLAnchorElement;
  const status = document.getElementById('kiln-crucible-status')!;
  packLink.href = path;
  back.href = path;
  box.hidden = false;
  fetch(`/kiln/crucible/api/v1/codes/${code}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
    const title = j?.pack?.title;
    if (typeof title === 'string' && title) packLink.textContent = title;
  }).catch(() => { /* "the pack" stays */ });

  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-kind]')) {
    const kind = a.dataset.kind ?? '';
    if (!['windows', 'appimage', 'deb', 'rpm'].includes(kind)) continue;
    const named = crucibleFileName(a.dataset.name ?? '', kind, code);
    if (named) a.download = named;
    a.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
        status.textContent = "We copied the pack's link: Kiln opens it when it starts.";
      } catch {
        status.textContent = `Kiln opens the pack when it starts if this link is copied: ${link}`;
      }
    });
  }
}
