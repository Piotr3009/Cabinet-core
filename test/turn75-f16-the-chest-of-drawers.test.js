// ─── T75 · F16 · THE CHEST OF DRAWERS BETWEEN WARDROBES ────────────────────
//
// CLAUDE.md T75 F16: *"`WARDROBE_CHEST2 / 3 / 4` copied from `BUDR2 / BUDR /
// BUDR4`, family wardrobe, wardrobe depth and the wardrobe's leg source,
// prefix `WC`, defaults block `wardrobeChest.defaults` (width 800, height =
// the wardrobe's base-of-drawers law, `// T75 proposed`). Hole for hole
// against the BUDR of the same numbers. Wardrobes category and retail EXTRAS
// `ADD CHEST OF DRAWERS` (x3 default; the count by the existing variants
// control)."*
//
// The PROBE (verify/t75/p05-probe.md) rows are asserted below, and so are the
// four hazards it named: a top box rode a chest, a wardrobe added beside a
// chest kept a bare side, retail took a chest for "the wardrobe", and Add items
// offered a wardrobe's hanging kits inside it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_TYPE_ORDER, UNIT_NUM_PREFIX, defaultParamsFor, getCategory, isBesideWardrobe,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { resolveEntry, WARDROBE_LIBRARY } from '../src/engine/library.js';
import { hostsRidersOf } from '../src/engine/topBox.js';
import { autoEndPanelJunctions, setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { buildBom } from '../src/engine/bom.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';
import { unitTop } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const eps = (id) => (U(id).params.end_panels || []).map((p) => p.side).sort();
const CHESTS = [['WARDROBE_CHEST2', 'BUDR2', 2], ['WARDROBE_CHEST3', 'BUDR', 3], ['WARDROBE_CHEST4', 'BUDR4', 4]];
const cut = (r) => ({
  panels: r.panels.map(({ id, box, cnc, w, h, role }) => ({ id, box, cnc, w, h, role })),
  drills: r.drills,
  hardware: r.hardware,
});

/** A wardrobe job on a 4 x 3 m room, the client's automat on (retail's own switch). */
function wardrobeJob() {
  setWardrobeEndPanelAuto(true);
  useUiStore.getState().clearSelection?.();
  S().newProject('Chest', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

test.after(() => setWardrobeEndPanelAuto(false));

// ═══ 1 · THE TYPE: ITS BUDR, FIELD BY FIELD ═════════════════════════════════

test('F16 · PROBE: three types, each its BUDR to the letter; only what files it differs', () => {
  for (const [id, parent] of CHESTS) {
    const t = UNIT_TYPES[id];
    const p = UNIT_TYPES[parent];
    assert.ok(t, `${id} missing`);
    const differ = [...new Set([...Object.keys(t), ...Object.keys(p)])]
      .filter((k) => JSON.stringify(t[k]) !== JSON.stringify(p[k])).sort();
    // The probe's hook list, and nothing else: the same LISP, variant, hinge
    // and cup rules, legs, carcass, drawer style and supports.
    assert.deepEqual(differ, ['besideWardrobe', 'defaultsKey', 'family', 'heightGroup', 'id', 'label', 'legSource']);
    assert.equal(t.family, 'wardrobe');
    assert.equal(t.legSource, 'wardrobe', 'the wardrobe\'s leg source');
    assert.equal(t.heightGroup, null, 'its height is its own: the kitchen\'s 770 would replace it');
    assert.equal(t.defaultsKey, 'wardrobeChest.defaults');
    assert.equal(t.besideWardrobe, true);
    assert.equal(UNIT_NUM_PREFIX[id], 'WC');
    assert.ok(UNIT_TYPE_ORDER.includes(id));
    assert.ok(isBesideWardrobe(id));
    assert.doesNotMatch(t.label, /[\u2013\u2014]/, 'no dash in a new label');
  }
  assert.ok(!isBesideWardrobe('WARDROBE') && !isBesideWardrobe('BUDR'));
});

test('F16 · the defaults: 800 wide, 647 high, the wardrobe\'s 568 deep, marked proposed, migrated key by key', () => {
  assert.deepEqual(P.wardrobeChest.defaults, { width: 800, height: 647, depth: 568 });
  assert.equal(P.wardrobeChest.defaults.depth, P.wardrobe.defaults.depth);
  const src = read('src/engine/profile.js');
  const at = src.indexOf('  wardrobeChest: {');
  assert.ok(at > 0);
  assert.match(src.slice(at, at + 200), /T75 proposed, owner to confirm/);
  // A stored profile written before tonight gets the block; one that names a
  // single key keeps it and gets the rest.
  const { wardrobeChest: _gone, ...old } = JSON.parse(JSON.stringify(P));
  assert.deepEqual(migrateCabinetProfile(old).wardrobeChest.defaults, P.wardrobeChest.defaults);
  const mine = migrateCabinetProfile({ ...old, wardrobeChest: { defaults: { width: 900 } } });
  assert.deepEqual(mine.wardrobeChest.defaults, { width: 900, height: 647, depth: 568 });
});

test('F16 · 647 IS the wardrobe\'s base-of-drawers law: the top of the partition over three inner drawers', () => {
  // The probe found no law by that name, and the nearest is the wardrobe's own
  // drawer zone. Re-derived from a real wardrobe, so the two cannot drift.
  const w = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    sections: [{ items: [{ kind: 'drawer' }, { kind: 'drawer' }, { kind: 'drawer' }] }],
  }, P);
  const part = w.panels.find((x) => x.id === 'PARTITION');
  assert.ok(part, 'the wardrobe cut no partition over its drawers');
  assert.equal(part.box.y, 629, 'G + 3 x 200 + 2 x 3 + 5');
  assert.equal(part.box.y + part.box.h, P.wardrobeChest.defaults.height);
  // …and the chest stands on the wardrobe's legs, so its top is level with it.
  assert.equal(P.wardrobe.legHeight, P.baseUnit.legHeight, 'the leg source moves no byte today');
});

// ═══ 2 · CONSTRUCTION: HOLE FOR HOLE ════════════════════════════════════════

test('F16 · hole for hole: each chest cuts its BUDR\'s boards, holes and hardware at the same numbers', () => {
  for (const [id, parent, fronts] of CHESTS) {
    for (const size of [{}, { width: 600, height: 770, depth: 558 }, { width: 1000, height: 900, depth: 600 }]) {
      const p = { ...defaultParamsFor(id, P), ...size, unit_num: '01' };
      const r = computeCabinet(p, P);
      const q = computeCabinet({ ...defaultParamsFor(parent, P), width: p.width, height: p.height, depth: p.depth, unit_num: '01' }, P);
      assert.deepEqual(cut(r), cut(q), `${id} is not ${parent} at ${p.width} x ${p.height} x ${p.depth}`);
      assert.equal(r.panels.filter((x) => x.role === 'front').length, fronts);
      assert.ok(r.drills.length > 0, 'a chest with no holes is not the BUDR');
    }
  }
  // At its own default the x2 and x4 stacks are exact; the x3 is KIT_BUDR's
  // own 4:3:2 rounding (BLOCKERS #64, frozen, the owner's open decision): at
  // 647 it stands 1 mm over, exactly as a BUDR at 647 does.
  const x3 = computeCabinet(defaultParamsFor('WARDROBE_CHEST3', P), P);
  const budr = computeCabinet({ ...defaultParamsFor('BUDR', P), height: 647, width: 800, depth: 568 }, P);
  assert.deepEqual(x3.warnings.map((w) => w.code), budr.warnings.map((w) => w.code));
  for (const id of ['WARDROBE_CHEST2', 'WARDROBE_CHEST4']) {
    const r = computeCabinet(defaultParamsFor(id, P), P);
    assert.ok(!r.warnings.some((w) => /DRAWER_FRONTS/.test(w.code)), `${id} does not fill its face`);
  }
});

// ═══ 3 · THE LIBRARY: THE WARDROBES CATEGORY, THE COUNT BY THE VARIANTS ════

test('F16 · library: the Wardrobes category, the chest\'s three counts one flyout of the drawer unit\'s variants', () => {
  const cat = getCategory('wardrobe');
  assert.equal(cat.entries, WARDROBE_LIBRARY);
  assert.deepEqual(cat.types.slice(-3), ['WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4']);
  const group = WARDROBE_LIBRARY.find((e) => e.id === 'chest-of-drawers');
  assert.equal(group.kind, 'group');
  assert.equal(group.label, 'Chest of drawers');
  assert.equal(group.variantsOf, 'baseDrawerUnit', 'the existing variants control');
  const rows = group.items.map((e) => [e.typeId, resolveEntry(e, P)]);
  assert.deepEqual(rows.map(([id, r]) => [id, r.enabled, r.count]), [
    ['WARDROBE_CHEST2', true, 2], ['WARDROBE_CHEST3', true, 3], ['WARDROBE_CHEST4', true, 4],
  ]);
  // The kits the flat list held keep their row id (the type id).
  assert.deepEqual(WARDROBE_LIBRARY.slice(0, 4).map((e) => e.id), ['WARDROBE', 'WARDROBE_TOP', 'WARDROBE_WALL', 'BLIND_WARDROBE']);
});

// ═══ 4 · THE STORE: BORN BESIDE A WARDROBE, AND THE LAWS AROUND IT ══════════

test('F16 · placed beside a wardrobe: 647 high, THAT wardrobe\'s depth and gap, its legs, WC01, beside and never on', () => {
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000, depth: 600 } }).id;
  S().updateUnitParams(w, { wall_gap: 30 });
  const res = S().addUnit('WARDROBE_CHEST3', { near: w, side: 'right' });
  assert.ok(res.id, res.error);
  const c = U(res.id);
  assert.equal(c.params.height, 647, 'the block\'s height, not a project group\'s');
  assert.equal(c.params.depth, 600, 'the wardrobe\'s depth');
  assert.equal(c.params.wall_gap, 30, 'the wardrobe\'s gap: backs and fronts on one line');
  assert.equal(c.params.leg_height, 100);
  assert.equal(c.params.unit_num, 'WC01');
  const wd = U(w);
  assert.ok(c.position.x_mm >= wd.position.x_mm + wd.params.width, 'the chest landed on the wardrobe');
  assert.equal(S().runChecks().filter((f) => /overlap/i.test(f.message || '')).length, 0);
  // In a kitchen job, with no wardrobe beside it, it takes the job's depth.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const alone = S().addUnit('WARDROBE_CHEST2');
  assert.equal(U(alone.id).params.depth, P.baseUnit.defaults.depth);
  assert.equal(U(alone.id).params.height, 647);
});

