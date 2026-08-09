// ─── One piece of a cabinet, as a thing you can select and edit ─────────────
// Turn 11, CLAUDE.md F3.
//
// Turn 9 made a SHELF selectable and editable. This is the rest of the cabinet:
// sides, bottom, top, back, vertical partitions, end panels, infills and the
// doors' hinges. The selection model does not change — it is still
// `{ unitId, elementRef }` where the ref is the ENGINE's own panel id — so what
// this module adds is the two questions that follow from it:
//
//   WHAT IS THIS PIECE?   `elementKind` / `elementLabel`, decided on the
//                         engine's `part` and `role`, never on the id string.
//   WHAT MAY BE SAID ABOUT IT?  `elementFields`, which is the list the right
//                         panel builds itself from — so a kit that adds a part
//                         nobody thought of gets a sensible panel for free, and
//                         a new field is one entry here rather than a new
//                         branch in a component.
//
// Pure data and pure functions: no React, no store. The panel reads it, the 3D
// view reads it, and a node test can look at the answer.

/**
 * Is this panel a thing a joiner can point at and edit?
 *
 * Everything with a box, except the pieces that are part of a MECHANISM rather
 * than of the cabinet — a drawer box's four sides, the panel that carries the
 * runners, its fillers. Those are consequences of the drawer stack: the way to
 * change one is to change the stack, and offering a material for the left side
 * of drawer 2 would be offering a decision nobody makes.
 */
export function isSelectableElement(panel) {
  return Boolean(panel?.box) && elementKind(panel) !== null;
}

const MECHANISM_PARTS = new Set(['DP', 'FILLER']);

/**
 * The kinds that are ADDED INTERIOR ITEMS — the things a joiner puts INSIDE a
 * carcass after it exists.
 *
 * ─── TURN 13 (CLAUDE.md F2.4) ───
 * The owner's verdict, after living with turn 11's "the whole cabinet is
 * selectable": clicking a cabinet must select the CABINET again. Turn 11 was
 * right that every piece is a thing with properties; it was wrong about where
 * you reach it. A carcass panel is reached in the EDITOR window now — which is
 * the whole of F2 — and the room view goes back to being about cabinets.
 *
 * What stays directly clickable is exactly what a joiner ADDED: a shelf, a
 * vertical partition, a fixed shelf or rail. Those are the pieces somebody put
 * there on purpose and moves by hand, and taking the click away from them would
 * take the drag with it.
 */
const ADDED_INTERIOR_KINDS = new Set(['shelf', 'partition', 'fixed-shelf']);

/**
 * Is this piece clickable AS A PIECE in the room view?
 *
 * The narrower question, and the one the 3D scene asks. `isSelectableElement`
 * is unchanged and still says what may be selected AT ALL — the editor window
 * uses it, and so does everything downstream of a selection. This only decides
 * what a click in the ROOM lands on, which is the half of it the owner sees.
 */
export function isMainViewElement(panel) {
  return isSelectableElement(panel) && ADDED_INTERIOR_KINDS.has(elementKind(panel));
}

/**
 * WHICH kind of piece this is — the word a joiner would use for it.
 *
 * @returns {string|null} null for the pieces that are not elements at all
 */
export function elementKind(panel) {
  const part = panel?.part;
  const role = panel?.role;
  if (!part) return null;
  if (MECHANISM_PARTS.has(part) || role === 'drawer_box') return null;
  switch (part) {
    case 'SHELF': return 'shelf';
    case 'VPART': return 'partition';
    case 'PARTITION': case 'RAIL-PART': case 'FIXED': return 'fixed-shelf';
    case 'BUL': case 'BUR': return 'side';
    case 'TOP': return 'top';
    case 'BOTTOM': return 'bottom';
    case 'BACK': case 'BACK-RAIL': return 'back';
    case 'HOLDER': return 'holder';
    case 'SPURS': return 'spurs';
    case 'END-PANEL': return 'end-panel';
    case 'INFILL': return 'infill';
    case 'PLINTH': return 'plinth';
    case 'FRONT': return 'door';
    case 'DRAWER-FRONT': return 'drawer-front';
    default: return null;
  }
}

