// ─── TURN 40 (CLAUDE.md F2): ONE GRAIN TRUTH ────────────────────────────────
//
// The owner, 18.08.2026, verbatim and decisive:
//
//     "Jeżeli cięte jest w pionie, słój w pionie, to i tak samo powinien być
//      pokazany element na wizualizacji. Jak tniemy, tak słoje się pokazują.
//      Czyli jak tniemy w pionie a układamy w szafie w poziomie, to i słoje w
//      poziomie. Proste. Nie będzie wyjątków, będzie logicznie i składnie i
//      prościej."
//
// THE CUT IS THE ONLY SOURCE. There were two statements about grain and they
// could disagree — `engine/grain.js` per ROLE in the PIECE's frame, and
// `engine/cnc/layout.js sheetTurn` reading `cnc.grain` in the DRAWN frame — so
// a part could be STATED to run one way and CUT another. T35-F6, T36-F5 and
// T37-F7 each touched that seam; T37's own test file pinned the divergence and
// said the answer would have to come from the owner. It has.
//
// ─── THE CROSS-FRAME RULE, WHICH CLAUDE.md MAKES MANDATORY ──────────────────
//
// "For each role above: assert the sheet turn, and assert the 3D grain
// direction DERIVES from it rather than from a separate table. A test that only
// checks one side of the seam is the bug this feature removes."
//
// So every assertion below that names a role names BOTH sides of the seam, and
// the derivation is checked by MEASUREMENT — the millimetres up the sheet
// against the millimetres the figure runs — rather than by comparing two
// letters that could both be wrong.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { sheetLay, sheetTurn } from '../src/engine/cnc/layout.js';
import { decorMapping, grainRun, statedPanelAxis } from '../src/engine/decors.js';
import {
  CUT_GRAIN_AXIS_BY_PART, GRAIN_AXIS_BY_PART, applyGrainAxis, grainLocked, panelAxisOf,
} from '../src/engine/grain.js';

const unit = (type, over = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...over,
}, P);
const partOf = (r, part) => r.panels.find((p) => p.part === part) || null;
const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

/** The drawn frame, or the panel's own where it declares none. */
function drawn(panel) {
  return {
    dw: Number(panel.cnc?.drawn_w) > 0 ? Number(panel.cnc.drawn_w) : panel.w,
    dh: Number(panel.cnc?.drawn_h) > 0 ? Number(panel.cnc.drawn_h) : panel.h,
  };
}

/**
 * The millimetres of board standing UP THE SHEET after the turn — worked out
 * here, independently, so this file does not agree with `sheetLay` by calling
 * it. Every board in this app is nested with the grain running up the drawing,
 * so this number IS the length along the grain.
 */
function upTheSheetMm(panel) {
  const { dw, dh } = drawn(panel);
  return sheetTurn(panel) === 90 ? dw : dh;
}

// ═══ 1. THE OWNER'S SEVEN ROLES, BOTH SIDES OF THE SEAM ═════════════════════

/** The owner's list, 18.08, with a real cabinet that cuts each one. */
function standingSubjects() {
  const budr = unit('BUDR');
  const bud = unit('BUD', { plinth: true, end_panels: [{ side: 'L' }, { side: 'R' }] });
  const wardrobe = unit('WARDROBE', { drawers: 3 });
  return [
    ['BB  drawer box back', partOf(budr, 'DRAWER-BOX-BACK')],
    ['BF  drawer box front', partOf(budr, 'DRAWER-BOX-FRONT')],
    ['SL  drawer side', partOf(budr, 'DRAWER-SIDE')],
    ['SR  drawer side (wardrobe ladder)', partOf(wardrobe, 'DRAWER-SIDE')],
    ['drawer front', partOf(budr, 'DRAWER-FRONT')],
    ['PLINTH', partOf(bud, 'PLINTH')],
    ['END PANEL', partOf(bud, 'END-PANEL')],
  ];
}

test('F2 — THE CUT: every role the owner named is cut STANDING', () => {
  for (const [name, panel] of standingSubjects()) {
    assert.ok(panel, `${name} is in a real cabinet`);
    // "Cut standing" said as a number: the board's OWN HEIGHT is the extent
    // that ends up running up the sheet, whatever frame the kit draws it in.
    assert.equal(upTheSheetMm(panel), panel.h,
      `${name}: ${panel.w} × ${panel.h}, drawn ${drawn(panel).dw} × ${drawn(panel).dh}, `
      + `turn ${sheetTurn(panel)} — its own height has to stand up the sheet`);
  }
});

