// ─── T75 F4 · THE TRUE L CARCASS, THE LISP MIRRORED LINE FOR LINE ──────────
//
// The owner's recorded rule (Petros, 23.09.2026, list 11):
//
//   *"one L-shaped board cut on the CNC, flat-face door overlap, no 45° cuts."*
//
// and the order of 9.10.2026, *"lisp najpierw"*. The law is
// `reference/lisp/KIT_CORNER_L.lsp`, written and paren-balanced before this
// file existed. Every function below is one `CL:` defun of that file, under the
// same name with the prefix spelled `cl`, doing the same arithmetic in the same
// order; the profile numbers it reads are the paths the LISP's `CL:profile`
// names. Nothing here is invented: where the LISP calls COMMON (`SKY:tabCentres`,
// the socket set-out), this calls the engine's own copy of it (`puzzle.js
// tabCentres`, `socketCentres`, `resolvedJointInset`), which is what COMMON is
// in this repo.
//
// THE FRAME is the LISP's (section 1): origin the room corner, x along the
// unit's own wall (wall A), y along the adjacent wall (wall B), z up. Every
// board's outline is returned in that board's OWN frame, nominal, CCW. Placing
// the boards in a cabinet's box frame, and the two hands, is `cabinet.js`'s L
// builder; this file only states the boards.
//
// Pure functions and pure data. No React, no store, no three.js.

import { resolvedJointInset, socketCentres, tabCentres } from './puzzle.js';

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/** CL:axis: the socket and screw axis, half the board (turn 24, puzzle.js `G / 2`). */
const clAxis = (G) => G / 2;

/** CL:cutterRadius: the cutter's radius (engine/cnc/rollover.js toolRadius). */
const clCutterRadius = (P) => num(P?.cnc?.toolDiameter, 8) / 2;

/** CL:validP: is it an L at all? Both arms must reach past the corner square. */
function clValidP(outW, outD, armD, G) {
  return armD > G && outW > armD + G && outD > armD + G;
}

/**
 * CL:lOutline: the L inset from the carcass footprint, in the board's own frame
 * (origin at its inner back corner), six vertices, CCW; v3 is the inner corner.
 */
function clLOutline(outW, outD, armD, backIn, sideIn, frontIn) {
  const spanX = outW - backIn - sideIn;
  const spanY = outD - backIn - sideIn;
  const arm = armD - backIn - frontIn;
  return [[0, 0], [spanX, 0], [spanX, arm], [arm, arm], [arm, spanY], [0, spanY]];
}

/** CL:lShelf: the shelf's L, the profile's clearances, half the width clearance a side. */
function clLShelf(outW, outD, armD, G, P) {
  return clLOutline(outW, outD, armD, G,
    G + num(P.carcass.shelfWidthClearance) / 2,
    num(P.carcass.shelfDepthClearance));
}

/** CL:area: the shoelace walk. */
function clArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(s) / 2;
}

/** CL:lFrontLen: the two FRONT edges (v2 -> v3 -> v4), the banding. */
function clLFrontLen(pts) {
  return (pts[2][0] - pts[3][0]) + (pts[4][1] - pts[3][1]);
}

/** CL:innerRelief: the dog-bone circle at v3, r / sqrt 2 off the vertex on the bite's bisector. */
function clInnerRelief(pts, r) {
  const v = pts[3];
  const k = r / Math.sqrt(2);
  return { cx: v[0] + k, cy: v[1] + k, r };
}

/**
 * CL:tabWalk: KIT_BUD's tab stated once in the edge's own frame (u along, n
 * outward = (dy, -dx)) and walked onto the edge at each centre.
 */
function clTabWalk(ax, ay, dx, dy, centres, G, pz) {
  const nx = dy;
  const ny = -dx;
  const o = pz.tabHalfOpening;
  const tw = pz.tabHalfWidth;
  const s = pz.shoulderDepth;
  const out = [];
  for (const c of centres) {
    for (const [u, n] of [[c - tw, 0], [c - o, 0], [c - o, s], [c - tw, s], [c - tw, G],
      [c + tw, G], [c + tw, s], [c + o, s], [c + o, 0], [c + tw, 0]]) {
      out.push([ax + dx * u + nx * n, ay + dy * u + ny * n]);
    }
  }
  return out;
}

/** CL:tabBones: each tab's dog bone, u c +- 30, n 0..G, as a min/max rectangle. */
function clTabBones(ax, ay, dx, dy, centres, G, pz) {
  const nx = dy;
  const ny = -dx;
  const bh = pz.dogboneHalfHeight;
  const out = [];
  for (const c of centres) {
    const x1 = ax + dx * (c - bh);
    const y1 = ay + dy * (c - bh);
    const x2 = ax + dx * (c + bh) + nx * G;
    const y2 = ay + dy * (c + bh) + ny * G;
    out.push([Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)]);
  }
  return out;
}

