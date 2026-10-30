/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F6 . ONE SHARE-OUT BUTTON (law 8). The owner, 30.10.2026 (22:28): *"usun ta funkcje z paska"*.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { buildRuns } from '../src/engine/runs.js';
import { shareOutPlan } from '../src/engine/shareOut.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const code = (rel) => src(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const units = [0, 1, 2, 3, 4, 5].map((i) => ({ id: `u${i}`, type: 'BUD', params: { width: 600, height: 770, depth: 570 }, position: { wall: 0, x_mm: 600 * i, rotation_deg: 0 } }));

test('F6 . the plan: no extra, no alternative, no tooWide; a wide share is still shared out', () => {
  const plan = shareOutPlan(buildRuns(units, P)[0], { wallWidth: 3900, others: units }, P);
  for (const k of ['alternative', 'tooWide', 'newWidth', 'extra']) assert.ok(!(k in plan), `no ${k}`);
  assert.equal(plan.ok, true);
  assert.equal(plan.n, 6, 'over the cabinets that exist');
  assert.ok(plan.each > P.ui.shareOut.maxWidthMm, '650 is over the 620 line, and it is shared out all the same');
  assert.deepEqual(shareOutPlan(buildRuns(units, P)[0], { wallWidth: 3900, others: units }, P, { extra: 1 }), plan, 'a stray extra is not read');
});

test('F6 . the bar has ONE share-out button; the sources hold neither alternative nor data-share-out-extra', () => {
  const bar = src('src/3d/ShareOutBar.jsx');
  assert.equal(bar.split('<button').length - 1, 2, 'the share-out button and the house cross');
  assert.ok(bar.includes('onClick={() => onShare(offer.unitId)}'));
  for (const rel of ['src/engine/shareOut.js', 'src/3d/ShareOutBar.jsx']) {
    assert.ok(!src(rel).includes('alternative') && !src(rel).includes('data-share-out-extra'), rel);
    assert.ok(!/\bextra\b/.test(code(rel)), `${rel}: no extra in code`);
  }
  const store = src('src/stores/projectStore.js');
  const action = store.slice(store.indexOf('  shareOutRun:'), store.indexOf('  removeUnit:'));
  assert.ok(action.startsWith('  shareOutRun: (unitId) => runBatch(') && !/\bextra\b/.test(action));
});

test('F6 . shareOutRun ignores a stray { extra: 1 }: three cabinets shared out, none added', () => {
  const s = () => useProjectStore.getState();
  s().loadProject({ id: null, name: 'T86B F6', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {} }, []);
  const a = s().addUnit('BUD');
  const b = s().addUnit('BUD', { near: a.id, side: 'R' });
  const c = s().addUnit('BUD', { near: b.id, side: 'R' });
  const res = s().shareOutRun(c.id, { extra: 1 });
  assert.equal(res.ok, true, res.message || '');
  assert.equal(s().units.length, 3, 'no cabinet added');
  const total = s().units.reduce((t, u) => t + Number(u.params.width), 0);
  assert.equal(total + 2 * P.autoParts.sideInfill.defaultWidth, 4000, 'wall to wall, less the two scribes');
});
