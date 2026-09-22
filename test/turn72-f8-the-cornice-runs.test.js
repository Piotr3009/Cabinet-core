// ─── TURN 72 · F8 — CORNICE: ALL OR NONE ALONG A RUN ─────────────────────
//
// The owner, 22.09.2026:
//
//   *"każda dodatkowa szafa albo też ma cornice, albo żadna nie ma, bo jak
//   dodajesz szafę to człowiek jest confused."*
//
// THE RUN HAS BEEN THE UNIT OF THIS PIECE SINCE TURN 22 — one moulding across
// adjacent cornice-bearing cabinets — and `engine/runs.js runMemberIds` states
// the principle in as many words: *"The piece belongs to the run, so the
// DECISION belongs to the run."*  That is the sentence turn 14 wrote for the
// TOP INFILL, for the identical reason. This is the cornice catching up.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { corniceRunNotice, takesCornice } from '../src/engine/cornice.js';
import { runMemberIds } from '../src/engine/runs.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();

function aWideRoom() {
  S().newProject();
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2700 });
}

const wardrobe = (opts = {}) => S().addUnit('WARDROBE', {
  params: { width: 1000, height: 2200, depth: 600 }, ...opts,
});
const corniceOf = (id) => Number(S().units.find((u) => u.id === id)?.params?.cornice) || 0;
const allCornices = () => S().units.map((u) => corniceOf(u.id));

// ─── 1 · A WARDROBE ADDED BESIDE A RUN TAKES THE RUN'S ANSWER ─────────────

test('F8 · added beside a run WITH a cornice, the new wardrobe has one', () => {
  aWideRoom();
  const a = wardrobe().id;
  S().setCornice(a, 70);
  assert.equal(corniceOf(a), 70);

  const b = wardrobe({ near: a, side: 'R' }).id;
  assert.equal(corniceOf(b), 70, 'the new wardrobe arrived bare beside a moulded run');
  assert.deepEqual(allCornices(), [70, 70], 'the run mixes');

  // …and a THIRD takes it too, which is what "each additional one" means.
  const c = wardrobe({ near: b, side: 'R' }).id;
  assert.equal(corniceOf(c), 70);
});

test('F8 · added beside a run WITHOUT one, it stays bare — a plain add is a plain add', () => {
  aWideRoom();
  const a = wardrobe().id;
  assert.equal(corniceOf(a), 0);
  const b = wardrobe({ near: a, side: 'R' }).id;
  assert.deepEqual(allCornices(), [0, 0]);
  assert.equal(corniceOf(b), 0, 'the add invented a moulding nobody asked for');
});

test('F8 · a cabinet that is NOT in the run keeps its own answer', () => {
  aWideRoom();
  const a = wardrobe().id;
  // A SECOND RUN, stood clear before the first one is moulded — so nothing
  // about it is an ADD beside a moulded run, which is the other half of F8.
  const far = wardrobe().id;
  S().moveUnit(far, 4500, 0);
  assert.ok(!runMemberIds(S().units, a, P).includes(far),
    'the two are one run — the fixture is not two runs');

  S().setCornice(a, 70);
  assert.equal(corniceOf(a), 70);
  assert.equal(corniceOf(far), 0, 'a cabinet in another run took this run\'s moulding');
});

// ─── 2 · THE DECISION IS THE RUN'S, BOTH WAYS ────────────────────────────

test('F8 · switching one ON puts it on the whole run', () => {
  aWideRoom();
  const a = wardrobe().id;
  const b = wardrobe({ near: a, side: 'R' }).id;
  assert.deepEqual(allCornices(), [0, 0]);
  S().setCornice(b, 100);
  assert.deepEqual(allCornices(), [100, 100], 'the moulding stops in mid-air over the neighbour');
});

test('F8 · removing it from ONE removes it from the run — and says so', () => {
  aWideRoom();
  const a = wardrobe().id;
  const b = wardrobe({ near: a, side: 'R' }).id;
  S().setCornice(a, 70);
  assert.deepEqual(allCornices(), [70, 70]);

  const { notices } = S().setCornice(b, 0);
  assert.deepEqual(allCornices(), [0, 0], 'half a run kept the moulding');
  assert.ok(notices.some((n) => /came off all 2 cabinets of this run/.test(n)),
    `the notice does not say so: ${JSON.stringify(notices)}`);
});

test('F8 · a run of ONE says nothing — that is not a run anybody is confused by', () => {
  aWideRoom();
  const a = wardrobe().id;
  const { notices } = S().setCornice(a, 70);
  assert.ok(!notices.some((n) => /this run/.test(n)), `a lone cabinet was lectured: ${JSON.stringify(notices)}`);
  assert.equal(corniceRunNotice({ height: 70, count: 1 }), null);
  assert.equal(corniceRunNotice({ height: 0, count: 1 }), null);
});

