import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { mm } from '../src/3d/constants.js';

// ─── CHAT-FIX 29.08.2026 — THE STRIP'S ENDS ARE VERTICAL TOO ────────────────
//
// The owner's T54 audit, measured on the live engine: the roof came under the
// 25.08 shear, but the two boards that LEAN WITH it never did. The strip
// (INFILL-T-FACE) rendered as a rotated RECTANGLE, so its lower corners stood
// `bandH·sin β` = 17.9 mm past the plumb line at each end — the exact "wąsik"
// on his BUR screenshot, and the lone piece hanging beside W03 on the
// two-knee run (the strip's end reaching into the neighbour's band: the house
// overlap law broken by a render). The SHELF is `scene: 'sheet-only'`, so its
// fault lived on the WALL SHEET: `segElevation` rotated the rectangle's
// corners and the paper drew the same poke.
//
// One law, three readers: the scene's solid (panelSolid.js, the roof's own
// sheared branch extended), the sheet's outline (`meta.elevation`, now the
// parallelogram in the box's level frame) and the CNC blank (UNTOUCHED — the
// board leaves the machine square, T48-F2, and the corner is cut on site).
//
// The shear's direction now reads the SIGNED `tilt_deg` itself: underside
// toward the LOW end = `−h·tan(tilt)`. Both rakes below prove the sign.

const PARAMS = {
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  side_infill_left_mm: 40,
  side_infill_right_mm: 40,
  top_infill_mm: 40,
};
const H = PARAMS.height;
const W = PARAMS.width;

