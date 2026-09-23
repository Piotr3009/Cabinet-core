// ─── TURN 74 · F13 · THE FREE PANEL, "INSERT PANEL" ─────────────────────────
//
// The owner, 23.09.2026 (list point 3):
//
//   *"SWOBODNY PANEL (wstaw panel). Użytkownik wstawia panel, ustawia
//   pion/poziom/każdą orientację, długość, grubość. Przyciąganie (snap) jako
//   PROPOZYCJA, nie na siłę, zawsze do odrzucenia. Przesuwanie przez
//   kliknięcie w wymiar. Z paneli można złożyć własną figurę (np. box).
//   Dwuklik = wejście w edycję jak w PRO (wycięcie łuku itp.)."*
//
// The probe (`verify/t74/f13-probe.md`, committed before the build): nothing
// like it existed. A board belonged to a cabinet, the library's
// "Free-standing panels" row had been held open since turn 12, the piece
// editor was reached only from PRO's cabinet editor, and the room's one magnet
// snapped silently. These assertions are that table, answered.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import {
  UNIT_TYPES, UNIT_NUM_PREFIX, defaultParamsFor, getCategory, isFreePanel,
} from '../src/engine/types.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  freePanelOf, freePanelPatch, freePanelPlacement, freePanelSnap,
} from '../src/engine/freePanel.js';
import { KITCHEN_LIBRARY, flattenLibrary } from '../src/engine/library.js';
import { elementKind, elementFields, isMainViewElement } from '../src/engine/elements.js';
import { buildCabinetPartQtys } from '../src/engine/bom.js';
import { partIdForElement } from '../src/engine/partRegistry.js';
import { applyPartEdits } from '../src/engine/partEdits.js';
import { panelEntities } from '../src/engine/cnc/dxf.js';
import { buildRuns } from '../src/engine/runs.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';
import { hhEntries, hhWorktops, HH_PROJECT, HH_ROOM } from './fixtures/t71-herbal-hill.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const unit = (id) => S().units.find((u) => u.id === id);

function aRoom() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
}
const params = (patch = {}) => {
  const base = defaultParamsFor('FREE_PANEL', P);
  return { ...base, ...freePanelPatch(base, patch, P), unit_num: '01' };
};

/** The leant board's extents in the unit's frame, turned the way the 3-D turns it. */
function extents(p) {
  const b = p.box;
  const t = ((p.meta?.tilt_deg || 0) * Math.PI) / 180;
  const pv = p.meta?.tilt_pivot || {};
  const pts = [];
  for (const x of [b.x, b.x + b.w]) for (const y of [b.y, b.y + b.h]) for (const z of [b.z, b.z + b.d]) {
    if (!p.meta?.tilt_deg) { pts.push([x, y, z]); continue; }
    const dx = x - (pv.x || 0); const dy = y - (pv.y || 0); const dz = z - (pv.z || 0);
    if (p.meta.tilt_axis === 'z') {
      pts.push([(pv.x || 0) + dx * Math.cos(t) - dy * Math.sin(t), (pv.y || 0) + dx * Math.sin(t) + dy * Math.cos(t), z]);
    } else {
      pts.push([x, (pv.y || 0) + dy * Math.cos(t) - dz * Math.sin(t), (pv.z || 0) + dy * Math.sin(t) + dz * Math.cos(t)]);
    }
  }
  const r = (i) => [Math.min(...pts.map((q) => q[i])), Math.max(...pts.map((q) => q[i]))];
  return { x: r(0), y: r(1), z: r(2) };
}

// ═══ 1 · THE KIT ═══════════════════════════════════════════════════════════

test('T74 F13 · a kit of its own: its whole carcass is ONE free board, and it carries nothing else', () => {
  const t = UNIT_TYPES.FREE_PANEL;
  assert.ok(t, 'no FREE_PANEL kit');
  assert.deepEqual(t.carcass, {
    top: 'free', sides: 'none', bottom: 'none', back: 'none',
  });
  assert.equal(t.freePanel, true);
  assert.equal(t.family, undefined, 'a free panel belongs to every job, kitchen or wardrobe');
  assert.equal(t.legs, false);
  assert.equal(t.plinth, false);
  assert.equal(t.mount, 'wall', 'it hangs at its own height (0 on the floor)');
  assert.ok(Object.values(t.supports).every((v) => v === false), 'it carries doors, shelves or fillers');
  assert.equal(UNIT_NUM_PREFIX.FREE_PANEL, 'FP');
  assert.equal(isFreePanel('FREE_PANEL'), true);
  assert.equal(isFreePanel('WUD'), false);
});

