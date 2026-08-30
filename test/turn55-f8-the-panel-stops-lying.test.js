import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// ─── T55 · F8 — THE UNIT PANEL STOPS LYING ABOUT THE HINGE ──────────────────
//
// Drilling, the door modal and ElementProperties already read the FORCED hand
// (`meta.hinge` / `meta.hingeForced`, T46 law). The unit-level select in
// RightPanel.jsx still showed raw `params.hinge`. It takes the same conduct
// as ElementProperties' `hinge-side` now — and the missing engine assertion
// lands here: under a slope, the cup drilling side == `meta.hinge` for EVERY
// leaf.

const src = readFileSync(new URL('../src/components/RightPanel.jsx', import.meta.url), 'utf8');

test('F8 — the select shows the forced hand, disabled, with the one-line reason', () => {
  assert.match(src, /data-unit-hinge-forced=/, 'the forced state is stamped for the walk');
  assert.match(src, /Cut on the slope — the door opens from the slope\./, 'the reason, verbatim');
  assert.match(src, /data-unit-hinge-forced-reason="1"/, 'and it is a visible line, not only a title');
  assert.match(src, /allForced \? forcedLeaves\[0\]\.meta\.hinge : unit\.params\.hinge/,
    'the hand shown is the ENGINE\'s, so the select and the drilling cannot disagree');
  assert.match(src, /disabled=\{result\.derived\.doors === 2 \|\| allForced\}/, 'greyed, not gone');
});

test('F8 — mixed case: the select governs the free leaves and says so in the title', () => {
  assert.match(src, /someForced/, 'the mixed case exists');
  assert.match(src, /this governs the free leaves only/, '…and says so');
});

test('F8 — under a slope, cup drilling side == meta.hinge for every leaf', () => {
  // A left rake across a two-door wardrobe forces both leaves to 'R' (T46).
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 1000,
    height: 2200,
    door_count: 2,
    slope_cut: { pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 },
  }, P);
  const leaves = r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
  assert.ok(leaves.length === 2 && leaves.every((p) => p.meta.hingeForced),
    'both leaves forced by the rake');
  for (const leaf of leaves) {
    const cups = (r.drills || []).filter((d) => d.panel === leaf.id && d.kind === 'cup');
    assert.ok(cups.length >= 1, `${leaf.id} carries cups`);
    for (const cup of cups) {
      // The cup column sits one cup offset in from the HINGE edge. The leaf
      // is machined from its BACK face, so the drawn frame mirrors x: a
      // hinge-R door's cups draw at the LEFT of its sheet (the flat law too —
      // a hinge-L door has always drawn its cups at w − 21.5).
      const roomX = leaf.w - cup.x;
      const onRight = roomX > leaf.w / 2;
      assert.equal(onRight ? 'R' : 'L', leaf.meta.hinge,
        `${leaf.id}: cup at room x=${roomX} of ${leaf.w} sits on the ${leaf.meta.hinge} edge`);
    }
  }
});

test('F8 — no slope, no forcing: the select stays the plain control it was', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', width: 1000, door_count: 2,
  }, P);
  const leaves = r.panels.filter((p) => p.part === 'FRONT' && p.role === 'front');
  assert.ok(leaves.every((p) => !p.meta.hingeForced), 'nothing forced on the flat');
});
