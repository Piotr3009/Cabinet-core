// ─── T75 · F5 · THE WORKTOP TURNS THE CORNER, THE CUT-OUTS, THE UPSTAND ─────
//
// CLAUDE.md T75 F5: *"`worktop.js worktopsFor` accepts two runs on adjacent
// walls: two slabs and ONE JOINT RECORD at the corner, `{ kind: 'butt', at,
// boltCount: 3 }` ... the slab on wall A runs through to the wall, the slab on
// wall B butts it; three worktop connector bolts as a hardware BOM line; the
// bolt pockets are a NOTE on the worktop drawing and readiness `manual`, never
// CNC. The L kit's worktop is one slab shaped like the L. CUT-OUTS as records
// on the worktop ... UPSTAND: an auto-part along the wall behind every base
// run that has a worktop."*
//
// The owner, 9.10.2026: *"daj od razu narożniki przemyślane."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { worktopEligible, worktopsFor, cutoutsFor } from '../src/engine/worktop.js';
import { buildBom } from '../src/engine/bom.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateDesign } from '../src/engine/design.js';
import { rectCorners, roomWalls } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);

function cornerKitchen() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().addUnit('BUD'); const a = S().units[0].id; S().moveUnit(a, 4000, 0);
  S().addUnit('SINK'); const sink = S().units[1].id; S().moveUnit(sink, 3000, 0);
  S().addUnit('BUD'); const b = S().units[2].id; S().setUnitWall(b, 1); S().moveUnit(b, 0, 0);
  return { a, sink, b };
}

test('F5 · the numbers are the profile\'s, in the worktop\'s own block, marked proposed', () => {
  const W = P.autoParts.worktop;
  assert.deepEqual(W.joint, { kind: 'butt', boltCount: 3 });
  assert.deepEqual(W.cutout, { insetMm: 20, radiusMm: 10 });
  assert.deepEqual(W.upstand, { heightMm: 100, thicknessMm: 20 });
  assert.equal(W.seatingMm, 300);
  assert.equal(W.cnc, false);
  const src = readFileSync(`${ROOT}src/engine/profile.js`, 'utf8');
  for (const key of ['joint:', 'cutout:', 'upstand:', 'seatingMm:']) {
    const at = src.indexOf(`      ${key}`);
    assert.ok(at > 0, key);
    assert.match(src.slice(at, src.indexOf('\n', at)), /T75 proposed, owner to confirm/, key);
  }
});

test('F5 · two runs on adjacent walls take ONE worktop: two slabs, ONE joint, A through to the wall', () => {
  const { a, sink, b } = cornerKitchen();
  const res = S().addWorktop([a, sink, b]);
  assert.ok(res.ok, res.error);
  const slabs = S().worktopsOf();
  assert.equal(slabs.length, 2);
  const [A, B] = slabs;
  assert.equal(A.slabId.endsWith('-A'), true);
  assert.equal(A.geometry.wall, 0);
  assert.equal(B.geometry.wall, 1);
  // A runs through to wall B (the end of wall 0); B butts A's front edge.
  assert.equal(A.geometry.x + A.geometry.w, 4000);
  assert.equal(B.geometry.x, A.geometry.d);
  assert.deepEqual(A.joint, B.joint, 'one joint record, shared');
  assert.equal(A.joint.kind, 'butt');
  assert.equal(A.joint.boltCount, 3);
  assert.equal(A.joint.readiness, 'manual');
  assert.match(A.joint.note, /3 connector bolts/);
  // Walls that do not meet still refuse, in words.
  const walls = roomWalls({ corners: rectCorners(4000, 3000) });
  const far = [U(a), { ...U(b), position: { wall: 2, x_mm: 100 } }];
  assert.match(worktopEligible(far, P, { walls }).why, /do not meet at a corner/);
});

