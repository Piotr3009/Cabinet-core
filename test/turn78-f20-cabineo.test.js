// ─── T78 F20 (the CABINEO part) · THE FOURTH JOINT SYSTEM: LAMELLO CABINEO 8 / 12 ─
//
// CLAUDE.md T78 PART E, the owner (11.10.2026): Cabineo 8 AND 12, chosen in
// the company's default settings; THE INVERTED SIDE: *"Cabineo drills NO panel
// edge. The connector sits in a POCKET milled into the FACE of the horizontal
// board (top, bottom, fixed shelf) at its end ... And the pocket is cut from
// the OUTSIDE face of the carcass board ("ciecie nie od srodka korpusu tylko
// do zewnatrz") ... the export must say so"*; the DXF reflected through the
// SAME reflection T76 built (`frontX = partWidth - backX`), the part label
// OUTSIDE FACE UP; the skin check between the two faces; the `confirmed:
// false` gate on the CNC export.
//
// LISP FIRST: reference/lisp/SKYLON_JOINTS_CABINEO.lsp (paren-balanced,
// test/turn35-lisp-parens.test.js walks it) is the law; src/engine/cabineo.js
// mirrors it routine for routine under the same names and reads every Lamello
// number off reference/hardware/cabineo/cabineo.json (owner to confirm). These
// assertions are the LISP's own NUMBERS block (section H: a BUD 600 x 770 x
// 558, G 18, Cabineo 12, flushCap, cutter12, and its one-FIX-shelf case) read
// off the module board by board, the reflection, the skin check, the gate, and,
// once `computeCabinet` carries the F20 hooks (scratchpad patches
// f20-cabinet-cabineo.patch, f20-cnc-outside-face.patch,
// f20-profile-cabineo.patch), the integrated cut, its DXF and its goldens. The
// integrated group SKIPS, saying so, while the hooks are not in.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import * as C from '../src/engine/cabineo.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { mirrorAboutVerticalAxis } from '../src/engine/cnc/frontOperations.js';
import { partLabelText } from '../src/engine/cnc/partLabel.js';
import { CNC_LAYERS, cncLayer } from '../src/engine/cnc/layers.js';
import { machiningFor } from '../src/engine/machining.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { JOINT_SYSTEMS, jointSystemOf } from '../src/engine/dowels.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const SHEET = JSON.parse(read('reference/hardware/cabineo/cabineo.json'));
const LSP = read('reference/lisp/SKYLON_JOINTS_CABINEO.lsp');

const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01' };
const CAB12 = { ...BUD, joints_system: 'cabineo12' };
const CAB8 = { ...BUD, joints_system: 'cabineo8' };
const FIX = { sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 385 }] }] };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const box = (k) => [k.x1, k.y1, k.x2, k.y2];
const has = (pts, q) => pts.some(([x, y]) => near(x, q[0]) && near(y, q[1]));

// ═══ A. THE NUMBERS: the module restates the sheet and the LISP's profile ═══

test('F20 · cabineoProfile() is the LISP\'s cabineo-profile key for key; the variant is the system id\'s', () => {
  const prof = C.cabineoProfile({});
  assert.deepEqual({ ...prof, layers: undefined, minSkinMm: undefined }, {
    variant: '12', mounting: 'flushCap', machining: 'cutter12', pitchMm: 250, endOffsetMm: 50, minPerJoint: 2,
    maxSpacingMm: 300, minFromEdgeMm: 20, caps: 'all', confirmed: false, layers: undefined, minSkinMm: undefined,
  });
  assert.equal(prof.minSkinMm, 3, 'T76\'s one skin number');
  assert.deepEqual(prof.layers, {
    pocket: { drill15: 'CABINEO_POCKET_15MM', cutter10: 'CABINEO_POCKET_10MM', cutter12: 'CABINEO_POCKET_12MM' },
    recess: 'CABINEO_RECESS', hole: 'CABINEO_HOLE_5MM',
  });
  assert.equal(C.cabineoProfile({}, 'cabineo8').variant, '8');
  assert.equal(C.cabineoProfile({}, 'cabineo12').variant, '12');
  assert.equal(C.cabineoProfile({ joints: { system: 'cabineo8' } }).variant, '8', 'the company default names the variant');
  assert.equal(C.cabineoVariantOf('cabineo'), null, 'the bare id of T75 names no variant');
  // The sheet's two limits are the SHEET's, read off the JSON, never the profile.
  assert.equal(prof.maxSpacingMm, SHEET.spacing.maxMm);
  assert.equal(prof.minFromEdgeMm, SHEET.spacing.edgeMinMm);
  assert.equal(SHEET.spacing.pageOf, 1);
  // The LISP's A.1 block says the same.
  const lispProf = LSP.slice(LSP.indexOf('(defun cabineo-profile'), LSP.indexOf('(defun cabineo-get'));
  assert.match(lispProf, /\(cons "mounting" "flushCap"\)/);
  assert.match(lispProf, /\(cons "machining" "cutter12"\)/);
  assert.match(lispProf, /\(cons "pitchMm" 250\.0\)/);
  assert.match(lispProf, /\(cons "endOffsetMm" 50\.0\)/);
  assert.match(lispProf, /\(cons "minPerJoint" 2\)/);
  assert.match(lispProf, /\(cons "maxSpacingMm" 300\.0\)/);
  assert.match(lispProf, /\(cons "minFromEdgeMm" 20\.0\)/);
});

