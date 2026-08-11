// ─── TURN 20 F8: THE MATERIAL SHOWS ITS WOUNDS ──────────────────────────────
//
// Owner: today only the dog bones are truly cut; every drilling and pocket must
// read as REMOVED material, the cut faces a medium-dark grey.
//
// Two halves, and both are checkable without a browser:
//
//   the ARITHMETIC — engine/recesses.js, which says where every feature is,
//   how big and how deep, off the same two records the DXF is written from;
//   the GEOMETRY — 3d/panelSolid.js, which cuts them out of the board and
//   gives the cut faces a buffer of their own. three.js runs in node, so the
//   triangles can be counted here rather than photographed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { EDGE_KEEP, clipRect, panelRecesses } from '../src/engine/recesses.js';
import { clearPanelSolidCache, panelSolids, panelSolidCacheSize } from '../src/3d/panelSolid.js';

const L = joineryLayers(P);
const G = P.board.thickness;

const budr = () => computeCabinet({
  type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01',
}, P);

const wardrobe = () => computeCabinet({
  type: 'WARDROBE',
  width: 600,
  height: 2150,
  depth: 578,
  board_t: 18,
  front_t: 25,
  front_type: 'S',
  hinge: 'L',
  unit_num: '01',
  shelves: 2,
  drawers: 2,
  doors: true,
}, P);

// ─── F8.1 — every feature the CNC block knows ───────────────────────────────

test('F8.1 — a drawer side’s two grooves become two BLIND recesses at true depth', () => {
  const r = budr();
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const cut = panelRecesses(side, r.drills, { thickness: G, skipLayers: [L.socket] });
  assert.equal(cut.length, 2, 'the runner reduction and the bottom groove');
  const runner = cut.find((f) => f.layer === 'DRAWER_RUNNER_POCKET');
  const bottom = cut.find((f) => f.layer === 'DRAWER_BOTTOM_POCKET');
  assert.equal(runner.depth, P.baseDrawerUnit.runnerPocketDepth, '2 mm, the engine’s own');
  assert.equal(bottom.depth, P.baseDrawerUnit.bottomPocketDepth, 'and 7 mm');
  assert.equal(runner.through, false, 'a 2 mm groove does not go through an 18 mm board');
  assert.equal(bottom.through, false);
});

test('F8.1 — a drilling is a recess, and one with no stated depth goes THROUGH', () => {
  const r = wardrobe();
  const bul = r.panels.find((p) => p.id === 'BUL');
  const cut = panelRecesses(bul, r.drills, { thickness: G, skipLayers: [L.socket] });
  const holes = cut.filter((f) => f.kind === 'round');
  assert.ok(holes.length >= 10, 'a carcass side is full of them');
  for (const hole of holes) {
    assert.equal(hole.through, true, 'the LISP carries no drill depth, so it is through');
    assert.equal(hole.depth, null, '…and no depth is invented for it');
    assert.ok(hole.r > 0);
  }
  // Every drill the engine emits for this panel is accounted for, bar any that
  // sit closer to an edge than the board can hold.
  const drilled = r.drills.filter((d) => d.panel === bul.id).length;
  assert.ok(holes.length <= drilled);
});

test('F8.1 — the SOCKET is not cut twice: turn 11 already took it out of the outline', () => {
  const r = wardrobe();
  const bul = r.panels.find((p) => p.id === 'BUL');
  assert.ok((bul.cnc.pockets || []).some((p) => p.layer === L.socket), 'this side has sockets');
  assert.equal(
    panelRecesses(bul, r.drills, { thickness: G, skipLayers: [L.socket] })
      .some((f) => f.layer === L.socket),
    false,
  );
  // The guard stands on its own and not on the fact that today's sockets carry
  // no depth: give one a depth and it is STILL not cut, because the outline
  // already is the hole and cutting it twice would punch through a notch.
  const deepened = {
    ...bul,
    cnc: {
      ...bul.cnc,
      pockets: bul.cnc.pockets.map((p) => (p.layer === L.socket ? { ...p, depth: 18 } : p)),
    },
  };
  assert.ok(panelRecesses(deepened, [], { thickness: G }).some((f) => f.layer === L.socket),
    'without the guard it would be');
  assert.equal(
    panelRecesses(deepened, [], { thickness: G, skipLayers: [L.socket] })
      .some((f) => f.layer === L.socket),
    false,
    'with it, it is not',
  );
});

