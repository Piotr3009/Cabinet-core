// ─── T75 F7 · THE CORNER NOTCH, LISP FIRST ──────────────────────────────────
//
// The owner, 23.09.2026 (list 4): *"WYCIĘCIE NAROŻNIKA w karkasie (mega
// ważne, np. L-ka przy ścianie, rurze). Klikasz 'wytnij narożnik', program
// podświetla narożniki, wybierasz, podajesz wysokość, głębokość, szerokość
// (np. 200x200). Program dorysowuje elementy wg logiki karkasu, cięcie realne
// przez wszystkie panele tworzące róg (w tym dno, automatycznie), z
// dogbone'ami i nawierceniami."*
//
// `reference/lisp/KIT_NOTCH.lsp` is the law (written and paren-balanced first,
// 370d013); `src/engine/notch.js` mirrors it routine for routine. These
// assertions are the LISP's own NUMBERS block (section I, a BUD 600 with a
// 200 x 200 full-height BL notch) and the PROBE's socket table
// (verify/t75/p02-probe.md section 3), read off the engine's real cut.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as N from '../src/engine/notch.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { sidePanelGeometry } from '../src/engine/puzzle.js';
import { ELEMENT_TO_PART_ID } from '../src/engine/partRegistry.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { MODAL_KINDS } from '../src/lib/modalLayer.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { askNotchCorner, notchCornerSpots } from '../src/3d/notchPick.js';
import * as A from '../src/retail/design/adapter.js';
import { partDetailDrawing } from '../src/engine/drawings/partDetail.js';
import { buildUnitCard } from '../src/engine/drawings/unitCard.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { dump } from '../scripts/t64-classify.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const K = N.notchProfile(P);
const r2 = (v) => Math.round(v * 10000) / 10000;
const pts = (list) => list.map(([x, y]) => [r2(x), r2(y)]);

