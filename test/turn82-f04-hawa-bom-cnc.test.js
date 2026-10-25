/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F4, F5 · THE HAWA POCKET IN THE BOM AND ON THE CNC (slice A4).
//
// CLAUDE.md T82 F4: *"The BOM adds, per pocket: "Hawa Concepta III 25 Push,
// left" (or 35, Pull, right), one set per door; "Hawa Connector 55" or
// "Connector 110", one per pocket; the hinges (3 or 4 per door) as the set's
// own; the top track and bottom track cut to T1 - 7 (one line, the length
// named); for III/35 the steel stiffening profile, length TB - M + 3; the
// adjustable foot ... an empty article prints the name alone."* and *"The
// pocket panels, top, bottom and door are ordinary cut parts on the cut list
// and the CNC sheets, named POCKET-A, POCKET-B, POCKET-TOP, POCKET-BOTTOM,
// POCKET-DOOR with the unit's number."*
//
// F5: *"the hole patterns of F1(d) as drill operations on the pocket panels
// (fi 4.5 pilot PROPOSED 3 mm diameter 10 deep ...), on the layer grammar the
// CNC already has for hinge plates; the door's cups and holes as the hinge
// drilling is done today (fi 35 x 13, fi 5 x 13, fi 8 x 13). The CNC export
// fingerprint of every EXISTING fixture is unchanged (FROZEN 2)."*
//
// The figures are KIT_HAWA.lsp's (EXAMPLE 1 and EXAMPLE 2 of its section 5),
// through A2's mirror (`result.hawa`); the order lines and the holes are held
// to the kit's own routines, RUN here through test/lisp-mini.js.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildBom, purchaseBom, sheetFamilyOfPart } from '../src/engine/bom.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY, partIdForElement } from '../src/engine/partRegistry.js';
import { groupOfPanel } from '../src/engine/cnc/groups.js';
import { labelKindOf } from '../src/engine/partNumbers.js';
import { sprayRuleFor } from '../src/engine/spray.js';
import { HAWA_ROLES, hawaHardwareLines } from '../src/engine/cnc/hawa.js';
import { cases } from '../scripts/cnc-scenarios.mjs';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const L = loadLisp(readFileSync(`${ROOT}reference/lisp/KIT_HAWA.lsp`, 'utf8'));
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
/** The en and the em dash (U+2013, U+2014), spelled by code so this file carries neither. */
const DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

/** KIT_HAWA.lsp EXAMPLE 1: one door, hand R, front 18, H 2100, a 500 cabinet on a 580 run, far 1.5. */
const ONE_DOOR = (extra = {}) => ({
  ...defaultParamsFor('HAWA_POCKET', P),
  unit_num: 'HP01',
  height: 2100,
  depth: 580,
  front_t: 18,
  pocket: { doors: 1, hand: 'R', push: true, cls: null, covers: ['b'] },
  pocket_cover: { doors: [{ side: 'R', units: ['b'], spanMm: 500, KT1: 580, freeEndClearanceMm: 1.5 }] },
  ...extra,
});
/** KIT_HAWA.lsp EXAMPLE 2: two doors, front 19, H 2400, a 450 cabinet each side on a 600 run, far 1.5 both. */
const TWO_DOORS = (extra = {}) => ({
  ...defaultParamsFor('HAWA_POCKET', P),
  unit_num: 'HP01',
  height: 2400,
  depth: 600,
  front_t: 19,
  pocket: { doors: 2, hand: null, push: true, cls: null, covers: ['a', 'b'] },
  pocket_cover: {
    doors: [
      { side: 'L', units: ['a'], spanMm: 450, KT1: 600, freeEndClearanceMm: 1.5 },
      { side: 'R', units: ['b'], spanMm: 450, KT1: 600, freeEndClearanceMm: 1.5 },
    ],
  },
  ...extra,
});
const POCKET_PARTS = ['POCKET-A', 'POCKET-B', 'POCKET-TOP', 'POCKET-BOTTOM', 'POCKET-DOOR'];
const lines = (r, role) => r.hardware.filter((h) => h.role === role);
const entry = (r, id = 'p') => ({ unit: { id, type: 'HAWA_POCKET' }, result: r });