test('T74 F13 · the library row held open since turn 12 is the kit now, in the kitchen Extras', () => {
  const row = flattenLibrary(KITCHEN_LIBRARY).find((e) => e.id === 'free-standing-panels');
  assert.equal(row.kind, 'type');
  assert.equal(row.typeId, 'FREE_PANEL');
  assert.ok(getCategory('kitchen').types.includes('FREE_PANEL'));
});

// ═══ 2 · IT IS CUT LIKE ANY BOARD ══════════════════════════════════════════

test('T74 F13 · the engine cuts ONE board: its length, its width, the board\'s thickness, banded all round', () => {
  const r = computeCabinet(params(), P);
  assert.deepEqual(r.panels.map((p) => p.id), ['FP']);
  const fp = r.panels[0];
  assert.equal(fp.part, 'FREE-PANEL');
  assert.equal(fp.w, 800);
  assert.equal(fp.h, 400);
  assert.equal(fp.thickness, 18);
  assert.equal(fp.edging.code, P.csv.codes.all, 'a free board is seen on all four edges');
  assert.equal(fp.material_role, 'board');
  assert.equal(fp.finish_exposed, true);
  assert.deepEqual(r.csvLines, ['01,FP,800,400,<>^v,2.40,0.320']);
  assert.deepEqual(fp.cnc.outline, [[0, 0], [800, 0], [800, 400], [0, 400]]);
  assert.equal(fp.cnc.pockets.length + fp.cnc.holes.length, 0, 'nothing joins to it: no pocket, no hole');
});

test('T74 F13 · every orientation: along or across the wall, upright, flat or leant; the leant board fills its box exactly, and the CUT never changes', () => {
  for (const facing of ['along', 'across']) {
    for (const tilt of [0, 17, 30, 45, 60, 90]) {
      const p = params({ panel_facing: facing, panel_tilt_deg: tilt });
      const r = computeCabinet(p, P);
      const fp = r.panels[0];
      assert.equal(fp.w, 800, `${facing}/${tilt}: the cut length moved`);
      assert.equal(fp.h, 400, `${facing}/${tilt}: the cut width moved`);
      const e = extents(fp);
      const near = (a, b) => Math.abs(a - b) < 0.01;
      assert.ok(near(e.x[0], 0) && near(e.x[1], p.width), `${facing}/${tilt}: x ${e.x} vs ${p.width}`);
      assert.ok(near(e.y[0], 0) && near(e.y[1], p.height), `${facing}/${tilt}: y ${e.y} vs ${p.height}`);
      assert.ok(near(e.z[0], 0) && near(e.z[1], p.depth), `${facing}/${tilt}: z ${e.z} vs ${p.depth}`);
    }
  }
  // Upright along the wall, it is a board against the wall; flat, a shelf-like board; across, a side.
  assert.deepEqual(freePanelPlacement({ facing: 'along', length: 800, width: 400, thickness: 18, tilt: 0 }).box, { x: 0, y: 0, z: 0, w: 800, h: 400, d: 18 });
  assert.deepEqual(freePanelPlacement({ facing: 'along', length: 800, width: 400, thickness: 18, tilt: 90 }).box, { x: 0, y: 0, z: 0, w: 800, h: 18, d: 400 });
  assert.deepEqual(freePanelPlacement({ facing: 'across', length: 800, width: 400, thickness: 18, tilt: 0 }).box, { x: 0, y: 0, z: 0, w: 18, h: 400, d: 800 });
});

test('T74 F13 · the BOM has a row for it, and the CNC draws its outline', () => {
  const r = computeCabinet(params(), P);
  assert.equal(partIdForElement('FREE-PANEL', { typeId: 'FREE_PANEL' }), 'free_panel');
  const q = buildCabinetPartQtys(r, P);
  assert.ok(q.free_panel?.m2 > 0.31 && q.free_panel.m2 < 0.33, `free_panel m2 ${q.free_panel?.m2}`);
  const ents = panelEntities(r.panels[0], r.drills, { unitNum: '01', profile: P });
  assert.ok(ents.length > 0, 'the DXF draws nothing for it');
});

