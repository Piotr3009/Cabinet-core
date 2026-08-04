// ─── Golden-fixture tests for the cabinet engine ───
//
// fixtures/golden-bud.json and fixtures/golden-wardrobe.json are the SOURCE OF
// TRUTH (CLAUDE.md rule 1). They are read here, never written. If the engine
// disagrees with a fixture, the ENGINE is wrong — expected values are never
// "adjusted" to make a test pass.
//
// PRECISION RULE: fixtures quote rounded values and they are not all quoted at
// the same precision (BUD-A board area has 2 decimals, W-A has 3). Every
// numeric comparison therefore rounds the engine value to the number of
// decimals the fixture itself states, then requires an exact match. That is
// stricter than a blanket ±0.001 tolerance and never hides a real drift.
//
// One assertion is marked `todo`: see BLOCKERS.md #1 (W-B panel count is
// internally inconsistent with W-A and with the LISP formula it cites). It
// still RUNS and still reports — it is not skipped and not silenced.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet, doorCountFor, hingeCentres, snapDrawerDepth } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE, migrateCabinetProfile } from '../src/engine/profile.js';
import { roundTo, rtos } from '../src/engine/format.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'fixtures');
const readFixture = (name) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

const BUD = readFixture('golden-bud.json');
const WARDROBE = readFixture('golden-wardrobe.json');
const PROFILE = DEFAULT_CABINET_PROFILE;

// Assertions the fixtures themselves cannot satisfy — each one has a BLOCKERS.md
// entry. Listed by "<case id>::<path>" so nothing can be silenced by accident.
const KNOWN_FIXTURE_CONFLICTS = new Set([
  'W-B::totals.panels_true_incl_railpart',
]);

// ─── helpers ───