// The LISP's golden case: KIT_BUD_FULL defaults, golden-bud.json's BUD-A.
const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1 };
const NOTCH = { corner: 'BL', w: 200, d: 200, h: 0 };
const parent = computeCabinet(BUD, P);
const cut = computeCabinet({ ...BUD, notch: NOTCH }, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const drillsOf = (r, id, kind) => r.drills.filter((d) => d.panel === id && (!kind || d.kind === kind));
const xs = (list) => [...new Set(list.map((d) => d.x))].sort((a, b) => a - b);
const ys = (list) => [...new Set(list.map((d) => d.y))].sort((a, b) => a - b);
/** A socket's centre is the middle of its two holes (±24.5). */
const socketXs = (list, y) => {
  const at = xs(list.filter((d) => d.y === y));
  const out = [];
  for (let i = 0; i + 1 < at.length; i += 2) out.push(r2((at[i] + at[i + 1]) / 2));
  return out;
};

// ═══ THE LISP, ROUTINE FOR ROUTINE ═════════════════════════════════════════

test('F7 · the profile numbers the LISP reads are the engine\'s own (section A)', () => {
  assert.equal(N.notchP(K, 'puzzle.tabCentresFromEnd'), 95);
  assert.equal(N.notchP(K, 'puzzle.singleSocketBelow'), 264.5);
  assert.equal(N.notchP(K, 'puzzle.dogboneHalfHeight'), 30);
  assert.equal(N.notchP(K, 'puzzle.screwFromEnd'), 50);
  assert.equal(N.notchP(K, 'cnc.toolDiameter'), 8);
  assert.equal(N.notchCutterRadius(N.notchP(K, 'cnc.toolDiameter')), 4);
  // CLAUDE.md F7: "prefilled 200, 200, full (`profile.notch.defaults // T75 proposed`)".
  assert.deepEqual(P.notch.defaults, { widthMm: 200, depthMm: 200, heightMm: 0 });
  assert.match(read('src/engine/profile.js'), /notch: \{\n\s+defaults: \{ widthMm: 200, depthMm: 200, heightMm: 0 \}, \/\/ T75 proposed, owner to confirm/);
  // …and a profile saved before tonight gains them (the migrate line).
  assert.deepEqual(migrateCabinetProfile({}).notch.defaults, P.notch.defaults);
  assert.equal(N.notchP(K, 'notch.defaults.height'), 0);
});

test('F7 · the corner, the height, the box (sections B, D3)', () => {
  assert.deepEqual(N.NOTCH_CORNERS, ['BL', 'BR', 'FL', 'FR']);
  assert.equal(N.notchSideName('BL'), 'BUL');
  assert.equal(N.notchSideName('FR'), 'BUR');
  assert.equal(N.notchFullP(770, 0), true);
  assert.equal(N.notchFullP(770, 300), false);
  assert.equal(N.notchHh(770, 0), 770);
  assert.equal(N.notchBoxedP(18, 18), true, 'D3: NOT LESS THAN the board is boxed');
  assert.equal(N.notchBoxedP(17, 18), false);
  // SKY:tabCentres, three ways.
  assert.deepEqual(N.skyTabCentres(770, 95, 300, 600), [95, 385, 675]);
  assert.deepEqual(N.skyTabCentres(470, 95, 300, 600), [95, 375]);
  assert.deepEqual(N.skyTabCentres(250, 95, 300, 600), [125]);
  // notch-replan-sockets is socketCentres to the letter.
  assert.deepEqual(N.notchReplanSockets(340, 95, 264.5), [95, 245]);
  assert.deepEqual(N.notchReplanSockets(200, 95, 264.5), [100]);
  assert.deepEqual(N.notchReplanSockets(400, null, 264.5), [200]);
  assert.deepEqual(N.notchScrewRow(340, 50), [50, 170, 290]);
  assert.deepEqual(N.notchScrewRow(80, 50), [20, 60]);
  assert.equal(N.notchMinJointEdge(30, 18), 96, 'D6: 2 x (dogboneHalfHeight + g)');
});

test('F7 · NUMBERS: the keep-out, the TOP and BOTTOM outline, the dog bone, the area', () => {
  assert.deepEqual(N.notchKeepout(600, 558, 18, 200, 200, 'BL', 0), [0, 340, 218, 558]);
  const plan = N.notchTopOutline(600, 558, 18, 200, 200, 'BL');
  assert.deepEqual(plan, [[0, 0], [564, 0], [564, 540], [200, 540], [200, 340], [0, 340]]);
  assert.deepEqual(N.notchRot90Pts(plan, 540), [[540, 0], [540, 564], [0, 564], [0, 200], [200, 200], [200, 0]]);
  const db = N.notchTopDogbone(600, 558, 18, 200, 200, 'BL', 4);
  assert.deepEqual(db.map(r2), [197.1716, 342.8284, 4]);
  // …and on the engine's own TOP and BOTTOM, drawn ROT90.
  for (const id of ['TOP', 'BOTTOM']) {
    const p = panelOf(cut, id);
    assert.equal(p.w, 564);
    assert.equal(p.h, 540);
    assert.equal(r2(p.area_m2 * 1e6), 264560, `${id}: 0.305 -> 0.265 m2`);
    assert.deepEqual(p.meta.notch.outline, plan);
    assert.deepEqual(p.cnc.notch, { fc: 'x0y0', nw: 200, nh: 200 });
    const bone = drillsOf(cut, id, 'notch_dogbone');
    assert.equal(bone.length, 1);
    assert.deepEqual([bone[0].x, bone[0].y, bone[0].d], [197.1716, 197.1716, 8]);
    assert.equal(bone[0].layer, P.puzzle.layers.dogbone);
  }
  assert.ok(cut.csvLines.includes('01,TOP,564,540,>,0.56,0.265'));
});

test('F7 · THE PROBE TABLE: BUL\'s sockets 95,445 -> 95,245, screws and pins re-planned, hinges stay', () => {
  const bul = panelOf(cut, 'BUL');
  assert.equal(bul.w, 340, 'BUL 540 x 770 -> 340 x 770');
  assert.deepEqual(bul.box, { x: 0, y: 0, z: 218, w: 18, h: 770, d: 340 });
  assert.deepEqual(bul.cnc.outline, [[0, 0], [340, 0], [340, 770], [0, 770]], 'a rectangle, no back tabs');
  // parent: top and bottom sockets at 95 and 445 (x from the front)
  assert.deepEqual(socketXs(drillsOf(parent, 'BUL', 'puzzle'), 762), [95, 445]);
  assert.deepEqual(socketXs(drillsOf(parent, 'BUL', 'puzzle'), 8), [95, 445]);
  // notched: 95 and 245 (445 -> 245), top and bottom
  assert.deepEqual(socketXs(drillsOf(cut, 'BUL', 'puzzle'), 762), [95, 245]);
  assert.deepEqual(socketXs(drillsOf(cut, 'BUL', 'puzzle'), 8), [95, 245]);
  // screw rows 50, 270, 490 -> 50, 170, 290
  assert.deepEqual(xs(drillsOf(parent, 'BUL', 'screw')), [50, 270, 490]);
  assert.deepEqual(xs(drillsOf(cut, 'BUL', 'screw')), [50, 170, 290]);
  // back-edge tabs 95, 385, 675 -> none (it meets the STEP)
  assert.equal(panelOf(parent, 'BUL').cnc.outline.length, 34);
  assert.equal(bul.cnc.pockets.filter((pk) => pk.layer === P.puzzle.layers.dogbone).length, 0);
  // shelf-pin columns 70, 470 -> 70, 270 (the column nearest the notch steps off it)
  assert.deepEqual(xs(drillsOf(parent, 'BUL', 'shelf')), [70, 470]);
  assert.deepEqual(xs(drillsOf(cut, 'BUL', 'shelf')), [70, 270]);
  // hinge holes at x 37, y 84/116 454/486 654/686: unchanged
  assert.deepEqual(drillsOf(cut, 'BUL', 'hinge').map((d) => [d.x, d.y]), drillsOf(parent, 'BUL', 'hinge').map((d) => [d.x, d.y]));
  // KIT_NOTCH.lsp section I: "sidePanelGeometry on w 340 with backTabs off gives BUL's sockets and screws exactly".
  const g = sidePanelGeometry({
    w: 340, h: 770, G: 18, side: 'L', puzzle: P.puzzle, edges: { backTabs: false }, jointInset: 95,
  });
  assert.deepEqual(bul.cnc.outline, g.outline);
  assert.deepEqual(bul.cnc.holes, g.holes);
  // The LISP's own routine agrees, joint for joint.
  const sj = N.notchSideJoints(558, 770, 18, 200, 200, 0, 'BL', K);
  assert.deepEqual(sj['TOP-SOCKETS'], [95, 245]);
  assert.deepEqual(sj['BOTTOM-SCREWS'], [50, 170, 290]);
  assert.deepEqual(sj['BACK-TABS'], []);
  assert.deepEqual(sj['PIN-COLUMNS'], [70, 270]);
  // BUR untouched.
  assert.deepEqual(panelOf(cut, 'BUR'), panelOf(parent, 'BUR'));
});

test('F7 · THE PROBE TABLE: TOP and BOTTOM tabs into BUL re-planned, into BUR unchanged, into BACK 95 -> 295', () => {
  const tj = N.notchTopJoints(600, 558, 18, 200, 200, 'BL', K);
  assert.deepEqual(tj, { LEFT: [95, 245], RIGHT: [95, 445], BACK: [295, 469] });
  // In the TOP's drawn frame (x' from the BACK edge = 540 - y): the LEFT tabs
  // stand at 295 and 445, the RIGHT at 95 and 445, the BACK at y' 295 and 469.
  const top = panelOf(cut, 'TOP');
  const bones = top.cnc.pockets.map((pk) => [r2((pk.x1 + pk.x2) / 2), r2((pk.y1 + pk.y2) / 2)]);
  assert.deepEqual(bones.filter(([, y]) => y < 0 && y > -18).map(([x]) => x).sort((a, b) => a - b), [295, 445]);
  assert.deepEqual(bones.filter(([, y]) => y > 564).map(([x]) => x).sort((a, b) => a - b), [95, 445]);
  assert.deepEqual(bones.filter(([x]) => x < 0).map(([, y]) => y).sort((a, b) => a - b), [295, 469]);
});

test('F7 · THE PROBE TABLE: the BACK is 400 wide, its notch-edge sockets gone, its rows re-planned', () => {
  const back = panelOf(cut, 'BACK');
  assert.equal(back.w, 400);
  assert.deepEqual(back.box, { x: 200, y: 0, z: 0, w: 400, h: 770, d: 18 }, 'carcass x 200..600');
  assert.deepEqual(back.cnc.outline, [[0, 0], [400, 0], [400, 770], [0, 770]]);
  const puzzle = drillsOf(cut, 'BACK', 'puzzle');
  // the far edge keeps its three, the notch edge has none
  assert.deepEqual(ys(puzzle.filter((d) => d.x === 392)), [70.5, 119.5, 360.5, 409.5, 650.5, 699.5]);
  assert.equal(puzzle.filter((d) => d.x < 20).length, 0, 'the notch edge carries no socket');
  // top and bottom: carcass 113, 487 -> 313, 487 (own frame 113, 287)
  assert.deepEqual(socketXs(puzzle, 762), [113, 287]);
  assert.deepEqual(socketXs(puzzle, 8), [113, 287]);
  const bj = N.notchBackJoints(600, 770, 18, 200, 0, 'BL', K);
  assert.deepEqual(bj['TOP-SOCKETS'], [313, 487]);
  assert.deepEqual(bj['NEAR-SOCKETS'], []);
  // screws: both side rows 50 240 530 720 (the notch-edge row at carcass x 209
  // holds the RETURN's end), top and bottom 268, 400, 532 (own frame 68, 200, 332)
  const screws = drillsOf(cut, 'BACK', 'screw');
  assert.deepEqual(ys(screws.filter((d) => d.x === 9)), [50, 240, 530, 720]);
  assert.deepEqual(ys(screws.filter((d) => d.x === 391)), [50, 240, 530, 720]);
  assert.deepEqual(xs(screws.filter((d) => d.y === 761)), [68, 200, 332]);
  assert.deepEqual(xs(screws.filter((d) => d.y === 9)), [68, 200, 332]);
});

test('F7 · NUMBERS: the STEP and the RETURN, outlines, places, the joiner\'s screws (manual)', () => {
  const ret = panelOf(cut, 'RETURN');
  const step = panelOf(cut, 'STEP');
  assert.equal(panelOf(cut, 'LID'), undefined, 'full height: no LID');
  assert.deepEqual([ret.w, ret.h, ret.part, ret.role], [200, 770, 'NOTCH-RETURN', 'notch_box']);
  assert.deepEqual([step.w, step.h, step.part], [200, 770, 'NOTCH-STEP']);
  // RETURN carcass x 200..218, plan y 340..540 (z 18..218); STEP x 0..200, y 340..358 (z 200..218)
  assert.deepEqual(ret.box, { x: 200, y: 0, z: 18, w: 18, h: 770, d: 200 });
  assert.deepEqual(step.box, { x: 0, y: 0, z: 200, w: 200, h: 770, d: 18 });
  assert.deepEqual(N.notchBoxPlaces(600, 558, 770, 18, 200, 200, 0, 'BL'), {
    RETURN: [200, 340, 0, 218, 540, 770], STEP: [0, 340, 0, 200, 358, 770],
  });
  // No puzzle joint, no machined hole: an outline, and the joiner's fixing.
  for (const p of [ret, step]) {
    assert.equal(p.cnc.outline.length, 4);
    assert.equal(p.cnc.holes.length, 0);
    assert.equal(p.cnc.pockets.length, 0);
    assert.equal(drillsOf(cut, p.id).length, 0);
    assert.equal(p.meta.readiness, 'geometry');
    assert.equal(p.meta.fixing, 'manual');
  }
  // THE BOX'S FIXING (the back screw row, stated, not drilled)
  assert.deepEqual(step.meta.notch.screws, [[9, 50], [9, 385], [9, 720], [68, 9], [68, 761], [109, 9], [109, 761], [150, 9], [150, 761]]);
  assert.deepEqual(ret.meta.notch.screws, [[50, 9], [50, 761], [100, 9], [100, 761], [150, 9], [150, 761], [9, 50], [9, 385], [9, 720]]);
  assert.ok(cut.csvLines.includes('01,RETURN,200,770,,0,0.154'), 'the cut list shows the RETURN board');
  assert.ok(cut.csvLines.includes('01,STEP,200,770,,0,0.154'));
  // The BOM row is the carcass board's (an unmapped part is a silent drop).
  assert.equal(ELEMENT_TO_PART_ID['NOTCH-RETURN'], 'carcase_side');
  assert.equal(ELEMENT_TO_PART_ID['NOTCH-STEP'], 'back');
  assert.equal(ELEMENT_TO_PART_ID['NOTCH-LID'], 'carcase_horizontal');
});

test('F7 · NUMBERS: SHELF-1 takes the outline, 2 clear of the RETURN, and its dog bone', () => {
  const shelf = panelOf(cut, 'SHELF-1');
  assert.deepEqual(shelf.meta.notch.outline, [[0, 0], [560, 0], [560, 520], [200, 520], [200, 320], [0, 320]]);
  assert.deepEqual(
    N.notchShelfDogbone(600, 558, 18, 200, 200, 'BL', 2, N.notchShelfRect(600, 558, 18, K), 4).map(r2),
    [197.1716, 322.8284, 4],
  );
  // drawn `depth x width`, x from the front: the plan transposed, anticlockwise
  assert.deepEqual(shelf.cnc.outline, [[320, 0], [320, 200], [520, 200], [520, 560], [0, 560], [0, 0]]);
  assert.deepEqual(shelf.cnc.notch, { fc: 'x1y0', nw: 200, nh: 200 });
  const bone = drillsOf(cut, 'SHELF-1', 'notch_dogbone')[0];
  assert.deepEqual([bone.x, bone.y], [322.8284, 197.1716]);
});

test('F7 · the plinth: untouched by a back notch, nw shorter at a front corner deeper than its setback', () => {
  assert.deepEqual(N.notchPlinth(600, 558, 200, 200, 'BL', 50, 18), [0, 600]);
  assert.deepEqual(N.notchPlinth(600, 558, 200, 200, 'FL', 50, 18), [200, 600]);
  const front = computeCabinet({ ...BUD, hinge: 'R', plinth: true, notch: { corner: 'FL', w: 200, d: 200, h: 0 } }, P);
  const pl = panelOf(front, 'PLINTH');
  assert.equal(pl.w, 400);
  assert.equal(pl.box.x, 200);
  const back = computeCabinet({ ...BUD, plinth: true, notch: NOTCH }, P);
  assert.equal(panelOf(back, 'PLINTH').w, 600);
});

test('F7 · the leg in the notch steps out of it; the others stay', () => {
  const before = parent.assemblies.legs.positions;
  const after = cut.assemblies.legs.positions;
  assert.equal(after.length, before.length);
  assert.deepEqual(after[2], { x: 18, z: 268, role: 'corner', notch: true }, 'back-left: 50 + 200 + 18');
  assert.deepEqual([after[0], after[1], after[3]], [before[0], before[1], before[3]]);
});

test('F7 · a part-height notch: the LID, the side an L with tabs above it, the back an L', () => {
  const r = computeCabinet({ ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 300 } }, P);
  const bul = panelOf(r, 'BUL');
  assert.equal(bul.w, 540, 'a part-height side keeps its length');
  assert.deepEqual(bul.cnc.notch, { fc: 'x1y0', nw: 200, nh: 300 });
  // back tabs above the notch: nh + SKY:tabCentres(ch - nh) = 300 + [95, 375]
  const tabBones = bul.cnc.pockets.filter((pk) => pk.layer === P.puzzle.layers.dogbone).map((pk) => (pk.y1 + pk.y2) / 2);
  assert.deepEqual(tabBones, [395, 675]);
  // bottom sockets re-planned on 340, the top row the parent's
  assert.deepEqual(socketXs(drillsOf(r, 'BUL', 'puzzle'), 8), [95, 245]);
  assert.deepEqual(socketXs(drillsOf(r, 'BUL', 'puzzle'), 762), [95, 445]);
  const lid = panelOf(r, 'LID');
  assert.deepEqual([lid.w, lid.h], [200, 200]);
  assert.deepEqual(lid.box, { x: 18, y: 300, z: 18, w: 200, h: 18, d: 200 });
  assert.deepEqual([panelOf(r, 'RETURN').h, panelOf(r, 'STEP').h], [300, 300]);
  assert.deepEqual(panelOf(r, 'BACK').cnc.notch, { fc: 'x0y0', nw: 200, nh: 300 });
  assert.equal(panelOf(r, 'TOP').meta?.notch, undefined, 'the TOP is the parent\'s');
  assert.ok(panelOf(r, 'BOTTOM').meta.notch, 'the BOTTOM always takes it');
});

test('F7 · every corner, both kits: no outline fault, no drill fault, BUR mirrored by its own frame', () => {
  const cases = [
    ['BUD', { corner: 'BR', w: 200, d: 200, h: 0 }, { hinge: 'R' }],
    ['BUD', { corner: 'FL', w: 200, d: 200, h: 0 }, { hinge: 'R' }],
    ['BUD', { corner: 'FR', w: 200, d: 100, h: 300 }, { hinge: 'L', plinth: true }],
    ['BUD', { corner: 'BR', w: 150, d: 120, h: 400 }, { shelves: 2 }],
    ['BUD', { corner: 'BR', w: 10, d: 40, h: 50 }, {}],
    ['WARDROBE', { corner: 'BL', w: 200, d: 200, h: 0 }, {}],
    ['WARDROBE', { corner: 'BR', w: 300, d: 250, h: 1200 }, { rail: true }],
    ['BLIND_BASE', { corner: 'BR', w: 200, d: 200, h: 0 }, { doors: { count: 1 } }],
  ];
  for (const [type, notch, extra] of cases) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', shelves: 1, ...extra, notch }, P);
    const said = `${type} ${JSON.stringify(notch)}`;
    assert.ok(!r.warnings.some((w) => w.code === N.NOTCH_REFUSED), `${said} refused: ${JSON.stringify(r.warnings)}`);
    assert.ok(r.derived.notch, said);
    assert.deepEqual(resultFindings(r), [], `${said}: outline faults`);
    assert.deepEqual(unitFindings(r, { profile: P }), [], `${said}: export gate`);
  }
  // BR full height: BUR runs from its back, so its hinge row lands 37 from its NEW front.
  const br = computeCabinet({ ...BUD, hinge: 'R', notch: { corner: 'BR', w: 200, d: 200, h: 0 } }, P);
  assert.deepEqual(xs(drillsOf(br, 'BUR', 'hinge')), [340 - 37]);
  assert.deepEqual(xs(drillsOf(br, 'BUR', 'shelf')), [70, 270]);
  assert.deepEqual(panelOf(br, 'BUR').box, { x: 582, y: 0, z: 218, w: 18, h: 770, d: 340 });
  // An unboxed rebate (D3): the side keeps its joints, the rebate is the joiner's.
  const reb = computeCabinet({ ...BUD, notch: { corner: 'BR', w: 10, d: 40, h: 50 } }, P);
  assert.deepEqual(panelOf(reb, 'BUR').meta.notch.rebate, [0, 0, 40, 50, 10]);
  assert.equal(panelOf(reb, 'RETURN'), undefined, 'a rebate is not boxed');
});