// ═══ F4 · THE ORDER LINES ═══════════════════════════════════════════════════

test('F4 · EXAMPLE 1: the set, Connector 55, the set\'s 3 hinges, the tracks cut to T1 - 7, the foot; no steel profile on III/25', () => {
  const r = computeCabinet(ONE_DOOR(), P);
  const d = r.hawa.doors[0];
  // The set: its name is the LISP's hawa-set-name (hand R covers the right: the left-hand system, D16).
  const set = lines(r, 'hawa_set');
  assert.equal(set.length, 1);
  assert.equal(set[0].label, L.call('hawa-set-name', 25, true, 'R'));
  assert.equal(set[0].label, 'Hawa Concepta III 25 Push, left');
  assert.equal(set[0].qty, 1);
  // PROPOSED (CLAUDE.md THE NUMBERS): 408.30.711 III/25-35 Push left, the Haefele UK code of the NBS sheet.
  assert.equal(set[0].spec.article, '408.30.711');
  assert.equal(set[0].spec_label, 'Hawa Concepta III 25 Push, left · art. 408.30.711');
  const conn = lines(r, 'hawa_connector');
  assert.deepEqual(conn.map((l) => [l.label, l.qty]), [[L.call('hawa-connector-name', 1), 1]]);
  assert.equal(conn[0].label, 'Hawa Connector 55');
  assert.equal(conn[0].spec_label, 'Hawa Connector 55', 'an empty article prints the name alone');
  assert.equal(lines(r, 'hawa_hinges')[0].qty, L.call('hawa-hinges', 25));
  assert.equal(lines(r, 'hawa_hinges')[0].qty, 3);
  const tracks = lines(r, 'hawa_tracks');
  assert.equal(tracks.length, 1, 'one line, the top and the bottom track');
  assert.equal(tracks[0].qty, 1);
  assert.equal(tracks[0].unit, 'pairs');
  assert.equal(tracks[0].spec.length_mm, L.call('hawa-track-length', d.T1));
  assert.equal(tracks[0].spec.length_mm, 560);
  assert.match(tracks[0].spec_label, /^cut to 560 mm \(T1 - 7\)/, 'the length named');
  assert.equal(lines(r, 'hawa_stiffener').length, 0);
  assert.deepEqual(lines(r, 'hawa_foot').map((l) => l.qty), [1]);
  // The set's hinges are their own role: the project's cup hinges buy a plate each (bom.js), these do not.
  assert.equal(lines(r, 'hinges').length, 0);
  assert.deepEqual(lines(r, 'legs').map((l) => l.qty), [4], 'the pocket stands on its legs as a cabinet does (A2)');
});

test('F4 · EXAMPLE 2: a right and a left set, Connector 110, 4 hinges a door, two pairs of tracks, the steel profile TB - M + 3 per groove', () => {
  const r = computeCabinet(TWO_DOORS(), P);
  const [dl, dr] = r.hawa.doors;
  assert.deepEqual(lines(r, 'hawa_set').map((l) => [l.label, l.qty]), [
    [L.call('hawa-set-name', 35, true, 'L'), 1],
    [L.call('hawa-set-name', 35, true, 'R'), 1],
  ]);
  assert.deepEqual(lines(r, 'hawa_set').map((l) => l.label), ['Hawa Concepta III 35 Push, right', 'Hawa Concepta III 35 Push, left']);
  assert.equal(lines(r, 'hawa_set')[0].spec_label, 'Hawa Concepta III 35 Push, right', 'setPushRight is empty: the name alone');
  assert.equal(lines(r, 'hawa_connector')[0].label, L.call('hawa-connector-name', 2));
  assert.equal(lines(r, 'hawa_hinges')[0].qty, 2 * L.call('hawa-hinges', 35));
  assert.deepEqual(lines(r, 'hawa_tracks').map((l) => [l.qty, l.spec.length_mm]), [[2, 560]]);
  const steel = lines(r, 'hawa_stiffener');
  assert.equal(steel.length, 1);
  assert.equal(steel[0].spec.length_mm, L.call('hawa-steel-length', dl.TB, dl.M));
  assert.equal(steel[0].spec.length_mm, 475, 'KIT_HAWA.lsp EXAMPLE 2: the profile 475 long');
  assert.equal(steel[0].qty, dl.grooves.length + dr.grooves.length, 'one profile per routed groove');
  assert.equal(steel[0].qty, 4);
  assert.match(steel[0].spec_label, /^475 mm \(TB - M \+ 3\)$/);
  assert.deepEqual(lines(r, 'hawa_foot').map((l) => l.qty), [1], 'one foot per pocket');
});

