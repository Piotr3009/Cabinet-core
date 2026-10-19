/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F11 · THE RAIL IS ALONE, AND IT SNAPS 50 MM UNDER A SHELF ──────────
//
// The owner, 18.10.2026: *"zlikwiduj propozycję install rail with or without
// shelf, bez sensu, usuń to; a jak będziemy instalować rail to przy
// przesuwaniu zaproponuj 50 mm poniżej półki, jak jakąś wyczuje, coś jak mamy
// teraz propozycję levelowania półek jedna obok drugiej."*
//
// Four things this file holds:
//   1. KASACJA: the toggle, its state and its hint are gone from PRO and the
//      retail copy; RAIL_MOUNTS and setRailMount are gone from the adapter and
//      the store; `addHangerRail` takes no `withShelf`.
//   2. ONE PATH ADDS A RAIL, and it adds the rod ALONE.
//   3. THE MAGNET: `moveRail` within `editor.shelfMagnetMm` of a shelf's
//      underside less `hardware.hanger.belowShelfMm` lands there and reports
//      `magnet`; Alt (and a slider's number) refuses it.
//   4. A SAVED shelf-mounted rail still loads and renders as before.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { RAIL_MOUNT, hangerDropMm, railMountOf } from '../src/engine/railAssembly.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { confirmDrawerBox } from './drawer-box-gate.js';
import { hangSavedAssembly } from './rail-assembly-saved.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const S = () => useProjectStore.getState();
const G = P.board.thickness;
const BELOW = P.hardware.hanger.belowShelfMm;
const REACH = P.editor.shelfMagnetMm;

function project() {
  S().loadProject({
    id: null, name: 't79-f11', design: {},
    room: migrateRoom({ height: 2700, corners: rectCorners(5000, 3000) }),
  }, []);
  confirmDrawerBox();
}
function wardrobe(width = 900) {
  const { id } = S().addUnit('WARDROBE');
  S().updateUnitParams(id, { width, height: 2150 });
  return id;
}
const itemsOf = (id) => S().units.find((u) => u.id === id).params.sections[0].items;

// ═══ 1. KASACJA ═════════════════════════════════════════════════════════════

test('F11 · the toggle is gone from the source, PRO and retail', () => {
  for (const rel of ['src/components/AddItems.jsx', 'src/retail/design/detail/AddItems.jsx']) {
    const add = read(rel);
    assert.doesNotMatch(add, /railWithShelf|setRailWithShelf/, `${rel}: the state is deleted`);
    assert.doesNotMatch(add, /data-rail-with-shelf|data-rail-alone=|data-rail-mode/, `${rel}: the two buttons are deleted`);
    assert.doesNotMatch(add, />\s*With a shelf\s*</, `${rel}: no "With a shelf" button`);
    assert.doesNotMatch(add, />\s*Rail alone\s*</, `${rel}: no "Rail alone" button`);
    assert.doesNotMatch(add, /data-rail-assembly-hint/, `${rel}: the hint is deleted`);
    assert.doesNotMatch(add, /withShelf/, `${rel}: nothing reaches the store`);
    assert.match(add, /Add hanger rail/, `${rel}: the one button stays`);
  }
  const store = read('src/stores/projectStore.js');
  assert.doesNotMatch(store, /withShelf/, 'the store takes no such answer');
  assert.doesNotMatch(store, /setRailMount/, 'the store\'s re-placement is deleted');
  const adapter = read('src/retail/design/adapter.js');
  assert.doesNotMatch(adapter, /RAIL_MOUNTS|setRailMount/, 'the retail labels and their setter are deleted');
  assert.equal(A.RAIL_MOUNTS, undefined);
  assert.equal(A.setRailMount, undefined);
  assert.equal(S().setRailMount, undefined);
  // The engine's shelf-mounted branch STAYS (NOT THIS TURN).
  assert.match(read('src/engine/railAssembly.js'), /export function resolveShelfMountedRail/);
});

// ═══ 2. ONE PATH, AND IT ADDS THE ROD ALONE ═══════════════════════════════════

