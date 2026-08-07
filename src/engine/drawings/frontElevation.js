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

/** A line, in drawing mm. */
const line = (layer, x1, y1, x2, y2) => ({ kind: 'line', layer, x1, y1, x2, y2 });
/** A rectangle by its lower-left corner and size. */
const rect = (layer, x, y, w, h) => ({ kind: 'rect', layer, x, y, w: Math.abs(w), h: Math.abs(h) });
const text = (layer, x, y, value, height, align = 'centre') => ({
  kind: 'text', layer, x, y, text: value, height, align,
});

/**
 * Which layer a panel is drawn on, and whether it is a hidden line.
 *
 * Decided on the ROLE, like everything else in this engine since BACKLOG #35 —
 * a kit that adds a part nobody thought of gets a sensible answer for free.
 */
function panelStyle(panel, { width, height }) {
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

/** The face detail of a front: shaker frame, J-groove, or nothing at all. */
function frontDetail(box, frontType, profile) {
  if (frontType === 'S') {
    const off = profile.front.types.S.frameWidth;      // LISP `off` = 50
    if (box.w > off * 2.2 && box.h > off * 2.2) {
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
 * @param {object} args
 *   from, to      the two points being measured, in drawing mm
 *   direction     'h' | 'v'
 *   offset        how far off the measured face the dimension line sits
 *   value         the number, already a number (formatted here, once)
 */
export function dimensionEntities({ from, to, direction, offset, value, textHeight }) {
  const out = [];
  const tick = textHeight * 0.9;
  const gap = textHeight * 0.4;
  const extend = textHeight * 0.7;

  if (direction === 'h') {
    const y = from[1] - offset;
    // Extension lines, starting clear of the face as a draughtsman leaves them.
    out.push(line('DIMENSIONS', from[0], from[1] - gap, from[0], y - extend));
    out.push(line('DIMENSIONS', to[0], to[1] - gap, to[0], y - extend));
    out.push(line('DIMENSIONS', from[0], y, to[0], y));
    for (const x of [from[0], to[0]]) {
      out.push(line('DIMENSIONS', x - tick / 2, y - tick / 2, x + tick / 2, y + tick / 2));
    }
    out.push(text('DIMENSIONS', (from[0] + to[0]) / 2, y + textHeight * 0.45, formatMm(value), textHeight));
    return out;
  }

  const x = from[0] + offset;
  out.push(line('DIMENSIONS', from[0] + gap, from[1], x + extend, from[1]));
  out.push(line('DIMENSIONS', to[0] + gap, to[1], x + extend, to[1]));
  out.push(line('DIMENSIONS', x, from[1], x, to[1]));
  for (const y of [from[1], to[1]]) {
    out.push(line('DIMENSIONS', x - tick / 2, y - tick / 2, x + tick / 2, y + tick / 2));
  }
  out.push({
    ...text('DIMENSIONS', x, (from[1] + to[1]) / 2, formatMm(value), textHeight),
    rotate: -90,
  });
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
export function buildFrontElevation(result, { unitNum, frontType, profile } = {}) {
  const D = profile.drawings;
  const entities = [];
  const panels = result.panels.filter(isDrawn);
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
    entities.push(...frontDetail(p.box, p.meta?.frontType || style, profile));
    // A drawer does not swing. A door does, and the diagonals say which way.
    if (p.part === 'FRONT') entities.push(...doorSwing(p.box, p.meta?.hinge));
  }

  // ── legs, from the engine's own layout ──
  const legs = result.assemblies.legs;
  const legHeight = result.assemblies.carcass.legHeight || 0;
  if (legs && legHeight > 0) {
    for (const leg of legs.positions) {
      entities.push(rect('LEG_BLOCK', leg.x, -legHeight, legs.width, legHeight));
    }
  }

  // ── the unit number, green, in the middle (LISP drawText UNIT_NUMBER) ──
  entities.push(text('UNIT_NUMBER', W / 2, H / 2, String(unitNum ?? result.unitNum ?? ''), D.unitNumberHeight));

  // ── what the drawing OCCUPIES, before the dimensions are hung off it ──
  const bounds = boundsOf(entities);

  // ── the two dimensions CLAUDE.md asks for: overall width below, height at
  //    the side. Both measure the whole drawn solid, which is what a joiner
  //    takes off a drawing — end panels and infills included. ──
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

  return { entities, bounds: boundsOf(entities), unitNum: String(unitNum ?? result.unitNum ?? '') };
}

/** The box a set of entities occupies, in drawing mm. */
export function boundsOf(entities) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const see = (x, y) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const e of entities) {
    if (e.kind === 'line') { see(e.x1, e.y1); see(e.x2, e.y2); }
    else if (e.kind === 'rect') { see(e.x, e.y); see(e.x + e.w, e.y + e.h); }
    else if (e.kind === 'text') { see(e.x - e.height, e.y - e.height); see(e.x + e.height, e.y + e.height); }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1, h: 1 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
