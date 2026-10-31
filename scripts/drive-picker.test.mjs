// Glaze's Drive picker page (public/glaze/drive-picker/picker.js), run in a VM with a stand-in page: which return addresses
// it accepts. Only a browser extension's own: Chromium's, Firefox's, and Safari's return page at its exact Glaze path.
// node --test scripts/drive-picker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../public/glaze/drive-picker/picker.js', import.meta.url), 'utf8');
const UUID = '6F1C2A3B-4D5E-4F60-8A7B-9C0D1E2F3A4B';
// The page as Glaze opens it with this return address. → { loads: whether it goes on to Google's Picker, status, left }
const open = (back, extra = {}) => {
  const params = new URLSearchParams({ access_token: 'ya29.token', state: 's'.repeat(43), redirect_uri: back, key: 'AIzaKey1234567', app_id: '1071735898350', ...extra });
  const appended = [], status = { textContent: '' }, left = [];
  const location = { hash: `#${params}`, pathname: '/glaze/drive-picker/', origin: 'https://frostdev.io', replace: (u) => left.push(u) };
  vm.runInNewContext(src, {
    location, URLSearchParams, navigator: { language: 'en-US' },
    history: { replaceState: () => { location.hash = ''; } },
    document: { getElementById: () => status, createElement: () => ({}), head: { append: (e) => appended.push(e) } },
  });
  return { loads: appended.length === 1, status: status.textContent, left, hash: location.hash };
};

test('Chromium\'s and Firefox\'s extension redirects still go on to the Picker', () => {
  assert.equal(open(`https://${'a'.repeat(32)}.chromiumapp.org/`).loads, true);
  assert.equal(open(`https://${'0'.repeat(40)}.extensions.allizom.org/`).loads, true);
});

test('Safari\'s return page goes on to the Picker: safari-web-extension://<any UUID>/documents/picked.html', () => {
  assert.equal(open(`safari-web-extension://${UUID}/documents/picked.html`).loads, true);
  assert.equal(open(`safari-web-extension://${UUID.toLowerCase()}/documents/picked.html`).loads, true);
  assert.equal(open(`safari-web-extension://${UUID}/documents/picked.html`).hash, '', 'the token leaves the address at once');
});

test('any other Safari address, or anything else, stops at "Open Google Drive from Glaze."', () => {
  for (const back of [
    `safari-web-extension://${UUID}/documents/other.html`, `safari-web-extension://${UUID}/documents/picked.html?x=1`,
    `safari-web-extension://${UUID}/documents/picked.html#x`, `safari-web-extension://${UUID}/`, `safari-web-extension://${UUID}/picked.html`,
    `safari-web-extension://not-a-uuid/documents/picked.html`, `safari-web-extension://${UUID}0/documents/picked.html`,
    `safari-web-extension://${UUID}/documents/picked.html/`, `safari-web-extension://${UUID}/documents/../documents/picked.html`,
    `https://${UUID}/documents/picked.html`, `moz-extension://${UUID}/documents/picked.html`, `chrome-extension://${'a'.repeat(32)}/documents/picked.html`,
    'https://evil.example/', `SAFARI-WEB-EXTENSION://${UUID}/documents/picked.html`,
  ]) {
    const r = open(back);
    assert.deepEqual([r.loads, r.status], [false, 'Open Google Drive from Glaze.'], back);
  }
  assert.equal(open(`safari-web-extension://${UUID}/documents/picked.html`, { state: 'short' }).loads, false, 'the other checks still hold');
});
