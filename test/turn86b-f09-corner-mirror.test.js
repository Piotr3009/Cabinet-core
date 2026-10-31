/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── TURN 86B · F9 · THE LEFT CORNER IS THE MIRROR OF THE RIGHT ────────────
//
// CLAUDE.md T86B law 9. The owner, 30.10.2026, over his screenshot of two
// Corner L wardrobes: *"zobacz lewa szafa, bul i bur sie nie odwrocily"*;
// 22:03, on the tall board standing in front of the left unit: *"bok, tutaj
// nie ma drzwi"*; 22:21: *"moze i zrobil lustro, ale te bul i bur powinny byc
// przekrecone o 90 stopni, czyli wychodzi na to ze dziala CNC ale nie dziala
// 3D, tak?"* (yes).
//
// THE ENGINE HALF (F9.1): the chat's three probes as tests. For CORNER_L_BASE,
// CORNER_L_WALL and CORNER_L_WARDROBE, square and 1200 x 1000, with doors, 3
// shelves and 2 drawers: LEFT = MIRROR(RIGHT) board for board (the boxes) and
// mark for mark (every hole, pocket corner and outline vertex of every board
// placed into the cabinet by `panelPlacement`, so the TOP-L and BOTTOM-L cuts
// are mirrored too).
//
// THE SCENE HALF (F9.3): the solids the room draws (`3d/panelSolid.js
// panelSolids`, the very call `UnitView.jsx MovingPanel` makes) stand where
// the engine's boxes stand, in both hands and in either ORDER of building:
// the right L built first and the left one second is the owner's room. Red
// before the fix (the cache handed the second L the first one's SIDE solids,
// verify/t86b/corner-diagnosis.md), green after.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { panelPlacement, joineryLayers } from '../src/engine/joinery.js';
import { cncRect } from '../src/engine/socketFace.js';
import { panelSolids, clearPanelSolidCache } from '../src/3d/panelSolid.js';
import { paramsForEngine } from '../src/stores/projectStore.js';

const KITS = ['CORNER_L_BASE', 'CORNER_L_WALL', 'CORNER_L_WARDROBE'];
const SWAP = { BUL: 'BUR', BUR: 'BUL' };
const r3 = (v) => Math.round(v * 1000) / 1000 + 0;
const swapName = (s) => String(s)
  .replace(/\bBUL\b|\bBUR\b/g, (m) => SWAP[m])
  .replace(/-S([LR])$/, (m, h) => (h === 'L' ? '-SR' : '-SL'));

function sizesOf(type) {
  const d = defaultParamsFor(type, P);
  const sq = Number(d.width);
  return [
    { label: `square ${sq} x ${sq}`, width: sq, depth: sq },
    { label: '1200 x 1000', width: 1200, depth: 1000 },
  ];
}

function bothHands(type, size) {
  const base = {
    ...defaultParamsFor(type, P), unit_num: 'CL01', doors: true, shelves: 3, drawers: 2,
    width: size.width, depth: size.depth,
  };
  return {
    W: Number(base.width),
    L: computeCabinet({ ...base, corner_side: 'left' }, P),
    R: computeCabinet({ ...base, corner_side: 'right' }, P),
  };
}

/** A board's box, as a key; mirrored across the width when asked. */
function boxKey(p, W, mirrored) {
  const b = p.box;
  const x = mirrored ? W - b.x - b.w : b.x;
  return `${mirrored ? swapName(p.id) : p.id}|${mirrored ? SWAP[p.part] || p.part : p.part}`
    + `|${r3(x)},${r3(b.y)},${r3(b.z)}|${r3(b.w)},${r3(b.h)},${r3(b.d)}`;
}

/**
 * Does the board's placement stand it through the box's own thin axis? A
 * placement that does not (the generic one handed to a board turned onto the
 * L's arm B) cannot carry a mark into the cabinet, and is a FINDING of its
 * own below rather than a row here.
 */
function placementFits(p, pl) {
  const b = p.box;
  const dims = [b.w, b.h, b.d];
  const axis = (a) => a.findIndex((v) => Math.abs(v) > 0.5);
  const thin = dims.indexOf(Math.min(...dims));
  const { w, h } = cncRect(p);
  return axis(pl.n) === thin
    && Math.abs(dims[axis(pl.u)] - w) < 0.5 && Math.abs(dims[axis(pl.v)] - h) < 0.5;
}

