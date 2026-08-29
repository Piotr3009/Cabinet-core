import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { canonical } from '../scripts/t54-classify.mjs';

// ─── T54 · F3 — THE DOOR LEAF IS CUT ON THE SLOPE ITS SHAKER KNOWS ─────────
//
// The owner, screenshot in hand: *"shaker się robi pod skosem ale całe drzwi
// już nie."*
//
// DIAGNOSED: the LEAF has been cut since T46-F4 — the owner's screenshot is
// the SPLIT pass: it replaced a cut leaf with two RECTANGLES while
// `...leaf.meta` copied the parent's `slopeCut` onto them, so the shaker
// detail raked (it reads the meta) while the segment's own outline stood a
// full rectangle into the triangle. One consumer got the line, the other
// never heard of it. Two smaller holes rode along: a cut leaf's sheet said
// NOTHING about its angle (`meta.slopeCut.angles` was never published for a
// FRONT), and the shaker's raked pocket reached the DXF as its bounding box.
//
// THE LAW (KIT_DOOR_DOUBLE.lsp, T54 section — LISP first): the leaf's top is
// a single β cut on the line above the door, less `topGap` — the clearance a
// front keeps to what is above it, `P.doors.gap`, read from the fronts' own
// law, never restated. Per leaf, over its OWN span; a segment of a split
// takes the SAME line lowered by its own y; hinges ladder over the CUT
// stile; the sheet prints `CUT β°` like the sides; a leaf wholly under a
// flat stretch stays a rectangle, byte for byte.

const G = P.board.thickness;
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const H = PARAMS.height;
const W = PARAMS.width;
const INFILL = 40;
const GAP = P.doors.gap;

const CUT_R = { pts: [{ x: 0, y: 2000 }, { x: W, y: 1400 }], infill: INFILL };
const CUT_L = { pts: [{ x: 0, y: 1400 }, { x: W, y: 2000 }], infill: INFILL };

const build = (cut, over = {}) => computeCabinet({ ...PARAMS, ...over, slope_cut: cut }, P);
const leafCeilOf = (cut) => {
  const beta = Math.atan(Math.abs(cut.pts[1].y - cut.pts[0].y) / W);
  const res = INFILL / Math.cos(beta);
  return (x) => (cut.pts[0].y + ((cut.pts[1].y - cut.pts[0].y) * x) / W) - res - GAP;
};

/** A FRONT's outline vertices in the ROOM frame (the sheet is the mirror). */
const roomOutline = (p) => p.cnc.outline.map(([x, y]) => [p.box.x + p.w - x, p.box.y + y]);

