/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F2 . A STACK IN A COLUMN HAS THE SAME NUMBERS AS A STACK ACROSS (CLAUDE.md T86B law 2). The Section's "Stack
// height" and "Partition (locked, required above the stack)" rows read for a column stack exactly as for a full-width
// stack (T79): the engine publishes them per zone, `derived.columnStacks[zone] = { drawerTotalH, partition_bottom_y }`,
// from the column's boxes and the board that closes it. The owner, 30.10.2026, 23:02: *"zrob jak rekomendujesz"*.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { CASES } from '../scripts/t78-classify.d/f50-t85-f02.mjs';

const DR = P.wardrobe.drawers;
const G = P.board.thickness;

test('F2 . the owner\'s recess wardrobe (T85 fixture a): the column\'s stack height and the cap\'s underside', () => {
  const r = computeCabinet(CASES.a(), P);
  const zone = r.assemblies.columnDrawers[0].zone;
  assert.equal(zone, 1, 'the drawers are in Column 2');
  const stack = r.derived.columnStacks[zone];
  assert.ok(stack, JSON.stringify(r.derived.columnStacks));
  assert.equal(stack.drawerTotalH, 3 * 200 + 2 * DR.gap, 'the three fronts and their two gaps');
  const cap = r.panels.find((p) => p.id === 'PARTITION');
  assert.equal(stack.partition_bottom_y, cap.box.y, 'the underside of the board over the drawers');
  assert.equal(stack.partition_bottom_y, G + stack.drawerTotalH + DR.partitionClearance,
    'read as the full-width stack\'s: G + the stack + the clearance');
  assert.equal(r.derived.drawerTotalH, undefined, 'no full-width stack in this wardrobe');
});

test('F2 . a plain column stack (one divider, drawers in Column 1): its own Z1-PART closes it', () => {
  const params = {
    ...defaultParamsFor('WARDROBE', P),
    width: 1200,
    items: [
      { id: 'p1', kind: 'partition', x_mm: 600 },
      { id: 'd1', kind: 'drawer', zone: 0, index: 0, height_mm: 180, mount: 'internal' },
      { id: 'd2', kind: 'drawer', zone: 0, index: 1, height_mm: 220, mount: 'internal' },
    ],
  };
  const r = computeCabinet(params, P);
  const col = r.assemblies.columnDrawers.find((c) => c.zone === 0);
  assert.ok(col, 'the column is cut');
  const stack = r.derived.columnStacks[0];
  assert.equal(stack.drawerTotalH, 180 + 220 + DR.gap);
  assert.equal(stack.partition_bottom_y, col.top, 'the column\'s closing board, as the assemblies hold it');
  assert.equal(stack.partition_bottom_y, G + stack.drawerTotalH + DR.partitionClearance);
});

test('F2 . the full-width stack\'s numbers are untouched and the six base kits grow no key', () => {
  for (const type of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const r = computeCabinet(defaultParamsFor(type, P), P);
    assert.equal('columnStacks' in r.derived, false, `${type}: no column stack, no key`);
  }
  const full = computeCabinet({ ...defaultParamsFor('WARDROBE', P), drawers: 3 }, P);
  assert.equal(full.derived.drawerTotalH, 3 * DR.frontHeight + 2 * DR.gap);
  assert.equal(full.derived.partition_bottom_y, G + full.derived.drawerTotalH + DR.partitionClearance);
  assert.equal('columnStacks' in full.derived, false);
});