const spin = ([x, y], pv, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pv.x;
  const dy = y - pv.y;
  return [pv.x + dx * Math.cos(a) - dy * Math.sin(a),
    pv.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

const RAKES = [
  ['fall to the RIGHT (peak at BUL)',
    { pts: [{ x: 0, y: H - 150 }, { x: W, y: H - 150 - W * 0.5 }], infill: 40 }],
  ['fall to the LEFT (peak at BUR — the owner\'s screenshot)',
    { pts: [{ x: 0, y: H - 150 - W * 0.5 }, { x: W, y: H - 150 }], infill: 40 }],
];

for (const [name, slope] of RAKES) {
  test(`the strip's SOLID stands plumb at x = 0 and x = W — ${name}`, () => {
    const r = computeCabinet({ ...PARAMS, slope_cut: slope }, P);
    const face = r.panels.find((p) => p.id === 'INFILL-T-FACE');
    assert.ok(face, 'the strip exists under the rake');
    const built = panelSolids(face, P.puzzle.layers, P);
    assert.ok(built?.solid, 'the leant strip now has its own sheared solid');
    const pos = built.solid.attributes.position;
    const cx = face.box.x + face.box.w / 2;
    const cy = face.box.y + face.box.h / 2;
    const xs = new Set();
    for (let i = 0; i < pos.count; i += 1) {
      const wx = pos.getX(i) / mm(1) + cx;
      const wy = pos.getY(i) / mm(1) + cy;
      const [rx] = spin([wx, wy], face.meta.tilt_pivot, face.meta.tilt_deg);
      xs.add(Math.round(rx * 100) / 100);
    }
    const lines = [...xs].sort((a, b) => a - b);
    assert.equal(lines.length, 2,
      `two plumb lines and nothing between — saw ${lines.join(', ')}`);
    assert.ok(Math.abs(lines[0] - 0) < 0.05, `one end at x = 0 (saw ${lines[0]})`);
    assert.ok(Math.abs(lines[1] - W) < 0.05, `one end at x = ${W} (saw ${lines[1]})`);
  });

  test(`the sheet's own outline says the same parallelogram — ${name}`, () => {
    const r = computeCabinet({ ...PARAMS, slope_cut: slope }, P);
    // T55 law (29.08, the owner): under a rake the infill is ONE board — the
    // shelf is asserted ABSENT, and the parallelogram claim runs on the FACE.
    assert.equal(r.panels.find((p) => p.id === 'INFILL-T-SHELF'), undefined,
      'no shelf under a rake');
    for (const id of ['INFILL-T-FACE']) {
      const p = r.panels.find((q) => q.id === id);
      assert.ok(p?.meta?.elevation, `${id} carries its elevation`);
      const world = p.meta.elevation.map(([lx, ly]) => spin(
        [lx + p.box.x, ly + p.box.y], p.meta.tilt_pivot, p.meta.tilt_deg,
      ));
      // Ends vertical: corner 0 under corner 3, corner 1 under corner 2.
      assert.ok(Math.abs(world[0][0] - world[3][0]) <= 0.01,
        `${id} left end plumb (Δ=${(world[0][0] - world[3][0]).toFixed(3)})`);
      assert.ok(Math.abs(world[1][0] - world[2][0]) <= 0.01,
        `${id} right end plumb (Δ=${(world[1][0] - world[2][0]).toFixed(3)})`);
      // And nothing outside the piece's own span.
      for (const [wx] of world) {
        assert.ok(wx >= -0.01 && wx <= W + 0.01,
          `${id} corner inside [0, ${W}] (saw ${wx.toFixed(3)})`);
      }
    }
  });

  test(`the trio's three joints hold to a hundredth — ${name}`, () => {
    const r = computeCabinet({ ...PARAMS, slope_cut: slope }, P);
    const beta = Math.atan(0.5);
    const cos = Math.cos(beta);
    const a = slope.pts[0];
    const b = slope.pts[1];
    const ceil = (x) => a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    const cut = (x) => ceil(x) - 40 / cos;
    const edge = (p, top) => {
      const pts = top
        ? [p.meta.elevation[3], p.meta.elevation[2]]
        : [p.meta.elevation[0], p.meta.elevation[1]];
      return pts.map(([lx, ly]) => spin(
        [lx + p.box.x, ly + p.box.y], p.meta.tilt_pivot, p.meta.tilt_deg,
      ));
    };
    const at = ([[x1, y1], [x2, y2]], X) => y1 + ((y2 - y1) * (X - x1)) / (x2 - x1);
    const face = r.panels.find((q) => q.id === 'INFILL-T-FACE');
    const roof = r.panels.find((q) => q.id === 'TOP');
    const fTop = edge(face, true);
    const fBot = edge(face, false);
    for (const X of [50, W / 2, W - 50]) {
      assert.ok(Math.abs(ceil(X) - at(fTop, X)) <= 0.01, `FACE top on ceiling @${X}`);
      assert.ok(Math.abs(cut(X) - at(fBot, X)) <= 0.01, `FACE bottom on cutReach @${X}`);
    }
    // The roof's top edge, read from its OWN sheared solid (order-proof): the
    // two plumb ends stand at x = 0 and x = W, and the highest leant vertex on
    // each is the top edge's end. T54-F1 hung the roof from cutReach — that
    // edge must meet the strip's bottom, joint for joint.
    const rBuilt = panelSolids(roof, P.puzzle.layers, P);
    const rp = rBuilt.solid.attributes.position;
    const rcx = roof.box.x + roof.box.w / 2;
    const rcy = roof.box.y + roof.box.h / 2;
    let top0 = -Infinity;
    let topW = -Infinity;
    for (let i = 0; i < rp.count; i += 1) {
      const [rx, ry] = spin(
        [rp.getX(i) / mm(1) + rcx, rp.getY(i) / mm(1) + rcy],
        roof.meta.tilt_pivot, roof.meta.tilt_deg,
      );
      if (Math.abs(rx - 0) < 0.05) top0 = Math.max(top0, ry);
      if (Math.abs(rx - W) < 0.05) topW = Math.max(topW, ry);
    }
    const rTop = [[0, top0], [W, topW]];
    for (const X of [50, W / 2, W - 50]) {
      assert.ok(Math.abs(at(fBot, X) - at(rTop, X)) <= 0.01,
        `FACE bottom meets ROOF top @${X} (Δ=${(at(fBot, X) - at(rTop, X)).toFixed(4)})`);
    }
  });
}

test('a FLAT band never enters the sheared branch — the plain path as ever', () => {
  const flat = computeCabinet(PARAMS, P);
  const face = flat.panels.find((p) => p.id === 'INFILL-T-FACE');
  assert.ok(face, 'the flat strip exists');
  assert.equal(face.meta?.tilt_axis, undefined, 'nothing tells it to lean');
  assert.equal(face.meta?.elevation, undefined, 'and it states no elevation');
  // T55 law (29.08): the wrap is a LEVEL-stretch piece — on the flat it
  // stays exactly as T47 wrote it, sheet-only flag and all.
  const shelf = flat.panels.find((p) => p.id === 'INFILL-T-SHELF');
  assert.ok(shelf, 'the flat wrap still exists');
  assert.equal(shelf.meta?.scene, 'sheet-only', 'and stays off the room, on the sheet');
});

// ─── T55 (29.08, the owner's second telling): RETURNS ARE LEVEL-END ONLY ────
//
// *"TR — jak jest skos, to musi znikać. Nie zawija — zakańczasz prosto."*
// A raked EDGE segment kills the picture-frame return at that end; a flat
// edge keeps it exactly as before. Proven on the run element the store hands
// down, both mixes.

const RUN = (ceiling, returns) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  run_top_infill: {
    role: 'owner', offset: 0, length: 600,
    faceH: P.autoParts.topInfill.defaultHeight,
    shelfDepth: P.autoParts.topInfill.shelfDepth,
    ends: { left: 'open', right: 'open' },
    returns,
    ...(ceiling ? { ceiling, ceilingInfill: 40 } : {}),
  },
}, P);

