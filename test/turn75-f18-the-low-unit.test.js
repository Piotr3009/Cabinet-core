// ─── T75 · F18 · THE LOW UNITS OF A WARDROBE JOB ───────────────────────────
//
// CLAUDE.md T75 F18: *"`WARDROBE_LOW` copied from `LOW_CABINET`, family
// wardrobe, prefix `WL`, wardrobe depth, its own low height
// (`wardrobeLow.defaults`, 500, `// T75 proposed`). Hole for hole against
// LOW_CABINET. Retail EXTRAS `ADD LOW UNIT`."*
//
// verify/t75/p05-probe.md: the same hazards as the chest (top-box host,
// retail's "the wardrobe", the T72 F5 bare side, hanging kits above a 500
// carcass). Each is asserted closed for the low unit below.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  UNIT_TYPES, UNIT_TYPE_ORDER, UNIT_NUM_PREFIX, defaultParamsFor, getCategory, isBesideWardrobe,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { hostsRidersOf } from '../src/engine/topBox.js';
import { autoEndPanelJunctions, setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { buildBom } from '../src/engine/bom.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { rectCorners } from '../src/engine/room.js';
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
const cut = (r) => ({
  panels: r.panels.map(({ id, box, cnc, w, h, role }) => ({ id, box, cnc, w, h, role })),
  drills: r.drills,
  hardware: r.hardware,
});

function wardrobeJob() {
  setWardrobeEndPanelAuto(true);
  useUiStore.getState().clearSelection?.();
  S().newProject('Low', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}

test.after(() => setWardrobeEndPanelAuto(false));

test('F18 · PROBE: LOW_CABINET to the letter; only what files it differs', () => {
  const t = UNIT_TYPES.WARDROBE_LOW;
  const p = UNIT_TYPES.LOW_CABINET;
  const differ = [...new Set([...Object.keys(t), ...Object.keys(p)])]
    .filter((k) => JSON.stringify(t[k]) !== JSON.stringify(p[k])).sort();
  assert.deepEqual(differ, ['besideWardrobe', 'defaultsKey', 'family', 'id', 'label', 'legSource']);
  assert.equal(t.family, 'wardrobe');
  assert.equal(t.heightGroup, null, 'its own low height, as the low cabinet\'s');
  assert.equal(t.minHeightKey, 'lowCabinet.minHeight');
  assert.equal(UNIT_NUM_PREFIX.WARDROBE_LOW, 'WL');
  assert.ok(UNIT_TYPE_ORDER.includes('WARDROBE_LOW'));
  assert.ok(isBesideWardrobe('WARDROBE_LOW'));
  assert.ok(getCategory('wardrobe').types.includes('WARDROBE_LOW'));
  assert.equal(t.label, 'Low unit');
});

test('F18 · the defaults: 500 high at the wardrobe\'s 568, LOW_CABINET\'s width and rail; proposed; migrated', () => {
  assert.deepEqual(P.wardrobeLow.defaults, { width: 600, height: 500, depth: 568, railOffset: 200 });
  assert.equal(P.wardrobeLow.defaults.depth, P.wardrobe.defaults.depth);
  assert.equal(P.wardrobeLow.defaults.width, P.lowCabinet.defaults.width);
  assert.equal(P.wardrobeLow.defaults.railOffset, P.lowCabinet.defaults.railOffset);
  const src = read('src/engine/profile.js');
  const at = src.indexOf('  wardrobeLow: {');
  assert.match(src.slice(at, at + 200), /T75 proposed, owner to confirm/);
  const { wardrobeLow: _gone, ...old } = JSON.parse(JSON.stringify(P));
  assert.deepEqual(migrateCabinetProfile(old).wardrobeLow, P.wardrobeLow);
  assert.equal(migrateCabinetProfile({ ...old, wardrobeLow: { defaults: { height: 450 } } }).wardrobeLow.defaults.depth, 568);
});

test('F18 · hole for hole against LOW_CABINET at the same numbers, with and without its door and rail', () => {
  for (const extra of [{}, { doors: true }, { doors: true, rail: true }, { width: 800, height: 420, depth: 600, doors: true }]) {
    const p = { ...defaultParamsFor('WARDROBE_LOW', P), ...extra, unit_num: '01' };
    const r = computeCabinet(p, P);
    const q = computeCabinet({
      ...defaultParamsFor('LOW_CABINET', P), width: p.width, height: p.height, depth: p.depth, ...extra, unit_num: '01',
    }, P);
    assert.deepEqual(cut(r), cut(q), `not LOW_CABINET at ${JSON.stringify(extra)}`);
    assert.deepEqual(r.warnings, q.warnings);
  }
  const r = computeCabinet(defaultParamsFor('WARDROBE_LOW', P), P);
  assert.equal(r.panels.filter((x) => x.role === 'front').length, 1, 'one leaf at 600');
  assert.ok(r.drills.some((d) => d.kind === 'hinge'));
  assert.deepEqual(r.warnings, []);
});

test('F18 · placed beside a wardrobe: 500 high, that wardrobe\'s depth, WL01; the wardrobe\'s board stays above it', () => {
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000, depth: 600 } }).id;
  const res = S().addUnit('WARDROBE_LOW', { near: w, side: 'right' });
  assert.ok(res.id, res.error);
  const l = U(res.id);
  assert.equal(l.params.unit_num, 'WL01');
  assert.equal(l.params.height, 500);
  assert.equal(l.params.depth, 600, 'the wardrobe\'s depth');
  assert.equal(l.params.leg_height, 100);
  assert.deepEqual(eps(w), ['L', 'R'], 'the wardrobe\'s side above the low unit went bare');
  // A wardrobe added beyond it takes the board between them (the F16 law).
  const w2 = S().addUnit('WARDROBE', { near: res.id, side: 'right', params: { width: 600, depth: 600 } }).id;
  assert.deepEqual(eps(res.id), []);
  assert.ok(eps(w2).includes('L'), 'the wardrobe\'s side over the low unit is bare');
  assert.deepEqual(autoEndPanelJunctions(S().units, P, { room: S().project.room }), []);
  assert.equal(S().runChecks().filter((f) => /overlap/i.test(f.message || '')).length, 0);
});

