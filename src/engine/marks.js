// ─── A MARK IS AN OPEN WALK (chat fix 17.10.2026, 16:10) ────────────────────
//
// A `cnc.marks` record has been `{ layer, from, to }` since turn 13: the 70 mm
// biscuit line, an in-and-out pass of the cutter. The owner's corner mark
// (KIT_NOTCH.lsp D9, 17.10.2026) was two such records per re-entrant corner,
// both leaving the corner, and VCarve, profiling them beside the line, put
// the cutter in the waste on one leg and in the board on the other: the
// waste side of an open vector is a side of its DIRECTION. The owner, 16:10:
// *"jeden L wektor ... obok linii"*. So a mark may now carry `pts`: the whole
// open walk, `from` its first point and `to` its last, kept so every reader
// that knew two points still reads the ends. ONE reader for the walk, here,
// so the sheet, the DXF, the 3-D and the part detail cannot disagree about
// what a mark is.

/** The open walk of a mark: its `pts`, or the two-point line of `from` to `to`. */
export function markPoints(mark) {
  if (Array.isArray(mark?.pts) && mark.pts.length >= 2) return mark.pts;
  return [mark.from, mark.to];
}

/** A mark with every point moved by (dx, dy); `pts` and the ends together. */
export function shiftMark(mark, dx, dy) {
  const mv = ([x, y]) => [x + dx, y + dy];
  return {
    ...mark,
    from: mv(mark.from),
    to: mv(mark.to),
    ...(Array.isArray(mark.pts) ? { pts: mark.pts.map(mv) } : {}),
  };
}

/** The length of the walk, point to point. */
export function markLength(mark) {
  const pts = markPoints(mark);
  let len = 0;
  for (let i = 1; i < pts.length; i += 1) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}
