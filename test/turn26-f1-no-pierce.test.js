// ─── TURN 26 · F1 — THE HINGE STOPS PIERCING THE DOOR [CRITICAL] ────────────
//
// The owner measured the real thing: a CLIP top cup is **11 mm** deep in a
// 25 mm door. The scene showed roughly 15 and the body broke through to the
// FRONT face.
//
// Three faults, one plane. `profile.js` carried `cupDepth: 12.5`; the GLB's
// datum was read off the cup slab's NEAR end, standing 16 mm of ⌀35 body inside
// the leaf; and the CNC record stated no depth at all, so `engine/recesses.js`
// bored the cup STRAIGHT THROUGH the door — which is the pierce, literally.
//
// ─── WHAT THIS FILE IS ──────────────────────────────────────────────────────
//
// F1.3, in as many words: "a test walks every hinge instance on every door type
// — plain, shaker, partition-hung, wall, tall — and asserts that NO part of the
// hinge (procedural or GLB, in ANY open angle of turn 24's rig) crosses the
// door's outer face plane. This is the test that makes 'it pierces the front'
// impossible to ship again."
//
// It needs no browser. The GLB is measured straight out of the fixture's bytes
// (scripts/glb-meshes.mjs — no loader, no XHR), placed by the same
// `−min + modelOrigin` transform `3d/glbSource.js` applies, split into members
// by the same `memberOfNode` the rig uses, and member B is folded about the
// same `foldPivotMm` axis. What is asserted is the geometry, not a screenshot.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { cupBoreOf, doorHingeDatum } from '../src/engine/doors.js';
import { panelRecesses } from '../src/engine/recesses.js';
import { ANGLES, hingeFileBox, hingeReach } from './fixtures/hinge-reach.mjs';

const C = P.hardware.hinge.cliptop;
const H = P.hardware.hinge;

// ─── THE OWNER'S NUMBER, AND THE DERIVATION HUNG OFF IT ─────────────────────

test('F1.1 — the cup is ELEVEN millimetres deep, and it is his number', () => {
  assert.equal(H.cupDepth, 11, 'the owner put a rule on a CLIP top');
  // …and the comment beside it says whose it is, so nobody "tidies" it back.
  const src = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  const at = src.indexOf('cupDepth: 11');
  assert.ok(at > 0);
  const above = src.slice(Math.max(0, at - 900), at);
  assert.match(above, /PIOTR MEASURED IT|owner/i, 'the measurement carries its author');
  assert.match(above, /11 mm/);
});

test('F1.2 — the model’s flange plane is DERIVED from the bore, not typed', () => {
  // One identity, and it is what stops the origin being left behind the day the
  // owner re-measures the cup:
  //   flange        = cupBoreFileZ − cupDepth
  //   modelOrigin.z = fileMinZ − flange
  const flange = C.cupBoreFileZ - H.cupDepth;
  assert.equal(flange, 40.3);
  assert.equal(Math.round((C.fileMinZ - flange) * 100) / 100, C.modelOrigin.z);

  // …and the measurements really are the file's.
  const box = hingeFileBox();
  assert.equal(Math.round(box.min.z * 100) / 100, C.fileMinZ);
  assert.equal(Math.round(box.max.z * 100) / 100, C.cupBoreFileZ);
});

// ─── THE ONE DATUM ──────────────────────────────────────────────────────────

test('F1.2 — the datum is the INNER face: never the mid-plane, never a recess floor', () => {
  for (const [name, r] of Object.entries(cabinets())) {
    for (const leaf of leaves(r)) {
      const datum = doorHingeDatum(leaf);
      assert.ok(datum, `${name}/${leaf.id} has a datum`);
      assert.equal(datum.innerZ, leaf.box.z, `${name}/${leaf.id}: the side the bit enters`);
      assert.equal(datum.outerZ, leaf.box.z + leaf.box.d, `${name}/${leaf.id}: the face nothing may cross`);
      // The mid-plane is where the SWINGING GROUP's origin is, and it is 12.5 mm
      // out on a 25 mm leaf. A datum that had drifted onto it would pass every
      // "is it about right" eye test and put the cup half-way through the door.
      assert.notEqual(datum.innerZ, leaf.box.z + leaf.box.d / 2, 'not the mid-plane');
      // A SHAKER's rebate is cut in the OUTER face and moves neither plane.
      if (leaf.meta?.shaker) {
        const floor = leaf.box.z + leaf.box.d - leaf.meta.shaker.depth;
        assert.notEqual(datum.innerZ, floor, 'not the recess floor of a shaker panel');
        assert.equal(datum.thickness, leaf.box.d, 'a shaker is its full board thick at the stile');
      }
    }
  }
});

