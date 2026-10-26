/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F3 . THE MIRROR CABINET IN THE ROOM
//
// CLAUDE.md T83 F3: *"the mirror doors with a mirror material ..., the LED
// stiles lit (an emissive warm white 4000 K panel, flush), the glass shelves
// translucent (as T30's glass doors are), the LED under and inside as
// `ledStrips.js` draws them, the bottom box, the panels round, the recess
// into the wall (the wall element the kit writes). The back's click:
// `openModal('mirror-back', ...)` asks "Mirror on the back?" (Yes / No, the
// store's `setMirrorBack`)"*. Tests: *"the solids the room draws equal the
// kit's parts by id; the mirror door 22 thick in the room; the stile's face at
// the mirror's face (z equal to 0.01); the recess moves the whole cabinet into
// the wall by `recess_mm`"*.
//
// THE STAGE: MIRROR_CABINET at the profile's defaults (KIT_MIRROR.lsp section
// 6): 1350 x 1100 x 215, three mirror doors 327 / 477 / 327 x 937 at z 215 (the
// board 18, the mirror 4), two LED stiles 75 x 937 x 22 at x 360 and 915,
// fifteen glass shelves, the panels round 237 deep. The room's arithmetic is
// `src/3d/mirrorCabinetRoom.js` (no three.js), the wiring is read off the
// sources, as T82's room tests read theirs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { backStandoff } from '../src/engine/collision.js';
import { lightingSpec, temperatureEntry } from '../src/engine/ledStrips.js';
import { rectCorners } from '../src/engine/room.js';
import { MODAL_KINDS, modalNeedsAnchor } from '../src/lib/modalLayer.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  askMirrorBack, doorMirrorPlate, GLASS_SHELF_KIND, isMirrorDoor, MIRROR_LOOK, mirrorBackClick, mirrorBackPanes,
  mirrorDoorSolids, mirrorLedGlow, mirrorLedStrips, mirrorRecessPlacement, mirrorRoomPanel, mirrorRoomSolids,
  mirrorRoomSurface,
} from '../src/3d/mirrorCabinetRoom.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/** A mirror cabinet as the library births it, with its own answers changed. */
function kit(extra = {}, mirror = {}) {
  const d = defaultParamsFor('MIRROR_CABINET', P);
  return { ...d, unit_num: '01', ...extra, mirror: { ...d.mirror, ...mirror } };
}
const cut = (extra, mirror) => computeCabinet(kit(extra, mirror), P);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const vol = (b) => b.w * b.h * b.d;
/** Do two boxes share any volume (more than a hair in each axis)? */
const enters = (a, b, eps = 0.01) => ['x', 'y', 'z'].every((k) => {
  const ka = { x: 'w', y: 'h', z: 'd' }[k];
  return Math.min(a[k] + a[ka], b[k] + b[ka]) - Math.max(a[k], b[k]) > eps;
});

// ═══ THE SOLIDS THE ROOM DRAWS ARE THE KIT'S PARTS, BY ID ════════════════