test('F4 · Pull prints Pull and its own article; every article the owner fills prints beside its name', () => {
  const pull = computeCabinet(ONE_DOOR({ pocket: { doors: 1, hand: 'R', push: false, cls: null, covers: ['b'] } }), P);
  assert.equal(lines(pull, 'hawa_set')[0].label, L.call('hawa-set-name', 25, null, 'R'));
  assert.equal(lines(pull, 'hawa_set')[0].label, 'Hawa Concepta III 25 Pull, left');
  assert.equal(lines(pull, 'hawa_set')[0].spec_label, 'Hawa Concepta III 25 Pull, left', 'setPullLeft empty: the name alone');
  const filled = {
    ...P,
    hawa: {
      ...P.hawa,
      articles: {
        ...P.hawa.articles, setPushRight: 'R-1', connector110: 'C-110', trackTop: 'T-T', trackBottom: 'T-B', steelProfile: 'S-1', foot: 'F-1',
      },
    },
  };
  const two = computeCabinet(TWO_DOORS(), P).hawa;
  const by = (role) => hawaHardwareLines(two, filled).filter((l) => l.role === role).map((l) => l.spec_label);
  assert.deepEqual(by('hawa_set'), ['Hawa Concepta III 35 Push, right · art. R-1', 'Hawa Concepta III 35 Push, left · art. 408.30.711']);
  assert.deepEqual(by('hawa_connector'), ['Hawa Connector 110 · art. C-110']);
  assert.match(by('hawa_tracks')[0], / · art\. T-T \/ T-B$/);
  assert.match(by('hawa_stiffener')[0], / · art\. S-1$/);
  assert.match(by('hawa_foot')[0], / · art\. F-1$/);
});

test('F4 · a door the kit names no class for orders no set of its own (Check #37 says why); the pocket keeps its connector and its foot', () => {
  // KIT_HAWA.lsp EXAMPLE 5: TH 1500 x TB 750 x S 26 is past the III/25 table and below the III/35's 1900.
  const r = computeCabinet(ONE_DOOR({
    front_t: 26, height: 1548.5, pocket_cover: { doors: [{ side: 'R', units: ['b'], spanMm: 673.5, KT1: 580, freeEndClearanceMm: 1.5 }] },
  }), P);
  const d = r.hawa.doors[0];
  assert.equal(d.TB, 750);
  assert.equal(d.TH, 1500);
  assert.equal(d.cls, null);
  assert.ok(r.warnings.some((w) => w.check === 37), 'the room refuses in words');
  for (const role of ['hawa_set', 'hawa_hinges', 'hawa_tracks', 'hawa_stiffener']) assert.equal(lines(r, role).length, 0, role);
  assert.equal(lines(r, 'hawa_connector').length, 1);
  assert.equal(lines(r, 'hawa_foot').length, 1);
});

