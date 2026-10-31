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
import {
  HAWA_ROLES, hawaDrills, hawaFacePoint, hawaHardwareLines, hawaKindOf, hawaLayers,
} from '../src/engine/cnc/hawa.js';
import { buildCabinetPartQtys } from '../src/engine/bom.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { unitFindings } from '../src/engine/cnc/exportGate.js';
import { CNC_LAYERS, cncLayer } from '../src/engine/cnc/layers.js';
import { machiningClasses } from '../src/engine/machining.js';
import { panelPlacement } from '../src/engine/joinery.js';
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

// ═══ F5 · THE HOLES AND THE GROOVES ON THE MACHINE ══════════════════════════

/** A drill's (x, y) back in the LISP's face frame (u, v), by the board's seat. */
function backToFace(panel, hawa, d) {
  const w = Number(panel.cnc?.drawn_w ?? panel.w);
  const kind = panel.meta.pocket.kind;
  if (kind === 'A' || kind === 'B') return [panel.meta.pocket.seat === 'R' ? w - d.x : d.x, d.y];
  if (kind === 'door') return [hawa.doors.find((x) => x.id === panel.id).hingeEdge === 'L' ? w - d.x : d.x, d.y];
  return [d.x, d.y];
}
const pocketPanels = (r) => r.panels.filter((p) => p.meta?.pocket);
const near = (a, b) => Math.abs(a - b) <= 1e-6;

test('F5 · EXAMPLE 1: every LISP hole is a drill record, the kit\'s own routine point for point, seated in its board\'s frame', () => {
  const r = computeCabinet(ONE_DOOR(), P);
  const h = r.hawa;
  const d = h.doors[0];
  const lispOf = {
    'POCKET-B': L.call('hawa-b-holes', d.T1, h.EH),
    'POCKET-A': L.call('hawa-a-holes', h.S, d.T1, d.E1, h.EH),
    'POCKET-BOTTOM': [L.call('hawa-foot', 1, 18, h.S)],
    'POCKET-DOOR': L.call('hawa-door-holes', 1, d.cls, d.TB, d.TH, d.M),
    'POCKET-TOP': [],
  };
  for (const p of pocketPanels(r)) {
    const drills = r.drills.filter((x) => x.panel === p.id);
    const want = lispOf[p.part];
    assert.equal(drills.length, want.length, `${p.id}: every hole, once`);
    drills.forEach((x, i) => {
      const [u, v] = backToFace(p, h, x);
      const [layer, lu, lv, dia] = want[i];
      assert.equal(x.layer, layer, `${p.id} hole ${i}`);
      assert.ok(near(u, lu) && near(v, lv), `${p.id} hole ${i}: (${u}, ${v}) is the LISP's (${lu}, ${lv})`);
      assert.equal(x.d, dia);
    });
  }
  // The seats: A on the pocket's left (BUL's frame), B on its right (BUR's, the front at x = w).
  const of = (part) => r.panels.find((p) => p.part === part);
  assert.equal(of('POCKET-A').meta.pocket.seat, 'L');
  assert.equal(of('POCKET-B').meta.pocket.seat, 'R');
  const b0 = r.drills.find((x) => x.panel === 'POCKET-B');
  assert.deepEqual([b0.x, b0.y], [580 - 32, 2057.5 - 22], 'B\'s first top pilot 32 from its front edge, the front at x = w');
  const a0 = r.drills.find((x) => x.panel === 'POCKET-A');
  assert.deepEqual([a0.x, a0.y], [18 + 48, 2057.5 - 10], 'A\'s first connector pilot S + 48 from its front edge, the front at x 0');
  // The door's hinge edge is its LEFT seen from the room (the pocket's side): seen from its back, at x = w.
  assert.equal(d.hingeEdge, 'L');
  const cup = r.drills.find((x) => x.panel === 'POCKET-DOOR' && x.kind === 'hawa_cup');
  assert.deepEqual([cup.x, cup.y], [572.5 - 28, 200]);
  // The pure function is the engine's answer.
  assert.deepEqual(r.drills.filter((x) => /^hawa_/.test(x.kind)), hawaDrills(h, r.panels, P));
});

