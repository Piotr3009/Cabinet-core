// ─── F11 · F12 · F13 · F14 · F15 (turn 25) ──────────────────────────────────
//
// Remove door · cornice 100 · front dimensions · one dimension language ·
// open and close all doors.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  corniceOption, corniceProjection, corniceSection, corniceSegments, segmentCornice,
} from '../src/engine/cornice.js';
import { frontDimensionRows, frontGaps, frontRects, frontSizes } from '../src/engine/frontDimensions.js';
import { pieceHoverRows } from '../src/engine/hoverRows.js';
import { dimensionStyle } from '../src/engine/dimensionArrows.js';
import { menuActions, groupedActions } from '../src/lib/contextActions.js';
import { useUiStore } from '../src/stores/uiStore.js';

const unit = (type, extra) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...extra,
}, P);

// ─── F11 — remove door ──────────────────────────────────────────────────────

test('F11 — R9 does the rest: the hinge holes leave with the door', () => {
  const withDoors = unit('BUD');
  const without = unit('BUD', { doors: false });
  const cls = (r) => [...new Set(r.drills.map((d) => d.layer))].sort();

  assert.ok(cls(withDoors).includes('HINGES_5MM'));
  assert.ok(cls(withDoors).includes('FRONT_HINGES_35MM'));
  assert.ok(!cls(without).includes('HINGES_5MM'), 'the plate pattern went with the door');
  assert.ok(!cls(without).includes('FRONT_HINGES_35MM'), 'and so did the cups');
  assert.equal(without.totals.hinges, 0, 'and nothing is on order for them');

  // …and they come back IDENTICAL.
  const again = unit('BUD');
  const key = (r) => r.drills.map((d) => `${d.panel}|${d.layer}|${d.x}|${d.y}|${d.d}`).sort();
  assert.deepEqual(key(again), key(withDoors));
});

test('F11 — a leaf in a BAY goes on its own; its neighbour stays', () => {
  // What `removeFront` does through the store, as the engine sees it: that
  // bay stops asking for a door and the others are untouched.
  const both = unit('BUD', {
    width: 900,
    doors: false,
    sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450, front_mm: 0 }] }],
    bay_doors: [{ door: 'one', hinge: 'R' }, { door: 'one', hinge: 'L' }],
  });
  const one = unit('BUD', {
    width: 900,
    doors: false,
    sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450, front_mm: 0 }] }],
    bay_doors: [{ door: 'none', hinge: 'R' }, { door: 'one', hinge: 'L' }],
  });
  assert.equal(both.panels.filter((p) => p.part === 'FRONT').length, 2);
  assert.equal(one.panels.filter((p) => p.part === 'FRONT').length, 1);
  assert.equal(one.totals.hinges, both.totals.hinges / 2);
});

// ─── F12 — cornice 100 ──────────────────────────────────────────────────────

test('F12.1 — the DIAGNOSIS: the geometry, the option and the resolver are all innocent', () => {
  // Every suspect, checked. `verify/t25/cornice-100.md` states the finding.
  assert.deepEqual(P.autoParts.cornice.heights, [70, 100]);
  assert.equal(corniceProjection(100, P), 65);
  assert.equal(corniceOption(100, P), 100);
  assert.equal(corniceOption('100', P), 100);

  const run = {
    wall: 0,
    mount: 'floor',
    units: [{
      id: 'a', type: 'WARDROBE', position: { x_mm: 0 }, params: { cornice: 100, width: 600, height: 2150, depth: 578, top_infill_mm: 40 },
    }],
  };
  const segs = corniceSegments(run, P);
  assert.deepEqual(segs.map((x) => x.height), [100]);
  const el = segmentCornice(segs[0], {
    wall: 0, mount: 'floor', wallWidth: 3000, roomHeight: 2700, frontFaceDepth: { left: 0, right: 0 }, infillHeightOf: () => 40,
  }, P);
  assert.equal(el.height, 100);
  assert.equal(el.projection, 65);
});

