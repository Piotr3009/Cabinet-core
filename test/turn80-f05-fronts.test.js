/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F5 · DOORS AND DRAWER FRONTS, 22, SET IN THE OPENING ────────────────
//
// CLAUDE.md T80 F5: *"Behind params.inframe only: every front of a unit in a
// frame is the inset front of the LISP (c) ... its face at the frame's face
// (carcass front + 25), its back 3 in front of the carcass. A pair of doors:
// no stile between them, 3 between the leaves. A drawer stack: no rail
// between the fronts, 3 between them ... The drawer BOX does not move (FROZEN
// 6)."*  Tests: the three worked examples (and the wall unit) held to the
// LISP's own answer; the pair; the BUDR2's two fronts; the face plane; the
// style, the cups and the screws following the inset board; the boxes byte
// for byte; the lay-on numbers of the same units with the switch off, byte
// for byte. The probe: verify/t80/f05-probe.md.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runFrameParams } from '../src/engine/inframe.js';
import { rectCorners } from '../src/engine/room.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const L = loadLisp(readFileSync(`${ROOT}reference/lisp/KIT_INFRAME.lsp`, 'utf8'));
const S = () => useProjectStore.getState();
const fronts = (id) => S().unitResult(id).panels.filter((p) => p.role === 'front');
const rect = (p) => [p.box.x, p.box.y, p.box.x + p.box.w, p.box.y + p.box.h];

/** The mockup's scene, the fronts on a 22 board (generic-22 on front type f1, sprayed). */
function mockup({ inframe = true } = {}) {
  S().newProject('T80 F5');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  S().setFrontType('f1', { source: 'spray', material_id: 'generic-22' });
  const add = (type, x) => S().addUnit(type, { wall: 0, x }).id;
  const a = add('BUD', 1000); const b = add('BUD', 1600); const c = add('BUDR2', 2400); const w = add('WUD', 1000);
  S().updateUnitParams(a, { width: 600 }); S().updateUnitParams(b, { width: 800 });
  S().updateUnitParams(c, { width: 500 }); S().updateUnitParams(w, { width: 600 });
  S().setDoors(a, { count: 1, hinge: 'L' }); S().setDoors(b, { count: 2, hinge: 'L' }); S().setDoors(w, { count: 1, hinge: 'L' });
  S().addEndPanel(a, { side: 'L', thickness: 18 });
  if (inframe) S().setDesign({ inframe: true });
  return { a, b, c, w };
}

// ═══ THE WORKED EXAMPLES, THE LISP'S OWN ANSWER ═══════════════════════════

test('F5 · EXAMPLE 1, BUD 600 one door: 556 x 726, the LISP\'s rectangle, 22 thick, face at D + 25, 3 of air behind', () => {
  const { a } = mockup();
  const [door] = fronts(a);
  const o = L.call('inframe-opening', [0, 600, 770, 0, 18]);
  const [kit] = L.call('inframe-fronts', o, [[1.5, 0, 598.5, 767]], 3);
  assert.deepEqual(rect(door), kit);
  assert.deepEqual([door.w, door.h, door.thickness], [556, 726, 22]);
  assert.equal(door.box.z + door.box.d, 558 + 25, 'the face on the frame\'s face');
  assert.equal(door.box.z - 558, 3, '3 of air between the carcass and the door\'s back');
  assert.deepEqual(door.cnc.outline, [[0, 0], [556, 0], [556, 726], [0, 726]]);
  // In a project the lay-on door runs the full 770 (T35 F12: no infill above, no 3 mm top gap); its outer edges map to
  // the opening's either way, which is why the inset door is the LISP's 556 x 726 whatever the lay-on height was.
  assert.deepEqual(door.meta.inset.cell, { x: 1.5, y: 0, w: 597, h: 770 }, 'the lay-on cell it was mapped from');
});

