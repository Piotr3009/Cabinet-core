// ─── F4 · THE REFUSALS, IN WORDS A CLIENT READS ────────────────────────────
//
// CLAUDE.md F4, verbatim: *"Refusals come from the engine's own reasons, never
// from strings typed into retail."*
//
// That sentence has two halves and this file is honest about which half it is.
//
//   THE TRUTH is always the engine's. Not one line below decides anything:
//   every entry is reached only when a shared-core PREDICATE has already said
//   no — `store.unitUnderSlope(id)`, the shoe drawer's presence on the unit,
//   `wideFrontMm(profile)` against the leaf that count would cut. The predicate
//   is named beside each one and `test/turn59-f4-the-options.test.js` asserts
//   that it, and not this file, is what disables the chip.
//
//   THE WORDS are the engine's WHEREVER THE ENGINE HAS ANY. Where the shared
//   core authors a whole sentence — the watch/shoe exclusion in
//   `projectStore.setDrawerWatchInsert`, the watch-insert fit in
//   `engine/cabinet.js`, every finding `runChecks` returns — the design room
//   shows that sentence VERBATIM and nothing here is used. What is left is the
//   handful of predicates that answer in a boolean and nowhere say why to a
//   customer; PRO greys those rows with its own copy inside
//   `src/components/AddItems.jsx`, which the iron boundary forbids retail to
//   import and which is written for a joiner rather than a client in any case.
//
// So: one file, every string in it, each one tied to the predicate above it.
// Listed in the morning report as the one place retail puts words to an
// engine's boolean — and the first thing to delete if the shared core ever
// grows a client-facing reason of its own.

export const REASONS = {
  /** PREDICATE: `useProjectStore.getState().unitUnderSlope(unitId)` (T58 F4). */
  pulldownUnderSlope: 'Not under a sloped ceiling — the rod needs the full height to swing.',

  /** PREDICATE: a `variant: 'shoe'` drawer already on the unit (T58 F2). */
  watchWithShoe: 'This wardrobe already has a shoe drawer — a wardrobe carries watches or shoes, never both.',

  /** PREDICATE: a `watch_insert: true` drawer already on the unit (T58 F2, the same law from the other side). */
  shoeWithWatch: 'This wardrobe already has a watch drawer — a wardrobe carries watches or shoes, never both.',

  /** PREDICATE: no drawer on the unit carries `watch_insert` (T58b F1). */
  glassNeedsWatch: 'Needs a watch insert — the glass lies on the tray.',

  /** PREDICATE: `project.design.fronts.handle.type === 'jpull'` (T57 F2). */
  jpullTakesNoHandle: 'A J-pull is machined into the front’s own edge — nothing is screwed on.',

  /** PREDICATE: the style id is not one the engine cuts today. */
  styleComingSoon: 'Coming soon — the drawing exists, the machining does not yet.',

  /** PREDICATE: `wideFrontMm(profile)` — profile.checks.wideFrontMm, the owner's 600. */
  doorTooWide: ({ leaf, wide, check }) => `${check}: ${leaf} mm each — over ${wide} mm a door will not `
    + 'open far enough to get a drawer past it.',

  /** PREDICATE: `addHangerRail` returned null — one rail per column (T32 F4). */
  railAlreadyThere: 'There is already a rail in this column.',

  /** PREDICATE: a hinge the engine has FORCED — `meta.hingeForced` under a slope (T46/T55). */
  hingeForcedBySlope: 'Opens from the slope — the rake decides this door’s hand.',
};