test('F20 · cabineoSheet() restates cabineo.json in the LISP\'s flat shape, number for number, null where the sheet is silent', () => {
  const s = C.cabineoSheet();
  // Mountings: the four bands of page 2.
  for (const id of ['surface', 'flush', 'flushCap', 'hpl']) {
    const m = SHEET.mountings[id];
    assert.equal(s.mountings[id].pocketDepthMm, m.pocketDepthMm, `${id} pocket depth`);
    assert.equal(s.mountings[id].axisFromSurfaceMm, m.derived.axisFromSurfaceMm, `${id} axis from the surface (derived)`);
    assert.equal(s.mountings[id].recessDepthMm, m.collarRecessDepthMm ?? m.capRecessDepthMm ?? null, `${id} recess depth`);
    assert.equal(s.mountings[id].recessWidthMm, m.recessOutline?.widthMm ?? null, `${id} recess width`);
    assert.equal(s.mountings[id].recessLengthMm, m.recessOutline?.lengthMm ?? null, `${id} recess length`);
    assert.equal(s.mountings[id].pageOf, 2);
  }
  assert.deepEqual([s.mountings.surface.pocketDepthMm, s.mountings.flush.pocketDepthMm, s.mountings.flushCap.pocketDepthMm, s.mountings.hpl.pocketDepthMm], [11, 11.5, 13, 11]);
  assert.deepEqual([s.mountings.surface.axisFromSurfaceMm, s.mountings.flush.axisFromSurfaceMm, s.mountings.flushCap.axisFromSurfaceMm], [5, 5.8, 7.1]);
  assert.deepEqual([s.mountings.flushCap.recessWidthMm, s.mountings.flushCap.recessEndRadiusMm, s.mountings.flushCap.recessEndCentreFromEndMm, s.mountings.flushCap.recessLengthMm, s.mountings.flushCap.recessDepthMm], [18.8, 9.4, 26.25, 35.65, 2.1]);
  assert.equal(s.mountings.flush.recessLengthMm, null, 'the flush collar recess\'s length is NOT on the sheet');
  // Machining: Option 3 (cutter 12) standard and hpl, Option 2, Option 1.
  const c12 = s.machining.cutter12.standard;
  assert.deepEqual(c12.lobeCentresFromEndMm, [3.6, 14.8, 26]);
  assert.deepEqual([c12.lobeDiaMm, c12.channelHeightMm, c12.halfHeightAtChannelMm, c12.halfHeightAtEndMm], [15, 12, 6, 6.6]);
  assert.deepEqual(c12.reliefs, [[8.1, 2.2], [19.3, 2.2]]);
  assert.deepEqual(s.machining.cutter12.hpl.lobeCentresFromEndMm, [3.5, 14.7, 25.9]);
  assert.deepEqual(s.machining.cutter12.hpl.reliefs, [[8.2, 1.8], [19.3, 1.8]]);
  assert.deepEqual([s.machining.cutter10.standard.waistsFromEndMm, s.machining.cutter10.standard.halfHeightAtWaistMm], [[9.2, 20.4], 5]);
  assert.deepEqual([s.machining.drill15.standard.holes, s.machining.drill15.standard.lobeDiaMm, s.machining.drill15.standard.firstCentreFromEndMm, s.machining.drill15.standard.pitchMm], [3, 15, 3.6, 11.2]);
  assert.deepEqual(s.machining.drill15.standard.lobeCentresFromEndMm, SHEET.machining.drill15.standard.derived.centresFromEndMm);
  // Variants: X, the minimum panels, the article (not on the sheet).
  assert.deepEqual([s.variants['8'].screwReachXMm, s.variants['12'].screwReachXMm, s.variants['8M6'].screwReachXMm], [8, 12, 8]);
  assert.deepEqual([s.variants['8'].minCounterpartMm, s.variants['12'].minCounterpartMm, s.variants['8M6'].minCounterpartMm], [9, 13, 14]);
  assert.deepEqual([s.variants['8'].minConnectorBoardMm, s.variants['12'].minConnectorBoardMm], [12, 12]);
  assert.deepEqual([s.variants['8'].minCentreWallMm, s.variants['12'].minCentreWallMm], [16, 24]);
  for (const v of ['8', '12', '8M6']) assert.equal(s.variants[v].article, null, `no article on the sheet for ${v} (CLAUDE.md's 186310 is not printed)`);
  // The counterpart hole: dia 5, depth NOT ON THE SHEET.
  assert.equal(s.counterpartHole.diaMm, 5);
  assert.equal(s.counterpartHole.depthMm, null);
  assert.equal(s.cap.article, null);
  // CONSISTENCY, a check and not a number: the printed numbers agree to the sheet's rounding.
  assert.ok(near(Math.sqrt(7.5 ** 2 - 5.6 ** 2), 5, 0.02), 'waist half-height: 4.99, printed 5');
  assert.ok(near(Math.sqrt(7.5 ** 2 - 3.6 ** 2), 6.6, 0.03), 'half-height at the end');
  assert.ok(near(Math.sqrt(7.5 ** 2 - 6 ** 2), 4.5), 'the channel meets each lobe 4.5 from its centre: 8.1 / 10.3 / 19.3 / 21.5');
});

// ═══ B. THE SET-OUT RULE ═══════════════════════════════════════════════════

test('F20 · cabineoPositions: the owner\'s dowel rule bounded by the sheet, the LISP\'s stations', () => {
  const E = 50; const PITCH = 250; const NMIN = 2; const WIDE = 18.8;
  assert.deepEqual(C.cabineoPositions(540, E, PITCH, NMIN, WIDE), [50, 270, 490], 'the BUD\'s 540: S 440, n 3, g 220');
  assert.deepEqual(C.cabineoPositions(520, E, PITCH, NMIN, WIDE), [50, 260, 470], 'the one-shelf case: S 420, n 3, g 210');
  assert.deepEqual(C.cabineoPositions(282, E, PITCH, NMIN, WIDE), [50, 232], 'a 300 deep wall unit: S 182 < 250, two');
  assert.deepEqual(C.cabineoPositions(118, E, PITCH, NMIN, WIDE), [59], 'under 2e + wide: one pocket on the centre');
  assert.deepEqual(C.cabineoPositions(0, E, PITCH, NMIN, WIDE), []);
  const long = C.cabineoPositions(2000, E, PITCH, NMIN, WIDE);
  assert.equal(long.length, 9);
  for (let i = 1; i < long.length; i += 1) assert.ok(long[i] - long[i - 1] <= PITCH + 1e-9 && long[i] - long[i - 1] <= 300, 'no gap over the pitch, so none over the sheet\'s 300');
  assert.equal(long[long.length - 1], 1950);
  assert.equal(C.cabineoTooClose([50, 60], WIDE), true);
  assert.equal(C.cabineoTooClose([50, 270, 490], WIDE), false);
  assert.equal(C.cabineoCeil(1.76), 2);
  assert.equal(C.cabineoCeil(2 + 1e-12), 2, 'the 1e-9 slack');
});