/** Number of decimals a fixture quotes a value to. */
function decimalsOf(value) {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

/** Compare at the precision the fixture states. */
function assertAtFixturePrecision(actual, expected, label) {
  const dec = decimalsOf(expected);
  const got = roundTo(actual, dec);
  assert.ok(
    Math.abs(got - expected) <= 1e-9,
    `${label}: expected ${expected} (${dec} dp), engine gives ${actual} → ${got}`,
  );
}

function assertArrayAtPrecision(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: length ${actual.length} != ${expected.length}`);
  expected.forEach((v, i) => assertAtFixturePrecision(actual[i], v, `${label}[${i}]`));
}

/** params object for computeCabinet from a fixture `inputs` block. */
function paramsFromInputs(inputs) {
  return {
    type: inputs.type,
    width: inputs.width,
    height: inputs.height,
    depth: inputs.depth,
    board_t: inputs.board_t,
    front_t: inputs.front_t,
    front_type: inputs.front_type,
    shelves: inputs.shelves,
    drawers: inputs.drawers,
    rail: inputs.rail,
    rail_offset: inputs.rail_offset,
    hinge: inputs.hinge,
    unit_num: inputs.unit_num,
  };
}

/** Multiset key for a cut piece. */
const dimKey = (w, h, role) => `${roundTo(w, 3)}x${roundTo(h, 3)}:${role}`;

function multisetOfEngine(panels) {
  const m = new Map();
  for (const p of panels) {
    const k = dimKey(p.w, p.h, p.material_role);
    m.set(k, (m.get(k) || 0) + p.qty);
  }
  return m;
}

function multisetOfFixture(entries) {
  const m = new Map();
  for (const e of entries) {
    const k = dimKey(e.w, e.h, e.material_role);
    m.set(k, (m.get(k) || 0) + (e.qty ?? 1));
  }
  return m;
}

/**
 * The delta list in golden-wardrobe.json names rows in prose ("TOP/BOTTOM",
 * "D{i}-BF/BB", "DP-L + DP-R"). Dimensions alone are ambiguous there
 * (PARTITION and RAIL-PART share the TOP/BOTTOM size), so a row is resolved to
 * the engine `part` names it stands for and matched inside that set only.
 */
function partsForFixtureId(idText) {
  const s = String(idText).toUpperCase();
  if (s.includes('RAIL-PART')) return ['RAIL-PART'];
  if (s.includes('PARTITION')) return ['PARTITION'];
  if (s.includes('FILLER')) return ['FILLER'];
  if (s.includes('-SL') || s.includes('-SR')) return ['DRAWER-SIDE'];
  if (s.includes('-BF') || s.includes('-BB')) return ['DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK'];
  if (s.includes('-DNO')) return ['DRAWER-BOTTOM'];
  if (s.includes('-DF')) return ['DRAWER-FRONT'];
  if (s.startsWith('DP')) return ['DP'];
  if (s.includes('SHELF')) return ['SHELF'];
  if (s.includes('BACK')) return ['BACK'];
  if (s.includes('TOP') || s.includes('BOTTOM')) return ['TOP', 'BOTTOM'];
  return ['FRONT'];
}

/** Runs `fn`; if the assertion is a known fixture conflict, report it as todo. */
function checkTotal(t, caseId, key, actual, expected) {
  const conflict = KNOWN_FIXTURE_CONFLICTS.has(`${caseId}::totals.${key}`);
  const body = () => assertAtFixturePrecision(actual, expected, `${caseId} totals.${key}`);
  return t.test(`totals.${key}`, { todo: conflict ? 'see BLOCKERS.md #1' : false }, body);
}

// ─── Shared per-case verification ───

async function verifyCase(t, fixtureCase, opts = {}) {
  const result = computeCabinet(paramsFromInputs(fixtureCase.inputs), PROFILE);
  const id = fixtureCase.id;

  // ── derived ──
  await t.test('derived values', () => {
    for (const [key, expected] of Object.entries(fixtureCase.derived || {})) {
      assert.ok(key in result.derived, `${id} derived.${key} missing from engine output`);
      if (typeof expected === 'number') {
        assertAtFixturePrecision(result.derived[key], expected, `${id} derived.${key}`);
      } else {
        assert.equal(result.derived[key], expected, `${id} derived.${key}`);
      }
    }
  });

  // ── panels ──
  if (Array.isArray(fixtureCase.panels)) {
    await t.test('panels — every named panel', () => {
      const byId = new Map(result.panels.map((p) => [p.id, p]));
      for (const exp of fixtureCase.panels) {
        if (!byId.has(exp.id)) continue;           // grouped rows checked below
        const got = byId.get(exp.id);
        assertAtFixturePrecision(got.w, exp.w, `${id} ${exp.id}.w`);
        assertAtFixturePrecision(got.h, exp.h, `${id} ${exp.id}.h`);
        assert.equal(got.qty, exp.qty ?? 1, `${id} ${exp.id}.qty`);
        assert.equal(got.material_role, exp.material_role, `${id} ${exp.id}.material_role`);
        assert.equal(got.edging.code, exp.edging.code, `${id} ${exp.id}.edging.code`);
        assertAtFixturePrecision(got.edging.len_m, exp.edging.len_m, `${id} ${exp.id}.edging.len_m`);
        assertAtFixturePrecision(got.area_m2, exp.area_m2, `${id} ${exp.id}.area_m2`);
      }
    });

    await t.test('panels — complete cut list (multiset of dimensions × role)', () => {
      const expected = multisetOfFixture(fixtureCase.panels);
      const actual = multisetOfEngine(result.panels);
      for (const [key, qty] of expected) {
        assert.equal(actual.get(key) ?? 0, qty, `${id} panel ${key}: engine qty ${actual.get(key) ?? 0}, fixture ${qty}`);
      }
      for (const [key, qty] of actual) {
        assert.ok(expected.has(key), `${id} engine emits ${qty}× ${key} which the fixture does not list`);
      }
      const totalExpected = fixtureCase.panels.reduce((s, p) => s + (p.qty ?? 1), 0);
      const totalActual = result.panels.reduce((s, p) => s + p.qty, 0);
      assert.equal(totalActual, totalExpected, `${id} total piece count`);
    });

    await t.test('panels — grouped rows resolve to individually named pieces', () => {
      for (const exp of fixtureCase.panels) {
        if (!exp.id.includes('{i}') && !exp.id.includes('/')) continue;
        const matches = result.panels.filter((p) => roundTo(p.w, 3) === roundTo(exp.w, 3) && roundTo(p.h, 3) === roundTo(exp.h, 3));
        assert.equal(matches.length, exp.qty, `${id} grouped row ${exp.id}`);
        for (const m of matches) assert.match(m.id, /^[A-Za-z0-9]+[-A-Za-z0-9]*$/, `${id} piece id ${m.id}`);
      }
    });
  }

  if (Array.isArray(fixtureCase.panels_delta_vs_WA)) {
    await t.test('panels — delta rows vs the base case', () => {
      for (const exp of fixtureCase.panels_delta_vs_WA) {
        const parts = partsForFixtureId(exp.id);
        const matches = result.panels.filter((p) => parts.includes(p.part)
          && roundTo(p.w, 3) === roundTo(exp.w, 3) && roundTo(p.h, 3) === roundTo(exp.h, 3));
        assert.equal(matches.length, exp.qty ?? 1, `${id} delta row ${exp.id} (${exp.w}×${exp.h}) → parts ${parts.join('/')}`);
        const areaExp = exp.area_m2 ?? exp.area_m2_each;
        if (areaExp != null) assertAtFixturePrecision(matches[0].area_m2, areaExp, `${id} delta ${exp.id}.area`);
      }
    });
  }

  // ── drills ──
  const d = fixtureCase.drills || {};
  await t.test('drills — hinges', () => {
    if (d.hinge_centers) assertArrayAtPrecision(result.drillSummary.hinge_centers, d.hinge_centers, `${id} hinge_centers`);
    if (d.side_hinge_holes_y) {
      assert.equal(result.drillSummary.side_hinge_holes_y.length, d.side_hinge_holes_y.length, `${id} hinge pair count`);
      d.side_hinge_holes_y.forEach((pair, i) => assertArrayAtPrecision(result.drillSummary.side_hinge_holes_y[i], pair, `${id} hinge pair ${i}`));
    }
    if (d.side_hinge_holes_x != null) assert.equal(result.drillSummary.side_hinge_holes_x, d.side_hinge_holes_x, `${id} hinge hole x`);
    if (d.hinged_sides) assert.deepEqual(result.drillSummary.hinged_sides, d.hinged_sides, `${id} hinged sides`);

    // cross-check the real drill records, not just the summary
    if (d.side_hinge_holes_y && d.hinged_sides) {
      const expectedYs = d.side_hinge_holes_y.flat();
      for (const side of d.hinged_sides) {
        const holes = result.drills.filter((x) => x.panel === side && x.kind === 'hinge');
        assert.equal(holes.length, expectedYs.length, `${id} ${side} hinge hole count`);
        for (const y of expectedYs) {
          assert.ok(holes.some((h) => Math.abs(h.y - y) <= 0.05), `${id} ${side} missing hinge hole at y=${y}`);
        }
        for (const h of holes) assert.equal(h.d, PROFILE.hinges.holeDiameter, `${id} hinge hole diameter`);
      }
      const notHinged = ['BUL', 'BUR'].filter((s) => !d.hinged_sides.includes(s));
      for (const side of notHinged) {
        assert.equal(result.drills.filter((x) => x.panel === side && x.kind === 'hinge').length, 0,
          `${id} ${side} must carry no hinge holes`);
      }
    }
  });

  await t.test('drills — front hinge cups', () => {
    if (d.front_cup_y) assertArrayAtPrecision(result.drillSummary.front_cup_y, d.front_cup_y, `${id} front_cup_y`);
    if (d.front_cup_x_from_hinge_edge != null) {
      assert.equal(result.drillSummary.front_cup_x_from_hinge_edge, d.front_cup_x_from_hinge_edge, `${id} cup x`);
    }
    if (d.front_cup_y) {
      const fronts = result.panels.filter((p) => p.part === 'FRONT');
      for (const f of fronts) {
        const cups = result.drills.filter((x) => x.panel === f.id && x.kind === 'cup');
        assert.equal(cups.length, d.front_cup_y.length, `${id} ${f.id} cup count`);
        const expX = f.meta.hinge === 'L' ? f.w - PROFILE.hinges.cups.xFromHingeEdge : PROFILE.hinges.cups.xFromHingeEdge;
        for (const c of cups) assert.ok(Math.abs(c.x - expX) <= 1e-9, `${id} ${f.id} cup x ${c.x} != ${expX}`);
        assert.equal(result.drills.filter((x) => x.panel === f.id && x.kind === 'cup_screw').length,
          d.front_cup_y.length * 2, `${id} ${f.id} cup screw count`);
      }
    }
  });

  await t.test('drills — shelf pin holes', () => {
    if (d.shelf_row_y) assertArrayAtPrecision(result.drillSummary.shelf_row_y, d.shelf_row_y, `${id} shelf_row_y`);
    if (d.shelf_cluster_y) {
      d.shelf_cluster_y.forEach((row, i) => assertArrayAtPrecision(result.drillSummary.shelf_cluster_y[i], row, `${id} shelf cluster ${i}`));
    }
    if (d.shelf_hole_x) assertArrayAtPrecision(result.drillSummary.shelf_hole_x, d.shelf_hole_x, `${id} shelf_hole_x`);
    if (d.shelf_row_y && d.shelf_hole_x) {
      for (const side of ['BUL', 'BUR']) {
        const holes = result.drills.filter((x) => x.panel === side && x.kind === 'shelf');
        assert.equal(holes.length, d.shelf_row_y.length * PROFILE.shelfHoles.clusterOffsets.length * d.shelf_hole_x.length,
          `${id} ${side} shelf hole count`);
        for (const h of holes) assert.equal(h.d, PROFILE.shelfHoles.diameter, `${id} shelf hole diameter`);
      }
    }
  });

  await t.test('drills — drawer runners', () => {
    if (d.runner_rows_dp_y) assertArrayAtPrecision(result.drillSummary.runner_rows_dp_y, d.runner_rows_dp_y, `${id} runner_rows_dp_y`);
    if (d.runner_rows_carcass_y) assertArrayAtPrecision(result.drillSummary.runner_rows_carcass_y, d.runner_rows_carcass_y, `${id} runner_rows_carcass_y`);
    if (d.runner_hole_x) assertArrayAtPrecision(result.drillSummary.runner_hole_x, d.runner_hole_x, `${id} runner_hole_x`);
    if (d.runner_carcass_side != null) {
      // the fixture writes prose for the "no carcass side" case ("none (…) [VERIFY]")
      const expected = String(d.runner_carcass_side).split(/[\s(]/)[0];
      const actual = result.drillSummary.runner_carcass_side ?? 'none';
      assert.equal(actual, expected, `${id} runner carcass side`);
      if (expected === 'none') {
        assert.equal(result.drills.filter((x) => x.kind === 'runner' && (x.panel === 'BUL' || x.panel === 'BUR')).length, 0,
          `${id} carcass sides must carry no runner holes`);
      } else {
        assert.ok(result.drills.some((x) => x.kind === 'runner' && x.panel === expected),
          `${id} ${expected} must carry runner holes`);
      }
    }
  });

  // ── totals ──
  for (const [key, expected] of Object.entries(fixtureCase.totals || {})) {
    if (typeof expected !== 'number') continue;
    await checkTotal(t, id, key, result.totals[key], expected);
  }

  // ── csv ──
  if (Array.isArray(fixtureCase.csv_labels)) {
    await t.test('csv_labels — byte-exact', () => {
      assert.deepEqual(result.csvLines, fixtureCase.csv_labels, `${id} CSV lines`);
    });
  }

  if (opts.after) opts.after(result);
  return result;
}

// ─── BUD (kitchen base unit) ───

test('golden-bud.json', async (t) => {
  assert.ok(BUD.cases.length > 0, 'fixture has cases');
  for (const c of BUD.cases) {
    await t.test(`${c.id} — ${c.description}`, async (tt) => { await verifyCase(tt, c); });
  }
});

// ─── WARDROBE ───

test('golden-wardrobe.json', async (t) => {
  assert.ok(WARDROBE.cases.length > 0, 'fixture has cases');
  for (const c of WARDROBE.cases) {
    await t.test(`${c.id} — ${c.description}`, async (tt) => { await verifyCase(tt, c); });
  }
});

// ─── Fixture-level invariants (documented rules must actually hold) ───

test('fixture rules hold in the engine', async (t) => {
  await t.test('door count follows the LISP comparison (W−4 ≤ 700 → 1 door)', () => {
    // KIT_BUD_FULL / KIT_WARDROBE_FULL: (if (<= (- szer 4.0) 700.0) 1 2).
    // So W=704 still gives ONE door and the real switch is at 705 — the
    // "threshold 704" wording in SPEC/CLAUDE.md is off by one (BLOCKERS.md #2).
    assert.equal(doorCountFor(700, PROFILE), 1);
    assert.equal(doorCountFor(703, PROFILE), 1);
    assert.equal(doorCountFor(704, PROFILE), 1);
    assert.equal(doorCountFor(705, PROFILE), 2);
    assert.equal(doorCountFor(900, PROFILE), 2);
  });

  await t.test('wardrobe hinge count: <1600 → 5, ≥1600 → 6', () => {
    assert.equal(hingeCentres(1500, PROFILE.hinges.rules.tall, PROFILE).length, 5);
    assert.equal(hingeCentres(1600, PROFILE.hinges.rules.tall, PROFILE).length, 6);
    assert.deepEqual(hingeCentres(2150, PROFILE.hinges.rules.tall, PROFILE), [100, 490, 880, 1270, 1660, 2050]);
  });

  await t.test('low-cabinet hinge rule: 2 / 3 / 4', () => {
    const low = PROFILE.hinges.rules.low;
    assert.equal(hingeCentres(700, low, PROFILE).length, 2);
    assert.equal(hingeCentres(900, low, PROFILE).length, 3);
    assert.equal(hingeCentres(1300, low, PROFILE).length, 4);
  });

  await t.test('drawer depth snaps down to the runner standard', () => {
    const steps = PROFILE.wardrobe.drawers.depthSteps;
    assert.equal(snapDrawerDepth(465, steps), 440);
    assert.equal(snapDrawerDepth(440, steps), 440);
    assert.equal(snapDrawerDepth(439, steps), 390);
    assert.equal(snapDrawerDepth(389, steps), null);
  });

  await t.test('too-shallow cabinet drops the drawers with a warning', () => {
    const r = computeCabinet({
      type: 'WARDROBE', width: 600, height: 2150, depth: 460,
      board_t: 18, front_t: 25, drawers: 2, rail: false, shelves: 0, unit_num: 'W09',
    }, PROFILE);
    assert.equal(r.params.drawers, 0);
    assert.ok(r.warnings.some((w) => w.code === 'DRAWERS_TOO_SHALLOW'), 'warning raised');
    assert.equal(r.panels.filter((p) => p.role === 'drawer_box').length, 0);
  });

  await t.test('drawer zone that overruns its headroom drops the drawers', () => {
    // With the stock numbers 6 drawers always fit above the 1800 mm minimum
    // height, so the rule is exercised through the profile that owns it.
    const tallHeadroom = migrateCabinetProfile({
      ...DEFAULT_CABINET_PROFILE,
      wardrobe: {
        ...DEFAULT_CABINET_PROFILE.wardrobe,
        drawers: { ...DEFAULT_CABINET_PROFILE.wardrobe.drawers, zoneHeadroom: 1600 },
      },
    });
    const r = computeCabinet({
      type: 'WARDROBE', width: 600, height: 1800, depth: 578,
      board_t: 18, front_t: 25, drawers: 6, rail: false, shelves: 0, unit_num: 'W10',
    }, tallHeadroom);
    assert.ok(r.warnings.some((w) => w.code === 'DRAWERS_TOO_TALL'), 'warning raised');
    assert.equal(r.panels.filter((p) => p.part === 'PARTITION').length, 0);
    assert.equal(r.params.drawers, 0);
  });

  await t.test('every carcass panel carries puzzle geometry, fronts do not', () => {
    const r = computeCabinet(paramsFromInputs(WARDROBE.cases[0].inputs), PROFILE);
    for (const idp of ['BUL', 'BUR', 'TOP', 'BOTTOM']) {
      const p = r.panels.find((x) => x.id === idp);
      assert.ok(p.cnc.outline.length > 4, `${idp} outline must carry tabs`);
      assert.ok(p.cnc.pockets.length > 0, `${idp} must have dog-bone pockets`);
    }
    // BACK stays a plain rectangle — it only RECEIVES tabs, via sockets
    const back = r.panels.find((x) => x.id === 'BACK');
    assert.equal(back.cnc.outline.length, 4, 'BACK outline is a rectangle');
    assert.equal(back.cnc.pockets.filter((p) => p.layer === 'PUZZLE_SOCKET').length, 10, 'BACK sockets: 3+3 sides, 2+2 ends');
    const front = r.panels.find((x) => x.part === 'FRONT');
    assert.equal(front.cnc.outline.length, 4, 'front is a plain rectangle');
  });

  await t.test('puzzle tab centres follow the profile (95 / mid / H−95)', () => {
    const r = computeCabinet(paramsFromInputs(BUD.cases[0].inputs), PROFILE);
    const bul = r.panels.find((x) => x.id === 'BUL');
    const ys = bul.cnc.pockets.filter((p) => p.layer === 'PUZZLE_DOG_BONES').map((p) => (p.y1 + p.y2) / 2);
    assert.deepEqual(ys, [95, 385, 675]);
  });

  await t.test('no doors requested → no front panels, no hinge holes', () => {
    const r = computeCabinet({ ...paramsFromInputs(BUD.cases[0].inputs), doors: false }, PROFILE);
    assert.equal(r.panels.filter((p) => p.material_role === 'front').length, 0);
    assert.equal(r.drills.filter((x) => x.kind === 'hinge').length, 0);
    assert.equal(r.totals.fronts, 0);
  });
});

// ─── Formatting + profile plumbing ───

test('CSV formatting matches AutoLISP rtos', () => {
  assert.equal(rtos(0.77, 2), '0.77');
  assert.equal(rtos(0.564, 2), '0.56');
  assert.equal(rtos(2.728, 2), '2.73');
  assert.equal(rtos(0.4158, 3), '0.416');
  assert.equal(rtos(447, 0), '447');
  assert.equal(rtos(446.5, 0), '447');       // half away from zero
  assert.equal(rtos(0, 2), '0.00');
});

test('profile migration fills missing keys and keeps user values', () => {
  const stored = { schema: 1, doors: { gap: 4 }, carcass: { shelfDepthClearance: 25 }, puzzle: {}, wardrobe: {} };
  const m = migrateCabinetProfile(stored);
  assert.equal(m.doors.gap, 4, 'user value kept');
  assert.equal(m.doors.singleDoorMaxWidth, DEFAULT_CABINET_PROFILE.doors.singleDoorMaxWidth, 'missing key filled');
  assert.equal(m.carcass.shelfDepthClearance, 25);
  assert.equal(m.wardrobe.drawers.frontHeight, DEFAULT_CABINET_PROFILE.wardrobe.drawers.frontHeight);
  assert.equal(migrateCabinetProfile(null), null);
});

test('a different profile changes the NUMBERS, not the formulas', () => {
  const custom = migrateCabinetProfile({ ...DEFAULT_CABINET_PROFILE, doors: { ...DEFAULT_CABINET_PROFILE.doors, gap: 4 } });
  const base = computeCabinet(paramsFromInputs(BUD.cases[0].inputs), DEFAULT_CABINET_PROFILE);
  const alt = computeCabinet(paramsFromInputs(BUD.cases[0].inputs), custom);
  const f = (r) => r.panels.find((p) => p.part === 'FRONT');
  assert.equal(f(base).w, 597);
  assert.equal(f(alt).w, 596);
  assert.equal(f(alt).h, 766);
  assert.equal(base.panels.length, alt.panels.length, 'panel structure unchanged');
});
