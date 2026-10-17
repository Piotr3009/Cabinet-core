// ─── CHAT FIX 17.10.2026: THE OWNER'S MORNING ──────────────────────────────
//
// Four things, each in his words:
//   D15 *"jak mamy szafe z czesciowa wneka i wstawimy divider to polki sie
//        rozciagaja w ksztalcie trojkata do tylnej sciany ... nie zatrzymuje
//        sie w calosci na dividerze"*            (KIT_RECESS.lsp D15)
//   D16 *"polki tez wycina ale nie wycina polek fix, czego nie rozumiem"*
//                                                  (KIT_RECESS.lsp D16)
//   D17 *"masz wkrety na niej a to nie dobrze bo nie bedziemy tam wkrecac
//        wkretow, system wkrety dookola plecow w tym przypadku nie zadziala
//        ... bedziemy montowac na ciastka (w przyszlosci dodamy lamello)
//        teraz nic"*                (KIT_RECESS.lsp D17, KIT_NOTCH.lsp D10)
//   D18 *"nie, nie dodawaj wiercenia, dodaj jeden layer w samym cornerze
//        okolo 40 mm w kazda strone na linii L shape i nazwij to corner 4 mm,
//        wtedy ja wytne ten korner"*, on all of them (*"na wszystkich"*)
//                       (KIT_RECESS.lsp D18, KIT_NOTCH.lsp D9, KIT_CORNER_L.lsp)
// and the Room setup window 50 percent wider (*"modal tylko powieksz"*).
//
// LISP first; this file holds the engine to the LISP's numbers and the PROBE
// of 17.10.2026 (WARDROBE 1000, a divider at 500, the band 300..1000).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import {
  notchProfile, notchP, cornerMarksOf, cornerMarkRecords, signedArea2, legPoint,
  notchBackJoints, notchStepScrews, notchReturnScrews, notchLidScrews, notchTopOutline, notchRot90Pts,
} from '../src/engine/notch.js';
import {
  recessShelfBump, recessShelfGrowsP, recessShelfOutline, recessShelfClr, recessBackJoints, recessWindow, recessBackPieces,
  recessReturnScrews, recessLidScrews, recessExtBackScrews,
} from '../src/engine/extension.js';
import { cncLayer } from '../src/engine/cnc/layers.js';
import { machiningFor } from '../src/engine/machining.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const P = getCabinetProfile();
const K = notchProfile(P);
const G = 18;
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const marksOf = (p) => (p.cnc?.marks || []).filter((m) => m.layer === 'CORNER_4MM');
const screwsOf = (r, id) => r.drills.filter((d) => d.panel === id && d.kind === 'screw').map((d) => [d.x, d.y]);
const bonesOf = (r, id) => r.drills.filter((d) => d.panel === id && d.kind === 'notch_dogbone');

// ─── THE NUMBERS AND THE LAYER ──────────────────────────────────────────────

test('the leg is a PROFILE number (40, the owner\'s "okolo 40") and the layer is the owner\'s name', () => {
  assert.equal(P.cnc.cornerMark.legMm, 40);
  assert.equal(P.puzzle.layers.cornerMark, 'CORNER_4MM');
  assert.equal(notchP(K, 'cnc.cornerMarkLeg'), 40, 'the notch table reads it, as KIT_NOTCH.lsp notch-profile does');
  const layer = cncLayer('CORNER_4MM');
  assert.equal(layer.kind, 'mark', 'a MARK, the biscuit line\'s kind: an open path, nothing removed');
  assert.equal(layer.aci, 53, 'the next number after RECESS_WINDOW\'s 52');
  assert.equal(machiningFor('CORNER_4MM', P).draw, false, 'the scene bores nothing for a mark');
  assert.match(read('verify/t26/sheet-vs-scene.md'), /CORNER_4MM/);
  assert.match(read('reference/lisp/KIT_NOTCH.lsp'), /\("cnc\.cornerMarkLeg"\s+\. 40\.0\)/, 'LISP first: the same number in the LISP\'s table');
});

// ─── THE CORNER MARK LAW (notch-corner-marks) ───────────────────────────────

