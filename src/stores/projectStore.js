import { create } from 'zustand';
import {
  clampDrawerFrontHeight, computeCabinet, doorCountFor, drawerSplitFor, isShelfLocked,
  minDrawerFrontHeight, SHELF_VARIANTS, WARDROBE_KIT_KINDS,
} from '../engine/cabinet.js';
import {
  applyPartEdits, partSignature, withPartEdit, withPartOps, withoutLastPartEdit, withoutPartEdits,
  withoutResizedPartEdits, resizeDropMessage, partOpsOf,
} from '../engine/partEdits.js';
// ─── TURN 38 (CLAUDE.md F3): THE PROJECT'S OWN CNC LAYERS ──────────────────
// A layer is a NAME and a COLOUR and nothing more — the toolpath is VCarve's
// problem (the owner's own ruling, 17.08.2026). They live WITH the project,
// beside the design, so they survive save and load by the same code that saves
// everything else about a job.
import { layerNameFault, makeUserLayer, normaliseUserLayers } from '../engine/partLayers.js';
import { getCabinetProfile } from '../engine/profile.js';
import { shelfTypeEnabled, shelfTypeOf, shelfVariantForType } from '../engine/shelfTypes.js';
import { doorBays } from '../engine/doors.js';
import { applyMagnet, magnetCandidates } from '../engine/shelfMagnet.js';
import {
  defaultParamsFor, getUnitType, resolveTypeId, UNIT_NUM_PREFIX, UNIT_TYPES,
} from '../engine/types.js';
import { useMaterialAssignmentStore } from './materialAssignmentStore.js';
import { formatMm, snap as snapTo } from '../engine/format.js';
// T37-F4a: `bandSegmentAt`/`bandSegments` — a split divider is an END of the
// cabinet, so the band a shelf lives in is cut by the boards that cross it.
// That law lives in one place and every path below reads it from there.
import {
  boxSpansOnWall,
  clampShelfPos, clampUnitDepth, clampUnitHeight, clampUnitWidth, clampUnitX, footprintPads,
  backStandoff, clampElementDepth, elementDepthBounds, freeSlotOnWall, insetPads, shelfBand,
  shelfBounds, unitIssues, unitPlanSpan, unitSpan,
  wallClearance,
  wallObstacles,
  bandsOverlap, unitBand, bandSegmentAt, bandSegments,
} from '../engine/collision.js';
import {
  DEFAULT_ROOM as ENGINE_DEFAULT_ROOM, migrateRoom, roomBoxes, roomChangeGuard, roomWalls,
  wallPlanObstacles,
} from '../engine/room.js';
// Turn 44 (CLAUDE.md F1): the elevation's own element — a SLOPE. Its rules are
// in lib/ rather than in the engine because iron rule 2 closes `src/engine/**`
// byte-for-byte tonight; see `setWallSlopes` below for the whole reasoning.
import { migrateWallElement, wallElements } from '../lib/wallElements.js';
// ─── TURN 46 (CLAUDE.md, "The slope, in numbers"): ONE ceilingAt ────────────
// The store is where a cabinet meets a room, so it is where the ceiling line
// becomes a number the engine and the clamp can use. Both come out of the same
// module the wall mesh and the elevation read — there is no second lerp here.
import {
  slopeCutLine, slopeInfillMm, slopeMinimumMm, slopeShortfallMm, slopeStation,
} from '../lib/slopeLine.js';
// T45 F9b/F9c: the job's LED spec — the groove mode, the channel width and the
// optional W/m. It rides the project beside the room for the same reason the
// wall elements do: `migrateLighting()` is an exhaustive whitelist and
// `src/engine/**` is closed byte-for-byte tonight (lib/ledSpec.js says it in
// full). The day the engine reopens it moves into `design.lighting`.
import { migrateLedSpec } from '../lib/ledSpec.js';
import {
  HEIGHT_KEYS, migrateDesign, normaliseDoorStyle, normaliseHandle, projectHeights,
  resolveUnitDesign, setCarcassTypeCount, withFrontColour, withRunMaterial,
} from '../engine/design.js';
import { handleClassCount } from '../engine/handles.js';
// Turn 30 (CLAUDE.md F8): the worktop, a design-layer auto-part over a run.
import { worktopEligible, worktopsFor } from '../engine/worktop.js';
import { frontGapClashes } from '../engine/frontGapClash.js';
// Turn 31 (CLAUDE.md F4): the owner's 18-point front-gap rulebook.
// Turn 32 (CLAUDE.md F3): …and the healing plan that APPLIES it.
import { carcassGaps, frontClearances, healingPlan } from '../engine/frontClearance.js';
// Turn 34 (CLAUDE.md F8): what one press of Delete removes, and what the
// selection falls to — one pure decision behind the key and the button alike.
import { deletePlan } from '../engine/deleteElement.js';
// Turn 34 (CLAUDE.md F5): one figure at a touch, three apart — off the same
// clearances the matrix heals, never re-derived.
import { meetingDimensions } from '../engine/meetingDimensions.js';
// Turn 34 (CLAUDE.md F7): the frame a saved shaker job was cut to, pinned on
// the way in — a changed default never redraws a job already on the bench.
import { legacyShakerFrame } from '../engine/shaker.js';
// Turn 32 (CLAUDE.md F3): the grey notes the self-healing announces itself
// with. One direction only — uiStore never reads this store.
import { useUiStore } from './uiStore.js';
// Turn 31 (CLAUDE.md F6): Check v1, the pre-production controller.
import { runChecks } from '../engine/checks.js';
// Turn 31 (CLAUDE.md F3): the drill guard's own number, at the source.
import { hingeMinSpacingMm, hingeRowClashes, hingeSpacingBlocks } from '../engine/cnc/drillGuard.js';
// TURN 40 (CLAUDE.md F1): the ONE post-split hinge reader. A split leaf's two
// segments each carry their own ladder and the cabinet's `hinge_centers` is
// the WHOLE-DOOR list it was before the split — which is why the Doors modal
// offered rows nothing is drilled at.
import { doorHingeRows, hasOwnHingeRows } from '../engine/hingeLadder.js';
import {
  carcassSources, facingMatchesSource, frontSources, projectBoardThickness, projectDepth,
  projectFrontThickness, setFrontTypeCount, sourceById, sourceTakesFacing,
} from '../engine/projectSettings.js';
import {
  autoPartsFor, takesPlinth, takesTopInfill, topInfillHeight, topInfillToCeiling,
} from '../engine/autoparts.js';
import {
  buildRuns, impliedLegHeight, paddedSpan, runEndGap, runInfillParams, runMaskParams,
  runMemberIds, runPlinthParams, standsOnLegHeight, unitBase, unitTop, unitVerticals,
  verticalsInBand,
} from '../engine/runs.js';
// Turn 50 (CLAUDE.md F2): the run is shared out, equally, once.
import {
  runFor as shareOutRunFor, shareOutFor, shareOutPlan, widthFixed,
} from '../engine/shareOut.js';
// Turn 50 (CLAUDE.md F3): nothing is built bigger than the room it stands in.
import { roomFitRefusal, roomFitFaults, riderBornHeight } from '../engine/roomFit.js';
// Turn 50 (CLAUDE.md F4): a low unit meeting a tall one grows its own end panel.
import {
  autoEndPanelJunctions, autoEndPanelMessage, withDeclined,
} from '../engine/endPanelAuto.js';
import {
  corniceCeilingNotice, corniceOption, corniceRefusals, runCorniceParams, takesCornice,
} from '../engine/cornice.js';
// Turn 36 (CLAUDE.md F7): a TOP BOX rides the wardrobe it stands on.
import { settleRiders } from '../engine/topBox.js';
import { prefillDesignFromCompany } from '../engine/companyDefaults.js';
// T48-F5: the LED groove, cut on the way to the sheet as well as to the file.
// It lives in `lib/` and not in the engine on purpose (T45's own argument):
// `computeCabinet()` cannot reach it, so a project with no line cannot move.
import { grooved } from '../lib/cncExport.js';
import { widthZones } from '../engine/zones.js';
import { resolveHingeFinish, resolveHingePlate, resolveHingeSystem } from '../engine/hinges.js';
import { mountHeightAlignedWith, topNeighbourDemand } from '../engine/doors.js';
import {
  centredShelfPos, drawersInEngineOrder, evenShelfPositions, floorLawedItem, nextHangerOffset,
  shelvesInEngineOrder,
} from '../engine/items.js';
// T48-F1: the floor a piece may not fall through — the engine's own answer to
// "where is the top face of the carcass bottom", asked rather than re-derived.
import { interiorFloor } from '../engine/shelfHeights.js';
// ─── TURN 35 (CLAUDE.md F1): the rail's datum, answered where it is knowable ─
import { railDatumFor, railSupportTops } from '../engine/railDatum.js';
// T37-F1: a piece selection spans cabinets — each member carries its own unit.
import { membersOf, parseMember } from '../lib/selection.js';
// T37-F2: the rail is a FIX SHELF with a rod hung under it. The link, the drop
// and where the assembly's shelf stands — `engine/railAssembly.js`.
import {
  assemblyShelfPos, hangerDropMm, RAIL_MOUNT, railMountOf, railShelfIdOf,
} from '../engine/railAssembly.js';
import { endPanelHeightDefault } from '../engine/autoparts.js';
// Turn 24 (CLAUDE.md F3): the caliper's six numbers, and the drawer gate.
import {
  CARCASS_SLOTS, drawerBoxGate, projectThicknesses, slotById,
} from '../engine/thickness.js';
import { runBatch } from './historyBatch.js';
// ─── Turn 31 (CLAUDE.md F2): ONE dirty gate, and 77 repeats deleted.
import { dirtyGate } from './dirtyGate.js';

// ─── Project state ───
// The room, the units standing in it and their interior contents (SPEC 5).
// The database is the home of this data; localStorage is only a cache so a
// refresh in mock mode does not lose work (CLAUDE.md rule 7).

const CACHE_KEY = 'cc.project.cache.v1';

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

/** A zone index, or null for "the whole width" — `Number(null)` is 0, so ask. */
const zoneIndexOf = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.trunc(Number(v)));

export const DEFAULT_ROOM = ENGINE_DEFAULT_ROOM;

/**
 * A design patch, merged (turn 12, CLAUDE.md F1).
 *
 * The stored design is migrated FIRST and the patch lands on the result. It is
 * already migrated in practice (loadProject and newProject both do it), and
 * this is still not belt-and-braces: since turn 9 the design carries a ONE-WAY
 * migration — a sheen on the old 0–25 scale is multiplied by four — and a patch
 * merged onto an unmigrated base would hand a freshly typed 25 to that rule and
 * store 100 (CLAUDE.md F5).
 *
 * The FRONT COLOUR is the one field a plain merge cannot do, because it lives
 * in two places that have to agree (engine/design.js `withFrontColour`). A
 * patch that sets `colour.front` and says nothing about the front types is the
 * old Design-settings shape — the sprayed-finish picker — and it is routed
 * through the one setter so that both halves move together.
 */
function applyDesignPatch(stored, patch) {
  const merged = migrateDesign({ ...migrateDesign(stored), ...patch });
  const setsFrontColour = patch && Object.hasOwn(patch, 'colour')
    && Object.hasOwn(patch.colour || {}, 'front')
    && !Object.hasOwn(patch, 'fronts');
  return setsFrontColour ? withFrontColour(merged, patch.colour.front) : merged;
}

function newUnit(typeId, profile, index, design) {
  const type = getUnitType(typeId);
  const params = defaultParamsFor(type.id, profile);
  // ─── TURN 30 (CLAUDE.md F10): A NEW CABINET HAS NO STYLE OF ITS OWN ──────
  //
  // `defaultParamsFor` stamps the profile's default front type, and that stamp
  // is the FIXTURE contract for a bare `computeCabinet()` — it must not move
  // there. Inside a PROJECT it is the wrong answer: a cabinet somebody has just
  // placed has expressed no opinion about its front style, and stamping one
  // made the project's own answer unreachable for ever after.
  //
  // `null` is "nobody has said", which is the same null every other layer in
  // this app uses for it, and `paramsForEngine` resolves it through
  // `resolveUnitDesign`'s cascade: this unit → its door style → the PROJECT.
  //
  // ─── TURN 30 (CLAUDE.md F21): …UNLESS THE KIT IS ITS FACE ────────────────
  // Picking "Glass unit" out of the library IS saying something about the
  // front style — it is the whole reason that row exists — so a kit that
  // declares a `frontType` places its cabinets wearing it, as the unit's own
  // answer. That leaves it exactly as editable as any other: one write of
  // `null` in the front-style select hands it back to the project.
  params.front_type = type.frontType || null;
  params.front_style_schema = FRONT_STYLE_SCHEMA;
  // A drawer unit IS its drawers — the LISP kit has no "how many" question, so
  // the stack exists from the moment the unit is placed.
  //
  // ─── Turn 18 (CLAUDE.md F2.1) ───
  // …and it is the KIT's own split that says how many, not `baseDrawerUnit`'s
  // 4:3:2. A BUDR2 is two drawers and a BUDR4 is four; both were being placed
  // with three rows, so a BUDR4's fourth drawer had no row to be addressed by
  // and a BUDR2 carried a phantom. `drawerSplitFor` is the same function the
  // engine builds the stack with, which is what stops the two disagreeing.
  const items = type.drawerStyle === 'budr'
    ? drawerSplitFor(type, profile).ratio.map((_, i) => ({
      id: uid('drawer'), kind: 'drawer', index: i + 1, mount: 'overlay',
    }))
    : [];
  return {
    id: uid('u'),
    type: type.id,
    position: { wall: 0, x_mm: 0, rotation_deg: 0 },
    params: {
      ...params,
      // The unit arrives at the PROJECT's heights (turn 5, BACKLOG #29): a
      // kitchen is built to one set of them, so a new cabinet matching the run
      // beside it is the default and a different height is the exception.
      ...projectHeightParams(type, design, profile),
      unit_num: autoUnitNum(type, index),
      // Doors are the LAST step (SPEC 4.10) — except where the type has none,
      // and except where the "door" is the APPLIANCE's own front (turn 29,
      // CLAUDE.md F3): a D/W panel is a front, a rail and a toe kick, and two
      // of the three arriving fitted while the joiner has to ask for the
      // third is not a composition anybody chose. `defaultParamsFor` says the
      // same thing off the same property, so a bare kit call agrees.
      // eslint-disable-next-line no-nested-ternary
      doors: type.supports.doors ? (type.frontOpens ? true : false) : null,
      // ─── TURN 48 (CLAUDE.md F3): THE PLINTH DEFAULTS ON ────────────────────
      //
      // The owner, 25.08.2026: the plinth is ON by default — standing carcasses
      // only, never a hung WUD.
      //
      // WHERE IT LIVES MATTERS AS MUCH AS WHAT IT SAYS. Turn 4 made the plinth a
      // DECISION rather than an automatic (BACKLOG #16: no ghost rows in the cut
      // list) and that was right about the cut list and wrong about the default —
      // a base unit without a toe kick is not a thing this workshop builds, so
      // every single one was being ticked by hand. What changes is the ANSWER a
      // new cabinet arrives with, not who owns the question: it is still one
      // untick away, the panel's control is unmoved, and the check that speaks
      // when a standing unit has none is unmoved too.
      //
      // It is written HERE, where a unit is BORN in a project, and NOT in
      // `defaultParamsFor()`. A bare `computeCabinet(defaultParamsFor(id))` is
      // the golden fixtures' own contract and reproduces the LISP kit and
      // nothing else; moving this line one file over would put a PLINTH panel
      // into all six of them and break iron rule 2 by a whole part.
      //
      // WHICH TYPES is not a list. `takesPlinth` is the engine's own gate —
      // `(type.plinth ?? type.legs) && mount === 'floor'`, the same function
      // the right panel shows the control from and the same one `checks.js`
      // warns off — so the owner's seven (BUD, BUDR, SINK, LOW, BUDTALL,
      // FRIDGE, WARDROBE) are answered by asking rather than by naming, and a
      // WUD hanging on the wall is refused by the same sentence that has always
      // refused it a plinth. A LOADED project never comes through here: it opens
      // exactly as it was saved.
      ...(takesPlinth(type.id, profile) ? { plinth: true } : {}),
      sections: [{ width_mm: params.width, items }],
      materials: {},
    },
  };
}

/**
 * The workshop's stock list, as the assignment store holds it.
 *
 * Read through a function rather than captured at module load, so a list loaded
 * from the database (or swapped in a test) is the one the next question gets.
 * The ENGINE never reaches for it — every engine function that needs stock
 * takes it as an argument (CLAUDE.md rule 1) — and this is the one place the
 * store hands it over.
 */
function workshopMaterials() {
  try {
    return useMaterialAssignmentStore.getState().materials || [];
  } catch {
    return [];
  }
}

/**
 * The name a cabinet is BORN with (turn 16, CLAUDE.md F6).
 *
 * The automatic default, unchanged: the kit's prefix and the unit's position in
 * the project, zero-padded — 01, 02, WU05. It is a function now rather than an
 * expression inline in `makeUnit`, because `setUnitName` needs the same answer
 * to give a cabinet back when its name is cleared, and two copies of a naming
 * convention is how a project ends up with two.
 */
function autoUnitNum(type, index) {
  return `${UNIT_NUM_PREFIX[type?.id] ?? ''}${String((Number(index) || 0) + 1).padStart(2, '0')}`;
}

/**
 * ─── TURN 40 (CLAUDE.md F4b): THE NEXT FREE NUMBER, NOT THE NEXT INDEX ──────
 *
 * The owner's screenshot: `#3 TALL CABINET WITH NO FIXED SHELF` printed TWICE,
 * word for word, apparently for one cabinet. CLAUDE.md guessed a per-shelf loop
 * where a per-cabinet answer belongs; the investigation says otherwise, and the
 * measurement is in `test/turn40-f4-checks.test.js`:
 *
 *   · Rule #3 emits exactly ONCE per cabinet. Driven from node, a single 2460
 *     tall wardrobe with one non-fixed shelf produces one finding. It always
 *     did.
 *   · What produces two IDENTICAL lines is TWO CABINETS WEARING ONE NAME.
 *     `addUnit` numbered a new cabinet from `units.length`, so deleting one and
 *     adding another handed the newcomer a number somebody else already had:
 *     add W01 and W02, delete W01, add a wardrobe → the new one is W02 as well.
 *     Two real faults on two real cabinets, printed as two lines a person
 *     cannot tell apart. He was right that something was wrong and right that
 *     it looked like one cabinet.
 *
 * So the fault is fixed where it is MADE. A new cabinet takes the next number
 * NOBODY IS WEARING for its prefix, which is what a workshop means by "the next
 * one". Nothing renames an existing cabinet — a number a joiner has written on
 * a cut list is his — and a project that has never had a deletion numbers
 * exactly as it always did, which is why no fixture and no saved job moves.
 *
 * The prefix is matched by its own head rather than by `startsWith`, because
 * the base unit's prefix is the EMPTY string: `'W01'.startsWith('')` is true,
 * and a wardrobe must not be able to bump a base unit's number.
 */
export function nextUnitNum(units, type, { except = null } = {}) {
  const prefix = UNIT_NUM_PREFIX[type?.id] ?? '';
  let highest = 0;
  for (const u of units || []) {
    if (except && u?.id === except) continue;
    const num = String(u?.params?.unit_num ?? '');
    const digits = num.match(/\d+$/);
    if (!digits) continue;
    if (num.slice(0, num.length - digits[0].length) !== prefix) continue;
    highest = Math.max(highest, Number(digits[0]));
  }
  return `${prefix}${String(highest + 1).padStart(2, '0')}`;
}

/**
 * The height parameters a unit of this type INHERITS from the project: its
 * carcass height (when its kind has a project height at all), the toe kick it
 * stands on, and — for a wall unit — how high it hangs.
 *
 * `height_custom: false` is written explicitly rather than left undefined: it
 * is the answer to "did somebody set this by hand?", and the panel and the
 * project-wide push both read it.
 */
function projectHeightParams(type, design, profile) {
  const heights = projectHeights(design, profile);
  const group = type.heightGroup ?? null;
  return {
    ...(group ? { height: heights[group], height_custom: false } : { height_custom: false }),
    ...(type.mount === 'wall' ? { mount_height: heights.wallMount } : {}),
    // ─── Turn 22 (CLAUDE.md F4.2) ───
    // A plinth-bearing type gets the project's toe kick whether or not it has
    // legs. The D/W panel has none — the machine stands where they would be —
    // and its front, its plinth line and its total height all have to sit as
    // if the run's legs were under it, which they cannot do off a number it
    // was never given. `standsOnLegHeight` is the one place that sentence is
    // written (engine/runs.js).
    ...(standsOnLegHeight(type) ? { leg_height: heights.toeKick } : {}),
    // ─── Turn 11 (CLAUDE.md F9.1/F9.3) ───
    // The other three the project decides: how DEEP its units are, and the two
    // boards they are cut from. A kitchen is built to one depth — a run whose
    // cabinets are 558 and 560 has a step down the front of it — and the board
    // follows from where the workshop said the material comes from.
    //
    // A WALL unit keeps its own depth: 400 is what a wall unit is, and a 558 mm
    // one over a worktop is a cabinet you walk into.
    //
    // ─── Turn 30 (CLAUDE.md F19) ───
    // …and so does a kit whose depth IS its identity. A corner unit turns the
    // run: its depth is the second wall's arm, not the run's front line, and a
    // 558 corner is not a corner. `ownDepth` is the same sentence the wall
    // unit's `mount` says, said by a kit that is not on a wall.
    ...(type.mount === 'wall' || type.ownDepth ? {} : { depth: projectDepth(design, profile) }),
    board_t: projectBoardThickness(design, profile),
    // Turn 16 (CLAUDE.md F1.1): front type 1's ASSIGNED BOARD pins this where
    // there is one, exactly as carcass 1's does for the carcass. The stock list
    // is read from the assignment store here rather than inside the engine,
    // which keeps `projectFrontThickness` a pure function of its arguments.
    front_t: projectFrontThickness(design, profile, workshopMaterials()),
  };
}

/**
 * Put a saved set's parameters onto a freshly made unit (turn 5, BACKLOG #30).
 *
 * Everything about HOW the unit is built comes from the template; the things
 * that belong to this project — its number, and fresh ids for every interior
 * item — stay the unit's own. Without the new ids a template used twice would
 * produce two units whose shelves share an id, and a drag on one would move the
 * other.
 */
function applyTemplateParams(unit, params) {
  const saved = JSON.parse(JSON.stringify(params));
  // ─── TURN 41 (F2): AND THE CROSS-REFERENCES COME WITH THEM ────────────────
  //
  // MEASURED FAULT. Every item is given a fresh id here, and T37's rail
  // assembly is TWO items joined by one: the hanger carries `shelf_id`, naming
  // the fix shelf it hangs under. Re-id the shelf without re-pointing the
  // hanger and the copy's hanger names a shelf in the SOURCE unit. The engine's
  // orphan rule is then perfectly correct and perfectly silent: a rail whose
  // shelf is gone is not there. Measured on a copied wardrobe —
  // `assemblies.rail` null, rail hardware 0 (source 1), RAIL-PART 0, rail
  // drills 0 — while the right panel still listed "Hanger rail" with a number.
  // A joiner copies a wardrobe and the copy quietly has no rod in it.
  //
  // So the id map is built FIRST and every cross-reference is remapped through
  // it. `shelf_id` is the only one today; the map is the place the next one is
  // added, which is why it is a loop over a named list rather than one line.
  const CROSS_REFS = ['shelf_id'];
  const idMap = new Map();
  for (const section of saved.sections || []) {
    for (const item of section.items || []) {
      if (item?.id != null) idMap.set(item.id, uid(item.kind || 'item'));
    }
  }
  const sections = (saved.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => {
      const next = { ...item, id: idMap.get(item.id) ?? uid(item.kind || 'item') };
      for (const key of CROSS_REFS) {
        if (next[key] != null && idMap.has(next[key])) next[key] = idMap.get(next[key]);
      }
      return next;
    }),
  }));
  unit.params = {
    ...unit.params,
    ...saved,
    unit_num: unit.params.unit_num,
    end_panels: (saved.end_panels || []).map((ep) => ({ ...ep, id: uid('ep') })),
    sections: sections.length ? sections : unit.params.sections,
  };
  return unit;
}

/**
 * Which drawer of a BUDR stack this ref means, counted from the FLOOR
 * (turn 18, CLAUDE.md F2.1).
 *
 * A ratio stack has no ids of its own — the engine addresses its drawers by
 * position and writes `params.drawer_heights` in that order. A kitchen drawer
 * unit nevertheless CARRIES item rows (`newUnit`: a drawer unit is its
 * drawers), so a panel with an item in its hand hands one over. Both are the
 * same drawer, and this is the one place that has to say so.
 *
 * A number is already the index. An id is looked up in the unit's own rows,
 * ordered exactly as the engine orders them (`index` ascending, bottom-up).
 */
function budrDrawerIndex(unit, ref) {
  if (typeof ref === 'number') return ref;
  const rows = (unit?.params?.sections?.[0]?.items || [])
    .filter((i) => i.kind === 'drawer')
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
  const at = rows.findIndex((i) => i.id === ref);
  return at;                                   // −1 → the setter refuses it
}

/** Interior items -> the count/flag shape the engine consumes. */
/**
 * Which CARCASS sides carry a hinged door — the design layer's own answer.
 *
 * Returns null when the unit has no per-bay doors, which leaves the engine's
 * `doorCount` rule exactly where it was for every cabinet in the app but this
 * one shape.
 */
function hingedCarcassSides(p) {
  const bays = Array.isArray(p?.bay_doors) ? p.bay_doors : null;
  if (!bays || !bays.length) return undefined;
  const on = (m) => String(m?.door ?? 'none').toLowerCase() !== 'none';
  const hinge = (m) => (String(m?.hinge || 'L').toUpperCase() === 'R' ? 'R' : 'L');
  const first = bays[0];
  const last = bays[bays.length - 1];
  const sides = [];
  if (on(first) && hinge(first) === 'L') sides.push('BUL');
  if (on(last) && hinge(last) === 'R') sides.push('BUR');
  return sides;
}

/**
 * ─── TURN 46 (CLAUDE.md F2): THE SLOPES OVER ONE WALL ───────────────────────
 *
 * `project.wallSlopes` is the T44 list and it carries three kinds now
 * (T45-F1b); a SLOPE is the only one the ceiling is made of. Normalised by the
 * one module that owns the schema, filtered by wall index, and nothing else in
 * this store re-reads that list for geometry.
 */
function slopesOfWall(state, wallIndex) {
  return wallElements(state?.project?.wallSlopes)
    .filter((e) => (e.kind ?? 'slope') === 'slope' && (e.wall ?? 0) === (Number(wallIndex) || 0));
}

/**
 * The stretch of THIS wall a unit of this footprint may stand on.
 *
 * The owner's arrival law, 24.08: a unit may drive INTO the slope zone — that
 * is the point of the turn — until its far edge has only 400 mm of clear
 * carcass left under the scribe gap. Past that it is a hard stop, and
 * `clampUnitX` enforces it the way it enforces a neighbour.
 *
 * @returns {{min:number,max:number}|null} null when the wall has no slope, and
 *   then `clampUnitX` behaves exactly as it did before tonight.
 */
function slopeLimitFor(state, unit, wall, footprintWidth, profile) {
  const slopes = slopesOfWall(state, unit?.position?.wall ?? 0);
  if (!slopes.length) return null;
  return slopeStation({
    slopes,
    wallWidth: Number(wall?.width) || 0,
    wallHeight: Number(state?.project?.room?.height) || 0,
    width: Number(footprintWidth) || 0,
    infill: slopeInfillMm(state?.project?.design),
    floorY: floorYOf(unit, null, profile),
    minimum: slopeMinimumMm(profile),
  });
}

/**
 * ─── TURN 46 (CLAUDE.md F3/F5): THE CUT, RESOLVED ON EVERY COMPUTE ──────────
 *
 * *"Live: drag end re-runs the engine (the same pos_mm path every drag uses) —
 * the cabinet re-cuts itself as it arrives under the slope."*
 *
 * LIVE is free, and this line is why: `paramsForEngine` runs on EVERY compute,
 * so the cut is re-derived from where the unit is standing at that moment.
 * There is nothing stored, nothing to invalidate and nothing to remember —
 * exactly the mechanism T35-F12's `front_top_gap_mm` uses one field above, and
 * for the same stated reason. Drag it under the slope and it is cut; drag it
 * back out and the key is absent again and the kit cuts what the AutoLISP cuts.
 *
 * @returns {object|null} the two points, or null — and null means the key is
 *   never written, which is iron rule 2's gate.
 */
function slopeCutFor(unit, design) {
  const state = useProjectStore.getState();
  const wallIndex = unit?.position?.wall;
  if (wallIndex == null) return null;
  const slopes = slopesOfWall(state, wallIndex);
  if (!slopes.length) return null;
  const wall = roomWalls(state.project.room)[wallIndex];
  if (!wall) return null;
  return slopeCutLine({
    slopes,
    wallWidth: Number(wall.width) || 0,
    wallHeight: Number(state.project.room?.height) || 0,
    x: Number(unit.position.x_mm) || 0,
    width: Number(unit.params?.width) || 0,
    infill: slopeInfillMm(design || state.project.design),
    floorY: floorYOf(unit, null, getCabinetProfile()),
  });
}

function paramsForEngine(unit, design = null) {
  const p = unit.params;
  const items = p.sections?.[0]?.items || [];
  const profile = getCabinetProfile();
  const slopeCut = slopeCutFor(unit, design);
  return {
    ...p,
    type: unit.type,
    items,
    // ─── TURN 46 (CLAUDE.md F3): THE SLOPE CUT ────────────────────────────
    // On the override channel, exactly as the plinth, the hinge standard, the
    // shaker frame and the shelf-pin setback travel — an INPUT in the design
    // layer, never a formula in the engine. The key is ABSENT for a unit that
    // is not under a slope (`...(x ? {k:v} : {})`, the house's own idiom for
    // exactly this), so a bare `computeCabinet()` and every golden fixture pass
    // nothing at all and cut what the AutoLISP cuts.
    ...(slopeCut ? { slope_cut: slopeCut } : {}),
    // ─── Turn 8 (CLAUDE.md F4) ───
    // How far a FIX shelf and a partition stand back from the face. It is
    // supplied HERE rather than defaulted inside computeCabinet, and that is
    // the same rule the plinth and the top infill follow: the engine builds
    // what a PROJECT asks for, and a bare kit call — every golden fixture — has
    // to keep cutting exactly what the AutoLISP cuts (fixtures/README rule 1).
    //
    // A unit may still say otherwise for itself; this is only the floor under
    // "nobody has said".
    interior_setback_mm: Number.isFinite(Number(p.interior_setback_mm))
      ? Number(p.interior_setback_mm)
      : profile.carcass.interiorSetback,
    // ─── Turn 11 (CLAUDE.md F3.1) ───
    // What a project has said about ONE piece of this cabinet, keyed by the
    // engine's own panel id. A DESIGN-layer input like the plinth and the top
    // infill: the engine gained an input, not a formula, and a bare
    // computeCabinet() with none of them set cuts what the AutoLISP cuts.
    element_overrides: p.element_overrides || null,
    // ─── Turn 17 (CLAUDE.md F7.1) ───
    // The PROJECT's hinge standard, travelling the same way the plinth and the
    // top infill do: an input in the design layer, never a formula in the
    // engine. Left out — a bare kit call, every golden fixture — the engine
    // falls back to the profile's 3 and drills what the AutoLISP drills.
    hinge_standard: design?.hinges?.standard ?? null,
    // ─── Turn 19 (CLAUDE.md F1.1/F1.3) ───
    // WHICH hinge, as opposed to how many. The project's finish and the label
    // of the system it is fitted with travel down as inputs, exactly as the
    // standard above does; the per-door exceptions are already on the unit's
    // own params and are passed through by the spread, but they are named here
    // so the hand-off is visible rather than accidental.
    //
    // Every one of them is ADDITIVE and none reaches a hole. A bare kit call —
    // every golden fixture — passes none of them, resolves no article, and
    // drills what the AutoLISP drills.
    project_hinge_finish: resolveHingeFinish(design, profile),
    project_hinge_system_label: profile.hardware.hinge.cliptop.systemLabel,
    door_hinges: p.door_hinges || null,
    // ─── TURN 33 (CLAUDE.md F4): MIRRORS ON DOORS ───────────────────────────
    // Per-door, keyed by the engine panel id like door_hinges above: 'inside'
    // | 'outside'; absence is none. A mirror is BONDED, never drilled — the
    // engine stamps a meta face, draws a plane and orders the glass, and NOT
    // ONE hole travels with it.
    door_mirrors: p.door_mirrors || null,
    // ─── Turn 18 (CLAUDE.md F6.4) ───
    // The PROJECT's runner variant, travelling exactly as the hinge standard
    // does. It is deliberately NOT `runner_variant` — that name belongs to the
    // unit's own answer, which sits above this one in the hierarchy — so a
    // cabinet that has said something for itself keeps saying it.
    project_runner_variant: design?.runners?.variant ?? null,
    // ─── TURN 25 (CLAUDE.md F3.1): THE PROJECT'S SHAKER FRAME ──────────────
    // Travels exactly as the hinge standard and the runner variant do: an INPUT
    // in the design layer, never a formula in the engine. Left out — a bare kit
    // call, every golden fixture — the engine falls back to the profile's 70.
    // ─── TURN 30 (CLAUDE.md F10): THE PROJECT'S FRONT STYLE PROPAGATES ─────
    //
    // Choose "Flat" in the main menu and every front without its own override
    // follows. It did NOT: the project's answer lived in `design.fronts.style`
    // and stopped there, because the engine reads `params.front_type` and
    // falls back to `profile.front.defaultType` — the workshop's Shaker — so a
    // whole job set to Flat was still CUT as Shaker.
    //
    // The cascade already existed and was already correct; what was missing was
    // that it never reached the engine. `resolveUnitDesign` is that cascade,
    // written once in turn 13 and read by the 3-D, the drawings and the BOM:
    //
    //     this unit's own `front_type`  →  its door STYLE's  →  the PROJECT's
    //
    // so per-unit overrides survive by construction, exactly as the hinge
    // finish's do. It is passed HERE, on the override channel, and never as a
    // formula in the engine: a bare `computeCabinet()` — every golden fixture —
    // is handed no design at all and falls back to the profile's own default,
    // which is what the AutoLISP cuts.
    front_type: design ? resolveUnitDesign(unit, design).frontType : p.front_type,
    // ─── TURN 31 (CLAUDE.md F4.8): THE ASYMMETRY LAW'S OWN INPUT ───────────
    //
    // Per-front, per-EDGE millimetres, decided by the owner's clearance matrix
    // (engine/frontClearance.js) and applied by one pass in the engine. It
    // travels the override channel exactly as the plinth, the hinge standard,
    // the shaker frame and the shelf-pin setback do: an INPUT in the project
    // layer, never a formula in the kit. Left out — a bare `computeCabinet()`,
    // every golden fixture — the pass does nothing at all and the kit cuts what
    // the AutoLISP cuts.
    front_edge_trim: p.front_edge_trim || null,
    shaker_frame_mm: design?.fronts?.shakerFrame ?? null,
    // ─── TURN 30 (CLAUDE.md F5): THE SHELF-PIN SETBACK ─────────────────────
    // The owner's standard is 50 and the LISP's is 70, so 70 stays the ENGINE's
    // bare answer and this is the override channel — travelling exactly as the
    // plinth, the hinge standard, the runner variant and the shaker frame do:
    // an INPUT in the design layer, never a formula in the engine. Left out —
    // a bare kit call, every golden fixture — the engine falls back to the
    // profile's 70 and drills what the AutoLISP drills.
    //
    // The COMPANY row has already been folded into the design by
    // `prefillDesignFromCompany` at `newProject`, which is where every other
    // company preference is resolved; a project that has said something of its
    // own keeps saying it.
    // ─── TURN 33 (CLAUDE.md F10): THE PROFILE ANSWERS 50 ────────────────────
    // The owner's declared standard ("default 50 mm bez ustawiania") stands
    // where the design says nothing; a saved project that set its own number
    // keeps it. A BARE kit call still passes nothing and drills the LISP's 70.
    shelf_pin_setback_mm: design?.shelves?.pinSetback
      ?? getCabinetProfile().shelfHoles.ownerPinSetback
      ?? null,
    // ─── TURN 30 (CLAUDE.md F11): TWO HINGES UNDER 600 ─────────────────────
    // The owner's standard, on the same road as the setback above it and the
    // plinth before both: an INPUT in the design layer, never a formula in the
    // engine. Left out — a bare kit call, every golden fixture — the engine
    // uses the LISP's own ladders and drills what the AutoLISP drills.
    hinge_two_below_mm: design?.hingeTwoBelow ?? null,
    // ─── TURN 25 (CLAUDE.md F4): THE HANDLE, AND ONE FRONT'S OWN ───────────
    // The project's choice with its per-class offsets, and this cabinet's own
    // exceptions keyed by panel id — the same two-level shape turn 19 gave the
    // hinge. Neither reaches a hole unless a handle has been ASKED for, which
    // is R9: no handle, no drilling.
    project_handle: design?.fronts?.handle
      ? { ...design.fronts.handle, offsets: design.fronts.handleOffsets || {} }
      : null,
    front_handles: p.front_handles || null,
    // ─── TURN 24 (CLAUDE.md F3.2): THE SIX MEASURED SLOTS ───────────────────
    //
    // The owner's law: the engine computes from the CALIPER. The six numbers
    // travel exactly as the plinth, the hinge standard and the runner variant
    // do — an INPUT in the design layer, never a formula in the engine — so a
    // bare `computeCabinet()` and every golden fixture pass none of them and
    // resolve to `board_t` and `front_t`, which is what they cut yesterday.
    // ─── TURN 32 (CLAUDE.md F7): READY-MADE BOXES, ON THE SAME ROAD ────────
    // The wizard's one answer travels as an input; the engine keeps cutting
    // every board for a project that never said otherwise.
    drawer_boxes: design?.drawerBoxes?.mode ?? null,
    thickness_slots: design
      ? projectThicknesses({ design, profile, materials: workshopMaterials() })
      : null,
    shelves: items.filter((i) => i.kind === 'shelf').length,
    drawers: items.filter((i) => i.kind === 'drawer').length,
    rail: items.some((i) => i.kind === 'hanger'),
    // ─── TURN 35 (CLAUDE.md F12): THE DOOR'S TOP EDGE ─────────────────────
    // The owner: *"jak nie ma infilla, to wysokość drzwi szafowych jest bez
    // 3 mm przerwy; a jak dołożysz infill lub cornice, to wtedy skracamy o
    // 3 mm."* This IS the self-healing: `paramsForEngine` runs on every
    // compute, so every path that adds or removes the neighbour above — and
    // every reload — re-derives the number with nothing to remember.
    front_top_gap_mm: topNeighbourDemand(p, profile),
    // ─── TURN 41 (F3): THE DESIGN LAYER ANSWERS "IS A DOOR HUNG ON THIS SIDE"
    //
    // CLAUDE.md F3a put this here in as many words and T40 built it in the
    // engine instead, where `doorCount` is a FACE rule that has never heard of
    // per-bay doors — so a wardrobe with bay leaves read as a wardrobe with no
    // doors at all and lost the hinge strip its plates still needed.
    //
    // The outer boundaries are the only ones the drawer strip cares about, and
    // they are fixed whatever the bays turn out to be: the FIRST bay's left
    // boundary is always BUL and the LAST bay's right boundary is always BUR.
    // A middle bay's leaf hangs on partitions and reserves nothing on the
    // carcass, which is the same answer `bayDoorPlan` gives the plate pattern.
    //
    // Stated only when there ARE bay doors, so every other cabinet in the app
    // is answered by exactly the engine expression that answered it yesterday.
    hinged_carcass_sides: hingedCarcassSides(p),
    rail_offset: items.find((i) => i.kind === 'hanger')?.pos_mm ?? p.rail_offset,
    // T35-F1: and WHICH board that number is measured from. Absent on every
    // project saved before this turn, which is exactly what makes those
    // projects render unchanged.
    rail_datum: items.find((i) => i.kind === 'hanger')?.datum ?? p.rail_datum ?? null,
    // Which rail was chosen from the hardware list, so the BOM line names the
    // product and not just a length (turn 4, BACKLOG #14).
    rail_material_id: items.find((i) => i.kind === 'hanger')?.material_id ?? null,
    rail_material_label: items.find((i) => i.kind === 'hanger')?.material_label ?? null,
  };
}

