/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F2 . THE KIT: MIRROR_CABINET (engine/mirrorCabinet.js, cabinet.js `top: 'mirror'`)
//
// CLAUDE.md T83 F2: *"`engine/cabinet.js` mirrors KIT_MIRROR.lsp byte for
// byte; `engine/mirrorCabinet.js` holds the arithmetic the kit shares"*, and
// its tests: *"the default cabinet gives three doors 330 / 480 / 330 x 1100
// less the gaps, two dividers at the stile centres, two stiles 75 x 22, four
// panels 30 reaching 237 deep, fifteen glass shelves, the bottom box, the
// back; `stile: 'none'` gives no stiles and the doors meeting over the
// dividers as WUD's; `panels` off gives the bare carcass; `mirror_doors` off
// gives 18 doors and the panels 233 deep; the weight class and hinge count
// for a 480 mirror door"*. The owner, 25.10.2026 (14:09): *"teraz
// zaprojektujmy dokladnie to co masz na rysunku szafka wiszaca"*.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadLisp } from './lisp-mini.js';
import * as MC from '../src/engine/mirrorCabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPE_ORDER, UNIT_TYPES, defaultParamsFor, getUnitType, isMirrorCabinet,
} from '../src/engine/types.js';
import { partIdForElement } from '../src/engine/partRegistry.js';
import { readinessOf } from '../src/engine/readiness.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { rectCorners } from '../src/engine/room.js';
import { unitBase, wallGapOf } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const L = loadLisp(readFileSync(`${ROOT}reference/lisp/KIT_MIRROR.lsp`, 'utf8'));
const K = MC.mirrorConstants(P);

