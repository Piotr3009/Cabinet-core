import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { roofLinePts, slopeSegDeg } from '../src/engine/puzzle.js';
import { partLabelText, slopeNoteText } from '../src/engine/cnc/partLabel.js';
import { panelEntities, panelNoteBlock } from '../src/engine/cnc/dxf.js';
import { partDetailDrawing } from '../src/engine/drawings/partDetail.js';

// ─── TURN 47 · F2 — THE SIDES RUN TO THE POINT (CLAUDE.md F2) ───────────────
//
// The owner, 24.08.2026:
//
//   *"BUL i BUR przedluzony do czubka skosu i ustawione ciecie pod skosem,
//   najlepiej zeby bylo napisane jaki kat ciecia, na CNC tez zeby bylo
//   napisane."*
//
// T46 dropped each side to the LOWER of the ceiling at its two faces. That is
// the honest shape for a board with a SQUARE top — and it throws `G · tan β` of
// cabinet away at every side and leaves the triangle above it open. The owner
// asked for the BEVEL, which is what a joiner cuts: the board runs up to the
// peak and the wedge comes off at the ceiling's own angle.
//
// The three places the angle has to appear are named in F2 and asserted here:
// the panel's own record, the part drawing, and the CNC sheet.
//
// ─── AND F3 IS THE OTHER HALF OF THE SAME SENTENCE ──────────────────────────
//
// *"boki sa w tym przypadku pod wiencem a nie obok."* The side does not run to
// the CEILING — it runs to the underside of the board that lies on it, which is
// the ceiling less that board's VERTICAL FOOTPRINT `G / cos β`. So every height
// below is a peak less a footprint, and the two are asserted apart so a later
// turn can see which one moved.

const G = P.board.thickness;
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const H = PARAMS.height;
const cut = (over) => computeCabinet({ ...PARAMS, ...over }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);

// ═══ THE SIDE RUNS UP ════════════════════════════════════════════════════════

test('a side is the BLANK — as tall as its highest corner, not its lowest', () => {
  // 2000 at the left edge, falling 1200 over 600 — one 63.4349° run, one roof
  // board, footprint 18 / cos β = 40.2492. Over BUL's own 18 mm the ceiling
  // runs 2000 → 1964; over BUR's, 836 → 800. Each side stops 40.2492 under.
  const r = cut({ slope_cut: { y0: 2000, y1: 800, infill: 40 } });
  const foot = 18 / Math.cos(Math.atan(1200 / 600));
  assert.ok(Math.abs(panelOf(r, 'BUL').h - (2000 - foot)) < 1e-3);
  assert.ok(Math.abs(panelOf(r, 'BUR').h - (836 - foot)) < 1e-3);
  assert.equal(panelOf(r, 'BUL').h, 1959.7508);
  assert.equal(panelOf(r, 'BUR').h, 795.7508);
  // …and the short face — what the finished board measures — is stated beside
  // it, because that is the number a joiner checks the bevel against.
  assert.equal(panelOf(r, 'BUL').meta.slopeCut.low, 1923.7508);
  assert.equal(panelOf(r, 'BUR').meta.slopeCut.low, 759.7508);
  // The blank less the short face IS `G · tan β`, which is the wedge — and it
  // does not care what the board stops under, because the footprint moves both
  // faces down together.
  const tanB = 1200 / 600;
  for (const id of ['BUL', 'BUR']) {
    const p = panelOf(r, id);
    assert.ok(Math.abs((p.h - p.meta.slopeCut.low) - G * tanB) < 1e-3,
      `${id}: wedge ${p.h - p.meta.slopeCut.low} vs G·tanβ ${G * tanB}`);
  }
});

test('…and it never runs past the cabinet\'s own height', () => {
  // The ceiling clears the carcass at the left, so the roof line is FLAT at
  // 2150 there and BUL stops one plain board thickness under it — 2132, not
  // 2150, because there is a board lying on it now (F3).
  const r = cut({ slope_cut: { y0: 2400, y1: 1200, infill: 40 } });
  assert.equal(panelOf(r, 'BUL').h, H - G);
  assert.equal(panelOf(r, 'BUL').meta.slopeCut.angles[0].deg, 0, 'and square there');
  // The right side is under the 63.4349° board: peak 1236 less its 40.2492.
  assert.equal(panelOf(r, 'BUR').h, 1195.7508);
  // Not one board goes past the cabinet's own height.
  for (const p of r.panels) {
    if (p.box) assert.ok(p.box.y + p.box.h <= H + 1e-6, `${p.id} at ${p.box.y + p.box.h}`);
  }
});