test('F5 · the diameters and the depths: pilots dia 3 x 10, cups dia 35 x 13, dia 5 x 13, dia 8 x 13, the foot through; no kind says screw', () => {
  const L5 = hawaLayers(P);
  assert.deepEqual(L5, {
    pilot: 'HAWA_3MM', cup: 'FRONT_HINGES_35MM_D13', screw: 'FRONT_HINGES_5MM_D13', sleeve: 'FRONT_HINGES_8MM_D13', foot: 'HAWA_FOOT_35MM', groove: 'HAWA_GROOVE_12MM',
  });
  const want = {
    hawa_pilot: [L5.pilot, 3, 10], hawa_cup: [L5.cup, 35, 13], hawa_cup_hole: [L5.screw, 5, 13], hawa_sleeve: [L5.sleeve, 8, 13], hawa_foot: [L5.foot, 35, undefined],
  };
  for (const make of [ONE_DOOR, TWO_DOORS]) {
    const r = computeCabinet(make(), P);
    const hawaHoles = r.drills.filter((x) => /^hawa_/.test(x.kind));
    assert.ok(hawaHoles.length > 0);
    for (const x of hawaHoles) {
      assert.deepEqual([x.layer, x.d, x.depth], want[x.kind], `${x.panel} ${x.kind}`);
      assert.equal(hawaKindOf(x.layer, P), x.kind);
      assert.doesNotMatch(x.kind, /screw/);
    }
    // The set's screws are the set's: no confirmat, no screw line counted off these holes (bom.js, bomInvoice.js).
    assert.equal(buildCabinetPartQtys(r, { type: 'HAWA_POCKET' }).screw_confirmat, undefined);
  }
});

test('F5 · EXAMPLE 2: B-L and B-R mirrored, each door drilled from its own hinge edge, the III/35 grooves pockets 12 deep', () => {
  const r = computeCabinet(TWO_DOORS(), P);
  const h = r.hawa;
  const of = (id) => r.panels.find((p) => p.id === id);
  assert.equal(of('POCKET-B-L').meta.pocket.seat, 'L');
  assert.equal(of('POCKET-B-R').meta.pocket.seat, 'R');
  const left = r.drills.filter((x) => x.panel === 'POCKET-B-L');
  const right = r.drills.filter((x) => x.panel === 'POCKET-B-R');
  assert.equal(left.length, right.length);
  left.forEach((x, i) => assert.deepEqual([of('POCKET-B-R').w - right[i].x, right[i].y], [x.x, x.y], `pilot ${i} mirrored`));
  // KIT_HAWA.lsp EXAMPLE 2: TA 29.5, the steel profile 475, the grooves (0 2255 475 2267) and (0 15 475 27).
  const dl = h.doors.find((d) => d.id === 'POCKET-DOOR-L');
  const dr = h.doors.find((d) => d.id === 'POCKET-DOOR-R');
  assert.deepEqual([dl.hingeEdge, dr.hingeEdge], ['R', 'L'], 'each door hinged on the pocket\'s side');
  assert.equal(r.drills.find((x) => x.panel === 'POCKET-DOOR-L' && x.kind === 'hawa_cup').x, 29.5);
  assert.equal(r.drills.find((x) => x.panel === 'POCKET-DOOR-R' && x.kind === 'hawa_cup').x, 521 - 29.5);
  const grooves = (id) => of(id).cnc.pockets.filter((k) => k.layer === 'HAWA_GROOVE_12MM').map((k) => [k.x1, k.y1, k.x2, k.y2, k.depth]);
  assert.deepEqual(grooves('POCKET-DOOR-L'), [[0, 2255, 475, 2267, 12], [0, 15, 475, 27, 12]]);
  assert.deepEqual(grooves('POCKET-DOOR-R'), [[46, 2255, 521, 2267, 12], [46, 15, 521, 27, 12]]);
  for (const id of ['POCKET-DOOR-L', 'POCKET-DOOR-R']) {
    const lisp = L.call('hawa-steel-grooves', 521, 2358, 49);
    const back = of(id).meta.pocket.grooves;
    assert.deepEqual(back, lisp, `${id}: the LISP's grooves on the record`);
    for (const [u0, v0, u1, v1] of back) {
      const [xa] = hawaFacePoint(of(id), h, u0, v0);
      const [xb] = hawaFacePoint(of(id), h, u1, v1);
      assert.ok(of(id).cnc.pockets.some((k) => near(k.x1, Math.min(xa, xb)) && near(k.x2, Math.max(xa, xb)) && near(k.y1, v0) && near(k.y2, v1)));
    }
  }
  // III/25 routes no groove. (AMENDED AFTER THE REVIEW, 25.10.2026: the door wears the run's front finish,
  // CLAUDE.md T82 F6 *"the door in the front finish of the run (spray, decoration, in-frame as the
  // neighbours)"*, so the default shaker's recess is a pocket of its face; the GROOVES are what III/25 has none of.)
  assert.equal((computeCabinet(ONE_DOOR(), P).panels.find((p) => p.id === 'POCKET-DOOR').cnc.pockets || [])
    .filter((k) => k.layer === 'HAWA_GROOVE_12MM').length, 0);
});

