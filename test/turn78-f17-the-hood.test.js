// --- T78 . F17 . THE HOOD: CANOPY OR SHORT, WITH THE CLEARANCE PROPOSED -----
//
// The owner, 11.10.2026: "szafka na hood tradycyjna czyli wysunieta pod skosem
// albo normalna szafka tylko mniejsza zeby bylo 650 do 750 minimum nad blatem,
// nad hobem", and on 650 or 750: "tak jak mowisz ale pozostaw to dla klienta,
// tylko proponuj."
//
// What this file pins (CLAUDE.md T78 F17):
//   . two kits beside WUD_HOOD: WUD_HOOD_CANOPY (the chimney canopy: trapezoid
//     sides, a deeper bottom, a sloped front of the front material, no door)
//     and WUD_HOOD_SHORT (WUD_HOOD to the letter at the height that leaves the
//     clearance); both appliance 'extractor', widthFixed, prefix HD;
//   . LISP FIRST: reference/lisp/KIT_WUD_HOOD_CANOPY.lsp is ASCII, balanced,
//     names its numbers, and the engine (engine/hoodCanopy.js) mirrors its
//     boards point for point;
//   . the numbers are PROPOSED, in the profile, marked, migrated;
//   . THE CLEARANCE LAW: Check #34 fires below 650 (induction) and names the
//     number, offers one click (a store action), does not fire at 650, gas asks
//     750; the store says the same row once as a yellow with a button; the
//     click raises the hood's mount height; never a block;
//   . the hob kind is a CHOICE on the hob unit (hob_kind), induction unwritten.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_NUM_PREFIX, UNIT_TYPES, UNIT_TYPE_ORDER, categoryOf, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY } from '../src/engine/library.js';
import { CHECKS } from '../src/engine/checks.js';
import { canopyGeometry, canopySidePoints, canopySpec } from '../src/engine/hoodCanopy.js';
import {
  HOB_KINDS, hobKindOf, hoodClearanceMm, hoodClearanceRows, hoodClearanceShortfalls, hoodRaiseTo,
  isHobUnit, isHoodUnit,
} from '../src/engine/hoodClearance.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const UI = () => useUiStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const kit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), ...extra }, P);
const near = (a, b, eps = 1e-3) => Math.abs(Number(a) - Number(b)) <= eps;
const hasPoint = (outline, x, y) => outline.some(([px, py]) => near(px, x) && near(py, y));

