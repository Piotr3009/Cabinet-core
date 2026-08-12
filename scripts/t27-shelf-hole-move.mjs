#!/usr/bin/env node
// ─── F1's NAMED DELTA, entity by entity ─────────────────────────────────────
//
// CLAUDE.md F1.4: *"The partition+shelf probes move: holes leave BUL and appear
// in the partition. Name it, and state in `cnc-export-identity.md` that the
// leaving holes were wrong."*
//
// `scripts/cnc-fingerprint.mjs` reports the move as three ADDED scenarios,
// because a cabinet with an adjustable shelf inside a BAY is a case turn 26's
// probe set never built — which is also why F1's delta on everything that
// existed is zero. An addition is not evidence of a MOVE, so this prints the
// move itself: every ⌀7.5 shelf-pin hole of the three arrangements, by the
// panel it is bored in and at the height it is bored at.
//
// It is deliberately runnable against ANY checkout, exactly like its two
// neighbours, so the way to prove F1 is to run it on the turn-26 baseline and
// on the branch and diff the two outputs:
//
//     git worktree add /tmp/base <turn-26 commit>
//     node scripts/t27-shelf-hole-move.mjs > /tmp/head.txt
//     (cd /tmp/base && node scripts/t27-shelf-hole-move.mjs > /tmp/base.txt)
//     diff /tmp/base.txt /tmp/head.txt

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const LAYER = P.shelfHoles.layer;

const CASES = [
  {
    id: 'shelf-in-right-bay',
    note: 'the eye test’s own cabinet: one partition, the shelf between it and BUR',
    width: 900,
    items: [
      { id: 'p1', kind: 'partition', x_mm: 450 },
      { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
    ],
  },
  {
    id: 'shelf-in-left-bay',
    note: 'the mirror: the same cabinet with the shelf on the other side',
    width: 900,
    items: [
      { id: 'p1', kind: 'partition', x_mm: 450 },
      { id: 's1', kind: 'shelf', pos_mm: 400, zone: 0 },
    ],
  },
  {
    id: 'shelf-mid-bay-2-parts',
    note: 'two partitions, the shelf in the MIDDLE bay — partition/partition',
    width: 1200,
    items: [
      { id: 'p1', kind: 'partition', x_mm: 400 },
      { id: 'p2', kind: 'partition', x_mm: 800 },
      { id: 's1', kind: 'shelf', pos_mm: 400, zone: 1 },
    ],
  },
  {
    id: 'shelf-end-bay-2-parts',
    note: '…and the same cabinet with the shelf in the far bay',
    width: 1200,
    items: [
      { id: 'p1', kind: 'partition', x_mm: 400 },
      { id: 'p2', kind: 'partition', x_mm: 800 },
      { id: 's1', kind: 'shelf', pos_mm: 400, zone: 2 },
    ],
  },
  {
    id: 'plain-cabinet',
    note: 'the control: no partition at all — this row must never move',
    width: 600,
    items: [{ id: 's1', kind: 'shelf', pos_mm: 400 }],
  },
];

const rows = [];
for (const c of CASES) {
  const params = {
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: c.width,
    sections: [{ width_mm: c.width, items: c.items }],
  };
  const r = computeCabinet(params, P);
  const holes = r.drills.filter((d) => d.layer === LAYER);
  const by = new Map();
  for (const h of holes) {
    const list = by.get(h.panel) || [];
    list.push(`${h.x},${h.y}`);
    by.set(h.panel, list);
  }
  const panels = [...by.keys()].sort();
  rows.push(`# ${c.id} — ${c.note}`);
  rows.push(`${c.id}  panels  ${panels.join(' ') || '(none)'}`);
  for (const panel of panels) {
    rows.push(`${c.id}  ${panel}  ${by.get(panel).sort().join(' ')}`);
  }
  // …and the piece each hole is measured from, so the FRAME is in the record
  // too: a partition's origin is its own bottom edge, a side's is the floor.
  for (const panel of panels) {
    const p = r.panels.find((x) => x.id === panel);
    rows.push(`${c.id}  ${panel}  origin y=${p.box.y} depth=${p.box.d}`);
  }
  rows.push('');
}
process.stdout.write(`${rows.join('\n')}\n`);
