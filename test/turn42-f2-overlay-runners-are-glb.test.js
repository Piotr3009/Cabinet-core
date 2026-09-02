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

// ─── AMENDED BY TURN 43 (CLAUDE.md iron rule 8 and F7) ──────────────────────
//
// Four of the tests below were GREEN FOR THE WRONG REASON, and CLAUDE.md T43
// names it: *"T42-F2's probe was green because its showroom INVENTED rung 500
// (`760H500T_3000500.glb`, article `3000500T` — no such file, no such article
// exists in the shop)."* The showroom is pinned to the committed snapshot now
// (`reference/hardware/movento.json`, NL 250–450), so the arithmetic this file
// measured is unchanged and the ANSWERS are the shop's:
//
//     box 490 → ask NL 500 → rung 500 → the snapshot stops at 450 → no article
//     box 440 → ask NL 450 → rung 450 → article 46204387, but VARIANT S only
//
// The LAWS T42 wrote all stand and are all still asserted — the overlay stack
// is on the same channel as any BUDR drawer, it asks the same question, and the
// model drawn is the article the BOM orders. What changed is that a rung the
// owner cannot buy now answers `null` here exactly as it answers `null` in his
// workshop, and T43-F7 makes that `null` draw NOTHING and speak in the Check
// panel instead of quietly becoming a grey L-profile.

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

/**
 * T43: the variant the snapshot actually stocks at the rung a 440 box asks for.
 * NL450 exists in the shop in `S` and in `S` only — which is a fact about the
 * owner's bucket and not about this test, and is exactly the kind of fact an
 * invented showroom hid.
 */
const STOCKED = { nl: 450, variant: 'S' };

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
  // CLAUDE.md's own named test. THE LAW IS THE EQUALITY, and it holds at every
  // depth — including the one the shop cannot answer.
  const overlay = hardwareInstances(overlayUnit(), P).runners[0];
  const budr = hardwareInstances(budrUnit(), P).runners[0];
  assert.equal(overlay.length, budr.length, 'the same box depth');
  assert.deepEqual(viewEntry(overlay), viewEntry(budr), 'the same entry, article for article');

  // T43: at 490 the honest answer is `null` — the ladder asks NL 500 and the
  // owner's bucket tops out at 450. Both families agree on the nothing.
  assert.equal(viewEntry(overlay), null, 'a 490 box asks NL 500, which the shop does not stock');

  // …and at a depth the shop DOES stock, both resolve the same real file.
  const shallow = hardwareInstances(overlayUnit({ depth: 508 }), P).runners[0];
  const shallowBudr = hardwareInstances(budrUnit({ depth: 508 }), P).runners[0];
  const a = viewEntry(shallow, STOCKED.variant);
  const b = viewEntry(shallowBudr, STOCKED.variant);
  assert.ok(a, `NL${STOCKED.nl} ${STOCKED.variant} is in the snapshot and resolves`);
  assert.deepEqual(a, b, 'and the two families resolve it identically');
  assert.equal(
    runnerModelSrc(a, P, 'https://x/'),
    runnerModelSrc(b, P, 'https://x/'),
    'and therefore the same GLB source',
  );
  assert.match(a.file, /\.glb$/);
});

