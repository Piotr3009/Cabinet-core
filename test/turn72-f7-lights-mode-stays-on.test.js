// ─── TURN 72 · F7 — LIGHTS MODE STAYS ON ──────────────────────────────────
//
// The owner, 22.09.2026:
//
//   *"po naciśnięciu LED wyłącza mi się funkcja lights i zaznacza mi drzwi, a
//   nie powinno; nie powinno wyłączyć aż do momentu, że albo wyłączę sam w
//   menu, albo zrobię 2klik na innym elemencie lub na ścianie."*
//
// `verify/t72/f7-probe.md` walked all three handlers CLAUDE.md names, before a
// line was changed, and convicted ONE — and it is not the LED button.
// `f7-probe-after.md` is the same walk afterwards.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
// `docked.jsx` carries no JSX — it is the dock's TABLE and every branch
// returns a plain object — so the real `dockFor` is asked here rather than a
// paraphrase of it. `scripts/t72-load.mjs` says how, and why.
import { loadPlainJsx } from '../scripts/t72-load.mjs';

const { DOCK_MODALS, dockFor } = await loadPlainJsx('src/retail/design/detail/docked.jsx');

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function aRoomWithADoor() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  A.addDoors(id);
  U().clearSelection();
  return id;
}

const doorOf = (unitId) => (S().unitResult(unitId)?.panels || [])
  .find((p) => p.part === 'FRONT' && p.role === 'front') || null;

/**
 * `Detail.jsx`'s effect, run against the live store — with its own GUARD,
 * which is read out of the file so this test cannot grade its own homework.
 */
function runDetailEffect() {
  const guarded = /^\s*if \(lightsMode\) return;$/m.test(read('src/retail/design/Detail.jsx'));
  if (guarded && U().modal === 'lighting') return '(the dock stands off)';
  const found = U().selectedElement ? A.resolveSelection(U().selectedElement) : null;
  const selection = found
    ? A.resolveTarget({ menu: found.menu, unitId: found.unitId, ref: found.ref })
    : null;
  const route = selection ? dockFor(selection) : null;
  const name = route?.modal || '';
  if (name) { if (U().modal !== name) U().openModal(name, route.args || null); return name; }
  if (DOCK_MODALS.includes(U().modal)) { U().closeModal(); return 'closed'; }
  return '(nothing)';
}

// ═══ 1 · THE PROBE, AS ASSERTIONS ══════════════════════════════════════════

test('F7 · the LED button only OPENS it — it never ended the mode', () => {
  const unitId = aRoomWithADoor();
  assert.equal(A.lightsModeOn(), false);
  A.openEditor('lighting', null);
  assert.equal(A.lightsModeOn(), true, 'the panel did not open');
  assert.ok(unitId);
});

test('F7 · `LightingPanel` is sticky — ON and OFF write the light, not the window', () => {
  aRoomWithADoor();
  A.openEditor('lighting', null);
  S().setLighting({ on: true });
  assert.equal(A.lightsModeOn(), true, 'ON closed the panel');
  S().setLighting({ on: false });
  assert.equal(A.lightsModeOn(), true, 'OFF closed the panel');
  // …and the window says so itself.
  assert.match(read('src/retail/design/lighting/LightingPanel.jsx'), /^\s*sticky$/m);
  assert.match(read('src/retail/design/lighting/LightingPanel.jsx'), /onClose=\{closeModal\}/);
});

test('F7 · A SINGLE CLICK inside the mode no longer opens a door\'s editor', () => {
  const unitId = aRoomWithADoor();
  A.openEditor('lighting', null);
  // The stage's own write, which is what a single click on a leaf does.
  U().selectElement(unitId, doorOf(unitId).id);
  assert.equal(A.lightsModeOn(), true, 'selecting ended the mode');
  assert.equal(runDetailEffect(), '(the dock stands off)');
  assert.equal(A.lightsModeOn(), true, 'the dock replaced the lighting panel');
  assert.equal(U().modal, 'lighting');
});

test('F7 · …but it still SELECTS, which is what the lighting panel is waiting for', () => {
  const unitId = aRoomWithADoor();
  S().addShelves(unitId, 1);
  const shelf = (S().unitResult(unitId)?.panels || [])
    .find((p) => p.part === 'SHELF' && p.role === 'shelf');
  A.openEditor('lighting', null);
  U().selectElement(unitId, shelf.id);
  assert.equal(U().selectedElement?.elementRef, shelf.id, 'the click selected nothing');
  // The panel reads exactly that, and its whole flow is "click the shelf".
  assert.match(read('src/retail/design/lighting/LightingPanel.jsx'),
    /p\.part === 'SHELF' && p\.role === 'shelf' \? p : null/);
});