/** A mirror cabinet as the library births it, MC01, with its own answers changed. */
function kit(extra = {}, mirror = {}) {
  const d = defaultParamsFor('MIRROR_CABINET', P);
  return { ...d, unit_num: 'MC01', ...extra, mirror: { ...d.mirror, ...mirror } };
}
const cut = (params) => computeCabinet(params, P);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const drillsOf = (r, id, kind) => r.drills.filter((d) => d.panel === id && (!kind || d.kind === kind));
const same = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} is ${b}`);

// ═══ THE LISP AND THE ENGINE, ROUTINE FOR ROUTINE ════════════════════════

// LISP nil is a JS null or an empty list; LISP T is true.
const fold = (v) => {
  if (v === null || v === undefined || v === false) return null;
  if (Array.isArray(v)) return v.length ? v.map(fold) : null;
  return v;
};
const twin = (lispName, js, ...args) => {
  const lisp = L.call(lispName, ...args.map((a) => (a === false ? null : a)));
  const mine = js(...args, K);
  assert.deepEqual(fold(mine), fold(lisp), `${lispName}(${JSON.stringify(args)})`);
  return mine;
};

test('F2 . engine/mirrorCabinet.js is KIT_MIRROR.lsp part 5, routine for routine, on every case of its NUMBERS', () => {
  const cases = [
    { W: 1350, H: 1100, on: [true, true, true, true], mirrorOn: true, boxOn: true, bays: 3, kind: 'led', kinds: null, widths: null, hands: null },
    { W: 1350, H: 1100, on: [true, true, true, true], mirrorOn: true, boxOn: true, bays: 3, kind: 'none', kinds: null, widths: [405, 480, 405], hands: null },
    { W: 1350, H: 1100, on: [false, false, false, false], mirrorOn: false, boxOn: true, bays: 3, kind: 'led', kinds: null, widths: null, hands: null },
    { W: 1350, H: 1100, on: [true, false, true, false], mirrorOn: true, boxOn: false, bays: 2, kind: 'timber', kinds: null, widths: null, hands: ['R', 'L'] },
    { W: 1350, H: 1100, on: [true, true, true, true], mirrorOn: true, boxOn: true, bays: 3, kind: 'led', kinds: ['timber', 'none'], widths: [330, 480, 405], hands: null },
    { W: 1350, H: 1100, on: [true, true, true, true], mirrorOn: true, boxOn: true, bays: 3, kind: 'led', kinds: null, widths: [330, 480, 300], hands: null },
    { W: 900, H: 700, on: [true, true, true, true], mirrorOn: true, boxOn: true, bays: 1, kind: 'led', kinds: null, widths: null, hands: null },
    { W: 1700, H: 1800, on: [true, true, false, true], mirrorOn: true, boxOn: true, bays: 3, kind: 'led', kinds: null, widths: [600, 400, 550], hands: ['L', 'R', 'R'] },
  ];
  const D = 215;
  const G = 18;
  for (const c of cases) {
    const cc = twin('mirror-carcass', (...a) => MC.mirrorCarcass(...a.slice(0, 7)), c.W, c.H, ...c.on, 30);
    const [x0, y0, Wc, Hc] = cc;
    const faceT = twin('mirror-face-t', MC.mirrorFaceT, 18, c.mirrorOn);
    twin('mirror-panel-depth', (a, b) => MC.mirrorPanelDepth(a, b), D, faceT);
    twin('mirror-panels', (...a) => MC.mirrorPanels(...a.slice(0, 9)), c.W, c.H, D, faceT, ...c.on, 30);
    twin('mirror-carcass-boards', (...a) => MC.mirrorCarcassBoards(...a.slice(0, 6)), x0, y0, Wc, Hc, D, G);
    const boxH = twin('mirror-box-h', MC.mirrorBoxH, c.boxOn);
    twin('mirror-box-lid', (...a) => MC.mirrorBoxLid(...a.slice(0, 6)), x0, y0, Wc, D, G, boxH);
    twin('mirror-box-front', MC.mirrorBoxFront, x0, y0, Wc, D, 18, boxH);
    const bf = twin('mirror-floor', (...a) => MC.mirrorFloor(...a.slice(0, 3)), y0, G, boxH);
    const bc = twin('mirror-ceiling', (...a) => MC.mirrorCeiling(...a.slice(0, 3)), y0, Hc, G);
    const yD = twin('mirror-door-y', (...a) => MC.mirrorDoorY(...a.slice(0, 2)), y0, boxH);
    const hD = twin('mirror-door-h', MC.mirrorDoorH, Hc, boxH);
    const kinds = twin('mirror-stile-kinds', (...a) => MC.mirrorStileKinds(...a.slice(0, 3)), c.bays, c.kind, c.kinds);
    twin('mirror-stiles-total', (...a) => MC.mirrorStilesTotal(...a.slice(0, 2)), kinds, 75);
    twin('mirror-widths-fit-p', MC.mirrorWidthsFitP, Wc, c.bays, c.widths, kinds, 75);
    twin('mirror-own-widths', MC.mirrorOwnWidths, Wc, c.bays, kinds, 75);
    const widths = twin('mirror-widths', MC.mirrorWidths, Wc, c.bays, c.widths, kinds, 75);
    const zones = twin('mirror-zones', (...a) => MC.mirrorZones(...a.slice(0, 4)), x0, widths, kinds, 75);
    const hands = twin('mirror-hands', (...a) => MC.mirrorHands(...a.slice(0, 2)), c.bays, c.hands);
    const doors = twin('mirror-doors', MC.mirrorDoors, zones, yD, hD, D, faceT, hands);
    twin('mirror-stiles', (...a) => MC.mirrorStiles(...a.slice(0, 6)), zones, kinds, yD, hD, D, faceT);
    const dvs = twin('mirror-dividers', (...a) => MC.mirrorDividers(...a.slice(0, 5)), zones, bf, bc, D, G);
    const bays = twin('mirror-bays', (...a) => MC.mirrorBays(...a.slice(0, 4)), x0, Wc, G, dvs);
    twin('mirror-widths-refusal', MC.mirrorWidthsRefusal, 'MC01', Wc, c.bays, c.widths, kinds, 75);
    for (const door of doors) {
      const kg = twin('mirror-door-kg', MC.mirrorDoorKg, door[4], door[5], 18, c.mirrorOn);
      twin('mirror-hinge-band', MC.mirrorHingeBand, door[5], kg);
      const n = twin('mirror-hinge-count', MC.mirrorHingeCount, door[5], kg);
      const cups = twin('mirror-cups', MC.mirrorCups, door[5], n);
      const [board, face] = twin('mirror-hinge-board', (...a) => MC.mirrorHingeBoard(...a.slice(0, 3)), door[0], c.bays, door[7]);
      const span = twin('mirror-board-span', (...a) => MC.mirrorBoardSpan(...a.slice(0, 5)), board, x0, Wc, G, dvs);
      const ov = twin('mirror-overlay', (...a) => MC.mirrorOverlay(...a.slice(0, 4)), door, door[7], span[0], span[1]);
      twin('mirror-reach-note', (...a) => MC.mirrorReachNote(...a.slice(0, 4)), 'MC01', door[0], board, ov);
      twin('mirror-plate-ys', MC.mirrorPlateYs, cups, yD, y0);
      twin('mirror-plate-x', MC.mirrorPlateX, board, face, D - G);
    }
    const ys = twin('mirror-shelf-ys', (...a) => MC.mirrorShelfYs(...a.slice(0, 3)), bf, bc, 5);
    for (const backOn of [true, false]) {
      twin('mirror-shelf-depth', MC.mirrorShelfDepth, D, G, backOn);
      for (const b of bays) twin('mirror-shelf', MC.mirrorShelf, b, ys[2], D, G, backOn);
    }
    for (const y of [bf, bc - 6, bc - 5, ys[0]]) twin('mirror-shelf-fits-p', MC.mirrorShelfFitsP, y, bf, bc);
    twin('mirror-pin-ys', MC.mirrorPinYs, [...ys, ...ys], bf, bc - bf);
    twin('mirror-pin-xs', MC.mirrorPinXs, D - G);
    twin('mirror-back-panes', MC.mirrorBackPanes, bays, bf, bc, G);
    for (const side of ['BUL', 'BUR']) twin('mirror-hanger-holes', MC.mirrorHangerHoles, side, D - G, Hc);
    const cuts = twin('mirror-hanger-cuts', MC.mirrorHangerCuts, Wc, Hc);
    for (const [x, y] of [[9, Hc - 50], [Wc - 9, Hc - 50], [9, Hc - 95], [40, Hc - 10]]) {
      twin('mirror-in-cut-p', (...a) => MC.mirrorInCutP(...a.slice(0, 3)), x, y, cuts);
    }
    twin('mirror-led-under-length', (...a) => MC.mirrorLedUnderLength(...a.slice(0, 2)), Wc, G);
    twin('mirror-led-inside-length', (...a) => MC.mirrorLedInsideLength(...a.slice(0, 2)), bf, bc);
    twin('mirror-led-inside-z', MC.mirrorLedInsideZ, D);
    twin('mirror-proud', (...a) => MC.mirrorProud(...a.slice(0, 2)), D, 155);
    twin('mirror-face-proud', (...a) => MC.mirrorFaceProud(...a.slice(0, 3)), D, faceT, 155);
  }
  for (const v of [45, 45.5, 1290, 0.25]) assert.equal(MC.mirrorMm(v), L.call('mirror-mm', v));
  assert.equal(MC.mirrorListMm([330, 480, 300]), L.call('mirror-list-mm', [330, 480, 300]));
});

test('F2 . the constants the engine computes with are the LISP\'s (part 3 and part 4)', () => {
  const pairs = [
    ['gap', 'mirrorGap'], ['topDemand', 'mirrorTopDemand'], ['cupBottom', 'mirrorCupBottom'],
    ['cupUpperFromTop', 'mirrorCupUpperFromTop'], ['cupTopFromTop', 'mirrorCupTopFromTop'], ['plateFromFront', 'mirrorPlateFromFront'],
    ['platePair', 'mirrorPlatePair'], ['pinColumn', 'mirrorPinColumn'], ['pinD', 'mirrorPinD'], ['pinCluster', 'mirrorPinCluster'],
    ['shelfWidthClear', 'mirrorShelfWidthClear'], ['shelfFrontClear', 'mirrorShelfFrontClear'], ['hangerFromBack', 'mirrorHangerFromBack'],
    ['hangerFromTop', 'mirrorHangerFromTop'], ['hangerHoleD', 'mirrorHangerHoleD'], ['hangerCutW', 'mirrorHangerCutW'],
    ['hangerCutH', 'mirrorHangerCutH'], ['blumBands', 'mirrorBlumBands'], ['blumBeyond', 'mirrorBlumBeyond'],
    ['doorWidths', 'mirrorDoorWidths'], ['doorBoard', 'mirrorDoorBoard'], ['mirrorT', 'mirrorMirrorT'], ['glassShelf', 'mirrorGlassShelf'],
    ['bottomBox', 'mirrorBottomBox'], ['boardKgM3', 'mirrorBoardKgM3'], ['mirrorKgM2', 'mirrorMirrorKgM2'],
  ];
  for (const [key, name] of pairs) assert.deepEqual(K[key], L.call(name), `${key} is ${name}`);
});

// ═══ THE TYPE ════════════════════════════════════════════════════════════

test('F2 . MIRROR_CABINET: the bathroom family beside the vanity, hung, MC01, born with the drawing\'s answers', () => {
  const t = UNIT_TYPES.MIRROR_CABINET;
  assert.equal(getUnitType('MIRROR_CABINET'), t);
  assert.deepEqual([t.family, t.mount, t.lisp, t.label, t.defaultsKey, t.heightGroup, t.ownDepth, t.legs, t.hangers],
    ['bathroom', 'wall', 'KIT_MIRROR.lsp', 'Mirror cabinet', 'mirror.defaults', null, true, false, false]);
  assert.deepEqual(t.carcass, { top: 'mirror', sides: 'none', bottom: 'none', back: 'none' });
  assert.ok(Object.values(t.supports).every((v) => v === false), 'no house door, shelf or drawer: its own');
  assert.ok(isMirrorCabinet('MIRROR_CABINET') && !isMirrorCabinet('WUD') && !isMirrorCabinet('VANITY3'));
  assert.equal(UNIT_NUM_PREFIX.MIRROR_CABINET, 'MC');
  assert.equal(UNIT_TYPE_ORDER[UNIT_TYPE_ORDER.indexOf('VANITY4') + 1], 'MIRROR_CABINET', 'beside the vanity');
  for (const id of UNIT_TYPE_ORDER.filter((x) => x !== 'MIRROR_CABINET')) assert.ok(!UNIT_TYPES[id].mirrorCabinet, `${id} carries no mirror key`);
  const d = defaultParamsFor('MIRROR_CABINET', P);
  assert.deepEqual([d.width, d.height, d.depth, d.mount_height], [1350, 1100, 215, 1250]);
  assert.deepEqual(d.mirror, {
    bays: 3, stile: 'led', stile_width_mm: 75, panels: { L: true, R: true, top: true, bottom: true }, panel_t: 30,
    mirror_doors: true, mirror_back: false, shelves_per_bay: 5, led_under: true, led_inside: true, bottom_box: true,
  });
  assert.ok(!('door_widths' in d.mirror), 'no width typed at birth: the kit\'s own until the panel types them (D6)');
  assert.ok(!('recess_mm' in d), 'on the wall at birth (D17)');
  for (const id of ['WUD', 'VANITY3', 'BUD']) assert.ok(!('mirror' in defaultParamsFor(id, P)), `${id} is born without the key`);
});

// ═══ CLAUDE.md T83 F2's LIST, ON THE DEFAULT CABINET ═════════════════════

test('F2 . the default cabinet: three doors 330 / 480 / 330 less the gaps, 937 high, 22 thick', () => {
  const r = cut(kit());
  const doors = r.panels.filter((p) => p.part === 'FRONT');
  assert.deepEqual(doors.map((p) => p.id), ['MC01-F1', 'MC01-F2', 'MC01-F3']);
  assert.deepEqual(doors.map((p) => [p.w, p.h, p.thickness, p.box.d]), [[327, 937, 18, 22], [477, 937, 18, 22], [327, 937, 18, 22]]);
  assert.deepEqual(doors.map((p) => [p.box.x, p.box.y, p.box.z]), [[31.5, 130, 215], [436.5, 130, 215], [991.5, 130, 215]]);
  assert.deepEqual(doors.map((p) => p.meta.hinge), ['L', 'L', 'R']);
  assert.deepEqual(doors.map((p) => p.meta.hingeOn), ['BUL', 'DIVIDER-1', 'BUR']);
  assert.ok(doors.every((p) => p.role === 'mirror_door' && p.material_role === 'front' && p.finish_exposed));
  // The mirror, the whole face, outside (T33's door mirror: the room draws it), 4 thick and bought by the m2.
  assert.deepEqual(doors[1].meta.mirror, { face: 'outside', w: 477, h: 937, margin: 0, t: 4, area_m2: 0.4469 });
  assert.deepEqual(r.derived.mirror.doorWidths, [330, 480, 330]);
  assert.equal(r.derived.mirror.widthsRefused, false);
  // 330 / 75 / 480 / 75 / 330 fill the carcass 1290 between the panels 30 (the drawing, elevation 34).
  assert.deepEqual(r.derived.mirror.zones.map((z) => [z.kind, z.to - z.from]),
    [['DOOR', 330], ['STILE', 75], ['DOOR', 480], ['STILE', 75], ['DOOR', 330]]);
  assert.deepEqual(r.derived.mirror.carcass, { x: 30, y: 30, w: 1290, h: 1040, d: 215 });
});

test('F2 . the default cabinet: two dividers at the stile centres, two stiles 75 x 22 flush with the mirror', () => {
  const r = cut(kit());
  const dvs = r.panels.filter((p) => p.part === 'VPART');
  assert.deepEqual(dvs.map((p) => p.id), ['DIVIDER-1', 'DIVIDER-2']);
  assert.deepEqual(dvs.map((p) => p.box.x + p.box.w / 2), [397.5, 952.5], 'the stile centres: 360 + 37.5 and 915 + 37.5');
  assert.deepEqual(dvs.map((p) => [p.box.y, p.box.h, p.box.z, p.box.d]), [[130, 922, 18, 197], [130, 922, 18, 197]]);
  assert.ok(dvs.every((p) => p.meta.fullHeight && p.meta.setback === 0), 'a divider that carries doors (T21 F12)');
  const stiles = r.panels.filter((p) => p.part === 'MIRROR-STILE');
  assert.deepEqual(stiles.map((p) => [p.id, p.w, p.h, p.thickness, p.box.x, p.box.z + p.box.d]),
    [['STILE-1', 75, 937, 22, 360, 237], ['STILE-2', 75, 937, 22, 915, 237]]);
  const face = byId(r, 'MC01-F1').box.z + byId(r, 'MC01-F1').box.d;
  assert.ok(stiles.every((s) => s.box.z + s.box.d === face), '"na rowno z drzwiami, nie wcisniete"');
  // A LED stile is bought: a made-to-measure LED light panel, 4000 K, no CNC, off the cut list.
  for (const s of stiles) {
    assert.equal(s.role, 'led_stile');
    assert.equal(s.cnc, null);
    assert.equal(readinessOf(s), 'bought');
    assert.equal(s.material_role, 'bought');
    assert.deepEqual(s.meta.mirrorCabinet, { role: 'stile', kind: 'led', divider: s.id.replace('STILE', 'DIVIDER'), kelvin: 4000, madeToMeasure: true });
  }
  assert.equal(r.derived.mirror.led.stiles, 2);
});

test('F2 . the default cabinet: four panels 30 reaching 237 deep, the carcass inside them', () => {
  const r = cut(kit());
  const panels = r.panels.filter((p) => p.part === 'MIRROR-PANEL');
  assert.deepEqual(panels.map((p) => [p.id, p.thickness, p.box.z, p.box.d]),
    [['PANEL-L', 30, 0, 237], ['PANEL-R', 30, 0, 237], ['PANEL-TOP', 30, 0, 237], ['PANEL-BOTTOM', 30, 0, 237]]);
  assert.deepEqual(panels.map((p) => [p.w, p.h]), [[237, 1100], [237, 1100], [1290, 237], [1290, 237]]);
  assert.deepEqual(byId(r, 'PANEL-TOP').box, { x: 30, y: 1070, z: 0, w: 1290, h: 30, d: 237 }, 'between the side panels');
  assert.ok(panels.every((p) => p.material_role === 'front' && p.finish_exposed && readinessOf(p) === 'geometry'),
    'the front finish; fixed from inside, an outline only');
  // The carcass, the parent's five boards inside them.
  assert.deepEqual(['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'].map((id) => [byId(r, id).w, byId(r, id).h]),
    [[197, 1040], [197, 1040], [1254, 197], [1254, 197], [1290, 1040]]);
  assert.deepEqual(byId(r, 'BACK').box, { x: 30, y: 30, z: 0, w: 1290, h: 1040, d: 18 });
  assert.equal(r.derived.mirror.panelDepth, 237);
});

test('F2 . the default cabinet: fifteen glass shelves 6 mm, five a bay, bought, on the house\'s pins', () => {
  const r = cut(kit());
  const glass = r.panels.filter((p) => p.part === 'SHELF');
  assert.equal(glass.length, 15);
  assert.ok(glass.every((p) => p.thickness === 6 && p.h === 177 && p.cnc === null && readinessOf(p) === 'bought'
    && p.meta.glassShelf.t === 6 && p.meta.variant === 'adjustable'));
  assert.deepEqual([...new Set(glass.map((p) => p.w))], [336.5, 533]);
  assert.deepEqual([0, 1, 2].map((z) => glass.filter((p) => p.meta.zone === z).length), [5, 5, 5]);
  // Three rows a shelf, 70 from the boards' front and back edges, 7.5 on the house's layer.
  for (const id of ['BUL', 'DIVIDER-1', 'DIVIDER-2', 'BUR']) {
    const pins = drillsOf(r, id, 'shelf');
    assert.equal(pins.length, 30, `${id}: 5 shelves x 3 rows x 2 columns, a divider's two bays on one row`);
    assert.deepEqual([...new Set(pins.map((d) => d.x))], [70, 127]);
    assert.ok(pins.every((d) => d.d === 7.5 && d.layer === 'SHELVES_7_5MM'));
  }
  // Off the cut list and the piece count: glass is ordered, never cut.
  assert.equal(r.csvLines.length, 16);
  assert.ok(!r.csvLines.some((l) => /,SHELF-|,STILE-/.test(l)));
  assert.equal(r.totals.pieces_total, 16);
});

