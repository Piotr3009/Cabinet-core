// ─── F11: AN HONEST 155° FIXTURE, AND T30's LEFTOVERS (turn 31) ─────────────
//
// Three debts, and the first is the one that matters:
//
//   "71B7550_* synthetic fixtures currently carry the 3550's node names —
//    regenerate scripts/make-fixture-hardware.mjs output with the REAL 155°
//    node names measured on the live bucket … so the member-split tests test
//    what ships."
//
// The fault is worse than untidy. F1.3 splits a mounted hinge into its two
// members BY NODE NAME, and the profile has carried the real 155° names since
// turn 30 — but the showroom's 155° file carried `71B3550`'s. So every walk
// that "proved the 155° fold" was proving the 110° hinge's entries in that
// list; seven strings this app ships were exercised by nothing at all, and a
// typo in any of them would have passed every test in the repository.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { computeCabinet } from '../src/engine/cabinet.js';

const FIXTURES = new URL('../test/fixtures/hardware-local/hardware/hinges/blum/', import.meta.url).pathname;

/** The node names inside a GLB, read out of its own JSON chunk. */
function nodesOf(file) {
  const b = readFileSync(`${FIXTURES}${file}`);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.slice(20, 20 + len).toString('utf8')).nodes.map((n) => n.name);
}

const RIG = P.hardware.hinge.cliptop.rig;

// ═══════════════════════════════════════════════════════════════════════════
// 1. THE 155° FIXTURE CARRIES THE 155° NODE NAMES
// ═══════════════════════════════════════════════════════════════════════════

test('the 155° showroom file no longer wears the 110° hinge’s names', () => {
  const wide = nodesOf('71B7550_15001.glb');
  const narrow = nodesOf('71B3550_10001.glb');
  // Not one name in common: they are two different exports of two different
  // hinges, and until tonight they were the same five strings.
  for (const name of wide) {
    assert.ok(!narrow.includes(name), `the 155° file still carries ${name}`);
  }
  // …and the 110° file is untouched, which is what keeps turn 24's and turn
  // 29's own proofs meaningful.
  assert.ok(narrow.some((n) => n.startsWith('bau0015089612')));
  assert.ok(narrow.some((n) => n.startsWith('bau0015088251')));
});

test('EVERY 155° name the app ships is now exercised by a real file', () => {
  const wide = new Set(nodesOf('71B7550_15001.glb').map((n) => n.split('_')[0]));
  // The seven the profile's member lists name — the whole point of the debt.
  for (const name of [
    'bau0079302490', 'bau0079324562', 'bau0079298416', // member A
    'bau0079291413', 'bau0079262819', 'bau0025540121', 'bau0082114196', // member B
  ]) {
    assert.ok(wide.has(name), `${name} is shipped and still exercised by nothing`);
    assert.ok(
      RIG.memberA.includes(name) || RIG.memberB.includes(name),
      `${name} is in the fixture but on neither member list`,
    );
  }
});

test('…and the ONYX 155° carries its own cup node, not the nickel one’s', () => {
  // `71B7590`'s cup is `bau0081900639` in the profile's member-A list, beside
  // `71B7550`'s. Shipping one file's name on both would be this very fault one
  // level down.
  const onyx = nodesOf('71B7590_15003.glb');
  assert.ok(onyx.some((n) => n.startsWith('bau0081900639')), 'the onyx cup is the nickel one’s');
  assert.ok(!onyx.some((n) => n.startsWith('bau0079302490')));
  assert.ok(RIG.memberA.includes('bau0081900639'));
});

test('the split really CUTS the fixture in two, by name', () => {
  const wide = nodesOf('71B7550_15001.glb');
  const a = wide.filter((n) => RIG.memberA.some((k) => n.startsWith(k)));
  const b = wide.filter((n) => RIG.memberB.some((k) => n.startsWith(k)));
  assert.ok(a.length > 0, 'member A got nothing');
  assert.ok(b.length > 0, 'member B got nothing');
  // Every node lands on exactly one member: a node on neither list would fall
  // through to the z-threshold, which is the fallback and not the rule.
  assert.equal(a.length + b.length, wide.length, 'a node fell through to the z fallback');
  for (const n of wide) {
    const onA = RIG.memberA.some((k) => n.startsWith(k));
    const onB = RIG.memberB.some((k) => n.startsWith(k));
    assert.ok(!(onA && onB), `${n} is on both member lists`);
  }
});

