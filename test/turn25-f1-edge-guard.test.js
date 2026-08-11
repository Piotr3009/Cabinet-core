// ─── F1 — THE DUPLICATE-EDGE GUARD (turn 25, CLAUDE.md F1) ──────────────────
//
// ─── THE POST-MORTEM, IN TWO SENTENCES ──────────────────────────────────────
//
// The owner found an edge drawn TWICE in a polyline in his own AutoLISP:
// VCarve does not treat a doubled edge as one line seen twice — it offsets the
// two coincident paths in OPPOSITE directions, cuts the panel from the outside
// AND from the inside on the same run, and the board goes in the skip. He fixed
// it in `panel_joints.lsp`; this file is the permanent guard on OUR exporter so
// that no future turn can ship the same fault out of the JavaScript side.
//
// ─── WHAT IS RUN, AND OVER WHAT ─────────────────────────────────────────────
//
// Every panel of every probe scenario (`scripts/cnc-scenarios.mjs` — the same
// list the fingerprint report is taken over, so the two cannot disagree about
// what "every scenario" means) AND every case of every golden fixture. A red
// result FAILS THE SUITE, which is what "wire it into the standard test run,
// not a separate script" asks for: `npm test` inherits it, so every future turn
// does too.
//
// ─── AND IF IT GOES RED ─────────────────────────────────────────────────────
//
// CLAUDE.md F1.4: "the engine builds outlines procedurally and is expected to
// pass today. If it does NOT, fix the generator — never the test." The
// thresholds here are not adjustable knobs; the tolerance is one number
// (`EDGE_TOLERANCE`, 0.01 mm) and the winding is one convention.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet, notchedPlinth } from '../src/engine/cabinet.js';
import {
  socketCentres, tabPointsDown, tabPointsLeft, tabPointsUp, topPanelGeometry,
} from '../src/engine/puzzle.js';
import {
  CUTOUT_WINDING, EDGE_TOLERANCE, OUTER_WINDING, formatFinding, isInterior, loopFindings,
  panelFindings, resultFindings, signedArea, windingOf,
} from '../src/engine/cnc/edgeGuard.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { cases } from '../scripts/cnc-scenarios.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'fixtures');

// ─── The unit under the microscope: the guard itself ────────────────────────

test('F1.1 — a clean rectangle passes every test the guard makes', () => {
  const square = [[0, 0], [100, 0], [100, 50], [0, 50]];
  assert.deepEqual(loopFindings(square), []);
  assert.equal(windingOf(square), 'ccw');
  assert.ok(signedArea(square) > 0);
});

test('F1.1 — the doubled edge is CAUGHT', () => {
  // The owner's fault, in its purest form: the top edge traced out and back.
  const doubled = [[0, 0], [100, 0], [100, 50], [0, 50], [100, 50]];
  const codes = loopFindings(doubled).map((f) => f.code);
  assert.ok(codes.includes('duplicate-segment'), `expected duplicate-segment, got ${codes.join(', ')}`);
});

test('F1.1 — a doubled edge is caught however it is traced', () => {
  // …and in the other direction, which is the case a naive "same two points in
  // the same order" test walks straight past.
  const there = [[0, 0], [50, 0], [100, 0], [100, 50], [0, 50]];
  const back = [...there.slice(0, 3), [50, 0], [100, 0], [100, 50], [0, 50]];
  assert.deepEqual(loopFindings(there), []);
  assert.ok(loopFindings(back).some((f) => f.code === 'duplicate-segment'));
});

test('F1.1 — HALF an edge drawn twice is caught too', () => {
  // The partial version: two collinear segments sharing a run rather than the
  // whole line. It cuts the board exactly as badly.
  const overlap = [[0, 0], [100, 0], [60, 0], [60, 50], [0, 50]];
  const codes = loopFindings(overlap).map((f) => f.code);
  assert.ok(codes.includes('overlapping-run'), `expected overlapping-run, got ${codes.join(', ')}`);
});

test('F1.1 — a dangling end and a zero-length segment are caught', () => {
  const repeated = [[0, 0], [100, 0], [100, 50], [0, 50], [0, 0]];
  assert.ok(loopFindings(repeated).some((f) => f.code === 'repeated-closing-point'));

  const stutter = [[0, 0], [100, 0], [100, 0], [100, 50], [0, 50]];
  assert.ok(loopFindings(stutter).some((f) => f.code === 'zero-length-segment'));
});

test('F1.1 — segments that merely CROSS at a corner are not a fault', () => {
  // Every tab profile in this engine is corners. A guard that called a shared
  // POINT an overlap would be red on every side panel in the project.
  const tabbed = [[0, 0], [100, 0], [100, 20], [110, 20], [110, 30], [100, 30], [100, 50], [0, 50]];
  assert.deepEqual(loopFindings(tabbed), []);
});

