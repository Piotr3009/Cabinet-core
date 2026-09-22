// ─── TURN 72 · F4 — THE J-PULL IS SEEN, AND ITS LENGTH IS TYPED ───────────
//
// The owner, 22.09.2026:
//
//   *"jak nacisnę J nie pokazuje mi w ogóle tego na wizualizacji, wiem że jest
//   ale nie widać, zrób test; przesuwanie powiększenia J-hand nie może być
//   przesuwakiem, musimy wpisywać liczby, nie będziemy próbowali trafić na ten
//   sam numer co sąsiednie drzwi."*
//
// TWO HALVES, and the first of them is a TEST he asked for by name. Every row
// of `verify/t72/f4-probe.md` is an assertion here, so the answer cannot drift
// without the suite saying so.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { jpullEdgeHeight, jpullRunOf, jpullSpec } from '../src/engine/handles.js';
import { jpullLayers } from '../src/3d/jpullProfile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

/** A retail wardrobe with its doors on and the J-pull chosen. */
function aJpullWardrobe(height = 2200) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height, depth: 600 } });
  A.addDoors(id);
  A.setHandle('jpull');
  return id;
}

const frontsOf = (unitId) => (S().unitResult(unitId)?.panels || [])
  .filter((p) => p.part === 'FRONT' && p.role === 'front');

// ═══ 1 · THE TEST HE ASKED FOR: IS IT ON THE SCREEN AT ALL? ════════════════

test('F4 · the engine cuts the J on BOTH leaves, and says which edge', () => {
  const unitId = aJpullWardrobe();
  const fronts = frontsOf(unitId);
  assert.equal(fronts.length, 2, 'a 1800 wardrobe takes two leaves');
  for (const leaf of fronts) {
    assert.ok(leaf.meta?.jpull, `${leaf.id} carries no J at all`);
    assert.equal(leaf.meta.jpull.class, 'tall-door');
    assert.ok(leaf.cnc?.jpull, `${leaf.id} was not MACHINED`);
  }
  // The two Js meet in the middle, which is where a hand goes.
  assert.deepEqual(fronts.map((p) => p.meta.jpull.edge), ['R', 'L']);
});

test('F4 · the run is the engine\'s own, and the leaf\'s own ceiling clamps it', () => {
  const unitId = aJpullWardrobe();
  const leaf = frontsOf(unitId)[0];
  const spec = jpullSpec(P);
  const want = jpullRunOf(jpullEdgeHeight(leaf, leaf.meta.jpull.edge), spec);
  assert.deepEqual(leaf.meta.jpull.run, want, 'the cut run is not the run the engine wants');
  assert.deepEqual(want, { from: 700, to: 1200, clamped: false });

  // …and a SHORT edge is CLAMPED rather than run off the top of the door. It
  // is asked of the pure function, because a wardrobe cannot be built short
  // enough to show it — `profile.wardrobe.minHeight` refuses first, which is
  // the room refusing before the handle does.
  assert.deepEqual(jpullRunOf(1000, spec), { from: 700, to: 1000, clamped: true });
  assert.equal(jpullRunOf(600, spec), null, 'an edge below the start height takes no J');
});

test('F4 · the SCENE emits the channel — three slabs, and the material really is gone', () => {
  const unitId = aJpullWardrobe();
  const leaf = frontsOf(unitId)[0];
  const cut = leaf.cnc.jpull;
  const w = leaf.box.w;
  const h = leaf.box.h;
  const layers = jpullLayers({
    outline: [[0, 0], [w, 0], [w, h], [0, h]],
    w,
    h,
    thickness: leaf.thickness,
    // The SHEET's frame — `panelSolid.js` hands it `panel.cnc.jpull.edge`, and
    // `meta.jpull.edge` is the ROOM's letter. Mixing them is how a probe
    // convicts a sound file.
    edge: cut.edge,
    from: cut.from,
    to: cut.to,
    profile: cut.profile,
  });
  assert.equal(layers.length, 3, 'the lip, the slot and the rear leg');
  assert.deepEqual([layers[0].z0, layers[0].depth], [0, 4.212], 'the lip');
  assert.deepEqual([layers[1].z0, layers[1].depth], [4.212, 10], 'the slot');

  // The deepest point INSIDE the run is the slot's full 40 mm: the notch is
  // two lead-in arcs with a straight run between them, so a sample taken at
  // mid-run finds no vertex and the DEEPEST is the honest measurement.
  const inRun = (pts) => pts.filter((q) => q[1] >= cut.from - 1 && q[1] <= cut.to + 1);
  const pullBack = (pts) => (cut.edge === 'R'
    ? w - Math.min(...inRun(pts).map((q) => q[0]))
    : Math.max(...inRun(pts).map((q) => q[0])));
  assert.equal(Math.round(pullBack(layers[1].pts)), cut.profile.slotDepth, 'the slot is not cut');
  assert.equal(Math.round(pullBack(layers[2].pts)), cut.profile.reliefMm, 'the rear leg is not set back');
});

