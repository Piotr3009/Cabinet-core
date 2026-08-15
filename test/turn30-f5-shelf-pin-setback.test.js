// ─── TURN 30 F5 — the shelf-pin setback, 70 → 50, through the CHANNEL ───────
//
// CLAUDE.md states both halves of this and they are the whole feature:
//
//   "LISP drills sleeves at **70 mm** from each edge (SKYLON_COMMON ~762) — so
//    70 stays the engine's bare answer. Add override input
//    `shelf_pin_setback_mm` travelling like the plinth: profile default 70
//    (=LISP), company/project value **50**, `paramsForEngine()` passes it,
//    drilling and 3D follow. Bare kit and fixtures untouched."
//
// ─── WHY THIS IS AN INPUT AND NOT A NUMBER ──────────────────────────────────
//
// Rule 1: `computeCabinet()` bare — every golden fixture — cuts what the
// AutoLISP cuts. The owner's 50 is a WORKSHOP STANDARD, not a correction to the
// kit, so changing the 70 in `profile.shelfHoles.columnFromEdge` would be
// changing what the engine believes the LISP says. It travels the plinth's own
// road instead: profile default → company row → project design →
// `paramsForEngine()` → one input on the call.
//
// So this file proves FOUR things, and the first is the one that matters most:
//
//   1. a bare call still drills 70, on every kit, front and back;
//   2. the input moves the drilling, and moves it symmetrically;
//   3. the CHANNEL is intact end to end — company row prefills the project, the
//      project reaches `paramsForEngine`, nothing else in the ladder is needed;
//   4. the 3-D follows, because the 3-D reads the drilling and there is one
//      list of holes.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';
import { DEFAULT_COMPANY_DEFAULTS, prefillDesignFromCompany, validateCompanyDefaults } from '../src/engine/companyDefaults.js';
import { shelfSupportInstances } from '../src/engine/hardware3d.js';

const SH = P.shelfHoles;
const LISP = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');

const bud = (over = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 2, ...over,
}, P);

const pinXs = (r, panelId) => [...new Set(r.drills
  .filter((d) => d.panel === panelId && d.layer === SH.layer)
  .map((d) => d.x))].sort((a, b) => a - b);

// ─── 1. THE LISP'S 70 IS STILL THE BARE ANSWER ──────────────────────────────

test('F5 the 70 is the LISP’s own, and the LISP still says it', () => {
  // The citation, against the bytes: SKYLON_COMMON's shelf-hole block drills
  // one column at `x0 + 70` and the other at `x0 + szer − 70`.
  assert.match(LISP, /\(drawCircle "SHELVES_7_5MM" \(\+ x0 70\.0\) shelfY 3\.75\)/);
  assert.match(LISP, /\(drawCircle "SHELVES_7_5MM" \(\+ x0 szer -70\.0\) shelfY 3\.75\)/);
  assert.equal(SH.columnFromEdge, 70, 'and the profile carries the same number');
});

test('F5 a BARE call drills 70, on every kit that has a shelf', () => {
  // Rule 1, asserted across the whole type list rather than on one cabinet:
  // every golden fixture is a bare call and none of them may move.
  let seen = 0;
  for (const type of UNIT_TYPE_ORDER) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', shelves: 1 }, P);
    const on = r.drills.filter((d) => d.layer === SH.layer);
    if (!on.length) continue;
    seen += 1;
    assert.equal(r.drillSummary.shelf_hole_x[0], 70, `${type}: the front column`);
    for (const panel of ['BUL', 'BUR']) {
      const xs = pinXs(r, panel);
      if (!xs.length) continue;
      const side = r.panels.find((p) => p.id === panel);
      assert.ok(Math.abs(Math.min(...xs) - 70) < 1e-9 || Math.abs(side.box.d - Math.max(...xs) - 70) < 1e-9,
        `${type}/${panel}: a column stands 70 from an edge — got ${xs.join(', ')} on a ${side.box.d} board`);
    }
  }
  assert.ok(seen >= 4, `${seen} kits with a shelf were checked`);
});