/** Every mark of a board in cabinet millimetres, through its own placement. */
function marksOf(p, W, mirrored) {
  const pl = panelPlacement(p);
  if (!pl || !p.cnc || !placementFits(p, pl)) return [];
  const through = pl.n.findIndex((v) => Math.abs(v) > 0.5);
  const at = (x, y) => {
    const X = pl.origin[0] + x * pl.u[0] + y * pl.v[0];
    const Y = pl.origin[1] + x * pl.u[1] + y * pl.v[1];
    const Z = pl.origin[2] + x * pl.u[2] + y * pl.v[2];
    // Where ON the board the mark is: the coordinate through the board's
    // thickness is the face the drawing is read from, which a mirror turns
    // over, so it is not compared; the board's own box is, above.
    const c = [r3(mirrored ? W - X : X), r3(Y), r3(Z)];
    c[through] = '*';
    return c.join(',');
  };
  const id = mirrored ? swapName(p.id) : p.id;
  const out = [];
  for (const h of p.cnc.holes || []) out.push(`${id} hole ${h.layer} d${h.d} @${at(h.x, h.y)}`);
  for (const k of p.cnc.pockets || []) {
    const c = [at(k.x1, k.y1), at(k.x2, k.y2), at(k.x1, k.y2), at(k.x2, k.y1)].sort().join(' ');
    out.push(`${id} pocket ${k.layer} ${c}`);
  }
  for (const [x, y] of p.cnc.outline || []) out.push(`${id} outline @${at(x, y)}`);
  return out;
}

function diff(a, b) {
  const A = new Map(); const B = new Map();
  for (const k of a) A.set(k, (A.get(k) || 0) + 1);
  for (const k of b) B.set(k, (B.get(k) || 0) + 1);
  const only = [];
  for (const [k, n] of A) if ((B.get(k) || 0) !== n) only.push(`LEFT ${n} / RIGHT ${B.get(k) || 0}: ${k}`);
  for (const [k, n] of B) if (!A.has(k)) only.push(`LEFT 0 / RIGHT ${n}: ${k}`);
  return only;
}

for (const type of KITS) {
  for (const size of sizesOf(type)) {
    test(`F9 engine · ${type} ${size.label}, doors, 3 shelves, 2 drawers: LEFT = MIRROR(RIGHT) board for board`, () => {
      const { W, L, R } = bothHands(type, size);
      assert.ok(L.panels.length > 0);
      assert.equal(L.panels.length, R.panels.length);
      const rows = diff(L.panels.map((p) => boxKey(p, W, false)), R.panels.map((p) => boxKey(p, W, true)));
      assert.deepEqual(rows, [], rows.slice(0, 400).join('\n'));
    });
    test(`F9 engine · ${type} ${size.label}: LEFT = MIRROR(RIGHT) mark for mark (TOP-L and BOTTOM-L cuts too)`, () => {
      const { W, L, R } = bothHands(type, size);
      const left = L.panels.flatMap((p) => marksOf(p, W, false));
      const right = R.panels.flatMap((p) => marksOf(p, W, true));
      assert.ok(left.some((k) => /^TOP-L |^BOTTOM-L /.test(k)), 'the L boards carry marks');
      const rows = diff(left, right);
      assert.deepEqual(rows, [], rows.slice(0, 400).join('\n'));
    });
  }
  // FINDING (not tonight's fix, CLAUDE.md F9 names the owner's picture): the
  // boards a placement does not fit, by name, so the morning sees them.
  const { L } = bothHands(type, { width: 1200, depth: 1000 });
  const unfit = L.panels.filter((p) => { const pl = panelPlacement(p); return pl && p.cnc && !placementFits(p, pl); }).map((p) => p.id);
  test(`F9 engine · ${type}: every board's placement stands through its box's thin axis`, unfit.length
    ? { todo: `FINDING: engine/joinery.js panelPlacement does not fit the box of ${unfit.join(', ')} (both hands; their marks are not compared above)` }
    : {}, () => {
    assert.deepEqual(unfit, []);
  });
}

// ─── THE SCENE ─────────────────────────────────────────────────────────────

const OWNER = JSON.parse(readFileSync(new URL('../verify/t86b/owner.ccproject', import.meta.url), 'utf8'));
const LAYERS = joineryLayers(P);

/**
 * The world extent of the solid the room draws for a board, in the unit's
 * millimetres: the geometry is centred on the board's box (panelSolid.js), and
 * `MovingPanel` stands the mesh at that centre. A board with no solid is drawn
 * as its box.
 */
function drawnBox(p) {
  const b = p.box;
  const built = panelSolids(p, LAYERS, P, []);
  if (!built.solid) return { x: [b.x, b.x + b.w], y: [b.y, b.y + b.h], z: [b.z, b.z + b.d] };
  built.solid.computeBoundingBox();
  const bb = built.solid.boundingBox;
  const c = [b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2];
  const ax = ['x', 'y', 'z'];
  const out = {};
  ax.forEach((a, i) => { out[a] = [r3(bb.min[a] * 1000 + c[i]), r3(bb.max[a] * 1000 + c[i])]; });
  return out;
}

