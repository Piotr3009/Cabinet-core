// ─── T75 F7 · THE CORNER NOTCH, THE ENGINE'S MIRROR OF KIT_NOTCH.lsp ────────
//
// The owner, 23.09.2026 (Petros, "Lista do następnej tury", list 4):
//
//   *"WYCIĘCIE NAROŻNIKA w karkasie (mega ważne, np. L-ka przy ścianie,
//   rurze). Klikasz 'wytnij narożnik', program podświetla narożniki,
//   wybierasz, podajesz wysokość, głębokość, szerokość (np. 200x200).
//   Program dorysowuje elementy wg logiki karkasu, cięcie realne przez
//   wszystkie panele tworzące róg (w tym dno, automatycznie), z dogbone'ami
//   i nawierceniami."*
//
// ...and 9.10.2026: *"lisp najpierw"*. `reference/lisp/KIT_NOTCH.lsp` was
// written and paren-balanced BEFORE this file existed, and this file mirrors
// it routine for routine. Section B to I below carry the LISP's own names in
// camelCase (`notch-top-joints` is `notchTopJoints`), the same arguments in
// the same order, and the same answers: `test/turn75-f7-the-corner-notch.test.js`
// holds them to the LISP's NUMBERS block (section I) board by board. The
// LISP's own decisions D1 to D8 are its own and are not repeated here.
//
// Section Z is the part the LISP leaves to the engine: it CUTS the boards the
// routines describe, through the puzzle's own functions (`sidePanelGeometry`,
// `socketPanelGeometry`, the tab point helpers), in two passes either side of
// `computeCabinet`'s drilling pass. A unit with no `params.notch` never reaches
// a line of it, so every golden is byte-identical by construction.
//
// T79 F5 (18.10.2026): section H2 mirrors KIT_NOTCH.lsp's own section H2, THE
// EDGE NOTCH (D22: a rebate along a whole horizontal edge, `params.edgeNotch`),
// and section Z2 cuts it, after the corner notch, on what that left. A unit with
// no `params.edgeNotch` never reaches a line of either.
//
// Pure: numbers in, numbers or records out. No store, no React, no three.js.

import {
  sidePanelGeometry, socketPanelGeometry, rectGeometry,
  tabPointsLeft, tabPointsUp, tabPointsDown,
} from './puzzle.js';
import { areaM2, metres, roundTo } from './format.js';
import { markPoints, shiftMark } from './marks.js';

const EPS = 1e-6;

// ═══════════════════════════════════════════════════════════════════════════
// A. THE NUMBERS THIS FILE READS (notch-profile, notch-p)
// ═══════════════════════════════════════════════════════════════════════════
//
// The LISP states them as an alist; the engine reads each from the profile
// under the same key, so a workshop that changes one changes one line there.

/** notch-profile: the numbers, keyed as the LISP keys them. */
export function notchProfile(profile = {}) {
  const pz = profile.puzzle || {};
  const def = profile.notch?.defaults || {};
  const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    'puzzle.tabCentresFromEnd': num(pz.tabCentresFromEnd, 95),
    'puzzle.singleSocketBelow': num(pz.singleSocketBelow),
    'puzzle.singleJointMaxDepth': num(pz.singleJointMaxDepth),
    'puzzle.singleTabAtOrBelow': num(pz.singleTabAtOrBelow),
    'puzzle.middleTabBelow': num(pz.middleTabBelow),
    'puzzle.dogboneHalfHeight': num(pz.dogboneHalfHeight, 30),
    'puzzle.socketHalfWidth': num(pz.socketHalfWidth, 25.5),
    'puzzle.screwFromEnd': num(pz.screwFromEnd, 50),
    'shelfHoles.columnFromEdge': num(profile.shelfHoles?.columnFromEdge, 70),
    'carcass.shelfWidthClearance': num(profile.carcass?.shelfWidthClearance, 4),
    'carcass.shelfDepthClearance': num(profile.carcass?.shelfDepthClearance, 20),
    'autoParts.plinth.setback': num(profile.autoParts?.plinth?.setback, 50),
    'cnc.toolDiameter': num(profile.cnc?.toolDiameter, 8),
    'notch.defaults.width': num(def.widthMm, 200),
    'notch.defaults.depth': num(def.depthMm, 200),
    'notch.defaults.height': num(def.heightMm, 0),
    // 15.10.2026: the scribe room round a chimney or a box the notch is cut FOR.
    'notch.obstacleClearance': num(profile.notch?.obstacleClearanceMm, 10),
    // 15.10.2026: the owner's "nie mniej niz 100 mm w srodku szafki".
    'notch.minInterior': num(profile.notch?.minInteriorMm, 100),
    // 17.10.2026 (KIT_NOTCH.lsp D9): the owner's "okolo 40 mm w kazda strone",
    // each leg of the CORNER_4MM mark at a re-entrant corner.
    'cnc.cornerMarkLeg': num(profile.cnc?.cornerMark?.legMm, 40),
    // 18.10.2026 (KIT_NOTCH.lsp D22): what the CUT EDGE window opens with, ed and eh.
    'notch.edgeDefaults.depth': num(profile.notch?.edgeDefaults?.depthMm, 20),
    'notch.edgeDefaults.height': num(profile.notch?.edgeDefaults?.heightMm, 120),
  };
}

