/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// === TURN 79 F2 . A FULL-WIDTH SHELF ABOVE THE DIVIDER (the third button) =====
//
// The owner, 18.10.2026: *"jak dodamy fix półkę i divider pod spodem to nie mam
// możliwości dodania całkowitej półki powyżej bo kod dzieli mi całą szafę na
// bay 1 i 2, a nie mam czegoś takiego że jest bay nie dzielony powyżej."*
// Mockup approved 14:45: *"1 - tak."*
//
// The engine already ends the divider under the lowest FIX shelf above its
// floor (`engine/zones.js partitionSpan`); this turn names the opening above it
// (`projectStore.aboveDividerOf`), offers it as a third button in WHICH SIDE,
// lights it on the canvas, centres full-width shelves in it, and refuses in
// words a full-width shelf asked for below the divider top.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FULL_WIDTH_CROSSES_DIVIDER, aboveDividerOpening, useProjectStore,
} from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();
const history = () => useHistoryStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);
const shelvesOf = (id) => unitOf(id).params.sections[0].items.filter((i) => i.kind === 'shelf');
const said = (text) => ui().messages.some((m) => (m.baseMessage || m.message) === text);

const SENTENCE = 'A full-width shelf cannot cross the divider; pick a bay or raise it above the divider.';

/** THE CASE: a 1200 wardrobe, a FIX shelf at 1000, a divider below it. */
function wardrobe({ fix = true } = {}) {
  store().loadProject({
    id: null,
    name: 't79-f02',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  ui().clearMessages();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 1200 });
  const fixId = fix ? store().addItem(id, { kind: 'shelf', variant: 'fixed', pos_mm: 1000 }) : null;
  store().addPartition(id);
  history().clear();
  return { id, fixId };
}

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

test('F2 . the sentence is the one CLAUDE.md gives, word for word', () => {
  assert.equal(FULL_WIDTH_CROSSES_DIVIDER, SENTENCE);
});

test('F2 . the case as the engine cuts it: the divider stands under the FIX shelf, and the opening above is named', () => {
  const { id, fixId } = wardrobe();
  const unit = unitOf(id);
  assert.equal(unit.params.width, 1200);
  assert.equal(unit.params.height, 2150, 'the wardrobe the store builds is 2150 high');
  const r = store().unitResult(id);
  const vpart = r.panels.filter((p) => p.part === 'VPART');
  assert.equal(vpart.length, 1);
  // The engine, not one line moved: from the floor (18) to the FIX shelf's underside (1000).
  assert.deepEqual({ y: vpart[0].box.y, h: vpart[0].box.h }, { y: 18, h: 982 });
  assert.equal(vpart[0].meta.terminatesOn, fixId);
  // The two bays the picker offered until tonight, 573 each.
  assert.deepEqual(store().zonesOf(id).map((z) => z.size), [573, 573]);
  // The third: from the FIX shelf's top face (1018) to the top's underside (2150 - 18), full width (1164).
  assert.deepEqual(store().aboveDividerOf(id), {
    from: 1018, to: 2132, height: 1114, width: 1164,
  });
  // One answer: the store's action and the pure function the canvas asks agree.
  assert.deepEqual(aboveDividerOpening(unit, P, r), store().aboveDividerOf(id));
});

