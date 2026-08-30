// ─── CHECK v1 — THE PRE-PRODUCTION CONTROLLER (turn 31, CLAUDE.md F6) ───────
//
// "A Check button beside BOM/CNC, and the same list automatically before
// Export. Result = a PANEL of findings (not toasts)."
//
// NOT TOASTS is the design, and it is the same lesson F2 learnt one storey
// down: a fault that has to be read in four seconds is a fault nobody reads.
// Eleven rules over a whole kitchen can produce thirty findings, and thirty
// things a joiner has to act on is a LIST — one he can work down, click into
// and come back to.
//
// ─── ONE FUNCTION, ELEVEN RULES, ONE SHAPE ──────────────────────────────────
//
// Every finding is the same object whatever produced it:
//
//   { check, level, unitId, unitNum, panelId, message, subject }
//
// `subject` is what the click FLIES TO — the F7/T30 mechanism, which is a
// panel id and an editor to open — so the panel needs no per-rule branch to
// know what to do when a row is pressed.
//
// ─── FOUR OF THE ELEVEN ALREADY EXISTED AND WERE NEVER ASKED ────────────────
//
//   #1  shelf × hinge collision   turn 30's, shown only in one unit's panel
//   #2  front gap                 turn 30's, now under F4's neighbour measure
//   #9  outline faults            turn 25's guard, wired at last by F3
//   #10 drill faults              turn 31's guard, F3
//   #11 carcass gap               F4.13
//
// The other six are this file's. Every threshold is a PROFILE number and is
// marked as owner-tunable where CLAUDE.md says so.
//
// ─── NOTHING HERE BLOCKS ANYTHING ───────────────────────────────────────────
//
// "No blocking anywhere except the export gate's hold-out, which has 'Export
// anyway'." This module returns a list. It refuses nothing, moves nothing and
// re-cuts nothing (rule 4).
//
// Pure functions — no React, no store, no three.js.

import { shelfHingeClashes } from './shelfHingeClash.js';
// Turn 35 (CLAUDE.md F15): ONE decider says which family a cut part is in —
// the same one the export's group checkboxes and the nesting already use.
import { groupOfPanel } from './cnc/groups.js';
import { frontClearances, frontGapRows, carcassGaps } from './frontClearance.js';
import { unitFindings } from './cnc/exportGate.js';
import { unitBase, unitTop, hasTopInfill } from './runs.js';
import { shelfTypeOf } from './shelfTypes.js';
import { railObstruction } from './railDatum.js';
import { takesPlinth } from './autoparts.js';
// Turn 36 (CLAUDE.md F7): is this top box standing on anything?
import { riderIsOrphaned, riderOverlapMm } from './topBox.js';
// Turn 50 (CLAUDE.md F3): …and is it standing INSIDE the room?
import { roomFitFaults } from './roomFit.js';
// T51 (CLAUDE.md F5): the ONE derivation of how deep a cup may go, so the
// report and the bore cannot disagree about the same door.
import { cupBoreOf } from './doors.js';
import { panelWeight } from './lifts.js';
// Turn 38 (CLAUDE.md F9): the two guards on what a hand has drawn on a print.
import { manualGeometryFaults } from './partEdits.js';
import { resolvePanelMaterial } from './materials.js';
// ─── TURN 43 (CLAUDE.md F7): AND A MISSING ARTICLE SPEAKS ───────────────────
// The registry is the engine's own (turn 18): a catalogue is HANDED to it or it
// is not, and this rule reads exactly what the 3-D view and the BOM read. No
// fetch, no network, no second opinion about which runner a drawer takes.
import {
  ladderRungFor, resolveRunnerVariant, runnerAskFor, runnerCatalogue, runnerEntry, runnerLadder,
} from './runners.js';
import HINGE_COUNT from '../../reference/hardware/cliptop-hinge-count.json' with { type: 'json' };