test('the fixture is still synthetic — no Blum bytes, only Blum NAMES', () => {
  const gen = readFileSync(new URL('../scripts/make-fixture-hardware.mjs', import.meta.url), 'utf8');
  assert.match(gen, /synthetic, no Blum bytes/);
  // The geometry is turn 30's own body; what changed is what the nodes are
  // CALLED, which is the only thing the split reads.
  assert.match(gen, /const NODES = \{/);
  assert.match(gen, /bau0079302490/);
  assert.match(gen, /THE NAMES ARE THE OWNER'S/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. A PROOF WHOSE NAME LIED
// ═══════════════════════════════════════════════════════════════════════════

test('the turn-30 proof is named what its own banner says', () => {
  const dir = new URL('../verify/t30/', import.meta.url).pathname;
  const files = readdirSync(dir);
  // The picture's banner reads "2 mm between 01's 01-F and 02's 02-F — under
  // the 3 mm minimum". The name said 1 mm. The PICTURE was right, and a proof
  // whose filename disagrees with its own subject is a proof nobody can cite.
  assert.ok(files.includes('12b-the-same-run-2mm-tight-the-joint-painted-red-with-its-value.png'));
  assert.ok(!files.includes('12b-the-same-run-1mm-tight-the-joint-painted-red-with-its-value.png'));
  // …and the walk that WRITES it, and the index that lists it, agree.
  const walk = readFileSync(new URL('../scripts/e2e-turn30.mjs', import.meta.url), 'utf8');
  assert.match(walk, /12b-the-same-run-2mm-tight/);
  assert.ok(!/12b-the-same-run-1mm-tight/.test(walk));
  const readme = readFileSync(`${dir}README.md`, 'utf8');
  assert.match(readme, /12b-the-same-run-2mm-tight/);
  assert.ok(!/12b-the-same-run-1mm-tight/.test(readme));
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. THE PANTRY ARRIVES WITH ITS DRAWERS
// ═══════════════════════════════════════════════════════════════════════════

test('a PANTRY arrives with its boxes, not as a tall empty carcass', () => {
  // "PANTRY defaults include its drawers (today it computes 6 bare panels
  // until `drawers` is set)." Turn 30 built the wardrobe drawer machinery for
  // it, hole for hole, and left the count at zero — so a joiner who placed one
  // had to know to ask for the thing he had just chosen.
  assert.equal(P.pantryUnit.defaults.drawers, 3);
  const params = defaultParamsFor('PANTRY', P);
  assert.equal(params.drawers, 3);
  const bare = computeCabinet({ ...params, drawers: 0 });
  const fitted = computeCabinet(params);
  assert.ok(fitted.panels.length > bare.panels.length, 'the boxes are not there');
  assert.ok(fitted.drills.length > bare.drills.length, 'and neither is their drilling');
});

test('…and no other kit grew a drawer it never had', () => {
  // A kit whose defaults block carries `drawers` says so; every kit written
  // before this line carries none and is exactly what it was.
  assert.equal(defaultParamsFor('BUD', P).drawers, 0);
  assert.equal(defaultParamsFor('BUDTALL', P).drawers, 0);
  assert.equal(defaultParamsFor('WARDROBE', P).drawers, 0);
  // BUDR is still the LISP's own three — that rule is untouched.
  assert.equal(defaultParamsFor('BUDR', P).drawers, P.baseDrawerUnit.ratio.length);
  assert.equal(getUnitType('BUDR').drawerStyle, 'budr');
});

test('the number is the PROFILE’s, and an old profile gets it', () => {
  assert.equal(migrateCabinetProfile({}).pantryUnit.defaults.drawers, 3);
  // A workshop that wants four gets four, and keeps the app's answer for the
  // rest of the block. Built from a RECOGNISABLE profile: `migrateCabinetProfile`
  // discards a shape it cannot recognise wholesale (no carcass, no puzzle, no
  // wardrobe → "nothing user-set is safely transferable"), so a two-key object
  // would exercise that branch and not the merge.
  const own = migrateCabinetProfile({
    ...P,
    pantryUnit: { ...P.pantryUnit, defaults: { ...P.pantryUnit.defaults, drawers: 4 } },
  });
  assert.equal(own.pantryUnit.defaults.drawers, 4);
  assert.equal(own.pantryUnit.defaults.height, 2100);
});

test('the fixture bucket is complete — the walk has files to mount', () => {
  for (const f of ['71B7550_15001.glb', '71B7550_15002.glb', '71B7590_15003.glb', '71B7590_15004.glb']) {
    assert.ok(existsSync(`${FIXTURES}${f}`), `${f} is missing from the showroom`);
  }
});
