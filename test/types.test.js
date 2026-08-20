// ─── Golden-fixture tests for the turn-3 unit types ───
//
// fixtures/golden-{budr,wud,budtall,low-cabinet,sink,fridge}.json are derived
// from the AutoLISP kits line by line and are the SOURCE OF TRUTH (CLAUDE.md
// rule 1). They are read here, never written. If the engine disagrees, the
// ENGINE is wrong — expected values are never "adjusted" to make a test pass.
//
// Precision rule as in engine.test.js: a fixture value is compared at exactly
// the number of decimals the fixture itself quotes, and the match must be
// exact — stricter than a blanket tolerance.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet, budrFrontHeights, hingeCentres } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE } from '../src/engine/profile.js';
import {
  UNIT_TYPES, UNIT_TYPE_ORDER, defaultParamsFor, getUnitType,
} from '../src/engine/types.js';
import { legCount, legLayout } from '../src/engine/legs.js';
import { roundTo } from '../src/engine/format.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', 'fixtures');
const readFixture = (name) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
const P = DEFAULT_CABINET_PROFILE;

const FILES = [
  ['golden-budr.json', 'BUDR'],
  // Turn 12 (CLAUDE.md F3.2): the same kit, split two ways and four ways. NEW
  // fixtures for NEW variants — rule 3 allows additions and forbids edits, and
  // golden-budr.json is byte-identical to what it was.
  ['golden-budr2.json', 'BUDR2'],
  ['golden-budr4.json', 'BUDR4'],
  ['golden-wud.json', 'WUD'],
  ['golden-budtall.json', 'BUDTALL'],
  ['golden-low-cabinet.json', 'LOW_CABINET'],
  ['golden-sink.json', 'SINK'],
  ['golden-fridge.json', 'FRIDGE'],
];

// ─── helpers ───

