/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F6 / F7 · THE HAWA DOOR IN THE ROOM, CLOSED AND OPEN, AND ON THE SHEETS
//
// The owner, 25.10.2026 (11:40): *"wysuwasz pocket door i zakrywasz szafke lub
// szafki"*. CLAUDE.md T82 F6: "open = the door rotated 90 degrees about its
// hinge edge and translated E1 into the pocket, its leading edge M proud";
// F7: "The fronts sheet (T81) draws the closed door over the pocket and the
// covered units, 3 proud, with the hinge bars on its hinge edge (T81 F3's bar
// at the cup's y); the no-fronts sheet lifts it and shows the pocket's two
// panels; the plan cuts the pocket and draws the open door dashed (HIDDEN)
// inside it; the section through the pocket shows T1 and the tracks' zones
// (22 and 41 lines). Dimensions: TB and M on the plan."
//
// The pocket is the engine's (A2's HAWA_POCKET, KIT_HAWA.lsp's worked
// EXAMPLE 1 and EXAMPLE 2, read from their goldens): every figure below is
// read off `result.hawa`, never typed here but where the LISP's NUMBERS name
// it (TB 572.5, M 100.5, the door shut x 25 to 597.5, open x 42 to 60, z 108
// to 680.5).
//
// THE PARTS THAT NEED ANOTHER SLICE'S FILE. The `[F7 projector]` tests read
// `engine/drawings/projector.js` and `setPlan.js` (E3's files) with A5's
// patches `F7-A5-to-E3-projector.diff` and `F7-A5-to-E3-setPlan.diff`
// applied; they skip, saying so, until they are. Every other test runs on
// A5's own files.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { projectRun, runSolids } from '../src/engine/drawings/projector.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { buildPlan } from '../src/engine/drawings/setPlan.js';
import { buildStation, sectionStations } from '../src/engine/drawings/setSection.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { wallGapOf } from '../src/engine/runs.js';
import { rectCorners } from '../src/engine/room.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  EJECTOR_PICTURE_HEIGHT_MM, pocketDoorGeometry, pocketDoorHoles, pocketDoorPose, pocketHardwareBoxes,
} from '../src/engine/pocketDoorPose.js';

const P = () => getCabinetProfile();
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const golden = (name) => JSON.parse(read(`../verify/t82/goldens/${name}`)).params.unit;

// KIT_HAWA.lsp EXAMPLE 1: one door, hand R (the pocket at the run's left end,
// its door over the BUD 500 on its right), an 18 front (panels 22), H 2100.
const ONE = () => golden('golden-hawa-pocket-1door.json');
// EXAMPLE 2: two doors in one 110 pocket, a 19 front, 450 a side on a 600 run.
const TWO = () => golden('golden-hawa-pocket-2door.json');
// EXAMPLE 1 mirrored: the pocket at the run's right end, its door over the unit on its left.
const ONE_L = () => {
  const u = ONE();
  return {
    ...u,
    pocket: { ...u.pocket, hand: 'L', covers: ['a'] },
    pocket_cover: { doors: u.pocket_cover.doors.map((d) => ({ ...d, side: 'L', units: ['a'] })) },
  };
};
const cut = (params) => computeCabinet(params, P());
const rigOf = (r, id) => pocketDoorGeometry(r, P()).doors.find((d) => d.doorId === id);

// ═══ F6 · THE POSE ═════════════════════════════════════════════════════════

