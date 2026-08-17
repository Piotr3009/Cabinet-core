// ─── THE FRONT-GAP RULEBOOK (turn 31, CLAUDE.md F4) ─────────────────────────
//
// Eighteen points, agreed with the owner on 15.08.2026 and implemented whole.
// The numbers below are his; where a number is a default he may correct, it
// says so and it lives in the profile (rule 18).
//
// ─── THE ONE SENTENCE THE WHOLE FILE TURNS ON ───────────────────────────────
//
// Rule 14: "Shown gap = front↔neighbour." Display and Check measure what a
// CLIENT SEES — the daylight between this leaf and the thing beside it — and
// never front↔own carcass. Turn 25's `frontDimensions.frontGaps` measures the
// second thing and is right to; turn 30's `frontGapClash` measures front↔front
// across a run and is right to. Neither of them can answer "what stands beside
// this door", and that question is the whole of section A.
//
// ─── A. WHAT THE NEIGHBOUR IS DECIDES THE NUMBER ────────────────────────────
//
//   1. another cabinet's front  → 1.5   (1.5 + 1.5 = the 3 a client sees)
//   2. an end panel             → 3.0
//   3. an infill / filler       → 3.0   same category as a panel: a rigid
//                                       neighbour that gives nothing back
//   4. an appliance with its own front → 0
//                                       a dishwasher door is 594 in a 600
//                                       opening, so the APPLIANCE provides the
//                                       3 and our front runs to the carcass end
//   5. a bare wall              → 3.0   + yellow "infill? (dust collection)"
//   6. end of run (nothing)     → 1.5
//   7. an L-shape corner        → PARKED with the L-shape unit. Not guessed at.
//
// "Clearance" is one number with one meaning throughout this file: HOW FAR THE
// FRONT'S EDGE STANDS INSIDE ITS OWN CARCASS END, on that side. That is the
// only definition under which the matrix is arithmetic rather than a table of
// coincidences — two fronts at 1.5 each make the 3 in rule 1, a front at 3 and
// a rigid panel at 0 make the 3 in rule 2, and a front at 0 beside an appliance
// that is already inset 3 makes the 3 in rule 4.
//
// ─── B. AND THE CORRECTION IS ASYMMETRIC (rule 8) ───────────────────────────
//
// Left and right are INDEPENDENT. A width correction acts only on the edge
// whose neighbour demands it. Rules 9 and 12 — the cups riding the edge and the
// handle following it — are not implemented here at all: they are true by
// construction in `engine/cabinet.js`, where the trim is applied BEFORE the
// drilling pass, so a hole 21.5 from the hinge edge stays 21.5 from the hinge
// edge without anybody re-deriving it. This file produces millimetres.
//
// Pure functions and pure data. No React, no store, no three.js.

import { getUnitType } from './types.js';
import { unitVerticals } from './runs.js';

/** What can stand beside a front. */
export const NEIGHBOUR = Object.freeze({
  FRONT: 'front',
  END_PANEL: 'endPanel',
  INFILL: 'infill',
  APPLIANCE: 'appliance',
  WALL: 'wall',
  NONE: 'none',
  CORNER: 'corner',
});

/** Section A, as data. `null` is PARKED — never a guess. */
export function clearanceMatrix(profile) {
  const c = profile?.doors?.clearance || {};
  const n = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return Object.freeze({
    [NEIGHBOUR.FRONT]: n(c.front, 1.5),
    [NEIGHBOUR.END_PANEL]: n(c.endPanel, 3),
    [NEIGHBOUR.INFILL]: n(c.infill, 3),
    [NEIGHBOUR.APPLIANCE]: n(c.appliance, 0),
    [NEIGHBOUR.WALL]: n(c.wall, 3),
    [NEIGHBOUR.NONE]: n(c.none, 1.5),
    // Rule 7. The L-shape corner is PARKED with the L-shape unit; nothing here
    // invents a number for it, and the Check says "parked" rather than passing.
    [NEIGHBOUR.CORNER]: null,
  });
}

