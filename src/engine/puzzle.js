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

/** The three tab centres along a run of length L: 95, L/2, L−95. */
export function tabCentres(length, pz) {
  const e = pz.tabCentresFromEnd;
  return [e, length / 2, length - e];
}

/** The two socket centres along a run of length L: 95 and L−95. */
export function socketCentres(length, pz) {
  const e = pz.tabCentresFromEnd;
  return [e, length - e];
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
 */
export function sidePanelGeometry({ w, h, G, side, puzzle: pz }) {
  const out = { outline: [], pockets: [], holes: [] };
  const centres = tabCentres(h, pz);
  const S = G / 2 + pz.centrelineExtra;

  if (side === 'R') {
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
    horizontalSocket(cx, h, +1, G, pz, out);
    horizontalSocket(cx, 0, -1, G, pz, out);
  }

  // Assembly screws along the top and bottom edges
  for (const sx of [pz.screwFromEnd, w / 2, w - pz.screwFromEnd]) {
    out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: sx, y: h - S, d: pz.screwDiameter });
    out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: sx, y: S, d: pz.screwDiameter });
  }
  return out;
}

/**
 * Top / bottom panel (drawTOP_ROT90). Drawn rotated 90°: drawnW spans the
 * cabinet DEPTH (depth − G), drawnH spans the internal WIDTH (width − 2G).
 * Tabs on three edges — both long edges (into the sides) and the back edge.
 * The remaining edge is the cabinet front and stays plain.
 */
export function topPanelGeometry({ drawnW, drawnH, G, puzzle: pz }) {
  const out = { outline: [], pockets: [], holes: [] };
  const alongDepth = socketCentres(drawnW, pz);   // t1x, t2x
  const alongWidth = socketCentres(drawnH, pz);   // t1y, t2y

  out.outline.push([0, 0], [drawnW, 0], [drawnW, drawnH]);
  for (const cx of [...alongDepth].reverse()) out.outline.push(...tabPointsUp(drawnH, cx, G, pz));
  out.outline.push([0, drawnH]);
  for (const cy of [...alongWidth].reverse()) out.outline.push(...tabPointsLeft(0, cy, G, pz));
  out.outline.push([0, 0]);
  for (const cx of alongDepth) out.outline.push(...tabPointsDown(0, cx, G, pz));

  for (const cx of alongDepth) {
    out.pockets.push({ layer: pz.layers.dogbone, x1: cx - pz.dogboneHalfHeight, y1: drawnH, x2: cx + pz.dogboneHalfHeight, y2: drawnH + G });
    out.pockets.push({ layer: pz.layers.dogbone, x1: cx - pz.dogboneHalfHeight, y1: -G, x2: cx + pz.dogboneHalfHeight, y2: 0 });
  }
  for (const cy of alongWidth) {
    out.pockets.push({ layer: pz.layers.dogbone, x1: -G, y1: cy - pz.dogboneHalfHeight, x2: 0, y2: cy + pz.dogboneHalfHeight });
  }
  return out;
}

/**
 * Back panel (drawBACK). Plain rectangle w × h with sockets on all four edges:
 * 3 down each side (matching the side-panel tabs) and 2 across top and bottom
 * (matching the top/bottom-panel tabs, inset by one board thickness).
 */
export function backPanelGeometry({ w, h, G, puzzle: pz }) {
  const out = { outline: [[0, 0], [w, 0], [w, h], [0, h]], pockets: [], holes: [] };
  const S = G / 2 + pz.centrelineExtra;
  const sideCentres = tabCentres(h, pz);
  const e = pz.tabCentresFromEnd;
  const acrossCentres = [G + e, w - G - e];

  for (const cy of sideCentres) {
    verticalSocket(cy, 0, -1, G, pz, out);
    verticalSocket(cy, w, +1, G, pz, out);
  }
  for (const cx of acrossCentres) {
    horizontalSocket(cx, h, +1, G, pz, out);
    horizontalSocket(cx, 0, -1, G, pz, out);
  }

  // Screws: 4 down each side edge, 3 along top and bottom
  const [t1y, t2y, t3y] = sideCentres;
  const sideScrewY = [pz.screwFromEnd, (t1y + t2y) / 2, (t2y + t3y) / 2, h - pz.screwFromEnd];
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
