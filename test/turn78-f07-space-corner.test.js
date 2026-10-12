// ─── T78 · F7 · DRAWERS IN THE L (BLUM SPACE CORNER) ─────────────────────────
//
// The owner, 11.10.2026: *"szuflady w narozniku L shape."*  CLAUDE.md T78 F7:
// a drawer row on an L is TWO boxes (one per arm) on the existing drawer
// machinery, with ONE L-shaped front per row (the two outlines joined at the
// inner corner, the overlap law of door B retired for a drawer row); runners
// by the existing MOVENTO ladder per arm depth; the corner joint of the two
// boxes is a bought SPACE CORNER kit: BOM line, body, zero holes,
// `reference/hardware/blum-space-corner.json` with the page.
//
// LISP first: `reference/lisp/KIT_CORNER_L_DRAWERS.lsp`. The engine mirrors it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { lClearanceView } from '../src/engine/corners.js';
import { drawerMotion } from '../src/engine/drawerMotion.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { rectCorners, roomWalls, migrateRoom } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const L = (extra = {}) => computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', ...extra }, P);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

test('F7 · the kit opens: CORNER_L_BASE supports drawers; the wall L and the wardrobe L do not (this turn)', () => {
  assert.equal(getUnitType('CORNER_L_BASE').supports.drawers, true);
  assert.equal(getUnitType('CORNER_L_WALL').supports.drawers, false);
  assert.equal(getUnitType('CORNER_L_WARDROBE').supports.drawers, false);
  assert.equal(getUnitType('CORNER_L_BASE').drawerStyle, null, 'the L\'s own body cuts no drawer');
  assert.deepEqual(P.corner.spaceCorner, {
    label: 'Blum SPACE CORNER kit', rowsMin: 2, rowsMax: 4, bracketMm: 60,
  });
});

test('F7 · a stack is two to four rows: one row, or five, is refused in words and the doors stay', () => {
  for (const n of [1, 5]) {
    const r = L({ drawers: n });
    const said = r.warnings.find((w) => w.code === 'CORNER_L_DRAWERS_REFUSED');
    assert.ok(said, `${n} rows refused`);
    assert.match(said.message, /SPACE CORNER stack is 2 to 4 rows/);
    assert.equal(r.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 0);
    assert.equal(r.panels.filter((p) => p.part === 'FRONT').length, 2, 'the pair of doors stays');
    assert.equal(r.params.drawers, 0);
  }
});

test('F7 · three rows: two boxes a row from the drawer unit of the split, ids per arm, nothing twice', () => {
  const r = L({ drawers: 3 });
  assert.equal(r.panels.filter((p) => p.part === 'FRONT').length, 0, 'a stack takes the place of the doors');
  assert.equal(r.params.drawers, 3);
  assert.equal(r.derived.corner_l.drawers, 3);
  assert.equal(r.derived.corner_l.drawer_rows.length, 3);
  const boxes = r.panels.filter((p) => p.role === 'drawer_box');
  assert.equal(boxes.length, 30, 'five box boards per box, two boxes per row, three rows');
  assert.deepEqual([...new Set(boxes.map((p) => p.meta.arm))].sort(), ['A', 'B']);
  assert.ok(boxes.every((p) => /^D[1-3][AB]-/.test(p.id)), 'the box ids carry the arm letter');
  assert.equal(new Set(r.panels.map((p) => p.id)).size, r.panels.length, 'no id twice');
  // The box drills followed their boards under the new ids.
  const boxIds = new Set(boxes.map((p) => p.id));
  const boxDrills = r.drills.filter((d) => /^D[1-3]/.test(d.panel));
  assert.ok(boxDrills.length > 0 && boxDrills.every((d) => boxIds.has(d.panel)), 'every box drill names a box that exists');
  // Per arm the parent is the drawer unit of the split: its x3 heights on a 720 carcass.
  const rows = r.derived.corner_l.drawer_rows;
  assert.deepEqual(rows.map((x) => x.fronts.length), [2, 2, 2]);
  assert.deepEqual(rows.map((x) => x.boxes.length), [10, 10, 10]);
  const hA = rows.map((x) => x.fronts.find((f) => f.arm === 'A').h);
  const hB = rows.map((x) => x.fronts.find((f) => f.arm === 'B').h);
  assert.deepEqual(hA, hB, 'the two boards of a row are one height');
  assert.ok(hA[0] > hA[1] && hA[1] > hA[2], 'the x3 split, bottom row deepest');
});

