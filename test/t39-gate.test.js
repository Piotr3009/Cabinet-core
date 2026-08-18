// ─── THE GATE, FOLDED IN (turn 39, CLAUDE.md F7) ────────────────────────────
//
// *"The existing hard gate ('Save blocked without a Stock board assigned for
// spray/veneer sources') folds into this system rather than living beside it:
// the gate now asks the assignment store. NOTHING IS LOOSENED — a missing board
// still blocks. Add: Export CNC WARNS (warns, not blocks) when the project has
// unassigned parts."*
//
// Two halves, and the first one is the one that matters: the original blocking
// case must still block, with the same code and the same words. Turn 32's and
// turn 34's own gate tests stay green beside these — they are the proof that
// nothing moved, and this file is the proof that something was added.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { materialsAssigned, wizardStartBlockers } from '../src/engine/projectSettings.js';
import { projectHeights } from '../src/engine/design.js';
import { cncAssignmentWarning } from '../src/engine/bom.js';

const DESIGN = { projectType: 'kitchen' };
const gateArgs = (design, assignments = null) => ({
  design,
  heights: projectHeights(design, P),
  roomHeight: 2500,
  profile: P,
  assignments,
});

// ═══ NOTHING IS LOOSENED ════════════════════════════════════════════════════

test('the ORIGINAL case still blocks — no board anywhere, no Start', () => {
  const { blockers, materials } = wizardStartBlockers(gateArgs(DESIGN));
  assert.equal(materials.all, false);
  const hit = blockers.find((b) => b.code === 'materials');
  assert.ok(hit, 'the gate is gone');
  assert.match(hit.message, /Assign a stock board to/);
  assert.match(hit.message, /Generic counts, a colour or a decor alone does not/);
});

test('…and it still blocks with the assignment store present but EMPTY', () => {
  const { blockers } = wizardStartBlockers(gateArgs(DESIGN, { schema: 2, base: {}, overrides: {} }));
  assert.ok(blockers.find((b) => b.code === 'materials'), 'an empty store is not a board');
});

test('…and a spray colour with no board behind it is still not a board', () => {
  const design = {
    ...DESIGN,
    colour: { front: { hex: '#7b1e26', name: 'RAL 3005', system: 'RAL' } },
    finish: { front: 'egger:H1180_37' },
  };
  const { blockers } = wizardStartBlockers(gateArgs(design));
  assert.ok(blockers.find((b) => b.code === 'materials'), 'turn 32’s whole point');
});

test('the wizard’s own select still opens the gate, exactly as it did', () => {
  const design = {
    ...DESIGN,
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  };
  const { blockers, materials } = wizardStartBlockers(gateArgs(design));
  assert.equal(materials.all, true);
  assert.equal(blockers.find((b) => b.code === 'materials'), undefined);
  assert.equal(materials.carcass[0].via, 'slot');
});

test('every existing caller gets the answer it always got — the argument is optional', () => {
  const design = { ...DESIGN, carcass: { types: [{ id: 'c1', material_id: 'x' }] } };
  const two = materialsAssigned(design, P);
  const three = materialsAssigned(design, P, null);
  assert.deepEqual(two, three);
  assert.equal(two.carcass[0].assigned, true);
  assert.equal(two.fronts[0].assigned, false);
});

// ═══ WHAT WAS ADDED ═════════════════════════════════════════════════════════

test('an Assign Materials board OPENS the gate — one system, not two', () => {
  const assignments = { base: { carcase_side: { material_id: 'egger_white' }, door: { material_id: 'sprayed' } } };
  const { blockers, materials } = wizardStartBlockers(gateArgs(DESIGN, assignments));
  assert.equal(materials.all, true, 'the boards ARE chosen — in the other place');
  assert.equal(blockers.find((b) => b.code === 'materials'), undefined);
  assert.equal(materials.carcass[0].via, 'assignments');
  assert.equal(materials.fronts[0].via, 'assignments');
});

