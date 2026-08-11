// ─── Partition fixing: the BISCUIT pattern (turn 13, CLAUDE.md F8 / #59) ────
//
// BLOCKERS #59 has been open since turn 11, when the vertical partition landed
// with no drilling at all and the engine said so in as many words: "its DRILLING
// is a later question and is written down as one." The owner has now given the
// answer as workshop truth, and it is the app's reference pattern for a butt
// joint:
//
//   screw ⌀3 → 10 mm gap → biscuit mark 70 mm → 10 mm gap → screw ⌀3
//
// starting no closer than 50 mm from the element's edge — never less. Two sets
// up to 700 mm, three above it. That is all.
//
// Two halves to this file. The PATTERN is arithmetic and is checked against the
// owner's own four widths; the MACHINING is checked against
// fixtures/golden-partition-biscuits.json, which was worked out by hand from
// the rule and not from the engine.
//
// ─── THE DELIBERATE DELTA ───
// This is new machining. CLAUDE.md sanctions it by name: the partition export
// gains drilling and biscuits where it exported nothing at all. The last test
// here is the other side of that promise — a cabinet with no vertical partition
// emits not one entity of it, which is why every existing fixture and the
// export fingerprint are untouched.
//
// ─── TURN 23 (CLAUDE.md F5): …AND THE PARTITION GAVE IT BACK ────────────────
//
// Verified against the LISP before turn 23 was written: `drawWDR_PARTITION_
// PANEL` (reference/lisp/KIT_WARDROBE_FULL.lsp L254-257) draws an OUTLINE and a
// LABEL, and no kit in `reference/lisp/` names a `BISCUIT_4MM` layer anywhere.
// The engine had applied the owner's butt-joint set to a part the LISP never
// gave one, so this turn removes it — both halves of the joint, the receiver's
// screws and marks and the partition's own mark. What holds the partition is
// `engine/partitionFixings.js` and the LISP's own `drawWardrobeDPHolesBACK`.
//
// The PATTERN half of this file stands unchanged: it is the workshop's recorded
// standard for a butt joint (BLOCKERS #59, answered by the owner) and the layer
// is part of his VCarve tool mapping. What it has today is no consumer.
//
// The MACHINING half is now the regression test for the SUBTRACTION, and it is
// driven by the same golden fixture: every entity turn 13 worked out by hand is
// asserted ABSENT, one by one, on the very cases that used to carry them. A
// fixture that records what a turn removed is worth more than a deleted one.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  biscuitLayers, biscuitSetCount, biscuitSetLength, biscuitSets, BISCUIT_LAYER,
  markFromEnd, receiverTakesScrews,
} from '../src/engine/biscuits.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { cncLayer } from '../src/engine/cnc/layers.js';
import { panelDxf } from '../src/engine/cnc/dxf.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const GOLDEN = JSON.parse(readFileSync(new URL('../fixtures/golden-partition-biscuits.json', import.meta.url)));

// ─── The layer, which is a machine contract ─────────────────────────────────

test('THE LAYER NAME is exactly BISCUIT_4MM', () => {
  // CLAUDE.md: "Layer name exactly as written." It is what the owner's VCarve
  // tool mapping matches on, so it is not a string anybody may tidy.
  assert.equal(BISCUIT_LAYER, 'BISCUIT_4MM');
  assert.equal(biscuitLayers(P).mark, 'BISCUIT_4MM');
  assert.equal(cncLayer('BISCUIT_4MM').name, 'BISCUIT_4MM');
  assert.notEqual(cncLayer('BISCUIT_4MM').aci, cncLayer('?').aci, 'it must be a KNOWN layer, not the fallback');
});

test('the screws join the existing SCREWS_3MM family, not a new one', () => {
  // Turn-8 conventions: "same layer, same sizes."
  assert.equal(biscuitLayers(P).screw, P.puzzle.layers.screw);
  assert.equal(P.biscuits.screwDiameter, P.puzzle.screwDiameter);
});

test('every number of the pattern is a profile value (rule 2)', () => {
  const B = P.biscuits;
  assert.equal(B.markLength, 70);
  assert.equal(B.gap, 10);
  assert.equal(B.edgeMin, 50);
  assert.equal(B.wideThreshold, 700);
  assert.equal(B.markTool, 4, 'the cutter the owner’s in-and-out program uses');
});

// ─── THE SET ────────────────────────────────────────────────────────────────

test('THE CHAIN: a set is screw + gap + mark + gap + screw', () => {
  assert.equal(biscuitSetLength(P), 3 + 10 + 70 + 10 + 3);
  const [set] = biscuitSets({ length: 540, profile: P });
  assert.equal(set.start, 50);
  // The screws are HOLES, so their centres are half a diameter in from the ends.
  assert.deepEqual(set.screws, [51.5, 144.5]);
  // …and the mark is 70 mm, one clear gap past the first screw.
  assert.deepEqual(set.mark, { from: 63, to: 133 });
  assert.equal(set.mark.to - set.mark.from, P.biscuits.markLength);
  assert.equal(set.mark.from - (set.screws[0] + P.biscuits.screwDiameter / 2), P.biscuits.gap);
  assert.equal((set.screws[1] - P.biscuits.screwDiameter / 2) - set.mark.to, P.biscuits.gap);
});

