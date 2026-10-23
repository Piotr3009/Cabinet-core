// ─── The production card (turn 7, CLAUDE.md F1) ───
//
// One cabinet, three views, one sheet, and the numbers a joiner measures with a
// tape. This is the thing turn 6's style probe existed to make possible: the
// line quality was calibrated first, on one view, so that this turn could put
// the set together without re-deciding what a drawing looks like.
//
// The arrangement is the AutoLISP's, folded onto a page. `KIT_BUD_FULL` stacks
// its top view and its two front views up one column of model space because
// model space has no edges. A sheet does, so the two front views stand side by
// side and the plan sits UNDER the first of them, aligned to it — which is what
// third-angle projection means, and what makes it possible to read a depth off
// the plan and a height off the elevation without moving your eye twice.
//
// What gets dimensioned is a decision, and it is the one CLAUDE.md states:
// "the numbers the workshop measures with a tape — not every screw". So:
// overall W × H × D, shelf positions from the bottom, each drawer front's own
// height, the runner rows, the toe kick, and the front gap as a note rather
// than four arrows across three millimetres.
//
// Output is the same shape buildFrontElevation returns — entities in DRAWING
// millimetres, Y up — so `layoutSheet` lays a card out exactly as it laid the
// elevation out, and knows nothing about there being three of anything.
//
// Pure functions — no React, no store imports, no jsPDF.

import {
  baselineDimensions, chainDimensions, dimensionEntities,
} from './frontElevation.js';
import {
  boundsOf, entLine as line, entText as text, moveEntities as translate,
} from './primitives.js';
import { viewLabel } from './views.js';
import { projectRun } from './projector.js';
import { wallGapOf } from '../runs.js';
import { formatMm } from '../format.js';

/**
 * How the three views sit on the paper.
 *
 * 'projection' is the engineering arrangement: the plan under the elevation it
 * is a projection OF, so a depth and a height are read off one vertical line.
 * 'row' stands all three side by side — worse to read, better on a landscape
 * sheet, and for a short wide cabinet the difference is a whole scale step
 * (1:10 instead of 1:20 for a 600 mm base unit on A3).
 *
 * The card is built in both and the LARGER drawing wins, exactly as turn 6's
 * sheet already turns the paper when that draws the cabinet bigger. A tie goes
 * to projection, because when the scale is the same the correct arrangement is
 * free.
 */
export const CARD_ARRANGEMENTS = ['projection', 'row'];

/**
 * @param {object} result   computeCabinet() output
 * @param {object} args
 *   unitNum      the green number in the middle of every view
 *   frontType    'S' | 'H' | 'F'
 *   arrangement  see CARD_ARRANGEMENTS
 *   profile
 * @returns {{entities:Array, bounds:object, views:object}}
 */
