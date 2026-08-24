import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildFrontElevation, elevationOutline } from '../src/engine/drawings/frontElevation.js';
import { detailOutline, partDetailDrawing, partSize } from '../src/engine/drawings/partDetail.js';
import { SHAPES, elevationSvg } from '../scripts/t47-shots.mjs';

// ─── TURN 47 · F5 — THE PENTAGON REACHES PAPER (CLAUDE.md F5) ───────────────
//
// T46-F6b's own finding, written down in `verify/t46/f6b-not-delivered.md`, and
// its own one-sentence fix:
//
//   *"the elevation traces the panel's outline where it has one, and its
//   bounding rectangle where it does not."*
//
// Two `if`s, and nothing else in the drawings system changes. No new sheets, no
// new dimension chains, no title-block work.

const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01', doors: 1 };
const CUT = { y0: 2400, y1: 1200, infill: 40 };
const cut = (over = {}) => computeCabinet({ ...PARAMS, slope_cut: CUT, ...over }, P);
const plain = () => computeCabinet(PARAMS, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);

// ═══ THE ELEVATION ══════════════════════════════════════════════════════════

test('the shots the eyes are asked for are re-runnable, and they are drawn', () => {
  // Iron rule 5: *"Every screenshot LOOKED AT."* `scripts/t47-shots.mjs` writes
  // them from the ENGINE's own panels through the app's own renderer, so a
  // reviewer is looking at the drawing this app produces and not at a picture
  // somebody made of it.
  const svg = elevationSvg({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', ...SHAPES['two-slopes'], doors: 0,
  });
  assert.match(svg, /^<svg xmlns/);
  assert.ok(svg.split('<line').length - 1 > 20, 'the boards are traced, not boxed');
  assert.deepEqual(Object.keys(SHAPES), ['plain', 'pentagon', 'knee', 'two-slopes']);
});

test('THE FINDING: T46 drew panel BOXES, and that is why the cut was invisible', () => {
  const note = readFileSync(new URL('../verify/t46/f6b-not-delivered.md', import.meta.url), 'utf8');
  assert.match(note, /panel BOXES, not panel OUTLINES/);
  assert.match(note, /One `if` in\n`frontElevation\.js`, one in `partDetail\.js`/);
});

test('a CUT panel is traced, corner for corner, in the drawing\'s own frame', () => {
  const r = cut();
  const back = byId(r, 'BACK');
  const segs = elevationOutline(back);
  assert.ok(segs, 'the back has an outline and it is traced');
  assert.equal(segs.length, 5, 'five sides, because it is a pentagon');
  // Every segment is the panel's own outline, offset by its box — so the shape
  // on the paper is the shape on the sheet and not a second opinion.
  const pts = back.cnc.outline;
  segs.forEach(([x1, y1, x2, y2], i) => {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    assert.deepEqual([x1, y1], [back.box.x + a[0], back.box.y + a[1]]);
    assert.deepEqual([x2, y2], [back.box.x + b[0], back.box.y + b[1]]);
  });
  // …and the diagonal really is in there: the knee at x = 125, y = 2150.
  assert.ok(segs.some(([x1, y1]) => Math.abs(x1 - 125) < 1e-6 && Math.abs(y1 - 2150) < 1e-6));
});

test('THE DOOR is a pentagon on the elevation too', () => {
  const front = byId(cut(), '01-F');
  assert.equal(front.cnc.outline.length, 5);
  assert.equal(elevationOutline(front).length, 5);
});

test('a panel with FOUR corners keeps its rectangle — four is a rectangle', () => {
  const r = cut();
  for (const p of plain().panels) assert.equal(elevationOutline(p), null, p.id);
  // …and on the cut cabinet, the boards the cut did not turn into a polygon.
  assert.equal(elevationOutline(byId(r, 'BOTTOM')), null);
});

test('a panel whose CUT FRAME is not its ELEVATION frame is NEVER traced from it', () => {
  // A SIDE's outline is in the DEPTH × HEIGHT plane — 550 wide where its
  // elevation box is 18 — and a TOP's is the BLANK, drawn TURNED. Tracing
  // either onto an XY elevation would put a 550 mm board where an 18 mm edge
  // belongs, which is the fault this guard exists for. Both are drawn from the
  // profile the ENGINE states for them instead (T47-F5), and never from `cnc`.
  const r = cut();
  const bul = byId(r, 'BUL');
  assert.ok(bul.cnc.outline.length > 4, 'it has plenty of corners (its tabs)');
  assert.notEqual(bul.cnc.drawn_w, bul.box.w, 'but its frame is not the elevation\'s');
  const top = r.panels.find((p) => p.role === 'top' && p.meta.bevel);
  assert.equal(top.cnc.rotated, true);
  // Strip the stated profile and the guard is what is left: the rectangle.
  const bare = (p) => ({ ...p, meta: { ...p.meta, elevation: undefined } });
  assert.equal(elevationOutline(bare(bul)), null);
  assert.equal(elevationOutline(bare(top)), null);
  // …and WITH it, each is its own shape: the side's bevel and the roof board's
  // parallelogram, neither of which its cut outline could ever have shown.
  assert.equal(elevationOutline(bul).length, 4, 'the bevelled side');
  assert.equal(elevationOutline(top).length, 4, 'the roof board\'s parallelogram');
  // The roof board's ends are cut VERTICALLY, so its two upright sides are
  // exactly that — upright — and its two faces are parallel.
  const segs = elevationOutline(top);
  const upright = segs.filter(([x1, , x2]) => Math.abs(x1 - x2) < 1e-6);
  assert.equal(upright.length, 2, '"pionowo lico do boku"');
  const slope = (s) => (s[3] - s[1]) / (s[2] - s[0]);
  const faces = segs.filter(([x1, , x2]) => Math.abs(x1 - x2) > 1e-6);
  assert.ok(Math.abs(slope(faces[0]) - slope(faces[1])) < 1e-9, 'a parallelogram');
});

