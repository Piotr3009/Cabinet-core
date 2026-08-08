// ─── Skylon puzzle joint geometry ───
// Ported 1:1 from reference/lisp/SKYLON_COMMON.lsp — drawBUL, drawBUR,
// drawTOP_ROT90 and drawBACK. Side panels are NOT rectangles: the back edge
// carries three tabs, the top/bottom edges carry sockets, and every tab gets a
// dog-bone relief pocket so a round cutter can reach the corners.
//
// Coordinates are panel-local, in mm, origin at the bottom-left of the panel's
// nominal rectangle, x right / y up — exactly the frame the LISP draws in, so
// the (later) DXF writer can emit these points unchanged.
//
// Nothing here is a bare number: every value comes from profile.puzzle.
// DXF generation itself is deliberately out of scope for now (CLAUDE.md #12) —
// the engine only has to CARRY the full geometry.

/** Points of one tab on a vertical (right-hand) edge, running bottom → top. */
function tabPointsRight(edgeX, centreY, G, pz) {
  const { tabHalfOpening: o, tabHalfWidth: t, shoulderDepth: s } = pz;
  return [
    [edgeX, centreY - t], [edgeX, centreY - o],
    [edgeX + s, centreY - o], [edgeX + s, centreY - t],
    [edgeX + G, centreY - t], [edgeX + G, centreY + t],
    [edgeX + s, centreY + t], [edgeX + s, centreY + o],
    [edgeX, centreY + o], [edgeX, centreY + t],
  ];
}

/** Points of one tab on a vertical (left-hand) edge, running top → bottom. */
function tabPointsLeft(edgeX, centreY, G, pz) {
  const { tabHalfOpening: o, tabHalfWidth: t, shoulderDepth: s } = pz;
  return [
    [edgeX, centreY + t], [edgeX, centreY + o],
    [edgeX - s, centreY + o], [edgeX - s, centreY + t],
    [edgeX - G, centreY + t], [edgeX - G, centreY - t],
    [edgeX - s, centreY - t], [edgeX - s, centreY - o],
    [edgeX, centreY - o], [edgeX, centreY - t],
  ];
}

/** Points of one tab on the top edge, running right → left. */
function tabPointsUp(edgeY, centreX, G, pz) {
  const { tabHalfOpening: o, tabHalfWidth: t, shoulderDepth: s } = pz;
  return [
    [centreX + t, edgeY], [centreX + o, edgeY],
    [centreX + o, edgeY + s], [centreX + t, edgeY + s],
    [centreX + t, edgeY + G], [centreX - t, edgeY + G],
    [centreX - t, edgeY + s], [centreX - o, edgeY + s],
    [centreX - o, edgeY], [centreX - t, edgeY],
  ];
}

/** Points of one tab on the bottom edge, running left → right. */
function tabPointsDown(edgeY, centreX, G, pz) {
  const { tabHalfOpening: o, tabHalfWidth: t, shoulderDepth: s } = pz;
  return [
    [centreX - t, edgeY], [centreX - o, edgeY],
    [centreX - o, edgeY - s], [centreX - t, edgeY - s],
    [centreX - t, edgeY - G], [centreX + t, edgeY - G],
    [centreX + t, edgeY - s], [centreX + o, edgeY - s],
    [centreX + o, edgeY], [centreX + t, edgeY],
  ];
}

/**
 * The tab centres along a run of length L: 95, L/2, L−95.
 *
 * ─── Turn 8 (F0 / BLOCKERS #37 / BACKLOG #47) ───
 * …unless the run is too SHORT to hold three. The tab is ±`tabHalfWidth`, but
 * the dog-bone relief around it is ±`dogboneHalfHeight` and reaches further, so
 * the dog bone is what has to clear. Below `profile.puzzle.middleTabBelow` the
 * middle tab is not cut and the panel has two — the same answer, on the other
 * axis, as `socketCentres()` gives a shallow carcass.
 *
 * Everything downstream follows from this one function: the side panel's tabs
 * and their dog bones, the back panel's mating sockets and its screw rows.
 */
