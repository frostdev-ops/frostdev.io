import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableFilms, filmFiles, films, orderFilms } from '../src/data/glazeFilms.ts';

const pending = films.find((film) => film.file === 'due-at-midnight');
const delivered = new Set(films.filter((film) => film !== pending).flatMap(filmFiles));

test('the pending film stays hidden until every player asset arrives', async (t) => {
  for (const missing of filmFiles(pending)) {
    await t.test(missing, () => {
      const files = new Set([...delivered, ...filmFiles(pending)]);
      files.delete(missing);
      assert.ok(!availableFilms((file) => files.has(file)).includes(pending));
    });
  }
});

test('a complete delivery appears once and leads the Halloween order', () => {
  const files = new Set([...delivered, ...filmFiles(pending)]);
  const available = availableFilms((file) => files.has(file));
  const ordered = orderFilms(available, true);
  assert.equal(ordered.filter((film) => film === pending).length, 1);
  assert.deepEqual(ordered.slice(0, 3).map((film) => film.file), [
    'due-at-midnight', 'night-of-the-living-deadlines', 'the-haunting-of-canvas',
  ]);
  assert.deepEqual(orderFilms(available), available);
  assert.deepEqual(available, films);
});

test('4K films require their 4K file; 1080p films need no 4K file', () => {
  const files = new Set(delivered);
  files.delete('glaze-2160p.mp4');
  const available = availableFilms((file) => files.has(file));
  assert.ok(!available.some((film) => film.file === 'glaze'));
  assert.ok(available.some((film) => film.file === 'glaze-now-on-canvas'));
});

test('missing assets and an empty film list are safe', () => {
  assert.deepEqual(availableFilms(() => false), []);
  assert.deepEqual(orderFilms([], true), []);
});
