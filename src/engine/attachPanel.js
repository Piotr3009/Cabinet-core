/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT-FIX 25.10.2026 · THE FREE PANEL, STUCK TO A SURFACE OF HIS CHOICE ──
//
// The owner, 25.10.2026: *"mamy teraz free standing panel ale on tylko sie
// przykleja do sciany i tyle, nic z tym nie moge wiecej zrobic"*, *"zebym ja
// mogl go przykleic do tej powierzchni jakiej chce"*, *"chce tez oblozyc boxy
// lub kominy tez prosze z odsunieciem od nich"*, *"ten panel musi byc w miare
// mozliwe do ustawienia gdzie bede chcial, naprzyklad bede chcial polozyc na
// szafkach jako daszek albo oblozyc komin w kacie"*. And: the panel does NOT
// travel with what it was stuck to (*"3 nie jedzie"*); the gap defaults to 0.
//
// A free panel (T74 F13, `freePanel.js`) is a unit that belongs to a wall: its
// place is `position.wall` + `x_mm` along it, its height `mount_height`, its
// distance off the wall `inset_back_mm` (over the wall clearance), its stance
// `panel_facing` (along / across the wall) and `panel_tilt_deg` (0 upright,
// 90 flat). Every surface in the room that a board can lie against is
// therefore ONE set of those numbers, read off the surface in the surface's
// own wall frame:
//
//   wall          along, upright, flush to the wall line (back inset 0)
//   floor         flat, its underside on the floor plus the gap
//   ceiling       flat, its top face under the ceiling less the gap
//   unit left     across, upright, its right face on the unit's left span
//                 (end panels included) less the gap, its back on the unit's
//                 back line, standing on the floor when the unit does
//   unit right    the mirror of left
//   unit top      flat, lying on the unit's top plus the gap, its left edge
//                 on the unit's left span, its back on the unit's back line
//   obstacle      a chimney drawn on a wall, or a box typed in the plan, read
//                 in the frame of the wall it stands against: front (along,
//                 upright, in front of its face plus the gap), left and right
//                 (across, upright, beside it less the gap, back to the wall)
//
// This file is the arithmetic only: what the targets are, and what numbers a
// target asks of the panel. It writes nothing; the store's `attachFreePanel`
// applies the numbers through the one move every drag takes (`moveUnit`), so
// the room still refuses in words and the clamp still has the last say on x.
// `freePanelPatch` turns the stance into the box the board fills, as every
// typed edit of a panel does, so the two can never disagree.

import { boxCorners, wallName } from './room.js';
import {
  backStandoff, maxDepthOnWall, spanInWallFrame, unitSpan,
} from './collision.js';
import { unitBase, unitTop, wallGapOf } from './runs.js';
import { getUnitType, isFreePanel } from './types.js';
import { freePanelOf, freePanelPatch } from './freePanel.js';
import { unitName } from './naming.js';
import { formatMm } from './format.js';

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : fallback);
const round4 = (v) => Math.round(v * 1e4) / 1e4;

/** The faces a unit offers a panel, in the order the list shows them. */
export const UNIT_FACES = Object.freeze(['left', 'right', 'top']);
/** The faces an obstacle (a chimney, a box) offers. */
export const OBSTACLE_FACES = Object.freeze(['front', 'left', 'right']);

const FACE_LABEL = Object.freeze({
  left: 'left side', right: 'right side', top: 'top', front: 'front',
});

/** The label a unit shows in the list: its number, else its id. */
function unitLabel(unit) {
  return `Unit ${unitName(unit)}`;
}

/**
 * An obstacle in the frame of the wall it stands against: the wall record and
 * its span there, or null when it reaches no wall from behind. A chimney is
 * drawn on a wall and carries it (`wallPlanObstacles` keeps no wall index on
 * the footprint, so the wall is found the same way a box's is: the wall whose
 * line the obstacle's back is nearest to, measured in that wall's own frame).
 */
export function obstacleOnWall(obstacle, walls) {
  const corners = boxCorners(obstacle);
  let best = null;
  for (const wall of walls || []) {
    if (!wall || wall.island) continue;
    const span = spanInWallFrame(corners, wall);
    // Behind the wall line entirely, or not along this wall at all: not it.
    if (span.far <= 1e-6 || span.right <= 0 || span.left >= wall.width) continue;
    const off = Math.abs(span.near);
    if (!best || off < best.off - 1e-9) best = { wall, span, off };
  }
  return best ? { wall: best.wall, span: best.span } : null;
}

/** A readable name for an obstacle record: the plan's label, else its kind. */
function obstacleLabel(obstacle, walls, wallIndex) {
  const kind = obstacle?.kind === 'chimney' ? 'Chimney' : 'Box';
  return `${kind} on ${wallName(walls, wallIndex)}`;
}

/**
 * Every surface this panel can be stuck to, each with a stable `key` and a
 * label the list shows. Islands are not here: an island's faces are walls to
 * the room already (`roomWalls`), and the panel takes them as a wall.
 *
 * @param {{panel:object, units:object[], walls:object[], obstacles:object[]}} args
 * @returns {Array<{key:string,label:string,kind:string,id?:string,face?:string,wall?:number}>}
 */
