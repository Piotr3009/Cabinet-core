// ─── T53 · F2 — THE DXF EXPORT, OPENED ─────────────────────────────────────
//
// The handover, standing five days (22–26.08):
//
//   *"DXF eksport PUSTY — bez tego CNC nie dostaje nic."*
//
// CLAUDE.md F2: *"A green suite that never opened the file is exactly how this
// stayed broken for five days."*  So this file OPENS THE FILES — with a reader
// that knows nothing about this engine (`scripts/t53-dxf-audit.mjs readDxf`,
// deliberately not `engine/cnc/dxf.js parseDxf`: a writer proof-read by its own
// reader proves only that the two agree).
//
// ─── THE DIAGNOSIS, AND IT IS NOT WHAT THE REPORT SAID ─────────────────────
//
// The export does not produce nothing. On the seeded job below — a run of
// BUD/BUDR with drawers, a wardrobe under a slope with a watch drawer, and a
// second wardrobe with doors and a shoe box behind them — the three export
// paths write 80 files and half a megabyte of R12, every one of them with
// geometry in it, and the same is true in a real Chromium down to the bytes on
// disk (the acceptance walk). The verdict carries the numbers.
//
// ─── WHAT OPENING THEM DID FIND: A PART THE MACHINE NEVER GOT ──────────────
//
// A drawer shoe box with a hinged side each way cuts TWO battens, and both were
// called `SHOE1-BATTEN`. A panel id IS the DXF's file name and the per-unit
// export is a ZIP: two entries with one name is ONE entry, so the second batten
// never reached the machine — and the same id is the key the tick tree, the
// part edits and the material assignment are held by, so hiding one hid both
// and a pencil mark drawn on one appeared on the other.
//
// `src/engine/cabinet.js` names them apart by the side each already carries.
// The BOM part code `SHOEBOX-BATTEN` is untouched, so not a line of the bill
// changes.
//
// T54-F7 AMENDED (28.08.2026): the shoe-box world above is HISTORY. Under
// licence 2 the owner killed it — *"usuń stary kod na shoes i zrób z logiką
// drawers"* — so `engine/shoeBox.js`, the SHOEBOX-* panels, the battens and
// steps are gone and a shoe is a STANDARD drawer item `{ kind: 'drawer',
// variant: 'shoe' }` with one override (side height = drawers.shoeSideMm =
// 80). The batten test below is amended in place: the batten pair it pinned
// no longer exists (its replacement suite is
// test/turn54-f7-the-shoe-drawer.test.js); the LIVING law it carried — a
// panel id IS the file name, a ZIP keeps ONE entry per name — is re-asserted
// against the shoe drawer's own parts. The seeded job's `kind: 'shoe_box'`
// item now emits nothing (dead kind), so the export counts below stand on
// the surviving cabinets.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import {
  auditFiles, cncExtents, exportEverything, readDxf, readPairs, slopeNotes,
} from '../scripts/t53-dxf-audit.mjs';

// One export of the seeded job, shared by every test below — it builds four
// cabinets and writes eighty files, and doing that once is the difference
// between a suite that runs and a suite nobody waits for.
const exported = exportEverything();

// ─── THE FILES ARE NOT EMPTY, AND THE CLAIM IS A NUMBER ───────────────────

test('F2 — the seeded job exports files, and every one of them has geometry', () => {
  const { rows, faults } = auditFiles(exported);
  assert.deepEqual(faults, [], 'the audit has no complaint');
  assert.ok(rows.length >= 70, `${rows.length} files — the job really does export`);
  for (const r of rows) {
    assert.ok(r.bytes > 0, `${r.name} is not zero bytes`);
    assert.ok(r.geometry > 0, `${r.name} carries ${r.geometry} geometry entities`);
  }
  const bytes = rows.reduce((n, r) => n + r.bytes, 0);
  assert.ok(bytes > 200_000, `${bytes} bytes of DXF — "PUSTY" this is not`);
});

test('F2 — all three export paths are exercised, not just the easy one', () => {
  const kinds = new Set(exported.files.map((f) => f.kind));
  assert.ok(kinds.has('part'), 'the per-unit ZIP’s parts');
  assert.ok(kinds.has('sheet'), 'the one-file sheet');
  assert.ok(kinds.has('material'), 'the by-material sheet');
});

