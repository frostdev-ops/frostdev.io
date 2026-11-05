// Kiln's agent skill as files: the mirror in src/content/kiln-skill/kiln-modding/ (scripts/mirror-kiln-skill.sh),
// in the page's order. Used by /kiln/agents, the raw files under /kiln/agents/kiln-modding/ and the zip.
import { kilnSkillFiles, kilnSkillUpdated } from '../data/kiln';

const raw = import.meta.glob<string>('../content/kiln-skill/kiln-modding/**/*.md', { query: '?raw', import: 'default', eager: true });
const byPath = new Map(Object.entries(raw).map(([file, text]) => [file.replace(/^.*\/kiln-modding\//, ''), text]));
for (const { path } of kilnSkillFiles) if (!byPath.has(path)) throw new Error(`Kiln skill: ${path} is not in src/content/kiln-skill/kiln-modding/`);
for (const path of byPath.keys()) if (!kilnSkillFiles.some((file) => file.path === path)) throw new Error(`Kiln skill: ${path} is not listed in src/data/kiln.ts`);

export const skillFiles = kilnSkillFiles.map((file) => ({ ...file, text: byPath.get(file.path)! }));
export const skillName = 'kiln-modding';
export const skillDescription = /^description:\s*(.+)$/m.exec(byPath.get('SKILL.md')!)?.[1] ?? '';

// A stored (uncompressed) zip: small, dependency-free and byte-for-byte reproducible.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function skillZip(): Uint8Array<ArrayBuffer> {
  const [year, month, day] = kilnSkillUpdated.split('-').map(Number);
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  const dosTime = 12 << 11;
  const encoder = new TextEncoder();
  const entries = [`${skillName}/`, ...skillFiles.map((file) => file.path).filter((path) => path.includes('/')).map((path) => `${skillName}/${path.replace(/\/[^/]+$/, '/')}`)]
    .filter((dir, i, all) => all.indexOf(dir) === i)
    .map((dir) => ({ name: encoder.encode(dir), data: new Uint8Array(0) }))
    .concat(skillFiles.map((file) => ({ name: encoder.encode(`${skillName}/${file.path}`), data: encoder.encode(file.text) })));
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const crc = crc32(data);
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 10, true);           // version needed: 1.0
    header.setUint16(6, 0x0800, true);       // UTF-8 names
    header.setUint16(8, 0, true);            // stored
    header.setUint16(10, dosTime, true);
    header.setUint16(12, dosDate, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, name.length, true);
    local.push(new Uint8Array(header.buffer), name, data);
    const record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, 0x02014b50, true);
    record.setUint16(4, 0x031e, true);       // made by: Unix, 3.0
    record.setUint16(6, 10, true);
    record.setUint16(8, 0x0800, true);
    record.setUint16(10, 0, true);
    record.setUint16(12, dosTime, true);
    record.setUint16(14, dosDate, true);
    record.setUint32(16, crc, true);
    record.setUint32(20, data.length, true);
    record.setUint32(24, data.length, true);
    record.setUint16(28, name.length, true);
    const directory = name[name.length - 1] === 0x2f;
    record.setUint32(38, ((directory ? 0o40755 : 0o100644) << 16) | (directory ? 0x10 : 0), true);
    record.setUint32(42, offset, true);
    central.push(new Uint8Array(record.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((n, part) => n + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const parts = [...local, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(new ArrayBuffer(parts.reduce((n, part) => n + part.length, 0)));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}
