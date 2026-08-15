// ─── TURN 30 F4 — the divider's foot, restored from the LISP ────────────────
//
// The owner, of the joint where a divider meets the boards above and below it:
// "chyba kiedyś było ale się zagineło."
//
// ─── THE AUDIT, IN THREE MOVES ──────────────────────────────────────────────
//
// TURN 13 gave the vertical partition the owner's BUTT-JOINT BISCUIT SET on the
// TOP and the BOTTOM — four ⌀3 screws and two 70 mm marks on each board, and
// the mark transferred onto the partition's own end.
// `fixtures/golden-partition-biscuits.json` records every one of them.
//
// TURN 23 took the lot away, and its reason was true as far as it went:
// `drawWDR_PARTITION_PANEL` (KIT_WARDROBE_FULL.lsp L254-257) draws an OUTLINE
// and a LABEL and nothing else, and no kit in `reference/lisp/` names a
// `BISCUIT_4MM` layer at all. **The biscuits stay gone.** They were an
// invention and the subtraction was right.
//
// BUT IT READ THE WRONG PART. `drawWDR_PARTITION_PANEL` is the HORIZONTAL
// partition — the fixed shelf over the drawer stack. The VERTICAL divider in
// that kit is the DRAWER PANEL, and the LISP most certainly does drill it into
// the board it stands on:
//
//     (defun drawWardrobeDPHolesBOTTOM (x0 y0 szerBOT dpLeft dpRight
//                                       dpInsetCenter dpScrewDepth drawerPanelD /)
//       (if dpLeft
//         (progn
//           (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth)       (+ y0 dpInsetCenter) 1.5)
//           (drawCircle "SCREWS_3MM" (+ x0 drawerPanelD -50.0) (+ y0 dpInsetCenter) 1.5))) …)
//                                    — reference/lisp/KIT_WARDROBE_FULL.lsp
//                                      L377-385, called on the BOTTOM at L934
//
// Turn 23 restored `drawWardrobeDPHolesBACK` and `…BUL` / `…BUR` and left THIS
// ONE out — so the engine drilled a divider's back and its sides and never its
// foot. That is what got lost, and this file is it back.
//
// ─── AND THE TOP TAKES NOTHING, WHICH IS ALSO THE LISP ──────────────────────
//
// There is no `drawWardrobeDPHolesTOP` in any kit: in that kit the divider runs
// from the bottom board to the horizontal partition over the drawers and never
// reaches the top, so the LISP was never asked. Nothing is invented there and
// the gap is NAMED — asserted below, so it is a recorded decision rather than
// an omission somebody rediscovers.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { partitionFootScrews, partitionFootSpec } from '../src/engine/partitionFixings.js';
import { BISCUIT_LAYER } from '../src/engine/biscuits.js';

const LISP = readFileSync(new URL('../reference/lisp/KIT_WARDROBE_FULL.lsp', import.meta.url), 'utf8');

/** The very kit the LISP lines are written for: a wardrobe with a drawer panel. */
const wardrobe = () => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: 'W1', drawers: 3,
}, P);

/** The interactive divider: `golden-partition-biscuits.json` BISCUIT-A. */
const withDivider = (items, over = {}) => computeCabinet({
  type: 'BUD',
  width: 900,
  height: 770,
  depth: 558,
  board_t: 18,
  front_t: 25,
  unit_num: '01',
  ...over,
  sections: [{ items }],
}, P);

const feet = (r) => r.drills.filter((d) => d.kind === 'partition_foot_screw');

// ─── THE LISP IS STILL THERE, AND IT SAYS WHAT THIS SAYS IT SAYS ───────────

