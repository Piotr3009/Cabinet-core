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
//
// ─── CHAT FIX 17.10.2026: THE OWNER PUTS THE SET BACK, ON THE RECEIVERS ─────
//
// *"na dividerze mamy wiercenie 3 mm w bottom ale nie mamy w top, a nie ma
// przeciez fix shelves zeby divider sie zatrzymal, i do tego nie mamy ciastek"*;
// the T13 set on the TOP and the BOTTOM: *"tak"*; a fix shelf: *"jak mamy polke
// fix to robisz tylko ciastka bez nawiertow"*; whatever the joint system:
// *"tak, koduj"*. LISP first this time: SKYLON_JOINTS_BISCUIT.lsp section I
// (the law T23 said was missing), engine/dividerJoints.js its mirror. So the
// MACHINING half turns round once more: the golden's TOP, BOTTOM and SHELF
// entities are asserted PRESENT, to the decimal, and the golden's VPART marks
// stay ABSENT: the divider's ends are plain (T26 F7.1, the owner's ruling for
// the fix shelf, the same word for the divider). Two readings of the fixture
// moved with the law since 09.08.2026 and are named here rather than edited
// into it (the fixture is frozen): a mark is a segment, so 407..477 and
// 477..407 are one mark; and a FIX shelf starts at the side's face since T24
// (x 18, not 20), so its across is 441, not the fixture's 439.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  biscuitLayers, biscuitSetCount, biscuitSetLength, biscuitSets, BISCUIT_LAYER,
  markFromEnd, receiverTakesScrews,
} from '../src/engine/biscuits.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  DIVIDER_SCREW_KIND, dividerJointCuts, dividerReceiverAt, canReceiveDivider, isFixedShelfPanel,
} from '../src/engine/dividerJoints.js';
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
  .filter((d) => d.panel === id && d.kind === DIVIDER_SCREW_KIND)
  .map((d) => ({ x: d.x, y: d.y, d: d.d, layer: d.layer }));
/** A mark as an unordered segment: the fixture walks some of them the other way. */
const segment = (m) => [m.layer, Math.min(m.from[0], m.to[0]), Math.max(m.from[0], m.to[0]),
  Math.min(m.from[1], m.to[1]), Math.max(m.from[1], m.to[1])].join('|');
const byXY = (a, b) => (a.x - b.x) || (a.y - b.y);
// The fixture's SHELF frame is T13's, "drawn upright: x along the WIDTH, y
// along the DEPTH"; since T26 F8 a shelf is drawn depth x width, x from its
// FRONT edge, so the fixture's shelf points are TRANSPOSED; and a FIX shelf
// takes the full light from the side's face since T24 F6 (x 18, the fixture's
// 20), so its across moves by 2. Two readings of one frozen file, named here.
const shelfToday = (want) => want.map((m) => ({ ...m, from: [m.from[1], m.from[0] + 2], to: [m.to[1], m.to[0] + 2] }));
// 17.10.2026, 14:15 ("lustro bottom i top"): the fixture's TOP is T13's frame,
// the view from above; the TOP is drawn from its UNDERSIDE now, y from the BUR
// end, so the fixture's TOP y is read as W_int - y (864 - 441 = 423;
// SKYLON_JOINTS_BISCUIT.lsp section J, NUMBERS I.1). x is untouched.
const topToday = (want, wInt) => want.map((m) => ({ ...m, from: [m.from[0], wInt - m.from[1]], to: [m.to[0], wInt - m.to[1]] }));
const topScrewsToday = (want, wInt) => want.map((s) => ({ ...s, y: wInt - s.y }));

