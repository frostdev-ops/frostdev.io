import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./kiln-release-data.mjs', import.meta.url));
const committed = JSON.parse(readFileSync(new URL('../src/data/kilnRelease.json', import.meta.url), 'utf8'));
const sha = (text) => createHash('sha256').update(text).digest('hex');
const temporary = [];
process.on('exit', () => { for (const dir of temporary) rmSync(dir, { recursive: true, force: true }); });

// A small release folder with the layout of Kiln's real one: every main file, a few others, and the folders and
// signatures the site never serves.
function makeRelease({ version = '0.2.0-dev.22', skip = [], extra = [], readme = 'Kiln 0.2.0-dev.22\n\nBuilt 2026-11-10 from commit abc1234.\n', fakeHash = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'kiln-release-test-'));
  temporary.push(root);
  const folder = join(root, `kiln-${version}`);
  const files = {
    [`windows/kiln-launcher_${version}_x64-setup.exe`]: 'setup',
    [`windows/kiln-launcher_${version}_x64-setup.exe.sig`]: 'signature',
    [`linux/kiln-launcher_${version}_amd64.AppImage`]: 'appimage',
    [`linux/kiln-launcher_${version}_amd64.AppImage.sig`]: 'signature',
    [`linux/kiln-launcher_${version}_amd64.deb`]: 'deb',
    [`runtime/kiln-runtime-${version}.zip`]: 'runtime',
    [`runtime/kiln-server-${version}.zip`]: 'server',
    'runtime/kilnctl': 'ctl',
    'runtime/kiln@.service': 'unit',
    'sdk/kiln-vscode-0.1.0.vsix': 'vsix',
    'samples/hello-0.1.0.zip': 'hello',
    'samples/quests-sample-2.0.0.zip': 'quests',
    'source/kiln-src.tar.gz': 'source',
    'RELEASE-NOTES.md': 'notes',
    'README.txt': readme,
    nexus: null,
    'nexus/linux/kiln-launcher.AppImage': 'nexus build',
    'updates/frostdev.io/dev/latest.json': '{}',
  };
  for (const path of skip) delete files[path];
  for (const path of extra) files[path] = `content of ${path}`;
  const listed = [];
  for (const [path, content] of Object.entries(files)) {
    if (content === null) continue;
    const file = join(folder, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    if (!path.endsWith('.sig') && path !== 'runtime/kilnctl') listed.push(`${fakeHash[path] ?? sha(content)}  ${path}`);
  }
  // SHA256SUMS lists everything but itself, runtime/kilnctl (so the script has to compute that one) and the .sig files.
  writeFileSync(join(folder, 'SHA256SUMS'), `${listed.join('\n')}\n`);
  return folder;
}

function run(folder, ...args) {
  const out = join(dirname(folder), 'out.json');
  rmSync(out, { force: true });
  const result = spawnSync(process.execPath, [script, folder, '--out', out, ...args], { encoding: 'utf8' });
  return { ...result, out, data: existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : undefined };
}
const paths = (data) => data.groups.flatMap((group) => group.files.map((file) => file.path));
const find = (data, path) => data.groups.flatMap((group) => group.files).find((file) => file.path === path);

test('a release folder gives the fields /kiln reads, the file list, sizes and hashes', () => {
  const folder = makeRelease();
  const { status, data, stderr } = run(folder);
  assert.equal(status, 0, stderr);
  assert.equal(data.version, '0.2.0-dev.22');
  assert.equal(data.channel, 'dev');
  assert.equal(data.released, '2026-11-10');
  assert.deepEqual(data.files, {
    windows: 'windows/kiln-launcher_0.2.0-dev.22_x64-setup.exe',
    appimage: 'linux/kiln-launcher_0.2.0-dev.22_amd64.AppImage',
    deb: 'linux/kiln-launcher_0.2.0-dev.22_amd64.deb',
    server: 'runtime/kiln-server-0.2.0-dev.22.zip',
    runtime: 'runtime/kiln-runtime-0.2.0-dev.22.zip',
    sums: 'SHA256SUMS',
  });
  assert.equal(data.github, 'https://github.com/frostdev-ops/kiln/releases/tag/v0.2.0-dev.22');
  assert.equal(data.nexus, 'https://www.nexusmods.com/enshrouded/mods/301');
  assert.deepEqual(data.groups.map((group) => group.id), ['launcher', 'servers', 'manual', 'authors', 'source']);
  const setup = find(data, data.files.windows);
  assert.deepEqual([setup.kind, setup.size, setup.sha256], ['windows', 5, sha('setup')]);
  assert.equal(find(data, 'samples/quests-sample-2.0.0.zip').label, 'quests-sample 2.0.0');
  assert.equal(find(data, 'SHA256SUMS').sha256, sha(readFileSync(join(folder, 'SHA256SUMS'))), 'a file SHA256SUMS does not list is computed');
  assert.equal(find(data, 'runtime/kilnctl').sha256, sha('ctl'));
});

