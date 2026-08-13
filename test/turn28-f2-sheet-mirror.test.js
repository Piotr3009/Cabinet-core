// ─── TURN 28 F2 — cups and handles take the SHEET's own mirror ──────────────
//
// Two halves of one convention fault.
//
// A FRONT's CNC frame is the INSIDE MIRROR — `engine/joinery.js
// panelPlacement` puts its origin at the leaf's bottom-RIGHT corner with
// u = [−1, 0, 0] — because the workshop bores a door from the back and the
// sheet is drawn the way the door lies on the bench. The CUP law has honoured
// that since turn 1: an L-hinged leaf's cup is DRAWN at `w − 21.5` and lands
// 21.5 mm from the LEFT edge in the ROOM, which is its hinge edge.
//
//   F2a  `src/3d/shakerSolid.js normaliseBores` read the CNC x as if the
//        origin were bottom-LEFT (`b.x − w/2`), so the tray mirrored every
//        hole it cut. The owner photographed it: hinge arms on one stile and
//        the bored cups on the other.
//   F2b  `src/engine/handles.js` resolved the opening edge in ROOM terms
//        (`openingLeft = hinge === 'R'`) and wrote the answer into the
//        MIRRORED frame — so on the sheet the knob printed on the CUP stile
//        for BOTH hands. His sheet `03-F` (597 × 767) is the picture of it.
//
// The named delta: every DXF carrying a door handle moves that handle's x to
// the opposite stile, and nothing else moves.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { handleReference } from '../src/engine/handles.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { panelRecesses } from '../src/engine/recesses.js';
import { clearShakerCache, shakerFrontGeometry } from '../src/3d/shakerSolid.js';
import { doorHingeInstances } from '../src/engine/hardware3d.js';
import { mm } from '../src/3d/constants.js';

const BAR = { type: 'bar', centres: 160 };

/** A double-door shaker unit — one L leaf and one R leaf, both handled. */
const pair = (extra = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P),
  unit_num: '01',
  width: 900,
  front_type: 'S',
  project_handle: BAR,
  ...extra,
}, P);

const leaves = (r) => r.panels.filter((p) => p.part === 'FRONT');

/** CNC x → the cabinet's own x, through the placement the app publishes. */
function worldX(panel, cncX) {
  const pl = panelPlacement(panel);
  return pl.origin[0] + pl.u[0] * cncX;
}

// ─── F2b — the LAW ──────────────────────────────────────────────────────────

test('F2b the opening edge is resolved in the frame the answer is written in', () => {
  const panel = { w: 600, h: 800 };
  // hinge L → the hinge edge is sheet-RIGHT (x = w) → the reference is at
  // sheet-LEFT; hinge R the converse. ONE condition, and it is the only thing
  // that flips.
  const l = handleReference({ panel, handleClass: 'base-door', hinge: 'L' }, P);
  const r = handleReference({ panel, handleClass: 'base-door', hinge: 'R' }, P);
  assert.equal(l.x, P.handles.inset);
  assert.equal(r.x, 600 - P.handles.inset);
  assert.equal(l.y, r.y, 'the y stands');
  assert.equal(l.rule, r.rule, '…and so does the rule');
  assert.equal(l.anchor, r.anchor);
  assert.equal(l.towards, r.towards);
  assert.equal(l.axis, r.axis);
});

test('F2b on the SHEET the cups and the knob are on OPPOSITE stiles, both hands', () => {
  const r = pair();
  for (const leaf of leaves(r)) {
    const cups = r.drills.filter((d) => d.panel === leaf.id && d.kind === 'cup');
    assert.ok(cups.length >= 2, `${leaf.id}: it is a hung leaf`);
    const handle = r.drills.filter((d) => d.panel === leaf.id && d.layer === P.handles.layer);
    assert.ok(handle.length > 0, `${leaf.id}: and it carries a handle`);
    // Every cup on one side of the leaf's mid-line and every handle hole on
    // the other. THIS is the owner's `03-F` read as arithmetic.
    const mid = leaf.w / 2;
    const cupSide = Math.sign(cups[0].x - mid);
    assert.ok(cups.every((d) => Math.sign(d.x - mid) === cupSide), `${leaf.id}: the cups are one column`);
    assert.ok(handle.every((d) => Math.sign(d.x - mid) === -cupSide),
      `${leaf.id}: the handle is on the other stile`);
  }
});

