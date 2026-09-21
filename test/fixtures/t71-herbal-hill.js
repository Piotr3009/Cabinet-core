// ─── T71 · THE PROOF KITCHEN: 3-7 HERBAL HILL, 1ST FLOOR ────────────────────
//
// The owner put Skylon Joinery's own AutoCAD set for this job on the table
// (Rev A, 08.02.2026, six A3 sheets) and asked for the same set out of Cabinet
// Core. So the sheets are proved on THIS kitchen, read off those sheets:
//
//   base   01 02 03  BUD 520 · 04 BUDR 520 · 05 SINK 1040 · 06 D/W 600 ·
//          07 FRIDGE 600 (2000 high)
//   wall   08 09 10 11  WUD 520 · 12 WUD 1040 · 13 WUD 600, all hung at 1380
//   run    starts 25 off wall D; 75 corner infill before wall B; 4420 wall to
//          wall; ceiling 2400 (assumed; the set does not say)
//   worktop over 01 to 06, from the design layer's own record
//
// Pure data and one builder, no React, no store: the same shape `t43-kitchen`
// hands the wall-set tests.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { worktopsFor } from '../../src/engine/worktop.js';

export const HH_ROOM = {
  height: 2400,
  corners: [{ x: 0, y: 0 }, { x: 4420, y: 0 }, { x: 4420, y: 3200 }, { x: 0, y: 3200 }],
  openings: [{ id: 'door-1', kind: 'door', wall: 1, x_mm: 700, width: 900, height: 2040, sill: 0 }],
};

export const HH_PROJECT = {
  name: '3-7 Herbal Hill, 1st floor', number: '032/2026', client: 'AP&W',
  titleBlock: {
    address: '3-7 Herbal Hill, 1st floor', drawnBy: 'PT', checkedBy: '', status: 'B', rev: 'A', date: '08.02.2026',
  },
};

const HANDLE = { type: 'bar', centres: 128 };

const mk = (profile) => (id, type, over, pos) => ({
  id,
  type,
  params: { ...defaultParamsFor(type, profile), project_handle: HANDLE, ...over },
  position: { wall: 0, x_mm: 0, rotation_deg: 0, ...pos },
});

export function hhUnits(profile) {
  const u = mk(profile);
  const base = [
    ['01', 'BUD', 520, { shelves: 1, doors: { count: 1, hinge: 'L' } }],
    ['02', 'BUD', 520, { shelves: 1, doors: { count: 1, hinge: 'L' } }],
    ['03', 'BUD', 520, { shelves: 1, doors: { count: 1, hinge: 'L' } }],
    ['04', 'BUDR', 520, {}],
    ['05', 'SINK', 1040, { shelves: 1, doors: { count: 2, hinge: 'L' } }],
    ['06', 'DW_PANEL', 600, {}],
    ['07', 'FRIDGE', 600, { height: 2000 }],
  ];
  const wall = [
    ['08', 'WUD', 520, { doors: { count: 1, hinge: 'L' } }],
    ['09', 'WUD', 520, { doors: { count: 1, hinge: 'L' } }],
    ['10', 'WUD', 520, { doors: { count: 1, hinge: 'L' } }],
    ['11', 'WUD', 520, { doors: { count: 1, hinge: 'L' } }],
    ['12', 'WUD', 1040, { doors: { count: 2, hinge: 'L' } }],
    ['13', 'WUD', 600, { doors: { count: 1, hinge: 'R' } }],
  ];
  const out = [];
  let x = 25;
  for (const [num, type, w, over] of base) {
    out.push(u(`hh-${num}`, type, { unit_num: num, width: w, plinth: true, ...over }, { x_mm: x }));
    x += w;
  }
  x = 25;
  for (const [num, type, w, over] of wall) {
    out.push(u(`hh-${num}`, type, { unit_num: num, width: w, height: 720, mount_height: 1380, shelves: 2, ...over }, { x_mm: x }));
    x += w;
  }
  return out;
}

export function hhEntries(profile) {
  return hhUnits(profile).map((unit) => ({ unit, result: computeCabinet({ ...unit.params }, profile) }));
}

/** The design layer's worktop over the six base units, resolved to geometry. */
export function hhWorktops(profile) {
  const units = hhUnits(profile);
  const ids = units.filter((x) => ['01', '02', '03', '04', '05', '06'].includes(x.params.unit_num)).map((x) => x.id);
  return worktopsFor({ records: [{ id: 'wt-1', unitIds: ids, decor: null }], units, profile });
}
