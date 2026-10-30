/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T85 F3 · THE COLUMN FOLLOWS THE RECESS (KIT_RECESS.lsp D29) ─────────────
//
// The owner, 30.10.2026, 20:17: *"jak przesuwam i mam recess lub komin to mi
// sie ladnie zmienia ksztalt elementow, to dziala super, ale jak mamy szuflady
// w recess to juz sie tak nie przesuwa, tylko przy przesunieciu calej szafy
// szuflady znikaja a zostaja dividery ktore sie robia do samej gory, nie
// powinno tak byc"*; 20:38: *"jesli wneka wychodzi poza szafe to zostaje jeden
// divider ... minimum ... i tyle, szuflady sa mniej glebokie do plytszej szafy
// a polka zostaje w ksztalcie litery L, proste prawda?"*; 20:45: *"nie, tutaj
// musi byc minimum 30 mm"*, *"znikaja z szufladami, bo to sa dividery do
// szuflad; tylko jak bedzie uzytkownik chcial to dolozy pozniej sam osobno
// dividery"*.
//
// PURE: the unit, the band the room asks of it where it now stands (the
// carcass frame, `recessExtensionFor`'s answer, or null) and the profile in;
// the plan of what the store does to the column out. The store
// (`followRecessColumn`) writes the plan in the move's own batch (one undo).
//
// Only the items `addRecessDrawers` made carry `meta.recessColumn === true`:
// its two dividers and its drawers. Everything else is the joiner's own and
// this road never moves it or removes it.
//
// THE WALLS (D29 a, b) and the drawers' bay are the engine's own
// (engine/extension.js recessColWalls, recessColZone: the LISP's
// recess-col-walls and recess-col-zone), and the 30 is the notch table's
// 'recess.minColumnSide': one law on one path.

import { recessColWalls, recessColZone } from '../engine/extension.js';
import { notchProfile } from '../engine/notch.js';

const SENTENCE_TAIL = 'Add drawers again where the cabinet stands.';

/** A number the item carries, or the fallback. */
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** The smallest bay beside a side in a recess column (the owner, 30.10, 20:45: "minimum 30 mm"). */
export function minColumnSideOf(profile) {
  return notchProfile(profile || {})['recess.minColumnSide'];
}

/** recess-col-walls (D29 a, b): the engine's own, re-exported under the plan's name. */
export const wallsOf = recessColWalls;

/** The usable depth of the plain carcass for a drawer box, as cabinet.js computes it (D27). */
export function carcassUsableDepth(unit, profile) {
  const p = unit?.params || {};
  const DR = profile.wardrobe.drawers;
  const D = num(p.depth);
  const G = num(p.board_t, profile.board.thickness);
  const frontT = Number(p.front_t) || profile.front.thickness;
  return D - G - DR.setback - frontT - DR.depthAllowance;
}

/** Does the carcass alone hold a drawer (D27: the ladder's first rung under its usable depth)? */
export function carcassHoldsDrawers(unit, profile) {
  const steps = profile.wardrobe.drawers.depthSteps || [];
  return steps.length > 0 && carcassUsableDepth(unit, profile) >= steps[0];
}

/** The engine's own refusal of the column that is not "the dividers do not stand" (D29 c), or null. */
function engineRefusal(result) {
  const said = (result?.warnings || []).find((w) => w.code === 'RECESS_DRAWERS_SHALLOW'
    && !/dividers do not stand/.test(String(w.message)));
  return said ? String(said.message) : null;
}

/** "W01: the recess left the cabinet; its 3 drawers and the two dividers that held them are gone. ..." */
export function leaveNotice(unit, drawerCount, dividerCount) {
  const who = unit?.params?.unit_num || 'This cabinet';
  const drawers = `${drawerCount} drawer${drawerCount === 1 ? '' : 's'}`;
  const held = dividerCount >= 2 ? ' and the two dividers that held them'
    : (dividerCount === 1 ? ' and the divider that held them' : '');
  const are = drawerCount === 1 && dividerCount === 0 ? 'is' : 'are';
  return `${who}: the recess left the cabinet; its ${drawers}${held} ${are} gone. ${SENTENCE_TAIL}`;
}

