// "Come back after installing Kiln" (Crucible DESIGN 1.3; the launcher side: Kiln's docs/kiln/launcher/crucible.md,
// "Come back after installing Kiln"). /kiln/download?crucible=<CODE> (the pack page's "Get Kiln") hands the pack to the
// launcher two ways: the Windows installer and the AppImage are saved as <name>.crucible-<CODE>.<ext> (the launcher reads
// the code from its installer's or its own file name once), and a download click copies the pack's link, which the
// launcher reads from the clipboard once at its first start. Pure functions here; src/scripts/kiln/crucibleResume.ts
// does the page.
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** A share code as typed (any case, with or without its dash) -> "H7QK3MZP", or null. */
export function crucibleCode(raw: string | null | undefined): string | null {
  const c = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (c.length !== 8 || [...c].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  return c;
}

/** The pack's share link, as the launcher expects it in the clipboard. */
export const crucibleLink = (code: string, origin = 'https://frostdev.io') => `${origin}/kiln/crucible/p/${code.slice(0, 4)}-${code.slice(4)}`;

/** Which launcher files carry the code in their name (the ones whose name the launcher can read back). */
export const NAMED_KINDS = ['windows', 'appimage'] as const;

/** "kiln-launcher_0.2.0_x64-setup.exe" + "H7QK3MZP" -> "kiln-launcher_0.2.0_x64-setup.crucible-H7QK3MZP.exe"; null for other files. */
export function crucibleFileName(name: string, kind: string, code: string): string | null {
  if (!(NAMED_KINDS as readonly string[]).includes(kind) || !crucibleCode(code)) return null;
  const m = /^(.*?)(\.exe|\.AppImage)$/i.exec(name);
  if (!m || !m[1]) return null;
  return `${m[1]}.crucible-${crucibleCode(code)}${m[2]}`;
}