export function tabCentres(length, pz) {
  const e = pz.tabCentresFromEnd;
  const threshold = Number(pz.middleTabBelow) || 0;
  if (threshold > 0 && length < threshold) return [e, length - e];
  return [e, length / 2, length - e];
}

/**
 * The three-tab threshold, recomputed from the geometry it comes from — the
 * twin of `singleSocketThreshold()` above, and exported for the same reason:
 * the constant in the profile can be CHECKED rather than trusted.
 *
 * Two gaps have to stay open (middle-to-left and middle-to-right), so the
 * bridge is counted twice where the socket rule counts it once.
 */
export function middleTabThreshold(pz, boardThickness) {
  const half = Math.max(pz.tabHalfWidth, pz.dogboneHalfHeight);
  return pz.tabCentresFromEnd * 2 + half * 4 + boardThickness * 2;
}

/**
 * The socket centres along a run of length L.
 *
 * Normally two, at 95 in from each end — that is what every AutoLISP kit draws,
 * because every AutoLISP kit is 558 or 578 deep and the question never came up.
 *
 * ─── Turn 7 (CLAUDE.md F4 / BACKLOG #28) ───
 * On a SHALLOW carcass it does. A side panel is `depth − G` wide; put two
 * sockets 95 in from each end of a 232 mm run and their pockets — and, before
 * the pockets, their ⌀7.5 holes at ±24.5 — are cutting into each other. The
 * result is not a weak joint, it is a hole through the middle of the panel.
 *
 * Below `profile.puzzle.singleSocketBelow` there is ONE socket, in the middle
 * of the run. The threshold is derived from the socket geometry itself and the
 * derivation is written out beside the number in profile.js.
 *
 * Everything downstream follows from this function alone — the side panel's
 * sockets, the top panel's mating TABS, its dog-bone reliefs and the two holes
 * per socket, and through them the DXF and the CNC preview. There is no second
 * place that has to be told (turn 2's rule: the geometry is the source).
 *
 * The AutoLISP DID NOT KNOW THIS CASE. That is the same footing the variable
 * drawer heights stand on (turn 2, task 4): where the kits are silent, the
 * engine decides and says so, rather than pretending to have traced it.
 */
export function socketCentres(length, pz) {
  const e = pz.tabCentresFromEnd;
  const threshold = Number(pz.singleSocketBelow) || 0;
  if (threshold > 0 && length < threshold) return [length / 2];
  return [e, length - e];
}

/**
 * The threshold, recomputed from the geometry it comes from.
 *
 * Exported so the number in the profile can be CHECKED rather than trusted: a
 * workshop that widens the socket or moves its holes gets a threshold that
 * moves with them, and the test says so when the stored constant stops
 * agreeing. See the derivation in profile.js.
 */
export function singleSocketThreshold(pz, boardThickness) {
  const half = Math.max(pz.socketHalfWidth, pz.socketHoleOffset + pz.socketHoleDiameter / 2);
  return pz.tabCentresFromEnd * 2 + half * 2 + boardThickness;
}

/** Socket pocket + its two holes on a horizontal edge (top or bottom of a panel). */
function horizontalSocket(centreX, edgeY, dir, G, pz, out) {
  const S = G / 2 + pz.centrelineExtra;
  const inner = edgeY + dir * -S;             // pocket edge inside the panel
  const outer = edgeY + dir * pz.socketOvershoot;
  out.pockets.push({
    layer: pz.layers.socket,
    x1: centreX - pz.socketHalfWidth, y1: Math.min(inner, outer),
    x2: centreX + pz.socketHalfWidth, y2: Math.max(inner, outer),
  });
  const holeY = inner + dir * pz.socketHoleInset;
  for (const dx of [-pz.socketHoleOffset, pz.socketHoleOffset]) {
    out.holes.push({ layer: pz.layers.socketHole, kind: 'puzzle', x: centreX + dx, y: holeY, d: pz.socketHoleDiameter });
  }
}

