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
 * Advance width of a monospace face, as a fraction of the font size.
 *
 * ─── Turn 18 (CLAUDE.md F1.3): 0.62 → 0.85 ─────────────────────────────────
 * 0.62 is what OUR font measures, and for the screen that was right. It is
 * wrong for the FILE, and the file is what the owner's screenshot was of: a
 * DXF carries no font, the reader's CAD picks its own, and the one on Piotr's
 * machine is wider than ours — so a label sized to fit at 0.62 came out of
 * VCarve hanging over both edges of the part.
 *
 * A label must fit in the WORST reasonable face, not the best. 0.85 is the
 * advance of the wide end of the monospace family (Courier's own is 0.6,
 * Consolas 0.55, but a CAD default is frequently a proportional face set as
 * though it were fixed-pitch, which is where the width comes from).
 *
 * The screen takes the same number, because F1.1's whole point is that the
 * sheet and the file lay a label out with ONE function: a caption that fits on
 * the glass and not on the board is the bug, not the fix.
 */
export const MONO_ADVANCE = 0.85;

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
 *
 * `ellipsis` is the mark left where something was dropped. The screen keeps the
 * typographic one; the DXF WRITER passes an ASCII `~`, for the reason
 * engine/cnc/partLabel.js gives about the multiplication sign — R12 predates any
 * agreement about what a byte above 127 means, and a label a machine mis-decodes
 * is worse than a short one (turn 17, CLAUDE.md F1).
 */