// ═══ ROOM REFUSES FIRST (H, D7, D8) ════════════════════════════════════════

test('F7 · D7: a hinge in the notch is a REFUSAL in words, and the parent is what is cut', () => {
  const asked = { ...BUD, notch: { corner: 'FL', w: 200, d: 200, h: 0 } };
  const r = computeCabinet(asked, P);
  const w = r.warnings.find((x) => x.code === N.NOTCH_REFUSED);
  assert.ok(w, 'not refused');
  assert.equal(w.panel, 'BUL');
  assert.equal(w.message, N.notchHoleRefusal('hinge', 'BUL'));
  assert.match(w.message, /hinge drilling of BUL falls in the notch/);
  // Nothing clipped silently: every board is the parent's, byte for byte.
  assert.deepEqual(r.panels, parent.panels);
  assert.deepEqual(r.drills, parent.drills);
  assert.equal(r.derived.notch.refused, w.message);
});

test('F7 · the LISP\'s refusals, each naming the board; the kits it does not cover say so', () => {
  assert.equal(N.notchRefusal(600, 558, 770, 18, 500, 200, 0, 'BL', K),
    'NOTCH: the notch and its RETURN take the TOP and the BOTTOM across. Make it narrower.');
  assert.match(N.notchRefusal(600, 558, 770, 18, 200, 460, 0, 'BL', K), /what is left of BUL cannot hold a joint/);
  assert.match(N.notchRefusal(600, 558, 770, 18, 10, 200, 0, 'BL', K), /rebate in BUL, and this one eats a joint/);
  assert.match(N.notchRefusal(600, 558, 770, 18, 200, 200, 740, 'BR', K), /LID room under the TOP/);
  assert.match(N.notchRefusal(600, 558, 770, 18, 200, 200, 700, 'BR', K), /back edge of BUR above the notch cannot hold a tab/);
  assert.equal(N.notchRefusal(600, 558, 770, 18, 200, 200, 0, 'XX', K), 'NOTCH: the corner is BL, BR, FL or FR.');
  for (const type of ['BUDR', 'SINK', 'FRIDGE']) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', notch: NOTCH }, P);
    const w = r.warnings.find((x) => x.code === N.NOTCH_REFUSED);
    assert.ok(w, `${type} took a notch`);
    assert.match(w.message, /KIT_BUD\), a wardrobe \(KIT_WARDROBE\) or a wall unit \(KIT_WUD\)/);
    assert.ok(!/[\u2013\u2014]/.test(w.message), 'no long dash in a sentence');
  }
  assert.equal(N.notchApplies({ lisp: 'KIT_BUD_FULL.lsp', carcass: { top: 'panel', back: 'full' } }), true);
  // THE WALL UNIT (the owner, 15.10.2026: "nie ma wogole mozliwosci wyciecia naroznika w szafkach wiszacych, a
  // powinno byc"): KIT_WUD is a parent since that night (KIT_NOTCH.lsp section 1), its hangers carried.
  assert.equal(N.notchApplies(getUnitType('WUD')), true);
  assert.deepEqual([...N.NOTCH_PARENT_KITS], ['KIT_BUD_FULL.lsp', 'KIT_WARDROBE_FULL.lsp', 'KIT_WUD_FULL.lsp']);
});

