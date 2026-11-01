/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F14 (PART E): THE DRAWER BOX IS ON CABINEO 12.
//
// The owner, 18.10.2026: *"jak mamy wybrane jakąkolwiek funkcję łączenia czy
// dog bones czy inne zawsze projektuj cabineo na szuflady, na przednich i
// tylnych ściankach dodawaj cabineo jeden do 100 mm, 2 powyżej 100 mm,
// minimum odległość to 25 od góry i dołu"*; 14:45: *"cabineo musi być na
// frontowej i tylnej ściance, czyli nawiercanie w bokach będzie liczone od
// góry boxa bo [dół] jest inny"*; 14:51: the positions from the top *"tak"*,
// Cabineo 12 *"tak"*, *"przy wysokich nie rozsuwaj"*, the bottom *"tak, bo
// jest wsuwane więc nie ma po co dodawać cabineo"*.
//
// SKYLON_JOINTS_CABINEO.lsp D.2c and its H.1 NUMBERS are the law; this file
// holds the engine (engine/cabineo.js Z2, the three box builders of
// engine/cabinet.js) to them number for number, the gate (a unit that names a
// joint system; a bare kit names none), the bottom left alone, the BUDR's two
// facade pilots untouched, the BOM counts, the refusals in words, the frames
// the 3D reads, and the store's hand-off.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import * as C from '../src/engine/cabineo.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { partLabelText } from '../src/engine/cnc/partLabel.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { rectCorners } from '../src/engine/room.js';
import { clearCompanyDefaults } from '../src/engine/companyDefaults.js';
import { paramsForEngine, useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const LISP = read('reference/lisp/SKYLON_JOINTS_CABINEO.lsp');
const DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
const S = () => useProjectStore.getState();

const BUDR = { ...defaultParamsFor('BUDR', P), unit_num: '01' };
const NAMED = { ...BUDR, joints_system: 'puzzle' };
const wardrobe = (frontMm = null, system = 'cabineo12') => ({
  ...defaultParamsFor('WARDROBE', P),
  width: 1200,
  unit_num: '01',
  joints_system: system,
  items: [1, 2, 3].map(() => ({ kind: 'drawer', mount: 'internal', ...(frontMm ? { height_mm: frontMm } : {}) })),
});
const RULE = C.cabineoBoxRule(P);
const isCab = (d) => d.kind === 'cabineo_hole' || d.kind === 'cabineo_pocket';
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const holesOn = (r, id) => r.drills.filter((d) => d.panel === id && d.kind === 'cabineo_hole');
const pts = (list) => list.map((d) => [d.x, d.y]);

// ═══ THE GATE ═══════════════════════════════════════════════════════════════

test('F14 · THE GATE: a bare kit cuts no box Cabineo; a unit that names ANY joint system does; a box bought ready does not', () => {
  const bare = computeCabinet(BUDR, P);
  assert.equal(bare.drills.some(isCab), false, 'a bare computeCabinet() names no system: the box as the kit cuts it');
  assert.equal(bare.derived.boxCabineo, undefined);
  for (const system of ['puzzle', 'dowel', 'biscuit', 'cabineo8', 'cabineo12']) {
    const r = computeCabinet({ ...BUDR, joints_system: system }, P);
    assert.deepEqual(r.derived.boxCabineo, { joints: 12, pockets: 20, holes: 20 }, `${system}: the box takes Cabineo 12 whatever joins the carcass`);
  }
  assert.equal(C.boxCabineoAsked({ joints_system: 'spaghetti' }), false, 'a stray id names nothing');
  const ready = computeCabinet({ ...NAMED, drawer_boxes: 'ready' }, P);
  assert.equal(ready.drills.some(isCab), false, 'a box bought ready is not cut, so it is not machined');
  assert.equal(ready.derived.boxCabineo, undefined);
});

// ═══ THE LISP'S NUMBERS (H.1), NUMBER FOR NUMBER ═════════════════════════════

// CHAT FIX 31.10.2026: THE TOPS ARE FLUSH. The wall stands on the groove's upper edge (34), its top edge the side's, so the
// side's holes stand 25 under the side's top and 25 above the groove: 212 and 59, not 211 and 58; the wall's lower edge at
// 65.5, not 64.5; the pockets never moved. the owner, 31.10.2026: *"dziurki 5 mm byly za nisko, byly 24 od wyciecia i 26 od gory, a cabineo mialo 25 i tu i tu ... powinny byc przesuniete o 1 mm do gory boxa"*. SKYLON_JOINTS_CABINEO.lsp D.2c and H.1 amended first.
test('F14 · H.1, the BUDR default: two per joint at 25 and 178 from the wall\'s top, holes 212 and 59, the walls flush with the sides', () => {
  const r = computeCabinet(NAMED, P);
  const sl = panelOf(r, 'D1-SL');
  const bf = panelOf(r, 'D1-BF');
  assert.deepEqual([sl.h, sl.w, bf.h, bf.w], [237, 490, 203, 518], 'side 237 x 490, wall 203 x 518');
  assert.equal(bf.box.y, 65.5);
  assert.equal(r4(bf.box.y + bf.box.h), 268.5);
  assert.equal(r4(sl.box.y + sl.box.h), 268.5);
  assert.equal(r4((sl.box.y + sl.box.h) - (bf.box.y + bf.box.h)), 0, 'boxWallY + hw = boxY + sideH: FLUSH (the LISP says why; 1 until 31.10.2026)');
  // SL: x up from its lower edge, y from its FRONT end; SR: y from its BACK end.
  assert.deepEqual(pts(holesOn(r, 'D1-SL')), [[212, 5.5], [59, 5.5], [212, 484.5], [59, 484.5]]);
  assert.deepEqual(pts(holesOn(r, 'D1-SR')), [[212, 484.5], [59, 484.5], [212, 5.5], [59, 5.5]]);
  // 25 above the groove's upper edge (15 + 18 + 1 = 34): the owner's "25 od wyciecia".
  assert.equal(59 - (P.baseDrawerUnit.runnerPocketWidth + 18 + P.baseDrawerUnit.boxFrontHeightExtra), 25);
  assert.ok(holesOn(r, 'D1-SL').every((d) => d.d === 5 && d.depth === 12 && d.layer === 'CABINEO_HOLE_5MM'), 'dia 5, 12 deep (X of Cabineo 12)');
  // BOX-FRONT: the owner's drill15 lobes at 3.6 / 14.8 / 26 from each end, on the axes 178 and 25.
  const d15 = r.drills.filter((d) => d.panel === 'D1-BF' && d.kind === 'cabineo_pocket');
  assert.equal(d15.length, 12, 'four pockets on the BOX-FRONT (two a joint, two joints), three dia 15 holes each');
  assert.ok(d15.every((d) => d.face === 'outside' && d.depth === 11.5 && d.d === 15));
  assert.deepEqual([...new Set(d15.map((d) => d.x))].sort((a, b) => a - b), [25, 178]);
  assert.deepEqual([...new Set(d15.map((d) => d.y))].sort((a, b) => a - b), [3.6, 14.8, 26, 492, 503.2, 514.4]);
  const skims = bf.cnc.pockets.filter((k) => k.kind === 'cabineo_recess').map((k) => [k.x1, k.y1, k.x2, k.y2, k.depth]);
  assert.deepEqual(skims, [[169.65, 0, 186.35, 34.35, 0.5], [16.65, 0, 33.35, 34.35, 0.5], [169.65, 483.65, 186.35, 518, 0.5], [16.65, 483.65, 33.35, 518, 0.5]]);
  // D2 and D3.
  assert.deepEqual(pts(holesOn(r, 'D2-SL')).slice(0, 2), [[153, 5.5], [59, 5.5]]);
  assert.deepEqual(pts(holesOn(r, 'D3-SL')), [[76, 5.5], [76, 484.5]], 'the wall of 84 takes ONE a joint, at 42');
  assert.deepEqual([...new Set(r.drills.filter((d) => d.panel === 'D3-BF' && d.kind === 'cabineo_pocket').map((d) => d.x))], [42]);
  assert.deepEqual(r.derived.boxCabineo, { joints: 12, pockets: 20, holes: 20 }, '8 + 8 + 4');
  assert.equal(r.drills.filter((d) => d.kind === 'cabineo_pocket').length, 60);
  assert.match(LISP, /12 joints, 20 pockets \(60 dia 15 holes, 20 skims\), 20 dia 5\s+;;;\s+holes, 20 x Cabineo 12/);
});

test('F14 · H.1, a wardrobe wall of 90 (a 160 front): ONE a joint at 45, holes at 79; the default 130 wall takes two at 25 and 105', () => {
  const r = computeCabinet(wardrobe(160), P);
  const bf = panelOf(r, 'D1-BF');
  assert.deepEqual([panelOf(r, 'D1-SL').h, bf.h, bf.w], [124, 90, 1022]);
  // SL: x from its BACK end, y up; SR: x from its FRONT end.
  // 31.10.2026: 79 from the side's lower edge (124 - 45), the tops flush; 78 until that day.
  assert.deepEqual(pts(holesOn(r, 'D1-SL')), [[434.5, 79], [5.5, 79]]);
  assert.deepEqual(pts(holesOn(r, 'D1-SR')), [[5.5, 79], [434.5, 79]]);
  const lobes = r.drills.filter((d) => d.panel === 'D1-BF' && d.kind === 'cabineo_pocket').map((d) => [d.x, d.y]);
  assert.deepEqual(lobes, [[1018.4, 45], [1007.2, 45], [996, 45], [3.6, 45], [14.8, 45], [26, 45]]);
  assert.deepEqual(r.derived.boxCabineo, { joints: 12, pockets: 12, holes: 12 });
  const d = computeCabinet(wardrobe(), P);
  assert.equal(panelOf(d, 'D1-BF').h, 130);
  assert.deepEqual(pts(holesOn(d, 'D1-SL')), [[434.5, 139], [434.5, 59], [5.5, 139], [5.5, 59]]);
  assert.deepEqual(d.derived.boxCabineo, { joints: 12, pockets: 24, holes: 24 });
});

test('F14 · one against two at 100, never spread for a tall wall; the refusals at 46 and over 350, in words', () => {
  assert.deepEqual(C.cabineoBoxPositions(100, RULE), [50]);
  assert.deepEqual(C.cabineoBoxPositions(101, RULE), [25, 76]);
  assert.deepEqual(C.cabineoBoxPositions(300, RULE), [25, 275], 'przy wysokich nie rozsuwaj: two, at 25 from each edge');
  const prof = C.cabineoProfile(P, 'cabineo12');
  const sheet = C.cabineoSheet();
  assert.deepEqual(C.cabineoBoxRefusal(prof, sheet, RULE, 18, 18, 203), []);
  assert.deepEqual(C.cabineoBoxRefusal(prof, sheet, RULE, 18, 18, 46),
    ['the box wall is 46.0 high: one Cabineo on its middle would stand 23.0 from its top and bottom edges, under the owner\'s minimum 25']);
  assert.deepEqual(C.cabineoBoxRefusal(prof, sheet, RULE, 18, 18, 350), [], 'two at 300 apart: the sheet\'s max. held');
  assert.deepEqual(C.cabineoBoxRefusal(prof, sheet, RULE, 18, 18, 351),
    ['the box wall is 351.0 high: its two Cabineo would stand 301.0 apart, over the sheet\'s max. 300 between connectors (page 1, Assembly panel 1), and the owner does not spread them']);
  // The carcass's set-out is not the box's: a company pitch over the sheet's 300 says nothing of the box.
  assert.deepEqual(C.cabineoBoxRefusal({ ...prof, pitchMm: 400, minPerJoint: 3 }, sheet, RULE, 18, 18, 203), []);
  // The shoe drawer (side 80, wall 46) is refused on the engine, visibly (Check #31's code), and keeps no Cabineo.
  const shoe = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: '01', joints_system: 'puzzle', items: [{ kind: 'drawer', mount: 'internal', variant: 'shoe' }],
  }, P);
  const w = shoe.warnings.find((x) => x.code === 'JOINTS_REFUSED');
  assert.ok(w, 'refused in words');
  assert.equal(w.panel, 'D1-BF');
  assert.equal(w.message, 'Cabineo 12 refused on the drawer box D1: the box wall is 46.0 high: one Cabineo on its middle would stand 23.0 '
    + 'from its top and bottom edges, under the owner\'s minimum 25; the box keeps no Cabineo');
  assert.equal(shoe.drills.some(isCab), false);
});