test('F4 · the five parts are ordinary cut parts: on the cut list with the unit\'s number; two pockets merge their order lines', () => {
  const a = computeCabinet(ONE_DOOR(), P);
  const b = computeCabinet(ONE_DOOR({ unit_num: 'HP02' }), P);
  const bom = buildBom([entry(a, 'p1'), entry(b, 'p2')]);
  for (const part of POCKET_PARTS) {
    const rows = bom.cutRows.filter((row) => row.part === part);
    assert.ok(rows.length, `${part} is on the cut list`);
    for (const row of rows) {
      assert.deepEqual([...row.units].sort(), ['HP01', 'HP02'], `${part}: both pockets' numbers`);
      assert.equal(row.readiness, 'cut');
    }
  }
  const unitRows = bom.units.find((u) => u.unitNum === 'HP01').rows.filter((row) => POCKET_PARTS.includes(row.part));
  assert.equal(unitRows.length, 5);
  for (const row of unitRows) assert.equal(row.unit_num, 'HP01');
  const set = bom.hardware.find((h) => h.role === 'hawa_set');
  assert.equal(set.qty, 2);
  assert.deepEqual([...set.units].sort(), ['HP01', 'HP02']);
  assert.equal(set.readiness, 'bought');
});

test('F4 · every HAWA role is a registry part, on the purchase list; the pocket\'s boards are bought off the board the engine checks them on', () => {
  for (const role of HAWA_ROLES) {
    const id = HARDWARE_TO_PART_ID[role];
    assert.ok(PART_REGISTRY[id], `${role} maps to a registry part`);
    assert.equal(PART_REGISTRY[id].group, 'hardware');
  }
  for (const make of [ONE_DOOR, TWO_DOORS]) {
    const r = computeCabinet(make(), P);
    const purchase = purchaseBom([entry(r)], { profile: P });
    for (const h of r.hardware.filter((x) => /^hawa_/.test(x.role))) {
      const id = HARDWARE_TO_PART_ID[h.role];
      assert.ok(purchase.rows.some((row) => row.parts.includes(id)), `${h.role} on the purchase list`);
    }
    for (const p of r.panels.filter((x) => POCKET_PARTS.includes(x.part))) {
      const id = partIdForElement(p.part, { typeId: r.type });
      const checked = groupOfPanel(p) === 'fronts' ? 'fronts' : 'carcasses';
      assert.equal(sheetFamilyOfPart(id), checked, `${p.id}: one board for the estimate and the check (T35-F15)`);
    }
  }
});

test('F4 · the CNC tree, the stickers and the spray law: the panels and the door with the fronts, the boards with the carcass', () => {
  const r = computeCabinet(ONE_DOOR(), P);
  const of = (part) => r.panels.find((p) => p.part === part);
  for (const part of ['POCKET-A', 'POCKET-B', 'POCKET-DOOR']) {
    assert.equal(groupOfPanel(of(part)), 'fronts', `${part} in the fronts group`);
    assert.equal(labelKindOf(of(part)), 'front', `${part} numbered with the fronts`);
  }
  for (const part of ['POCKET-TOP', 'POCKET-BOTTOM']) {
    assert.equal(groupOfPanel(of(part)), 'carcasses');
    assert.equal(sprayRuleFor(of(part)), null, 'the carcass finish: sprayed under set 2 only');
  }
  assert.equal(sprayRuleFor(of('POCKET-DOOR')).id, 'door', 'the door is a door, all round');
  assert.equal(sprayRuleFor(of('POCKET-A')).id, 'end_panel', 'PROPOSED: a panel beside the carcasses, as an end panel');
});

test('F4 · FROZEN: no existing case orders a HAWA line or carries a pocket part', () => {
  for (const c of cases().filter((x) => !String(x.id).startsWith('HAWA_POCKET'))) {
    const r = computeCabinet(c.params, P);
    assert.ok(!(r.hardware || []).some((h) => /^hawa_/.test(h.role)), `${c.id} orders HAWA hardware`);
    assert.ok(!r.panels.some((p) => /^pocket_/.test(String(p.role))), `${c.id} cuts a pocket part`);
    assert.equal(r.hawa, undefined, `${c.id} carries no pocket figures`);
  }
});

test('F4 · the new files: the Skylon header, no dash', () => {
  for (const rel of ['src/engine/cnc/hawa.js', 'test/turn82-f04-hawa-bom-cnc.test.js']) {
    assert.ok(read(rel).startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.'), rel);
    assert.doesNotMatch(read(rel), DASH, `${rel}: no em or en dash`);
  }
});