test('F1.2 — winding: the outer loop is anticlockwise, a cut-out is not', () => {
  const ccw = [[0, 0], [100, 0], [100, 50], [0, 50]];
  const cw = [...ccw].reverse();
  assert.equal(windingOf(ccw), 'ccw');
  assert.equal(windingOf(cw), 'cw');
  assert.equal(OUTER_WINDING, 'ccw');
  assert.equal(CUTOUT_WINDING, 'cw');
  assert.ok(loopFindings(cw, { winding: OUTER_WINDING }).some((f) => f.code === 'wrong-winding'));
  assert.ok(loopFindings(ccw, { winding: CUTOUT_WINDING }).some((f) => f.code === 'wrong-winding'));
  assert.deepEqual(loopFindings(cw, { winding: CUTOUT_WINDING }), []);
});

test('F1.2 — a loop inside the outline is a cut-out; one that breaks the edge is not', () => {
  const outline = [[0, 0], [100, 0], [100, 50], [0, 50]];
  assert.equal(isInterior([[20, 20], [40, 20], [40, 30], [20, 30]], outline), true);
  // A socket overshoots the board's edge by 6 mm on purpose, so the cutter
  // enters and leaves off the work — that is a piece of the PROFILE, not a hole.
  assert.equal(isInterior([[20, -6], [40, -6], [40, 9], [20, 9]], outline), false);
});

test('F1 — the tolerance is 0.01 mm and it is the only one', () => {
  assert.equal(EDGE_TOLERANCE, 0.01);
  // Two points a thousandth apart are the same point; a hundredth-and-a-half is
  // not, which is what makes a real 0.02 mm sliver findable.
  const withinTol = [[0, 0], [100, 0], [100, 50], [0, 50], [0.005, 0.005]];
  assert.ok(loopFindings(withinTol).some((f) => f.code === 'repeated-closing-point'));
});

// ─── EVERY PANEL, EVERY SCENARIO ────────────────────────────────────────────

const SCENARIOS = cases();

test('F1.3 — every panel of every probe scenario passes the guard', () => {
  assert.ok(SCENARIOS.length > 100, `only ${SCENARIOS.length} scenarios — the probe list did not load`);
  const failures = [];
  let panels = 0;
  for (const c of SCENARIOS) {
    let result;
    try {
      result = computeCabinet(c.params, P);
    } catch {
      // A scenario a type refuses is not this guard's business; the fingerprint
      // report already prints it as an ERROR row.
      continue;
    }
    panels += result.panels.filter((p) => Array.isArray(p.cnc?.outline) && p.cnc.outline.length >= 2).length;
    for (const f of resultFindings(result)) failures.push(`${c.id}  ${formatFinding(f)}`);
  }
  assert.ok(panels > 1000, `only ${panels} outlines checked — the sweep is not reaching the parts`);
  assert.deepEqual(
    failures.slice(0, 40), [],
    `${failures.length} duplicate-edge / winding fault(s) across ${panels} outlines`,
  );
});

// ─── …AND THE GOLDEN SET ────────────────────────────────────────────────────

/**
 * Every golden case, as a cabinet the engine can actually build.
 *
 * A fixture's `inputs` states what that CASE is about and leaves the rest to
 * the type — several of the wall-mask cases carry a run's `count` and no
 * `height` at all, because what they pin is the masking board across a run and
 * not a carcass. Laid over `defaultParamsFor`, each one is the cabinet the
 * fixture describes; taken raw, a missing height would build a panel of
 * negative size and this guard would be reporting arithmetic rather than
 * geometry.
 */