export function buildUnitCard(result, {
  unitNum, frontType, profile, arrangement = 'projection', shakerFrame = null, unit = null,
} = {}) {
  const C = profile.drawings.unitCard;
  const num = String(unitNum ?? result.unitNum ?? '');

  // ── the three views, each drawn by the projector for this one cabinet ──
  // T81 F9: the card draws its own unit as the room draws it (*"zalezy mi
  // zebys rysowal w pdf 1 do 1 co mamy na cabinet core"*): the fronts, the
  // carcass with the fronts off, and the plan, in the unit's own frame (x
  // across the width, y up from the carcass base). The run's parts this unit
  // owns (its plinth, its frame) are CLIPPED to the unit and the profile's
  // margin either side: a 600 card drew a 1920 frame (the audit of 22.10,
  // finding 2). The project's shaker frame reaches the fronts (T43 F2).
  const W = Number(result.params.width) || 0;
  const H = Number(result.params.height) || 0;
  const D = Number(result.params.depth) || 0;
  const member = {
    unit: unit || { id: `card-${num}`, type: result.type, params: result.params, position: { wall: 0, x_mm: 0, rotation_deg: 0 } },
    result,
    x: 0,
    base: 0,
    top: H,
    width: W,
  };
  const group = { wall: 0, members: [member], from: 0, to: W, top: H };
  const margin = Number(profile.drawings.card?.runMargin) || 0;
  const drawn = (view, mode) => projectRun(group, {
    view, mode, profile, clipX: [-margin, W + margin], frontTypeOf: () => frontType, shakerFrame,
  }).entities;
  const number = (x, y) => text('UNIT_NUMBER', x, y, num, C.unitNumberHeight);

  const front = { entities: [...drawn('front', 'fronts'), number(W / 2, H / 2)] };
  front.entities.push(...frontDimensions(result, profile));

  const carcass = { entities: [...drawn('front', 'no-fronts'), number(W / 2, H / 2)] };
  carcass.entities.push(...carcassDimensions(result, profile));

  // The plan as the card has always set it out: the carcass front at 0, its
  // back at the depth, the wall beyond it (the projector's plan runs from the
  // wall out into the room).
  const gap = wallGapOf(member.unit, profile);
  const back = gap + D;
  const top = { entities: [...drawn('top-of-card', 'fronts').map((e) => fromTheFront(e, back)), number(W / 2, D / 2)] };
  // The wall behind it, the gap's own width beyond the back (turn 8, F3): the
  // building, as the sheets draw it.
  if (gap > 0) top.entities.push({ ...line('BUILDING', -gap, D + gap, W + gap, D + gap), pen: 'THIN' });
  top.entities.push(...topDimensions(result, profile));

  // ── captions, under each view and under its dimensions ──
  const caption = (view, label) => {
    const b = boundsOf(view.entities);
    return viewLabel(profile, b.x + b.w / 2, b.y - C.viewLabelGap - C.viewLabelHeight / 2, label);
  };
  front.entities.push(caption(front, 'FRONT'));
  // ASCII only in anything that reaches a PDF: jsPDF's built-in faces are
  // WinAnsi, and a card is printed far more often than it is read on a screen.
  carcass.entities.push(caption(carcass, 'CARCASS (no fronts)'));
  top.entities.push(caption(top, 'TOP'));

  // ── placed ──
  const fb = boundsOf(front.entities);
  const cb = boundsOf(carcass.entities);
  const tb = boundsOf(top.entities);

  const entities = [];
  entities.push(...translate(front.entities, -fb.x, -fb.y));

  if (arrangement === 'row') {
    // Three views on one line, standing on the same base. Nothing is projected
    // off anything, and the card says so by keeping the same captions.
    entities.push(...translate(carcass.entities, fb.w + C.viewGap - cb.x, -cb.y));
    entities.push(...translate(top.entities, fb.w + C.viewGap + cb.w + C.viewGap - tb.x, -tb.y));
  } else {
    // The front elevation is the datum: the carcass view stands beside it on
    // the same base line, and the plan sits UNDER the front view.
    entities.push(...translate(carcass.entities, fb.w + C.viewGap - cb.x, -cb.y));
    // Aligned to the CABINET rather than to the drawing: both views are shifted
    // by the same dx, so the left-hand side of the carcass in plan sits under
    // the left-hand side of the carcass in elevation. Aligning the two BOUNDS
    // instead would let a run of drawer dimensions down the left of the
    // elevation push the plan sideways, and the projection — which is the
    // entire reason the plan is under it — would be a coincidence rather than
    // a fact.
    entities.push(...translate(top.entities, -fb.x, -(tb.y + tb.h) - C.viewGap));
  }

  // ── the note that carries what an arrow cannot ──
  const notes = frontGapNote(result, profile);
  if (notes) {
    const box = boundsOf(entities);
    entities.push(text('VIEW_TITLE', box.x, box.y - C.noteHeight * 1.6, notes, C.noteHeight, 'left'));
  }
  // T80 F8 · the joiner's filler over a framed base run, on the run owner's
  // card: a NOTE, never a board (the owner, 21.10.2026: *"6 informacja"*).
  const filler = (result.panels || []).find((p) => p.role === 'frame' && p.meta?.inframe?.fillerNote);
  if (filler) {
    const box = boundsOf(entities);
    entities.push(text('VIEW_TITLE', box.x, box.y - C.noteHeight * 1.6, `NOTE: ${filler.meta.inframe.fillerNote}`, C.noteHeight, 'left'));
  }

  return {
    entities,
    bounds: boundsOf(entities),
    unitNum: num,
    arrangement,
    views: { front: fb, carcass: cb, top: tb },
  };
}

