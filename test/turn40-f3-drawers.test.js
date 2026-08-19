// ─── TURN 40 (CLAUDE.md F3): THE 30 mm STRIP, AND OVERLAY DRAWERS ───────────
//
// F3a — the owner, 18.08.2026: *"jak nie ma drzwi w ogóle, to nie powinno
// robić 30 mm odstępu infill na zawiasy — dopiero po wstawieniu drzwi
// (ważne)."*
//
// F3b — *"nadal nie mamy szuflad nawierzchniowych — w sensie żeby były na
// wierzchu, czyli bez infilla, fronty na szafie, drzwi powyżej szuflad."*
//
// CLAUDE.md's named tests, in as many words:
//   F3a  same cabinet, doors off → front width grows by the strip; doors on →
//        back to today's number.
//   F3b  stack at the bottom; fixed shelf above it; door height = carcass minus
//        stack minus gap; equal default heights; no 30 mm strip under any
//        combination of doors on/off; runner rows match BUDR at the same
//        drawer height.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet, minDrawerFrontHeight } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { topDemandMm } from '../src/engine/doors.js';
import {
  overlayDrawerItems, overlayHeights, overlayPlan, overlayStackTop, standsOnOverlayStack,
} from '../src/engine/overlayDrawers.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const G = P.board.thickness;
const GAP = P.baseDrawerUnit.gap;

const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, height: 2150, ...over,
}, P);

const internalStack = (over = {}) => wardrobe({
  sections: [{ items: [{ id: 'd1', kind: 'drawer', index: 1 }, { id: 'd2', kind: 'drawer', index: 2 }] }],
  ...over,
});

const overlayStack = (n = 3, over = {}) => wardrobe({
  sections: [{
    items: Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, kind: 'overlay_drawer', index: i + 1 })),
  }],
  ...over,
});

const strip = (r) => r.panels.filter((p) => p.part === 'DP' || p.part === 'FILLER');
const frontOf = (r) => r.panels.find((p) => p.part === 'DRAWER-FRONT');
const doorsOf = (r) => r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');

// ═══ F3a — THE STRIP ONLY EXISTS WHEN A DOOR DOES ══════════════════════════

test('F3a — NO DOOR, NO STRIP: the front grows by exactly the band', () => {
  const on = internalStack({ doors: { count: 2 } });
  const off = internalStack({ doors: false });

  assert.equal(strip(on).length > 0, true, 'with doors, the mechanism is cut as it always was');
  assert.deepEqual(strip(off), [], 'with none, not one board of it');

  // The band, in millimetres, from the profile rather than from a typed 30.
  const DP = P.wardrobe.drawerPanel;
  const band = DP.inset + G;
  // The owner calls it "30 mm infill" and it is the DP panel's inset plus the
  // board that stands in it — 30 + 18 on a stock workshop. The number is read
  // from the profile so a shop that moves it moves this test with it.
  assert.equal(DP.inset, 30);
  assert.equal(band, 48);
  assert.equal(frontOf(off).w - frontOf(on).w, 2 * band,
    'two hinged sides on a pair of doors, so two bands come back to the front');
  // …and the BOX behind it grows with it, because the strip is what it was
  // making room for.
  const box = (r) => r.panels.find((p) => p.part === 'DRAWER-BOTTOM');
  assert.equal(box(off).w - box(on).w, 2 * band);
});

test('F3a — ONE door, ONE band: the correction is per HINGED SIDE', () => {
  const two = internalStack({ doors: { count: 2 } });
  const one = internalStack({ doors: { count: 1, hinge: 'L' } });
  const none = internalStack({ doors: false });
  const DP = P.wardrobe.drawerPanel;
  const band = DP.inset + G;
  assert.equal(strip(two).filter((p) => p.part === 'DP').length, 2);
  assert.equal(strip(one).filter((p) => p.part === 'DP').length, 1);
  assert.equal(strip(none).filter((p) => p.part === 'DP').length, 0);
  assert.equal(frontOf(one).w - frontOf(two).w, band);
  assert.equal(frontOf(none).w - frontOf(one).w, band);
});

test('F3a — ADD A DOOR AND THE STRIP RETURNS, to today’s exact number', () => {
  // The owner's own sentence, said as a round trip: this is the number the app
  // has always cut, and it comes back untouched the moment a door is on.
  const before = internalStack({ doors: { count: 2 } });
  const off = internalStack({ doors: false });
  const back = internalStack({ doors: { count: 2 } });
  assert.equal(back.panels.find((p) => p.part === 'DRAWER-FRONT').w,
    before.panels.find((p) => p.part === 'DRAWER-FRONT').w);
  assert.notEqual(off.panels.find((p) => p.part === 'DRAWER-FRONT').w,
    before.panels.find((p) => p.part === 'DRAWER-FRONT').w);
  assert.equal(strip(back).length, strip(before).length);
});

