/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE OWNER'S EYE-TEST OF T79, THREE POINTS ────────
//
// 1. Delete in the cabinet editor window. The owner: *"zeby cos wykasowac
//    trzeba isc do menu i nacisnac delete item, a nie ma zaznaczenia itemu i
//    nacisniecie delete"*. The probe (headless Chromium, a real click, a real
//    key): in the room the shelf went; in the editor window the shelf stayed,
//    because the window keeps its pick in its own state and its key listener
//    answered Escape alone. Now the window's listener answers Delete and
//    Backspace through the same action as the room's key.
// 2. CUT EDGE: *"linia krawedzi prawie niewidoczna i trudna do klikniecia; ma
//    byc jak narozniki, kwadraty"*. The square stands ON the edge, at the
//    middle, the corner's size; the lifted handles and drop lines are gone.
// 3. Messages: *"ma sie chowac po kilku sekundach i byc przezroczysty"*;
//    asked "wszystkie chowaja sie po 4 s, czerwone po 8 s, historia zostaje":
//    *"tak pls"*. The clocks live in test/turn31-f2 and turn79-f01 (rewritten);
//    here: the Changes row survives the clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { expired, hideMs, makeMessage } from '../src/engine/messages.js';
import { notchEdgeSpots } from '../src/3d/notchPick.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 'chatfix-1910',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

// ─── 1. DELETE IN THE EDITOR WINDOW ─────────────────────────────────────────

