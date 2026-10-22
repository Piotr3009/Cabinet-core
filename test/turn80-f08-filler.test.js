/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F8 · THE WORKTOP SITS ON THE FRAME; THE FILLER IS A NOTE AND TIMBER ON THE SECTION
//
// CLAUDE.md T80 F8: *"Owner 22:14: "stolarz wypelni ta dziure i blat pojdzie na
// wierzch"; 22:40: "6 informacja i na pdf na przekroju pokaz kawalek timber."
// The worktop: ... under in-frame it sits 19 higher (on the frame's top edge).
// The wall units do not move. The cornice of a wall run stands on the frame's
// top edge (unitTop + 19), PROPOSED ... The filler: NO board in the BOM, NO
// DXF. A NOTE on the run in the BOM and on the unit card ... On the PDF
// SECTION of a base unit ... a hatched piece of timber 19 high over the
// carcass top, behind the frame's top rail, labelled "site filler 19 (timber)",
// and the frame's section (25 x 808) drawn with its lips and its 19 above and
// below, the door 22 flush with its face, the 3 of air behind it. The wall
// unit section the same without the worktop."*  The probe: verify/t80/f08-probe.md.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { buildBom } from '../src/engine/bom.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { buildStation, sectionStations } from '../src/engine/drawings/setSection.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { buildUnitCard } from '../src/engine/drawings/unitCard.js';
import { corniceStackTop } from '../src/engine/cornice.js';

const S = () => useProjectStore.getState();
const P = () => getCabinetProfile();
const NOTE = 'Site filler 19 mm x 1900 under the worktop (joiner, not supplied)';

function scene({ inframe = true } = {}) {
  S().newProject('T80 F8');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  S().setFrontType('f1', { source: 'spray', material_id: 'generic-22' });
  const add = (type, x) => S().addUnit(type, { wall: 0, x }).id;
  const a = add('BUD', 1000); const b = add('BUD', 1600); const c = add('BUDR2', 2400); const w = add('WUD', 1000);
  S().updateUnitParams(a, { width: 600 }); S().updateUnitParams(b, { width: 800 });
  S().updateUnitParams(c, { width: 500 }); S().updateUnitParams(w, { width: 600 });
  S().setDoors(a, { count: 1, hinge: 'L' }); S().setDoors(w, { count: 1, hinge: 'L' });
  S().addEndPanel(a, { side: 'L', thickness: 18 });
  S().addWorktop([a, b, c]);
  if (inframe) S().setDesign({ inframe: true });
  return { a, b, c, w };
}

test('F8 · the worktop sits on the frame: 19 higher under in-frame only; the wall unit does not move', () => {
  const ids = scene({ inframe: false });
  const layon = S().worktopsOf()[0].geometry;
  const wudBase = S().units.find((u) => u.id === ids.w).params.mount_height;
  S().setDesign({ inframe: true });
  const framed = S().worktopsOf()[0].geometry;
  assert.equal(layon.y, 870);
  assert.equal(framed.y, 870 + 19, 'on the frame\'s top edge');
  assert.equal(framed.h, layon.h);
  assert.equal(framed.d, 558 + 25 + 20, 'over the frame\'s face plus the overhang');
  assert.equal(S().units.find((u) => u.id === ids.w).params.mount_height, wudBase, 'the wall unit hangs where it hung');
  S().setDesign({ inframe: false });
  assert.deepEqual(S().worktopsOf()[0].geometry, layon, 'lay-on is main');
});

test('F8 · the filler is a NOTE on the run (the BOM, the unit card), never a board and never a DXF', () => {
  const { a } = scene();
  const bom = buildBom(S().allResults(), { design: S().project.design, profile: P(), materials: [] });
  const notes = bom.units.flatMap((u) => u.rows.filter((r) => r.role === 'inframe_note').map((r) => [u.unitNum, r.material_label, r.area_m2, r.qty]));
  assert.deepEqual(notes, [['01', `NOTE: ${NOTE}`, 0, 1]], 'one note, under the run\'s owner');
  // No board and no file for it anywhere.
  for (const { result } of S().allResults()) {
    assert.ok(!result.panels.some((p) => /FILLER/i.test(p.part) && p.role !== 'infill'), 'no filler board');
    assert.ok(!buildUnitDxfFiles(result, P()).some((f) => /FILLER/i.test(f.name)), 'no filler DXF');
  }
  assert.ok(!bom.cutRows || ![...(bom.cutRows.values ? bom.cutRows.values() : bom.cutRows)].some((r) => r.role === 'inframe_note'), 'not in the merged cut rows');
  // The unit card of the run's owner carries it.
  const card = buildUnitCard(S().unitResult(a), { profile: P() });
  assert.ok(card.entities.some((e) => e.value === `NOTE: ${NOTE}` || e.text === `NOTE: ${NOTE}` || e.str === `NOTE: ${NOTE}`), 'the note on the card');
  // Lay-on: no note.
  scene({ inframe: false });
  const plain = buildBom(S().allResults(), { design: S().project.design, profile: P(), materials: [] });
  assert.equal(plain.units.flatMap((u) => u.rows).filter((r) => r.role === 'inframe_note').length, 0);
});

