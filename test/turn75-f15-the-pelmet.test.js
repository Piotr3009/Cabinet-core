// ─── T75 · F15 · THE PELMET, PLAIN ─────────────────────────────────────────
//
// CLAUDE.md T75 F15, verbatim: *"The held-open row `cornice-pelmet` opens as
// a PLAIN pelmet: a flat strip under a run of wall units, `profile.pelmet = {
// heightMm: 50, thicknessMm: front_t } // T75 proposed`, front material, the
// cornice's run, segment and mitre arithmetic reused (`corniceSegments`,
// `corniceCorner`) on the bottom edge instead of the top, BOM role `pelmet`,
// cut list line. It hides the LED strip and changes nothing about the light
// (FROZEN 2)."*
//
// PROBE (verify/t75/p04-probe.md, F15): the cornice functions admit only the
// 70 and 100 mouldings and measure off the TOP, so the reuse needed a
// parameter on each; the pelmet is a CUT piece (unlike the bought cornice),
// modelled on the bottom mask's run grammar; a WUD's `door_extend` stands in
// the plane the strip would; no lighting file reads it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY, resolveEntry } from '../src/engine/library.js';
import { corniceCorner, corniceSegments } from '../src/engine/cornice.js';
import {
  PELMET_DOOR_REFUSAL, PELMET_MOUNT_REFUSAL, pelmetRefusal, runPelmetParams,
} from '../src/engine/pelmet.js';
import { ELEMENT_TO_PART_ID, PART_REGISTRY, edgePartFor } from '../src/engine/partRegistry.js';
import { elementKind } from '../src/engine/elements.js';
import { groupOfPanel } from '../src/engine/cnc/groups.js';
import { buildBom } from '../src/engine/bom.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const wud = (id, x, extra = {}) => ({
  id, type: 'WUD', params: { ...defaultParamsFor('WUD', P), unit_num: id, ...extra }, position: { wall: 0, x_mm: x, rotation_deg: 0 },
});
const faceDepth = (u) => P.room.wallBackClearance + u.params.depth + P.doors.gap + u.params.front_t;

test('F15 · the numbers: 50 high, the front\'s own thickness, proposed, merged key by key', () => {
  assert.deepEqual(P.pelmet, { heightMm: 50, thicknessMm: null });
  const src = read('src/engine/profile.js');
  const at = src.indexOf('  pelmet: {');
  const block = src.slice(at, src.indexOf('\n  },', at));
  assert.match(block, /heightMm: 50, +\/\/ T75 proposed, owner to confirm/);
  assert.match(block, /thicknessMm: null, +\/\/ T75 proposed, owner to confirm \(null = front_t\)/);
  assert.deepEqual(migrateCabinetProfile({ ...P, pelmet: { heightMm: 60 } }).pelmet, { heightMm: 60, thicknessMm: null });
});

test('F15 · the cornice\'s own questions, asked with the pelmet\'s height; left out, the cornice\'s answers', () => {
  const run = { units: [wud('a', 0, { pelmet: true }), wud('b', 600, { pelmet: true }), wud('c', 1200), wud('d', 1800, { pelmet: true })] };
  const want = (u) => (u.params.pelmet ? 50 : 0);
  assert.deepEqual(corniceSegments(run, P, { heightOf: want }).map((s) => [s.units.map((u) => u.id), s.height]),
    [[['a', 'b'], 50], [['d'], 50]]);
  assert.deepEqual(corniceSegments(run, P), [], 'no cornice asked for, none found');
  // 50 is not a cornice moulding, so the cornice's corner refuses to see it…
  const mine = { height: 50, depth: 438, top: 1447 };
  assert.equal(corniceCorner({ mine, theirs: { ...mine } }, P), null);
  // …and with the pelmet's option it is a corner: equal depths mitre, unequal step.
  const option = (h) => (h > 0 ? h : 0);
  assert.deepEqual(corniceCorner({ mine, theirs: { ...mine }, option }, P), { kind: 'corner', mitre: true, with: null });
  assert.equal(corniceCorner({ mine, theirs: { ...mine, depth: 300 }, option }, P).step.role, 'deeper');
});

