// ─── TURN 74 · F7 · ADD WALL UNIT, FOR WARDROBES ───────────────────────────
//
// The owner, 23.09.2026 (list point 7):
//
//   *"ADD WALL UNIT (typ wallUnit): szafki wiszące w szafach (np. szafa L i P
//   plus ciąg szafek nad łóżkiem; floating biurko). Osobny typ, NIE
//   przełącznik przy szafie. Identyczny typ jak górka kuchenna, kopiować 1:1
//   z kuchni: bez nóg, zawieszka, wycięcia w plecach, panel maskujący pod
//   spodem. Domyślnie: góra równo z szafą, głębokość = głębokość szafy.
//   Zmiana przez klik w wymiar (szer/wys/głęb), głębokość wyrównana do tyłu
//   albo do frontu. Bok szafy przy wall unit ZOSTAJE (to nie szafa do szafy,
//   reguła znikającego panelu nie działa)."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import {
  UNIT_TYPES, UNIT_TYPE_ORDER, UNIT_NUM_PREFIX, getCategory, getUnitType, defaultParamsFor, isWardrobeWallUnit,
} from '../src/engine/types.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { setWardrobeEndPanelAuto } from '../src/engine/endPanelAuto.js';
import { hostsRidersOf } from '../src/engine/topBox.js';
import { unitTop } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const P = DEFAULT_CABINET_PROFILE;
const unit = (id) => S().units.find((u) => u.id === id);
const epOf = (id) => (unit(id).params.end_panels || []).map((p) => p.side).sort();
const spanOf = (u) => ({ left: u.position.x_mm, right: u.position.x_mm + u.params.width });

/** A wardrobe on wall 0 of a 4 x 3 m room, with the client's automat on. */
function aWardrobe({ depth = 568 } = {}) {
  setWardrobeEndPanelAuto(true);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  return S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth } }).id;
}

test.after(() => setWardrobeEndPanelAuto(false));

// ═══ 1 · THE TYPE: WUD, 1:1 ═════════════════════════════════════════════════

test('T74 F7 · a type of its own, `WUD` copied line for line; only what files it differs', () => {
  const wud = UNIT_TYPES.WUD;
  const mine = UNIT_TYPES.WARDROBE_WALL;
  assert.ok(mine, 'no WARDROBE_WALL type');
  const differs = Object.keys({ ...wud, ...mine }).filter((k) => JSON.stringify(wud[k]) !== JSON.stringify(mine[k]));
  assert.deepEqual(differs.sort(), ['defaultsKey', 'family', 'id'],
    'the wardrobe wall unit is not the kitchen wall unit copied 1:1');
  assert.equal(mine.family, 'wardrobe');
  assert.equal(mine.mount, 'wall');
  assert.equal(mine.legs, false);
  assert.equal(mine.hangers, true);
  assert.equal(mine.ridesOn, undefined, 'it rides on nothing: it is not a top box');
  assert.equal(isWardrobeWallUnit('WARDROBE_WALL'), true);
  for (const id of ['WARDROBE', 'WARDROBE_TOP', 'WUD']) assert.equal(isWardrobeWallUnit(id), false, id);
});

test('T74 F7 · it CUTS exactly what the kitchen wall unit cuts: no legs, the hangers, the back cut-outs, the mask', () => {
  const same = { width: 800, height: 720, depth: 400, mount_height: 1500, bottom_mask: true, unit_num: '01' };
  const kitchen = computeCabinet({ ...defaultParamsFor('WUD', P), ...same }, P);
  const wardrobe = computeCabinet({ ...defaultParamsFor('WARDROBE_WALL', P), ...same }, P);
  const boxes = (r) => r.panels.map((p) => `${p.id}:${p.part}:${JSON.stringify(p.box)}`);
  assert.deepEqual(boxes(wardrobe), boxes(kitchen), 'the boards differ');
  // The bottom masking panel.
  assert.ok(wardrobe.panels.some((p) => p.id === 'MASK'), 'no bottom masking panel');
  // No legs: nothing on the hardware list stands it on the floor.
  assert.ok(!(wardrobe.hardware || []).some((l) => /leg/i.test(l.role || l.label || '')), 'it stands on legs');
  // The hangers: bought, and their cut-outs at the back's top corners.
  const hangers = (r) => (r.hardware || []).find((l) => l.role === 'hangers');
  assert.ok(hangers(wardrobe)?.qty > 0, 'no wall hangers');
  assert.deepEqual(hangers(wardrobe), hangers(kitchen));
  const cutouts = (r) => (r.panels.find((p) => p.id === 'BACK')?.cnc?.pockets || []).filter((k) => k.layer === 'HANGER_HOLE');
  assert.equal(cutouts(wardrobe).length, 2, 'the back has no hanger cut-outs');
  assert.deepEqual(cutouts(wardrobe), cutouts(kitchen));
  // Every bought part and every drilled hole, the same.
  assert.deepEqual(wardrobe.hardware, kitchen.hardware, 'the bought parts differ');
  assert.deepEqual(wardrobe.drills, kitchen.drills, 'the drilling differs');
});