test('the editor window answers Delete through the room\'s one action (deleteSelectedElement)', () => {
  const src = read('src/components/CabinetEditorModal.jsx');
  assert.match(src, /import \{ isDeleteKey \} from '\.\.\/lib\/deleteKey\.js'/, 'the same guard as the room');
  assert.match(src, /const deleteSelectedElement = useProjectStore\(\(s\) => s\.deleteSelectedElement\)/);
  // The capture-phase listener (the Escape one) now asks the guard first and
  // hands the window's own pick to the store's action.
  assert.match(src, /if \(isDeleteKey\(e\)\) \{[\s\S]*?deleteSelectedElement\(\{ unitId: args\.unitId, elementRef: selectedId \}\)/);
  assert.match(src, /if \(res\.ok\) setSelectedId\(res\.next \|\| null\);/, 'the selection falls where the plan says');
  assert.match(src, /notify\(res\.error, 'warn'\)/, 'a refused piece answers with its sentence');
  // Escape still does what T79 F12 left it doing.
  assert.match(src, /if \(e\.key !== 'Escape'\) return;/);
  assert.match(src, /window\.addEventListener\('keydown', onKey, true\)/);
});

test('the action the window\'s key calls takes a shelf out of a wardrobe by its explicit pick', () => {
  project();
  const u = store().addUnit('WARDROBE');
  store().addShelves(u.id, 1, null);
  const shelf = store().unitResult(u.id).panels.find((p) => p.part === 'SHELF');
  assert.ok(shelf, 'a shelf to delete');
  // Nothing selected in the uiStore: the window's pick is its own, handed in.
  ui().clearElement();
  assert.equal(ui().selectedElement, null);
  const res = store().deleteSelectedElement({ unitId: u.id, elementRef: shelf.id });
  assert.equal(res.ok, true);
  assert.equal(res.next, null, 'a shelf is not a drawer: nothing to fall to');
  assert.equal(store().unitResult(u.id).panels.some((p) => p.part === 'SHELF'), false, 'the shelf is gone');
  assert.equal(store().units.length, 1, 'the cabinet stands');
});

test('a carcass board under the key in the window is refused in words, nothing goes', () => {
  project();
  const u = store().addUnit('WARDROBE');
  const before = store().unitResult(u.id).panels.length;
  const res = store().deleteSelectedElement({ unitId: u.id, elementRef: 'BUL' });
  assert.equal(res.ok, false);
  assert.match(res.error, /held together by this board/);
  assert.equal(store().unitResult(u.id).panels.length, before);
});

// ─── 2. CUT EDGE: THE SQUARE ON THE EDGE ────────────────────────────────────

test('the edge square stands ON its edge, at the middle of the width, the corner\'s size', () => {
  const spots = notchEdgeSpots(1200, 558, 2150);
  assert.deepEqual(spots.map((s) => s.x), [600, 600, 600, 600]);
  assert.deepEqual(spots.map((s) => [s.edge, s.y, s.z]), [
    ['TB', 2150, 0], ['BB', 0, 0], ['TF', 2150, 558], ['BF', 0, 558],
  ]);
  const edges = read('src/3d/NotchEdges.jsx');
  const corners = read('src/3d/NotchCorners.jsx');
  assert.equal(/const HANDLE_MM = (\d+)/.exec(edges)[1], /const HANDLE_MM = (\d+)/.exec(corners)[1], 'the same square');
  assert.match(edges, /position=\{\[mm\(sp\.x\), mm\(sp\.y\), mm\(sp\.z\)\]\}/, 'the square sits on the edge');
  assert.doesNotMatch(edges, /LIFT_MM/, 'no lifted handle');
  assert.doesNotMatch(edges, /mm\(top - sp\.y\)/, 'no drop line');
  assert.match(edges, /userData=\{\{ ccNotchEdge: sp\.edge, ccUnitId: unitId \}\}/, 'the walk still finds it');
});

test('a board of the lit carcass lets the press travel on to the square behind it', () => {
  const src = read('src/3d/UnitView.jsx');
  assert.match(src, /const edgeHandleBehind = \(e\) => useUiStore\.getState\(\)\.edgeNotchPick === unit\.id/);
  assert.match(src, /hit\.object\?\.userData\?\.ccNotchEdge && hit\.object\.userData\.ccUnitId === unit\.id/);
  // The pointer-down of every board, and the sides' own click, ask it first.
  assert.equal((src.match(/if \(edgeHandleBehind\(e\)\) return;/g) || []).length, 2);
});

// ─── 3. MESSAGES: THE CLOCK TAKES THE CARD, THE ROW STAYS ───────────────────

test('a red leaves on its 8 s clock and its row stays in the Changes list', () => {
  useUiStore.setState({ messages: [], history: [], historyOpen: false });
  const id = ui().notify('Boom', 'error');
  const msg = ui().messages.find((m) => m.id === id);
  assert.ok(msg);
  assert.equal(msg.expiresAt - msg.at, hideMs(P, 'red'));
  assert.equal(hideMs(P, 'red'), 8000);
  assert.deepEqual(expired(ui().messages, msg.at + 7999), []);
  assert.deepEqual(expired(ui().messages, msg.at + 8000), [id]);
  assert.equal(ui().history.length, 1);
  assert.equal(ui().history[0].message, 'Boom');
  // The sweep the store arms takes the card the way `expired` says; the row is untouched.
  useUiStore.setState((s) => ({ messages: s.messages.filter((m) => !expired(s.messages, msg.at + 8000).includes(m.id)) }));
  assert.equal(ui().messages.length, 0);
  assert.equal(ui().history.length, 1);
});

test('a grey and a yellow leave on 4 s; the profile holds the three numbers', () => {
  assert.deepEqual(P.ui.messages.hideMs, { grey: 4000, yellow: 4000, red: 8000 });
  assert.equal('greyMs' in P.ui.messages, false, 'the old single number is gone');
  const grey = makeMessage('Saved', 'ok', { at: 10, profile: P });
  const yellow = makeMessage('Careful', 'warn', { at: 10, profile: P });
  assert.equal(grey.expiresAt, 4010);
  assert.equal(yellow.expiresAt, 4010);
  const card = read('src/components/Messages.jsx');
  assert.match(card, /bg-shell-800\/70/, 'the grey card is translucent');
  assert.doesNotMatch(card, /bg-shell-800\/95/);
});
