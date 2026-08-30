// ─── T53 · F3 — THE SLOPE'S INFILLS. ONE LAW: 3D DRAWS WHAT CNC CUTS ───────
//
// The owner, 27.08.2026, three ways round one disease:
//
//   *"top infill po skosie w ogóle nie działa … jakoś dziwnie się rysuje gdzieś
//   poza ścianami."*
//   *"najdziwniejsze jest to, że pionowy infill na CNC się tnie pod skosem, ale
//   na wizualizacji pokazuje prosto."*
//   *"slope — tylko infill się nie rysuje po skosie, a jest na CNC."*
//
// The disease is TWO SOURCES OF TRUTH — the fault the grain rule already killed
// once. The law is stated in `reference/lisp/SKYLON_COMMON.lsp` (iron rule 3):
//
//   EVERY PIECE THE MACHINE CUTS ON THE SLOPE IS DRAWN CUT IN THE ROOM.
//
// ─── THE TWO DIAGNOSES ─────────────────────────────────────────────────────
//
// (a) THE VERTICAL INFILL. The CNC outline really was trimmed to the ceiling
//     (`trimGeometryOnSlope`); the SOLID was a plain box as tall as the PEAK.
//     So the file cut the rake and the room drew a square-topped board.
//
// (b) THE RUN'S TOP INFILL. It took its ceiling from the OWNER unit's own slope
//     cut — and the owner of a run is its FIRST cabinet. A run whose rake falls
//     over the LAST one gave that first cabinet no cut at all, so the whole
//     board was one flat rectangle at room height, standing outside the wall
//     for the length of the slope. A scope error, not a geometry one.
//
// (c) "TO THE CEILING" read `room.height` — the flat headroom — so a filler
//     double-clicked to the ceiling under a rake went through the plaster.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  boxPolyhedron, clipAll, infillMitre, slopePlanes,
} from '../src/engine/mitre.js';

const store = () => useProjectStore.getState();
const WALL = 4000;

function room(slopes = []) {
  store().loadProject({
    id: null, name: 'T53 F3', number: '53', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(WALL, 3000) }), design: {},
  }, []);
  for (const s of slopes) store().addWallSlope(s);
}

const panelsOf = (id) => store().unitResult(id).panels;
const find = (id, rx) => panelsOf(id).filter((p) => rx.test(p.id));

// ─── (a) THE VERTICAL INFILL ──────────────────────────────────────────────

test('F3a — the side infill’s solid is cut on the very line its outline is', () => {
  room([{ wall: 0, side: 'R', startHeight: 1500, run: 1400 }]);
  const a = store().addUnit('WARDROBE');
  // Hard against the right wall, so the auto scribe filler stands in the 40 mm
  // and the rake falls across it.
  store().moveUnit(a.id, WALL - 40 - 600, 0, { magnet: false });

  const face = find(a.id, /^INFILL-R-FACE$/)[0];
  assert.ok(face, 'the filler is there');
  const cut = face.meta.slopeCut;
  assert.ok(cut, 'and the machine cuts it on the slope');
  assert.ok(Array.isArray(cut.top) && cut.top.length >= 2, 'the line travels with it');

  // The line is in the BOX's own frame — that is the whole point of F3.
  assert.equal(cut.top[0].x, face.box.x, 'x starts at the piece’s own left face');
  assert.equal(cut.top[cut.top.length - 1].x, face.box.x + face.box.w, '…and ends at its right');
  assert.ok(cut.top[0].y > cut.top[cut.top.length - 1].y,
    'a ceiling falling to the right falls across this filler too');

  // …and the SOLID is cut to it. Without F3 this returned null and the room
  // drew the plain box.
  const spec = infillMitre(face);
  assert.ok(spec, 'the room has a solid to cut');
  assert.ok(spec.planes.length >= 1, 'at least one half-space');
  const solid = clipAll(boxPolyhedron(spec.box), spec.planes);
  const ys = solid.vertices.map((v) => v[1]);
  const xs = solid.vertices.map((v) => v[0]);
  assert.ok(Math.max(...ys) <= cut.top[0].y + 0.01, 'nothing stands above the line');
  assert.ok(Math.max(...ys) >= cut.top[0].y - 0.01, '…and it reaches it');
  assert.equal(Math.round(Math.min(...xs)), Math.round(face.box.x));
  assert.equal(Math.round(Math.max(...xs)), Math.round(face.box.x + face.box.w));

  // The low corner of the solid is on the line, to the millimetre — which is
  // the whole of "3D draws what CNC cuts".
  const lowX = cut.top[cut.top.length - 1].x;
  const onLine = solid.vertices.filter((v) => Math.abs(v[0] - lowX) < 0.01);
  assert.ok(onLine.some((v) => Math.abs(v[1] - cut.top[cut.top.length - 1].y) < 0.01),
    'the board’s top at its low end is the ceiling at its low end');
});

