// ─── TURN 17, phase by phase ────────────────────────────────────────────────
//
// The CNC truth (F1–F4) is pinned where it belongs — in
// test/cnc-export-identity.test.js, which is the file that says what may change
// about an exported file and what may not. This is everything else: the
// project's hinge standard and a door's own hinges, the drawer heights and the
// clamp under them, the two new kits, and the ruler.
//
// Pure engine and pure store: no browser, no canvas.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  budrHeightsWithOwn, clampDrawerFrontHeight, computeCabinet, drawerSplitFor,
  hingeCentres, hingeRows, hingeStandard, middleHingeIndex, minDrawerFrontHeight,
  notchedPlinth,
} from '../src/engine/cabinet.js';
import { getUnitType, UNIT_TYPE_ORDER, defaultParamsFor } from '../src/engine/types.js';
import { elementFields, elementKind } from '../src/engine/elements.js';
import { sheetTurn } from '../src/engine/cnc/layout.js';
import { panelPlacement, machiningLines } from '../src/engine/joinery.js';
import { grainRun } from '../src/engine/decors.js';
import { rulerDistance } from '../src/engine/ruler.js';
import { partLabelText, partCode } from '../src/engine/cnc/partLabel.js';

const unit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), ...extra }, P);

// ─── F1 — the part label ────────────────────────────────────────────────────

test('F1 — the label is the cabinet, the part code and the cut size', () => {
  assert.equal(partLabelText('F-01', { id: 'BUR', w: 597, h: 568 }), 'F-01 BUR 597x568');
  // The cabinet number is not printed twice: the engine already puts it on a
  // front's id, exactly as `dxfFileName` has stripped it since turn 3.
  assert.equal(partCode('01', '01-DF1'), 'DF1');
  assert.equal(partLabelText('01', { id: '01-F', w: 597, h: 2147 }), '01 F 597x2147');
  // The app's own `formatMm`, so the label reads exactly as the cut list does.
  assert.equal(partLabelText('01', { id: 'X', w: 100.5, h: 50 }), '01 X 100.5x50');
});

test('F1.3 — the in-part label is the yellow heading’s own type scale', () => {
  assert.equal(P.cnc.annotation.partLabelMm, P.cnc.annotation.sectionLabelMm,
    'one type scale on the sheet — F1.3 asks for the heading’s size');
  assert.equal(P.cnc.unitNumberLayer, 'UNIT_NUMBER', 'the EXISTING text layer, no new name');
});

// ─── F3 — the shelf lies the way the 3D view says ───────────────────────────

/**
 * Which way the grain runs on a part, in the CABINET's own axes.
 *
 * The turn-13 rule — "the visual grain axis is a CABINET-SPACE rule and owes
 * nothing to how the part is nested". A board is cut with the figure along its
 * LENGTH (engine/decors.js `grainRun`), so this is the box edge whose extent is
 * that length.
 */
function grainAxisInCabinet(panel) {
  const { lengthMm } = grainRun(panel);
  const { w, h, d } = panel.box;
  const near = (v) => Math.abs(v - lengthMm) < 0.51;
  if (near(w)) return 'x';
  if (near(h)) return 'y';
  if (near(d)) return 'z';
  return null;
}

/** …and which cabinet axis runs UP the sheet, once the part is laid down. */
function sheetUpAxisInCabinet(panel) {
  const placement = panelPlacement(panel);
  if (!placement) return null;
  // A part laid down square carries its own CNC y up the sheet; a part TURNED
  // 90° carries its CNC x up it instead.
  const axis = sheetTurn(panel) === 90 ? placement.u : placement.v;
  const i = axis.findIndex((v) => Math.abs(v) > 0.5);
  return ['x', 'y', 'z'][i] ?? null;
}

test('F3 — every shelf’s grain axis in the export is its grain axis in the cabinet', () => {
  let checked = 0;
  for (const id of UNIT_TYPE_ORDER) {
    const r = unit(id, { shelves: getUnitType(id).supports.shelves ? 2 : 0 });
    for (const panel of r.panels) {
      // The horizontal boards a joiner calls a shelf. A VPART stands on end and
      // is a different piece; it is out of F3's scope and out of `sheetTurn`'s.
      if (!['SHELF', 'PARTITION', 'RAIL-PART', 'FIXED'].includes(panel.part)) continue;
      checked += 1;
      assert.equal(
        sheetUpAxisInCabinet(panel),
        grainAxisInCabinet(panel),
        `${id} ${panel.id}: the sheet runs ${sheetUpAxisInCabinet(panel)} up the page, the grain runs ${grainAxisInCabinet(panel)}`,
      );
    }
  }
  assert.ok(checked >= 6, `every kit with shelves should be covered, saw ${checked} boards`);
});