test('F2 — THE PICTURE: and the 3D grain DERIVES from that, not from a table', () => {
  for (const [name, panel] of standingSubjects()) {
    const run = grainRun(panel);
    // THE CROSS-FRAME ASSERTION. One number of millimetres of board, read
    // through both readers. Neither can be changed alone without this going
    // red, and neither can be made to agree by weakening, because the number is
    // the board's own size.
    assert.equal(run.lengthMm, upTheSheetMm(panel),
      `${name}: the sheet stands ${upTheSheetMm(panel)} mm up the page and the 3D runs `
      + `${run.lengthMm} mm along the figure`);
    assert.equal(run.axis, 'h', `${name}: which is the piece's own height`);
    assert.equal(run.acrossMm, panel.w);
  }
});

test('F2 — ONE ROLE, ONE ANSWER, WHICHEVER KIT CUT IT', () => {
  // The divergence T37-F7 pinned and could not close: a drawer side out of the
  // BUDR ladder is drawn `height × depth` and one out of a wardrobe declares no
  // drawn frame at all. Under two sources that produced two directions.
  const budr = partOf(unit('BUDR'), 'DRAWER-SIDE');
  const wardrobe = partOf(unit('WARDROBE', { drawers: 3 }), 'DRAWER-SIDE');
  assert.notEqual(drawn(budr).dw, drawn(wardrobe).dw, 'two genuinely different frames');
  assert.equal(sheetTurn(budr), 90, 'drawn lying — the sheet stands it up');
  assert.equal(sheetTurn(wardrobe), 0, 'drawn standing already — nothing to turn');
  assert.equal(grainRun(budr).axis, grainRun(wardrobe).axis, 'ONE answer');
  assert.equal(grainRun(budr).axis, 'h');
  assert.equal(grainRun(budr).lengthMm, budr.h);
  assert.equal(grainRun(wardrobe).lengthMm, wardrobe.h);
});

// ═══ 2. THE SEAM ITSELF: ONE SOURCE, AND THE READER DELEGATES ═══════════════

test('F2 — `grainRun` has no rule of its own left: it asks the cut', () => {
  const decors = src('engine/decors.js');
  assert.match(decors, /import \{ sheetLay \} from '\.\/cnc\/layout\.js'/,
    'the 3-D reader imports the single source');
  const fn = decors.slice(decors.indexOf('export function grainRun'));
  const body = fn.slice(0, fn.indexOf('\n}')).split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(body, /sheetLay\(panel\)/, 'it calls it');
  // The three branches that WERE the second source are gone from this function:
  // the stated field, the upright-role override, and the saw's longer-side rule.
  assert.doesNotMatch(body, /statedPanelAxis/, 'no second reading of the statement');
  assert.doesNotMatch(body, /UPRIGHT_ROLES/, 'no per-role visual override');
  assert.doesNotMatch(body, /w >= h/, 'no rule of its own about which side is longer');
});

test('F2 — SANCTITY: nothing the owner asked to keep was deleted', () => {
  // Iron rule 3. `grainRun` and `GRAIN_AXIS_BY_PART` both still exist and still
  // answer; the table became an INPUT to the cut rather than a second answer,
  // and `applyGrainAxis` stamps exactly what it stamped, which is what keeps
  // `computeCabinet()` byte-identical.
  assert.equal(typeof grainRun, 'function');
  assert.equal(typeof statedPanelAxis, 'function', 'the old translator is kept as a witness');
  assert.deepEqual(GRAIN_AXIS_BY_PART, {
    'DRAWER-SIDE': 'h',
    'DRAWER-BOX-FRONT': 'h',
    'DRAWER-BOX-BACK': 'h',
    'DRAWER-BOTTOM': 'w',
    'DRAWER-FRONT': 'h',
    PLINTH: 'h',
  }, 'T36-F5’s stamped table, to the letter');
  // The cut's list is that table plus the owner's seventh role, and it is a
  // SUPERSET rather than an edit — because `applyGrainAxis` runs inside
  // `computeCabinet()` and iron rule 2 forbids moving a byte of it.
  for (const [part, axis] of Object.entries(GRAIN_AXIS_BY_PART)) {
    assert.equal(CUT_GRAIN_AXIS_BY_PART[part], axis, `${part} carried over unchanged`);
  }
  assert.equal(CUT_GRAIN_AXIS_BY_PART['END-PANEL'], 'h', 'the owner’s 18.08 addition');
  assert.equal(grainLocked('END-PANEL'), true);
  assert.equal(grainLocked('BUL'), false);
  // The stamp itself is untouched, which is the byte-identity claim in one line.
  const panels = [{ part: 'END-PANEL', w: 600, h: 870, cnc: {} }];
  applyGrainAxis(panels);
  assert.equal(panels[0].cnc.grain, undefined, 'the engine still says nothing about an end panel');
});