test('F16 · a wardrobe beside a chest takes the board between them: no carcass side is left showing', () => {
  wardrobeJob();
  const w1 = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const c = S().addUnit('WARDROBE_CHEST3', { near: w1, side: 'right' }).id;
  // The chest is lower: the wardrobe keeps its board above it, the chest stands beside it.
  assert.deepEqual(eps(w1), ['L', 'R']);
  assert.deepEqual(eps(c), ['R'], 'the chest\'s free end has its panel');
  // PROBE: W02 added right of the chest landed flush with its left side bare
  // above the chest (a pending junction, no panel). Now it takes the board.
  const w2 = S().addUnit('WARDROBE', { near: c, side: 'right' }).id;
  assert.deepEqual(eps(c), [], 'the chest kept a board the wardrobe now carries');
  assert.deepEqual(eps(w2), ['L'], 'the wardrobe\'s side over the chest is bare');
  const leftOfW2 = U(w2).position.x_mm - (U(c).position.x_mm + U(c).params.width);
  assert.equal(leftOfW2, U(w2).params.end_panels[0].thickness, 'the board stands in the room the chest\'s stood in');
  assert.deepEqual(autoEndPanelJunctions(S().units, P, { room: S().project.room }), [], 'a junction is left open');
  // A settle changes nothing: the layout is at rest.
  S().settleLayout(c);
  assert.deepEqual([eps(w1), eps(c), eps(w2)], [['L', 'R'], [], ['L']]);
  // T72 F5 is untouched where two wardrobes cover each other: the panel goes first.
  wardrobeJob();
  const a = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const b = S().addUnit('WARDROBE', { near: a, side: 'right' }).id;
  assert.deepEqual(eps(a), ['L']);
  assert.equal(U(b).position.x_mm, U(a).position.x_mm + U(a).params.width, 'the second wardrobe did not land flush');
});

