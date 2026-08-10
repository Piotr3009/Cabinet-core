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

// ─── BESIDE THE OBJECT (turn 12, CLAUDE.md rule 15) ─────────────────────────
//
// The MODAL RULE, and the owner said "na zawsze": every modal in this
// application opens BESIDE the object it concerns and never covering it. The
// clamp above is the seed — it keeps a floating thing on the screen — and this
// is the other half of the arithmetic: it decides WHICH SIDE of the object the
// thing goes on before the clamp is asked to keep it there.
//
// The difference matters. `clampMenuPosition` is given a POINT and opens from
// it, so a modal placed by it can still land on top of the very cabinet it is
// editing — the point is usually ON the cabinet. This is given the object's
// RECTANGLE, and the answer it returns is a position that does not intersect
// it if any of the four sides has room.
//
// The order the sides are tried — right, left, below, above — is the order a
// person's eye goes looking for the panel that just opened, and it is also the
// order that keeps a tall modal usable: the sides of a screen are where the
// height is.
//
// Pure arithmetic, like everything else in this file: no DOM, no React. The
// component measures itself and its anchor and calls this.

/** The four sides, in the order they are tried. */
export const MODAL_SIDES = ['right', 'left', 'below', 'above'];

/**
 * Where a modal goes so that it sits beside its object rather than on it.
 *
 * @param {object} args
 *   anchor    { x, y, width, height } — the object, in client px. A click point
 *             is simply a rectangle of zero size, which is what makes this work
 *             for "the piece I double-clicked" as well as for "that button".
 *   size      { width, height } — the modal's MEASURED size
 *   viewport  { width, height }
 *   gap       clear space left between the object and the modal
 *   margin    how close to a viewport edge the modal may come
 *   prefer    a side to try first (still only used if it fits)
 * @returns {{left:number, top:number, side:string, fits:boolean}}
 *   `fits` is false when the object is so big, or the screen so small, that no
 *   side has room — the position is then still fully on screen, but it overlaps.
 */
export function placeBesideAnchor({
  anchor, size, viewport, gap = 12, margin = 8, prefer = null,
}) {
  const vw = Math.max(0, Number(viewport?.width) || 0);
  const vh = Math.max(0, Number(viewport?.height) || 0);
  const w = Math.max(0, Number(size?.width) || 0);
  const h = Math.max(0, Number(size?.height) || 0);
  const g = Math.max(0, Number(gap) || 0);
  const m = Math.max(0, Number(margin) || 0);
  const a = normaliseAnchor(anchor);

  // How much clear room each side of the object has, once the gap and the
  // viewport margin are taken out of it.
  const room = {
    right: vw - (a.x + a.width) - g - m,
    left: a.x - g - m,
    below: vh - (a.y + a.height) - g - m,
    above: a.y - g - m,
  };
  const needed = { right: w, left: w, below: h, above: h };

  const order = prefer && MODAL_SIDES.includes(prefer)
    ? [prefer, ...MODAL_SIDES.filter((s) => s !== prefer)]
    : MODAL_SIDES;

  for (const side of order) {
    if (room[side] >= needed[side]) {
      // The CROSS axis is clamped too — a modal beside a cabinet low down the
      // screen is slid up until all of it is visible. It cannot slide onto the
      // object doing so: the side that was chosen has already separated them
      // along the other axis.
      return { ...positionOn(side, a, w, h, g, vw, vh, m), side, fits: true };
    }
  }

  // Nowhere to stand. Take the side with the most room anyway — the modal is
  // then pushed against the outer edge by the clamp, which is the least of it
  // that ends up over the object — and say so, so a caller that wants to dim
  // the object instead can.
  const best = MODAL_SIDES.reduce((a1, b) => (room[b] > room[a1] ? b : a1), MODAL_SIDES[0]);
  return { ...positionOn(best, a, w, h, g, vw, vh, m), side: best, fits: false };
}