test('F14 · MEASURED FROM THE TOP: every hole meets its pocket\'s screw axis, through the frames the 3D reads (both kits)', () => {
  const at = (p, x, y) => {
    const pl = panelPlacement(p);
    return [0, 1, 2].map((k) => r4(pl.origin[k] + pl.u[k] * x + pl.v[k] * y));
  };
  for (const r of [computeCabinet(NAMED, P), computeCabinet(wardrobe(), P), computeCabinet(wardrobe(160), P)]) {
    const ax = C.cabineoAxisFromOutside(C.cabineoProfile(P, 'cabineo12'), C.cabineoSheet());
    assert.equal(ax, 5.5);
    let n = 0;
    for (const h of r.drills.filter((d) => d.kind === 'cabineo_hole' && d.meta?.box)) {
      const tag = h.meta.box;
      const wallId = /-BF$/.test(h.meta.joint) ? `${tag}-BF` : `${tag}-BB`;
      const wall = panelOf(r, wallId);
      const side = panelOf(r, h.panel);
      // The pocket of the same joint and offset, its axis at the open end (s = 0): the screw leaves the wall's END there.
      const lobe = r.drills.find((d) => d.kind === 'cabineo_pocket' && d.panel === wallId && d.meta.joint === h.meta.joint && d.meta.offset === h.meta.offset);
      assert.ok(lobe, `${h.meta.joint} at ${h.meta.offset}: its pocket is on ${wallId}`);
      const hole = at(side, h.x, h.y);
      const axis = at(wall, ...lobe.meta.axis);
      // Same height, the side's inside face at the wall's end, the screw axis ax inside the wall's OUTSIDE face.
      assert.equal(hole[1], axis[1], `${h.meta.joint}: the hole at the pocket's height`);
      assert.equal(hole[0], axis[0], `${h.meta.joint}: the hole in the side's inside face, where the wall's end stands`);
      const outsideZ = /-BF$/.test(wallId) ? wall.box.z + wall.box.d : wall.box.z;
      assert.equal(hole[2], r4(outsideZ + (/-BF$/.test(wallId) ? -ax : ax)), `${h.meta.joint}: ax inside the wall's outside face`);
      // From the top: the side's top above the hole is the offset itself (dTop 0, the tops flush, 31.10.2026; 1 + offset
      // until that day); the wall's top above the axis is the offset.
      assert.equal(r4(side.box.y + side.box.h - hole[1]), r4(h.meta.offset));
      assert.equal(r4(side.box.y + side.box.h), r4(wall.box.y + wall.box.h), `${h.meta.joint}: the two top edges are one line`);
      assert.equal(r4(wall.box.y + wall.box.h - axis[1]), h.meta.offset);
      n += 1;
    }
    assert.equal(n, r.derived.boxCabineo.holes);
  }
});