// ─── 17.10.2026 · every entity of it, back on the receivers ─────────────────
for (const c of GOLDEN.cases) {
  test(`17.10.2026: ${c.id}: the owner's set is back on the receivers, to the fixture's numbers (${c.description})`, () => {
    const result = unitFor(c);
    assert.deepEqual(result.warnings, []);
    for (const want of c.expect) {
      const panel = result.panels.find((p) => p.id === want.panel);
      assert.ok(panel, `${c.id}: no panel ${want.panel}`);
      assert.ok(want.screws.length + want.marks.length > 0, 'the fixture records something');
      if (want.panel === 'VPART-1') {
        // T26 F7.1: the divider's ends are plain; T13's transfer stays gone.
        assert.deepEqual(screwsOf(result, want.panel), []);
        assert.deepEqual(marksOf(panel).filter((m) => m.layer === BISCUIT_LAYER), [], 'nothing on the divider itself');
        continue;
      }
      // TOP and BOTTOM: the screws, as the fixture lists them (sorted; the engine
      // walks each set from the front, the fixture from the back edge); the
      // TOP's in the underside frame since 17.10.2026.
      const wInt = result.derived.internal_width;
      const wantScrews = want.panel === 'TOP' ? topScrewsToday(want.screws, wInt) : want.screws;
      assert.deepEqual(screwsOf(result, want.panel).sort(byXY), [...wantScrews].sort(byXY), `${c.id} ${want.panel} screws`);
      const wantMarks = want.panel.startsWith('SHELF') ? shelfToday(want.marks)
        : (want.panel === 'TOP' ? topToday(want.marks, wInt) : want.marks);
      assert.deepEqual(
        marksOf(panel).filter((m) => m.layer === BISCUIT_LAYER).map(segment).sort(),
        wantMarks.map(segment).sort(),
        `${c.id} ${want.panel} marks`,
      );
    }
  });
}

test('17.10.2026: the receiver finder: BOTTOM under a foot, TOP over a head, a FIX shelf either way, an adjustable shelf never', () => {
  const panels = [
    { id: 'BOTTOM', part: 'BOTTOM', box: { x: 18, y: 0, z: 18, w: 864, h: 18, d: 540 } },
    { id: 'TOP', part: 'TOP', box: { x: 18, y: 752, z: 18, w: 864, h: 18, d: 540 } },
    { id: 'SHELF-1', part: 'SHELF', meta: { variant: 'fixed' }, box: { x: 18, y: 400, z: 18, w: 864, h: 18, d: 520 } },
    { id: 'SHELF-2', part: 'SHELF', meta: { variant: 'adjustable' }, box: { x: 20, y: 600, z: 18, w: 860, h: 18, d: 520 } },
  ];
  assert.equal(dividerReceiverAt(panels, { y: 18, x: 459, foot: true })?.id, 'BOTTOM');
  assert.equal(dividerReceiverAt(panels, { y: 752, x: 459, foot: false })?.id, 'TOP');
  assert.equal(dividerReceiverAt(panels, { y: 418, x: 459, foot: true })?.id, 'SHELF-1', 'a divider standing on the fix shelf');
  assert.equal(dividerReceiverAt(panels, { y: 400, x: 459, foot: false })?.id, 'SHELF-1', 'a divider stopping under it');
  assert.equal(dividerReceiverAt(panels, { y: 618, x: 459, foot: true }), null, 'an adjustable shelf receives nothing');
  assert.equal(dividerReceiverAt(panels, { y: 18, x: 2000, foot: true }), null, 'off the board\'s run');
  assert.equal(isFixedShelfPanel(panels[2]), true);
  assert.equal(isFixedShelfPanel(panels[3]), false);
  assert.equal(canReceiveDivider(panels[3]), false);
  assert.equal(canReceiveDivider(panels[0]), true);
  // The cuts of a divider on this list: the foot on the BOTTOM (screws and
  // marks), the head under SHELF-1 (the marks alone, on the 520 overlap).
  const vp = { id: 'VPART-1', part: 'VPART', box: { x: 450, y: 18, z: 18, w: 18, h: 382, d: 540 } };
  const cuts = dividerJointCuts({ panels: [...panels, vp], profile: P });
  assert.deepEqual(cuts.joints, [
    { divider: 'VPART-1', end: 'foot', receiver: 'BOTTOM', length: 540, sets: 2, screws: true },
    { divider: 'VPART-1', end: 'head', receiver: 'SHELF-1', length: 520, sets: 2, screws: false },
  ]);
  assert.equal(cuts.drills.length, 4);
  assert.ok(cuts.drills.every((d) => d.kind === DIVIDER_SCREW_KIND && d.panel === 'BOTTOM' && d.layer === 'SCREWS_3MM' && d.d === 3));
  assert.deepEqual(cuts.marks.map((m) => m.panelId), ['BOTTOM', 'BOTTOM', 'SHELF-1', 'SHELF-1']);
  // A divider whose end is in the air (nothing at that height) has no joint there.
  const lifted = dividerJointCuts({ panels: [...panels, { ...vp, box: { ...vp.box, y: 100, h: 200 } }], profile: P });
  assert.deepEqual(lifted.joints.map((j) => j.receiver), [null, null]);
  assert.deepEqual(lifted.drills, []);
});

