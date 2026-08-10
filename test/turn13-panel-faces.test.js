// ─── The flickering, vanishing panel faces (turn 13, CLAUDE.md F1) ──────────
//
// Owner's screenshot: looking down into a run of wall units, the TOP panels'
// faces are partly missing and everything shimmers. CLAUDE.md asks for the
// DIAGNOSIS first, the fix at the outline→solid builder, and a guard.
//
// ─── THE DIAGNOSIS ───
//
// One line, `3d/panelSolid.js`'s `makeBasis(u, v, into)`, and one panel class.
//
// A placement (engine/joinery.js) is an orthonormal triple, and until turn 12
// nothing depended on which way round it was — a panel with no tabs was a plain
// box, and a box has no winding to get wrong. Turn 12's F6.2 made every
// machined panel an EXTRUSION of its own outline, and an extrusion carries
// triangles.
//
// Four of the five placements are right-handed against the extrusion direction:
// u × v = −n, so the basis (u, v, into) — `into` being −n, the way the cutter
// goes — has determinant +1 and the geometry is only turned. `panelPlacement`'s
// BACK case already says as much in its own comment. TOP is the one that is
// not: u = +Z, v = +X, so u × v = +Y = +n, and (u, v, into) has determinant −1.
//
// A negative determinant is a REFLECTION. It maps the extruder's
// counter-clockwise triangles to clockwise ones, so every triangle of every TOP
// in the app came out wound backwards. Two symptoms, one cause:
//   • the outward faces were back-face culled — "partly missing" from above;
//   • `computeVertexNormals` read the reversed winding and lit the board from
//     inside, and the shadow pass drew its far side into its own map — the
//     shimmer.
//
// And the third symptom, which the owner reported separately and which has the
// same root: since the panels became extrusions, TOP and BOTTOM grain runs
// front-to-back. ExtrudeGeometry's UV generator works in the SHAPE's plane, so
// the texture axes became the CNC axes — and a TOP is drawn with its CNC x
// along the cabinet's DEPTH, which is machining truth and stays.
//
// ─── THE GUARD ───
//
// Three properties, none of them a list of parts:
//   1. every machined panel's outward face is wound outward, for every kit;
//   2. the determinant of every placement basis is +1 once the builder is done
//      — the invariant the bug broke, checked at the joinery layer so a sixth
//      placement added in turn 15 is covered on the day it lands;
//   3. the grain axis per part class is a CABINET-SPACE rule, the same in both
//      nesting orientations.

import test from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from 'three';
import { computeCabinet } from '../src/engine/cabinet.js';
import { joineryLayers, panelPlacement } from '../src/engine/joinery.js';
import { socketNotches, tabOutlines } from '../src/engine/socketFace.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { machinedPanelGeometry, clearPanelSolidCache } from '../src/3d/panelSolid.js';

const LAYERS = joineryLayers(P, null);
const unit = (id) => computeCabinet(defaultParamsFor(id, P), P);
const isMachined = (panel) => socketNotches(panel, LAYERS).length > 0 || tabOutlines(panel).length > 0;

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Every machined panel of every kit, once. */
function* machinedPanels() {
  for (const id of UNIT_TYPE_ORDER) {
    for (const panel of unit(id).panels) {
      if (panelPlacement(panel) && isMachined(panel)) yield { id, panel };
    }
  }
}

/**
 * The triangles of a solid whose face lies IN the plane `axis = extreme`, with
 * the geometric normal each one's winding gives it.
 *
 * Geometric, not the stored normal attribute: the stored one is computed FROM
 * the winding, so reading it back would only ask the bug about itself.
 */
function outerFaceNormals(geometry, axis, sign) {
  const pos = geometry.attributes.position;
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;
  const at = (i) => {
    const j = index ? index.getX(i) : i;
    return new THREE.Vector3(pos.getX(j), pos.getY(j), pos.getZ(j));
  };
  const component = (p) => p[axis];

  let extreme = -Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    extreme = Math.max(extreme, sign * component(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))));
  }

  const normals = [];
  for (let i = 0; i < count; i += 3) {
    const a = at(i); const b = at(i + 1); const c = at(i + 2);
    // Only the triangles that sit ON the outward face.
    if (![a, b, c].every((p) => Math.abs(sign * component(p) - extreme) < 1e-6)) continue;
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    if (n.lengthSq() < 1e-14) continue;
    normals.push(n.normalize());
  }
  return normals;
}

// ─── 1. the faces are there ─────────────────────────────────────────────────

