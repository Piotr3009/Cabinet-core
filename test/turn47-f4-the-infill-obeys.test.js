import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { panelEntities, panelNoteBlock } from '../src/engine/cnc/dxf.js';

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
//
// ─── T54-F1 AMENDED (28.08.2026) ────────────────────────────────────────────
// Two reach functions now, not one: the CARCASS (sides, roof, back, fronts)
// is cut on cutReach(x) = ceil(x) − infill/cosβ, while the infills in this
// file SCRIBE TO THE PLASTER and stay on the ceiling (ceilReach) itself — so
// every side-infill number below is unchanged BY LAW, not by accident. Of
// the top trio, only INFILL-T-FACE keeps the ceiling pivot; the roof TOP
// moved to cutReach and INFILL-T-SHELF moved UNDER the roof — amended where
// asserted below.

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

test('T50-F11 · THE ALLOWANCE IS ALL THAT IS LEFT — the mitre is not cut at all', () => {
  // T47 asserted here that the chamfer ran off the INNER edge while the 20 grew
  // the opposite one, so the mitre's two points landed where they landed before
  // there was an allowance. T50-F11 ends the mitre: the top infill has been two
  // plain boards since T48-F2 and the filler that meets one is cut square to
  // it, so what the corner is cut from is the SAME 20 mm on site. The number
  // survives on the part, which is the half T48 kept for the top board.
  const r = build({ run_top_infill: { role: 'owner', offset: 0, length: 600, faceH: 40, ends: { left: 'wall', right: 'wall' }, sideMitre: { left: 40 } } });
  const left = byId(r, 'INFILL-L-FACE');
  const has = (x, y) => left.cnc.outline.some(([px, py]) => Math.abs(px - x) < 1e-6 && Math.abs(py - y) < 1e-6);
  assert.equal(left.meta.corner, 40, 'the number is still on the part');
  assert.equal(left.meta.mitre_45, undefined, 'but there is no 45° to cut');
  assert.ok(has(40, left.h), 'the inner edge runs square to the top of the board');
  assert.ok(has(-20, left.h), '…and the allowance is still beyond the other end');
  assert.ok(!has(40, left.h - 40), 'the long point is gone with the joint');
});

test('the CNC sheet stamps it, and the nominal is beside it', () => {
  const r = build();
  const left = byId(r, 'INFILL-L-FACE');
  assert.equal(slopeNoteText(left), 'OVERSIZE +20 — TRIM ON SITE (NOM 40)');
  assert.equal(slopeNoteText(left, { ascii: true }), 'OVERSIZE +20 - TRIM ON SITE (NOM 40)');
  // On a 60 mm filler the words go DOWN the board rather than across it — the
  // turn-16 lettering rule, and the note would rather be small than half-said.
  const block = panelNoteBlock(left, { profile: P, ascii: true });
  assert.equal(block.lines.map((l) => l.text).join(' '), 'OVERSIZE +20 - TRIM ON SITE (NOM 40)');
  assert.equal(block.lines.some((l) => l.text.endsWith('~')), false, 'nothing half-said');
  const texts = panelEntities(left, [], { unitNum: '01', profile: P })
    .filter((e) => e.type === 'text').map((e) => e.str).join(' ');
  assert.ok(texts.includes('OVERSIZE'), texts);
  assert.ok(texts.includes('NOM 40'), 'the nominal, so nobody prices the extra');
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
  // T54-F1 AMENDED (28.08.2026): still the CEILING line, now by name — the
  // side infill scribes to the plaster, so it stays on ceilReach while the
  // carcass moved down to cutReach; 1500 is unchanged under the new law.
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
  // T48-F2: `w` is the BLANK and now carries the site-cut allowance on one
  // end; `slopeCut.along` is still the board that covers the ground.
  const OVER = P.autoParts.fillerOversize;
  assert.ok(Math.abs(face.w - (600 / Math.cos(Math.PI / 4) + OVER)) < 1e-3);
  // Chat-fix 25.08.2026: the deg is SIGNED now — CCW about Z, so THIS fall
  // (left-high, right-low) leans clockwise — and the scene finally can tilt
  // it: the axis is named and the pivot hangs on the ceiling at the low end.
  assert.equal(face.meta.tilt_deg, -45, 'the 3-D tilts it rather than redrawing it');
  assert.equal(face.meta.tilt_axis, 'z');
  assert.deepEqual(face.meta.tilt_pivot, { x: 600, y: 1400 });
  // T54-F1 AMENDED (28.08.2026): of the trio, this piece ALONE keeps the
  // ceiling pivot — the roof TOP moved to cutReach and the shelf under the
  // roof — and on a raked segment its BOX height is the RESERVE itself, so
  // after the spin its top edge lies on ceilReach and its bottom on
  // cutReach: box h = infill (40), cut piece = infill + 20, and the meta now
  // states the cut height and the rotated corners.
  assert.equal(face.box.h, 40, "box height = the reserve (the owner's 40)");
  assert.equal(face.h, 60, 'cut piece = infill + 20 scribe oversize');
  assert.equal(face.meta.slopeCut.cutHeight, 40, 'the sheet states the CUT height');
  assert.equal(face.box.y + face.box.h, 1400, 'pre-spin, the top edge hangs on the pivot line');
  assert.equal(face.meta.elevation.length, 4, 'raked meta carries the rotated corners');
  // T55 AMENDED (29.08.2026, the owner's simplification): the SHELF left the
  // rake — *"usuń to wszystko z infillami pod skosem ... prosty infill BEZ
  // ZAWIJANIA"* — so the T54 shelf-under-the-roof paragraph above is history
  // and the piece is asserted ABSENT here. The wrap lives on LEVEL stretches
  // only (proved beside the two-board CNC tests below).
  assert.equal(byId(cut, 'INFILL-T-SHELF'), undefined,
    'no shelf under a rake (T55)');
});

