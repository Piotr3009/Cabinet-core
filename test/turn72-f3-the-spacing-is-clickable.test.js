// ─── TURN 72 · F3 — THE SPACING IS ON THE WARDROBE, AND IT IS CLICKABLE ───
//
// The owner, 22.09.2026:
//
//   *"jak kliknę 2 razy na półkę to wymiary pomiędzy półkami niech zostaną i
//   będą klikalne i wtedy będzie można ustawić wysokość pomiędzy półkami"*
//
// …and then: *"to samo przenieś, dodaj do PRO; plus szerokości; dodaj na dole
// tego modalu CENTER ALL."*
//
// FOUR CLAIMS, and every one of them is asked of the ENGINE's own answer
// rather than of a component's state: the chain's numbers, what the typed
// number does to the board, whose neighbours moved, and what CENTER ALL
// leaves behind.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { clearLights, columnOfShelf, shelfColumns, interiorFloor } from '../src/engine/shelfHeights.js';
import { bayGapsAround, xFromChain } from '../src/engine/partitionPositions.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

function aWardrobe({ shelves = 3, bays = 1 } = {}) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
  if (bays > 1) A.setBayCount(id, bays);
  if (shelves > 0) S().addShelves(id, shelves);
  return id;
}

const panelsOf = (unitId) => S().unitResult(unitId)?.panels || [];
const shelvesOf = (unitId) => panelsOf(unitId).filter((p) => p.part === 'SHELF' && p.role === 'shelf')
  .sort((a, b) => a.box.y - b.box.y);
const itemsOf = (unitId) => S().units.find((u) => u.id === unitId)?.params?.sections?.[0]?.items || [];

/** The very columns the view computes, with the view's own arguments. */
function columnsOf(unitId) {
  const result = S().unitResult(unitId);
  const unit = S().units.find((u) => u.id === unitId);
  const G = unit.params.board_t ?? P.board.thickness;
  return shelfColumns({
    panels: result.panels,
    floor: result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : interiorFloor(G),
    ceiling: unit.params.height - G,
    width: unit.params.width,
    tolerance: P.carcass.shelfWidthClearance,
  }, P.editor.mmStep);
}

// ─── 1 · THE CHAIN IS THE BAY'S, AND IT STAYS ON THE SELECTION ────────────

test('F3 · the chain is the SELECTED shelf\'s own bay — floor, each shelf, the top', () => {
  const unitId = aWardrobe({ shelves: 3 });
  const shelf = shelvesOf(unitId)[1];
  const column = columnOfShelf(columnsOf(unitId), shelf.id);
  assert.ok(column, 'the selected shelf is in no column');
  // Three shelves make FOUR clear openings: floor→1, 1→2, 2→3, 3→top.
  assert.equal(column.lights.length, 4, 'the ladder is not the whole column');
  assert.equal(column.shelves.length, 3);
  // Every figure is a CLEAR opening between faces, never centre to centre.
  for (const g of column.lights) assert.ok(g.size > 0 && g.to - g.from === g.size);
});