test('F7 · THE WALL UNIT (15.10.2026): a WUD takes the notch; its hanger cut-out steps in beside a back notch and its hanger holes step forward with the shortened side', () => {
  const base = { ...defaultParamsFor('WUD', P), unit_num: '05' };   // 600 x 720 x 400
  const parent = computeCabinet(base, P);
  assert.deepEqual(parent.panels.find((p) => p.id === 'BACK').cnc.pockets.filter((k) => k.layer === 'HANGER_HOLE').map((k) => [k.x1, k.y1, k.x2, k.y2]),
    [[0, 662, 30, 720], [570, 662, 600, 720]], 'the parent\'s two cut-outs, in the top corners');
  // A full-height back-left notch 200 x 200: the back is 400 wide, the BUL 182 deep.
  const r = computeCabinet({ ...base, notch: { corner: 'BL', w: 200, d: 200, h: 0 } }, P);
  assert.deepEqual(r.warnings.filter((w) => w.code === N.NOTCH_REFUSED), []);
  assert.deepEqual(r.derived.notch.boards, ['RETURN', 'STEP']);
  const back = r.panels.find((p) => p.id === 'BACK');
  assert.equal(back.w, 400);
  assert.deepEqual(back.cnc.pockets.filter((k) => k.layer === 'HANGER_HOLE').map((k) => [k.x1, k.y1, k.x2, k.y2]),
    [[0, 662, 30, 720], [370, 662, 400, 720]], 'both cut-outs in the shortened back\'s own top corners: the left one stepped in by nw');
  const bul = r.panels.find((p) => p.id === 'BUL');
  assert.equal(bul.w, 182, 'the side loses nd');
  assert.deepEqual(r.drills.filter((d) => d.kind === 'hanger' && d.panel === 'BUL').map((d) => [d.x, d.y]), [[161, 667], [129, 667]],
    'the hanger holes 21 and 53 off the NEW back edge (182 - 21, 182 - 53), not dropped');
  assert.deepEqual(r.drills.filter((d) => d.kind === 'hanger' && d.panel === 'BUR').map((d) => [d.x, d.y]), [[21, 667], [53, 667]], 'the other side as the parent');
  assert.equal(r.hardware.find((h) => h.role === 'hangers').qty, 2, 'still two hangers');
  // A part-height back-right notch leaves both cut-outs where they were (the notch is at the floor, the hangers at the top).
  const r2 = computeCabinet({ ...base, notch: { corner: 'BR', w: 150, d: 100, h: 300 } }, P);
  assert.deepEqual(r2.warnings.filter((w) => w.code === N.NOTCH_REFUSED), []);
  assert.deepEqual(r2.derived.notch.boards, ['RETURN', 'STEP', 'LID']);
  assert.deepEqual(r2.panels.find((p) => p.id === 'BACK').cnc.pockets.filter((k) => k.layer === 'HANGER_HOLE').map((k) => [k.x1, k.x2]), [[0, 30], [570, 600]]);
  assert.deepEqual(r2.drills.filter((d) => d.kind === 'hanger' && d.panel === 'BUR').map((d) => [d.x, d.y]), [[21, 667], [53, 667]]);
  // The pure routine: a cut-out the region does not reach stays; one it reaches steps in by nw.
  const cuts = [{ layer: 'HANGER_HOLE', x1: 0, y1: 662, x2: 30, y2: 720 }, { layer: 'HANGER_HOLE', x1: 570, y1: 662, x2: 600, y2: 720 }, { layer: 'PUZZLE_SOCKET', x1: 0, y1: 0, x2: 10, y2: 10 }];
  assert.deepEqual(N.notchHangerCutouts(cuts, 'HANGER_HOLE', 600, 720, 200, 720, 'x0y0').map((k) => [k.x1, k.x2]), [[200, 230], [570, 600]]);
  assert.deepEqual(N.notchHangerCutouts(cuts, 'HANGER_HOLE', 600, 720, 200, 300, 'x1y0').map((k) => [k.x1, k.x2]), [[0, 30], [570, 600]], 'a notch 300 high does not reach a cut-out at 662');
  assert.deepEqual(N.notchHangerCutouts(cuts, 'HANGER_HOLE', 600, 720, 200, 700, 'x1y0').map((k) => [k.x1, k.x2]), [[0, 30], [370, 400]], 'one 700 high does');
  assert.deepEqual(N.notchHangerCutouts(cuts, null, 600, 720, 200, 720, 'x0y0'), [], 'no hanger layer: nothing to carry');
});

