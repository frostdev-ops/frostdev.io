import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const rules = [...robots.matchAll(/^(Allow|Disallow):\s*(\S+)\s*$/gm)]
  .map(([, directive, pattern]) => ({ directive, pattern }));
const pages = ['/glaze/looks', '/glaze/mods', '/glaze/privacy', '/glaze/terms'];

// This site's single wildcard-user-agent group uses literal prefixes and terminal
// $, not wildcard paths. Longest matching rule wins; Allow wins equal-length ties.
function crawlable(path) {
  const matches = rules.filter(({ pattern }) => pattern.endsWith('$')
    ? path === pattern.slice(0, -1)
    : path.startsWith(pattern));
  matches.sort((a, b) => b.pattern.replace(/\$$/, '').length - a.pattern.replace(/\$$/, '').length
    || Number(b.directive === 'Allow') - Number(a.directive === 'Allow'));
  return matches.length === 0 || matches[0].directive === 'Allow';
}

test('robots syntax stays within the matcher contract and defaults to disallow', () => {
  assert.deepEqual([...robots.matchAll(/^User-agent:\s*(.+)$/gm)].map((m) => m[1]), ['*']);
  assert(rules.length > 0);
  assert(rules.every(({ pattern }) => !pattern.includes('*') && !pattern.slice(0, -1).includes('$')));
  assert(rules.some(({ directive, pattern }) => directive === 'Disallow' && pattern === '/'));
});

test('Glaze allowances are exact, with optional trailing slash only', () => {
  const actual = rules.filter(({ directive, pattern }) => directive === 'Allow' && pattern.startsWith('/glaze'))
    .map(({ pattern }) => pattern).sort();
  const expected = ['/glaze', ...pages].flatMap((path) => [path + '$', path + '/$']).sort();
  assert.deepEqual(actual, expected);
  for (const path of ['/glaze', ...pages]) {
    assert(crawlable(path), path);
    assert(crawlable(path + '/'), path + '/');
    for (const suffix of ['/child', '/child/', '-other', '?preview=1']) {
      assert.equal(crawlable(path + suffix), false, path + suffix);
    }
  }
});

test('every sitemap URL is crawlable, including all four Glaze pages', () => {
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  for (const path of pages) assert(paths.includes(path), `Missing sitemap page: ${path}`);
  for (const path of paths) assert(crawlable(path), `Sitemap URL blocked: ${path}`);
});

test('admin, APIs, submission pages and application routes remain blocked', () => {
  const blocked = ['/glaze/admin', '/glaze/admin/api', '/glaze/admin/oauth/callback',
    '/glaze/looks/submit', '/glaze/mods/submit', '/glaze/looks/api', '/glaze/looks/api/submit',
    '/glaze/mods/api', '/glaze/mods/api/mods', '/glaze/mods/api/blocklist',
    '/glaze/mods/api/submit', '/api', '/login', '/dashboard', '/unknown'];
  for (const path of blocked) {
    for (const suffix of ['', '/', '?preview=1']) {
      assert.equal(crawlable(path + suffix), false, path + suffix);
    }
  }
});