test('F5 · a SINK under the slab proposes its cut-out: the opening inset 20, radius 10, a note, not CNC', () => {
  const { a, sink, b } = cornerKitchen();
  S().addWorktop([a, sink, b]);
  const A = S().worktopsOf().find((w) => w.geometry.wall === 0);
  assert.equal(A.cutouts.length, 1);
  const c = A.cutouts[0];
  const u = U(sink);
  const G = u.params.board_t;
  assert.equal(c.kind, 'sink');
  assert.equal(c.w, u.params.width - 2 * G - 40);
  assert.equal(c.d, u.params.depth - G - 40);
  assert.equal(c.r, 10);
  assert.equal(c.machined, false);
  assert.equal(c.readiness, 'manual');
  // A plain base unit proposes none.
  assert.equal(cutoutsFor([U(a)], A.geometry, P).length, 0);
});

test('F5 · the BOM: one line per slab, the bolts an order line, the joint and the cut-out NOTES', () => {
  const { a, sink, b } = cornerKitchen();
  S().addWorktop([a, sink, b]);
  const bom = buildBom(S().allResults(), { design: S().project.design, profile: P, room: S().project.room });
  const wt = bom.units.find((x) => x.unitId === 'worktops');
  assert.ok(wt, 'the worktop is not in the BOM');
  assert.equal(wt.rows.filter((r) => r.role === 'worktop').length, 2);
  assert.ok(wt.rows.some((r) => /NOTE: Sink cut-out/.test(r.material_label)));
  assert.ok(wt.rows.some((r) => /NOTE: Worktop joint: square butt/.test(r.material_label)));
  const bolts = bom.hardware.find((h) => h.role === 'worktop_bolts');
  assert.equal(bolts.qty, 3);
  assert.ok(bom.totals.worktop_area_m2 > 0);
  // No room handed in: the BOM every caller before tonight got.
  const old = buildBom(S().allResults(), { design: S().project.design, profile: P });
  assert.equal(old.units.some((x) => x.unitId === 'worktops'), false);
  assert.equal(old.totals.worktop_area_m2, undefined);
});

test('F5 · the record survives save and reload; an L unit\'s one-unit record is kept', () => {
  const kept = migrateDesign({ worktops: [{ id: 'w', unitIds: ['l'], kind: 'L' }] }).worktops;
  assert.equal(kept.length, 1);
  assert.equal(kept[0].kind, 'L');
  // …and a one-unit record without the kind is still dropped (T30).
  assert.equal(migrateDesign({ worktops: [{ id: 'w', unitIds: ['a'] }] }).worktops.length, 0);
});

test('F5 · the UPSTAND: a decision per run, one board on the worktop at the wall, worktop material', () => {
  const { a, sink, b } = cornerKitchen();
  S().addUpstand(a);
  const owner = [a, sink].map((id) => S().unitResult(id)).find((r) => r.panels.some((p) => p.role === 'upstand'));
  const up = owner.panels.find((p) => p.role === 'upstand');
  assert.equal(up.part, 'UPSTAND');
  assert.equal(up.h, 100);
  assert.equal(up.thickness, 20);
  assert.equal(up.w, 1200, 'one board over the run of two');
  assert.equal(up.material_role, 'worktop');
  assert.equal(up.box.y, U(a).params.height + P.autoParts.worktop.thickness, 'standing on the worktop');
  assert.ok(owner.csvLines.some((l) => l.includes('UPSTAND')), 'a cut list line');
  assert.equal(U(b).params.upstand, undefined, 'the run round the corner did not ask');
  S().removeUpstand(a);
  assert.equal([a, sink].some((id) => S().unitResult(id).panels.some((p) => p.role === 'upstand')), false);
  // No run element: a bare call cuts no upstand.
  const bare = computeCabinet({ ...defaultParamsFor('BUD', P), upstand: true }, P);
  assert.equal(bare.panels.some((p) => p.role === 'upstand'), false);
});

test('F5 · the plan sheet draws the L outline, the cut-outs and the joint', () => {
  const src = readFileSync(`${ROOT}src/engine/drawings/setPlan.js`, 'utf8');
  assert.match(src, /w\.outline/);
  assert.match(src, /w\.cutouts/);
  assert.match(src, /BUTT JOINT/);
});

test('F5 · worktopsFor without walls keeps T30\'s answer: a two-wall record is not resolved blind', () => {
  const { a, sink, b } = cornerKitchen();
  S().addWorktop([a, sink, b]);
  const records = migrateDesign(S().project.design).worktops;
  assert.equal(worktopsFor({ records, units: S().units, profile: P }).length, 0);
});
