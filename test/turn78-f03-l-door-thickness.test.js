// ─── T78 · F3 · AN L DOOR WITH A DECORATIVE FRONT READ 40 MM THICK ──────────
//
// The owner, 11.10.2026: *"drzwiczki na L shape sa i jak sa ozdobne to maja
// grubosc okolo 40 mm."*
//
// THE PROBE (verify/t78/f03-probe.md): the RECORDS were right all along (both
// leaves 25 thick in the cut list, Flat, Shaker, Grooved, Ornate, Arched); the
// L's door B hangs along Z (`meta.swingZ`), so its box carries its WIDTH in
// `box.d` and its THICKNESS in `box.w`, and the two carved-solid builders
// (`3d/frontDecorationSolid.js`, `3d/shakerSolid.js`) read the box as every
// other leaf's: a Grooved or Arched door B was carved as a block as thick as
// the door was wide (312.5 on a 25 mm leaf, 287.5 mm back into the carcass:
// rows 15, 16, 25, 26), and a Shaker door B lost its tray (w 25 <= 2 x 60) and
// fell to a plain box. So the 40 was not a wrong number: it was a solid of the
// wrong size spreading about the leaf's centre, read by eye. The fix: the
// builders read the leaf's OWN cut size (`cutSizeOf`: w, h, thickness, the cut
// list's numbers), and the scene turns the carved solid a quarter about Y onto
// its arm. Records, cut list and BOM are untouched.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultFrontDecoration } from '../src/engine/frontDecoration.js';
import { cutSizeOf, frontDecorationGeometry } from '../src/3d/frontDecorationSolid.js';
import { shakerFrontGeometry } from '../src/3d/shakerSolid.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const L = (style, over = {}) => computeCabinet({
  ...defaultParamsFor('CORNER_L_BASE', P),
  unit_num: 'CL01',
  doors: true,
  front_type: style,
  ...(style && style !== 'F' && style !== 'S' ? { front_decoration: defaultFrontDecoration(style, P) } : {}),
  ...over,
}, P);
const size = (geometry) => {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((v) => Math.round(v * 1000 * 10) / 10);
};
const doorB = (r) => r.panels.find((p) => p.id === 'CL01-B-F');
const doorA = (r) => r.panels.find((p) => p.id === 'CL01-A-F');

test('PROBE · the records: door B hangs along Z, its box holds its width in d and its thickness in w; the cut list says 25 on both', () => {
  const r = L('F');
  const b = doorB(r);
  assert.ok(b.meta.swingZ, 'door B swings along Z');
  assert.equal(b.thickness, 25);
  assert.equal(b.box.w, 25, 'its thickness stands in box.w');
  assert.equal(b.box.d, b.w, 'its width stands in box.d');
  assert.equal(doorA(r).box.d, 25);
  const csv = r.csvLines.filter((l) => /CL01-[AB]-F/.test(l));
  assert.equal(csv.length, 2);
  assert.deepEqual(cutSizeOf(b), { w: b.w, h: b.h, thickness: 25 });
  assert.deepEqual(cutSizeOf(doorA(r)), { w: doorA(r).w, h: doorA(r).h, thickness: 25 });
});

test('F3 · a Grooved or Arched door B is carved as a 25 mm leaf of its own width, not a block as thick as it is wide', () => {
  for (const style of ['G', 'A']) {
    const r = L(style);
    const b = doorB(r);
    assert.equal(b.meta.frontDecoration?.status, 'ready', `${style} ready on door B`);
    const g = frontDecorationGeometry(b);
    assert.ok(g, `${style}: a carved solid`);
    const [w, h, d] = size(g);
    assert.equal(d, 25, `${style}: 25 mm through the board (the probe measured ${b.w})`);
    assert.equal(w, Math.round(b.w * 10) / 10, `${style}: its own width across`);
    assert.equal(h, b.h);
    // Door A, the plain hand, is what it always was.
    const a = doorA(r);
    assert.deepEqual(size(frontDecorationGeometry(a)), [Math.round(a.w * 10) / 10, a.h, 25]);
  }
});