/** The chat's own LISP stripper (test/turn35-lisp-parens.test.js), restated for one file. */
function parenScan(text) {
  let depth = 0; let min = 0; let inString = false; let inComment = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inComment) { if (ch === '\n') inComment = false; continue; }
    if (inString) { if (ch === '\\') { i += 1; continue; } if (ch === '"') inString = false; continue; }
    if (ch === '"') { inString = true; continue; }
    if (ch === ';') { inComment = true; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') { depth -= 1; if (depth < min) min = depth; }
  }
  return { balance: depth, min };
}

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  UI().clearMessages?.();
  confirmDrawerBox();
}
const hoodMessages = () => (UI().messages || []).filter((m) => /hood's underside/.test(m.message));
const findings34 = () => S().runChecks().filter((f) => f.check === 34);

// ===========================================================================
// THE NUMBERS: proposed, in the profile, marked, migrated
// ===========================================================================

test('F17 . the numbers live in the profile, marked proposed, and migrate key by key', () => {
  assert.deepEqual(P.hoodCanopy.defaults, {
    width: 600, height: 500, depth: 400, mountHeight: 1720, bottomProjectionMm: 150,
  });
  assert.deepEqual(P.hoodShort.defaults, {
    width: 600, height: 660, depth: 400, mountHeight: 1560, aperture: 350,
  });
  assert.deepEqual(P.hood.clearance, { induction: 650, gas: 750 });
  const src = read('src/engine/profile.js');
  for (const block of ['hoodCanopy', 'hoodShort', 'hood']) {
    const at = src.indexOf(`  ${block}: {`);
    assert.ok(at > 0, block);
    assert.match(src.slice(at, at + 260), /T78 proposed, owner to confirm/, `${block} is not marked proposed`);
    assert.deepEqual(migrateCabinetProfile({})[block], P[block], `${block} has no migrate line`);
  }
  // A stored profile that names one key keeps every other (T31's own check on hoodWallUnit).
  const stored = migrateCabinetProfile({ hood: { clearance: { gas: 800 } }, hoodCanopy: { defaults: { bottomProjectionMm: 120 } } });
  assert.equal(stored.hood.clearance.induction, 650);
  assert.equal(stored.hoodCanopy.defaults.height, 500);
  assert.equal(stored.hoodCanopy.defaults.width, 600);
  assert.equal(stored.hoodShort.defaults.height, 660);
  // The derivation the short hood's height rests on: 720 - (650 - (1500 - 908)) = 662 -> 660.
  const worktopTop = P.baseUnit.defaults.height + P.baseUnit.legHeight + P.autoParts.worktop.thickness;
  assert.equal(worktopTop, 908);
  assert.equal(P.wallUnit.defaults.height - (P.hood.clearance.induction - (P.wallUnit.defaults.mountHeight - worktopTop)), 662);
  assert.equal(P.hoodShort.defaults.mountHeight + P.hoodShort.defaults.height, P.wallUnit.defaults.mountHeight + P.wallUnit.defaults.height, 'its top on the wall run\'s top line');
  assert.ok(P.hoodShort.defaults.mountHeight - worktopTop >= P.hood.clearance.induction, 'the short hood clears induction at its defaults');
  assert.equal(P.hoodCanopy.defaults.mountHeight + P.hoodCanopy.defaults.height, P.wallUnit.defaults.mountHeight + P.wallUnit.defaults.height);
  // The module reads the same numbers.
  assert.deepEqual(canopySpec(P), { bottomProjectionMm: 150, heightMm: 500 });
  assert.equal(hoodClearanceMm(P, 'induction'), 650);
  assert.equal(hoodClearanceMm(P, 'gas'), 750);
  assert.equal(hoodClearanceMm(P, 'nonsense'), 650, 'an unknown kind is the default kind');
  assert.deepEqual(HOB_KINDS, ['induction', 'gas']);
});

// ===========================================================================
// THE TWO KITS
// ===========================================================================

test('F17 . two kits beside WUD_HOOD, in the order, the library, the prefix and the category', () => {
  assert.ok(UNIT_TYPES.WUD_HOOD_CANOPY && UNIT_TYPES.WUD_HOOD_SHORT);
  const i = UNIT_TYPE_ORDER.indexOf('WUD_HOOD');
  assert.deepEqual(UNIT_TYPE_ORDER.slice(i, i + 3), ['WUD_HOOD', 'WUD_HOOD_CANOPY', 'WUD_HOOD_SHORT']);
  assert.equal(UNIT_NUM_PREFIX.WUD_HOOD_CANOPY, 'HD');
  assert.equal(UNIT_NUM_PREFIX.WUD_HOOD_SHORT, 'HD');
  const wall = KITCHEN_LIBRARY.find((g) => g.id === 'wall-units');
  for (const [typeId, label] of [['WUD_HOOD_CANOPY', 'Hood canopy'], ['WUD_HOOD_SHORT', 'Hood unit, short']]) {
    const entry = wall.items.find((e) => e.typeId === typeId);
    assert.ok(entry, `${typeId} is not in the Library`);
    assert.equal(entry.label, label);
    assert.ok(entry.hint, 'a Library row with no hint is a row nobody understands');
    assert.equal(categoryOf(typeId).id, 'kitchen');
    assert.equal(UNIT_TYPES[typeId].available, true);
  }
});

test('F17 . WUD_HOOD_SHORT is WUD_HOOD to the letter, except what the kit is', () => {
  const hood = UNIT_TYPES.WUD_HOOD;
  const short = UNIT_TYPES.WUD_HOOD_SHORT;
  const own = new Set(['id', 'label', 'heightGroup', 'topLine', 'defaultsKey']);
  for (const key of new Set([...Object.keys(hood), ...Object.keys(short)])) {
    if (own.has(key)) continue;
    assert.deepEqual(short[key], hood[key], `WUD_HOOD_SHORT.${key} differs from WUD_HOOD`);
  }
  assert.equal(short.label, 'Hood wall unit, short');
  assert.equal(short.heightGroup, null, 'its height is the clearance\'s answer, never the project\'s wall height');
  assert.equal(short.topLine, 'wall', 'its top meets the wall run\'s top line');
  assert.equal(short.defaultsKey, 'hoodShort.defaults');
  assert.equal(short.lisp, 'KIT_WUD_FULL.lsp');
});

test('F17 . WUD_HOOD_CANOPY: no door, a bottom board, its own LISP, the extractor', () => {
  const t = UNIT_TYPES.WUD_HOOD_CANOPY;
  assert.equal(t.lisp, 'KIT_WUD_HOOD_CANOPY.lsp');
  assert.equal(t.canopy, true);
  assert.equal(t.appliance, 'extractor');
  assert.equal(t.widthFixed, true);
  assert.equal(t.mount, 'wall');
  assert.equal(t.heightGroup, null);
  assert.equal(t.topLine, 'wall');
  assert.equal(t.supports.doors, false, 'no door hangs on a canopy');
  assert.equal(t.supports.shelves, false);
  assert.equal(t.carcass.bottom, undefined, 'the bottom is a BOARD: the deeper one');
  assert.deepEqual(t.carcass, { top: 'panel', back: 'full' });
  assert.equal(t.hangers, true);
  assert.equal(t.doorExtend, false);
  assert.equal(t.defaultsKey, 'hoodCanopy.defaults');
  // The defaults it is born with: the canopy's own height, the wall line's mount, the aperture of T31's law.
  const params = defaultParamsFor('WUD_HOOD_CANOPY', P);
  assert.equal(params.height, 500);
  assert.equal(params.mount_height, 1720);
  assert.equal(params.hood_aperture_mm, P.hoodWallUnit.defaults.aperture, 'T31: every extractor kit carries the aperture');
  // No other kit carries the canopy flag, and no kit carries a hob kind unasked.
  for (const id of UNIT_TYPE_ORDER) {
    assert.equal(Boolean(getUnitType(id).canopy), id === 'WUD_HOOD_CANOPY', id);
    assert.equal(defaultParamsFor(id, P).hob_kind, undefined, `${id} carries a hob kind nobody chose`);
  }
});

// ===========================================================================
// THE CANOPY'S BOARDS, AGAINST THE LISP (sections 3 and 4)
// ===========================================================================

test('F17 . the numbers derived: alpha, L, Lblank, as the LISP states them', () => {
  const g = canopyGeometry({ H: 500, P: 150, frontT: 25 });
  assert.equal(g.slopeDeg, Math.round(((Math.atan2(150, 500) * 180) / Math.PI) * 1e4) / 1e4);
  assert.ok(near(g.slopeDeg, 16.6992, 1e-4));
  assert.ok(near(g.faceLen, Math.sqrt(500 * 500 + 150 * 150), 1e-4));
  assert.ok(near(g.faceLen, 522.0153, 1e-4));
  assert.ok(near(g.blankLen, g.faceLen + 25 * Math.tan(Math.atan2(150, 500)), 1e-4));
  assert.ok(near(g.blankLen, 529.5153, 1e-4));
  assert.equal(g.bevelDeg, g.slopeDeg);
  // A projection of nothing is a plain box.
  const flat = canopyGeometry({ H: 500, P: 0, frontT: 25 });
  assert.equal(flat.slopeDeg, 0);
  assert.equal(flat.blankLen, 500);
  assert.deepEqual(canopySidePoints({ sideW: 382, H: 500, P: 150, side: 'L' }), [[0, 0], [532, 0], [532, 500], [150, 500]]);
  assert.deepEqual(canopySidePoints({ sideW: 382, H: 500, P: 150, side: 'R' }), [[0, 0], [532, 0], [382, 500], [0, 500]]);
});

test('F17 . the canopy builds: trapezoid sides, the deeper bottom, the sloped front, no door', () => {
  const r = kit('WUD_HOOD_CANOPY');
  const W = 600; const H = 500; const D = 400; const G = 18; const Pm = 150; const sideW = D - G;
  assert.equal(r.panels.filter((p) => p.part === 'FRONT').length, 0, 'no door');
  assert.equal(r.panels.filter((p) => p.role === 'shelf').length, 0);
  assert.deepEqual(r.panels.map((p) => p.id), ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'CANOPY-FRONT']);

  // 4.1 BUL: the parent's board pushed P from the new bottom front corner, the slant closing it.
  const bul = r.panels.find((p) => p.id === 'BUL');
  assert.equal(bul.w, sideW + Pm);
  assert.equal(bul.h, H);
  assert.equal(bul.cnc.drawn_w, sideW + Pm);
  assert.equal(bul.box.d, sideW + Pm);
  assert.equal(bul.box.z, G);
  const bo = bul.cnc.outline;
  assert.deepEqual(bo.slice(0, 2), [[0, 0], [sideW + Pm, 0]]);
  assert.deepEqual(bo.slice(-2), [[sideW + Pm, H], [Pm, H]], 'the top front corner at P: the closing edge is the slant');
  assert.ok(bo.every(([x]) => x >= 0), 'nothing drawn at a negative x');
  assert.deepEqual(bul.meta.canopy.trapezoid, [[0, 0], [532, 0], [532, 500], [150, 500]]);
  assert.ok(near(bul.edging.len_m, Math.sqrt(H * H + Pm * Pm) / 1000, 1e-6), 'the edged edge is the slant');
  assert.ok(near(bul.area_m2, (sideW + Pm) * H / 1e6, 1e-6), 'the blank is the rectangle the sheet gives up');
  // Its joints are the parent's, measured from the back: the parent at 500 high has them at 95 and 287 from the back.
  const parent = kit('WUD', { height: H, doors: false });
  const pBul = parent.panels.find((p) => p.id === 'BUL');
  const shifted = pBul.cnc.pockets.map((pk) => ({ ...pk, x1: pk.x1 + Pm, x2: pk.x2 + Pm }));
  assert.deepEqual(bul.cnc.pockets, shifted, 'every pocket moved by P with the frame');
  assert.deepEqual(bul.cnc.holes, pBul.cnc.holes.map((h) => ({ ...h, x: h.x + Pm })));
  // BUR: its x = 0 is the back, so nothing moves but the bottom front corner.
  const bur = r.panels.find((p) => p.id === 'BUR');
  const pBur = parent.panels.find((p) => p.id === 'BUR');
  assert.deepEqual(bur.cnc.outline.slice(0, 4), [[0, 0], [sideW + Pm, 0], [sideW, H], [0, H]]);
  assert.deepEqual(bur.cnc.outline.slice(4), pBur.cnc.outline.slice(4), 'the back tabs are the parent\'s');
  assert.deepEqual(bur.cnc.pockets, pBur.cnc.pockets);
  assert.deepEqual(bur.cnc.holes, pBur.cnc.holes);
  assert.equal(bur.box.x, W - G);

  // 4.1 the drilling of BUL moved with its frame; BUR's did not.
  const HG = P.wallUnit.hangers;
  const bulHangers = r.drills.filter((d) => d.panel === 'BUL' && d.kind === 'hanger').map((d) => d.x).sort((a, b) => a - b);
  assert.deepEqual(bulHangers, HG.fromBackEdge.map((f) => sideW + Pm - f).sort((a, b) => a - b), 'BUL hangers 21 and 53 from the back');
  const burHangers = r.drills.filter((d) => d.panel === 'BUR' && d.kind === 'hanger').map((d) => d.x).sort((a, b) => a - b);
  assert.deepEqual(burHangers, [...HG.fromBackEdge].sort((a, b) => a - b));
  const parentBulDrills = parent.drills.filter((d) => d.panel === 'BUL');
  assert.deepEqual(
    r.drills.filter((d) => d.panel === 'BUL').map((d) => [d.kind, d.x, d.y]),
    parentBulDrills.map((d) => [d.kind, d.x + Pm, d.y]),
    'every BUL drill is the parent\'s, moved by P',
  );
  assert.deepEqual(
    r.drills.filter((d) => d.panel === 'BUR').map((d) => [d.kind, d.x, d.y]),
    parent.drills.filter((d) => d.panel === 'BUR').map((d) => [d.kind, d.x, d.y]),
  );

  // 4.2 TOP and 4.4 BACK: the parent's.
  for (const id of ['TOP', 'BACK']) {
    const mine = r.panels.find((p) => p.id === id);
    const theirs = parent.panels.find((p) => p.id === id);
    assert.deepEqual({ ...mine, meta: undefined }, { ...theirs, meta: undefined }, `${id} is WUD's`);
  }

  // 4.3 BOTTOM: P deeper at the front, the parent's tabs into the sides.
  const bottom = r.panels.find((p) => p.id === 'BOTTOM');
  const pBottom = parent.panels.find((p) => p.id === 'BOTTOM');
  assert.equal(bottom.w, W - 2 * G);
  assert.equal(bottom.h, sideW + Pm);
  assert.equal(bottom.cnc.drawn_w, sideW + Pm);
  assert.equal(bottom.box.d, sideW + Pm);
  assert.ok(hasPoint(bottom.cnc.outline, sideW + Pm, 0) && hasPoint(bottom.cnc.outline, sideW + Pm, W - 2 * G), 'the two front corners at D - G + P');
  assert.ok(!hasPoint(bottom.cnc.outline, sideW, 0) && !hasPoint(bottom.cnc.outline, sideW, W - 2 * G), 'and not at the parent\'s depth any more');
  const tabsOnly = (o) => o.filter(([x]) => !near(x, sideW) && !near(x, sideW + Pm));
  assert.deepEqual(tabsOnly(bottom.cnc.outline), tabsOnly(pBottom.cnc.outline), 'every tab where the parent\'s is');
  assert.deepEqual(bottom.cnc.pockets, pBottom.cnc.pockets);
  assert.ok(near(bottom.area_m2, (W - 2 * G) * (sideW + Pm) / 1e6, 1e-6));

  // 4.5 CANOPY-FRONT: a plain blank of the FRONT material, W x Lblank, leaning by alpha about its top edge.
  const cf = r.panels.find((p) => p.id === 'CANOPY-FRONT');
  const g = canopyGeometry({ H, P: Pm, frontT: 25 });
  assert.equal(cf.part, 'FALSE-FRONT');
  assert.equal(cf.role, 'false_front');
  assert.equal(cf.material_role, 'front');
  assert.equal(cf.finish_exposed, true);
  assert.equal(cf.w, W);
  assert.equal(cf.h, g.blankLen);
  assert.equal(cf.thickness, 25);
  assert.equal(cf.cnc.outline.length, 4, 'a rectangle: the bevels are the saw\'s');
  assert.equal(cf.cnc.pockets.length + cf.cnc.holes.length, 0, 'no cups: nothing hinges');
  assert.equal(cf.box.z, D, 'hangs from the sides\' top front corner');
  assert.equal(cf.box.y + cf.box.h, H);
  assert.equal(cf.meta.tilt_deg, -g.slopeDeg, 'negative about x: the bottom edge comes forward');
  assert.deepEqual(cf.meta.tilt_pivot, { y: H, z: D });
  assert.deepEqual(cf.meta.canopy, {
    projection: 150, slopeDeg: g.slopeDeg, faceLen: g.faceLen, blankLen: g.blankLen, bevelDeg: g.bevelDeg, bevel: cf.meta.canopy.bevel,
  });
  assert.match(cf.meta.canopy.bevel, /both ends, at the saw/);
  assert.equal(cf.edging.code, P.csv.codes.all, 'all four edges');
  assert.ok(r.csvLines.some((l) => /^01,CANOPY-FRONT,600,530,/.test(l)), r.csvLines.join('\n'));

  // The extractor: a line, no hole; the hangers; nothing else bought.
  assert.deepEqual(r.hardware.map((h) => h.role).sort(), ['extractor', 'hangers']);
  assert.ok(!r.drills.some((d) => /extract/i.test(String(d.kind))), 'a bought mechanism is a line and a body, never a hole');
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.derived.canopy, {
    projection: 150, slopeDeg: g.slopeDeg, faceLen: g.faceLen, blankLen: g.blankLen, bevelDeg: g.bevelDeg,
    topDepth: 400, bottomDepth: 550, sideTopDepth: 382, sideBottomDepth: 532, lisp: 'KIT_WUD_HOOD_CANOPY.lsp',
  });
  assert.equal(r.totals.pieces_total, 6);
  assert.ok(near(r.totals.front_area_m2, cf.area_m2, 1e-6), 'the sloped front is counted as front material');
  // Any size: the law holds for the kit at the walk's own envelope.
  const big = kit('WUD_HOOD_CANOPY', { width: 900, height: 700, depth: 350 });
  assert.equal(big.panels.find((p) => p.id === 'BUL').w, 350 - 18 + 150);
  assert.equal(big.panels.find((p) => p.id === 'CANOPY-FRONT').w, 900);
  assert.ok(near(big.panels.find((p) => p.id === 'CANOPY-FRONT').h, canopyGeometry({ H: 700, P: 150, frontT: 25 }).blankLen));
});