test('F2b …and in the ROOM each handle is at its leaf’s FREE edge', () => {
  const r = pair();
  for (const leaf of leaves(r)) {
    const hinge = leaf.meta.hinge;
    const handle = r.drills.filter((d) => d.panel === leaf.id && d.layer === P.handles.layer);
    // The hinge edge in the ROOM: 'L' is the leaf's own left.
    const hingeEdgeX = hinge === 'L' ? leaf.box.x : leaf.box.x + leaf.w;
    const freeEdgeX = hinge === 'L' ? leaf.box.x + leaf.w : leaf.box.x;
    for (const d of handle) {
      const wx = worldX(leaf, d.x);
      assert.ok(Math.abs(wx - freeEdgeX) < Math.abs(wx - hingeEdgeX),
        `${leaf.id} (${hinge}): the handle stands at the free edge, not the hinge edge`);
      assert.ok(Math.abs(wx - freeEdgeX) <= P.handles.inset + 1e-6,
        `${leaf.id}: …and within the inset of it`);
    }
  }
});

test('F2b the CUPS did not move: 21.5 from the hinge edge, in the room, both hands', () => {
  const r = pair();
  for (const leaf of leaves(r)) {
    const hingeEdgeX = leaf.meta.hinge === 'L' ? leaf.box.x : leaf.box.x + leaf.w;
    for (const d of r.drills.filter((x) => x.panel === leaf.id && x.kind === 'cup')) {
      assert.ok(Math.abs(Math.abs(worldX(leaf, d.x) - hingeEdgeX) - P.hinges.cups.xFromHingeEdge) < 0.1,
        `${leaf.id}: the cup is 21.5 from its own hinge edge`);
    }
    // …and the MOUNTED hinge agrees with the drilled cup to the hundredth,
    // which is the check that the engine was right all along.
    const mounted = doorHingeInstances(leaf, {
      panels: r.panels,
      centres: r.drillSummary.hinge_centers,
      profile: P,
      width: r.params.width,
      boardT: r.params.board_t,
      depth: r.params.depth,
    });
    assert.ok(mounted.length > 0);
    for (const h of mounted) {
      assert.ok(Math.abs(Math.abs(h.x - hingeEdgeX) - P.hinges.cups.xFromHingeEdge) < 0.01);
    }
  }
});

test('F2b nothing but the x moved: the y, the pair spacing and the layer stand', () => {
  const r = pair();
  for (const leaf of leaves(r)) {
    const holes = r.drills
      .filter((d) => d.panel === leaf.id && d.layer === P.handles.layer)
      .sort((a, b) => a.y - b.y);
    assert.equal(holes.length, 2, 'a bar is two holes');
    assert.equal(Math.abs(holes[1].y - holes[0].y), BAR.centres, 'at the chosen centres');
    assert.equal(holes[0].x, holes[1].x, 'up the stile, so one x');
    assert.equal(holes[0].d, P.handles.holeDiameter);
    // 50 from the TOP is a base door's law and it is untouched.
    assert.equal(Math.max(holes[0].y, holes[1].y), leaf.h - P.handles.inset);
  }
});

// ─── F2a — the TRAY ─────────────────────────────────────────────────────────

test('F2a the tray cuts its bores through the SAME mirror the sheet is drawn in', () => {
  clearShakerCache();
  const r = pair();
  for (const leaf of leaves(r)) {
    const bores = panelRecesses(leaf, r.drills, { thickness: leaf.box.d, profile: P });
    const geo = shakerFrontGeometry(leaf, bores);
    assert.ok(geo, `${leaf.id}: a shaker leaf builds a tray`);
    const cups = bores.filter((b) => b.kind === 'round' && Math.abs(b.r - P.hinges.cups.diameter / 2) < 0.01);
    assert.ok(cups.length >= 2, `${leaf.id}: the tray is given the cups`);

    // The mesh is centred on the leaf's own box and runs the ROOM's way, so a
    // cup's mesh x must be `w/2 − CNC x` — which is `hinge edge ∓ 21.5` about
    // the leaf's centre. Measured off the geometry itself: the tray's vertices
    // nearest each cup centre.
    const half = leaf.w / 2;
    for (const c of cups) {
      const meshX = half - c.x;
      // In the room, that centre is at the leaf's box plus half a width.
      const wx = leaf.box.x + half + meshX;
      const hingeEdgeX = leaf.meta.hinge === 'L' ? leaf.box.x : leaf.box.x + leaf.w;
      assert.ok(Math.abs(Math.abs(wx - hingeEdgeX) - P.hinges.cups.xFromHingeEdge) < 0.1,
        `${leaf.id}: the tray's cup is on the hinge stile, like the arms`);
      // …and the BUILT geometry really has a bore there and NOT at the
      // mirrored point, which is the assertion turn 27's tray fails.
      const cy = c.y - leaf.h / 2;
      assert.ok(hasRingAt(geo, meshX, cy, c.r),
        `${leaf.id}: the tray carries the bore on the hinge stile`);
      assert.ok(!hasRingAt(geo, -meshX, cy, c.r),
        `${leaf.id}: …and nothing at all on the free stile`);
    }
  }
});

