// ─── The other two views of the card (turn 7, CLAUDE.md F1) ───
//
// Turn 6 drew ONE view — the front elevation — as a style probe, and said the
// rest would follow from it. These are the rest: the carcass with the fronts
// taken off, and the plan.
//
// The reference is the same AutoLISP. `KIT_BUD_FULL` draws its TOP VIEW first
// (carcass rectangle, the two sides, the back, one shelf, the doors 3 mm off
// the front with a hinge on the hinge side, the unit number in the middle, the
// width dimension across the back), then two FRONT views — one showing the
// carcass and its hinges, one showing the doors. That is exactly the three this
// card carries; what changes is where the geometry comes from.
//
// It comes from the ENGINE, as it did in turn 6. The plan is the XZ projection
// of the same panel boxes the cut list is written from, so the top view cannot
// disagree with the front view about how deep a shelf is.
//
// Pure functions — no React, no store imports, no jsPDF.

import { dimensionEntities, frontDetail, isFront, panelStyle } from './frontElevation.js';
// Aliased on the way in — see the note at the top of primitives.js.
import {
  boundsOf, entCircle as circle, entLine as line, entRect as rect, entText as text,
} from './primitives.js';

// ─── Front, carcass only ────────────────────────────────────────────────────

/**
 * The unit with its fronts taken off.
 *
 * The one thing that changes from the complete elevation is the LINE: a shelf
 * behind a door is a hidden line, and a shelf in an open carcass is a shelf you
 * are looking straight at. So everything that survives the filter is drawn
 * SOLID — which is CLAUDE.md F1 in as many words, and is also just what a
 * drawing means.
 *
 * Runners come with it. The AutoLISP had none on any elevation (its only runner
 * layer is a CNC drilling layer), but a carcass-only view whose whole job is
 * "what is inside" and that leaves out the one piece of hardware screwed to the
 * inside is a view that stops short.
 *
 * @param {object} result   computeCabinet() output
 * @returns {{entities:Array, bounds:object, solid:object}}
 */
export function buildCarcassElevation(result, {
  unitNum, profile, unitNumberHeight = null, drawerBoxes = false, legSymbol = false,
} = {}) {
  const D = profile.drawings;
  const entities = [];
  const W = result.params.width;
  const H = result.params.height;
  const G = result.params.board_t;

  const panels = result.panels.filter((p) => p.box
    && p.role !== 'back'
    && p.role !== 'drawer_box'
    && !isFront(p)
    // An end panel and an infill are cut from the FRONT material and stand in
    // the plane of the doors; with the fronts off, they go with them.
    && p.role !== 'end_panel'
    && p.role !== 'infill');

  for (const p of panels) {
    const style = panelStyle(p, { width: W, height: H });
    // `solid: true` keeps the SHELVES layer's green — a shelf is still a shelf
    // — and overrides its dash. On the complete elevation that dash means "this
    // is behind a door"; here the door is off and you are looking straight at
    // it, so a dashed line would be saying something untrue.
    entities.push({
      ...rect(style.layer === 'DOORS' ? 'CARCASE' : style.layer, p.box.x, p.box.y, p.box.w, p.box.h),
      solid: true,
    });
  }

  entities.push(rect('CARCASE', 0, 0, W, H));

  // ── THE DRAWERS THIS VIEW IS FOR (turn 43, CLAUDE.md F3) ──────────────────
  if (drawerBoxes) entities.push(...drawerBoxRects(result));

  // ── runners, at the rows the engine drills them ──
  entities.push(...runnerRuns(result, { width: W, boardT: G }));

  // ── legs, from the engine's own layout ──
  const legs = result.assemblies.legs;
  const legHeight = result.assemblies.carcass.legHeight || 0;
  if (legs && legHeight > 0) {
    // ─── TURN 43 (CLAUDE.md F3): A LEG IS A LEG, NOT A BRICK ───────────────
    // The owner: *"nóżki to jakieś klocki zamiast ładnej nóżki."* An
    // adjustable leg is a top plate, a stem and a foot; the bare rectangle
    // said none of that and printed as a solid block under every cabinet. The
    // symbol is asked for by the wall's /2 sheet; the unit card keeps the
    // rectangle it has drawn since turn 7 (iron rule 4 pins the card).
    for (const leg of legs.positions) {
      entities.push(...(legSymbol
        ? legMark(leg, { width: legs.width, height: legHeight })
        : [rect('LEG_BLOCK', leg.x, -legHeight, legs.width, legHeight)]));
    }
  }

  entities.push(text('UNIT_NUMBER', W / 2, H / 2, String(unitNum ?? result.unitNum ?? ''),
    unitNumberHeight || D.unitNumberHeight));

  return { entities, bounds: boundsOf(entities), solid: boundsOf(entities) };
}

