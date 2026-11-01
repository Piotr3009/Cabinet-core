/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F8 . THE BASIN 50 FORWARD, AND IT NEVER ENTERS A BOARD
//
// The owner, 25.10.2026 (22:41): *"umywalki przesun bardziej do przodu o jakies
// 50 mm, powod: wchodza w tylna scianke, zlamana regula material nigdy nie
// wchodzi w drugi material"*. CLAUDE.md T83 F8: `wasteFromBack` 200 becomes 250
// (PROPOSED reading of "about 50"), the oval's centre with it; the engine
// CHECKS the bowl's solid against every board of the carcass; a bowl that would
// enter a board is refused in words (#48 grows the sentence: "the bowl enters
// RAIL-TOP by N mm: move the basin forward or take a shallower bowl"), never
// drawn through it. The U of the top box (columns 1) follows the waste.
//
// LISP FIRST: reference/lisp/KIT_VANITY.lsp D29 (D13, D14, D15, D18, D21, D25,
// D26 amended): vanityWasteFromBack 250, `vanity-u-depth`, `vanity-bowl-enters`
// (the bowl's solid the room's half ellipsoid), `vanity-bowl-shell`,
// `vanity-box-boards`, `vanity-bowl-boards`, `vanity-bowl-hits`,
// `vanity-bowl-sentence`, `vanity-bowl-refused`, `vanity-bowl-verdict`. The
// engine mirrors it (`engine/vanity.js`, `engine/worktop.js fitBasins` refuses
// a bowl that enters the shell, `cabinet.js` says the boards inside in #48).
//
// CLAUDE.md F8's test: the default VANITY3 with one basin: no board enters the
// bowl's oval or its depth; the waste 250 from the back; a bowl pushed to 50
// from the back says #48 in words. WHAT THE NUMBERS SAY (D29, the room says
// so): at 250 the bowl clears RAIL-TOP and the sides, but F6 moved the boxes 50
// forward too (the void inside), so the top box's back wall beside the U stands
// 22.1 in the bowl, said in #48 (21.1 until 31.10.2026: the wall stands 1 higher
// since, flush with the sides' top, the owner's "dziurki 5 mm ... powinny byc
// przesuniete o 1 mm do gory boxa"); the waste at 270, or a bowl 113 deep, enters
// nothing (held below), the owner's to set.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runChecks } from '../src/engine/checks.js';
import { basinCentresOf, fitBasins } from '../src/engine/worktop.js';
import { wallGapOf } from '../src/engine/runs.js';
import {
  vanityBowlEnters, vanityBowlHits, vanityBowlRefused, vanityBowlSentence, vanityBowlShell, vanitySpec, vanityUDepth,
  vanityBoxesOf,
} from '../src/engine/vanity.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';
import { goldenOf } from '../scripts/t75-golden.mjs';
import { loadLisp } from './lisp-mini.js';
import { parenBalance } from '../scripts/t57-paren-balance.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const TEXT = readFileSync(`${ROOT}reference/lisp/KIT_VANITY.lsp`, 'utf8');
const L = loadLisp(TEXT);
const PROSE = TEXT.split('\n').map((l) => l.replace(/^;;;\s?/, '')).join(' ').replace(/\s+/g, ' ');
const say = (s) => assert.ok(PROSE.includes(s), `the kit states: ${s}`);
const OWNER = 'umywalki przesun bardziej do przodu o jakies 50 mm, powod: wchodza w tylna scianke, zlamana regula material '
  + 'nigdy nie wchodzi w drugi material';

