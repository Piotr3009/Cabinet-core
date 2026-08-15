// ─── TURN 30 F17 — the wine rack ───────────────────────────────────────────
//
// CLAUDE.md: "Geometry-only type: carcass per KIT_BUD/KIT_WUD envelope + the
// lattice as panels in the BOM. No drilling truth exists → no drilling ships."
//
// ─── THE HARDEST OF THE BATCH RULE TO OBEY, AND THE PLAINEST ────────────────
//
// A wine rack is the one type in the batch with GEOMETRY OF ITS OWN. Every
// other kit borrows a carcass; this one adds boards nobody's LISP has ever
// drawn. So the rule bites here and the answer is literal:
//
//   the CARCASS is KIT_BUD's, hole for hole;
//   the LATTICE is plain rectangles — no hole, no pocket, no notch, nothing.
//
// The cross-halving joints that hold a real lattice together are exactly the
// truth this repo does not have. They are NAMED in the report and in the type,
// and they are not guessed at overnight. A joiner gets a cut list he can cut
// and a gap he can see.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { flattenLibrary, resolveEntry } from '../src/engine/library.js';

const of = (type, over = {}) => computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', ...over }, P);
const holes = (r) => r.drills
  .map((d) => `${String(d.panel).replace(/^[^-]*-/, '')}|${d.layer}|${d.kind}|${d.x}|${d.y}|${d.d}`).sort();
const lattice = (r) => r.panels.filter((p) => /^LATTICE-/.test(p.part));

// ─── 1. NO DRILLING SHIPS ──────────────────────────────────────────────────

test('F17 the CARCASS is KIT_BUD’s, hole for hole', () => {
  const wine = of('WINE');
  // A base unit with no door, because a wine rack is open — so the comparison
  // is against the same carcass and not against a cabinet with a leaf on it.
  const bud = of('BUD', { doors: false });
  assert.deepEqual(holes(wine), holes(bud));
  assert.deepEqual(wine.drillSummary, bud.drillSummary);
});

test('F17 the LATTICE carries NOTHING: no hole, no pocket, no notch', () => {
  const wine = of('WINE');
  const boards = lattice(wine);
  assert.ok(boards.length > 10, `${boards.length} lattice boards`);
  for (const b of boards) {
    assert.deepEqual(b.cnc.holes || [], [], `${b.id} holes`);
    assert.deepEqual(b.cnc.pockets || [], [], `${b.id} pockets`);
    assert.deepEqual(b.cnc.sockets || [], [], `${b.id} sockets`);
    assert.deepEqual(b.cnc.tabs || [], [], `${b.id} tabs`);
    // A plain rectangle: four corners and nothing else.
    assert.equal((b.cnc.outline || []).length <= 5, true, `${b.id} outline`);
  }
  // …and not one DRILL in the whole unit names a lattice board.
  assert.equal(wine.drills.filter((d) => /LATTICE/.test(String(d.panel))).length, 0);
});

test('F17 …and the lattice adds no hole to the CARCASS either', () => {
  // The tempting invention is a row of dowel holes up the side panels. There
  // is none: the carcass fingerprint is identical with the lattice in it.
  const wine = of('WINE');
  const bud = of('BUD', { doors: false });
  assert.equal(wine.drills.length, bud.drills.length);
});

// ─── 2. IT IS REAL GEOMETRY, AND IT IS IN THE BOM ──────────────────────────

test('F17 the lattice is a GRID: uprights full height, shelves per cell', () => {
  const wine = of('WINE');
  const uprights = wine.panels.filter((p) => p.part === 'LATTICE-V');
  const shelves = wine.panels.filter((p) => p.part === 'LATTICE-H');
  assert.ok(uprights.length >= 1, `${uprights.length} uprights`);
  assert.ok(shelves.length >= uprights.length + 1, `${shelves.length} shelves`);
  // The shelves are cut PER CELL rather than run through the uprights, so
  // every board in the list can be cut and dropped in without a joint this
  // repo cannot specify.
  const cols = uprights.length + 1;
  assert.equal(shelves.length % cols, 0, `${shelves.length} shelves over ${cols} columns`);
  // Every upright is the same board, and so is every shelf.
  assert.equal(new Set(uprights.map((p) => `${p.w}×${p.h}`)).size, 1);
  assert.equal(new Set(shelves.map((p) => `${p.w}×${p.h}`)).size, 1);
});

