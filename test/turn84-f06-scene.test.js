/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F6 (CLAUDE.md T84 PART D): THE SCENE'S EDGE
//
// CLAUDE.md T84 F6, its tests: *"the four toggles call the four toolbar
// handlers by name; the View menu lists exactly the nine; the camera presets
// compute the six directions from a fixture room and Frame selection from two
// boxes."*  Node cannot load JSX, so the components are read as SOURCE and
// held against main's own toolbar (verify/t84/census-main.json, P1's census:
// each CanvasToolbar button's handler, `disabled` and `aria-pressed` as
// written) and against TopBar.jsx's View menu; the camera arithmetic is the
// pure module, imported, and every place it computes is checked through
// three's OWN camera projection, not through the module's own sums.
//
// One test reads src/components/CanvasToolbar.jsx AFTER S5's patch
// (/tmp/claude-0/t84/patches/S5-CanvasToolbar.jsx.diff, applied by INT): it is
// written to the final state and named so ("after INT applies the patch").

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';

import {
  STUDIO_VIEWS, WALL_VIEWS, firstRunCorner, fitBoxes, fitPoints, isoView, lensOf, placeCamera,
  planView, roomGeometry, roomView, unionBoxes, unitRoots, viewDirection, viewPlacement, wallView,
} from '../src/components/studio/lib/cameraPresets.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { rectCorners } from '../src/engine/room.js';
import { wallLabel } from '../src/engine/drawings/wallElevation.js';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
/** Comments out: a name in prose is not a call. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const TOGGLES = read('src/components/studio/SceneToggles.jsx');
// AMENDED BY T-CC1b F2: SceneViewMenu.jsx is DELETED (*"dwa menu View, jedno wystarczy"*, the owner, 01.11.2026).
const BAR = read('src/components/studio/CameraBar.jsx');
const LIB = read('src/components/studio/lib/cameraPresets.js');
const TOPBAR = read('src/components/TopBar.jsx');
const CENSUS = JSON.parse(read('verify/t84/census-main.json'));

/** main's toolbar, button by button (P1's census, read off CanvasToolbar.jsx at 9f5020f). */
const TOOLBAR = Object.fromEntries(CENSUS.static.toolbar.controls.map((c) => [c.handler, c]));

/** One entry of a component's registry: `    id: {` ... `    },` (four spaces in). */
function entry(source, id) {
  const m = source.match(new RegExp(`\\n {4}${id}: \\{([\\s\\S]*?)\\n {4}\\},`));
  assert.ok(m, `no entry '${id}' in the registry`);
  return m[1];
}

/** The fixture room: 4000 x 3000, 2500 high, wall A along plan y = 0. */
const ROOM = { schema: 2, height: 2500, corners: rectCorners(4000, 3000), openings: [] };
const LENS = { fovDeg: 38, aspect: 1.5, margin: P.ui.studio.frameMargin, near: 0.05 };
const bud = (id, wall, x) => ({
  id, type: 'BUD', params: { ...defaultParamsFor('BUD', P), unit_num: id }, position: { wall, x_mm: x },
});

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const unit = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const sameDir = (a, b, eps = 1e-9) => unit(a).every((v, i) => near(v, unit(b)[i], eps));
const sub = (a, b) => a.map((v, i) => v - b[i]);

/**
 * Three's own camera at a place: every point must land inside the frame, by
 * at most 1 / (1 + margin) of its half-width and half-height, in front of the
 * lens. Returns the largest share of the frame any point takes (1 / (1 + m)
 * when the fit is tight).
 */
function seenBy(place, points, { fovDeg, aspect, margin = 0 }, slack = 1e-9) {
  const cam = new THREE.PerspectiveCamera(fovDeg, aspect, 0.01, 1000);
  cam.position.set(...place.from);
  cam.lookAt(...place.at);
  cam.updateMatrixWorld(true);
  let most = 0;
  for (const p of points) {
    const v = new THREE.Vector3(...p).project(cam);
    assert.ok(v.z > -1 && v.z < 1, `a point is behind the lens or past the far plane: ${p}`);
    most = Math.max(most, Math.abs(v.x), Math.abs(v.y));
  }
  assert.ok(most <= 1 / (1 + margin) + slack, `a point falls in the margin or out of the frame (${most})`);
  return most;
}