test('THE COUNTS CLAUDE.md NAMES: 400/700/701/900 → 2/2/3/3', () => {
  for (const c of GOLDEN.set_positions.cases) {
    assert.equal(biscuitSetCount(c.length, P), c.count, `${c.length} mm: ${c.reason}`);
    const starts = biscuitSets({ length: c.length, profile: P }).map((s) => s.start);
    assert.deepEqual(starts, c.starts, `${c.length} mm set starts`);
  }
});

test('THE 50 mm MINIMUM is never bought back for an extra set', () => {
  // "never less" — so a joint that cannot hold its sets at 50 loses a set, not
  // the margin.
  for (let L = 100; L <= 1200; L += 1) {
    const sets = biscuitSets({ length: L, profile: P });
    for (const s of sets) {
      assert.ok(s.start >= P.biscuits.edgeMin - 1e-9, `${L} mm: a set starts at ${s.start}`);
      assert.ok(s.end <= L - P.biscuits.edgeMin + 1e-9, `${L} mm: a set ends at ${s.end}`);
    }
  }
});

test('…and sets never overlap each other, at any length', () => {
  for (let L = 100; L <= 1600; L += 1) {
    const sets = biscuitSets({ length: L, profile: P });
    for (let i = 1; i < sets.length; i += 1) {
      assert.ok(sets[i].start >= sets[i - 1].end - 1e-9,
        `${L} mm: set ${i} starts at ${sets[i].start}, the one before ends at ${sets[i - 1].end}`);
    }
  }
});

test('a joint too short for one set gets none, rather than a broken one', () => {
  assert.deepEqual(biscuitSets({ length: 195, profile: P }), [],
    '50 + 96 + 50 = 196 is the shortest joint the rule fits in');
  assert.equal(biscuitSets({ length: 196, profile: P }).length, 1);
  assert.equal(biscuitSetCount(0, P), 0);
  assert.equal(biscuitSetCount(-5, P), 0);
});

test('the middle set is CENTRED on the element, not spaced off the first', () => {
  const [, middle] = biscuitSets({ length: 900, profile: P });
  assert.equal(middle.start + biscuitSetLength(P) / 2, 450);
});

// ─── THE NO-SCREW SET ───────────────────────────────────────────────────────

test('THE NO-SCREW SET: same positions, mark only', () => {
  const screwed = biscuitSets({ length: 540, screws: true, profile: P });
  const bare = biscuitSets({ length: 540, screws: false, profile: P });
  assert.equal(bare.length, screwed.length);
  for (let i = 0; i < bare.length; i += 1) {
    assert.deepEqual(bare[i].mark, screwed[i].mark, 'the mark is in the SAME place');
    assert.deepEqual(bare[i].screws, [], 'and there is no screw');
  }
});

test('a through-screw exists only where the receiving face is CONCEALED', () => {
  assert.equal(receiverTakesScrews('TOP', P), true, 'under a worktop');
  assert.equal(receiverTakesScrews('BOTTOM', P), true, 'inside the plinth void');
  assert.equal(receiverTakesScrews('SHELF', P), false,
    'the owner’s own example: the visible top of a fixed shelf must not be drilled through');
});

// ─── THE MACHINING, against the golden fixture ──────────────────────────────

const unitFor = (c) => computeCabinet({ ...defaultParamsFor(c.inputs.type, P), ...c.inputs }, P);
const marksOf = (panel) => (panel.cnc?.marks || []).map((m) => ({ from: m.from, to: m.to, layer: m.layer }));
const screwsOf = (result, id) => result.drills
  .filter((d) => d.panel === id && d.kind === 'biscuit_screw')
  .map((d) => ({ x: d.x, y: d.y, d: d.d, layer: d.layer }));

// ─── TURN 23 · F5 — every entity of it, gone ────────────────────────────────
for (const c of GOLDEN.cases) {
  test(`F5 — ${c.id}: the borrowed biscuits are gone (${c.description})`, () => {
    const result = unitFor(c);
    for (const want of c.expect) {
      const panel = result.panels.find((p) => p.id === want.panel);
      // The PANEL is still cut, and at the same size: F5 removes machining,
      // never a piece of furniture.
      assert.ok(panel, `${c.id}: no panel ${want.panel}`);
      // …and turn 13's own hand-worked answer is the list of what must not be
      // there. Asserting against it rather than against `[]` is what makes this
      // a record of the subtraction instead of a blank.
      assert.ok(want.screws.length + want.marks.length > 0, 'the fixture records something to remove');
      assert.deepEqual(screwsOf(result, want.panel), [], `${c.id} ${want.panel} still carries biscuit screws`);
      // ─── TURN 24 (CLAUDE.md F7): AND THE SET COMES BACK, ON ITS OWN JOINT ──
      //
      // Turn 23 removed the PARTITION's borrowed biscuits, and every one of the
      // entities this fixture worked out by hand is still absent. What turn 24
      // adds is a different joint on a different piece: a FIX SHELF is biscuited
      // to the boards it lands on, which is the consumer `engine/biscuits.js`
      // was written for. So the assertion is not "no marks at all" — that would
      // now be asserting the absence of the owner's own joint — it is "not ONE
      // of the marks the partition's joint put there", named position by named
      // position, which is what this file has always been about.
      const here = marksOf(panel);
      for (const gone of want.marks) {
        assert.equal(
          here.some((m) => m.layer === gone.layer
            && m.from[0] === gone.from[0] && m.from[1] === gone.from[1]
            && m.to[0] === gone.to[0] && m.to[1] === gone.to[1]),
          false,
          `${c.id} ${want.panel} still carries the partition's mark at ${gone.from}`,
        );
      }
    }
  });
}