test('T55 · a RAKED end grows no return; a FLAT end keeps its corner', () => {
  // Ceiling flat on the LEFT half, raked down on the RIGHT half.
  const mixed = RUN(
    [{ x: 0, y: 2400 }, { x: 300, y: 2400 }, { x: 600, y: 2100 }],
    { left: 150, right: 150 },
  );
  assert.ok(mixed.panels.find((p) => p.id === 'INFILL-TL-FACE'),
    'flat left end: the return face stands');
  assert.ok(mixed.panels.find((p) => p.id === 'INFILL-TL-SHELF'),
    'flat left end: and its shelf');
  assert.equal(mixed.panels.find((p) => p.id === 'INFILL-TR-FACE'), undefined,
    'raked right end: no return face — the run finishes straight');
  assert.equal(mixed.panels.find((p) => p.id === 'INFILL-TR-SHELF'), undefined,
    'raked right end: no return shelf either');
});

test('T55 · a fully RAKED ceiling grows no return at either end', () => {
  const raked = RUN(
    [{ x: 0, y: 2400 }, { x: 600, y: 2100 }],
    { left: 150, right: 150 },
  );
  for (const id of ['INFILL-TL-FACE', 'INFILL-TL-SHELF', 'INFILL-TR-FACE', 'INFILL-TR-SHELF']) {
    assert.equal(raked.panels.find((p) => p.id === id), undefined, `${id} does not exist`);
  }
  // …and the strip itself is the ONE board the law promises.
  const tops = raked.panels.filter((p) => /^INFILL-T/.test(p.id));
  assert.deepEqual(tops.map((p) => p.id.replace(/-\d+$/, '')).sort(),
    ['INFILL-T-FACE'], 'one board, full stop');
});

test('T55 · a fully FLAT ceiling keeps both corners exactly as before', () => {
  const flat2 = RUN(null, { left: 150, right: 150 });
  for (const id of ['INFILL-TL-FACE', 'INFILL-TL-SHELF', 'INFILL-TR-FACE', 'INFILL-TR-SHELF']) {
    assert.ok(flat2.panels.find((p) => p.id === id), `${id} stands on the flat`);
  }
});

// ─── T55 · THE END LAW (29.08, panel B, owner's "ok"): at a wall the top ────
// piece stops PLUMB on the end CARCASS face — the scribe gap belongs to the
// vertical, which runs to the ceiling. Proven straight at `runEnd`, the one
// function every top piece (infill and cornice alike) takes its ends from.
import { runEnd } from '../src/engine/runs.js';

