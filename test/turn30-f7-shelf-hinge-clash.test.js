// ─── TURN 30 F7 — a shelf and a hinge at the same height ────────────────────
//
// The owner's case: a shelf row and a hinge cup land level with each other, and
// the cabinet is cut anyway. Two things go wrong at once on the same board —
// the shelf's own ⌀7.5 sleeve cluster reaches into the circle the cup occupies,
// and the shelf's front edge stands where the arm swings.
//
// ─── THE WINDOW IS DERIVED, AND THE DERIVATION IS THE FEATURE ───────────────
//
// CLAUDE.md: "collision window: derive from the geometry — cup ⌀35 + the sleeve
// pattern's ±50 — and **write the number down, don't feel it**." So it is an
// arithmetic over numbers that already exist for their own reasons:
//
//     cup half        hardware.hinge.cupDiameter / 2      17.5
//   + cluster reach   max |shelfHoles.clusterOffsets|     50
//   + sleeve half     shelfHoles.diameter / 2              3.75
//   = 71.25 mm
//
// Every term is asserted below, and so is the consequence: re-measure the cup
// and the window moves with it. A 70 typed into a file would not have.
//
// ─── AND IT ASKS RATHER THAN FIXES ──────────────────────────────────────────
//
// "No silent auto-fix." Neither button changes anything: each OPENS the editor
// where the decision belongs, on the row that is in conflict — the shelf's own
// window, or F2's Door window at section B with that hinge's row ringed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { shelfHingeClashWindowMm, shelfHingeClashes } from '../src/engine/shelfHingeClash.js';
// TURN 40 (F4a): the ONE definition both surfaces render.
import { shelfHingeFindings } from '../src/engine/checks.js';

const PROMPT = readFileSync(new URL('../src/components/ShelfHingeClash.jsx', import.meta.url), 'utf8');

const bud = (over = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P), unit_num: '01', doors: true, ...over,
}, P);

// ─── THE NUMBER, AND WHERE IT COMES FROM ────────────────────────────────────

test('F7 the window is 71.25 mm, and it is a SUM rather than a constant', () => {
  const cup = P.hardware.hinge.cupDiameter / 2;
  const reach = Math.max(...P.shelfHoles.clusterOffsets.map(Math.abs));
  const sleeve = P.shelfHoles.diameter / 2;
  assert.equal(cup, 17.5);
  assert.equal(reach, 50);
  assert.equal(sleeve, 3.75);
  assert.equal(shelfHingeClashWindowMm(P), cup + reach + sleeve);
  assert.equal(shelfHingeClashWindowMm(P), 71.25);
});

test('F7 re-measure the cup and the window moves with it', () => {
  // The whole point of deriving it. Turn 26 re-measured the cup's DEPTH on the
  // owner's bench; the day somebody re-measures its DIAMETER this must follow,
  // and a 71.25 typed into a file would not have.
  const wider = migrateCabinetProfile({
    ...P,
    hardware: { ...P.hardware, hinge: { ...P.hardware.hinge, cupDiameter: 40 } },
  });
  assert.equal(shelfHingeClashWindowMm(wider), 20 + 50 + 3.75);
  // …and so does the sleeve pattern, which is the other half of the sum.
  const tighter = migrateCabinetProfile({
    ...P,
    shelfHoles: { ...P.shelfHoles, clusterOffsets: [-32, 0, 32] },
  });
  assert.equal(shelfHingeClashWindowMm(tighter), 17.5 + 32 + 3.75);
});

test('F7 a partial profile cannot produce NaN', () => {
  assert.equal(Number.isFinite(shelfHingeClashWindowMm({})), true);
  assert.equal(Number.isFinite(shelfHingeClashWindowMm(null)), true);
});

// ─── THE OWNER'S CASE, ON A REAL CABINET ────────────────────────────────────

