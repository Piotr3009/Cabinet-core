#!/usr/bin/env node
// ─── R2: A BUCKET CLAIM IS PROVEN AGAINST THE LIVE BUCKET (turn 20) ─────────
//
// CLAUDE.md, rule R2: "Turn 19 wrote a storage path three documents agreed on
// and the bucket disagreed with. The public storage host is not a secret and is
// already in the repo — `public/decors/egger/egger-decors.json` carries
// absolute `tex` URLs; derive the host from the first one. The walk MUST fetch
// the real manifests and HEAD at least one real model file per family (assert
// HTTP 200 and size > 10 KB) before any screenshot of hardware is taken. No env
// var is needed: the bucket is public."
//
// This is that check, as a script the acceptance walk calls and a person can
// run by hand. It is deliberately standalone — zero dependencies, node's own
// `fetch` — so it can be pointed at the bucket from any machine.
//
//     node scripts/bucket-live.mjs                 # human-readable
//     node scripts/bucket-live.mjs --json          # machine-readable
//
// EVERY URL IT CHECKS IS BUILT BY THE APP'S OWN CODE — `profile.js` for the
// bucket and the folder, `engine/hardwareUrl.js` for the file — so a report
// that says 200 is a report about the URLs the browser will actually ask for,
// not about URLs a script hard-codes beside them. That distinction is the whole
// of R2.
//
// It NEVER throws on a network answer. A refusal, a 404, an egress policy that
// blocks the host: each is recorded with its own reason and `ok:false`, which
// is what lets the walk carry an honest "the bucket could not be reached here"
// instead of dying.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hardwareModelSrc, storageBaseFrom } from '../src/engine/hardwareUrl.js';
import { parseRunnerManifest } from '../src/engine/runners.js';
import { parseHingeCatalogue } from '../src/engine/hinges.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIN_MODEL_BYTES = 10 * 1024;

/** The public storage host, derived from the decor pack that already ships. */
export function derivedStorageBase() {
  const pack = JSON.parse(
    readFileSync(join(HERE, '..', 'public', 'decors', 'egger', 'egger-decors.json'), 'utf8'),
  );
  // ─── TURN 21 (CLAUDE.md R4) ───────────────────────────────────────────────
  // The SPLIT is the derivation: find an absolute url in the pack (this
  // script's job — it reads the file off disk) and then cut the host out of it
  // with the ENGINE's own function, which is the very function the app calls to
  // find its own bucket (lib/storageBase.js). Turn 20 had a private copy of the
  // cut here, and a verification with its own copy of the app's arithmetic is
  // how a walk comes back green about a url the browser never asks for.
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

/** The two families, exactly as the app addresses them. */
export function families(base = derivedStorageBase()) {
  const M = P.hardware.runner.movento;
  const C = P.hardware.hinge.cliptop;
  return [
    {
      id: 'runners',
      label: 'MOVENTO 760H',
      bucket: M.bucket,
      path: M.path,
      manifest: `${base}/${M.bucket}/${M.path}${M.manifest}`,
      expectRows: 40,
      parse: (json) => (parseRunnerManifest(json)?.files || []),
    },
    {
      id: 'hinges',
      label: 'CLIP top BLUMOTION',
      bucket: C.bucket,
      path: C.path,
      manifest: `${base}/${C.bucket}/${C.path}manifest.json`,
      expectRows: 19,
      parse: (json) => (parseHingeCatalogue(json)?.items || []),
    },
  ];
}

async function attempt(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: e?.cause?.message || e?.message || String(e) };
  }
}

/** Check one family: the manifest, then one real model beside it. */
async function checkFamily(family, fetchImpl) {
  const out = {
    id: family.id,
    label: family.label,
    bucket: family.bucket,
    path: family.path,
    manifestUrl: family.manifest,
    manifestStatus: null,
    manifestBytes: null,
    rows: null,
    model: null,
    ok: false,
    error: null,
  };

  const got = await attempt(() => fetchImpl(family.manifest));
  if (!got.ok) { out.error = got.error; return out; }
  out.manifestStatus = got.value.status;
  const text = await attempt(() => got.value.text());
  if (!text.ok) { out.error = text.error; return out; }
  out.manifestBytes = Buffer.byteLength(text.value, 'utf8');
  if (got.value.status !== 200) { out.error = `manifest answered ${got.value.status}`; return out; }

  let rows = [];
  try {
    rows = family.parse(JSON.parse(text.value));
  } catch (e) {
    out.error = `manifest is not the JSON the parser reads: ${e.message}`;
    return out;
  }
  out.rows = rows.length;

  const first = rows.find((r) => r.file);
  if (!first) { out.error = 'no row in the manifest names a file'; return out; }
  const url = hardwareModelSrc({
    file: first.file, bucket: family.bucket, path: family.path, storageBase: derivedStorageBase(),
  });
  const head = await attempt(() => fetchImpl(url, { method: 'HEAD' }));
  if (!head.ok) { out.model = { url, error: head.error }; out.error = head.error; return out; }
  const bytes = Number(head.value.headers.get('content-length')) || 0;
  out.model = { url, status: head.value.status, bytes };
  if (head.value.status !== 200) { out.error = `model answered ${head.value.status}`; return out; }
  if (!(bytes > MIN_MODEL_BYTES)) { out.error = `model is ${bytes} bytes — under the ${MIN_MODEL_BYTES} floor`; return out; }

  out.ok = rows.length === family.expectRows;
  if (!out.ok) out.error = `${rows.length} rows parsed, ${family.expectRows} expected`;
  return out;
}

/**
 * The whole R2 check.
 *
 * @returns {Promise<{host:string, ok:boolean, families:Array}>}
 */
export async function checkLiveBucket({ fetchImpl = fetch } = {}) {
  const base = derivedStorageBase();
  const results = [];
  for (const family of families(base)) {
    // Sequential on purpose: a blocked host should produce two readable
    // refusals in order, not a race of them.
    results.push(await checkFamily(family, fetchImpl));
  }
  return { host: base, ok: results.every((r) => r.ok), families: results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await checkLiveBucket();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
  } else {
    process.stdout.write(`host  ${report.host}\n`);
    for (const f of report.families) {
      process.stdout.write(`\n${f.label} (${f.bucket}/${f.path})\n`);
      process.stdout.write(`  manifest  ${f.manifestUrl}\n`);
      process.stdout.write(`            ${f.manifestStatus ?? '—'}  ${f.manifestBytes ?? '—'} bytes  ${f.rows ?? '—'} rows parsed\n`);
      if (f.model) process.stdout.write(`  model     ${f.model.url}\n            ${f.model.status ?? '—'}  ${f.model.bytes ?? '—'} bytes\n`);
      process.stdout.write(`  ${f.ok ? 'OK' : `FAILED — ${f.error}`}\n`);
    }
  }
  process.exit(report.ok ? 0 : 1);
}
