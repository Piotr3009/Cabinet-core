// ─── Turn 35, CLAUDE.md F1: THE RAIL'S OWN DATUM ────────────────────────────
//
// The owner, 16.08.2026: *"drążek ustawiamy zawsze od najbliższej czegoś od
// dołu — albo od szuflad, albo od półek. Jeśli napiszę 900, to niech będzie od
// półki, chyba że nic nie ma — to wtedy od dna."*
//
// So the number on a rail is not a height above the carcass floor. It is a
// height above THE NEAREST THING UNDER IT, and which thing that is depends on
// what stands in the bay: a drawer stack's closing partition, a shelf, or —
// when the bay is empty — the bay floor itself. This module is that resolution
// and nothing else: no store, no React, no geometry beyond one Y.
//
// THE LOOP IN THE LAW, AND HOW IT IS CLOSED
//
// "the highest support BELOW the rail's axis" is CIRCULAR, and not harmlessly
// so: the axis is the support plus the number, so a bay with a drawer stack at
// 444 and a shelf at 1306 has TWO self-consistent answers for the number 764 —
// 444 → 1208 (under the shelf) and 1306 → 2070 (over it). Both satisfy the
// sentence. No pure function of (number, boards) can choose between them,
// because the sentence does not contain the information: what is missing is
// WHICH board the joiner was measuring from when he typed the number.
//
// So that is what is stored. The rail carries a DATUM — the floor, the drawer
// stack, or a named shelf ITEM — beside its number, and the engine resolves
// that datum's live Y at compute time. The number stays support-relative, the
// base stays live (a named shelf that moves carries the rail with it, keeping
// the number), and the ambiguity is answered once, where the answer is known:
// at the moment the rail is placed or its height edited, when the absolute is
// on the screen in front of the person typing.
//
// A rail with NO datum — every project saved before this turn, and every bare
// `computeCabinet()` — is read the old way, and the old way is one line:
// the drawer stack if there is one, otherwise the bay floor. That is
// KIT_WARDROBE_FULL.lsp L667-668 exactly, which is why F1 moves nothing that
// already exists, needs no migration arithmetic to prove it, and contributes
// nothing to the classifier.
//
// Worked through the owner's own examples:
//
//   · a shelf whose top is 918 and the number 900 → the datum names that shelf
//     and the rod is at 1818. "Jeśli napiszę 900, to niech będzie od półki."
//   · nothing in the bay at all → the floor. "chyba że nic nie ma — to wtedy
//     od dna."
//   · a rod hung in the space UNDER a high shelf keeps the drawer stack as its
//     datum and stays where it was hung — a shelf above a rail was never that
//     rail's support, and now nothing can mistake it for one.
//   · drawers and nothing else — every wardrobe the app has ever drawn — is the
//     drawer stack, datum or no datum.
//
// Where the rod ends up THROUGH the board above it, the datum is still the
// datum and `fits` comes back false. That is deliberate: the spec says the
// collision upward is a RED fault (check #13), **never an auto-fix**. The
// program refuses loudly; it does not quietly put the rail somewhere the owner
// did not ask for.
//
// THE BASE IS LIVE. Nothing here stores a support: the datum is resolved at
// compute time, every time, from what is standing in the bay right now. Move
// the shelf under a rail and the rail rides with it, keeping its number — the
// owner's explicit yes.

const EPS = 1e-6;

/** The three things a rail can hang above. A datum names one of them. */
export const RAIL_DATUM = Object.freeze({ FLOOR: 'floor', DRAWERS: 'drawers', SHELF: 'shelf' });

/**
 * Every top face a rail in this bay could hang above, each with its NAME.
 *
 * @param {object} arg
 * @param {number} arg.floor      the bay floor — the top face of the bottom board
 * @param {number|null} arg.stackTop  the drawer stack's closing partition, top face
 * @param {Array<{id:string, top:number}>} arg.shelves  fixed AND adjustable
 * @param {number} arg.ceiling    the underside of whatever closes the bay above
 * @returns {Array<{kind:string, id:(string|null), top:number}>} ascending
 */