/**
 * The runner rows, drawn where they are screwed.
 *
 * `runner_carcass_side` is the engine's own answer to "which side carries them"
 * — a wardrobe with one drawer panel screws one runner to the panel and one to
 * the carcass, and the drawing follows that rather than assuming both.
 */
function runnerRuns(result, { width, boardT }) {
  const out = [];
  const dsum = result.drillSummary || {};
  const runLength = Math.min(width * 0.42, Math.max(boardT * 6, 120));
  const side = dsum.runner_carcass_side;
  const rows = dsum.runner_rows_carcass_y || [];

  for (const y of rows) {
    if (side === 'BUL' || side === 'both' || side == null) {
      out.push(line('RUNNERS', boardT, y, boardT + runLength, y));
    }
    if (side === 'BUR' || side === 'both' || side == null) {
      out.push(line('RUNNERS', width - boardT - runLength, y, width - boardT, y));
    }
  }
  // A wardrobe's own drawer panel carries the other half of every pair. Its
  // rows are measured from the panel's bottom, which is one board up.
  const dpRows = dsum.runner_rows_dp_y || [];
  const dp = result.panels.filter((p) => p.part === 'DRAWER-PANEL' && p.box);
  for (const panel of dp) {
    for (const rel of dpRows) {
      out.push(line('RUNNERS', panel.box.x, panel.box.y + rel, panel.box.x + runLength, panel.box.y + rel));
    }
  }
  return out;
}

/**
 * ─── TURN 43 (CLAUDE.md F3): /2 SHOWS THE DRAWERS IT IS FOR ─────────────────
 *
 * The owner, 20.08.2026: *"szuflady nie są narysowane."*
 *
 * MEASURED: `buildCarcassElevation` filtered `role !== 'drawer_box'`, so a
 * BUDR's FIFTEEN drawer-box panels produced ZERO entities and six runner lines
 * floated in an empty box. The carcass view's whole job is "what is inside",
 * and the thing inside a drawer unit is the drawers.
 *
 * One SOLID rect per BOX — the stack's x-extent by that box's own side height
 * at its own y — because with the fronts off you are looking straight into the
 * opening. It is drawn on SHELVES (a box is furniture inside the carcass, and
 * that is the ink this app gives it) and `solid: true` overrides the layer's
 * dash for the same reason a shelf is solid here: nothing is in front of it.
 *
 * THE GEOMETRY IS THE ENGINE'S. The boxes are grouped the way
 * `3d/hardware3d.js runnerInstances` already groups them — off the published
 * DRAWER-SIDE panels — and not one height is re-derived. A drawing that
 * disagreed with the cut list about a box side would be worse than no drawing.
 */
export function drawerBoxRects(result) {
  const sides = (result.panels || []).filter((p) => p.part === 'DRAWER-SIDE' && p.box);
  if (!sides.length) return [];
  // The stack's own x-extent: the outside faces of the pair, which is exactly
  // what the runner reads. A wardrobe whose drawer panel makes the two sides
  // asymmetric still comes out right, because both faces are measured.
  const left = Math.min(...sides.map((p) => p.box.x));
  const right = Math.max(...sides.map((p) => p.box.x + p.box.w));

  const boxes = new Map();
  for (const p of sides) {
    const key = p.meta?.drawer ?? p.id;
    // A box is one y and one height whichever of its two sides is asked; the
    // lower/taller of the pair is taken so an asymmetric pair still encloses
    // the real opening rather than half of it.
    const at = boxes.get(key);
    if (!at) { boxes.set(key, { y: p.box.y, top: p.box.y + p.box.h }); continue; }
    at.y = Math.min(at.y, p.box.y);
    at.top = Math.max(at.top, p.box.y + p.box.h);
  }

  return [...boxes.entries()]
    .sort((a, b) => a[1].y - b[1].y)
    .map(([, box]) => ({
      ...rect('SHELVES', left, box.y, right - left, box.top - box.y),
      solid: true,
      pen: 'VISIBLE',
    }));
}

