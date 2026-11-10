// Kiln's downloads, read from src/data/kilnRelease.json (written by scripts/kiln-release-data.mjs from a finished release
// folder). The release folder is served at /kiln/downloads/<version>/. /kiln, /kiln/download and the stable links
// (/kiln/download/windows, ...) all read this one file, so a new release is a new JSON and nothing else.
import data from '../data/kilnRelease.json';

export interface KilnFile {
  kind: string;
  /** Path under the version folder. */
  path: string;
  label: string;
  about?: string;
  /** Bytes and SHA-256. The script writes both; the page copes with a file list that has neither yet. */
  size?: number;
  sha256?: string;
}
export interface KilnGroup {
  id: string;
  title: string;
  about: string;
  files: KilnFile[];
}
export interface KilnReleaseData {
  version: string;
  channel: string;
  released: string;
  files: { windows: string; appimage: string; deb: string; rpm?: string; server: string; runtime: string; sums: string };
  github: string;
  nexus: string;
  groups: KilnGroup[];
}

export const release = data as unknown as KilnReleaseData;
export const groups = release.groups;
export const allFiles = groups.flatMap((group) => group.files);

export const downloadBase = `/kiln/downloads/${release.version}/`;
/** The URL of a file of this release. */
export const fileHref = (path: string) => downloadBase + encodeURI(path);
export const fileName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
export const findFile = (path: string) => allFiles.find((file) => file.path === path);

export const releasedLong = new Date(`${release.released}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Sizes the way the release's README writes them (1 KB = 1024 bytes). */
export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
export const shortHash = (sha256: string) => `${sha256.slice(0, 8)}…${sha256.slice(-4)}`;

// The stable links: /kiln/download/<id> sends the visitor to the current version's file. `key` is the entry in files{}.
const stableKeys = [
  { id: 'windows', key: 'windows' },
  { id: 'linux', key: 'appimage' },
  { id: 'deb', key: 'deb' },
  { id: 'rpm', key: 'rpm' },
  { id: 'server', key: 'server' },
  { id: 'runtime', key: 'runtime' },
] as const;
export const stableLinks = stableKeys.flatMap(({ id, key }) => {
  const path = (release.files as Record<string, string | undefined>)[key];
  if (!path) return [];
  const file = findFile(path);
  if (!file) throw new Error(`Kiln release data: files.${key} is ${path}, which is in no group of src/data/kilnRelease.json. Run scripts/kiln-release-data.mjs.`);
  return [{ id, href: `/kiln/download/${id}`, file }];
});
for (const id of ['windows', 'linux', 'deb', 'server', 'runtime']) {
  if (!stableLinks.some((link) => link.id === id)) throw new Error(`Kiln release data has no ${id} file. Run scripts/kiln-release-data.mjs on the release folder.`);
}

const withoutHash = allFiles.filter((file) => !file.sha256 || file.size === undefined);
if (withoutHash.length) {
  console.warn(`Kiln release data: ${withoutHash.length} of ${allFiles.length} files have no size or SHA-256. Run scripts/kiln-release-data.mjs on the release folder before publishing.`);
}