/**
 * A panel's CUT RECTANGLE, in the frame the editor draws it in (turn 38, F5).
 *
 * The drawn frame where there is one, the cut size otherwise — the same pair
 * `partSize` and `partSignature` read, so the size the editor stamps and the
 * size the resize rule compares against can never be two different numbers.
 */
export function panelSizeOf(panel) {
  return {
    w: Number(panel?.cnc?.drawn_w) || Number(panel?.w) || 0,
    h: Number(panel?.cnc?.drawn_h) || Number(panel?.h) || 0,
  };
}

// ─── Shelf schema (turn 8, CLAUDE.md F4) ───
// `variant: 'fixed'` used to mean nothing more than "a shelf" — it was the value
// `addShelves` wrote and the value the panel showed for everything. It means
// SCREWED now, so every shelf saved before turn 8 would silently become a
// screwed one: three ⌀3 holes per side instead of a column of pins, on a
// cabinet somebody may already have cut.
//
// So it is a migration with a stamp, exactly like PROFILE_SCHEMA and
// DESIGN_SCHEMA: on the way in, a unit that has not been through it has its
// shelves read as ADJUSTABLE, which is what they were, and is marked done.
const SHELF_SCHEMA = 2;

export function migrateUnitShelves(unit) {
  if (!unit?.params || unit.params.shelf_schema === SHELF_SCHEMA) return unit;
  // ─── TURN 41 (F2): A BOARD CARRYING A ROD IS NOT A LEGACY SHELF ───────────
  //
  // MEASURED FAULT. This migration reads every `variant: 'fixed'` as "a shelf
  // saved before turn 8, when fixed meant nothing", and demotes it to pins.
  // That was right for turn 8. It is wrong for T37's rail assembly, whose shelf
  // is fixed for a reason that has nothing to do with the old meaning: it
  // CARRIES A CLOTHES RAIL, and T37 made it fixed precisely so it could.
  //
  // Measured on a reload of a wardrobe created in this version: the assembly's
  // shelf came back 864 → 860 mm wide, `meta.locked` true → false, its eleven
  // screw holes replaced by twelve pin holes. A board with a full rail of
  // clothes on it, sitting on four pins.
  //
  // A shelf NAMED BY A HANGER is exempt. It is not a guess about intent — the
  // foreign key is the intent, written down by the code that made the pair.
  const railShelfIds = new Set(
    (unit.params.sections || [])
      .flatMap((section) => section.items || [])
      .filter((i) => i?.kind === 'hanger')
      .map((i) => railShelfIdOf(i))
      .filter((id) => id != null),
  );
  const sections = (unit.params.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => (item.kind === 'shelf' && item.variant === 'fixed'
      && !railShelfIds.has(item.id)
      ? { ...item, variant: 'adjustable' }
      : item)),
  }));
  return {
    ...unit,
    params: {
      ...unit.params,
      shelf_schema: SHELF_SCHEMA,
      ...(sections.length ? { sections } : {}),
    },
  };
}

// ─── FRONT-STYLE SCHEMA (turn 30, CLAUDE.md F10) ───────────────────────────
//
// Owner: choosing "flat" in the main menu must set the PROJECT default front
// style, and every front without its own override must follow. It did not, and
// the reason was not the cascade — `engine/design.js resolveUnitDesign` has had
// it right since turn 13 — it was that NO UNIT COULD SAY "I have no override".
//
// `defaultParamsFor` stamps `front_type: profile.front.defaultType` on every
// cabinet at birth. That value is the fixture contract for a bare
// `computeCabinet()` and must not move. But inside a PROJECT it made every
// cabinet look like it had chosen Shaker on purpose, so the project's own
// answer could never reach one, and a job set to Flat was still CUT as Shaker.
//
// So: a stored value EQUAL TO THE PROFILE'S DEFAULT is a STAMP, not a choice —
// until tonight there was no way to express the difference — and it is read as
// "nobody has said". A value that differs is a genuine override and is left
// exactly alone. A migration with a stamp, the same shape SHELF_SCHEMA above
// has, so it happens once and says so.
//
// THE COST, NAMED: a workshop that had deliberately set Shaker on ONE cabinet
// of a Flat job loses that one exception, and gets it back with one press of
// the unit's own Front type select — which from tonight also offers "Project
// default" and can therefore express the other half of the question.
const FRONT_STYLE_SCHEMA = 1;

export function migrateUnitFrontStyle(unit, profile = null) {
  if (!unit?.params || unit.params.front_style_schema === FRONT_STYLE_SCHEMA) return unit;
  const stamp = (profile || getCabinetProfile())?.front?.defaultType;
  const own = unit.params.front_type;
  return {
    ...unit,
    params: {
      ...unit.params,
      front_style_schema: FRONT_STYLE_SCHEMA,
      front_type: own === stamp ? null : own,
    },
  };
}

/**
 * ─── TURN 31 (CLAUDE.md F10): AN OLD TYPE NAME NEVER BREAKS A SAVE ─────────
 *
 * "on project load, `CORNER` reads as `L_SHAPE` (one-line alias kept forever);
 * never break an existing save."
 *
 * The unit's stored `type` is rewritten on the way in, so everything
 * downstream — the engine, the panel, the BOM, the CNC tree — sees one name.
 * The TABLE is `engine/types.js TYPE_ALIASES` and it is kept forever: a
 * migration runs once on a project somebody opens, and a file that has sat in a
 * drawer for two years has never been migrated at all.
 */
function migrateUnitType(unit) {
  const resolved = resolveTypeId(unit?.type);
  if (!unit || resolved === unit.type) return unit;
  return { ...unit, type: resolved, params: { ...unit.params, type: resolved } };
}

const migrateUnits = (units) => (Array.isArray(units)
  ? units.map((u) => migrateUnitFrontStyle(migrateUnitShelves(migrateUnitType(u))))
  : []);

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.project || !Array.isArray(parsed.units)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * ─── TURN 39 (CLAUDE.md F2): THE PROJECT'S OWN ASSIGNED MATERIALS ───────────
 *
 * The owner: *"każdy jeden projekt powinien mieć Assign materials"*. So the
 * blob hangs on the PROJECT — `project.assignments` — which puts it on the
 * local shelf and in the cache for free, and the cloud row (sql/006_tura39.sql)
 * is asked for on top of that.
 *
 * Never awaited and never able to throw: a project must open whether or not the
 * migration has been run (iron rule 6).
 */
function openAssignmentsFor(project) {
  try {
    const store = useMaterialAssignmentStore.getState();
    const defaults = getCabinetProfile()?.materials?.defaults || null;
    store.setProject(project?.id || null, { blob: project?.assignments || null, defaults });
    Promise.resolve(store.openProject(project?.id || null, {
      blob: project?.assignments || null, defaults,
    })).catch(() => { /* the local blob is the blob */ });
  } catch { /* a store that is not ready must never stop a project opening */ }
}

// Throttled: a shelf drag updates the store on every pointer frame, and
// serialising the whole project 60 times a second is pure jank.
let cacheTimer = null;
let cachePending = null;
function saveCache(state) {
  cachePending = { project: state.project, units: state.units };
  if (cacheTimer) return;
  cacheTimer = setTimeout(() => {
    cacheTimer = null;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachePending));
    } catch { /* quota or private mode — the DB is the real home anyway */ }
  }, 250);
}

const cached = typeof localStorage !== 'undefined' ? loadCache() : null;


