// ─── TURN 72 · F2 — HOW THE SHELF IS HELD, AND THE SETBACK ────────────────
//
// The owner, 22.09.2026:
//
//   *"jest menu po 2kliku, ale nie ma opcji back 20 mm, czyli regulacji
//   głębokości, ani nie ma wyboru fix / adjustable, nie choose, tylko te 2
//   opcje."*
//
// THREE THINGS, and the first of them is a PROBE that came back NO.
//
//   1. THE COUNT SHELF is acquitted (`verify/t72/f2-probe.md`): a shelf cannot
//      reach the retail room without an item, because `paramsForEngine`
//      derives the count FROM the items. So no count-to-item conversion is
//      built — it would be a store path nothing can call — and the real cause
//      is F6's one CSS selector, which took every `<select>` in the dock.
//   2. `shelf-type` IS TWO CHIPS. Not a `<select>`, so the selector cannot
//      reach it either way, and *"nie choose, tylko te 2 opcje"* is the order.
//   3. SET BACK is two chips plus the field, and it comes out of the dock's
//      `WORKSHOP_FIELDS` for the shelf and the partition only.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { elementFields } from '../src/engine/elements.js';
import { SHELF_TYPES, shelfTypeOf } from '../src/engine/shelfTypes.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

function aWardrobeWithShelves(n = 3) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  if (n > 0) S().addShelves(id, n);
  return id;
}

const shelfPanels = (unitId) => (S().unitResult(unitId)?.panels || [])
  .filter((p) => p.part === 'SHELF' && p.role === 'shelf');

// ─── THE PROBE, AS ASSERTIONS ──────────────────────────────────────────────

test('F2 · the probe — a COUNT shelf cannot reach the retail room', () => {
  const unitId = aWardrobeWithShelves(0);
  // A count written straight onto the unit cuts nothing: the engine is handed
  // the ITEMS' own length, which is the line the probe quotes.
  S().updateUnitParams(unitId, { shelves: 3 });
  assert.equal(shelfPanels(unitId).length, 0, 'a bare count cut a board — the probe is stale');
  assert.match(read('src/stores/projectStore.js'),
    /shelves: items\.filter\(\(i\) => i\.kind === 'shelf'\)\.length,/,
    'the line that derives the count from the items has moved');

  // …and every shelf a client CAN point at carries its item.
  S().addShelves(unitId, 3);
  const panels = shelfPanels(unitId);
  assert.equal(panels.length, 3);
  for (const p of panels) assert.ok(p.meta?.itemId, `${p.id} reached the room with no item`);
});

test('F2 · the probe — the guard IS real, and a bare engine call is where it lives', () => {
  // Turn 21 wrote it for exactly this panel, and it still answers exactly this
  // way. Acquitting the count shelf is not the same as deleting the guard.
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), shelves: 3 }, P);
  const shelf = (bare.panels || []).find((p) => p.part === 'SHELF' && p.role === 'shelf');
  assert.ok(shelf, 'a bare computeCabinet cut no shelf');
  assert.equal(shelf.meta?.itemId ?? null, null);
  assert.deepEqual(elementFields(shelf, getUnitType('WARDROBE')), ['material']);
});

test('F2 · …so no count-to-item conversion was built, and the probe says why', () => {
  const md = read('verify/t72/f2-probe.md');
  assert.match(md, /NOT CONVICTED/, 'the committed table does not carry its verdict');
  assert.match(md, /CANNOT REACH THE RETAIL ROOM/);
  // The store grew no such path. Named so a later turn cannot add one silently.
  const store = read('src/stores/projectStore.js');
  for (const invented of ['materialiseShelves', 'shelfCountToItems', 'ensureShelfItem']) {
    assert.ok(!store.includes(invented), `${invented} was built for a road nothing takes`);
  }
});

// ─── FIX | ADJUSTABLE, AS TWO CHIPS ────────────────────────────────────────

test('F2 · the type is TWO CHIPS — *"nie choose, tylko te 2 opcje"*', () => {
  for (const rel of [
    'src/components/ElementProperties.jsx',
    'src/retail/design/detail/ElementProperties.jsx',
  ]) {
    const text = read(rel);
    const at = text.indexOf("case 'shelf-type':");
    assert.ok(at > 0, `${rel} lost its shelf-type case`);
    const block = text.slice(at, text.indexOf("case 'position-y':", at));
    assert.ok(!/<select/.test(block), `${rel} still opens a choose`);
    assert.match(block, /data-shelf-type-chip=\{t\.id\}/, `${rel} has no chips`);
    assert.match(block, /t\.id === 'fix' \|\| t\.id === 'adjustable'/, `${rel} offers more than two`);
    // The store path is the one the `<select>` pressed.
    assert.match(block, /setShelfType\(unit\.id, item\.id, t\.id\)/, `${rel} invented a store path`);
  }
});

test('F2 · the ENGINE keeps all four kinds — only the menu offers two', () => {
  assert.deepEqual(SHELF_TYPES.map((t) => t.id), ['fix', 'adjustable', 'pullout', 'shoe']);
  // Pull-out is still the disabled one waiting on a workshop number, and the
  // shoe shelf still reads back as a shoe shelf. Nothing was migrated.
  assert.equal(SHELF_TYPES.find((t) => t.id === 'pullout').enabled, false);
  assert.equal(shelfTypeOf({ variant: 'shoe' }), 'shoe');
  assert.equal(shelfTypeOf({ variant: 'pullout' }), 'pullout');
  // …and the note that explains an older pinned shoe shelf is still drawn.
  assert.match(read('src/components/ElementProperties.jsx'), /data-shoe-shelf-note="1"/);
});

