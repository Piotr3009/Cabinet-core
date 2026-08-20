// ─── Front elevation (turn 6, CLAUDE.md F7) ───
//
// A STYLE PROBE, and CLAUDE.md is explicit about it: one view, done properly,
// so turn 7 has a calibrated look to build the rest on. Quality of line before
// number of views.
//
// The reference is Piotr's own AutoLISP — `drawFrontCarcase`, `drawFrontShelves`,
// `drawFrontDoorSingle`, `drawDoorSwingLines`, `drawLegPair` and the layer
// colours from `createViewLayers`. Where the LISP has a number, that number is
// used; where the LISP has a convention, the convention is followed.
//
// The one thing that is NOT copied is how the geometry is arrived at. The LISP
// re-derives every rectangle from the cabinet's parameters, a second time, in
// drawing code. Here the elevation is the ENGINE's own panel boxes projected on
// XY — a front elevation IS the xy projection — so a drawing cannot disagree
// with the cut list about where a shelf is. That is the same rule the 3D view
// has followed since turn 1.
//
// Output is a list of primitives in DRAWING MILLIMETRES with Y UP, exactly as
// AutoCAD holds them. The sheet lays them out and the renderer flips Y.
//
// Pure functions — no React, no store imports, no jsPDF.

import { formatMm } from '../format.js';
// Aliased on the way in: the exported names are long on purpose (see
// primitives.js), and drawing code reads better with short ones.
import {
  boundsOf, entCircle as circle, entLine as line, entRect as rect, entText as text, moveEntities,
} from './primitives.js';
import { shakerFits, shakerFrameMm } from '../shaker.js';

/**
 * Which layer a panel is drawn on, and whether it is a hidden line.
 *
 * Decided on the ROLE, like everything else in this engine since BACKLOG #35 —
 * a kit that adds a part nobody thought of gets a sensible answer for free.
 */
export function panelStyle(panel, { width, height }) {
  if (panel.material_role === 'front') return { layer: 'DOORS', hidden: false };
  if (panel.role === 'end_panel' || panel.role === 'infill') return { layer: 'DOORS', hidden: false };
  if (panel.role === 'plinth') return { layer: 'CARCASE', hidden: false };

  // Everything a front stands in front of is a HIDDEN line, and what decides
  // that is GEOMETRY rather than a list of part names: a piece is part of the
  // carcass SHELL — the thing whose edges are the outline of the unit — when it
  // reaches one of the four sides. Everything else is inside, behind a door,
  // and dashed.
  //
  // A list would have been shorter and would have been wrong. The drawer panel
  // and its fillers carry role 'side', exactly as the carcass sides do, and the
  // first version of this drew them as solid black bars across the middle of
  // the wardrobe. The rule below gets them right, and gets the sink's holders
  // and the fridge's back rails right too, without ever naming any of them.
  const t = 1;
  const touchesEdge = panel.box.x <= t
    || panel.box.x + panel.box.w >= width - t
    || panel.box.y <= t
    || panel.box.y + panel.box.h >= height - t;
  if (touchesEdge) return { layer: 'CARCASE', hidden: false };
  return { layer: 'SHELVES', hidden: true };
}

/**
 * Which panels the elevation draws at all.
 *
 * The insides of a drawer box are not on it: the AutoLISP front view does not
 * draw them either, and five nested dashed rectangles per drawer is a drawing
 * nobody can read. The drawer FRONTS are the face of that unit and they are
 * drawn, so nothing is lost that a joiner looks for here.
 */
function isDrawn(panel) {
  if (!panel.box) return false;
  if (panel.role === 'back') return false;         // behind everything, full face
  if (panel.role === 'drawer_box') return false;
  return true;
}

/**
 * ─── TURN 43 (CLAUDE.md F1): /1 IS FRONTS, AND NOTHING THAT HIDES BEHIND THEM
 *
 * The owner, 20.08.2026, on the first real print of the wall set: *"nadal
 * pokazuje fronty z carcasami, nie pokazuje jak ja chciałem, czyli fronty same
 * bez kresek."*
 *
 * MEASURED, and it is `isDrawn` above together with `panelStyle`: every panel
 * that does not touch an edge goes to SHELVES as a dashed hidden line, so on a
 * real kitchen the fronts sheet is full of green dashes — his "kreski". His
 * standard (the Anderson set) is plain: **fronts, end panels, infills, the
 * plinth line, the unit silhouette, handles, swings, unit numbers.** Nothing
 * else.
 *
 * So the fronts sheet asks a DIFFERENT question of a panel, and it is a
 * whitelist rather than a restyle: the entities are not drawn at all, which is
 * what makes "ZERO dashed geometry on /1" a fact about the list rather than a
 * fact about a stroke.
 *
 * Deliberately no `material_role === 'front'` clause: CLAUDE.md names the four
 * and says *"and no other panel"*. Every FRONT and DRAWER-FRONT this engine
 * cuts carries `part` (measured on all six configs), so nothing a joiner looks
 * for on /1 is lost by asking the part rather than the material.
 */