export const useProjectStore = create(dirtyGate((set, get) => ({
  // A cached project may predate room v2 — migrate on the way in, so an old
  // tab that reloads gets four walls instead of a crash.
  project: cached?.project
    ? {
      ...cached.project,
      room: migrateRoom(cached.project.room),
      design: migrateDesign(cached.project.design),
      wallSlopes: wallElements(cached.project.wallSlopes),
      ledSpec: migrateLedSpec(cached.project.ledSpec),
    }
    : {
      id: null, name: 'Untitled project', number: '', client: '',
      room: DEFAULT_ROOM, design: migrateDesign(null),
      // Turn 44 (CLAUDE.md F1): the wall elevation's slopes, beside the room
      // rather than inside it — `setWallSlopes` says why.
      wallSlopes: [],
      // T45 F9b: a new job's LED spec — flexi, 4 mm, no W/m typed yet.
      ledSpec: migrateLedSpec(null),
      jc_tenant_id: null, jc_project_id: null,
    },
  units: migrateUnits(cached?.units),
  dirty: false,

  // ── project / room ───────────────────────────────────────────────────────
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),

  /**
   * The two things the new-project flow asks for that are not the name (turn 7,
   * BACKLOG #41). The NUMBER is what a workshop calls the job — it goes on the
   * card, on the booklet cover and in the next auto-proposal — and the CLIENT
   * is free text until the JoineryCore client list arrives.
   */
  setProjectInfo: (patch) => set((s) => ({
    project: {
      ...s.project,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.number !== undefined ? { number: String(patch.number ?? '') } : {}),
      ...(patch.client !== undefined ? { client: String(patch.client ?? '') } : {}),
    },
  })),

  /**
   * Change the room. REFUSED when the new shape would leave a unit hanging off
   * a wall or under a lowered ceiling: shrinking the room is the one path that
   * can create an overlap with nobody dragging anything, so it is blocked at
   * the setter rather than repaired afterwards (CLAUDE.md phase 3).
   *
   * @returns {{ok:boolean, message:string|null, blocking:Array}}
   */
  setRoom: (patch) => {
    const s = get();
    const next = migrateRoom({ ...s.project.room, ...patch });
    const verdict = roomChangeGuard(next, s.units);
    if (!verdict.ok) return verdict;
    set((st) => ({ project: { ...st.project, room: next } }));
    // A lower ceiling shortens every top infill; a longer wall opens a gap.
    get().refreshAutoParts();
    return verdict;
  },

  /** What a room change WOULD do, without doing it (live preview in the modal). */
  previewRoom: (patch) => {
    const s = get();
    return roomChangeGuard(migrateRoom({ ...s.project.room, ...patch }), s.units);
  },

  addOpening: (opening) => set((s) => ({
    project: {
      ...s.project,
      room: { ...s.project.room, openings: [...(s.project.room.openings || []), { id: uid('op'), ...opening }] },
    },
  })),

  updateOpening: (id, patch) => set((s) => ({
    project: {
      ...s.project,
      room: {
        ...s.project.room,
        openings: (s.project.room.openings || []).map((o) => (o.id === id ? { ...o, ...patch } : o)),
      },
    },
  })),

  removeOpening: (id) => set((s) => ({
    project: {
      ...s.project,
      room: { ...s.project.room, openings: (s.project.room.openings || []).filter((o) => o.id !== id) },
    },
  })),

  // ─── TURN 44 (CLAUDE.md F1): THE SLOPE ──────────────────────────────────
  //
  // *"Add door · Add window · Add slope … Store them on the wall model the
  // Room path already uses — ONE wall schema, no twin."*
  //
  // Doors and windows ARE that model: they are `room.openings`, written by the
  // three setters directly above this one, and F1's elevation editor moves
  // exactly those records. A slope is the one element the room has never
  // carried — and iron rule 2 closes `src/engine/**` byte-for-byte tonight, so
  // `migrateRoom`, which is an exhaustive whitelist, would silently drop a
  // `room.slopes` key on the way through.
  //
  // So it rides the PROJECT, keyed by the SAME wall index the openings use.
  // That is not a twin wall model: there is one wall, one index and one editor,
  // and `lib/wallElements.js` is the only module that knows the two lists are
  // stored apart. The day the engine reopens, `wallSlopes` moves into the room
  // beside `boxes` and nothing above this line changes.
  // ─── TURN 45 (CLAUDE.md F1b): …AND THE LIST TAKES TWO MORE KINDS ─────────
  //
  // *"two NEW draggable elements — `Recess` and `Chimney` … Stored on the same
  // wall model."* So this list is the WALL MODEL now, and `wallElements()`
  // normalises all three kinds. The KEY keeps T44's name: a schema rename would
  // strand every project saved between the two turns for the sake of a word,
  // and the note above already says where the list is going when the engine
  // reopens. The four setters below are named for what they take.
  setWallSlopes: (list) => set((s) => ({
    project: { ...s.project, wallSlopes: wallElements(list) },
  })),

  addWallSlope: (slope) => set((s) => {
    const next = migrateWallElement({ id: uid(slope?.kind || 'slope'), ...slope });
    if (!next) return {};
    return { project: { ...s.project, wallSlopes: [...wallElements(s.project.wallSlopes), next] } };
  }),

  updateWallSlope: (id, patch) => set((s) => ({
    project: {
      ...s.project,
      wallSlopes: wallElements(s.project.wallSlopes)
        .map((v) => (v.id === id ? migrateWallElement({ ...v, ...patch, id: v.id }) : v))
        .filter(Boolean),
    },
  })),

  removeWallSlope: (id) => set((s) => ({
    project: { ...s.project, wallSlopes: wallElements(s.project.wallSlopes).filter((v) => v.id !== id) },
  })),

  // ─── TURN 45 (CLAUDE.md F9b/F9c): THE JOB'S LED SPEC ─────────────────────
  // A PATCH setter, like every other on this store: the tab writes one field at
  // a time and the normaliser answers for the rest.
  setLedSpec: (patch) => set((s) => ({
    project: { ...s.project, ledSpec: migrateLedSpec({ ...migrateLedSpec(s.project.ledSpec), ...patch }) },
  })),

  loadProject: (project, units) => {
    // ─── TURN 34 (CLAUDE.md F7): THE SHAKER FRAME A SAVED JOB WAS CUT TO ────
    // "zmienimy default z 70 na 60" — for NEW projects. A job already on the
    // bench was quoted and cut at 70, so opening it pins 70 onto it explicitly
    // rather than letting a changed default redraw every door by 10 mm. Only
    // where there IS a shaker and the project has never stated a width of its
    // own; the decision is `engine/shaker.js legacyShakerFrame`'s.
    const migrated = migrateDesign(project?.design);
    // Only a job that EXISTS is protected: one with an id, or one that already
    // has cabinets in it. A blank scene has nothing cut, so there is nothing a
    // changed default could redraw — and pinning 70 onto it would be the
    // opposite of what the owner asked for.
    const isSavedJob = Boolean(project?.id) || (Array.isArray(units) && units.length > 0);
    const pin = isSavedJob ? legacyShakerFrame(migrated, getCabinetProfile()) : null;
    set({
      project: {
        ...project,
        room: migrateRoom(project?.room),
        design: pin ? { ...migrated, ...pin } : migrated,
        // Turn 44 (CLAUDE.md F1): a saved job's slopes, normalised on the way
        // in exactly as its room and its design are. A project saved before
        // tonight has none and opens on a straight wall.
        wallSlopes: wallElements(project?.wallSlopes),
        // …and its LED spec, normalised on the way in like everything else.
        ledSpec: migrateLedSpec(project?.ledSpec),
      },
      units: migrateUnits(units),
      dirty: false,
    });
    // ─── TURN 39 (CLAUDE.md F2): AND ITS OWN ASSIGNED MATERIALS ─────────────
    // They ride `project.assignments`, so the local shelf carries them with the
    // job for free; the cloud row is asked for as well and wins when it answers.
    openAssignmentsFor(project);
    // ─── TURN 33 (CLAUDE.md F5): A LOADED SCENE IS HEALED TOO ───────────────
    // The consumer sweep's biggest miss: every other path that shapes a front
    // reaches healFrontGaps, but a project OPENED with yesterday's 1.5/1.5
    // beside a panel kept it until the first touch — the likeliest source of
    // the owner's standing fault. The matrix is APPLIED, not offered (T32
    // F3's law), and each correction says so in its grey note. A healed-open
    // project is honestly DIRTY: it changed, and the note names how.
    get().healFrontGaps();
  },

  /**
   * A blank project (turn 4: the start screen's New project).
   *
   * Deliberately a RESET, not a patch: an empty room, no units, no design
   * carried over. "New" that inherits the last project's walls is how somebody
   * quotes a kitchen against the wrong room.
   */
  newProject: (name = 'Untitled project', {
    number = '', client = '', room = null, design = null, company = undefined,
  } = {}) => set({
    project: {
      id: null,
      name: name || 'Untitled project',
      number: String(number || ''),
      client: String(client || ''),
      room: room ? migrateRoom(room) : DEFAULT_ROOM,
      // ─── Turn 22 (CLAUDE.md F2b.3): PREFILLED FROM THE COMPANY ROW ───────
      //
      // "New-project flow PREFILLS from the row; project settings stay the
      // place deviations live." So the workshop's answers are written INTO the
      // project's own fields here, at creation — which is what makes them
      // editable in Settings afterwards, and what stops a later change to the
      // company row re-cutting a finished job.
      //
      // With no row (mock mode, no session, a workshop that has never opened
      // the screen) `prefillDesignFromCompany` returns the design it was given,
      // untouched — so a project made today is byte-for-byte the project turn
      // 21 made.
      design: migrateDesign(prefillDesignFromCompany(design, company, getCabinetProfile())),
      // A new job starts on a straight wall; F1's elevation is where a slope
      // is added, and it is the project's, not the last project's.
      wallSlopes: [],
      ledSpec: migrateLedSpec(null),
      jc_tenant_id: null,
      jc_project_id: null,
    },
    units: [],
    dirty: false,
  }),

  // ── design settings (project level, CLAUDE.md phase 6) ───────────────────
  // Materials, the standard front, the workshop's own door styles, the front
  // colour and the infill width. Stored WITH the project, so opening a project
  // opens the way it is built, not the way the last one was.
  setDesign: (patch) => {
    set((s) => ({
      // The stored design is migrated FIRST and the patch lands on the result.
      // It is already migrated in practice (loadProject and newProject both do
      // it), and this is still not belt-and-braces: since turn 9 the design
      // carries a ONE-WAY migration — a sheen on the old 0–25 scale is
      // multiplied by four — and a patch merged onto an unmigrated base would
      // hand a freshly typed 25 to that rule and store 100 (CLAUDE.md F5).
      project: { ...s.project, design: applyDesignPatch(s.project.design, patch) },
    }));
    // The infill width lives in Design Settings, so changing it re-cuts the
    // fillers everywhere.
    get().refreshAutoParts();
  },

  // ─── TURN 33 (CLAUDE.md F1): THE LIGHT'S OWN SETTERS ──────────────────────
  //
  // Everything goes through `setDesign`, so the light is stored, migrated and
  // undoable exactly like every other project setting. An ITEM is a placed
  // run — { unitId, kind, ref, depth_mm, count } — and its id is minted here,
  // where every other id in this store is. LIGHTING DRILLS NOTHING: none of
  // these reach a hole, a panel or a fixture.
  setLighting: (patch) => {
    const lighting = migrateDesign(get().project.design).lighting;
    get().setDesign({ lighting: { ...lighting, ...patch } });
  },
  addLightingItem: (item) => {
    const id = uid('led');
    const lighting = migrateDesign(get().project.design).lighting;
    get().setDesign({ lighting: { ...lighting, items: [...lighting.items, { ...item, id }] } });
    return id;
  },
  updateLightingItem: (id, patch) => {
    const lighting = migrateDesign(get().project.design).lighting;
    get().setDesign({
      lighting: {
        ...lighting,
        items: lighting.items.map((it) => (it.id === id ? { ...it, ...patch, id } : it)),
      },
    });
  },
  /**
   * ─── TURN 36 (CLAUDE.md F2): THE SAME PATCH ON A SET OF STRIPS ────────────
   *
   * "LED strips: inset and depth to all selected." One `setDesign`, so it is
   * ONE undo step and one recompute — the panel's master control used to loop
   * `updateLightingItem`, which wrote the design once per strip and gave a
   * twelve-strip job twelve undo steps.
   */
  updateLightingItemsBulk: (ids, patch) => {
    const want = new Set((ids || []).filter(Boolean));
    if (!want.size || !patch) return 0;
    const lighting = migrateDesign(get().project.design).lighting;
    let touched = 0;
    const items = lighting.items.map((it) => {
      if (!want.has(it.id)) return it;
      touched += 1;
      return { ...it, ...patch, id: it.id };
    });
    if (!touched) return 0;
    get().setDesign({ lighting: { ...lighting, items } });
    return touched;
  },

  removeLightingItem: (id) => {
    const lighting = migrateDesign(get().project.design).lighting;
    get().setDesign({ lighting: { ...lighting, items: lighting.items.filter((it) => it.id !== id) } });
  },

  /**
   * ─── Step 5's own setters (turn 11, CLAUDE.md F9) ───
   *
   * The project's default DEPTH, its board thickness and its hardware variants.
   * Each goes through `setDesign`, so they are stored, migrated and re-derived
   * exactly like every other project setting — and changing one AFTER units have
   * been placed is deliberately NOT a retro-fit: those cabinets were cut to what
   * was asked for at the time, and the panel is where one is changed.
   */
  setProjectDefaults: (patch) => {
    const design = migrateDesign(get().project.design);
    const next = {};
    if (patch.depth !== undefined) {
      const v = Number(patch.depth);
      next.depth = Number.isFinite(v) && v > 0 ? snapTo(v, getCabinetProfile().editor.mmStep) : null;
    }
    if (patch.thickness !== undefined) next.thickness = { ...design.thickness, ...patch.thickness };
    if (patch.hardware !== undefined) next.hardware = { ...design.hardware, ...patch.hardware };
    if (patch.fronts !== undefined) next.fronts = { ...design.fronts, ...patch.fronts };
    if (!Object.keys(next).length) return null;
    get().setDesign(next);
    return migrateDesign(get().project.design);
  },

  /**
   * ─── TURN 24 (CLAUDE.md F3.1): WHAT THE CALIPER SAID ──────────────────────
   *
   * One slot's MEASURED thickness and its confirmation tick. Two fields, one
   * setter, because they are one act: somebody put a caliper on a board and
   * wrote the number down.
   *
   * It goes through `setDesign` like every other project setting, so it is
   * stored, migrated and undoable — and it is deliberately NOT a retro-fit of
   * the cabinets already on the floor. The turn-16 identity GATE is what asks
   * about those (F3.4): the surface warns, and a full recompute happens only
   * when the owner says so.
   *
   * @returns {object} the migrated design
   */
  setSlotThickness: (slotId, { measured, confirmed } = {}) => {
    const design = migrateDesign(get().project.design);
    if (!slotById(slotId)) return design;
    const before = design.thickness.slots?.[slotId] || {};
    const row = {
      measured: measured === undefined
        ? (before.measured ?? null)
        : (Number(measured) > 0 ? Number(measured) : null),
      confirmed: confirmed === undefined ? (before.confirmed === true) : confirmed === true,
    };
    get().setDesign({
      thickness: { ...design.thickness, slots: { ...design.thickness.slots, [slotId]: row } },
    });
    return migrateDesign(get().project.design);
  },

  /**
   * Is this project allowed to grow a drawer yet? (F3.1)
   *
   * The gate is enforced in `addUnit`, `addItem` and `addDrawers`; this is the
   * same answer for a SURFACE, so a button can be disabled with the reason on
   * it rather than a click being swallowed.
   */
  drawerBoxGate: () => drawerBoxGate(get().project.design),

  /**
   * Which CARCASS board one partition is cut from (turn 24, CLAUDE.md F3.3).
   *
   * Owner: "grubość przegrody się nie zmienia." It is the ITEM's own field,
   * exactly like its setback and its thickness — one piece, one answer — and
   * an unrecognised slot falls back to carcass 1, which is what every
   * partition saved before this turn is.
   */
  setPartitionSlot: (unitId, itemId, slotId) => {
    const slot = CARCASS_SLOTS.includes(String(slotId)) ? String(slotId) : CARCASS_SLOTS[0];
    get().updateItem(unitId, itemId, { slot });
    return slot;
  },

  /**
   * WHICH FACE OF ONE DIVIDER IS BORED (turn 30, CLAUDE.md F3).
   *
   * The owner: a partition shows shelf-pin drilling on BOTH faces, and a
   * machine drills one. It is the ITEM's own field, exactly like its slot and
   * its setback above — one piece, one answer — and `null` hands the divider
   * back to `profile.shelfHoles.partitionFace`, which ships LEFT tonight.
   *
   * Nothing here invalidates a fixture: the DRILLING moves, so the recompute
   * is the ordinary one every item edit takes, and the 3-D and the DXF follow
   * because both read `result.drills`.
   */
  setPartitionDrillFace: (unitId, itemId, face) => {
    const said = String(face || '').toUpperCase();
    const value = said === 'L' || said === 'R' ? said : null;
    get().updateItem(unitId, itemId, { drill_face: value });
    return value;
  },

  /** How many FRONT types this project runs (1–2, CLAUDE.md F9.2). */
  setFrontTypes: (count) => set((s) => {
    const design = migrateDesign(s.project.design);
    const profile = getCabinetProfile();
    return {
      project: {
        ...s.project,
        design: migrateDesign({
          ...design,
          fronts: { ...design.fronts, types: setFrontTypeCount(design.fronts.types, count, profile) },
        }),
      },
    };
  }),

  /**
   * One front type's source, colour or assigned stock.
   *
   * ─── Turn 12 (CLAUDE.md F1) ───
   * A COLOUR goes through `withFrontColour`, which is the one setter for it:
   * turn 11 wrote it here and only here, into a field nothing in the app reads,
   * which is why the scene ignored the new settings menu. Everything else in
   * the patch is a plain merge, as before.
   */
  setFrontType: (typeId, patch) => set((s) => {
    const design = migrateDesign(s.project.design);
    const profile = getCabinetProfile();
    const { colour, ...rest } = patch || {};
    // ─── Turn 15 (CLAUDE.md F3) ───
    // Changing the SOURCE changes which question the front answers. A source
    // that faces the board (laminate, veneer) cannot use a sprayed colour, and
    // Spray cannot use a facing — so the answer the new source cannot use is
    // dropped rather than left behind to win an argument later. Which is which
    // is read off the source's own record (`pickerForSource`), so a source
    // added to the profile tomorrow behaves without a line changing here.
    const changingSource = rest.source !== undefined;
    const nextSource = changingSource
      ? sourceById(frontSources(profile), rest.source)
      : null;
    const drop = changingSource
      ? (sourceTakesFacing(nextSource) ? { colour: null } : { finish_id: null })
      : {};
    // A FACING chosen un-paints the front, the mirror of `withFrontColour`.
    const unpaint = rest.finish_id ? { colour: null } : {};
    const types = setFrontTypeCount(design.fronts.types, design.fronts.types.length || 1, profile)
      .map((t) => (t.id === typeId ? {
        ...t, ...rest, ...drop, ...unpaint,
      } : t));
    const merged = migrateDesign({ ...design, fronts: { ...design.fronts, types } });
    return {
      project: {
        ...s.project,
        design: colour === undefined ? merged : withFrontColour(merged, colour, typeId),
      },
    };
  }),

  /**
   * The project's FRONT COLOUR (turn 12, CLAUDE.md F1).
   *
   * The one door every colour control in the app goes through — the settings
   * surface's front-type picker and its sprayed-finish picker are the same
   * question asked twice, and before this they wrote to different fields.
   */
  setFrontColour: (colour, typeId = null) => {
    set((s) => ({
      project: { ...s.project, design: withFrontColour(s.project.design, colour, typeId) },
    }));
    return migrateDesign(get().project.design);
  },

  /**
   * A carcass type's SOURCE — EGGER decor, sprayed, or (turn 15, F3.3) veneer.
   *
   * A facing the new source cannot mean is dropped, exactly as it is for the
   * fronts: an EGGER decor id left behind under a Veneer button would render a
   * "veneered" carcass in a laminate.
   */
  setCarcassSource: (typeId, source) => set((s) => {
    const design = migrateDesign(s.project.design);
    const src = sourceById(carcassSources(getCabinetProfile()), source);
    return {
      project: {
        ...s.project,
        design: {
          ...design,
          carcass: {
            types: design.carcass.types.map((t) => (t.id === typeId
              ? {
                ...t,
                source: source || null,
                finish_id: facingMatchesSource(t.finish_id, src) ? t.finish_id : null,
              }
              : t)),
          },
        },
      },
    };
  }),

  setCarcassTypes: (count) => set((s) => ({
    project: { ...s.project, design: setCarcassTypeCount(migrateDesign(s.project.design), count) },
  })),

  setCarcassMaterial: (typeId, materialId) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: {
          ...design,
          carcass: {
            types: design.carcass.types.map((t) => (t.id === typeId ? { ...t, material_id: materialId || null } : t)),
          },
        },
      },
    };
  }),

  /**
   * ─── A FRONT type's board (turn 16, CLAUDE.md F1.1) ───────────────────────
   *
   * "Each front type gains the same MaterialStock dropdown a carcass type has —
   * same store, same Generic fallback, same T15-B hard gates."
   *
   * Same setter shape as `setCarcassMaterial` above, deliberately: a front type
   * and a carcass type are the same kind of thing in this app — a slot with a
   * look and a board — and the two paths being one line apart is what keeps
   * them from drifting. The GATE (a thickness change with units on the floor
   * asks first) lives in the settings surface, where the question can be put to
   * a human, exactly as the carcass's does.
   */
  setFrontMaterial: (typeId, materialId) => get().setFrontType(typeId, { material_id: materialId || null }),

  /**
   * ─── A RUN PIECE's board (turn 16, CLAUDE.md F1.2) ────────────────────────
   *
   * Infills, plinths, end panels and masking panels: "Same as fronts" on by
   * default, or a board of their own. ONE setter for all four — the same store
   * shape F1.2 asks for — going through `withRunMaterial`, which is where the
   * rule that unticking the box keeps your board lives.
   *
   * @param {string} role  'infill' | 'plinth' | 'end_panel' | 'mask'
   */
  setRunMaterial: (role, patch) => {
    set((s) => ({
      project: { ...s.project, design: withRunMaterial(s.project.design, role, patch) },
    }));
    return migrateDesign(get().project.design);
  },

  /** What a carcass material LOOKS like (turn 4): its decor, per material type. */
  setCarcassFinish: (typeId, finishId) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: {
          ...design,
          carcass: {
            types: design.carcass.types.map((t) => (t.id === typeId ? { ...t, finish_id: finishId || null } : t)),
          },
        },
      },
    };
  }),

  addDoorStyle: (style) => {
    const id = style?.id || uid('ds');
    set((s) => {
      const design = migrateDesign(s.project.design);
      const next = normaliseDoorStyle({ ...style, id });
      if (!next) return {};
      return {
        project: { ...s.project, design: { ...design, doorStyles: [...design.doorStyles, next] } },
      };
    });
    return id;
  },

  updateDoorStyle: (id, patch) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: {
          ...design,
          doorStyles: design.doorStyles.map((st) => (st.id === id ? normaliseDoorStyle({ ...st, ...patch, id }) : st)),
        },
      },
    };
  }),

  removeDoorStyle: (id) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: { ...s.project, design: { ...design, doorStyles: design.doorStyles.filter((st) => st.id !== id) } },
      // A unit pointing at a style that no longer exists falls back to the
      // project default rather than rendering nothing.
      units: s.units.map((u) => (u.params.door_style_id === id
        ? { ...u, params: { ...u.params, door_style_id: null } }
        : u)),
    };
  }),

  // ── construction automatics (CLAUDE.md phase 7) ──────────────────────────
  /**
   * Re-derive the automatic parts for one unit (or all of them) from the room
   * around it: the plinth underneath, the scribe fillers where it meets a
   * wall, and the top infill up to the ceiling.
   *
   * Called wherever the geometry it depends on changes — placing, moving,
   * resizing, turning, editing the room or the infill setting — so the extra
   * pieces in the cut list are never stale.
   *
   * @returns {string[]} notices worth telling the user about
   */
  refreshAutoParts: (unitId = null) => {
    const s = get();
    const profile = getCabinetProfile();
    const walls = roomWalls(s.project.room);
    const design = migrateDesign(s.project.design);
    const roomHeight = Number(s.project.room.height) || 0;
    const notices = [];

    const next = s.units.map((u) => {
      if (unitId && u.id !== unitId) return u;
      const wall = walls[u.position?.wall ?? 0] || walls[0];
      // The AUTO-PARTS neighbours, which is a different question from "what is
      // in the way" (F7 above): these are the units this one shares a RUN with —
      // a plinth, a filler, a top infill. Two cabinets share a run when they
      // stand at the same level, side by side, which is exactly what the
      // mounting level says. A wall unit does not share a plinth with the tall
      // cabinet it hangs beside, however much height they have in common.
      const level = getUnitType(u.type).mount;
      const others = s.units
        .filter((o) => o.id !== u.id && (o.position?.wall ?? 0) === (u.position?.wall ?? 0)
          && getUnitType(o.type).mount === level)
        .map(unitSpan);
      const parts = autoPartsFor({
        unit: u, wallWidth: wall?.width ?? 0, others, roomHeight, design,
      }, profile);
      notices.push(...parts.notices);
      return {
        ...u,
        params: {
          ...u.params,
          plinth: parts.plinth,
          top_infill_mm: parts.top_infill_mm,
          side_infill_left_mm: parts.side_infill_left_mm,
          side_infill_right_mm: parts.side_infill_right_mm,
        },
      };
    });

    // The RUN is decided last and always across ALL units, whatever one unit
    // was asked about (turn 6, CLAUDE.md F4). The top infill is one piece for a
    // whole run: moving one cabinet changes the length of the piece over its
    // neighbours' heads, and a per-unit refresh that skipped them would leave
    // the run's own element describing a run that no longer exists.
    const runParams = runInfillParams(next, {
      walls,
      roomHeight,
      // How far a RETURN at an open end has to run to reach the wall: from the
      // plane of the doors to the wall itself, which since turn 8 (F3) includes
      // the 10 mm every unit stands off it. A return that stops at the carcass
      // back stops 10 mm short of the wall, which is a gap you can see along
      // the whole side of a run.
      frontFaceDepthOf: (u) => wallClearance(profile)
        + (Number(u.params?.depth) || 0)
        + profile.doors.gap
        + (Number(u.params?.front_t) || profile.front.thickness),
    }, profile);

    // ─── …and the PLINTH, the same way (turn 12, CLAUDE.md F8) ───
    // One toe kick across the run, not one per carcass. Same shape of answer as
    // the top infill above, computed after `plinth` has been resolved on every
    // unit — a segment is a stretch of ADJACENT PLINTHED units, so it cannot be
    // worked out until the store knows which of them have a plinth at all.
    const plinthParams = runPlinthParams(next, profile);
    // ─── …and the MASKING PANEL, the same way (turn 14, CLAUDE.md F5) ───
    // One board under a run of wall units, its segments decided by the same
    // adjacency the plinth's are: docking a cabinet extends it, an end panel or
    // a gap ends it.
    const maskParams = runMaskParams(next, profile);
    // ─── …and the CORNICE, the same way again (turn 22, CLAUDE.md F1.3) ─────
    // One moulding across horizontally adjacent cornice-bearing units. It is
    // computed after the top infill because the piece it is FIXED TO is the
    // infill, and its ends are decided by what stands up past the CORNICE
    // rather than by what stands up to the ceiling — engine/cornice.js asks
    // `runEnd` that narrower question with the same four answers.
    const corniceParams = runCorniceParams(buildRuns(next, profile), {
      units: next,
      walls,
      roomHeight,
      frontFaceDepthOf: (u) => wallClearance(profile)
        + (Number(u.params?.depth) || 0)
        + profile.doors.gap
        + (Number(u.params?.front_t) || profile.front.thickness),
      infillHeightOf: (u) => Number(u.params?.top_infill_mm) || 0,
    }, profile);

    // ─── Ceiling honesty (CLAUDE.md F1.5) ───
    // "a 2400 wardrobe under a 2400 ceiling WARNS instead of clipping". A
    // warning and not a clamp: clamping would re-cut a cabinet nobody asked to
    // re-cut, and what the joiner needs is to be told the moulding he has just
    // specified finishes above his ceiling.
    for (const u of next) {
      const notice = corniceCeilingNotice({
        unitTop: unitTop(u, profile),
        infillHeight: Number(u.params?.top_infill_mm) || 0,
        height: takesCornice(u.type) ? u.params?.cornice : 0,
        roomHeight,
        label: u.params?.unit_num || null,
      }, profile);
      if (notice) notices.push(notice);
    }

    // ─── TURN 26 (CLAUDE.md F9.4): THE CORNERS IT HAS DECLINED TO CUT ────────
    //
    // A refusal is not a warning about the FURNITURE — nothing is cut wrong. It
    // is the app saying which joint it will not draw and why: a 45° between two
    // different projections does not close, and whether the moulding steps or
    // carries the deeper line and returns is a workshop decision nobody has
    // made (BLOCKERS #92). Ship the mitre for equal depths, refuse out loud for
    // unequal ones — and "out loud" is this line.
    for (const element of corniceParams.values()) {
      for (const refusal of corniceRefusals(element)) notices.push(refusal.message);
    }

    set({
      units: next.map((u) => {
        const run = runParams.get(u.id) ?? null;
        const plinthRun = plinthParams.get(u.id) ?? null;
        const maskRun = maskParams.get(u.id) ?? null;
        const corniceRun = corniceParams.get(u.id) ?? null;
        // Reference equality matters here: this runs on every drag frame, and
        // writing a fresh object each time would re-render every unit in the
        // scene for a run nobody touched.
        if (sameRun(u.params.run_top_infill, run)
          && sameRun(u.params.run_plinth, plinthRun)
          && sameRun(u.params.run_mask, maskRun)
          && sameRun(u.params.run_cornice, corniceRun)) return u;
        return {
          ...u,
          params: {
            ...u.params,
            run_top_infill: run,
            run_plinth: plinthRun,
            run_mask: maskRun,
            run_cornice: corniceRun,
          },
        };
      }),
    });

    // ─── TURN 32 (CLAUDE.md F3): THE GAPS FIX THEMSELVES ─────────────────────
    // This is the one choke point every unit-creation, neighbour change,
    // resize and move already funnels through, so it is where the matrix is
    // APPLIED rather than offered. The pass converges — a healed edge
    // measures a correction of 0 next time — so a drag settles instead of
    // oscillating, and the notes it returns are GREY: the one sanctioned
    // auto-fix still says what it did.
    get().healFrontGaps();

    return notices;
  },

  /**
   * ─── TURN 32 (CLAUDE.md F3): SELF-HEALING FRONT GAPS ──────────────────────
   *
   * Owner's verdict on T31's modal: "why bother the client — gaps should fix
   * themselves." The T31 matrix stays law (the numbers, the asymmetry law,
   * the 21.5 cups riding the edge — all exactly as built); what changes is
   * the MODE: the plan the modal used to offer is computed and APPLIED here,
   * through the same `front_edge_trim` override channel, edge by edge.
   *
   * Every correction announces itself as a GREY note ("front 02-F −1.5 mm at
   * an end panel") — never a question. The RED modal survives only where the
   * plan has no move: a parked corner, an appliance's own face, a front at
   * its minimum — those are Check's job (#2/#11, unchanged).
   */
  healFrontGaps: () => {
    const rows = get().frontClearances();
    const plan = healingPlan(rows, {
      trimOf: (unitId, panelId) => get().units
        .find((u) => u.id === unitId)?.params?.front_edge_trim?.[panelId] || null,
    });
    if (plan.patches.length) {
      const byPanel = new Map();
      for (const p of plan.patches) {
        const key = `${p.unitId}|${p.panelId}`;
        const entry = byPanel.get(key) || { unitId: p.unitId, panelId: p.panelId, patch: {} };
        entry.patch[p.side] = p.trim;
        byPanel.set(key, entry);
      }
      for (const entry of byPanel.values()) {
        get().setFrontEdgeTrim(entry.unitId, entry.panelId, entry.patch);
      }
      for (const note of plan.notices) useUiStore.getState().notify(note, 'info');
    }
    return plan;
  },
  /**
   * Drag the top infill up. `heightMm` is the height the pointer asks for; it
   * is clamped to what is left between the unit and the ceiling.
   */
  setTopInfill: (unitId, heightMm) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    // The gate (turn 8, CLAUDE.md F2.7). What sits on top of a base unit is a
    // worktop, so there is no gap to the ceiling for the piece to close and the
    // question is refused rather than answered with a number.
    if (!takesTopInfill(unit.type)) return 0;
    const profile = getCabinetProfile();
    const height = topInfillHeight({
      requested: snapTo(heightMm, profile.editor.mmStep),
      unitTop: unitTopOf(unit, profile),
      roomHeight: Number(s.project.room.height) || 0,
    }, profile);
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, top_infill_mm: height } } : u)),
    }));
    // Turn 6: the top infill is ONE piece for the whole RUN (engine/runs.js), so
    // asking for one over this cabinet decides the length of the piece over its
    // neighbours' heads too. Without this the run is recomputed only on the next
    // move, and a unit that has never been dragged closes itself with a 600 mm
    // offcut inside the long piece.
    get().refreshAutoParts();
    return height;
  },

  /**
   * ─── THE CORNICE (turn 22, CLAUDE.md F1) ────────────────────────────────
   *
   * `none | 70 | 100`, per unit. Three things happen and each is the thing a
   * joiner would expect:
   *
   *   • the moulding needs something to be FIXED TO, so asking for one asks
   *     for at least the profile's 40 mm of top infill — through the same
   *     `setTopInfill` the drag uses, so the ceiling still has the last word
   *     and a taller infill somebody has already dragged is left alone;
   *   • the RUN is recomputed, because the piece is one length across the
   *     adjacent cornice-bearing cabinets and switching one on decides the
   *     length over the neighbours' heads (the top infill's own lesson,
   *     turn 6);
   *   • the CEILING is checked, and says so rather than quietly clipping.
   *
   * @returns {{height:number, notices:string[]}}
   */
  setCornice: (unitId, value) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit || !takesCornice(unit.type)) return { height: 0, notices: [] };
    const profile = getCabinetProfile();
    const height = corniceOption(value, profile);
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, cornice: height } }
        : u)),
    }));
    if (height > 0) {
      const wanted = profile.autoParts.cornice.infillHeight;
      const own = Number(get().units.find((u) => u.id === unitId)?.params.top_infill_mm) || 0;
      if (own < wanted) get().setTopInfill(unitId, wanted);
    }
    const notices = get().refreshAutoParts();
    return { height, notices };
  },

  // ── the manual pieces (turn 4, BACKLOG #16/#17) ──────────────────────────
  // A plinth, a top infill and an end panel are DECISIONS, not consequences of
  // placing a unit. Each one exists from the moment it is added and not before:
  // no ghost rows in the cut list for pieces nobody ordered.

  /**
   * @returns {boolean} false when this type cannot take a plinth at all.
   *
   * ─── Turn 12 (CLAUDE.md F8) ───
   * The toe kick is a RUN element now, so switching one on decides the LENGTH
   * of the piece in front of its neighbours too — "a unit pushed against a
   * plinthed run joins it AUTOMATICALLY". `refreshAutoParts` is what works the
   * segments out, and it is called for exactly the reason `setTopInfill` above
   * calls it: without it the run is recomputed only on the next drag, and a
   * unit that has never been moved sits in front of a 600 mm offcut inside the
   * long piece.
   */
  addPlinth: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit || !takesPlinth(unit.type, getCabinetProfile())) return false;
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, plinth: true } } : u)),
    }));
    get().refreshAutoParts();
    return true;
  },

  removePlinth: (unitId) => {
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, plinth: false } } : u)),
    }));
    // Taking one out of the middle of a run splits the kick in two — the same
    // reason adding one joins them.
    get().refreshAutoParts();
  },

  /**
   * Add the top infill at the profile default, clamped to whatever the room has
   * left above the unit. Returns the height it got — 0 means the unit is already
   * at the ceiling, and the caller says so.
   */
  addTopInfill: (unitId) => {
    const profile = getCabinetProfile();
    return get().setTopInfill(unitId, profile.autoParts.topInfill.defaultHeight);
  },

  /**
   * Does this cabinet take the automatic scribe filler at all (turn 8, F7)?
   *
   * The side infill is DERIVED — it is a fact about where the unit is standing
   * (BACKLOG #15) — so this is not "add one". It is the joiner saying he will
   * scribe the DOOR instead on this cabinet, and the piece then stops being
   * cut. The unit still stops where it stops: where the wall is is not a
   * per-cabinet opinion.
   */
  setSideInfillEnabled: (unitId, enabled) => {
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, side_infill_off: !enabled } }
        : u)),
    }));
    get().refreshAutoParts();
    return Boolean(enabled);
  },

  /**
   * ─── Turn 14 (CLAUDE.md F1.2): REMOVAL MUST REMOVE ───
   *
   * The piece belongs to the RUN — one length over four cabinets, at the
   * tallest height any of them asks for — so taking it off has to be a decision
   * about the run and not about one carcass in it. Turn 6 cleared the flag on
   * the cabinet that was right-clicked and called `refreshAutoParts`, which
   * dutifully rebuilt the run from the other three and put the piece straight
   * back. On a run of one that looked like it worked; on a wall-unit run, which
   * is where the owner met it, unchecking the box did nothing at all.
   *
   * The members are asked for BEFORE anything is written: a run is defined by
   * where the cabinets stand and what height they finish at, and clearing the
   * first flag does not change either — but reading the list afterwards would
   * mean reading it out of a store that is mid-edit.
   */
  /**
   * ─── The bottom masking panel (turn 14, CLAUDE.md F5) ───
   *
   * A DECISION, like the plinth and the top infill: it exists from the moment
   * somebody adds it and not before, so no cut list carries a board nobody
   * ordered. Only a hanging cabinet has an underside to mask.
   *
   * @returns {boolean} false when this kit cannot take one at all
   */
  addBottomMask: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit || getUnitType(unit.type).mount !== 'wall') return false;
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, bottom_mask: true } } : u)),
    }));
    get().refreshAutoParts();
    return true;
  },

  /**
   * Take it off — and off the whole RUN, for the same reason the top infill's
   * removal is (F1.2): the board belongs to the run, so unticking it on one
   * cabinet of four and leaving the other three asking for it would be a menu
   * entry that does nothing.
   */
  removeBottomMask: (unitId) => {
    const ids = new Set(runMemberIds(get().units, unitId, getCabinetProfile()));
    set((s) => ({
      units: s.units.map((u) => (ids.has(u.id) ? { ...u, params: { ...u.params, bottom_mask: false } } : u)),
    }));
    get().refreshAutoParts();
    return ids.size;
  },

  removeTopInfill: (unitId) => {
    const ids = new Set(runMemberIds(get().units, unitId, getCabinetProfile()));
    set((s) => ({
      units: s.units.map((u) => (ids.has(u.id) ? { ...u, params: { ...u.params, top_infill_mm: 0 } } : u)),
    }));
    get().refreshAutoParts();
    return ids.size;
  },

  /**
   * Add an end panel to one side of a unit.
   *
   * `applyToAll` ✓ writes the settings back to the PROJECT (design.endPanel), so
   * the next end panel anywhere inherits them — which is what the checkbox in
   * the panel promises. The panel is a cut piece the moment it exists, and the
   * unit's footprint grows by its thickness, so the neighbour beside it is
   * clamped out of the space it now occupies.
   *
   * Turn 5 (BACKLOG #31): `side` may also be 'B' — BOTH sides. That is the same
   * act twice and is done as exactly that, one side after the other, so each
   * panel is refused on its own merits: on a unit with a neighbour hard against
   * its right, "both" fits the left one and says why the right one did not.
   * Anything else would be a second, quieter code path for the same piece.
   *
   * @returns {{id:string|null, ids?:string[], error:string|null}}
   */
  /**
   * ─── TURN 50 (CLAUDE.md F4): A LOW UNIT MEETING A TALL ONE GROWS ITS OWN ──
   *
   * The owner: *"w kuchni jak dodamy niską szafkę do wysokiej bez panela,
   * powinien się dodać panel automatycznie — i informacja na środku monitora:
   * system dodał panel wykończeniowy, chcesz to go usuń, naciśnij prawym
   * myszką i usuń panel."*
   *
   * WHICH junctions is `engine/endPanelAuto.js` and none of it is here. What is
   * here is the ADD, and it is the ordinary one: `addEndPanel`, the same call
   * the right-click menu makes, with the same defaults, the same collision
   * refusal and the same piece out the other end — *"a real end panel, on the
   * same board and the same rules as one added by hand — not a special case."*
   *
   * The one thing it adds is `auto_added: true` on the slot, which reaches the
   * cut piece as `meta.autoAdded` and is what lets a later turn tell the two
   * apart and the message be said ONCE per panel rather than on every redraw.
   *
   * @returns {Array<{unitId, side, panelId, message}>} what was added
   */
  growAutoEndPanels: () => runBatch(() => {
    const profile = getCabinetProfile();
    const design = () => migrateDesign(get().project.design);
    const made = [];
    // Asked of the units as they stand, then again after each add: adding a
    // panel widens a cabinet, which can close the next junction along. One
    // pass per junction found, and never more passes than there are junctions.
    let guard = 0;
    for (;;) {
      const wanted = autoEndPanelJunctions(get().units, profile);
      const next = wanted.find((j) => !made.some((m) => m.unitId === j.unitId && m.side === j.side));
      if (!next || guard > 64) break;
      guard += 1;
      let res = get().addEndPanel(next.unitId, { side: next.side, applyToAll: false });
      if (!res.id) {
        // ─── MAKING ROOM FOR IT ────────────────────────────────────────────
        //
        // A cabinet butted hard against its neighbour has 0 mm free, and the
        // panel that finishes the joint is a real board that has to go
        // SOMEWHERE — so the LOW unit slides along by the panel's thickness.
        // That is what a joiner does with the tape: the tall cabinet is what
        // the board is screwed to and is the fixed point; the run beside it
        // moves. Only the low one, and only away from the junction.
        //
        // WHY IT TAKES THREE MOVES AND NOT ONE. `editor.unitMagnet` is 40 mm,
        // so a cabinet asked to stand 25 mm off its neighbour snaps straight
        // back onto it — which is right for a hand on a drag and wrong here.
        // So the unit is first taken clear of the magnet, the panel is added by
        // the ORDINARY call (with its ordinary room check, which now passes),
        // and the unit is then brought back — where the magnet lands it exactly
        // on the new panel's outer face, which is where it belongs. The three
        // are inside one `runBatch`, so it is still one undo step.
        //
        // If it cannot move — a wall, another cabinet — the refusal stands and
        // NOTHING is said: a joint that is already tight is not a fault the
        // joiner has to act on.
        const low = get().units.find((u) => u.id === next.otherId);
        const thick = Number(design().endPanel?.thickness) > 0
          ? Number(design().endPanel.thickness)
          : (Number(low?.params?.front_t) || profile.front.thickness);
        const magnet = Number(profile.editor?.unitMagnet) || 0;
        if (low && thick > 0) {
          const home = Number(low.position?.x_mm) || 0;
          const sign = next.side === 'R' ? 1 : -1;
          get().moveUnit(low.id, home + sign * (thick + magnet * 2), 0);
          res = get().addEndPanel(next.unitId, { side: next.side, applyToAll: false });
          get().moveUnit(low.id, home + sign * thick, 0);
        }
      }
      if (!res.id) {
        made.push({ ...next, panelId: null, message: null, refused: res.error });
        continue;
      }
      set((st) => ({
        units: st.units.map((u) => (u.id === next.unitId
          ? {
            ...u,
            params: {
              ...u.params,
              end_panels: (u.params.end_panels || []).map((ep) => (ep.id === res.id
                ? { ...ep, auto_added: true }
                : ep)),
            },
          }
          : u)),
      }));
      const unit = get().units.find((u) => u.id === next.unitId);
      made.push({
        ...next,
        panelId: res.id,
        message: autoEndPanelMessage(unit?.params?.unit_num || ''),
      });
    }
    if (made.some((m) => m.panelId)) get().refreshAutoParts();
    return made;
  }),

  addEndPanel: (unitId, { side = 'L', height = null, thickness = null, applyToAll = null } = {}) => {
    if (side === 'B') {
      const results = ['L', 'R'].map((one) => get().addEndPanel(unitId, { side: one, height, thickness, applyToAll }));
      const ids = results.map((r) => r.id).filter(Boolean);
      const errors = results.map((r) => r.error).filter(Boolean);
      return {
        id: ids[0] ?? null,
        ids,
        // Both refused = the reasons, both of them. One refused = say which,
        // because the other one DID appear and a silent half-success is how a
        // unit ends up with one end panel nobody meant to leave off.
        error: ids.length && !errors.length ? null : (errors.join(' ') || null),
      };
    }

    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return { id: null, error: 'No unit selected.' };
    const design = migrateDesign(s.project.design);
    const wanted = side === 'R' ? 'R' : 'L';
    const existing = unit.params.end_panels || [];
    if (existing.some((ep) => ep.side === wanted)) {
      return { id: null, error: `This unit already has an end panel on the ${wanted === 'L' ? 'left' : 'right'}.` };
    }

    const profile = getCabinetProfile();
    const settings = {
      // ─── Turn 13 (CLAUDE.md F4) ───
      // The project's answer, unless this unit CLASS has one of its own — a
      // wall unit's panel ends with the cabinet, and "to the floor" was never a
      // decision anybody made about a hanging carcass. Written into the data,
      // so the slot says what the piece is and the parked extension (#45) has
      // somewhere to opt back in.
      height: height
        || (getUnitType(unit.type)?.mount === 'wall'
          ? endPanelHeightDefault(getUnitType(unit.type), profile)
          : design.endPanel.height),
      // "Same as the doors" is what a workshop means by a default thickness.
      thickness: Number(thickness) > 0
        ? Number(thickness)
        : (Number(design.endPanel.thickness) > 0
          ? Number(design.endPanel.thickness)
          : (unit.params.front_t || profile.front.thickness)),
    };

    // Collisions are RESPECTED, which for a piece that appears out of nowhere
    // means it is refused when it does not fit: adding it anyway would be an
    // overlap the app created itself, which is exactly what turn 3 phase 4
    // closed off. What is in the way is named, so the answer is actionable.
    const room = freeBesideUnit(s, unit, wanted);
    if (room.gap < settings.thickness) {
      return {
        id: null,
        error: `No room for a ${formatMm(settings.thickness)} mm end panel on the `
          + `${wanted === 'L' ? 'left' : 'right'} — only ${formatMm(room.gap)} mm free `
          + `before ${room.by}.`,
      };
    }

    const id = uid('ep');

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, end_panels: [...(u.params.end_panels || []), { id, side: wanted, ...settings }] } }
        : u)),
      project: applyToAll === false
        ? st.project
        : { ...st.project, design: migrateDesign({ ...design, endPanel: { ...settings, applyToAll: true } }) },
    }));
    // The unit is wider than it was; settle it legally where it stands.
    get().moveUnit(unitId, unit.position.x_mm, 0);
    return { id, error: null };
  },

  removeEndPanel: (unitId, panelId) => {
    // ─── TURN 50 (CLAUDE.md F4): REMOVING IT BY HAND IS FINAL ──────────────
    //
    // *"Removing it by hand is final for that junction: it does not come back
    // on the next redraw, or the message becomes a nag."*
    //
    // Which side it was on is remembered — on the cabinet that carried it, so
    // the record travels with the project — and `autoEndPanelJunctions` never
    // offers that junction again. It is written for ANY panel taken off, not
    // only an auto one: a joiner who removes the panel he put there himself has
    // said the same thing about the same joint.
    const going = get().units.find((u) => u.id === unitId)
      ?.params?.end_panels?.find((ep) => ep.id === panelId) || null;
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            end_panels: (u.params.end_panels || []).filter((ep) => ep.id !== panelId),
            ...(going ? { end_panel_declined: withDeclined(u, going.side) } : {}),
          },
        }
        : u)),
    }));
    get().refreshAutoParts();
  },

  updateEndPanel: (unitId, panelId, patch) => {
    set((s) => {
      const design = migrateDesign(s.project.design);
      const next = s.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            end_panels: (u.params.end_panels || []).map((ep) => (ep.id === panelId ? { ...ep, ...patch } : ep)),
          },
        }
        : u));
      const edited = next.find((u) => u.id === unitId)?.params.end_panels?.find((ep) => ep.id === panelId);
      return {
        units: next,
        // With "apply to all" ticked, editing one panel is editing the default —
        // that is what makes the next one match without being told again.
        project: design.endPanel.applyToAll && edited
          ? {
            ...s.project,
            design: migrateDesign({
              ...design,
              endPanel: { height: edited.height, thickness: edited.thickness, applyToAll: true },
            }),
          }
          : s.project,
      };
    });
    get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
  },

  /**
   * How far an end panel runs ABOVE the carcass (turn 6, CLAUDE.md F3).
   *
   * The same interaction the top infill has had since turn 3 — grab the top
   * edge and drag, or double-click it to send it to the ceiling — because it is
   * the same act: a joiner closing the gap between what he built and what the
   * builder left. Clamped between the top of the unit and the ceiling, here and
   * not in the engine: the ceiling is a property of the ROOM.
   *
   * @returns {number} the height it got
   */
  setEndPanelTop: (unitId, panelId, topMm) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    const headroom = Math.max(0, (Number(s.project.room.height) || 0) - unitTopOf(unit, profile));
    const top = Math.min(Math.max(snapTo(Number(topMm) || 0, profile.editor.mmStep), 0), headroom);
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            end_panels: (u.params.end_panels || []).map((ep) => (ep.id === panelId ? { ...ep, top_mm: top } : ep)),
          },
        }
        : u)),
    }));
    // An end panel that reaches the CEILING is one of the four things a run's
    // top infill can finish against (engine/runs.js), so moving this edge can
    // change the length of a piece three cabinets away.
    get().refreshAutoParts();
    return top;
  },

  /**
   * ─── How far a MASKING PANEL runs BELOW the carcass (turn 16, F4.3) ───────
   *
   * Owner decision B: a wall unit's DOOR height and its masking-PANEL height
   * are two independent fields, and neither writes the other. This is the
   * panel's, and it is deliberately the mirror of `setEndPanelTop` above — one
   * gesture learnt at the top edge and used again at the bottom.
   *
   * The CLAMP is the room's: a panel cannot run below the floor, so the limit
   * is exactly how high the carcass is off it — a wall unit's mounting height,
   * a standing unit's legs. `floorYOf` is the same function every other height
   * question in this store is asked against.
   *
   * Nothing here reads `door_extend`, and nothing in the door's path reads
   * this. That is the whole of "no auto-follow".
   *
   * @returns {number} the drop it got
   */
  setEndPanelBelow: (unitId, panelId, belowMm) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    const room = Math.max(0, floorYOf(unit, null, profile));
    const below = Math.min(Math.max(snapTo(Number(belowMm) || 0, profile.editor.mmStep), 0), room);
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            end_panels: (u.params.end_panels || []).map((ep) => (ep.id === panelId
              ? { ...ep, below_mm: below }
              : ep)),
          },
        }
        : u)),
    }));
    get().refreshAutoParts();
    return below;
  },

  /**
   * How far a vertical L-infill runs above the carcass (turn 6, CLAUDE.md F4).
   *
   * Same gesture as the end panel's, deliberately: a filler and a masking panel
   * finish at the same line, and a joiner who has learnt one edge has learnt
   * both. `side` is 'L' or 'R'.
   */
  setSideInfillTop: (unitId, side, topMm) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    const headroom = Math.max(0, (Number(s.project.room.height) || 0) - unitTopOf(unit, profile));
    const top = Math.min(Math.max(snapTo(Number(topMm) || 0, profile.editor.mmStep), 0), headroom);
    const key = side === 'R' ? 'side_infill_right_top_mm' : 'side_infill_left_top_mm';
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, [key]: top } } : u)),
    }));
    // A filler taken to the ceiling changes nothing about the RUN — but one
    // taken back down can. Cheap, and it keeps the two in step.
    get().refreshAutoParts();
    return top;
  },

  /**
   * ─── Pin a side infill (turn 11, CLAUDE.md F5.1) ───
   *
   * "Insets L/P" are gone — the owner's verdict is that the concept was broken,
   * and this is what replaces them. The side filler already appears and
   * disappears by itself in a unit-to-wall gap; PINNING it is the joiner saying
   * "there is a piece here", after which it never auto-vanishes and it STRETCHES
   * as the unit moves — past the workshop's scribe limit if it has to.
   *
   * It is exactly the TOP infill's strategy turned on its side, and it reuses
   * the same code path (engine/autoparts.js `sideInfill`, engine/cabinet.js's
   * INFILL-L / INFILL-R with their L section and mitre rules) rather than a
   * parallel implementation — the flag changes which gaps qualify, and nothing
   * else about the piece.
   *
   * `pinned === false` returns the side to automatic, which is the "Unpin"
   * half of the menu entry.
   */
  setSideInfillPinned: (unitId, side, pinned) => {
    const key = side === 'R' ? 'side_infill_right_pinned' : 'side_infill_left_pinned';
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, [key]: Boolean(pinned) } }
        : u)),
    }));
    get().refreshAutoParts();
    const now = get().units.find((u) => u.id === unitId);
    return Number(now?.params?.[side === 'R' ? 'side_infill_right_mm' : 'side_infill_left_mm']) || 0;
  },

  sideInfillToCeiling: (unitId, side) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    return get().setSideInfillTop(
      unitId, side,
      Math.max(0, (Number(s.project.room.height) || 0) - unitTopOf(unit, profile)),
    );
  },

  /** Double click on the edge: run it all the way to the ceiling. */
  endPanelToCeiling: (unitId, panelId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    return get().setEndPanelTop(
      unitId, panelId,
      Math.max(0, (Number(s.project.room.height) || 0) - unitTopOf(unit, profile)),
    );
  },

  /**
   * Deliberate clearances (turn 7, CLAUDE.md F5 / BACKLOG #32).
   *
   * `Inset left / right / back` in millimetres: the gap a joiner asks for
   * because something that is not furniture is in the way — a soil pipe in the
   * corner, a wall that bows, a radiator bracket. It is a DECISION, so the
   * collision clamp respects it the way it respects a neighbour: the slot the
   * unit may slide in shrinks by exactly the inset, and the first drag does not
   * close the gap the pipe is standing in.
   *
   * A back inset stands the unit off the wall — it hangs in the depth of the
   * room, and the plan, the depth clamp and the 3D view all take it from the
   * same place.
   *
   * @returns {{applied:object, notices:string[]}}
   */
  setUnitInsets: (unitId, patch) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return { applied: {}, notices: [] };
    const profile = getCabinetProfile();
    const max = profile.editor.maxInset;
    const applied = {};
    for (const [key, param] of [['left', 'inset_left_mm'], ['right', 'inset_right_mm'], ['back', 'inset_back_mm']]) {
      if (patch[key] == null) continue;
      applied[param] = Math.min(max, Math.max(0, snapTo(Number(patch[key]) || 0, profile.editor.mmStep)));
    }
    if (!Object.keys(applied).length) return { applied: {}, notices: [] };

    set((st) => ({
      // T36 F7: a main that grew or was raised takes its top box with it.
      units: settleRiders(
        st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, ...applied } } : u)),
        getCabinetProfile(),
      ),
    }));

    const notices = [];

    // The unit is now WIDER IN PLAN where it already stands, and a unit butted
    // against its neighbour is suddenly 40 mm inside it. No drag can produce
    // that state, so the position clamp deliberately refuses to resolve it (it
    // will not teleport a unit out of an overlap) — which means asking for an
    // inset and leaving it at that would record the number and open no gap.
    //
    // So the gap is MADE: the unit moves out of what it is now standing in, by
    // exactly the amount it is standing in it, through the ordinary move. It
    // goes as far as the room allows and says what stopped it.
    const settle = (side) => {
      const now = get().units.find((u) => u.id === unitId);
      if (!now) return;
      const room = freeBesideUnit(get(), now, side);
      if (room.raw >= -1e-6) return;
      const shift = side === 'L' ? -room.raw : room.raw;
      const moved = get().moveUnit(unitId, now.position.x_mm + shift, 0);
      const still = freeBesideUnit(get(), get().units.find((u) => u.id === unitId), side);
      if (still.raw < -1e-6) {
        notices.push(`Only ${formatMm(Math.max(0, shift + still.raw))} mm of the `
          + `${side === 'L' ? 'left' : 'right'} inset fits — ${room.by} is in the way.`);
      } else if (moved?.blocked) {
        notices.push(`This unit could not move clear of ${room.by}.`);
      }
    };
    settle('L');
    settle('R');

    // …and the depth clamp has its say about the back inset: asking for 200 mm
    // off a wall in a room with 30 mm to spare is a request the ROOM answers,
    // not one this setter grants.
    if (applied.inset_back_mm != null) {
      const depth = get().updateUnitParams(unitId, { depth: unit.params.depth });
      notices.push(...depth.notices);
    }
    notices.push(...get().refreshAutoParts());
    return { applied, notices };
  },

  /** The "Apply to all end panels" checkbox itself. */
  setEndPanelDefaults: (patch) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: { ...s.project, design: migrateDesign({ ...design, endPanel: { ...design.endPanel, ...patch } }) },
    };
  }),

  /** Double click: run the top infill all the way to the ceiling. */
  fillToCeiling: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    return get().setTopInfill(unitId, topInfillToCeiling({
      unitTop: unitTopOf(unit, profile),
      roomHeight: Number(s.project.room.height) || 0,
    }));
  },

  /** Point a unit at one of the project's door styles (or back at the default). */
  assignDoorStyle: (unitId, styleId) => set((s) => ({
    units: s.units.map((u) => (u.id === unitId
      ? { ...u, params: { ...u.params, door_style_id: styleId || null } }
      : u)),
  })),

  // ─── The unit's own finish (turn 13, CLAUDE.md F3) ────────────────────────
  //
  // The bug the owner found: editing ONE cabinet's colour rewrote the whole
  // project, because the only control the panel had was the PROJECT's. What was
  // missing is this — a place for one cabinet's answer.
  //
  // Both fields are POINTERS INTO THE PROJECT PALETTE (engine/design.js
  // `projectPalette`), never colours of their own. That is what keeps the
  // hierarchy honest: Settings grows the palette, a unit chooses from it, and
  // an element override (turn 9/11) still sits above both. Change Front 2 in
  // Settings and every cabinet wearing Front 2 follows.
  //
  // One `set` per call and one per BATCH, so the history watcher records one
  // undo step for a bulk recolour (F5.4) exactly as it does for a single one.

  /**
   * Give these units a carcass and/or front from the palette.
   *
   * @param {string|string[]} unitIds
   * @param {object} patch  { carcass_type_id?, front_type_id? } — a key that is
   *                        absent is LEFT ALONE, a key set to null is cleared
   *                        back to the project. That distinction is what makes a
   *                        "mixed" field in the bulk editor writable without
   *                        wiping the other one (F5.2).
   */
  setUnitFinish: (unitIds, patch) => {
    const ids = new Set(Array.isArray(unitIds) ? unitIds : [unitIds]);
    const keys = ['carcass_type_id', 'front_type_id'].filter((k) => k in (patch || {}));
    if (!ids.size || !keys.length) return;
    set((s) => ({
      units: s.units.map((u) => {
        if (!ids.has(u.id)) return u;
        const params = { ...u.params };
        for (const k of keys) params[k] = patch[k] || null;
        return { ...u, params };
      }),
    }));
  },

  /** Back to the project's finishes for these units — F3.3, "Reset to project". */
  resetUnitFinish: (unitIds) => {
    const ids = new Set(Array.isArray(unitIds) ? unitIds : [unitIds]);
    if (!ids.size) return;
    set((s) => ({
      units: s.units.map((u) => (ids.has(u.id)
        ? { ...u, params: { ...u.params, carcass_type_id: null, front_type_id: null } }
        : u)),
    }));
  },

  // ─── Bulk actions (turn 13, CLAUDE.md F5) ─────────────────────────────────
  //
  // A joiner who has just drawn six base units wants to plinth all six at once.
  // Nothing here is a second implementation of anything: every bulk action is
  // the SINGLE-unit action, called once per unit, inside one batch. That is the
  // whole design, and it is what keeps the clamps honest — each cabinet's width
  // still stops at ITS neighbour, each shelf still centres in ITS carcass — and
  // what keeps F5.4 ("every bulk action is ONE undo step") from being a promise
  // sixty actions have to remember to keep.

  /**
   * Run several edits as one undo step.
   *
   * @param {Function} fn  called with no arguments; use the store's own actions
   * @returns whatever `fn` returned
   */
  batch: (fn) => runBatch(fn),

  /**
   * The same parameter patch on every unit in the selection.
   *
   * Per unit, through `updateUnitParams`, so every clamp that applies to one
   * cabinet applies to each of them — a run where the third cabinet cannot grow
   * past its neighbour says so about the third cabinet.
   *
   * @returns {{notices:string[]}} every clamp message, prefixed with its unit
   */
  updateUnitParamsBulk: (unitIds, patch) => runBatch(() => {
    const notices = [];
    for (const id of unitIds || []) {
      const unit = get().units.find((u) => u.id === id);
      if (!unit) continue;
      const res = get().updateUnitParams(id, patch) || { notices: [] };
      for (const n of res.notices || []) notices.push(`${unit.params.unit_num}: ${n}`);
    }
    return { notices };
  }),

  /**
   * ─── TURN 30 (CLAUDE.md F9): THE CORNICE OVER A SELECTION ────────────────
   *
   * "Today cornice is per-cabinet; the infill already knows multi-select. Reuse
   * that flow: select 2+ → one cornice across. Same design layer, no drilling."
   *
   * REUSE is the whole of it, and it is reuse in BOTH directions:
   *
   *   the ACTION is `setCornice`, once per cabinet, inside one batch — which
   *   is what every bulk action in this store is, and what makes it one undo
   *   step without anybody remembering to make it one;
   *
   *   the RUN is `engine/cornice.js runCorniceParams`, which has made a
   *   cornice ONE MOULDING across adjacent cornice-bearing cabinets since turn
   *   22 (the top infill's own lesson from turn 6). Nothing about the piece is
   *   recomputed here. What was missing was never the run — it was the
   *   ENTRANCE: a joiner who had selected six cabinets had no way in.
   *
   * A cabinet whose kit takes no cornice is SKIPPED rather than refused, the
   * way a wall unit is skipped by the back inset below: somebody who selected a
   * run with a base unit in it has not asked for a moulding on the base unit.
   *
   * @returns {{done:number, skipped:number, notices:string[]}}
   */
  setCorniceBulk: (unitIds, value) => runBatch(() => {
    const notices = [];
    let done = 0;
    let skipped = 0;
    for (const id of unitIds || []) {
      const unit = get().units.find((u) => u.id === id);
      if (!unit) continue;
      if (!takesCornice(unit.type)) { skipped += 1; continue; }
      const res = get().setCornice(id, value) || { notices: [] };
      done += 1;
      for (const n of res.notices || []) notices.push(n);
    }
    // The run is recomputed once per call inside `setCornice`; the notices it
    // returns are the CEILING's, and a duplicate of one says nothing new.
    return { done, skipped, notices: [...new Set(notices)] };
  }),

  /**
   * ─── TURN 28 (CLAUDE.md F9): THE BACK INSET OVER A SELECTION ─────────────
   *
   * "Multi-select of floor-standing units shows a Back inset field. It moves
   * the whole selected run off the wall; every END PANEL in that run deepens
   * automatically so it always reaches the wall."
   *
   * The first half is this: `setUnitInsets` run once per cabinet inside ONE
   * batch, exactly as every other bulk action in this store is the single-unit
   * action repeated — so each cabinet's own depth clamp still has its say
   * about its own wall, and the lot is one Ctrl+Z (turn 13, F5.4).
   *
   * The second half is the ENGINE's: `endPanelDepth` reads `inset_back_mm` and
   * the cut size grows with it. Nothing here computes a panel.
   *
   * A WALL unit is skipped rather than refused: it hangs on brackets, "off the
   * wall" is what a bracket already is, and a joiner who selected a run with
   * one wall cabinet in it has not asked for it to move.
   */
  setUnitInsetsBulk: (unitIds, patch) => runBatch(() => {
    const notices = [];
    let applied = 0;
    let skipped = 0;
    for (const id of unitIds || []) {
      const unit = get().units.find((u) => u.id === id);
      if (!unit) continue;
      if (getUnitType(unit.type)?.mount !== 'floor') { skipped += 1; continue; }
      const res = get().setUnitInsets(id, patch) || { applied: {}, notices: [] };
      if (Object.keys(res.applied || {}).length) applied += 1;
      for (const n of res.notices || []) notices.push(`${unit.params.unit_num}: ${n}`);
    }
    return { applied, skipped, notices };
  }),

  /** A shelf (or several) in every unit of the selection that takes one. */
  addShelvesBulk: (unitIds, count = 1) => runBatch(() => {
    let added = 0;
    let skipped = 0;
    for (const id of unitIds || []) {
      const unit = get().units.find((u) => u.id === id);
      if (!unit) continue;
      // A cabinet whose kit has no shelves is not a failure, it is a cabinet
      // that has no shelves. Counted, and reported once, rather than throwing a
      // warning per unit at somebody who selected a whole run.
      if (!getUnitType(unit.type)?.supports?.shelves) { skipped += 1; continue; }
      added += get().addShelves(id, count)?.added || 0;
    }
    return { added, skipped };
  }),

  /**
   * Hang the doors this cabinet's width calls for.
   *
   * ─── Turn 13 (CLAUDE.md F5.3 / F6) ───
   * "Add doors" is asked for in three places now — the right panel, the
   * right-click menu over a whole selection, and the golden plus — so the
   * ANSWER lives here instead of in whichever component was first. It was one
   * line of arithmetic in RightPanel; three copies of one line is how two of
   * them end up disagreeing about the hinge.
   *
   * @returns {{count:number, already:boolean}} — `already` for a unit that has
   *   doors, so a caller can say so rather than reporting a silent success.
   */
  addDoors: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return { count: 0, already: false };
    const profile = getCabinetProfile();
    if (unit.params.doors && unit.params.doors !== false) {
      return { count: get().unitResult(unitId)?.derived?.doors || 0, already: true };
    }
    const count = doorCountFor(unit.params.width, profile);
    get().setDoors(unitId, { count, hinge: unit.params.hinge || profile.doors.defaultHinge });
    return { count, already: false };
  },

  // ─── TURN 21 (CLAUDE.md F12): A DOOR PER BAY ──────────────────────────────
  //
  // Owner: partitions at 600 and 800, three bays, two proper doors and one
  // small one in the middle. It is a MODE the unit is in — a cabinet with
  // per-bay doors has no whole-face door, which is what three doors in three
  // bays means — so this writes the list and takes the face doors off in one
  // action, and clearing it puts the unit back where it was.

  /** Which bays this unit's face divides into, if any partition can carry a door. */
  bayDoorsFor: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    const result = unit ? get().unitResult(unitId) : null;
    if (!unit || !result) return [];
    return doorBays({
      width: Number(unit.params.width) || 0,
      boardT: Number(unit.params.board_t) || getCabinetProfile().board.thickness,
      partitions: (result.panels || [])
        .filter((p) => p.part === 'VPART')
        .map((p) => ({
          id: p.id, x: p.meta.x_mm, thickness: p.box.w, fullHeight: p.meta.fullHeight, setback: p.meta.setback,
        })),
    });
  },

  /**
   * Turn per-bay doors on, off, or edit one bay's own answer.
   *
   * `modes` is one entry per bay, in bay order: `{ door: 'one'|'none', hinge }`.
   * `null` clears the mode and the unit goes back to its face doors.
   */
  setBayDoors: (unitId, modes) => {
    if (modes == null) {
      get().updateUnitParams(unitId, { bay_doors: null });
      return null;
    }
    const bays = get().bayDoorsFor(unitId);
    const next = bays.map((_, i) => {
      const m = modes[i] || {};
      // ─── TURN 36 (CLAUDE.md F6): THE SPLIT RIDES WITH THE BAY ────────────
      // `split_top_mm` is carried through this normaliser rather than dropped
      // by it: a joiner who changes a bay's HINGE must not lose the split he
      // typed into the same row. 0 / absent = no split, which is every bay
      // door before this turn.
      const split = Number(m.split_top_mm);
      return {
        door: String(m.door ?? 'none').toLowerCase() === 'one' ? 'one' : 'none',
        hinge: String(m.hinge || 'L').toUpperCase() === 'R' ? 'R' : 'L',
        // An explicit 0 is KEPT: it is how one bay opts out of a split the
        // whole unit asked for. Absent is absent, and absent follows the unit.
        ...(Number.isFinite(split) && split >= 0 ? { split_top_mm: Math.round(split) } : {}),
      };
    });
    // A cabinet with doors in its bays has no door across its face.
    get().updateUnitParams(unitId, { bay_doors: next, doors: false });
    return next;
  },

  /**
   * ─── TURN 36 (CLAUDE.md F6): SPLIT DOORS ─────────────────────────────────
   *
   * "Split door: top segment height ___ mm" for the WHOLE unit. 0 clears it
   * and the leaves go back to being one door each, which is what every
   * project that has never asked for a split already is.
   *
   * The engine refuses a mistyped number on its own (`splitDoorActive`: both
   * segments must be at least 100 mm), so this stores what was typed and lets
   * the one law decide — a second clamp here would be a second opinion.
   */
  setSplitTop: (unitId, mm) => {
    const v = Number(mm);
    const out = get().updateUnitParams(unitId, {
      split_top_mm: Number.isFinite(v) && v > 0 ? Math.round(v) : null,
    });
    // ─── TURN 37 (CLAUDE.md F4a): THE DIVIDER ARRIVES, THE SHELVES SETTLE ────
    // The divider is an END of the cabinet now, so typing one MOVES the band
    // every shelf lives in — and a shelf standing where the crossbar is about
    // to be cut is an overlap nobody dragged. The sweep that already exists for
    // every other carcass change is the sweep for this one: same clamp, same
    // one law, no second opinion about where a shelf may stand.
    get().reclampShelves(unitId);
    return out;
  },

  /** …and one BAY's own split, leaving the other bays alone. */
  setBaySplitTop: (unitId, bay, mm) => {
    const v = Number(mm);
    const out = get().setBayDoor(unitId, bay, {
      split_top_mm: Number.isFinite(v) && v > 0 ? Math.round(v) : 0,
    });
    // …and the same settle, for the bay's own column (T37-F4a).
    get().reclampShelves(unitId);
    return out;
  },

  /** One bay's own answer, leaving the others alone. */
  setBayDoor: (unitId, bay, patch) => {
    const unit = get().units.find((u) => u.id === unitId);
    const bays = get().bayDoorsFor(unitId);
    const current = Array.isArray(unit?.params?.bay_doors) ? unit.params.bay_doors : [];
    const modes = bays.map((_, i) => ({ ...(current[i] || { door: 'none', hinge: 'L' }), ...(i === bay ? patch : {}) }));
    return get().setBayDoors(unitId, modes);
  },

  /** …and on every cabinet in the selection, as one undo step. */
  addDoorsBulk: (unitIds) => runBatch(() => {
    let fitted = 0;
    let already = 0;
    for (const id of unitIds || []) {
      const res = get().addDoors(id);
      if (res.already) already += 1;
      else if (res.count) fitted += 1;
    }
    return { fitted, already };
  }),

  /**
   * Take the doors OFF one cabinet (turn 15, CLAUDE.md F8).
   *
   * The exact mirror of `addDoors` above, and deliberately the same shape of
   * answer — `{ removed, already }` — so the bulk action below can count both
   * outcomes without asking the engine anything.
   *
   * `doors: false` and not `doors: null`: false is what `normalizeParams` has
   * always read as "this cabinet has no doors", and a unit that never had any
   * already stores it. One vocabulary, so a stripped cabinet and a cabinet
   * ordered without doors are the same cabinet.
   */
  removeDoors: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return { removed: 0, already: false };
    if (!unit.params.doors || unit.params.doors === false) return { removed: 0, already: true };
    const count = get().unitResult(unitId)?.derived?.doors || 0;
    get().setDoors(unitId, false);
    return { removed: count || 1, already: false };
  },

  /**
   * ─── REMOVE THIS LEAF (turn 25, CLAUDE.md F11) ───────────────────────────
   *
   * "At the BOTTOM of the door's double-click modal, separated by a rule:
   * Remove door. The Delete key on a selected leaf does the same. No
   * confirmation dialog — Undo covers it."
   *
   * A leaf hung in a BAY is removed on its own: `bay_doors` already says one
   * thing per bay, so that bay stops asking for a door and its neighbours are
   * untouched. A FACE door has no per-leaf answer in the parameters — a pair is
   * cut as a pair — so removing one takes the face's doors off, which is what
   * the action means on a cabinet that has one door and the honest reading on a
   * cabinet that has two.
   *
   * R9 does the rest: the hinge holes leave with the door and return with it,
   * in the same recompute, because they only ever existed while it did.
   *
   * @returns {{removed:number, scope:'bay'|'face'}|null}
   */
  removeFront: (unitId, panelId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const panel = get().unitResult(unitId)?.panels.find((p) => p.id === panelId) || null;
    if (!panel || panel.part !== 'FRONT') return null;
    const bay = panel.meta?.bay;
    if (Number.isFinite(Number(bay))) {
      get().setBayDoor(unitId, Number(bay), { door: 'none' });
      return { removed: 1, scope: 'bay' };
    }
    const res = get().removeDoors(unitId);
    return { removed: res.removed, scope: 'face' };
  },

  /**
   * …and off every cabinet in the selection, in ONE action and ONE undo step
   * (turn 15, CLAUDE.md F8; the turn-13 F5 bulk rules).
   *
   * The owner walks a run unit by unit today. `runBatch` is what makes the lot
   * a single Ctrl+Z — the same wrapper every other bulk action here uses, so
   * this is not a second way of doing it.
   */
  removeDoorsBulk: (unitIds) => runBatch(() => {
    let stripped = 0;
    let already = 0;
    for (const id of unitIds || []) {
      const res = get().removeDoors(id);
      if (res.already) already += 1;
      else if (res.removed) stripped += 1;
    }
    return { stripped, already };
  }),

  /**
   * ─── DOOR EXTEND, over a whole selection (turn 16, CLAUDE.md F4.2) ────────
   *
   * "The function is MISSING there entirely. Add it beside Add/Remove doors:
   * one action, one undo step, same default-38-editable field, applied to every
   * selected unit's doors."
   *
   * Beside them literally, and through `runBatch` like every other bulk action
   * here — which is what makes a run of eight wall units one Ctrl+Z rather than
   * eight (the turn-13 F5 rule).
   *
   * Only the kits that HAVE the feature take it: a base unit has a worktop over
   * its doors and nothing to extend past. Those are counted and reported, not
   * silently skipped, so a joiner who selected a mixed run knows what happened.
   *
   * @param {string[]} unitIds
   * @param {number|false} mm  millimetres, or false to take the extend off
   * @returns {{applied:number, skipped:number, mm:number}}
   */
  setDoorExtendBulk: (unitIds, mm) => runBatch(() => {
    const profile = getCabinetProfile();
    const wanted = mm === false ? false : Math.max(0, snapTo(Number(mm) || 0, profile.editor.mmStep));
    let applied = 0;
    let skipped = 0;
    for (const id of unitIds || []) {
      const unit = get().units.find((u) => u.id === id);
      if (!unit) continue;
      if (!getUnitType(unit.type)?.doorExtend) { skipped += 1; continue; }
      get().updateUnitParams(id, { door_extend: wanted > 0 ? wanted : false });
      applied += 1;
    }
    return { applied, skipped, mm: wanted === false ? 0 : wanted };
  }),

  /**
   * ─── A CABINET'S NAME IS THE OWNER'S (turn 16, CLAUDE.md F6) ──────────────
   *
   * The default stays automatic — 01, 02, WU05 — and it becomes editable. It is
   * stored where the automatic one already lives (`params.unit_num`), which is
   * what makes "everything downstream prints the edited name" true with nothing
   * told to anything: the canvas label, the CNC block caption, the part codes
   * in a DXF filename, the BOM's unit column, the drawings and the check-out
   * all read that one field and always have.
   *
   * An empty name is not a name: it puts the cabinet back on the automatic one
   * for its position, so there is a way back that does not involve guessing
   * what the number was.
   *
   * Uniqueness is a WARNING and not a block (F6): two cabinets called "Island"
   * is a workshop's business, and a cut list that refuses to save is not.
   *
   * @returns {string} the name it ended up with
   */
  setUnitName: (unitId, name) => {
    const clean = String(name ?? '').trim().slice(0, 40);
    const index = get().units.findIndex((u) => u.id === unitId);
    if (index === -1) return '';
    const unit = get().units[index];
    // TURN 40 (F4b): clearing a name hands the cabinet the next number NOBODY
    // ELSE is wearing, for the same reason adding one does — a cleared name
    // that collided would print two lines a person cannot tell apart, which is
    // exactly the fault the owner photographed. `autoUnitNum` is kept and is
    // still what `nextUnitNum` formats with.
    const fallback = nextUnitNum(get().units, getUnitType(unit.type), { except: unitId })
      || autoUnitNum(getUnitType(unit.type), index);
    const next = clean || fallback;
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, unit_num: next } }
        : u)),
    }));
    return next;
  },

  /** Even/centre the shelves in every unit of the selection. */
  redistributeShelvesBulk: (unitIds) => runBatch(() => {
    let done = 0;
    for (const id of unitIds || []) {
      const unit = get().units.find((u) => u.id === id);
      if (!unit) continue;
      const items = unit.params.sections?.[0]?.items || [];
      if (!items.some((i) => i.kind === 'shelf')) continue;
      get().redistributeShelves(id);
      done += 1;
    }
    return { done };
  }),

  // ── units ────────────────────────────────────────────────────────────────
  /**
   * Place a unit of this type.
   *
   * @param {string} typeId
   * @param {object} [opts]
   *   params  a saved set's parameters (turn 5, BACKLOG #30). Inserting a
   *           template is THE SAME ACT as inserting a library type — same free
   *           slot, same collision clamp, same scribe fillers — with the
   *           factory parameters swapped for the saved ones. It is deliberately
   *           not a second path: a template that could land on top of a
   *           neighbour would be exactly the bug turn 3 phase 4 closed off.
   */
  addUnit: (typeId, { params = null, near = null, side = null } = {}) => {
    const profile = getCabinetProfile();
    const state = get();
    // ─── TURN 24 (CLAUDE.md F3.1): NO THICKNESS, NO DRAWERS ─────────────────
    //
    // The owner's words, and it is a HARD gate rather than a warning: a drawer
    // box is all joint — the sides are grooved for the bottom, the front and
    // back are cut to the sides' own board — and half a millimetre out is a box
    // that does not go together. So a drawer-BEARING unit cannot be added while
    // the drawer-box slot's thickness is unconfirmed, and it is refused in the
    // same plain sentence a wall with no room is refused in.
    const drawerBearing = getUnitType(typeId).drawerStyle === 'budr'
      || Number(params?.drawers) > 0
      || (params?.sections?.[0]?.items || []).some((i) => i?.kind === 'drawer');
    if (drawerBearing) {
      const gate = drawerBoxGate(state.project.design);
      if (gate.blocked) return { id: null, error: gate.message };
    }
    const unit = newUnit(typeId, profile, state.units.length, state.project.design);
    // TURN 40 (F4b): …and it takes the next number NOBODY IS WEARING. See
    // `nextUnitNum` for the measurement that says why this is the twin's cause.
    unit.params.unit_num = nextUnitNum(state.units, getUnitType(typeId));
    if (params) applyTemplateParams(unit, params);
    // ─── Turn 8 (CLAUDE.md F2.1) ───
    // Which unit the joiner is working beside. When there is one, the new
    // cabinet lands in the nearest free slot on EITHER side of it — which is
    // the whole of the "adding on the left is impossible" bug: the placement
    // knew one direction, so the left-hand end of a run could not be reached by
    // adding OR by dragging (a unit butted against its neighbour has nowhere to
    // go, and a clamp that let it through would be a worse bug).
    const beside = near ? state.units.find((u) => u.id === near) : null;
    // Centred on an empty wall, otherwise butted onto the end of the run —
    // a new unit never lands on top of an existing one. Wall units and floor
    // units occupy different bands of the same wall, so they are placed
    // against their own kind only.
    //
    // When wall 0 is full the unit goes round the room looking for a wall with
    // room, and when the whole room is full it is REFUSED. Dropping it on the
    // far end of a full wall and reporting the overlap afterwards would be an
    // overlap the app created itself (CLAUDE.md turn 3, phase 4).
    const level = getUnitType(typeId).mount;
    const walls = roomWalls(state.project.room);
    let placed = null;
    // ─── TURN 36 (CLAUDE.md F7): A TOP BOX IS PLACED **ON** SOMETHING ───────
    //
    // Every other unit is placed by `freeSlotOnWall`, which looks for a gap
    // BESIDE its neighbours. A rider has no gap to look for: it stands ON a
    // main, in exactly that main's place, and the free-slot search would put
    // it politely next door — where a snap would then have nothing to snap to.
    //
    // The host is chosen FIRST: the cabinet the library was opened beside if
    // that is a main, otherwise the last main placed. With no main on the
    // floor at all the box is still placed, by the ordinary search, standing
    // on nothing — and check #14 says so in red rather than the app refusing
    // to add what the joiner asked for.
    const riderOf = getUnitType(typeId).ridesOn;
    const riderHost = riderOf
      ? [beside, ...[...state.units].reverse()].find((u) => u
        && getUnitType(u.type).family === riderOf
        && !getUnitType(u.type).ridesOn)
      : null;
    if (riderHost) {
      placed = { wall: riderHost.position?.wall ?? 0, x: riderHost.position?.x_mm ?? 0 };
      unit.params.rides_on = riderHost.id;
      // ─── TURN 37 (CLAUDE.md F5a): BORN MATCHED ────────────────────────────
      //
      // The owner, walking T36-F7: *"nadstawka działa super, ale…"* — a Top
      // box placed on a main takes THE MAIN'S WIDTH. T36 gave it the profile's
      // 600 whatever it stood on, so a box on a 900 wardrobe arrived 300 short
      // and had to be typed every single time (the T36 walk itself worked
      // round it with an `updateUnitParams(box, { width: 900 })`).
      //
      // BORN matched, and only born: the width is written here, once, at
      // placement — not in `settleRiders`, which runs on every mutation and
      // would stamp on a joiner who had deliberately made his box narrower.
      // The DEPTH is settled continuously and stays that way, because a box
      // that overhangs its own carcass is not a box, it is a mistake.
      const hostW = Number(riderHost.params?.width);
      if (Number.isFinite(hostW) && hostW > 0) unit.params.width = hostW;
      // ─── TURN 50 (CLAUDE.md F3): …AND BORN INSIDE THE ROOM ────────────────
      //
      // The owner's own case: *"dlaczego pozwala system dodawać top box powyżej
      // rozmiaru pokoju? to powinno być blokada."*  A box arrives with the
      // profile's 500 and stands on a wardrobe's top, so in a 2500 room on a
      // 2250 wardrobe it was born 750 mm through the ceiling.
      //
      // BORN FITTED, exactly as T37 made it born matched to its host's width,
      // and for the same reason: this height has never been typed, so cutting
      // it to what is left is not the app overruling anybody. What IS refused
      // is a room with less headroom than a top box's own minimum — there the
      // add is blocked, with the room's figure in the sentence, which is the
      // "blokada" he asked for.
      const born = riderBornHeight({
        unit,
        host: riderHost,
        room: state.project.room,
        profile,
        minHeight: minHeightOf(typeId, profile),
      });
      if (born.refuse) return { id: null, error: born.refuse };
      if (born.height != null) unit.params.height = born.height;
    }
    // A named neighbour decides which WALL is tried first as well as where on
    // it: "another one beside this" cannot mean "on the wall behind you".
    // …and when a SIDE was asked for as well, that wall is the only one tried:
    // "put one on the left of this" is not answered by a wall round the corner.
    const besideWall = beside ? walls[beside.position.wall ?? 0] : null;
    const ordered = besideWall
      ? (side
        ? [besideWall]
        : [besideWall, ...walls.filter((wl) => wl.index !== besideWall.index)])
      : walls;
    for (const wall of (placed ? [] : ordered)) {
      const onThisWall = beside && (beside.position.wall ?? 0) === wall.index;
      const x = freeSlotOnWall({
        width: unit.params.width,
        wallWidth: wall.width,
        wallMargin: wallMarginOf(state, unit),
        others: [
          ...state.units
            .filter((u) => (u.position.wall ?? 0) === wall.index && obstructs(unit, u, profile))
            .map(unitSpan),
          // A box in the plan refuses a placement exactly as a neighbour does
          // (turn 14, CLAUDE.md F10.3): a unit is never DROPPED into a chimney.
          ...boxSpansOnWall({ wall, depth: unit.params.depth, boxes: planObstaclesOf(state.project.room, state.project.wallSlopes) }),
        ],
        near: onThisWall ? unitSpan(beside) : null,
        side: onThisWall ? side : null,
      }, profile);
      if (x != null) { placed = { wall: wall.index, x }; break; }
    }
    if (!placed) {
      const where = side && beside
        ? `There is no room for ${formatMm(unit.params.width)} mm to the ${side === 'L' ? 'left' : 'right'} of ${beside.params.unit_num} — move something, or add it on the other side.`
        : `No wall has ${formatMm(unit.params.width)} mm of free space for this unit — move or remove something first.`;
      return { id: null, error: where };
    }
    unit.position.wall = placed.wall;
    unit.position.x_mm = placed.x;
    // ─── Turn 8 (CLAUDE.md F5) ───
    // A wall unit going in beside a TALL one hangs so that the two finish on
    // ONE line. A kitchen whose wall units stop 80 mm below the tall cabinet
    // next to them reads as two kitchens, and the joiner then spends the
    // afternoon typing mount heights.
    //
    // It is a STARTING POINT and says so: `mount_height` stays an ordinary
    // editable field, and the unit can be hung wherever the window allows.
    const aligned = alignedMountFor(state, unit, placed);
    if (aligned != null) unit.params.mount_height = aligned;
    // T36 F7: a TOP BOX settles on its main the moment it is placed — same
    // wall, same x, same depth, hung at the main's own top.
    set((s) => ({ units: settleRiders([...s.units, unit], profile) }));
    // A unit arrives with its SCRIBE FILLERS worked out from where it landed.
    // The plinth and the top infill are decisions and wait to be asked for
    // (turn 4, BACKLOG #16) — turn 3 put both in the cut list unasked.
    get().refreshAutoParts(unit.id);
    // ─── TURN 50 (CLAUDE.md F2): …AND THE GAP IT LEFT IS OFFERED ───────────
    //
    // *"jak dodaję ostatnią szafkę do ściany i zostanie mniej niż 400 mm …
    // czy chcesz wyśrodkować?"*  The question is asked HERE because this is
    // the moment he describes — a cabinet has just been added to a run. What
    // decides is `engine/shareOut.js`, which answers null for every add that
    // leaves a real gap or none at all; the bar draws only when it does not.
    if (shareOutFor(get().units, unit.id, { walls, wallMargin: wallMarginOf(get(), unit) }, profile)) {
      useUiStore.getState().offerShareOut(unit.id);
    } else {
      useUiStore.getState().clearShareOut();
    }
    // ─── TURN 50 (CLAUDE.md F4): …AND A JUNCTION THAT NEEDS FINISHING ──────
    //
    // *"w kuchni jak DODAMY niską szafkę do wysokiej bez panela"* — the add is
    // the moment he names, so this is where the question is asked. The message
    // is a GREY, which in this app is the centre of the screen on its own
    // clock — *"informacja na środku monitora"* — and it names the way back
    // out, which is the second half of his sentence.
    for (const grown of get().growAutoEndPanels()) {
      if (grown.message) useUiStore.getState().notify(grown.message, 'info');
    }
    return { id: unit.id, error: null, wall: placed.wall };
  },

  // ─── TURN 50 (CLAUDE.md F2): THE RUN IS SHARED OUT, EQUALLY, ONCE ────────
  //
  // The owner: *"jak dodaję ostatnią szafkę do ściany i zostanie mniej niż 400
  // mm … czy chcesz wyśrodkować? i wtedy wszystkie szafy się ustawią w jednej
  // szerokości od ściany do ściany, oczywiście odejmując infill."*
  //
  // The arithmetic is `engine/shareOut.js` and none of it is here. What is here
  // is the WRITE, and it is deliberately the most ordinary write in this store:
  // `updateUnitParams` per cabinet, the same clamp every typed width goes
  // through, inside ONE `runBatch` so Ctrl+Z takes the whole run back — *"tylko
  // jednorazowe, z możliwością zrobienia Undo — ale to już mamy."*
  //
  // ─── WHY THE WIDTHS ARE WRITTEN OUTWARD FROM THE LEFT ─────────────────────
  //
  // Every cabinet in the run is growing, and a cabinet grows to the RIGHT
  // (`clampUnitWidth` moves the far edge). Written left to right, cabinet 2 is
  // still where it was when cabinet 1 grows into it, and the clamp refuses.
  // So each cabinet is MOVED to where the plan puts it and THEN widened, left
  // to right — which is the order a joiner sets a run out in, and it is why no
  // notice about "limited by 02" comes out of a share-out that fits.
  //
  // ─── AND IT NEVER ADDS A CABINET ─────────────────────────────────────────
  //
  // Decision 2, at the top of CLAUDE.md. `extra` is passed only when the joiner
  // has pressed the bar's SECOND button, and the new cabinet is added by
  // `addUnit` — the same call the library makes — before the widths are
  // written, so it is in the run the plan is applied to.
  /**
   * ─── TURN 50 (CLAUDE.md F3): MAY THIS UNIT BE GIVEN THIS SIZE? ───────────
   *
   * The owner: *"dlaczego pozwala system dodawać top box powyżej rozmiaru
   * pokoju? to powinno być blokada."*
   *
   * The RULE is `engine/roomFit.js` and none of it is here. What is here is the
   * plumbing the two surfaces would otherwise each have to do — the room, and
   * the cabinet a top box is standing on — so the parameter panel and the size
   * modal ask ONE question and get ONE sentence back.
   *
   * It REFUSES; it does not clamp. `updateUnitParams` still clamps every number
   * the APP moves (a project-wide height push, a drag against a neighbour) and
   * is untouched. This is the other case: a number somebody typed.
   *
   * @returns {{key, limit, wanted, message}|null} null when the size is fine
   */
  roomFitRefusalFor: (unitId, patch) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const host = unit.params?.rides_on
      ? s.units.find((u) => u.id === unit.params.rides_on) || null
      : null;
    return roomFitRefusal({
      unit, patch, room: s.project.room, host, profile: getCabinetProfile(),
    });
  },

  /** Every unit that is ALREADY bigger than its room — Check's own list (F3). */
  roomFitFaults: () => roomFitFaults(get().units, get().project.room, getCabinetProfile()),

  shareOutRun: (unitId, { extra = 0 } = {}) => runBatch(() => {
    const profile = getCabinetProfile();
    const state = get();
    const walls = roomWalls(state.project.room);
    // The RUN, not the OFFER: the 400 mm gate decides whether the BAR appears
    // (`shareOutFor`), and a button that second-guessed the click that reached
    // it would be a button that sometimes does nothing.
    // The MARGIN the placement keeps at a wall is the project's own infill
    // width, and the plan has to know it or every share-out comes back with
    // three "Width limited by the wall" notices on a run that fits perfectly.
    const wallMargin = wallMarginOf(state, state.units.find((u) => u.id === unitId));
    const offer = shareOutRunFor(state.units, unitId, { walls, wallMargin }, profile);
    if (!offer) return { ok: false, message: 'Nothing to share out on this run.', widths: [] };

    let plan = shareOutPlan(offer.run, offer.context, profile, { extra });
    if (!plan.ok) {
      return {
        ok: false,
        message: plan.reason === 'nothing-to-widen'
          ? 'Every cabinet in this run has its width imposed — there is nothing to share the gap into.'
          : 'This run has no room to share out.',
        widths: [],
      };
    }

    // The EXTRA cabinet, when the joiner asked for one. A copy of the run's
    // last non-fixed cabinet, added beside it, at the plan's own width.
    if (extra > 0) {
      const seed = [...offer.run.units].reverse().find((u) => !widthFixed(u))
        || offer.run.units[offer.run.units.length - 1];
      const born = get().addUnit(seed.type, { near: seed.id, side: 'R' });
      if (born.error || !born.id) {
        return { ok: false, message: born.error || 'There is no room for another cabinet here.', widths: [] };
      }
      // The run has changed shape, so the plan is asked again OF THE RUN THAT
      // NOW EXISTS rather than patched — one derivation, and the new cabinet is
      // in it like any other.
      const after = shareOutRunFor(get().units, born.id, { walls, wallMargin }, profile)
        || shareOutRunFor(get().units, unitId, { walls, wallMargin }, profile);
      const nextRun = after ? after.run : offer.run;
      plan = shareOutPlan(nextRun, after ? after.context : offer.context, profile, {});
      if (!plan.ok) return { ok: false, message: 'This run has no room to share out.', widths: [] };
    }

    // ─── WHERE THE RUN NOW STANDS ─────────────────────────────────────────
    //
    // *"wtedy wszystkie szafy się ustawią w jednej szerokości od ściany do
    // ściany, oczywiście odejmując infill."*  So the run is laid out from the
    // LEFT EDGE of the stretch it may occupy — `runEndGap`'s own `from`, which
    // is the wall or the neighbour beside it — plus the side infill that stands
    // there, and each cabinet follows the one before it.
    const runNow = shareOutRunFor(get().units, unitId, { walls, wallMargin }, profile);
    const run = runNow ? runNow.run : offer.run;
    const units = run.units;
    const wantOf = new Map(plan.widths.map((w) => [w.id, w.to]));

    // ─── WHERE EVERY CABINET FINISHES, WORKED OUT FIRST ───────────────────
    //
    // `cursor` is the OUTSIDE of everything placed so far — end panels
    // included, exactly as `paddedSpan` measures — and it starts where the PLAN
    // says the run starts, so the arithmetic and the placement cannot disagree
    // about the first millimetre.
    const goesTo = new Map();
    {
      let cursor = Math.max(0, Number(plan.startAt) || 0);
      for (const u of units) {
        const pad = paddedSpan(u).pad || { left: 0, right: 0 };
        const want = wantOf.get(u.id) ?? (Number(u.params?.width) || 0);
        goesTo.set(u.id, { x: cursor + Math.max(0, pad.left), width: want });
        cursor += Math.max(0, pad.left) + want + Math.max(0, pad.right);
      }
    }

    // ─── AND THEY ARE WRITTEN FROM THE RIGHT ──────────────────────────────
    //
    // Every cabinet in a share-out is GROWING, and a cabinet grows to the RIGHT
    // (`clampUnitWidth` moves the far edge). Written left to right, cabinet 1
    // is asked to grow into a cabinet 2 that has not moved yet and the clamp
    // rightly refuses — which is a run that comes back six "Width limited by
    // 02" notices and one cabinet wider than it was.
    //
    // From the RIGHT there is always room: the last cabinet moves into clear
    // wall and grows into clear wall, and each one before it grows into the
    // space the one after it has just vacated.
    //
    // The second pass is left to right and idempotent — it settles anything the
    // first pass could not finish (a run that SHRANK, which a share-out can do
    // when a fixed cabinet takes more room than it used to). A cabinet already
    // where it belongs costs one clamp and moves nothing.
    const notices = [];
    // …with the MAGNET off. It is a hand's convenience — it butts a dragged
    // cabinet onto its neighbour from 40 mm away — and it is exactly wrong for
    // a position somebody has worked out: cabinet 2 moved to 676 to make room
    // for cabinet 1 gets snapped back to 640, and cabinet 1 is then refused the
    // width the plan gave it.
    const place = (u) => {
      const to = goesTo.get(u.id);
      if (!to) return;
      get().moveUnit(u.id, to.x, 0, { magnet: false });
      if (wantOf.has(u.id)) {
        const res = get().updateUnitParams(u.id, { width: to.width });
        for (const n of res?.notices || []) notices.push(n);
      }
      get().moveUnit(u.id, to.x, 0, { magnet: false });
    };
    for (const u of [...units].reverse()) place(u);
    notices.length = 0;                       // the first pass is the rehearsal
    for (const u of units) place(u);
    notices.push(...get().refreshAutoParts());
    return {
      ok: true,
      message: null,
      widths: plan.widths,
      each: plan.each,
      last: plan.last,
      notices,
    };
  }),

  removeUnit: (unitId) => {
    // T36 F7: a rider whose main goes is ORPHANED, not moved and not deleted —
    // the joiner is shown a red fault and decides. `settleRiders` leaves it
    // exactly where it is, because its link no longer names a cabinet.
    set((s) => ({ units: settleRiders(s.units.filter((u) => u.id !== unitId), getCabinetProfile()) }));
    get().refreshAutoParts();
  },

  /**
   * Edit a unit's parameters.
   *
   * Growing a unit is a MOVE — the far edge travels — so it stops at exactly
   * the same barriers a drag stops at, through the same pure functions
   * (engine/collision.js). Width stops at the neighbour or the end of the
   * wall; depth stops at the far wall or at a unit standing in the corner it
   * would grow into. What cannot be honoured is reported, not silently
   * applied and not silently dropped.
   *
   * @returns {{applied:object, notices:string[]}}
   */
  updateUnitParams: (unitId, patch) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return { applied: {}, notices: [] };
    const profile = getCabinetProfile();
    const walls = roomWalls(s.project.room);
    const wallIndex = unit.position.wall ?? 0;
    const wall = walls[wallIndex] || walls[0];
    const others = obstaclesFor(s, unit);
    const notices = [];
    const applied = { ...patch };

    if (patch.width != null) {
      const spans = wallObstacles({
        wall, walls, depth: unit.params.depth, others, boxes: planObstaclesOf(s.project.room, s.project.wallSlopes),
      });
      const clamp = clampUnitWidth({
        width: Number(patch.width) || 0,
        x: unit.position.x_mm,
        wallWidth: wall.width,
        others: spans,
        // Growing a unit is a move of its far edge: it stops at the infill gap
        // and carries its own end panel with it.
        wallMargin: wallMarginOf(s, unit),
        padRight: footprintPads(unit, unit.params.front_t, profile).right,
      }, profile);
      applied.width = clamp.width;
      if (clamp.blocked) notices.push(`Width limited to ${formatMm(clamp.max)} mm by ${clamp.by}.`);
    }
    if (patch.depth != null) {
      const clamp = clampUnitDepth({
        depth: Number(patch.depth) || 0,
        x: unit.position.x_mm, width: applied.width ?? unit.params.width,
        wall, walls, others,
        backInset: backStandoff(unit, profile),
      }, profile);
      applied.depth = clamp.depth;
      if (clamp.blocked) notices.push(`Depth limited to ${formatMm(clamp.max)} mm by ${clamp.by}.`);
    }
    if (patch.height != null) {
      const clamp = clampUnitHeight({
        height: Number(patch.height) || 0,
        floorY: floorYOf(unit, applied, profile),
        roomHeight: Number(s.project.room.height) || 0,
        minHeight: minHeightOf(unit.type, profile),
      });
      applied.height = clamp.height;
      if (clamp.blocked) notices.push(`Height limited to ${formatMm(clamp.max)} mm by ${clamp.by}.`);
      // Typing a height into the panel is the DELIBERATE exception (BACKLOG
      // #29): from here this unit keeps its own height and stops following the
      // project's, until Reset puts it back. The project-wide push passes the
      // flag itself, which is how it can move a unit without claiming a joiner
      // did it by hand.
      if (patch.height_custom === undefined) applied.height_custom = true;
    }

    set((st) => ({
      units: st.units.map((u) => {
        if (u.id !== unitId) return u;
        const params = { ...u.params, ...applied };
        if (applied.width != null && params.sections?.[0]) {
          params.sections = [{ ...params.sections[0], width_mm: applied.width }];
        }
        // ─── CHAT FIX 15.08.2026: THE WIDTH RE-DERIVES THE DOOR COUNT ────────
        // The owner's LISP law: one door while (W − 4) ≤ 700, two above — and
        // the ENGINE has carried it since turn 1 for the auto case. But
        // `addDoors` PINS `{ count }` at the width of that moment, and this
        // function then resized the cabinet around a pinned answer: a 600
        // wardrobe fitted with its one door and widened to 1200 kept ONE
        // 1100-odd leaf — the owner's "po moim LSP nie dodaje drzwi powyżej
        // 700", found on his own scene 15.08.
        //
        // The re-derivation is CONDITIONAL on the pinned count being the AUTO
        // answer for the OLD width: a count somebody chose against the ladder
        // (a deliberate single wide leaf) is a decision, and a resize must not
        // overrule a person. `bay_doors` layouts are a different system and
        // are not touched.
        if (applied.width != null
            && params.doors && typeof params.doors === 'object'
            && !params.bay_doors
            && Number(params.doors.count) === doorCountFor(unit.params.width, profile)) {
          const auto = doorCountFor(applied.width, profile);
          if (auto !== Number(params.doors.count)) {
            params.doors = { ...params.doors, count: auto };
            notices.push(`Doors follow the width: ${auto} now (the 700 mm rule).`);
          }
        }
        // ─── Turn 8 (CLAUDE.md F2.2) ───
        // The hinge side is stored in TWO places and the engine reads the other
        // one. `params.hinge` is the unit's own; `params.doors` becomes an
        // object the moment doors are fitted (`setDoors`), and
        // normalizeParams lets `doors.hinge` override `hinge` — so once a door
        // existed, the panel's switch wrote to a field nothing read, and Piotr
        // watched a control do nothing.
        //
        // One source of truth, kept here rather than by teaching the engine to
        // prefer the other field: the door object is what the engine is handed,
        // so the door object has to be right.
        if (applied.hinge != null && params.doors && typeof params.doors === 'object') {
          params.doors = { ...params.doors, hinge: applied.hinge };
        }
        return { ...u, params };
      }),
    }));
    // ─── TURN 36 (CLAUDE.md F7): AND ITS TOP BOX FOLLOWS ────────────────────
    // A main that grew taller, or shallower, or wider takes its rider with it:
    // the box hangs at the main's own TOP and is cut to the main's own DEPTH,
    // and both of those have just moved. `settleRiders` is idempotent, so a
    // cabinet with no box on it costs one array walk and returns the same
    // array it was given.
    set((st) => ({ units: settleRiders(st.units, getCabinetProfile()) }));
    // The clamp above keeps the unit inside its slot without moving it; this
    // re-runs the position clamp anyway, so a unit that was already overlapping
    // (an imported project, a room change) still settles legally.
    if (applied.width != null) get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
    if (patch.height != null || applied.width != null) get().reclampShelves(unitId);
    notices.push(...get().refreshAutoParts());
    // ─── TURN 38 (CLAUDE.md F9): THE RESIZE RULE ─────────────────────────
    // Asked ONLY where a cut size could have moved. A patch that is nothing
    // but `part_edits` is the editor writing its own list and must not be
    // followed by a rule that reads it — and every ordinary recompute (a shelf
    // moving, an LED toggling, a colour changing) never reaches this line at
    // all, which is the "must NOT clear anything" half of the rule.
    const onlyEdits = Object.keys(patch).length === 1 && patch.part_edits !== undefined;
    if (!onlyEdits) get().dropResizedPartEdits();
    return { applied, notices };
  },

  // ── project heights (turn 5, BACKLOG #29) ────────────────────────────────
  // A kitchen is built to ONE set of heights. They live with the project, a new
  // unit inherits the one for its kind, and changing a project height carries
  // every unit that has not been given its own along with it.

  /**
   * Set one or more project heights and apply them.
   *
   * @param {object} patch  { base?, wall?, tall?, wallMount?, toeKick? } in mm
   * @returns {{applied:object, moved:number, notices:string[]}}
   *          `moved` is how many units followed the change, which is what the
   *          panel says out loud — a silent edit that re-cuts nine cabinets is
   *          not something to find out about from the BOM.
   */
  setProjectHeights: (patch) => {
    const s = get();
    const profile = getCabinetProfile();
    const limits = profile.projectHeights;
    const design = migrateDesign(s.project.design);
    const heights = { ...design.heights };
    const applied = {};
    for (const key of HEIGHT_KEYS) {
      if (patch[key] == null) continue;
      // ─── Turn 22 (CLAUDE.md F4.3): 100 IS A DEFAULT, NEVER A FLOOR ────────
      //
      // Every project height shared one minimum — `profile.projectHeights.min`,
      // 100 — and that is right for a CARCASS: a 40 mm tall unit is a typing
      // mistake. It was wrong for the TOE KICK, which is the one of the five
      // that is not a carcass: 50 mm legs are a real kitchen and the field
      // silently rounded the owner's 50 up to 100. The seed stays 100
      // (`profile.projectHeights.toeKick`); the FLOOR is its own number and is
      // 0, and from there the engine's own sanity is the only guard.
      const min = key === 'toeKick' ? (limits.toeKickMin ?? 0) : limits.min;
      const value = Math.min(limits.max, Math.max(min, Number(patch[key]) || 0));
      heights[key] = value;
      applied[key] = value;
    }
    if (!Object.keys(applied).length) return { applied: {}, moved: 0, notices: [] };

    const nextDesign = migrateDesign({ ...design, heights });
    set((st) => ({ project: { ...st.project, design: nextDesign } }));

    const resolved = projectHeights(nextDesign, profile);
    const notices = [];
    let moved = 0;
    for (const unit of get().units) {
      const type = getUnitType(unit.type);
      const group = type.heightGroup ?? null;
      const changes = {};
      // The carcass height — only for a unit that still follows the project.
      if (group && applied[group] != null && !unit.params.height_custom) {
        changes.height = resolved[group];
        changes.height_custom = false;
      }
      if (applied.wallMount != null && type.mount === 'wall') changes.mount_height = resolved.wallMount;
      // Turn 22 (F4.2): every unit that STANDS on the run's legs follows the
      // toe kick, the D/W panel included — it is the unit the owner watched
      // ignore the field.
      if (applied.toeKick != null && standsOnLegHeight(type)) changes.leg_height = resolved.toeKick;
      if (!Object.keys(changes).length) continue;
      const result = get().updateUnitParams(unit.id, changes);
      moved += 1;
      for (const n of result.notices) notices.push(`${unit.params.unit_num}: ${n}`);
    }
    return { applied, moved, notices };
  },

  /** Put a unit back on the project's height for its kind. */
  resetUnitHeight: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const type = getUnitType(unit.type);
    const group = type.heightGroup ?? null;
    if (!group) return null;
    const height = projectHeights(s.project.design, profile)[group];
    return get().updateUnitParams(unitId, { height, height_custom: false });
  },

  /** Slide a unit along the wall: snapped, then hard-clamped into its free slot. */
  /**
   * @param {object} opts
   *   magnet  false for a COMPUTED layout (turn 50, F2). `editor.unitMagnet` is
   *           a hand's convenience — it butts a dragged cabinet onto its
   *           neighbour from 40 mm away — and it is exactly wrong for a
   *           position somebody has worked out: a share-out that moves cabinet
   *           2 to 676 to make room for cabinet 1 gets it snapped back to 640,
   *           and cabinet 1 is then refused the width the plan gave it. The
   *           default is TRUE, which is every drag and every other caller.
   */
  moveUnit: (unitId, xRaw, snapStep, { magnet = true } = {}) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const walls = roomWalls(s.project.room);
    const wallIndex = unit.position.wall ?? 0;
    const wall = walls[wallIndex] || walls[0];
    // Obstacles include units on OTHER walls whose footprint reaches into this
    // one's depth band — the corner case, in both senses.
    const others = wallObstacles({
      wall,
      walls,
      depth: unit.params.depth,
      others: obstaclesFor(s, unit),
      // A chimney breast stops a cabinet exactly as a neighbour does
      // (turn 14, CLAUDE.md F10.3).
      boxes: planObstaclesOf(s.project.room, s.project.wallSlopes),
    });
    // A rotated unit covers a different stretch of wall than its nominal
    // width, so the clamp is given the FOOTPRINT — and the offset between the
    // footprint's left edge and the unit's anchor is constant during a move,
    // which is what makes this a translation of the same one clamp.
    // End panels are part of the footprint, so the span is measured from the
    // outside of the left panel to the outside of the right one. (A ROTATED unit
    // with an end panel pivots about that outer corner rather than the carcass
    // corner — a fraction of the panel thickness, and the same corner the clamp
    // and the view both use.)
    const pad = footprintPads(unit, unit.params.front_t, getCabinetProfile());
    const span = unitPlanSpan({
      wall,
      x: unit.position.x_mm - pad.left,
      width: unit.params.width + pad.left + pad.right,
      depth: unit.params.depth,
      rotation: unit.position.rotation_deg,
      backInset: pad.back,
    });
    const lead = span.left - unit.position.x_mm;
    const footprintWidth = span.right - span.left;

    const result = clampUnitX({
      x: snapTo(xRaw, snapStep || getCabinetProfile().editor.mmStep) + lead,
      current: unit.position.x_mm + lead,
      width: footprintWidth,
      wallWidth: wall.width,
      others,
      // ─── TURN 46 (CLAUDE.md F2): …AND THE SLOPE IS A BARRIER TOO ─────────
      // The station is solved off the SAME ceiling line the wall is drawn
      // from, in the footprint frame this clamp already works in, so the stop
      // lands where the eye says it should.
      slopeLimit: slopeLimitFor(s, unit, wall, footprintWidth, getCabinetProfile()),
      // The stop that makes the side infill appear (BACKLOG #15) — and, since
      // turn 11 (F5.3), the 10 mm wall clearance instead for a cabinet whose
      // filler has been switched off, because there is no piece to leave room
      // for.
      wallMargin: wallMarginOf(s, unit),
    }, magnet
      ? getCabinetProfile()
      : (() => {
        const p = getCabinetProfile();
        return { ...p, editor: { ...p.editor, unitMagnet: 0 } };
      })());
    const x = result.x - lead;

    set((st) => ({
      // T36 F7: …and every top box rides the main it stands on.
      units: settleRiders(
        st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, x_mm: x } } : u)),
        getCabinetProfile(),
      ),
    }));
    // Moving changes which gaps exist — and a gap is a filler.
    get().refreshAutoParts();
    return { ...result, x };
  },

  /**
   * ─── Re-home a unit (turn 11, CLAUDE.md F4.1) ───
   *
   * "Move a unit to another position/side/wall AFTER placement." Until now a
   * placed cabinet was married to its wall: `moveUnit` slides it along, and the
   * only way round the corner was a select box in the right-hand panel. Dragging
   * it there is the gesture, and this is what the drag calls when the pointer
   * has crossed onto another wall.
   *
   * It is RE-PARENTING and not new geometry: the wall changes, and then exactly
   * the same clamp a slide goes through decides where on it the unit may stand
   * (`moveUnit`), so the collision and gap rules are the ones that were already
   * there. A wall with no room REFUSES — the unit goes back where it was, which
   * is the same answer `setUnitWall` gives and for the same reason: an overlap
   * the app created itself is the one thing turn 3 phase 4 closed off.
   *
   * @returns {{wall:number, x_mm:number, blocked:boolean, error:string|null}}
   */
  moveUnitToWall: (unitId, wallIndex, xRaw, snapStep = 0) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    const walls = roomWalls(s.project.room);
    if (!unit || !walls[wallIndex]) return null;
    const from = { wall: unit.position.wall ?? 0, x_mm: unit.position.x_mm };
    if (wallIndex === from.wall) {
      const moved = get().moveUnit(unitId, xRaw, snapStep);
      return {
        wall: from.wall, x_mm: moved?.x ?? from.x_mm, blocked: Boolean(moved?.blocked), error: null,
      };
    }

    // Put it on the new wall first, then let the ordinary clamp settle it: the
    // clamp reads the unit's CURRENT wall, so it has to be the new one before it
    // can have an opinion about the neighbours there.
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? { ...u, position: { ...u.position, wall: wallIndex } }
        : u)),
    }));
    const moved = get().moveUnit(unitId, xRaw, snapStep);
    const now = get().units.find((u) => u.id === unitId);
    // Did it actually FIT? `moveUnit` clamps rather than refuses, so a wall with
    // no free slot leaves the unit inside a neighbour — which nothing else in
    // this app is allowed to produce. Checked against the same free-slot rule a
    // placement uses, and put back if the answer is no.
    const room = freeSlotOnWall({
      width: unit.params.width,
      wallWidth: walls[wallIndex].width,
      wallMargin: wallMarginOf(get(), unit),
      others: [
        ...get().units
          .filter((u) => u.id !== unitId && (u.position.wall ?? 0) === wallIndex
            && obstructs(unit, u))
          .map(unitSpan),
        ...boxSpansOnWall({
          wall: walls[wallIndex], depth: unit.params.depth, boxes: planObstaclesOf(get().project.room, get().project.wallSlopes),
        }),
      ],
    }, getCabinetProfile());
    if (room == null) {
      set((st) => ({
        units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, ...from } } : u)),
      }));
      get().refreshAutoParts();
      return {
        ...from,
        blocked: true,
        error: `Wall ${wallIndex + 1} has no free space for this unit.`,
      };
    }
    // T36 F7: the main changed WALL — its top box goes with it.
    set((st) => ({ units: settleRiders(st.units, getCabinetProfile()) }));
    get().refreshAutoParts();
    return {
      wall: wallIndex, x_mm: now?.position.x_mm ?? moved?.x ?? 0, blocked: false, error: null,
    };
  },

  /**
   * Turn a unit. `mode` 'step' adds 90° per click (the button), 'set' takes an
   * exact angle (the field), 'back' and 'side' are the two alignments Piotr
   * asked for. The result goes straight back through the position clamp, so a
   * turn can no more create an overlap than a drag can.
   */
  rotateUnit: (unitId, mode = 'step', value = 90) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const current = Number(unit.position.rotation_deg) || 0;
    let next = current;
    if (mode === 'step') next = current + (Number(value) || 90);
    else if (mode === 'set') next = Number(value) || 0;
    else if (mode === 'back') next = 0;
    else if (mode === 'side') next = 90;
    next = ((next % 360) + 360) % 360;

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, rotation_deg: next } } : u)),
    }));
    // Turning changes the footprint; settle it legally where it stands
    // (moveUnit re-derives the automatics on the way through).
    get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
    return next;
  },

  /**
   * Move a unit to another wall — into a free slot, or not at all.
   *
   * A wall with no room for it REFUSES the move. Moving it there anyway and
   * reporting the overlap afterwards would be an overlap the app created
   * itself, which is exactly what phase 4 closes off.
   */
  setUnitWall: (unitId, wallIndex) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    const walls = roomWalls(s.project.room);
    if (!unit || !walls[wallIndex]) return null;
    const level = getUnitType(unit.type).mount;
    const x = freeSlotOnWall({
      width: unit.params.width,
      wallWidth: walls[wallIndex].width,
      wallMargin: wallMarginOf(s, unit),
      others: [
        ...s.units
          .filter((u) => u.id !== unitId && (u.position.wall ?? 0) === wallIndex && obstructs(unit, u))
          .map(unitSpan),
        ...boxSpansOnWall({
          wall: walls[wallIndex], depth: unit.params.depth, boxes: planObstaclesOf(s.project.room, s.project.wallSlopes),
        }),
      ],
    }, getCabinetProfile());
    if (x == null) {
      return {
        wall: unit.position.wall ?? 0,
        x_mm: unit.position.x_mm,
        blocked: true,
        error: `Wall ${wallIndex + 1} has no free space for this unit — move or remove something there first.`,
      };
    }
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, wall: wallIndex, x_mm: x } } : u)),
    }));
    get().refreshAutoParts(unitId);
    return { wall: wallIndex, x_mm: x, blocked: false, error: null };
  },

  // ── interior items ───────────────────────────────────────────────────────
  addItem: (unitId, item) => {
    // Turn 24 (CLAUDE.md F3.1): the same gate, on the other door in. "Adding
    // any drawer-bearing unit (OR drawers to a unit) is blocked."
    if (item?.kind === 'drawer') {
      const gate = drawerBoxGate(get().project.design);
      if (gate.blocked) return null;
    }
    const id = uid(item.kind);
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0] || { width_mm: u.params.width, items: [] };
        // T48-F1: THE FLOOR IS LAW — an element is BORN legal (`onTheFloor`).
        const born = onTheFloor(u, { id, ...item });
        return { ...u, params: { ...u.params, sections: [{ ...section, items: [...section.items, born] }] } };
      }),
    }));
    // A shelf added at a position someone else already occupies is a collision
    // like any other — it goes through the same clamp.
    if (item.kind === 'shelf' && Number.isFinite(item.pos_mm)) get().setShelfPos(unitId, id, item.pos_mm);
    return id;
  },

  /**
   * Replace the drawer stack. `heightMm` is the height every NEW drawer gets;
   * heights already set on surviving drawers are kept, so bumping the count
   * from 2 to 3 does not silently reset the two the user already sized.
   */
  // Turn 33 (CLAUDE.md F3): `variant` rides in — null is the plain box every
  // drawer has always been; 'shoe' | 'belt_tie' | 'belt_tie_glass' add the
  // BOUGHT insert (and the glass) to the BOM. The box itself cuts unchanged.
  addDrawers: (unitId, count, mount = 'overlay', heightMm, zone = null, variant = null) => {
    // Turn 24 (CLAUDE.md F3.1): the hard gate. Removing the last drawer is
    // always allowed — a gate that trapped a stack somebody wanted rid of
    // would be a gate on the wrong side of the door.
    if (count > 0) {
      const gate = drawerBoxGate(get().project.design);
      if (gate.blocked) return { ok: false, error: gate.message };
    }
    // ─── TURN 32 (CLAUDE.md F4): THE RECESSED-PARTITION LAW ────────────────
    // Drawers in a column need that column's walls FULL DEPTH at the runner
    // band. A guard that SPEAKS: the refusal carries the number and the door
    // to the partition's own editor — it fixes nothing by itself.
    if (count > 0 && zone != null) {
      const guard = get().columnDrawerGuard(unitId, zone);
      if (guard.blocked) return { ok: false, error: guard.message, guard };
    }
    const wantZone = zone == null ? null : Math.trunc(Number(zone));
    const fallback = Number(heightMm) > 0
      ? Number(heightMm)
      : getCabinetProfile().wardrobe.drawers.frontHeight;
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0] || { width_mm: u.params.width, items: [] };
        const zoneOf = (i) => (i.zone == null || !Number.isFinite(Number(i.zone))
          ? null : Math.trunc(Number(i.zone)));
        // Turn 32 (CLAUDE.md F4): only THIS zone's stack is replaced — the
        // other columns' drawers are somebody else's answer.
        // ─── TURN 41 (F3): …and the OVERLAY stack it replaces goes with it ───
        // The other half of the switch. An overlay stack stands on the
        // carcass floor and runs the full width, so it collides with a bottom
        // stack in any column; choosing internal clears it, exactly as choosing
        // overlay clears the internal one. Removing the last drawer (count 0)
        // clears nothing else — that is a removal, not a choice.
        const kept = section.items.filter((i) => (i.kind !== 'drawer' || zoneOf(i) !== wantZone)
          && !(count > 0 && i.kind === 'overlay_drawer'));
        const previous = section.items
          .filter((i) => i.kind === 'drawer' && zoneOf(i) === wantZone)
          .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
        const drawers = Array.from({ length: count }, (_, i) => ({
          id: previous[i]?.id || uid('drawer'),
          kind: 'drawer',
          index: i + 1,
          mount,
          ...(wantZone == null ? {} : { zone: wantZone }),
          // Turn 33 (F3): the whole stack takes the asked-for variant; a
          // re-add with none keeps each drawer's own previous answer.
          ...(variant != null ? { variant } : (previous[i]?.variant ? { variant: previous[i].variant } : {})),
          height_mm: Number(previous[i]?.height_mm) > 0 ? Number(previous[i].height_mm) : fallback,
        }));
        return { ...u, params: { ...u.params, sections: [{ ...section, items: [...drawers, ...kept] }] } };
      }),
    }));
    // The drawer stack raises the floor the shelves stand on.
    get().reclampShelves(unitId);
    return { ok: true, error: null };
  },

  /**
   * ─── TURN 40 (CLAUDE.md F3b): OVERLAY DRAWERS IN A WARDROBE ───────────────
   *
   * The owner: *"nadal nie mamy szuflad nawierzchniowych — w sensie żeby były
   * na wierzchu, czyli bez infilla, fronty na szafie, drzwi powyżej szuflad."*
   *
   * A DISTINCT KIND, `overlay_drawer`, beside the internal ones rather than a
   * flag on them. `mount: 'internal'` has meant something else since T32-F4
   * (which of a COLUMN's drawers takes a front) and every wardrobe stack in
   * every saved project already carries `mount: 'overlay'` from `addDrawers`'
   * own default — so reusing that flag would have turned every internal stack
   * in the app inside out on load. This cannot do that to anybody.
   *
   * HEIGHTS DEFAULT TO EQUAL: every drawer gets the same number, which is the
   * workshop's own front height unless the caller says otherwise, and a stack
   * that is re-added keeps whatever each drawer was given. The per-drawer
   * slider is `setDrawerHeight`, unchanged — an overlay drawer is an item and
   * takes the item route like every other wardrobe drawer.
   *
   * The 30 mm hinge strip never applies (CLAUDE.md F3b, unconditionally): an
   * overlay front stands OUTSIDE the carcass, so no door ever swings past it.
   * It falls out of the construction — the strip belongs to the INTERNAL stack
   * — rather than being switched off anywhere.
   */
  // ─── TURN 41 (F3): AND IT IS A SWITCH, NOT A SECOND BUTTON ────────────────
  //
  // MEASURED FAULT. T40 shipped "Drawers (internal)" and "Drawers (overlay)"
  // side by side in the wardrobe's ADD ITEMS offer, and neither one clears the
  // other: `addOverlayDrawers` keeps every non-overlay item and `addDrawers`
  // keeps every overlay item. So a joiner who added internal drawers and then
  // decided he wanted overlay got BOTH — measured on one 900 wardrobe, six
  // DRAWER-FRONT panels at y 0 / 21 / 203 / 221 / 406 / 424, widths alternating
  // 897 and 762, thirty drawer-box boards, two physical stacks interpenetrating
  // in the same 0–624 mm band, and `warnings` empty.
  //
  // THE LAW. A wardrobe has ONE drawer stack and it stands on its floor.
  // Internal and overlay are two ways of BUILDING that stack — behind doors, or
  // fronts on the face — not two stacks. So choosing one clears the other, in
  // the same batch, and the offer becomes the switch the brief asks for.
  //
  // The count is what says which: adding 0 of either kind is a removal and
  // clears nothing else, so "take the overlay drawers off" does not silently
  // delete an internal stack that was never there.
  addOverlayDrawers: (unitId, count, heightMm) => {
    if (count > 0) {
      const gate = drawerBoxGate(get().project.design);
      if (gate.blocked) return { ok: false, error: gate.message };
    }
    const fallback = Number(heightMm) > 0
      ? Number(heightMm)
      : getCabinetProfile().wardrobe.drawers.frontHeight;
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0] || { width_mm: u.params.width, items: [] };
        // T41-F3: choosing overlay clears the internal stack it replaces.
        const kept = section.items.filter((i) => i.kind !== 'overlay_drawer'
          && !(count > 0 && i.kind === 'drawer'));
        const previous = section.items
          .filter((i) => i.kind === 'overlay_drawer')
          .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
        const drawers = Array.from({ length: count }, (_, i) => ({
          id: previous[i]?.id || uid('overlay-drawer'),
          kind: 'overlay_drawer',
          index: i + 1,
          height_mm: Number(previous[i]?.height_mm) > 0 ? Number(previous[i].height_mm) : fallback,
        }));
        return { ...u, params: { ...u.params, sections: [{ ...section, items: [...drawers, ...kept] }] } };
      }),
    }));
    // The stack raises the floor the shelves stand on, exactly as an internal
    // one does — and the FIXED shelf above it is the engine's, not an item.
    get().reclampShelves(unitId);
    return { ok: true, error: null };
  },

  /**
   * ─── TURN 32 (CLAUDE.md F4): MAY THIS COLUMN TAKE DRAWERS? ────────────────
   *
   * The owner's law, 15.08: drawers in a column require that column's walls
   * FULL DEPTH at the runner band. A bounding partition standing back from
   * the front — its own `front_mm`, or the unit's `partition_front_mm` seed,
   * or the profile's interior setback where nobody said anything — has no
   * board where the runner screws go. The refusal names the number and the
   * partition, so the one button ([Reset the setback]) can open its editor.
   */
  columnDrawerGuard: (unitId, zone) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return { blocked: false };
    const profile = getCabinetProfile();
    const items = unit.params.sections?.[0]?.items || [];
    const parts = items
      .filter((i) => i.kind === 'partition' && Number.isFinite(Number(i.x_mm)))
      .sort((a, b) => Number(a.x_mm) - Number(b.x_mm));
    const k = Math.trunc(Number(zone));
    const unitSeed = Number.isFinite(Number(unit.params.partition_front_mm)) && Number(unit.params.partition_front_mm) >= 0
      ? Number(unit.params.partition_front_mm)
      : profile.carcass.interiorSetback;
    for (const [n, item] of [[k - 1, parts[k - 1]], [k, parts[k]]]) {
      if (!item) continue;
      const own = Number(item.front_mm);
      const setback = Number.isFinite(own) && own >= 0 ? own : unitSeed;
      if (setback > 0) {
        return {
          blocked: true,
          setbackMm: setback,
          itemId: item.id,
          panelId: `VPART-${n + 1}`,
          message: `The column's partition stands ${setback} mm back from the front — drawers need its full depth at the runner band.`,
        };
      }
    }
    return { blocked: false };
  },

  /**
   * One height for the WHOLE stack (turn 4, BACKLOG #11: "Equal heights" ✓).
   * One call, one clamp, one re-settle of the shelves above — rather than the UI
   * looping over setDrawerHeight and re-running the shelf clamp per drawer.
   */
  setAllDrawerHeights: (unitId, heightMm) => {
    const DR = getCabinetProfile().wardrobe.drawers;
    const h = Number(heightMm);
    const clamped = Number.isFinite(h)
      ? Math.min(Math.max(h, DR.minFrontHeight), DR.maxFrontHeight)
      : DR.frontHeight;
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections?.[0];
        if (!section) return u;
        return {
          ...u,
          params: {
            ...u.params,
            drawer_equal_heights: true,
            sections: [{
              ...section,
              items: section.items.map((i) => (i.kind === 'drawer' ? { ...i, height_mm: clamped } : i)),
            }],
          },
        };
      }),
    }));
    get().reclampShelves(unitId);
    return clamped;
  },

  /** ✓ = one height for every drawer; unticked = a field per drawer. */
  setDrawerEqualHeights: (unitId, equal) => {
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, drawer_equal_heights: Boolean(equal) } }
        : u)),
    }));
    // Ticking it back on has to MEAN something: the bottom drawer's height (the
    // one the eye starts from) becomes the height of the stack.
    if (equal) {
      const unit = get().units.find((u) => u.id === unitId);
      const bottom = drawersInEngineOrder(unit?.params.sections?.[0]?.items || [])[0];
      if (bottom) get().setAllDrawerHeights(unitId, bottom.height_mm ?? getCabinetProfile().wardrobe.drawers.frontHeight);
    }
  },

  /**
   * Add `count` shelves, each CENTRED in the biggest opening it can find
   * (turn 11, CLAUDE.md F2.3). Returns how many actually fitted, so the caller
   * can say "no room for the rest" instead of silently dropping them.
   *
   * Turn 4 filled from the TOP down, which is what Piotr's "today's default
   * lands wrong" is about: the first shelf in an empty wardrobe went 40 mm under
   * the wieniec, and every set of shelves had to be corrected with Even before
   * it was worth looking at. Halving the opening is what a joiner does, and it
   * still never lands one shelf on another — the biggest opening is by
   * definition the one with the most room in it, and the clamp has the last
   * word as it does on every other path.
   */
  // Turn 33 (CLAUDE.md F3): `variant` rides in — 'shoe' places the tilted
  // shoe shelf (standard pins, front pair set lower; stop rail cut with it).
  addShelves: (unitId, count = 1, zone = null, variant = 'adjustable') => {
    const profile = getCabinetProfile();
    let added = 0;
    for (let i = 0; i < Math.max(1, Math.trunc(count)); i += 1) {
      const unit = get().units.find((u) => u.id === unitId);
      if (!unit) break;
      const items = unit.params.sections?.[0]?.items || [];
      // ─── Turn 12 (CLAUDE.md F5.3): WHICH SIDE ───
      // With a partition present a cabinet has more than one column, and a
      // shelf belongs to ONE of them. The zone is the bay's index, so the
      // shelf follows the partition when it moves; the openings it has to
      // centre itself between are the ones in ITS bay and nobody else's.
      const bay = zoneIndexOf(zone);
      const pos = centredShelfPos({
        // Turn 32 (CLAUDE.md F4): the band is the BAY's — a shelf over a
        // column's drawer stack starts above that column's closing board.
        band: shelfLimits(unit, profile, bay),
        positions: [
          ...shelvesInEngineOrder(items)
            .filter((sh) => (bay == null ? true : zoneIndexOf(sh.zone) === bay))
            .map((sh) => sh.pos_mm),
          // ─── TURN 37 (CLAUDE.md F4a): …AND THE SPLIT DIVIDER IS A BOARD ───
          // The owner: *"powinna być traktowana jak koniec szafy."* An opening
          // may not cross it, so the divider is handed in as what it physically
          // is — a board in this column — and the biggest-opening search stops
          // at it exactly as it stops at a shelf. The list of them is the SAME
          // one the band's own segmentation reads (`splitBoundariesFor`), so
          // the placement and the clamp cannot disagree about where it is.
          ...splitBoundaryPositions(unit, profile, bay),
        ],
        boardT: unit.params.board_t ?? profile.board.thickness,
      }, profile);
      if (pos == null) break;
      // ADJUSTABLE (turn 8, F4). A shelf nobody has said anything about is one
      // you can move; `fixed` means screwed now, and a shelf arriving screwed
      // in is a decision nobody made. Turn 33 (F3): a SHOE shelf arrives as
      // itself; anything unrecognised lands on adjustable, never on nothing.
      get().addItem(unitId, {
        kind: 'shelf',
        variant: SHELF_VARIANTS.includes(variant) ? variant : 'adjustable',
        pos_mm: pos,
        ...(bay == null ? {} : { zone: bay }),
      });
      added += 1;
    }
    return { added, requested: Math.max(1, Math.trunc(count)) };
  },

  /**
   * The bays this cabinet is divided into (turn 12, CLAUDE.md F5.3).
   *
   * What the canvas highlights when a shelf is being added and a partition is
   * present, and what the panel offers as "which side". One zone means there is
   * nothing to ask.
   */
  zonesOf: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return [];
    const profile = getCabinetProfile();
    const items = unit.params.sections?.[0]?.items || [];
    return widthZones({
      width: Number(unit.params.width) || 0,
      boardT: unit.params.board_t ?? profile.board.thickness,
      partitions: items.filter((i) => i.kind === 'partition'),
    });
  },

  /**
   * ─── Centre the partitions (turn 12, CLAUDE.md F5.2) ───
   *
   * "Add a Centre button (like the shelves' Even)." It is the same button on
   * the other axis and it is the same arithmetic: N partitions divide the
   * internal width into N+1 equal CLEAR bays, which is what `evenShelfPositions`
   * computes and what the Even button has done since turn 9. One partition in a
   * 900 mm cabinet lands dead centre, which is the case the owner means.
   */
  centrePartitions: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return 0;
    const profile = getCabinetProfile();
    const G = unit.params.board_t ?? profile.board.thickness;
    const items = unit.params.sections?.[0]?.items || [];
    const parts = items
      .filter((i) => i.kind === 'partition')
      .sort((a, b) => (Number(a.x_mm) || 0) - (Number(b.x_mm) || 0));
    if (!parts.length) return 0;
    const xs = evenShelfPositions({
      zoneBottom: G,
      zoneTop: (Number(unit.params.width) || 0) - G,
      count: parts.length,
      boardT: G,
    });
    parts.forEach((item, i) => {
      get().updateItem(unitId, item.id, { x_mm: snapTo(xs[i], profile.editor.mmStep) });
    });
    // Turn 33 (CLAUDE.md F5): centred dividers re-derive bay-door leaves.
    get().healFrontGaps();
    return parts.length;
  },

  /**
   * Add the hanging rail, as high as it can go under the lowest shelf and clear
   * of the drawer stack below it (BACKLOG #12: "hangers in between"). The chosen
   * hardware travels with the item, so the BOM names the product.
   *
   * ─── TURN 37 (CLAUDE.md F2): IT IS AN ASSEMBLY NOW ────────────────────────
   *
   * The owner, 17.08.2026: *"dlaczego drążek nie może być z półką powyżej, i ta
   * półka być traktowana jak półka, tylko że fix? Zrób półkę nad drążkiem —
   * półka, a drążek dołącz do półki i tyle."*
   *
   * So this makes TWO items, in one undo step: a FIX SHELF, and a rail that
   * names it. The shelf is an ordinary fix shelf from that moment on — it is
   * dragged by hand, it clamps against its neighbours, it is listed and
   * dimensioned and cut like every other shelf — and the rod rides it, because
   * `engine/railAssembly.js` resolves the rod's height FROM the shelf at
   * compute time. There is nothing left to type.
   *
   * WHERE THE SHELF GOES is not a new placement rule. The old law is run
   * exactly as it was (`nextHangerOffset` → the automatic rod height), and the
   * shelf is stood where that rod's PARTITIONER would have stood — `axis +
   * drop`, with `drop` defaulting to the partitioner's own 40. So the rod comes
   * out on the same millimetre it came out on yesterday; what is new is the
   * board above it, and that the joiner can drag it.
   *
   * @returns {string|null} the RAIL's item id, as it always has — the shelf is
   *   reachable from it through `shelf_id`, and `railAssemblyOf` reads the pair.
   */
  addHangerRail: (unitId, {
    materialId = null, materialLabel = null, zone = null,
    // ─── TURN 40 (CLAUDE.md F6): WITH A SHELF, OR ON ITS OWN ───────────────
    // The owner: *"następnie dodawanie drążka raz i z półką proszę — wybór w
    // drążek modal, to ważne."* T37's assembly stays the DEFAULT — that was
    // his own verdict and nothing here overturns it — and this is the
    // alternative, chosen when the rod is added.
    withShelf = true,
  } = {}) => {
    const profile = getCabinetProfile();
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const wantZone = zone == null ? null : Math.trunc(Number(zone));
    const items = unit.params.sections?.[0]?.items || [];
    // Turn 32 (CLAUDE.md F4): one rail PER COLUMN — a second in the same
    // column (or a second unit-wide one) is still refused.
    const zoneOf = (i) => (i.zone == null || !Number.isFinite(Number(i.zone))
      ? null : Math.trunc(Number(i.zone)));
    if (items.some((i) => i.kind === 'hanger' && zoneOf(i) === wantZone)) return null;
    const result = computeCabinet(paramsForEngine(unit), profile);
    const G = unit.params.board_t ?? profile.board.thickness;
    const columnStack = wantZone != null
      ? (result.assemblies.columnDrawers || []).find((c) => c.zone === wantZone)
      : null;
    const zoneBase = columnStack
      ? columnStack.top + G
      : (wantZone == null && result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : G);
    const offset = nextHangerOffset({
      band: shelfLimits(unit, profile, wantZone),
      positions: shelvesInEngineOrder(items).map((sh) => sh.pos_mm),
      zoneBase,
      fallback: unit.params.rail_offset,
    }, profile);
    // T35-F1: a NEW rail answers the datum question at birth, from where the
    // automatic placement actually put it — the nearest thing below it.
    const bornAt = snapTo(offset, profile.editor.mmStep);
    const born = railDatumFor({
      supports: railSupportTops({
        floor: G,
        stackTop: wantZone == null && result.assemblies.drawerZone
          ? result.assemblies.drawerZone.top + G
          : (columnStack ? columnStack.top + G : null),
        shelves: (unit.params.sections?.[0]?.items || [])
          .filter((i) => i.kind === 'shelf')
          .map((i) => ({ id: i.id, top: (Number(i.pos_mm) || 0) + (Number(i.thickness_mm) || G) })),
        ceiling: (Number(unit.params?.height) || 0) - G,
      }),
      axis: (Number(zoneBase) || 0) + bornAt,
    });
    // One undo step for two items: a joiner who presses Ctrl+Z after "Add
    // hanger rail" expects the rail to be gone, not half of it.
    const drop = hangerDropMm(profile);
    const railAxis = (Number(zoneBase) || 0) + bornAt;
    let railId = null;

    // ─── TURN 40 (F6): A ROD ON ITS OWN ──────────────────────────────────────
    //
    // And it is not a new construction. The LEGACY law — `engine/railDatum.js`,
    // untouched since T35 — is the complete, tested answer for a rail with no
    // shelf: it hangs the rod above the nearest thing below it and cuts its own
    // RAIL-PART partitioner over it. So this writes exactly the item the app
    // wrote before T37, plus one field that records WHY it has no shelf —
    // because "somebody asked for it alone" and "it is from an old job" look
    // identical to the geometry and are not the same thing to a person.
    if (!withShelf) {
      return get().addItem(unitId, {
        kind: 'hanger',
        mount: RAIL_MOUNT.ALONE,
        pos_mm: snapTo(born.offset, profile.editor.mmStep),
        datum: born.datum,
        ...(wantZone == null ? {} : { zone: wantZone }),
        material_id: materialId,
        material_label: materialLabel,
      });
    }

    // ─── T37-F2: THE ASSEMBLY ────────────────────────────────────────────────
    runBatch(() => {
      const shelfId = get().addItem(unitId, {
        kind: 'shelf',
        // FIX, and that is the owner's own word: *"traktowana jak półka, tylko
        // że fix"*. It carries a rod; a pin shelf would drop it.
        variant: 'fixed',
        pos_mm: snapTo(assemblyShelfPos({ railAxis, drop }), profile.editor.mmStep),
        ...(wantZone == null ? {} : { zone: wantZone }),
      });
      if (!shelfId) return;
      railId = get().addItem(unitId, {
        kind: 'hanger',
        // THE LINK. `mount: 'shelf'` plus a shelf id is what makes the engine
        // read the new law; a rail without both is a legacy rail and is read
        // by T35's, untouched.
        mount: 'shelf',
        shelf_id: shelfId,
        // The T35 pair is still written, and it is DEAD WEIGHT on purpose
        // (CLAUDE.md F2: *"the engine law may remain as dead weight for legacy
        // only"*). It records where the rod hung at birth, so a reader that
        // has never heard of `mount` — an old export, an old fixture — puts it
        // on the same millimetre rather than at zero.
        pos_mm: snapTo(born.offset, profile.editor.mmStep),
        datum: born.datum,
        ...(wantZone == null ? {} : { zone: wantZone }),
        material_id: materialId,
        material_label: materialLabel,
      });
    });
    return railId;
  },

  /**
   * T37-F2: the two halves of one rail, for the modal and for the tests.
   * `null` when the id names nothing, or names a LEGACY rail — which has no
   * shelf, and must not be given one.
   *
   * @returns {{rail:object, shelf:object}|null}
   */
  railAssemblyOf: (unitId, railItemId) => {
    const items = get().units.find((u) => u.id === unitId)
      ?.params.sections?.[0]?.items || [];
    const rail = items.find((i) => i.id === railItemId && i.kind === 'hanger') || null;
    if (!rail || railMountOf(rail) !== RAIL_MOUNT.SHELF) return null;
    const shelf = items.find((i) => i.kind === 'shelf' && i.id === railShelfIdOf(rail)) || null;
    return shelf ? { rail, shelf } : null;
  },

  // ─── TURN 33 (CLAUDE.md F3): A BOUGHT MECHANISM IN A COLUMN ───────────────
  //
  // Trouser pull-out, tie rack, pull-down rail — an ITEM like a shelf, one
  // per column per kind (a second of the same kind in the same opening is a
  // mechanism nobody can fit). The engine answers with a purchase line and a
  // labelled placeholder; ZERO holes travel with it.
  addWardrobeKit: (unitId, kind, zone = null) => {
    if (!WARDROBE_KIT_KINDS.includes(kind)) return null;
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const wantZone = zone == null ? null : Math.trunc(Number(zone));
    const items = unit.params.sections?.[0]?.items || [];
    const zoneOf = (i) => (i.zone == null || !Number.isFinite(Number(i.zone))
      ? null : Math.trunc(Number(i.zone)));
    if (items.some((i) => i.kind === kind && zoneOf(i) === wantZone)) return null;
    return get().addItem(unitId, {
      kind,
      ...(wantZone == null ? {} : { zone: wantZone }),
    });
  },

  /**
   * ─── TURN 34 (CLAUDE.md F4): THE SHOE BOX ─────────────────────────────────
   *
   * The owner, 16.08.2026: *"jeżeli nie jest szuflada to powinien być fix, nie
   * z pinami — tu jest błąd"*. ONE construction, TWO mounting laws — the
   * variant is the only thing that changes at the door.
   *
   * An ITEM like a shelf, one per column (two shoe boxes in one opening is a
   * thing nobody can fit). The engine cuts the seven boards and drills the
   * carcass sides; this stores the joiner's four decisions and nothing else.
   */
  addShoeBox: (unitId, { variant = 'F', zone = null, dividers = 1, pos_mm = null } = {}) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const wantZone = zone == null ? null : Math.trunc(Number(zone));
    const items = unit.params.sections?.[0]?.items || [];
    const zoneOf = (i) => (i.zone == null || !Number.isFinite(Number(i.zone))
      ? null : Math.trunc(Number(i.zone)));
    if (items.some((i) => i.kind === 'shoe_box' && zoneOf(i) === wantZone)) return null;
    return get().addItem(unitId, {
      kind: 'shoe_box',
      variant: variant === 'D' ? 'D' : 'F',
      dividers: Number(dividers) >= 1 ? 1 : 0,
      ...(pos_mm == null ? {} : { pos_mm: Math.max(0, Math.round(Number(pos_mm) || 0)) }),
      ...(wantZone == null ? {} : { zone: wantZone }),
    });
  },

  /** One shoe box's own fields, patched on the item. */
  setShoeBox: (unitId, itemId, patch) => {
    const clean = {};
    if (patch?.variant != null) clean.variant = patch.variant === 'D' ? 'D' : 'F';
    if (patch?.dividers != null) clean.dividers = Number(patch.dividers) >= 1 ? 1 : 0;
    // T36 F3: the decorative face, on or off. Stored as a plain boolean so an
    // item that has never been asked (every box before this turn) reads ON.
    if (patch?.front != null) clean.front = patch.front !== false && patch.front !== 'false';
    if (patch?.pos_mm != null) clean.pos_mm = Math.max(0, Math.round(Number(patch.pos_mm) || 0));
    if (!Object.keys(clean).length) return null;
    return get().updateItem(unitId, itemId, clean);
  },

  /**
   * ─── TURN 33 (CLAUDE.md F3): HOW HIGH THE RAIL STANDS, OFF THE FLOOR ──────
   *
   * The pull-down suggestion's own measure: the rail's carcass-local y plus
   * the legs under the carcass. Asked of the computed result so the UI and a
   * test read the same number the scene draws.
   */
  railHeightsAboveFloor: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return [];
    const result = get().unitResult(unitId);
    const legH = result.assemblies.carcass.legHeight || 0;
    const out = [];
    if (result.assemblies.rail) out.push({ zone: null, mm: result.assemblies.rail.y + legH });
    for (const r of result.assemblies.columnRails || []) out.push({ zone: r.zone, mm: r.y + legH });
    return out;
  },

  // ─── Per-element overrides (turn 9, CLAUDE.md F4) ───
  //
  // Three things a joiner says about ONE shelf: how far back it stands, how
  // thick it is, and what it is made of. All three live on the ITEM, which is
  // the unit's own config — so they travel through `paramsForEngine()` like
  // every other decision this layer makes, they round-trip through save/load
  // with the rest of the section, and a bare `computeCabinet()` with none of
  // them set cuts exactly what the AutoLISP kit cuts (fixtures/README rule 1).
  //
  // The ENGINE gained no formula for any of this. It gained three inputs.

  /**
   * How far this element's front edge stands back from the face of the cabinet.
   *
   * The stored field is `front_mm` and has been since turn 8 — it is the same
   * number, and giving the drag a second field to write would be two homes for
   * one millimetre. `null` puts the piece back on the profile's default
   * setback, which is what "no override" means everywhere else in this app.
   *
   * Clamped through `engine/collision.js elementDepthBounds`, so the number
   * field in the panel and the drag in the canvas stop at the same place.
   */
  setElementDepth: (unitId, itemId, setbackMm) => {
    const profile = getCabinetProfile();
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    if (setbackMm == null) { get().updateItem(unitId, itemId, { front_mm: null }); return null; }
    const bounds = elementDepthBoundsFor(unit, profile);
    const value = snapTo(clampElementDepth(setbackMm, bounds), profile.editor.mmStep);
    get().updateItem(unitId, itemId, { front_mm: value });
    return { setback: value, ...bounds };
  },

  /**
   * This element's own board thickness. `null` puts it back on the carcass
   * board, which is what every shelf was before turn 9.
   *
   * Clamped to the profile's own board options at the bottom end only — a shelf
   * THICKER than the carcass is the point of the feature (a 25 mm shelf under a
   * microwave), a shelf of 0 is a missing part with a cut-list entry.
   */
  setElementThickness: (unitId, itemId, thicknessMm) => {
    const profile = getCabinetProfile();
    if (thicknessMm == null) { get().updateItem(unitId, itemId, { thickness_mm: null }); return null; }
    const t = Number(thicknessMm);
    if (!Number.isFinite(t) || t <= 0) return null;
    const value = snapTo(Math.min(t, MAX_ELEMENT_THICKNESS), profile.editor.mmStep);
    get().updateItem(unitId, itemId, { thickness_mm: value });
    return value;
  },

  /**
   * What this element is made of. A label and an id, the same pair the hanger
   * rail has carried since turn 4 — the label is what the cut list prints and
   * what a workshop orders against, the id is what a price is looked up by.
   * `null` puts the piece back on the project's carcass material.
   */
  setElementMaterial: (unitId, itemId, material) => {
    get().updateItem(unitId, itemId, {
      material_id: material?.material_id ?? null,
      material_label: material?.material_label ?? null,
      // Turn 16 (CLAUDE.md F1.3): …and WHICH palette row it came from. The pair
      // above says what the board is called; only the key says which of the
      // project's slots it is, and the key is what the picture resolves a
      // surface from (engine/materials.js). Dropping it here — which is what
      // this setter did until the acceptance walk caught it — left a shelf
      // named after Front 2 and painted like the carcass.
      material_key: material?.material_key ?? null,
    });
  },

  /**
   * ─── What ONE piece of the carcass is made of (turn 11, CLAUDE.md F3.1) ───
   *
   * Turn 9 gave a shelf a material of its own, on its ITEM. Everything else in
   * a cabinet is built BY the engine and has no item — so the override is keyed
   * by the engine's own panel id (`BUL`, `TOP`, `END-R`, `INFILL-L-FACE`), which
   * is the id the 3D view draws, the BOM prints and the CNC sheet lays out.
   * Nothing new to keep in step.
   *
   * `null` puts the piece back on the project's own material, which is what
   * "no override" means everywhere else in this app.
   */
  setElementOverride: (unitId, panelId, patch) => {
    if (!panelId) return null;
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const all = { ...(u.params.element_overrides || {}) };
        const next = { ...(all[panelId] || {}), ...patch };
        // An override with nothing left in it is not an override: it is dropped,
        // so a project that has been set and unset saves the same as one that
        // was never touched.
        if (Object.values(next).every((v) => v == null || v === '')) delete all[panelId];
        else all[panelId] = next;
        return {
          ...u,
          params: { ...u.params, element_overrides: Object.keys(all).length ? all : null },
        };
      }),
    }));
    // ─── TURN 33 (CLAUDE.md F5): AN OVERRIDE MAY MOVE A NEIGHBOUR ───────────
    // Removing, restoring or nudging a piece (removeElement / restoreElement /
    // moveElement all land here) can change what stands beside a front —
    // INFILL to WALL, panel to nothing — so the matrix runs. The one funnel
    // covers all three paths the sweep found missing.
    get().healFrontGaps();
    return get().units.find((u) => u.id === unitId)?.params.element_overrides?.[panelId] || null;
  },

  /**
   * ─── Turn 14 (CLAUDE.md F8.2): take an AUTO PART off, or move it ──────────
   *
   * A design-layer override on the unit, never an engine fork — the same
   * channel a material override travels in, so the BOM, the CSV, the sheet and
   * the DXF all follow with nothing told to any of them.
   *
   * A piece that HAS a home of its own is sent there instead: a shelf and a
   * partition are ITEMS, and dropping one through the override would leave the
   * item in the list with nothing on the screen.
   *
   * @returns {'item'|'override'|null} which path it took
   */
  /**
   * ─── TURN 36 (CLAUDE.md F2): THE WHOLE SET, IN ONE BATCH ──────────────────
   *
   * Every piece in the Ctrl+click set, removed through the SAME plan a single
   * Delete goes through (`engine/deleteElement.js deletePlan`) — so a piece
   * the rules refuse is refused here for the same reason and named in the
   * message, rather than silently skipped.
   *
   * The panels are resolved ONCE, up front, against the result as it stands:
   * removing a drawer renumbers the stack, so a plan taken after the first
   * removal would be a plan about a different cabinet.
   *
   * The HEAL SWEEP runs once at the end. A sweep per removal would trim a
   * front against gaps that are about to close.
   */
  // ─── TURN 37 (CLAUDE.md F1): …AND THE SET SPANS CABINETS ─────────────────
  //
  // `refs` may now be MEMBER KEYS (`lib/selection.js memberKey`) as well as
  // bare panel ids. A key carries its own cabinet; a bare id belongs to
  // `unitId`, which is what every caller before tonight passed and what the
  // T36 tests still pass. One list, two shapes, no second action — and the
  // heal sweep still runs ONCE, now per cabinet touched.
  deleteElementSet: (unitId, refs) => {
    const byUnit = new Map();
    const refused = [];
    for (const entry of refs || []) {
      const member = parseMember(entry) || { unitId, elementRef: entry };
      const unit = get().units.find((u) => u.id === member.unitId);
      const result = unit ? get().unitResult(member.unitId) : null;
      if (!unit || !result) continue;
      const panel = result.panels.find((p) => p.id === member.elementRef) || null;
      const plan = deletePlan({ unit, panel });
      if (!plan.allowed) { refused.push(plan.reason); continue; }
      if (!byUnit.has(member.unitId)) byUnit.set(member.unitId, []);
      byUnit.get(member.unitId).push({ ref: member.elementRef, plan });
    }
    if (!byUnit.size) {
      return { ok: false, error: refused[0] || 'Nothing in the selection can be removed.' };
    }
    return runBatch(() => {
      const removed = [];
      for (const [uid_, plans] of byUnit) {
        for (const { ref, plan } of plans) {
          if (plan.target === 'item') get().removeItem(uid_, plan.itemId);
          else get().setElementOverride(uid_, ref, { removed: true });
          removed.push(plan.itemId || ref);
        }
      }
      useUiStore.getState().clearElement();
      get().healFrontGaps();
      return {
        ok: true, removed, refused, next: null,
      };
    });
  },

  removeElement: (unitId, panelId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit || !panelId) return null;
    const result = get().unitResult(unitId);
    const panel = result?.panels.find((p) => p.id === panelId) || null;
    const itemId = panel?.meta?.itemId;
    if (itemId) { get().removeItem(unitId, itemId); return 'item'; }
    get().setElementOverride(unitId, panelId, { removed: true });
    return 'override';
  },

  /**
   * ─── TURN 34 (CLAUDE.md F8): DELETE THE SELECTED ELEMENT ──────────────────
   *
   * The owner, 16.08.2026: *"szuflady i wszystkie inne elementy: po naciśnięciu
   * i podświetleniu — usunięcie przez naciśnięcie Delete; w modalu pokaż też
   * Delete. Jak mamy 3 szuflady, niech usuwają się po jednej, tak jak
   * naciskasz."*
   *
   * ONE action behind BOTH doors — the key and the modal button — because two
   * would drift the first time either learnt something. What it removes and
   * what the selection falls to is `engine/deleteElement.js deletePlan`'s
   * decision; this applies it, moves the selection and runs the heal sweep.
   *
   * There is no undo system: the deletion is immediate and says what it did.
   *
   * @param {object|null} at  { unitId, elementRef } — the UI's own selection
   *                          shape; omitted, the current selection is used.
   * @returns {{ok:boolean, error?:string, removed?:string, next?:string|null}}
   */
  deleteSelectedElement: (at = null) => {
    const sel = at || useUiStore.getState().selectedElement;
    const unitId = sel?.unitId || null;
    const panelId = sel?.elementRef || sel?.panelId || null;
    if (!unitId || !panelId) return { ok: false, error: 'Nothing is selected.' };
    // ─── TURN 36 (CLAUDE.md F2): ONE DELETE REMOVES THE WHOLE SET ───────────
    //
    // "one Delete removes the whole set through the heal sweep." The SET is
    // the UI's, the PLAN is still `deletePlan`'s per piece, and the sweep runs
    // ONCE at the end — a heal per removal would trim a front against gaps
    // that are about to close, and the joiner would watch his doors twitch.
    // Everything goes in one batch, so it is one undo step.
    const set = at ? null : useUiStore.getState().selectedElements;
    if (Array.isArray(set) && set.length > 1) {
      return get().deleteElementSet(unitId, set);
    }
    const unit = get().units.find((u) => u.id === unitId);
    const panel = get().unitResult(unitId)?.panels.find((p) => p.id === panelId) || null;
    const plan = deletePlan({ unit, panel });
    if (!plan.allowed) return { ok: false, error: plan.reason };

    return runBatch(() => {
      if (plan.target === 'item') get().removeItem(unitId, plan.itemId);
      else get().setElementOverride(unitId, panelId, { removed: true });

      // ─── THE SELECTION FALLS (F8, the drawer stack) ───────────────────────
      // Re-read the cabinet AFTER the removal — the stack has renumbered
      // itself — and land on the drawer the plan named, so the next press
      // takes the next one down without the pointer moving.
      let next = null;
      if (plan.nextDrawer != null) {
        const after = get().unitResult(unitId);
        const family = panel.part === 'DRAWER-FRONT' ? 'DRAWER-FRONT' : panel.part;
        next = after?.panels.find((p) => p.part === family
          && Number(p.meta?.drawer) === plan.nextDrawer)?.id
          || after?.panels.find((p) => Number(p.meta?.drawer) === plan.nextDrawer)?.id
          || null;
      }
      if (next) useUiStore.getState().selectElement(unitId, next);
      else useUiStore.getState().clearElement();

      // ─── AND EVERY REMOVAL PATH RUNS THE SWEEP (F8 → T33-F5) ─────────────
      // A piece leaving re-shapes what stands beside a front — an end panel
      // gone, a drawer gone from under a bay door — so the matrix is applied
      // here exactly as it is on every other path that re-shapes one. No
      // healable correction may be left standing after a delete.
      get().healFrontGaps();
      return { ok: true, removed: plan.itemId || panelId, next };
    });
  },

  /** Put a removed piece back — the override is a decision, and it is undone. */
  restoreElement: (unitId, panelId) => {
    get().setElementOverride(unitId, panelId, { removed: null });
    return true;
  },

  /**
   * Nudge a piece in the cabinet's own frame. `delta` is ABSOLUTE — the total
   * offset from where the kit puts it — so typing 0 puts it back.
   */
  moveElement: (unitId, panelId, delta) => {
    const move = {
      x: Number(delta?.x) || 0, y: Number(delta?.y) || 0, z: Number(delta?.z) || 0,
    };
    const empty = !move.x && !move.y && !move.z;
    get().setElementOverride(unitId, panelId, { move: empty ? null : move });
    return move;
  },

  /**
   * A vertical partition, addable like a shelf (turn 11, CLAUDE.md F3.4).
   *
   * The engine has taken `kind: 'partition'` items since turn 8 — this is the
   * UI-level way in that BLOCKERS #50 was waiting for. It is placed and edited
   * exactly as a shelf is: a position along the cabinet's WIDTH rather than its
   * height, through the same item list and the same overrides.
   */
  addPartition: (unitId, xMm = null) => {
    const profile = getCabinetProfile();
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const G = unit.params.board_t ?? profile.board.thickness;
    const W = Number(unit.params.width) || 0;
    const taken = (unit.params.sections?.[0]?.items || [])
      .filter((i) => i.kind === 'partition' && Number.isFinite(i.x_mm))
      .map((i) => i.x_mm)
      .sort((a, b) => a - b);
    // Centred in the widest clear bay, exactly as an added shelf halves the
    // biggest opening (F2.3) — the same gesture, on the other axis.
    const faces = [G, ...taken.flatMap((x) => [x, x + G]), W - G];
    let best = null;
    for (let i = 0; i < faces.length - 1; i += 2) {
      const size = faces[i + 1] - faces[i];
      if (!best || size > best.size) best = { from: faces[i], size };
    }
    if (!best || best.size < G + 2 * profile.editor.minShelfGap) return null;
    // `xMm != null` before the finite test, and not `Number.isFinite(Number(xMm))`
    // alone: `Number(null)` is 0, so "nobody said where" would read as "hard
    // against the left side" — the same trap CLAUDE.md rule 15 is about.
    const wanted = xMm != null && Number.isFinite(Number(xMm))
      ? Number(xMm)
      : best.from + (best.size - G) / 2;
    const x = snapTo(Math.min(Math.max(wanted, G), W - G - G), profile.editor.mmStep);
    const id = get().addItem(unitId, { kind: 'partition', x_mm: x });
    // Turn 33 (CLAUDE.md F5): with BAY DOORS the leaf widths re-derive from
    // the partitions — a divider appearing re-shapes the fronts, so the
    // matrix runs, exactly as it does when a neighbour appears.
    get().healFrontGaps();
    return id;
  },

  /**
   * Where a vertical partition stands, along the cabinet's WIDTH.
   *
   * The twin of `setShelfPos` on the other axis, and the same rule: this is the
   * ONE way the number is ever written, so the field in the panel and anything
   * added later are clamped identically. It stops one minimum gap clear of the
   * carcass sides and of any partition already standing beside it — a divider
   * you could not get a hand between is not a bay.
   */
  setPartitionX: (unitId, itemId, xRaw) => {
    const profile = getCabinetProfile();
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const G = unit.params.board_t ?? profile.board.thickness;
    const W = Number(unit.params.width) || 0;
    const gap = profile.editor.minShelfGap;
    const others = (unit.params.sections?.[0]?.items || [])
      .filter((i) => i.kind === 'partition' && i.id !== itemId && Number.isFinite(i.x_mm))
      .map((i) => Number(i.x_mm))
      .sort((a, b) => a - b);
    const self = Number(unit.params.sections?.[0]?.items?.find((i) => i.id === itemId)?.x_mm) || G;
    const below = [...others].filter((x) => x <= self).pop();
    const above = others.find((x) => x > self);
    const min = Math.max(G + gap, below != null ? below + gap : G + gap);
    const max = Math.min(W - 2 * G - gap, above != null ? above - gap : W - 2 * G - gap);
    if (max < min) return { x: self, min, max, blocked: true };
    const x = snapTo(Math.min(Math.max(Number(xRaw) || 0, min), max), profile.editor.mmStep);
    get().updateItem(unitId, itemId, { x_mm: x });
    // Turn 33 (CLAUDE.md F5): bay-door leaves follow the divider — re-measured.
    get().healFrontGaps();
    return {
      x, min, max, blocked: false,
    };
  },

  /**
   * One drawer's height. Clamped by the engine, then the shelves re-settle.
   *
   * ─── Turn 17 (CLAUDE.md F8.2) ───
   * Two kinds of drawer stack, ONE call. A WARDROBE's drawers are ITEMS — each
   * one has an id, and this has taken that id since turn 4. A BUDR's are a
   * RATIO, so its drawers have no ids at all and the only handle on one is its
   * position in the stack. Rather than give the panel two functions to choose
   * between, the second argument takes either. The clamp is the right one for
   * the kit in both branches — the workshop's front-height limits for the
   * wardrobe, the owner's runner rule for the BUDR (F8.3).
   *
   * ─── TURN 18 (CLAUDE.md F2.1): THE FORK ASKED THE WRONG QUESTION ─────────
   *
   * Owner: a kitchen drawer's height is typed in, and it snaps straight back to
   * the kit's number. One root, and it is this line.
   *
   * Turn 17 routed on `typeof ref === 'number'` — "no id means a BUDR". But a
   * kitchen drawer unit gets ITEM ROWS the moment it is placed (`newUnit`
   * above: a drawer unit IS its drawers), so its drawers DO have ids, the call
   * took the wardrobe route, and it wrote `height_mm` onto an item. The budr
   * engine only ever reads `params.drawer_heights`. The number landed
   * somewhere nothing looks, and the next render read the kit's ratio back.
   *
   * So the fork asks the KIT, which is the thing that decides how a stack is
   * built, instead of asking what shape the caller happened to have to hand. A
   * BUDR takes the ratio route whatever the ref is — an id is resolved to the
   * drawer's INDEX from the unit's own rows — and the wardrobe route stays
   * exactly as it was for the kit whose drawers really are items.
   */
  setDrawerHeight: (unitId, ref, heightMm) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (getUnitType(unit?.type)?.drawerStyle === 'budr') {
      return get().setBudrDrawerHeight(unitId, budrDrawerIndex(unit, ref), heightMm);
    }
    if (typeof ref === 'number') return get().setBudrDrawerHeight(unitId, ref, heightMm);
    const itemId = ref;
    const DR = getCabinetProfile().wardrobe.drawers;
    const h = Number(heightMm);
    const clamped = Number.isFinite(h)
      ? Math.min(Math.max(h, DR.minFrontHeight), DR.maxFrontHeight)
      : DR.frontHeight;
    get().updateItem(unitId, itemId, { height_mm: clamped });
    get().reclampShelves(unitId);
    return clamped;
  },

  removeItem: (unitId, itemId) => {
    const removedKind = get().units.find((u) => u.id === unitId)
      ?.params.sections?.[0]?.items?.find((i) => i.id === itemId)?.kind || null;
    const wasDrawer = removedKind === 'drawer';
    const wasPartition = removedKind === 'partition';
    // ─── T37-F2: THE ASSEMBLY LEAVES TOGETHER ────────────────────────────────
    // A rod hangs on ITS shelf and on nothing else. Take the shelf out and the
    // rod has nothing to hang from — the engine already refuses to draw it
    // (`railAssembly.js`: a rail whose shelf is gone is not there), so leaving
    // the item behind would leave an invisible rail in the section and a
    // hardware line in the BOM for a rod nobody can see. It goes with its
    // shelf. A LEGACY rail is never touched by this: it names no shelf.
    const ridersOfRemoved = removedKind === 'shelf'
      ? (get().units.find((u) => u.id === unitId)?.params.sections?.[0]?.items || [])
        .filter((i) => i.kind === 'hanger' && railShelfIdOf(i) === itemId)
        .map((i) => i.id)
      : [];
    const goneIds = new Set([itemId, ...ridersOfRemoved]);
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections[0];
        let items = section.items.filter((i) => !goneIds.has(i.id));
        if (wasDrawer) {
          // Renumber bottom-up, so drawer i keeps meaning "i-th from the floor"
          // for the engine, the runner rows and the cut list.
          let n = 0;
          const order = new Map(items.filter((i) => i.kind === 'drawer')
            .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))
            .map((i) => [i.id, (n += 1)]));
          items = items.map((i) => (order.has(i.id) ? { ...i, index: order.get(i.id) } : i));
        }
        return { ...u, params: { ...u.params, sections: [{ ...section, items }] } };
      }),
    }));
    if (wasDrawer) get().reclampShelves(unitId);   // the floor just dropped
    // Turn 33 (CLAUDE.md F5): a partition leaving re-derives any bay-door
    // leaves over it — the one removed kind that re-shapes a front.
    if (wasPartition) get().healFrontGaps();
  },

  /**
   * ─── TURN 35 (CLAUDE.md F1): THE RAIL'S HEIGHT, EDITED ──────────────────
   *
   * The owner: *"nie mogę ustawić wysokości raila — sam się wstawia, i jak
   * edytuję dwuklikiem, to nie ma opcji ustawienia wysokości."* This is that
   * option. The number is HEIGHT ABOVE THE SUPPORT — `engine/railDatum.js`
   * decides which board that is at compute time — so it is written straight
   * onto the item and nothing here resolves anything. Refused below zero: a
   * rail under its own support is not a number anybody meant.
   *
   * @returns {{ok:boolean, mm:number}|{ok:false, error:string}}
   */
  /**
   * ─── TURN 42 (CLAUDE.md F1): DRAG THE ROD ─────────────────────────────────
   *
   * *"Dragging the ALONE rod writes the item's `pos_mm` (the same store path a
   * shelf drag uses), and the engine's next answer moves the rod."*
   *
   * It IS the shelf's path, said for a rod: SNAP here (the editor's grid, the
   * same `profile.editor.mmStep` `moveShelf` uses), CLAMP in the engine (which
   * is the only thing that knows the carcass — `clampRailAxis`), and write the
   * one number through the one setter. There is no second copy of the height
   * anywhere: `setRailHeight` — the modal's field — is the same write, and the
   * rod's position comes back off `assemblies.rail.y` either way.
   *
   * `offsetMm` is the rod's height ABOVE ITS OWN SUPPORT, which is what
   * `pos_mm` has meant on a hanger item since T35. The view subtracts the
   * support the engine published; nothing here has to resolve a datum again.
   */
  moveRail: (unitId, itemId, offsetMm) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const item = (unit.params.sections?.[0]?.items || [])
      .find((i) => i.id === itemId && i.kind === 'hanger');
    if (!item) return null;
    // An ASSEMBLY's rod is not dragged — its shelf is, and the rod follows
    // (`setShelfPos` re-derives every rider). Refusing here as well as in the
    // view is the belt to the braces: one rod, one owner of its height.
    if (railMountOf(item) === RAIL_MOUNT.SHELF) return null;
    const profile = getCabinetProfile();
    const pos = snapTo(Math.max(0, Number(offsetMm) || 0), profile.editor.mmStep);
    if (pos === item.pos_mm) return { pos };
    get().updateItem(unitId, itemId, { pos_mm: pos });
    return { pos };
  },

  setRailHeight: (unitId, itemId, mmRaw) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return { ok: false, error: 'No such cabinet.' };
    const item = (unit.params.sections?.[0]?.items || [])
      .find((i) => i.id === itemId && i.kind === 'hanger');
    if (!item) return { ok: false, error: 'That is not a hanging rail.' };
    const profile = getCabinetProfile();
    const mm = snapTo(Math.max(0, Number(mmRaw) || 0), profile.editor.mmStep);
    // The DATUM does not move when the number does. "Height above support"
    // means this far above THE BOARD IT HANGS FROM, and typing a bigger number
    // raises the rod — it does not re-hang it on something else. The datum is
    // answered once, when the rail is placed (`addHangerRail`), and re-answered
    // only by the engine's own fallback if that board is later taken out.
    get().updateItem(unitId, itemId, { pos_mm: mm });
    return { ok: true, mm, datum: item.datum || null };
  },

  updateItem: (unitId, itemId, patch) => set((s) => ({
    units: s.units.map((u) => {
      if (u.id !== unitId) return u;
      const section = u.params.sections[0];
      return {
        ...u,
        // T48-F1: …and it STAYS legal. The same one station, on the other door
        // in: a typed number, a drag, a modal's patch and an imported project
        // all arrive here, and none of them may put a piece under the floor.
        params: {
          ...u.params,
          sections: [{
            ...section,
            items: section.items.map((i) => (i.id === itemId ? onTheFloor(u, { ...i, ...patch }) : i)),
          }],
        },
      };
    }),
  })),

  /**
   * Even out the shelves in the free zone — the "Even" button and the
   * right-click "Centre shelves".
   *
   * ─── Turn 9 (CLAUDE.md F3) ───
   * The arithmetic is the AutoLISP's, and it lives in engine/items.js
   * `evenShelfPositions` so there is one copy of it (KIT_WARDROBE_FULL.lsp
   * L133-142). Two things were wrong here and both are fixed by using it:
   *
   *   1. the shelves were spread over the DRAG BAND (`min`..`max`) instead of
   *      over the shelf ZONE (`floor`..`ceiling`), so the outer openings came
   *      out `editor.minShelfEdgeGap` short of the inner ones — which is
   *      exactly the "gaps are NOT equal" Piotr reported;
   *   2. the positions were handed out in ARRAY order, so a shelf that had been
   *      dragged past another one kept its place in the list and the two swapped
   *      physical positions when the button was pressed.
   *
   * They are assigned bottom-up now, which is the engine's own order (S1 is the
   * lowest shelf everywhere else in the system).
   *
   * ─── TURN 37 (CLAUDE.md F4a): AND A SPLIT DIVIDER IS A ZONE BOUNDARY ──────
   *
   * The owner, of the divider T36 puts on the split line: *"jeśli daję centruj
   * półki, to ponad tą poprzeczką powinny się centrować według tej poprzeczki,
   * i to samo z dolną — taka sama rola."*
   *
   * So the button no longer spreads one ladder over the whole carcass and lets
   * it walk through the divider. The band is cut into SEGMENTS by the one law
   * (`engine/collision.js bandSegments`, applied in `shelfBandSegmentsFor`),
   * each shelf stays in the segment it is already in, and the kit's own formula
   * is run ONCE PER SEGMENT with that segment's own floor and ceiling. Three
   * shelves under the divider and two above come out as three even openings and
   * two even openings, which is what a joiner means by "even".
   *
   * With NO divider there is exactly one segment and it is the band itself, so
   * this is the same single call turn 9 wrote, over the same two numbers.
   */
  redistributeShelves: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return;
    const profile = getCabinetProfile();
    const segments = shelfBandSegmentsFor(unit, profile);
    const items = unit.params.sections[0].items;
    const shelves = shelvesInEngineOrder(items);
    // Which segment each shelf is in NOW. A shelf keeps its side of the
    // divider — Even is a spacing button, not a re-arrangement, and a board
    // that jumped the crossbar because the count came out neater would be the
    // "shelves swapped places" bug turn 9 fixed, one storey up.
    const mine = (sh) => segments.indexOf(segments.find((b) => sh.pos_mm >= b.floor && sh.pos_mm < b.ceiling)
      ?? segments[segments.length - 1]);
    const at = new Map();
    segments.forEach((limits, index) => {
      const here = shelves.filter((sh) => (segments.length === 1 ? true : mine(sh) === index));
      const positions = evenShelfPositions({
        // The kit's own bounds: the top face of whatever closes the space below
        // (drawer partition, rail partitioner, or the base panel) and the
        // underside of the top panel — or, above a split divider, the divider
        // itself in the base's role (T37-F4a).
        zoneBottom: limits.floor,
        zoneTop: limits.ceiling,
        count: here.length,
        // ─── Turn 11 (CLAUDE.md F2.1/F2.2) ───
        // …and the board itself, which is what turn 9 left out. The zone was
        // right; the arithmetic accounted a thickness at one end only, so the
        // LOWEST opening came out one board bigger than every other one — the
        // 244.5 against 226.5 / 227 on Piotr's screenshot. A shelf THIS unit is
        // built from, not the profile's: a 22 mm carcass spaces its shelves for
        // 22 mm shelves.
        boardT: unit.params.board_t ?? profile.board.thickness,
      });
      here.forEach((sh, i) => at.set(sh.id, snapTo(positions[i], profile.editor.mmStep)));
    });
    const next = items.map((i) => (at.has(i.id) ? { ...i, pos_mm: at.get(i.id) } : i));
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, sections: [{ ...u.params.sections[0], items: next }] } } : u)),
    }));
    // Even spacing can still be too tight when the band is short; the clamp has
    // the final word, as it does for every other path.
    get().reclampShelves(unitId);
  },

  /**
   * The ONE way a shelf position is ever written. The drag calls it, the number
   * field in the right panel calls it, and anything added later must call it
   * too: the clamp lives on this side of the setter, not in the caller.
   */
  // ─── HINGES, BY HAND (turn 17, CLAUDE.md F7.2) ────────────────────────────
  //
  // "Hinges are editable per door: add one, remove one, move one. Same editing
  // idiom as shelves (turn 9/11 per-element editing), so a joiner who can move a
  // shelf can move a hinge without learning a new gesture."
  //
  // So: one setter that owns the clamp and the grid, exactly as `setShelfPos`
  // does, and add/remove written in terms of it. The list is the CABINET's —
  // its doors are drilled as a set, and the carcass carries one hinge column per
  // hinged side — and it is stored as plain millimetres up the carcass, which is
  // the frame `hingeCentres` has always worked in.
  //
  // Storing a list at all is what turns the kit's rule off for this cabinet
  // (engine/cabinet.js `hingeRows`): once a joiner has said where the hinges
  // go, a rule that argued with him would be the app overruling the bench.
  // `resetHinges` hands it back.

  /**
   * This cabinet's hinge rows as they stand — the rule's, or its own.
   *
   * ─── TURN 40 (CLAUDE.md F1): ASK IT ABOUT A DOOR ──────────────────────────
   *
   * Hand it a PANEL id and it answers about that door. For every door in the
   * app that is not a leaf of a split that is the cabinet's own ladder, exactly
   * as it has been since T17 — the carcass carries one hinge column per hinged
   * side and both leaves are drilled as a set. For a SPLIT SEGMENT it is that
   * segment's own two-or-three rows, because a split is two doors and each one
   * hangs on its own.
   *
   * Called with no panel — every caller written before tonight — it is the
   * cabinet's ladder, unchanged.
   */
  hingeRowsOf: (unitId, panelId = null) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return [];
    // `drillSummary`, not `derived`: the hinge centres are a DRILLING fact and
    // the engine has always filed them there (engine/cabinet.js). Reading the
    // wrong one gave an empty list, and an empty list is a cabinet the panel
    // offers no hinges to edit.
    const result = get().unitResult(unitId);
    if (panelId && hasOwnHingeRows(result, panelId)) return doorHingeRows(result, panelId);
    return result?.drillSummary?.hinge_centers || [];
  },

  /**
   * ─── TURN 40 (CLAUDE.md F1): THE SEGMENT A HINGE EDIT IS ABOUT ────────────
   *
   * A split leaf's segment, its own span up the carcass, and its siblings —
   * the three facts every hinge setter below needs and none of them should
   * work out twice. Null for a door that is not a split segment, which is the
   * branch that keeps every path written before tonight exactly where it was.
   */
  splitHingeTargetOf: (unitId, panelId) => {
    if (!panelId) return null;
    const result = get().unitResult(unitId);
    if (!hasOwnHingeRows(result, panelId)) return null;
    const panel = (result.panels || []).find((p) => p.id === panelId);
    if (!panel?.box) return null;
    // Its own leaf, and nothing above or below it: a top-leaf hinge that could
    // be typed down into the bottom leaf would be a hinge screwed to air.
    const from = Number(panel.box.y) || 0;
    const to = from + (Number(panel.box.h) || 0);
    // The OTHER SEGMENTS OF THIS LEAF. They are drilled into one hinge column
    // — the same side of the carcass, one above the other — so the spacing
    // rule is asked of them together: a top-leaf hinge dropped onto the split
    // line and a bottom-leaf hinge just under it are a doubled hole. The other
    // LEAF of the pair is a different column on the opposite side and its rows
    // are its own business, which is why this is scoped by `splitOf` and not
    // by "every segment in the cabinet".
    const siblings = (result.panels || [])
      .filter((p) => p.id !== panelId && p.meta?.splitOf && p.meta.splitOf === panel.meta?.splitOf)
      .flatMap((p) => doorHingeRows(result, p.id));
    return {
      panelId, from, to, rows: doorHingeRows(result, panelId), siblings,
    };
  },

  /** The one writer for a split segment's ladder. Sorted, and its own key only. */
  setSplitHingeRows: (unitId, panelId, rows) => set((st) => ({
    units: st.units.map((u) => (u.id === unitId
      ? {
        ...u,
        params: {
          ...u.params,
          split_hinge_rows: {
            ...(u.params.split_hinge_rows || {}),
            [panelId]: [...rows].sort((a, b) => a - b),
          },
        },
      }
      : u)),
  })),

  /**
   * Move one hinge. Clamped to the carcass and snapped to the workshop grid.
   *
   * ─── TURN 31 (CLAUDE.md F3): AND REFUSED AT THE SOURCE ───────────────────
   *
   * The proven live bug: `hinge_rows [100, 100, 470]` is storable from this
   * setter today, and `computeCabinet()` then emits the cups at 84 and 116
   * TWICE — same panel, same layer, same coordinate. A 5 mm bit going back into
   * a hole it has already made.
   *
   * Turn 17's clamp was already trying to stop it ("never on top of the one
   * next to it") and it was TOO SMALL: `holePairOffset * 2` is 32 mm, which is
   * the two holes of ONE hinge, not the room two hinges need. The line is
   * `hingeMinSpacingMm` — profile, 60, the owner's number — and it is the SAME
   * number the guard reports at (engine/cnc/drillGuard.js), so the setter and
   * the Check can never disagree about what is legal.
   *
   * And it REFUSES rather than repairing: turn 17's clamp slid the row to the
   * nearest legal place, which is the app deciding where a hinge goes. Rule 4 —
   * the guard SPEAKS. A blocked move returns the reason with the number in it
   * and leaves the ladder exactly as it was; `hinges.spacingBlocks: false` is
   * the one profile line that turns the refusal into a warning.
   *
   * @returns {number|null} the position it landed at, or null when refused —
   *          with `{ blocked, message }` on the object either way.
   */
  setHingePos: (unitId, index, mm, panelId = null) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const min = hingeMinSpacingMm(profile);
    // ─── TURN 40 (CLAUDE.md F1): A SPLIT SEGMENT MOVES ITS OWN ─────────────
    //
    // "Those hinges are movable in the Doors modal, like any other door's",
    // and "moving a top-leaf hinge does not move a bottom-leaf hinge". Both
    // fall out of writing to the SEGMENT's key rather than to the cabinet's
    // one list. The clamp is the LEAF and not the carcass, because a hinge
    // typed past the split line would be screwed to a door that is not there;
    // the spacing rule is asked of every segment together, because they share
    // one hinge column in the side.
    const target = s.splitHingeTargetOf(unitId, panelId);
    if (target) {
      const rows = [...target.rows];
      if (index < 0 || index >= rows.length) return null;
      const pos = Math.min(Math.max(snapTo(Number(mm) || 0, profile.editor.mmStep), target.from), target.to);
      const next = rows.map((v, i) => (i === index ? pos : v));
      const column = [...next, ...target.siblings].sort((a, b) => a - b);
      const clash = hingeRowClashes(column, { minSpacingMm: min, unitNum: unit.params.unit_num });
      if (clash.length && hingeSpacingBlocks(profile)) {
        return { blocked: true, message: clash[0].message, minSpacingMm: min };
      }
      s.setSplitHingeRows(unitId, panelId, next);
      return clash.length
        ? { pos, blocked: false, message: clash[0].message, minSpacingMm: min }
        : pos;
    }
    const rows = [...s.hingeRowsOf(unitId)];
    if (index < 0 || index >= rows.length) return null;
    const H = Number(unit.params.height) || 0;
    // The carcass is still the clamp: a hinge cannot be off the board.
    const pos = Math.min(Math.max(snapTo(Number(mm) || 0, profile.editor.mmStep), 0), H);
    const next = rows.map((v, i) => (i === index ? pos : v));
    const clash = hingeRowClashes(next, { minSpacingMm: min, unitNum: unit.params.unit_num });
    if (clash.length && hingeSpacingBlocks(profile)) {
      return { blocked: true, message: clash[0].message, minSpacingMm: min };
    }
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, hinge_rows: next } } : u)),
    }));
    return clash.length
      ? { pos, blocked: false, message: clash[0].message, minSpacingMm: min }
      : pos;
  },

  /**
   * One more hinge, in the biggest gap in the run — where a joiner would put it.
   *
   * Turn 31 (CLAUDE.md F3): and REFUSED where the biggest gap is not big
   * enough. A ladder with no room left for another hinge is a ladder that gets
   * one dropped on top of an existing row, which is the doubled hole again by a
   * different door.
   */
  addHinge: (unitId, panelId = null) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const min = hingeMinSpacingMm(profile);
    // TURN 40 (F1): the same gesture on a split segment adds to THAT leaf, in
    // the biggest gap in ITS OWN run, clamped to its own board.
    const target = s.splitHingeTargetOf(unitId, panelId);
    if (target) {
      const own = [...target.rows];
      let bestAt = null;
      let bestGap = -1;
      for (let i = 0; i < own.length - 1; i += 1) {
        const span = own[i + 1] - own[i];
        if (span > bestGap) { bestGap = span; bestAt = (own[i] + own[i + 1]) / 2; }
      }
      if (bestAt == null) bestAt = own.length ? own[0] + profile.hinges.endOffset : (target.from + target.to) / 2;
      const at = Math.min(Math.max(snapTo(bestAt, profile.editor.mmStep), target.from), target.to);
      const next = [...own, at].sort((a, b) => a - b);
      const column = [...next, ...target.siblings].sort((a, b) => a - b);
      const clash = hingeRowClashes(column, { minSpacingMm: min, unitNum: unit.params.unit_num });
      if (clash.length && hingeSpacingBlocks(profile)) {
        return {
          blocked: true,
          message: `No room for another hinge: ${clash[0].message}`,
          minSpacingMm: min,
        };
      }
      s.setSplitHingeRows(unitId, panelId, next);
      return at;
    }
    const rows = [...s.hingeRowsOf(unitId)];
    const H = Number(unit.params.height) || 0;
    if (!rows.length) {
      const at = snapTo(H / 2, profile.editor.mmStep);
      set((st) => ({
        units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, hinge_rows: [at] } } : u)),
      }));
      return at;
    }
    let bestAt = null;
    let bestGap = -1;
    for (let i = 0; i < rows.length - 1; i += 1) {
      const span = rows[i + 1] - rows[i];
      if (span > bestGap) { bestGap = span; bestAt = (rows[i] + rows[i + 1]) / 2; }
    }
    // A door with one hinge on it has no gap between two — halfway to the top
    // is the honest answer and the clamp below keeps it on the carcass.
    if (bestAt == null) bestAt = Math.min(H, rows[0] + profile.hinges.endOffset);
    const at = snapTo(bestAt, profile.editor.mmStep);
    const next = [...rows, at].sort((a, b) => a - b);
    const clash = hingeRowClashes(next, { minSpacingMm: min, unitNum: unit.params.unit_num });
    if (clash.length && hingeSpacingBlocks(profile)) {
      return {
        blocked: true,
        message: `No room for another hinge: ${clash[0].message}`,
        minSpacingMm: min,
      };
    }
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, hinge_rows: next } } : u)),
    }));
    return at;
  },

  /** One fewer. The list is what remains, not a rule with a hole in it. */
  removeHinge: (unitId, index, panelId = null) => {
    const s = get();
    // TURN 40 (F1): off THIS leaf, when the door is a split segment.
    const target = s.splitHingeTargetOf(unitId, panelId);
    if (target) {
      if (index < 0 || index >= target.rows.length) return null;
      const next = target.rows.filter((_, i) => i !== index);
      s.setSplitHingeRows(unitId, panelId, next);
      return next.length;
    }
    const rows = s.hingeRowsOf(unitId);
    if (index < 0 || index >= rows.length) return null;
    const next = rows.filter((_, i) => i !== index);
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, hinge_rows: next } } : u)),
    }));
    return next.length;
  },

  /**
   * Hand this cabinet back to the kit's own maths and the project standard.
   *
   * TURN 40 (F1): named with a split segment it hands back THAT leaf only —
   * the key is dropped, and the kit's ladder for that segment's own height
   * answers again. The other leaf keeps whatever it was given.
   */
  resetHinges: (unitId, panelId = null) => set((st) => ({
    units: st.units.map((u) => {
      if (u.id !== unitId) return u;
      if (panelId && u.params.split_hinge_rows && u.params.split_hinge_rows[panelId]) {
        const next = { ...u.params.split_hinge_rows };
        delete next[panelId];
        return {
          ...u,
          params: {
            ...u.params,
            split_hinge_rows: Object.keys(next).length ? next : null,
          },
        };
      }
      if (panelId) return u;
      return { ...u, params: { ...u.params, hinge_rows: null } };
    }),
  })),

  // ─── DRAWER FRONTS, AND THE HEIGHTS UNDER THEM (turn 17, CLAUDE.md F8) ───
  //
  // "Remove drawer fronts on a drawer unit — the same idiom as turn 15's Remove
  // doors — so the boxes can be worked on." Literally the same idiom: one flag
  // on the unit, the same `{ removed, already }` answer, so the panel that
  // counts doors can count these without asking the engine anything.

  /** Take the fronts off a drawer unit. The boxes and the carcass are untouched. */
  removeDrawerFronts: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return { removed: 0, already: true };
    if (unit.params.drawer_fronts === false) return { removed: 0, already: true };
    const count = get().unitResult(unitId)?.panels.filter((p) => p.part === 'DRAWER-FRONT').length || 0;
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, drawer_fronts: false } } : u)),
    }));
    // Turn 33 (CLAUDE.md F5): a BUDR face IS a run front — its neighbours'
    // wanted clearances change when the face leaves, exactly as a door's do
    // (setDoors has healed since T32; this path never did).
    get().healFrontGaps();
    return { removed: count, already: false };
  },

  /** …and put them back. */
  addDrawerFronts: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return { fitted: 0, already: true };
    if (unit.params.drawer_fronts !== false) return { fitted: 0, already: true };
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, drawer_fronts: true } } : u)),
    }));
    // Turn 33 (CLAUDE.md F5): the faces return — measured again, like a door.
    get().healFrontGaps();
    return { fitted: get().unitResult(unitId)?.panels.filter((p) => p.part === 'DRAWER-FRONT').length || 0, already: false };
  },

  /**
   * ONE drawer's height (F8.2) — its HEIGHT and never its position, which is
   * what the owner was explicit about: a stack is a stack, and moving one
   * drawer up would open a slot under it.
   *
   * The clamp is the OWNER's and it lives in the engine
   * (`clampDrawerFrontHeight`), so a number typed here, a number that arrives in
   * a template and a number in a project saved last year are all refused the
   * same way. What is passed as the ceiling is what is physically left in the
   * face once every other drawer has its own minimum.
   */
  setBudrDrawerHeight: (unitId, index, mm) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const result = s.unitResult(unitId);
    const heights = result?.derived?.drawer_heights || [];
    if (index < 0 || index >= heights.length) return null;
    const B = profile.baseDrawerUnit;
    const floor = minDrawerFrontHeight(profile);
    // The face, less every gap, less the shortest the other drawers may be.
    const available = (Number(unit.params.height) || 0) - heights.length * B.gap;
    const max = available - (heights.length - 1) * floor;
    // ─── Turn 18 (CLAUDE.md F2.1) ───
    // Only what somebody has SAID is written down. Turn 17 started from the
    // engine's own answer — `[...heights]` — so setting one drawer froze all
    // three at today's numbers: `budrHeightsWithOwn` then read every one of them
    // as edited, no drawer was left free to take up the slack, and the stack
    // stopped filling the face. Starting from the unit's OWN list is what makes
    // "type 500 into a 770 BUDR2 and the other drawer becomes 264" true, and it
    // is the same rule a shelf follows: what nobody said, the kit decides.
    const next = [...(unit.params.drawer_heights || [])];
    next[index] = clampDrawerFrontHeight(snapTo(Number(mm) || 0, profile.editor.mmStep), { profile, max });
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, drawer_heights: next } } : u)),
    }));
    // Turn 33 (CLAUDE.md F5): a resized BUDR face moves its y-band, and the
    // y-overlap with the neighbour decides whether the matrix reaches it.
    get().healFrontGaps();
    return next[index];
  },

  /** Hand the stack back to the kit's own ratio. */
  resetDrawerHeights: (unitId) => {
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, drawer_heights: null } } : u)),
    }));
    // Turn 33 (CLAUDE.md F5): the stack re-derives — measured again.
    get().healFrontGaps();
  },

  /**
   * The project's runner variant: T or S (turn 18, CLAUDE.md F6.4).
   *
   * HARDWARE and not geometry — nothing in the engine branches on it, because
   * Blum's own installation page says the gaps, the pockets and the drilling do
   * not change with the motion technology. What it changes is which model the
   * view loads and which article the BOM orders.
   */
  setRunnerVariant: (variant) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: migrateDesign({
          ...design,
          runners: { ...design.runners, variant: String(variant || '').toUpperCase() },
        }),
      },
    };
  }),

  /**
   * …and ONE DRAWER's own, which overrides it — the colour hierarchy exactly
   * (turn 13, CLAUDE.md F3): project → unit → drawer. `null` hands the drawer
   * back to whatever is above it rather than freezing today's answer onto it.
   */
  setDrawerRunnerVariant: (unitId, drawer, variant) => set((s) => ({
    units: s.units.map((u) => {
      if (u.id !== unitId) return u;
      const own = { ...(u.params.runner_variants || {}) };
      if (variant) own[String(drawer)] = String(variant).toUpperCase();
      else delete own[String(drawer)];
      return { ...u, params: { ...u.params, runner_variants: own } };
    }),
  })),

  /** The project's hinge standard: 2 or 3 (turn 17, CLAUDE.md F7.1). */
  setHingeStandard: (n) => set((s) => {
    const design = migrateDesign(s.project.design);
    return {
      project: {
        ...s.project,
        design: migrateDesign({ ...design, hinges: { ...design.hinges, standard: Math.trunc(Number(n)) } }),
      },
    };
  }),

  // ─── WHICH HINGE THIS JOB IS FITTED WITH (turn 19, CLAUDE.md F1.1) ────────
  //
  // Three project-level answers — system, finish, plate — and one setter for
  // all three, because they are the same kind of decision and three near
  // identical setters is how they drift. Every value is RESOLVED on the way out
  // (engine/hinges.js), so a plate this build cannot drill for never sticks and
  // a finish the workshop does not stock never reaches the BOM.
  //
  // None of them changes a hole. That is the iron rule of this turn and it is
  // structural rather than promised: the drilling is computed from
  // `profile.hinges`, which nothing here touches.
  setHingeHardware: (patch) => set((s) => {
    const design = migrateDesign(s.project.design);
    const allowed = ['system', 'finish', 'plate'];
    const next = { ...design.hinges };
    for (const key of allowed) if (patch?.[key] !== undefined) next[key] = patch[key];
    return {
      project: { ...s.project, design: migrateDesign({ ...design, hinges: next }) },
    };
  }),

  /**
   * ─── THE SHELF SUPPORTS' METAL (turn 25, CLAUDE.md F6.1) ──────────────────
   *
   * Gold or silver, chosen once for the job. It is a PROJECT decision like the
   * hinge finish above and reaches nothing but the picture: the fitting is the
   * ⌀7.5 this engine has drilled since turn 1, so there is no cut and no order
   * that follows from it.
   */
  setShelfSleeve: (id) => set((s) => {
    const design = migrateDesign(s.project.design);
    // Turn 32 (CLAUDE.md F2): the palette is the profile's own — chrome and
    // onyx joined it for the wizard's metal colours.
    const wanted = getCabinetProfile().appearance.metals[id] ? id : null;
    return {
      project: {
        ...s.project,
        design: migrateDesign({ ...design, hardware: { ...design.hardware, shelfSleeve: wanted } }),
      },
    };
  }),

  /** What this job is fitted with, resolved — for the panel and for a test. */
  hingeHardware: () => {
    const design = migrateDesign(get().project.design);
    const profile = getCabinetProfile();
    return {
      system: resolveHingeSystem(design, profile),
      finish: resolveHingeFinish(design, profile),
      plate: resolveHingePlate(design, profile),
    };
  },

  // ─── ONE DOOR'S OWN HINGE (turn 19, CLAUDE.md F1.3) ───────────────────────
  //
  // "A jak jedna szafka będzie miała inne hinges… assign if other hinge." The
  // same hierarchy as colour and as the runner variant: what somebody said
  // NEAREST the piece wins. It is keyed on the engine's own panel id, which is
  // what every per-piece decision in this app has been keyed on since turn 11.
  //
  // An assignment is a HARDWARE fact, not a geometric one — the door is cut and
  // bored identically either way — so nothing here invalidates a fixture, and
  // the BOM follows because `computeCabinet` reads the same map.

  /** Give one door a hinge of its own. `null` hands it back to the rule. */
  assignDoorHinge: (unitId, panelId, family) => {
    if (!panelId) return null;
    const wanted = family ? String(family) : null;
    set((st) => ({
      units: st.units.map((u) => {
        if (u.id !== unitId) return u;
        const map = { ...(u.params.door_hinges || {}) };
        if (wanted) map[panelId] = wanted;
        else delete map[panelId];
        return {
          ...u,
          params: { ...u.params, door_hinges: Object.keys(map).length ? map : null },
        };
      }),
    }));
    return wanted;
  },

  // ─── THE WORKTOP (turn 30, CLAUDE.md F8) ─────────────────────────────────
  //
  // Owner: select two or more base cabinets and ONE worktop covers the run
  // "od ściany aż do paneli". It is a DESIGN-LAYER auto-part like the end
  // panels — stored with the project, drawn in the room, reaching no hole and
  // no fixture — so these three actions are the whole of its plumbing and
  // `computeCabinet()` is not involved at all.
  //
  // The eligibility test is `engine/worktop.js worktopEligible`, which is
  // `buildRuns`' own four rules asked of a SELECTION rather than of the room:
  // one wall, no turned unit, one top height, base cabinets. It SAYS why when
  // it refuses, because "nothing happened" is the one answer a button must
  // never give.

  /**
   * One worktop over the cabinets named.
   *
   * @returns {{ok:boolean, id:string|null, error:string|null}}
   */
  addWorktop: (unitIds) => {
    const s = get();
    const wanted = [...new Set((unitIds || []).filter(Boolean))];
    const units = wanted.map((id) => s.units.find((u) => u.id === id)).filter(Boolean);
    const profile = getCabinetProfile();
    const gate = worktopEligible(units, profile);
    if (!gate.ok) return { ok: false, id: null, error: gate.why };
    const design = migrateDesign(s.project.design);
    // A cabinet lies under ONE slab. Asking for a worktop over a run that
    // already has one REPLACES it rather than stacking a second on top —
    // which is what a joiner means by "put a worktop on these".
    const kept = design.worktops.filter((w) => !w.unitIds.some((id) => wanted.includes(id)));
    const id = uid('worktop');
    get().setDesign({
      worktops: [...kept, {
        id, unitIds: wanted, decor: null, extendLeft: 0, extendRight: 0, extendFront: 0,
      }],
    });
    return { ok: true, id, error: null };
  },

  /** Take one off. No confirmation — Undo covers it (turn 25's rule, F11). */
  removeWorktop: (worktopId) => {
    const design = migrateDesign(get().project.design);
    get().setDesign({ worktops: design.worktops.filter((w) => w.id !== worktopId) });
    return worktopId;
  },

  /**
   * Draw an extension on one — the interaction family an end-panel edit is in.
   * Nothing is computed from these that a person has not typed.
   */
  extendWorktop: (worktopId, patch) => {
    const design = migrateDesign(get().project.design);
    get().setDesign({
      worktops: design.worktops.map((w) => (w.id === worktopId ? { ...w, ...patch } : w)),
    });
    return worktopId;
  },

  /** Every slab this project carries, with its geometry resolved. */
  worktopsOf: () => {
    const s = get();
    return worktopsFor({
      records: migrateDesign(s.project.design).worktops,
      units: s.units,
      profile: getCabinetProfile(),
    });
  },

  /**
   * ─── Turn 30 (CLAUDE.md F12): neighbouring fronts that come too close ─────
   *
   * "Room level: compute the gap between neighbouring fronts in a run; when a
   * gap is < 3 mm, paint the pair's meeting edges red and show the value."
   *
   * ONE answer for both surfaces — the red marks in the room and the readout
   * that says the number — so a mark can never appear without its millimetres,
   * or the other way round. It READS and it warns; nothing here writes.
   */
  frontGapWarnings: () => {
    const s = get();
    const profile = getCabinetProfile();
    return frontGapClashes({
      entries: s.allResults(),
      baseOf: (u) => unitBase(u, profile),
      profile,
    });
  },

  /**
   * ─── TURN 31 (CLAUDE.md F4): THE RULEBOOK, READ ──────────────────────────
   *
   * Every front in the room with what stands on each of its two edges, what the
   * owner's matrix wants there and what it actually has. ONE answer for the
   * overlay, the Check and the repair modal, exactly as `frontGapWarnings` is
   * one answer for the red marks and their millimetres — a display that
   * measured one thing while the Check measured another is how a joiner ends up
   * arguing with his own app.
   *
   * It READS. Nothing here writes, moves a cabinet or narrows a board.
   */
  frontClearances: () => {
    const s = get();
    const profile = getCabinetProfile();
    const walls = roomWalls(s.project.room);
    return frontClearances({
      entries: s.allResults(),
      units: s.units,
      baseOf: (u) => unitBase(u, profile),
      wallWidthOf: (i) => Number(walls?.[i]?.width) || null,
      profile,
    });
  },

  /**
   * ─── TURN 34 (CLAUDE.md F5): THE MEETING LINE, MEASURED ONCE ─────────────
   *
   * The owner, 16.08.2026: *"czasami pokazuje 2 wymiary 1.5 i 1.5, a mi
   * zależało żeby zawsze pokazywało jeden — przy dojechaniu do szafki żeby się
   * sumowały i pokazywało 3"* … *"oczywiście, że 1.5, 100 i 1.5 — bo tak jest
   * w rzeczywistości; dopiero jak dojeżdżają do siebie, to 3."*
   *
   * The numbers come from `frontClearances` — the matrix that healed them — so
   * the figure the scene draws and the figure the Check argues about cannot
   * disagree. The view asks for the rows and for the set of per-unit edge
   * figures they replace.
   */
  meetingDimensions: () => meetingDimensions(get().frontClearances()),

  /**
   * The meeting-line figures a run draws, resolved into the frames the SCENE
   * already draws in — so the view still decides nothing.
   *
   * Two answers per unit:
   *
   *   rows      the MERGED leaf-to-leaf dimension(s) this unit carries. A
   *             touching pair's one figure is drawn by the LEFT cabinet of the
   *             two, in its own frame, through the very same `DimensionChain`
   *             every other front dimension goes through — so there is no
   *             second dimension renderer to keep in step.
   *   suppress  the `panelId|side` keys whose per-unit edge figure that merged
   *             one replaces (`engine/frontDimensions.js frontDimensionRows`).
   *
   * A run standing APART returns no merged rows and suppresses nothing: the
   * owner's own ruling — "1.5, 100 i 1.5 — bo tak jest w rzeczywistości" — is
   * exactly the three figures the app already drew.
   */
  meetingDimensionsFor: (unitId) => {
    const s = get();
    const meetings = s.meetingDimensions();
    const rows = [];
    const suppress = new Set();
    for (const m of meetings) {
      for (const k of m.suppress) {
        if (k.unitId === unitId) suppress.add(`${k.panelId}|${k.side}`);
      }
      if (!m.touching) continue;
      // The LEFT front of the pair carries the figure — it is the one whose
      // own frame the meeting line stands at the far edge of.
      const left = m.suppress.find((k) => k.side === 'right');
      if (!left || left.unitId !== unitId) continue;
      const panel = s.unitResult(unitId)?.panels.find((p) => p.id === left.panelId);
      if (!panel?.box) continue;
      rows.push({
        kind: 'meeting',
        axis: 'h',
        mm: m.leafGapMm,
        from: panel.box.x + panel.box.w,
        to: panel.box.x + panel.box.w + m.leafGapMm,
        at: panel.box.y + panel.box.h / 2,
        a: left.panelId,
        b: null,
      });
    }
    return { rows, suppress };
  },

  /**
   * ─── CHECK v1 (turn 31, CLAUDE.md F6) ────────────────────────────────────
   *
   * Eleven rules over the whole job, in one list. Pressed by the Check button
   * and run automatically before Export — the SAME call both times, because a
   * pre-export check that could differ from the one the button gives is a check
   * nobody would believe.
   *
   * It READS. Nothing here blocks, moves or re-cuts (rule 4); the one hold-out
   * in the app is the export gate's, and that has "Export anyway".
   */
  runChecks: () => {
    const s = get();
    const profile = getCabinetProfile();
    const walls = roomWalls(s.project.room);
    return runChecks({
      entries: s.allResults(),
      units: s.units,
      room: s.project.room,
      design: migrateDesign(s.project.design),
      materials: useMaterialAssignmentStore.getState().materials,
      wallWidthOf: (i) => Number(walls?.[i]?.width) || null,
      // ─── TURN 46 (CLAUDE.md F2): the 400 mm floor, measured HERE ─────────
      // `src/engine/**` imports nothing from `src/lib/**`, and the ceiling line
      // has to be the one the wall is drawn from — so the store asks
      // `lib/slopeLine.js` and hands the check a number. One ceilingAt.
      slopeShortfallOf: (unit) => {
        const wallIndex = unit?.position?.wall ?? 0;
        const slopes = slopesOfWall(s, wallIndex);
        if (!slopes.length) return null;
        const minimum = slopeMinimumMm(profile);
        const infill = slopeInfillMm(migrateDesign(s.project.design));
        const floorY = floorYOf(unit, null, profile);
        const shortfallMm = slopeShortfallMm({
          slopes,
          wallWidth: Number(walls?.[wallIndex]?.width) || 0,
          wallHeight: Number(s.project.room?.height) || 0,
          x: Number(unit?.position?.x_mm) || 0,
          width: Number(unit?.params?.width) || 0,
          infill,
          floorY,
          minimum,
        });
        return { shortfallMm, minimumMm: minimum, clearMm: minimum - shortfallMm };
      },
      profile,
    });
  },

  /** Rule 13: carcasses in a run that are not touching. RED in the Check. */
  carcassGapWarnings: () => carcassGaps(get().units, getCabinetProfile()),

  /**
   * ─── RULE 8, WRITTEN: A CORRECTION ON ONE EDGE ───────────────────────────
   *
   * "A width correction acts ONLY on the edge whose neighbour demands it —
   * never symmetrically."
   *
   * It lands on the OVERRIDE CHANNEL (`params.front_edge_trim`, applied by
   * `paramsForEngine` and consumed by one pass in the engine), so a bare
   * `computeCabinet()` — every golden fixture — never sees it. The engine
   * applies it BEFORE the drilling, which is what makes rules 9 and 12 true by
   * construction: the cups stay 21.5 from the front's own edge and the handle
   * keeps its distance from its own edge, because both are derived from the
   * width that has just changed.
   *
   * Rule 17 — "narrowing a front warns 'changes BOM and drilling' before it
   * acts" — is the CALLER's, and it is a warning rather than a veto: this
   * setter does what it is told.
   *
   * @param {string} unitId
   * @param {string} panelId
   * @param {object} patch  { left, right } in mm — absolute, not cumulative
   * @returns {object|null} the trim now stored for that front
   */
  setFrontEdgeTrim: (unitId, panelId, patch) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit || !panelId) return null;
    const current = unit.params.front_edge_trim || {};
    const was = current[panelId] || { left: 0, right: 0 };
    // T34 F6: a NEGATIVE value is an extension, and the channel carries it.
    // The clamp used to live here too, so a plan that asked an appliance-side
    // edge to extend arrived as 0 and the grey note announced a move that never
    // happened. Who may extend is `healingPlan`'s decision; this stores mm.
    const next = {
      left: Number(patch?.left ?? was.left) || 0,
      right: Number(patch?.right ?? was.right) || 0,
    };
    const map = { ...current };
    // A correction of nothing is no correction: an empty entry left behind
    // would put `edgeTrim: {0,0}` on the piece and make a stock front look
    // hand-corrected on the sheet.
    if (next.left === 0 && next.right === 0) delete map[panelId];
    else map[panelId] = next;
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, front_edge_trim: Object.keys(map).length ? map : null } }
        : u)),
    }));
    return map[panelId] || null;
  },

  /** Hand this front back to the kit's own width. */
  clearFrontEdgeTrim: (unitId, panelId) => get().setFrontEdgeTrim(unitId, panelId, { left: 0, right: 0 }),

  /**
   * Rule 15's first option, applied: NARROW THE FRONT(S).
   *
   * The plan is the engine's (`narrowingPlan` — halves of the shortfall, the
   * asymmetry law, the hinge-adjustment flag); this is one batch so the whole
   * repair is ONE step of undo. A repair a joiner has to undo twice is a repair
   * he stops trusting.
   */
  narrowFronts: (trims) => runBatch(() => {
    const done = [];
    for (const t of trims || []) {
      if (!t?.unitId || !t?.panelId || !(t.mm > 0)) continue;
      const unit = get().units.find((u) => u.id === t.unitId);
      const was = unit?.params?.front_edge_trim?.[t.panelId] || { left: 0, right: 0 };
      const side = t.side === 'left' ? 'left' : 'right';
      done.push(get().setFrontEdgeTrim(t.unitId, t.panelId, {
        // CUMULATIVE on that edge: a second correction on a front that has
        // already been narrowed once adds to it, because the first correction
        // is part of the width the second one measured against.
        [side]: Math.round((Number(was[side]) || 0) + Number(t.mm)) === 0
          ? 0 : (Number(was[side]) || 0) + Number(t.mm),
      }));
    }
    return done;
  }),

  /**
   * Rule 13's ONE fix: close the run to touch.
   *
   * "The only fix offered is closing to touch. Cabinets are NEVER moved to fix
   * a FRONT gap." Both halves matter, and the second one is why this action
   * exists at all rather than the app quietly sliding a cabinet whenever a
   * front measures short: a carcass gap is its own fault with its own fix, and
   * a front gap is never repaired by moving furniture.
   */
  closeCarcassGap: (rightUnitId, mm) => {
    const unit = get().units.find((u) => u.id === rightUnitId);
    if (!unit || !(Math.abs(Number(mm)) > 0)) return null;
    const to = (Number(unit.position?.x_mm) || 0) - Math.abs(Number(mm));
    return get().moveUnit(rightUnitId, to);
  },

  /** Every door of this cabinet that has been given a hinge by hand. */
  // ─── TURN 33 (CLAUDE.md F4): ONE DOOR'S MIRROR ────────────────────────────
  // 'inside' | 'outside' | null, per panel id — the exact grammar
  // assignDoorHinge speaks. Bonded, never drilled: nothing here can reach a
  // hole, and the BOM line is the engine's own answer.
  setDoorMirror: (unitId, panelId, face) => {
    const want = face === 'inside' || face === 'outside' ? face : null;
    set((st) => ({
      units: st.units.map((u) => {
        if (u.id !== unitId) return u;
        const map = { ...(u.params.door_mirrors || {}) };
        if (want) map[panelId] = want;
        else delete map[panelId];
        return {
          ...u,
          params: { ...u.params, door_mirrors: Object.keys(map).length ? map : null },
        };
      }),
    }));
  },
  doorMirrorsOf: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    return unit?.params?.door_mirrors || null;
  },

  doorHingesOf: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    return unit?.params?.door_hinges || null;
  },

  // ─── HANDLES (turn 25, CLAUDE.md F4.4) ────────────────────────────────────
  //
  // "Moving one moves all — with a warning." The MOVE is a project-level write
  // keyed by the front's CLASS, so every base door in the kitchen goes together
  // and the wall doors do not follow. Unticking `apply to all` writes the front
  // its own offset instead, and that front then wears a deviation badge —
  // exactly the grammar turn 19 gave a per-hinge override.

  /** The kitchen's handle: type and, for a bar, its screw centres. */
  setProjectHandle: (handle) => {
    const design = migrateDesign(get().project.design);
    set((st) => ({
      project: {
        ...st.project,
        design: { ...design, fronts: { ...design.fronts, handle: normaliseHandle(handle) } },
      },
    }));
    return normaliseHandle(handle);
  },

  /**
   * Move every handle of one CLASS. `offset` is millimetres off the reference
   * point the owner's law puts it at; `{x:0,y:0}` hands the class back to it.
   */
  moveHandleClass: (handleClass, offset) => {
    const design = migrateDesign(get().project.design);
    const offsets = { ...(design.fronts.handleOffsets || {}) };
    const x = Number(offset?.x) || 0;
    const y = Number(offset?.y) || 0;
    if (x === 0 && y === 0) delete offsets[handleClass];
    else offsets[handleClass] = { x, y };
    set((st) => ({
      project: {
        ...st.project,
        design: { ...design, fronts: { ...design.fronts, handleOffsets: offsets } },
      },
    }));
    return offsets[handleClass] || null;
  },

  /**
   * Give ONE front a handle of its own — a different type, different centres,
   * or a position the class does not share. `null` hands it back to the class.
   */
  setFrontHandle: (unitId, panelId, spec) => {
    if (!panelId) return null;
    set((st) => ({
      units: st.units.map((u) => {
        if (u.id !== unitId) return u;
        const map = { ...(u.params.front_handles || {}) };
        if (spec) map[panelId] = spec;
        else delete map[panelId];
        return {
          ...u,
          params: { ...u.params, front_handles: Object.keys(map).length ? map : null },
        };
      }),
    }));
    return spec || null;
  },

  /**
   * How many fronts a change to this class would move — the number the
   * confirmation names ("this moves handles on 14 fronts").
   *
   * Counted off the COMPUTED units, so it is the fronts that actually exist
   * rather than a guess from the parameters; a confirmation with the wrong
   * number in it is worse than no confirmation.
   */
  handleClassCountOf: (handleClass) => {
    const s = get();
    const entries = s.units.map((u) => ({
      unitType: UNIT_TYPES[u.type],
      panels: s.unitResult(u.id)?.panels || [],
      unit: u,
    }));
    return handleClassCount(
      entries, handleClass,
      (entry, panel) => entry.unit.params?.front_handles?.[panel.id] || null,
    );
  },

  /** Hand every door of this cabinet back to the rule. */
  resetDoorHinges: (unitId) => set((st) => ({
    units: st.units.map((u) => (u.id === unitId
      ? { ...u, params: { ...u.params, door_hinges: null } }
      : u)),
  })),

  setShelfPos: (unitId, itemId, posRaw, snapStep = 0) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const item = unit.params.sections?.[0]?.items?.find((i) => i.id === itemId);
    // ─── Turn 8 (CLAUDE.md F4) ───
    // A LOCKED shelf does not move, and the refusal belongs here rather than in
    // the drag: this is the one setter every path goes through, so a number
    // typed into the panel is refused exactly as a drag is. `blocked` is the
    // same shape the clamp returns when a shelf has nowhere to go, so the live
    // readout in the 3D view needs no new case.
    // ─── TURN 37 (CLAUDE.md F2): …UNLESS IT IS A RAIL'S OWN SHELF ───────────
    //
    // The owner's assembly, in his own words: *"ta półka być traktowana jak
    // półka, tylko że fix"*, and CLAUDE.md spells out what that has to mean —
    // *"an ordinary fix shelf in every way — DRAGGED BY HAND, snapping to
    // neighbours' heights, listed and dimensioned like any shelf."* A rail the
    // joiner cannot move is the T35 rail with extra steps.
    //
    // So the freeze is lifted for THIS board and no other. `fixed` still means
    // SCREWED everywhere it has ever meant it — the drilling is unchanged, the
    // pins are still not drilled, and every other fix shelf in the app is as
    // held as it was yesterday. What moved is one sentence: a shelf that
    // carries a rod is a shelf a joiner is allowed to put where he wants it.
    const carriesRail = (unit.params.sections?.[0]?.items || [])
      .some((i) => i.kind === 'hanger' && railShelfIdOf(i) === itemId);
    if (isShelfLocked(item) && !carriesRail) {
      // T37-F4a: read off the segment this board is actually in, so the frozen
      // shelf's own readout names the divider above it rather than the top.
      const band = shelfBandFor(unit, profile, null, null, item?.pos_mm ?? null);
      const bounds = shelfBounds({ pos: item?.pos_mm ?? band.min, others: otherShelfPositions(unit, itemId), band }, profile);
      return {
        pos: item?.pos_mm ?? band.min, ...bounds, blocked: true, locked: true,
      };
    }
    const state = clampShelfPos({
      // A stored millimetre is ALWAYS on the workshop grid (BACKLOG #33): the
      // drag's own snap when there is one, half a millimetre when there is not
      // — so a shelf never ends up at 704.68231 mm however it got there.
      pos: snapTo(posRaw, snapStep || profile.editor.mmStep),
      current: item?.pos_mm,
      others: otherShelfPositions(unit, itemId),
      // ─── TURN 37 (CLAUDE.md F4a): THE DIVIDER IS THE END OF THIS COLUMN ───
      // The band is the SEGMENT this shelf is in — asked with the shelf's own
      // current height, so a board under the split stops at the divider exactly
      // as it stops at the underside of the top, and one above it stands on the
      // divider exactly as it would stand on the base. "Taka sama rola."
      band: shelfBandFor(unit, profile, null, null, item?.pos_mm ?? posRaw),
    }, profile);
    get().updateItem(unitId, itemId, { pos_mm: state.pos });
    // ─── TURN 41 (F2): ONE DRAG, ONE TRUTH ──────────────────────────────────
    //
    // MEASURED FAULT. Drag the assembly's shelf from 1458 to 900 and the rod
    // follows correctly everywhere it is DRAWN or DRILLED: the engine's
    // `assemblies.rail.y`, the 3-D instance and both `rail_bracket` holes all
    // read 860. But the hanger item's own `pos_mm` is still 1400 — its BIRTH
    // height — and `paramsForEngine` harvests that stale number into
    // `rail_offset`. So the millimetre a saved project, a template and the
    // right panel read back is 540 mm above where the rod actually is, and the
    // right-panel field sat there displaying it after every drag.
    //
    // The rod's position is not a second fact to be maintained: it is the
    // shelf's, minus the bracket's drop. So it is RE-DERIVED here, in the same
    // batch as the move, from the number that just changed. One drag, one
    // truth, and a project that later loses the `mount` link still puts the rod
    // where the joiner last saw it.
    if (carriesRail) {
      const railAxis = Number(state.pos) - hangerDropMm(profile);
      const riders = (unit.params.sections?.[0]?.items || [])
        .filter((i) => i.kind === 'hanger' && railShelfIdOf(i) === itemId);
      for (const rider of riders) {
        const re = railDatumFor({
          supports: railSupportTops({
            floor: profile.board.thickness,
            stackTop: null,
            shelves: (unit.params.sections?.[0]?.items || [])
              .filter((i) => i.kind === 'shelf' && i.id !== itemId)
              .map((i) => ({
                id: i.id,
                top: (Number(i.pos_mm) || 0) + (Number(i.thickness_mm) || profile.board.thickness),
              })),
            ceiling: (Number(unit.params?.height) || 0) - profile.board.thickness,
          }),
          axis: railAxis,
        });
        get().updateItem(unitId, rider.id, { pos_mm: re.offset, datum: re.datum });
      }
    }
    return state;
  },

  /**
   * ─── TURN 37 (CLAUDE.md F1): SIX SHELVES IN THREE WARDROBES, IN ONE DRAG ──
   *
   * The owner: *"Nie mogę sobie złapać 6 półek z 3 szaf i przesunąć ich
   * razem."* This is that drag, and it is the ONE entry point the 3D calls —
   * a set of one falls straight through to `moveShelf`, so there is no second
   * way of moving a shelf and no branch in the view deciding which to use.
   *
   * THE ARITHMETIC IS A DELTA, not a position. Six shelves at six different
   * heights dragged to one absolute Y would stack in a pile; what the hand
   * means is "all of them, this much further up". The piece IN THE HAND takes
   * the pointer (magnet and all, through `moveShelf`), and how far IT actually
   * travelled is what every other member is offered.
   *
   * AND EVERY MEMBER KEEPS ITS OWN CLAMP. A shelf that runs into its own
   * neighbour stops there while the rest carry on — the alternative is either
   * a group that refuses to move because one member is boxed in, or a group
   * that quietly stacks two shelves in one slot. The count comes back in
   * `group.stopped` so the live readout can say so.
   *
   * @returns {object} the PRIMARY's own clamp state, plus `group`
   */
  moveShelfSet: (unitId, itemId, posRaw, snapStep = 0) => {
    const members = get().shelfSetMembers();
    const inHand = members.some((m) => m.unitId === unitId && m.itemId === itemId);
    // A set of one — or a shelf nobody ticked — is the single drag it has
    // always been, down to the store call.
    if (members.length < 2 || !inHand) return get().moveShelf(unitId, itemId, posRaw, snapStep);
    const was = new Map(members.map((m) => [`${m.unitId} ${m.itemId}`, m.pos]));
    const from = was.get(`${unitId} ${itemId}`);
    return runBatch(() => {
      const state = get().moveShelf(unitId, itemId, posRaw, snapStep);
      const delta = Number(state?.pos) - Number(from);
      let stopped = 0;
      if (Number.isFinite(delta)) {
        for (const m of members) {
          if (m.unitId === unitId && m.itemId === itemId) continue;
          const wanted = m.pos + delta;
          const r = get().setShelfPos(m.unitId, m.itemId, wanted, snapStep);
          if (r?.blocked || Math.abs(Number(r?.pos) - wanted) > 0.001) stopped += 1;
        }
      }
      return { ...state, group: { size: members.length, stopped } };
    });
  },

  /**
   * The ticked set, as shelves this store can write to: `{unitId, itemId,
   * pos}`, across cabinets.
   *
   * Read off the UI's selection and resolved through each member's OWN
   * cabinet's panels — a panel id is only unique inside one unit, which is the
   * whole reason a member carries the unit with it (`lib/selection.js`).
   * Anything in the set that is not a movable shelf is simply not in the
   * answer: a set with a door and three shelves in it moves three shelves.
   */
  shelfSetMembers: () => {
    const keys = useUiStore.getState().selectedElements;
    if (!Array.isArray(keys) || keys.length < 2) return [];
    const panelsOf = new Map();
    const out = [];
    for (const member of membersOf(keys)) {
      if (!panelsOf.has(member.unitId)) {
        panelsOf.set(member.unitId, get().unitResult(member.unitId)?.panels || []);
      }
      const p = panelsOf.get(member.unitId).find((x) => x.id === member.elementRef);
      if (!p || p.part !== 'SHELF' || !p.meta?.itemId) continue;
      // A screwed shelf holds still; the store would refuse it anyway, and
      // counting it as a member that "hit a stop" would be a lie about why.
      // T37-F2: unless it is a rail's own shelf, which is dragged by hand.
      if (p.meta?.locked && !p.meta?.railItemId) continue;
      const unit = get().units.find((u) => u.id === member.unitId);
      const item = (unit?.params.sections?.[0]?.items || []).find((i) => i.id === p.meta.itemId);
      if (!item) continue;
      out.push({ unitId: member.unitId, itemId: item.id, pos: Number(item.pos_mm) || 0 });
    }
    return out;
  },

  /**
   * Every height the shelf in the hand could line up WITH (turn 21, F11).
   *
   * The arithmetic is `engine/shelfMagnet.js`; this only hands it what the
   * store knows — which units stand beside this one, how far off the floor each
   * of them starts, and where each shelf actually runs, which is the engine's
   * own `meta.run` and not a second opinion about bays.
   */
  shelfMagnetCandidates: (unitId, itemId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return [];
    const profile = getCabinetProfile();
    const runsOf = (u) => {
      const result = s.unitResult(u.id);
      const byItem = new Map();
      for (const p of result?.panels || []) {
        if (p.part === 'SHELF' && p.meta?.itemId && p.meta?.run) byItem.set(p.meta.itemId, p.meta.run);
      }
      return byItem;
    };
    const cache = new Map();
    const shelvesOf = (u) => {
      if (!cache.has(u.id)) cache.set(u.id, runsOf(u));
      const runs = cache.get(u.id);
      return (u.params?.sections?.[0]?.items || [])
        .filter((i) => i.kind === 'shelf' && Number.isFinite(Number(i.pos_mm)))
        .map((i) => ({ id: i.id, pos_mm: Number(i.pos_mm), run: runs.get(i.id) || null }));
    };
    return magnetCandidates({
      unit,
      itemId,
      // Same wall, same level: a unit round a corner or hung above this one is
      // not "beside" it however close its numbers are.
      neighbours: s.units.filter((u) => (u.position?.wall ?? 0) === (unit.position?.wall ?? 0)
        && getUnitType(u.type).mount === getUnitType(unit.type).mount),
      shelvesOf,
      baseOf: (u) => unitBase(u, profile),
      spanOf: (u) => paddedSpan(u),
    }).map((c) => {
      const other = s.units.find((u) => u.id === c.unitId);
      const item = (other?.params?.sections?.[0]?.items || []).find((i) => i.id === c.itemId);
      // The neighbour's own stored height travels with the candidate, so the
      // guide line can be drawn in ITS frame as well as in the dragged unit's.
      return { ...c, ownPos: Number(item?.pos_mm) };
    });
  },

  /**
   * Drag a shelf vertically. Same setter, so the drag cannot bypass the clamp.
   *
   * ─── TURN 21 (CLAUDE.md F11): AND IT CATCHES, SOFTLY ──────────────────────
   *
   * The magnet lives HERE and not in `setShelfPos`, and that is the whole of
   * F11.2: the numeric field goes through the setter and never through this, so
   * a joiner who types 848 beside a neighbour at 850 gets 848. A proposal is
   * something a hand makes; a typed number is not a proposal.
   *
   * When it catches, the drag's own snap step is set aside for the workshop
   * grid — the point of the catch is EQUALITY, and rounding the caught height
   * to a 32 mm drag snap would be a magnet that misses.
   */
  moveShelf: (unitId, itemId, posRaw, snapStep) => {
    const profile = getCabinetProfile();
    const step = snapStep || profile.editor.mmStep;
    const candidates = get().shelfMagnetCandidates(unitId, itemId);
    const pull = applyMagnet(snapTo(posRaw, step), candidates, profile.editor.shelfMagnetMm);
    const state = get().setShelfPos(
      unitId, itemId, pull.pos, pull.caught ? profile.editor.mmStep : snapStep,
    );
    // The catch is reported only where it actually took: a clamp that refused
    // the height (a neighbour in the way, the top of the carcass) is not a
    // magnet, and a guide line drawn across a shelf that did not move would be
    // a promise the app did not keep.
    const caught = pull.caught && Math.abs(state.pos - pull.pos) < 1e-6 ? pull.caught : null;
    return { ...state, magnet: caught };
  },

  // ── shelves v2 (turn 8, CLAUDE.md F4) ────────────────────────────────────

  /**
   * How this shelf is held: on pins, screwed, or on runners.
   *
   * Screwing one in also fixes where it is, so the position is left exactly
   * where it was rather than re-clamped — the whole point of the choice is that
   * this shelf stops moving, and a setter that nudged it half a millimetre on
   * the way would be doing the opposite of what was asked.
   */
  setShelfVariant: (unitId, itemId, variant) => {
    const next = SHELF_VARIANTS.includes(variant) ? variant : 'adjustable';
    get().updateItem(unitId, itemId, { variant: next });
    return next;
  },

  /**
   * The same question in the owner's own words (turn 21, CLAUDE.md F7):
   * fix / adjustable / pull-out.
   *
   * ONE truth, two names — it writes the `variant` a shelf has carried since
   * turn 8, so a project does not grow two answers to one question and no
   * drilling moves for a shelf nobody has touched. A kind whose workshop number
   * is still outstanding is REFUSED here as well as being disabled in the
   * modal: a setter that quietly accepted `pullout` would leave a project
   * claiming a shelf the engine cannot cut.
   */
  setShelfType: (unitId, itemId, type) => {
    if (!shelfTypeEnabled(type)) return shelfTypeOf(
      get().units.find((u) => u.id === unitId)?.params?.sections?.[0]?.items
        ?.find((i) => i.id === itemId),
    );
    const variant = shelfVariantForType(type);
    get().updateItem(unitId, itemId, { variant });
    return shelfTypeOf({ variant });
  },

  /**
   * "This one stays here." A shelf that is otherwise adjustable but must not be
   * dragged — one carrying an oven, one a run of cable is stapled to. It is
   * drilled like a FIX shelf, because that is what holding a shelf still means.
   */
  setShelfLocked: (unitId, itemId, locked) => {
    get().updateItem(unitId, itemId, { updown_locked: Boolean(locked) });
    return Boolean(locked);
  },

  /**
   * How far this shelf's front edge stands back from the face of the carcass.
   *
   * `null` puts it back on the project's default (20 mm). 0 stretches it out to
   * the face, which is what a shelf under a worktop or behind a glazed door
   * sometimes has to do.
   */
  setShelfFront: (unitId, itemId, frontMm) => {
    const profile = getCabinetProfile();
    if (frontMm == null) { get().updateItem(unitId, itemId, { front_mm: null }); return null; }
    const value = Math.max(0, snapTo(Number(frontMm) || 0, profile.editor.mmStep));
    get().updateItem(unitId, itemId, { front_mm: value });
    return value;
  },

  /** The same, for the partition and the rail partitioner of one unit. */
  setPartitionFront: (unitId, frontMm) => {
    const profile = getCabinetProfile();
    const value = frontMm == null ? null : Math.max(0, snapTo(Number(frontMm) || 0, profile.editor.mmStep));
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, partition_front_mm: value } }
        : u)),
    }));
    return value;
  },

  /**
   * Re-clamp every shelf of a unit. Called after a carcass parameter changes:
   * shrinking the height or adding a drawer stack moves the band the shelves
   * are allowed to sit in, and a shelf left outside it would be an overlap
   * nobody dragged.
   */
  reclampShelves: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return;
    const profile = getCabinetProfile();
    // Turn 32 (CLAUDE.md F4): one engine result, one band PER BAY — a shelf
    // in a column clamps above that column's own drawer stack, and shelves
    // in different columns never push each other (they stand side by side).
    const result = computeCabinet(paramsForEngine(unit), profile);
    // ─── TURN 37 (CLAUDE.md F4a): …AND ONE BAND PER SEGMENT OF THAT BAY ─────
    // A split divider is an end of the cabinet, so a shelf under it clamps
    // against IT and not against the underside of the top. The segments are
    // cached per bay exactly as the bands were; which one a shelf gets is its
    // own current height, through the one law (`bandSegmentAt`).
    const bands = new Map();
    const bandOf = (zone, at = null) => {
      const key = zone == null ? 'all' : Math.trunc(Number(zone));
      if (!bands.has(key)) {
        bands.set(key, {
          band: shelfBandFor(unit, profile, zone, result),
          boundaries: splitBoundariesFor(unit, profile, zone, result),
        });
      }
      const { band, boundaries } = bands.get(key);
      // No divider in this bay — every cabinet before T36 — is the same object
      // the sweep clamped against yesterday.
      return boundaries.length ? bandSegmentAt({ band, boundaries, at }, profile) : band;
    };
    const zoneKeyOf = (i) => (i.zone == null || !Number.isFinite(Number(i.zone))
      ? null : Math.trunc(Number(i.zone)));
    const items = unit.params.sections?.[0]?.items || [];
    const shelves = items.filter((i) => i.kind === 'shelf' && Number.isFinite(i.pos_mm))
      .sort((a, b) => a.pos_mm - b.pos_mm);
    if (!shelves.length) return;

    // Bottom-up, each shelf clamped against the ones already settled below it
    // in ITS OWN bay (a full-width shelf crosses every bay, so it settles
    // against all of them).
    const settled = [];
    const next = new Map();
    for (const sh of shelves) {
      const myZone = zoneKeyOf(sh);
      const others = settled
        .filter((p) => myZone == null || p.zone == null || p.zone === myZone)
        .map((p) => p.pos);
      const state = clampShelfPos({
        pos: sh.pos_mm, current: sh.pos_mm, others, band: bandOf(myZone, sh.pos_mm),
      }, profile);
      next.set(sh.id, state.pos);
      settled.push({ pos: state.pos, zone: myZone });
    }
    if ([...next].every(([id, pos]) => items.find((i) => i.id === id)?.pos_mm === pos)) return;

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            sections: [{
              ...u.params.sections[0],
              items: items.map((i) => (next.has(i.id) ? { ...i, pos_mm: next.get(i.id) } : i)),
            }],
          },
        }
        : u)),
    }));
  },

  // ── doors (last step) ────────────────────────────────────────────────────
  // The hinge side travels BOTH ways (turn 8, F2.2): fitting doors with a hinge
  // writes it onto the unit as well, so the panel's switch and the engine's
  // input are the same answer and cannot come apart later.
  setDoors: (unitId, doors) => {
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? {
          ...u,
          params: {
            ...u.params,
            doors,
            ...(doors && typeof doors === 'object' && doors.hinge
              ? { hinge: String(doors.hinge).toUpperCase() === 'R' ? 'R' : 'L' }
              : {}),
          },
        }
        : u)),
    }));
    // Turn 32 (CLAUDE.md F3): doors appearing IS fronts appearing — the new
    // leaves must stand where the matrix says, against whatever was already
    // beside them (the end panel added before the doors was the day-one bug).
    get().healFrontGaps();
  },

  /**
   * How much clear WALL there is beside a unit, per side — or null where what
   * is beside it is a neighbour rather than a wall (turn 8, CLAUDE.md F5).
   *
   * The 3D view asks this to decide how far a door may swing: past 90° a door
   * comes back towards the wall on its hinge side, so an end cabinet in a
   * corner would animate its door through the plaster. A neighbour is
   * deliberately NOT a wall here — CLAUDE.md asks about walls, and two doors
   * opening into each other is a different question with a different answer.
   */
  wallGapsFor: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return { left: null, right: null };
    const out = {};
    for (const [key, side] of [['left', 'L'], ['right', 'R']]) {
      const free = freeBesideUnit(s, unit, side);
      out[key] = free.by === 'the wall' ? free.gap : null;
    }
    return out;
  },

  // ── derived ──────────────────────────────────────────────────────────────
  /** Live engine output for one unit — recomputed on every read (SPEC 4.11). */
  // ─── TURN 23 (CLAUDE.md F9.2): THE ONE PLACE THE PENCIL IS APPLIED ────────
  //
  // "The ENGINE stays pure and ignorant: overrides apply in a thin step after
  // computeCabinet(), in ONE function both the 3-D, the sheet and the DXF
  // EXPORT consume."
  //
  // This is that place, and it is the only one. Every surface in the app reads
  // a unit through `unitResult` or `allResults` — the room, the cabinet editor,
  // the part detail, the CNC sheet, the BOM and the export — so there is no
  // second path on which a hidden hole could come back. `computeCabinet` above
  // is handed nothing: the LISP is untouched, the kits are untouched, and the
  // next cabinet of the same kit is stock by construction.
  unitResult: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    return applyPartEdits(
      computeCabinet(paramsForEngine(unit, get().project.design), getCabinetProfile()),
      unit.params?.part_edits || null,
    );
  },

  allResults: () => get().units.map((u) => ({
    unit: u,
    result: applyPartEdits(
      computeCabinet(paramsForEngine(u, get().project.design), getCabinetProfile()),
      u.params?.part_edits || null,
    ),
  })),

  /**
   * ─── TURN 48 (CLAUDE.md F5): THE SAME UNIT, AS THE MACHINE SEES IT ────────
   *
   * T45's own named debt, paid. The LED groove `lib/ledGroove.js` computes has
   * been cut on the way to the DXF since T45 — but only there. Every surface
   * that DRAWS a sheet (the CNC preview, the tree, the material sections, the
   * per-sheet DXF) read `unitResult`, which is the engine's answer and knows
   * nothing about a strip, so the pocket the joiner was going to cut was in the
   * file and not on the picture of the file.
   *
   * So there is ONE answer for the sheet, and this is it: the unit's result
   * with its grooves in. `unitResult` stays exactly what it is — the 3-D, the
   * BOM and the checks are unchanged — and everything that speaks to the
   * machine asks HERE, so the preview and the export cannot disagree about what
   * is cut.
   *
   * GATED, and the gate is `grooved()`'s own: a unit with no LED line is handed
   * back the VERY OBJECT `unitResult` produced, identity included. A project
   * without lighting sees not one changed byte anywhere.
   */
  unitCncResult: (unitId) => {
    const result = get().unitResult(unitId);
    if (!result) return null;
    const unit = get().units.find((u) => u.id === unitId) || null;
    return grooved(result, {
      unit,
      design: get().project.design,
      ledSpec: get().project.ledSpec,
      profile: getCabinetProfile(),
    });
  },

  // ─── The tools (F9.1) ─────────────────────────────────────────────────────
  //
  // Three actions, and every one of them is `withPartEdit` and friends — the
  // pure arithmetic in `engine/partEdits.js` — over one unit's params. They go
  // in `params.part_edits` and not on the unit object because params are what
  // this app saves, loads, caches and undoes: a pencil mark that did not
  // survive a reload would be a worse feature than none.

  /** Add one op to one part. `signature` pins it to the board it was drawn on. */
  addPartEdit: (unitId, panelId, op) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const result = get().unitResult(unitId);
    const panel = result?.panels.find((p) => p.id === panelId);
    if (!panel) return null;
    // Turn 38 (F5): the board's own SIZE is stamped on the set the first time
    // anything is drawn on it — the number F9's rule compares against.
    const next = withPartEdit(unit.params.part_edits || {}, panelId, op, partSignature(panel), panelSizeOf(panel));
    get().updateUnitParams(unitId, { part_edits: next });
    return next[panelId];
  },

  // ─── TURN 38 (CLAUDE.md F6/F11): THE VERBS REWRITE THE LIST ──────────────
  //
  // Move, copy, rotate, group, ungroup, delete and undo do not APPEND an op —
  // they hand back the list they want. `withPartEdit` above is still the door
  // every DRAWING gesture goes through; this is the door every gesture that
  // acts on what is already drawn goes through, and the two share the same
  // entry, the same signature and the same size stamp.

  /** Replace one part's whole op list. An empty list is "back to computed". */
  setPartOps: (unitId, panelId, ops) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return null;
    const result = get().unitResult(unitId);
    const panel = result?.panels.find((p) => p.id === panelId);
    if (!panel) return null;
    const next = withPartOps(
      unit.params.part_edits || {}, panelId, ops, partSignature(panel), panelSizeOf(panel),
    );
    get().updateUnitParams(unitId, { part_edits: next });
    return next[panelId] || null;
  },

  /** This part's ops as they stand — the editor's own working copy. */
  partOpsOf: (unitId, panelId) => partOpsOf(
    get().units.find((u) => u.id === unitId)?.params?.part_edits, panelId,
  ),

  // ─── TURN 38 (CLAUDE.md F9): CUSTOM GEOMETRY DIES WITH A PANEL RESIZE ────
  //
  // The owner's word, and it is a RULE and not an edit. `engine/partEdits.js`
  // owns the arithmetic — same size, ride along; different size, drop — and
  // this is the one place it is applied, on the paths that can change a
  // panel's cut size. It writes `units` DIRECTLY rather than going back
  // through `updateUnitParams`, which is what calls it: a rule that re-entered
  // the setter would recurse.
  //
  // The note is dismissible because every message in this app is (F2's own
  // grammar), and it NAMES the panels, because "some geometry went" is not
  // something a joiner can act on.
  dropResizedPartEdits: () => {
    const dropped = [];
    let touched = false;
    const units = get().units.map((u) => {
      if (!u.params?.part_edits) return u;
      const result = get().unitResult(u.id);
      const { next, dropped: rows } = withoutResizedPartEdits(u.params.part_edits, result?.panels || []);
      if (!rows.length) return u;
      touched = true;
      dropped.push(...rows.map((r) => ({ ...r, unitId: u.id, unitNum: u.params.unit_num })));
      return { ...u, params: { ...u.params, part_edits: Object.keys(next).length ? next : null } };
    });
    if (!touched) return [];
    set({ units });
    useUiStore.getState().notify(resizeDropMessage(dropped), 'warn');
    return dropped;
  },

  // ─── TURN 38 (CLAUDE.md F3): THE PROJECT'S OWN LAYERS ────────────────────

  /** This project's user layers, normalised — a stored blob cannot invent one. */
  projectLayers: () => normaliseUserLayers(get().project.cncLayers),

  /**
   * Add one. Returns `{ layer, error }` — the fault is a SENTENCE the panel
   * prints, because "that name is already a CNC layer" is the one thing a
   * joiner has to hear before he draws forty holes on a layer that would have
   * merged with the hinge cups.
   */
  addProjectLayer: ({ name, aci }) => {
    const existing = get().projectLayers();
    const error = layerNameFault(name, existing);
    if (error) return { layer: null, error };
    const layer = makeUserLayer({ name, aci });
    if (!layer) return { layer: null, error: 'A layer needs a name.' };
    // No hand-written `dirty` flag: turn 31's gate wraps this store and is the
    // ONLY writer of it (`stores/dirtyGate.js`). A layer added here marks the
    // project changed through the same door every other write goes through.
    set((s) => ({ project: { ...s.project, cncLayers: [...existing, layer] } }));
    return { layer, error: null };
  },

  /** "Back to computed" — this part's edits, all of them, gone (F9.3). */
  clearPartEdits: (unitId, panelId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit?.params?.part_edits) return false;
    const next = withoutPartEdits(unit.params.part_edits, panelId);
    get().updateUnitParams(unitId, { part_edits: next });
    return true;
  },

  /** One step back, for a hand that has just added the wrong hole. */
  undoPartEdit: (unitId, panelId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit?.params?.part_edits) return false;
    get().updateUnitParams(unitId, {
      part_edits: withoutLastPartEdit(unit.params.part_edits, panelId),
    });
    return true;
  },

  /** What this part carries by hand, or null. */
  partEditsOf: (unitId, panelId) => {
    const unit = get().units.find((u) => u.id === unitId);
    return unit?.params?.part_edits?.[panelId] || null;
  },

  /**
   * Every part in the project whose hand edits no longer fit the board they
   * were drawn on (F9.3). The app ASKS about these; nothing here decides.
   */
  staleHandEdits: () => get().units.flatMap((u) => {
    const rows = get().unitResult(u.id)?.handEdits?.stale || [];
    return rows.map((row) => ({ ...row, unitId: u.id, unitNum: u.params.unit_num }));
  }),

  markSaved: (project) => set((s) => ({ project: project || s.project, dirty: false })),

  /**
   * The project as it should be WRITTEN — the live assignment blob folded in
   * (turn 39, CLAUDE.md F2).
   *
   * The store is the live editor of the assignments; the project object is what
   * gets saved. This is the ONE place the two meet, so a save can never write a
   * stale set and no screen has to remember to copy them across.
   */
  projectForSave: () => {
    const s = get();
    try {
      return { ...s.project, assignments: useMaterialAssignmentStore.getState().data };
    } catch {
      return s.project;
    }
  },
})));