test('F7 · ONE L front a row: A runs to the inner back corner, B stands on A\'s face; the pair law of door B is retired', () => {
  const r = L({ drawers: 2 });
  const W = 900; const d = r.derived.corner_l.arm; const gap = P.doors.gap; const ft = P.front.thickness;
  const a1 = r.panels.find((p) => p.id === 'CL01-A-F1');
  const b1 = r.panels.find((p) => p.id === 'CL01-B-F1');
  assert.ok(a1 && b1);
  // A: from the inner back corner line (d + gap, flush with B's back) to the arm end less gap/2.
  assert.ok(near(a1.box.x, d + gap), `A starts at ${a1.box.x}, the corner line is ${d + gap}`);
  assert.ok(near(a1.box.x + a1.box.w, W - gap / 2));
  assert.ok(near(a1.box.z, d + gap) && near(a1.box.d, ft));
  // B: along z, its face at x = d + gap + front_t, its end ON A's face (z = d + gap + front_t), no clearance between them.
  assert.ok(near(b1.box.x, d + gap) && near(b1.box.w, ft), 'B stands along z: its thickness in box.w');
  assert.ok(near(b1.box.z, d + gap + ft), `B starts on A's face at ${d + gap + ft}, not ${b1.box.z}`);
  assert.ok(near(b1.box.z + b1.box.d, 900 - gap / 2));
  assert.equal(b1.w, b1.box.d, 'B\'s width is along z');
  assert.ok(!a1.meta.cornerEdge && !b1.meta.cornerEdge, 'no overlap / covered edge on a drawer row');
  assert.deepEqual(a1.meta.lFront, { row: 1, arm: 'A', joint: 'butt', with: 'CL01-B-F1' });
  assert.deepEqual(b1.meta.lFront, { row: 1, arm: 'B', joint: 'butt', with: 'CL01-A-F1' });
  assert.deepEqual(b1.meta.faceX, { dir: 1 }, 'the scene turns B\'s decorated solid onto z by this');
  assert.equal(a1.meta.faceX, undefined);
  assert.equal(a1.thickness, ft); assert.equal(b1.thickness, ft);
  // The cut list states each board at the size it is cut.
  assert.ok(near(a1.area_m2, (a1.w * a1.h) / 1e6, 1e-6));
  assert.ok(near(b1.area_m2, (b1.w * b1.h) / 1e6, 1e-6));
});

test('F7 · the right hand is the mirror: B\'s face at W - d - gap - front_t facing -x, the row runs out along (-1, +1)', () => {
  const r = L({ drawers: 2, corner_side: 'right' });
  const d = r.derived.corner_l.arm; const gap = P.doors.gap; const ft = P.front.thickness;
  const a1 = r.panels.find((p) => p.id === 'CL01-A-F1');
  const b1 = r.panels.find((p) => p.id === 'CL01-B-F1');
  assert.ok(near(a1.box.x, gap / 2) && near(a1.box.x + a1.box.w, 900 - d - gap));
  assert.ok(near(b1.box.x, 900 - d - gap - ft) && near(b1.box.w, ft));
  assert.deepEqual(b1.meta.faceX, { dir: -1 });
  assert.ok(near(a1.meta.slide.x, -Math.SQRT1_2, 1e-5) && near(a1.meta.slide.z, Math.SQRT1_2, 1e-5));
});