test('…and ONE PIECE PER SEGMENT, with the join cut at the angle the slope gives', () => {
  const cut = computeCabinet({
    ...BASE,
    width: 900,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 },
  }, P);
  const faces = infills(cut).filter((p) => p.meta.piece === 'face' && p.meta.side === 'top');
  assert.deepEqual(faces.map((p) => p.id), ['INFILL-T-FACE-1', 'INFILL-T-FACE-2']);
  // T48-F2: each END segment carries the site-cut allowance on its OUTER end —
  // the first on the left, the last on the right. A MIDDLE segment would carry
  // none: both of its ends are machine-cut joins.
  // T54-F1 AMENDED (28.08.2026): the FACE still splits at the CEILING's own
  // knee (x = 300) — the carcass line's knee shifts to the mitred-offset
  // intersection, but that is the roof's business, not the strip's — so both
  // widths and both 67.5s stand.
  const OVER = P.autoParts.fillerOversize;
  assert.deepEqual(faces.map((p) => p.w), [300 + OVER, 848.5281 + OVER]);
  assert.deepEqual(faces.map((p) => p.meta.lengthOversize.end), ['left', 'right']);
  // A flat run meeting a 45° fall makes 135° between the two pieces, so each is
  // cut at 67.5 — half of it, which is the frame-corner rule.
  assert.equal(faces[0].meta.mitre.right, 67.5);
  assert.equal(faces[1].meta.mitre.left, 67.5);
});

// ═══ THE TWO MITRES, NEVER CONFUSED ═════════════════════════════════════════

// ─── T48-F2 AMENDS THIS ─────────────────────────────────────────────────────
// ─── OVERRULED, 25.08.2026 — for the TOP infill only ────────────────────────
//
// The owner: *"zamiast L shape … jedna deske jak plinth i tyle. … infill
// pionowy nie ruszamy."*
//
// The TOP infill has no L any more, so it has no L corner and no 45 to state.
// The SIDE infill still has both — its face and its arm are still one L, and
// *"infill pionowy nie ruszamy"* is the whole of why — so T47's sentence
// ("infill mitra zawsze jest 45") stands exactly where it still applies.
test('the L CORNER of a SIDE infill is ALWAYS 45 — under any ceiling', () => {
  for (const over of [{}, FALL, { slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 600, y: 400 }], infill: 40 } }]) {
    for (const p of infills(build(over))) {
      if (p.meta.side === 'top') {
        assert.equal(p.meta.mitre?.L, undefined, `${p.id}: the L is dead on the top infill`);
      } else {
        assert.equal(p.meta.mitre.L, 45, `${p.id}: "infill mitra zawsze jest 45"`);
      }
    }
  }
});

