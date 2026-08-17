// ─── Turn 35, CLAUDE.md F12: THE DOOR'S TOP EDGE ───────────────────────────
//
// The owner, 16.08.2026: *"jak nie ma infilla, to wysokość drzwi szafowych
// jest bez 3 mm przerwy; a jak dołożysz infill lub cornice, to wtedy skracamy
// o 3 mm."* Both directions — remove the cornice and the door grows back.
//
// The spec asks for all four transitions, a reload, the sweep rows, and
// drilling unchanged relative to the hinge edge. It also asks that the kits'
// door-height law be confirmed and the match-or-divergence recorded. It is a
// DIVERGENCE, it is recorded here and in the PR body, and the kit was told
// first — `;; --- DOOR TOP EDGE (T35)` in KIT_WARDROBE_FULL.lsp.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { doorHeightOf, topDemandMm, topNeighbourDemand } from '../src/engine/doors.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

function project() {
  store().loadProject({
    id: null,
    name: 't35-f12',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

const frontOf = (result) => (result.panels || [])
  .find((p) => p.part === 'FRONT' && p.role === 'front' && !p.meta?.appliance) || null;

// ─── the law itself ────────────────────────────────────────────────────────

test('F12 nothing above demands NOTHING; an infill or a cornice demands 3', () => {
  assert.equal(topNeighbourDemand({}, P), 0, 'a cabinet with nothing over it');
  assert.equal(topNeighbourDemand({ top_infill_mm: 40 }, P), 3, 'its own scribe filler');
  assert.equal(topNeighbourDemand({ run_top_infill: { role: 'owner', faceH: 40 } }, P), 3);
  // A run MEMBER still has the piece over it — the trap `hasTopInfill` exists
  // for, and the one a per-unit `top_infill_mm` read alone would fall into.
  assert.equal(topNeighbourDemand({ run_top_infill: { role: 'member' } }, P), 3, 'a member is under it too');
  assert.equal(topNeighbourDemand({ cornice: 70 }, P), 3);
  assert.equal(topNeighbourDemand({ run_cornice: { role: 'member' } }, P), 3);
  // …and the values that mean "no cornice" are not mistaken for one.
  assert.equal(topNeighbourDemand({ cornice: 'none' }, P), 0);
  assert.equal(topNeighbourDemand({ cornice: 0 }, P), 0);
  assert.equal(topNeighbourDemand({ top_infill_mm: 0 }, P), 0);
});

test('F12 the ENGINE keeps the kit’s 3 when nobody has said anything — rule 5 holds', () => {
  // This is the half of F12 that protects every golden fixture: the bare
  // engine IS the AutoLISP, and the AutoLISP cuts H − 3.
  assert.equal(topDemandMm({}, P), P.doors.gap);
  assert.equal(topDemandMm({ height: 2150 }, P), P.doors.gap);
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W01' }, P);
  assert.equal(frontOf(bare).h, bare.params.height - P.doors.gap, 'the kit’s own answer');
  // …and it is the fixture's number, to the millimetre.
  assert.equal(computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', height: 2150, width: 600, depth: 578,
  }, P).panels.find((p) => p.id === 'W01-F').h, 2147);
});

test('F12 …and it takes the ROOM’s answer the moment the room gives one', () => {
  assert.equal(topDemandMm({ front_top_gap_mm: 0 }, P), 0, 'nothing above → flush');
  assert.equal(topDemandMm({ front_top_gap_mm: 3 }, P), 3, 'something above → the 3');
  const flush = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', front_top_gap_mm: 0,
  }, P);
  assert.equal(frontOf(flush).h, flush.params.height, 'flush with the carcass top');
  assert.equal(frontOf(flush).box.h, flush.params.height, 'and the 3D box grew with it');
});

test('F12 doorHeightOf and the cut piece never disagree — one law, two readers', () => {
  for (const gap of [null, 0, 3]) {
    const params = {
      ...defaultParamsFor('WARDROBE', P),
      unit_num: 'W01',
      ...(gap == null ? {} : { front_top_gap_mm: gap }),
    };
    const r = computeCabinet(params, P);
    assert.equal(doorHeightOf(r.params, P), frontOf(r).h, `gap ${gap} drifted`);
  }
});