test('cornerMarksOf: a rectangle has no re-entrant corner; an L has one, two legs of 40 along its two edges', () => {
  assert.deepEqual(cornerMarksOf([[0, 0], [100, 0], [100, 50], [0, 50]], 40), []);
  // KIT_NOTCH.lsp section I: the golden TOP, drawTOP_ROT90 frame.
  const rot = notchRot90Pts(notchTopOutline(600, 558, G, 200, 200, 'BL'), 540);
  assert.deepEqual(rot, [[540, 0], [540, 564], [0, 564], [0, 200], [200, 200], [200, 0]]);
  assert.deepEqual(cornerMarksOf(rot, 40), [[[200, 200], [160, 200]], [[200, 200], [200, 160]]]);
  // The walk's direction does not matter: the same corner, the same legs, clockwise.
  assert.deepEqual(cornerMarksOf([...rot].reverse(), 40).map(([a, b]) => [a, b]).sort(), [[[200, 200], [160, 200]], [[200, 200], [200, 160]]].sort());
  assert.ok(signedArea2(rot) > 0 && signedArea2([...rot].reverse()) < 0);
});

test('a leg is never longer than its edge: a 30 deep notch gets a 30 leg along that edge, 40 along the other', () => {
  const small = [[0, 0], [564, 0], [564, 540], [200, 540], [200, 510], [0, 510]];
  assert.deepEqual(cornerMarksOf(small, 40), [[[200, 510], [200, 540]], [[200, 510], [160, 510]]]);
  assert.deepEqual(legPoint([0, 0], [0, 10], 40), [0, 10]);
  assert.deepEqual(legPoint([0, 0], [0, 100], 40), [0, 40]);
  const recs = cornerMarkRecords(small, 40, P.puzzle);
  assert.deepEqual(recs, [
    { layer: 'CORNER_4MM', from: [200, 510], to: [200, 540] },
    { layer: 'CORNER_4MM', from: [200, 510], to: [160, 510] },
  ]);
});

test('the puzzle tabs are not corners: the mark is read off the NOMINAL outline, so a tabbed TOP carries exactly two legs', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), width: 600, notch: { corner: 'BL', w: 200, d: 200, h: 0 } }, P);
  const top = panelOf(r, 'TOP');
  assert.ok(top.cnc.outline.length > 6, 'the drawn outline carries the tabs');
  // 14:15 ("lustro bottom i top"): the TOP is drawn from its underside, y from
  // the BUR end, so the rear-left corner (200, 200) of the BOTTOM's frame is
  // (200, 564 - 200) = (200, 364) on the TOP (KIT_NOTCH.lsp D11, the NUMBERS).
  assert.deepEqual(marksOf(top), [
    { layer: 'CORNER_4MM', from: [200, 364], to: [160, 364] },
    { layer: 'CORNER_4MM', from: [200, 364], to: [200, 404] },
  ]);
  assert.deepEqual(marksOf(panelOf(r, 'BOTTOM')), [
    { layer: 'CORNER_4MM', from: [200, 200], to: [160, 200] },
    { layer: 'CORNER_4MM', from: [200, 200], to: [200, 160] },
  ], 'the BOTTOM keeps the frame it always had');
  assert.equal(bonesOf(r, 'TOP').length, 0, 'no dog bone drilled (the owner: "nie dodawaj wiercenia")');
  assert.ok(top.cnc.pockets.length > 0, 'the puzzle dog bones beside the tabs are still there ("niech tak bedzie")');
  // ...and the DXF carries the two legs as OPEN polylines on CORNER_4MM.
  const file = buildUnitDxfFiles(r, P).find((f) => f.panelId === 'TOP');
  const legs = file.entities.filter((e) => e.layer === 'CORNER_4MM');
  assert.equal(legs.length, 2);
  for (const l of legs) { assert.equal(l.closed, false); assert.equal(l.pts.length, 2); }
});

test('"na wszystkich": the L corner\'s TOP-L and SHELF-L carry the marks from v3 along the two fronts, no relief circle', () => {
  const r = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), shelves: 1 }, P);
  for (const id of ['TOP-L', 'BOTTOM-L']) {
    const p = panelOf(r, id);
    assert.deepEqual(p.cnc.curves, [], 'the relief circle is no longer drawn');
    assert.deepEqual(marksOf(p), [
      { layer: 'CORNER_4MM', from: [540, 540], to: [580, 540] },
      { layer: 'CORNER_4MM', from: [540, 540], to: [540, 580] },
    ]);
  }
  assert.deepEqual(marksOf(panelOf(r, 'SHELF-L-1')), [
    { layer: 'CORNER_4MM', from: [520, 520], to: [560, 520] },
    { layer: 'CORNER_4MM', from: [520, 520], to: [520, 560] },
  ]);
  assert.match(read('reference/lisp/KIT_CORNER_L.lsp'), /\(defun CL:cornerMarks \(pts leg/, 'LISP first');
});

