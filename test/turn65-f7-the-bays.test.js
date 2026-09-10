// ─── TURN 65 · F7 — BAYS, IN THE CLIENT'S WORDS ─────────────────────────────
//
// The owner: *"zamiast vertical partition dać BAYS i wpisz ilość, max 3"* ·
// *"i wtedy dopiero informacja o tym że bays można zrobić niższe ale półka
// musi być fix"* · *"przegroda ma się zaczynać nad szufladami … na półce …
// pamiętaj starą zasadę: materiał nigdy nie wchodzi w materiał."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';

setPersistence('none');
const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();
const G = P.board.thickness;

const room = (width = 1800) => {
  S().loadProject({
    id: null, name: 'T65 F7', number: '65', client: 'the owner',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  const u = S().addUnit('WARDROBE');
  S().updateUnitParams(u.id, { width, height: 2200 });
  return u.id;
};

const partsOf = (id) => (S().units.find((u) => u.id === id)?.params?.sections?.[0]?.items || [])
  .filter((i) => i.kind === 'partition');

// ═══ 1 · A NAME AND A COUNTER OVER THE EXISTING LAW ════════════════════════

test('F7 · the INTERIOR row is BAYS now, and it is the same partition track', () => {
  const row = A.INTERIOR_ROWS.find((r) => r.id === 'partition');
  // ─── RENAMED BY T66 F6 ─────────────────────────────────────────────────
  // *"zamień nazwę przycisku z vertical partition (divider) na Vertical
  // partitions (bays), a ten na dole usuń."* The name is in this ONE place —
  // the row table — because the row and the control that counts it are one
  // entry now, and the second control at the foot of the panel is deleted.
  assert.equal(row.name, 'Vertical partitions (bays)', 'the row still says "Vertical divider"');
  assert.equal(row.bays, true, 'the INSIDE panel cannot tell it is a counted row');
  // The copied PRO list is untouched — a copy stays a copy.
  assert.match(read('src/retail/design/detail/AddItems.jsx'), /label: 'Vertical partition \(divider\)'/,
    "PRO's own copied row was renamed — copies stay copies");
});

test('F7 · writing 3 puts two partitions in; writing 1 takes them out', () => {
  const id = room(1800);
  assert.equal(A.bayCount(id), 1, 'a fresh wardrobe is one bay');
  assert.equal(partsOf(id).length, 0);

  assert.equal(A.setBayCount(id, 3), 3);
  assert.equal(partsOf(id).length, 2, 'three bays is two dividers');
  assert.equal(A.bayCount(id), 3);

  assert.equal(A.setBayCount(id, 1), 1);
  assert.equal(partsOf(id).length, 0, 'the dividers did not come out');
});

test('F7 · MAX 3 — the ceiling is the client\'s, and it is a BOUND, not a refusal', () => {
  const id = room(3000);
  assert.equal(A.MAX_BAYS, 3);
  assert.equal(A.setBayCount(id, 9), 3, 'the count was not clamped to the ceiling');
  assert.equal(partsOf(id).length, 2);
  // It is published as a bound, so the field reads it the way every typed
  // field in this app reads its own.
  const b = A.designBounds();
  assert.equal(b.bays.min, 1);
  assert.equal(b.bays.max, A.MAX_BAYS);
  // …and `bayRefusal` stays the ENGINE's room question and nothing else.
  assert.equal(A.bayRefusal(id, 2), '', 'a 3000 mm wardrobe was refused a second bay');
});

test('F7 · the field is TYPED and bounded by the engine side — never a slider', () => {
  const options = read('src/retail/design/Options.jsx');
  // T66 F6 · the label comes off the row table, so there is one name and the
  // field is found by its testid rather than by a word typed in two places.
  assert.match(options, /label=\{String\(baysRow\?\.name \|\| 'Vertical partitions \(bays\)'\)\.toUpperCase\(\)\}/,
    'BAYS is not a field in INSIDE');
  assert.match(options, /testid="inside-bays"/);
  assert.match(options, /min=\{b\.bays\.min\}/);
  assert.match(options, /max=\{b\.bays\.max\}/);
  const at = options.indexOf('testid="inside-bays"');
  assert.ok(!/Slider/.test(options.slice(at, at + 500)), 'BAYS is a slider');
  // ─── T66 F6 · ONE ENTRY, AND ONLY ONE ─────────────────────────────────
  // *"a ten na dole usuń."* The count is written in exactly one place in the
  // whole options column; a second would be a second opinion about the same
  // wardrobe, which is what the duplicate at the foot of the panel was.
  assert.equal([...options.matchAll(/testid="inside-bays"/g)].length, 1,
    'the second BAYS control is back at the foot of the panel');
  assert.equal([...options.matchAll(/A\.setBayCount\(/g)].length, 1,
    'two controls write the bay count');
});

test('F7 · the line appears only AFTER a count above one', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /\{bays > 1 \?/, 'the note is not gated on more than one bay');
  assert.match(options, /REASONS\.baysMayDiffer/, 'the note is not the one sentence');
  assert.equal(REASONS.baysMayDiffer,
    'Bays can be different heights — the shelf between them is fixed.');
});

test('F7 · doors do NOT follow from bays — two acts, not one under two names', () => {
  const id = room(1800);
  const doors = A.doorCount(id);
  A.setBayCount(id, 3);
  assert.equal(A.doorCount(id), doors, 'setting the bays changed the door count');
});

// ═══ 2 · MATERIAL NEVER ENTERS MATERIAL ════════════════════════════════════

const overlayStack = (n, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 1800,
  height: 2200,
  sections: [{
    items: [
      ...Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, kind: 'overlay_drawer', index: i + 1 })),
      { id: 'p1', kind: 'partition', x_mm: 900 },
    ],
  }],
  ...over,
}, P);

for (const n of [2, 5]) {
  test(`F7 · a partition in a bay with a ${n}-drawer overlay stack STARTS ON the capping shelf`, () => {
    const r = overlayStack(n);
    const cap = r.panels.find((p) => p.id === 'OVERLAY-FIX');
    const part = r.panels.find((p) => p.part === 'VPART');
    assert.ok(cap, 'the stack lost its capping shelf');
    assert.ok(part, 'the divider was not cut');
    // ON the shelf: its underside is the shelf's top face, to the millimetre.
    assert.equal(part.box.y, cap.box.y + G,
      `the divider starts at ${part.box.y}, the shelf's top is ${cap.box.y + G}`);
    // …and it therefore does NOT pass through the stack below it.
    assert.ok(part.box.y > cap.box.y, 'the divider runs into the capping shelf');
    const lowestFront = Math.min(...r.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => p.box.y));
    assert.ok(part.box.y > lowestFront, 'the divider passes through the drawer stack');
  });
}

test('F7 · the height is READ from the stack, not fixed — 5 drawers start higher than 2', () => {
  const two = overlayStack(2).panels.find((p) => p.part === 'VPART');
  const five = overlayStack(5).panels.find((p) => p.part === 'VPART');
  assert.ok(five.box.y > two.box.y,
    `a 5-drawer stack starts its divider at ${five.box.y}, a 2-drawer one at ${two.box.y}`);
});

test('F7 · with NO stack the divider still stands on the carcass floor — nothing else moved', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: '01',
    width: 1800,
    height: 2200,
    sections: [{ items: [{ id: 'p1', kind: 'partition', x_mm: 900 }] }],
  }, P);
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.equal(part.box.y, G, 'a wardrobe without a stack changed its divider floor');
});