test('F2 . the default cabinet: the bottom box (BOX-TOP, BOX-FRONT) and the back', () => {
  const r = cut(kit());
  const lid = byId(r, 'BOX-TOP');
  assert.deepEqual([lid.part, lid.w, lid.h, lid.box.y + lid.box.h], ['FIXED', 1254, 197, 130]);
  assert.equal(lid.meta.variant, 'fixed');
  const strip = byId(r, 'BOX-FRONT');
  assert.deepEqual([strip.part, strip.role, strip.material_role, strip.w, strip.h, strip.thickness], ['FALSE-FRONT', 'false_front', 'front', 1287, 97, 18]);
  assert.deepEqual(strip.box, { x: 31.5, y: 30, z: 215, w: 1287, h: 97, d: 18 });
  assert.equal(byId(r, 'MC01-F1').box.y - (strip.box.y + strip.box.h), 3, 'the strip 3 under the doors');
  // The box's FIX board takes the house's set: screws through the sides, the BACK's row; the dividers stand on it.
  assert.equal(drillsOf(r, 'BUL', 'shelf_screw').length, 2);
  assert.equal(drillsOf(r, 'BUR', 'shelf_screw').length, 2);
  assert.ok(drillsOf(r, 'BUL', 'shelf_screw').every((d) => d.y === 91), 'on the board\'s centre line: 112 + 9 - 30');
  assert.equal(drillsOf(r, 'BACK', 'shelf_back_screw').length, 4);
  assert.deepEqual(r.derived.dividerJoints.map((j) => [j.divider, j.end, j.receiver, j.screws]), [
    ['DIVIDER-1', 'foot', 'BOX-TOP', false], ['DIVIDER-1', 'head', 'TOP', true],
    ['DIVIDER-2', 'foot', 'BOX-TOP', false], ['DIVIDER-2', 'head', 'TOP', true]]);
  assert.equal(drillsOf(r, 'BACK', 'partition_back_screw').length, 8, 'each divider screwed through the BACK');
  // The back's hanger cut-outs and the sides' hanger holes, the parent's.
  const back = byId(r, 'BACK');
  assert.deepEqual(back.cnc.pockets.filter((p) => p.layer === 'HANGER_HOLE').map((p) => [p.x1, p.y1, p.x2, p.y2]),
    [[0, 982, 30, 1040], [1260, 982, 1290, 1040]]);
  assert.deepEqual(drillsOf(r, 'BUL', 'hanger').map((d) => [d.x, d.y]), [[176, 987], [144, 987]]);
  // D18: no hole in a cut-out (the parent's two end screws under the top stand in them).
  const inCut = drillsOf(r, 'BACK').filter((d) => MC.mirrorInCutP(d.x, d.y, MC.mirrorHangerCuts(1290, 1040, K)));
  assert.deepEqual(inCut, []);
  assert.equal(drillsOf(r, 'BACK', 'screw').length, 12, 'the parent\'s 14 less the two the cut-outs take');
  assert.deepEqual(drillsOf(r, 'BUR', 'hanger').map((d) => [d.x, d.y]), [[21, 987], [53, 987]]);
  assert.deepEqual(back.meta.mirrorCabinet, { role: 'carcass', clickAsks: 'mirror-back' });
  assert.ok(!back.meta.mirrorBack, 'no mirror on the back unless asked');
  assert.deepEqual(r.derived.mirror.bottomBox.driver.box, { x: 48, y: 48, z: 18, w: 1254, h: 64, d: 197 });
});