export function isFrontsSheetPanel(panel) {
  if (!panel?.box) return false;
  if (isFront(panel)) return true;
  return panel.role === 'end_panel' || panel.role === 'infill' || panel.role === 'plinth';
}

/** Is this piece a FRONT — a door or a drawer front? */
export function isFront(panel) {
  return panel.part === 'FRONT' || panel.part === 'DRAWER-FRONT';
}

/**
 * The opening direction, drawn EXACTLY as `drawDoorSwingLines` draws it: two
 * lines from the middle of the HINGE side out to the two far corners, so the
 * apex sits on the hinges and the door reads as opening away from it.
 */
export function doorSwing(box, hinge) {
  const x1 = box.x;
  const x2 = box.x + box.w;
  const y1 = box.y;
  const y2 = box.y + box.h;
  const midY = (y1 + y2) / 2;
  const apexX = hinge === 'R' ? x2 : x1;
  const farX = hinge === 'R' ? x1 : x2;
  return [
    { ...line('DOOR_SWING', apexX, midY, farX, y2), meta: 'door-swing' },
    { ...line('DOOR_SWING', apexX, midY, farX, y1), meta: 'door-swing' },
  ];
}

/**
 * The face detail of a front: shaker frame, J-groove, or nothing at all.
 *
 * ─── TURN 25 (CLAUDE.md F3): THE DRAWING FOLLOWS THE CUT ───────────────────
 * The frame was `profile.front.types.S.frameWidth` read straight, with a
 * `w > off × 2.2` heuristic of its own for whether it fitted. That is exactly
 * how a picture and a cut part come to disagree about the same door — the
 * heuristic left a 10 mm panel on a 230 mm front and the machine would have
 * refused it. `engine/shaker.js` is the one law now, and this asks it.
 */
export function frontDetail(box, frontType, profile, frame = null) {
  if (frontType === 'S') {
    const off = frame == null ? shakerFrameMm(null, profile) : Number(frame);
    if (shakerFits({ w: box.w, h: box.h, frame: off }, profile)) {
      return [rect('DOORS', box.x + off, box.y + off, box.w - off * 2, box.h - off * 2)];
    }
    return [];
  }
  if (frontType === 'H') {
    const g = profile.front.types.H.grooveDepth;       // LISP jGroove = 30
    return [line('DOORS', box.x, box.y + box.h - g, box.x + box.w, box.y + box.h - g)];
  }
  return [];
}

/**
 * An architectural dimension, in the style turn 5 settled on for the canvas
 * (BACKLOG #34): a thin line between two extension lines, an oblique tick
 * across each end instead of a filled arrowhead, and the value in the middle.
 *
 * The SIGN of `offset` picks the side, and the two directions read the way a
 * draughtsman means them: a horizontal dimension with a positive offset hangs
 * BELOW what it measures (that is where an elevation's width goes), a vertical
 * one with a positive offset stands to the RIGHT. Negative puts each on the
 * other side — which is how a card gets shelf positions down the left and
 * runner rows down the right without two copies of this function.
 *
 * @param {object} args
 *   from, to      the two points being measured, in drawing mm
 *   direction     'h' | 'v'
 *   offset        how far off the measured face the dimension line sits
 *   value         the number, already a number (formatted here, once)
 *   label         an override for the text — a value that is not a plain
 *                 millimetre reading ("3 gap", "D1 200")
 */
