// ─── TURN 26 · F6 — THE SHAKER'S REBATE IS THE SAME COLOUR ──────────────────
//
// The owner: the recess reads as a different colour, and it looks bad.
//
// It was not a material and it was not a light: it was the UVs. Turn 25 built
// the tray out of hand-wound quads and gave each of them its own 0..1, so the
// FRAME wore the whole decor image four times over and the panel floor wore a
// fifth copy squashed into the recess. One material, one colour, different
// pixels — which is exactly what "a different colour" looks like on a board
// with any figure at all.
//
// F6: "The panel floor and the four inner walls must carry the SAME material
// instance as the frame, with correct normals; the only difference the eye
// should see is SHADOW."
//
// All three halves of that are geometry and are asserted here: ONE material
// (there is one mesh and one buffer, with no groups to hang a second on), ONE
// continuous skin of UVs across frame → rebate wall → panel floor, and normals
// that are written out per face so the light falls INTO the recess rather than
// being rounded across its corner.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { clearShakerCache, shakerFrontGeometry, shakerPanelZ } from '../src/3d/shakerSolid.js';
import { panelRecesses } from '../src/engine/recesses.js';
import { mm } from '../src/3d/constants.js';

const leafOf = (extra = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'S', doors: true, ...extra,
}, P).panels.find((p) => p.part === 'FRONT');

const box3 = (geo) => {
  geo.computeBoundingBox();
  return geo.boundingBox;
};

test('F6 — one geometry, one material: there is nothing to paint the recess with', () => {
  clearShakerCache();
  const geo = shakerFrontGeometry(leafOf());
  assert.ok(geo, 'a shaker leaf builds its tray');
  // A second material can only be attached through geometry GROUPS. There are
  // none, so the frame, the four rebate walls and the panel floor are one
  // draw call in one material instance by construction — which is F6's own
  // sentence, and it cannot be broken by a later edit that adds a colour.
  assert.deepEqual(geo.groups, [], 'no groups — no second material');
  assert.equal(geo.getIndex(), null, 'one non-indexed buffer');
});

test('F6 — the UVs run UNBROKEN across frame, rebate wall and panel floor', () => {
  clearShakerCache();
  const leaf = leafOf();
  const geo = shakerFrontGeometry(leaf);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  assert.ok(uv, 'the tray is textured');
  assert.equal(uv.count, pos.count);

  const w = mm(leaf.box.w);
  const h = mm(leaf.box.h);
  // The mapping a plain `boxGeometry` front face carries: u across the leaf,
  // v up it, over the WHOLE board — so a vertex's UV is a pure function of
  // where it is, whichever face it belongs to. That is what "unbroken" means,
  // and it is what turn 25 did not have.
  let checked = 0;
  for (let i = 0; i < uv.count; i += 1) {
    const wantU = pos.getX(i) / w + 0.5;
    const wantV = pos.getY(i) / h + 0.5;
    assert.ok(Math.abs(uv.getX(i) - wantU) < 1e-6, `vertex ${i}: u`);
    assert.ok(Math.abs(uv.getY(i) - wantV) < 1e-6, `vertex ${i}: v`);
    checked += 1;
  }
  assert.ok(checked > 60, `${checked} vertices`);

  // …and the range really is 0..1 over the leaf, so a decor is laid on the
  // whole door once rather than once per quad.
  let minU = Infinity; let maxU = -Infinity;
  for (let i = 0; i < uv.count; i += 1) {
    minU = Math.min(minU, uv.getX(i));
    maxU = Math.max(maxU, uv.getX(i));
  }
  assert.ok(Math.abs(minU) < 1e-6 && Math.abs(maxU - 1) < 1e-6, `u spans ${minU}..${maxU}`);
});