/** notch-p: one number, or null when the table does not carry it. */
export function notchP(K, key) {
  return Object.prototype.hasOwnProperty.call(K || {}, key) ? K[key] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// B. THE CORNER
// ═══════════════════════════════════════════════════════════════════════════

export const NOTCH_CORNERS = Object.freeze(['BL', 'BR', 'FL', 'FR']);

export function notchCornerOk(corner) { return NOTCH_CORNERS.includes(corner); }
export function notchBackP(corner) { return corner === 'BL' || corner === 'BR'; }
export function notchLeftP(corner) { return corner === 'BL' || corner === 'FL'; }
/** The side the notch cuts: BUL at an L corner, BUR at an R corner. */
export function notchSideName(corner) { return notchLeftP(corner) ? 'BUL' : 'BUR'; }
/**
 * 0 (or anything at or over the carcass, either way) is FULL HEIGHT. Until
 * 18.10.2026 a negative nh read as full height too (and was refused);
 * KIT_NOTCH.lsp D21 gives it the top.
 */
export function notchFullP(ch, nh) { return nh === 0 || Math.abs(nh) >= ch; }
/**
 * T79 F4 (KIT_NOTCH.lsp D21): a part-height notch hanging from the TOP, a
 * negative nh. The owner, 18.10.2026: *"nie powinno być funkcji -500 na
 * przykład i wtedy ucina od góry? i mała informacja o tym."*
 */
export function notchFromTopP(ch, nh) { return nh < 0 && !notchFullP(ch, nh); }
/** The height the notch actually takes (D21: |nh| from the top). */
export function notchHh(ch, nh) { return notchFullP(ch, nh) ? ch : Math.abs(nh); }
/** D3: boxed when the notch is NOT LESS THAN the side's thickness. */
export function notchBoxedP(nw, g) { return nw >= g; }
/** The cutter's radius (engine/cnc/rollover.js toolRadius). */
export function notchCutterRadius(toolDia) { return toolDia / 2; }

// ═══════════════════════════════════════════════════════════════════════════
// C. THE JOINTS, RE-PLANNED (LISP section 4)
// ═══════════════════════════════════════════════════════════════════════════

/** SKY:tabCentres (SKYLON_COMMON.lsp), the house walk the LISP calls. */
export function skyTabCentres(len, e, one, three) {
  const n = len <= one ? 1 : (len < three ? 2 : 3);
  if (n === 1) return [len / 2];
  if (n === 2) return [e, len - e];
  return [e, len / 2, len - e];
}

/** notch-joint-inset: null = one centred joint on a shallow carcass, else e. */
export function notchJointInset(cd, e, maxDepth) {
  return (maxDepth > 0 && cd > 0 && cd <= maxDepth) ? null : e;
}

/** notch-replan-sockets: engine/puzzle.js socketCentres, to the letter. */
export function notchReplanSockets(len, e, below) {
  if (e == null) return [len / 2];
  if (below > 0 && len < below) return [len / 2];
  return skyTabCentres(len, e, 0, 1e30);
}

/** notch-replan-tabs: COMMON's SKY:tabCentres, unchanged. */
export function notchReplanTabs(len, e, one, three) { return skyTabCentres(len, e, one, three); }

/** notch-shift: a plan moved along its edge by dx. */
export function notchShift(lst, dx) { return (lst || []).map((c) => c + dx); }

/** notch-min-joint-edge (D6): the shortest edge that can still hold a joint. */
export function notchMinJointEdge(bone, g) { return 2 * (bone + g); }

/** notch-screw-axis: G / 2 (turn 24). */
export function notchScrewAxis(g) { return g / 2; }

/** notch-screw-row: [e, mid, len - e], or two at the quarters on a short run. */
export function notchScrewRow(len, e) {
  if (len <= 0) return [];
  if (len > 2 * e) return [e, len / 2, len - e];
  return [0.25 * len, 0.75 * len];
}

/** notch-row-between: drawBACK's top and bottom row over a back a .. b. */
export function notchRowBetween(a, b, g, e) { return [a + g + e, (a + b) / 2, b - g - e]; }

/** notch-rows-between-tabs: drawBACK's side row over lo .. hi carrying `tabs`. */
export function notchRowsBetweenTabs(lo, hi, tabs, e) {
  const out = [lo + e];
  let prev = null;
  for (const c of tabs || []) {
    if (prev != null) out.push((prev + c) / 2);
    prev = c;
  }
  out.push(hi - e);
  return out;
}

/**
 * notch-edge-row: THE BACK SCREW ROW over a run a .. b of a back's edge that
 * a board stands behind, shifted onto the run; [] on a run shorter than one
 * hole's offset e. Since 19.10.2026 only the recess's EXT-BACK calls it
 * (extension.js recessExtBackScrews): the first back states no row into a box.
 */
export function notchEdgeRow(a, b, e) {
  return b - a < e ? [] : notchShift(notchScrewRow(b - a, e), a);
}

/** notch-pin-columns: columnFromEdge from each end. */
export function notchPinColumns(len, setback) { return [setback, len - setback]; }

// ═══════════════════════════════════════════════════════════════════════════
// D. ONE OUTLINE LAW: A RECTANGLE LESS ONE CORNER
// ═══════════════════════════════════════════════════════════════════════════

export function notchFcX0(fc) { return fc.slice(0, 2) === 'x0'; }
export function notchFcY0(fc) { return fc.slice(2, 4) === 'y0'; }

export function notchPlainRect(bw, bh) { return [[0, 0], [bw, 0], [bw, bh], [0, bh]]; }

/** notch-rect-outline: anticlockwise, once round, in the board's ORIGINAL frame. */
export function notchRectOutline(bw, bh, nw, nh, fc) {
  if (nw >= bw && nh >= bh) return null;
  if (nw >= bw) {
    return notchFcY0(fc)
      ? [[0, nh], [bw, nh], [bw, bh], [0, bh]]
      : [[0, 0], [bw, 0], [bw, bh - nh], [0, bh - nh]];
  }
  if (nh >= bh) {
    return notchFcX0(fc)
      ? [[nw, 0], [bw, 0], [bw, bh], [nw, bh]]
      : [[0, 0], [bw - nw, 0], [bw - nw, bh], [0, bh]];
  }
  if (fc === 'x0y0') return [[nw, 0], [bw, 0], [bw, bh], [0, bh], [0, nh], [nw, nh]];
  if (fc === 'x1y0') return [[0, 0], [bw - nw, 0], [bw - nw, nh], [bw, nh], [bw, bh], [0, bh]];
  if (fc === 'x1y1') return [[0, 0], [bw, 0], [bw, bh - nh], [bw - nw, bh - nh], [bw - nw, bh], [0, bh]];
  return [[0, 0], [bw, 0], [bw, bh], [nw, bh], [nw, bh - nh], [0, bh - nh]];
}

/** notch-rect-reentrant: the re-entrant corner and the way INTO THE WASTE. */
export function notchRectReentrant(bw, bh, nw, nh, fc) {
  if (nw >= bw || nh >= bh) return null;
  if (fc === 'x0y0') return [[nw, nh], [-1, -1]];
  if (fc === 'x1y0') return [[bw - nw, nh], [1, -1]];
  if (fc === 'x1y1') return [[bw - nw, bh - nh], [1, 1]];
  return [[nw, bh - nh], [-1, 1]];
}

/**
 * notch-dogbone (LISP section 5): [cx, cy, r], or null where there is no corner.
 * 17.10.2026 (KIT_NOTCH.lsp D9): RETIRED FROM THE CUT. The owner: *"nie, nie
 * dodawaj wiercenia"*. Nothing drills it any more; the function and its
 * family stay as the record of where the circle stood, and the tests still
 * hold them to the LISP's numbers. What a re-entrant corner gets is
 * `cornerMarkRecords` below.
 */
export function notchDogbone(bw, bh, nw, nh, fc, r) {
  const re = notchRectReentrant(bw, bh, nw, nh, fc);
  if (!re || !(r > 0)) return null;
  const k = r / Math.sqrt(2);
  return [re[0][0] + re[1][0] * k, re[0][1] + re[1][1] * k, r];
}

// ─── THE CORNER MARK (KIT_NOTCH.lsp D9, KIT_RECESS.lsp D18, KIT_CORNER_L.lsp
// section 4; 17.10.2026) ──────────────────────────────────────────────────
//
// The owner: *"nie, nie dodawaj wiercenia, dodaj jeden layer w samym cornerze
// okolo 40 mm w kazda strone na linii L shape i nazwij to corner 4 mm, wtedy
// ja wytne ten korner."*
//
// Read off a board's NOMINAL outline (the puzzle tabs are not on it, so a tab
// root is never a corner here), in whatever frame the outline is drawn in. A
// vertex is RE-ENTRANT when the walk turns the other way there than the
// polygon turns as a whole (the cross product of the edge in and the edge out
// against the sign of the signed area). At each such vertex: two open lines
// on CORNER_4MM, from the vertex back along the edge in and on along the edge
// out, `leg` long or the edge's own length, whichever is shorter. A rectangle
// has none; a window is a pocket, not an outline, and has none.

/** notch-signed-area2: twice the signed area of a polygon (positive anticlockwise). */
export function signedArea2(pts) {
  let a = 0;
  const n = (pts || []).length;
  for (let i = 0; i < n; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a;
}

/** notch-leg-point: `leg` along the edge from v toward w, or w when the edge is shorter. */
export function legPoint(v, w, leg) {
  const dx = w[0] - v[0];
  const dy = w[1] - v[1];
  const len = Math.hypot(dx, dy);
  if (!(len > 1e-9)) return [v[0], v[1]];
  const k = Math.min(leg, len) / len;
  return [v[0] + dx * k, v[1] + dy * k];
}

/**
 * notch-corner-marks: [[a, v, b], ...], ONE open L per re-entrant vertex v, in
 * the outline's frame and the outline's own direction: a is `leg` back along
 * the edge the outline arrives by (p -> v), b `leg` on along the edge it
 * leaves by (v -> q). KIT_NOTCH.lsp D12 (17.10.2026, 16:10, the owner:
 * *"jeden L wektor ... obok linii"*): until then two legs [v, a], [v, b],
 * both leaving the corner, and an offset that profiled one leg's waste side
 * profiled the other leg's board side.
 */
export function cornerMarksOf(pts, leg) {
  const n = (pts || []).length;
  const orient = signedArea2(pts);
  const out = [];
  if (n < 4 || !(leg > 0) || orient === 0) return out;
  for (let i = 0; i < n; i += 1) {
    const p = pts[(i + n - 1) % n];
    const v = pts[i];
    const q = pts[(i + 1) % n];
    const cross = (v[0] - p[0]) * (q[1] - v[1]) - (v[1] - p[1]) * (q[0] - v[0]);
    if (cross * orient < 0) out.push([legPoint(v, p, leg), v, legPoint(v, q, leg)]);
  }
  return out;
}

/**
 * The marks as `cnc.marks` records: the biscuit mark's shape (layer, from,
 * to) with `pts`, the whole open walk (engine/marks.js markPoints), rounded.
 */
export function cornerMarkRecords(pts, leg, pz) {
  const layer = pz?.layers?.cornerMark || 'CORNER_4MM';
  const r = ([x, y]) => [roundTo(x, 4), roundTo(y, 4)];
  return cornerMarksOf(pts, leg).map((walk) => {
    const rounded = walk.map(r);
    return { layer, from: rounded[0], to: rounded[rounded.length - 1], pts: rounded };
  });
}

/** notch-rot90-pts: a plan outline into drawTOP_ROT90's frame (x' from the BACK edge). */
export function notchRot90Pts(pts, drawnW) {
  return (pts || []).map(([x, y]) => [drawnW - y, x]);
}

/** notch-reorigin: a shorter rectangle, re-origined to its own bottom-left. */
export function notchReorigin(pts) {
  const mx = Math.min(...pts.map((p) => p[0]));
  const my = Math.min(...pts.map((p) => p[1]));
  return pts.map(([x, y]) => [x - mx, y - my]);
}

// ═══════════════════════════════════════════════════════════════════════════
// E. THE KEEP-OUT: THE NOTCH AND ITS BOX, IN PLAN
// ═══════════════════════════════════════════════════════════════════════════
//
// Plan frame (LISP section 1): x from the carcass's LEFT outer face, y from its
// FRONT face, z up from the underside. Rectangles are [x0, y0, x1, y1].

export function notchKeepout(cw, cd, g, nw, nd, corner, clr) {
  const boxed = notchBoxedP(nw, g);
  const reach = boxed ? nw + g + clr : nw;
  const [x0, x1] = notchLeftP(corner) ? [0, reach] : [cw - reach, cw];
  const [y0, y1] = notchBackP(corner) ? [cd - nd - (boxed ? g : 0), cd] : [0, nd];
  return [x0, y0, x1, y1];
}

export function notchOverlapP(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

/** notch-plan-cut: [fc, nw, nh, bw, bh] in the BOARD's frame, or null. */
export function notchPlanCut(board, k) {
  const ix0 = Math.max(board[0], k[0]);
  const iy0 = Math.max(board[1], k[1]);
  const ix1 = Math.min(board[2], k[2]);
  const iy1 = Math.min(board[3], k[3]);
  if (!(ix1 > ix0 && iy1 > iy0)) return null;
  return [
    `${ix0 <= board[0] ? 'x0' : 'x1'}${iy0 <= board[1] ? 'y0' : 'y1'}`,
    ix1 - ix0, iy1 - iy0,
    board[2] - board[0], board[3] - board[1],
  ];
}

export function notchCutOutline(board, cut) {
  return cut
    ? notchRectOutline(cut[3], cut[4], cut[1], cut[2], cut[0])
    : notchPlainRect(board[2] - board[0], board[3] - board[1]);
}

export function notchCutDogbone(cut, r) {
  return cut ? notchDogbone(cut[3], cut[4], cut[1], cut[2], cut[0], r) : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// F. BOARD BY BOARD
// ═══════════════════════════════════════════════════════════════════════════

// ── TOP and BOTTOM: (cw - 2g) x (cd - g), plan frame of the board ──────────

export function notchTopRect(cw, cd, g) { return [g, 0, cw - g, cd - g]; }

export function notchTopCut(cw, cd, g, nw, nd, corner) {
  return notchPlanCut(notchTopRect(cw, cd, g), notchKeepout(cw, cd, g, nw, nd, corner, 0));
}

export function notchTopOutline(cw, cd, g, nw, nd, corner) {
  return notchCutOutline(notchTopRect(cw, cd, g), notchTopCut(cw, cd, g, nw, nd, corner));
}

export function notchTopDogbone(cw, cd, g, nw, nd, corner, r) {
  return notchCutDogbone(notchTopCut(cw, cd, g, nw, nd, corner), r);
}

/** notch-top-joints: { LEFT: [y..], RIGHT: [y..], BACK: [x..] }. */
export function notchTopJoints(cw, cd, g, nw, nd, corner, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const inset = notchJointInset(cd, e, notchP(K, 'puzzle.singleJointMaxDepth'));
  const sideW = cd - g;
  const tw = cw - 2 * g;
  const far = notchReplanSockets(sideW, inset, below);
  let near;
  let bk;
  if (!notchBoxedP(nw, g)) {
    near = far;
    bk = notchReplanSockets(tw, e, below);
  } else if (notchBackP(corner)) {
    near = notchReplanSockets(sideW - nd, inset, below);
    bk = notchLeftP(corner)
      ? notchShift(notchReplanSockets(tw - nw, e, below), nw)
      : notchReplanSockets(tw - nw, e, below);
  } else {
    near = notchShift(notchReplanSockets(sideW - nd, inset, below), nd);
    bk = notchReplanSockets(tw, e, below);
  }
  return notchLeftP(corner)
    ? { LEFT: near, RIGHT: far, BACK: bk }
    : { LEFT: far, RIGHT: near, BACK: bk };
}

// ── THE SIDE at the corner: (cd - g) x ch, in ITS OWN LISP FRAME ───────────

/** notch-side-fc: D21, `top` (a notch from the top) takes the corner at the TOP of the edge, y1 for y0. */
export function notchSideFc(corner, burFrame, top = false) {
  let fc;
  if (burFrame) fc = notchBackP(corner) ? 'x0y0' : 'x1y0';
  else fc = notchBackP(corner) ? 'x1y0' : 'x0y0';
  return top ? `${fc.slice(0, 2)}y1` : fc;
}

export function notchSide(cd, ch, g, nw, nd, nh, corner) {
  if (!notchBoxedP(nw, g)) return notchPlainRect(cd - g, ch);
  return notchRectOutline(cd - g, ch, nd, notchHh(ch, nh), notchSideFc(corner, !notchLeftP(corner), notchFromTopP(ch, nh)));
}

export function notchSideDogbone(cd, ch, g, nw, nd, nh, corner, r) {
  if (!notchBoxedP(nw, g)) return null;
  return notchDogbone(cd - g, ch, nd, notchHh(ch, nh), notchSideFc(corner, !notchLeftP(corner), notchFromTopP(ch, nh)), r);
}

/** notch-side-rebate (D3): [x0, y0, x1, y1, depth] in the side's frame, or null. D21: from the top, ch - |nh| .. ch. */
export function notchSideRebate(cd, ch, g, nw, nd, nh, corner) {
  if (notchBoxedP(nw, g)) return null;
  const bw = cd - g;
  const top = notchFromTopP(ch, nh);
  const fc = notchSideFc(corner, !notchLeftP(corner), top);
  const [y0, y1] = top ? [ch - notchHh(ch, nh), ch] : [0, notchHh(ch, nh)];
  return notchFcX0(fc)
    ? [0, y0, nd, y1, nw]
    : [bw - nd, y0, bw, y1, nw];
}

/**
 * notch-side-joints: every joint MEASURED FROM THE SIDE'S FRONT EDGE (BUR's own
 * frame is cd - g - x of these).
 */
export function notchSideJoints(cd, ch, g, nw, nd, nh, corner, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const inset = notchJointInset(cd, e, notchP(K, 'puzzle.singleJointMaxDepth'));
  const one = notchP(K, 'puzzle.singleTabAtOrBelow');
  const three = notchP(K, 'puzzle.middleTabBelow');
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const pin = notchP(K, 'shelfHoles.columnFromEdge');
  const sideW = cd - g;
  const full = notchFullP(ch, nh);
  const top = notchFromTopP(ch, nh);
  const hh = notchHh(ch, nh);
  const boxed = notchBoxedP(nw, g);
  const run = boxed ? sideW - nd : sideW;
  const off = boxed && !notchBackP(corner) ? nd : 0;
  const cutS = notchShift(notchReplanSockets(run, inset, below), off);
  const cutR = notchShift(notchScrewRow(run, sfe), off);
  const parS = notchReplanSockets(sideW, inset, below);
  const parR = notchScrewRow(sideW, sfe);
  // The bottom edge moves unless the notch hangs from the top (D21); the top
  // edge moves when a boxed notch runs the full height, or hangs from the top.
  const [botS, botR] = top ? [parS, parR] : [cutS, cutR];
  const [topS, topR] = (full || top) && boxed ? [cutS, cutR] : [parS, parR];
  let tabs;
  if (!boxed) tabs = notchReplanTabs(ch, e, one, three);
  else if (!notchBackP(corner)) tabs = notchReplanTabs(ch, e, one, three);
  else if (full) tabs = [];
  else if (top) tabs = notchReplanTabs(ch - hh, e, one, three);
  else tabs = notchShift(notchReplanTabs(ch - nh, e, one, three), nh);
  const pins = notchShift(notchPinColumns(run, pin), off);
  return {
    'TOP-SOCKETS': topS,
    'BOTTOM-SOCKETS': botS,
    'TOP-SCREWS': topR,
    'BOTTOM-SCREWS': botR,
    'BACK-TABS': tabs,
    'PIN-COLUMNS': pins,
  };
}

// ── THE BACK: cw x ch, x from the LEFT face, y up ─────────────────────────

/** notch-back-fc: D21, `top` (a notch from the top) takes the corner at the TOP. */
export function notchBackFc(corner, top = false) {
  if (notchLeftP(corner)) return top ? 'x0y1' : 'x0y0';
  return top ? 'x1y1' : 'x1y0';
}

export function notchBack(cw, ch, nw, nh, corner) {
  if (!notchBackP(corner)) return notchPlainRect(cw, ch);
  return notchRectOutline(cw, ch, nw, notchHh(ch, nh), notchBackFc(corner, notchFromTopP(ch, nh)));
}

export function notchBackDogbone(cw, ch, nw, nh, corner, r) {
  if (!notchBackP(corner)) return null;
  return notchDogbone(cw, ch, nw, notchHh(ch, nh), notchBackFc(corner, notchFromTopP(ch, nh)), r);
}

/**
 * notch-back-joints: its joints in its ORIGINAL frame. D21: a notch from the
 * top shortens the TOP edge and leaves the BOTTOM edge the parent's; the
 * notch-side edge is planned on the run UNDER it, 0 .. ch - |nh|. D10
 * (17.10.2026, and again 19.10.2026): no screw between the BACK and the box.
 */
export function notchBackJoints(cw, ch, g, nw, nh, corner, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const one = notchP(K, 'puzzle.singleTabAtOrBelow');
  const three = notchP(K, 'puzzle.middleTabBelow');
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const S = notchScrewAxis(g);
  const full = notchFullP(ch, nh);
  const top = notchFromTopP(ch, nh);
  const hh = notchHh(ch, nh);
  const left = notchLeftP(corner);
  const back = notchBackP(corner);
  const boxed = notchBoxedP(nw, g);
  const farTabs = notchReplanTabs(ch, e, one, three);
  // The top edge: all of it, or what a full-height back notch (or, D21, a
  // boxed one from the top) leaves. The bottom edge: a back notch reaches it
  // unless it hangs from the top.
  let [lo, hi] = [0, cw];
  if (back && (full || (top && boxed))) [lo, hi] = left ? [nw, cw] : [0, cw - nw];
  let [blo, bhi] = [0, cw];
  if (back && !top) [blo, bhi] = left ? [nw, cw] : [0, cw - nw];
  let topS;
  let botS;
  if (back && boxed) {
    botS = notchShift(notchReplanSockets(bhi - blo - 2 * g, e, below), blo + g);
    topS = notchShift(notchReplanSockets(hi - lo - 2 * g, e, below), lo + g);
  } else {
    botS = notchShift(notchReplanSockets(cw - 2 * g, e, below), g);
    topS = botS;
  }
  let nearTabs;
  if (!back) nearTabs = farTabs;
  else if (!boxed) nearTabs = farTabs;
  else if (full) nearTabs = [];
  else if (top) nearTabs = notchReplanTabs(ch - hh, e, one, three);
  else nearTabs = notchShift(notchReplanTabs(ch - nh, e, one, three), nh);
  const farX = left ? cw - S : S;
  const upX = left ? S : cw - S;
  const scr = [];
  for (const y of notchRowsBetweenTabs(0, ch, farTabs, sfe)) scr.push([farX, y]);
  // 17.10.2026 (KIT_NOTCH.lsp D10): NO screw between the BACK and the box. The
  // owner: *"nie bedziemy tam wkrecac wkretow"*. Drawn again on 18.10 (T79 F6)
  // and withdrawn on 19.10.2026 by the owner: *"nie na pierwszych plecach ...
  // to juz bylo usuniete i znowu trzeba usunac"*. A full-height notch's new
  // edge meets the RETURN only and gets no row; beside a part-height notch
  // the run gets none and the side's own back edge above (D21: under) it
  // keeps its rows.
  if (!back || !boxed) {
    for (const y of notchRowsBetweenTabs(0, ch, farTabs, sfe)) scr.push([upX, y]);
  } else if (top) {
    for (const y of notchRowsBetweenTabs(0, ch - hh, nearTabs, sfe)) scr.push([upX, y]);
  } else if (!full) {
    for (const y of notchRowsBetweenTabs(nh, ch, nearTabs, sfe)) scr.push([upX, y]);
  }
  for (const x of notchRowBetween(lo, hi, g, sfe)) scr.push([x, ch - S]);
  for (const x of (back && boxed ? notchRowBetween(blo, bhi, g, sfe) : notchRowBetween(0, cw, g, sfe))) {
    scr.push([x, S]);
  }
  return {
    'FAR-SOCKETS': farTabs,
    'NEAR-SOCKETS': nearTabs,
    'TOP-SOCKETS': topS,
    'BOTTOM-SOCKETS': botS,
    SCREWS: scr,
  };
}

// ── THE BOX: STEP, RETURN, LID ─────────────────────────────────────────────

/**
 * notch-box-places: { RETURN: [x0 y0 z0 x1 y1 z1], STEP, LID } (plan frame), null unboxed.
 * D21: from the top the RETURN and the STEP hang from the carcass top (z0
 * ch - |nh|, z1 ch) and a FLOOR closes them underneath where the LID would lie over them.
 */
export function notchBoxPlaces(cw, cd, ch, g, nw, nd, nh, corner) {
  if (!notchBoxedP(nw, g)) return null;
  const hh = notchHh(ch, nh);
  const top = notchFromTopP(ch, nh);
  const left = notchLeftP(corner);
  const back = notchBackP(corner);
  const out = {};
  const [z0, z1] = top ? [ch - hh, ch] : [0, hh];
  const [rx0, rx1] = left ? [nw, nw + g] : [cw - nw - g, cw - nw];
  // 15.10.2026 (the owner, the mockup "naroznik, krawedz"): at a back corner
  // the RETURN starts at the STEP's back face (cd - nd), a board shorter, and
  // the STEP runs a board past the notch over the RETURN's end, as the back
  // covers the sides' ends. The open cabinet shows one whole face.
  const [ry0, ry1] = back ? [cd - nd, cd - g] : [0, nd];
  out.RETURN = [rx0, ry0, z0, rx1, ry1, z1];
  if (back) {
    const [sx0, sx1] = left ? [0, nw + g] : [cw - nw - g, cw];
    out.STEP = [sx0, cd - nd - g, z0, sx1, cd - nd, z1];
  }
  if (!notchFullP(ch, nh)) {
    const [lx0, lx1] = left ? [g, nw + g] : [cw - nw - g, cw - g];
    if (top) out.FLOOR = [lx0, back ? cd - nd - g : 0, z0 - g, lx1, ry1, z0];
    else out.LID = [lx0, back ? cd - nd - g : 0, hh, lx1, ry1, hh + g];
  }
  return out;
}

/** notch-step: [nw + g, hh], back corners only (15.10.2026: a board wider, over the RETURN's end). */
export function notchStep(ch, g, nw, nh, corner) {
  return notchBoxedP(nw, g) && notchBackP(corner) ? [nw + g, notchHh(ch, nh)] : null;
}

/**
 * notch-step-screws: NONE since 17.10.2026 (D10). Until then, as the record below states, x from the STEP's own left end, y up: a column into the
 * side's end and one into the RETURN's end (S and nw + S), the row into the
 * BOTTOM's (and at full height the TOP's) notch edge between them (g .. nw).
 */
export function notchStepScrews(ch, g, nw, nh, corner, K) {
  // 17.10.2026 (KIT_NOTCH.lsp D10): none stated; biscuits by hand, "teraz nic".
  void ch; void g; void nw; void nh; void corner; void K;
  return null;
}

/** The record (D10): what notchStepScrews stated until 17.10.2026. */
export function notchStepScrewsStatedUntil1710(ch, g, nw, nh, corner, K) {
  if (!notchStep(ch, g, nw, nh, corner)) return null;
  const S = notchScrewAxis(g);
  const hh = notchHh(ch, nh);
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const full = notchFullP(ch, nh);
  const out = [];
  for (const y of notchScrewRow(hh, sfe)) { out.push([S, y]); out.push([nw + S, y]); }
  for (const x of notchShift(notchScrewRow(nw - g, sfe), g)) {
    out.push([x, S]);
    if (full) out.push([x, hh - S]);
  }
  return out;
}

/** notch-return: [nd - g, hh] at a back corner (the STEP covers its end, 15.10.2026), [nd, hh] at a front one. */
export function notchReturn(ch, g, nw, nd, nh, corner = 'BL') {
  return notchBoxedP(nw, g) ? [notchBackP(corner) ? nd - g : nd, notchHh(ch, nh)] : null;
}

/**
 * notch-return-screws: NONE since 17.10.2026 (D10). Until then, as the record below states, x along the depth from the RETURN's FRONT end, y up:
 * the row into the BOTTOM's (and at full height the TOP's) notch edge along
 * its own length. The STEP's column holds it at the back corner.
 */
export function notchReturnScrews(ch, g, nw, nd, nh, corner, K) {
  // 17.10.2026 (KIT_NOTCH.lsp D10): none stated; biscuits by hand, "teraz nic".
  void ch; void g; void nw; void nd; void nh; void corner; void K;
  return null;
}

/** The record (D10): what notchReturnScrews stated until 17.10.2026. */
export function notchReturnScrewsStatedUntil1710(ch, g, nw, nd, nh, corner, K) {
  const ret = notchReturn(ch, g, nw, nd, nh, corner);
  if (!ret) return null;
  const S = notchScrewAxis(g);
  const hh = notchHh(ch, nh);
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const full = notchFullP(ch, nh);
  const out = [];
  for (const x of notchScrewRow(ret[0], sfe)) {
    out.push([x, S]);
    if (full) out.push([x, hh - S]);
  }
  return out;
}

/** notch-lid: [nw, nd], part height only; D21: never over a notch from the top. */
export function notchLid(ch, g, nw, nd, nh) {
  return notchBoxedP(nw, g) && !notchFullP(ch, nh) && !notchFromTopP(ch, nh) ? [nw, nd] : null;
}

/**
 * notch-floor (D21): [nw, nd], a notch from the top only, at z = ch - |nh| - g
 * .. ch - |nh|, the STEP and the RETURN standing on it. No screw is stated for
 * it: the box is the joiner's (D10).
 */
export function notchFloor(ch, g, nw, nd, nh) {
  return notchBoxedP(nw, g) && notchFromTopP(ch, nh) ? [nw, nd] : null;
}

/**
 * notch-lid-screws: NONE since 17.10.2026 (D10). Until then, as the record below states, x from the LID's left end, y along the depth from its
 * FRONT end. 15.10.2026: at a back corner the RETURN lies under the LID from
 * y = g (behind the STEP) and the STEP under its whole front edge (0 .. nw).
 */
export function notchLidScrews(ch, g, nw, nd, nh, corner, K) {
  // 17.10.2026 (KIT_NOTCH.lsp D10): none stated; biscuits by hand, "teraz nic".
  void ch; void g; void nw; void nd; void nh; void corner; void K;
  return null;
}

/** The record (D10): what notchLidScrews stated until 17.10.2026. */
export function notchLidScrewsStatedUntil1710(ch, g, nw, nd, nh, corner, K) {
  if (!notchLid(ch, g, nw, nd, nh)) return null;
  const S = notchScrewAxis(g);
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const back = notchBackP(corner);
  const out = [];
  const retX = notchLeftP(corner) ? nw - S : S;
  for (const y of (back ? notchShift(notchScrewRow(nd - g, sfe), g) : notchScrewRow(nd, sfe))) out.push([retX, y]);
  if (back) for (const x of notchScrewRow(nw, sfe)) out.push([x, S]);
  return out;
}

// ── SHELVES ───────────────────────────────────────────────────────────────

/** notch-shelf-rect: the parent's adjustable shelf, in plan. */
export function notchShelfRect(cw, cd, g, K) {
  const wc = notchP(K, 'carcass.shelfWidthClearance');
  const dc = notchP(K, 'carcass.shelfDepthClearance');
  return [g + wc / 2, dc, cw - g - wc / 2, cd - g];
}

/** notch-shelf-crosses-p; D21, from the top: its top face (zs + g) rises past the FLOOR's underside. */
export function notchShelfCrossesP(zs, g, ch, nh) {
  if (notchFullP(ch, nh)) return true;
  if (notchFromTopP(ch, nh)) return zs + g > ch - notchHh(ch, nh) - g;
  return zs < nh + g;
}

export function notchShelfCut(cw, cd, g, nw, nd, corner, clr, shelf) {
  return notchPlanCut(shelf, notchKeepout(cw, cd, g, nw, nd, corner, clr));
}

export function notchShelfOutline(cw, cd, g, nw, nd, corner, clr, shelf) {
  return notchCutOutline(shelf, notchShelfCut(cw, cd, g, nw, nd, corner, clr, shelf));
}

export function notchShelfDogbone(cw, cd, g, nw, nd, corner, clr, shelf, r) {
  return notchCutDogbone(notchShelfCut(cw, cd, g, nw, nd, corner, clr, shelf), r);
}

// ── THE PLINTH ────────────────────────────────────────────────────────────

/** notch-plinth: [x0, x1], its extent across the unit; [0, cw] untouched. D21: `top` never reaches it. */
export function notchPlinth(cw, cd, nw, nd, corner, setback, pt, top = false) {
  const [ny0, ny1] = notchBackP(corner) ? [cd - nd, cd] : [0, nd];
  if (!top && ny0 < setback + pt && ny1 > setback) {
    return notchLeftP(corner) ? [nw, cw] : [0, cw - nw];
  }
  return [0, cw];
}

// ═══════════════════════════════════════════════════════════════════════════
// G. THE DRILLING THE NOTCH REACHES (D7, D8)
// ═══════════════════════════════════════════════════════════════════════════

export function notchHoleInP(x, y, rad, bw, bh, nw, nh, fc) {
  const [rx0, rx1] = notchFcX0(fc) ? [0, nw] : [bw - nw, bw];
  const [ry0, ry1] = notchFcY0(fc) ? [0, nh] : [bh - nh, bh];
  return x + rad > rx0 && x - rad < rx1 && y + rad > ry0 && y - rad < ry1;
}

export function notchHoleRefusal(kind, board) {
  return `NOTCH: the ${kind} drilling of ${board} falls in the notch, and a ${kind} cannot be fixed to air.`
    + ` Move the notch, or hang the ${kind} on the other side.`;
}

/** notch-crosses-p: from height z0 up to z1; D21, from the top: z1 past the FLOOR's underside. */
export function notchCrossesP(cw, cd, ch, g, nw, nd, nh, corner, rect, z0, z1 = z0) {
  const lift = (notchFullP(ch, nh) || !notchBoxedP(nw, g)) ? 0 : g;
  if (!notchOverlapP(rect, notchKeepout(cw, cd, g, nw, nd, corner, 0))) return false;
  return notchFromTopP(ch, nh)
    ? z1 > ch - notchHh(ch, nh) - lift
    : z0 < notchHh(ch, nh) + lift;
}

export function notchRebateEatsP(cd, ch, g, nw, nd, nh, corner, K) {
  if (notchBoxedP(nw, g)) return false;
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const inset = notchJointInset(cd, e, notchP(K, 'puzzle.singleJointMaxDepth'));
  const one = notchP(K, 'puzzle.singleTabAtOrBelow');
  const three = notchP(K, 'puzzle.middleTabBelow');
  const bone = notchP(K, 'puzzle.dogboneHalfHeight');
  const half = notchP(K, 'puzzle.socketHalfWidth');
  const sideW = cd - g;
  const hh = notchHh(ch, nh);
  const [lo, hi] = notchBackP(corner) ? [sideW - nd, sideW] : [0, nd];
  let hit = false;
  if (notchBackP(corner)) {
    const top = notchFromTopP(ch, nh);
    for (const c of notchReplanTabs(ch, e, one, three)) if (top ? c + bone > ch - hh : c - bone < hh) hit = true;
  }
  for (const c of notchReplanSockets(sideW, inset, below)) {
    if (c + half > lo && c - half < hi) hit = true;
  }
  return hit;
}

// ═══════════════════════════════════════════════════════════════════════════
// H. THE REFUSALS (Room refuses first; nothing is clipped silently)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * notch-obstacle-limits (15.10.2026): the widest and the deepest FULL-HEIGHT
 * back notch an obstacle may ask of a carcass cw x cd of boards g, as
 * [maxW, maxD]: the interior kept beside the notch (across) and beyond it (in
 * depth) is the owner's `notch.minInterior` (100, *"nie mniej niz 100 mm w
 * srodku szafki"*), never less than what a joint needs (minEdge, 96). Past
 * maxW the whole cabinet goes shallower (KIT_NOTCH.lsp section 1, PAST THE
 * NOTCH; projectStore settleObstacles).
 */
export function notchObstacleLimits(cw, cd, g, bone, minInterior = 100) {
  const keep = Math.max(notchMinJointEdge(bone, g), Number(minInterior) || 0);
  return [cw - 2 * g - keep, cd - g - keep];
}

/**
 * notch-refusal. D21 (18.10.2026): a negative nh is a notch from the top, no
 * longer refused ("the height cannot be below 0" stood here until then); it
 * must leave `notch.minInterior` of the interior UNDER it, and the side's back
 * edge under it must hold a tab.
 */
export function notchRefusal(cw, cd, ch, g, nw, nd, nh, corner, K) {
  const bone = notchP(K, 'puzzle.dogboneHalfHeight');
  const minEdge = notchMinJointEdge(bone, g);
  const minInt = notchP(K, 'notch.minInterior');
  const sideW = cd - g;
  const tw = cw - 2 * g;
  const top = notchFromTopP(ch, nh);
  const hh = notchHh(ch, nh);
  const side = notchCornerOk(corner) ? notchSideName(corner) : 'the side';
  if (!notchCornerOk(corner)) return 'NOTCH: the corner is BL, BR, FL or FR.';
  if (!(nw > 0) || !(nd > 0)) return 'NOTCH: the width and the depth must both be more than 0.';
  if (!notchFullP(ch, nh) && !top && nh + g > ch - g) {
    return 'NOTCH: a part-height notch must leave its LID room under the TOP. Make it full height, or lower it.';
  }
  if (top && ch - hh - g - (notchBoxedP(nw, g) ? g : 0) < minInt) {
    return `NOTCH: a notch from the top must leave ${roundTo(minInt, 0)} mm of the interior under it. Make it shorter, or make it full height.`;
  }
  if (notchBoxedP(nw, g) && tw - nw < minEdge) {
    return 'NOTCH: the notch and its RETURN take the TOP and the BOTTOM across. Make it narrower.';
  }
  if (sideW - nd < minEdge) {
    return `NOTCH: what is left of ${side} cannot hold a joint. Make the notch shallower.`;
  }
  if (notchBoxedP(nw, g) && notchBackP(corner) && !notchFullP(ch, nh) && !top && ch - nh < minEdge) {
    return `NOTCH: the back edge of ${side} above the notch cannot hold a tab. Make it full height, or lower it.`;
  }
  if (notchBoxedP(nw, g) && notchBackP(corner) && top && ch - hh < minEdge) {
    return `NOTCH: the back edge of ${side} under the notch cannot hold a tab. Make it shorter, or make it full height.`;
  }
  if (notchRebateEatsP(cd, ch, g, nw, nd, nh, corner, K)) {
    return `NOTCH: a notch narrower than the board is a rebate in ${side}, and this one eats a joint.`
      + ' Make it at least as wide as the board (it is then boxed), or smaller.';
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// H2. THE EDGE NOTCH (KIT_NOTCH.lsp D22 and its section H2, 18.10.2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// T79 F5. The owner: *"cut the corner działa idealnie, ale możesz zrobić mi też
// poziome cut? wszystkich 4 rogów?"*  A rebate along ONE horizontal edge of the
// side elevation, the whole width of the carcass: TB top-back (a coving), BB
// bottom-back (a skirting), TF top-front (a bulkhead), BF bottom-front (a
// plinth return); the LISP's ed and eh are this file's d and h. The routines
// are the LISP's, camelCased, the same arguments in the same order; where the
// LISP returns an alist of runs or joints this returns an object with the same
// keys, and where it returns nil for a list, [].

export const EDGE_NOTCH_EDGES = Object.freeze(['TB', 'BB', 'TF', 'BF']);

export function edgeNotchOk(edge) { return EDGE_NOTCH_EDGES.includes(edge); }
export function edgeNotchBackP(edge) { return edge === 'TB' || edge === 'BB'; }
export function edgeNotchTopP(edge) { return edge === 'TB' || edge === 'TF'; }
/** The corner notch's corner with the same back-ness: the side's corner name is notchSideFc's own. */
export function edgeNotchAsCorner(edge) { return edgeNotchBackP(edge) ? 'BL' : 'FL'; }
/** The board the edge cuts across: the TOP for a top edge, else the BOTTOM. */
export function edgeNotchBoard(edge) { return edgeNotchTopP(edge) ? 'TOP' : 'BOTTOM'; }

// ── THE SIDES, BUL AND BUR BOTH (drawBUL x from the FRONT, drawBUR from the BACK) ──

export function edgeNotchSideFc(edge, burFrame) {
  return notchSideFc(edgeNotchAsCorner(edge), burFrame, edgeNotchTopP(edge));
}

export function edgeNotchSide(cd, ch, g, ed, eh, edge, burFrame) {
  return notchRectOutline(cd - g, ch, ed, eh, edgeNotchSideFc(edge, burFrame));
}

// ── THE RUN LAW (D22: section 4's D5, read as runs) ──
//
// A jointed edge of a board is planned on the RUN the cuts leave it, [lo, hi],
// by the call that planned the whole edge; null where a cut took the edge away.
// With the corner notch on the same board, each run is the MEET of the two.

export function edgeNotchRun(lo, hi) { return hi > lo ? [lo, hi] : null; }
export function edgeNotchRunMeet(a, b) {
  return a && b ? edgeNotchRun(Math.max(a[0], b[0]), Math.min(a[1], b[1])) : null;
}
export function edgeNotchRunLen(r) { return r ? r[1] - r[0] : 0; }
/** Two boards' worth of runs, met key by key (the keys of the first). */
export function edgeNotchRunsMeet(a, b) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = edgeNotchRunMeet(a[k], b[k] ?? null);
  return out;
}

/** The side's runs: BOTTOM and TOP from its FRONT edge (BUR's frame is cd - g - x), BACK up its back edge. */
export function edgeNotchSideRuns(cd, ch, g, ed, eh, edge) {
  const sideW = cd - g;
  const whole = [0, sideW];
  const cut = edgeNotchBackP(edge) ? edgeNotchRun(0, sideW - ed) : edgeNotchRun(ed, sideW);
  let back;
  if (!edgeNotchBackP(edge)) back = [0, ch];
  else if (edgeNotchTopP(edge)) back = edgeNotchRun(0, ch - eh);
  else back = edgeNotchRun(eh, ch);
  return { BOTTOM: edgeNotchTopP(edge) ? whole : cut, TOP: edgeNotchTopP(edge) ? cut : whole, BACK: back };
}

/** The corner notch's runs on ITS side (notchSideJoints plans exactly these); a rebate leaves them whole. */
export function notchSideRuns(cd, ch, g, nw, nd, nh, corner) {
  const sideW = cd - g;
  const whole = [0, sideW];
  if (!notchBoxedP(nw, g)) return { BOTTOM: whole, TOP: whole, BACK: [0, ch] };
  const full = notchFullP(ch, nh);
  const top = notchFromTopP(ch, nh);
  const hh = notchHh(ch, nh);
  const cut = notchBackP(corner) ? edgeNotchRun(0, sideW - nd) : edgeNotchRun(nd, sideW);
  let back;
  if (!notchBackP(corner)) back = [0, ch];
  else if (full) back = null;
  else if (top) back = edgeNotchRun(0, ch - hh);
  else back = edgeNotchRun(nh, ch);
  return { BOTTOM: top ? whole : cut, TOP: full || top ? cut : whole, BACK: back };
}

/** The side's joints planned on its runs (section 4's calls), from the FRONT edge, keyed as notchSideJoints. */
export function edgeNotchPlanSide(runs, cd, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const inset = notchJointInset(cd, e, notchP(K, 'puzzle.singleJointMaxDepth'));
  const one = notchP(K, 'puzzle.singleTabAtOrBelow');
  const three = notchP(K, 'puzzle.middleTabBelow');
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const on = (r, plan) => (r ? notchShift(plan(edgeNotchRunLen(r)), r[0]) : []);
  return {
    'TOP-SOCKETS': on(runs.TOP, (len) => notchReplanSockets(len, inset, below)),
    'BOTTOM-SOCKETS': on(runs.BOTTOM, (len) => notchReplanSockets(len, inset, below)),
    'TOP-SCREWS': on(runs.TOP, (len) => notchScrewRow(len, sfe)),
    'BOTTOM-SCREWS': on(runs.BOTTOM, (len) => notchScrewRow(len, sfe)),
    'BACK-TABS': on(runs.BACK, (len) => notchReplanTabs(len, e, one, three)),
  };
}

export function edgeNotchSideJoints(cd, ch, g, ed, eh, edge, K) {
  return edgeNotchPlanSide(edgeNotchSideRuns(cd, ch, g, ed, eh, edge), cd, K);
}

// ── THE TOP (a top edge) or THE BOTTOM (a bottom edge), in its PLAN frame ──

/** [fc, nw, nh]: the strip, as notchRectOutline takes it (x from BUL's inner face, y from the front). */
export function edgeNotchTopCut(cw, cd, g, ed, edge) {
  return [edgeNotchBackP(edge) ? 'x0y1' : 'x0y0', cw - 2 * g, ed];
}

export function edgeNotchTopOutline(cw, cd, g, ed, edge) {
  const c = edgeNotchTopCut(cw, cd, g, ed, edge);
  return notchRectOutline(cw - 2 * g, cd - g, c[1], c[2], c[0]);
}

/** Its runs: LEFT / RIGHT y from the front, BACK x from BUL's inner face; at a back edge its BACK edge meets nothing. */
export function edgeNotchTopRuns(cw, cd, g, ed, edge) {
  const sideW = cd - g;
  const tw = cw - 2 * g;
  const lr = edgeNotchBackP(edge) ? edgeNotchRun(0, sideW - ed) : edgeNotchRun(ed, sideW);
  return { LEFT: lr, RIGHT: lr, BACK: edgeNotchBackP(edge) ? null : [0, tw] };
}

/** The corner notch's runs on a TOP or BOTTOM it cuts (notchTopJoints plans exactly these); a rebate, whole. */
export function notchTopRuns(cw, cd, g, nw, nd, corner) {
  const sideW = cd - g;
  const tw = cw - 2 * g;
  const whole = [0, sideW];
  if (!notchBoxedP(nw, g)) return { LEFT: whole, RIGHT: whole, BACK: [0, tw] };
  const cut = notchBackP(corner) ? edgeNotchRun(0, sideW - nd) : edgeNotchRun(nd, sideW);
  let bk;
  if (!notchBackP(corner)) bk = [0, tw];
  else if (notchLeftP(corner)) bk = edgeNotchRun(nw, tw);
  else bk = edgeNotchRun(0, tw - nw);
  return { LEFT: notchLeftP(corner) ? cut : whole, RIGHT: notchLeftP(corner) ? whole : cut, BACK: bk };
}

export function edgeNotchPlanTop(runs, cd, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const inset = notchJointInset(cd, e, notchP(K, 'puzzle.singleJointMaxDepth'));
  const on = (r, i) => (r ? notchShift(notchReplanSockets(edgeNotchRunLen(r), i, below), r[0]) : []);
  return { LEFT: on(runs.LEFT, inset), RIGHT: on(runs.RIGHT, inset), BACK: on(runs.BACK, e) };
}

export function edgeNotchTopJoints(cw, cd, g, ed, edge, K) {
  return edgeNotchPlanTop(edgeNotchTopRuns(cw, cd, g, ed, edge), cd, K);
}

// ── THE BACK (a back edge only): shorter by eh, x from the LEFT face, y up ──

export function edgeNotchBackCut(cw, eh, edge) {
  return [edgeNotchTopP(edge) ? 'x0y1' : 'x0y0', cw, eh];
}

export function edgeNotchBack(cw, ch, eh, edge) {
  if (!edgeNotchBackP(edge)) return notchPlainRect(cw, ch);
  const c = edgeNotchBackCut(cw, eh, edge);
  return notchRectOutline(cw, ch, c[1], c[2], c[0]);
}

/** Its runs: LEFT / RIGHT (the sides' back edges) y up, TOP / BOTTOM x along. */
export function edgeNotchBackRuns(cw, ch, g, eh, edge) {
  let lr;
  if (!edgeNotchBackP(edge)) lr = [0, ch];
  else if (edgeNotchTopP(edge)) lr = edgeNotchRun(0, ch - eh);
  else lr = edgeNotchRun(eh, ch);
  return {
    LEFT: lr,
    RIGHT: lr,
    TOP: edgeNotchBackP(edge) && edgeNotchTopP(edge) ? null : [0, cw],
    BOTTOM: edgeNotchBackP(edge) && !edgeNotchTopP(edge) ? null : [0, cw],
  };
}

/** The corner notch's runs on the BACK (notchBackJoints plans exactly these, boxed); a front corner or a rebate, whole. */
export function notchBackRuns(cw, ch, g, nw, nh, corner) {
  const whole = [0, cw];
  if (!notchBackP(corner) || !notchBoxedP(nw, g)) return { LEFT: [0, ch], RIGHT: [0, ch], TOP: whole, BOTTOM: whole };
  const full = notchFullP(ch, nh);
  const top = notchFromTopP(ch, nh);
  const hh = notchHh(ch, nh);
  const left = notchLeftP(corner);
  let near;
  if (full) near = null;
  else if (top) near = edgeNotchRun(0, ch - hh);
  else near = edgeNotchRun(nh, ch);
  const cutx = left ? edgeNotchRun(nw, cw) : edgeNotchRun(0, cw - nw);
  return {
    LEFT: left ? near : [0, ch],
    RIGHT: left ? [0, ch] : near,
    TOP: full || top ? cutx : whole,
    BOTTOM: top ? whole : cutx,
  };
}

/**
 * The BACK's joints planned on its runs: the sockets the sides' tabs and the
 * TOP's / BOTTOM's tabs land in, and drawBACK's dia 3 rows on what is left of
 * each of its four edges (D10: an edge a cut MADE carries none).
 */
export function edgeNotchPlanBack(runs, cw, ch, g, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const one = notchP(K, 'puzzle.singleTabAtOrBelow');
  const three = notchP(K, 'puzzle.middleTabBelow');
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const S = notchScrewAxis(g);
  const { LEFT: l, RIGHT: r, TOP: tp, BOTTOM: b } = runs;
  const lt = l ? notchShift(notchReplanTabs(edgeNotchRunLen(l), e, one, three), l[0]) : [];
  const rt = r ? notchShift(notchReplanTabs(edgeNotchRunLen(r), e, one, three), r[0]) : [];
  const scr = [];
  if (l) for (const y of notchRowsBetweenTabs(l[0], l[1], lt, sfe)) scr.push([S, y]);
  if (r) for (const y of notchRowsBetweenTabs(r[0], r[1], rt, sfe)) scr.push([cw - S, y]);
  if (tp) for (const x of notchRowBetween(tp[0], tp[1], g, sfe)) scr.push([x, ch - S]);
  if (b) for (const x of notchRowBetween(b[0], b[1], g, sfe)) scr.push([x, S]);
  const across = (run) => (run ? notchShift(notchReplanSockets(edgeNotchRunLen(run) - 2 * g, e, below), run[0] + g) : []);
  return {
    'LEFT-SOCKETS': lt,
    'RIGHT-SOCKETS': rt,
    'TOP-SOCKETS': across(tp),
    'BOTTOM-SOCKETS': across(b),
    SCREWS: scr,
  };
}

export function edgeNotchBackJoints(cw, ch, g, eh, edge, K) {
  return edgeNotchPlanBack(edgeNotchBackRuns(cw, ch, g, eh, edge), cw, ch, g, K);
}

// ── THE KEEP-OUT (D8), in plan and height ──

/** [[x0, y0, x1, y1], z0, z1]: at a back edge from the cut faces (cd - g - ed) to the back face. */
export function edgeNotchKeepout(cw, cd, ch, g, ed, eh, edge) {
  const back = edgeNotchBackP(edge);
  const top = edgeNotchTopP(edge);
  return [[0, back ? cd - g - ed : 0, cw, back ? cd : ed], top ? ch - eh : 0, top ? ch : eh];
}

/** Does anything at plan `rect`, from height z0 up to z1, cross it? */
export function edgeNotchCrossesP(cw, cd, ch, g, ed, eh, edge, rect, z0, z1) {
  const k = edgeNotchKeepout(cw, cd, ch, g, ed, eh, edge);
  return notchOverlapP(rect, k[0]) && z0 < k[2] && z1 > k[1];
}

// ── COEXISTENCE: the two rectangles on a side, in its FRONT frame ──

export function edgeNotchSideRect(cd, ch, g, ed, eh, edge) {
  const sideW = cd - g;
  const back = edgeNotchBackP(edge);
  const top = edgeNotchTopP(edge);
  return [back ? sideW - ed : 0, top ? ch - eh : 0, back ? sideW : ed, top ? ch : eh];
}

export function notchSideRect(cd, ch, g, nd, nh, corner) {
  const sideW = cd - g;
  const hh = notchHh(ch, nh);
  const top = notchFromTopP(ch, nh);
  return [notchBackP(corner) ? sideW - nd : 0, top ? ch - hh : 0, notchBackP(corner) ? sideW : nd, top ? ch : hh];
}

/** Does the corner notch cut this horizontal board (section 2)? */
export function notchCutsBoardP(ch, nh, hz) {
  return hz === 'TOP' ? notchFullP(ch, nh) || notchFromTopP(ch, nh) : !notchFromTopP(ch, nh);
}

// ── THE COMPOUND OUTLINE: a board less TWO cuts (one: notchRectOutline's polygon) ──

export function edgeNotchStripP(bw, bh, c) { return Boolean(c) && (c[1] >= bw || c[2] >= bh); }

/** The rectangle the strips leave, [x0, y0, x1, y1]. */
export function edgeNotchShrink(bw, bh, cuts) {
  let [x0, y0, x1, y1] = [0, 0, bw, bh];
  for (const c of cuts) {
    if (!edgeNotchStripP(bw, bh, c)) continue;
    if (c[1] >= bw) {
      if (notchFcY0(c[0])) y0 = Math.max(y0, c[2]);
      else y1 = Math.min(y1, bh - c[2]);
    } else if (notchFcX0(c[0])) x0 = Math.max(x0, c[1]);
    else x1 = Math.min(x1, bw - c[1]);
  }
  return [x0, y0, x1, y1];
}

/** The corner cuts, clipped to `box`, each [fc, w, h] named on THAT rectangle. */
export function edgeNotchCorners(bw, bh, cuts, box) {
  const out = [];
  for (const c of cuts) {
    if (!c || edgeNotchStripP(bw, bh, c)) continue;
    const [rx0, rx1] = notchFcX0(c[0]) ? [0, c[1]] : [bw - c[1], bw];
    const [ry0, ry1] = notchFcY0(c[0]) ? [0, c[2]] : [bh - c[2], bh];
    const cx0 = Math.max(rx0, box[0]);
    const cx1 = Math.min(rx1, box[2]);
    const cy0 = Math.max(ry0, box[1]);
    const cy1 = Math.min(ry1, box[3]);
    if (cx1 > cx0 && cy1 > cy0) {
      out.push([`${cx0 <= box[0] ? 'x0' : 'x1'}${cy0 <= box[1] ? 'y0' : 'y1'}`, cx1 - cx0, cy1 - cy0]);
    }
  }
  return out;
}

/** Once round `box`, anticlockwise from its x0y0 corner, each cut corner taking its three points. */
export function edgeNotchWalk(box, corners) {
  const [x0, y0, x1, y1] = box;
  const out = [];
  for (const fc of ['x0y0', 'x1y0', 'x1y1', 'x0y1']) {
    const hit = corners.find((c) => c[0] === fc);
    if (!hit) out.push([notchFcX0(fc) ? x0 : x1, notchFcY0(fc) ? y0 : y1]);
    else if (fc === 'x0y0') out.push([x0, y0 + hit[2]], [x0 + hit[1], y0 + hit[2]], [x0 + hit[1], y0]);
    else if (fc === 'x1y0') out.push([x1 - hit[1], y0], [x1 - hit[1], y0 + hit[2]], [x1, y0 + hit[2]]);
    else if (fc === 'x1y1') out.push([x1, y1 - hit[2]], [x1 - hit[1], y1 - hit[2]], [x1 - hit[1], y1]);
    else out.push([x0 + hit[1], y1], [x0 + hit[1], y1 - hit[2]], [x0, y1 - hit[2]]);
  }
  return out;
}

export function edgeNotchLessTwo(bw, bh, cutA, cutB) {
  const box = edgeNotchShrink(bw, bh, [cutA, cutB]);
  return edgeNotchWalk(box, edgeNotchCorners(bw, bh, [cutA, cutB], box));
}

// ── THE REFUSALS (Room refuses first) ──

/** notch.minInterior applies to what is left, in depth (cd - g - ed) and in height (ch - g - eh), never under D6. */
export function edgeNotchRefusal(cw, cd, ch, g, ed, eh, edge, K) {
  const keep = Math.max(notchMinJointEdge(notchP(K, 'puzzle.dogboneHalfHeight'), g), notchP(K, 'notch.minInterior'));
  if (!edgeNotchOk(edge)) return 'NOTCH: the edge is TB, BB, TF or BF.';
  if (!(ed > 0) || !(eh > 0)) return 'NOTCH: the depth and the height of an edge notch must both be more than 0.';
  if (cd - g - ed < keep) {
    return `NOTCH: an edge notch must leave ${roundTo(keep, 0)} mm of the interior beside it in depth. Make it shallower.`;
  }
  if (ch - g - eh < keep) {
    return `NOTCH: an edge notch must leave ${roundTo(keep, 0)} mm of the interior beside it in height. Make it lower.`;
  }
  return null;
}

/** The first key whose run both cuts leave and whose meet cannot hold a joint, or null. */
export function edgeNotchShortRun(a, b, minEdge) {
  for (const k of Object.keys(a)) {
    const ra = a[k];
    const rb = b[k] ?? null;
    if (ra && rb && edgeNotchRunLen(edgeNotchRunMeet(ra, rb)) < minEdge) return k;
  }
  return null;
}

export function edgeNotchShortSaid(key, board) {
  return `NOTCH: what the corner notch and the edge notch leave of the ${key} edge of ${board}`
    + ' cannot hold a joint. Make one of them smaller.';
}

/** notchRebateEatsP's law asked of a GIVEN side plan (the met one). */
export function edgeNotchRebateEatsP(cd, ch, g, nw, nd, nh, corner, sj, K) {
  const bone = notchP(K, 'puzzle.dogboneHalfHeight');
  const half = notchP(K, 'puzzle.socketHalfWidth');
  const sideW = cd - g;
  const hh = notchHh(ch, nh);
  const top = notchFromTopP(ch, nh);
  const [lo, hi] = notchBackP(corner) ? [sideW - nd, sideW] : [0, nd];
  let hit = false;
  if (notchBackP(corner)) {
    for (const c of sj['BACK-TABS'] || []) if (top ? c + bone > ch - hh : c - bone < hh) hit = true;
  }
  for (const c of [...(sj['TOP-SOCKETS'] || []), ...(sj['BOTTOM-SOCKETS'] || [])]) {
    if (c + half > lo && c - half < hi) hit = true;
  }
  return hit;
}

/**
 * COEXISTENCE: the corner notch (nw nd nh corner) with the edge notch. Their
 * rectangles on the corner notch's side must not overlap; every jointed edge
 * both leave must still hold a joint (D6); and a rebate's side must not have
 * a re-planned joint moved into it.
 */
export function edgeNotchMeetsRefusal(cw, cd, ch, g, ed, eh, edge, nw, nd, nh, corner, K) {
  const minEdge = notchMinJointEdge(notchP(K, 'puzzle.dogboneHalfHeight'), g);
  const side = notchSideName(corner);
  const hz = edgeNotchBoard(edge);
  if (notchOverlapP(edgeNotchSideRect(cd, ch, g, ed, eh, edge), notchSideRect(cd, ch, g, nd, nh, corner))) {
    return `NOTCH: the edge notch and the corner notch overlap on ${side}. Move one of them, or make it smaller.`;
  }
  let bad = edgeNotchShortRun(notchSideRuns(cd, ch, g, nw, nd, nh, corner), edgeNotchSideRuns(cd, ch, g, ed, eh, edge), minEdge);
  if (bad) return edgeNotchShortSaid(bad, side);
  if (notchBoxedP(nw, g) && notchCutsBoardP(ch, nh, hz)) {
    bad = edgeNotchShortRun(notchTopRuns(cw, cd, g, nw, nd, corner), edgeNotchTopRuns(cw, cd, g, ed, edge), minEdge);
    if (bad) return edgeNotchShortSaid(bad, hz);
  }
  bad = edgeNotchShortRun(notchBackRuns(cw, ch, g, nw, nh, corner), edgeNotchBackRuns(cw, ch, g, eh, edge), minEdge);
  if (bad) return edgeNotchShortSaid(bad, 'BACK');
  if (!notchBoxedP(nw, g)) {
    const met = edgeNotchRunsMeet(notchSideRuns(cd, ch, g, nw, nd, nh, corner), edgeNotchSideRuns(cd, ch, g, ed, eh, edge));
    if (edgeNotchRebateEatsP(cd, ch, g, nw, nd, nh, corner, edgeNotchPlanSide(met, cd, K), K)) {
      return `NOTCH: a notch narrower than the board is a rebate in ${side}, and the edge notch moves a joint into it.`
        + ' Make the corner notch at least as wide as the board, or smaller.';
    }
  }
  return null;
}

/** D7, in this notch's words: a hole the cut reaches on either side. */
export function edgeNotchHoleRefusal(kind, board) {
  return `NOTCH: the ${kind} drilling of ${board} falls in the edge notch, and a ${kind}`
    + ' cannot be fixed to air. Make the notch smaller, or cut another edge.';
}

// ═══════════════════════════════════════════════════════════════════════════
// H3. THE END PANEL FOLLOWS ITS SIDE (KIT_NOTCH.lsp D23, T79 F9, 18.10.2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner: *"nie wycina mi panelu bocznego do recess a powinno."*  The END
// panel in its side's frame (END-L x from the FRONT, END-R x from the BACK),
// ew deep, ph high; sb behind the carcass back face, sf in front of its front
// face, pb below its underside; hand 'L' or 'R'. A cut is [fc, w, h] in
// notchRectOutline's grammar; null is no cut. Applied once, for the notch,
// the edge notch and the recess together, by extension.js endPanelsFollowSides.

/** notch-end-h: how high a cut anchored at the carcass's 'floor', 'top' or 'full' height runs on the END panel. */
export function notchEndH(ch, hh, anchor, ph, pb) {
  if (anchor === 'full') return ph;
  if (anchor === 'top') return ph - pb - (ch - hh);
  return hh + pb;
}

/** notch-end-cut: the corner notch on the END panel of the notched side; null on the other hand. */
export function notchEndCut(ch, g, nw, nd, nh, corner, hand, sb, sf, ph, pb) {
  if (hand !== (notchLeftP(corner) ? 'L' : 'R')) return null;
  let w;
  if (!notchBackP(corner)) w = nd + sf;
  else if (notchBoxedP(nw, g)) w = sb + nd;
  else w = sb + g + nd;
  let anchor = 'floor';
  if (notchFullP(ch, nh)) anchor = 'full';
  else if (notchFromTopP(ch, nh)) anchor = 'top';
  return [notchSideFc(corner, hand === 'R', notchFromTopP(ch, nh)), w, notchEndH(ch, notchHh(ch, nh), anchor, ph, pb)];
}

/** edge-notch-end-cut: the edge notch on EITHER END panel, flush with the side's cut face. */
export function edgeNotchEndCut(ch, g, ed, eh, edge, hand, sb, sf, ph, pb) {
  return [
    edgeNotchSideFc(edge, hand === 'R'),
    edgeNotchBackP(edge) ? sb + g + ed : ed + sf,
    notchEndH(ch, eh, edgeNotchTopP(edge) ? 'top' : 'floor', ph, pb),
  ];
}

/** notch-end-in-p: does the cut c cover the height y of a board ph high? */
export function notchEndInP(c, y, ph) {
  return notchFcY0(c[0]) ? y < c[2] : y > ph - c[2];
}

/** notch-end-runs: one edge of the rows [[y0, y1, l, r], ...], merged where its x stays: [[x, y0, y1], ...]. */
export function notchEndRuns(rows, k) {
  const out = [];
  for (const w of rows) {
    const x = w[k];
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - x) <= 1e-9) out[out.length - 1] = [x, last[1], w[1]];
    else out.push([x, w[0], w[1]]);
  }
  return out;
}

/**
 * notch-end-outline: the END panel ew x ph less its cuts, { box, pts }. box is
 * [x0, y0, x1, y1], what it keeps in the uncut frame; pts its outline,
 * anticlockwise from its bottom-left corner, re-origined to box; null when
 * the cuts leave nothing.
 */
export function notchEndOutline(ew, ph, cuts) {
  const cs = (cuts || []).filter(Boolean);
  const ys = [0, ph, ...cs.map((c) => (notchFcY0(c[0]) ? Math.min(ph, c[2]) : Math.max(0, ph - c[2])))].sort((a, b) => a - b);
  const rows = [];
  for (let i = 0; i + 1 < ys.length; i += 1) {
    const [y0, y1] = [ys[i], ys[i + 1]];
    if (!(y1 > y0)) continue;
    const mid = (y0 + y1) / 2;
    let l = 0;
    let r = ew;
    for (const c of cs) {
      if (!notchEndInP(c, mid, ph)) continue;
      if (notchFcX0(c[0])) l = Math.max(l, c[1]);
      else r = Math.min(r, ew - c[1]);
    }
    if (l < r) rows.push([y0, y1, l, r]);
  }
  if (!rows.length) return null;
  const right = notchEndRuns(rows, 3);
  const left = notchEndRuns(rows, 2).reverse();
  const pts = [
    ...right.flatMap(([x, a, b]) => [[x, a], [x, b]]),
    ...left.flatMap(([x, a, b]) => [[x, b], [x, a]]),
  ];
  pts.unshift(pts.pop());
  const box = [Math.min(...rows.map((w) => w[2])), rows[0][0], Math.max(...rows.map((w) => w[3])), rows[rows.length - 1][1]];
  return { box, pts: pts.map(([x, y]) => [x - box[0], y - box[1]]) };
}

// ═══════════════════════════════════════════════════════════════════════════
// Z. THE ENGINE CUTS WHAT THE ROUTINES DESCRIBE
// ═══════════════════════════════════════════════════════════════════════════
//
// LISP sections J and K are the AutoCAD command that DRAWS the routines'
// answers; they have no engine twin. What the engine needs instead is below:
// which kits the notch applies to, the verdict asked of the parent's own cut,
// and the two passes either side of the drilling pass.

/** The warning code every refusal carries (Check #28 reads it). */
export const NOTCH_REFUSED = 'NOTCH_REFUSED';

/**
 * The LISP's parents: "Parent kit [B=BUD / W=WARDROBE / U=WUD wall unit]". The
 * wall unit joined them on 15.10.2026 (the owner: *"nie ma wogole mozliwosci
 * wyciecia naroznika w szafkach wiszacych, a powinno byc"*); its hangers are
 * carried by `notchHangerCutouts` (the BACK) and `notchDrills` (the side).
 */
export const NOTCH_PARENT_KITS = Object.freeze(['KIT_BUD_FULL.lsp', 'KIT_WARDROBE_FULL.lsp', 'KIT_WUD_FULL.lsp', 'KIT_BUDTALL_FULL.lsp']);

/**
 * KIT_NOTCH.lsp section 1, THE WALL UNIT: a hanger cut-out (a pocket on the
 * hangers' cut-out layer, in a top corner of the BACK) that the notch's region
 * reaches STEPS IN along the width by nw, so the bracket hangs beside the
 * notch on the board that is there. Cut-outs the notch does not reach stay.
 * `fc` is the BACK's corner code; the region is nw wide and hh high from the
 * floor, or (D21, a y1 corner) hh down from the top.
 */
export function notchHangerCutouts(pockets, cutoutLayer, W, H, nw, hh, fc) {
  if (!cutoutLayer) return [];
  const left = notchFcX0(fc);
  const fromTop = !notchFcY0(fc);
  return (pockets || []).filter((k) => k.layer === cutoutLayer).map((k) => {
    const [rx0, rx1] = left ? [0, nw] : [W - nw, W];
    const reached = k.x1 < rx1 - EPS && k.x2 > rx0 + EPS && (fromTop ? k.y2 > H - hh + EPS : k.y1 < hh - EPS);
    if (!reached) return k;
    const dx = left ? nw : -nw;
    return { ...k, x1: roundTo(k.x1 + dx, 4), x2: roundTo(k.x2 + dx, 4) };
  });
}

/**
 * The notch a unit asks for, read once, or null. Missing numbers fall back to
 * `profile.notch.defaults` (T75 proposed, owner to confirm).
 */
export function notchOf(params, profile = {}) {
  const n = params?.notch;
  if (!n || typeof n !== 'object') return null;
  const K = notchProfile(profile);
  const pick = (v, key) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : notchP(K, key));
  return {
    corner: String(n.corner || '').toUpperCase(),
    w: pick(n.w, 'notch.defaults.width'),
    d: pick(n.d, 'notch.defaults.depth'),
    h: pick(n.h, 'notch.defaults.height'),
    // T79 F4 (KIT_NOTCH.lsp D21): a negative HEIGHT hangs it from the top.
    ...(Number(n.h) < 0 ? { anchor: 'top' } : {}),
    // 15.10.2026: a notch the ROOM derived (a chimney, a box; projectStore
    // obstacleNotchFor) says so, and what for; the hand's notch has neither.
    ...(n.auto ? { auto: true, for: String(n.for || '') } : {}),
  };
}

/**
 * Can this kit take a notch at all? null when it can, else the sentence.
 * T79 F5: `what` names the cut, 'an edge' for the edge notch (D22); one kit list.
 */
export function notchKitRefusal(type, what = 'a corner') {
  const c = type?.carcass || {};
  // The tall unit joined the parents on 15.10.2026 (the owner: *"wysokie
  // szafki i wiszace nie maja mozliwosci w kominie wciec"*); the Cargo shares
  // its LISP but its pull-out frame fills the carcass, so it is not one.
  const ok = NOTCH_PARENT_KITS.includes(type?.lisp)
    && c.top === 'panel' && c.back === 'full'
    && (c.sides ?? 'panel') === 'panel' && (c.bottom ?? 'panel') === 'panel'
    && !type?.corner && !type?.hardwareKit;
  if (ok) return null;
  // A kit's label may carry a long dash of its own; the sentence says it plain.
  const name = String(type?.label || type?.id || 'unit').replace(/\s*[\u2013\u2014]\s*/g, ', ');
  return `NOTCH: ${what} is cut from a base unit (KIT_BUD), a tall unit (KIT_BUDTALL), a wardrobe (KIT_WARDROBE) or a wall unit (KIT_WUD) carcass; `
    + `a ${name} is not one of them.`;
}

/** Does this kit take a notch? The UI asks before it offers CUT CORNER. */
export function notchApplies(type) { return notchKitRefusal(type) === null; }

/** The interior a panel's box takes, in the plan frame and from height z0 up to z1. */
function planOf(box, D) {
  return { rect: [box.x, D - (box.z + box.d), box.x + box.w, D - box.z], z0: box.y, z1: box.y + box.h };
}

const insideCarcass = (box, W, H, D) => box
  && box.x >= -EPS && box.x + box.w <= W + EPS
  && box.y >= -EPS && box.y + box.h <= H + EPS
  && box.z >= -EPS && box.z + box.d <= D + EPS;

const CUT_PARTS = new Set(['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'SHELF']);
/** D7: a hole of these kinds in the notch is a refusal, never a drop. */
const REFUSED_KINDS = { hinge: 'hinge', runner: 'runner', rail_bracket: 'rail bracket' };

/**
 * THE VERDICT, asked of the PARENT's own cut (the unit computed without its
 * notch): null when the notch can be cut, else { message, panel }. Room
 * refuses first: a refused notch cuts nothing and the parent is what is cut.
 */
export function notchVerdict({ parent, params, type, profile }) {
  const n = notchOf(params, profile);
  if (!n) return null;
  const say = (message, panel = null) => ({ message, panel });
  const kit = notchKitRefusal(type);
  if (kit) return say(kit);
  if (parent?.params?.slope_cut) {
    return say('NOTCH: a carcass cut under a slope cannot take a corner notch as well. Move it out of the slope first.');
  }
  const K = notchProfile(profile);
  const { width: W, height: H, depth: D, board_t: G } = parent.params;
  const geo = notchRefusal(W, D, H, G, n.w, n.d, n.h, n.corner, K);
  if (geo) return say(geo, notchSideName(n.corner));
  const hh = notchHh(H, n.h);
  const sideId = notchSideName(n.corner);
  const sideW = D - G;
  // D7: a hinge, a runner or a rail bracket the notch reaches is a REFUSAL,
  // never a drop: a door hung on fewer hinges than its ladder is a door that
  // falls. Asked in the side's own frame (BUR's runs from the back).
  const fc = notchSideFc(n.corner, sideId === 'BUR', notchFromTopP(H, n.h));
  for (const d of parent.drills || []) {
    const kind = REFUSED_KINDS[d.kind];
    if (!kind || d.panel !== sideId) continue;
    const rad = (Number(d.d) || 0) / 2;
    if (notchHoleInP(d.x, d.y, rad, sideW, H, n.d, hh, fc)) return say(notchHoleRefusal(kind, sideId), sideId);
  }
  // D8: anything else the parent puts in the carcass that crosses the keep-out.
  for (const p of parent.panels || []) {
    if (CUT_PARTS.has(p.part) || !insideCarcass(p.box, W, H, D)) continue;
    const { rect, z0, z1 } = planOf(p.box, D);
    if (notchCrossesP(W, D, H, G, n.w, n.d, n.h, n.corner, rect, z0, z1)) {
      return say(`NOTCH: ${p.id} stands where the notch and its box go. Move it, or cut another corner.`, p.id);
    }
  }
  const rails = [parent.assemblies?.rail, ...(parent.assemblies?.columnRails || [])].filter(Boolean);
  for (const r of rails) {
    const y = D - Number(r.z);
    if (notchCrossesP(W, D, H, G, n.w, n.d, n.h, n.corner, [r.x1, y - 1, r.x2, y + 1], Number(r.y) || 0, Number(r.y) || 0)) {
      return say('NOTCH: the hanging rail runs through the notch. Move the rail, or cut another corner.');
    }
  }
  // A shelf the notch would cut THROUGH is not a shelf with a notch in it.
  const wc = notchP(K, 'carcass.shelfWidthClearance');
  for (const p of parent.panels || []) {
    if (p.part !== 'SHELF' || !p.box) continue;
    const { rect } = planOf(p.box, D);
    if (!notchShelfCrossesP(p.box.y, G, H, n.h)) continue;
    const clr = p.meta?.variant === 'fixed' ? 0 : wc / 2;
    const cut = notchShelfCut(W, D, G, n.w, n.d, n.corner, clr, rect);
    if (cut && !notchRectReentrant(cut[3], cut[4], cut[1], cut[2], cut[0])) {
      return say(`NOTCH: ${p.id} would be cut right through. Move the shelf, or make the notch smaller.`, p.id);
    }
  }
  // The plinth loses nw at a front corner; one that runs on past this unit
  // (a run's toe kick) would have to be cut in the middle, which is not here.
  const pt = (pnl) => Number(pnl.box?.d) || G;
  for (const p of parent.panels || []) {
    if (p.part !== 'PLINTH' || !p.box) continue;
    const ext = notchPlinth(W, D, n.w, n.d, n.corner, notchP(K, 'autoParts.plinth.setback'), pt(p), notchFromTopP(H, n.h));
    if (ext[0] === 0 && ext[1] === W) continue;
    const runsOn = notchLeftP(n.corner) ? p.box.x < -EPS : p.box.x + p.box.w > W + EPS;
    if (runsOn) {
      return say(`NOTCH: the run's plinth ${p.id} runs past this front corner; a front notch needs the plinth to end at this unit.`, p.id);
    }
  }
  return null;
}

/** A refused notch: the PARENT's cut, and the sentence the Check prints (#28). */
export function withNotchRefusal(parent, verdict, params, profile) {
  const n = notchOf(params, profile);
  return {
    ...parent,
    warnings: [...(parent.warnings || []), {
      code: NOTCH_REFUSED,
      ...(verdict.panel ? { panel: verdict.panel } : {}),
      message: verdict.message,
    }],
    derived: { ...(parent.derived || {}), notch: { ...n, refused: verdict.message } },
  };
}

// ── outline helpers for the cut boards ────────────────────────────────────

/** tabPointsRight, by the mirror of tabPointsLeft (puzzle.js keeps it private). */
function tabPointsRightOf(edgeX, c, G, pz) {
  return tabPointsLeft(edgeX, c, G, pz).map(([x, y]) => [2 * edgeX - x, y]).reverse();
}

const near = (a, b) => Math.abs(a - b) < 1e-6;

/**
 * The outline with its tabs: an anticlockwise polygon, and on each listed
 * straight edge the tab profile the puzzle draws there, in walk order.
 *   runs: [{ edge: 'right'|'left'|'top'|'bottom', at, centres }]
 * Shared with the recess extension (engine/extension.js) since 15.10.2026, as
 * are tabBones, dogboneHole, polygonArea and shiftGeom below.
 */
export function outlineWithTabs(pts, runs, G, pz) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    out.push([p[0], p[1]]);
    for (const run of runs) {
      const vertical = run.edge === 'left' || run.edge === 'right';
      if (vertical ? !(near(p[0], run.at) && near(q[0], run.at)) : !(near(p[1], run.at) && near(q[1], run.at))) continue;
      const a = vertical ? p[1] : p[0];
      const b = vertical ? q[1] : q[0];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const cs = (run.centres || []).filter((c) => c > lo + EPS && c < hi - EPS).sort((u, v) => (b > a ? u - v : v - u));
      for (const c of cs) {
        if (run.edge === 'right') out.push(...tabPointsRightOf(run.at, c, G, pz));
        else if (run.edge === 'left') out.push(...tabPointsLeft(run.at, c, G, pz));
        else if (run.edge === 'top') out.push(...tabPointsUp(run.at, c, G, pz));
        else out.push(...tabPointsDown(run.at, c, G, pz));
      }
    }
  }
  return out;
}

/** The dog-bone relief pockets beside each tab (puzzle.js's own sizes). */
export function tabBones(runs, G, pz) {
  const bone = pz.dogboneHalfHeight;
  const out = [];
  for (const run of runs) {
    for (const c of run.centres || []) {
      if (run.edge === 'right') out.push({ layer: pz.layers.dogbone, x1: run.at, y1: c - bone, x2: run.at + G, y2: c + bone });
      else if (run.edge === 'left') out.push({ layer: pz.layers.dogbone, x1: run.at - G, y1: c - bone, x2: run.at, y2: c + bone });
      else if (run.edge === 'top') out.push({ layer: pz.layers.dogbone, x1: c - bone, y1: run.at, x2: c + bone, y2: run.at + G });
      else out.push({ layer: pz.layers.dogbone, x1: c - bone, y1: run.at - G, x2: c + bone, y2: run.at });
    }
  }
  return out;
}

/** The LISP's dog-bone circle as a hole the machine plunges (PUZZLE_DOG_BONES). */
export function dogboneHole(db, pz) {
  return db ? { layer: pz.layers.dogbone, kind: 'notch_dogbone', x: roundTo(db[0], 4), y: roundTo(db[1], 4), d: roundTo(2 * db[2], 4) } : null;
}

/** Area of a simple polygon, mm². */
export function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/**
 * Which corner of a w x h board a 6-point outline lacks, in that board's frame:
 * { fc, nw, nh } (nw along x, nh along y), or null for a plain rectangle. The
 * 3-D (`3d/panelSolid.js`) cuts this corner from the board it extrudes.
 */
export function notchCornerOfOutline(pts, w, h) {
  if (!Array.isArray(pts) || pts.length !== 6) return null;
  const onEdge = ([x, y]) => near(x, 0) || near(x, w) || near(y, 0) || near(y, h);
  const k = pts.find((p) => !onEdge(p));
  if (!k) return null;
  const has = (x, y) => pts.some((p) => near(p[0], x) && near(p[1], y));
  const corners = [['x0y0', 0, 0], ['x1y0', w, 0], ['x1y1', w, h], ['x0y1', 0, h]];
  const missing = corners.find(([, x, y]) => !has(x, y));
  if (!missing) return null;
  const [fc, cx, cy] = missing;
  return { fc, nw: roundTo(Math.abs(k[0] - cx), 4), nh: roundTo(Math.abs(k[1] - cy), 4) };
}

/**
 * THE 3-D'S HALF: a board's outline (as `socketFace.notchedOutline` makes it,
 * anticlockwise) with the notch corner `{ fc, nw, nh }` taken out of it.
 * Points inside the corner are dropped and the three corner points stand in
 * their place, so the extruded board is the board the sheet cuts.
 */
export function cutNotchCorner(outline, w, h, notch) {
  if (!notch || !Array.isArray(outline) || outline.length < 3) return outline;
  // 15.10.2026 (the recess extension, KIT_RECESS.lsp): a board may lack TWO
  // corners, the bump of a part-height band between them; `also` is the second.
  if (notch.also) return cutNotchCorner(cutNotchCorner(outline, w, h, { ...notch, also: null }), w, h, notch.also);
  const { fc } = notch;
  const nw = Number(notch.nw) || 0;
  const nh = Number(notch.nh) || 0;
  if (!(nw > 0 && nh > 0)) return outline;
  // T79 F8 (KIT_RECESS.lsp D13): a corner of a board `fw` deep that stands
  // `ox` into this one (a notched side grown into a recess: the notch's
  // corner is the old side's, not the grown board's). Absent: this board's own.
  const fw = Number(notch.fw) > 0 ? Number(notch.fw) : w;
  const ox = Number(notch.ox) || 0;
  const [rx0, rx1] = notchFcX0(fc) ? [ox, ox + nw] : [ox + fw - nw, ox + fw];
  const [ry0, ry1] = notchFcY0(fc) ? [0, nh] : [h - nh, h];
  const inside = ([x, y]) => x >= rx0 - EPS && x <= rx1 + EPS && y >= ry0 - EPS && y <= ry1 + EPS;
  const n = outline.length;
  const firstOut = outline.findIndex((p) => !inside(p));
  if (firstOut < 0) return outline;
  const walk = [];
  for (let k = 0; k < n; k += 1) walk.push(outline[(firstOut + k) % n]);
  const kept = [];
  let spliced = false;
  const corner = {
    x0y0: [[ox, nh], [ox + nw, nh], [ox + nw, 0]],
    x1y0: [[ox + fw - nw, 0], [ox + fw - nw, nh], [ox + fw, nh]],
    x1y1: [[ox + fw, h - nh], [ox + fw - nw, h - nh], [ox + fw - nw, h]],
    x0y1: [[ox + nw, h], [ox + nw, h - nh], [ox, h - nh]],
  }[fc];
  for (const p of walk) {
    if (inside(p)) {
      if (!spliced) { kept.push(...corner); spliced = true; }
      continue;
    }
    kept.push(p);
  }
  return spliced ? kept : outline;
}

/**
 * T79 F8 · the cache key of a `cnc.notch` (3d/panelSolid.js): every corner of
 * the `also` chain, with the frame a corner of a grown side stands in. A
 * corner with no frame and at most one `also` keys as it always did.
 */
export function notchCornerKey(notch) {
  if (!notch) return '';
  const frame = notch.fw != null || notch.ox ? `@${Number(notch.ox) || 0}/${notch.fw}` : '';
  const own = `${notch.fc}:${notch.nw}:${notch.nh}${frame}`;
  return notch.also ? `${own}+${notchCornerKey(notch.also)}` : own;
}

// ── PHASE A: after the carcass and the interior, before the drilling ──────

/**
 * Cut the boards. Mutates `panels` in place (as every pass of
 * `computeCabinet` does) and returns the record PHASE B needs; null when the
 * unit asks for no notch.
 *
 * Every board is cut in its ORIGINAL frame here, so the drilling pass that
 * follows (hinge plates, shelf pins, fix-shelf screws) sets out exactly as it
 * does on the parent; PHASE B then drops, re-plans and re-origins.
 */
export function notchCarcass({
  params, profile, panels, W, H, D, G, jointInset, codes, makePanel,
}) {
  const n = notchOf(params, profile);
  if (!n) return null;
  const pz = profile.puzzle;
  const K = notchProfile(profile);
  // 17.10.2026 (D9): the cutter radius no longer sets out a dog bone here; the
  // re-entrant corners get the CORNER_4MM mark, `leg` long each way.
  const leg = notchP(K, 'cnc.cornerMarkLeg');
  const { corner } = n;
  const nw = n.w;
  const nd = n.d;
  const nh = n.h;
  const left = notchLeftP(corner);
  const back = notchBackP(corner);
  const full = notchFullP(H, nh);
  // T79 F4 (KIT_NOTCH.lsp D21): a notch from the top, a negative HEIGHT.
  const top = notchFromTopP(H, nh);
  const hh = notchHh(H, nh);
  const boxed = notchBoxedP(nw, G);
  const sideW = D - G;
  const sideId = notchSideName(corner);
  const cut = {
    notch: n, corner, nw, nd, nh, hh, full, top, boxed, left, back, sideId, sideW,
    W, H, D, G,
    regions: {},
    reorigin: {},
    boards: [],
  };
  const byId = (id) => panels.find((p) => p.id === id);
  const stamp = (p, extra) => {
    p.meta = { ...(p.meta || {}), notch: { corner, w: nw, d: nd, h: nh, ...extra } };
  };

  // ── THE SIDE ──
  const side = byId(sideId);
  if (side) {
    const fc = notchSideFc(corner, !left, top);
    // Unboxed (D3) the side keeps every joint of the parent's and its drilling
    // with it; the rebate is the joiner's, on its outer face.
    if (boxed) cut.regions[sideId] = { fc, nw: nd, nh: hh, bw: sideW, bh: H };
    if (!boxed) {
      stamp(side, { rebate: notchSideRebate(D, H, G, nw, nd, nh, corner), manual: 'rebate' });
    } else if (full) {
      const run = sideW - nd;
      const geom = sidePanelGeometry({
        w: run, h: H, G, side: left ? 'L' : 'R', puzzle: pz,
        edges: back ? { backTabs: false } : undefined, jointInset,
      });
      // In the ORIGINAL frame: BUL runs from the front, BUR from the back.
      const off = (left ? !back : back) ? nd : 0;
      side.cnc = { ...side.cnc, ...shiftGeom(geom, off, 0) };
      side.w = roundTo(run, 4);
      side.area_m2 = areaM2(run, H);
      cut.reorigin[sideId] = { kind: 'side', dx: off, run };
      stamp(side, { cut: 'side', run: roundTo(run, 4) });
    } else {
      const sj = notchSideJoints(D, H, G, nw, nd, nh, corner, K);
      // The joints are measured from the FRONT; BUR's frame runs from the back.
      const fromFront = (xs) => (left ? xs : xs.map((x) => sideW - x));
      const outline = notchSide(D, H, G, nw, nd, nh, corner);
      const runs = [{
        edge: left ? 'right' : 'left', at: left ? sideW : 0, centres: sj['BACK-TABS'],
      }];
      const sockets = socketPanelGeometry({
        w: sideW, h: H, G, puzzle: pz,
        sockets: { top: fromFront(sj['TOP-SOCKETS']), bottom: fromFront(sj['BOTTOM-SOCKETS']) },
      });
      const S = notchScrewAxis(G);
      const screws = [
        ...fromFront(sj['TOP-SCREWS']).map((x) => ({ layer: pz.layers.screw, kind: 'screw', x, y: H - S, d: pz.screwDiameter })),
        ...fromFront(sj['BOTTOM-SCREWS']).map((x) => ({ layer: pz.layers.screw, kind: 'screw', x, y: S, d: pz.screwDiameter })),
      ];
      // 17.10.2026 (D9): the corner mark on the nominal outline, no dog bone.
      side.cnc = {
        ...side.cnc,
        outline: outlineWithTabs(outline, runs, G, pz),
        pockets: [...tabBones(runs, G, pz), ...sockets.pockets],
        holes: [...sockets.holes, ...screws],
        marks: [...(side.cnc?.marks || []), ...cornerMarkRecords(outline, leg, pz)],
        notch: notchCornerOfOutline(outline, sideW, H),
      };
      side.area_m2 = polygonArea(outline) / 1e6;
      stamp(side, { cut: 'side', outline: outline.map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]) });
    }
  }

  // ── THE TOP (full height, or D21 from the top) AND THE BOTTOM (unless from the top) ──
  if (boxed) {
    const plan = notchTopOutline(W, D, G, nw, nd, corner);
    const drawn = notchRot90Pts(plan, sideW);
    const tj = notchTopJoints(W, D, G, nw, nd, corner, K);
    const tw = W - 2 * G;
    const runs = [
      { edge: 'bottom', at: 0, centres: tj.LEFT.map((y) => sideW - y) },
      { edge: 'top', at: tw, centres: tj.RIGHT.map((y) => sideW - y) },
      { edge: 'left', at: 0, centres: tj.BACK },
    ];
    // 17.10.2026 (D9): the corner mark on the drawn nominal outline, no dog bone
    // (notchTopDogbone stays the record of where the circle stood).
    for (const id of full ? ['TOP', 'BOTTOM'] : [top ? 'TOP' : 'BOTTOM']) {
      const p = byId(id);
      if (!p || p.part !== id) continue;
      const corner6 = notchCornerOfOutline(drawn, sideW, tw);
      p.cnc = {
        ...p.cnc,
        outline: outlineWithTabs(drawn, runs, G, pz),
        pockets: tabBones(runs, G, pz),
        holes: [],
        marks: cornerMarkRecords(drawn, leg, pz),
        notch: corner6,
      };
      p.area_m2 = polygonArea(drawn) / 1e6;
      cut.regions[id] = { ...corner6, bw: sideW, bh: tw };
      stamp(p, { cut: 'plan', outline: plan.map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]) });
    }
  }

  // ── THE BACK (a back corner) ──
  const bk = back ? byId('BACK') : null;
  if (bk && bk.part === 'BACK') {
    const bj = notchBackJoints(W, H, G, nw, nh, corner, K);
    const outline = notchBack(W, H, nw, nh, corner);
    const leftEdge = left ? bj['NEAR-SOCKETS'] : bj['FAR-SOCKETS'];
    const rightEdge = left ? bj['FAR-SOCKETS'] : bj['NEAR-SOCKETS'];
    const sockets = socketPanelGeometry({
      w: W, h: H, G, puzzle: pz,
      sockets: { left: leftEdge, right: rightEdge, top: bj['TOP-SOCKETS'], bottom: bj['BOTTOM-SOCKETS'] },
      screws: bj.SCREWS.map(([x, y]) => ({ x, y })),
    });
    // A full-height notch takes the left (right) edge away: its sockets went
    // with NEAR-SOCKETS = none, so nothing stands on an edge that is not there.
    const fc = notchBackFc(corner, top);
    // D7: an UNBOXED back keeps the parent's rows, and a row the rebate cuts
    // away is dropped with the corner (it would be drilled into air).
    const holes = sockets.holes.filter((hl) => !(!boxed
      && notchHoleInP(hl.x, hl.y, (Number(hl.d) || 0) / 2, W, H, nw, hh, fc)));
    // THE WALL UNIT (KIT_NOTCH.lsp section 1, 15.10.2026): the hanger cut-outs
    // are the parent's pockets on the hangers' layer; one the notch reaches
    // steps in by nw, the other stays.
    const hangerCuts = notchHangerCutouts(bk.cnc?.pockets, profile.wallUnit?.hangers?.cutoutLayer, W, H, nw, hh, fc);
    // 17.10.2026 (D9): a part-height back's corner gets the mark, not the bone
    // (a full-height one is a shorter rectangle: no corner, no mark).
    bk.cnc = {
      ...bk.cnc,
      outline,
      pockets: [...sockets.pockets, ...hangerCuts],
      holes,
      marks: [...(bk.cnc?.marks || []), ...cornerMarkRecords(outline, leg, pz)],
      ...(full ? {} : { notch: notchCornerOfOutline(outline, W, H) }),
    };
    if (full) {
      cut.reorigin.BACK = { kind: 'back', dx: left ? nw : 0, run: W - nw };
      bk.w = roundTo(W - nw, 4);
      bk.area_m2 = areaM2(W - nw, H);
    } else {
      bk.area_m2 = polygonArea(outline) / 1e6;
    }
    cut.regions.BACK = { fc, nw, nh: hh, bw: W, bh: H };
    stamp(bk, { cut: 'back' });
  }

  // ── THE BOX: STEP, RETURN, LID (D1, D2) ──
  const places = notchBoxPlaces(W, D, H, G, nw, nd, nh, corner);
  if (places) {
    const boxOf = ([x0, y0, z0, x1, y1, z1]) => ({
      x: roundTo(x0, 4), y: roundTo(z0, 4), z: roundTo(D - y1, 4),
      w: roundTo(x1 - x0, 4), h: roundTo(z1 - z0, 4), d: roundTo(y1 - y0, 4),
    });
    const board = (id, part, w, h, place, screws, edged) => {
      const p = makePanel({
        id,
        part,
        role: 'notch_box',
        w,
        h,
        thickness: G,
        edgeCode: edged ? edged.code : codes.none,
        edgeLen: edged ? metres(edged.len) : 0,
        box: boxOf(place),
        cnc: { rotated: false, drawn_w: w, drawn_h: h, ...rectGeometry(w, h) },
        meta: {
          // Outline only, no puzzle joint, no machined hole (LISP section 2):
          // the box's fixing is the joiner's. 17.10.2026 (D10): on biscuits by
          // hand, a Lamello one day; no screw is stated or drilled for it
          // (`screws` below is [] from the three *Screws routines).
          readiness: 'geometry',
          fixing: 'manual',
          notch: {
            corner, w: nw, d: nd, h: nh, box: id, screws: (screws || []).map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]),
          },
        },
      });
      panels.push(p);
      cut.boards.push(id);
    };
    // A FRONT corner's RETURN and LID end at the carcass face, in the room:
    // their front edge is banded as a side's front edge is.
    const ret = notchReturn(H, G, nw, nd, nh, corner);
    board('RETURN', 'NOTCH-RETURN', ret[0], ret[1], places.RETURN,
      notchReturnScrews(H, G, nw, nd, nh, corner, K), back ? null : { code: codes.left, len: ret[1] });
    const step = notchStep(H, G, nw, nh, corner);
    if (step && places.STEP) board('STEP', 'NOTCH-STEP', step[0], step[1], places.STEP, notchStepScrews(H, G, nw, nh, corner, K), null);
    const lid = notchLid(H, G, nw, nd, nh);
    if (lid && places.LID) {
      board('LID', 'NOTCH-LID', lid[0], lid[1], places.LID,
        notchLidScrews(H, G, nw, nd, nh, corner, K), back ? null : { code: codes.right, len: lid[0] });
    }
    // D21: the FLOOR under a notch from the top, the LID's twin; no screw (D10).
    const floor = notchFloor(H, G, nw, nd, nh);
    if (floor && places.FLOOR) {
      board('FLOOR', 'NOTCH-FLOOR', floor[0], floor[1], places.FLOOR, null, back ? null : { code: codes.right, len: floor[0] });
    }
  }

  // ── SHELVES ──
  const wc = notchP(K, 'carcass.shelfWidthClearance');
  for (const p of panels) {
    if (p.part !== 'SHELF' || !p.box) continue;
    if (!notchShelfCrossesP(p.box.y, G, H, nh)) continue;
    const { rect } = planOf(p.box, D);
    const clr = p.meta?.variant === 'fixed' ? 0 : wc / 2;
    const sc = notchShelfCut(W, D, G, nw, nd, corner, clr, rect);
    if (!sc) continue;
    const plan = notchCutOutline(rect, sc);
    // The shelf is drawn `depth x width`, x from its FRONT edge: the plan's
    // (x from its left, y from its front) TRANSPOSED, which is a reflection, so
    // the walk is reversed to stay anticlockwise.
    const drawn = plan.map(([x, y]) => [y, x]).reverse();
    const dw = rect[3] - rect[1];
    const dh = rect[2] - rect[0];
    const corner6 = notchCornerOfOutline(drawn, dw, dh);
    // 17.10.2026 (D9): the corner mark on the drawn outline, no dog bone.
    p.cnc = {
      ...p.cnc,
      outline: drawn,
      marks: [...(p.cnc?.marks || []), ...cornerMarkRecords(drawn, leg, pz)],
      notch: corner6,
    };
    p.area_m2 = polygonArea(drawn) / 1e6;
    cut.regions[p.id] = { ...corner6, bw: dw, bh: dh };
    stamp(p, { cut: 'shelf', outline: plan.map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]) });
  }

  // ── THE PLINTH (a front corner deeper than its setback) ──
  for (const p of panels) {
    if (p.part !== 'PLINTH' || !p.box) continue;
    const pt = Number(p.box.d) || G;
    const ext = notchPlinth(W, D, nw, nd, corner, notchP(K, 'autoParts.plinth.setback'), pt, top);
    if (ext[0] === 0 && ext[1] === W) continue;
    const from = Math.max(p.box.x, ext[0]);
    const to = Math.min(p.box.x + p.box.w, ext[1]);
    if (!(to > from)) continue;
    const len = roundTo(to - from, 4);
    p.w = len;
    p.box = { ...p.box, x: roundTo(from, 4), w: len };
    p.cnc = { ...p.cnc, ...rectGeometry(len, p.h) };
    p.area_m2 = areaM2(len, p.h);
    p.edging = { ...p.edging, len_m: roundTo(metres(2 * len), 6) };
    stamp(p, { cut: 'plinth', lost: roundTo(nw, 4) });
  }
  return cut;
}