test('F17 . no other kit grew a canopy board', () => {
  for (const id of UNIT_TYPE_ORDER) {
    if (id === 'WUD_HOOD_CANOPY') continue;
    const r = kit(id);
    assert.equal(r.derived.canopy, undefined, id);
    assert.ok(!r.panels.some((p) => p.id === 'CANOPY-FRONT' || p.meta?.canopy), id);
  }
});

test('F17 . the short hood is WUD_HOOD at 660, hole for hole', () => {
  const short = kit('WUD_HOOD_SHORT', { doors: { count: 1 } });
  const hood = kit('WUD_HOOD', { height: 660, mount_height: 1560, doors: { count: 1 } });
  assert.equal(short.params.height, 660);
  assert.equal(short.params.mount_height, 1560);
  assert.deepEqual(short.panels, hood.panels);
  assert.deepEqual(short.drills, hood.drills);
  assert.deepEqual(short.hardware, hood.hardware);
  assert.ok(!short.panels.some((p) => p.part === 'BOTTOM'), 'the aperture is open underneath');
  const front = short.panels.find((p) => p.part === 'FRONT');
  assert.equal(front.h, 660 - P.hoodWallUnit.defaults.aperture - 3, 'the door stands above the aperture');
});

// ===========================================================================
// THE CLEARANCE LAW: Check #34, the proposal, the click
// ===========================================================================

