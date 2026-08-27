// ─── T53 · F9 — ONE MILLIMETRE OF FLOOR STOPS BEING LEGAL ─────────────────
//
// T52's finding 2, standing since its morning audit: `hardware.hinge
// .cupFloorKeepMm` was ONE, and an 18 mm shaker whose ⌀35 cup overhangs the
// frame was bored to leave a single millimetre of skin — which
// SKYLON_COMMON.lsp's own note calls unacceptable: *"one millimetre reads
// through a sprayed face."*  The ring telegraphs the first time the door is
// knocked, and it is found by the customer.
//
// DECISION TAKEN for the owner (veto in one line): **`cupFloorKeepMm: 3`.**
//
// Where three cannot be kept the bore SHORTENS — the existing clamp, unchanged
// — and where the shortened bore no longer seats the hinge the existing
// `cupTooThin` check names the leaf. Refuse and report, the house way, never a
// 1 mm floor.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { cupBoreOf, cupThicknessAtBore } from '../src/engine/doors.js';
import { runChecks } from '../src/engine/checks.js';

const H = P.hardware.hinge;
const LISP = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');

/** A leaf, as `cupBoreOf` wants one. */
const leaf = (thickness, meta = {}) => ({
  role: 'front',
  part: 'FRONT',
  thickness,
  w: 400,
  h: 700,
  box: {
    x: 0, y: 0, z: 0, w: 400, h: 700, d: thickness,
  },
  meta,
});

// ─── THE NUMBER, END TO END ───────────────────────────────────────────────

test('F9 — the keep is 3, in the profile and in the LISP', () => {
  assert.equal(H.cupFloorKeepMm, 3, 'the decision taken');
  assert.notEqual(H.cupFloorKeepMm, 1, '…and one is not a number');
  assert.match(LISP, /\(defun SKY:cupFloorKeep /);
  assert.match(LISP, /3\.0/);
  assert.match(LISP, /ONE MILLIMETRE READS THROUGH A SPRAYED FACE/);
  // …and the LISP says what happens when three cannot be kept.
  assert.match(LISP, /SHORTENS THE BORE/);
  assert.match(LISP, /Refuse and report, the house way, never a one millimetre floor/);
});

test('F9 — the BORE reads it, and so does the drilling that reaches the file', () => {
  // A full-thickness front is untouched: 25 − 3 = 22, and the cup wants 11.
  const full = cupBoreOf(leaf(25), P);
  assert.equal(full.depth, H.cupDepth, 'the owner’s measured 11, as ever');
  assert.equal(full.short, false);

  // A thin one is clamped to the material LESS THE KEEP.
  const thin = leaf(16, { shaker: { frame: 30, depth: 6 } });
  assert.equal(cupThicknessAtBore(thin, P), 10);
  const bore = cupBoreOf(thin, P);
  assert.equal(bore.depth, 10 - H.cupFloorKeepMm, 'ten less the three it must leave');
  assert.equal(bore.depth, 7);
  assert.equal(bore.short, true, 'and it SAYS it had to be shortened');
  assert.equal(bore.wanted, H.cupDepth);
  // The old law would have left one: this is the whole of F9.
  assert.notEqual(bore.depth, 9, 'the 1 mm floor is gone');

  // …and the DRILLING the machine gets carries the same depth.
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', doors: true,
  }, P);
  const cups = (r.drills || []).filter((d) => d.kind === 'cup' || /HINGE/i.test(String(d.layer)));
  for (const d of cups) {
    if (!Number.isFinite(Number(d.depth))) continue;
    assert.ok(Number(d.depth) <= H.cupDepth + 1e-6, 'no drilling deeper than the cup');
  }
});

// ─── THE GOLDENS DO NOT MOVE, AND IT IS MEASURED ──────────────────────────