// ═══ WHAT THE BOX KEEPS ══════════════════════════════════════════════════════

test('F14 · the bottom carries none (it slides in); the BUDR\'s two facade pilots stay where they are; the sides keep their grooves', () => {
  const bare = computeCabinet(BUDR, P);
  const r = computeCabinet(NAMED, P);
  for (const p of r.panels.filter((x) => x.part === 'DRAWER-BOTTOM')) {
    assert.deepEqual(p.cnc, panelOf(bare, p.id).cnc, `${p.id}: the bottom as the kit cuts it`);
    assert.equal(r.drills.some((d) => d.panel === p.id && isCab(d)), false, `${p.id}: no Cabineo`);
  }
  for (const i of [1, 2, 3]) {
    const bf = panelOf(r, `D${i}-BF`);
    assert.deepEqual(bf.cnc.holes, panelOf(bare, `D${i}-BF`).cnc.holes, 'the pilots untouched');
    assert.deepEqual(bf.cnc.holes.map((h) => [h.x, h.y]), [[50, 50], [50, 468]]);
    assert.deepEqual(r.drills.filter((d) => d.panel === bf.id && d.kind === 'screw'), bare.drills.filter((d) => d.panel === bf.id && d.kind === 'screw'));
    for (const s of ['SL', 'SR']) assert.deepEqual(panelOf(r, `D${i}-${s}`).cnc.pockets, panelOf(bare, `D${i}-${s}`).cnc.pockets);
  }
  // Nothing of the carcass moves on a puzzle unit: every non-box drill and panel is the bare kit's.
  const notBox = (id) => !/^D\d/.test(id);
  assert.deepEqual(r.drills.filter((d) => notBox(d.panel)), bare.drills.filter((d) => notBox(d.panel)));
  assert.deepEqual(r.panels.filter((p) => notBox(p.id)), bare.panels.filter((p) => notBox(p.id)));
});

