/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── THE RECESS EXTENSION, THE ENGINE'S MIRROR OF KIT_RECESS.lsp ────────────
//
// The owner, 15.10.2026 (the evening):
//
//   *"czy reces nie moze dzialac jak komin, czyli front zawsze trzyma sie
//   linii a jak wpada do reces to wtedy sie wydluza szafka?"*  and his answers
//   to the mockup: 2 tak (the front holds the line), 3 glebszy karkas (wholly
//   inside: a deeper carcass), 4 dowolny (the band is any), 5 glebsze (the
//   shelves in the band grow).
//
// ...and 9.10.2026: *"lisp najpierw"*. `reference/lisp/KIT_RECESS.lsp` was
// written and paren-balanced BEFORE this file existed, and this file mirrors
// it routine for routine: sections B to E below carry the LISP's own names in
// camelCase (`recess-back-pieces` is `recessBackPieces`), the same arguments
// in the same order, and the same answers; `test/recess-extension-1510.test.js`
// holds them to the LISP's NUMBERS block (section F) board by board. The
// LISP's decisions D1 to D14 are its own and are not repeated here.
//
// Section Z is the part the LISP leaves to the engine: it CUTS the boards the
// routines describe, through the puzzle's own functions and the notch's own
// helpers, in two passes either side of `computeCabinet`'s drilling pass, in
// the notch's own place. A unit with no `params.extension` never reaches a
// line of it, so every golden is byte-identical by construction.
//
// Where the extension comes from: the ROOM, never the hand (projectStore
// recessExtensionFor, derived every time, stored never). A cabinet WHOLLY in a
// recess is a deeper cabinet (D2, projectStore settleRecesses) and never
// reaches this file.
//
// Pure: numbers in, numbers or records out. No store, no React, no three.js.

import { sidePanelGeometry, socketPanelGeometry, rectGeometry } from './puzzle.js';
import { roundTo } from './format.js';
import {
  notchProfile, notchP, notchJointInset, notchReplanSockets, notchReplanTabs, notchShift,
  notchMinJointEdge, notchScrewAxis, notchScrewRow, notchRowBetween, notchRowsBetweenTabs,
  notchRectOutline, notchDogbone, notchRot90Pts, notchCutterRadius, notchCornerOfOutline,
  notchKitRefusal, outlineWithTabs, tabBones, dogboneHole, polygonArea, shiftGeom,
} from './notch.js';

const EPS = 1e-6;

/** The layer the BACK's window is cut on (D9): a through pocket. */
export const RECESS_WINDOW_LAYER = 'RECESS_WINDOW';

// ═══════════════════════════════════════════════════════════════════════════
// B. THE BAND
// ═══════════════════════════════════════════════════════════════════════════

export function recessLeftP(ex0) { return ex0 <= 0; }
export function recessRightP(ex1, cw) { return ex1 >= cw; }
export function recessFloorP(ez0) { return ez0 <= 0; }
export function recessTopP(ez1, ch) { return ez1 >= ch; }

/** All four edges reached: the whole carcass is in the band. D2, not this file. */
export function recessFullP(cw, ch, ex0, ex1, ez0, ez1) {
  return recessLeftP(ex0) && recessRightP(ex1, cw) && recessFloorP(ez0) && recessTopP(ez1, ch);
}

/** The interior across: a RETURN's or a grown side's inner face. */
export function recessIx0(ex0, g) { return ex0 + g; }
export function recessIx1(ex1, g) { return ex1 - g; }

/** The vertical boards' and bumps' run, up. */
export function recessBz0(ez0, g) { return recessFloorP(ez0) ? 0 : ez0 + g; }
export function recessBz1(ez1, ch, g) { return recessTopP(ez1, ch) ? ch : ez1 - g; }

/** THE WINDOW the BACK loses: [wx0, wz0, wx1, wz1], BACK frame. */
export function recessWindow(cw, ch, g, ex0, ex1, ez0, ez1) {
  return [
    recessLeftP(ex0) ? 0 : recessIx0(ex0, g),
    recessBz0(ez0, g),
    recessRightP(ex1, cw) ? cw : recessIx1(ex1, g),
    recessBz1(ez1, ch, g),
  ];
}