test('F3 — …and so does every other board, which is the rule it joins', () => {
  // The disagreement was never about shelves in isolation: a TOP is nested
  // turned and a shelf was not, so the two horizontal boards of one carcass lay
  // at 90° to each other on the sheet while they are parallel in the cabinet.
  // Stated as the rule it is — the grain runs UP the drawing — it covers both.
  const r = unit('WARDROBE', { shelves: 2, doors: true });
  for (const id of ['TOP', 'BOTTOM', 'BUL', 'BACK', 'SHELF-1']) {
    const panel = r.panels.find((p) => p.id === id);
    assert.ok(panel, id);
    assert.equal(sheetUpAxisInCabinet(panel), grainAxisInCabinet(panel), `${id} lies across its own grain`);
  }
});

// ─── F4 — the machining is on the part ──────────────────────────────────────

test('F4.1 — the parts that carry machining all have a frame to draw it in', () => {
  const missing = [];
  for (const id of UNIT_TYPE_ORDER) {
    const r = unit(id, { drawers: getUnitType(id).supports.drawers ? 3 : 0, doors: true });
    for (const panel of r.panels) {
      const has = (panel.cnc?.pockets || []).length
        || (panel.cnc?.marks || []).length
        || r.drills.some((d) => d.panel === panel.id);
      if (has && !panelPlacement(panel)) missing.push(`${id} ${panel.id} (${panel.part})`);
    }
  }
  assert.deepEqual(missing, [], `these parts carry cuts nothing can draw:\n${missing.join('\n')}`);
});

test('F4.1 — a drawer side’s grooves and a door’s cups are drawn from the export’s own data', () => {
  const r = unit('BUDR');
  const side = r.panels.find((p) => p.id === 'D1-SL');
  const lines = machiningLines(side, r.drills);
  const layers = new Set(lines.map((l) => l.layer));
  assert.ok(layers.has('DRAWER_RUNNER_POCKET'), 'the runner groove');
  assert.ok(layers.has('DRAWER_BOTTOM_POCKET'), 'the bottom groove');
  // One drawn line per cut, and not one more: this is a reading, not a drawing.
  assert.equal(lines.length, (side.cnc.pockets || []).length + r.drills.filter((d) => d.panel === side.id).length);

  const bud = unit('BUD', { doors: true });
  const door = bud.panels.find((p) => p.part === 'FRONT');
  const cups = machiningLines(door, bud.drills).filter((l) => l.layer === 'FRONT_HINGES_35MM');
  assert.equal(cups.length, bud.drills.filter((d) => d.panel === door.id && d.layer === 'FRONT_HINGES_35MM').length);
  assert.ok(cups.length >= 2, 'a door has its hinge cups on it');
});

test('F4.3 — the two drawer grooves are cuts with depths, and the depths are the owner’s', () => {
  assert.equal(P.baseDrawerUnit.runnerPocketDepth, 2);
  assert.equal(P.baseDrawerUnit.bottomPocketDepth, 7);
  const side = unit('BUDR').panels.find((p) => p.id === 'D1-SL');
  const byLayer = Object.fromEntries(side.cnc.pockets.map((p) => [p.layer, p.depth]));
  assert.equal(byLayer.DRAWER_RUNNER_POCKET, 2, 'the runner sits flush, so its groove is shallow');
  assert.equal(byLayer.DRAWER_BOTTOM_POCKET, 7, 'a board stands in the other one');
});

test('F4.2 — a drawer box is an element with its own detail view', () => {
  const r = unit('BUDR');
  const box = r.panels.find((p) => p.role === 'drawer_box');
  assert.equal(elementKind(box), 'drawer');
  assert.deepEqual(elementFields(box), ['drawer-height', 'material']);
});

// ─── F7 — hinges ────────────────────────────────────────────────────────────

test('F7.1 — the standard is 2 or 3, and 3 is what the kits have always drilled', () => {
  assert.equal(P.hinges.standard, 3);
  assert.deepEqual(P.hinges.standardOptions, [2, 3]);
  assert.equal(hingeStandard(null, P), 3, 'nothing said = the profile’s');
  assert.equal(hingeStandard(2, P), 2);
  assert.equal(hingeStandard(5, P), 3, 'a number that is not an option is not an option');
});