// ─── UP AND TO THE RIGHT (turn 19, CLAUDE.md F3 / W37) ──────────────────────
//
// Owner: "klikam na drzwi, a modal mi się otwiera na drzwiach i chuj widzę."
//
// `placeBesideAnchor` above is right about a CABINET and wrong about a POINT.
// A double-click on a door hands the shell a rectangle of zero size; "beside"
// it is a millimetre away; and the panel lands on the door. The rule was never
// wrong, it was under-specified — "beside" needs a DISTANCE and a DIRECTION.
//
// So this is the tightened rule, and it is one function so that every modal in
// the application inherits it from the shell rather than from a copy:
//
//   1. UP AND RIGHT of the object, by `offset.x` across and `offset.y` up —
//      plus the modal's OWN HEIGHT, so it is the panel's bottom-left corner
//      that sits off the object's top-right corner and everything below the
//      pointer stays in shot.
//   2. CLAMPED to the viewport, and where the right-hand edge has no room the
//      panel goes up and LEFT instead. Either way the panel is separated from
//      the object along the X axis, which is what makes the guarantee hold: the
//      vertical clamp can slide the panel anywhere it likes down the screen and
//      it still cannot come back over the object.
//   3. Where NEITHER side has room — an object as wide as the screen — it falls
//      through to the four-side search above, which will put it below or above.
//
// Pure arithmetic. The shell measures and calls this; test/modal-shell.test.js
// asserts the property that matters, which is the same one turn 12 stated:
// THE MODAL AND THE OBJECT DO NOT OVERLAP.

/** The sides this rule can answer with, before it defers to the four above. */
export const MODAL_OFFSET_SIDES = ['up-right', 'up-left'];

/**
 * Where a modal goes when it is opened ON something — the shell's rule.
 *
 * @param {object} args
 *   anchor    { x, y, width, height } — the object, in client px. A click point
 *             is a rectangle of zero size, which is the case this exists for.
 *   size      { width, height } — the modal's MEASURED size
 *   viewport  { width, height }
 *   offset    { x, y } — profile.ui.modal.anchorOffset. Positive x is right;
 *             NEGATIVE y is up, which is the screen's own sign.
 *   gap       the clear space `placeBesideAnchor` uses, for the fallback
 *   margin    how close to a viewport edge the modal may come
 * @returns {{left:number, top:number, side:string, fits:boolean}}
 */
export function placeAnchoredModal({
  anchor, size, viewport, offset = null, gap = 12, margin = 8,
}) {
  const vw = Math.max(0, Number(viewport?.width) || 0);
  const vh = Math.max(0, Number(viewport?.height) || 0);
  const w = Math.max(0, Number(size?.width) || 0);
  const h = Math.max(0, Number(size?.height) || 0);
  const m = Math.max(0, Number(margin) || 0);
  const a = normaliseAnchor(anchor);
  // A missing offset is not a reason to open on top of the object: the four-
  // side search is the honest fallback, and it is what turn 12 shipped.
  const dx = Math.abs(Number(offset?.x) || 0);
  const dy = Math.abs(Number(offset?.y) || 0);
  if (!dx && !dy) return placeBesideAnchor({ anchor, size, viewport, gap, margin });

  // The vertical answer is the same for both hands: the panel's BOTTOM sits
  // `dy` above the object's top, and the clamp keeps it on the screen. Sliding
  // it down cannot bring it back over the object, because the horizontal
  // separation below is what does the work.
  const wantedTop = a.y - dy - h;
  const top = vh
    ? Math.max(m, Math.min(wantedTop, Math.max(m, vh - h - m)))
    : wantedTop;

  const rightLeft = a.x + a.width + dx;
  const leftLeft = a.x - dx - w;
  // "Fits" means the panel is wholly on screen WITHOUT giving up the separation
  // — a right-hand placement that has to be clamped leftwards is a placement
  // that would slide back over the object, so it is refused rather than nudged.
  if (vw === 0 || rightLeft + w <= vw - m) {
    return { left: rightLeft, top, side: 'up-right', fits: true };
  }
  if (leftLeft >= m) {
    return { left: leftLeft, top, side: 'up-left', fits: true };
  }
  // Neither hand. The object is as wide as the screen, or the screen is as
  // narrow as the panel: the four-side search knows what to do about that, and
  // it has known since turn 12.
  return placeBesideAnchor({ anchor, size, viewport, gap, margin });
}