test('F3a — the strip reads the SAME list the plates are drilled from', () => {
  // ONE source: `hingedSides`. A cabinet whose face hangs on nothing — an
  // appliance front, which falls forward on the machine's own door — reserves
  // no hinge band either, and that falls out rather than being a second rule.
  const dw = computeCabinet({
    ...defaultParamsFor('DW_PANEL', P), unit_num: '01',
  }, P);
  assert.deepEqual((dw.drillSummary.hinged_sides || []).filter(Boolean), []);
  assert.deepEqual(dw.panels.filter((p) => p.part === 'DP' || p.part === 'FILLER'), []);
  // And on an ordinary cabinet the two agree exactly.
  const one = internalStack({ doors: { count: 1, hinge: 'R' } });
  assert.deepEqual(one.drillSummary.hinged_sides, ['BUR']);
  assert.deepEqual(strip(one).filter((p) => p.part === 'DP').map((p) => p.meta.side), ['R']);
});

// ═══ F3b — OVERLAY DRAWERS IN A WARDROBE ═══════════════════════════════════

test('F3b — the plan is null until a wardrobe asks for one', () => {
  assert.equal(overlayPlan({ items: [], height: 2150, boardT: G }), null);
  assert.equal(overlayPlan({ items: [{ kind: 'drawer' }], height: 2150, boardT: G }), null);
  assert.equal(wardrobe().assemblies.overlayDrawers, undefined, 'and nothing is published');
  assert.equal(internalStack().assemblies.overlayDrawers, undefined, 'an INTERNAL stack is not one');
  // A zoned item belongs to a column and is not this stack.
  assert.deepEqual(overlayDrawerItems([{ kind: 'overlay_drawer', zone: 1 }]), []);
});

test('F3b — THE STACK SITS AT THE BOTTOM, 3 mm apart', () => {
  const r = overlayStack(3);
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT').sort((a, b) => a.box.y - b.box.y);
  assert.equal(fronts.length, 3);
  assert.equal(fronts[0].box.y, 0, 'the bottom front starts on the carcass floor');
  for (let i = 1; i < fronts.length; i += 1) {
    const gap = fronts[i].box.y - (fronts[i - 1].box.y + fronts[i - 1].h);
    assert.equal(gap, GAP, `${GAP} mm between fronts — "nie zapomnij o 3 mm"`);
  }
});

test('F3b — HEIGHTS DEFAULT TO EQUAL, not a 3/2/1 progression', () => {
  const r = overlayStack(4);
  const heights = r.assemblies.overlayDrawers.heights;
  assert.equal(heights.length, 4);
  assert.equal(new Set(heights).size, 1, `all four the same: ${JSON.stringify(heights)}`);
  assert.equal(heights[0], P.wardrobe.drawers.frontHeight, 'the workshop’s own front height');
  // …and a kitchen bank is still the kit's ratio, which is what this is NOT.
  const budr = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01' }, P);
  const bank = budr.assemblies.drawerFronts.map((f) => f.h);
  assert.ok(new Set(bank).size > 1, `a BUDR is still 4:3:2: ${JSON.stringify(bank)}`);
});

test('F3b — the per-drawer HEIGHT is still each drawer’s own', () => {
  const r = wardrobe({
    sections: [{ items: [
      { id: 'o1', kind: 'overlay_drawer', index: 1, height_mm: 300 },
      { id: 'o2', kind: 'overlay_drawer', index: 2 },
      { id: 'o3', kind: 'overlay_drawer', index: 3, height_mm: 150 },
    ] }],
  });
  assert.deepEqual(r.assemblies.overlayDrawers.heights, [300, P.wardrobe.drawers.frontHeight, 150]);
  // …clamped at the floor a runner can be screwed to, which is the same rule
  // the slider follows everywhere else.
  const floor = minDrawerFrontHeight(P);
  assert.deepEqual(overlayHeights([{ kind: 'overlay_drawer', index: 1, height_mm: 1 }], { minFrontMm: floor }),
    [floor]);
  // The front the engine cuts IS the item's number.
  const front = r.panels.filter((p) => p.part === 'DRAWER-FRONT').sort((a, b) => a.box.y - b.box.y)[0];
  assert.equal(front.h, 300);
  assert.equal(front.meta.itemId, 'o1', 'and it names the item, so the slider reaches it');
});

