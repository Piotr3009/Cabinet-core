// ─── TURN 26 · F2 — PARTITION DOORS: ONE PATH, NOT TWO [CRITICAL] ───────────
//
// The owner, on the small partition-hung leaves: the hinges are the OLD
// procedural ones, THEY DO NOT FOLD, and THEY PIERCE. Three symptoms.
//
// Turn 25's paired test compared NUMBERS and passed while the pictures
// differed, and CLAUDE.md F2.2 says what is missing: "the pair must also agree
// on the MOUNT — model-backed vs procedural, parent node, fold state at 45°,
// and the F1 no-pierce assertion — for both leaves."
//
// ─── WHAT THE EXTENDED PAIR FOUND ───────────────────────────────────────────
//
// Two things, and neither of them was in the counts.
//
//   THE SWING WAS THE FIRST LEAF'S. `3d/UnitView.jsx swingFor` asked
//   `result.panels.find(p => p.part === 'FRONT')` — the FIRST front in the
//   cabinet — for EVERY door in it. On a face with two matched leaves that is
//   the same number twice and nobody notices; on a cabinet with doors in its
//   BAYS the leaves are different widths by construction, so a partition-hung
//   leaf swung by its neighbour's angle and turn 24's rig folded its hinge by
//   that same wrong angle. "They do not fold" is a leaf being handed another
//   leaf's number.
//
//   `hingeFace` WAS NEVER READ. The engine writes it on the leaf and drills the
//   plate pattern from it; the view re-derived the same answer from the door's
//   hand and agreed by construction — a coincidence held in place by a comment.
//   `engine/hardware3d.js doorHingeInstances` reads the meta now, and the pair
//   asserts the derivation still agrees with it on every leaf.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { doorHingeInstances, hardwareInstances } from '../src/engine/hardware3d.js';
import { doorHingeDatum, doorOpenAngle } from '../src/engine/doors.js';
import {
  clearHingeCatalogue, hingeSpecsFor, setHingeCatalogue,
} from '../src/engine/hinges.js';
import { ANGLES, hingeReach } from './fixtures/hinge-reach.mjs';

const read = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