test('F3 . the solids the room draws are the kit\'s parts by id: each part its own box, a mirror door its board and its mirror', () => {
  const r = cut();
  const solids = mirrorRoomSolids(r, P);
  const parts = r.panels.filter((p) => p.box);
  assert.equal(parts.length, 33, 'the carcass 5, the box 2, the dividers 2, the doors 3, the stiles 2, the panels 4, the glass 15');
  for (const p of parts) {
    const mine = solids.filter((s) => s.of === p.id);
    assert.ok(mine.length >= 1, `${p.id} is drawn`);
    const x0 = Math.min(...mine.map((s) => s.box.x));
    const y0 = Math.min(...mine.map((s) => s.box.y));
    const z0 = Math.min(...mine.map((s) => s.box.z));
    const x1 = Math.max(...mine.map((s) => s.box.x + s.box.w));
    const y1 = Math.max(...mine.map((s) => s.box.y + s.box.h));
    const z1 = Math.max(...mine.map((s) => s.box.z + s.box.d));
    assert.deepEqual([x0, y0, z0, x1 - x0, y1 - y0, z1 - z0].map((v) => +v.toFixed(6)),
      [p.box.x, p.box.y, p.box.z, p.box.w, p.box.h, p.box.d].map((v) => +v.toFixed(6)), `${p.id}: the room draws the kit's box`);
    assert.ok(near(mine.reduce((s, m) => s + vol(m.box), 0), vol(p.box), 1e-3), `${p.id}: no more and no less material than the kit's`);
  }
  // Nothing invented: every solid is a part, or one of the kit's own records (the strips, the back's panes).
  const ids = new Set(parts.map((p) => p.id));
  for (const s of solids) assert.ok(s.of === null ? ['led_bottom', 'led_side', 'back_mirror'].includes(s.kind) : ids.has(s.of), s.id);
  assert.deepEqual(solids.filter((s) => s.of === null).map((s) => s.id), ['01:LED-UNDER', '01:LED-INSIDE']);
  // The leaf UnitView draws for each part: the engine's panel itself, the same object, but a mirror door.
  for (const p of parts) {
    if (isMirrorDoor(p)) continue;
    assert.equal(mirrorRoomPanel(p), p, `${p.id} is drawn from the engine's own panel`);
  }
  // The bottom box, the panels round and the dividers are parts like any other.
  assert.deepEqual(solids.filter((s) => s.kind === 'panel').map((s) => s.id), ['PANEL-L', 'PANEL-R', 'PANEL-TOP', 'PANEL-BOTTOM']);
  assert.ok(solids.some((s) => s.id === 'BOX-TOP') && solids.some((s) => s.id === 'BOX-FRONT'), 'the bottom box');
  assert.equal(solids.filter((s) => s.kind === 'glass_shelf').length, 15);
  assert.equal(solids.filter((s) => s.kind === 'led_stile').length, 2);
});

test('F3 . the mirror door is 22 thick in the room: the board 18 from the back, the mirror 4 in front, both on the leaf', () => {
  const r = cut();
  const doors = r.panels.filter(isMirrorDoor);
  assert.deepEqual(doors.map((d) => d.id), ['01-F1', '01-F2', '01-F3']);
  for (const d of doors) {
    const leaf = mirrorRoomPanel(d);
    assert.notEqual(leaf, d);
    assert.equal(mirrorRoomPanel(d), leaf, 'one leaf per engine panel: its memos hold');
    assert.deepEqual([leaf.box.z, leaf.box.d], [215, 18], 'the leaf is the board');
    assert.equal(leaf.meta.mirror.flush, true);
    const plate = doorMirrorPlate(leaf);
    assert.deepEqual(plate, { z0: 233, t: 4 }, 'the mirror is the 4 in front of the board');
    assert.equal(leaf.box.d + plate.t, 22, 'the door is 22 in the room');
    assert.equal(plate.z0 + plate.t, d.box.z + d.box.d, 'its face is the kit\'s face');
    assert.deepEqual([leaf.meta.mirror.w, leaf.meta.mirror.h], [d.box.w, d.box.h], 'the mirror covers the board');
    assert.deepEqual(mirrorDoorSolids(d).mirror, { x: d.box.x, y: d.box.y, z: 233, w: d.box.w, h: d.box.h, d: 4 });
  }
  // Mirror doors off: an 18 door, its own panel, no mirror.
  const bare = cut({}, { mirror_doors: false });
  const f2 = byId(bare, '01-F2');
  assert.equal(f2.box.d, 18);
  assert.equal(mirrorRoomPanel(f2), f2);
  assert.equal(doorMirrorPlate(f2), null);
  // T33's stuck-on mirror (a wardrobe's door) is where it always was: a 2 mm plane 1.2 mm off the leaf.
  const t33 = { box: { x: 0, y: 0, z: 560, w: 400, h: 2000, d: 18 }, meta: { mirror: { face: 'outside', w: 380, h: 1980 } } };
  assert.deepEqual(doorMirrorPlate(t33), { z0: 560 + 18 + 1.2 - 1, t: 2 });
  // The one mirror of the app.
  assert.deepEqual({ ...MIRROR_LOOK }, { color: '#e8edf0', metalness: 1, roughness: 0.03, envMapIntensity: 2.2 });
});