/** D4: is there an extension to cut at all? null, or the sentence. */
export function recessInteriorRefusal(cw, ch, g, ex0, ex1, ez0, ez1, ed, K) {
  const minI = notchP(K, 'notch.minInterior');
  if (recessFullP(cw, ch, ex0, ex1, ez0, ez1)) {
    return 'RECESS: the whole carcass stands in the recess; it is a deeper carcass (its depth), not an extension.';
  }
  if (recessIx1(ex1, g) - recessIx0(ex0, g) < minI) {
    return 'RECESS: the extension would be narrower inside than the minimum interior; the cabinet stands on the wall line.';
  }
  if (recessBz1(ez1, ch, g) - recessBz0(ez0, g) < minI) {
    return 'RECESS: the extension would be lower inside than the minimum interior; the cabinet stands on the wall line.';
  }
  if (ed < 2 * g) return 'RECESS: the recess is too shallow to hold an extension\'s back and a return.';
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// C. ONE OUTLINE LAW: A RECTANGLE WITH A BUMP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * recess-bump-outline: a bw x bh board (x right, y up) with a BUMP on its TOP
 * edge over x = b0 .. b1, rising to bh + ext. Anticlockwise, once round.
 */
export function recessBumpOutline(bw, bh, b0, b1, ext) {
  const out = [[0, 0], [bw, 0]];
  if (b1 < bw) out.push([bw, bh], [b1, bh]);
  out.push([b1, bh + ext], [b0, bh + ext]);
  if (b0 > 0) out.push([b0, bh], [0, bh]);
  return out;
}

/** recess-bump-reentrants: [[[px, py], [dx, dy]], ...] into the waste. */
export function recessBumpReentrants(bw, bh, b0, b1) {
  const out = [];
  if (b0 > 0) out.push([[b0, bh], [-1, 1]]);
  if (b1 < bw) out.push([[b1, bh], [1, 1]]);
  return out;
}

/** recess-bump-dogbones: [cx, cy, r] each, the notch's own law. */
export function recessBumpDogbones(bw, bh, b0, b1, r) {
  const k = r / Math.sqrt(2);
  return recessBumpReentrants(bw, bh, b0, b1).map(([[px, py], [dx, dy]]) => [px + dx * k, py + dy * k, r]);
}

/** (x y) -> (y x), the walk reversed to stay anticlockwise. */
export function recessTranspose(pts) { return pts.map(([x, y]) => [y, x]).reverse(); }
/** x -> w - x, the walk reversed. */
export function recessMirrorX(pts, w) { return pts.map(([x, y]) => [w - x, y]).reverse(); }

const transposeCircles = (cs) => cs.map(([x, y, r]) => [y, x, r]);
const mirrorCirclesX = (cs, w) => cs.map(([x, y, r]) => [w - x, y, r]);

/** recess-run-sockets: none on a run under the D6 minimum (D7), else the re-plan, shifted. */
export function recessRunSockets(len, off, e, below, minEdge) {
  return len < minEdge ? [] : notchShift(notchReplanSockets(len, e, below), off);
}

/** recess-run-tabs: the same for the tabs down a straight run. */
export function recessRunTabs(len, off, e, one, three, minEdge) {
  return len < minEdge ? [] : notchShift(notchReplanTabs(len, e, one, three), off);
}

// ═══════════════════════════════════════════════════════════════════════════
// D. BOARD BY BOARD
// ═══════════════════════════════════════════════════════════════════════════

// ── TOP and BOTTOM: (cw - 2g) x (cd - g), plan frame of the board ──────────

/** recess-plan-bump: [bw, bh, b0, b1, ext] of the board's bump. */
export function recessPlanBump(cw, cd, g, ex0, ex1, ed) {
  return [cw - 2 * g, cd - g, recessIx0(ex0, g) - g, recessIx1(ex1, g) - g, ed];
}

export function recessTopOutline(cw, cd, g, ex0, ex1, ed) {
  return recessBumpOutline(...recessPlanBump(cw, cd, g, ex0, ex1, ed));
}

export function recessTopDogbones(cw, cd, g, ex0, ex1, ed, r) {
  const [bw, bh, b0, b1] = recessPlanBump(cw, cd, g, ex0, ex1, ed);
  return recessBumpDogbones(bw, bh, b0, b1, r);
}

/** recess-top-joints: { LEFT: [y..], RIGHT: [y..], BACK: [x..] } in the board's own plan frame. */
export function recessTopJoints(cw, cd, g, ex0, ex1, ed, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const inset = notchJointInset(cd, e, notchP(K, 'puzzle.singleJointMaxDepth'));
  const minEdge = notchMinJointEdge(notchP(K, 'puzzle.dogboneHalfHeight'), g);
  const sideW = cd - g;
  const LEFT = notchReplanSockets(recessLeftP(ex0) ? sideW + ed : sideW, inset, below);
  const RIGHT = notchReplanSockets(recessRightP(ex1, cw) ? sideW + ed : sideW, inset, below);
  const BACK = [
    ...(recessLeftP(ex0) ? [] : recessRunSockets(ex0, 0, e, below, minEdge)),
    ...(recessRightP(ex1, cw) ? [] : recessRunSockets(cw - ex1, recessIx1(ex1, g) - g, e, below, minEdge)),
  ];
  return { LEFT, RIGHT, BACK };
}

// ── THE SIDE that grows: (cd - g) x ch, BUL's frame; BUR's is the mirror ──

/** recess-side-bump: [bw, bh, b0, b1, ext] in the TRANSPOSED frame (u = z up the edge, v = x). */
export function recessSideBump(cd, ch, g, ez0, ez1, ed) {
  return [ch, cd - g, recessBz0(ez0, g), recessBz1(ez1, ch, g), ed];
}

export function recessSideOutline(cd, ch, g, ez0, ez1, ed, bur) {
  const pts = recessTranspose(recessBumpOutline(...recessSideBump(cd, ch, g, ez0, ez1, ed)));
  return bur ? recessMirrorX(pts, cd - g + ed) : pts;
}

export function recessSideDogbones(cd, ch, g, ez0, ez1, ed, r, bur) {
  const [bw, bh, b0, b1] = recessSideBump(cd, ch, g, ez0, ez1, ed);
  const cs = transposeCircles(recessBumpDogbones(bw, bh, b0, b1, r));
  return bur ? mirrorCirclesX(cs, cd - g + ed) : cs;
}

/** recess-side-joints: every joint MEASURED FROM THE SIDE'S FRONT EDGE. */
export function recessSideJoints(cd, ch, g, ez0, ez1, ed, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const inset = notchJointInset(cd, e, notchP(K, 'puzzle.singleJointMaxDepth'));
  const one = notchP(K, 'puzzle.singleTabAtOrBelow');
  const three = notchP(K, 'puzzle.middleTabBelow');
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const pin = notchP(K, 'shelfHoles.columnFromEdge');
  const minEdge = notchMinJointEdge(notchP(K, 'puzzle.dogboneHalfHeight'), g);
  const sideW = cd - g;
  const bz0 = recessBz0(ez0, g);
  const bz1 = recessBz1(ez1, ch, g);
  const topRun = recessTopP(ez1, ch) ? sideW + ed : sideW;
  const botRun = recessFloorP(ez0) ? sideW + ed : sideW;
  return {
    'TOP-SOCKETS': notchReplanSockets(topRun, inset, below),
    'BOTTOM-SOCKETS': notchReplanSockets(botRun, inset, below),
    'TOP-SCREWS': notchScrewRow(topRun, sfe),
    'BOTTOM-SCREWS': notchScrewRow(botRun, sfe),
    'BACK-TABS': [
      ...recessRunTabs(bz0, 0, e, one, three, minEdge),
      ...recessRunTabs(ch - bz1, bz1, e, one, three, minEdge),
    ],
    'PIN-COLUMNS': [pin, sideW - pin],
  };
}

// ── THE BACK: cw x ch, x from the LEFT face, z up ─────────────────────────

/** recess-back-pieces: the rectangles [x0, z0, x1, z1] the window leaves, one or two. */
export function recessBackPieces(cw, ch, g, ex0, ex1, ez0, ez1) {
  const [wx0, wz0, wx1, wz1] = recessWindow(cw, ch, g, ex0, ex1, ez0, ez1);
  const L = wx0 <= 0;
  const R = wx1 >= cw;
  const F = wz0 <= 0;
  const U = wz1 >= ch;
  if (L && R && F && U) return [];
  if (L && R && F) return [[0, wz1, cw, ch]];
  if (L && R && U) return [[0, 0, cw, wz0]];
  if (F && U && L) return [[wx1, 0, cw, ch]];
  if (F && U && R) return [[0, 0, wx0, ch]];
  if (L && R) return [[0, 0, cw, wz0], [0, wz1, cw, ch]];
  if (F && U) return [[0, 0, wx0, ch], [wx1, 0, cw, ch]];
  return [[0, 0, cw, ch]];
}

/** recess-back-cut: the window where it crosses a piece, in the piece's own frame, or null. */
export function recessBackCut(piece, window) {
  const x0 = Math.max(piece[0], window[0]);
  const z0 = Math.max(piece[1], window[1]);
  const x1 = Math.min(piece[2], window[2]);
  const z1 = Math.min(piece[3], window[3]);
  if (!(x1 > x0 && z1 > z0)) return null;
  return [x0 - piece[0], z0 - piece[1], x1 - piece[0], z1 - piece[1]];
}

/** recess-cut-edges: which edges of a bw x bh piece a cut touches. */
export function recessCutEdges(cut, bw, bh) {
  const out = [];
  if (cut[0] <= 0) out.push('left');
  if (cut[2] >= bw) out.push('right');
  if (cut[1] <= 0) out.push('bottom');
  if (cut[3] >= bh) out.push('top');
  return out;
}

/** recess-cut-kind (D9): 'window' | 'bite' | 'corner'. */
export function recessCutKind(cut, bw, bh) {
  const n = recessCutEdges(cut, bw, bh).length;
  return n === 0 ? 'window' : (n === 1 ? 'bite' : 'corner');
}

const cornerFc = (edges) => `${edges.includes('left') ? 'x0' : 'x1'}${edges.includes('bottom') ? 'y0' : 'y1'}`;

/** recess-bite-outline: a bw x bh board less a rectangle touching ONE edge; two legs stand either side of it. */
export function recessBiteOutline(bw, bh, x0, z0, x1, z1, edge) {
  if (edge === 'bottom') return [[0, 0], [x0, 0], [x0, z1], [x1, z1], [x1, 0], [bw, 0], [bw, bh], [0, bh]];
  if (edge === 'top') return [[0, 0], [bw, 0], [bw, bh], [x1, bh], [x1, z0], [x0, z0], [x0, bh], [0, bh]];
  if (edge === 'left') return [[0, 0], [bw, 0], [bw, bh], [0, bh], [0, z1], [x1, z1], [x1, z0], [0, z0]];
  return [[0, 0], [bw, 0], [bw, z0], [x0, z0], [x0, z1], [bw, z1], [bw, bh], [0, bh]];
}

/** recess-bite-dogbones: its two, r / sqrt 2 into the waste along each re-entrant corner's diagonal. */
export function recessBiteDogbones(x0, z0, x1, z1, edge, r) {
  const k = r / Math.sqrt(2);
  if (edge === 'bottom') return [[x0 + k, z1 - k, r], [x1 - k, z1 - k, r]];
  if (edge === 'top') return [[x0 + k, z0 + k, r], [x1 - k, z0 + k, r]];
  if (edge === 'left') return [[x1 - k, z0 + k, r], [x1 - k, z1 - k, r]];
  return [[x0 + k, z0 + k, r], [x0 + k, z1 - k, r]];
}

/** recess-back-outline: the piece's outline with its cut taken out, in the piece's frame. */
export function recessBackOutline(piece, cut) {
  const bw = piece[2] - piece[0];
  const bh = piece[3] - piece[1];
  const plain = [[0, 0], [bw, 0], [bw, bh], [0, bh]];
  if (!cut) return plain;
  const edges = recessCutEdges(cut, bw, bh);
  const kind = recessCutKind(cut, bw, bh);
  const [x0, z0, x1, z1] = cut;
  if (kind === 'window') return plain;
  if (kind === 'bite') return recessBiteOutline(bw, bh, x0, z0, x1, z1, edges[0]);
  return notchRectOutline(bw, bh, x1 - x0, z1 - z0, cornerFc(edges));
}

/** recess-back-dogbones: none for a window, the bite's two, the notch's one for a corner. */
export function recessBackDogbones(piece, cut, r) {
  if (!cut) return [];
  const bw = piece[2] - piece[0];
  const bh = piece[3] - piece[1];
  const edges = recessCutEdges(cut, bw, bh);
  const kind = recessCutKind(cut, bw, bh);
  const [x0, z0, x1, z1] = cut;
  if (kind === 'window') return [];
  if (kind === 'bite') return recessBiteDogbones(x0, z0, x1, z1, edges[0], r);
  const db = notchDogbone(bw, bh, x1 - x0, z1 - z0, cornerFc(edges), r);
  return db ? [db] : [];
}

/** recess-run-row: drawBACK's row along a run a .. b of a board's back edge. */
export function recessRunRow(a, b, e) {
  return b > a ? notchShift(notchScrewRow(b - a, e), a) : [];
}

/**
 * recess-back-joints: a piece's sockets and rows in the piece's OWN frame.
 *   { LEFT, RIGHT, TOP, BOTTOM: [..], SCREWS: [[x, z], ..] }
 * `topTabs` / `botTabs` in carcass x, `bulTabs` / `burTabs` in z.
 */
export function recessBackJoints(piece, window, cw, ch, g, ex0, ex1, ez0, ez1, topTabs, botTabs, bulTabs, burTabs, K) {
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const S = notchScrewAxis(g);
  const [x0, z0, x1, z1] = piece;
  const bw = x1 - x0;
  const bh = z1 - z0;
  const [wx0, wz0, wx1, wz1] = window;
  const bz0 = recessBz0(ez0, g);
  const bz1 = recessBz1(ez1, ch, g);
  const ix0 = recessIx0(ex0, g);
  const ix1 = recessIx1(ex1, g);
  const inZ = (zs) => (zs || []).filter((z) => z >= z0 + EPS && z <= z1 - EPS).map((z) => z - z0);
  const inX = (xs) => (xs || []).filter((x) => x >= x0 + EPS && x <= x1 - EPS).map((x) => x - x0);
  const LEFT = x0 <= 0 ? inZ(bulTabs) : [];
  const RIGHT = x1 >= cw ? inZ(burTabs) : [];
  const TOP = z1 >= ch ? inX(topTabs) : [];
  const BOTTOM = z0 <= 0 ? inX(botTabs) : [];
  const scr = [];
  if (x0 <= 0) for (const z of notchRowsBetweenTabs(0, bh, LEFT, sfe)) scr.push([S, z]);
  if (x1 >= cw) for (const z of notchRowsBetweenTabs(0, bh, RIGHT, sfe)) scr.push([bw - S, z]);
  const runs = (grown) => (grown
    ? [
      ...(recessLeftP(ex0) ? [] : [[g, ix0]]),
      ...(recessRightP(ex1, cw) ? [] : [[ix1, cw - g]]),
    ]
    : [[g, cw - g]]);
  if (z1 >= ch) {
    for (const [a, b] of runs(recessTopP(ez1, ch))) {
      for (const x of recessRunRow(Math.max(a, x0), Math.min(b, x1), sfe)) scr.push([x - x0, bh - S]);
    }
  }
  if (z0 <= 0) {
    for (const [a, b] of runs(recessFloorP(ez0))) {
      for (const x of recessRunRow(Math.max(a, x0), Math.min(b, x1), sfe)) scr.push([x - x0, S]);
    }
  }
  const inPieceX = (x) => x > x0 - EPS && x < x1 + EPS;
  const inPieceZ = (z) => z > z0 - EPS && z < z1 + EPS;
  const column = (x) => {
    for (const z of notchShift(notchScrewRow(bz1 - bz0, sfe), bz0)) if (z >= z0 && z <= z1) scr.push([x - x0, z - z0]);
  };
  const row = (z) => {
    for (const x of notchShift(notchScrewRow(wx1 - wx0, sfe), wx0)) if (x >= x0 && x <= x1) scr.push([x - x0, z - z0]);
  };
  if (!recessLeftP(ex0) && inPieceX(wx0 - S)) column(wx0 - S);
  if (!recessRightP(ex1, cw) && inPieceX(wx1 + S)) column(wx1 + S);
  if (!recessFloorP(ez0) && inPieceZ(wz0 - S)) row(wz0 - S);
  if (!recessTopP(ez1, ch) && inPieceZ(wz1 + S)) row(wz1 + S);
  return { LEFT, RIGHT, TOP, BOTTOM, SCREWS: scr };
}

// ── THE ADDED BOARDS: RETURN-L, RETURN-R, FLOOR, LID, EXT-BACK ─────────────

/** recess-box-places: { name: [x0, y0, z0, x1, y1, z1] } in the carcass frame (y from the FRONT). */
export function recessBoxPlaces(cw, cd, ch, g, ex0, ex1, ez0, ez1, ed) {
  const bz0 = recessBz0(ez0, g);
  const bz1 = recessBz1(ez1, ch, g);
  const out = {};
  if (!recessLeftP(ex0)) out['RETURN-L'] = [ex0, cd, bz0, ex0 + g, cd + ed - g, bz1];
  if (!recessRightP(ex1, cw)) out['RETURN-R'] = [ex1 - g, cd, bz0, ex1, cd + ed - g, bz1];
  if (!recessFloorP(ez0)) out.FLOOR = [ex0, cd, ez0, ex1, cd + ed - g, ez0 + g];
  if (!recessTopP(ez1, ch)) out.LID = [ex0, cd, ez1 - g, ex1, cd + ed - g, ez1];
  out['EXT-BACK'] = [ex0, cd + ed - g, ez0, ex1, cd + ed, ez1];
  return out;
}

/** recess-return: [ed - g, bz1 - bz0]. */
export function recessReturn(ch, g, ez0, ez1, ed) {
  return [ed - g, recessBz1(ez1, ch, g) - recessBz0(ez0, g)];
}

/** recess-return-screws: x along the depth from its FRONT end, z up. */
export function recessReturnScrews(ch, g, ez0, ez1, ed, K) {
  const S = notchScrewAxis(g);
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const ret = recessReturn(ch, g, ez0, ez1, ed);
  const out = [];
  for (const x of notchScrewRow(ret[0], sfe)) {
    if (recessFloorP(ez0)) out.push([x, S]);
    if (recessTopP(ez1, ch)) out.push([x, ret[1] - S]);
  }
  return out;
}

/** recess-lid: the FLOOR and the LID, [ex1 - ex0, ed - g]. */
export function recessLid(g, ex0, ex1, ed) { return [ex1 - ex0, ed - g]; }

/** recess-lid-screws: x from the left end, y along the depth from the FRONT edge. */
export function recessLidScrews(g, ex0, ex1, ed, K) {
  const S = notchScrewAxis(g);
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const lid = recessLid(g, ex0, ex1, ed);
  const out = [];
  for (const y of notchScrewRow(lid[1], sfe)) { out.push([S, y]); out.push([lid[0] - S, y]); }
  return out;
}

/** recess-ext-back: [ex1 - ex0, ez1 - ez0]. */
export function recessExtBack(ex0, ex1, ez0, ez1) { return [ex1 - ex0, ez1 - ez0]; }

/** recess-ext-back-screws: x from its left end, z up from its bottom end. */
export function recessExtBackScrews(cw, ch, g, ex0, ex1, ez0, ez1, K) {
  const S = notchScrewAxis(g);
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const eb = recessExtBack(ex0, ex1, ez0, ez1);
  const bz0 = recessBz0(ez0, g);
  const bz1 = recessBz1(ez1, ch, g);
  const out = [];
  for (const z of notchShift(notchScrewRow(bz1 - bz0, sfe), bz0 - ez0)) { out.push([S, z]); out.push([eb[0] - S, z]); }
  for (const x of notchRowBetween(0, eb[0], g, sfe)) { out.push([x, S]); out.push([x, eb[1] - S]); }
  return out;
}

// ── SHELVES ───────────────────────────────────────────────────────────────

/** recess-shelf-in-p: is this shelf (its underside at zs) in the band's interior? */
export function recessShelfInP(zs, g, ch, ez0, ez1) {
  return zs >= recessBz0(ez0, g) - EPS && zs + g <= recessBz1(ez1, ch, g) + EPS;
}

/** recess-shelf-bump: [bw, bh, b0, b1, ext] in the SHELF's plan frame; `shelf` its parent plan rectangle. */
export function recessShelfBump(cw, cd, g, ex0, ex1, ed, shelf, K) {
  const wc = notchP(K, 'carcass.shelfWidthClearance');
  return [
    shelf[2] - shelf[0], shelf[3] - shelf[1],
    recessIx0(ex0, g) + wc / 2 - shelf[0],
    recessIx1(ex1, g) - wc / 2 - shelf[0],
    ed,
  ];
}

export function recessShelfOutline(cw, cd, g, ex0, ex1, ed, shelf, K) {
  return recessBumpOutline(...recessShelfBump(cw, cd, g, ex0, ex1, ed, shelf, K));
}

export function recessShelfDogbones(cw, cd, g, ex0, ex1, ed, shelf, K, r) {
  const [bw, bh, b0, b1] = recessShelfBump(cw, cd, g, ex0, ex1, ed, shelf, K);
  return recessBumpDogbones(bw, bh, b0, b1, r);
}

// ═══════════════════════════════════════════════════════════════════════════
// E. THE REFUSALS
// ═══════════════════════════════════════════════════════════════════════════

export function recessRefusal(cw, cd, ch, g, ex0, ex1, ez0, ez1, ed, notched, K) {
  if (notched) return 'RECESS: a carcass notched round an obstacle cannot grow into a recess as well; the notch stands.';
  if (ex0 < 0 || ex1 > cw || ez0 < 0 || ez1 > ch || ex0 >= ex1 || ez0 >= ez1) return 'RECESS: the band lies outside the carcass.';
  if (!recessLeftP(ex0) && ex0 < g) return 'RECESS: a RETURN cannot stand inside the side; the band starts at least a board in.';
  if (!recessRightP(ex1, cw) && ex1 > cw - g) return 'RECESS: a RETURN cannot stand inside the side; the band ends at least a board in.';
  if (!recessFloorP(ez0) && ez0 < g) return 'RECESS: the FLOOR cannot lie inside the BOTTOM; the band starts at least a board up.';
  if (!recessTopP(ez1, ch) && ez1 > ch - g) return 'RECESS: the LID cannot lie inside the TOP; the band ends at least a board down.';
  return recessInteriorRefusal(cw, ch, g, ex0, ex1, ez0, ez1, ed, K);
}

// ═══════════════════════════════════════════════════════════════════════════
// Z. THE ENGINE CUTS WHAT THE ROUTINES DESCRIBE
// ═══════════════════════════════════════════════════════════════════════════

/** The warning code every refusal carries (the Check reads it). */
export const EXTENSION_REFUSED = 'EXTENSION_REFUSED';

/** The extension a unit asks for, read once, or null. */
export function extensionOf(params) {
  const e = params?.extension;
  if (!e || typeof e !== 'object') return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : NaN);
  const out = { x0: n(e.x0), x1: n(e.x1), z0: n(e.z0), z1: n(e.z1), d: n(e.d) };
  if (Object.values(out).some((v) => Number.isNaN(v))) return null;
  return { ...out, for: String(e.for || 'a recess in this wall') };
}

