import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { fitBox, zoomedBox, ZOOM_STEP } from '../src/lib/sheetView.js';
import {
  dimensionEntities, dimensionSet, dimensionStyle, featureDimensionRows,
} from '../src/engine/dimensionArrows.js';
import {
  bayGapsAround, bayWidths, bayWidthsOf, fieldFromX, interiorLeft, xFromField,
} from '../src/engine/partitionPositions.js';

// ─── TURN 23 · F7 (the detail zooms), F8 (hover dimensions), F10 (the
//     partition speaks the shelves' language) ────────────────────────────────

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

// ─── F7 — the CNC detail learns to zoom ────────────────────────────────────

test('F7.1 — FIT shows the whole content, whatever shape the window is', () => {
  const content = {
    x: 0, y: 0, w: 600, h: 300,
  };
  for (const size of [{ w: 800, h: 400 }, { w: 400, h: 800 }, { w: 500, h: 500 }]) {
    const box = fitBox(content, size);
    const h = box.w * (size.h / size.w);
    assert.ok(box.x <= content.x + 1e-9, `left ${box.x}`);
    assert.ok(box.x + box.w >= content.x + content.w - 1e-9, 'right');
    assert.ok(box.y <= content.y + 1e-9, 'top');
    assert.ok(box.y + h >= content.y + content.h - 1e-9, 'bottom');
    // …and CENTRED, which is what "fit to window" means rather than "fit at
    // the top left".
    assert.ok(Math.abs((box.x + box.w / 2) - (content.x + content.w / 2)) < 1e-9);
    assert.ok(Math.abs((box.y + h / 2) - (content.y + content.h / 2)) < 1e-9);
  }
});

test('F7.1 — ZOOM IS ABOUT THE CURSOR: the point under it does not move', () => {
  const size = { w: 800, h: 400 };
  const box = fitBox({
    x: 0, y: 0, w: 600, h: 300,
  }, size);
  const anchor = { x: 120, y: 60 };
  const next = zoomedBox(box, size, 1 / ZOOM_STEP, anchor);
  // The anchor's position as a FRACTION of the view is unchanged, which is the
  // definition of "it stayed under the pointer".
  const before = (anchor.x - box.x) / box.w;
  const after = (anchor.x - next.x) / next.w;
  assert.ok(Math.abs(before - after) < 1e-9, `${before} vs ${after}`);
  assert.ok(next.w < box.w, 'a wheel forward zooms IN');
});

test('F7.1 — the zoom is clamped at both ends', () => {
  const size = { w: 800, h: 400 };
  let box = { x: 0, y: 0, w: 600 };
  for (let i = 0; i < 60; i += 1) box = zoomedBox(box, size, 1 / ZOOM_STEP, null, { min: 10, max: 5000 });
  assert.equal(box.w, 10);
  for (let i = 0; i < 120; i += 1) box = zoomedBox(box, size, ZOOM_STEP, null, { min: 10, max: 5000 });
  assert.equal(box.w, 5000);
});

test('F7.1 — no content, no box: a drawing with nothing in it does not divide by zero', () => {
  assert.equal(fitBox(null, { w: 100, h: 100 }), null);
  assert.equal(fitBox({ x: 0, y: 0, w: 0, h: 10 }, { w: 100, h: 100 }), null);
  assert.equal(fitBox({ x: 0, y: 0, w: 10, h: 10 }, { w: 1, h: 1 }), null);
});

test('F7.1 — ONE implementation: the sheet and the detail share the grammar', () => {
  for (const file of ['components/CncView.jsx', 'components/PartDetailModal.jsx']) {
    assert.match(src(file), /useSheetView/, `${file} uses the shared view`);
  }
  // …and turn 20's capture-on-MOVEMENT law is stated once, in it.
  const hook = src('lib/sheetView.js');
  assert.match(hook, /pan\.current\.panning = true;\s*\n\s*setPanning\(true\);[\s\S]*?setPointerCapture/);
  assert.match(hook, /CAPTURE LAW/);
});