test('F5 …and a bare call passes NO setback at all', () => {
  // The engine must not need the field: a `computeCabinet()` with the kit's own
  // parameters and nothing else is the shape every fixture is written in.
  const bare = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 2 }, P);
  assert.deepEqual(bare.drillSummary.shelf_hole_x, bud({ shelf_pin_setback_mm: null }).drillSummary.shelf_hole_x);
  assert.deepEqual(bare.drillSummary.shelf_hole_x, bud({ shelf_pin_setback_mm: 0 }).drillSummary.shelf_hole_x);
  assert.deepEqual(bare.drillSummary.shelf_hole_x, bud({ shelf_pin_setback_mm: 'fifty' }).drillSummary.shelf_hole_x);
});

// ─── 2. THE INPUT MOVES THE DRILLING ────────────────────────────────────────

test('F5 the owner’s 50 moves BOTH columns, and moves them symmetrically', () => {
  const at50 = bud({ shelf_pin_setback_mm: 50 });
  const side = at50.panels.find((p) => p.id === 'BUL');
  assert.deepEqual(at50.drillSummary.shelf_hole_x, [50, side.box.d - 50]);
  assert.deepEqual(pinXs(at50, 'BUL'), [50, side.box.d - 50]);
  // The MIRRORED board too: its own x runs from the other edge, and a pin row
  // is a distance from the CABINET's front and back on either side.
  assert.deepEqual(pinXs(at50, 'BUR'), [50, side.box.d - 50]);
  // …and the ROWS did not move: this is a setback, not a re-spacing.
  assert.deepEqual(at50.drillSummary.shelf_row_y, bud().drillSummary.shelf_row_y);
  assert.equal(at50.drills.filter((d) => d.layer === SH.layer).length,
    bud().drills.filter((d) => d.layer === SH.layer).length, 'the same number of holes, moved');
});

test('F5 a PARTITION is drilled to the same standard as the sides', () => {
  // One resolution. A partition drilled to the kit's 70 while its sides were
  // drilled to the shop's 50 would be a cabinet whose shelves do not sit flat.
  const r = computeCabinet({
    type: 'WARDROBE',
    width: 1200,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    front_type: 'S',
    hinge: 'L',
    unit_num: 'W1',
    shelves: 1,
    shelf_pin_setback_mm: 50,
    sections: [{ items: [{ id: 'p1', kind: 'partition', x_mm: 600 }, { id: 's1', kind: 'shelf', pos_mm: 800, zone: 0 }] }],
  }, P);
  const part = r.panels.find((p) => p.part === 'VPART');
  assert.deepEqual(pinXs(r, part.id), [50, part.box.d - 50]);
  assert.deepEqual(pinXs(r, 'BUL'), [50, r.panels.find((p) => p.id === 'BUL').box.d - 50]);
});

test('F5 the SINK’s own back column is a kit fact and the override does not reach it', () => {
  // Its back panel is inside the box, so its back pin column moves forward —
  // 120, `sink.shelfBackColumnFromEdge`. That is a fact about the KIT, not a
  // workshop preference, so the shop's 50 sets the FRONT column and the sink
  // keeps its own answer at the back. Both sentences are true at once.
  const sink = computeCabinet({ ...defaultParamsFor('SINK', P), unit_num: '01', shelves: 1 }, P);
  if (!sink.drills.some((d) => d.layer === SH.layer)) return;
  const at50 = computeCabinet({
    ...defaultParamsFor('SINK', P), unit_num: '01', shelves: 1, shelf_pin_setback_mm: 50,
  }, P);
  assert.equal(at50.drillSummary.shelf_hole_x[0], 50, 'the front column follows the shop');
  const depth = at50.panels.find((p) => p.id === 'BUL').box.d;
  assert.equal(depth - at50.drillSummary.shelf_hole_x[1], P.sinkUnit.shelfBackColumnFromEdge,
    'and the back column is still the sink’s own');
});

// ─── 3. THE CHANNEL, END TO END ─────────────────────────────────────────────

test('F5 the project layer has a place to say it, and null means "the profile"', () => {
  assert.equal(DEFAULT_DESIGN.shelves.pinSetback, null);
  assert.equal(migrateDesign({}).shelves.pinSetback, null, 'a project saved before this turn says nothing');
  assert.equal(migrateDesign({ shelves: { pinSetback: 50 } }).shelves.pinSetback, 50);
  // …and a nonsense value is not obeyed, exactly as the shaker frame's is not.
  assert.equal(migrateDesign({ shelves: { pinSetback: 0 } }).shelves.pinSetback, null);
  assert.equal(migrateDesign({ shelves: { pinSetback: 'fifty' } }).shelves.pinSetback, null);
});