// ─── D15 · THE BUMP STOPS AT THE SHELF (the owner's triangles) ──────────────

const wardrobeWithDivider = () => {
  const W = defaultParamsFor('WARDROBE', P);
  return computeCabinet({
    ...W,
    width: 1000,
    items: [
      { kind: 'partition', x_mm: 500 },
      { kind: 'shelf', variant: 'adjustable', pos_mm: 1000, zone: 0 },
      { kind: 'shelf', variant: 'adjustable', pos_mm: 1000, zone: 1 },
      { kind: 'shelf', variant: 'fixed', pos_mm: 1500, zone: 0 },
    ],
    extension: { x0: 300, x1: 1000, z0: 0, z1: W.height, d: 150 },
  }, P);
};

test('recessShelfBump clamps b0 and b1 to the shelf (KIT_RECESS.lsp D15, CASE C): the left bay 300..478, the right bay 0..460', () => {
  // The PROBE's shelves, in the plan frame: the left bay's from carcass x 20, 478 wide; the right bay's from 520, 460 wide.
  assert.deepEqual(recessShelfBump(1000, 568, G, 300, 1000, 150, [20, 20, 498, 550], K), [478, 530, 300, 478, 150]);
  assert.deepEqual(recessShelfBump(1000, 568, G, 300, 1000, 150, [520, 20, 980, 550], K), [460, 530, 0, 460, 150]);
  assert.deepEqual(recessShelfOutline(1000, 568, G, 300, 1000, 150, [20, 20, 498, 550], K),
    [[0, 0], [478, 0], [478, 680], [300, 680], [300, 530], [0, 530]], 'a bump from 300 to the shelf\'s own end, no slant');
  assert.deepEqual(recessShelfOutline(1000, 568, G, 300, 1000, 150, [520, 20, 980, 550], K),
    [[0, 0], [460, 0], [460, 680], [0, 680]], 'the whole shelf deeper, a plain rectangle');
  // A shelf the band does not reach is the parent's.
  assert.equal(recessShelfGrowsP(1000, 568, G, 700, 1000, 150, [20, 20, 498, 550], K), false);
  assert.equal(recessShelfGrowsP(1000, 568, G, 300, 1000, 150, [20, 20, 498, 550], K), true);
  // A full-width shelf answers exactly as before (CASE A of the LISP's NUMBERS).
  assert.deepEqual(recessShelfBump(600, 558, G, 310, 600, 150, [20, 20, 580, 540], K), [560, 520, 310, 560, 150]);
});

test('through computeCabinet: no shelf carries a point beyond its own end any more (the PROBE\'s (960, 0) and (-200, 0))', () => {
  const r = wardrobeWithDivider();
  assert.deepEqual(r.warnings, []);
  const s1 = panelOf(r, 'SHELF-1');
  const s2 = panelOf(r, 'SHELF-2');
  assert.deepEqual(s1.meta.planOutline, [[0, 680], [478, 680], [478, 0], [300, 0], [300, 150], [0, 150]]);
  assert.deepEqual(s2.meta.planOutline, [[0, 680], [460, 680], [460, 0], [0, 0]]);
  for (const p of [s1, s2]) {
    for (const [x] of p.meta.planOutline) assert.ok(x >= 0 && x <= p.w, `${p.id}: a point at x ${x} on a ${p.w} wide shelf`);
  }
  assert.equal(s1.area_m2, 0.28004, 'the left shelf\'s area is its own: 478 x 530 + 178 x 150, not the triangle\'s 0.444');
  assert.deepEqual(marksOf(s1).length, 2, 'the left shelf\'s one corner, two legs');
  assert.deepEqual(marksOf(s2), [], 'the right shelf has no corner');
});

// ─── D16 · THE FIXED SHELF GROWS TOO ────────────────────────────────────────

test('a FIXED shelf in the band grows like any other (D10 names a shelf, any shelf); its joint stays the parent\'s', () => {
  const r = wardrobeWithDivider();
  const fixed = panelOf(r, 'SHELF-3');
  assert.equal(fixed.meta.variant, 'fixed');
  assert.equal(fixed.h, 680, '530 + 150');
  // The fixed shelf runs from BUL's face (x 18, 482 wide to the divider); its bump
  // starts at the RETURN's inner face, carcass 318 = 300 in its own frame (clr 0).
  assert.deepEqual(fixed.meta.planOutline, [[0, 680], [482, 680], [482, 0], [300, 0], [300, 150], [0, 150]]);
  assert.ok(r.derived.extension.grown.includes('SHELF-3'));
  assert.doesNotMatch(read('src/engine/extension.js'), /if \(p\.meta\?\.variant === 'fixed'\) continue;/, 'the engine\'s own exception is gone');
  assert.match(read('reference/lisp/KIT_RECESS.lsp'), /D16 THE FIXED SHELF GROWS TOO/);
});

