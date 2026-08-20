// ─── TURN 42 (CLAUDE.md F2): OVERLAY DRAWER RUNNERS JOIN THE GLB CHANNEL ────
//
// The owner: *"w nowych szufladach zamiast się podstawić ładne GLB, to znowu
// się pojawiają te gówna kodowane."*
//
// ─── WHAT THE TRACE ACTUALLY FOUND, WHICH IS NOT WHAT THE BRIEF EXPECTED ────
//
// CLAUDE.md reasoned: *"`engine/runners.js` has no overlay path, so the drawing
// is NOT coming through `runnerLadder` — someone draws L-profiles by hand.
// Name the place in the commit body."*
//
// THERE IS NO SUCH PLACE. Measured, three ways:
//
//   · `grep -rn overlay src/3d/` returns the English word in four unrelated
//     comments and nothing else. No file under `src/3d/` knows overlay drawers
//     exist.
//   · The only runner geometry in the app is the SHARED fallback inside
//     `<Runners>` (Hardware.jsx) — two `<Pieces>`, an upright face and a
//     flange — and it is driven by `instances.runners`, the very array the GLB
//     path reads. There is no overlay branch, no overlay component, no
//     overlay data.
//   · `hardware3d.js runnerInstances` reads `drillSummary.runner_rows_carcass_y`
//     and the `DRAWER-SIDE` panels. The overlay stack satisfies both, because
//     `cabinet.js` runs the BUDR ladder for it. It has been on the GLB channel
//     since the day it shipped.
//
// So there was nothing to route and nothing to delete. What the owner saw was
// the shared fallback FIRING — the stand-in every runner in the app falls back
// to when the bucket has no model — and the reason it fired is below.
//
// ─── THE ROOT CAUSE, NAMED BY THE MODULE'S OWN LAW ──────────────────────────
//
// `engine/runners.js runnerAskFor` says, in as many words: *"This is the ONE
// place the +10 is applied. Every caller that has a BOX DEPTH in its hand and
// wants a nominal asks here; nobody adds ten of their own."*
//
// Exactly one caller in the app had a box depth in its hand and did not ask:
// `3d/Hardware.jsx`, the view. So the picture and the order form asked the
// ladder two different questions, and a bucket carrying the article the BOM
// orders — and nothing at the rung below it — answered the picture with null.
// Null is the grey L-profile. It hits the DEEPEST boxes first, which is why it
// arrived with the overlay stack (490 mm box) while the wardrobe's own internal
// stack (440 mm) went on looking right.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import {
  clearRunnerCatalogue, ladderRungFor, runnerAskFor, runnerEntry, runnerLadder,
  runnerModelSrc, setRunnerCatalogue,
} from '../src/engine/runners.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const SHOWROOM = JSON.parse(read('test/fixtures/hardware-local/hardware/runners/blum/movento/manifest.json'));
const M = P.hardware.runner.movento;

/** A wardrobe with an OVERLAY stack on the outside of it. */
const overlayUnit = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, height: 2150,
  sections: [{ items: [1, 2, 3].map((i) => ({ id: `o${i}`, kind: 'overlay_drawer', height_mm: 200 })) }],
  ...over,
}, P);

/** …and an ordinary BUDR, which is the drawer every other one is measured against. */
const budrUnit = (over = {}) => computeCabinet({
  ...defaultParamsFor('BUDR', P), unit_num: '02', ...over,
}, P);

/** The question the VIEW asks — the same expression `3d/Hardware.jsx` uses. */
const viewEntry = (row, variant = M.defaultVariant) => runnerEntry({
  system: M.system,
  nl: runnerAskFor(row.length, P) ?? row.length,
  variant,
  side: row.side,
  ladder: runnerLadder(P),
});

test.beforeEach(() => setRunnerCatalogue(SHOWROOM));
test.after(() => clearRunnerCatalogue());

// ═══ 1. THE OVERLAY STACK IS ON THE CHANNEL, AND ALWAYS WAS ════════════════

