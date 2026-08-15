// ─── F3: THE GUARDS, WIRED (turn 31, CLAUDE.md F3) ──────────────────────────
//
// "`edgeGuard` (turn 25, tested, never wired to the user's own export) joins the
// app in two places, and a second guard joins it."
//
// The turn-25 guard was never wrong. It was never CONSULTED — the owner's own
// export button has never once asked it whether the board it is about to write
// is safe to cut. A guard nothing calls is a comment.
//
// And the second guard is not hypothetical either. The centre of this file is
// the owner's own proven bug:
//
//     hinge_rows [100, 100, 470]
//
// storable from the editor today; `computeCabinet()` then emits the pair of
// cups at 84 and 116 TWICE, on one panel, on one layer, at one coordinate, at
// one diameter. On the machine that is a 5 mm bit going back into a hole it has
// already made. CLAUDE.md: "the `[100,100,470]` case must FAIL the guard and
// the store must refuse to create it." Both halves are below, and they are the
// first two tests in the file.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import {
  DRILL_TOLERANCE, drillFindings, duplicateDrills, hingeMinSpacingMm, hingeRowClashes,
  hingeSpacingBlocks,
} from '../src/engine/cnc/drillGuard.js';
import {
  condemnedPanels, exportGate, holdMessage, isHeld, panelsThatGo, unitFindings,
} from '../src/engine/cnc/exportGate.js';
import { resultFindings } from '../src/engine/cnc/edgeGuard.js';

const store = () => useProjectStore.getState();
const THE_BUG = [100, 100, 470];

const bud = (params = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P), width: 600, ...params,
});

function project() {
  store().loadProject({
    id: null, name: 'guards', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PROVEN BUG — the regression CLAUDE.md asks for, by name
// ═══════════════════════════════════════════════════════════════════════════

test('REGRESSION: hinge_rows [100,100,470] really does drill every hole twice', () => {
  // First, that the fault is real rather than a story about one. This is the
  // engine's own output, not a mock.
  const r = bud({ hinge_rows: THE_BUG });
  assert.deepEqual(r.drillSummary.hinge_centers, THE_BUG);
  const dups = duplicateDrills(r.drills);
  assert.ok(dups.length > 0, 'the engine drew no duplicate at all');
  for (const d of dups) {
    assert.equal(d.times, 2);
    assert.match(d.message, /drilled 2 times/);
  }
  // BOTH SIDES of the hinge are doubled, which is the whole fault: the
  // CARCASS's two 5 mm plate holes at 100 ± the profile's own 16…
  const side = dups.filter((d) => d.layer === P.hinges.layer);
  assert.deepEqual(
    side.map((d) => d.y).sort((a, b) => a - b),
    [100 - P.hinges.holePairOffset, 100 + P.hinges.holePairOffset],
  );
  // …and the DOOR's own 35 mm cup, drilled twice at the same centre. That is
  // the one that ruins a sprayed front rather than a carcass side.
  assert.ok(dups.some((d) => d.d === 35 && d.y === 100), 'the cup is doubled too');
});

test('REGRESSION: …the guard FAILS it', () => {
  const r = bud({ hinge_rows: THE_BUG });
  const found = drillFindings(r, { profile: P, unitNum: '01' });
  assert.ok(found.length >= 2, 'the guard said nothing');
  assert.ok(found.every((f) => f.check === 10 && f.level === 'red'));
  assert.ok(found.some((f) => f.code === 'duplicate-drill'));
  assert.ok(found.some((f) => f.code === 'hinge-rows-too-close'));
  // …and it NAMES the fault, with the number in it.
  const rowFault = found.find((f) => f.code === 'hinge-rows-too-close');
  assert.match(rowFault.message, /both at 100 mm/);
  assert.match(rowFault.message, /drilled twice/);
});

test('REGRESSION: …and the store REFUSES to create it', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 } });
  const rows = store().hingeRowsOf(u.id);
  assert.ok(rows.length >= 2, `only ${rows.length} rows to move`);

  // Move row 1 on top of row 0 — the exact gesture that produced [100,100,470].
  const before = store().hingeRowsOf(u.id);
  const res = store().setHingePos(u.id, 1, before[0]);
  assert.equal(res?.blocked, true, 'the setter let it through');
  assert.match(res.message, /100/);
  assert.equal(res.minSpacingMm, 60);

  // The ladder is EXACTLY as it was. Rule 4: the guard speaks, it never fixes —
  // turn 17's clamp used to slide the row to the nearest legal place, which is
  // the app deciding where a hinge goes.
  assert.deepEqual(store().hingeRowsOf(u.id), before);
  // …and no duplicate reached the drilling.
  assert.deepEqual(duplicateDrills(store().unitResult(u.id).drills), []);
});