/**
 * ─── TURN 43 (CLAUDE.md F3): THE LEG SYMBOL ─────────────────────────────────
 *
 * Three THIN lines, at the engine's own `legs.positions` and `legs.width`: the
 * top plate under the carcass bottom, the stem down the middle, and the foot on
 * the floor. That is what an adjustable leg IS, and it is what tells a fitter
 * he has a threaded foot to turn rather than a solid block to pack.
 */
export function legMark(leg, { width, height }) {
  const x0 = leg.x;
  const x1 = leg.x + width;
  const mid = (x0 + x1) / 2;
  return [
    line('LEG_BLOCK', x0, 0, x1, 0),                     // the top plate
    line('LEG_BLOCK', mid, 0, mid, -height),             // the stem
    line('LEG_BLOCK', x0, -height, x1, -height),         // the foot
  ];
}

// ─── Top view ───────────────────────────────────────────────────────────────

/**
 * Where a panel lands on the PLAN.
 *
 * The engine holds z = 0 at the wall and z = depth at the front face. The
 * AutoLISP's top view is the other way up — its y0 is the FRONT of the cabinet,
 * the back panel sits at y0 + depth, and the doors are drawn BELOW y0 at
 * `(- y0 doorGap gruboscDrzwi)`. That is the convention a joiner reads (the
 * face you stand at is nearest the bottom of the sheet), so the projection
 * flips: plan y = depth − z − d.
 *
 * A front at z = depth + gap therefore lands at y = −gap − thickness, exactly
 * where the LISP draws it, and the 3 mm CLAUDE.md asks to see is the gap
 * between the two rectangles rather than a number this file made up.
 */
export function planBox(box, depth) {
  return { x: box.x, y: depth - box.z - box.d, w: box.w, h: box.d };
}

/**
 * Build the plan of one unit.
 *
 * Looking DOWN: what you see is the top of the cabinet, so a piece is drawn
 * solid when its top face is up there with the top panel, and dashed when
 * something is over it. Fronts are always solid — they stand outside the
 * carcass and nothing covers them.
 */
