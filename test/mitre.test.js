// ─── The 45° mitre, checked on its vertices (turn 8, CLAUDE.md F6) ───
//
// CLAUDE.md asks for exactly this: "Test geometrii (wierzchołki fazy)". A 45°
// plane through a box is arithmetic, and arithmetic is checkable in node —
// which is the whole reason the cutting lives in the engine and not in a
// component.
//
// What is being tested is not "does it look right". It is:
//   · the chamfer takes an EQUAL bite out of both faces — that is what makes it
//     45° rather than some other bevel;
//   · the solid stays CLOSED, because an open solid renders as a hole through
//     the cabinet, which is worse than the butt joint being replaced;
//   · the two strips of the L end up sharing the joint square instead of
//     butting or overlapping;
//   · and at an open end, the run and its return make a picture-frame corner
//     rather than two boxes cut through each other.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  boxPolyhedron, chamferPlane, clipAll, clipPolyhedron, infillMitre, infillSolid, solidTriangles,
} from '../src/engine/mitre.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const T = P.autoParts.topInfill;
const G = P.board.thickness;

const at = (v, i) => Math.round(v[i] * 1000) / 1000;
const has = (solid, point) => solid.vertices.some((v) => v.every((c, i) => Math.abs(c - point[i]) < 1e-6));