test('T74 F13 · the piece editor edits its board as any other: an arc drawn on it is machined', () => {
  const r = computeCabinet(params(), P);
  const edited = applyPartEdits(r, {
    FP: {
      signature: `${800}×${400}×${18}`,
      panelSize: { w: 800, h: 400 },
      ops: [{ op: 'arc', id: 'a1', layer: 'CUT', cx: 400, cy: 400, r: 200, start: 180, end: 360 }],
    },
  });
  const fp = edited.panels.find((p) => p.id === 'FP');
  assert.ok((fp.cnc.curves || []).length === 1, 'the arc did not reach the board');
});

// ═══ 3 · IN THE ROOM ═══════════════════════════════════════════════════════

test('T74 F13 · INSERTED: on the floor, its own height, no filler, never lined up with a tall unit', () => {
  aRoom();
  const w = S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth: 568 } }).id;
  const { id } = S().addUnit('FREE_PANEL', { near: w, side: 'right' });
  const u = unit(id);
  assert.equal(u.params.mount_height, 0, 'it was hung at a wall unit\'s height');
  assert.equal(u.params.side_infill_off, true);
  assert.equal(u.params.unit_num, 'FP01');
  assert.deepEqual(S().unitResult(id).panels.map((p) => p.id), ['FP'], 'a filler or a plinth joined it');
  assert.ok(u.position.x_mm >= unit(w).position.x_mm + unit(w).params.width, 'it stands in the wardrobe');
});

test('T74 F13 · a BOX of free panels: they meet and cross at the corners; a cabinet still holds them off', () => {
  aRoom();
  const left = S().addUnit('FREE_PANEL').id;
  S().updateUnitParams(left, { panel_facing: 'across', panel_length: 400, panel_width: 600 });
  const right = S().addUnit('FREE_PANEL', { near: left, side: 'right' }).id;
  assert.ok(unit(right).position.x_mm >= unit(left).position.x_mm + unit(left).params.width - 1e-6,
    'a panel added beside another was put on it');
  S().updateUnitParams(right, { panel_facing: 'across', panel_length: 400, panel_width: 600 });
  S().moveUnit(right, unit(left).position.x_mm + 782, 0.5, { magnet: false });
  const top = S().addUnit('FREE_PANEL', { near: left, side: 'right' }).id;
  S().updateUnitParams(top, { panel_tilt_deg: 90, panel_length: 800, panel_width: 400 });
  S().moveUnit(top, unit(left).position.x_mm, 0.5, { magnet: false });
  S().updateUnitParams(top, { mount_height: 600 });
  // The top lies across both sides: its span covers theirs, nothing held it off.
  assert.equal(unit(top).position.x_mm, unit(left).position.x_mm, 'a free panel held another off');
  assert.equal(unit(top).params.mount_height, 600);
  assert.equal(unit(top).params.height, 18);
  assert.equal(unit(right).position.x_mm, unit(left).position.x_mm + 782);
  // The cut list: three boards, each its own.
  const lines = S().units.flatMap((u) => S().unitResult(u.id).csvLines);
  assert.equal(lines.filter((l) => /,FP,/.test(l)).length, 3);
  // …and a cabinet does hold a free panel off.
  const cab = S().addUnit('BUD').id;
  S().moveUnit(cab, unit(left).position.x_mm - 100, 0.5);
  const fp = unit(left); const c = unit(cab);
  const overlap = Math.min(fp.position.x_mm + fp.params.width, c.position.x_mm + c.params.width)
    - Math.max(fp.position.x_mm, c.position.x_mm);
  assert.ok(overlap <= 1e-6, `a cabinet stands in a free panel (${overlap} mm)`);
});