test('F6 · shut, the door is the engine\'s closed box: no turn, no slide, 3 in front of the pocket', () => {
  const r = cut(ONE());
  const g = pocketDoorGeometry(r, P());
  assert.ok(g, 'a pocket with its door has a rig');
  const d = g.doors[0];
  assert.equal(d.doorId, 'POCKET-DOOR');
  const pose = pocketDoorPose(d, 0);
  assert.equal(pose.angle, 0);
  assert.equal(pose.slideZ, 0);
  const c = r.hawa.doors[0].closed;
  assert.deepEqual(pose.rect, { x0: c.x, x1: c.x + c.w, z0: c.z, z1: c.z + c.d });
  // The LISP's NUMBERS: door shut x 25 to 597.5, z 583 to 601.
  assert.deepEqual(pose.rect, { x0: 25, x1: 597.5, z0: 583, z1: 601 });
  const B = r.panels.find((p) => p.part === 'POCKET-B');
  assert.equal(pose.rect.z0, B.box.z + B.box.d + 3, '3 in front of panel B\'s front edge, the pocket\'s front plane');
});

test('F6 · open, the door IS the engine\'s open box: a quarter turn, E1 back, M proud', () => {
  const r = cut(ONE());
  const f = r.hawa.doors[0];
  const d = rigOf(r, 'POCKET-DOOR');
  assert.equal(d.hinge, 'L', 'hung on its left edge, the pocket\'s side (hingeEdge, seen from the room)');
  const pose = pocketDoorPose(d, 1);
  assert.ok(near(pose.angle, -Math.PI / 2), 'turned a quarter, its back toward panel B');
  const o = f.open;
  assert.deepEqual(pose.rect, { x0: o.x, x1: o.x + o.w, z0: o.z, z1: o.z + o.d }, 'exactly hawa-door-open');
  // The LISP's NUMBERS: open x 42 to 60, z 108 to 680.5.
  assert.deepEqual(pose.rect, { x0: 42, x1: 60, z0: 108, z1: 680.5 });
  assert.equal(pose.slideZ, -f.E1, 'slid E1, the engine\'s E1');
  const B = r.panels.find((p) => p.part === 'POCKET-B');
  assert.equal(B.box.x - pose.rect.x1, P().hawa.hardwareZoneMm, 'the 17 hardware zone between B and the door\'s back');
  assert.ok(near(pose.leadingEdge[1], d.zf + f.M), 'its free edge M in front of the front plane');
  assert.ok(near(pose.hingeEdge[1], d.zf - f.E1), 'its hinge edge E1 behind it');
  assert.equal(d.zf, r.hawa.KT, 'the front plane is the pocket\'s KT');
});

test('F6 · the two phases: turned and not yet slid at the half, then straight back along the pocket', () => {
  const r = cut(ONE());
  const f = r.hawa.doors[0];
  const d = rigOf(r, 'POCKET-DOOR');
  const half = pocketDoorPose(d, 0.5);
  assert.ok(near(half.angle, -Math.PI / 2));
  assert.equal(half.slideZ, 0);
  assert.deepEqual([half.rect.x0, half.rect.x1], [f.open.x, f.open.x + f.open.w], 'already in its slot');
  assert.deepEqual([half.rect.z0, half.rect.z1], [d.zf, d.zf + f.TB], 'its hinge edge on the front plane, the whole TB in front');
  assert.ok(near(pocketDoorPose(d, 0.25).angle, -Math.PI / 4), 'half way round at a quarter');
  const three = pocketDoorPose(d, 0.75);
  assert.equal(three.slideZ, -f.E1 / 2, 'half of E1 at three quarters');
  assert.deepEqual([three.rect.x0, three.rect.x1], [f.open.x, f.open.x + f.open.w], 'the slide is straight back');
});

test('F6 · the pose is rigid: the door keeps its TB x S at every moment', () => {
  const r = cut(ONE());
  const f = r.hawa.doors[0];
  const d = rigOf(r, 'POCKET-DOOR');
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let i = 0; i <= 20; i += 1) {
    const { corners } = pocketDoorPose(d, i / 20);
    assert.ok(near(len(corners[0], corners[1]), f.TB, 1e-4), `TB at t ${i / 20}`);
    assert.ok(near(len(corners[1], corners[2]), f.S, 1e-4), `S at t ${i / 20}`);
  }
});