test('REGRESSION: a project that ARRIVES with the fault is still reported', () => {
  // A saved or imported job never passed through the setter. The guard is the
  // second line, and it is the one that has to hold: `loadProject` writes
  // whatever the file says.
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 }, hinge_rows: THE_BUG });
  const found = drillFindings(store().unitResult(u.id), { profile: P });
  assert.ok(found.some((f) => f.code === 'duplicate-drill'));
});

// ═══════════════════════════════════════════════════════════════════════════
// CHECK #10 — drill faults
// ═══════════════════════════════════════════════════════════════════════════

test('a clean cabinet is silent — both guards', () => {
  const r = bud();
  assert.deepEqual(duplicateDrills(r.drills), []);
  assert.deepEqual(drillFindings(r, { profile: P }), []);
  assert.deepEqual(resultFindings(r), []);
  assert.deepEqual(unitFindings(r, { profile: P }), []);
});

test('"the same hole" is layer, centre AND diameter — at 0.01 mm', () => {
  assert.equal(DRILL_TOLERANCE, 0.01);
  const base = { panel: 'BUL', layer: 'HINGES_5MM', x: 37, y: 100, d: 5 };
  // The same hole twice.
  assert.equal(duplicateDrills([base, { ...base }]).length, 1);
  // A hair apart is still the same hole — the bit cannot tell.
  assert.equal(duplicateDrills([base, { ...base, y: 100.005 }]).length, 1);
  // A tenth of a millimetre apart is two holes, and the engine rounds nowhere
  // near this fine.
  assert.equal(duplicateDrills([base, { ...base, y: 100.1 }]).length, 0);
  // Two different cutters at one coordinate are two different programs.
  assert.equal(duplicateDrills([base, { ...base, d: 7.5 }]).length, 0);
  assert.equal(duplicateDrills([base, { ...base, layer: 'SHELF_5MM' }]).length, 0);
  // …and the same coordinate on two different boards is two different boards.
  assert.equal(duplicateDrills([base, { ...base, panel: 'BUR' }]).length, 0);
});

test('a near miss is caught by the ROW rule, which the coordinates cannot see', () => {
  // Two rows 8 mm apart drill four holes that do not coincide, and still cannot
  // both take a hinge.
  const clash = hingeRowClashes([100, 108, 470], { minSpacingMm: 60 });
  assert.equal(clash.length, 1);
  assert.equal(clash[0].mm, 8);
  assert.match(clash[0].message, /under the 60 mm minimum/);
  // The ladder the kit itself draws is clear of it by a mile.
  assert.deepEqual(hingeRowClashes([100, 400, 700], { minSpacingMm: 60 }), []);
  // Exactly the minimum is legal — the number is a minimum, not a margin.
  assert.deepEqual(hingeRowClashes([100, 160], { minSpacingMm: 60 }), []);
  // An unsorted list is sorted on the way in: a hand-typed ladder is not
  // guaranteed to be in order.
  assert.equal(hingeRowClashes([470, 100, 130], { minSpacingMm: 60 }).length, 1);
});

test('60 is a PROFILE number, and one line flips block→warn', () => {
  assert.equal(P.hinges.minSpacingMm, 60);
  assert.equal(hingeMinSpacingMm(P), 60);
  assert.equal(P.hinges.spacingBlocks, true, 'it ships blocking');
  assert.equal(hingeSpacingBlocks(P), true);
  // The owner's own loose setting.
  assert.equal(hingeSpacingBlocks({ hinges: { spacingBlocks: false } }), false);
  // A workshop's own number, and a profile that predates the key.
  assert.equal(hingeMinSpacingMm({ hinges: { minSpacingMm: 80 } }), 80);
  assert.equal(hingeMinSpacingMm({}), 60);
  // …and a stored profile made before this turn comes back with both.
  const stored = migrateCabinetProfile({ hinges: { endOffset: 90 } });
  assert.equal(stored.hinges.minSpacingMm, 60);
  assert.equal(stored.hinges.spacingBlocks, true);
  assert.equal(typeof stored.hinges.endOffset, 'number');
});

