// ─── WHAT A CLOSING DOOR CLOSES (turn 58, CLAUDE.md F6) ────────────────────
//
// The owner: *"jak zamykasz szafy drzwi, to szuflady muszą się zamykać
// automatycznie."*  The picture respects physics — a real leaf swinging shut
// would hit a drawer standing out of the carcass, so the app must not draw a
// door closed over one.
//
// ONE QUESTION, ASKED ONCE: WHICH PULL-OUTS DOES THIS LEAF COVER? It is
// answered by GEOMETRY — the leaf's span across the face, against each
// pull-out's own — and by nothing else. No list of kinds, no map of bay to
// door, nothing to keep in step when a new kind of pull-out arrives: a thing
// that slides out from behind this leaf is covered by it, whatever it is
// called.
//
// Pure functions — no store, no three.js. The view calls them; a node test can
// look at the answer.

/** Do two spans along the face overlap by more than a hair? */
function overlaps(a, b, tol = 1) {
  if (!a || !b) return false;
  const aFrom = Number(a.x);
  const aTo = aFrom + Number(a.w);
  const bFrom = Number(b.x);
  const bTo = bFrom + Number(b.w);
  if (![aFrom, aTo, bFrom, bTo].every(Number.isFinite)) return false;
  return aFrom < bTo - tol && aTo > bFrom + tol;
}

/** Is this panel a LEAF — a door that swings and can cover something? */
export function isCoveringLeaf(panel) {
  return Boolean(panel)
    && panel.part === 'FRONT'
    && panel.role === 'front'
    && Boolean(panel.box);
}

/**
 * Everything this leaf covers, from a list of candidates.
 *
 * @param {object} leaf         an engine panel record — a door
 * @param {Array<{id:string, box:object}>} candidates  the things that slide
 *   out: drawer fronts, pull-out trays, the watch/belt/shoe drawers, and the
 *   bought kits. The CALLER gathers them, because the caller is the one that
 *   knows what is currently on screen — this only decides which of them the
 *   leaf stands in front of.
 * @returns {string[]} the ids the leaf covers, in the order given
 */
export function coveredByLeaf(leaf, candidates = []) {
  if (!isCoveringLeaf(leaf)) return [];
  return candidates
    .filter((c) => c && c.id && c.id !== leaf.id && overlaps(leaf.box, c.box))
    .map((c) => c.id);
}

/**
 * The candidates a unit's own result offers — the pull-outs that ride the
 * front-open map.
 *
 * A DRAWER FRONT is the obvious one. A drawer with NO front of its own (the
 * "bare boxes" mount) rides on its box, so its box is offered too — otherwise
 * closing a door over an internal drawer would leave the drawer standing out
 * with nothing to shut it.
 */
export function pullOutsOf(panels = []) {
  const out = [];
  const seen = new Set();
  for (const p of panels) {
    if (!p?.box || !p.id) continue;
    const isFront = p.part === 'DRAWER-FRONT';
    const isBareBox = p.role === 'drawer_box' && p.part === 'DRAWER-BOX-FRONT';
    if (!isFront && !isBareBox) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ id: p.id, box: p.box });
  }
  return out;
}