test('F7.1 — on 2, ONE MIDDLE hinge comes off and the outer ones never move', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const type = getUnitType(id);
    if (!type.supports.doors) continue;
    const H = defaultParamsFor(id, P).height;
    const rule = P.hinges.rules[type.hingeRule];
    const three = hingeRows({ height: H, rule, standard: 3 }, P);
    const two = hingeRows({ height: H, rule, standard: 2 }, P);
    if (three.length < 3) {
      // A door already hung on two has no MIDDLE hinge to lose — a low cabinet
      // under 800 mm is drilled for two by its own rule. "Standard hinges: 2"
      // is a ceiling on the middle ones and never a floor under the outer pair.
      assert.deepEqual(two, three, `${id}: nothing to take off a two-hinge door`);
      continue;
    }
    assert.equal(two.length, three.length - 1, `${id}: exactly one hinge comes off`);
    assert.equal(two[0], three[0], `${id}: the bottom hinge never moves`);
    assert.equal(two[two.length - 1], three[three.length - 1], `${id}: nor the top one`);
    // …and every hinge left is one the rule already put there.
    for (const y of two) assert.ok(three.includes(y), `${id}: ${y} is not one of the rule’s own centres`);
  }
});

test('F7.1 — a 3-hinge door becomes 2 and a 6-hinge door becomes 5', () => {
  const base = hingeCentres(720, P.hinges.rules.base, P);
  assert.equal(base.length, 3);
  assert.equal(hingeRows({ height: 720, rule: P.hinges.rules.base, standard: 2 }, P).length, 2);

  // The tall rule gives six over 1600, which is the owner's own second example.
  const tall = hingeCentres(2150, P.hinges.rules.tall, P);
  assert.equal(tall.length, 6);
  assert.equal(hingeRows({ height: 2150, rule: P.hinges.rules.tall, standard: 2 }, P).length, 5);
  // The one that goes is an INNER hinge nearest the middle of the door.
  const drop = middleHingeIndex(tall);
  assert.ok(drop > 0 && drop < tall.length - 1, 'never an outer one');
});

test('F7.2 — a cabinet’s own hinge rows replace the rule, and the cups follow', () => {
  const own = [120, 900, 1400, 2050];
  const r = unit('BUDTALL', { doors: true, hinge_rows: own });
  assert.deepEqual(r.drillSummary.hinge_centers, own);
  // The DRILLING follows: one pair of ⌀5 holes per hinge, per hinged side.
  const sides = r.drillSummary.hinged_sides.length;
  assert.equal(r.drills.filter((d) => d.layer === P.hinges.layer).length, own.length * 2 * sides);
  // …and so do the CUPS on the door, which is what F7.3 is about: a hinge that
  // moved with its cup left behind is a door that does not shut.
  const door = r.panels.find((p) => p.part === 'FRONT');
  const cups = r.drills.filter((d) => d.panel === door.id && d.layer === P.hinges.cups.layer);
  assert.equal(cups.length, own.length);
  assert.deepEqual(cups.map((c) => c.y).sort((a, b) => a - b), own);
});

test('F7.3 — the BOM’s hinge count is the same list', () => {
  const three = unit('BUD', { doors: true });
  const two = computeCabinet({ ...defaultParamsFor('BUD', P), doors: true, hinge_standard: 2 }, P);
  assert.equal(three.totals.hinges, three.drillSummary.hinge_centers.length * three.derived.doors);
  assert.equal(two.totals.hinges, two.drillSummary.hinge_centers.length * two.derived.doors);
  assert.ok(two.totals.hinges < three.totals.hinges, 'two hinges a door is fewer hinges');
});

test('F7 — a bare kit call is untouched: nothing said, nothing changes', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const type = getUnitType(id);
    if (!type.supports.doors) continue;
    const r = unit(id, { doors: true });
    const rule = P.hinges.rules[type.hingeRule];
    assert.deepEqual(r.drillSummary.hinge_centers, hingeCentres(defaultParamsFor(id, P).height, rule, P),
      `${id} must still drill exactly what the AutoLISP drills`);
  }
});

// ─── F8 — drawer heights ────────────────────────────────────────────────────

