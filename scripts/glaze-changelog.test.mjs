import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { changes, summary } from './glaze-changelog.mjs';

const LOG = `# Changelog

## [Unreleased]

- Not yet.

## [2.0.0] — 2026-01-02

### Added

- A **bold** thing with \`code\` and a [link](https://example.com/a).
- A second thing
  that wraps.

### Fixed

* One fix.

### Removed

## [1.0.0] — 2025-01-01

- First release.
`;

test('a version\'s groups come in the file\'s order, each item one line of text', () => {
  assert.deepEqual(changes(LOG, '2.0.0'), [
    { type: 'Added', items: ['A bold thing with `code` and a link.', 'A second thing that wraps.'] },
    { type: 'Fixed', items: ['One fix.'] },
  ]);
});

test('items with no heading are changes, and a missing version stops the release', () => {
  assert.deepEqual(changes(LOG, '1.0.0'), [{ type: 'Changed', items: ['First release.'] }]);
  assert.throws(() => changes(LOG, '3.0.0'), /changelog entry/);
});

test('the summary is the items as one paragraph, without code marks', () => {
  assert.equal(summary(changes(LOG, '2.0.0')), 'A bold thing with code and a link. A second thing that wraps. One fix.');
});

test('the published release data holds its version\'s groups', () => {
  const data = JSON.parse(readFileSync('src/data/glazeRelease.json', 'utf8'));
  assert.ok(data.changes.length && data.changes.every((group) => group.type && group.items.length && group.items.every((item) => typeof item === 'string' && item)));
  assert.equal(data.summary, summary(data.changes));
});
