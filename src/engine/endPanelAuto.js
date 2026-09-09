// ─── A LOW UNIT MEETING A TALL ONE GROWS ITS OWN END PANEL (T50, F4) ────────
//
// The owner, 25.08.2026:
//
//   *"w kuchni jak dodamy niską szafkę do wysokiej bez panela, powinien się
//   dodać panel automatycznie — i informacja na środku monitora: system dodał
//   panel wykończeniowy, chcesz to go usuń, naciśnij prawym myszką i usuń
//   panel."*
//
// ─── WHICH CABINET CARRIES IT, AND WHY IT IS THE TALL ONE ───────────────────
//
// A base run finishing against a tall cabinet leaves the TALL cabinet's side
// showing — from the base unit's worktop up to the tall unit's own top, a metre
// and a half of raw board at eye level in the middle of a kitchen. The low
// unit's side is not showing at all: the tall cabinet is standing in front of
// it, floor to ceiling.
//
// So the panel belongs to the TALL cabinet, on the side facing the low one.
// That is what a joiner screws on and it is what "panel wykończeniowy" means.
//
// ─── AND ONLY IN A KITCHEN ──────────────────────────────────────────────────
//
// *"w kuchni"* — his own first two words. A wardrobe run of different heights
// is a wardrobe, not an unfinished kitchen, and it has never wanted this.
//
// ─── REMOVING IT BY HAND IS FINAL ───────────────────────────────────────────
//
// *"chcesz to go usuń, naciśnij prawym myszką i usuń panel."*  A panel that
// came back on the next redraw would turn the message into a nag and the
// feature into a fight. So a junction the joiner has cleared is REMEMBERED —
// `params.end_panel_declined: ['L'|'R']` on the cabinet that would carry it —
// and this module never offers that junction again.
//
// Pure functions — no React, no store, no three.js.

import { getUnitType } from './types.js';
import { paddedSpan, unitBase, unitTop } from './runs.js';
import { wallWidth } from './room.js';

const round1 = (v) => Math.round(Number(v) || 0);

// ─── T65 F6 · THE WARDROBE RULE IS RETAIL'S, AND PRO IS NOT CHANGED ────────
//
// CLAUDE.md F6, and it is the sentence that decides where this switch lives:
// *"Retail adds them automatically, each removable. PRO's law — 'Plinth, top
// infill and end panels — added, never assumed' — is DELIBERATELY NOT CHANGED
// for PRO."*
//
// So the visibility question below is answered for anyone who asks
// (`sideIsVisible` is exported and a kitchen test uses it), but the AUTOMATIC
// wardrobe pass only runs where the client is. Same shape as the three
// switches the retail entry already throws — `setPersistence('none')`,
// `setProChrome(false)`, `setPickMode('client')`: additive, default = today's
// PRO behaviour, and PRO calls none of them, so PRO is exactly what it was.
//
// MEASURED, and this is why it is a switch and not a rule for everybody: with
// the wardrobe pass on for PRO, a wardrobe dropped in the middle of a room
// grows a panel on both free ends, which moves it off the wall by a board and
// takes the side infill with it. That is right for a client buying a finished
// wardrobe and wrong for a joiner laying out a room.
let wardrobeAuto = false;

/** Retail turns the wardrobe visibility rule on. PRO never calls this. */
export function setWardrobeEndPanelAuto(on) {
  wardrobeAuto = Boolean(on);
}


/** The auto end-panel block of a profile, with every field present. */
export function autoEndPanelSpec(profile) {
  const s = profile?.autoParts?.endPanel || {};
  return {
    // How big a STEP between two neighbours is a side that shows. A worktop's
    // own thickness is not a step; half a metre is.
    autoStepMm: Number(s.autoStepMm) > 0 ? Number(s.autoStepMm) : 300,
    // How far apart two cabinets may be and still be "meeting". The run gap is
    // the house's own answer to that question everywhere else.
    gapMm: Number(profile?.autoParts?.topInfill?.runGap) >= 0
      ? Number(profile.autoParts.topInfill.runGap)
      : 2,
    // ─── T65 F6 · HOW NEAR A WALL IS "AGAINST" IT ─────────────────────────
    //
    // The owner's own row: *"a wall — no panel — the wall covers it; THE
    // INFILL CLOSES THE GAP."* So the question is not "is the carcass touching
    // the plaster" — a cabinet never is — but "is the gap one the side infill
    // reaches", and the app already has that number: `sideInfill.maxWidth`.
    // Measured, a wardrobe dropped on a wall stands 65 mm off it and the
    // filler closes it; read at the 2 mm run gap instead, that reads as a free
    // end and grows a panel where a filler belongs.
    wallReachMm: Number(profile?.autoParts?.sideInfill?.maxWidth) > 0
      ? Number(profile.autoParts.sideInfill.maxWidth)
      : 120,
  };
}

