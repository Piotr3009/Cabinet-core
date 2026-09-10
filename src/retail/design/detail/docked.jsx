import { RETAIL_SHOW_WORKSHOP_TOOLS } from '../../config.js';
import * as A from '../adapter.js';

// ─── TURN 66 F3 · ONE EDITOR ON THE RIGHT ──────────────────────────────────
//
// The owner's screenshot showed the floating `ElementProperties` window (1)
// and the thin Duty menu (2) open on the SAME drawer, the floating window
// itself admitting *"The same fields are in the right-hand panel, which is
// already showing this piece"*. His verdict:
//
//   *"w zasadzie po prawej powinien być tylko menu edycji."*
//
// So: ONE surface edits a selected element, and it is the docked right panel.
// The thin Duty menus are gone (LICENSED REMOVALS) and what stands in the slot
// is the COPIED PRO editor for whatever was clicked — the same file, the same
// controls, the same store calls, docked instead of floating.
//
// THIS FILE IS THE TABLE, and it is a table for the same reason `detail/
// index.jsx` was one: a kind that is not a key here has no editor, so
// `adapter.resolveSelection` answers null for it and the panel slides OUT
// rather than opening empty. There is no default branch to write a placeholder
// into.
//
// ─── TWO SHAPES, BECAUSE PRO'S OWN EDITORS HAVE TWO ────────────────────────
//
//   { modal, args }   a copied WINDOW — `DoorModal`, `RailModal`,
//                     `WatchLayoutModal`. Each reads its subject off the
//                     SHARED ui store's `modalArgs`, which is exactly what
//                     makes it a copy rather than a re-write; the dock writes
//                     that slot and `Editors.jsx` renders it INSIDE the panel.
//                     No anchor is passed: the panel IS the place now.
//
//   { props }         a copied PANEL — `ElementProperties`, PRO's own piece
//                     window, which takes its subject as props. It is what
//                     PRO's right-hand panel renders and it is what the
//                     owner's screenshot called *"the right-hand panel, which
//                     is already showing this piece"*.
//
// ─── THE WORKSHOP FIELDS ARE HIDDEN, NOT CUT ───────────────────────────────
//
// `ElementProperties` takes PRO's OWN `omit` prop (T33 wrote it so the door
// modal could drop the hinge rows it draws itself), so the fields below are
// left out through the copy's own API — not by editing a copy and not by
// deleting a control. Behind ONE flag, `RETAIL_SHOW_WORKSHOP_TOOLS`: turn it
// on and a joiner gets PRO's panel entire.
//
// The four the fields name are the workshop's own questions:
//   setback / setback-unit     how far the piece sits back from the face
//   thickness / thickness-ep   this piece's own board
//   carcass-board / front-board  which board the cabinet is cut from
//   partition-slot / -drill-face which board a divider is, and which face
//                              the machine bores
//   runner-variant             which runner is fitted
//   material                   a per-piece override of the project's palette
//
// What is left is what a client has an opinion about: where the shelf is, how
// it is held, where the divider stands, how tall the drawer front is, and
// whether the top drawer carries the watch insert.
const WORKSHOP_FIELDS = Object.freeze([
  'setback', 'setback-unit',
  'thickness', 'thickness-ep',
  'carcass-board', 'front-board',
  'partition-slot', 'partition-drill-face',
  'runner-variant',
  'material',
]);

/** What a docked `ElementProperties` leaves out — nothing, for a joiner. */
const omitted = () => (RETAIL_SHOW_WORKSHOP_TOOLS ? [] : [...WORKSHOP_FIELDS]);

/**
 * The modal names the DOCK owns. `Editors.jsx` renders exactly these inside
 * the right-hand panel and exactly the rest at the room's level, so one name
 * can never be drawn twice — which is what "one editor" means in code.
 */
export const DOCK_MODALS = Object.freeze(['element', 'rail', 'watch-layout']);

/**
 * WHICH EDITOR EDITS THIS SELECTION.
 *
 * @param {object} selection — `adapter.resolveSelection`'s own shape
 * @returns {{modal?:string, args?:object, props?:object}|null}
 */
export function dockFor(selection) {
  if (!selection?.unitId) return null;
  const { menu, unitId, panel, item } = selection;

  // THE DOOR — `DoorModal`, PRO's window for every piece: the split, the
  // hinges, the handle, the mirror, and section A's own fields.
  if (menu === 'door') {
    return panel ? { modal: 'element', args: { unitId, panelId: panel.id } } : null;
  }

  // THE WATCH DRAWER — `WatchLayoutModal`: four layouts, the glass, the finish.
  if (menu === 'watch') {
    return item ? { modal: 'watch-layout', args: { unitId, itemId: item.id } } : null;
  }

  // THE HANGING RAIL — PRO's own T42 verdict, asked of the engine: an ALONE
  // rod opens `RailModal` on its ITEM; an ASSEMBLY's rod opens the fix shelf it
  // rides, which is `DoorModal` on that shelf's PANEL.
  if (menu === 'rail') {
    const route = item ? A.railWindow(unitId, item.id) : null;
    return route ? { modal: route.modal, args: route.args } : null;
  }

  // EVERYTHING ELSE THE ENGINE CUTS A BOARD FOR — the shelf, the divider, a
  // drawer front, a drawer box, an overlay front, a shoe drawer's face. PRO's
  // own piece panel, on the piece.
  if (!panel) return null;
  return { props: { panel, item, omit: omitted() } };
}
