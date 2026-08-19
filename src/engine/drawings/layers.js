// ─── The view layers, from the AutoLISP (turn 6, CLAUDE.md F7) ───
//
// `createViewLayers` in SKYLON_COMMON.lsp names eight layers and gives each an
// AutoCAD colour index. Those indices are why Piotr's drawings look the way
// they do — magenta doors, green shelves, grey swing lines — so they are
// reproduced here rather than re-chosen.
//
// Two of them are translated rather than copied, and both for the same reason:
// an ACI index is a colour on a BLACK screen, and this draws on white paper.
//   · ACI 7 is "white", which on paper is black. That is not a change of
//     colour, it is the same convention.
//   · ACI 3 is pure #00FF00, which on white is a bright nothing. The printable
//     green is used and the index is recorded beside it, so the next person
//     can see exactly what was translated and why.
//
// DIMENSIONS is the one deliberate departure: the LISP puts it on ACI 8 (mid
// grey), and turn 5 settled the drawing-office navy as the ink EVERY
// measurement in this app is drawn in (BACKLOG #34). One ink for measurements
// beats fidelity to a grey nobody chose.
//
// Pure data — no React, no store imports.

export const DRAWING_LAYERS = {
  // The carcass: sides, top, bottom. ACI 7.
  CARCASE: { aci: 7, colour: '#111111', width: 0.35, pen: 'OUTLINE' },
  // Doors and drawer fronts. ACI 6 — magenta, and unmistakable.
  DOORS: { aci: 6, colour: '#D400D4', width: 0.35, pen: 'VISIBLE' },
  // Anything BEHIND a front: shelves, partitions, the drawer panel. Dashed,
  // because that is what a hidden line is. ACI 3.
  SHELVES: { aci: 3, colour: '#009A3D', width: 0.25, dash: [6, 4], pen: 'HIDDEN' },
  // The opening direction. ACI 8.
  DOOR_SWING: { aci: 8, colour: '#8A8A8A', width: 0.2, pen: 'FINE' },
  // ACI 8 as well — the legs are furniture, but they are not the subject.
  LEG_BLOCK: { aci: 8, colour: '#8A8A8A', width: 0.25, pen: 'THIN' },
  // The unit's number, in the middle of the elevation. ACI 94 — green.
  UNIT_NUMBER: { aci: 94, colour: '#009A3D', width: 0.25, pen: 'ANNOTATION' },
  // Hinges. Held by turn 6 for the turn that drew them; turn 7's top view is
  // that turn — a hinge on the plan, on the side the door swings from.
  HINGES: { aci: 96, colour: '#4C9A9A', width: 0.2, pen: 'THIN' },
  // Measurements — see the note above.
  DIMENSIONS: { aci: 8, colour: '#1B2A4A', width: 0.25, pen: 'ANNOTATION' },
  // ─── Turn 7 (CLAUDE.md F1) ───
  // Runners. NOT a LISP view layer: the AutoLISP's only runner layer is
  // RUNNERS_3MM, which is a CNC drilling layer, because its elevation had no
  // runners on it at all. The carcass-only view does, so they need an ink —
  // teal, the same family as the hinges, because a runner is the same kind of
  // thing: hardware, drawn where it is screwed on.
  RUNNERS: { aci: 96, colour: '#2E7D8C', width: 0.25, pen: 'THIN' },
  // The caption under a view ("FRONT", "TOP"). Not a LISP layer either — the
  // AutoLISP put its three views in one drawing and let the draughtsman know
  // which was which; a printed card has to say so.
  VIEW_TITLE: { aci: 7, colour: '#111111', width: 0.3, pen: 'VISIBLE' },
  // ─── TURN 40 (CLAUDE.md F5): THE OWNER'S OWN SET ADDS TWO INKS ──────────
  //
  // His AutoCAD drawings (Anderson Kitchen rev B) carry a colour convention
  // this app had no layer for, and CLAUDE.md reads that set as the spec:
  // *"fronts in magenta, hinge side shown by the grey diagonal X across each
  // door, handles in GREEN, existing building fabric (architrave, walls) in
  // RED."* The first two the app already draws — DOORS is magenta and
  // DOOR_SWING is the grey diagonal from the hinge side. These are the other
  // two.
  //
  // HANDLES takes the same green as UNIT_NUMBER rather than a second one: a
  // drawing with two greens on it is a drawing where neither means anything,
  // and both of these are "what the workshop is fitting" rather than "what the
  // workshop is building".
  HANDLES: { aci: 94, colour: '#009A3D', width: 0.35, pen: 'VISIBLE' },
  // Everything that is ALREADY THERE: the floor, the ceiling, the room's own
  // walls on the plan. Red, and thin — it is context, not subject.
  BUILDING: { aci: 1, colour: '#C0392B', width: 0.25, pen: 'THIN' },
  // Not a LISP layer: the sheet itself. A drawing frame and a title block are
  // what make a printout read as a drawing rather than a screenshot, and the
  // AutoLISP never had to draw them because AutoCAD's template already did.
  FRAME: { aci: 7, colour: '#111111', width: 0.5, pen: 'OUTLINE' },
  FRAME_LIGHT: { aci: 7, colour: '#444444', width: 0.2, pen: 'FINE' },
};

