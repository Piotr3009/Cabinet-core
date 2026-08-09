// ─── Turn 16, F3–F9: the owner's other seven verdicts ───────────────────────
//
//   F3  the CNC sheet's lettering scales WITH the drawing
//   F4  the door extend is a number, in one place and over a selection; and a
//       wall unit's door height and its masking panel's height are independent
//   F5  Save is a STATE, computed from the data
//   F6  a cabinet's NAME is the owner's, and everything downstream prints it
//   F7  the element editor has a rig, and it is in the profile
//   F9  a side infill goes to the ceiling like the panel beside it

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  MONO_ADVANCE, labelFit, partLabelAnchor, symbolVisible, textWidthMm, truncateToWidth,
} from '../src/engine/cnc/annotation.js';
import { doorExtendMm, doorHeightOf } from '../src/engine/doors.js';
import { endPanelDrop } from '../src/engine/autoparts.js';
import {
  isSectionDirty, saveButtonState, settingsSectionData, settingsSectionSnapshot, SAVE_SECTIONS,
} from '../src/engine/projectSettings.js';
import { duplicateUnitNames, fileSafeName, isDuplicateName, unitName } from '../src/engine/naming.js';
import { editorRigLamps, editorRigOutput } from '../src/engine/render.js';
import { buildBom } from '../src/engine/bom.js';
import { groupByCabinet } from '../src/engine/cnc/views.js';
import { dxfFileName } from '../src/engine/cnc/dxf.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const history = () => useHistoryStore.getState();

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

