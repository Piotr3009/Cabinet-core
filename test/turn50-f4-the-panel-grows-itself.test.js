// ─── T50 · F4: A LOW UNIT MEETING A TALL ONE GROWS ITS OWN END PANEL ───────
//
// The owner, 25.08.2026:
//
//   *"w kuchni jak dodamy niską szafkę do wysokiej bez panela, powinien się
//   dodać panel automatycznie — i informacja na środku monitora: system dodał
//   panel wykończeniowy, chcesz to go usuń, naciśnij prawym myszką i usuń
//   panel."*
//
// Four things are asked of it:
//   it is a REAL end panel, on the same board and the same rules;
//   it carries `meta.autoAdded: true`;
//   the app SAYS what it did, in the middle of the screen;
//   removing it by hand is FINAL for that junction.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  autoEndPanelSpec, autoEndPanelJunctions, autoEndPanelMessage, isAutoEndPanel,
  declinedSides, withDeclined,
} from '../src/engine/endPanelAuto.js';
import { LEVELS } from '../src/engine/messages.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';

const ROOM = migrateRoom({ height: 2500, corners: rectCorners(6000, 4000) });

/** Two neighbours on wall 0, hand-built. */
function pair(a, b) {
  return [
    {
      id: 'lo',
      type: a.type,
      params: { width: 600, height: a.height, depth: 570, unit_num: '01', ...(a.params || {}) },
      position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    },
    {
      id: 'hi',
      type: b.type,
      params: { width: 600, height: b.height, depth: 570, unit_num: '02', ...(b.params || {}) },
      position: { wall: 0, x_mm: 600, rotation_deg: 0 },
    },
  ];
}

// ─── WHICH JUNCTIONS ───────────────────────────────────────────────────────

test('F4 · a base unit meeting a tall one is a junction, and the TALL one carries it', () => {
  const units = pair({ type: 'BUD', height: 770 }, { type: 'BUDTALL', height: 2150 });
  const found = autoEndPanelJunctions(units, P);
  assert.equal(found.length, 1);
  assert.equal(found[0].unitId, 'hi', 'the tall cabinet — its side is what shows');
  assert.equal(found[0].side, 'L', 'on the side facing the low run');
  assert.equal(found[0].otherId, 'lo');
  assert.ok(found[0].stepMm > P.autoParts.endPanel.autoStepMm);
});

test('F4 · two base units of the same height are not a junction', () => {
  const units = pair({ type: 'BUD', height: 770 }, { type: 'BUD', height: 770 });
  assert.deepEqual(autoEndPanelJunctions(units, P), []);
});

test('F4 · a step smaller than the profile’s is not a step', () => {
  assert.equal(autoEndPanelSpec(P).autoStepMm, 300, 'the line, from the profile');
  // 200 mm apart: a plinth difference, not a side that shows.
  const small = pair({ type: 'BUD', height: 770 }, { type: 'BUD', height: 970 });
  assert.deepEqual(autoEndPanelJunctions(small, P), []);
  const real = pair({ type: 'BUD', height: 770 }, { type: 'BUD', height: 1170 });
  assert.equal(autoEndPanelJunctions(real, P).length, 1, '400 is');
});

test('F4 · "w kuchni" — a wardrobe run of different heights is left alone', () => {
  const units = pair({ type: 'WARDROBE', height: 1200 }, { type: 'WARDROBE', height: 2150 });
  assert.deepEqual(autoEndPanelJunctions(units, P), [],
    'his own first two words: this is a kitchen rule');
});

test('F4 · two cabinets that are not MEETING are two runs, not a junction', () => {
  const units = pair({ type: 'BUD', height: 770 }, { type: 'BUDTALL', height: 2150 });
  units[1].position.x_mm = 2000;              // a metre and a half of clear wall
  assert.deepEqual(autoEndPanelJunctions(units, P), []);
});

test('F4 · a junction that is already finished — by either side — is left alone', () => {
  const mine = pair({ type: 'BUD', height: 770 }, { type: 'BUDTALL', height: 2150 });
  mine[1].params.end_panels = [{ id: 'x', side: 'L', thickness: 18 }];
  assert.deepEqual(autoEndPanelJunctions(mine, P), [], 'the tall one already has one');

  const theirs = pair({ type: 'BUD', height: 770 }, { type: 'BUDTALL', height: 2150 });
  theirs[0].params.end_panels = [{ id: 'y', side: 'R', thickness: 18 }];
  assert.deepEqual(autoEndPanelJunctions(theirs, P), [],
    'and a panel the low unit already carries finishes the same joint');
});

// ─── REMOVING IT BY HAND IS FINAL ──────────────────────────────────────────

test('F4 · a junction the joiner has cleared is never offered again', () => {
  const units = pair({ type: 'BUD', height: 770 }, { type: 'BUDTALL', height: 2150 });
  assert.equal(autoEndPanelJunctions(units, P).length, 1);

  units[1].params.end_panel_declined = ['L'];
  assert.deepEqual(autoEndPanelJunctions(units, P), [],
    'or the message becomes a nag and the feature becomes a fight');

  // …and the OTHER side of the same cabinet is a different junction.
  assert.deepEqual(declinedSides(units[1]), ['L']);
  assert.deepEqual(withDeclined(units[1], 'R'), ['L', 'R']);
  assert.deepEqual(withDeclined(units[1], 'L'), ['L'], 'and saying it twice says it once');
});

