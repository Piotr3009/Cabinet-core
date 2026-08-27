// ─── T52 · F2 — THE CUP DOES NOT SHOW THROUGH THE FACE ─────────────────────
//
// The owner, 26.08.2026, of a 25 mm shaker: *"nie działa — nadal widać
// zawiasy."*
//
// T51's F5 was a real fix for a real fault — a thin front bored through — and
// on THIS door it cannot even fire: 25 mm less a 6 mm rebate is 19 mm of
// material under an 11 mm cup, and the bore is the number it always was. So
// this is a different fault and CLAUDE.md puts it in the SCENE, not the bore.
//
// ─── WHAT WAS ACTUALLY WRONG ────────────────────────────────────────────────
//
// Nothing in this app said, in ONE place, which WAY the cup runs through a
// door's thickness. The only sentence about it was a comment in
// `3d/Hardware.jsx` — a cylinder "at `z + cupDepth/2`" inside "the door's
// 25 mm" — describing procedural stand-ins that the chat fix of 14.08.2026
// REMOVED. The comment outlived the code, and a number nobody can measure is a
// number nobody can be wrong about out loud.
//
// The law is `engine/doors.js cupBodyPlanes` now, published per hinge by
// `engine/hardware3d.js`, and this file MEASURES it — CLAUDE.md: *"Prove it by
// measurement, not by eye: assert the cup body's far plane sits at `innerZ +
// bore.depth` and that the boss lies entirely at `z < innerZ`."*
//
// The measurement it also closes: the model was seated on the profile's
// NOMINAL cup depth whatever this leaf's bore turned out to be, so on a leaf
// whose bore had to be shortened the drawn cup went deeper than the hole.
// `seatZ` ends that.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { cupBodyPlanes, cupBoreOf, doorHingeDatum } from '../src/engine/doors.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';

const H = P.hardware.hinge;
const CUPS = P.hinges.cups;
const REACH = CUPS.xFromHingeEdge + CUPS.diameter / 2;   // 21.5 + 17.5 = 39

/** A front leaf, as the engine publishes one. */
const front = (thickness, meta = {}) => ({
  id: 'F1',
  part: 'FRONT',
  box: {
    x: 0, y: 0, z: 573, w: 600, h: 700, d: thickness,
  },
  meta: { hinge: 'L', ...meta },
});

// ─── THE SIGN AND THE DATUM ────────────────────────────────────────────────

test('F2 — the datum is the door’s INNER face, and +z is the room', () => {
  const leaf = front(25);
  const d = doorHingeDatum(leaf);
  assert.equal(d.innerZ, 573, 'box.z IS the inner face');
  assert.equal(d.outerZ, 598, '…and box.z + box.d is the face the customer sees');
  assert.ok(d.outerZ > d.innerZ, 'so the board is entered by travelling in +z');
});

test('F2 — the CUP runs from innerZ INTO the board, and stops on the bore floor', () => {
  for (const t of [25, 22, 19, 18, 16]) {
    const leaf = front(t);
    const planes = cupBodyPlanes(leaf, P);
    const bore = cupBoreOf(leaf, P);
    assert.equal(planes.cupFrom, planes.innerZ, `${t}: the bit enters at the inner face`);
    // CLAUDE.md's own assertion, literally.
    assert.equal(planes.cupTo, planes.innerZ + bore.depth, `${t}: the far plane is the bore floor`);
    assert.ok(planes.cupTo > planes.cupFrom, `${t}: INTO the board, not out of it`);
    assert.ok(planes.cupTo < planes.outerZ, `${t}: and it never reaches the face`);
  }
});

test('F2 — the BOSS stands proud on the CARCASS side, entirely at z < innerZ', () => {
  for (const t of [25, 18, 16]) {
    const planes = cupBodyPlanes(front(t), P);
    assert.equal(planes.bossTo, planes.innerZ, `${t}: it starts at the door’s back face`);
    assert.equal(planes.bossFrom, planes.innerZ - H.bossHeight, `${t}: and runs its own height out`);
    assert.ok(planes.bossFrom < planes.innerZ && planes.bossTo <= planes.innerZ,
      `${t}: entirely on the carcass side`);
  }
  assert.ok(H.bossHeight > 0, 'the number the profile has carried since turn 7');
});

// ─── THE OWNER'S OWN DOOR ──────────────────────────────────────────────────

test('F2 — the owner’s 25 mm shaker: 19 under the cup, 11 bored, 8 of floor', () => {
  // *"a 25 mm shaker, rebate 6, so 19 mm of material under an 11 mm cup."*
  // The frame has to be narrower than the cup's reach for the rebate to be
  // under it at all — which is the door he photographed.
  const leaf = front(25, { shaker: { frame: 30, depth: 6 } });
  assert.ok(REACH > 30, 'the ⌀35 cup at 21.5 overhangs a 30 mm frame');
  const bore = cupBoreOf(leaf, P);
  assert.equal(bore.thicknessAtCup, 19, '25 less the 6 mm rebate');
  assert.equal(bore.depth, 11, 'and T51’s fix cannot fire — the bore is the number it always was');
  assert.equal(bore.short, false);

  const planes = cupBodyPlanes(leaf, P);
  assert.equal(planes.cupTo, planes.innerZ + 11);
  assert.equal(planes.outerZ - planes.cupTo, 14, 'fourteen millimetres of board between cup and face');
  assert.equal(planes.innerZ + bore.thicknessAtCup - planes.cupTo, 8,
    '…and eight of them under the cup itself, which is the owner’s own arithmetic');
  assert.equal(planes.seatZ, planes.innerZ, 'the hinge fits, so the body sits on the inner face');
});