test('F14 · a pocket meeting a pilot hole is refused in words (the carcass grammar); the box beside it is still joined', () => {
  const near = { ...P, baseDrawerUnit: { ...P.baseDrawerUnit, boxScrewFromEdge: 20 } };
  const r = computeCabinet(NAMED, near);
  const said = r.warnings.filter((w) => w.code === 'JOINTS_REFUSED');
  assert.deepEqual(said.map((w) => w.panel), ['D1-BF', 'D2-BF'], 'the lower pockets at 25 meet the pilots at 20, 20');
  assert.equal(said[0].message, 'Cabineo 12 refused on the drawer box D1: the Cabineo pocket of D1 SL-BF on D1-BF (x 16.6 to 33.4, y 0.0 '
    + 'to 34.4) meets the hole at 20.0, 20.0; SKYLON_JOINTS_CABINEO.lsp has no answer for it yet, so the box keeps no Cabineo');
  assert.equal(r.drills.some((d) => /^D[12]-/.test(d.panel) && isCab(d)), false, 'D1 and D2 keep no Cabineo');
  assert.deepEqual(r.derived.boxCabineo, { joints: 4, pockets: 4, holes: 4 }, 'D3 (one at 42) is joined');
  assert.equal(panelOf(r, 'D1-BF').meta.machinedFace, undefined);
});