test('F20 · cabineoRefusal: the sheet\'s limits and the variant\'s minimums, in words with the page', () => {
  const sheet = C.cabineoSheet();
  const prof = C.cabineoProfile({}, 'cabineo12');
  assert.deepEqual(C.cabineoRefusal(prof, sheet, 18, 18), []);
  assert.match(C.cabineoRefusal({ ...prof, pitchMm: 301 }, sheet, 18, 18)[0], /over the sheet's max\. 300\.00 between connectors \(page 1, Assembly panel 1\)/);
  assert.match(C.cabineoRefusal({ ...prof, endOffsetMm: 19 }, sheet, 18, 18)[0], /under the sheet's min\. 20\.00 from the board's edge \(page 1, Assembly panel 1\)/);
  assert.match(C.cabineoRefusal({ ...prof, minPerJoint: 1 }, sheet, 18, 18)[0], /never fewer than two/);
  assert.match(C.cabineoRefusal(prof, sheet, 12, 18).join('; '), /Cabineo 12 needs the panel that takes the screw at least 13\.00 thick \(page 1, Applications\); the side is 12\.00/);
  assert.match(C.cabineoRefusal(prof, sheet, 12, 18).join('; '), /the screw reaches X = 12\.00 into a side only 12\.00 thick/);
  assert.match(C.cabineoRefusal(C.cabineoProfile({}, 'cabineo8'), sheet, 8, 18).join('; '), /at least 9\.00 thick \(page 1, Applications\); the side is 8\.00.*X = 8\.00 into a side only 8\.00/);
  assert.deepEqual(C.cabineoRefusal(C.cabineoProfile({}, 'cabineo8'), sheet, 9, 18), [], 'Cabineo 8 on a 9 side: the sheet\'s minimum, and X 8 < 9');
  assert.match(C.cabineoRefusal(prof, sheet, 18, 13)[0], /a pocket 13\.00 deep would break through a 13\.00 board/);
  assert.match(C.cabineoRefusal(prof, sheet, 18, 15)[0], /leaves less than 3\.00 under it in a 15\.00 board/);
  assert.match(C.cabineoRefusal({ ...prof, variant: '8M6' }, sheet, 18, 18).join('; '), /not a company default: the owner chose 8 and 12/);
  assert.match(C.cabineoRefusal({ ...prof, mounting: 'hpl' }, sheet, 18, 18).join('; '), /captions the mounting 'hpl' for other variants than Cabineo 12/);
});

// ═══ C and D. THE INVERTED SIDE, THE ONE REFLECTION, THE NUMBERS BLOCK ═══════

test('F20 · the LISP\'s NUMBERS block (section H): a BUD 600 x 770 x 558, Cabineo 12, flushCap, cutter12, board by board', () => {
  const plan = C.cabineoPlan({ W: 600, H: 770, D: 558, G: 18 }, {});
  assert.deepEqual(plan.refused, []);
  assert.equal(plan.gate, C.CABINEO_GATE);
  assert.deepEqual(plan.counts, { pockets: 12, holes: 12, shelfPockets: 0 });
  // The joint table: four joints, L 540 = D - G, from the FRONT, offsets 50 270 490.
  assert.deepEqual(plan.joints.map((j) => [j.joint.name, j.joint.len, j.joint.ref, j.offs, j.joint.board, j.joint.side, j.joint.boardW]), [
    ['BUL-TOP', 540, 'FRONT', [50, 270, 490], 'TOP', 'BUL', 540],
    ['BUR-TOP', 540, 'FRONT', [50, 270, 490], 'TOP', 'BUR', 540],
    ['BUL-BOTTOM', 540, 'FRONT', [50, 270, 490], 'BOTTOM', 'BUL', 540],
    ['BUR-BOTTOM', 540, 'FRONT', [50, 270, 490], 'BOTTOM', 'BUR', 540],
  ]);
  // Which face: TOP, BOTTOM outside (OUTSIDE FACE UP); the sides inside.
  assert.equal(plan.boards.TOP.machinedFace, 'outside');
  assert.equal(plan.boards.TOP.label, 'OUTSIDE FACE UP');
  assert.equal(plan.boards.BOTTOM.label, 'OUTSIDE FACE UP');
  assert.equal(plan.boards.BUL.machinedFace, 'inside');
  assert.equal(plan.boards.BUL.label, '');
  assert.equal(C.cabineoMachinedFace('SHELF-1'), 'outside');
  assert.equal(plan.boards.TOP.W, 540, 'W of the reflection is the DRAWN width (D - G), not the cabinet\'s 600');
  // TOP, own (inside) frame, x from the BACK: axes x = 540 - offset = 490 270 50, the BUL end at y = 0.
  const top = plan.boards.TOP;
  assert.equal(top.pockets.length, 6);
  assert.equal(top.recesses.length, 6);
  const bulEnd = top.pockets.filter((k) => k.meta.end === 'Y0');
  assert.deepEqual(bulEnd.map((k) => k.meta.axis), [[490, 0], [270, 0], [50, 0]]);
  const p490 = bulEnd[0];
  assert.deepEqual(box(p490), [482.5, 0, 497.5, 33.5], 'pocket box x - 7.5 .. x + 7.5, y 0 .. 33.5 (far end 26 + 7.5 DERIVED)');
  assert.equal(p490.depth, 13, '13 deep from the OUTSIDE face');
  assert.equal(p490.layer, 'CABINEO_POCKET_12MM');
  assert.equal(p490.kind, 'cabineo_pocket');
  assert.equal(p490.face, 'outside');
  assert.deepEqual(p490.meta.lobes, [[490, 3.6], [490, 14.8], [490, 26]], 'lobe centres dia 15 at 3.6 / 14.8 / 26 from the end');
  // The outline's key points (D.5), in the board's frame: (x -/+ 6.6, 0) ... (x, 33.5).
  for (const q of [[496.6, 0], [497.5, 3.6], [496, 8.1], [496, 10.3], [497.5, 14.8], [496, 19.3], [496, 21.5], [497.5, 26], [490, 33.5],
    [482.5, 26], [484, 21.5], [484, 19.3], [482.5, 14.8], [484, 10.3], [484, 8.1], [482.5, 3.6], [483.4, 0]]) {
    assert.ok(has(p490.pts, q), `key point ${q} is on the outline`);
  }
  // The straights: y 8.1 to 10.3 and 19.3 to 21.5 at x -/+ 6 (the 2.2 reliefs).
  assert.ok(p490.pts.filter(([x, y]) => near(x, 496) && y >= 8.1 - 1e-6 && y <= 10.3 + 1e-6).length >= 2);
  // Every interior point of lobe 2 is on its circle (dia 15 about (490, 14.8)).
  for (const [x, y] of p490.pts.filter(([, y]) => y > 10.3 + 1e-6 && y < 19.3 - 1e-6)) assert.ok(near(Math.hypot(x - 490, y - 14.8), 7.5, 1e-3));
  assert.deepEqual([box(bulEnd[1]), box(bulEnd[2])], [[262.5, 0, 277.5, 33.5], [42.5, 0, 57.5, 33.5]]);
  // The cap recess: x -/+ 9.4, y 0 .. 35.65, 2.1 deep, semicircle r 9.4 centred (x, 26.25).
  const r490 = top.recesses.find((k) => k.meta.end === 'Y0' && near(k.meta.export.box[0], 40.6));
  assert.deepEqual(box(r490), [480.6, 0, 499.4, 35.65]);
  assert.equal(r490.depth, 2.1);
  assert.equal(r490.layer, 'CABINEO_RECESS');
  assert.deepEqual([r490.meta.widthMm, r490.meta.lengthMm, r490.meta.endRadiusMm, r490.meta.endCentreFromEndMm], [18.8, 35.65, 9.4, 26.25]);
  assert.ok(has(r490.pts, [490, 35.65]) && has(r490.pts, [499.4, 26.25]) && has(r490.pts, [480.6, 0]));
  assert.deepEqual([box(top.recesses[1]), box(top.recesses[2])], [[260.6, 0, 279.4, 35.65], [40.6, 0, 59.4, 35.65]]);
  // BUR end (y = 564): every y becomes 564 - y.
  const burEnd = top.pockets.filter((k) => k.meta.end === 'YH');
  assert.deepEqual(burEnd[0].meta.lobes, [[490, 560.4], [490, 549.2], [490, 538]]);
  assert.deepEqual(box(burEnd[0]), [482.5, 530.5, 497.5, 564]);
  assert.ok(burEnd[0].pts.filter(([x, y]) => near(x, 496) && y >= 553.7 - 1e-6 && y <= 555.9 + 1e-6).length >= 2, 'straights y 555.9 to 553.7');
  const rBur = top.recesses.find((k) => k.meta.end === 'YH' && near(k.x1, 480.6));
  assert.deepEqual(box(rBur), [480.6, 528.35, 499.4, 564]);
  assert.ok(has(rBur.pts, [490, 528.35]), 'semicircle centred (x, 537.75): its far point at 564 - 35.65');
  // BOTTOM: identical to the TOP, number for number.
  assert.deepEqual(plan.boards.BOTTOM.pockets.map(box), top.pockets.map(box));
  assert.deepEqual(plan.boards.BOTTOM.recesses.map(box), top.recesses.map(box));
  // The sides' dia 5 holes: BUL (x from the FRONT) y 762.9 and 7.1 at x 50 270 490; BUR (x from the BACK) at x 490 270 50.
  assert.deepEqual(plan.boards.BUL.holes.map((h) => [h.x, h.y, h.d, h.depth ?? null]), [
    [50, 762.9, 5, null], [270, 762.9, 5, null], [490, 762.9, 5, null], [50, 7.1, 5, null], [270, 7.1, 5, null], [490, 7.1, 5, null],
  ]);
  assert.deepEqual(plan.boards.BUR.holes.map((h) => [h.x, h.y]), [[490, 762.9], [270, 762.9], [50, 762.9], [490, 7.1], [270, 7.1], [50, 7.1]]);
  assert.equal(plan.boards.BUL.holes[0].layer, 'CABINEO_HOLE_5MM');
  assert.equal(plan.boards.BUL.holes[0].kind, 'cabineo_hole');
  assert.match(plan.boards.BUL.holes[0].meta.depthNote, /not on the sheet/);
  assert.equal(C.cabineoAxisFromOutside(plan.prof, plan.sheet), 7.1, 'the hole 1.9 nearer the outside than the dowel\'s centre-line 9');
  // BOM: 12 x Cabineo 12 (article not on the sheet), 12 x cover cap under caps all.
  assert.deepEqual(plan.bom.map((b) => [b.label, b.article, b.qty]), [['Cabineo 12', null, 12], ['Cabineo cover cap', null, 12]]);
  assert.deepEqual(C.cabineoBomLines({ ...plan.prof, caps: 'shelves' }, plan.sheet, 12, 0).map((b) => b.qty), [12, 0]);
  // The layers: the LISP's D.9.
  assert.deepEqual([C.cabineoPocketLayer(plan.prof), C.cabineoRecessLayer(plan.prof), C.cabineoHoleLayer(plan.prof)], ['CABINEO_POCKET_12MM', 'CABINEO_RECESS', 'CABINEO_HOLE_5MM']);
  assert.equal(C.cabineoPocketLayer({ ...plan.prof, machining: 'drill15' }), 'CABINEO_POCKET_15MM');
  assert.equal(C.cabineoPocketLayer({ ...plan.prof, machining: 'cutter10' }), 'CABINEO_POCKET_10MM');
});

test('F20 · THE REFLECTION: x\' = W - x, y\' = y, through T76\'s one helper; a pocket 3.6 from the end lands 3.6 from the end', () => {
  const plan = C.cabineoPlan({ W: 600, H: 770, D: 558, G: 18 }, {});
  const top = plan.boards.TOP;
  const p490 = top.pockets.find((k) => k.meta.end === 'Y0' && near(k.meta.axis[0], 490));
  // EXPORT (OUTSIDE FACE UP): the pocket that stood at x 490 (50 from the FRONT) lands at x' 50.
  assert.deepEqual(p490.meta.export.axis, [50, 0]);
  assert.deepEqual(p490.meta.export.box, [42.5, 0, 57.5, 33.5]);
  assert.deepEqual(p490.meta.export.lobes, [[50, 3.6], [50, 14.8], [50, 26]], 'y UNCHANGED: 3.6 / 14.8 / 26 from the end');
  const bur490 = top.pockets.find((k) => k.meta.end === 'YH' && near(k.meta.axis[0], 490));
  assert.deepEqual(bur490.meta.export.lobes, [[50, 560.4], [50, 549.2], [50, 538]], 'the BUR end\'s 3.6 from y = 564 stays 3.6 from y = 564');
  assert.deepEqual(top.pockets.filter((k) => k.meta.end === 'Y0').map((k) => k.meta.export.box), [[42.5, 0, 57.5, 33.5], [262.5, 0, 277.5, 33.5], [482.5, 0, 497.5, 33.5]]);
  assert.deepEqual(top.recesses.filter((k) => k.meta.end === 'Y0').map((k) => k.meta.export.box), [[40.6, 0, 59.4, 35.65], [260.6, 0, 279.4, 35.65], [480.6, 0, 499.4, 35.65]]);
  // The SAME helper, never a second formula: cabineoReflectX IS mirrorAboutVerticalAxis.
  for (const [x, W] of [[490, 540], [50, 540], [0, 540], [270, 540], [470, 520], [-18, 540]]) {
    assert.equal(C.cabineoReflectX(x, W), mirrorAboutVerticalAxis(W)([x, 0])[0]);
    assert.deepEqual(C.cabineoReflectPt([x, 12.3], W), mirrorAboutVerticalAxis(W)([x, 12.3]));
  }
  assert.deepEqual(mirrorAboutVerticalAxis(540)([490, 3.6]), [50, 3.6]);
  const src = read('src/engine/cnc/frontOperations.js');
  assert.match(src, /export function mirrorAboutVerticalAxis\(width\)/);
  assert.match(src, /const mirror = mirrorAboutVerticalAxis\(width\);/, 'the FRONT files go through the exported helper');
  assert.doesNotMatch(src, /\[width - x, y\]\);\n/, 'no second copy of the formula beside the helper');
  const mod = read('src/engine/cabineo.js');
  assert.match(mod, /import \{ mirrorAboutVerticalAxis \} from '\.\/cnc\/frontOperations\.js';/);
  assert.match(mod, /export function cabineoReflectX\(x, W\) \{\n  return mirrorAboutVerticalAxis\(W\)/, 'cabineoReflectX IS the helper');
  assert.match(mod, /export function cabineoReflectPt\(pt, W\) \{\n  return mirrorAboutVerticalAxis\(W\)/, 'cabineoReflectPt IS the helper');
  const code = mod.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /\bW\s*-\s*(x|Number\(x\)|pt\[0\])/, 'cabineo.js writes no formula of its own');
  // The winding: CCW in the own (back-view) frame, CW in the reflected file, as T76's FRONT contours.
  const area = (pts) => pts.reduce((a, [x1, y1], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return a + x1 * y2 - x2 * y1; }, 0) / 2;
  assert.ok(area(p490.pts) > 0);
  assert.ok(area(p490.meta.export.pts) < 0);
  assert.equal(C.cabineoFaceLabel('TOP'), 'OUTSIDE FACE UP');
  assert.equal(C.cabineoFaceLabel('BUL'), '');
  assert.match(LSP, /"OUTSIDE FACE UP"/);
});

test('F20 · with one FIX shelf (underside 385, 18 thick, 20 behind the front): the LISP\'s shelf rows', () => {
  const plan = C.cabineoPlan({ W: 600, H: 770, D: 558, G: 18, fixedShelfYs: [385] }, {});
  assert.deepEqual(plan.refused, []);
  assert.deepEqual(plan.joints.slice(4).map((j) => [j.joint.name, j.joint.len, j.offs, j.joint.board, j.joint.boardW]), [
    ['BUL-SHELF-1', 520, [50, 260, 470], 'SHELF-1', 520],
    ['BUR-SHELF-1', 520, [50, 260, 470], 'SHELF-1', 520],
  ]);
  const sh = plan.boards['SHELF-1'];
  assert.equal(sh.machinedFace, 'outside');
  assert.equal(sh.W, 520, 'W of the reflection = 520 (D - G - setback)');
  // SHELF-1 own frame, x from the FRONT: axes 50 260 470; EXPORT x' = 520 - x = 470 260 50.
  const y0 = sh.pockets.filter((k) => k.meta.end === 'Y0');
  assert.deepEqual(y0.map((k) => k.meta.axis[0]), [50, 260, 470]);
  assert.deepEqual(y0.map((k) => k.meta.export.axis[0]), [470, 260, 50]);
  assert.deepEqual(y0[0].meta.lobes, [[50, 3.6], [50, 14.8], [50, 26]]);
  assert.deepEqual(box(y0[2]), [462.5, 0, 477.5, 33.5]);
  assert.deepEqual(box(sh.recesses.find((k) => k.meta.end === 'Y0' && near(k.x1, 460.6))), [460.6, 0, 479.4, 35.65], 'the last recess stands 40.6 clear of the shelf\'s back edge at 520');
  // The sides: y 392.1 = 385 + 7.1; BUL x 70 280 490 (the shelf's front is 20 behind the carcass front), BUR x 470 260 50.
  assert.deepEqual(plan.boards.BUL.holes.filter((h) => /SHELF/.test(h.meta.joint)).map((h) => [h.x, h.y]), [[70, 392.1], [280, 392.1], [490, 392.1]]);
  assert.deepEqual(plan.boards.BUR.holes.filter((h) => /SHELF/.test(h.meta.joint)).map((h) => [h.x, h.y]), [[470, 392.1], [260, 392.1], [50, 392.1]]);
  assert.deepEqual(plan.counts, { pockets: 18, holes: 18, shelfPockets: 6 });
  assert.deepEqual(plan.bom.map((b) => b.qty), [18, 18]);
  const shelvesOnly = C.cabineoPlan({ W: 600, H: 770, D: 558, G: 18, fixedShelfYs: [385] }, { joints: { cabineo: { caps: 'shelves' } } });
  assert.deepEqual(shelvesOnly.bom.map((b) => b.qty), [18, 6], 'caps on the fixed shelves\' pockets only');
});

test('F20 · the other options: drill15 is three dia 15 holes per pocket from the outside face; cutter10 under flush draws no recess outline', () => {
  const d15 = C.cabineoPlan({ W: 600, H: 770, D: 558, G: 18, machining: 'drill15' }, {});
  assert.equal(d15.boards.TOP.pockets.length, 0, 'no polygon under Option 1');
  assert.equal(d15.boards.TOP.holes.length, 18, 'three holes per pocket, six pockets');
  assert.deepEqual(d15.boards.TOP.holes.slice(0, 3).map((h) => [h.x, h.y, h.d, h.depth, h.layer, h.face]), [
    [490, 3.6, 15, 13, 'CABINEO_POCKET_15MM', 'outside'], [490, 14.8, 15, 13, 'CABINEO_POCKET_15MM', 'outside'], [490, 26, 15, 13, 'CABINEO_POCKET_15MM', 'outside'],
  ]);
  assert.deepEqual(d15.boards.TOP.holes[0].meta.export.at, [50, 3.6]);
  assert.equal(d15.boards.TOP.recesses.length, 6, 'the cap recess is the mounting\'s, whatever the option');
  const c10 = C.cabineoPlan({ W: 600, H: 770, D: 558, G: 18, machining: 'cutter10', mounting: 'flush' }, {});
  const k = c10.boards.TOP.pockets[0];
  assert.equal(k.layer, 'CABINEO_POCKET_10MM');
  assert.equal(k.depth, 11.5);
  assert.ok(has(k.pts, [495, 9.2]) && has(k.pts, [485, 20.4]), 'the waists at 9.2 and 20.4, half-height 5');
  assert.equal(c10.boards.TOP.recesses.length, 0, 'the flush collar recess has no printed length');
  assert.match(c10.joints[0].geometry[0].recessNote, /16\.7 wide, 0\.8 deep; its length is not on the sheet/);
  assert.equal(c10.boards.BUL.holes[0].y, 770 - 5.8, 'the axis 5.8 below the face under flush');
  assert.equal(C.cabineoOutlineKeyPoints(C.cabineoOption(C.cabineoProfile({})), 'drill15'), null);
  assert.deepEqual(C.cabineoOutlineBox(C.cabineoOption(C.cabineoProfile({}))), [0, -7.5, 33.5, 7.5]);
  assert.equal(C.cabineoPocketWidth(C.cabineoProfile({})), 18.8);
  assert.equal(C.cabineoPocketWidth({ ...C.cabineoProfile({}), mounting: 'surface' }), 15);
});

// ═══ THE SKIN CHECK ════════════════════════════════════════════════════════

test('F20 · cabineoSkinFindings: an outside-face pocket over an inside-face cut of the same board, refused in words naming both', () => {
  const pocket = { kind: 'cabineo_pocket', layer: 'CABINEO_POCKET_12MM', x1: 482.5, y1: 0, x2: 497.5, y2: 33.5, depth: 13, meta: { joint: 'BUL-TOP' } };
  const board = { id: 'TOP', thickness: 18 };
  // 18 - 13 - 3 = 2 < 3: a clash.
  const hit = C.cabineoSkinFindings(board, [pocket], [{ kind: 'hole', layer: 'SCREWS_3MM', x: 490, y: 20, d: 3, depth: 3 }], P);
  assert.equal(hit.length, 1);
  assert.match(hit[0].message, /^TOP: the Cabineo pocket of BUL-TOP \(13 deep from the outside face, x 482\.5 to 497\.5, y 0 to 33\.5\) meets the SCREWS_3MM hole at 490, 20 \(3 deep from the inside face\): 2 mm of skin would be left in the 18 board, the law asks 3/);
  assert.equal(hit[0].panel, 'TOP');
  // 18 - 13 - 2 = 3: the skin holds.
  assert.deepEqual(C.cabineoSkinFindings(board, [pocket], [{ kind: 'hole', layer: 'SCREWS_3MM', x: 490, y: 20, d: 3, depth: 2 }], P), []);
  // No overlap: nothing to say.
  assert.deepEqual(C.cabineoSkinFindings(board, [pocket], [{ kind: 'hole', layer: 'SCREWS_3MM', x: 300, y: 20, d: 3, depth: 3 }], P), []);
  // A THROUGH hole (no depth, the layer's policy is through) in the footprint: refused, the two cuts would open into each other.
  const through = C.cabineoSkinFindings(board, [pocket], [{ kind: 'hole', layer: 'SCREWS_3MM', x: 490, y: 20, d: 3 }], P);
  assert.match(through[0].message, /goes through the board; the two cuts would open into each other/);
  // An inside-face pocket (an LED groove, 6 deep) under the cap recess (2.1): 18 - 2.1 - 6 = 9.9 holds; under the pocket (13): 18 - 13 - 6 < 0, refused.
  const recess = { kind: 'cabineo_recess', layer: 'CABINEO_RECESS', x1: 480.6, y1: 0, x2: 499.4, y2: 35.65, depth: 2.1, meta: { joint: 'BUL-TOP' } };
  const groove = { kind: 'pocket', layer: 'LED_GROOVE_12MM', x1: 470, y1: 10, x2: 510, y2: 22, depth: 6 };
  assert.deepEqual(C.cabineoSkinFindings(board, [recess], [groove], P), []);
  assert.match(C.cabineoSkinFindings(board, [pocket], [groove], P)[0].message, /meets the LED_GROOVE_12MM pocket at x 470 to 510, y 10 to 22 \(6 deep from the inside face\): -1 mm of skin/);
  // The one law: skinShort of frontBoard.js.
  assert.equal(C.cabineoSkinClash(18, 13, 3, P), true);
  assert.equal(C.cabineoSkinClash(18, 13, 2, P), false);
  assert.equal(C.cabineoSkinLeft(18, 13, 2), 3);
  assert.equal(C.cabineoFootprintClash([0, 0, 10, 10], [10, 0, 20, 10]), false, 'touching is not overlapping');
  assert.equal(C.cabineoFootprintClash([0, 0, 10, 10], [9, 9, 20, 20]), true);
});

// ═══ E. THE GATE ═══════════════════════════════════════════════════════════

test('F20 · THE GATE: the LISP\'s sentence verbatim, shut until the owner confirms; the export refuses only a job that would machine a Cabineo cut', () => {
  assert.equal(C.CABINEO_GATE, 'the Cabineo pattern is proposed, not confirmed by the owner');
  assert.ok(LSP.includes('"the Cabineo pattern is proposed, not confirmed by the owner"'));
  assert.equal(C.cabineoGate(C.cabineoProfile({})), C.CABINEO_GATE);
  assert.equal(C.cabineoGate(C.cabineoProfile({ joints: { cabineo: { confirmed: true } } })), null);
  const result = { drills: [{ panel: 'BUL', kind: 'cabineo_hole', layer: 'CABINEO_HOLE_5MM', x: 50, y: 762.9, d: 5 }], panels: [] };
  assert.equal(C.cabineoExportRefusal([{ result }], P), C.CABINEO_GATE);
  assert.equal(C.cabineoExportRefusal([{ result, panels: [{ id: 'BACK' }] }], P), null, 'a selection without the cut is not refused');
  assert.equal(C.cabineoExportRefusal([{ result }], { ...P, joints: { ...P.joints, cabineo: { confirmed: true } } }), null);
  const pocketOnly = { drills: [], panels: [{ id: 'TOP', cnc: { pockets: [{ kind: 'cabineo_pocket', layer: 'CABINEO_POCKET_12MM' }] } }] };
  assert.equal(C.cabineoExportRefusal([{ result: pocketOnly }], P), C.CABINEO_GATE);
  assert.equal(C.cabineoExportRefusal([{ result: { drills: [], panels: [] } }], P), null, 'a puzzle job is never refused');
  const warn = C.cabineoGateWarning({ variant: '12', gate: C.CABINEO_GATE });
  assert.equal(warn.code, 'CABINEO_GATE');
  assert.match(warn.message, /^Cabineo 12: the Cabineo pattern is proposed, not confirmed by the owner\. The CNC export refuses this unit until the owner confirms the pattern \(profile joints\.cabineo\.confirmed\)\.$/);
  assert.equal(C.cabineoGateWarning({ variant: '12', gate: null }), null);
  // Check #31 reads the code.
  assert.match(read('src/engine/checks.js'), /CABINEO_GATE: 31/);
});

// ═══ THE TABLES THE SYSTEM WRITES INTO ═════════════════════════════════════

test('F20 · the five layers, their policy rows, the part label, the system ids', () => {
  for (const [name, aci, kind] of [['CABINEO_POCKET_15MM', 47, 'hole'], ['CABINEO_POCKET_10MM', 48, 'pocket'], ['CABINEO_POCKET_12MM', 49, 'pocket'], ['CABINEO_RECESS', 50, 'pocket'], ['CABINEO_HOLE_5MM', 51, 'hole']]) {
    assert.ok(CNC_LAYERS.some((l) => l.name === name), `${name} is in the layer table`);
    assert.equal(cncLayer(name).aci, aci);
    assert.equal(cncLayer(name).kind, kind);
    const policy = machiningFor(name, P);
    assert.equal(policy.known, true, `${name} has a machining policy`);
    assert.ok(policy.reason.length > 40);
    assert.doesNotMatch(policy.reason, /[\u2013\u2014]/, 'no dash in anything written');
  }
  assert.equal(machiningFor('CABINEO_POCKET_12MM', P).draw, true, 'the pocket is bored to its record\'s depth');
  assert.equal(machiningFor('CABINEO_HOLE_5MM', P).draw, false, 'the hole\'s depth is not on the sheet: drawn as a circle, not bored through');
  const screens = CNC_LAYERS.filter((l) => l.name !== 'CARCASE').map((l) => l.screen);
  assert.equal(new Set(screens).size, screens.length, 'no two layers share a preview colour');
  // The part label (the LISP's cabineo-face-label).
  const top = { id: 'TOP', part: 'TOP', w: 564, h: 540, meta: { machinedFace: 'outside' } };
  assert.equal(partLabelText('01', top), '01 TOP 564x540 OUTSIDE FACE UP');
  assert.equal(partLabelText('01', { ...top, meta: {} }), '01 TOP 564x540', 'every other label is untouched');
  assert.equal(partLabelText('01', { id: 'SHELF-1', part: 'SHELF', w: 564, h: 520, meta: { variant: 'fixed', machinedFace: 'outside' } }), '01 SHELF-1 564x520 (FIX) OUTSIDE FACE UP');
  // The system ids: biscuit, cabineo8, cabineo12 accepted; the bare 'cabineo' stays reserved.
  assert.deepEqual([...JOINT_SYSTEMS], ['puzzle', 'dowel', 'biscuit', 'cabineo', 'cabineo8', 'cabineo12']);
  assert.equal(jointSystemOf({ joints_system: 'cabineo12' }, P), 'cabineo12');
  assert.equal(jointSystemOf({ joints_system: 'cabineo8' }, P), 'cabineo8');
  assert.equal(jointSystemOf({ joints_system: 'cabineoX' }, P), 'puzzle', 'a stray value cannot switch a unit');
  assert.equal(C.isCabineoSystem('cabineo'), false);
  assert.ok(C.cabineoApplies(getUnitType('BUD')));
  assert.ok(C.cabineoApplies(getUnitType('WUD')));
  assert.equal(C.cabineoApplies(getUnitType('SINK')), false);
  assert.match(C.cabineoKitRefusal(getUnitType('SINK')), /^SINK: its joints are not in SKYLON_JOINTS_CABINEO\.lsp's table/);
});

// ═══ Z. THE ENGINE HALF ON A REAL PUZZLE PARENT (no hook needed) ═══════════

test('F20 · cabineoVerdict on the BUD\'s puzzle cut: a plan with the NUMBERS block\'s counts; the strip and the pockets on a copy', () => {
  const parent = computeCabinet(BUD, P);
  const v = C.cabineoVerdict({ parent, params: CAB12, asked: 'cabineo12', type: getUnitType('BUD'), profile: P });
  assert.equal(v.refused, false, v.message);
  const plan = v.plan;
  assert.equal(plan.system, 'cabineo12');
  assert.equal(plan.variant, '12');
  assert.deepEqual(plan.outside, ['TOP', 'BOTTOM']);
  assert.deepEqual(plan.boards, ['BUL', 'BUR', 'TOP', 'BOTTOM']);
  assert.deepEqual(plan.counts, { pockets: 12, holes: 12, shelfPockets: 0 });
  assert.deepEqual(plan.joints.map((j) => j.offs), [[50, 270, 490], [50, 270, 490], [50, 270, 490], [50, 270, 490]]);
  // The strip, on a deep copy of the parent's panels: the puzzle of the four joints goes, the BACK's stays.
  const panels = structuredClone(parent.panels);
  C.cabineoStrip({ panels, plan, profile: P });
  C.cabineoPocketsOnto({ panels, plan });
  const top = panels.find((p) => p.id === 'TOP');
  const bul = panels.find((p) => p.id === 'BUL');
  const back = panels.find((p) => p.id === 'BACK');
  assert.equal(top.cnc.outline.length, 24, 'plain ends, the back tenons kept (64 points before)');
  assert.deepEqual(top.cnc.pockets.filter((k) => k.layer === 'PUZZLE_DOG_BONES').map(box), [[-18, 65, 0, 125], [-18, 439, 0, 499]], 'the back dog bones stay, the end ones go');
  assert.equal(top.cnc.pockets.filter((k) => k.kind === 'cabineo_pocket').length, 6);
  assert.equal(top.cnc.pockets.filter((k) => k.kind === 'cabineo_recess').length, 6);
  assert.equal(top.meta.machinedFace, 'outside');
  assert.equal(top.meta.machinedFaceLabel, 'OUTSIDE FACE UP');
  assert.equal(bul.cnc.outline.length, 34, 'a side keeps its outline (the back tenons)');
  assert.deepEqual(bul.cnc.pockets.map((k) => k.layer), ['PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES'], 'the four sockets go, the three back dog bones stay');
  assert.deepEqual(bul.cnc.holes, [], 'the eight dia 7.5 and the six dia 3 go');
  assert.equal(bul.meta, undefined, 'a side is machined from its inside face as today');
  assert.deepEqual(back, parent.panels.find((p) => p.id === 'BACK'), 'the BACK is untouched');
  // The drills: twelve dia 5 holes at the LISP's coordinates, no depth.
  const drills = C.cabineoDrills(plan);
  assert.equal(drills.length, 12);
  assert.deepEqual(drills.filter((d) => d.panel === 'BUL').map((d) => [d.x, d.y, d.d, d.depth ?? null, d.layer]), [
    [50, 762.9, 5, null, 'CABINEO_HOLE_5MM'], [270, 762.9, 5, null, 'CABINEO_HOLE_5MM'], [490, 762.9, 5, null, 'CABINEO_HOLE_5MM'],
    [50, 7.1, 5, null, 'CABINEO_HOLE_5MM'], [270, 7.1, 5, null, 'CABINEO_HOLE_5MM'], [490, 7.1, 5, null, 'CABINEO_HOLE_5MM'],
  ]);
  assert.deepEqual(drills.filter((d) => d.panel === 'BUR').map((d) => d.x), [490, 270, 50, 490, 270, 50]);
  // The order lines and the summary.
  assert.deepEqual(C.cabineoHardwareLines(plan).map((h) => [h.role, h.label, h.qty, h.unit, h.spec.article]), [
    ['cabineo_connector', 'Cabineo 12', 12, 'pcs', null], ['cabineo_cap', 'Cabineo cover cap', 12, 'pcs', null],
  ]);
  const sum = C.cabineoSummary(plan);
  assert.equal(sum.system, 'cabineo12');
  assert.deepEqual(sum.machinedFace, { TOP: 'outside', BOTTOM: 'outside', BUL: 'inside', BUR: 'inside' });
  assert.equal(sum.gate, C.CABINEO_GATE);
  const note = C.cabineoNoteRow({ unitNum: '01', derived: { joints: sum } });
  assert.match(note.material_label, /^NOTE: Cabineo 12 joints, 12 pockets \(flushCap, cutter12\) cut from the OUTSIDE face of TOP, BOTTOM \(OUTSIDE FACE UP\), 12 dia 5 holes in the sides' inside faces; the Cabineo pattern is proposed/);
  // Cabineo 8: the same coordinates, the label and X differ.
  const v8 = C.cabineoVerdict({ parent, params: CAB8, asked: 'cabineo8', type: getUnitType('BUD'), profile: P });
  assert.equal(v8.refused, false);
  assert.deepEqual(v8.plan.joints.map((j) => j.geometry.map((g) => box(g.pocket))), plan.joints.map((j) => j.geometry.map((g) => box(g.pocket))));
  assert.equal(C.cabineoHardwareLines(v8.plan)[0].label, 'Cabineo 8');
  assert.equal(C.cabineoHardwareLines(v8.plan)[0].spec.screwReachXMm, 8);
  // Refusals: a kit the table does not describe; the bare 'cabineo'.
  const sink = computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01' }, P);
  const vs = C.cabineoVerdict({ parent: sink, params: { ...sink.params, joints_system: 'cabineo12' }, asked: 'cabineo12', type: getUnitType('SINK'), profile: P });
  assert.equal(vs.refused, true);
  assert.match(vs.message, /^SINK: its joints are not in SKYLON_JOINTS_CABINEO\.lsp's table/);
  assert.equal(C.cabineoVerdict({ parent, params: BUD, asked: 'cabineo', type: getUnitType('BUD'), profile: P }).refused, true);
  assert.match(C.withCabineoRefusal(parent, vs, 'cabineo12').warnings.at(-1).message, /^Cabineo 12 refused: SINK/);
});

test('F20 · the manifest: OUTSIDE FACE UP boards in both frames, the reflection sentence, the gate', () => {
  const parent = computeCabinet(BUD, P);
  const v = C.cabineoVerdict({ parent, params: CAB12, asked: 'cabineo12', type: getUnitType('BUD'), profile: P });
  const panels = structuredClone(parent.panels);
  C.cabineoStrip({ panels, plan: v.plan, profile: P });
  C.cabineoPocketsOnto({ panels, plan: v.plan });
  const result = { unitNum: '01', panels, drills: [...parent.drills, ...C.cabineoDrills(v.plan)], derived: { joints: C.cabineoSummary(v.plan) } };
  assert.equal(C.hasOutsideFaceBoards([{ result }]), true);
  assert.equal(C.hasOutsideFaceBoards([{ result: parent }]), false);
  const m = C.cabineoOperationsManifest([{ result }], { files: [{ name: '01-TOP.dxf', setup: 'outside', panelId: 'TOP' }] });
  assert.equal(m.schema, 'cabinet-core.cabineo-operations');
  assert.equal(m.gate, C.CABINEO_GATE);
  assert.match(m.setups.flip, /frontX = partWidth - backX, frontY = backY/);
  const top = m.parts.find((p) => p.panelId === 'TOP');
  assert.equal(top.label, 'OUTSIDE FACE UP');
  assert.equal(top.reflected, true);
  assert.equal(top.widthMm, 540);
  assert.deepEqual(top.files, [{ name: '01-TOP.dxf', setup: 'outside' }]);
  assert.equal(top.pockets.length, 12);
  assert.deepEqual(top.pockets[0].own.box, [482.5, 0, 497.5, 33.5]);
  assert.deepEqual(top.pockets[0].export.box, [42.5, 0, 57.5, 33.5]);
  const bul = m.parts.find((p) => p.panelId === 'BUL');
  assert.equal(bul.label, '');
  assert.equal(bul.holes.length, 6);
  assert.equal(bul.holes[0].depthMm, null);
  assert.match(bul.holes[0].depthNote, /not on the sheet/);
});

// ═══ THE INTEGRATED CUT (needs the F20 hooks: f20-cabinet-cabineo.patch, f20-cnc-outside-face.patch, f20-profile-cabineo.patch) ═══

const LIVE = (() => {
  try {
    return computeCabinet(CAB12, P).derived?.joints?.system === 'cabineo12';
  } catch (e) {
    return false;
  }
})();
const NOT_YET = 'computeCabinet does not carry the F20 Cabineo hooks yet (scratchpad patches f20-cabinet-cabineo.patch, f20-cnc-outside-face.patch, f20-profile-cabineo.patch)';

test('F20 · a Cabineo 12 BUD: twelve pockets and recesses from the outside face, twelve holes, the puzzle off the four joints, the BACK the parent\'s, the gate shut', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const puzzle = computeCabinet(BUD, P);
  const r = computeCabinet(CAB12, P);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'JOINTS_REFUSED'), []);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'CABINEO_GATE').map((w) => w.message), [C.cabineoGateWarning(r.derived.joints).message]);
  assert.equal(r.derived.joints.system, 'cabineo12');
  assert.deepEqual([r.derived.joints.pockets, r.derived.joints.holes], [12, 12]);
  const top = r.panels.find((p) => p.id === 'TOP');
  const bottom = r.panels.find((p) => p.id === 'BOTTOM');
  const bul = r.panels.find((p) => p.id === 'BUL');
  assert.equal(top.meta.machinedFace, 'outside');
  assert.equal(bottom.meta.machinedFace, 'outside');
  assert.equal(bul.meta, undefined);
  assert.equal(top.cnc.outline.length, 24);
  assert.equal(top.cnc.pockets.filter((k) => k.kind === 'cabineo_pocket').length, 6);
  assert.equal(top.cnc.pockets.filter((k) => k.kind === 'cabineo_recess').length, 6);
  assert.deepEqual(top.cnc.pockets.filter((k) => k.kind === 'cabineo_pocket' && k.meta.end === 'Y0').map(box), [[482.5, 0, 497.5, 33.5], [262.5, 0, 277.5, 33.5], [42.5, 0, 57.5, 33.5]]);
  assert.deepEqual(bul.cnc.pockets.map((k) => k.layer), ['PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES']);
  assert.deepEqual(r.drills.filter((d) => d.panel === 'BUL').map((d) => [d.kind, d.x, d.y]), [
    ['cabineo_hole', 50, 762.9], ['cabineo_hole', 270, 762.9], ['cabineo_hole', 490, 762.9], ['cabineo_hole', 50, 7.1], ['cabineo_hole', 270, 7.1], ['cabineo_hole', 490, 7.1],
    ['hinge', 37, 84], ['hinge', 37, 116], ['hinge', 37, 454], ['hinge', 37, 486], ['hinge', 37, 654], ['hinge', 37, 686],
  ]);
  assert.equal(r.drills.filter((d) => d.kind === 'puzzle' && d.panel !== 'BACK').length, 0);
  assert.deepEqual(r.panels.find((p) => p.id === 'BACK'), puzzle.panels.find((p) => p.id === 'BACK'));
  assert.deepEqual(r.drills.filter((d) => d.panel === 'BACK'), puzzle.drills.filter((d) => d.panel === 'BACK'));
  assert.deepEqual(r.csvLines, puzzle.csvLines, 'the boards and the cut list are the parent\'s');
  assert.deepEqual(r.hardware.filter((h) => /cabineo/.test(h.role)).map((h) => [h.role, h.label, h.qty, h.spec.article]), [['cabineo_connector', 'Cabineo 12', 12, null], ['cabineo_cap', 'Cabineo cover cap', 12, null]]);
  // Cabineo 8: the same cut, the connector's label and X apart.
  const r8 = computeCabinet(CAB8, P);
  assert.deepEqual(r8.panels.map((p) => p.cnc), r.panels.map((p) => p.cnc));
  assert.deepEqual(r8.drills, r.drills);
  assert.equal(r8.hardware.find((h) => h.role === 'cabineo_connector').label, 'Cabineo 8');
  // The bare 'cabineo' of T75 is still refused with T75's sentence; a kit outside the table is refused in words.
  assert.match(computeCabinet({ ...BUD, joints_system: 'cabineo' }, P).warnings.find((w) => w.code === 'JOINTS_REFUSED').message, /Cabineo is reserved/);
  assert.match(computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01', joints_system: 'cabineo12' }, P).warnings.find((w) => w.code === 'JOINTS_REFUSED').message, /^Cabineo 12 refused: SINK/);
  // The profile carries the block (f20-profile-cabineo.patch).
  assert.deepEqual({ ...P.joints.cabineo, layers: undefined }, { mounting: 'flushCap', machining: 'cutter12', pitchMm: 250, endOffsetMm: 50, minPerJoint: 2, caps: 'all', confirmed: false, layers: undefined });
});