test('F6 · the turn never takes a corner of the door into panel A', () => {
  const r = cut(ONE());
  const d = rigOf(r, 'POCKET-DOOR');
  const A = r.panels.find((p) => p.part === 'POCKET-A').box;
  for (let i = 0; i <= 40; i += 1) {
    const { corners } = pocketDoorPose(d, i / 40);
    for (const [x, z] of corners) {
      assert.ok(!(x < A.x + A.w - 1e-6 && z < A.z + A.d - 1e-6), `t ${i / 40}: corner ${x}, ${z} inside panel A`);
    }
  }
});

test('F6 · mirrored: a pocket at the run\'s right end hangs its door on the right edge and turns the other way', () => {
  const r = cut(ONE_L());
  const f = r.hawa.doors[0];
  const d = rigOf(r, f.id);
  assert.equal(d.hinge, 'R');
  const pose = pocketDoorPose(d, 1);
  assert.ok(near(pose.angle, Math.PI / 2));
  assert.deepEqual(pose.rect, { x0: f.open.x, x1: f.open.x + f.open.w, z0: f.open.z, z1: f.open.z + f.open.d });
  const B = r.panels.find((p) => p.part === 'POCKET-B').box;
  assert.equal(pose.rect.x0 - (B.x + B.w), P().hawa.hardwareZoneMm, 'its back 17 off panel B, now on the left');
});

test('F6 · two doors in one 110 pocket: each into its own slot beside its own panel B, never touching', () => {
  const r = cut(TWO());
  const g = pocketDoorGeometry(r, P());
  assert.deepEqual(g.doors.map((d) => d.doorId).sort(), ['POCKET-DOOR-L', 'POCKET-DOOR-R']);
  const L = pocketDoorPose(rigOf(r, 'POCKET-DOOR-L'), 1).rect;
  const R = pocketDoorPose(rigOf(r, 'POCKET-DOOR-R'), 1).rect;
  for (const [rect, id] of [[L, 'POCKET-DOOR-L'], [R, 'POCKET-DOOR-R']]) {
    const o = r.hawa.doors.find((f) => f.id === id).open;
    assert.deepEqual(rect, { x0: o.x, x1: o.x + o.w, z0: o.z, z1: o.z + o.d }, `${id} lands on hawa-door-open`);
  }
  const bL = r.panels.find((p) => p.id === 'POCKET-B-L').box;
  const bR = r.panels.find((p) => p.id === 'POCKET-B-R').box;
  assert.equal(L.x0 - (bL.x + bL.w), 17, 'the left door 17 off the left B');
  assert.equal(bR.x - R.x1, 17, 'the right door 17 off the right B');
  assert.ok(L.x1 < R.x0, `air between them: ${R.x0 - L.x1}`);
  assert.ok(near(rigOf(r, 'POCKET-DOOR-L').theta, Math.PI / 2) && near(rigOf(r, 'POCKET-DOOR-R').theta, -Math.PI / 2), 'turning away from each other');
});

test('F6 · a door with no figures, or a profile with no HAWA numbers, is never moved by a guess', () => {
  const r = cut(ONE());
  assert.equal(pocketDoorGeometry({ ...r, hawa: null }, P()), null);
  assert.equal(pocketDoorGeometry(r, { ...P(), hawa: undefined }), null);
  // A bare pocket (no cover) has no door, so nothing to move.
  const bare = computeCabinet({ ...defaultParamsFor('HAWA_POCKET', P()), unit_num: 'HP01' }, P());
  assert.equal(pocketDoorGeometry(bare, P()), null);
});

