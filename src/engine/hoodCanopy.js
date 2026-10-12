// --- T78 F17 . THE CANOPY HOOD: THE BOARDS THE LISP DRAWS ------------------
//
// The owner, 11.10.2026: *"szafka na hood tradycyjna czyli wysunieta pod
// skosem albo normalna szafka tylko mniejsza zeby bylo 650 do 750 minimum nad
// blatem, nad hobem."*  CLAUDE.md T78 F17: `WUD_HOOD_CANOPY`, *"the
// traditional chimney canopy: a wall-unit carcass whose front slopes out from
// the top to a deeper bottom; the slope angle and the bottom projection in
// `profile.hoodCanopy.defaults` // T78 proposed; no door; the extractor as
// today's hardware line."*
//
// LISP IS LAW: `reference/lisp/KIT_WUD_HOOD_CANOPY.lsp` states every board
// (its sections 3 and 4) and this module mirrors it, board by board, on the
// carcass `computeCabinet` has already cut as a WUD:
//
//   BUL / BUR   TRAPEZOIDS. The parent's board (sideW x H, its sockets, screws,
//               hangers and back tabs) is kept whole and measured from the
//               BACK; the bottom edge grows by the projection P at the FRONT
//               and the front edge becomes the slanted edge from the top front
//               corner to the new bottom front corner (section 4.1).
//   BOTTOM      the parent's board, P deeper at the front; its tabs into the
//               sides are the parent's, the projection is plain (4.3).
//   TOP, BACK   untouched (4.2, 4.4).
//   CANOPY-FRONT  NEW: the sloped front, FRONT material, W x Lblank, both ends
//               bevelled at alpha at the saw (an annotation, T47's roof-board
//               law); it leans in the 3D by UnitView's own tilt grammar (4.5).
//
// WHY THE PARENT'S JOINTS, FROM THE BACK. One law sets out the side-to-bottom
// joint whatever P is: the sides' sockets and the bottom's tabs both stand at
// `tabCentresFromEnd` and `sideW - tabCentresFromEnd` from the back, exactly
// where KIT_WUD puts them, so the projection carries no joint. The engine does
// not recompute a socket here; it MOVES the parent's by P where the frame's
// origin moved (BUL: its x = 0 is the front edge) and leaves them where it did
// not (BUR: its x = 0 is the back edge). `joinery.js panelPlacement` is the
// reason: BUL's drawn x runs from the FRONT (origin box.z + box.d), BUR's from
// the back (origin box.z).
//
// Pure: no profile read beyond what is handed in, no React, no three.js.
// `mkPanel` is `cabinet.js`'s own `panel()` so the new board is shaped by the
// one law every other board is (material role, finish exposure, area).

const roundTo = (v, d = 4) => Math.round(Number(v) * 10 ** d) / 10 ** d;
const r4 = (v) => roundTo(v, 4);

/** The canopy's numbers, read off the profile; the defaults of CLAUDE.md T78 F17 where a profile says nothing. */
export function canopySpec(profile) {
  const d = profile?.hoodCanopy?.defaults || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  return {
    bottomProjectionMm: num(d.bottomProjectionMm, 150),   // T78 proposed, owner to confirm
    heightMm: num(d.height, 500),                           // T78 proposed, owner to confirm
  };
}

/**
 * Section 3 of the LISP: the slope off the vertical, the sloped face and the blank.
 *
 * @param {object} args  { H: the canopy height, P: the projection, frontT: the front's thickness }
 */
export function canopyGeometry({ H, P, frontT }) {
  const h = Number(H) || 0;
  const p = Math.max(0, Number(P) || 0);
  const t = Number(frontT) || 0;
  const slopeRad = h > 0 ? Math.atan2(p, h) : 0;
  const faceLen = Math.sqrt(h * h + p * p);
  const blankLen = faceLen + t * Math.tan(slopeRad);
  return {
    projection: r4(p),
    slopeDeg: r4((slopeRad * 180) / Math.PI),
    slopeRad,
    faceLen: r4(faceLen),
    blankLen: r4(blankLen),
    bevelDeg: r4((slopeRad * 180) / Math.PI),
  };
}