/** The junction sides this unit's joiner has already cleared by hand. */
export function declinedSides(unit) {
  const said = unit?.params?.end_panel_declined;
  if (!Array.isArray(said)) return [];
  return said.filter((s) => s === 'L' || s === 'R');
}

/**
 * ─── T65 F6 · …AND THE SIDES HE ASKED FOR BY HAND ──────────────────────────
 *
 * CLAUDE.md F6: *"A panel added by hand in EXTRAS is permanent: the automat
 * never removes it. `declinedSides` holds the opposite already — add the
 * matching 'asked for' set beside it, same shape, same file."*
 *
 * The last row of the owner's own table: *"the client added one by hand in
 * EXTRAS — yes, permanently — his decision outranks the automat."* So this
 * side is a SITE whatever the geometry says, which keeps `autoEndPanelStrays`
 * from taking it off the moment a flush neighbour arrives.
 */
export function askedSides(unit) {
  const said = unit?.params?.end_panel_asked;
  if (!Array.isArray(said)) return [];
  return said.filter((s) => s === 'L' || s === 'R');
}

/** The asked-for list a unit should carry once this side has been demanded. */
export function withAsked(unit, side) {
  const want = side === 'R' ? 'R' : 'L';
  const now = askedSides(unit);
  return now.includes(want) ? now : [...now, want];
}

/** Has this unit already got a panel on that side — by any route? */
function hasPanel(unit, side) {
  return (unit?.params?.end_panels || []).some((ep) => (ep?.side === 'R' ? 'R' : 'L') === side);
}

/**
 * ═══ T65 F6 · IS ANY PART OF THIS SIDE VISIBLE? ═══════════════════════════
 *
 * The owner, and this sentence is the whole law:
 *
 *   *"po prostu nie dopuszczamy do pozostawienia boku szafy / carcasa
 *   widocznego."*
 *
 * Not *"a step demands a panel"* — VISIBILITY demands a panel. His own table:
 *
 *   beside the side          panel?   why
 *   ─────────────────────────────────────────────────────────────────────────
 *   nothing — a free end     yes      the whole side shows
 *   a wall                   no       the wall covers it; the infill closes the gap
 *   a neighbour, flush       no       the neighbour covers it
 *   a neighbour, different   yes      part of the side still shows
 *   asked for by hand        yes      his decision outranks the automat
 *
 * ONE function answers it, and it is this one. A neighbour COVERS my side only
 * when it covers all of it: it must start no higher than mine, finish no lower
 * than mine, and be no shallower. Any one of those failing leaves board
 * showing, which is the thing the owner will not have.
 *
 * ─── WHY THE KITCHEN DOES NOT CALL IT ───────────────────────────────────────
 *
 * CLAUDE.md F6 asks whether the kitchen's present behaviour is a SPECIAL CASE
 * of this question, and the honest answer, measured, is NO — it is narrower in
 * two places, and both of them would change a joiner's kitchen tonight:
 *
 *   1. A FREE END. A base run finishing in open floor has no junction at all,
 *      so T50/T51 offer nothing. Visibility says the whole side shows and
 *      demands a panel — on every run end in every kitchen in the app.
 *   2. A SMALL STEP. `autoStepMm` is 300: a 100 mm step between two base units
 *      is deliberately not worth finishing. Visibility says 100 mm of board is
 *      100 mm of board, and demands a panel there too.
 *
 * So the kitchen path is KEPT EXACTLY AS IT IS — CLAUDE.md's own instruction
 * for this case: *"do not force it: keep the kitchen path as it is, add the
 * wardrobe path beside it in the same function, and say so in the PR body with
 * the case that differed."* The two live in `autoEndPanelSites` below, named,
 * and a test holds the kitchen's answers to what they were.
 *
 * Where the two DO overlap they agree, and that is worth saying: for two
 * cabinets meeting with a step over 300 mm, "the tall one carries it" falls
 * straight out of this function — the short one's side is covered by the tall
 * neighbour, the tall one's is not covered by the short.
 *
 * @param {object} unit       the cabinet whose side is in question
 * @param {'L'|'R'} side
 * @param {object|null} neighbour  the cabinet meeting it there, or null
 * @param {{atWall:boolean}} where
 * @param {object} profile
 * @returns {{visible:boolean, why:string}}
 */
