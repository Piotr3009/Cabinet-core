/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F16 . GRAB AND MOVE, THREE AXES
//
// The owner, 25.10.2026, 13:36, after the chat-fix of 12:39: *"teraz mam to w
// menu a bardziej chcialem grab and move"*. The free panel is in the hand,
// not in a menu (T82's own law): the drag gets three axes.
//
//   along the wall   x, as today (`moveUnit`, the T74 F13 snap proposal kept,
//                    x only)
//   up and down      `hit.y` of the same plane, through the store's new
//                    `moveFreePanelY(id, y)`: `mount_height` clamped to the
//                    floor (0) and to the room height less the box height
//   off the wall     with Shift held, on a horizontal plane at the panel's
//                    height (the `startDepthDrag` pattern), through
//                    `moveFreePanelZ(id, z)`: `z` is the distance of the
//                    panel's back face from the wall line, `inset_back_mm` is
//                    written as z less the wall clearance, clamped to the
//                    clearance and to the room's far wall less the panel (NOT
//                    `editor.maxInset` 300: F17's rule)
//
// The drag plane of a panel passes through its OWN back line (`backStandoff`),
// so a panel stood off the wall drags where the eye sees it. The typed road
// gains the same three: the SpacingChain chips `fp-left`, `fp-floor` and a new
// `fp-wall`. The drag is never stopped by what the panel already stands in
// front of (`obstaclesBeyond` of the chat-fix).
//
// THE STAGE (the chat-fix's own, `test/chatfix-2510-attach-panel.test.js`): a
// 5000 x 3000 room, 2500 high; a box bx1 at x 4400 (400 wide, 300 deep); a
// chimney on wall 1 at x 2500, 600 wide, 350 deep; a BUD at x 600 widened to
// 800; a WUD at x 1600; a FREE_PANEL (800 x 400 x 18) at x 3600. The default
// profile: board 18, wall clearance 10, `editor.maxInset` 300.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { backStandoff } from '../src/engine/collision.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const S = () => useProjectStore.getState();
const unit = (id) => S().units.find((u) => u.id === id);
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
// Comments are the house's own voice and say the old law too: a pin reads code.
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const BOARD = 18;
const CLEARANCE = 10;
const ROOM_H = 2500;
const ROOM_D = 3000;

/** The stage, afresh: ids of the BUD, the WUD, the panel; the chimney's record id. */
function stage() {
  S().newProject();
  S().setRoom({
    corners: rectCorners(5000, ROOM_D), height: ROOM_H, boxes: [{ id: 'bx1', x: 4400, y: 0, w: 400, d: 300 }],
  });
  const chimney = S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: 2500, width: 600, depth: 350 });
  const bud = S().addUnit('BUD', { wall: 0, x: 600 }).id;
  S().updateUnitParams(bud, { width: 800 });
  const wud = S().addUnit('WUD', { wall: 0, x: 1600 }).id;
  const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 3600 }).id;
  return { bud, wud, panel, chimney };
}

/** Where the panel stands, in one object. */
function placeOf(id) {
  const u = unit(id);
  return {
    x: u.position.x_mm,
    mount: u.params.mount_height ?? 0,
    inset: u.params.inset_back_mm ?? 0,
    back: backStandoff(u, P),
  };
}

// === 0 . THE STAGE ===========================================================

test('T82 F16 . the stage: the numbers every assertion below is measured against', () => {
  const { panel } = stage();
  assert.equal(P.board.thickness, BOARD);
  assert.equal(P.room.wallBackClearance, CLEARANCE);
  assert.equal(P.editor.maxInset, 300, 'the cabinet number F17 keeps for cabinets');
  assert.equal(S().project.room.height, ROOM_H);
  const u = unit(panel);
  assert.equal(u.type, 'FREE_PANEL');
  assert.deepEqual([u.params.width, u.params.height, u.params.depth], [800, 400, BOARD]);
  assert.deepEqual(placeOf(panel), { x: 3600, mount: 0, inset: 0, back: CLEARANCE });
});