test('F1.4 — the SHEET states the bore, and the scene reads the sheet (R10)', () => {
  for (const [name, r] of Object.entries(cabinets())) {
    for (const leaf of leaves(r)) {
      const bore = cupBoreOf(leaf, P);
      const cups = r.drills.filter((d) => d.panel === leaf.id && d.kind === 'cup');
      assert.ok(cups.length > 0, `${name}/${leaf.id} is drilled for cups`);
      for (const cup of cups) {
        assert.equal(cup.depth, bore.depth, `${name}/${leaf.id}: the record carries the owner's depth`);
      }
      // …and what the scene bores is that record, blind, to the hundredth.
      const rec = panelRecesses(leaf, r.drills, { thickness: leaf.box.d, profile: P })
        .filter((f) => f.layer === P.hinges.cups.layer);
      assert.equal(rec.length, cups.length, `${name}/${leaf.id}: every cup on the sheet is a bore in the picture`);
      for (const f of rec) {
        assert.equal(f.through, false, 'a cup is BLIND — a through cup IS the pierce');
        assert.ok(Math.abs(f.depth - bore.depth) < 0.01);
      }
    }
  }
});

test('F1.4 — an 18 mm front cannot be bored through by a 25 mm law', () => {
  const thin = computeCabinet({ ...base('BUD'), front_t: 18 }, P);
  const leaf = leaves(thin)[0];
  const bore = cupBoreOf(leaf, P);
  assert.ok(bore.depth <= 18 - P.hardware.hinge.cupFloorKeepMm + 1e-9, `${bore.depth} in an 18 mm board`);
  assert.ok(bore.floorZ < leaf.box.z + leaf.box.d, 'and it stops short of the face');
  const rec = panelRecesses(leaf, thin.drills, { thickness: 18, profile: P })
    .filter((f) => f.layer === P.hinges.cups.layer);
  assert.ok(rec.length > 0);
  for (const f of rec) assert.equal(f.through, false);
});

// ─── THE GUARANTEE (F1.3) ───────────────────────────────────────────────────

test('F1.3 — NO part of a hinge crosses the outer face, on any door type at any angle', () => {
  const report = [];
  for (const [name, r] of Object.entries(cabinets())) {
    const hinges = hardwareInstances(r, P).hinges;
    assert.ok(hinges.length > 0, `${name} mounts hinges at all`);
    for (const h of hinges) {
      const leaf = r.panels.find((p) => p.id === h.panelId);
      const { innerZ, outerZ } = doorHingeDatum(leaf);

      // ── the PROCEDURAL body, as `3d/Hardware.jsx` places it ──
      // cup: from the datum, `h.cupDepth` into the leaf. Boss and arm run the
      // other way — out of the leaf into the carcass opening — so their far
      // faces are behind the datum and are asserted as such rather than assumed.
      assert.ok(h.z + h.cupDepth <= outerZ - 1e-9, `${name}/${h.panelId}: procedural cup`);
      assert.ok(h.z - H.bossHeight < innerZ + 1e-9, `${name}/${h.panelId}: procedural boss`);
      assert.ok(h.z - H.armLength < innerZ + 1e-9, `${name}/${h.panelId}: procedural arm`);

      // ── the DOWNLOADED body, both members, through the rig ──
      //
      // Measured in the LEAF's OWN FRAME, which is the only frame in which the
      // question means anything: member A is clipped into the door and rides
      // it, member B stays on the carcass and FOLDS — so at 110° the two are
      // in two different places in the room and only the leaf can say which of
      // them is inside it. `hingeReach` counter-rotates the carcass half by
      // the door's own swing, exactly as `3d/UnitView.jsx` swings the leaf.
      for (const deg of ANGLES) {
        const reach = hingeReach(leaf, h, deg);
        assert.ok(
          reach.a <= outerZ - 1e-6,
          `${name}/${h.panelId} at ${deg}°: member A reaches ${reach.a.toFixed(2)}, the face is at ${outerZ}`,
        );
        assert.ok(
          reach.b <= outerZ - 1e-6,
          `${name}/${h.panelId} at ${deg}°: member B reaches ${reach.b.toFixed(2)}, the face is at ${outerZ}`,
        );
        report.push({ name, deg, clearance: outerZ - Math.max(reach.a, reach.b) });
      }
    }
  }
  // The guarantee is not vacuous: something was actually measured.
  assert.ok(report.length >= 5 * ANGLES.length, `${report.length} measurements`);
  const tightest = Math.min(...report.map((x) => x.clearance));
  assert.ok(tightest > 0, `tightest clearance ${tightest.toFixed(3)} mm`);
});