test('F20 · with a FIX shelf: the shelf is OUTSIDE FACE UP too, its biscuit set and side screws give way, the BACK\'s row stays', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const r = computeCabinet({ ...CAB12, ...FIX }, P);
  const sh = r.panels.find((p) => p.part === 'SHELF');
  assert.equal(sh.meta.machinedFace, 'outside');
  assert.equal(sh.cnc.pockets.filter((k) => k.kind === 'cabineo_pocket').length, 6);
  assert.equal(r.drills.filter((d) => d.kind === 'shelf_screw').length, 0);
  assert.equal((r.panels.find((p) => p.id === 'BUL').cnc.marks || []).length, 0);
  assert.equal(r.drills.filter((d) => d.kind === 'shelf_back_screw').length, 3, 'the BACK\'s dia 3 row into the shelf\'s back edge stays');
  assert.deepEqual(r.drills.filter((d) => d.kind === 'cabineo_hole' && d.panel === 'BUL' && near(d.y, 392.1)).map((d) => d.x), [70, 280, 490]);
  assert.deepEqual([r.derived.joints.pockets, r.hardware.find((h) => h.role === 'cabineo_cap').qty], [18, 18]);
});

test('F20 · the DXF of an OUTSIDE FACE UP board is reflected through the one helper: the pocket at x 490 lands at x\' 50, 3.6 from the end stays 3.6; the label says so', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const r = computeCabinet(CAB12, P);
  const files = buildUnitDxfFiles(r, P);
  const topF = files.find((f) => f.panelId === 'TOP');
  assert.equal(topF.setup, 'outside');
  const polys = topF.entities.filter((e) => e.type === 'poly' && e.layer === 'CABINEO_POCKET_12MM');
  assert.equal(polys.length, 6);
  const xs = (pts) => [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  assert.deepEqual(polys.map((e) => xs(e.pts)).sort((a, b) => a[0] - b[0]).slice(0, 2), [[42.5, 57.5], [42.5, 57.5]], 'the pocket cut at x 482.5 .. 497.5 is written at 42.5 .. 57.5');
  const first = polys.find((e) => near(xs(e.pts)[0], 42.5) && Math.min(...e.pts.map((p) => p[1])) < 1);
  assert.ok(!has(first.pts, [50, 3.6]) && !has(first.pts, [50, 14.8]) && !has(first.pts, [50, 26]), 'the lobe centres are not outline points');
  assert.ok(has(first.pts, [50, 33.5]), 'the far end (x\', 33.5): y unchanged');
  assert.ok(has(first.pts, [42.5, 3.6]) && has(first.pts, [57.5, 3.6]), 'the first lobe\'s apexes at 3.6 from the end, both sides of the axis');
  const outline = topF.entities.find((e) => e.type === 'poly' && e.layer === 'OUTLINE');
  assert.deepEqual(xs(outline.pts), [0, 558], 'the back tenons stand at 540 .. 558 now: the back is on the right, seen from above');
  assert.equal(topF.entities.filter((e) => e.type === 'text').map((e) => e.str).join(' '), '01 TOP 564x540 OUTSIDE FACE UP');
  // The BUL file is the inside-face file it always was, plus the six circles.
  const bulF = files.find((f) => f.panelId === 'BUL');
  assert.equal(bulF.setup, undefined);
  assert.deepEqual(bulF.entities.filter((e) => e.type === 'circle' && e.layer === 'CABINEO_HOLE_5MM').map((e) => [e.cx, e.cy, e.r]), [[50, 762.9, 2.5], [270, 762.9, 2.5], [490, 762.9, 2.5], [50, 7.1, 2.5], [270, 7.1, 2.5], [490, 7.1, 2.5]]);
  // The puzzle unit's files are byte-identical to what they were: no reflection without the meta.
  const puzzle = computeCabinet(BUD, P);
  const topP = buildUnitDxfFiles(puzzle, P).find((f) => f.panelId === 'TOP');
  assert.equal(topP.setup, undefined);
  assert.deepEqual(xs(topP.entities.find((e) => e.type === 'poly' && e.layer === 'OUTLINE').pts), [-18, 540]);
});