test('F17 the CELL is the profile’s, and the count is what fits whole', () => {
  assert.equal(P.wineRack.cellMm, 100);
  const G = P.board.thickness;
  const wine = of('WINE');
  const cols = wine.panels.filter((p) => p.part === 'LATTICE-V').length + 1;
  const cellW = wine.panels.find((p) => p.part === 'LATTICE-H').w;
  assert.ok(cellW >= P.wineRack.cellMm, `a cell is ${cellW} mm — at least a bottle`);
  // The boards and the cells fill the opening exactly: nothing is cut to a
  // remainder and nothing is left over.
  const opening = wine.params.width - 2 * G;
  assert.equal(Math.round(cols * cellW + (cols - 1) * G), opening);
  // A WIDER rack gets MORE cells rather than fatter ones.
  const wide = of('WINE', { width: 1000 });
  const wideCols = wide.panels.filter((p) => p.part === 'LATTICE-V').length + 1;
  assert.ok(wideCols > cols, `${wideCols} columns at 1000 vs ${cols} at 600`);
  assert.ok(Math.abs(wide.panels.find((p) => p.part === 'LATTICE-H').w - cellW) < 30,
    'and the cell stays about a bottle');
});

test('F17 every lattice board reaches the BOM and the cut list', () => {
  const wine = of('WINE');
  const boards = lattice(wine);
  for (const b of boards) {
    assert.ok(b.w > 0 && b.h > 0, `${b.id} ${b.w} × ${b.h}`);
    assert.equal(b.thickness, P.board.thickness);
    assert.ok(wine.csvLines.some((l) => l.includes(b.id)), `${b.id} is on the cut list`);
  }
  // The sheet count includes them, which is what "in the BOM" means.
  assert.ok(wine.totals.panels_true_incl_railpart >= boards.length);
  const bare = of('BUD', { doors: false });
  assert.equal(wine.totals.pieces_total, bare.totals.pieces_total + boards.length,
    'the carcass plus every lattice board, and nothing else');
  assert.ok(wine.totals.board_area_m2 > bare.totals.board_area_m2, 'more board than an empty carcass');
});

// ─── 3. THE KIT ────────────────────────────────────────────────────────────

test('F17 it is an OPEN unit: no doors, no shelves, and no mechanism bought', () => {
  const type = getUnitType('WINE');
  assert.equal(type.supports.doors, false);
  assert.equal(type.supports.shelves, false, 'the lattice is what it has instead');
  assert.equal(type.hardwareKit, undefined, 'nothing is ordered');
  assert.equal(of('WINE').panels.filter((p) => p.role === 'front').length, 0);
  assert.equal(of('WINE').drillSummary.hinge_centers.length, 0, 'nothing to hang');
});

test('F17 the carcass envelope is KIT_BUD’s, and the lattice is a type flag', () => {
  const type = getUnitType('WINE');
  assert.equal(type.lisp, 'KIT_BUD_FULL.lsp');
  assert.equal(type.lisp, getUnitType('BUD').lisp);
  assert.deepEqual(type.carcass, getUnitType('BUD').carcass);
  assert.equal(type.lattice, true);
  // …and no other kit grows one.
  for (const id of ['BUD', 'WUD', 'BUDTALL', 'BIN', 'SINK']) {
    assert.notEqual(getUnitType(id).lattice, true, id);
    assert.equal(lattice(of(id)).length, 0, id);
  }
  assert.deepEqual(P.wineRack.defaults, { width: 600, height: 770, depth: 558 });
  assert.deepEqual(migrateCabinetProfile({}).wineRack.defaults, P.wineRack.defaults);
});

test('F17 it is in the KITCHEN category and the held-open row became a kit', () => {
  assert.equal(categoryOf('WINE').id, 'kitchen');
  const entry = flattenLibrary().find((e) => e.id === 'wine-rack');
  assert.equal(entry.kind, 'type');
  assert.equal(entry.typeId, 'WINE');
  assert.equal(resolveEntry(entry, P).enabled, true);
  // The row says the gap out loud, where a joiner reads it.
  assert.match(resolveEntry(entry, P).hint, /no drilling truth exists yet/);
  assert.equal(UNIT_NUM_PREFIX.WINE, 'WR');
});

test('F17 a carcass too small for a cell still cuts a carcass, not a fault', () => {
  const tiny = of('WINE', { width: 120, height: 200 });
  for (const p of tiny.panels) assert.ok(p.w > 0 && p.h > 0, `${p.part} ${p.w} × ${p.h}`);
  // One cell, no dividers — which is a box, and a box is what fits.
  assert.equal(tiny.panels.filter((p) => p.part === 'LATTICE-V').length, 0);
});
