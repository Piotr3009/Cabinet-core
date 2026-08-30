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
  // ─── TURN 37 (CLAUDE.md F5e): A TOP BOX IS AN ABOVE NEIGHBOUR ────────────
  //
  // The owner, walking T36-F7: adding a Top box must shorten the door under
  // it, *"and grows back when the box is removed"*. It is the same physical
  // fact the infill and the cornice already state — there is a carcass
  // standing on this door's top edge, and a door swinging into it is a door
  // that fouls — so it joins them here rather than growing a second law.
  //
  // `ridden_by` is stamped on the HOST by `engine/topBox.js settleRiders`,
  // which runs on every path that could move a main. That is what makes this
  // self-healing in both directions: the box leaves, the stamp goes, the
  // demand falls back to 0 and the door grows back, without anybody
  // remembering to ask.
  //
  // A cabinet nothing rides — every unit in every project before tonight, and
  // every bare `computeCabinet()` — has no such param and reads 0, which is
  // why F5 moves no fixture and names no classifier bucket.
  const ridden = Boolean(params?.ridden_by);
  return infill || cornice || ridden ? gap : 0;
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

// ─── TURN 58 (F1): WHICH BOARD CARRIES THIS LEAF'S PLATES ───────────────────
//
// The owner: *"jak mamy skos i się przełącza z lewej na prawą stronę drzwi, ale
// na BUL i BUR się już nie przełącza."*
//
// THE TABLE THIS REPLACES (licensed deletion 1), from `engine/cabinet.js`:
//
//     const hingedSides = dropsForward ? []
//       : (doorCount === 2 ? ['BUL', 'BUR']
//         : (doorCount === 1 ? [cfg.hinge === 'R' ? 'BUR' : 'BUL'] : []));
//
// Two doors ⇒ BOTH sides, always. One door ⇒ the side the RAW param names. It
// was written when a leaf's hand could not change, and under a rake it can:
// T46/T55 force both leaves to the tall edge (`meta.hingeForced`) and T55-F3
// puts a DOOR PARTITION under the flipped leaf's new hinge line. The table
// went on boring the board the leaf had just left — 6 phantom ⌀5 holes on a
// 1000 × 2200 two-door wardrobe, and on a ONE-door cabinet the raw pick was
// the whole answer, so the board the door really hangs on took none at all.
//
// THE LAW, and it is a question about ONE LEAF rather than about a cabinet:
// a leaf's plates go in THE BOARD THAT STANDS ON ITS HINGE LINE. That single
// sentence answers every case the old table needed a branch for — two doors,
// one door, either hand, forced or free, a carcass side or a partition — and
// it answers the ones it got wrong. Slope RIGHT is the same call as slope
// LEFT: there is no branch here that could tell them apart, which is what the
// mirror test in `turn58-f1-the-phantom-column.test.js` is guarding.

/**
 * THE HAND A LEAF OPENS ON, under a ceiling that cuts it (T46's law).
 *
 * *"brak wyboru otwierania"* — the door opens FROM the slope, so the hinges
 * live on the FULL-HEIGHT edge and the diagonal never carries one. A tie keeps
 * the hand that was already chosen, which on every level cabinet in this app
 * is the hand it has always had.
 *
 * It is here, and exported, because turn 58 gave it a SECOND reader: the
 * carcass hinged-side answer is needed before the leaves are cut, and a second
 * copy of this comparison is precisely how the hand and the board it hangs on
 * came to disagree in the first place.
 *
 * @param {Array<{y:number}>} roomPts  the leaf's own stretch of the ceiling,
 *   in the leaf's frame, as the one sampler in `cabinet.js` hands it over
 * @param {'L'|'R'} free  the hand the leaf would take with no rake over it
 */
export function slopeForcedHand(roomPts, free = 'L') {
  if (!Array.isArray(roomPts) || roomPts.length < 2) return free;
  const l = Number(roomPts[0].y);
  const r = Number(roomPts[roomPts.length - 1].y);
  if (!(Number.isFinite(l) && Number.isFinite(r))) return free;
  if (l === r) return free;
  return l > r ? 'L' : 'R';
}

/** Does `x` fall within this board's own thickness, end-inclusive? */
function standsOn(panel, x, tol = 0.51) {
  const box = panel?.box;
  if (!box) return false;
  const from = Number(box.x);
  const to = from + Number(box.w);
  if (!(Number.isFinite(from) && Number.isFinite(to))) return false;
  return x >= from - tol && x <= to + tol;
}

