import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  CHIMNEY_DEFAULTS, MIN_ELEMENT_MM, PLAN_KINDS, RECESS_DEFAULTS, WALL_ELEMENT_KINDS,
  allDimensionSegments, clampPlanElement, elevationDimensionChains, migrateWallElement,
  movePlanElement, planElementsOnWall, wallElements, wallSlopes,
} from '../src/lib/wallElements.js';

// ─── TURN 45 · F1 — THE WALL GETS DIMENSIONS, AND A PLAN VIEW ───────────────
//
// CLAUDE.md, 23.08.2026:
//
//   *"F1a Live dimension chains exactly as his red pen: top = wall width + the
//   slope's run segment; right edge = slope drop + the wall stub under it;
//   left = full height; bottom = width. They follow every drag live.
//   F1b A `Front / Top` switch in the wall modal. Top = the wall seen from
//   above: wall line, depth zone, and two NEW draggable elements — `Recess` and
//   `Chimney` (rectangles with width + depth, double-click for numbers). Stored
//   on the same wall model. Engine ignores them this turn — they are geometry
//   for the eye and for future unit clamping."*

const MODAL = readFileSync(new URL('../src/components/WallElevationModal.jsx', import.meta.url), 'utf8');
const STORE = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');

const SLOPE_R = {
  id: 's1', kind: 'slope', wall: 0, side: 'R', startHeight: 1800, run: 900,
};
const SLOPE_L = {
  id: 's2', kind: 'slope', wall: 0, side: 'L', startHeight: 1500, run: 600,
};
const WALL = { wallWidth: 3000, wallHeight: 2400 };

// ══ F1a — the four chains ═══════════════════════════════════════════════════

test('F1a — a plain wall gets four chains and nothing invented', () => {
  const c = elevationDimensionChains({ ...WALL, slopes: [] });
  assert.deepEqual(c.top.map((d) => d.mm), [3000], 'top = wall width');
  assert.deepEqual(c.bottom.map((d) => d.mm), [3000], 'bottom = width');
  assert.deepEqual(c.left.map((d) => d.mm), [2400], 'left = full height');
  assert.deepEqual(c.right.map((d) => d.mm), [2400], '…and so is the right, with nothing to break it');
  assert.equal(allDimensionSegments(c).length, 4);
});

test('F1a — TOP = wall width + the slope’s RUN segment, where the slope is', () => {
  const right = elevationDimensionChains({ ...WALL, slopes: [SLOPE_R] });
  assert.deepEqual(right.top.map((d) => d.mm), [3000, 900]);
  // …and it is called out at the END the ceiling comes down at.
  assert.deepEqual(right.top[1].from, 2100);
  assert.deepEqual(right.top[1].to, 3000);

  const left = elevationDimensionChains({ ...WALL, slopes: [SLOPE_L] });
  assert.deepEqual(left.top.map((d) => d.mm), [3000, 600]);
  assert.deepEqual(left.top[1].from, 0);
  assert.deepEqual(left.top[1].to, 600);
});

test('F1a — RIGHT EDGE = the slope DROP + the wall STUB under it', () => {
  const c = elevationDimensionChains({ ...WALL, slopes: [SLOPE_R] });
  assert.deepEqual(c.right.map((d) => d.mm), [600, 1800], 'drop, then the stub');
  assert.deepEqual(c.right.map((d) => d.label), ['slope drop', 'wall under it']);
  // …and they add up to the wall, which is the check a joiner does by eye.
  assert.equal(c.right[0].mm + c.right[1].mm, WALL.wallHeight);
  // A slope on the LEFT does not break the right edge: it says the height once
  // rather than as two segments that add to the same thing.
  const l = elevationDimensionChains({ ...WALL, slopes: [SLOPE_L] });
  assert.deepEqual(l.right.map((d) => d.mm), [2400]);
  assert.deepEqual(l.left.map((d) => d.mm), [900, 1500]);
});

test('F1a — two slopes, one at each end, break both edges and both top runs', () => {
  const c = elevationDimensionChains({ ...WALL, slopes: [SLOPE_R, SLOPE_L] });
  assert.deepEqual(c.top.map((d) => d.mm).sort((a, b) => b - a), [3000, 900, 600]);
  assert.deepEqual(c.left.map((d) => d.mm), [900, 1500]);
  assert.deepEqual(c.right.map((d) => d.mm), [600, 1800]);
});

test('F1a — the chains FOLLOW: change a number and every segment moves with it', () => {
  // "They follow every drag live" is a claim about a PURE FUNCTION of the
  // numbers — which is why the editor can simply re-render and be right.
  const before = elevationDimensionChains({ ...WALL, slopes: [SLOPE_R] });
  const dragged = elevationDimensionChains({
    ...WALL, slopes: [{ ...SLOPE_R, run: 1500 }],
  });
  assert.equal(before.top[1].mm, 900);
  assert.equal(dragged.top[1].mm, 1500);
  assert.equal(dragged.top[1].from, 1500, 'the callout moved with the ridge');
  // …and a wider wall moves the width, the run's position and the bottom.
  const wider = elevationDimensionChains({ wallWidth: 4000, wallHeight: 2400, slopes: [SLOPE_R] });
  assert.equal(wider.top[0].mm, 4000);
  assert.equal(wider.bottom[0].mm, 4000);
  assert.equal(wider.top[1].from, 3100);
});

