// ─── PUSH-TO-OPEN OBEYS THE HANDLES (turn 45, CLAUDE.md F5) ─────────────────
//
// The owner, 23.08.2026, eye-test verdict:
//
//   *"Any handles chosen (J-pull / bar / knobs / any hands) → push-to-open is
//   forced OFF and LOCKED, with a one-line reason under it. Handleless →
//   available as before. The BOM follows the lock."*
//
// It is not a preference; it is a fact about the ironmongery. A TIP-ON drawer
// opens when you push the front, and a front with a handle screwed to it is a
// front somebody is going to pull — the drawer comes out on the pull, and then
// the next push re-latches it. Blum's own fitting instruction says the same in
// three languages. A screen that let a joiner tick both was a screen that let
// him order a job that cannot be built.
//
// ─── NOT A NEW FIELD (T44 F5's law, still standing) ─────────────────────────
//
// `lib/frontOpening.js` translates the four openings into fields the project
// already carries, and push-to-open is one of them: `design.runners.variant`,
// 'T' for MOVENTO TIP-ON and 'S' for the soft-close runner, written since T18
// and read by the BOM through `engine/runners.js resolveRunnerVariant()`.
//
// So the lock does not invent a flag to be obeyed. It WRITES THE VARIANT — 'S'
// the moment a handle is chosen — which is why "the BOM follows the lock" needs
// no second sentence anywhere: the BOM reads the field it always read, and the
// field says soft-close because a handle is on the door.
//
// Pure functions over a migrated design. `src/engine/**` is closed byte-for-
// byte tonight (iron rule 2), and this is UI law in any case.

import { frontOpening } from './frontOpening.js';

/** The soft-close runner, and the TIP-ON — the two ids T18 gave the field. */
export const SOFT_CLOSE_VARIANT = 'S';
export const TIP_ON_VARIANT = 'T';

/** The three openings that put something on the door for a hand to hold. */
export const HANDLED_OPENINGS = ['handles', 'knobs', 'jhandle'];

/** What each of them is called where the reason has to name it. */
const HANDLE_WORDS = {
  handles: 'Handles are on the fronts',
  knobs: 'Knobs are on the fronts',
  jhandle: 'The fronts are machined with a J-pull',
};

/**
 * Is this project's push-to-open LOCKED, and why?
 *
 * @param {object} design a MIGRATED design (engine/design.js migrateDesign)
 * @returns {{locked: boolean, opening: string, reason: string|null}}
 *   `reason` is the ONE LINE the surface prints under the control. It is here
 *   and not in the `.jsx` for the same reason every rule in this house is: two
 *   surfaces ask (the hardware tab and the summary) and a sentence written
 *   twice is a sentence that will one day say two things.
 */
export function pushToOpenLock(design) {
  const opening = frontOpening(design);
  if (!HANDLED_OPENINGS.includes(opening)) {
    return { locked: false, opening, reason: null };
  }
  return {
    locked: true,
    opening,
    reason: `${HANDLE_WORDS[opening]} — push-to-open cannot be fitted with a handle to pull.`,
  };
}

/** Is push-to-open ON for this project, as the field actually stands? */
export function pushToOpenOn(design, profile = null) {
  const variant = String(
    design?.runners?.variant || profile?.hardware?.runner?.movento?.defaultVariant || TIP_ON_VARIANT,
  ).toUpperCase();
  return variant === TIP_ON_VARIANT;
}

/**
 * The design PATCH that puts this project's runners where the handles allow.
 *
 * Called with `want = true` on a locked project it returns the LOCK's answer
 * ('S'), not the caller's — a control that is disabled in one surface must not
 * be settable from another, and the safe place to state that once is here.
 *
 * @returns {object} a patch for `useProjectStore().setDesign`
 */
export function pushToOpenPatch(design, want) {
  const { locked } = pushToOpenLock(design);
  const variant = (want && !locked) ? TIP_ON_VARIANT : SOFT_CLOSE_VARIANT;
  return { runners: { ...(design?.runners || {}), variant } };
}

/**
 * The patch that ENFORCES the lock on a design that has just been given
 * handles — merged into `frontOpeningPatch`'s own answer, so the two facts move
 * in one write and one undo step.
 *
 * Handleless returns nothing to enforce: push-to-open is available again, and
 * what it is set to is whatever it was set to. Turning the handles off must not
 * silently turn TIP-ON on for somebody who never asked for it.
 */
export function lockPatchFor(design, openingId) {
  if (!HANDLED_OPENINGS.includes(openingId)) return null;
  return { runners: { ...(design?.runners || {}), variant: SOFT_CLOSE_VARIANT } };
}
