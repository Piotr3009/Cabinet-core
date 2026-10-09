// ─── T75 · F14 · THE HOB UNIT ──────────────────────────────────────────────
//
// CLAUDE.md T75 F14: *"`BUDR` variants take `hob: true` (a library row "Hob
// drawer unit" for x2 and x3): the TOP front is a FIXED DUMMY (front material,
// no box, no runner, emitted as the blind blank is), the box under it keeps
// `profile.hob.clearanceMm = 60 // T75 proposed` below the worktop for the hob
// body; the worktop proposes the hob cut-out (F5). Prefix stays `DR`; the
// golden `golden-budr.json` is untouched because `hob` is absent on it."*
//
// Every cut-path delta hangs on `params.hob === true`. BUDR and BUDR4 are two
// of the six and carry no `hob`; the shared drawer loops run as they did.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const GATES = {
  hob: {
    what: 'a drawer unit under a hob (`params.hob === true`, written by BUDR_HOB / BUDR2_HOB, F14)',
    opens: (p) => p.hob === true,
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F14 · on a BUDR stack with `params.hob`, the top index is a fixed DUMMY: no box, no runner row, no '
      + 'front screw, cut as a FALSE-FRONT piece (role `false_front`, front material, outline only) the way F3\'s '
      + 'blank is; the box under it capped `hob.clearanceMm` below the carcass top; runners and rods counted '
      + 'without it; `false_front` joins the front-material and finish-exposed roles',
    gates: ['hob'],
  },
  'src/engine/types.js': {
    why: 'F14 · BUDR_HOB and BUDR2_HOB, BUDR and BUDR2 field by field with `hob: true` (prefix DR), and '
      + '`hob: true` spread into their defaults alone',
    gates: ['hob'],
  },
  'src/engine/profile.js': {
    why: 'F14 · `hob.clearanceMm` 60 (proposed) and its migrate line',
    gates: ['hob'],
  },
  'src/engine/library.js': {
    why: 'F14 · Base units "Hob drawer unit", 2x and 3x. The library, not a cut',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'F14 · FALSE-FRONT on the `false_front` row beside F3\'s blank. No fixture cuts one',
    gates: ['hob'],
  },
  'src/engine/elements.js': {
    why: 'F14 · the `false-front` kind: its label, its row and its lock. What a piece is called, not what it is cut',
    gates: [],
  },
  'src/engine/cnc/groups.js': {
    why: 'F14 · the dummy goes with the fronts on the CNC sheet, as the blank does. Which sheet, not the cut',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F14 · the comment naming `false_front` among the front-sheet roles',
    gates: [],
  },
};

export const LIVENESS = {
  hob: () => {
    const r = computeCabinet(kit('BUDR_HOB'), P);
    const dummy = r.panels.find((p) => p.role === 'false_front');
    const boxes = r.panels.filter((p) => /^D\d+-DNO$/.test(p.id)).length;
    const pairs = r.hardware.find((h) => h.role === 'runner_pairs')?.qty;
    return {
      live: Boolean(dummy) && boxes === 2 && pairs === 2,
      said: `BUDR_HOB cuts ${dummy ? `${dummy.id} ${dummy.part} ${dummy.w} x ${dummy.h}` : 'no dummy'} over ${boxes} boxes, ${pairs} runner pairs`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-budr-hob.json',
    F: 'F14',
    source: 'KIT_BUDR_FULL.lsp (x3); the top drawer\'s box, runner and screws taken off, its front a fixed rectangle',
    params: () => kit('BUDR_HOB'),
  },
];
