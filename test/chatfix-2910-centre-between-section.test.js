/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 29.10.2026 · CENTER BETWEEN, WHERE THE OWNER LOOKS FOR IT ─────
//
// The owner, of the Studio (T84): *"jest ta funkcja ale tylko w double click
// ale nie ma w carcas lub w section a powinn byc bo zaznaczyc polki i kliknac
// center between to za duzo i za duzo szukania"* (29.10.2026, 06:01); before
// it: *"droban funcje ale jej nei ma czyli center between soprawdz jeszcze raz
// prosze"*.
//
// F1 · the Section's Shelves row carries Center all and Center between with no
//      shelf selected first (RightPanel.jsx ShelvesHead).
// F2 · the piece's window lets the two picks through to the scene while the
//      mode is armed on its cabinet (DoorModal.jsx `sticky`), so the double
//      click's road works in the Studio too: the walk found the first pick
//      eaten by the window's backdrop, the window closed, nothing centred.
//
// Every claim about the act is asked of the ENGINE's own panels after the
// stores acted, through the same calls the buttons make.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { escapeStep, escapeSnapshot } from '../src/components/studio/lib/studioEscape.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const G = P.board.thickness;

const itemsOf = (unitId) => S().units.find((u) => u.id === unitId).params.sections[0].items;
const panelsOf = (unitId) => S().unitResult(unitId).panels;
const panelOfItem = (unitId, itemId) => panelsOf(unitId).find((p) => p.meta?.itemId === itemId);
const shelvesOf = (unitId) => itemsOf(unitId).filter((i) => i.kind === 'shelf');
const undersides = (unitId) => shelvesOf(unitId).map((sh) => panelOfItem(unitId, sh.id).box.y);

/** The walk's wardrobe: 1000 x 2150 x 558, four adjustable shelves, uneven (248.5 under the two lowest). */
function theWalksWardrobe() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  U().clearSelection();
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth: 558 } });
  for (const pos of [266.5, 533, 1066, 1599]) S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: pos });
  U().selectUnit(id);
  const byPos = (mm) => shelvesOf(id).find((sh) => sh.pos_mm === mm);
  return { id, byPos };
}

/** The clear openings between two faces, given the undersides of the shelves in it. */
function clearGaps(from, to, ys) {
  const faces = [from, ...[...ys].sort((a, b) => a - b).flatMap((y) => [y, y + G]), to];
  const out = [];
  for (let i = 0; i < faces.length; i += 2) out.push(faces[i + 1] - faces[i]);
  return out;
}

const assertEven = (gaps) => {
  for (const g of gaps) assert.ok(Math.abs(g - gaps[0]) <= P.editor.mmStep + 1e-9, `the gaps are not equal: ${gaps.join(', ')}`);
};

// ─── F1 · THE SECTION'S SHELVES ROW ────────────────────────────────────────

test('F1 · the Shelves row draws ShelvesHead once, in both layouts, and the row\'s Even is gone', () => {
  const src = read('src/components/RightPanel.jsx');
  assert.equal((src.match(/<ShelvesHead unit=\{unit\} count=\{shelves\.length\} \/>/g) || []).length, 1);
  const line = src.split('\n').find((l) => l.includes('<ShelvesHead'));
  assert.doesNotMatch(line, /embedded/, 'the row is drawn in the Studio inspector and in the overlay alike');
  // It stands in the shelves block, before the shelf rows.
  const block = src.slice(src.indexOf('{type.supports.shelves && shelves.length > 0 && ('));
  assert.ok(block.indexOf('<ShelvesHead') < block.indexOf('{shelves.map(('), 'the head is not over the shelf rows');
  // Even was this row's Center all under a second name: one act, one word (T72 F3).
  assert.doesNotMatch(src, />\s*Even\s*</, 'the second name is still drawn');
  assert.doesNotMatch(src, /redistributeShelves/, 'the panel still calls the act by its second name');
});

test('F1 · Center all is the store\'s one name, every bay; Center between arms the shared mode on this cabinet', () => {
  const src = read('src/components/RightPanel.jsx');
  const head = src.slice(src.indexOf('function ShelvesHead({ unit, count }) {'), src.indexOf('function ElementSection('));
  assert.match(head, /data-section-centre-all="1"/);
  assert.match(head, /onClick=\{\(\) => centreShelves\(unit\.id, null\)\}/);
  assert.match(head, /data-section-centre-between="1"/);
  // The Studio's Escape ladder sees this button as a panel that cancels the mode itself (studioEscape.js readEscapeDom).
  assert.match(head, /data-centre-between="1"/);
  assert.match(head, /aria-pressed=\{Boolean\(centreBetween\)\}/);
  assert.match(head, /onClick=\{\(\) => \(centreBetween \? cancelCentreBetween\(\) : armCentreBetween\(unit\.id\)\)\}/);
  assert.match(head, /useUiStore\(\(s\) => \(s\.centreBetween\?\.unitId === unit\.id \? s\.centreBetween : null\)\)/);
  assert.match(head, /'Pick the upper element' : 'Pick the lower element'/);
  assert.match(head, /data-section-centre-between-step=\{centreBetween\.lower \? 'upper' : 'lower'\}/);
  // Escape ends the mode before any window or selection hears it, as the shelf menu's own listener does.
  assert.match(head, /window\.addEventListener\('keydown', onKey, true\);/);
  assert.match(head, /if \(e\.key !== 'Escape'\) return;\n\s+e\.stopPropagation\(\);\n\s+cancelCentreBetween\(\);/);
});