/** A plan entity turned from the wall's frame (y off the wall) to the card's (y from the carcass front). */
function fromTheFront(e, back) {
  if (e.kind === 'line') return { ...e, y1: back - e.y1, y2: back - e.y2 };
  if (e.kind === 'rect') return { ...e, y: back - (e.y + e.h) };
  if (e.kind === 'circle') return { ...e, cy: back - e.cy };
  if (e.kind === 'text') return { ...e, y: back - e.y };
  if (e.kind === 'poly') {
    const flip = (ring) => ring.map(([x, y]) => [x, back - y]);
    return { ...e, pts: flip(e.pts || []), ...(e.holes ? { holes: e.holes.map(flip) } : {}) };
  }
  return e;
}

// ─── What each view says ────────────────────────────────────────────────────

/**
 * The complete front: the overall width under it, the overall height beside it,
 * and — where the unit has one — the drawer stack broken down front by front.
 *
 * A drawer front's height is the one number a drawer unit is built from: the
 * carcass follows from it, the box follows from it, the runner row follows from
 * it. It is chained rather than measured from the floor, because a chain is
 * what the bench adds up.
 */
function frontDimensions(result, profile) {
  const C = profile.drawings.unitCard;
  const T = C.textHeight;
  const out = [];
  const W = result.params.width;
  const H = result.params.height;
  const legHeight = result.assemblies.carcass.legHeight || 0;
  const foot = -legHeight;

  // Overall width, under the whole solid; overall height, at the right.
  out.push(...dimensionEntities({
    from: [0, foot], to: [W, foot], direction: 'h', offset: C.dimFirst, value: W, textHeight: T,
  }));
  out.push(...dimensionEntities({
    from: [W, foot], to: [W, H], direction: 'v', offset: C.dimFirst, value: H + legHeight, textHeight: T,
  }));
  // The carcass on its own, when it stands on something: a joiner setting out a
  // run needs the toe kick and the box separately.
  if (legHeight > 0) {
    out.push(...dimensionEntities({
      from: [W, foot], to: [W, 0], direction: 'v', offset: C.dimFirst + C.dimStep, value: legHeight,
      textHeight: T,
    }));
    out.push(...dimensionEntities({
      from: [W, 0], to: [W, H], direction: 'v', offset: C.dimFirst + C.dimStep, value: H, textHeight: T,
    }));
  }

  // The drawer fronts, chained up the left-hand side.
  //
  // The drawer's NUMBER goes on the drawer, not in the dimension: "D1 197" is
  // six characters where the dimension line is 197 mm long, and at any scale
  // those two facts are in the same ratio — the label never fits. Written
  // inside its own front it is unambiguous and the dimension stays a
  // dimension. D1 is the bottom drawer, which is the engine's own numbering
  // and the cut list's.
  const fronts = (result.assemblies.drawerFronts || []).filter((f) => f && Number.isFinite(f.y));
  for (const f of [...fronts].sort((a, b) => a.y - b.y)) {
    out.push(...dimensionEntities({
      from: [0, f.y], to: [0, f.y + f.h], direction: 'v', offset: -C.dimFirst, value: f.h, textHeight: T,
    }));
    out.push(text('UNIT_NUMBER', W * 0.14, f.y + f.h / 2, `D${f.index}`, Math.min(T, f.h * 0.5)));
  }
  return out;
}

/**
 * The carcass: shelf positions from the bottom, and the runner rows.
 *
 * "From the bottom" is not a style choice. A shelf chained off the shelf below
 * it inherits every error above it, and the man drilling the holes measures
 * from the base panel — so that is the datum, and every shelf gets its own run
 * stepping out from it.
 */