export function attachTargets({ panel, units = [], walls = [], obstacles = [] }) {
  const out = [
    { key: 'wall', label: 'Wall (flush)', kind: 'wall' },
    { key: 'floor', label: 'Floor', kind: 'floor' },
    { key: 'ceiling', label: 'Ceiling', kind: 'ceiling' },
  ];
  for (const u of units) {
    if (!u || u.id === panel?.id) continue;
    if (!u.position || u.position.wall == null || !walls[u.position.wall]) continue;
    for (const face of UNIT_FACES) {
      out.push({
        key: `unit:${u.id}:${face}`, label: `${unitLabel(u)}, ${FACE_LABEL[face]}`, kind: 'unit', id: u.id, face,
      });
    }
  }
  for (const o of obstacles) {
    if (!o || o.blocks === false) continue;
    // An island's core is in the plan's obstacle list too (T75 F9); its faces
    // are walls already, so it is not offered twice.
    if (Array.isArray(o.corners) && o.corners.length === 4 && /^island/.test(String(o.label || ''))) continue;
    const on = obstacleOnWall(o, walls);
    if (!on) continue;
    const label = obstacleLabel(o, walls, on.wall.index);
    for (const face of OBSTACLE_FACES) {
      out.push({
        key: `obstacle:${o.id}:${face}`, label: `${label}, ${FACE_LABEL[face]}`, kind: 'obstacle', id: String(o.id), face, wall: on.wall.index,
      });
    }
  }
  return out;
}

/**
 * The obstacles that reach PAST a line `standoff` out from `wall`: what is in
 * the way of a panel whose back stands there. A chimney a panel has been stuck
 * in front of ends before the panel's back and is not in its way; the box
 * beside it that reaches further out still is. For `moveUnit`'s clamp.
 */
export function obstaclesBeyond(obstacles, wall, standoff) {
  const line = num(standoff, 0);
  return (obstacles || []).filter((o) => {
    if (!o || !wall) return false;
    const span = spanInWallFrame(boxCorners(o), wall);
    return span.far > line + 1e-6;
  });
}

/** The target a key names, from the list the same arguments make. */
export function attachTargetByKey(key, args) {
  return attachTargets(args).find((t) => t.key === key) || null;
}

/**
 * ─── T82 F17 · HOW FAR OFF ITS WALL A FREE PANEL'S BACK MAY STAND ─────────
 *
 * The owner, 25.10.2026 13:36: *"jak mam frontowy komin to nie moge
 * powiekszyc panela bo mi wchodzi w sciane"*. A panel stuck to a chimney 350
 * deep stands 340 over the clearance, and `editor.maxInset` (300) is a
 * CABINET's number: any later inset pulled the panel 40 into the chimney. A
 * free panel's back inset is capped by the ROOM: the far wall, less the box
 * the panel fills, less the clearance it keeps off its own wall. The one law:
 * `setUnitInsets`, the right panel's Back field, the drag off the wall (F16)
 * and `attachPlan` below all read it. Infinity where no far wall is met.
 *
 * @param {{panel:object, wall:object, walls:object[], profile:object}} args
 * @returns {number}
 */
export function freePanelInsetMax({
  panel, wall, walls = [], profile,
}) {
  if (!panel || !wall) return Infinity;
  const reach = maxDepthOnWall({
    wall, walls, x: num(panel.position?.x_mm, 0), width: num(panel.params?.width, 0),
  });
  if (!(reach > 0)) return Infinity;
  return Math.max(0, round4(reach - wallGapOf(panel, profile) - num(panel.params?.depth, 0)));
}

/**
 * THE NUMBERS A SURFACE ASKS OF THE PANEL: `{ wall, x, params, label }`, or
 * `{ error }` in words. `params` is the whole patch for the unit's params (the
 * board's stance and the box it fills, through `freePanelPatch`, plus
 * `mount_height` and `inset_back_mm`); `x` is the left edge of the panel's
 * box along `wall`, for `moveUnit` to clamp and write.
 *
 * @param {object} args
 * @param {object} args.panel      the FREE_PANEL unit
 * @param {object} args.target     one of `attachTargets`
 * @param {number} [args.gap]      air between the panel and the surface, mm, 0 is flush
 * @param {object[]} args.units
 * @param {object[]} args.walls    `roomWalls(room)`
 * @param {object[]} args.obstacles `planObstaclesOf`-shaped records (corners or x/y/w/d)
 * @param {object} args.profile
 * @param {number} args.roomHeight
 */