// Cache to localStorage on every change (fallback only — the DB stays primary)
useProjectStore.subscribe((state) => saveCache(state));

/**
 * The units a given unit can actually collide with: same wall, same mounting
 * level. A wall unit hangs ABOVE a base unit — that is how a kitchen is built,
 * not an overlap, so they never constrain each other.
 */
/**
 * How far off the floor this unit's carcass starts: its toe kick when it stands
 * on legs, its mounting height when it hangs. That is what a height has to fit
 * UNDER the ceiling on top of.
 */
function floorYOf(unit, applied, profile) {
  const type = getUnitType(unit.type);
  if (type.mount === 'wall') {
    return Number(applied?.mount_height ?? unit.params.mount_height ?? profile.wallUnit.defaults.mountHeight) || 0;
  }
  // Turn 22 (CLAUDE.md F4.2): the D/W panel stands as high as the legs its
  // neighbours stand on. One derivation, engine/runs.js, read here too.
  if (!standsOnLegHeight(type)) return 0;
  return impliedLegHeight(
    { leg_height: applied?.leg_height ?? unit.params.leg_height },
    type,
    profile,
  );
}

/** The type's own minimum height, if its kit declares one (engine/types.js). */
function minHeightOf(typeId, profile) {
  const key = getUnitType(typeId).minHeightKey;
  if (!key) return 0;
  return Number(key.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), profile)) || 0;
}