/** CL:walkOutline: each vertex once, then the tabs of the edge leaving it. */
function clWalkOutline(pts, joints, G, pz) {
  const out = [];
  pts.forEach((p, i) => {
    out.push(p);
    const j = joints[i];
    if (j) out.push(...clTabWalk(j[0], j[1], j[2], j[3], j[4], G, pz));
  });
  return out;
}

/** CL:walkBones. */
function clWalkBones(joints, G, pz) {
  const out = [];
  for (const j of joints) if (j) out.push(...clTabBones(j[0], j[1], j[2], j[3], j[4], G, pz));
  return out;
}

/** CL:lTop: TOP-L / BOTTOM-L, backIn G, sideIn G, frontIn 0. */
function clLTop(outW, outD, armD, G) {
  return clLOutline(outW, outD, armD, G, G, 0);
}

/** CL:lTopJoints: four jointed edges, two plain fronts (LISP section 4). */
function clLTopJoints(outW, outD, armD, G, pz) {
  const pts = clLTop(outW, outD, armD, G);
  const spanX = pts[1][0];
  const arm = pts[2][1];
  const spanY = pts[5][1];
  const e = pz.tabCentresFromEnd;
  const ins = resolvedJointInset(armD, pz);
  return [
    [0, 0, 1, 0, socketCentres(spanX, pz, e)],        // v0->v1 back edge, into BACK-A
    [spanX, 0, 0, 1, socketCentres(arm, pz, ins)],    // v1->v2 arm A end, into SIDE-A
    null,                                             // v2->v3 front of arm A, plain
    null,                                             // v3->v4 front of arm B, plain
    [arm, spanY, -1, 0, socketCentres(arm, pz, ins)], // v4->v5 arm B end, into SIDE-B
    [0, spanY, 0, -1, socketCentres(spanY, pz, e)],   // v5->v0 back edge, into BACK-B
  ];
}

/** CL:backBOutline: (D - G) x H; local X = room y - G, Y = z. */
function clBackBOutline(outD, H, G) {
  const len = outD - G;
  return [[0, 0], [len, 0], [len, H], [0, H]];
}

/** CL:backBJoints: only the edge leaving (0 H), walked DOWN the corner end, is tabbed. */
function clBackBJoints(outD, H, G, pz) {
  return [null, null, null, [0, H, 0, -1, tabCentres(H, pz)]];
}

/** CL:edgeScrewYs: one in from each end and one between every pair of tabs. */
function clEdgeScrewYs(H, tc, pz) {
  const sfe = pz.screwFromEnd;
  const out = [sfe];
  for (let i = 1; i < tc.length; i += 1) out.push((tc[i - 1] + tc[i]) / 2);
  out.push(H - sfe);
  return out;
}

/** CL:backBPockets: the far-end sockets (SIDE-B) and the top/bottom sockets (the L's back edge). */
function clBackBPockets(outD, H, G, pz) {
  const len = outD - G;
  const run = outD - G - G;
  const ax = clAxis(G);
  const ov = pz.socketOvershoot;
  const sh = pz.socketHalfWidth;
  const out = [];
  for (const c of tabCentres(H, pz)) out.push([pz.layers.socket, len - ax, c - sh, len + ov, c + sh]);
  for (const c of socketCentres(run, pz, pz.tabCentresFromEnd)) {
    out.push([pz.layers.socket, c - sh, H - ax, c + sh, H + ov]);
    out.push([pz.layers.socket, c - sh, -ov, c + sh, ax]);
  }
  return out;
}

/** CL:backBHoles: the socket holes 1 mm inside the pockets, the far-end and top/bottom screw rows. */
function clBackBHoles(outD, H, G, pz) {
  const len = outD - G;
  const run = outD - G - G;
  const ax = clAxis(G);
  const hi = pz.socketHoleInset;
  const ho = pz.socketHoleOffset;
  const hd = pz.socketHoleDiameter;
  const sd = pz.screwDiameter;
  const sfe = pz.screwFromEnd;
  const tc = tabCentres(H, pz);
  const out = [];
  for (const c of tc) {
    out.push([pz.layers.socketHole, 'puzzle', (len - ax) + hi, c - ho, hd]);
    out.push([pz.layers.socketHole, 'puzzle', (len - ax) + hi, c + ho, hd]);
  }
  for (const c of socketCentres(run, pz, pz.tabCentresFromEnd)) {
    out.push([pz.layers.socketHole, 'puzzle', c - ho, (H - ax) + hi, hd]);
    out.push([pz.layers.socketHole, 'puzzle', c + ho, (H - ax) + hi, hd]);
    out.push([pz.layers.socketHole, 'puzzle', c - ho, ax - hi, hd]);
    out.push([pz.layers.socketHole, 'puzzle', c + ho, ax - hi, hd]);
  }
  for (const y of clEdgeScrewYs(H, tc, pz)) out.push([pz.layers.screw, 'screw', len - ax, y, sd]);
  for (const x of [sfe, run / 2, run - sfe]) {
    out.push([pz.layers.screw, 'screw', x, H - ax, sd]);
    out.push([pz.layers.screw, 'screw', x, ax, sd]);
  }
  return out;
}

