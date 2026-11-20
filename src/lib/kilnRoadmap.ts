// Kiln's roadmap (/kiln/roadmap), read from src/data/kilnRoadmap.json: every release with what it brought, the next
// release, the planned ones after it, the milestones and the planned features with no release yet. The file is checked
// here, so a typo in an area or a status fails the build instead of showing an empty filter.
// A release published since the file was written is shown as released: when src/data/kilnRelease.json names a version
// the roadmap still lists as next or planned, that release counts as out, on kilnRelease.json's date. Its list is then
// still the plan; replace it with what shipped (docs/public-pages.md, "Kiln roadmap"). The released entry of the release
// kilnRelease.json names may leave out its date: it then takes that file's date (the release data and the roadmap move
// in the same site push).
// A minor patch (0.2.0-dev.29.18, "patch": true in the data) is a release of its own on a smaller scale: it has its own
// entry and rail dot, styled as a patch of the dev release it follows (patchOf), and is not counted as a release.
import data from '../data/kilnRoadmap.json';
import { release as currentRelease } from './kilnDownloads';

export const roadmapAreas = [
  { id: 'launcher', label: 'Launcher', about: 'Installing, profiles, mod lists, updates and reports.' },
  { id: 'api', label: 'C# API', about: 'The modding API and the SDK.' },
  { id: 'content', label: 'Content', about: 'Items, data packs, world, creatures, quests, models, sound and UI.' },
  { id: 'servers', label: 'Servers', about: 'Dedicated servers, multiplayer and admin tools.' },
  { id: 'compat', label: 'Other loaders', about: 'Mods of EMF, ShroudForge, EML and other loaders, with Kiln.' },
  { id: 'tools', label: 'Modder tools', about: 'The kiln command, cooking, VS Code, testing and publishing.' },
  { id: 'core', label: 'Core', about: 'The runtime: hooks, events, limits, safety after game updates.' },
] as const;
export type RoadmapArea = (typeof roadmapAreas)[number]['id'];
export const areaLabel = Object.fromEntries(roadmapAreas.map((area) => [area.id, area.label])) as Record<RoadmapArea, string>;

export type FeatureKind = 'new' | 'improved' | 'fix';
export const kindLabel: Record<FeatureKind, string> = { new: 'New', improved: 'Improved', fix: 'Fix' };
export type ReleaseStatus = 'released' | 'next' | 'planned';
export const statusLabel: Record<ReleaseStatus, string> = { released: 'Released', next: 'Next', planned: 'Planned' };
/** Where a feature that waits for its game test is switched off until then. */
export type Held = 'all' | 'hosted';
export const heldLabel: Record<Held, string> = { all: 'Switched off until then', hosted: 'Only on dedicated servers until then' };

export interface RoadmapFeature {
  title: string;
  text: string;
  area: RoadmapArea;
  kind: FeatureKind;
  /** Built, but not yet confirmed in a real game. */
  gamePending: boolean;
  /** Ships switched off until that game test: everywhere, or everywhere but on dedicated servers. */
  held?: Held;
  /** Ships as groundwork: in the release, nothing promised with it yet. */
  groundwork: boolean;
}
export interface RoadmapRelease {
  version: string;
  /** The short name used on the page: dev.27. */
  short: string;
  /** The anchor: dev-27 (dev-29-18 for a patch). */
  id: string;
  /** A minor patch of a dev release (0.2.0-dev.29.18), shown smaller than a release. */
  patch: boolean;
  /** The release a patch belongs to, as on the page: dev.29. */
  patchOf?: string;
  status: ReleaseStatus;
  /** YYYY-MM-DD, released ones only. */
  date?: string;
  title: string;
  summary: string;
  /** An upcoming release's state in a sentence or two, when the page's default does not say it. */
  note?: string;
  features: RoadmapFeature[];
}
export interface RoadmapLater {
  title: string;
  text: string;
  area: RoadmapArea;
  note?: string;
}
export interface RoadmapMilestone {
  title: string;
  text: string;
  /** The version it follows, or null when no release is named. */
  after: string | null;
}

interface RawFeature {
  title: string;
  text: string;
  area: string;
  kind?: string;
  gamePending?: boolean;
  held?: string;
  groundwork?: boolean;
}
interface RawRelease {
  version: string;
  patch?: boolean;
  date?: string;
  title: string;
  summary: string;
  note?: string;
  features: RawFeature[];
}
interface RawRoadmap {
  released: RawRelease[];
  upcoming: (RawRelease & { status: string })[];
  later: { title: string; text: string; area: string; note?: string }[];
  milestones: { title: string; text: string; after: string | null }[];
}