// === 1 . UP AND DOWN: moveFreePanelY =========================================

test('T82 F16 . moveFreePanelY: the panel goes up and down, clamped to the floor and to the room height less its box', () => {
  const { panel } = stage();
  assert.equal(typeof S().moveFreePanelY, 'function', 'the store has the action');
  let res = S().moveFreePanelY(panel, 200);
  assert.deepEqual(res, { y: 200, blocked: false, by: null, notices: [] });
  assert.deepEqual(placeOf(panel), { x: 3600, mount: 200, inset: 0, back: CLEARANCE }, 'only the height moved');
  // Past the ceiling: 2500 less the 400 box, said in words.
  res = S().moveFreePanelY(panel, 3000);
  assert.equal(res.y, ROOM_H - 400);
  assert.equal(res.blocked, true);
  assert.equal(res.by, 'the ceiling');
  assert.deepEqual(res.notices, ['From the floor limited to 2100 mm by the ceiling.']);
  assert.equal(placeOf(panel).mount, 2100);
  // Through the floor: 0.
  res = S().moveFreePanelY(panel, -50);
  assert.equal(res.y, 0);
  assert.equal(res.by, 'the floor');
  assert.deepEqual(res.notices, ['From the floor limited to 0 mm by the floor.']);
  assert.equal(placeOf(panel).mount, 0);
  // On the grid: the hand's snap step when given, the workshop's 0.5 otherwise.
  assert.equal(S().moveFreePanelY(panel, 333.3, 1).y, 333);
  assert.equal(S().moveFreePanelY(panel, 333.3).y, 333.5);
  assert.equal(placeOf(panel).x, 3600, 'x never moves on this axis');
});

test('T82 F16 . moveFreePanelY: a flat panel reaches the ceiling with its top face (2500 less 18); a cabinet is not a panel', () => {
  const { panel, bud } = stage();
  S().updateUnitParams(panel, { panel_tilt_deg: 90 });
  assert.equal(unit(panel).params.height, BOARD, 'flat: the box is the board thick');
  assert.equal(S().moveFreePanelY(panel, 9999).y, ROOM_H - BOARD);
  const before = JSON.stringify(unit(bud));
  assert.equal(S().moveFreePanelY(bud, 200), null);
  assert.equal(S().moveFreePanelY('no-such-unit', 200), null);
  assert.equal(JSON.stringify(unit(bud)), before, 'the BUD untouched');
});

test('T82 F16 . the typed road obeys the same clamp: a mount height of 3000 typed on a panel in a 2500 room (the probe row) is 2100, said in words; a cabinet\'s typed mount is not this law', () => {
  const { panel, wud } = stage();
  const res = S().updateUnitParams(panel, { mount_height: 3000 });
  assert.equal(res.applied.mount_height, 2100);
  assert.ok(res.notices.includes('From the floor limited to 2100 mm by the ceiling.'), res.notices.join(' | '));
  assert.equal(placeOf(panel).mount, 2100);
  const wudRes = S().updateUnitParams(wud, { mount_height: 1600 });
  assert.equal(wudRes.applied.mount_height, 1600);
  assert.ok(!wudRes.notices.some((n) => /^From the floor limited/.test(n)), 'the WUD hears nothing of the panel\'s clamp');
});

// === 2 . OFF THE WALL: moveFreePanelZ ========================================