test('F7.2 — nothing about the DRAWING changes: it is presentation only', () => {
  // The part detail's entities are still the engine's own `partDetailDrawing`,
  // untouched by the view; the only thing the zoom writes is a viewBox.
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /viewBox=\{viewBox\}/);
  assert.match(detail, /partDetailDrawing\(panel/);
  assert.doesNotMatch(detail, /scale\(\$\{/, 'the drawing is not re-scaled under the entities');
});

test('F7.1 — the fit control exists and the double-click is wired to it', () => {
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /data-part-fit="1"/);
  assert.match(detail, /onDoubleClick=\{view\.fit\}/);
  assert.match(detail, /onClick=\{view\.fit\}/);
});

// ─── F8 — hover dimensions become drawings ─────────────────────────────────

test('F8.3 — ONE style, in the profile, and both surfaces read it', () => {
  const S = dimensionStyle(P);
  assert.match(S.colour, /^#[0-9a-f]{6}$/i);
  assert.ok(S.strokeMm > 0 && S.strokeMm < 3, 'thin');
  assert.ok(S.textMm > 0 && S.textMm < 40, 'small');
  assert.ok(S.arrowMm > 0);
  // Not the permanent dimension ink: this is a moment, not something the
  // drawing says.
  assert.notEqual(S.colour.toLowerCase(), String(P.dimensions.colours.main || '').toLowerCase());
  for (const file of ['components/PartDetailModal.jsx', '3d/HoverDimensions.jsx']) {
    assert.match(src(file), /dimensionStyle/, `${file} reads the one style`);
  }
});

test('F8.3 — a profile saved before this turn comes back with the style', () => {
  const stored = migrateCabinetProfile({
    carcass: { ...P.carcass }, puzzle: { ...P.puzzle }, wardrobe: { ...P.wardrobe },
  });
  assert.deepEqual(stored.hoverDimensions, P.hoverDimensions);
  // …and a workshop that wants green gets green and keeps the rest.
  const green = migrateCabinetProfile({
    carcass: { ...P.carcass },
    puzzle: { ...P.puzzle },
    wardrobe: { ...P.wardrobe },
    hoverDimensions: { colour: '#00ff00' },
  });
  assert.equal(dimensionStyle(green).colour, '#00ff00');
  assert.equal(dimensionStyle(green).arrowMm, P.hoverDimensions.arrowMm);
});

test('F8 — a dimension is a LINE, two OPEN heads and a value', () => {
  const style = dimensionStyle(P);
  const d = dimensionEntities({ from: [0, 0], to: [100, 0], offset: 0, style });
  assert.equal(d.value, 100);
  // one line + two strokes per head = 5 segments with no extensions
  assert.equal(d.segments.length, 5);
  assert.equal(d.text.value, '100');
  assert.equal(d.text.angle, 0);
  // The heads MEET at the measured points — an arrow that starts short of what
  // it points at is the turn-5 complaint about the room's own arrows.
  const tips = d.segments.slice(1).map(([a]) => `${a[0]},${a[1]}`);
  assert.ok(tips.includes('0,0') && tips.includes('100,0'));
});

test('F8 — an OFFSET dimension grows its extension lines, with a gap at the feature', () => {
  const style = dimensionStyle(P);
  const d = dimensionEntities({
    from: [0, 0], to: [100, 0], offset: style.offsetMm, style,
  });
  assert.equal(d.segments.length, 7, 'two extension lines on top');
  // The extension starts CLEAR of the point it belongs to.
  const [first] = d.segments;
  assert.ok(Math.abs(first[0][1] - style.gapMm) < 1e-9, 'the gap at the feature');
  assert.ok(Math.abs(first[1][1] - (style.offsetMm + style.extensionMm)) < 1e-9, 'and past the line');
});

test('F8 — the value never reads upside down', () => {
  const style = dimensionStyle(P);
  for (const to of [[100, 0], [-100, 0], [0, 100], [0, -100], [-70, -70]]) {
    const d = dimensionEntities({ from: [0, 0], to, offset: 0, style });
    assert.ok(d.text.angle >= -90 && d.text.angle <= 90, `${to} → ${d.text.angle}°`);
  }
});

test('F8 — two points in the same place are not a dimension', () => {
  const style = dimensionStyle(P);
  assert.equal(dimensionEntities({ from: [10, 10], to: [10, 10], offset: 0, style }), null);
  assert.equal(dimensionSet([{ from: [0, 0], to: [0, 0] }], style).length, 0);
});

test('F8.1 — a hovered feature is measured to BOTH nearest edges and its neighbour', () => {
  const style = dimensionStyle(P);
  const rows = featureDimensionRows({
    feature: { x: 37, y: 100 },
    size: { w: 600, h: 800 },
    others: [{ id: 'b', x: 37, y: 132 }, { id: 'c', x: 500, y: 700 }],
    style,
  });
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.find((r) => r.key === 'x').from, [0, 100], 'the NEARER edge in x');
  assert.deepEqual(rows.find((r) => r.key === 'y').from, [37, 0], '…and in y');
  assert.equal(rows.find((r) => r.key.startsWith('n:')).to[1], 132, 'the NEAREST neighbour, not the first');
});

test('F8.1 — the nearer edge is chosen, not always the left', () => {
  const style = dimensionStyle(P);
  const rows = featureDimensionRows({
    feature: { x: 563, y: 700 }, size: { w: 600, h: 800 }, others: [], style,
  });
  assert.deepEqual(rows.find((r) => r.key === 'x').from, [600, 700]);
  assert.deepEqual(rows.find((r) => r.key === 'y').from, [563, 800]);
});

test('F8.1 — a feature on a part with nothing else on it still dimensions itself', () => {
  const style = dimensionStyle(P);
  const rows = featureDimensionRows({
    feature: { x: 50, y: 50 }, size: { w: 600, h: 800 }, others: [], style,
  });
  assert.equal(rows.length, 2, 'the two edges, and no neighbour to measure to');
});

test('F8.1 — the corner CAPTION is gone from the detail', () => {
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /THE CAPTION GOES AWAY/);
  // The turn-20 sheet TOOLTIP stays where it is — different surface, different
  // job — so its own file still carries it.
  assert.match(src('components/CncView.jsx'), /rollover/i);
});

