import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { shakerCutPocket, shakerPocket } from '../src/engine/shaker.js';
import { runChecks, CHECKS } from '../src/engine/checks.js';

// ─── TURN 46 · F4 — OPTION A: THE FRONT IS CUT ON THE SLOPE ─────────────────
//
// The owner's law, verbatim: *"tniemy po skosie, brak wyboru otwierania, musi
// być od skosu."*
//
//   *"The door over a cut opening is a PENTAGON — cut on the same diagonal,
//   minus the standard gaps along every edge including the diagonal one."*
//   *"Hinge side is FORCED — no user choice: hinges live on the full-height
//   edge, the door opens from the slope end. … Hinge count comes from the tall
//   edge's height through the EXISTING chain … the diagonal edge never carries
//   a hinge."*
//
// THE FRAME THIS IS ALL WRITTEN IN. A front's cut frame is the INSIDE MIRROR —
// origin at the leaf's bottom RIGHT corner, x running LEFT (`joinery.js
// panelPlacement`; T28-F2b is the scar from forgetting it). So the outline
// below is the ROOM's picture reversed, and the assertions say which is which.
//
// T54-F1 AMENDED (28.08.2026): `slope_cut.pts` (y0/y1 here) is now the
// CEILING polyline and `infill` rides beside it as the strip's CUT height;
// the carcass — and the LEAF with it — is cut on the LOWERED line
// `cutReach(x) = ceil(x) − infill / cos β` (`engine/puzzle.js
// carcassCutPts`), no longer on the pts directly. Every expected number
// below is recomputed onto that line; the assertions' intent is unchanged.

const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
// T54-F1 AMENDED (28.08.2026): 2400 → 1200 is now the CEILING; the fall is
// 1200 over 600 so cos β = 600/√(600² + 1200²) = 1/√5 and the vertical
// reserve is 40·√5 = 89.4427 — the carcass line runs 2310.5573 → 1110.5573.
const CUT = { y0: 2400, y1: 1200, infill: 40 };
const cutWardrobe = (over = {}) => computeCabinet({ ...PARAMS, slope_cut: CUT, ...over }, P);
const frontsOf = (r) => r.panels.filter((p) => p.part === 'FRONT');
const props = readFileSync(new URL('../src/components/ElementProperties.jsx', import.meta.url), 'utf8');

test('THE DOOR IS A PENTAGON, cut on the same diagonal', () => {
  const [f] = frontsOf(cutWardrobe());
  assert.equal(f.cnc.outline.length, 5, 'five corners');
  // 597 × 2147 leaf. The CEILING is 2400 → 1200 across 600 of cabinet.
  // T54-F1 AMENDED (28.08.2026): the leaf is cut on the LOWERED carcass line
  // `ceil − 40/cos β` = ceil − 89.4427 — over the leaf, less the 3 mm gap on
  // the diagonal, that is 1110.5573 at the room-RIGHT edge (1203 − 89.4427 −
  // 3) and 2304.5573 at the room-LEFT (2397 − 89.4427 − 3) — mirrored onto
  // the sheet, the low corner is the one at sheet x = 0, and the diagonal
  // crosses the 2147 top edge at (2304.5573 − 2147)/2 = 78.7786 room-mm from
  // the leaf's left edge, i.e. sheet x = 598.5 − 80.2786 = 518.2214.
  assert.deepEqual(f.cnc.outline, [[0, 0], [597, 0], [597, 2147], [518.2214, 2147], [0, 1110.5573]]);
  assert.equal(f.h, 2147, 'the cut rectangle is the TALL edge');
  // T47: `knees` joins the record — EMPTY here, because this leaf stands under
  // one straight run. Its outline above is UNCHANGED vertex for vertex, which
  // is F1's safety net asserted on the door.
  // T50-F7 joins the record: `hinges` — what the ladder was on a full door and
  // what it is on this one. HERE they are equal, because the hinge stile is the
  // full-height edge and this leaf's tall edge is still 2394: nothing was taken
  // off, and the rule says so with a number rather than by being absent.
  // T54-F1 AMENDED (28.08.2026): roomL/roomR/low re-read off the lowered
  // line (was 2394 / 1200 / 1200 when the pts WERE the carcass line).
  // T54-F3 AMENDED (28.08.2026): `angles` joins the record — the door's cut
  // is stated on the sheet exactly as the sides state theirs (`CUT β°`),
  // which until tonight a cut leaf never said.
  assert.deepEqual(f.meta.slopeCut, {
    roomL: 2304.5573,
    roomR: 1110.5573,
    gap: 3,
    corners: 5,
    tall: 2147,
    low: 1110.5573,
    knees: [],
    hinges: { was: 6, now: 6 },
    angles: [{ from: 1.5, to: 598.5, deg: 63.4349 }],
  });
});