test('F2 . stile none: no stiles, the doors meet over the dividers as WUD\'s pair, 3 apart', () => {
  const r = cut(kit({}, { stile: 'none', door_widths: [405, 480, 405] }));
  assert.equal(r.panels.filter((p) => p.part === 'MIRROR-STILE').length, 0);
  const doors = r.panels.filter((p) => p.part === 'FRONT');
  assert.deepEqual(doors.map((p) => [p.box.x, p.w]), [[31.5, 402], [436.5, 477], [916.5, 402]]);
  const dvs = r.panels.filter((p) => p.part === 'VPART');
  assert.deepEqual(dvs.map((p) => p.box.x + p.box.w / 2), [435, 915], 'on the joint of the two doors');
  assert.equal(doors[1].box.x - (doors[0].box.x + doors[0].w), 3);
  assert.equal(r.warnings.filter((w) => w.code === 'MIRROR_DOOR_WIDTHS').length, 0);
  // Nothing typed and no stiles: the kit's own widths, the carcass shared, 430 each.
  assert.deepEqual(cut(kit({}, { stile: 'none' })).derived.mirror.doorWidths, [430, 430, 430]);
  // A timber stile is a cut board in the carcass finish.
  const t = byId(cut(kit({}, { stile: 'timber' })), 'STILE-1');
  assert.deepEqual([t.role, t.material_role, readinessOf(t), t.cnc.outline.length > 0], ['mirror_stile', 'board', 'cut', true]);
  // One kind a divider: timber and none.
  const mixed = cut(kit({}, { stiles: ['timber', 'none'], door_widths: [330, 480, 405] }));
  assert.deepEqual(mixed.panels.filter((p) => p.part === 'MIRROR-STILE').map((p) => [p.id, p.role]), [['STILE-1', 'mirror_stile']]);
});

