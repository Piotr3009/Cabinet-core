// ─── TURN 54 (CLAUDE.md F6): DIMENSIONS GO TO SLEEP AFTER 30 SECONDS ────────
//
// The owner: *"wyłączenie dimension po 30 sekundach lub po minucie."* First
// number wins — **30 000 ms**, a profile constant (`ui.dimensionsIdleMs`),
// veto "60".
//
// The law, in three sentences: while dimensions are SHOWN, any interaction
// (pointer down or move over the canvas, a key, a camera move — every one of
// which arrives as a pointer or wheel gesture) resets the clock; at 30 s of
// quiet the app flips the EXISTING Hide-dimensions toggle OFF through the
// same store action the button calls, so Undo and state stay coherent. No
// timer runs while they are already hidden, nothing persists across
// sessions, and the timer never turns dimensions ON.
//
// It is a MODULE, not an effect, so the clock can be tested with fake timers
// and the page owns only the wiring: `create` hands back `touch` (any
// interaction) and `cancel` (manual hide, unmount).

/**
 * @param {object} args
 *   idleMs  how long the quiet has to last — the profile's 30 000
 *   hide    what "go to sleep" does: the store's own setShowDimensions(false)
 * @returns {{ touch: () => void, cancel: () => void, armed: () => boolean }}
 */
export function createDimensionSleep({ idleMs, hide }) {
  const ms = Number(idleMs) > 0 ? Number(idleMs) : 30000;
  let timer = null;
  const cancel = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const fire = () => {
    timer = null;
    hide();
  };
  const touch = () => {
    cancel();
    timer = setTimeout(fire, ms);
  };
  return { touch, cancel, armed: () => timer != null };
}

/** The profile's number, with the owner's 30 000 where nobody has said. */
export function dimensionsIdleMs(profile) {
  const v = Number(profile?.ui?.dimensionsIdleMs);
  return Number.isFinite(v) && v > 0 ? v : 30000;
}