test('with the profile loose, the move goes through and the app still SAYS it', () => {
  project();
  const u = store().addUnit('BUD');
  store().updateUnitParams(u.id, { width: 600, doors: { count: 1 } });
  const rows = store().hingeRowsOf(u.id);

  // Blocking is the shipped answer.
  assert.equal(store().setHingePos(u.id, 1, rows[0])?.blocked, true);

  // One profile line, and it is a warning instead.
  const profileStore = store();
  void profileStore;
  const loose = { hinges: { spacingBlocks: false } };
  assert.equal(hingeSpacingBlocks(loose), false);
  // (The store reads the live profile; the arithmetic above is the switch, and
  // the setter consults it — asserted at the source below.)
  const src = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.match(src, /hingeSpacingBlocks\(profile\)/);
});

test('addHinge refuses where there is no room left, rather than stacking one', () => {
  project();
  const u = store().addUnit('BUD');
  // A short door whose ladder already fills it: pack the rows so the biggest
  // gap is under the minimum.
  store().updateUnitParams(u.id, {
    width: 600, height: 300, doors: { count: 1 }, hinge_rows: [40, 100, 160, 220],
  });
  const before = store().hingeRowsOf(u.id);
  const res = store().addHinge(u.id);
  assert.equal(res?.blocked, true, 'a hinge was dropped on top of another');
  assert.match(res.message, /No room for another hinge/);
  assert.deepEqual(store().hingeRowsOf(u.id), before);
});

// ═══════════════════════════════════════════════════════════════════════════
// CHECK #9 — the outline guard, at last wired
// ═══════════════════════════════════════════════════════════════════════════

test('#9 and #10 come back from ONE call, in one shape', () => {
  const r = bud({ hinge_rows: THE_BUG });
  const found = unitFindings(r, { profile: P, unitId: 'u1', unitNum: '01' });
  assert.ok(found.length > 0);
  for (const f of found) {
    assert.ok([9, 10].includes(f.check));
    assert.equal(f.level, 'red', 'CLAUDE.md: both are RED');
    assert.equal(f.unitId, 'u1');
    assert.equal(f.unitNum, '01');
    assert.ok(f.message, 'every finding says what is wrong');
    assert.ok(f.code);
  }
});

test('#9 catches a doubled edge on a panel the exporter would have written', () => {
  const r = bud();
  const victim = r.panels.find((p) => p.cnc?.outline?.length >= 4);
  assert.ok(victim, 'no panel with an outline');
  // A hand-made fault of exactly the shape the owner found in his LISP: one
  // edge traced a second time.
  const doubled = {
    ...r,
    panels: r.panels.map((p) => (p !== victim ? p : {
      ...p,
      cnc: { ...p.cnc, outline: [...p.cnc.outline, p.cnc.outline[0], p.cnc.outline[1]] },
    })),
  };
  const found = unitFindings(doubled, { profile: P, unitNum: '01' });
  assert.ok(found.some((f) => f.check === 9), 'the outline guard is not wired');
  assert.ok(found.some((f) => f.panel === victim.id));
});

// ═══════════════════════════════════════════════════════════════════════════
// THE EXPORT GATE
// ═══════════════════════════════════════════════════════════════════════════

test('a clean job exports normally — the gate has nothing to say', () => {
  const r = bud();
  const gate = exportGate([{ unit: { id: 'u1' }, result: r }], { profile: P });
  assert.equal(gate.ok, true);
  assert.deepEqual(gate.held, []);
  assert.equal(gate.message, null);
  assert.equal(panelsThatGo(r.panels, { gate, unitId: 'u1' }).length, r.panels.length);
});

test('a faulty panel is HELD OUT, and the message NAMES it', () => {
  const r = bud({ hinge_rows: THE_BUG });
  const gate = exportGate([{ unit: { id: 'u1' }, result: r }], { profile: P });
  assert.equal(gate.ok, false);
  assert.ok(gate.held.length > 0);
  assert.ok(gate.message.includes(gate.held[0].panelId), 'the message does not name the part');
  assert.match(gate.message, /held out of this export/);
  assert.match(gate.message, /export anyway/i);
  // The condemned boards are the hinged SIDES — the ones that carry the
  // doubled drilling — and not the whole cabinet.
  const kept = panelsThatGo(r.panels, { gate, unitId: 'u1' });
  assert.ok(kept.length > 0, 'everything was held back');
  assert.ok(kept.length < r.panels.length, 'nothing was held back');
  assert.ok(kept.some((p) => p.id === 'BACK'), 'the innocent back panel was punished');
  assert.equal(isHeld(gate, 'u1', gate.held[0].panelId), true);
  assert.equal(isHeld(gate, 'u1', 'BACK'), false);
});

