// ─── VALIDATION TAKES NO HOSTAGES (turn 45, CLAUDE.md F7) ───────────────────
//
// The owner, 23.08.2026, on what T44's validation did to him:
//
//   *"musiałem wszystko od nowa przechodzić — to jest chore."*
//
// He had set a wardrobe taller than the room. The wizard would not let him
// leave step 5, said so in a tooltip on a disabled button, and named nothing
// he could act on; the fix was in the ROOM, two steps back, and going back
// there put him at the start of the walk with the tabs forgotten.
//
// F7 is three sentences, and all three are about the same thing — a program
// that finds a problem owes you the way to it:
//
//   *"A cross-tab conflict (wardrobe taller than the room) = a red note AT THE
//   FIELD naming the culprit + a one-click jump to it (Wall/Room).
//   Fixing it returns the user STRAIGHT to where they were (Summary included).
//   Every earlier choice survives — nothing resets, nothing re-asks.
//   Next validates ONLY the current tab. Visited tabs stay clickable through
//   any error state."*
//
// ─── WHAT THIS FILE IS, AND WHAT IT IS NOT ──────────────────────────────────
//
// It is a READER. It names the conflicts a project currently has, which FIELD
// each one belongs beside, and which SCREEN holds the culprit. It writes
// nothing, it disables nothing, and it does not decide whether the job may
// start — `engine/projectSettings.js wizardStartBlockers()` has answered that
// since T32 and still does, unedited (iron rule 2).
//
// The two are deliberately the same list seen from two ends: the blocker says
// "this job cannot start and here is why", the conflict says "here is the field
// it is about and here is the door to the fix". A second opinion about what is
// wrong is exactly what the owner would have to walk twice.
//
// Pure — no React, no store. `src/engine/**` is closed byte-for-byte tonight.

import { ceilingFit, wardrobeStack } from '../engine/projectSettings.js';

/**
 * WHICH SCREEN a culprit lives on, and what the button says.
 *
 * A one-wall job's room height is set on the wall's ELEVATION; a whole-room
 * job's is set in the room editor. Same fact, two doors, and the jump has to
 * open the one this job actually walked through — sending a one-wall joiner to
 * a plan editor he has never seen would be a second kind of hostage-taking.
 */
export function culpritScreen(scope) {
  return scope === 'wall'
    ? { step: 'wall', label: 'the wall' }
    : { step: 'room', label: 'the room' };
}

/**
 * Every cross-tab conflict this project currently has.
 *
 * @param {object} args
 *   design      a MIGRATED design
 *   heights     already resolved through `projectHeights`
 *   roomHeight  the room's own, in mm
 *   profile     the workshop profile
 * @returns {Array<{code, field, tab, message, culprit, culpritLabel, jumpLabel}>}
 *   `field` is the `data-wizard-dim` the note belongs beside; `tab` is the
 *   sub-tab that field is on, so a summary can offer the same jump.
 */
export function crossTabConflicts({
  design, heights, roomHeight, profile,
}) {
  const out = [];
  const scope = design?.scope === 'wall' ? 'wall' : 'room';
  const where = culpritScreen(scope);
  const isWardrobe = design?.projectType === 'wardrobe';
  if (!isWardrobe) return out;

  const stack = wardrobeStack(heights);
  const fit = ceilingFit({ total: stack.total, roomHeight, profile });
  const room = Math.round(Number(roomHeight) || 0);

  if (fit.state === 'over') {
    out.push({
      code: 'over-ceiling',
      field: 'tall',
      tab: 'ustawienia',
      // NAMING THE CULPRIT is the whole point of the sentence: the wardrobe is
      // 2200, the ROOM is 2100, and one of those two numbers is the one that
      // is wrong. The note says both, so the hand knows which it means to
      // change before it has gone anywhere.
      message: `Total item ${stack.total} mm is ${Math.abs(fit.gap)} mm taller than the ${room} mm ${where.label}.`
        + ` Lower the wardrobe or the plinth here — or raise ${where.label}.`,
      culprit: where.step,
      culpritLabel: where.label,
      jumpLabel: `Fix ${where.label}…`,
    });
  }

  if (fit.state === 'question' && design?.ceiling !== 'flush' && design?.ceiling !== 'infill') {
    out.push({
      code: 'ceiling-question',
      field: 'tall',
      tab: 'ustawienia',
      message: `Only ${fit.gap} mm to the ceiling — answer the question below: to the ceiling, with no infill?`,
      // This one has NO culprit anywhere else: the answer is on this very
      // screen, three lines down. A jump button here would be a door to a room
      // the user is already standing in.
      culprit: null,
      culpritLabel: null,
      jumpLabel: null,
    });
  }

  return out;
}

/** The conflicts that belong beside one field — usually none, sometimes one. */
export function conflictsAtField(conflicts, field) {
  return (Array.isArray(conflicts) ? conflicts : []).filter((c) => c.field === field);
}

/** The conflicts a given sub-tab carries, for a strip that wants to say so. */
export function conflictsOnTab(conflicts, tab) {
  return (Array.isArray(conflicts) ? conflicts : []).filter((c) => c.tab === tab);
}

/**
 * Is THIS tab's own answer complete? — F7's *"Next validates ONLY the current
 * tab"*, stated as a function so no surface has to decide it twice.
 *
 * A conflict on tab 5.1 is not tab 5.3's business, and a missing board on the
 * fronts is not a reason a joiner may not go and look at what he typed on 5.1.
 * The only things that gate a Next are the two container SAVES, which are that
 * tab's own answer, and they are the caller's to pass in.
 */
export function tabIsBlocked(tabId, { carcassesSaved = true, frontsSaved = true } = {}) {
  if (tabId === 'carcases') return !carcassesSaved;
  if (tabId === 'fronts') return !frontsSaved;
  return false;
}
