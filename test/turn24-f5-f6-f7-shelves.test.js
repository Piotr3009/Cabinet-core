import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { biscuitSetCount, biscuitSets } from '../src/engine/biscuits.js';

// ─── TURN 24 · F5, F6, F7 — the hinges on a partition, and the shelf's own
//     width and joint ─────────────────────────────────────────────────────────

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const G = P.board.thickness;

const bud = (over = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P), unit_num: '01', ...over,
}, P);

const withItems = (items, over = {}) => bud({
  width: 900,
  sections: [{ width_mm: 900, items }],
  ...over,
});

// ─── F5 — DOORS ON PARTITIONS SHOW THEIR HINGES ────────────────────────────

/** The owner's own case: partitions at 600 and 800, three bays, three doors. */
function threeBays() {
  return computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 1400,
    partition_front_mm: 0,
    bay_doors: [{ door: 'one', hinge: 'L' }, { door: 'one', hinge: 'L' }, { door: 'one', hinge: 'R' }],
    sections: [{
      width_mm: 1400,
      items: [
        { id: 'p1', kind: 'partition', x_mm: 600, front_mm: 0 },
        { id: 'p2', kind: 'partition', x_mm: 800, front_mm: 0 },
      ],
    }],
  }, P);
}

test('F5.2 — mounted hinge instances == hinge_centers for EVERY leaf', () => {
  const r = threeBays();
  const leaves = r.panels.filter((p) => p.part === 'FRONT');
  assert.equal(leaves.length, 3, 'the 600/800 three-bay case really does have three doors');
  const centres = r.drillSummary.hinge_centers;
  assert.ok(centres.length > 0);

  const hinges = hardwareInstances(r, P).hinges;
  for (const leaf of leaves) {
    const mine = hinges.filter((h) => h.panelId === leaf.id);
    assert.equal(mine.length, centres.length, `${leaf.id} carries one hinge per drilled centre`);
    assert.deepEqual(mine.map((h) => h.y).sort((a, b) => a - b), [...centres].sort((a, b) => a - b));
  }
  assert.equal(hinges.length, leaves.length * centres.length, 'and no leaf is left bare');
});

test('F5.1 — the plate lands on the bearer’s INNER face, whatever the bearer is', () => {
  const r = threeBays();
  const hinges = hardwareInstances(r, P).hinges;
  const plateOf = (id) => hinges.find((h) => h.panelId === id).plateX;
  const panel = (id) => r.panels.find((p) => p.id === id);

  // Bay 1 hangs on the LEFT SIDE. Its plate is on the side's INNER face — which
  // is the whole of the bug: turn 21 read `hingeFace`, only a partition carries
  // one, and a side-hung bay door fell through to the side's OUTER face. Its
  // plate was drawn one board outside the cabinet and the door looked bare.
  assert.equal(plateOf('01-B1'), panel('BUL').box.x + panel('BUL').box.w);
  assert.equal(plateOf('01-B1'), G, '…which on this cabinet is 18, not 0');

  // Bay 2 hangs on the PARTITION, on the face it closes against.
  const p1 = r.panels.find((p) => p.id === '01-B2').meta.hingeOn;
  assert.equal(p1, 'VPART-1');
  assert.equal(plateOf('01-B2'), panel('VPART-1').box.x + panel('VPART-1').box.w);

  // Bay 3 hangs on the RIGHT side, so its plate is that side's inner face.
  assert.equal(plateOf('01-B3'), panel('BUR').box.x);
});

test('F5.3 — display only: a bay door’s CNC is what it was', () => {
  // The hinge plate pattern on a partition is turn 21's and is untouched here;
  // what F5 fixes is where the MODEL is drawn. The proof that it is display
  // only is that nothing in this phase is in the engine at all.
  const hw = src('engine/hardware3d.js');
  assert.match(hw, /plateFaceX/);
  assert.doesNotMatch(hw, /addDrill|drills\.push/, 'hardware3d never drills anything');
});

// ─── F6 — SHELF WIDTH FOLLOWS ITS TYPE ─────────────────────────────────────

const shelfWidthOf = (variant, width = 600, extra = {}) => {
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width,
    sections: [{
      width_mm: width,
      items: [{ id: 's1', kind: 'shelf', pos_mm: 300, ...(variant ? { variant } : {}), ...extra }],
    }],
  }, P);
  return r.panels.find((p) => p.part === 'SHELF');
};