test('F7 · motion: every part of a row runs out of the inner corner along the 45 degree diagonal by the box\'s own length', () => {
  const r = L({ drawers: 3 });
  const parts = r.panels.filter((p) => p.role === 'drawer_box' || p.part === 'DRAWER-FRONT');
  assert.equal(parts.length, 36);
  for (const p of parts) {
    assert.ok(near(p.meta.slide.x, Math.SQRT1_2, 1e-5) && near(p.meta.slide.z, Math.SQRT1_2, 1e-5), `${p.id} slides on the diagonal`);
    assert.ok(p.meta.travel_mm > 0, `${p.id} states its travel`);
  }
  const sideA = r.panels.find((p) => p.id === 'D1A-SL');
  const sideB = r.panels.find((p) => p.id === 'D1B-SL');
  assert.equal(sideA.meta.travel_mm, sideA.box.d, 'arm A\'s side: its length is its depth in the unit frame');
  assert.equal(sideB.meta.travel_mm, sideB.box.w, 'arm B\'s side is turned: its length lies along x');
  // drawerMotion reads the row's travel off the turned side too, and one front's gesture moves the whole row.
  const m = drawerMotion(r.panels, { 'CL01-B-F2': 1 });
  assert.equal(m.travel.get(2), sideA.meta.travel_mm);
  for (const id of ['D2A-SL', 'D2B-SL', 'CL01-A-F2', 'CL01-B-F2']) {
    const p = r.panels.find((x) => x.id === id);
    assert.deepEqual(m.forPanel(p), { open: 1, travel: sideA.meta.travel_mm }, `${id} rides row 2`);
  }
  assert.equal(m.forPanel(r.panels.find((x) => x.id === 'D1A-SL')).open, 0, 'row 1 stays shut');
  // The scene: MovingPanel moves a part along `meta.slide`; arm B's board turns like door B.
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /const sv = p\.meta\?\.slide;/);
  assert.match(view, /group\.current\.position\.x = base\[0\] \+ off \* Number\(sv\.x\);/);
  assert.match(view, /const faceX = front === 'drawer' && p\.meta\?\.faceX/);
  assert.match(read('src/engine/drawerMotion.js'), /Number\(p\.meta\?\.travel_mm\) \|\| Number\(p\.box\.d\)/);
});

test('F7 · the hardware: one MOVENTO pair per box by the arm depth, one SPACE CORNER kit per row, a line and a body, zero holes', () => {
  const r = L({ drawers: 3 });
  const runners = r.hardware.filter((h) => h.role === 'runner_pairs');
  assert.equal(runners.reduce((n, h) => n + h.qty, 0), 6, 'two boxes a row, three rows');
  const kits = r.hardware.filter((h) => h.role === 'space_corner');
  assert.equal(kits.length, 3);
  assert.deepEqual(kits.map((k) => k.spec.row), [1, 2, 3]);
  assert.ok(kits.every((k) => k.label === 'Blum SPACE CORNER kit' && k.unit === 'pcs' && k.qty === 1));
  assert.ok(kits.every((k) => k.spec.nl_mm === r.panels.find((p) => p.id === 'D1A-SL').box.d));
  // Zero holes of the kit: no drill names a kit, and the corner bodies are placeholders at the inner corner.
  assert.ok(r.drills.every((d) => !/space/i.test(String(d.panel))));
  const bodies = r.assemblies.cornerKits.filter((k) => k.kind === 'space_corner');
  assert.equal(bodies.length, 3);
  const d = r.derived.corner_l.arm;
  for (const b of bodies) {
    assert.ok(b.placeholder === true);
    assert.ok(near(b.box.x + b.box.w, d) && near(b.box.z + b.box.d, d), 'the body stands in the corner square right behind the inner corner');
  }
  assert.equal(r.totals.hinges, 0, 'no hinge on a stack');
  // The registry knows the line; the catalogue file carries the page and the owner's gate.
  assert.equal(HARDWARE_TO_PART_ID.space_corner, 'kit_space_corner');
  assert.ok(PART_REGISTRY.kit_space_corner);
  assert.ok(existsSync(`${ROOT}reference/hardware/blum-space-corner.json`));
  const json = JSON.parse(read('reference/hardware/blum-space-corner.json'));
  assert.equal(json.status, 'owner to confirm');
  assert.match(JSON.stringify(json), /publications\.blum\.com\/2024\/catalogue\/en/);
});