function project(name = 't16') {
  store().loadProject({
    id: null, name, room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);

// ─── F3 — the annotation is part of the DRAWING ─────────────────────────────

test('F3 — a caption is a SHEET size: it does not grow as you zoom out', () => {
  // The bug, in one assertion. Turn 11 computed `LABEL_PX * mmPerPx`, so at
  // ten times the zoom-out a caption was ten times bigger in sheet millimetres
  // and covered its neighbours. The size is now the profile's, in millimetres,
  // whatever the zoom.
  const near = labelFit({ text: 'BUL 560×2100', sizeMm: 22, boxW: 400, boxH: 800, mmPerPx: 0.5, minPx: 5 });
  const far = labelFit({ text: 'BUL 560×2100', sizeMm: 22, boxW: 400, boxH: 800, mmPerPx: 4, minPx: 5 });
  assert.equal(near.size, far.size, 'the same size on the sheet at both zooms');
  assert.ok(near.visible && far.visible);
});

test('F3 — everything a part owns fits INSIDE its outline', () => {
  const text = 'INFILL-L-FACE  60×2100';
  const part = { x: 0, y: 0, w: 300, h: 2100 };
  const fitted = labelFit({
    text, sizeMm: 22, boxW: part.w * 0.94, boxH: part.h * 0.5, mmPerPx: 1, minPx: 5,
  });
  assert.ok(fitted.visible);
  assert.ok(textWidthMm(fitted.text, fitted.size) <= part.w * 0.94 + 1e-9,
    'the caption is no wider than the part it names');
  const at = partLabelAnchor(part, fitted.size, 0.06);
  assert.ok(at.y <= part.y + part.h, 'and it is drawn inside the outline, not under it');
  assert.ok(at.y >= part.y);
});

test('F3 — it truncates before it overlaps, and hides before it is unreadable', () => {
  // A 30 mm filler at sheet zoom: there is no room for the code, so it is cut
  // down and then dropped — never drawn over the part beside it.
  const narrow = labelFit({ text: 'INFILL-L-FACE 30×2100', sizeMm: 22, boxW: 60, boxH: 400, mmPerPx: 1, minPx: 5 });
  assert.ok(narrow.text.length < 'INFILL-L-FACE 30×2100'.length);
  assert.ok(textWidthMm(narrow.text, narrow.size) <= 60 + 1e-9);

  // …and at extreme zoom-out, where even a shrunk caption would be a smudge.
  const tiny = labelFit({ text: 'BUL', sizeMm: 22, boxW: 400, boxH: 800, mmPerPx: 40, minPx: 5 });
  assert.equal(tiny.visible, false, 'hidden rather than drawn as a grey bar');

  assert.equal(truncateToWidth('ABCDEFGH', 1, 10), '', 'no room at all is no label');
  assert.equal(truncateToWidth('AB', 1000, 10), 'AB', 'plenty of room changes nothing');
  assert.ok(MONO_ADVANCE > 0 && MONO_ADVANCE < 1);
});

test('F3 — a drilling symbol is its own diameter, and hides when it is too small', () => {
  // The other half of the owner's screenshot: turn 11 gave every hole a
  // screen-space minimum radius, so at sheet zoom thirty-six ⌀5 holes became
  // one grey mass bigger than the part under them.
  assert.equal(symbolVisible(5, 0.5, 0.75), true, 'zoomed in, a 5 mm hole is drawn');
  assert.equal(symbolVisible(5, 20, 0.75), false, 'zoomed out, it is hidden rather than inflated');
  assert.equal(symbolVisible(5, 20, 0), true, 'a workshop that sets no threshold always sees them');
});

test('F3 — the numbers are in the PROFILE, and an old profile gets them', () => {
  const A = P.cnc.annotation;
  for (const key of ['partLabelMm', 'blockLabelMm', 'sectionLabelMm', 'minLabelPx', 'minSymbolPx']) {
    assert.ok(Number(A[key]) > 0, `${key} is a number in the profile`);
  }
  const old = migrateCabinetProfile({ ...P, cnc: { layoutGap: 50, layoutRowWidth: 3600 } });
  assert.deepEqual(old.cnc.annotation, A, 'a profile saved before this turn comes back with the app\'s');
  const tuned = migrateCabinetProfile({ ...P, cnc: { ...P.cnc, annotation: { partLabelMm: 40 } } });
  assert.equal(tuned.cnc.annotation.partLabelMm, 40, 'and a workshop that tunes one keeps the rest');
  assert.equal(tuned.cnc.annotation.minLabelPx, A.minLabelPx);
});

// ─── F4 — doors and heights ────────────────────────────────────────────────

test('F4.1 — the door extend is a NUMBER, defaulting to the profile\'s 38', () => {
  assert.equal(P.wallUnit.doorExtend, 38, 'the default stays 38 (owner decision)');
  assert.equal(doorExtendMm({}, P), 0, 'off is nothing');
  assert.equal(doorExtendMm({ door_extend: true }, P), 38, 'the tick means the workshop\'s number');
  assert.equal(doorExtendMm({ door_extend: 55 }, P), 55, '…and a number means itself');
  assert.equal(doorExtendMm({ door_extend: 0 }, P), 0);

  // …and the ENGINE cuts what the number says, which it has been able to do
  // since turn 3 — this turn is the control catching up with it.
  const at = (v) => computeCabinet({ ...defaultParamsFor('WUD', P), unit_num: 'W01', door_extend: v }, P)
    .panels.find((p) => p.part === 'FRONT');
  assert.equal(at(55).h - at(false).h, 55);
  assert.equal(at(55).box.y, -55);
});

test('F4.1 — a wall unit\'s DOOR HEIGHT is its own function, and the piece agrees', () => {
  const params = { ...defaultParamsFor('WUD', P), unit_num: 'W01', door_extend: 38 };
  const door = computeCabinet(params, P).panels.find((p) => p.part === 'FRONT');
  assert.equal(doorHeightOf(params, P), door.h, 'the number the panel shows is the piece that is cut');
});

test('F4.2 — door extend over a SELECTION: one action, one undo step', () => {
  project('t16-f4');
  const ids = [store().addUnit('WUD').id, store().addUnit('WUD').id, store().addUnit('WUD').id];
  const base = store().addUnit('BUD').id;              // no grab edge — a base unit
  flushHistory();

  const { applied, skipped } = store().setDoorExtendBulk([...ids, base], 42);
  flushHistory();
  assert.equal(applied, 3);
  assert.equal(skipped, 1, 'a base unit has a worktop over its doors — counted, not silently dropped');
  for (const id of ids) assert.equal(doorExtendMm(unitOf(id).params, P), 42);
  assert.equal(doorExtendMm(unitOf(base).params, P), 0);

  assert.equal(history().undo(), true);
  for (const id of ids) assert.equal(doorExtendMm(unitOf(id).params, P), 0, 'all three came back together');

  // …and it can be taken off again.
  store().setDoorExtendBulk(ids, 42);
  const off = store().setDoorExtendBulk(ids, false);
  assert.equal(off.applied, 3);
  for (const id of ids) assert.equal(unitOf(id).params.door_extend, false);
});

test('F4.3 — a wall unit\'s DOOR height and its MASKING PANEL height are independent', () => {
  // Owner decision B, as an assertion: no auto-follow, in either direction.
  project('t16-f43');
  const { id } = store().addUnit('WUD');
  const panelId = store().addEndPanel(id, { side: 'L' });
  assert.ok(panelId, 'the panel is on');

  // The DOOR moves…
  store().updateUnitParams(id, { door_extend: 38 });
  const ep = () => (unitOf(id).params.end_panels || [])[0];
  assert.equal(Number(ep().below_mm) || 0, 0, 'and the panel has not followed it');

  // …the PANEL moves…
  const got = store().setEndPanelBelow(id, ep().id, 120);
  assert.equal(got, 120);
  assert.equal(doorExtendMm(unitOf(id).params, P), 38, 'and the door has not followed it either');

  // …and the piece the engine cuts is 120 mm longer, hanging below the carcass.
  const panel = resultOf(id).panels.find((p) => p.part === 'END-PANEL');
  assert.equal(panel.h, unitOf(id).params.height + 120);
  assert.equal(panel.box.y, -120);
  assert.equal(panel.meta.below_mm, 120);

  // The clamp is the room's: a panel cannot hang below the floor.
  const mount = unitOf(id).params.mount_height ?? P.wallUnit.defaults.mountHeight;
  assert.equal(store().setEndPanelBelow(id, ep().id, 99999), mount);
});

test('F4.3 — the ENGINE\'s two paths, as pure functions', () => {
  const wall = { mount: 'wall' };
  const floor = { mount: 'floor', legs: true };
  // Nothing said: a wall unit's panel ends with the cabinet (turn 13 F4).
  assert.equal(endPanelDrop({ height: null, type: wall, mountHeight: 1500, profile: P }), 0);
  // Its own number IS the drop, and it never reads the door.
  assert.equal(endPanelDrop({ height: null, below: 120, type: wall, mountHeight: 1500, profile: P }), 120);
  // A standing unit is unchanged: 'floor' still means past the legs.
  assert.equal(endPanelDrop({ height: 'floor', type: floor, legHeight: 100, profile: P }), 100);
  assert.equal(endPanelDrop({ height: 'floor', below: 40, type: floor, legHeight: 100, profile: P }), 40);
});

test('F4.3 — the T14 mask rules are untouched', () => {
  // CLAUDE.md F4.3: "the T14 mask rules (L = run sum, depth = unit + 10) stay
  // untouched". The bottom masking panel is a different piece from the end
  // panel and this turn does not go near it.
  const r = computeCabinet({
    ...defaultParamsFor('WUD', P), unit_num: 'W01', depth: 300, bottom_mask: true,
  }, P);
  const mask = r.panels.find((p) => p.part === 'MASK');
  assert.equal(mask.h, 300 + P.room.wallBackClearance, 'depth = unit + 10, as turn 14 cut it');
  assert.equal(mask.w, defaultParamsFor('WUD', P).width);
});

// ─── F5 — Save is a STATE ──────────────────────────────────────────────────

test('F5 — the dirty computation is a pure function of (saved, current)', () => {
  const design = { carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'm1' }] }, thickness: { board: 18 } };
  const snap = settingsSectionSnapshot(design, 'carcass');

  assert.equal(isSectionDirty(null, snap), true, 'never saved is something to save');
  assert.equal(isSectionDirty(snap, snap), false, 'saved and unchanged is GREEN');
  const changed = settingsSectionSnapshot(
    { ...design, carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'm2' }] } },
    'carcass',
  );
  assert.equal(isSectionDirty(snap, changed), true, 'any tracked change is RED again');
  assert.deepEqual(saveButtonState(snap, snap), { dirty: false, state: 'saved', label: '✓ Saved' });
  assert.deepEqual(saveButtonState(snap, changed), { dirty: true, state: 'dirty', label: 'Save' });
});