export function shiftGeom(geom, dx, dy) {
  return {
    outline: (geom.outline || []).map(([x, y]) => [x + dx, y + dy]),
    pockets: (geom.pockets || []).map((pk) => ({
      ...pk, x1: pk.x1 + dx, x2: pk.x2 + dx, y1: pk.y1 + dy, y2: pk.y2 + dy,
      ...(Array.isArray(pk.pts) ? { pts: pk.pts.map(([x, y]) => [x + dx, y + dy]) } : {}),
    })),
    holes: (geom.holes || []).map((h) => ({ ...h, x: h.x + dx, y: h.y + dy })),
  };
}

// ── PHASE B: after the drilling ───────────────────────────────────────────

/** D7's three answers for a drill the notch reaches. Own holes are the cut's own. */
const OWN_KINDS = new Set(['puzzle', 'screw', 'notch_dogbone']);

/**
 * Drop the drilling the notch cut away, re-plan the shelf-pin column nearest
 * it, then re-origin the boards the notch made SHORTER (a full-height side, a
 * full-height back) so their frame starts at their own edge. Legs standing in
 * the notch step out of it. Mutates `drills`, `panels` and `legs` in place.
 */
export function notchDrills({ cut, panels, drills, legs }) {
  if (!cut) return;
  const { regions } = cut;
  // T79 F8: a region may stand `ox`, `oy` into the board (the recess
  // extension re-states it there when it cuts the same board; KIT_RECESS.lsp D13).
  const inRegion = (rg, x, y, rad = 0) => rg
    && notchHoleInP(x - (Number(rg.ox) || 0), y - (Number(rg.oy) || 0), rad, rg.bw, rg.bh, rg.nw, rg.nh, rg.fc);
  const keep = [];
  const dropped = [];
  for (const d of drills) {
    const rg = regions[d.panel];
    if (!rg || OWN_KINDS.has(d.kind)) { keep.push(d); continue; }
    const rad = (Number(d.d) || 0) / 2;
    if (!inRegion(rg, d.x, d.y, rad)) { keep.push(d); continue; }
    if ((d.kind === 'shelf' || d.kind === 'hanger') && d.panel === cut.sideId && cut.boxed) {
      // D7: the column nearest the notch is re-planned on the shortened run,
      // the parent's own setback from the NEW end: it steps off the notch by nd.
      // THE WALL UNIT (15.10.2026): its hanger holes, measured off the back
      // edge, step forward with that edge the same way, never dropped.
      const away = notchFcX0(rg.fc) ? cut.nd : -cut.nd;
      keep.push({ ...d, x: roundTo(d.x + away, 4) });
      continue;
    }
    dropped.push(d);
  }
  drills.length = 0;
  drills.push(...keep);
  // Marks (a fix shelf's biscuit set) the notch cut away go with it.
  for (const p of panels) {
    const rg = regions[p.id];
    if (!rg || !Array.isArray(p.cnc?.marks)) continue;
    p.cnc.marks = p.cnc.marks.filter((m) => !markPoints(m).some((q) => inRegion(rg, q?.[0], q?.[1])));
  }
  // Re-origin the shortened boards.
  for (const [id, ro] of Object.entries(cut.reorigin)) {
    const p = panels.find((x) => x.id === id);
    if (!p) continue;
    const g = shiftGeom(p.cnc, -ro.dx, 0);
    p.cnc = {
      ...p.cnc, ...g, drawn_w: roundTo(ro.run, 4),
      ...(Array.isArray(p.cnc.marks) ? { marks: p.cnc.marks.map((m) => shiftMark(m, -ro.dx, 0)) } : {}),
    };
    for (const d of drills) if (d.panel === id) d.x = roundTo(d.x - ro.dx, 4);
    if (ro.kind === 'side') {
      // BUL's x runs from the front, BUR's from the back; either way the box
      // loses nd at the notch's end of the depth.
      const z = cut.back ? p.box.z + cut.nd : p.box.z;
      p.box = { ...p.box, z: roundTo(z, 4), d: roundTo(ro.run, 4) };
    } else {
      p.box = { ...p.box, x: roundTo(p.box.x + ro.dx, 4), w: roundTo(ro.run, 4) };
    }
  }
  // Legs standing in the obstacle's footprint step out of it, along the depth.
  // D21: a notch from the top has no footprint on the floor; the legs stay.
  if (legs && Array.isArray(legs.positions) && cut.boxed && !cut.top) {
    const lw = Number(legs.width) || 0;
    const [fx0, fx1] = cut.left ? [0, cut.nw] : [cut.W - cut.nw, cut.W];
    const [fz0, fz1] = cut.back ? [0, cut.nd] : [cut.D - cut.nd, cut.D];
    legs.positions = legs.positions.map((pos) => {
      const hit = pos.x < fx1 && pos.x + lw > fx0 && pos.z < fz1 && pos.z + lw > fz0;
      if (!hit) return pos;
      const z = cut.back ? pos.z + cut.nd + cut.G : pos.z - cut.nd - cut.G;
      return { ...pos, z: roundTo(z, 4), notch: true };
    });
  }
  cut.dropped = dropped.length;
}

