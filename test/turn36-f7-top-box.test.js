import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { UNIT_CATEGORIES, UNIT_TYPES, defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { riderIsOrphaned, settleRiders } from '../src/engine/topBox.js';
import { unitTop } from '../src/engine/runs.js';
import { buildBom } from '../src/engine/bom.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { CHECKS } from '../src/engine/checks.js';

// ─── TURN 36 (CLAUDE.md F7): THE TOP BOX ────────────────────────────────────
//
// Re-issued from T35-F14, with the owner's reason verbatim: *"wysokie szafy
// nie wejdą do domu"*. "library offers Main wardrobe + Top box; the Top box
// snaps flush on a main (same depth, x aligned, y = main's height), rides its
// moves; red fault when orphaned; its own carcass/doors/BOM/CNC."

const ROOM = {
  height: 2600,
  corners: [{ x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 3000 }, { x: 0, y: 3000 }],
};

function freshProject() {
  const s = useProjectStore.getState();
  s.loadProject({
    id: null, name: 'T36 F7', number: '36', client: 'the owner', room: ROOM,
    design: { projectType: 'wardrobe' },
  }, []);
  return useProjectStore.getState();
}
const units = () => useProjectStore.getState().units;
const byId = (id) => units().find((u) => u.id === id);

// ═══ 1. THE LIBRARY ═════════════════════════════════════════════════════════

test('F7 — the library offers Main wardrobe AND Top box', () => {
  const wardrobes = UNIT_CATEGORIES.find((c) => c.id === 'wardrobe');
  assert.deepEqual(wardrobes.types, ['WARDROBE', 'WARDROBE_TOP']);
  assert.equal(UNIT_TYPES.WARDROBE_TOP.label, 'Top box');
  assert.equal(UNIT_TYPES.WARDROBE_TOP.available, true);
});

test('F7 — it is a WARDROBE in everything the cut list cares about', () => {
  const top = getUnitType('WARDROBE_TOP');
  const main = getUnitType('WARDROBE');
  assert.equal(top.family, 'wardrobe');
  assert.equal(top.lisp, main.lisp, 'the same kit');
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F1b) ────────────────────────
  //
  // This line read `assert.equal(top.hingeRule, main.hingeRule)` and it was
  // the belief the owner overturned on the T37 eye test: *"a top box door 500
  // mm tall gets 5 hinges."* It did, and this assertion is why — the box was
  // filed under the wardrobe's own `tall` ladder, which does not scale down:
  // its arithmetic is `endOffset`, four inner hinges spread evenly, `H −
  // endOffset`, which is six on a 2150 carcass and five on a 500 one.
  //
  // Everything the CUT LIST cares about is still the wardrobe's — the same
  // kit, the same carcass, the same doors — and the HINGE COUNT turned out not
  // to be one of those things. It is a question about the DOOR, so it is asked
  // of the door's own height by the ladder that scales with it.
  assert.equal(top.hingeRule, 'low', 'its doors run the ladder their own height asks for (T38-F1b)');
  assert.deepEqual(top.carcass, main.carcass);
  assert.equal(top.supports.doors, true);
  // …and two things differ, both about where it STANDS.
  assert.equal(top.legs, false, 'it stands on a cabinet, not on legs');
  assert.equal(top.mount, 'wall', 'so its height is `mount_height`');
  assert.equal(top.ridesOn, 'wardrobe');
  assert.equal(top.heightGroup, null, 'no project default may set its height');
});

// ═══ 2. ITS OWN CARCASS, DOORS, BOM AND CNC ═════════════════════════════════

test('F7 — it builds its own carcass and its own door, out of the same kit', () => {
  const r = computeCabinet({ ...defaultParamsFor('WARDROBE_TOP', P), unit_num: 'WT01' }, P);
  assert.ok(r.panels.length >= 5, 'sides, top, bottom, back');
  for (const part of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']) {
    assert.ok(r.panels.some((p) => p.part === part), `${part} is cut`);
  }
  assert.ok(r.panels.some((p) => p.part === 'FRONT'), 'and a door is hung');
  assert.equal(r.panels.some((p) => p.part === 'PLINTH'), false, 'it has no plinth');
  assert.equal(r.totals.legs, 0, '…and no legs');
  assert.ok(r.drills.length > 0, 'the machine is told about it');
});

test('F7 — its BOM is its own, and it is not the main\'s', () => {
  const top = computeCabinet({ ...defaultParamsFor('WARDROBE_TOP', P), unit_num: 'WT01' }, P);
  const main = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W01' }, P);
  const bom = buildBom([
    { unit: { id: 'u1', type: 'WARDROBE', params: {} }, result: main },
    { unit: { id: 'u2', type: 'WARDROBE_TOP', params: {} }, result: top },
  ]);
  assert.equal(bom.units.length, 2, 'two cabinets, two blocks');
  assert.equal(bom.units[1].unitNum, 'WT01');
  assert.ok(bom.units[1].rows.length > 0, 'and its own cut rows');
  assert.ok(bom.totals.pieces > main.totals.pieces_total, 'the pair costs more than the main');
});

test('F7 — its own number, so a cut list reads the two apart', () => {
  const s = freshProject();
  const a = s.addUnit('WARDROBE');
  const b = useProjectStore.getState().addUnit('WARDROBE_TOP');
  assert.match(byId(a.id).params.unit_num, /^W/);
  assert.match(byId(b.id).params.unit_num, /^WT/);
});

// ═══ 3. THE SNAP ════════════════════════════════════════════════════════════