test('F5 · EXAMPLE 2, BUD 800 pair: two leaves of 376.5 x 726, 3 between them, no stile', () => {
  const { b } = mockup();
  const [fl, fr] = fronts(b).sort((p, q) => p.box.x - q.box.x);
  const o = L.call('inframe-opening', [0, 800, 770, 0, 18]);
  const kit = L.call('inframe-fronts', o, [[1.5, 0, 398.5, 767], [401.5, 0, 798.5, 767]], 3);
  assert.deepEqual([rect(fl), rect(fr)], kit);
  assert.deepEqual([fl.w, fl.h, fr.w, fr.h], [376.5, 726, 376.5, 726]);
  assert.equal(fr.box.x - (fl.box.x + fl.w), 3, '3 between the leaves');
  assert.equal(S().unitResult(b).derived.door_width, 376.5, 'derived follows the board');
});

test('F5 · EXAMPLE 3, BUDR2 500: two fronts 456 wide, 360 and 363, 3 between, 3 to the rails, no rail between', () => {
  const { c } = mockup();
  const [f1, f2] = fronts(c).sort((p, q) => p.box.y - q.box.y);
  const o = L.call('inframe-opening', [0, 500, 770, 0, 18]);
  const kit = L.call('inframe-fronts', o, [[1.5, 0, 498.5, 382], [1.5, 385, 498.5, 767]], 3);
  assert.deepEqual([rect(f1), rect(f2)], kit);
  assert.deepEqual([f1.w, f1.h, f2.w, f2.h], [456, 360, 456, 363]);
  assert.equal(f2.box.y - (f1.box.y + f1.h), 3, '3 between the fronts');
  assert.equal(f1.box.y - o[1], 3, '3 to the bottom rail');
  assert.equal(o[3] - (f2.box.y + f2.h), 3, '3 to the top rail');
  const d = S().unitResult(c).derived;
  assert.deepEqual([d.front_heights, d.drawer_front_w, d.drawer_front_y], [[360, 363], 456, [22, 385]]);
});

test('F5 · the wall unit WUD 600: 556 x 676 in its 562 x 682 opening', () => {
  const { w } = mockup();
  const [door] = fronts(w);
  assert.deepEqual([door.box.x, door.box.y, door.w, door.h], [22, 22, 556, 676]);
  assert.equal(door.box.z + door.box.d, 400 + 25);
});

// ═══ WHAT FOLLOWS THE INSET BOARD ══════════════════════════════════════════

test('F5 · the style, the cups and the hinge side follow the inset board: shaker field 60 in, cups on the rows, hung on the side', () => {
  const { a, b } = mockup();
  const [door] = fronts(a);
  assert.deepEqual(door.cnc.pockets.map((k) => [k.x1, k.y1, k.x2, k.y2]), [[60, 60, 496, 666]], 'the shaker field on the inset rectangle');
  assert.deepEqual(door.meta.cupY, [78, 448, 648], 'the carcass rows 100 / 470 / 670 less the door\'s 22');
  const r = S().unitResult(a);
  const cups = r.drills.filter((d) => d.panel === door.id && d.kind === 'cup');
  assert.deepEqual(cups.map((d) => d.y), [78, 448, 648]);
  assert.ok(cups.every((d) => d.x > 0 && d.x < door.w), 'every cup on the board');
  assert.equal(door.meta.hingeOn, 'BUL', 'the leaf names the side it hangs on (its edge stands 22 off it)');
  assert.deepEqual(r.drillSummary.hinged_sides, ['BUL']);
  const pair = fronts(b).sort((p, q) => p.box.x - q.box.x);
  assert.deepEqual(pair.map((p) => p.meta.hingeOn), ['BUL', 'BUR']);
  assert.deepEqual(S().unitResult(b).drillSummary.hinged_sides, ['BUL', 'BUR']);
});

