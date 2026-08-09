// ─── CNC ANNOTATION, IN THE DRAWING'S OWN UNITS (turn 16, CLAUDE.md F3) ─────
//
// The owner's screenshot: zoom out and the cabinet names, the part codes and
// the drilling symbols stay SCREEN-sized. They pile onto each other, they spill
// outside the parts they belong to, and at full-sheet zoom the sheet is a mat
// of overlapping text with a drawing somewhere underneath it.
//
// The cause is one line of arithmetic repeated in five places:
//
//     const labelSize = LABEL_PX * mmPerPx;
//
// …which is a size in SHEET MILLIMETRES chosen so that it comes out at a fixed
// number of PIXELS. Zoom out and every caption grows in sheet space to stay the
// same size on the glass, while the parts under it shrink.
//
// So the rule this module encodes is the CAD one: annotation is part of the
// DRAWING. A caption is N millimetres tall on the sheet at every zoom, it is
// laid out inside the outline of the thing it names, and where it will not fit
// it TRUNCATES and then HIDES — it never grows into its neighbour.
//
// Pure functions, no DOM: the component asks what to draw and draws it, and a
// node test can ask the same questions.

/**
 * Rough advance width of a monospace face, as a fraction of the font size.
 * Only needs to be close: it decides when a label stops fitting, not layout.
 */
export const MONO_ADVANCE = 0.62;

/** How wide a string is, in sheet millimetres, at this font size. */
export function textWidthMm(text, sizeMm) {
  return String(text ?? '').length * sizeMm * MONO_ADVANCE;
}

/**
 * The longest prefix of `text` that fits in `widthMm` at `sizeMm`, with an
 * ellipsis where anything was dropped.
 *
 * Truncation is the middle step between "draw it" and "hide it": a part code
 * cut to `BUL…` still tells a joiner which piece he is looking at, and it still
 * cannot reach into the part beside it.
 */
export function truncateToWidth(text, widthMm, sizeMm) {
  const full = String(text ?? '');
  if (!full) return '';
  if (textWidthMm(full, sizeMm) <= widthMm) return full;
  const room = Math.floor(widthMm / (sizeMm * MONO_ADVANCE));
  if (room <= 1) return '';
  return `${full.slice(0, room - 1)}…`;
}

/**
 * How to draw one label, in sheet millimetres.
 *
 * @param {object} spec
 *   text     what it says
 *   sizeMm   the size it WANTS to be, from the profile — a sheet dimension
 *   boxW/boxH the space it may occupy, in sheet millimetres. A part's caption
 *            is given the part's own outline, which is what "everything a part
 *            owns fits INSIDE its outline" means (F3).
 *   mmPerPx  the current zoom, so the readability floor can be applied
 *   minPx    the profile's threshold: under this many pixels tall a label is
 *            not drawn at all
 *   fit      'shrink' (default) — shrink to fit the box, then truncate
 *            'truncate'         — keep the size, truncate to the width
 * @returns {{visible:boolean, size:number, text:string}}
 */
export function labelFit({
  text, sizeMm, boxW = Infinity, boxH = Infinity, mmPerPx = 1, minPx = 0, fit = 'shrink',
}) {
  const hidden = { visible: false, size: 0, text: '' };
  const wanted = Number(sizeMm) || 0;
  if (!(wanted > 0) || !String(text ?? '').length) return hidden;

  // A caption never stands taller than the space it is given, and never wider
  // than it either — shrinking first is what keeps a small part's code inside
  // it instead of hanging over the piece next door.
  let size = wanted;
  if (fit === 'shrink') {
    if (Number.isFinite(boxH)) size = Math.min(size, boxH);
    if (Number.isFinite(boxW)) size = Math.min(size, boxW / (String(text).length * MONO_ADVANCE));
  }
  if (!(size > 0)) return hidden;

  // The readability floor, in PIXELS — the one screen-space number in the
  // drawing, and it decides only whether a thing is drawn, never how big it is.
  if (minPx > 0 && mmPerPx > 0 && size / mmPerPx < minPx) return hidden;

  const shown = Number.isFinite(boxW) ? truncateToWidth(text, boxW, size) : String(text);
  if (!shown) return hidden;
  return { visible: true, size, text: shown };
}

/**
 * Is a drilling / pocket / mark symbol worth drawing at this zoom?
 *
 * The symbols scale with the drawing now — a ⌀5 hole is five millimetres at
 * every zoom, which is what stops thirty-six of them merging into one grey
 * smudge when the whole kitchen is on screen. Below the profile's threshold
 * they are HIDDEN rather than inflated, which is the same rule the captions
 * follow and the reason the sheet stays readable at both ends.
 */
export function symbolVisible(sizeMm, mmPerPx, minPx) {
  if (!(minPx > 0)) return true;
  if (!(mmPerPx > 0)) return true;
  return (Number(sizeMm) || 0) / mmPerPx >= minPx;
}

/**
 * Where a part's own caption sits: INSIDE its outline, along the bottom.
 *
 * Turn 11 put it under the part, one caption height below — which is outside
 * the part, in the gap the layout leaves between rows, and therefore in the
 * space the row beneath is drawn in as soon as the gap is smaller than the
 * text. Inside is both the fix and the CAD convention.
 *
 * @returns {{x:number, y:number}} sheet coordinates for a middle-anchored label
 */
export function partLabelAnchor(place, size, insetFactor = 0) {
  const inset = Math.max(size * 0.35, place.h * insetFactor);
  return {
    x: place.x + place.w / 2,
    y: place.y + place.h - inset,
  };
}
