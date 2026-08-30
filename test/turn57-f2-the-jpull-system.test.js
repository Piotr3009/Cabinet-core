import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { normaliseHandle } from '../src/engine/design.js';
import {
  HANDLE_TYPES, JPULL_EDGES, jpullSpec, jpullEdgeOf, jpullSheetEdge,
  jpullRunOf, jpullEdgeHeight, jpullNoteText, resolveJpull, resolveHandle,
} from '../src/engine/handles.js';
import { lispConstant } from '../scripts/t57-paren-balance.mjs';

// ─── TURN 57 · F2 — THE ENGINE: A HANDLE SYSTEM CALLED JPULL ───────────────
//
// THE DOCTRINE, which is the thing this turn most nearly got wrong. Two axes,
// never merged: FACE PATTERN (slab, shaker, grooved…) × HANDLE SYSTEM (handle,
// knob, none — and now J-PULL). A grooved door with a J edge must be possible,
// so the J lives on the HANDLE axis, in `engine/handles.js`, and not in a
// pattern registry.
//
// THE LAW IS THE LISP. `reference/lisp/KIT_FRONT_JPULL.lsp` states the owner's
// section and his table; the profile follows it and this file holds the two
// together by reading the kit off disk. Change 4.212 in the LISP and the
// profile has to move with it or this test fails — which is what "the engine
// follows" means when it is enforced rather than promised.

const JPULL = { type: 'jpull' };
const spec = jpullSpec(P);

const WARDROBE = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const BUD = { ...defaultParamsFor('BUD', P), unit_num: '01' };
const BUDR = { ...defaultParamsFor('BUDR', P), unit_num: '01' };
const WUD = { ...defaultParamsFor('WUD', P), unit_num: '01' };

const build = (params, over = {}) => computeCabinet({ ...params, ...over }, P);
const dressed = (params, over = {}) => build(params, { project_handle: JPULL, ...over });
const frontsOf = (r) => r.panels.filter((p) => p.role === 'front');

// ─── THE PROFILE IS THE LISP'S, NOT A SECOND COPY ──────────────────────────

test('F2 — every profile number is the kit\'s own number', () => {
  assert.equal(spec.lipT, lispConstant('jpullLipT'));
  assert.equal(spec.slotW, lispConstant('jpullSlotW'));
  assert.equal(spec.slotDepth, lispConstant('jpullSlotDepth'));
  assert.equal(spec.slotR, lispConstant('jpullSlotR'));
  assert.equal(spec.rearLeg, lispConstant('jpullRearLeg'));
  assert.equal(spec.reliefMm, lispConstant('jpullReliefMm'));
  assert.equal(spec.runMm, lispConstant('jpullRunMm'));
  assert.equal(spec.fromBottomMm, lispConstant('jpullFromBottomMm'));
  assert.equal(spec.rampR, lispConstant('jpullRampR'));
  // …and the section closes on the board the owner drew it on.
  assert.equal(spec.lipT + spec.slotW + spec.rearLeg, lispConstant('jpullBoardT'));
});

test('F2 — the profile is read the way doors.gap is read', () => {
  // A workshop overrides one number and every front follows; a profile that
  // says nothing gets the owner's own defaults.
  const own = jpullSpec({ handles: { jpull: { runMm: 320, fromBottomMm: 850 } } });
  assert.equal(own.runMm, 320);
  assert.equal(own.fromBottomMm, 850);
  assert.equal(own.lipT, 4.212, 'and the rest of the drawing still stands');
  assert.equal(jpullSpec(null).runMm, 500, 'no profile at all is still the owner\'s law');
});

test('F2 — jpull is a HANDLE SYSTEM the design layer accepts', () => {
  assert.ok(HANDLE_TYPES.some((t) => t.id === 'jpull'), 'the selector can offer it');
  assert.deepEqual(normaliseHandle({ type: 'jpull' }), { type: 'jpull' });
  assert.deepEqual(normaliseHandle({ type: 'jpull', centres: 128 }), { type: 'jpull' },
    'there is nothing to space — nothing is screwed on');
  assert.equal(normaliseHandle({ type: 'nonsense' }), null, 'and the gate still holds');
});

// ─── THE OWNER'S TABLE ─────────────────────────────────────────────────────