test('F5 — a section goes red for ITS OWN changes and not the neighbour\'s', () => {
  const design = {
    carcass: { types: [{ id: 'c1', material_id: 'm1' }] },
    fronts: { style: 'S', types: [{ id: 'f1', material_id: 'm2' }] },
  };
  const carcass = settingsSectionSnapshot(design, 'carcass');
  const fronts = settingsSectionSnapshot(design, 'fronts');
  const edited = { ...design, fronts: { style: 'F', types: [{ id: 'f1', material_id: 'm2' }] } };
  assert.equal(isSectionDirty(carcass, settingsSectionSnapshot(edited, 'carcass')), false);
  assert.equal(isSectionDirty(fronts, settingsSectionSnapshot(edited, 'fronts')), true);

  // The run-piece switches belong to the FRONTS section — they stand beside it.
  const withRun = { ...design, runMaterials: { plinth: { sameAsFronts: false, material_id: 'm3' } } };
  assert.equal(isSectionDirty(fronts, settingsSectionSnapshot(withRun, 'fronts')), true);
  assert.deepEqual(SAVE_SECTIONS, ['carcass', 'fronts']);
  assert.equal(settingsSectionData(design, 'nonsense'), null);
});

test('F5 — the saved snapshot survives Settings being closed and reopened', () => {
  // The whole point of keeping it in the ui store rather than in the component:
  // closing the panel unmounts the component, and turn 15's boolean died with
  // it, which is why the tick "shows for a moment".
  const ui = useUiStore.getState();
  ui.resetSettingsSaved();
  const snap = settingsSectionSnapshot({ carcass: { types: [] } }, 'carcass');
  ui.markSettingsSaved('carcass', snap);
  assert.equal(useUiStore.getState().settingsSaved.carcass, snap);
  assert.equal(isSectionDirty(useUiStore.getState().settingsSaved.carcass, snap), false);
  useUiStore.getState().resetSettingsSaved();
  assert.deepEqual(useUiStore.getState().settingsSaved, {});
});

