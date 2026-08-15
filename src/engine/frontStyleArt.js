// ─── The little pictures of the front styles (turn 15, CLAUDE.md F4) ────────
//
// The owner, twice: "there will be MANY kitchen/front styles — never a bare
// dropdown", and, of the shapes list shipped in the chat batch, "będziemy
// później wstawiać małe instrukcje". These are those little instructions'
// first form: one clean line drawing per shape, so a joiner picks a picture
// rather than reading the word "GF" and guessing.
//
// ─── WHY IT IS A MODULE AND NOT SEVEN <svg> BLOCKS IN A COMPONENT ───────────
//
// F4.2 names the requirement outright: "style number thirty must cost one data
// entry and one svg, zero component work". So the drawings are DATA — a path
// list per style id, in ONE viewBox, drawn by ONE tiny renderer. Adding the
// thirtieth style is:
//
//   1. a line in FRONT_STYLE_OPTIONS (engine/design.js) — id + label
//   2. a key in FRONT_STYLE_ART below — its outline
//
// and no component is opened.
//
// ─── THE DRAWING FRAME ──────────────────────────────────────────────────────
// A 100 × 140 door, seen face on, origin top-left, y down — the SVG frame, so
// the numbers below read the way they are drawn. They are PROPORTIONS of a
// picture and not millimetres of a cabinet: nothing here reaches the engine,
// the cut list or the 3D view, which is why these numbers are allowed to live
// beside the shapes they draw rather than in profile.js (CLAUDE.md rule 2 is
// about the numbers a machine cuts to).
//
// Pure data + pure functions. No React.

export const FRONT_ART_VIEWBOX = { w: 100, h: 140 };

/** The door's own outer rectangle, inset a hair so the stroke is not clipped. */
const OUTER = { x: 4, y: 4, w: 92, h: 132 };

/**
 * One drawing: a list of primitives. Three kinds, which is all a door needs:
 *
 *   { rect: [x, y, w, h], rx? }   a panel or a groove
 *   { line: [x1, y1, x2, y2] }    a scored line
 *   { path: 'M…' }                anything curved (the arched heads)
 *
 * `soft: true` marks a line that is DETAIL rather than an edge — the renderer
 * draws it thinner, so a shaker's rails read as joints and not as cut lines.
 */
export const FRONT_STYLE_ART = {
  // Shaker: a frame with a flat centre panel. The rails and stiles are what
  // make it a shaker, so they are the drawing.
  S: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
    { rect: [OUTER.x + 14, OUTER.y + 16, OUTER.w - 28, OUTER.h - 32] },
  ],
  // Flat slab: the door and nothing else. Drawn with one soft line down the
  // face so the tile does not read as an empty box.
  F: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
  ],
  // Handleless J: the lip is a J in section, and face-on it reads as a band
  // taken out of the top edge with the finger pull under it.
  HJ: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
    { line: [OUTER.x, OUTER.y + 18, OUTER.x + OUTER.w, OUTER.y + 18] },
    { path: `M ${OUTER.x + 6} ${OUTER.y + 18} L ${OUTER.x + 6} ${OUTER.y + 9} Q ${OUTER.x + 6} ${OUTER.y + 5} ${OUTER.x + 12} ${OUTER.y + 5} L ${OUTER.x + OUTER.w - 6} ${OUTER.y + 5}`, soft: true },
  ],
  // Grooved: parallel lines down the face — the whole style is the spacing.
  G: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
    ...[0, 1, 2, 3, 4].map((i) => ({
      line: [OUTER.x + 16 + i * 15, OUTER.y + 8, OUTER.x + 16 + i * 15, OUTER.y + OUTER.h - 8],
      soft: true,
    })),
  ],
  // Grooved with frame: the same lines, held inside a shaker frame.
  GF: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
    { rect: [OUTER.x + 12, OUTER.y + 14, OUTER.w - 24, OUTER.h - 28] },
    ...[0, 1, 2, 3].map((i) => ({
      line: [OUTER.x + 24 + i * 14, OUTER.y + 20, OUTER.x + 24 + i * 14, OUTER.y + OUTER.h - 20],
      soft: true,
    })),
  ],
  // Arched: a frame whose head is curved.
  A: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
    {
      path: `M ${OUTER.x + 14} ${OUTER.y + OUTER.h - 16} L ${OUTER.x + 14} ${OUTER.y + 40}`
        + ` Q ${OUTER.x + OUTER.w / 2} ${OUTER.y + 12} ${OUTER.x + OUTER.w - 14} ${OUTER.y + 40}`
        + ` L ${OUTER.x + OUTER.w - 14} ${OUTER.y + OUTER.h - 16} Z`,
    },
  ],
  // ─── Turn 30 (CLAUDE.md F21): GLASS ────────────────────────────────────
  // The shaker's own frame — because that is literally what it is cut with —
  // with the panel drawn as a pane rather than as a board: two soft diagonals,
  // which is how a glazed door has been drawn on an elevation for a century.
  GL: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
    { rect: [OUTER.x + 14, OUTER.y + 16, OUTER.w - 28, OUTER.h - 32] },
    {
      line: [OUTER.x + 20, OUTER.y + OUTER.h - 22, OUTER.x + OUTER.w - 20, OUTER.y + 22],
      soft: true,
    },
    {
      line: [OUTER.x + 20, OUTER.y + OUTER.h - 44, OUTER.x + OUTER.w - 42, OUTER.y + 22],
      soft: true,
    },
  ],
  // Arched handleless: the arch, and the J lip along the top instead of a knob.
  AH: [
    { rect: [OUTER.x, OUTER.y, OUTER.w, OUTER.h] },
    { line: [OUTER.x, OUTER.y + 18, OUTER.x + OUTER.w, OUTER.y + 18] },
    {
      path: `M ${OUTER.x + 14} ${OUTER.y + OUTER.h - 16} L ${OUTER.x + 14} ${OUTER.y + 52}`
        + ` Q ${OUTER.x + OUTER.w / 2} ${OUTER.y + 26} ${OUTER.x + OUTER.w - 14} ${OUTER.y + 52}`
        + ` L ${OUTER.x + OUTER.w - 14} ${OUTER.y + OUTER.h - 16} Z`,
    },
  ],
};

/**
 * The drawing for a style id, or the plain slab.
 *
 * A style with no drawing yet is a rectangle rather than a blank tile — the
 * gallery is a gallery even on the day a new id is added and its picture is
 * not drawn, and F4.2 promises the id costs one data entry.
 */
export function frontStyleArt(styleId) {
  return FRONT_STYLE_ART[styleId] || FRONT_STYLE_ART.F;
}

/** Every style that has a drawing of its own — what a test holds to account. */
export function drawnFrontStyleIds() {
  return Object.keys(FRONT_STYLE_ART);
}
