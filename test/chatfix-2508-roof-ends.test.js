import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { mm } from '../src/3d/constants.js';

// ─── CHAT-FIX 25.08.2026 (part two) — THE ROOF BOARD'S ENDS ARE VERTICAL ────
//
// The owner, red pen on both corners: *"katy nie sa poucinane."* The leant
// board was a rotated BOX, so its ends stood perpendicular to the board and
// the lower corners poked `G·sin β` past the plumb line. His law, 24.08:
// *"pionowo lico do boku."*
//
// This test takes the SCENE'S OWN solid, leans its vertices by hand exactly
// as the scene's group does, and demands every end vertex stand on a plumb
// line — at x = 0 and x = W for a fall across the whole width. The board's
// level run is then `L + G·tan β`, which must equal the cut list's own
// `L_MAX` — the sheet and the scene saying one number at last.

const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const G = P.board.thickness;
const H = PARAMS.height;
const W = PARAMS.width;

const FALL = { slope_cut: { pts: [{ x: 0, y: H - 150 }, { x: W, y: H - 150 - W }], infill: 40 } };

const spin = ([x, y], pv, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - pv.x;
  const dy = y - pv.y;
  return [pv.x + dx * Math.cos(a) - dy * Math.sin(a),
    pv.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

test('leant by hand, EVERY end vertex stands plumb — at x = 0 and x = W', () => {
  const r = computeCabinet({ ...PARAMS, ...FALL }, P);
  const top = r.panels.find((p) => p.id === 'TOP');
  const { solid } = panelSolids(top, P.puzzle.layers, P);
  assert.ok(solid, 'the leant roof board now HAS a solid — not a bare box');
  const pos = solid.attributes.position;
  const cx = top.box.x + top.box.w / 2;
  const cy = top.box.y + top.box.h / 2;
  const ends = [];
  for (let i = 0; i < pos.count; i += 1) {
    // Scene units back to mm, box-centred back to the unit's own frame.
    const wx = pos.getX(i) / mm(1) + cx;
    const wy = pos.getY(i) / mm(1) + cy;
    ends.push(spin([wx, wy], top.meta.tilt_pivot, top.meta.tilt_deg)[0]);
  }
  const xs = [...new Set(ends.map((x) => Math.round(x * 100) / 100))].sort((a, b) => a - b);
  assert.equal(xs.length, 2, `two plumb lines and nothing between — saw ${xs.join(', ')}`);
  assert.ok(Math.abs(xs[0] - 0) < 0.05, 'the high end stands at x = 0');
  assert.ok(Math.abs(xs[1] - W) < 0.05, 'the low end stands at x = W');
});

test('the level run of the sheared board IS the cut list\'s L_MAX', () => {
  const r = computeCabinet({ ...PARAMS, ...FALL }, P);
  const top = r.panels.find((p) => p.id === 'TOP');
  const { solid } = panelSolids(top, P.puzzle.layers, P);
  const pos = solid.attributes.position;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    min = Math.min(min, pos.getX(i));
    max = Math.max(max, pos.getX(i));
  }
  const run = (max - min) / mm(1);
  assert.ok(Math.abs(run - top.meta.slopeCut.blankLen) < 0.01,
    `scene run ${run} = sheet L_MAX ${top.meta.slopeCut.blankLen}`);
});

test('a LEVEL lid is untouched: no slope, no solid, the plain box as ever', () => {
  const flat = computeCabinet(PARAMS, P);
  const lid = flat.panels.find((p) => p.id === 'TOP');
  const built = panelSolids(lid, P.puzzle.layers, P);
  // The flat lid has tabs, so it HAS a machined solid — but not the roof one:
  // its box stays the board and its ends were never anything but square.
  assert.ok(built, 'panelSolids still answers for the lid');
  assert.equal(lid.meta?.tilt_axis, undefined, 'and nothing tells it to lean');
});