test('F3 . the LED stile\'s face is the mirror\'s face (z equal to 0.01): "na rowno z drzwiami, nie wcisniete"', () => {
  for (const mirror of [{}, { mirror_doors: false }, { stile_width_mm: 90 }]) {
    const r = cut({}, mirror);
    const stiles = r.panels.filter((p) => p.role === 'led_stile');
    assert.equal(stiles.length, 2);
    for (const door of r.panels.filter(isMirrorDoor)) {
      const leaf = mirrorRoomPanel(door);
      const plate = doorMirrorPlate(leaf);
      const face = plate ? plate.z0 + plate.t : leaf.box.z + leaf.box.d;
      for (const s of stiles) {
        assert.ok(Math.abs((s.box.z + s.box.d) - face) <= 0.01, `${s.id} ${s.box.z + s.box.d} at ${door.id}'s face ${face}`);
        assert.ok(!enters(s.box, leaf.box) && (!plate || !enters(s.box, mirrorDoorSolids(door).mirror)), `${s.id} enters no door`);
      }
    }
  }
});

test('F3 . the LED stile is lit at 4000 K by the house\'s switch, the glass shelf is T30\'s clear glass, every other surface is itself', () => {
  const r = cut();
  const surface = { colour: '#ffffff', roughness: 0.5, metalness: 0, texture: 'scan.jpg', sprayed: true };
  const spec = lightingSpec(P);
  const hex = temperatureEntry(4000, P).hex;
  const stile = byId(r, 'STILE-1');
  const lit = mirrorRoomSurface(stile, surface, { profile: P, design: { lighting: { on: true } } });
  assert.deepEqual([lit.colour, lit.emissive, lit.texture, lit.sprayed], [hex, hex, null, false]);
  assert.equal(lit.emissiveIntensity, spec.view.emissive * spec.demo.emissiveBoost, 'as LedStrips.jsx lights a strip');
  const dark = mirrorRoomSurface(stile, surface, { profile: P, design: { lighting: { on: false } } });
  assert.equal(dark.emissiveIntensity, spec.view.offEmissive, 'off is the house\'s whisper (CHAT-FIX 16.08)');
  assert.deepEqual(mirrorLedGlow(r, { profile: P, design: { lighting: { on: true } } }),
    { kelvin: 4000, hex, on: true, intensity: spec.view.emissive * spec.demo.emissiveBoost });
  const glass = mirrorRoomSurface(byId(r, 'SHELF-1'), surface, { profile: P });
  assert.deepEqual([glass.glass, glass.texture, glass.sprayed], [GLASS_SHELF_KIND, null, false]);
  assert.equal(GLASS_SHELF_KIND, 'clear');
  for (const id of ['BUL', 'BACK', 'PANEL-L', 'BOX-FRONT', 'DIVIDER-1', '01-F1']) {
    assert.equal(mirrorRoomSurface(byId(r, id), surface, { profile: P }), surface, `${id} keeps its surface`);
  }
  assert.equal(mirrorRoomSurface(stile, surface, { profile: P, contour: true }), surface, 'the contour view is outlines only');
  // A timber stile is a cut board in the carcass finish: no light.
  const timber = cut({}, { stile: 'timber' });
  assert.equal(timber.panels.filter((p) => p.role === 'led_stile').length, 0);
  const ts = timber.panels.find((p) => p.part === 'MIRROR-STILE');
  assert.equal(mirrorRoomSurface(ts, surface, { profile: P }), surface);
});

