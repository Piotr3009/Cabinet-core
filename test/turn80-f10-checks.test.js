/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F10 · THE CHECKS ───────────────────────────────────────────────────
//
// CLAUDE.md T80 F10: *"New checks, numbered from #40 (PROBE first: the next
// free numbers in engine/checks.js ...): #40 red, front type not 22 under
// in-frame; #41 yellow, cabinets not butted (the stile grows); #42 yellow, a
// unit the frame stops at (the run split into frame segments); #43 yellow, the
// frame joined (wider than the board); #44 red, a cup within 3 of the lip.
// Each in the left messages and in the Check panel, each with its own test."*
// The probe (verify/t80/f10-probe.md) found 40 to 44 free. And the front-gap
// rule (#2) learns the frame: a set-in front's neighbour is the frame's stile,
// 3 off, never the next front 44 away across it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { runFrameParams } from '../src/engine/inframe.js';
import { CHECKS } from '../src/engine/checks.js';
import { INFRAME_CHECKS, inframeFindings, spacedMm } from '../src/engine/inframeChecks.js';
import { frontClearances, frontGapRows, NEIGHBOUR } from '../src/engine/frontClearance.js';
import { inframeHinge } from '../src/engine/hingeLadder.js';
import { rectCorners } from '../src/engine/room.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const L = loadLisp(read('reference/lisp/KIT_INFRAME.lsp'));
const S = () => useProjectStore.getState();
const OURS = [40, 41, 42, 43, 44];

/** Units on one wall, 22 fronts, each computed as the store hands it to the engine (the run element, the flag). */
function scene(rows) {
  const units = rows.map(([type, x, width, extra = {}], i) => ({
    id: `u${i}`, type, position: { wall: 0, x_mm: x, rotation_deg: 0 },
    params: { ...defaultParamsFor(type, P), unit_num: String(i + 1).padStart(2, '0'), width, front_t: 22, ...extra },
  }));
  const els = runFrameParams(units, P);
  const entries = units.map((u) => {
    const el = els.get(u.id);
    const framed = el && (el.role === 'owner' || el.role === 'member');
    return { unit: u, result: computeCabinet({ ...u.params, type: u.type, ...(framed ? { inframe: true, run_frame: el } : {}) }, P) };
  });
  return { units, entries };
}
const ours = (fs) => fs.filter((f) => OURS.includes(f.check));

/** The mockup's kitchen in the store (F3's scene), its front type given a board. */
function mockup({ inframe = true, material = 'generic-22' } = {}) {
  S().newProject('T80 F10');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  S().setFrontType('f1', { source: 'spray', ...(material ? { material_id: material } : {}) });
  const add = (type, x) => S().addUnit(type, { wall: 0, x }).id;
  const a = add('BUD', 1000); const b = add('BUD', 1600); const c = add('BUDR2', 2400); const w = add('WUD', 1000);
  S().updateUnitParams(a, { width: 600 }); S().updateUnitParams(b, { width: 800 });
  S().updateUnitParams(c, { width: 500 }); S().updateUnitParams(w, { width: 600 });
  S().setDoors(a, { count: 1, hinge: 'L' }); S().setDoors(b, { count: 2, hinge: 'L' }); S().setDoors(w, { count: 1, hinge: 'L' });
  S().addEndPanel(a, { side: 'L', thickness: 18 });
  if (inframe) S().setDesign({ inframe: true });
  return { a, b, c, w };
}

// ═══ THE PROBE, AS ASSERTIONS ═════════════════════════════════════════════

test('F10 probe · #40 to #44 are the next rows of the registry, in CLAUDE.md\'s colours; #37 to #39 stay unused', () => {
  // AMENDED BY T82 F3 (25.10.2026): #37 and #38 are the HAWA pocket's now (KIT_HAWA.lsp
  // `hawa-check-37`, `hawa-check-38`; the owner: *"wysuwasz pocket door i zakrywasz
  // szafke lub szafki"*) and #47 its panels' note; this probe reads the in-frame band.
  assert.deepEqual(CHECKS.filter((c) => c.n === 37 || c.n === 38 || c.n === 47).map((c) => c.label.slice(0, 4)), ['HAWA', 'HAWA', 'HAWA']);
  // AMENDED BY T82 F9 (25.10.2026): T82 fills #39 (the vanity's trap, the owner: *"prosze
  // uzyc shallow trap"*) and #45 on; this probe reads the in-frame band, #40 to #44.
  const rows = CHECKS.filter((c) => c.n >= 40 && c.n <= 44);
  assert.deepEqual(rows.map((c) => [c.n, c.level]), [[40, 'red'], [41, 'yellow'], [42, 'yellow'], [43, 'yellow'], [44, 'red']]);
  for (const c of rows) assert.match(c.label, /in-frame/i, `#${c.n} says what it is about`);
  assert.deepEqual(Object.values(INFRAME_CHECKS), OURS);
  // The probe file is committed beside the turn's others.
  assert.match(read('verify/t80/f10-probe.md'), /\*\*40, 41, 42, 43, 44\*\* \| \*\*FREE\*\*/);
});

