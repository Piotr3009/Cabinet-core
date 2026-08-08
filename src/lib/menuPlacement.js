// ─── Where a floating menu actually goes (turn 11, CLAUDE.md F1.4) ───
//
// Piotr, on a laptop: the right-click menu runs off the bottom of the screen and
// the last entries cannot be reached. Turn 5's placement was two `Math.min`s
// against a GUESSED height (`actions.length * 30 + 40`), which is wrong twice:
// it has no lower bound, so on a short viewport the answer went NEGATIVE and the
// menu lost its top instead of its bottom, and it never measured the thing it
// was placing.
//
// So the rule is written down, once, as arithmetic on six numbers:
//
//   FLIP first — a menu that will not fit below the cursor opens ABOVE it, which
//   is what every desktop menu does and what keeps the pointer next to the entry
//   it is pointing at.
//   CLAMP second — if it fits in neither direction (a menu taller than the
//   viewport), it is pinned to the top edge, because the entries a joiner reads
//   first are the ones at the top.
//
// Pure arithmetic: no DOM, no React. The component measures and calls this.

/**
 * @param {object} args
 *   x, y            where the pointer asked for the menu, in client px
 *   width, height   the menu's MEASURED size
 *   viewport        { width, height }
 *   margin          how close to an edge the menu may come
 * @returns {{left:number, top:number, flippedX:boolean, flippedY:boolean}}
 */
export function clampMenuPosition({
  x, y, width, height, viewport, margin = 8,
}) {
  const vw = Math.max(0, Number(viewport?.width) || 0);
  const vh = Math.max(0, Number(viewport?.height) || 0);
  const w = Math.max(0, Number(width) || 0);
  const h = Math.max(0, Number(height) || 0);
  const m = Math.max(0, Number(margin) || 0);

  return {
    ...axis(Number(x) || 0, w, vw, m, 'X'),
    ...axis(Number(y) || 0, h, vh, m, 'Y'),
  };
}

/**
 * One axis of it. `at` is where the pointer is, and the menu opens in the
 * positive direction from there unless it does not fit.
 */
function axis(at, size, extent, margin, tag) {
  const key = tag === 'X' ? 'left' : 'top';
  const flip = tag === 'X' ? 'flippedX' : 'flippedY';
  // A viewport that cannot hold the menu at all: the margin is given up rather
  // than returning a position outside it. Whatever is left is better read from
  // the top-left corner than from the middle of nowhere.
  const last = extent - size - margin;
  if (last < margin) return { [key]: Math.max(0, Math.min(at, Math.max(0, extent - size))), [flip]: false };

  if (at + size + margin <= extent) return { [key]: Math.max(margin, at), [flip]: false };
  // It does not fit forwards. Open BACKWARDS from the pointer if that fits…
  if (at - size >= margin) return { [key]: at - size, [flip]: true };
  // …and otherwise sit against the far edge, still fully inside.
  return { [key]: last, [flip]: false };
}