export function buildTopView(result, {
  unitNum, frontType, profile, unitNumberHeight = null, shakerFrame = null,
} = {}) {
  const DR = profile.drawings;
  const entities = [];
  const W = result.params.width;
  const H = result.params.height;
  const D = result.params.depth;
  const style = frontType || profile.front.defaultType;
  const tol = 1;

  const seen = new Set();
  const push = (layer, box, hidden) => {
    // Several pieces at the same height coincide exactly in plan — the partition
    // under the top panel, three drawer fronts in one plane. Drawing each of
    // them puts three identical rectangles on one line, which prints heavier
    // than everything around it for no information at all.
    const key = `${layer}|${hidden ? 'h' : 's'}|${box.x.toFixed(3)}|${box.y.toFixed(3)}|${box.w.toFixed(3)}|${box.h.toFixed(3)}`;
    if (seen.has(key)) return;
    seen.add(key);
    entities.push({ ...rect(layer, box.x, box.y, box.w, box.h), hidden });
  };

  for (const p of result.panels) {
    if (!p.box || p.role === 'drawer_box') continue;
    const plan = planBox(p.box, D);
    // A front, an end panel and an infill all stand OUTSIDE the carcass in the
    // plane of the doors: nothing is over them, and they are magenta.
    if (isFront(p) || p.material_role === 'front' || p.role === 'end_panel' || p.role === 'infill') {
      push('DOORS', plan, false);
      continue;
    }
    push('CARCASE', plan, p.box.y + p.box.h < H - tol);
  }

  // The footprint, over everything — the same job drawFrontCarcaseOutline does
  // on the elevation.
  entities.push(rect('CARCASE', 0, 0, W, D));

  // ─── The wall, and the gap to it (turn 8, CLAUDE.md F3) ───
  // Every unit stands `room.wallBackClearance` off the wall behind it, and a
  // plan that draws the carcass hard against nothing does not say so. The line
  // IS the wall; the gap between it and the back of the carcass is the 10 mm,
  // at whatever scale the card came out at, and `topDimensions` puts a number
  // on it.
  const clearance = Math.max(0, Number(profile.room?.wallBackClearance) || 0);
  if (clearance > 0) {
    entities.push(line('CARCASE', -clearance, D + clearance, W + clearance, D + clearance));
  }

  // ── the face detail of a front, in section ──
  for (const p of result.panels) {
    if (!p.box || !isFront(p)) continue;
    const plan = planBox(p.box, D);
    // T43-F2: the PROJECT's own millimetres, threaded from the sheet. The plan
    // told the same lie the elevation did — `frontDetail` with no frame
    // resolves the profile default, whatever the job was quoted at.
    entities.push(...frontDetail(plan, p.meta?.frontType || style, profile, shakerFrame));
  }

  // ── hinges, on the side the door is hung from (LISP drawHinge) ──
  entities.push(...planHinges(result, profile));

  // ── the rail, if this unit has one: a tube seen end-on ──
  const rail = result.assemblies.rail;
  if (rail) {
    const r = profile.hardware.rail.diameter / 2;
    entities.push(circle('LEG_BLOCK', (rail.x1 + rail.x2) / 2, D - rail.z, r));
  }

  entities.push(text('UNIT_NUMBER', W / 2, D / 2, String(unitNum ?? result.unitNum ?? ''),
    unitNumberHeight || DR.unitNumberHeight));

  return { entities, bounds: boundsOf(entities), solid: { x: 0, y: 0, w: W, h: D } };
}

/**
 * A hinge on the plan, drawn to catalogue size from `profile.hardware.hinge`.
 *
 * The AutoLISP carries a traced outline of a real Blum hinge — seventy lines
 * and thirty arcs of it, twice, once mirrored. What that block SAYS is: a cup
 * bored into the door, a body standing off its back, an arm reaching across to
 * a plate on the carcass side. This draws that, to the catalogue millimetres in
 * the profile, and stays one function instead of two mirrored copies — the side
 * is a sign, not a second drawing.
 *
 * One per door, not one per hinge: in plan the three hinges of a door stack on
 * exactly the same spot.
 */
function planHinges(result, profile) {
  const out = [];
  const HW = profile.hardware.hinge;
  const cups = profile.hinges.cups;
  const D = result.params.depth;
  const fronts = result.panels.filter((p) => p.part === 'FRONT' && p.box);

  for (const p of fronts) {
    const plan = planBox(p.box, D);
    const hingeRight = p.meta?.hinge === 'R';
    const dir = hingeRight ? -1 : 1;
    const edgeX = hingeRight ? plan.x + plan.w : plan.x;
    const cupX = edgeX + dir * cups.xFromHingeEdge;
    // The door's back face — where the cup is bored from, and where everything
    // behind the door starts.
    const backY = plan.y + plan.h;

    // The cup: a ⌀35 bore, seen from above as the width of the bore across the
    // door and its depth into it.
    out.push(rect('HINGES', cupX - HW.cupDiameter / 2, backY - HW.cupDepth, HW.cupDiameter, HW.cupDepth));
    // The body and the arm, reaching back to the carcass side.
    out.push(rect('HINGES', cupX - HW.armWidth / 2, backY, HW.armWidth, HW.armLength));
    // The mounting plate, on the side panel.
    const plateX = hingeRight ? edgeX - HW.plateThickness : edgeX;
    out.push(rect('HINGES', plateX, backY + HW.armLength - HW.plateLength, HW.plateThickness, HW.plateLength));
  }
  return out;
}

// ─── Shared: the caption under a view ───────────────────────────────────────

export function viewLabel(profile, x, y, caption) {
  return text('VIEW_TITLE', x, y, caption, profile.drawings.unitCard.viewLabelHeight);
}

export { dimensionEntities };