test('F2 . panels off: the bare carcass, the cabinet\'s own size, the kit\'s own widths', () => {
  const r = cut(kit({}, { panels: { L: false, R: false, top: false, bottom: false } }));
  assert.equal(r.panels.filter((p) => p.part === 'MIRROR-PANEL').length, 0);
  assert.deepEqual(r.derived.mirror.carcass, { x: 0, y: 0, w: 1350, h: 1100, d: 215 });
  assert.deepEqual(byId(r, 'BUL').box, { x: 0, y: 0, z: 18, w: 18, h: 1100, d: 197 });
  assert.deepEqual(r.derived.mirror.doorWidths, [400, 400, 400], 'the profile\'s 1140 + 150 make 1290, not 1350');
  // The bottom panel alone off: the top panel between the sides, the carcass on the cabinet's floor.
  const nb = cut(kit({}, { panels: { L: true, R: true, top: true, bottom: false } }));
  assert.deepEqual([nb.derived.mirror.carcass.y, nb.derived.mirror.carcass.h], [0, 1070]);
  assert.equal(nb.derived.mirror.led.under.face, 'BOTTOM', 'the LED under on the BOTTOM\'s underside');
});

test('F2 . mirror doors off: 18 doors, the panels 233 deep, no mirror on them', () => {
  const r = cut(kit({}, { mirror_doors: false }));
  const doors = r.panels.filter((p) => p.part === 'FRONT');
  assert.ok(doors.every((p) => p.box.d === 18 && p.thickness === 18 && !p.meta.mirror));
  assert.ok(r.panels.filter((p) => p.part === 'MIRROR-PANEL').every((p) => p.box.d === 233));
  assert.ok(r.panels.filter((p) => p.part === 'MIRROR-STILE').every((p) => p.box.d === 18 && p.thickness === 18));
  same(r.derived.mirror.doors[1].weightKg, 5.6316);
  assert.equal(r.derived.mirror.mirrorArea.doors_m2, 0);
});

