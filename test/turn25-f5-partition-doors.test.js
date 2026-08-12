// ─── F5 — DOORS ON A PARTITION ARE JUST DOORS (turn 25) ─────────────────────
//
// Turn 21 gave a partition-hung leaf its drilling and turn 24 made its hinges
// visible. This turn makes it EQUAL — and the way that is asserted is the point
// of the feature:
//
//   THE PAIRED TEST. Two identical cabinets, one door hung on a side and one on
//   a partition, and every capability compared. Any future door feature has to
//   satisfy this pair, which is why it is written as a table of capabilities
//   rather than as a list of facts about partitions.
//
// ─── WHAT THE PAIR FOUND ────────────────────────────────────────────────────
//
// One number. `doorCount` is the FACE's own door rule, and a cabinet with doors
// in its bays stores `doors: false` by construction — so `totals.hinges` was
// `centres.length × 0`, `drillSummary.hinge_centers` was empty, and the BOM
// bought nothing to hang three leaves on while the machine bored all twelve of
// their plate holes. `leafCount` is that number said properly.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import {
  clearHingeCatalogue, doorHingeAssignment, setHingeCatalogue,
} from '../src/engine/hinges.js';
import { groupOfPanel } from '../src/engine/cnc/groups.js';
import { handleClassOf } from '../src/engine/handles.js';
import { isShakerFront } from '../src/engine/shaker.js';
import { frontDetail } from '../src/engine/drawings/frontElevation.js';
import { doorOpenAngle } from '../src/engine/doors.js';

// ─── THE PAIR ───────────────────────────────────────────────────────────────
//
// The same 900 mm base unit, twice. A: two doors across the face, hung on the
// two carcass sides. B: a partition down the middle, one door in each bay, both
// hung on the PARTITION. Same cabinet, same board, same fronts — the only
// difference is what the plate is screwed to.

/** The catalogue's own shape — reference/hardware/cliptop-hinges.json. */
const CATALOGUE = {
  system: 'CLIP top',
  rules: { hinge_by_front_thickness: [{ max: 25, angle: 110 }, { max: 32, angle: 95 }] },
  items: [
    { family: '71B3550', article: '71B3550', role: 'hinge', angle: 110, finish: 'nickel' },
    { family: '71B3550N', article: '71B3550N', role: 'hinge', angle: 110, finish: 'onyx' },
    { family: '173L6100', article: '173L6100', role: 'plate_knockin5' },
  ],
};

const base = { ...defaultParamsFor('BUD', P), unit_num: '01', width: 900 };

const onTheSides = (extra = {}) => computeCabinet({ ...base, ...extra }, P);

const onThePartition = (extra = {}) => computeCabinet({
  ...base,
  doors: false,
  sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450, front_mm: 0 }] }],
  bay_doors: [{ door: 'one', hinge: 'R' }, { door: 'one', hinge: 'L' }],
  ...extra,
}, P);

const leavesOf = (r) => r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
const drillsOn = (r, panelId) => r.drills.filter((d) => d.panel === panelId);
const classesOn = (r, panelId) => [...new Set(drillsOn(r, panelId).map((d) => d.layer))].sort();

/**
 * A capability, asked of both cabinets. The VALUE has to match; which panel it
 * was read off does not, since the two cabinets name their leaves differently
 * (`01-FL` / `01-FR` against `01-B1` / `01-B2`).
 */
function bothWays(name, ask) {
  const a = ask(onTheSides(), 'side');
  const b = ask(onThePartition(), 'partition');
  assert.deepEqual(b, a, `${name}: a partition-hung door behaves differently`);
}

test('F5.2 — the pair is really a pair: same cabinet, hung two ways', () => {
  const a = onTheSides();
  const b = onThePartition();
  assert.equal(leavesOf(a).length, 2);
  assert.equal(leavesOf(b).length, 2);
  // A: on the carcass. B: on the partition. That is the ONLY difference the
  // test is allowed to be about.
  assert.deepEqual(leavesOf(a).map((p) => p.meta.hingeOn ?? 'side'), ['side', 'side']);
  assert.deepEqual(leavesOf(b).map((p) => p.meta.hingeOn), ['VPART-1', 'VPART-1']);
  assert.ok(leavesOf(b).every((p) => p.meta.hingeFace), 'a partition has two faces and the plate goes on one');
});

// ─── capability by capability ───────────────────────────────────────────────

