// ─── ONE DIRTY GATE (turn 31, CLAUDE.md F2) ─────────────────────────────────
//
// The owner's number, and it is the whole argument: 77 of the project store's
// 137 actions each remembered to write `dirty: true`, and 60 forgot. A
// forgotten flag is not a cosmetic fault — the dot beside the project name is
// how a joiner knows there is work to save, so a mutation that does not raise
// it is work that gets closed away silently. Sixty of them.
//
// It kept happening because the flag was a CONVENTION. Every new action had to
// remember a line that has nothing to do with what the action does, and the
// suite could not catch a missing one: there is no test for "and it also set
// this unrelated boolean" that anybody writes 137 times.
//
// So the flag stops being a convention and becomes a GATE. Zustand hands its
// config a `set`; this wraps it, and any write that changes the PROJECT or its
// UNITS raises the flag on the way past. The 77 hand-written repeats are
// deleted, the 60 forgotten ones are fixed by the same stroke, and an action
// written next year inherits it without knowing this file exists.
//
// ─── THE ONE THING AN ACTION CAN STILL SAY ──────────────────────────────────
//
// A patch that mentions `dirty` ITSELF is left exactly alone. That is not a
// loophole, it is the vocabulary the three honest exceptions already speak:
//
//   loadProject   opens a file — the project is now what is on disk
//   newProject    a blank job
//   markSaved     it has just been written
//
// All three already wrote `dirty: false` before this file existed, so they need
// no change and no list of names lives here. A gate that carried a hard-coded
// list of "clean actions" would be the same convention again, one level up.
//
// ─── WHY IT WATCHES THE DATA RATHER THAN COUNTING CALLS ─────────────────────
//
// The flag means "the project on screen differs from the project that was
// saved", so the fact that decides it is whether `project` or `units` CHANGED —
// not whether an action ran. A setter that computes the same value it already
// had (a drag that lands back on the millimetre it started on, a no-op
// refreshAutoParts) leaves both references alone and leaves the flag alone,
// which is the honest answer. Reference identity is the right test because this
// store is written immutably throughout: every real mutation builds a new
// object, and nothing mutates one in place.
//
// Pure: no React, no engine, no three.js.

/** The two fields of this store that ARE the project. */
export const PROJECT_KEYS = Object.freeze(['project', 'units']);

/**
 * Does this patch change the saved document?
 *
 * @param {object} prev   the state before
 * @param {object} patch  what is about to be written
 */
export function touchesProject(prev, patch) {
  if (!patch || typeof patch !== 'object') return false;
  return PROJECT_KEYS.some((k) => Object.hasOwn(patch, k) && patch[k] !== prev?.[k]);
}

/**
 * What the gate actually writes.
 *
 * Split out from the middleware so the RULE is testable without a store: given
 * a state and a patch, this is the patch that lands.
 */
export function gatePatch(prev, patch) {
  if (!patch || typeof patch !== 'object') return patch;
  // The action said so itself — loadProject, newProject, markSaved.
  if (Object.hasOwn(patch, 'dirty')) return patch;
  if (!touchesProject(prev, patch)) return patch;
  return { ...patch, dirty: true };
}

/**
 * The zustand middleware.
 *
 * `api.setState` is replaced as well as the `set` handed to the config, because
 * the store is written from outside too — `historyStore` restores a snapshot
 * through `useProjectStore.setState`, and an undo is a change to the project
 * like any other.
 *
 * @param {Function} config  the ordinary zustand store creator
 */
export function dirtyGate(config) {
  return (set, get, api) => {
    const gated = (partial, replace) => {
      const prev = get();
      const patch = typeof partial === 'function' ? partial(prev) : partial;
      return set(gatePatch(prev, patch), replace);
    };
    api.setState = gated;
    return config(gated, get, api);
  };
}
