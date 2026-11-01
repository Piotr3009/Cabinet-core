// === T78 - F21 - THE SPRAY SCHEDULE, ITS LAW, ITS PAGE AND THE PAINT ORDER ====
//
// The owner, 11.10.2026, element by element: the twenty rows of CLAUDE.md PART
// F, the waste (10 percent), the edges in the m2 for the paint and in lm beside
// it, the paint code grammar, the one-page Spraying document (information card,
// PART A elements by colour, PART B cards, PART C paint), the paint as a
// material of the warehouse's Paints department assigned in Assign Materials,
// the lines on the purchase list, the paint code on the CNC label.
//
// Every number asserted here is the law's arithmetic worked by hand on a known
// part; the engine's job is to agree. The Herbal Hill fixture (T71) is the
// walk's kitchen: the page lists every door, end panel and plinth of it, and
// the sum of three parts is checked against a hand sum.
//
// RUNS ON THE SHARED TREE once the integrator's T78 F21 patches are applied
// (profile.spray, the registry's paint parts, the BOM's paint hook, the store's
// setSprayNote). Until then the first test says which patch is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';
import {
  CARD_RULES, PAINT_PART_IDS, carcassSet2, elementLabel, lineKeyOf, litresFor, paintMaterialsFrom, paintOrderFor,
  paintPurchaseQtys, sprayAreaFor, sprayCodeFor, sprayRuleFor, sprayRules, sprayScheduleFor, tinsFor, unfoldBoard, unitIsOpen, withPaints,
} from '../src/engine/spray.js';
import { partLabelText } from '../src/engine/cnc/partLabel.js';
import { purchaseBom, projectPartUsage } from '../src/engine/bom.js';
import { PART_REGISTRY } from '../src/engine/partRegistry.js';
import { CSV_COLUMNS, migrateMaterial, paintOf, parseTinSizes, CATEGORIES } from '../src/engine/warehouse.js';
import { MODAL_KINDS } from '../src/lib/modalLayer.js';
import { buildOutputMenu } from '../src/lib/outputMenu.js';
import { spraySheets, unfoldedLayout } from '../src/engine/drawings/spraySheets.js';
import { assertPdfBytes, bookletDoc, pdfBytes } from '../src/lib/drawingExport.js';
import { hhUnits, HH_PROJECT, HH_ROOM } from './fixtures/t71-herbal-hill.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const near = (a, b, tol = 1e-4) => Math.abs(Number(a) - Number(b)) <= tol;
const m2 = (mm2) => Math.round(mm2 / 1e6 * 1e4) / 1e4;
const unitOf = (type, over = {}, num = 'U1') => {
  const params = { ...defaultParamsFor(type, P), unit_num: num, ...over };
  return { unit: { id: `u-${num}`, type, params, position: { wall: 0, x_mm: 0, rotation_deg: 0 } }, result: computeCabinet(params, P) };
};
const panelOf = (entry, pred) => entry.result.panels.find(pred);
const VENEER_DESIGN = migrateDesign({
  ...DEFAULT_DESIGN,
  carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: null, finish_id: null, source: 'veneer' }] },
});
/** A warehouse Paints row, as the warehouse model holds one. */
const PAINT_ROW = {
  id: 'wh-paint-1', item_number: '0042', name: 'Tikkurila Helmi 30 topcoat', category: 'paints', unit: 'L', cost_per_unit: 18.5,
  paint: { type: 'topcoat', sheen: '30', coverage_m2_per_l: 8, coats: 2, tin_sizes: '0.9, 2.7, 9' },
};

// --- the law in the profile -----------------------------------------------------

