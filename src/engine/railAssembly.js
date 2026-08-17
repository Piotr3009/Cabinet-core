// ─── TURN 37 (CLAUDE.md F2): THE RAIL, DONE RIGHT ───────────────────────────
//
// The owner buried T35's design in one breath, 17.08.2026:
//
//   *"masakra, jakieś dziwne wpisywanie... dlaczego drążek nie może być z
//   półką powyżej, i ta półka być traktowana jak półka, tylko że fix? Zrób
//   półkę nad drążkiem — półka, a drążek dołącz do półki i tyle."*
//
// T35 asked the joiner to type a number and then spent a whole module
// (`engine/railDatum.js`) deciding which board that number was measured from,
// because the sentence "so far above the nearest thing below" is genuinely
// ambiguous and no pure function could close it. The owner's answer is not a
// better resolution law. It is that THE QUESTION SHOULD NEVER HAVE BEEN ASKED.
//
// A rail is a FIX SHELF with a rod hung under it. The shelf is an ordinary
// shelf in every way a joiner cares about — he drags it by hand, it snaps to
// its neighbours, it is listed and dimensioned and cut like any other shelf —
// and the rod is its ATTACHMENT. There is no height to type, because the rod's
// height is the shelf's height minus the bracket's own drop, and the bracket's
// drop is a hardware fact, not a design decision.
//
// ─── WHAT THIS MODULE IS, AND WHAT IT IS NOT ────────────────────────────────
//
// It is the LINK and the DROP: how to read "this rail rides that shelf" off an
// item, and where the rod ends up once you know. Pure functions on plain
// numbers — no store, no React, no geometry beyond one Y, exactly as
// `railDatum.js` was.
//
// It is NOT a replacement for `railDatum.js`. That module is the LEGACY law
// and it stays, whole and un-deleted (iron rule 4 — the owner licensed five
// removals today and none of them is here). Every rail saved before this turn
// keeps rendering exactly as it was saved, resolved by exactly the code that
// resolved it yesterday. There is no migration and no surprise shelf in an old
// BOM; what an old project reads back is what the workshop already built.
//
// ─── THE DROP, AND WHY IT IS FORTY ──────────────────────────────────────────
//
// `profile.hardware.hanger.dropMm` defaults to 40, and 40 is not a new number.
// It is `wardrobe.rail.partitionAbove` — the distance the rail PARTITIONER has
// stood above the rod since turn 1, which is the bracket geometry the 3D has
// been drawing all along. Hang the rod 40 mm under the board above it and you
// have drawn the rail this app has always drawn. That is the whole of the
// spec's *"derive the default from the bracket geometry the 3D already draws,
// so nothing visibly moves"*.
//
// ─── AND THE SHELF IS THE PARTITIONER ───────────────────────────────────────
//
// A shelf-mounted rail emits NO `RAIL-PART` board. It does not need one: the
// fix shelf IS the board above the rod, standing where the partitioner stood,
// and cutting a second one 40 mm above the rod would put two boards in the
// same 40 mm of air. The bracket screw still goes into the carcass side at the
// rod's axis; the partitioner's own three screws go where the shelf's fixing
// goes, which is the fix shelf's business and not the rail's.
//
// A LEGACY rail keeps its partitioner, because a legacy rail keeps everything.

/** How a rail is hung. Nothing said is LEGACY — every rail before T37. */
export const RAIL_MOUNT = Object.freeze({ LEGACY: 'legacy', SHELF: 'shelf' });

/**
 * Which law this rail is read by.
 *
 * The test is deliberately narrow: `mount === 'shelf'` AND a shelf actually
 * named. A rail that says "shelf" and names nothing is not half a new rail, it
 * is a legacy rail with a stray field — and reading it the new way would put a
 * rod at `0 − 40` on somebody's saved project.
 */
export function railMountOf(item) {
  const said = String(item?.mount ?? '').toLowerCase();
  if (said === RAIL_MOUNT.SHELF && railShelfIdOf(item) != null) return RAIL_MOUNT.SHELF;
  return RAIL_MOUNT.LEGACY;
}