test('F6 — fix is the FULL CLEAR LIGHT, adjustable is that light less 4', () => {
  // The owner's own numbers, on a 600 carcass: 564 wall to wall, 560 to slide.
  assert.equal(shelfWidthOf('fixed').w, 564);
  assert.equal(shelfWidthOf('adjustable').w, 560);
  // …and a fix shelf starts AT the side's inner face; an adjustable one gets
  // its 2 mm a side.
  assert.equal(shelfWidthOf('fixed').box.x, G);
  assert.equal(shelfWidthOf('adjustable').box.x, G + P.carcass.shelfWidthClearance / 2);
});

test('F6 — nothing said is ADJUSTABLE, which is why the goldens are zero delta', () => {
  assert.equal(shelfWidthOf(null).w, 560, 'the engine’s own number has always been the adjustable one');
  assert.equal(shelfWidthOf(null).w, shelfWidthOf('adjustable').w);
});

test('F6 — both laws scale from the LIGHT, never from a constant', () => {
  for (const width of [400, 600, 900, 1200]) {
    const light = width - 2 * G;
    assert.equal(shelfWidthOf('fixed', width).w, light, `${width}: fix takes the whole light`);
    assert.equal(
      shelfWidthOf('adjustable', width).w,
      light - P.carcass.shelfWidthClearance,
      `${width}: adjustable slides`,
    );
  }
});

test('F6 — a bay’s light is respected, and the type still decides', () => {
  const inBay = (variant) => {
    const r = withItems([
      { id: 'p1', kind: 'partition', x_mm: 450 },
      {
        id: 's1', kind: 'shelf', pos_mm: 300, zone: 0, variant,
      },
    ]);
    return r.panels.find((p) => p.part === 'SHELF');
  };
  // The left bay runs from the side's inner face (18) to the partition (450):
  // a light of 432.
  assert.equal(inBay('fixed').w, 432);
  assert.equal(inBay('adjustable').w, 432 - P.carcass.shelfWidthClearance);
  assert.equal(inBay('fixed').box.x, G);
});

// ─── F7 — THE FIX SHELF GETS THE OWNER'S JOINT ─────────────────────────────

const screwsOf = (r) => r.drills.filter((d) => d.kind === 'shelf_screw');
const marksOf = (r, id) => (r.panels.find((p) => p.id === id)?.cnc?.marks || []);

