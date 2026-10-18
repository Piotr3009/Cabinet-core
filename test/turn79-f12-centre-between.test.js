/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── TURN 79 · F12 · CENTER BETWEEN TWO ELEMENTS ───────────────────────────
//
// The owner, 18.10.2026: *"naciskasz wycentruj pomiędzy, wybierasz dolny i
// górny element i wtedy wszystkie półki pomiędzy tymi elementami się
// centrują."*
//
// Every claim is asked of the ENGINE's own panels after the store acted: the
// clear gaps between the two picked faces, what stayed where it was, and the
// sentence the refusal says. The two-pick mode is the shared uiStore's, read
// by `selectElement`; the project store runs the act on the second pick.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  useProjectStore, centreBetweenPick, CENTRE_BETWEEN_SAY,
} from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const G = P.board.thickness;

const itemsOf = (unitId) => S().units.find((u) => u.id === unitId).params.sections[0].items;
const panelsOf = (unitId) => S().unitResult(unitId).panels;
const panelOfItem = (unitId, itemId) => panelsOf(unitId).find((p) => p.meta?.itemId === itemId);
const shelfY = (unitId) => Object.fromEntries(itemsOf(unitId).filter((i) => i.kind === 'shelf')
  .map((i) => [i.id, panelOfItem(unitId, i.id).box.y]));

function aRoom() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  U().clearSelection();
}

/** A 1200 x 2200 wardrobe, a FIX shelf at 600 and three shelves above it, uneven. */
function aWardrobe() {
  aRoom();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addItem(id, { kind: 'shelf', variant: 'fixed', pos_mm: 600 });
  for (const pos of [700, 780, 1500]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos });
  const fix = itemsOf(id).find((i) => i.variant === 'fixed');
  const loose = itemsOf(id).filter((i) => i.kind === 'shelf' && i.variant !== 'fixed');
  return { id, fix, loose, fixRef: panelOfItem(id, fix.id).id };
}

/** The clear openings between two faces, given the undersides of the shelves in it. */
function clearGaps(from, to, undersides) {
  const ys = [...undersides].sort((a, b) => a - b);
  const faces = [from, ...ys.flatMap((y) => [y, y + G]), to];
  const out = [];
  for (let i = 0; i < faces.length; i += 2) out.push(faces[i + 1] - faces[i]);
  return out;
}

const assertEven = (gaps, step = P.editor.mmStep) => {
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) <= step + 1e-9, `the gaps are not equal: ${gaps.join(', ')}`);
};

// ─── 1 · THE ACT: FIX AND TOP, EQUAL GAPS ─────────────────────────────────

test('F12 · picks (FIX shelf at 600, TOP): the three shelves between come out on equal clear gaps', () => {
  const { id, fix, loose, fixRef } = aWardrobe();
  const top = panelsOf(id).find((p) => p.id === 'TOP');
  assert.equal(panelOfItem(id, fix.id).box.y, 600, 'the FIX shelf is not at 600');
  const said = S().centreShelvesBetween(id, fixRef, 'TOP');
  assert.deepEqual(said, { ok: true, count: 3 });
  const y = shelfY(id);
  const from = 600 + G;
  const to = top.box.y;
  assert.equal(to, 2200 - G);
  const gaps = clearGaps(from, to, loose.map((sh) => y[sh.id]));
  assert.equal(gaps.length, 4, 'three shelves make four openings');
  assertEven(gaps);
  // The arithmetic is Center all's: (2182 - 618 - 3 x 18) / 4 = 377.5.
  assert.ok(Math.abs(gaps[0] - 377.5) <= P.editor.mmStep);
  // The FIX shelf never moves.
  assert.equal(y[fix.id], 600);
});

test('F12 · the picks are read by height: (TOP, FIX) is the same act', () => {
  const a = aWardrobe();
  S().centreShelvesBetween(a.id, a.fixRef, 'TOP');
  const first = a.loose.map((sh) => shelfY(a.id)[sh.id]);
  const b = aWardrobe();
  S().centreShelvesBetween(b.id, 'TOP', b.fixRef);
  assert.deepEqual(b.loose.map((sh) => shelfY(b.id)[sh.id]), first);
});