/** What the result publishes about the notch (`derived.notch`). */
export function notchSummary(cut) {
  if (!cut) return null;
  return {
    corner: cut.corner,
    w: cut.nw,
    d: cut.nd,
    h: cut.nh,
    full: cut.full,
    boxed: cut.boxed,
    boards: [...cut.boards],
    dropped: cut.dropped || 0,
    ...(cut.top ? { anchor: 'top' } : {}),
    ...(cut.notch?.auto ? { auto: true, for: cut.notch.for } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Z2. THE ENGINE CUTS THE EDGE NOTCH (KIT_NOTCH.lsp D22)
// ═══════════════════════════════════════════════════════════════════════════
//
// T79 F5, section Z's twin for the edge notch: what the unit asks for, the
// verdict asked of the parent's own cut, and the two passes either side of
// the drilling pass, run AFTER the corner notch's own (so a board both reach
// is cut by both, section H2's compound outline and met runs). A unit with no
// `params.edgeNotch` never reaches a line of it (the gate `edgeNotch`).

/**
 * The edge notch a unit asks for, read once, or null. Missing numbers fall
 * back to `profile.notch.edgeDefaults` (T79 proposed, owner to confirm).
 */
export function edgeNotchOf(params, profile = {}) {
  const n = params?.edgeNotch;
  if (!n || typeof n !== 'object') return null;
  const K = notchProfile(profile);
  const pick = (v, key) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : notchP(K, key));
  return {
    edge: String(n.edge || '').toUpperCase(),
    d: pick(n.d, 'notch.edgeDefaults.depth'),
    h: pick(n.h, 'notch.edgeDefaults.height'),
  };
}

/** The boards the edge notch cuts (D8 asks everything else). */
const EDGE_CUT_PARTS = new Set(['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']);
/** D7 for the edge notch: these on either side are a refusal; a hanger cannot be fixed to air either. */
const EDGE_REFUSED_KINDS = {
  hinge: 'hinge', runner: 'runner', rail_bracket: 'rail bracket', hanger: 'hanger',
};

/** How far the corner notch moved a side's frame (a full-height boxed corner re-origins its side). */
function cornerSideShift(n, sideId, H, G) {
  if (!n || notchSideName(n.corner) !== sideId || !notchBoxedP(n.w, G) || !notchFullP(H, n.h)) return 0;
  const left = notchLeftP(n.corner);
  const back = notchBackP(n.corner);
  return (left ? !back : back) ? n.d : 0;
}

/**
 * THE VERDICT, asked of the PARENT's own cut (the unit computed without its
 * edge notch, the corner notch included): null when the edge notch can be
 * cut, else { message, panel }. Room refuses first: a refused edge notch cuts
 * nothing and the parent is what is cut.
 */
export function edgeNotchVerdict({
  parent, params, type, profile,
}) {
  const e = edgeNotchOf(params, profile);
  if (!e) return null;
  const say = (message, panel = null) => ({ message, panel });
  const kit = notchKitRefusal(type, 'an edge');
  if (kit) return say(kit);
  if (parent?.params?.slope_cut) {
    return say('NOTCH: a carcass cut under a slope cannot take an edge notch as well. Move it out of the slope first.');
  }
  if (params?.extension) {
    return say('NOTCH: a carcass grown into a recess cannot take an edge notch as well. Move it out of the recess first.');
  }
  const K = notchProfile(profile);
  const { width: W, height: H, depth: D, board_t: G } = parent.params;
  const geo = edgeNotchRefusal(W, D, H, G, e.d, e.h, e.edge, K);
  if (geo) return say(geo);
  // COEXISTENCE (D22): a corner notch the parent carries, cut and not refused.
  const n = parent?.derived?.notch && !parent.derived.notch.refused ? notchOf(params, profile) : null;
  if (n) {
    const meets = edgeNotchMeetsRefusal(W, D, H, G, e.d, e.h, e.edge, n.w, n.d, n.h, n.corner, K);
    if (meets) return say(meets, notchSideName(n.corner));
  }
  // D7, on EITHER side, each in its own frame (BUR's from the back).
  const sideW = D - G;
  for (const [sideId, bur] of [['BUL', false], ['BUR', true]]) {
    const fc = edgeNotchSideFc(e.edge, bur);
    const dx = cornerSideShift(n, sideId, H, G);
    for (const d of parent.drills || []) {
      const kind = EDGE_REFUSED_KINDS[d.kind];
      if (!kind || d.panel !== sideId) continue;
      const rad = (Number(d.d) || 0) / 2;
      if (notchHoleInP(d.x + dx, d.y, rad, sideW, H, e.d, e.h, fc)) return say(edgeNotchHoleRefusal(kind, sideId), sideId);
    }
  }
  // ...and THE WALL UNIT's hanger cut-outs in the BACK the cut takes.
  const cutoutLayer = profile?.wallUnit?.hangers?.cutoutLayer;
  const bk = (parent.panels || []).find((p) => p.id === 'BACK');
  if (edgeNotchBackP(e.edge) && cutoutLayer && bk) {
    const [z0, z1] = edgeNotchTopP(e.edge) ? [H - e.h, H] : [0, e.h];
    if ((bk.cnc?.pockets || []).some((k) => k.layer === cutoutLayer && k.y2 > z0 + EPS && k.y1 < z1 - EPS)) {
      return say('NOTCH: the hanger cut-out of the BACK falls in the edge notch, and a hanger cannot be fixed to air.'
        + ' Make the notch smaller, or cut another edge.', 'BACK');
    }
  }
  // D8: anything else the parent puts in the carcass that crosses the keep-out
  // (a shelf too: the rebate would take a whole strip of it).
  for (const p of parent.panels || []) {
    if (EDGE_CUT_PARTS.has(p.part) || !insideCarcass(p.box, W, H, D)) continue;
    const { rect, z0, z1 } = planOf(p.box, D);
    if (edgeNotchCrossesP(W, D, H, G, e.d, e.h, e.edge, rect, z0, z1)) {
      return say(`NOTCH: ${p.id} stands where the edge notch goes. Move it, or make the notch smaller.`, p.id);
    }
  }
  const rails = [parent.assemblies?.rail, ...(parent.assemblies?.columnRails || [])].filter(Boolean);
  for (const r of rails) {
    const y = D - Number(r.z);
    const z = Number(r.y) || 0;
    if (edgeNotchCrossesP(W, D, H, G, e.d, e.h, e.edge, [r.x1, y - 1, r.x2, y + 1], z, z)) {
      return say('NOTCH: the hanging rail runs through the edge notch. Move the rail, or make the notch smaller.');
    }
  }
  return null;
}

/** A refused edge notch: the PARENT's cut, and the sentence the Check prints (#28). */
export function withEdgeNotchRefusal(parent, verdict, params, profile) {
  const e = edgeNotchOf(params, profile);
  return {
    ...parent,
    warnings: [...(parent.warnings || []), {
      code: NOTCH_REFUSED,
      ...(verdict.panel ? { panel: verdict.panel } : {}),
      message: verdict.message,
    }],
    derived: { ...(parent.derived || {}), edgeNotch: { ...e, refused: verdict.message } },
  };
}

/** The missing corners for the 3-D (`cnc.notch`, a second one as `also`), each named on the board's final rectangle. */
function cornerRecordOf(corners) {
  const recs = corners.map(([fc, w, h]) => ({ fc, nw: roundTo(w, 4), nh: roundTo(h, 4) }));
  if (!recs.length) return null;
  return recs.length === 1 ? recs[0] : { ...recs[0], also: recs[1] };
}

const r4pts = (pts) => pts.map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]);

