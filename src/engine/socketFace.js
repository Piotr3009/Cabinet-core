// ─── The joint as the machine leaves it (turn 11, CLAUDE.md F6) ────────────
//
// Piotr's verdict on turn 8's joint drawing: stop drawing CNC LAYERS on the
// furniture, show the JOINT. He is right — a coloured rectangle lying on the
// face of a side panel is a diagram of a socket, and what a joiner wants to see
// is the socket: a notch cut through the edge of the board, with the two inner
// corners left round because a round cutter cannot reach into a square one.
//
// This module turns a panel's OWN CNC data into the outline of the board as it
// comes off the machine. It invents nothing: the pockets are the pockets the
// engine already emits (engine/puzzle.js `horizontalSocket` / `verticalSocket`),
// the panel rectangle is the one the DXF is drawn in, and the only number that
// is not already in the cutting data is the cutter's radius, which is in
// profile.cnc.
//
// Pure functions — no three.js, no React. The 3D layer extrudes what comes back
// (3d/panelSolid.js); a node test can look at the polygon.
//
// COORDINATES are the CNC frame: origin at the bottom-left of the panel's
// nominal rectangle, x right, y up — exactly the frame engine/puzzle.js draws
// in and engine/joinery.js `panelPlacement` maps back into the cabinet.

const EPS = 1e-6;

/**
 * The panel's nominal rectangle in its own CNC frame.
 *
 * `drawn_w`/`drawn_h` when the panel carries them, because a TOP is drawn
 * ROTATED — its CNC x spans the cabinet's depth — and `panel.w`/`panel.h` are
 * the CUT dimensions, which are the other way round for exactly those parts.
 */
export function cncRect(panel) {
  const cnc = panel?.cnc || {};
  const w = Number(cnc.drawn_w) > 0 ? Number(cnc.drawn_w) : Number(panel?.w) || 0;
  const h = Number(cnc.drawn_h) > 0 ? Number(cnc.drawn_h) : Number(panel?.h) || 0;
  return { w, h };
}

/**
 * The socket pockets of one panel, expressed as NOTCHES in that rectangle.
 *
 * A socket pocket runs from `socketOvershoot` past the panel edge to
 * `G/2` inside it (turn 24, F4) — the cutter runs off the end so it leaves
 * no step. What is left in the board is therefore a notch in that edge, and this
 * works out which edge and how deep by clipping the pocket to the rectangle.
 *
 * @param {object} panel   an engine panel record
 * @param {object} layers  joineryLayers(profile) — which layer name is a socket
 * @returns {Array<{edge:'bottom'|'top'|'left'|'right', from:number, to:number, depth:number}>}
 */
export function socketNotches(panel, layers) {
  const socket = layers?.socket;
  const pockets = panel?.cnc?.pockets || [];
  if (!socket || !pockets.length) return [];
  const { w, h } = cncRect(panel);
  if (w <= 0 || h <= 0) return [];

  const out = [];
  for (const p of pockets) {
    if (p.layer !== socket) continue;
    const x1 = Math.min(p.x1, p.x2);
    const x2 = Math.max(p.x1, p.x2);
    const y1 = Math.min(p.y1, p.y2);
    const y2 = Math.max(p.y1, p.y2);
    // Which edge does it open onto? The pocket overshoots exactly one of them.
    if (y2 >= h - EPS && y1 > EPS) out.push({ edge: 'top', from: x1, to: x2, depth: h - y1 });
    else if (y1 <= EPS && y2 < h - EPS) out.push({ edge: 'bottom', from: x1, to: x2, depth: y2 });
    else if (x2 >= w - EPS && x1 > EPS) out.push({ edge: 'right', from: y1, to: y2, depth: w - x1 });
    else if (x1 <= EPS && x2 < w - EPS) out.push({ edge: 'left', from: y1, to: y2, depth: x2 });
    // Anything else is a pocket that does not touch an edge at all — a hanger
    // cut-out, say. It is not a socket and is deliberately not a notch.
  }
  return out.filter((n) => n.depth > EPS && n.to - n.from > EPS);
}

/**
 * The board's outline with those notches cut into it, corners and all.
 *
 * Walked anticlockwise from the origin — bottom edge, right edge, top edge,
 * left edge — inserting each notch where it falls. The result is one closed,
 * simple polygon, which is what an extruder wants.
 *
 * `radius` is the CUTTER's radius. At an internal corner a round cutter leaves
 * material behind: the deepest its centre can go is `radius` from both walls,
 * so the corner comes out filleted at exactly that radius. That fillet is the
 * whole visual difference between "a rectangle was subtracted here" and "this
 * was machined", and it is why F6 asks for it by name.
 *
 * @param {object} args
 *   w, h     the nominal rectangle
 *   notches  socketNotches()
 *   radius   cutter radius, in mm; 0 leaves square corners
 *   arcSteps how many segments a quarter fillet is drawn with
 * @returns {number[][]} closed polygon, [x, y] pairs, first point not repeated
 */
