/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T84 F7, ESCAPE (CLAUDE.md T84 PART E): ONE OWNER FOR THE KEY UNDER THE STUDIO FACE
//
// CLAUDE.md T84 PART E: *"`lib/studioEscape.js`: one keydown owner for the
// shell: P1's order, one event one action, the door window's conduct by the
// profile, never unpin; the existing listeners keep their own windows (the
// shell does not re-implement the Modal's Escape, it yields to it: a handled
// event does not also clear the selection under it)."*  The designer
// (verify/t84/astra/, adopted whole by the owner at 16:27): *"Focused edit /
// local operation first, then topmost submenu, popup, closable modal, scene
// operation, part selection, cabinet selection. One key event, one action.
// Never unpin. Preserve sticky door exceptions."*
//
// THE ORDER is P1's (verify/t84/p1-escape.md E): six levels, and the first one
// that is active owns the press.
//   1 field    a field with the caret, Center between (CHAT FIX 30.10.2026:
//              the refused card value left with the quick card)
//   2 menu     the topmost submenu or popup: the menu bar, the right-click
//              menu, a library flyout, the material picker, the Changes list,
//              a Studio popup (the rail's Add and Materials, the scene's View)
//   3 window   a window whose Escape is on, the Library panel, the island
//              plan. The DOOR window is not one: its key is off (T37:
//              components/DoorModal.jsx turns its `escapeCloses` off for a
//              hinged leaf), so it outlives every press, as it does today.
//              Its conduct is the profile's by CLAUDE.md LAWS 4 and keeps
//              T37's dock-left in both faces tonight (verify/t84/DECISIONS.md
//              9: DoorModal.jsx is a retail copy); either conduct keeps the key
//              off, so nothing here reads it
//   4 scene    Measure (its own key: the points first, then the tool), the
//              corners or the edges lit for a cut
//   5 part     the selected piece (`clearElement`)
//   6 cabinet  the selected cabinet (`clearSelection`); the pin is never touched
//
// WHO ACTS. Where a level's own listener answers the key today (a field, a
// refused card value, the menu bar, the right-click menu, the flyout, the View
// popup, a window, the Library, the island plan, Measure), the shell does
// NOTHING and leaves the event alone: that is how one press stays one action
// (p1-escape.md D: today a menu shuts AND the cabinet is dropped, because the
// page's own listener acted on the same press). The shell acts only where
// nothing else would: the rail's popups (registered below), Center between
// with no piece panel left to cancel it, the Changes flag with no list drawn,
// the cut pick (no key of its own today), the part, the cabinet. When it acts
// it stops the event there, so no listener after it acts on the same press.
//
// WHEN. ONE `keydown` listener on `window`, in the CAPTURE phase, installed
// when the shell mounts: it runs before any listener that registers later (a
// flyout, Center between, the View popup) and before every
// bubble listener, so it reads the state as the press finds it, before any
// owner has answered. A bubble listener would not do: zustand's `set` is
// synchronous, so it would find a menu already shut and drop the cabinet too
// (p1-escape.md E). An event an earlier listener already answered (default
// prevented, or its propagation stopped) is left alone.
//
// PURE but for the installer and the popup registry: no React, no JSX, no
// store import, nothing read from the DOM at import time. `escapeSnapshot` and
// `escapeStep` are plain functions of plain objects; `readEscapeDom` reads the
// document when it is CALLED, at the press; `installStudioEscape` adds the one
// listener and returns its removal.

/** The six levels, in the order they own a press (verify/t84/p1-escape.md E). */
export const ESCAPE_LEVELS = Object.freeze(['field', 'menu', 'window', 'scene', 'part', 'cabinet']);

/**
 * Everything the shell itself may do with one press, and nothing else: no
 * entry here touches the inspector, its mode or its pin.
 */
export const SHELL_ACTIONS = Object.freeze([
  'cancelCentreBetween', 'closePopup', 'closeHistory',
  'stopNotchPick', 'stopEdgeNotchPick', 'clearElement', 'clearSelection',
]);

// === THE STUDIO'S OWN POPUPS ================================================
//
// A Studio popup that wants its Escape answered by this owner registers its
// close while it is open (components/studio/RailMenus.jsx does, for Add and
// Materials): the topmost registered popup is closed by one press, and the
// press goes no further. A Studio popup that answers its own Escape (the View
// popup, components/studio/SceneViewMenu.jsx) does not register; it is seen in
// the document (`[data-studio="popup"]`) and the shell leaves it alone.

const popups = [];

/**
 * @param {() => void} close  what closes the popup
 * @returns {() => void} the removal; call it when the popup goes
 */
export function registerStudioPopup(close) {
  if (typeof close !== 'function') return () => {};
  const entry = { close };
  popups.push(entry);
  return () => {
    const at = popups.indexOf(entry);
    if (at >= 0) popups.splice(at, 1);
  };
}

/** How many registered Studio popups are open now. */
export function studioPopupsOpen() {
  return popups.length;
}