/**
 * The band of heights this unit occupies (turn 12, CLAUDE.md F7).
 *
 * `floorYOf` already knows the difference between standing on legs and hanging
 * at a mounting height, and it is the number every other height question in
 * this store is asked against.
 */
function bandOf(unit, profile = getCabinetProfile()) {
  return unitBand({ floorY: floorYOf(unit, null, profile), height: unit.params?.height });
}

/**
 * Does `other` stand in the way of `unit`?
 *
 * ─── Turn 12 (CLAUDE.md F7) ───
 * It used to be `mount === mount`, and that is why a wall unit drove straight
 * through a tall one: a tall unit stands on the floor, so it was filed with the
 * base units, and it reaches all the way up through the band the wall units
 * hang in. The question is whether the two occupy the same HEIGHTS, which gives
 * the old answer wherever the old rule was right and the right answer where it
 * was not — see engine/collision.js.
 */
function obstructs(unit, other, profile = getCabinetProfile()) {
  return bandsOverlap(bandOf(unit, profile), bandOf(other, profile), profile.editor.levelOverlapMm);
}

/**
 * ─── TURN 51 (CLAUDE.md F1): EVERYTHING THE PLAN PUTS IN THE WAY ───────────
 *
 * A box typed into the room's plan, and a CHIMNEY drawn on a wall — which is
 * the same fact arriving by the other door, and which until tonight reached
 * nothing at all (see `engine/room.js wallPlanObstacles`).
 *
 * One function, so the six places that clamp against the plan cannot end up
 * knowing about different halves of it. A RECESS is not here on purpose: an
 * alcove is room, and a cabinet standing in one is why it was drawn.
 */
