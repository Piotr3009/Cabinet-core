// ─── THE SHELF LEARNS ITS THREE KINDS (turn 21, CLAUDE.md F7) ───────────────
//
// Owner: the shelf modal gains a TYPE — **fix / adjustable / pull-out** — and
// pull-out means a flat drawer.
//
// ─── WHAT THE LISP SAYS, WHICH IS F7.2's FIRST INSTRUCTION ─────────────────
//
// "FIRST search the LISPs (SKYLON_COMMON, KIT_WARDROBE_FULL) for the shelf-pin
// row law (spacing, setback from edges, row pitch). If the LISP carries it, use
// it verbatim and name the new entities."
//
// IT CARRIES IT. `SKYLON_COMMON.lsp → drawBUL` L755-768, verbatim:
//
//     (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (- shelfY 50.0) 3.75)
//     (drawCircle "SHELVES_7_5MM" (+ x0 70.0)     shelfY      3.75)
//     (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (+ shelfY 50.0) 3.75)
//     …and the same three at (+ x0 szer -70.0)
//
// — two columns 70 mm in from each edge, three pins per column at ±50 mm about
// the shelf's own line, ⌀7.5 (radius 3.75), on layer `SHELVES_7_5MM`. Not ⌀5:
// the owner's shorthand in CLAUDE.md is the hardware he buys, and the LISP is
// the law, and the law says 7.5. The finding is recorded in
// verify/t21/cnc-export-identity.md.
//
// So `adjustable` ships ENABLED, and it introduces no new entity at all —
// `profile.shelfHoles` has carried that exact pattern since turn 1 and the
// engine has drilled it for every shelf nobody fixed. There is nothing to
// invent and nothing to move.
//
// ─── WHAT THE TYPE ACTUALLY IS ─────────────────────────────────────────────
//
// It is the `variant` a shelf item has carried since turn 8, named the owner's
// way. ONE truth, not a second field beside the first: a shelf that is `fixed`
// reads `fix`, and reading a type back writes the same `variant`, so no project
// grows two answers to one question and no drilling moves for a shelf nobody
// has touched. That is what makes F7.4's "default projects fingerprint delta
// ZERO" true rather than hoped for.
//
// Pure data and pure functions — no React, no store.

/**
 * The three kinds, in the order the modal offers them.
 *
 * `enabled: false` is a WORKSHOP NUMBER the owner has not given (CLAUDE.md's
 * rule: the option renders, disabled, with the reason on it, and BLOCKERS
 * carries the ask — no number is invented).
 */
export const SHELF_TYPES = [
  {
    id: 'fix',
    variant: 'fixed',
    label: 'Fix',
    enabled: true,
    hint: 'Screwed through the side panels, on this board’s own centre line. It does not move.',
  },
  {
    id: 'adjustable',
    variant: 'adjustable',
    label: 'Adjustable',
    enabled: true,
    hint: 'On pins, in the ⌀7.5 rows the kit drills — two columns 70 mm from each edge, three pins at ±50 mm.',
  },
  {
    id: 'pullout',
    variant: 'pullout',
    label: 'Pull-out',
    enabled: false,
    hint: 'A flat drawer on MOVENTO: the bay gets the drawer machinery’s own runner rows. '
      + 'Waiting on ONE workshop number — how tall the tray side is. BLOCKERS carries the ask.',
  },
  // ─── TURN 33 (CLAUDE.md F3): THE SHOE SHELF ───────────────────────────────
  // GEOMETRY, and cut: the same board tilted 15° (profile, owner-tunable) with
  // a front stop rail. NO NEW HOLE PATTERN — it rests on the STANDARD ⌀7.5
  // pin rows the kit has always drilled; the front pair is simply set lower,
  // which is the workshop's own act with the pins, not a drilling change.
  {
    id: 'shoe',
    variant: 'shoe',
    label: 'Shoe shelf',
    enabled: true,
    hint: 'The board tilted 15° on the standard pin rows — front pins set lower — with a stop '
      + 'rail along the front edge. Both pieces are cut; nothing new is drilled.',
  },
];

const BY_ID = new Map(SHELF_TYPES.map((t) => [t.id, t]));
const BY_VARIANT = new Map(SHELF_TYPES.map((t) => [t.variant, t]));

/** The type of one shelf item, as an id. Never null: a shelf is always a kind. */
export function shelfTypeOf(item) {
  const said = String(item?.type ?? item?.variant ?? '').toLowerCase();
  if (BY_ID.has(said)) return said;
  if (BY_VARIANT.has(said)) return BY_VARIANT.get(said).id;
  // Nothing said. A shelf somebody LOCKED is held still, which is what `fix`
  // means in the workshop; everything else is the pin shelf the kit has drilled
  // since turn 1. Neither reading moves a hole.
  if (item?.updown_locked === true) return 'fix';
  return 'adjustable';
}

/** …and the `variant` that type is stored as. One truth, two names. */
export function shelfVariantForType(type) {
  return (BY_ID.get(String(type || '').toLowerCase()) || BY_VARIANT.get('adjustable')).variant;
}

/** The entry itself — label, hint and whether it may be chosen yet. */
export function shelfTypeEntry(type) {
  return BY_ID.get(String(type || '').toLowerCase()) || BY_ID.get('adjustable');
}

/** Can a joiner pick this kind today, or is a workshop number outstanding? */
export function shelfTypeEnabled(type) {
  return Boolean(shelfTypeEntry(type)?.enabled);
}

/**
 * The engine's switch on the kind (F7.3's "plumbing … so the number is a
 * one-line unlock").
 *
 * `fix` and `adjustable` are the two the engine builds today and are the whole
 * of its behaviour: the first is screwed (`SCREWS_3MM` on the board's own
 * centre line), the second is pinned (`SHELVES_7_5MM`, the LISP's rows).
 *
 * `pullout` is a FLAT DRAWER: the bay's sides take the same runner rows and the
 * same drilling the drawer machinery already produces, NL comes from the depth
 * as it always has, and the tray rides at the shelf's height. Everything in
 * that sentence exists — `runnerNominalLength`, `firstRowFromBottom`, the
 * pocketed box side — except how tall the tray's side is, which is a number
 * only the owner has. Until he gives it, this answers `blocked` and the shelf
 * is built as an adjustable one, which is what it physically is with the
 * runners left off.
 *
 * @returns {{kind:'screwed'|'pinned'|'runners', blocked:string|null}}
 */
export function shelfBuild(item) {
  const type = shelfTypeOf(item);
  if (type === 'fix') return { kind: 'screwed', blocked: null };
  if (type === 'pullout') {
    return {
      kind: 'pinned',
      blocked: 'The pull-out tray’s side height is a workshop number the owner has not given yet.',
    };
  }
  // Turn 33 (F3): 'shoe' falls through here on purpose — a shoe shelf IS a
  // pinned shelf as far as any hole is concerned. The tilt and the stop rail
  // are geometry, not drilling.
  return { kind: 'pinned', blocked: null };
}