test('F18 · no top box rides it, no hanging kit goes in it; its own rail still does', () => {
  assert.equal(hostsRidersOf(UNIT_TYPES.WARDROBE_LOW, 'wardrobe'), false);
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const l = S().addUnit('WARDROBE_LOW', { near: w, side: 'right' }).id;
  const box = S().addUnit('WARDROBE_TOP', { near: l });
  assert.equal(U(box.id).params.rides_on, w);
  for (const kind of ['trouser', 'tie_rack']) assert.equal(S().addWardrobeKit(l, kind), null);
  assert.ok(S().addHangerRail(l, {}), 'LOW_CABINET\'s own rail is refused');
});

test('F18 · retail: ADD LOW UNIT after ADD DESK; beside the selected wardrobe, door on; with none it says so', () => {
  const opt = read('src/retail/design/Options.jsx');
  const desk = opt.indexOf('data-testid="extras-add-desk"');
  const low = opt.indexOf('data-testid="extras-add-low-unit"');
  assert.ok(desk > 0 && low > desk && low - desk < 1500);
  assert.match(opt, />\s*ADD LOW UNIT\s*</);
  assert.match(opt, /onClick=\{\(\) => setSaid\(A\.addLowUnit\(\)\.said\)\}/);
  wardrobeJob();
  assert.deepEqual(A.addLowUnit(), { id: null, said: REASONS.lowUnitNeedsAWardrobe });
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  useUiStore.getState().selectUnit(w);
  const res = A.addLowUnit();
  assert.ok(res.id, res.said);
  assert.equal(U(res.id).type, 'WARDROBE_LOW');
  assert.equal(U(res.id).params.doors, true, 'it arrived with no door');
  assert.equal(S().unitResult(res.id).panels.filter((x) => x.role === 'front').length, 1);
  useUiStore.getState().clearSelection();
  assert.notEqual(A.designUnit(S().units)?.id, res.id, 'the columns took the low unit for the wardrobe');
});

test('F18 · the whole road: the BOM lists its hinges, the T71 set draws it, a save and reload keeps it', () => {
  wardrobeJob();
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const l = S().addUnit('WARDROBE_LOW', { near: w, side: 'right' }).id;
  S().setDoors(l, true);
  const entries = S().units.map((u) => ({ unit: u, result: S().unitResult(u.id) }));
  const bom = buildBom(entries, { design: S().project.design, profile: P, room: S().project.room });
  assert.ok(bom.units.find((u) => u.unitNum === 'WL01').rows.length > 0);
  assert.ok(bom.hardware.some((h) => /hinge/.test(h.role) && h.units.includes('WL01')), 'no hinge line names WL01');
  const sheets = wallDrawingSheets({ entries, project: S().project, room: S().project.room, profile: P, date: '09.10.2026', design: S().project.design });
  const texts = sheets.flatMap((s) => (s.sheet?.entities || []).filter((e) => e.kind === 'text').map((e) => String(e.text)));
  assert.ok(texts.some((t) => t.includes('WL01')), 'the low unit is not on the drawings');
  // Across the reload the CARCASS is compared: a saved job's door pins the
  // legacy 70 shaker frame on open (T34 F7, `legacyShakerFrame`), whatever kit.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  const carcass = (r) => JSON.stringify({ ...cut(r), panels: cut(r).panels.filter((x) => x.role !== 'front') });
  const before = carcass(S().unitResult(l));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(U(l).type, 'WARDROBE_LOW');
  assert.equal(carcass(S().unitResult(l)), before);
  assert.equal(S().unitResult(l).panels.filter((x) => x.role === 'front').length, 1);
});

test('F18 · golden-wardrobe-low.json, byte for byte', () => {
  const g = JSON.parse(read('fixtures/golden-wardrobe-low.json'));
  assert.equal(g.params.type, 'WARDROBE_LOW');
  assert.deepEqual(goldenOf(g.params, P), g.expected);
});
