// ─── THE MODAL SHELL, MADE MANDATORY (turn 31, CLAUDE.md F1) ────────────────
//
// The owner's standing rule — "every modal draggable, opening BESIDE the
// clicked object" — has been PERMANENT since turn 12 ("na zawsze"), and turn 12
// implemented it once, properly, in `components/Modal.jsx`. What it never got
// was an AUTHORITY: nothing said a window had to use the shell, nothing said
// which floating surface sits over which, and nothing noticed when a modal
// opened with no idea what it was about. So the rule was true of the windows
// whose author remembered it and quietly false of the rest, and the difference
// was invisible until a joiner double-clicked a door and the panel landed on
// the door.
//
// This module is that authority, and it is deliberately three small things
// rather than a framework:
//
//   1. THE Z-ORDER, in one place. Turn 30's app had four opinions about it —
//      `z-30` on a library flyout, `z-40` on a modal, `z-40` again on the
//      toast, `z-50` on the right-click menu — each written in the component
//      that needed to be on top of whatever it happened to sit under that day.
//      One list, ordered by what a hand actually reaches for, and every
//      floating surface in the app takes its class from here.
//
//   2. THE REGISTRY. Every modal the app can open, and — the fact that
//      matters — whether it is ABOUT AN OBJECT. "Beside the clicked object" is
//      meaningless for a dialog about the whole project (Save as, Auth), and it
//      is the whole rule for a dialog about one door. Saying which is which in
//      one table is what lets the guard below be honest instead of noisy.
//
//   3. THE ANCHOR, normalised ONCE. Turn 11 shipped `{ at: {x, y} }` — a click
//      point — and turn 12 shipped `{ anchor: rect }`; ever since, four modals
//      have each carried their own line reconciling the two. One conversion,
//      in the store's own opener, and a modal reads `args.anchor` and nothing
//      else.
//
// ─── RULE 4: A GUARD SPEAKS, IT NEVER SILENTLY FIXES ────────────────────────
//
// `modalAnchorFault` REPORTS a modal that is about an object and was opened
// without one. It does not invent a rectangle, it does not fall back to the
// pointer's last known position, and it does not stop the modal opening — a
// window that refuses to open because its opener forgot an argument is a
// feature nobody can use. It returns a sentence; the store records it and the
// console prints it, and the fix is in the CALLER, where the object is.
//
// Pure data and pure functions: no React, no store, no three.js.

/**
 * ─── THE ONE Z-ORDER ─────────────────────────────────────────────────────
 *
 * Ordered by what has to be reachable when two surfaces want the same pixel:
 *
 *   inPanel  a control floating INSIDE a panel — the part editor's little
 *            drill box, the preview's own corner button. It contends with the
 *            panel's own content and with nothing else in the app.
 *   panel    the docked side panels, the canvas toolbar, the canvas overlays.
 *            Furniture; everything that floats free floats over them.
 *   chrome   the top bar. Over the panels, under anything that opens.
 *   flyout   a menu's sub-list — the library's group flyout. It belongs to the
 *            panel it grew out of and dies when anything else opens.
 *   modal    every window that goes through the shell.
 *   menu     the right-click menu and the menu bar's dropdowns. ABOVE a modal
 *            deliberately: a menu is opened FROM a window and its whole job is
 *            to be clicked, so a modal covering one would be a menu you cannot
 *            use.
 *   message  turn 31's message levels (F2). A RED that stays until it is
 *            clicked is the app's one way of saying "this is lost work", and a
 *            window on top of it is the app failing to say it.
 *
 * The classes are written as LITERALS because Tailwind's scanner reads source
 * text: a class assembled from a number at runtime is a class that never gets
 * generated, and the surface lands at `z-auto`.
 */
export const LAYER_CLASS = Object.freeze({
  inPanel: 'z-10',
  panel: 'z-20',
  chrome: 'z-30',
  flyout: 'z-[35]',
  modal: 'z-40',
  menu: 'z-50',
  message: 'z-[60]',
});

/** The same order as numbers, for tests and for anything that has to compare. */
export const LAYER_ORDER = Object.freeze({
  inPanel: 10, panel: 20, chrome: 30, flyout: 35, modal: 40, menu: 50, message: 60,
});