test('F14 · the L corner\'s drawer stack: each arm\'s boxes are its parent\'s, joined by the same helper; the L sums them, a bare L cuts none', () => {
  const L = (extra = {}) => computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', drawers: 3, ...extra }, P);
  const bare = L();
  assert.equal(bare.drills.some(isCab), false);
  assert.equal(bare.derived.boxCabineo, undefined);
  const r = L({ joints_system: 'puzzle' });
  assert.deepEqual(r.derived.boxCabineo, { joints: 24, pockets: 40, holes: 40 }, 'two BUDR stacks of three, 20 pockets an arm');
  const walls = r.panels.filter((p) => p.part === 'DRAWER-BOX-FRONT' || p.part === 'DRAWER-BOX-BACK');
  assert.equal(walls.length, 12);
  assert.ok(walls.every((p) => p.meta.machinedFace === 'outside'), 'every wall OUTSIDE FACE UP');
  const ids = new Set(r.panels.map((p) => p.id));
  assert.ok(r.drills.filter(isCab).every((d) => ids.has(d.panel)), 'every Cabineo drill stands on a board the L cuts (D1A-SL, D1B-BF, ...)');
  assert.deepEqual(r.hardware.filter((h) => /cabineo/.test(h.role)).map((h) => [h.role, h.qty]), [['cabineo_connector', 40]]);
});

// ═══ BOM, LABEL, DXF ═════════════════════════════════════════════════════════

test('F14 · BOM: one Cabineo 12 line for the boxes, 4 or 8 a box, beside the carcass\'s own lines; no cap for the box', () => {
  const b = computeCabinet(NAMED, P).hardware.filter((h) => /cabineo/.test(h.role));
  assert.deepEqual(b.map((h) => [h.role, h.label, h.qty, h.unit]), [['cabineo_connector', 'Cabineo 12', 20, 'pcs']]);
  assert.deepEqual(Object.keys(b[0].spec), ['article', 'variant', 'mounting', 'machining', 'screwReachXMm', 'note', 'confirmed'], 'the carcass connector\'s spec shape');
  assert.equal(b[0].spec.article, null);
  assert.match(b[0].spec.note, /^drawer box: one per pocket, 4 a box to a 100 wall, 8 above/);
  const w = computeCabinet(wardrobe(), P).hardware.filter((h) => /cabineo/.test(h.role));
  assert.deepEqual(w.map((h) => [h.role, h.qty]), [['cabineo_connector', 44], ['cabineo_cap', 44], ['cabineo_connector', 24]],
    'the carcass on Cabineo 12 keeps its connectors and caps; the boxes add their own line');
  assert.deepEqual(computeCabinet(wardrobe(160), P).hardware.filter((h) => /cabineo/.test(h.role)).map((h) => h.qty), [44, 44, 12]);
  // The LISP's own line, the same words.
  assert.match(LISP, /drawer box: one per pocket, 4 a box to a 100 wall, 8 above; article not on the sheet, owner to supply/);
});