test('…minus the standard gap along EVERY edge, the diagonal one included', () => {
  const [f] = frontsOf(cutWardrobe());
  assert.equal(f.meta.slopeCut.gap, P.doors.gap, 'the same 3 that stands between two doors');
  // T54-F1 AMENDED (28.08.2026): the carcass is cut at cutReach(598.5) =
  // 1203 − 89.4427 = 1113.5573 over the leaf's right edge; the door stops 3
  // short of it — 1110.5573 (was 1200 when the pts WERE the carcass line).
  // Under a slope there IS something above — the strip, then the ceiling — so
  // the diagonal always demands the gap.
  assert.equal(f.meta.slopeCut.roomR, 1110.5573, 'measured from the door\'s own datum');
  const carcass = computeCabinet({ ...PARAMS, slope_cut: CUT }, P).panels.find((p) => p.id === 'BUR');
  // T47-F2/F3: the side's BLANK runs up to the peak over its own 18 mm, less
  // the roof board's vertical footprint — it stops UNDER the board now.
  // T54-F1 AMENDED (28.08.2026): the roof line the side stops under is now
  // cutReach, so its SHORT face is cutReach(600) − 18/cos β = 1110.5573 −
  // 40.2492 = 1070.3081 (was 1159.7508 off the old line). The DOOR is not
  // measured against the carcass side at all: it stands in front of it, and
  // its own line is the carcass cut line less the door gap, which is the
  // 1110.5573 asserted above.
  assert.equal(carcass.meta.slopeCut.low, 1070.3081);
  // The leaf never stands proud of the LINE its carcass is cut to. It IS taller
  // than the carcass SIDE now — the side stops under the roof board and the
  // board's own edge is behind the door — so the comparison is against the
  // ceiling, which is where it always belonged.
  const roof = computeCabinet({ ...PARAMS, slope_cut: CUT }, P).panels
    .filter((p) => p.role === 'top');
  // T54-F1 AMENDED (28.08.2026): the roof boards now ride cutReach capped at
  // the cabinet's own H — the raked board's box top is cutReach(600) =
  // 1110.5573 at its pivot and the capped stretch tops out at H = 2150.
  const ceiling = Math.max(...roof.map((p) => p.box.y + p.box.h));
  assert.ok(f.meta.slopeCut.roomR <= ceiling, 'the leaf never stands proud of the ceiling');
});

test('a trapezium when both edges are under the ceiling', () => {
  const [f] = frontsOf(cutWardrobe({ slope_cut: { y0: 1800, y1: 1200, infill: 40 } }));
  assert.equal(f.cnc.outline.length, 4);
  // The leaf stands 1.5 mm in from each carcass edge (half the door gap), so
  // the line is read at 1.5 and 598.5 across the cabinet and not at 0 and 600.
  // T54-F1 AMENDED (28.08.2026): this ceiling falls 600 over 600 — cos β =
  // 1/√2, reserve 40·√2 = 56.5685 — so the old corners 1795.5 and 1198.5
  // (ceiling − gap) each drop by the reserve onto the lowered line.
  assert.deepEqual(f.cnc.outline, [[0, 0], [597, 0], [597, 1738.9315], [0, 1141.9315]]);
});

// ═══ THE HINGE IS FORCED ════════════════════════════════════════════════════

test('the hinges live on the FULL-HEIGHT edge — and the piece says it is forced', () => {
  const [f] = frontsOf(cutWardrobe());
  assert.equal(f.meta.hinge, 'L', 'the ceiling falls to the right, so the left edge is tall');
  assert.equal(f.meta.hingeForced, true);
  const mirrored = frontsOf(cutWardrobe({ slope_cut: { y0: 1200, y1: 2400, infill: 40 } }));
  assert.equal(mirrored[0].meta.hinge, 'R', 'and it follows the slope, not a setting');
});

test('…whatever the unit\'s own hinge setting says', () => {
  const said = frontsOf(cutWardrobe({ hinge: 'R' }));
  assert.equal(said[0].meta.hinge, 'L', '"brak wyboru otwierania" — the setting is overruled');
  // …and with no cut the setting is obeyed exactly as it always was.
  const plain = computeCabinet({ ...PARAMS, hinge: 'R' }, P).panels.filter((p) => p.part === 'FRONT');
  assert.equal(plain[0].meta.hinge, 'R');
  assert.equal(plain[0].meta.hingeForced, undefined);
});

