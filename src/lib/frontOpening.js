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
// Pure functions over a migrated design. `src/engine/**` is closed byte-for-
// byte tonight (iron rule 2) and this is UI law anyway.

/** The four, in the owner's own order and his own words. */
export const FRONT_OPENINGS = [
  { id: 'push', label: 'Push-to-open', hint: 'No handle at all — MOVENTO TIP-ON on the drawers.' },
  { id: 'handles', label: 'Handles', hint: 'A bar handle, screwed on. The BOM counts one per front.' },
  { id: 'knobs', label: 'Knobs', hint: 'A knob, screwed on.' },
  { id: 'jhandle', label: 'J-handle', hint: 'Machined into the door itself — the Handleless J-type shape.' },
];

export const FRONT_OPENING_IDS = FRONT_OPENINGS.map((o) => o.id);

/** The shape id a J-handle IS. */
export const J_HANDLE_STYLE = 'HJ';

/**
 * Which of the four this project is on.
 *
 * The J-handle is read FIRST because it is a shape: a door machined with a J
 * has no handle to screw on, so a leftover `handle` record under it is a stale
 * answer to a question the shape has already settled.
 *
 * @param {object} design a MIGRATED design (engine/design.js migrateDesign)
 * @returns {'push'|'handles'|'knobs'|'jhandle'}
 */
export function frontOpening(design) {
  if (design?.fronts?.style === J_HANDLE_STYLE) return 'jhandle';
  const type = design?.fronts?.handle?.type;
  if (type === 'bar') return 'handles';
  if (type === 'knob') return 'knobs';
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

  if (id === 'jhandle') {
    return { fronts: { ...fronts, style: J_HANDLE_STYLE, handle: null } };
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
    };
  }
  if (id === 'knobs') {
    return { fronts: { ...fronts, style, handle: { type: 'knob' } } };
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
