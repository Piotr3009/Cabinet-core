// ─── How far a door actually opens (turn 8, CLAUDE.md F5) ───
//
// A door in the middle of a run swings a little past square, which is what a
// cup hinge does and what makes the inside of the cabinet readable. A door with
// a WALL on its hinge side cannot.
//
// The geometry is worth writing down, because the answer looks arbitrary and is
// not. A door hinged on its left, opening, sweeps its free edge forward and
// then round; the free edge's position along the wall is
//
//     x(θ) = hingeX + doorWidth · cos θ
//
// At θ = 90° that is the hinge line itself — the door stands square to the
// front and takes up no width at all. PAST 90° the cosine goes negative and the
// free edge crosses BACK over the hinge, towards the wall, until at 180° the
// door is flat against the side of the cabinet. So the wall is not hit on the
// way out; it is hit on the way past square.
//
// Which is why CLAUDE.md's answer — max 90° at a wall — is the right one and
// not a rounding: 90° is exactly the last angle at which a door of any width,
// beside a gap of any size, is still travelling away from the wall.
//
// Turn 8's other change is in here too: `gapToWall` is measured from where the
// unit ACTUALLY stands (F3), so the 10 mm every cabinet is held off the wall is
// part of the answer rather than a millimetre nobody counted.
//
// Pure functions — no React, no store imports, no three.js. Nothing here
// reaches the cut list: a swing is a picture.

const DEG = Math.PI / 180;

/**
 * The angle, in RADIANS, this door may open to.
 *
 * @param {object} args
 *   doorWidth   the front's own width, mm
 *   hingeOffset how far the hinge line is from the unit's edge on that side,
 *               mm (the overlay clearance — half the door gap)
 *   gapToWall   clear millimetres between that edge and the wall, or null when
 *               what is beside it is not a wall (a neighbour, open room)
 * @param {object} profile
 */
export function doorOpenAngle({ doorWidth, hingeOffset = 0, gapToWall = null }, profile) {
  const full = (profile?.doors?.openAngle ?? 99) * DEG;
  if (gapToWall == null) return full;

  const atWall = (profile?.doors?.openAngleAtWall ?? 90) * DEG;
  const w = Math.abs(Number(doorWidth) || 0);
  const gap = Math.max(0, Number(gapToWall) || 0);
  const offset = Math.max(0, Number(hingeOffset) || 0);
  if (w <= 0) return Math.min(full, atWall);

  // Where the free edge would touch: hingeX + w·cos θ = −gap, with the hinge at
  // `offset` inside the unit's edge and the wall `gap` outside it.
  const cos = -(gap + offset) / w;
  // A gap wider than the door itself is never reached at all; the door is free.
  const touch = cos <= -1 ? Math.PI : Math.acos(Math.max(-1, Math.min(1, cos)));

  // The door is free until it would touch. `atWall` is the floor under that,
  // because past square the door is travelling towards the wall and a swing
  // that stops with two millimetres to spare is a swing that looks wrong.
  if (touch >= full) return full;
  return Math.min(full, Math.max(atWall, 0));
}

/**
 * Where a wall unit hangs so that its TOP lines up with a tall unit's top
 * (turn 8, CLAUDE.md F5).
 *
 * A run of wall units beside a tall cabinet finishes on one line or the kitchen
 * looks like two kitchens. That line is the tall unit's top, so the mount
 * height is what puts the wall unit's top there — and it is a STARTING POINT,
 * not a rule: the field stays editable and a joiner may hang it wherever the
 * window lets him.
 *
 * @returns {number|null} the mounting height, or null when it cannot be met
 *          (a wall unit taller than the tall one it is beside).
 */
export function mountHeightAlignedWith({ tallTop, unitHeight, roomHeight = 0 }) {
  const top = Number(tallTop) || 0;
  const h = Number(unitHeight) || 0;
  const mount = top - h;
  if (!(mount > 0)) return null;
  const ceiling = Number(roomHeight) || 0;
  if (ceiling > 0 && mount + h > ceiling) return null;
  return mount;
}

// ─── The handleless grab edge, as a number (turn 16, CLAUDE.md F4) ──────────