test('F21 - the numbers live in profile.spray: waste 10 and edges in m2 (owner 11.10.2026, decided), the defaults proposed, the twenty rows numbered 1 to 20', () => {
  assert.ok(P.spray, 'profile.spray: apply the T78 F21 profile patch (scratchpad/patches/f21-profile.patch)');
  assert.equal(P.spray.wastePct, 10);
  assert.equal(P.spray.edgesInM2, true);
  assert.equal(P.spray.frameMm, 100);
  assert.deepEqual(P.spray.defaults, { coats: 2, coverageM2PerL: 10, tinSizesL: [1, 2.5, 5] });
  const rules = sprayRules(P);
  const nos = Object.values(rules).map((r) => r.no).sort((a, b) => a - b);
  assert.deepEqual(nos, Array.from({ length: 20 }, (_, i) => i + 1), 'twenty rows, one number each');
  assert.equal(rules.island_end.as, 'end_panel', 'row 8 as 7');
  assert.equal(rules.back_panel.as, 'end_panel', 'row 9 as 7');
  assert.equal(rules.top_infill.as, 'infill', 'row 15 as 14');
  assert.equal(rules.upstand.none, true, 'row 18: not sprayed');
  const src = read('src/engine/profile.js');
  assert.match(src, /wastePct: 10, {2,}\/\/ owner 11\.10\.2026, decided/);
  assert.match(src, /defaults: \{ coats: 2, coverageM2PerL: 10, tinSizesL: \[1, 2\.5, 5\] \}/);
  assert.match(src, /T78 proposed, owner to confirm\. Read only where the paint's warehouse row says nothing/);
});

test('F21 - the paint code grammar, per rule', () => {
  const rules = sprayRules(P);
  assert.equal(rules.door.code, '2S + 4E');
  assert.equal(rules.drawer_front.code, '2S + 4E');
  assert.equal(rules.false_front.code, '2S + 4E');
  assert.equal(rules.blind_blank.code, '1S100 + 1E + 2E100');
  assert.equal(rules.front_moulding.code, '2E8');
  assert.equal(rules.inner_front.code, '2S + 4E');
  assert.equal(rules.end_panel.code, '1S + F100 + 4E');
  assert.equal(rules.mask.code, '1S + FE');
  assert.equal(rules.corner_post.code, '1S + 2E + TE');
  assert.equal(rules.free_panel.code, '2S + 4E');
  assert.equal(rules.plinth.code, '1S + TE');
  assert.equal(rules.infill.code, '1S + 1E');
  assert.equal(rules.cornice.code, 'ALL');
  assert.equal(rules.pelmet.code, 'ALL');
  assert.equal(rules.open_shelf25.code, 'ALL');
  assert.deepEqual(rules.carcass_set2.codes, { side: '1S + FE', horizontal: '1S + FE', back: '1S', shelf: 'ALL', partition: '2S + FE' });
});

// --- the twenty rules, each on a known part --------------------------------------

test('F21 - rows 1, 2, 3, 6, 12: both faces and four edges (door, drawer front, false front, inner front, free panel)', () => {
  const w = 597; const h = 767; const t = 25;
  const want = m2(2 * w * h + 2 * (w + h) * t);
  for (const id of ['door', 'drawer_front', 'false_front', 'inner_front', 'free_panel']) {
    const a = sprayAreaFor({ w, h, thickness: t }, { id, kind: null }, P);
    assert.ok(near(a.m2Each, want), `${id}: ${a.m2Each} vs ${want}`);
    assert.ok(near(a.edgesLm, 2 * (w + h) / 1000, 1e-3), `${id}: the lm beside the m2`);
    assert.equal(a.code, '2S + 4E');
    assert.ok(near(a.faceM2, m2(2 * w * h)) && near(a.edgeM2, m2(2 * (w + h) * t)), `${id}: edges counted in the m2`);
  }
  assert.equal(sprayRules(P).door.grooves, 'inside the face', 'row 1: grooves and recesses are inside the face, no extra area');
});

test('F21 - row 4: the blind blank is a 100 mm strip of the face at the door side, the door-side edge, the top and bottom edges for 100 mm', () => {
  const a = sprayAreaFor({ w: 626, h: 767, thickness: 25 }, { id: 'blind_blank', kind: null }, P);
  const want = m2(100 * 767 + 767 * 25 + 2 * 100 * 25);
  assert.ok(near(a.m2Each, want), `${a.m2Each} vs ${want}`);
  assert.equal(a.code, '1S100 + 1E + 2E100');
  assert.ok(near(a.edgesLm, (767 + 200) / 1000, 1e-3));
});

test('F21 - row 5: an applied moulding strip adds its two 8 mm sides, painted after gluing; the face is the door\'s', () => {
  const a = sprayAreaFor({ w: 500, h: 40, thickness: 8 }, { id: 'front_moulding', kind: null }, P);
  assert.ok(near(a.m2Each, m2(2 * 500 * 8)), `${a.m2Each}`);
  assert.equal(a.faceM2, 0, 'no face of its own on the list');
  assert.equal(a.code, '2E8');
  assert.equal(sprayRules(P).front_moulding.afterGluing, true);
  assert.equal(sprayRules(P).front_moulding.sideMm, 8);
});

test('F21 - rows 7, 8, 9: the end panel, the island end and the island back panel: visible face, four edges, a 100 mm frame on the back', () => {
  const w = 596; const h = 870; const t = 25;
  const frame = w * h - (w - 200) * (h - 200);
  const want = m2(w * h + 2 * (w + h) * t + frame);
  for (const id of ['end_panel', 'island_end', 'back_panel']) {
    const a = sprayAreaFor({ w, h, thickness: t }, { id, kind: null }, P);
    assert.ok(near(a.m2Each, want), `${id}: ${a.m2Each} vs ${want}`);
    assert.equal(a.code, '1S + F100 + 4E');
    assert.ok(near(a.extraM2, m2(frame)), 'the frame, broken out');
  }
});

test('F21 - rows 10, 11, 13, 14, 15: mask, corner post, plinth, side infill, top infill', () => {
  const mask = sprayAreaFor({ w: 600, h: 410, thickness: 25 }, { id: 'mask', kind: null }, P);
  assert.ok(near(mask.m2Each, m2(600 * 410 + 600 * 25)));
  assert.equal(mask.code, '1S + FE');
  const post = sprayAreaFor({ w: 40, h: 770, thickness: 25 }, { id: 'corner_post', kind: null }, P);
  assert.ok(near(post.m2Each, m2(40 * 770 + 2 * 770 * 25 + 40 * 25)));
  assert.equal(post.code, '1S + 2E + TE');
  const plinth = sprayAreaFor({ w: 600, h: 100, thickness: 18 }, { id: 'plinth', kind: null }, P);
  assert.ok(near(plinth.m2Each, m2(600 * 100 + 600 * 18)));
  assert.equal(plinth.code, '1S + TE');
  assert.ok(near(plinth.edgesLm, 0.6, 1e-3));
  const side = sprayAreaFor({ w: 60, h: 870, thickness: 18 }, { id: 'infill', kind: null }, P);
  assert.ok(near(side.m2Each, m2(60 * 870 + 870 * 18)), 'a side filler: its long edge is the one toward the unit');
  const top = sprayAreaFor({ w: 620, h: 100, thickness: 18 }, { id: 'top_infill', kind: null }, P);
  assert.ok(near(top.m2Each, m2(620 * 100 + 620 * 18)), 'the top strip: its length is the edge toward the unit');
  assert.equal(top.code, '1S + 1E');
});

test('F21 - rows 16, 17, 18, 19, 20: cornice all around by its perimeter, pelmet all around, upstand none, carcass set 2 inside faces, open shelves all around', () => {
  const cornice = sprayAreaFor({ w: 1200, h: 70, thickness: 48 }, { id: 'cornice', kind: null }, P);
  assert.ok(near(cornice.m2Each, m2(2 * (70 + 48) * 1200)), `cornice ${cornice.m2Each}`);
  assert.equal(cornice.code, 'ALL');
  const pelmet = sprayAreaFor({ w: 600, h: 50, thickness: 18 }, { id: 'pelmet', kind: null }, P);
  assert.ok(near(pelmet.m2Each, m2(2 * 600 * 50 + 2 * 650 * 18)));
  assert.equal(sprayRuleFor({ role: 'upstand', part: 'UPSTAND', w: 600, h: 100, thickness: 20 }, { profile: P }), null, 'row 18: worktop material, not sprayed');
  const sideB = sprayAreaFor({ w: 540, h: 770, thickness: 18 }, { id: 'carcass_set2', kind: 'side' }, P);
  assert.ok(near(sideB.m2Each, m2(540 * 770 + 770 * 18)), 'a side: the inside face and the front edge');
  assert.equal(sideB.code, '1S + FE');
  const back = sprayAreaFor({ w: 600, h: 770, thickness: 18 }, { id: 'carcass_set2', kind: 'back' }, P);
  assert.ok(near(back.m2Each, m2(600 * 770)), 'the back: its inside face only');
  assert.equal(back.code, '1S');
  const shelf = sprayAreaFor({ w: 560, h: 362, thickness: 18 }, { id: 'carcass_set2', kind: 'shelf' }, P);
  assert.ok(near(shelf.m2Each, m2(2 * 560 * 362 + 2 * 922 * 18)), 'shelves all around');
  assert.equal(shelf.code, 'ALL');
  const open = sprayAreaFor({ w: 900, h: 300, thickness: 25 }, { id: 'open_shelf25', kind: null }, P);
  assert.ok(near(open.m2Each, m2(2 * 900 * 300 + 2 * 1200 * 25)));
  assert.equal(open.code, 'ALL');
});

// --- the rules on the engine's own panels -----------------------------------------

test('F21 - the engine\'s panels fall under the right rule: door, drawer front, D/W and hob dummies, blank and post, inner front, mask, plinth, infills, end panel, free panel, open shelves', () => {
  const bud = unitOf('BUD', { plinth: true, end_panels: [{ side: 'L' }], top_infill_mm: 80, side_infill_left_mm: 40 });
  const rule = (entry, pred, ctx = {}) => sprayRuleFor(panelOf(entry, pred), { profile: P, ...ctx })?.id ?? null;
  assert.equal(rule(bud, (p) => p.part === 'FRONT'), 'door');
  assert.equal(rule(bud, (p) => p.part === 'PLINTH'), 'plinth');
  assert.equal(rule(bud, (p) => p.part === 'END-PANEL'), 'end_panel');
  assert.equal(rule(bud, (p) => p.id === 'INFILL-T-FACE'), 'top_infill');
  assert.equal(rule(bud, (p) => p.id === 'INFILL-L-FACE'), 'infill');
  assert.equal(rule(bud, (p) => p.part === 'BUL'), null, 'a side of a board carcass: not sprayed');
  assert.equal(rule(bud, (p) => p.part === 'BUL', { set2: true }), 'carcass_set2');
  assert.equal(sprayRuleFor(panelOf(bud, (p) => p.part === 'BUL'), { profile: P, set2: true }).kind, 'side');
  assert.equal(rule(bud, (p) => p.part === 'BACK', { set2: true }), 'carcass_set2');
  const budr = unitOf('BUDR');
  assert.equal(rule(budr, (p) => p.part === 'DRAWER-FRONT'), 'drawer_front');
  assert.equal(rule(budr, (p) => p.part === 'DRAWER-SIDE'), null, 'drawer boxes: not on the list');
  assert.equal(rule(budr, (p) => p.part === 'DRAWER-SIDE', { set2: true }), null, 'not even in set 2');
  const dw = unitOf('DW_PANEL');
  assert.equal(rule(dw, (p) => p.part === 'FRONT'), 'false_front', 'the D/W front is a dummy over a machine (row 3)');
  const hob = unitOf('BUDR_HOB');
  assert.equal(rule(hob, (p) => p.part === 'FALSE-FRONT'), 'false_front');
  const blind = unitOf('BLIND_BASE');
  assert.equal(rule(blind, (p) => p.part === 'BLIND-BLANK'), 'blind_blank');
  assert.equal(rule(blind, (p) => p.part === 'CORNER-POST'), 'corner_post');
  const budInt = unitOf('BUD_INT');
  assert.equal(rule(budInt, (p) => p.role === 'drawer_front'), 'inner_front');
  const wud = unitOf('WUD', { bottom_mask: true });
  assert.equal(rule(wud, (p) => p.part === 'MASK'), 'mask');
  const free = unitOf('FREE_PANEL');
  assert.equal(rule(free, (p) => p.part === 'FREE-PANEL'), 'free_panel');
  const open = unitOf('WUD', { doors: { count: 0 }, shelves: 2 });
  assert.equal(unitIsOpen(open.result), true);
  assert.equal(unitIsOpen(wud.result), false);
  assert.equal(rule(open, (p) => p.part === 'SHELF', { openUnit: true }), 'open_shelf25', 'row 20: the shelves of an open unit');
  assert.equal(rule(wud, (p) => p.part === 'BUL'), null);
  assert.equal(elementLabel({ id: 'corner_post' }), 'Corner post 40');
  assert.equal(elementLabel({ id: 'carcass_set2', kind: 'back' }), 'Carcass back, inside face');
});

// --- the schedule of the Herbal Hill kitchen ---------------------------------------

/** The T71 fixture with an end panel at each end of the base run (T71's set has them drawn). */
function herbalHill() {
  return hhUnits(P).map((u) => {
    const over = u.params.unit_num === '01' ? { end_panels: [{ side: 'L' }] } : (u.params.unit_num === '07' ? { end_panels: [{ side: 'R' }] } : {});
    const params = { ...u.params, ...over };
    return { unit: { ...u, params }, result: computeCabinet(params, P) };
  });
}

test('F21 - Herbal Hill: the page lists every door, every end panel and every plinth of the job, grouped under one colour, numbered down the page', () => {
  const entries = herbalHill();
  const s = sprayScheduleFor({ entries, design: DEFAULT_DESIGN, profile: P, project: HH_PROJECT, date: '12.10.2026' });
  const count = (pred) => entries.reduce((n, e) => n + e.result.panels.filter(pred).length, 0);
  const qty = (ruleId) => s.lines.filter((l) => l.ruleId === ruleId).reduce((n, l) => n + l.qty, 0);
  const doors = count((p) => p.part === 'FRONT' && p.role === 'front' && !p.meta?.appliance);
  assert.ok(doors >= 12, `the kitchen has ${doors} doors`);
  assert.equal(qty('door'), doors, 'every door');
  assert.equal(qty('false_front'), count((p) => p.part === 'FRONT' && p.meta?.appliance), 'the D/W front, as a dummy');
  assert.equal(qty('drawer_front'), count((p) => p.part === 'DRAWER-FRONT'), 'every drawer front');
  assert.equal(qty('end_panel'), 2, 'both end panels');
  assert.equal(qty('plinth'), count((p) => p.part === 'PLINTH'), 'every plinth');
  assert.ok(qty('plinth') >= 6);
  assert.equal(s.groups.length, 1, 'one front finish, one colour group');
  assert.equal(s.groups[0].set, 1);
  assert.deepEqual(s.lines.map((l) => l.no), s.lines.map((_, i) => i + 1), 'numbered down the page');
  // Identical parts collapse into one line with Qty, and the units are named on it.
  const budDoors = s.lines.find((l) => l.ruleId === 'door' && l.units.includes('01'));
  assert.ok(budDoors.qty >= 3, 'the three 520 BUD doors on one line');
  assert.ok(budDoors.units.includes('02') && budDoors.units.includes('03'));
  assert.equal(s.info.project, HH_PROJECT.name);
  assert.equal(s.info.number, HH_PROJECT.number);
  assert.equal(s.info.date, '12.10.2026');
  assert.equal(s.info.sets.set2, false, 'an EGGER carcass: set 2 off');
  assert.equal(s.info.colours.length, 1);
  assert.ok(s.lines.every((l) => l.code), 'every line carries its paint code');
});

test('F21 - Herbal Hill: the sum matches a hand sum of three parts (a BUD door, the end panel, a plinth), and the total is the sum of the lines', () => {
  const entries = herbalHill();
  const s = sprayScheduleFor({ entries, design: DEFAULT_DESIGN, profile: P, project: HH_PROJECT });
  const u01 = entries.find((e) => e.unit.params.unit_num === '01');
  const door = panelOf(u01, (p) => p.part === 'FRONT');
  const end = panelOf(u01, (p) => p.part === 'END-PANEL');
  const plinth = panelOf(u01, (p) => p.part === 'PLINTH');
  const hand = {
    door: m2(2 * door.w * door.h + 2 * (door.w + door.h) * door.thickness),
    end: m2(end.w * end.h + 2 * (end.w + end.h) * end.thickness + (end.w * end.h - (end.w - 200) * (end.h - 200))),
    plinth: m2(plinth.w * plinth.h + plinth.w * plinth.thickness),
  };
  const line = (ruleId, w, h) => s.lines.find((l) => l.ruleId === ruleId && near(l.w, w, 0.01) && near(l.h, h, 0.01));
  const ld = line('door', door.w, door.h); const le = line('end_panel', end.w, end.h); const lp = line('plinth', plinth.w, plinth.h);
  assert.ok(ld && le && lp, 'the three lines are on the page');
  assert.ok(near(ld.m2Each, hand.door), `door ${ld.m2Each} vs ${hand.door}`);
  assert.ok(near(le.m2Each, hand.end), `end panel ${le.m2Each} vs ${hand.end}`);
  assert.ok(near(lp.m2Each, hand.plinth), `plinth ${lp.m2Each} vs ${hand.plinth}`);
  assert.ok(near(ld.m2Each + le.m2Each + lp.m2Each, hand.door + hand.end + hand.plinth, 3e-4), 'the hand sum of the three');
  assert.ok(near(s.totals.m2, s.lines.reduce((a, l) => a + l.m2, 0), 1e-3), 'the total is the sum of the lines');
  assert.ok(near(s.totals.edgesLm, s.lines.reduce((a, l) => a + l.edgesLm, 0), 1e-2), 'and so is the lm');
  assert.ok(near(ld.m2, ld.m2Each * ld.qty, 1e-3), 'm2 = each x qty');
  assert.ok(near(ld.edgesLm, 2 * (door.w + door.h) / 1000 * ld.qty, 1e-2), 'edges lm = perimeter x qty');
});

test('F21 - the cards: one per rule present that is not all around, open, the board unfolded with the painted areas, the numbers (100), the breakdown and the parts under it', () => {
  const entries = herbalHill();
  const s = sprayScheduleFor({ entries, design: DEFAULT_DESIGN, profile: P, project: HH_PROJECT });
  const ids = s.cards.map((c) => c.ruleId);
  assert.ok(ids.includes('end_panel') && ids.includes('plinth'), `cards for the end panel and the plinth: ${ids}`);
  assert.ok(!ids.includes('door'), 'a door is painted all around: no card');
  for (const id of ids) assert.ok(CARD_RULES.includes(id));
  const end = s.cards.find((c) => c.ruleId === 'end_panel');
  assert.equal(end.rule.backFrameMm, 100, 'the rule\'s number on the card');
  assert.equal(end.unfolded.back.painted, 'frame');
  assert.equal(end.unfolded.back.frameMm, 100);
  assert.equal(end.unfolded.face.painted, 'all');
  assert.deepEqual(end.unfolded.edges, { top: 'all', bottom: 'all', left: 'all', right: 'all' });
  assert.equal(end.unfolded.edgesExaggerated, true, 'edges drawn thicker than true, and said so');
  assert.deepEqual(end.lines[0].breakdown.map((b) => b.label), ['visible face', '4 edges', '100 mm frame on the back']);
  assert.ok(end.lines.length >= 1 && end.lines.every((l) => l.units.length >= 1), 'the parts of this job under the card');
  const plinth = s.cards.find((c) => c.ruleId === 'plinth');
  assert.deepEqual(plinth.unfolded.edges, { top: 'all', bottom: 'none', left: 'none', right: 'none' });
  assert.equal(plinth.unfolded.back.painted, 'none');
  const blank = unfoldBoard('blind_blank', { w: 626, h: 767, t: 25 }, P);
  assert.equal(blank.face.painted, 'strip');
  assert.equal(blank.face.stripMm, 100);
  assert.deepEqual(blank.edges, { top: '100', bottom: '100', left: 'all', right: 'none' });
  const strip = unfoldBoard('front_moulding', { w: 500, h: 40, t: 8 }, P);
  assert.equal(strip.numbers.sideMm, 8);
  // The drawing: face and back side by side, edges round the face, the painted
  // regions filled; a layout the screen (SVG) and the paper (PDF) both draw.
  const lay = unfoldedLayout(end.unfolded, { w: 300, h: 150 });
  assert.ok(lay.width <= 300 + 1e-6 && lay.height <= 150 + 1e-6, 'fits the box');
  assert.ok(lay.edgeDrawnMm >= end.unfolded.t, 'edges drawn at least as thick as true');
  assert.match(lay.note, /drawn .* wide for the eye/);
  const kinds = lay.items.map((i) => i.kind);
  assert.ok(kinds.includes('face') && kinds.includes('back') && kinds.filter((k) => k === 'edge').length === 4);
  assert.equal(lay.items.filter((i) => i.kind === 'region' && i.painted).length, 4, 'the four bands of the frame on the back');
  assert.equal(lay.items.find((i) => i.kind === 'back').painted, false, 'the back inside the frame is bare');
  assert.equal(lay.items.find((i) => i.kind === 'face').painted, true);
});

test('F21 - Set 2 appears for a veneer carcass: the carcass boards join the schedule under the carcass colour with their own codes; an EGGER carcass has none', () => {
  const bud = unitOf('BUD', { plinth: true });
  assert.equal(carcassSet2(bud.unit, DEFAULT_DESIGN, P), false);
  assert.equal(carcassSet2(bud.unit, VENEER_DESIGN, P), true);
  const plain = sprayScheduleFor({ entries: [bud], design: DEFAULT_DESIGN, profile: P });
  assert.equal(plain.info.sets.set2, false);
  assert.equal(plain.lines.filter((l) => l.set === 2).length, 0);
  const veneer = sprayScheduleFor({ entries: [bud], design: VENEER_DESIGN, profile: P });
  assert.equal(veneer.info.sets.set2, true);
  const set2 = veneer.lines.filter((l) => l.set === 2);
  assert.ok(set2.length >= 3, 'sides, top/bottom and the back');
  assert.ok(set2.some((l) => l.element === 'Carcass side' && l.code === '1S + FE'));
  assert.ok(set2.some((l) => l.element === 'Carcass back, inside face' && l.code === '1S'));
  assert.ok(!set2.some((l) => l.element.startsWith('Drawer')), 'no drawer box in set 2');
  assert.ok(veneer.groups.some((g) => g.set === 2), 'grouped under the carcass finish');
  assert.ok(veneer.paint.some((p) => p.set === 2 && p.partId === PAINT_PART_IDS[2]), 'set 2 has its own paint line');
  assert.equal(veneer.lines.filter((l) => l.set === 1).length, plain.lines.length, 'set 1 is untouched by it');
});

// --- the paint ------------------------------------------------------------------

test('F21 - litres = m2 x coats / coverage plus 10 percent waste; tins rounded UP to the material\'s sizes', () => {
  assert.equal(litresFor(10, { coats: 2, coverage: 10, wastePct: 10 }), 2.2);
  assert.equal(litresFor(60, { coats: 2, coverage: 10, wastePct: 10 }), 13.2);
  assert.equal(litresFor(0, { coats: 2, coverage: 10, wastePct: 10 }), 0);
  assert.deepEqual(tinsFor(2.2, [1, 2.5, 5]), [{ sizeL: 2.5, count: 1 }]);
  assert.deepEqual(tinsFor(13.2, [1, 2.5, 5]), [{ sizeL: 5, count: 3 }], 'two fives and the 3.2 remainder needs a third five');
  assert.deepEqual(tinsFor(13.2, [1, 2.5]), [{ sizeL: 2.5, count: 5 }, { sizeL: 1, count: 1 }]);
  assert.deepEqual(tinsFor(0.4, [1, 2.5, 5]), [{ sizeL: 1, count: 1 }]);
  assert.deepEqual(tinsFor(0, [1]), []);
  for (const [l, sizes] of [[2.2, [1, 2.5, 5]], [13.2, [1, 2.5]], [7.01, [0.9, 2.7, 9]]]) {
    const got = tinsFor(l, sizes).reduce((s, t) => s + t.sizeL * t.count, 0);
    assert.ok(got >= l - 1e-9, `${l} L: ${got} ordered, never under`);
  }
});

test('F21 - PART C per colour: the m2 with the edges in it, coats, coverage, waste, litres, tins, which material; the profile\'s defaults where nothing is assigned, and a missing price is SAID', () => {
  const bud = unitOf('BUD', { plinth: true });
  const unassigned = sprayScheduleFor({ entries: [bud], design: DEFAULT_DESIGN, profile: P });
  assert.equal(unassigned.paint.length, 1);
  const p0 = unassigned.paint[0];
  assert.equal(p0.set, 1);
  assert.equal(p0.coats, 2);
  assert.equal(p0.coverage, 10);
  assert.equal(p0.wastePct, 10);
  assert.ok(near(p0.m2, unassigned.groups[0].m2));
  assert.equal(p0.litres, litresFor(p0.m2, { coats: 2, coverage: 10, wastePct: 10 }));
  assert.equal(p0.material, null);
  assert.equal(p0.priceMissing, true);
  assert.match(p0.says, /No paint assigned to set 1/);
  // A warehouse paint assigned to set 1: its own coverage, coats and tin sizes, its price.
  const materials = withPaints([], [PAINT_ROW]);
  const assignments = { base: { paint_fronts: { material_id: 'wh-paint-1', yield: 1 } } };
  const priced = sprayScheduleFor({ entries: [bud], design: DEFAULT_DESIGN, profile: P, materials, assignments });
  const p1 = priced.paint[0];
  assert.equal(p1.material.name, PAINT_ROW.name);
  assert.equal(p1.material.type, 'topcoat');
  assert.equal(p1.coats, 2);
  assert.equal(p1.coverage, 8);
  assert.equal(p1.litres, litresFor(p1.m2, { coats: 2, coverage: 8, wastePct: 10 }));
  assert.deepEqual(p1.tins.map((t) => t.sizeL).every((s) => [0.9, 2.7, 9].includes(s)), true, 'the material\'s own tin sizes');
  assert.equal(p1.priceMissing, false);
  assert.equal(p1.pricePerUnit, 18.5);
  assert.ok(near(p1.cost, p1.orderedL * 18.5, 1e-6));
  assert.equal(p1.says, '');
  // The same row without a price: assigned, counted, and the absence said.
  const unpriced = withPaints([], [{ ...PAINT_ROW, cost_per_unit: null }]);
  const p2 = sprayScheduleFor({ entries: [bud], design: DEFAULT_DESIGN, profile: P, materials: unpriced, assignments }).paint[0];
  assert.equal(p2.priceMissing, true);
  assert.equal(p2.cost, null);
  assert.match(p2.says, /no price on the warehouse row/);
  assert.ok(p2.litres > 0, 'the litres are still counted');
  // paintOrderFor on the groups alone agrees with the schedule's own.
  assert.deepEqual(paintOrderFor(priced.groups, { profile: P, assignments, materials }), priced.paint);
});

test('F21 - the paint as a material: the warehouse\'s Paints department rows reach the picker as `paint` stock, with their five fields; the CSV keeps PC\'s twelve columns', () => {
  assert.ok(CATEGORIES.some((c) => c.id === 'paints' && c.label === 'Paints'));
  assert.equal(CSV_COLUMNS.length, 12, 'the interchange with PC: twelve columns, no thirteenth');
  assert.ok(!CSV_COLUMNS.includes('paint'));
  const row = migrateMaterial(PAINT_ROW);
  assert.deepEqual(paintOf(row), { type: 'topcoat', sheen: '30', coverage_m2_per_l: 8, coats: 2, tin_sizes: '0.9, 2.7, 9', tin_sizes_l: [0.9, 2.7, 9] });
  assert.equal(paintOf(migrateMaterial({ name: 'MDF 18', category: 'sheets' })), null, 'a board carries no paint record');
  assert.deepEqual(parseTinSizes('5; 1, 2.5, 1'), [1, 2.5, 5], 'sorted, no doubles, a comma or a semicolon between');
  assert.deepEqual(parseTinSizes([1, 1, 2.5]), [1, 2.5]);
  const stock = paintMaterialsFrom([PAINT_ROW, { id: 'x', name: 'MDF', category: 'sheets' }, { id: 'y', name: '', category: 'paints' }]);
  assert.equal(stock.length, 1, 'paints only, and only named ones');
  assert.equal(stock[0].category, 'paint');
  assert.equal(stock[0].price, 18.5);
  assert.equal(stock[0].unit, 'L');
  const merged = withPaints([{ id: 'm1', name: 'Board', category: 'board' }], [PAINT_ROW]);
  assert.deepEqual(merged.map((m) => m.id), ['m1', 'wh-paint-1']);
  assert.equal(withPaints(merged, [PAINT_ROW]).length, 2, 'a paint already in the list is not doubled');
  // The registry parts the paint is bought under, consumable, by the litre, offered the paint category.
  for (const id of Object.values(PAINT_PART_IDS)) {
    assert.ok(PART_REGISTRY[id], `${id}: apply the T78 F21 partRegistry patch`);
    assert.equal(PART_REGISTRY[id].unit, 'L');
    assert.equal(PART_REGISTRY[id].materialType, 'paint');
    assert.equal(PART_REGISTRY[id].group, 'consumable');
  }
});

test('F21 - the lines go to BOM > Purchase list: an unassigned paint line with the litres, an assigned one priced, and the Assign modal sees the paint parts as used', () => {
  const bud = unitOf('BUD', { plinth: true });
  const qtys = paintPurchaseQtys([bud], { design: DEFAULT_DESIGN, profile: P });
  assert.ok(qtys.paint_fronts && qtys.paint_fronts.pcs > 0 && qtys.paint_fronts.unit === 'L');
  assert.equal(qtys.paint_carcass, undefined, 'no set 2 on a board carcass');
  const bare = purchaseBom([bud], { assignments: null, materials: [], profile: P, design: DEFAULT_DESIGN });
  const line = bare.rows.find((r) => r.key === 'part:paint_fronts');
  assert.ok(line, 'apply the T78 F21 bom patch: the paint hook in mergeUnitMaterials');
  assert.equal(line._assigned, false);
  assert.equal(line.unit, 'L');
  assert.ok(near(line.qty, qtys.paint_fronts.pcs, 1e-6));
  assert.equal(bare.totals.complete, false, 'a BOM with the paint unassigned is not a confident total');
  const materials = withPaints([], [PAINT_ROW]);
  const assignments = { base: { paint_fronts: { material_id: 'wh-paint-1', yield: 1 } } };
  const priced = purchaseBom([bud], { assignments, materials, profile: P, design: DEFAULT_DESIGN });
  const mat = priced.rows.find((r) => r.key === 'mat:wh-paint-1');
  assert.ok(mat, 'the paint line under its material');
  assert.equal(mat._assigned, true);
  assert.equal(mat.costPerUnit, 18.5);
  assert.ok(mat.parts.includes('paint_fronts'));
  const litres = sprayScheduleFor({ entries: [bud], design: DEFAULT_DESIGN, profile: P, materials, assignments }).paint[0].litres;
  assert.ok(near(mat.qty, litres, 1e-6), 'the litres read the assigned paint\'s own coverage and coats');
  assert.ok(near(mat.lineCost, litres * 18.5, 1e-2));
  const veneer = purchaseBom([bud], { assignments: null, materials: [], profile: P, design: VENEER_DESIGN });
  assert.ok(veneer.rows.some((r) => r.key === 'part:paint_carcass'), 'a veneer carcass buys set 2 paint');
  const usage = projectPartUsage([bud], { profile: P, design: DEFAULT_DESIGN });
  assert.ok(usage.paint_fronts && usage.paint_fronts.qty > 0, 'the Assign Materials modal lists the paint as used by this job');
});

// --- the label, the menu, the registry, the note ----------------------------------

test('F21 - the CNC part label carries the paint code beside the part number, compact; a carcass board of set 1 carries none, of set 2 its own', () => {
  const bud = unitOf('BUD', { plinth: true, end_panels: [{ side: 'L' }] }, 'F-01');
  const door = panelOf(bud, (p) => p.part === 'FRONT');
  const end = panelOf(bud, (p) => p.part === 'END-PANEL');
  const bul = panelOf(bud, (p) => p.part === 'BUL');
  const plinth = panelOf(bud, (p) => p.part === 'PLINTH');
  assert.equal(partLabelText('F-01', door), `F-01 F ${Math.round(door.w)}x${Math.round(door.h)} 2S+4E`);
  assert.equal(partLabelText('F-01', end), `F-01 END-L ${Math.round(end.w)}x${Math.round(end.h)} 1S+F100+4E`);
  assert.equal(partLabelText('F-01', plinth), `F-01 PLINTH ${Math.round(plinth.w)}x${Math.round(plinth.h)} 1S+TE`);
  assert.equal(partLabelText('F-01', bul), `F-01 BUL ${Math.round(bul.w)}x${Math.round(bul.h)}`, 'a board carcass side: no code, no label moves');
  assert.equal(partLabelText('F-01', bul, { set2: true }), `F-01 BUL ${Math.round(bul.w)}x${Math.round(bul.h)} 1S+FE`);
  assert.equal(partLabelText('F-01', { id: 'BUR', w: 597, h: 568 }), 'F-01 BUR 597x568', 'turn 17\'s own example, untouched');
  assert.equal(sprayCodeFor(door, { profile: P }), '2S+4E');
  assert.equal(sprayCodeFor(bul, { profile: P }), '');
});

test('F21 - Output > Spraying... and the Spraying button open one registered window; the note is typed per line key and rides the project', () => {
  // AMENDED BY T-CC1b F5: Output > Spraying... is deleted (*"Output tylko: cutting list, BOM PDF, labels 21 i 44"*,
  // the owner, 01.11.2026); the Spraying menu's own button is the one door to the page.
  const menu = buildOutputMenu({});
  assert.equal(menu.items.find((i) => i.label === 'Spraying\u2026'), undefined, 'Output carries no Spraying...');
  assert.ok(MODAL_KINDS.spraying, 'the registry knows the window');
  assert.equal(MODAL_KINDS.spraying.about, 'project');
  const top = read('src/components/TopBar.jsx');
  assert.ok(!/label: 'Spraying', soon: true/.test(top), 'apply the T78 F21 TopBar patch: the placeholder is a button now');
  assert.match(top, /openModal\('spraying'/);
  assert.match(read('src/pages/ConfiguratorPage.jsx'), /modal === 'spraying' && <SprayingPanel \/>/, 'apply the T78 F21 ConfiguratorPage patch');
  const panel = read('src/components/SprayingPanel.jsx');
  assert.match(panel, /<Modal\s[\s\S]*?name="spraying"/);
  assert.match(panel, /data-spray-export-pdf="1"/);
  // The store's note.
  const S = useProjectStore.getState();
  assert.equal(typeof S.setSprayNote, 'function', 'apply the T78 F21 projectStore patch');
  S.loadProject({ ...HH_PROJECT, id: 'hh-f21', room: HH_ROOM }, hhUnits(P));
  const entries = useProjectStore.getState().allResults();
  const design = useProjectStore.getState().project.design;
  const bare = sprayScheduleFor({ entries, design, profile: P, project: HH_PROJECT });
  const doorLine = bare.lines.find((l) => l.ruleId === 'door' && l.units.includes('01'));
  assert.ok(doorLine, 'the store\'s own results carry unit 01\'s door line');
  assert.equal(doorLine.key, lineKeyOf({ colourKey: doorLine.colour.key, ruleId: 'door', kind: null, w: doorLine.w, h: doorLine.h, t: doorLine.t, code: doorLine.code }), 'the key is the line\'s own: colour, rule, size, code');
  const key = doorLine.key;
  useProjectStore.getState().setSprayNote(key, '  two coats, check the back  ');
  assert.equal(useProjectStore.getState().project.sprayNotes[key], 'two coats, check the back', 'trimmed, stored');
  const s = sprayScheduleFor({ entries, design, profile: P, notes: useProjectStore.getState().project.sprayNotes, project: HH_PROJECT });
  const noted = s.lines.find((l) => l.key === key);
  assert.ok(noted);
  assert.equal(noted.note, 'two coats, check the back', 'printed on the line');
  useProjectStore.getState().setSprayNote(key, '');
  assert.equal(useProjectStore.getState().project.sprayNotes[key], undefined, 'an emptied note is removed');
});

// --- the PDF ---------------------------------------------------------------------

test('F21 - Export PDF: the same page, A3 landscape sheets in the T71 frame (information card, PART A, the cards, PART C), a page per sheet, measured as bytes', () => {
  const entries = herbalHill();
  const s = sprayScheduleFor({ entries, design: DEFAULT_DESIGN, profile: P, project: HH_PROJECT, date: '12.10.2026' });
  const pages = spraySheets({ schedule: s, project: HH_PROJECT, profile: P, date: '12.10.2026' });
  assert.ok(pages.length >= 3, `A, the cards, C: ${pages.length} sheets`);
  for (const p of pages) {
    assert.equal(p.sheet.width, 420, 'A3');
    assert.equal(p.sheet.height, 297, 'landscape');
    assert.ok(p.sheet.entities.length > 20);
    assert.equal(p.sheet.sheetOf, String(pages.length).padStart(2, '0'));
  }
  const texts = (p) => p.sheet.entities.filter((e) => e.kind === 'text').map((e) => String(e.text));
  assert.ok(texts(pages[0]).includes('SPRAYING INFORMATION'));
  assert.ok(texts(pages[0]).includes('PART A - ELEMENTS, BY COLOUR'));
  assert.ok(texts(pages[0]).some((t) => t === HH_PROJECT.name), 'the project in the card and the title strip');
  assert.ok(texts(pages[0]).includes('2S + 4E'), 'a door\'s code on paper');
  assert.ok(texts(pages[0]).some((t) => t === '01 / ' + String(pages.length).padStart(2, '0')), 'the sheet stamp');
  const cardsPage = pages.find((p) => p.name === 'Spraying, cards');
  assert.ok(cardsPage, 'the cards sheet');
  assert.ok(texts(cardsPage).some((t) => /^7\. End panel/.test(t)));
  assert.ok(cardsPage.sheet.entities.some((e) => e.kind === 'rect' && e.fill && e.fill !== 'white'), 'painted areas filled');
  assert.ok(texts(cardsPage).some((t) => /Edges drawn .* wide for the eye/.test(t)), 'the exaggeration is said');
  const paint = pages[pages.length - 1];
  assert.equal(paint.name, 'Spraying, paint');
  assert.ok(texts(paint).includes('PART C - PAINT, PER COLOUR'));
  assert.ok(texts(paint).includes('NOT ASSIGNED'), 'the missing paint is said on paper');
  const doc = bookletDoc(pages.map((p) => p.sheet));
  assert.equal(doc.getNumberOfPages(), pages.length, 'a page per sheet');
  const measured = assertPdfBytes(pdfBytes(doc), { pages: doc.getNumberOfPages(), sheets: pages.length, what: 'The spraying PDF' });
  assert.ok(measured.bytes > 2000);
});

test('F21 - plain ASCII in everything this F writes', () => {
  for (const rel of ['src/engine/spray.js', 'src/engine/drawings/spraySheets.js', 'src/lib/sprayExport.js', 'src/components/SprayingPanel.jsx', 'test/turn78-f21-spray.test.js', 'scripts/t78-walk-f21.mjs', 'supabase/migrations/t78_warehouse_paint.sql']) {
    const bad = [...read(rel)].filter((c) => c.charCodeAt(0) > 0x7e || (c.charCodeAt(0) < 0x20 && c !== '\n'));
    assert.equal(bad.length, 0, `${rel}: non-ASCII ${JSON.stringify([...new Set(bad)].slice(0, 5))}`);
  }
});
