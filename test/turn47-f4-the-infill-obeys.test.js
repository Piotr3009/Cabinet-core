import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { panelEntities } from '../src/engine/cnc/dxf.js';

// ─── TURN 47 · F4 — THE INFILL OBEYS THE SLOPE, AND LEAVES OVERSIZE ─────────
//
// Three rulings, and they are three different things:
//
//   CUT.      The side infill ran FULL HEIGHT under a sloping ceiling and the
//             room lied (the owner's screenshot 1). It is trimmed on the same
//             line as every other board.
//
//   SHAPE.    *"bedzie ciety jako prosta linia zwykly infill tylko zamontowany
//             po skosie, ale laczenia beda ciete po skosie."* The TOP infill
//             stays a PLAIN RECTANGLE, mounted along the slope. It is NOT a
//             trapezium; only its ENDS come off at an angle.
//
//   OVERSIZE. *"wszystkie infille jak mamy ustawione na 40 mm to CNC powinien
//             rysowac o 20 mm szerszy (docinanie na miejscu przez stolarzy)."*
//
// …and the two MITRES that must never be confused:
//   the L corner of one piece is `face × arm`, always 90°, ALWAYS 45
//     — *"infill mitra zawsze jest 45."*
//   the side × top junction is a vertical piece meeting a SLOPED one, so the
//     mitre is half of THAT angle and is 45 only where β is 0.

const OVER = P.autoParts.fillerOversize;
const BASE = {
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  side_infill_left_mm: 40,
  side_infill_right_mm: 40,
  top_infill_mm: 40,
};
const build = (over = {}) => computeCabinet({ ...BASE, ...over }, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const infills = (r) => r.panels.filter((p) => p.role === 'infill');

// A 45° fall across a 600 wardrobe, ceiling 2000 → 1400 above the carcass floor.
const FALL = { slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: 1400 }], infill: 40 } };

// ═══ THE OVERSIZE ═══════════════════════════════════════════════════════════

test('fillerOversize is 20 and it lives beside frontOversize and bottomOversize', () => {
  assert.equal(OVER, 20);
  assert.equal(P.wardrobe.drawers.frontOversize, 4);
  assert.equal(P.wardrobe.drawers.bottomOversize, 13);
});

test('EVERY infill leaves the machine 20 over — on the edge it is SCRIBED to', () => {
  const r = build();
  const seen = {};
  for (const p of infills(r)) seen[p.id] = p.meta.oversize || null;
  assert.deepEqual(seen['INFILL-L-FACE'], { mm: 20, edge: 'left', nominal: 40 });
  assert.deepEqual(seen['INFILL-R-FACE'], { mm: 20, edge: 'right', nominal: 40 });
  assert.deepEqual(seen['INFILL-T-FACE'], { mm: 20, edge: 'top', nominal: 40 });
  assert.deepEqual(seen['INFILL-T-SHELF'],
    { mm: 20, edge: 'back', nominal: P.autoParts.topInfill.shelfDepth });
  // …and the ARM, which touches no wall, takes none: 20 mm of spare board on a
  // piece that has to end flush is 20 mm in the way.
  assert.equal(seen['INFILL-L-ARM'], null);
  assert.equal(seen['INFILL-R-ARM'], null);
});

test('THE 20 GOES ON THE WALL EDGE ONLY, and the box stays the nominal piece', () => {
  const r = build();
  const left = byId(r, 'INFILL-L-FACE');
  const right = byId(r, 'INFILL-R-FACE');
  // CUT size, BOX size: the sheet gives up 60, the room holds 40.
  for (const p of [left, right]) {
    assert.equal(p.w, 60);
    assert.equal(p.box.w, 40);
  }
  // The LEFT filler's wall edge is its own x = 0, so the allowance hangs off
  // there and the frame stays pinned to the nominal piece; the RIGHT filler's
  // wall edge is its far one, so it simply grows.
  assert.equal(Math.min(...left.cnc.outline.map(([x]) => x)), -20);
  assert.equal(Math.max(...left.cnc.outline.map(([x]) => x)), 40, 'the carcass edge has not moved');
  assert.equal(Math.min(...right.cnc.outline.map(([x]) => x)), 0, 'the carcass edge has not moved');
  assert.equal(Math.max(...right.cnc.outline.map(([x]) => x)), 60);
  // Both grow AWAY from the cabinet, which is the whole point of "wall edge".
  assert.equal(left.box.x, -40);
  assert.equal(right.box.x, 600);
});