test('T82 F16 . moveFreePanelZ: z is the back face off the wall line; the inset is z less the clearance, capped by the ROOM, never by maxInset 300', () => {
  const { panel } = stage();
  assert.equal(typeof S().moveFreePanelZ, 'function', 'the store has the action');
  let res = S().moveFreePanelZ(panel, 200);
  assert.deepEqual(res, {
    z: 200, inset: 200 - CLEARANCE, blocked: false, by: null, notices: [],
  });
  assert.deepEqual(placeOf(panel), { x: 3600, mount: 0, inset: 190, back: 200 }, 'only the distance off the wall moved');
  // Past the cabinet's 300: a panel is not a cabinet (F17).
  res = S().moveFreePanelZ(panel, 400);
  assert.equal(res.inset, 390);
  assert.equal(res.blocked, false);
  // Into the wall: the clearance every unit keeps.
  res = S().moveFreePanelZ(panel, 0);
  assert.equal(res.z, CLEARANCE);
  assert.equal(res.inset, 0);
  assert.equal(res.by, 'the wall clearance');
  assert.deepEqual(res.notices, ['From the wall limited to 10 mm by the wall clearance.']);
  // Through the far wall: the room's depth less the panel's own 18.
  res = S().moveFreePanelZ(panel, 5000);
  assert.equal(res.z, ROOM_D - BOARD);
  assert.equal(res.inset, ROOM_D - BOARD - CLEARANCE);
  assert.equal(res.by, 'the far wall');
  assert.deepEqual(res.notices, [`From the wall limited to ${ROOM_D - BOARD} mm by the far wall.`]);
  assert.deepEqual(placeOf(panel), {
    x: 3600, mount: 0, inset: ROOM_D - BOARD - CLEARANCE, back: ROOM_D - BOARD,
  });
  // Its size was never touched: the room moves it, it never squashes it.
  assert.deepEqual([unit(panel).params.width, unit(panel).params.height, unit(panel).params.depth], [800, 400, BOARD]);
});

test('T82 F16 . moveFreePanelZ: a panel ACROSS the wall (800 long into the room) stops with its front on the far wall; a cabinet is not a panel', () => {
  const { panel, bud } = stage();
  S().updateUnitParams(panel, { panel_facing: 'across' });
  assert.equal(unit(panel).params.depth, 800, 'across: its length runs into the room');
  const res = S().moveFreePanelZ(panel, 9999);
  assert.equal(res.z, ROOM_D - 800);
  assert.equal(res.inset, ROOM_D - 800 - CLEARANCE);
  assert.equal(unit(panel).params.depth, 800, 'whole');
  assert.equal(S().moveFreePanelZ(bud, 200), null);
});

test('T82 F16 . freePanelReach: the one answer both the drag and the typed road read (and F17\'s setUnitInsets cap)', async () => {
  const { panel } = stage();
  const { freePanelReach } = await import('../src/stores/projectStore.js');
  assert.equal(typeof freePanelReach, 'function');
  const reach = freePanelReach(S(), unit(panel), P);
  assert.deepEqual(reach.mount, { min: 0, max: ROOM_H - 400 });
  assert.deepEqual(reach.standoff, { min: CLEARANCE, max: ROOM_D - BOARD });
  assert.deepEqual(reach.inset, { min: 0, max: ROOM_D - BOARD - CLEARANCE });
});

// === 3 . NEVER STOPPED BY WHAT IT STANDS IN FRONT OF =========================

test('T82 F16 . a panel on the chimney\'s front goes up, further off the wall and along the face, the chimney behind it never in its way', () => {
  const { panel, chimney } = stage();
  assert.equal(S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 }).ok, true);
  assert.deepEqual(placeOf(panel), { x: 2500, mount: 0, inset: 340, back: 350 }, 'the chat-fix\'s own numbers');
  // Up by 200: not stopped, and it stays on the face.
  assert.equal(S().moveFreePanelY(panel, 200).y, 200);
  assert.deepEqual(placeOf(panel), { x: 2500, mount: 200, inset: 340, back: 350 });
  // Further off the wall, 600: the inset 590, past maxInset 300.
  const off = S().moveFreePanelZ(panel, 600);
  assert.equal(off.inset, 590);
  assert.equal(off.blocked, false);
  // Along the face, at its new height and depth: the chimney is behind it.
  S().moveUnit(panel, 2700, 0.5, { magnet: false });
  assert.equal(placeOf(panel).x, 2700);
  // Back onto the face.
  assert.equal(S().moveFreePanelZ(panel, 350).inset, 340);
  assert.deepEqual(placeOf(panel), { x: 2700, mount: 200, inset: 340, back: 350 });
});

