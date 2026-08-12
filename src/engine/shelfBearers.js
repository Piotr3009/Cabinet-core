// ─── A SHELF DRILLS THE TWO BOARDS THAT CARRY IT (turn 27, CLAUDE.md F1) ────
//
// The owner, from the eye test: a shelf running from BUR to a partition gets
// its ⌀7.5 holes bored in **BUL** — a board that shelf never touches.
//
// He is right, and the cause is one assumption written in 2 places since turn
// 1: `for (const sideId of ['BUL', 'BUR'])`. That is true of a cabinet with no
// partition in it and of nothing else. A shelf lands on TWO vertical boards and
// which two is a fact about the shelf's own run, not about the kit.
//
// ─── WHAT A BEARER IS ───────────────────────────────────────────────────────
//
//        BUL          VPART-1          BUR
//        ┃              ┃               ┃
//        ┃   ┌──────┐   ┃  ┌─────────┐  ┃
//        ┃   │shelf │   ┃  │  shelf  │  ┃
//        ┃   └──────┘   ┃  └─────────┘  ┃
//        ┗━ BUL + VPART-1 ┛  ┗━ VPART-1 + BUR ━┛
//
// Three kinds of pair — side/side, side/partition, partition/partition — and
// one derivation for all three: the nearest vertical face to the LEFT of the
// shelf's run and the nearest one to its RIGHT, out of the boards that are
// actually standing there at that height.
//
// ─── EACH BEARER IN ITS OWN FRAME (F1.2) ────────────────────────────────────
//
// A side panel starts at the cabinet floor; a partition stands INSIDE the
// carcass and its CNC origin is its OWN bottom edge, one board up (or higher,
// where it terminates on a shelf). A hole measured from the cabinet floor and
// drilled on a partition is out by exactly that, on every hole — so the world
// height is converted PER BEARER, here, and never once for both.
//
// The x axis is the same conversion twice: every one of these boards is drawn
// `depth × height` with x running from its own FRONT edge (turn 24, F8, which
// gave the partition the convention BUL has carried since turn 1), so one
// column is `columnFromEdge` from the front and the other is `backColumn` from
// the back of THAT board's own depth. A partition set back 20 mm from the face
// is 20 mm shallower and its back column moves with it.
//
// ─── ONE RESOLUTION, THREE CONSUMERS ────────────────────────────────────────
//
// The pin ladder (adjustable), the biscuit-and-screw joint (fix, turn 24 F7)
// and the shelf's own dimension chain (F1.3) all ask this module. A shelf whose
// sheet said one thing and whose dimension said another is exactly the fault
// this turn is fixing, and two derivations is how that happens.
//
// Pure functions and pure data. No React, no store, no three.js.

/** How near a face has to be to count as touched, when nothing else is said. */
const EPS = 1e-6;

/**
 * The vertical boards a shelf could stand on, left to right.
 *
 * Read off the ENGINE's own panels rather than off `params`, so a partition the
 * engine has clamped is measured where the engine put it and not where the
 * field asked for it — the same rule `engine/partitionPositions.js bayWidthsOf`
 * states for the bays.
 *
 * @param {Array} panels  computeCabinet() panels
 * @returns {Array<{id, kind:'side'|'partition', panel, from:number, to:number}>}
 *   `from`/`to` are the board's two faces in the cabinet's own frame.
 */
export function bearingWalls(panels = []) {
  const out = [];
  for (const p of panels || []) {
    if (!p?.box) continue;
    const kind = (p.part === 'BUL' || p.part === 'BUR')
      ? 'side'
      : (p.part === 'VPART' ? 'partition' : null);
    if (!kind) continue;
    out.push({
      id: p.id, kind, panel: p, from: p.box.x, to: p.box.x + p.box.w,
    });
  }
  return out.sort((a, b) => a.from - b.from);
}

/** Does this board actually reach the height the shelf is at? */
function spansLevel(wall, level) {
  if (!Number.isFinite(Number(level))) return true;
  const y = Number(level);
  return y >= wall.panel.box.y - EPS && y <= wall.panel.box.y + wall.panel.box.h + EPS;
}