test('F2 — the edge table, every row', () => {
  assert.equal(jpullEdgeOf('base-door', 'L'), 'TOP', 'kitchen base doors: the TOP edge');
  assert.equal(jpullEdgeOf('base-door', 'R'), 'TOP', '…whichever way it is hung');
  assert.equal(jpullEdgeOf('horizontal', 'L'), 'TOP', 'ALL drawer fronts: the TOP edge');
  assert.equal(jpullEdgeOf('wall-door', 'L'), null, '"na szafkach wiszacych nie rob J"');
  assert.equal(jpullEdgeOf('wall-door', 'R'), null);
  assert.equal(jpullEdgeOf('tall-door', 'L'), 'R', 'tall: the edge OPPOSITE the hinge');
  assert.equal(jpullEdgeOf('tall-door', 'R'), 'L');
  assert.equal(jpullEdgeOf(null, 'L'), null, 'a front with no handle class takes no J');
});

test('F2 — a diagonal is unsayable, not merely forbidden', () => {
  const answers = new Set();
  for (const c of ['base-door', 'wall-door', 'tall-door', 'horizontal', 'nonsense']) {
    for (const h of ['L', 'R']) answers.add(jpullEdgeOf(c, h));
  }
  answers.delete(null);
  assert.deepEqual([...answers].sort(), ['L', 'R', 'TOP']);
  assert.deepEqual([...JPULL_EDGES].sort(), ['L', 'R', 'TOP']);
});

test('F2 — the ROOM edge and the SHEET edge are named apart and mirror', () => {
  // engine/joinery.js: the cut frame's origin is the leaf's bottom RIGHT and
  // x runs LEFT, so the two letters swap. T28-F2b is the scar.
  assert.equal(jpullSheetEdge('L'), 'R');
  assert.equal(jpullSheetEdge('R'), 'L');
  assert.equal(jpullSheetEdge('TOP'), 'TOP', 'the top edge is the top edge in both');
  assert.equal(jpullSheetEdge(null), null);
});

// ─── THE STOPPED RUN ───────────────────────────────────────────────────────

test('F2 — the run lands at 700–1200 on a standard tall leaf', () => {
  const run = jpullRunOf(2100, spec);
  assert.deepEqual(run, { from: 700, to: 1200, clamped: false });
});

test('F2 — a short leaf CLAMPS the run and says so', () => {
  const run = jpullRunOf(900, spec);
  assert.deepEqual(run, { from: 700, to: 900, clamped: true });
});

test('F2 — an edge that cannot take the run REFUSES, and never guesses', () => {
  assert.equal(jpullRunOf(700, spec), null, 'exactly at the start is not room for a run');
  assert.equal(jpullRunOf(400, spec), null);
  assert.equal(jpullRunOf(0, spec), null);
});

test('F2 — under a rake the run is measured on the J\'s OWN edge, not the tall one', () => {
  // The hinge is forced onto the tall edge, so the J is on the SHORT one. A
  // run measured against the leaf's tallest point would hang in the air.
  const leaf = { h: 2100, meta: { slopeCut: { roomL: 2100, roomR: 900 } } };
  assert.equal(jpullEdgeHeight(leaf, 'R'), 900, 'the short edge');
  assert.equal(jpullEdgeHeight(leaf, 'L'), 2100);
  assert.equal(jpullEdgeHeight({ h: 2100 }, 'R'), 2100, 'a flat leaf is its own height');
  assert.equal(jpullEdgeHeight(leaf, 'TOP'), 2100, 'a TOP run does not ask');
});

test('F2 — the sheet note says the edge, and the span where the run stops', () => {
  assert.equal(jpullNoteText('TOP', null), 'J-PULL TOP');
  assert.equal(jpullNoteText('L', { from: 700, to: 1200 }), 'J-PULL L 700-1200');
  assert.equal(jpullNoteText(null, null), null);
  // ASCII, upper case, no degree sign and no unit — the slope note's own form.
  assert.ok(/^[A-Z0-9 -]+$/.test(jpullNoteText('R', { from: 700, to: 1200 })));
});

// ─── THE RESOLVER, WHOLE ───────────────────────────────────────────────────

test('F2 — a resolved J-pull carries the profile and NO holes', () => {
  const r = resolveJpull({ panel: { h: 2100 }, handleClass: 'tall-door', hinge: 'L' }, P);
  assert.equal(r.system, 'jpull');
  assert.deepEqual(r.holes, [], 'nothing is drilled, ever');
  assert.equal(r.edge, 'R');
  assert.equal(r.sheetEdge, 'L');
  assert.deepEqual(r.run, { from: 700, to: 1200, clamped: false });
  assert.equal(r.note, 'J-PULL L 700-1200');
  assert.equal(r.profile.lipT, spec.lipT);
  assert.equal(r.profile.rampR, spec.rampR);
  assert.equal(r.profile.reachDepth, 45, '40 + 5, derived and not retyped');
});