/** The boards a hinge plate can be screwed to: the two sides and a partition. */
const BEARER_PARTS = new Set(['BUL', 'BUR', 'VPART']);

/**
 * WHICH BOARD CARRIES THIS LEAF'S PLATES — the one resolver (turn 58, F1).
 *
 * Consumed by the drilling pass, by the hardware 3-D (so a hinge MESH cannot
 * appear on a board the sheet does not bore) and by the store's bay logic.
 * One answer, three readers.
 *
 * @param {object} leaf   an engine panel record; anything that is not a hinged
 *   FRONT answers null, which is how the appliance face and every carcass
 *   board fall out without a branch of their own.
 * @param {object} opts
 *   panels  the cabinet's own boards — where the partition is found
 * @returns {string|null} the bearing panel's id, or null where a leaf hangs on
 *   nothing this cabinet cuts (a flipped face leaf before the store has put a
 *   door partition under it — and nothing is bored for it, which is the fix).
 */
export function plateBearerOf(leaf, { panels = [] } = {}) {
  if (!leaf || leaf.part !== 'FRONT' || !leaf.box) return null;
  // A BAY leaf was answered by `bayDoorPlan` when its bay was planned, and that
  // answer knows things geometry does not — which of a partition's two FACES
  // takes the plate. Deferring to it keeps turn 21's law the only law about
  // bay leaves, and keeps this function from becoming a second one.
  if (leaf.meta?.hingeOn) return leaf.meta.hingeOn;
  const hand = leaf.meta?.hinge;
  if (hand !== 'L' && hand !== 'R') return null;
  // The HINGE LINE: the leaf's own left edge on a left hand, its right edge on
  // a right one. Forced or free, the leaf has already said which (`meta.hinge`
  // is where T46 writes the rake's verdict), so this reads one fact and does
  // not re-derive it.
  const line = hand === 'L' ? Number(leaf.box.x) : Number(leaf.box.x) + Number(leaf.box.w);
  if (!Number.isFinite(line)) return null;
  const bearer = panels.find((p) => BEARER_PARTS.has(p?.part) && standsOn(p, line));
  return bearer ? bearer.id : null;
}

/**
 * The carcass sides that carry a hinged door, read off the leaves themselves.
 *
 * The replacement for the static table, in the shape its consumers wanted: the
 * drawer-panel standoff (T40-F3a) and the plate pattern read ONE list, so — in
 * that turn's own words — *"the strip and the plate holes can no longer
 * disagree about whether a side carries a door."* They still cannot; what
 * changed is that the list is now derived from the doors instead of from a
 * door COUNT.
 */
/**
 * The bay boundaries as far as the CARCASS is concerned, for `n` bays.
 *
 * Only two boundaries in any cabinet can ever be a carcass side, and which two
 * does not depend on where the partitions stand: the FIRST bay's left boundary
 * is always BUL and the LAST bay's right is always BUR. Everything between is a
 * partition, and a leaf hung on one reserves nothing on the carcass.
 *
 * Stated here, once, because the DESIGN layer has to answer this question
 * before the engine has cut a partition to measure — and re-deriving the
 * partition geometry up there to answer a question the geometry has no say in
 * is exactly the kind of second reading turn 58 is about.
 */
export function carcassBaysFor(n) {
  const count = Math.max(0, Number(n) || 0);
  if (!count) return [];
  const bounds = [
    boundaryAt('side', 0, 0, 'BUL'),
    ...Array.from({ length: count - 1 }, (_, i) => boundaryAt('partition', 0, 0, `VPART-${i + 1}`)),
    boundaryAt('side', 0, 0, 'BUR'),
  ];
  return Array.from({ length: count }, (_, i) => ({
    index: i, from: 0, to: 0, size: 0, left: bounds[i], right: bounds[i + 1],
  }));
}

/**
 * Which CARCASS sides carry a hinged BAY door — read OFF `bayDoorPlan`.
 *
 * The design layer's replacement for its own raw pick (turn 58, F1). It asks
 * the plan the engine will ask, so the two cannot answer differently.
 */
export function hingedBaySidesOf(modes = []) {
  if (!Array.isArray(modes) || !modes.length) return undefined;
  const plan = bayDoorPlan({ bays: carcassBaysFor(modes.length), modes });
  const sides = plan.filter((l) => !l.onPartition).map((l) => l.hingeOn);
  return [...new Set(sides)].filter((id) => id === 'BUL' || id === 'BUR').sort();
}