test('F4 the LISP lines this restoration is taken from are quoted, and they exist', () => {
  // A restoration justified by a file nobody re-read is a restoration nobody
  // can check. These four assertions are the citation, against the bytes.
  assert.match(LISP, /\(defun drawWardrobeDPHolesBOTTOM \(x0 y0 szerBOT dpLeft dpRight dpInsetCenter dpScrewDepth drawerPanelD \/\)/);
  assert.match(LISP, /\(drawCircle "SCREWS_3MM" \(\+ x0 dpScrewDepth\) \(\+ y0 dpInsetCenter\) 1\.5\)/);
  assert.match(LISP, /\(drawCircle "SCREWS_3MM" \(\+ x0 drawerPanelD -50\.0\) \(\+ y0 dpInsetCenter\) 1\.5\)/);
  // …and it is CALLED, on the BOTTOM panel, which is the half a `defun` alone
  // would not prove.
  assert.match(LISP, /\(drawWardrobeDPHolesBOTTOM curX cncY szerTOP dpLeft dpRight dpInsetCenter dpScrewDepth drawerPanelD\)/);
  // THE OTHER HALF OF THE AUDIT: there is no TOP equivalent anywhere.
  assert.doesNotMatch(LISP, /DPHolesTOP/);
});

test('F4 …and no kit anywhere names a BISCUIT layer, so turn 23’s subtraction stands', () => {
  // F4's title says "drilling + biscuits", and this is the biscuit half of the
  // answer: the owner's butt-joint set is a real workshop standard with NO LISP
  // consumer, and inventing one for the divider is what turn 13 did and turn 23
  // undid. What was actually lost is a SCREW joint, and it is what is restored.
  for (const kit of [
    'KIT_WARDROBE_FULL', 'KIT_BUD_FULL', 'KIT_BUDR_FULL', 'KIT_BUDTALL_FULL',
    'KIT_WUD_FULL', 'KIT_LOW_CABINET_FULL', 'KIT_SINK', 'KIT_FRIDGE',
    'KIT_DOOR_DOUBLE', 'KIT_SASH_STANDARD', 'SKYLON_COMMON',
  ]) {
    const text = readFileSync(new URL(`../reference/lisp/${kit}.lsp`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, new RegExp(BISCUIT_LAYER), `${kit} names ${BISCUIT_LAYER}`);
  }
});

// ─── THE PIECE THE LINES ARE WRITTEN FOR ────────────────────────────────────

test('F4 the wardrobe’s drawer panel is screwed through the BOTTOM, at the LISP’s own two points', () => {
  const r = wardrobe();
  const bottom = r.panels.find((p) => p.part === 'BOTTOM');
  const dp = r.panels.find((p) => p.part === 'DP');
  assert.ok(dp, 'the kit has a drawer panel');
  const on = feet(r);
  assert.equal(on.length, 2, 'two screws, one divider');
  assert.ok(on.every((d) => d.panel === bottom.id && d.layer === 'SCREWS_3MM' && d.d === 3));

  // THE NUMBERS, converted from the LISP's frame into the engine's. The LISP
  // states both from the FRONT edge (its own comment says so); a TOP or BOTTOM
  // is drawn rotated with its CNC x running from the BACK (engine/joinery.js),
  // so `bottomDepth − fromFront` is the conversion and it is asserted rather
  // than trusted.
  const fromFront = on.map((d) => bottom.box.d - d.x).sort((a, b) => a - b);
  assert.deepEqual(fromFront, [99, dp.box.d - 50], 'dpScrewDepth, and drawerPanelD − 50');
  assert.deepEqual(fromFront, [99, 460], 'on this 578 mm wardrobe: the LISP’s own two numbers');

  // …and across the width, on the divider's own centre line — the LISP's
  // `dpInsetCenter` = dpInset + G/2 = 30 + 9 = 39, in the BOTTOM's own frame.
  const across = [...new Set(on.map((d) => d.y))];
  assert.deepEqual(across, [39]);
  assert.equal(across[0], dp.box.x + dp.box.w / 2 - bottom.box.x, 'the divider’s own centre line');
});

test('F4 the 99 is the SAME 99 the divider’s side holes already use', () => {
  // One number, two joints. A test rather than a comment, so the day somebody
  // re-measures it the two cannot drift apart in silence.
  assert.equal(P.partitionFoot.fromFrontEdge, P.wardrobe.drawerPanel.screwDepth);
  assert.equal(P.partitionFoot.fromFrontEdge, 99);
  assert.equal(P.partitionFoot.fromFarEnd, 50);
  assert.equal(P.partitionFoot.screwDiameter, P.partitionBack.screwDiameter);
  assert.equal(P.partitionFoot.layer, P.partitionBack.layer);
  assert.deepEqual(partitionFootSpec(P), { layer: 'SCREWS_3MM', diameter: 3 });
});

// ─── AND THE INTERACTIVE DIVIDER, WHICH IS THE SAME PIECE ──────────────────

test('F4 an interactive divider standing on the bottom takes the same joint', () => {
  const r = withDivider([{ id: 'p1', kind: 'partition', x_mm: 450 }]);
  const vp = r.panels.find((p) => p.part === 'VPART');
  const bottom = r.panels.find((p) => p.part === 'BOTTOM');
  const on = feet(r);
  assert.equal(on.length, 2);
  assert.deepEqual([...new Set(on.map((d) => d.y))], [vp.box.x + vp.box.w / 2 - bottom.box.x]);
  const fromFront = on.map((d) => bottom.box.d - d.x).sort((a, b) => a - b);
  assert.deepEqual(fromFront, [99, vp.box.d - 50]);
});

test('F4 a divider that does NOT stand on the bottom takes nothing from it', () => {
  // Turn 21's F9: a partition may terminate on a FIXED shelf. One that starts
  // above the bottom board has no foot on it, and a screw driven up into thin
  // air is a hole in a finished board.
  const r = withDivider([
    { id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 300 },
    { id: 'p1', kind: 'partition', x_mm: 450 },
  ], { height: 1200 });
  const vp = r.panels.find((p) => p.part === 'VPART');
  const bottom = r.panels.find((p) => p.part === 'BOTTOM');
  // This one DOES stand on the bottom (it runs floor → shelf), so it is screwed.
  assert.equal(vp.box.y, bottom.box.y + bottom.box.h);
  assert.equal(feet(r).length, 2);

  // The other way round is the case the guard is for, and it is asked of the
  // pure function so the geometry is stated rather than staged.
  const lifted = partitionFootScrews({
    divider: {
      x: 450, w: 18, z: bottom.box.z, d: bottom.box.d,
    },
    bottom: null,
    profile: P,
  });
  assert.deepEqual(lifted, [], 'no board, no screws');
});

test('F4 a hole that would miss the divider’s own footprint is DROPPED', () => {
  // A divider set back from the face is shallower than the board it stands on,
  // and the LISP's 99-from-the-front can land in front of it. A screw driven
  // where there is no edge to bite is a hole in a finished bottom.
  const bottom = { x: 18, z: 18, d: 540 };
  const shallow = partitionFootScrews({
    // 200 deep, sitting at the BACK: its footprint is 340…540 back from the
    // front, so the 99 misses it and the second hole (200 − 50 = 150) does too.
    divider: {
      x: 450, w: 18, z: 18, d: 200,
    },
    bottom,
    profile: P,
  });
  assert.deepEqual(shallow, [], 'both holes are off the piece, so neither is cut');
  // …and a full-depth one takes both, which is what says the guard is a guard
  // and not a switch that is always off.
  assert.equal(partitionFootScrews({
    divider: {
      x: 450, w: 18, z: 18, d: 540,
    },
    bottom,
    profile: P,
  }).length, 2);
});

// ─── THE TOP IS A NAMED GAP, NOT AN OMISSION ───────────────────────────────

test('F4 the TOP takes NOTHING, and that is the LISP rather than an oversight', () => {
  for (const r of [wardrobe(), withDivider([{ id: 'p1', kind: 'partition', x_mm: 450 }])]) {
    const top = r.panels.find((p) => p.part === 'TOP');
    assert.equal(r.drills.filter((d) => d.panel === top.id).length, 0,
      'no kit in reference/lisp/ drills a TOP for a vertical member');
  }
  // The reason is written down where somebody will find it, rather than left
  // to be rediscovered as a missing feature.
  const fixings = readFileSync(new URL('../src/engine/partitionFixings.js', import.meta.url), 'utf8');
  assert.match(fixings, /THE TOP TAKES NOTHING/);
  assert.match(fixings, /drawWardrobeDPHolesTOP/);
});

// ─── AND THE BISCUITS DID NOT COME BACK ────────────────────────────────────

test('F4 not one biscuit entity returns with it', () => {
  for (const r of [wardrobe(), withDivider([{ id: 'p1', kind: 'partition', x_mm: 450 }])]) {
    assert.equal(r.drills.filter((d) => d.layer === BISCUIT_LAYER).length, 0);
    for (const panel of r.panels) {
      assert.equal((panel.cnc?.marks || []).filter((m) => m.layer === BISCUIT_LAYER).length, 0,
        `${panel.id} carries a biscuit mark`);
    }
  }
});

// ─── RULE 1: THE DELTA IS EXACTLY TWO HOLES PER DIVIDER, AND NO MORE ───────

test('F4 a cabinet with no divider in it does not move at all', () => {
  for (const type of ['BUD', 'WUD', 'BUDTALL', 'SINK']) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01' }, P);
    assert.equal(feet(r).length, 0, `${type} has no divider and takes no foot screw`);
    const bottom = r.panels.find((p) => p.part === 'BOTTOM');
    if (bottom) {
      assert.equal(r.drills.filter((d) => d.panel === bottom.id).length, 0,
        `${type}: its bottom board is untouched`);
    }
  }
});

test('F4 two dividers are four screws — the delta scales with the pieces, not with the kit', () => {
  const r = withDivider([
    { id: 'p1', kind: 'partition', x_mm: 300 },
    { id: 'p2', kind: 'partition', x_mm: 600 },
  ], { width: 1200 });
  assert.equal(r.panels.filter((p) => p.part === 'VPART').length, 2);
  assert.equal(feet(r).length, 4);
  // …one pair per divider, each on its own centre line.
  assert.equal(new Set(feet(r).map((d) => d.y)).size, 2);
});

test('F4 the numbers are the workshop’s, not the code’s', () => {
  // Rule 2: a workshop that screws its dividers somewhere else changes the
  // profile, not this engine.
  const moved = migrateCabinetProfile({
    ...P,
    partitionFoot: { ...P.partitionFoot, fromFrontEdge: 120, fromFarEnd: 80 },
  });
  const bottom = { x: 18, z: 18, d: 540 };
  const divider = {
    x: 450, w: 18, z: 18, d: 540,
  };
  const out = partitionFootScrews({ divider, bottom, profile: moved });
  assert.deepEqual(out.map((s) => bottom.d - s.x).sort((a, b) => a - b), [120, 460]);
  // …and a profile saved before this turn comes back with the block.
  const old = JSON.parse(JSON.stringify(P));
  delete old.partitionFoot;
  assert.deepEqual(migrateCabinetProfile(old).partitionFoot, P.partitionFoot);
});