test('F2 — a wall door resolves to NOTHING, and says which sentence made it so', () => {
  const r = resolveJpull({ panel: { h: 700 }, handleClass: 'wall-door', hinge: 'L' }, P);
  assert.equal(r.edge, null);
  assert.equal(r.note, null);
  assert.deepEqual(r.holes, []);
  assert.equal(r.reason, 'wall-door');
  assert.equal(r.problem, null, 'it is the law, not a fault');
});

test('F2 — resolveHandle answers the J FIRST, before any hardware arithmetic', () => {
  const panel = { role: 'front', part: 'FRONT', h: 2100 };
  const r = resolveHandle({
    panel, unitType: { heightGroup: 'tall', mount: 'floor' }, project: JPULL, hinge: 'L',
  }, P);
  assert.equal(r.system, 'jpull');
  assert.equal(r.type, 'jpull', 'and it never becomes a bar on the way past');
  assert.deepEqual(r.holes, []);
});

// ─── ON REAL CABINETS ──────────────────────────────────────────────────────

test('F2 — a jpull kitchen drills NO handle holes and buys NO handles', () => {
  const bare = build(BUD, { project_handle: { type: 'bar' } });
  const j = dressed(BUD);
  assert.ok(bare.drills.some((d) => d.kind === 'handle'), 'a bar kitchen does drill');
  assert.ok(bare.drillSummary.handles?.length, '…and publishes its placements');
  assert.equal(j.drills.filter((d) => d.kind === 'handle').length, 0, 'a J kitchen drills none');
  assert.equal(j.drillSummary.handles, undefined, 'and has no handle placements at all');
  for (const f of frontsOf(j)) {
    assert.equal(f.meta.handle, undefined, `${f.id} was never given a handle`);
  }
});

test('F2 — a base door takes the TOP edge, full width, with the note on the sheet', () => {
  const [front] = frontsOf(dressed(BUD));
  assert.equal(front.meta.jpull.edge, 'TOP');
  assert.equal(front.meta.jpull.sheetEdge, 'TOP');
  assert.equal(front.meta.jpull.run, undefined, 'full width — nothing to stop');
  assert.equal(front.cnc.jpull.edge, 'TOP');
  assert.equal(front.cnc.jpull.note, 'J-PULL TOP');
  assert.equal(front.cnc.jpull.layer, 'JPULL_EDGE');
  assert.equal(front.cnc.jpull.profile.lipT, 4.212, 'the profile params reach the record');
  assert.equal(front.cnc.jpull.profile.slotW, 10);
  assert.equal(front.cnc.jpull.profile.rearLeg, 3.788);
});

test('F2 — every drawer front takes the TOP edge', () => {
  const j = dressed(BUDR);
  const drawers = j.panels.filter((p) => p.part === 'DRAWER-FRONT');
  assert.ok(drawers.length >= 2, 'the fixture has drawer fronts');
  for (const d of drawers) {
    assert.equal(d.meta.jpull.edge, 'TOP', `${d.id}`);
    assert.equal(d.cnc.jpull.note, 'J-PULL TOP');
  }
});

test('F2 — a WALL door gets no machining and no handle, and the piece says why', () => {
  const j = dressed(WUD);
  const fronts = frontsOf(j);
  assert.ok(fronts.length, 'the wall unit has doors');
  for (const f of fronts) {
    assert.equal(f.meta.jpull.edge, null, `${f.id} takes no J`);
    assert.equal(f.meta.jpull.reason, 'wall-door');
    assert.equal(f.cnc.jpull, undefined, 'nothing is machined');
    assert.equal(f.meta.handle, undefined, 'and nothing is screwed on either');
  }
  assert.equal(j.drills.filter((d) => d.kind === 'handle').length, 0);
});