/** Every edge of every face, as an undirected key. A closed solid uses each twice. */
function edgeCounts(solid) {
  const counts = new Map();
  for (const face of solid.faces) {
    for (let i = 0; i < face.length; i += 1) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return counts;
}

function assertClosed(solid, label) {
  for (const [edge, n] of edgeCounts(solid)) {
    assert.equal(n, 2, `${label}: edge ${edge} is used ${n} times — the solid is open`);
  }
}

// ─── the cut itself ─────────────────────────────────────────────────────────

test('a chamfer takes an equal bite out of both faces — that is what 45° means', () => {
  const box = {
    x: 0, y: 0, z: 0, w: 100, h: 40, d: 18,
  };
  // The L joint on a face strip: the top, cut back to meet the shelf behind it.
  const solid = clipPolyhedron(boxPolyhedron(box), chamferPlane(box, 'y', +1, 'z', -1, 18));

  // The FRONT keeps its full height…
  assert.ok(has(solid, [0, 40, 18]), 'the top of the front edge is untouched');
  assert.ok(has(solid, [100, 40, 18]));
  // …and the BACK loses exactly the chamfer, on both axes.
  assert.ok(has(solid, [0, 22, 0]), '40 − 18 up the back');
  assert.ok(has(solid, [100, 22, 0]));
  assert.equal(has(solid, [0, 40, 0]), false, 'the corner itself is gone');
  assert.equal(has(solid, [100, 40, 0]), false);

  // The two legs are equal, measured off the solid itself: the cut runs from
  // (y 40, z 18) to (y 22, z 0), so it takes 18 down the back and 18 along the
  // top. Equal legs IS the 45°.
  const onCut = solid.vertices.filter((v) => Math.abs(at(v, 0)) < 1e-9);
  const alongY = Math.max(...onCut.map((v) => v[1])) - 22;
  const alongZ = 18 - Math.min(...onCut.map((v) => v[2]));
  assert.equal(alongY, 18);
  assert.equal(alongZ, 18);
  assert.equal(alongY, alongZ, 'a bevel with unequal legs is not a mitre');
  assertClosed(solid, 'one chamfer');
});

test('the cut face is a real face, not a hole', () => {
  const box = {
    x: 0, y: 0, z: 0, w: 100, h: 40, d: 18,
  };
  const solid = clipPolyhedron(boxPolyhedron(box), chamferPlane(box, 'y', +1, 'z', -1, 18));
  // Six: the box's four surviving faces (its top collapsed to a line) plus the
  // untouched front, plus the cap. An open solid would have five.
  assert.equal(solid.faces.length, 6);
  const cap = solid.faces.find((f) => f.every((i) => Math.abs(
    solid.vertices[i][1] - solid.vertices[i][2] - 22,
  ) < 1e-6));
  assert.ok(cap, 'the chamfer itself is in the solid');
  assert.equal(cap.length, 4);
});

test('two chamfers on one piece still close', () => {
  const box = {
    x: 0, y: 0, z: 0, w: 100, h: 40, d: 18,
  };
  const solid = clipAll(boxPolyhedron(box), [
    chamferPlane(box, 'y', +1, 'z', -1, 18),
    chamferPlane(box, 'x', -1, 'z', -1, 18),
  ]);
  assertClosed(solid, 'two chamfers');
  assert.ok(has(solid, [18, 0, 0]), 'the left end is cut back at the rear');
  assert.ok(has(solid, [0, 0, 18]), 'and reaches the corner at the front');
});

test('a solid becomes triangles with outward normals', () => {
  const box = {
    x: 0, y: 0, z: 0, w: 100, h: 40, d: 18,
  };
  const solid = clipPolyhedron(boxPolyhedron(box), chamferPlane(box, 'y', +1, 'z', -1, 18));
  const tri = solidTriangles(solid);
  assert.ok(tri.indices.length >= 3 * 6);
  assert.equal(tri.positions.length, tri.normals.length);
  // Every normal is a unit vector, and the front face's points outwards (+Z).
  for (let i = 0; i < tri.normals.length; i += 3) {
    const len = Math.hypot(tri.normals[i], tri.normals[i + 1], tri.normals[i + 2]);
    assert.ok(Math.abs(len - 1) < 1e-9);
  }
  const frontIndex = [...Array(tri.positions.length / 3).keys()]
    .find((i) => Math.abs(tri.positions[i * 3 + 2] - 18) < 1e-9 && Math.abs(tri.normals[i * 3 + 2] - 1) < 1e-9);
  assert.ok(frontIndex != null, 'the front of the strip faces the room');
});

// ─── the top infill, piece by piece ─────────────────────────────────────────

const runUnit = (ends, returns) => computeCabinet({
  type: 'BUDTALL',
  width: 600,
  height: 2100,
  depth: 558,
  unit_num: 'T01',
  doors: { count: 1 },
  run_top_infill: {
    role: 'owner',
    offset: 0,
    length: 600,
    faceH: T.defaultHeight,
    thickness: null,
    ends,
    returns,
    unitIds: null,
  },
}, P);

const pieceOf = (r, id) => r.panels.find((p) => p.id === id);

// ─── T48-F2 AMENDS THIS ─────────────────────────────────────────────────────
// ─── OVERRULED, 25.08.2026 ──────────────────────────────────────────────────
//
// The owner, 25.08.2026: *"zamiast L shape … pomyslem zeby na wizualizacji
// tylko zrobic jedna deske jak plinth i tyle. … infill pionowy nie ruszamy.
// natomiast na CNC robisz tak: dlugosc infila poziomego nad szafa = rysujesz
// 2 deski = dlugosc infila x 60 mm, plus 20 mm dluzsze na odciecie, z jednej
// strony."*  — and on the corner: *"jak zakreca i mamy infill z boku to sie
// robi mitre, ale to rzadko."*
//
// This module cut the solid that made the top infill READ as an L. Both cuts
// are struck down and the shelf board does not exist: the scene draws ONE
// board — the face, standing in the plane of the fronts like a plinth.
test('the L IS DEAD: one plain board in the room, and no shelf anywhere', () => {
  const r = runUnit({ left: 'wall', right: 'wall' }, {});
  const facePanel = pieceOf(r, 'INFILL-T-FACE');

  assert.equal(infillSolid(facePanel), null, 'no cut at all — the caller draws the plain box');
  assert.equal(pieceOf(r, 'INFILL-T-SHELF'), undefined, 'and there is no shelf board to cut');

  const faceZ = 558 + P.doors.gap + 25;         // depth + gap + front thickness
  assert.equal(facePanel.box.z + facePanel.box.d, faceZ);
  assert.equal(facePanel.box.y, 2100);
});

// ─── T48-F2: THE TURNING CORNER IS THE ONE 45° THAT SURVIVES ────────────────
// *"jak zakreca i mamy infill z boku to sie robi mitre, ale to rzadko."*
// CLAUDE.md F2 draws the line in as many words: `mitre_45` survives ONLY where
// two RUNS meet. An open end IS the run turning, and the return that grows
// there is a second run in the same plane — so the picture frame is still cut,
// on the FACES. The shelf boards are on the sheet and not in the room, so
// there is no second board behind this one.
test('an open end still turns the corner as a picture frame — on the faces', () => {
  const r = runUnit({ left: 'open', right: 'wall' }, { left: 200 });
  const mainFace = infillSolid(pieceOf(r, 'INFILL-T-FACE'));
  const retFace = infillSolid(pieceOf(r, 'INFILL-TL-FACE'));
  for (const [label, s] of [['main face', mainFace], ['return face', retFace]]) assertClosed(s, label);
  assert.equal(pieceOf(r, 'INFILL-T-SHELF'), undefined, 'no second board behind it');
  assert.equal(pieceOf(r, 'INFILL-TL-SHELF'), undefined);

  const faceZ = 558 + P.doors.gap + 25;

  // THE MITRE, on the faces: the main face reaches x = 0 at the front and only
  // x = G at the back; the return face is the mirror of that.
  assert.ok(has(mainFace, [0, 2100, faceZ]), 'main face reaches the corner at the front');
  assert.ok(has(mainFace, [G, 2100, faceZ - G]), 'and is cut back by a thickness at the rear');
  assert.equal(has(mainFace, [0, 2100, faceZ - G]), false, 'the corner square is NOT hers');
  assert.ok(has(retFace, [0, 2100, faceZ]), 'the return meets it on the same line');
  assert.ok(has(retFace, [G, 2100, faceZ - G]));
});

test('a WALLED end is not mitred — there is no corner to turn', () => {
  const r = runUnit({ left: 'wall', right: 'wall' }, {});
  // T48-F2: with no turning corner and no L, there is nothing to cut at all —
  // `infillMitre` says so and the scene draws the box the engine handed it.
  assert.equal(infillSolid(pieceOf(r, 'INFILL-T-FACE')), null);
  const box = pieceOf(r, 'INFILL-T-FACE').box;
  const faceZ = 558 + P.doors.gap + 25;
  assert.equal(box.z + box.d, faceZ, 'square ends, square back — a plain board');
  assert.equal(box.x, 0);
  assert.equal(box.w, 600);
});

// ─── what it must NOT touch ─────────────────────────────────────────────────

test('nothing here reaches the cut list', () => {
  // The piece is CUT as a rectangle to its long point and mitred on the saw —
  // which is exactly what the flag already tells the workshop. If a future
  // change starts shortening pieces to their short point, this fails.
  const r = runUnit({ left: 'open', right: 'open' }, { left: 200, right: 200 });
  const face = pieceOf(r, 'INFILL-T-FACE');
  const OVER = P.autoParts.fillerOversize;
  // T47-F4: `w`/`h` are the CUT size and now carry the +20 scribe allowance
  // on the piece's WALL edge (`autoParts.fillerOversize`, the drawer front's own
  // idiom). `meta.oversize.nominal` is the finished size, and the box is the
  // nominal piece — what stands in the room once the joiner has planed it in.
  // T48-F2 (OVERRULED, 25.08.2026): there is no long point to leave untouched.
  // The blank is the run plus the site cut on ONE end, the L's own 45 is gone,
  // and the 'end' flag survives because both ends of this run turn a corner.
  assert.equal(face.w, 600 + OVER, 'the run, plus the 20 the joiner cuts off');
  assert.equal(face.box.w, 600, 'and the piece in the room is the run');
  assert.equal(face.h, T.defaultHeight + OVER);
  assert.equal(face.meta.mitre_45.includes('long'), false, 'the L is dead');
  assert.ok(face.meta.mitre_45.includes('end'), 'the turning corner is not');
  assert.equal(face.meta.mitre?.L, undefined, 'and the L\'s own 45 with it');
  assert.ok(r.csvLines.some((l) => l.includes(`,INFILL-T-FACE,${600 + OVER},${40 + OVER},`)));
});

test('a piece with no mitre to make is left alone', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', side_infill_left_mm: 40,
  }, P);
  for (const p of r.panels.filter((x) => x.part === 'INFILL' && x.meta.side !== 'top')) {
    assert.equal(infillMitre(p), null, `${p.id}: the vertical filler is screwed, not mitred`);
    assert.equal(infillSolid(p), null);
  }
  assert.equal(infillMitre(r.panels.find((p) => p.part === 'BUL')), null);
  assert.equal(infillMitre(null), null);
  assert.equal(at([1.00049, 0, 0], 0), 1);
});
