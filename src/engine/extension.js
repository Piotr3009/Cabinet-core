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
// T79 F8 (18.10.2026, KIT_RECESS.lsp D13 amended, section H): a carcass the
// corner notch has cut grows into a recess as well when the two footprints on
// the BACK do not overlap; the notch is cut first and the extension on the
// boards it left. The owner: *"dlaczego cut the corner likwiduje nam wcięcie
// do recess?"*  Every line of that is behind a notch AND an extension on one
// unit: a unit with only one of them reaches exactly the lines it reached.
//
// Where the extension comes from: the ROOM, never the hand (projectStore
// recessExtensionFor, derived every time, stored never). A cabinet WHOLLY in a
// recess is a deeper cabinet (D2, projectStore settleRecesses) and never
// reaches this file.
//
// Pure: numbers in, numbers or records out. No store, no React, no three.js.

import { sidePanelGeometry, socketPanelGeometry, rectGeometry } from './puzzle.js';
import { roundTo } from './format.js';
// T79 F8 (KIT_RECESS.lsp D13, section H): notchOf to cutNotchCorner are what the extension asks of a carcass
// the notch has cut.
import {
  notchProfile, notchP, notchJointInset, notchReplanSockets, notchReplanTabs, notchShift,
  notchMinJointEdge, notchScrewAxis, notchScrewRow, notchRowsBetweenTabs, notchEdgeRow,
  notchRectOutline, notchDogbone, notchRot90Pts, notchCornerOfOutline,
  notchKitRefusal, outlineWithTabs, tabBones, polygonArea, shiftGeom,
  cornerMarkRecords, notchEndCut, edgeNotchEndCut, notchEndOutline, edgeNotchCorners,
  notchOf, notchHh, notchFromTopP, notchFullP, notchBoxedP, notchLeftP, notchBackP,
  notchTopCut, notchTopJoints, notchSideFc, notchSideJoints, notchShelfCut, notchHoleInP, cutNotchCorner,
} from './notch.js';
// T79 F8: a grown BUR's marks move with its re-origin (extensionDrills).
import { shiftMark } from './marks.js';

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
 * `nb` (T79 F8, KIT_RECESS.lsp D13): the footprint on the BACK of a BOXED
 * notch at a back corner, or null: the rows keep off it, run by run (a side
 * row on the edge the notch cuts runs on what the notch AND the window leave
 * of it, a row on its run: recessSideRow); with null every row is where it
 * was. 19.10.2026 (D17, the owner): no row into the notch's box and none
 * round the window; the first back carries drawBACK's rows only.
 */
