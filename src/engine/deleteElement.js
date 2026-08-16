// ─── WHAT `Delete` DELETES (turn 34, CLAUDE.md F8) ──────────────────────────
//
// The owner, 16.08.2026: *"szuflady i wszystkie inne elementy: po naciśnięciu
// i podświetleniu — usunięcie przez naciśnięcie Delete; w modalu pokaż też
// Delete. Jak mamy 3 szuflady, niech usuwają się po jednej, tak jak
// naciskasz."*
//
// Two sentences, two laws, and the second is the one that needs writing down:
// a stack of three must clear in three presses, one drawer per press, with the
// selection FALLING to the next drawer down so the finger never moves. That is
// a decision about WHAT is selected next, and a decision is a pure function.
//
// This module answers both halves for one selected piece:
//
//   WHAT IS REMOVED   the ITEM behind the piece where there is one (a shelf, a
//                     partition, a drawer, a shoe box, a lighting strip), the
//                     PANEL otherwise (an end panel, an infill, a door) — which
//                     is exactly the split `projectStore.removeElement` has
//                     always made; this only names it before the fact so a
//                     caller can refuse honestly.
//   WHAT IS SELECTED  the next drawer DOWN in a stack, and nothing at all
//                     anywhere else.
//
// Pure: no React, no store, no DOM. The store applies it, a node test reads it.

import { elementActions, elementKind } from './elements.js';

/**
 * Which drawer of the stack this piece belongs to, 1-based from the floor —
 * or null where it is not a drawer at all.
 *
 * Both the FRONT (`01-DF2`) and the BOX's own boards (`D2-SL`) carry
 * `meta.drawer`, and both mean the same drawer, which is why the answer is one
 * field and not two lookups.
 */
export function drawerIndexOf(panel) {
  const n = Number(panel?.meta?.drawer);
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : null;
}

/**
 * The drawer ITEMS of one unit, bottom-up — the order the engine numbers them
 * in, so the n-th of this list IS `meta.drawer === n`.
 */
export function drawerItemsOf(unit) {
  return (unit?.params?.sections?.[0]?.items || [])
    .filter((i) => i?.kind === 'drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
}

/**
 * ─── THE PLAN FOR ONE PRESS ────────────────────────────────────────────────
 *
 * @param {object} args
 *   unit    the project unit the piece belongs to
 *   panel   the ENGINE panel that is selected
 * @returns {{
 *   allowed: boolean,
 *   reason: string|null,      why not, in a sentence a joiner would accept
 *   target: 'item'|'panel'|null,
 *   itemId: string|null,
 *   panelId: string|null,
 *   label: string|null,       what is about to go, for the message
 *   nextDrawer: number|null,  the drawer the selection FALLS to, 1-based
 * }}
 */
export function deletePlan({ unit, panel }) {
  const no = (reason) => ({
    allowed: false, reason, target: null, itemId: null, panelId: null, label: null, nextDrawer: null,
  });
  if (!unit || !panel) return no('Nothing is selected.');

  const kind = elementKind(panel);
  if (!kind) return no('This piece is part of the kit.');

  // ─── THE DRAWER STACK, ONE PER PRESS ───────────────────────────────────
  // A drawer FRONT and a drawer BOX are the same drawer, and `elementActions`
  // rightly refuses to remove either as a PIECE — "a drawer front follows its
  // drawer", "change the stack". Delete is not asking to remove the piece; it
  // is asking to remove the DRAWER, which is a thing a joiner adds and takes
  // away one at a time. So this case is answered before the piece rules.
  const n = drawerIndexOf(panel);
  if (n != null && (kind === 'drawer' || kind === 'drawer-front')) {
    const drawers = drawerItemsOf(unit);
    const item = drawers[n - 1] || null;
    if (!item) return no('That drawer is part of a fitted stack — change the stack.');
    const left = drawers.length - 1;
    return {
      allowed: true,
      reason: null,
      target: 'item',
      itemId: item.id,
      panelId: panel.id,
      label: `Drawer ${n}`,
      // [OWNER — accepted by silence]: the selection FALLS DOWNWARD. From
      // drawer n it lands on n − 1; from the bottom one it lands on whatever
      // is now the bottom, so three presses clear a stack of three whichever
      // end you start at.
      nextDrawer: left <= 0 ? null : Math.max(1, Math.min(n - 1 || 1, left)),
    };
  }

  const actions = elementActions(panel);
  if (!actions.remove.allowed) return no(actions.remove.reason || 'This piece is part of the kit.');

  const itemId = panel.meta?.itemId || null;
  return {
    allowed: true,
    reason: null,
    target: itemId ? 'item' : 'panel',
    itemId,
    panelId: panel.id,
    label: null,
    nextDrawer: null,
  };
}
