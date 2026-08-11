// ─── THE DUPLICATE-EDGE GUARD (turn 25, CLAUDE.md F1) ───────────────────────
//
// ─── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
//
// The owner found it in his own AutoLISP: an edge drawn TWICE in a polyline.
// VCarve does not read a doubled edge as one line seen twice — it offsets the
// two coincident paths in OPPOSITE directions, so the cutter takes the panel
// from the outside AND from the inside on the same run, and the board goes in
// the skip. He corrected `panel_joints.lsp` at his end. This file is the
// permanent guard on OUR exporter so no future turn can ship the same fault
// from the JavaScript side.
//
// It is a CHECK and nothing else: it emits no entity, moves no coordinate and
// is not consulted by the writer. Wired into the standard test run
// (test/turn25-f1-edge-guard.test.js) so every future turn inherits it.
//
// ─── WHAT IS CHECKED ────────────────────────────────────────────────────────
//
//   ONE CLOSED POLYLINE   the outline is a single loop; it never doubles back
//                         on itself and it has no dangling end.
//   NO SEGMENT TWICE      no two segments of the loop trace the same two
//                         points, in either direction, on the same layer.
//   NO OVERLAPPING RUNS   the weaker cousin of the above and the one a
//                         hand-written kit actually produces: two COLLINEAR
//                         segments that share more than a point. Half an edge
//                         drawn twice cuts the board exactly as badly as a
//                         whole one.
//   WINDING               the outer outline runs ANTICLOCKWISE (positive
//                         signed area), matching the owner's corrected LISP;
//                         a loop that lies wholly INSIDE it — a cut-out, a
//                         shaker panel pocket — runs the other way. That
//                         opposition is the signal VCarve reads to know which
//                         side of the line the material is on.
//
// Coordinates compare at `EDGE_TOLERANCE` (0.01 mm): a tenth of the finest
// thing the machine can hold, and far below anything the engine rounds to.
//
// Pure functions — no React, no store, no three.js (engine rule).

/** How close two coordinates must be to count as the same point, in mm. */
export const EDGE_TOLERANCE = 0.01;

/** The winding a well-formed outer outline has: anticlockwise. */
export const OUTER_WINDING = 'ccw';

/** …and the winding an interior cut-out has: the other one. */
export const CUTOUT_WINDING = 'cw';

/**
 * Twice the signed area of a closed polygon — positive anticlockwise.
 *
 * The shoelace sum, left un-halved nowhere: callers want the SIGN and the
 * magnitude only as "is this bigger than a rounding error", and halving it
 * would only invite somebody to compare it against an area in mm².
 */
