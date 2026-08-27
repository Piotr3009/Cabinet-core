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

test('F2 — the shoe box’s two battens have two names, and two files', () => {
  // The shape that reproduces it: a wardrobe wide enough to be hinged BOTH
  // ways, with a drawer shoe box behind the doors.
  const result = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    sections: [{ width_mm: 900, items: [{ id: 'sb1', kind: 'shoe_box', variant: 'D', dividers: 1 }] }],
  }, P);

  const battens = result.panels.filter((p) => /BATTEN/.test(p.id));
  assert.equal(battens.length, 2, 'a hinged side each way, a batten each');
  assert.equal(new Set(battens.map((p) => p.id)).size, 2, 'two ids, not one');
  assert.deepEqual(battens.map((p) => p.id).sort(), ['SHOE1-BATTEN-L', 'SHOE1-BATTEN-R']);

  // …and the BOM code is untouched, because the bill counts the part and not
  // the file.
  assert.deepEqual(battens.map((p) => p.part), ['SHOEBOX-BATTEN', 'SHOEBOX-BATTEN']);

  // The consequence the joiner felt: a ZIP keeps ONE entry per name.
  const files = buildUnitDxfFiles(result, P, {});
  const names = files.map((f) => f.name);
  assert.equal(new Set(names).size, names.length, 'every part of this cabinet has its own file');
  assert.ok(names.includes('W01-SHOE1-BATTEN-L.dxf'));
  assert.ok(names.includes('W01-SHOE1-BATTEN-R.dxf'));
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
