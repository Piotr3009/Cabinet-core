// ─── HOW A FRONT OPENS (turn 44, CLAUDE.md F5) ──────────────────────────────
//
// The owner's list, baked into the spec as law for the night:
//
//   *"opening options are exactly `push-to-open / handles / knobs / J-handle`
//   — no separate 'pull'."*
//
// Four buttons, and NOT four new fields. Every one of them is already a fact
// this project carries, written by some other surface since turn 18:
//
//   push-to-open  `design.runners.variant === 'T'` — the MOVENTO TIP-ON the
//                 Hardware step's Push-to-open switch has written since T32.
//   handles       `design.fronts.handle = { type: 'bar' }` — the bar handle
//                 `engine/handles.js` fits and the BOM counts.
//   knobs         `design.fronts.handle = { type: 'knob' }`.
//   J-handle      front style `HJ` (Handleless J-type) — a SHAPE, which is
//                 what a J-handle is: the door is machined, nothing is screwed
//                 to it.
//
// Inventing an `opening` field beside those four would have been a fifth truth
// about the same question, and turn 12's lesson — one surface, one setter — is
// the reason this file is a TRANSLATION and not a store.
//
// ─── TURN 45 (CLAUDE.md F5): AND THE HANDLES NOW SETTLE THE RUNNERS ────────
//
// *"Any handles chosen (J-pull / bar / knobs / any hands) → push-to-open is
// forced OFF and LOCKED."* Three of the four openings put something on the door
// for a hand to hold, and a TIP-ON drawer under a handle is a drawer that comes
// out on the pull and re-latches on the next push — an order nobody can fill.
//
// So `frontOpeningPatch` writes the runner variant on the way past. It is the
// SAME field push-to-open has always been (`design.runners.variant`, T18), the
// rule that decides it is `lib/pushToOpen.js`, and both facts move in one write
// and one undo step — which is why the BOM needs no sentence of its own to
// "follow the lock": it reads the field it always read.
//
// Pure functions over a migrated design. `src/engine/**` is closed byte-for-
// byte tonight (iron rule 2) and this is UI law anyway.

import { lockPatchFor } from './pushToOpen.js';

/** The four, in the owner's own order and his own words. */
export const FRONT_OPENINGS = [
  { id: 'push', label: 'Push-to-open', hint: 'No handle at all — MOVENTO TIP-ON on the drawers.' },
  { id: 'handles', label: 'Handles', hint: 'A bar handle, screwed on. The BOM counts one per front.' },
  { id: 'knobs', label: 'Knobs', hint: 'A knob, screwed on.' },
  { id: 'jhandle', label: 'J-pull handleless', hint: 'Machined into the front\'s own edge — nothing is screwed on.' },
];

export const FRONT_OPENING_IDS = FRONT_OPENINGS.map((o) => o.id);

/**
 * The shape id a J-handle USED TO BE — kept for the projects that carry it.
 *
 * ─── TURN 57 (CLAUDE.md, THE DOCTRINE CORRECTED IN THE OPEN) ────────────────
 *
 * This file's own comment above calls a J-handle "a SHAPE, which is what a
 * J-handle is". That was wrong, and it is corrected here rather than quietly
 * rewritten: a J-pull is a HANDLE SYSTEM — how the front is HELD — and the
 * face pattern is a separate axis entirely. Putting the J on the pattern axis
 * made "shaker AND J-pull" unsayable, and a grooved door with a J edge is a
 * kitchen the owner sells.
 *
 * So `jhandle` now writes `fronts.handle = { type: 'jpull' }` (engine/handles.js
 * — the module that has owned "how is this front gripped" since turn 25) and
 * leaves the STYLE alone. `HJ` stays declared, and stays READ, because every
 * project saved before tonight says `style: 'HJ'` and must go on reading as a
 * J-pull kitchen.
 */
export const J_HANDLE_STYLE = 'HJ';

/**
 * Which of the four this project is on.
 *
 * T57: the HANDLE SYSTEM is asked first, because that is where the answer now
 * lives. The `HJ` style is still read after it, and only after it, so a
 * project saved before tonight still opens on J-pull — and one saved since
 * reads the same whatever shape its fronts are, which is the whole point of
 * putting the J on its own axis.
 *
 * @param {object} design a MIGRATED design (engine/design.js migrateDesign)
 * @returns {'push'|'handles'|'knobs'|'jhandle'}
 */
export function frontOpening(design) {
  const type = design?.fronts?.handle?.type;
  if (type === 'jpull') return 'jhandle';
  if (type === 'bar') return 'handles';
  if (type === 'knob') return 'knobs';
  if (design?.fronts?.style === J_HANDLE_STYLE) return 'jhandle';
  return 'push';
}

/**
 * The design PATCH that puts this project on one of the four.
 *
 * Returns exactly the fields that have to move — `setDesign` merges, so a patch
 * that named everything would overwrite decisions nobody asked about. The
 * caller passes the migrated design in so the front block is rebuilt whole
 * (`fronts` is a nested object and a partial merge of it would drop the types).
 *
 * @returns {object} a patch for `useProjectStore().setDesign`
 */
export function frontOpeningPatch(design, id, { previousStyle = null } = {}) {
  const fronts = { ...(design?.fronts || {}) };
  const runners = { ...(design?.runners || {}) };
  // T45 F5: what the handles have to say about the runners, if anything. Null
  // for push-to-open, which is the one opening that does not settle them.
  const lock = lockPatchFor(design, id);

  if (id === 'jhandle') {
    // T57: the HANDLE, not the shape. The style is left exactly as the person
    // chose it — a shaker door with a J edge is a shaker door with a J edge —
    // and the engine machines the leaf's own edge off `handle.type`.
    return { fronts: { ...fronts, handle: { type: 'jpull' } }, ...lock };
  }

  // Leaving the J-handle means the door goes back to a shape somebody chose,
  // and there is no such thing as "un-machine it" — the project's previous
  // shape, or Flat, which is the plain slab every other opening is fitted to.
  const style = fronts.style === J_HANDLE_STYLE
    ? (previousStyle && previousStyle !== J_HANDLE_STYLE ? previousStyle : 'F')
    : fronts.style;

  if (id === 'handles') {
    const centres = Number(design?.fronts?.handle?.centres);
    return {
      fronts: {
        ...fronts,
        style,
        handle: { type: 'bar', ...(centres > 0 ? { centres } : {}) },
      },
      ...lock,
    };
  }
  if (id === 'knobs') {
    return { fronts: { ...fronts, style, handle: { type: 'knob' } }, ...lock };
  }
  // push-to-open: no handle, and the drawers go on TIP-ON — the same field the
  // Hardware step's own switch writes, so the two can never disagree.
  return {
    fronts: { ...fronts, style, handle: null },
    runners: { ...runners, variant: 'T' },
  };
}

/** What the chosen opening is CALLED, for the summary. */
export function frontOpeningLabel(id) {
  return FRONT_OPENINGS.find((o) => o.id === id)?.label || 'Push-to-open';
}
