// ─── T52 · F3 — LISP FIRST: THE DOG-BONE COUNTS FOLLOW THE HEIGHT ──────────
//
// The owner, 26.08.2026:
//
//   *"jak niska szafka poniżej 600 mm to już zrób 2 dog bonesy, a jak poniżej
//   300 to jeden dog bones — na plecach i BUL i BUR."*
//
// Two numbers, both his, and one of them is a boundary the app can only reach
// from one side: `lowCabinet.minHeight` is EXACTLY 300, so `< 300` could never
// fire and the feature would ship dead. It is `<= 300`, and the profile, the
// LISP and this file all say so.
//
// Turn 8's 346 does not disappear — it stops being the SWITCH and becomes the
// FLOOR the switch may never go below, because under 346 the three dog bones
// genuinely collide. `test/low-tabs.test.js` holds that.
//
// LISP IS LAW, FIRST (iron rule 3): a drilling rule is born in
// `reference/lisp/SKYLON_COMMON.lsp` before any JS, and this file asserts the
// two say the same thing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { backPanelGeometry, middleTabThreshold, tabCentres } from '../src/engine/puzzle.js';

const pz = P.puzzle;
const G = P.board.thickness;
const LISP = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');

const dogbones = (panel) => panel.cnc.pockets.filter((p) => p.layer === pz.layers.dogbone).length;
const sockets = (geom, edge) => geom.pockets
  .filter((p) => p.layer === pz.layers.socket && Math.abs((edge === 'L' ? p.x1 : p.x2) - (edge === 'L' ? 0 : 600)) < 30)
  .length;

/** A LOW_CABINET at a stated height — the type the rule is reachable from. */
const low = (height) => computeCabinet({
  type: 'LOW_CABINET', width: 600, height, depth: 578, unit_num: 'LC01',
  doors: { count: 1, hinge: 'L' },
}, P);

// ─── WHERE IT IS BORN ──────────────────────────────────────────────────────