export function hingedSidesOf(leaves = [], { panels = [] } = {}) {
  const sides = leaves
    .map((leaf) => plateBearerOf(leaf, { panels }))
    .filter((id) => id === 'BUL' || id === 'BUR');
  return [...new Set(sides)].sort();
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
    // A shaker's `meta.shaker.depth` moves NEITHER PLANE — the rebate is cut
    // in the outer face — so the datum is the datum for every leaf type.
    //
    // ─── TURN 51 (CLAUDE.md F5) ─────────────────────────────────────────────
    //
    // What the rebate DOES move is how much material stands under the cup, and
    // this used to say the rebate was "deliberately not consulted" full stop.
    // That sentence was right about the two planes and wrong about the bore:
    // `thickness` here is the BOARD, and the bore must be measured against the
    // board AT THE CUP, which on a shaker is less. See `cupThicknessAtBore`.
    innerZ: Number(box.z),
    outerZ: Number(box.z) + thickness,
    thickness,
  };
}

/**
 * ─── TURN 51 (CLAUDE.md F5): THE MATERIAL UNDER THE CUP ─────────────────────
 *
 * The owner, 26.08.2026, with the door in his hand:
 *
 *   *"puszka trochę odstaje od lica … drzwi mają 18 minus 6 daje 12, a puszka
 *   jest na głębokość 11, więc nie powinno być widoczne. może puszka jest oka,
 *   ale otwór jest za głęboki?"*
 *
 * He is right, and the last four words are the whole of it. The cup is the one
 * hole in this app that does not go through, and its depth was measured against
 * THE BOARD. On a shaker the board is not what is under the cup: the rebate is
 * cut in the OUTER face, so where the cup lands in the panel field there is
 * `thickness − rebate` and nothing more. 18 − 6 = 12; an 11 mm cup leaves ONE
 * millimetre of floor instead of seven, and one millimetre reads through a
 * sprayed face. At 16 mm board it would break out altogether — which is the
 * fault `cupFloorKeepMm` exists to prevent and was measuring the wrong
 * thickness to catch.
 *
 * THE RULE — born in `reference/lisp/SKYLON_COMMON.lsp` (`SKY:cupThickness`),
 * iron rule 3, and this is the application following it:
 *
 *   FULL BOARD       where the WHOLE cup lands on the shaker's frame — the
 *                    frame is not rebated, so the board is all there.
 *   LESS THE REBATE  where ANY of the cup reaches the panel field. The cup is
 *                    a circle, so what decides is its FAR EDGE — `xFromHingeEdge
 *                    + diameter/2` — and not its centre. A ⌀35 cup at 21.5
 *                    reaches 39 mm in: a 60 mm frame carries it whole, a 30 mm
 *                    frame does not.
 *
 * A GLASS front is the same sentence with the rebate going all the way through:
 * the aperture is a hole, and a cup that reached it would be a cup in fresh
 * air. It is measured at the frame and REFUSED beyond it (thickness 0), so the
 * report below names it rather than the app boring into nothing.
 *
 * A PLAIN door has no rebate and gets its board back, to the millimetre.
 *
 * @returns {number} the material under the cup, in mm
 */
export function cupThicknessAtBore(panel, profile) {
  const thickness = Number(panel?.box?.d) || 0;
  if (!(thickness > 0)) return 0;
  const cups = profile?.hinges?.cups || {};
  const centre = Number(cups.xFromHingeEdge) || 0;
  const reach = centre + (Number(cups.diameter) || 0) / 2;

  const glass = panel.meta?.glass;
  if (glass) {
    const frame = Number(glass.frame) || 0;
    // Past the frame there is no material at all — it is the aperture.
    return reach <= frame ? thickness : 0;
  }
  const shaker = panel.meta?.shaker;
  if (!shaker) return thickness;
  const frame = Number(shaker.frame) || 0;
  const rebate = Math.max(0, Number(shaker.depth) || 0);
  if (!(rebate > 0)) return thickness;
  return reach <= frame ? thickness : Math.max(0, thickness - rebate);
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
  // ─── TURN 51 (CLAUDE.md F5): AGAINST THE THICKNESS AT THE CUP ───────────
  //
  // Not `datum.thickness`, which is the BOARD. On a shaker whose frame is
  // narrower than the cup's reach, the board is 18 and the material under the
  // cup is 12 — and clamping against 18 left one millimetre of floor where
  // seven were wanted. `SKY:cupDepth` is the same arithmetic in the LISP.
  const atCup = cupThicknessAtBore(panel, profile);
  const depth = Math.min(wanted, Math.max(0, atCup - keep));
  return {
    ...datum,
    // The board is still the board — the two planes and the leaf's own
    // thickness are unchanged, and everything that hangs a hinge off them
    // reads exactly what it read.
    thicknessAtCup: atCup,
    depth,
    floorZ: datum.innerZ + depth,
    // ─── …AND A FRONT TOO THIN TO TAKE ONE IS REPORTED, NOT BORED SHALLOW ──
    //
    // *"Report in Check when a front is too thin to take a cup at all, rather
    // than silently boring a shallower one."*  A shortened cup is a hinge that
    // does not hold, found by a customer. The bore is still clamped — nothing
    // is allowed to break out while somebody reads the report — and this says
    // the clamp had to do something.
    short: depth < wanted - 1e-6,
    wanted,
  };
}