export function sideIsVisible(unit, side, neighbour, where, profile) {
  // A wall covers a side completely, and the infill closes what is left.
  if (!neighbour && where?.atWall) return { visible: false, why: 'wall' };
  // Nothing beside it at all: the whole side shows.
  if (!neighbour) return { visible: true, why: 'free end' };

  const myTop = unitTop(unit, profile);
  const myBase = unitBase(unit, profile);
  const myDepth = Number(unit?.params?.depth) || 0;
  const itsTop = unitTop(neighbour, profile);
  const itsBase = unitBase(neighbour, profile);
  const itsDepth = Number(neighbour?.params?.depth) || 0;
  const e = 1e-6;

  if (itsTop + e < myTop) return { visible: true, why: 'the neighbour is shorter' };
  if (itsBase - e > myBase) return { visible: true, why: 'the neighbour starts higher' };
  if (itsDepth + e < myDepth) return { visible: true, why: 'the neighbour is shallower' };
  return { visible: false, why: 'the neighbour covers it' };
}

/** Is this a kitchen cabinet standing on the floor? */
function inPlay(unit) {
  const type = getUnitType(unit?.type);
  if (!type) return false;
  if (type.family !== 'kitchen') return false;
  if (type.mount === 'wall') return false;
  if (type.ridesOn) return false;
  const rotation = (((Number(unit.position?.rotation_deg) || 0) % 360) + 360) % 360;
  return rotation === 0;
}

/** T65 F6 · …and is this a WARDROBE standing on the floor? */
function inPlayWardrobe(unit) {
  const type = getUnitType(unit?.type);
  if (!type) return false;
  if (type.family !== 'wardrobe') return false;
  if (type.mount === 'wall') return false;
  if (type.ridesOn) return false;
  // A top box rides on a main and is not a run member; its side is the main's
  // business, and `params.rides_on` is the store's own link for that.
  if (unit?.params?.rides_on) return false;
  const rotation = (((Number(unit.position?.rotation_deg) || 0) % 360) + 360) % 360;
  return rotation === 0;
}

/**
 * ─── TURN 51 (CLAUDE.md F3): EVERY JUNCTION THAT EXISTS ─────────────────────
 *
 * The owner, 26.08.2026: *"jak dojedziesz to już nie wymusza panela, a
 * powinno: dojeżdżam — panel się pojawia, nie dojeżdżam — panel znika.
 * proste."*
 *
 * T50 could only ever ADD, and the reason is this function: it answered "where
 * does a panel need adding", which is not the same question as "where is there
 * a junction". A junction with a panel already standing in it was filtered out
 * — by `hasPanel` — so nothing downstream could ever tell the difference
 * between a junction that had been FINISHED and one that had CEASED TO EXIST,
 * and a panel left behind by a cabinet that had been dragged away was
 * indistinguishable from one doing its job.
 *
 * So the SITES are computed first and the filtering comes after. This is the
 * geometry — a low kitchen unit meeting a tall one, with a step worth
 * finishing — and it does not care what is already screwed to it.
 *
 * Module-private on purpose: the two questions a caller actually has are
 * "where does a panel need adding" and "what is standing where no junction is",
 * and both are answered below. A third door onto the same geometry would be a
 * third thing to keep in step.
 *
 * @returns {Array<{unitId, side, otherId, stepMm, hasPanel, declined}>}
 */