test('F3 — the rule is stated in the LISP, and the LISP is where it is born', () => {
  assert.match(LISP, /\(defun SKY:tabCount \(len one three\)/);
  assert.match(LISP, /\(defun SKY:tabCentres \(len e one three \/ n\)/);
  assert.match(LISP, /\(defun SKY:middleTabFloor \(e tabHalf boneHalf boardT\)/);
  // The owner's own sentence, so the reason survives the next reader.
  assert.match(LISP, /jak niska szafka ponizej 600 mm to juz zrob 2 dog bonesy/);
  // …and the one thing that would have shipped it dead, named where it is decided.
  assert.match(LISP, /could never fire on the one cabinet it exists for/);
  assert.match(LISP, /at or under 300\s+ONE tenon/);
});

test('F3 — the LISP’s own `cond` is the one the engine runs', () => {
  // Three arms, in this order: at-or-under `one` → 1; under `three` → 2; else 3.
  assert.match(LISP, /\(cond \(\(<= len one\) 1\)\s*\n\s*\(\(< len three\) 2\)\s*\n\s*\(T 3\)\)\)/);
});

// ─── THE PROFILE ───────────────────────────────────────────────────────────

test('F3 — 346 became 600, and 346 is written down as the floor', () => {
  assert.equal(pz.middleTabBelow, 600, 'the owner’s number, not the derived one');
  assert.equal(middleTabThreshold(pz, G), 346, 'and the derivation still computes');
  assert.ok(pz.middleTabBelow > middleTabThreshold(pz, G),
    'the switch stands clear of the collision it must never reach');

  const src = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('middleTabBelow:') - 3000, src.indexOf('singleTabAtOrBelow:') + 200);
  assert.ok(/FLOOR/.test(block), 'the profile says the 346 is now a floor');
  assert.ok(/190 \+ 120 \+ 36/.test(block), '…and keeps the derivation that makes it one');
});

test('F3 — the single-tab threshold is AT OR BELOW 300, or it ships dead', () => {
  assert.equal(pz.singleTabAtOrBelow, 300);
  assert.equal(P.lowCabinet.minHeight, 300,
    'the minimum the UI can build — which is why `< 300` could never fire');
  assert.equal(tabCentres(P.lowCabinet.minHeight, pz).length, 1,
    'at the minimum height the rule DOES fire');

  const src = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  assert.ok(/AT OR UNDER/.test(src), 'and the profile says why in as many words');
});

// ─── THE THREE COUNTS, AT THE HEIGHTS THE MORNING AUDIT ASKS FOR ───────────

test('F3 — 700, 500 and 280 yield three, two and one', () => {
  assert.equal(tabCentres(700, pz).length, 3);
  assert.equal(tabCentres(500, pz).length, 2);
  assert.equal(tabCentres(280, pz).length, 1);

  assert.deepEqual(tabCentres(700, pz), [95, 350, 605]);
  assert.deepEqual(tabCentres(500, pz), [95, 405]);
  assert.deepEqual(tabCentres(280, pz), [140], 'one, on the panel’s own middle');
});

test('F3 — the boundaries read the way the owner said them', () => {
  // "poniżej 600" — 600 itself still takes three.
  assert.equal(tabCentres(600, pz).length, 3, '600 is not below 600');
  assert.equal(tabCentres(599, pz).length, 2);
  // "poniżej 300", taken as at-or-under because 300 is the only buildable one.
  assert.equal(tabCentres(301, pz).length, 2);
  assert.equal(tabCentres(300, pz).length, 1);
  assert.equal(tabCentres(299, pz).length, 1);
});

// ─── ON THE BACK AND ON BUL AND BUR — "na plecach i BUL i BUR" ─────────────

test('F3 — the counts reach BUL, BUR and the BACK, at every step', () => {
  for (const [height, want] of [[700, 3], [500, 2], [280, 1]]) {
    const r = low(height);
    const bul = r.panels.find((p) => p.id === 'BUL');
    const bur = r.panels.find((p) => p.id === 'BUR');
    const back = r.panels.find((p) => p.id === 'BACK');
    assert.equal(dogbones(bul), want, `${height}: BUL cuts ${want}`);
    assert.equal(dogbones(bur), want, `${height}: BUR cuts ${want}`);
    // The BACK receives them. Its side sockets are cut at the very centres the
    // sides' tenons are (`backPanelGeometry` calls the same `tabCentres`), so a
    // tenon can never be left with nothing to go into.
    const geom = backPanelGeometry({ w: 600, h: height, G, puzzle: pz });
    assert.equal(sockets(geom, 'L'), want, `${height}: the back’s left edge takes ${want}`);
    assert.equal(sockets(geom, 'R'), want, `${height}: …and its right edge too`);
    assert.ok(back.cnc.pockets.filter((p) => p.layer === pz.layers.socket).length
      >= 2 * want, `${height}: the built back carries them`);
  }
});

test('F3 — and every dog bone still lands inside the panel it is cut in', () => {
  for (const height of [700, 500, 346, 301, 300, 280, P.lowCabinet.minHeight]) {
    for (const c of tabCentres(height, pz)) {
      assert.ok(c - pz.dogboneHalfHeight >= 0, `${height}: ${c} runs off the bottom`);
      assert.ok(c + pz.dogboneHalfHeight <= height, `${height}: ${c} runs off the top`);
    }
    // …and no two of them touch.
    const cs = tabCentres(height, pz);
    for (let i = 1; i < cs.length; i += 1) {
      assert.ok(cs[i] - cs[i - 1] >= 2 * pz.dogboneHalfHeight,
        `${height}: ${cs[i - 1]} and ${cs[i]} collide`);
    }
  }
});

// ─── AND NOTHING TALL MOVED ────────────────────────────────────────────────

test('F3 — every ordinary carcass is untouched: three, exactly as before', () => {
  for (const height of [600, 720, 770, 2100, 2150]) {
    assert.equal(tabCentres(height, pz).length, 3, `${height} still cuts three`);
    assert.deepEqual(tabCentres(height, pz), [95, height / 2, height - 95]);
  }
});