test('the elevation DRAWS it — lines where the panel is cut, a rect where it is not', () => {
  const before = buildFrontElevation(plain(), { unitNum: '01', frontType: 'F', profile: P });
  const after = buildFrontElevation(cut(), { unitNum: '01', frontType: 'F', profile: P });
  const linesOf = (el) => el.entities.filter((e) => e.kind === 'line').length;
  assert.ok(linesOf(after) > linesOf(before), 'the cut boards are traced');
  // …and the traced board is no longer a BOX: the door's own rectangle is gone
  // from the sheet, replaced by the five sides of its pentagon.
  const door = cut().panels.find((p) => p.id === '01-F');
  const doorRect = (el) => el.entities.some((e) => e.kind === 'rect'
    && Math.abs(e.x - door.box.x) < 1e-6 && Math.abs(e.w - door.box.w) < 1e-6
    && Math.abs(e.h - door.box.h) < 1e-6);
  assert.equal(doorRect(after), false, 'the cut door is traced, not boxed');
  assert.equal(after.entities.filter((e) => e.kind === 'line' && e.layer === 'DOORS').length, 5,
    'five sides');
  // The cut cabinet's own diagonal is on the sheet: a line whose two ends are
  // at different heights, which no box edge can be.
  // (`DOOR_SWING` is diagonal by nature — it is the two lines that say which way
  // the leaf opens — so it is not what is being counted here.)
  const slanted = (el) => el.entities.filter((e) => e.kind === 'line' && e.layer !== 'DOOR_SWING'
    && e.layer !== 'DIMENSIONS'
    && Math.abs(e.x1 - e.x2) > 1e-6 && Math.abs(e.y1 - e.y2) > 1e-6);
  assert.ok(slanted(after).length >= 1, `${slanted(after).length} board diagonal(s)`);
  assert.equal(slanted(before).length, 0, 'and an uncut cabinet has none');
});

test('…and the traced piece keeps its own PEN and its own hidden flag', () => {
  const el = buildFrontElevation(cut(), { unitNum: '01', frontType: 'F', profile: P });
  const traced = el.entities.filter((e) => e.kind === 'line' && e.layer === 'DOORS');
  assert.ok(traced.length > 0);
  for (const e of traced) {
    assert.ok(e.pen === 'VISIBLE' || e.pen === 'HIDDEN');
    assert.equal(e.hidden, false, 'a front is not a hidden line');
  }
});

test('NOTHING ELSE in the drawings system changes', () => {
  const el = buildFrontElevation(cut(), { unitNum: '01', frontType: 'F', profile: P });
  // The carcass silhouette is still the one 0.50 on the sheet (T43-F4), and it
  // is still a rect: the OUTLINE of the whole unit, not of a board.
  const outline = el.entities.filter((e) => e.pen === 'OUTLINE');
  assert.equal(outline.length, 1);
  assert.equal(outline[0].kind, 'rect');
  // No new entity kind was invented for this: a closed run of LINES is what
  // every renderer in this house already draws.
  const kinds = new Set(el.entities.map((e) => e.kind));
  assert.deepEqual([...kinds].sort(), ['line', 'rect', 'text']);
});

// ═══ THE PART SHEET ═════════════════════════════════════════════════════════

test('the part sheet shows the REAL board, not its bounding rectangle', () => {
  const back = byId(cut(), 'BACK');
  const drawing = partDetailDrawing(back, { profile: P });
  assert.deepEqual(drawing.outline, back.cnc.outline);
  assert.equal(drawing.outline.length, 5);
  // The overall dimensions stay the bounding box, which is what a joiner orders
  // the board by — F5 asks for the SHAPE, not for a new dimension chain.
  assert.equal(drawing.size.w, back.cnc.drawn_w);
  assert.equal(drawing.size.h, back.cnc.drawn_h);
});

test('…and its bounding rectangle where it has no outline at all', () => {
  // T25-F1.4: a part of no size has no outline, and everything downstream drops
  // it. A part WITH a size and no outline is a different thing — the detail has
  // a board to show and used to show nothing.
  assert.deepEqual(detailOutline({ cnc: { outline: [] } }, { w: 600, h: 400 }),
    [[0, 0], [600, 0], [600, 400], [0, 400]]);
  assert.deepEqual(detailOutline({}, { w: 600, h: 400 }),
    [[0, 0], [600, 0], [600, 400], [0, 400]]);
  assert.deepEqual(detailOutline({ cnc: { outline: [] } }, { w: 0, h: 0 }), []);
  // …and a real outline is passed through untouched.
  const back = byId(cut(), 'BACK');
  assert.equal(detailOutline(back, partSize(back)), back.cnc.outline);
});

test('the part sheet says the ANGLE the outline cannot show (F2/F3 meet F5 here)', () => {
  const r = cut();
  assert.equal(partDetailDrawing(byId(r, 'BUR'), { profile: P }).note, 'CUT 63.4°');
  const roof = r.panels.filter((p) => p.role === 'top').find((p) => p.meta.bevel);
  assert.equal(partDetailDrawing(roof, { profile: P }).note, 'BEVEL 63.4° BOTH ENDS · 5-AXIS');
});