test('F15 · the run element: one segment, a wall end square, an open end returns to the wall, members carry a note', () => {
  const units = [wud('a', 0, { pelmet: true }), wud('b', 600, { pelmet: true })];
  const walls = [{ width: 4000 }];
  const m = runPelmetParams(units, { walls, frontFaceDepthOf: faceDepth }, P);
  const el = m.get('a');
  assert.equal(el.role, 'owner');
  assert.equal(el.height, 50);
  assert.equal(el.ends.left, 'wall');
  assert.equal(el.ends.right, 'open');
  assert.deepEqual(el.returns, { left: null, right: faceDepth(units[1]) });
  assert.deepEqual(el.mitres, { left: false, right: true });
  assert.equal(el.length, 1200);
  assert.deepEqual(m.get('b'), { role: 'member', ownerId: 'a' });
  // A tall unit standing at the open end: the strip stops square on its side.
  const tall = {
    id: 't', type: 'BUDTALL', params: { ...defaultParamsFor('BUDTALL', P), unit_num: 't' }, position: { wall: 0, x_mm: 1200, rotation_deg: 0 },
  };
  const stopped = runPelmetParams([...units, tall], { walls, frontFaceDepthOf: faceDepth }, P).get('a');
  assert.equal(stopped.ends.right, 'unit');
  assert.deepEqual(stopped.returns, { left: null, right: null });
  // Its own end panel: square at the carcass, as the bottom mask stops.
  const panelled = [units[0], wud('b', 600, { pelmet: true, end_panels: [{ id: 'ep', side: 'R', thickness: 18 }] })];
  const ep = runPelmetParams(panelled, { walls, frontFaceDepthOf: faceDepth }, P).get('a');
  assert.equal(ep.ends.right, 'end-panel');
  assert.equal(ep.returns.right, null);
  // Nobody asked: nothing.
  assert.ok([...runPelmetParams([wud('a', 0)], { walls }, P).values()].every((v) => v === null));
});

test('F15 · refused in words, never stacked or clipped: not a wall unit, or a door running below the carcass', () => {
  assert.equal(pelmetRefusal(wud('a', 0)), null);
  assert.equal(pelmetRefusal(wud('a', 0, { door_extend: true })), PELMET_DOOR_REFUSAL);
  assert.equal(pelmetRefusal({ id: 'b', type: 'BUD', params: defaultParamsFor('BUD', P) }), PELMET_MOUNT_REFUSAL);
  for (const s of [PELMET_DOOR_REFUSAL, PELMET_MOUNT_REFUSAL]) assert.ok(!/[\u2013\u2014]/.test(s));
  // A unit whose door runs below is not part of a strip even when it says pelmet.
  const m = runPelmetParams([wud('a', 0, { pelmet: true, door_extend: true })], { walls: [{ width: 4000 }] }, P);
  assert.equal(m.get('a'), null);
});

const RUN = {
  role: 'owner', height: 50, offset: 0, length: 600, ends: { left: 'wall', right: 'open' },
  mitres: { left: false, right: true }, returns: { left: null, right: 438 }, unitIds: ['u'],
};

test('F15 · the cut: a strip in the door plane one gap under the door, front material, and its return to the wall', () => {
  const p = { ...defaultParamsFor('WUD', P), unit_num: '01', doors: true, pelmet: true, run_pelmet: RUN };
  const r = computeCabinet(p, P);
  const strip = r.panels.find((x) => x.id === 'PELMET');
  const ret = r.panels.find((x) => x.id === 'PELMET-R');
  const t = p.front_t;
  assert.equal(strip.role, 'pelmet');
  assert.equal(strip.part, 'PELMET');
  assert.equal(strip.material_role, 'front');
  assert.equal(strip.finish_exposed, true);
  assert.deepEqual([strip.w, strip.h, strip.thickness], [600 + t, 50, t], 'the long point reaches the return');
  assert.deepEqual(strip.box, { x: 0, y: -P.doors.gap - 50, z: p.depth + P.doors.gap, w: 600 + t, h: 50, d: t });
  // The door's bottom edge is the carcass's (no extend): the two never touch.
  const door = r.panels.find((x) => x.role === 'front');
  assert.equal(door.box.y - (strip.box.y + strip.box.h), P.doors.gap);
  assert.equal(strip.box.z, door.box.z, 'in the door plane');
  assert.deepEqual([ret.w, ret.h, ret.box.z, ret.box.z + ret.box.d], [438, 50, strip.box.z + t - 438, strip.box.z + t]);
  for (const x of [strip, ret]) {
    assert.deepEqual(x.cnc.holes || [], [], `${x.id} carries a hole`);
    assert.equal(x.cnc.outline.length, 4, 'a rectangle: the 45 is a saw cut, said in the meta');
    assert.equal(x.meta.readiness, 'geometry');
    assert.equal(x.meta.fixing, 'manual');
  }
  assert.equal(strip.meta.mitres.right, true);
  assert.equal(r.drills.filter((d) => /PELMET/.test(d.panel)).length, 0);
  // A cut list line each, on the pelmet's own BOM row, the fronts' sheet and edging.
  assert.equal(r.csvLines.length, r.panels.length);
  assert.equal(ELEMENT_TO_PART_ID.PELMET, 'pelmet');
  assert.equal(PART_REGISTRY.pelmet.materialType, 'front');
  assert.equal(edgePartFor('pelmet'), 'edge_front');
  assert.equal(groupOfPanel(strip), 'fronts');
  assert.equal(elementKind(strip), 'pelmet');
  // A member, or a bare call, cuts none.
  assert.equal(computeCabinet({ ...p, run_pelmet: { role: 'member', ownerId: 'x' } }, P).panels.some((x) => x.role === 'pelmet'), false);
  assert.equal(computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: '01' }, P).panels.some((x) => x.role === 'pelmet'), false);
});