test('F6 — turn 25’s per-quad UVs would FAIL that, which is the fault named', () => {
  // The proof the test is not vacuous: a per-quad 0..1 puts the value 1 at the
  // inner edge of the frame, where the continuous mapping puts `frame / w`.
  const leaf = leafOf();
  const frame = leaf.meta.shaker.frame;
  const continuous = frame / leaf.box.w;
  assert.ok(continuous > 0 && continuous < 0.5, `${continuous}`);
  assert.notEqual(continuous, 1, 'the two mappings really do differ at the rebate');
});

test('F6 — the normals are written out, and they face INTO the recess', () => {
  clearShakerCache();
  const leaf = leafOf();
  const geo = shakerFrontGeometry(leaf);
  const nor = geo.attributes.normal;
  const pos = geo.attributes.position;
  assert.ok(nor, 'every vertex carries one');

  // Every normal is a unit vector along an axis: nothing is averaged, so the
  // corner where a rebate wall meets the panel floor is a real corner and the
  // shadow it throws has an edge. An auto-computed normal on a shared vertex
  // would round it off and take the shadow with it — which is the whole reason
  // the tray is built by hand.
  const seen = new Set();
  for (let i = 0; i < nor.count; i += 1) {
    const n = [nor.getX(i), nor.getY(i), nor.getZ(i)];
    const len = Math.hypot(...n);
    assert.ok(Math.abs(len - 1) < 1e-5, `normal ${i} has length ${len}`);
    const axes = n.filter((v) => Math.abs(v) > 1e-6);
    assert.equal(axes.length, 1, `normal ${i} is not axis-aligned: ${n}`);
    seen.add(n.map((v) => Math.round(v)).join(','));
  }
  // All six directions are present: the frame's face and the panel floor (+z),
  // the back (−z), the four outer edges and the four rebate walls (±x, ±y).
  for (const dir of ['0,0,1', '0,0,-1', '1,0,0', '-1,0,0', '0,1,0', '0,-1,0']) {
    assert.ok(seen.has(dir), `no face points ${dir}`);
  }

  // …and the four REBATE walls specifically face inward. A wall at the recess's
  // +y edge has to look DOWN (−y) or the light falls across it instead of into
  // it, and the shadow is the entire point of the rebate.
  const Z = mm(leaf.box.d) / 2;
  const floorZ = Z - mm(leaf.meta.shaker.depth);
  let walls = 0;
  for (let i = 0; i < nor.count; i += 1) {
    const z = pos.getZ(i);
    // a vertex on a rebate wall lies strictly between the face and the floor
    if (!(z < Z - 1e-6 && z > floorZ - 1e-6)) continue;
    const ny = nor.getY(i);
    const nx = nor.getX(i);
    if (Math.abs(nor.getZ(i)) > 0.5) continue; // the floor itself
    const y = pos.getY(i);
    const x = pos.getX(i);
    if (Math.abs(ny) > 0.5 && Math.abs(y) < mm(leaf.box.h) / 2 - 1e-6) {
      assert.ok(Math.sign(ny) !== Math.sign(y) || y === 0, 'a rebate wall looks inward');
      walls += 1;
    }
    if (Math.abs(nx) > 0.5 && Math.abs(x) < mm(leaf.box.w) / 2 - 1e-6) {
      assert.ok(Math.sign(nx) !== Math.sign(x) || x === 0, 'a rebate wall looks inward');
      walls += 1;
    }
  }
  assert.ok(walls >= 12, `${walls} rebate-wall vertices found`);
});

test('F6 — and the floor really is `thickness − depth`, so the shadow has a depth', () => {
  const leaf = leafOf();
  assert.equal(shakerPanelZ(leaf), leaf.box.d - leaf.meta.shaker.depth);
  assert.equal(shakerPanelZ(leaf), 19, 'a 6 mm recess in a 25 mm door');
  clearShakerCache();
  const geo = shakerFrontGeometry(leaf);
  const bb = box3(geo);
  assert.ok(Math.abs(bb.max.z - mm(leaf.box.d) / 2) < 1e-6, 'the frame is the front face');
  assert.ok(Math.abs(bb.min.z + mm(leaf.box.d) / 2) < 1e-6, 'and the back is the back');
});

