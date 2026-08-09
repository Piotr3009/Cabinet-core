// ─── What a modal is ABOUT, as a rectangle (turn 12, CLAUDE.md rule 15) ─────
//
// The shell (components/Modal.jsx) places a modal beside its object, and this
// is the one line every caller needs in order to say WHICH object. It is here
// rather than in the shell because it is the half that touches the DOM — the
// arithmetic in lib/menuPlacement.js stays pure and testable, and this is a
// three-line adapter in front of `getBoundingClientRect`.
//
// Three shapes of object, one shape of answer:
//   • a menu entry or a button — the element's own rectangle;
//   • a piece in the 3D canvas — the click point, which is a rectangle of zero
//     size and needs no special case anywhere downstream;
//   • a cabinet in the scene — its projected screen box, when the caller has
//     bothered to work one out.

/** A DOM element's rectangle, in client px. */
export function anchorOfElement(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const r = el.getBoundingClientRect();
  return {
    x: r.left, y: r.top, width: r.width, height: r.height,
  };
}

/**
 * The rectangle of whatever a pointer event happened on.
 *
 * `currentTarget` and not `target`: a click on the label inside a button is a
 * click on the button, and the object the modal is about is the control, not
 * the span the pixel landed in.
 */
export function anchorOfEvent(e) {
  return anchorOfElement(e?.currentTarget) || anchorAtPoint(e?.clientX, e?.clientY);
}

/** A bare point — a rectangle of zero size. */
export function anchorAtPoint(x, y) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
  return {
    x: Number(x), y: Number(y), width: 0, height: 0,
  };
}
