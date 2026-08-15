// ─── SAYING WHAT THE HINGE SETTER SAID (turn 31, CLAUDE.md F3) ──────────────
//
// `setHingePos` and `addHinge` refuse a row that would land closer than
// `hingeMinSpacingMm` to another (60, the owner's number). CLAUDE.md: "Blocked
// move = yellow message with the number."
//
// Two components edit hinges — the door window's section B and the right
// panel's element properties — and they are the same gesture asked twice. This
// is the one line both of them say it with, rather than each remembering to.
//
// It carries no rule of its own: the store decides what is refused and writes
// the sentence (which is where the number lives, and where the guard reads it
// from). This only routes the answer to the message queue at the right level.

/**
 * @param {number|object|null} result  whatever the setter returned
 * @param {Function} notify            uiStore's notify
 * @returns {number|null} where the hinge ended up, or null if it did not move
 */
export function sayHingeResult(result, notify) {
  if (result == null || typeof result === 'number') return result;
  // YELLOW: this is a judgement for the joiner — the move is refused and the
  // ladder is exactly as it was — not an error the app has suffered.
  if (result.message) notify?.(result.message, 'warn');
  return result.blocked ? null : (result.pos ?? null);
}