test('F7 · D8: a partition the notch would cross is refused, naming it', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 1000,
    sections: [{ items: [{ id: 'p1', kind: 'partition', x_mm: 150 }] }],
    notch: { corner: 'BL', w: 200, d: 200, h: 0 },
  }, P);
  const vpart = r.panels.find((p) => p.part === 'VPART');
  assert.ok(vpart, 'the partition was not cut');
  const w = r.warnings.find((x) => x.code === N.NOTCH_REFUSED);
  assert.ok(w, 'a partition through the notch was not refused');
  assert.equal(w.panel, vpart.id);
  assert.match(w.message, /stands where the notch and its box go/);
});

test('F7 · Check #28: the engine\'s refusal, in red, in its own words', () => {
  const c = CHECKS.find((x) => x.n === 28);
  assert.deepEqual(c, { n: 28, level: 'red', label: 'Corner notch refused' });
  const params = { ...BUD, notch: { corner: 'FL', w: 200, d: 200, h: 0 } };
  const result = computeCabinet(params, P);
  const unit = { id: 'u1', type: 'BUD', params, position: { wall: 0, x_mm: 0 } };
  const found = runChecks({ entries: [{ unit, result }], profile: P }).filter((f) => f.check === 28);
  assert.equal(found.length, 1, 'Check #28 did not fire');
  assert.match(found[0].message, /hinge drilling of BUL falls in the notch/);
  // …and a notch that is cut raises nothing.
  const ok = computeCabinet({ ...BUD, notch: NOTCH }, P);
  const quiet = runChecks({ entries: [{ unit: { ...unit, params: { ...BUD, notch: NOTCH } }, result: ok }], profile: P })
    .filter((f) => f.check === 28);
  assert.equal(quiet.length, 0);
});