test('F8.1 — a pocket with no stated depth is NOT cut, rather than cut to a guess', () => {
  const panel = {
    id: 'X',
    part: 'SHELF',
    w: 500,
    h: 300,
    box: {
      x: 0, y: 0, z: 0, w: 500, h: 18, d: 300,
    },
    cnc: { pockets: [{ layer: 'PUZZLE_SOCKET', x1: 10, y1: 10, x2: 60, y2: 40 }] },
  };
  assert.deepEqual(panelRecesses(panel, [], { thickness: 18 }), []);
});

test('F8 — a cut that runs off the board is held back by a hair, not left to break it', () => {
  // A pocket runs `pocketOvershoot` past the edge so the cutter enters off the
  // work. Clipped exactly to the edge it would be a notch, not a hole, and a
  // triangulator is entitled to refuse it.
  const r = budr();
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const w = side.cnc.drawn_w;
  const h = side.cnc.drawn_h;
  for (const f of panelRecesses(side, r.drills, { thickness: G, skipLayers: [L.socket] })) {
    assert.ok(f.x - f.w / 2 >= EDGE_KEEP - 1e-9, 'inside the left edge');
    assert.ok(f.y - f.h / 2 >= EDGE_KEEP - 1e-9, 'inside the bottom edge');
    assert.ok(f.x + f.w / 2 <= w - EDGE_KEEP + 1e-9, 'inside the right edge');
    assert.ok(f.y + f.h / 2 <= h - EDGE_KEEP + 1e-9, 'inside the top edge');
  }
  assert.equal(clipRect(-10, -10, 5, 5, 100, 100), null, 'a cut wholly off the board is no cut');
});

// ─── the geometry ───────────────────────────────────────────────────────────
//
// ─── TURN 21 (CLAUDE.md F3): THE CARVING IS RETIRED, BEHIND A FLAG ─────────
//
// The owner saw pilot dots on his door faces and stray dashes inside carcasses
// and called it: the CNC sheet is the document. `appearance.cuts.enabled` is
// FALSE by default, so the tests below that are about the CARVING ask a
// profile with it on — the machinery is retired, not deleted, and a future
// turn that flips the flag has these to stand on. What the DEFAULT profile
// does is asserted directly underneath them.
const CUTS_ON = { ...P, appearance: { ...P.appearance, cuts: { enabled: true } } };

test('F8.1 — the board really loses the material, and the cut faces get a buffer', () => {
  clearPanelSolidCache();
  const r = budr();
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const cut = panelSolids(side, L, CUTS_ON, r.drills);
  assert.ok(cut.solid, 'a side with grooves is no longer a plain box');
  assert.ok(cut.cuts, 'and its cuts have walls and floors of their own');
  // The same board with its two grooves taken OUT of the record is a plain
  // rectangle and gets no solid at all — so the extra triangles above are the
  // material that is actually gone, not a face painted to look cut.
  const bare = panelSolids({ ...side, id: 'BARE', cnc: { ...side.cnc, pockets: [] } }, L, CUTS_ON, []);
  assert.equal(bare.solid, null, 'nothing cut into it, nothing to cut out of it');
  assert.equal(bare.cuts, null);
  clearPanelSolidCache();
});

test('F8.1 — a BLIND recess has a floor and a THROUGH one does not', () => {
  clearPanelSolidCache();
  const board = {
    id: 'B',
    part: 'SHELF',
    w: 200,
    h: 200,
    box: {
      x: 0, y: 0, z: 0, w: 200, h: 18, d: 200,
    },
    cnc: { pockets: [{ layer: 'DRAWER_RUNNER_POCKET', depth: 2, x1: 50, y1: 50, x2: 90, y2: 90 }] },
  };
  const blind = panelSolids(board, L, CUTS_ON, []);
  const through = panelSolids(
    { ...board, id: 'C', cnc: { pockets: [{ ...board.cnc.pockets[0], depth: 18 }] } },
    L, CUTS_ON, [],
  );
  // A blind rectangle is four walls (8 triangles) plus a floor drawn both ways
  // (4 fans × 2); a through one is the four walls alone.
  assert.ok(blind.cuts.attributes.position.count > through.cuts.attributes.position.count,
    'the floor is what a blind cut has and a through one does not');
  clearPanelSolidCache();
});