export function drawingLayer(name) {
  return DRAWING_LAYERS[name] || DRAWING_LAYERS.CARCASE;
}

// ─── TURN 41 (F5a): THE PEN TABLE — WEIGHT IS A ROLE, NOT A NAME ────────────
//
// The owner asked for drawings "professional jak z AutoCada". A drawing reads
// as professional because of ONE thing before any other: a weight hierarchy.
// The eye finds the cut first because it is heaviest, then the outline, then
// what is behind, and last the numbers. Without it a drawing is a wireframe.
//
// ─── WHAT WAS MEASURED ──────────────────────────────────────────────────────
//
// Weight in this app was a per-LAYER constant keyed by WHAT A THING IS, and the
// layer is already carrying a different job — colour, which is the owner's own
// convention and is right. Two questions, one channel. On a real generated
// Wall A /1 sheet, 68 % of all 88 strokes were the single value 0.25, there
// were four distinct weights in the whole drawing, and the ratio from thinnest
// to thickest was 2.50 : 1. Worse, the hierarchy was inverted in places:
//
//   · the DIMENSION line (0.25) was HEAVIER than the door swing (0.20) and
//     exactly as heavy as a shelf and as the building fabric
//   · on the horizontal SECTION the cut room wall (0.25) was LIGHTER than an
//     uncut cabinet footprint (0.35) — a section whose cut line is the
//     lightest thing on it
//
// ─── THE SECOND AXIS ────────────────────────────────────────────────────────
//
// So an entity now answers a second, orthogonal question: what is my ROLE in
// this drawing — am I a cut, an outline, a visible edge, something hidden, or
// an annotation? The role carries an ISO pen weight off the standard ladder
// (0.13 / 0.18 / 0.25 / 0.35 / 0.50 / 0.70), which is the ladder every plotter
// and every CAD default is built around.
//
// Each layer names its DEFAULT role, so every view in the app gains the
// hierarchy without a single call site changing, and a builder that knows
// better says so on the entity: `{ ...rect(...), pen: 'CUT' }`. The entity's
// own word wins. That is the piece that did not exist before.
//
// THE `width` FIELDS ABOVE ARE NOT DELETED (sanctity) and are not edited. They
// are the fallback for any layer that names no role, and they are the record of
// what this app drew before tonight.

/** The ISO pen ladder, in millimetres, keyed by the role an entity plays. */
export const PEN = Object.freeze({
  // The plane the drawing is cut through — the heaviest line on any sheet.
  CUT: 0.70,
  // The outside of a solid object, and the sheet's own frame.
  OUTLINE: 0.50,
  // An edge you can see, inside an outline.
  VISIBLE: 0.35,
  // Behind something: a shelf through a door, a carcass behind a front.
  HIDDEN: 0.25,
  // Hardware, legs, secondary furniture — present, not the subject.
  THIN: 0.18,
  // Every measurement, every label. Deliberately the same weight as THIN and
  // deliberately LIGHTER than any geometry: a dimension must never compete
  // with the thing it is measuring.
  ANNOTATION: 0.18,
  // Swing arcs, sheet rules, anything that is a hint rather than a fact.
  FINE: 0.13,
});

/**
 * HOW HEAVILY THIS ENTITY IS DRAWN — the single source, called by every
 * renderer.
 *
 * The entity's own role first, then its layer's default role, then the layer's
 * pre-T41 `width`. Three steps, and the third is what makes this change
 * invisible to any layer nobody has given a role to.
 */
export function penWidth(entity) {
  const own = entity?.pen;
  if (own && Number.isFinite(PEN[own])) return PEN[own];
  const layer = drawingLayer(entity?.layer);
  if (layer?.pen && Number.isFinite(PEN[layer.pen])) return PEN[layer.pen];
  return layer?.width ?? 0.25;
}