test('F15 · the light is not touched: no lighting file reads it (FROZEN 2)', () => {
  for (const rel of ['src/engine/ledStrips.js', 'src/engine/lighting.js', 'src/engine/lightRig.js']) {
    assert.ok(!/pelmet/i.test(read(rel)), `${rel} reads the pelmet`);
  }
});

test('F15 · the library row opens as an ACTION, and the panel does it to the selected unit\'s run', () => {
  const extras = KITCHEN_LIBRARY.find((g) => g.id === 'extras').items;
  const row = extras.find((e) => e.id === 'cornice-pelmet');
  assert.equal(row.kind, 'action');
  assert.equal(row.action, 'pelmet');
  assert.equal(row.label, 'Pelmet');
  assert.equal(resolveEntry(row, P).enabled, true);
  const panel = read('src/components/LibraryPanel.jsx');
  assert.match(panel, /entry\.kind === 'action'/);
  assert.match(panel, /onClick=\{\(\) => onAction\?\.\(entry\)\}/);
  assert.match(panel, /libraryAction\(entry\.action, selectedUnitId\)/);
});

function wallRun() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const ids = [];
  for (let i = 0; i < 3; i += 1) ids.push(S().addUnit('WUD').id);
  ids.forEach((id, i) => S().moveUnit(id, i * 600, 0));
  return ids;
}

test('F15 · the six stations: one click hangs it along the run, cut, in the BOM, drawn, saved and reloaded; again, it goes', () => {
  const ids = wallRun();
  const on = S().libraryAction('pelmet', ids[1]);
  assert.equal(on.ok, true);
  assert.match(on.said, /Pelmet under 3 wall units/);
  assert.ok(ids.every((id) => U(id).params.pelmet === true), 'not written on the whole run');
  const owner = ids.find((id) => S().runElements[id]?.pelmet?.role === 'owner');
  assert.ok(owner, 'no owner carries the strip');
  const r = S().unitResult(owner);
  const strip = r.panels.find((x) => x.id === 'PELMET');
  assert.ok(strip && strip.w >= 1800, 'the strip does not run the whole run');
  for (const id of ids.filter((x) => x !== owner)) {
    assert.equal(S().unitResult(id).panels.some((x) => x.role === 'pelmet'), false, 'a member cut a second strip');
  }
  const bom = buildBom(S().allResults(), { design: S().project.design, profile: P });
  assert.ok(bom.units.some((u) => (u.rows || []).some((row) => row.role === 'pelmet')), 'not a cut list line');
  const sheets = wallDrawingSheets({
    entries: S().allResults(), project: { name: 'T75 F15' }, room: S().project.room, profile: P, date: '09.10.2026',
  });
  assert.ok(sheets.length > 0, 'the drawing set refused it');
  // Save and reload: the DECISION rides the units; the run element is derived.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  assert.ok(saved.units.every((u) => u.params.run_pelmet === undefined), 'a run element was fossilised into params');
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(S().unitResult(owner).panels.find((x) => x.id === 'PELMET')?.w, strip.w);
  // The same click again takes it off the run.
  const off = S().libraryAction('pelmet', ids[0]);
  assert.equal(off.on, false);
  assert.ok(ids.every((id) => !S().unitResult(id).panels.some((x) => x.role === 'pelmet')));
});

test('F15 · the store refuses in words: nothing selected, a base unit, a door running below', () => {
  const ids = wallRun();
  assert.match(S().libraryAction('pelmet', null).error, /Select a wall unit/);
  const { id: base } = S().addUnit('BUD');
  assert.equal(S().libraryAction('pelmet', base).error, PELMET_MOUNT_REFUSAL);
  S().updateUnitParams(ids[0], { door_extend: true });
  assert.equal(S().libraryAction('pelmet', ids[0]).error, PELMET_DOOR_REFUSAL);
  // Asked from a neighbour, the run takes it where it may: around the refusal.
  const on = S().libraryAction('pelmet', ids[1]);
  assert.equal(on.ok, true);
  assert.notEqual(U(ids[0]).params.pelmet, true);
});

test('F15 · a golden of its own, byte for byte', () => {
  const g = JSON.parse(read('fixtures/golden-pelmet.json'));
  assert.equal(g.params.type, 'WUD');
  assert.equal(g.params.run_pelmet.role, 'owner');
  assert.deepEqual(goldenOf(g.params, P), g.expected);
});
