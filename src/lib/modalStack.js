// ─── ONE ROW OF NAVIGATION AT A TIME (turn 49, CLAUDE.md F3) ────────────────
//
// The owner, 25.08.2026, with the screenshot in his hand: *"jak mamy otwarty
// modal to inne przyciski z glownego modalu nie powinny byc widoczne, to sie
// myli."* Two Backs and two Nexts, stacked within an inch of each other, and he
// pressed the wrong one.
//
// F3's rule, verbatim: *"The open dialog covers the one beneath it, or the
// lower one's footer is hidden while a child is open — either way, EXACTLY ONE
// ROW OF NAVIGATION is visible at any moment."*
//
// This module is the second of those two, and it is implemented ONCE — here and
// in `components/Modal.jsx` — for the same reason rule 15 is implemented once:
// every window in this app goes through the shell, so a rule the shell knows is
// a rule the app cannot break by forgetting. A per-modal `{!childOpen && …}`
// would be true of the windows whose author remembered it and quietly false of
// the rest, which is exactly the state turn 31 found the z-order in.
//
// WHAT IT IS NOT: it is not Back's behaviour. F3 says so in as many words —
// *"Do not touch Back's behaviour … the step-back logic is correct today and
// the confusion was two buttons, not one wrong button."* Nothing here decides
// where any button GOES. It decides only whether a covered window's footer is
// DRAWN, and the × in its header and the Escape key are untouched, so no window
// is ever made unreachable by being covered.
//
// ─── WHY A SEQUENCE AND NOT A COUNT ─────────────────────────────────────────
//
// "Which window is on top" has to be answered by RENDER order, not by effect
// order. React runs effects bottom-up — a child's mount effect fires BEFORE its
// parent's — so a stack built in `useEffect` would, in any commit that mounts
// both at once, decide the child was underneath and hide the wrong footer. It
// renders top-down, though, always: a parent renders before the child it
// contains. So each window takes its sequence number on its FIRST RENDER
// (`useState(() => nextWindowSeq())` in the shell, a lazy initialiser that runs
// once) and the highest number open is the window on top.
//
// Pure JS: no React, no store, no engine — the shell subscribes to it.

let seq = 0;
let open = [];
const listeners = new Set();

const emit = () => { for (const fn of listeners) fn(); };

/** The next render-order ticket. Taken once per window, on its first render. */
export function nextWindowSeq() {
  seq += 1;
  return seq;
}

/** This window is on screen. */
export function openWindow(id) {
  if (open.includes(id)) return;
  open = [...open, id];
  emit();
}

/** …and it is gone. */
export function closeWindow(id) {
  if (!open.includes(id)) return;
  open = open.filter((x) => x !== id);
  emit();
}

/** Every window currently on screen, by ticket. The array identity changes only
 *  when the set does, which is what `useSyncExternalStore` needs of a snapshot. */
export function openWindows() {
  return open;
}

/** Told when that list changes. Returns its own unsubscribe. */
export function subscribeWindows(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * Is there a window OVER this one?
 *
 * @param {number} id    this window's ticket
 * @param {number[]} list  the open set — passed in so this stays a pure
 *                         function a node test can hold to its word
 */
export function isCovered(id, list = open) {
  return (list || []).some((other) => other > id);
}

/** For a test that has just proved something about a stack it built itself. */
export function resetWindows() {
  open = [];
  seq = 0;
  emit();
}