/** The eleven rules, in the owner's own order, with what each is FOR. */
export const CHECKS = Object.freeze([
  { n: 1, level: 'red', label: 'Shelf × hinge collision' },
  { n: 2, level: 'red', label: 'Front gap' },
  { n: 3, level: 'yellow', label: 'Tall cabinet with no fixed shelf' },
  { n: 4, level: 'red', label: 'Door too heavy for its hinges' },
  { n: 5, level: 'yellow', label: 'Open gap above a run' },
  { n: 6, level: 'yellow', label: 'Base run with no plinth' },
  { n: 7, level: 'red', label: 'Panel larger than the sheet' },
  { n: 8, level: 'yellow', label: 'Wide front at 110°' },
  { n: 9, level: 'red', label: 'Outline faults' },
  { n: 10, level: 'red', label: 'Drill faults' },
  { n: 11, level: 'red', label: 'Carcass gap in a run' },
  // CHAT-FIX 16.08 (owner, decision C) gave 12 to the fixed shoe box's hinge
  // clash. T54-F7 buried that world (licence 2: engine/shoeBox.js, the
  // emission, KIT_SHOE_BOX.lsp — the grave is named in the verdict), so the
  // number is re-used for the world that replaced it: the migration notice.
  // *"the Check names the conversion once per unit"* — a saved shoe box
  // loads as a `variant:'shoe'` DRAWER, and this row says so in words.
  { n: 12, level: 'yellow', label: 'Shoe box rebuilt as a drawer' },
  // ─── TURN 35 (CLAUDE.md F1): the rail's own datum brought its own fault ──
  // A rod hung a number above its support can end up through the board over
  // it. The law is REPORT, never auto-fix — "never an auto-fix" is the spec's
  // own phrase — so the rail stays exactly where the owner's number puts it
  // and this says, in red, that it will not hang there.
  { n: 13, level: 'red', label: 'Rail × obstacle above' },
  // ─── TURN 36 (CLAUDE.md F7): THE TOP BOX ────────────────────────────────
  // The owner's reason for the pair: *"wysokie szafy nie wejdą do domu"*. A
  // top box is BUILT to stand on a main, so one standing on nothing is not a
  // cabinet, it is a mistake — and the app SAYS SO rather than dropping it
  // onto the nearest wardrobe, which would be the program deciding something
  // the joiner has to see. Report, never fix: the house grammar.
  { n: 14, level: 'red', label: 'Top box standing on nothing' },
  // ─── TURN 37 (CLAUDE.md F5c): …AND ONE STANDING THROUGH IT ───────────────
  // The owner, walking T36-F7: *"nakładają się jedna na drugą, a to jest
  // niedopuszczalne w naszym programie."* `settleRiders` clamps the box to its
  // main's top on every path that could move either of them, so this should
  // never fire — and that is exactly why it exists. A clamp with no witness is
  // a clamp nobody finds out has stopped working, and #14's own sentence
  // applies: report, never fix. The house grammar.
  { n: 15, level: 'red', label: 'Top box overlapping its main' },
  // ─── TURN 38 (CLAUDE.md F9): THE TWO GUARDS ON HAND-DRAWN GEOMETRY ───────
  //
  // The editor lets a joiner draw anything on a print, which is the whole
  // point of it — and two of the things he can draw are mistakes a machine
  // would carry out without comment. Both are WARNINGS and neither is a gate:
  // "Both are warnings, not gates" is CLAUDE.md's own line, and it is the
  // house grammar besides (report, never fix).
  //
  //   #16 A shape that runs off the board. The cutter would leave the work
  //       and come back onto it, or cut air.
  //   #17 A shape on OUTLINE. That layer is the part's own cut boundary — a
  //       line drawn there is machined as the edge of the piece, and a joiner
  //       who meant a pencil mark gets a board cut in half.
  { n: 16, level: 'yellow', label: 'Manual geometry off the panel' },
  { n: 17, level: 'yellow', label: 'Manual geometry on OUTLINE' },
  // ─── TURN 43 (CLAUDE.md F7): THE RUNNER STAND-IN DIES, AND THIS SPEAKS ───
  //
  // The owner, 20.08.2026, after the fourth grey overlay: *"jak kod nadpisuje
  // to go usuń."* The trace: overlay box 490 → ask NL 500 (`runnerAskFor`) →
  // ladder rung 500 → the live bucket tops out at 450 → `runnerEntry` null →
  // the grey L-profile. NOTHING OVERRIDES ANYTHING; the fallback wins by
  // SILENCE. With the fallback deleted (`3d/Hardware.jsx`) the groove is empty,
  // and an empty groove needs a sentence beside it or it is just a new silence.
  //
  // TWO VERDICTS, and the difference between them matters more than either:
  //   RED, per drawer   the catalogue IS loaded and this rung has no article —
  //                     a real, actionable fact about the owner's own bucket.
  //   AMBER, once       there is no catalogue at all (offline, mock, a dead
  //                     network). NEVER a red wall per drawer for a dead
  //                     network: that is how a check panel becomes wallpaper.
  { n: 18, level: 'red', label: 'Runner rung with no article' },
  // ─── TURN 46 (CLAUDE.md F2): THE 400 mm FLOOR UNDER A CUT CABINET ────────
  //
  // The owner, 24.08.2026, four decisions in one night: **minimum 400 mm**.
  //
  // A unit standing where its FULL height no longer fits is NOT an error — it
  // is a cut unit (F3), and that is the whole point of the turn. A unit pushed
  // past the 400 floor is a different thing: there is no cabinet left to build.
  // `clampUnitX` normally stops it ever happening (F2's hard stop), and this
  // is the witness — because a clamp with no witness is a clamp nobody finds
  // out has stopped working (the house grammar, T37-F5c), and a unit can reach
  // this state by a path that does not drag: a typed x, a room re-sized over
  // its head, a slope edited above it.
  { n: 19, level: 'red', label: 'Unit under slope minimum (400 mm)' },
  // ─── TURN 46 (CLAUDE.md F4/F5): A DRAWER IS NOT CUT ON A SLOPE ───────────
  //
  // A door can be a pentagon; a drawer cannot — a box with a diagonal lid does
  // not slide out of anything. The ENGINE refuses the cut and stamps the piece
  // (`meta.slopeRefused`, warning `SLOPE_DRAWER_CROSSES`); this is the sentence
  // in front of the joiner. Report, never fix: the stack stays whole in the cut
  // list rather than being silently deleted off an order form somebody priced.
  { n: 20, level: 'red', label: 'Drawer stack crosses the slope line' },
  // ─── TURN 46 (CLAUDE.md F5): A SHELF MAY NOT PIERCE THE DIAGONAL ─────────
  //
  // *"Shelves exist only where their FULL span sits below the cut line."* The
  // engine does not cut one that would, and this is what stops that being a
  // silence: a joiner who ordered four shelves and gets two has to be told
  // which two are missing and why. RED, because a missing shelf is a missing
  // board on a cut list, not a matter of taste.
  { n: 21, level: 'red', label: 'Shelf crosses the slope line' },
]);

// ─── THE OWNER-TUNABLE NUMBERS (CLAUDE.md F6: "profile numbers marked as
// owner-tunable"). Each reads the profile and falls back to the owner's own
// default, so a workshop that has never opened the settings gets his answer.

/** #3: over this, a cabinet wants at least one FIXED shelf. Owner: 1200. */
export function tallNoFixHeightMm(profile) {
  const n = Number(profile?.checks?.tallNoFixHeightMm);
  return Number.isFinite(n) && n > 0 ? n : 1200;
}

/** #5: the window of open gap that wants an infill. Owner: 20–80. */
export function openGapWindowMm(profile) {
  const from = Number(profile?.checks?.openGapFromMm);
  const to = Number(profile?.checks?.openGapToMm);
  return {
    from: Number.isFinite(from) && from >= 0 ? from : 20,
    to: Number.isFinite(to) && to > 0 ? to : 80,
  };
}

/** #7: the board on the bed. Owner's default: 2790 × 2060. */
export function sheetSizeMm(profile) {
  const w = Number(profile?.cnc?.sheet?.width);
  const h = Number(profile?.cnc?.sheet?.height);
  return {
    width: Number.isFinite(w) && w > 0 ? w : 2790,
    height: Number.isFinite(h) && h > 0 ? h : 2060,
  };
}

// ─── TURN 35 (CLAUDE.md F15): …AND IT IS TWO BOARDS, NOT ONE ───────────────
//
// Owner, 16.08.2026: *"musimy wpisywać wymiary w setup produkcyjne płyt — jak
// mamy bok 2600 a maksymalna płyta 2400, to niech nie pozwoli"* … *"To musi
// być w carcases I fronty."*
//
// A workshop does not buy its carcass board and its front board off the same
// rack, so one sheet size for a whole job was never the truth — it was all
// this rule could say. Now every panel is measured against ITS OWN family's
// board, and the panel says which family it is in the way the export has
// always decided it: `cnc/groups.js groupOfPanel`, on the panel's ROLE and
// never on its id string. Doors, drawer fronts, end panels and the wall unit's
// masking board are FRONTS; everything else is board that lives in a carcass.
// One decider, so the sheet a part is checked against and the sheet it is
// nested on can never disagree.
//
// `cnc.sheet` stays exactly what it was and is the FALLBACK under both, so a
// shop that has never opened the new panel is checked against the same board
// it has been checked against since turn 31 and nothing it has cut moves.