test('a side under a FLAT stretch of ceiling carries no angle and no bevel', () => {
  // The ceiling is level at 1800 over the left third and then falls. BUL stands
  // under the flat part: it is CUT (1800 < 2150) but it is not BEVELLED.
  const r = cut({
    width: 900,
    slope_cut: { pts: [{ x: 0, y: 1800 }, { x: 300, y: 1800 }, { x: 900, y: 1200 }], infill: 40 },
  });
  const bul = panelOf(r, 'BUL');
  // 1800 less a level board's own 18 — `G / cos 0` is G, so a flat roof board
  // is exactly the board this engine has always cut.
  assert.equal(bul.h, 1782);
  assert.deepEqual(bul.meta.slopeCut.angles, [{ from: 0, to: G, deg: 0 }],
    'the edge is square here, and the record says so');
  assert.equal(bul.meta.slopeCut.low, 1782, 'both faces at the same height');
  assert.equal(slopeNoteText(bul), '', 'and the board says nothing about an angle');
});

// ═══ THE ANGLE IS THE SEGMENT'S OWN ══════════════════════════════════════════

test('THE ANGLE IS THE SEGMENT\'S, not the cabinet\'s corner-to-corner fiction', () => {
  // Flat at 2000 to x = 300, then falling 600 over 600 — a 45° run. BUR stands
  // under the fall and must be cut at 45, not at the 33.7 a straight line from
  // corner to corner would give.
  const r = cut({
    width: 900,
    slope_cut: { pts: [{ x: 0, y: 2000 }, { x: 300, y: 2000 }, { x: 900, y: 1400 }], infill: 40 },
  });
  const bur = panelOf(r, 'BUR');
  assert.equal(bur.meta.slopeCut.angles.length, 1);
  assert.equal(bur.meta.slopeCut.angles[0].deg, 45);
  assert.deepEqual(
    [bur.meta.slopeCut.angles[0].from, bur.meta.slopeCut.angles[0].to],
    [900 - G, 900],
    'stated in the UNIT\'s own x, where the ceiling line is stated',
  );
  // The fiction, for the record: corner to corner is 33.7° and the plaster
  // would be 11 degrees away from the board.
  assert.equal(Math.round(slopeSegDeg(900, -600) * 10) / 10, 33.7);
});

test('A SIDE THAT SPANS A KNEE carries TWO angles and the vertex between them', () => {
  // The knee is put INSIDE BUL's own 18 mm: flat to x = 9, then falling.
  const r = cut({
    slope_cut: { pts: [{ x: 0, y: 1800 }, { x: 9, y: 1800 }, { x: 600, y: 1200 }], infill: 40 },
  });
  const bul = panelOf(r, 'BUL');
  assert.equal(bul.meta.slopeCut.angles.length, 2, 'two segments over one board');
  assert.equal(bul.meta.slopeCut.angles[0].deg, 0, 'flat first');
  assert.ok(bul.meta.slopeCut.angles[1].deg > 0, 'then the fall');
  // The vertex between them is the knee, and it is at the knee's own x.
  assert.equal(bul.meta.slopeCut.angles[0].to, 9);
  assert.equal(bul.meta.slopeCut.angles[1].from, 9);
  // The blank is the peak over the whole 18 — the flat part's height, less that
  // flat board's own 18.
  assert.equal(bul.h, 1782);
  // …and the board says BOTH angles, because a joiner setting one and not the
  // other cuts the wrong wedge.
  assert.match(slopeNoteText(bul), /CUT /);
});

// ═══ THE ANGLE IS WRITTEN WHERE A JOINER READS IT ════════════════════════════

const noted = () => panelOf(cut({ slope_cut: { y0: 2000, y1: 800, infill: 40 } }), 'BUR');

test('1 · ON THE PANEL\'S OWN RECORD — meta.slopeCut.angles [{from, to, deg}]', () => {
  const bur = noted();
  assert.deepEqual(bur.meta.slopeCut.angles, [{ from: 582, to: 600, deg: 63.4349 }]);
});

test('2 · ON THE PART DRAWING', () => {
  const drawing = partDetailDrawing(noted(), { profile: P });
  assert.equal(drawing.note, 'CUT 63.4°', 'one decimal, as F2 asks');
  // …and a part with nothing extra to say adds nothing to the drawing.
  const plain = computeCabinet(PARAMS, P).panels.find((p) => p.id === 'BUR');
  assert.equal(partDetailDrawing(plain, { profile: P }).note, '');
});

