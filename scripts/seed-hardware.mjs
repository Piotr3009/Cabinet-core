#!/usr/bin/env node
// ─── SEEDING cc_hardware FROM THE LIVE BUCKET (turn 22, CLAUDE.md F2a.3) ────
//
// "a small script that reads the LIVE bucket manifests and upserts them as rows
//  — run BY THE OWNER after the SQL, never automatically."
//
// Never automatically is the whole of it. Nothing in the app calls this, no
// build step runs it, and it refuses to write unless it has been handed
// credentials on purpose. Run it AFTER `sql/004_tura22.sql`:
//
//     # a dry run — reads the bucket, prints what it would upsert, writes
//     # nothing at all. This is what it does with no credentials.
//     node scripts/seed-hardware.mjs
//
//     # the real thing
//     SUPABASE_URL=https://….supabase.co \
//     SUPABASE_SERVICE_KEY=… \
//     CC_OWNER=<the owner's auth.users uuid> \
//       node scripts/seed-hardware.mjs
//
// ─── WHERE IT READS FROM ────────────────────────────────────────────────────
//
// The same URL the APP builds — `lib/hardwareSource.js manifestUrl` off the
// same two profile strings the model URLs use, and the host derived from the
// decor pack exactly as `scripts/bucket-live.mjs` derives it (R2/R4). A seeding
// script with its own idea of where the bucket is would seed rows describing a
// bucket the app never reads.
//
// ─── WHAT IT WRITES ─────────────────────────────────────────────────────────
//
// One row per family, upserted on (owner, family, system) — so running it
// twice replaces rather than duplicating, which is what the unique index in
// the SQL is for. The manifest goes in VERBATIM: the row IS the file, moved.
//
// Zero dependencies: node's own `fetch` against PostgREST. No Supabase client,
// because a script that runs four times a year should not decide the app's
// dependency list.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { storageBaseFrom } from '../src/engine/hardwareUrl.js';
import { hardwareFamilySpec, manifestUrl } from '../src/lib/hardwareSource.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The public storage host, derived from the decor pack that already ships. */
function derivedStorageBase() {
  const pack = JSON.parse(
    readFileSync(join(HERE, '..', 'public', 'decors', 'egger', 'egger-decors.json'), 'utf8'),
  );
  const find = (node) => {
    if (!node || typeof node !== 'object') return null;
    for (const key of ['tex', 'scan', 'thumb', 'url']) {
      if (typeof node[key] === 'string' && storageBaseFrom(node[key])) return node[key];
    }
    for (const value of Object.values(node)) {
      const hit = find(value);
      if (hit) return hit;
    }
    return null;
  };
  const absolute = find(pack);
  if (!absolute) throw new Error('No absolute decor URL in the pack to derive the host from');
  return storageBaseFrom(absolute);
}

/** The families that have a manifest in the bucket to be seeded FROM. */
const SEEDABLE = ['runners', 'hinges'];

async function readManifest(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function upsert({ url, key, owner }, row) {
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/cc_hardware`
    + '?on_conflict=owner,family,system';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([{ ...row, owner }]),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 300)}`);
  return text;
}

async function main() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
  const owner = process.env.CC_OWNER || '';
  const live = Boolean(url && key && owner);

  const base = derivedStorageBase();
  console.log(`bucket host  ${base}`);
  console.log(live
    ? `writing to   ${url} as owner ${owner}`
    : 'DRY RUN — set SUPABASE_URL, SUPABASE_SERVICE_KEY and CC_OWNER to write. Nothing will be written.');
  console.log('');

  let failures = 0;
  for (const family of SEEDABLE) {
    const spec = hardwareFamilySpec(family, P);
    const src = manifestUrl(spec, base);
    process.stdout.write(`${family.padEnd(8)} ${src}\n`);
    let manifest = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      manifest = await readManifest(src);
    } catch (e) {
      failures += 1;
      console.log(`         FAILED — ${e.message}\n`);
      continue;
    }
    const parsed = spec.parse(manifest);
    const rows = parsed ? spec.rows(parsed).length : 0;
    const row = {
      family,
      system: parsed?.system || spec.system || '',
      manifest,
      bucket_path: `${spec.bucket}/${spec.path}${spec.manifest}`,
    };
    console.log(`         ${rows} rows parsed, system "${row.system}", path ${row.bucket_path}`);
    if (!rows) {
      failures += 1;
      console.log('         REFUSED — a manifest with no usable rows is not a catalogue\n');
      continue;
    }
    if (!live) { console.log('         (dry run — not written)\n'); continue; }
    try {
      // eslint-disable-next-line no-await-in-loop
      await upsert({ url, key, owner }, row);
      console.log('         upserted\n');
    } catch (e) {
      failures += 1;
      console.log(`         WRITE FAILED — ${e.message}\n`);
    }
  }

  if (failures) {
    console.log(`${failures} of ${SEEDABLE.length} families could not be seeded.`);
    process.exitCode = 1;
  } else {
    console.log(live ? 'Done.' : 'Dry run complete — nothing was written.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
