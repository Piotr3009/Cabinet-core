import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  parenBalance, balanceOfKits, routineCensus, routineFaults, gateFaults,
  lispConstant, lispDiffAgainst,
  T57_ROUTINE, T57_KIT, T57_GATED, T57_PROFILE, T57_LISP_FILES,
} from '../scripts/t57-paren-balance.mjs';

// ─── TURN 57 · F1 — THE LAW, IN LISP ───────────────────────────────────────
//
// CLAUDE.md standing law 1: *"LISP IS LAW. New geometry is written in
// `reference/lisp/` FIRST; the engine follows. Paren census grows to 14/14 at
// 0/0 (13 kits today + `KIT_FRONT_JPULL.lsp`)."*
//
// The census is a SCRIPT and this is the suite's copy of the question, so a
// broken kit fails `npm test` and not only a terminal somebody remembered to
// run. Every number the engine uses is read OFF THE KIT here, which is what
// "the engine follows" means in practice: change 4.212 in the LISP and this
// test — and F2's — move with it, because neither of them holds a second copy.

const KIT = readFileSync(new URL('../reference/lisp/KIT_FRONT_JPULL.lsp', import.meta.url), 'utf8');
// The prose is a COMMENT BLOCK and it wraps, so a quotation two lines long is
// in the file without being on any one line of it. `PROSE` is the same text
// with the `;;;` and the wrapping taken out — which is how a person reads it.
const PROSE = KIT.replace(/^\s*;+/gm, ' ').replace(/\s+/g, ' ');

test('F1 — fourteen kits, every one 0/0, and the count is DERIVED', () => {
  const rows = balanceOfKits();
  assert.equal(rows.length, 14, 'thirteen kits and the new one');
  assert.ok(rows.some((r) => r.name === T57_KIT), 'and the new one is the J-pull');
  for (const r of rows) {
    assert.equal(r.balance, 0, `${r.name} is ${r.balance} out`);
    assert.equal(r.negativeAt, null, `${r.name} closes something it never opened, line ${r.negativeAt}`);
  }
});

test('F1 — the reader is not fooled by prose or by strings', () => {
  // The kits are mostly comment, and the comments are full of brackets.
  assert.deepEqual(parenBalance(';; ((((( a comment full of them\n(a)').balance, 0);
  assert.equal(parenBalance('(strcat "J-PULL (" x ")")').balance, 0);
  assert.equal(parenBalance('(a))').negativeAt, 1, 'a stray ) is found, and its line named');
});

test('F1 — ONE edge law, one owner, and no second answer anywhere', () => {
  const census = routineCensus();
  assert.deepEqual(census.defined, [T57_KIT], `${T57_ROUTINE} is defined once, in the kit that owns it`);
  assert.deepEqual(census.callers, [T57_KIT], 'and mentioned in no other kit');
  assert.deepEqual(routineFaults(census), [], 'no faults');
  assert.deepEqual(gateFaults(), [], 'every gated routine is stated');
});

test('F1 — every routine the law needs is actually defined', () => {
  for (const r of T57_GATED) {
    assert.ok(KIT.includes(`(defun ${r} `), `${r} is missing from ${T57_KIT}`);
  }
});

// ─── THE PROFILE IS THE OWNER'S DRAWING, NOT A GUESS ───────────────────────
//
// Measured off `J_hand.dxf`. These are the numbers, and they are asserted
// against the FILE rather than against each other, so the test fails if the
// law is edited and does not fail if only the test is.

test('F1 — the owner\'s measured section, verbatim', () => {
  assert.equal(lispConstant('jpullBoardT'), 18, '18 mm board');
  assert.equal(lispConstant('jpullLipT'), 4.212, 'the visible hook of the J');
  assert.equal(lispConstant('jpullLipT') && lispConstant('jpullReliefMm'), 30, 'standing 30 proud of the relieved back');
  assert.equal(lispConstant('jpullSlotW'), 10, 'the finger slot');
  assert.equal(lispConstant('jpullSlotDepth'), 40, '40 deep from the edge');
  assert.equal(lispConstant('jpullSlotR'), 5, 'its bottom rounded r5');
  assert.equal(lispConstant('jpullRearLeg'), 3.788, 'the rear leg');
});

test('F1 — THE DRAWING CLOSES: 4.212 + 10 + 3.788 = 18.000', () => {
  const lip = lispConstant('jpullLipT');
  const slot = lispConstant('jpullSlotW');
  const leg = lispConstant('jpullRearLeg');
  assert.ok(Math.abs((lip + slot + leg) - lispConstant('jpullBoardT')) < 1e-6,
    `${lip} + ${slot} + ${leg} does not make an 18 mm board`);
  // …and 45 to the arc's tangent is a CONSEQUENCE, never a fourteenth number.
  assert.equal(lispConstant('jpullSlotDepth') + lispConstant('jpullSlotR'), 45);
  assert.ok(/jpullReachDepth/.test(KIT), 'and it is stated as a routine, not retyped');
});

