// Crucible's pages (src/scripts/crucible): the pure parts of what the pages say, kept here so node --test can check them
// (src/lib/crucibleView.test.mjs, npm run test:crucible). Plain player wording: no internal names or codes.

/** Mod kinds as the Kiln Launcher names them (launcher i18n deck.kinds). */
export const KIND_LABEL: Record<string, string> = {
  kiln: 'Kiln mod', native: 'Native mod', plugin: 'Plugin', emf: 'EMF mod', eml: 'EML mod', shroudforge: 'ShroudForge mod',
  set: 'SET mod', greeneye: 'Greeneye mod', flame: 'Flame mod', shroudtopia: 'Shroudtopia mod', enshwick: 'Enshwick mod',
  shroudlink: 'shroudlink mod', ember: "Ember mod (doesn't run yet)",
};
export const kindLabel = (kind: string | null | undefined) => (kind && KIND_LABEL[kind]) || 'Mod';

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface Checks { state?: string; full?: boolean; errors?: string[]; warnings?: string[]; notes?: string[] }
export type Tone = 'ok' | 'note' | 'warn' | 'bad' | 'wait' | 'none';
export interface ChecksView { tone: Tone; title: string; lead: string; items: { level: 'problem' | 'warning' | 'note'; text: string }[]; foot: string }

/** What the Checks section says about a version's checks (the service's checks object: state + findings). */
export function checksView(c: Checks | null | undefined): ChecksView {
  if (!c) return { tone: 'none', title: 'Not checked yet', lead: 'This version has not been checked yet.', items: [], foot: '' };
  const errors = c.errors ?? [], warnings = c.warnings ?? [], notes = c.notes ?? [];
  const items = [
    ...errors.map((text) => ({ level: 'problem' as const, text })),
    ...warnings.map((text) => ({ level: 'warning' as const, text })),
    ...notes.map((text) => ({ level: 'note' as const, text })),
  ];
  const pending = ['waiting', 'queued', 'running'].includes(c.state ?? '');
  const foot = c.full ? 'Crucible checked every file: format, sizes, zip safety, known bad files and a code scan.'
    : pending ? "So far Crucible checked the pack's list of files." : "Crucible checked the pack's list of files.";
  if (errors.length) return { tone: 'bad', title: `Checks found ${count(errors.length, 'problem')}`, lead: 'Read them before you install.', items, foot };
  if (pending) return { tone: 'wait', title: 'Checks are still running', lead: 'Crucible is checking the files. Look again in a few minutes.', items, foot };
  if (c.state === 'failed') return { tone: 'warn', title: "The checks couldn't run", lead: 'The Kiln team has been told. Read the comments before you install.', items, foot };
  if (warnings.length) return { tone: 'warn', title: `Checks passed with ${count(warnings.length, 'warning')}`, lead: 'Read them before you install.', items, foot };
  if (notes.length) return { tone: 'note', title: `Checks passed with ${count(notes.length, 'note')}`, lead: '', items, foot };
  return { tone: 'ok', title: 'Checks passed', lead: '', items, foot };
}

export const FILTER_KEYS = ['q', 'tags', 'build', 'side', 'server', 'mods', 'sort'] as const;
export type BrowseState = Record<(typeof FILTER_KEYS)[number], string>;

/** True when the search narrows the list (words or any filter; the sort doesn't count). */
export const narrowed = (s: Partial<BrowseState>) => Boolean(s.q || s.tags || s.build || s.side || s.server || s.mods);

/** "matching “frost”, tagged hardcore, for your game, with fewer than 10 mods" */
export function describeFilters(s: Partial<BrowseState>) {
  const bits: string[] = [];
  if (s.q) bits.push(`matching “${s.q}”`);
  if (s.tags) bits.push(`tagged ${s.tags.split(',').filter(Boolean).join(', ')}`);
  if (s.build) bits.push(`for game build ${s.build}`);
  if (s.side === 'client') bits.push('for your game');
  else if (s.side === 'server') bits.push('for a dedicated server');
  if (s.server === '1') bits.push('with a server pack');
  const mods: Record<string, string> = { lt10: 'with fewer than 10 mods', '10-30': 'with 10 to 30 mods', '30+': 'with more than 30 mods' };
  if (s.mods && mods[s.mods]) bits.push(mods[s.mods]);
  return bits.join(', ');
}

/** The line above the results: "3 packs matching “frost”", "20+ packs". */
export function countLine(n: number, more: boolean, s: Partial<BrowseState>) {
  if (!n) return 'No packs found.';
  return `${n}${more ? '+' : ''} pack${n === 1 && !more ? '' : 's'} ${describeFilters(s)}`.trim();
}

/** The empty list: nothing public at all yet, or nothing that matches. */
export function emptyBrowse(s: Partial<BrowseState>): { kind: 'none' | 'nomatch'; title: string; text: string } {
  return narrowed(s)
    ? { kind: 'nomatch', title: 'No packs match', text: 'Try other words or fewer filters.' }
    : { kind: 'none', title: 'No public packs yet', text: 'Be the first: share your mods from the Kiln Launcher, then make the pack public.' };
}