test('F2 — the overlay stack gets runner ROWS and INSTANCES, like any BUDR drawer', () => {
  const overlay = overlayUnit();
  assert.equal(overlay.assemblies.overlayDrawers.count, 3, 'the stack is really there');
  assert.ok(overlay.drillSummary.runner_rows_carcass_y.length === 3, 'three runner rows');
  assert.equal(overlay.panels.filter((p) => p.part === 'DRAWER-SIDE').length, 6, 'and six box sides');

  const rows = hardwareInstances(overlay, P).runners;
  assert.equal(rows.length, 6, 'six runner instances — one per side per drawer');
  for (const r of rows) {
    assert.equal(r.kind, 'runner');
    assert.ok(r.length > 0 && Number.isFinite(r.y) && Number.isFinite(r.rowY));
  }
  // The SAME generator, the same array, the same shape as a BUDR's — there is
  // no second path for the overlay stack to be on.
  const budr = hardwareInstances(budrUnit(), P).runners;
  assert.deepEqual(Object.keys(rows[0]).sort(), Object.keys(budr[0]).sort());
});

test('F2 — nothing under src/3d/ knows what an overlay drawer is', () => {
  // The claim CLAUDE.md's trace made the other way round. Asserted, so the day
  // somebody DOES special-case the overlay stack in the view, this says so.
  for (const file of ['src/3d/Hardware.jsx', 'src/3d/UnitView.jsx', 'src/3d/Scene.jsx', 'src/engine/runners.js']) {
    const code = read(file).split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    assert.doesNotMatch(code, /overlayPlan|overlay_drawer|overlayDrawers/,
      `${file} special-cases the overlay stack`);
  }
});

// ═══ 2. THE ROOT CAUSE, AND THE FIX ════════════════════════════════════════

test('F2 — an OVERLAY drawer at depth D resolves the SAME entry as a BUDR drawer at D', () => {
  // CLAUDE.md's own named test.
  const overlay = hardwareInstances(overlayUnit(), P).runners[0];
  const budr = hardwareInstances(budrUnit(), P).runners[0];
  assert.equal(overlay.length, budr.length, 'the same box depth');

  const a = viewEntry(overlay);
  const b = viewEntry(budr);
  assert.ok(a, 'the overlay drawer resolves an entry at all — this is the whole feature');
  assert.deepEqual(a, b, 'and it is the same entry, article for article');
  assert.equal(
    runnerModelSrc(a, P, 'https://x/'),
    runnerModelSrc(b, P, 'https://x/'),
    'and therefore the same GLB source',
  );
  assert.match(a.file, /\.glb$/);
});

test('F2 — THE MODEL DRAWN IS THE ARTICLE THE BOM ORDERS — one question, one answer', () => {
  for (const [label, result] of [['overlay', overlayUnit()], ['budr', budrUnit()]]) {
    const row = hardwareInstances(result, P).runners[0];
    const spec = result.hardware.find((h) => h.role === 'runner_pairs').spec;
    const drawn = viewEntry(row);
    assert.ok(drawn, `${label}: a model to draw`);
    assert.equal(drawn.nl, spec.nl, `${label}: the drawn NL is the ordered NL`);
    assert.equal(drawn.article, spec.articles.L, `${label}: and the drawn article is the ordered article`);
  }
});

test('F2 — the view ASKS `runnerAskFor`, which is the law it was breaking', () => {
  const hw = read('src/3d/Hardware.jsx');
  assert.match(hw, /nl: runnerAskFor\(r\.length, profile\) \?\? r\.length,/,
    'the one caller that had a box depth and did not ask, now asks');
  assert.match(hw, /runnerAskFor/, 'and it imports it rather than adding ten of its own');
  assert.doesNotMatch(hw, /r\.length \+ 10|\+ 10\b/, 'nobody adds ten of their own');

  // The arithmetic the fault was made of, kept as a fact rather than a memory.
  const box = hardwareInstances(overlayUnit(), P).runners[0].length;
  assert.equal(box, 490, 'the overlay stack runs the BUDR depth law and lands on 490');
  assert.equal(runnerAskFor(box, P), 500, 'the nominal a workshop orders against it');
  assert.equal(ladderRungFor(box, P), 450, 'the rung the OLD view landed on…');
  assert.equal(ladderRungFor(runnerAskFor(box, P), P), 500, '…and the rung it lands on now');
});