test('nexus/, updates/ and the .sig signatures are left out, and no .rpm is invented', () => {
  const { data } = run(makeRelease());
  assert.deepEqual(paths(data).filter((path) => /^(nexus|updates)\/|\.sig$/.test(path)), []);
  assert.equal(paths(data).length, 14);
  assert.equal('rpm' in data.files, false);
  assert.equal(paths(data).some((path) => path.endsWith('.rpm')), false);
});

test('an .rpm in the folder is listed and named in files.rpm', () => {
  const { data } = run(makeRelease({ extra: ['linux/kiln-launcher-0.2.0.dev.22-1.x86_64.rpm'] }));
  assert.equal(data.files.rpm, 'linux/kiln-launcher-0.2.0.dev.22-1.x86_64.rpm');
  assert.equal(find(data, data.files.rpm).kind, 'rpm');
});

test('the hash comes from SHA256SUMS when the file is listed, and --verify catches a wrong one', () => {
  const wrong = 'f'.repeat(64);
  const path = 'RELEASE-NOTES.md';
  const folder = makeRelease({ fakeHash: { [path]: wrong } });
  assert.equal(find(run(folder).data, path).sha256, wrong);
  const verified = run(folder, '--verify');
  assert.notEqual(verified.status, 0);
  assert.match(verified.stderr, /RELEASE-NOTES\.md does not match SHA256SUMS/);
  assert.equal(verified.data, undefined, 'nothing is written');
  assert.equal(run(makeRelease(), '--verify').status, 0);
});

test('a missing main file fails with a clear message and writes nothing', () => {
  const folder = makeRelease({ skip: ['linux/kiln-launcher_0.2.0-dev.22_amd64.deb', 'runtime/kiln-server-0.2.0-dev.22.zip'] });
  const { status, stderr, data } = run(folder);
  assert.notEqual(status, 0);
  assert.match(stderr, /missing main files/);
  assert.match(stderr, /Debian package \(linux\/kiln-launcher_<version>_amd64\.deb\)/);
  assert.match(stderr, /server pack \(runtime\/kiln-server-<version>\.zip\)/);
  assert.doesNotMatch(stderr, /Windows setup/);
  assert.equal(data, undefined);
});

test('main files that name different versions fail', () => {
  const folder = makeRelease({ extra: [] });
  writeFileSync(join(folder, 'runtime/kiln-runtime-0.2.0-dev.21.zip'), 'old');
  rmSync(join(folder, 'runtime/kiln-runtime-0.2.0-dev.22.zip'));
  const { status, stderr } = run(folder);
  assert.notEqual(status, 0);
  assert.match(stderr, /different versions/);
});

test('a file the script does not know is listed under its own name with a warning', () => {
  const { data, stderr } = run(makeRelease({ extra: ['sdk/helper-1.0.tgz'] }));
  const file = find(data, 'sdk/helper-1.0.tgz');
  assert.equal(file.label, 'helper-1.0.tgz');
  assert.equal(data.groups.find((group) => group.files.includes(file)).id, 'authors');
  assert.match(stderr, /No label for sdk\/helper-1\.0\.tgz/);
});

test('a file the web server could not read is reported', () => {
  const folder = makeRelease();
  chmodSync(join(folder, 'source/kiln-src.tar.gz'), 0o600);
  assert.match(run(folder).stderr, /source\/kiln-src\.tar\.gz is not world-readable/);
});

test('--released wins, then the README date; a bad date fails', () => {
  assert.equal(run(makeRelease(), '--released', '2026-12-01').data.released, '2026-12-01');
  assert.equal(run(makeRelease({ readme: 'Kiln\nBuilt 2026-11-12 from commit abc.\n' })).data.released, '2026-11-12');
  const bad = run(makeRelease(), '--released', '2026-13-40');
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /--released must be a date/);
});

test('the committed kilnRelease.json is complete and consistent', () => {
  const all = paths(committed);
  assert.equal(new Set(all).size, all.length, 'a path is listed twice');
  for (const key of ['windows', 'appimage', 'deb', 'server', 'runtime', 'sums']) assert(all.includes(committed.files[key]), `files.${key} is in no group`);
  if (committed.files.rpm) assert(all.includes(committed.files.rpm));
  assert(all.includes(committed.files.windows) && committed.files.windows.includes(committed.version));
  assert.deepEqual(all.filter((path) => /^(nexus|updates)\/|\.sig$/.test(path)), []);
  assert(committed.github.endsWith(`/v${committed.version}`));
  for (const file of committed.groups.flatMap((group) => group.files)) {
    assert(file.label, file.path);
    // Sizes and hashes come from the real run; until then neither is there, and never only one of them.
    assert.equal(file.size === undefined, file.sha256 === undefined, file.path);
    if (file.sha256) assert.match(file.sha256, /^[0-9a-f]{64}$/);
  }
});