test('F2 · both chips write, and the engine builds what they say', () => {
  const unitId = aWardrobeWithShelves(1);
  const item = S().units.find((u) => u.id === unitId).params.sections[0].items
    .find((i) => i.kind === 'shelf');

  S().setShelfType(unitId, item.id, 'fix');
  const fixed = S().units.find((u) => u.id === unitId).params.sections[0].items
    .find((i) => i.id === item.id);
  assert.equal(shelfTypeOf(fixed), 'fix');
  const fixedPanel = shelfPanels(unitId)[0];

  S().setShelfType(unitId, item.id, 'adjustable');
  const pinned = S().units.find((u) => u.id === unitId).params.sections[0].items
    .find((i) => i.id === item.id);
  assert.equal(shelfTypeOf(pinned), 'adjustable');
  const pinnedPanel = shelfPanels(unitId)[0];

  // A FIX shelf is screwed and spans the full light; a pinned one carries the
  // engine's own width clearance. Two different boards, which is the point.
  assert.ok(fixedPanel.w > pinnedPanel.w,
    'the two kinds cut the same board — the chips wrote nothing the engine read');
});

// ─── SET BACK FROM THE FRONT ───────────────────────────────────────────────

test('F2 · SET BACK is two chips PLUS the field, in retail and in PRO', () => {
  for (const rel of [
    'src/components/ElementProperties.jsx',
    'src/retail/design/detail/ElementProperties.jsx',
  ]) {
    const text = read(rel);
    const at = text.indexOf("case 'setback': {");
    assert.ok(at > 0, `${rel} lost its setback case`);
    const block = text.slice(at, text.indexOf("case 'setback-unit':", at));
    assert.match(block, /data-setback-chip=\{c\.id\}/, `${rel} has no chips`);
    assert.match(block, /<NumberField/, `${rel} lost the field beside them`);
    // Both numbers are the profile's, never a literal in a component.
    assert.match(block, /profile\.carcass\.shelfDepthClearance/, `${rel} typed the 20`);
    assert.match(block, /\{ id: 'flush', mm: 0, label: 'Flush' \}/, `${rel} lost FLUSH`);
    // Chips and field press the same setter, through the same group path.
    const presses = [...block.matchAll(/applyToSelection\(\(row\) => setElementDepth\(row\.unitId, row\.id, /g)];
    assert.equal(presses.length, 2, `${rel}: the chips and the field must press one setter`);
  }
  assert.equal(Number(P.carcass.shelfDepthClearance), 20, "the owner's *\"back 20 mm\"*");
});

test('F2 · `setback` leaves WORKSHOP_FIELDS for the shelf and the partition ONLY', () => {
  const dock = read('src/retail/design/detail/docked.jsx');
  // Still named in the list — it is hidden for every other piece…
  assert.match(dock, /'setback', 'setback-unit',/);
  // …and let out for exactly two kinds, by name.
  assert.match(dock, /const SETBACK_IS_THE_CLIENT_S = Object\.freeze\(\['shelf', 'partition'\]\)/);
  assert.match(dock, /if \(f === 'setback'\) return !SETBACK_IS_THE_CLIENT_S\.includes\(kind\);/);
  // The rest of the list stays hidden — F2 says so in as many words.
  const list = dock.slice(dock.indexOf('const WORKSHOP_FIELDS'), dock.indexOf(']);'));
  for (const still of [
    'setback-unit', 'thickness', 'thickness-ep', 'carcass-board',
    'front-board', 'partition-slot', 'partition-drill-face', 'runner-variant',
  ]) {
    assert.ok(list.includes(`'${still}'`), `${still} left the workshop list`);
  }
});

test('F2 · the setback the chips write is the setback the engine cuts', () => {
  const unitId = aWardrobeWithShelves(1);
  const item = S().units.find((u) => u.id === unitId).params.sections[0].items
    .find((i) => i.kind === 'shelf');
  const depthOf = () => shelfPanels(unitId)[0].w; // a shelf is cut w × depth…
  const backOf = () => Number(shelfPanels(unitId)[0].meta?.front_mm ?? P.carcass.shelfDepthClearance);

  assert.equal(backOf(), 20, 'a shelf with nothing said is cut at the LISP\'s own 20');
  const at20 = shelfPanels(unitId)[0].h;

  S().setElementDepth(unitId, item.id, 0);
  assert.equal(backOf(), 0, 'FLUSH did not reach the item');
  assert.ok(shelfPanels(unitId)[0].h > at20, 'a flush shelf is no deeper than a set-back one');

  S().setElementDepth(unitId, item.id, 20);
  assert.equal(backOf(), 20);
  assert.equal(shelfPanels(unitId)[0].h, at20, '20 mm did not put the board back');
  assert.ok(depthOf() > 0);
});

test('F2 · the copy is the machine\'s — PRO and retail carry the same two chips', () => {
  const pro = read('src/components/ElementProperties.jsx');
  const retail = read('src/retail/design/detail/ElementProperties.jsx');
  assert.equal(pro.split('\n').length, retail.split('\n').length,
    'the copy is not line-for-line PRO\'s — run scripts/t72-copy.mjs');
  for (const hook of ['data-shelf-type-chip', 'data-setback-chip', 'data-setback-chips']) {
    assert.ok(pro.includes(hook) && retail.includes(hook), `${hook} is on one side only`);
  }
  // …and the copy names tonight's edits, so a later turn knows what moved.
  const copy = read('scripts/t72-copy.mjs');
  assert.match(copy, /src\/components\/ElementProperties\.jsx/);
});