// ─── IT IS A REAL END PANEL ────────────────────────────────────────────────

test('F4 · the piece is the ordinary end panel, and it says who put it there', () => {
  const params = { ...defaultParamsFor('BUDTALL', P), unit_num: '02' };
  const hand = computeCabinet({
    ...params, end_panels: [{ id: 'ep', side: 'L', thickness: 18, height: 'floor' }],
  }, P);
  const auto = computeCabinet({
    ...params, end_panels: [{ id: 'ep', side: 'L', thickness: 18, height: 'floor', auto_added: true }],
  }, P);

  const handPanel = hand.panels.find((p) => p.part === 'END-PANEL');
  const autoPanel = auto.panels.find((p) => p.part === 'END-PANEL');
  assert.ok(handPanel && autoPanel, 'both are cut');
  assert.equal(autoPanel.w, handPanel.w, 'the same board');
  assert.equal(autoPanel.h, handPanel.h);
  assert.equal(autoPanel.thickness, handPanel.thickness);
  assert.deepEqual(autoPanel.cnc, handPanel.cnc, 'the same cut, hole for hole');

  assert.equal(autoPanel.meta.autoAdded, true, 'and it carries the note');
  assert.equal(handPanel.meta.autoAdded, undefined,
    'ABSENT on a hand-added one — so every project before tonight is byte for byte');
  assert.equal(isAutoEndPanel({ auto_added: true }), true);
  assert.equal(isAutoEndPanel({}), false);
});

// ─── THE MESSAGE ───────────────────────────────────────────────────────────

test('F4 · the sentence says what was done and how to undo it', () => {
  const msg = autoEndPanelMessage('02');
  assert.match(msg, /^02: /);
  assert.match(msg, /added a finishing end panel/i);
  assert.match(msg, /right-click/i, 'and the way back out, which is the second half of his sentence');
  assert.match(msg, /Remove/);
});

test('F4 · …in the middle of the screen, which is what a GREY is in this app', () => {
  assert.equal(LEVELS.grey.place, 'centre', '*"informacja na środku monitora"*');
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.ok(store.includes("notify(grown.message, 'info')"),
    'and `info` resolves to grey — engine/messages.js `levelOf`');
});

// ─── THE STORE, END TO END ─────────────────────────────────────────────────

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project() {
  store().loadProject({
    id: null, name: 'T50 F4', number: '50', client: 'the owner', room: ROOM, design: {},
  }, []);
  useUiStore.setState({ messages: [] });
}

test('F4 · adding a low unit beside a tall one grows the panel, and the app says so', () => {
  project();
  const tall = store().addUnit('BUDTALL');
  assert.ok(tall.id);
  const before = (unitOf(tall.id).params.end_panels || []).length;

  const low = store().addUnit('BUD', { near: tall.id, side: 'R' });
  assert.ok(low.id, low.error || '');

  const panels = unitOf(tall.id).params.end_panels || [];
  assert.equal(panels.length, before + 1, 'the tall cabinet grew one');
  const grown = panels[panels.length - 1];
  assert.equal(grown.side, 'R', 'on the side facing the low unit');
  assert.equal(grown.auto_added, true, 'and it is stamped');

  const said = useUiStore.getState().messages.map((m) => m.message).join(' | ');
  assert.match(said, /added a finishing end panel/i, 'and the app said what it did');
});

test('F4 · …and taking it off by hand is final for that junction', () => {
  project();
  const tall = store().addUnit('BUDTALL');
  const low = store().addUnit('BUD', { near: tall.id, side: 'R' });
  assert.ok(low.id);
  const grown = (unitOf(tall.id).params.end_panels || []).find((ep) => ep.auto_added);
  assert.ok(grown, 'it grew one');

  store().removeEndPanel(tall.id, grown.id);
  assert.deepEqual((unitOf(tall.id).params.end_panels || []).filter((ep) => ep.auto_added), [],
    'it is gone');
  assert.deepEqual(declinedSides(unitOf(tall.id)), ['R'], 'and the junction is remembered');

  // The next add re-runs the whole pass over the project; the cleared junction
  // must not come back with it.
  const another = store().addUnit('BUD', { near: low.id, side: 'R' });
  assert.ok(another.id);
  assert.deepEqual((unitOf(tall.id).params.end_panels || []).filter((ep) => ep.auto_added), [],
    'it stayed gone');
});

test('F4 · a kitchen of one height grows nothing at all', () => {
  project();
  const a = store().addUnit('BUD');
  const b = store().addUnit('BUD', { near: a.id, side: 'R' });
  assert.ok(b.id);
  for (const u of store().units) {
    assert.deepEqual((u.params.end_panels || []).filter((ep) => ep.auto_added), [],
      `${u.params.unit_num} grew nothing`);
  }
});

test('F4 · a WARDROBE project grows nothing — it is a kitchen rule', () => {
  project();
  const a = store().addUnit('WARDROBE');
  store().updateUnitParams(a.id, { height: 1200 });
  const b = store().addUnit('WARDROBE', { near: a.id, side: 'R' });
  assert.ok(b.id);
  for (const u of store().units) {
    assert.deepEqual((u.params.end_panels || []).filter((ep) => ep.auto_added), []);
  }
});