function autoEndPanelSites(units, profile, { boardSlack = false, room = null } = {}) {
  const spec = autoEndPanelSpec(profile);
  const out = [];
  const list = (units || []).filter(inPlay);

  // Wall by wall, left to right along it — a junction is two neighbours.
  const byWall = new Map();
  for (const u of list) {
    const wall = u.position?.wall ?? 0;
    if (!byWall.has(wall)) byWall.set(wall, []);
    byWall.get(wall).push(u);
  }

  for (const group of byWall.values()) {
    const sorted = [...group].sort((a, b) => paddedSpan(a).left - paddedSpan(b).left);
    for (let i = 1; i < sorted.length; i += 1) {
      const left = sorted[i - 1];
      const right = sorted[i];
      // They have to be MEETING. A metre of clear wall between two cabinets is
      // not a junction, it is two runs.
      const gap = paddedSpan(right).left - paddedSpan(left).right;
      // `boardSlack` allows the space a panel taken off by hand has just left —
      // see `autoEndPanelStrays`. Off, this is T50's own 2 mm and nothing about
      // where a panel is added has changed.
      const slack = boardSlack
        ? Math.max(Number(left.params?.front_t) || 0, Number(right.params?.front_t) || 0)
        : 0;
      if (!(gap <= spec.gapMm + slack + 1e-6)) continue;

      const leftTop = unitTop(left, profile);
      const rightTop = unitTop(right, profile);
      const step = Math.abs(leftTop - rightTop);
      if (!(step >= spec.autoStepMm)) continue;

      // The TALL one carries it, on the side facing the low one.
      const tall = leftTop >= rightTop ? left : right;
      const side = tall === left ? 'R' : 'L';
      const low = tall === left ? right : left;
      out.push({
        unitId: tall.id,
        side,
        otherId: low.id,
        stepMm: round1(step),
        // Is the joint already finished — by the tall unit's own panel, or (a
        // joiner who got there first) by the LOW one's panel in the same slot?
        hasPanel: hasPanel(tall, side) || hasPanel(low, side === 'R' ? 'L' : 'R'),
        // Cleared by hand. Final FOR THIS JUNCTION, which is T51's whole
        // correction: the decline is forgotten when the junction stops
        // existing, so a cabinet moved away and brought back is a new
        // junction and may be offered a panel again.
        declined: declinedSides(tall).includes(side),
        asked: askedSides(tall).includes(side),
        why: 'kitchen step',
      });
    }
  }

  // ─── T65 F6 · THE WARDROBE PASS — VISIBILITY, NOT A STEP ─────────────────
  //
  // *"po prostu nie dopuszczamy do pozostawienia boku szafy / carcasa
  // widocznego."* Beside the kitchen's loop, not inside it, for the reason
  // `sideIsVisible` states at length: the visibility question is WIDER than
  // the kitchen's step rule in two measured places, and forcing the kitchen
  // through it would put a panel on every run end in every kitchen.
  //
  // Each wardrobe is asked about BOTH its sides — a run end is a side with
  // nothing beside it, and that is exactly the case a junction-only reading
  // could never see.
  const wardrobes = wardrobeAuto ? (units || []).filter(inPlayWardrobe) : [];
  const wardrobeWalls = new Map();
  for (const u of wardrobes) {
    const wall = u.position?.wall ?? 0;
    if (!wardrobeWalls.has(wall)) wardrobeWalls.set(wall, []);
    wardrobeWalls.get(wall).push(u);
  }

  for (const [wallIndex, group] of wardrobeWalls) {
    const sorted = [...group].sort((a, b) => paddedSpan(a).left - paddedSpan(b).left);
    const width = room ? Number(wallWidth(room, wallIndex)) || 0 : 0;
    for (let i = 0; i < sorted.length; i += 1) {
      const unit = sorted[i];
      const span = paddedSpan(unit);
      for (const side of ['L', 'R']) {
        const other = side === 'L' ? sorted[i - 1] : sorted[i + 1];
        // MEETING, by the same measure the kitchen uses — the run gap, plus
        // the board a hand-removed panel has just freed when asked to.
        const slack = boardSlack && other
          ? Math.max(Number(unit.params?.front_t) || 0, Number(other.params?.front_t) || 0)
          : 0;
        const gap = other
          ? (side === 'L' ? span.left - paddedSpan(other).right : paddedSpan(other).left - span.right)
          : Infinity;
        const neighbour = other && gap <= spec.gapMm + slack + 1e-6 ? other : null;
        // AT A WALL: the end of the run is the end of the wall. With no room
        // known, nothing can be claimed to be against a wall, and a free end
        // is the safe answer — a panel too many is a board, a panel too few is
        // the bare carcass the owner will not have.
        const atWall = side === 'L'
          ? span.left <= spec.wallReachMm + 1e-6
          : width > 0 && width - span.right <= spec.wallReachMm + 1e-6;
        const seen = sideIsVisible(unit, side, neighbour, { atWall }, profile);
        const asked = askedSides(unit).includes(side);
        if (!seen.visible && !asked) continue;
        out.push({
          unitId: unit.id,
          side,
          otherId: neighbour ? neighbour.id : null,
          stepMm: neighbour ? round1(Math.abs(unitTop(unit, profile) - unitTop(neighbour, profile))) : 0,
          hasPanel: hasPanel(unit, side)
            || (neighbour ? hasPanel(neighbour, side === 'R' ? 'L' : 'R') : false),
          // A side he ASKED for outranks a side he once cleared: the last row
          // of the owner's own table.
          declined: !asked && declinedSides(unit).includes(side),
          asked,
          why: asked ? 'asked for by hand' : seen.why,
        });
      }
    }
  }
  return out;
}