// ─── F6 — the name ─────────────────────────────────────────────────────────

test('F6 — the default is automatic, and it becomes the owner\'s', () => {
  project('t16-f6');
  const { id } = store().addUnit('BUD');
  assert.equal(unitOf(id).params.unit_num, '01', 'the automatic default is unchanged');

  assert.equal(store().setUnitName(id, '  Island  '), 'Island', 'trimmed, and it is the name now');
  assert.equal(unitOf(id).params.unit_num, 'Island');
  assert.equal(store().setUnitName(id, ''), '01', 'cleared, it goes back to the automatic one');
});

test('F6 — a renamed cabinet is renamed in the BOM and in the CNC tree', () => {
  project('t16-f6b');
  const { id } = store().addUnit('BUD');
  store().setUnitName(id, 'Island');
  const unit = unitOf(id);
  const result = resultOf(id);

  assert.equal(result.unitNum, 'Island', 'the engine takes the name it is given');
  const bom = buildBom([{ unit, result }], { design: store().project.design, profile: P });
  assert.equal(bom.units[0].unitNum, 'Island');
  for (const row of bom.units[0].rows) assert.equal(row.unit_num, 'Island');

  // The CNC tree groups by cabinet and reads the same field.
  const { cabinets } = groupByCabinet([{ unit, result, panels: result.panels }]);
  assert.equal(cabinets[0].unit.params.unit_num, 'Island');
  assert.equal(unitName(unit), 'Island');

  // …and a part CODE is the name, made safe for a path.
  assert.equal(dxfFileName('Island', 'BUL'), 'Island-BUL.dxf');
  assert.equal(dxfFileName('Kitchen island / left', 'BUL'), 'Kitchen_island_left-BUL.dxf');
  assert.equal(fileSafeName('01'), '01', 'an automatic name passes through untouched');
  assert.equal(fileSafeName('Kitchen island / left'), 'Kitchen-island-left');
});