test('F6 · the cups on the door\'s back, where the engine drills them (TA from the hinge edge, at cupY)', () => {
  const r = cut(ONE());
  const f = r.hawa.doors[0];
  const g = pocketDoorGeometry(r, P());
  const { holes, cups } = pocketDoorHoles(g.doors[0], g.numbers);
  assert.equal(cups.length, f.hinges, 'one cup per hinge, the count the engine gives (III/25: 3)');
  assert.equal(holes.length, f.holes.length, 'every hole the engine states');
  for (const [i, c] of cups.entries()) {
    assert.equal(c.x, f.closed.x + f.TA, `TA ${f.TA} from the hinge edge`);
    assert.equal(c.y, f.closed.y + f.cupY[i], 'at the engine\'s cup height');
    assert.equal(c.z, f.closed.z, 'on the back face');
    assert.equal(c.d, P().hawa.hinge.cupDiaMm);
  }
  // The mirrored door counts TA from its right edge.
  const m = pocketDoorGeometry(cut(ONE_L()), P());
  const fm = m.doors[0].figures;
  for (const c of pocketDoorHoles(m.doors[0], m.numbers).cups) assert.equal(c.x, fm.closed.x + fm.closed.w - fm.TA);
});

test('F6 · the symbols: the two hardware zones on B, the profile 17 x 60 between them, the ejector for Push', () => {
  const r = cut(ONE());
  const H = P().hawa;
  const f = r.hawa.doors[0];
  const B = r.panels.find((p) => p.part === 'POCKET-B').box;
  const boxes = pocketHardwareBoxes(pocketDoorGeometry(r, P()));
  const by = (k) => boxes.find((b) => b.kind === k);
  const front = r.hawa.KT - H.depth.trackStartMm;
  const top = by('zoneTop'); const bottom = by('zoneBottom');
  assert.deepEqual([top.x0, top.x1], [B.x - H.hardwareZoneMm, B.x], 'in the 17 beside panel B');
  assert.deepEqual([top.y0, top.y1], [B.y + B.h - H.zoneTopMm, B.y + B.h], 'the top zone, 63 below B\'s top edge');
  assert.deepEqual([bottom.y0, bottom.y1], [B.y, B.y + H.zoneBottomMm], 'the bottom zone, 50 above its bottom edge');
  assert.deepEqual([top.z0, top.z1], [front - f.trackMm, front], 'as long as the track, from 5 behind the front edge');
  assert.ok(!top.slides && !bottom.slides, 'screwed to B: they stay');
  // T82 F6, after the review (roomsheets 1): the ejector is ON the vertical profile at mid height
  // (hawa-numbers.md 5, 160704 p1 Push side view), so the profile runs below and above it and the three
  // share the one 17 x 60 section between the zones.
  const profs = boxes.filter((b) => b.kind === 'profile');
  const ej = by('ejector');
  assert.ok(ej && ej.slides, 'Push: the ejector, on the carriage');
  for (const b of [...profs, ej]) {
    assert.deepEqual([b.x0, b.x1], [B.x - H.profileSymbolMm.w, B.x], 'in the 17 beside panel B');
    assert.deepEqual([b.z0, b.z1], [front - H.profileSymbolMm.d, front], 'the profile\'s own 60 at the front of the track');
    assert.ok(b.slides, 'it rides the carriage with the door');
  }
  const ys = [...profs, ej].map((b) => [b.y0, b.y1]).sort((a, b) => a[0] - b[0]);
  assert.equal(ys[0][0], bottom.y1, 'from the bottom zone');
  assert.equal(ys[ys.length - 1][1], top.y0, 'to the top zone');
  for (let i = 1; i < ys.length; i += 1) assert.equal(ys[i][0], ys[i - 1][1], 'one profile, the ejector a length of it');
  assert.equal(ej.y1 - ej.y0, EJECTOR_PICTURE_HEIGHT_MM);
  assert.ok(near((ej.y0 + ej.y1) / 2, (bottom.y1 + top.y0) / 2), 'at the profile\'s mid height');
  const pull = cut({ ...ONE(), pocket: { ...ONE().pocket, push: false } });
  const pullBoxes = pocketHardwareBoxes(pocketDoorGeometry(pull, P()));
  assert.equal(pullBoxes.filter((b) => b.kind === 'ejector').length, 0, 'Pull: no ejector');
  const pullProf = pullBoxes.filter((b) => b.kind === 'profile');
  assert.deepEqual(pullProf.map((b) => [b.y0, b.y1]), [[bottom.y1, top.y0]], 'Pull: the profile whole, between the zones');
});

