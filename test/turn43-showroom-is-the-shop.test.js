// ─── TURN 43, IRON RULE 8: THE SHOWROOM IS THE SHOP ─────────────────────────
//
// *"Banned, permanently: a probe or test showroom may serve ONLY rows the
// committed snapshot `reference/hardware/movento.json` names (today byte-equal
// to the live bucket: NL 250–450, 40 files, articles 8-digit). It may fabricate
// GLB BYTES for those rows; it may not invent a row, a rung, a variant or an
// article the snapshot does not carry."*
//
// ─── WHY THIS RULE EXISTS, MEASURED ─────────────────────────────────────────
//
// `scripts/make-fixture-hardware.mjs` wrote a ladder of its own — 270…650 every
// 50, two variants each, articles made up as `3000` + the length. The live
// bucket tops out at NL 450. So the showroom stocked `760H500T_3000500.glb`,
// article `3000500T` — no such file and no such article exists in the shop —
// and T42-F2's probe went green on a rung the owner cannot buy.
//
// The consequence is the whole of T43-F7: the one fault the owner had been
// staring at since 18.08 (an overlay box of 490 asks NL 500 and gets nothing)
// was INVISIBLE to every automated check in this repository, because every
// automated check shopped in a showroom that stocked it.
//
// A STALE SNAPSHOT MAKES PROBES CONSERVATIVE, NEVER OPTIMISTIC — which is the
// correct direction of error. When the owner uploads the missing rungs,
// refreshing the snapshot is one curl (`runner-bucket-patch.md`) and
// re-running the generator is the second line.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const SNAPSHOT = json('reference/hardware/movento.json');
const SHOWROOM = json('test/fixtures/hardware-local/hardware/runners/blum/movento/manifest.json');
const BUCKET = json('test/fixtures/bucket/runners-blum-movento-manifest.json');

const rowsOf = (m) => (Array.isArray(m.items) ? m.items : m.files) || [];

test('iron rule 8 — the SNAPSHOT is what it says it is', () => {
  const rows = rowsOf(SNAPSHOT);
  assert.equal(rows.length, 40, '40 files');
  const nls = [...new Set(rows.map((r) => r.nl))].sort((a, b) => a - b);
  assert.equal(Math.min(...nls), 250);
  assert.equal(Math.max(...nls), 450, 'NL 250–450 — the shop stops at 450');
  for (const r of rows) assert.match(String(r.article), /^\d{8}$/, `${r.article} is an 8-digit Blum article`);
});

test('iron rule 8 — the BUCKET FIXTURE is the snapshot, verbatim (R3)', () => {
  // Turn 19's own law: a manifest fixture is the live file copied. Asserted
  // here so the two never drift and a probe cannot be seeded from a third
  // opinion about the owner's bucket.
  assert.deepEqual(BUCKET, SNAPSHOT);
});

test('iron rule 8 — the SHOWROOM serves ONLY rows the snapshot names', () => {
  const snapNl = new Set(rowsOf(SNAPSHOT).map((r) => r.nl));
  const snapArticles = new Set(rowsOf(SNAPSHOT).map((r) => String(r.article)));
  const snapFiles = new Set(rowsOf(SNAPSHOT).map((r) => r.file));
  const snapPairs = new Set(rowsOf(SNAPSHOT).map((r) => `${r.nl}|${r.variant}`));

  const show = rowsOf(SHOWROOM);
  assert.ok(show.length > 0, 'there is a showroom to check');
  for (const r of show) {
    assert.ok(snapNl.has(r.nl), `NL${r.nl} is a rung the shop stocks`);
    assert.ok(snapPairs.has(`${r.nl}|${r.variant}`), `NL${r.nl} ${r.variant} is a variant the shop stocks`);
    assert.ok(snapArticles.has(String(r.article)), `article ${r.article} is one the shop sells`);
    assert.ok(snapFiles.has(r.file), `${r.file} is a file the bucket names`);
  }

  // …and the subset relation, said as a set, so a row ADDED to the showroom
  // that the snapshot does not carry fails here whatever it looks like.
  const showNl = new Set(show.map((r) => r.nl));
  const showArticles = new Set(show.map((r) => String(r.article)));
  assert.ok([...showNl].every((n) => snapNl.has(n)), 'showroom NLs ⊆ snapshot NLs');
  assert.ok([...showArticles].every((a) => snapArticles.has(a)), 'showroom articles ⊆ snapshot articles');
});

test('iron rule 8 — the fault that made the rule: NO invented rung survives anywhere', () => {
  // The exact strings the deleted ladder produced, hunted by name across
  // everything that composes or serves a showroom. `3000500T` is the article
  // T42-F2's probe shopped for; it does not exist and never did.
  const HAUNTED = [/3000\d{3}[TS]?/, /760H(500|550|600|650)[TS]/];
  const FILES = [
    'scripts/make-fixture-hardware.mjs',
    'test/fixtures/hardware-local/hardware/runners/blum/movento/manifest.json',
  ];
  for (const file of FILES) {
    const text = read(file)
      // Comments are where the fault is EXPLAINED, and explaining it is the
      // opposite of committing it. Only live code and data are searched.
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    for (const pattern of HAUNTED) {
      assert.doesNotMatch(text, pattern, `${file} still names an article the shop does not sell`);
    }
  }
});

test('iron rule 8 — the generator READS the snapshot rather than writing a ladder', () => {
  const gen = read('scripts/make-fixture-hardware.mjs');
  assert.match(gen, /reference', 'hardware', 'movento\.json/, 'it opens the committed snapshot');
  assert.match(gen, /SNAPSHOT\.items/, 'and its rows are the snapshot\'s rows');
  assert.doesNotMatch(gen, /const RUNNER_LENGTHS/, 'the invented ladder is gone');
});

test('iron rule 8 — every GLB the showroom manifest names is on disk, and no other', () => {
  // A row with no bytes is a 404 in a probe; a file with no row is an invented
  // model nobody can trace. Both are the same fault seen from two sides.
  const dir = new URL('./fixtures/hardware-local/hardware/runners/blum/movento/', import.meta.url);
  const onDisk = readdirSync(dir).filter((f) => f.endsWith('.glb')).sort();
  const named = rowsOf(SHOWROOM).map((r) => r.file.split('/').pop()).sort();
  assert.deepEqual(onDisk, [...new Set(named)].sort());
});