/**
 * Section 4.1: the trapezoid, in the side's own drawn frame.
 *
 *   'L'  x = 0 the bottom FRONT corner, the back at sideW + P
 *   'R'  x = 0 the BACK edge, the bottom front corner at sideW + P
 */
export function canopySidePoints({ sideW, H, P, side }) {
  const w = Number(sideW) || 0;
  const h = Number(H) || 0;
  const p = Math.max(0, Number(P) || 0);
  return side === 'R'
    ? [[0, 0], [w + p, 0], [w, h], [0, h]]
    : [[0, 0], [w + p, 0], [w + p, h], [p, h]];
}

const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-6;

/** Move a parent side's whole geometry by `dx` along its drawn x (BUL only, section 4.1). */
function shiftSideCnc(cnc, dx) {
  if (!cnc || !dx) return cnc;
  return {
    ...cnc,
    outline: (cnc.outline || []).map(([x, y]) => [r4(x + dx), y]),
    pockets: (cnc.pockets || []).map((pk) => ({ ...pk, x1: r4(pk.x1 + dx), x2: r4(pk.x2 + dx) })),
    holes: (cnc.holes || []).map((hole) => ({ ...hole, x: r4(hole.x + dx) })),
    ...(Array.isArray(cnc.grooves) ? { grooves: cnc.grooves.map((g) => ({ ...g, x1: r4(g.x1 + dx), x2: r4(g.x2 + dx) })) } : {}),
  };
}

/**
 * Section 4.1 on the engine's own side panel: the parent's outline is the
 * rectangle with its back tabs; its bottom front corner moves out by P and the
 * closing edge becomes the slant. BUL's frame moves with it (x = 0 is the
 * front), BUR's does not.
 */
function canopySide(side, sideW, H, P, G) {
  const isL = side.part === 'BUL';
  const cnc = isL ? shiftSideCnc(side.cnc, P) : { ...side.cnc };
  const outline = (cnc.outline || []).map(([x, y]) => [x, y]);
  if (isL) {
    // The parent's bottom front corner now sits at (P, 0): it becomes (0, 0).
    const i = outline.findIndex(([x, y]) => near(x, P) && near(y, 0));
    if (i >= 0) outline[i] = [0, 0];
  } else {
    // The parent's bottom front corner (sideW, 0) moves to (sideW + P, 0).
    const i = outline.findIndex(([x, y]) => near(x, sideW) && near(y, 0));
    if (i >= 0) outline[i] = [r4(sideW + P), 0];
  }
  const slopeLen = Math.sqrt(H * H + P * P);
  return {
    ...side,
    w: r4(sideW + P),
    area_m2: (sideW + P) * H / 1e6,
    edging: { ...side.edging, len_m: roundTo(slopeLen / 1000, 6) },
    box: { ...side.box, d: r4(sideW + P) },
    cnc: { ...cnc, drawn_w: r4(sideW + P), outline },
    meta: {
      ...(side.meta || {}),
      canopy: {
        trapezoid: canopySidePoints({ sideW, H, P, side: isL ? 'L' : 'R' }),
        projection: r4(P),
        topDepth: r4(sideW),
        slopeLen: r4(slopeLen),
        shiftedBy: isL ? r4(P) : 0,
        boardThickness: G,
      },
    },
  };
}

/** Section 4.3 on the engine's own bottom board: the two front corners move by P. */
function canopyBottom(bottom, P) {
  const drawnW = Number(bottom.cnc?.drawn_w) || Number(bottom.h) || 0;
  const drawnH = Number(bottom.cnc?.drawn_h) || Number(bottom.w) || 0;
  const outline = (bottom.cnc?.outline || []).map(([x, y]) => (near(x, drawnW) && (near(y, 0) || near(y, drawnH))
    ? [r4(drawnW + P), y]
    : [x, y]));
  return {
    ...bottom,
    h: r4(drawnW + P),
    area_m2: drawnH * (drawnW + P) / 1e6,
    box: { ...bottom.box, d: r4(drawnW + P) },
    cnc: { ...bottom.cnc, drawn_w: r4(drawnW + P), outline },
    meta: { ...(bottom.meta || {}), canopy: { projection: r4(P), parentDepth: r4(drawnW) } },
  };
}