test('F2 — a TALL door takes the vertical edge opposite its hinge, stopped', () => {
  const left = frontsOf(dressed(WARDROBE, { hinge: 'L', door_count: 1 }))[0];
  assert.equal(left.meta.hinge, 'L');
  assert.equal(left.meta.jpull.edge, 'R', 'the opening side, in the ROOM');
  assert.equal(left.meta.jpull.sheetEdge, 'L', '…mirrored for the bench');
  assert.deepEqual(left.meta.jpull.run, { from: 700, to: 1200, clamped: false });
  assert.equal(left.cnc.jpull.from, 700);
  assert.equal(left.cnc.jpull.to, 1200);
  assert.equal(left.cnc.jpull.note, 'J-PULL L 700-1200');

  const right = frontsOf(dressed(WARDROBE, { hinge: 'R', door_count: 1 }))[0];
  assert.equal(right.meta.hinge, 'R');
  assert.equal(right.meta.jpull.edge, 'L');
  assert.equal(right.meta.jpull.sheetEdge, 'R');
});

test('F2 — a PAIR of tall doors takes one J per leaf, on each leaf\'s own opening edge', () => {
  const fronts = frontsOf(dressed(WARDROBE, { width: 1000, door_count: 2 }));
  assert.equal(fronts.length, 2);
  const edges = fronts.map((f) => f.meta.jpull.edge);
  assert.deepEqual([...edges].sort(), ['L', 'R'], 'they open away from each other');
  for (const f of fronts) assert.ok(f.cnc.jpull, `${f.id} is machined`);
});

// ─── THE SLOPE, AND THE FORCED HAND ────────────────────────────────────────