test('F8.2 + R7 — the scene helpers are found by userData, never by a DOM attribute', () => {
  const hover = src('3d/HoverDimensions.jsx');
  assert.match(hover, /ccHelper: true/);
  assert.match(hover, /ccHoverDimension/);
  assert.doesNotMatch(hover, /data-[a-z]+=/);
});

test('F8.2 — the scene hover is a MOMENT: it writes nothing', () => {
  const view = src('3d/UnitView.jsx');
  assert.match(view, /setHoverPartition\(p\.id\)/);
  assert.match(view, /setHoverPartition\(null\)/);
  // …and it is not drawn in contour mode, which is a presentation and not a
  // measurement — the rule every helper in that file already follows.
  assert.match(view, /hoverPartition && !contour/);
});

// ─── F10 — the partition speaks the shelves' language ──────────────────────

test('F10.1 — the field is measured from the INTERIOR face', () => {
  assert.equal(interiorLeft(18), 18);
  assert.equal(fieldFromX(450, 18), 432);
  assert.equal(xFromField(432, 18), 450);
});

test('F10.2 — STORAGE DOES NOT MOVE: the mapping round-trips exactly', () => {
  for (const boardT of [16, 18, 19, 22, 25]) {
    for (const x of [18, 100, 432, 450, 899.5, 1200]) {
      assert.equal(xFromField(fieldFromX(x, boardT), boardT), x, `${x} @ ${boardT}`);
      assert.equal(fieldFromX(xFromField(x, boardT), boardT), x);
    }
  }
});