test('F14 · the walls are OUTSIDE FACE UP (label, DXF reflected through the one helper); the sides are not', () => {
  const r = computeCabinet(NAMED, P);
  const bf = panelOf(r, 'D1-BF');
  assert.equal(bf.meta.machinedFace, 'outside');
  assert.equal(panelOf(r, 'D1-BB').meta.machinedFace, 'outside');
  assert.equal(panelOf(r, 'D1-SL').meta.machinedFace, undefined);
  assert.match(partLabelText('01', bf), /OUTSIDE FACE UP$/);
  const files = buildUnitDxfFiles(r, P);
  const f = files.find((x) => x.panelId === 'D1-BF');
  assert.equal(f.setup, 'outside');
  // x' = 203 - x: the axis 178 lands on 25 and 25 on 178 (the set is the same, each pocket crosses).
  const c15 = f.entities.filter((e) => e.type === 'circle' && e.layer === 'CABINEO_POCKET_15MM').map((e) => [e.cx, e.cy]);
  assert.equal(c15.length, 12, 'four pockets, three dia 15 holes each');
  assert.deepEqual([...new Set(c15.map(([x]) => x))].sort((a, b) => a - b), [25, 178]);
  const pilots = f.entities.filter((e) => e.type === 'circle' && e.layer === 'SCREWS_3MM').map((e) => [e.cx, e.cy]);
  assert.deepEqual(pilots, [[153, 50], [153, 468]], 'the pilots, through holes, reflected with the rest (x\' = 203 - 50)');
  assert.equal(files.find((x) => x.panelId === 'D1-SL').setup, undefined);
  assert.equal(f.entities.filter((e) => e.layer === 'CABINEO_RECESS').length, 4, 'one skim a pocket');
});

test('F14 · cabineoSummary gains box on a Cabineo carcass; derived.boxCabineo on every unit that has it; a BUD has none', () => {
  const w = computeCabinet(wardrobe(), P);
  assert.equal(w.derived.joints.system, 'cabineo12');
  assert.deepEqual(w.derived.joints.box, { joints: 12, pockets: 24, holes: 24 });
  assert.deepEqual(w.derived.boxCabineo, w.derived.joints.box);
  assert.equal(computeCabinet(NAMED, P).derived.joints, undefined, 'a puzzle carcass runs no joint-system line');
  const bud = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', joints_system: 'cabineo12' }, P);
  assert.equal(bud.derived.boxCabineo, undefined, 'no drawer, no box plan');
  assert.equal('box' in bud.derived.joints, false, 'golden-cabineo12-bud.json\'s derived stays as it was');
});

test('F14 · the gate shares the carcass\'s confirmed flag: shut, the boxes say so on a puzzle carcass and the export refuses', () => {
  const shut = { ...P, joints: { ...P.joints, cabineo: { ...P.joints.cabineo, confirmed: false } } };
  const r = computeCabinet(NAMED, shut);
  assert.ok(r.warnings.some((w) => w.code === 'CABINEO_GATE' && /^Cabineo 12 on the drawer boxes: the Cabineo pattern is proposed/.test(w.message)));
  assert.equal(C.cabineoExportRefusal([{ result: r }], shut), C.CABINEO_GATE);
  assert.equal(C.cabineoExportRefusal([{ result: computeCabinet(NAMED, P) }], P), null, 'open since 15.10.2026');
});

// ═══ THE MIRROR: the LISP's table rows are the engine's ══════════════════════

