// ─── F6 — THE ADJUSTABLE SHELF SHOWS ITS BRASS (turn 25) ────────────────────
//
// The owner: he wants to SEE gold or silver sleeves — and they are the ⌀7.5 we
// already drill, not a new 5 mm system.
//
// So there is nothing new to cut. The picture is a READING of the drilling the
// machine already gets, which is what makes three things true at once: the
// CNC delta is zero, a FIX shelf shows nothing without being told to, and R9
// holds without a line of code that mentions it.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances, shelfSupportInstances } from '../src/engine/hardware3d.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';

const shelves = (items) => ({
  ...defaultParamsFor('BUD', P), unit_num: '01', sections: [{ width_mm: 600, items }],
});
const adjustable = () => computeCabinet(shelves([{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'adjustable' }]), P);
const fixed = () => computeCabinet(shelves([{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed' }]), P);
const bare = () => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 0 }, P);

const supports = (r) => shelfSupportInstances(r, P);

// ─── F6.1 — the sleeves are in the holes that carry the shelf ───────────────

test('F6.1 — they are the ⌀7.5 we already drill, not a new 5 mm system', () => {
  const r = adjustable();
  const s = supports(r);
  assert.ok(s.length, 'an adjustable shelf has supports');
  for (const support of s) {
    assert.equal(support.diameter, P.shelfHoles.diameter);
    assert.equal(support.diameter, 7.5);
    // Every one of them stands on a hole the machine actually bores.
    const hole = r.drills.find((d) => d.panel === support.panel
      && d.layer === P.shelfHoles.layer
      && Math.abs(d.d - support.diameter) < 1e-9);
    assert.ok(hole, `${support.panel} has no ⌀7.5 hole for this support`);
  }
});

test('F6.1 — one in each corner: `pinsPerShelf`, which is what the BOM orders', () => {
  assert.equal(supports(adjustable()).length, P.shelfHoles.pinsPerShelf);
  assert.equal(P.shelfHoles.pinsPerShelf, 4);
  // Two columns on each of two sides — and only on the row the shelf is
  // actually standing on, never on the two notches either side of it.
  const s = supports(adjustable());
  assert.deepEqual([...new Set(s.map((k) => k.panel))].sort(), ['BUL', 'BUR']);
  assert.deepEqual([...new Set(s.map((k) => k.y))], [300], 'the shelf’s own underside, and no other row');
});

test('F6.1 — they sit on the INNER faces, pointing into the cabinet', () => {
  const r = adjustable();
  const G = P.board.thickness;
  const W = r.params.width;
  for (const s of supports(r)) {
    if (s.panel === 'BUL') {
      assert.equal(s.x, G, 'a sleeve shows on the face a joiner can see');
      assert.deepEqual(s.normal.map((n) => n + 0), [1, 0, 0], 'and the pin points into the cabinet');
    } else {
      assert.equal(s.x, W - G);
      assert.deepEqual(s.normal.map((n) => n + 0), [-1, 0, 0]);
    }
  }
});

test('F6.1 — gold or silver, chosen in project settings, from profile.js', () => {
  assert.ok(P.appearance.metals.gold.colour);
  assert.ok(P.appearance.metals.silver.colour);
  assert.notEqual(P.appearance.metals.gold.colour, P.appearance.metals.silver.colour);
  assert.equal(P.appearance.metalDefault, 'gold');
  // Beside the hardware finishes, and shared with F4's handles — one block of
  // two metals rather than a colour written into each feature.
  assert.equal(P.handles.finish, 'gold');
  assert.ok(P.appearance.metals[P.handles.finish]);

  // The project carries the choice, and "nobody has said" is a complete answer.
  assert.equal(DEFAULT_DESIGN.hardware.shelfSleeve, null);
  assert.equal(migrateDesign({ hardware: { shelfSleeve: 'silver' } }).hardware.shelfSleeve, 'silver');
  assert.equal(migrateDesign({ hardware: { shelfSleeve: 'brass' } }).hardware.shelfSleeve, null);
});

test('F6.1 — the fitting’s own proportions are in profile.js, named', () => {
  const S = P.hardware.shelfPin;
  assert.ok(S.sleeveOuter > P.shelfHoles.diameter, 'a collar has to be wider than the hole it lines');
  assert.ok(S.pinDiameter > 0 && S.pinLength > 0);
  assert.ok(S.shoulderDiameter > S.pinDiameter, 'the shelf rests on the shoulder, not on the peg');
});

// ─── F6.2 — the FIX shelf shows nothing, and that IS the feature ────────────

test('F6.2 — a FIX shelf has no sleeves, because it has no pin holes', () => {
  const f = fixed();
  assert.equal(f.panels.filter((p) => p.part === 'SHELF').length, 1, 'it is still a shelf');
  assert.equal(f.drills.filter((d) => d.layer === P.shelfHoles.layer).length, 0, 'and it is screwed, not pinned');
  assert.equal(supports(f).length, 0);
});

test('F6.2 — one look tells you which shelf is which', () => {
  const both = computeCabinet(shelves([
    { id: 's1', kind: 'shelf', pos_mm: 300, variant: 'adjustable' },
    { id: 's2', kind: 'shelf', pos_mm: 500, variant: 'fixed' },
  ]), P);
  const s = supports(both);
  assert.equal(s.length, 4);
  assert.deepEqual([...new Set(s.map((k) => k.shelf))], ['SHELF-1'], 'only the adjustable one');
});

// ─── R9 ─────────────────────────────────────────────────────────────────────

test('R9 — no shelf, no sleeves and no holes; add it back and they return', () => {
  const none = bare();
  assert.equal(none.panels.filter((p) => p.part === 'SHELF').length, 0);
  assert.equal(none.drills.filter((d) => d.layer === P.shelfHoles.layer).length, 0);
  assert.equal(supports(none).length, 0);

  const before = supports(adjustable()).map((s) => `${s.panel}:${s.x},${s.y},${s.z}`);
  assert.equal(before.length, 4);
  const after = supports(adjustable()).map((s) => `${s.panel}:${s.x},${s.y},${s.z}`);
  assert.deepEqual(after, before, 'identical, to the coordinate');
});

// ─── F6.4 — display only ⇒ the CNC does not move ────────────────────────────

test('F6.4 — the DXF of a cabinet with sleeves is the DXF of one without them', () => {
  // The strongest form of "display only": the sleeves are a reading of the
  // drilling, so nothing about the drilling can have changed to make them.
  const r = adjustable();
  const files = buildUnitDxfFiles(r, P);
  const holes = r.drills.filter((d) => d.layer === P.shelfHoles.layer);
  assert.ok(holes.length > 0, 'the pin holes are still bored');
  // Not one entity anywhere carries the fitting.
  for (const f of files) {
    assert.ok(!f.dxf.includes('SLEEVE'), `${f.name} mentions a sleeve`);
    assert.ok(!f.dxf.includes('SHELF_PIN'), `${f.name} mentions a pin`);
  }
  // …and the instances are not on the panel records either — they are computed
  // by the VIEW's own function and stored nowhere.
  for (const p of r.panels) {
    assert.equal(p.cnc?.sleeves, undefined);
    assert.equal(p.meta?.sleeves, undefined);
  }
});

test('F6 — the scene’s hardware bundle carries them beside the legs', () => {
  const h = hardwareInstances(adjustable(), P);
  assert.equal(h.shelfSupports.length, 4);
  // …and the counts of everything else are untouched by their arriving.
  const withoutShelf = hardwareInstances(bare(), P);
  assert.equal(withoutShelf.shelfSupports.length, 0);
  assert.equal(h.legs.length, withoutShelf.legs.length);
  assert.equal(h.hinges.length, withoutShelf.hinges.length);
});
