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
// It is NOT a replacement for `railDatum.js`. That module answers "how far
// above the nearest thing below it does this rod hang", and it still does —
// T42-F1 keeps it whole, because that IS the ALONE rod's `pos_mm` + datum.
//
// (T37 wrote here that every rail saved before it "keeps rendering exactly as
// it was saved". T42 ends that sentence deliberately: the app is pre-launch,
// the owner said *"nie patrzymy na przeszłość w ogóle"*, and an old rod now
// renders as what it always should have been — a rod, with nothing over it.)
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
// T42-F1: and NEITHER KIND emits one now. `RAIL-PART` is gone from the engine,
// from the kit and from the cut list — the ALONE rod hangs on the sides.

// ─── TURN 40 (CLAUDE.md F6): WITH A SHELF, OR ON ITS OWN ────────────────────
//
// The owner, 18.08.2026: *"następnie dodawanie drążka raz i z półką proszę —
// wybór w drążek modal, to ważne."*
//
// T37 made adding a rail ALWAYS an assembly, and that was his own verdict at
// the time; nothing here overturns it, so THE DEFAULT STAYS THE ASSEMBLY. What
// is added is the alternative he now wants: a rod on its own, chosen when it is
// added.
//
// ─── TURN 42 (CLAUDE.md F1): AND "ON ITS OWN" IS A ROD, NOT A SHELF ─────────
//
// T40 satisfied "a rod on its own" by pointing it at the LEGACY law — which
// hangs the rod and CUTS A BOARD 40 mm over it. The owner spent four turns
// saying he did not want that board, and got it every time. The owner,
// 19.08.2026: *"mamy w dupie stare rzeczy … nie patrzymy na przeszłość w
// ogóle."*
//
// So there are EXACTLY TWO KINDS from tonight, and no third:
//
//   ALONE     a rod mounted to the carcass sides. Its height is its own
//             `pos_mm` over its own datum. NO partitioner, NO shelf, NO
//             bracket board. The side flange drilling stays — the rod has to
//             hang on something, and it hangs on the sides.
//   ASSEMBLY  T37's: a FIX shelf with the rod `drop` beneath it. Untouched.
//
// THE LEGACY RULE, IN ONE SENTENCE, WITH ZERO LAYERS: a stored rail item with
// no `mount` — or any value that is not `shelf` — IS READ AS ALONE. There is no
// migration table here, no compatibility branch and no warning, because the app
// is pre-launch and the owner said so twice in one evening.
//
// What survives from T40 is the only thing that was ever about a PERSON rather
// than about geometry: an OLD rod should be told it can be re-added to get the
// shelf, and a rod somebody deliberately asked to be alone should not be nagged
// about a decision made this afternoon. Same geometry now, two sentences.

/**
 * How a rail is hung. TWO KINDS, no third (T42-F1).
 *
 *   SHELF   T37's assembly: a FIX shelf with the rod under it
 *   ALONE   a rod on its own, on the carcass sides — and the answer for every
 *           stored rail that does not say SHELF, whatever it says instead
 */
export const RAIL_MOUNT = Object.freeze({ SHELF: 'shelf', ALONE: 'alone' });

/**
 * Which of the two this rail is.
 *
 * The test is deliberately narrow: `mount === 'shelf'` AND a shelf actually
 * named. A rail that says "shelf" and names nothing is not half an assembly —
 * reading it the assembly way would put a rod at `0 − 40` on somebody's saved
 * project — so it is a rod on its own, like everything else that is not an
 * assembly.
 *
 * T42-F1: the third answer is gone. There is no `LEGACY` any more, because
 * there is no legacy geometry any more: an old rod and a chosen-alone rod are
 * the same rod, drawn by the same branch, cut into the same nothing.
 */
export function railMountOf(item) {
  const said = String(item?.mount ?? '').toLowerCase();
  return said === RAIL_MOUNT.SHELF && railShelfIdOf(item) != null
    ? RAIL_MOUNT.SHELF
    : RAIL_MOUNT.ALONE;
}

/** The shelf this rail hangs under, by item id — or null. */
export function railShelfIdOf(item) {
  const id = item?.shelf_id ?? item?.shelfId ?? null;
  if (id == null) return null;
  const text = String(id);
  return text.length ? text : null;
}

/**
 * Is this rod on its own — i.e. NOT an assembly? Asked in the modal, which owes
 * the joiner the note.
 *
 * T42-F1: the answer for every input is exactly what it was before this turn;
 * only the name of the constant on the right changed, because `LEGACY` is not
 * a kind of rail any more. The function keeps its name because the question it
 * answers is the one the modal still asks: is this the old thing, the one with
 * no shelf over it?
 */
export function isLegacyRail(item) {
  return railMountOf(item) !== RAIL_MOUNT.SHELF;
}

/**
 * TURN 40 (F6): was this rod asked to be ALONE, or is it simply old?
 *
 * T42-F1: both are ALONE now — the same branch, the same geometry, the same
 * absence of a board. They are still not the same thing to a PERSON: one is a
 * decision somebody made this afternoon and the other is a rod from a job cut
 * last month. Only the second is offered the "re-add it" note, and this is the
 * only place in the app where the difference still means anything.
 */
export function railChosenAlone(item) {
  return String(item?.mount ?? '').toLowerCase() === RAIL_MOUNT.ALONE;
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

/** …and the note a rod that was ASKED to be alone owes him instead (T40-F6). */
// T42-F1: the sentence was a promise the engine broke — there IS no partitioner
// any more, and there never should have been one. It now says what the rod is.
export const RAIL_ALONE_NOTE = 'rail on its own — no shelf and no board above it, by choice. It mounts to the carcass sides.';

/**
 * ─── TURN 42 (CLAUDE.md F1): THE ROD STAYS INSIDE THE CARCASS ───────────────
 *
 * A shelf's height is snapped and clamped before it is drawn; an ALONE rod's is
 * the same kind of number and gets the same treatment. What it is clamped
 * BETWEEN is the only thing that differs, and it differs because a rod is a
 * rod: it has a radius, and nothing stands on it.
 *
 * The old law clamped the PARTITIONER under the top (`railPartY + G > H − G −
 * topClearance`) and let the rod follow 40 mm below. There is no partitioner,
 * so the rod itself takes the clearance — the same `wardrobe.rail.topClearance`
 * millimetres, now measured to the thing that is actually there.
 *
 * @returns {{axis:number, lowered:boolean, raised:boolean}}
 */
export function clampRailAxis({
  axis = 0, floor = 0, ceiling = 0, clearance = 0, radius = 0,
}) {
  const low = Number(floor) + Number(radius);
  const high = Number(ceiling) - Number(clearance) - Number(radius);
  const wanted = Number(axis) || 0;
  if (high < low) return { axis: (low + high) / 2, lowered: wanted > high, raised: wanted < low };
  if (wanted > high) return { axis: high, lowered: true, raised: false };
  if (wanted < low) return { axis: low, lowered: false, raised: true };
  return { axis: wanted, lowered: false, raised: false };
}