/** The interior a panel's box takes, in the plan frame. */
function planOf(box, D) {
  return { rect: [box.x, D - (box.z + box.d), box.x + box.w, D - box.z], z0: box.y };
}

/**
 * THE VERDICT, asked of the PARENT's own cut (the unit computed without its
 * extension): null when it can be cut, else { message, panel }.
 */
export function extensionVerdict({ parent, params, type, profile }) {
  const ext = extensionOf(params);
  if (!ext) return null;
  const say = (message, panel = null) => ({ message, panel });
  const kit = notchKitRefusal(type);
  if (kit) return say(kit.replace(/^NOTCH: a corner is cut from/, 'RECESS: an extension grows from'));
  if (parent?.params?.slope_cut) return say('RECESS: a carcass cut under a slope cannot grow into a recess as well.');
  const K = notchProfile(profile);
  const { width: W, height: H, depth: D, board_t: G } = parent.params;
  const geo = recessRefusal(W, D, H, G, ext.x0, ext.x1, ext.z0, ext.z1, ext.d, Boolean(params?.notch), K);
  if (geo) return say(geo);
  // D14: a wall unit's hanger cut-out the window reaches steps in beside it
  // (as the notch's does); one that has nowhere left to go is a refusal.
  const cutoutLayer = profile.wallUnit?.hangers?.cutoutLayer;
  const bk = (parent.panels || []).find((p) => p.id === 'BACK');
  if (cutoutLayer && bk?.cnc?.pockets) {
    const window = recessWindow(W, H, G, ext.x0, ext.x1, ext.z0, ext.z1);
    for (const k of bk.cnc.pockets) {
      if (k.layer !== cutoutLayer) continue;
      if (!hangerCutoutStepped(k, window, W)) {
        return say('RECESS: a hanger cut-out falls in the window into the recess and has nowhere to step to; the bracket cannot hang on air.', 'BACK');
      }
    }
  }
  return null;
}