/**
 * Looking straight down, three's lookAt tilts the eye by 1e-4 toward +Z to
 * find a screen up (Matrix4.lookAt, "up and z are parallel"), so a plan is
 * checked to that tilt; every other place is exact.
 */
const STRAIGHT_DOWN_SLACK = 1e-3;

const cornersOf = (box) => {
  const out = [];
  for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) out.push([x, y, z]);
  return out;
};

// ═══ THE SIX PLACES, FROM A FIXTURE ROOM ═════════════════════════════════════

test('F6 · the bar\'s six places, A to D lettered as the drawing set letters its walls', () => {
  assert.deepEqual([...STUDIO_VIEWS], ['plan', 'iso', 'a', 'b', 'c', 'd']);
  assert.deepEqual(WALL_VIEWS.map((w) => [w.id, w.wall, w.label]), [['a', 0, 'A'], ['b', 1, 'B'], ['c', 2, 'C'], ['d', 3, 'D']]);
  assert.deepEqual(WALL_VIEWS.map((w) => w.label), [0, 1, 2, 3].map(wallLabel), 'the letters are engine/drawings wallLabel\'s');
  // The room in the scene's world: centred on the origin, metres, as Scene.jsx draws it.
  const g = roomGeometry(ROOM);
  assert.equal(g.height, 2.5);
  assert.deepEqual(g.box, { min: [-2, 0, -1.5], max: [2, 2.5, 1.5] });
  assert.deepEqual(g.walls.map((w) => [w.start, w.end, w.inward]), [
    [[-2, -1.5], [2, -1.5], [0, 1]],
    [[2, -1.5], [2, 1.5], [-1, 0]],
    [[2, 1.5], [-2, 1.5], [0, -1]],
    [[-2, 1.5], [-2, -1.5], [1, 0]],
  ]);
});

test('F6 · Plan: straight down at the room\'s centre, the whole room and its walls\' tops in the picture', () => {
  const place = planView(ROOM, LENS);
  assert.deepEqual(place.at, [0, 1.25, 0], 'the room\'s centre');
  assert.ok(near(place.from[0], 0) && near(place.from[2], 0), 'right over it');
  assert.ok(place.from[1] > 2.5, 'above the walls');
  const most = seenBy(place, cornersOf(roomGeometry(ROOM).box), LENS, STRAIGHT_DOWN_SLACK);
  assert.ok(near(most, 1 / (1 + LENS.margin), STRAIGHT_DOWN_SLACK), 'fitted, not just inside');
  assert.deepEqual(viewPlacement('plan', ROOM, LENS), place);
});

test('F6 · A to D: each wall square on from inside the room, level, the whole wall in the picture', () => {
  const inward = { a: [0, 0, 1], b: [-1, 0, 0], c: [0, 0, -1], d: [1, 0, 0] };
  const middle = { a: [0, 1.25, -1.5], b: [2, 1.25, 0], c: [0, 1.25, 1.5], d: [-2, 1.25, 0] };
  const g = roomGeometry(ROOM);
  for (const w of WALL_VIEWS) {
    const place = wallView(ROOM, w.wall, LENS);
    assert.deepEqual(place, viewPlacement(w.id, ROOM, LENS));
    assert.deepEqual(place.at, middle[w.id], `wall ${w.label}: its middle`);
    assert.ok(sameDir(sub(place.from, place.at), inward[w.id]), `wall ${w.label}: seen from inside, square on`);
    assert.equal(place.from[1], place.at[1], `wall ${w.label}: level`);
    const wall = g.walls[w.wall];
    const points = [[wall.start[0], 0, wall.start[1]], [wall.start[0], 2.5, wall.start[1]], [wall.end[0], 0, wall.end[1]], [wall.end[0], 2.5, wall.end[1]]];
    const most = seenBy(place, points, LENS);
    assert.ok(near(most, 1 / (1 + LENS.margin), 1e-6), `wall ${w.label}: fitted`);
  }
  assert.equal(wallView(ROOM, 4, LENS), null, 'a four-wall room has no wall E');
  // A three-wall room has no D: the bar greys it (CameraBar), the module answers null.
  const tri = { ...ROOM, corners: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 2000, y: 3000 }] };
  assert.equal(viewPlacement('d', tri, LENS), null);
});

