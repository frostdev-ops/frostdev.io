#!/usr/bin/env node
// Writes src/data/kilnRelease.json from a finished Kiln release folder.
//
//   node scripts/kiln-release-data.mjs <release folder> [--released YYYY-MM-DD] [--out <file>] [--verify]
//
// The folder is the one Kiln's release tooling produces (kiln-<version>/: linux/, windows/, runtime/, sdk/, samples/,
// source/, README.txt, RELEASE-NOTES.md, SHA256SUMS, ...). The web server serves it at /kiln/downloads/<version>/ without
// nexus/ and updates/, so this script leaves those two folders out, and the .sig updater signatures too.
//
// The JSON it writes keeps what /kiln already read (version, channel, released, files.windows/appimage/deb/sums, github,
// nexus), adds files.rpm (only when the folder has an .rpm), files.server and files.runtime, and a "groups" list: every
// downloadable file with its path under the version folder, a label and one plain sentence for the page, its size in bytes
// and its SHA-256. /kiln/download (and the stable links /kiln/download/windows, /linux, /deb, /rpm, /server, /runtime)
// are built from that file. A file the script does not know is listed with its own name and a warning; a file that is
// not in the folder is never listed.
//
// SHA-256: taken from the folder's SHA256SUMS when the file is listed there, computed otherwise (SHA256SUMS itself).
// --verify recomputes every hash and fails when one differs from SHA256SUMS: run it before publishing.
// --released defaults to the "Built YYYY-MM-DD" line of the folder's README.txt, then to today (UTC).
// --out writes somewhere else than src/data/kilnRelease.json (tests).
//
// It fails, and writes nothing, when a main file is missing: the Windows setup program, the AppImage, the .deb, the
// runtime zip or the server pack. It warns about a file the web server could not read (not world-readable).
//
// To publish a release: run it on the finished folder, review `git diff src/data/kilnRelease.json`, run `npm run check
// && npm run build`, then commit and deploy (docs/public-pages.md, "Kiln releases").
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GITHUB_RELEASES = 'https://github.com/frostdev-ops/kiln/releases/tag/';
export const NEXUS_PAGE = 'https://www.nexusmods.com/enshrouded/mods/301';
const EXCLUDED_DIRS = new Set(['nexus', 'updates']);

// The groups, in page order. `about` is the sentence the page shows under the heading.
const GROUPS = [
  { id: 'launcher', title: 'Launcher', about: 'Most people want one of these. The launcher installs Kiln into the game and keeps your mods and profiles.' },
  { id: 'servers', title: 'Dedicated servers', about: 'For people who run an Enshrouded dedicated server. Unzip the server pack into the server folder, also over FTP on a rented server. kilnctl and the systemd units are for a server you run yourself.' },
  { id: 'manual', title: 'Manual install', about: 'For installing Kiln by hand, without the launcher. kilnctl, in Dedicated servers, installs this zip for you.' },
  { id: 'authors', title: 'Mod authors', about: 'For people who write mods: the SDK packages, the kiln command line tool, the VS Code extension and sample mods to read and copy.' },
  { id: 'source', title: 'Source and notes', about: 'The source code of this release, its notes, the licences and the checksums.' },
];