const G = P.board.thickness;
const GB = P.wardrobe.drawers.boxSideThickness;
const EX = [900, 600, 500, G, GB, P.front.thickness];
const S = () => useProjectStore.getState();
const withVanity = (v) => ({ ...P, vanity: { ...P.vanity, ...v, basin: { ...P.vanity.basin, ...(v.basin || {}) } } });
const kit = (extra = {}, profile = P) => computeCabinet({ ...defaultParamsFor('VANITY3', profile), unit_num: 'VU01', ...extra }, profile);
const byId = (r, id) => r.panels.find((p) => p.id === id);
const bowlSaid = (r) => r.warnings.filter((w) => w.code === 'VANITY_BOWL').map((w) => w.message);
const SHELL = ['BUL', 'BUR', 'RAIL-BOTTOM', 'RAIL-TOP'];
const DEFAULT_SAID = 'VU01: The bowl enters D3-BB-1 by 22.1 mm, D3-BB-2 by 22.1 mm: move the basin forward or take a shallower bowl.';

/**
 * The bowl against a board by brute force, the solid the room draws (3d/Basin.jsx: the lower half of an
 * ellipsoid, w / 2 by depth by d / 2, hung at the worktop's top): the deepest the board stands inside it over
 * a 1 mm grid of the board's footprint. Independent of the engine's nearest-point arithmetic.
 */
function sampledEntry(box, xw, zw, yTop, h, w = 520, d = 400) {
  let best = 0;
  const step = 1;
  for (let x = box.x; x <= box.x + box.w + 1e-9; x += Math.min(step, box.w || step)) {
    for (let z = box.z; z <= box.z + box.d + 1e-9; z += Math.min(step, box.d || step)) {
      const s = ((x - xw) / (w / 2)) ** 2 + ((z - zw) / (d / 2)) ** 2;
      if (s >= 1) continue;
      const bottom = yTop - h * Math.sqrt(1 - s);
      best = Math.max(best, Math.min(yTop, box.y + box.h) - Math.max(bottom, box.y));
    }
  }
  return best;
}

// === THE LISP, FIRST =========================================================

test('F8 . KIT_VANITY.lsp: D29 in the owner\'s words, 250 the PROPOSED reading of "about 50", the amended notes', () => {
  const b = parenBalance(TEXT);
  assert.equal(b.balance, 0);
  assert.equal(b.negativeAt, null);
  assert.ok(/^[\x00-\x7F]*$/.test(TEXT), 'ASCII');
  assert.doesNotMatch(TEXT, /[\u2013\u2014]/, 'no em or en dash');
  say(`D29 THE BOWL NEVER ENTERS A BOARD (CONFIRMED 22:41 "${OWNER}"; the 250 the PROPOSED reading of "about 50").`);
  say('the bowl clears RAIL-TOP (its oval 50 in front of the carcass back) but the top box\'s back wall beside the U stands 22.1 in it');
  say('the waste at 270, or a bowl 113 deep (115 until');
  for (const d of ['D13', 'D14', 'D15', 'D18', 'D25', 'D26']) {
    assert.match(PROSE, new RegExp(`${d} [^]*?AMENDED 25\\.10\\.2026 \\(T83 F8`), `${d} amended by F8`);
  }
  assert.equal(L.call('vanityWasteFromBack'), 250);
  assert.equal(P.vanity.wasteFromBackMm, 250, 'profile.vanity.wasteFromBackMm: the LISP\'s constant');
  assert.match(TEXT, /^;; profile\.vanity\.wasteFromBackMm .*T83 F8: 250, CONFIRMED 22:41/m);
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  assert.ok(src.includes('wasteFromBackMm: 250,') && src.includes('T83 F8 · 250 (was 200), CONFIRMED 22:41'));
  for (const r of ['vanity-u-depth', 'vanity-bowl-enters', 'vanity-bowl-shell', 'vanity-box-boards', 'vanity-bowl-boards',
    'vanity-bowl-hits', 'vanity-bowl-sentence', 'vanity-bowl-refused', 'vanity-bowl-verdict']) assert.ok(L.has(r), `${r} defined`);
});

// === THE WASTE 250 FROM THE BACK =============================================