test('F6 · Iso: the cube\'s diagonal into the first run\'s corner, the whole room in the picture', () => {
  const diagonal = (place) => unit(sub(place.from, place.at));
  // Empty room: corner 0, where wall A starts (plan 0,0; world -2, -1.5): looked into from +X +Z, above.
  assert.equal(firstRunCorner(ROOM, [], P), 0);
  const empty = isoView(ROOM, { ...LENS, units: [], profile: P });
  assert.ok(sameDir(diagonal(empty), [1, 1, 1]), `empty room: ${diagonal(empty)}`);
  assert.ok(near(Math.asin(diagonal(empty)[1]), Math.atan(Math.SQRT1_2)), 'atan(1 / sqrt 2) above the floor');
  // A run at wall A's start: the same corner.
  const atStart = [bud('u1', 0, 0), bud('u2', 0, 600)];
  assert.equal(firstRunCorner(ROOM, atStart, P), 0);
  // A run at wall A's far end: corner 1 (walls A and B), looked into from -X +Z.
  const atEnd = [bud('u1', 0, 3400)];
  assert.equal(firstRunCorner(ROOM, atEnd, P), 1);
  const iso = isoView(ROOM, { ...LENS, units: atEnd, profile: P });
  assert.ok(sameDir(diagonal(iso), [-1, 1, 1]), `run at A's end: ${diagonal(iso)}`);
  assert.deepEqual(iso.at, [0, 1.25, 0]);
  seenBy(iso, cornersOf(roomGeometry(ROOM).box), LENS);
  // The FIRST run is by wall order, then along the wall: wall A's beats wall C's whatever was added first.
  assert.equal(firstRunCorner(ROOM, [bud('c1', 2, 3000), bud('a1', 0, 3400)], P), 1);
  // Only wall C (from its start at plan 4000,3000 to 0,3000), near its end: corner 3.
  assert.equal(firstRunCorner(ROOM, [bud('c1', 2, 3000)], P), 3);
  // The six places point six different ways.
  const dirs = STUDIO_VIEWS.map((id) => {
    const place = viewPlacement(id, ROOM, { ...LENS, units: [], profile: P });
    return unit(sub(place.from, place.at));
  });
  for (let i = 0; i < dirs.length; i += 1) {
    for (let j = i + 1; j < dirs.length; j += 1) {
      assert.ok(!sameDir(dirs[i], dirs[j], 1e-6), `${STUDIO_VIEWS[i]} and ${STUDIO_VIEWS[j]} look the same way`);
    }
  }
});

// ═══ FRAME SELECTION, FROM TWO BOXES ═════════════════════════════════════════

test('F6 · Frame selection: two boxes fitted with the profile\'s margin, the direction kept', () => {
  assert.equal(P.ui.studio.frameMargin, 0.1, 'THE NUMBERS: Frame selection margin 10 %, PROPOSED');
  const boxes = [
    { min: [-1, 0, -0.3], max: [-0.4, 0.9, 0.3] },
    { min: [0.4, 0, -0.3], max: [1, 0.9, 0.3] },
  ];
  assert.deepEqual(unionBoxes(boxes), { min: [-1, 0, -0.3], max: [1, 0.9, 0.3] });
  const direction = [0.3, 0.5, 0.8];
  const place = fitBoxes(boxes, { ...LENS, direction });
  assert.deepEqual(place.at, [0, 0.45, 0], 'aimed at the middle of both');
  assert.ok(sameDir(sub(place.from, place.at), direction), 'the direction the camera looked from is kept');
  const both = [...cornersOf(boxes[0]), ...cornersOf(boxes[1])];
  const most = seenBy(place, both, LENS);
  assert.ok(near(most, 1 / 1.1, 1e-6), 'tight: the outermost corner sits exactly at the 10 % margin');
  // Square on, the arithmetic is the one a person can check: 1 m half-width at
  // 1.1, over tan(19 deg) x 1.5, plus the 0.3 m the near face stands forward.
  const square = fitBoxes(boxes, { ...LENS, direction: [0, 0, 1] });
  assert.ok(near(square.distance, (1 * 1.1) / (Math.tan((19 * Math.PI) / 180) * 1.5) + 0.3, 1e-9));
  assert.deepEqual(square.from.map((v) => Math.round(v * 1e6) / 1e6), [0, 0.45, Math.round(square.distance * 1e6) / 1e6]);
  // No margin is closer; the controls' own limits hold it.
  assert.ok(fitBoxes(boxes, { ...LENS, margin: 0, direction }).distance < place.distance);
  const tiny = [{ min: [0, 0, 0], max: [0.01, 0.01, 0.01] }];
  assert.equal(fitBoxes(tiny, { ...LENS, direction, minDistance: 0.8 }).distance, 0.8);
  assert.equal(fitBoxes(boxes, { ...LENS, direction, maxDistance: 1 }).distance, 1);
  // Nothing to fit, or no lens: no place, never a guess.
  assert.equal(fitBoxes([], { ...LENS, direction }), null);
  assert.equal(fitBoxes(boxes, { ...LENS, fovDeg: undefined, direction }), null);
  assert.equal(fitPoints([[0, 0, 0]], { aspect: 1.5, direction }), null);
});