test('half an answer is still a block', () => {
  // A carcass board and no front board: the front slot still holds it shut.
  const half = wizardStartBlockers(gateArgs(DESIGN, { base: { carcase_side: { material_id: 'egger' } } }));
  const hit = half.blockers.find((b) => b.code === 'materials');
  assert.ok(hit);
  assert.match(hit.message, /Front 1/);
  assert.ok(!/Carcass 1/.test(hit.message), 'the carcass is answered and must not be named');
});

test('an assignment row with no material behind it is not an answer', () => {
  const started = { base: { carcase_side: { yield: 1.2, category: 'board' }, door: { material_id: '' } } };
  const { blockers } = wizardStartBlockers(gateArgs(DESIGN, started));
  assert.ok(blockers.find((b) => b.code === 'materials'));
});

test('the slot wins where both answer — `via` says which', () => {
  const design = { ...DESIGN, carcass: { types: [{ id: 'c1', material_id: 'from_the_wizard' }] } };
  const m = materialsAssigned(design, P, { base: { carcase_side: { material_id: 'from_assign' } } });
  assert.equal(m.carcass[0].via, 'slot');
  assert.equal(m.carcass[0].assigned, true);
});

test('the OTHER blockers are untouched by any of this', () => {
  const tall = { ...DESIGN, projectType: 'wardrobe' };
  const withBoards = { base: { carcase_side: { material_id: 'a' }, door: { material_id: 'b' } } };
  const { blockers } = wizardStartBlockers({
    design: tall, heights: projectHeights(tall, P), roomHeight: 1000, profile: P, assignments: withBoards,
  });
  assert.ok(blockers.find((b) => b.code === 'over-ceiling'), 'a wardrobe taller than the room still blocks');
  assert.equal(blockers.find((b) => b.code === 'materials'), undefined);
});

// ═══ EXPORT CNC WARNS — AND DOES NOT BLOCK ══════════════════════════════════

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}
const WARDROBE = cabinet('WARDROBE', { doors: true, plinth: true, shelves: 2 });

test('the CNC warning FIRES when a cut part has no board', () => {
  const msg = cncAssignmentWarning([WARDROBE], { assignments: null, profile: P });
  assert.ok(msg, 'a cut file for a board nobody has chosen must say so');
  assert.match(msg, /cut parts have no board assigned/);
  assert.match(msg, /the file will be cut, but nobody has said what from/);
});

test('…it names the parts, and counts the rest rather than listing forty', () => {
  const msg = cncAssignmentWarning([WARDROBE], { assignments: null, profile: P });
  assert.match(msg, /Carcase sides/);
  assert.match(msg, /and \d+ more/);
});

test('…it is a SENTENCE, not a refusal — the caller carries on', () => {
  // The contract is `string | null`. There is deliberately no `blocked` flag,
  // no thrown error and no held-out panel list: this informs, it never fixes
  // and it never holds a board back. The one thing that does is the export
  // gate, which is a different mechanism with its own "Export anyway".
  const msg = cncAssignmentWarning([WARDROBE], { assignments: null, profile: P });
  assert.equal(typeof msg, 'string');
  assert.equal(cncAssignmentWarning([], {}), null);
});

test('…and it goes SILENT once every cut part has a board', () => {
  const base = {};
  for (const id of ['carcase_side', 'carcase_horizontal', 'back', 'shelf', 'door', 'plinth', 'partition']) {
    base[id] = { material_id: 'egger_white' };
  }
  assert.equal(cncAssignmentWarning([WARDROBE], { assignments: { base }, profile: P }), null);
});

test('a missing HINGE product does not warn a DXF — a machine cuts board', () => {
  const base = {};
  for (const id of ['carcase_side', 'carcase_horizontal', 'back', 'shelf', 'door', 'plinth', 'partition']) {
    base[id] = { material_id: 'egger_white' };
  }
  // Hinges, legs, pins, screws and edging are all still unassigned here…
  const msg = cncAssignmentWarning([WARDROBE], { assignments: { base }, profile: P });
  assert.equal(msg, null, 'a purchasing gap is not a cutting gap');
});

test('nothing drawn, nothing to warn about', () => {
  assert.equal(cncAssignmentWarning([], { assignments: null, profile: P }), null);
  assert.equal(cncAssignmentWarning(null, {}), null);
});