/** #7: which sheet a cut part is measured against — 'fronts' or 'carcasses'. */
export function sheetFamilyOfPanel(panel) {
  return groupOfPanel(panel) === 'fronts' ? 'fronts' : 'carcasses';
}

/** #7: that family's board, falling back to the one sheet this app had before. */
export function sheetSizeForFamily(profile, family) {
  const own = family === 'fronts' ? profile?.cnc?.sheetFronts : profile?.cnc?.sheetCarcass;
  const w = Number(own?.width);
  const h = Number(own?.height);
  // BOTH numbers or neither: half a sheet size is not a sheet, and silently
  // taking the width from the family and the height from the fallback would
  // pass a board nobody can buy.
  if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) return { width: w, height: h };
  return sheetSizeMm(profile);
}

/**
 * #7: WHICH listed format a family's board is, for the panel's own buttons.
 *
 * Derived from the SIZE rather than stored beside it, so the two can never
 * drift: a profile that says 1220 × 2440 IS Standard whoever typed it, and a
 * size no listed format carries is honestly `other` — which is what the
 * workshop's own 2790 × 2060 has always been, and what the two number fields
 * are for.
 */
export function sheetOptionIdFor(profile, family) {
  const size = sheetSizeForFamily(profile, family);
  const hit = (profile?.cnc?.sheetOptions || []).find(
    (o) => Number(o.width) === size.width && Number(o.height) === size.height,
  );
  return hit ? hit.id : 'other';
}

/**
 * #13: the room a hanger's hook takes over the rod's axis, before the rail is
 * fouling what is above it. The profile's `wardrobe.rail.partitionAbove` is
 * that number already — it is where the rail's own partitioner board stands —
 * so the check asks for no new constant the workshop would have to answer.
 */
export function railClearanceMm(profile) {
  const n = Number(profile?.wardrobe?.rail?.partitionAbove);
  return Number.isFinite(n) && n > 0 ? n : 40;
}

/** #8: over this width at 110°, consider a 155°. Owner: 600. */
export function wideFrontMm(profile) {
  const n = Number(profile?.checks?.wideFrontMm);
  return Number.isFinite(n) && n > 0 ? n : 600;
}

/**
 * #4: how many hinges the published Blum table asks for.
 *
 * The table is `reference/hardware/cliptop-hinge-count.json`, with its source
 * named on the file (CLAUDE.md F6 #4). It is a CHECK and nothing else: no hole
 * in this application comes from it, which is turn 31's iron rule 2 — a drilled
 * hole exists only where a LISP line or a published Blum pattern says so, and
 * "how many hinges is prudent" is neither.
 *
 * @returns {{hinges:number, beyondTable:boolean, band:object|null}}
 */
export function hingesRequired({ heightMm, weightKg }) {
  const h = Number(heightMm) || 0;
  const kg = Number(weightKg) || 0;
  for (const band of HINGE_COUNT.bands) {
    if (h <= band.maxHeightMm && kg <= band.maxWeightKg) {
      return { hinges: band.hinges, beyondTable: false, band };
    }
  }
  // Off the published chart. The check SAYS SO rather than extrapolating a band
  // Blum has not published — a 25 kg door is not a place to be approximately
  // right.
  return {
    hinges: HINGE_COUNT._beyond_the_table.hinges,
    beyondTable: true,
    band: null,
  };
}

/** The table itself, for a test and for the panel's own explanation. */
export const HINGE_COUNT_TABLE = HINGE_COUNT;

const round2 = (v) => Math.round(Number(v) * 100) / 100;

/** One finding, in the one shape every rule speaks. */
function finding(n, level, {
  unitId = null, unitNum = '', panelId = null, message, subject = null, ...rest
}) {
  return {
    check: n,
    level,
    unitId,
    unitNum,
    panelId,
    message,
    // What a CLICK flies to and opens — the F7/T30 mechanism. A rule that
    // cannot name a subject says so with `null`, and the panel simply does not
    // offer the flight rather than flying somewhere wrong.
    subject: subject || (panelId ? { unitId, panelId, editor: 'element' } : (unitId ? { unitId, editor: 'cabinet' } : null)),
    ...rest,
  };
}

/**
 * ─── TURN 40 (CLAUDE.md F4a): THE SHELF × HINGE FAULT, DEFINED ONCE ─────────
 *
 * The owner, 18.08.2026, with two screenshots side by side: the Check panel
 * shows `#1 SHELF × HINGE COLLISION` with ONE button (*Move the hinge*) and the
 * cabinet modal shows the same fault with TWO (*Remove sleeves at this shelf*,
 * *Move the hinge*). His verdict: *"raczej powinny się pokazywać i tu i tu"* —
 * the same fault, the same wording, the SAME BUTTONS, in both places.
 *
 * The cause was two definitions. `runChecks` built a finding with a main click
 * and one `alternative`; `components/ShelfHingeClash.jsx` read the ENGINE's own
 * `result.clashes` and wrote its own two buttons with its own two labels. Two
 * places to add a third button, and two places for the wording to drift.
 *
 * So the fault is defined HERE, once, and it carries its own ACTIONS —
 * `{ id, label, title, subject }` — as data. Both surfaces render that list and
 * neither owns a label. A third surface gets the same buttons for free, and a
 * fourth action is one entry in this array rather than an edit in two files.
 *
 * `alternative` is KEPT and derived from the same list (iron rule 3: nothing is
 * deleted), so any reader written before tonight still finds exactly what it
 * looked for.
 *
 * @returns {Array} findings, ready for `runChecks` or for one unit's panel
 */