/**
 * How far this cabinet's doors run BELOW the carcass, in millimetres.
 *
 * The engine has taken either answer since turn 3 — `true` means "the
 * workshop's number" and a millimetre value means itself (engine/cabinet.js) —
 * and turn 16 gives the control the same two answers (F4.1: "add the NUMBER —
 * default 38 (profile), editable"). This is the ONE reading of that field, so
 * the panel, the multi-selection editor and a test cannot disagree about what a
 * stored `true` means.
 *
 * @param {object} params   a unit's params
 * @param {object} profile
 * @returns {number} mm, 0 when the doors stop at the carcass
 */
export function doorExtendMm(params, profile) {
  const stored = params?.door_extend;
  if (stored === true) return Number(profile?.wallUnit?.doorExtend) || 0;
  const own = Number(stored);
  return Number.isFinite(own) && own > 0 ? own : 0;
}

/**
 * A wall unit's DOOR HEIGHT: the carcass, less the door gap, plus the extend.
 *
 * ─── CLAUDE.md F4.3, and owner decision B ───────────────────────────────────
 * "A wall unit's DOOR height and its masking-PANEL height are separate editable
 * values… neither writes the other."
 *
 * This is the DOOR's half, written as its own function for two reasons: it is
 * the number the panel shows beside the extend field, so a joiner can see what
 * he is actually cutting; and having both halves as pure functions is what lets
 * a test prove they are independent — move one and the other does not follow.
 *
 * Same arithmetic engine/cabinet.js cuts the front with (`H − doors.gap +
 * doorExtend`), read from the same two places, so this cannot drift from the
 * piece.
 */
export function doorHeightOf(params, profile) {
  const h = Number(params?.height) || 0;
  return Math.max(0, h - topDemandMm(params, profile) + doorExtendMm(params, profile));
}

/**
 * ─── TURN 35 (CLAUDE.md F12): THE DOOR'S TOP EDGE ──────────────────────────
 *
 * The owner, 16.08.2026: *"jak nie ma infilla, to wysokość drzwi szafowych
 * jest bez 3 mm przerwy; a jak dołożysz infill lub cornice, to wtedy skracamy
 * o 3 mm."* Both directions — remove the cornice and the door grows back.
 *
 * This is the front-clearance grammar's LEFT/RIGHT question asked of the TOP,
 * and it has the same two answers: a NEIGHBOUR above wants the 3, and nothing
 * above wants none. What is different is what counts as a neighbour up there.
 * There is no `unitHorizontals()` in this app and there never was: the room
 * model only ever knew about pieces standing BESIDE a unit. So the neighbour
 * above is asked of the unit's own params, which is where an infill and a
 * cornice have always lived:
 *
 *   · `top_infill_mm` — a solo unit's own scribe filler, and
 *   · `run_top_infill` — the run-level object, on the owner AND on every
 *     member (a member carrying `role: 'member'` still HAS the piece over it,
 *     which is exactly the trap `runs.js hasTopInfill` was written for), and
 *   · `cornice` / `run_cornice` — the bought moulding, which produces no panel
 *     of its own but absolutely does stand on the door's top edge.
 *
 * THE DIVERGENCE FROM THE KIT, RECORDED. Every kit in `reference/lisp/` says
 * `wysFront = (- wysSzafki 3.0)`, unconditionally — KIT_WARDROBE_FULL L865-866,
 * and the same line in BUD, BUDTALL, LOW_CABINET and WUD. No kit has ever had
 * an opinion about what stands above a cabinet, because no kit has ever had a
 * room. The owner's 16.08 amendment overrides that "3 always", and rule 3 says
 * the kit gets told first: see the `;; --- DOOR TOP EDGE (T35)` section
 * appended to KIT_WARDROBE_FULL.lsp in this same commit.
 *
 * HOW IT TRAVELS, AND WHY IT IS AN INPUT. The bare `computeCabinet()` IS the
 * AutoLISP (iron rule 2) and every golden fixture is the AutoLISP's own cut
 * list (iron rule 5), so the kit's 3 cannot simply stop coming off inside the
 * engine — a bare call with nothing said must still cut `H − 3`, and it does.
 * The owner's law arrives the way every owner-standard number in this app
 * arrives: as an INPUT on the road `shelf_pin_setback_mm` already travels —
 * the room layer knows what stands over a cabinet, so `paramsForEngine()`
 * states `front_top_gap_mm` and the engine reads it, falling back to the kit's
 * number when nobody has said anything. Rule 1, in one line.
 *
 * That also makes the self-healing free rather than swept for: the demand is
 * re-derived on EVERY compute from the unit's live params, so adding a
 * cornice, removing an infill, reloading the project — every path there is or
 * ever will be — lands on the right number without a heal pass to remember.
 *
 * @returns {number} the millimetres coming off the door's TOP edge
 */