test('F12 · the drawer cap is a pick: shelves above it spread from its top face', () => {
  aRoom();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addDrawers(id, 2, 'internal');
  for (const pos of [900, 950, 1000]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos });
  const cap = panelsOf(id).find((p) => p.id === 'PARTITION');
  assert.ok(cap, 'no drawer cap');
  assert.ok(centreBetweenPick(cap));
  assert.deepEqual(S().centreShelvesBetween(id, 'PARTITION', 'TOP'), { ok: true, count: 3 });
  const y = shelfY(id);
  assertEven(clearGaps(cap.box.y + cap.box.h, 2200 - G, Object.values(y)));
  // …and from the BOTTOM the cap stands in the way: a fixed board, refused.
  const before = shelfY(id);
  assert.deepEqual(S().centreShelvesBetween(id, 'BOTTOM', 'TOP'), { ok: false, error: CENTRE_BETWEEN_SAY.fixed });
  assert.deepEqual(shelfY(id), before);
});

// ─── 2 · THE REFUSALS, IN WORDS ───────────────────────────────────────────

test('F12 · a FIX shelf between the picks refuses with the owner\'s sentence, and nothing moves', () => {
  const { id } = aWardrobe();
  const before = shelfY(id);
  const said = S().centreShelvesBetween(id, 'BOTTOM', 'TOP');
  assert.equal(said.ok, false);
  assert.equal(said.error, 'A fixed shelf stands between your picks; centring stops at it.');
  assert.deepEqual(shelfY(id), before);
});

test('F12 · picks in two different bays refuse in words, and nothing moves', () => {
  aRoom();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addPartition(id, 591);
  S().addShelves(id, 2, 0);
  S().addShelves(id, 2, 1);
  const inBay = (bay) => itemsOf(id).filter((i) => i.kind === 'shelf' && i.zone === bay);
  const left = panelOfItem(id, inBay(0)[0].id).id;
  const right = panelOfItem(id, inBay(1)[1].id).id;
  const before = shelfY(id);
  const said = S().centreShelvesBetween(id, left, right);
  assert.deepEqual(said, { ok: false, error: CENTRE_BETWEEN_SAY.bays });
  assert.match(said.error, /two different bays/);
  assert.deepEqual(shelfY(id), before);
});

test('F12 · one bay named, that bay only: (bay 1 shelf, TOP) leaves bay 0 where it was', () => {
  aRoom();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addPartition(id, 591);
  for (const pos of [400, 500]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos, zone: 0 });
  for (const pos of [300, 1200, 1250, 1300]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos, zone: 1 });
  const bay = (z) => itemsOf(id).filter((i) => i.kind === 'shelf' && i.zone === z);
  const lowest = [...bay(1)].sort((a, b) => a.pos_mm - b.pos_mm)[0];
  const lowerRef = panelOfItem(id, lowest.id).id;
  const leftBefore = bay(0).map((sh) => shelfY(id)[sh.id]);
  assert.deepEqual(S().centreShelvesBetween(id, lowerRef, 'TOP'), { ok: true, count: 3 });
  assert.deepEqual(bay(0).map((sh) => shelfY(id)[sh.id]), leftBefore, 'bay 0 moved');
  const y = shelfY(id);
  const ups = bay(1).filter((sh) => sh.id !== lowest.id).map((sh) => y[sh.id]);
  assertEven(clearGaps(y[lowest.id] + G, 2200 - G, ups));
});

test('F12 · nothing between, the same board twice, a board that is no pick: each refused in words', () => {
  const { id, fixRef } = aWardrobe();
  assert.deepEqual(S().centreShelvesBetween(id, 'BOTTOM', fixRef), { ok: false, error: CENTRE_BETWEEN_SAY.none });
  assert.deepEqual(S().centreShelvesBetween(id, 'TOP', 'TOP'), { ok: false, error: CENTRE_BETWEEN_SAY.same });
  assert.deepEqual(S().centreShelvesBetween(id, 'BACK', 'TOP'), { ok: false, error: CENTRE_BETWEEN_SAY.kind });
  assert.deepEqual(S().centreShelvesBetween(id, 'BUL', 'TOP'), { ok: false, error: CENTRE_BETWEEN_SAY.kind });
  for (const sentence of Object.values(CENTRE_BETWEEN_SAY)) assert.ok(sentence.length > 20 && /\.$/.test(sentence));
});

test('F12 · what may be picked: a shelf, the drawer cap, the bottom, the top; never a side or the back', () => {
  const box = { x: 0, y: 0, z: 0, w: 1, h: 1, d: 1 };
  for (const part of ['SHELF', 'PARTITION', 'BOTTOM', 'TOP']) assert.ok(centreBetweenPick({ part, box }), part);
  for (const part of ['BUL', 'BUR', 'BACK', 'VPART', 'FRONT', 'PLINTH']) assert.ok(!centreBetweenPick({ part, box }), part);
  assert.ok(!centreBetweenPick({ part: 'SHELF' }), 'a panel with no box is no pick');
});

