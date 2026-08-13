// ─── TURN 28 F9 — the back inset on the quick menu, and end panels ──────────
//
// The owner:
//
//   *Multi-select of floor-standing units (more than one selected) shows a
//   **Back inset** field in the quick menu, UNDER the dimension numbers. It
//   moves the whole selected run off the wall; every END PANEL in that run
//   deepens automatically so it always reaches the wall (panel depth = unit
//   depth + inset). Single-selection and wall units: no field.*
//
// Two halves and one of them is a CUT-LIST change, named where it shows:
//
//   F9.1  the field, on a multi-selection of floor-standing units only;
//   F9.2  the inset reaches `paramsForEngine` like every project decision, and
//         it moves the whole run in one batch and one undo;
//   F9.3  the END PANEL's cut size grows with it — turn 8 kept the two apart
//         and the owner overrules that here.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const PANEL = readFileSync(new URL('../src/components/MultiUnitPanel.jsx', import.meta.url), 'utf8');

const store = () => useProjectStore.getState();
const history = () => useHistoryStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => store().unitResult(id);
const epOf = (id) => resultOf(id).panels.find((p) => p.part === 'END-PANEL');

function project() {
  store().loadProject({
    id: null,
    name: 't28-f9',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

const GAP = P.room.wallBackClearance;

// ─── F9.3 — the end panel reaches the wall ─────────────────────────────────

test('F9.3 the panel is cut DEEPER by exactly the inset, and starts at the wall', () => {
  for (const inset of [0, 20, 40, 100]) {
    const r = computeCabinet({
      ...defaultParamsFor('BUD', P),
      unit_num: '01',
      end_panels: [{ side: 'R' }],
      inset_back_mm: inset,
    }, P);
    const ep = r.panels.find((p) => p.part === 'END-PANEL');
    assert.equal(
      ep.w,
      GAP + inset + r.params.depth + P.doors.gap + r.params.front_t,
      `${inset}: unit depth + inset, and the standing clearance every unit has`,
    );
    // …and it STARTS at the wall, which is now that much further back.
    assert.equal(ep.box.z, GAP + inset > 0 ? -(GAP + inset) : 0);
    // …and still finishes flush with the door, which is what it is for.
    const door = r.panels.find((p) => p.part === 'FRONT');
    assert.equal(ep.box.z + ep.box.d, door.box.z + door.box.d, 'flush with the face');
  }
});

test('F9.3 …and a bare kit call with no inset cuts exactly what it cut yesterday', () => {
  const bare = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', end_panels: [{ side: 'R' }],
  }, P);
  const ep = bare.panels.find((p) => p.part === 'END-PANEL');
  assert.equal(ep.w, GAP + bare.params.depth + P.doors.gap + bare.params.front_t);
  assert.equal(ep.box.z, -GAP);
});

// ─── F9.2 — it moves the RUN, in one batch ─────────────────────────────────

test('F9.2 the field moves every selected cabinet, and their panels with them', () => {
  project();
  const a = store().addUnit('BUD');
  const b = store().addUnit('BUD', { near: a.id, side: 'right' });
  const c = store().addUnit('BUD', { near: b.id, side: 'right' });
  // The end panel goes on the RUN's own right-hand end, which is where there
  // is room for one — a panel between two butted cabinets is refused, and
  // rightly (turn 3, phase 4).
  const added = store().addEndPanel(c.id, { side: 'R' });
  assert.equal(added.error, null, 'the outer end of the run takes a panel');
  const before = epOf(c.id).w;

  const { applied, skipped } = store().setUnitInsetsBulk([a.id, b.id, c.id], { back: 40 });
  assert.equal(applied, 3, 'all three moved');
  assert.equal(skipped, 0);
  for (const u of [a, b, c]) {
    assert.equal(unitOf(u.id).params.inset_back_mm, 40, `${u.id} stands 40 off the wall`);
  }
  assert.equal(epOf(c.id).w, before + 40, 'and that panel reaches the wall');
});

test('F9.2 …and it is ONE undo step, like every other bulk action', () => {
  project();
  watchProjectHistory();
  const a = store().addUnit('BUD');
  const b = store().addUnit('BUD', { near: a.id, side: 'right' });
  flushHistory();
  const before = JSON.parse(JSON.stringify(store().units));
  const depth = history().past.length;

  store().setUnitInsetsBulk([a.id, b.id], { back: 40 });
  flushHistory();
  assert.equal(unitOf(a.id).params.inset_back_mm, 40);
  assert.equal(unitOf(b.id).params.inset_back_mm, 40);
  assert.equal(history().past.length, depth + 1, 'two cabinets moved in one act, one entry');
  assert.ok(history().undo());
  assert.deepEqual(JSON.parse(JSON.stringify(store().units)), before, 'one Ctrl+Z puts both back');
  unwatchProjectHistory();
});

test('F9.2 a WALL unit in the selection is SKIPPED, not moved and not refused', () => {
  project();
  const a = store().addUnit('BUD');
  const w = store().addUnit('WUD');
  const { applied, skipped } = store().setUnitInsetsBulk([a.id, w.id], { back: 40 });
  assert.equal(applied, 1);
  assert.equal(skipped, 1, 'a bracket is what "off the wall" already means for it');
  assert.equal(unitOf(a.id).params.inset_back_mm, 40);
  assert.equal(Number(unitOf(w.id).params.inset_back_mm) || 0, 0);
  assert.equal(getUnitType('WUD').mount, 'wall');
});

test('F9.2 the number is the store’s own clamp, not a second one', () => {
  project();
  const a = store().addUnit('BUD');
  const b = store().addUnit('BUD', { near: a.id, side: 'right' });
  store().setUnitInsetsBulk([a.id, b.id], { back: -50 });
  assert.equal(unitOf(a.id).params.inset_back_mm, 0, 'never negative');
  store().setUnitInsetsBulk([a.id, b.id], { back: 10 ** 6 });
  assert.equal(unitOf(a.id).params.inset_back_mm, P.editor.maxInset, 'and never past the profile');
});

// ─── F9.1 — where the field is, and where it is not ────────────────────────

test('F9.1 the field is on the MULTI panel, under the dimension numbers', () => {
  // The two dimension fields (height, depth) come first; the inset follows
  // them, and the board/front thicknesses follow it.
  const dims = PANEL.indexOf("{ key: 'height', label: 'Height' }");
  const inset = PANEL.indexOf('data-multi-back-inset="1"');
  const boards = PANEL.indexOf("['board_t', 'Board (mm)'");
  assert.ok(dims > 0 && inset > 0 && boards > 0);
  assert.ok(dims < inset, 'under the dimension numbers');
  assert.ok(inset < boards, '…and above the boards');
});

test('F9.1 it is offered on a run of floor units and NOWHERE else', () => {
  assert.match(PANEL, /const floorStanding = selected\.filter\(\(u\) => getUnitType\(u\.type\)\?\.mount === 'floor'\);/);
  assert.match(PANEL, /const offersBackInset = selected\.length > 1 && floorStanding\.length === selected\.length;/);
  assert.match(PANEL, /\{offersBackInset && \(/);
  // …and it writes through the bulk setter, which is the store's single-unit
  // action repeated — never a second clamp in a component.
  assert.match(PANEL, /setUnitInsetsBulk\(ids, \{ back: v \}\)/);
  assert.doesNotMatch(PANEL, /inset_back_mm:/, 'the component writes no param directly');
});

test('F9.1 a SINGLE selection keeps the field it has always had, in the right panel', () => {
  const right = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.match(right, /function Insets\(\{ unit, profile, onSet \}\)/, 'the one-cabinet field stands');
  assert.match(right, /onCommit=\{\(v\) => onSet\(\{ back: v \}\)\}/);
});