test('THE DIAGONAL EDGE NEVER CARRIES A HINGE: every cup is on the tall edge', () => {
  const r = cutWardrobe();
  const [f] = frontsOf(r);
  const cups = r.drills.filter((d) => d.panel === f.id && d.kind === 'cup');
  assert.ok(cups.length >= 2, 'the door is still hung');
  // hinge 'L' → the cups are drawn at `w − 21.5`, which lands 21.5 mm from the
  // room's LEFT edge — the full-height one (`handles.js`, T28-F2b).
  const xs = [...new Set(cups.map((d) => d.x))];
  assert.deepEqual(xs, [f.w - P.hinges.cups.xFromHingeEdge]);
  // …and not one of them is above the cut.
  for (const d of cups) assert.ok(d.y <= f.h + 1e-6, `cup at ${d.y} is off the leaf`);
});

test('the count comes off the TALL edge through the existing chain', () => {
  // A leaf whose tall edge is 1200 carries fewer hinges than one of 2147 — and
  // the ladder is the app's own (`meta.cupY`, T36-F6's channel), not a new one.
  const tall = frontsOf(cutWardrobe())[0];
  const short = frontsOf(cutWardrobe({ slope_cut: { y0: 1200, y1: 700, infill: 40 } }))[0];
  assert.ok(tall.meta.cupY.length > short.meta.cupY.length,
    `${tall.meta.cupY.length} hinges on the tall leaf, ${short.meta.cupY.length} on the short one`);
  assert.ok(short.meta.cupY.every((y) => y <= short.h), 'no cup past the cut');
});

// ═══ THE SHAKER ═════════════════════════════════════════════════════════════

test('the shaker frame follows all five edges, mitred at the diagonal', () => {
  // MITRED means the inner diagonal is the outer one moved along its OWN
  // normal: the perpendicular distance between them is the frame width exactly,
  // not the frame width measured vertically. The diagonal's inner corner at
  // x = frame is the UPPER of the points sitting there (the lower is the
  // bottom corner).
  const mitre = (pocket, [ax, ay], [bx, by]) => {
    const m = (by - ay) / (bx - ax);
    const inner = pocket.points.filter((q) => q[0] === pocket.x1).sort((a, b) => b[1] - a[1])[0];
    return ((ay + m * (inner[0] - ax)) - inner[1]) / Math.sqrt(1 + m * m);
  };
  const [f] = frontsOf(cutWardrobe());
  const pocket = f.cnc.pockets.find((k) => k.layer === P.front.types.S.pocketLayer);
  assert.ok(pocket, 'a shaker leaf still gets its recess');
  // T54-F1 AMENDED (28.08.2026): on the LOWERED line this leaf's recess is a
  // QUADRILATERAL, not a pentagon — the inner diagonal (the outer one at
  // sheet (0, 1110.5573) → (518.2214, 2147), moved 60 along its normal, i.e.
  // 60·√5 = 134.1641 vertically) meets the tall inner stile at x = 537 at
  // y = 2050.3932, BELOW the inner top rail at 2147 − 60 = 2087 — so the top
  // rail vanishes and the frame follows the four edges the recess has left.
  // The five-edge pentagon law is asserted on the gentler rake below.
  assert.equal(pocket.points.length, 4, 'the top rail is swallowed by the diagonal here');
  const frame = pocket.x1;
  // The stored points are rounded to 4 dp, so the tolerance is a micron.
  const perpendicular = mitre(pocket, [0, 1110.5573], [518.2214, 2147]);
  assert.ok(Math.abs(perpendicular - frame) < 1e-3,
    `the frame is ${perpendicular.toFixed(4)} mm across the diagonal, not ${frame}`);
  // T54-F1 AMENDED (28.08.2026): the pentagon case, kept at full rigor on a
  // rake whose lowered line still crosses the top edge with room for the
  // rail: ceiling 2400 → 1800 (cos β = 1/√2, reserve 40·√2 = 56.5685), leaf
  // corners 2338.9315 / 1741.9315 less nothing above 2147 — outline crosses
  // 2147 at sheet x = 2147 − 1741.9315 = 405.0685.
  const [g] = frontsOf(cutWardrobe({ slope_cut: { y0: 2400, y1: 1800, infill: 40 } }));
  assert.deepEqual(g.cnc.outline, [[0, 0], [597, 0], [597, 2147], [405.0685, 2147], [0, 1741.9315]]);
  const five = g.cnc.pockets.find((k) => k.layer === P.front.types.S.pocketLayer);
  assert.equal(five.points.length, 5, 'the recess is a pentagon too');
  const perp5 = mitre(five, [0, 1741.9315], [405.0685, 2147]);
  assert.ok(Math.abs(perp5 - five.x1) < 1e-3,
    `the frame is ${perp5.toFixed(4)} mm across the diagonal, not ${five.x1}`);
});