/**
 * The plan of the move for a unit's recess column.
 *
 * @param {object} unit     the unit as it now stands (its items in sections[0])
 * @param {object|null} band the band in the carcass frame ({ x0, x1, z0, d }) or null
 * @param {object} profile  the cabinet profile
 * @param {object} [result] the engine's result where it stands, if the caller has it (its refusals, its boards' w)
 * @param {object} [opts]   { wallsOf } a walls rule in place of the engine's (tests only)
 * @returns {{ walls, moves: Array<{id, x}>, remove: string[], add: Array<{x}>, zones: Array<{id, zone}>,
 *   drawersRemoved: boolean, notice: string|null } | null} null when the unit has no marked column.
 */
export function followPlan(unit, band, profile, result = null, opts = {}) {
  const items = unit?.params?.sections?.[0]?.items || [];
  const marked = items.filter((i) => i?.meta?.recessColumn === true);
  const drawers = marked.filter((i) => i.kind === 'drawer');
  // DECISION (T85 F3): a column whose drawers are gone is no column; its dividers are plain dividers now.
  if (!drawers.length) return null;
  const dividers = marked
    .filter((i) => i.kind === 'partition' && Number.isFinite(Number(i.x_mm)))
    .sort((a, b) => num(a.x_mm) - num(b.x_mm));
  const G = num(unit.params.board_t, profile.board.thickness);
  const W = num(unit.params.width);
  const step = profile.editor?.mmStep || 0.5;
  const snap = (x) => Math.round(x / step) * step;
  const wOf = (item) => Number(result?.panels?.find((p) => p.meta?.itemId === item.id)?.box?.w) || G;
  const plan = {
    walls: null, moves: [], remove: [], add: [], zones: [], drawersRemoved: false, notice: null,
  };

  // D29 c · THE BAND LEAVES THE CARCASS: no band over it, the band off the floor, or the engine's own refusal.
  const leaves = !band || !(num(band.x1) > num(band.x0)) || num(band.z0) > 0 || Boolean(engineRefusal(result));
  if (leaves) {
    // Held by the ladder: the drawers take the carcass's depth (the engine), the dividers stay as the column's
    // walls, full height, as any two-divider column stack. Not held: the drawers and their dividers go together.
    if (carcassHoldsDrawers(unit, profile)) return plan;
    plan.remove = [...drawers.map((i) => i.id), ...dividers.map((i) => i.id)];
    plan.drawersRemoved = true;
    plan.notice = leaveNotice(unit, drawers.length, dividers.length);
    return plan;
  }

  // D29 a, b · the walls where the band's edges now are.
  const classify = typeof opts.wallsOf === 'function' ? opts.wallsOf : recessColWalls;
  const walls = classify(W, G, num(band.x0), num(band.x1), minColumnSideOf(profile));
  plan.walls = walls;
  const [[lk], [rk]] = walls;

  // Which marked divider is which: two, the left and the right; one, by the side its drawers stand on (zone 1
  // with one divider is the column right of it, so it is the LEFT wall; zone 0, the RIGHT).
  let leftDiv = null;
  let rightDiv = null;
  if (dividers.length >= 2) {
    [leftDiv] = dividers;
    rightDiv = dividers[dividers.length - 1];
  } else if (dividers.length === 1) {
    const zone = num(drawers[0].zone, 1);
    if (zone >= 1) [leftDiv] = dividers;
    else [rightDiv] = dividers;
  }
  const want = {
    left: lk === 'DIVIDER' ? snap(num(band.x0)) : null,
    right: rk === 'DIVIDER' ? (div) => snap(num(band.x1) - (div ? wOf(div) : G)) : null,
  };
  const at = (div, x) => {
    if (Math.abs(num(div.x_mm) - x) > 0.25 || div.front_mm !== 0) plan.moves.push({ id: div.id, x });
  };
  // The left edge.
  if (want.left != null) {
    if (leftDiv) at(leftDiv, want.left);
    // DECISION (T85 F3): the edge is a divider's again and its marked divider is gone: it is put back, marked, at
    // the face, so the column moved back over the carcass stands as it was born (D28).
    else plan.add.push({ x: want.left, side: 'L' });
  } else if (leftDiv) {
    plan.remove.push(leftDiv.id);
  }
  // The right edge.
  if (want.right) {
    if (rightDiv) at(rightDiv, want.right(rightDiv));
    else plan.add.push({ x: want.right(null), side: 'R' });
  } else if (rightDiv) {
    plan.remove.push(rightDiv.id);
  }

  // The drawers' zone: the bay between the walls (recess-col-zone; with no divider the one bay, 0).
  const zone = recessColZone(walls) ?? 0;
  for (const d of drawers) {
    if (num(d.zone, -1) !== zone) plan.zones.push({ id: d.id, zone });
  }
  return plan;
}
