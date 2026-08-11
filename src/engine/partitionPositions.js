// ─── A PARTITION SPEAKS THE SHELVES' LANGUAGE (turn 23, CLAUDE.md F10) ──────
//
// Owner: the partition field measures from the cabinet's OUTER end; he places
// partitions from the INSIDE, and cares about BAY WIDTHS.
//
// It is exactly the disease turn 21's F10 cured for shelves, on the other axis,
// and it is cured the same way — which is why this file reads like
// `engine/shelfHeights.js` and uses its words:
//
//     stored 450  ──fieldFromX──▶  432  shown in the field
//     typed  432  ──xFromField──▶  450  stored
//
// ─── STORAGE DOES NOT MOVE (F10.2) ─────────────────────────────────────────
//
// `x_mm` still means exactly what it has meant since turn 11: the partition's
// LEFT FACE in the cabinet's own frame, whose zero is the outside of the left
// side panel. Every engine formula, every drilled row, every saved project is
// untouched. What this file does is MAP that number in and out for the places a
// person reads it, so a turn-22 project opens with every partition exactly
// where it was and only the numbers SHOWN change meaning.
//
// ─── ONE DERIVATION, TWO DISPLAYS (F10.1) ──────────────────────────────────
//
// The FIELD is a distance from the interior face; the CHIPS and F8's hover
// arrows are CLEAR BAY WIDTHS between neighbours. Both are here, in one module,
// because they are two readings of the same set of faces and the one thing that
// must never happen is a field and a chip disagreeing about a cabinet the owner
// is dividing up.
//
// Pure functions — no React, no store, no profile import.

/**
 * The INTERIOR LEFT: the inner face of the left side panel, in cabinet mm.
 *
 * The board thickness and nothing else — the exact mirror of
 * `shelfHeights.interiorFloor`, and for the same reason: a datum that moved
 * when something else was added would be a second answer rather than the one.
 */
export function interiorLeft(boardT) {
  return Math.max(0, Number(boardT) || 0);
}

/** What the FIELD shows for a stored `x_mm`: from the interior face. */
export function fieldFromX(x, boardT) {
  return Number(x) - interiorLeft(boardT);
}

/**
 * …and back. The exact inverse, so the field round-trips.
 *
 * It does NOT clamp: the clamp belongs to the collision rules
 * (`store.setPartitionX` and `engine/zones.js`), and a display mapping is not a
 * back door round them — turn 21 wrote the same sentence about shelves.
 */
export function xFromField(value, boardT) {
  return Number(value) + interiorLeft(boardT);
}

/**
 * The CLEAR BAYS across a cabinet: side → partition → partition → side.
 *
 * Faces, not centres. A bay is the space you can put something in, and a joiner
 * asking "how wide is that opening" is asking for the light between two boards.
 *
 * @param {object} args
 *   width       the cabinet's overall width
 *   boardT      the carcass board
 *   partitions  [{ x, w }] — each partition's left face and its thickness, in
 *               the cabinet's own frame. Order does not matter.
 * @returns {Array<{from:number, to:number, size:number, index:number}>}
 */
export function bayWidths({ width, boardT, partitions = [] }) {
  const W = Number(width) || 0;
  const G = interiorLeft(boardT);
  const walls = [
    { x: 0, w: G },
    ...partitions
      .map((p) => ({ x: Number(p.x), w: Number(p.w) || G }))
      .filter((p) => Number.isFinite(p.x)),
    { x: W - G, w: G },
  ].sort((a, b) => a.x - b.x);

  const out = [];
  for (let i = 0; i < walls.length - 1; i += 1) {
    const from = walls[i].x + walls[i].w;
    const to = walls[i + 1].x;
    out.push({
      from, to, size: to - from, index: i,
    });
  }
  return out;
}

/**
 * The two clear bays either side of ONE partition — what F8.2's hover arrows
 * draw, and the same faces `bayWidths` measures between.
 *
 * @param {object} args
 *   at     { x, w } — the partition being asked about
 *   walls  [{ x, w }] — every OTHER vertical face pair: the two sides and the
 *          other partitions
 * @returns {Array<{key:string, from:number, to:number, value:number}>}
 */
export function bayGapsAround({ at, walls = [] }) {
  const left = Number(at?.x);
  const right = left + Number(at?.w || 0);
  if (!Number.isFinite(left)) return [];

  const out = [];
  // The nearest face to the LEFT of this partition's left face…
  const before = walls
    .map((wall) => Number(wall.x) + Number(wall.w || 0))
    .filter((edge) => edge <= left + 1e-9)
    .sort((a, b) => b - a)[0];
  if (Number.isFinite(before)) out.push({ key: 'left', from: before, to: left, value: left - before });
  // …and to the RIGHT of its right face.
  const after = walls
    .map((wall) => Number(wall.x))
    .filter((edge) => edge >= right - 1e-9)
    .sort((a, b) => a - b)[0];
  if (Number.isFinite(after)) out.push({ key: 'right', from: right, to: after, value: after - right });
  return out;
}

/**
 * The bays of a computed unit, read off the ENGINE's own panels.
 *
 * The view calls this rather than re-deriving from `params`, so a partition the
 * engine has clamped is measured where the engine put it and not where the
 * field asked for it.
 */
export function bayWidthsOf(result, boardT) {
  const panels = (result?.panels || []).filter((p) => p.box);
  const left = panels.find((p) => p.part === 'BUL');
  const right = panels.find((p) => p.part === 'BUR');
  if (!left || !right) return [];
  return bayWidths({
    width: right.box.x + right.box.w,
    boardT,
    partitions: panels.filter((p) => p.part === 'VPART').map((p) => ({ x: p.box.x, w: p.box.w })),
  });
}
