// ─── T53 · F7 — THE SHOE FRONT COMES UNDER THE DRAWER-FRONT LAW ───────────
//
// The owner, 27.08.2026:
//
//   *"szuflada lub półka na buty powinny mieć te same zasady co szuflady …
//   nie licuje się z frontem, nie licuje się z innymi szufladami, nie wiem
//   dlaczego front zachodzi na szufladę na dole."*
//
// ─── DIAGNOSED: A PARALLEL WORLD, AND EVERY SYMPTOM IS ONE DIVERGENCE ─────
//
// MEASURED on his own case — a 900 wardrobe, two 200 mm drawers, a shoe box
// above — before anything was changed:
//
//     the drawer fronts stand on plane   z = 493   (D − setback − frontT)
//     the shoe face stood on             z = 540   (its own SHOE_SETBACK_X)
//     the drawer stack's PARTITION is at y = 426 … 444
//     the top drawer FRONT finishes at   y = 421
//     the shoe box's floor was written   y = 390
//
// So the face stood 47 mm PROUD of the plane it is meant to be flush with, the
// box stood 36 mm INSIDE the stack (through the partition board), and the face
// overlapped the drawer front below it by 31 mm with no gap at all.
//
// THE FIX IS THE DRAWER-FRONT LAW, IN THREE NUMBERS: the face lands on the
// plane the DRAWER-FRONT panels came out on (READ, not restated); the box
// stands ON the board that closes the stack (`partY + G`) rather than in it;
// and the FACE is placed by the front law — the front below's own top edge
// plus the drawer stack's own gap — because a drawer's box and its front are
// two different placements and so are these.
//
// WHAT DOES NOT CHANGE, because it is his own standing law: the T37 face WIDTH
// (opening − 20, 10 mm clear of BUL and BUR) and the kit's `frontH` of 120.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { shoeConst } from '../src/engine/shoeBox.js';

const G = 18;

/** The owner's own scene: a drawer stack, and a shoe box above it. */
function stackAndShoe(variant = 'D') {
  return computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    doors: true,
    sections: [{
      width_mm: 900,
      items: [
        { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
        { id: 'd2', kind: 'drawer', index: 2, height_mm: 200 },
        { id: 'sb1', kind: 'shoe_box', variant, dividers: 1 },
      ],
    }],
  }, P);
}

const byId = (r, id) => r.panels.find((p) => p.id === id);
const top = (b) => b.y + b.h;

// ─── (1) ONE PLANE ────────────────────────────────────────────────────────

test('F7 — the shoe face is COPLANAR with the drawer fronts of its own carcass', () => {
  const r = stackAndShoe();
  const face = byId(r, 'SHOE1-FR');
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT');
  assert.ok(face && fronts.length >= 2);
  for (const f of fronts) {
    assert.equal(face.box.z, f.box.z, 'the same z as every drawer front');
    assert.equal(face.box.d, f.box.d, '…and the same thickness');
  }
  // The number it used to stand on, so the regression is named rather than
  // merely absent: its own datum was `D − frontT − SHOE_SETBACK_X`.
  const D = 568;
  const own = D - Number(r.params.front_t || 25) - shoeConst(P).setbackX;
  assert.notEqual(face.box.z, own, `${own} was the parallel world’s own plane`);
});

test('F7 — the plane is READ off the drawer front, not restated', () => {
  // A carcass with a drawer front takes that front's plane, whatever it is.
  const r = stackAndShoe();
  const front = r.panels.find((p) => p.part === 'DRAWER-FRONT');
  assert.equal(byId(r, 'SHOE1-FR').box.z, front.box.z);
  // …and a carcass with NO drawers falls back to the same one formula those
  // panels are built from, rather than to the shoe box's own datum.
  const alone = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    doors: true,
    sections: [{ width_mm: 900, items: [{ id: 'sb1', kind: 'shoe_box', variant: 'D' }] }],
  }, P);
  const face = byId(alone, 'SHOE1-FR');
  const D = Number(alone.params.depth) || 0;
  const frontT = Number(alone.params.front_t) || 0;
  assert.equal(face.box.z, D - P.wardrobe.drawers.setback - frontT,
    'the drawer front’s own formula, with nothing to read it off');
});

// ─── (2) THE DOUBLE −G, AND THE BOARD IT WENT THROUGH ─────────────────────

test('F7 — the box stands ON the board that closes the stack, not inside it', () => {
  const r = stackAndShoe();
  const part = byId(r, 'PARTITION');
  assert.ok(part, 'the stack is closed by a partition');
  const floor = byId(r, 'SHOE1-SL').box.y;
  assert.equal(floor, top(part.box), 'the box floor IS the partition’s top face');
  // And no board of the box shares a millimetre with it — the house law.
  for (const p of r.panels.filter((x) => /^SHOE1-/.test(x.id) && x.role !== 'front')) {
    assert.ok(p.box.y >= top(part.box) - 1e-6,
      `${p.id} at ${p.box.y} is not inside the partition (${part.box.y}…${top(part.box)})`);
  }
});