export function notchedOutline({
  w, h, notches = [], radius = 0, arcSteps = 4,
}) {
  const rect = [
    // edge, the axis it runs along, its length, and whether the walk goes up it
    { edge: 'bottom', length: w, forward: true },
    { edge: 'right', length: h, forward: true },
    { edge: 'top', length: w, forward: false },
    { edge: 'left', length: h, forward: false },
  ];
  const points = [];

  for (const side of rect) {
    // T maps (along the edge, into the board) to the panel's own x/y. It is an
    // affine map with axis flips only, so a circle in (a, d) is still a circle
    // in (x, y) — which is what lets the fillets below be generated in the
    // simple frame and mapped whole.
    const T = mapper(side.edge, w, h);
    const mine = notches
      .filter((n) => n.edge === side.edge)
      .map((n) => ({
        from: Math.max(0, Math.min(n.from, n.to)),
        to: Math.min(side.length, Math.max(n.from, n.to)),
        depth: Math.min(n.depth, side.edge === 'top' || side.edge === 'bottom' ? h : w),
      }))
      .filter((n) => n.to - n.from > EPS)
      .sort((a, b) => a.from - b.from);

    // The corner this edge starts from, in increasing-`a` terms. The walk may
    // run the other way, in which case the whole run is reversed at the end.
    const run = [T(0, 0)];
    for (const n of mine) run.push(...notchPoints(n, radius, arcSteps, T));
    run.push(T(side.length, 0));
    const walked = side.forward ? run : run.reverse();
    // The corners are shared with the neighbouring edge; the last point of each
    // run is the first of the next, so it is dropped rather than duplicated.
    for (const p of walked.slice(0, -1)) points.push(p);
  }
  return points;
}

/** (along, into) → (x, y), per edge. */
function mapper(edge, w, h) {
  if (edge === 'bottom') return (a, d) => [a, d];
  if (edge === 'top') return (a, d) => [a, h - d];
  if (edge === 'left') return (a, d) => [d, a];
  return (a, d) => [w - d, a];                       // right
}

/** One notch, from its near corner to its far one, in increasing-`a` order. */
function notchPoints(n, radius, arcSteps, T) {
  const span = n.to - n.from;
  // A fillet only exists if there is room for one: half the notch's width and
  // its full depth both have to hold the cutter. Below that the corner comes
  // out square, which is also what the machine leaves when the pocket is
  // narrower than the tool and the cutter simply plunges.
  const r = Math.min(radius, span / 2, n.depth);
  if (!(r > EPS)) {
    return [T(n.from, 0), T(n.from, n.depth), T(n.to, n.depth), T(n.to, 0)];
  }
  // Into the notch: the fillet bulges towards the corner the cutter could not
  // reach, so its centre sits `r` inside both walls. Each arc STARTS where the
  // previous point already is, so its first point is dropped — a repeated
  // vertex is a zero-length edge, and a triangulator is entitled to hate one.
  const out = [T(n.from, 0), T(n.from, n.depth - r)];
  out.push(...arc(n.from + r, n.depth - r, r, Math.PI, Math.PI / 2, arcSteps, T).slice(1));
  out.push(...arc(n.to - r, n.depth - r, r, Math.PI / 2, 0, arcSteps, T));
  out.push(T(n.to, 0));
  return out;
}

/** A quarter fillet, in (a, d) space, mapped through T. Endpoints included. */
function arc(ca, cd, r, a0, a1, steps, T) {
  const n = Math.max(2, Math.trunc(steps));
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const t = a0 + ((a1 - a0) * i) / n;
    out.push(T(ca + r * Math.cos(t), cd + r * Math.sin(t)));
  }
  return out;
}

/**
 * Does this panel have a joint worth cutting into its solid at all?
 *
 * Asked before any geometry is built, so the 3D view keeps drawing a plain box
 * for the hundreds of panels that are plain boxes — a shelf, a drawer side, a
 * door — and pays for a machined outline only where there is one.
 */
export function hasSocketRecesses(panel, layers) {
  return socketNotches(panel, layers).length > 0;
}

// ─── The OTHER half of the joint (turn 12, CLAUDE.md F6.2) ──────────────────
//
// "Sockets look right; the mating TABS with their round reliefs on the carcass
// panel EDGES are not visible."
//
// They were not, and the reason is that the two halves of the joint are carried
// in two different places in a panel's CNC data. A SOCKET is a POCKET — a
// routed recess, `cnc.pockets` on the PUZZLE_SOCKET layer — and turn 11 turned
// those into notches in the nominal rectangle and cut them out of the solid. A
// TAB is part of the panel's OUTLINE: `cnc.outline` leaves the nominal
// rectangle, goes round the tab and its two dog-bone reliefs, and comes back.
// Nothing read that, so every board was extruded from its rectangle and the
// tabs went with the rectangle.
//
// This is the reader. It invents no geometry whatsoever: a tab is the run of
// outline points that lies OUTSIDE the nominal rectangle, closed back along the
// edge it left from — so what comes out is the LISP's own tab profile,
// shoulders, reliefs and all, to the half millimetre.

/**
 * Every part of this panel's outline that stands proud of its rectangle.
 *
 * @param {object} panel   an engine panel record
 * @returns {Array<Array<[number,number]>>} closed polygons, in the CNC frame
 */
export function tabOutlines(panel) {
  const pts = panel?.cnc?.outline;
  if (!Array.isArray(pts) || pts.length < 4) return [];
  const { w, h } = cncRect(panel);
  if (!(w > 0) || !(h > 0)) return [];

  const outside = ([x, y]) => x > w + EPS || y > h + EPS || x < -EPS || y < -EPS;
  const n = pts.length;
  if (!pts.some(outside)) return [];

  // Start the walk from a point that is INSIDE, so a run can never be split
  // across the end of the array.
  const first = pts.findIndex((p) => !outside(p));
  if (first === -1) return [];

  const tabs = [];
  let run = null;
  for (let k = 0; k <= n; k += 1) {
    const i = (first + k) % n;
    const p = pts[i];
    if (outside(p)) {
      // The point BEFORE the run is where the tab leaves the board — it is part
      // of the polygon, and it is the one the closing edge comes back to.
      if (!run) run = [pts[(i - 1 + n) % n]];
      run.push(p);
    } else if (run) {
      run.push(p);
      tabs.push(run);
      run = null;
    }
  }
  return tabs;
}

/** Does this panel carry any tabs at all? The cheap question, asked often. */
export function hasTabs(panel) {
  return tabOutlines(panel).length > 0;
}