test('F6 · the live view: the units\' groups found by ccUnitId, never a helper; the camera parked in one step', () => {
  const unitA = { userData: { ccUnitId: 'a' }, children: [{ userData: { ccUnitId: 'a', ccNotchEdge: 1 }, children: [] }] };
  const unitB = { userData: { ccUnitId: 'b' }, children: [] };
  const helper = { userData: { ccHelper: true }, children: [{ userData: { ccUnitId: 'a' }, children: [] }] };
  const scene = { userData: {}, children: [{ userData: {}, children: [unitA, helper] }, unitB] };
  assert.deepEqual(unitRoots(scene, ['a']), [unitA], 'the outermost group, once; a helper\'s copy is not the unit');
  assert.deepEqual(unitRoots(scene, null), [unitA, unitB], 'every unit when none is asked for');
  assert.deepEqual(unitRoots(scene, []), [], 'an empty request frames nothing');

  const calls = [];
  const v3 = (name, x, y, z) => ({
    x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; calls.push([name, a, b, c]); },
  });
  const view = {
    camera: { fov: 38, aspect: 1.6, near: 0.05, position: v3('camera', 0, 2, 5) },
    controls: { minDistance: 0.8, maxDistance: 24, target: v3('target', 0, 1, 0), update() { calls.push(['update']); } },
  };
  assert.equal(roomView({ __cc: { views: { room: view } } }), view, 'window.__cc.views.room, the handle 3d/viewHandle.js registers');
  assert.equal(roomView({}), null);
  assert.deepEqual(lensOf(view), { fovDeg: 38, aspect: 1.6, near: 0.05, minDistance: 0.8, maxDistance: 24 });
  assert.ok(sameDir(viewDirection(view), [0, 1, 5]), 'from the orbit target to the eye');
  assert.equal(placeCamera(view, { from: [1, 2, 3], at: [4, 5, 6] }), true);
  assert.deepEqual(calls, [['camera', 1, 2, 3], ['target', 4, 5, 6], ['update']], 'parked: position, target, one update, no flight');
  assert.equal(placeCamera(view, null), false);
  assert.equal(placeCamera(null, { from: [0, 0, 0], at: [0, 0, 1] }), false);
  // The room's orbit is damped: what a drag left turning is spent first (one
  // update with the damping off), then the camera is parked, and the damping is back on.
  calls.length = 0;
  const damped = {
    ...view,
    controls: {
      ...view.controls,
      enableDamping: true,
      update() { calls.push(['update', this.enableDamping]); },
    },
  };
  assert.equal(placeCamera(damped, { from: [1, 2, 3], at: [4, 5, 6] }), true);
  assert.deepEqual(calls, [['update', false], ['camera', 1, 2, 3], ['target', 4, 5, 6], ['update', true]]);
  assert.equal(damped.controls.enableDamping, true, 'the damping is the room\'s again');
});

// ═══ THE FOUR TOGGLES: THE TOOLBAR'S OWN HANDLERS, GUARDS AND STATES ═══════════