test('F8 . the waste 250 from the carcass back: the basin\'s centre, the slab\'s oval, the trap\'s record, the TOP\'s hole', () => {
  const unit = { id: 'v', type: 'VANITY3', params: { ...defaultParamsFor('VANITY3', P), unit_num: 'VU01' } };
  assert.deepEqual(basinCentresOf(unit, P), [{ x: 450, z: 250 }]);
  const fit = fitBasins(unit, P);
  assert.equal(fit.refusal, null, 'the stone takes it: the oval 50 in front of the carcass back, 60 from the wall');
  assert.deepEqual(fit.fitted.map((b) => [b.cx, b.cz, b.z]), [[450, 250, 50]]);
  const r = kit();
  assert.equal(r.derived.vanity.trap.wasteFromBackMm, 250);
  assert.deepEqual(r.derived.vanity.basins, [450]);
  assert.deepEqual(byId(r, 'TOP').meta.vanityBasins.cutouts.map((c) => [c.x, c.z, c.opens]), [[450, 250, 'HOLE']]);
  assert.deepEqual(byId(r, 'TOP').meta.vanityBasins.dropped, [], 'the TOP\'s back joint whole: the oval 32 in front of its edge');
  assert.deepEqual(L.call('vanity-top-cutouts', [450], G), [[432, 232, 520, 400, 'HOLE']]);
});

test('F8 . the U of the top box follows the waste: 245 deep, reaching 330, the trap inside it, #39 silent', () => {
  const r = kit();
  const [top] = vanityBoxesOf(r.panels, { n: 3, columns: 1 }).filter((b) => b.idx === 3);
  assert.equal(vanityUDepth(top, GB, P), 245, '250 + 160 / 2 - 85');
  assert.equal(L.call('vanity-u-depth', L.call('vanity-boxes', ...EX, 3, 1, 80)[2], GB), 245);
  assert.deepEqual(byId(r, 'D3-DNO').meta.vanityTrap.notches, [[335.5, 495.5, 245, 20]]);
  assert.equal(byId(r, 'D3-DNO').meta.vanityTrap.depthMm, 245);
  assert.equal(top.zBack + 245 - 250, 80, 'the waste 80 inside the U');
  assert.deepEqual(r.warnings.filter((w) => w.code === 'VANITY_TRAP'), []);
  // Never less than the owner's 120; never past what keeps 30 of the bottom behind the box's front wall.
  assert.equal(vanityUDepth({ ...top }, GB, withVanity({ wasteFromBackMm: 100 })), 120);
  assert.equal(vanityUDepth({ ...top }, GB, withVanity({ wasteFromBackMm: 400 })), 390 - GB - 30);
  // The U is a cut of the box: the back wall's two boards stay 329 each, the U 160 wide as confirmed.
  assert.deepEqual(['D3-BB-1', 'D3-BB-2'].map((id) => byId(r, id).w), [329, 329]);
});

// === THE BOWL'S SOLID AGAINST EVERY BOARD ====================================

test('F8 . the default VANITY3 with one basin: no board of the shell enters the bowl, RAIL-TOP clear; the inside said in #48', () => {
  const r = kit();
  const T = vanitySpec(P);
  const yTop = 600 + 20;
  // The shell (the rails, the sides) and the BOTTOM: nothing enters the bowl's oval or its depth.
  for (const id of [...SHELL, 'BOTTOM']) {
    const p = byId(r, id);
    assert.equal(vanityBowlEnters(p.box, 450, 250, yTop, T.basinH, P), null, `${id} clear`);
    assert.equal(sampledEntry(p.box, 450, 250, yTop, T.basinH), 0, `${id} clear, by brute force`);
  }
  assert.deepEqual(vanityBowlRefused({
    W: 900, H: 600, D: 500, G, xs: [450], wt: 20, bowlH: T.basinH,
  }, P), [], 'the shell refuses nothing at 250');
  // Every other board: the brute force agrees with the engine to half a millimetre.
  for (const p of r.panels.filter((q) => q.box && q.id !== 'TOP' && q.role !== 'front')) {
    const e = vanityBowlEnters(p.box, 450, 250, yTop, T.basinH, P) || 0;
    assert.ok(Math.abs(e - sampledEntry(p.box, 450, 250, yTop, T.basinH)) < 0.5, `${p.id}: ${e}`);
  }
  // The numbers disagree and the room says so (D29): F6's shorter boxes put the back wall beside the U in the bowl.
  assert.deepEqual(bowlSaid(r), [DEFAULT_SAID]);
  assert.equal(bowlSaid(r)[0], L.call('vanity-bowl-verdict', 'VU01', ...EX, 3, 1, 1, [450], 20, T.basinH));
  // The cures the sentence names, held: the basin forward to 270, or a bowl 113 deep (115 until 31.10.2026: the walls stand
  // 1 higher since), and no board enters at all.
  for (const pr of [withVanity({ wasteFromBackMm: 270 }), withVanity({ basin: { heightMm: 113 } })]) {
    const rr = kit({}, pr);
    assert.deepEqual(bowlSaid(rr), []);
    const zw = vanitySpec(pr).wasteFromBackMm;
    for (const p of rr.panels.filter((q) => q.box && q.id !== 'TOP' && q.role !== 'front')) {
      assert.equal(sampledEntry(p.box, 450, zw, yTop, vanitySpec(pr).basinH) > 0.05, false, `${zw}/${vanitySpec(pr).basinH}: ${p.id}`);
    }
  }
});