test('BISCUIT-A: the geometry the fixture set out from is the geometry the engine builds', () => {
  const c = GOLDEN.cases[0];
  const vp = unitFor(c).panels.find((p) => p.part === 'VPART');
  assert.deepEqual(vp.box, c.geometry.partition_box);
});

test('BISCUIT-B: the geometry the fixture set out from is untouched — only the machining went', () => {
  const c = GOLDEN.cases[1];
  const result = unitFor(c);
  const shelf = result.panels.find((p) => p.id === 'SHELF-1');
  const vp = result.panels.find((p) => p.part === 'VPART');
  assert.deepEqual(shelf.box, c.geometry.shelf_box);
  assert.deepEqual(vp.box, c.geometry.partition_box);
});

// ─── It leaves the DXF (turn 23, F5) ────────────────────────────────────────

test('F5 — the partition\'s own file carries no BISCUIT_4MM entity at all', () => {
  const c = GOLDEN.cases[0];
  const result = unitFor(c);
  const vp = result.panels.find((p) => p.part === 'VPART');
  const dxf = panelDxf(vp, result.drills, { unitNum: '01', profile: P });

  // The layer TABLE may still declare it — the writer declares every known
  // layer and the owner's tool mapping matches on the name. What must be gone
  // is an ENTITY on it.
  const lines = dxf.split('\r\n');
  const at = lines.indexOf('BISCUIT_4MM', lines.indexOf('ENTITIES'));
  assert.equal(at, -1, 'the partition still cuts a biscuit mark');
});

test('F5 — and neither does the board it lands on', () => {
  const c = GOLDEN.cases[0];
  const result = unitFor(c);
  for (const part of ['TOP', 'BOTTOM']) {
    const panel = result.panels.find((p) => p.part === part);
    const dxf = panelDxf(panel, result.drills, { unitNum: '01', profile: P });
    const lines = dxf.split('\r\n');
    assert.equal(lines.indexOf('BISCUIT_4MM', lines.indexOf('ENTITIES')), -1, `${part} still cuts a mark`);
  }
  assert.equal(result.drills.some((d) => d.kind === 'biscuit_screw'), false);
});

// ─── …and NOTHING ELSE MOVED ────────────────────────────────────────────────

test('THE OTHER HALF OF THE DELTA: no partition, no biscuit — in any kit', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const result = computeCabinet(defaultParamsFor(id, P), P);
    for (const panel of result.panels) {
      assert.equal(panel.cnc?.marks, undefined, `${id} ${panel.id} grew a mark`);
    }
    assert.equal(result.drills.some((d) => d.kind === 'biscuit_screw'), false, `${id} grew a biscuit screw`);
  }
});

test('a cabinet with a partition changes ONLY the panels the joint touches', () => {
  const c = GOLDEN.cases[0];
  const withPartition = unitFor(c);
  const touched = new Set(['TOP', 'BOTTOM', 'VPART-1']);
  for (const panel of withPartition.panels) {
    if (touched.has(panel.id)) continue;
    assert.equal(panel.cnc?.marks, undefined, `${panel.id} is not part of the joint`);
    assert.equal(withPartition.drills.some((d) => d.panel === panel.id && d.kind === 'biscuit_screw'), false);
  }
});

test('the recorded standard is still a standard: markFromEnd is a real number', () => {
  // The pattern module keeps its numbers and its tests (F5 removed its
  // consumer, not the workshop's answer to BLOCKERS #59).
  assert.ok(markFromEnd(P) > 0);
  assert.ok(markFromEnd(P) < P.biscuits.markLength);
});

test('F5 — no cabinet in any kit emits a mark, with a partition or without one', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const base = defaultParamsFor(id, P);
    const withPartition = {
      ...base,
      sections: [{
        width_mm: base.width,
        items: [{ id: 'p1', kind: 'partition', x_mm: Math.round(base.width / 2) }],
      }],
    };
    for (const params of [base, withPartition]) {
      const result = computeCabinet(params, P);
      for (const panel of result.panels) {
        assert.equal(panel.cnc?.marks, undefined, `${id} ${panel.id} grew a mark`);
      }
      assert.equal(result.drills.some((d) => d.kind === 'biscuit_screw'), false, `${id} grew a biscuit screw`);
    }
  }
});