// ─── (3) THE GAP, AND NO OVERLAP ──────────────────────────────────────────

test('F7 — the face keeps the drawer stack’s own gap to the front below', () => {
  const r = stackAndShoe();
  const face = byId(r, 'SHOE1-FR');
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT')
    .sort((a, b) => a.box.y - b.box.y);
  const below = fronts[fronts.length - 1];
  assert.equal(face.box.y - top(below.box), P.wardrobe.drawers.gap,
    'exactly the gap two drawer fronts keep');
  // …which is the same gap the fronts keep between themselves.
  assert.equal(fronts[1].box.y - top(fronts[0].box), P.wardrobe.drawers.gap);
});

test('F7 — the face does NOT overlap the front below (the house law)', () => {
  const r = stackAndShoe();
  const face = byId(r, 'SHOE1-FR');
  for (const f of r.panels.filter((p) => p.part === 'DRAWER-FRONT')) {
    const overlap = Math.min(top(face.box), top(f.box)) - Math.max(face.box.y, f.box.y);
    assert.ok(overlap <= 0, `${f.id}: ${overlap} mm of overlap — none is allowed`);
  }
});

// ─── (4) VERTICAL, ALWAYS ─────────────────────────────────────────────────

test('F7 — the FACE is vertical; the SHELF keeps its tilt', () => {
  const r = stackAndShoe();
  const face = byId(r, 'SHOE1-FR');
  assert.equal(face.meta?.tilt_deg, undefined, 'no tilt on the face');
  assert.equal(face.meta?.tilt_axis, undefined);
  const floor = byId(r, 'SHOE1-BT');
  assert.ok(Number(floor.meta?.tilt_deg) > 0, 'the shoe SHELF still leans — it is the design');
  assert.equal(Number(floor.meta.tilt_deg), shoeConst(P).angleMaxDeg);
});

// ─── WHAT DOES NOT CHANGE ─────────────────────────────────────────────────

test('F7 — the T37 WIDTH law and the kit’s frontH are untouched', () => {
  const r = stackAndShoe();
  const face = byId(r, 'SHOE1-FR');
  assert.equal(face.h, shoeConst(P).frontH, 'the kit’s 120');
  // *"rozszerz front szuflady, tak żeby zostało po prawej i po lewej od BUL i
  // BUR około 10 mm"* — opening − 2 × reveal, centred in the bay.
  const opening = 900 - 2 * G;
  assert.equal(face.w, opening - 2 * shoeConst(P).frontReveal);
  assert.equal(face.box.x, G + shoeConst(P).frontReveal, '10 clear of BUL');
  assert.equal(900 - (face.box.x + face.w), G + shoeConst(P).frontReveal, '…and 10 to BUR');
});

test('F7 — the box, the slope floor, the battens and the runners are what they were', () => {
  const r = stackAndShoe();
  // Every board of the box keeps its own size; only WHERE the box stands moved.
  const sizes = r.panels
    .filter((p) => /^SHOE1-/.test(p.id))
    .map((p) => `${p.id}:${p.w}x${p.h}x${p.thickness}`);
  assert.deepEqual(sizes, [
    'SHOE1-SL:475x80x18',
    'SHOE1-SR:475x80x18',
    'SHOE1-BK:742x80x18',
    'SHOE1-BF:742x80x18',
    'SHOE1-BT:754x454.3x18',
    'SHOE1-DV:742x50x18',
    'SHOE1-BATTEN-L:445x70x30',
    'SHOE1-BATTEN-R:445x70x30',
    'SHOE1-FR:844x120x25',
  ]);
});

test('F7 — a FIX shoe box gets the same three corrections', () => {
  const r = stackAndShoe('F');
  const face = byId(r, 'SHOE1-FR');
  const front = r.panels.find((p) => p.part === 'DRAWER-FRONT');
  assert.equal(face.box.z, front.box.z, 'the same plane');
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT')
    .sort((a, b) => a.box.y - b.box.y);
  assert.equal(face.box.y - top(fronts[fronts.length - 1].box), P.wardrobe.drawers.gap);
  assert.equal(face.meta?.tilt_deg, undefined, 'and it is vertical');
});

// ─── A SHOE BOX ON THE FLOOR IS UNTOUCHED ─────────────────────────────────

test('F7 — a shoe box with nothing under it still sits on the bay floor', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    doors: true,
    sections: [{ width_mm: 900, items: [{ id: 'sb1', kind: 'shoe_box', variant: 'D' }] }],
  }, P);
  assert.equal(byId(r, 'SHOE1-SL').box.y, 0, 'on the floor, exactly as before');
  assert.equal(byId(r, 'SHOE1-FR').box.y, P.wardrobe.drawers.gap,
    'and its face keeps the front gap off the floor, which is the same law');
});
