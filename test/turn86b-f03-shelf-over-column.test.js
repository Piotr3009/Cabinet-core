/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F3 . A SHELF SPANS BETWEEN ITS WALLS AT ITS OWN HEIGHT (CLAUDE.md T86B law 3). Above a recess column's cap
// there are no dividers (T85 law 3, D29), so a shelf added there runs side to side of the carcass, never the
// column's width; a divider the joiner adds himself narrows it as any divider does. The owner, 30.10.2026, 23:02:
// *"zrob jak rekomendujesz"*. Shelves' Center all / Center between / the ladder: FROZEN, untouched.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { CASES } from '../scripts/t78-classify.d/f50-t85-f02.mjs';

const G = P.board.thickness;
const CLR = P.carcass.shelfWidthClearance;
const RED = new Set(['error', 'red']);

const withShelf = (base, pos, extra = []) => ({
  ...base, items: [...base.items, { id: 's1', kind: 'shelf', zone: 1, pos_mm: pos }, ...extra],
});
const shelf = (r) => r.panels.find((p) => p.id === 'SHELF-1');
const pinsAt = (r, y) => [...new Set(r.drills
  .filter((d) => d.kind === 'shelf' && Math.abs(d.y - y) <= 60).map((d) => d.panel))].sort();

test('F3 . the owner\'s wardrobe, dividers 210 / 972 ending at 629: a shelf in Column 2 at 1200 runs side to side', () => {
  const base = computeCabinet(CASES.a(), P);
  const v1 = base.panels.find((p) => p.id === 'VPART-1');
  assert.equal(v1.box.y + v1.box.h, 629, 'the dividers end under the board over the drawers');
  const r = computeCabinet(withShelf(CASES.a(), 1200), P);
  const s = shelf(r);
  assert.equal(s.box.x, G + CLR / 2, 'from the left side, less half the clearance');
  assert.equal(s.box.x + s.box.w, 1200 - G - CLR / 2, 'to the right side, less half the clearance');
  assert.equal(s.w, 1200 - 2 * G - CLR);
  assert.deepEqual(s.meta.run, { from: s.box.x, to: s.box.x + s.box.w });
  assert.deepEqual(pinsAt(r, 1200), ['BUL', 'BUR'], 'its supports are the sides, at that height');
  for (const side of ['BUL', 'BUR']) {
    assert.ok(r.drills.some((d) => d.panel === side && d.kind === 'shelf' && d.y === 1200), `${side} has the row at 1200`);
  }
  // Into the recess the shelf grows between the RETURNs' inner faces (D10, D15), never through them.
  const plan = s.meta.planOutline;
  assert.ok(plan, 'the shelf is grown into the band');
  const bump = plan.filter(([, y]) => y === 0).map(([x]) => x + s.box.x).sort((a, b) => a - b);
  assert.deepEqual(bump, [228 + CLR / 2, 972 - CLR / 2]);
  assert.equal(r.warnings.filter((w) => RED.has(w.level) || /SHELF|DIVIDER|RECESS/.test(w.code)).length, 0,
    JSON.stringify(r.warnings));
});

test('F3 . a shelf BELOW the cap in the column keeps the column\'s width', () => {
  const r = computeCabinet(withShelf(CASES.a(), 400), P);
  const s = shelf(r);
  assert.equal(s.box.x, 228 + CLR / 2);
  assert.equal(s.box.x + s.box.w, 972 - CLR / 2);
  // Its bearers are the column's dividers (the one bored from that face carries the pins, T30 F3).
  assert.deepEqual(pinsAt(r, 400), ['VPART-2']);
});

test('F3 . a divider of the joiner\'s own narrows the shelf to it, as any divider does', () => {
  const r = computeCabinet(withShelf(CASES.a(), 1200, [{ id: 'p3', kind: 'partition', x_mm: 600 }]), P);
  const s = shelf(r);
  const v = r.panels.find((p) => p.meta?.itemId === 'p3');
  assert.ok(v && v.box.y <= 1200 && v.box.y + v.box.h >= 1200, 'the joiner\'s divider reaches the shelf');
  assert.equal(s.box.x + s.box.w, 600 - CLR / 2, 'the shelf stops at the divider');
  assert.ok(s.w < 600, 'narrowed to its bay');
});

test('F3 . the ONE board over every column (T79 F3): a shelf above it spans the carcass, the same law', () => {
  const params = {
    ...defaultParamsFor('WARDROBE', P),
    width: 1200,
    items: [
      { id: 'p1', kind: 'partition', x_mm: 600 },
      { id: 'd1', kind: 'drawer', zone: 0, index: 0, height_mm: 200, mount: 'internal' },
      { id: 'd2', kind: 'drawer', zone: 1, index: 0, height_mm: 200, mount: 'internal' },
      { id: 's1', kind: 'shelf', zone: 0, pos_mm: 1200 },
    ],
  };
  const r = computeCabinet(params, P);
  assert.ok(r.assemblies.columnCap, 'the one board over the columns is cut');
  const s = shelf(r);
  assert.equal(s.box.x, G + CLR / 2);
  assert.equal(s.box.x + s.box.w, 1200 - G - CLR / 2);
  assert.deepEqual(pinsAt(r, 1200), ['BUL', 'BUR']);
});

test('F3 . a plain bay shelf beside a full-height divider is untouched', () => {
  const params = {
    ...defaultParamsFor('WARDROBE', P),
    width: 1200,
    items: [{ id: 'p1', kind: 'partition', x_mm: 600 }, { id: 's1', kind: 'shelf', zone: 1, pos_mm: 1200 }],
  };
  const r = computeCabinet(params, P);
  const s = shelf(r);
  assert.equal(s.box.x, 618 + CLR / 2);
  assert.equal(s.box.x + s.box.w, 1182 - CLR / 2);
});
