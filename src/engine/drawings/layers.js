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
  // Hinges. Held for the turn that draws them, so the layer list stays the
  // LISP's list rather than "the bits turn 6 happened to need".
  HINGES: { aci: 96, colour: '#4C9A9A', width: 0.2 },
  // Measurements — see the note above.
  DIMENSIONS: { aci: 8, colour: '#1B2A4A', width: 0.25 },
  // Not a LISP layer: the sheet itself. A drawing frame and a title block are
  // what make a printout read as a drawing rather than a screenshot, and the
  // AutoLISP never had to draw them because AutoCAD's template already did.
  FRAME: { aci: 7, colour: '#111111', width: 0.5 },
  FRAME_LIGHT: { aci: 7, colour: '#444444', width: 0.2 },
};

export function drawingLayer(name) {
  return DRAWING_LAYERS[name] || DRAWING_LAYERS.CARCASE;
}