export function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** 'ccw' | 'cw' | null (degenerate: no enclosed area at all). */
export function windingOf(pts, tolerance = EDGE_TOLERANCE) {
  if (!Array.isArray(pts) || pts.length < 3) return null;
  const a = signedArea(pts);
  // A loop whose area is smaller than a tolerance-square is not a loop with a
  // direction; it is a scribble, and it is reported as `null` rather than
  // guessed at.
  if (Math.abs(a) <= tolerance * tolerance) return null;
  return a > 0 ? 'ccw' : 'cw';
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const samePoint = (p, q, tol) => near(p[0], q[0], tol) && near(p[1], q[1], tol);

/** A point key at the guard's tolerance — for the "same segment twice" test. */
function pointKey(p, tol) {
  return `${Math.round(p[0] / tol)},${Math.round(p[1] / tol)}`;
}

/** An UNDIRECTED key for a segment: A→B and B→A give the same string. */
function segmentKey(a, b, tol) {
  const ka = pointKey(a, tol);
  const kb = pointKey(b, tol);
  return ka <= kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/** How much of `t` lies between two numbers, both ends inclusive. */
function overlapLength(a1, a2, b1, b2) {
  const lo = Math.max(Math.min(a1, a2), Math.min(b1, b2));
  const hi = Math.min(Math.max(a1, a2), Math.max(b1, b2));
  return hi - lo;
}

/**
 * Do two segments lie on the same line AND share more than a single point?
 *
 * Both halves matter. Two segments that merely CROSS share exactly one point
 * and are perfectly ordinary — every tab profile in this engine has corners.
 * What is not ordinary is a shared RUN, and a run needs collinearity first.
 */
function collinearOverlap(a1, a2, b1, b2, tol) {
  const ux = a2[0] - a1[0];
  const uy = a2[1] - a1[1];
  const len = Math.hypot(ux, uy);
  if (!(len > tol)) return 0;
  const nx = -uy / len;
  const ny = ux / len;
  // Perpendicular distance of the other segment's ends from this one's line.
  const d1 = (b1[0] - a1[0]) * nx + (b1[1] - a1[1]) * ny;
  const d2 = (b2[0] - a1[0]) * nx + (b2[1] - a1[1]) * ny;
  if (Math.abs(d1) > tol || Math.abs(d2) > tol) return 0;
  // Collinear. Project everything onto this segment's own direction and ask
  // how much of the two intervals coincide.
  const ux1 = ux / len;
  const uy1 = uy / len;
  const at = (p) => (p[0] - a1[0]) * ux1 + (p[1] - a1[1]) * uy1;
  return overlapLength(0, len, at(b1), at(b2));
}

/**
 * Every fault in one closed loop.
 *
 * @param {Array<[number,number]>} pts  the loop, first point NOT repeated
 * @param {object} opts
 *   tolerance  mm; defaults to `EDGE_TOLERANCE`
 *   winding    'ccw' | 'cw' | null — the direction this loop must run in, or
 *              null to accept either (used where a caller only wants shape)
 *   label      what to call this loop in a message
 * @returns {Array<{code:string, message:string}>} empty when the loop is clean
 */
export function loopFindings(pts, {
  tolerance = EDGE_TOLERANCE, winding = OUTER_WINDING, label = 'outline',
} = {}) {
  const out = [];
  const say = (code, message) => out.push({ code, message: `${label}: ${message}` });

  if (!Array.isArray(pts)) {
    say('not-a-loop', 'no outline at all');
    return out;
  }
  if (pts.length < 3) {
    say('too-few-points', `${pts.length} point(s) — a closed profile needs at least 3`);
    return out;
  }

  // ── the closing point must not be written out a second time ──
  // A loop is emitted with the R12 closed flag, so a repeated first point is a
  // zero-length closing segment: the "dangling end" this guard is named for.
  if (samePoint(pts[0], pts[pts.length - 1], tolerance)) {
    say('repeated-closing-point', `first and last point are the same (${fmtPt(pts[0])}) — the loop is closed by the flag, not by a repeat`);
  }

  // ── segments ──
  const segs = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (samePoint(a, b, tolerance)) {
      say('zero-length-segment', `segment ${i} is zero length at ${fmtPt(a)}`);
      continue;
    }
    segs.push({ i, a, b });
  }

  // ── the same trace twice, in either direction ──
  const seen = new Map();
  for (const s of segs) {
    const key = segmentKey(s.a, s.b, tolerance);
    const first = seen.get(key);
    if (first === undefined) { seen.set(key, s.i); continue; }
    say(
      'duplicate-segment',
      `segments ${first} and ${s.i} trace the same edge ${fmtPt(s.a)}→${fmtPt(s.b)} — VCarve offsets a doubled edge BOTH ways`,
    );
  }

  // ── …and the partial version of the same fault ──
  // Neighbours share a corner by construction, so a pair that is adjacent in
  // the loop is only a fault if it doubles back — which the overlap test finds
  // anyway, since a doubling-back pair overlaps along its whole shorter half.
  for (let i = 0; i < segs.length; i += 1) {
    for (let j = i + 1; j < segs.length; j += 1) {
      const s = segs[i];
      const t = segs[j];
      const shared = collinearOverlap(s.a, s.b, t.a, t.b, tolerance);
      if (shared <= tolerance) continue;
      // Already reported as an exact duplicate — do not say it twice.
      if (segmentKey(s.a, s.b, tolerance) === segmentKey(t.a, t.b, tolerance)) continue;
      say(
        'overlapping-run',
        `segments ${s.i} and ${t.i} share ${shared.toFixed(3)} mm of the same line (${fmtPt(s.a)}→${fmtPt(s.b)} vs ${fmtPt(t.a)}→${fmtPt(t.b)})`,
      );
    }
  }

  // ── winding ──
  if (winding) {
    const actual = windingOf(pts, tolerance);
    if (actual === null) {
      say('no-winding', 'the loop encloses no area, so it has no direction');
    } else if (actual !== winding) {
      say(
        'wrong-winding',
        `runs ${actual === 'ccw' ? 'anticlockwise' : 'clockwise'} where the convention is ${winding === 'ccw' ? 'anticlockwise' : 'clockwise'}`,
      );
    }
  }

  return out;
}

const fmtPt = (p) => `(${round2(p[0])}, ${round2(p[1])})`;
const round2 = (v) => {
  const s = Number(v).toFixed(2);
  return s === '-0.00' ? '0' : s.replace(/\.?0+$/, '') || '0';
};

/** The four corners of a pocket record, anticlockwise. */
function pocketLoop(p) {
  const x1 = Math.min(p.x1, p.x2);
  const x2 = Math.max(p.x1, p.x2);
  const y1 = Math.min(p.y1, p.y2);
  const y2 = Math.max(p.y1, p.y2);
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

/** The loop a pocket record actually writes — its own points where it has them. */
export function pocketPointsOf(pocket) {
  if (Array.isArray(pocket?.pts) && pocket.pts.length >= 3) return pocket.pts;
  return pocketLoop(pocket);
}

/** Axis-aligned bounds of a point list. */
function bounds(pts) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Is this loop wholly INSIDE the outline — i.e. a cut-out rather than a
 * pocket that breaks the edge?
 *
 * Bounds are enough and are deliberately what is used. Every pocket this
 * engine cuts is a rectangle, and the ones that are NOT cut-outs are the ones
 * that run PAST the board's edge on purpose (a socket overshoots by 6 mm, a
 * dog bone stands a whole board thickness outside the profile) so the cutter
 * enters and leaves off the work. Those reach outside the outline's bounds by
 * construction, which is exactly the distinction being drawn.
 */
export function isInterior(loopPts, outlinePts, tolerance = EDGE_TOLERANCE) {
  const o = bounds(outlinePts);
  const b = bounds(loopPts);
  return b.minX > o.minX + tolerance && b.maxX < o.maxX - tolerance
    && b.minY > o.minY + tolerance && b.maxY < o.maxY - tolerance;
}

/**
 * Every fault on ONE cut part: its outline, and every closed loop the exporter
 * writes beside it.
 *
 * Loops are grouped BY LAYER before the duplicate test, because "the same
 * segment twice" is a question about one tool's program: an outline and a
 * dog-bone relief may share a line and be perfectly correct, since they are
 * two different cutters on two different layers. Two entities on the SAME
 * layer sharing a run is the fault.
 *
 * @param {object} panel  one entry of `result.panels`
 * @param {object} [opts] { tolerance }
 * @returns {Array<{panel:string, part:string, layer:string, code:string, message:string}>}
 */
export function panelFindings(panel, { tolerance = EDGE_TOLERANCE } = {}) {
  const out = [];
  const outline = panel?.cnc?.outline;
  if (!Array.isArray(outline) || outline.length < 2) return out;

  const outlineLayer = panel.cnc?.layer || 'OUTLINE';
  const stamp = (layer, findings) => {
    for (const f of findings) {
      out.push({
        panel: panel.id, part: panel.part, layer, code: f.code, message: f.message,
      });
    }
  };

  stamp(outlineLayer, loopFindings(outline, {
    tolerance, winding: OUTER_WINDING, label: `${panel.id} outline`,
  }));

  // ── the pockets, each as its own loop ──
  const byLayer = new Map([[outlineLayer, [{ pts: outline, label: `${panel.id} outline` }]]]);
  for (const [i, pocket] of (panel.cnc?.pockets || []).entries()) {
    const pts = pocketPointsOf(pocket);
    const layer = pocket.layer || outlineLayer;
    const label = `${panel.id} ${layer}[${i}]`;
    // A pocket that breaks the board's edge is a piece of the PROFILE and its
    // direction is the outline's business, not its own; a pocket wholly inside
    // the board is a cut-out and must run against the outline.
    const interior = isInterior(pts, outline, tolerance);
    stamp(layer, loopFindings(pts, {
      tolerance, winding: interior ? CUTOUT_WINDING : null, label,
    }));
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer).push({ pts, label });
  }

  // ── and the cross-entity test: two loops on ONE layer sharing a run ──
  for (const [layer, loops] of byLayer) {
    for (let i = 0; i < loops.length; i += 1) {
      for (let j = i + 1; j < loops.length; j += 1) {
        const shared = sharedRun(loops[i].pts, loops[j].pts, tolerance);
        if (!shared) continue;
        out.push({
          panel: panel.id,
          part: panel.part,
          layer,
          code: 'overlapping-run',
          message: `${loops[i].label} and ${loops[j].label} share ${shared.length.toFixed(3)} mm of the same line on ${layer} (${fmtPt(shared.at)})`,
        });
      }
    }
  }

  return out;
}

/** The longest run two loops share on one line, or null. */
function sharedRun(a, b, tolerance) {
  let best = null;
  for (let i = 0; i < a.length; i += 1) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    if (samePoint(a1, a2, tolerance)) continue;
    for (let j = 0; j < b.length; j += 1) {
      const b1 = b[j];
      const b2 = b[(j + 1) % b.length];
      if (samePoint(b1, b2, tolerance)) continue;
      const len = collinearOverlap(a1, a2, b1, b2, tolerance);
      if (len > tolerance && (!best || len > best.length)) best = { length: len, at: a1 };
    }
  }
  return best;
}

/**
 * Every fault across a whole unit — `computeCabinet()` output in, findings out.
 *
 * An empty array is the pass. Nothing here throws: the caller decides what a
 * finding is worth, which is what lets the same function serve a test (fail
 * the suite) and a report (list them).
 */
export function resultFindings(result, opts = {}) {
  const out = [];
  for (const panel of result?.panels || []) out.push(...panelFindings(panel, opts));
  return out;
}

/** A finding, as one line of a report. */
export function formatFinding(f) {
  return `${f.panel} [${f.layer}] ${f.code}: ${f.message}`;
}
