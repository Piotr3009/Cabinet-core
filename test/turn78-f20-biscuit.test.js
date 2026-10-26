// ─── T78 F20 (the BISCUIT part) · THE THIRD JOINT SYSTEM, THE OWNER'S OWN SET ─
//
// The owner, 11.10.2026: *"zostaw jak bylo, ciastka byly ustawione ok, nie
// grzeb w tym, polka stala to samo"* and *"bez ciastek na plecach."*
// CLAUDE.md T78 F20: *"LISP FIRST `reference/lisp/SKYLON_JOINTS_BISCUIT.lsp`
// applies THE SAME SET (screw 3, gap 10, mark 70, gap 10, screw 3; edge 50;
// two sets, three above 700) to the carcass joints side to top, side to
// bottom and fixed shelf to side, NEVER to the back; the engine mirrors it
// when `joints.system === 'biscuit'`; the fixed-shelf joint of T24/T26 is
// untouched (it is the same set already). Golden `golden-biscuit-bud.json`."*
//
// `reference/lisp/SKYLON_JOINTS_BISCUIT.lsp` is the law (written and
// paren-balanced first; test/turn35-lisp-parens.test.js walks it);
// `src/engine/biscuitJoints.js` mirrors it routine for routine under the `bj`
// prefix and calls `engine/biscuits.js` for the set, so there is ONE copy of
// the arithmetic. These assertions are the LISP's own NUMBERS block (section
// H, a BUD 600 with one FIX shelf) read off the module board by board, the
// frozen numbers of `profile.biscuits` (FROZEN 5), the pure engine half on a
// real puzzle parent, and, once `computeCabinet` carries the F20 hooks
// (scratchpad patch f20-cabinet-biscuit.patch), the integrated cut and its
// golden. The integrated group SKIPS, saying so, while the hooks are not in.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import * as Bj from '../src/engine/biscuitJoints.js';
import {
  BISCUIT_LAYER, biscuitSetCount, biscuitSetLength, biscuitSets,
} from '../src/engine/biscuits.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { mirrorOutline } from '../src/engine/topFrame.js';
import { goldenOf } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const LSP = read('reference/lisp/SKYLON_JOINTS_BISCUIT.lsp');

const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01' };
const BISCUIT_BUD = { ...BUD, joints_system: 'biscuit' };
const FIX = { sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 385 }] }] };
const puzzle = computeCabinet(BUD, P);
const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const kinds = (r) => r.drills.reduce((m, d) => ({ ...m, [`${d.kind}@${d.panel}`]: (m[`${d.kind}@${d.panel}`] || 0) + 1 }), {});
const xy = (list) => list.map((c) => [c[2], c[3]]);
const runs = (list) => list.map((m) => [m[2], m[4], m[3]]);

// The LISP's NUMBERS block, section H, as data.
const H = {
  BUL: {
    screws: [[51.5, 761], [144.5, 761], [395.5, 761], [488.5, 761], [51.5, 9], [144.5, 9], [395.5, 9], [488.5, 9],
      [71.5, 394], [164.5, 394], [395.5, 394], [488.5, 394]],
    marks: [[63, 133, 761], [407, 477, 761], [63, 133, 9], [407, 477, 9], [83, 153, 394], [407, 477, 394]],
  },
  BUR: {
    screws: [[488.5, 761], [395.5, 761], [144.5, 761], [51.5, 761], [488.5, 9], [395.5, 9], [144.5, 9], [51.5, 9],
      [468.5, 394], [375.5, 394], [144.5, 394], [51.5, 394]],
    marks: [[477, 407, 761], [133, 63, 761], [477, 407, 9], [133, 63, 9], [457, 387, 394], [133, 63, 394]],
  },
};

// ═══ FROZEN 5 · THE NUMBERS DO NOT MOVE ═══════════════════════════════════

test('F20 · FROZEN 5: profile.biscuits is the owner\'s set, untouched, and the LISP reads it key for key', () => {
  assert.deepEqual(P.biscuits, {
    markLength: 70,
    markTool: 4,
    gap: 10,
    screwDiameter: 3,
    edgeMin: 50,
    wideThreshold: 700,
    markFromEnd: 20,
    layer: 'BISCUIT_4MM',
    screwLayer: 'SCREWS_3MM',
    concealedReceivers: ['TOP', 'BOTTOM'],
  });
  assert.deepEqual(Bj.bjProfile(P), P.biscuits);
  assert.deepEqual(Bj.bjProfile({}), P.biscuits, 'a bare call answers what the LISP prints');
  // Section A of the LISP prints the same numbers, marked the owner's (decided), none proposed.
  const a = LSP.split(';;; A. THE PROFILE NUMBERS')[1].split(';;; B. THE SET RULE')[0];
  for (const [key, v] of [['markLength', '70.0'], ['markTool', '4.0'], ['gap', '10.0'], ['screwDiameter', '3.0'],
    ['edgeMin', '50.0'], ['wideThreshold', '700.0'], ['markFromEnd', '20.0']]) {
    assert.match(a, new RegExp(`\\(cons "${key}" ${v.replace('.', '\\.')}\\)[^\\n]*owner, decided`), `${key} ${v} is not the owner's in the LISP`);
  }
  assert.match(a, /\(cons "layer" "BISCUIT_4MM"\)/);
  assert.match(a, /\(cons "screwLayer" "SCREWS_3MM"\)/);
  assert.match(a, /\(cons "concealedReceivers" \(list "TOP" "BOTTOM"\)\)/);
  assert.doesNotMatch(a, /T7\d proposed|owner to confirm/, 'nothing in section A carries the house\'s proposal marker');
  assert.equal(BISCUIT_LAYER, 'BISCUIT_4MM');
});

