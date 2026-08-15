// ─── F7: THE HOVER AURA (turn 31, CLAUDE.md F7) ─────────────────────────────
//
// "Not a snap — a CATCHMENT."
//
// That distinction is the feature. A SNAP moves the thing you are pointing at;
// a CATCHMENT moves what counts as pointing at it. A bar handle is 12 mm of rod
// and a hinge arm is a 4 mm plate — two or three pixels on a canvas showing a
// whole kitchen — so pointing at one is pixel-hunting, which is why the owner
// has to zoom in before he can double-click a hinge.
//
// Nothing about the piece moves and no drilling changes: the aura is a fact
// about the POINTER.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  auraBox, auraColour, auraLabel, auraLingerMs, auraMm, handleEdgeDistance,
  handleEdgeDistances, showsBothAxes,
} from '../src/engine/hoverAura.js';

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

// The handle is a PROJECT decision travelling the override channel
// (`project_handle`), which is what `paramsForEngine` hands down — so this is
// how a cabinet in a real job gets one.
const withHandle = (handle = { type: 'bar', centres: 128 }) => computeCabinet({
  ...defaultParamsFor('BUD', P), width: 600, project_handle: handle,
});

test('the two numbers are the owner’s, and they are PROFILE numbers', () => {
  assert.equal(P.editor.hoverAura.mm, 8, '~8 mm in scene mm');
  assert.equal(P.editor.hoverAura.lingerMs, 300, '~300 ms');
  assert.equal(auraMm(P), 8);
  assert.equal(auraLingerMs(P), 300);
  // A workshop's own numbers are read; a profile that predates the block is not.
  assert.equal(auraMm({ editor: { hoverAura: { mm: 12 } } }), 12);
  assert.equal(auraLingerMs({}), 300);
  const old = migrateCabinetProfile({ editor: { mmStep: 1 } });
  assert.equal(old.editor.hoverAura.mm, 8);
  assert.equal(old.editor.hoverAura.lingerMs, 300);
});

test('ORANGE — because red is reserved for Check', () => {
  assert.equal(auraColour(P), '#e08a2e');
  // Not the app's own danger red, whatever else it is.
  assert.notEqual(auraColour(P).toLowerCase(), P.appearance.frontGapWarning.colour.toLowerCase());
  assert.equal(auraColour({ editor: { hoverAura: { colour: '#ff9900' } } }), '#ff9900');
});

test('the box is the PIECE plus the catchment on EVERY side', () => {
  const box = auraBox({ w: 12, h: 160, d: 35 }, P);
  // 8 mm each side is 16 on each axis.
  assert.deepEqual(box, { w: 12 + 16, h: 160 + 16, d: 35 + 16 });
  // A 4 mm hinge arm becomes 20 mm of target — five times the reach, which is
  // the difference between a click that lands and one that does not.
  assert.equal(auraBox({ w: 4, h: 4, d: 4 }, P).w, 20);
  // A piece with no size stated is still a target rather than a point.
  assert.deepEqual(auraBox(null, P), { w: 16, h: 16, d: 16 });
});

test('a HANDLE’s number is its distance to the NEAREST front edge — one number', () => {
  const r = withHandle();
  const panel = r.panels.find((p) => p.meta?.handle);
  assert.ok(panel, 'no handle was resolved');
  const one = handleEdgeDistance(panel);
  assert.ok(one, 'no distance');
  // The NEAREST: a handle 45 from the left of a 597 door is also 552 from the
  // right, and only the first of those is what a joiner checks.
  const spec = panel.meta.handle;
  const all = [spec.x, panel.w - spec.x, spec.y, panel.h - spec.y];
  assert.equal(one.mm, Math.round(Math.min(...all) * 10) / 10);
  // …and it says WHICH edge, because "45" alone is a number you have to go and
  // work out the meaning of.
  assert.ok(['left', 'right', 'top', 'bottom'].includes(one.edge));
  assert.match(one.label, /^[\d.]+ from (left|right|top|bottom)$/);
});

test('…and the owner may extend it to two, with one profile line', () => {
  const r = withHandle();
  const panel = r.panels.find((p) => p.meta?.handle);
  assert.equal(showsBothAxes(P), false, 'one number is the default');
  assert.equal(auraLabel({ kind: 'handle', panel }, P), handleEdgeDistance(panel).label);

  const both = { editor: { hoverAura: { showBothAxes: true } } };
  assert.equal(showsBothAxes(both), true);
  const two = auraLabel({ kind: 'handle', panel }, both);
  assert.match(two, / · /, 'the second number is not there');
  const pair = handleEdgeDistances(panel);
  assert.ok(pair.across.mm >= 0 && pair.up.mm >= 0);
  // Each axis names the nearer of ITS two edges.
  assert.ok(pair.across.mm <= panel.w / 2 + 1e-9);
  assert.ok(pair.up.mm <= panel.h / 2 + 1e-9);
});