test('F17 . Check #34 is in the list, yellow, labelled', () => {
  const c = CHECKS.find((x) => x.n === 34);
  assert.ok(c, '#34 is not in the list');
  assert.equal(c.level, 'yellow', 'a proposal, never a block');
  assert.equal(c.label, 'Hood clearance over the hob');
});

test('F17 . the measure: who is a hob, who is a hood, what each asks', () => {
  assert.equal(isHobUnit({ type: 'BUDR_HOB', params: { hob: true } }), true);
  assert.equal(isHobUnit({ type: 'OVEN_BASE', params: {} }), true, 'the oven base carries the hob');
  assert.equal(isHobUnit({ type: 'BUDR', params: {} }), false);
  assert.equal(isHobUnit({ type: 'WUD', params: {} }), false);
  for (const id of ['WUD_HOOD', 'WUD_HOOD_SHORT', 'WUD_HOOD_CANOPY']) assert.equal(isHoodUnit({ type: id, params: {} }), true, id);
  assert.equal(isHoodUnit({ type: 'WUD', params: {} }), false);
  assert.equal(hobKindOf({ params: {} }), 'induction', 'nothing chosen is induction');
  assert.equal(hobKindOf({ params: { hob_kind: 'gas' } }), 'gas');
  assert.equal(hobKindOf({ params: { hob_kind: 'electric' } }), 'induction', 'a kind the owner did not name reads as the default');
});