export function topDemandMm(params, profile) {
  const stated = Number(params?.front_top_gap_mm);
  if (Number.isFinite(stated) && stated >= 0) return stated;
  return Number(profile?.doors?.gap) || 0;
}

/**
 * What the ROOM says stands over this cabinet — F12's own question, asked of
 * the unit's params, answered in millimetres of top clearance.
 *
 * There is no `unitHorizontals()` in this app and there never was: the room
 * model only ever knew about pieces standing BESIDE a unit. So the neighbour
 * above is read off the unit itself, which is where an infill and a cornice
 * have always lived:
 *
 *   · `top_infill_mm` — a solo unit's own scribe filler, and
 *   · `run_top_infill` — the run-level object, on the owner AND on every
 *     member (a member still HAS the piece over it, which is exactly the trap
 *     `runs.js hasTopInfill` was written for), and
 *   · `cornice` / `run_cornice` — the bought moulding, which produces no panel
 *     of its own but absolutely does stand on the door's top edge.
 *
 * @returns {number} 3 with something above, 0 with nothing
 */
export function topNeighbourDemand(params, profile) {
  const gap = Number(profile?.doors?.gap) || 0;
  const run = params?.run_top_infill;
  const infill = (Number(params?.top_infill_mm) || 0) > 0 || (run && typeof run === 'object');
  const corniceRun = params?.run_cornice;
  const cornice = (corniceRun && typeof corniceRun === 'object')
    || (params?.cornice != null && params.cornice !== 'none' && Number(params.cornice) > 0);
  return infill || cornice ? gap : 0;
}

// ─── DOORS ON THE PARTITION (turn 21, CLAUDE.md F12) ────────────────────────
//
// Owner's case, verbatim: a full-height partition at setback 0 must be able to
// carry doors — partitions at 600 and 800, three bays, two proper doors and one
// small one in the middle.
//
// ─── THE PRECONDITIONS ARE PHYSICAL, NOT A SETTING ─────────────────────────
//
// FULL HEIGHT, because a door hung on a board that stops half way up is hung on
// a board that will twist. SETBACK 0, because a hinge plate is screwed to the
// face of the piece the door closes against — a partition standing 20 mm back
// has nothing at the door plane to screw to. Both are read off the piece
// (F8 made the setback the partition's own), never asked for separately.
//
// ─── THE WIDTHS ARE THE OWNER'S LAW, VERBATIM ──────────────────────────────
//
// "The leaf HINGED ON the partition reaches the partition's far edge minus
// 3 mm — same rule as at a carcass side. Its neighbour keeps the 3 mm gap,
// therefore starts at the far edge and covers none of the partition — coming
// out slightly narrower, which the owner accepts. Gaps between doors: always 3."
//
// So at a partition [px, px + t], with the RIGHT bay's door hinged on it:
//
//        px          px+t
//         ├───────────┤            the partition
//    ─────┤           │            the LEFT door stops at the far edge: px
//         │  ├────────────────     the RIGHT door starts 3 mm past it: px + 3
//         └─3─┘                    …and the gap between them is 3.
//
// Mirrored when the LEFT bay's door is the hinged one. Where BOTH bays hang a
// door on the partition — which is real: it has two faces and each takes a
// plate — neither can cover it, so they meet on its centre line with the same
// 3 mm between them. Where NEITHER does, the same: the partition is simply
// exposed between two doors that are hinged elsewhere.