test('F11 · addHangerRail adds the rail ALONE: one item, no shelf, unit-wide and in a column', () => {
  project();
  const id = wardrobe();
  const before = itemsOf(id).length;
  const railId = S().addHangerRail(id, { withShelf: true });
  assert.ok(railId);
  assert.equal(itemsOf(id).length - before, 1, 'one item, whatever a stale caller passes');
  const rail = itemsOf(id).find((i) => i.id === railId);
  assert.equal(rail.mount, RAIL_MOUNT.ALONE);
  assert.equal(railMountOf(rail), RAIL_MOUNT.ALONE);
  assert.equal(rail.shelf_id, undefined);
  assert.equal(itemsOf(id).filter((i) => i.kind === 'shelf').length, 0, 'no shelf came with it');
  const r = S().unitResult(id);
  assert.equal(r.assemblies.rail.mount, RAIL_MOUNT.ALONE);
  assert.ok(!r.panels.some((p) => p.part === 'RAIL-PART'), 'and no board above it');
  // REWRITTEN 19.10.2026 (chat fix, KIT_HANGER_TWO.lsp D1): two rails per bay; the third is refused.
  const second = S().addHangerRail(id);
  assert.ok(second, 'a second rod, alone, 950 under the first');
  assert.equal(itemsOf(id).find((i) => i.id === second).mount, RAIL_MOUNT.ALONE);
  assert.equal(S().addHangerRail(id), null, 'a third is refused');

  const c = wardrobe(1200);
  S().addPartition(c);
  const col = S().addHangerRail(c, { zone: 1 });
  const colRail = itemsOf(c).find((i) => i.id === col);
  assert.equal(colRail.mount, RAIL_MOUNT.ALONE);
  assert.equal(colRail.zone, 1);
  assert.equal(itemsOf(c).filter((i) => i.kind === 'shelf').length, 0);
});

test('F11 · ONE path adds a rail: the store\'s addHangerRail, called by PRO and retail alike', () => {
  const pro = read('src/components/AddItems.jsx');
  assert.equal((pro.match(/addHangerRail\(/g) || []).length, 1, 'PRO calls it once');
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /add: \(s, u\) => s\.addHangerRail\(u, \{\}\)/, 'retail calls the same action');
  const store = read('src/stores/projectStore.js');
  assert.equal((store.match(/kind: 'hanger',\n\s*mount: RAIL_MOUNT\.ALONE,/g) || []).length, 1,
    'one place writes a new rod');
  assert.doesNotMatch(store, /mount: 'shelf',\n\s*shelf_id: shelfId/, 'and none writes a new assembly');
});

// ═══ 3. THE MAGNET ═══════════════════════════════════════════════════════════

test('F11 · the number is in the profile: 50 under the shelf, the shelf magnet\'s reach', () => {
  assert.equal(BELOW, 50);
  assert.equal(REACH, 10);
  assert.equal(P.hardware.hanger.dropMm, 40, 'the saved assembly\'s drop is untouched');
  assert.match(read('src/stores/projectStore.js'), /const below = Number\(profile\.hardware\.hanger\.belowShelfMm\) \|\| 0;/,
    'the store reads it from the profile, never types it');
  assert.match(read('src/components/AddItems.jsx'), /formatMm\(profile\.hardware\.hanger\.belowShelfMm, \{ unit: true \}\)/,
    'and the notice says the profile\'s number');
});

test('F11 · moveRail within 10 of underside-50 lands on underside-50 and reports magnet (FIX and adjustable)', () => {
  project();
  const id = wardrobe();
  const fix = S().addItem(id, { kind: 'shelf', variant: 'fixed', pos_mm: 1700 });
  const adj = S().addItem(id, { kind: 'shelf', variant: 'adjustable', pos_mm: 1200 });
  const railId = S().addHangerRail(id);
  const travel = S().railTravelFor(id, railId);
  const fixUnder = S().unitResult(id).panels.find((p) => p.meta?.itemId === fix).box.y;
  assert.equal(fixUnder, 1700);

  // Within the reach, from below and from above: caught, on underside - 50.
  for (const off of [+7, -9.5, 0]) {
    const res = S().moveRail(id, railId, fixUnder - BELOW - travel.support + off);
    assert.ok(res.magnet, `caught at ${off}`);
    assert.equal(res.magnet.itemId, fix);
    assert.equal(res.magnet.axis, fixUnder - BELOW);
    assert.equal(S().unitResult(id).assemblies.rail.y, fixUnder - BELOW, 'the rod hangs 50 under the FIX shelf');
  }
  // The adjustable one catches as well.
  const adjUnder = S().unitResult(id).panels.find((p) => p.meta?.itemId === adj).box.y;
  const caught = S().moveRail(id, railId, adjUnder - BELOW - travel.support - 4);
  assert.equal(caught.magnet?.itemId, adj);
  assert.equal(S().unitResult(id).assemblies.rail.y, adjUnder - BELOW);

  // Past the reach: the hand is obeyed, and nothing is reported.
  const free = S().moveRail(id, railId, fixUnder - BELOW - travel.support - (REACH + 15));
  assert.equal(free.magnet, null);
  assert.equal(S().unitResult(id).assemblies.rail.y, fixUnder - BELOW - (REACH + 15));

  // Alt refuses it, as the free panel's drop does.
  const alt = S().moveRail(id, railId, fixUnder - BELOW - travel.support + 6, { magnet: false });
  assert.equal(alt.magnet, null);
  assert.equal(S().unitResult(id).assemblies.rail.y, fixUnder - BELOW + 6);
});