test('F5 · hand L is hand R mirrored: B on the left in BUL\'s frame, A on the right in BUR\'s, the door hinged on its right edge', () => {
  const r = computeCabinet(ONE_DOOR({
    pocket: { doors: 1, hand: 'L', push: true, cls: null, covers: ['b'] },
    pocket_cover: { doors: [{ side: 'L', units: ['b'], spanMm: 500, KT1: 580, freeEndClearanceMm: 1.5 }] },
  }), P);
  const of = (part) => r.panels.find((p) => p.part === part);
  assert.equal(of('POCKET-B').meta.pocket.seat, 'L');
  assert.equal(of('POCKET-A').meta.pocket.seat, 'R');
  assert.deepEqual(r.drills.filter((x) => x.panel === 'POCKET-B').slice(0, 1).map((x) => [x.x, x.y]), [[32, 2057.5 - 22]]);
  assert.equal(r.hawa.doors[0].hingeEdge, 'R');
  assert.equal(r.drills.find((x) => x.panel === 'POCKET-DOOR' && x.kind === 'hawa_cup').x, 28);
});

test('F5 · the DXF: one file per part, the holes on their layers, the six layers declared with ACI 54 to 59, the guards green', () => {
  for (const make of [ONE_DOOR, TWO_DOORS]) {
    const r = computeCabinet(make(), P);
    const files = buildUnitDxfFiles(r, P);
    for (const p of pocketPanels(r)) {
      const f = files.find((x) => x.panelId === p.id);
      assert.equal(f.name, `HP01-${p.id}.dxf`);
      const circles = f.entities.filter((e) => e.type === 'circle');
      const drills = r.drills.filter((x) => x.panel === p.id);
      assert.equal(circles.length, drills.length, `${p.id}: one circle per hole`);
      drills.forEach((x) => assert.ok(circles.some((c) => c.layer === x.layer && near(c.cx, x.x) && near(c.cy, x.y) && near(c.r, x.d / 2))));
      for (const k of p.cnc.pockets || []) assert.ok(f.entities.some((e) => e.type === 'poly' && e.layer === k.layer && e.closed));
      for (const layer of new Set(f.entities.map((e) => e.layer))) assert.match(f.dxf, new RegExp(`\r\n2\r\n${layer}\r\n70\r\n0\r\n62\r\n${cncLayer(layer).aci}\r\n`), `${f.name} declares ${layer}`);
    }
    assert.deepEqual(unitFindings(r, { profile: P }), [], 'the off-board, edge and drill guards hold on every pocket board');
  }
  const aci = Object.fromEntries(CNC_LAYERS.map((l) => [l.name, l.aci]));
  // CHAT FIX 31.10.2026: 54 to 59 were the pure yellows; the pinks 220 / 222 / 224 and the violets 190 / 192 / 194
  // (31.10.2026, the owner: *"raczej staraj sie wszedzie omijac zolty bo on jest mega nie widoczny na bialym tle (na takim pracuje vcarve)"*).
  assert.deepEqual(['HAWA_3MM', 'FRONT_HINGES_5MM_D13', 'FRONT_HINGES_8MM_D13', 'HAWA_FOOT_35MM', 'HAWA_GROOVE_12MM', 'FRONT_HINGES_35MM_D13'].map((n) => aci[n]), [220, 222, 224, 190, 192, 194]);
  assert.equal(aci.FRONT_HINGES_35MM, 3, 'the house\'s cup layer is the house\'s, untouched');
  const policy = new Map(machiningClasses().map((c) => [c.layer, c]));
  const doc = read('verify/t26/sheet-vs-scene.md');
  for (const layer of Object.values(hawaLayers(P))) {
    assert.ok(policy.get(layer)?.draw, `${layer}: the room bores what the sheet drills (R10)`);
    assert.ok(doc.includes(`\`${layer}\``), `${layer} in verify/t26/sheet-vs-scene.md`);
  }
});