test('F17 . below 650 the Check says the number and offers one click; at 650 it is silent; the click raises the hood', () => {
  room();
  const hob = S().addUnit('BUDR_HOB', { wall: 0, x: 1000 });
  assert.ok(hob.id, hob.error);
  assert.equal(U(hob.id).params.hob, true);
  const hood = S().addUnit('WUD_HOOD', { wall: 0, x: 1000 });
  assert.ok(hood.id, hood.error);
  assert.equal(U(hood.id).params.mount_height, 1500);
  // The measure: the worktop top is 770 + 100 + 38 = 908, the underside 1500: 592 of 650.
  const rows = hoodClearanceRows({ units: S().units, profile: P, design: S().project.design });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    hoodId: hood.id, hoodNum: 'HD01', hobId: hob.id, hobNum: 'DR01', hobKind: 'induction',
    wantMm: 650, gapMm: 592, worktopTopMm: 908, mountHeightMm: 1500, raiseToMm: 1558, shortMm: 58,
  });
  // THE CHECK.
  const f = findings34();
  assert.equal(f.length, 1);
  assert.equal(f[0].level, 'yellow');
  assert.equal(f[0].unitId, hood.id);
  assert.match(f[0].message, /592 mm over the hob's worktop \(DR01\); induction asks 650 mm/);
  assert.match(f[0].message, /Raise it to 1558 mm, or leave it: the client decides/);
  assert.deepEqual(f[0].subject, { unitId: hood.id, editor: 'cabinet' });
  assert.equal(f[0].actions.length, 1);
  assert.equal(f[0].actions[0].id, 'raise-hood');
  assert.equal(f[0].actions[0].label, 'Raise hood to 1558 mm');
  assert.match(f[0].actions[0].title, /an induction hob/);
  assert.deepEqual(f[0].actions[0].subject.store, { action: 'raiseHoodToClearance', args: [hood.id] });
  assert.equal(f[0].actions[0].subject.unitId, hood.id, 'the flight still opens the hood');
  // THE PROPOSAL: a yellow with a button, said once.
  const msgs = hoodMessages();
  assert.equal(msgs.length, 1, JSON.stringify((UI().messages || []).map((m) => m.message)));
  assert.equal(msgs[0].level, 'yellow', 'a level that waits for a person gets the button (engine/messages.js)');
  assert.equal(msgs[0].message, f[0].message, 'the Check and the proposal speak one sentence');
  assert.equal(msgs[0].action?.label, 'Raise hood to 1558 mm');
  S().refreshAutoParts();
  S().moveUnit(hood.id, 1002, 0);
  assert.equal(hoodMessages().length, 1, 'another pass does not repeat it');
  // THE CLICK.
  msgs[0].action.run();
  assert.equal(U(hood.id).params.mount_height, 1558);
  assert.equal(U(hood.id).params.height, 720, 'the height is left alone: only the mount height moves');
  assert.equal(findings34().length, 0, 'at 650 the Check is silent');
  assert.deepEqual(hoodClearanceShortfalls({ units: S().units, profile: P, design: S().project.design }), []);
  assert.equal(hoodClearanceRows({ units: S().units, profile: P, design: S().project.design })[0].gapMm, 650);
  // Exactly the number is enough: nothing below the line is asked.
  assert.deepEqual(S().raiseHoodToClearance(hood.id), { error: 'HD01: the hood already clears every hob under it.' });
  // Pulled down by hand: said again, once, with the new number.
  S().updateUnitParams(hood.id, { mount_height: 1400 });
  const again = hoodMessages();
  assert.equal(again.length, 2);
  assert.match(again[1].message, /492 mm over/);
  assert.equal(again[1].action.label, 'Raise hood to 1558 mm');
});