// ═══ THE LISP, ROUTINE FOR ROUTINE ════════════════════════════════════════

test('F20 · section B: the set is biscuits.js\'s own, ONE copy, the LISP\'s numbers', () => {
  const prof = Bj.bjProfile(P);
  assert.equal(Bj.bjSetLength(prof), 96);
  assert.equal(Bj.bjSetLength(prof), biscuitSetLength(P));
  // The counts the frozen golden names (fixtures/golden-partition-biscuits.json set_positions).
  for (const [L, n] of [[400, 2], [700, 2], [701, 3], [900, 3], [195, 0], [196, 1], [0, 0]]) {
    assert.equal(Bj.bjSetCount(L, prof), n, `${L} mm`);
    assert.equal(Bj.bjSetCount(L, prof), biscuitSetCount(L, P), `${L} mm: the same answer as biscuits.js`);
  }
  // The positions on 540 (the TOP's and BOTTOM's joint line on a 558 BUD).
  const sets = Bj.bjSets(540, true, prof);
  assert.deepEqual(sets, biscuitSets({ length: 540, screws: true, profile: P }), 'the same records as biscuits.js');
  assert.deepEqual(sets.map((s) => s.start), [50, 394]);
  assert.deepEqual(sets.map((s) => s.screws), [[51.5, 144.5], [395.5, 488.5]]);
  assert.deepEqual(sets.map((s) => s.mark), [{ from: 63, to: 133 }, { from: 407, to: 477 }]);
  // The shelf's 520: starts 50 and 374.
  assert.deepEqual(Bj.bjSets(520, true, prof).map((s) => s.start), [50, 374]);
  // The no-screw set: same positions, no screws.
  const bare = Bj.bjSets(540, false, prof);
  assert.deepEqual(bare.map((s) => s.mark), sets.map((s) => s.mark));
  assert.deepEqual(bare.map((s) => s.screws), [[], []]);
  // The LISP states the same rule in its own words.
  for (const name of ['biscuit-set-length', 'biscuit-set-count', 'biscuit-sets']) {
    assert.ok(LSP.includes(`(defun ${name} `), `the LISP has no ${name}`);
  }
});

test('F20 · section C: side to TOP, side to BOTTOM, FIX shelf to side; NEVER the back', () => {
  const t = Bj.bjJointTable(600, 558, 770, 18, [[385, 18, 20]]);
  assert.deepEqual(t.map((j) => j.name), ['BUL-TOP', 'BUR-TOP', 'BUL-BOTTOM', 'BUR-BOTTOM', 'BUL-SHELF-1', 'BUR-SHELF-1']);
  assert.deepEqual(t.map((j) => j.len), [540, 540, 540, 540, 520, 520]);
  assert.deepEqual(t.map((j) => [j.face, j.edge, j.edgeName]), [
    ['BUL', 'TOP', 'Y0'], ['BUR', 'TOP', 'YH'], ['BUL', 'BOTTOM', 'Y0'], ['BUR', 'BOTTOM', 'YH'],
    ['BUL', 'SHELF-1', 'Y0'], ['BUR', 'SHELF-1', 'YH'],
  ]);
  assert.deepEqual(t.map((j) => j.jointY), [761, 761, 9, 9, 394, 394]);
  assert.deepEqual(t.map((j) => [j.faceFrom, j.faceDir]), [[0, 1], [540, -1], [0, 1], [540, -1], [20, 1], [520, -1]]);
  assert.equal(t.some((j) => j.face === 'BACK' || j.edge === 'BACK'), false, 'a BACK row');
  // Who takes a through screw: the sides (the law), the concealed receivers of T13; never a shelf or a partition.
  const prof = Bj.bjProfile(P);
  assert.equal(Bj.bjTakesScrews('BUL', prof), true);
  assert.equal(Bj.bjTakesScrews('BUR', prof), true);
  assert.equal(Bj.bjTakesScrews('TOP', prof), true, 'T13: a partition\'s end on the TOP\'s face, under the worktop');
  assert.equal(Bj.bjTakesScrews('BOTTOM', prof), true);
  assert.equal(Bj.bjTakesScrews('SHELF-1', prof), false);
  assert.equal(Bj.bjTakesScrews('VPART-1', prof), false);
  // The owner's sentence, in the module and in the LISP, word for word.
  assert.equal(Bj.bjBackRefusal(), Bj.BISCUIT_BACK);
  assert.ok(LSP.includes(`"${Bj.BISCUIT_BACK}"`), 'the back sentence is the LISP\'s');
  assert.match(Bj.BISCUIT_BACK, /bez ciastek na plecach/);
  assert.deepEqual([...Bj.BISCUIT_LEAVES], [], 'since 15.10.2026 nothing is left as the kit cuts it: the back joint goes, the BACK is screwed');
  assert.deepEqual([...Bj.BISCUIT_BOARDS], ['BUL', 'BUR', 'TOP', 'BOTTOM']);
});