test('F16 · no top box rides a chest (PROBE: one did)', () => {
  assert.equal(hostsRidersOf(UNIT_TYPES.WARDROBE_CHEST3, 'wardrobe'), false);
  assert.equal(hostsRidersOf(UNIT_TYPES.WARDROBE, 'wardrobe'), true);
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const c = S().addUnit('WARDROBE_CHEST3', { near: w, side: 'right' }).id;
  const box = S().addUnit('WARDROBE_TOP', { near: c });
  assert.ok(box.id, box.error);
  assert.equal(U(box.id).params.rides_on, w, 'the top box stands on the chest');
});

test('F16 · Add items: no shoe box in a stack that IS its drawers, no hanging kit beside a wardrobe; the store agrees', () => {
  const pro = read('src/components/AddItems.jsx');
  assert.match(pro, /id: 'shoe_box',[\s\S]*?disabled: !type\.supports\.drawers \|\| type\.family !== 'wardrobe' \|\| ratioDrawers,/);
  for (const kind of ['trouser', 'tie_rack']) {
    assert.match(pro, new RegExp(`id: '${kind}',[\\s\\S]*?disabled: type\\.family !== 'wardrobe' \\|\\| Boolean\\(type\\.besideWardrobe\\),`));
  }
  // 1:1 = COPY: the retail copy was re-made by the machine, not by hand.
  assert.match(read('src/retail/design/detail/AddItems.jsx'), /Boolean\(type\.besideWardrobe\)/);
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const c = S().addUnit('WARDROBE_CHEST3', { near: w, side: 'right' }).id;
  for (const kind of ['trouser', 'tie_rack', 'pulldown_rail']) {
    assert.equal(S().addWardrobeKit(c, kind), null, `a ${kind} went into a chest`);
  }
  assert.equal(S().addShoeDrawer(c), null);
  assert.ok(S().addWardrobeKit(w, 'trouser'), 'the wardrobe lost its trouser pull-out');
});