// ═══ THE GOLDENS ═══════════════════════════════════════════════════════════

test('F7 · golden-notch.json is the cut, byte for byte; the six old goldens cannot reach it', () => {
  const file = JSON.parse(read('fixtures/golden-notch.json'));
  assert.deepEqual(file.params.notch, NOTCH);
  assert.equal(file.params.shelves, 1);
  assert.deepEqual(goldenOf(file.params, P), file.expected);
  // FROZEN 1: the six, byte-identical (no default carries `notch`).
  const base = JSON.parse(read('verify/t70/goldens-base.json'));
  const head = dump();
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    assert.equal(head[id].sha256, base[id].sha256, id);
    assert.equal(defaultParamsFor(id, P).notch, undefined, `${id} carries a notch by default`);
  }
  // The classifier names it in F7's own fragment (one file per F, merged).
  assert.match(read('scripts/t75-classify.d/f07.mjs'), /notch: \{\n\s+what: 'a corner notch on the unit/);
  assert.match(read('scripts/t75-classify.d/f07.mjs'), /'src\/engine\/notch\.js': \{/);
});

// ═══ THE DRAWING SET READS THE CUT (engine/drawings is read-only: nothing new) ═

test('F7 · the T71 drawings: the part detail draws the L, the cut list lists the box, the card builds', () => {
  const top = panelOf(cut, 'TOP');
  const detail = partDetailDrawing(top, { drills: cut.drills, profile: P });
  assert.ok(detail, 'no part detail for the notched TOP');
  const json = JSON.stringify(detail);
  assert.ok(json.includes('[200,200]') || json.includes('200,200'), 'the L\'s re-entrant corner is not on the drawing');
  const rows = cutRows(cut);
  assert.deepEqual(rows.carcass.filter((r) => /NOTCH-/.test(r.part)).map((r) => [r.id, r.w, r.h]), [['RETURN', 200, 770], ['STEP', 200, 770]]);
  assert.ok(buildUnitCard(cut, { unitNum: '01', frontType: 'S', profile: P }), 'the unit card did not build');
});

test('F7 · the CNC export: the L outline and the dog-bone circle reach the DXF, the box boards as plain outlines', () => {
  const files = buildUnitDxfFiles(cut, P);
  const topFile = files.find((f) => f.panelId === 'TOP');
  assert.ok(topFile, 'no DXF for the notched TOP');
  const circles = topFile.entities.filter((e) => e.layer === P.puzzle.layers.dogbone && /circle/i.test(e.type || e.kind || ''));
  assert.ok(circles.some((c) => Math.abs((c.r ?? c.radius ?? (c.d / 2)) - 4) < 1e-6), 'the notch dog bone is not a circle of the cutter\'s radius');
  for (const id of ['RETURN', 'STEP']) assert.ok(files.some((f) => f.panelId === id), `${id} has no DXF`);
  assert.equal(files.find((f) => f.panelId === 'BUL').dxf.includes('PUZZLE_DOG_BONES'), false, 'BUL kept its back-edge dog bones');
});

// ═══ THE 3-D CUTS THE SAME CORNER ══════════════════════════════════════════

test('F7 · the 3-D: the solid is cut at the corner the engine states', () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(N.cutNotchCorner(sq, 10, 10, { fc: 'x0y0', nw: 4, nh: 3 }), [[10, 0], [10, 10], [0, 10], [0, 3], [4, 3], [4, 0]]);
  assert.deepEqual(N.cutNotchCorner(sq, 10, 10, { fc: 'x1y1', nw: 4, nh: 3 }), [[0, 0], [10, 0], [10, 7], [6, 7], [6, 10], [0, 10]]);
  assert.deepEqual(N.notchCornerOfOutline([[0, 0], [10, 0], [10, 7], [6, 7], [6, 10], [0, 10]], 10, 10), { fc: 'x1y1', nw: 4, nh: 3 });
  // A shelf's only feature is its notch, and it is still a shape (not a box).
  const shelf = panelOf(cut, 'SHELF-1');
  const { solid } = panelSolids(shelf, P.puzzle.layers, P, cut.drills);
  assert.ok(solid, 'the notched shelf rendered as a plain box');
  solid.computeBoundingBox();
  assert.ok(solid.attributes.position.count > 0);
  const plain = panelOf(parent, 'SHELF-1');
  assert.equal(panelSolids(plain, P.puzzle.layers, P, parent.drills).solid, null, 'an uncut shelf is still a box');
  const src = read('src/3d/panelSolid.js');
  assert.match(src, /import \{ cutNotchCorner \} from '\.\.\/engine\/notch\.js'/);
  assert.match(src, /const shaped = notch \? cutNotchCorner\(outline, w, h, notch\) : outline;/);
  assert.match(src, /drills\.filter\(\(d\) => d\.kind !== 'notch_dogbone'\)/, 'the dog bone in the waste is not bored');
});

// ═══ THE STORE: ONE ACTION, ONE UNDO STEP, SAVED WITH THE UNIT ═════════════

function aKitchen() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD');
  return S().units[0].id;
}
const unitOf = (id) => S().units.find((u) => u.id === id);

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