// ─── THE FILE IS OF THE PART THE ENGINE SAYS IT IS ────────────────────────

test('F2 — every part file’s extents cover that part’s own cnc geometry', () => {
  const parts = exported.files.filter((f) => f.kind === 'part');
  assert.ok(parts.length > 50);
  for (const f of parts) {
    const read = readDxf(f.dxf);
    const panel = f.result.panels.find((p) => p.id === f.panelId);
    const want = cncExtents(panel, f.result.drills);
    assert.ok(read.extents, `${f.name} states $EXTMIN/$EXTMAX`);
    assert.ok(read.extents.min[0] <= want.min[0] + 0.05, `${f.name} reaches its left edge`);
    assert.ok(read.extents.min[1] <= want.min[1] + 0.05, `${f.name} reaches its bottom edge`);
    assert.ok(read.extents.max[0] >= want.max[0] - 0.05, `${f.name} reaches its right edge`);
    assert.ok(read.extents.max[1] >= want.max[1] - 0.05, `${f.name} reaches its top edge`);
  }
});

test('F2 — every hole the engine drills is a CIRCLE in the file, to the millimetre', () => {
  let holes = 0;
  for (const f of exported.files.filter((x) => x.kind === 'part')) {
    const read = readDxf(f.dxf);
    for (const h of (f.result.drills || []).filter((d) => d.panel === f.panelId)) {
      const hit = read.circles.find((c) => Math.abs(c.x - h.x) <= 0.05
        && Math.abs(c.y - h.y) <= 0.05 && Math.abs(c.r - h.d / 2) <= 0.05);
      assert.ok(hit, `${f.name}: ⌀${h.d} at ${h.x},${h.y} is in the file`);
      assert.equal(hit.layer, h.layer, `${f.name}: …and on the layer the engine names`);
      holes += 1;
    }
  }
  assert.ok(holes > 300, `${holes} drillings checked against the engine’s own list`);
});

// ─── THE FILE IS SELF-CONSISTENT, THE WAY A READER NEEDS IT TO BE ─────────

test('F2 — every file parses as R12 pairs, with no blank value and no odd line', () => {
  for (const f of exported.files) {
    const { faults } = readPairs(f.dxf);
    assert.deepEqual(faults, [], `${f.name} is code/value pairs the whole way down`);
    assert.equal(readDxf(f.dxf).acadver, 'AC1009', `${f.name} is the dialect BLOCKERS #8 settled on`);
  }
});

test('F2 — no entity stands on a layer the LAYER table never declares', () => {
  for (const f of exported.files) {
    const read = readDxf(f.dxf);
    for (const layer of read.layersUsed) {
      assert.ok(read.layersDeclared.has(layer), `${f.name}: ${layer} is declared`);
    }
  }
});

// ─── THE PART THE MACHINE NEVER GOT ───────────────────────────────────────