const overlaps = (k, [wx0, wz0, wx1, wz1]) => k.x1 < wx1 - EPS && k.x2 > wx0 + EPS && k.y1 < wz1 - EPS && k.y2 > wz0 + EPS;

/**
 * KIT_RECESS.lsp D14 (the notch's hanger law carried over): a wall unit's
 * hanger cut-out the window reaches STEPS IN along the width to the window's
 * far edge, on the board that is there; one the window does not reach stays.
 * Returns the cut-out as kept (moved or not), or null when it cannot be kept.
 */
export function hangerCutoutStepped(k, window, W) {
  if (!overlaps(k, window)) return k;
  const [wx0, , wx1] = window;
  const width = k.x2 - k.x1;
  const atLeft = k.x1 <= EPS;
  const moved = atLeft
    ? { ...k, x1: roundTo(wx1, 4), x2: roundTo(wx1 + width, 4) }
    : { ...k, x1: roundTo(wx0 - width, 4), x2: roundTo(wx0, 4) };
  if (moved.x1 < -EPS || moved.x2 > W + EPS || overlaps(moved, window)) return null;
  return moved;
}

/** A refused extension: the PARENT's cut, and the sentence the Check prints. */
export function withExtensionRefusal(parent, verdict, params) {
  const ext = extensionOf(params);
  return {
    ...parent,
    warnings: [...(parent.warnings || []), {
      code: EXTENSION_REFUSED,
      ...(verdict.panel ? { panel: verdict.panel } : {}),
      message: verdict.message,
    }],
    derived: { ...(parent.derived || {}), extension: { ...ext, refused: verdict.message } },
  };
}