test('F20 · sections D and H: the BUD 600 with one FIX shelf, board by board, the LISP\'s NUMBERS block', () => {
  const plan = Bj.biscuitCarcassPlan({
    W: 600, H: 770, D: 558, G: 18, fixedShelfYs: [385],
  }, P);
  assert.deepEqual(xy(plan.boards.BUL.screws), H.BUL.screws);
  assert.deepEqual(runs(plan.boards.BUL.marks), H.BUL.marks);
  assert.deepEqual(xy(plan.boards.BUR.screws), H.BUR.screws);
  assert.deepEqual(runs(plan.boards.BUR.marks), H.BUR.marks);
  for (const id of ['TOP', 'BOTTOM', 'SHELF-1']) {
    assert.deepEqual(plan.boards[id].screws, [], `${id} carries a screw`);
    assert.deepEqual(plan.boards[id].marks, [], `${id} carries a mark`);
    assert.equal(plan.boards[id].said, Bj.BISCUIT_EDGE_NOTHING);
  }
  assert.deepEqual(plan.boards.BACK, { marks: [], screws: [], said: Bj.BISCUIT_BACK });
  assert.deepEqual(plan.counts, { sets: 12, marks: 12, screws: 24 });
  assert.equal(plan.gate, null);
  assert.equal(plan.markFromEnd, 20, 'read and reported, used by no joint here');
  // The record shapes the LISP prints: MARK (board MARK x1 y x2 y layer), SCREW (board SCREW x y dia layer).
  assert.deepEqual(plan.boards.BUL.marks[0], ['BUL', 'MARK', 63, 761, 133, 761, 'BISCUIT_4MM']);
  assert.deepEqual(plan.boards.BUL.screws[0], ['BUL', 'SCREW', 51.5, 761, 3, 'SCREWS_3MM']);
  // The shelf's setback is the profile's shelf front clearance (20) when nothing else is said.
  assert.equal(P.carcass.shelfDepthClearance, 20);
  // Without the shelf: 16 screws and 8 marks.
  const bare = Bj.biscuitCarcassPlan({
    W: 600, H: 770, D: 558, G: 18,
  }, P);
  assert.deepEqual(bare.counts, { sets: 8, marks: 8, screws: 16 });
  // The LISP prints those rows.
  for (const row of ['51.5 144.5 395.5 488.5', '71.5 164.5 395.5 488.5', '488.5 395.5 144.5 51.5', '468.5 375.5 144.5 51.5',
    '63..133  407..477', '83..153  407..477', '477..407 133..63', '457..387 133..63']) {
    assert.ok(LSP.includes(row), `the LISP does not print ${row}`);
  }
});

test('F20 · "polka stala to samo": the plan\'s shelf rows ARE what T24 cuts today, to the decimal', () => {
  // The engine's fixed shelf joint, untouched by this F, on a PUZZLE unit.
  const r = computeCabinet({ ...BUD, ...FIX }, P);
  const plan = Bj.biscuitCarcassPlan({
    W: 600, H: 770, D: 558, G: 18, fixedShelfYs: [385],
  }, P);
  for (const side of ['BUL', 'BUR']) {
    const row = plan.joints.find((j) => j.joint.name === `${side}-SHELF-1`);
    const engineMarks = panelOf(r, side).cnc.marks.map((m) => ({ layer: m.layer, from: m.from, to: m.to }));
    const planMarks = row.marks.map((m) => ({ layer: m[6], from: [m[2], m[3]], to: [m[4], m[5]] }));
    assert.deepEqual(engineMarks, planMarks, `${side}: the shelf's marks`);
    const engineScrews = r.drills.filter((d) => d.panel === side && d.kind === 'shelf_screw').map((d) => [d.x, d.y, d.d]);
    assert.deepEqual(engineScrews, row.screws.map((s) => [s[2], s[3], s[4]]), `${side}: the shelf's screws`);
  }
  // ...and the shelf itself and the BACK carry no biscuit, as today.
  assert.equal(panelOf(r, 'SHELF-1').cnc.marks, undefined);
  assert.equal(panelOf(r, 'BACK').cnc.marks, undefined);
  assert.equal(r.drills.filter((d) => d.kind === 'shelf_back_screw').length, 3, 'the BACK\'s dia 3 row is not a biscuit and stays');
});