/** A bay is bounded on each side by the carcass, or by a partition. */
function boundaryAt(kind, x, thickness, id = null) {
  return {
    kind, x, thickness, id,
  };
}

/**
 * The bays a set of DOOR-BEARING partitions divides a carcass face into.
 *
 * Only partitions that can actually carry a door are counted — full height and
 * flush with the face — because a bay is a place a door goes, and a divider
 * that cannot carry one does not make one.
 *
 * @param {object} args
 *   width, boardT
 *   partitions  [{ id, x, fullHeight, setback }] — the pieces the engine cut
 * @returns {Array<{index, from, to, size, left, right}>} from/to are the CLEAR
 *   opening's faces; `left`/`right` are the boundaries themselves.
 */
export function doorBays({ width, boardT, partitions = [] }) {
  const W = Number(width) || 0;
  const t = Math.max(0, Number(boardT) || 0);
  const carrying = partitions
    .filter((p) => p.fullHeight && Number(p.setback) === 0 && Number.isFinite(Number(p.x)))
    .map((p) => ({ ...p, x: Number(p.x), thickness: Number(p.thickness) || t }))
    .sort((a, b) => a.x - b.x);

  const bounds = [
    boundaryAt('side', 0, t, 'BUL'),
    ...carrying.map((p) => boundaryAt('partition', p.x, p.thickness, p.id)),
    boundaryAt('side', W - t, t, 'BUR'),
  ];
  const out = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const left = bounds[i];
    const right = bounds[i + 1];
    const from = left.x + left.thickness;
    const to = right.x;
    out.push({
      index: out.length, from, to, size: Math.max(0, to - from), left, right,
    });
  }
  return out;
}

/**
 * Where each bay's door actually runs, given who is hinged on what.
 *
 * @param {object} args
 *   bays   `doorBays()` output
 *   modes  per bay, in bay order: { door: 'one'|'none', hinge: 'L'|'R' }
 *   width, gap
 * @returns {Array<{bay, x, width, hinge, hingeOn, hingeFace}>} one entry per
 *   door that exists. `hingeOn` is the boundary's id — 'BUL', 'BUR' or a
 *   partition's panel id — and `hingeFace` is which of a partition's two faces
 *   the plate is screwed to.
 */
export function bayDoorPlan({
  bays = [], modes = [], width = 0, gap = 3,
}) {
  const half = gap / 2;
  const wants = bays.map((b, i) => {
    const m = modes[i] || {};
    const on = String(m.door ?? 'none').toLowerCase() !== 'none';
    return { on, hinge: String(m.hinge || 'L').toUpperCase() === 'R' ? 'R' : 'L' };
  });
  // Which bay, if any, hangs its door on each boundary.
  const hungOn = (boundary, side) => bays.some((b, i) => wants[i].on
    && (side === 'left'
      ? (b.left === boundary && wants[i].hinge === 'L')
      : (b.right === boundary && wants[i].hinge === 'R')));

  const edgeAt = (boundary, from) => {
    // `from` is the side of the boundary the door approaches from.
    if (boundary.kind === 'side') {
      return boundary.id === 'BUL' ? half : Number(width) - half;
    }
    const mine = from === 'right' ? hungOn(boundary, 'left') : hungOn(boundary, 'right');
    const theirs = from === 'right' ? hungOn(boundary, 'right') : hungOn(boundary, 'left');
    if (mine && !theirs) {
      // This door covers the partition, all but the gap short of its far edge.
      return from === 'right' ? boundary.x + gap : boundary.x + boundary.thickness - gap;
    }
    if (theirs && !mine) {
      // The neighbour covers it; this one starts at the far edge and covers none.
      return from === 'right' ? boundary.x + boundary.thickness : boundary.x;
    }
    // Both, or neither: they meet on the partition's centre line.
    return from === 'right'
      ? boundary.x + boundary.thickness / 2 + half
      : boundary.x + boundary.thickness / 2 - half;
  };

  const out = [];
  bays.forEach((bay, i) => {
    if (!wants[i].on) return;
    const x = edgeAt(bay.left, 'right');
    const to = edgeAt(bay.right, 'left');
    const boundary = wants[i].hinge === 'L' ? bay.left : bay.right;
    out.push({
      bay: bay.index,
      x,
      width: Math.max(0, to - x),
      hinge: wants[i].hinge,
      hingeOn: boundary.id,
      // A partition has two faces and the plate goes on the one this door
      // closes against — the same distinction BUL and BUR carry, on a piece
      // that is neither.
      hingeFace: boundary.kind === 'partition' ? (wants[i].hinge === 'L' ? 'R' : 'L') : null,
      onPartition: boundary.kind === 'partition',
    });
  });
  return out;
}