export function attachPlan(args) {
  const plan = surfacePlan(args);
  if (plan.error) return plan;
  // T82 F17 · the room refuses in words: a surface that would stand the panel
  // past the far wall (its back inset over `freePanelInsetMax`, read at the
  // place and in the stance the surface asks) is refused, never squashed.
  const { panel, walls = [], profile } = args;
  const at = {
    ...panel,
    position: { ...panel.position, wall: plan.wall, x_mm: plan.x },
    params: { ...panel.params, ...plan.params },
  };
  const max = freePanelInsetMax({
    panel: at, wall: walls[plan.wall], walls, profile,
  });
  const inset = num(plan.params?.inset_back_mm, 0);
  if (inset > max + 1e-6) {
    return {
      error: `${plan.label} would stand the panel ${formatMm(inset)} mm off the wall; `
        + `the room leaves it ${formatMm(max)} mm.`,
    };
  }
  return plan;
}

/** `attachPlan`'s numbers, before the room has its say on how far out they reach. */
function surfacePlan({
  panel, target, gap = 0, units = [], walls = [], obstacles = [], profile, roomHeight,
}) {
  if (!panel || !isFreePanel(panel.type)) return { error: 'Only a free-standing panel can be attached.' };
  if (!target) return { error: 'Choose a surface to attach the panel to.' };
  const g = Math.max(0, num(gap, 0));
  const board = freePanelOf(panel.params, profile);
  const t = board.thickness;
  const clearance = wallGapOf(panel, profile);
  // How far off the wall line the panel's back has to be for its back face to
  // stand at `standoff`: the inset over the clearance every unit keeps.
  const insetFor = (standoff) => round4(Math.max(0, standoff - clearance));
  const stance = (facing, tilt) => freePanelPatch(panel.params, { panel_facing: facing, panel_tilt_deg: tilt }, profile);
  const ownWall = num(panel.position?.wall, 0);
  const ownX = num(panel.position?.x_mm, 0);
  const ownMount = num(panel.params?.mount_height, 0);
  const ownInset = num(panel.params?.inset_back_mm, 0);

  if (target.kind === 'wall') {
    const upright = stance('along', 0);
    // Back from the ceiling (where it may just have lain flat): its top no
    // higher than the room, its bottom no lower than the floor.
    const h = num(roomHeight, 0);
    const mount = h > 0 ? Math.max(0, Math.min(ownMount, round4(h - num(upright.height, 0)))) : ownMount;
    return {
      wall: ownWall, x: ownX, label: target.label,
      params: { ...upright, mount_height: mount, inset_back_mm: insetFor(g) },
    };
  }
  if (target.kind === 'floor') {
    return {
      wall: ownWall, x: ownX, label: target.label,
      params: { ...stance(board.facing, 90), mount_height: round4(g), inset_back_mm: ownInset },
    };
  }
  if (target.kind === 'ceiling') {
    const h = num(roomHeight, 0);
    if (!(h > 0)) return { error: 'The room has no height to hang the panel under.' };
    const mount = round4(h - t - g);
    if (mount < 0) return { error: 'The panel does not fit under the ceiling with this gap.' };
    return {
      wall: ownWall, x: ownX, label: target.label,
      params: { ...stance(board.facing, 90), mount_height: mount, inset_back_mm: ownInset },
    };
  }
  if (target.kind === 'unit') {
    const host = units.find((u) => u.id === target.id);
    if (!host) return { error: 'That unit is no longer in the room.' };
    const wall = walls[num(host.position?.wall, 0)];
    if (!wall) return { error: 'That unit stands on no wall.' };
    const span = unitSpan(host);
    const back = backStandoff(host, profile);
    const inset = insetFor(back);
    if (target.face === 'top') {
      return {
        wall: wall.index, x: round4(span.left), label: target.label,
        params: { ...stance('along', 90), mount_height: round4(unitTop(host, profile) + g), inset_back_mm: inset },
      };
    }
    // Beside it: on the floor when the unit stands on the floor, at its base
    // when it hangs, so a cladding panel reaches the floor as a joiner's does.
    const mount = getUnitType(host.type).mount === 'wall' ? round4(unitBase(host, profile)) : 0;
    const x = target.face === 'left' ? span.left - g - t : span.right + g;
    return {
      wall: wall.index, x: round4(x), label: target.label,
      params: { ...stance('across', 0), mount_height: mount, inset_back_mm: inset },
    };
  }
  if (target.kind === 'obstacle') {
    const obstacle = obstacles.find((o) => String(o?.id) === String(target.id));
    if (!obstacle) return { error: 'That chimney or box is no longer in the plan.' };
    const on = obstacleOnWall(obstacle, walls);
    if (!on) return { error: 'That chimney or box stands against no wall.' };
    const { wall, span } = on;
    // A chimney or a box stands floor to ceiling, so its cladding starts on
    // the floor; the panel's own height is typed after, if he wants it up.
    if (target.face === 'front') {
      return {
        wall: wall.index, x: round4(span.left), label: target.label,
        params: { ...stance('along', 0), mount_height: 0, inset_back_mm: insetFor(span.far + g) },
      };
    }
    const x = target.face === 'left' ? span.left - g - t : span.right + g;
    return {
      wall: wall.index, x: round4(x), label: target.label,
      params: { ...stance('across', 0), mount_height: 0, inset_back_mm: insetFor(Math.max(0, span.near)) },
    };
  }
  return { error: 'That surface is not one a panel can be attached to.' };
}