// ═══ #40 THE FRONTS ARE 22 ════════════════════════════════════════════════

test('F10 · #40 red: an in-frame project whose front type is not 22, said once per front type in CLAUDE.md\'s words', () => {
  mockup({ material: null });
  const red = S().runChecks().filter((f) => f.check === 40);
  assert.equal(red.length, 1, 'one row for the front type, not one per door');
  assert.equal(red[0].level, 'red');
  assert.equal(red[0].message, 'In-frame fronts are 22 mm: front type f1 is 18 mm. Change the front material or switch back to lay-on.');
  // The fronts are not silently thickened (KIT_INFRAME.lsp D12): the doors stay 18, faces on the frame's face.
  const door = S().unitResult(S().units[0].id).panels.find((p) => p.role === 'front');
  assert.equal(door.thickness, 18);
  // A 22 board assigned: nothing to say.
  mockup({ material: 'generic-22' });
  assert.deepEqual(ours(S().runChecks()), []);
  // Lay-on: the rule never hears of the project.
  mockup({ inframe: false, material: null });
  assert.deepEqual(ours(S().runChecks()), []);
});

// ═══ #2 THE FRONT GAP SEES THE FRAME ══════════════════════════════════════

test('F10 · #2 under in-frame: a set-in front meets the frame 3 off (the stile), the pair meets at 3, nothing to report', () => {
  mockup();
  const fs = S().runChecks();
  assert.deepEqual(fs.filter((f) => f.check === 2), [], 'no "44 mm too wide" across a stile, no "22 mm" to the end panel');
  const rows = S().frontClearances();
  const a = rows.find((r) => r.unitNum === '01');
  assert.deepEqual([a.edges.left.kind, a.edges.left.gapMm, a.edges.right.kind, a.edges.right.gapMm],
    [NEIGHBOUR.FRAME, 3, NEIGHBOUR.FRAME, 3]);
  assert.equal(a.edges.left.correctionMm, 0, 'the matrix corrects nothing in a frame (the healer writes no trim)');
  const pair = rows.filter((r) => r.unitNum === '02');
  assert.deepEqual(pair.map((r) => [r.edges.left.kind, r.edges.left.gapMm, r.edges.right.kind, r.edges.right.gapMm]),
    [[NEIGHBOUR.FRAME, 3, NEIGHBOUR.FRONT, 3], [NEIGHBOUR.FRONT, 3, NEIGHBOUR.FRAME, 3]]);
  assert.deepEqual(frontGapRows(rows, P), []);
});

test('F10 · #2 with the switch off is main\'s: the lay-on fronts meet each other and the end panel as before', () => {
  mockup({ inframe: false });
  const rows = S().frontClearances();
  assert.ok(rows.every((r) => !('opening' in r)), 'a lay-on front carries no opening');
  assert.ok(rows.every((r) => r.edges.left.kind !== NEIGHBOUR.FRAME && r.edges.right.kind !== NEIGHBOUR.FRAME));
  const { entries } = scene([['BUD', 0, 600], ['BUD', 600, 600]]);
  const bare = frontClearances({ entries: entries.map((e) => ({ unit: e.unit, result: computeCabinet({ ...e.unit.params, type: e.unit.type }, P) })), profile: P });
  assert.deepEqual(bare.map((r) => r.edges.right.kind), [NEIGHBOUR.FRONT, NEIGHBOUR.NONE]);
});

// ═══ #41 THE STILE GROWS BY THE GAP ═══════════════════════════════════════

test('F10 · #41 yellow: two cabinets of one run not butted, the stile lip + t + gap + t + lip, named both', () => {
  // Within the run's own tolerance (1 mm, profile.autoParts.topInfill.runGap): ONE frame, a wider stile.
  const { units, entries } = scene([['BUD', 0, 600], ['BUD', 600.5, 600]]);
  const fs = inframeFindings({ entries, units, design: { inframe: true }, profile: P });
  assert.deepEqual(fs.map((f) => [f.check, f.level, f.unitNum]), [[41, 'yellow', '02']]);
  assert.equal(fs[0].message, 'In-frame: cabinets 01 and 02 stand 0.5 mm apart, the stile between them is 38.5, not 38.');
  // CLAUDE.md's own example, on the LISP (D5): 4 mm apart, a stile of 42.
  const kit = L.call('inframe-frame', [[0, 600, 770, 0, 18], [604, 600, 770, 0, 18]], ['OPEN', 0], ['OPEN', 0]);
  assert.deepEqual(L.call('inframe-stiles', kit), [20, 42, 20]);
  // Butted: nothing.
  const butted = scene([['BUD', 0, 600], ['BUD', 600, 600]]);
  assert.deepEqual(inframeFindings({ ...butted, design: { inframe: true }, profile: P }), []);
});

// ═══ #42 THE FRAME STOPS ══════════════════════════════════════════════════