test('F8 · the PDF section: the frame\'s rails cut and its stile seen, 19 above and below; the timber hatched and named', () => {
  const ids = scene();
  const group = wallGroups(S().allResults(), P())[0];
  const stations = sectionStations(group);
  const ctx = drawingContext(1, P());
  const at = stations.find((s) => s.member.unit.id === ids.a) || { letter: 'A', x: 1300, member: group.members.find((m) => m.unit.id === ids.a) };
  const st = buildStation(group, at, { room: S().project.room, worktops: S().worktopsOf().map((w) => w.geometry), profile: P(), ctx });
  const of = (k) => st.entities.filter((e) => e.meta?.inframe === k);
  const base = 100;
  const [stile] = of('stile');
  assert.deepEqual([stile.x, stile.y, stile.w, stile.h], [10 + 558, base - 19, 25, 770 + 38], 'the frame 25 x 808 beside the carcass face');
  const [bottom] = of('rail-bottom');
  assert.deepEqual([bottom.y, bottom.h], [base - 19, 38], 'the bottom rail: 19 under the carcass, its lip and the bottom board');
  const [top] = of('rail-top');
  assert.deepEqual([top.y, top.h], [base + 770 - 19, 38]);
  const [filler] = of('filler');
  assert.deepEqual([filler.x, filler.y, filler.w, filler.h], [10 + 18, base + 770, 558 - 18, 19], 'behind the top rail, over the carcass top');
  assert.ok(of('filler-hatch').length > 5, 'hatched');
  assert.equal(of('filler-label')[0].value ?? of('filler-label')[0].text, 'site filler 19 (timber)');
  // The inset door is drawn where the engine put it: 22, flush with the frame's face, 3 of air behind.
  const door = st.entities.find((e) => e.layer === 'DOORS' && !e.meta?.inframe && e.kind === 'rect');
  assert.ok(door);
  assert.equal(door.x + door.w, 10 + 558 + 25, 'flush with the frame\'s face');
  assert.equal(door.x, 10 + 558 + 3, '3 of air behind it');
  // On the sheet's SVG.
  const sheets = wallDrawingSheets({ entries: S().allResults(), project: S().project, room: S().project.room, worktops: S().worktopsOf(), design: S().project.design, profile: P(), date: '22/10/2026' });
  const svg = sheetToSvg(sheets.find((s) => s.variant === 'sections').sheet, { kind: 'section' });
  assert.match(svg, /site filler 19 \(timber\)/);
});

test('F8 · the wall unit\'s section: its frame, 19 above and 19 below, no timber and no worktop', () => {
  const ids = scene();
  const group = wallGroups(S().allResults(), P())[0];
  const ctx = drawingContext(1, P());
  const m = group.members.find((x) => x.unit.id === ids.a);
  const st = buildStation(group, { letter: 'A', x: m.x + 300, member: m }, { room: S().project.room, worktops: [], profile: P(), ctx });
  const wallMember = st.members.find((x) => x.unit.id === ids.w);
  assert.ok(wallMember, 'the knife cuts the wall unit above');
  const stiles = st.entities.filter((e) => e.meta?.inframe === 'stile');
  assert.equal(stiles.length, 2);
  const wallStile = stiles.find((e) => e.y > 1000);
  assert.deepEqual([wallStile.y, wallStile.h], [wallMember.base - 19, 720 + 38]);
  assert.equal(st.entities.filter((e) => e.meta?.inframe === 'filler').length, 1, 'the timber only over the base unit');
});

test('F8 · the cornice of a framed wall unit stands on the frame\'s top edge (T80 PROPOSED)', () => {
  const ids = scene();
  assert.equal(S().setCornice(ids.w, 70).height, 70);
  const r = S().unitResult(ids.w);
  assert.equal(r.assemblies.cornice.carcassTop, 720 + 19, 'the cornice on the frame\'s top edge');
  assert.equal(r.assemblies.cornice.doorPlane, 400 + 25, 'its face on the frame\'s face');
  S().setDesign({ inframe: false });
  const lay = S().unitResult(ids.w);
  assert.equal(lay.assemblies.cornice.carcassTop, 720, 'lay-on: the carcass top');
  // The stack the ceiling notice and the run's segments read: unitTop + 19.
  assert.equal(corniceStackTop({ unitTop: 2220 + 19, height: 70 }), 2220 + 19 + 70);
});
