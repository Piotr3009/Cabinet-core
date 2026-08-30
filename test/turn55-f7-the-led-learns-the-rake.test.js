import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { carcassCutLineOf, slopeHeightAt } from '../src/engine/puzzle.js';
import { lightingBomLines, stripsForUnit } from '../src/engine/ledStrips.js';

// ─── T55 · F7 — THE LED LEARNS THE RAKE: LEVEL RUNS ONLY ────────────────────
//
// The owner: *"skos bez LED … pionowych i poziomych łatwiej."*
//
// ledStrips.js knew only the flat W×H box: side strips ran `H − 2G`, top
// strips sat at `y = H` full width — under a rake they stood proud of the
// carcass. The law now:
//   1. NO strip along the diagonal. Horizontal strips exist only on LEVEL
//      stretches of the roof polyline, trimmed to that stretch's span.
//   2. A vertical side strip under the rake ends at the roof height at its
//      own x (minus the existing insets).
//   3. The sampler is the CARCASS'S OWN roof law — `slopeHeightAt` over
//      `carcassCutLineOf` (engine/puzzle.js, the T54 two-reach law) — the
//      source named, no second sampler (the LISP states it first:
//      KIT_LED_GROOVE.lsp `ledRoofTopAt`).
//   4. BOM lengths follow the trimmed strips.
// Flat twin: a flat room's strips are byte-identical.

const G = P.board.thickness;
const W = 1000;
const H = 2200;

// Raked over the left 520 mm (1300 → 2200), level to the right — the same
// shape as the F2 fixture, so a top strip has BOTH a diagonal and a level
// stretch to answer for.
const CUT = { pts: [{ x: 0, y: 1300 }, { x: 520, y: 2200 }, { x: W, y: 2200 }], infill: 40 };

const build = (cut) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: W,
  height: H,
  ...(cut ? { slope_cut: cut } : {}),
}, P);

const design = (unitId, kinds) => ({
  projectType: 'wardrobe',
  lighting: {
    enabled: true,
    items: kinds.map((k, i) => ({
      id: `led${i}`, unitId, kind: k.kind, ...(k.ref ? { ref: k.ref } : {}),
    })),
  },
});

const UNIT = (result) => ({
  id: 'u1',
  type: 'WARDROBE',
  params: {
    width: W, height: H, depth: Number(result.params.depth) || 600, board_t: G,
  },
});

const strips = (result, kinds) => stripsForUnit({
  unit: UNIT(result), result, design: 'skip', profile: P,
  ...{ design: design('u1', kinds) },
});

const canonical = (v) => JSON.stringify(v, Object.keys(Object.assign({}, ...[v].flat(Infinity)
  .filter((q) => q && typeof q === 'object'))).sort());

test('F7 — the TOP strip lives on the LEVEL stretch only, at its own height — nothing on the diagonal', () => {
  const r = build(CUT);
  const out = strips(r, [{ kind: 'top' }]);
  assert.equal(out.length, 1, 'ONE piece — the level stretch; the diagonal takes none');
  const s = out[0];
  const line = carcassCutLineOf(CUT, W, H, P);
  const knee = line.pts.find((q) => Math.abs(q.y - Math.min(H, q.y)) < 1e-6 && q.y >= H - 1e-6)
    || line.pts[1];
  // The roof crosses H where the raked segment reaches the cabinet height —
  // the strip starts there (or at the carcass side, whichever is inner).
  const crossX = (() => {
    const a = CUT.pts[0];
    const b = CUT.pts[1];
    return a.x + ((H - 40 / Math.cos(Math.atan((b.y - a.y) / (b.x - a.x))) - a.y) / (b.y - a.y)) * (b.x - a.x);
  })();
  void knee;
  assert.ok(s.box.x >= Math.min(crossX, W - G) - 1
    && s.box.x >= G - 1e-6, `the strip starts clear of the rake (x=${s.box.x})`);
  assert.ok(s.box.x + s.box.w <= W - G + 1e-6, '…and stops at the carcass side');
  assert.ok(s.box.y <= H + 1e-6, 'at the roof, never proud of it');
  // No point of the strip stands above the roof over it.
  const roof = (x) => Math.min(H, slopeHeightAt(line, x));
  for (const x of [s.box.x, s.box.x + s.box.w / 2, s.box.x + s.box.w]) {
    assert.ok(s.box.y <= roof(x) + 1e-6, `strip under the roof at ${x}`);
  }
});