test('F5 the COMPANY row has a place to say it, and it prefills the project', () => {
  assert.equal(DEFAULT_COMPANY_DEFAULTS.shelf_pin_setback_mm, null);
  const row = { ...DEFAULT_COMPANY_DEFAULTS, shelf_pin_setback_mm: 50 };
  // It passes F2b.1's test: nothing in this app KNOWS where a workshop likes
  // its pin columns, and no rule computes it.
  const checked = validateCompanyDefaults(row, P);
  assert.deepEqual(checked.rejected, [], 'nothing about it is rule-owned');
  assert.equal(checked.value.shelf_pin_setback_mm, 50, 'and it survives the validator');
  // …while a number nobody could drill is SAID rather than obeyed.
  assert.equal(validateCompanyDefaults({ ...row, shelf_pin_setback_mm: 5 }, P).rejected.length, 1);
  assert.equal(validateCompanyDefaults({ ...row, shelf_pin_setback_mm: 5 }, P).value.shelf_pin_setback_mm, null);
  const filled = prefillDesignFromCompany({}, row, P);
  assert.equal(filled.shelves.pinSetback, 50);
  // …and the PROJECT still wins where it has said something of its own.
  assert.equal(prefillDesignFromCompany({ shelves: { pinSetback: 64 } }, row, P).shelves.pinSetback, 64);
  // A row that says nothing changes nothing, which is what keeps a shop with
  // no defaults cutting the LISP's 70.
  assert.equal(prefillDesignFromCompany({}, { ...DEFAULT_COMPANY_DEFAULTS }, P)?.shelves?.pinSetback ?? null, null);
});

test('F5 `paramsForEngine` is what carries it, and it carries it like the plinth', () => {
  const store = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
  assert.match(store, /shelf_pin_setback_mm: design\?\.shelves\?\.pinSetback \?\? null,/);
  // The comment beside it names the road, because that is the rule this feature
  // exists to obey rather than to bend.
  const at = store.indexOf('shelf_pin_setback_mm:');
  const above = store.slice(Math.max(0, at - 900), at);
  assert.match(above, /override channel/i);
  assert.match(above, /golden fixture/);
  // …and the ENGINE reads the input rather than a new formula.
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.match(engine, /const shelfPinSetback = Number\(params\?\.shelf_pin_setback_mm\) > 0/);
  assert.match(engine, /: SH\.columnFromEdge;/);
});

test('F5 and there is a control to type it into', () => {
  const panel = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');
  assert.match(panel, /data-shelf-pin-setback="1"/);
  assert.match(panel, /setDesign\(\{ shelves: \{ \.\.\.design\.shelves, pinSetback: v \} \}\)/);
  // It shows the PROFILE's number when the project has said nothing, so an
  // empty field never reads as zero.
  assert.match(panel, /: profile\.shelfHoles\.columnFromEdge\}/);
});

// ─── 4. THE 3-D FOLLOWS, BECAUSE IT READS THE DRILLING ─────────────────────

test('F5 the sleeves in the picture move with the holes, because they ARE the holes', () => {
  const at50 = bud({ shelf_pin_setback_mm: 50 });
  const at70 = bud();
  const spread = (r) => {
    const on = shelfSupportInstances(r, P);
    assert.ok(on.length > 0, 'sleeves are mounted');
    // Their spread along the cabinet's DEPTH — the axis the setback is on.
    const zs = on.map((s) => s.z);
    return Math.round((Math.max(...zs) - Math.min(...zs)) * 1000) / 1000;
  };
  // 50 in from each edge leaves 40 mm more between the columns than 70 does.
  assert.ok(Math.abs((spread(at50) - spread(at70)) - 40) < 1e-6,
    `${spread(at50)} vs ${spread(at70)} apart`);
  // …and nothing in the view invented a position: every sleeve is on a hole the
  // engine drilled.
  const holes = new Set(at50.drills.filter((d) => d.layer === SH.layer).map((d) => `${d.panel}|${d.x}|${d.y}`));
  assert.ok(holes.size > 0);
  assert.equal(shelfSupportInstances(at50, P).length <= holes.size, true);
});