test('F5 · the drawer BOX does not move (FROZEN 6): its boards and its runners byte for byte, the front screws on its pilots', () => {
  const on = mockup();
  const boxesOn = S().unitResult(on.c).panels.filter((p) => p.role === 'drawer_box');
  const runnersOn = S().unitResult(on.c).drills.filter((d) => /RUNNER/i.test(d.layer || '') || d.kind === 'runner');
  const frontsOn = fronts(on.c);
  const off = mockup({ inframe: false });
  const boxesOff = S().unitResult(off.c).panels.filter((p) => p.role === 'drawer_box');
  const runnersOff = S().unitResult(off.c).drills.filter((d) => /RUNNER/i.test(d.layer || '') || d.kind === 'runner');
  assert.ok(boxesOn.length >= 8);
  assert.deepEqual(JSON.stringify(boxesOn), JSON.stringify(boxesOff), 'every box board');
  assert.deepEqual(JSON.stringify(runnersOn), JSON.stringify(runnersOff), 'every runner hole');
  // The screws through the inset front still reach the box front's pilots (in the carcass's frame).
  for (const f of frontsOn) {
    const n = f.meta.drawer;
    const box = boxesOn.find((p) => p.id === `D${n}-BF`);
    // The box front is drawn turned (the probe: its second number runs along its 418 length), so a pilot (u, v) of
    // its drawn frame stands at (x + v, y + u) in the carcass.
    const pilots = (box.cnc.holes || []).map((h) => [box.box.x + h.y, box.box.y + h.x]);
    const screws = f.cnc.holes.filter((h) => h.kind === 'front_screw');
    assert.equal(screws.length, 2);
    for (const s of screws) {
      const at = [f.box.x + s.x, f.box.y + s.y];
      assert.ok(pilots.some(([x, y]) => Math.abs(x - at[0]) < 1e-6 && Math.abs(y - at[1]) < 1e-6),
        `${f.id}'s screw at ${at} meets a pilot of ${box.id} (${JSON.stringify(pilots)})`);
    }
  }
  const [f1] = frontsOn.sort((p, q) => p.box.y - q.box.y);
  assert.deepEqual(f1.cnc.holes.map((h) => [h.x, h.y]), [[69, 92.5], [387, 92.5]], 'the probe\'s numbers');
});

// ═══ IN-FRAME OFF IS MAIN ═════════════════════════════════════════════════

test('F5 · the lay-on fronts of the same units, the switch off, are main\'s byte for byte', () => {
  const ids = mockup({ inframe: false });
  const never = Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, JSON.stringify(S().unitResult(id))]));
  S().setDesign({ inframe: true });
  assert.notEqual(JSON.stringify(S().unitResult(ids.a)), never.a, 'in-frame moves the door');
  S().setDesign({ inframe: false });
  for (const [k, id] of Object.entries(ids)) assert.equal(JSON.stringify(S().unitResult(id)), never[k], k);
  // …and a bare kit is the kit: no in-frame key, no inset.
  const kit = { ...defaultParamsFor('BUD', P), unit_num: '01' };
  const [door] = computeCabinet(kit, P).panels.filter((p) => p.role === 'front');
  assert.deepEqual([door.box.x, door.box.y, door.w, door.h, door.meta.inset], [1.5, 0, 597, 767, undefined]);
});

test('F5 · a front that is not 22 keeps its own board, its face still on the frame\'s face (Check #40 says so, F10)', () => {
  const one = { id: 'u', type: 'BUD', position: { wall: 0, x_mm: 0, rotation_deg: 0 }, params: { ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 18 } };
  const r = computeCabinet({ ...one.params, type: 'BUD', inframe: true, run_frame: runFrameParams([one], P).get('u') }, P);
  const [door] = r.panels.filter((p) => p.role === 'front');
  assert.equal(door.thickness, 18, 'never silently thickened (KIT_INFRAME.lsp D12)');
  assert.equal(door.box.z + door.box.d, 558 + 25, 'the face on the frame\'s face');
});