/** Socket pocket + its two holes on a vertical edge (left or right of a panel). */
function verticalSocket(centreY, edgeX, dir, G, pz, out) {
  const S = G / 2 + pz.centrelineExtra;
  const inner = edgeX + dir * -S;
  const outer = edgeX + dir * pz.socketOvershoot;
  out.pockets.push({
    layer: pz.layers.socket,
    x1: Math.min(inner, outer), y1: centreY - pz.socketHalfWidth,
    x2: Math.max(inner, outer), y2: centreY + pz.socketHalfWidth,
  });
  const holeX = inner + dir * pz.socketHoleInset;
  for (const dy of [-pz.socketHoleOffset, pz.socketHoleOffset]) {
    out.holes.push({ layer: pz.layers.socketHole, kind: 'puzzle', x: holeX, y: centreY + dy, d: pz.socketHoleDiameter });
  }
}

/**
 * Side panel (BUL / BUR). w = depth − G, h = carcass height.
 * Local x = 0 is the FRONT edge; tabs sit on the BACK edge.
 * `side` 'L' keeps the LISP orientation, 'R' mirrors it (tabs run to x < 0).
 *
 * `edges` switches individual joints off for the types that do not have them.
 * KIT_SINK's drawSINK_BUL is exactly this panel with the back tabs, the top
 * sockets and the top screw row removed (there is no TOP panel and the back is
 * screwed in from the inside), so it is a flag here rather than a second copy
 * of 120 lines of tab arithmetic.
 */
export function sidePanelGeometry({ w, h, G, side, puzzle: pz, edges }) {
  const e = {
    backTabs: true, topSocket: true, bottomSocket: true,
    topScrews: true, bottomScrews: true, ...(edges || {}),
  };
  const out = { outline: [], pockets: [], holes: [] };
  const centres = tabCentres(h, pz);
  const S = G / 2 + pz.centrelineExtra;

  if (!e.backTabs) {
    out.outline.push([0, 0], [w, 0], [w, h], [0, h]);
  } else if (side === 'R') {
    // drawBUR: rectangle drawn first, then tabs down the LEFT edge (top → bottom)
    out.outline.push([0, 0], [w, 0], [w, h], [0, h]);
    for (const c of [...centres].reverse()) out.outline.push(...tabPointsLeft(0, c, G, pz));
    for (const c of centres) {
      out.pockets.push({ layer: pz.layers.dogbone, x1: -G, y1: c - pz.dogboneHalfHeight, x2: 0, y2: c + pz.dogboneHalfHeight });
    }
  } else {
    // drawBUL: tabs up the RIGHT edge (bottom → top)
    out.outline.push([0, 0], [w, 0]);
    for (const c of centres) out.outline.push(...tabPointsRight(w, c, G, pz));
    out.outline.push([w, h], [0, h]);
    for (const c of centres) {
      out.pockets.push({ layer: pz.layers.dogbone, x1: w, y1: c - pz.dogboneHalfHeight, x2: w + G, y2: c + pz.dogboneHalfHeight });
    }
  }

  // Sockets on the top and bottom edges (they receive the TOP/BOTTOM tabs)
  for (const cx of socketCentres(w, pz)) {
    if (e.topSocket) horizontalSocket(cx, h, +1, G, pz, out);
    if (e.bottomSocket) horizontalSocket(cx, 0, -1, G, pz, out);
  }

  // Assembly screws along the top and bottom edges
  for (const sx of [pz.screwFromEnd, w / 2, w - pz.screwFromEnd]) {
    if (e.topScrews) out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: sx, y: h - S, d: pz.screwDiameter });
    if (e.bottomScrews) out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: sx, y: S, d: pz.screwDiameter });
  }
  return out;
}