/**
 * The rectangle for one side, cross-axis aligned to the object and clamped so
 * that the whole modal stays on the screen.
 *
 * Aligning the cross axis to the object's own edge — not to its centre — is
 * what makes a row of modals opened off a menu bar line up with the entries
 * that opened them.
 */
function positionOn(side, a, w, h, gap, vw = 0, vh = 0, margin = 0) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));
  if (side === 'right' || side === 'left') {
    const left = side === 'right' ? a.x + a.width + gap : a.x - gap - w;
    return {
      left: vw ? clamp(left, margin, vw - w - margin) : left,
      top: clamp(a.y, margin, Math.max(margin, (vh || a.y + h + margin) - h - margin)),
    };
  }
  const top = side === 'below' ? a.y + a.height + gap : a.y - gap - h;
  return {
    left: clamp(a.x, margin, Math.max(margin, (vw || a.x + w + margin) - w - margin)),
    top: vh ? clamp(top, margin, vh - h - margin) : top,
  };
}

/** A rectangle, however loosely it was described. A point is a zero-size one. */
function normaliseAnchor(anchor) {
  return {
    x: Number(anchor?.x) || 0,
    y: Number(anchor?.y) || 0,
    width: Math.max(0, Number(anchor?.width) || 0),
    height: Math.max(0, Number(anchor?.height) || 0),
  };
}

// ─── MAXIMISED (turn 13, CLAUDE.md F2.1) ───────────────────────────────────
//
// Rule 15's one sanctioned exception. The cabinet EDITOR is a workspace, not a
// side dialog: the owner works in it, so it opens near-fullscreen and covering
// whatever it likes. Everything else about the shell survives — the header is
// still a drag handle once the window is restored, Escape still closes it.
//
// It is here, beside the other two, because it is the same KIND of thing: a
// rectangle worked out from the viewport and a profile number, with no DOM in
// sight. That is what lets the browser walk assert it.

/**
 * The rectangle of a maximised window: the viewport, less a margin on each side.
 *
 * @param {object} args
 *   viewport  { width, height }
 *   margin    clear pixels left round the window
 * @returns {{left:number, top:number, width:number, height:number}}
 */
export function maximiseInViewport({ viewport, margin = 0 }) {
  const vw = Math.max(0, Number(viewport?.width) || 0);
  const vh = Math.max(0, Number(viewport?.height) || 0);
  // A margin that would leave nothing is given up rather than returning a
  // negative window — the same concession every clamp in this file makes.
  const m = Math.max(0, Math.min(Number(margin) || 0, Math.min(vw, vh) / 4));
  return {
    left: m,
    top: m,
    width: Math.max(0, vw - m * 2),
    height: Math.max(0, vh - m * 2),
  };
}

/**
 * Keep a position on the screen and change nothing else.
 *
 * This is what a DRAGGED modal is put through (rule 15a): the hand has said
 * where it goes and the only remaining question is whether all of it can be
 * seen. `clampMenuPosition` would FLIP it — right for a menu opening from a
 * pointer, wrong for a panel somebody is holding.
 */
export function clampToViewport({
  left, top, size, viewport, margin = 0,
}) {
  const vw = Math.max(0, Number(viewport?.width) || 0);
  const vh = Math.max(0, Number(viewport?.height) || 0);
  const w = Math.max(0, Number(size?.width) || 0);
  const h = Math.max(0, Number(size?.height) || 0);
  const m = Math.max(0, Number(margin) || 0);
  const axisClamp = (v, extent, span) => {
    // A modal taller than the screen is pinned to the top edge: what a joiner
    // reads first is at the top, exactly as for the menu above.
    if (span + m * 2 > extent) return Math.min(m, Math.max(0, extent - span));
    return Math.max(m, Math.min(Number(v) || 0, extent - span - m));
  };
  return { left: axisClamp(left, vw, w), top: axisClamp(top, vh, h) };
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