// The owner's second look, 10:35: *"dlaczego polka fix ma minimalne zalamanie?
// ma kat i nawet dodales corner layer? why?"*  A fixed shelf has no clearance,
// so its bump is cut with clr 0 (the notch's grammar), not the adjustable's 2.
test('a FIXED shelf in a full-width band is a plain deeper board: no 2 mm step, no corner, no mark (D16, 10:35)', () => {
  // The band runs the full width and stops at 1800 (a band over the whole
  // carcass is a deeper carcass at store level, refused here by design).
  const W = defaultParamsFor('WARDROBE', P);
  const r = computeCabinet({
    ...W,
    width: 700,
    items: [{ kind: 'shelf', variant: 'fixed', pos_mm: 1000 }, { kind: 'shelf', variant: 'adjustable', pos_mm: 1400 }],
    extension: { x0: 0, x1: 700, z0: 0, z1: 1800, d: 150 },
  }, P);
  assert.deepEqual(r.warnings, []);
  const fixed = panelOf(r, 'SHELF-1');
  const adj = panelOf(r, 'SHELF-2');
  assert.equal(fixed.meta.variant, 'fixed');
  assert.equal(fixed.w, 664, 'face to face, 700 - 36');
  assert.equal(fixed.h, 680, '530 + 150');
  // The PROBE before the fix: (0,680) (664,680) (664,150) (662,150) (662,0) (2,0) (2,150) (0,150) and four marks.
  assert.deepEqual(fixed.meta.planOutline, [[0, 680], [664, 680], [664, 0], [0, 0]]);
  assert.deepEqual(fixed.cnc.outline.length, 4, 'four corners, nothing re-entrant');
  assert.deepEqual(marksOf(fixed), [], 'no corner, no CORNER_4MM mark');
  assert.ok(r.derived.extension.grown.includes('SHELF-1'));
  // The adjustable shelf beside it answers as before: 660 wide, 2 clear, a plain rectangle too.
  assert.equal(adj.w, 660);
  assert.deepEqual(adj.meta.planOutline, [[0, 680], [660, 680], [660, 0], [0, 0]]);
  assert.deepEqual(marksOf(adj), []);
  // The helpers: clr is the shelf's own, 0 fixed, wc / 2 adjustable; the default is the adjustable's.
  assert.equal(recessShelfClr(true, K), 0);
  assert.equal(recessShelfClr(false, K), 2);
  assert.deepEqual(recessShelfBump(700, 568, G, 0, 700, 150, [18, 20, 682, 550], K, 0), [664, 530, 0, 664, 150]);
  assert.deepEqual(recessShelfBump(700, 568, G, 0, 700, 150, [20, 20, 680, 550], K), [660, 530, 0, 660, 150]);
  // CASE A of the LISP's NUMBERS, the fixed line: x from 18, 564 wide, bump from 310 to its end, one corner.
  assert.deepEqual(recessShelfOutline(600, 558, G, 310, 600, 150, [18, 20, 582, 540], K, 0),
    [[0, 0], [564, 0], [564, 670], [310, 670], [310, 520], [0, 520]]);
  assert.match(read('reference/lisp/KIT_RECESS.lsp'), /\(defun recess-shelf-clr \(fixed\)/);
  assert.match(read('reference/lisp/KIT_RECESS.lsp'), /\(defun recess-shelf-bump \(cw cd g ex0 ex1 ed shelf clr /);
});

// ─── D17 · NO SCREW BETWEEN THE BACK AND THE BOX ────────────────────────────

test('the notch: the BACK\'s notched edge carries no row; the STEP, the RETURN and the LID state no screws', () => {
  const full = computeCabinet({ ...defaultParamsFor('BUD', P), width: 600, notch: { corner: 'BL', w: 200, d: 200, h: 0 } }, P);
  assert.deepEqual(screwsOf(full, 'BACK').filter(([x]) => x === 9), [], 'full height: the whole nearX column is gone');
  assert.equal(screwsOf(full, 'BACK').length, 10, 'the far column (4) and the top and bottom rows (3 + 3)');
  for (const id of ['STEP', 'RETURN']) assert.deepEqual(panelOf(full, id).meta.notch.screws, []);
  const part = computeCabinet({ ...defaultParamsFor('BUD', P), width: 600, notch: { corner: 'BL', w: 200, d: 200, h: 300 } }, P);
  const near = screwsOf(part, 'BACK').filter(([x]) => x === 9);
  assert.ok(near.every(([, y]) => y > 300), `beside the notch (y <= 300) nothing; above it the side's own rows stay (${JSON.stringify(near)})`);
  assert.ok(near.length > 0, 'the rows above a part-height notch are the side\'s, and stay');
  assert.deepEqual(panelOf(part, 'LID').meta.notch.screws, []);
  // The pure routines say the same.
  assert.equal(notchStepScrews(770, G, 200, 0, 'BL', K), null);
  assert.equal(notchReturnScrews(770, G, 200, 200, 0, 'BL', K), null);
  assert.equal(notchLidScrews(770, G, 200, 200, 300, 'BL', K), null);
  const bj = notchBackJoints(600, 770, G, 200, 0, 'BL', K);
  assert.ok(bj.SCREWS.every(([x]) => x !== 209), 'no column at nw + S');
});

test('the recess: the BACK keeps drawBACK\'s rows only; nothing round the window; the added boards state none', () => {
  const window = recessWindow(600, 770, G, 110, 490, 210, 590);
  const [piece] = recessBackPieces(600, 770, G, 110, 490, 210, 590);
  const bj = recessBackJoints(piece, window, 600, 770, G, 110, 490, 210, 590, [113, 487], [113, 487], [95, 385, 675], [95, 385, 675], K);
  assert.equal(bj.SCREWS.length, 14, 'the parent\'s fourteen');
  assert.ok(bj.SCREWS.every(([x, z]) => !(x > 100 && x < 500 && z > 200 && z < 600)), 'none inside the band');
  assert.deepEqual(recessReturnScrews(770, G, 0, 770, 150, K), []);
  assert.deepEqual(recessLidScrews(G, 110, 490, 150, K), []);
  assert.deepEqual(recessExtBackScrews(600, 770, G, 110, 490, 210, 590, K), []);
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), width: 600, extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } }, P);
  assert.equal(screwsOf(r, 'BACK').length, 14);
  for (const id of ['RETURN-L', 'RETURN-R', 'FLOOR', 'LID', 'EXT-BACK']) {
    assert.deepEqual(panelOf(r, id).meta.extension.screws, [], `${id}: "teraz nic"`);
    assert.equal(panelOf(r, id).meta.fixing, 'manual', 'by hand, on biscuits');
  }
});

