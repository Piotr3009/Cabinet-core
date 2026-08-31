// ─── TURN 60 · F3 · WHAT A SINGLE CLICK LANDS ON ───────────────────────────
//
// The owner, of the client's design room:
//
//   *"jak naciśniemy na drzwi to się pojawi drzwi, jak na szafę to na szafę,
//   jak na półkę to półkę."*
//
// PRO answers that question differently, and deliberately. Turn 13's verdict,
// in `engine/elements.js`'s own words: *"clicking a cabinet must select the
// CABINET… A side, a top, a bottom, a back, A DOOR, an end panel is reached in
// the EDITOR window."* A joiner reaches a leaf by DOUBLE clicking it — turn
// 14's `opensOwnModal` — and that gesture is learnt, and it is right for a
// bench.
//
// It is not right for a client. Nobody double-clicks a wardrobe door, and a
// client who single-clicks one and gets nothing has been told the room does
// not work. So there are two answers to one question, and this module is where
// the application says which one it is asking.
//
//   workshop  `isMainViewElement` — the ADDED INTERIOR pieces and nothing
//             else. PRO's, and the DEFAULT, so PRO is byte for byte what it
//             was and cannot tell this file exists.
//   client    `opensOwnModal` — the same set PRO's DOUBLE click already opens:
//             the added interior pieces PLUS the ones hung on the carcass, a
//             door among them. Nothing new becomes selectable that was not
//             already reachable by a gesture; the gesture is what changes.
//
// ─── IT IS A BOOT-TIME CONSTANT, LIKE THE CHROME SWITCH ────────────────────
//
// Set once, at the entry, before the first render. `src/3d/UnitView.jsx` reads
// it inside its panel loop rather than before a hook, so a run-time change
// would not break React here — but two applications disagreeing about what a
// click means halfway through a session is not a state anybody wants to debug,
// and the chrome switch beside it carries the same rule for a stronger reason.

import { isMainViewElement, opensOwnModal } from '../engine/elements.js';

let mode = 'workshop';

/** Which question this page is asking. PRO: always 'workshop'. */
export const pickMode = () => mode;

/**
 * Ask the other one. Anything but the exact word 'client' restores PRO's
 * answer, so the switch cannot get stuck by a typo.
 */
export function setPickMode(next) {
  mode = next === 'client' ? 'client' : 'workshop';
  return mode;
}

/**
 * Does a SINGLE click land on this piece?
 *
 * Both branches are `engine/elements.js`'s own predicates — this file decides
 * WHICH ONE, and never what an element is.
 */
export function picksOnClick(panel) {
  return mode === 'client' ? opensOwnModal(panel) : isMainViewElement(panel);
}