/**
 * Top / bottom panel (drawTOP_ROT90). Drawn rotated 90°: drawnW spans the
 * cabinet DEPTH (depth − G), drawnH spans the internal WIDTH (width − 2G).
 * Tabs on three edges — both long edges (into the sides) and the back edge.
 * The remaining edge is the cabinet front and stays plain.
 */
export function topPanelGeometry({ drawnW, drawnH, G, puzzle: pz, backTabs = true }) {
  const out = { outline: [], pockets: [], holes: [] };
  const alongDepth = socketCentres(drawnW, pz);   // t1x, t2x
  const alongWidth = socketCentres(drawnH, pz);   // t1y, t2y

  out.outline.push([0, 0], [drawnW, 0], [drawnW, drawnH]);
  for (const cx of [...alongDepth].reverse()) out.outline.push(...tabPointsUp(drawnH, cx, G, pz));
  out.outline.push([0, drawnH]);
  // The back edge. KIT_SINK's bottom panel leaves it straight — its back is a
  // screwed panel set 50 mm forward, so there is nothing there to receive tabs.
  if (backTabs) for (const cy of [...alongWidth].reverse()) out.outline.push(...tabPointsLeft(0, cy, G, pz));
  out.outline.push([0, 0]);
  for (const cx of alongDepth) out.outline.push(...tabPointsDown(0, cx, G, pz));

  for (const cx of alongDepth) {
    out.pockets.push({ layer: pz.layers.dogbone, x1: cx - pz.dogboneHalfHeight, y1: drawnH, x2: cx + pz.dogboneHalfHeight, y2: drawnH + G });
    out.pockets.push({ layer: pz.layers.dogbone, x1: cx - pz.dogboneHalfHeight, y1: -G, x2: cx + pz.dogboneHalfHeight, y2: 0 });
  }
  if (backTabs) {
    for (const cy of alongWidth) {
      out.pockets.push({ layer: pz.layers.dogbone, x1: -G, y1: cy - pz.dogboneHalfHeight, x2: 0, y2: cy + pz.dogboneHalfHeight });
    }
  }
  return out;
}

/**
 * A plain rectangle that RECEIVES tabs: sockets wherever the caller says.
 * `sockets` names the edge and the centres along it, in panel-local mm:
 *   { left: [y…], right: [y…], top: [x…], bottom: [x…] }
 *
 * This is the shape behind every "screwed/socketed" part — the back panel, and
 * the fridge's two back rails and back-top panel, which are the same joint in a
 * different place.
 */
export function socketPanelGeometry({ w, h, G, puzzle: pz, sockets = {}, screws = [] }) {
  const out = { outline: [[0, 0], [w, 0], [w, h], [0, h]], pockets: [], holes: [] };
  for (const cy of sockets.left || []) verticalSocket(cy, 0, -1, G, pz, out);
  for (const cy of sockets.right || []) verticalSocket(cy, w, +1, G, pz, out);
  for (const cx of sockets.top || []) horizontalSocket(cx, h, +1, G, pz, out);
  for (const cx of sockets.bottom || []) horizontalSocket(cx, 0, -1, G, pz, out);
  for (const s of screws) {
    out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: s.x, y: s.y, d: pz.screwDiameter });
  }
  return out;
}

/**
 * Back panel (drawBACK). Plain rectangle w × h with sockets on all four edges:
 * 3 down each side (matching the side-panel tabs) and 2 across top and bottom
 * (matching the top/bottom-panel tabs, inset by one board thickness).
 */
