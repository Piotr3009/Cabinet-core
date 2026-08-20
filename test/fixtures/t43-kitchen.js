// ─── THE T43 PROOF KITCHEN (CLAUDE.md F6) ───────────────────────────────────
//
// The T42 lesson, made law: *"a wall-drawing probe on a project with no shelf,
// no drawer and no shaker proves paper exists, not that it says anything."*
// T42-F0 proved the wall PDF's BYTES on three bare carcasses; every drawing
// complaint the owner made on 20.08.2026 is about CONTENT, and the content was
// never in the proof.
//
// So this is the project every F1–F5 assertion runs against, and it is a
// KITCHEN:
//
//   Wall A   BUD 600 with 2 shelves
//            BUDR 500 (its default drawer stack) TOUCHING it
//            WUD 600 with 1 shelf, hung at 1500 over the BUD
//   Wall B   one BUD, and one unit TURNED AWAY (the census sentence)
//   design   frontType 'S', shakerFrame 85, handles on
//   room     2400 high
//
// The e2e probe (`verify/t43/f6-wall-set-probe.mjs`) builds the SAME project
// through the store's own actions with real pointer input. This is its mirror
// in node, so the entity-level assertions and the on-glass ones are made about
// one kitchen and not two.
//
// Pure data and one builder — no React, no store.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';

/** 2400 high, and a room big enough that no cabinet is against a corner. */
export const T43_ROOM = {
  height: 2400,
  corners: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 3000 }, { x: 0, y: 3000 }],
};

/**
 * `frontType 'S'` and the frame the owner set — 85, which is neither the
 * profile default (60) nor the legacy pin (70), so a drawing that answers 85
 * can only have asked the PROJECT.
 */
export const T43_DESIGN = { fronts: { style: 'S', shakerFrame: 85 } };

/**
 * A bar handle on every front that takes one. `project_handle` is the param
 * `engine/cabinet.js` reads (T25-F4: the project says which handle, one front
 * may say otherwise); the store writes it from the design layer.
 */
const HANDLE = { type: 'bar', centres: 128 };

const mk = (profile) => (id, type, over, pos) => ({
  id,
  type,
  params: {
    ...defaultParamsFor(type, profile), project_handle: HANDLE, ...over,
  },
  position: { wall: 0, x_mm: 0, rotation_deg: 0, ...pos },
});

/** The units, in the order the probe adds them. */
export function t43Units(profile) {
  const u = mk(profile);
  return [
    // ── Wall A ──
    u('t43-a1', 'BUD', { unit_num: '01', width: 600, plinth: true, shelves: 2, doors: { count: 1, hinge: 'L' } },
      { wall: 0, x_mm: 0 }),
    // …touching it: 600 wide at 0, so the next carcass starts at 600.
    u('t43-a2', 'BUDR', { unit_num: '02', width: 500, plinth: true }, { wall: 0, x_mm: 600 }),
    u('t43-a3', 'WUD', { unit_num: '03', width: 600, mount_height: 1500, shelves: 1, doors: { count: 1, hinge: 'R' } },
      { wall: 0, x_mm: 0 }),
    // ── Wall B ──
    u('t43-b1', 'BUD', { unit_num: '04', width: 600, plinth: true, doors: { count: 1, hinge: 'L' } },
      { wall: 1, x_mm: 0 }),
    // …and one TURNED AWAY, which no elevation can draw and the census names.
    u('t43-b2', 'BUD', { unit_num: '05', width: 500, plinth: true, doors: { count: 1, hinge: 'R' } },
      { wall: 1, x_mm: 900, rotation_deg: 90 }),
  ];
}

/** The store's own `allResults()` shape. */
export function t43Entries(profile) {
  return t43Units(profile).map((unit) => ({ unit, result: computeCabinet({ ...unit.params }, profile) }));
}

/** The project record the sheets are titled from. */
export const T43_PROJECT = {
  name: 'T43 kitchen',
  client: 'Mr Anderson',
  number: 'J-1043',
  rev: 'A',
  design: T43_DESIGN,
  room: T43_ROOM,
};
