#!/usr/bin/env node
// The private dashboard's numbers (/hq, docs/hq.md), one collection: Kiln's downloads (stats/kiln-downloads.mjs), the
// public site's page views (stats/site-pages.mjs) and the public numbers of GitHub, Nexus and the browser stores
// (stats/public-numbers.mjs). ops/frostdev-stats.timer starts it once an hour. Each part runs on its own: one that fails
// leaves the others' numbers fresh, writes why into status.json and makes the run exit 1.
//
//   node stats/collect.mjs            collect everything, write kiln.json, site.json, public.json and status.json
//   node stats/collect.mjs render     write them again from what is stored, asking nobody
//
// Environment: DATA_DIR (kiln/, site/ and public/ under it), OUT_DIR (the JSON files the dashboard reads), FILES_DIR
// (Kiln's release folders, read-only), SITE_DIR (the built public site, read-only), CF_API_TOKEN and CF_ZONE_ID
// (Cloudflare, Zone > Analytics > Read), GITHUB_TOKEN (optional; GitHub allows 60 questions an hour without one).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collect as collectKiln, render as renderKiln, writeAtomic } from './kiln-downloads.mjs';
import { collectSite, renderSite } from './site-pages.mjs';
import { collectPublic, renderPublic } from './public-numbers.mjs';

export function parts(env) {
  for (const name of ['DATA_DIR', 'OUT_DIR']) if (!env[name]) throw new Error(`${name} is not set`);
  const kiln = { ...env, DATA_DIR: join(env.DATA_DIR, 'kiln') };
  return {
    kiln,
    site: { ...env, DATA_DIR: join(env.DATA_DIR, 'site'), NEWEST_FILE: join(kiln.DATA_DIR, 'newest-browsers.json') },
    public: { ...env, DATA_DIR: join(env.DATA_DIR, 'public') },
  };
}

export async function collectAll(env, now = Date.now(), { fetcher } = {}) {
  const p = parts(env);
  mkdirSync(env.OUT_DIR, { recursive: true });
  const status = { at: new Date(now).toISOString(), parts: {} };
  // Kiln first: the site's count reads the newest browsers Kiln's run has just measured
  const steps = [
    ['kiln', async () => { const run = await collectKiln(p.kiln, now); return `${run.days} days in ${run.queries} queries`; }],
    ['site', async () => { const run = await collectSite(p.site, now); return `${run.days} days in ${run.queries} queries`; }],
    ['public', async () => {
      const run = await collectPublic(p.public, now, fetcher ? { fetcher } : {});
      if (!run.ok) throw new Error(`every source failed: ${Object.values(run.data.errors).join('; ')}`);
      return run.failed.length ? `${run.failed.join(', ')} failed` : 'every source answered';
    }],
  ];
  for (const [name, step] of steps) {
    try {
      status.parts[name] = { ok: true, note: await step() };
    } catch (error) {
      status.parts[name] = { ok: false, error: String(error.message || error).split(env.CF_API_TOKEN || '\u0000').join('[token]').slice(0, 600) };
    }
  }
  writeAtomic(join(env.OUT_DIR, 'status.json'), JSON.stringify(status));
  return status;
}

export function renderAll(env, now = Date.now()) {
  const p = parts(env);
  renderKiln(p.kiln, now);
  renderSite(p.site, now);
  renderPublic(p.public, now);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    if (process.argv[2] === 'render') {
      renderAll(process.env);
      console.log('frostdev-stats: written again from what is stored');
    } else if (!process.argv[2]) {
      const status = await collectAll(process.env);
      const line = Object.entries(status.parts).map(([name, part]) => `${name} ${part.ok ? `ok (${part.note})` : `FAILED: ${part.error}`}`).join('; ');
      console.log(`frostdev-stats: ${line}`);
      if (Object.values(status.parts).some((part) => !part.ok)) process.exit(1);
    } else {
      console.error('usage: collect.mjs [render]');
      process.exit(2);
    }
  } catch (error) {
    console.error(`frostdev-stats: ${error.message}`);
    process.exit(1);
  }
}