// Every file the page knows, in page order within its group. `re` matches the path under the release folder.
// `key` names the entry in files{} (the main files); `main` files must exist. Labels and sentences are plain text.
const CATALOG = [
  { re: /^windows\/kiln-launcher_.+_x64-setup\.exe$/, kind: 'windows', group: 'launcher', key: 'windows', main: 'Windows setup program (windows/kiln-launcher_<version>_x64-setup.exe)',
    label: 'Windows installer', about: 'For Windows 10 and 11. Installs for your user and updates itself.' },
  { re: /^linux\/kiln-launcher_.+_amd64\.AppImage$/, kind: 'appimage', group: 'launcher', key: 'appimage', main: 'Linux AppImage (linux/kiln-launcher_<version>_amd64.AppImage)',
    label: 'Linux AppImage', about: 'One file, no install: make it executable and run it. Updates itself.' },
  { re: /^linux\/kiln-launcher_.+_amd64\.deb$/, kind: 'deb', group: 'launcher', key: 'deb', main: 'Debian package (linux/kiln-launcher_<version>_amd64.deb)',
    label: 'Linux .deb package', about: 'For Debian, Ubuntu and Mint. Update it by installing the next package.' },
  { re: /^linux\/[^/]+\.rpm$/, kind: 'rpm', group: 'launcher', key: 'rpm',
    label: 'Linux .rpm package', about: 'For Fedora and other RPM-based systems.' },

  { re: /^runtime\/kiln-server-.+\.zip$/, kind: 'server', group: 'servers', key: 'server', main: 'server pack (runtime/kiln-server-<version>.zip)',
    label: 'Server pack', about: 'Unzip it into the folder with enshrouded_server.exe. Nothing else to install.' },
  { re: /^runtime\/kilnctl$/, kind: 'kilnctl-linux', group: 'servers',
    label: 'kilnctl for Linux', about: 'Command line that installs the Kiln runtime, runs a server under Wine and backs it up.' },
  { re: /^runtime\/kilnctl\.exe$/, kind: 'kilnctl-windows', group: 'servers',
    label: 'kilnctl for Windows', about: 'Command line that installs the Kiln runtime into a game or server folder.' },
  { re: /^runtime\/kiln@\.service$/, kind: 'systemd-run', group: 'servers',
    label: 'kiln@.service', about: 'systemd user unit that runs one kilnctl server. Put the server name after the @.' },
  { re: /^runtime\/kiln-backup@\.service$/, kind: 'systemd-backup', group: 'servers',
    label: 'kiln-backup@.service', about: 'systemd user unit that backs up the savegame of one kilnctl server.' },
  { re: /^runtime\/kiln-backup@\.timer$/, kind: 'systemd-timer', group: 'servers',
    label: 'kiln-backup@.timer', about: 'Starts that backup every day.' },

  { re: /^runtime\/kiln-runtime-.+\.zip$/, kind: 'runtime', group: 'manual', key: 'runtime', main: 'runtime zip (runtime/kiln-runtime-<version>.zip)',
    label: 'Kiln runtime', about: 'Kiln without the launcher. Install it with kilnctl, or by hand.' },
  { re: /^runtime\/INSTALL-RUNTIME\.txt$/, kind: 'install-runtime', group: 'manual',
    label: 'Install instructions', about: 'Step by step: the runtime on a game client or a server.' },

  { re: /^sdk\/Kiln\.Sdk\.[^/]+\.nupkg$/, kind: 'sdk', group: 'authors',
    label: 'Kiln.Sdk package', about: 'The MSBuild SDK for mod projects.' },
  { re: /^sdk\/Kiln\.Api\.[^/]+\.nupkg$/, kind: 'sdk-api', group: 'authors',
    label: 'Kiln.Api package', about: 'The mod API your code builds against.' },
  { re: /^sdk\/Kiln\.Templates\.[^/]+\.nupkg$/, kind: 'sdk-templates', group: 'authors',
    label: 'Kiln.Templates package', about: 'Project templates for dotnet new kiln-mod.' },
  { re: /^sdk\/kiln$/, kind: 'kiln-linux', group: 'authors',
    label: 'kiln command line tool for Linux', about: 'Make, build, deploy, test and pack mods from the command line.' },
  { re: /^sdk\/kiln\.exe$/, kind: 'kiln-windows', group: 'authors',
    label: 'kiln command line tool for Windows', about: 'Make, build, deploy, test and pack mods from the command line.' },
  { re: /^sdk\/kiln-vscode-[^/]+\.vsix$/, kind: 'vscode', group: 'authors',
    label: 'VS Code extension', about: 'Schemas, lint, game ids, tests, logs and a debugger for mod projects. In VS Code: Extensions, Install from VSIX.' },
  { re: /^samples\/(.+)\.zip$/, kind: 'sample', group: 'authors',
    label: (m) => m[1].replace(/-(\d+\.\d+\.\d+.*)$/, ' $1'), about: '' },

  { re: /^source\/kiln-.+-src\.tar\.gz$/, kind: 'source', group: 'source',
    label: 'Kiln source', about: 'The source code of this release.' },
  { re: /^source\/shroudforge-.+-src\.tar\.gz$/, kind: 'source-shroudforge', group: 'source',
    label: 'ShroudForge source', about: 'Source of the ShroudForge build that comes with Kiln.' },
  { re: /^RELEASE-NOTES\.md$/, kind: 'release-notes', group: 'source',
    label: 'Release notes', about: 'What changed in this version.' },
  { re: /^README\.txt$/, kind: 'readme', group: 'source',
    label: 'Release README', about: 'Which file to pick, and how to check it.' },
  { re: /^LICENSE$/, kind: 'license', group: 'source',
    label: 'Licence', about: 'Kiln is open source under the MIT licence.' },
  { re: /^CREDITS\.md$/, kind: 'credits', group: 'source',
    label: 'Credits', about: 'Whose work Kiln builds on.' },
  { re: /^THIRD-PARTY-NOTICES\.txt$/, kind: 'third-party', group: 'source',
    label: 'Third-party notices', about: 'The licences of the software Kiln includes. A large text file.' },
  { re: /^SHA256SUMS$/, kind: 'sums', group: 'source', key: 'sums',
    label: 'SHA256SUMS', about: 'The SHA-256 of every file in this release.' },
];
// A file the catalog does not know goes to the group of its folder.
const FOLDER_GROUP = { windows: 'launcher', linux: 'launcher', runtime: 'manual', sdk: 'authors', samples: 'authors', source: 'source' };