// ── PHASE A: after the corner notch's own, before the drilling ────────────

/**
 * Cut the boards the edge reaches: BUL and BUR (the L corner), the TOP or the
 * BOTTOM (a strip), the BACK at a back edge (a strip). Mutates `panels` in
 * place and returns the record PHASE B needs; null when the unit asks for no
 * edge notch. `cornerCut` is the corner notch's own record (notchCarcass),
 * already cut: a board both reach is cut by both, in its ORIGINAL frame, so
 * the drilling pass sets out as on the parent.
 */
export function edgeNotchCarcass({
  params, profile, panels, W, H, D, G, cornerCut = null,
}) {
  const e = edgeNotchOf(params, profile);
  if (!e) return null;
  const pz = profile.puzzle;
  const K = notchProfile(profile);
  const leg = notchP(K, 'cnc.cornerMarkLeg');
  const markLayer = pz?.layers?.cornerMark || 'CORNER_4MM';
  const { edge } = e;
  const ed = e.d;
  const eh = e.h;
  const back = edgeNotchBackP(edge);
  const top = edgeNotchTopP(edge);
  const sideW = D - G;
  const tw = W - 2 * G;
  const nc = cornerCut?.notch ? cornerCut : null;
  const n = nc ? nc.notch : null;
  const cut = {
    edge, ed, eh, back, top, W, H, D, G, sideW,
    regions: {},
    reorigin: {},
    cornerReorigin: nc?.reorigin || {},
    boards: [],
    withCorner: Boolean(nc),
  };
  const byId = (id) => panels.find((p) => p.id === id);
  const stamp = (p, extra) => {
    p.meta = { ...(p.meta || {}), edgeNotch: { edge, d: ed, h: eh, ...extra } };
  };
  // A board both notches reach carries the corner's mark already: it is read
  // again off the compound outline, with the edge's.
  const keptMarks = (p) => (p.cnc?.marks || []).filter((m) => m.layer !== markLayer);

  // ── THE SIDES, BOTH ──
  for (const [sideId, bur] of [['BUL', false], ['BUR', true]]) {
    const side = byId(sideId);
    if (!side || side.part !== sideId) continue;
    const efc = edgeNotchSideFc(edge, bur);
    const ecut = [efc, ed, eh];
    const here = nc && nc.sideId === sideId;
    const ccut = here && nc.boxed ? [notchSideFc(n.corner, bur, nc.top), nc.nd, nc.hh] : null;
    const cuts = ccut ? [ccut, ecut] : [ecut];
    const outline = ccut ? edgeNotchLessTwo(sideW, H, ccut, ecut) : notchRectOutline(sideW, H, ed, eh, efc);
    const runs = here
      ? edgeNotchRunsMeet(notchSideRuns(D, H, G, n.w, n.d, n.h, n.corner), edgeNotchSideRuns(D, H, G, ed, eh, edge))
      : edgeNotchSideRuns(D, H, G, ed, eh, edge);
    const sj = edgeNotchPlanSide(runs, D, K);
    // The joints are measured from the FRONT; BUR's frame runs from the back.
    const fromFront = (xs) => (bur ? xs.map((x) => sideW - x) : xs);
    const tabRuns = [{ edge: bur ? 'left' : 'right', at: bur ? 0 : sideW, centres: sj['BACK-TABS'] }];
    const sockets = socketPanelGeometry({
      w: sideW, h: H, G, puzzle: pz,
      sockets: { top: fromFront(sj['TOP-SOCKETS']), bottom: fromFront(sj['BOTTOM-SOCKETS']) },
    });
    const S = notchScrewAxis(G);
    const screws = [
      ...fromFront(sj['TOP-SCREWS']).map((x) => ({ layer: pz.layers.screw, kind: 'screw', x, y: H - S, d: pz.screwDiameter })),
      ...fromFront(sj['BOTTOM-SCREWS']).map((x) => ({ layer: pz.layers.screw, kind: 'screw', x, y: S, d: pz.screwDiameter })),
    ];
    side.cnc = {
      ...side.cnc,
      outline: outlineWithTabs(outline, tabRuns, G, pz),
      pockets: [...tabBones(tabRuns, G, pz), ...sockets.pockets],
      holes: [...sockets.holes, ...screws],
      marks: [...keptMarks(side), ...cornerMarkRecords(outline, leg, pz)],
      notch: cornerRecordOf(edgeNotchCorners(sideW, H, cuts, edgeNotchShrink(sideW, H, cuts))),
    };
    side.area_m2 = polygonArea(outline) / 1e6;
    cut.regions[sideId] = { fc: efc, nw: ed, nh: eh, bw: sideW, bh: H };
    cut.boards.push(sideId);
    stamp(side, { cut: 'side', outline: r4pts(outline) });
  }

  // ── THE TOP (a top edge) OR THE BOTTOM (a bottom edge): a strip off its depth ──
  const hz = edgeNotchBoard(edge);
  const tb = byId(hz);
  if (tb && tb.part === hz) {
    const ecut = edgeNotchTopCut(W, D, G, ed, edge);
    const here = nc && nc.boxed && notchCutsBoardP(H, n.h, hz);
    const pc = here ? notchTopCut(W, D, G, n.w, n.d, n.corner) : null;
    const ccut = pc ? [pc[0], pc[1], pc[2]] : null;
    const cuts = ccut ? [ccut, ecut] : [ecut];
    const plan = ccut ? edgeNotchLessTwo(tw, sideW, ccut, ecut) : notchRectOutline(tw, sideW, ecut[1], ecut[2], ecut[0]);
    const runs = here
      ? edgeNotchRunsMeet(notchTopRuns(W, D, G, n.w, n.d, n.corner), edgeNotchTopRuns(W, D, G, ed, edge))
      : edgeNotchTopRuns(W, D, G, ed, edge);
    const tj = edgeNotchPlanTop(runs, D, K);
    // drawTOP_ROT90's frame, x' from the BACK edge (notchRot90Pts), in its ORIGINAL frame.
    const drawn = notchRot90Pts(plan, sideW);
    const tabRuns = [
      { edge: 'bottom', at: 0, centres: tj.LEFT.map((y) => sideW - y) },
      { edge: 'top', at: tw, centres: tj.RIGHT.map((y) => sideW - y) },
      { edge: 'left', at: 0, centres: tj.BACK },
    ];
    // A plan corner named on the plan rectangle, renamed into the drawn frame:
    // plan y1 (the back) is drawn x0, plan x0 (BUL's side) is drawn y0.
    const corners = edgeNotchCorners(tw, sideW, cuts, edgeNotchShrink(tw, sideW, cuts))
      .map(([fc, w, h]) => [`${notchFcY0(fc) ? 'x1' : 'x0'}${notchFcX0(fc) ? 'y0' : 'y1'}`, h, w]);
    tb.cnc = {
      ...tb.cnc,
      outline: outlineWithTabs(drawn, tabRuns, G, pz),
      pockets: tabBones(tabRuns, G, pz),
      holes: [],
      marks: [...keptMarks(tb), ...cornerMarkRecords(drawn, leg, pz)],
      notch: cornerRecordOf(corners),
    };
    tb.h = roundTo(sideW - ed, 4);
    tb.area_m2 = polygonArea(plan) / 1e6;
    cut.regions[hz] = { fc: back ? 'x0y0' : 'x1y0', nw: ed, nh: tw, bw: sideW, bh: tw };
    cut.reorigin[hz] = { axis: 'x', dx: back ? ed : 0, dy: 0, run: sideW - ed };
    cut.boards.push(hz);
    stamp(tb, { cut: 'plan', outline: r4pts(plan) });
  }

  // ── THE BACK (a back edge): a strip off its height ──
  const bk = back ? byId('BACK') : null;
  if (bk && bk.part === 'BACK') {
    const ecut = edgeNotchBackCut(W, eh, edge);
    const ccut = nc && nc.back ? [notchBackFc(n.corner, nc.top), nc.nw, nc.hh] : null;
    const cuts = ccut ? [ccut, ecut] : [ecut];
    const outline = ccut ? edgeNotchLessTwo(W, H, ccut, ecut) : notchRectOutline(W, H, ecut[1], ecut[2], ecut[0]);
    const runs = nc
      ? edgeNotchRunsMeet(notchBackRuns(W, H, G, n.w, n.h, n.corner), edgeNotchBackRuns(W, H, G, eh, edge))
      : edgeNotchBackRuns(W, H, G, eh, edge);
    const bj = edgeNotchPlanBack(runs, W, H, G, K);
    const sockets = socketPanelGeometry({
      w: W, h: H, G, puzzle: pz,
      sockets: {
        left: bj['LEFT-SOCKETS'], right: bj['RIGHT-SOCKETS'], top: bj['TOP-SOCKETS'], bottom: bj['BOTTOM-SOCKETS'],
      },
      screws: bj.SCREWS.map(([x, y]) => ({ x, y })),
    });
    // D7: beside a rebate (an unboxed corner notch) the rows its corner took are
    // dropped with it, as notchCarcass drops them.
    const holes = sockets.holes.filter((hl) => !(ccut && !nc.boxed
      && notchHoleInP(hl.x, hl.y, (Number(hl.d) || 0) / 2, W, H, nc.nw, nc.hh, ccut[0])));
    // THE WALL UNIT: its hanger cut-outs stay (one the cut reaches is refused).
    const cutoutLayer = profile.wallUnit?.hangers?.cutoutLayer;
    const hangerCuts = (bk.cnc?.pockets || []).filter((k) => cutoutLayer && k.layer === cutoutLayer);
    bk.cnc = {
      ...bk.cnc,
      outline,
      pockets: [...sockets.pockets, ...hangerCuts],
      holes,
      marks: [...keptMarks(bk), ...cornerMarkRecords(outline, leg, pz)],
      notch: cornerRecordOf(edgeNotchCorners(W, H, cuts, edgeNotchShrink(W, H, cuts))),
    };
    bk.h = roundTo(H - eh, 4);
    bk.area_m2 = polygonArea(outline) / 1e6;
    cut.regions.BACK = { fc: ecut[0], nw: W, nh: eh, bw: W, bh: H };
    cut.reorigin.BACK = { axis: 'y', dx: 0, dy: top ? 0 : eh, run: H - eh };
    cut.boards.push('BACK');
    stamp(bk, { cut: 'back' });
  }
  return cut;
}