/**
 * THE TWO BOARDS THAT CARRY ONE SHELF.
 *
 * @param {object} args
 *   walls      `bearingWalls(panels)` — passed in, so a caller that asks about
 *              a dozen shelves builds the list once
 *   run        { from, to } — the shelf's own reach, `panel.meta.run`
 *   level      the world height the shelf is at; a partition that stops below
 *              it is not carrying it, and a board this high is skipped
 *   tolerance  how far the shelf may stand off a face and still be on it. An
 *              ADJUSTABLE shelf is cut `shelfWidthClearance` narrow than its
 *              bay and sits half of it off each bearer — it is standing on
 *              those two boards all the same, on four pins driven into them.
 * @returns {{left:object|null, right:object|null}} each entry is a wall record
 *   with the BEARING FACE added: `face` is the face the shelf lands against.
 */
export function shelfBearers({
  walls = [], run = null, level = null, tolerance = 0,
}) {
  const from = Number(run?.from);
  const to = Number(run?.to);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return { left: null, right: null };
  const slack = Math.max(0, Number(tolerance) || 0) + EPS;
  const here = (walls || []).filter((w) => spansLevel(w, level));

  // The nearest face to the LEFT of the shelf's own left end…
  const left = here
    .filter((w) => w.to <= from + slack)
    .sort((a, b) => b.to - a.to)[0] || null;
  // …and to the RIGHT of its right end.
  const right = here
    .filter((w) => w.from >= to - slack)
    .sort((a, b) => a.from - b.from)[0] || null;

  return {
    left: left ? { ...left, face: left.to } : null,
    right: right ? { ...right, face: right.from } : null,
  };
}

/** The pair as a list, left then right, with anything missing dropped. */
export function bearerList(bearers) {
  return [bearers?.left, bearers?.right].filter(Boolean);
}

/**
 * A world height in ONE bearer's own coordinates (F1.2).
 *
 * The board's CNC origin is its own bottom edge: the cabinet floor for a side,
 * one board up (or the top of the shelf it terminates on) for a partition.
 */
export function heightOnBearer(bearer, worldY) {
  return Number(worldY) - (Number(bearer?.panel?.box?.y) || 0);
}

/** Is this point on the bearer's board at all, or off the end of it? */
export function onBearer(bearer, localY) {
  const h = Number(bearer?.panel?.box?.h) || 0;
  const y = Number(localY);
  return Number.isFinite(y) && y >= -EPS && y <= h + EPS;
}

/**
 * The two PIN COLUMNS on one bearer, in that board's own frame.
 *
 * Every one of these boards is drawn `depth × height` with x from its own FRONT
 * edge, so this is the side's own turn-1 law asked of whichever board is
 * actually there: one column `columnFromEdge` from the front, one `backColumn`
 * from the back of THAT board's depth.
 *
 * @param {object} bearer
 * @param {object} spec  { columnFromEdge, backColumn }
 */
export function pinColumns(bearer, { columnFromEdge, backColumn }) {
  const depth = Number(bearer?.panel?.box?.d) || 0;
  return [Number(columnFromEdge) || 0, depth - (Number(backColumn) || 0)];
}

/**
 * THE SHELF'S OWN CLEAR BAY (F1.3): bearer face to bearer face.
 *
 * "The shelf's chain measures its own clear bay — bearer face to bearer face —
 * not the full internal width." The dimension and the drilling therefore come
 * out of one resolution, which is what stops a picture and a sheet disagreeing
 * about which boards a shelf is on.
 *
 * @returns {{from:number, to:number, size:number, of:[string,string]}|null}
 */
export function shelfBay({
  walls = [], run = null, level = null, tolerance = 0,
}) {
  const { left, right } = shelfBearers({
    walls, run, level, tolerance,
  });
  if (!left || !right) return null;
  return {
    from: left.face,
    to: right.face,
    size: right.face - left.face,
    of: [left.id, right.id],
  };
}