test('F3 · a Shaker door B keeps its tray (the probe found it fell to a plain box because w read as 25)', () => {
  const r = L('S');
  const b = doorB(r);
  assert.ok(b.meta?.shaker, 'a shaker record');
  const tray = shakerFrontGeometry(b);
  assert.ok(tray, 'the tray is built');
  const [w, h, d] = size(tray);
  assert.equal(d, 25);
  assert.equal(w, Math.round(b.w * 10) / 10);
  assert.equal(h, b.h);
});

test('F3 · the scene turns a carved door B a quarter onto its arm: +90 for the left hand (facing +x), -90 for the right', () => {
  const src = read('src/3d/UnitView.jsx');
  // AMENDED BY T78 F7 (same turn): the rule is shared with the drawer front on arm B (`meta.faceX`).
  assert.match(src, /const turned = Boolean\(\(alongZ \|\| faceX\) && \(decoration \|\| shaker\)\);/);
  assert.match(src, /-\(Number\(p\.meta\.swingZ\.dir\) \|\| -1\) \* \(Math\.PI \/ 2\)/);
  // AMENDED AFTER THE PART A WALK (12.10.2026): the walk's first frame was a dead
  // canvas: `turned` read `alongZ` before its `const` (a temporal dead zone throw on
  // every render), and a regex test cannot see that. The order is asserted now:
  // every fact `turned` reads is declared above it in MovingPanel.
  const body = src.slice(src.indexOf('export function MovingPanel('));
  const at = (re) => { const m = body.match(re); assert.ok(m, String(re)); return m.index; };
  const turnedAt = at(/const turned = Boolean/);
  for (const re of [/const drops = front === 'door'/, /const alongZ = front === 'door'/, /const bifold = front === 'door'/, /const faceX = front === 'drawer'/, /const decoration = useMemo/, /const shaker = useMemo/]) {
    assert.ok(at(re) < turnedAt, `${re} is declared before turned reads it`);
  }
  assert.match(src, /rotation=\{\[0, turnY, 0\]\}/);
  // The hands: left hand door B faces +x (dir -1 -> +90), right hand faces -x (dir 1 -> -90).
  const left = doorB(L('G'));
  const right = doorB(L('G', { corner_side: 'right' }));
  assert.equal(left.meta.swingZ.dir, -1);
  assert.equal(right.meta.swingZ.dir, 1);
  const turn = (dir) => -(dir) * (Math.PI / 2);
  const f = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, turn(left.meta.swingZ.dir), 0));
  assert.ok(Math.abs(f.x - 1) < 1e-9, 'the carved front (+z in the leaf) faces +x on the left hand');
  const g = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, turn(right.meta.swingZ.dir), 0));
  assert.ok(Math.abs(g.x + 1) < 1e-9, 'and -x on the right hand');
  // The parent's +x (its hinge-to-free run) maps to -z on the left hand, as the engine placed door B.
  const px = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, turn(left.meta.swingZ.dir), 0));
  assert.ok(Math.abs(px.z + 1) < 1e-9);
  // The bores take the leaf's thickness too.
  assert.match(src, /thickness: Number\(p\.thickness\) > 0 \? Number\(p\.thickness\) : p\.box\.d, profile/);
});

test('F3 · every other front is untouched: a BUD leaf\'s carved solid and tray are its box (w, h, 25)', () => {
  for (const style of ['G', 'A']) {
    const r = computeCabinet({
      ...defaultParamsFor('BUD', P), unit_num: '01', doors: true, front_type: style, front_decoration: defaultFrontDecoration(style, P),
    }, P);
    const f = r.panels.find((p) => p.id === '01-F');
    assert.deepEqual(size(frontDecorationGeometry(f)), [Math.round(f.box.w * 10) / 10, f.box.h, f.box.d]);
  }
  const s = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', doors: true, front_type: 'S' }, P);
  const f = s.panels.find((p) => p.id === '01-F');
  assert.deepEqual(size(shakerFrontGeometry(f)), [Math.round(f.box.w * 10) / 10, f.box.h, f.box.d]);
});