test('F2 . a 480 mirror door: 10.101 kg, the 1600 / 13 band, three hinges at WUD\'s cups, plates on DIVIDER-1', () => {
  const r = cut(kit());
  const door = byId(r, 'MC01-F2');
  assert.equal(door.meta.mirrorCabinet.weightKg, 10.101);
  assert.deepEqual(door.meta.mirrorCabinet.band, { maxHeightMm: 1600, maxWeightKg: 13 });
  assert.equal(door.meta.mirrorCabinet.hinges, 3);
  assert.deepEqual(door.meta.cupY, [100, 640, 840]);
  // The cups: the house's pass on meta.cupY, 21.5 from the hinge edge (the sheet's mirror frame).
  const cups = drillsOf(r, 'MC01-F2', 'cup');
  assert.deepEqual(cups.map((d) => [d.x, d.y, d.d]), [[455.5, 100, 35], [455.5, 640, 35], [455.5, 840, 35]]);
  assert.equal(drillsOf(r, 'MC01-F2', 'cup_screw').length, 6);
  // The plates on DIVIDER-1's right face (its frame turned over: depth - 37), two a cup, 16 either side.
  const plates = drillsOf(r, 'DIVIDER-1', 'hinge');
  assert.deepEqual(plates.map((d) => [d.x, d.y]), [[160, 84], [160, 116], [160, 624], [160, 656], [160, 824], [160, 856]]);
  assert.deepEqual(drillsOf(r, 'BUL', 'hinge').map((d) => [d.x, d.y]), [[37, 184], [37, 216], [37, 724], [37, 756], [37, 924], [37, 956]]);
  assert.deepEqual(drillsOf(r, 'BUR', 'hinge').map((d) => d.x), [160, 160, 160, 160, 160, 160]);
  assert.equal(drillsOf(r, 'DIVIDER-2', 'hinge').length, 0, 'no door hangs on DIVIDER-2');
  assert.equal(r.derived.mirror.hingesTotal, 9);
  // D11: the middle door stands 30 off the divider it hangs on, said, never clamped.
  assert.equal(door.meta.mirrorCabinet.overlayMm, -30);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'MIRROR_HINGE_REACH').map((w) => w.message),
    ['MC01: door 2 hangs on DIVIDER-1 and stands 30 mm off its face: the hinge that reaches it is the owner\'s to name.']);
  // A taller door climbs the table: 604.5 x 1737 is 13.2302 kg of board (four hinges, the 2000 / 19 band)
  // and 23.7304 kg with its mirror (five, the 2400 / 24 band), evenly between WUD's two ends.
  const tallBoard = cut(kit({ height: 1900 }, { bays: 2, mirror_doors: false }));
  assert.deepEqual(tallBoard.derived.mirror.doors.map((d) => [d.w, d.h, d.weightKg, d.hinges]), [[604.5, 1737, 13.2302, 4], [604.5, 1737, 13.2302, 4]]);
  const tall = cut(kit({ height: 1900 }, { bays: 2 }));
  assert.deepEqual(tall.derived.mirror.doors.map((d) => [d.weightKg, d.hinges, d.band.maxWeightKg]), [[23.7304, 5, 24], [23.7304, 5, 24]]);
  assert.deepEqual(tall.derived.mirror.doors[0].cupY, [100, 485, 870, 1255, 1640]);
});