test('F10.2 — a turn-22 project loads IDENTICAL: nothing about x_mm changed', () => {
  // The stored value goes into the engine untouched; only what is SHOWN moved.
  const base = defaultParamsFor('WARDROBE', P);
  const params = {
    ...base,
    width: 900,
    sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450 }] }],
  };
  const before = computeCabinet(params, P);
  const vp = before.panels.find((p) => p.part === 'VPART');
  assert.equal(vp.box.x, 450, 'the partition is exactly where the saved project put it');
  // …and typing what the field NOW shows back into it puts it in the same place.
  const boardT = P.board.thickness;
  const retyped = computeCabinet({
    ...params,
    sections: [{
      width_mm: 900,
      items: [{ id: 'p1', kind: 'partition', x_mm: xFromField(fieldFromX(450, boardT), boardT) }],
    }],
  }, P);
  assert.deepEqual(retyped.panels.find((p) => p.part === 'VPART').box, vp.box);
});

test('F10.1 — CLEAR BAY WIDTHS: side ↔ partition ↔ partition ↔ side', () => {
  const bays = bayWidths({
    width: 1400,
    boardT: 18,
    partitions: [{ x: 400, w: 18 }, { x: 800, w: 18 }],
  });
  assert.equal(bays.length, 3);
  assert.deepEqual(bays.map((b) => b.size), [382, 382, 564]);
  // …and they add up to the interior less the partitions, which is the check a
  // joiner would do.
  const interior = 1400 - 2 * 18;
  assert.equal(bays.reduce((n, b) => n + b.size, 0) + 2 * 18, interior);
});

test('F10.1 — no partitions is ONE bay, and it is the interior', () => {
  const bays = bayWidths({ width: 600, boardT: 18, partitions: [] });
  assert.equal(bays.length, 1);
  assert.equal(bays[0].size, 564);
});

test('F10.1 — ONE function: the bays and F8.2\'s arrows are the same faces', () => {
  const result = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    width: 1400,
    sections: [{
      width_mm: 1400,
      items: [{ id: 'p1', kind: 'partition', x_mm: 400 }, { id: 'p2', kind: 'partition', x_mm: 800 }],
    }],
  }, P);
  const bays = bayWidthsOf(result, P.board.thickness);
  assert.equal(bays.length, 3);

  // The hover arrows on the MIDDLE partition are bays 2 and 3 of that list.
  const panels = result.panels.filter((p) => p.box);
  const me = panels.find((p) => p.id === 'VPART-2');
  const walls = panels
    .filter((p) => (p.part === 'BUL' || p.part === 'BUR' || (p.part === 'VPART' && p.id !== me.id)))
    .map((p) => ({ x: p.box.x, w: p.box.w }));
  const gaps = bayGapsAround({ at: { x: me.box.x, w: me.box.w }, walls });
  assert.equal(gaps.length, 2);
  assert.equal(gaps[0].value, bays[1].size, 'the bay to its left');
  assert.equal(gaps[1].value, bays[2].size, '…and to its right');
});

test('F10.1 — the outermost partition still has a side to measure to', () => {
  const walls = [{ x: 0, w: 18 }, { x: 800, w: 18 }, { x: 1382, w: 18 }];
  const gaps = bayGapsAround({ at: { x: 400, w: 18 }, walls });
  assert.deepEqual(gaps.map((g) => g.value), [382, 382]);
});

test('F10.3 — the field, the Centre action and the P rows all say the same thing', () => {
  const panel = src('components/RightPanel.jsx');
  assert.match(panel, /fieldFromX\(pt\.x_mm/);
  assert.match(panel, /xFromField\(v, boardT\)/);
  assert.match(panel, /INSIDE face of the left side panel/);
  assert.match(panel, /Equal bays/, 'the action is named for what it is for');
  assert.match(panel, /data-partition-bays="1"/, 'and the bays themselves are shown');

  const props = src('components/ElementProperties.jsx');
  assert.match(props, /fieldFromX\(item\?\.x_mm/);
  assert.match(props, /xFromField\(v, G\)/);
  assert.match(props, /INSIDE face of the left side panel/);
});
