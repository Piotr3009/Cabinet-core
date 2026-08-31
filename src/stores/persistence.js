// ─── TURN 59 · WHERE THE STORES ARE ALLOWED TO WRITE ───────────────────────
//
// CLAUDE.md F3.7, verbatim:
//
//   *"The retail app runs the SHARED `projectStore` and `uiStore` (they are the
//   brain, not the face) in a **memory-only mode**: none of PRO's localStorage
//   keys, none of PRO's Supabase, ever. If the store persists unconditionally
//   today, add a documented `persistence: 'none'` mode to the shared core
//   (additive; PRO keeps its default)."*
//
// It does persist unconditionally. `projectStore` reads `cc.project.cache.v1`
// at MODULE LOAD and writes it on every change; `uiStore` reads and writes five
// more keys. A client designing a wardrobe on the PBI site would therefore open
// the joiner's last kitchen and then overwrite it — which is not a bug in a
// preference, it is a stranger in the workshop's files.
//
// ─── TWO MODES, AND THE DEFAULT IS TODAY ───────────────────────────────────
//
//   'local'  every key read and written exactly as before.  ← PRO, the default
//   'none'   nothing read, nothing written, nothing left behind.
//
// PRO never calls `setPersistence`, so PRO's behaviour is byte-identical and
// `test/turn59-f3-the-design-room.test.js` proves it by reading every
// localStorage call site in both stores.
//
// ─── WHY A MODULE AND NOT A STORE FIELD ────────────────────────────────────
//
// Because the FIRST read happens while `projectStore.js` is still being
// evaluated — `const cached = loadCache()` at the top level, before any store
// exists to hold a field. A module flag is the only kind of switch that can be
// thrown before that line runs, and it is thrown by an entry point importing
// THIS module and calling the setter before it imports the store (see
// src/retail/main-retail.jsx, which uses a dynamic import to guarantee exactly
// that order).

export const PERSISTENCE_MODES = ['local', 'none'];

let mode = 'local';

/** 'local' (PRO, and the default) or 'none' (PBI retail — memory only). */
export const persistenceMode = () => mode;

/** True when a store may touch localStorage at all. */
export const persistenceOn = () => mode === 'local';

/**
 * Choose the mode for THIS page, once, before the stores are imported.
 * An unknown value is refused rather than silently taken, because a typo here
 * would quietly hand a client PRO's cache.
 */
export function setPersistence(next) {
  if (!PERSISTENCE_MODES.includes(next)) {
    throw new Error(`persistence must be one of ${PERSISTENCE_MODES.join(', ')} — got ${next}`);
  }
  mode = next;
  return mode;
}