/** CL:legPositions: the six legs, each its min corner in the ROOM frame. */
function clLegPositions(outW, outD, armD, G, P) {
  const lw = num(P.legs.width);
  const fi = num(P.legs.insetFromFront);
  const bi = num(P.legs.insetFromBack);
  return [
    { name: 'L1', x: bi, y: bi, role: 'back' },                                  // the room corner
    { name: 'L2', x: outW - G - lw, y: bi, role: 'back' },                       // SIDE-A, against wall A
    { name: 'L3', x: outW - G - lw, y: armD - fi - lw, role: 'front' },          // SIDE-A, front end of arm A
    { name: 'L4', x: armD - fi - lw, y: armD - fi - lw, role: 'front' },         // the inner corner
    { name: 'L5', x: armD - fi - lw, y: outD - G - lw, role: 'front' },          // SIDE-B, front end of arm B
    { name: 'L6', x: bi, y: outD - G - lw, role: 'back' },                       // SIDE-B, against wall B
  ];
}

/** CL:hangerSide: KIT_WUD's two holes, drawBUL ('L') or drawBUR ('R') frame. */
function clHangerSide(sideW, H, side, P) {
  const HG = P.wallUnit.hangers;
  const [a1, a2] = HG.fromBackEdge;
  const ft = HG.fromTop;
  const hd = HG.holeDiameter;
  return side === 'L'
    ? [[sideW - a1, H - ft, hd], [sideW - a2, H - ft, hd]]
    : [[a1, H - ft, hd], [a2, H - ft, hd]];
}

/** CL:hangerBack: the 30 x 58 cut-out at a back's FAR top corner (x = len). */
function clHangerBack(len, H, P) {
  const HG = P.wallUnit.hangers;
  return [len - HG.cutoutWidth, H - HG.cutoutHeight, len, H];
}

/**
 * THE WHOLE KIT, as the LISP's command would draw it: every board in its own
 * frame, the legs in the room frame, and the board list. `mount` is the
 * LISP's version letter: 'B' base, 'W' wall, 'X' wardrobe.
 *
 * @returns {{valid:boolean, refusal:string|null, W, D, d, H, G, ...}}
 */
export function cornerLPlan({
  W, D, d, H, G, mount = 'B',
}, P) {
  const pz = P.puzzle;
  const outW = num(W);
  const outD = num(D);
  const armD = num(d);
  const hgt = num(H);
  if (!clValidP(outW, outD, armD, G)) {
    return {
      valid: false,
      refusal: 'Refused: both arms must reach past the corner square - the width along wall A and along wall B '
        + `must each exceed the arm depth + ${G} mm.`,
      W: outW, D: outD, d: armD, H: hgt, G,
    };
  }
  const r = clCutterRadius(P);
  const nomTop = clLTop(outW, outD, armD, G);
  const jTop = clLTopJoints(outW, outD, armD, G, pz);
  const nomShelf = clLShelf(outW, outD, armD, G, P);
  const backBNominal = clBackBOutline(outD, hgt, G);
  const jBackB = clBackBJoints(outD, hgt, G, pz);
  const sideW = armD - G;
  return {
    valid: true,
    refusal: null,
    W: outW, D: outD, d: armD, H: hgt, G,
    sideW,
    top: {
      nominal: nomTop,
      outline: clWalkOutline(nomTop, jTop, G, pz),
      bones: clWalkBones(jTop, G, pz),
      relief: clInnerRelief(nomTop, r),
      joints: jTop,
      area: clArea(nomTop),
      frontLen: clLFrontLen(nomTop),
      w: nomTop[1][0],
      h: nomTop[5][1],
    },
    shelf: {
      nominal: nomShelf,
      relief: clInnerRelief(nomShelf, r),
      area: clArea(nomShelf),
      frontLen: clLFrontLen(nomShelf),
      w: nomShelf[1][0],
      h: nomShelf[5][1],
      // Where its own frame sits in the room: the LISP draws it at (G, G).
      backIn: G,
    },
    backB: {
      len: outD - G,
      nominal: backBNominal,
      outline: clWalkOutline(backBNominal, jBackB, G, pz),
      bones: clWalkBones(jBackB, G, pz),
      pockets: clBackBPockets(outD, hgt, G, pz),
      holes: clBackBHoles(outD, hgt, G, pz),
    },
    legs: mount === 'W' ? [] : clLegPositions(outW, outD, armD, G, P),
    hangers: mount === 'W' ? {
      sideL: clHangerSide(sideW, hgt, 'L', P),
      sideR: clHangerSide(sideW, hgt, 'R', P),
      backA: clHangerBack(outW, hgt, P),
      backB: clHangerBack(outD - G, hgt, P),
    } : null,
  };
}