export function shelfHingeFindings({
  unitId, unitNum = '', result, profile,
}) {
  const out = [];
  for (const c of shelfHingeClashes({ result, profile })) {
    // THE TWO WAYS OUT, in the owner's own words from turn 30's prompt:
    // "Remove sleeves at this shelf" / "Move the hinge". Neither button fixes
    // anything — each opens the window where the decision belongs, on the very
    // row that is in conflict. No silent auto-fix (the house grammar).
    const actions = [
      c.shelfPanelId ? {
        id: 'remove-sleeves',
        label: 'Remove sleeves at this shelf',
        title: 'Open this shelf — a FIX shelf takes no sleeves at all, which is the joint that clears the hinge',
        subject: { unitId, panelId: c.shelfPanelId, editor: 'element' },
      } : null,
      c.doorPanelId ? {
        id: 'move-hinge',
        label: 'Move the hinge',
        title: 'Open the door’s own window at its hinges, on this row',
        subject: {
          unitId,
          panelId: c.doorPanelId,
          editor: 'element',
          section: 'hinges',
          hingeIndex: c.hingeIndex,
          // TURN 40 (F4c): the camera flies to the HINGE's own height on that
          // door, not to the middle of it — *"lub na zawias który jest
          // problemem"*.
          atMm: c.hingeY,
        },
      } : null,
    ].filter(Boolean);
    out.push(finding(1, 'red', {
      unitId,
      unitNum,
      panelId: c.shelfPanelId,
      message: `${unitNum}: ${c.message}`,
      subject: { unitId, panelId: c.shelfPanelId, editor: 'element', atMm: c.shelfY },
      actions,
      // Kept, and DERIVED from the list above so the two can never disagree.
      alternative: actions.find((a) => a.id === 'move-hinge')
        ? { ...actions.find((a) => a.id === 'move-hinge').subject, label: 'Move the hinge' }
        : null,
      shelfY: c.shelfY,
      hingeY: c.hingeY,
      ...(c.splitSegment ? { splitSegment: c.splitSegment } : {}),
    }));
  }
  return out;
}

/**
 * Check v1, whole.
 *
 * @param {object} args
 *   entries    [{ unit, result }] — every cabinet in the room, computed
 *   units      the raw units
 *   room       the project's room (for the ceiling)
 *   design     the project's design (for materials, so #4 can weigh a door)
 *   materials  the assigned material rows
 *   profile
 * @returns {Array} findings, reds first
 */