export function dimensionEntities({ from, to, direction, offset, value, textHeight, label = null }) {
  const out = [];
  const tick = textHeight * 0.9;
  const gap = textHeight * 0.4;
  const extend = textHeight * 0.7;
  const amount = Math.abs(offset);
  const caption = label ?? formatMm(value);
  // Where the number goes. A draughtsman writes it in the middle of the
  // dimension line when it fits there, and OUTSIDE the near tick when it does
  // not — a 56 mm gap cannot hold the characters "56" at this text height, and
  // a number printed across its own arrows is a number nobody can read. The
  // 0.55 is the average advance of a proportional face as a fraction of its
  // height; nothing in the engine may know about a real font.
  const span = Math.abs(direction === 'h' ? to[0] - from[0] : to[1] - from[1]);
  const needed = String(caption).length * textHeight * 0.55;
  const shift = needed > span ? (span + needed) / 2 + tick * 0.5 : 0;

  if (direction === 'h') {
    const dir = offset >= 0 ? -1 : 1;                 // positive = below
    const y = from[1] + dir * amount;
    // Extension lines, starting clear of the face as a draughtsman leaves them.
    out.push(line('DIMENSIONS', from[0], from[1] + dir * gap, from[0], y + dir * extend));
    out.push(line('DIMENSIONS', to[0], to[1] + dir * gap, to[0], y + dir * extend));
    out.push(line('DIMENSIONS', from[0], y, to[0], y));
    for (const x of [from[0], to[0]]) {
      out.push(line('DIMENSIONS', x - tick / 2, y - tick / 2, x + tick / 2, y + tick / 2));
    }
    out.push(text(
      'DIMENSIONS',
      (from[0] + to[0]) / 2 + shift * Math.sign(to[0] - from[0] || 1),
      y - dir * textHeight * 0.45,
      caption,
      textHeight,
    ));
    return out;
  }

  const dir = offset >= 0 ? 1 : -1;                   // positive = to the right
  const x = from[0] + dir * amount;
  out.push(line('DIMENSIONS', from[0] + dir * gap, from[1], x + dir * extend, from[1]));
  out.push(line('DIMENSIONS', to[0] + dir * gap, to[1], x + dir * extend, to[1]));
  out.push(line('DIMENSIONS', x, from[1], x, to[1]));
  for (const y of [from[1], to[1]]) {
    out.push(line('DIMENSIONS', x - tick / 2, y - tick / 2, x + tick / 2, y + tick / 2));
  }
  out.push({
    ...text(
      'DIMENSIONS',
      x,
      (from[1] + to[1]) / 2 + shift * Math.sign(to[1] - from[1] || 1),
      caption,
      textHeight,
    ),
    rotate: -90,
  });
  return out;
}

/**
 * A stack of dimensions all measured from ONE datum — the way a workshop reads
 * shelf positions: every one of them "from the bottom", not chained off its
 * neighbour, because a chain accumulates the error of every step above it.
 *
 * Each run steps further out so they do not draw on top of one another.
 *
 * @param {object} args
 *   datum      the reference coordinate (the value they are all measured from)
 *   values     the coordinates being measured, in drawing mm
 *   at         the fixed coordinate of the run (x for 'v', y for 'h')
 *   direction  'h' | 'v'
 *   first      offset of the innermost run; `step` is added per further run
 *   sign       +1 or −1 — which side of `at` the runs hang on
 */
export function baselineDimensions({
  datum, values, at, direction, first, step, sign = 1, textHeight, labels = null,
}) {
  const out = [];
  const ordered = [...values]
    .map((v, i) => ({ v, i }))
    .filter((e) => Number.isFinite(e.v) && Math.abs(e.v - datum) > 1e-6)
    .sort((a, b) => Math.abs(a.v - datum) - Math.abs(b.v - datum));

  ordered.forEach((entry, run) => {
    const offset = sign * (first + step * run);
    const from = direction === 'v' ? [at, datum] : [datum, at];
    const to = direction === 'v' ? [at, entry.v] : [entry.v, at];
    out.push(...dimensionEntities({
      from, to, direction, offset, value: Math.abs(entry.v - datum), textHeight,
      label: labels ? labels[entry.i] ?? null : null,
    }));
  });
  return out;
}

/**
 * Consecutive dimensions on ONE line — a chain. The right tool for a drawer
 * stack, where what the bench measures is each front's own height and the sum
 * is the carcass, not a set of distances from the floor.
 *
 * `edges` are the boundaries: n+1 of them describe n segments.
 */
export function chainDimensions({ edges, at, direction, offset, textHeight, labels = null }) {
  const out = [];
  const sorted = [...edges].filter(Number.isFinite).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (b - a <= 1e-6) continue;
    const from = direction === 'v' ? [at, a] : [a, at];
    const to = direction === 'v' ? [at, b] : [b, at];
    out.push(...dimensionEntities({
      from, to, direction, offset, value: b - a, textHeight, label: labels ? labels[i - 1] ?? null : null,
    }));
  }
  return out;
}

