// ─── TURN 43, F2: THE SHAKER IS DRAWN AT THE PROJECT'S MILLIMETRES ──────────
//
// The owner, 20.08.2026: *"Shaker prawdziwy — ile mam mm, tyle powinno być
// pokazane."*
//
// ─── WHAT WAS MEASURED, ON THE REAL ENGINE, BEFORE A LINE WAS WRITTEN ───────
//
//   project frame 80 mm   →   DRAWN 60 mm
//
// and the cause is three files deep and completely mechanical: `frontDetail`
// was called with no frame (`frontElevation.js`, `views.js`), and `design`
// never reached `wallDrawingSheets` at all — so `shakerFrameMm(null, profile)`
// answered with the PROFILE DEFAULT every single time. `engine/shaker.js`
// already knew how to read the project's number since turn 25. Nobody handed
// it the project.
//
// Every assertion below is on the SVG's own numbers or on the entity list.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { shakerFrameMm, shakerSpec } from '../src/engine/shaker.js';
import { buildFrontElevation } from '../src/engine/drawings/frontElevation.js';
import { buildWallElevation, wallGroups } from '../src/engine/drawings/wallElevation.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import {
  T43_DESIGN, T43_PROJECT, T43_ROOM, t43Entries,
} from './fixtures/t43-kitchen.js';

const FRAME = 85;

/**
 * The INSET of the shaker rectangle inside its front, measured off the drawn
 * geometry: for every DOORS rect, the smallest gap to a DOORS rect that
 * contains it. That is what a joiner reads off the sheet, and it is what the
 * owner is complaining about.
 */
function insetsOn(entities) {
  const rects = entities.filter((e) => e.kind === 'rect' && e.layer === 'DOORS');
  const out = [];
  for (const inner of rects) {
    for (const outer of rects) {
      if (outer === inner) continue;
      const left = inner.x - outer.x;
      const right = (outer.x + outer.w) - (inner.x + inner.w);
      const down = inner.y - outer.y;
      const up = (outer.y + outer.h) - (inner.y + inner.h);
      if (left <= 0 || right <= 0 || down <= 0 || up <= 0) continue;
      // Equal on all four sides — the owner's *"shaker zawsze równy"*.
      if (Math.abs(left - right) > 1e-6 || Math.abs(left - down) > 1e-6 || Math.abs(left - up) > 1e-6) continue;
      out.push(Math.round(left * 1000) / 1000);
    }
  }
  return out;
}

const wallA = (design) => {
  const entries = t43Entries(P);
  return buildWallElevation(wallGroups(entries, P)[0], {
    withFronts: true,
    room: T43_ROOM,
    profile: P,
    frontTypeOf: (u) => resolveUnitDesign(u, T43_DESIGN).frontType,
    shakerFrame: shakerFrameMm(design, P),
  });
};

test('F2 — the fault, stated as arithmetic: the profile default is NOT 85', () => {
  // If these two were ever the same number the test below would pass by
  // accident, and this turn would prove nothing.
  assert.notEqual(shakerSpec(P).frameWidth, FRAME, 'the proof frame is not the profile default');
  assert.equal(shakerFrameMm(T43_DESIGN, P), FRAME, 'the project says 85, and the law reads it');
  assert.equal(shakerFrameMm(null, P), shakerSpec(P).frameWidth, 'no project = the profile default');
});

test('F2 — /1 draws the PROJECT\'s 85 on every front that will carry it', () => {
  const insets = insetsOn(wallA(T43_DESIGN).entities);
  assert.ok(insets.length >= 4, `there are shaker rectangles to measure: ${insets.length}`);
  for (const v of insets) assert.equal(v, FRAME, `every inset on the sheet is 85, not ${v}`);
});

test('F2 — …and with no design it is still the profile default, exactly as before', () => {
  const insets = insetsOn(wallA(null).entities);
  assert.ok(insets.length >= 4, 'the same fronts are still detailed');
  for (const v of insets) assert.equal(v, shakerSpec(P).frameWidth, 'the pre-T43 answer, unchanged');
});

test('F2 — the SVG of the real sheet carries the 85, in its own numbers', () => {
  const set = wallDrawingSheets({
    entries: t43Entries(P),
    project: T43_PROJECT,
    room: T43_ROOM,
    design: T43_DESIGN,
    frontTypeOf: (u) => resolveUnitDesign(u, T43_DESIGN).frontType,
    profile: P,
    format: 'A3',
    date: '20/08/2026',
  });
  const one = set.find((s) => s.name === 'Wall A /1');
  const svg = sheetToSvg(one.sheet, { kind: 'wall-elevation' });
  // Off the SVG: every rect, and the same containment measure — at PAPER
  // millimetres, so the number is 85 ÷ the sheet's own scale. The ratio is
  // what is asserted, because that is scale-free and is what the eye reads.
  const rects = [...svg.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*data-layer="DOORS"/g)]
    .map((m) => ({
      x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]),
    }));
  assert.ok(rects.length >= 8, `the sheet has fronts and their panels on it: ${rects.length}`);
  const scale = one.sheet.scale;
  const insets = insetsOn(rects.map((r) => ({ ...r, kind: 'rect', layer: 'DOORS' })));
  assert.ok(insets.length >= 4, 'the SVG carries shaker rectangles');
  for (const v of insets) {
    assert.ok(Math.abs(v * scale - FRAME) < 0.01, `${v} paper mm at 1:${scale} is ${v * scale} — must be 85`);
  }
});

test('F2 — a front too small for the frame is CUT PLAIN, and drawn plain', () => {
  // `shakerFits` still decides per front, at the threaded frame. A 100 mm
  // drawer front cannot carry an 85 mm frame: 2 × 85 + minPanel is more than
  // 100, so the saw leaves it plain and so does the drawing.
  const result = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '01', width: 600, front_type: 'S', drawers: 5,
  }, P);
  const drawing = buildFrontElevation(result, {
    unitNum: '01', frontType: 'S', profile: P, frontsOnly: true, shakerFrame: 200,
  });
  assert.deepEqual(insetsOn(drawing.entities), [],
    'a 200 mm frame fits no front in this cabinet, and not one inner rect is drawn');
});