test('F2 — the statement and the cut agree wherever the piece makes one', () => {
  // `statedPanelAxis` is the OLD reading, kept as an independent witness. On
  // every board outside the owner's role list — the shelf, the short back, the
  // shoe box — the cut must reproduce it exactly, because for those boards
  // `sheetTurn` step 2 IS that statement.
  const kits = ['BUD', 'WUD', 'WARDROBE', 'BUDR', 'PANTRY', 'LOW_CABINET'];
  let checked = 0;
  for (const type of kits) {
    for (const p of unit(type, { shelves: 1 }).panels) {
      if (CUT_GRAIN_AXIS_BY_PART[p.part]) continue;   // the owner decides these
      const said = statedPanelAxis(p);
      if (!said) continue;
      checked += 1;
      assert.equal(grainRun(p).axis, said,
        `${type} ${p.id} (${p.part}): states '${p.cnc.grain}' in the drawn frame`);
    }
  }
  assert.ok(checked > 0, 'there really are stated boards outside the list');
});

// ═══ 3. THE FAULTS THE ONE LAW FIXES FOR FREE ══════════════════════════════
//
// Three previous turns each patched one board with a rule of its own. Every one
// of those answers now falls out of the cut, and so do the ones nobody had got
// to yet.

test('F2 — a SIDE stands up however short it is (T37-F5d, now derived)', () => {
  const box = unit('WARDROBE_TOP', { height: 500 });
  for (const id of ['BUL', 'BUR']) {
    const side = box.panels.find((p) => p.id === id);
    if (!side) continue;
    assert.equal(grainRun(side).axis, 'h', `${id}: the figure stands up with the board`);
    assert.equal(grainRun(side).lengthMm, upTheSheetMm(side), 'and it is the cut that says so');
  }
});

test('F2 — a BACK stands up however short it is (T38-F1c, now derived)', () => {
  for (const type of ['WARDROBE', 'BUD', 'WUD', 'LOW_CABINET']) {
    const back = partOf(unit(type), 'BACK');
    if (!back) continue;
    assert.equal(grainRun(back).axis, 'h', `${type} BACK: ${back.w} × ${back.h}`);
    assert.equal(grainRun(back).lengthMm, upTheSheetMm(back));
  }
});

test('F2 — a WIDE SHORT DOOR runs its figure UP the door, which nobody had fixed', () => {
  // The same class of fault as the short side and the short back, on the board
  // a customer actually looks at. The saw's old rule laid a 597 × 497 wall-unit
  // door's figure sideways; the cut lays the board as drawn, so it stands.
  const door = unit('WUD', { height: 500, doors: { count: 1, hinge: 'L' } }).panels
    .find((p) => p.part === 'FRONT' && p.role === 'front');
  assert.ok(door, 'the wall unit has a door');
  assert.ok(door.w > door.h, `wide and short: ${door.w} × ${door.h}`);
  assert.equal(grainRun(door).axis, 'h', 'a door runs its figure UP the door');
  assert.equal(grainRun(door).lengthMm, upTheSheetMm(door));
});

test('F2 — a NARROW cabinet’s TOP still runs left-to-right (turn 13’s complaint)', () => {
  // "słoje na wieńcach biegną front-tył zamiast lewo-prawo". A TOP is DRAWN
  // turned for exactly this reason, and the saw's old rule undid that on a
  // cabinet narrower than it is deep. The cut reads the drawing, so it cannot.
  const narrow = unit('BUD', { width: 300 });
  for (const id of ['TOP', 'BOTTOM']) {
    const p = narrow.panels.find((x) => x.id === id);
    assert.ok(p.h > p.w, `${id} is deeper than it is wide: ${p.w} × ${p.h}`);
    assert.equal(grainRun(p).axis, 'w', `${id}: left-to-right, as turn 13 asked`);
    assert.equal(grainRun(p).lengthMm, upTheSheetMm(p));
    // …and it lands that way on the board's big face in the scene.
    assert.equal(decorMapping(p.box, grainRun(p).lengthMm).grainAxis, 'u');
  }
});

// ═══ 4. THE MOUNTING FRAME CARRIES IT, WITH NOTHING TO SAY SO ═══════════════

test('F2 — "cut standing, mounted lying" shows its grain lying', () => {
  // The owner's own worked example: *"jak tniemy w pionie a układamy w szafie w
  // poziomie, to i słoje w poziomie."* There is no code for this sentence and
  // there must not be: `decorMapping` lays the grain LENGTH on whichever face
  // of the MOUNTING box is biggest, so the orientation in the cabinet carries
  // the cut answer the rest of the way on its own.
  const budr = unit('BUDR');
  const side = partOf(budr, 'DRAWER-SIDE');
  // Cut standing — its 237 mm height up the sheet.
  assert.equal(upTheSheetMm(side), side.h);
  // Mounted UPRIGHT in the cabinet (a drawer side is a vertical board), so the
  // figure stands: the big face is h × d and the grain is its V.
  const map = decorMapping(side.box, grainRun(side).lengthMm);
  assert.equal(map.grainAxis, 'v');
  assert.equal(map.heightMm, side.box.h);

  // The same board, mounted LYING — the drawer BOTTOM, which is the one role
  // the owner cuts flat ("dno — słoje w poprzek"). Its cut answer is its width
  // and the mounting frame lays that across the floor of the box.
  const bottom = partOf(budr, 'DRAWER-BOTTOM');
  assert.equal(sheetTurn(bottom), 90, 'the flat one is the half that turns');
  assert.equal(upTheSheetMm(bottom), bottom.w);
  assert.equal(grainRun(bottom).axis, 'w');
  assert.equal(decorMapping(bottom.box, grainRun(bottom).lengthMm).grainAxis, 'u');
});