test('F7 THE CASE: a base unit with two shelves and doors really does clash', () => {
  const r = bud({ shelves: 2 });
  // The geometry, said out loud so the test is a description and not a spell:
  // the rows fall at 262.67 and 507.33, the hinges at 100, 470 and 670.
  assert.deepEqual(r.drillSummary.hinge_centers, [100, 470, 670]);
  assert.equal(r.clashes.length, 1);
  const [c] = r.clashes;
  assert.equal(c.hingeY, 470);
  assert.ok(Math.abs(c.gapMm - 37.33) < 0.01, `${c.gapMm} mm apart`);
  assert.ok(c.gapMm < c.windowMm);
  // …and it names BOTH editors, because both are what the prompt offers.
  assert.equal(c.shelfPanelId, 'SHELF-2');
  assert.equal(c.hingeIndex, 1, 'the middle hinge, by index — the row the modal rings');
  assert.ok(c.doorPanelId, 'and the leaf whose window opens');
  // The message says the number rather than "too close".
  assert.match(c.message, /37 mm apart/);
  assert.match(c.message, /71\.25 mm/);
});

test('F7 …and one shelf or three do NOT clash, which is what says it is measuring', () => {
  // A detector that fired on everything would be a detector nobody reads.
  assert.equal(bud({ shelves: 1 }).clashes.length, 0);
  assert.equal(bud({ shelves: 3 }).clashes.length, 0);
});

test('F7 a cabinet with NO DOORS has no cup to foul, and reports nothing', () => {
  assert.equal(bud({ shelves: 2, doors: false }).clashes.length, 0);
});

test('F7 a FIX shelf has no sleeves at all, so it cannot clash — the fix, as a law', () => {
  // Turn 24 F7: "jak fix, to nie ma 3 poziomów 7,5." That is exactly what the
  // prompt's first button sends a joiner to do, and this is why it works.
  const clashing = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    doors: true,
    shelves: 1,
    sections: [{ items: [{ id: 's1', kind: 'shelf', pos_mm: 470 }] }],
  }, P);
  assert.equal(clashing.clashes.length, 1, 'a pin shelf level with a hinge clashes');

  const fixed = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    doors: true,
    shelves: 1,
    sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 470 }] }],
  }, P);
  assert.equal(fixed.drillSummary.shelf_pin_row_y.length, 0, 'a fix shelf has no pin row');
  assert.equal(fixed.clashes.length, 0, 'so there is nothing to report');
});

test('F7 moving the shelf clear of the window settles it too', () => {
  const at = (pos) => computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    doors: true,
    shelves: 1,
    sections: [{ items: [{ id: 's1', kind: 'shelf', pos_mm: pos }] }],
  }, P).clashes.length;
  // Just inside the window, and just outside it. The boundary is where a
  // derived number earns its keep.
  assert.equal(at(470 + 70), 1);
  assert.equal(at(470 + 72), 0);
});

// ─── IT REPORTS. IT DOES NOT FIX ───────────────────────────────────────────

