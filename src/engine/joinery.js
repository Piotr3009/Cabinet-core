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
    case 'BACK':
      return {
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
export function jointLines(panel, layers, { xray = false, lift = 0.4 } = {}) {
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
  const outline = cnc.outline || [];
  if (outline.length > 2) {
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
  return out;
}

/**
 * Every panel of a unit that has a joint worth drawing, with its lines.
 * The parts that carry none — a shelf, a drawer box, a front — are simply not
 * in the answer, so a caller never has to know which is which.
 */
export function unitJointLines(result, layers, opts = {}) {
  const out = [];
  for (const panel of result?.panels || []) {
    const lines = jointLines(panel, layers, opts);
    if (lines.length) out.push({ panel: panel.id, lines });
  }
  return out;
}