test('THE GUARD: every machined panel’s outward face is wound OUTWARD, in every kit', () => {
  const wrong = [];
  for (const { id, panel } of machinedPanels()) {
    const geometry = machinedPanelGeometry(panel, LAYERS, P);
    assert.ok(geometry, `${id} ${panel.id}: a machined panel must build a solid`);
    const n = panelPlacement(panel).n;
    const axis = Math.abs(n[0]) > 0.5 ? 'x' : (Math.abs(n[1]) > 0.5 ? 'y' : 'z');
    const sign = n[axis === 'x' ? 0 : (axis === 'y' ? 1 : 2)];
    const faces = outerFaceNormals(geometry, axis, sign);
    assert.ok(faces.length > 0, `${id} ${panel.id}: no triangles on the outward face at all`);
    const inward = faces.filter((f) => sign * f[axis] < 0.5).length;
    if (inward) wrong.push(`${id} ${panel.id} (${panel.part}): ${inward}/${faces.length} triangles face INWARD`);
  }
  clearPanelSolidCache();
  assert.deepEqual(wrong, [], `back-face culling would eat these:\n${wrong.join('\n')}`);
});

test('a wall unit’s TOP is the panel the owner photographed, and it faces up', () => {
  const top = unit('WUD').panels.find((p) => p.part === 'TOP');
  assert.ok(isMachined(top), 'the WUD top carries the joint — that is why it is an extrusion');
  const faces = outerFaceNormals(machinedPanelGeometry(top, LAYERS, P), 'y', 1);
  assert.ok(faces.length > 0);
  for (const f of faces) assert.ok(f.y > 0.5, `a top face pointing ${f.y.toFixed(2)} is culled from above`);
  clearPanelSolidCache();
});

// ─── 2. the invariant that was broken ───────────────────────────────────────

/** The determinant of the basis the builder lays this panel down with. */
function basisDeterminant(panel) {
  const pl = panelPlacement(panel);
  // `into` is the direction the extrusion runs: the opposite of the outward
  // normal. A negative determinant here IS the reflection.
  return dot(cross(pl.u, pl.v), pl.n.map((x) => -x));
}

test('THE ASYMMETRY: TOP is the one placement whose basis is a reflection', () => {
  // This is the diagnosis, pinned. A placement is MACHINING truth — a TOP's CNC
  // x really does run along the cabinet's depth, and turning the frame round to
  // make the determinant tidy would move the drilling. So the handedness is not
  // something to fix here; it is something the SOLID BUILDER has to cope with,
  // and this test says which case it must cope with and that the case is real.
  const handed = new Map();
  for (const { panel } of machinedPanels()) {
    const key = `${panel.part}|${panel.cnc?.rotated ? 'rotated' : 'upright'}`;
    if (!handed.has(key)) handed.set(key, basisDeterminant(panel));
  }
  assert.ok(handed.size >= 5, `every placement class should be exercised, saw ${handed.size}`);
  const mirrored = [...handed].filter(([, det]) => det < 0).map(([key]) => key).sort();
  // ─── Turn 17 (CLAUDE.md F4.1) ───
  // Two more placements land here, and for the reason the note above gives:
  // both are machining truth read off the kit's own drilling, and turning
  // either frame round to tidy the determinant would move a hole.
  //   BACK-RAIL the fridge's back rails, whose CNC x runs UP the rail: its
  //             left-edge sockets are the BOTTOM panel's tabs at G + 95 and
  //             W − G − 95, which is what fixes the frame.
  // (The fridge's FIXED panel gained a placement in the same turn and is drawn
  // `depth × width` like a TOP, so it is a reflection too — but it carries no
  // machining at all, so it is not one of the MACHINED panels this walks.)
  // The builder is unchanged — it decides from the DETERMINANT and not from a
  // list of parts, exactly so that the placement added in a later turn is
  // covered on the day it lands (3d/panelSolid.js).
  assert.deepEqual(mirrored, ['BACK-RAIL|rotated', 'TOP|rotated'].sort(),
    'if this list changes, the builder’s determinant check has a new case to cover — '
    + 'read the note in 3d/panelSolid.js before touching either side');
});

test('THE INVARIANT: whatever the handedness, the solid comes out wound outward', () => {
  // The property the bug broke, stated where it belongs: not "every basis is
  // right-handed" (TOP's is not, and must not be), but "the builder answers for
  // it". Checked on BOTH sides of the asymmetry so neither can rot alone.
  const byHandedness = { mirrored: 0, plain: 0 };
  for (const { id, panel } of machinedPanels()) {
    const n = panelPlacement(panel).n;
    const axis = Math.abs(n[0]) > 0.5 ? 'x' : (Math.abs(n[1]) > 0.5 ? 'y' : 'z');
    const sign = n[axis === 'x' ? 0 : (axis === 'y' ? 1 : 2)];
    const faces = outerFaceNormals(machinedPanelGeometry(panel, LAYERS, P), axis, sign);
    for (const f of faces) {
      assert.ok(sign * f[axis] > 0.5, `${id} ${panel.id}: outward face wound inward`);
    }
    byHandedness[basisDeterminant(panel) < 0 ? 'mirrored' : 'plain'] += 1;
  }
  clearPanelSolidCache();
  assert.ok(byHandedness.mirrored > 0, 'the reflected case must actually be exercised');
  assert.ok(byHandedness.plain > 0, 'so must the ordinary one');
});

// ─── 3. the grain is a cabinet-space rule ───────────────────────────────────