test('a HINGE’s number is its row height — the number its own editor edits', () => {
  assert.equal(auraLabel({ kind: 'hinge', mm: 470 }, P), '470 up');
  assert.equal(auraLabel({ kind: 'hinge', mm: 100.25 }, P), '100.3 up');
  // A piece with nothing to say says nothing rather than "undefined".
  assert.equal(auraLabel({ kind: 'hinge' }, P), null);
  assert.equal(auraLabel({ kind: 'handle', panel: {} }, P), null);
  assert.equal(auraLabel(null, P), null);
});

test('the aura reads the ENGINE’s own placement — nothing is re-derived', () => {
  const r = withHandle();
  const panel = r.panels.find((p) => p.meta?.handle);
  // The frame is the panel's own, which is the frame `engine/handles.js` placed
  // the handle in — so the number on the screen cannot drift from the drilling.
  const src = read('engine/hoverAura.js');
  assert.match(src, /const spec = panel\?\.meta\?\.handle/);
  // It reads `panel.meta.handle` — the placement the engine already made — and
  // never calls the placement law itself.
  assert.ok(!/resolveHandle\(/.test(src), 'the aura re-derives the placement');
  assert.equal(handleEdgeDistance({ ...panel, meta: {} }), null);
});

// ─── THE COMPONENT ──────────────────────────────────────────────────────────

test('the LINGER is a timer, and leaving/returning cancels it', () => {
  const src = read('3d/HoverAura.jsx');
  // The flicker this exists to stop is not a bug: three.js raycasts per frame,
  // and a hand held still on a boundary crosses it several times a second.
  assert.match(src, /const enter = useCallback/);
  assert.match(src, /const leave = useCallback/);
  assert.match(src, /if \(timer\.current\) \{ clearTimeout\(timer\.current\); timer\.current = null; \}/);
  assert.match(src, /setTimeout\(\(\) => \{ timer\.current = null; setHot\(false\); \}, linger\)/);
  // …and a pending leave never outlives the piece.
  assert.match(src, /useEffect\(\(\) => \(\) => \{ if \(timer\.current\) clearTimeout\(timer\.current\); \}, \[\]\)/);
});

test('the aura is INVISIBLE and takes no bounds — it is not furniture', () => {
  const src = read('3d/HoverAura.jsx');
  assert.match(src, /visible=\{false\}/);
  assert.match(src, /ccNoBounds: true/);
  assert.match(src, /opacity=\{0\}/);
  assert.match(src, /depthWrite=\{false\}/);
  // R7: userData, never a data-* attribute — a data-* on an R3F mesh crashes
  // the reconciler, and this folder has learnt it twice.
  assert.match(src, /ccHoverAura/);
  assert.ok(!/data-[a-z]/.test(src), 'a DOM attribute got onto a mesh');
});

test('it is the SAME box that grabs — no more pixel-hunting a thin rail', () => {
  const src = read('3d/HoverAura.jsx');
  assert.match(src, /onDoubleClick=\{onActivate/);
  assert.match(src, /onPointerOver/);
  assert.match(src, /onPointerOut/);
  // ONE mesh carries all three — hover, label and grab. (`<meshBasicMaterial`
  // is a material, not a second mesh.)
  assert.equal((src.match(/<mesh\s/g) || []).length, 1);
});

test('EVERY handle and EVERY hinge has one', () => {
  const hw = read('3d/Hardware.jsx');
  assert.match(hw, /import HoverAura from '\.\/HoverAura\.jsx'/);
  // A hinge, in the loop over the drilled instances.
  assert.match(hw, /subject=\{\{ kind: 'hinge'/);
  // A knob AND a bar — the two kinds of handle this app draws.
  assert.equal((hw.match(/subject=\{\{ kind: 'handle'/g) || []).length, 2);
  // The bar's box is round the WHOLE rail, not round one post.
  assert.match(hw, /size=\{horizontal[\s\S]{0,200}rodLen/);
});

test('the hinge aura still opens the hinge’s own window', () => {
  const hw = read('3d/Hardware.jsx');
  const at = hw.indexOf("subject={{ kind: 'hinge'");
  const body = hw.slice(at, at + 700);
  assert.match(body, /onActivate=\{onEditHinge/);
  assert.match(body, /panelId: h\.panelId/);
  // …counted from the floor exactly as the engine counts them, which is what
  // turn 19's own pick surface did and what the editor's rows are indexed by.
  assert.match(body, /indexOf\(h\)/);
});

test('nothing about the aura reaches the engine (iron rule 1)', () => {
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.ok(!/hoverAura/.test(engine));
  // …and the module itself is pure: it computes millimetres from a panel the
  // engine already cut. No React, no store, no three.js.
  const src = read('engine/hoverAura.js');
  assert.ok(!/^import /m.test(src), 'the rulebook imports something');
});