// ═══ THE ROOM REFUSES IN WORDS; THE UNIT'S OWN ANSWERS ════════════════════

test('F2 D5 . typed widths that do not fill the carcass are refused in words; the doors are the kit\'s own', () => {
  const r = cut(kit({}, { door_widths: [330, 480, 300] }));
  assert.deepEqual(r.warnings.filter((w) => w.code === 'MIRROR_DOOR_WIDTHS').map((w) => w.message), [
    'MC01: the door widths 330 + 480 + 300 and the stiles 75 + 75 make 1260, the carcass is 1290 wide: type door widths that make 1290 with the stiles. The doors are cut at the kit\'s own widths.',
  ]);
  assert.deepEqual(r.derived.mirror.doorWidths, [330, 480, 330]);
  assert.deepEqual(r.derived.mirror.doorWidthsTyped, [330, 480, 300]);
  assert.equal(r.derived.mirror.widthsRefused, true);
  const ok = cut(kit({}, { door_widths: [300, 540, 300] }));
  assert.deepEqual(ok.panels.filter((p) => p.part === 'FRONT').map((p) => p.w), [297, 537, 297]);
  assert.equal(ok.warnings.filter((w) => w.code === 'MIRROR_DOOR_WIDTHS').length, 0);
});

test('F2 D14 D15 . the shelves the unit carries, moved and added; the back\'s mirror', () => {
  const items = [
    { id: 'a', kind: 'shelf', zone: 0, pos_mm: 400 },
    { id: 'b', kind: 'shelf', zone: 1, pos_mm: 300 },
    { id: 'c', kind: 'shelf', zone: 1, pos_mm: 700 },
    { id: 'd', kind: 'shelf', zone: 2, pos_mm: 1050 },
  ];
  const r = cut(kit({ items }));
  const glass = r.panels.filter((p) => p.part === 'SHELF');
  assert.deepEqual(glass.map((p) => [p.meta.itemId, p.meta.zone, p.box.y]), [['a', 0, 400], ['b', 1, 300], ['c', 1, 700]]);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'MIRROR_SHELF_REFUSED').map((w) => w.message),
    ['MC01: a glass shelf at 1050 does not stand in its bay (130 to 1046): it is not cut.']);
  assert.equal(drillsOf(r, 'BUR', 'shelf').length, 0, 'bay 3 has no shelf, BUR no pin');
  assert.equal(cut(kit({}, { shelves_per_bay: 0 })).panels.filter((p) => p.part === 'SHELF').length, 0);
  assert.equal(cut(kit({}, { shelves_per_bay: 7 })).panels.filter((p) => p.part === 'SHELF').length, 21);
  // The back's mirror: a pane a bay, and the shelves 4 shorter (material never enters material).
  const mb = cut(kit({}, { mirror_back: true }));
  const back = byId(mb, 'BACK');
  assert.deepEqual(back.meta.mirrorBack.panes.map((p) => [p.bay, p.w, p.h, p.box.z, p.box.d]),
    [[1, 340.5, 922, 18, 4], [2, 537, 922, 18, 4], [3, 340.5, 922, 18, 4]]);
  assert.ok(mb.panels.filter((p) => p.part === 'SHELF').every((p) => p.h === 173 && p.box.z === 22));
  same(mb.derived.mirror.mirrorArea.back_m2, back.meta.mirrorBack.area_m2);
});