test('BISCUIT-A: the geometry the fixture set out from is the geometry the engine builds', () => {
  const c = GOLDEN.cases[0];
  const vp = unitFor(c).panels.find((p) => p.part === 'VPART');
  assert.deepEqual(vp.box, c.geometry.partition_box);
});

test('BISCUIT-B: the geometry the fixture set out from is untouched, and the shelf joint is the OVERLAP (520, not 540)', () => {
  const c = GOLDEN.cases[1];
  const result = unitFor(c);
  const shelf = result.panels.find((p) => p.id === 'SHELF-1');
  const vp = result.panels.find((p) => p.part === 'VPART');
  assert.deepEqual(shelf.box, c.geometry.shelf_box);
  assert.deepEqual(vp.box, c.geometry.partition_box);
  assert.deepEqual(result.derived.dividerJoints, [
    { divider: 'VPART-1', end: 'foot', receiver: 'BOTTOM', length: 540, sets: 2, screws: true },
    { divider: 'VPART-1', end: 'head', receiver: 'SHELF-1', length: 520, sets: 2, screws: false },
  ]);
  // The fix shelf: *"tylko ciastka bez nawiertow"*: not one screw through it.
  assert.equal(result.drills.filter((d) => d.panel === 'SHELF-1' && d.kind !== 'shelf').length, 0);
});

// ─── It reaches the DXF (17.10.2026) ────────────────────────────────────────

test('F5: the partition\'s own file carries no BISCUIT_4MM entity at all (T26 F7.1 holds for the divider)', () => {
  const c = GOLDEN.cases[0];
  const result = unitFor(c);
  const vp = result.panels.find((p) => p.part === 'VPART');
  const dxf = panelDxf(vp, result.drills, { unitNum: '01', profile: P });
  const lines = dxf.split('\r\n');
  const at = lines.indexOf('BISCUIT_4MM', lines.indexOf('ENTITIES'));
  assert.equal(at, -1, 'the partition cuts a biscuit mark');
});

test('17.10.2026: and the boards it lands on DO: the TOP\'s and the BOTTOM\'s files carry the marks and the screws', () => {
  const c = GOLDEN.cases[0];
  const result = unitFor(c);
  for (const part of ['TOP', 'BOTTOM']) {
    const panel = result.panels.find((p) => p.part === part);
    const dxf = panelDxf(panel, result.drills, { unitNum: '01', profile: P });
    const lines = dxf.split('\r\n');
    const ents = lines.indexOf('ENTITIES');
    assert.ok(lines.indexOf('BISCUIT_4MM', ents) > ents, `${part} cuts no mark`);
    // Two marks: two open POLYLINE entities on the layer (R12: POLYLINE,
    // VERTEX, VERTEX, SEQEND, each stamped with the layer; the POLYLINE counts).
    let n = 0;
    for (let i = ents; i < lines.length - 3; i += 1) {
      if (lines[i] === '0' && lines[i + 1] === 'POLYLINE' && lines[i + 2] === '8' && lines[i + 3] === 'BISCUIT_4MM') n += 1;
    }
    assert.equal(n, 2, `${part}: two marks in the file`);
  }
  assert.equal(result.drills.filter((d) => d.kind === 'divider_screw').length, 8, 'four per board');
});