test('F17 . gas asks 750: the hob kind is a CHOICE on the hob unit, written through updateUnitParams', () => {
  room();
  const hob = S().addUnit('BUDR2_HOB', { wall: 0, x: 1000 });
  const hood = S().addUnit('WUD_HOOD', { wall: 0, x: 1000 });
  S().raiseHoodToClearance(hood.id);
  assert.equal(U(hood.id).params.mount_height, 1558);
  assert.equal(findings34().length, 0);
  const res = S().updateUnitParams(hob.id, { hob_kind: 'gas' });
  assert.equal(res.applied.hob_kind, 'gas');
  assert.equal(U(hob.id).params.hob_kind, 'gas');
  const rows = hoodClearanceRows({ units: S().units, profile: P, design: S().project.design });
  assert.deepEqual([rows[0].hobKind, rows[0].wantMm, rows[0].gapMm, rows[0].shortMm, rows[0].raiseToMm], ['gas', 750, 650, 100, 1658]);
  const f = findings34();
  assert.equal(f.length, 1);
  assert.match(f[0].message, /gas asks 750 mm\. Raise it to 1658 mm/);
  assert.match(f[0].actions[0].title, /a gas hob/);
  assert.equal(hoodRaiseTo(hood.id, { units: S().units, profile: P, design: S().project.design }), 1658);
  const raised = S().raiseHoodToClearance(hood.id);
  assert.equal(raised.raisedTo, 1658);
  assert.equal(U(hood.id).params.mount_height, 1658);
  assert.equal(findings34().length, 0);
  // Back to induction: 1658 is more than enough, nothing is said, nothing is lowered.
  S().updateUnitParams(hob.id, { hob_kind: 'induction' });
  assert.equal(findings34().length, 0);
  assert.equal(U(hood.id).params.mount_height, 1658, 'the automat never lowers a hood');
});