/**
 * Can this unit offer per-bay doors at all?
 *
 * F12.1's preconditions, asked once so the engine, the panel and a test all get
 * the same answer.
 */
export function bayDoorsAvailable(bays = []) {
  return bays.some((b) => b.left.kind === 'partition' || b.right.kind === 'partition');
}

// ─── THE MOUNTING DATUM (turn 26, CLAUDE.md F1.2) ───────────────────────────
//
// The owner's hinge pierced the front of his doors, and the reason it could is
// that nothing in this app had ever said, once, WHICH PLANE a hinge is measured
// from. The cup was placed off `panel.box.z` in one file, the model off the
// same number read again in another, and the door's own group hangs at its
// MID-PLANE — three readings of one fact.
//
// It is one fact and this is the one place it is said:
//
//   **THE DATUM IS THE DOOR'S INNER FACE — the side the bit enters.**
//
// Never the mid-plane (which is where the swinging group's origin is, and
// which is 12.5 mm out on a 25 mm leaf), and never the recess floor of a
// SHAKER (whose rebate is cut in the OUTER face and leaves the inner one
// exactly where a plain door's is — a cup bored to the recess floor would be
// bored 8 mm proud of the board).
//
// Every leaf type answers here: plain, shaker, partition-hung, wall, tall. A
// D/W panel is not a door at all — it screws to the appliance and takes no
// cups (F5.3) — and this says so by returning null rather than by a branch
// somewhere downstream.

/**
 * @param {object} panel  an engine FRONT panel record
 * @returns {{innerZ:number, outerZ:number, thickness:number}|null}
 *   `innerZ` is the plane the cup is bored from and the plane the GLB's flange
 *   stands on; `outerZ` is the face NOTHING of a hinge may cross (F1.3).
 */
export function doorHingeDatum(panel) {
  const box = panel?.box;
  if (!panel || !box) return null;
  if (panel.part !== 'FRONT') return null;
  // An appliance front is screwed to the machine's own door: no cups, no bores,
  // and therefore no datum to hand out.
  if (panel.meta?.appliance) return null;
  const thickness = Number(box.d);
  if (!(thickness > 0)) return null;
  return {
    // The cabinet's +z runs from the wall towards the room, so a front's box.z
    // IS its inner face and `box.z + box.d` is the face the customer sees.
    // A shaker's `meta.shaker.depth` is deliberately not consulted: the rebate
    // is in the outer face and moves neither plane.
    innerZ: Number(box.z),
    outerZ: Number(box.z) + thickness,
    thickness,
  };
}

/**
 * How deep into the leaf the ironmongery is allowed to go, and where its far
 * face lands (F1.1/F1.3).
 *
 * The bore is the owner's measured `hardware.hinge.cupDepth`, clamped to the
 * board: a 25 mm cup law applied to an 18 mm door would be a through hole, and
 * a through hole is exactly the fault this turn exists to end. The clamp keeps
 * a hair of material (`floorKeep`) so the bore stays BLIND on any board this
 * workshop cuts fronts from.
 */
export function cupBoreOf(panel, profile) {
  const datum = doorHingeDatum(panel);
  if (!datum) return null;
  const wanted = Number(profile?.hardware?.hinge?.cupDepth) || 0;
  if (!(wanted > 0)) return null;
  const keep = Number(profile?.hardware?.hinge?.cupFloorKeepMm ?? 1);
  const depth = Math.min(wanted, Math.max(0, datum.thickness - keep));
  return { ...datum, depth, floorZ: datum.innerZ + depth };
}