export function runChecks({
  entries = [], units = null, room = null, design = null, materials = [], profile = null,
  wallWidthOf = null, slopeShortfallOf = null,
} = {}) {
  const list = units || entries.map((e) => e.unit).filter(Boolean);
  const out = [];
  const roomHeight = Number(room?.height) || 0;
  // Turn 35 (CLAUDE.md F15): two boards now, hoisted once each exactly as the
  // one board was. `cnc.sheet` is under both, so a shop that has said nothing
  // is checked against what it has always been checked against.
  const sheets = {
    carcasses: sheetSizeForFamily(profile, 'carcasses'),
    fronts: sheetSizeForFamily(profile, 'fronts'),
  };
  const tallH = tallNoFixHeightMm(profile);
  const window = openGapWindowMm(profile);
  const wide = wideFrontMm(profile);
  // T43-F7: hoisted once each, exactly as every other threshold above is. The
  // catalogue is whatever `lib/runnerCatalogue.js` last handed the registry —
  // `null` means nothing was ever loaded, which is a different fact from "a
  // rung has no article" and is reported differently below.
  const catalogue = runnerCatalogue();
  const runnerSystem = profile?.hardware?.runner?.movento?.system || null;
  const ladder = runnerLadder(profile);
  let runnerRows = 0;

  for (const { unit, result } of entries) {
    if (!unit || !result) continue;
    const unitId = unit.id;
    const unitNum = result.unitNum || unit.params?.unit_num || '';
    const at = (panelId, extra = {}) => ({ unitId, unitNum, panelId, ...extra });

    // ── #1 shelf × hinge collision (turn 30, at last asked of every unit) ──
    // TURN 40 (F4a): ONE DEFINITION, TWO RENDERERS. See `shelfHingeFindings`.
    out.push(...shelfHingeFindings({
      unitId, unitNum, result, profile,
    }));

    // ── #13 the rail, and what stands over it (T35-F1) ───────────────────
    {
      const clearance = railClearanceMm(profile);
      const rails = [
        ...(result?.assemblies?.rail ? [{ ...result.assemblies.rail, zone: null }] : []),
        ...(result?.assemblies?.columnRails || []),
      ];
      for (const r of rails) {
        // What closes the opening this rod hangs in: the next board up in its
        // own bay, or the carcass top. The engine publishes the support it
        // resolved, so the check reads the SAME datum the rail was placed
        // from rather than deriving a second opinion.
        const ceiling = Number.isFinite(Number(r.ceiling))
          ? Number(r.ceiling)
          : (Number(result?.params?.height) || 0) - (Number(result?.params?.board_t) || 0);
        // The rod where the OWNER'S NUMBER puts it — `wanted` — and not where
        // the kit's clamp settled for. A clamped rail is a rail that did not
        // fit, and this rule exists to say so.
        const axis = Number.isFinite(Number(r.wanted)) ? Number(r.wanted) : Number(r.y);
        const boards = (result.panels || [])
          // T43 (iron rule 3): the `p.part !== 'RAIL-PART'` exclusion beside
          // VPART is a T42 leftover — that part no longer exists anywhere in
          // the engine — and is deleted by name.
          .filter((p) => p.role === 'shelf' && p.box && p.part !== 'VPART')
          .map((p) => Number(p.box.y))
          .filter((y) => Number.isFinite(y) && y > axis + 1e-6);
        const above = boards.length ? Math.min(...boards, ceiling) : ceiling;
        const { clash, room } = railObstruction({ axis, clearance, ceiling: above });
        // `fits === false` is the rail the DATUM asked for, before the kit's
        // own too-high clamp lowered it. The clamp is still there and still
        // protects the drawing; this rule reports the number the owner typed,
        // because "never an auto-fix" means he has to be told, not obeyed
        // silently.
        if (!clash && r.fits !== false) continue;
        out.push(finding(13, 'red', at(null, {
          message: `${unitNum}: hanging rail at ${Math.round(axis)} needs ${clearance} mm over it `
            + `and has ${Math.round(Math.max(0, above - axis))} — lower it or move what is above it`,
          subject: { unitId, editor: 'cabinet' },
          railShortfallMm: round2(-room),
          ...(r.zone == null ? {} : { zone: r.zone }),
        })));
      }
    }

    // ── #19 the 400 mm floor under a cut cabinet (T46-F2) ────────────────
    //
    // The number arrives as a NUMBER. `src/engine/**` imports nothing from
    // `src/lib/**` (the layering law), and the ceiling line lives in
    // `lib/slopeLine.js` because the wall mesh and the elevation read it too —
    // so the caller asks `slopeShortfallMm` there and hands the answer down.
    // Absent, the rule does not run, which is every caller that has no room.
    if (typeof slopeShortfallOf === 'function') {
      const slope = slopeShortfallOf(unit) || null;
      if (slope && Number(slope.shortfallMm) > 0) {
        out.push(finding(19, 'red', at(null, {
          message: `${unitNum}: Unit under slope minimum (${Math.round(slope.minimumMm)} mm) — `
            + `${Math.round(slope.clearMm)} mm of clear carcass at its far edge, `
            + `${Math.round(slope.shortfallMm)} mm short. Slide it out of the slope.`,
          subject: { unitId, editor: 'cabinet' },
          slopeShortfallMm: round2(slope.shortfallMm),
        })));
      }
    }

    // ── #20/#21 the interior against the slope line (T46-F4/F5) ──────────
    //
    // Read off the ENGINE's own refusal rather than re-derived: the cabinet has
    // already decided the front crosses the line, and a check that worked it
    // out a second way would be a second opinion about one board.
    for (const wn of result.warnings || []) {
      const n = { SLOPE_DRAWER_CROSSES: 20, SLOPE_SHELF_CROSSES: 21 }[wn.code];
      if (!n) continue;
      out.push(finding(n, 'red', at(wn.panel || null, {
        message: `${unitNum}: ${wn.message}`,
        // A REFUSED shelf has no panel to fly to — it was never cut — so the
        // click opens the cabinet instead of pointing at a board that is not
        // in the list. #20's drawer IS in the list and keeps its own address.
        subject: n === 20 && wn.panel
          ? { unitId, panelId: wn.panel, editor: 'element' }
          : { unitId, editor: 'cabinet' },
      })));
    }

    // ── #12 the shoe box was REBUILT as a drawer (T54-F7) ─────────────────
    //
    // The owner: *"usuń stary kod na shoes i zrób z logiką drawers."* The
    // store's migration turned each saved `shoe_box` item into a
    // `variant:'shoe'` drawer in the same zone and stamped it, and this row
    // says so ONCE PER UNIT — the fronts moved from the old fixed 120 face
    // to the drawer-front law, and a joiner reviewing an old job should hear
    // it from the Check, not discover it on the saw.
    {
      const converted = (unit.params?.sections?.[0]?.items || [])
        .filter((i) => i?.kind === 'drawer' && i?.migrated_from === 'shoe_box');
      if (converted.length) {
        out.push(finding(12, 'yellow', at(null, {
          message: `${unitNum}: shoe rebuilt as a drawer — review fronts`,
          subject: { unitId, editor: 'cabinet' },
        })));
      }
    }

    // ── #3 a tall cabinet with no FIXED shelf ─────────────────────────────
    const height = Number(unit.params?.height) || 0;
    const items = unit.params?.sections?.[0]?.items || [];
    const shelves = items.filter((i) => i?.kind === 'shelf');
    if (height > tallH && shelves.length && !shelves.some((sh) => shelfTypeOf(sh) === 'fix')) {
      out.push(finding(3, 'yellow', at(null, {
        message: `${unitNum}: ${Math.round(height)} mm tall with `
          + `${shelves.length} ${shelves.length === 1 ? 'shelf' : 'shelves'} and none of them fixed `
          + '— add one fixed shelf.',
      })));
    }

    // ── #4 door too heavy / too few hinges ────────────────────────────────
    const allRows = result.drillSummary?.hinge_centers || [];
    // Turn 36 (CLAUDE.md F6): a SPLIT segment is drilled from its own ladder,
    // so it is audited against its own ladder. Every other door reads the
    // cabinet's, exactly as it did.
    const rowsByPanel = result.drillSummary?.hinge_rows_by_panel || {};
    for (const panel of result.panels || []) {
      if (panel.part !== 'FRONT' || panel.role !== 'front' || panel.meta?.appliance) continue;
      const rows = rowsByPanel[panel.id] || allRows;
      const material = resolvePanelMaterial(panel, unit, design, profile, materials);
      const weight = panelWeight({
        panel, material, materials, profile,
      });
      const need = hingesRequired({ heightMm: panel.h, weightKg: weight.kg });
      if (rows.length >= need.hinges) continue;
      out.push(finding(4, 'red', at(panel.id, {
        message: `${unitNum} ${panel.id}: ${Math.round(panel.h)} mm and ${round2(weight.kg)} kg `
          + `on ${rows.length} hinge${rows.length === 1 ? '' : 's'} — the Blum CLIP top table asks for `
          + `${need.hinges}${need.beyondTable ? ' (this door is off the published chart)' : ''}.`,
        subject: {
          unitId, panelId: panel.id, editor: 'element', section: 'hinges',
        },
        needHinges: need.hinges,
        haveHinges: rows.length,
        weightKg: round2(weight.kg),
        beyondTable: need.beyondTable,
      })));
    }

    // ── #7 a panel larger than ITS OWN FAMILY's sheet (T35 F15) ───────────
    //
    // "Check #7 measures every panel against ITS OWN family's sheet, and the
    // red message names the way out: *side 2600 > sheet 2400 — split the
    // wardrobe or add a Top box.* No auto-splitting — the decision is the
    // owner's; the program only refuses loudly."
    //
    // So this rule reports and never fixes, which is the house grammar and is
    // what it did before. What is new is WHICH board it measures against and
    // that the message now says what to do about it in the owner's own words.
    for (const panel of result.panels || []) {
      const w = Number(panel.w) || 0;
      const h = Number(panel.h) || 0;
      const long = Math.max(w, h);
      const short = Math.min(w, h);
      const family = sheetFamilyOfPanel(panel);
      const sheet = sheets[family];
      const sheetLong = Math.max(sheet.width, sheet.height);
      const sheetShort = Math.min(sheet.width, sheet.height);
      // Either way round: the board can be turned on the bed.
      if (long <= sheetLong && short <= sheetShort) continue;
      // WHICH dimension is the one that will not go, and what it is up
      // against. The long side first, because that is the one that fails on a
      // real cabinet — a 2600 side against a 2400 board.
      const over = long > sheetLong ? long : short;
      const limit = long > sheetLong ? sheetLong : sheetShort;
      // The part in the owner's own vocabulary — "side", "shelf", "front".
      // `role` is the engine's own word for it and is what `groupOfPanel` just
      // read; no id-string guessing (cnc/groups.js says why).
      const what = String(panel.role || panel.part || 'panel').replace(/_/g, ' ');
      out.push(finding(7, 'red', at(panel.id, {
        message: `${unitNum} ${panel.id}: ${Math.round(w)} × ${Math.round(h)} mm `
          + `will not fit a ${sheet.width} × ${sheet.height} sheet `
          + `(${family}) — ${what} ${Math.round(over)} > sheet ${Math.round(limit)} `
          + '— split the wardrobe or add a Top box.',
        sheetFamily: family,
        sheetMm: { width: sheet.width, height: sheet.height },
        overMm: round2(over),
        limitMm: round2(limit),
      })));
    }

    // ── #8 a front wider than 600 at 110° ─────────────────────────────────
    for (const panel of result.panels || []) {
      if (panel.part !== 'FRONT' || panel.role !== 'front' || panel.meta?.appliance) continue;
      const angle = Number(panel.meta?.hingeAngleDeg ?? result.hardware?.find?.((h) => h.role === 'hinge')?.angle) || 110;
      if (angle >= 155) continue;
      if ((Number(panel.w) || 0) <= wide) continue;
      out.push(finding(8, 'yellow', at(panel.id, {
        message: `${unitNum} ${panel.id}: ${Math.round(panel.w)} mm wide at ${angle}° — consider 155°.`,
        subject: {
          unitId, panelId: panel.id, editor: 'element', section: 'hinges',
        },
      })));
    }

    // ── #9 and #10, the two guards F3 wired ───────────────────────────────
    for (const f of unitFindings(result, { profile, unitId, unitNum })) {
      out.push(finding(f.check, 'red', at(f.panel, {
        message: f.message,
        subject: f.panel ? { unitId, panelId: f.panel, editor: 'part-detail' } : { unitId, editor: 'cabinet' },
        code: f.code,
        layer: f.layer,
      })));
    }

    // ── #5 an open gap above the run, with no infill ──────────────────────
    if (roomHeight > 0) {
      const top = unitTop(unit, profile);
      const gap = roomHeight - top;
      if (gap >= window.from && gap <= window.to && !hasTopInfill(unit)) {
        out.push(finding(5, 'yellow', at(null, {
          message: `${unitNum}: ${Math.round(gap)} mm of open gap above it and no infill — `
            + 'infill? (dust collection)',
        })));
      }
    }

    // ── #16 / #17 the two guards on hand-drawn geometry (T38 F9) ──────────
    //
    // Read off the unit's OWN override list rather than off the applied
    // result, so the message can name the OBJECT — "circle o3" — and not just
    // the panel it landed on. `engine/partEdits.js` owns the arithmetic; this
    // is where it is asked.
    for (const f of manualGeometryFaults(unit.params?.part_edits, result.panels || [])) {
      out.push(finding(f.check, 'yellow', at(f.panelId, {
        message: `${unitNum} ${f.panelId}: ${f.message}`,
        subject: { unitId, panelId: f.panelId, editor: 'part-detail' },
        objectId: f.objectId,
      })));
    }

    // ── #6 a base run standing with no plinth ─────────────────────────────
    if (takesPlinth(unit.type, profile) && unit.params?.plinth !== true
      && (Number(unitBase(unit, profile)) || 0) > 0) {
      out.push(finding(6, 'yellow', at(null, {
        message: `${unitNum}: standing on legs with no plinth.`,
      })));
    }

    // ── #18 a runner rung the catalogue has no article for (T43 F7) ───────
    //
    // Asked EXACTLY as the 3-D view and the BOM ask it — `runnerAskFor` for the
    // nominal (the ONE place the +10 lives), the owner's own ladder for the
    // rung, `runnerEntry` for the article — so the sentence in the Check panel
    // and the empty groove in the picture are two readings of one fact.
    for (const row of runnerRowsOf(result)) {
      runnerRows += 1;
      if (!catalogue || !runnerSystem) continue;      // the amber note says it once, below
      const variant = resolveRunnerVariant({
        drawer: row.drawer, unit, design, profile,
      });
      const nl = runnerAskFor(row.depth, profile) ?? row.depth;
      const entry = runnerEntry({
        system: runnerSystem, nl, variant, side: null, ladder,
      });
      if (entry) continue;
      // The RUNG, because that is what a workshop orders and what an upload
      // has to fill. Where the ask falls below the whole ladder there is no
      // rung, and the ask itself is the honest number to print.
      const rung = ladderRungFor(nl, profile);
      out.push(finding(18, 'red', at(null, {
        message: `${unitNum} D${row.drawer}: Runner NL${Math.round(rung ?? nl)} (${variant}): `
          + 'no article in catalogue — upload the model or adjust the ladder.',
        subject: { unitId, editor: 'cabinet' },
        runnerNl: rung ?? nl,
        runnerAskedNl: nl,
        runnerVariant: variant,
        drawer: row.drawer,
      })));
    }
  }

  // ── #18, the other verdict: no catalogue at all ─────────────────────────
  //
  // ONE amber note for the whole project. *"Never a red wall per drawer for a
  // dead network"* — a joiner working offline has not made a mistake, and a
  // check panel that says he has thirty times is a check panel he stops
  // reading.
  if (!catalogue && runnerRows > 0) {
    out.push(finding(18, 'yellow', {
      unitId: null,
      unitNum: '',
      panelId: null,
      message: 'hardware catalogue unreachable — runners not verified',
      subject: null,
      catalogueUnreachable: true,
    }));
  }

  // ── #2 front gaps, under F4's neighbour measure ─────────────────────────
  const clearances = frontClearances({
    entries,
    units: list,
    baseOf: (u) => unitBase(u, profile),
    wallWidthOf,
    profile,
  });
  for (const row of frontGapRows(clearances, profile)) {
    if (row.level === 'ok') continue;
    const first = row.fronts?.[0] || {};
    out.push(finding(2, row.level === 'parked' ? 'yellow' : row.level, {
      unitId: first.unitId || null,
      unitNum: first.unitNum || '',
      panelId: first.panelId || null,
      message: row.message,
      subject: first.panelId
        ? { unitId: first.unitId, panelId: first.panelId, editor: 'element' }
        : null,
      gapRow: row,
    }));
  }

  // ── #11 carcasses in a run that do not touch ────────────────────────────
  for (const g of carcassGaps(list, profile)) {
    out.push(finding(11, 'red', {
      unitId: g.rightUnitId,
      unitNum: g.rightNum,
      panelId: null,
      message: g.message,
      subject: { unitId: g.rightUnitId, editor: 'cabinet' },
      carcassGap: g,
    }));
  }

  // ── #14 a TOP BOX with no main under it (T36 F7) ───────────────────────
  for (const unit of list) {
    if (!riderIsOrphaned(unit, list)) continue;
    const num = unit.params?.unit_num || unit.id;
    out.push(finding(14, 'red', {
      unitId: unit.id,
      unitNum: num,
      panelId: null,
      message: `${num}: this top box is standing on nothing — put a wardrobe under it, or delete it.`,
      subject: { unitId: unit.id, editor: 'cabinet' },
    }));
  }

  // ── #15 a TOP BOX standing THROUGH its main (T37 F5c) ──────────────────
  for (const unit of list) {
    const over = riderOverlapMm(unit, list, profile);
    if (!over.overlap) continue;
    const num = unit.params?.unit_num || unit.id;
    out.push(finding(15, 'red', {
      unitId: unit.id,
      unitNum: num,
      panelId: null,
      message: `${num}: this top box stands ${Math.round(over.mm)} mm THROUGH the cabinet under it — two carcasses cannot occupy the same space.`,
      subject: { unitId: unit.id, editor: 'cabinet' },
      overlapMm: over.mm,
    }));
  }

  // ── #22 a front too thin to take a cup (T51-F5) ─────────────────────────
  //
  // The owner, 26.08.2026, with the door in his hand: *"puszka trochę odstaje
  // od lica … drzwi mają 18 minus 6 daje 12, a puszka jest na głębokość 11 …
  // może puszka jest oka, ale otwór jest za głęboki?"*
  //
  // The bore is measured against the material AT THE CUP now (`engine/doors.js
  // cupThicknessAtBore`, following `SKY:cupThickness` in the LISP). Where that
  // leaves less than the hinge actually needs, the bore is still CLAMPED — a
  // cup must never break out while somebody reads a report — and CLAUDE.md is
  // explicit about the other half: *"Report in Check when a front is too thin
  // to take a cup at all, rather than silently boring a shallower one."*
  //
  // A shortened cup is a hinge that does not hold, found by a customer. RED.
  for (const entry of entries) {
    const num = entry.unit?.params?.unit_num || entry.result?.unitNum || entry.unit?.id || '';
    for (const pnl of entry.result?.panels || []) {
      if (pnl.part !== 'FRONT' || pnl.meta?.appliance) continue;
      const bore = cupBoreOf(pnl, profile);
      if (!bore || !bore.short) continue;
      const where = pnl.meta?.shaker
        ? `its ${Math.round(pnl.meta.shaker.frame)} mm shaker frame is narrower than the cup reaches, so the cup lands in the ${Math.round(bore.thicknessAtCup)} mm panel field`
        : (pnl.meta?.glass
          ? `the cup reaches past its ${Math.round(pnl.meta.glass.frame || 0)} mm frame into the glass aperture`
          : `there is only ${Math.round(bore.thicknessAtCup)} mm of board under it`);
      out.push(finding(22, 'red', {
        unitId: entry.unit?.id || null,
        unitNum: num,
        panelId: pnl.id,
        message: `${num}: this front cannot take a ${bore.wanted} mm hinge cup — ${where}, `
          + `so the bore stops at ${Math.round(bore.depth * 10) / 10} mm. `
          + 'Use a thinner front style, a wider frame, or a shallow-cup hinge.',
        subject: { unitId: entry.unit?.id || null, editor: 'cabinet' },
        boreMm: bore.depth,
        wantedMm: bore.wanted,
        thicknessAtCupMm: bore.thicknessAtCup,
      }));
    }
  }

  // ── #23 a drawer too shallow to take a watch insert (T52-F5) ────────────
  //
  // CLAUDE.md, of the watch drawer: *"Report in Check when a drawer is too
  // shallow to take the insert rather than shipping a squashed one."*
  //
  // The ENGINE has already refused it (`engine/cabinet.js`, following
  // `SKY:watchDrawerTooShallow` in `reference/lisp/KIT_WATCH_DRAWER.lsp`): no
  // tray was cut, no pane was ordered and no strip was bought. This is the
  // other half — saying which drawer, and by how much — because a joiner who
  // asked for an insert and got silence would build the drawer and find out
  // afterwards.
  //
  // It reads the engine's own warning rather than re-deriving the fit: two
  // answers to "does it go in" is exactly how a picture and a cut part come to
  // disagree. RED, because the customer asked for it and it is not there.
  for (const entry of entries) {
    const num = entry.unit?.params?.unit_num || entry.result?.unitNum || entry.unit?.id || '';
    for (const w of entry.result?.warnings || []) {
      // ─── TURN 53 (CLAUDE.md F8d/F8g): AND THE GLASS SAYS WHY TOO ─────────
      //
      // *"No shelf above → the option is disabled with a reason, never silently
      // hidden."*  And the migration's own case: *"a saved project with a T52
      // v1 insert loads: the in-frame glass flag becomes the shelf-glass option
      // where a shelf sits above, otherwise it is dropped and Check #23's
      // neighbour names it."*  One mechanism does both — the pane is not cut,
      // and this is where the joiner is told.
      if (w?.code === 'watch_glass_needs_shelf' || w?.code === 'watch_glass_shelf_too_small') {
        out.push(finding(23, 'yellow', {
          unitId: entry.unit?.id || null,
          unitNum: num,
          message: `${num}: ${w.message} The drawer and its tray are cut exactly as asked; only the pane is not.`,
          subject: { unitId: entry.unit?.id || null, editor: 'cabinet' },
          drawer: w.drawer,
          reason: w.code,
        }));
        continue;
      }
      if (w?.code !== 'watch_insert_refused') continue;
      const where = w.zone == null ? `drawer ${w.drawer}` : `drawer ${w.drawer} of column ${Number(w.zone) + 1}`;
      const why = w.reason === 'too-shallow'
        ? `it is ${Math.round(Number(w.has_height_mm) || 0)} mm inside and the insert needs ${Math.round(Number(w.needs_height_mm) || 0)}`
        : `the box is too ${w.reason === 'too-narrow' ? 'narrow' : 'short'} for a row of pockets`;
      out.push(finding(23, 'red', {
        unitId: entry.unit?.id || null,
        unitNum: num,
        message: `${num}: ${where} cannot take the watch insert — ${why}. `
          + 'Nothing was cut. Make the drawer deeper, or put the insert in another one.',
        subject: { unitId: entry.unit?.id || null, editor: 'cabinet' },
        drawer: w.drawer,
        reason: w.reason,
        needsHeightMm: Number(w.needs_height_mm) || 0,
        hasHeightMm: Number(w.has_height_mm) || 0,
      }));
    }
  }

  // ── #24 the slope flipped a door onto its partition (T55-F3) ─────────────
  //
  // The owner: *"wymuszamy tylko jak się orientacja drzwi zmienia na
  // skosach."* Under a rake the flipped leaf's forced hinge edge has no
  // carcass side, so the store inserted the door-mount partition on that line
  // and the leaf hangs on it (projectStore `settleSlopeDoorPartitions`).
  // While the forcing stands, Check NAMES the partition — a notice, not a
  // fault: the app did the right thing and is saying that it did.
  for (const entry of entries) {
    for (const pnl of entry.result?.panels || []) {
      if (pnl?.meta?.hingeForced !== true || !pnl?.meta?.hingeOn) continue;
      if (!String(pnl.meta.hingeOn).startsWith('VPART')) continue;
      const num = entry.unit?.params?.unit_num || entry.result?.unitNum || entry.unit?.id || '';
      out.push(finding(24, 'yellow', {
        unitId: entry.unit?.id || null,
        unitNum: num,
        panelId: pnl.id,
        message: `${num} ${pnl.id}: the slope forced this door's hinge onto ${pnl.meta.hingeOn} — `
          + 'the door partition carries its plates while the forcing stands.',
        subject: { unitId: entry.unit?.id || null, panelId: pnl.id, editor: 'element' },
        partitionId: pnl.meta.hingeOn,
      }));
    }
  }

  // ── #21 the slope took a hinge off a door (T50-F7) ──────────────────────
  //
  // The owner: *"jak drzwi się zmniejszają, automatycznie usuwamy zawiasy tam
  // gdzie jest skos."*  It does — and *"Check reports what was removed, per
  // door — the app never silently changes a drilling pattern."*
  //
  // Both numbers are on the PIECE (`meta.slopeCut.hinges`), written by the same
  // pass that re-ran the ladder, so this rule reads them rather than deriving a
  // second opinion about how many hinges a cut door takes.
  //
  // It is a NOTICE and not a fault: nothing is wrong, the app has done the
  // right thing, and the joiner is being told that it did. Yellow, per door.
  for (const entry of entries) {
    for (const pnl of entry.result?.panels || []) {
      const h = pnl?.meta?.slopeCut?.hinges;
      if (!h || !(Number(h.was) > Number(h.now))) continue;
      const num = entry.unit?.params?.unit_num || entry.result?.unitNum || entry.unit?.id || '';
      const gone = Number(h.was) - Number(h.now);
      out.push(finding(21, 'yellow', {
        unitId: entry.unit?.id || null,
        unitNum: num,
        panelId: pnl.id,
        message: `${num} ${pnl.id}: the slope took ${gone} hinge${gone === 1 ? '' : 's'} off this door — `
          + `${h.was} became ${h.now}, re-spaced over what is left of the leaf.`,
        subject: { unitId: entry.unit?.id || null, panelId: pnl.id, editor: 'element' },
        hingesWas: Number(h.was),
        hingesNow: Number(h.now),
      }));
    }
  }

  // ── #20 a unit that is ALREADY bigger than its room (T50-F3) ─────────────
  //
  // The owner: *"dlaczego pozwala system dodawać top box powyżej rozmiaru
  // pokoju? to powinno być blokada."*  The block is at the two places a number
  // is TYPED (`engine/roomFit.js`, through the parameter panel and the size
  // modal). This is the OTHER half of F3, and it is the half that matters to
  // somebody opening a job saved before tonight:
  //
  //   *"An existing project that already contains such a unit opens unchanged
  //   and says so in Check, rather than being silently resized under the
  //   owner's hands."*
  //
  // So the project is not touched. It is REPORTED, by exactly the rule that
  // would have refused the number, asked of the size the unit already has —
  // one rule, so a saved job and a typed number can never disagree.
  if (room) {
    for (const fault of roomFitFaults(list, room, profile)) {
      const num = fault.unit.params?.unit_num || fault.unit.id;
      out.push(finding(20, 'red', {
        unitId: fault.unit.id,
        unitNum: num,
        panelId: null,
        message: `${num}: ${fault.message}`,
        subject: { unitId: fault.unit.id, editor: 'cabinet' },
        dimension: fault.key,
        limitMm: fault.limit,
      }));
    }
  }

  // ─── TURN 40 (CLAUDE.md F4b): NO TWINS, WHATEVER PRODUCED THEM ───────────
  //
  // The owner's twin turned out to be TWO CABINETS WEARING ONE NAME, and that
  // is fixed where it was made (`projectStore.nextUnitNum`). This is the second
  // line of defence and it is worth having: a finding is identified by the
  // rule, the CABINET (by id, which is unique whatever it is called), the piece
  // and the sentence — so no rule in this file, present or future, can print
  // one fault twice into a list a joiner works down. Two REAL faults on two
  // cabinets differ by `unitId` and both survive, which is the whole point of
  // keying on the id rather than on the message alone.
  const seen = new Set();
  const once = out.filter((f) => {
    const key = `${f.check}|${f.unitId}|${f.panelId ?? ''}|${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Reds first, then yellows, then the checks in their own order — which is the
  // order a joiner works down a list in.
  const rank = { red: 0, yellow: 1 };
  return once.sort((a, b) => (rank[a.level] - rank[b.level]) || (a.check - b.check)
    || String(a.unitNum).localeCompare(String(b.unitNum)));
}

/**
 * ─── TURN 43 (CLAUDE.md F7): THE DRAWERS THIS UNIT RUNS ON ──────────────────
 *
 * One row per BOX, off the engine's own published `DRAWER-SIDE` panels — the
 * same reading `3d/hardware3d.js runnerInstances` and `drawerBoxRects` take, so
 * the check, the picture and the drawing cannot disagree about how deep a box
 * is or how many there are. Nothing here re-derives a depth.
 */
export function runnerRowsOf(result) {
  const sides = (result?.panels || []).filter((p) => p.part === 'DRAWER-SIDE' && p.box);
  const rows = new Map();
  for (const p of sides) {
    const drawer = p.meta?.drawer ?? rows.size + 1;
    if (!rows.has(drawer)) rows.set(drawer, { drawer, depth: p.box.d, y: p.box.y });
  }
  return [...rows.values()].sort((a, b) => a.drawer - b.drawer);
}

/** How the panel's header reads: what was found, in one sentence. */
export function checkSummary(findings) {
  const reds = (findings || []).filter((f) => f.level === 'red').length;
  const yellows = (findings || []).filter((f) => f.level === 'yellow').length;
  if (!reds && !yellows) return 'Nothing to fix — the job is ready to cut.';
  const parts = [];
  if (reds) parts.push(`${reds} fault${reds === 1 ? '' : 's'}`);
  if (yellows) parts.push(`${yellows} to look at`);
  return parts.join(' · ');
}