/**
 * THE CANOPY, applied to the carcass `computeCabinet` cut as a WUD.
 *
 * Mutates `panels` (the sides and the bottom are replaced in place, the sloped
 * front is pushed) and `drills` (BUL's are moved by P with its frame) and
 * returns the summary `derived.canopy` carries. `mkPanel` is cabinet.js's
 * `panel()`, `rect` puzzle.js's.
 */
export function applyCanopy({
  panels, drills = [], W, H, D, G, frontT, projection, codes = {}, mkPanel, rect,
}) {
  const P = Math.max(0, Number(projection) || 0);
  const geom = canopyGeometry({ H, P, frontT });
  const sideW = D - G;
  const side = panels.find((p) => p.part === 'BUL' && p.role === 'side');
  const sideR = panels.find((p) => p.part === 'BUR' && p.role === 'side');
  const bottom = panels.find((p) => p.part === 'BOTTOM' && p.role === 'bottom');

  for (const [i, p] of panels.entries()) {
    if (p === side || p === sideR) panels[i] = canopySide(p, sideW, H, P, G);
    else if (p === bottom) panels[i] = canopyBottom(p, P);
  }
  // BUL's drilling travels with its frame (its x = 0 is the front edge, which moved by P).
  if (P > 0) {
    for (const d of drills) {
      if (d.panel === 'BUL' && Number.isFinite(Number(d.x))) d.x = r4(Number(d.x) + P);
    }
  }

  // Section 4.5: the sloped front, a plain blank of the FRONT material.
  if (typeof mkPanel === 'function' && typeof rect === 'function' && W > 0 && geom.blankLen > 0) {
    panels.push(mkPanel({
      id: 'CANOPY-FRONT',
      part: 'FALSE-FRONT',
      role: 'false_front',
      w: W,
      h: geom.blankLen,
      thickness: frontT,
      edgeCode: codes.all ?? codes.none ?? '',
      edgeLen: roundTo((2 * W + 2 * geom.blankLen) / 1000, 6),
      // Standing on its top front line before the lean: the blank hangs from
      // y = H at z = D (the sides' top front corner) and leans forward by alpha
      // about that edge (tilt_deg negative drops the BOTTOM edge forward: a
      // rotation about x by -alpha moves a point below the pivot to +z).
      box: {
        x: 0, y: r4(H - geom.blankLen), z: r4(D), w: r4(W), h: r4(geom.blankLen), d: r4(frontT),
      },
      cnc: {
        rotated: false, drawn_w: r4(W), drawn_h: r4(geom.blankLen), ...rect(W, geom.blankLen), grain: 'h',
      },
      meta: {
        canopy: {
          projection: geom.projection,
          slopeDeg: geom.slopeDeg,
          faceLen: geom.faceLen,
          blankLen: geom.blankLen,
          bevelDeg: geom.bevelDeg,
          bevel: 'both ends, at the saw (T47 roof-board law: a three-axis machine cannot cut it)',
        },
        tilt_deg: -geom.slopeDeg,
        tilt_pivot: { y: r4(H), z: r4(D) },
        frontType: 'F',
      },
    }));
  }

  return {
    projection: geom.projection,
    slopeDeg: geom.slopeDeg,
    faceLen: geom.faceLen,
    blankLen: geom.blankLen,
    bevelDeg: geom.bevelDeg,
    topDepth: r4(D),
    bottomDepth: r4(D + P),
    sideTopDepth: r4(sideW),
    sideBottomDepth: r4(sideW + P),
    lisp: 'KIT_WUD_HOOD_CANOPY.lsp',
  };
}