test('F7 · the probe tables are committed, before and after', () => {
  assert.match(read('verify/t72/f7-probe.md'), /CONVICTED · THE STAGE'S CLICK/);
  assert.match(read('verify/t72/f7-probe.md'), /ViewBar. onLights only OPENS it/);
  assert.match(read('verify/t72/f7-probe-after.md'), /NOT CONVICTED/);
});

// ═══ 2 · THE THREE EXITS, AND ONLY THEY ═══════════════════════════════════

test('F7 · EXIT 1 · the menu\'s own button', () => {
  aRoomWithADoor();
  A.openEditor('lighting', null);
  assert.equal(A.lightsModeOn(), true);
  A.closeEditor();
  assert.equal(A.lightsModeOn(), false, 'the button does not close it');
  // …and the view bar's LED is that toggle, in one expression.
  assert.match(read('src/retail/design/DesignRoom.jsx'),
    /onLights=\{\(e\) => \(A\.lightsModeOn\(\)\s*\n\s*\? A\.closeEditor\(\)\s*\n\s*: A\.openEditor\('lighting'/);
});

test('F7 · EXIT 2 · a 2klik on another element', () => {
  const unitId = aRoomWithADoor();
  A.openEditor('lighting', null);
  // The SCENE opens the element's own window on a double click — it does not
  // go through the dock at all, so it replaces `lighting` and the mode ends.
  assert.match(read('src/3d/Scene.jsx'), /onEditElement=\{\(panelId, at\) => openModal\('element', \{/);
  U().openModal('element', { unitId, panelId: doorOf(unitId).id });
  assert.equal(A.lightsModeOn(), false, 'a 2klik did not end the mode');
  // …and the dock behaves normally again the moment it is not lighting.
  U().selectElement(unitId, doorOf(unitId).id);
  assert.equal(runDetailEffect(), 'element');
});

test('F7 · EXIT 3 · a 2klik on the wall', () => {
  aRoomWithADoor();
  A.openEditor('lighting', null);
  // The scene REPORTS the gesture; retail's stage decides what it means.
  assert.match(read('src/3d/Room.jsx'),
    /onDoubleClick=\{\(e\) => \{ if \(backgroundHit\(e\)\) onBackgroundDouble\?\.\(e\); \}\}/);
  assert.match(read('src/3d/Scene.jsx'), /onBackgroundDouble=\{onBackgroundDouble\}/);
  assert.match(read('src/retail/design/Stage.jsx'),
    /onBackgroundDouble=\{\(\) => \{ if \(A\.lightsModeOn\(\)\) A\.closeEditor\(\); \}\}/);
  // …and the handler itself, run.
  if (A.lightsModeOn()) A.closeEditor();
  assert.equal(A.lightsModeOn(), false);
});

test('F7 · nothing in the 3-D closes a modal — T37 F4c still holds', () => {
  // The wall's second gesture is ADDITIVE and REPORTED: the scene says what
  // happened, the caller decides. PRO passes nothing, so PRO's wall is the
  // wall it always had.
  assert.match(read('src/3d/Scene.jsx'), /onBackgroundDouble = null,/);
  assert.match(read('src/3d/Room.jsx'), /onBackgroundDouble = null,/);
  assert.ok(!/closeModal/.test(read('src/3d/Scene.jsx')), 'the scene closes a modal');
  assert.ok(!/closeModal/.test(read('src/3d/Room.jsx')), 'the room closes a modal');
  // …and the SINGLE click on the wall is what it has been since turn 11.
  assert.match(read('src/3d/Room.jsx'), /onPointerDown=\{\(e\) => \{ if \(backgroundHit\(e\)\) onBackground\?\.\(e\); \}\}/);
});

test('F7 · the gate is ONE line, in the one handler the probe named', () => {
  const detail = read('src/retail/design/Detail.jsx');
  assert.match(detail, /const lightsMode = modal === 'lighting';/);
  assert.match(detail, /useEffect\(\(\) => \{\s*\n\s*if \(lightsMode\) return;/);
  assert.match(detail, /const open = Boolean\(route\) && !lightsMode;/);
  // LIGHTS MODE IS THE WINDOW BEING OPEN — no second flag anywhere.
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /export const lightsModeOn = \(\) => U\(\)\.modal === 'lighting';/);
  for (const invented of ['lightsMode:', 'setLightsMode', 'lightingMode']) {
    assert.ok(!read('src/stores/uiStore.js').includes(invented), `${invented} is a second flag`);
  }
});