test('F6 — duplicates are FLAGGED, never blocked', () => {
  project('t16-f6c');
  const a = store().addUnit('BUD').id;
  const b = store().addUnit('BUD').id;
  store().setUnitName(a, 'Island');
  assert.equal(store().setUnitName(b, 'island'), 'island', 'it is allowed');
  const units = store().units;
  assert.deepEqual([...duplicateUnitNames(units)], ['island'], 'and it is seen — case-insensitively');
  assert.equal(isDuplicateName(unitOf(a), units), true);
  assert.equal(isDuplicateName(unitOf(b), units), true);

  store().setUnitName(b, 'Run end');
  assert.equal(isDuplicateName(unitOf(a), store().units), false, 'renamed away, the flag goes');
});

// ─── F7 — the editor's rig ─────────────────────────────────────────────────

test('F7 — the editor rig is DATA, raised, and lit from more than two angles', () => {
  const rig = editorRigLamps(P, 2);
  // The three literals that used to live in the JSX, raised about a quarter…
  assert.ok(rig.ambient >= 0.75 * 1.2, 'the ambient is up on the 0.75 that was in the component');
  const key = rig.lamps.find((l) => l.id === 'key');
  assert.ok(key.intensity >= 1.6 * 1.2, 'and so is the key');
  // …plus lamps from the angles the old rig had nothing in.
  assert.ok(rig.lamps.length >= 5, 'fill lamps from other angles (F7)');
  assert.ok(rig.lamps.some((l) => l.position[1] < 0), 'one from BELOW — a part is held up to the light');
  assert.ok(rig.lamps.some((l) => l.position[2] < 0), '…and one from behind');
  // Positions scale with the window's own radius, so a drawer front and a
  // wardrobe are lit alike.
  assert.deepEqual(editorRigLamps(P, 4).lamps[0].position, key.position.map((v) => v * 2));
  // The whole rig is up by a quarter on what the two windows used to carry
  // (0.75 ambient + 1.6 + 0.5 = 2.85).
  assert.ok(editorRigOutput(P) >= 2.85 * 1.25, `rig output ${editorRigOutput(P)}`);

  const old = migrateCabinetProfile({ ...P, appearance: { ...P.appearance, editorRig: undefined } });
  assert.deepEqual(old.appearance.editorRig.lamps, P.appearance.editorRig.lamps,
    'a profile saved before this turn gets the app\'s rig');
});

// ─── F9 — the infill goes to the ceiling ───────────────────────────────────

test('F9 — a side infill takes the panel\'s "above unit" and its fill-to-ceiling', () => {
  project('t16-f9');
  const { id } = store().addUnit('BUD');
  store().moveUnit(id, 0, 0);                       // parked at the wall: the filler appears
  store().setSideInfillPinned(id, 'L', true);
  const unit = () => unitOf(id);
  assert.ok(Number(unit().params.side_infill_left_mm) > 0, 'there is a filler to raise');

  // The NUMBER — the same mechanics the end panel has had since turn 15.
  assert.equal(store().setSideInfillTop(id, 'L', 200), 200);
  assert.equal(unit().params.side_infill_left_top_mm, 200);

  // …and the ▲: all the way to the ceiling, clamped by the room.
  const top = store().sideInfillToCeiling(id, 'L');
  const headroom = 2500 - (unit().params.height + (unit().params.leg_height ?? P.baseUnit.legHeight));
  assert.equal(top, headroom, 'it stops at the ceiling, exactly');
  assert.equal(unit().params.side_infill_left_top_mm, top);

  // The piece the engine cuts is that much longer.
  const infill = resultOf(id).panels.find((p) => p.role === 'infill' && p.meta?.side === 'left');
  assert.ok(infill, 'the filler is cut');
  assert.ok(infill.h >= unit().params.height + top, 'and it reaches the ceiling');
});