/** How much clearance this front's edge should have, given what is beside it. */
export function clearanceFor(kind, profile) {
  const m = clearanceMatrix(profile);
  return Object.hasOwn(m, kind) ? m[kind] : m[NEIGHBOUR.NONE];
}

/** Rule 5's yellow: a bare wall wants an infill, or it collects dust. */
export const WALL_NOTE = 'infill? (dust collection)';

/** Under this, the gap is a RED fault (rule 15). Profile, default 3. */
export function minGapMm(profile) {
  const n = Number(profile?.doors?.minNeighbourGapMm);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/** Over this, the gap is a YELLOW question (rule 16). Profile, default 6. */
export function maxGapMm(profile) {
  const n = Number(profile?.doors?.maxNeighbourGapMm);
  return Number.isFinite(n) && n > 0 ? n : 6;
}

/**
 * How much a hinge can absorb on its own side adjustment (rules 10 and 11).
 *
 * Under this, a correction is soaked up silently by the hinge and the plates on
 * the carcass never move. Over it, the Check says so in yellow — "beyond the
 * hinge's adjustment — check" — because a door that needs 4 mm of side
 * adjustment is a door that will not line up whatever the drilling says.
 */
export function hingeAdjustMm(profile) {
  const n = Number(profile?.hinges?.sideAdjustMm);
  return Number.isFinite(n) && n > 0 ? n : 1.5;
}

/** How far away a thing can be and still be "the neighbour". Profile. */
export function neighbourReachMm(profile) {
  const n = Number(profile?.doors?.neighbourReachMm);
  return Number.isFinite(n) && n > 0 ? n : 200;
}

const round2 = (v) => Math.round(Number(v) * 100) / 100;
const alongWall = (unit) => !((Number(unit?.position?.rotation_deg) || 0) % 360);

/** Do two [from,to] bands share more than `slack`? */
function overlaps(a1, a2, b1, b2, slack = 1) {
  return Math.min(a2, b2) - Math.max(a1, b1) > slack;
}

/**
 * Every FRONT in the room, in its wall's own frame, with what it is.
 *
 * The frame is the room view's: `x` along the wall from its start corner, `y`
 * off the floor, `z` out from the wall.
 */
/**
 * Is this unit's drawer face the RECESSED, behind-the-doors kind (the
 * KIT_WARDROBE construction), rather than a run-facing kitchen front?
 * Answered off the type's own drawerStyle, so PANTRY — which borrowed the
 * wardrobe's drawer block wholesale — answers yes with it.
 */
function recessedDrawerFace(unit) {
  return (getUnitType(unit?.type)?.drawerStyle || null) === 'wardrobe';
}

export function frontsInRoom(entries, baseOf) {
  const out = [];
  for (const { unit, result } of entries || []) {
    if (!unit || !result || !alongWall(unit)) continue;
    const base = Number(baseOf ? baseOf(unit) : 0) || 0;
    const originX = Number(unit.position?.x_mm) || 0;
    const carcassW = Number(unit.params?.width) || 0;
    for (const p of result.panels || []) {
      if (p?.role !== 'front' || !p.box) continue;
      // ─── CHAT FIX 15.08.2026: A WARDROBE DRAWER FACE IS NOT IN THE RUN ────
      // Owner, off six yellow rows on his own scene: "69 mm — too wide".
      // The 69 is the KIT_WARDROBE's own arithmetic — G(18) + filler(30) +
      // DP(18) + 3 — a drawer face that lives RECESSED between its drawer
      // panels, behind the doors' line. It does not face the run, so the
      // run's matrix has nothing to say to it: its neighbour is the DP, and
      // its width is the LISP's law, not a gap to heal. The DOORS of the same
      // wardrobe stay measured — they really do stand in the run. A kitchen
      // drawer face (BUDR family) stays measured too: it IS the run.
      if (p.part === 'DRAWER-FRONT' && recessedDrawerFace(unit)) continue;
      out.push({
        unitId: unit.id,
        unitNum: result.unitNum || unit.params?.unit_num || '',
        unitType: unit.type,
        panelId: p.id,
        wall: unit.position?.wall ?? 0,
        // The CARCASS this front belongs to, because a clearance is measured
        // from the carcass end and a correction is applied against it.
        carcassFrom: originX,
        carcassTo: originX + carcassW,
        x: originX + p.box.x,
        w: p.box.w,
        y: base + p.box.y,
        h: p.box.h,
        z: p.box.z,
        d: p.box.d,
        hinge: p.meta?.hinge || null,
        // Rule 4: a face that IS an appliance's own door. Read off the piece
        // (`meta.appliance`), which is where turn 17 put the fact, rather than
        // off the unit type — a fact about a PART belongs on the part.
        appliance: p.meta?.appliance || null,
        trim: p.meta?.edgeTrim || null,
      });
    }
  }
  return out.sort((a, b) => (a.wall - b.wall) || (a.x - b.x) || (a.y - b.y));
}

/**
 * What stands on ONE side of one front, and how far away.
 *
 * The nearest thing within reach wins. Beyond reach there is either a wall or
 * nothing, and those are two different rules (5 and 6) with two different
 * numbers, so the distinction is made rather than fudged.
 */
// ─── LICENSED RETIREMENT OF AN EXPORT, 17.08.2026 (T37-F9, iron rule 4) ────
//
// The owner licensed five removals after the dead-code audit, and this is one
// of them — but the audit was wrong about WHAT was dead. `neighbourOn` is
// called on line 332 of this very file, inside `frontClearances()`, which the
// project store, `engine/checks.js`, the scene and six test files all import.
// Deleting the function would take the whole front-clearance matrix with it.
//
// What was genuinely dead is the EXPORT: nothing outside this module has ever
// named it. That is exactly the category T31-F12 already wrote down —
// *"47 names were used INSIDE their own file and exported for nobody. The
// export went; the code did not."* So the export goes and the code does not,
// which is the licence honoured and the sanctity rule kept, both.
function neighbourOn(front, side, {
  fronts, verticals, units, wallWidth, profile,
}) {
  const reach = neighbourReachMm(profile);
  const edge = side === 'left' ? front.x : front.x + front.w;
  const dir = side === 'left' ? -1 : 1;
  let best = null;

  const consider = (kind, near, extra = {}) => {
    const gap = dir > 0 ? near - edge : edge - near;
    if (gap < -1e-6 || gap > reach) return;
    if (!best || gap < best.gapMm) best = { kind, gapMm: round2(gap), ...extra };
  };

  // ── another front (rules 1 and 4) ──
  for (const other of fronts) {
    if (other === front) continue;
    if (other.wall !== front.wall) continue;
    if (!overlaps(front.y, front.y + front.h, other.y, other.y + other.h)) continue;
    // …and in the same PLANE: a leaf on a 350 deep cabinet and a leaf on a 600
    // deep one beside it are 250 mm apart in air and never meet.
    if (!overlaps(front.z, front.z + front.d, other.z, other.z + other.d, 0)) continue;
    const near = dir > 0 ? other.x : other.x + other.w;
    consider(
      other.appliance ? NEIGHBOUR.APPLIANCE : NEIGHBOUR.FRONT,
      near,
      { of: { unitId: other.unitId, unitNum: other.unitNum, panelId: other.panelId } },
    );
  }

  // ── an end panel or an infill (rules 2 and 3) ──
  for (const v of verticals) {
    if (v.wall !== front.wall) continue;
    if (!overlaps(front.y, front.y + front.h, v.bottom, v.top)) continue;
    const near = dir > 0 ? v.from : v.to;
    consider(
      v.kind === 'end-panel' ? NEIGHBOUR.END_PANEL : NEIGHBOUR.INFILL,
      near,
      { of: { unitId: v.unitId, pieceId: v.pieceId } },
    );
  }

  // ── an L-shape corner (rule 7 — PARKED) ──
  for (const u of units || []) {
    if (!alongWall(u) || (u.position?.wall ?? 0) !== front.wall) continue;
    if (!isCornerType(u.type)) continue;
    const ux = Number(u.position?.x_mm) || 0;
    const uw = Number(u.params?.width) || 0;
    consider(NEIGHBOUR.CORNER, dir > 0 ? ux : ux + uw, { of: { unitId: u.id } });
  }

  if (best) return best;

  // ── nothing within reach: a wall, or the end of the run (rules 5 and 6) ──
  const toWall = dir > 0 ? (Number(wallWidth) || 0) - edge : edge;
  if (Number.isFinite(toWall) && toWall >= 0 && toWall <= reach) {
    return { kind: NEIGHBOUR.WALL, gapMm: round2(toWall), note: WALL_NOTE };
  }
  return { kind: NEIGHBOUR.NONE, gapMm: null };
}

/** Rule 7's type, under both its names (F10 renames CORNER → L_SHAPE). */
export function isCornerType(typeId) {
  return typeId === 'L_SHAPE' || typeId === 'CORNER';
}

/**
 * Rule 4a — the appliance column.
 *
 * "Every front above/below the appliance takes the APPLIANCE's width (oven 598
 * → drawer front below is 598). Alignment to neighbours happens at the COLUMN's
 * outer edges by this matrix, symmetrically — uniquely here both edges are set
 * by the appliance, not by hinges (a drawer has no cups; runners follow the
 * carcass, only the front widens)."
 *
 * So: in a cabinet that houses an appliance, the fronts are as wide as the
 * appliance's own face, centred on the carcass, and the matrix is then applied
 * at the OUTER edges of that column rather than per front. This returns the
 * width and the inset; whether a kit houses an appliance is the kit's own
 * `appliance` key, and the appliance's face width is a profile number because
 * an oven is a bought thing with a published size.
 */
export function applianceFaceWidth(appliance, carcassWidth, profile) {
  const table = profile?.appliances?.faceWidth || {};
  const named = Number(table[appliance]);
  if (Number.isFinite(named) && named > 0) return named;
  // No published width for this machine: the honest answer is the carcass less
  // the matrix's own appliance clearance on both sides, which is the 3 + 3 a
  // dishwasher's 594-in-600 already is.
  const inset = Number(profile?.appliances?.defaultInsetMm);
  const each = Number.isFinite(inset) && inset >= 0 ? inset : 3;
  return Math.max(0, (Number(carcassWidth) || 0) - 2 * each);
}

/**
 * Rule 4a, applied: what width every front in an appliance column should be.
 *
 * @returns {{widthMm:number, insetMm:number, appliance:string}|null}
 */
export function applianceColumn(unit, profile) {
  const appliance = unit?.applianceId || unit?.params?.appliance || unit?.type?.appliance || null;
  if (!appliance) return null;
  const carcassWidth = Number(unit?.params?.width) || 0;
  const widthMm = applianceFaceWidth(appliance, carcassWidth, profile);
  return {
    appliance,
    widthMm,
    // Symmetrically — "uniquely here both edges are set by the appliance".
    insetMm: round2(Math.max(0, (carcassWidth - widthMm) / 2)),
  };
}

/**
 * Every front in the room with what stands on each of its two edges, what the
 * matrix wants there, and what it actually has.
 *
 * @param {object} args
 *   entries    [{ unit, result }]
 *   units      the raw units (for rule 7 and rule 13)
 *   baseOf     (unit) => how high its carcass starts
 *   wallWidthOf (wallIndex) => the wall's length, for rule 5
 *   profile
 */
export function frontClearances({
  entries, units = null, baseOf, wallWidthOf = null, profile,
}) {
  const list = units || (entries || []).map((e) => e.unit).filter(Boolean);
  const fronts = frontsInRoom(entries, baseOf);
  const verticals = unitVerticals(list, profile);
  const out = [];

  for (const front of fronts) {
    const wallWidth = wallWidthOf ? wallWidthOf(front.wall) : null;
    const row = { ...front, edges: {} };
    for (const side of ['left', 'right']) {
      const n = neighbourOn(front, side, {
        fronts, verticals, units: list, wallWidth, profile,
      });
      const want = clearanceFor(n.kind, profile);
      // What this front's edge ACTUALLY has: how far it stands inside its own
      // carcass end on this side.
      const have = round2(side === 'left'
        ? front.x - front.carcassFrom
        : front.carcassTo - (front.x + front.w));
      row.edges[side] = {
        ...n,
        side,
        wantClearanceMm: want,
        haveClearanceMm: have,
        // Rule 7: parked means parked. No verdict, no correction, no silence
        // that reads as a pass.
        parked: want === null,
        correctionMm: want === null ? 0 : round2(want - have),
        ...(n.note ? { note: n.note } : {}),
      };
    }
    out.push(row);
  }
  return out;
}

/**
 * Rules 15 and 16 — the verdicts, per neighbour gap.
 *
 * Measured front↔NEIGHBOUR (rule 14), which for a front-to-front pair is the
 * daylight between two leaves and for a front-to-panel pair is the daylight to
 * the panel's face.
 */
export function gapVerdict(gapMm, profile) {
  if (gapMm == null) return null;
  const min = minGapMm(profile);
  const max = maxGapMm(profile);
  if (gapMm < min) {
    return {
      level: 'red',
      shortfallMm: round2(min - gapMm),
      message: `${round2(gapMm)} mm — under the ${min} mm minimum.`,
    };
  }
  if (gapMm > max) {
    return {
      level: 'yellow',
      excessMm: round2(gapMm - max),
      message: `${round2(gapMm)} mm — too wide (over ${max} mm): infill or front correction?`,
    };
  }
  return { level: 'ok', message: `${round2(gapMm)} mm.` };
}

/**
 * Rule 15's first option, with its number: NARROW THE FRONT(S).
 *
 * "halves of the shortfall, asymmetry law applies, cups ride the edge"
 *
 * TWO fronts facing each other each give half; a front facing a rigid
 * neighbour — a panel, an infill, a wall — gives the whole shortfall, because
 * there is nobody else to give it. That is the asymmetry law doing its work
 * rather than a special case: the correction lands on the EDGE whose neighbour
 * demanded it, and only there.
 *
 * @param {object} args
 *   fronts   [{ unitId, panelId, side }] — one entry, or the two of a pair
 *   shortfallMm
 * @returns {{trims: Array<{unitId, panelId, side, mm}>, eachMm:number, message:string}}
 */
export function narrowingPlan({ fronts, shortfallMm, profile }) {
  const list = (fronts || []).filter(Boolean);
  if (!list.length || !(shortfallMm > 0)) return null;
  const eachMm = round2(shortfallMm / list.length);
  const adjust = hingeAdjustMm(profile);
  return {
    eachMm,
    trims: list.map((f) => ({ ...f, mm: eachMm })),
    // Rule 11: over the hinge's own side adjustment, the Check says so.
    beyondHingeAdjust: list.some((f) => f.side && eachMm > adjust),
    adjustMm: adjust,
    message: list.length > 1
      ? `Narrow both fronts by ${eachMm} mm on the meeting edge.`
      : `Narrow the front by ${eachMm} mm on its ${list[0].side} edge.`,
  };
}

/**
 * ─── RULE 14, AS A LIST: THE JOINTS, EACH ONCE ──────────────────────────────
 *
 * A front-to-front joint is seen twice — once from the left leaf's right edge
 * and once from the right leaf's left edge — and reporting it twice is the same
 * offence as the single toast slot: two rows saying one thing, and a joiner
 * counting faults that are not there. So the joints are KEYED, and the key for
 * a pair is the pair.
 *
 * The row carries everything the overlay, the Check and the repair modal need,
 * and they all read THIS, so a mark can never appear without its millimetres or
 * a repair be offered for a fault the display disagrees about.
 */
export function frontGapRows(clearances, profile) {
  const byKey = new Map();
  for (const front of clearances || []) {
    for (const side of ['left', 'right']) {
      const edge = front.edges[side];
      if (!edge) continue;
      // Rule 7: a corner is PARKED. It is reported as parked and never judged.
      if (edge.parked) {
        const key = `parked|${front.unitId}|${front.panelId}|${side}`;
        byKey.set(key, {
          key,
          kind: edge.kind,
          parked: true,
          level: 'parked',
          wall: front.wall,
          fronts: [{ unitId: front.unitId, unitNum: front.unitNum, panelId: front.panelId, side }],
          mm: edge.gapMm,
          message: `${front.unitNum || front.unitId} ${front.panelId}: the L-shape corner joint is parked `
            + 'with the L-shape unit — no clearance rule has been agreed for it.',
        });
        continue;
      }
      if (edge.gapMm == null) continue;
      const verdict = gapVerdict(edge.gapMm, profile);
      const note = edge.note || null;
      if (verdict.level === 'ok' && !note) continue;

      const other = edge.of;
      const pairKey = edge.kind === NEIGHBOUR.FRONT && other?.panelId
        ? `pair|${[
          `${front.unitId}:${front.panelId}`, `${other.unitId}:${other.panelId}`,
        ].sort().join('|')}`
        : `edge|${front.unitId}|${front.panelId}|${side}`;
      if (byKey.has(pairKey)) continue;

      // Rule 15: two fronts facing each other each give HALF the shortfall; a
      // front facing something rigid gives the whole of it, because there is
      // nobody else to give it.
      const fronts = [{
        unitId: front.unitId, unitNum: front.unitNum, panelId: front.panelId, side,
      }];
      if (edge.kind === NEIGHBOUR.FRONT && other?.panelId) {
        fronts.push({
          unitId: other.unitId,
          unitNum: other.unitNum,
          panelId: other.panelId,
          side: side === 'left' ? 'right' : 'left',
        });
      }

      byKey.set(pairKey, {
        key: pairKey,
        kind: edge.kind,
        parked: false,
        level: note && verdict.level === 'ok' ? 'yellow' : verdict.level,
        wall: front.wall,
        atX: side === 'left' ? front.x : front.x + front.w,
        fronts,
        mm: edge.gapMm,
        shortfallMm: verdict.shortfallMm ?? 0,
        excessMm: verdict.excessMm ?? 0,
        note,
        wantClearanceMm: edge.wantClearanceMm,
        haveClearanceMm: edge.haveClearanceMm,
        message: `${front.unitNum || front.unitId} ${front.panelId} → ${labelOf(edge.kind)}: `
          + `${verdict.message}${note ? ` ${note}` : ''}`,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => (a.wall - b.wall) || ((a.atX || 0) - (b.atX || 0)));
}

/**
 * ─── TURN 32 (CLAUDE.md F3): THE MATRIX IS APPLIED, NOT OFFERED ─────────────
 *
 * The owner's verdict on T31's modal: "why bother the client — gaps should
 * fix themselves." So the matrix changes MODE: this function turns the
 * clearances T31 already measures into the PLAN of edge trims that makes
 * every front stand where the law says — on the correct edge (the asymmetry
 * law rides exactly as T31 built it), by exactly `correctionMm`.
 *
 * What it will NOT plan, and why the RED modal survives only there:
 *
 *   · a PARKED edge (the L-shape corner) — rule 7, no rule agreed;
 *   · an APPLIANCE'S OWN FACE — a fridge door is the factory's width, never
 *     cut (`front.appliance`, off the piece);
 *   · a WIDENING past the kit's own width — a trim only narrows; an edge that
 *     wants more front than the kit cut (want < 0 relative to stock) can only
 *     come back to trim 0. THE ONE EXCEPTION IS THE APPLIANCE — see below;
 *   · a correction that would leave no board — the engine's own
 *     FRONT_TRIM_TOO_DEEP refusal, anticipated here so it is never provoked.
 *
 * ─── TURN 34 (CLAUDE.md F6): THE APPLIANCE EXCEPTION ────────────────────────
 *
 * The owner, 16.08.2026: *"raczej tylko przy appliance'ach — silnik powinien
 * pilnować, żeby zawsze było 3"*.
 *
 * Rule 4 has always said an appliance neighbour wants clearance 0, because the
 * machine's own face is already inset (a dishwasher door is 594 in a 600
 * opening, so it provides the 3 itself and our front runs to the carcass end).
 * The T32 floor could never deliver that: a front the kit cut 3 mm inside its
 * own carcass end stood 3 + 3 = 6 from the appliance door, the correction was
 * NEGATIVE, and `Math.max(0, …)` threw it away on every heal path.
 *
 * So the floor is KIND-DEPENDENT, in exactly one kind. At
 * `NEIGHBOUR.APPLIANCE` the trim may go NEGATIVE — a negative trim is an
 * EXTENSION, and engine/cabinet.js applies it as one — capped at CLOSING THE
 * STOCK CLEARANCE TO 0 and never a micrometre wider than the carcass end. The
 * clearance the kit cut is `have − old` (the trim narrows the edge, so what it
 * stands at now is stock + trim), which makes the cap `old − have` in trim
 * terms. Every other kind keeps "a trim only narrows" verbatim, and the pass
 * still converges: a closed appliance edge measures a correction of 0 next
 * time round. `doors.gap` stays the single source, so the owner's future
 * one-knob gap setting ("nie teraz") is still one line away.
 *
 * Pure: reads clearances and the current trims, answers patches and the GREY
 * notes that announce them ("front 02-F −1.5 mm at the end panel") — rule 4:
 * even the sanctioned auto-fix says what it did. The STORE applies the
 * patches through the same `front_edge_trim` override channel the modal used;
 * nothing here or there touches the engine.
 *
 * @param {Array} clearances  frontClearances() output
 * @param {function} trimOf   (unitId, panelId) → {left,right} | null
 * @returns {{patches:Array<{unitId,panelId,side,trim,deltaMm,kind}>,
 *            notices:string[], stuck:Array<{unitId,panelId,side,kind,reason}>}}
 */
export function healingPlan(clearances, { trimOf }) {
  const patches = [];
  const notices = [];
  const stuck = [];
  for (const front of clearances || []) {
    for (const side of ['left', 'right']) {
      const edge = front.edges?.[side];
      if (!edge || edge.parked) continue;
      if (front.appliance) continue;
      const was = (trimOf ? trimOf(front.unitId, front.panelId) : null) || { left: 0, right: 0 };
      const old = Number(was[side]) || 0;
      // T34 F6: the floor is kind-dependent. Everywhere but an appliance it is
      // 0 (a trim only narrows); at an appliance it is the extension that
      // closes the STOCK clearance to exactly 0, and no further.
      const floor = edge.kind === NEIGHBOUR.APPLIANCE
        ? round2(old - (Number(edge.haveClearanceMm) || 0))
        : 0;
      const next = Math.max(floor, round2(old + edge.correctionMm));
      const delta = round2(next - old);
      if (Math.abs(delta) < 0.05) continue;
      if (front.w - delta <= 0) {
        stuck.push({
          unitId: front.unitId,
          panelId: front.panelId,
          side,
          kind: edge.kind,
          reason: `a further ${delta} mm would leave nothing of a ${front.w} mm front`,
        });
        continue;
      }
      patches.push({
        unitId: front.unitId, panelId: front.panelId, side, trim: next, deltaMm: delta, kind: edge.kind,
      });
      notices.push(`front ${front.unitNum || front.unitId} ${front.panelId} `
        + `${delta > 0 ? '−' : '+'}${Math.abs(delta)} mm at ${labelOf(edge.kind)}`);
    }
  }
  return { patches, notices, stuck };
}

/** What a neighbour is CALLED, in a sentence a joiner reads. */
export function labelOf(kind) {
  return {
    [NEIGHBOUR.FRONT]: 'the next front',
    [NEIGHBOUR.END_PANEL]: 'an end panel',
    [NEIGHBOUR.INFILL]: 'an infill',
    [NEIGHBOUR.APPLIANCE]: 'an appliance front',
    [NEIGHBOUR.WALL]: 'the wall',
    [NEIGHBOUR.NONE]: 'the end of the run',
    [NEIGHBOUR.CORNER]: 'an L-shape corner',
  }[kind] || kind;
}

/** Rule 17: what narrowing a front costs, said BEFORE it acts. */
export const NARROW_WARNING = 'Narrowing a front changes the BOM and the drilling.';

/**
 * Rule 13 — carcasses in a run stand TOUCHING.
 *
 * "A state, not an option. A gap between carcasses = RED in Check; the only fix
 * offered is closing to touch. Cabinets are NEVER moved to fix a front gap."
 *
 * Two neighbouring carcasses on one wall whose height bands overlap and which
 * are not touching. A cabinet with an END PANEL or an INFILL between it and the
 * next is not a gap — there is something in it — so the verticals are consulted
 * before anything is reported.
 */
export function carcassGaps(units, profile) {
  const list = (units || []).filter((u) => alongWall(u));
  const verticals = unitVerticals(list, profile);
  const tolerance = 0.5;
  const out = [];

  const byWall = new Map();
  for (const u of list) {
    const wall = u.position?.wall ?? 0;
    if (!byWall.has(wall)) byWall.set(wall, []);
    byWall.get(wall).push(u);
  }

  for (const [wall, group] of byWall) {
    const sorted = [...group].sort((a, b) => (Number(a.position?.x_mm) || 0) - (Number(b.position?.x_mm) || 0));
    for (let i = 1; i < sorted.length; i += 1) {
      const left = sorted[i - 1];
      const right = sorted[i];
      const leftEnd = (Number(left.position?.x_mm) || 0) + (Number(left.params?.width) || 0);
      const rightStart = Number(right.position?.x_mm) || 0;
      const gap = rightStart - leftEnd;
      if (gap <= tolerance) continue;
      // …unless they are two different runs. Cabinets at two heights, or a
      // metre apart, are not "a run with a gap in it" and closing them to touch
      // is not a fix anybody asked for.
      const leftTop = Number(left.params?.height) || 0;
      const rightTop = Number(right.params?.height) || 0;
      if (Math.abs(leftTop - rightTop) > tolerance) continue;
      if (gap > neighbourReachMm(profile)) continue;
      // …and unless something is standing in it.
      const filled = verticals.some((v) => v.wall === wall
        && v.from >= leftEnd - tolerance && v.to <= rightStart + tolerance
        && v.to - v.from >= gap - tolerance);
      if (filled) continue;
      out.push({
        wall,
        leftUnitId: left.id,
        rightUnitId: right.id,
        leftNum: left.params?.unit_num || left.id,
        rightNum: right.params?.unit_num || right.id,
        mm: round2(gap),
        atX: round2(leftEnd),
        // Rule 13: ONE fix, and it is closing to touch. Nothing here moves a
        // cabinet — the number is what the fix would be, and the joiner asks.
        fix: { kind: 'close-to-touch', moveRightByMm: round2(-gap) },
        message: `${left.params?.unit_num || left.id} and ${right.params?.unit_num || right.id} `
          + `stand ${round2(gap)} mm apart — carcasses in a run must touch.`,
      });
    }
  }
  return out.sort((a, b) => (a.wall - b.wall) || (a.atX - b.atX));
}