for (const [name, CUT] of [['fall RIGHT', CUT_R], ['fall LEFT', CUT_L]]) {
  const leafCeil = leafCeilOf(CUT);

  test(`F3.5 · ${name} — no leaf vertex above leafCeil (≤ 0.01), single door`, () => {
    const r = build(CUT);
    const leaf = r.panels.find((p) => p.id === '01-F');
    assert.ok(leaf, 'the single leaf');
    assert.ok(leaf.meta.slopeCut, 'and it is cut');
    for (const [x, y] of roomOutline(leaf)) {
      assert.ok(y <= leafCeil(x) + 0.01, `vertex (${x}, ${y}) under leafCeil ${leafCeil(x).toFixed(4)}`);
    }
    // …and the top edge IS the line, not merely under it: the tall stile
    // reaches it exactly.
    const tallX = CUT.pts[0].y > CUT.pts[1].y ? leaf.box.x : leaf.box.x + leaf.w;
    assert.ok(Math.abs(Math.min(H, leafCeil(tallX))
      - (leaf.box.y + leaf.h)) <= 0.02, 'the tall stile lands on the line');
  });

  test(`F3.2 · ${name} — DOUBLE doors: each leaf clipped over ITS OWN span`, () => {
    // A 900 wardrobe takes two leaves (`doorCountFor`, over the 700 single
    // max); the same rake, restated over its width.
    const W2 = 900;
    const pts2 = CUT.pts.map((q) => ({ x: (q.x / W) * W2, y: q.y }));
    const r = computeCabinet({
      ...PARAMS, width: W2, slope_cut: { infill: INFILL, pts: pts2 },
    }, P);
    const beta2 = Math.atan(Math.abs(pts2[1].y - pts2[0].y) / W2);
    const ceil2 = (x) => (pts2[0].y + ((pts2[1].y - pts2[0].y) * x) / W2)
      - INFILL / Math.cos(beta2) - GAP;
    for (const id of ['01-FL', '01-FR']) {
      const leaf = r.panels.find((p) => p.id === id);
      assert.ok(leaf, `${id} exists`);
      assert.ok(leaf.meta.slopeCut, `${id} is cut over its own stretch`);
      for (const [x, y] of roomOutline(leaf)) {
        assert.ok(y <= ceil2(x) + 0.01, `${id} vertex under its own line`);
      }
    }
    // The two leaves are cut to DIFFERENT heights — the line falls across.
    const [fl, fr] = ['01-FL', '01-FR'].map((id) => r.panels.find((p) => p.id === id));
    assert.ok(Math.abs(fl.h - fr.h) > 100, 'the line tells the two leaves apart');
  });

  test(`F3.3 · ${name} — every cup centre INSIDE the cut outline`, () => {
    const r = build(CUT);
    const leaf = r.panels.find((p) => p.id === '01-F');
    const stile = leaf.meta.hinge === 'L' ? leaf.meta.slopeCut.roomL : leaf.meta.slopeCut.roomR;
    assert.equal(leaf.meta.hingeForced, true, 'the hand is the slope\'s, not a choice');
    assert.ok(leaf.meta.cupY.length >= 1, 'the leaf still hangs on something');
    for (const y of leaf.meta.cupY) {
      assert.ok(y >= 0 && y <= stile + 1e-6, `cup at ${y} on the ${leaf.meta.hinge} stile (${stile})`);
    }
  });

  test(`F3.4 · ${name} — the sheet says CUT β°, like the sides`, () => {
    const r = build(CUT);
    const leaf = r.panels.find((p) => p.id === '01-F');
    assert.ok(Array.isArray(leaf.meta.slopeCut.angles), 'angles published');
    const beta = (Math.atan(Math.abs(CUT.pts[1].y - CUT.pts[0].y) / W) * 180) / Math.PI;
    assert.ok(leaf.meta.slopeCut.angles.some((a) => Math.abs(a.deg - beta) < 0.05),
      'the segment\'s own β');
    assert.match(slopeNoteText(leaf), /^CUT \d+\.\d°/, 'and the note prints it');
    // The elevation draws the same polygon: a cut FRONT's outline is traced
    // (unrotated, drawn dims = box dims) — the parity the drawings rely on.
    assert.ok(!leaf.cnc.rotated, 'a front is drawn in its own frame');
    assert.ok(Math.abs(leaf.cnc.drawn_w - leaf.box.w) < 1e-6
      && Math.abs(leaf.cnc.drawn_h - leaf.box.h) < 1e-6, 'drawn dims are the box — the elevation traces it');
  });

  test(`F3.1 · ${name} — the shaker inner line runs PARALLEL to the cut edge at the flat inset`, () => {
    const r = build(CUT, { front_type: 'S' });
    const leaf = r.panels.find((p) => p.id === '01-F');
    assert.ok(leaf.meta.shaker, 'the shaker survived the rake');
    const pocket = leaf.cnc.pockets.find((k) => Array.isArray(k.points));
    assert.ok(pocket, 'the raked pocket is a polygon, not a box');
    const frame = leaf.meta.shaker.frame;
    // The cut edge in the SHEET frame; the pocket is in the same frame.
    const cutEdge = leaf.cnc.slopeCut.pts;
    const m = (cutEdge[cutEdge.length - 1].y - cutEdge[0].y)
      / (cutEdge[cutEdge.length - 1].x - cutEdge[0].x);
    // Find the pocket's raked edge: the segment whose slope matches the cut.
    const raked = pocket.points.map((q, i) => [q, pocket.points[(i + 1) % pocket.points.length]])
      .find(([a, b]) => Math.abs(b[0] - a[0]) > 1
        && Math.abs((b[1] - a[1]) / (b[0] - a[0]) - m) < 1e-3);
    assert.ok(raked, 'one pocket edge runs with the rake');
    // Perpendicular distance from the cut line to that edge = the frame, the
    // flat law's own inset (offset f·√(1+m²) in y ⇒ f perpendicular).
    const dy = (cutEdge[0].y + m * (raked[0][0] - cutEdge[0].x)) - raked[0][1];
    assert.ok(Math.abs(dy * Math.cos(Math.atan(Math.abs(m))) - frame) < 0.01,
      `inset ${(dy * Math.cos(Math.atan(Math.abs(m)))).toFixed(3)} = frame ${frame}`);
  });
}