test('F1a — a slope with no run at all is not a broken edge', () => {
  const c = elevationDimensionChains({ ...WALL, slopes: [{ ...SLOPE_R, run: 0 }] });
  assert.deepEqual(c.top.map((d) => d.mm), [3000]);
  assert.deepEqual(c.right.map((d) => d.mm), [2400]);
  // …and nothing at all is not a crash.
  assert.equal(allDimensionSegments(elevationDimensionChains()).length, 4);
  assert.equal(allDimensionSegments(null).length, 0);
});

test('F1a — the surface draws numbers it did not work out', () => {
  assert.match(MODAL, /import \{[\s\S]*elevationDimensionChains[\s\S]*\} from '\.\.\/lib\/wallElements\.js'/);
  assert.match(MODAL, /const chains = useMemo\(\(\) => elevationDimensionChains\(\{/);
  assert.match(MODAL, /chains\.top\.map/);
  assert.match(MODAL, /chains\.bottom\.map/);
  assert.match(MODAL, /chains\.left\.map/);
  assert.match(MODAL, /chains\.right\.map/);
  assert.match(MODAL, /function DimLine\(\{/);
  assert.match(MODAL, /data-dim=\{id\}/);
  assert.match(MODAL, /data-dim-mm=\{mm\}/);
});

// ══ F1b — the top view ══════════════════════════════════════════════════════

test('F1b — the wall model takes three kinds now, on ONE list', () => {
  assert.deepEqual(WALL_ELEMENT_KINDS, ['slope', 'recess', 'chimney']);
  assert.deepEqual(PLAN_KINDS, ['recess', 'chimney']);
  const list = wallElements([
    SLOPE_R,
    { kind: 'recess', wall: 0, x_mm: 100 },
    { kind: 'chimney', wall: 0, x_mm: 2000 },
  ]);
  assert.deepEqual(list.map((el) => el.kind), ['slope', 'recess', 'chimney']);
  // …and the two readers that slice it.
  assert.deepEqual(wallSlopes(list).map((el) => el.kind), ['slope']);
  assert.deepEqual(planElementsOnWall(list, 0).map((el) => el.kind), ['recess', 'chimney']);
  assert.deepEqual(planElementsOnWall(list, 1), [], 'keyed by the SAME wall index');
});

test('F1b — a T44 project opens with its slopes exactly where it left them', () => {
  // T44 wrote records with `kind: 'slope'`; earlier drafts wrote none at all.
  // Both must come back as slopes and not be dropped by the new dispatcher.
  const legacy = wallElements([
    { id: 'a', wall: 0, side: 'L', startHeight: 1500, run: 600 },
    { id: 'b', kind: 'slope', wall: 0, side: 'R', startHeight: 1800, run: 900 },
  ]);
  assert.equal(legacy.length, 2);
  assert.deepEqual(legacy.map((el) => el.kind), ['slope', 'slope']);
  assert.equal(legacy[0].side, 'L');
  assert.equal(legacy[1].run, 900);
});

test('F1b — a recess and a chimney are a rectangle: width + depth', () => {
  const r = migrateWallElement({ kind: 'recess', wall: 0 });
  assert.equal(r.width, RECESS_DEFAULTS.width);
  assert.equal(r.depth, RECESS_DEFAULTS.depth);
  const c = migrateWallElement({ kind: 'chimney', wall: 0 });
  assert.equal(c.width, CHIMNEY_DEFAULTS.width);
  assert.equal(c.depth, CHIMNEY_DEFAULTS.depth);
  // Nothing shrinks below what the editor can hold.
  assert.equal(migrateWallElement({ kind: 'recess', wall: 0, width: 1, depth: 1 }).width, MIN_ELEMENT_MM);
  // The SIGN of the depth is not stored — the kind says which way it goes.
  assert.equal(migrateWallElement({ kind: 'chimney', wall: 0, depth: -350 }).depth, MIN_ELEMENT_MM);
});

test('F1b — a plan element is pulled back into its wall, like a window is', () => {
  const el = clampPlanElement({
    kind: 'recess', wall: 0, x_mm: 5000, width: 900, depth: 300,
  }, { wallWidth: 3000 });
  assert.equal(el.x_mm, 2100, 'the far end, not past it');
  const wide = clampPlanElement({
    kind: 'recess', wall: 0, x_mm: 0, width: 9000, depth: 300,
  }, { wallWidth: 3000 });
  assert.equal(wide.width, 3000, 'no wider than the wall it is in');
});

test('F1b — dragging moves it along the wall AND changes its depth', () => {
  const el = {
    id: 'r1', kind: 'recess', wall: 0, x_mm: 500, width: 900, depth: 300,
  };
  assert.deepEqual(movePlanElement(el, { dxMm: 200 }, { wallWidth: 3000 }), { x_mm: 700, depth: 300 });
  assert.deepEqual(movePlanElement(el, { ddMm: 150 }, { wallWidth: 3000 }), { x_mm: 500, depth: 450 });
  // …clamped at both ends of the wall.
  assert.equal(movePlanElement(el, { dxMm: -9999 }, { wallWidth: 3000 }).x_mm, 0);
  assert.equal(movePlanElement(el, { dxMm: 9999 }, { wallWidth: 3000 }).x_mm, 2100);
  // …and never shrunk out of existence.
  assert.equal(movePlanElement(el, { ddMm: -9999 }, { wallWidth: 3000 }).depth, MIN_ELEMENT_MM);
});

test('F1b — the switch, the plan drawing, and the two tools', () => {
  assert.match(MODAL, /const \[view, setView\] = useState\('front'\);/);
  assert.match(MODAL, /data-wall-view-switch="1"/);
  assert.match(MODAL, /data-wall-view-option=\{id\}/);
  assert.match(MODAL, /data-wall-view=\{view\}/);
  // the plan: a wall line, a depth zone, and the elements
  assert.match(MODAL, /data-wall-plan-svg="1"/);
  assert.match(MODAL, /data-plan-wall-line="1"/);
  assert.match(MODAL, /data-plan-depth-zone=\{unitDepth\}/);
  assert.match(MODAL, /data-plan-element=\{el\.id\}/);
  assert.match(MODAL, /data-plan-kind=\{el\.kind\}/);
  // …dragged with a real pointer, and double-clicked for its numbers
  assert.match(MODAL, /onPointerDown=\{\(e\) => startPlanDrag\(e, el\)\}/);
  assert.match(MODAL, /onDoubleClick=\{\(\) => openElement\(el\)\}/);
  assert.match(MODAL, /data-plan-width="1"/);
  assert.match(MODAL, /data-plan-depth="1"/);
  assert.match(MODAL, /data-plan-x="1"/);
  // …and the two tools, offered in the view that can show them
  assert.match(MODAL, /data-elevation-add=\{id\}/);
  assert.match(MODAL, /addPlanElement\('recess'\)/);
  assert.match(MODAL, /addPlanElement\('chimney'\)/);
});

test('F1b — the DEPTH ZONE is the project’s own unit depth, read never written', () => {
  assert.match(MODAL, /import \{ projectDepth \} from '\.\.\/engine\/projectSettings\.js'/);
  assert.match(MODAL, /const unitDepth = useMemo\(/);
  assert.doesNotMatch(MODAL, /setProjectDefaults|setDesign\(/, 'the plan writes no design field');
});

test('F1b — editing a slope cannot drop a chimney, and the store keeps one list', () => {
  // The bug this shape invites: the front view holds `slopes`, writes
  // `setWallSlopes(slopes.map(...))`, and the plan elements are gone. Every
  // write goes through the WHOLE list instead.
  assert.match(MODAL, /const updateElement = \(id, patch\) => setWallSlopes\(\s*\n\s*all\.map/);
  assert.match(MODAL, /const removeStoredElement = \(id\) => setWallSlopes\(all\.filter/);
  assert.match(MODAL, /setWallSlopes\(\[\.\.\.all, slope\]\)/);
  assert.match(MODAL, /setWallSlopes\(\[\.\.\.all, el\]\)/);
  assert.doesNotMatch(MODAL, /setWallSlopes\(slopes\./, 'a write that knows only the slopes');
  // …and the store normalises all three kinds on every path in.
  assert.match(STORE, /import \{ migrateWallElement, wallElements \} from '\.\.\/lib\/wallElements\.js'/);
  // Every path in — the cached tab, `loadProject`, and the four setters —
  // normalises through the one reader, so no route can leave a raw record in.
  assert.ok((STORE.match(/wallElements\(/g) || []).length >= 6);
  assert.doesNotMatch(STORE, /wallSlopes\(cached/, 'the cached tab, normalised as all three kinds');
  assert.match(STORE, /wallSlopes: wallElements\(project\?\.wallSlopes\)/, 'and a saved job too');
});

test('F1b — the ENGINE ignores them: geometry for the eye, this turn', () => {
  // Nothing in `src/engine/**` reads a plan element. `wallElements.js` is a lib
  // and `computeCabinet` has never heard of it — which is the whole reason the
  // six standard configs do not move (iron rule 2).
  const LIB = readFileSync(new URL('../src/lib/wallElements.js', import.meta.url), 'utf8');
  assert.doesNotMatch(LIB, /from '\.\.\/engine\//, 'the wall model imports no engine at all');
});