const areas = new Set<string>(roadmapAreas.map((area) => area.id));
const kinds = new Set<string>(['new', 'improved', 'fix']);
const helds = new Set<string>(['all', 'hosted']);
function fail(message: string): never {
  throw new Error(`src/data/kilnRoadmap.json: ${message}`);
}
function text(value: unknown, where: string) {
  if (typeof value !== 'string' || !value.trim()) fail(`${where} needs a text`);
  return value.trim();
}
function area(value: string, where: string) {
  if (!areas.has(value)) fail(`${where}: unknown area "${value}" (one of ${[...areas].join(', ')})`);
  return value as RoadmapArea;
}
function feature(raw: RawFeature, where: string): RoadmapFeature {
  const kind = raw.kind ?? 'new';
  if (!kinds.has(kind)) fail(`${where}: unknown kind "${kind}"`);
  if (raw.held !== undefined && !helds.has(raw.held)) fail(`${where}: held "${raw.held}" (all or hosted)`);
  if (raw.held !== undefined && raw.gamePending !== true) fail(`${where}: held needs gamePending`);
  return {
    title: text(raw.title, where),
    text: text(raw.text, where),
    area: area(raw.area, where),
    kind: kind as FeatureKind,
    gamePending: raw.gamePending === true,
    held: raw.held as Held | undefined,
    groundwork: raw.groundwork === true,
  };
}
/** A YYYY-MM-DD that is a day of the calendar (2026-02-30 is not). */
function realDate(date: string | undefined) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === date;
}
function short(version: string) {
  const match = /^\d+\.\d+\.\d+-(dev\.\d+(?:\.\d+)?)$/.exec(version) ?? /^(\d+\.\d+\.\d+)$/.exec(version);
  if (!match) fail(`"${version}" is not a Kiln version (0.2.0-dev.N, a patch 0.2.0-dev.N.M, or N.N.N)`);
  return match[1];
}
function release(raw: RawRelease, status: ReleaseStatus, where: string): RoadmapRelease {
  const version = text(raw.version, where);
  // The release the download data names may take its date from there.
  const date = status === 'released' && raw.date === undefined && version === currentRelease.version ? currentRelease.released : raw.date;
  if (status === 'released' && !realDate(date))
    fail(
      raw.date === undefined
        ? `${version} is released without a date: give it one, or write the release data (src/data/kilnRelease.json) for it first`
        : `${version} needs a real date (YYYY-MM-DD), not "${raw.date}"`,
    );
  if (!Array.isArray(raw.features) || raw.features.length === 0) fail(`${version} lists no features`);
  const name = short(version);
  const isPatch = /^dev\.\d+\.\d+$/.test(name);
  if (isPatch !== (raw.patch === true)) fail(`${version}: "patch": true goes with a patch version (0.2.0-dev.N.M) and only there`);
  return {
    version,
    short: name,
    id: name.replaceAll('.', '-'),
    patch: isPatch,
    patchOf: isPatch ? name.replace(/\.\d+$/, '') : undefined,
    status,
    date: status === 'released' ? date : undefined,
    title: text(raw.title, `${version} title`),
    summary: text(raw.summary, `${version} summary`),
    note: raw.note === undefined ? undefined : text(raw.note, `${version} note`),
    features: raw.features.map((f, i) => feature(f, `${version} feature ${i + 1}`)),
  };
}

const raw = data as RawRoadmap;
const released = raw.released.map((r) => release(r, 'released', 'released'));
let upcoming = raw.upcoming.map((r) => {
  if (r.status !== 'next' && r.status !== 'planned') fail(`${r.version}: status "${r.status}" (next or planned)`);
  return release(r, r.status, 'upcoming');
});

// A release that went out after the roadmap was written: released, on the download data's date.
const published = upcoming.find((r) => r.version === currentRelease.version);
if (published) {
  released.unshift({ ...published, status: 'released', date: currentRelease.released });
  upcoming = upcoming.filter((r) => r !== published);
  if (upcoming.length && !upcoming.some((r) => r.status === 'next')) upcoming[0] = { ...upcoming[0], status: 'next' };
} else if (!released.some((r) => r.version === currentRelease.version)) {
  console.warn(`kilnRoadmap: the current release ${currentRelease.version} is not on the roadmap`);
}

const seen = new Set<string>();
for (const r of [...released, ...upcoming]) {
  if (seen.has(r.version)) fail(`${r.version} is listed twice`);
  seen.add(r.version);
}
for (let i = 1; i < released.length; i++)
  if (released[i - 1].date! < released[i].date!) fail(`released: ${released[i - 1].version} is older than ${released[i].version}; newest first`);

/** Newest first. */
export const releasedReleases = released;
/** In the order they are planned: the next one first. */
export const upcomingReleases = upcoming;
export const nextRelease = upcoming.find((r) => r.status === 'next');
export const latestRelease = released[0];
export const laterFeatures: RoadmapLater[] = raw.later.map((l, i) => ({
  title: text(l.title, `later ${i + 1}`),
  text: text(l.text, `later ${i + 1}`),
  area: area(l.area, `later ${i + 1}`),
  note: l.note?.trim() || undefined,
}));
export const milestones: RoadmapMilestone[] = raw.milestones.map((m, i) => {
  if (m.after !== null && !seen.has(m.after)) fail(`milestone ${i + 1}: "after" names ${m.after}, which is not on the roadmap`);
  return { title: text(m.title, `milestone ${i + 1}`), text: text(m.text, `milestone ${i + 1}`), after: m.after };
});

export const counts = {
  released: released.filter((r) => !r.patch).length,
  patches: released.filter((r) => r.patch).length,
  shipped: released.reduce((n, r) => n + r.features.filter((f) => f.kind !== 'fix').length, 0),
  fixes: released.reduce((n, r) => n + r.features.filter((f) => f.kind === 'fix').length, 0),
  planned: upcoming.reduce((n, r) => n + r.features.length, 0) + laterFeatures.length,
};

/** Nov 14, 2026 */
export function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
/** Nov 14 */
export function railDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
/** What the filter's search reads: the words of a feature and where it is. */
export function searchText(f: { title: string; text: string; area: RoadmapArea }, where: string) {
  return `${f.title} ${f.text} ${areaLabel[f.area]} ${where}`.toLowerCase();
}