test('F6 · the four toggles call the four toolbar handlers by name, with the toolbar\'s guards and pressed states', () => {
  // REWRITTEN BY T86B F7: *"menu, patrz SS: dimension powinien pojsc do glownego paska, ustawienie koloru wymiarowania powinno byc w settings nie tutaj"* (the owner, 30.10.2026, 21:54). Dimensions joins the bar, first (the order PROPOSED).
  // AMENDED BY T-CC1b F2 (law 3): the View dropdown's three (Front dimensions, Props, Measure) stand after the five
  // (*"dwa menu View, jedno wystarczy"*; *"tak te przyciski zostaja sa mega przydatne"*, the owner, 01.11.2026).
  assert.deepEqual(P.ui.studio.sceneToggles, ['dimensions', 'xray', 'hideFronts', 'outlines', 'openAll', 'frontDimensions', 'props', 'measure'], 'THE NUMBERS: Dimensions, the designer\'s four, the dropdown\'s three');
  assert.match(TOGGLES, /useCabinetProfileStore\(\(s\) => s\.profile\?\.ui\?\.studio\?\.sceneToggles\)/, 'the list is the profile\'s');
  // Every switch the registry holds is a CanvasToolbar button, field for field.
  const HANDLER = {
    dimensions: 'toggleDimensions',
    frontDimensions: 'toggleFrontDimensions',
    outlines: 'toggleOutlines',
    xray: 'toggleXray',
    props: 'toggleProps',
    hideFronts: 'toggleHideFronts',
    measure: 'toggleRuler',
    openAll: 'toggleAllFronts(doorEntries)',
  };
  // T84 F6 (INT): module constants, not exports (test/turn31-f12-sweep.test.js: no export nothing imports).
  assert.match(TOGGLES, /\nconst SCENE_TOGGLE_IDS = Object\.freeze\(\[\s*'dimensions', 'frontDimensions', 'outlines', 'xray', 'props', 'hideFronts', 'measure', 'openAll',\s*\]\)/);
  for (const [id, handler] of Object.entries(HANDLER)) {
    const bar = TOOLBAR[handler];
    assert.ok(bar, `main's toolbar has no ${handler}`);
    const mine = entry(TOGGLES, id);
    const call = handler.includes('(') ? `() => ${handler}` : handler;
    assert.ok(mine.includes(`onClick: ${call},`), `${id}: not the toolbar's ${handler}`);
    assert.ok(mine.includes(`disabled: ${bar.disabled},`), `${id}: the guard is not the toolbar's "${bar.disabled}"`);
    assert.ok(mine.includes(`pressed: ${bar.pressed},`), `${id}: the pressed state is not the toolbar's "${bar.pressed}"`);
  }
  // The four the profile names, by their DOM hooks, rendered with aria-pressed.
  for (const hook of ['toggle-dimensions', 'toggle-xray', 'toggle-hide-fronts', 'toggle-outlines', 'toggle-open-all']) {
    assert.ok(TOGGLES.includes(`hook: '${hook}',`), `no ${hook}`);
  }
  assert.match(TOGGLES, /data-studio=\{t\.hook\}/);
  assert.match(TOGGLES, /aria-pressed=\{t\.pressed\}/);
  assert.match(TOGGLES, /disabled=\{t\.disabled\}/);
  // The labels are the toolbar's, Open all flipping as it does.
  assert.ok(entry(TOGGLES, 'openAll').includes("label: everyDoorOpen ? 'Close all' : 'Open all',"));
  assert.ok(entry(TOGGLES, 'xray').includes("label: 'X-ray',"));
  assert.ok(entry(TOGGLES, 'hideFronts').includes("label: 'Hide fronts',"));
  assert.ok(entry(TOGGLES, 'outlines').includes("label: 'Outlines',"));
  // Open all reads the toolbar's OWN door list: one list, two roads.
  assert.match(TOGGLES, /import \{ useDoorEntries \} from '\.\.\/CanvasToolbar\.jsx';/);
  assert.match(TOGGLES, /const \{ doorEntries, everyDoorOpen \} = useDoorEntries\(\);/);
  assert.doesNotMatch(code(TOGGLES), /p\.part === 'FRONT'/, 'a second door list');
  // An id the registry does not know is skipped, never invented.
  assert.match(TOGGLES, /\.filter\(\(id\) => Object\.hasOwn\(toggles, id\)\)/);
});

// ═══ VIEW: EXACTLY THE SEVEN ════════════════════════════════════════════════
//
// REWRITTEN BY T86B F7: *"menu, patrz SS: dimension powinien pojsc do glownego paska, ustawienie koloru wymiarowania powinno byc w settings nie tutaj"* (the owner, 30.10.2026, 21:54).
// Dimensions went to the bar, Dimension colour to Settings; the other seven
// keep their guards, labels, sentences and store actions.