function planObstaclesOf(room, wallSlopeList) {
  return [
    ...roomBoxes(room),
    ...wallPlanObstacles(room, wallElements(wallSlopeList), { blocking: true }),
  ];
}

function neighboursOf(state, unit) {
  // Every wall, not just this one: a unit around the corner is a neighbour the
  // moment its footprint reaches into this one's depth (engine/collision.js
  // decides that; this only decides who is even in the running).
  return state.units.filter((u) => u.id !== unit.id && obstructs(unit, u));
}

/**
 * …and the PANELS in the way (turn 15, CLAUDE.md F7).
 *
 * A cabinet whose own carcass is nowhere near this one's height can still have
 * a piece of board bolted to it that is — an end panel taken to the ceiling, a
 * filler taken up with it. `neighboursOf` above will have discarded that
 * cabinet, correctly, because the CABINET is not in the way. The panel is.
 *
 * Each one comes back as an obstacle of its own thickness and nothing more, so
 * a wall unit stops AT the board rather than at the 600 mm cabinet behind it.
 * The units already counted as neighbours are skipped: their panels are inside
 * `footprintPads` and counting them twice would push a neighbour away by two
 * panels.
 */
function panelObstaclesFor(state, unit, profile = getCabinetProfile()) {
  const band = bandOf(unit, profile);
  const already = new Set(neighboursOf(state, unit).map((u) => u.id));
  const verticals = unitVerticals(
    state.units.filter((u) => u.id !== unit.id && !already.has(u.id)),
    profile,
  );
  return verticalsInBand(verticals, band, profile.editor.levelOverlapMm).map((v) => ({
    wall: v.wall,
    x_mm: v.from,
    width: Math.max(0, v.to - v.from),
    depth: v.depth,
    rotation: 0,
    backInset: wallClearance(profile),
    label: v.kind === 'end-panel' ? 'end panel' : 'filler',
  }));
}