/**
 * THE 3-D'S HALF of a BITE: a board's outline (anticlockwise, in its drawn
 * frame) with a rectangle touching ONE edge taken out of it. The edge's own
 * segment is split and the bite's three inner points stand in the gap.
 */
export function cutEdgeBite(outline, w, h, bite) {
  if (!bite || !Array.isArray(outline) || outline.length < 3) return outline;
  const [x0, y0, x1, y1] = [bite.x0, bite.y0, bite.x1, bite.y1].map(Number);
  if (!(x1 > x0 && y1 > y0)) return outline;
  const near = (a, b) => Math.abs(a - b) < EPS;
  const edge = near(y0, 0) ? 'bottom' : (near(y1, h) ? 'top' : (near(x0, 0) ? 'left' : (near(x1, w) ? 'right' : null)));
  if (!edge) return outline;
  const out = [];
  const n = outline.length;
  for (let i = 0; i < n; i += 1) {
    const p = outline[i];
    const q = outline[(i + 1) % n];
    out.push(p);
    if (edge === 'bottom' && near(p[1], 0) && near(q[1], 0) && Math.min(p[0], q[0]) <= x0 + EPS && Math.max(p[0], q[0]) >= x1 - EPS) {
      const fwd = q[0] > p[0];
      out.push(...(fwd ? [[x0, 0], [x0, y1], [x1, y1], [x1, 0]] : [[x1, 0], [x1, y1], [x0, y1], [x0, 0]]));
    } else if (edge === 'top' && near(p[1], h) && near(q[1], h) && Math.min(p[0], q[0]) <= x0 + EPS && Math.max(p[0], q[0]) >= x1 - EPS) {
      const fwd = q[0] > p[0];
      out.push(...(fwd ? [[x0, h], [x0, y0], [x1, y0], [x1, h]] : [[x1, h], [x1, y0], [x0, y0], [x0, h]]));
    } else if (edge === 'left' && near(p[0], 0) && near(q[0], 0) && Math.min(p[1], q[1]) <= y0 + EPS && Math.max(p[1], q[1]) >= y1 - EPS) {
      const fwd = q[1] > p[1];
      out.push(...(fwd ? [[0, y0], [x1, y0], [x1, y1], [0, y1]] : [[0, y1], [x1, y1], [x1, y0], [0, y0]]));
    } else if (edge === 'right' && near(p[0], w) && near(q[0], w) && Math.min(p[1], q[1]) <= y0 + EPS && Math.max(p[1], q[1]) >= y1 - EPS) {
      const fwd = q[1] > p[1];
      out.push(...(fwd ? [[w, y0], [x0, y0], [x0, y1], [w, y1]] : [[w, y1], [x0, y1], [x0, y0], [w, y0]]));
    }
  }
  return out;
}