// REWRITTEN BY T-CC1b F2 (law 3, ONE VIEW): the owner, 01.11.2026: *"dwa menu View, jedno
// wystarczy, menu wystarczy"*; *"tak te przyciski zostaja sa mega przydatne"*. The scene's dropdown
// is deleted; each of its seven lives on: Front dimensions, Props and Measure on the quick toggles,
// Contour view, Brightness, Realistic lighting and Turn on the light in the top bar's View menu,
// each with the handler and the guard it has today.
test('F6 · the View dropdown is gone; its seven live on the toggles and in the top bar\'s View, each through its own store action', () => {
  assert.equal(existsSync(new URL('src/components/studio/SceneViewMenu.jsx', ROOT)), false, 'the dropdown is deleted');
  // The three the toolbar had: on the quick toggles, the TOOLBAR's handler and guard.
  for (const [id, label, handler] of [['frontDimensions', 'Front dimensions', 'toggleFrontDimensions'], ['props', 'Props', 'toggleProps'], ['measure', 'Measure', 'toggleRuler']]) {
    const mine = entry(TOGGLES, id);
    assert.ok(mine.includes(label), `${id}: the toggles say "${label}"`);
    assert.ok(mine.includes(handler), `${id}: not ${handler}`);
  }
  // The four of TopBar's View menu: TopBar's handler and guard, read off TopBar.jsx.
  const topGuard = (label) => {
    const at = TOPBAR.indexOf(`label: '${label}'`);
    assert.ok(at > 0, `TopBar has no ${label}`);
    return TOPBAR.slice(at, at + 700).match(/disabled: ([^,\n]+),/)[1];
  };
  assert.equal(topGuard('Contour view'), "viewMode !== '3d'");
  assert.equal(topGuard('Realistic lighting'), "viewMode !== '3d'");
  assert.equal(topGuard('Turn on the light'), "viewMode !== '3d'");
  assert.equal(topGuard('Brightness'), "viewMode !== '3d'");
  assert.equal(topGuard('Dimension colour'), "viewMode !== '3d' || contourView");
  assert.match(TOPBAR, /run: \(\) => setLighting\(\{ on: !lightOn \}\)/, 'TopBar\'s own switch');
  assert.match(TOPBAR, /run: toggleContourView,/);
  assert.match(TOPBAR, /run: toggleRealisticLighting,/);
  assert.match(TOPBAR, /run: setBrightness,/);
});

// ═══ THE CAMERA BAR ═════════════════════════════════════════════════════════