/** Every obstacle a unit has to be clamped against: the cabinets AND the boards. */
function obstaclesFor(state, unit, profile = getCabinetProfile()) {
  return [...neighboursOf(state, unit).map(toObstacleUnit), ...panelObstaclesFor(state, unit, profile)];
}

/** Height of a unit's top above the floor — where its top infill starts. */
const unitTopOf = unitTop;

/**
 * Are these two run descriptions the same piece of wood?
 *
 * Compared field by field rather than by JSON, because this is called on every
 * frame of a drag: a fresh object written each time would re-render every unit
 * in the scene for a run nobody has touched.
 */
function sameRun(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.role !== b.role) return false;
  // Turn 15 (CLAUDE.md F6): the SIDE mitre is carried by every unit in the run,
  // members included — it is the end units' own corner — so it is compared for
  // both roles. Miss it here and dragging a filler to the ceiling would leave
  // the corner square until something else forced a redraw.
  if (!sameCorner(a.sideMitre, b.sideMitre)) return false;
  if (a.role === 'member') return a.ownerId === b.ownerId;
  // ─── TURN 25 (CLAUDE.md F12.1): THE CORNICE'S OWN HEIGHT ─────────────────
  //
  // THE DIAGNOSIS. Option 100 shipped in turn 22 and the owner only ever got
  // 70, and neither the profile geometry nor the panel option nor the resolver
  // was at fault — all three carry 100 correctly, and `verify/t25/cornice-100.md`
  // shows them doing it. What was at fault is THIS comparison.
  //
  // The list below was written for the top infill, the plinth and the masking
  // board, none of which has a height: they are all "one board, this long,
  // ending like this". A cornice is the first run element whose IDENTITY
  // includes a height, and turn 22 added it to the callers without extending
  // this. So switching a unit from 70 to 100 produced a genuinely new element
  // — same offset, same length, same faceH, same ends, same returns, same
  // mitres — that this function called identical, and `refreshAutoParts`
  // returned the unit untouched with its 70 still on it.
  //
  // Every other field is compared because a moulding that differs in it is a
  // different length of timber; height and projection are exactly that.
  if ((Number(a.height) || 0) !== (Number(b.height) || 0)) return false;
  if ((Number(a.projection) || 0) !== (Number(b.projection) || 0)) return false;
  return a.offset === b.offset && a.length === b.length && a.faceH === b.faceH
    && a.depth === b.depth
    && a.shelfDepth === b.shelfDepth
    && a.ends?.left === b.ends?.left && a.ends?.right === b.ends?.right
    && a.returns?.left === b.returns?.left && a.returns?.right === b.returns?.right
    && sameCorner(a.mitre, b.mitre);
}