test('…and shakerFits decides at the LOW end, as ever — too small stays plain', () => {
  const wide = shakerCutPocket({
    w: 600, h: 2000, frame: 60, cut: { hL: 100, hR: 2000 },
  }, P);
  assert.equal(wide, null, 'a 100 mm low end has no room for two 60 mm rails');
  const ok = shakerCutPocket({
    w: 600, h: 2000, frame: 60, cut: { hL: 900, hR: 2000 },
  }, P);
  assert.ok(ok, 'a 900 mm low end does');
  // No cut at all → the very call every front in the app has always taken.
  assert.deepEqual(
    shakerCutPocket({ w: 600, h: 2000, frame: 60, cut: null }, P),
    shakerPocket({ w: 600, h: 2000, frame: 60 }, P),
  );
});

test('a leaf refused its frame is cut PLAIN and says so', () => {
  // T54-F1 AMENDED (28.08.2026): the old scene ended at y1 = 120 — on the
  // LOWERED line (reserve 40/cos β ≈ 157) that ceiling now drives the leaf's
  // low corner to 0, the diagonal leaves through the BOTTOM edge, and with no
  // low stile left there is nothing to refuse. y1 = 280 keeps the intent
  // exactly: the low end lands at 135.42 mm — too small for two 60 mm rails —
  // and the refusal prints as it always did.
  const r = cutWardrobe({ slope_cut: { y0: 2400, y1: 280, infill: 40 } });
  const said = r.warnings.filter((wn) => wn.code === 'SHAKER_FRAME_TOO_WIDE');
  assert.ok(said.length, 'the app prints the sentence it has always printed');
  assert.match(said[0].message, /It is cut plain\./);
});

// ═══ DRAWERS ARE FORBIDDEN IN THE ZONE ══════════════════════════════════════

test('the engine REFUSES a drawer stack whose top would cross the line', () => {
  const r = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '01', slope_cut: { y0: 900, y1: 400, infill: 40 },
  }, P);
  const refused = r.warnings.filter((wn) => wn.code === 'SLOPE_DRAWER_CROSSES');
  assert.ok(refused.length >= 1, 'it is named, front by front');
  assert.match(refused[0].message, /a drawer front cannot be cut on the slope/);
  // …and the board is NOT deleted off the cut list: report, never fix.
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT');
  assert.ok(fronts.length >= 2, 'the stack is still there to be cut and priced');
  assert.ok(fronts.some((p) => p.meta?.slopeRefused), 'and the piece wears the refusal');
  // A drawer front is never a pentagon.
  for (const p of fronts) assert.equal(p.cnc.outline.length, 4);
});

test('#20 is in the list, in red, and reads the engine\'s own refusal', () => {
  const row = CHECKS.find((c) => c.n === 20);
  assert.equal(row.level, 'red');
  assert.match(row.label, /Drawer stack crosses the slope line/);
  const unit = { id: 'u1', type: 'BUDR', params: { unit_num: '01', width: 600 }, position: { wall: 0, x_mm: 0 } };
  const result = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '01', slope_cut: { y0: 900, y1: 400, infill: 40 },
  }, P);
  const found = runChecks({ entries: [{ unit, result }], units: [unit], profile: P })
    .filter((f) => f.check === 20);
  assert.ok(found.length >= 1);
  assert.equal(found[0].level, 'red');
  assert.match(found[0].message, /cannot be cut on the slope/);
  // …and it clears when the stack is under the line.
  const clear = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01' }, P);
  assert.deepEqual(
    runChecks({ entries: [{ unit, result: clear }], units: [unit], profile: P })
      .filter((f) => f.check === 20),
    [],
  );
});

// ═══ THE CONTROL IS LOCKED, WITH THE REASON ═════════════════════════════════

test('the hinge-side control is greyed for a cut door, with the one-line reason', () => {
  assert.match(props, /const forced = panel\?\.meta\?\.hingeForced \? panel\.meta\.hinge : null;/);
  assert.match(props, /disabled=\{Boolean\(forced\)\}/);
  assert.match(props, /data-hinge-forced=\{forced \? '1' : undefined\}/);
  assert.match(props, /data-hinge-forced-reason="1"/);
  assert.match(props, /the door opens from the slope, so the hinges are on the\s*\n?\s*full-height edge/);
  // GREY, not gone: a control that disappears leaves a joiner wondering
  // whether the app has lost it.
  assert.match(props, /value=\{forced \|\| unit\.params\.hinge\}/);
});