test('F12.1 — the FAULT: a run element that differs only in HEIGHT is a different element', () => {
  // `sameRun` compared offset, length, faceH, ends, returns and mitres — the
  // fields the top infill, the plinth and the mask have. A cornice is the first
  // run element whose identity includes a height, so 70 and 100 came out
  // "identical" and the store kept the 70. This pins the two fields that fix it.
  const mk = (h) => {
    const run = {
      wall: 0,
      mount: 'floor',
      units: [{
        id: 'a', type: 'WARDROBE', position: { x_mm: 0 }, params: { cornice: h, width: 600, height: 2150, depth: 578, top_infill_mm: 40 },
      }],
    };
    return segmentCornice(corniceSegments(run, P)[0], {
      wall: 0, mount: 'floor', wallWidth: 3000, roomHeight: 2700, frontFaceDepth: { left: 0, right: 0 }, infillHeightOf: () => 40,
    }, P);
  };
  const a = mk(70);
  const b = mk(100);
  // Everything the old comparison looked at is the same…
  assert.equal(a.offset, b.offset);
  assert.equal(a.length, b.length);
  assert.deepEqual(a.ends, b.ends);
  assert.deepEqual(a.returns, b.returns);
  // …and the two fields that are not are exactly the two now compared.
  assert.notEqual(a.height, b.height);
  assert.notEqual(a.projection, b.projection);
});

test('F12.2 — the 100 is RICHER, not a 70 scaled up', () => {
  const s70 = corniceSection(70, P);
  const s100 = corniceSection(100, P);
  // If it were a scale, every point of the 100 would be the 70's × 100/70 on y
  // and × 65/48 on x. The bead's own corner is the clearest place it is not.
  const bead70 = s70[6];
  const bead100 = s100[6];
  assert.ok(bead100[1] / bead70[1] > 1.5, 'a larger bottom bead');
  assert.ok(bead100[0] / bead70[0] < 65 / 48, 'standing proud less far, so the cove sweeps deeper');

  const land70 = 70 - s70[s70.length - 3][1];
  const land100 = 100 - s100[s100.length - 3][1];
  assert.ok(land100 / land70 > 1.7, 'a pronounced top land');

  // The base fractions still answer for a height nobody has described.
  assert.equal(P.autoParts.cornice.section.byHeight[70], undefined);
  assert.ok(P.autoParts.cornice.section.byHeight[100]);
});

test('F12.3 — the cornice is in the right-click menu, none / 70 / 100', () => {
  const wardrobe = {
    id: 'u1', type: 'WARDROBE', params: { unit_num: '01', cornice: 0 }, position: { x_mm: 0, wall: 0 },
  };
  const actions = menuActions({ unit: wardrobe, panelPart: 'BUL', store: {} });
  const ids = actions.map((a) => a.id);
  assert.deepEqual(
    ids.filter((id) => id.startsWith('cornice-')),
    ['cornice-0', 'cornice-70', 'cornice-100'],
  );
  // …with the one it is currently on ticked.
  const fitted = menuActions({
    unit: { ...wardrobe, params: { ...wardrobe.params, cornice: 100 } }, panelPart: 'BUL', store: {},
  });
  assert.equal(fitted.find((a) => a.id === 'cornice-100').checked, true);
  assert.equal(fitted.find((a) => a.id === 'cornice-70').checked, false);

  // …and it sits with the top infill, which is the piece it is screwed to.
  const group = groupedActions(actions).find((g) => g.id === 'run-pieces');
  assert.ok(group.actions.map((a) => a.id).includes('top-infill'));
  assert.ok(group.actions.map((a) => a.id).includes('cornice-100'));
});

// ─── F13 — front dimensions ─────────────────────────────────────────────────

test('F13 — every front’s width and height', () => {
  const r = unit('BUD', { width: 900 });
  const rects = frontRects(r);
  assert.equal(rects.length, 2, 'a 900 mm base unit has two doors');
  const sizes = frontSizes(r);
  assert.equal(sizes.length, 4, 'a width and a height apiece');
  for (const f of rects) {
    assert.ok(sizes.some((d) => d.kind === 'front-w' && d.a === f.id && d.mm === f.w));
    assert.ok(sizes.some((d) => d.kind === 'front-h' && d.a === f.id && d.mm === f.h));
  }
});