/** Close the topmost registered Studio popup; false when none is open. */
export function closeTopStudioPopup() {
  const top = popups[popups.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

// === WHAT THE PRESS FINDS ===================================================

const FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * A key typed with the caret in a field belongs to the field: the same test the
 * page's own listener has made since turn 9 (pages/ConfiguratorPage.jsx, any
 * INPUT, TEXTAREA or SELECT), and an editable element besides.
 */
export function isFieldTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isContentEditable === true) return true;
  return FIELD_TAGS.has(String(target.tagName || '').toUpperCase());
}

/**
 * The document's half of the snapshot, read at the press. Every hook is one an
 * existing component already draws (named beside each, verify/t84/p1-escape.md A).
 *
 * @param {Event|null} event  the key event
 * @param {Document|null} doc
 */
export function readEscapeDom(event, doc = (typeof document === 'undefined' ? null : document)) {
  if (!doc || typeof doc.querySelector !== 'function') return {};
  const has = (selector) => Boolean(doc.querySelector(selector));
  return {
    field: isFieldTarget(event?.target),
    // components/ElementProperties.jsx: Center between, armed, in a panel that cancels it itself.
    centreBetweenListener: has('[data-centre-between="1"][aria-pressed="true"]'),
    // components/MenuBar.jsx: a dropdown of the top menu.
    menu: has('nav[aria-label="Main menu"] [role="menu"]'),
    // components/LibraryPanel.jsx: a group's flyout.
    libraryFlyout: has('[data-library-flyout]'),
    // components/MaterialPicker.jsx: the picker's popover.
    materialPicker: has('[data-material-picker-panel]'),
    // components/Messages.jsx: the Changes list, drawn.
    historyList: has('[data-message-history-list]'),
    // The Studio's popups, registered or not (CONTRACT section 6: `popup`).
    studioPopups: doc.querySelectorAll('[data-studio="popup"]').length,
    // components/Modal.jsx: every window on the screen, and whether it is the door
    // window (components/DoorModal.jsx: its body says `B,A` for a hinged leaf).
    windows: [...doc.querySelectorAll('[data-modal-shell="1"]')].map((el) => ({
      name: el.getAttribute('data-modal-name') || '',
      door: Boolean(el.querySelector('[data-door-modal-sections="B,A"]')),
      covered: el.getAttribute('data-modal-covered') === '1',
      workspace: el.getAttribute('data-modal-workspace') === '1',
    })),
  };
}

/**
 * The press, as plain facts: the event's, the store's (uiStore's own fields)
 * and the document's (`readEscapeDom`), with the registered popups' count.
 *
 * @param {{ event?: object, ui?: object, dom?: object, popups?: number }} parts
 */
export function escapeSnapshot({
  event = null, ui = {}, dom = {}, popups: registered = 0,
} = {}) {
  const u = ui || {};
  const d = dom || {};
  const windows = Array.isArray(d.windows) ? d.windows : null;
  const own = Math.max(0, Number(registered) || 0);
  return {
    key: event?.key ?? null,
    handled: Boolean(event?.defaultPrevented || event?.cancelBubble),
    composing: Boolean(event?.isComposing),
    field: Boolean(d.field),
    centreBetween: Boolean(u.centreBetween),
    centreBetweenListener: Boolean(d.centreBetweenListener),
    ownPopup: own > 0,
    otherPopup: (Number(d.studioPopups) || 0) > own,
    menu: Boolean(d.menu),
    contextMenu: Boolean(u.contextMenu),
    libraryFlyout: Boolean(d.libraryFlyout),
    materialPicker: Boolean(d.materialPicker),
    history: Boolean(u.historyOpen),
    historyList: Boolean(d.historyList),
    // A window answers the key unless it is the door window (its key is off)
    // or a workspace with a window over it (Modal.jsx). With no document to
    // read (a test), the store's one slot stands for it.
    window: windows
      ? windows.some((w) => !w.door && !(w.workspace && w.covered))
      : Boolean(u.modal),
    doorWindow: windows ? windows.some((w) => w.door) : false,
    library: Boolean(u.libraryCategory),
    islandPlan: Boolean(u.islandPlan),
    ruler: Boolean(u.rulerOn),
    notchPick: Boolean(u.notchPick),
    edgeNotchPick: Boolean(u.edgeNotchPick),
    part: Boolean(u.selectedElement),
    cabinet: Boolean(u.selectedUnitId),
  };
}

/**
 * The ONE thing one Escape does, in P1's order.
 *
 * @param {object} s  `escapeSnapshot(...)`
 * @returns {{ level: number, step: string, owner: 'own'|'shell'|null, action: string|null, why: string }}
 *   `owner: 'own'`: the level's own listener answers and the shell does nothing;
 *   `owner: 'shell'`: the shell takes `action` (one of SHELL_ACTIONS) and nothing else.
 */