test('F3 . the LED under and the LED inside: the house\'s strip at the kit\'s lines, and no strip or pane enters a board', () => {
  const s = lightingSpec(P).strip;
  const r = cut({}, { mirror_back: true });
  const strips = mirrorLedStrips(r, P);
  const under = strips.find((x) => x.kind === 'bottom');
  const inside = strips.find((x) => x.kind === 'side');
  const m = r.derived.mirror.led;
  assert.deepEqual(under.box, { x: m.under.x, y: -s.thickness, z: m.under.z - s.width / 2, w: m.under.length, h: s.thickness, d: s.width });
  assert.deepEqual(inside.box, { x: m.inside.x, y: m.inside.y0, z: m.inside.z - s.sideLineWidth / 2, w: s.thickness, h: m.inside.length, d: s.sideLineWidth });
  assert.deepEqual([under.box.x, under.box.w, inside.box.y, inside.box.h], [48, 1254, 130, 922]);
  const panes = mirrorBackPanes(r);
  for (const pic of [...strips, ...panes]) {
    for (const p of r.panels.filter((q) => q.box)) {
      assert.ok(!enters(pic.box, p.box), `${pic.id} enters ${p.id}`);
    }
  }
  // Each one off is drawn off.
  assert.deepEqual(mirrorLedStrips(cut({}, { led_under: false }), P).map((x) => x.kind), ['side']);
  assert.deepEqual(mirrorLedStrips(cut({}, { led_inside: false }), P).map((x) => x.kind), ['bottom']);
  assert.deepEqual(mirrorLedStrips(computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: '01' }, P), P), [], 'any other unit: nothing');
});