function carcassDimensions(result, profile) {
  const C = profile.drawings.unitCard;
  const T = C.textHeight;
  const out = [];
  const W = result.params.width;
  const H = result.params.height;

  const shelves = (result.assemblies.shelves || []).map((s) => s.y).filter(Number.isFinite);
  if (shelves.length) {
    out.push(...baselineDimensions({
      datum: 0,
      values: shelves,
      at: 0,
      direction: 'v',
      first: C.dimFirst,
      step: C.dimStep,
      sign: -1,
      textHeight: T,
    }));
  }

  // The drawer partition — the piece that closes a drawer zone — is measured
  // like a shelf, because on the bench it is one.
  const zone = result.assemblies.drawerZone;
  if (zone && Number.isFinite(zone.top)) {
    out.push(...baselineDimensions({
      datum: 0,
      values: [zone.top],
      at: 0,
      direction: 'v',
      first: C.dimFirst + C.dimStep * shelves.length,
      step: C.dimStep,
      sign: -1,
      textHeight: T,
    }));
  }

  // Runner rows, down the right: a chain from the base, because a runner row is
  // set out from the one under it when a drawer stack is assembled.
  const rows = (result.drillSummary?.runner_rows_carcass_y || []).filter(Number.isFinite);
  if (rows.length) {
    out.push(...baselineDimensions({
      datum: 0, values: rows, at: W, direction: 'v', first: C.dimFirst, step: C.dimStep,
      sign: 1, textHeight: T,
    }));
  }

  // …and the overall height at the far right, so this view can be read alone.
  out.push(...dimensionEntities({
    from: [W, 0],
    to: [W, H],
    direction: 'v',
    offset: C.dimFirst + C.dimStep * Math.max(rows.length, 1),
    value: H,
    textHeight: T,
  }));
  return out;
}

/** The plan: overall depth beside it, and the width across the back. */
function topDimensions(result, profile) {
  const C = profile.drawings.unitCard;
  const T = C.textHeight;
  const out = [];
  const W = result.params.width;
  const depth = result.params.depth;
  const frontT = result.params.front_t;
  const gap = profile.doors.gap;
  const hasFront = result.panels.some((p) => p.box && p.material_role === 'front' && p.box.z >= depth);

  out.push(...dimensionEntities({
    from: [W, 0], to: [W, depth], direction: 'v', offset: C.dimFirst, value: depth, textHeight: T,
  }));
  out.push(...dimensionEntities({
    from: [0, depth], to: [W, depth], direction: 'h', offset: -C.dimFirst, value: W, textHeight: T,
  }));
  // Carcass + the door standing off it: the number that decides where the run
  // finishes against a wall.
  if (hasFront) {
    out.push(...dimensionEntities({
      from: [W, -gap - frontT],
      to: [W, depth],
      direction: 'v',
      offset: C.dimFirst + C.dimStep,
      value: depth + gap + frontT,
      textHeight: T,
    }));
  }
  // ─── The gap to the wall (turn 8, CLAUDE.md F3) ───
  // Ten millimetres at 1:10 is a millimetre on paper, so the LINE alone would
  // read as a drawing error rather than as a decision. The number is what makes
  // it a decision — and it is the number the fitter needs when he is deciding
  // where to drill the wall.
  const clearance = Math.max(0, Number(profile.room?.wallBackClearance) || 0);
  if (clearance > 0) {
    out.push(...dimensionEntities({
      from: [0, depth],
      to: [0, depth + clearance],
      direction: 'v',
      offset: -C.dimFirst,
      value: clearance,
      textHeight: T,
    }));
  }
  return out;
}

/**
 * The front gap, said once.
 *
 * At 1:10 the 3 mm between two doors is a third of a millimetre on paper; an
 * arrow across it is longer than the thing it measures and reads as a mistake.
 * A workshop already knows what its overlay clearance is — what it needs is to
 * be told which one this drawing was set out with.
 */
function frontGapNote(result, profile) {
  if (!result.panels.some((p) => p.material_role === 'front')) return null;
  const parts = [
    `Front gap ${formatMm(profile.doors.gap)} mm`,
    `front ${formatMm(result.params.front_t)} mm`,
    `board ${formatMm(result.params.board_t)} mm`,
  ];
  return parts.join(' · ');
}

/**
 * The chain helper is exported for the same reason everything else in this
 * folder is: a test can call it without building a cabinet first.
 */
export { chainDimensions };