test('T50-F11 · the SIDE × TOP junction is a BUTT now, so no angle is stated', () => {
  // T47 derived `(90 ± β) / 2` for this joint and was right about the geometry.
  // T50-F11 takes the joint away — the top is a plain board and the side is cut
  // square to meet it — so the DEGREES are no longer printed on the part: a
  // number on a joint that is not there is a joiner sent to the saw for nothing.
  // `sideTopMitreDeg` stays in `engine/cabinet.js`, unused and correct, for the
  // day the top board goes back to a long point.
  const r = computeCabinet({
    ...BASE,
    ...FALL,
    run_top_infill: {
      role: 'owner', offset: 0, length: 600, faceH: 40,
      ends: { left: 'wall', right: 'wall' }, sideMitre: { left: 40, right: 40 },
    },
  }, P);
  assert.equal(byId(r, 'INFILL-L-FACE').meta.mitre.deg, undefined);
  assert.equal(byId(r, 'INFILL-R-FACE').meta.mitre.deg, undefined);
  // The L corner of the piece's OWN two arms is a different joint and is
  // untouched: *"infill mitra zawsze jest 45."*
  assert.equal(byId(r, 'INFILL-L-FACE').meta.mitre.L, 45);
  assert.equal(byId(r, 'INFILL-L-ARM').meta.mitre.L, 45);
  const src = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.match(src, /const sideTopMitreDeg = \(isLeft, a, b\) =>/, 'the derivation is kept');
});

test('T47 · the derivation itself is still right, and is what would come back', () => {
  const mitreOf = (over) => {
    const r = computeCabinet({
      ...BASE,
      ...over,
      run_top_infill: {
        role: 'owner', offset: 0, length: 600, faceH: 40,
        ends: { left: 'wall', right: 'wall' }, sideMitre: { left: 40, right: 40 },
      },
    }, P);
    // The pieces no longer PRINT it (the test above), so the derivation is
    // measured where it lives — the angle of the ceiling over each filler,
    // halved into a frame corner, which is what `sideTopMitreDeg` computes.
    const degOf = (id) => {
      const a = byId(r, id).meta.slopeCut?.angles?.[0]?.deg ?? 0;
      return id.includes('-L-') ? (90 + a * (over.slopeUp ? 1 : -1)) / 2 : (90 - a * (over.slopeUp ? 1 : -1)) / 2;
    };
    return { left: degOf('INFILL-L-FACE'), right: degOf('INFILL-R-FACE') };
  };
  // A level ceiling: both corners square, both mitres the 45 they always were.
  assert.deepEqual(mitreOf({}), { left: 45, right: 45 });
  // A ceiling falling 45° to the right OPENS the right corner and CLOSES the
  // left: (90 − 45)/2 = 22.5 and (90 + 45)/2 = 67.5.
  assert.deepEqual(mitreOf(FALL), { left: 22.5, right: 67.5 });
  // …and the mirror image mirrors the two.
  assert.deepEqual(
    mitreOf({ slope_cut: { pts: [{ x: 0, y: 1400 }, { x: 600, y: 2000 }], infill: 40 }, slopeUp: true }),
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
  // T48-F2: what it CONTAINS changed with the L — 'long' is gone, 'end'
  // survives at the turning corner. The name and the shape did not.
  assert.equal(face.meta.mitre_45.includes('long'), false);
  assert.ok(face.meta.mitre_45.includes('end'), 'the left end is open — the run turns there');
  // T50-F11: the FILLER no longer carries one. Its `end` was the side × top
  // mitre, and that joint is a butt now; the top board's `end` above is the
  // turning corner where two RUNS meet, which is a different joint and stands.
  assert.equal(byId(r, 'INFILL-L-FACE').meta.mitre_45, undefined);
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
