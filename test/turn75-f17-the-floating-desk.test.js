// ─── T75 · F17 · THE FLOATING DESK ─────────────────────────────────────────
//
// CLAUDE.md T75 F17: *"`WARDROBE_DESK`: a wall-hung carcass (WUD's hangers
// and back cut-outs, `mount: 'wall'`), height `wardrobeDesk.defaults.height =
// 160 // T75 proposed`, depth = wardrobe depth, ONE drawer row through the
// BUDR x1 variant (`profile.baseDrawerUnit.variants.x1` exists), prefix `WD`.
// It takes a WORKTOP: `takesWorktop` admits a wall-mounted kit that declares
// `desk: true`, the slab over it with the front overhang; the worktop record
// gets the per-worktop `thickness` the T30 comment deferred (a desk or a
// sideboard top is 25, a kitchen slab 38; the project default stays 38).
// Placed beside a wardrobe at `mount_height = 720 // T75 proposed`, aligned to
// the FRONT of the wardrobe by default (T74 F7's two choices). Retail EXTRAS
// `ADD DESK`."*
//
// verify/t75/p05-probe.md measured why the x1 variant cannot carry the one
// drawer (its ratio is null and the split falls back to 4:3:2: three drawers
// in a 160 box); the oven base's own split key carries it instead.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet, drawerSplitFor } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_TYPE_ORDER, UNIT_NUM_PREFIX, defaultParamsFor, getCategory, isDeskKit, isWardrobeWallUnit,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { WARDROBE_LIBRARY } from '../src/engine/library.js';
import {
  slabThickness, takesWorktop, worktopEligible, worktopSpec, worktopsFor,
} from '../src/engine/worktop.js';
import { migrateDesign } from '../src/engine/design.js';
import { buildBom } from '../src/engine/bom.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { rectCorners } from '../src/engine/room.js';
import { paddedSpan, unitBase, unitTop } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const CARCASS = ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'];

