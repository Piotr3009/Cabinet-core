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

for (const c of GOLDEN.cases) {
  test(`${c.id}: ${c.description}`, () => {
    const result = unitFor(c);
    for (const want of c.expect) {
      const panel = result.panels.find((p) => p.id === want.panel);
      assert.ok(panel, `${c.id}: no panel ${want.panel}`);
      assert.deepEqual(screwsOf(result, want.panel), want.screws, `${c.id} ${want.panel} screws`);
      assert.deepEqual(marksOf(panel), want.marks, `${c.id} ${want.panel} marks`);
    }
  });
}

test('BISCUIT-A: the geometry the fixture set out from is the geometry the engine builds', () => {
  const c = GOLDEN.cases[0];
  const vp = unitFor(c).panels.find((p) => p.part === 'VPART');
  assert.deepEqual(vp.box, c.geometry.partition_box);
});

test('BISCUIT-B: the joint line is the OVERLAP, and one part shows it', () => {
  const c = GOLDEN.cases[1];
  const result = unitFor(c);
  const shelf = result.panels.find((p) => p.id === 'SHELF-1');
  const vp = result.panels.find((p) => p.part === 'VPART');
  assert.deepEqual(shelf.box, c.geometry.shelf_box);
  assert.deepEqual(vp.box, c.geometry.partition_box);
  // The partition is 540 deep and the shelf 520, so the two ends of ONE part
  // carry different set-outs. A fixing past the end of the receiving board is a
  // screw into air.
  const marks = vp.cnc.marks.map((m) => m.from[1]);
  assert.ok(marks.includes(407), 'the bottom joint is set out on 540');
  assert.ok(marks.includes(387), 'the shelf joint on 520');
});

// ─── It reaches the DXF ─────────────────────────────────────────────────────

test('the mark is an OPEN path in the file — in and out, not a pocket', () => {
  const c = GOLDEN.cases[0];
  const result = unitFor(c);
  const vp = result.panels.find((p) => p.part === 'VPART');
  const dxf = panelDxf(vp, result.drills, { unitNum: '01', profile: P });

  assert.ok(dxf.includes('BISCUIT_4MM'), 'the layer is declared and used');
  // R12 spells an open polyline with the closed flag clear. The mark's own
  // vertices have to be in there at the millimetre.
  const lines = dxf.split('\r\n');
  const at = lines.indexOf('BISCUIT_4MM', lines.indexOf('ENTITIES'));
  assert.ok(at > 0, 'a BISCUIT_4MM entity, not just a layer-table row');
  assert.equal(lines[at + 2], '1', 'group 66: vertices follow');
  assert.equal(lines[at + 4], '0', 'group 70: NOT closed — the cutter goes in and comes back');
});

test('the screws are ⌀3 circles on SCREWS_3MM, like every other screw in the app', () => {
  const c = GOLDEN.cases[0];
  const result = unitFor(c);
  const top = result.panels.find((p) => p.part === 'TOP');
  const dxf = panelDxf(top, result.drills, { unitNum: '01', profile: P });
  assert.ok(dxf.includes('SCREWS_3MM'));
  // r = 1.5 for every one of the four.
  assert.equal((dxf.match(/\r\n40\r\n1\.5\r\n/g) || []).length >= 4, true);
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

test('markFromEnd keeps the partition’s half ON the board', () => {
  const c = GOLDEN.cases[0];
  const vp = unitFor(c).panels.find((p) => p.part === 'VPART');
  for (const m of vp.cnc.marks) {
    assert.ok(m.from[0] > 0 && m.from[0] < vp.box.h, `a mark at x ${m.from[0]} is off a ${vp.box.h} part`);
    assert.ok(m.from[1] >= 0 && m.to[1] <= vp.box.d);
  }
  assert.ok(markFromEnd(P) > 0);
});