test('F2 . addShelves(..., 2, "above"): two full-width shelves between 1018 and the top, equal gaps', () => {
  const { id } = wardrobe();
  const res = store().addShelves(id, 2, 'above');
  assert.deepEqual(res, { added: 2, requested: 2 });
  const added = shelvesOf(id).filter((s) => s.variant === 'adjustable').sort((a, b) => a.pos_mm - b.pos_mm);
  assert.equal(added.length, 2);
  for (const s of added) {
    assert.ok(s.zone == null, 'zone: null, the full width');
    assert.ok(!('zone' in s), 'no zone is written, as on every full-width shelf');
    assert.ok(s.pos_mm > 1018 && s.pos_mm + 18 < 2132, `${s.pos_mm} lies between 1018 and the top`);
  }
  // evenShelfPositions({zoneBottom: 1018, zoneTop: 2132, count: 2, boardT: 18}) on the workshop grid.
  assert.deepEqual(added.map((s) => s.pos_mm), [1377.5, 1754.5]);
  const gaps = [added[0].pos_mm - 1018, added[1].pos_mm - (added[0].pos_mm + 18), 2132 - (added[1].pos_mm + 18)];
  const spread = Math.max(...gaps) - Math.min(...gaps);
  assert.ok(spread <= P.editor.mmStep, `equal gaps to the workshop grid: ${gaps.join(' / ')}`);
  // The engine cuts them full width (x 18 + clearance, the whole light) and the divider stays where it was.
  const r = store().unitResult(id);
  const cut = r.panels.filter((p) => p.part === 'SHELF' && p.box.y > 1018);
  assert.equal(cut.length, 2);
  for (const p of cut) assert.equal(p.box.w, 1164 - P.carcass.shelfWidthClearance);
  const vpart = r.panels.find((p) => p.part === 'VPART');
  assert.deepEqual({ y: vpart.box.y, h: vpart.box.h }, { y: 18, h: 982 });
  assert.equal(said(SENTENCE), false);
});

test('F2 . one click, one undo step', () => {
  const { id } = wardrobe();
  const before = shelvesOf(id).length;
  store().addShelves(id, 2, 'above');
  flushHistory();
  assert.equal(shelvesOf(id).length, before + 2);
  assert.equal(history().undo(), true);
  assert.equal(shelvesOf(id).length, before, 'both shelves go with one undo');
});

test('F2 . a shelf already above: the next ones go in the biggest gap, never on it', () => {
  const { id } = wardrobe();
  store().addShelves(id, 1, 'above');
  const [first] = shelvesOf(id).filter((s) => s.variant === 'adjustable');
  assert.equal(first.pos_mm, 1566, 'one shelf: centred in 1018..2132');
  const res = store().addShelves(id, 2, 'above');
  assert.equal(res.added, 2);
  const ys = shelvesOf(id).map((s) => s.pos_mm).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i += 1) assert.ok(ys[i] - ys[i - 1] >= 18 + P.editor.minShelfGap, `no shelf on a shelf: ${ys.join(', ')}`);
  for (const y of ys.filter((v) => v !== 1000)) assert.ok(y > 1018, 'never below the divider top');
});

test('F2 . asked at 500, a full-width shelf is refused in words, never clipped', () => {
  const { id } = wardrobe();
  store().addShelves(id, 1, 'above');
  const [shelf] = shelvesOf(id).filter((s) => s.variant === 'adjustable');
  const was = shelf.pos_mm;
  const state = store().moveShelf(id, shelf.id, 500);
  assert.equal(state.blocked, true);
  assert.equal(state.refused, SENTENCE);
  assert.equal(state.pos, was, 'it stays where it was: refused, not clipped to the FIX shelf');
  assert.equal(shelvesOf(id).find((s) => s.id === shelf.id).pos_mm, was);
  assert.ok(said(SENTENCE), 'the refusal is said, in yellow');
  assert.equal(ui().messages.find((m) => (m.baseMessage || m.message) === SENTENCE).level, 'yellow');
  // The typed number goes through the same setter and is refused the same way.
  assert.equal(store().setShelfPos(id, shelf.id, 500).refused, SENTENCE);
  // Above the divider top it moves as any shelf does.
  assert.equal(store().setShelfPos(id, shelf.id, 1500).pos, 1500);
});