test('3 · ON THE CNC SHEET, as text beside the edge', () => {
  const bur = noted();
  const ents = panelEntities(bur, [], { unitNum: '01', profile: P });
  const texts = ents.filter((e) => e.type === 'text').map((e) => e.str);
  // It is laid out INSIDE the part like every other caption on this sheet
  // (turn 16's lettering rule), so on a 550-wide board it stacks — the WORDS
  // are what must survive, and none of them is truncated.
  const noteBlock = panelNoteBlock(bur, { profile: P, ascii: true });
  assert.equal(noteBlock.lines.map((l) => l.text).join(' '), 'CUT 63.4 DEG');
  assert.equal(noteBlock.lines.some((l) => l.text.endsWith('~')), false, 'nothing half-said');
  assert.ok(texts.join(' ').includes('CUT'), `the angle is in the file: ${JSON.stringify(texts)}`);
  // BESIDE THE EDGE: the note sits at the top of the part, the label in its
  // middle — two captions in one place is a caption nobody can read.
  const notes = ents.filter((e) => e.type === 'text' && /CUT|63\.4/.test(e.str));
  const h = bur.cnc.drawn_h;
  for (const n of notes) {
    assert.ok(n.y > h / 2, `the note is at the cut edge (y ${n.y} of ${h})`);
    assert.ok(n.y < h, 'and inside the board');
  }
  // …and a part with no cut writes exactly the entities it always wrote.
  const plain = computeCabinet(PARAMS, P).panels.find((p) => p.id === 'BUR');
  const plainTexts = panelEntities(plain, [], { unitNum: '01', profile: P })
    .filter((e) => e.type === 'text').map((e) => e.str);
  assert.equal(plainTexts.some((t) => /CUT|BEVEL|OVERSIZE/.test(t)), false,
    `an uncut board says nothing extra: ${JSON.stringify(plainTexts)}`);
  assert.equal(plainTexts.join(' '), partLabelText('01', plain),
    'the part label, broken onto its own lines, and nothing else');
  assert.equal(panelNoteBlock(plain, { profile: P, ascii: true }).visible, false);
});

test('THE FILE SPELLS THE DEGREE MARK IN ASCII — the R12 rule, already written down', () => {
  // engine/cnc/partLabel.js's own reason for the `x` in `597x568`, and
  // engine/cnc/dxf.js's for the `~` ellipsis: R12 predates any agreement about
  // what a byte above 127 means. The NUMBER and the wording are identical.
  const bur = noted();
  assert.equal(slopeNoteText(bur), 'CUT 63.4°');
  assert.equal(slopeNoteText(bur, { ascii: true }), 'CUT 63.4 DEG');
  const dxf = readFileSync(new URL('../src/engine/cnc/dxf.js', import.meta.url), 'utf8');
  assert.match(dxf, /panelNoteBlock\(panel, \{ profile, ascii: true \}\)/);
  assert.match(dxf, /const ellipsis = ascii \? '~' : '…';/, 'and the ellipsis follows the same rule');
});

test('the sheet draws the EXPORT\'s words — one formatter, not two wordings', () => {
  const view = readFileSync(new URL('../src/components/CncView.jsx', import.meta.url), 'utf8');
  assert.match(view, /import \{ panelLabelBlock, panelNoteBlock \} from '\.\.\/engine\/cnc\/dxf\.js';/);
  assert.match(view, /const slopeNote = panelNoteBlock\(panel, \{ profile, mmPerPx, minPx: annotation\.minLabelPx \}\);/);
  assert.match(view, /data-part-note=\{panel\.id\}/);
  const detail = readFileSync(new URL('../src/components/PartDetailModal.jsx', import.meta.url), 'utf8');
  assert.match(detail, /\{drawing\.note\}/);
});

// ═══ THE ROOF LINE THE SIDES STOP UNDER ══════════════════════════════════════

test('the sides are measured against the ROOF LINE — the cut, capped at H', () => {
  // min(H, at(x)), with a vertex where the line crosses H. That crossing is the
  // pentagon's own knee, and it is SKY:slopeKneeX generalised.
  assert.deepEqual(roofLinePts({ pts: [{ x: 0, y: 2400 }, { x: 600, y: 1200 }] }, 2150),
    [{ x: 0, y: 2150 }, { x: 125, y: 2150 }, { x: 600, y: 1200 }]);
  // A cabinet wholly under its ceiling gets a FLAT line and no bevel anywhere.
  assert.deepEqual(roofLinePts({ pts: [{ x: 0, y: 2400 }, { x: 600, y: 2300 }] }, 2150),
    [{ x: 0, y: 2150 }, { x: 600, y: 2150 }]);
});