test("T55 · runEnd at a wall answers the CARCASS face, not the plaster", () => {
  const unit = (x, sideL, sideR) => ({
    id: 'u1', type: 'WARDROBE',
    params: {
      ...defaultParamsFor('WARDROBE', P),
      width: 600, top_infill_mm: 40,
      side_infill_left_mm: sideL, side_infill_right_mm: sideR,
    },
    position: { wall: 0, x_mm: x, rotation_deg: 0 },
  });
  const ctx = { wallWidth: 4000, roomHeight: 2500, verticals: [] };
  // Parked at the left stop, 40 mm scribe filling to the plaster:
  const L = runEnd({ wall: 0, units: [unit(40, 40, 0)], top: 2150 }, 'left', ctx, P);
  assert.equal(L.kind, 'infill', 'the scribe vertical names the end');
  assert.equal(L.x, 40, 'left end: the carcass face — never 0 (the plaster)');
  // And the mirror at the right wall:
  const R = runEnd({ wall: 0, units: [unit(3360, 0, 40)], top: 2150 }, 'right', ctx, P);
  assert.equal(R.kind, 'infill');
  assert.equal(R.x, 3960, 'right end: the carcass face — never 4000');
});

// ─── T55 · THE 45° DIES WITH THE WRAP (29.08, the second corner's SS) ───────
// *"45 stopni mitre ucięto do zawijania, gdzie ustaliliśmy że nie ma
// zawijania jak jest skos."* A raked EDGE segment zeroes the strip-end mitre;
// the strip finishes with its plain plumb cut against the vertical, which is
// NOT touched. A flat edge keeps its picture-frame 45°.
import { runInfillParams } from '../src/engine/runs.js';

test('T55 · a raked edge zeroes the end mitre; a flat edge keeps its 45', () => {
  const mk = (id, x) => ({
    id, type: 'WARDROBE',
    params: { ...defaultParamsFor('WARDROBE', P), width: 600, top_infill_mm: 40,
      side_infill_left_mm: 40, side_infill_right_mm: 40,
      side_infill_left_top_mm: 2190, side_infill_right_top_mm: 2190 },
    position: { wall: 0, x_mm: x, rotation_deg: 0 },
  });
  const units = [mk('u1', 40)];
  const walls = [{ width: 680 }];
  const flatCut = () => ({ pts: [{ x: 0, y: 2400 }, { x: 600, y: 2400 }], infill: 40 });
  const rakeCut = () => ({ pts: [{ x: 0, y: 2400 }, { x: 600, y: 2100 }], infill: 40 });

  // The FLAT 45 is the standing law and is held by its own suite (T15/T22
  // corner tests) — this test claims only the NEW half: a rake ZEROES it.
  const flat = runInfillParams(units, {
    walls, roomHeight: 2500, frontFaceDepthOf: () => 568, runCutOf: flatCut,
  }, P).get('u1');
  assert.ok(flat.ends.left === 'infill' && flat.ends.right === 'infill',
    'flat: the verticals name the ends, exactly as before');

  const raked = runInfillParams(units, {
    walls, roomHeight: 2500, frontFaceDepthOf: () => 568, runCutOf: rakeCut,
  }, P).get('u1');
  assert.equal(raked.mitre.left, 0, 'raked edge: no 45 — plumb against the vertical');
  assert.equal(raked.mitre.right, 0, 'both ends of a fully raked strip');
});

// ─── T55 · MILION PROCENT (29.08): the raked strip never enters the mitre ───
// path — an OPEN end under a rake cuts NOTHING here, so the scene's gate
// (`!mitre`) finally lets the piece into panelSolids' leant body. A FLAT
// open end keeps its plan 45 exactly as T48 wrote it.
import { infillMitre } from '../src/engine/mitre.js';

test('T55 · raked FACE with an OPEN end: infillMitre answers null', () => {
  const base = {
    box: { x: 0, y: 2110, z: 550, w: 780, h: 40, d: 18 },
    meta: { side: 'top', piece: 'face', segment: 'main', ends: { left: 'infill', right: 'open' } },
  };
  const raked = { ...base, meta: { ...base.meta, slopeCut: { deg: 39.7 }, tilt_axis: 'z' } };
  assert.equal(infillMitre(raked), null,
    'a raked strip owns no plan mitre — the leant path owns the whole body');
  const flat = infillMitre(base);
  assert.ok(flat && flat.planes.length === 1,
    'a FLAT open end still turns its picture-frame 45 (T48 law untouched)');
});
