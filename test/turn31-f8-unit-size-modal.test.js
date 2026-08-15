// ─── F8: THE FIGURE ON THE CANVAS IS A CONTROL (turn 31, CLAUDE.md F8) ──────
//
// "Double-click the width or height figure on the canvas → a small modal
// (through F1's shell, beside the click) with width and height fields; commit
// on Enter. Existing engine setters; NOTHING NEW IN THE ENGINE."
//
// The last clause is the specification of what this feature may do, and it is
// what most of this file asserts: `800` drawn under a cabinet is a number the
// store's own setter already owns, with a clamp that already refuses a width
// that would eat a neighbour. This window types into that setter and knows no
// rule of its own.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { MODAL_KINDS, modalNeedsAnchor } from '../src/lib/modalLayer.js';

const store = () => useProjectStore.getState();
const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

function project() {
  store().loadProject({
    id: null, name: 'size', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

test('the FIGURE is pickable — an invisible catchment, not a visible button', () => {
  const chain = read('3d/DimensionChain.jsx');
  // A dimension caption is a sprite: a billboard with no thickness, and F7's
  // pixel-hunting all over again. Same answer, same pattern.
  assert.match(chain, /ccDimensionPick: row\.key/);
  assert.match(chain, /visible=\{false\}/);
  assert.match(chain, /onDoubleClick=\{\(e\) => \{ e\.stopPropagation\(\); onPick\(e\); \}\}/);
  // A dimension that grew a visible button would be a drawing with a button on
  // it. And with no `onPick`, a chain is exactly what it was.
  assert.match(chain, /onPick = null,/);
  assert.match(chain, /\{onPick && \(/);
});

test('…and it is sized off the LABEL, so it scales with the drawing', () => {
  const chain = read('3d/DimensionChain.jsx');
  assert.match(chain, /args=\{\[style\.labelHeight \* 3, style\.labelHeight \* 1\.6, style\.labelHeight\]\}/);
});

test('BOTH the width and the height figure carry the gesture', () => {
  const view = read('3d/UnitView.jsx');
  assert.match(view, /field: 'width'/);
  assert.match(view, /field: 'height'/);
  // …and only on the cabinet's own SIZE chains, not on every dimension in the
  // scene: a shelf-gap readout is not a control.
  assert.equal((view.match(/onPick=\{onEditSize/g) || []).length, 2);
});

test('the window goes through F1’s shell, beside the click', () => {
  assert.ok(MODAL_KINDS['unit-size'], 'the window is not in the registry');
  assert.equal(modalNeedsAnchor('unit-size'), true, 'it is about an object on the screen');
  const scene = read('3d/Scene.jsx');
  // The click point travels with the request, exactly as every other gesture
  // in that file does; the store's opener turns it into an anchor.
  assert.match(scene, /openModal\('unit-size', \{ unitId: unit\.id, field, at \}\)/);
  const modal = read('components/UnitSizeModal.jsx');
  assert.match(modal, /name="unit-size"/);
  assert.match(modal, /anchor=\{args\?\.anchor \|\| null\}/);
});

test('WIDTH AND HEIGHT fields — whichever figure was double-clicked', () => {
  const modal = read('components/UnitSizeModal.jsx');
  assert.match(modal, /data-unit-size-width="1"/);
  assert.match(modal, /data-unit-size-height="1"/);
  // The owner asked for a window "with width and height fields", not for a
  // width window and a height window: a joiner who double-clicks 800 because
  // he meant to change 770 should not have to close it and start again.
  assert.match(modal, /value=\{unit\.params\.width\}/);
  assert.match(modal, /value=\{unit\.params\.height\}/);
  // The figure clicked takes the focus, and it is focused a frame LATE on
  // purpose — the shell renders hidden until it has measured itself, and a
  // hidden element does not take focus.
  assert.match(modal, /requestAnimationFrame/);
  assert.match(modal, /focus === 'height' \? '\[data-unit-size-height\]' : '\[data-unit-size-width\]'/);
});

test('NOTHING NEW IN THE ENGINE — it types into the existing setter', () => {
  const modal = read('components/UnitSizeModal.jsx');
  assert.match(modal, /updateUnitParams\(unit\.id, \{ \[key\]: value \}\)/);
  // No arithmetic, no clamp, no rule. The whole window computes nothing.
  assert.ok(!/Math\.(min|max|round)/.test(modal), 'the window does arithmetic of its own');
  assert.ok(!/computeCabinet|paramsForEngine/.test(modal));
  // …and the engine has never heard of it.
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.ok(!/unit-size|UnitSizeModal/.test(engine));
});

test('…and the setter’s own refusal is SAID rather than swallowed', () => {
  const modal = read('components/UnitSizeModal.jsx');
  assert.match(modal, /for \(const note of res\?\.notices \|\| \[\]\) notify\(note, 'warn'\)/);

  // The refusal is real: `updateUnitParams` clamps a width that would eat the
  // next cabinet and says so, and this window is only the surface it speaks
  // through.
  project();
  const a = store().addUnit('BUD');
  store().updateUnitParams(a.id, { width: 600 });
  const b = store().addUnit('BUD', { near: a.id, side: 'right' });
  store().updateUnitParams(b.id, { width: 600 });
  const res = store().updateUnitParams(a.id, { width: 2000 });
  assert.ok(Array.isArray(res.notices));
  assert.ok(store().units.find((u) => u.id === a.id).params.width < 2000, 'the clamp let it through');
});

test('Enter commits AND closes — one gesture, not two', () => {
  const modal = read('components/UnitSizeModal.jsx');
  // NumberField has committed on Enter since turn 11; this window adds only
  // the close, because a two-field mini modal that has to be dismissed
  // separately is a window with one gesture too many.
  assert.match(modal, /if \(e\.key === 'Enter'\) closeModal\(\)/);
  const field = read('components/NumberField.jsx');
  assert.match(field, /if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); commit\(\); /);
});