const CEILING = { pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 };
/** Steeper: the J's own edge falls BELOW the run's start — a refusal. */
const STEEP = { pts: [{ x: 0, y: 700 }, { x: 700, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 };
/** In between: room for a run, but not for all 500 of it — a clamp. */
const SHALLOW = { pts: [{ x: 0, y: 1000 }, { x: 600, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 };

test('F2 — the forced hand under a rake FLIPS the J with it, for free', () => {
  const j = dressed(WARDROBE, {
    width: 1000, height: 2200, door_count: 2, slope_cut: CEILING,
  });
  for (const f of frontsOf(j)) {
    assert.equal(f.meta.hingeForced, true, `${f.id}'s hand is forced by the slope`);
    // One source, one decision: the J is the other letter, whatever the slope
    // decided — this file never asks a second time which way the ceiling runs.
    assert.equal(f.meta.jpull.edge, f.meta.hinge === 'R' ? 'L' : 'R');
  }
});

test('F2 — under a rake the run is placed on the SHORT edge, and clamps there', () => {
  const j = dressed(WARDROBE, {
    width: 1000, height: 2200, door_count: 2, slope_cut: CEILING,
  });
  const leaf = frontsOf(j).find((f) => f.meta.jpull.edge === 'L');
  assert.ok(leaf, 'the leaf whose J is on the room-LEFT edge');
  // Its hinge is on the room-RIGHT (the tall edge); the J is on the LEFT,
  // whose height is `meta.slopeCut.roomL` — the short one.
  const edgeH = leaf.meta.slopeCut.roomL;
  assert.ok(edgeH < leaf.h, 'the J edge is shorter than the leaf');
  if (edgeH > 700 && edgeH < 1200) {
    assert.equal(leaf.meta.jpull.run.clamped, true, 'and the run is cut short to fit it');
    assert.equal(leaf.meta.jpull.run.to, Math.min(edgeH, 1200));
  }
});

test('F2 — a leaf that is BOTH trimmed and slope-cut reads F0a\'s refreshed edge', () => {
  // Order in the file guarantees it: the trim applier re-cuts the leaf before
  // the handle pass runs, so `meta.slopeCut.roomL/roomR` are the NEW numbers.
  const plain = dressed(WARDROBE, {
    width: 1000, height: 2200, door_count: 2, slope_cut: CEILING,
  });
  const trimmed = dressed(WARDROBE, {
    width: 1000,
    height: 2200,
    door_count: 2,
    slope_cut: CEILING,
    front_edge_trim: { '01-FL': { left: 0, right: 60 } },
  });
  const a = frontsOf(plain).find((f) => f.id === '01-FL');
  const b = frontsOf(trimmed).find((f) => f.id === '01-FL');
  assert.notEqual(a.meta.slopeCut.roomR, b.meta.slopeCut.roomR, 'the trim moved the edge');
  const edge = b.meta.jpull.edge;
  const height = edge === 'L' ? b.meta.slopeCut.roomL : b.meta.slopeCut.roomR;
  if (b.meta.jpull.run) {
    assert.ok(b.meta.jpull.run.to <= height + 1e-6,
      'the run sits on the edge that exists AFTER the trim, not before it');
  }
});

// ─── REFUSALS AND CLAMPS SPEAK ─────────────────────────────────────────────

test('F2 — a leaf too short for the run REFUSES, cuts nothing, and warns', () => {
  // A STEEP rake: the ceiling falls to 700 over the left end, so the leaf's
  // hinge is forced onto its tall (right) edge and the J's own edge is only
  // 605.6 mm — less than the 700 the run starts at. There is no leaf there.
  const j = dressed(WARDROBE, {
    width: 1000, height: 2200, door_count: 2, slope_cut: STEEP,
  });
  const front = frontsOf(j).find((f) => f.id === '01-FL');
  assert.ok(front.meta.slopeCut.roomL < spec.fromBottomMm, 'the J edge is under the start');
  assert.equal(front.meta.jpull.reason, 'too-short');
  assert.equal(front.cnc.jpull, undefined, 'nothing is machined on it');
  assert.equal(front.meta.handle, undefined, 'and no handle appears instead');
  const w = j.warnings.find((x) => x.code === 'JPULL_EDGE_TOO_SHORT');
  assert.ok(w, 'and it says so');
  assert.equal(w.panel, front.id, 'naming the leaf');
  assert.match(w.message, /there is no leaf to machine/);
});

test('F2 — a clamped run warns too, with the numbers in it', () => {
  // A gentler rake: the J's edge is 910.6 mm, which is room for a run but not
  // for the whole 500 of it.
  const j = dressed(WARDROBE, {
    width: 1000, height: 2200, door_count: 2, slope_cut: SHALLOW,
  });
  const front = frontsOf(j).find((f) => f.id === '01-FL');
  assert.equal(front.meta.jpull.run.clamped, true);
  assert.equal(front.meta.jpull.run.to, front.meta.slopeCut.roomL,
    'it runs out exactly where the edge does');
  const w = j.warnings.find((x) => x.code === 'JPULL_RUN_CLAMPED');
  assert.ok(w, 'the clamp speaks');
  assert.equal(w.panel, front.id);
  assert.match(w.message, /cut short to/);
  // …and it is still MACHINED. A shorter run is a working handle.
  assert.ok(front.cnc.jpull, 'the leaf is machined with the run it can hold');
});

// ─── AND NOTHING ELSE MOVED ────────────────────────────────────────────────

test('F2 — a bar kitchen is byte-identical to what it was', () => {
  const bar = { type: 'bar', centres: 128 };
  const a = build(BUD, { project_handle: bar });
  const [front] = frontsOf(a);
  assert.equal(front.meta.handle.type, 'bar');
  assert.equal(front.meta.jpull, undefined, 'no J record on a front that has a handle');
  assert.equal(front.cnc.jpull, undefined);
  assert.ok(a.drills.some((d) => d.kind === 'handle'));
});

test('F2 — a bare cabinet — every golden — never hears of any of this', () => {
  const bare = build(BUD);
  for (const f of frontsOf(bare)) {
    assert.equal(f.meta.handle, undefined);
    assert.equal(f.meta.jpull, undefined);
    assert.equal(f.cnc.jpull, undefined);
  }
  assert.equal(bare.drills.filter((d) => d.kind === 'handle').length, 0);
  assert.equal(bare.warnings.filter((w) => /^JPULL/.test(w.code)).length, 0);
});

test('F2 — the doctrine holds: a SHAKER door can wear a J', () => {
  // The whole reason the J is on the handle axis. A face pattern and a handle
  // system are two answers to two questions and both are sayable at once.
  const j = dressed({ ...BUD, front_type: 'S' });
  const [front] = frontsOf(j);
  assert.equal(front.meta.frontType, 'S', 'still a shaker');
  assert.ok(front.cnc.pockets.some((p) => p.layer === 'SHAKER_PANEL_POCKET'), 'still machined as one');
  assert.equal(front.cnc.jpull.edge, 'TOP', 'and it carries a J as well');
});

// ─── THE KIT AND THE ENGINE AGREE ABOUT THE LAYER ──────────────────────────

test('F2 — the machining layer is the kit\'s own name', () => {
  const kit = readFileSync(new URL('../reference/lisp/KIT_FRONT_JPULL.lsp', import.meta.url), 'utf8');
  assert.ok(kit.includes('"JPULL_EDGE"'), 'the kit declares it');
  assert.equal(spec.layer, 'JPULL_EDGE', 'and the profile names the same one');
});