function decimalsOf(value) {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

function assertAt(actual, expected, label) {
  const dec = decimalsOf(expected);
  const got = roundTo(actual, dec);
  assert.ok(Math.abs(got - expected) <= 1e-9,
    `${label}: expected ${expected} (${dec} dp), engine gives ${actual} → ${got}`);
}

function assertArrayAt(actual, expected, label) {
  assert.ok(Array.isArray(actual), `${label}: engine value is not an array`);
  assert.equal(actual.length, expected.length, `${label}: length ${actual.length} != ${expected.length}`);
  expected.forEach((v, i) => {
    if (typeof v === 'number') assertAt(actual[i], v, `${label}[${i}]`);
    else assert.equal(actual[i], v, `${label}[${i}]`);
  });
}

function paramsFrom(inputs) {
  return { ...inputs };
}

// Drill summary keys whose shape is a list of pairs / a plain list of numbers.
const PAIR_KEYS = new Set(['side_hinge_holes_y', 'hanger_holes_bul', 'hanger_holes_bur']);

// ─── TURN 42 (CLAUDE.md F1 + iron rule 4): THE FIXTURES ARE NOT TOUCHED ────
//
// `golden-low-cabinet.json` case LC-B carries a rail, and a rail used to bring
// a `RAIL-PART` board with it. The kit stopped cutting that board tonight
// (`KIT_WARDROBE_FULL.lsp`, iron rule 4) and so did the engine. CLAUDE.md keeps
// `fixtures/` untouched, so — exactly as `test/engine.test.js` does, for the
// same reason and with the same arithmetic — the FIXTURE's expectations lose
// the one named board here rather than in the file:
//
//   · the `RAIL-PART` row leaves the cut list and the panel ORDER
//   · `panels_lisp` loses 1 (KIT_LOW_CABINET counted it — L464-465 — which is
//     the kit-by-kit disagreement `countsRailPartInPanels` was written for)
//   · `board_area_m2` / `area_m2` lose the row's own quoted area
//   · `derived.rail_partition_y` and the `rail_partition_screw_*` drill rows go
//     with the board they located
//
// `rail_y`, the bracket screw and the rod are untouched on both sides.
const isRailPartRow = (row) => String(row?.id || '').toUpperCase().includes('RAIL-PART');

function withoutRailPart(fixtureCase) {
  const rows = fixtureCase.panels || [];
  const gone = rows.filter(isRailPartRow);
  if (!gone.length) return fixtureCase;
  const pieces = gone.reduce((n, r) => n + (r.qty ?? 1), 0);
  const area = gone.reduce((a, r) => a + (r.area_m2 ?? 0) * (r.qty ?? 1), 0);
  const counted = Boolean(getUnitType(fixtureCase.inputs.type)?.countsRailPartInPanels);

  const totals = { ...(fixtureCase.totals || {}) };
  const less = (key, by) => {
    if (typeof totals[key] === 'number') totals[key] = roundTo(totals[key] - by, decimalsOf(totals[key]));
  };
  less('panels_true_incl_railpart', pieces);
  if (counted) less('panels_lisp', pieces);
  less('pieces_total', pieces);
  less('board_area_m2', area);
  less('area_m2', area);

  const derived = { ...(fixtureCase.derived || {}) };
  delete derived.rail_partition_y;
  const drills = { ...(fixtureCase.drills || {}) };
  for (const k of ['rail_partition_screw_y', 'rail_partition_screw_x_sides', 'rail_partition_screw_x_back']) {
    delete drills[k];
  }
  return {
    ...fixtureCase, panels: rows.filter((r) => !isRailPartRow(r)), derived, drills, totals,
  };
}

async function verifyCase(t, rawCase) {
  const fixtureCase = withoutRailPart(rawCase);   // T42-F1, see the note above
  const result = computeCabinet(paramsFrom(fixtureCase.inputs), P);
  const id = fixtureCase.id;

  await t.test('derived values', () => {
    for (const [key, expected] of Object.entries(fixtureCase.derived || {})) {
      assert.ok(key in result.derived, `${id} derived.${key} missing from engine output`);
      if (Array.isArray(expected)) assertArrayAt(result.derived[key], expected, `${id} derived.${key}`);
      else if (typeof expected === 'number') assertAt(result.derived[key], expected, `${id} derived.${key}`);
      else assert.equal(result.derived[key], expected, `${id} derived.${key}`);
    }
  });

  await t.test('panels — every piece, exactly once', () => {
    const byId = new Map(result.panels.map((p) => [p.id, p]));
    for (const exp of fixtureCase.panels) {
      assert.ok(byId.has(exp.id), `${id} panel ${exp.id} missing — engine emits ${[...byId.keys()].join(', ')}`);
      const got = byId.get(exp.id);
      assertAt(got.w, exp.w, `${id} ${exp.id}.w`);
      assertAt(got.h, exp.h, `${id} ${exp.id}.h`);
      assert.equal(got.qty, exp.qty ?? 1, `${id} ${exp.id}.qty`);
      assert.equal(got.material_role, exp.material_role, `${id} ${exp.id}.material_role`);
      assert.equal(got.edging.code, exp.edging.code, `${id} ${exp.id}.edging.code`);
      assertAt(got.edging.len_m, exp.edging.len_m, `${id} ${exp.id}.edging.len_m`);
      assertAt(got.area_m2, exp.area_m2, `${id} ${exp.id}.area_m2`);
    }
    // Nothing extra, and nothing duplicated: the cut list is the whole truth.
    assert.equal(result.panels.length, fixtureCase.panels.length,
      `${id} piece count — engine ${result.panels.map((p) => p.id).join(', ')}`);
    assert.equal(new Set(result.panels.map((p) => p.id)).size, result.panels.length, `${id} duplicate panel id`);
  });

  await t.test('panels — emitted in the kit\'s own order', () => {
    assert.deepEqual(result.panels.map((p) => p.id), fixtureCase.panels.map((p) => p.id), `${id} panel order`);
  });

  const d = fixtureCase.drills || {};
  await t.test('drill summary', () => {
    for (const [key, expected] of Object.entries(d)) {
      const actual = result.drillSummary[key];
      if (PAIR_KEYS.has(key)) {
        assert.equal(actual.length, expected.length, `${id} ${key} length`);
        expected.forEach((pair, i) => assertArrayAt(actual[i], pair, `${id} ${key}[${i}]`));
      } else if (Array.isArray(expected)) {
        assertArrayAt(actual, expected, `${id} ${key}`);
      } else if (typeof expected === 'number') {
        assertAt(actual, expected, `${id} ${key}`);
      } else {
        assert.equal(actual ?? 'none', expected, `${id} ${key}`);
      }
    }
  });

  await t.test('drills — the summary is backed by real records', () => {
    if (d.hinged_sides?.length && d.side_hinge_holes_y) {
      const ys = d.side_hinge_holes_y.flat();
      for (const side of d.hinged_sides) {
        const holes = result.drills.filter((x) => x.panel === side && x.kind === 'hinge');
        assert.equal(holes.length, ys.length, `${id} ${side} hinge hole count`);
        for (const y of ys) {
          assert.ok(holes.some((h) => Math.abs(h.y - y) <= 0.05), `${id} ${side} missing hinge hole at ${y}`);
        }
      }
      for (const side of ['BUL', 'BUR'].filter((s) => !d.hinged_sides.includes(s))) {
        assert.equal(result.drills.filter((x) => x.panel === side && x.kind === 'hinge').length, 0,
          `${id} ${side} must carry no hinge holes`);
      }
    }
    if (d.shelf_row_y?.length && d.shelf_hole_x) {
      for (const side of ['BUL', 'BUR']) {
        // Sink mirror fix (12.08.2026): the mirrored board states its own pair
        // where the columns are asymmetric; elsewhere one array serves both.
        const cols = side === 'BUR' ? (d.shelf_hole_x_bur || d.shelf_hole_x) : d.shelf_hole_x;
        const holes = result.drills.filter((x) => x.panel === side && x.kind === 'shelf');
        assert.equal(holes.length, d.shelf_row_y.length * P.shelfHoles.clusterOffsets.length * cols.length,
          `${id} ${side} shelf hole count`);
        for (const h of holes) {
          assert.ok(cols.some((x) => Math.abs(h.x - x) <= 0.05), `${id} ${side} shelf hole x ${h.x} unexpected`);
        }
      }
    }
    if (d.hanger_holes_bul) {
      for (const [side, expected] of [['BUL', d.hanger_holes_bul], ['BUR', d.hanger_holes_bur]]) {
        const holes = result.drills.filter((x) => x.panel === side && x.kind === 'hanger');
        assert.equal(holes.length, expected.length, `${id} ${side} hanger hole count`);
        for (const [x, y] of expected) {
          assert.ok(holes.some((h) => Math.abs(h.x - x) <= 0.05 && Math.abs(h.y - y) <= 0.05),
            `${id} ${side} missing hanger hole at ${x},${y}`);
        }
        for (const h of holes) assert.equal(h.d, d.hanger_hole_d, `${id} hanger hole diameter`);
      }
    }
    if (d.runner_rows_carcass_y?.length && d.runner_carcass_side === 'both') {
      for (const side of ['BUL', 'BUR']) {
        const rows = new Set(result.drills.filter((x) => x.panel === side && x.kind === 'runner').map((x) => x.y));
        assert.deepEqual([...rows].sort((a, b) => a - b), [...d.runner_rows_carcass_y].sort((a, b) => a - b),
          `${id} ${side} runner rows`);
      }
    }
  });

  await t.test('totals', () => {
    for (const [key, expected] of Object.entries(fixtureCase.totals || {})) {
      if (typeof expected !== 'number') continue;
      assert.ok(key in result.totals, `${id} totals.${key} missing`);
      assertAt(result.totals[key], expected, `${id} totals.${key}`);
    }
    // The invariant that holds across every kit, whichever fronts it folds in.
    assert.equal(result.totals.panels_true_incl_railpart + result.totals.fronts,
      result.totals.pieces_total, `${id} panels + fronts must account for every piece`);
  });

  if (Array.isArray(fixtureCase.csv_labels)) {
    await t.test('csv_labels — byte-exact', () => {
      assert.deepEqual(result.csvLines, fixtureCase.csv_labels, `${id} CSV lines`);
    });
  }

  return result;
}

for (const [file, typeId] of FILES) {
  const fixture = readFixture(file);
  test(`${file} — ${typeId}`, async (t) => {
    assert.ok(fixture.cases.length > 0, 'fixture has cases');
    assert.equal(fixture.meta.status, 'PENDING_PIOTR_VERIFICATION', 'fixture still flags its own status');
    for (const c of fixture.cases) {
      await t.test(`${c.id} — ${c.description}`, async (tt) => { await verifyCase(tt, c); });
    }
  });
}

// ─── Rules the fixtures state in prose, checked as behaviour ───

test('every library type is configured, available and buildable', () => {
  // Turn 12 (CLAUDE.md F3.2): two more drawer-unit variants, 2x and 4x.
  // Turn 17 (CLAUDE.md F9/F10): the D/W panel and the oven base unit.
  // Turn 30 (CLAUDE.md F13): Cargo 300, the tall pull-out larder.
  // Turn 30 (CLAUDE.md F14): the pantry, with internal Blum drawers.
  // Turn 30 (CLAUDE.md F15): the american fridge housing.
  // Turn 30 (CLAUDE.md F16): the bin unit.
  // Turn 30 (CLAUDE.md F17): the wine rack.
  // Turn 30 (CLAUDE.md F18): the twin cupboard.
  // Turn 30 (CLAUDE.md F19): the corner unit — geometry only.
  // Turn 30 (CLAUDE.md F21): the glass wall unit.
  // Turn 31 (CLAUDE.md F9): the hood wall unit.
  // Turn 36 (CLAUDE.md F7): the TOP BOX — a second wardrobe kit, because
  // *"wysokie szafy nie wejdą do domu"*.
  assert.equal(UNIT_TYPE_ORDER.length, 22, 'two wardrobe kits + 20 kitchen kits');
  for (const id of UNIT_TYPE_ORDER) {
    const type = UNIT_TYPES[id];
    assert.ok(type, `${id} missing from UNIT_TYPES`);
    assert.ok(type.available, `${id} must be available in the Library`);
    // ─── Turn 17 (CLAUDE.md F9/F10) ───
    // A kit no longer HAS to come from a LISP file. The D/W panel and the oven
    // base were dictated by the owner and there is no AutoLISP for either —
    // which is the standing fixtures/golden-partition-biscuits.json has carried
    // since turn 13: a fixture of a RULE rather than of a file. So the field
    // must be PRESENT and honest, and `null` is honest.
    assert.ok('lisp' in type, `${id} must say which kit it comes from, or that it has none`);
    const params = defaultParamsFor(id, P);
    const r = computeCabinet(params, P);
    assert.ok(r.panels.length > 0, `${id} default unit produces no panels`);
    assert.equal(r.csvLines.length, r.panels.length, `${id} one CSV row per piece`);
    for (const p of r.panels) {
      assert.ok(p.w > 0 && p.h > 0, `${id} panel ${p.id} has a non-positive dimension`);
    }
  }
});

test('BUDR front stack: 4:3:2 over H − 9, and it fills the face', () => {
  const heights = budrFrontHeights(770, P);
  assert.deepEqual(heights, [338, 254, 169]);
  const stack = heights.reduce((s, h) => s + h, 0) + (heights.length - 1) * P.baseDrawerUnit.gap;
  assert.equal(stack, 770 - P.baseDrawerUnit.gap, 'the stack ends one gap below the carcass top');

  const r = computeCabinet({ type: 'BUDR', width: 600, height: 770, depth: 558, unit_num: 'DR1' }, P);
  assert.equal(r.derived.doors, 0, 'a drawer unit has no doors');
  assert.equal(r.drills.filter((x) => x.kind === 'hinge' || x.kind === 'cup').length, 0, 'and therefore no hinges');
  // Runner row 1 clears the base panel; the others sit on their own front.
  assert.deepEqual(r.drillSummary.runner_rows_carcass_y, [56, 379, 636]);
  assert.equal(r.drillSummary.runner_carcass_side, 'both');
});

test('BUDR box side is 0.70 of its front, not the wardrobe delta', () => {
  const r = computeCabinet({ type: 'BUDR', width: 600, height: 770, depth: 558, unit_num: 'DR1' }, P);
  assert.deepEqual(r.derived.drawer_box_side_h, [237, 178, 118]);
  const wardrobe = computeCabinet({
    type: 'WARDROBE', width: 600, height: 2150, depth: 578, drawers: 2, unit_num: 'W01',
  }, P);
  assert.deepEqual(wardrobe.derived.drawer_box_side_h, [164, 164], 'the wardrobe rule is untouched');
});

test('WUD hangs on the wall: no legs, hangers instead, and a door that may run low', () => {
  const plain = computeCabinet({ type: 'WUD', width: 600, height: 720, depth: 400, shelves: 1, hinge: 'L', unit_num: 'WU1' }, P);
  assert.equal(plain.totals.legs, 0);
  assert.equal(plain.hardware.find((h) => h.role === 'legs'), undefined);
  assert.equal(plain.hardware.find((h) => h.role === 'hangers').qty, 2);
  assert.equal(plain.assemblies.mount, 'wall');
  assert.ok(plain.assemblies.mountHeight > 0, 'a wall unit knows how high it hangs');

  const extended = computeCabinet({
    type: 'WUD', width: 600, height: 720, depth: 400, shelves: 1, hinge: 'L', unit_num: 'WU1', door_extend: true,
  }, P);
  const front = (r) => r.panels.find((p) => p.part === 'FRONT');
  assert.equal(front(extended).h - front(plain).h, P.wallUnit.doorExtend, 'the front grows by the extend');
  assert.equal(front(extended).box.y, -P.wallUnit.doorExtend, 'and hangs that far below the carcass');
  // The bottom cup keeps its distance from the carcass base, so it moves up.
  assert.equal(extended.drillSummary.front_cup_y[0] - plain.drillSummary.front_cup_y[0], P.wallUnit.doorExtend);
  assert.equal(extended.drillSummary.front_cup_y[2], front(extended).h - P.hinges.cups.baseOffsets.topFromTop);
});

test('SINK: two holders instead of a top, an inset back, shallower shelves', () => {
  const r = computeCabinet({ type: 'SINK', width: 600, height: 770, depth: 558, shelves: 1, hinge: 'L', unit_num: 'S01' }, P);
  assert.equal(r.panels.find((p) => p.id === 'TOP'), undefined, 'no TOP panel');
  assert.equal(r.panels.filter((p) => p.part === 'HOLDER').length, 2);
  assert.deepEqual(r.drillSummary.hinge_centers, [100, 470, 620], 'top hinge 50 mm lower than a base unit');
  assert.deepEqual(r.drillSummary.front_cup_y, [100, 470, 620]);

  const bud = computeCabinet({ type: 'BUD', width: 600, height: 770, depth: 558, shelves: 1, hinge: 'L', unit_num: '01' }, P);
  const shelf = (x) => x.panels.find((p) => p.part === 'SHELF');
  assert.equal(bud.panels.find((p) => p.id === 'TOP').w > 0, true);
  assert.equal(shelf(bud).h - shelf(r).h, P.sinkUnit.backSetback + P.board.thickness,
    'the sink shelf loses the back setback and the panel itself');

  // The sides lose the joints they do not have: no back tabs, no top sockets.
  const side = r.panels.find((p) => p.id === 'BUL');
  assert.equal(side.cnc.outline.length, 4, 'sink side is a plain rectangle');
  assert.equal(side.cnc.pockets.length, 2, 'bottom sockets only');
  assert.ok(r.drills.some((x) => x.kind === 'holder_screw'), 'holder screws present');
  assert.ok(r.drills.some((x) => x.kind === 'back_screw'), 'back screws present');
  // The bottom keeps its side tenons and loses the back ones.
  const bottom = r.panels.find((p) => p.id === 'BOTTOM');
  const budBottom = bud.panels.find((p) => p.id === 'BOTTOM');
  assert.ok(bottom.cnc.outline.length < budBottom.cnc.outline.length, 'sink bottom has fewer tab points');
  assert.equal(bottom.cnc.pockets.filter((p) => p.layer === 'PUZZLE_DOG_BONES').length, 4, 'two edges of dog bones');
});

test('FRIDGE: fixed panel, two back rails, back-top and spurs — no full back', () => {
  const r = computeCabinet({ type: 'FRIDGE', width: 600, height: 2100, depth: 558, fridge_h: 1786, hinge: 'L', unit_num: 'F01' }, P);
  const ids = r.panels.map((p) => p.id);
  assert.deepEqual(ids, ['BUL', 'BUR', 'TOP', 'BOTTOM', 'FIXED', 'RAIL1', 'RAIL2', 'BACK', 'SPURS', 'F01-F']);
  assert.equal(r.derived.fixed_panel_y, 1804);
  assert.equal(r.panels.find((p) => p.id === 'BACK').h, r.derived.spurs_zone_h + P.board.thickness);
  assert.equal(r.drillSummary.hinge_centers.length, 6, 'always the tall rule');
  assert.ok(r.drills.some((x) => x.kind === 'block_screw'), 'spurs block screws');
  assert.ok(r.drills.some((x) => x.kind === 'fixed_screw'), 'fixed panel screws');
  // A fridge taller than the carcass can hold has to say so, not silently
  // produce a negative panel.
  const tooTall = computeCabinet({ type: 'FRIDGE', width: 600, height: 2100, depth: 558, fridge_h: 2080, unit_num: 'F02' }, P);
  assert.ok(tooTall.warnings.some((w) => w.code === 'FRIDGE_ZONE_TOO_TALL'));
});

test('BUDTALL and LOW_CABINET differ from BUD only in the hinge rule (and the rail)', () => {
  const tall = computeCabinet({ type: 'BUDTALL', width: 600, height: 2100, depth: 558, shelves: 2, hinge: 'L', unit_num: 'T01' }, P);
  assert.equal(tall.drillSummary.hinge_centers.length, 6);
  assert.deepEqual(tall.drillSummary.front_cup_y, tall.drillSummary.hinge_centers, 'cups pass the centres through');

  const short = computeCabinet({ type: 'BUDTALL', width: 600, height: 1500, depth: 558, shelves: 1, hinge: 'R', unit_num: 'T02' }, P);
  assert.equal(short.drillSummary.hinge_centers.length, 5);

  const low = computeCabinet({ type: 'LOW_CABINET', width: 600, height: 600, depth: 578, shelves: 1, hinge: 'L', unit_num: 'LC01' }, P);
  assert.equal(low.drillSummary.hinge_centers.length, 2);
  const railed = computeCabinet({
    type: 'LOW_CABINET', width: 600, height: 900, depth: 578, shelves: 1, rail: true, rail_offset: 200, hinge: 'L', unit_num: 'LC02',
  }, P);
  assert.equal(railed.drillSummary.hinge_centers.length, 3);
  assert.equal(railed.derived.rail_y, 218, 'the ROD is exactly where it was — 200 above the floor board');
  // ─── TURN 42 (CLAUDE.md F1) ─────────────────────────────────────────────
  // The rod stands still; the BOARD over it is gone. Both kits used to cut a
  // `RAIL-PART` and disagree about whether to count it, which is what
  // `countsRailPartInPanels` was for; neither cuts one now, so the two totals
  // are equal on both — and equal for the honest reason rather than by
  // arithmetic that cancels.
  assert.equal(railed.derived.rail_partition_y, undefined, 'no partitioner is published');
  assert.ok(!railed.panels.some((p) => p.part === 'RAIL-PART'), 'and none is cut');
  assert.equal(railed.drills.filter((d) => d.kind === 'rail_partition_screw').length, 0);
  assert.ok(railed.drills.some((d) => d.kind === 'rail_bracket'), 'the side flange stays — the rod hangs on it');
  assert.equal(railed.totals.panels_lisp, railed.totals.panels_true_incl_railpart);
  const wardrobe = computeCabinet({ type: 'WARDROBE', width: 600, height: 2150, depth: 578, rail: true, unit_num: 'W01' }, P);
  assert.equal(wardrobe.totals.panels_true_incl_railpart - wardrobe.totals.panels_lisp, 0);
});

test('a height below the type minimum is raised, with a warning', () => {
  for (const [typeId, min] of [['BUDTALL', P.tallUnit.minHeight], ['LOW_CABINET', P.lowCabinet.minHeight], ['FRIDGE', P.fridgeUnit.minHeight]]) {
    const r = computeCabinet({ type: typeId, width: 600, height: min - 100, depth: 558, unit_num: 'X' }, P);
    assert.equal(r.params.height, min, `${typeId} height raised to ${min}`);
    assert.ok(r.warnings.some((w) => w.code === 'MIN_HEIGHT'), `${typeId} warns about it`);
  }
});

// ─── Legs: four in the corners, five over the threshold ───

test('legs: 4 in the corners, a 5th in the middle over the width threshold', () => {
  assert.equal(legCount(600, P), 4);
  assert.equal(legCount(1000, P), 4, 'exactly at the threshold is still four');
  assert.equal(legCount(1001, P), 5);
  assert.equal(legCount(1200, P), 5);

  const wide = legLayout({ width: 1200, depth: 558, boardT: 18, height: 100 }, P);
  assert.equal(wide.count, 5);
  const centre = wide.positions.find((p) => p.role === 'centre');
  // Geometric centre of the footprint — the middle of the width AND the depth.
  assert.equal(centre.x + P.legs.width / 2, 600);
  assert.equal(centre.z + P.legs.width / 2, 279);

  const r = computeCabinet({ type: 'BUD', width: 1200, height: 770, depth: 558, unit_num: '01' }, P);
  assert.equal(r.totals.legs, 5);
  assert.equal(r.hardware.find((h) => h.role === 'legs').qty, 5);
  assert.equal(r.hardware.find((h) => h.role === 'legs').spec.centre, true);
  assert.equal(r.assemblies.legs.positions.length, 5, 'the 3D view gets the same five');
  // A wall unit has none at all.
  assert.equal(computeCabinet({ type: 'WUD', width: 1200, height: 720, depth: 400, unit_num: 'WU1' }, P).assemblies.legs, null);
});

test('the leg rule is a profile number, not a hard-coded 1000', () => {
  const narrow = { ...P, legs: { ...P.legs, extraLegOverWidth: 500 } };
  assert.equal(legCount(600, narrow), 5);
  assert.equal(legCount(500, narrow), 4);
});

// ─── Warnings: a malformed drawer count is never a silent zero ───

test('a drawer count that is not a number raises a warning instead of vanishing', () => {
  for (const bad of ['two', {}, [2], 'NaN', true, Infinity]) {
    const r = computeCabinet({
      type: 'WARDROBE', width: 600, height: 2150, depth: 578, drawers: bad, unit_num: 'W01',
    }, P);
    assert.equal(r.params.drawers, 0, `${JSON.stringify(bad)} produces no drawers`);
    assert.ok(r.warnings.some((w) => w.code === 'DRAWERS_INVALID'),
      `${JSON.stringify(bad)} must raise DRAWERS_INVALID`);
  }
  // Numbers, numeric strings and "no drawers at all" stay silent.
  for (const ok of [0, 2, '2', null, undefined, false]) {
    const r = computeCabinet({
      type: 'WARDROBE', width: 600, height: 2150, depth: 578, drawers: ok, unit_num: 'W01',
    }, P);
    assert.equal(r.warnings.some((w) => w.code === 'DRAWERS_INVALID'), false,
      `${JSON.stringify(ok)} must not warn`);
  }
});

test('hinge rules stay attached to their kits', () => {
  assert.deepEqual(hingeCentres(770, P.hinges.rules.sink, P), [100, 470, 620]);
  assert.deepEqual(hingeCentres(770, P.hinges.rules.base, P), [100, 470, 670]);
  assert.equal(UNIT_TYPES.SINK.hingeRule, 'sink');
  assert.equal(UNIT_TYPES.BUDTALL.hingeRule, 'tall');
  assert.equal(UNIT_TYPES.LOW_CABINET.hingeRule, 'low');
  assert.equal(UNIT_TYPES.WUD.hingeRule, 'base');
});