test('F17 . a hood beside the hob, or on another wall, is not over it; the oven base is a hob', () => {
  room();
  S().addUnit('BUDR_HOB', { wall: 0, x: 1000 });
  const beside = S().addUnit('WUD_HOOD', { wall: 0, x: 2000 });
  assert.ok(beside.id, beside.error);
  assert.equal(hoodClearanceRows({ units: S().units, profile: P, design: S().project.design }).length, 0);
  const other = S().addUnit('WUD_HOOD', { wall: 1, x: 1000 });
  assert.ok(other.id, other.error);
  assert.equal(hoodClearanceRows({ units: S().units, profile: P, design: S().project.design }).length, 0);
  assert.equal(findings34().length, 0);
  // The oven base carries a hob too.
  const oven = S().addUnit('OVEN_BASE', { wall: 1, x: 1000 });
  assert.ok(oven.id, oven.error);
  const rows = hoodClearanceRows({ units: S().units, profile: P, design: S().project.design });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hobId, oven.id);
  assert.equal(rows[0].hoodId, other.id);
});

test('F17 . the short hood and the canopy are born on the wall line and clear the hob; a project height keeps them on it', () => {
  room();
  const hob = S().addUnit('BUDR_HOB', { wall: 0, x: 1000 });
  const short = S().addUnit('WUD_HOOD_SHORT', { wall: 0, x: 1000 });
  assert.ok(short.id, short.error);
  assert.equal(U(short.id).params.height, 660, 'its own height, not the project\'s 720');
  assert.equal(U(short.id).params.mount_height, 1560, 'wallMount 1500 + wall 720 - 660: its top on the line');
  assert.equal(U(short.id).params.height_custom, false);
  assert.match(S().unitResult(short.id).unitNum, /^HD/);
  const rows = hoodClearanceRows({ units: S().units, profile: P, design: S().project.design });
  assert.deepEqual([rows[0].hobId, rows[0].gapMm, rows[0].shortMm], [hob.id, 652, 0], 'clear at its defaults');
  assert.equal(findings34().length, 0);
  assert.equal(hoodMessages().length, 0);
  const canopy = S().addUnit('WUD_HOOD_CANOPY', { wall: 0, x: 2000 });
  assert.ok(canopy.id, canopy.error);
  assert.equal(U(canopy.id).params.height, 500);
  assert.equal(U(canopy.id).params.mount_height, 1720);
  assert.match(S().unitResult(canopy.id).unitNum, /^HD/);
  assert.equal(S().unitResult(canopy.id).derived.canopy.slopeDeg, canopyGeometry({ H: 500, P: 150, frontT: 25 }).slopeDeg);
  // The project's wall height moves the line; both tops stay on it, their heights stay their own.
  S().setProjectHeights({ wall: 700 });
  assert.equal(U(short.id).params.height, 660);
  assert.equal(U(short.id).params.mount_height, 1540);
  assert.equal(U(canopy.id).params.height, 500);
  assert.equal(U(canopy.id).params.mount_height, 1700);
  S().setProjectHeights({ wallMount: 1450 });
  assert.equal(U(short.id).params.mount_height, 1490);
  assert.equal(U(canopy.id).params.mount_height, 1650);
});