test('F7 · setUnitNotch: kept when the engine cuts it, refused in its words when it does not, one undo step', () => {
  const id = aKitchen();
  flushHistory();
  useHistoryStore.getState().clear();
  const res = S().setUnitNotch(id, { corner: 'BL', w: 200, d: 200, h: 'x' });
  flushHistory();
  assert.equal(res.ok, true, res.said);
  assert.deepEqual(unitOf(id).params.notch, { corner: 'BL', w: 200, d: 200, h: 0 });
  const r = S().unitResult(id);
  assert.equal(r.panels.find((p) => p.id === 'BUL').w, 340);
  assert.ok(r.panels.some((p) => p.id === 'RETURN'));
  // ONE undo step takes it off again.
  assert.equal(useHistoryStore.getState().undo(), true);
  assert.equal(unitOf(id).params.notch, undefined);
  assert.equal(useHistoryStore.getState().redo(), true);
  assert.equal(unitOf(id).params.notch.corner, 'BL');
  // Refused: not kept, the sentence is the engine's.
  const before = unitOf(id).params.notch;
  const no = S().setUnitNotch(id, { corner: 'BL', w: 500, d: 200, h: 0 });
  assert.equal(no.ok, false);
  assert.match(no.said, /take the TOP and the BOTTOM across/);
  assert.deepEqual(unitOf(id).params.notch, before, 'a refused notch was kept');
  // Removed with nothing.
  assert.equal(S().setUnitNotch(id, null).ok, true);
  assert.equal(unitOf(id).params.notch, undefined);
});