export function escapeStep(s) {
  const at = (level, owner, action, why) => ({
    level, step: level ? ESCAPE_LEVELS[level - 1] : 'none', owner, action, why,
  });
  if (!s || s.key !== 'Escape') return at(0, null, null, 'not the Escape key');
  if (s.handled) return at(0, 'own', null, 'an earlier listener already answered this press');

  // 1, a focused edit or a local operation
  if (s.composing) return at(1, 'own', null, 'the input method is composing: the key is its own');
  if (s.field) return at(1, 'own', null, 'a field has the caret: its own Escape ends the edit');
  if (s.centreBetween) {
    return s.centreBetweenListener
      ? at(1, 'own', null, 'Center between: the piece panel that armed it cancels it')
      : at(1, 'shell', 'cancelCentreBetween', 'Center between, with no piece panel left to cancel it');
  }

  // 2, the topmost submenu or popup
  if (s.ownPopup) return at(2, 'shell', 'closePopup', 'a rail popup is the topmost thing open');
  if (s.otherPopup || s.menu || s.contextMenu || s.libraryFlyout || s.materialPicker) {
    return at(2, 'own', null, 'a menu or a popup is open: it closes itself');
  }
  if (s.history) {
    return s.historyList
      ? at(2, 'own', null, 'the Changes list closes itself')
      : at(2, 'shell', 'closeHistory', 'the Changes flag is up with no list drawn');
  }

  // 3, a closable window (never the door window)
  if (s.window) return at(3, 'own', null, 'a window whose Escape is on answers it');
  if (s.library) return at(3, 'own', null, 'the Library panel closes itself');
  if (s.islandPlan) return at(3, 'own', null, 'the island plan closes itself');

  // 4, a scene operation
  if (s.ruler) return at(4, 'own', null, 'Measure: its own key clears the points, then closes the tool');
  if (s.notchPick) return at(4, 'shell', 'stopNotchPick', 'the corners lit for a cut: the pick ends');
  if (s.edgeNotchPick) return at(4, 'shell', 'stopEdgeNotchPick', 'the edges lit for a cut: the pick ends');

  // 5, the part selection; 6, the cabinet selection
  if (s.part) return at(5, 'shell', 'clearElement', 'the selected piece is let go; its cabinet stays');
  if (s.cabinet) return at(6, 'shell', 'clearSelection', 'the selected cabinet is let go; the pin stays as it is');
  return at(0, null, null, 'nothing to step out of');
}

/** Each shell action through the store's own name (uiStore), or the registry above. */
const DEFAULT_ACTIONS = Object.freeze({
  cancelCentreBetween: (ui) => ui.cancelCentreBetween?.(),
  closePopup: () => closeTopStudioPopup(),
  closeHistory: (ui) => ui.closeHistory?.(),
  stopNotchPick: (ui) => ui.stopNotchPick?.(),
  stopEdgeNotchPick: (ui) => ui.stopEdgeNotchPick?.(),
  clearElement: (ui) => ui.clearElement?.(),
  clearSelection: (ui) => ui.clearSelection?.(),
});

/**
 * Install the shell's one Escape owner.
 *
 * @param {object} args
 *   getUi    () => the uiStore's state (`useUiStore.getState`), read at the press
 *   getDom   (event, doc) => the document's facts; `readEscapeDom` by default
 *   actions  a SHELL_ACTIONS name => (ui, { event, dom, doc }) to replace one
 *            default (a test's spy); unnamed ones are the store's own actions
 *   target   where the listener goes (`window`)
 *   doc      the document `getDom` reads
 *   onStep   told every decision (a walk, a test); never required
 * @returns {() => void} the removal
 */
export function installStudioEscape({
  getUi,
  getDom = readEscapeDom,
  actions = {},
  target = (typeof window === 'undefined' ? null : window),
  doc = (typeof document === 'undefined' ? null : document),
  onStep = null,
} = {}) {
  if (!target || typeof target.addEventListener !== 'function') return () => {};
  const onKey = (event) => {
    if (!event || event.key !== 'Escape') return;
    const ui = (typeof getUi === 'function' ? getUi() : null) || {};
    const dom = (typeof getDom === 'function' ? getDom(event, doc) : null) || {};
    const step = escapeStep(escapeSnapshot({
      event, ui, dom, popups: studioPopupsOpen(),
    }));
    if (typeof onStep === 'function') onStep(step);
    if (step.owner !== 'shell' || !SHELL_ACTIONS.includes(step.action)) return;
    const own = actions && typeof actions[step.action] === 'function' ? actions[step.action] : null;
    const run = own || DEFAULT_ACTIONS[step.action];
    // One press, one action: the shell answered it, so nothing after it does.
    event.stopImmediatePropagation?.();
    run(ui, { event, dom, doc });
  };
  // The options object, not a bare `true`: a removal must name the capture
  // flag the same way in every host (Node's EventTarget, the tests' window,
  // reads only the object form when it removes).
  const CAPTURE = { capture: true };
  target.addEventListener('keydown', onKey, CAPTURE);
  return () => target.removeEventListener('keydown', onKey, CAPTURE);
}
