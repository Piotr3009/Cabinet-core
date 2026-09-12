// ─── TURN 69 · F3 · A DOOR THAT LOOKS LIKE A DOOR ──────────────────────────
//
// CLAUDE.md, F3, verbatim:
//
//   *"**Door and window get drawings** — ToolArt-style vector art in the
//   elevation (a door with a leaf line, a window with sill and panes), not the
//   present rectangles. No photos."*
//
// The elevation drew both as one filled rectangle with a caption. A client
// looking at their own wall could not tell a 900 door from a 900 window without
// reading the words under it, which is exactly what a drawing is for.
//
// ─── WHY THIS IS A MODULE AND NOT A COMPONENT ──────────────────────────────
//
// `WallElevationModal.jsx` is FROZEN in PRO (it is not in T67's `EXEMPT`, and
// tonight licenses `RoomModal.jsx` and nothing else in `src/components/`) and
// its retail twin is a COPY. So the art cannot live in the window: it would be
// a second drawing the day PRO is licensed, and *"one law, no second
// highlighter"* is the same sentence about a door.
//
// It lives HERE instead — plain data, no React, no colours of its own — and it
// is read by whoever draws an elevation. Tonight that is the retail copy, which
// declares the divergence the way F2's does. The night PRO's window is
// licensed it takes the same call and the two apps draw the same door, because
// there is only ever one drawing of it.
//
// ─── WHAT IT RETURNS ───────────────────────────────────────────────────────
//
// A list of PRIMITIVES in the opening's own millimetres, origin at its
// bottom-left, y UP — the same frame the elevation already thinks in, so the
// caller's existing `sx`/`sy` place them and nothing here knows about pixels,
// scale or pan. Each is `{ kind: 'line', x1, y1, x2, y2 }` or
// `{ kind: 'rect', x, y, w, h }`, and `role` says what it is for so a caller
// can weight its ink: `'frame'`, `'leaf'`, `'glass'`, `'sill'`, `'knob'`.
//
// No photos, and nothing that needs one: a door is a leaf line and a knob, and
// a window is a sill, a frame and its panes. That is what a joiner draws.

/** How thick a drawn frame is, as a fraction of the smaller side. */
const FRAME = 0.06;
/** Never thinner than this, never fatter than that, in millimetres. */
const FRAME_MIN = 40;
const FRAME_MAX = 120;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const line = (x1, y1, x2, y2, role) => ({ kind: 'line', x1, y1, x2, y2, role });
const rect = (x, y, w, h, role) => ({ kind: 'rect', x, y, w, h, role });

/**
 * A DOOR, in elevation: the opening, a leaf hung on one side, and a knob.
 *
 * The leaf is drawn as the joiner draws it on a wall elevation — a second line
 * inside the reveal on the hinge side and a stile line down the middle of the
 * opening, which is what makes a door read as a door at a glance and a window
 * read as a window. `hand` is which side the hinges are on; anything that is
 * not `'L'` is a right-hand door, because a door has two hands and no third.
 */
export function doorArt(width, height, { hand = 'L' } = {}) {
  const w = Math.max(1, Number(width) || 0);
  const h = Math.max(1, Number(height) || 0);
  const f = clamp(Math.min(w, h) * FRAME, FRAME_MIN, FRAME_MAX);
  const left = hand === 'L';
  // the reveal, then the leaf inside it
  const out = [
    rect(0, 0, w, h, 'frame'),
    rect(f, 0, Math.max(1, w - f * 2), Math.max(1, h - f), 'leaf'),
  ];
  // THE LEAF LINE — the swing edge, drawn from the hinge stile to the head.
  out.push(left
    ? line(f, 0, f, h - f, 'leaf')
    : line(w - f, 0, w - f, h - f, 'leaf'));
  // …and the knob, on the side the hinges are NOT.
  const knobX = left ? w - f * 2.2 : f * 2.2;
  out.push(rect(knobX - f * 0.35, h * 0.45, f * 0.7, f * 0.7, 'knob'));
  return out;
}

/**
 * A WINDOW, in elevation: a sill under it, a frame, and the panes inside.
 *
 * The pane count is not asked for — it is READ off the opening, because a
 * 600 mm window with three panes and a 2400 mm one with two are both wrong and
 * neither needs a field. One pane per ~700 mm across, one per ~900 mm up, and
 * never more than four either way: past that it is a grid, not a window.
 */
export function windowArt(width, height) {
  const w = Math.max(1, Number(width) || 0);
  const h = Math.max(1, Number(height) || 0);
  const f = clamp(Math.min(w, h) * FRAME, FRAME_MIN, FRAME_MAX);
  const cols = clamp(Math.round(w / 700), 1, 4);
  const rows = clamp(Math.round(h / 900), 1, 4);

  const out = [rect(0, 0, w, h, 'frame')];
  // THE SILL — it oversails the reveal at both ends, which is the one line that
  // says "window" before anything else on the drawing is read.
  const over = f * 0.9;
  out.push(rect(-over, -f * 0.55, w + over * 2, f * 0.55, 'sill'));
  // the glass, inside the frame
  const gx = f;
  const gy = f;
  const gw = Math.max(1, w - f * 2);
  const gh = Math.max(1, h - f * 2);
  out.push(rect(gx, gy, gw, gh, 'glass'));
  // …and the bars between the panes.
  for (let c = 1; c < cols; c += 1) {
    const x = gx + (gw * c) / cols;
    out.push(line(x, gy, x, gy + gh, 'frame'));
  }
  for (let r = 1; r < rows; r += 1) {
    const y = gy + (gh * r) / rows;
    out.push(line(gx, y, gx + gw, y, 'frame'));
  }
  return out;
}

/** Whichever of the two this opening is. A kind this module does not know
 *  draws nothing, so a caller can hand it the whole list without sorting. */
export function openingArt(opening) {
  const kind = opening?.kind;
  if (kind === 'door') return doorArt(opening.w ?? opening.width, opening.h ?? opening.height, opening);
  if (kind === 'window') return windowArt(opening.w ?? opening.width, opening.h ?? opening.height);
  return [];
}

/** How many panes `windowArt` would draw — the same arithmetic, for a test
 *  and for anyone who wants the number without the geometry. */
export function panesOf(width, height) {
  return {
    cols: clamp(Math.round(Math.max(1, Number(width) || 0) / 700), 1, 4),
    rows: clamp(Math.round(Math.max(1, Number(height) || 0) / 900), 1, 4),
  };
}
