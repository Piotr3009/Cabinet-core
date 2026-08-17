// ─── TURN 37 (CLAUDE.md F3): HINGE PLATE — FIVE MORE MILLIMETRES OF BITE ────
//
// The owner walked every T36 feature on 17.08.2026, the day it merged. On the
// hinges he said one sentence:
//
//   *"zawiasy — dociśnij o następne 5 mm."*
//
// NASTĘPNE — "the NEXT five", not "five". T36-F4b had already sunk the plate
// GLB 5 mm into the carcass side so its knock-in dowels and screws sat in
// timber; he looked at that and wanted five more. So `hardware.hinge
// .plateBiteMm` is 10, and this file exists because a one-number change is
// exactly the kind that gets silently undone by the next person who reads the
// T36 comment and "fixes" the value back.
//
// Three things are held here, and the third is the one that matters to rule 2:
//
//   1. THE NUMBER — 10, and it is T36's 5 plus the owner's five, stated as
//      that sum so the arithmetic he did out loud is in the file.
//   2. THE CEILING — the bite stays under `plateThickness`. It is the only
//      constraint this number has, and it is a real one: a plate bitten
//      deeper than it is thick has its BACK face outside the board.
//   3. THE BITE CANNOT REACH THE CUT. T36 asserted this by grepping four
//      engine files. This turn's contract is BYTE-IDENTITY on
//      `computeCabinet()` (iron rule 2), so it is asserted the hard way
//      instead: the six standard configs are computed with the bite at 5, at
//      10 and at an absurd 99, and all three answers must come back character
//      for character identical. If this number ever reaches a panel or a
//      drill, this test fails before the classifier ever runs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

// The same six the classifier walks (`scripts/t37-classify.mjs`), named again
// here rather than imported, because a test that ran the contract script's CLI
// as a side effect of importing it would be proving something else.
const STANDARD_CONFIGS = ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY'];

/** The bare engine answer for one config, under a profile of our choosing. */
function computeUnder(id, profile) {
  return computeCabinet({ ...defaultParamsFor(id, profile), unit_num: '01' }, profile);
}

/** The stock profile with one hardware number swapped, nothing else moved. */
function withBite(mm) {
  const clone = structuredClone(P);
  clone.hardware.hinge.plateBiteMm = mm;
  return clone;
}

// ═══ 1. THE NUMBER ══════════════════════════════════════════════════════════

test('F3 — the bite is 10: T36’s five plus the owner’s "następne 5 mm"', () => {
  const T36_BITE = 5;          // what T36-F4b seated the plate at
  const OWNERS_EXTRA = 5;      // 17.08.2026, his word for word
  assert.equal(P.hardware.hinge.plateBiteMm, T36_BITE + OWNERS_EXTRA);
  assert.equal(P.hardware.hinge.plateBiteMm, 10);
});

test('F3 — it is still listed WITH the plate, where a workshop looks for it', () => {
  // T36's own placement law, re-asserted: the number lives beside the plate's
  // other measurements in the profile, not in the component that draws it.
  const profile = src('engine/profile.js');
  const at = profile.indexOf('plateBiteMm');
  assert.ok(at > profile.indexOf('plateThickness: 12'), 'listed with the plate');
  assert.ok(at > profile.indexOf('plateLength: 56'), '…and after its length');
});

// ═══ 2. THE CEILING ═════════════════════════════════════════════════════════

test('F3 — the bite stays UNDER the plate’s own thickness', () => {
  const H = P.hardware.hinge;
  assert.ok(
    H.plateBiteMm < H.plateThickness,
    `a plate bitten ${H.plateBiteMm} into ${H.plateThickness} of casting would `
    + 'have its back face outside the board — the picture would lie the other way',
  );
});

// ═══ 3. THE BITE CANNOT REACH THE CUT ═══════════════════════════════════════

test('F3 — no engine module reads the bite at all', () => {
  // T36 grepped four files. The bite is a 3-D placement, so the honest sweep is
  // the whole engine: only the profile that STATES it may name it.
  const dir = new URL('../src/engine/', import.meta.url);
  const walk = (at, into = []) => {
    for (const e of readdirSync(at, { withFileTypes: true })) {
      const next = new URL(`${e.name}${e.isDirectory() ? '/' : ''}`, at);
      if (e.isDirectory()) walk(next, into);
      else if (e.name.endsWith('.js')) into.push(next);
    }
    return into;
  };
  for (const file of walk(dir)) {
    if (file.pathname.endsWith('/engine/profile.js')) continue;   // it states it
    assert.doesNotMatch(
      readFileSync(file, 'utf8'), /plateBiteMm/,
      `${file.pathname.split('/src/')[1]} must not read the bite`,
    );
  }
});

test('F3 — the six standard configs do not move when the bite does (rule 2)', () => {
  // THE BYTE-IDENTITY PROOF. Same params, same engine, three different bites —
  // 5 (T36's), 10 (the owner's) and 99 (absurd on purpose, so that a reader
  // that clamps or rounds is caught too). Every answer must be the same text.
  for (const id of STANDARD_CONFIGS) {
    const at10 = JSON.stringify(computeUnder(id, P));
    for (const mm of [5, 99]) {
      assert.equal(
        JSON.stringify(computeUnder(id, withBite(mm))), at10,
        `${id}: the bite reached the engine at ${mm} mm — no panel, drill or BOM `
        + 'line may follow from a 3-D placement number',
      );
    }
  }
});

test('F3 — the 3D reads the number THROUGH the profile, never its own copy', () => {
  // The whole point of a profile-listed number: the day a workshop fits a
  // different plate, one line changes. A literal in the component would be a
  // second truth, and this is the assertion that keeps it from appearing.
  const carcass = src('3d/Hardware.jsx');
  assert.match(carcass, /const bite = Number\(H\.plateBiteMm\) \|\| 0;/);
  assert.doesNotMatch(carcass, /bite = 5\b/, 'no hardcoded T36 bite left behind');
  assert.doesNotMatch(carcass, /bite = 10\b/, 'and no hardcoded T37 one either');
});