test('F5.1 — hinge COUNT', () => {
  bothWays('totals.hinges', (r) => r.totals.hinges);
  bothWays('hinge rows', (r) => r.drillSummary.hinge_centers);
  bothWays('hinge hole pairs', (r) => r.drillSummary.side_hinge_holes_y);
});

test('F5.1 — BOM entries', () => {
  bothWays('hinge BOM lines', (r) => r.hardware
    .filter((h) => h.role === 'hinges')
    .map((h) => ({ qty: h.qty, perDoor: h.spec.per_door, doors: h.spec.doors, label: h.spec_label })));
  bothWays('doors reported', (r) => r.derived.doors);
});

test('F5.1 — drill CLASSES on the leaf itself', () => {
  bothWays('classes on leaf 1', (r) => classesOn(r, leavesOf(r)[0].id));
  bothWays('classes on leaf 2', (r) => classesOn(r, leavesOf(r)[1].id));
  // …and the same NUMBER of each, which is what says the cups and their screws
  // are drilled and not merely allowed.
  bothWays('drill counts on leaf 1', (r) => {
    const out = {};
    for (const d of drillsOn(r, leavesOf(r)[0].id)) out[d.layer] = (out[d.layer] || 0) + 1;
    return out;
  });
});

test('F5.1 — the plate pattern is drilled, on whatever it is screwed to', () => {
  // Twelve ⌀5 either way — six per leaf. On A they are in the two sides; on B
  // they are in the partition's two faces. Same law, different board.
  const count = (r) => r.drills.filter((d) => d.layer === P.hinges.layer).length;
  assert.equal(count(onThePartition()), count(onTheSides()));
  const b = onThePartition();
  assert.ok(
    b.drills.filter((d) => d.layer === P.hinges.layer).every((d) => d.panel === 'VPART-1'),
    'on B every plate hole belongs to the partition',
  );
});

test('F5.1 — per-hinge OVERRIDE (turn 19), and the count of them', () => {
  // A catalogue has to be in hand or every door resolves to the same "nothing
  // known", the grouping collapses to one line either way, and the test would
  // pass while proving nothing.
  setHingeCatalogue(CATALOGUE);
  try {
    // The override is keyed on the engine's own panel id, so it reaches a leaf
    // called `01-B1` exactly as it reaches one called `01-FL`.
    const lines = (r) => r.hardware.filter((h) => h.role === 'hinges')
      .map((h) => ({ qty: h.qty, assigned: h.spec.assigned, family: h.spec.family }))
      .sort((x, y) => String(x.family).localeCompare(String(y.family)));

    // No override: one line, both ways.
    assert.equal(lines(onTheSides()).length, 1);
    assert.deepEqual(lines(onThePartition()), lines(onTheSides()));

    // One leaf fitted by hand: TWO lines, both ways, and the same two.
    const a = onTheSides({ door_hinges: { '01-FL': '71B3550N' } });
    const b = onThePartition({ door_hinges: { '01-B1': '71B3550N' } });
    assert.equal(lines(a).length, 2, 'one door fitted differently is two things to buy');
    assert.deepEqual(lines(b), lines(a), 'and a partition-hung leaf is no different');
    assert.equal(lines(a).filter((l) => l.assigned).length, 1);
  } finally {
    clearHingeCatalogue();
  }

  // …and the assignment really is read off the leaf's own id.
  assert.equal(doorHingeAssignment({ door_hinges: { '01-B1': '71B3550' } }, '01-B1'), '71B3550');
  assert.equal(doorHingeAssignment({ door_hinges: { '01-FL': '71B3550' } }, '01-B1'), null);
});

test('F5.1 — ARTICLE and ANGLE resolve the same way', () => {
  bothWays('hinge spec', (r) => r.hardware
    .filter((h) => h.role === 'hinges')
    .map((h) => ({
      angle: h.spec.angle, family: h.spec.family, article: h.spec.article, finish: h.spec.finish,
    })));
});