// ─── …and NOTHING ELSE MOVED ────────────────────────────────────────────────

// CHAT FIX 17.10.2026: a mark on CORNER_4MM is the owner's corner mark on an
// L outline (the L corner kits carry it by default: KIT_CORNER_L.lsp section
// 4), not a biscuit mark; this file's identity promise is about BISCUITS.
const biscuitMarks = (panel) => (panel.cnc?.marks || []).filter((m) => m.layer !== 'CORNER_4MM');

test('THE OTHER HALF OF THE DELTA: no partition, no biscuit — in any kit', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const result = computeCabinet(defaultParamsFor(id, P), P);
    if (result.panels.some((p) => p.part === 'VPART')) continue; // a kit with a divider of its own is the joint's
    for (const panel of result.panels) {
      assert.deepEqual(biscuitMarks(panel), [], `${id} ${panel.id} grew a biscuit mark`);
    }
    assert.equal(result.drills.some((d) => d.kind === 'divider_screw'), false, `${id} grew a divider screw`);
  }
});

test('a cabinet with a partition changes ONLY the panels the joint touches', () => {
  const c = GOLDEN.cases[0];
  const withPartition = unitFor(c);
  const touched = new Set(['TOP', 'BOTTOM', 'VPART-1']);
  for (const panel of withPartition.panels) {
    if (touched.has(panel.id)) continue;
    assert.equal(panel.cnc?.marks, undefined, `${panel.id} is not part of the joint`);
    assert.equal(withPartition.drills.some((d) => d.panel === panel.id && d.kind === 'divider_screw'), false);
  }
});

test('the recorded standard is still a standard: markFromEnd is a real number', () => {
  // The pattern module keeps its numbers and its tests (F5 removed its
  // consumer, not the workshop's answer to BLOCKERS #59).
  assert.ok(markFromEnd(P) > 0);
  assert.ok(markFromEnd(P) < P.biscuits.markLength);
});

test('17.10.2026: in every kit a partition sets out ONLY on the boards it meets: the receivers carry the marks, nothing else does', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const base = defaultParamsFor(id, P);
    const bare = computeCabinet(base, P);
    if (bare.panels.some((p) => p.part === 'VPART')) continue;
    const withPartition = {
      ...base,
      sections: [{
        width_mm: base.width,
        items: [{ id: 'p1', kind: 'partition', x_mm: Math.round(base.width / 2) }],
      }],
    };
    const result = computeCabinet(withPartition, P);
    const vp = result.panels.find((p) => p.part === 'VPART');
    if (!vp) continue; // the kit refused the partition: nothing to set out
    const receivers = new Set((result.derived.dividerJoints || []).map((j) => j.receiver).filter(Boolean));
    for (const panel of result.panels) {
      const marks = biscuitMarks(panel).filter((m) => m.layer === BISCUIT_LAYER);
      if (receivers.has(panel.id)) {
        assert.ok(marks.length >= 1, `${id} ${panel.id} receives the divider and carries no mark`);
      } else {
        assert.deepEqual(marks, [], `${id} ${panel.id} grew a biscuit mark`);
      }
    }
    assert.equal(result.drills.some((d) => d.kind === 'divider_screw' && !receivers.has(d.panel)), false, `${id}: a divider screw off the receivers`);
    assert.equal(result.drills.some((d) => d.kind === 'divider_screw' && !['TOP', 'BOTTOM'].includes(d.panel)), false, `${id}: a through screw where the face is not concealed`);
  }
});