test('F8 . #48 grows the sentence: "the bowl enters RAIL-TOP by N mm: move the basin forward or take a shallower bowl"', () => {
  assert.equal(vanityBowlSentence('VU01', [{ id: 'RAIL-TOP', mm: 22 }]),
    'VU01: The bowl enters RAIL-TOP by 22 mm: move the basin forward or take a shallower bowl.');
  assert.equal(vanityBowlSentence('VU01', [{ id: 'D3-BB-1', mm: 22.1 }, { id: 'D3-BB-2', mm: 22.1 }]), DEFAULT_SAID);
  assert.equal(L.call('vanity-bowl-sentence', 'VU01', [['RAIL-TOP', 22]]),
    vanityBowlSentence('VU01', [{ id: 'RAIL-TOP', mm: 22 }]), 'the LISP\'s words, to the letter');
  // The engine's hits are the LISP's, board for board, at columns 1 and at the trap's gap (F7).
  const r2 = kit({ columns: 2 });
  assert.deepEqual(bowlSaid(r2), [L.call('vanity-bowl-verdict', 'VU01', ...EX, 3, 2, 1, [450], 20, 150)]);
  // 31.10.2026: the back walls 1 higher (flush with the sides' top), so 1 deeper in the bowl: 7.1, not 6.1.
  assert.equal(bowlSaid(r2)[0], 'VU01: The bowl enters Z1D3-SR by 70 mm, Z2D3-SL by 70 mm, Z1D3-BB by 7.1 mm, '
    + 'Z2D3-BB by 7.1 mm: move the basin forward or take a shallower bowl.');
  const hits = vanityBowlHits(vanityBowlShell({
    W: 900, H: 600, D: 500, G,
  }, P), [450], 620, 150, withVanity({ wasteFromBackMm: 210 }));
  assert.deepEqual(hits, [{ id: 'RAIL-TOP', mm: 22 }]);
});

test('F8 . a bowl that enters the shell is refused in words with the worktop\'s refusals: cut in neither top, drawn nowhere', () => {
  const P210 = withVanity({ wasteFromBackMm: 210 });
  const unit = { id: 'v', type: 'VANITY3', params: { ...defaultParamsFor('VANITY3', P210), unit_num: 'VU01' } };
  const fit = fitBasins(unit, P210);
  assert.equal(fit.fitted.length, 0, 'not cut');
  assert.deepEqual(fit.basins.map((b) => b.fits), [false]);
  assert.equal(fit.refusal.why, 'bowl');
  assert.equal(fit.refusal.message, 'VU01: The bowl enters RAIL-TOP by 22 mm: move the basin forward or take a shallower bowl.');
  const L210 = loadLisp(TEXT.replace('(defun vanityWasteFromBack ( / ) 250.0)', '(defun vanityWasteFromBack ( / ) 210.0)'));
  assert.equal(fit.refusal.message, L210.call('vanity-bowl-refused', 'VU01', 900, 600, 500, G, [450], 20, 150), 'the LISP\'s');
  // The cut: no oval in the TOP, no basin, nothing to say inside (nothing drawn through anything).
  const r = kit({}, P210);
  assert.deepEqual(r.derived.vanity.basins, []);
  assert.equal(byId(r, 'TOP').meta?.vanityBasins, undefined);
  assert.deepEqual(bowlSaid(r), []);
  // Check #48 says it, yellow, from the slab's refusals (the road a basin the stone cannot take goes).
  const found = runChecks({ entries: [{ unit, result: r }], units: [unit], profile: P210 }).filter((f) => f.check === 48);
  assert.ok(found.every((f) => f.level === 'yellow'));
});