test('F1 · Center all from the Section is the act the row\'s Even pressed, byte for byte', () => {
  const a = theWalksWardrobe();
  S().centreShelves(a.id, null);
  const centred = shelvesOf(a.id).map((sh) => sh.pos_mm);
  // Even over the whole height: the bottom's top face to the top's underside.
  const bottom = panelsOf(a.id).find((p) => p.id === 'BOTTOM');
  const top = panelsOf(a.id).find((p) => p.id === 'TOP');
  assertEven(clearGaps(bottom.box.y + bottom.box.h, top.box.y, undersides(a.id)));
  // …and the row's Even, on the same wardrobe, put every shelf exactly there.
  const b = theWalksWardrobe();
  S().redistributeShelves(b.id);
  assert.deepEqual(shelvesOf(b.id).map((sh) => sh.pos_mm), centred);
});

test('F1 · armed from the Section with no shelf selected: two picks centre the shelves between them, the mode ends', () => {
  const { id, byPos } = theWalksWardrobe();
  assert.equal(U().selectedElement, null, 'a shelf is selected first');
  const [low, s2, s3, high] = [266.5, 533, 1066, 1599].map(byPos);
  const lowRef = panelOfItem(id, low.id).id;
  const highRef = panelOfItem(id, high.id).id;
  U().armCentreBetween(id);
  assert.deepEqual(U().centreBetween, { unitId: id, lower: null, upper: null });
  U().selectElement(id, lowRef, { pick: true });
  assert.equal(U().centreBetween?.lower, lowRef, 'the first pick is the lower');
  assert.equal(U().selectedElement, null, 'a pick is not a selection');
  U().selectElement(id, highRef, { pick: true });
  assert.equal(U().centreBetween, null, 'the second pick ends the mode');
  const from = panelOfItem(id, low.id).box.y + G;
  const to = panelOfItem(id, high.id).box.y;
  assertEven(clearGaps(from, to, [s2, s3].map((sh) => panelOfItem(id, sh.id).box.y)));
  // The walk's own numbers (Studio, 29.10.2026): 533 -> 710.5, 1066 -> 1155; the picks stay.
  const pos = Object.fromEntries(shelvesOf(id).map((sh) => [sh.id, sh.pos_mm]));
  assert.deepEqual([pos[low.id], pos[s2.id], pos[s3.id], pos[high.id]], [266.5, 710.5, 1155, 1599]);
});

test('F1 · the Section\'s armed button answers Escape itself: the Studio shell steps aside', () => {
  const step = escapeStep(escapeSnapshot({
    event: { key: 'Escape' },
    ui: { centreBetween: { unitId: 'u1', lower: null, upper: null }, selectedUnitId: 'u1' },
    dom: { centreBetweenListener: true },
  }));
  assert.equal(step.owner, 'own');
  assert.equal(step.level, 1);
});

// ─── F2 · THE PIECE'S WINDOW LETS THE PICKS THROUGH ────────────────────────

test('F2 · the piece\'s window is sticky while Center between is armed on its cabinet; the door keeps T37', () => {
  for (const rel of ['src/components/DoorModal.jsx', 'src/retail/design/detail/DoorModal.jsx']) {
    const src = read(rel);
    assert.match(src, /const picking = useUiStore\(\(s\) => s\.centreBetween\?\.unitId != null && s\.centreBetween\.unitId === args\?\.unitId\);/, rel);
    assert.match(src, /sticky=\{isDoor \|\| picking\}/, rel);
    assert.match(src, /dock=\{isDoor \? 'left' : null\}/, rel);
    assert.match(src, /escapeCloses=\{!isDoor\}/, rel);
    // The hook stands before the window's early return, so the hooks keep their order.
    assert.ok(src.indexOf('const picking = ') < src.indexOf('if (!unit || !panel) return null;'), `${rel}: picking after the return`);
  }
  // The shell: sticky, a press outside reaches the scene and does not close the window (Modal.jsx, T33).
  const shell = read('src/components/Modal.jsx');
  assert.match(shell, /onPointerDown=\{sticky \|\| workspace \? undefined : close\}/);
  assert.match(shell, /\$\{sticky \? 'pointer-events-none' : ''\}/);
});
