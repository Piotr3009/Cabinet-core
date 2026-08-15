#!/usr/bin/env node
// ─── Seed cc_hardware_register from the repo's own catalogues (turn 32, F6) ──
//
// The registry of EXISTENCE (sql/005_tura32.sql): one row per article the
// automat may write into the BOM. Seeded ONCE, by Piotr, never by the app:
//
//   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… CC_OWNER=<uuid> \
//     node scripts/seed-hardware-register.mjs
//
// With no environment variables it PRINTS what it would upsert and touches
// nothing (the seed-hardware.mjs convention — a script that runs four times
// a year should not decide the app's dependency list, so this is node's own
// fetch against PostgREST, zero dependencies).
//
// What it reads — the two catalogues the app already ships:
//
//   reference/hardware/movento.json        the owner's 40 MOVENTO articles
//                                          (nl → the label's "NL <mm>";
//                                           T → soft, S → std, SU → no
//                                           variant claim)
//   reference/hardware/cliptop-hinges.json the Blum hinge families (soft by
//                                          construction — BLUMOTION) and
//                                          their mounting plates
//
// Nothing is invented: every article number below is read from a published
// catalogue file, and a file with no usable rows REFUSES to seed.

import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../reference/hardware/${p}`, import.meta.url), 'utf8'));

function moventoRows() {
  const cat = read('movento.json');
  const items = cat.items || cat.files || [];
  return items
    .filter((i) => i && i.article && Number(i.nl) > 0)
    .map((i) => ({
      category: 'runner',
      family: String(cat.profile || cat.system || 'MOVENTO'),
      finish: null,
      // T is TIP-ON BLUMOTION (the soft one); S is the pull-to-open standard.
      // SU is the row nobody has explained — it claims no variant rather than
      // guessing one.
      variant: i.variant === 'T' ? 'soft' : (i.variant === 'S' ? 'std' : null),
      angle: null,
      article: String(i.article),
      source: 'own',
      label: `MOVENTO ${cat.profile || ''} NL ${i.nl} ${i.variant || ''}`.replace(/\s+/g, ' ').trim(),
    }));
}

function hingeRows() {
  const cat = read('cliptop-hinges.json');
  const items = cat.items || [];
  const rows = [];
  for (const i of items) {
    if (!i?.article) continue;
    if (i.role === 'hinge') {
      rows.push({
        category: 'hinge',
        family: String(i.family || ''),
        finish: i.finish ? String(i.finish) : null,
        variant: 'soft',              // CLIP top BLUMOTION — soft by construction
        angle: Number(i.angle) || null,
        article: String(i.article),
        source: 'own',
        label: `${i.family} ${i.angle}° ${i.finish || ''}`.trim(),
      });
    } else if (/^plate_/.test(i.role || '')) {
      rows.push({
        category: 'hinge_plate',
        family: String(i.family || ''),
        finish: i.finish ? String(i.finish) : null,
        variant: null,
        angle: null,
        article: String(i.article),
        source: 'own',
        label: `${i.family} ${i.role === 'plate_knockin5' ? 'knock-in ⌀5' : 'screw-on ⌀3'} ${i.finish || ''}`.trim(),
      });
    }
  }
  return rows;
}

async function upsert({ url, key, owner }, rows) {
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/cc_hardware_register?on_conflict=owner,article`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows.map((r) => ({ ...r, owner }))),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '';
  const owner = process.env.CC_OWNER || '';
  const live = Boolean(url && key && owner);

  console.log(live
    ? `writing to   ${url} as owner ${owner}`
    : 'DRY RUN — set SUPABASE_URL, SUPABASE_SERVICE_KEY and CC_OWNER to write. Nothing will be written.');
  console.log('');

  const runners = moventoRows();
  const hinges = hingeRows();
  const rows = [...runners, ...hinges];
  console.log(`runners      ${runners.length} articles (MOVENTO manifest)`);
  console.log(`hinges       ${hinges.filter((r) => r.category === 'hinge').length} articles (CLIP top)`);
  console.log(`plates       ${hinges.filter((r) => r.category === 'hinge_plate').length} articles (CLIP top)`);

  if (!rows.length) {
    console.log('REFUSED — catalogues with no usable rows are not a registry.');
    process.exitCode = 1;
    return;
  }
  if (!live) {
    for (const r of rows) console.log(`  ${r.category.padEnd(12)} ${r.article.padEnd(10)} ${r.label}`);
    console.log('\nDry run complete — nothing was written.');
    return;
  }
  try {
    await upsert({ url, key, owner }, rows);
    console.log(`\nUpserted ${rows.length} rows.`);
  } catch (e) {
    console.log(`WRITE FAILED — ${e.message}`);
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
