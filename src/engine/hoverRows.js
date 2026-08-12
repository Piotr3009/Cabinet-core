// ─── ONE DIMENSION LANGUAGE (turn 25, CLAUDE.md F14) ────────────────────────
//
// "The SAME thin blue arrows appear on hover for SHELVES (clear gaps to floor,
// neighbour shelf, top) and for a SIDE PANEL (interior depth and interior
// height, drawn inside the cabinet). Horizontal and vertical only… One style
// block, four consumers."
//
// The STYLE is `profile.hoverDimensions` and the SHAPE is
// `engine/dimensionArrows.js`, both already shared by the CNC part detail and
// the 3-D scene. What was missing is the third thing a dimension needs — WHICH
// NUMBERS ARE WORTH READING about this particular piece — and that is what this
// answers, once, for every kind of piece the scene lets a cursor rest on.
//
// ─── EVERY NUMBER IS A CLEAR OPENING ────────────────────────────────────────
//
// Measured between FACES, never between centre lines, exactly as turn 8's shelf
// gaps and turn 23's bay widths are: a joiner asking "will the toaster go in
// there" is asking about the clear space, and a dimension that answers with a
// centre-to-centre is answering a question nobody asked.
//
// ─── HORIZONTAL AND VERTICAL ONLY (F14.3) ───────────────────────────────────
//
// Every row below shares one coordinate between its two ends, so there is no
// path here that could produce a sloping dimension. A test asserts it rather
// than trusting the reading.
//
// ─── AND A SHELF IS MEASURED IN ITS OWN BAY (turn 27, CLAUDE.md F1.3) ───────
//
// The owner, from the eye test: a shelf's dimension chain "measures the whole
// cabinet instead of the bay it sits in". A shelf standing between a partition
// and BUR has a clear bay of its own and that is the number a joiner wants —
// bearer face to bearer face, the two boards `engine/shelfBearers.js` says are
// carrying it and the very same pair its ⌀7.5 ladder is bored into.
//
// R12: the LOOK does not change. Same component, same style block, same
// geometry — one row is added and its endpoints are the bay's.
//
// Pure functions — no React, no three.js, no store (engine rule).

import { bearingWalls, shelfBay } from './shelfBearers.js';

/**
 * The rows to draw for ONE piece, in the plane the scene draws them on.
 *
 * @param {object} result   computeCabinet() output
 * @param {string} panelId  the piece the cursor is on
 * @param {object} profile
 * @returns {{rows:Array<{from:number[], to:number[], kind:string}>, z:number,
 *            mid:number}|null}
 *   null where this piece has nothing worth reading — which is an answer and
 *   not an error: a back panel is a back panel.
 */
export function pieceHoverRows(result, panelId, profile) {
  const panels = result?.panels || [];
  const me = panels.find((p) => p?.id === panelId);
  if (!me?.box) return null;
  if (me.part === 'SHELF' || me.part === 'FIXED') return shelfRows(result, me, profile);
  if (me.part === 'BUL' || me.part === 'BUR') return sideRows(result, me, profile);
  return null;
}

/**
 * A SHELF: the clear gaps below it, above it, and to the two boards it stands
 * between — floor, neighbour, top.
 *
 * The column is read off the engine's own panels, so a shelf the joiner has
 * just dragged is measured where the engine has just put it, and a shelf in a
 * BAY is measured against the shelves in ITS bay rather than against one on the
 * other side of a partition.
 */