export function railSupportTops({
  floor = 0, stackTop = null, shelves = [], ceiling = Infinity,
}) {
  const out = [{ kind: RAIL_DATUM.FLOOR, id: null, top: Number(floor) || 0 }];
  // `stackTop != null` FIRST: `Number(null)` is 0, so "there is no drawer
  // stack" would read as "a drawer stack on the floor" and every rail in the
  // app would hang from a board that is not there. The same trap rule 13 is
  // about, in cabinet.js's own words.
  if (stackTop != null && Number.isFinite(Number(stackTop))) {
    out.push({ kind: RAIL_DATUM.DRAWERS, id: null, top: Number(stackTop) });
  }
  for (const sh of shelves) {
    const top = Number(sh?.top);
    if (!Number.isFinite(top)) continue;
    out.push({ kind: RAIL_DATUM.SHELF, id: sh.id ?? null, top });
  }
  return out
    .filter((c) => !Number.isFinite(ceiling) || c.top < ceiling - EPS)
    .sort((a, b) => a.top - b.top);
}

/**
 * The support this rail stands above, and the axis that follows.
 *
 * `datum` is what the rail SAYS it hangs from. Nothing said — a legacy rail, or
 * a bare `computeCabinet()` — is read the old way, which is the LISP's: the
 * drawer stack if there is one, otherwise the floor. A datum naming a shelf
 * that is no longer there (somebody deleted it) falls back to the same line
 * rather than to a guess.
 *
 * @param {object} arg
 * @param {Array} arg.supports  from `railSupportTops`
 * @param {{kind:string, id:(string|null)}|null} arg.datum
 * @param {number} arg.offset   the owner's number: height ABOVE the support
 * @param {number} arg.ceiling  what closes the bay above
 * @returns {{support:number, datum:object, axis:number, fits:boolean, opening:number}}
 */
export function resolveRailAxis({
  supports = [], datum = null, offset = 0, ceiling = Infinity,
}) {
  const list = supports.length
    ? [...supports].sort((a, b) => a.top - b.top)
    : [{ kind: RAIL_DATUM.FLOOR, id: null, top: 0 }];
  const value = Number(offset) || 0;

  // THE OLD LAW, still the fallback and still one line.
  const legacy = () => [...list].reverse()
    .find((c) => c.kind === RAIL_DATUM.DRAWERS) || list[0];

  let chosen = null;
  if (datum?.kind === RAIL_DATUM.SHELF && datum.id != null) {
    chosen = list.find((c) => c.kind === RAIL_DATUM.SHELF && c.id === datum.id) || null;
  } else if (datum?.kind === RAIL_DATUM.DRAWERS) {
    chosen = list.find((c) => c.kind === RAIL_DATUM.DRAWERS) || null;
  } else if (datum?.kind === RAIL_DATUM.FLOOR) {
    chosen = list.find((c) => c.kind === RAIL_DATUM.FLOOR) || null;
  }
  const support = chosen || legacy();
  const axis = support.top + value;
  // What closes the opening this rail hangs in: the next board up, or the
  // carcass top. `fits` is FALSE where the rod is already through it — check
  // #13 says so in red, and nothing here moves the owner's rail.
  let above = ceiling;
  for (const c of list) if (c.top > support.top + EPS && c.top < above) above = c.top;
  return {
    support: support.top,
    datum: { kind: support.kind, id: support.id },
    axis,
    fits: axis < above - EPS,
    opening: above - support.top,
  };
}

/**
 * Which board is this rail ACTUALLY hanging above, given where it is now?
 *
 * The owner's sentence, asked once, at the only moment it can be answered
 * without guessing: the highest support BELOW the rod's axis, and the floor
 * when there is none. The store calls this when a rail is placed and whenever
 * its height is edited, and writes the answer onto the item — that is how the
 * ambiguity above is closed, and it is why `resolveRailAxis` never has to
 * search.
 *
 * @returns {{datum:object, offset:number}}
 */
export function railDatumFor({ supports = [], axis = 0 }) {
  const list = supports.length
    ? [...supports].sort((a, b) => a.top - b.top)
    : [{ kind: RAIL_DATUM.FLOOR, id: null, top: 0 }];
  const y = Number(axis) || 0;
  let best = list[0];
  for (const c of list) if (c.top < y - EPS) best = c;
  return { datum: { kind: best.kind, id: best.id }, offset: y - best.top };
}

/**
 * Check #13's question: does the rail, plus the clearance a hanger needs, run
 * into what is above it?
 *
 * `clearance` is the room a coat hanger's hook takes over the rod's axis — the
 * profile's `wardrobe.rail.partitionAbove`, which is the same number the rail's
 * own partitioner board already stands at.
 *
 * @returns {{clash:boolean, needsTo:number, room:number}}
 */
export function railObstruction({ axis = 0, clearance = 0, ceiling = Infinity }) {
  const needsTo = Number(axis) + Number(clearance);
  const room = Number(ceiling) - needsTo;
  return { clash: room < -EPS, needsTo, room };
}
