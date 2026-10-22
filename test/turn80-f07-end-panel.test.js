/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F7 · THE END PANEL REACHES THE FRAME ────────────────────────────────
//
// CLAUDE.md T80 F7: *"Owner 22:40: "2 na styk": the end panel stays butted to
// the carcass side as today. Under in-frame it is as deep as the carcass plus
// the frame (+ 25, to the frame's face) and as tall as the frame (carcass top
// + 19, plus the site trim of 19.10 as today) ... The wall unit's end panel the
// same: 19 above and 19 below. engine/siteTrim.js and KIT_SITE_TRIM.lsp
// untouched: the trim is added after the in-frame height."*  Tests: depth + 25,
// height + 19, the trim on top of it, the wall unit's 19 and 19, the LISP's own
// numbers, the panel still butted, and the lay-on panel with the switch off,
// byte for byte.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { loadLisp } from './lisp-mini.js';

const ROOT = new URL('../', import.meta.url).pathname;
const L = loadLisp(readFileSync(`${ROOT}reference/lisp/KIT_INFRAME.lsp`, 'utf8'));
const S = () => useProjectStore.getState();
const endOf = (id) => S().unitResult(id).panels.find((p) => p.role === 'end_panel');

function scene() {
  S().newProject('T80 F7');
  S().setRoom({ corners: rectCorners(6000, 3000), height: 2500 });
  S().setFrontType('f1', { source: 'spray', material_id: 'generic-22' });
  const a = S().addUnit('BUD', { wall: 0, x: 1000 }).id;
  S().updateUnitParams(a, { width: 600 });
  const w = S().addUnit('WUD', { wall: 0, x: 1000 }).id;
  S().updateUnitParams(w, { width: 600 });
  S().addEndPanel(a, { side: 'L', thickness: 18 });
  S().addEndPanel(w, { side: 'R', thickness: 18 });
  return { a, w };
}

test('F7 · a base unit\'s end panel under in-frame: to the frame\'s face (D + 25), 19 above the carcass, the trim on top', () => {
  const { a } = scene();
  const layon = endOf(a);
  S().setDesign({ inframe: true });
  const ep = endOf(a);
  const gap = P.room.wallBackClearance;
  assert.equal(ep.box.d, gap + 558 + 25, 'from the wall to the frame\'s face');
  assert.equal(ep.box.d, gap + L.call('inframe-end-panel-depth', 558));
  assert.equal(ep.box.z + ep.box.d, 558 + 25, 'its front edge on the frame\'s face');
  assert.equal(ep.box.h, layon.box.h + 19, 'as tall as the frame: 19 over the carcass');
  assert.deepEqual(L.call('inframe-end-panel-grow', 18, null), [19, 0]);
  assert.equal(ep.box.y, layon.box.y, 'its foot where it was (to the floor)');
  assert.equal(ep.box.y + ep.box.h, 770 + 19, 'its top on the frame\'s top edge');
  // The site trim of 19.10 on top of it, as today: the cut 20 bigger at the top, bottom and back.
  assert.deepEqual([ep.meta.oversize.nominal.w, ep.meta.oversize.nominal.h], [ep.box.d, ep.box.h]);
  assert.deepEqual([ep.w, ep.h], [ep.box.d + 20, ep.box.h + 40]);
  assert.deepEqual(ep.meta.oversize.frame, ['R', 'T', 'B']);
  // "na styk": still butted to the side.
  assert.equal(ep.box.x + ep.box.w, 0);
});

test('F7 · the wall unit\'s end panel: 19 above and 19 below, to the frame\'s face', () => {
  const { w } = scene();
  const layon = endOf(w);
  S().setDesign({ inframe: true });
  const ep = endOf(w);
  assert.deepEqual(L.call('inframe-end-panel-grow', 18, true), [19, 19]);
  assert.equal(ep.box.y, -19, '19 under the carcass bottom');
  assert.equal(ep.box.h, layon.box.h + 38, 'and 19 over its top');
  assert.equal(ep.box.z + ep.box.d, 400 + 25);
  assert.equal(ep.meta.below_mm, 19, 'the drop as cut');
  assert.equal(ep.box.x, 600, 'butted to the right side');
});

test('F7 · the lay-on panel with the switch off is main\'s, byte for byte; siteTrim and its LISP untouched', () => {
  const { a, w } = scene();
  const before = [JSON.stringify(endOf(a)), JSON.stringify(endOf(w))];
  S().setDesign({ inframe: true });
  S().setDesign({ inframe: false });
  assert.deepEqual([JSON.stringify(endOf(a)), JSON.stringify(endOf(w))], before);
  // The two files as the turn's base left them (main of 21.10.2026, f5d8aab), pinned so the proof needs no
  // history (a one-commit CI checkout has no base to diff against; the PRO freeze's own reason).
  const sha256 = (b) => createHash('sha256').update(b).digest('hex');
  assert.deepEqual(['src/engine/siteTrim.js', 'reference/lisp/KIT_SITE_TRIM.lsp'].map((f) => sha256(readFileSync(`${ROOT}${f}`))), [
    '235fdd67a48f9d4574f1013729ee4c1f5e1450dfb40db36e256d6fdce68cdb90',
    'cdd7408bac404c51309dc309f724d39461c03628112c097969e900f918e333c0',
  ], 'engine/siteTrim.js and KIT_SITE_TRIM.lsp untouched');
  // ...and git agrees, where git can answer.
  for (const ref of ['origin/main', 'main']) {
    const base = spawnSync('git', ['merge-base', 'HEAD', ref], { cwd: ROOT, encoding: 'utf8' });
    if (base.status !== 0 || !base.stdout.trim()) continue;
    const moved = spawnSync('git', ['diff', '--name-only', base.stdout.trim(), '--', 'src/engine/siteTrim.js', 'reference/lisp/KIT_SITE_TRIM.lsp'],
      { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
    assert.equal(moved, '', 'engine/siteTrim.js and KIT_SITE_TRIM.lsp untouched (git)');
    break;
  }
});