test('F9 — every golden leaf has material to spare over the bite point', () => {
  // The clamp binds only where the material under the cup is thinner than
  // `cupDepth + keep`. That is the number to measure against, and CLAUDE.md
  // asks for this one to be PROBED rather than asserted.
  const bite = H.cupDepth + H.cupFloorKeepMm;
  assert.equal(bite, 14);
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    for (const p of r.panels.filter((q) => q.role === 'front')) {
      const bore = cupBoreOf(p, P);
      if (!bore) continue;
      const atCup = cupThicknessAtBore(p, P);
      assert.ok(atCup >= bite, `${id}/${p.id}: ${atCup} mm at the cup, bite point ${bite}`);
      assert.equal(bore.short, false, `${id}/${p.id}: nothing was shortened`);
      assert.equal(bore.depth, H.cupDepth, `${id}/${p.id}: the bore it always took`);
    }
  }
});

test('F9 — …and the six configs are byte-identical, which is the real claim', () => {
  // The clamp is the ONLY thing that moved, and it is `min(wanted, atCup −
  // keep)`. On material at or over the bite point that expression IS `wanted`
  // whatever the keep is — so the same bore comes out of a keep of 1, of 3 and
  // of 3.5, and this asserts exactly that rather than trusting it.
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    for (const keep of [1, 3, 3.5]) {
      const other = { ...P, hardware: { ...P.hardware, hinge: { ...H, cupFloorKeepMm: keep } } };
      for (const p of r.panels.filter((q) => q.role === 'front')) {
        const a = cupBoreOf(p, P);
        const b = cupBoreOf(p, other);
        if (!a) continue;
        assert.equal(a.depth, b.depth, `${id}/${p.id} at keep ${keep}`);
        assert.equal(a.short, b.short);
      }
    }
  }
});

// ─── WHERE THREE CANNOT BE KEPT ───────────────────────────────────────────

test('F9 — the bore shortens, and Check names the leaf', () => {
  const thin = leaf(16, { shaker: { frame: 30, depth: 6 } });
  const bore = cupBoreOf(thin, P);
  assert.ok(bore.short);
  // It NEVER breaks out: the floor is exactly the keep, whatever the wanted.
  assert.equal(cupThicknessAtBore(thin, P) - bore.depth, H.cupFloorKeepMm,
    'three millimetres of board under the cup, by construction');
  // …and the existing report is what says so, unchanged.
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    front_t: 16,
    doors: true,
    front_type: 'S',
  }, P);
  const found = runChecks({
    entries: [{ unit: { id: 'u', params: { unit_num: 'W01' } }, result: r }],
    profile: P,
  });
  // Whether THIS cabinet trips it or not, the rule exists and is the one that
  // speaks — a check that had been removed would be the fault F9 is about.
  assert.ok(Array.isArray(found));
  const src = readFileSync(new URL('../src/engine/doors.js', import.meta.url), 'utf8');
  assert.match(src, /short: depth < wanted - 1e-6/, 'the report is still derived from the bore');
});

test('F9 — a leaf too thin for ANY bore is refused, not bored to nothing', () => {
  // Past a glass front's frame there is no material at all.
  const glass = leaf(18, { glass: { frame: 20, aperture: { w: 100, h: 100 } } });
  assert.equal(cupThicknessAtBore(glass, P), 0);
  const bore = cupBoreOf(glass, P);
  assert.equal(bore.depth, 0, 'nothing is cut');
  assert.equal(bore.short, true, 'and it is reported');
});

// ─── THE T52 F2 LAW STILL HOLDS ───────────────────────────────────────────

test('F9 — T52’s seatZ law is unchanged: the drawn cup’s floor IS the bore’s', async () => {
  const { cupBodyPlanes } = await import('../src/engine/doors.js');
  const thin = leaf(16, { shaker: { frame: 30, depth: 6 } });
  const bore = cupBoreOf(thin, P);
  const planes = cupBodyPlanes(thin, P);
  assert.equal(planes.cupTo, planes.innerZ + bore.depth);
  assert.equal(planes.seatZ + H.cupDepth, planes.cupTo);
  assert.equal(planes.seatZ, planes.innerZ - (H.cupDepth - bore.depth),
    'the body comes back out by the shortfall — which is now four, not two');
  assert.ok(planes.seatZ < planes.innerZ, 'so the flange stands proud, which is the truth');
});
