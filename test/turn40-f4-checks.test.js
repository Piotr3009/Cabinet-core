// ─── TURN 40 (CLAUDE.md F4): ONE MESSAGE, NO TWINS, AND TAKE ME THERE ───────
//
// Three faults, from the owner's screenshots of 18.08.2026.
//
// F4a — the same fault, said twice, differently. The Check panel showed
//   `#1 SHELF × HINGE COLLISION` with one button and the cabinet modal showed
//   the same fault with two. *"raczej powinny się pokazywać i tu i tu"* — the
//   same fault, the same wording, the SAME buttons, in both places.
//
// F4b — the duplicate. `#3 TALL CABINET WITH NO FIXED SHELF` printed TWICE,
//   identically, apparently for one cabinet.
//
// F4c — *"nie bierze nas dokładnie do tego miejsca… jeśli to ta półka,
//   powinno nas wziąć do tej półki, jakby najechać kamerą na nią, lub na
//   zawias który jest problemem. Jeśli drzwi zamknięte, to otwiera program
//   drzwi i nas tam zabiera."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { runChecks, shelfHingeFindings } from '../src/engine/checks.js';
import { useProjectStore, nextUnitNum } from '../src/stores/projectStore.js';
import { getUnitType } from '../src/engine/types.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

function project(roomH = 2700) {
  store().loadProject({
    id: null, name: 't40-f4', room: migrateRoom({ height: roomH, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

/** The owner's own configuration: a 2460 tall wardrobe with one non-fixed shelf. */
function tallWardrobe() {
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 900, height: 2460, doors: { count: 2 } });
  store().addShelves(id, 1);
  return id;
}

// ═══ F4a — ONE DEFINITION, TWO RENDERERS ═══════════════════════════════════

const clashing = () => computeCabinet({
  ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 2, doors: { count: 1, hinge: 'L' },
}, P);

test('F4a — the fault carries its own BUTTONS, as data', () => {
  const r = clashing();
  const found = shelfHingeFindings({ unitId: 'u1', unitNum: '01', result: r, profile: P });
  assert.ok(found.length, 'this fixture really does clash');
  const f = found[0];
  assert.equal(f.check, 1);
  assert.equal(f.level, 'red');
  assert.deepEqual(f.actions.map((a) => a.id), ['remove-sleeves', 'move-hinge']);
  assert.deepEqual(f.actions.map((a) => a.label),
    ['Remove sleeves at this shelf', 'Move the hinge'],
    'the owner’s own two choices, by name, in one place');
  for (const a of f.actions) {
    assert.equal(typeof a.title, 'string');
    assert.equal(a.subject.unitId, 'u1');
    assert.equal(a.subject.editor, 'element');
  }
});

test('F4a — the SAME finding is what `runChecks` prints', () => {
  // Not "an equivalent one": literally the same builder, so the panel and the
  // modal cannot drift.
  const r = clashing();
  const viaChecks = runChecks({
    entries: [{ unit: { id: 'u1', type: 'BUD', params: { unit_num: '01', height: 770 } }, result: r }],
    profile: P,
  }).filter((f) => f.check === 1);
  const direct = shelfHingeFindings({ unitId: 'u1', unitNum: '01', result: r, profile: P });
  assert.equal(viaChecks.length, direct.length);
  assert.deepEqual(viaChecks.map((f) => f.message), direct.map((f) => f.message));
  assert.deepEqual(
    viaChecks.map((f) => f.actions.map((a) => a.label)),
    direct.map((f) => f.actions.map((a) => a.label)),
  );
});

test('F4a — BOTH renderers draw that list, and NEITHER owns a label', () => {
  const panel = src('components/CheckPanel.jsx');
  const modal = src('components/ShelfHingeClash.jsx');
  const checks = src('engine/checks.js');
  // The labels are in the definition…
  assert.match(checks, /label: 'Remove sleeves at this shelf'/);
  assert.match(checks, /label: 'Move the hinge'/);
  // …and in neither renderer.
  for (const [name, source] of [['CheckPanel', panel], ['ShelfHingeClash', modal]]) {
    assert.doesNotMatch(source, /'Remove sleeves at this shelf'/, `${name} owns no label`);
    assert.doesNotMatch(source, />\s*Remove sleeves at this shelf\s*</, `${name} hardcodes no label`);
  }
  // Both map the finding's own array.
  assert.match(panel, /f\.actions/);
  assert.match(modal, /f\.actions\.map/);
  assert.match(modal, /shelfHingeFindings/);
  // …and both use the ONE gesture, so a click behaves the same in each.
  assert.match(panel, /useGoToSubject/);
  assert.match(modal, /useGoToSubject/);
});

test('F4a — `alternative` is KEPT and derived, so no old reader breaks', () => {
  // Iron rule 3: nothing is deleted. A reader written before tonight still
  // finds `alternative`, and it can no longer disagree with the buttons because
  // it is made out of them.
  const f = shelfHingeFindings({ unitId: 'u1', unitNum: '01', result: clashing(), profile: P })[0];
  const move = f.actions.find((a) => a.id === 'move-hinge');
  assert.ok(f.alternative);
  assert.equal(f.alternative.label, 'Move the hinge');
  assert.equal(f.alternative.panelId, move.subject.panelId);
  assert.equal(f.alternative.hingeIndex, move.subject.hingeIndex);
  assert.equal(f.alternative.section, 'hinges');
});

// ═══ F4b — THE DUPLICATE, AND WHAT ACTUALLY CAUSED IT ══════════════════════

test('F4b — THE OWNER’S OWN CONFIGURATION: exactly ONE instance', () => {
  // CLAUDE.md's named test, in its own words: a 2460 tall wardrobe with one
  // non-fixed shelf → exactly one instance.
  project();
  tallWardrobe();
  const three = store().runChecks().filter((f) => f.check === 3);
  assert.equal(three.length, 1, JSON.stringify(three.map((f) => f.message)));
  assert.match(three[0].message, /2460 mm tall with 1 shelf and none of them fixed/);
});

test('F4b — the rule emits ONCE PER CABINET, whatever the cabinet has in it', () => {
  // CLAUDE.md guessed "a per-shelf loop where a per-cabinet answer belongs,
  // most likely". It is NOT that, and this is the measurement that says so: the
  // count does not follow the number of shelves.
  project();
  for (const shelves of [1, 2, 5]) {
    const { id } = store().addUnit('WARDROBE');
    store().updateUnitParams(id, { width: 900, height: 2460, doors: { count: 2 } });
    store().addShelves(id, shelves);
    const mine = store().runChecks().filter((f) => f.check === 3 && f.unitId === id);
    assert.equal(mine.length, 1, `${shelves} shelves still produce one finding`);
  }
});

test('F4b — THE REAL CAUSE: two cabinets were wearing one name', () => {
  // Measured. `addUnit` numbered from `units.length`, so a delete handed the
  // next cabinet a number somebody else already had — and two real faults on
  // two real cabinets printed as two lines nobody could tell apart. That is
  // the "identical twin" in the screenshot.
  project();
  const a = store().addUnit('WARDROBE');
  const b = store().addUnit('WARDROBE');
  assert.deepEqual(store().units.map((u) => u.params.unit_num), ['W01', 'W02']);
  store().removeUnit(a.id);
  const c = store().addUnit('WARDROBE');
  assert.deepEqual(store().units.map((u) => u.params.unit_num), ['W02', 'W03'],
    'the newcomer takes the next number NOBODY is wearing');
  assert.notEqual(b.id, c.id);

  // …and the two findings that come out of it are now distinguishable.
  for (const u of store().units) {
    store().updateUnitParams(u.id, { width: 900, height: 2460, doors: { count: 2 } });
    store().addShelves(u.id, 1);
  }
  const three = store().runChecks().filter((f) => f.check === 3);
  assert.equal(three.length, 2, 'two cabinets, two faults — both real');
  assert.equal(new Set(three.map((f) => f.message)).size, 2, 'and two DIFFERENT lines');
});

test('F4b — `nextUnitNum` is total, and a prefix cannot bump another prefix', () => {
  const W = getUnitType('WARDROBE');
  const B = getUnitType('BUD');
  assert.equal(nextUnitNum([], W), 'W01');
  assert.equal(nextUnitNum([{ params: { unit_num: 'W01' } }], W), 'W02');
  assert.equal(nextUnitNum([{ params: { unit_num: 'W07' } }], W), 'W08', 'the HIGHEST, not the count');
  // A wardrobe must not be able to bump a base unit's number, and the base
  // unit's prefix is the empty string — `'W01'.startsWith('')` is true, which
  // is the trap this is written against.
  assert.equal(nextUnitNum([{ params: { unit_num: 'W09' } }], B), '01');
  assert.equal(nextUnitNum([{ params: { unit_num: '03' } }], W), 'W01');
  assert.equal(nextUnitNum([{ params: { unit_num: '03' } }], B), '04');
  // A cabinet somebody has NAMED by hand is not a number and is skipped.
  assert.equal(nextUnitNum([{ params: { unit_num: 'Tall by the door' } }], W), 'W01');
  // …and a unit can be excluded, which is what clearing its own name does.
  assert.equal(nextUnitNum([{ id: 'x', params: { unit_num: 'W05' } }], W, { except: 'x' }), 'W01');
});

test('F4b — and NO RULE can print one fault twice, whatever produced it', () => {
  // The second line of defence: a finding is identified by the rule, the
  // CABINET BY ID, the piece and the sentence. Two REAL faults on two cabinets
  // differ by id and both survive — which is why the key is the id and not the
  // message alone.
  const r = clashing();
  const unit = { id: 'u1', type: 'BUD', params: { unit_num: '01', height: 770 } };
  const twice = runChecks({ entries: [{ unit, result: r }, { unit, result: r }], profile: P });
  const once = runChecks({ entries: [{ unit, result: r }], profile: P });
  assert.deepEqual(twice.map((f) => f.message), once.map((f) => f.message),
    'the same cabinet handed in twice still reports once');
  const two = runChecks({
    entries: [
      { unit, result: r },
      { unit: { id: 'u2', type: 'BUD', params: { unit_num: '02', height: 770 } }, result: r },
    ],
    profile: P,
  });
  assert.equal(two.length, once.length * 2, 'two different cabinets keep both');
});

// ═══ F4c — TAKE ME THERE ═══════════════════════════════════════════════════

test('F4c — every fault names the OBJECT it is about, not just the cabinet', () => {
  const f = shelfHingeFindings({ unitId: 'u1', unitNum: '01', result: clashing(), profile: P })[0];
  // The shelf, for the fault itself…
  assert.ok(f.subject.panelId);
  assert.equal(f.subject.editor, 'element');
  assert.equal(f.subject.atMm, f.shelfY, 'and the height on it');
  // …and the HINGE, for the other way out: "lub na zawias który jest problemem".
  const move = f.actions.find((a) => a.id === 'move-hinge');
  assert.equal(move.subject.atMm, f.hingeY);
  assert.notEqual(move.subject.panelId, f.subject.panelId, 'a different object entirely');
});

test('F4c — a fault with no single object falls back rather than inventing one', () => {
  // CLAUDE.md: "If a fault genuinely has no single object, fall back to today's
  // behaviour rather than inventing a target."
  project();
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 900, height: 2460, doors: { count: 2 } });
  store().addShelves(id, 1);
  const three = store().runChecks().find((f) => f.check === 3);
  assert.equal(three.panelId, null, 'a tall cabinet with no fixed shelf is about the CABINET');
  assert.equal(three.subject.editor, 'cabinet');
  assert.equal(three.subject.panelId, undefined);
});

test('F4c — the gesture opens the doors FIRST, then rings, then flies', () => {
  // The order is what makes it work, and it is written once. A camera that
  // flies into a shut wardrobe shows a door.
  const gesture = src('lib/checkFindings.js');
  const open = gesture.indexOf('openFrontsFor(unitId, fronts)');
  const ring = gesture.indexOf('selectElement(unitId, panelId)');
  const fly = gesture.indexOf('focusOnPanel(unitId, panelId');
  const editor = gesture.indexOf('openModal(subject.editor');
  assert.ok(open > 0 && ring > open && fly > ring && editor > fly,
    `open ${open} → ring ${ring} → fly ${fly} → editor ${editor}`);
  // …and NOTHING ever closes one: "do not fight the user by closing them again".
  assert.doesNotMatch(gesture, /closeAllFronts|toggleFront/);
});

test('F4c — a FRONT is never flown into while it is opening', () => {
  // The rule `3d/UnitView.jsx` has followed since turn 5, said again here
  // because this is a second caller of the same flight: a door swings, and
  // flying at an opening door is a way to see nothing. So a front is not
  // treated as "behind a closed door" — there is nothing in front of it.
  const gesture = src('lib/checkFindings.js');
  assert.match(gesture, /const isFront =/);
  assert.match(gesture, /if \(piece && !isFront\)/);
});

test('F4c — the scene resolves the piece, because it owns the frame', () => {
  // The panel does not compute a world point: a panel's world centre needs the
  // unit's origin, its wall's angle and its own rotation, and a second copy of
  // that maths is how a camera flies at the wrong cabinet on wall 3 of an
  // L-shaped room.
  const ui = src('stores/uiStore.js');
  assert.match(ui, /focusOnPanel: \(unitId, panelId/);
  assert.match(ui, /focusPanel: \{ unitId, panelId, atMm, at: Date\.now\(\) \}/);
  const view = src('3d/UnitView.jsx');
  assert.match(view, /focusPanel\?\.panelId/);
  assert.match(view, /panelWorldCentre\(/);
  assert.match(view, /onFocus\(centre,/, 'and hands it to the SAME flight a double-click uses');
  const scene = src('3d/Scene.jsx');
  assert.match(scene, /focusPanel=\{focusPanel && focusPanel\.unitId === unit\.id \? focusPanel : null\}/);
});