test('F6, after the review (roomsheets 1) · open, the carriage stays on its track and inside the pocket: material never enters material', () => {
  const H = P().hawa;
  const ex1 = ONE();
  // The reviewer's second case: a BUD 450 x 2000, 560 deep (T1 560, E1 465, the track 553).
  const shallow = { ...ex1, height: 2000, pocket_cover: { doors: ex1.pocket_cover.doors.map((d) => ({ ...d, spanMm: 450, KT1: 560 })) } };
  for (const [name, params] of [['EXAMPLE 1', ex1], ['EXAMPLE 2', TWO()], ['450 x 2000 x 560', shallow], ['EXAMPLE 1 mirrored', ONE_L()]]) {
    const r = cut(params);
    const g = pocketDoorGeometry(r, P());
    for (const b of pocketHardwareBoxes(g).filter((x) => x.slides)) {
      const d = g.doors.find((x) => x.doorId === b.doorId);
      const front = d.zf - H.depth.trackStartMm;
      for (let i = 0; i <= 20; i += 1) {
        const slide = pocketDoorPose(d, i / 20).slideZ;
        const z0 = b.z0 + slide; const z1 = b.z1 + slide;
        assert.ok(z0 >= front - d.trackMm - 1e-6, `${name} ${b.id} at t ${i / 20}: back ${z0} behind the track's end ${front - d.trackMm}`);
        assert.ok(z0 >= 0, `${name} ${b.id} at t ${i / 20}: back ${z0} out of the pocket's back`);
        assert.ok(z1 <= front + 1e-6, `${name} ${b.id} at t ${i / 20}: in front of the track's start`);
      }
    }
  }
});

test('F6 · the room carries the leaf by the one pose and re-derives no HAWA figure (PocketDoor.jsx)', () => {
  const src = read('../src/3d/PocketDoor.jsx');
  assert.match(src, /from '\.\.\/engine\/pocketDoorPose\.js'/);
  assert.match(src, /pocketDoorPose\(rig, amount\.current\)/, 'every frame from the pose');
  assert.doesNotMatch(src, /\b92\b|\b567\b|TB\s*-\s*M|E1\s*=/, 'no HAWA formula typed in the room');
  assert.match(src, /ccPocketDoor/, 'the walk can find the door\'s carriage');
});

test('F6 · the toggle: one press over the pocket\'s door(s) in the room\'s own openFronts; Open all and the right panel ride it', () => {
  const ui = useUiStore.getState();
  ui.togglePocketDoor('hp', ['POCKET-DOOR-L', 'POCKET-DOOR-R']);
  assert.deepEqual(useUiStore.getState().openFronts.hp, { 'POCKET-DOOR-L': 1, 'POCKET-DOOR-R': 1 }, 'any shut: all open');
  ui.togglePocketDoor('hp', ['POCKET-DOOR-L', 'POCKET-DOOR-R']);
  assert.deepEqual(useUiStore.getState().openFronts.hp, { 'POCKET-DOOR-L': 0, 'POCKET-DOOR-R': 0 }, 'all open: all shut');
  ui.toggleFront('hp', 'POCKET-DOOR-L');
  ui.togglePocketDoor('hp', ['POCKET-DOOR-L', 'POCKET-DOOR-R']);
  assert.deepEqual(useUiStore.getState().openFronts.hp, { 'POCKET-DOOR-L': 1, 'POCKET-DOOR-R': 1 }, 'one open by hand, the press opens the other');
  ui.closeAllFronts();
  const bar = read('../src/components/CanvasToolbar.jsx');
  assert.match(bar, /p\.part === 'FRONT' \|\| p\.part === 'POCKET-DOOR'/, 'Open all takes the HAWA door');
  const panel = read('../src/components/RightPanel.jsx');
  assert.match(panel, /function PocketDoorToggle/);
  assert.match(panel, /data-pocket-door-open=\{open \? '1' : '0'\}/, 'the walk reads the state off the row');
  assert.match(panel, /unitResult\(unit\.id\)\?\.hawa\?\.doors/, 'the doors are the engine\'s');
  assert.match(panel, /togglePocketDoor\(unit\.id, ids\)/);
});