test('F13 — the GAP maths: between doors, to the sides, to the top, to the floor', () => {
  const r = unit('BUD', { width: 900 });
  const gaps = frontGaps(r);
  const of = (kind) => gaps.filter((g) => g.kind === kind);

  // Two doors, `doubleTotalGap` between the pair and half of it at each side.
  const between = of('between-doors');
  assert.equal(between.length, 1);
  assert.equal(between[0].mm, P.doors.gap, 'the doors are the door gap apart');

  const sides = of('to-side');
  assert.equal(sides.length, 2);
  for (const s of sides) assert.equal(s.mm, P.doors.gap / 2, 'half a gap at each end');

  // …and the two vertical ones add up with the door's height to the carcass.
  const top = of('to-top')[0];
  const floor = of('to-floor')[0];
  const door = frontRects(r)[0];
  assert.equal(
    Math.round(floor.mm + door.h + top.mm), Math.round(r.params.height),
    'floor + door + top is the cabinet',
  );
});

test('F13 — between DRAWER fronts, one above the other', () => {
  const r = unit('BUDR');
  const gaps = frontGaps(r).filter((g) => g.kind === 'between-drawers');
  assert.equal(gaps.length, 2, 'three fronts leave two gaps between them');
  for (const g of gaps) assert.equal(g.mm, P.baseDrawerUnit.gap);
});

test('F13 — every row is HORIZONTAL or VERTICAL and nothing else (F14.3)', () => {
  for (const type of ['BUD', 'BUDR', 'WARDROBE', 'WUD']) {
    for (const row of frontDimensionRows(unit(type))) {
      assert.ok(row.axis === 'h' || row.axis === 'v', `${type}: ${row.kind} is neither`);
      assert.ok(Number.isFinite(row.mm) && Number.isFinite(row.at));
    }
  }
});

test('F13 — off is a CLEAN SCENE, and the state is remembered', () => {
  const ui = useUiStore.getState();
  assert.equal(typeof ui.showFrontDimensions, 'boolean');
  assert.equal(ui.showFrontDimensions, false, 'the app opens with a clean scene');
  ui.toggleFrontDimensions();
  assert.equal(useUiStore.getState().showFrontDimensions, true);
  useUiStore.getState().setShowFrontDimensions(false);
  assert.equal(useUiStore.getState().showFrontDimensions, false);
});

// ─── F14 — one dimension language ───────────────────────────────────────────

test('F14.1 — the partition chain drops off the centre line, by a FRACTION', () => {
  // It sat on the bay's mid-height, which is exactly where the add (+) button
  // stands. A fraction rather than a fixed number of millimetres, because the
  // button is placed the same way: a fixed 80 is clear on a wardrobe bay and
  // off the bottom of a 300 mm one.
  const style = dimensionStyle(P);
  assert.equal(style.chainDropFraction, P.hoverDimensions.chainDropFraction);
  assert.ok(style.chainDropFraction > 0 && style.chainDropFraction < 0.5);
  // On any bay, the chain is below the middle and still inside the piece.
  for (const h of [300, 720, 2150]) {
    const y = h * (0.5 - style.chainDropFraction);
    assert.ok(y > 0 && y < h / 2, `a ${h} mm bay puts the chain at ${y}`);
  }
});

test('F14.2 — a SHELF gets the clear gaps below and above it', () => {
  const r = unit('BUD', {
    sections: [{
      width_mm: 600,
      items: [{ id: 's1', kind: 'shelf', pos_mm: 400 }],
    }],
  });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const set = pieceHoverRows(r, shelf.id, P);
  assert.ok(set, 'a shelf has something worth reading');
  assert.deepEqual(set.rows.map((x) => x.kind).sort(), ['gap-above', 'gap-below']);
  // Between FACES: below is from the bottom panel's top face to the shelf's
  // underside, and the two add up to the compartment.
  const below = set.rows.find((x) => x.kind === 'gap-below');
  const above = set.rows.find((x) => x.kind === 'gap-above');
  assert.equal(below.to[1], shelf.box.y);
  assert.equal(above.from[1], shelf.box.y + shelf.box.h);
  assert.equal(below.from[1], r.params.board_t, 'the bottom panel’s top face');
  assert.equal(above.to[1], r.params.height - r.params.board_t, 'the top panel’s underside');
  // Horizontal and vertical only.
  for (const row of set.rows) assert.equal(row.from[0], row.to[0], 'a vertical row');
});