test('T74 F13 · a free panel is no cabinet of a run: no shared plinth, cornice or mask', () => {
  aRoom();
  const a = S().addUnit('FREE_PANEL').id;
  const cab = S().addUnit('BUD').id;
  const runs = buildRuns(S().units, P);
  const members = runs.flatMap((r) => (r.units || []).map((u) => u.id));
  assert.ok(members.includes(cab), 'the cabinet is in no run: the check below would say nothing');
  assert.ok(!members.includes(a), 'a free panel joined a run');
  assert.match(uncomment(read('src/engine/runs.js')), /if \(type\.freePanel\) continue;/);
});

test('T74 F13 · its sizes are read as meant, and the room\'s clamp keeps the board and its box one', () => {
  const along = params();
  assert.equal(freePanelPatch(along, { width: 1200 }, P).width, 1200, 'the width is its length along the wall');
  assert.equal(freePanelPatch(along, { height: 700 }, P).panel_width, 700, 'upright, its height is its width');
  const across = params({ panel_facing: 'across' });
  assert.equal(freePanelPatch(across, { depth: 500 }, P).depth, 500, 'across the wall, its depth is its length');
  assert.equal(freePanelOf(freePanelPatch(across, { depth: 500 }, P), P).length, 500);
  aRoom();
  const id = S().addUnit('FREE_PANEL').id;
  const res = S().updateUnitParams(id, { height: 5000 });
  assert.ok(res.notices.some((n) => /limited/i.test(n)), 'the ceiling said nothing');
  const r = S().unitResult(id);
  assert.equal(r.panels[0].h, unit(id).params.height, 'the board is bigger than the space the room let it have');
});

// ═══ 4 · THE SNAP IS A PROPOSAL ════════════════════════════════════════════

test('T74 F13 · the snap PROPOSES: the nearest edge within the magnet, nothing beyond it, and nothing moves', () => {
  assert.deepEqual(freePanelSnap({ left: 1012, width: 18, edges: [{ at: 1000, label: 'FP01' }], magnet: 40 }),
    { left: 1000, at: 1000, edge: 'left', label: 'FP01' });
  assert.deepEqual(freePanelSnap({ left: 960, width: 18, edges: [{ at: 1000, label: 'FP01' }], magnet: 40 }),
    { left: 982, at: 1000, edge: 'right', label: 'FP01' });
  assert.equal(freePanelSnap({ left: 900, width: 18, edges: [{ at: 1000 }], magnet: 40 }), null);
  aRoom();
  const a = S().addUnit('FREE_PANEL').id;
  const b = S().addUnit('FREE_PANEL', { near: a, side: 'right' }).id;
  const aRight = unit(a).position.x_mm + unit(a).params.width;
  S().moveUnit(b, aRight + 25, 0.5, { magnet: false });
  const proposal = S().freePanelProposal(b);
  assert.equal(proposal.left, aRight);
  assert.equal(unit(b).position.x_mm, aRight + 25, 'the proposal moved the panel');
  // The drop TAKES it…
  S().acceptFreePanelSnap(b);
  assert.equal(unit(b).position.x_mm, aRight);
  // …and a drop that REFUSES it simply does not call the taker: the panel stays.
  S().moveUnit(b, aRight + 25, 0.5, { magnet: false });
  assert.equal(unit(b).position.x_mm, aRight + 25);
});

test('T74 F13 · the drag moves it with the silent magnet off, shows the proposal, and the drop decides (Alt refuses)', () => {
  const scene = uncomment(read('src/3d/Scene.jsx'));
  assert.match(scene, /moveUnit\(unit\.id, x, step, \{ magnet: false \}\);\s*const caught = freePanelProposal\(unit\.id\);/);
  // Only a DROP takes it: a click that never travelled selects and does not
  // snap (the audit: a typed 20 mm jumped to 0 on the click that selected it).
  assert.match(scene, /if \(moved && !altKey && !cancelled\) acceptFreePanelSnap\(unit\.id\);/);
  const view = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(view, /if \(Math\.hypot\(ev\.clientX - drag\.current\.x0, ev\.clientY - drag\.current\.y0\) > 3\) drag\.current\.moved = true;/);
  assert.match(view, /onMoveEnd\?\.\(\{ altKey: Boolean\(ev\?\.altKey\), cancelled: ev\?\.type === 'pointercancel', moved \}\);/);
  assert.match(view, /<group userData=\{\{ ccHelper: true, ccSnapProposal: snapProposal\.at \}\}>/);
});

