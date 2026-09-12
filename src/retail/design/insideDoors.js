// ─── T69 F5 · INSIDE OPENS THE DOORS ───────────────────────────────────────
//
// CLAUDE.md, F5, verbatim:
//
//   *"Entering the INSIDE step (and the INSIDE view button) opens ALL doors —
//   drawers stay shut. Leaving restores the exact door states from before
//   (remember, don't reset — the T68 F7 pattern)."*
//
// It is T68 F7's law about a different pair of things, so it is T68 F7's
// SHAPE: one module, one `remembered`, one `apply` that reports what it did,
// and the restore puts back EXACTLY what was there — including a door that was
// already open, which must not be closed on the way out.
//
// ─── WHY DRAWERS STAY SHUT ─────────────────────────────────────────────────
//
// `openFronts` is one map for every moving face a unit has, and the drawers
// ride it (`uiStore`, T58 F6). What keeps them shut here is the ENGINE, which
// gives a drawer face a PART of its own: a door is `FRONT`, a drawer face is
// `DRAWER-FRONT`. So *"drawers stay shut"* is inherited rather than invented —
// the filter is the one `DesignRoom` has always used — and it is asserted from
// both sides in the test, because a law that is true by accident is a law that
// a later turn will break without noticing.
//
// An APPLIANCE face is filtered too, and that one IS this module's own: it is a
// `FRONT`, it is screwed to a machine's own door, and a client is not looking
// inside a dishwasher when they press INSIDE.
//
// ─── AND WHAT WAS ACTUALLY WRONG ───────────────────────────────────────────
//
// Not the drawers: `toggleAllFronts` never opened one. It TOGGLED — so the
// second press on INSIDE shut the wardrobe the client was looking into — and
// it never put anything back, so a client who had one door open to look at a
// rail left the step with every door open instead. Those are the two halves
// F5 names, and they are the two halves this module fixes.
//
// ─── AND PRO IS NOT TOUCHED ────────────────────────────────────────────────
//
// Nothing calls this but retail's own `DesignRoom.jsx`. PRO's open-all is the
// View menu's, exactly as it was.

import { useUiStore } from '../../stores/uiStore.js';

/**
 * What the doors were when INSIDE was entered. `null` means we are not inside
 * (or were not when this page loaded) and nothing is owed back.
 *
 * Both maps are kept, because `toggleAllFronts` moves both: `openKits` is the
 * pull-down's own state and it rides the same act.
 */
let remembered = null;

/** A deep-enough copy: the maps are two levels and both levels are replaced. */
const snapshot = (map) => Object.fromEntries(
  Object.entries(map || {}).map(([unitId, fronts]) => [unitId, { ...fronts }]),
);

/**
 * THE DOORS of one unit — never its drawers, never an appliance face.
 *
 * @param {Array<{unitId:string, panels:Array}>} entries   the unit and the
 *   ENGINE's own panel records, so this asks about the piece rather than about
 *   a string.
 */
export const doorEntriesOf = (entries) => (entries || [])
  .map((e) => ({
    unitId: e.unitId,
    panelIds: (e.panels || [])
      // `FRONT` is the door's own part; a drawer face is `DRAWER-FRONT`.
      .filter((p) => p.part === 'FRONT' && !p.meta?.drawer && !p.meta?.appliance)
      .map((p) => p.id),
  }))
  .filter((e) => e.unitId && e.panelIds.length);

/**
 * Apply the law for one value of "is the client inside".
 *
 * @param {boolean} inside
 * @param {Array} entries   the door entries, from `doorEntriesOf`
 * @returns {'opened'|'restored'|'nothing'} what it did, for the test
 */
export function applyInsideDoorLaw(inside, entries = []) {
  const ui = useUiStore.getState();
  if (inside) {
    // Already inside? Then this is not a transition, and remembering again
    // would remember the OPEN doors — after which leaving would restore them
    // open and the client's own shut wardrobe would never come back.
    if (remembered) return 'nothing';
    const rows = doorEntriesOf(entries);
    if (!rows.length) return 'nothing';
    remembered = { openFronts: snapshot(ui.openFronts), openKits: snapshot(ui.openKits) };
    // `openFrontsFor` is the store's own per-unit setter and it OPENS what it
    // is given without touching anything else — which is the difference
    // between this and `toggleAllFronts`, whose second press shuts everything.
    for (const row of rows) ui.openFrontsFor(row.unitId, row.panelIds);
    return 'opened';
  }
  if (!remembered) return 'nothing';
  const back = remembered;
  remembered = null;
  // EXACTLY as they were. Not "all shut": a client who had one door open to
  // look at a rail must find that door open, and only that one.
  useUiStore.setState({ openFronts: back.openFronts, openKits: back.openKits });
  return 'restored';
}

/** What the law is holding, for the proof and for the test. */
export const rememberedDoors = () => (remembered
  ? { openFronts: snapshot(remembered.openFronts), openKits: snapshot(remembered.openKits) }
  : null);

/** Drop what is held without restoring it — for a test leaving the stores clean. */
export function forgetInsideDoors() { remembered = null; }