test('T74 F7 · filed with the wardrobes: the library\'s wardrobe category, its own number prefix and profile block', () => {
  assert.deepEqual(getCategory('wardrobe').types, ['WARDROBE', 'WARDROBE_TOP', 'WARDROBE_WALL']);
  assert.ok(UNIT_TYPE_ORDER.includes('WARDROBE_WALL'));
  assert.equal(UNIT_NUM_PREFIX.WARDROBE_WALL, 'WW');
  assert.deepEqual(P.wardrobeWallUnit.defaults, { width: 600, height: 720, depth: 568, mountHeight: 1500 });
  assert.equal(P.wardrobeWallUnit.defaults.depth, P.wardrobe.defaults.depth, 'its fallback depth is not the wardrobe\'s');
});

// ═══ 2 · BORN MATCHED, BESIDE THE WARDROBE ═══════════════════════════════════

test('T74 F7 · beside a wardrobe: on its wall, beside it, its TOP level with the wardrobe\'s, its DEPTH the wardrobe\'s', () => {
  const w = aWardrobe({ depth: 600 });
  const placed = S().addUnit('WARDROBE_WALL', { near: w, side: 'right' });
  assert.ok(placed.id, placed.error);
  const u = unit(placed.id);
  const wd = unit(w);
  assert.equal(u.position.wall, wd.position.wall);
  assert.equal(u.params.depth, 600, 'not born at the wardrobe\'s depth');
  assert.equal(unitTop(u, P), unitTop(wd, P), 'its top is not level with the wardrobe\'s');
  const a = spanOf(wd); const b = spanOf(u);
  assert.ok(b.left >= a.right, 'it overlaps the wardrobe');
  assert.ok(b.left - a.right < 60, `it was not placed beside the wardrobe (${b.left - a.right} mm off)`);
  assert.equal(u.params.unit_num, 'WW01');
});

test('T74 F7 · a stated depth wins over the wardrobe\'s, as every template param does', () => {
  const w = aWardrobe();
  const placed = S().addUnit('WARDROBE_WALL', { near: w, side: 'right', params: { depth: 350 } });
  assert.equal(unit(placed.id).params.depth, 350);
});

// ═══ 3 · THE WARDROBE'S SIDE KEEPS ITS PANEL: TESTED BOTH WAYS ══════════════

test('T74 F7 · a WARDROBE added beside a wardrobe takes that side\'s automatic panel away (T72 F5, unchanged)', () => {
  const w = aWardrobe();
  assert.deepEqual(epOf(w), ['L', 'R']);
  S().addUnit('WARDROBE', { near: w, side: 'right', params: { height: 2150, depth: 568 } });
  assert.deepEqual(epOf(w), ['L'], 'wardrobe beside wardrobe: the panel between them should go');
});

test('T74 F7 · a WALL UNIT added beside a wardrobe leaves the wardrobe\'s side and its panel where they are', () => {
  const w = aWardrobe();
  assert.deepEqual(epOf(w), ['L', 'R']);
  const placed = S().addUnit('WARDROBE_WALL', { near: w, side: 'right' });
  assert.ok(placed.id);
  assert.deepEqual(epOf(w), ['L', 'R'], 'the wardrobe lost its side panel to a wall unit');
  // …and the next settle does not take it either.
  S().settleLayout(w);
  assert.deepEqual(epOf(w), ['L', 'R']);
  // The wall unit hangs beyond the panel, not through it.
  const panel = (unit(w).params.end_panels || []).find((p) => p.side === 'R');
  assert.ok(spanOf(unit(placed.id)).left >= spanOf(unit(w)).right + (Number(panel.thickness) || 0) - 1e-6,
    'the wall unit stands in the end panel');
});

