// ─── CHAT FIX 17.10.2026 (the second of the day): DRAWERS AND SLEEVES ───────
//
// The owner, 09:45 to 09:56:
//   *"prowadnice mamy co 50, i kazda szuflada o 10 mm mniejsza"*; told Blum
//   makes the 270, the 320 and the 380: *"zostaw, tylko pamietaj ze wszedzie
//   szuflada musi miec 10 mm mniej od prowadnicy"*
//   *"jak mamy kolizje zawias polka ... zeby po nacisnieciu remove sleeve
//   ten jeden rzad sleeve usunac ale nie wszystkie 3 rzedy tylko ten jeden
//   ktory koliduje"*; asked whether on both sides: *"symetrycznie, przeciez
//   polka nie moze wisiec na jednej stronie"*
//   and on a cabinet wholly in a recess: *"zostaw jak jest"* (the drawers
//   follow the deeper carcass), *"upewnij sie tylko ze polka bedzie wieksza,
//   ze dojdzie do konca pola ponad szufladami"*.
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet, sleevesDroppedOf } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { getCabinetProfile, migrateCabinetProfile, DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import { runnerAskFor, ladderRungFor, runnerLadder } from '../src/engine/runners.js';
import { shelfHingeClashes } from '../src/engine/shelfHingeClash.js';
import { shelfHingeFindings } from '../src/engine/checks.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const P = getCabinetProfile();
const SH = P.shelfHoles;
const store = () => useProjectStore.getState();
const freshProject = () => store().loadProject({
  id: null, name: 'chatfix-1710b', design: {},
  room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
}, []);
const sleeveHoles = (r) => r.drills.filter((d) => d.layer === SH.layer);

// ─── THE DRAWER LAW: THE BOX IS THE RUNNER LESS TEN, EVERYWHERE ─────────────

test('the two ladders are one law: every box step is a rung less ten, the short Blum lengths included', () => {
  const ladder = runnerLadder(P);
  assert.deepEqual(ladder, [250, 270, 300, 320, 350, 380, 400, 450, 500, 550, 600, 650, 700]);
  assert.deepEqual(P.wardrobe.drawers.depthSteps, ladder.map((nl) => nl - 10));
  for (const step of P.wardrobe.drawers.depthSteps) {
    const ask = runnerAskFor(step, P);
    assert.equal(ask, step + 10);
    assert.equal(ladderRungFor(ask, P), ask, `box ${step} takes exactly NL ${ask}`);
  }
});

test('a 500 deep kitchen drawer unit: boxes 440 on NL 450 (as before); a 500 deep wardrobe\'s internal drawers: 370 on NL 380 (was 380 on a 350)', () => {
  const budr = computeCabinet({ ...defaultParamsFor('BUDR', P), depth: 500 }, P);
  const side = budr.panels.find((p) => p.id === 'D1-SL');
  assert.equal(side.w, 440);
  const runner = budr.hardware.find((h) => /runner/i.test(h.label || '') && h.spec?.nl);
  assert.equal(runner.spec.nl, 450);
  const w = computeCabinet({ ...defaultParamsFor('WARDROBE', P), depth: 500, items: [{ kind: 'drawer', pos_mm: 300 }] }, P);
  const ws = w.panels.find((p) => p.id === 'D1-SL');
  assert.equal(ws.w, 370, '500 - 18 - 50 - 25 - 20 = 387 → 370, the box of the 380 runner (a rung since this day)');
  const wr = w.hardware.find((h) => /runner/i.test(h.label || '') && h.spec?.nl);
  assert.equal(wr.spec.nl, 380);
  assert.equal(wr.spec.length_mm, 370);
});

test('the deep cabinets did not move: BUDR 558 cuts 490 on NL 500, a wardrobe 568 cuts 440 on NL 450', () => {
  const budr = computeCabinet(defaultParamsFor('BUDR', P), P);
  assert.equal(budr.panels.find((p) => p.id === 'D1-SL').w, 490);
  const w = computeCabinet({ ...defaultParamsFor('WARDROBE', P), items: [{ kind: 'drawer', pos_mm: 300 }] }, P);
  assert.equal(w.panels.find((p) => p.id === 'D1-SL').w, 440);
});

test('a stored profile cannot keep T25\'s six nominals as box lengths: both ladders are rebuilt on migration', () => {
  const old = JSON.parse(JSON.stringify(DEFAULT_CABINET_PROFILE));
  old.wardrobe.drawers.depthSteps = [250, 270, 300, 320, 350, 380, 390, 440, 490, 540, 590, 640, 690];
  old.hardware.runner.movento.nominalLadder = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700];
  old.wardrobe.drawers.depthAllowance = 25;
  const m = migrateCabinetProfile(old);
  assert.deepEqual(m.wardrobe.drawers.depthSteps, DEFAULT_CABINET_PROFILE.wardrobe.drawers.depthSteps);
  assert.deepEqual(m.hardware.runner.movento.nominalLadder, DEFAULT_CABINET_PROFILE.hardware.runner.movento.nominalLadder);
  assert.equal(m.wardrobe.drawers.depthAllowance, 25, 'a workshop value beside them survives');
});