export function recessBackJoints(piece, window, cw, ch, g, ex0, ex1, ez0, ez1, topTabs, botTabs, bulTabs, burTabs, K, nb = null) {
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
  // T79 F8 (D13): drawBACK's side rows on each run the notch leaves of the
  // edge; on the edge the notch cuts, on what the notch AND the window leave
  // of it, a row on its run (recessSideRow).
  if (x0 <= 0) {
    for (const z of recessSideRow(bh, z0, LEFT, nb, window, Boolean(nb) && nb[0] <= 0, recessLeftP(ex0), sfe)) scr.push([S, z]);
  }
  if (x1 >= cw) {
    for (const z of recessSideRow(bh, z0, RIGHT, nb, window, Boolean(nb) && nb[2] >= cw, recessRightP(ex1, cw), sfe)) scr.push([bw - S, z]);
  }
  const runs = (grown) => (grown
    ? [
      ...(recessLeftP(ex0) ? [] : [[g, ix0]]),
      ...(recessRightP(ex1, cw) ? [] : [[ix1, cw - g]]),
    ]
    : [[g, cw - g]]);
  if (z1 >= ch) {
    for (const [a0, b0] of runs(recessTopP(ez1, ch))) {
      for (const [a, b] of recessRuns(a0, b0, recessNotchXcut(nb, g, cw, Boolean(nb) && nb[3] >= ch))) {
        for (const x of recessRunRow(Math.max(a, x0), Math.min(b, x1), sfe)) scr.push([x - x0, bh - S]);
      }
    }
  }
  if (z0 <= 0) {
    for (const [a0, b0] of runs(recessFloorP(ez0))) {
      for (const [a, b] of recessRuns(a0, b0, recessNotchXcut(nb, g, cw, Boolean(nb) && nb[1] <= 0))) {
        for (const x of recessRunRow(Math.max(a, x0), Math.min(b, x1), sfe)) scr.push([x - x0, S]);
      }
    }
  }
  // 17.10.2026 (KIT_RECESS.lsp D17): NO hand-fix rows round the window and
  // none into a notch's box; the BACK keeps drawBACK's rows into the sides,
  // the TOP and the BOTTOM. Drawn again on 18.10 (T79 F6, F8) and withdrawn on
  // 19.10.2026 by the owner: *"nie na pierwszych plecach tylko na tych
  // drugich ktore sa we wnetrzu recess"*. The second back, the EXT-BACK,
  // keeps its rows (recessExtBackScrews). The window and the band's interior
  // stay bound for the record of what the rows were measured from.
  void wx0; void wz0; void wx1; void wz1; void bz0; void bz1;
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

/**
 * recess-return-screws: NONE since 17.10.2026 (KIT_RECESS.lsp D17). It was a
 * row into the BOTTOM's bump edge (z = S) when the band reached the floor and
 * into the TOP's (z = h - S) when it reached the top, x along the depth from
 * the RETURN's front end. The owner: *"bedziemy montowac na ciastka (w
 * przyszlosci dodamy lamello) teraz nic"*.
 */
export function recessReturnScrews(ch, g, ez0, ez1, ed, K) {
  void ch; void g; void ez0; void ez1; void ed; void K;
  return [];
}

/** recess-lid: the FLOOR and the LID, [ex1 - ex0, ed - g]. */
export function recessLid(g, ex0, ex1, ed) { return [ex1 - ex0, ed - g]; }

/** recess-lid-screws: NONE since 17.10.2026 (D17; it was a column into the vertical board's end under or over each end, x = S and w - S). */
export function recessLidScrews(g, ex0, ex1, ed, K) {
  void g; void ex0; void ex1; void ed; void K;
  return [];
}

/** recess-ext-back: [ex1 - ex0, ez1 - ez0]. */
export function recessExtBack(ex0, ex1, ez0, ez1) { return [ex1 - ex0, ez1 - ez0]; }

/**
 * recess-ext-back-screws, DRILLED since 18.10.2026 (KIT_RECESS.lsp D17
 * amended: the EXT-BACK is a back): x from its left end, z up from its bottom
 * end, a column into each vertical board's back end over bz0 .. bz1 at x = S
 * and w - S, and a row into each horizontal board's back edge at z = S and
 * h - S over the run between the two vertical boards, g .. w - g: THE BACK
 * SCREW ROW (notchEdgeRow), drawBACK's notchRowBetween on every run over
 * 2 x screwFromEnd, two at the quarters at exactly minInterior (where
 * notchRowBetween drills three holes in one place). Stated until 17.10.2026,
 * none from 17.10 to 18.10.
 */
export function recessExtBackScrews(cw, ch, g, ex0, ex1, ez0, ez1, K) {
  const S = notchScrewAxis(g);
  const sfe = notchP(K, 'puzzle.screwFromEnd');
  const eb = recessExtBack(ex0, ex1, ez0, ez1);
  const out = [];
  for (const z of notchShift(notchEdgeRow(recessBz0(ez0, g), recessBz1(ez1, ch, g), sfe), -ez0)) {
    out.push([S, z]);
    out.push([eb[0] - S, z]);
  }
  for (const x of notchEdgeRow(g, eb[0] - g, sfe)) { out.push([x, S]); out.push([x, eb[1] - S]); }
  void cw;
  return out;
}

// ── SHELVES ───────────────────────────────────────────────────────────────

/** recess-shelf-in-p: is this shelf (its underside at zs) in the band's interior? */
export function recessShelfInP(zs, g, ch, ez0, ez1) {
  return zs >= recessBz0(ez0, g) - EPS && zs + g <= recessBz1(ez1, ch, g) + EPS;
}

/**
 * recess-shelf-clr (KIT_RECESS.lsp D16): the clearance a shelf is cut with,
 * the notch's grammar (notchShelfCut's clr): wc / 2 adjustable, 0 FIXED.
 */
export function recessShelfClr(fixed, K) {
  return fixed ? 0 : notchP(K, 'carcass.shelfWidthClearance') / 2;
}

/**
 * recess-shelf-bump: [bw, bh, b0, b1, ext] in the SHELF's plan frame; `shelf` its parent plan rectangle,
 * `clr` the shelf's OWN clearance from each RETURN or side (recessShelfClr).
 * 17.10.2026 (KIT_RECESS.lsp D15): b0 and b1 are CLAMPED to the shelf, 0 .. bw.
 * The owner's triangles: *"polki sie rozciagaja w ksztalcie trojkata do tylnej
 * sciany ... nie zatrzymuje sie w calosci na dividerze"*. A bay shelf beside a
 * divider sees only the part of the band it stands under (PROBE: WARDROBE 1000,
 * divider at 500, band 300..1000: the left shelf 478 wide got b1 = 960 and a
 * slant to (960, 0); the right one b0 = -200). A full-width shelf answers as before.
 * 17.10.2026 (D16, the owner's second look): until 10:35 the bump took wc / 2
 * for EVERY shelf, so a FIXED shelf (x from the side's face, no clearance) got a
 * bump 2 mm short of each end: two 2 mm steps with corner marks on a plain board
 * (PROBE: WARDROBE 700, band 0..700: SHELF-1 fixed 664 wide, plan (0,680)
 * (664,680) (664,150) (662,150) (662,0) (2,0) (2,150) (0,150), four marks). With
 * clr 0 its bump runs end to end: (0,680) (664,680) (664,0) (0,0), no mark.
 */
export function recessShelfBump(cw, cd, g, ex0, ex1, ed, shelf, K, clr = recessShelfClr(false, K)) {
  const bw = shelf[2] - shelf[0];
  const b0 = recessIx0(ex0, g) + clr - shelf[0];
  const b1 = recessIx1(ex1, g) - clr - shelf[0];
  return [bw, shelf[3] - shelf[1], Math.max(0, b0), Math.min(bw, b1), ed];
}

/** recess-shelf-grows-p (D15): does the clamped band reach this shelf at all? */
export function recessShelfGrowsP(cw, cd, g, ex0, ex1, ed, shelf, K, clr) {
  const [, , b0, b1] = recessShelfBump(cw, cd, g, ex0, ex1, ed, shelf, K, clr);
  return b1 - b0 > 0;
}

export function recessShelfOutline(cw, cd, g, ex0, ex1, ed, shelf, K, clr) {
  return recessBumpOutline(...recessShelfBump(cw, cd, g, ex0, ex1, ed, shelf, K, clr));
}

export function recessShelfDogbones(cw, cd, g, ex0, ex1, ed, shelf, K, r, clr) {
  const [bw, bh, b0, b1] = recessShelfBump(cw, cd, g, ex0, ex1, ed, shelf, K, clr);
  return recessBumpDogbones(bw, bh, b0, b1, r);
}

// ── THE END PANEL (KIT_RECESS.lsp D21, T79 F9): in its side's frame (KIT_NOTCH.lsp D23) ──

/** recess-end-reach-p: does the band reach past the END panel's outer face? rx0, rx1 the recess's own (unclipped) edges. */
export function recessEndReachP(hand, rx0, rx1, cw, et) {
  return hand === 'L' ? rx0 <= -et : rx1 >= cw + et;
}

/**
 * recess-end-cuts: the corners the band leaves on a grown END panel, ed wide, over the band's own height; rz0, rz1 the
 * recess's own bottom and top where the band was clipped to the carcass (null: to the floor, to the ceiling), past
 * which the END never grows (D21).
 */
export function recessEndCuts(ch, ez0, ez1, ed, hand, ph, pb, rz0 = null, rz1 = null) {
  const fc0 = hand === 'R' ? 'x0y0' : 'x1y0';
  const fc1 = hand === 'R' ? 'x0y1' : 'x1y1';
  const lo = recessFloorP(ez0) ? (rz0 != null ? Math.max(0, rz0 + pb) : 0) : ez0 + pb;
  const hi = recessTopP(ez1, ch) ? (rz1 != null ? Math.min(ph, rz1 + pb) : ph) : ez1 + pb;
  const out = [];
  if (lo > 0) out.push([fc0, ed, lo]);
  if (hi < ph) out.push([fc1, ed, ph - hi]);
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// E. THE REFUSALS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * T79 F8 (KIT_RECESS.lsp D13): the sentence for a band that overlaps the
 * notch's footprint on the BACK. The owner, 18.10.2026: *"dlaczego cut the
 * corner likwiduje nam wcięcie do recess?"*
 */
export const RECESS_NOTCH_OVERLAP = 'The recess cannot be cut: the corner cut stands where the recess band is; move one of them.';

/**
 * recess-refusal. `fp` (T79 F8, D13): the footprint on the BACK of the notch
 * the carcass carries (recessNotchFootprint), or null / false. Until
 * 18.10.2026 it was `notched`, any notch refused the band ("RECESS: a carcass
 * notched round an obstacle cannot grow into a recess as well; the notch
 * stands.") and the refusal reached no screen.
 */
export function recessRefusal(cw, cd, ch, g, ex0, ex1, ez0, ez1, ed, fp, K) {
  if (recessNotchOverlapP(fp, ex0, ex1, ez0, ez1)) return RECESS_NOTCH_OVERLAP;
  if (ex0 < 0 || ex1 > cw || ez0 < 0 || ez1 > ch || ex0 >= ex1 || ez0 >= ez1) return 'RECESS: the band lies outside the carcass.';
  if (!recessLeftP(ex0) && ex0 < g) return 'RECESS: a RETURN cannot stand inside the side; the band starts at least a board in.';
  if (!recessRightP(ex1, cw) && ex1 > cw - g) return 'RECESS: a RETURN cannot stand inside the side; the band ends at least a board in.';
  if (!recessFloorP(ez0) && ez0 < g) return 'RECESS: the FLOOR cannot lie inside the BOTTOM; the band starts at least a board up.';
  if (!recessTopP(ez1, ch) && ez1 > ch - g) return 'RECESS: the LID cannot lie inside the TOP; the band ends at least a board down.';
  return recessInteriorRefusal(cw, ch, g, ex0, ex1, ez0, ez1, ed, K);
}

// ═══════════════════════════════════════════════════════════════════════════
// H. WITH A NOTCH (KIT_RECESS.lsp D13, 18.10.2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner: *"dlaczego cut the corner likwiduje nam wcięcie do recess?"*  The
// notch is KIT_NOTCH.lsp's and is cut first, by its own routines; these are
// what the extension asks of a carcass the notch has already cut. Each calls
// the extension's own (B to E) and the notch's own; none re-states a law.

/** recess-notch-footprint: [fx0, fz0, fx1, fz1], the notch on the BACK (carcass x from the LEFT face, z up). */
export function recessNotchFootprint(cw, ch, nw, nh, corner) {
  const hh = notchHh(ch, nh);
  const top = notchFromTopP(ch, nh);
  const left = notchLeftP(corner);
  return [left ? 0 : cw - nw, top ? ch - hh : 0, left ? nw : cw, top ? ch : hh];
}

/** recess-notch-overlap-p: does the band overlap that footprint (any area at all)? false for no notch. */
export function recessNotchOverlapP(fp, ex0, ex1, ez0, ez1) {
  return Boolean(fp) && fp[0] < ex1 && fp[2] > ex0 && fp[1] < ez1 && fp[3] > ez0;
}

/** recess-runs: the straight runs of an edge lo .. hi less the intervals `cuts`, in order. */
export function recessRuns(lo, hi, cuts) {
  const sorted = [...(cuts || [])].sort((p, q) => p[0] - q[0]);
  const out = [];
  let at = lo;
  for (const c of sorted) {
    if (Math.min(c[0], hi) > at + EPS) out.push([at, Math.min(c[0], hi)]);
    if (c[1] > at) at = c[1];
  }
  if (hi > at + EPS) out.push([at, hi]);
  return out;
}

/** recess-in-run: the tabs (sockets) of a list that stand inside a run [a, b]. */
export function recessInRun(lst, run) {
  return (lst || []).filter((c) => c > run[0] + EPS && c < run[1] - EPS);
}

/** recess-notch-zcut: the notch's height on a piece's side edge (piece frame), as a cut list; [] unless `onSide`. */
export function recessNotchZcut(nb, z0, onSide) {
  return nb && onSide ? [[nb[1] - z0, nb[3] - z0]] : [];
}

/** recess-window-zcut: the window's height on a piece's side edge (piece frame), as a cut list; [] unless `onSide` (the band reaches that side). */
export function recessWindowZcut(window, z0, onSide) {
  return onSide ? [[window[1] - z0, window[3] - z0]] : [];
}

/**
 * recess-side-row: drawBACK's side row on a piece's side edge, [z, ..] in the
 * piece's frame, between the tabs the edge carries. Off the notch's edge
 * (onSide false) the one run of the whole edge, as it always was. On the edge
 * the notch cuts (D13: every edge cut by both takes its joints run by run on
 * what the two leave of it) the runs are what the notch AND, when the band
 * reaches that side too (bandSide), the window leave of it, and a row stands
 * on its run: a hole drawBACK's spacing puts past a run's end would be drilled
 * into the notch, into the window or past the board (none on a run shorter
 * than one hole's offset). The T79 F8 review, 18.10.2026.
 */
export function recessSideRow(bh, z0, tabs, nb, window, onSide, bandSide, sfe) {
  const out = [];
  // CHAT FIX 19.10.2026 (KIT_RECESS.lsp recess-side-row amended; the owner:
  // *"czasami cnc rysuje items jak 3 mm drills ... poza elementami"*): the
  // window takes the side edge over its height wherever the band reaches that
  // side (a BITE), notch or no notch. Until tonight the window's cut was asked
  // only on a notch's edge, so a plain recess to the right edge ran drawBACK's
  // right column straight through the bite (golden-recess: x 591, z 392.5 in
  // the window). The runs are what the notch (its edge) AND the window (the
  // band's side) leave; a row stands on its run.
  const cutEdge = onSide || bandSide;
  const cuts = [...recessNotchZcut(nb, z0, onSide), ...recessWindowZcut(window, z0, bandSide)];
  for (const run of recessRuns(0, bh, cuts)) {
    for (const z of notchRowsBetweenTabs(run[0], run[1], recessInRun(tabs, run), sfe)) {
      if (!cutEdge || (z > run[0] - EPS && z < run[1] + EPS)) out.push(z);
    }
  }
  return out;
}

/** recess-notch-xcut: the notch and its RETURN on the TOP's (BOTTOM's) back edge, carcass x; [] unless `edgeP`. */
export function recessNotchXcut(nb, g, cw, edgeP) {
  if (!nb || !edgeP) return [];
  return [nb[0] <= 0 ? [0, nb[2] + g] : [nb[0] - g, cw]];
}

/**
 * recess-cut-corner: an outline of a w x h board less the rectangle nw x nh at
 * its corner fc. One law, one path: the 3-D's own arithmetic
 * (engine/notch.js cutNotchCorner), which the LISP restates.
 */
export function recessCutCorner(pts, w, h, fc, nw, nh) {
  return cutNotchCorner(pts, w, h, { fc, nw, nh });
}

/** recess-notched-top-outline: the TOP's (BOTTOM's) bump with the notch's corner taken out (plan frame). */
export function recessNotchedTopOutline(cw, cd, g, ex0, ex1, ed, nw, nd, corner) {
  const plan = recessTopOutline(cw, cd, g, ex0, ex1, ed);
  const cut = notchTopCut(cw, cd, g, nw, nd, corner);
  return cut ? recessCutCorner(plan, cut[3], cut[4], cut[0], cut[1], cut[2]) : plan;
}

/**
 * recess-notched-top-joints: the long edge on the notch's side is the notch's
 * (the band never reaches it), the other the extension's; the back edge takes
 * a socket plan on every straight run left by the notch and the bump.
 */
export function recessNotchedTopJoints(cw, cd, g, ex0, ex1, ed, nw, nd, corner, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const below = notchP(K, 'puzzle.singleSocketBelow');
  const minEdge = notchMinJointEdge(notchP(K, 'puzzle.dogboneHalfHeight'), g);
  const tw = cw - 2 * g;
  const nj = notchTopJoints(cw, cd, g, nw, nd, corner, K);
  const rj = recessTopJoints(cw, cd, g, ex0, ex1, ed, K);
  const [, , b0, b1] = recessPlanBump(cw, cd, g, ex0, ex1, ed);
  const left = notchLeftP(corner);
  const cuts = [[b0, b1]];
  if (notchBackP(corner)) cuts.unshift(left ? [0, nw] : [tw - nw, tw]);
  const BACK = recessRuns(0, tw, cuts).flatMap(([a, b]) => recessRunSockets(b - a, a, e, below, minEdge));
  return { LEFT: left ? nj.LEFT : rj.LEFT, RIGHT: left ? rj.RIGHT : nj.RIGHT, BACK };
}

/** recess-notched-side-outline: BUL's frame (x from the FRONT), the bump less a BOXED notch's corner. */
export function recessNotchedSideOutline(cd, ch, g, ez0, ez1, ed, nw, nd, nh, corner) {
  const pts = recessSideOutline(cd, ch, g, ez0, ez1, ed, false);
  if (!notchBoxedP(nw, g)) return pts;
  return recessCutCorner(pts, cd - g, ch, notchSideFc(corner, false, notchFromTopP(ch, nh)), nd, notchHh(ch, nh));
}

/**
 * recess-notched-side-joints, from the FRONT edge: the top (bottom) edge is the
 * notch's where the notch moves it, else the extension's; the back edge takes
 * a tab plan on every run left between the notch and the bump; the pin
 * columns are the notch's.
 */
export function recessNotchedSideJoints(cd, ch, g, ez0, ez1, ed, nw, nd, nh, corner, K) {
  const e = notchP(K, 'puzzle.tabCentresFromEnd');
  const one = notchP(K, 'puzzle.singleTabAtOrBelow');
  const three = notchP(K, 'puzzle.middleTabBelow');
  const minEdge = notchMinJointEdge(notchP(K, 'puzzle.dogboneHalfHeight'), g);
  const nj = notchSideJoints(cd, ch, g, nw, nd, nh, corner, K);
  const rj = recessSideJoints(cd, ch, g, ez0, ez1, ed, K);
  const top = notchFromTopP(ch, nh);
  const boxed = notchBoxedP(nw, g);
  const topN = boxed && (notchFullP(ch, nh) || top);
  const botN = boxed && !top;
  const cuts = [[recessBz0(ez0, g), recessBz1(ez1, ch, g)]];
  if (boxed && notchBackP(corner)) cuts.unshift(top ? [ch - notchHh(ch, nh), ch] : [0, notchHh(ch, nh)]);
  return {
    'TOP-SOCKETS': topN ? nj['TOP-SOCKETS'] : rj['TOP-SOCKETS'],
    'BOTTOM-SOCKETS': botN ? nj['BOTTOM-SOCKETS'] : rj['BOTTOM-SOCKETS'],
    'TOP-SCREWS': topN ? nj['TOP-SCREWS'] : rj['TOP-SCREWS'],
    'BOTTOM-SCREWS': botN ? nj['BOTTOM-SCREWS'] : rj['BOTTOM-SCREWS'],
    'BACK-TABS': recessRuns(0, ch, cuts).flatMap(([a, b]) => recessRunTabs(b - a, a, e, one, three, minEdge)),
    'PIN-COLUMNS': nj['PIN-COLUMNS'],
  };
}

/**
 * recess-notched-back-pieces: the extension's pieces; the footprint `fp` of a
 * notch at a BACK corner (null for a front one, it never reaches the BACK)
 * takes its strip off every piece it reaches when it runs the full height,
 * and a piece it takes whole goes; a part-height one leaves the pieces whole.
 */
export function recessNotchedBackPieces(cw, ch, g, ex0, ex1, ez0, ez1, fp) {
  const out = [];
  for (const pc of recessBackPieces(cw, ch, g, ex0, ex1, ez0, ez1)) {
    if (fp && fp[1] <= 0 && fp[3] >= ch) {
      let [x0, , x1] = pc;
      if (fp[0] <= 0) x0 = Math.max(x0, fp[2]);
      else x1 = Math.min(x1, fp[0]);
      if (x1 > x0 + EPS) out.push([x0, pc[1], x1, pc[3]]);
    } else {
      out.push([...pc]);
    }
  }
  return out;
}

/** recess-notched-back-corner: [fc, nw, nh] of a part-height notch's corner on a piece (its frame), or null. */
export function recessNotchedBackCorner(piece, fp) {
  if (!fp) return null;
  const ix0 = Math.max(piece[0], fp[0]);
  const iz0 = Math.max(piece[1], fp[1]);
  const ix1 = Math.min(piece[2], fp[2]);
  const iz1 = Math.min(piece[3], fp[3]);
  if (!(ix1 > ix0 + EPS && iz1 > iz0 + EPS)) return null;
  return [`${fp[0] <= piece[0] ? 'x0' : 'x1'}${fp[1] <= piece[1] ? 'y0' : 'y1'}`, ix1 - ix0, iz1 - iz0];
}

/** recess-notched-back-outline: the piece's outline (window, bite or corner) less the notch's corner `nc`. */
export function recessNotchedBackOutline(piece, cut, nc) {
  const pts = recessBackOutline(piece, cut);
  if (!nc) return pts;
  return recessCutCorner(pts, piece[2] - piece[0], piece[3] - piece[1], nc[0], nc[1], nc[2]);
}

/** recess-notched-shelf-outline: the shelf's bump less the notch's corner (its own clearance), its plan frame. */
export function recessNotchedShelfOutline(cw, cd, g, ex0, ex1, ed, shelf, clr, nw, nd, corner, K) {
  const plan = recessShelfOutline(cw, cd, g, ex0, ex1, ed, shelf, K, clr);
  const cut = notchShelfCut(cw, cd, g, nw, nd, corner, clr, shelf);
  return cut ? recessCutCorner(plan, cut[3], cut[4], cut[0], cut[1], cut[2]) : plan;
}

/** recess-box-name: on a notched carcass the extension's FLOOR and LID are EXT-FLOOR and EXT-LID (the notch's box has its own). */
export function recessBoxName(name, notched) {
  if (!notched) return name;
  if (name === 'FLOOR') return 'EXT-FLOOR';
  if (name === 'LID') return 'EXT-LID';
  return name;
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
  // T79 F9 (D21): the hands whose END panel the band reaches past (the room's answer), and the recess's own bottom
  // and top where the band was clipped to the carcass, the END's limit there.
  const ends = Array.isArray(e.ends) ? ['L', 'R'].filter((h) => e.ends.includes(h)) : [];
  const own = (v) => (ends.length && v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const rz0 = own(e.rz0);
  const rz1 = own(e.rz1);
  return {
    ...out,
    for: String(e.for || 'a recess in this wall'),
    ...(ends.length ? { ends } : {}),
    ...(rz0 != null ? { rz0 } : {}),
    ...(rz1 != null ? { rz1 } : {}),
  };
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
  // T79 F8 (D13): the notch's FOOTPRINT on the BACK, not its mere presence
  // (until 18.10.2026 `Boolean(params?.notch)` refused every band).
  const n = notchOf(params, profile);
  const fp = n ? recessNotchFootprint(W, H, n.w, n.h, n.corner) : null;
  const geo = recessRefusal(W, D, H, G, ext.x0, ext.x1, ext.z0, ext.z1, ext.d, fp, K);
  if (geo) return say(geo);
  // D14: a wall unit's hanger cut-out the window reaches steps in beside it
  // (as the notch's does); one that has nowhere left to go is a refusal.
  const cutoutLayer = profile.wallUnit?.hangers?.cutoutLayer;
  const bk = (parent.panels || []).find((p) => p.id === 'BACK');
  // T79 F8: a full-height notch at a back-left corner re-origined the parent's
  // BACK by its width (notchDrills); its pockets are read back in carcass x.
  const backDx = n && notchBackP(n.corner) && notchLeftP(n.corner) && notchFullP(H, n.h) ? n.w : 0;
  if (cutoutLayer && bk?.cnc?.pockets) {
    const window = recessWindow(W, H, G, ext.x0, ext.x1, ext.z0, ext.z1);
    for (const k of bk.cnc.pockets) {
      if (k.layer !== cutoutLayer) continue;
      if (!hangerCutoutStepped(backDx ? { ...k, x1: k.x1 + backDx, x2: k.x2 + backDx } : k, window, W)) {
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

/**
 * T79 F8 · the corners the 3-D takes out of a board, in order, as ONE
 * `cnc.notch` chained through `also` (engine/notch.js cutNotchCorner applies
 * them one after the other); null when there is none.
 */
function chainCorners(...corners) {
  const list = [];
  for (let c = corners.shift(); c !== undefined; c = corners.shift()) {
    if (!c) continue;
    const { also, ...own } = c;
    list.push(own);
    if (also) corners.unshift(also);
  }
  if (!list.length) return null;
  return list.reduceRight((tail, c) => (tail ? { ...c, also: tail } : c), null);
}

/** T79 F8 · a board's marks less its CORNER_4MM ones: the outline both cut gives them again, once. */
function withoutCornerMarks(marks, pz) {
  const layer = pz?.layers?.cornerMark || 'CORNER_4MM';
  return (marks || []).filter((m) => m?.layer !== layer);
}

// ── PHASE A: after the carcass and the interior, before the drilling ──────

/**
 * Cut the boards. Mutates `panels` in place and returns the record PHASE B
 * needs; null when the unit asks for no extension. As the notch does, every
 * board that keeps its frame is cut in it, and BUR (whose frame runs from the
 * BACK) is cut in its ORIGINAL frame with the bump at negative x, so the
 * drilling pass sets out as on the parent; PHASE B then re-origins it.
 *
 * T79 F8 (KIT_RECESS.lsp D13): `notchCut` is engine/notch.js notchCarcass's
 * record when the unit carries a notch as well (its footprint apart from the
 * band, the verdict made sure). The notch has cut first; a board it cut that
 * the band reaches too is cut by section H's routines (both outlines, the
 * joints run by run), the BACK is cut from the notched BACK (the notch's
 * re-origin of it is taken over here, its region re-stated piece by piece),
 * and the extension's FLOOR and LID are EXT-FLOOR and EXT-LID. Null: every
 * line below is what it was.
 */
export function extensionCarcass({
  params, profile, panels, W, H, D, G, jointInset, codes, makePanel, notchCut = null,
}) {
  const ext = extensionOf(params);
  if (!ext) return null;
  const nc = notchCut || null;
  const pz = profile.puzzle;
  const K = notchProfile(profile);
  // 17.10.2026 (D18): the cutter radius no longer sets out a dog bone here; the
  // re-entrant corners get the CORNER_4MM mark, `leg` long each way.
  const leg = notchP(K, 'cnc.cornerMarkLeg');
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
  const sjAlone = recessSideJoints(D, H, G, ez0, ez1, ed, K);
  // T79 F8 (D13): a side a BOXED notch cut as well (a part-height notch, its
  // height apart from the band's) takes both outlines and its joints run by run.
  const sideBoth = (id) => Boolean(nc && nc.boxed && nc.sideId === id);
  const sideJoints = (id) => (sideBoth(id)
    ? recessNotchedSideJoints(D, H, G, ez0, ez1, ed, nc.nw, nc.nd, nc.nh, nc.corner, K)
    : sjAlone);
  for (const [id, grows, bur] of [['BUL', left, false], ['BUR', right, true]]) {
    if (!grows) continue;
    const side = byId(id);
    if (!side || side.part !== id) continue;
    const S = notchScrewAxis(G);
    const both = sideBoth(id);
    const sj = sideJoints(id);
    const sideOutline = both
      ? recessNotchedSideOutline(D, H, G, ez0, ez1, ed, nc.nw, nc.nd, nc.nh, nc.corner)
      : recessSideOutline(D, H, G, ez0, ez1, ed, false);
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
      const outline = sideOutline;
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
      // 17.10.2026 (D18): the CORNER_4MM marks on the NOMINAL outline (the tabs
      // are not on it), no dog bone (recessSideDogbones stays the record).
      let nominal = outline;
      if (bur) {
        // Into BUR's ORIGINAL frame (x from the old back edge): the bump at negative x.
        pts = pts.map(([x, y]) => [sideW - x, y]).reverse();
        bones = bones.map((k) => ({ ...k, x1: sideW - k.x2, x2: sideW - k.x1 }));
        nominal = outline.map(([x, y]) => [sideW - x, y]).reverse();
      }
      geom = {
        outline: pts,
        pockets: [...bones, ...sockets.pockets],
        holes: [...sockets.holes, ...screws],
        // T79 F8: on a side both cut the notch's own mark is in `nominal` again.
        marks: [...(both ? withoutCornerMarks(side.cnc?.marks, pz) : (side.cnc?.marks || [])), ...cornerMarkRecords(nominal, leg, pz)],
      };
    }
    // T79 F8: the notch's corner last, in the side's own frame inside the
    // grown board (fw its depth, ox where it stands: BUR's runs from the new
    // back edge, the old one ed in), after the bump's corners.
    const notchCorner = both ? {
      fc: notchSideFc(nc.corner, bur, nc.top), nw: roundTo(nc.nd, 4), nh: roundTo(nc.hh, 4),
      fw: roundTo(sideW, 4), ...(bur ? { ox: roundTo(ed, 4) } : {}),
    } : null;
    side.cnc = { ...side.cnc, ...geom, notch: both ? chainCorners(sideCorners(H, bz0, bz1, ed, bur), notchCorner) : sideCorners(H, bz0, bz1, ed, bur) };
    side.w = roundTo(sideW + ed, 4);
    side.area_m2 = polygonArea(sideOutline) / 1e6;
    // The box grows in PHASE B: the drilling pass reads a side's box depth for
    // its pin columns (shelfBearers.js pinColumns), and sets out as on the parent.
    if (bur) cut.reorigin.BUR = { dx: -ed, run: sideW + ed };
    else side.cnc.drawn_w = roundTo(sideW + ed, 4);
    cut.grown.push(id);
    stamp(side, { cut: 'side', run: roundTo(sideW + ed, 4) });
  }

  // ── THE TOP AND THE BOTTOM THAT GROW ──
  // T79 F8 (D13): a board the notch cut too (`nc.regions` names it) takes the
  // bump less the notch's corner, and its joints run by run.
  const planBoth = (id) => Boolean(nc && nc.regions?.[id]);
  const topJoints = (id) => (planBoth(id)
    ? recessNotchedTopJoints(W, D, G, ex0, ex1, ed, nc.nw, nc.nd, nc.corner, K)
    : recessTopJoints(W, D, G, ex0, ex1, ed, K));
  if (top || floor) {
    const drawnW = sideW + ed;
    // 17.10.2026 (D18): the CORNER_4MM marks on the drawn nominal outline, no
    // dog bone (recessTopDogbones stays the record of where the circle stood).
    for (const id of [...(top ? ['TOP'] : []), ...(floor ? ['BOTTOM'] : [])]) {
      const p = byId(id);
      if (!p || p.part !== id) continue;
      const plan = planBoth(id)
        ? recessNotchedTopOutline(W, D, G, ex0, ex1, ed, nc.nw, nc.nd, nc.corner)
        : recessTopOutline(W, D, G, ex0, ex1, ed);
      const drawn = notchRot90Pts(plan, drawnW);
      const tj = topJoints(id);
      const runs = [
        { edge: 'bottom', at: 0, centres: tj.LEFT.map((y) => drawnW - y) },
        { edge: 'top', at: tw, centres: tj.RIGHT.map((y) => drawnW - y) },
        { edge: 'left', at: ed, centres: tj.BACK },
      ];
      // The notch's region (its drawn frame, x from the old back edge) moves
      // with the frame: x from the bump's back edge is ed further.
      if (planBoth(id)) nc.regions[id] = { ...nc.regions[id], ox: roundTo(ed, 4) };
      p.cnc = {
        ...p.cnc,
        drawn_w: roundTo(drawnW, 4),
        outline: outlineWithTabs(drawn, runs, G, pz),
        pockets: tabBones(runs, G, pz),
        holes: [],
        marks: cornerMarkRecords(drawn, leg, pz),
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
    // T79 F8 (D13): the notch reaches the BACK at a back corner only; its
    // footprint shortens the pieces (full height) or takes a corner of the
    // piece that holds it, and a BOXED one keeps the rows off its box.
    const backFp = nc && nc.back ? recessNotchFootprint(W, H, nc.nw, nc.nh, nc.corner) : null;
    const nb = backFp && nc.boxed ? backFp : null;
    const pieces = recessNotchedBackPieces(W, H, G, ex0, ex1, ez0, ez1, backFp);
    // A side that grows carries its tabs on its straight runs; the other keeps the parent's
    // (T79 F8: the notch's, on the side the notch cut).
    const parentTabs = notchReplanTabs(H, notchP(K, 'puzzle.tabCentresFromEnd'), notchP(K, 'puzzle.singleTabAtOrBelow'), notchP(K, 'puzzle.middleTabBelow'));
    const sideTabs = (id, grows) => {
      if (grows) return sideJoints(id)['BACK-TABS'];
      if (nc && nc.sideId === id) return notchSideJoints(D, H, G, nc.nw, nc.nd, nc.nh, nc.corner, K)['BACK-TABS'];
      return parentTabs;
    };
    const plainTopTabs = notchShift(notchReplanSockets(tw, notchP(K, 'puzzle.tabCentresFromEnd'), notchP(K, 'puzzle.singleSocketBelow')), G);
    // The TOP's (BOTTOM's) back sockets as that board is cut: grown, notched, both, or the parent's.
    const planTabs = (id, grows) => {
      if (grows) return notchShift(topJoints(id).BACK, G);
      if (planBoth(id)) return notchShift(notchTopJoints(W, D, G, nc.nw, nc.nd, nc.corner, K).BACK, G);
      return plainTopTabs;
    };
    const topTabs = planTabs('TOP', top);
    const botTabs = planTabs('BOTTOM', floor);
    const cutoutLayer = profile.wallUnit?.hangers?.cutoutLayer;
    const hangerCuts = (bk.cnc?.pockets || []).filter((k) => cutoutLayer && k.layer === cutoutLayer)
      .map((k) => hangerCutoutStepped(k, window, W)).filter(Boolean);
    const parentCnc = bk.cnc;
    // T79 F8: every piece's box from the PARENT's (the first piece of a
    // notched BACK starts past the notch, not at 0, and resets bk.box).
    const parentBox = bk.box;
    const notchRegion = nc?.regions?.BACK || null;
    pieces.forEach((piece, i) => {
      const [px0, pz0, px1, pz1] = piece;
      const bw = px1 - px0;
      const bh = pz1 - pz0;
      const pc = recessBackCut(piece, window);
      const kind = pc ? recessCutKind(pc, bw, bh) : null;
      // T79 F8: a part-height notch's corner on the piece that holds it.
      const ncn = recessNotchedBackCorner(piece, backFp);
      const outline = recessNotchedBackOutline(piece, pc, ncn);
      const bj = recessBackJoints(piece, window, W, H, G, ex0, ex1, ez0, ez1, topTabs, botTabs, sideTabs('BUL', left), sideTabs('BUR', right), K, nb);
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
          // CHAT FIX 19.10.2026 (KIT_RECESS.lsp D9 amended; the owner: *"czy
          // mozesz sie upewnic na milion procent ze wszystkie elementy sa
          // zamkniete?"*): the window lies wholly INSIDE the board, so it is a
          // CUT-OUT and is traced CLOCKWISE (cnc/dxf.js, T25 F1.2: the signal
          // VCarve reads for which side the material is on). Until tonight it
          // ran anticlockwise, the outline's way, and the export gate's Check
          // #9 said so in red on every recess with a window.
          ...(kind === 'window' ? [{ layer: RECESS_WINDOW_LAYER, x1: roundTo(pc[0], 4), y1: roundTo(pc[1], 4), x2: roundTo(pc[2], 4), y2: roundTo(pc[3], 4), depth: G, cutout: true }] : []),
        ],
        // 17.10.2026 (D18): a bite's two corners and a corner cut's one get the
        // mark, not the bone; a window is a pocket with round corners (D9).
        // T79 F8: an UNBOXED notch (a rebate) drops the rows it cuts away, as
        // on the BACK alone (KIT_NOTCH.lsp D7).
        holes: nc && !nc.boxed && ncn
          ? sockets.holes.filter((hl) => !notchHoleInP(hl.x, hl.y, (Number(hl.d) || 0) / 2, bw, bh, ncn[1], ncn[2], ncn[0]))
          : sockets.holes,
        marks: [...(nc ? withoutCornerMarks(parentCnc?.marks, pz) : (parentCnc?.marks || [])), ...cornerMarkRecords(outline, leg, pz)],
        notch: chainCorners(
          kind === 'corner' ? notchCornerOfOutline(recessBackOutline(piece, pc), bw, bh) : null,
          ncn ? { fc: ncn[0], nw: roundTo(ncn[1], 4), nh: roundTo(ncn[2], 4) } : null,
        ),
        ...(kind === 'bite' ? { bite: { x0: roundTo(pc[0], 4), y0: roundTo(pc[1], 4), x1: roundTo(pc[2], 4), y1: roundTo(pc[3], 4) } } : {}),
      };
      if (kind !== 'bite') delete cnc.bite;
      // T79 F8: the notch's region on this piece, in the piece's frame (the
      // BACK's own stood in carcass x), for its drop law in PHASE B.
      if (notchRegion) nc.regions[i === 0 ? 'BACK' : 'BACK-2'] = { ...notchRegion, ox: roundTo(-px0, 4), oy: roundTo(-pz0, 4) };
      const box = { ...parentBox, x: roundTo(parentBox.x + px0, 4), y: roundTo(parentBox.y + pz0, 4), w: roundTo(bw, 4), h: roundTo(bh, 4) };
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
    // T79 F8: every piece already stands in its own frame; the notch's
    // re-origin of the whole BACK (a full-height notch) would move it twice.
    if (nc?.reorigin?.BACK) delete nc.reorigin.BACK;
  }

  // ── THE ADDED BOARDS: RETURN-L, RETURN-R, FLOOR, LID, EXT-BACK ──
  const places = recessBoxPlaces(W, D, H, G, ex0, ex1, ez0, ez1, ed);
  const boxOf = ([x0, y0, z0, x1, y1, z1]) => ({
    x: roundTo(x0, 4), y: roundTo(z0, 4), z: roundTo(D - y1, 4),
    w: roundTo(x1 - x0, 4), h: roundTo(z1 - z0, 4), d: roundTo(y1 - y0, 4),
  });
  const board = (id, part, w, h, place, screws, drilled = false) => {
    const rows = (screws || []).map(([x, y]) => [roundTo(x, 4), roundTo(y, 4)]);
    const geom = rectGeometry(w, h);
    // 18.10.2026 (D17 amended): a back's rows are DRILLED, dia 3 on the screw layer.
    if (drilled) geom.holes = rows.map(([x, y]) => ({ layer: pz.layers.screw, kind: 'screw', x, y, d: pz.screwDiameter }));
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
      cnc: { rotated: false, drawn_w: w, drawn_h: h, ...geom },
      meta: {
        // Outline only, no puzzle joint, no machined hole (KIT_RECESS.lsp D11):
        // the extension's fixing is the joiner's. 18.10.2026 (D17 amended): the
        // EXT-BACK is a back, drilled with its rows, and is a cut part.
        ...(drilled ? {} : { readiness: 'geometry', fixing: 'manual' }),
        extension: { x0: ex0, x1: ex1, z0: ez0, z1: ez1, d: ed, board: id, screws: rows },
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
  // T79 F8 (D13): on a notched carcass EXT-FLOOR and EXT-LID (recessBoxName),
  // the notch's box carrying a LID (and from the top a FLOOR) of its own.
  if (places.FLOOR) board(recessBoxName('FLOOR', Boolean(nc)), 'RECESS-FLOOR', lid[0], lid[1], places.FLOOR, lidScrews);
  if (places.LID) board(recessBoxName('LID', Boolean(nc)), 'RECESS-LID', lid[0], lid[1], places.LID, lidScrews);
  const eb = recessExtBack(ex0, ex1, ez0, ez1);
  board('EXT-BACK', 'RECESS-BACK', eb[0], eb[1], places['EXT-BACK'], recessExtBackScrews(W, H, G, ex0, ex1, ez0, ez1, K), true);

  // ── SHELVES IN THE BAND (D10) ──
  // 17.10.2026 (D16): the FIXED shelf grows like any other (the owner: *"nie
  // wycina polek fix, czego nie rozumiem"*; D10 names a shelf, any shelf). Its
  // joint stays the parent's, on the parent's depth; nothing new in the grown part.
  // 17.10.2026 (D15): a bay shelf takes only the part of the band it stands
  // under (recessShelfBump clamps); one the band does not reach is the parent's.
  // 17.10.2026 (D16, 10:35): the bump is cut with the shelf's OWN clearance,
  // the notch's grammar: 0 for a FIXED shelf (it runs face to face), wc / 2 for
  // an adjustable one. The owner: *"dlaczego polka fix ma minimalne zalamanie?"*
  for (const p of panels) {
    if (p.part !== 'SHELF' || !p.box) continue;
    if (!recessShelfInP(p.box.y, G, H, ez0, ez1)) continue;
    const { rect } = planOf(p.box, D);
    const shelf = [rect[0], rect[1], rect[2], rect[3]];
    const clr = recessShelfClr(p.meta?.variant === 'fixed', K);
    const [bw, bh, b0, b1] = recessShelfBump(W, D, G, ex0, ex1, ed, shelf, K, clr);
    if (!(b1 - b0 > 0)) continue;
    // T79 F8 (D13): a shelf the notch cut too (`nc.regions` names it) takes the
    // bump less the notch's corner; its region (x from the front) stands.
    const both = Boolean(nc && nc.regions?.[p.id]);
    const plan = both
      ? recessNotchedShelfOutline(W, D, G, ex0, ex1, ed, shelf, clr, nc.nw, nc.nd, nc.corner, K)
      : recessBumpOutline(bw, bh, b0, b1, ed);
    // Drawn `depth x width`, x from its FRONT edge: the plan transposed (a
    // reflection), the walk reversed to stay anticlockwise (the notch's way).
    const drawn = recessTranspose(plan);
    const drawnW = bh + ed;
    // 17.10.2026 (D18): the CORNER_4MM marks on the drawn outline, no dog bone.
    p.cnc = {
      ...p.cnc,
      drawn_w: roundTo(drawnW, 4),
      drawn_h: roundTo(bw, 4),
      outline: drawn,
      marks: [...(both ? withoutCornerMarks(p.cnc?.marks, pz) : (p.cnc?.marks || [])), ...cornerMarkRecords(drawn, leg, pz)],
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
      // T79 F8 · the CORNER_4MM marks move with the board (shiftGeom moves the
      // outline, the pockets and the holes, never the marks): until then a
      // grown BUR's marks stood ed off its corners in the DXF, the bump's and,
      // both cut, the notch's (KIT_RECESS.lsp: BUR's frame from the back).
      p.cnc = {
        ...p.cnc, ...shiftGeom(p.cnc, -ro.dx, 0), drawn_w: roundTo(ro.run, 4),
        ...(Array.isArray(p.cnc.marks) ? { marks: p.cnc.marks.map((m) => shiftMark(m, -ro.dx, 0)) } : {}),
      };
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
    ...(cut.ext.ends ? { ends: [...cut.ext.ends] } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Z2. THE END PANEL FOLLOWS ITS SIDE (KIT_NOTCH.lsp D23, KIT_RECESS.lsp D21)
// ═══════════════════════════════════════════════════════════════════════════
//
// The owner, 18.10.2026: *"nie wycina mi panelu bocznego do recess a powinno."*
// ONE path for the three cuts, called once after notchCarcass, edgeNotchCarcass
// and extensionCarcass: each END panel takes the cuts its side took (the corner
// notch's, the edge notch's, the recess's corners with its frame grown by ed
// where the band reaches past it, a back cut then measured from the grown back
// edge) and is cut by ONE walk round them (notchEndOutline). Its numbers are
// read off its own box, built as the parent's END. Wholly inside a recess
// (recess_mm, its box already reaching the recess back) the same recess cut
// keeps it to the wall line wherever the recess's own bottom or top falls
// within its height (`recess_band`, the room's answer). A unit with no END
// panel, or none of the cuts, reaches no line of it.

const END_SIDES = { L: 'BUL', R: 'BUR' };

/** Is fc the END panel's BACK edge? END-L runs from the front (back = x1), END-R from the back (x0). */
const endBackFc = (fc, hand) => fc.slice(0, 2) === (hand === 'R' ? 'x0' : 'x1');

/**
 * The 3-D's record of the cut corners (`cnc.notch`, a chain of `also`), named
 * on the kept box; null with no corner, or where two cuts share a corner (a
 * stepped corner: the outline holds it, `cutNotchCorner` cannot).
 */
function endCornerRecord(bw, bh, cuts, box) {
  const corners = edgeNotchCorners(bw, bh, cuts, box);
  if (!corners.length || new Set(corners.map((c) => c[0])).size !== corners.length) return null;
  return corners.reduceRight((also, [fc, w, h]) => {
    const rec = { fc, nw: roundTo(w, 4), nh: roundTo(h, 4) };
    return also ? { ...rec, also } : rec;
  }, null);
}

/** Cut every END panel by its side's cuts. Mutates `panels` in place; the summary of what each took, or null. */
export function endPanelsFollowSides({
  params, panels, notchCut, edgeNotchCut, extensionCut, H, D, G, profile,
}) {
  // Wholly inside (D21): the recess's own bottom and top the room handed down, where it has them.
  const own = (v) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const whole = Math.max(0, Number(params?.recess_mm) || 0);
  const band = whole && params?.recess_band ? { rz0: own(params.recess_band.rz0), rz1: own(params.recess_band.rz1) } : null;
  const inside = band && (band.rz0 != null || band.rz1 != null) ? band : null;
  if (!notchCut && !edgeNotchCut && !extensionCut && !inside) return null;
  const pz = profile.puzzle;
  const leg = notchP(notchProfile(profile), 'cnc.cornerMarkLeg');
  const said = {};
  for (const p of panels) {
    if (p.part !== 'END-PANEL' || !p.box) continue;
    const hand = p.meta?.side === 'right' ? 'R' : 'L';
    const sideId = END_SIDES[hand];
    // Its numbers in the carcass's words (KIT_NOTCH.lsp D23).
    const ew = p.box.d;
    const ph = p.box.h;
    const sb = -p.box.z;
    const sf = p.box.z + p.box.d - D;
    const pb = -p.box.y;
    const ext = extensionCut?.ext;
    const grow = extensionCut?.grown.includes(sideId) && ext?.ends?.includes(hand) ? extensionCut.ed : 0;
    const back = (c) => (grow && endBackFc(c[0], hand) ? [c[0], c[1] + grow, c[2]] : c);
    const cuts = [];
    const by = [];
    if (grow) {
      cuts.push(...recessEndCuts(H, extensionCut.ez0, extensionCut.ez1, grow, hand, ph, pb, ext.rz0 ?? null, ext.rz1 ?? null));
      by.push('recess');
    } else if (inside) {
      const c = recessEndCuts(H, 0, H, whole, hand, ph, pb, inside.rz0, inside.rz1);
      if (c.length) { cuts.push(...c); by.push('recess'); }
    }
    if (notchCut) {
      const n = notchCut.notch;
      const c = notchEndCut(H, G, n.w, n.d, n.h, n.corner, hand, sb, sf, ph, pb);
      if (c) { cuts.push(back(c)); by.push('notch'); }
    }
    if (edgeNotchCut) {
      cuts.push(back(edgeNotchEndCut(H, G, edgeNotchCut.ed, edgeNotchCut.eh, edgeNotchCut.edge, hand, sb, sf, ph, pb)));
      by.push('edgeNotch');
    }
    if (!by.length) continue;
    const bw = ew + grow;
    const cut = notchEndOutline(bw, ph, cuts);
    if (!cut) continue;
    const [x0, y0, x1, y1] = cut.box;
    const w = x1 - x0;
    const h = y1 - y0;
    // The kept box in the carcass: END-L's x runs back from its front face, END-R's forward from its (grown) back.
    const zFront = p.box.z + p.box.d;
    const zBack = p.box.z - grow;
    const [z0, z1] = hand === 'L' ? [zFront - x1, zFront - x0] : [zBack + x0, zBack + x1];
    const pts = r4pts(cut.pts);
    p.w = roundTo(w, 4);
    p.h = roundTo(h, 4);
    p.box = { ...p.box, y: roundTo(p.box.y + y0, 4), z: roundTo(z0, 4), h: roundTo(h, 4), d: roundTo(z1 - z0, 4) };
    p.cnc = {
      ...p.cnc,
      outline: pts,
      drawn_w: roundTo(w, 4),
      drawn_h: roundTo(h, 4),
      marks: [...(p.cnc?.marks || []), ...cornerMarkRecords(pts, leg, pz)],
      notch: endCornerRecord(bw, ph, cuts, cut.box),
    };
    p.area_m2 = roundTo(polygonArea(pts) / 1e6, 6);
    // A rectangle less its corners has the rectangle's perimeter: every edge is banded (codes.all).
    p.edging = { ...p.edging, len_m: roundTo((2 * (w + h)) / 1000, 6) };
    p.meta = {
      ...(p.meta || {}),
      followsSide: { side: sideId, by, ...(grow ? { grown: roundTo(grow, 4) } : {}), outline: pts },
    };
    said[p.id] = { side: sideId, by };
  }
  return Object.keys(said).length ? said : null;
}
