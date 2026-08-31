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
  /**
   * T61 F5 · PREDICATE: the typed number against the bounds the caller was
   * given — `adapter.designBounds()` (the profile's, and for the room retail's
   * own two, declared as such in their `from` field) and
   * `adapter.unitBounds(id)` (`projectStore.unitSizeBoundsFor`, which reads the
   * wall, the neighbours and the room).
   *
   * The shared core has no sentence for this and cannot: it is never asked. A
   * slider could not be dragged past its end, so nothing downstream ever had to
   * refuse the number — the refusal is new because the CONTROL is new, and the
   * words are therefore retail's, said once, here.
   */
  outOfRange: (min, max) => `Between ${min} and ${max} mm — type a number in that range.`,

  /**
   * T61 F3 · PREDICATE: `getUnitType(unit.type).ridesOn` — the engine's own
   * test for "this is already a rider". `engine/types.js` gives `WARDROBE_TOP`
   * no `ridesOn` host of its own, so `addUnit` would elect the box's HOST and
   * quietly put the second box beside the first instead of on top of it. The
   * shared core answers this one in a boolean and nowhere in words.
   */
  topBoxOnTopBox: 'A top box stands on a wardrobe, not on another top box.',

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

  /** PREDICATE: `doorCountFor(width, profile)` — engine/cabinet.js, the face-door law. */
  oneDoorTooWide: ({ width, max }) => `A single door is cut up to ${max} mm; this wardrobe is `
    + `${width} mm, so it opens as a pair.`,

  /** PREDICATE: `addHangerRail` returned null — one rail per column (T32 F4). */
  railAlreadyThere: 'There is already a rail in this column.',

  /**
   * T61 F4 · PREDICATE: `projectStore.addWardrobeKit` refuses a second of the
   * same kind in the same opening — `if (items.some((i) => i.kind === kind &&
   * zoneOf(i) === wantZone)) return null;` — and answers in a bare null. PRO's
   * own after-the-press wording is `AddItems.onAddKit`'s *"That column already
   * has a …"*; these are the same words said BEFORE the press, in the client's
   * half of the vocabulary.
   */
  kitAlreadyThere: (what) => `There is already a ${what} in this column.`,

  /**
   * T61 F3 · PREDICATE: `adapter.topBoxesOn(hostId).length` — the store's own
   * `params.rides_on` link, read back. NOT a refusal: T53 made one main carry
   * several boxes side by side, and `addUnit`'s rider branch refuses in its own
   * words when the span runs out. This is the note that says where the next one
   * will go, so a client is not surprised by it.
   */
  topBoxGoesBeside: 'One is already on this wardrobe. Another goes beside it.',

  /**
   * T61 F3 · PREDICATE: `engine/roomFit.js riderBornHeight`, which cuts a box
   * to the headroom left over its host rather than letting it stand through
   * the ceiling (T50, *"dlaczego pozwala system dodawać top box powyżej
   * rozmiaru pokoju?"*). NOT a refusal — nobody typed that height, so trimming
   * it is not the app overruling anybody — but it is a thing the client should
   * be told before they wonder why the number stopped.
   */
  topBoxStopsAtTheCeiling: 'The box stops at the ceiling — the room decides.',

  /**
   * T61 F4 · PREDICATE: `projectStore.addOverlayDrawers`, which cuts a FIXED
   * shelf above the stack and shortens the doors onto it — *"fronty na szafie,
   * drzwi powyżej szuflad"* (T40 F3b). NOT a refusal: it is what the row does,
   * said before it is pressed.
   */
  overlayIsOutside: 'The fronts sit outside the carcass, with a fixed shelf above them '
    + 'and the doors starting on it.',

  /**
   * T61 F4 · PREDICATE: `projectStore.setPartitionX` answering
   * `{ blocked: true }` — its `max < min` case, which is *"a divider you could
   * not get a hand between is not a bay"* with no room left on either side.
   */
  partitionPinned: 'There is no room to move it: the dividers either side of it are '
    + 'already as close as they go.',

  /** PREDICATE: a hinge the engine has FORCED — `meta.hingeForced` under a slope (T46/T55). */
  hingeForcedBySlope: 'Opens from the slope — the rake decides this door’s hand.',

  // ─── T60 F3 · THE NINE MENUS' OWN REFUSALS ──────────────────────────────
  //
  // Same law as the ten above and it is worth saying again, because this turn
  // added nine surfaces that could each have invented one: every entry below
  // is reached ONLY after a shared-core predicate has already said no, and the
  // predicate is named on the line above it. Where the shared core writes a
  // whole sentence of its own — the room's refusal, the store's clamp notice,
  // the watch pane's missing shelf, a J that is too short to cut — that
  // sentence is shown VERBATIM and nothing here is used.

  /** PREDICATE: two face leaves and no `meta.bay` — `engine/cabinet.js` hangs
   *  `-FL` left and `-FR` right by construction, so there is nothing to set. */
  pairHangsBothWays: 'A pair opens from the middle — one leaf each way, always.',

  /** PREDICATE: `addPartition`'s own gate — the widest clear bay must be at
   *  least one board plus two minimum shelf gaps, or a divider has nowhere to
   *  stand. The store answers `null`; these are the words for that null. */
  noRoomForABay: ({ need }) => `There is no room for another divider — each bay needs at `
    + `least ${need} mm of clear opening.`,

  /** PREDICATE: `meta.jpull.reason === 'too-short'` on the leaf's own panel. */
  jrunTooShort: 'This leaf is too short for a J to be cut in its edge.',

  /** PREDICATE: `isPinnedShelf(shelf, items)` — T58-F3.1. A NOTE, not a refusal:
   *  the board still moves (T37-F2 lifts the lock for a shelf carrying a rod);
   *  what it does not do is take part in the ladder when a bay is centred. */
  shelfPinned: 'Centring leaves this board where it is — the others space themselves around it.',

  /** PREDICATE: `panel.meta.railItemId` — the rod hangs on this board, and
   *  `removeItem` takes the rod with it (projectStore, T37-F2). Silent in the
   *  shared core; said here because a client should not lose a rail by surprise. */
  shelfCarriesTheRail: 'The rail hangs from this board — taking the board out takes the rail with it.',

  /** PREDICATE: `isShelfLocked(item)` — a fixed shelf is screwed in (T8/T37). */
  shelfLocked: 'This shelf is fixed — it is screwed in rather than sitting on pins.',

  /** PREDICATE: `shelfBounds` came back with no travel — max at or below min. */
  shelfNoRoom: 'There is no room to move it: what is above and below it is already as close as it goes.',

  /** PREDICATE: `railMountOf(item) === RAIL_MOUNT.SHELF` — T41, one drag, one truth. */
  railFollowsItsShelf: 'This rod hangs under its own shelf, so the shelf’s height is its height. '
    + 'Put it on its own to move it by itself.',

  /** PREDICATE: `store.watchShelfAbove(unitId, index)` returned nothing (T53 F8d). */
  glassNeedsShelf: 'The glass needs a shelf directly above it — add one, and the opening is cut in it.',

  /** PREDICATE: a `watch_insert` or `variant:'shoe'` drawer in the stack. Both
   *  heights are the engine's own and the owner declared both slider-less
   *  (`watchDrawerFixedHeight`; the shoe's 80 mm side), while the store's one
   *  stack-wide write does not exclude them. */
  stackHasAFixedDrawer: 'One of these drawers is a fitted one — its height is set by what goes in it, '
    + 'so the stack is left as it is.',

  /** PREDICATE: a `watch_insert` drawer in a stack whose COUNT is about to
   *  change. `addDrawers` rebuilds the stack and carries only id/kind/index/
   *  mount/zone/variant/height_mm across — `watch_insert`, `watch_layout`,
   *  `watch_shelf_glass` and `watch_finish` are dropped from every survivor.
   *  A NOTE rather than a refusal: the client may still change the count, and
   *  is told what it costs first. Named in the morning report as a shared-core
   *  gap. */
  countRebuildsTheStack: 'Changing the count rebuilds the stack — the watch tray is set again '
    + 'from scratch.',

  /** PREDICATE: none — this is a DESCRIPTION, and every number in it is read
   *  from `engine/shoeInsert.js shoeInsertSpec(profile)`. T58 F2 fixed the ramp
   *  and the owner fixed the count himself (*"po prostu daj 2 zawsze"*), so
   *  there is nothing to choose and the honest control is a sentence. */
  shoeIsFixed: ({ dividers, lanes }) => `A leaning ramp with ${dividers} dividers across it — `
    + `${lanes} lanes, so a pair stands in each and lifts straight out. The ramp, the dividers `
    + 'and the drawer’s own height are the workshop’s, and there is nothing here to choose.',

  /** NOT a refusal: the pane's LED is cut with its opening and has no switch
   *  (T53 F8c, the owner's own "z automatycznym dodaniem leda dookoła szyby"). */
  paneIsLit: 'The pane is lit from beneath — the ring is cut into the same shelf as the opening.',
};