// === 4 . THE PLANE AND THE HAND (pure) =======================================

test('T82 F16 . the drag plane of a panel passes through its OWN back line; a cabinet\'s stays halfway into its depth', async () => {
  const { dragPlaneOffsetMm } = await import('../src/3d/panelDrag.js');
  const { panel, chimney, bud } = stage();
  assert.equal(dragPlaneOffsetMm(unit(panel), P), CLEARANCE, 'at the wall: the clearance');
  S().attachFreePanel(panel, `obstacle:${chimney}:front`, { gap: 0 });
  assert.equal(dragPlaneOffsetMm(unit(panel), P), 350, 'on the chimney\'s face: where the eye sees it');
  assert.equal(dragPlaneOffsetMm(unit(panel), P), backStandoff(unit(panel), P));
  // A cabinet drags as it has since turn 3: the plane at half its depth.
  assert.equal(dragPlaneOffsetMm(unit(bud), P), unit(bud).params.depth / 2);
});

test('T82 F16 . the gesture a press starts: Shift on a panel is OFF THE WALL, a plain press on a panel is ALONG AND UP, a cabinet is along only', async () => {
  const { panelDragMode } = await import('../src/3d/panelDrag.js');
  const { panel, bud } = stage();
  const can = { canLift: true, canPull: true };
  assert.equal(panelDragMode(unit(panel), { ...can, shiftKey: false }), 'face');
  assert.equal(panelDragMode(unit(panel), { ...can, shiftKey: true }), 'off');
  assert.equal(panelDragMode(unit(bud), { ...can, shiftKey: true }), 'along');
  assert.equal(panelDragMode(unit(bud), { ...can, shiftKey: false }), 'along');
  // A view nobody gave the two setters to (the editor window) drags as it did.
  assert.equal(panelDragMode(unit(panel), { canLift: false, canPull: false, shiftKey: true }), 'along');
});

test('T82 F16 . the hand keeps its grab: the panel never jumps to the cursor on the press, and follows it after', async () => {
  const { panelGrab, panelDragTo } = await import('../src/3d/panelDrag.js');
  const { panel } = stage();
  S().moveFreePanelY(panel, 100);
  // Pressed 120 along from its left edge, 250 above its underside, 40 in front of its back.
  const grab = panelGrab(unit(panel), P, { alongMm: 3720, upMm: 350, offMm: 50 });
  assert.deepEqual(grab, { along: 120, up: 250, off: 40 });
  // The press itself moves nothing.
  assert.deepEqual(panelDragTo(grab, { alongMm: 3720, upMm: 350, offMm: 50 }), { x: 3600, y: 100, z: CLEARANCE });
  // The hand travels 200 along, 200 up, 300 out.
  assert.deepEqual(panelDragTo(grab, { alongMm: 3920, upMm: 550, offMm: 350 }), { x: 3800, y: 300, z: 310 });
});

test('T82 F16 . the Shift plane stands at the grab point\'s own height, else at the panel\'s middle', async () => {
  const { offPlaneHeightMm } = await import('../src/3d/panelDrag.js');
  assert.equal(offPlaneHeightMm({ pointMm: 1234, baseMm: 1000, heightMm: 400 }), 1234);
  assert.equal(offPlaneHeightMm({ pointMm: null, baseMm: 1000, heightMm: 400 }), 1200);
  assert.equal(offPlaneHeightMm({ pointMm: Number.NaN, baseMm: 0, heightMm: BOARD }), BOARD / 2);
});

// === 5 . THE ROOM AND THE TYPED ROAD ARE WIRED (source) ======================