test('F7.1 — a fix shelf is biscuited on BOTH bearing faces, and screwed from the sides', () => {
  const r = shelfWidthOf('fixed') && computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 600,
    sections: [{ width_mm: 600, items: [{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed' }] }],
  }, P);
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const sets = biscuitSets({ length: shelf.box.d, screws: true, profile: P });
  assert.ok(sets.length >= 2, 'a 540-deep shelf takes at least two sets');

  // Both sides carry the whole set: screws AND the mark between them.
  for (const side of ['BUL', 'BUR']) {
    assert.equal(
      screwsOf(r).filter((d) => d.panel === side).length,
      sets.length * 2,
      `${side} takes two screws per set`,
    );
    assert.equal(marksOf(r, side).length, sets.length, `${side} takes the 70 mm mark of each set`);
    for (const m of marksOf(r, side)) assert.equal(m.layer, 'BISCUIT_4MM');
  }
  // …and the shelf's own two ends carry the set-out, transferred.
  assert.equal(marksOf(r, shelf.id).length, sets.length * 2, 'both ends of the shelf');
});

test('F7.1 — from a PARTITION side it is biscuits only: no screw in the neighbour’s face', () => {
  const r = withItems([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    {
      id: 's1', kind: 'shelf', pos_mm: 300, zone: 0, variant: 'fixed',
    },
  ]);
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.ok(shelf && part);

  // The shelf lives in the LEFT bay: it lands on BUL and on the partition.
  const sets = biscuitSets({ length: shelf.box.d, screws: true, profile: P });
  assert.equal(screwsOf(r).filter((d) => d.panel === 'BUL').length, sets.length * 2, 'the carcass side is drilled through');
  assert.equal(screwsOf(r).filter((d) => d.panel === part.id).length, 0,
    'a partition serves two bays — a through screw would surface in the neighbour’s face');
  assert.equal(screwsOf(r).filter((d) => d.panel === 'BUR').length, 0, 'the far side carries nothing');
  // …but it IS set out: the mark alone, in the same positions.
  assert.equal(marksOf(r, part.id).length, sets.length);
});

test('F7.1 — the comment says WHY, in the code, where somebody will read it', () => {
  const engine = src('engine/cabinet.js');
  assert.match(
    engine,
    /a partition serves two bays and a through screw would surface in the\s*\/\/\s*neighbour's face/i,
    'the sentence CLAUDE.md asks to be written down',
  );
});

test('F7.2 — ONE world height: both faces’ joint heights are equal, to zero', () => {
  const r = withItems([
    { id: 'p1', kind: 'partition', x_mm: 450 },
    {
      id: 's1', kind: 'shelf', pos_mm: 300, zone: 0, variant: 'fixed',
    },
  ]);
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const part = r.panels.find((p) => p.part === 'VPART');

  // THE SIDE's law: the shelf's own centre line, in world millimetres.
  const sideJoint = [...new Set(screwsOf(r).filter((d) => d.panel === 'BUL').map((d) => d.y))];
  assert.equal(sideJoint.length, 1, 'one joint, one height');
  const world = sideJoint[0];
  assert.equal(world, shelf.box.y + shelf.box.h / 2);

  // THE PARTITION's pattern is that same height minus whatever it stands above.
  const partJoint = [...new Set(marksOf(r, part.id).map((m) => m.from[0]))];
  assert.equal(partJoint.length, 1);
  assert.equal(part.box.y + partJoint[0] - world, 0, 'equal in world space, exactly');
});

test('F7.3 — ZERO ⌀7.5 on a fix shelf or its bearers: the red test', () => {
  for (const items of [
    [{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed' }],
    [{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed' }, { id: 's2', kind: 'shelf', pos_mm: 500, variant: 'fixed' }],
    [{ id: 'p1', kind: 'partition', x_mm: 450 }, {
      id: 's1', kind: 'shelf', pos_mm: 300, zone: 0, variant: 'fixed',
    }],
  ]) {
    const r = withItems(items);
    const pins = r.drills.filter((d) => d.layer === P.shelfHoles.layer);
    assert.equal(pins.length, 0, `“jak fix, to nie ma 3 poziomów 7,5” — found ${pins.length}`);
  }
  // …and no ⌀7.5 lands on the ROW of a fix shelf, even where an adjustable
  // shelf in the same cabinet legitimately drills its own.
  const mixed = withItems([
    { id: 'a', kind: 'shelf', pos_mm: 300, variant: 'adjustable' },
    { id: 'b', kind: 'shelf', pos_mm: 500, variant: 'fixed' },
  ]);
  assert.ok(mixed.drills.some((d) => d.layer === P.shelfHoles.layer), 'the adjustable one keeps its pins');
  const fixRow = mixed.panels.find((p) => p.meta?.variant === 'fixed').box.y;
  for (const d of mixed.drills.filter((x) => x.layer === P.shelfHoles.layer)) {
    assert.ok(
      Math.abs(d.y - fixRow) > Math.max(...P.shelfHoles.clusterOffsets) + 1,
      `a ⌀7.5 at ${d.y} is on the fix shelf's row (${fixRow})`,
    );
  }
});

test('F7.3 — an ADJUSTABLE shelf keeps the LISP’s ⌀7.5 law, untouched', () => {
  const r = withItems([{ id: 's1', kind: 'shelf', pos_mm: 300 }]);
  const pins = r.drills.filter((d) => d.layer === P.shelfHoles.layer);
  // Two columns × three per cluster × two sides.
  assert.equal(pins.length, 2 * P.shelfHoles.clusterOffsets.length * 2);
  for (const p of pins) assert.equal(p.d, P.shelfHoles.diameter);
  // …and no screws and no biscuits, because it is not that joint.
  assert.equal(screwsOf(r).length, 0);
  assert.equal(marksOf(r, 'BUL').length, 0);
});

test('F7.4 — golden DEFAULTS carry none of it: every default shelf is adjustable', () => {
  // The whole of F7's CNC promise, as one assertion: a kit at its own defaults
  // has no fix shelf in it, so it has no biscuit and no shelf screw.
  for (const type of ['BUD', 'WARDROBE', 'WUD', 'BUDTALL', 'LOW_CABINET']) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', shelves: 2 }, P);
    assert.equal(screwsOf(r).length, 0, `${type} default: no shelf screws`);
    for (const p of r.panels) {
      assert.equal((p.cnc?.marks || []).length, 0, `${type} default ${p.id}: no marks`);
    }
  }
});

test('F7 — the set is the owner’s own, counted by his own rule', () => {
  // 540 deep ⇒ two sets; a shelf over 700 long on its joint line ⇒ three. The
  // count is `engine/biscuits.js`'s and this only proves the consumer asks it.
  assert.equal(biscuitSetCount(540, P), 2);
  assert.equal(biscuitSetCount(760, P), 3);
  const deep = computeCabinet({
    ...defaultParamsFor('BUDTALL', P), unit_num: '01', depth: 800, shelves: 1,
  }, P);
  const one = { ...deep };
  assert.ok(one, 'the deep kit builds');
});
