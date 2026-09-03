// ─── TURN 60 · F4 — THE STAGE HINT (6), AND THE ITEM'S NAME ────────────────
//
// The owner, of the line under the stage: *"6 bez zmian, ale dodaj nazwę
// itemu."*
//
// CLAUDE.md F4, verbatim: *"Unchanged copy, plus the selected item's name, in
// the same line, after a hairline separator: `DRAG TO ORBIT · SCROLL TO ZOOM ·
// CLICK AN ELEMENT FOR DETAIL │ BEDROOM WARDROBE — LEFT DOOR`. The name comes
// from the design's own name (the client may rename the wardrobe in F3.1) plus
// the element's plain-English kind. Nothing selected → the design's name
// alone."*
//
// Two halves, and the second is the one that can quietly go wrong: the KIND
// must be the engine's own word for the piece, not a word retail chose. It is
// `engine/elements.js elementLabel` — the same function PRO's element panel
// titles itself with — so a kit that adds a part nobody thought of gets a
// sensible name here for free.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { elementLabel } from '../src/engine/elements.js';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const ROOM = read('src/retail/design/DesignRoom.jsx');

test('F4 · the copy is unchanged, word for word', () => {
  assert.match(ROOM, /DRAG TO ORBIT · SCROLL TO ZOOM · CLICK AN ELEMENT FOR DETAIL/,
    '*"6 bez zmian"* — the hint\'s own line may not move');
  assert.match(ROOM, /data-testid="stage-caption"/, 'the walk finds the hint by this name');
});

test('F4 · …plus the name, after a hairline separator', () => {
  assert.match(ROOM, /className="pbi-hint-sep"/, 'there is no separator between the two halves');
  assert.match(ROOM, /data-testid="stage-caption-name"/, 'the name has no handle to read it by');
  // ONE LINE: the separator is a rule inside a flex row, not a second block.
  const room = read('src/retail/styles/room.css');
  const at = room.indexOf('.pbi-hint {');
  const rule = room.slice(at, room.indexOf('}', at));
  assert.match(rule, /display:\s*flex/, 'the hint is not one line');
  const sep = room.slice(room.indexOf('.pbi-hint-sep'));
  assert.match(sep.slice(0, sep.indexOf('}')), /width:\s*1px/, 'the separator is not a hairline');
});

test('F4 · nothing selected → the design\'s name alone', () => {
  assert.equal(A.selectionName(null), '');
  // The component composes `${designName} — ${selected}` only when there IS a
  // selection; with none it prints the design's name and nothing else.
  assert.match(ROOM, /selected \? `\$\{designName\} — \$\{selected\}`[\s\S]{0,60}: String\(designName/,
    'the hint does not fall back to the design\'s name alone');
});

test('F4 · the element\'s word is the ENGINE\'s word', () => {
  A.startDesign('Bedroom wardrobe');
  const unit = A.designUnit(S().units);
  S().addShelves(unit.id, 2);
  S().addDrawers(unit.id, 3);
  const panels = S().unitResult(unit.id).panels;

  const shelf = panels.find((p) => p.part === 'SHELF');
  const sel = A.resolveSelection({ unitId: unit.id, elementRef: shelf.id });
  assert.equal(sel.label, elementLabel(shelf), 'the label is not the engine\'s own');
  assert.equal(A.selectionName(sel), 'Shelf');

  // A LEAF says which one — the engine hangs it left or right and the panel
  // knows which side it is on, so this is read rather than guessed.
  const door = A.doorPanels(unit.id)[0];
  const leaf = A.resolveSelection({ unitId: unit.id, elementRef: door.id });
  const hand = String(door.meta.hinge || '').toUpperCase();
  assert.equal(A.selectionName(leaf), hand === 'R' ? 'Right door' : 'Left door');

  // The two fitted drawers are named for what they ARE rather than for the
  // board that was clicked, because "Drawer box" is not what a client sees.
  S().addWatchDrawer(unit.id);
  const tray = S().units.find((u) => u.id === unit.id).params.sections[0].items
    .find((i) => i.watch_insert === true || i.variant === 'watch');
  const trayPanel = S().unitResult(unit.id).panels
    .find((p) => p.part === 'DRAWER-FRONT' && Number(p.meta.drawer) === Number(tray.index));
  if (trayPanel) {
    assert.equal(A.selectionName(A.resolveSelection({ unitId: unit.id, elementRef: trayPanel.id })),
      'Watch drawer');
  }
});

test('F4 · the name is the DESIGN\'s, and it is the one the client may change', () => {
  // Three places write it and all three are the estimate store's `rename`:
  // the ESTIMATE row (F6), the WARDROBE menu (F3.1) and column 3's own field.
  assert.match(ROOM, /designName=\{designName\}/, 'the hint and the menus do not share one name');
  // ─── AMENDED BY T64 F5 ───────────────────────────────────────────────────
  // The estimate rows left the room for their own page; the name is written
  // in the REVIEW step's field and the wardrobe menu, both through the one
  // `rename` — and the page shows the name it was given.
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /data-testid="estimate-name"/, 'the REVIEW step cannot name the design');
  const wardrobe = read('src/retail/design/detail/WardrobeMenu.jsx');
  assert.match(wardrobe, /data-testid="wardrobe-name"/, 'the wardrobe menu cannot be renamed');
  assert.match(ROOM, /onDesignName=\{\(name\) => estimate\.rename\(estimate\.activeId, name\)\}/);
  const page = read('src/retail/estimate/EstimatePage.jsx');
  assert.match(page, /\{item\.name\}/, 'the estimate row does not show the design\'s name');
});