test('F7 — a fully RAKED roof takes no horizontal strip at all', () => {
  const full = { pts: [{ x: 0, y: 1300 }, { x: W, y: 2100 }], infill: 40 };
  const r = build(full);
  assert.equal(strips(r, [{ kind: 'top' }]).length, 0, 'no level stretch, no strip');
  assert.equal(strips(r, [{ kind: 'top_under' }]).length, 0, '…and none under the roof');
});

test('F7 — the SIDE strip under the rake ends at the roof at its own x', () => {
  const r = build(CUT);
  const [left] = strips(r, [{ kind: 'side', ref: 'L' }]);
  const [right] = strips(r, [{ kind: 'side', ref: 'R' }]);
  const line = carcassCutLineOf(CUT, W, H, P);
  const roof = (x) => Math.min(H, slopeHeightAt(line, x));
  // The LEFT side stands under the rake: its strip ends at the roof over its
  // own x, conservatively across its own thickness, minus the board insets.
  const t = P.lighting?.strip?.thickness || 3;
  const wantL = Math.max(0, Math.min(roof(G), roof(G + t)) - 2 * G);
  assert.ok(Math.abs(left.box.h - wantL) <= 0.01,
    `left strip ${left.box.h} ends at the roof (${wantL})`);
  assert.ok(left.box.h < H - 2 * G - 100, 'and it is genuinely shorter than the flat law');
  // The RIGHT side stands under the LEVEL stretch — which in this room still
  // carries the 40 infill band, so its roof is the cut line there, not H.
  const xr = W - G - t;
  const wantR = Math.max(0, Math.min(roof(xr), roof(xr + t)) - 2 * G);
  assert.ok(Math.abs(right.box.h - wantR) <= 0.01,
    `right strip ${right.box.h} ends at its own roof (${wantR})`);
  assert.ok(right.box.h > left.box.h, 'and the level side keeps far more of its height');
});

test('F7 — the BOM metres follow the trimmed strips', () => {
  const r = build(CUT);
  const d = design('u1', [{ kind: 'top' }, { kind: 'side', ref: 'L' }]);
  const lines = lightingBomLines({
    entries: [{ unit: UNIT(r), result: r }], design: d, profile: P,
  });
  const strip = lines.find((l) => l.role === 'led_strip');
  const drawn = strips(r, [{ kind: 'top' }, { kind: 'side', ref: 'L' }]);
  const want = drawn.reduce((n, s) => n + s.length_mm, 0);
  assert.ok(Math.abs(strip.qty - Math.round((want / 1000) * 100) / 100) <= 0.01,
    'metres are the trimmed lengths, nothing more');
});

test('F7 — the FLAT TWIN: a flat room\'s strips are byte-identical', () => {
  const r = build(null);
  const kinds = [{ kind: 'top' }, { kind: 'top_under' }, { kind: 'side', ref: 'L' },
    { kind: 'side', ref: 'R' }, { kind: 'bottom' }];
  const out = strips(r, kinds);
  // The flat law, spelled out as it has stood since T33/T34: full width at H,
  // full interior height on the sides — and no T55 field leaks onto them.
  const top = out.find((s) => s.kind === 'top');
  assert.deepEqual([top.box.x, top.box.y, top.box.w], [G, H, W - 2 * G]);
  assert.equal(top.itemId, undefined, 'no split, no new field');
  const under = out.find((s) => s.kind === 'top_under');
  assert.deepEqual([under.box.y, under.box.w], [H - G - (P.lighting?.strip?.thickness || 3), W - 2 * G]);
  for (const s of out.filter((q) => q.kind === 'side')) {
    assert.equal(s.box.h, H - 2 * G, 'full interior height');
    assert.equal(s.length_mm, H - 2 * G);
  }
  void canonical;
});

test('F7 — one sampler: the LISP names the law and ledStrips imports the carcass\'s own', () => {
  // In SKYLON_COMMON, not KIT_LED_GROOVE: T47's census law keeps every
  // SKY:cut* reference in the one shared file.
  const lisp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /THE LED LEARNS THE RAKE: LEVEL RUNS ONLY/);
  assert.match(lisp, /\(defun SKY:ledRoofTopAt \(pts infill x wys\)/);
  const src = readFileSync(new URL('../src/engine/ledStrips.js', import.meta.url), 'utf8');
  assert.match(src, /carcassCutLineOf/, 'the named source is the carcass\'s own law');
  assert.doesNotMatch(src, /function slopeHeightAt|const slopeHeightAt =/,
    'no second sampler lives here');
});