test('THE MITRE IS A JOINT, NOT AN ALLOWANCE — its long point does not move', () => {
  // A 40 mm frame corner on a 40 mm filler. The chamfer runs off the INNER
  // edge, and the 20 grows the opposite one, so the two mitre points land where
  // they landed before there was an allowance at all.
  const r = build({ run_top_infill: { role: 'owner', offset: 0, length: 600, faceH: 40, ends: { left: 'wall', right: 'wall' }, sideMitre: { left: 40 } } });
  const left = byId(r, 'INFILL-L-FACE');
  const has = (x, y) => left.cnc.outline.some(([px, py]) => Math.abs(px - x) < 1e-6 && Math.abs(py - y) < 1e-6);
  assert.equal(left.meta.corner, 40);
  assert.ok(has(40, left.h - 40), 'the long point, on the carcass edge');
  assert.ok(has(0, left.h), 'and the short point');
  assert.ok(has(-20, left.h), '…with the allowance beyond it');
});

test('the CNC sheet stamps it, and the nominal is beside it', () => {
  const r = build();
  const left = byId(r, 'INFILL-L-FACE');
  assert.equal(slopeNoteText(left), 'OVERSIZE +20 — TRIM ON SITE (NOM 40)');
  assert.equal(slopeNoteText(left, { ascii: true }), 'OVERSIZE +20 - TRIM ON SITE (NOM 40)');
  const texts = panelEntities(left, [], { unitNum: '01', profile: P })
    .filter((e) => e.type === 'text').map((e) => e.str);
  assert.ok(texts.some((t) => t.includes('OVERSIZE +20')), JSON.stringify(texts));
  assert.ok(texts.some((t) => t.includes('NOM 40')), 'the nominal, so nobody prices the extra');
});

// ═══ THE CUT ════════════════════════════════════════════════════════════════

test('THE SIDE INFILL IS CUT ON THE CEILING LINE — the room stops lying', () => {
  const flat = build();
  const cut = build(FALL);
  const before = byId(flat, 'INFILL-R-FACE');
  const after = byId(cut, 'INFILL-R-FACE');
  assert.equal(before.h, 2250, 'full height under a flat ceiling: H + the legs');
  assert.ok(after.h < before.h, `the filler is cut: ${after.h} of ${before.h}`);
  // It stands OUTSIDE the cabinet, so the run is extended at its own gradient:
  // the ceiling at the cabinet's right edge is 1400 and 40 mm further on it is
  // 1360 — plus the 100 mm of leg the filler runs down past.
  assert.equal(after.h, 1500);
  assert.equal(after.meta.slopeCut.angles[0].deg, 45);
});

test('…and the LEFT one, on the other side of the same line', () => {
  const cut = build(FALL);
  const left = byId(cut, 'INFILL-L-FACE');
  // 60 mm of cut piece to the left of the cabinet: the ceiling there is
  // 2000 + 60 = 2060, and the filler's own y = 0 is 100 mm below the carcass
  // floor, so its blank is 2160.
  assert.equal(left.h, 2160);
  assert.equal(left.meta.slopeCut.angles[0].deg, 45);
});

test('the ARM is cut on the same line too — nothing runs into the plaster', () => {
  const cut = build(FALL);
  for (const id of ['INFILL-L-ARM', 'INFILL-R-ARM']) {
    const arm = byId(cut, id);
    assert.ok(arm.h < 2250, `${id}: ${arm.h}`);
    assert.ok(arm.cnc.outline.every(([, y]) => y <= arm.h + 1e-6));
  }
});

// ═══ THE SHAPE ══════════════════════════════════════════════════════════════

test('THE TOP INFILL STAYS A PLAIN RECTANGLE — it is not a trapezium', () => {
  const cut = build(FALL);
  const face = byId(cut, 'INFILL-T-FACE');
  assert.equal(face.cnc.outline.length, 4, 'four corners: a rectangle');
  assert.deepEqual(face.cnc.outline, [[0, 0], [face.w, 0], [face.w, face.h], [0, face.h]]);
});

