// ─── TURN 68 · F3 — TWO DOORS MEANS TWO EQUAL DOORS ────────────────────────
//
// The owner, twice, about the same thing:
//
//   *"jak wracamy do dwóch, to żeby wróciło do 2 równych standardowych
//   otwieranych na boki"*
//   *"po naciśnięciu 2 muszą wrócić do standardowych pół na pół, a nie jak
//   teraz 1/4 i 3/4"*
//
// THE PROBE CAME FIRST (`verify/t68/f3-probe.md`). An 1800 mm wardrobe:
//
//   addDoors alone, no divider   896 · 897   ← the pair he is asking for
//   setDoorCount(2)              888 · 905
//   4 doors, then press 2       1334 ·  459  ← his 3/4 and his 1/4
//   3 doors, then press 2       1185 ·  608
//
// and the surviving divider was still standing at the FOUR-door x. So the
// residue is the store's, F3's engine fence does not apply, and these are the
// assertions that hold the cure in place.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as A from '../src/retail/design/adapter.js';
import { doorCountFor } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const code = (rel) => readFileSync(join(ROOT, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

function wardrobe(widthMm = 1800) {
  useUiStore.getState().clearSelection();
  A.startDesign('T68 F3');
  const id = A.addFirstWardrobe();
  A.setUnitSize(id, { width: widthMm });
  A.addDoors(id);
  return id;
}

const leaves = (unitId) => (S().unitResult(unitId)?.panels || [])
  .filter((p) => p.role === 'front')
  .map((p) => Math.round(Number(p.w) || 0))
  .sort((a, b) => a - b);

const partitions = (unitId) => ((S().units.find((u) => u.id === unitId)
  ?.params.sections?.[0]?.items) || []).filter((i) => i.kind === 'partition');

/** Equal to within a millimetre of rounding — the probe's own 896 · 897. */
const equalPair = (ws) => ws.length === 2 && Math.abs(ws[1] - ws[0]) <= 2;

// ═══ THE PAIR COMES BACK, FROM WHEREVER THE FACE HAS BEEN ══════════════════

test('F3 · press 2 after ANY split or segment and the pair is equal', () => {
  const splitIt = (id, mm) => {
    const s = A.splitDoor(id);
    if (s && !s.said) A.setSplitTopMm(id, s.bay, mm);
  };
  const sequences = [
    ['nothing else', (id) => { A.setDoorCount(id, 2); }],
    ['a split leaf', (id) => { A.setDoorCount(id, 2); splitIt(id, 700); A.setDoorCount(id, 2); }],
    ['four doors', (id) => { A.setDoorCount(id, 4); A.setDoorCount(id, 2); }],
    ['four doors and a split', (id) => { A.setDoorCount(id, 4); splitIt(id, 700); A.setDoorCount(id, 2); }],
    ['three doors', (id) => { A.setDoorCount(id, 3); A.setDoorCount(id, 2); }],
    ['three bays', (id) => { A.setBayCount(id, 3); A.setDoorCount(id, 2); }],
    ['three bays and a split', (id) => { A.setBayCount(id, 3); splitIt(id, 700); A.setDoorCount(id, 2); }],
  ];
  for (const [what, drive] of sequences) {
    const id = wardrobe();
    drive(id);
    const ws = leaves(id);
    assert.ok(equalPair(ws), `after ${what}: the leaves came back ${ws.join(' · ')}`);
    // …and NOTHING of the split survived, in either of the two places it lives.
    const unit = S().units.find((u) => u.id === id);
    assert.ok(!(Number(unit.params.split_top_mm) > 0), `after ${what}: the carcass still holds a split`);
    assert.ok(!(unit.params.bay_doors || []).some((b) => Number(b?.split_top_mm) > 0),
      `after ${what}: a bay still holds a split`);
  }
});

test('F3 · the 1/4 and the 3/4 the owner saw are gone, by their own numbers', () => {
  // The probe's own two rows, asserted as regressions rather than described.
  const fromFour = wardrobe();
  A.setDoorCount(fromFour, 4);
  A.setDoorCount(fromFour, 2);
  assert.notDeepEqual(leaves(fromFour), [459, 1334], 'the 1/4 and 3/4 are back');
  assert.ok(equalPair(leaves(fromFour)));

  const fromThree = wardrobe();
  A.setDoorCount(fromThree, 3);
  A.setDoorCount(fromThree, 2);
  assert.notDeepEqual(leaves(fromThree), [608, 1185]);
  assert.ok(equalPair(leaves(fromThree)));
});

test('F3 · where the engine\'s own law gives the pair, the store adds no divider', () => {
  // *"the engine then cuts its standard equal pair by its own law"*. Above
  // `singleDoorMaxWidth` the face already carries two leaves, so a divider
  // would be a board nobody asked for — and the probe measured that it also
  // made the pair unequal at every width it tried.
  for (const w of [800, 1000, 1200, 1800, 2400]) {
    assert.equal(doorCountFor(w, P), 2, `${w} is not a two-leaf face by the engine's law`);
    const id = wardrobe(w);
    A.setDoorCount(id, 2);
    assert.equal(partitions(id).length, 0, `${w}: the store left a divider standing`);
    assert.ok(equalPair(leaves(id)), `${w}: ${leaves(id).join(' · ')}`);
  }
});

test('F3 · where the law gives ONE leaf, the divider stays — it is the only road to two', () => {
  // A 600 mm carcass asked for two doors cannot have them off the face law, so
  // the divider is not residue: it is the answer. The pair it gives is the
  // ENGINE's own bay-door arithmetic and `doors.js` is read-only tonight.
  for (const w of [600, 700]) {
    assert.equal(doorCountFor(w, P), 1, `${w} already carries two leaves`);
    const id = wardrobe(w);
    A.setDoorCount(id, 2);
    assert.equal(partitions(id).length, 1, `${w}: two doors with no divider is one door`);
    assert.equal(leaves(id).length, 2, `${w}: the client asked for two and got ${leaves(id).length}`);
  }
});

test('F3 · counts above two still get their dividers, re-centred', () => {
  for (const n of [3, 4]) {
    const viaFour = wardrobe(2400);
    A.setDoorCount(viaFour, 4);
    A.setDoorCount(viaFour, n);
    assert.equal(partitions(viaFour).length, n - 1, `${n} doors did not leave ${n - 1} dividers`);
    assert.equal(leaves(viaFour).length, n, `${n} doors cut ${leaves(viaFour).length} leaves`);
    // READ BOTH OFF NOW: `wardrobe()` starts a new project, so the wardrobe
    // above stops existing the moment the next one is made.
    const downFromFour = leaves(viaFour);
    const xs = partitions(viaFour).map((i) => Math.round(Number(i.x_mm) || 0)).sort((a, b) => a - b);

    // THE REGRESSION, said exactly: a count reached by coming DOWN from four
    // leaves the face in the same state as the same count asked for straight
    // out. Before tonight it did not — the divider stayed where the higher
    // count had put it, which is the whole of the owner's 1/4 and 3/4.
    const direct = wardrobe(2400);
    A.setDoorCount(direct, n);
    assert.deepEqual(downFromFour, leaves(direct),
      `${n} doors reached by coming down from four is a different wardrobe`);
    assert.deepEqual(
      xs,
      partitions(direct).map((i) => Math.round(Number(i.x_mm) || 0)).sort((a, b) => a - b),
      `${n} doors left its dividers somewhere else`,
    );

    // …and the dividers themselves stand at EVEN spacings, which is the half
    // of "equal" that belongs to the store. The leaves are then within the
    // ENGINE's own bay-door arithmetic of each other — a constant ~17 mm on
    // the last leaf at every width the probe tried, which lives in
    // `engine/doors.js` and is READ-ONLY tonight. Skipped and noted.
    const gaps = xs.map((x, i) => (i ? x - xs[i - 1] : x));
    assert.ok(Math.max(...gaps) - Math.min(...gaps) <= 20,
      `${n} doors: the dividers are not evenly spread — gaps ${gaps.join(' · ')}`);
  }
});

test('F3 · setting the top segment to 0 is the same reset, and says so once', () => {
  // *"Split door in EXTRAS still works; setting top segment 0 = the same
  // reset."* One act, one function — `clearSplitResidue` — and EXTRAS' own
  // ONE DOOR AGAIN reaches the same place `setDoorCount` does.
  const id = wardrobe();
  A.setDoorCount(id, 2);
  const s = A.splitDoor(id);
  assert.equal(s.said, '', 'the split refused before it could be tested');
  A.setSplitTopMm(id, s.bay, 700);
  assert.ok(leaves(id).length > 2, 'the split never happened');
  A.setSplitTopMm(id, s.bay, 0);
  assert.ok(equalPair(leaves(id)), `0 did not put the pair back: ${leaves(id).join(' · ')}`);
  assert.equal(A.clearSplitResidue(id), false, 'something still holds a split after 0');
});

test('F3 · the fix is at the STORE write site, and the engine is untouched', () => {
  const adapter = code('src/retail/design/adapter.js');
  const fn = adapter.slice(adapter.indexOf('export function setDoorCount'));
  const body = fn.slice(0, fn.indexOf('\n}\n'));
  assert.match(body, /clearSplitResidue\(unitId\)/, 'the count no longer clears the split');
  assert.match(body, /doorCountFor\(width, P\(\)\)/, 'the count no longer asks the engine\'s own law');
  assert.match(body, /centrePartitions\(unitId\)/, 'the survivors are no longer re-spread');
  // …and the clear goes through the store's own setters, never into params.
  const clear = adapter.slice(adapter.indexOf('export function clearSplitResidue'));
  assert.match(clear.slice(0, 600), /S\(\)\.setSplitTop\(unitId, 0\)/);
  assert.match(clear.slice(0, 600), /S\(\)\.setBaySplitTop\(unitId, i, 0\)/);
});