test('F20 · section E: no gate (the numbers are the owner\'s), and the refusals in words', () => {
  const prof = Bj.bjProfile(P);
  assert.equal(Bj.bjGate(prof), null);
  assert.equal(Bj.bjNoGateReason(), Bj.BISCUIT_NO_GATE);
  assert.ok(LSP.includes(`"${Bj.BISCUIT_NO_GATE}"`), 'the no-gate sentence is the LISP\'s');
  assert.ok(LSP.includes('(defun biscuit-gate (prof)\n  nil)'), 'the LISP\'s gate returns nil');
  const [top] = Bj.bjJointTable(600, 558, 770, 18);
  assert.deepEqual(Bj.bjRefusal(prof, top), []);
  // Too short: a 200 deep carcass has a 182 joint line, under 50 + 96 + 50.
  const [short] = Bj.bjJointTable(600, 200, 770, 18);
  assert.deepEqual(Bj.bjRefusal(prof, short), [
    'the joint BUL-TOP is 182.00 long and cannot hold one biscuit set: the shortest is 196.00 (50.00 + 96.00 + 50.00)',
  ]);
  // The BACK, by the owner's word.
  assert.deepEqual(Bj.bjRefusal(prof, Bj.bjJoint('BACK-BUL', 770, 'BACK', 0, 1, 9, 'BUL', 'XW', 18, 0)), [Bj.BISCUIT_BACK]);
  // A screw into an edge it does not fit.
  assert.deepEqual(Bj.bjRefusal(prof, Bj.bjJoint('BUL-TOP', 540, 'BUL', 0, 1, 761, 'TOP', 'Y0', 3, 0)), [
    'a screw 3.00 wide does not fit a 3.00 edge',
  ]);
  // The pure plan carries a refused joint's sentences and no cuts.
  const plan = Bj.biscuitCarcassPlan({
    W: 600, H: 770, D: 200, G: 18,
  }, P);
  assert.equal(plan.joints.length, 4);
  for (const j of plan.joints) {
    assert.match(j.refused[0], /cannot hold one biscuit set/);
    assert.deepEqual([j.sets, j.marks, j.screws], [[], [], []]);
  }
});