test('F6 · the camera bar: 3D, Plan, Iso, A to D, Frame selection, then Drawings... (the PREVIEW), through the registered handle', () => {
  const hooks = ['camera-bar', 'scene-3d', 'camera-plan', 'camera-iso', 'camera-frame', 'drawings'];
  for (const hook of hooks) assert.ok(BAR.includes(`data-studio="${hook}"`), `no ${hook}`);
  assert.match(BAR, /data-studio=\{`camera-\$\{w\.id\}`\}/, 'A to D from WALL_VIEWS');
  const order = ['scene-3d', 'camera-plan', 'camera-iso', 'camera-${w.id}', 'camera-frame', 'drawings'].map((h) => BAR.indexOf(h));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'the designer\'s foot bar with the camera between 3D and Drawings...');
  assert.match(BAR, /aria-pressed=\{viewMode === '3d'\}\s*onClick=\{\(\) => setViewMode\('3d'\)\}/);
  // Drawings... hands the press to the page's opener (openModal('drawing', { kind: 'walls', anchor })): never an export.
  assert.match(BAR, /onClick=\{\(e\) => onDrawings\?\.\(e\)\}/);
  assert.match(BAR, /Drawings\u2026/);
  const live = code(BAR);
  assert.doesNotMatch(live, /openModal\(|onDrawing\(|export(Wall|Drawing|Booklet)/, 'the bar exports nothing and opens nothing of its own');
  // The places are the pure module's, on the handle 3d/viewHandle.js registers.
  assert.match(BAR, /from '\.\/lib\/cameraPresets\.js';/);
  assert.match(BAR, /import \{ furnitureBounds \} from '\.\.\/\.\.\/3d\/renderCapture\.js';/, 'the furniture\'s own bounds, the box the render fits');
  assert.match(BAR, /placeCamera\(view, viewPlacement\(id, room, \{/);
  assert.match(BAR, /const margin = Number\(profile\?\.ui\?\.studio\?\.frameMargin\) \|\| 0;/, 'the margin is the profile\'s');
  assert.match(BAR, /frameUnits\(anySelected \? selectedUnitIds : null, margin\)/, 'the selection, or every unit when none is');
  // It answers the issue strip's Show (F5): frame, then clear the request.
  assert.match(BAR, /useEffect\(\(\) => \{\s*if \(!frameRequest\) return;\s*frameUnits\(frameRequest\.unitIds, margin\);\s*clearFrameRequest\?\.\(\);/);
  // The places are greyed in the CNC view, as the toolbar's view switches are.
  assert.match(BAR, /const flat = viewMode !== '3d';/);
  for (const id of ['plan', 'iso']) assert.match(BAR, new RegExp(`data-studio="camera-${id}"\\s*disabled=\\{flat\\}`));
  assert.match(BAR, /disabled=\{flat \|\| !walls\[w\.wall\]\}/, 'a wall the room does not have is greyed');
});

test('F6 · nothing of the Studio\'s scene edge reaches T59\'s camera presets, or touches src/3d', () => {
  for (const [name, text] of [['SceneToggles.jsx', TOGGLES], ['CameraBar.jsx', BAR], ['lib/cameraPresets.js', LIB]]) {
    assert.doesNotMatch(code(text), /from '[^']*3d\/cameraPresets/, `${name} imports src/3d/cameraPresets.js`);
    // scripts/t59-classify.mjs: "PRO calls it: nowhere" greps these two names through src/components.
    assert.doesNotMatch(text, /parkCamera|presetPlacement/, `${name} names T59's preset functions`);
  }
  // The pure module: no three, no React, no store at module level.
  assert.doesNotMatch(LIB, /from 'three'|from 'react'|stores\//);
});

// ═══ CANVASTOOLBAR SHARES ITS DOORS (after INT applies S5's patch) ═══════════

test('F6 · CanvasToolbar exports its door entries and keeps every button (after INT applies the patch)', () => {
  const bar = read('src/components/CanvasToolbar.jsx');
  assert.match(bar, /export function useDoorEntries\(\) \{/);
  assert.match(bar, /return \{ doorEntries, everyDoorOpen \};/);
  assert.match(bar, /const \{ doorEntries, everyDoorOpen \} = useDoorEntries\(\);/);
  // The toolbar's fourteen, each still calling what main's census found it calling.
  const live = code(bar);
  for (const c of CENSUS.static.toolbar.controls) {
    const call = c.mappedFrom ? 'onClick={() => setViewMode(mode)}' : (c.handler.includes('(') ? `onClick={() => ${c.handler}}` : `onClick={${c.handler}}`);
    const alt = `onClick={() => ${c.handler}()}`;
    assert.ok(live.includes(call) || live.includes(alt), `${c.name}: ${call}`);
    if (c.disabled) assert.ok(live.includes(`disabled={${c.disabled}}`), `${c.name}: its guard`);
  }
  assert.equal((live.match(/<button\b/g) || []).length, 13, 'thirteen buttons written (3D and CNC are one, mapped)');
});

// ═══ THE HOUSE LAWS, ON THIS SLICE'S OWN FILES ════════════════════════════════

test('F6 · every file of the slice: the Skylon header, no em or en dash, no curly quote, no z-order of its own', () => {
  const header = read('scripts/t83-walk.mjs').split('\n').slice(0, 8).join('\n');
  for (const rel of [
    'src/components/studio/SceneToggles.jsx',
    'src/components/studio/CameraBar.jsx', 'src/components/studio/lib/cameraPresets.js',
    'test/turn84-f06-scene.test.js',
  ]) {
    const text = read(rel);
    assert.ok(text.startsWith(`${header}\n`), `${rel}: the Skylon header`);
    assert.doesNotMatch(text, /[\u2013\u2014\u2018\u2019\u201c\u201d]/, `${rel}: an em or en dash, or a curly quote`);
    assert.doesNotMatch(text, /\bz-(?:\d+|\[\d+\])\b/, `${rel}: a z-order of its own (lib/modalLayer.js LAYER_CLASS)`);
  }
});