test('F7 · save and reload: the notch is a unit param and the reloaded unit cuts it again', () => {
  const id = aKitchen();
  S().setUnitNotch(id, { corner: 'BR', w: 150, d: 120, h: 400 });
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  const before = S().unitResult(id).csvLines;
  S().newProject();
  S().loadProject(saved.project, saved.units);
  const back = S().units.find((u) => u.id === id);
  assert.deepEqual(back.params.notch, { corner: 'BR', w: 150, d: 120, h: 400 });
  assert.deepEqual(S().unitResult(id).csvLines, before);
  assert.ok(before.some((l) => l.startsWith('01,LID,') || /,LID,/.test(l)));
  // A project saved before tonight has no notch and cuts what it cut.
  S().setUnitNotch(id, null);
  assert.ok(!S().unitResult(id).panels.some((p) => p.role === 'notch_box'));
});

// ═══ THE UI, THE WAY THE CLIENT CLICKS ═════════════════════════════════════

test('F7 · the scene lights the four plan corners, and a click opens the small window at the click', () => {
  assert.deepEqual(notchCornerSpots(600, 558), [
    { corner: 'BL', x: 0, z: 0 }, { corner: 'BR', x: 600, z: 0 },
    { corner: 'FL', x: 0, z: 558 }, { corner: 'FR', x: 600, z: 558 },
  ]);
  U().startNotchPick('u9');
  assert.equal(U().notchPick, 'u9');
  askNotchCorner('u9', 'BR', { x: 300, y: 200 });
  assert.equal(U().modal, 'notch');
  assert.equal(U().modalArgs.corner, 'BR');
  assert.equal(U().modalArgs.unitId, 'u9');
  assert.ok(U().modalArgs.anchor, 'the window is held to the click');
  U().closeModal();
  U().stopNotchPick();
  assert.equal(U().notchPick, null);
  assert.deepEqual(MODAL_KINDS.notch, { about: 'object', label: 'Cut corner' });
  const corners = read('src/3d/NotchCorners.jsx');
  assert.match(corners, /userData=\{\{ ccNotchCorner: sp\.corner, ccUnitId: unitId \}\}/);
  assert.match(corners, /if \(!unitId \|\| pick !== unitId\) return null;/);
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /<NotchCorners unitId=\{unit\.id\} width=\{W\} depth=\{D\} height=\{H\}/);
});

test('F7 · PRO: CUT CORNER in the right panel, the window has WIDTH, DEPTH, HEIGHT and Enter cuts', () => {
  const src = read('src/components/RightPanel.jsx');
  assert.match(src, /\{notchApplies\(type\) && <NotchRow unit=\{unit\} \/>\}/);
  assert.match(src, /data-testid="cut-corner"/);
  assert.match(src, /'CUT CORNER'/);
  assert.match(src, /data-testid="remove-corner-cut"/);
  assert.match(src, /<NotchModal \/>/);
  assert.match(src, /<Modal name="notch" title=\{`CUT CORNER \$\{args\.corner\}`\} anchor=\{args\.anchor \|\| null\}/);
  for (const f of ['WIDTH', 'DEPTH', 'HEIGHT']) assert.match(src, new RegExp(`field\\('${f}'`));
  assert.match(src, /onSubmit=\{\(e\) => \{ e\.preventDefault\(\); apply\(\); \}\}/, 'Enter applies');
  assert.match(src, /setUnitNotch\(args\.unitId, \{/);
  assert.match(src, /'full'/, 'HEIGHT says full for 0');
  // Licensed in the freeze with the owner's words.
  // AMENDED BY T75 F9: RightPanel's licence names F9 (the face's name) and F7 together.
  // AMENDED AT INTEGRATION (T75 F4/F11, the Worktop row the walk asked for): a newer reason
  // may stand before F9's; F9 and F7 are still there, in that order.
  assert.match(read('test/turn59-f1-the-switch.test.js'), /'src\/components\/RightPanel\.jsx':\n(?:\s+(?:\+ )?'T75 F[^\n]*\n)*?\s+(?:\+ )?'T75 F9[^\n]*\n\s+\+ 'T75 F7/);
});

test('F7 · retail: the SIZE step carries CUT CORNER, the window is retail\'s own, the adapter speaks the store', () => {
  const options = read('src/retail/design/Options.jsx');
  const panel = options.slice(options.indexOf('function SizePanel'), options.indexOf('TOMBSTONE: `LayoutPanel`'));
  assert.match(panel, /\{A\.canCutCorner\(unit\.id\) && \(/);
  assert.match(panel, /function CutCornerRow/);
  assert.match(panel, /A\.toggleCutCorner\(unitId\)/);
  assert.match(panel, /A\.removeCornerCut\(unitId\)/);
  assert.match(read('src/retail/design/Editors.jsx'), /\{is\('notch'\) && <NotchAsk args=\{modalArgs\} \/>\}/);
  const ask = read('src/retail/design/detail/NotchAsk.jsx');
  assert.match(ask, /name="notch"/);
  assert.match(ask, /onClose=\{A\.dismissCutCorner\}/);
  // The road, through the adapter: a wardrobe, its corners lit, the cut, the refusal.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = A.addFirstWardrobe();
  assert.equal(A.canCutCorner(a), true);
  assert.equal(A.toggleCutCorner(a), true);
  assert.equal(A.cuttingCorner(a), true);
  assert.deepEqual(A.notchDefaults(), { w: 200, d: 200, h: 0 });
  const no = A.cutCorner(a, 'BL', { w: 5000, d: 200, h: 0 });
  assert.equal(no.ok, false);
  assert.match(no.said, /NOTCH:/);
  const yes = A.cutCorner(a, 'BL', { w: 200, d: 200, h: 0 });
  assert.equal(yes.ok, true, yes.said);
  assert.equal(A.cuttingCorner(a), false, 'the corners stay lit after the cut');
  assert.equal(A.notchOfUnit(a).corner, 'BL');
  assert.ok(S().unitResult(a).panels.some((p) => p.id === 'RETURN'));
  A.removeCornerCut(a);
  assert.equal(A.notchOfUnit(a), null);
  A.dismissCutCorner();
  assert.equal(U().notchPick, null);
});
