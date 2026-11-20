// node --test src/lib/crucibleResume.test.mjs (npm run test:crucible)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crucibleCode, crucibleFileName, crucibleLink } from './crucibleResume.ts';

test('codes: any case, with or without the dash; look-alikes refused', () => {
  assert.equal(crucibleCode('h7qk-3mzp'), 'H7QK3MZP');
  assert.equal(crucibleCode('H7QK3MZP'), 'H7QK3MZP');
  assert.equal(crucibleCode(' H7QK 3MZP '), 'H7QK3MZP');
  for (const bad of ['', 'H7QK-3MZ', 'H7QK-3MZPX', 'O7QK-3MZP', 'I7QK-3MZP', 'L7QK-3MZP', '07QK-3MZP', '17QK-3MZP', 'H7QK/3MZP', '../../x', null, undefined]) assert.equal(crucibleCode(bad), null, String(bad));
});

test('the pack link the launcher reads from the clipboard', () => {
  assert.equal(crucibleLink('H7QK3MZP'), 'https://frostdev.io/kiln/crucible/p/H7QK-3MZP');
  assert.equal(crucibleLink('H7QK3MZP', 'http://localhost:18792'), 'http://localhost:18792/kiln/crucible/p/H7QK-3MZP');
});

test('installer and AppImage names carry the code; other files keep theirs', () => {
  assert.equal(crucibleFileName('kiln-launcher_0.2.0-dev.29.22_x64-setup.exe', 'windows', 'h7qk-3mzp'), 'kiln-launcher_0.2.0-dev.29.22_x64-setup.crucible-H7QK3MZP.exe');
  assert.equal(crucibleFileName('Kiln Launcher_0.2.0_x64-setup.exe', 'windows', 'H7QK3MZP'), 'Kiln Launcher_0.2.0_x64-setup.crucible-H7QK3MZP.exe');
  assert.equal(crucibleFileName('kiln-launcher_0.2.0-dev.29.22_amd64.AppImage', 'appimage', 'H7QK3MZP'), 'kiln-launcher_0.2.0-dev.29.22_amd64.crucible-H7QK3MZP.AppImage');
  assert.equal(crucibleFileName('kiln-launcher_0.2.0_amd64.deb', 'deb', 'H7QK3MZP'), null);
  assert.equal(crucibleFileName('kiln-launcher.exe', 'windows', 'bad'), null);
  assert.equal(crucibleFileName('.exe', 'windows', 'H7QK3MZP'), null);
});