test('F1 — the stopped run carries the owner\'s two numbers and a named ramp', () => {
  assert.equal(lispConstant('jpullRunMm'), 500, '"500 mm"');
  assert.equal(lispConstant('jpullFromBottomMm'), 700, '"zaczyna sie od dolu frontu okolo 700 mm"');
  assert.ok(Number.isFinite(lispConstant('jpullRampR')), 'the ramp radius is a number, not a shrug');
  assert.ok(/PLACEHOLDER/.test(KIT), 'and the file admits it is a placeholder to be tuned');
});

test('F1 — every profile number is stated in the form the engine parses', () => {
  for (const c of T57_PROFILE) {
    assert.ok(lispConstant(c) !== null, `${c} is not a one-line ( / ) constant`);
  }
});

// ─── THE OWNER'S TABLE, AND WHAT THE FILE SAYS OUT LOUD ────────────────────

test('F1 — the doctrine is stated: a J-pull is a HANDLE system', () => {
  assert.ok(/a J-PULL IS A HANDLE SYSTEM/.test(PROSE));
  assert.ok(/engine\/handles\.js/.test(PROSE), 'and it names the module that owns it');
  // …and it says why the other axis was wrong, rather than quietly not using it.
  assert.ok(/pattern registry/i.test(PROSE), 'the reservation on the pattern axis is accounted for');
});

test('F1 — the owner\'s words are carried, ASCII-folded like every kit', () => {
  assert.ok(/na szafkach wiszacych nie rob J/.test(PROSE), 'wall doors');
  assert.ok(/to juz robi program/.test(PROSE));
  assert.ok(/wjazd po luku, nie ostre, lukowate/.test(PROSE));
  assert.ok(/routerowanie bedziemy robic pozniej/.test(PROSE));
  assert.ok(/500 mm, zaczyna sie od dolu frontu okolo 700 mm/.test(PROSE));
  // No Polish diacritic reaches reference/lisp/ — the folder's own rule.
  assert.ok(!/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(KIT), 'the quotes are folded, as the folder requires');
});

test('F1 — the diagonal is forbidden in words AND unsayable in the resolver', () => {
  assert.ok(/NEVER on a diagonal edge/.test(KIT));
  // `SKY:jpullEdge` can answer TOP, L, R or nil — there is no branch that
  // could return a raked edge, which is the rule made structural.
  const body = KIT.slice(KIT.indexOf('(defun SKY:jpullEdge'));
  const fn = body.slice(0, body.indexOf('\n)\n') + 3);
  const answers = [...fn.matchAll(/"([A-Z]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(answers)].sort(), ['L', 'R', 'TOP'],
    'the only edges the law can name');
});

test('F1 — the note is ASCII and rides the layer notes already ride', () => {
  assert.ok(/"J-PULL "/.test(KIT), 'the note text');
  assert.ok(/drawText "UNIT_NUMBER"/.test(KIT), 'on the layer every other note uses');
  assert.ok(!/°/.test(KIT), 'no degree sign, for the same R12 reason the slope note has none');
});

test('F1 — the layer is named for the OPERATION and takes a free colour', () => {
  assert.ok(/"JPULL_EDGE"/.test(KIT));
  assert.ok(/"_C" "45"/.test(KIT), 'ACI 45 — 40 to 44 are taken');
  // The size-bearing name is argued against in the PROSE and must not appear
  // in any layer call: the code is what the machine reads.
  const code = KIT.replace(/^\s*;.*$/gm, '');
  assert.ok(!/JPULL_\d+MM/.test(code), 'not named for a size the owner will tune');
  assert.ok(/obvious name/.test(PROSE), 'and the file argues the case rather than just avoiding it');
});

// ─── AND NO OTHER KIT MOVED ────────────────────────────────────────────────

test('F1 — exactly one file in reference/lisp/ is new, and nothing else moved', () => {
  assert.deepEqual(T57_LISP_FILES, [T57_KIT], 'the whitelist is the one new kit');
  // Asked of git across TURN 57'S OWN WINDOW — its base to its tip.
  //
  // ─── AMENDED IN TURN 58, and the reason is the point ───────────────────
  // This read `lispDiffAgainst('6d89238')`, which compares turn 57's base to
  // WHATEVER IS ON DISK. That made turn 57's claim a claim about tonight, so
  // the first later turn to amend any kit at all broke it — turn 58 writes the
  // hinge-hand and shoe-shelf law into KIT_WARDROBE_FULL.lsp, which is its own
  // licensed change and no business of turn 57's.
  //
  // A finished turn's claim is a fact about TWO COMMITS: between 6d89238 and
  // cd399cf, exactly one kit was born and no other moved. That is what turn 57
  // said, it is still true, and stated this way it stays true — while any turn
  // that quietly edited a second kit INSIDE that window still fails here.
  let changed;
  try {
    changed = lispDiffAgainst('6d89238', 'cd399cf');
  } catch {
    return; // a shallow checkout without the window's commits: nothing to assert
  }
  const offenders = changed.filter((c) => !T57_LISP_FILES.some((f) => c.file.endsWith(f)));
  assert.deepEqual(offenders, [], `other kits moved: ${JSON.stringify(offenders)}`);
});

test('F1 — the file ends the way both new-style kits end', () => {
  assert.ok(/\(princ "\\nKIT_FRONT_JPULL\.lsp loaded — /.test(KIT), 'the loaded line, with its enumeration');
  assert.ok(KIT.trimEnd().endsWith('(princ)'), 'and a bare princ');
});