test('F8.3 — the clamp is the owner’s: 28 + 10 mm from the screw centres', () => {
  assert.equal(P.baseDrawerUnit.runnerScrewFromBase, 28);
  assert.equal(P.baseDrawerUnit.clearanceBelowRunner, 10);
  assert.equal(minDrawerFrontHeight(P), 38);
  assert.equal(clampDrawerFrontHeight(10, { profile: P }), 38, 'no closer than 10 mm below the runner');
  assert.equal(clampDrawerFrontHeight(200, { profile: P }), 200);
  assert.equal(clampDrawerFrontHeight(900, { profile: P, max: 400 }), 400, 'nor past what the face holds');
  assert.equal(clampDrawerFrontHeight('nonsense', { profile: P }), 38);
});

test('F8.2 — an edited drawer takes its height; the rest share what is left', () => {
  const split = drawerSplitFor(getUnitType('BUDR'), P);
  const frozen = budrHeightsWithOwn(770, P, split, null);
  // F8.4: with nothing edited, the kit's own 4:3:2 — drift and all (#64).
  assert.deepEqual(frozen, [338, 254, 169]);

  const edited = budrHeightsWithOwn(770, P, split, [300, null, null]);
  assert.equal(edited[0], 300, 'what he said');
  assert.equal(edited.reduce((s, h) => s + h, 0), 770 - 3 * P.baseDrawerUnit.gap,
    'and the stack still fills the face');
});

test('F8.2 — the clamp cannot be got round by typing', () => {
  const split = drawerSplitFor(getUnitType('BUDR'), P);
  const warnings = [];
  const out = budrHeightsWithOwn(770, P, split, [10, null, null], warnings);
  assert.equal(out[0], minDrawerFrontHeight(P));
  assert.ok(warnings.some((w) => w.code === 'DRAWER_HEIGHT_CLAMPED'), 'and it says so');
});

test('F8.1 — the fronts come off, and the boxes and the carcass stay', () => {
  const on = unit('BUDR');
  const off = unit('BUDR', { drawer_fronts: false });
  assert.ok(on.panels.some((p) => p.part === 'DRAWER-FRONT'));
  assert.equal(off.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 0);
  const boxes = (r) => r.panels.filter((p) => p.role === 'drawer_box').map((p) => `${p.id}:${p.w}x${p.h}`);
  assert.deepEqual(boxes(off), boxes(on), 'the boxes are exactly what they were');
  const carcass = (r) => r.panels.filter((p) => ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'].includes(p.part))
    .map((p) => `${p.id}:${p.w}x${p.h}`);
  assert.deepEqual(carcass(off), carcass(on));
});

// ─── F9 — the D/W panel ─────────────────────────────────────────────────────

test('F9 — 594 is RIGID: it is a value, not a default', () => {
  // Owner's review of turn 17: 594 is the WIDTH. The instruction said height
  // and the engine built a letterbox; the number was always the one that keeps
  // the appliance door able to swing past its neighbours.
  assert.equal(P.dwPanel.frontWidth, 594);
  assert.ok(P.dwPanel.frontWidth < 600, 'always under 600, or the appliance door cannot open');
  // Whatever the opening is asked to be, the front is 594 WIDE — and as TALL
  // as the base fronts it stands beside.
  for (const width of [500, 600, 900]) {
    const r = unit('DW_PANEL', { width });
    assert.equal(r.panels.find((p) => p.part === 'FRONT').w, 594,
      `a ${width} mm gap still cuts a 594 mm front`);
  }
  for (const height of [700, 720, 760, 900]) {
    const r = unit('DW_PANEL', { height });
    assert.equal(r.panels.find((p) => p.part === 'FRONT').h, height - P.doors.gap,
      `a ${height} mm run gives a ${height - P.doors.gap} mm front`);
  }
});

test('F9 — a front and nothing else, plus one 600 mm top', () => {
  const r = unit('DW_PANEL');
  assert.deepEqual(r.panels.map((p) => p.part).sort(), ['FRONT', 'TOP']);
  const top = r.panels.find((p) => p.part === 'TOP');
  assert.equal(top.w, 600, 'always 600 mm wide');
  // …and its depth is the run's, which is the unit's own depth less the board.
  assert.equal(top.h, defaultParamsFor('DW_PANEL', P).depth - P.board.thickness);
  // No hinges, flat, no door furniture.
  const front = r.panels.find((p) => p.part === 'FRONT');
  assert.equal(r.drills.filter((d) => d.panel === front.id).length, 0);
  assert.deepEqual(front.cnc.pockets, []);
  assert.equal(r.totals.hinges, 0);
});

test('F9 — the plinth is cut out at that position, 20 mm from the top', () => {
  assert.equal(P.dwPanel.plinthCutFromTop, 20);
  const r = unit('DW_PANEL', { plinth: true });
  const plinth = r.panels.find((p) => p.part === 'PLINTH');
  assert.ok(plinth, 'the unit cuts its own plinth');
  const ys = plinth.cnc.outline.map(([, y]) => y);
  assert.ok(ys.includes(plinth.h - 20), 'the notch starts 20 mm below the top edge');
  assert.ok(Math.max(...ys) === plinth.h, 'and the top edge is still there');
  // The opening is the appliance's own width, and it runs out of the bottom.
  const atCut = plinth.cnc.outline.filter(([, y]) => Math.abs(y - (plinth.h - 20)) < 1e-9);
  assert.equal(atCut.length, 2);
  assert.equal(Math.abs(atCut[1][0] - atCut[0][0]), defaultParamsFor('DW_PANEL', P).width,
    'the opening is the appliance’s own width');
});

test('F9 — notchedPlinth leaves no zero-length edge, wherever the opening falls', () => {
  for (const [at, span] of [[0, 600], [100, 400], [-50, 600], [550, 600]]) {
    const g = notchedPlinth(600, 100, at, span, 20);
    for (let i = 0; i < g.outline.length; i += 1) {
      const a = g.outline[i];
      const b = g.outline[(i + 1) % g.outline.length];
      assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-9, `repeated vertex at ${at}/${span}`);
    }
  }
});