test('F3b — A FIXED SHELF SITS ABOVE THE STACK', () => {
  const r = overlayStack(3);
  const rec = r.assemblies.overlayDrawers;
  const shelf = r.panels.find((p) => p.id === 'OVERLAY-FIX');
  assert.ok(shelf, 'it is cut, not offered as an item somebody could forget');
  assert.equal(shelf.part, 'SHELF');
  assert.equal(shelf.meta.variant, 'fixed', 'FIXED — not a shelf on pins');
  assert.equal(shelf.meta.locked, true, 'it belongs to the stack');
  assert.equal(shelf.box.y, rec.shelf.y);
  assert.equal(shelf.box.y, rec.stackTop + GAP, 'its underside is the stack plus the gap');
  assert.equal(shelf.thickness, G);
  assert.ok(shelf.box.z > 0 && shelf.box.z + shelf.box.d <= r.params.depth + 1e-6,
    `it is inside the carcass: z=${shelf.box.z} d=${shelf.box.d}`);
});

test('F3b — DOOR HEIGHT = CARCASS MINUS STACK MINUS GAP', () => {
  const r = overlayStack(3, { doors: { count: 2 } });
  const rec = r.assemblies.overlayDrawers;
  const doors = doorsOf(r);
  assert.equal(doors.length, 2);
  const H = r.params.height;
  // CLAUDE.md's own sentence, and then the same thing with the cabinet's own
  // top-edge demand in it — which is the number the engine has always taken
  // off a door and which this feature did not touch.
  assert.equal(rec.doorBase, rec.stackTop + GAP);
  assert.equal(doors[0].box.y, rec.stackTop + GAP, 'the door starts on the stack');
  assert.equal(doors[0].h, H - rec.stackTop - GAP - topDemandMm({ ...r.params }, P));
  assert.equal(doors[0].h, rec.doorHeight);
  // …and it really is shorter than the same wardrobe with no stack in it.
  const plain = wardrobe({ doors: { count: 2 } });
  assert.equal(doorsOf(plain)[0].h - doors[0].h, rec.stackTop + GAP);
});

test('F3b — the shortened doors’ HINGES follow the standard law for that height', () => {
  const r = overlayStack(3, { doors: { count: 2 } });
  const rec = r.assemblies.overlayDrawers;
  const door = doorsOf(r)[0];
  const rows = r.drillSummary.hinge_centers;
  assert.ok(rows.length > 0);
  // Every row is ON the door — not on the drawer stack below it.
  for (const y of rows) {
    assert.ok(y >= rec.doorBase - 1e-6 && y <= rec.doorBase + door.h + 1e-6,
      `${y} is on a door standing from ${rec.doorBase} to ${rec.doorBase + door.h}`);
  }
  // The count is the SHORT door's, not the carcass's — a 2150 wardrobe takes
  // six and this door is 1538 mm.
  const plain = wardrobe({ doors: { count: 2 } });
  assert.ok(rows.length < plain.drillSummary.hinge_centers.length,
    `${rows.length} on the short door against ${plain.drillSummary.hinge_centers.length} on the full one`);
  // The CUPS are bored from the door's own bottom edge.
  assert.equal(r.drillSummary.front_cup_y[0], rows[0] - rec.doorBase);
  assert.equal(Math.min(...r.drillSummary.front_cup_y), P.hinges.endOffset);
});

test('F3b — NO 30 mm STRIP UNDER ANY COMBINATION OF DOORS ON/OFF', () => {
  // "unconditionally" — CLAUDE.md's own word, and this is what it means.
  for (const doors of [false, { count: 1, hinge: 'L' }, { count: 1, hinge: 'R' }, { count: 2 }]) {
    const r = overlayStack(3, { doors });
    assert.deepEqual(strip(r), [], `doors=${JSON.stringify(doors)}: not one DP or FILLER board`);
    assert.equal(r.assemblies.overlayDrawers.count, 3);
  }
  // The width of the front does not move with the doors either, which is the
  // same claim said in millimetres: an overlay front is outside the carcass,
  // so nothing about a door can reach it.
  const widths = [false, { count: 1 }, { count: 2 }]
    .map((doors) => overlayStack(3, { doors }).panels.find((p) => p.part === 'DRAWER-FRONT').w);
  assert.equal(new Set(widths).size, 1, `one width, whatever the doors: ${JSON.stringify(widths)}`);
});

