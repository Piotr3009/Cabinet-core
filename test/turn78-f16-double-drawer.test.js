// ─── T78 · F16 · THE DOUBLE DRAWER (A DEEP DRAWER WITH A CUTLERY INNER DRAWER) ─
//
// The owner, 11.10.2026: *"podwojne szuflady szafki z szuflada na sztucce z
// bluma."*  A drawer row may be double (the Drawers section, per row): behind
// ONE front a deep box and, above it, a shallow inner drawer on its own
// runners, Blum's "inner drawer behind a front" arrangement (LEGRABOX, Box
// systems p. 194 onward); the inner drawer's box height, runner length and
// the clearance between the two boxes in reference/hardware/blum-inner-drawer.json,
// owner to confirm. Cut list: two boxes; BOM: two runner pairs; the inner
// drawer carries an inner front (F15); the cutlery insert is the catalogue's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { setInnerDrawerCatalogue, innerDrawerSpec } from '../src/engine/innerDrawer.js';
import { drawerMotion } from '../src/engine/drawerMotion.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const FILE = JSON.parse(read('reference/hardware/blum-inner-drawer.json'));
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const B = P.baseDrawerUnit;

test('F16 · the numbers are the file\'s, owner to confirm, none in the profile; unloaded, every one is null', () => {
  setInnerDrawerCatalogue(null);
  const off = innerDrawerSpec();
  assert.equal(off.loaded, false);
  assert.deepEqual([off.innerSideMm, off.innerSpaceMm, off.deepSpaceMm, off.stackMinMm], [null, null, null, null]);
  assert.ok(setInnerDrawerCatalogue(FILE));
  const on = innerDrawerSpec();
  assert.deepEqual([on.innerSideMm, on.innerSpaceMm, on.deepSideMm, on.deepSpaceMm, on.stackMinMm], [90.5, 109, 177, 193, 302]);
  assert.equal(on.status, 'owner to confirm');
  assert.equal(FILE.status, 'owner to confirm');
  assert.equal(/deepSpaceMm|innerSpaceMm|stackMinMm/.test(read('src/engine/profile.js')), false, 'no Blum number in the profile');
  assert.match(read('src/lib/hardwareCatalogue.js'), /setInnerDrawerCatalogue\(blumInnerDrawer\)/, 'the app loads the file');
  assert.ok(P.drawerInserts.catalogue.some((r) => r.id === 'cutlery'), 'the cutlery insert in T33 F11\'s catalogue');
  setInnerDrawerCatalogue(null);
});

test('F16 · unloaded, or a row too short: refused in words, one box cut, nothing else moves', () => {
  setInnerDrawerCatalogue(null);
  const base = { ...defaultParamsFor('BUDR', P), unit_num: 'D1' };
  const plain = computeCabinet(base, P);
  const off = computeCabinet({ ...base, drawer_double: { 1: true } }, P);
  const said = off.warnings.find((w) => w.code === 'DOUBLE_DRAWER_REFUSED');
  assert.ok(said);
  assert.match(said.message, /not loaded here\. One box is cut/);
  assert.deepEqual(off.panels.map((p) => [p.id, p.w, p.h]), plain.panels.map((p) => [p.id, p.w, p.h]), 'the cut list is the plain one');
  setInnerDrawerCatalogue(FILE);
  const short = computeCabinet({ ...base, drawer_double: { 3: true } }, P);
  const s3 = short.warnings.find((w) => w.code === 'DOUBLE_DRAWER_REFUSED');
  assert.ok(s3);
  assert.match(s3.message, /needs 302 mm of the row \(Blum: 193 \+ 109, owner to confirm\); this row has \d+ mm/);
  assert.equal(short.panels.filter((p) => /^D3I-/.test(p.id)).length, 0);
  setInnerDrawerCatalogue(null);
});

