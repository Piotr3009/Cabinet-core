// ─── Turn 35, CLAUDE.md F11: DRAWER FRONT DIMENSIONS HIDE BEHIND A CLOSED DOOR
//
// The owner, 16.08.2026: *"jeśli są szuflady w szafie, to nie pokazuj wymiarów
// frontów szuflad, dopóki nie otworzysz szafy — w innym przypadku to nie ma
// sensu."*
//
// Three things have to be true, and they are the spec's own three words:
// CLOSED → ABSENT, OPEN → PRESENT, NO DOORS → ALWAYS. And a fourth that is
// not in the sentence but is in iron rule 4: nothing else moves — the door's
// own figures, the clearances to the sides, to the top and to the floor are
// what they were with the door shut and with the door open alike, and a
// three-argument call is turn 34's answer to the byte.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  doorsAreOpen,
  drawerFrontDimsVisible,
  frontDimensionRows,
  frontRects,
  unitHasDoors,
  withoutDrawerFrontRows,
} from '../src/engine/frontDimensions.js';

const unit = (type, over = {}) => computeCabinet({ ...defaultParamsFor(type, P), ...over }, P);

/** A wardrobe with a door on the front and two drawers behind it. */
const doored = () => unit('WARDROBE', { drawers: 2 });
/** The same wardrobe with the door taken off — the drawers are on show. */
const doorless = () => unit('WARDROBE', { drawers: 2, doors: false });

const idsOf = (result, kind) => frontRects(result).filter((f) => f.kind === kind).map((f) => f.id);
const rowsOf = (rows, kind) => rows.filter((r) => r.kind === kind);
/** The figures that are ABOUT a drawer front and nothing else. */
function drawerRows(result, rows) {
  const drawers = new Set(idsOf(result, 'drawer'));
  return rows.filter((r) => (
    ((r.kind === 'front-w' || r.kind === 'front-h') && drawers.has(r.a))
    || (r.kind === 'between-drawers' && drawers.has(r.a) && drawers.has(r.b))
  ));
}

// ─── the fixture is the thing the owner described ──────────────────────────

test('the case exists: a wardrobe with a door AND drawer fronts behind it', () => {
  const r = doored();
  assert.deepEqual(idsOf(r, 'door'), ['01-F'], 'one leaf');
  assert.deepEqual(idsOf(r, 'drawer'), ['01-DF1', '01-DF2'], 'two drawer fronts');
  // …and they really are BEHIND it: that is why the figures make no sense.
  const [door] = frontRects(r).filter((f) => f.kind === 'door');
  for (const f of frontRects(r).filter((x) => x.kind === 'drawer')) {
    assert.ok(f.z < door.z, `${f.id} stands behind the leaf`);
  }
});

// ─── "a unit WITH doors", and "the doors are open" ─────────────────────────

test('a DOOR is a front that is neither a drawer front nor an appliance’s own face', () => {
  assert.equal(unitHasDoors(doored()), true, 'wardrobe with a leaf');
  assert.equal(unitHasDoors(doorless()), false, 'the same wardrobe, leaf off');
  assert.equal(unitHasDoors(unit('BUDR')), false, 'a drawer bank is three drawer fronts');
  // The dishwasher's face is FITTED (turn 29, F3) — it is the machine's front,
  // not a door of ours, and there is nothing of ours behind it to hide.
  assert.equal(unitHasDoors(unit('DW_PANEL')), false, 'an appliance face is not a door');
  assert.equal(unitHasDoors(null), false, 'no cabinet, no doors');
});

test('OPEN is the store’s own threshold — half way through the swing already counts', () => {
  const r = doored();
  assert.equal(doorsAreOpen(r, null), false, 'nothing said = shut');
  assert.equal(doorsAreOpen(r, {}), false, 'nothing opened = shut');
  assert.equal(doorsAreOpen(r, { '01-F': 0 }), false);
  assert.equal(doorsAreOpen(r, { '01-F': 0.5 }), false, 'exactly 0.5 is still shut');
  assert.equal(doorsAreOpen(r, { '01-F': 0.6 }), true, 'part-way out counts');
  assert.equal(doorsAreOpen(r, { '01-F': 1 }), true);
  // A DRAWER pulled out is not a door opening: the leaf is still in the way.
  assert.equal(doorsAreOpen(r, { '01-DF1': 1, '01-DF2': 1 }), false);
});

// ─── the spec’s own three words ────────────────────────────────────────────

test('CLOSED → ABSENT: not one drawer-front figure while the leaf is shut', () => {
  const r = doored();
  assert.equal(drawerFrontDimsVisible(r, {}), false, 'the law says no');

  const rows = frontDimensionRows(r, P, null, { drawerFronts: false });
  assert.equal(drawerRows(r, rows).length, 0, 'no drawer figure survives');
  for (const id of idsOf(r, 'drawer')) {
    assert.ok(!rows.some((row) => row.a === id || row.b === id),
      `${id} carries no figure at all`);
  }
});