export function truncateToWidth(text, widthMm, sizeMm, ellipsis = '…') {
  const full = String(text ?? '');
  if (!full) return '';
  if (textWidthMm(full, sizeMm) <= widthMm) return full;
  const room = Math.floor(widthMm / (sizeMm * MONO_ADVANCE));
  const tail = String(ellipsis);
  if (room <= tail.length) return '';
  return `${full.slice(0, room - tail.length)}${tail}`;
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
 * Where a part's own caption sits: INSIDE its outline, in the MIDDLE of it.
 *
 * Turn 11 put it under the part, one caption height below — which is outside
 * the part, in the gap the layout leaves between rows, and therefore in the
 * space the row beneath is drawn in as soon as the gap is smaller than the
 * text. Turn 16 moved it inside, along the bottom edge.
 *
 * Turn 18 (CLAUDE.md F1.1) centres it BOTH WAYS, which is where the exported
 * file has always put it (`panelEntities`: x = w/2, y = h/2) and is what a
 * three-line block needs — a block hung off the bottom edge grows upwards out
 * of its own part. `insetFactor` is accepted and ignored: a centred block has
 * no edge to stand off.
 *
 * @returns {{x:number, y:number}} sheet coordinates for a middle-anchored label
 */
export function partLabelAnchor(place) {
  return {
    x: place.x + place.w / 2,
    y: place.y + place.h / 2,
  };
}

// ─── THE ONE LABEL LAYOUT (turn 18, CLAUDE.md F1.1) ─────────────────────────
//
// The owner's export screenshot: `F01 TOP 564x540 F01 BOTTOM 564x…` running
// over the parts and into the neighbours. Two things were true at once and
// both are fixed here.
//
//   • the label was ONE LINE, so a small part could only ever fit it by
//     shrinking to nothing or by hanging over its own edges;
//   • the SHEET and the FILE each worked out the fit their own way — one from
//     `annotation.partLabelMm` and a half-height box, the other from
//     `cnc.labelHeight` and a fit ratio — so the picture on the glass and the
//     lettering on the board could disagree, and did.
//
// So: ONE function, used by components/CncView.jsx AND by engine/cnc/dxf.js.
// A label breaks onto up to `maxLines` centred lines at its natural word
// breaks (`F-01` / `BUR` / `597x568`), the block is centred in the part both
// ways, and a line that still will not fit is TRUNCATED — the turn-16 middle
// step between "draw it" and "hide it". It never crosses the outline.

/**
 * Split `words` into exactly `n` lines, keeping the longest line as short as
 * possible.
 *
 * Balanced rather than greedy, because balanced is what makes a block of text
 * read as a block: greedy wrapping of `F-01 BUR 597x568` into two lines gives
 * `F-01 BUR` / `597x568`, which is the same longest line as the balanced
 * answer, but on a four-word label it leaves a widow.
 *
 * Words are never broken: a single word too long for the line is the
 * truncator's problem, not the wrapper's.
 */
export function splitLines(words, n) {
  const list = words.filter((w) => w.length);
  if (!list.length) return [];
  const lines = Math.max(1, Math.min(Math.trunc(n) || 1, list.length));
  if (lines === 1) return [list.join(' ')];
  if (lines >= list.length) return list.slice();

  // best[i][k] = the shortest possible longest-line over words i… in k lines.
  const memo = new Map();
  const solve = (i, k) => {
    if (k === 1) return { longest: list.slice(i).join(' ').length, cuts: [] };
    const key = `${i}|${k}`;
    const known = memo.get(key);
    if (known) return known;
    let best = null;
    // Leave at least one word for each remaining line.
    for (let j = i + 1; j <= list.length - (k - 1); j += 1) {
      const head = list.slice(i, j).join(' ').length;
      const rest = solve(j, k - 1);
      const longest = Math.max(head, rest.longest);
      if (!best || longest < best.longest) best = { longest, cuts: [j, ...rest.cuts] };
    }
    memo.set(key, best);
    return best;
  };

  const { cuts } = solve(0, lines);
  const out = [];
  let from = 0;
  for (const cut of [...cuts, list.length]) {
    out.push(list.slice(from, cut).join(' '));
    from = cut;
  }
  return out;
}

/**
 * How to draw a part's own caption as a BLOCK, in sheet millimetres.
 *
 * @param {object} spec
 *   text       what it says
 *   sizeMm     the size it WANTS to be, from the profile
 *   boxW/boxH  the part's own rectangle, in the same millimetres
 *   maxLines   how many lines it may break onto (profile.cnc.labelMaxLines)
 *   fillRatio  the share of the rectangle the block may fill
 *   lineGap    leading between two lines, as a share of the size
 *   minSize    the readable floor in MILLIMETRES (profile.cnc.labelMinHeight)
 *   mmPerPx    the current zoom, so the screen floor can be applied
 *   minPx      under this many pixels tall the block is not drawn at all
 *   ellipsis   what a truncated line ends with — ASCII `~` for both the sheet
 *              and the file, for the reason engine/cnc/partLabel.js gives about
 *              the multiplication sign
 *
 * @returns {{visible:boolean, size:number, step:number, width:number,
 *            height:number, lines:{text:string, dy:number}[]}}
 *   `dy` is each line's offset from the block's CENTRE, positive UP — the
 *   drawing's own frame. A DXF adds it; an SVG viewport subtracts it.
 */
export function labelBlock({
  text, sizeMm, boxW = Infinity, boxH = Infinity,
  maxLines = 1, fillRatio = 1, lineGap = 0, minSize = 0,
  mmPerPx = 1, minPx = 0, ellipsis = '~',
}) {
  const hidden = {
    visible: false, size: 0, step: 0, width: 0, height: 0, lines: [],
  };
  const full = String(text ?? '').trim();
  const wanted = Number(sizeMm) || 0;
  if (!full || !(wanted > 0)) return hidden;

  const ratio = Number(fillRatio) > 0 ? Number(fillRatio) : 1;
  const gap = Math.max(0, Number(lineGap) || 0);
  const innerW = Number.isFinite(boxW) ? Math.abs(boxW) * ratio : Infinity;
  const innerH = Number.isFinite(boxH) ? Math.abs(boxH) * ratio : Infinity;
  const words = full.split(/\s+/);
  const cap = Math.max(1, Math.min(Math.trunc(maxLines) || 1, words.length));

  // Try every line count the profile allows and keep the one that lets the
  // caption stand TALLEST. That is what makes the choice automatic: a long
  // board takes one line because one line is biggest on it, and a small square
  // part takes three because three is.
  let best = null;
  for (let n = 1; n <= cap; n += 1) {
    const lines = splitLines(words, n);
    const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
    const byWidth = Number.isFinite(innerW) && longest > 0
      ? innerW / (longest * MONO_ADVANCE) : Infinity;
    const byHeight = Number.isFinite(innerH)
      ? innerH / (lines.length + (lines.length - 1) * gap) : Infinity;
    const size = Math.min(wanted, byWidth, byHeight);
    if (!best || size > best.size + 1e-9) best = { size, lines };
  }

  // The floor is a MILLIMETRE floor and it wins over the fit, exactly as it has
  // since turn 3 — a caption below it is unreadable on the board, and the
  // answer to "it does not fit" is to truncate the words, never to write them
  // at 2 mm. What the floor may not do is push the BLOCK out of the part, so
  // the line count is taken back down until the block fits the height again.
  const size = Math.max(Number(minSize) || 0, best.size);
  if (!(size > 0)) return hidden;
  const step = size * (1 + gap);
  let lines = best.lines;
  if (Number.isFinite(innerH)) {
    const fits = Math.max(1, Math.floor((innerH + size * gap) / step + 1e-9));
    if (lines.length > fits) lines = splitLines(words, fits);
  }

  // The readability floor, in PIXELS — the one screen-space number in the
  // drawing, and it decides only whether a thing is drawn, never how big it is.
  if (minPx > 0 && mmPerPx > 0 && size / mmPerPx < minPx) return hidden;

  const shown = lines
    .map((line) => (Number.isFinite(innerW) ? truncateToWidth(line, innerW, size, ellipsis) : line))
    .filter((line) => line.length);
  if (!shown.length) return hidden;

  const n = shown.length;
  return {
    visible: true,
    size,
    step,
    width: shown.reduce((m, l) => Math.max(m, textWidthMm(l, size)), 0),
    height: n * size + (n - 1) * gap * size,
    lines: shown.map((line, i) => ({ text: line, dy: ((n - 1) / 2 - i) * step })),
  };
}