test('F3b — RUNNER ROWS MATCH BUDR AT THE SAME DRAWER HEIGHT', () => {
  // "Same logic as BUDR… read it, do not re-derive it." The strongest form of
  // that claim: a BUDR cut to the same drawer heights bores the same rows.
  const heights = [200, 200, 200];
  const overlay = wardrobe({
    depth: 578,
    sections: [{ items: heights.map((h, i) => ({ id: `o${i + 1}`, kind: 'overlay_drawer', index: i + 1, height_mm: h })) }],
  });
  const bank = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '01', width: 900, depth: 578, drawer_heights: heights,
  }, P);
  assert.deepEqual(overlay.drillSummary.runner_rows_carcass_y, bank.drillSummary.runner_rows_carcass_y);
  assert.deepEqual(overlay.drillSummary.runner_bottoms_carcass_y, bank.drillSummary.runner_bottoms_carcass_y);
  assert.deepEqual(overlay.drillSummary.drawer_front_y, bank.drillSummary.drawer_front_y);
  // …and the boxes themselves, board for board.
  const boxes = (r) => r.panels.filter((p) => p.role === 'drawer_box')
    .map((p) => `${p.id} ${p.w}x${p.h}`).sort();
  assert.deepEqual(boxes(overlay), boxes(bank));
});

test('F3b — the arithmetic, on its own', () => {
  assert.equal(overlayStackTop([200, 200, 200], 3), 606);
  assert.equal(overlayStackTop([], 3), 0);
  assert.equal(overlayStackTop([150], 3), 150);
  const plan = overlayPlan({
    items: [{ kind: 'overlay_drawer', index: 1 }, { kind: 'overlay_drawer', index: 2 }],
    height: 2150, boardT: 18, gap: 3, defaultHeightMm: 200,
  });
  assert.equal(plan.stackTop, 403);
  assert.equal(plan.shelfY, 406);
  assert.equal(plan.doorBase, 406);
  assert.equal(plan.doorFaceMm, 2150 - 406);
  assert.equal(plan.fits, true);
  assert.equal(standsOnOverlayStack(plan, 406), true);
  assert.equal(standsOnOverlayStack(plan, 0), false);
  assert.equal(standsOnOverlayStack(null, 406), false);
});

test('F3b — a stack that cannot fit REPORTS and is still cut as asked', () => {
  // Report, never fix — the house grammar.
  const warnings = [];
  const plan = overlayPlan({
    items: Array.from({ length: 6 }, (_, i) => ({ kind: 'overlay_drawer', index: i + 1 })),
    height: 900, boardT: 18, gap: 3, defaultHeightMm: 200, warnings,
  });
  assert.equal(plan.count, 6, 'it is what he asked for');
  assert.equal(plan.fits, false);
  assert.ok(warnings.some((w) => w.code === 'OVERLAY_STACK_TOO_TALL'));
});

// ═══ THE STORE, AND THE OFFER ══════════════════════════════════════════════

function project() {
  store().loadProject({
    id: null, name: 't40-f3', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 900, height: 2150, doors: { count: 2 } });
  return id;
}

test('F3b — the store adds a stack of EQUAL drawers, and the engine reads it', () => {
  const id = project();
  const res = store().addOverlayDrawers(id, 3);
  assert.equal(res.ok, true);
  const unit = store().units.find((u) => u.id === id);
  const items = unit.params.sections[0].items.filter((i) => i.kind === 'overlay_drawer');
  assert.equal(items.length, 3);
  assert.equal(new Set(items.map((i) => i.height_mm)).size, 1, 'equal, by default');
  assert.deepEqual(items.map((i) => i.index), [1, 2, 3]);
  const r = computeCabinet(paramsForEngine(unit), P);
  assert.equal(r.assemblies.overlayDrawers.count, 3);
  assert.ok(r.panels.some((p) => p.id === 'OVERLAY-FIX'));
  assert.deepEqual(r.panels.filter((p) => p.part === 'DP' || p.part === 'FILLER'), []);
});

test('F3b — and it does NOT disturb the internal stack’s own items', () => {
  const id = project();
  store().addDrawers(id, 2);
  store().addOverlayDrawers(id, 3);
  const items = store().units.find((u) => u.id === id).params.sections[0].items;
  assert.equal(items.filter((i) => i.kind === 'drawer').length, 2, 'the internal ones are still there');
  assert.equal(items.filter((i) => i.kind === 'overlay_drawer').length, 3);
  // Re-adding an overlay stack replaces only its own kind, and keeps heights.
  store().setDrawerHeight(id, items.find((i) => i.kind === 'overlay_drawer').id, 250);
  store().addOverlayDrawers(id, 3);
  const after = store().units.find((u) => u.id === id).params.sections[0].items;
  assert.equal(after.filter((i) => i.kind === 'drawer').length, 2);
  assert.ok(after.filter((i) => i.kind === 'overlay_drawer').some((i) => i.height_mm === 250),
    'a height somebody typed survives a re-add');
});