// ═══ 5 · MOVED BY ITS FIGURE, EDITED ON THE RIGHT, 2KLIK INTO THE PIECE EDITOR ═

test('T74 F13 · its two figures (from what is on its left, from the floor) move it, in the T73 F3 field', () => {
  const src = uncomment(read('src/3d/SpacingChain.jsx'));
  assert.match(src, /if \(panel\.part === 'FREE-PANEL' && unit\) \{/);
  assert.match(src, /key: 'fp-left',[\s\S]*?write: 'unit-x',/);
  assert.match(src, /key: 'fp-floor',[\s\S]*?write: 'unit-mount',/);
  assert.match(src, /if \(row\.write === 'unit-x'\) moveUnit\(unit\.id, next, 0\.5, \{ magnet: false \}\);/);
  assert.match(src, /updateUnitParams\(unit\.id, \{ mount_height: next \}\)/);
});

test('T74 F13 · a click lands on the board; its menu is how it stands and its size, PRO\'s own rows, both apps', () => {
  const r = computeCabinet(params(), P);
  const fp = r.panels[0];
  assert.equal(elementKind(fp), 'free-panel');
  assert.equal(isMainViewElement(fp), true);
  assert.deepEqual(elementFields(fp), ['free-panel-orientation', 'free-panel-size', 'material']);
  for (const rel of ['src/components/ElementProperties.jsx', 'src/retail/design/detail/ElementProperties.jsx']) {
    const src = uncomment(read(rel));
    assert.match(src, /case 'free-panel-orientation': \{/, rel);
    assert.match(src, /data-free-panel-facing=\{id\}/, rel);
    assert.match(src, /data-free-panel-tilt="1"/, rel);
    assert.match(src, /case 'free-panel-size': \{/, rel);
    assert.match(src, /onCommit=\{\(v\) => put\(\{ panel_length: v \}\)\}/, rel);
    assert.match(src, /onCommit=\{\(v\) => put\(\{ board_t: v \}\)\}/, rel);
  }
});

test('T74 F13 · 2klik opens PRO\'s piece editor: PRO\'s own window, and in retail its COPY, made by the machine', () => {
  const view = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(view, /if \(p\.part === 'FREE-PANEL' && onEditPart\) \{\s*onSelectElement\?\.\(p\.id\);\s*onEditPart\(p\.id, \{ x: e\.clientX, y: e\.clientY \}\);/);
  assert.match(uncomment(read('src/3d/Scene.jsx')), /onEditPart=\{\(panelId, at\) => openModal\('part-detail', \{/);
  assert.match(uncomment(read('src/retail/design/Editors.jsx')), /\{is\('part-detail'\) && <PartDetailModal \/>\}/);
  const manifest = read('scripts/t63-copies.mjs');
  assert.match(manifest, /pro: 'src\/components\/PartDetailModal\.jsx', retail: 'src\/retail\/design\/detail\/PartDetailModal\.jsx'/);
  // The copy is PRO's, line for line.
  const lines = (t) => t.split('\n').length;
  assert.equal(lines(read('src/retail/design/detail/PartDetailModal.jsx')), lines(read('src/components/PartDetailModal.jsx')));
});

test('T74 F13 · retail: INSERT PANEL in EXTRAS puts one in and opens its menu on the right', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /data-testid="extras-insert-panel"/);
  assert.match(options, />\s*INSERT PANEL\s*</);
  aRoom();
  const w = S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth: 568 } }).id;
  useUiStore.getState().selectUnit?.(w);
  const res = A.insertPanel();
  assert.ok(res.id, res.said);
  assert.equal(unit(res.id).type, 'FREE_PANEL');
  const sel = useUiStore.getState().selectedElement;
  assert.deepEqual({ unitId: sel?.unitId, ref: sel?.elementRef }, { unitId: res.id, ref: 'FP' });
  const resolved = A.resolveSelection(sel);
  assert.equal(resolved?.menu, 'free-panel', 'the right-hand menu is not the free panel\'s');
});

test('T74 F13 · retail: a second INSERT PANEL goes beside the SELECTED panel; the left column stays on the wardrobe', () => {
  aRoom();
  const w = S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth: 568 } }).id;
  useUiStore.getState().selectUnit?.(w);
  const first = A.insertPanel().id;
  S().updateUnitParams(first, { panel_facing: 'across' });
  const second = A.insertPanel().id;
  assert.ok(second);
  assert.equal(unit(second).position.x_mm, unit(first).position.x_mm + unit(first).params.width,
    'the second board is not beside the selected one');
  // The audit: with a board selected, the left column's doors and insides
  // acted on the BOARD (ADD DOORS refused with no sentence). They are the
  // wardrobe's.
  assert.equal(useUiStore.getState().selectedElement?.unitId, second);
  assert.equal(A.designUnit(S().units)?.id, w);
});

