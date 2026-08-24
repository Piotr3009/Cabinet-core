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
export function tabPointsLeft(edgeX, centreY, G, pz) {
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
export function tabPointsUp(edgeY, centreX, G, pz) {
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
export function tabPointsDown(edgeY, centreX, G, pz) {
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
export function socketCentres(length, pz, inset = undefined) {
  // ─── TURN 25 (CLAUDE.md F2): THE UNIT'S OWN RESOLVED INSET ───────────────
  // `inset` left out is the law above, unchanged, and is what every caller
  // that sets out along an axis other than the DEPTH passes — the back edge's
  // tabs, the back panel's rows across the width. `null` is the shallow
  // cabinet's answer: one joint, on the panel's own centre line, whatever the
  // run happens to measure. `resolvedJointInset()` below is the only thing
  // that decides which, and it decides once per unit.
  const e = inset === undefined ? pz.tabCentresFromEnd : inset;
  if (e === null) return [length / 2];
  const threshold = Number(pz.singleSocketBelow) || 0;
  if (threshold > 0 && length < threshold) return [length / 2];
  return [e, length - e];
}

/**
 * ONE INSET PER CABINET (turn 25, CLAUDE.md F2).
 *
 * The owner's corrected `panel_joints.lsp`: a socket is 51 mm wide, a dog bone
 * is 60, both sit 95 in from each end — so two of them collide on a panel under
 * 241 mm, and their reliefs under 250. His answer is not "make this panel
 * different"; it is "a shallow CABINET has one joint, centred", asked once and
 * given to every mating panel, because a side whose socket is on the centre
 * line and a top whose tab is at 95 do not meet.
 *
 * @param {number} depth  the CABINET's depth, mm — not the panel's run
 * @param {object} pz     profile.puzzle
 * @returns {number|null} the inset from each end, or null for one centred joint
 */
export function resolvedJointInset(depth, pz) {
  const max = Number(pz?.singleJointMaxDepth) || 0;
  const d = Number(depth) || 0;
  if (max > 0 && d > 0 && d <= max) return null;
  return pz.tabCentresFromEnd;
}

/**
 * The two collisions the owner's numbers describe, recomputed from the geometry
 * they come from — the twin of `singleSocketThreshold()` and
 * `middleTabThreshold()`, exported for the same reason: the 300 in the profile
 * can be CHECKED against what it is protecting rather than trusted.
 *
 * @returns {{socket:number, dogbone:number}} the run lengths below which each
 *   pair meets, in mm
 */
export function jointCollisionLengths(pz) {
  return {
    socket: pz.tabCentresFromEnd * 2 + pz.socketHalfWidth * 2,
    dogbone: pz.tabCentresFromEnd * 2 + pz.dogboneHalfHeight * 2,
  };
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

/** Socket pocket + its two holes on a horizontal edge (top or bottom of a panel).
 *
 * ─── TURN 24 (CLAUDE.md F4): THE AXIS IS `thicknessOf(part) / 2` ────────────
 * `S` is how far the socket runs INTO the panel from its edge, and it is half
 * the board the tab is cut from — 9.00 on an 18, 9.25 on a measured 18.5. The
 * `+ centrelineExtra` that used to sit on it is gone: the owner does not
 * remember it, it is wrong, and it skewed the whole calculation. Every socket
 * and screw law in this file reads the same half, so the delta is uniform. */
/**
 * @param {boolean} interior  TURN 46 (F3): a socket row that no longer breaks
 *   the panel's edge. Under a slope the TOP board lands part-way up the TALL
 *   side, so its socket becomes a CUT-OUT wholly inside the board — and a
 *   cut-out is traced the other way round, or the cutter offsets to the wrong
 *   side of the line and takes the pocket out of the board instead of out of
 *   the hole. `cutout` is the field this house already has for exactly that
 *   (`cnc/dxf.js pocketPoints`, `cnc/edgeGuard.js pocketLoop`, T34's shoe-box
 *   groove); the browser walk's Check #9 is what asked for it here.
 */
function horizontalSocket(centreX, edgeY, dir, G, pz, out, interior = false) {
  const S = G / 2;
  const inner = edgeY + dir * -S;             // pocket edge inside the panel
  const outer = edgeY + dir * pz.socketOvershoot;
  out.pockets.push({
    layer: pz.layers.socket,
    x1: centreX - pz.socketHalfWidth, y1: Math.min(inner, outer),
    x2: centreX + pz.socketHalfWidth, y2: Math.max(inner, outer),
    ...(interior ? { cutout: true } : {}),
  });
  const holeY = inner + dir * pz.socketHoleInset;
  for (const dx of [-pz.socketHoleOffset, pz.socketHoleOffset]) {
    out.holes.push({ layer: pz.layers.socketHole, kind: 'puzzle', x: centreX + dx, y: holeY, d: pz.socketHoleDiameter });
  }
}

/** Socket pocket + its two holes on a vertical edge (left or right of a panel). */
function verticalSocket(centreY, edgeX, dir, G, pz, out) {
  const S = G / 2;
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
export function sidePanelGeometry({
  w, h, G, side, puzzle: pz, edges, jointInset = undefined, topAt = null,
}) {
  const e = {
    backTabs: true, topSocket: true, bottomSocket: true,
    topScrews: true, bottomScrews: true, backTabsBelow: Infinity, ...(edges || {}),
  };
  const out = { outline: [], pockets: [], holes: [] };
  // ─── Turn 18 (CLAUDE.md F5.1): A TAB WITH NOTHING TO CATCH IT ────────────
  //
  // Owner's review of the oven base: "the sides carry the same 7 sockets a
  // full-back BUD does, and above the drawer-back there is NOTHING there."
  // He is right — the back of an oven housing stops at the shelf, so the two
  // upper tabs and their dog-bone reliefs were cut into open air.
  //
  // `backTabsBelow` is the height the back reaches to. A tab is kept only if
  // its whole DOG BONE lands inside it — the bone is ±`dogboneHalfHeight` and
  // reaches further than the tab itself, which is the same fact that decides
  // the middle tab on a low carcass (`middleTabThreshold`).
  const reach = Number.isFinite(Number(e.backTabsBelow)) ? Number(e.backTabsBelow) : Infinity;
  const centres = tabCentres(h, pz).filter((c) => c + pz.dogboneHalfHeight <= reach);
  const S = G / 2;

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

  // Sockets on the top and bottom edges (they receive the TOP/BOTTOM tabs).
  // This run IS the cabinet's depth, so it takes the unit's resolved inset
  // (turn 25, CLAUDE.md F2) — and the TOP's mating tabs take the same one.
  //
  // ─── TURN 46 (CLAUDE.md F3): …AND THE TOP IS NOT ALWAYS ON THE TOP EDGE ──
  //
  // Under a slope the top board *"sits level at the LOW end's height … the
  // triangle above it is CLOSED by the sloped edges of the two sides"*. So on
  // the TALL side the board lands part-way UP the panel and its socket row
  // goes with it. `topAt` is where that row is; nothing said is the top edge,
  // which is every side panel in every cabinet before tonight, so the row is
  // cut at exactly the y it has always been cut at.
  // `Number(null)` is 0, not NaN — the trap this house has named twice
  // (`impliedLegHeight`, `maskDepthExtra`). So "nobody has said" is asked
  // BEFORE the number is read, or every side panel in the app drops its top
  // socket row to the floor. It did, for one run of the classifier.
  const topY = (topAt == null || topAt === '' || !Number.isFinite(Number(topAt)))
    ? h : Number(topAt);
  // A top row that has moved DOWN the panel no longer breaks its edge; it is a
  // cut-out and is traced as one (see `horizontalSocket`).
  const topIsInterior = topY < h - 1e-9;
  for (const cx of socketCentres(w, pz, jointInset)) {
    if (e.topSocket) horizontalSocket(cx, topY, +1, G, pz, out, topIsInterior);
    if (e.bottomSocket) horizontalSocket(cx, 0, -1, G, pz, out);
  }

  // Assembly screws along the top and bottom edges
  for (const sx of [pz.screwFromEnd, w / 2, w - pz.screwFromEnd]) {
    if (e.topScrews) out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: sx, y: topY - S, d: pz.screwDiameter });
    if (e.bottomScrews) out.holes.push({ layer: pz.layers.screw, kind: 'screw', x: sx, y: S, d: pz.screwDiameter });
  }
  return out;
}

/**
 * Top / bottom panel (drawTOP_ROT90). Drawn rotated 90°: drawnW spans the
 * cabinet DEPTH (depth − G), drawnH spans the internal WIDTH (width − 2G).
 * Tabs on three edges — both long edges (into the sides) and the back edge.
 * The remaining edge is the cabinet front and stays plain.
 *
 * ─── TURN 25 (CLAUDE.md F1): THE EDGE THAT WAS DRAWN TWICE ─────────────────
 *
 * This function is where the owner's LISP fault lived in OUR code, and the F1
 * guard is what found it. It used to trace the outline like this:
 *
 *     [0,0] → [drawnW,0]        …the bottom edge, PLAIN, straight across
 *           → [drawnW,drawnH]   …up the right
 *           → tabs across the top, down the back to
 *     [0,0]                     …back at the START, mid-polyline
 *           → tabs along the bottom edge, LEFT TO RIGHT
 *           → (closed flag)     …and a long run back to [0,0] again
 *
 * The bottom edge was therefore in the file TWICE: once as one straight
 * segment and once as the tabbed run. VCarve does not read that as one line
 * seen twice — it offsets the two coincident paths in OPPOSITE directions and
 * cuts the panel from the outside AND from the inside on the same job. Every
 * TOP and every BOTTOM this engine has ever exported carried it.
 *
 * The fix is a re-ORDER and nothing else: the same points, in one traversal
 * that goes round once. The bottom edge is now walked with its tabs on it,
 * where it always belonged, and the mid-polyline return to the origin is gone.
 * The SHAPE is identical to the last decimal — same outer boundary, same tabs,
 * same dog bones — so what changes in the DXF is the order of the vertices in
 * two entities per cabinet and nothing else. `verify/t25/edge-guard.md` carries
 * the post-mortem and `verify/t25/cnc-export-identity.md` names the delta.
 */
export function topPanelGeometry({
  drawnW, drawnH, G, puzzle: pz, backTabs = true, jointInset = undefined,
}) {
  const out = { outline: [], pockets: [], holes: [] };
  // The long edges run along the cabinet's DEPTH and take the unit's resolved
  // inset (turn 25, CLAUDE.md F2); the back edge runs across its WIDTH and is
  // set out by the run, exactly as it always was.
  const alongDepth = socketCentres(drawnW, pz, jointInset);   // t1x, t2x
  const alongWidth = socketCentres(drawnH, pz);               // t1y, t2y

  // Anticlockwise, once round, starting at the bottom-left corner.
  out.outline.push([0, 0]);
  for (const cx of alongDepth) out.outline.push(...tabPointsDown(0, cx, G, pz));
  out.outline.push([drawnW, 0], [drawnW, drawnH]);
  for (const cx of [...alongDepth].reverse()) out.outline.push(...tabPointsUp(drawnH, cx, G, pz));
  out.outline.push([0, drawnH]);
  // The back edge. KIT_SINK's bottom panel leaves it straight — its back is a
  // screwed panel set 50 mm forward, so there is nothing there to receive tabs.
  if (backTabs) for (const cy of [...alongWidth].reverse()) out.outline.push(...tabPointsLeft(0, cy, G, pz));

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
  const S = G / 2;
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

/**
 * Plain rectangular outline for panels without puzzle joints.
 *
 * ─── TURN 25 (CLAUDE.md F1.4): A PIECE OF NO SIZE HAS NO OUTLINE ───────────
 *
 * The F1 guard found this, on an impossible cabinet: an OVEN_BASE 500 mm high
 * cannot hold a 595 mm oven, so the opening under its shelf is negative and the
 * drawer boards it produced were −152 mm tall. Every one of them went on the
 * sheet, was laid out, and was written into a DXF as a rectangle traced
 * BACKWARDS — which is a cut path telling VCarve the material is on the other
 * side of the line, on a board that does not exist.
 *
 * The cabinet already SAYS it is impossible (`OVEN_TOO_LOW`) and has since turn
 * 17. What was missing is that nothing downstream believed it. A part the
 * machine could not cut now has no outline at all, so `exportablePanels`, the
 * layout, the sheet and the file all drop it by the rule they already had —
 * "a real outline" — instead of each needing to be told.
 *
 * Every part with a real size is byte-for-byte what it was.
 */
export function rectGeometry(w, h, layer = 'OUTLINE') {
  if (!(Number(w) > 0) || !(Number(h) > 0)) {
    return { outline: [], pockets: [], holes: [], layer };
  }
  return { outline: [[0, 0], [w, 0], [w, h], [0, h]], pockets: [], holes: [], layer };
}

/**
 * A rectangle with one or more corners cut at 45° (turn 15, CLAUDE.md F6).
 *
 * The shape a MITRED strip is actually cut to. Where a side infill and a top
 * infill meet they make the corner of a frame, and a frame corner is mitred:
 * each member loses a right-angled triangle with equal legs, which is the only
 * cut whose two halves add up to a square corner — and is why a mitre is 45°.
 *
 * `corners` names the sizes in the part's own cut frame (origin bottom-left,
 * y up — the frame every outline in this file is in):
 *
 *     { bl, br, tl, tr }   the leg length taken off that corner, 0 = square
 *
 * A leg of 0 leaves the corner alone, so the un-mitred case comes back as the
 * same four points `rectGeometry` returns and NOTHING in the export moves —
 * which is what keeps this turn's CNC delta to the pieces that are genuinely
 * mitred (CLAUDE.md's one named delta).
 *
 * A leg is clamped to the piece: a 45° cut cannot be longer than the side it
 * runs off, and asking for one is a bug upstream rather than a shape.
 */
export function chamferedRectGeometry(w, h, corners = {}, layer = 'OUTLINE') {
  const cap = (v) => Math.max(0, Math.min(Number(v) || 0, Math.min(w, h)));
  const bl = cap(corners.bl);
  const br = cap(corners.br);
  const tl = cap(corners.tl);
  const tr = cap(corners.tr);
  const pts = [];
  const push = (x, y) => {
    const last = pts[pts.length - 1];
    // Two corners that meet (a cut as long as the side) must not leave a
    // zero-length edge behind — a duplicated vertex is a degenerate polyline
    // and some CAM packages refuse the file rather than closing it.
    if (last && Math.abs(last[0] - x) < 1e-9 && Math.abs(last[1] - y) < 1e-9) return;
    pts.push([x, y]);
  };
  if (bl) push(bl, 0); else push(0, 0);
  if (br) { push(w - br, 0); push(w, br); } else push(w, 0);
  if (tr) { push(w, h - tr); push(w - tr, h); } else push(w, h);
  if (tl) { push(tl, h); push(0, h - tl); } else push(0, h);
  if (bl) push(0, bl);
  // …and the first point may equal the last once the loop closes.
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (pts.length > 3 && Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) pts.pop();
  return {
    outline: pts, pockets: [], holes: [], layer,
  };
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
  const S = G / 2;

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

// ─── TURN 46 (CLAUDE.md F3): THE SLOPE CUT, PORTED 1:1 FROM THE LISP ────────
//
// The owner, 24.08.2026, option A: *"tniemy po skosie."*
//
// The shape is `SKYLON_COMMON.lsp SKY:slopeCutPts` (iron rule 3 — the routine
// is born there and the application follows it), and the port is 1:1 in the
// only way that matters: the same three answers, chosen by the same numbers.
//
//   NOTHING TO TRIM   both edges clear the panel → the outline is returned
//                     UNCHANGED, by identity. That is the gate expressed in
//                     the geometry: a panel out of the slope zone is the same
//                     array of points it was before this function existed, so
//                     its DXF, its fingerprint and its sheet cannot move.
//   TRAPEZIUM         the ceiling is under the panel at both edges.
//   PENTAGON          the tall edge keeps FULL HEIGHT and the diagonal meets
//                     the top edge inside the panel; the corner that goes is
//                     the one at the LOW end.
//
// ─── WHY IT CLIPS RATHER THAN REBUILDS ──────────────────────────────────────
//
// The LISP cuts a RECTANGLE, because in the kit a side panel is drawn as one.
// In this engine the same board carries three tabs, six sockets and their dog
// bones, and rebuilding it from four corners would throw all of that away. So
// the cut is a HALF-PLANE CLIP of whatever outline the panel already has —
// keep every vertex under the line, insert the crossings, and walk the line
// itself where the boundary runs along it. On the plain rectangle the LISP
// cuts, it returns the LISP's own four or five points to the last decimal
// (the F3 test asserts exactly that against `SKY:slopeCutPts`'s three
// branches); on a tabbed side it keeps every tab the cut does not reach.
//
// The line is stated as the two clear heights the ceiling leaves at the
// panel's own left and right edges — `hL` and `hR`, measured from the panel's
// y = 0 and ALREADY less the scribe gap. This function never invents a gap and
// never asks where the ceiling is: `lib/slopeLine.js` owns that (there is one
// `ceilingAt` in this app) and the number arrives as an input.

/** The clear height the ceiling leaves at a point across a panel. */
export function slopeHeightAt({ w, hL, hR }, x) {
  const width = Number(w) || 0;
  if (!(width > 0)) return Number(hL) || 0;
  const t = Math.min(Math.max(Number(x) || 0, 0), width) / width;
  return Number(hL) + (Number(hR) - Number(hL)) * t;
}

/** Is this panel cut at all? The gate, asked of the numbers. (SKY:slopeCutActive) */
export function slopeCutActive({ h, hL, hR }) {
  const top = Number(h) || 0;
  return Number(hL) < top - 1e-9 || Number(hR) < top - 1e-9;
}

/**
 * An outline trimmed on the slope.
 *
 * @param {Array<[number,number]>} outline  the panel's points, as it is cut today
 * @param {{w:number, h:number, hL:number, hR:number}} cut
 * @returns {Array<[number,number]>} the same array (by identity) when there is
 *   nothing to trim; a new one otherwise.
 */
export function trimOutlineOnSlope(outline, { w, h, hL, hR }) {
  const pts = Array.isArray(outline) ? outline : [];
  if (!pts.length || !slopeCutActive({ h, hL, hR })) return outline;
  const at = (x) => slopeHeightAt({ w, hL, hR }, x);
  const under = (p) => p[1] <= at(p[0]) + 1e-9;
  // Where the segment a→b crosses the line. Both are linear in x, so the
  // crossing is solved rather than stepped towards: with
  // f(t) = (a.y + t·Δy) − line(a.x + t·Δx), f is linear and t = f(0)/(f(0)−f(1)).
  const cross = (a, b) => {
    const fa = a[1] - at(a[0]);
    const fb = b[1] - at(b[0]);
    const d = fa - fb;
    if (Math.abs(d) < 1e-12) return [b[0], at(b[0])];
    const t = Math.min(Math.max(fa / d, 0), 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const out = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ain = under(a);
    const bin = under(b);
    if (ain) out.push(a);
    if (ain !== bin) out.push(cross(a, b));
  }
  // A vertex repeated by the clip is a vertex the DXF would write twice, and
  // two coincident points on a cut path is the T25 edge-guard fault in
  // miniature. Dropped here, once, rather than downstream in three places.
  const clean = [];
  for (const p of out) {
    const last = clean[clean.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 1e-9 && Math.abs(last[1] - p[1]) < 1e-9) continue;
    clean.push([round4(p[0]), round4(p[1])]);
  }
  const first = clean[0];
  const last = clean[clean.length - 1];
  if (clean.length > 1 && first && last
    && Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) clean.pop();
  return clean;
}

/**
 * A whole panel geometry trimmed on the slope: its outline cut, and every
 * pocket and hole that has ended up ABOVE the line dropped with the board they
 * were in. A hole in air is a hole the machine plunges through the bed.
 */
export function trimGeometryOnSlope(geom, { w, h, hL, hR }) {
  if (!geom || !slopeCutActive({ h, hL, hR })) return geom;
  const at = (x) => slopeHeightAt({ w, hL, hR }, x);
  return {
    ...geom,
    outline: trimOutlineOnSlope(geom.outline, {
      w, h, hL, hR,
    }),
    pockets: (geom.pockets || []).filter((p) => Math.min(p.y1, p.y2) <= at((p.x1 + p.x2) / 2) + 1e-9),
    holes: (geom.holes || []).filter((o) => o.y <= at(o.x) + 1e-9),
  };
}

const round4 = (v) => Math.round(v * 1e4) / 1e4;