/**
 * Which CABINET axis the texture's U runs along on this solid, and V.
 *
 * Read off the geometry itself — a pair of vertices on one edge, the change in
 * uv against the change in position — because that is what the shader samples.
 */
function textureAxes(geometry) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const axes = {};
  for (const [comp, name] of [['getX', 'x'], ['getY', 'y'], ['getZ', 'z']]) {
    let du = 0; let dv = 0; let dp = 0;
    for (let i = 1; i < pos.count; i += 1) {
      const step = pos[comp](i) - pos[comp](i - 1);
      const others = ['getX', 'getY', 'getZ'].filter((c) => c !== comp)
        .every((c) => Math.abs(pos[c](i) - pos[c](i - 1)) < 1e-9);
      if (!others || Math.abs(step) < 1e-4) continue;
      du += Math.abs((uv.getX(i) - uv.getX(i - 1)) / step);
      dv += Math.abs((uv.getY(i) - uv.getY(i - 1)) / step);
      dp += 1;
    }
    axes[name] = dp ? { u: du / dp, v: dv / dp } : null;
  }
  return axes;
}

/** The cabinet axis the texture's U runs along: 'x', 'y' or 'z'. */
function uAxis(geometry) {
  const axes = textureAxes(geometry);
  let best = null;
  for (const [name, a] of Object.entries(axes)) {
    if (!a || a.u <= a.v) continue;
    if (!best || a.u > axes[best].u) best = name;
  }
  return best;
}

test('THE RULE: a horizontal panel grains along the cabinet’s X, whatever the nesting', () => {
  const wrong = [];
  for (const { id, panel } of machinedPanels()) {
    if (panel.part !== 'TOP' && panel.part !== 'BOTTOM') continue;
    // The machining truth this must NOT follow: a top is nested turned, its CNC
    // x running along the cabinet's depth.
    assert.equal(panel.cnc?.rotated, true, `${id} ${panel.id}: tops are nested turned — joinery.js says so`);
    const axis = uAxis(machinedPanelGeometry(panel, LAYERS, P));
    if (axis !== 'x') wrong.push(`${id} ${panel.id} (${panel.part}): grain along ${axis}, not the cabinet's width`);
  }
  clearPanelSolidCache();
  assert.deepEqual(wrong, [], `${wrong.join('\n')}\n(front-to-back grain on a top is the turn-12 regression)`);
});

test('THE RULE: a vertical panel grains along the cabinet’s height', () => {
  const wrong = [];
  for (const { id, panel } of machinedPanels()) {
    if (panel.part !== 'BUL' && panel.part !== 'BUR') continue;
    // A side's biggest face is ±X, whose box axes are u along Z and v along Y —
    // so the HEIGHT is V here, and the grain runs up it.
    const axes = textureAxes(machinedPanelGeometry(panel, LAYERS, P));
    if (!(axes.y?.v > axes.y?.u)) wrong.push(`${id} ${panel.id}: the cabinet's height is not the side's V axis`);
  }
  clearPanelSolidCache();
  assert.deepEqual(wrong, [], wrong.join('\n'));
});

test('a BACK grains the same way nested upright and nested turned', () => {
  const upright = unit('BUD').panels.find((p) => p.part === 'BACK');
  const turned = unit('FRIDGE').panels.find((p) => p.part === 'BACK');
  assert.equal(Boolean(upright.cnc?.rotated), false, 'a BUD back is drawn upright');
  assert.equal(turned.cnc?.rotated, true, 'KIT_FRIDGE nests its top back turned (turn 12, F10)');

  assert.equal(uAxis(machinedPanelGeometry(upright, LAYERS, P)), 'x');
  assert.equal(uAxis(machinedPanelGeometry(turned, LAYERS, P)), 'x',
    'the nesting turned the DRAWING, not the board — the figure runs the same way on both');
  clearPanelSolidCache();
});

test('the UVs are the 0..1 a box would have carried, not the shape’s millimetres', () => {
  // The repeats in 3d/materials.js are written against a box's 0..1, so an
  // extruder that hands back metres scales every decor by the panel's size.
  for (const { id, panel } of machinedPanels()) {
    const uv = machinedPanelGeometry(panel, LAYERS, P).attributes.uv;
    let lo = Infinity; let hi = -Infinity;
    for (let i = 0; i < uv.count; i += 1) {
      lo = Math.min(lo, uv.getX(i), uv.getY(i));
      hi = Math.max(hi, uv.getX(i), uv.getY(i));
    }
    // A tab standing off the board's edge reaches a little past it, and a
    // relief a little inside — so the span is "about the board", not exactly it.
    assert.ok(lo > -0.2 && hi < 1.2, `${id} ${panel.id}: uv spans ${lo.toFixed(2)}..${hi.toFixed(2)}`);
    assert.ok(hi - lo > 0.8, `${id} ${panel.id}: uv spans only ${(hi - lo).toFixed(2)} of the board`);
  }
  clearPanelSolidCache();
});