test('F2 — every drawer family the app draws now resolves a model, not a stand-in', () => {
  // The fault was never overlay-specific and the fix is not either: it reaches
  // every stack whose box depth sat one rung below the article being ordered.
  const CASES = [
    ['overlay stack', overlayUnit()],
    ['BUDR base unit', budrUnit()],
    ['BUDR4', computeCabinet({ ...defaultParamsFor('BUDR4', P), unit_num: '03' }, P)],
    ['wardrobe internal stack', computeCabinet({
      ...defaultParamsFor('WARDROBE', P), unit_num: '04', width: 900, drawers: 2,
    }, P)],
    ['PANTRY', computeCabinet({ ...defaultParamsFor('PANTRY', P), unit_num: '05' }, P)],
  ];
  for (const [label, result] of CASES) {
    const rows = hardwareInstances(result, P).runners;
    assert.ok(rows.length > 0, `${label}: has runners at all`);
    for (const row of rows) {
      assert.ok(viewEntry(row), `${label}: box ${row.length} → no model, still a stand-in`);
    }
  }
});

// ═══ 3. THE STAND-IN STAYS — IT IS NOT THE FAULT, IT IS THE SAFETY NET ═════

test('F2 — the parametric profile is UNREACHABLE for the overlay stack, and only for that reason', () => {
  // CLAUDE.md licensed deleting "the hand-coded overlay runner drawing … once
  // found". It does not exist: the two `<Pieces>` in `<Runners>` are the SHARED
  // stand-in every runner in the app falls back to when the bucket has no
  // model, and taking it out would leave a drawer with NOTHING on its sides in
  // mock mode, offline, or on a hardware family nobody has uploaded yet. So it
  // stays, and what is asserted instead is that the overlay stack never reaches
  // it while the bucket has the article.
  const rows = hardwareInstances(overlayUnit(), P).runners;
  for (const row of rows) assert.ok(viewEntry(row), 'a model, so `plain` never gets this row');

  // …and with NO catalogue at all it IS reached, which is the safety net doing
  // its job rather than a fault.
  clearRunnerCatalogue();
  for (const row of rows) assert.equal(viewEntry(row), null, 'no bucket, no model — the stand-in is drawn');
  setRunnerCatalogue(SHOWROOM);

  const hw = read('src/3d/Hardware.jsx');
  assert.match(hw, /const plain = useMemo\(\(\) => items\.filter\(\(_, i\) => !models\[i\]\), \[items, models\]\)/,
    'the stand-in is chosen per ROW, on whether that row got a model');
});

test('F2 — X-RAY: the overlay runners obey the one gate every other runner obeys', () => {
  const hw = read('src/3d/Hardware.jsx');
  // One gate for the whole family — there is no second one for the overlay
  // stack to be missing from.
  assert.match(hw, /\{\(xray \|\| runners\) && \(/);
  assert.match(read('src/3d/UnitView.jsx'), /runners=\{!contour && \(hideFronts \|\| anyFrontOpen\)\}/);
  // And both the GLB and the stand-in live inside the same <SlideOut>, so an
  // opened overlay drawer takes its runners with it exactly as a BUDR does.
  const at = hw.indexOf('function Runners({');
  const block = hw.slice(at, hw.indexOf('\nfunction ', at + 10));
  assert.match(block, /<SlideOut key=\{`d\$\{drawer\}`\} distance=\{slideOf\(drawer\)\}>/);
});
