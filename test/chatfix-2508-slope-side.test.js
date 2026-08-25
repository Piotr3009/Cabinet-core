import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

// ─── CHAT-FIX 25.08.2026 — THE CUT CARCASS AND ITS TOP JOINT ────────────────
//
// The owner, screenshot in hand, two rulings:
//
//   *"bul lub bur nadal ma dog bonesy, a mowilismy ze jak jest skos to dog
//   bonesy znikaja."*
//
//   *"bur jest nadal prosto ciety a powinien byc po skosie … patrzac od
//   czola."*
//
// The first is a joint that no longer exists: the roof board carries no tab
// (F3), so the socket row T47 put on the cut edge had nothing to catch and its
// dog bones surfaced on a visible edge for nothing. Under a roof the sides now
// take the same `edges` flag KIT_SINK has always used for a carcass with no
// top panel.
//
// The second is the scene: a side's CNC outline lives in the depth plane and
// cannot hold the bevel through the 18 mm, so the blank rendered square from
// the front. The engine now states the top edge AT EACH FACE
// (`meta.slopeCut.bevel3d`) and `panelSolid` tilts the top vertices between
// the two — asserted here at the record, where the scene reads it.

const G = P.board.thickness;
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const H = PARAMS.height;
const W = PARAMS.width;

// One straight fall across the whole width — every board is under the roof.
const FALL = {
  slope_cut: { pts: [{ x: 0, y: H - 150 }, { x: W, y: H - 750 }], infill: 40 },
};

const build = (over = {}) => computeCabinet({ ...PARAMS, ...over }, P);
const byId = (cut, id) => cut.panels.find((p) => p.id === id);

// The top row, as the machine knows it: puzzle holes within a socket's reach
// of the board's own top edge. On the flat carcass that is the LISP's
// `(+ y0 wys (- S) 1.0)` row; on a cut side the edge is `p.h` and the band is
// the same.
const topRowHoles = (p) => (p.cnc.holes || [])
  .filter((hole) => hole.kind === 'puzzle' && hole.y > p.h - (G / 2 + 8));

test('a cut carcass drills NO top-board sockets — the row is OFF, as on SINK', () => {
  const plain = build();
  const cut = build(FALL);
  for (const id of ['BUL', 'BUR']) {
    const before = byId(plain, id);
    const after = byId(cut, id);
    // The plain carcass HAS the row — this test must not pass vacuously.
    assert.ok(topRowHoles(before).length > 0,
      `${id}: the flat carcass carries its top socket row`);
    assert.equal(topRowHoles(after).length, 0,
      `${id}: "jak jest skos to dog bonesy znikaja" — no top row on a cut side`);
    // …and nothing of the row survives ABOVE the cut either: a hole in air is
    // a hole the machine plunges through the bed.
    assert.equal((after.cnc.holes || []).filter((hole) => hole.y > after.h).length, 0,
      `${id}: no holes left in air`);
  }
});

test('the record states the top edge at EACH face — and the blank is their peak', () => {
  const cut = build(FALL);
  for (const id of ['BUL', 'BUR']) {
    const p = byId(cut, id);
    const bev = p.meta?.slopeCut?.bevel3d;
    assert.ok(bev, `${id}: meta.slopeCut.bevel3d exists`);
    assert.ok(Number.isFinite(bev.a) && Number.isFinite(bev.b), `${id}: both faces are numbers`);
    assert.ok(Math.abs(Math.max(bev.a, bev.b) - p.h) < 0.01,
      `${id}: the blank h is the peak over its own 18 mm`);
    // One straight fall: the wedge through 18 mm is G·tan β exactly.
    const beta = Math.atan(600 / W);
    const drop = Math.abs(bev.a - bev.b);
    assert.ok(Math.abs(drop - G * Math.tan(beta)) < 0.01,
      `${id}: the wedge is G·tan β (got ${drop})`);
  }
  // The fall runs left-high to right-low, so BUL's outer face (x = 0) is the
  // high one and BUR's outer face (x = W) the low one — the scene tilts the
  // right way round or the wedge points at the wrong wall.
  assert.ok(byId(cut, 'BUL').meta.slopeCut.bevel3d.a
    > byId(cut, 'BUL').meta.slopeCut.bevel3d.b, 'BUL: outer face high');
  assert.ok(byId(cut, 'BUR').meta.slopeCut.bevel3d.a
    > byId(cut, 'BUR').meta.slopeCut.bevel3d.b, 'BUR: inner face high');
});

test('no slope, no change — the flat carcass is untouched by identity', () => {
  const plain = build();
  for (const id of ['BUL', 'BUR']) {
    const p = byId(plain, id);
    assert.equal(p.meta?.slopeCut, undefined, `${id}: no slope meta on a flat carcass`);
  }
});

test('the law is stated in SKYLON_COMMON.lsp, where the slope lives', () => {
  const lsp = readFileSync(new URL('../reference/lisp/SKYLON_COMMON.lsp', import.meta.url), 'utf8');
  assert.match(lsp, /jak jest skos to\s*;;;\s*dog bonesy znikaja/,
    'the owner\'s ruling, verbatim, beside SKY:slopeCutPts');
  assert.match(lsp, /NO top-board sockets/, 'and the law it makes');
});