/**
 * Build the front elevation of one unit.
 *
 * @param {object} result   computeCabinet() output
 * @param {object} args
 *   unitNum    the number in the middle of the drawing
 *   frontType  'S' | 'H' | 'F' — how a front's face is detailed
 *   profile
 * @returns {{entities:Array, bounds:{x,y,w,h}, unitNum:string}}
 */
export function buildFrontElevation(result, {
  unitNum, frontType, profile, overallDims = true, unitNumberHeight = null,
  frontsOnly = false, shakerFrame = null,
} = {}) {
  const D = profile.drawings;
  const entities = [];
  // T43-F1: the fronts sheet asks the whitelist; every other caller asks the
  // question this file has asked since turn 6, and gets the same answer it got.
  const panels = result.panels.filter(frontsOnly ? isFrontsSheetPanel : isDrawn);
  const W = result.params.width;
  const H = result.params.height;

  // ── the pieces, straight from the engine's boxes ──
  for (const p of panels) {
    const style = panelStyle(p, { width: W, height: H });
    entities.push({ ...rect(style.layer, p.box.x, p.box.y, p.box.w, p.box.h), hidden: style.hidden });
  }

  // ── the outline of the whole carcass, over the panels (LISP
  //    drawFrontCarcaseOutline) — it is what the eye reads first ──
  entities.push(rect('CARCASE', 0, 0, W, H));

  // ── the fronts: face detail, and the direction they open ──
  const style = frontType || profile.front.defaultType;
  for (const p of panels) {
    if (p.part !== 'FRONT' && p.part !== 'DRAWER-FRONT') continue;
    // T43-F2: THE PROJECT'S OWN MILLIMETRES. `shakerFrame` is resolved ONCE at
    // the sheet level and threaded down; `null` keeps the pre-T43 answer (the
    // profile default), which is what every caller that has not been taught to
    // ask still gets.
    entities.push(...frontDetail(p.box, p.meta?.frontType || style, profile, shakerFrame));
    // A drawer does not swing. A door does, and the diagonals say which way.
    if (p.part === 'FRONT') entities.push(...doorSwing(p.box, p.meta?.hinge));
  }

  // ── legs, from the engine's own layout ──
  //
  // ─── TURN 43 (CLAUDE.md F1, iron rule 3): NOT ON THE FRONTS SHEET ────────
  // The owner: *"nóżki to jakieś klocki zamiast ładnej nóżki, poza tym jak
  // widać fronty, to nie powinno być widać nóżek."* In the built kitchen the
  // plinth hides them, so on /1 they have no business existing at all — and
  // the entity is not drawn rather than being drawn and hidden. Every other
  // caller (the unit card) is untouched: the option defaults off.
  const legs = frontsOnly ? null : result.assemblies.legs;
  const legHeight = result.assemblies.carcass.legHeight || 0;
  if (legs && legHeight > 0) {
    for (const leg of legs.positions) {
      entities.push(rect('LEG_BLOCK', leg.x, -legHeight, legs.width, legHeight));
    }
  }

  // ── the unit number, green, in the middle (LISP entText UNIT_NUMBER) ──
  entities.push(text('UNIT_NUMBER', W / 2, H / 2, String(unitNum ?? result.unitNum ?? ''),
    unitNumberHeight || D.unitNumberHeight));

  // ── what the drawing OCCUPIES, before the dimensions are hung off it ──
  const bounds = boundsOf(entities);

  // ── the two dimensions CLAUDE.md asks for: overall width below, height at
  //    the side. Both measure the whole drawn solid, which is what a joiner
  //    takes off a drawing — end panels and infills included.
  //    The unit CARD hangs its own detailed runs off the same faces and turns
  //    these off, so a card does not carry the width twice. ──
  if (overallDims) {
    entities.push(...dimensionEntities({
      from: [bounds.x, bounds.y],
      to: [bounds.x + bounds.w, bounds.y],
      direction: 'h',
      offset: D.dimensionOffset,
      value: bounds.w,
      textHeight: D.textHeight,
    }));
    entities.push(...dimensionEntities({
      from: [bounds.x + bounds.w, bounds.y],
      to: [bounds.x + bounds.w, bounds.y + bounds.h],
      direction: 'v',
      offset: D.dimensionOffset,
      value: bounds.h,
      textHeight: D.textHeight,
    }));
  }

  return {
    entities,
    bounds: boundsOf(entities),
    solid: bounds,
    unitNum: String(unitNum ?? result.unitNum ?? ''),
  };
}

// `boundsOf` lives in primitives.js now and is re-exported here, so a caller
// that already imported it from the elevation keeps working.
export { boundsOf };