export function backPanelGeometry({ w, h, G, puzzle: pz }) {
  const S = G / 2 + pz.centrelineExtra;
  const sideCentres = tabCentres(h, pz);
  // The back receives the top/bottom panels' BACK-EDGE tabs, and those are cut
  // at socketCentres() over the INTERNAL width. Deriving them the same way — one
  // function, offset by the side panel — is what makes a narrow carcass get one
  // socket here and one tab there instead of a tab with nothing to go into.
  const acrossCentres = socketCentres(w - 2 * G, pz).map((c) => G + c);
  const out = socketPanelGeometry({
    w, h, G, puzzle: pz,
    sockets: { left: sideCentres, right: sideCentres, top: acrossCentres, bottom: acrossCentres },
  });

  // Screws down each side edge: one in from each end, and one BETWEEN every
  // pair of neighbouring tabs. With the LISP's three tabs that is the four rows
  // it draws; with a low carcass's two (turn 8, F0) it is three, in the right
  // places, because the rule is "between the tabs" and not "four of them".
  const sideScrewY = [
    pz.screwFromEnd,
    ...sideCentres.slice(1).map((c, i) => (sideCentres[i] + c) / 2),
    h - pz.screwFromEnd,
  ];
  for (const y of sideScrewY) {
    out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: S, y, d: pz.screwDiameter });
    out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: w - S, y, d: pz.screwDiameter });
  }
  for (const x of [G + pz.screwFromEnd, w / 2, w - G - pz.screwFromEnd]) {
    out.holes.push({ layer: pz.layers.screw, kind: 'screw', x, y: h - S, d: pz.screwDiameter });
    out.holes.push({ layer: pz.layers.screw, kind: 'screw', x, y: S, d: pz.screwDiameter });
  }
  return out;
}

/** Plain rectangular outline for panels without puzzle joints. */
export function rectGeometry(w, h, layer = 'OUTLINE') {
  return { outline: [[0, 0], [w, 0], [w, h], [0, h]], pockets: [], holes: [], layer };
}

// ─── A picture of the joint (turn 7, CLAUDE.md F2) ──────────────────────────

/**
 * ONE tab and the socket it goes into, drawn from the same numbers the cutter
 * gets. For the joinery picker in the new-project flow: "Dog bones (Skylon
 * puzzle)" means nothing as a phrase, and means everything as a shape.
 *
 * It is derived rather than illustrated on purpose. A hand-drawn diagram of a
 * joint is a diagram of the joint SOMEBODY REMEMBERED; this one changes when
 * `profile.puzzle` changes, which is the only way a preview can keep being
 * true after the profile is edited.
 *
 * Coordinates are millimetres, origin bottom-left, y up — the same frame every
 * other function in this file works in.
 *
 * @returns {{w:number, h:number, boardT:number, outline:Array, mate:object,
 *            dogbone:object, socket:object, holes:Array}}
 */
export function puzzlePreview(profile) {
  const pz = profile.puzzle;
  const G = profile.board.thickness;
  // Tall enough to show the tab with room around it, wide enough that the
  // panel reads as a panel rather than as a strip.
  const h = pz.dogboneHalfHeight * 4;
  const w = pz.tabHalfWidth * 3;
  const centre = h / 2;
  const S = G / 2 + pz.centrelineExtra;

  const outline = [[0, 0], [w, 0], ...tabPointsRight(w, centre, G, pz), [w, h], [0, h]];

  return {
    w: w + G + pz.socketOvershoot,
    h,
    boardT: G,
    outline,
    // The relief pocket that lets a round cutter reach into the corner — the
    // "dog bone" the system is named after.
    dogbone: {
      x1: w, y1: centre - pz.dogboneHalfHeight, x2: w + G, y2: centre + pz.dogboneHalfHeight,
    },
    // The mating piece: its edge stands where the tab ends.
    mate: { x1: w + G, y1: 0, x2: w + G + pz.socketOvershoot + S, y2: h },
    // …and the pocket in it that receives the tab, with its two holes.
    socket: {
      x1: w + G - S, y1: centre - pz.socketHalfWidth,
      x2: w + G + pz.socketOvershoot, y2: centre + pz.socketHalfWidth,
    },
    holes: [-pz.socketHoleOffset, pz.socketHoleOffset].map((dy) => ({
      x: w + G - S + pz.socketHoleInset, y: centre + dy, d: pz.socketHoleDiameter,
    })),
  };
}