test('F4 · …and it reaches the scene: shaker hands a J leaf back, panelSolid takes it', () => {
  assert.match(read('src/3d/shakerSolid.js'), /if \(panel\?\.cnc\?\.jpull\?\.edge\) return null;/);
  const solid = read('src/3d/panelSolid.js');
  assert.match(solid, /const jpull = panel\?\.cnc\?\.jpull\?\.edge \? panel\.cnc\.jpull : null;/);
  assert.match(solid, /jpullLayers\(\{/);
  // A leaf whose ONLY feature is the J is still a shape — the early return
  // that would have handed back a plain box names `jpull` among its guards.
  assert.match(solid, /!slopeCut && !bevel3d && !jpull\) \{/);
});

test('F4 · the probe table is committed, and it carries its own verdict', () => {
  const md = read('verify/t72/f4-probe.md');
  assert.match(md, /NOT CONVICTED ON THE GEOMETRY/);
  assert.match(md, /40 mm across the face/);
  assert.match(md, /stripe depth \(mm, into the room\)/);
});

// ═══ 2 · AND ITS LENGTH IS TYPED ═══════════════════════════════════════════

test('F4 · the window has ONE control and it is a number field — no slider', () => {
  for (const rel of [
    'src/components/JpullRunModal.jsx',
    'src/retail/design/detail/JpullRunModal.jsx',
  ]) {
    const modal = read(rel);
    assert.ok(!/type="range"/.test(modal), `${rel} still carries a slider`);
    assert.equal((modal.match(/<NumberField/g) || []).length, 1, `${rel}: one control, not two`);
    assert.match(modal, /data-jpull-run-mm="1"/, `${rel} has no typed field`);
    // The ENGINE's own min and max stand beside it — F4 asks for them by name.
    assert.match(modal, /data-jpull-run-bounds=/, `${rel} does not show the bounds`);
    assert.match(modal, /min=\{MIN_RUN_MM\}/);
    assert.match(modal, /max=\{max\}/);
  }
});

test('F4 · the bounds beside the field are the engine\'s, not typed here', () => {
  const modal = read('src/components/JpullRunModal.jsx');
  // The ceiling is the leaf's own edge less the start height the engine keeps,
  // which is the arithmetic `jpullRunOf` refuses on.
  assert.match(modal, /jpullEdgeHeight\(panel, panel\.meta\?\.jpull\?\.edge \|\| 'R'\)/);
  assert.match(modal, /Math\.floor\(\(edgeH - spec\.fromBottomMm\) \/ STEP_MM\) \* STEP_MM/);
  assert.match(modal, /const spec = jpullSpec\(P\);/, 'the spec is not read from the engine');
  // And nothing here invents a number: 300 and 10 are the two the file names.
  const literals = [...modal.matchAll(/=\s*(\d+);/g)].map((m) => Number(m[1]));
  assert.deepEqual(literals, [300, 10], `the window grew a number: ${literals.join(', ')}`);
});

test('F4 · TWO DOORS TYPED THE SAME NUMBER GET THE SAME RUN', () => {
  // The owner's whole reason for refusing the slider, made an assertion.
  const unitId = aJpullWardrobe();
  const [left, right] = frontsOf(unitId);
  S().setFrontJpullRun(unitId, left.id, 640);
  S().setFrontJpullRun(unitId, right.id, 640);

  const after = frontsOf(unitId);
  const lengths = after.map((p) => Math.round(p.meta.jpull.run.to - p.meta.jpull.run.from));
  assert.deepEqual(lengths, [640, 640], 'the two leaves carry different runs');
  // …and both are machined to it, so the cut agrees with the picture.
  for (const p of after) {
    assert.equal(Math.round(p.cnc.jpull.to - p.cnc.jpull.from), 640);
  }
});

test('F4 · the typed number is clamped by the engine, not by the field', () => {
  const unitId = aJpullWardrobe();
  const leaf = frontsOf(unitId)[0];
  // Longer than the leaf: the store takes it and the engine clamps the cut to
  // the edge, which is `jpullRunOf`'s own `clamped: true`.
  S().setFrontJpullRun(unitId, leaf.id, 9000);
  const after = frontsOf(unitId)[0];
  assert.ok(after.meta.jpull.run.to <= after.box.h + 0.5, 'the J ran off the top of the door');
  assert.equal(after.meta.jpull.run.clamped, true, 'the engine did not say it clamped');
});

test('F4 · the reset still hands the leaf back to the workshop\'s own run', () => {
  const unitId = aJpullWardrobe();
  const leaf = frontsOf(unitId)[0];
  const standard = Math.round(leaf.meta.jpull.run.to - leaf.meta.jpull.run.from);
  S().setFrontJpullRun(unitId, leaf.id, 640);
  assert.notEqual(Math.round(frontsOf(unitId)[0].meta.jpull.run.to
    - frontsOf(unitId)[0].meta.jpull.run.from), standard);
  S().setFrontJpullRun(unitId, leaf.id, null);
  assert.equal(Math.round(frontsOf(unitId)[0].meta.jpull.run.to
    - frontsOf(unitId)[0].meta.jpull.run.from), standard, 'the reset did not put it back');
  assert.match(read('src/components/JpullRunModal.jsx'), /data-jpull-run-reset="1"/);
});

test('F4 · PRO and the copy are the same window, to the line', () => {
  const pro = read('src/components/JpullRunModal.jsx');
  const copy = read('src/retail/design/detail/JpullRunModal.jsx');
  assert.equal(pro.split('\n').length, copy.split('\n').length,
    'the copy is not line-for-line PRO\'s — run scripts/t72-copy.mjs');
  assert.match(read('scripts/t72-copy.mjs'), /src\/components\/JpullRunModal\.jsx/);
});