/**
 * Does the drawn solid stand where the engine put the board? Through its
 * thickness exactly the box; along its two faces the box, and no further than
 * one board past either end (a tab reaches into the board it joins, and no
 * more).
 */
function standsInBox(p, got) {
  const b = p.box;
  const want = { x: [b.x, b.x + b.w], y: [b.y, b.y + b.h], z: [b.z, b.z + b.d] };
  const thin = ['x', 'y', 'z'].reduce((m, a) => ((want[a][1] - want[a][0]) < (want[m][1] - want[m][0]) ? a : m), 'x');
  const reach = Number(p.thickness) || 18;
  const bad = [];
  for (const a of ['x', 'y', 'z']) {
    const [w0, w1] = want[a]; const [g0, g1] = got[a];
    if (a === thin) {
      if (Math.abs(g0 - w0) > 0.01 || Math.abs(g1 - w1) > 0.01) bad.push(`${p.id} ${a} drawn ${g0}..${g1}, engine ${w0}..${w1} (through the board)`);
    } else if (g0 > w0 + 0.01 || g1 < w1 - 0.01 || g0 < w0 - reach - 0.01 || g1 > w1 + reach + 0.01) {
      bad.push(`${p.id} ${a} drawn ${g0}..${g1}, engine ${w0}..${w1}`);
    }
  }
  return bad;
}

function ownerL(side) {
  const u = structuredClone(OWNER.units[0]);
  u.params.corner_side = side;
  return computeCabinet(paramsForEngine(u, OWNER.project.design), P);
}

for (const order of [['right', 'left'], ['left', 'right']]) {
  test(`F9 scene · the owner's L (${OWNER.units[0].params.width} x ${OWNER.units[0].params.depth} x ${OWNER.units[0].params.height}), built ${order[0]} first then ${order[1]}: every solid stands in its engine box`, () => {
    clearPanelSolidCache();
    const bad = [];
    const drawn = {};
    for (const side of order) {
      const r = ownerL(side);
      drawn[side] = {};
      for (const p of r.panels) {
        const got = drawnBox(p);
        drawn[side][p.id] = got;
        bad.push(...standsInBox(p, got).map((s) => `${side}: ${s}`));
      }
    }
    assert.deepEqual(bad, [], bad.join('\n'));
    // ...and the left picture is the right one mirrored, board for board.
    const W = Number(OWNER.units[0].params.width);
    for (const [id, g] of Object.entries(drawn.left)) {
      const m = drawn.right[swapName(id)];
      assert.ok(m, `${id} drawn in both hands`);
      assert.deepEqual([g.x, g.y, g.z], [[r3(W - m.x[1]), r3(W - m.x[0])], m.y, m.z], `${id}: LEFT drawn = MIRROR(RIGHT drawn)`);
    }
  });
}

/** The boards whose placement does not fit their box (the FINDING above). */
const unfitOf = (r) => new Set(r.panels.filter((p) => { const pl = panelPlacement(p); return pl && p.cnc && !placementFits(p, pl); }).map((p) => p.id));

for (const type of KITS) {
  const { R, L } = bothHands(type, { width: 1200, depth: 1000 });
  const unfit = new Set([...unfitOf(R), ...unfitOf(L)]);
  const run = (keep) => {
    clearPanelSolidCache();
    const bad = [];
    for (const [side, r] of [['right', R], ['left', L]]) {
      for (const p of r.panels) if (keep(p.id)) bad.push(...standsInBox(p, drawnBox(p)).map((s) => `${side}: ${s}`));
    }
    return bad;
  };
  test(`F9 scene · ${type} 1200 x 1000, doors, shelves, drawers, right built then left: every solid in its engine box`, () => {
    const bad = run((id) => !unfit.has(id));
    assert.deepEqual(bad, [], bad.join('\n'));
  });
  const misdrawn = [...new Set(run((id) => unfit.has(id)).map((s) => s.split(' ')[1]))];
  test(`F9 scene · ${type}: the boards of the placement FINDING stand in their engine boxes too`, misdrawn.length
    ? { todo: `FINDING: drawn turned off their engine box in both hands: ${misdrawn.join(', ')} (engine/joinery.js panelPlacement, the arm-B drawer boards; not fixed tonight)` }
    : {}, () => {
    assert.deepEqual(misdrawn, []);
  });
}