test('F7 — it SNAPS flush on a main: same wall, x aligned, same depth, y = its top', () => {
  const s = freshProject();
  const main = s.addUnit('WARDROBE');
  useProjectStore.getState().updateUnitParams(main.id, { width: 900, height: 2000, depth: 600 });
  const box = useProjectStore.getState().addUnit('WARDROBE_TOP');
  const m = byId(main.id);
  const b = byId(box.id);
  assert.equal(b.params.rides_on, main.id, 'it knows what it stands on');
  assert.equal(b.position.wall, m.position.wall);
  assert.equal(b.position.x_mm, m.position.x_mm, 'x aligned');
  assert.equal(b.params.depth, m.params.depth, 'same depth');
  assert.equal(b.params.mount_height, unitTop(m, P), 'y = the main\'s own top');
});

test('F7 — the snap is IDEMPOTENT: a settled floor settles to itself', () => {
  const s = freshProject();
  const main = s.addUnit('WARDROBE');
  useProjectStore.getState().addUnit('WARDROBE_TOP');
  const before = units();
  assert.equal(settleRiders(before, P), before, 'nothing to move, nothing returned new');
  assert.ok(main.id);
});

// ═══ 4. IT RIDES ════════════════════════════════════════════════════════════

test('F7 — it RIDES the main along the wall', () => {
  const s = freshProject();
  const main = s.addUnit('WARDROBE');
  useProjectStore.getState().updateUnitParams(main.id, { width: 900 });
  const box = useProjectStore.getState().addUnit('WARDROBE_TOP');
  const from = byId(box.id).position.x_mm;
  useProjectStore.getState().moveUnit(main.id, 1500, 1);
  const m = byId(main.id);
  const b = byId(box.id);
  assert.equal(b.position.x_mm, m.position.x_mm, 'it went with it');
  assert.notEqual(b.position.x_mm, from, '…and it really moved');
});

test('F7 — it RIDES the main UP when the main grows, and follows its depth', () => {
  const s = freshProject();
  const main = s.addUnit('WARDROBE');
  useProjectStore.getState().updateUnitParams(main.id, { height: 2000, depth: 600 });
  const box = useProjectStore.getState().addUnit('WARDROBE_TOP');
  assert.equal(byId(box.id).params.mount_height, unitTop(byId(main.id), P));
  useProjectStore.getState().updateUnitParams(main.id, { height: 1800 });
  assert.equal(byId(box.id).params.mount_height, unitTop(byId(main.id), P), 'it came down with it');
  useProjectStore.getState().updateUnitParams(main.id, { depth: 500 });
  assert.equal(byId(box.id).params.depth, byId(main.id).params.depth, 'and it is never deeper');
});

// ═══ 5. THE ORPHAN ══════════════════════════════════════════════════════════

test('F7 — a top box with nothing under it is ORPHANED, and left where it is', () => {
  const s = freshProject();
  const main = s.addUnit('WARDROBE');
  const box = useProjectStore.getState().addUnit('WARDROBE_TOP');
  const where = { ...byId(box.id).position };
  useProjectStore.getState().removeUnit(main.id);
  const b = byId(box.id);
  assert.ok(b, 'it is NOT deleted with its main');
  assert.deepEqual(b.position, where, '…and it is NOT moved onto something else');
  assert.equal(riderIsOrphaned(b, units()), true);
});

test('F7 — and check #14 says so, in RED', () => {
  const s = freshProject();
  const main = s.addUnit('WARDROBE');
  useProjectStore.getState().addUnit('WARDROBE_TOP');
  const clean = useProjectStore.getState().runChecks() || [];
  assert.equal(clean.filter((f) => f.check === 14).length, 0, 'a settled pair is silent');

  useProjectStore.getState().removeUnit(main.id);
  const after = useProjectStore.getState().runChecks() || [];
  assert.ok(CHECKS.some((c) => c.n === 14 && c.level === 'red'), 'the rule is in the table');
  const found = after.filter((f) => f.check === 14);
  assert.equal(found.length, 1, 'one fault, on the orphan');
  assert.equal(found[0].level, 'red');
  assert.match(found[0].message, /standing on nothing/);
  assert.equal(found[0].subject.editor, 'cabinet', 'clicking it flies to the box');
});

test('F7 — an ordinary wardrobe is never a rider and never a fault', () => {
  const s = freshProject();
  const main = s.addUnit('WARDROBE');
  assert.equal(riderIsOrphaned(byId(main.id), units()), false);
  assert.equal(riderIsOrphaned(null, units()), false);
  // …and a top box may not ride another top box.
  const a = useProjectStore.getState().addUnit('WARDROBE_TOP');
  assert.ok(a.id, a.error || '');
  assert.notEqual(byId(a.id).params.rides_on, a.id, 'it does not ride itself');
  // ─── AMENDED BY T53 · F5, AND THE AMENDMENT IS NAMED ────────────────────
  //
  // T36 added a SECOND box here and asserted only that the two did not ride
  // each other. They did not — they stood EXACTLY INSIDE each other, on the
  // same main at the same x, which is the fault the owner reported on 27.08:
  // *"top box łamią zasadę — nakłada się jeden na drugi, a nie może."*
  //
  // A main 600 wide carrying a 600 box has no room for another, so the second
  // add REFUSES now and says so — the same answer a cabinet add against a wall
  // gives. The claim T36 was making is kept below and made stronger: whatever
  // happens, a box never rides a box.
  const b = useProjectStore.getState().addUnit('WARDROBE_TOP');
  assert.equal(b.id, null, 'no room on the only main — refused, not stacked');
  assert.match(b.error, /no room for another top box/i);
  assert.equal(units().filter((u) => u.type === 'WARDROBE_TOP').length, 1);
});