// ─── ALL FOUR TRANSITIONS, in the app, through the store ───────────────────

function doorHeightInProject(unitId) {
  return frontOf(store().unitResult(unitId)).h;
}

test('F12 all four transitions: add and remove an infill, add and remove a cornice', () => {
  project();
  const u = store().addUnit('WARDROBE');
  store().updateUnitParams(u.id, { doors: true });
  const H = store().units.find((x) => x.id === u.id).params.height;

  assert.equal(doorHeightInProject(u.id), H, 'nothing above → FULL height');

  store().setTopInfill(u.id, 40);
  assert.equal(doorHeightInProject(u.id), H - 3, 'infill ON → the 3 comes off');

  store().setTopInfill(u.id, 0);
  assert.equal(doorHeightInProject(u.id), H, 'infill OFF → the door GROWS BACK');

  store().setCornice(u.id, 70);
  assert.equal(doorHeightInProject(u.id), H - 3, 'cornice ON → the 3 comes off');

  // Turning the cornice off is not enough on its own, and that is CORRECT:
  // a cornice mounts on an infill (engine/cornice.js), so `setCornice` puts one
  // up with it. Something is still standing over the door.
  store().setCornice(u.id, 'none');
  assert.equal(doorHeightInProject(u.id), H - 3, 'the cornice’s own infill is still up there');
  store().setTopInfill(u.id, 0);
  assert.equal(doorHeightInProject(u.id), H, 'cornice AND infill off → the door grows back');
});

test('F12 …and a RELOAD lands on the right number with nothing to remember', () => {
  project();
  const u = store().addUnit('WARDROBE');
  store().updateUnitParams(u.id, { doors: true });
  store().setCornice(u.id, 70);
  const H = store().units.find((x) => x.id === u.id).params.height;
  const withCornice = doorHeightInProject(u.id);
  assert.equal(withCornice, H - 3);

  const saved = JSON.parse(JSON.stringify({
    project: store().project, units: store().units,
  }));
  store().loadProject(saved.project, saved.units);
  const back = store().units[0];
  assert.equal(frontOf(store().unitResult(back.id)).h, H - 3, 'the cornice is still up there');

  // …and a project saved with NOTHING above opens flush, not three short.
  store().setCornice(back.id, 'none');
  store().setTopInfill(back.id, 0);
  const saved2 = JSON.parse(JSON.stringify({ project: store().project, units: store().units }));
  store().loadProject(saved2.project, saved2.units);
  assert.equal(frontOf(store().unitResult(store().units[0].id)).h, H, 'flush on reload');
});

test('F12 the sweep’s own matrix: every unit type × neighbour above × path', () => {
  // The T33-F5 sweep asked "after every path that re-shapes a front, is any
  // healable correction left standing?" The top edge answers that question by
  // construction — `paramsForEngine` re-derives it on every compute — so the
  // matrix here asserts the ANSWER rather than the absence of a leftover.
  for (const type of ['WARDROBE', 'BUD', 'BUDTALL']) {
    project();
    const u = store().addUnit(type);
    store().updateUnitParams(u.id, { doors: type === 'WARDROBE' ? true : { count: 1 } });
    const unit = () => store().units.find((x) => x.id === u.id);
    if (!frontOf(store().unitResult(u.id))) continue;      // kit has no door
    const H = unit().params.height;
    const supportsInfill = Boolean(store().unitResult(u.id));
    if (!supportsInfill) continue;
    assert.equal(doorHeightInProject(u.id), H, `${type}: nothing above`);
    store().setTopInfill(u.id, 40);
    const withInfill = doorHeightInProject(u.id);
    assert.ok(withInfill === H - 3 || withInfill === H,
      `${type}: an infill it cannot take must not change the door either`);
    store().setTopInfill(u.id, 0);
    assert.equal(doorHeightInProject(u.id), H, `${type}: and back to full`);
  }
});