test('F2 — THE MODEL DRAWN IS THE ARTICLE THE BOM ORDERS — one question, one answer', () => {
  // The law, stated so it is true of BOTH answers: where the BOM has an
  // article the view draws THAT article, and where the BOM has none the view
  // draws nothing. Two questions with one answer, which is the whole feature.
  const CASES = [
    ['overlay', overlayUnit()],
    ['budr', budrUnit()],
    ['overlay, a rung the shop stocks', overlayUnit({ depth: 508 })],
    ['budr, a rung the shop stocks', budrUnit({ depth: 508 })],
  ];
  for (const [label, result] of CASES) {
    for (const variant of ['T', STOCKED.variant]) {
      const row = hardwareInstances(result, P).runners[0];
      const spec = result.hardware.find((h) => h.role === 'runner_pairs').spec;
      const ordered = runnerEntry({
        system: M.system, nl: spec.asked_nl, variant, side: row.side, ladder: runnerLadder(P),
      });
      const drawn = viewEntry(row, variant);
      if (!ordered) {
        assert.equal(drawn, null, `${label} ${variant}: nothing ordered, nothing drawn`);
        continue;
      }
      assert.ok(drawn, `${label} ${variant}: a model to draw`);
      assert.equal(drawn.nl, ordered.nl, `${label} ${variant}: the drawn NL is the ordered NL`);
      assert.equal(drawn.article, ordered.article, `${label} ${variant}: and the drawn article is the ordered one`);
    }
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

test('F2 — every drawer family the app draws asks the ONE question, and gets one answer', () => {
  // The fault was never overlay-specific and the fix is not either: it reaches
  // every stack whose box depth sat one rung below the article being ordered.
  //
  // ─── AMENDED BY T43 ─────────────────────────────────────────────────────
  // T42 asserted a MODEL for every family, which was only ever true because the
  // showroom stocked rungs the shop does not. What is asserted now is the fix
  // itself — the view and the BOM ask the same ladder the same question — plus
  // the census of which families the owner's own bucket can answer TODAY,
  // printed rather than assumed. That census is what F7's red check speaks.
  const CASES = [
    ['overlay stack', overlayUnit()],
    ['BUDR base unit', budrUnit()],
    ['BUDR4', computeCabinet({ ...defaultParamsFor('BUDR4', P), unit_num: '03' }, P)],
    ['wardrobe internal stack', computeCabinet({
      ...defaultParamsFor('WARDROBE', P), unit_num: '04', width: 900, drawers: 2,
    }, P)],
    ['PANTRY', computeCabinet({ ...defaultParamsFor('PANTRY', P), unit_num: '05' }, P)],
  ];
  const census = [];
  for (const [label, result] of CASES) {
    const rows = hardwareInstances(result, P).runners;
    assert.ok(rows.length > 0, `${label}: has runners at all`);
    const spec = result.hardware.find((h) => h.role === 'runner_pairs').spec;
    for (const row of rows) {
      // ONE question: the nominal the view asks IS the nominal the BOM asked.
      assert.equal(runnerAskFor(row.length, P), spec.asked_nl,
        `${label}: box ${row.length} asks the same nominal the order form asked`);
    }
    census.push(`${label}: box ${rows[0].length} → NL${spec.asked_nl} → ${viewEntry(rows[0]) ? 'stocked' : 'NO ARTICLE'}`);
  }
  // eslint-disable-next-line no-console
  console.log(`      ${census.join('\n      ')}`);
});

// ═══ 3. THE STAND-IN STAYS — IT IS NOT THE FAULT, IT IS THE SAFETY NET ═════

test('F2 — the parametric profile is GONE, by the owner\'s own order (T43-F7)', () => {
  // ─── AMENDED BY T43 (CLAUDE.md F7) ──────────────────────────────────────
  //
  // T42 wrote: *"taking it out would leave a drawer with NOTHING on its sides
  // in mock mode, offline, or on a hardware family nobody has uploaded yet. So
  // it stays."* The owner's answer, 20.08.2026, after the fourth grey overlay:
  // *"jak kod nadpisuje to go usuń."* Nothing was overriding anything — the
  // fallback won by SILENCE — and NOTHING on the sides is precisely what he
  // wants, because an empty groove asks a question and a fake answers one.
  //
  // So what T42 asserted is inverted, deliberately, and named as such.
  const hw = read('src/3d/Hardware.jsx');
  const at = hw.indexOf('function Runners({');
  const block = hw.slice(at, hw.indexOf('\nfunction ', at + 10));
  assert.ok(!/const plain = useMemo/.test(block), 'the `plain` list is deleted');
  assert.ok(!/placeFace|placeFlange/.test(block), 'and so are its two placers');
  assert.ok(!/<Pieces/.test(block), 'and both <Pieces> blocks with them');
  assert.match(block, /<primitive/, 'what is left is the manufacturer\'s own model, and only that');

  // `reportHardware` stays byte for byte: the walk still tells a model from a
  // hole, and its two reasons still read exactly as they did.
  assert.match(block, /reportHardware\(surface, 'runner'/);
  assert.match(block, /reason: models\[i\] \? null : \(w\.url \? 'no-model' : 'no-url'\)/);

  // …and with NO catalogue at all every row is still a `null` entry, which is
  // now an empty groove and a red check rather than grey plastic.
  const rows = hardwareInstances(overlayUnit(), P).runners;
  clearRunnerCatalogue();
  for (const row of rows) assert.equal(viewEntry(row), null, 'no bucket, no model — and now, nothing drawn');
  setRunnerCatalogue(SHOWROOM);
});

test('F2 — X-RAY: the overlay runners obey the one gate every other runner obeys', () => {
  const hw = read('src/3d/Hardware.jsx');
  // One gate for the whole family — there is no second one for the overlay
  // stack to be missing from.
  // ─── AMENDED BY T63 F1 ─────────────────────────────────────────────────
  // The gate is the same gate. What stands beside it is the CLIENT's channel
  // (`hardwareAlways()` — `chromeOn('hardware-always') && !proChromeOn()`),
  // which reads `false` in PRO because PRO never switches its chrome off, so
  // for a joiner the expression is still `(xray || runners)` and nothing else.
  // `test/turn63-f1-hinges-always.test.js` proves that half.
  assert.match(hw, /\{\(xray \|\| runners \|\| hardwareAlways\(\)\) && \(/);
  assert.match(read('src/3d/UnitView.jsx'), /runners=\{!contour && \(hideFronts \|\| anyFrontOpen\)\}/);
  // And both the GLB and the stand-in live inside the same <SlideOut>, so an
  // opened overlay drawer takes its runners with it exactly as a BUDR does.
  const at = hw.indexOf('function Runners({');
  const block = hw.slice(at, hw.indexOf('\nfunction ', at + 10));
  assert.match(block, /<SlideOut key=\{`d\$\{drawer\}`\} distance=\{slideOf\(drawer\)\}>/);
});