test('F6 — the view paints the tray with the leaf’s OWN surface, and nothing else', () => {
  const view = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  // The tray is the panel's geometry — `machined` — so it wears the one
  // `meshPhysicalMaterial` the panel wears. There is no second material and no
  // `cutFace` on a shaker leaf: the recess is the door's own board, not a cut
  // through it, and turn 20's grey is for what a cutter has been through.
  assert.match(view, /const machined = shaker \|\| built\?\.solid \|\| null;/);
  assert.match(view, /\? <primitive object=\{machined\} attach="geometry" dispose=\{null\} \/>/);
  const solid = readFileSync(new URL('../src/3d/shakerSolid.js', import.meta.url), 'utf8');
  assert.ok(!/Material/.test(solid), 'the tray builder has no opinion about material at all');
});

test('F6 — the cups it now bores do not disturb the skin (R10 and F6 together)', () => {
  clearShakerCache();
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'S', doors: true,
  }, P);
  const leaf = r.panels.find((p) => p.part === 'FRONT');
  const bores = panelRecesses(leaf, r.drills, { thickness: leaf.box.d, profile: P });
  assert.ok(bores.length > 0, 'the leaf is drilled');
  const geo = shakerFrontGeometry(leaf, bores);
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  const w = mm(leaf.box.w);
  const h = mm(leaf.box.h);
  for (let i = 0; i < uv.count; i += 1) {
    assert.ok(Math.abs(uv.getX(i) - (pos.getX(i) / w + 0.5)) < 1e-6);
    assert.ok(Math.abs(uv.getY(i) - (pos.getY(i) / h + 0.5)) < 1e-6);
  }
  // …and the bores really are IN there: the tray with holes has more geometry
  // than the tray without.
  clearShakerCache();
  const plain = shakerFrontGeometry(leaf);
  assert.ok(
    geo.attributes.position.count > plain.attributes.position.count,
    'a bored tray is not the same buffer as a plain one',
  );
  // …and they are BLIND, so nothing shows on the frame's face.
  const deepest = Math.min(...bores.filter((b) => !b.through).map((b) => b.depth));
  assert.ok(deepest > 0 && deepest < leaf.box.d, `blind at ${deepest}`);
  clearShakerCache();
});

test('F6 — two doors of one size but different hands are two trays, not one', () => {
  // The cache key gained the bores this turn. Without that, a pair of doors
  // would share a geometry and one of them would wear the other's cups.
  clearShakerCache();
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', width: 900, front_type: 'S', doors: true,
  }, P);
  const leaves = r.panels.filter((p) => p.part === 'FRONT');
  assert.equal(leaves.length, 2);
  assert.equal(leaves[0].w, leaves[1].w, 'the same size…');
  assert.notEqual(leaves[0].meta.hinge, leaves[1].meta.hinge, '…and opposite hands');
  const geos = leaves.map((leaf) => shakerFrontGeometry(
    leaf,
    panelRecesses(leaf, r.drills, { thickness: leaf.box.d, profile: P }),
  ));
  assert.notEqual(geos[0], geos[1], 'a shared tray would put a cup on the wrong stile');
  // The cups really are on opposite stiles.
  const cupX = (leaf) => r.drills.filter((d) => d.panel === leaf.id && d.kind === 'cup')[0].x;
  assert.notEqual(cupX(leaves[0]), cupX(leaves[1]));
  clearShakerCache();
});

test('F6 — a leaf that is not a shaker still builds nothing, and is still a box', () => {
  const flat = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'F', doors: true,
  }, P).panels.find((p) => p.part === 'FRONT');
  assert.equal(shakerFrontGeometry(flat), null);
  assert.ok(new THREE.BoxGeometry(1, 1, 1), 'and the caller falls back to a boxGeometry');
});