test('T74 F13 · the audit: a board ON THE FLOOR is on the floor for every rule that reads a height', async () => {
  const { floorOf, roomFitFaults } = await import('../src/engine/roomFit.js');
  aRoom();
  const id = S().addUnit('FREE_PANEL').id;
  assert.equal(unit(id).params.mount_height, 0);
  // The room check and the size window read it at 0, not at the 1500 a wall
  // unit hangs at: a 2400 board stands in a 2500 room.
  assert.equal(floorOf(unit(id), P), 0);
  assert.equal(S().roomFitRefusalFor(id, { height: 2400 }), null, 'the size window refused a floor board at 2400');
  S().updateUnitParams(id, { height: 1800 });
  assert.equal(unit(id).params.height, 1800);
  const faults = roomFitFaults(S().units, S().project.room, P).filter((f) => f.unit.id === id);
  assert.equal(faults.length, 0, 'Check #20 hangs the board at 1500');
  // A stated 0 is a height; an UNSTATED one is still the hanging height.
  assert.equal(floorOf({ type: 'WUD', params: {} }, P), P.wallUnit.defaults.mountHeight);
  assert.equal(floorOf({ type: 'WUD', params: { mount_height: 0 } }, P), 0);
  // …and the kitchen's wall-unit line never lifts it.
  S().setProjectHeights({ wallMount: 1450 });
  assert.equal(unit(id).params.mount_height, 0, 'the project\'s wall mount lifted the board off the floor');
});

test('T74 F13 · the audit: a board is not a carcass: no end panel, no mask, no rotation in its right-click', async () => {
  const { menuActions } = await import('../src/lib/contextActions.js');
  aRoom();
  const id = S().addUnit('FREE_PANEL').id;
  const ids = menuActions({ unit: unit(id), store: {} }).map((a) => a.id).sort();
  assert.deepEqual(ids, ['delete', 'rename', 'save-template', 'unit-colour']);
  // A wardrobe's menu is as it was.
  const w = S().addUnit('WARDROBE').id;
  const wardrobe = menuActions({ unit: unit(w), store: {} }).map((a) => a.id);
  for (const want of ['end-panel-L', 'rotate-90', 'edit-cabinet']) assert.ok(wardrobe.includes(want), want);
  // The store refuses the carcass extras on a board, in words.
  const ep = S().addEndPanel(id, { side: 'L' });
  assert.equal(ep.id, null);
  assert.match(ep.error, /one board/);
  assert.equal(S().addBottomMask(id), false);
  assert.equal(unit(id).params.bottom_mask ?? false, false);
  assert.equal((unit(id).params.end_panels || []).length, 0);
});

test('T74 F13 · the drawing set (read-only) takes a job with a free panel in it, in every orientation', () => {
  const entries = hhEntries(P);
  for (const [facing, tilt] of [['along', 0], ['across', 0], ['along', 90], ['along', 30]]) {
    const p = { ...params({ panel_facing: facing, panel_tilt_deg: tilt }), unit_num: '99', mount_height: 900 };
    const u = { id: 'fp1', type: 'FREE_PANEL', position: { wall: 0, x_mm: 3000, rotation_deg: 0 }, params: p };
    const sheets = wallDrawingSheets({
      entries: [...entries, { unit: u, result: computeCabinet(p, P) }],
      project: HH_PROJECT, room: HH_ROOM, worktops: hhWorktops(P), profile: P, date: 'x', design: { fronts: { style: 'F' } },
    });
    assert.ok(sheets.length > 0, `${facing}/${tilt}: the set drew nothing`);
  }
});