test('F16 · row 1 double: the deep box stops under the inner runner, the inner box stands above it on its own runner row, one inner front, two runner pairs, the cutlery insert', () => {
  setInnerDrawerCatalogue(FILE);
  const base = { ...defaultParamsFor('BUDR', P), unit_num: 'D1' };
  const plain = computeCabinet(base, P);
  const r = computeCabinet({ ...base, drawer_double: { 1: true } }, P);
  assert.equal(r.warnings.some((w) => w.code === 'DOUBLE_DRAWER_REFUSED'), false);
  assert.deepEqual(r.params.drawer_heights, plain.params.drawer_heights, 'the fronts did not move');
  assert.equal(r.panels.filter((p) => p.part === 'DRAWER-FRONT' && p.role === 'front').length, 3, 'three overlay fronts as before');
  // The deep box: shorter than the plain row 1 box, standing where it stood.
  const deep = r.panels.find((p) => p.id === 'D1-SL');
  const plainDeep = plain.panels.find((p) => p.id === 'D1-SL');
  assert.equal(deep.box.y, plainDeep.box.y);
  assert.ok(deep.h < plainDeep.h, 'capped under the inner runner');
  // The inner box: five boards, keyed 1.5, at the file's M side (90.5), on the inner runner row 193 above row 1's runner bottom.
  const inner = r.panels.filter((p) => /^D1I-/.test(p.id));
  assert.deepEqual(inner.map((p) => p.id).sort(), ['D1I-BB', 'D1I-BF', 'D1I-DNO', 'D1I-SL', 'D1I-SR']);
  assert.ok(inner.every((p) => p.meta.drawer === 1.5 && p.meta.inner === true && p.meta.double.row === 1));
  const innerSide = inner.find((p) => p.id === 'D1I-SL');
  assert.equal(innerSide.h, 90.5);
  const row1RunnerBottom = plain.drillSummary.runner_rows_carcass_y[0] - B.firstRowFromBottom;
  assert.ok(near(innerSide.box.y, row1RunnerBottom + 193 + B.boxAboveRunner), 'the inner box rides 193 above row 1 (Blum\'s C below)');
  assert.ok(innerSide.box.y > deep.box.y + deep.h, 'above the deep box');
  assert.ok(innerSide.box.y + innerSide.h < r.panels.find((p) => p.id === 'D2-SL').box.y, 'under row 2');
  // The runner rows: one more, the inner's, 38 above its runner bottom; the BOM counts one more pair.
  const rows = r.drillSummary.runner_rows_carcass_y;
  assert.equal(rows.length, plain.drillSummary.runner_rows_carcass_y.length + 1);
  assert.ok(rows.some((y) => near(y, row1RunnerBottom + 193 + B.firstRowFromBottom)));
  const sideHoles = (res) => res.drills.filter((d) => d.panel === 'BUL' && d.kind === 'runner').length;
  assert.ok(sideHoles(r) > sideHoles(plain), 'the side carries the inner runner row');
  const pairs = (res) => res.hardware.filter((h) => h.role === 'runner_pairs').reduce((n, h) => n + h.qty, 0);
  assert.equal(pairs(r), pairs(plain) + 1);
  // The inner front (F15) on the inner box, and the cutlery insert from the catalogue.
  const front = r.panels.find((p) => p.id === 'D1-DIF1');
  assert.ok(front);
  assert.deepEqual([front.part, front.role, front.meta.inner, front.meta.drawer], ['DRAWER-FRONT', 'drawer_front', true, 1.5]);
  assert.equal(front.h, 90.5);
  assert.ok(near(front.box.z, innerSide.box.z + innerSide.box.d), 'on the inner box front');
  assert.equal(r.drills.filter((d) => d.panel === front.id && d.kind === 'front_screw').length, 2);
  const insert = r.hardware.find((h) => h.role === 'drawer_insert' && h.spec.variant === 'cutlery');
  assert.ok(insert, 'the cutlery insert is ordered');
  assert.match(insert.label, /Cutlery insert/);
  assert.deepEqual(r.drillSummary.double_rows, [1]);
  assert.equal(plain.drillSummary.double_rows, undefined, 'no key where no row is double');
  // The motion: the inner drawer is its own gesture; the deep box rides the outer front.
  const m = drawerMotion(r.panels, { 'D1-DIF1': 1 });
  assert.equal(m.forPanel(innerSide).open, 1);
  assert.equal(m.forPanel(deep).open, 0, 'the deep box stays when only the inner drawer is pulled');
  const m2 = drawerMotion(r.panels, { 'D1-F1': 1 });
  assert.equal(m2.forPanel(deep).open, 1);
  assert.equal(m2.forPanel(innerSide).open, 0);
  setInnerDrawerCatalogue(null);
});

test('F16 · the Drawers section offers Double per row (a choice); the store writes drawer_double; the L drops it from its parents', () => {
  const rp = read('src/components/RightPanel.jsx');
  assert.match(rp, /data-drawer-double=\{num\}/);
  assert.match(rp, /drawer_double: \{ \.\.\.\(unit\.params\.drawer_double \|\| \{\}\), \[num\]: e\.target\.checked \? true : null \}/);
  assert.match(read('src/engine/cabinet.js'), /'drawer_double',\n\s+\];/);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const d = S().addUnit('BUDR').id;
  S().updateUnitParams(d, { drawer_double: { 1: true } });
  assert.equal(U(d).params.drawer_double[1], true);
  setInnerDrawerCatalogue(FILE);
  const r = S().unitResult(d);
  assert.ok(r.panels.some((p) => /-DIF1$/.test(p.id)), 'the inner front from the store road (the unit number is the store\'s)');
  setInnerDrawerCatalogue(null);
  const g = JSON.parse(read('fixtures/golden-double-drawer.json'));
  assert.equal(g.meta.F, 'F16');
  assert.ok(JSON.stringify(g.expected).includes('D1I-SL') || JSON.stringify(g.expected).includes('01-DIF1'), 'the golden carries the inner drawer');
});