test('F3 · it is tied to the SELECTION, not to the pointer', () => {
  const view = read('src/3d/UnitView.jsx');
  // The hover readout is still a moment and still asks its own channel…
  assert.match(view, /chromeOn\('hover'\) && hoverShelf && hoverColumn/);
  // …and the new chain is mounted on `selectedElement`, with no hover in it.
  assert.match(view, /\{selectedElement && !contour && !shelfDrag && \(\s*\n\s*<SpacingChain/);
  assert.match(view, /columns=\{shelfColumnList\}/, 'the chain re-derives the columns');
  assert.match(view, /panelId=\{selectedElement\}/);
});

test('F3 · every figure is a chip — ONE click, and T31\'s double-click is untouched', () => {
  const chain = read('src/3d/DimensionChain.jsx');
  assert.match(chain, /pickOn = 'doubleClick',/, 'T31\'s gesture is no longer the default');
  assert.match(chain, /pickOn === 'click' \? \{ onClick: hit \} : \{ onDoubleClick: hit \}/);
  const spacing = read('src/3d/SpacingChain.jsx');
  assert.match(spacing, /pickOn="click"/, 'the spacing chain still wants a double-click');
  // The field is a REAL control in the scene, the way the share-out bar is.
  assert.match(spacing, /import \{ Html \} from '@react-three\/drei'/);
  assert.match(spacing, /data-spacing-field=\{row\.key\}/);
  assert.match(spacing, /if \(e\.key === 'Enter'\)/, 'Enter does not write');
  assert.match(spacing, /if \(e\.key === 'Escape'\)/, 'Escape does not cancel');
});

// ─── 2 · THE TYPED NUMBER MOVES THE SELECTED SHELF AND NOTHING ELSE ───────

test('F3 · typing a gap moves the SELECTED shelf; its neighbours stand still', () => {
  const unitId = aWardrobe({ shelves: 3 });
  const before = shelvesOf(unitId).map((p) => p.box.y);
  const me = shelvesOf(unitId)[1];
  const item = itemsOf(unitId).find((i) => i.id === me.meta.itemId);
  const column = columnOfShelf(columnsOf(unitId), me.id);

  // The gap BELOW it — the row whose top face IS this shelf's underside.
  const gapBelow = column.lights.find((g) => Math.abs(g.to - me.box.y) < 0.5);
  assert.ok(gapBelow, 'the chain has no gap below the selected shelf');

  // `SpacingChain`'s own arithmetic for that case: the shelf's underside lands
  // `want` above the face the gap starts at.
  const want = Math.round(gapBelow.size) + 120;
  S().setShelfPos(unitId, item.id, gapBelow.from + want);

  const after = shelvesOf(unitId).map((p) => p.box.y);
  assert.ok(Math.abs(after[1] - (gapBelow.from + want)) < 1, 'the shelf did not land on the typed gap');
  assert.equal(after[0], before[0], 'the shelf below moved');
  assert.equal(after[2], before[2], 'the shelf above moved');

  // …and the chain now reads the number that was typed.
  const fresh = columnOfShelf(columnsOf(unitId), shelvesOf(unitId)[1].id);
  const now = fresh.lights.find((g) => Math.abs(g.to - shelvesOf(unitId)[1].box.y) < 0.5);
  assert.equal(Math.round(now.size), want);
});

test('F3 · the write is `setShelfPos` — the clamp the DRAG obeys, and the room refuses first', () => {
  const spacing = read('src/3d/SpacingChain.jsx');
  assert.match(spacing, /const setShelfPos = useProjectStore\(\(s\) => s\.setShelfPos\)/);
  assert.match(spacing, /const setPartitionX = useProjectStore\(\(s\) => s\.setPartitionX\)/);
  assert.ok(!/clampShelfPos|shelfBounds/.test(spacing), 'the chain re-derived a clamp of its own');

  // And the clamp really does refuse: a gap nobody has room for comes back
  // short rather than putting a board through the top.
  const unitId = aWardrobe({ shelves: 2 });
  const me = shelvesOf(unitId)[1];
  const item = itemsOf(unitId).find((i) => i.id === me.meta.itemId);
  const asked = 99999;
  S().setShelfPos(unitId, item.id, asked);
  const landed = shelvesOf(unitId).find((p) => p.meta.itemId === item.id);
  assert.ok(landed.box.y < asked, 'the store let a shelf out of the cabinet');
  assert.ok(landed.box.y + landed.box.h <= S().units.find((u) => u.id === unitId).params.height);
});

// ─── 3 · AND THE SAME FOR WIDTHS ──────────────────────────────────────────

test('F3 · a divider keeps the bay widths either side of it, as chips', () => {
  const unitId = aWardrobe({ shelves: 0, bays: 2 });
  const part = panelsOf(unitId).find((p) => p.part === 'VPART');
  assert.ok(part, 'no divider was cut');
  const walls = panelsOf(unitId)
    .filter((p) => p.box && (p.part === 'BUL' || p.part === 'BUR' || (p.part === 'VPART' && p.id !== part.id)))
    .map((p) => ({ x: p.box.x, w: p.box.w }));
  const gaps = bayGapsAround({ at: { x: part.box.x, w: part.box.w }, walls });
  assert.equal(gaps.length, 2, 'a divider between two boards has two bays');
  assert.deepEqual(gaps.map((g) => g.key), ['left', 'right']);
  // The chain reads them off the same function `HoverDimensions` already does.
  assert.match(read('src/3d/SpacingChain.jsx'), /bayGapsAround\(\{ at: \{ x: panel\.box\.x, w: panel\.box\.w \}, walls \}\)/);
  assert.match(read('src/3d/HoverDimensions.jsx'), /bayGapsAround\(\{ at: \{ x: me\.box\.x, w: me\.box\.w \}, walls \}\)/);
});

test('F3 · typing a bay width moves the SELECTED divider, through PRO\'s own mapping', () => {
  const unitId = aWardrobe({ shelves: 0, bays: 2 });
  const part = panelsOf(unitId).find((p) => p.part === 'VPART');
  const item = itemsOf(unitId).find((i) => i.id === part.meta.itemId);
  assert.ok(item, 'the divider reached the scene with no item');
  const G = S().units.find((u) => u.id === unitId).params.board_t ?? P.board.thickness;
  const others = panelsOf(unitId)
    .filter((p) => p.part === 'VPART' && p.id !== part.id).map((p) => ({ x: p.box.x, w: p.box.w }));

  const want = 500;
  S().setPartitionX(unitId, item.id, xFromChain({
    value: want, x: part.box.x, boardT: G, others,
  }));
  const moved = panelsOf(unitId).find((p) => p.part === 'VPART');
  const walls = panelsOf(unitId)
    .filter((p) => p.box && (p.part === 'BUL' || p.part === 'BUR'))
    .map((p) => ({ x: p.box.x, w: p.box.w }));
  const left = bayGapsAround({ at: { x: moved.box.x, w: moved.box.w }, walls })
    .find((g) => g.key === 'left');
  assert.equal(Math.round(left.value), want, 'the left bay is not the width that was typed');
});

// ─── 4 · CENTER ALL ───────────────────────────────────────────────────────

test('F3 · CENTER ALL is ONE store action, and both applications press it', () => {
  const store = read('src/stores/projectStore.js');
  assert.match(store, /centreShelves: \(unitId, bayRef = null\) =>/, 'the one action is not in the store');
  // PRO's button, at the bottom of the shelf menu…
  const pro = read('src/components/ElementProperties.jsx');
  assert.match(pro, /data-centre-shelves="1"/);
  assert.match(pro, /centreShelves\(unit\.id, item\.zone \?\? null\)/, 'it does not centre the shelf\'s own bay');
  assert.match(pro, />\s*Center all\s*</);
  // …and the copy carries it, which is how retail has it.
  assert.match(read('src/retail/design/detail/ElementProperties.jsx'), /data-centre-shelves="1"/);
  // ONE ENTRY: the re-homed duplicate is gone from the left-hand row's block.
  const rehomed = read('src/retail/design/detail/ReHomed.jsx');
  assert.ok(!rehomed.includes('shelf-centre'), 'a second button for one act');
  // The LICENSED REMOVAL note still NAMES the row it took out, which is how
  // this repository records one; what may not come back is the control.
  assert.ok(!/<Button[\s\S]{0,200}SPACE THEM EVENLY/.test(rehomed), 'the second button is back');
  assert.match(rehomed, /LICENSED REMOVAL: `SPACE THEM EVENLY`/, 'the removal is not argued');
  // …and the adapter presses the one name rather than re-assembling the pair.
  assert.match(read('src/retail/design/adapter.js'), /return S\(\)\.centreShelves\(unitId, bay \?\? null\);/);
});

test('F3 · CENTER ALL spreads the bay evenly — equal clear gaps, the engine\'s own clamp', () => {
  const unitId = aWardrobe({ shelves: 3 });
  // Shove them all to the bottom first, so "evenly" has something to undo.
  for (const p of shelvesOf(unitId)) {
    const item = itemsOf(unitId).find((i) => i.id === p.meta.itemId);
    S().setShelfPos(unitId, item.id, 200);
  }
  S().centreShelves(unitId, null);

  const column = columnOfShelf(columnsOf(unitId), shelvesOf(unitId)[0].id);
  const sizes = column.lights.map((g) => g.size);
  assert.equal(sizes.length, 4);
  const spread = Math.max(...sizes) - Math.min(...sizes);
  assert.ok(spread <= P.editor.mmStep * 2, `the gaps are ${spread.toFixed(1)} mm apart, not even`);
  // `clearLights` itself says so, which is the same word the chain prints.
  for (const g of column.lights) assert.equal(g.even, true, 'a gap reads as the odd one out');
});

test('F3 · CENTER ALL works a BAY at a time — never one ladder through a partition', () => {
  const unitId = aWardrobe({ shelves: 0, bays: 2 });
  // One shelf in each bay, at different heights.
  S().addShelves(unitId, 2);
  const items = itemsOf(unitId).filter((i) => i.kind === 'shelf');
  assert.equal(items.length, 2);
  S().updateItem(unitId, items[0].id, { zone: 0 });
  S().updateItem(unitId, items[1].id, { zone: 1 });
  S().setShelfPos(unitId, items[0].id, 400);
  S().setShelfPos(unitId, items[1].id, 1600);

  // Centre ONLY bay 0. Bay 1's shelf must not move.
  const before = itemsOf(unitId).find((i) => i.id === items[1].id).pos_mm;
  S().centreShelves(unitId, 0);
  const after = itemsOf(unitId).find((i) => i.id === items[1].id).pos_mm;
  assert.equal(after, before, 'centring one bay moved a shelf in the other');
  assert.notEqual(itemsOf(unitId).find((i) => i.id === items[0].id).pos_mm, 400,
    'centring the bay moved nothing in it');
});

// ─── AND THE ONE DIMENSION COMPONENT IS STILL ONE ─────────────────────────

test('F3 · nothing here draws an arrowhead — R11 holds', () => {
  const spacing = read('src/3d/SpacingChain.jsx');
  assert.match(spacing, /import DimensionChain from '\.\/DimensionChain\.jsx'/);
  assert.ok(!/arrowMm|arrowAngle|dimensionEntities/.test(spacing),
    'SpacingChain draws its own dimension — that is a second implementation');
  // It hands POINTS to the one component, which is R11 in one line.
  assert.match(spacing, /<DimensionChain\s/);
  // …and every number it hands over comes from the two pure functions that
  // already answer "which numbers are worth reading" about these two pieces.
  assert.match(spacing, /columnOfShelf\(columns, panel\.id\)/);
  assert.match(spacing, /bayGapsAround\(/);
});

test('F3 · `clearLights` is what the chain prints — the same faces, the same evenness', () => {
  // Not a re-derivation: the chain's figures ARE these, so a test that pins
  // the function pins the picture.
  const lights = clearLights({
    positions: [400, 800, 1200], thickness: 18, floor: 18, ceiling: 2182,
  });
  assert.equal(lights.length, 4);
  assert.deepEqual(lights.map((g) => Math.round(g.size)), [382, 382, 382, 964]);
  assert.deepEqual(lights.map((g) => g.even), [false, false, false, true]);
});