test('OPEN → PRESENT: the leaf swings and every drawer-front figure is back', () => {
  const r = doored();
  assert.equal(drawerFrontDimsVisible(r, { '01-F': 1 }), true, 'the law says yes');

  const rows = frontDimensionRows(r, P);
  const mine = drawerRows(r, rows);
  // A width and a height apiece, and the 3 mm between the two of them.
  assert.equal(rowsOf(mine, 'front-w').length, 2);
  assert.equal(rowsOf(mine, 'front-h').length, 2);
  assert.equal(rowsOf(mine, 'between-drawers').length, 1);
  assert.equal(rowsOf(mine, 'between-drawers')[0].mm, P.doors.gap);
  for (const f of frontRects(r).filter((x) => x.kind === 'drawer')) {
    assert.ok(mine.some((d) => d.kind === 'front-w' && d.a === f.id && d.mm === f.w));
    assert.ok(mine.some((d) => d.kind === 'front-h' && d.a === f.id && d.mm === f.h));
  }
});

test('NO DOORS → ALWAYS: a doorless unit hides nothing, with any open state at all', () => {
  for (const r of [doorless(), unit('BUDR')]) {
    for (const open of [null, {}, { '01-F1': 1 }]) {
      assert.equal(drawerFrontDimsVisible(r, open), true, 'nothing is in the way');
    }
    const rows = frontDimensionRows(r, P);
    assert.ok(drawerRows(r, rows).length > 0, 'and the figures are drawn');
  }
});

// ─── and nothing else moves ────────────────────────────────────────────────

test('DOOR dimensions are unchanged — shut or open, the leaf reads the same', () => {
  const r = doored();
  const open = frontDimensionRows(r, P);
  const shut = frontDimensionRows(r, P, null, { drawerFronts: false });
  const drawers = new Set(idsOf(r, 'drawer'));
  const notDrawers = (rows) => rows.filter((row) => !(
    ((row.kind === 'front-w' || row.kind === 'front-h') && drawers.has(row.a))
    || (row.kind === 'between-drawers' && drawers.has(row.a) && drawers.has(row.b))
  ));
  assert.deepEqual(shut, notDrawers(open),
    'every figure that is not a drawer front’s is exactly what it was');
  // Named, because these are the ones a joiner reads off the shut cabinet.
  for (const kind of ['to-side', 'to-top', 'to-floor']) {
    assert.deepEqual(rowsOf(shut, kind), rowsOf(open, kind), kind);
  }
  assert.equal(rowsOf(shut, 'front-w').length, 1, 'the leaf keeps its width');
  assert.equal(rowsOf(shut, 'front-h').length, 1, 'and its height');
});

test('a THREE-argument call is turn 34’s own answer, to the byte', () => {
  for (const type of ['BUD', 'BUDR', 'WARDROBE', 'WUD']) {
    const r = unit(type);
    const was = JSON.stringify(frontDimensionRows(r, P, null));
    assert.equal(JSON.stringify(frontDimensionRows(r, P)), was, `${type}: no third`);
    assert.equal(JSON.stringify(frontDimensionRows(r, P, null, null)), was, `${type}: null opts`);
    assert.equal(JSON.stringify(frontDimensionRows(r, P, null, {})), was, `${type}: empty opts`);
    assert.equal(JSON.stringify(frontDimensionRows(r, P, null, { drawerFronts: true })), was,
      `${type}: asked for, and asking changes nothing`);
  }
});

test('the FILTER touches nothing on a cabinet with no drawer fronts', () => {
  const r = unit('BUD', { width: 900 });
  const rows = frontDimensionRows(r, P);
  assert.equal(withoutDrawerFrontRows(rows, r), rows, 'the very same array back');
  assert.equal(JSON.stringify(frontDimensionRows(r, P, null, { drawerFronts: false })),
    JSON.stringify(rows), 'two doors and no drawers: nothing to hide');
});

// ─── the view asks the question ────────────────────────────────────────────

test('UnitView hands the OPEN STATE to the law, and re-reads it when it changes', () => {
  const VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  assert.match(VIEW, /drawerFrontDimsVisible\(result, openFronts\)/,
    'the view asks the engine, with the map the swing animation runs on');
  assert.match(VIEW, /frontDimensionRows\(result, profile, suppressEdgeDims, \{ drawerFronts: false \}\)/,
    'and where the answer is no, it says so');
  // The memo has to depend on it, or the figures would not come back when the
  // door swings.
  const memo = VIEW.slice(VIEW.indexOf('const frontDimRows = useMemo('));
  const deps = memo.slice(0, memo.indexOf('\n  // A hair proud'));
  assert.match(deps, /\}, \[showFrontDimensions,[^\]]*openFronts\]\);/,
    'openFronts is in the memo’s dependency list');
});