test('F3 . the recess moves the whole cabinet into the wall by recess_mm: every solid, and no part moves on its own', () => {
  const at0 = kit();
  const at155 = kit({ recess_mm: 155 });
  const r0 = computeCabinet(at0, P);
  const r155 = computeCabinet(at155, P);
  const u0 = { type: 'MIRROR_CABINET', params: at0 };
  const u155 = { type: 'MIRROR_CABINET', params: at155 };
  assert.equal(backStandoff(u155, P) - backStandoff(u0, P), -155, 'the room\'s one placement (UnitView origin)');
  const room = (u, r) => {
    const back = backStandoff(u, P);
    return Object.fromEntries(mirrorRoomSolids(r, P).map((x) => [x.id, back + x.box.z]));
  };
  const z0 = room(u0, r0);
  const z155 = room(u155, r155);
  assert.deepEqual(Object.keys(z155), Object.keys(z0));
  for (const id of Object.keys(z0)) assert.ok(near(z155[id] - z0[id], -155), `${id} moves 155 into the wall`);
  const placed = mirrorRecessPlacement(u155, r155, P);
  const gap = P.room.wallBackClearance;
  assert.deepEqual(placed, {
    recessMm: 155, backMm: gap - 155, carcassFrontMm: gap - 155 + 215, faceMm: gap - 155 + 237,
    wallOpening: { x: 0, y: 0, w: 1350, h: 1100, depth: 155 },
  });
  assert.equal(mirrorRecessPlacement(u0, r0, P).wallOpening, null, 'on the wall: no opening');
  // The room reads the store's own unit: the typed recess, through the house's road.
  const S = () => useProjectStore.getState();
  S().newProject('Mirror room', { design: { projectType: 'kitchen' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const id = S().addUnit('MIRROR_CABINET').id;
  S().updateUnitParams(id, { recess_mm: 155 });
  const U = S().units.find((u) => u.id === id);
  const r = S().allResults().find((e) => e.unit.id === id).result;
  assert.equal(mirrorRecessPlacement(U, r, P).backMm, gap - 155);
  // UnitView stands every unit at backStandoff: the recess needs no line of its own.
  const view = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(view, /const backInset = backStandoff\(unit, profile\);/);
  assert.match(view, /\.addScaledVector\(inward, mm\(backInset\)\)/);
});

// ═══ THE BACK'S CLICK: "MIRROR ON THE BACK?" ═════════════════════════════

test('F3 . the back asks: a click on the BACK opens "Mirror on the back?", Yes puts a pane a bay on its inside face, No takes them off', () => {
  assert.deepEqual(MODAL_KINDS['mirror-back'], { about: 'object', label: 'Mirror on the back' });
  assert.equal(modalNeedsAnchor('mirror-back'), true);
  const S = () => useProjectStore.getState();
  const Ui = () => useUiStore.getState();
  S().newProject('Mirror back', { design: { projectType: 'kitchen' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const id = S().addUnit('MIRROR_CABINET').id;
  const resultOf = () => S().allResults().find((e) => e.unit.id === id).result;
  const back = resultOf().panels.find((p) => p.id === 'BACK');
  assert.equal(mirrorBackClick(resultOf().panels.find((p) => p.id === 'BUL'), id), null, 'only the back asks');
  // The click the room hands the BACK: the left button, no drag, the back the nearest board.
  const backMesh = { userData: { ccPanelId: 'BACK' } };
  const door = { userData: { ccPanelId: '01-F2' } };
  const helper = { userData: { ccHelper: true } };
  const click = mirrorBackClick(back, id);
  let stopped = 0;
  const ev = (intersections) => ({
    button: 0, delta: 0, clientX: 410, clientY: 260, eventObject: backMesh, intersections, stopPropagation: () => { stopped += 1; },
  });
  click(ev([{ eventObject: door }, { eventObject: backMesh }]));
  assert.equal(Ui().modal, null, 'a door in front keeps the click');
  click({ ...ev([{ eventObject: backMesh }]), delta: 12 });
  assert.equal(Ui().modal, null, 'a drag asks nothing');
  click(ev([{ eventObject: helper }, { eventObject: backMesh }]));
  assert.equal(Ui().modal, 'mirror-back', 'a figure over the back is not a board');
  assert.equal(Ui().modalArgs.unitId, id);
  assert.deepEqual([Ui().modalArgs.anchor.x, Ui().modalArgs.anchor.y], [410, 260], 'beside the click');
  assert.equal(stopped, 1);
  Ui().closeModal();
  askMirrorBack(id, { x: 1, y: 2 });
  assert.equal(Ui().modal, 'mirror-back');
  Ui().closeModal();
  // Yes: the kit's key, every other answer kept; the room draws a pane a bay on the back's inside face.
  const before = { ...S().units.find((u) => u.id === id).params.mirror };
  assert.deepEqual(S().setMirrorBack(id, true), { ok: true, said: '' });
  const after = S().units.find((u) => u.id === id).params.mirror;
  assert.deepEqual(after, { ...before, mirror_back: true });
  const panes = mirrorBackPanes(resultOf());
  assert.deepEqual(panes.map((p) => p.id), ['BACK:MIRROR-1', 'BACK:MIRROR-2', 'BACK:MIRROR-3']);
  for (const pn of panes) assert.deepEqual([pn.box.z, pn.box.d, pn.box.y, pn.box.h], [18, 4, 130, 922], `${pn.id} on the back's inside face`);
  assert.deepEqual(panes.map((p) => [p.box.x, p.box.w]), [[48, 340.5], [406.5, 537], [961.5, 340.5]], 'one a bay, between the dividers');
  // No: they go.
  assert.deepEqual(S().setMirrorBack(id, false), { ok: true, said: '' });
  assert.deepEqual(mirrorBackPanes(resultOf()), []);
  // Any other kit is refused in words, nothing written.
  const wud = S().addUnit('WUD').id;
  const res = S().setMirrorBack(wud, true);
  assert.equal(res.ok, false);
  assert.match(res.said, /only a mirror cabinet takes a mirror on its back\.$/);
  assert.equal(S().units.find((u) => u.id === wud).params.mirror, undefined);
});

// ═══ THE WIRING, READ OFF THE SOURCES ════════════════════════════════════

test('F3 . the room\'s wiring: every part through the house\'s leaf, the look from mirrorCabinetRoom.js, MirrorCabinet mounted once, no lamp added', () => {
  const view = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(view, /\{result\.panels\.map\(mirrorRoomPanel\)\.filter\(\(p\) => p\.box && !p\.meta\?\.frontDecorationParent/, 'the leaf is the room panel');
  assert.match(view, /&& !p\.meta\?\.bifold\?\.parent\)\.map\(\(p\) => \{/, 'T78 F8\'s loop is word for word what it was');
  assert.match(view, /const worn = mirrorRoomSurface\(p, feltHex \? feltSurface\(surface, feltHex\) : surface, \{ profile, design, contour \}\);/);
  assert.match(view, /\{\.\.\.\(mirrorBackClick\(p, unit\.id\) \? \{ onClick: mirrorBackClick\(p, unit\.id\) \} : \{\}\)\}/, 'the back\'s click');
  assert.equal((view.match(/<MirrorCabinet /g) || []).length, 1, 'mounted once');
  assert.match(view, /\{!contour && \(\s+<MirrorCabinet unit=\{unit\} result=\{result\} design=\{design\} profile=\{profile\} \/>\s+\)\}/);
  // MovingPanel: the flush mirror at the kit's face, T33's material, the glass and the light.
  assert.match(view, /p\.meta\.mirror\.flush\s+\? mm\(doorMirrorPlate\(p\)\.z0 \+ doorMirrorPlate\(p\)\.t \/ 2\)/);
  assert.match(view, /p\.meta\.mirror\.flush \? mm\(doorMirrorPlate\(p\)\.t\) : 0\.002/);
  assert.match(view, /<meshPhysicalMaterial \{\.\.\.MIRROR_LOOK\} \/>/);
  assert.match(view, /\{\.\.\.\(surface\.glass \? \{\s+color: paneMaterialFor\(surface\.glass\)\.color,/);
  assert.match(view, /opacity: paneMaterialFor\(surface\.glass\)\.opacity \* faded,\s+depthWrite: false,/);
  assert.match(view, /\{\.\.\.\(surface\.emissive \? \{ emissive: surface\.emissive, emissiveIntensity: surface\.emissiveIntensity \} : \{\}\)\}/);
  // T74's side question is word for word what it was.
  assert.match(view, /onClick=\{onAskSide && \(p\.part === 'BUL' \|\| p\.part === 'BUR'\) \? \(e\) => \{/);
  // The cabinet's own pictures: the strips and the panes, never a pick, never a lamp.
  const cab = uncomment(read('src/3d/MirrorCabinet.jsx'));
  assert.match(cab, /mirrorBackPanes\(result\)/);
  assert.match(cab, /mirrorLedStrips\(result, profile\)/);
  assert.match(cab, /<meshPhysicalMaterial \{\.\.\.MIRROR_LOOK\} \/>/);
  assert.equal((cab.match(/raycast=\{NO_PICK\}/g) || []).length, 2);
  assert.ok(!/Light\b|rectAreaLight|pointLight|spotLight/.test(cab), 'FROZEN 3: no lamp');
  // The window: the question, No and Yes through the store's one action.
  const panel = read('src/components/RightPanel.jsx');
  assert.match(panel, /<MirrorBackModal \/>/);
  assert.match(panel, /if \(modal !== 'mirror-back' \|\| !args\?\.unitId\) return null;/);
  assert.match(panel, /data-testid="mirror-back-question">Mirror on the back\?<\/p>/);
  assert.match(panel, /data-testid="mirror-back-yes" onClick=\{\(\) => answer\(true\)\}>Yes<\/button>/);
  assert.match(panel, /data-testid="mirror-back-no" onClick=\{\(\) => answer\(false\)\}>No<\/button>/);
  assert.match(panel, /const res = setMirrorBack\(args\.unitId, yes\);/);
});