// ═══ F7 · THE SHEETS ═══════════════════════════════════════════════════════

const ctx = () => drawingContext(20, P());

/** The stage: the EXAMPLE 1 pocket at x 1000 on wall A, and the BUD 500 it covers on its right. */
function stage(params = ONE()) {
  const first = cut(params);
  const gap = (Number(P().room?.wallBackClearance) || 0) + (Number(first.hawa.frontAlignMm) || 0);
  const pocket = {
    id: 'hp', type: 'HAWA_POCKET', position: { wall: 0, x_mm: 1000 },
    params: { ...params, width: first.hawa.widthMm, depth: first.hawa.KT, wall_gap: gap },
  };
  const result = cut(pocket.params);
  const budParams = {
    ...defaultParamsFor('BUD', P()), width: 500, depth: 580, unit_num: '02',
    doors: { count: 1, hinge: 'L' }, pocket_covered: { pocketId: 'hp', unitNum: 'HP01' },
  };
  // The BUD on the side the door covers: right of the pocket for hand R, left of it for hand L.
  const budX = params.pocket?.hand === 'L' ? 1000 - budParams.width : 1000 + first.hawa.widthMm;
  const bud = { id: 'b', type: 'BUD', position: { wall: 0, x_mm: budX }, params: budParams };
  const entries = [{ unit: pocket, result }, { unit: bud, result: cut({ type: 'BUD', ...budParams }) }];
  const group = wallGroups(entries, P())[0];
  return { entries, group, m: group.members.find((x) => x.unit.id === 'hp'), result, f: result.hawa.doors[0] };
}

// Is the F7 patch on the projector? The door is then a FRONT of the sheets.
const PATCHED = (() => {
  const { group } = stage();
  return runSolids(group, { profile: P() }).solids.some((s) => s.panelId === 'POCKET-DOOR' && s.front);
})();
const F7 = { skip: PATCHED ? false : 'needs A5\'s F7 patch on engine/drawings/projector.js and setPlan.js (E3)' };

test('F7 · the stage: the covered BUD has no door of its own (the HAWA door is its door)', () => {
  const { entries } = stage();
  const bud = entries.find((e) => e.unit.id === 'b').result;
  assert.equal(bud.panels.filter((p) => p.part === 'FRONT').length, 0);
});

test('[F7 projector] the fronts sheet: the shut door over the pocket and the cabinet it covers, 3 proud, in the doors\' ink, in the run\'s finish', F7, () => {
  const { group, m, f } = stage();
  const sheet = projectRun(group, { view: 'front', mode: 'fronts', profile: P() });
  const solid = sheet.solids.find((s) => s.panelId === 'POCKET-DOOR');
  assert.ok(solid.front, 'a front of the sheets');
  const door = sheet.entities.filter((e) => e.src === `${m.unit.id}:POCKET-DOOR` && e.layer === 'DOORS');
  const rect = door.find((e) => e.kind === 'rect' && near(e.w, f.TB));
  assert.ok(rect && near(rect.x, m.x + f.closed.x), 'one rectangle, the whole TB: over B, the gap and the BUD');
  // AMENDED (T82 F7, after the review; E3, the projector's owner): the door wears the run's finish (A2:
  // its meta.frontType and shaker recess), *"the door in the front finish of the run"* (CLAUDE.md T82 F6),
  // so on this shaker run the leaf is one rectangle and the shaker's field is drawn inside it, as on a front.
  assert.equal(door.filter((e) => e.kind === 'rect' && near(e.w, f.TB)).length, 1, 'one leaf, the whole TB');
  assert.ok(door.filter((e) => e.kind === 'rect').length > 1, 'and its shaker field, as the room cuts it');
  const B = sheet.solids.find((s) => s.part === 'POCKET-B');
  // INT (T82 F7, after A4's F5): joinery.js panelPlacement seats panel B as a side (BUL / BUR), so the
  // projector extrudes it along x, its thickness, with its depth in the outline's first coordinate; the
  // pocket's front plane is B's depth at its front edge either way.
  const [pb] = B.prisms;
  const frontPlane = pb.axis === 2 ? pb.hi : Math.max(...pb.outline.map(([z]) => z));
  assert.ok(near(solid.prisms[0].lo, frontPlane + 3), '3 in front of the pocket\'s front plane');
});