class Failure extends Error {}

// Every file under the release folder that the site offers, as paths relative to it with "/" separators.
function listFiles(root) {
  const found = [];
  const skipped = [];
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith('.')) continue;
      const path = join(dir, name);
      const entry = lstatSync(path);
      const relative = prefix + name;
      if (entry.isSymbolicLink()) { skipped.push(`${relative} (a symbolic link)`); continue; }
      if (entry.isDirectory()) {
        if (!prefix && EXCLUDED_DIRS.has(name)) continue;
        walk(path, `${relative}/`);
      } else if (entry.isFile()) {
        if (relative.endsWith('.sig')) continue;
        found.push({ path: relative, size: entry.size, mode: entry.mode });
      } else skipped.push(`${relative} (not a regular file)`);
    }
  };
  walk(root, '');
  return { found, skipped };
}

function parseSums(root, warnings) {
  const file = join(root, 'SHA256SUMS');
  const sums = new Map();
  for (const [index, line] of readFileSync(file, 'utf8').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = /^([0-9a-fA-F]{64}) [ *](.+)$/.exec(line);
    if (match) sums.set(match[2].replace(/^\.\//, ''), match[1].toLowerCase());
    else warnings.push(`SHA256SUMS line ${index + 1} is not "<hash>  <path>": ${line.slice(0, 60)}`);
  }
  return sums;
}

function sha256(path) {
  return new Promise((done, fail) => {
    const hash = createHash('sha256');
    createReadStream(path).on('data', (chunk) => hash.update(chunk)).on('error', fail).on('end', () => done(hash.digest('hex')));
  });
}

function releaseDate(root, given, notes) {
  if (given) {
    const date = new Date(`${given}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(given) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== given) {
      throw new Failure(`--released must be a date as YYYY-MM-DD, not "${given}".`);
    }
    return given;
  }
  const readme = join(root, 'README.txt');
  const built = existsSync(readme) && /\bBuilt (\d{4}-\d{2}-\d{2})/.exec(readFileSync(readme, 'utf8'));
  if (built) { notes.push(`released ${built[1]} (the "Built" date in README.txt; pass --released to change it)`); return built[1]; }
  const today = new Date().toISOString().slice(0, 10);
  notes.push(`released ${today} (today, UTC: README.txt has no "Built" date; pass --released)`);
  return today;
}

/** Reads a release folder and returns the data (kilnRelease.json) plus the notes and warnings for the operator. */
export async function buildRelease(folder, { released, verify = false } = {}) {
  const root = resolve(folder);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) throw new Failure(`${root} is not a folder.`);
  const warnings = [];
  const notes = [];
  const { found: files, skipped } = listFiles(root);
  warnings.push(...skipped.map((name) => `Left out ${name}.`));
  if (!files.some((file) => file.path === 'SHA256SUMS')) throw new Failure(`${root} has no SHA256SUMS, which the page links. Nothing was written.`);

  // The main files: each must exist exactly once, and they must all name the same version.
  const missing = [];
  const main = {};
  for (const rule of CATALOG.filter((entry) => entry.main)) {
    const hits = files.filter((file) => rule.re.test(file.path));
    if (hits.length === 0) missing.push(rule.main);
    else if (hits.length > 1) throw new Failure(`More than one ${rule.main.split(' (')[0]} in ${root}: ${hits.map((hit) => hit.path).join(', ')}.`);
    else main[rule.key] = hits[0].path;
  }
  if (missing.length) {
    throw new Failure(`${root} is missing ${missing.length === 1 ? 'a main file' : 'main files'}:\n${missing.map((name) => `  - ${name}`).join('\n')}\nNothing was written. Is this the finished release folder?`);
  }
  const versionOf = {
    windows: /^windows\/kiln-launcher_(.+)_x64-setup\.exe$/, appimage: /^linux\/kiln-launcher_(.+)_amd64\.AppImage$/,
    deb: /^linux\/kiln-launcher_(.+)_amd64\.deb$/, server: /^runtime\/kiln-server-(.+)\.zip$/, runtime: /^runtime\/kiln-runtime-(.+)\.zip$/,
  };
  const versions = Object.entries(versionOf).map(([key, re]) => [key, re.exec(main[key])?.[1]]);
  const unique = [...new Set(versions.map(([, version]) => version))];
  if (unique.length !== 1) throw new Failure(`The main files name different versions (${versions.map(([key, version]) => `${key} ${version}`).join(', ')}). Nothing was written.`);
  const version = unique[0];
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) throw new Failure(`"${version}" (from the file names) is not a version like 0.2.0-dev.22.`);
  const folderVersion = /^kiln-(\d.*)$/.exec(basename(root))?.[1];
  if (folderVersion && folderVersion !== version) throw new Failure(`The folder is named for ${folderVersion} but its files are ${version}. Nothing was written.`);
  const channel = /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version)?.[1] ?? 'stable';

  const rpms = files.map((file) => file.path).filter((path) => /^linux\/[^/]+\.rpm$/.test(path));
  if (rpms.length > 1) warnings.push(`More than one .rpm (${rpms.join(', ')}): the page's main button uses the first.`);

  // Classify every file.
  const sums = parseSums(root, warnings);
  const listed = new Set(files.map((file) => file.path));
  for (const path of sums.keys()) {
    const top = path.split('/')[0];
    if (!listed.has(path) && !EXCLUDED_DIRS.has(top) && !path.endsWith('.sig')) warnings.push(`SHA256SUMS lists ${path}, which is not in the folder.`);
  }
  const entries = [];
  for (const file of files) {
    const index = CATALOG.findIndex((rule) => rule.re.test(file.path));
    const rule = CATALOG[index];
    let group;
    let label;
    let about;
    let kind;
    if (rule) {
      const match = rule.re.exec(file.path);
      ({ group, kind, about } = rule);
      label = typeof rule.label === 'function' ? rule.label(match) : rule.label;
    } else {
      group = FOLDER_GROUP[file.path.split('/')[0]] ?? 'source';
      kind = 'other';
      label = basename(file.path);
      about = '';
      warnings.push(`No label for ${file.path}: listed as "${label}" in the group "${GROUPS.find((entry) => entry.id === group).title}". Teach scripts/kiln-release-data.mjs about it.`);
    }
    if (!(file.mode & 0o004)) warnings.push(`${file.path} is not world-readable (mode ${(file.mode & 0o777).toString(8)}): the web server may refuse it.`);
    entries.push({ order: index === -1 ? CATALOG.length : index, group, file: { kind, path: file.path, label, about, size: file.size } });
  }

  // SHA-256: from SHA256SUMS, else computed.
  let fromSums = 0;
  let computed = 0;
  for (const { file } of entries) {
    const listedHash = sums.get(file.path);
    if (listedHash && !verify) { file.sha256 = listedHash; fromSums += 1; continue; }
    const actual = await sha256(join(root, file.path));
    if (listedHash && listedHash !== actual) throw new Failure(`${file.path} does not match SHA256SUMS (listed ${listedHash}, file ${actual}). Nothing was written.`);
    file.sha256 = actual;
    if (listedHash) fromSums += 1; else computed += 1;
  }
  notes.push(`SHA-256: ${fromSums} from SHA256SUMS${verify ? ' (each recomputed and matching)' : ''}, ${computed} computed`);

  const groups = GROUPS.map((group) => ({
    ...group,
    files: entries.filter((entry) => entry.group === group.id)
      .sort((a, b) => a.order - b.order || (a.file.path < b.file.path ? -1 : 1))
      .map((entry) => {
        const { about, ...rest } = entry.file;
        // The key order of a file in the JSON: kind, path, label, about (when it has one), size, sha256.
        const { kind, path, label, size, sha256: hash } = rest;
        return { kind, path, label, ...(about ? { about } : {}), size, sha256: hash };
      }),
  })).filter((group) => group.files.length);

  const data = {
    version,
    channel,
    released: releaseDate(root, released, notes),
    files: {
      windows: main.windows,
      appimage: main.appimage,
      deb: main.deb,
      ...(rpms.length ? { rpm: rpms[0] } : {}),
      server: main.server,
      runtime: main.runtime,
      sums: 'SHA256SUMS',
    },
    github: `${GITHUB_RELEASES}v${version}`,
    nexus: NEXUS_PAGE,
    groups,
  };
  return { data, notes, warnings, count: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.file.size, 0) };
}

/** The JSON text: readable top part, one line per file. */
export function serialize(data) {
  const { groups, ...head } = data;
  const top = JSON.stringify(head, null, 2).replace(/\n}$/, '');
  const body = groups.map((group) => {
    const { files, ...meta } = group;
    const metaText = Object.entries(meta).map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join('\n');
    return `    {\n${metaText}\n      "files": [\n${files.map((file) => `        ${JSON.stringify(file)}`).join(',\n')}\n      ]\n    }`;
  });
  return `${top},\n  "groups": [\n${body.join(',\n')}\n  ]\n}\n`;
}

function usage() {
  return 'Usage: node scripts/kiln-release-data.mjs <release folder> [--released YYYY-MM-DD] [--out <file>] [--verify]';
}

async function main(argv) {
  const args = [];
  const options = { verify: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--verify') options.verify = true;
    else if (arg === '--released' || arg === '--out') {
      if (i + 1 >= argv.length) throw new Failure(`${arg} needs a value.\n${usage()}`);
      options[arg.slice(2)] = argv[++i];
    } else if (arg.startsWith('--')) throw new Failure(`Unknown option ${arg}.\n${usage()}`);
    else args.push(arg);
  }
  if (args.length !== 1) throw new Failure(usage());
  const out = options.out ? resolve(options.out) : fileURLToPath(new URL('../src/data/kilnRelease.json', import.meta.url));
  const result = await buildRelease(args[0], options);
  writeFileSync(out, serialize(result.data));
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  console.log(`Kiln ${result.data.version} (${result.data.channel}): ${result.count} files, ${(result.bytes / 1048576).toFixed(0)} MB, in ${result.data.groups.length} groups`);
  for (const note of result.notes) console.log(`  ${note}`);
  console.log(`Wrote ${out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Failure ? `kiln-release-data: ${error.message}` : error);
    process.exit(1);
  });
}