// ── PHASE B: after the drilling, and after the corner notch's own ────────

/**
 * Drop the drilling the edge cut away (D7: a shelf-pin hole steps away from
 * it by ed instead), drop the marks in it, re-origin the boards it made
 * SHORTER (the TOP / BOTTOM at a back edge, the BACK at the bottom) so their
 * frame starts at their own edge, and step the legs out of a bottom edge's
 * footprint. A side the corner notch re-origined first is read back into its
 * original frame by that shift. Mutates `drills`, `panels` and `legs`.
 */
export function edgeNotchDrills({
  cut, panels, drills, legs,
}) {
  if (!cut) return;
  const { regions } = cut;
  const inRegion = (rg, x, y, rad = 0) => rg && notchHoleInP(x, y, rad, rg.bw, rg.bh, rg.nw, rg.nh, rg.fc);
  const shiftOf = (id) => Number(cut.cornerReorigin?.[id]?.dx) || 0;
  const keep = [];
  const dropped = [];
  for (const d of drills) {
    const rg = regions[d.panel];
    if (!rg || OWN_KINDS.has(d.kind)) { keep.push(d); continue; }
    const rad = (Number(d.d) || 0) / 2;
    if (!inRegion(rg, d.x + shiftOf(d.panel), d.y, rad)) { keep.push(d); continue; }
    if (d.kind === 'shelf' && (d.panel === 'BUL' || d.panel === 'BUR')) {
      keep.push({ ...d, x: roundTo(d.x + (notchFcX0(rg.fc) ? cut.ed : -cut.ed), 4) });
      continue;
    }
    dropped.push(d);
  }
  drills.length = 0;
  drills.push(...keep);
  for (const p of panels) {
    const rg = regions[p.id];
    if (!rg || !Array.isArray(p.cnc?.marks)) continue;
    const ox = shiftOf(p.id);
    p.cnc.marks = p.cnc.marks.filter((m) => !markPoints(m).some((q) => inRegion(rg, (Number(q?.[0]) || 0) + ox, q?.[1])));
  }
  for (const [id, ro] of Object.entries(cut.reorigin)) {
    const p = panels.find((x) => x.id === id);
    if (!p) continue;
    if (ro.dx || ro.dy) {
      p.cnc = {
        ...p.cnc,
        ...shiftGeom(p.cnc, -ro.dx, -ro.dy),
        ...(Array.isArray(p.cnc.marks) ? { marks: p.cnc.marks.map((m) => shiftMark(m, -ro.dx, -ro.dy)) } : {}),
      };
      for (const d of drills) {
        if (d.panel !== id) continue;
        d.x = roundTo(d.x - ro.dx, 4);
        d.y = roundTo(d.y - ro.dy, 4);
      }
    }
    if (ro.axis === 'x') {
      // The TOP / BOTTOM: its box loses ed at the cut's end of the depth (box z runs from the back).
      p.cnc = { ...p.cnc, drawn_w: roundTo(ro.run, 4) };
      p.box = { ...p.box, z: roundTo(p.box.z + (cut.back ? cut.ed : 0), 4), d: roundTo(ro.run, 4) };
    } else {
      p.cnc = { ...p.cnc, drawn_h: roundTo(ro.run, 4) };
      p.box = { ...p.box, y: roundTo(p.box.y + ro.dy, 4), h: roundTo(ro.run, 4) };
    }
  }
  // Legs standing in a bottom edge's footprint step out of it, along the depth.
  if (legs && Array.isArray(legs.positions) && !cut.top) {
    const lw = Number(legs.width) || 0;
    const [fz0, fz1] = cut.back ? [0, cut.ed] : [cut.D - cut.ed, cut.D];
    legs.positions = legs.positions.map((pos) => {
      if (!(pos.z < fz1 && pos.z + lw > fz0)) return pos;
      const z = cut.back ? pos.z + cut.ed + cut.G : pos.z - cut.ed - cut.G;
      return { ...pos, z: roundTo(z, 4), edgeNotch: true };
    });
  }
  cut.dropped = dropped.length;
}

/** What the result publishes about the edge notch (`derived.edgeNotch`). */
export function edgeNotchSummary(cut) {
  if (!cut) return null;
  return {
    edge: cut.edge,
    d: cut.ed,
    h: cut.eh,
    cut: [...cut.boards],
    dropped: cut.dropped || 0,
    ...(cut.withCorner ? { withCorner: true } : {}),
  };
}
