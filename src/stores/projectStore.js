import { create } from 'zustand';
import {
  clampDrawerFrontHeight, computeCabinet, doorCountFor, drawerSplitFor, isShelfLocked,
  minDrawerFrontHeight, SHELF_VARIANTS, WARDROBE_KIT_KINDS,
} from '../engine/cabinet.js';
import {
  applyPartEdits, partSignature, withPartEdit, withoutLastPartEdit, withoutPartEdits,
} from '../engine/partEdits.js';
import { getCabinetProfile } from '../engine/profile.js';
import { shelfTypeEnabled, shelfTypeOf, shelfVariantForType } from '../engine/shelfTypes.js';
import { doorBays } from '../engine/doors.js';
import { applyMagnet, magnetCandidates } from '../engine/shelfMagnet.js';
import {
  defaultParamsFor, getUnitType, resolveTypeId, UNIT_NUM_PREFIX, UNIT_TYPES,
} from '../engine/types.js';
import { useMaterialAssignmentStore } from './materialAssignmentStore.js';
import { formatMm, snap as snapTo } from '../engine/format.js';
import {
  boxSpansOnWall,
  clampShelfPos, clampUnitDepth, clampUnitHeight, clampUnitWidth, clampUnitX, footprintPads,
  backStandoff, clampElementDepth, elementDepthBounds, freeSlotOnWall, insetPads, shelfBand,
  shelfBounds, unitIssues, unitPlanSpan, unitSpan,
  wallClearance,
  wallObstacles,
  bandsOverlap, unitBand,
} from '../engine/collision.js';
import {
  DEFAULT_ROOM as ENGINE_DEFAULT_ROOM, migrateRoom, roomBoxes, roomChangeGuard, roomWalls,
} from '../engine/room.js';
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
// Turn 32 (CLAUDE.md F3): the grey notes the self-healing announces itself
// with. One direction only — uiStore never reads this store.
import { useUiStore } from './uiStore.js';
// Turn 31 (CLAUDE.md F6): Check v1, the pre-production controller.
import { runChecks } from '../engine/checks.js';
// Turn 31 (CLAUDE.md F3): the drill guard's own number, at the source.
import { hingeMinSpacingMm, hingeRowClashes, hingeSpacingBlocks } from '../engine/cnc/drillGuard.js';
import {
  carcassSources, facingMatchesSource, frontSources, projectBoardThickness, projectDepth,
  projectFrontThickness, setFrontTypeCount, sourceById, sourceTakesFacing,
} from '../engine/projectSettings.js';
import {
  autoPartsFor, takesPlinth, takesTopInfill, topInfillHeight, topInfillToCeiling,
} from '../engine/autoparts.js';
import {
  buildRuns, impliedLegHeight, paddedSpan, runInfillParams, runMaskParams, runMemberIds,
  runPlinthParams, standsOnLegHeight, unitBase, unitTop, unitVerticals, verticalsInBand,
} from '../engine/runs.js';
import {
  corniceCeilingNotice, corniceOption, corniceRefusals, runCorniceParams, takesCornice,
} from '../engine/cornice.js';
import { prefillDesignFromCompany } from '../engine/companyDefaults.js';
import { widthZones } from '../engine/zones.js';
import { resolveHingeFinish, resolveHingePlate, resolveHingeSystem } from '../engine/hinges.js';
import { mountHeightAlignedWith } from '../engine/doors.js';
import {
  centredShelfPos, drawersInEngineOrder, evenShelfPositions, nextHangerOffset, shelvesInEngineOrder,
} from '../engine/items.js';
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
  const sections = (saved.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => ({ ...item, id: uid(item.kind || 'item') })),
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
function paramsForEngine(unit, design = null) {
  const p = unit.params;
  const items = p.sections?.[0]?.items || [];
  const profile = getCabinetProfile();
  return {
    ...p,
    type: unit.type,
    items,
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
    rail_offset: items.find((i) => i.kind === 'hanger')?.pos_mm ?? p.rail_offset,
    // Which rail was chosen from the hardware list, so the BOM line names the
    // product and not just a length (turn 4, BACKLOG #14).
    rail_material_id: items.find((i) => i.kind === 'hanger')?.material_id ?? null,
    rail_material_label: items.find((i) => i.kind === 'hanger')?.material_label ?? null,
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
  const sections = (unit.params.sections || []).map((section) => ({
    ...section,
    items: (section.items || []).map((item) => (item.kind === 'shelf' && item.variant === 'fixed'
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
    ? { ...cached.project, room: migrateRoom(cached.project.room), design: migrateDesign(cached.project.design) }
    : {
      id: null, name: 'Untitled project', number: '', client: '',
      room: DEFAULT_ROOM, design: migrateDesign(null),
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

  loadProject: (project, units) => {
    set({
      project: { ...project, room: migrateRoom(project?.room), design: migrateDesign(project?.design) },
      units: migrateUnits(units),
      dirty: false,
    });
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
    set((s) => ({
      units: s.units.map((u) => (u.id === unitId
        ? { ...u, params: { ...u.params, end_panels: (u.params.end_panels || []).filter((ep) => ep.id !== panelId) } }
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
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, ...applied } } : u)),
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
      return {
        door: String(m.door ?? 'none').toLowerCase() === 'one' ? 'one' : 'none',
        hinge: String(m.hinge || 'L').toUpperCase() === 'R' ? 'R' : 'L',
      };
    });
    // A cabinet with doors in its bays has no door across its face.
    get().updateUnitParams(unitId, { bay_doors: next, doors: false });
    return next;
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
    const fallback = autoUnitNum(getUnitType(unit.type), index);
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
    for (const wall of ordered) {
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
          ...boxSpansOnWall({ wall, depth: unit.params.depth, boxes: roomBoxes(state.project.room) }),
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
    set((s) => ({ units: [...s.units, unit] }));
    // A unit arrives with its SCRIBE FILLERS worked out from where it landed.
    // The plinth and the top infill are decisions and wait to be asked for
    // (turn 4, BACKLOG #16) — turn 3 put both in the cut list unasked.
    get().refreshAutoParts(unit.id);
    return { id: unit.id, error: null, wall: placed.wall };
  },

  removeUnit: (unitId) => {
    set((s) => ({ units: s.units.filter((u) => u.id !== unitId) }));
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
        wall, walls, depth: unit.params.depth, others, boxes: roomBoxes(s.project.room),
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
    // The clamp above keeps the unit inside its slot without moving it; this
    // re-runs the position clamp anyway, so a unit that was already overlapping
    // (an imported project, a room change) still settles legally.
    if (applied.width != null) get().moveUnit(unitId, get().units.find((u) => u.id === unitId)?.position.x_mm ?? 0, 0);
    if (patch.height != null || applied.width != null) get().reclampShelves(unitId);
    notices.push(...get().refreshAutoParts());
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
  moveUnit: (unitId, xRaw, snapStep) => {
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
      boxes: roomBoxes(s.project.room),
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
      // The stop that makes the side infill appear (BACKLOG #15) — and, since
      // turn 11 (F5.3), the 10 mm wall clearance instead for a cabinet whose
      // filler has been switched off, because there is no piece to leave room
      // for.
      wallMargin: wallMarginOf(s, unit),
    }, getCabinetProfile());
    const x = result.x - lead;

    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, position: { ...u.position, x_mm: x } } : u)),
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
          wall: walls[wallIndex], depth: unit.params.depth, boxes: roomBoxes(get().project.room),
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
          wall: walls[wallIndex], depth: unit.params.depth, boxes: roomBoxes(s.project.room),
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
        return { ...u, params: { ...u.params, sections: [{ ...section, items: [...section.items, { id, ...item }] }] } };
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
        const kept = section.items.filter((i) => i.kind !== 'drawer' || zoneOf(i) !== wantZone);
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
        positions: shelvesInEngineOrder(items)
          .filter((sh) => (bay == null ? true : zoneIndexOf(sh.zone) === bay))
          .map((sh) => sh.pos_mm),
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
   */
  addHangerRail: (unitId, { materialId = null, materialLabel = null, zone = null } = {}) => {
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
    return get().addItem(unitId, {
      kind: 'hanger',
      pos_mm: snapTo(offset, profile.editor.mmStep),
      ...(wantZone == null ? {} : { zone: wantZone }),
      material_id: materialId,
      material_label: materialLabel,
    });
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
    set((s) => ({
      units: s.units.map((u) => {
        if (u.id !== unitId) return u;
        const section = u.params.sections[0];
        let items = section.items.filter((i) => i.id !== itemId);
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

  updateItem: (unitId, itemId, patch) => set((s) => ({
    units: s.units.map((u) => {
      if (u.id !== unitId) return u;
      const section = u.params.sections[0];
      return {
        ...u,
        params: { ...u.params, sections: [{ ...section, items: section.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }] },
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
   */
  redistributeShelves: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return;
    const profile = getCabinetProfile();
    const limits = shelfLimits(unit, profile);
    const items = unit.params.sections[0].items;
    const shelves = shelvesInEngineOrder(items);
    const positions = evenShelfPositions({
      // The kit's own bounds: the top face of whatever closes the space below
      // (drawer partition, rail partitioner, or the base panel) and the
      // underside of the top panel.
      zoneBottom: limits.floor,
      zoneTop: limits.ceiling,
      count: shelves.length,
      // ─── Turn 11 (CLAUDE.md F2.1/F2.2) ───
      // …and the board itself, which is what turn 9 left out. The zone was
      // right; the arithmetic accounted a thickness at one end only, so the
      // LOWEST opening came out one board bigger than every other one — the
      // 244.5 against 226.5 / 227 on Piotr's screenshot. A shelf THIS unit is
      // built from, not the profile's: a 22 mm carcass spaces its shelves for
      // 22 mm shelves.
      boardT: unit.params.board_t ?? profile.board.thickness,
    });
    const at = new Map(shelves.map((sh, i) => [sh.id, snapTo(positions[i], profile.editor.mmStep)]));
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

  /** This cabinet's hinge rows as they stand — the rule's, or its own. */
  hingeRowsOf: (unitId) => {
    const unit = get().units.find((u) => u.id === unitId);
    if (!unit) return [];
    // `drillSummary`, not `derived`: the hinge centres are a DRILLING fact and
    // the engine has always filed them there (engine/cabinet.js). Reading the
    // wrong one gave an empty list, and an empty list is a cabinet the panel
    // offers no hinges to edit.
    const result = get().unitResult(unitId);
    return result?.drillSummary?.hinge_centers || [];
  },

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
  setHingePos: (unitId, index, mm) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const rows = [...s.hingeRowsOf(unitId)];
    if (index < 0 || index >= rows.length) return null;
    const H = Number(unit.params.height) || 0;
    const min = hingeMinSpacingMm(profile);
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
  addHinge: (unitId) => {
    const s = get();
    const unit = s.units.find((u) => u.id === unitId);
    if (!unit) return null;
    const profile = getCabinetProfile();
    const rows = [...s.hingeRowsOf(unitId)];
    const H = Number(unit.params.height) || 0;
    const min = hingeMinSpacingMm(profile);
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
  removeHinge: (unitId, index) => {
    const s = get();
    const rows = s.hingeRowsOf(unitId);
    if (index < 0 || index >= rows.length) return null;
    const next = rows.filter((_, i) => i !== index);
    set((st) => ({
      units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, hinge_rows: next } } : u)),
    }));
    return next.length;
  },

  /** Hand this cabinet back to the kit's own maths and the project standard. */
  resetHinges: (unitId) => set((st) => ({
    units: st.units.map((u) => (u.id === unitId ? { ...u, params: { ...u.params, hinge_rows: null } } : u)),
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
    if (isShelfLocked(item)) {
      const band = shelfBandFor(unit, profile);
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
      band: shelfBandFor(unit, profile),
    }, profile);
    get().updateItem(unitId, itemId, { pos_mm: state.pos });
    return state;
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
    const bands = new Map();
    const bandOf = (zone) => {
      const key = zone == null ? 'all' : Math.trunc(Number(zone));
      if (!bands.has(key)) bands.set(key, shelfBandFor(unit, profile, zone, result));
      return bands.get(key);
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
        pos: sh.pos_mm, current: sh.pos_mm, others, band: bandOf(myZone),
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
    const next = withPartEdit(unit.params.part_edits || {}, panelId, op, partSignature(panel));
    get().updateUnitParams(unitId, { part_edits: next });
    return next[panelId];
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
    boxes: roomBoxes(state.project.room),
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

/** The band this unit's shelves may live in, read off the engine result. */
function shelfBandFor(unit, profile, zone = null, precomputed = null) {
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
  return shelfBand({
    height: unit.params.height,
    boardT: G,
    // Top face of the drawer partition when there is a stack, else the base.
    floorY,
  }, profile);
}

/** The vertical band a shelf may live in: above the drawer stack, below the top. */
export function shelfLimits(unit, profile, zone = null) {
  const band = shelfBandFor(unit, profile, zone);
  const G = unit.params.board_t ?? profile.board.thickness;
  return { ...band, drawerTop: band.floor === G ? null : band.floor };
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
        wall, walls, depth: unit.params?.depth ?? 0, others, boxes: roomBoxes(context.room),
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