/** The class one named layer sits at. An unknown name is the modal layer. */
export function layerClass(name) {
  return LAYER_CLASS[name] || LAYER_CLASS.modal;
}

/**
 * ─── THE REGISTRY ────────────────────────────────────────────────────────
 *
 * `about` is the only column that decides behaviour:
 *
 *   'object'   this window is about something ON THE SCREEN — a cabinet, a
 *              door, a hinge, a part. It MUST be opened with an anchor, and a
 *              missing one is a fault the guard names.
 *   'project'  this window is about the whole job. It is still draggable and
 *              still takes an anchor when the gesture had one (the menu entry
 *              that opened it), but a centred dialog is the honest answer when
 *              it did not, and the shell already gives that.
 */
export const MODAL_KINDS = Object.freeze({
  room: { about: 'project', label: 'Room setup' },
  design: { about: 'project', label: 'Project settings' },
  auth: { about: 'project', label: 'Account & projects' },
  'company-defaults': { about: 'project', label: 'Company defaults' },
  'save-as': { about: 'project', label: 'Save as' },
  render: { about: 'project', label: 'Render' },
  drawing: { about: 'project', label: 'Drawing' },
  'new-project': { about: 'project', label: 'New project' },
  'hand-edits': { about: 'project', label: 'This part carries manual edits' },
  'save-template': { about: 'object', label: 'Save as template' },
  element: { about: 'object', label: 'Element' },
  cabinet: { about: 'object', label: 'Cabinet editor' },
  'part-detail': { about: 'object', label: 'Part detail' },
  'add-items': { about: 'object', label: 'Add items' },
  'unit-finish': { about: 'object', label: 'Unit finish' },
  // Turn 31 F8: the width/height figure on the canvas, double-clicked.
  'unit-size': { about: 'object', label: 'Cabinet size' },
});

/** Every modal name the app knows, as a list. */
export const MODAL_NAMES = Object.freeze(Object.keys(MODAL_KINDS));

/** Is this window about something on the screen? */
export function modalNeedsAnchor(name) {
  return MODAL_KINDS[name]?.about === 'object';
}

/** Is this a rectangle the shell can place against? */
export function isAnchor(a) {
  // `Number(null)` is 0 and `Number('')` is 0, so a bare `Number.isFinite` says
  // yes to a modal opened beside nothing at the top-left of the screen. A
  // coordinate has to BE a number.
  const ok = (v) => typeof v === 'number' && Number.isFinite(v);
  return Boolean(a) && ok(a.x) && ok(a.y);
}

/**
 * ─── ONE CONVERSION FROM A CLICK TO AN ANCHOR ────────────────────────────
 *
 * A click point is a rectangle of zero size — that has been the shell's
 * contract since turn 12 (`lib/modalAnchor.js anchorAtPoint`) — so the legacy
 * `{ at: {x, y} }` shape needs no special case anywhere downstream, only this
 * one line, once, on the way in.
 *
 * Everything else about the args is left exactly as the caller wrote it.
 */
export function withModalAnchor(args) {
  if (!args || typeof args !== 'object') return args;
  if (isAnchor(args.anchor)) return args;
  const at = args.at;
  if (!isAnchor(at)) return args;
  return {
    ...args,
    anchor: {
      x: Number(at.x),
      y: Number(at.y),
      width: Number(at.width) || 0,
      height: Number(at.height) || 0,
    },
  };
}

/**
 * The GUARD, and it speaks (rule 4).
 *
 * @returns {string|null} the sentence, or null when there is nothing to say.
 */
export function modalAnchorFault(name, args) {
  if (!name) return null;
  if (!MODAL_KINDS[name]) {
    return `Modal "${name}" is not in the registry (lib/modalLayer.js) — the shell cannot say whether it is about an object.`;
  }
  if (!modalNeedsAnchor(name)) return null;
  if (isAnchor(withModalAnchor(args)?.anchor)) return null;
  return `Modal "${name}" is about an object and was opened without an anchor — `
    + 'it will centre itself instead of standing beside what it is about. '
    + 'Pass anchor: anchorOfEvent(e) (or at: {x, y}) from the gesture that opened it.';
}