test('F20 · the LISP was written first: every routine the module mirrors is in it, with the owner\'s words', () => {
  assert.ok(existsSync(`${ROOT}reference/lisp/SKYLON_JOINTS_BISCUIT.lsp`));
  for (const name of ['biscuit-profile', 'biscuit-get', 'biscuit-set-length', 'biscuit-set-count', 'biscuit-sets',
    'biscuit-takes-screws', 'biscuit-back-refusal', 'biscuit-joint', 'biscuit-jget', 'biscuit-joint-table',
    'biscuit-face-marks', 'biscuit-face-screws', 'biscuit-joint-cuts', 'biscuit-gate', 'biscuit-no-gate-reason',
    'biscuit-refusal', 'biscuit-print-cut', 'c:BISCUIT_JOINTS']) {
    assert.ok(LSP.includes(`(defun ${name} `), `the LISP has no ${name}`);
  }
  for (const words of ['zostaw jak bylo', 'polka stala to samo', 'bez ciastek na plecach', 'lisp najpierw']) {
    assert.ok(LSP.includes(words), `the LISP does not carry "${words}"`);
  }
  assert.ok(LSP.includes(';;; H. NUMBERS'), 'the NUMBERS block');
  // No em dash and no en dash in anything this F wrote.
  for (const rel of ['reference/lisp/SKYLON_JOINTS_BISCUIT.lsp', 'src/engine/biscuitJoints.js', 'test/turn78-f20-biscuit.test.js',
    'scripts/t78-classify.d/f20-biscuit.mjs']) {
    assert.doesNotMatch(read(rel), new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`), `${rel} carries a dash`);
  }
});

// ═══ SECTION Z, PURE: ASKED OF THE PARENT, STRIPPED, RECORDED ═════════════

test('F20 · section Z: the verdict on a puzzle BUD parent, the strip and the records, with no engine hook needed', () => {
  const v = Bj.biscuitVerdict({
    parent: puzzle, params: BUD, asked: 'biscuit', type: UNIT_TYPES.BUD, profile: P,
  });
  assert.equal(v.refused, false, v.message);
  const { plan } = v;
  assert.equal(plan.system, 'biscuit');
  assert.deepEqual(plan.boards, ['BUL', 'BUR', 'TOP', 'BOTTOM']);
  assert.deepEqual(plan.leaves, [], 'the back joint goes too (15.10.2026, engine/screwedBack.js)');
  assert.deepEqual(plan.joints.map((j) => j.joint.name), ['BUL-TOP', 'BUR-TOP', 'BUL-BOTTOM', 'BUR-BOTTOM']);
  assert.deepEqual(plan.layers, { mark: 'BISCUIT_4MM', screw: 'SCREWS_3MM' });

  // The strip, on a copy of the parent's boards.
  const panels = JSON.parse(JSON.stringify(puzzle.panels));
  Bj.biscuitStrip({ panels, plan, profile: P });
  const was = (id) => panelOf(puzzle, id).cnc;
  const now = (id) => panels.find((p) => p.id === id).cnc;
  for (const side of ['BUL', 'BUR']) {
    assert.deepEqual(now(side).outline, was(side).outline, `${side}: the back tenons stay (34 points)`);
    assert.equal(now(side).outline.length, 34);
    assert.deepEqual(now(side).pockets.map((k) => k.layer), ['PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES', 'PUZZLE_DOG_BONES'],
      `${side}: the back dog bones stay, the top and bottom sockets go`);
    assert.deepEqual(now(side).holes, [], `${side}: the dia 7.5 holes and the dia 3 rows go`);
    assert.equal(was(side).holes.length, 14, 'the parent had 8 + 6');
  }
  for (const board of ['TOP', 'BOTTOM']) {
    assert.equal(was(board).outline.length, 64);
    assert.equal(now(board).outline.length, 24);
    // The four corners and the back tenons' own 20 points, untouched and in the parent's order. 17.10.2026
    // (14:15): the parent's TOP record is in its underside frame (one mirror at the end of computeCabinet,
    // engine/topFrame.js) while the strip, run here on its own, draws in the producers' ROT90 frame as it does
    // inside computeCabinet before that mirror; so the TOP's parent points are read back through the same mirror.
    const parentFrame = board === 'TOP' ? mirrorOutline(was(board).outline, 564) : was(board).outline;
    assert.deepEqual(now(board).outline, [[0, 0], [540, 0], [540, 564], [0, 564], ...parentFrame.slice(44)]);
    assert.deepEqual(now(board).outline, Bj.bjPlainEnds({
      drawnW: 540, drawnH: 564, G: 18, pz: P.puzzle, backTabs: true,
    }));
    assert.deepEqual(now(board).pockets.map((k) => [k.x1, k.x2]), [[-18, 0], [-18, 0]], `${board}: only the back-edge dog bones`);
    assert.equal(was(board).pockets.length, 6);
  }
  assert.deepEqual(now('BACK'), was('BACK'), 'the biscuit strip alone does not touch the BACK; the screwed back does, next, in computeCabinet');

  // The records: the fixed shelf's mark shape, T13's screw kind.
  const marks = Bj.biscuitMarkRecords(plan);
  assert.equal(marks.length, 8);
  assert.deepEqual(marks[0], {
    panelId: 'BUL', layer: 'BISCUIT_4MM', from: [63, 761], to: [133, 761], meta: { joint: 'BUL-TOP' },
  });
  assert.deepEqual(marks.filter((m) => m.panelId === 'BUR').map((m) => [m.from[0], m.to[0], m.from[1]]),
    [[477, 407, 761], [133, 63, 761], [477, 407, 9], [133, 63, 9]], 'BUR reads from the back forward, as the shelf does');
  const drills = Bj.biscuitDrills(plan);
  assert.equal(drills.length, 16);
  assert.deepEqual(drills[0], {
    panel: 'BUL', kind: 'biscuit_screw', layer: 'SCREWS_3MM', x: 51.5, y: 761, d: 3, meta: { joint: 'BUL-TOP' },
  });
  assert.equal(drills.some((d) => 'depth' in d), false, 'a through screw has no depth');
  assert.deepEqual(drills.filter((d) => d.panel === 'BUL').map((d) => [d.x, d.y]), H.BUL.screws.slice(0, 8));
  assert.deepEqual(drills.filter((d) => d.panel === 'BUR').map((d) => [d.x, d.y]), H.BUR.screws.slice(0, 8));
  // The summary: no gate, the back said, every joint named.
  const s = Bj.biscuitSummary(plan);
  assert.equal(s.system, 'biscuit');
  assert.deepEqual([s.sets, s.marks, s.screws], [8, 8, 16]);
  assert.equal(s.gate, null);
  assert.equal(s.confirmed, true);
  assert.equal(s.back, Bj.BISCUIT_BACK);
  assert.deepEqual(s.joints.map((j) => j.cutBy), ['T78 F20', 'T78 F20', 'T78 F20', 'T78 F20']);
});

test('F20 · section Z: with a FIX shelf the plan names the shelf rows as T24\'s and emits nothing for them', () => {
  const parent = computeCabinet({ ...BUD, ...FIX }, P);
  const v = Bj.biscuitVerdict({
    parent, params: { ...BUD, ...FIX }, asked: 'biscuit', type: UNIT_TYPES.BUD, profile: P,
  });
  assert.equal(v.refused, false, v.message);
  assert.deepEqual(v.plan.joints.map((j) => [j.joint.name, j.existing]), [
    ['BUL-TOP', false], ['BUR-TOP', false], ['BUL-BOTTOM', false], ['BUR-BOTTOM', false],
    ['BUL-SHELF-1', true], ['BUR-SHELF-1', true],
  ]);
  assert.deepEqual([...v.plan.shelves], ['SHELF-1']);
  assert.equal(Bj.biscuitMarkRecords(v.plan).length, 8, 'the shelf\'s marks are T24\'s to write');
  assert.equal(Bj.biscuitDrills(v.plan).length, 16, 'the shelf\'s screws are T24\'s to drill');
  const s = Bj.biscuitSummary(v.plan);
  assert.deepEqual([s.sets, s.marks, s.screws], [12, 12, 24], 'the summary shows the whole pattern');
  assert.equal(s.joints[4].cutBy, 'T24 (the fixed shelf, untouched)');
});

test('F20 · section Z: refused in words, never half a system', () => {
  const sink = computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01' }, P);
  const vs = Bj.biscuitVerdict({
    parent: sink, params: sink.params, asked: 'biscuit', type: UNIT_TYPES.SINK, profile: P,
  });
  assert.equal(vs.refused, true);
  assert.match(vs.message, /SINK: its joints are not in SKYLON_JOINTS_BISCUIT\.lsp's table/);
  assert.equal(Bj.biscuitKitRefusal(UNIT_TYPES.SINK), vs.message);
  assert.equal(Bj.biscuitApplies(UNIT_TYPES.BUD), true);
  assert.equal(Bj.biscuitApplies(UNIT_TYPES.WUD), true, 'the BACK is never asked, so the wall unit\'s hanger does not refuse');
  assert.equal(Bj.biscuitApplies(UNIT_TYPES.SINK), false);
  // A notched carcass keeps the puzzle.
  const vn = Bj.biscuitVerdict({
    parent: puzzle, params: { ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 } }, asked: 'biscuit', type: UNIT_TYPES.BUD, profile: P,
  });
  assert.match(vn.message, /corner notch keeps the puzzle/);
  // A carcass under a slope keeps the puzzle.
  const vsl = Bj.biscuitVerdict({
    parent: { ...puzzle, params: { ...puzzle.params, slope_cut: { a: 1 } } }, params: BUD, asked: 'biscuit', type: UNIT_TYPES.BUD, profile: P,
  });
  assert.match(vsl.message, /slope keeps the puzzle/);
  // Another system's name is not this verdict's to answer.
  assert.equal(Bj.biscuitVerdict({
    parent: puzzle, params: BUD, asked: 'dowel', type: UNIT_TYPES.BUD, profile: P,
  }).refused, true);
  // The refusal record: the parent, JOINTS_REFUSED (Check #31) and the sentence.
  const kept = Bj.withBiscuitRefusal(sink, vs, 'biscuit');
  assert.deepEqual(kept.panels, sink.panels);
  assert.deepEqual(kept.drills, sink.drills);
  assert.equal(kept.warnings.at(-1).code, 'JOINTS_REFUSED');
  assert.match(kept.warnings.at(-1).message, /^Biscuits refused: SINK/);
  assert.deepEqual(kept.derived.joints, { asked: 'biscuit', system: 'puzzle', refused: vs.message });
});

test('F20 · section Z: every kit gives a plan or a refusal in words; none throws', () => {
  const planned = [];
  const refused = [];
  for (const id of Object.keys(UNIT_TYPES)) {
    const parent = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    const v = Bj.biscuitVerdict({
      parent, params: parent.params, asked: 'biscuit', type: UNIT_TYPES[id], profile: P,
    });
    if (v.refused) {
      assert.ok(v.message.length > 20, `${id}: refused in silence`);
      refused.push(id);
    } else {
      assert.ok([2, 4].includes(v.plan.joints.filter((j) => !j.existing).length), `${id}: ${v.plan.joints.length} joints`);
      assert.equal(Bj.biscuitApplies(UNIT_TYPES[id]), true, `${id} planned biscuits the UI would not offer`);
      planned.push(id);
    }
  }
  for (const id of ['BUD', 'BUDR', 'BUDTALL', 'PANTRY', 'LOW_CABINET', 'WARDROBE', 'WUD', 'WUD_GLASS', 'BLIND_WALL']) {
    assert.ok(planned.includes(id), `${id} should take biscuits`);
  }
  for (const id of ['SINK', 'OVEN_BASE', 'FRIDGE', 'DW_PANEL', 'CORNER_L_BASE', 'FREE_PANEL']) {
    assert.ok(refused.includes(id), `${id} should keep the puzzle`);
  }
});

// ═══ THE INTEGRATED CUT (needs the F20 hooks in cabinet.js: f20-cabinet-biscuit.patch) ═══

const LIVE = (() => {
  try {
    return computeCabinet(BISCUIT_BUD, P).derived?.joints?.system === 'biscuit';
  } catch (e) {
    return false;
  }
})();
const NOT_YET = 'computeCabinet does not carry the F20 hooks yet (scratchpad patch f20-cabinet-biscuit.patch, and JOINT_SYSTEMS must name biscuit)';

test('F20 · a biscuit BUD: the set on the sides, plain boards everywhere, the BACK screwed (15.10.2026: no dog bones), the cut list the parent\'s', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const r = computeCabinet(BISCUIT_BUD, P);
  assert.deepEqual(r.warnings.filter((w) => w.code === 'JOINTS_REFUSED' || w.code === 'DOWEL_GATE'), []);
  assert.equal(r.derived.joints.gate, null);
  const c = kinds(r);
  assert.equal(c['biscuit_screw@BUL'], 8);
  assert.equal(c['biscuit_screw@BUR'], 8);
  assert.equal(c['puzzle@BUL'], undefined);
  assert.equal(c['screw@BUL'], undefined);
  assert.equal(c['puzzle@BACK'], undefined, 'bez ciastek na plecach, and since 15.10.2026 no puzzle either: the BACK is screwed');
  assert.equal(c['screw@BACK'], 14, 'the kit\'s own 14 dia 3 screws hold it');
  assert.deepEqual(panelOf(r, 'BUL').cnc.marks.map((m) => [m.from[0], m.to[0], m.from[1]]), H.BUL.marks.slice(0, 4));
  assert.deepEqual(panelOf(r, 'BUR').cnc.marks.map((m) => [m.from[0], m.to[0], m.from[1]]), H.BUR.marks.slice(0, 4));
  assert.deepEqual(r.drills.filter((d) => d.kind === 'biscuit_screw' && d.panel === 'BUL').map((d) => [d.x, d.y]), H.BUL.screws.slice(0, 8));
  assert.deepEqual(panelOf(r, 'BUL').cnc.outline, [[0, 0], [540, 0], [540, 770], [0, 770]], 'a plain side: no back tenon, no dog bone');
  assert.deepEqual(panelOf(r, 'BUL').cnc.pockets, []);
  assert.deepEqual(panelOf(r, 'TOP').cnc.outline, [[0, 0], [540, 0], [540, 564], [0, 564]], 'the four corners');
  assert.deepEqual(panelOf(r, 'BOTTOM').cnc.outline, [[0, 0], [540, 0], [540, 564], [0, 564]]);
  assert.deepEqual(panelOf(r, 'TOP').cnc.pockets, [], 'no dog bone');
  assert.equal(panelOf(r, 'TOP').cnc.marks, undefined, 'the edge board carries nothing');
  assert.deepEqual(panelOf(r, 'BACK').cnc.outline, [[0, 0], [600, 0], [600, 770], [0, 770]]);
  assert.deepEqual(panelOf(r, 'BACK').cnc.pockets, [], 'the sockets go');
  assert.deepEqual(r.drills.filter((d) => d.panel === 'BACK'), puzzle.drills.filter((d) => d.panel === 'BACK' && d.kind === 'screw'), 'the BACK keeps the screws and loses the dia 7.5');
  const layers = new Set([...r.panels.flatMap((p) => (p.cnc.pockets || []).map((k) => k.layer)), ...r.drills.map((d) => d.layer)]);
  assert.equal([...layers].some((l) => /PUZZLE/.test(l)), false, 'no puzzle layer on a biscuit unit');
  assert.equal(r.derived.joints.back, Bj.BISCUIT_BACK);
  assert.deepEqual(r.csvLines, puzzle.csvLines, 'the boards and the cut list are the parent\'s');
  const keep = (x) => x.drills.filter((d) => !['puzzle', 'screw', 'biscuit_screw'].includes(d.kind));
  assert.deepEqual(keep(r), keep(puzzle), 'what is not a joint stays exactly as it was');
  assert.equal(r.derived.joints.system, 'biscuit');
  assert.deepEqual([r.derived.joints.sets, r.derived.joints.marks, r.derived.joints.screws], [8, 8, 16]);
});

test('F20 · a biscuit BUD with a FIX shelf: T24 cuts the shelf, F20 the carcass, the BACK\'s dia 3 row stays', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const r = computeCabinet({ ...BISCUIT_BUD, ...FIX }, P);
  const c = kinds(r);
  assert.equal(c['shelf_screw@BUL'], 4);
  assert.equal(c['shelf_screw@BUR'], 4);
  assert.equal(c['biscuit_screw@BUL'], 8);
  assert.equal(c['shelf_back_screw@BACK'], 3);
  // Six marks per side: the shelf's two (T24, written first) and the carcass joints' four.
  assert.deepEqual(panelOf(r, 'BUL').cnc.marks.map((m) => [m.from[0], m.to[0], m.from[1]]),
    [[83, 153, 394], [407, 477, 394], [63, 133, 761], [407, 477, 761], [63, 133, 9], [407, 477, 9]]);
  assert.deepEqual(panelOf(r, 'BUR').cnc.marks.map((m) => [m.from[0], m.to[0], m.from[1]]),
    [[457, 387, 394], [133, 63, 394], [477, 407, 761], [133, 63, 761], [477, 407, 9], [133, 63, 9]]);
  assert.equal(r.derived.joints.joints.length, 6);
  assert.deepEqual([r.derived.joints.sets, r.derived.joints.marks, r.derived.joints.screws], [12, 12, 24]);
  // The shelf's own cut is byte for byte the puzzle unit's.
  const p0 = computeCabinet({ ...BUD, ...FIX }, P);
  assert.deepEqual(r.drills.filter((d) => d.kind === 'shelf_screw'), p0.drills.filter((d) => d.kind === 'shelf_screw'));
  assert.deepEqual(panelOf(r, 'SHELF-1'), panelOf(p0, 'SHELF-1'));
});

test('F20 · golden-biscuit-bud.json: the BUD cut with biscuits, held byte for byte', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const path = `${ROOT}fixtures/golden-biscuit-bud.json`;
  assert.ok(existsSync(path), 'fixtures/golden-biscuit-bud.json is missing');
  const g = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(g.meta.turn, 'T78');
  assert.equal(g.meta.F, 'F20');
  assert.equal(g.params.joints_system, 'biscuit');
  assert.deepEqual(goldenOf(g.params, P), g.expected);
  // What the golden shows of the strip (REPINNED 15.10.2026, the screwed back): plain boards, no puzzle anywhere.
  const bul = g.expected.panels.find((p) => p.id === 'BUL');
  const top = g.expected.panels.find((p) => p.id === 'TOP');
  assert.deepEqual([bul.outline, bul.holes, bul.pockets], [4, 0, 0]);
  assert.deepEqual([top.outline, top.holes, top.pockets], [4, 0, 0]);
  assert.deepEqual(g.expected.drills.filter(([k]) => k.startsWith('SCREWS_3MM|')), [['SCREWS_3MM|BACK', 14], ['SCREWS_3MM|BUL', 8], ['SCREWS_3MM|BUR', 8]]);
  assert.deepEqual(g.expected.drills.filter(([k]) => k.startsWith('PUZZLE')), [], 'no puzzle hole: the BACK lost its 20 dia 7.5');
});

test('F20 · a refused unit is the puzzle unit plus the sentence, and the dowel unit is still the dowel unit', (t) => {
  if (!LIVE) { t.skip(NOT_YET); return; }
  const sink = computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01' }, P);
  const sinkB = computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01', joints_system: 'biscuit' }, P);
  assert.deepEqual(sinkB.drills, sink.drills);
  assert.deepEqual(sinkB.panels, sink.panels);
  assert.match(sinkB.warnings.find((w) => w.code === 'JOINTS_REFUSED').message, /^Biscuits refused: SINK/);
  assert.equal(sinkB.derived.joints.system, 'puzzle');
  const dowel = computeCabinet({ ...BUD, joints_system: 'dowel' }, P);
  assert.equal(dowel.derived.joints.system, 'dowel');
  assert.equal(dowel.drills.some((d) => d.kind === 'biscuit_screw'), false);
});

test('F20 · the puzzle default is untouched: no default kit carries a mark or a biscuit screw', () => {
  for (const id of Object.keys(UNIT_TYPES)) {
    // AMENDED BY T83 F2 (25.10.2026) . the MIRROR CABINET is born with two
    // dividers and a FIX board (KIT_MIRROR.lsp D7, D12; the owner's mockup:
    // *"karkas: 2 przegrody 18 za slupkami LED, na nich zawiasy"*): their marks
    // are the house's divider and FIX-shelf sets (CHAT FIX 17.10.2026, T26 F7),
    // never the biscuit system's; it carries no biscuit screw and no record.
    if (UNIT_TYPES[id].mirrorCabinet) {
      const m = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
      assert.equal(m.drills.some((d) => d.kind === 'biscuit_screw'), false, `${id} grew a biscuit screw`);
      assert.equal(m.derived?.joints, undefined, `${id} grew a joints record`);
      continue;
    }
    const r = computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01' }, P);
    // CHAT FIX 17.10.2026: the L corner kits carry the owner's CORNER_4MM mark
    // on their L boards by default (KIT_CORNER_L.lsp section 4); not a biscuit.
    for (const p of r.panels) assert.deepEqual((p.cnc?.marks || []).filter((m) => m.layer !== 'CORNER_4MM'), [], `${id} ${p.id} grew a biscuit mark`);
    assert.equal(r.drills.some((d) => d.kind === 'biscuit_screw'), false, `${id} grew a biscuit screw`);
    assert.equal(r.derived?.joints, undefined, `${id} grew a joints record`);
  }
});