test('F5.1 — HINGE SIDE is the leaf’s own, and the cups follow it', () => {
  // A's left leaf is hinged L and B's left leaf is hinged R (it closes against
  // the partition on its right) — so this is compared per HAND rather than per
  // position: a leaf hinged R has its cups at the same x either way.
  //
  // And the comparison is FROM THE HINGE EDGE, not an absolute x: a leaf in a
  // bay is narrower than a leaf across half a face, and comparing absolute
  // coordinates would be comparing door widths rather than the cup law.
  const cupsFromHingeEdge = (r, hand) => {
    const leaf = leavesOf(r).find((p) => p.meta.hinge === hand);
    return drillsOn(r, leaf.id)
      .filter((d) => d.kind === 'cup')
      .map((d) => (hand === 'L' ? leaf.w - d.x : d.x))
      .sort((x, y) => x - y);
  };
  assert.deepEqual(cupsFromHingeEdge(onThePartition(), 'R'), cupsFromHingeEdge(onTheSides(), 'R'));
  assert.deepEqual(cupsFromHingeEdge(onThePartition(), 'L'), cupsFromHingeEdge(onTheSides(), 'L'));
  // …and it really is the profile's 21.5, so the test would notice a law that
  // moved on both sides at once.
  assert.deepEqual(
    cupsFromHingeEdge(onThePartition(), 'L'),
    new Array(3).fill(P.hinges.cups.xFromHingeEdge),
  );
});

test('F5.1 — OPENING in the scene: the same hardware, the same swing law', () => {
  const hingesOf = (r) => hardwareInstances(r, P).hinges;
  assert.equal(hingesOf(onThePartition()).length, hingesOf(onTheSides()).length);
  assert.equal(hingesOf(onThePartition()).length, 6);
  // Every mounted hinge names the leaf it belongs to, either way — which is
  // what lets turn 24's rig fold the carcass half after the door it serves.
  assert.deepEqual(
    [...new Set(hingesOf(onThePartition()).map((h) => h.panelId))].sort(),
    leavesOf(onThePartition()).map((p) => p.id).sort(),
  );
  // The swing law reads the leaf's own width and hinge offset and knows nothing
  // about partitions.
  for (const leaf of leavesOf(onThePartition())) {
    assert.ok(doorOpenAngle({ doorWidth: leaf.w, hingeOffset: 0, gapToWall: null }, P) > 0);
  }
});

test('F5.1 — SELECTION and the MODAL treat it as a door', () => {
  // The scene decides what a front IS on `part`, and the modal opens on the
  // engine's own panel id — neither has a list of door ids to keep in step.
  for (const leaf of leavesOf(onThePartition())) {
    assert.equal(leaf.part, 'FRONT');
    assert.equal(leaf.role, 'front');
    assert.equal(leaf.material_role, 'front');
  }
});

test('F5.1 — the CNC SHEET groups it as a front', () => {
  bothWays('sheet group of each leaf', (r) => leavesOf(r).map((p) => groupOfPanel(p)));
  bothWays('finish_exposed', (r) => leavesOf(r).map((p) => p.finish_exposed));
});

test('F5.1 — this turn’s OWN two features reach it as well', () => {
  // F3 and F4 are door capabilities and are therefore in the pair by right.
  bothWays('shaker recess', (r) => leavesOf(r).map((p) => [
    isShakerFront(p),
    (p.cnc.pockets || []).filter((k) => k.layer === 'SHAKER_PANEL_POCKET').length,
  ]));
  bothWays('handle class', (r) => leavesOf(r).map((p) => handleClassOf(p, UNIT_TYPES.BUD)));

  const withHandles = (make) => make({ project_handle: { type: 'bar', centres: 160 } });
  const holesOf = (r) => leavesOf(r).map((p) => drillsOn(r, p.id).filter((d) => d.layer === 'HANDLES_5MM').length);
  assert.deepEqual(holesOf(withHandles(onThePartition)), holesOf(withHandles(onTheSides)));

  // …and the elevation draws the frame on both.
  for (const leaf of leavesOf(onThePartition())) {
    assert.equal(frontDetail({ x: 0, y: 0, w: leaf.w, h: leaf.h }, 'S', P).length, 1);
  }
});

test('F5.1 — there is no “bay door” branch left in what a leaf IS', () => {
  // The structural half of the claim: a partition-hung leaf's record differs
  // from a side-hung one's ONLY in where it is and what it is screwed to.
  const a = leavesOf(onTheSides())[0];
  const b = leavesOf(onThePartition())[0];
  const shape = (p) => Object.keys(p).sort();
  assert.deepEqual(shape(b), shape(a), 'the two leaves are not even the same kind of record');
  assert.equal(b.thickness, a.thickness);
  assert.equal(b.h, a.h);
  assert.equal(b.material_role, a.material_role);
  // The meta a bay leaf carries EXTRA is exactly the three facts about where it
  // hangs — nothing that changes what it is.
  const extra = Object.keys(b.meta).filter((k) => !(k in a.meta));
  assert.deepEqual(extra.sort(), ['bay', 'hingeFace', 'hingeOn']);
});