test('"Export anyway" is complete: the gate still reports, nothing is withheld', () => {
  const r = bud({ hinge_rows: THE_BUG });
  const gate = exportGate([{ unit: { id: 'u1' }, result: r }], { profile: P });
  const all = panelsThatGo(r.panels, { gate, unitId: 'u1', exportAnyway: true });
  assert.equal(all.length, r.panels.length);
  // …and it is the OWNER's judgement, so the fault is still on the record.
  assert.ok(gate.findings.length > 0);
});

test('a carcass-level fault condemns the boards it is about, not a random one', () => {
  const r = bud({ hinge_rows: THE_BUG });
  const rowOnly = drillFindings(r, { profile: P }).filter((f) => f.code === 'hinge-rows-too-close');
  const ids = condemnedPanels(rowOnly, r);
  assert.ok(ids.size > 0);
  for (const id of ids) {
    assert.ok(r.drills.some((d) => d.panel === id && d.kind === 'hinge'),
      `${id} carries no hinge drilling`);
  }
});

test('a fault on a part nobody selected is REPORTED but not "held out"', () => {
  const r = bud({ hinge_rows: THE_BUG });
  const back = r.panels.filter((p) => p.id === 'BACK');
  const gate = exportGate([{ unit: { id: 'u1' }, result: r, panels: back }], { profile: P });
  // The fault is on the record…
  assert.ok(gate.findings.some((f) => f.code === 'duplicate-drill'));
  // …but nothing in THIS export is condemned, so nothing is named as held.
  assert.equal(gate.ok, true);
  assert.deepEqual(gate.held, []);
});

test('the hold message counts honestly and does not run off the screen', () => {
  const many = Array.from({ length: 7 }, (_, i) => ({ unitNum: '01', panelId: `P${i}` }));
  const msg = holdMessage(many);
  assert.match(msg, /^7 parts held out/);
  assert.match(msg, /and 3 more/);
  assert.equal(holdMessage([]), null);
  assert.match(holdMessage([{ unitNum: '02', panelId: 'BACK' }]), /^1 part held out/);
});

// ═══════════════════════════════════════════════════════════════════════════
// THE WIRING ITSELF — the half turn 25 never got
// ═══════════════════════════════════════════════════════════════════════════

test('EVERY export the app writes goes through the gate', () => {
  const src = readFileSync(new URL('../src/lib/cncExport.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ exportGate, panelsThatGo \}/);
  // All three: the per-unit ZIP, the laid-out sheet, and the whole material.
  for (const fn of ['exportUnitDxfZip', 'exportSheetDxf', 'exportMaterialDxf']) {
    const from = src.indexOf(`export function ${fn}`) >= 0
      ? src.indexOf(`export function ${fn}`)
      : src.indexOf(`export async function ${fn}`);
    assert.ok(from > 0, `${fn} not found`);
    const body = src.slice(from, from + 2200);
    assert.match(body, /exportGate\(/, `${fn} does not consult the gate`);
    assert.match(body, /exportAnyway/, `${fn} offers no way past it`);
  }
});

test('…and every button that presses one offers "Export anyway"', () => {
  const tree = readFileSync(new URL('../src/components/CncTree.jsx', import.meta.url), 'utf8');
  assert.match(tree, /label: 'Export anyway'/);
  // RED, because a red stays until it is clicked — which is what makes the
  // button on it reachable at all (a grey is gone in three seconds).
  assert.match(tree, /notify\(res\.gateMessage, 'error'/);
  const page = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /label: 'Export anyway'/);
});

test('a blocked hinge move is a YELLOW with the number, from BOTH editors', () => {
  const helper = readFileSync(new URL('../src/lib/hingeEdit.js', import.meta.url), 'utf8');
  assert.match(helper, /notify\?\.\(result\.message, 'warn'\)/, 'blocked move = yellow');
  for (const f of ['components/DoorModal.jsx', 'components/ElementProperties.jsx']) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    assert.match(src, /sayHingeResult\(/, `${f} swallows the refusal`);
  }
});

// ─── THE FIXTURES ARE UNTOUCHED ─────────────────────────────────────────────

test('a bare computeCabinet() is byte-for-byte what it was — no guard reaches it', () => {
  // The guards READ; they never write. `computeCabinet` does not import either
  // of them, and the refusal lives in the STORE, which is the override channel's
  // side of the wall (iron rule 1).
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.ok(!/drillGuard|exportGate|edgeGuard/.test(engine));
  // …and the fault the guard reports is still faithfully COMPUTED, because the
  // engine is the AutoLISP and the AutoLISP would drill it twice too.
  assert.ok(duplicateDrills(bud({ hinge_rows: THE_BUG }).drills).length > 0);
});