test('F7 nothing about the clash reaches a hole', () => {
  const clean = bud({ shelves: 2 });
  // The cabinet is cut exactly as it was asked for: the drilling of a clashing
  // cabinet is the drilling it would have had with no detector in the app.
  const rows = clean.drillSummary.shelf_pin_row_y;
  assert.equal(rows.length, 2, 'both shelves are still drilled for pins');
  assert.deepEqual(clean.drillSummary.hinge_centers, [100, 470, 670], 'and every hinge is still drilled');
  // The module cannot reach one either — it takes a result and returns rows.
  const src = readFileSync(new URL('../src/engine/shelfHingeClash.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /addDrill|drills\.push|panels\.push/);
});

test('F7 `clashes` is always an ARRAY, so nobody has to ask which kind of empty it is', () => {
  for (const type of ['BUD', 'WUD', 'WARDROBE']) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01' }, P);
    assert.ok(Array.isArray(r.clashes), `${type} publishes an array`);
  }
});

// ─── THE PROMPT, AND WHERE EACH BUTTON GOES ────────────────────────────────

test('F7 the prompt offers the OWNER’S OWN two choices, by name'
  + ' — RE-PINNED 18.08.2026 (T40-F4a): the names live in the DEFINITION now', () => {
  // ─── RE-PINNED 18.08.2026 (CLAUDE.md T40-F4a) ────────────────────────────
  //
  // The owner, with the Check panel and the cabinet modal side by side:
  // *"raczej powinny się pokazywać i tu i tu"* — the same fault, the same
  // wording, the SAME BUTTONS, in both places. There were two definitions and
  // two sets of labels; there is ONE now, in `engine/checks.js`, and both
  // surfaces render it. So the names are asserted where they live, and the
  // component is asserted to own none of its own.
  const CHECKS_SRC = readFileSync(new URL('../src/engine/checks.js', import.meta.url), 'utf8');
  assert.match(CHECKS_SRC, /label: 'Remove sleeves at this shelf'/);
  assert.match(CHECKS_SRC, /label: 'Move the hinge'/);
  assert.match(PROMPT, /f\.actions\.map/, 'the component draws the definition’s list');
  assert.match(PROMPT, /shelfHingeFindings/, '…and reads the definition itself');
  assert.match(PROMPT, /data-shelf-hinge-clash=\{rows\.length\}/);
  // …and it says the number, because a warning that will not say how near is
  // too near is a warning nobody can argue with.
  assert.match(PROMPT, /\{f\.message\}/);
});

test('F7 "Remove sleeves" opens the SHELF’s own window, at that shelf'
  + ' — RE-PINNED 18.08.2026 (T40-F4a): from the one definition', () => {
  // The data hook turn 30 shipped is still on the button, so every gesture
  // that worked yesterday still finds it.
  assert.ok(PROMPT.indexOf('data-clash-remove-sleeves') > 0);
  // WHERE IT GOES is the definition's, and it is asserted as BEHAVIOUR rather
  // than as a source string — which is stronger than what this pinned before.
  const r = bud({ shelves: 2 });
  const found = shelfHingeFindings({ unitId: 'u1', unitNum: '01', result: r, profile: P });
  assert.ok(found.length, 'this fixture really does clash');
  const remove = found[0].actions.find((a) => a.id === 'remove-sleeves');
  assert.equal(remove.subject.editor, 'element');
  assert.equal(remove.subject.panelId, found[0].panelId, 'that shelf');
  // It does NOT change the shelf — the joiner does, in the window that opens.
  assert.doesNotMatch(PROMPT, /setElement\(|updateItem\(|removeItem\(|setShelf/);
});

test('F7 "Move the hinge" opens F2’s DOOR window at section B, that row ringed'
  + ' — RE-PINNED 18.08.2026 (T40-F4a): from the one definition', () => {
  assert.ok(PROMPT.indexOf('data-clash-move-hinge') > 0);
  const r = bud({ shelves: 2 });
  const found = shelfHingeFindings({ unitId: 'u1', unitNum: '01', result: r, profile: P });
  const move = found[0].actions.find((a) => a.id === 'move-hinge');
  assert.equal(move.subject.editor, 'element');
  assert.equal(move.subject.section, 'hinges');
  assert.equal(typeof move.subject.hingeIndex, 'number');
  assert.ok(move.subject.panelId, 'the door');
  // TURN 40 (F4c): …and the camera goes to the HINGE's own row on that door.
  assert.equal(move.subject.atMm, found[0].hingeY);
  // …and no store action at all: NO SILENT AUTO-FIX, as code rather than as a
  // promise.
  assert.doesNotMatch(PROMPT, /setHingePos\(|removeHinge\(|addHinge\(|resetHinges\(/);
});

test('F7 the prompt reaches a person: it is mounted where a cabinet is read', () => {
  const panel = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /import ShelfHingeClash from '\.\/ShelfHingeClash\.jsx';/);
  assert.match(panel, /<ShelfHingeClash unitId=\{unit\.id\} \/>/);
  // ABOVE the sections and outside every one of them. A conflict prompt
  // folded inside a collapsed "Carcass" is a prompt nobody ever expands to
  // find — which is what the first run of the walk proved, by photographing a
  // panel with no prompt in it.
  assert.ok(panel.indexOf('<ShelfHingeClash') < panel.indexOf('<Section'),
    'the prompt stands above the first collapsible section');
});

// ─── AND THE RESOLVER IS ASKABLE ON ITS OWN ────────────────────────────────

test('F7 the pure function answers the same thing the engine published', () => {
  const r = bud({ shelves: 2 });
  assert.deepEqual(shelfHingeClashes({ result: r, profile: P }), r.clashes);
  // Nothing to work with is an empty list rather than a throw.
  assert.deepEqual(shelfHingeClashes({ result: null, profile: P }), []);
  assert.deepEqual(shelfHingeClashes({ result: { drillSummary: {} }, profile: P }), []);
});
