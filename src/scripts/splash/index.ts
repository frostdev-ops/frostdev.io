// Splash entry — tiny and sync. All of three arrives via the dynamic import
// of scene.ts, kicked off at idle (or first interaction, whichever is first).

const canvas = document.getElementById('splash-canvas') as HTMLCanvasElement | null;
// ?still renders a single deterministic frame — used for screenshots/review.
const still = new URLSearchParams(location.search).has('still');
let booted = false;

function boot() {
  if (booted || !canvas) return;
  booted = true;
  import('./scene.ts')
    .then((m) => {
      m.createScene(canvas, { still });
    })
    .catch(() => {
      // Chunk failed to load — the CSS ground layer stays.
    });
}

if ('requestIdleCallback' in window) requestIdleCallback(boot);
else setTimeout(boot, 1);
addEventListener('pointermove', boot, { once: true, passive: true });
addEventListener('scroll', boot, { once: true, passive: true });