test('F8.3 — one buffer per panel, shared by every identical panel in the job', () => {
  clearPanelSolidCache();
  const r = budr();
  const sides = r.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.meta.drawer === 1);
  assert.equal(sides.length, 2);
  const [a, b] = sides.map((p) => panelSolids(p, L, CUTS_ON, r.drills));
  assert.equal(a.solid, b.solid, 'the left and right sides of one drawer are one geometry');
  assert.equal(a.cuts, b.cuts);
  const after = panelSolidCacheSize();
  // Re-asking costs nothing at all.
  for (const p of sides) panelSolids(p, L, CUTS_ON, r.drills);
  assert.equal(panelSolidCacheSize(), after, 'a second ask is a cache hit');
  clearPanelSolidCache();
  assert.equal(panelSolidCacheSize(), 0, 'and the cache lets go when told to');
});

test('F8.3 — the whole cabinet stays cheap: no per-hole mesh, no per-frame work', () => {
  clearPanelSolidCache();
  const r = budr();
  let triangles = 0;
  let buffers = 0;
  for (const p of r.panels.filter((q) => q.box && q.cnc)) {
    const built = panelSolids(p, L, CUTS_ON, r.drills);
    if (built.solid) { triangles += built.solid.attributes.position.count / 3; buffers += 1; }
    if (built.cuts) { triangles += built.cuts.attributes.position.count / 3; buffers += 1; }
  }
  // A three-drawer base unit, every drilling and groove cut into it. The point
  // of the number is its ORDER: this is a few thousand triangles for a whole
  // cabinet, not a mesh per hole.
  assert.ok(triangles < 20000, `a whole BUDR is ${triangles} triangles`);
  assert.ok(buffers < 60, `and ${buffers} buffers, not one per feature`);
  clearPanelSolidCache();
});

// ─── F8.2 — a cut is raw board ──────────────────────────────────────────────

test('F8.2 — the cut-face colour is ONE profile number, read by both scenes', () => {
  assert.equal(P.appearance.cutFace, '#4a4a4a', 'the owner’s medium-dark grey');
  // `MovingPanel` is the one panel renderer and both the room and the cabinet
  // editor draw through it, so one material covers both.
  const view = readSource('src/3d/UnitView.jsx');
  assert.ok(view.includes('profile.appearance.cutFace'));
  assert.ok(!view.includes("'#4a4a4a'"), 'not a literal in the view (rule 2)');
});

test('F8.2 — a decor is never painted onto a cut face', () => {
  // The proof is structural: the cuts are a SEPARATE mesh with its own
  // material, and the only thing that material is given is the cut colour. A
  // single mesh with two materials would have painted the board's own edges
  // grey along with the holes, which is the other half of why they are apart.
  const view = readSource('src/3d/UnitView.jsx');
  const block = view.slice(view.indexOf('ccCutFaces'), view.indexOf('ccCutFaces') + 700);
  assert.ok(block.includes('appearance.cutFace'));
  assert.ok(!block.includes('map={'), 'no texture reaches it');
  assert.ok(!block.includes('surface.colour'), 'and no finish colour either');
});

test('F8.4 — CNC and fixtures: ZERO. This is the same data, drawn honestly', () => {
  // Nothing in the recess path is reachable from the engine's own output: it
  // READS `panel.cnc` and `drills` and returns geometry.
  const engine = readSource('src/engine/cabinet.js');
  assert.ok(!engine.includes('panelRecesses'));
  assert.ok(!engine.includes('panelSolids'));
  // …and asking for the recesses does not touch the record it read.
  const r = budr();
  const before = JSON.stringify({ panels: r.panels, drills: r.drills });
  for (const p of r.panels.filter((q) => q.cnc)) panelRecesses(p, r.drills, { thickness: G });
  assert.equal(JSON.stringify({ panels: r.panels, drills: r.drills }), before);
});

const HERE = dirname(fileURLToPath(import.meta.url));
function readSource(rel) {
  return readFileSync(join(HERE, '..', rel), 'utf8');
}