// ─── 3 · THE TWO-PICK MODE, AS THE CLIENT CLICKS ──────────────────────────

// The 3D press on a board hands `selectElement` the pick as `{ pick: true }`
// (UnitView); these calls are that press.
const PICK = { pick: true };

test('F12 · armed, the next two clicks are picks; the second runs the act and ends the mode', () => {
  const { id, loose, fixRef } = aWardrobe();
  const shelfRef = panelOfItem(id, loose[0].id).id;
  U().selectElement(id, shelfRef);
  U().armCentreBetween(id);
  assert.deepEqual(U().centreBetween, { unitId: id, lower: null, upper: null });
  U().selectElement(id, fixRef, PICK);
  assert.deepEqual(U().centreBetween, { unitId: id, lower: fixRef, upper: null });
  // The selection stayed on the shelf whose menu armed the mode.
  assert.deepEqual(U().selectedElement, { unitId: id, elementRef: shelfRef });
  U().selectElement(id, 'TOP', PICK);
  assert.equal(U().centreBetween, null, 'the mode outlived its second pick');
  assert.deepEqual(U().selectedElement, { unitId: id, elementRef: shelfRef });
  assertEven(clearGaps(600 + G, 2200 - G, loose.map((sh) => shelfY(id)[sh.id])));
});

test('F12 · a refusal through the mode is SAID (a yellow), never silent', () => {
  const { id } = aWardrobe();
  U().armCentreBetween(id);
  U().selectElement(id, 'BOTTOM', PICK);
  U().selectElement(id, 'TOP', PICK);
  assert.equal(U().centreBetween, null);
  assert.ok(U().messages.some((m) => (m.baseMessage || m.message) === CENTRE_BETWEEN_SAY.fixed),
    'the refusal was not said');
});

test('F12 · a click elsewhere ends the mode: another cabinet, the selection cleared, the element let go', () => {
  const { id } = aWardrobe();
  const { id: other } = S().addUnit('WARDROBE', { params: { width: 600, height: 2200, depth: 600 } });
  U().armCentreBetween(id);
  U().selectElement(other, 'TOP');
  assert.equal(U().centreBetween, null, 'a click in another cabinet did not end it');
  assert.deepEqual(U().selectedElement, { unitId: other, elementRef: 'TOP' });
  U().armCentreBetween(other);
  U().clearElement();
  assert.equal(U().centreBetween, null);
  U().armCentreBetween(id);
  U().clearSelection();
  assert.equal(U().centreBetween, null);
  U().selectUnit(id);
  U().armCentreBetween(id);
  U().selectUnit(other);
  assert.equal(U().centreBetween, null, 'selecting another cabinet did not end it');
  U().armCentreBetween(id);
  U().cancelCentreBetween();
  assert.equal(U().centreBetween, null);
});

test('F12 · only the press on a board is a pick: a selection made any other way on the same cabinet ends the mode', () => {
  const { id, loose } = aWardrobe();
  const shelfRef = panelOfItem(id, loose[0].id).id;
  const before = shelfY(id);
  // A Check row naming a side of THIS cabinet: a click elsewhere, never a pick.
  U().selectElement(id, shelfRef);
  U().armCentreBetween(id);
  U().selectElement(id, 'BUL');
  assert.equal(U().centreBetween, null, 'a plain selection was read as a pick');
  assert.deepEqual(U().selectedElement, { unitId: id, elementRef: 'BUL' });
  assert.deepEqual(shelfY(id), before);
});

test('F12 · an Undo while armed ends the mode and never hands it the selected shelf as a pick', () => {
  watchProjectHistory();
  try {
    const { id, loose } = aWardrobe();
    const shelfRef = panelOfItem(id, loose[0].id).id;
    U().selectElement(id, shelfRef);
    flushHistory();
    useHistoryStore.getState().clear();
    S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: 1800 });
    flushHistory();
    assert.ok(useHistoryStore.getState().past.length > 0, 'nothing to undo');
    U().armCentreBetween(id);
    useHistoryStore.getState().undo();
    // The undo re-selects the shelf through `selectElement`: that is not a pick.
    assert.equal(U().centreBetween, null, 'the undo re-selection was read as the lower pick');
    assert.deepEqual(U().selectedElement, { unitId: id, elementRef: shelfRef });
  } finally {
    unwatchProjectHistory();
  }
});