const LABELS = {
  shelf: 'Shelf',
  partition: 'Vertical partition',
  'fixed-shelf': 'Fixed shelf',
  side: 'Side panel',
  top: 'Top',
  bottom: 'Bottom',
  back: 'Back',
  holder: 'Sink holder',
  spurs: 'Spurs panel',
  'end-panel': 'End panel',
  infill: 'Infill',
  plinth: 'Plinth',
  door: 'Door',
  'drawer-front': 'Drawer front',
};

/** What the panel calls it, above the engine's own id. */
export function elementLabel(panel) {
  const kind = elementKind(panel);
  if (!kind) return null;
  if (kind === 'side') return panel.part === 'BUL' ? 'Left side' : 'Right side';
  if (kind === 'end-panel') return `End panel — ${panel.meta?.side === 'right' ? 'right' : 'left'}`;
  if (kind === 'infill') {
    const side = panel.meta?.side;
    const where = side === 'top' ? 'Top' : (side === 'right' ? 'Right' : 'Left');
    return `${where} infill`;
  }
  return LABELS[kind] || 'Piece';
}

// ─── What may be said about it ──────────────────────────────────────────────
//
// The FIELDS, per kind. Every element takes a MATERIAL — what a piece is made
// of changes no geometry at all, which is exactly why it can be said about
// anything (engine/cabinet.js applies it by panel id). The rest is
// element-appropriate: a shelf has a height and a setback, an end panel has a
// height mode and how far it runs above the unit, a door has a hinge side.
//
// ─── THE THICKNESS, AND WHY IT IS NOT EVERYWHERE ───
// A carcass is held together by tabs cut for a board of `board_t`: the tab is G
// wide, the socket's centre line is G/2 + 0.5, the dog-bone relief is sized off
// both (engine/puzzle.js). A 22 mm side in an 18 mm carcass is not a thicker
// side — it is a joint that does not go together. So the four jointed pieces
// (both sides, the top, the bottom) and the back that sockets into them take
// `carcass-board`: the field is there, it is the piece's real thickness, and it
// edits the CARCASS BOARD, because that is what that number is. A shelf, a
// partition, an end panel and an infill carry no joint and take their own.
// BLOCKERS #58 records the decision.

const FIELDS = {
  shelf: ['position-y', 'setback', 'thickness', 'material'],
  partition: ['position-x', 'setback', 'thickness', 'material'],
  'fixed-shelf': ['setback-unit', 'material'],
  side: ['carcass-board', 'material'],
  top: ['carcass-board', 'material'],
  bottom: ['carcass-board', 'material'],
  back: ['carcass-board', 'material'],
  holder: ['carcass-board', 'material'],
  spurs: ['carcass-board', 'material'],
  'end-panel': ['end-panel-height', 'thickness-ep', 'above-unit-ep', 'material'],
  infill: ['infill-width', 'above-unit-infill', 'pin-infill', 'material'],
  plinth: ['plinth-height', 'material'],
  door: ['hinge-side', 'front-board', 'material'],
  'drawer-front': ['drawer-height', 'front-board', 'material'],
};

/**
 * The controls this piece's properties panel offers, in order.
 *
 * @returns {string[]} field ids the panel knows how to render
 */
export function elementFields(panel) {
  const kind = elementKind(panel);
  if (!kind) return [];
  const fields = [...(FIELDS[kind] || ['material'])];
  // A piece the engine DERIVES has no item to hang an override on: the
  // horizontal partition above a drawer stack follows the stack, and a shelf
  // that arrived as a bare count has no id. Those lose the fields that need one.
  if ((kind === 'shelf' || kind === 'partition') && !panel.meta?.itemId) {
    return fields.filter((f) => f === 'material');
  }
  return fields;
}

/**
 * Which UNIT parameter a `carcass-board` field edits, so the panel does not
 * have to know that a front is a different board from a carcass.
 */
export function boardParamFor(panel) {
  const kind = elementKind(panel);
  if (kind === 'door' || kind === 'drawer-front') return 'front_t';
  return 'board_t';
}
