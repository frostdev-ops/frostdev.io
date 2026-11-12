import assert from 'node:assert/strict';
import { test } from 'node:test';
import { availableFilms, filmFiles, films } from '../src/data/glazeFilms.ts';

const pending = films.at(-1);
const delivered = new Set(films.filter((film) => film !== pending).flatMap(filmFiles));

test('a film stays hidden until every player asset arrives', async (t) => {
  for (const missing of filmFiles(pending)) {
    await t.test(missing, () => {
      const files = new Set([...delivered, ...filmFiles(pending)]);
      files.delete(missing);
      assert.ok(!availableFilms((file) => files.has(file)).includes(pending));
    });
  }
});

test('a complete delivery lists every film once, in the data\'s order', () => {
  const files = new Set([...delivered, ...filmFiles(pending)]);
  assert.deepEqual(availableFilms((file) => files.has(file)), films);
});

test('4K films require their 4K file; 1080p films need no 4K file', () => {
  const files = new Set(films.flatMap(filmFiles));
  files.delete('glaze-2160p.mp4');
  const available = availableFilms((file) => files.has(file));
  assert.ok(!available.some((film) => film.file === 'glaze'));
  assert.ok(available.some((film) => film.file === 'glaze-now-on-canvas'));
});

test('missing assets are safe', () => {
  assert.deepEqual(availableFilms(() => false), []);
});