test('F5 · the room and the sheets seat every hole where the CNC drew it (engine/joinery.js panelPlacement)', () => {
  for (const make of [ONE_DOOR, TWO_DOORS]) {
    const r = computeCabinet(make(), P);
    const h = r.hawa;
    for (const p of pocketPanels(r)) {
      const seat = panelPlacement(p);
      assert.ok(seat, `${p.id} has a placement`);
      const cross = [seat.u[1] * seat.v[2] - seat.u[2] * seat.v[1], seat.u[2] * seat.v[0] - seat.u[0] * seat.v[2], seat.u[0] * seat.v[1] - seat.u[1] * seat.v[0]];
      const b = p.box;
      for (const x of r.drills.filter((dd) => dd.panel === p.id)) {
        const at = [0, 1, 2].map((k) => seat.origin[k] + seat.u[k] * x.x + seat.v[k] * x.y);
        const [u, v] = backToFace(p, h, x);
        const kind = p.meta.pocket.kind;
        if (kind === 'A' || kind === 'B') {
          assert.ok(near(b.z + b.d - at[2], u), `${p.id}: ${u} behind its front edge`);
          assert.ok(near(at[1] - b.y, v), `${p.id}: ${v} up its height`);
        } else if (kind === 'door') {
          const hinge = h.doors.find((dd) => dd.id === p.id).hingeEdge;
          assert.ok(near(hinge === 'L' ? at[0] - b.x : b.x + b.w - at[0], u), `${p.id}: ${u} in from its hinge edge`);
          assert.ok(near(at[1] - b.y, v));
        } else {
          assert.ok(near(at[0] - b.x, u) && near(b.z + b.d - at[2], v), `${p.id}: the foot across and back`);
        }
      }
      if (p.part !== 'POCKET-DOOR') assert.deepEqual(cross.map((c) => 0 - c + 0), seat.n.map((c) => c + 0), `${p.id}: u x v = -n, as the house's boards`);
    }
  }
});