test('F2 . the box off, the recess typed, bays 1 and 2', () => {
  const nb = cut(kit({}, { bottom_box: false }));
  assert.ok(!byId(nb, 'BOX-TOP') && !byId(nb, 'BOX-FRONT'));
  assert.deepEqual([byId(nb, 'MC01-F1').box.y, byId(nb, 'MC01-F1').h], [30, 1037]);
  assert.equal(byId(nb, 'DIVIDER-1').box.y, 48, 'the dividers on the BOTTOM');
  assert.equal(nb.derived.mirror.bottomBox.on, false);
  // The recess: typed on T79's key, nothing cut differently (D17).
  const rc = cut(kit({ recess_mm: 155 }));
  assert.deepEqual(rc.derived.mirror.recess, { mm: 155, proudMm: 60, faceProudMm: 82, wallOpening: { x: 0, y: 0, w: 1350, h: 1100, depth: 155 } });
  assert.deepEqual(rc.panels, cut(kit()).panels);
  const two = cut(kit({}, { bays: 2 }));
  assert.deepEqual(two.panels.filter((p) => p.part === 'FRONT').map((p) => [p.w, p.meta.hinge]), [[604.5, 'L'], [604.5, 'R']]);
  assert.equal(two.panels.filter((p) => p.part === 'VPART').length, 1);
  const one = cut(kit({}, { bays: 1 }));
  assert.deepEqual(one.panels.filter((p) => p.part === 'FRONT').map((p) => [p.w, p.meta.hinge]), [[1287, 'L']]);
  assert.equal(one.panels.filter((p) => p.part === 'VPART' || p.part === 'MIRROR-STILE').length, 0);
});

test('F2 . every part is self-explaining for the room, the BOM, the panel and the sheets', () => {
  const r = cut(kit());
  for (const p of r.panels) {
    assert.ok(p.meta?.mirrorCabinet?.role, `${p.id} says what it is in the cabinet`);
    assert.ok(partIdForElement(p.part, { typeId: 'MIRROR_CABINET' }), `${p.part} is in the part registry`);
    // Material never enters material: no two solids of the kit overlap.
  }
  const solids = r.panels.filter((p) => p.box);
  const overlap = (a, b) => ['x', 'y', 'z'].every((k, i) => {
    const s = ['w', 'h', 'd'][i];
    return Math.min(a.box[k] + a.box[s], b.box[k] + b.box[s]) - Math.max(a.box[k], b.box[k]) > 1e-6;
  });
  for (let i = 0; i < solids.length; i += 1) {
    for (let j = i + 1; j < solids.length; j += 1) {
      assert.ok(!overlap(solids[i], solids[j]), `${solids[i].id} enters ${solids[j].id}`);
    }
  }
  // Every solid stands inside the cabinet's box: W x H, the panels' depth.
  for (const p of solids) {
    assert.ok(p.box.x >= 0 && p.box.x + p.box.w <= 1350 && p.box.y >= 0 && p.box.y + p.box.h <= 1100
      && p.box.z >= 0 && p.box.z + p.box.d <= 237, `${p.id} inside the cabinet`);
  }
  assert.equal(r.assemblies.mount, 'wall');
  assert.equal(r.assemblies.mountHeight, 1250);
  assert.equal(r.unitNum, 'MC01');
  assert.deepEqual(Object.keys(r.derived.mirror.led), ['kelvin', 'driverVolts', 'stiles', 'under', 'inside', 'driver']);
  assert.deepEqual(r.derived.mirror.hangers, { count: 2, name: 'Cabinet hanger 50 kg with wall plate', article: '' });
});

// The six fossils and every T75 to T82 golden are the strict classifier's (scripts/t78-classify.mjs, FROZEN 1);
// these are the T82 kits beside which this one is filed, and its own.
test('F2 . the goldens beside it do not move: the vanity and the chest; the mirror cabinet\'s own holds', () => {
  for (const file of ['verify/t82/goldens/golden-vanity3.json', 'verify/t82/goldens/golden-vanity3-columns2.json',
    'verify/t82/goldens/golden-wardrobe-chest2-columns2.json']) {
    const g = JSON.parse(readFileSync(`${ROOT}${file}`, 'utf8'));
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${file} moved`);
  }
  const golden = JSON.parse(readFileSync(`${ROOT}verify/t83/goldens/golden-mirror.json`, 'utf8'));
  assert.deepEqual(goldenOf(golden.params, P), golden.expected, 'the mirror cabinet\'s own golden');
});

// ═══ THE WAY THE CLIENT CLICKS: THE STORE ═════════════════════════════════

test('F2 . added in a job: MC01, 1350 x 1100 x 215 at its own 1250; the typed recess stays; the wall line never moves it', () => {
  const S = () => useProjectStore.getState();
  S().newProject('Mirror', { design: { projectType: 'kitchen' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const id = S().addUnit('MIRROR_CABINET').id;
  const U = () => S().units.find((u) => u.id === id);
  assert.deepEqual([U().params.unit_num, U().params.width, U().params.height, U().params.depth, U().params.mount_height],
    ['MC01', 1350, 1100, 215, 1250], 'the drawing\'s cabinet, hung at 1250, never the kitchen\'s 1500');
  assert.equal(unitBase(U(), P), 1250);
  const r = S().allResults().find((e) => e.unit.id === id).result;
  assert.equal(r.panels.filter((p) => p.part === 'FRONT').length, 3);
  // D17: the recess is TYPED; the store's recess derivation neither clears it nor deepens the carcass.
  S().updateUnitParams(id, { recess_mm: 155 });
  S().settleRecesses();
  assert.deepEqual([U().params.recess_mm, U().params.depth], [155, 215]);
  assert.equal(wallGapOf(U(), P), P.room.wallBackClearance - 155, 'the room reads it as T79\'s recess (runs.js wallGapOf)');
  // The project's wall line moves the wall units, never this one.
  S().setProjectHeights({ wallMount: 1400 });
  assert.equal(U().params.mount_height, 1250);
});