// ─── THE WINDOW: 50 PERCENT WIDER, THE PLAN UNTOUCHED ───────────────────────

test('Room setup is 1290 px wide in PRO and in retail (through the copy script); the plan\'s 380 x 260 does not move', () => {
  const pro = read('src/components/RoomModal.jsx');
  assert.match(pro, /width="w-\[1290px\]"/);
  assert.doesNotMatch(pro, /w-\[860px\]/);
  assert.match(pro, /const PLAN_W = 380;\nconst PLAN_H = 260;/, '"modal tylko powieksz"');
  const retail = read('src/retail/design/room/RoomModal.jsx');
  assert.match(retail, /width="pbi-re-w1290"/);
  assert.match(read('src/retail/styles/roomeditor.css'), /\.pbi-re-w1290 \{ width: 1290px; \}/);
  assert.match(read('scripts/t67-copy.mjs'), /'w-\[1290px\]': 'pbi-re-w1290'/);
});

// ─── THE RECORD ─────────────────────────────────────────────────────────────

test('the three goldens the law moved say why, and the six base goldens are not among them', () => {
  for (const f of ['golden-notch.json', 'golden-recess.json', 'golden-recess-band.json']) {
    const file = JSON.parse(read(`fixtures/${f}`));
    assert.match(file.meta.repinned, /17\.10\.2026/, `${f} names the day`);
  }
  assert.match(read('scripts/t78-classify.d/f29-owner-1710.mjs'), /fixtures\/golden-recess-band\.json/);
  for (const f of ['KIT_NOTCH', 'KIT_RECESS', 'KIT_CORNER_L']) {
    const lisp = read(`reference/lisp/${f}.lsp`);
    assert.ok(/^[\x00-\x7F]*$/.test(lisp), `${f}.lsp is ASCII`);
    assert.match(lisp, /17\.10\.2026/);
  }
});