test('F1.3 — the half clipped INTO the leaf never goes deeper than its bore', () => {
  // The tighter law, and the one that catches a datum that has drifted: a cup
  // cannot be deeper than the hole drilled for it. Member A is the cup, its
  // flange, the clip cap and the link cover — everything screwed into the door
  // — and it rides the leaf, so this is true at every angle by construction and
  // is asserted at every angle anyway.
  for (const [name, r] of Object.entries(cabinets())) {
    for (const h of hardwareInstances(r, P).hinges) {
      const leaf = r.panels.find((p) => p.id === h.panelId);
      const floor = doorHingeDatum(leaf).innerZ + h.cupDepth;
      for (const deg of ANGLES) {
        const reach = hingeReach(leaf, h, deg);
        assert.ok(
          reach.a <= floor + 1e-6,
          `${name}/${h.panelId} at ${deg}°: the cup reaches ${reach.a.toFixed(2)}, the bore floor is ${floor}`,
        );
      }
    }
  }
});

test('F1.3 — and the guard would CATCH the fault it was written for', () => {
  // Turn 24's datum, restored: the flange on the cup slab's NEAR end. The model
  // then reaches 16 mm into the leaf instead of 11 — the owner's "roughly 15" —
  // and stands 5 mm proud of the bottom of its own hole, which on an 18 or
  // 19 mm front is a hinge in the last two millimetres of the board.
  const r = cabinets().plain;
  const leaf = leaves(r)[0];
  const h = hardwareInstances(r, P).hinges.find((x) => x.panelId === leaf.id);
  const before = { ...C, modelOrigin: { ...C.modelOrigin, z: -64.78 } };
  const was = hingeReach(leaf, h, 0, before);
  const floor = doorHingeDatum(leaf).innerZ + h.cupDepth;
  assert.ok(Math.abs(was.a - (leaf.box.z + 16)) < 0.01, `the old datum reached ${was.a - leaf.box.z} into the leaf`);
  assert.ok(was.a > floor, 'deeper than the hole drilled for it — which is what the guard now forbids');

  // And the OTHER half of the fault, the one that actually showed through the
  // door: a cup with no stated depth is a THROUGH hole, and a ⌀35 through hole
  // in a door is the pierce, literally.
  const naked = r.drills
    .filter((d) => d.panel === leaf.id)
    .map(({ depth, ...rest }) => rest);
  const rec = panelRecesses(leaf, naked, { thickness: leaf.box.d, profile: null })
    .filter((f) => f.layer === P.hinges.cups.layer);
  assert.ok(rec.length > 0);
  assert.ok(rec.every((f) => f.through), 'without a depth and without the policy, a cup goes through');
});

// ─── the fixtures ───────────────────────────────────────────────────────────

const base = (type) => ({ ...defaultParamsFor(type, P), unit_num: '01' });

/** Every door type F1.3 names, each as a computed cabinet. */
function cabinets() {
  return {
    plain: computeCabinet({ ...base('BUD'), front_type: 'F' }, P),
    shaker: computeCabinet({ ...base('BUD'), front_type: 'S' }, P),
    wall: computeCabinet({ ...base('WUD') }, P),
    tall: computeCabinet({ ...base('WARDROBE'), doors: true }, P),
    partition: computeCabinet({
      ...base('BUD'),
      width: 900,
      doors: false,
      sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450, front_mm: 0 }] }],
      bay_doors: [{ door: 'one', hinge: 'R' }, { door: 'one', hinge: 'L' }],
    }, P),
  };
}

const leaves = (r) => r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front' && p.box && !p.meta?.appliance);