test('[F7 projector] the hinge bars on the door\'s hinge edge, one per cup, at the engine\'s cup heights', F7, () => {
  const { group, m, f } = stage();
  const sheet = projectRun(group, { view: 'front', mode: 'fronts', profile: P() });
  const bars = sheet.entities.filter((e) => e.layer === 'HINGE_MARK' && e.src === `${m.unit.id}:POCKET-DOOR`);
  assert.equal(bars.length, f.hinges, 'one bar per hinge, the count the engine gives');
  const { width, height } = P().drawings.hingeBar;
  for (const cy of f.cupY) {
    const bar = bars.find((b) => near(b.y + b.h / 2, m.base + f.closed.y + cy, 0.01));
    assert.ok(bar, `a bar centred on the cup at ${m.base + f.closed.y + cy}`);
    assert.deepEqual([bar.w, bar.h], [width, height]);
    assert.ok(near(bar.x, m.x + f.closed.x), 'on the hinge edge, the pocket\'s side');
  }
});

test('[F7 projector] the no-fronts sheet lifts the door and shows the pocket\'s two panels', F7, () => {
  const { group, m } = stage();
  const sheet = projectRun(group, { view: 'front', mode: 'no-fronts', profile: P() });
  assert.equal(sheet.entities.filter((e) => e.src === `${m.unit.id}:POCKET-DOOR`).length, 0, 'the door is lifted');
  for (const id of ['POCKET-A', 'POCKET-B']) {
    assert.ok(sheet.entities.some((e) => e.src === `${m.unit.id}:${id}` && e.kind !== 'poly'), `${id} is drawn`);
  }
  assert.equal(sheet.entities.filter((e) => e.layer === 'HINGE_MARK' && e.src.startsWith(`${m.unit.id}:`)).length, 0, 'no bars with the door off');
});

test('[F7 projector] the plan: the open door dashed inside the pocket, TB and M', F7, () => {
  const { entries, m, f } = stage();
  const room = { corners: rectCorners(4000, 3000), height: 2500 };
  const plan = buildPlan(entries, { which: 'base', room, profile: P(), ctx: ctx() });
  const ghost = plan.entities.filter((e) => e.meta === 'pocket-door-open');
  assert.equal(ghost.length, 4, 'one rectangle of four lines');
  for (const e of ghost) {
    assert.equal(e.layer, 'DOORS');
    assert.equal(e.pen, 'HIDDEN');
    assert.ok(e.hidden && !e.solid, 'dashed');
  }
  const xs = ghost.flatMap((e) => [e.x1, e.x2]); const ys = ghost.flatMap((e) => [e.y1, e.y2]);
  const gap = wallGapOf(m.unit, P());
  assert.deepEqual([Math.min(...xs), Math.max(...xs)], [m.x + f.open.x, m.x + f.open.x + f.open.w], 'in the slot, inside the pocket');
  assert.deepEqual([Math.min(...ys), Math.max(...ys)], [gap + f.open.z, gap + f.open.z + f.open.d], 'E1 in, M out');
  const words = plan.entities.filter((e) => e.kind === 'text').map((e) => e.text);
  assert.ok(words.includes('TB 572.5'), `TB on the plan: ${words.filter((w) => /TB|M /.test(w))}`);
  assert.ok(words.includes('M 100.5'), 'M on the plan');
});