test('F3a — a straight room cuts nothing: the filler is the board it always was', () => {
  room([]);
  const a = store().addUnit('WARDROBE');
  store().moveUnit(a.id, WALL - 40 - 600, 0, { magnet: false });
  const face = find(a.id, /^INFILL-R-FACE$/)[0];
  assert.ok(face);
  assert.equal(face.meta.slopeCut, undefined, 'no cut at all');
  assert.equal(infillMitre(face), null, 'and therefore no solid to clip');
});

test('F3a — slopePlanes is the law, and it keeps everything BELOW the line', () => {
  const box = {
    x: 0, y: 0, z: 0, w: 100, h: 100, d: 18,
  };
  // A line falling from 80 at x=0 to 40 at x=100.
  const planes = slopePlanes(box, [{ x: 0, y: 80 }, { x: 100, y: 40 }]);
  assert.equal(planes.length, 1);
  const solid = clipAll(boxPolyhedron(box), planes);
  const at = (x) => Math.max(...solid.vertices.filter((v) => Math.abs(v[0] - x) < 0.01).map((v) => v[1]));
  assert.ok(Math.abs(at(0) - 80) < 0.01, 'the high end is 80');
  assert.ok(Math.abs(at(100) - 40) < 0.01, 'the low end is 40');
  // A flat line at the board's own top cuts nothing at all.
  assert.deepEqual(slopePlanes(box, [{ x: 0, y: 100 }, { x: 100, y: 100 }]), []);
});

// ─── (b) THE RUN'S TOP INFILL ─────────────────────────────────────────────

/** Three wall units from x=1700, and a rake that starts past the third. */
function runUnderASlope() {
  room([{ wall: 0, side: 'R', startHeight: 1500, run: 1400 }]);
  const ids = [];
  let last = null;
  for (let i = 0; i < 3; i += 1) {
    const r = last ? store().addUnit('WUD', { near: last, side: 'R' }) : store().addUnit('WUD');
    assert.ok(r.id, r.error || '');
    ids.push(r.id);
    last = r.id;
  }
  for (const id of ids) store().updateUnitParams(id, { top_infill_mm: 60 });
  store().refreshAutoParts();
  return ids;
}

test('F3b — the run carries its OWN ceiling, not the owner cabinet’s', () => {
  const ids = runUnderASlope();
  const owner = store().units.find((u) => store().runElements[u.id]?.top_infill?.role === 'owner');
  assert.ok(owner, 'a run with an owner');
  const el = store().runElements[owner.id].top_infill;
  assert.ok(Array.isArray(el.ceiling) && el.ceiling.length >= 2, 'the line travels with the run');
  // …and the owner cabinet itself is NOWHERE NEAR the slope, which is exactly
  // the case that used to draw a flat board.
  assert.equal(store().unitResult(owner.id).panels.some((p) => p.meta?.slopeCut && /^(BUL|BUR)$/.test(p.id)),
    false, 'the owner’s own carcass takes no slope cut');
  // The run's line bends: flat, then falling.
  const ys = el.ceiling.map((q) => q.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 100, 'the ceiling really does fall over this run');
});

test('F3b — the top infill breaks at the knee and follows the rake past it', () => {
  const ids = runUnderASlope();
  const owner = store().units.find((u) => store().runElements[u.id]?.top_infill?.role === 'owner');
  const faces = find(owner.id, /^INFILL-T-FACE(-\d+)?$/);
  assert.ok(faces.length >= 2, `${faces.length} segments — one per stretch of the line`);
  const sloped = faces.filter((p) => p.meta?.slopeCut);
  assert.ok(sloped.length >= 1, 'and at least one of them is cut on the slope');
  // 30.08 law: over the CUT carcass a leant 40 band; over the INTACT carcass
  // one BOARD, top cut on the line. Both are "cut on the slope".
  for (const p of sloped) {
    if (p.meta.slopeCut.board) {
      assert.ok(Array.isArray(p.meta.slopeCut.top), 'a board carries its line');
      assert.equal(p.meta.tilt_deg, undefined, 'and never leans');
    } else {
      assert.ok(p.meta.slopeCut.deg > 1, `${p.meta.slopeCut.deg}° — the rake’s own angle`);
      // T55 (CLAUDE.md F1): the raked band states its FOUR CORNERS in the
      // room frame — the scene extrudes them; the lean meta is dead.
      assert.ok(Array.isArray(p.meta.corners) && p.meta.corners.length === 4,
        'the corners are stated');
      assert.equal(p.meta.tilt_axis, undefined, 'and the shear/rotation split is dead');
    }
  }
  assert.ok(sloped.some((p) => Array.isArray(p.meta.corners)), 'the rake really grows a band');
});