test('…MOUNTED along the slope: its length is the hypotenuse, and it tilts', () => {
  const cut = build(FALL);
  const face = byId(cut, 'INFILL-T-FACE');
  assert.equal(face.meta.slopeCut.deg, 45);
  assert.equal(face.meta.slopeCut.span, 600, 'the ground it covers');
  assert.equal(face.meta.slopeCut.along, 848.5281, '…and the board that covers it');
  assert.ok(Math.abs(face.w - 600 / Math.cos(Math.PI / 4)) < 1e-3);
  assert.equal(face.meta.tilt_deg, 45, 'the 3-D tilts it rather than redrawing it');
  // The SHELF runs back at the ceiling, so it is the same length.
  assert.equal(byId(cut, 'INFILL-T-SHELF').w, 848.5281);
});

test('…and ONE PIECE PER SEGMENT, with the join cut at the angle the slope gives', () => {
  const cut = computeCabinet({
    ...BASE,
    width: 900,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 },
  }, P);
  const faces = infills(cut).filter((p) => p.meta.piece === 'face' && p.meta.side === 'top');
  assert.deepEqual(faces.map((p) => p.id), ['INFILL-T-FACE-1', 'INFILL-T-FACE-2']);
  assert.deepEqual(faces.map((p) => p.w), [300, 848.5281]);
  // A flat run meeting a 45° fall makes 135° between the two pieces, so each is
  // cut at 67.5 — half of it, which is the frame-corner rule.
  assert.equal(faces[0].meta.mitre.right, 67.5);
  assert.equal(faces[1].meta.mitre.left, 67.5);
});

// ═══ THE TWO MITRES, NEVER CONFUSED ═════════════════════════════════════════

test('the L CORNER of one infill piece is ALWAYS 45 — under any ceiling', () => {
  for (const over of [{}, FALL, { slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: 400 }], infill: 40 } }]) {
    for (const p of infills(build(over))) {
      assert.equal(p.meta.mitre.L, 45, `${p.id}: "infill mitra zawsze jest 45"`);
    }
  }
});

test('the SIDE × TOP junction is computed from the slope, and is 45 only when β is 0', () => {
  const mitreOf = (over) => {
    const r = computeCabinet({
      ...BASE,
      ...over,
      run_top_infill: {
        role: 'owner', offset: 0, length: 600, faceH: 40,
        ends: { left: 'wall', right: 'wall' }, sideMitre: { left: 40, right: 40 },
      },
    }, P);
    return {
      left: byId(r, 'INFILL-L-FACE').meta.mitre.deg,
      right: byId(r, 'INFILL-R-FACE').meta.mitre.deg,
    };
  };
  // A level ceiling: both corners square, both mitres the 45 they always were.
  assert.deepEqual(mitreOf({}), { left: 45, right: 45 });
  // A ceiling falling 45° to the right OPENS the right corner and CLOSES the
  // left: (90 − 45)/2 = 22.5 and (90 + 45)/2 = 67.5.
  assert.deepEqual(mitreOf(FALL), { left: 22.5, right: 67.5 });
  // …and the mirror image mirrors the two.
  assert.deepEqual(
    mitreOf({ slope_cut: { pts: [{ x: 0, y: 1400 }, { x: 600, y: 2000 }], infill: 40 } }),
    { left: 67.5, right: 22.5 },
  );
});

test('`mitre_45` keeps its name and its meaning — nothing downstream is renamed', () => {
  const r = build({
    run_top_infill: {
      role: 'owner', offset: 0, length: 600, faceH: 40,
      ends: { left: 'open', right: 'wall' }, sideMitre: { left: 40 },
    },
  });
  const face = byId(r, 'INFILL-T-FACE');
  assert.ok(Array.isArray(face.meta.mitre_45), 'still the list every reader speaks');
  assert.ok(face.meta.mitre_45.includes('long'));
  assert.equal(byId(r, 'INFILL-L-FACE').meta.mitre_45[0], 'end');
});

// ═══ THE GATE ═══════════════════════════════════════════════════════════════

test('no cut, no slope work at all: the pieces are the ones T46 cut, plus the 20', () => {
  const flat = build();
  for (const p of infills(flat)) {
    assert.equal(p.meta.slopeCut, undefined, `${p.id} is not cut`);
    assert.equal(p.meta.tilt_deg, undefined);
  }
  assert.equal(byId(flat, 'INFILL-T-FACE').cnc.outline.length, 4);
});