// ─── THE SPLIT — the owner's screenshot, cut segment by segment ─────────────

test('F3 · a SPLIT door under the rake: the top segment is CUT, the bottom stays a rectangle', () => {
  const r = build(CUT_R, { split_top_mm: 600 });
  const top = r.panels.find((p) => p.id === '01-F-T');
  const bottom = r.panels.find((p) => p.id === '01-F-B');
  assert.ok(top && bottom, 'two segments');
  assert.ok(top.cnc.slopeCut, 'the TOP segment publishes its own line — the scene clips the leaf, not just its shaker');
  assert.ok(top.cnc.outline.length >= 4, 'and its outline is the cut polygon');
  assert.ok(top.meta.slopeCut, 'its meta is the segment\'s own, sub-set from the parent');
  assert.ok(top.meta.slopeCut.tall <= top.meta.splitTopMm + 1e-6, 'cut within its own band');
  // The bottom segment sits wholly under the line: a rectangle, no cut record.
  assert.equal(bottom.cnc.slopeCut, undefined, 'the bottom is the rectangle it always was');
  assert.equal(bottom.meta.slopeCut, undefined, 'and carries no stale parent record');
  assert.equal(bottom.cnc.outline.length, 4);
  // Hinges: every cup of the cut segment on its own cut stile.
  const stile = top.meta.hinge === 'L' ? top.meta.slopeCut.roomL : top.meta.slopeCut.roomR;
  assert.ok(top.meta.cupY.length >= 1, 'the segment hangs on something');
  for (const y of top.meta.cupY) {
    assert.ok(y >= 0 && y <= stile + 1e-6, `cup at ${y} within the cut stile ${stile}`);
  }
  // …and the segments still add up to the leaf they replaced, on the tall
  // stile — measured against the same scene built WITHOUT the split.
  const whole = build(CUT_R).panels.find((p) => p.id === '01-F');
  assert.ok(Math.abs((bottom.h + 3 + top.meta.slopeCut.tall) - whole.h) < 0.01,
    'top + 3 + bottom = the cut leaf');
});

test('F3.2 · a leaf wholly under a FLAT stretch stays a rectangle, byte-identical (the probe)', () => {
  const flat = computeCabinet({ ...PARAMS }, P);
  const flatCut = computeCabinet({
    ...PARAMS,
    // The ceiling dips far from the door: over the leaf the line clears it.
    slope_cut: { infill: INFILL, pts: [{ x: 0, y: H + 500 }, { x: W, y: H + 200 }] },
  }, P);
  const a = flat.panels.find((p) => p.id === '01-F');
  const b = flatCut.panels.find((p) => p.id === '01-F');
  assert.equal(canonical(a), canonical(b), 'the leaf did not move by a byte');
  // …and the split under a flat stretch is byte-identical too.
  const s1 = computeCabinet({ ...PARAMS, split_top_mm: 600 }, P);
  const s2 = computeCabinet({
    ...PARAMS,
    split_top_mm: 600,
    slope_cut: { infill: INFILL, pts: [{ x: 0, y: H + 500 }, { x: W, y: H + 200 }] },
  }, P);
  for (const id of ['01-F-T', '01-F-B']) {
    assert.equal(canonical(s1.panels.find((p) => p.id === id)),
      canonical(s2.panels.find((p) => p.id === id)), `${id} untouched`);
  }
});

test('F3 · LISP is law: the leaf law stands in KIT_DOOR_DOUBLE', () => {
  const kit = readFileSync(new URL('../reference/lisp/KIT_DOOR_DOUBLE.lsp', import.meta.url), 'utf8');
  assert.match(kit, /THE LEAF UNDER THE SLOPE/);
  assert.match(kit, /\(defun SKY:leafCeilAt \(lineAt x topGap\)/);
  assert.match(kit, /\(defun SKY:leafSegLineY \(parentY segY\)/);
  assert.match(kit, /cale drzwi\s+;;; juz nie|cale drzwi juz nie/, 'the owner\'s words stand where the law is');
});