test('F20 · golden-cabineo8-bud.json and golden-cabineo12-bud.json: the BUD cut with Cabineo, held byte for byte; the 8 differs from the 12 in the connector line alone', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const g8 = `${ROOT}fixtures/golden-cabineo8-bud.json`;
  const g12 = `${ROOT}fixtures/golden-cabineo12-bud.json`;
  assert.ok(existsSync(g8) && existsSync(g12), 'the two goldens are in fixtures/');
  const f8 = JSON.parse(readFileSync(g8, 'utf8'));
  const f12 = JSON.parse(readFileSync(g12, 'utf8'));
  for (const [g, system] of [[f8, 'cabineo8'], [f12, 'cabineo12']]) {
    assert.equal(g.meta.turn, 'T78');
    assert.equal(g.meta.F, 'F20');
    assert.equal(g.params.joints_system, system);
    assert.deepEqual(goldenOf(g.params, P), g.expected);
    const top = g.expected.panels.find((p) => p.id === 'TOP');
    const bul = g.expected.panels.find((p) => p.id === 'BUL');
    assert.deepEqual([top.outline, top.holes, top.pockets], [24, 0, 14], 'plain ends; 2 back dog bones + 6 pockets + 6 recesses');
    assert.deepEqual([bul.outline, bul.holes, bul.pockets], [34, 0, 3]);
    assert.deepEqual(g.expected.drills.filter(([k]) => k.startsWith('CABINEO')), [['CABINEO_HOLE_5MM|BUL', 6], ['CABINEO_HOLE_5MM|BUR', 6]]);
    assert.deepEqual(g.expected.drills.filter(([k]) => k.startsWith('PUZZLE')), [['PUZZLE_HOLES_7_5MM|BACK', 20]]);
  }
  assert.deepEqual({ ...f8.expected, hardware: null }, { ...f12.expected, hardware: null }, 'every coordinate the same: the mounting and the option decide the pocket, not the variant');
  assert.deepEqual(f8.expected.hardware.find((h) => h.role === 'cabineo_connector'), { role: 'cabineo_connector', qty: 12, label: 'Cabineo 8' });
  assert.deepEqual(f12.expected.hardware.find((h) => h.role === 'cabineo_connector'), { role: 'cabineo_connector', qty: 12, label: 'Cabineo 12' });
});
