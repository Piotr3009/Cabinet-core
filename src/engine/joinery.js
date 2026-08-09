// ─── Seeing the joint (turn 8, CLAUDE.md F8) ───
//
// The joint IS the identity of the system. WoodExpert shows its confirmats;
// Skylon's cabinets are held together by a puzzle joint with dog-bone relief,
// and a customer looking at a render has no way of knowing that — the carcass
// is six boxes that meet at invisible lines.
//
// So the joint is drawn. Two answers, because there are two questions:
//
//   SOLID   — the DIVISION LINES the tabs leave where a side meets a top or a
//             bottom. Discreet, but unmistakable: those short breaks across the
//             joint are what a Skylon carcass looks like, and nothing else
//             looks like them.
//   X-RAY   — the whole thing: every tab profile, every socket pocket and every
//             dog bone, on the translucent sides, in a quiet colour per kind.
//
// ─── WHERE THE DATA COMES FROM ───
// From `panel.cnc`, which is the machine's own geometry: the outline the cutter
// follows, the pockets it sinks, the holes it drills. Nothing here re-derives a
// tab, and NOTHING HERE IS ADDED TO THE ENGINE. Move to a different joint and
// the picture follows on its own, because the picture is a reading of the
// cutting data rather than a second drawing of the same idea. That is the whole
// of "przyszłe systemy (Cabineo) dostaną wizualizację automatycznie".
//
// Pure functions — no React, no three.js. Coordinates are the unit's own
// millimetres, the frame every `panel.box` is already in.

/**
 * The layer names of the joint system this project is cut with.
 *
 * Read through the system's own `geometryKey` (engine/profile.js `joinery`)
 * rather than from `profile.puzzle` directly: that indirection is what lets a
 * second system arrive as a block of numbers and a geometry module instead of
 * as a rewrite of everything that draws.
 */
export function joineryLayers(profile, systemId = null) {
  const types = profile?.joinery?.types || [];
  const wanted = systemId || profile?.joinery?.defaultType;
  const system = types.find((t) => t.id === wanted) || types[0] || null;
  const geometry = system?.geometryKey ? profile?.[system.geometryKey] : null;
  return (geometry || profile?.puzzle)?.layers || null;
}

/**
 * How a panel's CNC drawing sits in the cabinet: where its (0,0) is, and which
 * way its two axes run.
 *
 * The CNC frame is 2D with the origin at the bottom-left of the panel's nominal
 * rectangle (engine/puzzle.js). Which cabinet axes those two map onto is a
 * property of the PART, and it is written out here rather than guessed from the
 * box, because two of the six are reversed and guessing gets them backwards:
 *
 *   BUL   the LISP draws it front-edge-first, so its CNC x runs from the front
 *         of the cabinet towards the back — the opposite way to z.
 *   BUR   is the mirror, and runs with z.
 *
 * The check that this is right is not the geometry: it is the DRILLING. A hinge
 * hole is cut at `xFromFrontEdge` on both sides, and the two mappings put both
 * of them 37 mm from the front — which is where a hinge is.
 *
 * @returns {{origin:number[], u:number[], v:number[], n:number[]}|null}
 *          `origin` is the CNC (0,0) in cabinet mm; `u` and `v` are unit
 *          vectors for its x and y; `n` is the panel's outward face normal.
 */