test('F2 — the shoe cuts as a DRAWER, and every part still has its own file', () => {
  // T54-F7 AMENDED (28.08.2026): this test pinned the two battens
  // (`SHOE1-BATTEN-L/R`, part `SHOEBOX-BATTEN`) whose shared name was T53's
  // finding. The battens DIED with the shoe-box world (licence 2 — owner:
  // *"usuń stary kod na shoes i zrób z logiką drawers"*); the shoe drawer's
  // own suite is test/turn54-f7-the-shoe-drawer.test.js. What LIVES here and
  // is not weakened: a panel id IS the DXF file name and a ZIP keeps ONE
  // entry per name — re-asserted on the same 900 wardrobe, now carrying the
  // new world's shoe: a standard drawer item with `variant: 'shoe'`.
  const result = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{ id: 's1', kind: 'drawer', index: 1, height_mm: 116, variant: 'shoe' }],
    }],
  }, P);

  // The grave, checked by name: no batten, no SHOEBOX-* part, anywhere.
  assert.deepEqual(result.panels.filter((p) => /BATTEN|SHOEBOX/.test(p.id) || /BATTEN|SHOEBOX/.test(p.part)), [],
    'the shoe-box world is dead — no batten, no SHOEBOX part');

  // The shoe is the DRAWER law's own boards — sides, box front/back, bottom.
  //
  // ─── AMENDED IN TURN 58 (F2), and the claim is not weakened ────────────
  // This filtered on the id prefix `/^D1-/`, which was the whole of drawer 1
  // when a shoe drawer was an empty box. T58-F2 gives it its INSERT back —
  // the ramp and two dividers, ids `D1-SHOE-RAMP` and `D1-SHOE-DIV-n`, the
  // same `D{n}-` convention the watch tray has always used — so the prefix is
  // no longer a synonym for "the box".
  //
  // The box is asked for BY ROLE now, which is what this line always meant,
  // and the insert is asserted BESIDE it rather than dropped: the sentence
  // being protected is that a panel id IS a DXF file name and a ZIP keeps one
  // entry per name, and that is now proved over MORE parts than before.
  const box = result.panels
    .filter((p) => p.role === 'drawer_box' && /^D1-/.test(p.id))
    .map((p) => p.id).sort();
  assert.deepEqual(box, ['D1-BB', 'D1-BF', 'D1-DNO', 'D1-SL', 'D1-SR'],
    'a standard drawer box, cut by the same code path as every drawer');
  const insert = result.panels
    .filter((p) => p.role === 'shoe_insert').map((p) => p.id).sort();
  assert.deepEqual(insert, ['D1-SHOE-DIV-1', 'D1-SHOE-DIV-2', 'D1-SHOE-RAMP'],
    'and the insert T58-F2 gave it back, each board its own name');

  // The consequence the joiner felt: a ZIP keeps ONE entry per name.
  const files = buildUnitDxfFiles(result, P, {});
  const names = files.map((f) => f.name);
  assert.equal(new Set(names).size, names.length, 'every part of this cabinet has its own file');
  for (const id of [...box, ...insert]) assert.ok(names.includes(`W01-${id}.dxf`), `W01-${id}.dxf reaches the machine`);
});

test('F2 — and no cabinet in the seeded job repeats a panel id', () => {
  for (const { result } of exported.units) {
    const seen = new Map();
    for (const p of result.panels) seen.set(p.id, (seen.get(p.id) || 0) + 1);
    const dup = [...seen].filter(([, n]) => n > 1);
    assert.deepEqual(dup, [], `${result.unitNum} has no repeated panel id`);
  }
});

// ─── THE SLOPE NOTE ───────────────────────────────────────────────────────

test('F2 — the slope note the sheet stamps also reaches the FILE', () => {
  // ─── AMENDED THE SAME NIGHT, AND THE AMENDMENT IS THE POINT ────────────
  //
  // This test first accepted an honest zero: *"the count is reported by the
  // audit either way."*  It was zero, and it was hollow — the seed's rake fell
  // from the ceiling to 1900 over 900 mm at the end of a 6000 wall, and the
  // tallest thing under it is 2150, so the slope never reached a cabinet and
  // not one panel in the job carried an angle. A measurement of nothing is not
  // a measurement of the thing CLAUDE.md asked for: *"the slope note text
  // where F3/F4 give a piece an angle."*
  //
  // The seed's rake now crosses 2150 inside the last wardrobe's own span, and
  // the reader knows that an R12 file says `DEG` and not `°`. So the claim is
  // made properly: the note is IN the files, with the angle in it.
  const notes = slopeNotes(exported);
  assert.ok(notes.length > 0, 'the seeded job really does cut something on the rake');
  for (const n of notes) assert.ok(n.text.length > 0, 'a note with words in it');
  assert.ok(notes.some((n) => /\d+(\.\d+)? DEG/.test(n.text)),
    'and the angle itself is on the part, in words the machine’s reader can print');
  assert.ok(notes.some((n) => /BEVEL/.test(n.text)),
    '…including the bevel F4 puts on a side under the rake');
  // It rides the PART, not a stray caption: every note stands in a file that
  // carries geometry of its own.
  for (const n of notes) {
    const file = exported.files.find((f) => f.name === n.file);
    const e = readDxf(file.dxf).entities;
    const geometry = (e.POLYLINE || 0) + (e.CIRCLE || 0) + (e.ARC || 0) + (e.LINE || 0);
    assert.ok(geometry > 0, `${n.file} has geometry under its note`);
  }
});