test('F7 · the section through the pocket: the tracks\' two axes (22 and 41), each the track\'s length, and T1', () => {
  const { group, m, f, result } = stage();
  const st = sectionStations(group).find((s) => s.member === m);
  assert.ok(st, 'the run is cut through its pocket too');
  const A = result.panels.find((p) => p.part === 'POCKET-A').box;
  const B = result.panels.find((p) => p.part === 'POCKET-B').box;
  assert.ok(st.x > m.x + A.x + A.w && st.x < m.x + B.x, 'through its clear space');
  const one = buildStation(group, st, { profile: P(), ctx: ctx() });
  const top = one.entities.find((e) => e.meta === 'hawa-track-top');
  const bottom = one.entities.find((e) => e.meta === 'hawa-track-bottom');
  assert.ok(top && bottom, 'both tracks drawn');
  const H = P().hawa;
  assert.equal(top.y1, m.base + B.y + B.h - H.holes.b.topAxisMm, 'the top track\'s axis 22 below B\'s top edge');
  assert.equal(bottom.y1, m.base + B.y + H.holes.b.bottomAxisMm, 'the bottom track\'s axis 41 above its bottom edge');
  const front = wallGapOf(m.unit, P()) + result.hawa.KT;
  assert.deepEqual([Math.min(top.x1, top.x2), Math.max(top.x1, top.x2)],
    [front - H.depth.trackStartMm - f.trackMm, front - H.depth.trackStartMm], 'the track\'s length (T1 - 7) from 5 behind the front edge');
  assert.ok(one.entities.some((e) => e.kind === 'text' && e.text === `T1 ${f.T1}`), 'T1 on the section');
});

test('F7, after the review (roomsheets 3) · the section draws the tracks on panel B as seen: solid where B is beyond the knife, dashed and said where it is behind it', () => {
  const H = P().hawa;
  for (const [name, params] of [['hand R (B beyond the knife)', ONE()], ['hand L (B behind the knife)', ONE_L()]]) {
    const { group, m, result } = stage(params);
    const st = sectionStations(group).find((s) => s.member === m);
    assert.ok(st, `${name}: a station through the pocket`);
    const B = result.panels.find((p) => p.part === 'POCKET-B').box;
    const one = buildStation(group, st, { profile: P(), ctx: ctx() });
    // What the projector itself decided about panel B on this station: drawn, or not.
    const bSeen = one.entities.some((e) => e.src === `${m.unit.id}:POCKET-B` && e.layer !== 'MASK');
    assert.equal(bSeen, m.x + B.x >= st.x, `${name}: the projector draws B only beyond the knife`);
    const tracks = one.entities.filter((e) => e.meta === 'hawa-track-top' || e.meta === 'hawa-track-bottom');
    assert.equal(tracks.length, 2, `${name}: both tracks`);
    for (const t of tracks) {
      if (bSeen) {
        assert.ok(!t.hidden && t.pen === 'THIN', `${name}: ${t.meta} solid, on B's face as seen`);
      } else {
        assert.ok(t.hidden && !t.solid && t.pen === 'HIDDEN', `${name}: ${t.meta} dashed, B is behind the cut`);
      }
    }
    const words = one.entities.filter((e) => e.kind === 'text' && /TRACK/.test(e.text)).map((e) => e.text);
    assert.equal(words.length, 2);
    for (const w of words) {
      assert.equal(/BEHIND THE CUT/.test(w), !bSeen, `${name}: "${w}"`);
      assert.match(w, new RegExp(`^(TOP TRACK ${H.holes.b.topAxisMm}|BOTTOM TRACK ${H.holes.b.bottomAxisMm})`));
    }
  }
});