export function panelPlacement(panel) {
  const box = panel?.box;
  if (!box) return null;
  switch (panel.part) {
    case 'BUL':
      // A vertical slab in X. CNC x runs back from the front face; y is height.
      return {
        origin: [box.x, box.y, box.z + box.d],
        u: [0, 0, -1],
        v: [0, 1, 0],
        n: [-1, 0, 0],
      };
    case 'BUR':
      return {
        origin: [box.x + box.w, box.y, box.z],
        u: [0, 0, 1],
        v: [0, 1, 0],
        n: [1, 0, 0],
      };
    case 'TOP':
    case 'BOTTOM':
      // Drawn rotated: CNC x spans the cabinet's DEPTH from the back, CNC y
      // spans the internal width.
      return {
        origin: [box.x, box.y + (panel.part === 'TOP' ? box.h : 0), box.z],
        u: [0, 0, 1],
        v: [1, 0, 0],
        n: [0, panel.part === 'TOP' ? 1 : -1, 0],
      };
    // ─── Turn 13 (CLAUDE.md F8): the two interior boards CARRY MACHINING NOW ──
    //
    // Until this turn a shelf and a vertical partition were rectangles with
    // nothing on them, so neither needed a mapping. The biscuit set puts real
    // machining on both — screws and a 70 mm mark on the board that RECEIVES a
    // partition, and the matching mark on the partition itself — and a mapping
    // is what lets the X-ray draw it where it will actually be cut.
    //
    // Both are drawn UPRIGHT by `rectGeometry`, and the frames follow from that:
    // a shelf is `w × depth`, so its CNC x runs along the cabinet's WIDTH and
    // its y along the DEPTH; a partition is `height × depth`, so its x runs UP.
    // Handedness is the right one in both (u × v = −n), which is what the turn
    // 13 F1 guard is about.
    case 'SHELF':
    case 'PARTITION':
    case 'RAIL-PART':
      // Drawn on the face a partition lands on — the TOP one.
      return {
        origin: [box.x, box.y + box.h, box.z],
        u: [1, 0, 0],
        v: [0, 0, 1],
        n: [0, 1, 0],
      };
    case 'VPART':
      return {
        origin: [box.x, box.y, box.z],
        u: [0, 1, 0],
        v: [0, 0, 1],
        n: [-1, 0, 0],
      };
    case 'BACK':
      // ─── Turn 12 (CLAUDE.md F10): A BACK MAY BE DRAWN ROTATED ───
      //
      // Owner: the FRIDGE housing's back panel renders turned 90°, and it was
      // right before. It was, and this is where it turns.
      //
      // Every other back in the app is drawn upright, so this case assumed one.
      // KIT_FRIDGE does not: its top back panel is nested with its HEIGHT along
      // the drawing's x (`rotated: true`, `drawn_w` = the panel's height), the
      // same way the TOP is — and the TOP's case above has always said so. This
      // one did not, so the machined outline was built in a 296 × 600 frame and
      // laid down as if it were 600 × 296.
      //
      // WHICH of the two 90° turns is not a guess. It is read off the DRILLING:
      // the panel's sockets have to land on the side panels' tabs.
      //
      // ─── TURN 14 (CLAUDE.md F2): …AND THE PANEL WAS THE THING UPSIDE DOWN ──
      //
      // Turn 12 made the sockets line up by running the CNC x DOWN from the top
      // of the piece. That closes ONE of the four joints on this panel and
      // opens the other three, which is the signature of a mirror rather than a
      // turn. Counted in cabinet millimetres on the default housing (H 2100,
      // fixed panel at 1804):
      //
      //   sockets    x 95        → y 2005   ✓ the side panels' top tenon
      //   fixed screws x G/2     → y 2091   ✗ at the TOP, and they screw into
      //                                       the fixed panel at 1804
      //   top screws x h−S       → y 1813   ✗ at the fixed panel, and they are
      //                                       the TOP panel's
      //   TOP sockets, right edge → y 1804  ✗ the right edge IS the cabinet top
      //                                       (KIT_FRIDGE.lsp L389-397)
      //
      // The owner's verdict — "the top back is UPSIDE-DOWN, bones at the bottom,
      // must be at the top" — is the other reading, and it closes all four: the
      // SOCKET ROW moves to 95 from the panel's top (engine/cabinet.js, F2) and
      // the frame goes back to the LISP's own, x running UP from the edge that
      // screws to the fixed panel.
      //
      // Handedness is unchanged (u × v = −n on both branches), so the face is
      // turned and not mirrored — which is why `v` runs the other way here: with
      // x up the cabinet, the drawn face is the one seen from INSIDE, and the
      // LISP's "BUL socket / BUR socket" labels swap. They cut identically; the
      // two sockets are both 95 in from the drawn x origin.
      return panel.cnc?.rotated
        ? {
          origin: [box.x + box.w, box.y, box.z],
          u: [0, 1, 0],
          v: [-1, 0, 0],
          n: [0, 0, -1],
        }
        : {
          origin: [box.x, box.y, box.z],
          u: [1, 0, 0],
          v: [0, 1, 0],
          n: [0, 0, -1],
        };
    default:
      return null;
  }
}

/** A CNC point, in cabinet millimetres, lifted `off` mm off the panel's face. */
function place(placement, x, y, off = 0) {
  const { origin: o, u, v, n } = placement;
  return [
    o[0] + u[0] * x + v[0] * y + n[0] * off,
    o[1] + u[1] * x + v[1] * y + n[1] * off,
    o[2] + u[2] * x + v[2] * y + n[2] * off,
  ];
}

/** The four corners of a CNC pocket, as a closed loop. */
function pocketLoop(placement, pocket, off) {
  return [
    place(placement, pocket.x1, pocket.y1, off),
    place(placement, pocket.x2, pocket.y1, off),
    place(placement, pocket.x2, pocket.y2, off),
    place(placement, pocket.x1, pocket.y2, off),
    place(placement, pocket.x1, pocket.y1, off),
  ];
}

/**
 * How many TABS this panel's cutting data describes.
 *
 * Counted off the dog-bone reliefs, one per tab, because that is the pocket the
 * tab exists for — a tab with no relief could not be cut by a round cutter at
 * all. It is the number `test/joinery.test.js` holds the drawing to.
 */
export function tabCount(panel, layers) {
  const dogbone = layers?.dogbone;
  if (!dogbone) return 0;
  return (panel?.cnc?.pockets || []).filter((p) => p.layer === dogbone).length;
}