function goldenCases() {
  const out = [];
  for (const name of readdirSync(FIXTURES).filter((f) => f.startsWith('golden-') && f.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
    for (const c of doc.cases || []) {
      if (!c.inputs?.type) continue;
      out.push({
        id: `${name}:${c.id}`,
        params: { ...defaultParamsFor(c.inputs.type, P), ...c.inputs },
      });
    }
  }
  return out;
}

test('F1.3 — every panel of every golden case passes the guard', () => {
  const golden = goldenCases();
  assert.ok(golden.length >= 10, `only ${golden.length} golden cases found`);
  const failures = [];
  let panels = 0;
  for (const c of golden) {
    const result = computeCabinet(c.params, P);
    panels += result.panels.filter((p) => Array.isArray(p.cnc?.outline) && p.cnc.outline.length >= 2).length;
    for (const f of resultFindings(result)) failures.push(`${c.id}  ${formatFinding(f)}`);
  }
  assert.deepEqual(failures.slice(0, 40), [], `${failures.length} fault(s) across ${panels} golden outlines`);
});

test('F1.2 — every outline in the golden set runs ANTICLOCKWISE', () => {
  // Stated separately from the sweep above so the convention has a test with
  // its own name: this is the signal VCarve reads to know which side of the
  // line the material is on, and it is the owner's corrected LISP's direction.
  const wrong = [];
  for (const c of goldenCases()) {
    const result = computeCabinet(c.params, P);
    for (const p of result.panels) {
      const o = p.cnc?.outline;
      if (!Array.isArray(o) || o.length < 3) continue;
      if (windingOf(o) !== 'ccw') wrong.push(`${c.id} ${p.id} → ${windingOf(o)}`);
    }
  }
  assert.deepEqual(wrong, []);
});

// ─── WHAT THE GUARD FOUND, AND WHAT THE FIX COST ────────────────────────────

test('F1.4 — the TOP is the SAME SHAPE it was, traced once instead of twice', () => {
  // The fix is a re-order and the claim is that it is ONLY a re-order. Two
  // facts prove it, and both are checkable without a baseline checkout:
  //
  //   the set of points is unchanged — nothing was added, nothing dropped;
  //   the enclosed area is unchanged — so the boundary is the same boundary.
  //
  // The old traversal's points, in the old order, taken from turn 24's
  // `topPanelGeometry`: bottom edge plain, up the right, tabs across the top,
  // tabs down the back, BACK TO THE ORIGIN, then the bottom edge again with
  // its tabs on it.
  const g = topPanelGeometry({
    drawnW: 540, drawnH: 564, G: 18, puzzle: P.puzzle,
  });
  const alongDepth = socketCentres(540, P.puzzle);
  const alongWidth = socketCentres(564, P.puzzle);
  const old = [
    [0, 0], [540, 0], [540, 564],
    ...[...alongDepth].reverse().flatMap((cx) => tabPointsUp(564, cx, 18, P.puzzle)),
    [0, 564],
    ...[...alongWidth].reverse().flatMap((cy) => tabPointsLeft(0, cy, 18, P.puzzle)),
    [0, 0],
    ...alongDepth.flatMap((cx) => tabPointsDown(0, cx, 18, P.puzzle)),
  ];

  const asSet = (pts) => [...new Set(pts.map(([x, y]) => `${x},${y}`))].sort();
  assert.deepEqual(asSet(g.outline), asSet(old), 'the fix changed WHICH points the part is cut to');

  // ONE vertex fewer, and it is the one that was the fault: the origin,
  // written a second time in the middle of the polyline. Everything else is
  // where it was, which is what "a re-order and nothing else" has to mean as a
  // number rather than as a sentence.
  assert.equal(old.filter(([x, y]) => x === 0 && y === 0).length, 2, 'the old traversal visited the origin twice');
  assert.equal(g.outline.filter(([x, y]) => x === 0 && y === 0).length, 1, 'the new traversal visits it once');
  assert.equal(g.outline.length, old.length - 1, 'exactly one vertex — the repeated origin — should have gone');
  assert.equal(
    Math.round(signedArea(g.outline)), Math.round(signedArea(old)),
    'the fix changed the area the boundary encloses',
  );

  // …and the old order really was the fault, so nobody has to take the
  // post-mortem on trust.
  assert.ok(
    loopFindings(old).some((f) => f.code === 'overlapping-run'),
    'the turn-24 traversal should have been red — check the reconstruction above',
  );
  assert.deepEqual(loopFindings(g.outline), []);
});

test('F1.4 — the notched plinth is one board, not a path drawn back over itself', () => {
  // The second fault the guard found: where the appliance opening spans the
  // WHOLE plinth — every D/W panel's own — turn 17's vertex de-duplication left
  // both ends of the board in the file twice. What is left of that board is a
  // strip, and a strip is what it is cut to now.
  const strip = notchedPlinth(600, 100, 0, 600, 20);
  assert.deepEqual(strip.outline, [[0, 80], [600, 80], [600, 100], [0, 100]]);
  assert.deepEqual(loopFindings(strip.outline), []);

  // The three shapes either side of it are checked with the same one function.
  for (const [label, geo] of [
    ['notch in the middle', notchedPlinth(1800, 100, 600, 600, 20)],
    ['opening at the left end', notchedPlinth(1800, 100, 0, 600, 20)],
    ['opening at the right end', notchedPlinth(1800, 100, 1200, 600, 20)],
  ]) {
    assert.deepEqual(loopFindings(geo.outline), [], label);
  }

  // The AREA is the board less the opening, in every one of them — which is
  // what says the fix cut the right shape and not merely a legal one.
  const area = (g) => Math.round(signedArea(g.outline));
  assert.equal(area(notchedPlinth(1800, 100, 600, 600, 20)), 1800 * 100 - 600 * 80);
  assert.equal(area(notchedPlinth(1800, 100, 0, 600, 20)), 1800 * 100 - 600 * 80);
  assert.equal(area(notchedPlinth(1800, 100, 1200, 600, 20)), 1800 * 100 - 600 * 80);
  assert.equal(area(strip), 600 * 20);
});

test('F1.3 — the guard SEES a fault planted in a real panel', () => {
  // A guard nobody has watched fail is a guard nobody knows is wired up. This
  // takes a real side panel off a real cabinet, doubles one edge of it, and
  // asserts the sweep goes red — which is the proof that the sweep above is
  // reading the geometry it claims to read.
  const result = computeCabinet({ ...SCENARIOS[0].params }, P);
  const side = result.panels.find((p) => p.part === 'BUL');
  assert.ok(side, 'no side panel in the first scenario');
  assert.deepEqual(panelFindings(side), []);

  const sabotaged = {
    ...side,
    cnc: { ...side.cnc, outline: [...side.cnc.outline, side.cnc.outline[1]] },
  };
  const codes = panelFindings(sabotaged).map((f) => f.code);
  assert.ok(codes.length > 0, 'the guard did not see a doubled edge in a real panel');
});
