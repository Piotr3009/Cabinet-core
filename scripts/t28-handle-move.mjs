#!/usr/bin/env node
// ─── F2's NAMED DELTA, hole by hole ─────────────────────────────────────────
//
// CLAUDE.md F2: *"Named delta: every DXF carrying a door handle moves that
// handle's x to the opposite stile (and nothing else moves)."*
//
// `scripts/cnc-fingerprint.mjs` reports the move as four changed rows per
// `+handles-*` scenario, which says THAT something moved and not WHAT. This
// prints the move itself, and it prints the half that must NOT move beside it:
//
//   SHEET  every ⌀35 cup and every handle hole of a leaf, in the part's own
//          CNC frame — the numbers a per-panel DXF is written in
//   ROOM   the same holes mapped through `engine/joinery.js panelPlacement`,
//          which is the leaf's INSIDE MIRROR — the numbers a joiner measures
//          on the door
//
// The claim is that the SHEET's handle moves to the other stile and the ROOM's
// does not move at all: the two readings were BOTH wrong before this turn and
// they cancelled, which is why the picture looked right while the file did not.
//
// Runnable against ANY checkout, exactly like its neighbours:
//
//     git worktree add /tmp/base <turn-27 commit>
//     node scripts/t28-handle-move.mjs > /tmp/head.txt
//     (cd /tmp/base && node scripts/t28-handle-move.mjs > /tmp/base.txt)
//     diff /tmp/base.txt /tmp/head.txt

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { panelPlacement } from '../src/engine/joinery.js';

const HANDLES = P.handles.layer;
const CUPS = P.hinges.cups.layer;

const CASES = [
  { type: 'BUD', width: 600, hinge: 'L', note: 'one door, hinged left' },
  { type: 'BUD', width: 600, hinge: 'R', note: 'one door, hinged right' },
  { type: 'BUD', width: 900, hinge: 'L', note: 'a pair, both hands at once' },
  { type: 'BUDTALL', width: 600, hinge: 'L', note: 'a tall door: mid height' },
  { type: 'WUD', width: 600, hinge: 'L', note: 'a wall door: 50 from the bottom' },
  { type: 'BUDR', width: 600, hinge: 'L', note: 'drawer fronts: horizontal, centred' },
];
const HANDLE_TYPES = [
  { id: 'knob', spec: { type: 'knob' } },
  { id: 'bar-160', spec: { type: 'bar', centres: 160 } },
];

const fixed = (v) => (Math.round(Number(v) * 100) / 100).toFixed(2);

for (const c of CASES) {
  for (const h of HANDLE_TYPES) {
    const r = computeCabinet({
      ...defaultParamsFor(c.type, P),
      unit_num: '01',
      width: c.width,
      hinge: c.hinge,
      doors: true,
      project_handle: h.spec,
    }, P);
    const label = `${c.type}/${c.width}/${c.hinge}/${h.id}`;
    const fronts = r.panels.filter((p) => p.role === 'front');
    for (const leaf of fronts) {
      const pl = panelPlacement(leaf);
      const world = (x) => pl.origin[0] + pl.u[0] * x;
      const rows = r.drills
        .filter((d) => d.panel === leaf.id && (d.layer === HANDLES || d.layer === CUPS))
        .sort((a, b) => (a.layer < b.layer ? -1 : 1) || a.y - b.y || a.x - b.x);
      for (const d of rows) {
        // The leaf's own two edges in the room, so a reader does not have to
        // know where the cabinet stands to see which stile a hole is on.
        const fromLeft = world(d.x) - leaf.box.x;
        const fromRight = (leaf.box.x + leaf.w) - world(d.x);
        process.stdout.write(
          `${label}  ${leaf.id}  ${d.layer}  SHEET x=${fixed(d.x)} y=${fixed(d.y)}  `
          + `ROOM left+${fixed(fromLeft)} right+${fixed(fromRight)}  `
          + `hinge=${leaf.meta?.hinge ?? '-'}\n`,
        );
      }
    }
  }
}
