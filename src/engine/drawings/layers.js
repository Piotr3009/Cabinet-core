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
  CARCASE: { aci: 7, colour: '#111111', width: 0.35 },
  // Doors and drawer fronts. ACI 6 — magenta, and unmistakable.
  DOORS: { aci: 6, colour: '#D400D4', width: 0.35 },
  // Anything BEHIND a front: shelves, partitions, the drawer panel. Dashed,
  // because that is what a hidden line is. ACI 3.
  SHELVES: { aci: 3, colour: '#009A3D', width: 0.25, dash: [6, 4] },
  // The opening direction. ACI 8.
  DOOR_SWING: { aci: 8, colour: '#8A8A8A', width: 0.2 },
  // ACI 8 as well — the legs are furniture, but they are not the subject.
  LEG_BLOCK: { aci: 8, colour: '#8A8A8A', width: 0.25 },
  // The unit's number, in the middle of the elevation. ACI 94 — green.
  UNIT_NUMBER: { aci: 94, colour: '#009A3D', width: 0.25 },
  // Hinges. Held by turn 6 for the turn that drew them; turn 7's top view is
  // that turn — a hinge on the plan, on the side the door swings from.
  HINGES: { aci: 96, colour: '#4C9A9A', width: 0.2 },
  // Measurements — see the note above.
  DIMENSIONS: { aci: 8, colour: '#1B2A4A', width: 0.25 },
  // ─── Turn 7 (CLAUDE.md F1) ───
  // Runners. NOT a LISP view layer: the AutoLISP's only runner layer is
  // RUNNERS_3MM, which is a CNC drilling layer, because its elevation had no
  // runners on it at all. The carcass-only view does, so they need an ink —
  // teal, the same family as the hinges, because a runner is the same kind of
  // thing: hardware, drawn where it is screwed on.
  RUNNERS: { aci: 96, colour: '#2E7D8C', width: 0.25 },
  // The caption under a view ("FRONT", "TOP"). Not a LISP layer either — the
  // AutoLISP put its three views in one drawing and let the draughtsman know
  // which was which; a printed card has to say so.
  VIEW_TITLE: { aci: 7, colour: '#111111', width: 0.3 },
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
  HANDLES: { aci: 94, colour: '#009A3D', width: 0.35 },
  // Everything that is ALREADY THERE: the floor, the ceiling, the room's own
  // walls on the plan. Red, and thin — it is context, not subject.
  BUILDING: { aci: 1, colour: '#C0392B', width: 0.25 },
  // Not a LISP layer: the sheet itself. A drawing frame and a title block are
  // what make a printout read as a drawing rather than a screenshot, and the
  // AutoLISP never had to draw them because AutoCAD's template already did.
  FRAME: { aci: 7, colour: '#111111', width: 0.5 },
  FRAME_LIGHT: { aci: 7, colour: '#444444', width: 0.2 },
};

export function drawingLayer(name) {
  return DRAWING_LAYERS[name] || DRAWING_LAYERS.CARCASE;
}