/**
 * Every junction where a LOW kitchen unit meets a TALL one with nothing
 * finishing the joint — the sites above, minus the ones already answered.
 *
 * @returns {Array<{unitId, side, otherId, stepMm}>}  the panel to add, on the
 *          TALL unit, on the side facing the low one.
 */
export function autoEndPanelJunctions(units, profile, opts = {}) {
  return autoEndPanelSites(units, profile, opts)
    .filter((j) => !j.hasPanel && !j.declined)
    .map(({ hasPanel: _h, declined: _d, asked: _a, ...rest }) => rest);
}

/**
 * ─── TURN 51 (CLAUDE.md F3): …AND WHAT NO LONGER HAS A JUNCTION ────────────
 *
 * *"An automatic panel (`meta.autoAdded`) whose junction no longer exists is
 * REMOVED, not left behind."*
 *
 * Two lists, because they are two different repairs and the caller writes them
 * differently: the PANELS to take off, and the DECLINES to forget.
 *
 * A panel the joiner added HIMSELF is never in either list. `auto_added` is the
 * whole test, and it is why T50 wrote that flag.
 *
 * @returns {{panels: Array<{unitId, panelId, side}>, declines: Array<{unitId, side}>}}
 */
export function autoEndPanelStrays(units, profile, opts = {}) {
  const standing = new Set(
    autoEndPanelSites(units, profile, opts).map((j) => `${j.unitId}:${j.side}`),
  );
  // ─── THE DECLINE NEEDS A LONGER MEMORY THAN THE PANEL ────────────────────
  //
  // A junction is "two cabinets meeting", and `autoEndPanelSites` measures that
  // on the PADDED spans within the run gap — 2 mm. That is right for the panel
  // and wrong for the decline, because TAKING THE PANEL OFF opens a gap of one
  // board: the low unit was butted against the panel's outer face, and with the
  // panel gone it is standing 18 mm clear. Read strictly, the joiner's "no"
  // would be forgotten by the very act that expressed it, and the panel would
  // come back on his next nudge — which is the nag T50 closed off.
  //
  // So a decline is forgotten only when the two cabinets are genuinely APART:
  // the same measurement with a BOARD'S THICKNESS of slack, which is exactly
  // the space the removed panel used to occupy. A real retreat is hundreds of
  // millimetres and clears this as easily as it clears the strict one.
  const nearby = new Set(
    autoEndPanelSites(units, profile, { ...opts, boardSlack: true }).map((j) => `${j.unitId}:${j.side}`),
  );
  const panels = [];
  const declines = [];
  for (const unit of units || []) {
    for (const ep of unit?.params?.end_panels || []) {
      if (!isAutoEndPanel(ep)) continue;
      const side = ep?.side === 'R' ? 'R' : 'L';
      if (standing.has(`${unit.id}:${side}`)) continue;
      // T65 F6: a side the client ASKED for is permanent — the automat never
      // takes it off, whatever arrives beside it.
      if (askedSides(unit).includes(side)) continue;
      panels.push({ unitId: unit.id, panelId: ep.id, side });
    }
    for (const side of declinedSides(unit)) {
      if (nearby.has(`${unit.id}:${side}`)) continue;
      declines.push({ unitId: unit.id, side });
    }
  }
  return { panels, declines };
}

/**
 * The sentence the app says when it has added one.
 *
 * The owner asked for it *"na środku monitora"* — in the middle of the screen —
 * and for it to name the way back out. English copy (iron rule 5).
 */
export function autoEndPanelMessage(unitNum) {
  const who = unitNum ? `${unitNum}: ` : '';
  return `${who}the app added a finishing end panel where this meets the cabinet beside it — right-click it and Remove if you do not want it.`;
}

/**
 * Is this end panel one the app added? (`meta.autoAdded`, on the piece.)
 *
 * *"It carries `meta.autoAdded: true`, so a later turn can tell the two apart,
 * and so the message can be shown once per panel rather than on every
 * redraw."*
 */
export function isAutoEndPanel(ep) {
  return Boolean(ep?.auto_added);
}

/** The declined list a unit should carry once this side has been cleared. */
export function withDeclined(unit, side) {
  const want = side === 'R' ? 'R' : 'L';
  const now = declinedSides(unit);
  return now.includes(want) ? now : [...now, want];
}
