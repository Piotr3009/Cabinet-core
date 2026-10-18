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
 * notch-side edge is planned on the run UNDER it, 0 .. ch - |nh|.
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
  const nearX = left ? nw + S : cw - nw - S;
  const upX = left ? S : cw - S;
  const scr = [];
  for (const y of notchRowsBetweenTabs(0, ch, farTabs, sfe)) scr.push([farX, y]);
  // 17.10.2026 (KIT_NOTCH.lsp D10): NO screw between the BACK and the box. The
  // owner: *"nie bedziemy tam wkrecac wkretow, system wkrety dookola plecow w
  // tym przypadku nie zadziala"*. A full-height back notch's notched edge
  // meets the RETURN only and gets no row (it was the nearX column over the
  // whole height); beside a part-height notch the run (notchScrewRow(hh) at
  // nearX) is gone and the side's own back edge above it keeps its rows.
  // D21: under a notch from the top the side's own back edge keeps its rows.
  if (!back || !boxed) {
    for (const y of notchRowsBetweenTabs(0, ch, farTabs, sfe)) scr.push([upX, y]);
  } else if (top) {
    for (const y of notchRowsBetweenTabs(0, ch - hh, nearTabs, sfe)) scr.push([upX, y]);
  } else if (!full) {
    for (const y of notchRowsBetweenTabs(nh, ch, nearTabs, sfe)) scr.push([upX, y]);
  }
  void nearX;
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

/** Can this kit take a notch at all? null when it can, else the sentence. */
export function notchKitRefusal(type) {
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
  return `NOTCH: a corner is cut from a base unit (KIT_BUD), a tall unit (KIT_BUDTALL), a wardrobe (KIT_WARDROBE) or a wall unit (KIT_WUD) carcass; `
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
  const [rx0, rx1] = notchFcX0(fc) ? [0, nw] : [w - nw, w];
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
    x0y0: [[0, nh], [nw, nh], [nw, 0]],
    x1y0: [[w - nw, 0], [w - nw, nh], [w, nh]],
    x1y1: [[w, h - nh], [w - nw, h - nh], [w - nw, h]],
    x0y1: [[nw, h], [nw, h - nh], [0, h - nh]],
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
  const inRegion = (rg, x, y, rad = 0) => rg && notchHoleInP(x, y, rad, rg.bw, rg.bh, rg.nw, rg.nh, rg.fc);
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