test('F14 · cabineo-box-table and cabineoBoxJointTable: the eight rows, field for field, in both frames', () => {
  // 31.10.2026: top = 237 (dTop 0, the tops flush); 236 until that day.
  const env = { hw: 203, top: 237, ax: 5.5, sideL: 490, wallL: 518, GB: 18 };
  const value = (tok) => {
    const m = tok.match(/^\(- (\w+) (\w+)\)$/);
    if (m) return env[m[1]] - env[m[2]];
    if (/^"/.test(tok)) return tok.slice(1, -1);
    return /^-?[0-9.]+$/.test(tok) ? Number(tok) : env[tok];
  };
  const rows = [...LISP.matchAll(/^\s+\(cabineo-box-joint ("[A-Z-]+")\s+(.+)\)$/gm)].map((m) => [m[1], ...m[2].match(/\(- \w+ \w+\)|"[^"]*"|[^\s()]+/g)].map(value));
  assert.equal(rows.length, 8);
  const keys = ['name', 'len', 'side', 'hx0', 'hy0', 'hdx', 'hdy', 'board', 'along', 'endAt', 'dirIn', 'acrossFrom', 'acrossDir', 'boardW', 'boardT'];
  const js = [
    ...C.cabineoBoxJointTable(490, 237, 518, 203, 0, 18, 5.5, true),
    ...C.cabineoBoxJointTable(490, 237, 518, 203, 0, 18, 5.5, false),
  ];
  // The non-rotated half writes the wardrobe frame; its W is the wall's length.
  rows.forEach((row, i) => {
    const want = Object.fromEntries(keys.map((k, j) => [k, row[j]]));
    const got = Object.fromEntries(keys.map((k) => [k, js[i][k]]));
    assert.deepEqual(got, want, `row ${i + 1} (${want.name})`);
  });
});

// ═══ THE STORE ROAD ══════════════════════════════════════════════════════════

test('F14 · THE ROAD: the store names the system on every unit, so a BUDR a person adds is cut with box Cabineo, saved and reloaded the same', () => {
  clearCompanyDefaults();
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUDR');
  const unit = S().units[0];
  assert.equal(unit.params.joints_system, undefined, 'the unit itself says nothing');
  assert.equal(paramsForEngine(unit, S().project.design).joints_system, 'puzzle', 'the hand-off names the ladder\'s answer');
  const r = S().unitResult(unit.id);
  assert.deepEqual(r.derived.boxCabineo, { joints: 12, pockets: 20, holes: 20 });
  assert.equal(r.derived.joints, undefined, 'the carcass is the puzzle');
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.deepEqual(S().unitResult(unit.id).drills.filter(isCab), r.drills.filter(isCab));
});

// ═══ THE GOLDENS AND THE HOUSE LAW ═══════════════════════════════════════════

test('F14 · golden-cabineo12-budr-box.json and golden-cabineo12-wardrobe-box.json, held byte for byte', () => {
  for (const name of ['golden-cabineo12-budr-box.json', 'golden-cabineo12-wardrobe-box.json']) {
    const path = `${ROOT}fixtures/${name}`;
    assert.ok(existsSync(path), `${name} is in fixtures/`);
    const file = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(JSON.stringify(goldenOf(file.params, P)), JSON.stringify(file.expected), `${name} is the engine's cut`);
  }
  assert.equal(JSON.parse(read('fixtures/golden-cabineo12-budr-box.json')).params.joints_system, 'puzzle');
  assert.equal(JSON.parse(read('fixtures/golden-cabineo12-wardrobe-box.json')).params.joints_system, 'cabineo12');
});

test('F14 · no em or en dash in anything this F wrote; the new files carry the copyright header', () => {
  for (const rel of ['test/turn79-f14-box-cabineo.test.js', 'scripts/t78-classify.d/f34-t79-f14.mjs', 'reference/lisp/SKYLON_JOINTS_CABINEO.lsp']) {
    assert.doesNotMatch(read(rel), DASH, `${rel} carries a dash`);
  }
  const z2 = read('src/engine/cabineo.js');
  assert.doesNotMatch(z2.slice(z2.indexOf('// Z2. THE DRAWER BOX')), DASH, 'cabineo.js Z2 carries a dash');
  for (const rel of ['test/turn79-f14-box-cabineo.test.js', 'scripts/t78-classify.d/f34-t79-f14.mjs']) {
    assert.ok(read(rel).startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.'), `${rel}: the header`);
  }
});

function r4(v) { return Math.round(v * 1e4) / 1e4; }