/** The side's missing corners for the 3-D (`cnc.notch`, with `also`), in its FINAL drawn frame. */
function sideCorners(ch, bz0, bz1, ed, bur) {
  const corners = [];
  if (bz0 > 0) corners.push({ fc: bur ? 'x0y0' : 'x1y0', nw: roundTo(ed, 4), nh: roundTo(bz0, 4) });
  if (bz1 < ch) corners.push({ fc: bur ? 'x0y1' : 'x1y1', nw: roundTo(ed, 4), nh: roundTo(ch - bz1, 4) });
  if (!corners.length) return null;
  return corners.length === 1 ? corners[0] : { ...corners[0], also: corners[1] };
}

const r4pts = (pts) => pts.map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]);

// ── PHASE A: after the carcass and the interior, before the drilling ──────

/**
 * Cut the boards. Mutates `panels` in place and returns the record PHASE B
 * needs; null when the unit asks for no extension. As the notch does, every
 * board that keeps its frame is cut in it, and BUR (whose frame runs from the
 * BACK) is cut in its ORIGINAL frame with the bump at negative x, so the
 * drilling pass sets out as on the parent; PHASE B then re-origins it.
 */
export function extensionCarcass({
  params, profile, panels, W, H, D, G, jointInset, codes, makePanel,
}) {
  const ext = extensionOf(params);
  if (!ext) return null;
  const pz = profile.puzzle;
  const K = notchProfile(profile);
  const r = notchCutterRadius(notchP(K, 'cnc.toolDiameter'));
  const { x0: ex0, x1: ex1, z0: ez0, z1: ez1, d: ed } = ext;
  const sideW = D - G;
  const tw = W - 2 * G;
  const left = recessLeftP(ex0);
  const right = recessRightP(ex1, W);
  const floor = recessFloorP(ez0);
  const top = recessTopP(ez1, H);
  const bz0 = recessBz0(ez0, G);
  const bz1 = recessBz1(ez1, H, G);
  const ix0 = recessIx0(ex0, G);
  const ix1 = recessIx1(ex1, G);
  const window = recessWindow(W, H, G, ex0, ex1, ez0, ez1);
  const cut = {
    ext, ex0, ex1, ez0, ez1, ed, left, right, floor, top, bz0, bz1, ix0, ix1, window,
    W, H, D, G, sideW,
    grown: [],
    boards: [],
    reorigin: {},
    pieces: 0,
  };
  const byId = (id) => panels.find((p) => p.id === id);
  const stamp = (p, extra) => {
    p.meta = { ...(p.meta || {}), extension: { x0: ex0, x1: ex1, z0: ez0, z1: ez1, d: ed, ...extra } };
  };
  const planToBox = (pts, box) => pts.map(([x, y]) => [roundTo(x, 4), roundTo(box.d - y, 4)]);

  // ── THE SIDES THAT GROW ──
  const sj = recessSideJoints(D, H, G, ez0, ez1, ed, K);
  for (const [id, grows, bur] of [['BUL', left, false], ['BUR', right, true]]) {
    if (!grows) continue;
    const side = byId(id);
    if (!side || side.part !== id) continue;
    const S = notchScrewAxis(G);
    let geom;
    if (floor && top) {
      // A deeper side, the kit's own drawing with no back tabs (it meets the EXT-BACK).
      geom = sidePanelGeometry({
        w: sideW + ed, h: H, G, side: bur ? 'R' : 'L', puzzle: pz, edges: { backTabs: false }, jointInset,
      });
      if (bur) geom = shiftGeom(geom, -ed, 0);
    } else {
      // The bump between its straight runs, the parent's tabs re-planned on them.
      const fromFront = (xs) => (bur ? xs.map((x) => sideW - x) : xs);
      const outline = recessSideOutline(D, H, G, ez0, ez1, ed, false);
      const runs = [{ edge: 'right', at: sideW, centres: sj['BACK-TABS'] }];
      let pts = outlineWithTabs(outline, runs, G, pz);
      let bones = tabBones(runs, G, pz);
      const sockets = socketPanelGeometry({
        w: sideW, h: H, G, puzzle: pz,
        sockets: { top: fromFront(sj['TOP-SOCKETS']), bottom: fromFront(sj['BOTTOM-SOCKETS']) },
      });
      const screws = [
        ...fromFront(sj['TOP-SCREWS']).map((x) => ({ layer: pz.layers.screw, kind: 'screw', x, y: H - S, d: pz.screwDiameter })),
        ...fromFront(sj['BOTTOM-SCREWS']).map((x) => ({ layer: pz.layers.screw, kind: 'screw', x, y: S, d: pz.screwDiameter })),
      ];
      let dbs = recessSideDogbones(D, H, G, ez0, ez1, ed, r, false);
      if (bur) {
        // Into BUR's ORIGINAL frame (x from the old back edge): the bump at negative x.
        pts = pts.map(([x, y]) => [sideW - x, y]).reverse();
        bones = bones.map((k) => ({ ...k, x1: sideW - k.x2, x2: sideW - k.x1 }));
        dbs = dbs.map(([x, y, rr]) => [sideW - x, y, rr]);
      }
      geom = {
        outline: pts,
        pockets: [...bones, ...sockets.pockets],
        holes: [...sockets.holes, ...screws, ...dbs.map((db) => dogboneHole(db, pz))],
      };
    }
    side.cnc = { ...side.cnc, ...geom, notch: sideCorners(H, bz0, bz1, ed, bur) };
    side.w = roundTo(sideW + ed, 4);
    side.area_m2 = polygonArea(recessSideOutline(D, H, G, ez0, ez1, ed, false)) / 1e6;
    // The box grows in PHASE B: the drilling pass reads a side's box depth for
    // its pin columns (shelfBearers.js pinColumns), and sets out as on the parent.
    if (bur) cut.reorigin.BUR = { dx: -ed, run: sideW + ed };
    else side.cnc.drawn_w = roundTo(sideW + ed, 4);
    cut.grown.push(id);
    stamp(side, { cut: 'side', run: roundTo(sideW + ed, 4) });
  }

  // ── THE TOP AND THE BOTTOM THAT GROW ──
  if (top || floor) {
    const plan = recessTopOutline(W, D, G, ex0, ex1, ed);
    const drawnW = sideW + ed;
    const drawn = notchRot90Pts(plan, drawnW);
    const tj = recessTopJoints(W, D, G, ex0, ex1, ed, K);
    const runs = [
      { edge: 'bottom', at: 0, centres: tj.LEFT.map((y) => drawnW - y) },
      { edge: 'top', at: tw, centres: tj.RIGHT.map((y) => drawnW - y) },
      { edge: 'left', at: ed, centres: tj.BACK },
    ];
    const dbs = recessTopDogbones(W, D, G, ex0, ex1, ed, r).map(([x, y, rr]) => [drawnW - y, x, rr]);
    for (const id of [...(top ? ['TOP'] : []), ...(floor ? ['BOTTOM'] : [])]) {
      const p = byId(id);
      if (!p || p.part !== id) continue;
      p.cnc = {
        ...p.cnc,
        drawn_w: roundTo(drawnW, 4),
        outline: outlineWithTabs(drawn, runs, G, pz),
        pockets: tabBones(runs, G, pz),
        holes: dbs.map((db) => dogboneHole(db, pz)),
        notch: null,
      };
      p.h = roundTo(drawnW, 4);
      p.area_m2 = polygonArea(plan) / 1e6;
      p.box = { ...p.box, z: roundTo(p.box.z - ed, 4), d: roundTo(p.box.d + ed, 4) };
      p.meta = { ...(p.meta || {}), planOutline: planToBox(plan, p.box) };
      cut.grown.push(id);
      stamp(p, { cut: 'plan', outline: r4pts(plan) });
    }
  }

  // ── THE BACK: ITS PIECES ──
  const bk = byId('BACK');
  if (bk && bk.part === 'BACK') {
    const pieces = recessBackPieces(W, H, G, ex0, ex1, ez0, ez1);
    // A side that grows carries its tabs on its straight runs; the other keeps the parent's.
    const sideTabs = (grows) => (grows ? sj['BACK-TABS'] : notchReplanTabs(H, notchP(K, 'puzzle.tabCentresFromEnd'), notchP(K, 'puzzle.singleTabAtOrBelow'), notchP(K, 'puzzle.middleTabBelow')));
    const tj = recessTopJoints(W, D, G, ex0, ex1, ed, K);
    const plainTopTabs = notchShift(notchReplanSockets(tw, notchP(K, 'puzzle.tabCentresFromEnd'), notchP(K, 'puzzle.singleSocketBelow')), G);
    const topTabs = top ? notchShift(tj.BACK, G) : plainTopTabs;
    const botTabs = floor ? notchShift(tj.BACK, G) : plainTopTabs;
    const cutoutLayer = profile.wallUnit?.hangers?.cutoutLayer;
    const hangerCuts = (bk.cnc?.pockets || []).filter((k) => cutoutLayer && k.layer === cutoutLayer)
      .map((k) => hangerCutoutStepped(k, window, W)).filter(Boolean);
    const parentCnc = bk.cnc;
    pieces.forEach((piece, i) => {
      const [px0, pz0, px1, pz1] = piece;
      const bw = px1 - px0;
      const bh = pz1 - pz0;
      const pc = recessBackCut(piece, window);
      const kind = pc ? recessCutKind(pc, bw, bh) : null;
      const outline = recessBackOutline(piece, pc);
      const dbs = recessBackDogbones(piece, pc, r);
      const bj = recessBackJoints(piece, window, W, H, G, ex0, ex1, ez0, ez1, topTabs, botTabs, sideTabs(left), sideTabs(right), K);
      const sockets = socketPanelGeometry({
        w: bw, h: bh, G, puzzle: pz,
        sockets: { left: bj.LEFT, right: bj.RIGHT, top: bj.TOP, bottom: bj.BOTTOM },
        screws: bj.SCREWS.map(([x, y]) => ({ x, y })),
      });
      const cuts = hangerCuts
        .filter((k) => k.x1 >= px0 - EPS && k.x2 <= px1 + EPS && k.y1 >= pz0 - EPS && k.y2 <= pz1 + EPS)
        .map((k) => ({ ...k, x1: roundTo(k.x1 - px0, 4), x2: roundTo(k.x2 - px0, 4), y1: roundTo(k.y1 - pz0, 4), y2: roundTo(k.y2 - pz0, 4) }));
      const cnc = {
        ...parentCnc,
        drawn_w: roundTo(bw, 4),
        drawn_h: roundTo(bh, 4),
        outline,
        pockets: [
          ...sockets.pockets,
          ...cuts,
          ...(kind === 'window' ? [{ layer: RECESS_WINDOW_LAYER, x1: roundTo(pc[0], 4), y1: roundTo(pc[1], 4), x2: roundTo(pc[2], 4), y2: roundTo(pc[3], 4), depth: G }] : []),
        ],
        holes: [...sockets.holes, ...dbs.map((db) => dogboneHole(db, pz))],
        notch: kind === 'corner' ? notchCornerOfOutline(outline, bw, bh) : null,
        ...(kind === 'bite' ? { bite: { x0: roundTo(pc[0], 4), y0: roundTo(pc[1], 4), x1: roundTo(pc[2], 4), y1: roundTo(pc[3], 4) } } : {}),
      };
      if (kind !== 'bite') delete cnc.bite;
      const box = { ...bk.box, x: roundTo(bk.box.x + px0, 4), y: roundTo(bk.box.y + pz0, 4), w: roundTo(bw, 4), h: roundTo(bh, 4) };
      const area = polygonArea(outline) / 1e6 - (kind === 'window' ? (pc[2] - pc[0]) * (pc[3] - pc[1]) / 1e6 : 0);
      if (i === 0) {
        bk.cnc = cnc;
        bk.w = roundTo(bw, 4);
        bk.h = roundTo(bh, 4);
        bk.box = box;
        bk.area_m2 = roundTo(area, 6);
        stamp(bk, { cut: 'back', piece: 1, kind: kind || 'plain', window });
      } else {
        const p2 = makePanel({
          id: 'BACK-2', part: 'BACK', role: bk.role, w: bw, h: bh, thickness: G,
          edgeCode: codes.none, edgeLen: 0, box, cnc,
          meta: { ...(bk.meta || {}) },
        });
        p2.area_m2 = roundTo(area, 6);
        stamp(p2, { cut: 'back', piece: 2, kind: kind || 'plain', window });
        panels.push(p2);
        cut.boards.push('BACK-2');
      }
    });
    cut.pieces = pieces.length;
    cut.grown.push('BACK');
  }

  // ── THE ADDED BOARDS: RETURN-L, RETURN-R, FLOOR, LID, EXT-BACK ──
  const places = recessBoxPlaces(W, D, H, G, ex0, ex1, ez0, ez1, ed);
  const boxOf = ([x0, y0, z0, x1, y1, z1]) => ({
    x: roundTo(x0, 4), y: roundTo(z0, 4), z: roundTo(D - y1, 4),
    w: roundTo(x1 - x0, 4), h: roundTo(z1 - z0, 4), d: roundTo(y1 - y0, 4),
  });
  const board = (id, part, w, h, place, screws) => {
    const p = makePanel({
      id,
      part,
      role: 'extension',
      w,
      h,
      thickness: G,
      edgeCode: codes.none,
      edgeLen: 0,
      box: boxOf(place),
      cnc: { rotated: false, drawn_w: w, drawn_h: h, ...rectGeometry(w, h) },
      meta: {
        // Outline only, no puzzle joint, no machined hole (KIT_RECESS.lsp D11):
        // the extension's fixing is the joiner's, on THE BACK SCREW ROW.
        readiness: 'geometry',
        fixing: 'manual',
        extension: {
          x0: ex0, x1: ex1, z0: ez0, z1: ez1, d: ed, board: id,
          screws: (screws || []).map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]),
        },
      },
    });
    panels.push(p);
    cut.boards.push(id);
  };
  const ret = recessReturn(H, G, ez0, ez1, ed);
  const retScrews = recessReturnScrews(H, G, ez0, ez1, ed, K);
  if (places['RETURN-L']) board('RETURN-L', 'RECESS-RETURN', ret[0], ret[1], places['RETURN-L'], retScrews);
  if (places['RETURN-R']) board('RETURN-R', 'RECESS-RETURN', ret[0], ret[1], places['RETURN-R'], retScrews);
  const lid = recessLid(G, ex0, ex1, ed);
  const lidScrews = recessLidScrews(G, ex0, ex1, ed, K);
  if (places.FLOOR) board('FLOOR', 'RECESS-FLOOR', lid[0], lid[1], places.FLOOR, lidScrews);
  if (places.LID) board('LID', 'RECESS-LID', lid[0], lid[1], places.LID, lidScrews);
  const eb = recessExtBack(ex0, ex1, ez0, ez1);
  board('EXT-BACK', 'RECESS-BACK', eb[0], eb[1], places['EXT-BACK'], recessExtBackScrews(W, H, G, ex0, ex1, ez0, ez1, K));

  // ── SHELVES IN THE BAND (D10) ──
  for (const p of panels) {
    if (p.part !== 'SHELF' || !p.box) continue;
    if (p.meta?.variant === 'fixed') continue;
    if (!recessShelfInP(p.box.y, G, H, ez0, ez1)) continue;
    const { rect } = planOf(p.box, D);
    const shelf = [rect[0], rect[1], rect[2], rect[3]];
    const [bw, bh, b0, b1] = recessShelfBump(W, D, G, ex0, ex1, ed, shelf, K);
    if (!(b1 - b0 > 0)) continue;
    const plan = recessBumpOutline(bw, bh, b0, b1, ed);
    const dbs = recessShelfDogbones(W, D, G, ex0, ex1, ed, shelf, K, r);
    // Drawn `depth x width`, x from its FRONT edge: the plan transposed (a
    // reflection), the walk reversed to stay anticlockwise (the notch's way).
    const drawn = recessTranspose(plan);
    const drawnW = bh + ed;
    p.cnc = {
      ...p.cnc,
      drawn_w: roundTo(drawnW, 4),
      drawn_h: roundTo(bw, 4),
      outline: drawn,
      holes: [...(p.cnc?.holes || []), ...dbs.map(([x, y, rr]) => dogboneHole([y, x, rr], pz))],
      notch: null,
    };
    p.h = roundTo(drawnW, 4);
    p.area_m2 = polygonArea(plan) / 1e6;
    p.box = { ...p.box, z: roundTo(p.box.z - ed, 4), d: roundTo(p.box.d + ed, 4) };
    p.meta = { ...(p.meta || {}), planOutline: planToBox(plan, p.box) };
    cut.grown.push(p.id);
    stamp(p, { cut: 'shelf', outline: r4pts(plan) });
  }
  return cut;
}