test('F2 . a full-width add whose opening lies under the divider top is refused, nothing is added', () => {
  const { id } = wardrobe();
  // Two shelves above leave 18..1000 the biggest opening: the centre lands at 491, through the divider.
  store().addShelves(id, 2, 'above');
  ui().clearMessages();
  const count = shelvesOf(id).length;
  const res = store().addShelves(id, 1, null);
  assert.equal(res.added, 0);
  assert.equal(res.refused, SENTENCE);
  assert.equal(shelvesOf(id).length, count, 'nothing clipped into the opening above, nothing added');
  assert.ok(said(SENTENCE));
  // The multi-select "a shelf in each" (MultiUnitPanel) rides the same add and is refused the same way.
  ui().clearMessages();
  assert.deepEqual(store().addShelvesBulk([id], 1), { added: 0, skipped: 0 });
  assert.equal(shelvesOf(id).length, count);
  assert.ok(said(SENTENCE));
});

test('F2 . a bay shelf is not a full-width shelf: it goes below the divider top freely', () => {
  const { id } = wardrobe();
  const bayId = store().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: 500, zone: 0 });
  assert.equal(shelvesOf(id).find((s) => s.id === bayId).pos_mm, 500);
  assert.equal(store().setShelfPos(id, bayId, 600).pos, 600);
  assert.equal(said(SENTENCE), false);
});

test('F2 . a full-width shelf that already stood across a divider (older than it) moves as it always did', () => {
  const { id } = wardrobe({ fix: false });
  // The divider came after the shelf: a project as the app could save it before tonight.
  const items = unitOf(id).params.sections[0].items;
  const old = { id: 'shelf_old', kind: 'shelf', variant: 'adjustable', pos_mm: 500 };
  useProjectStore.setState((s) => ({
    units: s.units.map((u) => (u.id === id
      ? { ...u, params: { ...u.params, sections: [{ ...u.params.sections[0], items: [...items, old] }] } }
      : u)),
  }));
  const state = store().setShelfPos(id, 'shelf_old', 520);
  assert.equal(state.refused, undefined);
  assert.equal(state.pos, 520);
  assert.equal(said(SENTENCE), false);
});

test('F2 . a divider to the top leaves no opening above: no third button, nothing added', () => {
  const { id } = wardrobe({ fix: false });
  assert.equal(store().aboveDividerOf(id), null);
  assert.deepEqual(store().addShelves(id, 2, 'above'), { added: 0, requested: 2 });
  assert.equal(shelvesOf(id).length, 0);
  // With no divider top below the top there is nothing to be below: the plain add keeps its old law.
  assert.equal(store().addShelves(id, 1, null).added, 1);
  assert.equal(said(SENTENCE), false);
});

test('F2 . the picker: a third button with its hook, the light, the hover sentinel; PRO and its retail copy', () => {
  for (const rel of ['src/components/AddItems.jsx', 'src/retail/design/detail/AddItems.jsx']) {
    const src = read(rel);
    assert.match(src, /data-above-divider="1"/, `${rel}: the walk's hook`);
    assert.match(src, /Above divider · \{formatMm\(above\.width\)\}/, `${rel}: the label and its light`);
    assert.match(src, /onZoneHover\?\.\('above'\)/, `${rel}: hovering lights the opening`);
    assert.match(src, /aboveDividerOf/, `${rel}: shown only when the store names an opening`);
    // Room refuses first and never silently: an opening that went away while
    // picked brings the "pick the bay" line back instead of a mute Add.
    assert.match(src, /\(shelfZone == null \|\| \(shelfZone === 'above' && !above\)\) && \(/, `${rel}: no mute Add`);
  }
  // The sentinel survives the ui store, and the canvas draws it.
  ui().setZoneHint('above');
  assert.equal(ui().zoneHint, 'above');
  ui().setZoneHint(1);
  assert.equal(ui().zoneHint, 1);
  ui().setZoneHint(null);
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /zoneHint === 'above' \? aboveDividerOpening\(unit, profile, result\)/);
});

test('F2 . the engine: not one line', () => {
  for (const rel of ['src/engine/zones.js', 'src/engine/cabinet.js']) {
    assert.doesNotMatch(read(rel), /T79 F2/, `${rel} carries no T79 F2 code`);
  }
});