/** Two `{left, right}` mitre answers, treating "absent" and "0" as the same. */
function sameCorner(a, b) {
  return (Number(a?.left) || 0) === (Number(b?.left) || 0)
    && (Number(a?.right) || 0) === (Number(b?.right) || 0);
}

/**
 * A unit as the plain numbers engine/collision.js works with — END PANELS
 * INCLUDED, so a neighbour cannot be moved into a panel it cannot see.
 */
function toObstacleUnit(u) {
  const pad = footprintPads(u, u.params?.front_t, getCabinetProfile());
  return {
    wall: u.position?.wall ?? 0,
    x_mm: (Number(u.position?.x_mm) || 0) - pad.left,
    width: (Number(u.params?.width) || 0) + pad.left + pad.right,
    depth: Number(u.params?.depth) || 0,
    rotation: Number(u.position?.rotation_deg) || 0,
    // A unit stood off the wall occupies a different band of the floor, which
    // is exactly what decides whether it fouls the one round the corner.
    backInset: pad.back,
    label: u.params?.unit_num || u.id,
  };
}

/**
 * Where a newly placed WALL unit should hang: level with the top of the TALL
 * unit it has landed beside (turn 8, CLAUDE.md F5).
 *
 * "Beside" is measured on the wall, and a tall unit anywhere along the same
 * stretch counts — the two are at different mounting levels, so they never
 * overlap and the nearest one is the one the eye lines the run up against.
 * Null when there is no tall unit on that wall, or when the wall unit is too
 * tall to reach that line, in which case the project's own mount height stands.
 */
function alignedMountFor(state, unit, placed) {
  const type = getUnitType(unit.type);
  if (type.mount !== 'wall') return null;
  const profile = getCabinetProfile();
  const span = { left: placed.x, right: placed.x + (Number(unit.params.width) || 0) };
  const talls = state.units.filter((u) => (u.position?.wall ?? 0) === placed.wall
    && getUnitType(u.type).heightGroup === 'tall');
  if (!talls.length) return null;

  // The nearest one along the wall — measured between spans, so a tall unit the
  // wall unit is standing directly above scores 0.
  const distance = (u) => {
    const s = unitSpan(u);
    if (s.right <= span.left) return span.left - s.right;
    if (s.left >= span.right) return s.left - span.right;
    return 0;
  };
  const nearest = talls.reduce((best, u) => (distance(u) < distance(best) ? u : best), talls[0]);
  return mountHeightAlignedWith({
    tallTop: unitTopOf(nearest, profile),
    unitHeight: Number(unit.params.height) || 0,
    roomHeight: Number(state.project.room.height) || 0,
  });
}

/**
 * How much clear space there is beside a unit on one side, and what closes it.
 * Used by the end-panel path: a masking panel that does not fit is refused
 * rather than dropped on top of the neighbour.
 */
function freeBesideUnit(state, unit, side) {
  const walls = roomWalls(state.project.room);
  const wall = walls[unit.position?.wall ?? 0] || walls[0];
  const span = unitSpan(unit);
  const spans = wallObstacles({
    wall,
    walls,
    depth: unit.params.depth,
    others: obstaclesFor(state, unit),
    boxes: planObstaclesOf(state.project.room, state.project.wallSlopes),
  });
  // WHICH SIDE an obstacle is on is decided on the CARCASS, and how far away it
  // is on the padded span. That distinction is what lets this report a negative
  // gap at all: read the side off the padded span too and a neighbour the unit
  // has just grown into stops counting as a left-hand neighbour, the search
  // falls back to the wall, and the answer comes out large and positive — which
  // is the opposite of the truth.
  const carcass = {
    left: Number(unit.position?.x_mm) || 0,
    right: (Number(unit.position?.x_mm) || 0) + (Number(unit.params?.width) || 0),
  };

  if (side === 'L') {
    let edge = 0;
    let by = 'the wall';
    for (const o of spans) {
      if (o.right <= carcass.left + 1e-6 && o.right > edge) { edge = o.right; by = o.label || 'a neighbour'; }
    }
    // `raw` may be NEGATIVE — the unit is standing in something. That is not a
    // case any drag can produce (the clamp stops first), but GROWING AN INSET
    // is: the footprint gets wider where the unit already stands, and turn 7
    // needs to know by how much so it can move it out (setUnitInsets).
    const raw = span.left - edge;
    return { gap: Math.max(0, raw), raw, by };
  }
  let edge = wall?.width ?? 0;
  let by = 'the wall';
  for (const o of spans) {
    if (o.left >= carcass.right - 1e-6 && o.left < edge) { edge = o.left; by = o.label || 'a neighbour'; }
  }
  const raw = edge - span.right;
  return { gap: Math.max(0, raw), raw, by };
}

/**
 * How far from each end of a wall a unit must stop (BACKLOG #15). It is the
 * project's infill width, so the gap the unit leaves IS the filler that closes
 * it — which is what makes the filler appear by itself when the unit parks.
 */
function wallMarginOf(state, unit = null) {
  const profile = getCabinetProfile();
  // ─── Turn 11 (CLAUDE.md F5.3) ───
  // "Infill toggled OFF re-enables push to wall." It did not: the stop was a
  // PROJECT number, so a cabinet whose filler had been switched off still parked
  // 40 mm out with nothing in the gap — the disabled state lingered, exactly as
  // Piotr described. The stop is what MAKES the filler (BACKLOG #15), so a
  // cabinet that is not getting one has no reason to leave room for it.
  //
  // What it still cannot do is stand hard against the plaster: `wallClearance`
  // is the 10 mm every unit keeps off a wall it is not scribed to, and that is a
  // fact about walls rather than about fillers.
  if (unit?.params?.side_infill_off === true) return wallClearance(profile);
  const setting = Math.max(0, Number(migrateDesign(state.project.design).infill.sideWidth) || 0);
  // ─── Turn 8 (CLAUDE.md F3) ───
  // With the infill switched OFF a unit used to travel all the way to the side
  // wall and stand hard against it. It cannot: the same bowed wall that makes
  // every unit stand 10 mm off the wall BEHIND it makes it stand 10 mm off the
  // wall BESIDE it, and a cabinet scribed to nothing does not go in.
  //
  // So the stop is never smaller than the wall clearance. With a real infill
  // width set, that width still wins — it is bigger, and it is a piece.
  if (setting >= (profile.autoParts?.sideInfill?.minWidth ?? 0) && setting > 0) return setting;
  return wallClearance(profile);
}

// ─── Interior rules (shared by the store and the UI) ───
// Thin adapters: they turn a unit into the plain numbers the pure collision
// functions want, and nothing more. The RULES live in engine/collision.js.

/** Every OTHER shelf's position in this unit. */
/**
 * The other shelves this one has to clear.
 *
 * ─── Turn 12 (CLAUDE.md F5.3) ───
 * Only the ones IN THE SAME BAY. Two shelves either side of a vertical
 * partition are not above one another in any sense a joiner would recognise —
 * they are in different columns — so clamping one against the other pushes a
 * shelf 40 mm off the height it was asked for, for a neighbour it will never
 * touch. A shelf that belongs to no bay is full width and meets everything.
 */
function otherShelfPositions(unit, itemId) {
  const items = unit.params.sections?.[0]?.items || [];
  const mine = items.find((i) => i.id === itemId);
  const bay = zoneIndexOf(mine?.zone);
  return items
    .filter((i) => i.kind === 'shelf' && i.id !== itemId && Number.isFinite(i.pos_mm))
    .filter((i) => {
      const theirs = zoneIndexOf(i.zone);
      // A full-width shelf is in every bay; two zoned shelves only meet in the
      // same one.
      return bay == null || theirs == null || theirs === bay;
    })
    .map((i) => i.pos_mm);
}

/**
 * ─── TURN 37 (CLAUDE.md F4a): THE SPLIT DIVIDERS THIS SHELF HAS TO RESPECT ──
 *
 * The owner: *"dodajemy półkę i powinna być traktowana jak koniec szafy."* The
 * ROLE is `engine/collision.js bandSegments`; this is the ADAPTER that says
 * WHICH boards play it — the same thin-adapter law every function in this
 * section follows (the rules live in the engine, the store turns a unit into
 * the numbers they want).
 *
 * `assemblies.splitDividers` is the engine's own published list and the key is
 * ABSENT on a cabinet with no split (T36-F6, iron rule 2), so a project that
 * has never typed a split top gets an empty list here and every band below is
 * the band it was yesterday, key for key.
 *
 * WHICH BAY. A divider spans exactly the light its own leaf closes — a bay's
 * (`bay_doors[i].split_top_mm`) or the whole carcass's — so it is a boundary
 * for a shelf whose own light OVERLAPS it and for no other. A full-width shelf
 * (`zone == null`) crosses every bay, so every divider is one of its ends.
 */
function splitBoundariesFor(unit, profile, zone, result) {
  const dividers = result?.assemblies?.splitDividers || [];
  if (!dividers.length) return [];
  const G = unit.params.board_t ?? profile.board.thickness;
  const bay = zone == null ? null : widthZones({
    width: Number(unit.params.width) || 0,
    boardT: G,
    partitions: (unit.params.sections?.[0]?.items || []).filter((i) => i.kind === 'partition'),
  })[Math.trunc(Number(zone))] || null;
  return dividers
    .filter((d) => bay == null || (d.from < bay.to && d.from + d.w > bay.from))
    // The divider is cut at the carcass board (cabinet.js cuts it `G` thick),
    // and its `y` is its underside — the same datum a shelf's `pos_mm` is on.
    .map((d) => ({ at: d.y, thickness: G }));
}

// ─── THE FLOOR IS LAW — THE ONE STATION (turn 48, CLAUDE.md F1) ─────────────
//
// The owner, 25.08.2026: *"zaden element nie moze spasc ponizej podlogi —
// fizycznie to sie wyklucza."*
//
// MEASURED FAULT, and it is two symptoms of one cause. `addShoeBox` floored its
// `pos_mm` at `Math.max(0, …)` and so did `setShoeBox`, and zero is the OUTSIDE
// of the carcass — the underside of the bottom board. So a shoe box asked for
// at the bottom of a wardrobe came back with all seven of its boards standing
// at y = 0, inside the 18 mm of board under them, and a shoe SHELF dropped to
// the same place by the same arithmetic. Neither is a fault of the shoe box or
// of the shoe shelf. Both are the floor being read as zero.
//
// ONE LAW, ONE STATION. The arithmetic is `engine/items.js floorClampedPos`,
// born beside `centredShelfPos` because it is the same question asked one step
// earlier, and this is the only place in the store that calls it — from the two
// doors every element in the app walks through, `addItem` and `updateItem`. A
// shoe-shelf clamp plus a shoe-box clamp would have been two answers to one
// question and the next element would have arrived with neither.
//
// WHAT IT DOES NOT TOUCH. An element already above the floor is handed back the
// very object it came in as (`floorLawedItem` returns its argument), so nothing
// legal moves by a hundredth. `computeCabinet()` never sees this function — a
// golden is `defaultParamsFor()` handed straight to the engine, with no store
// and no items at all — which is why the six stay byte-identical (iron rule 2).

/**
 * The carcass floor of one unit: the bottom panel's TOP face.
 *
 * A carcass whose bottom is not a BOARD (an open frame, a type that says so)
 * has no board for a piece to sink into, and its floor is zero. The question is
 * asked of the TYPE rather than assumed, because assuming it is how zero got to
 * be the floor in the first place.
 */
function carcassFloorOf(unit, profile) {
  // `?? 'panel'` is `engine/cabinet.js`'s own idiom for this key (`hasBottom`,
  // L1453): the key is absent on almost every type and its absence means the
  // carcass HAS a bottom. Reading it as 'none' would put the floor back at zero
  // for the whole app, which is the fault this feature exists to remove.
  if ((getUnitType(unit?.type)?.carcass?.bottom ?? 'panel') !== 'panel') return 0;
  return interiorFloor(unit?.params?.board_t ?? profile.board.thickness);
}

/**
 * How far one element's box reaches BELOW its own `pos_mm`.
 *
 * Every element the app places today has its datum on its lowest face, so this
 * is 0 for all of them. It is a function and not a `0` written into the call
 * because the law is about the element's LOWEST POINT and not about its datum:
 * the day something is hung with a bracket that reaches down, this is the one
 * line that has to change and the clamp itself does not.
 */
function dropBelowOf() {
  return 0;
}

/** One element, on or above its carcass's floor — the whole of F1, applied. */
function onTheFloor(unit, item, profile = getCabinetProfile()) {
  return floorLawedItem(item, {
    floor: carcassFloorOf(unit, profile),
    dropBelow: dropBelowOf(item),
  });
}

/** The band this unit's shelves may live in, read off the engine result. */
function shelfBandFor(unit, profile, zone = null, precomputed = null, at = null) {
  const G = unit.params.board_t ?? profile.board.thickness;
  const result = precomputed || computeCabinet(paramsForEngine(unit), profile);
  // Turn 32 (CLAUDE.md F4): a shelf living in a COLUMN stands on that
  // column's own stack — its closing board, not the full-width zone's.
  const columnStack = zone != null
    ? (result.assemblies.columnDrawers || []).find((c) => c.zone === Math.trunc(Number(zone)))
    : null;
  const floorY = columnStack
    ? columnStack.top + G
    : (zone == null && result.assemblies.drawerZone ? result.assemblies.drawerZone.top + G : null);
  const band = shelfBand({
    height: unit.params.height,
    boardT: G,
    // Top face of the drawer partition when there is a stack, else the base.
    floorY,
  }, profile);
  // ─── T37-F4a: …AND CUT BY THE SPLIT DIVIDER, IF IT CROSSES ────────────────
  // One law, one place. Every path that clamps, spaces or places a shelf comes
  // through here, so none of them can disagree about where the boundary is.
  // No divider — every project before T36, and every one since that has not
  // typed a split top — gets the same band object back, untouched.
  return bandSegmentAt({
    band, boundaries: splitBoundariesFor(unit, profile, zone, result), at,
  }, profile);
}

/**
 * The split dividers crossing this shelf's own light, as bare undersides — the
 * boards the add-shelf placement may not centre ACROSS (T37-F4a). Same one
 * source as the band's own segmentation, so the two cannot drift.
 */
function splitBoundaryPositions(unit, profile, zone = null, precomputed = null) {
  const result = precomputed || computeCabinet(paramsForEngine(unit), profile);
  return splitBoundariesFor(unit, profile, zone, result).map((b) => b.at);
}

/**
 * The band cut into its SEGMENTS — for the callers that work on a whole column
 * at once (the Even button, the add-shelf placement) rather than on one piece.
 * One segment, the band itself, wherever nothing crosses it (T37-F4a).
 */
function shelfBandSegmentsFor(unit, profile, zone = null, precomputed = null) {
  const result = precomputed || computeCabinet(paramsForEngine(unit), profile);
  return bandSegments({
    band: shelfBandFor(unit, profile, zone, result),
    boundaries: splitBoundariesFor(unit, profile, zone, result),
  }, profile);
}

/** The vertical band a shelf may live in: above the drawer stack, below the top. */
export function shelfLimits(unit, profile, zone = null, at = null) {
  const band = shelfBandFor(unit, profile, zone, null, at);
  const G = unit.params.board_t ?? profile.board.thickness;
  return { ...band, drawerTop: band.floor === G ? null : band.floor };
}

/**
 * The same, cut by any split divider that crosses it (T37-F4a) — exported for
 * the surfaces that lay out a whole column: bottom-up, one band per segment.
 */
export function shelfLimitSegments(unit, profile, zone = null) {
  return shelfBandSegmentsFor(unit, profile, zone);
}

/**
 * How far back an element inside THIS unit may be set (turn 9, CLAUDE.md F4).
 *
 * A thin adapter, like the shelf ones above: it turns a unit into the plain
 * numbers `engine/collision.js elementDepthBounds` wants and nothing more. The
 * sink's back panel sits 50 mm forward INSIDE the carcass (KIT_SINK L425-426),
 * so a shelf in one has that much less depth to give away before it stops being
 * a shelf — the same `backLoss` the engine takes off it when it cuts it.
 */
export function elementDepthBoundsFor(unit, profile) {
  const G = unit.params.board_t ?? profile.board.thickness;
  const inset = getUnitType(unit.type)?.carcass?.back === 'inset';
  return elementDepthBounds({
    depth: unit.params.depth,
    boardT: profile.carcass.shelfDepthBoards * G,
    backLoss: inset ? profile.sinkUnit.backSetback + G : 0,
  }, profile);
}

/**
 * The thickest board this app will let a piece be given. Not a workshop number
 * and deliberately not in the profile: it is a sanity rail on a typed field, so
 * that a slipped keystroke ("250" for "25") is refused rather than cut. The
 * REAL limits are the workshop's board options, which the panel offers.
 */
const MAX_ELEMENT_THICKNESS = 100;


/**
 * Interior validation. The hard rule from SPEC 4.7: a drawer stack must be
 * closed by a shelf above it. The engine always emits the PARTITION panel for
 * that, so this reports the case where the drawers were dropped instead.
 */
export function validateUnit(unit, result, context = {}) {
  const issues = [];
  const items = unit.params.sections?.[0]?.items || [];
  const drawers = items.filter((i) => i.kind === 'drawer').length;

  // Room fit. Position is hard-clamped by the setters, so what is left here is
  // exactly what clamping CANNOT fix: a unit that does not fit the room at all
  // and needs a number changed (CLAUDE.md task 3).
  if (context.room) {
    const level = getUnitType(unit.type).mount;
    const walls = roomWalls(context.room);
    const wallIndex = unit.position?.wall ?? 0;
    const wall = walls[wallIndex] || walls[0];
    // The cabinets in the way — and, since turn 15 (CLAUDE.md F7), the ceiling-
    // height BOARDS in the way, which belong to cabinets that are not.
    const inTheWay = (context.units || []).filter((u) => u.id !== unit.id && obstructs(unit, u));
    const seen = new Set(inTheWay.map((u) => u.id));
    const profile = getCabinetProfile();
    const others = [
      ...inTheWay.map(toObstacleUnit),
      ...verticalsInBand(
        unitVerticals((context.units || []).filter((u) => u.id !== unit.id && !seen.has(u.id)), profile),
        bandOf(unit, profile),
        profile.editor.levelOverlapMm,
      ).map((v) => ({
        wall: v.wall,
        x_mm: v.from,
        width: Math.max(0, v.to - v.from),
        depth: v.depth,
        rotation: 0,
        backInset: wallClearance(profile),
        label: v.kind === 'end-panel' ? 'end panel' : 'filler',
      })),
    ];
    issues.push(...unitIssues({
      unit,
      wallWidth: wall?.width ?? 0,
      roomHeight: context.room.height,
      // Same wall or around the corner — both are an overlap on the floor.
      others: wallObstacles({
        wall, walls, depth: unit.params?.depth ?? 0, others, boxes: planObstaclesOf(context.room, context.wallSlopes),
      })
        .map((o) => ({ left: o.left, right: o.right, label: o.label })),
    }));
  }

  // SPEC 4.7 applies to an INTERNAL drawer stack (a wardrobe): it has to be
  // closed by a partition. A drawer unit whose fronts are the face of the
  // cabinet (BUDR) has no partition by design, so the rule does not apply.
  const type = getUnitType(unit.type);
  if (type.supports.partition) {
    if (drawers > 0 && !result.assemblies.drawerZone) {
      issues.push({ level: 'error', message: 'Drawers do not fit this carcass — they were dropped from the cut list.' });
    }
    if (drawers > 0 && result.assemblies.drawerZone && !result.panels.some((p) => p.part === 'PARTITION')) {
      issues.push({ level: 'error', message: 'A drawer stack must be closed by a shelf (partition) above it.' });
    }
  }
  const zoneTop = result.assemblies.drawerZone?.top ?? null;
  for (const item of items) {
    if (item.kind !== 'shelf' || !Number.isFinite(item.pos_mm)) continue;
    if (zoneTop != null && item.pos_mm < zoneTop) {
      issues.push({ level: 'warn', message: `A shelf sits inside the drawer zone (${formatMm(item.pos_mm)} mm) — move it above ${formatMm(zoneTop)} mm.` });
    }
  }
  for (const w of result.warnings) issues.push({ level: 'warn', message: w.message });
  return issues;
}

export { paramsForEngine };