// ─── AND THE ONE PLACE THE DRAWN CUP COULD BE DEEPER THAN THE HOLE ─────────

test('F2 — a bore that had to be shortened pulls the BODY back with it', () => {
  // CLAUDE.md's worked example from T51: a 16 mm leaf with a frame the cup
  // overhangs. 16 − 6 = 10 of material, so the bore is 9 and not 11 — and a
  // body seated on the nominal would put two millimetres of ⌀35 steel in board
  // the machine never removed.
  //
  // AMENDED BY T53 · F9: the floor under a cup was ONE millimetre and is THREE
  // (*"one millimetre reads through a sprayed face"*, SKYLON_COMMON.lsp). So
  // the same 10 mm of material takes a 7 mm bore, and the shortfall the body
  // comes back out by is 4 rather than 2. The CLAIM this test makes — that the
  // drawn cup's floor lands on the BORE's floor and the flange stands proud —
  // is untouched, and is asserted below off the numbers rather than the
  // literals.
  const leaf = front(16, { shaker: { frame: 30, depth: 6 } });
  const bore = cupBoreOf(leaf, P);
  assert.equal(bore.thicknessAtCup, 10);
  assert.equal(P.hardware.hinge.cupFloorKeepMm, 3, 'T53 F9');
  assert.equal(bore.depth, 7, '10 − the 3 mm floor');
  assert.equal(bore.short, true, 'and Check says so — T51');

  const planes = cupBodyPlanes(leaf, P);
  assert.equal(planes.seatZ, planes.innerZ - (H.cupDepth - bore.depth),
    'the body comes BACK out by the shortfall');
  assert.equal(planes.seatZ + H.cupDepth, planes.cupTo,
    'so the drawn cup’s floor lands on the BORE’s floor, to the millimetre');
  assert.equal(planes.cupTo, planes.innerZ + bore.depth);
  assert.ok(planes.seatZ < planes.innerZ, 'the flange stands proud — which is what really happens');
});

test('F2 — …and it never runs the other way: cupTo > cupFrom on every leaf', () => {
  const leaves = [
    front(25), front(18), front(16),
    front(25, { shaker: { frame: 60, depth: 6 } }),
    front(25, { shaker: { frame: 30, depth: 6 } }),
    front(18, { shaker: { frame: 30, depth: 6 } }),
    front(16, { shaker: { frame: 30, depth: 6 } }),
  ];
  for (const leaf of leaves) {
    const planes = cupBodyPlanes(leaf, P);
    assert.ok(planes.cupTo > planes.cupFrom, 'the cup goes INTO the board');
    assert.ok(planes.bossFrom < planes.bossTo, 'the boss goes OUT of it');
    assert.ok(planes.bossTo <= planes.innerZ, 'and the boss is never inside the leaf’s far half');
    assert.ok(planes.cupTo <= planes.outerZ - 1e-9, 'nothing of the cup reaches the face');
  }
});

// ─── WHAT THE SCENE IS HANDED ──────────────────────────────────────────────

test('F2 — every hinge instance carries the four planes and the seat', () => {
  const cabinets = {
    BUD: computeCabinet({
      type: 'BUD', width: 600, height: 720, depth: 570, unit_num: '01',
    }, P),
    WUD: computeCabinet({
      type: 'WUD', width: 600, height: 720, depth: 400, unit_num: '02',
    }, P),
    THIN: computeCabinet({
      type: 'BUD', width: 600, height: 720, depth: 570, front_t: 18, unit_num: '03',
    }, P),
  };
  let measured = 0;
  for (const [name, r] of Object.entries(cabinets)) {
    const { hinges } = hardwareInstances(r, P);
    assert.ok(hinges.length > 0, `${name} mounts hinges`);
    for (const h of hinges) {
      const leaf = r.panels.find((p) => p.id === h.panelId);
      const { innerZ, outerZ } = doorHingeDatum(leaf);
      const bore = cupBoreOf(leaf, P);
      assert.equal(h.cupFrom, innerZ, `${name}: the cup starts at the inner face`);
      assert.equal(h.cupTo, innerZ + bore.depth, `${name}: …and stops on the bore floor`);
      assert.ok(h.cupTo < outerZ, `${name}: never the face`);
      assert.ok(h.bossFrom < innerZ && h.bossTo <= innerZ, `${name}: the boss is on the carcass side`);
      assert.equal(h.seatZ, innerZ, `${name}: a leaf the hinge fits seats on the inner face`);
      measured += 1;
    }
  }
  assert.ok(measured >= 6, `${measured} hinges measured`);
});

test('F2 — the VIEW consumes the law and measures nothing of its own', () => {
  const src = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');
  assert.ok(src.includes('const seatOf = (h) =>'), 'one reader for where the body is set down');
  assert.ok(src.includes('mm(seatOf(items[i])) - pivot[2]'),
    'and both members stand on it — they are jointed, so they are one point');
  // The comment that this whole feature was written against is gone: it
  // described a procedural cylinder deleted on 14.08.2026.
  assert.ok(!src.includes('z + cupDepth/2'),
    'the stale sentence about a cylinder that no longer exists is gone');
  assert.ok(!/cupDepth\s*\/\s*2/.test(src), 'and no second arithmetic replaced it');

  const engine = readFileSync(new URL('../src/engine/doors.js', import.meta.url), 'utf8');
  assert.ok(engine.includes('export function cupBodyPlanes('), 'the law is in the engine');
  assert.match(engine, /nie działa — nadal widać/, 'with the owner’s sentence beside it');
});