function shelfRows(result, me, profile = null) {
  const H = Number(result?.params?.height) || 0;
  const G = Number(result?.params?.board_t) || 18;
  const panels = result.panels || [];

  // Its own column: the horizontal boards whose run overlaps this one's.
  const overlaps = (o) => Math.min(o.box.x + o.box.w, me.box.x + me.box.w)
    - Math.max(o.box.x, me.box.x) > 1;
  const column = panels
    .filter((p) => p.box && p.id !== me.id && overlaps(p)
      && (p.part === 'SHELF' || p.part === 'FIXED' || p.part === 'BOTTOM' || p.part === 'TOP'))
    .map((p) => ({ from: p.box.y, to: p.box.y + p.box.h }))
    .sort((a, b) => a.from - b.from);

  // The floor of the compartment: the highest face below this shelf's underside.
  const below = column.filter((b) => b.to <= me.box.y + 1e-6);
  const above = column.filter((b) => b.from >= me.box.y + me.box.h - 1e-6);
  const floorY = below.length ? Math.max(...below.map((b) => b.to)) : G;
  const ceilingY = above.length ? Math.min(...above.map((b) => b.from)) : H - G;

  // Drawn on the FRONT face of the shelf and down its own middle, so the two
  // arrows stand one above the other in the compartment they measure.
  const x = me.box.x + me.box.w / 2;
  const z = me.box.z + me.box.d;
  const rows = [];
  if (me.box.y - floorY > 0.5) {
    rows.push({ kind: 'gap-below', from: [x, floorY], to: [x, me.box.y] });
  }
  if (ceilingY - (me.box.y + me.box.h) > 0.5) {
    rows.push({ kind: 'gap-above', from: [x, me.box.y + me.box.h], to: [x, ceilingY] });
  }
  // ─── TURN 27 (CLAUDE.md F1.3): AND THE BAY IT SITS IN ────────────────────
  //
  // Bearer face to bearer face — the clear light between the two boards this
  // shelf is standing on, which on a divided cabinet is its BAY and not the
  // carcass. It runs along the shelf's own centre line, between the two
  // vertical gaps and crossing neither.
  const bay = shelfBay({
    walls: bearingWalls(panels),
    run: me.meta?.run || { from: me.box.x, to: me.box.x + me.box.w },
    level: me.box.y,
    tolerance: Number(profile?.carcass?.shelfWidthClearance) || 0,
  });
  const mid = me.box.y + me.box.h / 2;
  if (bay && bay.size > 0.5) {
    rows.push({ kind: 'bay', from: [bay.from, mid], to: [bay.to, mid] });
  }
  if (!rows.length) return null;
  return { rows, z, mid };
}

/**
 * A SIDE PANEL: the cabinet's interior depth and interior height, "drawn inside
 * the cabinet".
 *
 * Inside, because that is what they are about: the two numbers a joiner wants
 * off a side are what will FIT between the boards, and a dimension floating in
 * the room outside the carcass is measuring the outside of a box he can already
 * see the size of.
 */
function sideRows(result, me, profile) {
  const H = Number(result?.params?.height) || 0;
  const D = Number(result?.params?.depth) || 0;
  const G = Number(result?.params?.board_t) || 18;
  const panels = result.panels || [];
  const has = (part) => panels.some((p) => p.part === part);

  // The interior HEIGHT: between the bottom's top face and the top's underside.
  const floorY = G;
  const ceilingY = has('TOP') ? H - G : H;
  // The interior DEPTH: from the back's inner face to the carcass front.
  const backZ = has('BACK') ? G : 0;
  const frontZ = D;

  // Drawn on the panel's INNER face, one board in from where it stands.
  const x = me.part === 'BUL' ? me.box.x + me.box.w : me.box.x;
  const rows = [];
  if (ceilingY - floorY > 0.5) {
    rows.push({ kind: 'interior-h', from: [(backZ + frontZ) / 2, floorY], to: [(backZ + frontZ) / 2, ceilingY] });
  }
  if (frontZ - backZ > 0.5) {
    rows.push({ kind: 'interior-d', from: [backZ, (floorY + ceilingY) / 2], to: [frontZ, (floorY + ceilingY) / 2] });
  }
  if (!rows.length) return null;
  // A side panel's dimensions are drawn in its OWN plane — the x is fixed and
  // the two axes on screen are the cabinet's z and y — so the caller is told
  // which plane it is looking at rather than being left to guess.
  return {
    rows, z: x, mid: (floorY + ceilingY) / 2, plane: 'side', profile,
  };
}