test('F14.2 — a SIDE PANEL gets the interior depth and the interior height', () => {
  const r = unit('BUD');
  for (const id of ['BUL', 'BUR']) {
    const set = pieceHoverRows(r, id, P);
    assert.ok(set, `${id} has something worth reading`);
    assert.deepEqual(set.rows.map((x) => x.kind).sort(), ['interior-d', 'interior-h']);
    const h = set.rows.find((x) => x.kind === 'interior-h');
    const d = set.rows.find((x) => x.kind === 'interior-d');
    // The clear light between the boards, not the outside of the box.
    assert.equal(h.to[1] - h.from[1], r.params.height - 2 * r.params.board_t);
    assert.equal(d.to[0] - d.from[0], r.params.depth - r.params.board_t);
    // …drawn INSIDE the cabinet: on the panel's own inner face.
    const side = r.panels.find((p) => p.id === id);
    assert.equal(set.z, id === 'BUL' ? side.box.x + side.box.w : side.box.x);
    // Horizontal and vertical only.
    assert.equal(h.from[0], h.to[0]);
    assert.equal(d.from[1], d.to[1]);
  }
});

test('F14.2 — a piece with nothing worth reading says so', () => {
  const r = unit('BUD');
  assert.equal(pieceHoverRows(r, 'BACK', P), null);
  assert.equal(pieceHoverRows(r, 'nope', P), null);
});

test('F14.3 — ONE style block, and every consumer reads it', () => {
  const style = dimensionStyle(P);
  assert.equal(style.colour, P.hoverDimensions.colour);
  assert.equal(style.strokeMm, P.hoverDimensions.strokeMm);
  assert.equal(style.arrowMm, P.hoverDimensions.arrowMm);
  // The 5 mm magnet applies everywhere (F14.3) and is the editor's own number.
  assert.equal(style.hoverMagnetMm, P.editor.hoverMagnetMm);
  assert.equal(style.hoverMagnetMm, 5);
});

// ─── F15 — open / close all doors ───────────────────────────────────────────

test('F15 — first press opens every door, second closes them', () => {
  const entries = [
    { unitId: 'u1', panelIds: ['01-FL', '01-FR'] },
    { unitId: 'u2', panelIds: ['02-F'] },
  ];
  const ui = () => useUiStore.getState();
  ui().closeAllFronts(null);
  assert.equal(ui().allFrontsOpen(entries), false);

  ui().toggleAllFronts(entries);
  assert.equal(ui().allFrontsOpen(entries), true);
  assert.equal(ui().openFronts.u1['01-FL'], 1);
  assert.equal(ui().openFronts.u2['02-F'], 1);

  ui().toggleAllFronts(entries);
  assert.equal(ui().allFrontsOpen(entries), false);
  ui().closeAllFronts(null);
});

test('F15 — a joiner who opened three by hand gets the REST opened, not those shut', () => {
  const entries = [{ unitId: 'u1', panelIds: ['a', 'b', 'c'] }];
  const ui = () => useUiStore.getState();
  ui().closeAllFronts(null);
  ui().toggleFront('u1', 'a');
  assert.equal(ui().openFronts.u1.a, 1);

  ui().toggleAllFronts(entries);
  assert.equal(ui().allFrontsOpen(entries), true, 'the press opened the other two');
  ui().closeAllFronts(null);
});

test('F15 — it is a way of LOOKING: the same value a double-click writes', () => {
  const entries = [{ unitId: 'u1', panelIds: ['a'] }];
  const ui = () => useUiStore.getState();
  ui().closeAllFronts(null);
  ui().toggleFront('u1', 'a');
  const byHand = ui().openFronts.u1.a;
  ui().closeAllFronts(null);
  ui().toggleAllFronts(entries);
  assert.equal(ui().openFronts.u1.a, byHand, 'so turn 24’s hinge rig folds either way');
  ui().closeAllFronts(null);
});
