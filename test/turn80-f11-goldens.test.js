/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T80 F11 · GOLDENS AND THE CLASSIFIER ───────────────────────────────────
//
// CLAUDE.md T80 F11: *"golden-inframe-run.json and golden-inframe-wud.json
// (F3), pinned through scripts/t78-goldens.mjs with the owner's words of 21.10
// in their meta; the DXF fingerprint of the frame in each; the six base
// goldens IDENTICAL (scripts/t64-classify.mjs --dump vs verify/t70/goldens-
// base.json); T75 16/16, T78 and T79 goldens held; REPINNED empty in every
// f40-t80-f* fragment. The walk and the tests prove in-frame OFF is main,
// byte for byte, on every golden."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GOLDENS } from '../scripts/t78-classify.d/f40-t80-f11.mjs';
import { T78_GOLDENS } from '../scripts/t78-goldens.mjs';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { goldenSummary } from '../scripts/t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const fixture = (name) => JSON.parse(read(`fixtures/${name}`));

test('F11 · the two goldens are written, named in the fragment, and held byte for byte by their scenes', () => {
  assert.deepEqual(GOLDENS.map((g) => g.file), ['golden-inframe-run.json', 'golden-inframe-wud.json']);
  for (const g of GOLDENS) {
    assert.ok(T78_GOLDENS.some((x) => x.file === g.file), `${g.file} rides scripts/t78-goldens.mjs`);
    const file = fixture(g.file);
    assert.equal(JSON.stringify(g.make()), JSON.stringify(file.expected), `${g.file} is its scene, byte for byte`);
    assert.match(file.meta.source, /The owner, 21\.10\.2026: \*"raczej plyta/, 'the owner\'s words of 21.10 in the meta');
    assert.match(file.meta.source, /\*"3 mm zawsze"\*/);
    assert.equal(file.params.inframe, true, 'the classifier sees the golden open the inframe gate');
    assert.doesNotMatch(read(`fixtures/${g.file}`), /[–—]/, 'no em or en dash');
  }
});

test('F11 · the run\'s golden: the frame 1920 x 808, its openings and stiles, its DXF\'s fingerprint F4 pinned (70c1bd58)', () => {
  const { expected } = fixture('golden-inframe-run.json');
  assert.equal(expected.frame.length, 1);
  const [f] = expected.frame;
  assert.deepEqual([f.id, f.w, f.h, f.thickness], ['FRAME', 1920, 808, 25]);
  assert.deepEqual(f.openings.map((o) => [o.w, o.h]), [[562, 732], [762, 732], [462, 732]]);
  assert.deepEqual(f.stiles, [38, 38, 38, 20]);
  assert.deepEqual(f.dxf, { name: '01-FRAME.dxf', fingerprint: '70c1bd58' });
  assert.match(read('test/turn80-f04-cnc.test.js'), /'70c1bd58'/, 'the same number F4 pins');
  const fronts = expected.units.map((u) => u.summary.panels.filter((p) => p.role === 'front').map((p) => [p.w, p.h, p.thickness]));
  assert.deepEqual(fronts, [[[556, 726, 22]], [[376.5, 726, 22], [376.5, 726, 22]], [[456, 360, 22], [456, 363, 22]]]);
});

test('F11 · the wall unit\'s golden: the frame 602 x 758, the opening 562 x 682, its own fingerprint', () => {
  const { expected } = fixture('golden-inframe-wud.json');
  const [f] = expected.frame;
  assert.deepEqual([f.id, f.w, f.h], ['FRAME', 602, 758]);
  assert.deepEqual(f.openings.map((o) => [o.w, o.h]), [[562, 682]]);
  assert.deepEqual(f.stiles, [20, 20]);
  assert.deepEqual(f.dxf, { name: 'W01-FRAME.dxf', fingerprint: '599b9cf3' });
  assert.deepEqual(expected.units[0].summary.panels.filter((p) => p.role === 'front').map((p) => [p.w, p.h]), [[556, 676]]);
});

test('F11 · REPINNED is empty in every f40-t80 fragment, and only F11 names goldens', async () => {
  const dir = `${ROOT}scripts/t78-classify.d/`;
  const names = readdirSync(dir).filter((n) => n.startsWith('f40-t80-')).sort();
  assert.deepEqual(names, ['f40-t80-f02.mjs', 'f40-t80-f03.mjs', 'f40-t80-f04.mjs', 'f40-t80-f05.mjs', 'f40-t80-f06.mjs',
    'f40-t80-f07.mjs', 'f40-t80-f08.mjs', 'f40-t80-f09.mjs', 'f40-t80-f10.mjs', 'f40-t80-f11.mjs']);
  for (const n of names) {
    // eslint-disable-next-line no-await-in-loop
    const frag = await import(`${dir}${n}`);
    assert.deepEqual(frag.REPINNED, [], `${n}: nothing re-pinned this turn`);
    if (n !== 'f40-t80-f11.mjs') assert.deepEqual(frag.GOLDENS, [], `${n} names no golden`);
  }
});

test('F11 · in-frame OFF is main: the same units with no flag cut what the lay-on kit cuts, no FRAME, no inset', () => {
  for (const g of GOLDENS) {
    const { params } = fixture(g.file);
    for (const p of params.units) {
      const { inframe, run_frame: el, ...bare } = p;
      assert.equal(inframe, true);
      assert.ok(el, 'the run element rides the params');
      const off = goldenSummary(computeCabinet(bare, P));
      assert.ok(!off.panels.some((x) => x.role === 'frame'), 'no frame without the flag');
      const on = g.make().units.find((u) => u.type === p.type && u.width === p.width).summary;
      assert.notDeepEqual(off, on, 'the flag is what changes the cut, nothing else');
    }
  }
});

test('F11 · the six base goldens IDENTICAL and every T78 golden held (the two scripts, as the gates run them)', () => {
  const head = execFileSync('node', ['scripts/t64-classify.mjs', '--dump'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const tmp = join(tmpdir(), `t80-f11-head-${process.pid}.json`);
  writeFileSync(tmp, head);
  try {
    const verdict = execFileSync('node', ['scripts/t64-classify.mjs', 'verify/t70/goldens-base.json', tmp], { cwd: ROOT, encoding: 'utf8' });
    assert.match(verdict, /IDENTICAL=6 UNNAMED=0 NAMED=0/);
  } finally { rmSync(tmp, { force: true }); }
  const check = execFileSync('node', ['scripts/t78-goldens.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.doesNotMatch(check, /MOVED|MISSING/);
  assert.match(check, /ok {7}golden-inframe-run\.json \(F40\)/);
  assert.match(check, /ok {7}golden-inframe-wud\.json \(F40\)/);
});