test('F3b — no segment of the run stands above the ceiling line', () => {
  const ids = runUnderASlope();
  const owner = store().units.find((u) => store().runElements[u.id]?.top_infill?.role === 'owner');
  const el = store().runElements[owner.id].top_infill;
  const x0 = el.offset || 0;
  const at = (x) => {
    const pts = el.ceiling.map((q) => ({ x: x0 + q.x, y: q.y }));
    for (let i = 1; i < pts.length; i += 1) {
      if (x <= pts[i].x + 1e-6) {
        const a = pts[i - 1];
        const b = pts[i];
        const span = b.x - a.x;
        return span > 1e-9 ? a.y + ((b.y - a.y) * (x - a.x)) / span : a.y;
      }
    }
    return pts[pts.length - 1].y;
  };
  const H = Number(store().units.find((u) => u.id === owner.id).params.height) || 0;
  for (const p of find(owner.id, /^INFILL-T-FACE(-\d+)?$/)) {
    const top = p.box.y + p.box.h;
    const mid = p.box.x + p.box.w / 2;
    const ceiling = Math.max(at(mid), 0);
    // The flat case sits ON the cabinet (top at H + faceH); the sloped case
    // hangs FROM the line. Either way it never goes through the plaster.
    assert.ok(top <= Math.max(ceiling, H + p.box.h) + 0.5,
      `${p.id}: top ${top.toFixed(1)} vs ceiling ${ceiling.toFixed(1)}`);
  }
});

test('F3b — the RETURN hangs in the same band as the face it turns from', () => {
  const ids = runUnderASlope();
  const owner = store().units.find((u) => store().runElements[u.id]?.top_infill?.role === 'owner');
  const faces = find(owner.id, /^INFILL-T-FACE(-\d+)?$/);
  const right = find(owner.id, /^INFILL-TR-FACE$/)[0];
  if (!right) return; // no open right end in this arrangement
  const last = faces[faces.length - 1];
  assert.ok(Math.abs((right.box.y + right.box.h) - (last.box.y + last.box.h)) < 1,
    'the return’s top and the last segment’s top are the same line');
});

test('F3b — a STRAIGHT room’s run infill is byte-for-byte what it was', () => {
  room([]);
  const ids = [];
  let last = null;
  for (let i = 0; i < 3; i += 1) {
    const r = last ? store().addUnit('WUD', { near: last, side: 'R' }) : store().addUnit('WUD');
    ids.push(r.id);
    last = r.id;
  }
  for (const id of ids) store().updateUnitParams(id, { top_infill_mm: 60 });
  store().refreshAutoParts();
  const owner = store().units.find((u) => store().runElements[u.id]?.top_infill?.role === 'owner');
  assert.equal(store().runElements[owner.id].top_infill.ceiling, null, 'no slope, no line');
  const faces = find(owner.id, /^INFILL-T-FACE(-\d+)?$/);
  assert.equal(faces.length, 1, 'one board, unbroken');
  assert.equal(faces[0].meta.slopeCut, undefined);
});

// ─── (c) "TO THE CEILING" MEANS THIS CEILING ──────────────────────────────

test('F3c — a filler taken to the ceiling under a rake stops at the rake', () => {
  room([{ wall: 0, side: 'R', startHeight: 1500, run: 1400 }]);
  const a = store().addUnit('WARDROBE');
  store().moveUnit(a.id, WALL - 40 - 600, 0, { magnet: false });
  const unit = () => store().units.find((u) => u.id === a.id);

  store().sideInfillToCeiling(a.id, 'R');
  const top = Number(unit().params.side_infill_right_top_mm)
    ?? Number(unit().params.side_infill_top_right_mm);
  // Whatever the field is called, the answer must be the SLOPE's headroom and
  // not the room's: the cabinet's right edge is at 3360 on a 4000 wall whose
  // last 1400 mm fall from 2500 to 1500.
  const params = unit().params;
  const stated = Object.entries(params)
    .filter(([k]) => /side_infill/.test(k) && /top/.test(k))
    .map(([, v]) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  const roomTop = 2500 - 2250; // room height less the cabinet's own top
  for (const v of stated) {
    assert.ok(v < roomTop, `${v} mm of filler, not the flat room’s ${roomTop}`);
  }
  assert.ok(stated.length > 0 || top === 0,
    'either it stated a height under the rake, or the rake leaves no room at all');
});

test('F3c — …and in a straight room it is exactly the room’s headroom', () => {
  room([]);
  const a = store().addUnit('WARDROBE');
  store().moveUnit(a.id, WALL - 40 - 600, 0, { magnet: false });
  store().sideInfillToCeiling(a.id, 'R');
  const params = store().units.find((u) => u.id === a.id).params;
  const stated = Object.entries(params)
    .filter(([k]) => /side_infill/.test(k) && /top/.test(k))
    .map(([, v]) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  for (const v of stated) assert.equal(v, 2500 - 2250, 'the flat room’s own headroom');
});

// ─── THE LAW IS IN THE LISP, FIRST ────────────────────────────────────────

test('F3 — the law is stated in SKYLON_COMMON before any of this', () => {
  const lisp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /EVERY PIECE THE MACHINE CUTS ON THE SLOPE IS DRAWN CUT IN THE ROOM/);
  assert.match(lisp, /TWO SOURCES OF TRUTH/);
  assert.match(lisp, /\(defun SKY:vertInfillTopY /);
  assert.match(lisp, /\(defun SKY:vertInfillDeg /);
  assert.match(lisp, /\(defun SKY:infillSegsUnder /);
});