test('F8 · the words are the ENGINE\'s, and they say which way the answer went', () => {
  assert.match(corniceRunNotice({ height: 70, count: 3, label: 'W02' }),
    /^W02: the 70 mm cornice runs across all 3 cabinets of this run/);
  assert.match(corniceRunNotice({ height: 0, count: 3, label: 'W02' }),
    /^W02: the cornice came off all 3 cabinets of this run/);
  // The store carries none of this text itself.
  const store = read('src/stores/projectStore.js');
  assert.ok(!/cabinets of this run/.test(store), 'the store wrote its own sentence');
  assert.match(store, /corniceRunNotice\(\{ height, count: ids\.size/);
});

// ─── 3 · AND WHAT THE RUN LAW MAY NOT DO ─────────────────────────────────

test('F8 · a cabinet whose kit takes no cornice is SKIPPED, never refused', () => {
  aWideRoom();
  const a = wardrobe().id;
  // A base unit in the middle of a run: it has no `supports.cornice`.
  const base = S().addUnit('BUD', { near: a, side: 'R' });
  if (!base.id) return;                       // the kit would not fit — nothing to prove
  assert.equal(takesCornice('BUD'), false, 'the fixture is not the kit this test needs');
  S().setCornice(a, 70);
  assert.equal(corniceOf(a), 70);
  assert.equal(corniceOf(base.id), 0, 'a moulding was put on a base unit');
});

test('F8 · the infill it is fixed to is asked for on EVERY member', () => {
  aWideRoom();
  const a = wardrobe().id;
  const b = wardrobe({ near: a, side: 'R' }).id;
  S().setCornice(a, 70);
  for (const id of [a, b]) {
    const own = Number(S().units.find((u) => u.id === id)?.params?.top_infill_mm) || 0;
    assert.ok(own >= P.autoParts.cornice.infillHeight,
      `${id} has nothing for the moulding to be fixed to`);
  }
});

test('F8 · ONE BATCH — a run of three is one Ctrl+Z', () => {
  assert.match(read('src/stores/projectStore.js'),
    /setCornice: \(unitId, value\) => runBatch\(\(\) => \{/);
  watchProjectHistory();
  try {
    aWideRoom();
    const a = wardrobe().id;
    const b = wardrobe({ near: a, side: 'R' }).id;
    wardrobe({ near: b, side: 'R' });
    flushHistory();
    useHistoryStore.getState().clear();

    S().setCornice(a, 70);
    flushHistory();
    assert.deepEqual(allCornices(), [70, 70, 70]);

    assert.equal(useHistoryStore.getState().undo(), true, 'there was nothing to undo');
    flushHistory();
    assert.deepEqual(allCornices(), [0, 0, 0], 'one undo did not take the whole run back');
  } finally {
    unwatchProjectHistory();
  }
});

test('F8 · the ADD asks AFTER the settle, because the settle decides the run', () => {
  const store = read('src/stores/projectStore.js');
  const add = store.slice(store.indexOf('addUnit: (typeId,'),
    store.indexOf('return { id: unit.id, error: null, wall: placed.wall };'));
  assert.ok(add.indexOf('get().settleLayout(unit.id);') < add.indexOf('if (takesCornice(unit.type)) {'),
    'the cornice is read before the layout has settled');
  // The ANSWER is READ off the neighbours, never guessed.
  assert.match(add, /runMemberIds\(get\(\)\.units, unit\.id, profile\)/);
  assert.match(add, /\.find\(\(h\) => h > 0\) \|\| 0;/);
  assert.match(add, /if \(answer > 0\) get\(\)\.setCornice\(unit\.id, answer\);/,
    'the add writes the cornice itself instead of pressing the one law');
});

test('F8 · and the geometry is still `runCorniceParams` — ONE moulding, one BOM line', () => {
  aWideRoom();
  const a = wardrobe().id;
  const b = wardrobe({ near: a, side: 'R' }).id;
  S().setCornice(a, 70);
  const owner = S().runElements[a]?.cornice;
  assert.equal(owner?.role, 'owner');
  assert.equal(S().runElements[b]?.cornice?.role, 'member');
  assert.equal(owner.unitIds.length, 2, 'one moulding over the two of them');
  const rows = S().allResults().flatMap((e) => e.result.hardware).filter((h) => h.role === 'cornice');
  assert.equal(rows.length, 1, 'the owner orders; the member does not');
});