// ─── A CABINET WHOLLY IN A RECESS: "zostaw jak jest", and the shelf reaches the back ──

test('wholly in a recess the carcass is deeper and the drawers follow it ("zostaw jak jest"); the shelf above them reaches the new back', () => {
  // T79 F13 · a project's shelf stands its 10 back, handed in as paramsForEngine
  // hands it (`shelf_front_mm`): *"wszystkie cofnięcia zmień z 20 na 10 mm, 20
  // to stanowczo za dużo"*; 14:17: *"tylko półki i dividery, szuflady zostaw nie
  // ruszaj."*  The drawer box below is untouched by it.
  const project = { shelf_front_mm: P.carcass.shelfSetbackMm };
  const B = defaultParamsFor('BUDR', P);
  const r = computeCabinet({ ...B, ...project, depth: 708, depth_full: 558, recess_mm: 150, items: [{ kind: 'shelf', pos_mm: 650 }] }, P);
  assert.equal(r.panels.find((p) => p.id === 'D1-SL').w, 640, '708 - 18 - 20 = 670 → 640, the box of the 650 runner');
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  if (shelf) assert.equal(shelf.h, 708 - 18 - P.carcass.shelfSetbackMm, 'the shelf is cut to the deeper carcass');
  const W = defaultParamsFor('WARDROBE', P);
  const w = computeCabinet({ ...W, ...project, depth: W.depth + 150, depth_full: W.depth, recess_mm: 150, items: [{ kind: 'drawer', pos_mm: 300 }, { kind: 'shelf', pos_mm: 1200 }] }, P);
  const ws = w.panels.find((p) => p.part === 'SHELF');
  assert.equal(ws.h, W.depth + 150 - 18 - P.carcass.shelfSetbackMm, 'the wardrobe shelf over the drawers reaches the end of the deeper bay');
});

// ─── ONE ROW OF SLEEVES, DROPPED BY THE OWNER ───────────────────────────────

test('sleevesDroppedOf: the item\'s list, kept to the cluster, never the 0 row', () => {
  assert.deepEqual(sleevesDroppedOf({ sleeves_dropped: [50] }, SH), [50]);
  assert.deepEqual(sleevesDroppedOf({ sleeves_dropped: [50, 50, -50] }, SH), [50, -50]);
  assert.deepEqual(sleevesDroppedOf({ sleeves_dropped: [0, 32, 50] }, SH), [50], 'the seat row and a stranger are ignored');
  assert.deepEqual(sleevesDroppedOf({}, SH), []);
  assert.deepEqual(sleevesDroppedOf(null, SH), []);
});

test('the engine bores the cluster without the dropped row on BOTH sides, and publishes the shorter cluster', () => {
  const W = defaultParamsFor('WARDROBE', P);
  const plain = computeCabinet({ ...W, items: [{ kind: 'shelf', pos_mm: 900 }] }, P);
  const dropped = computeCabinet({ ...W, items: [{ kind: 'shelf', pos_mm: 900, sleeves_dropped: [50] }] }, P);
  assert.equal(sleeveHoles(plain).length, 12, 'three rows, two columns, two sides');
  assert.equal(sleeveHoles(dropped).length, 8, 'one row gone on both sides: four holes');
  assert.equal(sleeveHoles(dropped).filter((d) => d.panel === 'BUL').length, 4);
  assert.equal(sleeveHoles(dropped).filter((d) => d.panel === 'BUR').length, 4);
  assert.deepEqual(plain.drillSummary.shelf_cluster_y, [[850, 900, 950]]);
  assert.deepEqual(dropped.drillSummary.shelf_cluster_y, [[850, 900]]);
  assert.deepEqual(dropped.drillSummary.shelf_pin_row_y, [900], 'the seat row is still the row');
  // ...and nothing else moved: the same boards, the same other holes.
  assert.deepEqual(dropped.csvLines, plain.csvLines);
  assert.equal(dropped.drills.length, plain.drills.length - 4);
});

