// ─── THE EDITOR'S NAVIGATION STACK (turn 23, CLAUDE.md F1) ──────────────────
//
// The owner, for the third session running: "from the part detail there is no
// way BACK — only killing the whole editor and starting over."
//
// It kept dying in collection because every previous answer was LOCAL. Turn 17
// gave the cabinet editor a Back that returns from ONE ELEMENT to the cabinet —
// that one works and still does — but the moment the part DETAIL opened, the
// editor was simply replaced: `openModal('part-detail', …)` overwrote `modal`,
// the cabinet window unmounted with everything it was holding, and the only
// door out was ×.
//
// So this turn does not add a third Back button. It adds the thing whose ABSENCE
// is the bug: a STACK, one implementation, and every nested editor surface
// registers onto it rather than keeping a history of its own.
//
//   cabinet editor  →  part detail  →  (future: drawer editor → its part detail)
//
// PUSH on entering a nested view. POP restores the previous view EXACTLY as it
// was left, which is why a frame carries a SNAPSHOT and not just a name: the
// unit, the camera, the selection and the scroll are the view's own state and
// would otherwise die with its unmount. The shell asks the outgoing view for
// that snapshot at the moment it is suspended and hands it straight back when
// it is resumed.
//
// PURE FUNCTIONS OVER ONE PLAIN OBJECT. Nothing here imports React or a store —
// this is arithmetic on view state, so the whole of F1's behaviour is testable
// without a browser, which is exactly what CLAUDE.md's TESTS section asks for
// ("the navigation stack (push/pop/Esc as arithmetic on view state)").
//
// THE SHAPE
//
//   {
//     view:    'cabinet' | 'part-detail' | … | null   — what is on screen NOW
//     args:    whatever that view was opened with
//     stack:   [{ view, args, state }]  — the SUSPENDED parents, oldest first
//     restore: the snapshot handed back to `view` when it was resumed, or null
//   }
//
// `restore` is deliberately a field of the nav and not of the frame: a view that
// has just been popped back to needs to be told once, on the way in, and a view
// opened fresh must never see a stale one.

/** Nothing open: no view, no parents, nothing to restore. */
export const EMPTY_NAV = Object.freeze({
  view: null, args: null, stack: [], restore: null,
});

/** Defensive: a partial or missing nav reads as the empty one. */
function asNav(nav) {
  if (!nav || typeof nav !== 'object') return EMPTY_NAV;
  return {
    view: nav.view ?? null,
    args: nav.args ?? null,
    stack: Array.isArray(nav.stack) ? nav.stack : [],
    restore: nav.restore ?? null,
  };
}

/**
 * OPEN a view at the TOP LEVEL — the cabinet editor from the right-click menu,
 * a colour picker, the room dialog.
 *
 * It CLEARS the stack, and that is the rule that keeps the class of bug dead:
 * a top-level open is a new journey, so a Back button can never lead back into
 * a window the joiner left three gestures ago. "The top level has no Back"
 * (F1.2) is this line and nothing else.
 */
export function openNav(nav, view, args = null) {
  void nav;
  if (!view) return { ...EMPTY_NAV };
  return {
    view, args, stack: [], restore: null,
  };
}

/**
 * PUSH a nested view over the current one.
 *
 * @param {object} nav
 * @param {string} view      the nested surface's modal name
 * @param {*} args           what it is about
 * @param {*} snapshot       how the OUTGOING view was left, from its own getter
 */
export function pushNav(nav, view, args = null, snapshot = null) {
  const now = asNav(nav);
  if (!view) return now;
  // Nothing open yet is not a push, it is an open: pushing onto air would
  // leave a Back button that goes nowhere.
  if (!now.view) return openNav(now, view, args);
  return {
    view,
    args,
    stack: [...now.stack, { view: now.view, args: now.args, state: snapshot ?? null }],
    restore: null,
  };
}

/**
 * POP one level — the ← Back button, and Escape.
 *
 * With no parent this is a CLOSE, which is the honest answer for the top level:
 * Escape on the cabinet editor has closed the window since turn 12 and this
 * does not change it. With a parent, the parent comes back with the snapshot it
 * was suspended holding.
 */
export function popNav(nav) {
  const now = asNav(nav);
  if (!now.stack.length) return { ...EMPTY_NAV };
  const parent = now.stack[now.stack.length - 1];
  return {
    view: parent.view,
    args: parent.args,
    stack: now.stack.slice(0, -1),
    restore: parent.state ?? null,
  };
}

/** Everything closes: the whole journey, not one level of it (Done / ×). */
export function closeNav() {
  return { ...EMPTY_NAV };
}

/** How deep we are. 0 = nothing open, 1 = a top-level view, 2 = one nested. */
export function navDepth(nav) {
  const now = asNav(nav);
  return now.view ? now.stack.length + 1 : 0;
}

/** Is there a level to go back TO? Drives whether ← Back is rendered at all. */
export function canGoBack(nav) {
  return navDepth(nav) > 1;
}

/** What the Back button goes back to, for its label and its title text. */
export function parentView(nav) {
  const now = asNav(nav);
  return now.stack.length ? now.stack[now.stack.length - 1].view : null;
}