test('T74 F7 · the store\'s law is wardrobe to wardrobe: a floor wardrobe on both sides of it', () => {
  const store = uncomment(read('src/stores/projectStore.js'));
  assert.match(store, /if \(beside && side && \(!inPlayWardrobe\(beside\) \|\| inPlayWardrobe\(unit\)\)\) \{/);
  assert.match(uncomment(read('src/engine/endPanelAuto.js')), /export function inPlayWardrobe\(unit\) \{/);
});

// ═══ 4 · DEPTH ALIGNED TO THE BACK OR TO THE FRONT ═══════════════════════════

test('T74 F7 · BACK keeps the backs on one line; FRONT stands it off so the fronts are on one line', () => {
  const w = aWardrobe({ depth: 600 });
  const { id } = S().addUnit('WARDROBE_WALL', { near: w, side: 'right', params: { depth: 350 } });
  const gapOf = (u) => (u.params.wall_gap ?? P.room.wallBackClearance);
  const wd = unit(w);
  const front = S().alignUnitDepth(id, 'front');
  assert.equal(front.ok, true, front.error);
  assert.equal(unit(id).params.depth_align, 'front');
  assert.equal(gapOf(unit(id)) + unit(id).params.depth, gapOf(wd) + wd.params.depth, 'the fronts are not on one line');
  // A new depth keeps the FRONT where it was asked to be.
  S().updateUnitParams(id, { depth: 400 });
  assert.equal(gapOf(unit(id)) + 400, gapOf(wd) + wd.params.depth, 'a new depth moved the front off the line');
  const back = S().alignUnitDepth(id, 'back');
  assert.equal(back.ok, true);
  assert.equal(unit(id).params.depth_align, 'back');
  assert.equal(gapOf(unit(id)), gapOf(wd), 'the backs are not on one line');
});

test('T74 F7 · FRONT on a unit deeper than its wardrobe is refused in words, and nothing moves', () => {
  const w = aWardrobe({ depth: 500 });
  const { id } = S().addUnit('WARDROBE_WALL', { near: w, side: 'right', params: { depth: 560 } });
  const before = unit(id).params.wall_gap;
  const res = S().alignUnitDepth(id, 'front');
  assert.equal(res.ok, false);
  assert.match(res.error, /deeper than W01/);
  assert.equal(unit(id).params.wall_gap, before);
});

test('T74 F7 · only the wardrobe wall unit is lined up; a wardrobe asked is refused', () => {
  const w = aWardrobe();
  assert.equal(S().alignUnitDepth(w, 'front').ok, false);
});

// ═══ 5 · NOT A TOP BOX'S HOST ════════════════════════════════════════════════

test('T74 F7 · a top box stands on a wardrobe, never on the wall unit hung beside it', () => {
  assert.equal(hostsRidersOf(getUnitType('WARDROBE'), 'wardrobe'), true);
  assert.equal(hostsRidersOf(getUnitType('WARDROBE_WALL'), 'wardrobe'), false);
  assert.equal(hostsRidersOf(getUnitType('WARDROBE_TOP'), 'wardrobe'), false);
  const w = aWardrobe();
  const { id } = S().addUnit('WARDROBE_WALL', { near: w, side: 'right' });
  const box = S().addUnit('WARDROBE_TOP', { near: id });
  if (box.id) assert.notEqual(unit(box.id).params.rides_on, id, 'a top box rides on the wall unit');
});

// ═══ 6 · WHERE ADDING LIVES: RETAIL EXTRAS AND THE PRO LIBRARY ═══════════════

test('T74 F7 · retail: ADD WALL UNIT stands in EXTRAS beside ADD ANOTHER WARDROBE, through `adapter.addWallUnit`', () => {
  const options = read('src/retail/design/Options.jsx');
  const wardrobeBtn = options.indexOf('data-testid="extras-add-wardrobe"');
  const wallBtn = options.indexOf('data-testid="extras-add-wall-unit"');
  assert.ok(wardrobeBtn > 0 && wallBtn > wardrobeBtn, 'ADD WALL UNIT is not beside ADD ANOTHER WARDROBE');
  assert.ok(wallBtn - wardrobeBtn < 1500, 'ADD WALL UNIT is not beside ADD ANOTHER WARDROBE');
  assert.match(options, />\s*ADD WALL UNIT\s*</);
  assert.match(options, /onClick=\{\(\) => setSaid\(A\.addWallUnit\(\)\.said\)\}/);
  assert.match(uncomment(read('src/retail/design/adapter.js')), /store\.addUnit\('WARDROBE_WALL', \{ near: wardrobe\.id, side \}\)/);
});

test('T74 F7 · retail: the button hangs one beside the SELECTED wardrobe, as deep as it and level with its top', () => {
  const w = aWardrobe({ depth: 600 });
  useUiStore.getState().selectUnit?.(w);
  const res = A.addWallUnit();
  assert.ok(res.id, res.said);
  assert.equal(res.said, '');
  const u = unit(res.id);
  assert.equal(u.type, 'WARDROBE_WALL');
  assert.equal(u.params.depth, 600);
  assert.equal(unitTop(u, P), unitTop(unit(w), P));
  assert.deepEqual(epOf(w), ['L', 'R'], 'the wardrobe\'s side lost its panel');
});

test('T74 F7 · retail: with no wardrobe to hang beside, it says so', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const res = A.addWallUnit();
  assert.equal(res.id, null);
  assert.equal(res.said, REASONS.wallUnitNeedsAWardrobe);
});

test('T74 F7 · retail: ADD ANOTHER WARDROBE still goes beside a WARDROBE, never beside the wall unit', () => {
  const w = aWardrobe();
  useUiStore.getState().selectUnit?.(w);
  const hung = A.addWallUnit();
  assert.ok(hung.id);
  const next = A.addFirstWardrobe();
  assert.ok(next);
  const b = unit(next);
  assert.equal(b.type, 'WARDROBE');
  // It stands beside W01 (its left, the right being taken by the wall unit), not beyond the wall unit.
  assert.ok(spanOf(b).right <= spanOf(unit(w)).left + 1e-6 || spanOf(b).left < spanOf(unit(hung.id)).left,
    'the second wardrobe was measured from the wall unit');
});

test('T74 F7 · PRO: the library\'s wardrobe category offers it, and adding it there goes through the same `addUnit`', () => {
  const library = read('src/components/LibraryPanel.jsx');
  assert.match(library, /getCategory\(/);
  assert.match(library, /addUnit\(typeId, \{/);
  assert.ok(getCategory('wardrobe').types.includes('WARDROBE_WALL'));
});

// ═══ 7 · WIDTH, HEIGHT AND DEPTH BY THE CLICK ════════════════════════════════

test('T74 F7 · the scene draws its DEPTH as a clickable figure, for this type alone', () => {
  const view = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(view, /\{isWardrobeWallUnit\(unit\.type\) && \(\s*<group position=\{\[mm\(W\), mm\(floorY\), 0\]\} rotation=\{\[0, -Math\.PI \/ 2, 0\]\}>\s*<DimensionChain/);
  assert.match(view, /key: 'd', from: \[0, H\], to: \[D, H\], offset: sideOffset, label: formatDimension\(D\),[\s\S]{0,160}plane="xy"\s*at=\{0\}/);
  assert.match(view, /field: 'depth', at: \{ x: e\.clientX, y: e\.clientY \}, row: row\.key,/);
});

test('T74 F7 · the size window: Depth and BACK | FRONT for the wall unit, nothing new for anything else; retail is the copy', () => {
  for (const rel of ['src/components/UnitSizeModal.jsx', 'src/retail/design/detail/UnitSizeModal.jsx']) {
    const modal = uncomment(read(rel));
    assert.match(modal, /const hangs = isWardrobeWallUnit\(unit\.type\);/, rel);
    assert.match(modal, /\{hangs && \(/, rel);
    assert.match(modal, /data-unit-size-depth="1"/, rel);
    assert.match(modal, /\[\['back', 'BACK'\], \['front', 'FRONT'\]\]/, rel);
    assert.match(modal, /const res = alignUnitDepth\(unit\.id, want\);/, rel);
    assert.match(modal, /onCommit=\{set\('depth'\)\}/, rel);
  }
});