// ─── F10 — the oven base ────────────────────────────────────────────────────

test('F10 — the shelf sits 598 mm from the TOP of the cabinet', () => {
  assert.equal(P.ovenUnit.ovenHeight, 595);
  assert.equal(P.ovenUnit.shelfFromTop, 598);
  for (const height of [870, 900, 950]) {
    const r = unit('OVEN_BASE', { height });
    const shelf = r.panels.find((p) => p.part === 'FIXED');
    assert.equal(height - (shelf.box.y + shelf.box.h), 598,
      'measured from the top, not from a centre line and not from the floor');
  }
});

test('F10 — a drawer below, and no back except behind it', () => {
  const r = unit('OVEN_BASE');
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT');
  assert.equal(fronts.length, 1, 'one drawer');
  assert.ok(r.panels.some((p) => p.part === 'DRAWER-SIDE'), 'drawn as the drawers are drawn');
  const back = r.panels.find((p) => p.part === 'BACK');
  const shelf = r.panels.find((p) => p.part === 'FIXED');
  assert.equal(back.box.y, 0, 'flush with the bottom of the carcass');
  assert.equal(back.box.y + back.box.h, shelf.box.y, 'and it stops at the shelf — behind the drawer only');
});

test('F10 — that back fixes the standard way: 4 dog bones', () => {
  const r = unit('OVEN_BASE');
  const back = r.panels.find((p) => p.part === 'BACK');
  const sockets = back.cnc.pockets.filter((p) => p.layer === P.puzzle.layers.socket);
  assert.equal(sockets.length, 4, 'one at each side, two into the bottom of the cabinet');
  // It is the FRIDGE's own back-rail pattern (turn 14), not a new one: the same
  // two edges at the same 95 mm, and the same pair down the left edge.
  const fridge = unit('FRIDGE');
  const rail = fridge.panels.find((p) => p.id === 'RAIL1');
  const shape = (panel) => panel.cnc.pockets
    .filter((p) => p.layer === P.puzzle.layers.socket)
    .map((p) => `${Math.round(p.y1)}..${Math.round(p.y2)}`).sort();
  assert.deepEqual(shape(back), shape(rail), 'the fridge pattern, unchanged');
});

test('F10 — the oven’s drawer has the grooves F4 gives it', () => {
  const side = unit('OVEN_BASE').panels.find((p) => p.part === 'DRAWER-SIDE');
  const layers = side.cnc.pockets.map((p) => p.layer).sort();
  assert.deepEqual(layers, ['DRAWER_BOTTOM_POCKET', 'DRAWER_RUNNER_POCKET']);
});

// ─── F11 — the ruler ────────────────────────────────────────────────────────

test('F11 — the ruler reads a distance in millimetres, and nothing else', () => {
  assert.equal(rulerDistance([0, 0, 0], [600, 0, 0]), 600);
  assert.equal(rulerDistance([0, 0, 0], [3, 4, 0]), 5);
  assert.equal(rulerDistance([100, 200, 300], [100, 200, 300]), 0);
  // It never throws at a half-taken measurement.
  assert.equal(rulerDistance(null, [1, 2, 3]), 0);
  assert.equal(rulerDistance([1, 2, 3], undefined), 0);
});