test('F11 · in a column the magnet reads ITS bay and its own support (the drawer stack)', () => {
  project();
  const c = wardrobe(1200);
  const pid = S().addPartition(c);
  S().updateItem(c, pid, { front_mm: 0 });
  assert.equal(S().addDrawers(c, 2, 'internal', 200, 0).ok, true);
  const mine = S().addItem(c, { kind: 'shelf', variant: 'fixed', pos_mm: 1700, zone: 0 });
  const next = S().addItem(c, { kind: 'shelf', variant: 'fixed', pos_mm: 1500, zone: 1 });
  const railId = S().addHangerRail(c, { zone: 0 });
  const r = S().unitResult(c);
  const stack = r.assemblies.columnDrawers.find((s) => s.zone === 0);
  const travel = S().railTravelFor(c, railId);
  assert.equal(travel.support, stack.top + G, 'the column rod stands on its stack, read back off the engine');
  const cands = S().railMagnetCandidates(c, railId);
  assert.ok(cands.some((k) => k.itemId === mine), 'the shelf over the rod is offered');
  assert.ok(!cands.some((k) => k.itemId === next), 'the next bay\'s shelf is not');
  const res = S().moveRail(c, railId, 1700 - BELOW - travel.support + 6);
  assert.equal(res.magnet?.itemId, mine);
  assert.equal(S().unitResult(c).assemblies.columnRails.find((k) => k.zone === 0).y, 1700 - BELOW);
});

test('F11 · the drawer cap PARTITION is a candidate board like a shelf', () => {
  // A saved rod measured from the floor under a full-width stack's cap: the
  // cap's underside less 50 is offered, in the rod's own frame.
  project();
  const id = wardrobe();
  S().addDrawers(id, 2, 'internal', 200, null);
  const railId = S().addItem(id, { kind: 'hanger', mount: 'alone', pos_mm: 300, datum: { kind: 'floor', id: null } });
  const cap = S().unitResult(id).panels.find((p) => p.id === 'PARTITION');
  assert.ok(cap, 'the stack has its cap');
  const travel = S().railTravelFor(id, railId);
  const k = S().railMagnetCandidates(id, railId).find((x) => x.panelId === 'PARTITION');
  assert.ok(k, 'the cap is read');
  assert.equal(k.axis, cap.box.y - BELOW);
  assert.equal(k.pos, cap.box.y - BELOW - travel.support);
});

test('F11 · the slider\'s number never jumps to the proposal; the view draws the guide', () => {
  project();
  const id = wardrobe();
  S().addItem(id, { kind: 'shelf', variant: 'fixed', pos_mm: 1700 });
  const railId = S().addHangerRail(id);
  const travel = S().railTravelFor(id, railId);
  A.setRailOffset(id, railId, 1700 - BELOW - travel.support + 5);
  assert.equal(S().unitResult(id).assemblies.rail.y, 1700 - BELOW + 5, 'a typed number is obeyed');

  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /onMoveRail\(itemId, axisMm - support, \{ magnet: !ev\.altKey \}\)/, 'Alt refuses it');
  assert.match(view, /ccRailMagnet: railMagnet\.axis/, 'the guide is drawn at the rod\'s axis');
  assert.match(view, /<DashedGuide y=\{railMagnet\.axis\}/);
  assert.match(view, /under the shelf · Alt refuses/);
  assert.match(view, /railTravelFor\(unit\.id, itemId\)\?\.support/, 'the hand and the magnet read one support');
  assert.match(read('src/3d/Scene.jsx'), /onMoveRail=\{\(itemId, offsetMm, opts\) => moveRail\(unit\.id, itemId, offsetMm, opts\)\}/);
});

// ═══ 4. A SAVED SHELF-MOUNTED RAIL ═══════════════════════════════════════════

test('F11 · a saved shelf-mounted rail loads and renders as before, and is not dragged alone', () => {
  project();
  const id = wardrobe();
  const { shelfId, railId } = hangSavedAssembly(id, { shelfAt: 1500 });
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().loadProject(saved.project, saved.units);

  const rail = itemsOf(id).find((i) => i.id === railId);
  assert.equal(railMountOf(rail), RAIL_MOUNT.SHELF);
  const r = S().unitResult(id);
  assert.equal(r.assemblies.rail.y, 1500 - hangerDropMm(P), 'the rod rides its shelf, the T37 drop');
  assert.equal(r.assemblies.rail.mount, RAIL_MOUNT.SHELF);
  assert.equal(r.assemblies.rail.shelfItemId, shelfId);
  assert.ok(r.panels.some((p) => p.part === 'SHELF' && p.meta?.itemId === shelfId), 'its shelf is cut');
  assert.equal(r.hardware.filter((h) => h.role === 'rail' && h.qty > 0).length, 1, 'and bought');
  assert.ok(S().railAssemblyOf(id, railId), 'the pair reads as one');
  // Its shelf owns its height: no drag, no proposal.
  assert.equal(S().moveRail(id, railId, 900), null);
  assert.deepEqual(S().railMagnetCandidates(id, railId), []);
});
