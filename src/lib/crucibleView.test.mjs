// node --test src/lib/crucibleView.test.mjs (npm run test:crucible)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checksView, countLine, describeFilters, emptyBrowse, kindLabel, narrowed } from './crucibleView.ts';

test('checks: still running never reads as passed', () => {
  for (const state of ['waiting', 'queued', 'running']) {
    const v = checksView({ state, full: false, errors: [], warnings: [], notes: [] });
    assert.equal(v.tone, 'wait', state);
    assert.doesNotMatch(v.title, /passed/i);
  }
});

test('checks: a run that failed says so', () => {
  const v = checksView({ state: 'failed', errors: [], warnings: [], notes: [] });
  assert.equal(v.tone, 'warn');
  assert.match(v.title, /couldn't run/);
});

test('checks: warnings are shown, problems first', () => {
  const v = checksView({ state: 'done', full: true, errors: [], warnings: ['ships native code'], notes: ['a note'] });
  assert.equal(v.tone, 'warn');
  assert.equal(v.title, 'Checks passed with 1 warning');
  assert.deepEqual(v.items.map((i) => i.level), ['warning', 'note']);
  const bad = checksView({ state: 'done', full: true, errors: ['blocked file', 'another'], warnings: ['w'], notes: [] });
  assert.equal(bad.tone, 'bad');
  assert.equal(bad.title, 'Checks found 2 problems');
  assert.deepEqual(bad.items.map((i) => i.level), ['problem', 'problem', 'warning']);
  assert.match(bad.foot, /every file/);
});

test('checks: problems found by the quick checks show even while the full run waits', () => {
  const v = checksView({ state: 'queued', errors: ['a file is too big'], warnings: [], notes: [] });
  assert.equal(v.tone, 'bad');
});

test('checks: passed, notes, nothing yet', () => {
  assert.equal(checksView({ state: 'done', full: true }).title, 'Checks passed');
  assert.equal(checksView({ state: 'off', errors: [], warnings: [], notes: [] }).tone, 'ok');
  assert.equal(checksView({ state: 'done', notes: ['n1', 'n2'] }).title, 'Checks passed with 2 notes');
  assert.equal(checksView(null).tone, 'none');
});

test('filters are described in plain words', () => {
  assert.equal(describeFilters({ q: 'frost' }), 'matching “frost”');
  assert.equal(describeFilters({ tags: 'hardcore,adventure', side: 'client', mods: 'lt10' }), 'tagged hardcore, adventure, for your game, with fewer than 10 mods');
  assert.equal(describeFilters({ side: 'server', server: '1', mods: '30+', build: '26430253' }), 'for game build 26430253, for a dedicated server, with a server pack, with more than 30 mods');
  assert.equal(describeFilters({ sort: 'new' }), '');
});

test('the count line', () => {
  assert.equal(countLine(1, false, { q: 'albaneve' }), '1 pack matching “albaneve”');
  assert.equal(countLine(20, true, {}), '20+ packs');
  assert.equal(countLine(1, true, {}), '1+ packs');
  assert.equal(countLine(0, false, {}), 'No packs found.');
});

test('empty list: nothing public yet vs nothing matches (the sort alone is not a filter)', () => {
  assert.equal(emptyBrowse({}).kind, 'none');
  assert.equal(emptyBrowse({ sort: 'new' }).kind, 'none');
  assert.equal(emptyBrowse({ q: 'x' }).kind, 'nomatch');
  assert.equal(emptyBrowse({ server: '1' }).kind, 'nomatch');
  assert.equal(narrowed({ sort: 'installs' }), false);
});

test('mod kinds read like the launcher', () => {
  assert.equal(kindLabel('eml'), 'EML mod');
  assert.equal(kindLabel('kiln'), 'Kiln mod');
  assert.equal(kindLabel('shroudforge'), 'ShroudForge mod');
  assert.equal(kindLabel('something-new'), 'Mod');
  assert.equal(kindLabel(null), 'Mod');
});