test('F17 . a worktop record over the hob is the datum the gap is measured from', () => {
  room();
  const a = S().addUnit('BUDR_HOB', { wall: 0, x: 1000 });
  const b = S().addUnit('BUD', { near: a.id, side: 'right' });
  const hood = S().addUnit('WUD_HOOD', { wall: 0, x: 1000 });
  const ok = S().addWorktop([a.id, b.id]);
  assert.ok(ok.ok, ok.error);
  const slab = S().worktopsOf().find((w) => (w.geometry.unitIds || w.unitIds || []).includes(a.id));
  assert.ok(slab, 'the slab over the hob');
  const rows = hoodClearanceRows({
    units: S().units, profile: P, design: S().project.design,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hoodId, hood.id);
  assert.equal(rows[0].worktopTopMm, Math.round((slab.geometry.y + slab.geometry.h) * 100) / 100);
  assert.equal(rows[0].worktopTopMm, 908);
});

// ===========================================================================
// LISP IS LAW; the panel and the flight
// ===========================================================================

test('F17 . KIT_WUD_HOOD_CANOPY.lsp: new, ASCII, balanced, naming its numbers and its boards', () => {
  const lisp = read('reference/lisp/KIT_WUD_HOOD_CANOPY.lsp');
  assert.ok(!/[^\x00-\x7F]/.test(lisp), 'plain ASCII');
  const { balance, min } = parenScan(lisp);
  assert.equal(balance, 0);
  assert.equal(min, 0);
  for (const word of ['c:WUD_HOOD_CANOPY', 'HC:drawSide', 'HC:drawBottom', 'HC:drawFront', 'drawTOP_ROT90', 'drawBACK',
    'bottomProjectionMm', 'T78 proposed, owner to confirm', 'hood.clearance', 'induction: 650, gas: 750',
    'pozostaw to dla klienta, tylko proponuj', '<500>', '<150>', 'WUD_HOOD_SHORT', '660', '1560']) {
    assert.ok(lisp.includes(word), `the LISP does not say ${word}`);
  }
  // The engine names the LISP it mirrors.
  assert.equal(UNIT_TYPES.WUD_HOOD_CANOPY.lisp, 'KIT_WUD_HOOD_CANOPY.lsp');
  assert.match(read('src/engine/hoodCanopy.js'), /KIT_WUD_HOOD_CANOPY\.lsp/);
});

test('F17 . the panel offers the hob kind as a choice; the Check panel\'s flight runs the store action', () => {
  const panel = read('src/components/RightPanel.jsx');
  assert.match(panel, /hob_kind: e\.target\.value/, 'the Hob select writes params.hob_kind through updateUnitParams');
  assert.match(panel, /<option value="induction">Induction<\/option>/);
  assert.match(panel, /<option value="gas">Gas<\/option>/);
  assert.ok(!/650|750/.test(panel.match(/isHob && \([\s\S]*?\)\}/)?.[0]?.replace(/title="[^"]*"/, '') || ''), 'no number typed into the UI (the title quotes the profile)');
  const flight = read('src/lib/checkFindings.js');
  assert.match(flight, /subject\?\.store\?\.action/);
  assert.match(flight, /useProjectStore\.getState\(\)\[subject\.store\.action\]/);
  // And the store action is a function on the store.
  assert.equal(typeof S().raiseHoodToClearance, 'function');
  assert.equal(typeof S().proposeHoodClearance, 'function');
});