// ─── 4 · THE ENTRY, THE PICK, THE LIGHT, IN THE SOURCE ────────────────────

test('F12 · the button stands beside Center all, the same width, in PRO and (through the copy) in retail', () => {
  for (const rel of ['src/components/ElementProperties.jsx', 'src/retail/design/detail/ElementProperties.jsx']) {
    const src = read(rel);
    // Two columns of one width (PRO's `grid-cols-2`, the copy's skin `pbi-re-grid-2`).
    assert.match(src, /<div className="[^"]*grid-(?:cols-)?2[^"]*">\s*<button[\s\S]{0,200}data-centre-shelves="1"[\s\S]{0,900}data-centre-between="1"/, `${rel}: not side by side`);
    assert.match(src, /data-centre-between="1"/, `${rel}: no Center between`);
    assert.match(src, />\s*Center between\s*</);
    assert.match(src, /armCentreBetween\(unit\.id\)/);
    assert.match(src, /'Pick the upper element' : 'Pick the lower element'/);
    assert.match(src, /data-centre-between-step=/);
    // Escape ends the picking on its way down, before the page's own Escape.
    assert.match(src, /window\.addEventListener\('keydown', onKey, true\)/);
    assert.match(src, /cancelCentreBetween\(\);/);
  }
});

test('F12 · the pick is `selectElement`: the view hands it on, the uiStore reads it, the project store runs it', () => {
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /if \(useUiStore\.getState\(\)\.centreBetween\?\.unitId === unit\.id\) \{\s*if \(centreBetweenPick\(p\)\) \{\s*e\.stopPropagation\(\);\s*onSelectElement\?\.\(p\.id, \{ pick: true \}\);/);
  // …and Scene hands the opts on to `selectElement` unchanged.
  assert.match(read('src/3d/Scene.jsx'), /onSelectElement=\{\(panelId, opts\) => selectElement\(unit\.id, panelId, opts\)\}/);
  // A door in front of the lit top lets the press through to it; nothing behind ends the mode.
  assert.match(view, /if \(pickBehind\(e\)\) return;\s*cancelCentreBetween\(\);/);
  assert.match(view, /at\?\.userData\?\.ccUnitId === unit\.id && centreBetweenPick\(/);
  // The candidates lit, the lower pick marked.
  assert.match(view, /centreBetween && !contour && result\.panels\s*\.filter\(\(p\) => centreBetweenPick\(p\) && p\.id !== centreBetween\.lower\)/);
  // The lower pick wears the click's own mark through the set's outlines:
  // still ONE component and three sites (turn36-f2 counts them).
  assert.match(view, /\.\.\.\(centreBetween\?\.lower \? \[centreBetween\.lower\] : \[\]\)/);
  assert.equal((view.match(/<SelectionOutline/g) || []).length, 3);
  const ui = read('src/stores/uiStore.js');
  assert.match(ui, /centreBetween: null, {15}\/\/ \{ unitId, lower, upper \} \| null/);
  assert.match(ui, /const armed = s\.centreBetween;\s*if \(pick && armed && armed\.unitId === unitId && elementRef\)/);
  assert.ok(!/useProjectStore/.test(ui), 'the uiStore reads the project store');
  // The cabinet editor's own canvas (its shelf menu carries the button too):
  // a click on a pick is the pick, anything else ends the mode; Escape ends
  // the picking and keeps the piece in hand.
  const editor = read('src/components/CabinetEditorModal.jsx');
  assert.match(editor, /if \(id && centreBetweenPick\(panels\.find\(\(p\) => p\.id === id\)\)\) \{\s*ui\.selectElement\(unit\.id, id, \{ pick: true \}\);/);
  assert.match(editor, /ui\.cancelCentreBetween\(\);\s*\}\s*setSelectedId\(id\);/);
  assert.match(editor, /onSelect=\{selectOrPick\}/);
  assert.match(editor, /if \(ui\.centreBetween\?\.unitId === args\?\.unitId\) \{ ui\.cancelCentreBetween\(\); return; \}/);
  const store = read('src/stores/projectStore.js');
  assert.match(store, /useUiStore\.subscribe\(\(ui\) => \{/);
  assert.match(store, /centreShelvesBetween: \(unitId, lowerRef, upperRef\) => runBatch\(/);
});
