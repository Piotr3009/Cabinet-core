// ─── TURN 20 F4: THE CNC LABEL, AT HALF THE HEIGHT ──────────────────────────
//
// Owner: the wrapping and the placement have been right since turn 18; the SIZE
// is still double what he wants.
//
// ONE number moves — `cnc.labelHeight` 40 → 20 — and the two that could have
// made a small part shrink twice stay exactly where they are. This is the
// turn's only intended CNC delta, and `verify/t20/cnc-export-identity.md`
// carries the entity-by-entity evidence that it is confined to TEXT heights.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { panelLabel, panelLabelBlock } from '../src/engine/cnc/dxf.js';
import { defaultParamsFor } from '../src/engine/types.js';

const unit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), unit_num: '01', ...extra }, P);

test('F4.1 — the two numbers, and the two that deliberately did not move', () => {
  assert.equal(P.cnc.labelHeight, 20, 'halved');
  assert.equal(P.cnc.exportLabelScale, 0.5, 'the scale is untouched — F4.2');
  assert.equal(P.cnc.labelMinHeight, 6, 'the readable floor stays');
  assert.equal(P.cnc.labelFitRatio, 0.12, 'small parts already size by the ratio');
});

test('F4.1 — a profile saved before this turn keeps its own tuning and gets the new default', () => {
  // `labelHeight` IS a workshop number (rule 2), so a stored profile that has
  // set one keeps it; one that never mentioned it comes back at 20.
  const older = { ...P, cnc: { ...P.cnc } };
  delete older.cnc.labelHeight;
  const untouched = migrateCabinetProfile(older);
  assert.equal(untouched.cnc.labelHeight, 20);
  const tuned = migrateCabinetProfile({ ...P, cnc: { ...P.cnc, labelHeight: 12 } });
  assert.equal(tuned.cnc.labelHeight, 12);
});

test('F4 — no exported label is taller than the cap, on any kit', () => {
  for (const type of ['WARDROBE', 'BUDR', 'BUDR4', 'WUD', 'SINK', 'OVEN_BASE', 'FRIDGE']) {
    const r = unit(type, {});
    for (const panel of r.panels.filter((p) => p.cnc?.outline?.length)) {
      const file = panelLabel(panel, { unitNum: '01', profile: P });
      if (!file.lines.length) continue;
      assert.ok(file.h <= P.cnc.labelHeight + 1e-9, `${type} ${panel.id}: over the cap at ${file.h}`);
      assert.ok(file.h >= P.cnc.labelMinHeight - 1e-9, `${type} ${panel.id}: under the floor`);
    }
  }
});

test('F4.2 — a SMALL part does not shrink twice: the ratio still decides it', () => {
  // A part whose short side puts it under the cap is sized by
  // `labelFitRatio × short side` and the cap never touches it. That is the
  // half of F4.2 that says which parts must NOT move.
  const r = unit('WARDROBE', { drawers: 3, shelves: 2, doors: true });
  const small = r.panels
    .filter((p) => p.cnc?.outline?.length)
    .map((p) => ({ p, short: Math.min(Math.abs(p.cnc.drawn_w ?? p.w), Math.abs(p.cnc.drawn_h ?? p.h)) }))
    .filter(({ short }) => short * P.cnc.labelFitRatio < P.cnc.labelHeight);
  assert.ok(small.length, 'this wardrobe has parts small enough for the ratio to bind');
  for (const { p, short } of small) {
    const file = panelLabel(p, { unitNum: '01', profile: P });
    if (!file.lines.length) continue;
    const byRatio = Math.max(P.cnc.labelMinHeight, Math.min(short * P.cnc.labelFitRatio, file.h));
    assert.equal(file.h, byRatio, `${p.id}: the ratio, not the cap`);
  }
});

test('F4 — the sheet and the file still say the SAME WORDS, broken the same way', () => {
  // The cap moves a height and nothing else. If it ever moved a line break the
  // file and the glass would start disagreeing about what a board is called,
  // which is the thing turn 18 F1.1 fixed.
  const r = unit('WARDROBE', { drawers: 3, shelves: 2, doors: true });
  for (const panel of r.panels.filter((p) => p.cnc?.outline?.length)) {
    const sheet = panelLabelBlock(panel, { unitNum: '01', profile: P });
    const file = panelLabel(panel, { unitNum: '01', profile: P });
    assert.deepEqual(file.lines, sheet.lines.map((l) => l.text), panel.id);
    assert.ok(file.h <= sheet.size + 1e-9, `${panel.id}: the file is never BIGGER than the glass`);
  }
});
