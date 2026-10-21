// Called by Glaze's release operator in an isolated, committed website clone.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const [mode, ...values] = process.argv.slice(2);
const verifyOnly = mode === '--verify';
const [version, sourceArg, feedArg] = verifyOnly ? values : [mode, ...values];
if (!/^\d+\.\d+\.\d+$/.test(version || '') || !sourceArg || !feedArg) throw new Error('Usage: node scripts/prepare-glaze-release.mjs [--verify] <version> <Glaze source checkout> <signed appcast>');
const source = path.resolve(sourceArg), feed = path.resolve(feedArg);
const exec = (bin, args, cwd = root) => execFileSync(bin, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const metadata = path.join(root, 'src/data/glazeRelease.json');
if (JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'))).version !== version) throw new Error('Glaze source version differs from the release.');
const commit = exec('git', ['rev-parse', 'HEAD'], source);
const remote = exec('git', ['ls-remote', 'https://github.com/frostdev-ops/glaze.git', `refs/tags/v${version}`, `refs/tags/v${version}^{}`]).split('\n').filter(Boolean).map(line => line.split(/\s+/));
if ((remote.find(row => row[1].endsWith('^{}')) || remote[0])?.[0] !== commit) throw new Error('Website source must be the pushed, immutable Glaze release tag.');
const first = JSON.parse(exec('python3', ['-c', `import json,sys,xml.etree.ElementTree as E
e=E.parse(sys.argv[1]).find('./channel/item/enclosure'); assert e is not None
print(json.dumps({'version':e.get('{http://www.andymatuschak.org/xml-namespaces/sparkle}version'),'signature':e.get('{http://www.andymatuschak.org/xml-namespaces/sparkle}edSignature'),'url':e.get('url')}))`, feed]));
if (first.version !== version || !first.signature || first.url !== `https://github.com/frostdev-ops/glaze/releases/download/v${version}/glaze-${version}-safari-macos.dmg`) throw new Error('The signed appcast does not identify the release DMG.');
if (!verifyOnly) {
  const old = JSON.parse(fs.readFileSync(metadata));
  const parts = value => value.split('.').map(Number);
  const a = parts(old.version), b = parts(version);
  const different = a.findIndex((value, i) => value !== b[i]);
  if (different >= 0 && a[different] > b[different]) throw new Error('Refusing to roll the website back to an older Glaze release.');
  const changelog = fs.readFileSync(path.join(source, 'CHANGELOG.md'), 'utf8');
  const start = changelog.indexOf(`## [${version}]`);
  if (start < 0) throw new Error('The release needs a changelog entry.');
  const summary = changelog.slice(start).split('\n').slice(1).join('\n').split(/^## /m)[0]
    .replace(/^#+.*$/gm, '').replace(/^\s*[-*]\s+/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
  if (!summary) throw new Error('The release needs nonempty notes.');
  exec('sh', ['scripts/vendor-glaze.sh', `v${version}`]);
  const wiki = fs.mkdtempSync(path.join(os.tmpdir(), 'glaze-wiki-mirror-'));
  try { exec('node', [path.join(source, 'scripts/docs-mirror.js'), wiki, root], source); }
  finally { fs.rmSync(wiki, { recursive: true, force: true }); }
  fs.copyFileSync(feed, path.join(root, 'public/projects/glaze/appcast.xml'));
  fs.writeFileSync(metadata, JSON.stringify({ version, sourceCommit: commit, updated: exec('git', ['show', '-s', '--format=%cs', 'HEAD'], source), summary }, null, 2) + '\n');
  console.log(`Prepared Glaze ${version} website metadata, both vendors, eight mirrored docs and exact signed feed.`);
} else {
  if (JSON.parse(fs.readFileSync(metadata)).version !== version) throw new Error('Website release metadata is stale.');
  for (const vendor of ['glaze', 'glaze-scene']) {
    if (fs.readFileSync(path.join(root, 'vendor', vendor, 'VERSION'), 'utf8').trim() !== `v${version}`) throw new Error('Vendored Glaze version is stale.');
  }
  for (const route of ['glaze', 'guides/glaze-chrome', 'guides/glaze-safari']) {
    const html = fs.readFileSync(path.join(root, 'dist', route, 'index.html'), 'utf8');
    if (!html.includes(`Glaze ${version}`) && !html.includes(`packages ${version}`)) throw new Error(`Missing release version in ${route}`);
    const links = [...html.matchAll(/https:\/\/github.com\/frostdev-ops\/glaze\/releases\/(?:download|tag)\/v([\d.]+)/g)];
    if (!links.length || links.some(link => link[1] !== version)) throw new Error(`Stale release links in ${route}`);
  }
  const landing = fs.readFileSync(path.join(root, 'dist/glaze/index.html'), 'utf8');
  for (const file of [`glaze-${version}-safari-macos.dmg`, `glaze-${version}-safari-macos.zip`, `glaze-v${version}.zip`, `glaze-v${version}-firefox.zip`]) {
    if (!landing.includes(`/releases/download/v${version}/${file}`)) throw new Error(`Missing public download: ${file}`);
  }
  if (!fs.readFileSync(path.join(root, 'dist/projects/glaze/appcast.xml')).equals(fs.readFileSync(feed))) throw new Error('Built update feed differs from the signed source.');
  console.log(`Verified built Glaze ${version} titles, all four download links, vendors and exact signed feed.`);
}
