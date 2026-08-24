import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { slopeCutActive, trimOutlineOnSlope } from '../src/engine/puzzle.js';

// ─── TURN 46 · F6 — THE PAPER AND THE EYES ──────────────────────────────────
//
// CLAUDE.md F6a: *"3D: the room already tells the truth (F1); the cut cabinet
// renders from the engine's own panels — no scene-side twin geometry."*
//
// NO SCENE-SIDE TWIN GEOMETRY is the whole claim, and it is a claim about a
// FILE: `3d/panelSolid.js` must not contain a second opinion about where the
// ceiling is. So the test reads the file as well as the panels.

const solid = readFileSync(new URL('../src/3d/panelSolid.js', import.meta.url), 'utf8');
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const CUT = { y0: 2400, y1: 1200, infill: 40 };

test('F6a — the scene imports the ENGINE\'s cut; it has none of its own', () => {
  assert.match(solid, /import \{ slopeCutActive, trimOutlineOnSlope \} from '\.\.\/engine\/puzzle\.js'/);
  assert.match(solid, /const outline = trimOutlineOnSlope\(notchedOutline\(\{/);
  // Not one line of diagonal arithmetic in the scene: no gradient, no lerp, no
  // second `ceilingAt`. The clip is handed two numbers and a function.
  assert.equal(/ceilingAt/.test(solid), false, 'the scene never asks where the ceiling is');
  assert.equal(/startHeight/.test(solid), false);
  assert.equal(/hR - hL/.test(solid), false, 'no gradient of its own');
});

test('F6a — the LINE the scene clips with is published by the engine, per panel', () => {
  const r = computeCabinet({ ...PARAMS, slope_cut: CUT }, P);
  const back = r.panels.find((p) => p.id === 'BACK');
  const front = r.panels.find((p) => p.part === 'FRONT');
  // T47 (licence 1): the LINE is published beside the two ends it always was.
  // The ends are UNCHANGED — this is a unit under one straight run, so the line
  // is two points and they are those two numbers.
  assert.deepEqual(back.cnc.slopeCut, {
    pts: [{ x: 0, y: 2400 }, { x: 600, y: 1200 }], hL: 2400, hR: 1200,
  });
  // The FRONT's is in the SHEET's frame — the inside mirror — because that is
  // the frame its outline is in and the frame the scene rebuilds it in.
  assert.deepEqual(front.cnc.slopeCut, {
    pts: [{ x: 0, y: 1200 }, { x: 597, y: 2394 }], hL: 1200, hR: 2394,
  });
  // …and every one of them cuts the panel's own rectangle to the panel's own
  // outline, which is the parity the claim is made of.
  for (const p of [back, front]) {
    const { drawn_w: w, drawn_h: h } = p.cnc;
    const rebuilt = trimOutlineOnSlope([[0, 0], [w, 0], [w, h], [0, h]], {
      w, h, hL: p.cnc.slopeCut.hL, hR: p.cnc.slopeCut.hR,
    });
    assert.deepEqual(rebuilt, p.cnc.outline, `${p.id}: the scene rebuilds the sheet's shape`);
  }
});

test('F6a — a panel with no cut publishes nothing, and the scene draws its box', () => {
  const plain = computeCabinet({ ...PARAMS }, P);
  for (const p of plain.panels) assert.equal(p.cnc?.slopeCut, undefined, p.id);
  assert.equal(slopeCutActive({ h: 2150, hL: 2150, hR: 2150 }), false);
  // …and the early return that sends a featureless panel to a boxGeometry now
  // asks about the cut too, or a flat cut door would be drawn as a rectangle.
  assert.match(solid, /if \(!notches\.length && !tabs\.length && !recesses\.length && !slopeCut\) return NOTHING;/);
});

// T47 (licence 1): the key is the whole LINE now — two leaves under the same
// two ends but a different knee between them are two different boards, and a
// key made of the ends alone would hand the second one the first one's solid.
test('F6a — two leaves cut differently are two different cached boards', () => {
  assert.match(solid, /slope:\$\{\(slopeCut\.pts \|\| \[\{ x: 0, y: slopeCut\.hL \}, \{ x: w, y: slopeCut\.hR \}\]\)/);
});

// ─── F6b — NAMED, AND NOT DELIVERED (iron rule 1's first sacrifice) ─────────
//
// The premise F6b rests on — *"the drawings already draw panels, this is only
// its screenshot"* — is not true, and the finding is worth more than a fudged
// picture would have been. Both halves are pinned here so the next turn does
// not have to rediscover them.

const elevation = readFileSync(new URL('../src/engine/drawings/frontElevation.js', import.meta.url), 'utf8');
const section = readFileSync(new URL('../src/engine/drawings/section.js', import.meta.url), 'utf8');

test('F6b — the sheets draw panel BOXES, not outlines (why the pentagon is not on paper)', () => {
  assert.match(elevation, /\.\.\.rect\(style\.layer, p\.box\.x, p\.box\.y, p\.box\.w, p\.box\.h\)/);
  assert.equal(/p\.cnc\.outline/.test(elevation), false,
    'the elevation never reads an outline — a cut door would print as its bounding rectangle');
});

test('F6b — …and a vertical section is the ZY projection; the cut runs in X', () => {
  assert.match(section, /A vertical section is the ZY projection/);
  // What the A-A CAN show is real and is not nothing: the top has dropped and
  // one side is shorter, and both come off the panels' own boxes.
  const r = computeCabinet({ ...PARAMS, slope_cut: CUT }, P);
  const top = r.panels.find((p) => p.id === 'TOP');
  const bur = r.panels.find((p) => p.id === 'BUR');
  assert.ok(top.box.y < PARAMS.height - P.board.thickness, 'the section shows a lowered top');
  assert.ok(bur.box.h < PARAMS.height, 'and a shorter side');
});

test('F6b — the skip is written down where the audit will look', () => {
  const note = readFileSync(new URL('../verify/t46/f6b-not-delivered.md', import.meta.url), 'utf8');
  assert.match(note, /NOT DELIVERED/);
  assert.match(note, /ZY projection/);
  assert.match(note, /panel BOXES, not panel OUTLINES/);
});