/** The shelf this rail hangs under, by item id — or null. */
export function railShelfIdOf(item) {
  const id = item?.shelf_id ?? item?.shelfId ?? null;
  if (id == null) return null;
  const text = String(id);
  return text.length ? text : null;
}

/** Is this the old thing? Asked in the modal, which owes the joiner the note. */
export function isLegacyRail(item) {
  return railMountOf(item) === RAIL_MOUNT.LEGACY;
}

/**
 * The bracket's drop, shelf UNDERSIDE → ROD AXIS.
 *
 * Falls back to `wardrobe.rail.partitionAbove` — the geometry it is derived
 * from — so a profile written before this turn (a saved company default, a
 * fixture's own profile object, a test that builds one by hand) answers 40
 * rather than 0. A drop of zero would hang the rod inside the shelf.
 */
export function hangerDropMm(profile) {
  const stated = Number(profile?.hardware?.hanger?.dropMm);
  if (Number.isFinite(stated) && stated >= 0) return stated;
  const derived = Number(profile?.wardrobe?.rail?.partitionAbove);
  return Number.isFinite(derived) && derived >= 0 ? derived : 0;
}

/**
 * Where the rod hangs, given the shelf it rides.
 *
 * `shelfBottom` is the shelf's UNDERSIDE, which is `pos_mm` — the convention
 * this engine has carried since turn 1 and the one the LISP draws from
 * (KIT_WARDROBE_FULL L143: the board runs `shelfY` → `shelfY + G`).
 */
function railAxisUnderShelf({ shelfBottom = 0, drop = 0 }) {
  return (Number(shelfBottom) || 0) - (Number(drop) || 0);
}

/**
 * The whole answer for one shelf-mounted rail, or null when the shelf it names
 * is not there any more.
 *
 * A rail whose shelf has been deleted does NOT fall back to the legacy law and
 * does not guess at another shelf: it answers null, and the caller draws no
 * rod. Guessing is what T35 did, and it is what the owner threw out.
 *
 * @param {object} arg
 * @param {object} arg.item        the hanger item
 * @param {Array}  arg.shelfItems  the shelves in scope, each `{id, pos_mm}`
 * @param {number} arg.drop        `hangerDropMm(profile)`
 * @returns {{shelfId:string, shelfBottom:number, axis:number, drop:number}|null}
 */
export function resolveShelfMountedRail({ item, shelfItems = [], drop = 0 }) {
  if (railMountOf(item) !== RAIL_MOUNT.SHELF) return null;
  const wanted = railShelfIdOf(item);
  const shelf = (shelfItems || []).find((s) => s && String(s.id) === wanted) || null;
  if (!shelf) return null;
  const shelfBottom = Number(shelf.pos_mm);
  if (!Number.isFinite(shelfBottom)) return null;
  return {
    shelfId: wanted,
    shelfBottom,
    drop: Number(drop) || 0,
    axis: railAxisUnderShelf({ shelfBottom, drop }),
  };
}

/**
 * Where the fix shelf of a NEW assembly goes, so that the rod lands EXACTLY
 * where the automatic placement would have put it.
 *
 * The old placement hung the rod at `axis` and stood its partitioner
 * `partitionAbove` over it. The new one stands the SHELF where that
 * partitioner stood — `axis + drop`, and with `drop` defaulting to
 * `partitionAbove` those are the same millimetre. So the joiner who presses
 * "Add hanger rail" today and the joiner who pressed it yesterday get a rod in
 * the same place; one of them also gets a shelf he can drag.
 */
export function assemblyShelfPos({ railAxis = 0, drop = 0 }) {
  return (Number(railAxis) || 0) + (Number(drop) || 0);
}

/** The grey note a legacy rail's modal owes the joiner (CLAUDE.md F2). */
export const LEGACY_RAIL_NOTE = 'old-style rail — re-add to get the shelf-mounted one';