test('T82 F16 . the room drags a panel on three axes: the plane through its back line, Shift off the wall, the two setters from the scene', () => {
  const view = uncomment(read('src/3d/UnitView.jsx'));
  // (The import is read off the RAW source: a line comment above it carries a
  // `/**` glob that the comment stripper reads as a block opening.)
  assert.match(read('src/3d/UnitView.jsx'), /\nimport \{[^}]*dragPlaneOffsetMm[^}]*\} from '\.\/panelDrag\.js';/);
  assert.match(view, /const dragPlaneMm = dragPlaneOffsetMm\(unit, profile\);\s*const dragPlane = useMemo\(\(\) => \{\s*const point = wallStart\.clone\(\)\.addScaledVector\(inward, mm\(dragPlaneMm\)\);/);
  // The Shift drag is `startDepthDrag`'s gesture: a horizontal plane, its z handed on.
  assert.match(view, /if \(mode === 'off'\) \{ startPanelOffDrag\(e\); return; \}/);
  assert.match(view, /const plane = new THREE\.Plane\(new THREE\.Vector3\(0, 1, 0\), -mm\(atMm\)\);/);
  assert.match(view, /onMovePanelZ\(panelDragTo\(grab, \{ offMm: offMm\(p\) \}\)\.z, snapStep\);/);
  // Up and down off the same plane, once the hand has travelled.
  assert.match(view, /if \(grab && drag\.current\.moved\) onMovePanelY\?\.\(panelDragTo\(grab, \{ upMm: p\.y \/ MM \}\)\.y, snapStep\);/);
  assert.match(view, /onMovePanelY = null/);
  assert.match(view, /onMovePanelZ = null/);
  assert.match(view, /native\.shiftKey/, 'Shift is read off the NATIVE event, as Ctrl is');
  assert.match(view, /onMovePanelY\?\.\(/);
  assert.match(view, /onMovePanelZ\(/);
  // The T74 F13 grab and drop are kept, to the character.
  assert.match(view, /drag\.current = \{ offset: alongMm\(hit\) - unit\.position\.x_mm, x0: e\.clientX, y0: e\.clientY, moved: false \};\n\s*setDragging\(true\);/);
  assert.match(view, /onMoveEnd\?\.\(\{ altKey: Boolean\(ev\?\.altKey\), cancelled: ev\?\.type === 'pointercancel', moved \}\);/);
  const scene = uncomment(read('src/3d/Scene.jsx'));
  assert.match(scene, /const moveFreePanelY = useProjectStore\(\(s\) => s\.moveFreePanelY\);/);
  assert.match(scene, /const moveFreePanelZ = useProjectStore\(\(s\) => s\.moveFreePanelZ\);/);
  assert.match(scene, /onMovePanelY=\{isFreePanel\(unit\.type\) \? \(y, step\) => moveFreePanelY\(unit\.id, y, step\) : null\}/);
  assert.match(scene, /onMovePanelZ=\{isFreePanel\(unit\.type\) \? \(z, step\) => moveFreePanelZ\(unit\.id, z, step\) : null\}/);
  // The T74 F13 x drag with its proposal is untouched.
  assert.match(scene, /moveUnit\(unit\.id, x, step, \{ magnet: false \}\);\s*const caught = freePanelProposal\(unit\.id\);/);
});

test('T82 F16 . the typed road gains the third figure: fp-wall, the distance from the wall, written through moveFreePanelZ', () => {
  const src = uncomment(read('src/3d/SpacingChain.jsx'));
  assert.match(src, /key: 'fp-left',[\s\S]*?write: 'unit-x',/);
  assert.match(src, /key: 'fp-floor',[\s\S]*?write: 'unit-mount',/);
  assert.match(src, /key: 'fp-wall',[\s\S]*?write: 'unit-wall',/);
  assert.match(src, /moveFreePanelZ\(unit\.id, next\)/);
  // The floor figure keeps its T74 road, which now carries the clamp.
  assert.match(src, /updateUnitParams\(unit\.id, \{ mount_height: next \}\)/);
});

// === 6 . SAVE AND RELOAD =====================================================

test('T82 F16 . what the hand did survives save and reload: two plain params', () => {
  const { panel } = stage();
  S().moveFreePanelY(panel, 200);
  S().moveFreePanelZ(panel, 200);
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(placeOf(panel), { x: 3600, mount: 200, inset: 190, back: 200 });
});
