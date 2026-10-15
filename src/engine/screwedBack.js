// ─── CHAT-FIX 15.10.2026 · THE SCREWED BACK UNDER CABINEO AND BISCUITS ──────
//
// The owner, 15.10.2026: *"jak mamy cabineo to nie robimy dog bonsow, i to
// samo jak mamy biscuits czy standardowe tradycyjne dowels."*  A dog bone is
// the puzzle's relief circle at the root of a tenon, and the only puzzle a
// Cabineo or a biscuit unit still carried was the BACK JOINT: the sides'
// three back tenons, the TOP's and BOTTOM's two, each with its dog bone, and
// the BACK's sockets with their dia 7.5 holes. SKYLON_JOINTS_CABINEO.lsp and
// SKYLON_JOINTS_BISCUIT.lsp (amended the same day, LISP first) say that joint
// goes WHOLE and the BACK is held by what already held it: drawBACK's own
// dia 3 screw rows through the back, one on each side's centre line and one
// on the TOP's and the BOTTOM's. The dowel system (SKYLON_JOINTS_DOWEL.lsp)
// has its own BACK rows and never drew a dog bone, so it is not touched here.
//
// This runs on the planned unit AFTER the system's own strip and BEFORE the
// drilling pass, in each board's own frame:
//   BUL / BUR    the back tenons leave the outline (a plain D - G x H), the
//                back dog bones leave the pockets;
//   TOP / BOTTOM the back tenons leave the outline (with the ends the system
//                already made plain: the four corners), every puzzle dog
//                bone goes;
//   BACK         the sockets (PUZZLE_SOCKET) and their dia 7.5 holes go; the
//                dia 3 screws and a wall unit's hanger cut-outs stay.
// Board sizes do not move, so the BOM is what it was. Pure: boards in,
// boards out; no store, no React.

const EPS = 1e-6;

/** The sentence `result.derived.joints.back` carries on such a unit. */
export const SCREWED_BACK = 'the BACK is screwed on with the kit\'s own dia 3 rows: no tenons, no sockets, no dog bones under this joint system (the owner, 15.10.2026)';

/**
 * An outline without the tenons on one vertical edge x = edgeX: the points
 * beyond that edge (in the direction `out`, +1 or -1) go, and what is left on
 * the edge collapses to its two corners (y = 0 and y = h). The puzzle's tab
 * points are the only points ever beyond an edge, so nothing else can leave.
 */
function plainEdge(outline, edgeX, out, h) {
  const beyond = ([x]) => (x - edgeX) * out > EPS;
  const onEdge = ([x]) => Math.abs(x - edgeX) <= EPS;
  const corner = ([, y]) => Math.abs(y) <= EPS || Math.abs(y - h) <= EPS;
  const kept = outline.filter((p) => !beyond(p) && (!onEdge(p) || corner(p)));
  const pts = [];
  for (const p of kept) {
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > EPS) pts.push(p);
  }
  if (pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) <= EPS) pts.pop();
  return pts;
}

/**
 * The back joint off the five boards, in place on `panels`. `profile.puzzle`
 * names the layers. Boards the unit does not have (a hood's BOTTOM) are
 * skipped; a board with no CNC record is left alone.
 */
export function screwedBackStrip({ panels, profile }) {
  const pz = profile?.puzzle || {};
  // A back tenon's dog bone is cut OUTSIDE the board, beyond the back edge.
  const boneBeyond = (edgeX, out) => (k) => k.layer === pz.layers?.dogbone
    && ((out > 0 && k.x2 > edgeX + EPS) || (out < 0 && k.x1 < edgeX - EPS));
  for (const p of panels) {
    if (!p?.cnc) continue;
    const w = Number(p.cnc.drawn_w ?? p.w);
    const h = Number(p.cnc.drawn_h ?? p.h);
    if (p.id === 'BUL') {
      // drawBUL: the back edge is x = w, its tabs run to x = w + G.
      p.cnc = { ...p.cnc, outline: plainEdge(p.cnc.outline || [], w, +1, h), pockets: (p.cnc.pockets || []).filter((k) => !boneBeyond(w, +1)(k)) };
    } else if (p.id === 'BUR' || p.id === 'TOP' || p.id === 'BOTTOM') {
      // drawBUR and drawTOP_ROT90: the back edge is x = 0, its tabs run to -G.
      p.cnc = { ...p.cnc, outline: plainEdge(p.cnc.outline || [], 0, -1, h), pockets: (p.cnc.pockets || []).filter((k) => !boneBeyond(0, -1)(k)) };
    } else if (p.id === 'BACK') {
      p.cnc = {
        ...p.cnc,
        pockets: (p.cnc.pockets || []).filter((k) => k.layer !== pz.layers?.socket),
        holes: (p.cnc.holes || []).filter((d) => !(d.kind === 'puzzle' && d.layer === pz.layers?.socketHole)),
      };
    }
  }
}