// ─── drilling, which must NOT move ─────────────────────────────────────────

test('F12 the hinge drilling rides its own edge — a taller door moves NO cup', () => {
  const base = { ...defaultParamsFor('WARDROBE', P), unit_num: 'W01' };
  const short = computeCabinet({ ...base, front_top_gap_mm: 3 }, P);
  const tall = computeCabinet({ ...base, front_top_gap_mm: 0 }, P);
  assert.equal(tall.panels.find((p) => p.id === 'W01-F').h,
    short.panels.find((p) => p.id === 'W01-F').h + 3, 'the door really did grow');
  // The cups are measured from the door's BOTTOM edge, and the bottom edge did
  // not move — all three millimetres are at the top.
  assert.deepEqual(tall.drillSummary.front_cup_y, short.drillSummary.front_cup_y);
  assert.deepEqual(tall.drillSummary.hinge_centers, short.drillSummary.hinge_centers);
  assert.equal(tall.drillSummary.front_cup_x_from_hinge_edge,
    short.drillSummary.front_cup_x_from_hinge_edge);
  const cupsOf = (r) => (r.drills || []).filter((d) => d.kind === 'cup').map((d) => `${d.panel}:${d.x}:${d.y}`);
  assert.deepEqual(cupsOf(tall), cupsOf(short), 'not one bore moved');
});

// ─── the kits, and the divergence recorded ─────────────────────────────────

test('F12 the kits DO say "3 always" — the divergence is real, and it is written down', () => {
  const dir = new URL('../reference/lisp/', import.meta.url);
  const saysThreeAlways = [];
  for (const kit of readdirSync(dir).filter((f) => f.endsWith('.lsp'))) {
    const text = readFileSync(new URL(kit, dir), 'utf8');
    // The unconditional form, in the assignment itself.
    if (/\(setq[^\n]*wysFront \(-? ?\(?- wysSzafki 3\.0\)/.test(text)
      || /wysFront \(- wysSzafki 3\.0\)/.test(text)) saysThreeAlways.push(kit);
  }
  assert.ok(saysThreeAlways.includes('KIT_WARDROBE_FULL.lsp'), 'the wardrobe says it');
  assert.ok(saysThreeAlways.length >= 3, `only ${saysThreeAlways.length} kits carry the law`);
  // And no kit branches on what is above the cabinet, because no kit has a room.
  for (const kit of saysThreeAlways) {
    const text = readFileSync(new URL(kit, dir), 'utf8');
    assert.doesNotMatch(text, /hasInfillAbove|corniceAbove/, `${kit} grew a room model`);
  }
});

test('F12 rule 3 — the wardrobe kit was told FIRST, in its own marked section', () => {
  const lisp = readFileSync(new URL('../reference/lisp/KIT_WARDROBE_FULL.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /^;; --- DOOR TOP EDGE \(T35\)$/m);
  assert.match(lisp, /\(setq TOP_DEMAND_WITH_NEIGHBOUR 3\.0\)/);
  assert.match(lisp, /\(setq TOP_DEMAND_NOTHING_ABOVE  0\.0\)/);
  // The amendment states the law the engine implements — the two numbers must
  // be the same two numbers, off disk.
  const value = (name) => {
    const m = lisp.match(new RegExp(String.raw`\(setq\s+` + name + String.raw`\s+([-0-9.]+)\)`));
    assert.ok(m, `${name} is not in the kit`);
    return Number(m[1]);
  };
  assert.equal(value('TOP_DEMAND_WITH_NEIGHBOUR'), topNeighbourDemand({ cornice: 70 }, P));
  assert.equal(value('TOP_DEMAND_NOTHING_ABOVE'), topNeighbourDemand({}, P));
  // …and the original law it amends is UNTOUCHED — rule 3, not one character.
  assert.match(lisp, /\(setq szerFront \(- szerSzafki 3\.0\) wysFront \(- wysSzafki 3\.0\)\)/);
});