// ─── TURN 52 (CLAUDE.md F2): THE CUP DOES NOT SHOW THROUGH THE FACE ─────────
//
// The owner, 26.08.2026, of a 25 mm shaker: *"nie działa — nadal widać
// zawiasy."*  T51's F5 was a real fix for a real fault — a thin front bored
// through — and on THIS door it cannot even fire: 25 less a 6 mm rebate is 19
// mm of material under an 11 mm cup, and the bore is the number it always was.
//
// So the question is not the BORE, it is where the body is PUT — and until
// tonight no file in this app said, in one place, which way the cup runs
// through the door's thickness. `3d/Hardware.jsx` carried the only sentence
// about it, in a comment ("the cylinder turn 7 drew at `z + cupDepth/2` sits
// entirely within the door's 25 mm") describing a procedural cylinder that has
// not existed since the chat fix of 14.08.2026 removed the stand-ins. A number
// nobody can measure is a number nobody can be wrong about out loud.
//
// THE LAW, said once, here:
//
//   THE DATUM is the door's INNER face (`doorHingeDatum`, turn 26). The
//   cabinet's +z runs from the wall towards the room, so the bit enters at
//   `innerZ` and travels in +z.
//
//   THE CUP runs FROM `innerZ` INTO the board, and its far plane is the bore's
//   own floor — `innerZ + bore.depth`, never `innerZ + the profile's nominal`.
//   On a leaf whose bore had to be shortened those two are different numbers,
//   and drawing the cup to the nominal puts ⌀35 of steel in board the machine
//   never removed: the deeper it goes the less floor is left between it and the
//   face, which is the owner's sentence from the other side.
//
//   THE BOSS — the cup's body, standing proud of the door's back face — runs
//   the OTHER way, `bossHeight` out of the leaf into the CARCASS opening. It
//   lies entirely at `z < innerZ`. If either of those runs the other way round,
//   the cup reaches the face.
//
// `seatZ` is where the MODEL's flange plane is set down so its cup floor lands
// on the bore floor. It is `innerZ` for every leaf the hinge actually fits, and
// it comes OUT of the board by the shortfall where it does not — which is what
// a hinge in too shallow a hole really does. Check already names that leaf
// (T51 `cupTooThin`); this stops the picture from denying it.
/**
 * Where the cup body and its boss sit through the leaf's thickness.
 *
 * @param {object} panel   an engine FRONT panel record
 * @param {object} profile
 * @returns {{
 *   innerZ:number, outerZ:number, cupFrom:number, cupTo:number,
 *   bossFrom:number, bossTo:number, seatZ:number, depth:number,
 *   wanted:number, short:boolean,
 * }|null}
 */
export function cupBodyPlanes(panel, profile) {
  const bore = cupBoreOf(panel, profile);
  if (!bore) return null;
  const boss = Math.max(0, Number(profile?.hardware?.hinge?.bossHeight) || 0);
  // ≤ 0: how far the body must come BACK out of the leaf for its cup floor to
  // land on the bore floor. Zero wherever the hinge fits, which is every door
  // in every project the app has cut.
  const shortfall = bore.depth - bore.wanted;
  return {
    innerZ: bore.innerZ,
    outerZ: bore.outerZ,
    // INTO the board, from the face the bit enters.
    cupFrom: bore.innerZ,
    cupTo: bore.innerZ + bore.depth,
    // …and PROUD, on the carcass side. Both planes are below `innerZ`.
    bossFrom: bore.innerZ - boss,
    bossTo: bore.innerZ,
    seatZ: bore.innerZ + shortfall,
    depth: bore.depth,
    wanted: bore.wanted,
    short: bore.short,
  };
}