// ─── AFTER THE REVIEW (verify:bomcnc:1): ONE LAYER, ONE DEPTH ──────────────
// The DXF carries a circle and its layer, never a depth (engine/cnc/dxf.js);
// the shop sets the depth per layer. The house's cup layer FRONT_HINGES_35MM
// is 11 deep (profile.editor.drillDefaults, the owner's measured cup), and the
// HAWA cup is 13 (160704 section C - C): on one layer one of the two was bored
// wrong. So the HAWA door's three holes take layers of their own whose NAMES
// carry their depth, the house's grammar for a depth-bearing layer
// (engine/frontDecoration.js `FRONT_{KIND}_D{depth}`): FRONT_HINGES_35MM_D13,
// FRONT_HINGES_5MM_D13, FRONT_HINGES_8MM_D13 (KIT_HAWA.lsp D15).
test('F5 · after the review: every layer of a front sheet with a house door and a HAWA door carries ONE depth, and the door\'s say it', () => {
  const pocket = computeCabinet(ONE_DOOR(), P);
  const bud = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', doors: true, hinge: 'L' }, P);
  const L5 = hawaLayers(P);
  for (const [key, layer, depth] of [['cup', 'FRONT_HINGES_35MM_D13', 13], ['screw', 'FRONT_HINGES_5MM_D13', 13], ['sleeve', 'FRONT_HINGES_8MM_D13', 13]]) {
    assert.equal(L5[key], layer);
    assert.match(layer, new RegExp(`_D${depth}$`), `${layer}: the name carries the ${depth}`);
    assert.notEqual(cncLayer(layer).label, 'Other', `${layer} is in the CNC layer table`);
    assert.ok(machiningClasses().some((c) => c.layer === layer && c.draw), `${layer} has its machining class`);
    assert.ok(read('verify/t26/sheet-vs-scene.md').includes(`\`${layer}\``), `${layer} in verify/t26/sheet-vs-scene.md`);
  }
  // The pocket door drills nothing on a house layer; the house door drills nothing on a HAWA one.
  const door = pocket.drills.filter((x) => x.panel === 'POCKET-DOOR');
  assert.ok(door.length > 0);
  assert.ok(door.every((x) => /_D13$/.test(x.layer) && x.depth === 13), 'every hole of the door on a layer named for its 13');
  assert.ok(!pocket.drills.some((x) => ['FRONT_HINGES_35MM', 'FRONT_HINGES_3MM', 'FRONT_HINGES_5MM', 'FRONT_HINGES_8MM'].includes(x.layer)));
  const budCups = bud.drills.filter((x) => x.kind === 'cup');
  assert.ok(budCups.length > 0 && budCups.every((x) => x.layer === 'FRONT_HINGES_35MM' && x.depth === 11), 'the house cups: FRONT_HINGES_35MM, 11, as they were');
  // One front sheet: every layer one depth, so the shop's per-layer depth is right for every hole on it.
  const depths = new Map();
  for (const x of [...pocket.drills, ...bud.drills]) {
    if (!depths.has(x.layer)) depths.set(x.layer, new Set());
    depths.get(x.layer).add(x.depth ?? 'through');
  }
  for (const [layer, set] of depths) assert.equal(set.size, 1, `${layer} carries ${[...set].join(' and ')}`);
  // The file the machine gets: the HAWA door's circles on the D13 layers, declared with their own colours.
  const file = buildUnitDxfFiles(pocket, P).find((f) => f.panelId === 'POCKET-DOOR');
  const circleLayers = new Set(file.entities.filter((e) => e.type === 'circle').map((e) => e.layer));
  assert.deepEqual([...circleLayers].sort(), ['FRONT_HINGES_35MM_D13', 'FRONT_HINGES_5MM_D13', 'FRONT_HINGES_8MM_D13']);
  assert.doesNotMatch(file.dxf, /\r\nFRONT_HINGES_35MM\r\n/, 'the house\'s cup layer is not in the HAWA door\'s file');
});

test('F5 · FROZEN 2: no existing case drills a HAWA layer or kind, routes a HAWA groove, or seats a pocket board', () => {
  const own = new Set(['HAWA_3MM', 'FRONT_HINGES_5MM_D13', 'FRONT_HINGES_8MM_D13', 'HAWA_FOOT_35MM', 'HAWA_GROOVE_12MM', 'FRONT_HINGES_35MM_D13']);
  for (const c of cases().filter((x) => !String(x.id).startsWith('HAWA_POCKET'))) {
    const r = computeCabinet(c.params, P);
    assert.ok(!r.drills.some((x) => own.has(x.layer) || /^hawa_/.test(x.kind)), `${c.id} carries a HAWA hole`);
    assert.ok(!r.panels.some((p) => (p.cnc?.pockets || []).some((k) => own.has(k.layer))), `${c.id} carries a HAWA groove`);
    assert.ok(!r.drills.some((x) => x.layer === 'FRONT_HINGES_35MM' && Number(x.depth) === 13), `${c.id}: the house's cups keep their own depth`);
  }
});

test('F4 · the new files: the Skylon header, no dash', () => {
  for (const rel of ['src/engine/cnc/hawa.js', 'test/turn82-f04-hawa-bom-cnc.test.js']) {
    assert.ok(read(rel).startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.'), rel);
    assert.doesNotMatch(read(rel), DASH, `${rel}: no em or en dash`);
  }
});
