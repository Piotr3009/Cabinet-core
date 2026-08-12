// ─── F9 — SHORT RUNNERS · F10 — SHORT / OVER WARNINGS (turn 25) ─────────────

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { runnerNominalLength } from '../src/engine/runners.js';
import {
  DRAWER_WARNING_CODES, frontStackFit, frontStackWarning,
} from '../src/engine/drawerBox.js';
import { defaultParamsFor } from '../src/engine/types.js';

const STEPS = P.wardrobe.drawers.depthSteps;
const unit = (extra) => computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', ...extra }, P);
const said = (r, code) => r.warnings.filter((w) => w.code === code);

// ─── F9 ─────────────────────────────────────────────────────────────────────

test('F9 — the owner’s six short NLs are on the ladder', () => {
  for (const nl of [250, 270, 300, 320, 350, 380]) {
    assert.ok(STEPS.includes(nl), `NL ${nl} is missing from the ladder`);
  }
  // …in order, and with the old ladder still whole behind them.
  assert.deepEqual([...STEPS].sort((a, b) => a - b), STEPS, 'the ladder is not sorted');
  for (const nl of [390, 440, 490, 540, 590, 640, 690]) assert.ok(STEPS.includes(nl), `${nl} was dropped`);
});

test('F9 — selection is from the SHORTEST upward: the largest step that fits', () => {
  assert.equal(runnerNominalLength(249, P), null, 'below the shortest, nothing fits');
  assert.equal(runnerNominalLength(250, P), 250);
  assert.equal(runnerNominalLength(269, P), 250);
  assert.equal(runnerNominalLength(389, P), 380);
  assert.equal(runnerNominalLength(390, P), 390);
  assert.equal(runnerNominalLength(700, P), 690);
});

test('F9 — a shallow cabinet gets a SHORT runner, not a box longer than itself', () => {
  // The bug in one line: at 350 mm deep the ladder started at 390, so the
  // cabinet was told "too shallow for drawers" and then cut a 390 mm box.
  const shallow = unit({ depth: 350 });
  assert.equal(shallow.derived.szufDl, 300);
  assert.ok(shallow.derived.szufDl < shallow.params.depth, 'the box is shorter than the carcass');
  assert.deepEqual(said(shallow, 'DRAWERS_TOO_SHALLOW'), []);
});

test('F9 — existing DEEP units keep today’s selection, to the millimetre', () => {
  // The property that makes this safe: adding shorter rungs cannot change what
  // the largest-that-fits is for a cabinet that already had one.
  const old = [390, 440, 490, 540, 590, 640, 690];
  const largestOf = (steps, depth) => {
    let best = null;
    for (const s of steps) if (s <= depth) best = s;
    return best;
  };
  for (let depth = 390; depth <= 900; depth += 1) {
    assert.equal(
      runnerNominalLength(depth, P), largestOf(old, depth),
      `a ${depth} mm usable depth changed runner`,
    );
  }
  // …and on the real cabinets, through the whole engine. A WARDROBE's own
  // drawers are OFF at its defaults, so it is built with some.
  for (const [type, extra] of [['BUDR', {}], ['BUDR2', {}], ['BUDR4', {}], ['WARDROBE', { drawers: 3 }]]) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', ...extra }, P);
    const nl = r.derived.szufDl ?? r.derived.szufDl;
    assert.ok(old.includes(nl), `${type} at its defaults now takes a ${nl}`);
  }
});

test('F9 — every short NL is really in the bucket', async () => {
  // "Models are already in the bucket" — checked against the live manifest kept
  // verbatim as a fixture (R3), rather than taken on trust.
  const { readFileSync } = await import('node:fs');
  const manifest = JSON.parse(readFileSync(
    new URL('./fixtures/bucket/runners-blum-movento-manifest.json', import.meta.url),
    'utf8',
  ));
  const inPack = new Set(manifest.items.map((i) => i.nl));
  for (const nl of [250, 270, 300, 320, 350, 380]) {
    assert.ok(inPack.has(nl), `NL ${nl} is on the ladder but not in the pack`);
  }
});

// ─── F10 ────────────────────────────────────────────────────────────────────

test('F10 — the reading: fit, short, or over — and by how much', () => {
  assert.deepEqual(frontStackFit({ heights: [200, 200], gap: 3, available: 406 }).state, 'fit');
  // Half a millimetre is rounding, not a gap.
  assert.equal(frontStackFit({ heights: [200, 200], gap: 3, available: 406.4 }).state, 'fit');
  const short = frontStackFit({ heights: [150, 150], gap: 3, available: 406 });
  assert.equal(short.state, 'short');
  assert.equal(short.by, 100);
  const over = frontStackFit({ heights: [250, 250], gap: 3, available: 406 });
  assert.equal(over.state, 'over');
  assert.equal(over.by, 100);
});

test('F10 — it NAMES THE NUMBER', () => {
  const w = frontStackWarning({ heights: [150, 150], gap: 3, available: 406 });
  assert.equal(w.code, 'DRAWER_FRONTS_SHORT');
  assert.match(w.message, /100 mm/);
  assert.match(w.message, /306 mm in a 406 mm face/);
  const o = frontStackWarning({ heights: [250, 250], gap: 3, available: 406 });
  assert.equal(o.code, 'DRAWER_FRONTS_OVER');
  assert.match(o.message, /100 mm/);
});

test('F10 — the cabinet says it, and does NOT block', () => {
  const shortStack = unit({ drawer_heights: [150, 150, 150] });
  assert.equal(said(shortStack, 'DRAWER_FRONTS_SHORT').length, 1);
  // Not blocked: the fronts are cut, the boxes are cut, the DXF is there.
  assert.equal(shortStack.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 3);
  assert.ok(shortStack.panels.filter((p) => p.role === 'drawer_box').length > 0);

  const overStack = unit({ drawer_heights: [300, 300, 300] });
  assert.equal(said(overStack, 'DRAWER_FRONTS_OVER').length, 1);
  assert.equal(overStack.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 3);
});

test('F10 — a cabinet nobody has edited says nothing', () => {
  const r = unit();
  assert.deepEqual(said(r, 'DRAWER_FRONTS_SHORT'), []);
  assert.deepEqual(said(r, 'DRAWER_FRONTS_OVER'), []);
});

test('F10 — the drawer modal is given the drawer’s own codes, and every one exists', () => {
  // The list the modal filters by. If a code is renamed in the engine and not
  // here, the warning stops reaching the modal silently — so both new codes are
  // pinned, and so are the older clamps this turn stops hiding.
  for (const code of ['DRAWER_FRONTS_SHORT', 'DRAWER_FRONTS_OVER', 'DRAWER_BOX_CAPPED', 'DRAWER_BOX_FLOORED']) {
    assert.ok(DRAWER_WARNING_CODES.includes(code), `${code} would not reach the drawer modal`);
  }
  // …and the codes really are what the engine emits.
  const emitted = new Set([
    ...unit({ drawer_heights: [150, 150, 150] }).warnings.map((w) => w.code),
    ...unit({ height: 500, drawers: 4 }).warnings.map((w) => w.code),
  ]);
  for (const code of ['DRAWER_FRONTS_SHORT', 'DRAWER_BOX_CAPPED']) {
    assert.ok(emitted.has(code), `${code} is in the modal's list but nothing emits it`);
    assert.ok(DRAWER_WARNING_CODES.includes(code));
  }
});