// ── PHASE B: after the drilling ───────────────────────────────────────────

/**
 * Re-origin BUR (its frame runs from the back; the bump moved that edge by
 * ed), and step the grown sides' back shelf-pin column back by ed over the
 * band (D12). Mutates `panels` and `drills` in place.
 */
export function extensionDrills({ cut, panels, drills, profile }) {
  if (!cut) return;
  const pin = Number(profile?.shelfHoles?.columnFromEdge) || 70;
  const { sideW, ed, bz0, bz1 } = cut;
  const inBand = (z) => z >= bz0 - EPS && z <= bz1 + EPS;
  // The grown sides' boxes reach back by ed (held until now: the drilling pass
  // read the parent's depth for its pin columns).
  for (const id of ['BUL', 'BUR']) {
    if (!cut.grown.includes(id)) continue;
    const p = panels.find((x) => x.id === id);
    if (p?.box) p.box = { ...p.box, z: roundTo(p.box.z - ed, 4), d: roundTo(p.box.d + ed, 4) };
  }
  // BUR into its own frame from the NEW back edge.
  const ro = cut.reorigin.BUR;
  if (ro) {
    const p = panels.find((x) => x.id === 'BUR');
    if (p) {
      p.cnc = { ...p.cnc, ...shiftGeom(p.cnc, -ro.dx, 0), drawn_w: roundTo(ro.run, 4) };
      for (const d of drills) if (d.panel === 'BUR') d.x = roundTo(d.x - ro.dx, 4);
    }
  }
  // D12: the back pin column over the band, from the new back edge.
  for (const d of drills) {
    if (d.kind !== 'shelf' || !cut.grown.includes(d.panel)) continue;
    if (!inBand(d.y)) continue;
    if (d.panel === 'BUL' && Math.abs(d.x - (sideW - pin)) < 1) d.x = roundTo(d.x + ed, 4);
    // BUR was shifted by ed above: its old back column stands at pin + ed and steps back to pin.
    if (d.panel === 'BUR' && Math.abs(d.x - (pin + ed)) < 1) d.x = roundTo(d.x - ed, 4);
  }
}

/** What the result publishes about the extension (`derived.extension`). */
export function extensionSummary(cut) {
  if (!cut) return null;
  return {
    x0: cut.ex0, x1: cut.ex1, z0: cut.ez0, z1: cut.ez1, d: cut.ed,
    window: cut.window.map((v) => roundTo(v, 4)),
    grown: [...cut.grown],
    boards: [...cut.boards],
    pieces: cut.pieces,
    for: cut.ext.for,
  };
}