test('F2a two leaves of one size and opposite hands are TWO trays', () => {
  clearShakerCache();
  const r = pair();
  const [a, b] = leaves(r);
  const geoA = shakerFrontGeometry(a, panelRecesses(a, r.drills, { thickness: a.box.d, profile: P }));
  const geoB = shakerFrontGeometry(b, panelRecesses(b, r.drills, { thickness: b.box.d, profile: P }));
  assert.notEqual(a.meta.hinge, b.meta.hinge, 'one of each hand');
  assert.notEqual(geoA, geoB, 'sharing one would put a cup on the wrong stile');
});

/**
 * Is a bore of radius `r` really cut about (cx, cy) in the BUILT tray?
 *
 * A RING and not a point: a whole circle of distinct vertices at that radius
 * about that centre, which a quad corner passing nearby cannot fake. (The
 * centre itself is a legitimate vertex — a blind bore's floor is a fan — so
 * "nothing inside" is not the test.)
 */
function hasRingAt(geo, cx, cy, r) {
  const pos = geo.attributes.position;
  const tx = mm(cx);
  const ty = mm(cy);
  const want = mm(r);
  const tol = mm(0.4);
  const on = new Set();
  for (let i = 0; i < pos.count; i += 1) {
    const dx = pos.getX(i) - tx;
    const dy = pos.getY(i) - ty;
    if (Math.abs(Math.hypot(dx, dy) - want) < tol) on.add(`${dx.toFixed(6)},${dy.toFixed(6)}`);
  }
  return on.size >= 12;
}

// ─── The mirror itself, said once ───────────────────────────────────────────

test('F2 the convention is one fact, and it is published by panelPlacement', () => {
  const leaf = leaves(pair())[0];
  const pl = panelPlacement(leaf);
  assert.deepEqual(pl.u, [-1, 0, 0], 'CNC x runs LEFT in the room');
  assert.equal(pl.origin[0], leaf.box.x + leaf.box.w, '…from the leaf’s RIGHT edge');
  // Everything above is this one line read correctly. A DRAWER-FRONT is the
  // same board seen the same way, and takes the same frame.
  const drawer = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '02',
  }, P).panels.find((p) => p.part === 'DRAWER-FRONT');
  const dpl = panelPlacement(drawer);
  assert.deepEqual(dpl.u, [-1, 0, 0]);
  assert.equal(dpl.origin[0], drawer.box.x + drawer.box.w);
});

test('F2 the SCENE reads the handle back through that same mirror', () => {
  // The model hangs off `meta.handle`, which is in the cut frame — so the one
  // translation from the leaf's frame to the cabinet's has to be the mirror,
  // or the handle stands on the hinge stile in the room while the sheet says
  // the other one. There is exactly one such translation and it is named.
  const src = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');
  const at = src.indexOf('export function FrontHandle');
  assert.ok(at > 0);
  const block = src.slice(at, src.indexOf('export function ShelfSupports'));
  assert.match(block, /const sheetX = \(x\) => box\.x \+ box\.w - Number\(x\);/);
  assert.match(block, /const wx = sheetX\(spec\.x\);/);
  const code = block.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /box\.x \+ spec\.x/, 'the bottom-left reading is gone');
  assert.doesNotMatch(code, /box\.x \+ hx/, '…and so is the one the screws took');
  assert.doesNotMatch(code, /box\.x \+ midX/, '…and the rod’s');
});

test('F2 a HORIZONTAL handle is centred, so the mirror leaves it exactly where it was', () => {
  // The delta is named as "the handle's x moves to the opposite stile"; a
  // drawer front's handle is on the centre line, and `w/2` mirrors to itself.
  const r = computeCabinet({
    ...defaultParamsFor('BUDR', P), unit_num: '02', project_handle: BAR,
  }, P);
  for (const f of r.panels.filter((p) => p.part === 'DRAWER-FRONT')) {
    assert.equal(f.meta.handle.x, f.w / 2, 'centred on the width, both frames');
  }
  assert.equal(UNIT_TYPES.BUDR.drawerStyle, 'budr');
});