test('F7 · LISP IS LAW: KIT_CORNER_L_DRAWERS.lsp came first, balanced, ASCII, the kit\'s law in its words', () => {
  const lsp = read('reference/lisp/KIT_CORNER_L_DRAWERS.lsp');
  assert.match(lsp, /CORNER_L_DRAWERS/);
  assert.match(lsp, /CL:frontJoint/);
  assert.match(lsp, /SPACE CORNER/);
  assert.match(lsp, /blum-space-corner\.json/);
  assert.equal(/[^\x00-\x7f]/.test(lsp), false, 'pure ASCII: no em or en dash can hide in it');
  // Balance: `test/turn35-lisp-parens.test.js` walks every reference/lisp/*.lsp with the house tokenizer.
  assert.ok(lsp.split('(').length > 100 && lsp.split(')').length > 100, 'a kit, not a stub');
});

test('F7 · the goldens of T75 and T78 hold: the L without a stack is byte for byte what it was', () => {
  const golden = JSON.parse(read('fixtures/golden-corner-l-drawers.json'));
  assert.equal(golden.meta.F, 'F7');
  assert.equal(golden.params.drawers, 3);
  // The L WITHOUT drawers did not move an inch (its golden is held elsewhere; here the shape).
  const plain = L({ doors: true });
  assert.equal(plain.panels.filter((p) => p.part === 'FRONT').length, 2);
  assert.equal(plain.panels.filter((p) => p.role === 'drawer_box').length, 0);
  assert.equal(plain.hardware.filter((h) => h.role === 'space_corner').length, 0);
  assert.equal(plain.derived.corner_l.drawers, 0);
});

test('F7 · the whole road from the store: Add items, drawers 3 on an L becomes the stack; a removed row re-splits', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const l = S().addUnit('CORNER_L_BASE').id;
  assert.ok(l);
  const ok = S().addDrawers(l, 3);
  assert.ok(ok === true || ok?.ok !== false, `addDrawers on an L: ${JSON.stringify(ok)}`);
  const items = (U(l).params.sections?.[0]?.items || []).filter((i) => i.kind === 'drawer');
  assert.equal(items.length, 3, 'three drawer items on the L');
  const r = computeCabinet(U(l).params, P);
  assert.equal(r.derived.corner_l.drawers, 3);
  assert.equal(r.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 6);
  assert.equal(r.panels.filter((p) => p.part === 'FRONT').length, 0);
  S().removeItem(l, items[2].id);
  const r2 = computeCabinet(U(l).params, P);
  assert.equal(r2.derived.corner_l.drawers, 2, 'two rows, re-split');
  assert.equal(r2.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 4);
  // The clearance view hands every front board of an arm to the clearance family, in the arm's own frame.
  const walls = roomWalls(migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }));
  const view = lClearanceView({ entries: [{ unit: U(l), result: r2 }] }, walls, P);
  const panelsOf = (e) => (e.result.panels || []).length;
  const two = (view.entries || []).filter((e) => e.unit.id === l);
  assert.equal(two.length, 2, 'the L is two entries, one per wall');
  assert.deepEqual(two.map(panelsOf), [2, 2], 'both fronts of each arm');
  // The right panel shows the kit's rows, heights read and not typed.
  const rp = read('src/components/RightPanel.jsx');
  assert.match(rp, /const lStack = Boolean\(type\?\.corner\) && drawers\.length > 0;/);
  assert.match(rp, /data-l-row-height=\{num\}/);
  assert.match(rp, /SPACE CORNER · two boxes a row/);
});
