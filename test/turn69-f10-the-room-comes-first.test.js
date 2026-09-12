// ─── TURN 69 · F10 — WHERE: THE ROOM COMES FIRST ───────────────────────────
//
// CLAUDE.md, F10, verbatim:
//
//   *"EDIT THE ROOM sits ABOVE ADD A WARDROBE in the WHERE step. First the
//   room, then the furniture; the lazy client may still press ADD at once."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();

/** The WHERE panel's own markup, and nothing else's. */
function wherePanel() {
  const src = read('src/retail/design/Options.jsx');
  const from = src.indexOf('function WherePanel(');
  assert.ok(from > 0, 'the WHERE panel is gone');
  const to = src.indexOf('\nfunction ', from + 1);
  return src.slice(from, to > 0 ? to : src.length);
}

test('F10 · EDIT THE ROOM stands ABOVE ADD A WARDROBE', () => {
  const panel = wherePanel();
  const room = panel.indexOf('data-testid="space-edit-room"');
  const add = panel.indexOf('data-testid="where-add-wardrobe"');
  assert.ok(room > 0, 'EDIT THE ROOM is not in WHERE');
  assert.ok(add > 0, 'ADD A WARDROBE is not in WHERE');
  assert.ok(room < add, 'the furniture still comes before the room it stands in');
});

test('F10 · the two fields still come first — the room is measured before it is drawn', () => {
  const panel = wherePanel();
  const wall = panel.indexOf('testid="space-wall"');
  const ceiling = panel.indexOf('testid="space-ceiling"');
  const room = panel.indexOf('data-testid="space-edit-room"');
  assert.ok(wall > 0 && ceiling > wall && room > ceiling,
    'WALL WIDTH and CEILING HEIGHT no longer open the step');
});

test('F10 · the lazy client may still press ADD at once — nothing is gated', () => {
  const panel = wherePanel();
  // The button's only condition is that there is no wardrobe yet, which is
  // T65 F1's law and not a new one.
  assert.match(panel, /\{unit \? null : \(\s*<Button\s*\n\s*data-testid="where-add-wardrobe"/,
    'ADD A WARDROBE grew a condition');
  assert.ok(!/roomTouched|roomEdited|hasRoom/.test(panel), 'the room now gates the furniture');

  // …and it is true in the running app: a fresh design adds a wardrobe with
  // the room untouched.
  A.startDesign('T69 F10');
  const id = A.addFirstWardrobe();
  assert.ok(id, 'the lazy client was refused a wardrobe');
  assert.equal(S().units.length, 1);
});

test('F10 · EDIT THE ROOM still opens beside its own trigger (rule 15)', () => {
  const panel = wherePanel();
  assert.match(panel, /onClick=\{\(e\) => onEditRoom\(anchorOfEvent\(e\)\)\}/,
    'the window stopped opening beside the button that opened it');
  // …and the sentence under it travelled with it rather than being left behind.
  assert.match(panel, /EDIT THE ROOM draws the plan — walls, boxes, sloping ceilings/);
  const roomAt = panel.indexOf('data-testid="space-edit-room"');
  const noteAt = panel.indexOf('EDIT THE ROOM draws the plan');
  const addAt = panel.indexOf('data-testid="where-add-wardrobe"');
  assert.ok(roomAt < noteAt && noteAt < addAt, 'the note was orphaned by the move');
});