/** A wardrobe job, 4 x 3 m, a 1000 wardrobe 600 deep; the client's automat on. */
function deskJob() {
  setWardrobeEndPanelAuto(true);
  useUiStore.getState().clearSelection?.();
  S().newProject('Desk', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return S().addUnit('WARDROBE', { params: { width: 1000, depth: 600 } }).id;
}

test.after(() => setWardrobeEndPanelAuto(false));

// ═══ 1 · THE TYPE: WUD'S BOX, ONE DRAWER, A TOP ═════════════════════════════

test('F17 · PROBE: WUD field by field; only the face, the family and what files it differ', () => {
  const t = UNIT_TYPES.WARDROBE_DESK;
  const w = UNIT_TYPES.WUD;
  const differ = [...new Set([...Object.keys(t), ...Object.keys(w)])]
    .filter((k) => JSON.stringify(t[k]) !== JSON.stringify(w[k])).sort();
  assert.deepEqual(differ, [
    'besideWardrobe', 'countsDrawerFrontsInPanels', 'defaultsKey', 'desk', 'doorExtend', 'drawerRatioKey',
    'drawerStyle', 'family', 'heightGroup', 'id', 'label', 'supports',
  ]);
  for (const key of ['lisp', 'hingeRule', 'cupRule', 'legs', 'legSource', 'hangers', 'mount', 'carcass']) {
    assert.deepEqual(t[key], w[key], key);
  }
  assert.equal(t.mount, 'wall');
  assert.equal(t.desk, true);
  assert.equal(t.drawerStyle, 'budr');
  assert.equal(t.heightGroup, null);
  assert.equal(t.supports.drawers, true);
  assert.equal(t.supports.doors, false);
  assert.equal(UNIT_NUM_PREFIX.WARDROBE_DESK, 'WD');
  assert.ok(UNIT_TYPE_ORDER.includes('WARDROBE_DESK'));
  assert.ok(isDeskKit('WARDROBE_DESK') && !isDeskKit('WUD'));
  assert.ok(isWardrobeWallUnit('WARDROBE_DESK'), 'the wardrobe wall unit\'s store laws hold it');
  assert.ok(getCategory('wardrobe').types.includes('WARDROBE_DESK'));
  assert.equal(WARDROBE_LIBRARY.find((e) => e.typeId === 'WARDROBE_DESK').kind, 'type');
});

test('F17 · PROBE: the x1 variant stays held open; the ONE drawer is the desk\'s own split', () => {
  const x1 = P.baseDrawerUnit.variants.find((v) => v.id === 'x1');
  assert.equal(x1.ratio, null);
  assert.equal(x1.enabled, false);
  assert.deepEqual(drawerSplitFor(UNIT_TYPES.WARDROBE_DESK, P), { ratio: [1], exact: true });
  assert.deepEqual(P.wardrobeDesk.drawerRatio, [1]);
});

test('F17 · the defaults: 160 high, hung at 720, a 25 top, the wardrobe\'s 568; proposed; migrated key by key', () => {
  assert.deepEqual(P.wardrobeDesk.defaults, {
    width: 1000, height: 160, depth: 568, mountHeight: 720, topThickness: 25,
  });
  const src = read('src/engine/profile.js');
  const at = src.indexOf('  wardrobeDesk: {');
  assert.ok(at > 0);
  assert.match(src.slice(at, at + 220), /T75 proposed, owner to confirm/);
  const { wardrobeDesk: _gone, ...old } = JSON.parse(JSON.stringify(P));
  assert.deepEqual(migrateCabinetProfile(old).wardrobeDesk, P.wardrobeDesk);
  const mine = migrateCabinetProfile({ ...old, wardrobeDesk: { defaults: { mountHeight: 700 } } });
  assert.equal(mine.wardrobeDesk.defaults.mountHeight, 700);
  assert.equal(mine.wardrobeDesk.defaults.topThickness, 25);
  assert.deepEqual(mine.wardrobeDesk.drawerRatio, [1]);
  const p = defaultParamsFor('WARDROBE_DESK', P);
  assert.equal(p.mount_height, 720);
  assert.equal(p.door_extend, undefined, 'a desk carries no door field');
});

// ═══ 2 · CONSTRUCTION: WUD'S CARCASS, HOLE FOR HOLE, AND ONE DRAWER ═════════

test('F17 · WUD\'s carcass hole for hole (hangers, back cut-outs, joints); one drawer where WUD hangs doors', () => {
  for (const size of [{}, { width: 600, height: 200, depth: 400 }]) {
    const p = { ...defaultParamsFor('WARDROBE_DESK', P), ...size, unit_num: '01' };
    const r = computeCabinet(p, P);
    const q = computeCabinet({
      ...defaultParamsFor('WUD', P), width: p.width, height: p.height, depth: p.depth, mount_height: p.mount_height, unit_num: '01',
    }, P);
    const boards = (res) => res.panels.filter((x) => CARCASS.includes(x.id)).map(({ id, box, cnc }) => ({ id, box, cnc }));
    assert.deepEqual(boards(r), boards(q), 'the boards (and the back\'s cut-outs) are not WUD\'s');
    // Every carcass hole WUD drills that is not a hinge plate, and nothing else
    // but the runner rows the drawer needs.
    const holes = (res, drop) => res.drills.filter((d) => CARCASS.includes(d.panel) && d.kind !== drop);
    assert.deepEqual(holes(r, 'runner'), holes(q, 'hinge'));
    assert.equal(r.drills.filter((d) => d.kind === 'hanger').length, 4, 'two hangers, two holes each');
    assert.equal(r.drills.filter((d) => d.kind === 'hinge').length, 0, 'a desk has no door to hinge');
    assert.ok(r.drills.some((d) => d.kind === 'runner'));
    assert.equal(r.hardware.find((h) => h.role === 'hangers').qty, 2);
    assert.equal(r.hardware.find((h) => h.role === 'runner_pairs').qty, 1);
    assert.equal(r.panels.filter((x) => x.role === 'front').length, 1, 'ONE drawer row');
    assert.ok(!r.hardware.some((h) => h.role === 'legs'), 'no legs: it hangs');
  }
  // At 160 the box is capped and a shaker frame is wider than the front: the
  // engine's own warnings, said, never hidden. At 200 neither.
  const at160 = computeCabinet(defaultParamsFor('WARDROBE_DESK', P), P).warnings.map((w) => w.code);
  assert.deepEqual(at160, ['DRAWER_BOX_CAPPED', 'SHAKER_FRAME_TOO_WIDE']);
  assert.deepEqual(computeCabinet({ ...defaultParamsFor('WARDROBE_DESK', P), height: 200 }, P).warnings, []);
});

// ═══ 3 · THE STORE: BESIDE A WARDROBE, AT 720, FRONT ON ITS LINE, ITS TOP ════

test('F17 · placed beside a wardrobe: hung at 720 (its underside), the wardrobe\'s depth, FRONT on its line, WD01', () => {
  const w = deskJob();
  const res = S().addUnit('WARDROBE_DESK', { near: w, side: 'right' });
  assert.ok(res.id, res.error);
  const d = U(res.id);
  assert.equal(d.params.unit_num, 'WD01');
  assert.equal(d.params.mount_height, 720, 'PROBE: 2090, levelled with the wardrobe\'s top');
  assert.equal(unitBase(d, P), 720, '720 is the underside');
  assert.equal(unitTop(d, P), 880);
  assert.equal(d.params.depth, 600, 'the wardrobe\'s depth');
  assert.equal(d.params.depth_align, 'front', 'FRONT by default');
  const gap = (u) => u.params.wall_gap ?? P.room.wallBackClearance;
  assert.equal(gap(d) + d.params.depth, gap(U(w)) + U(w).params.depth, 'the fronts are not on one line');
  assert.ok(d.position.x_mm >= U(w).position.x_mm + U(w).params.width, 'the desk hangs over the wardrobe');
  // A new depth keeps the front where it was asked to be (T74 F7's FRONT).
  S().updateUnitParams(res.id, { depth: 500 });
  assert.equal(gap(U(res.id)) + 500, gap(U(w)) + U(w).params.depth);
  // The project's wall-unit line never moves it (the kitchen's 1500).
  S().setDesign({ heights: { ...(S().project.design.heights || {}), wallMount: 1400 } });
  assert.equal(U(res.id).params.mount_height, 720);
  // With no wardrobe on the wall it still hangs at 720.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const alone = S().addUnit('WARDROBE_DESK');
  assert.equal(U(alone.id).params.mount_height, 720);
});

test('F17 · it takes a WORKTOP: one desk is enough, its record 25 thick, the slab over it with the front overhang', () => {
  assert.equal(takesWorktop('WARDROBE_DESK'), true);
  assert.equal(takesWorktop('WUD'), false, 'a wall unit still takes none');
  assert.equal(takesWorktop('BUD'), true);
  const w = deskJob();
  const id = S().addUnit('WARDROBE_DESK', { near: w, side: 'right' }).id;
  assert.equal(worktopEligible([U(id)], P).ok, true);
  const records = migrateDesign(S().project.design).worktops;
  assert.equal(records.length, 1, 'the desk arrived without its top');
  assert.deepEqual([records[0].unitIds, records[0].kind, records[0].thickness], [[id], 'desk', 25]);
  const [slab] = S().worktopsOf();
  const g = slab.geometry;
  const d = U(id);
  assert.equal(g.thickness, 25);
  assert.equal(g.h, 25);
  assert.equal(g.y, 880, 'on the carcass');
  assert.equal(g.y + g.h, 905, 'the writing surface');
  assert.equal(g.d, d.params.depth + P.doors.gap + d.params.front_t + worktopSpec(P).frontOverhang, 'the front overhang');
  // It BUTTS the wardrobe's end panel on the left; the free end keeps its 10.
  const pad = paddedSpan(d);
  assert.equal(g.x, pad.left, 'the top runs into the wardrobe\'s panel');
  assert.equal(g.x + g.w, pad.right + worktopSpec(P).sideOverhang);
  const wp = paddedSpan(U(w));
  assert.ok(g.x >= wp.right, 'the top overlaps the wardrobe');
});

test('F17 · the per-worktop thickness: the record\'s own, else the project\'s 38; old records unchanged', () => {
  const spec = worktopSpec(P);
  assert.equal(spec.thickness, 38, 'the project default stays 38');
  assert.equal(slabThickness({ thickness: 25 }, spec), 25);
  assert.equal(slabThickness({}, spec), 38);
  assert.equal(slabThickness({ thickness: -4 }, spec), 38);
  // migrateDesign keeps a positive thickness and a desk's lone record; it adds
  // nothing to a record written before tonight.
  const m = migrateDesign({
    worktops: [
      { id: 'a', unitIds: ['x', 'y'] },
      { id: 'b', unitIds: ['d'], kind: 'desk', thickness: 25 },
      { id: 'c', unitIds: ['z'] },
      { id: 'e', unitIds: ['p', 'q'], thickness: 'thick' },
    ],
  }).worktops;
  assert.deepEqual(m.map((r) => r.id), ['a', 'b', 'e'], 'a one-unit record that is no desk or L is still dropped');
  assert.equal('thickness' in m[0], false);
  assert.equal(m[1].thickness, 25);
  assert.equal('thickness' in m[2], false);
  // A kitchen run keeps its 38; a caller may name another (F20's sideboard).
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const a = S().addUnit('BUD').id;
  const b = S().addUnit('BUD', { near: a, side: 'right' }).id;
  assert.ok(S().addWorktop([a, b]).ok);
  assert.equal(S().worktopsOf()[0].geometry.thickness, 38);
  assert.ok(S().addWorktop([a, b], { thickness: 25 }).ok);
  assert.equal(S().worktopsOf()[0].geometry.thickness, 25);
  // A desk record resolved with no other unit around keeps both overhangs.
  const desk = { id: 'd', type: 'WARDROBE_DESK', params: { ...defaultParamsFor('WARDROBE_DESK', P) }, position: { wall: 0, x_mm: 500 } };
  const [free] = worktopsFor({ records: [{ id: 't', unitIds: ['d'], kind: 'desk', thickness: 25 }], units: [desk], profile: P });
  assert.equal(free.geometry.w, 1000 + 2 * worktopSpec(P).sideOverhang);
});

test('F17 · a hanging kit is not offered in a desk; the store refuses it', () => {
  const w = deskJob();
  const id = S().addUnit('WARDROBE_DESK', { near: w, side: 'right' }).id;
  for (const kind of ['trouser', 'tie_rack', 'pulldown_rail']) assert.equal(S().addWardrobeKit(id, kind), null);
});

// ═══ 4 · RETAIL: ADD DESK ═══════════════════════════════════════════════════

test('F17 · retail: ADD DESK beside ADD CHEST OF DRAWERS, through `adapter.addDesk`; with no wardrobe it says so', () => {
  const opt = read('src/retail/design/Options.jsx');
  const chest = opt.indexOf('data-testid="extras-add-chest"');
  const desk = opt.indexOf('data-testid="extras-add-desk"');
  assert.ok(chest > 0 && desk > chest && desk - chest < 1500);
  assert.match(opt, />\s*ADD DESK\s*</);
  assert.match(opt, /onClick=\{\(\) => setSaid\(A\.addDesk\(\)\.said\)\}/);
  setWardrobeEndPanelAuto(true);
  S().newProject('Desk', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  assert.deepEqual(A.addDesk(), { id: null, said: REASONS.deskNeedsAWardrobe });
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  useUiStore.getState().selectUnit(w);
  const res = A.addDesk();
  assert.ok(res.id, res.said);
  assert.equal(res.said, '');
  assert.equal(U(res.id).type, 'WARDROBE_DESK');
  assert.equal(U(res.id).params.mount_height, 720);
  assert.equal(S().worktopsOf().length, 1, 'the desk came without its top');
  useUiStore.getState().clearSelection();
});

// ═══ 5 · THE REST OF THE ROAD ════════════════════════════════════════════════

test('F17 · the whole road: the BOM lists its runner and its 25 top, the T71 set draws it, a save and reload keeps both', () => {
  const w = deskJob();
  const id = S().addUnit('WARDROBE_DESK', { near: w, side: 'right' }).id;
  const entries = S().units.map((u) => ({ unit: u, result: S().unitResult(u.id) }));
  const bom = buildBom(entries, { design: S().project.design, profile: P, room: S().project.room });
  assert.deepEqual(bom.hardware.find((h) => h.role === 'runner_pairs').units, ['WD01']);
  const slabRows = bom.units.flatMap((u) => u.rows).filter((r) => r.role === 'worktop');
  assert.equal(slabRows.length, 1);
  assert.match(slabRows[0].material_label, /Worktop 25 mm/);
  const sheets = wallDrawingSheets({ entries, project: S().project, room: S().project.room, profile: P, date: '09.10.2026', design: S().project.design });
  const texts = sheets.flatMap((s) => (s.sheet?.entities || []).filter((e) => e.kind === 'text').map((e) => String(e.text)));
  assert.ok(texts.some((t) => t.includes('WD01')), 'the desk is not on the drawings');
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(U(id).params.mount_height, 720);
  assert.equal(S().worktopsOf()[0].geometry.thickness, 25, 'the top lost its 25 on reload');
});

test('F17 · golden-wardrobe-desk.json, byte for byte', () => {
  const g = JSON.parse(read('fixtures/golden-wardrobe-desk.json'));
  assert.equal(g.params.type, 'WARDROBE_DESK');
  assert.deepEqual(goldenOf(g.params, P), g.expected);
});