/** The catalogue's own shape — reference/hardware/cliptop-hinges.json. */
const CATALOGUE = {
  system: 'CLIP top',
  rules: { hinge_by_front_thickness: [{ max: 25, angle: 110 }, { max: 32, angle: 95 }] },
  items: [
    {
      family: '71B3550', article: '71B3550', role: 'hinge', angle: 110, finish: 'nickel', file: 'hardware/hinges/blum/71B3550_10001.glb',
    },
    {
      family: '173L6100', article: '173L6100', role: 'plate_knockin5', finish: 'nickel', file: 'hardware/hinges/blum/173L6100_20001.glb',
    },
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
/** Compared per HAND: A's left leaf is hinged L, B's left leaf is hinged R. */
const byHand = (r, hand) => leavesOf(r).find((p) => p.meta.hinge === hand);

// ─── F2.1 — ONE FUNCTION, AND IT READS THE META ─────────────────────────────

test('F2.1 — every leaf’s hinges come out of ONE function', () => {
  const src = read('engine/hardware3d.js');
  // One producer of hinge instances, and the per-unit walk simply calls it.
  assert.equal((src.match(/function doorHingeInstances/g) || []).length, 1);
  assert.match(src, /for \(const instance of doorHingeInstances\(/);
  // No branch anywhere in it on WHAT KIND of leaf this is: no bay, no
  // partition special case producing a different instance.
  const body = src.slice(src.indexOf('export function doorHingeInstances'));
  assert.ok(!/\.meta\?\.bay/.test(body), 'a bay leaf is not a kind of leaf');
  assert.ok(!/onPartition\s*\?/.test(body), 'nor is a partition-hung one');
  // …and the legacy reading — the FIRST front's width standing in for every
  // door's swing — is gone from the view.
  const view = read('3d/UnitView.jsx');
  assert.ok(
    !/doorWidth: result\.panels\.find\(\(p\) => p\.part === 'FRONT'\)\?\.w \?\? W,/.test(view),
    'swingFor no longer hands one leaf another leaf’s width',
  );
  assert.match(view, /const swingFor = useCallback\(\(panel\)/);
});

test('F2.1 — the ENGINE’s `hingeOn` and `hingeFace` are what the mount reads', () => {
  const b = onThePartition();
  const hinges = hardwareInstances(b, P).hinges;
  assert.ok(hinges.length > 0);
  for (const h of hinges) {
    const leaf = b.panels.find((p) => p.id === h.panelId);
    assert.equal(h.hingeOn, leaf.meta.hingeOn, 'the bearer is the engine’s own answer');
    assert.equal(h.hingeFace, leaf.meta.hingeFace, 'and so is the face');
    assert.equal(h.onPartition, true);
  }
  // A side-hung leaf carries no `hingeFace` — a carcass side has only one face
  // a door can close against — and the mount falls to the door's own hand,
  // which is the same law said the other way round. Turn 24 relied on that
  // agreement; this is the assertion that it really does agree.
  for (const h of hardwareInstances(onTheSides(), P).hinges) {
    const leaf = onTheSides().panels.find((p) => p.id === h.panelId);
    assert.equal(leaf.meta.hingeFace ?? null, null);
    assert.equal(h.hingeFace, leaf.meta.hinge === 'R' ? 'L' : 'R');
    assert.equal(h.onPartition, false);
  }
});

test('F2.1 — the plate lands on the FACE the engine drills, either way', () => {
  const b = onThePartition();
  const part = b.panels.find((p) => p.part === 'VPART');
  for (const h of hardwareInstances(b, P).hinges) {
    const wanted = h.hingeFace === 'L' ? part.box.x : part.box.x + part.box.w;
    assert.equal(h.plateX, wanted, `${h.panelId}: the plate is on the partition’s ${h.hingeFace} face`);
  }
  const a = onTheSides();
  for (const h of hardwareInstances(a, P).hinges) {
    const side = a.panels.find((p) => p.id === h.hingeOn) || null;
    // With no bay doors the leaves name no bearer, and the fallback is the
    // carcass side's inner face — the same plane a named BUL/BUR would give.
    const inner = h.side === 'R' ? a.params.width - a.params.board_t : a.params.board_t;
    assert.equal(h.plateX, side ? (h.hingeFace === 'L' ? side.box.x : side.box.x + side.box.w) : inner);
  }
});

// ─── F2.2 — THE PAIR NOW AGREES ON THE MOUNT ────────────────────────────────

test('F2.2 — MODEL-BACKED, not procedural: both leaves resolve the same file', () => {
  setHingeCatalogue(CATALOGUE);
  try {
    const specOf = (r) => {
      const specs = hingeSpecsFor({ result: r, unit: { type: 'BUD', params: {} }, finish: 'nickel' });
      return leavesOf(r).map((leaf) => {
        const s = specs[leaf.id];
        return {
          file: s?.file, plateFile: s?.plateFile, angle: s?.angle, family: s?.family,
        };
      });
    };
    const a = specOf(onTheSides());
    const b = specOf(onThePartition());
    assert.equal(a.length, 2);
    assert.equal(b.length, 2);
    assert.deepEqual(b, a, 'a partition-hung leaf wears the same hinge and the same file');
    // …and it really is a FILE, so the mount is model-backed on both. A null
    // here is the procedural stand-in, which is exactly the owner's complaint.
    for (const row of b) {
      assert.ok(row.file, 'the body is a downloaded model');
      assert.ok(row.plateFile, 'and so is the plate');
    }
  } finally {
    clearHingeCatalogue();
  }
});

test('F2.2 — the PARENT is the same for both: body on the door, plate on the carcass', () => {
  const hardware = read('3d/Hardware.jsx');
  const view = read('3d/UnitView.jsx');
  // The two components each name their own parent to the registry, so "which
  // parent" cannot be a per-leaf answer.
  // ─── TURN 29 (CLAUDE.md F5): AND MEMBER B CHANGED SIDES ─────────────────
  // The arm is jointed to the CUP at the knuckle, so it is drawn in the cup's
  // own frame and folded back through the leaf's angle — which keeps the
  // knuckle one point and the arm at the carcass's attitude. What is left on
  // the carcass is the PLATE, which is the one piece of a CLIP top screwed to
  // the side panel and the one piece that genuinely never moves.
  assert.equal((hardware.match(/parent: 'door'/g) || []).length, 2, 'member A and member B');
  // Turn 31 (CLAUDE.md F9) adds a second `parent: 'carcass'`, and it is not a
  // hinge: the EXTRACTOR's registry slot, which hangs in the cabinet's own
  // aperture. The property this asserts is about the HINGE, so it is asked of
  // the hinge's own reports.
  const hingeReports = hardware.slice(0, hardware.indexOf('export function Extractor'));
  assert.equal((hingeReports.match(/parent: 'carcass'/g) || []).length, 1, 'the plate, and only the plate');
  // …and the DOOR half is mounted as a child of the leaf's own moving group,
  // for every leaf, with no test on which door it is.
  assert.match(view, /front === 'door' && \(showHinges \|\| xray\)/);
  assert.match(view, /items=\{hardware\.hinges\.filter\(\(hg\) => hg\.panelId === p\.id\)\}/);
  assert.equal((view.match(/<DoorHinges/g) || []).length, 1, 'one mount point, every leaf');
});

test('F2.2 — the FOLD at 45° is each leaf’s OWN angle, on both cabinets', () => {
  // A door in the open room swings to the profile's full angle whatever its
  // width — so the width only bites where there is a WALL on the hinge side,
  // and that is the case this asks about. It is not a contrivance: a run's end
  // cabinet is exactly that case, and it is where the owner's bay leaves live.
  const GAP = 68;
  const swingOf = (w) => doorOpenAngle({ doorWidth: w, hingeOffset: P.doors.gap / 2, gapToWall: GAP }, P);

  // The view's own expression (`3d/UnitView.jsx doorSwing`): the leaf's hand,
  // the open fraction, and the swing THAT leaf may make.
  const foldAt = (r, open) => leavesOf(r).map((leaf) => ({
    id: leaf.id,
    w: leaf.w,
    fold: (leaf.meta.hinge === 'R' ? 1 : -1) * open * swingOf(leaf.w),
  }));

  const b = foldAt(onThePartition(), 0.45);
  // The two bay leaves are NOT the same width — that is what makes this test
  // able to fail — and each folds by its own.
  assert.notEqual(b[0].w, b[1].w, 'the pair of bay leaves really are different widths');
  for (const row of b) assert.ok(Math.abs(row.fold) > 0, `${row.id} folds`);
  for (const row of [...foldAt(onTheSides(), 0.45), ...b]) {
    assert.equal(Math.abs(row.fold), 0.45 * swingOf(row.w), `${row.id}: its own width decides`);
  }

  // And the fault it replaces: `swingFor` handed EVERY leaf the first front's
  // width, so the second bay leaf folded by an angle that is not its own.
  const [first, second] = leavesOf(onThePartition());
  assert.notEqual(
    swingOf(first.w),
    swingOf(second.w),
    'the two swings differ, so the old shortcut really was wrong for one of them',
  );
  // …and on this cabinet it is not a rounding: at a 68 mm gap the narrower bay
  // leaf clears the wall and opens to the profile's full 99°, while the wider
  // one is held square at 90. Nine degrees of hinge, taken from the wrong leaf.
  assert.ok(
    Math.abs(swingOf(first.w) - swingOf(second.w)) * (180 / Math.PI) > 1,
    'the leaf that was handed its neighbour’s number was more than a degree out',
  );
});

test('F2.2 — the F1 NO-PIERCE assertion holds for both leaves, at every rig angle', () => {
  for (const [name, r] of [['side', onTheSides()], ['partition', onThePartition()]]) {
    const hinges = hardwareInstances(r, P).hinges;
    assert.equal(hinges.length, 6, `${name}: three rows on each of two leaves`);
    for (const h of hinges) {
      const leaf = r.panels.find((p) => p.id === h.panelId);
      const { innerZ, outerZ } = doorHingeDatum(leaf);
      assert.ok(h.z + h.cupDepth <= outerZ - 1e-9, `${name}/${h.panelId}: the procedural cup`);
      for (const deg of ANGLES) {
        const reach = hingeReach(leaf, h, deg);
        assert.ok(reach.a <= outerZ - 1e-6, `${name}/${h.panelId} at ${deg}°: member A`);
        assert.ok(reach.b <= outerZ - 1e-6, `${name}/${h.panelId} at ${deg}°: member B`);
        assert.ok(reach.a <= innerZ + h.cupDepth + 1e-6, `${name}/${h.panelId} at ${deg}°: no deeper than its bore`);
      }
    }
  }
});

test('F2.2 — instance for instance, the two leaves are the same KIND of thing', () => {
  const shape = (h) => Object.keys(h).sort();
  const a = hardwareInstances(onTheSides(), P).hinges;
  const b = hardwareInstances(onThePartition(), P).hinges;
  assert.deepEqual(shape(b[0]), shape(a[0]), 'not even the same record otherwise');
  for (const hand of ['L', 'R']) {
    const ha = a.find((h) => h.side === hand);
    const hb = b.find((h) => h.side === hand);
    assert.equal(hb.dir, ha.dir);
    assert.equal(hb.cupDepth, ha.cupDepth);
    assert.equal(hb.thickness, ha.thickness);
    assert.equal(hb.plateZ, ha.plateZ);
    // The cup sits the same distance in from the leaf's own hinge edge either
    // way — comparing absolute x would be comparing door widths.
    const fromEdge = (r, h) => {
      const leaf = r.panels.find((p) => p.id === h.panelId);
      return Math.abs(h.x - (h.side === 'R' ? leaf.box.x + leaf.box.w : leaf.box.x));
    };
    assert.equal(fromEdge(onThePartition(), hb), fromEdge(onTheSides(), ha));
    assert.equal(fromEdge(onThePartition(), hb), P.hinges.cups.xFromHingeEdge);
  }
});

// ─── F2.3 — DISPLAY ONLY ────────────────────────────────────────────────────

test('F2.3 — nothing in this path touches the cut list: CNC delta ZERO', () => {
  const r = onThePartition();
  const before = JSON.stringify({ drills: r.drills, panels: r.panels.map((p) => p.cnc) });
  hardwareInstances(r, P);
  for (const leaf of leavesOf(r)) doorHingeInstances(leaf, { panels: r.panels, centres: r.drillSummary.hinge_centers, profile: P });
  assert.equal(JSON.stringify({ drills: r.drills, panels: r.panels.map((p) => p.cnc) }), before,
    'reading where the hardware is may not move a hole');

  // …and the pair still drills its HINGE classes identically, which is turn
  // 25's claim held. (The partition cabinet also carries the back screws that
  // hold its partition — a fact about the cabinet, not about the hinge path.)
  const hingeKinds = new Set(['cup', 'cup_screw', 'hinge']);
  const classes = (x) => [...new Set(x.drills
    .filter((d) => hingeKinds.has(d.kind))
    .map((d) => `${d.layer}:${d.kind}`))].sort();
  assert.deepEqual(classes(onThePartition()), classes(onTheSides()));
  const count = (x, layer) => x.drills.filter((d) => d.layer === layer).length;
  assert.equal(count(onThePartition(), P.hinges.layer), count(onTheSides(), P.hinges.layer));
  assert.equal(count(onThePartition(), P.hinges.cups.layer), count(onTheSides(), P.hinges.cups.layer));
});