test('F8 . a bowl pushed to 50 from the back says #48 in words, and nothing is cut', () => {
  const P50 = withVanity({ wasteFromBackMm: 50 });
  const unit = { id: 'v', type: 'VANITY3', params: { ...defaultParamsFor('VANITY3', P50), unit_num: 'VU01' } };
  const fit = fitBasins(unit, P50);
  assert.equal(fit.fitted.length, 0);
  assert.equal(fit.refusal.message, 'VU01: A basin 400 deep does not fit the top of a 500 deep vanity: its waste stands 50 from the carcass back; take a smaller basin.');
  const r = kit({}, P50);
  assert.deepEqual(r.derived.vanity.basins, []);
  assert.equal(byId(r, 'TOP').meta?.vanityBasins, undefined, 'the TOP whole');
  // A smaller basin at 50 (the oval inside the stone) is the shell's to refuse: it would stand in RAIL-TOP.
  const small = withVanity({ wasteFromBackMm: 60, basin: { depthMm: 100, widthMm: 200 } });
  const u2 = { id: 'v', type: 'VANITY3', params: { ...defaultParamsFor('VANITY3', small), unit_num: 'VU01' } };
  const f2 = fitBasins(u2, small);
  assert.equal(f2.refusal?.why, 'bowl');
  assert.match(f2.refusal.message, /^VU01: The bowl enters RAIL-TOP by [0-9.]+ mm: move the basin forward or take a shallower bowl\.$/);
});

test('F8 . by the road the client clicks: a born vanity\'s slab cuts the oval 250 from the carcass back, #48 says the inside', () => {
  S().newProject('T83 F8');
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  confirmDrawerBox();
  const { id } = S().addUnit('VANITY3', { wall: 0, x: 1000 });
  const u = S().units.find((x) => x.id === id);
  const slab = S().worktopsOf().find((w) => (w.geometry?.unitIds || []).includes(id));
  const [cut] = (slab?.cutouts || []).filter((c) => c.kind === 'basin');
  assert.ok(cut, 'the basin is cut and drawn');
  assert.equal(cut.cz, wallGapOf(u, P) + 250);
  const found = S().runChecks().filter((f) => f.check === 48 && f.unitId === id);
  assert.deepEqual(found.map((f) => [f.level, Boolean(f.bowl), f.message]), [['yellow', true, DEFAULT_SAID]]);
});

test('F8 . the vanity goldens re-pinned on the owner\'s order hold the cut', () => {
  for (const rel of ['verify/t82/goldens/golden-vanity2.json', 'verify/t82/goldens/golden-vanity3.json',
    'verify/t82/goldens/golden-vanity4.json', 'verify/t82/goldens/golden-vanity3-sinks0.json',
    'verify/t82/goldens/golden-vanity3-sinks2.json', 'verify/t82/goldens/golden-vanity3-columns2.json',
    'verify/t83/goldens/golden-vanity3-columns2-sinks1.json']) {
    const g = JSON.parse(readFileSync(`${ROOT}${rel}`, 'utf8'));
    assert.deepEqual(goldenOf(g.params, P), g.expected, `${rel} moved`);
  }
});