test('the clash window is derived from the rows that are bored: untouched = 71.25 (T30), one edge row dropped = 21.25 on that side', () => {
  freshProject();
  const u = store().addUnit('BUD');
  store().addDoors(u.id);
  store().addShelves(u.id, 1);
  const shelfId = store().units.find((x) => x.id === u.id).params.sections[0].items.find((i) => i.kind === 'shelf').id;
  const hinge = store().unitResult(u.id).drillSummary.hinge_centers[1];
  store().setShelfPos(u.id, shelfId, hinge - 40);
  let r = store().unitResult(u.id);
  let clashes = shelfHingeClashes({ result: r, profile: P });
  assert.equal(clashes.length, 1);
  assert.equal(clashes[0].windowMm, 71.25, 'an untouched cluster: the T30 window to the hundredth');
  assert.deepEqual(clashes[0].offendingOffsets, [50], 'the cup reaches the +50 row only');
  assert.equal(clashes[0].droppableOffset, 50);
  // The finding offers the one click first, and the T30 two by name after it.
  let f = shelfHingeFindings({ unitId: u.id, unitNum: '01', result: r, profile: P });
  assert.deepEqual(f[0].actions.map((a) => a.id), ['drop-sleeve-row', 'remove-sleeves', 'move-hinge']);
  assert.equal(f[0].actions[0].label, 'Remove the +50 mm sleeve row');
  assert.deepEqual(f[0].actions[0].subject.store, { action: 'dropSleeveRow', args: [u.id, shelfId, 50] });
  // The click (what useGoToSubject runs before it flies).
  const out = store().dropSleeveRow(u.id, shelfId, 50);
  assert.deepEqual(out, { dropped: [50] });
  r = store().unitResult(u.id);
  assert.equal(sleeveHoles(r).length, 8);
  assert.deepEqual(shelfHingeClashes({ result: r, profile: P }), [], 'a hinge 40 over the seat row is clear once the +50 row is gone');
  assert.deepEqual(shelfHingeFindings({ unitId: u.id, unitNum: '01', result: r, profile: P }), []);
  // Twice is once.
  assert.deepEqual(store().dropSleeveRow(u.id, shelfId, 50), { dropped: [50] });
  // The seat row cannot go.
  assert.match(store().dropSleeveRow(u.id, shelfId, 0).error, /the one the shelf stands on/);
  assert.match(store().dropSleeveRow(u.id, shelfId, 32).error, /not a row of the sleeve cluster/);
  // ...and the whole cluster comes back.
  assert.deepEqual(store().restoreSleeveRows(u.id, shelfId), { dropped: [] });
  assert.equal(sleeveHoles(store().unitResult(u.id)).length, 12);
});

test('when the cup reaches the seat row no single row is offered: the T30 buttons stay and the title says why', () => {
  freshProject();
  const u = store().addUnit('BUD');
  store().addDoors(u.id);
  store().addShelves(u.id, 1);
  const shelfId = store().units.find((x) => x.id === u.id).params.sections[0].items.find((i) => i.kind === 'shelf').id;
  const hinge = store().unitResult(u.id).drillSummary.hinge_centers[1];
  store().setShelfPos(u.id, shelfId, hinge - 10);
  const r = store().unitResult(u.id);
  const [c] = shelfHingeClashes({ result: r, profile: P });
  assert.deepEqual(c.offendingOffsets, [0]);
  assert.equal(c.droppableOffset, null);
  const [f] = shelfHingeFindings({ unitId: u.id, unitNum: '01', result: r, profile: P });
  assert.deepEqual(f.actions.map((a) => a.id), ['remove-sleeves', 'move-hinge']);
  assert.equal(f.actions[0].label, 'Remove sleeves at this shelf');
  assert.match(f.actions[0].title, /the row the shelf STANDS on/);
});