// ═══ 5. THE ONE TRANSLATION, AND ITS EDGES ═════════════════════════════════

test('F2 — `panelAxisOf` is the single translation, and it is total', () => {
  assert.equal(panelAxisOf(600, 2150, 2150), 'h');
  assert.equal(panelAxisOf(600, 2150, 600), 'w');
  // A square board: neither dimension is nearer, so the saw's own rule answers
  // — the one place in the app it still lives.
  assert.equal(panelAxisOf(600, 600, 600), 'w');
  // A drawn outline that is neither of the two: the nearer one wins rather than
  // a throw.
  assert.equal(panelAxisOf(600, 2150, 2000), 'h');
  // Degenerate input cannot produce NaN or undefined.
  assert.equal(panelAxisOf(0, 0, 0), 'h');
  assert.equal(panelAxisOf(null, undefined, null), 'h');
});

test('F2 — a SQUARE board is translated by its FRAME, not by its size', () => {
  // The 600 × 600 LOW_CABINET back: a size match alone cannot tell the two 600s
  // apart, so `sheetLay` reads the frame RELATIONSHIP first. Without that the
  // back would fall to the saw's tie-break and lie down again — which is
  // exactly the fault T38-F1c fixed.
  const back = partOf(unit('LOW_CABINET'), 'BACK');
  if (back && back.w === back.h) {
    assert.equal(back.cnc.grain, 'h', 'T38-F1c states it');
    assert.equal(sheetLay(back).axis, 'h', 'and the cut keeps it standing');
  }
  // Said directly, so the assertion holds whatever a kit's numbers become:
  assert.equal(sheetLay({ part: 'BACK', w: 600, h: 600, cnc: { grain: 'h', drawn_w: 600, drawn_h: 600 } }).axis, 'h');
});

test('F2 — a board with no CNC record at all is still answered', () => {
  const lay = sheetLay({ w: 1200, h: 400 });
  assert.equal(lay.turn, 0, 'nothing said — laid as drawn');
  assert.equal(lay.upMm, 400);
  assert.equal(lay.acrossMm, 1200);
  assert.equal(lay.axis, 'h');
  assert.deepEqual(grainRun({ w: 1200, h: 400 }), { axis: 'h', lengthMm: 400, acrossMm: 1200 });
  // …and a null does not throw.
  assert.equal(sheetLay(null).turn, 0);
  assert.equal(sheetLay(undefined).axis, 'h');
});

// ═══ 6. THE BOUNDARY: THE ENGINE DID NOT MOVE ══════════════════════════════

test('F2 — `computeCabinet()` writes exactly the grain statements it wrote', () => {
  // CLAUDE.md: "computeCabinet() output does NOT change. The statements it
  // writes stay byte-identical; what changes is who reads them and whether the
  // sheet honours them."
  const budr = unit('BUDR');
  const bud = unit('BUD', { shelves: 1, plinth: true, end_panels: [{ side: 'L' }] });
  assert.equal(partOf(bud, 'SHELF').cnc.grain, 'h', 'turn 26 F8');
  assert.equal(partOf(bud, 'PLINTH').cnc.grain, 'h', 'turn 36 F5');
  assert.equal(partOf(bud, 'END-PANEL').cnc.grain, undefined, 'and the end panel still says nothing');
  assert.equal(partOf(budr, 'DRAWER-SIDE').cnc.grain, 'h');
  assert.equal(partOf(budr, 'DRAWER-BOTTOM').cnc.grain, 'w');
  for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM']) {
    assert.equal(partOf(bud, id).cnc.grain, undefined, `${id} says nothing, as ever`);
  }
  // The drawn frames are untouched too — the CNC layout turns the PLACEMENT and
  // never the part's own frame, which is what keeps every per-part DXF
  // byte-identical (verify/t40/f2-cnc-fingerprints.txt).
  const side = partOf(budr, 'DRAWER-SIDE');
  assert.deepEqual(
    { dw: side.cnc.drawn_w, dh: side.cnc.drawn_h, rot: side.cnc.rotated, w: side.w, h: side.h },
    { dw: 237, dh: 490, rot: true, w: 490, h: 237 },
  );
});