// ═══ 5 · RETAIL: ADD CHEST OF DRAWERS ═══════════════════════════════════════

test('F16 · retail: ADD CHEST OF DRAWERS after ADD WALL UNIT, through `adapter.addChestOfDrawers`', () => {
  const opt = read('src/retail/design/Options.jsx');
  const wall = opt.indexOf('data-testid="extras-add-wall-unit"');
  const chest = opt.indexOf('data-testid="extras-add-chest"');
  assert.ok(wall > 0 && chest > wall && chest - wall < 1500, 'the button is not beside ADD WALL UNIT');
  assert.match(opt, />\s*ADD CHEST OF DRAWERS\s*</);
  assert.match(opt, /onClick=\{\(\) => setSaid\(A\.addChestOfDrawers\(\)\.said\)\}/);
  assert.match(read('src/retail/design/adapter.js'), /addBesideWardrobe\('WARDROBE_CHEST3', REASONS\.chestNeedsAWardrobe\)/);
});

test('F16 · retail: the button puts a chest of three beside the SELECTED wardrobe; with none it says so', () => {
  wardrobeJob();
  assert.deepEqual(A.addChestOfDrawers(), { id: null, said: REASONS.chestNeedsAWardrobe });
  const w1 = S().addUnit('WARDROBE', { params: { width: 600 } }).id;
  S().moveUnit(w1, 0, 1);
  const w2 = S().addUnit('WARDROBE', { near: w1, side: 'right', params: { width: 600, depth: 620 } }).id;
  useUiStore.getState().selectUnit(w2);
  const res = A.addChestOfDrawers();
  assert.ok(res.id, res.said);
  assert.equal(res.said, '');
  const c = U(res.id);
  assert.equal(c.type, 'WARDROBE_CHEST3', 'x3 is the default');
  assert.ok(c.position.x_mm > U(w2).position.x_mm, 'not on the right of the selected wardrobe');
  assert.equal(c.params.depth, 620, 'not born at the selected wardrobe\'s depth');
  // The columns are never about the chest unless it is the one selected.
  useUiStore.getState().clearSelection();
  assert.notEqual(A.designUnit(S().units)?.id, res.id);
  // A wall full on both sides refuses in the room's own sentence.
  wardrobeJob();
  const big = S().addUnit('WARDROBE', { params: { width: 3900 } }).id;
  useUiStore.getState().selectUnit(big);
  const full = A.addChestOfDrawers();
  assert.equal(full.id, null);
  assert.ok(full.said.length > 0, 'refused without a word');
  useUiStore.getState().clearSelection();
});

// ═══ 6 · THE REST OF THE ROAD: BOM, DRAWINGS, SAVE AND RELOAD, THE GOLDEN ═══

test('F16 · the whole road: the BOM orders its runners, the T71 set draws it, a save and reload keeps it', () => {
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const c = S().addUnit('WARDROBE_CHEST4', { near: w, side: 'right' }).id;
  const entries = S().units.map((u) => ({ unit: u, result: S().unitResult(u.id) }));
  const bom = buildBom(entries, { design: S().project.design, profile: P, room: S().project.room });
  const runners = bom.hardware.find((h) => h.role === 'runner_pairs');
  assert.equal(runners.qty, 4);
  assert.deepEqual(runners.units, ['WC01']);
  assert.ok(bom.units.find((u) => u.unitNum === 'WC01').rows.length > 0, 'the chest is not in the cut list');
  const sheets = wallDrawingSheets({ entries, project: S().project, room: S().project.room, profile: P, date: '09.10.2026', design: S().project.design });
  assert.ok(sheets.length > 0, 'the set refused the job');
  const texts = sheets.flatMap((s) => (s.sheet?.entities || []).filter((e) => e.kind === 'text').map((e) => String(e.text)));
  assert.ok(texts.some((t) => t.includes('WC01')), 'the chest is not on the drawings');
  // Save and reload: the same unit, the same cut.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  const before = JSON.stringify(cut(S().unitResult(c)));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(U(c).type, 'WARDROBE_CHEST4');
  assert.equal(JSON.stringify(cut(S().unitResult(c))), before);
  assert.equal(unitTop(U(c), P), 100 + 647);
});

test('F16 · golden-wardrobe-chest.json, the x3 default, byte for byte', () => {
  const g = JSON.parse(read('fixtures/golden-wardrobe-chest.json'));
  assert.equal(g.params.type, 'WARDROBE_CHEST3');
  assert.deepEqual(goldenOf(g.params, P), g.expected);
});