test('F10 · #42 yellow: a unit the frame stops at, once, the run framed either side of it', () => {
  const { units, entries } = scene([['BUD', 0, 600], ['OVEN_BASE', 600, 600], ['BUD', 1200, 600]]);
  const fs = inframeFindings({ entries, units, design: { inframe: true }, profile: P });
  assert.deepEqual(fs.map((f) => [f.check, f.level, f.unitId]), [[42, 'yellow', 'u1']]);
  assert.match(fs[0].message, /^In-frame: the frame stops at 02 \(.+: no frame on it this turn\); the run is framed either side of it, a 19 mm stile at each split\.$/);
  const owners = [...runFrameParams(units, P).values()].filter((e) => e?.role === 'owner');
  assert.equal(owners.length, 2, 'two frames, one either side');
  // A front line that steps (a shallower cabinet): each side is a frame of its own, said once.
  const step = scene([['BUD', 0, 600], ['BUD', 600, 600, { depth: 400 }]]);
  const f2 = inframeFindings({ ...step, design: { inframe: true }, profile: P });
  assert.deepEqual(f2.map((f) => f.check), [42]);
  assert.equal(f2[0].message, 'In-frame: the frame stops between 01 and 02: their carcass fronts do not stand on one line, so each side is a frame of its own.');
});

// ═══ #43 THE FRAME IS JOINED ══════════════════════════════════════════════

test('F10 · #43 yellow: a frame wider than the board, in CLAUDE.md\'s words, the stile named', () => {
  assert.equal(spacedMm(3200), '3 200');
  assert.equal(spacedMm(1920), '1 920');
  assert.equal(spacedMm(376.5), '376.5');
  const { units, entries } = scene([0, 600, 1200, 1800, 2400].map((x) => ['BUD', x, 600]));
  const fs = inframeFindings({ entries, units, design: { inframe: true }, profile: P });
  assert.deepEqual(fs.map((f) => [f.check, f.level]), [[43, 'yellow']]);
  assert.equal(fs[0].message, 'In-frame frame is 3 002 wide: two boards, joined at the stile between 02 and 03.');
  assert.deepEqual(fs[0].pieces, ['FRAME-1', 'FRAME-2']);
  // The LISP's own cut, D9's worked example: at 1201, the centre of the stile between the second and third cabinet.
  const el = runFrameParams(units, P).get('u0');
  assert.deepEqual(el.pieces.map((p) => [p.from, p.to]), [[0, 1201], [1201, 3002]]);
});

// ═══ #44 THE CUP AND THE LIP ══════════════════════════════════════════════

test('F10 · #44 red: a hinge file whose K would cut the lip away is said, per leaf; the shipped file is clear', () => {
  const { units, entries } = scene([['BUD', 0, 600]]);
  assert.deepEqual(inframeFindings({ entries, units, design: { inframe: true }, profile: P }), [], 'K 4: the cup\'s edge 7 off the lip');
  const bad = { ...inframeHinge(), rules: { ...inframeHinge().rules, boring_distance_k: { used: -1 } } };
  const fs = inframeFindings({ entries, units, design: { inframe: true }, profile: P, hinge: bad });
  assert.deepEqual(fs.map((f) => [f.check, f.level, f.panelId]), [[44, 'red', '01-F']]);
  assert.match(fs[0].message, /the hinge cup's edge stands 2 mm off the frame's lip, under 3/);
  assert.deepEqual(fs[0].subject, { unitId: 'u0', panelId: '01-F', editor: 'element' });
});

// ═══ THE TWO SURFACES ═════════════════════════════════════════════════════

test('F10 · the Check panel prints them by the registry; the left column draws the same findings beside the front-gap rows', () => {
  mockup({ material: null });
  const fs = S().runChecks().filter((f) => f.check === 40);
  assert.equal(CHECKS.find((c) => c.n === fs[0].check).label, 'In-frame front is not 22 mm');
  const left = read('src/components/InframeWarnings.jsx');
  assert.match(left, /useCheckFindings\(\)/, 'the Check panel\'s own list');
  assert.match(left, /useGoToSubject\(\)/, 'the Check panel\'s own fly-to');
  assert.match(left, /INFRAME_CHECKS/);
  assert.match(left, /data-inframe-check=\{f\.check\}/);
  const page = read('src/pages/ConfiguratorPage.jsx');
  assert.match(page, /<FrontGapWarnings \/>\s*<InframeWarnings \/>/, 'mounted in the bottom-left column, under <Messages>');
});

test('F10 · in-frame OFF: not one of the five on any of the scenes above', () => {
  for (const rows of [[['BUD', 0, 600], ['BUD', 600.5, 600]], [['BUD', 0, 600], ['OVEN_BASE', 600, 600]], [0, 600, 1200, 1800, 2400].map((x) => ['BUD', x, 600])]) {
    const { units, entries } = scene(rows);
    assert.deepEqual(inframeFindings({ entries, units, design: {}, profile: P }), []);
  }
});