/** …and how many SOCKETS receive one. */
export function socketCount(panel, layers) {
  const socket = layers?.socket;
  if (!socket) return 0;
  return (panel?.cnc?.pockets || []).filter((p) => p.layer === socket).length;
}

/**
 * The joint, as lines to draw on one panel.
 *
 * @param {object} panel   an engine panel record
 * @param {object} layers  joineryLayers(profile)
 * @param {object} opts
 *   xray  false → the division lines only; true → the whole joint
 *   lift  how far off the panel's face to draw, in mm (z-fighting)
 * @returns {Array<{kind:string, points:number[][]}>}
 */
export function jointLines(panel, layers, { xray = false, lift = 0.4, drills = [] } = {}) {
  const placement = panelPlacement(panel);
  const cnc = panel?.cnc;
  if (!placement || !cnc || !layers) return [];
  const out = [];
  const pockets = cnc.pockets || [];

  if (!xray) {
    // ── SOLID: the division lines, and nothing else ──
    //
    // What you can actually see on an assembled carcass is where a TAB crosses
    // the joint: two short breaks in the line, one at each shoulder. They are
    // taken off the SOCKET pockets, because the socket is where the tab ends up
    // and the socket is on the panel being drawn.
    //
    // Discreet on purpose. The point is not to explain the joint; it is that a
    // cabinet stops reading as six boxes that meet at nothing.
    for (const p of pockets) {
      if (p.layer !== layers.socket) continue;
      out.push({ kind: 'tab', points: [place(placement, p.x1, p.y1, lift), place(placement, p.x1, p.y2, lift)] });
      out.push({ kind: 'tab', points: [place(placement, p.x2, p.y1, lift), place(placement, p.x2, p.y2, lift)] });
    }
    return out;
  }

  // ── X-RAY: the whole joint ──
  // The outline first — it carries the tab PROFILES, which is the shape the
  // system is named for and the one thing a picture of a dog bone cannot show.
  //
  // ─── Turn 13 (CLAUDE.md F8) ───
  // …and ONLY when there is a profile to show. Turn 13 gave the shelf and the
  // partition a placement, because they carry the biscuit set now — and the
  // moment they had one, this drew their outlines too: a rectangle exactly on
  // the board's own edges, which is nothing but a coin toss per pixel against
  // the panel behind it. A plain rectangle is not a joint, so it is not drawn.
  const jointed = pockets.some((p) => p.layer === layers.dogbone || p.layer === layers.socket);
  const outline = cnc.outline || [];
  if (jointed && outline.length > 2) {
    out.push({
      kind: 'outline',
      points: [...outline, outline[0]].map(([x, y]) => place(placement, x, y, lift)),
    });
  }
  for (const p of pockets) {
    const kind = p.layer === layers.dogbone ? 'dogbone' : (p.layer === layers.socket ? 'socket' : null);
    if (!kind) continue;
    out.push({ kind, points: pocketLoop(placement, p, lift) });
  }

  // ─── Turn 13 (CLAUDE.md F8): the biscuit set, on the furniture ───
  // The 70 mm mark as the run the cutter makes, and the ⌀3 screws that flank it
  // as circles at the size they are bored. Read off the SAME data the DXF is
  // written from — `cnc.marks` and `result.drills` — so what the X-ray shows and
  // what the machine cuts cannot drift apart.
  for (const mark of cnc.marks || []) {
    out.push({
      kind: 'biscuit',
      points: [place(placement, mark.from[0], mark.from[1], lift),
        place(placement, mark.to[0], mark.to[1], lift)],
    });
  }
  for (const hole of drills) {
    if (hole.panel !== panel.id || hole.kind !== 'biscuit_screw') continue;
    out.push({ kind: 'screw', points: holeLoop(placement, hole, lift) });
  }
  return out;
}

/** A drilled hole, as a ring of points at its real diameter. */
function holeLoop(placement, hole, off, segments = 12) {
  const r = Math.max(0, (Number(hole.d) || 0) / 2);
  const pts = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(place(placement, hole.x + Math.cos(a) * r, hole.y + Math.sin(a) * r, off));
  }
  return pts;
}

/**
 * Every panel of a unit that has a joint worth drawing, with its lines.
 * The parts that carry none — a shelf, a drawer box, a front — are simply not
 * in the answer, so a caller never has to know which is which.
 */
export function unitJointLines(result, layers, opts = {}) {
  const out = [];
  // The drilling travels with the result, not with the panel, so it is passed
  // through here — which is also why the biscuit screws could not simply be
  // read off `panel.cnc.holes` (turn 13, F8).
  const drills = result?.drills || [];
  for (const panel of result?.panels || []) {
    const lines = jointLines(panel, layers, { ...opts, drills });
    if (lines.length) out.push({ panel: panel.id, lines });
  }
  return out;
}
