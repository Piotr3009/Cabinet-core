/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T86B F4 · THE CHEST AS AN ISLAND, ITS PLAN (CLAUDE.md T86B laws 4, 5, 6) ──
//
// The owner, 30.10.2026 (22:52): *"chest powinna byc mozliwosc odsuniecia od
// sciany ale nie na zasadzie back move tylko powinna byc mozliwosc na srodku
// pokoju cos jak wyspa ale przez grab i move; i dodanie panela z tylu lub
// polaczenie szuflad z 2 stron"*; (22:56) *"nie koniecznie nawis, nawis jako
// opcja prosze; 1 - oba"*.
//
// A chest of drawers (and nothing else tonight) made an island of its own
// footprint: the chest on face A, and on the opposite face either the house's
// sprayed back panel (variant 'panel', the FREE PANEL kit, gap 0) or a second
// chest back to back (variant 'double'). One worktop over the whole island,
// the footprint plus the overhang all round; the overhang is a number,
// default none (`profile.autoParts.worktop.islandOverhangMm`, 0: the worktop's
// numbers live in one namespace since T30, the T75 note in profile.js).
//
// The opposite face is named C in CLAUDE.md; the room's island ring names its
// faces A, E1, B, E2 (engine/room.js ISLAND_FACES), so C is the ring's B:
// `CHEST_ISLAND_BACK_FACE`.
//
// Pure: numbers in, numbers out. No React, no store, no three.js.

import { UNIT_TYPE_ORDER } from '../engine/types.js';

/** The chest-of-drawers kits that may stand in the room tonight (law 4: the chests and nothing else). */
export const CHEST_ISLAND_KITS = Object.freeze(UNIT_TYPE_ORDER.filter((id) => /^WARDROBE_CHEST\d+$/.test(id)));

/** May this kit be made a chest island? */
export function isChestIslandKit(type) {
  return CHEST_ISLAND_KITS.includes(String(type || ''));
}

/** The two variants, the owner's *"oba"*: a sprayed back panel, or two chests back to back. */
const CHEST_ISLAND_VARIANTS = Object.freeze(['panel', 'double']);

/** The island ring's face the chest stands on, and the one behind it (CLAUDE.md's C). */
const CHEST_ISLAND_FRONT_FACE = 'A';
export const CHEST_ISLAND_BACK_FACE = 'B';

const finite = (v) => Number.isFinite(Number(v)) && v !== null && v !== '';

/** The overhang the profile states for a chest island's (and a desk's) slab: 0, none, by default (law 6). */
export function islandOverhangOf(profile) {
  const v = profile?.autoParts?.worktop?.islandOverhangMm;
  return finite(v) ? Math.max(0, Number(v)) : 0;
}

/**
 * The island a chest makes.
 *
 * @param {object} args
 *   chest       { width, depth, height } of the chest on face A
 *   variant     'panel' (the sprayed back panel on the back face) | 'double' (a second chest back to back)
 *   panelT      the back panel's thickness (the project's board)
 *   profile     the cabinet profile (the overhang's default)
 *   overhangMm  the island's own overhang, when it has one; else the profile's
 * @returns {{ island: {w:number, d:number},
 *   faces: { A: {kind:'unit', width:number, depth:number, height:number},
 *            C: {kind:'unit', width:number, depth:number, height:number}
 *             | {kind:'panel', width:number, height:number, thickness:number} },
 *   worktop: {w:number, d:number, overhang:number} }}
 */
export function chestIslandPlan({
  chest, variant = 'panel', panelT: backT = 18, profile = null, overhangMm = null,
} = {}) {
  const width = Math.max(0, Number(chest?.width) || 0);
  const depth = Math.max(0, Number(chest?.depth) || 0);
  const height = Math.max(0, Number(chest?.height) || 0);
  const double = variant === 'double';
  const t = Math.max(0, Number(backT) || 0);
  const overhang = finite(overhangMm) ? Math.max(0, Number(overhangMm)) : islandOverhangOf(profile);
  const island = { w: width, d: depth + (double ? depth : t) };
  return {
    island,
    faces: {
      A: { kind: 'unit', width, depth, height },
      C: double ? { kind: 'unit', width, depth, height } : { kind: 'panel', width, height, thickness: t },
    },
    worktop: { w: island.w + 2 * overhang, d: island.d + 2 * overhang, overhang },
  };
}

/**
 * Law 5 · A FREE-STANDING PLINTH IS SET BACK ALL ROUND: which sides of a chest on a chest island's face are in the
 * room. Both ends are free (the island is the chest's own footprint); the back is in the room behind a panel (its
 * plinth set back behind the panel's face, `backFaceMm` the panel's thickness) and meets the other chest in the
 * double variant (not exposed). The engine's `params.plinth_free` (engine/cabinet.js), or null for a unit that is
 * not a chest on a chest island's face.
 *
 * @param {object} args  { type, face, variant, panelT }
 * @returns {null | {left:boolean, right:boolean, back:boolean, backFaceMm:number}}
 */
export function chestIslandPlinthSides({ type, face, variant, panelT: backT = 18 } = {}) {
  if (!isChestIslandKit(type)) return null;
  if (face !== CHEST_ISLAND_FRONT_FACE && !(variant === 'double' && face === CHEST_ISLAND_BACK_FACE)) return null;
  const double = variant === 'double';
  return {
    left: true,
    right: true,
    back: !double,
    backFaceMm: double ? 0 : Math.max(0, Number(backT) || 0),
  };
}
