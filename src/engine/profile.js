// ─── Cabinet construction profile ───
// Workshop-editable numbers that drive the engine: clearances, deductions,
// drill positions, the Skylon puzzle joint geometry and the drawer standard.
// Different workshops = different NUMBERS, never different formulas.
//
// The defaults below are the SKYLON profile, traced 1:1 from the production
// AutoLISP in reference/lisp/ (SKYLON_COMMON, KIT_BUD_FULL, KIT_WARDROBE_FULL).
// The active profile is pushed in by cabinetProfileStore (persisted per user);
// the engine always reads through getCabinetProfile() so plain-function code
// needs no React/store imports.
//
// RULE: formulas in cabinet.js read EXCLUSIVELY from this object. If you find a
// bare number in a formula, it belongs here.

export const PROFILE_SCHEMA = 1;

export const DEFAULT_CABINET_PROFILE = {
  schema: PROFILE_SCHEMA,
  id: 'skylon',
  label: 'Skylon Joinery',

  // ─── Material thicknesses ───
  board: {
    thickness: 18,                    // G — standard carcass board
    thicknessOptions: [18, 22],       // 22 = heavy
  },
  front: {
    thickness: 25,                    // 18 = MDF, 19 = melamine, 25 = shaker
    thicknessOptions: [18, 19, 25],
    types: {
      S: { label: 'Shaker', frameWidth: 50 },
      H: { label: 'Handleless (J-groove)', grooveDepth: 30 },
      F: { label: 'Flat' },
    },
    defaultType: 'S',
  },

  // ─── Carcass panel deductions ───
  // "Boards" = how many board thicknesses come off; "Clearance" = fixed mm.
  carcass: {
    sideDepthBoards: 1,        // side W = depth − 1×G          (back panel sits behind)
    topWidthBoards: 2,         // top/bottom W = width − 2×G    (between the sides)
    topDepthBoards: 1,         // top/bottom H = depth − 1×G
    backCoversFullFace: true,  // back = full width × full height
    shelfWidthBoards: 2,       // shelf W = width − 2×G − clearance
    shelfWidthClearance: 4,
    shelfDepthBoards: 1,       // shelf H = depth − 1×G − clearance
    shelfDepthClearance: 20,
  },

  // ─── Doors / fronts ───
  doors: {
    // 1 door while (width − widthDeduction) ≤ singleDoorMaxWidth → 2 doors from
    // width 705 mm (704 is still ONE door — BLOCKERS.md #2)
    widthDeduction: 4,
    singleDoorMaxWidth: 700,
    gap: 3,                    // overlay clearance: single front = (W−gap) × (H−gap)
    doubleTotalGap: 6,         // pair of fronts = ((W − doubleTotalGap)/2) × (H − gap)
    defaultHinge: 'L',
  },

  // ─── Hinge drilling ───
  hinges: {
    holeDiameter: 5,
    holePairOffset: 16,        // 2 holes per centre at centre ± 16
    xFromFrontEdge: 37,        // measured from the FRONT edge of the side panel
    layer: 'HINGES_5MM',
    endOffset: 100,            // first/last hinge centre, from panel end
    // Hinge-count rules per unit family (SKYLON_COMMON calcHingePositions*)
    rules: {
      base: { mode: 'base', secondFromTop: 300 },                 // [100, H−300, H−100]
      tall: { mode: 'tall', sixHingeMinHeight: 1600, innerBelow: 3, innerAtOrAbove: 4 },
      low:  { mode: 'low', twoHingeMaxHeight: 800, threeHingeMaxHeight: 1200, innerAtOrAbove: 2 },
    },
    // Hinge cups drilled in the front panel
    cups: {
      diameter: 35,
      xFromHingeEdge: 21.5,
      layer: 'FRONT_HINGES_35MM',
      screwDiameter: 3,
      screwOffsetX: 9.5,       // toward the door centre from the cup centre
      screwOffsetY: 23,        // one screw above, one below
      screwLayer: 'FRONT_HINGES_3MM',
      // Where the cups sit on the door. 'baseOffsets' = KIT_BUD_FULL, measured
      // on the (shorter) front panel; 'hingeCentres' = KIT_WARDROBE_FULL, which
      // passes the carcass hinge centres straight through.
      baseOffsets: { bottom: 100, upperFromTop: 297, topFromTop: 97 },
    },
  },

  // ─── Shelf pin holes ───
  shelfHoles: {
    diameter: 7.5,
    clusterOffsets: [-50, 0, 50],   // 3 holes per row
    columnFromEdge: 70,             // x = 70 and panelWidth − 70
    layer: 'SHELVES_7_5MM',
    // Row spacing is (H − 2×G)/(n+1) measured over the FULL carcass height,
    // even when a drawer stack occupies the bottom (KIT_WARDROBE_FULL v1
    // behaviour, recorded in golden-wardrobe.json → shelf_holes_quirk).
    spanMode: 'fullHeight',
    // When the UI supplies explicit shelf positions, drill the rows there
    // instead of on the even-spacing formula.
    followPositions: true,
  },

  // ─── Skylon puzzle joint (SKYLON_COMMON drawBUL / drawBUR / drawTOP_ROT90) ───
  puzzle: {
    tabCentresFromEnd: 95,     // outer tab centres; the third sits at mid-length
    tabHalfOpening: 19,        // half-width of the slot mouth at the edge
    tabHalfWidth: 25,          // half-width once past the shoulder
    shoulderDepth: 10.5,       // depth at which the slot widens
    dogboneHalfHeight: 30,     // relief pocket ± this around the tab centre
    socketHalfWidth: 25.5,     // socket pocket on the mating edge
    socketOvershoot: 6,        // pocket runs 6 mm past the panel edge
    socketHoleOffset: 24.5,    // 2 holes per socket at ± this
    socketHoleDiameter: 7.5,
    socketHoleInset: 1,        // holes sit 1 mm inside the pocket
    screwDiameter: 3,
    screwFromEnd: 50,          // screws at 50, mid, length−50
    centrelineExtra: 0.5,      // screw/socket centreline = G/2 + this
    layers: {
      outline: 'OUTLINE',
      socket: 'PUZZLE_SOCKET',
      dogbone: 'PUZZLE_DOG_BONES',
      socketHole: 'PUZZLE_HOLES_7_5MM',
      screw: 'SCREWS_3MM',
    },
  },

  // ─── Wardrobe specifics (KIT_WARDROBE_FULL constants, lines 498-508) ───
  wardrobe: {
    legHeight: 100,
    legsPerUnit: 4,
    minHeight: 1800,
    defaults: { width: 600, height: 2150, depth: 578, railOffset: 1400 },

    drawers: {
      maxCount: 6,
      setback: 50,             // drawer box sits 50 mm behind the carcass front
      frontHeight: 200,        // DEFAULT visible drawer front; each drawer may
                               // carry its own height_mm (SPEC / turn-2 task 4)
      minFrontHeight: 100,     // workshop limits on a per-drawer height; a value
      maxFrontHeight: 600,     // outside them is clamped with a warning
      // Drawer box side = front height − this. The LISP's fixed pair
      // (drawerFrontH 200, drawerSideH 164) is the special case 200 − 36; with
      // variable fronts the DELTA is the invariant, not the side height, so
      // that is what the profile carries.
      frontToSideDelta: 36,
      firstFrontAdjust: 3,     // bottom front is 3 mm shorter (clears the base)
      gap: 3,                  // gap between drawer fronts
      boxSideThickness: 18,
      boxWidthClearance: 10,   // box W = internal W − this − drawer-panel reduction
      frontOversize: 4,        // front W = box W + this (2 mm each side)
      boxFrontBoards: 4,       // box front/back length = W − 4×G − clearance − reduction
      boxFrontClearance: 10,
      boxFrontHeightDeduction: 15,   // box front H = box side H − 15 − G − 1
      boxFrontHeightExtra: 1,
      bottomOversize: 13,      // bottom W = box front length + this
      boxDropFromRunner: 9,    // box bottom sits this far below the runner row
      depthSteps: [390, 440, 490, 540, 590, 640, 690],   // runner standard
      // usable depth = depth − G − setback − frontThickness − depthAllowance
      depthAllowance: 20,
      partitionClearance: 5,   // partition sits 5 mm above the top drawer front
      zoneHeadroom: 200,       // drawer zone must leave this much above it
    },

    // Vertical panel that carries the runners on the hinge side
    drawerPanel: {
      inset: 30,               // distance from the carcass side
      fillerWidth: 30,         // filler closing the gap, 2 per drawer panel
      fillerFrontOffset: 40,   // filler set back from the drawer setback (top view)
      screwDepth: 99,          // attachment holes, from the front edge
      screwDiameter: 3,
    },

    runners: {
      firstRowFromBottom: 38,  // relative to the drawer-panel bottom
      holeXPattern: [37, 69, 293],   // measured from the front of the runner run
      holeDiameter: 3,
      layer: 'RUNNERS_3MM',
    },

    rail: {
      partitionAbove: 40,      // rail partitioner sits 40 mm above the rail
      topClearance: 50,        // rail partitioner must clear the top by this
      bracketScrewDiameter: 3,
    },
  },

  // ─── Base unit (kitchen) specifics ───
  baseUnit: {
    legHeight: 100,
    legsPerUnit: 4,
    defaults: { width: 600, height: 770, depth: 558 },
  },

  // ─── CNC sheet + DXF output ───
  // Layer NAMES live in engine/cnc/layers.js (they are a machine contract, not
  // a workshop preference). What belongs here is the sheet metrics.
  cnc: {
    unitNumberLayer: 'UNIT_NUMBER',  // LISP drawText layer for the part label
    labelHeight: 40,                 // LISP drawText height on the CNC sheet
    labelMinHeight: 6,               // …shrunk to fit a small part, never below this
    labelFitRatio: 0.12,             // label height ≤ this × the part's short side
    layoutGap: 50,                   // LISP `odstep` — gap between parts laid out flat
    layoutRowWidth: 3600,            // wrap to a new row past this (preview only)
  },

  // ─── Cutting-list CSV (must stay byte-identical to the LISP output) ───
  csv: {
    header: 'UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM',
    dimDecimals: 0,
    edgingDecimals: 2,
    areaDecimals: 3,
    codes: { left: '<', right: '>', topBottom: '^v', all: '<>^v', none: '' },
  },

  // ─── Editor defaults ───
  // The clearances the collision clamp enforces. A move STOPS at these values
  // (src/engine/collision.js) — they are not advisory.
  editor: {
    snapSteps: [0.5, 1, 32],
    defaultSnap: 1,
    minShelfGap: 40,           // minimum clear space between two shelves
    minShelfEdgeGap: 40,       // …and between a shelf and the top / base / partition
    unitMagnet: 40,            // butt a unit against its neighbour within this
    minUnitGap: 0,             // units stand edge to edge; > 0 forces a scribe gap
  },
};

// ─── Single read point ───

let activeProfile = null;

/**
 * Schema migration for stored profiles (Supabase JSONB, localStorage cache).
 * Missing keys are filled from the current default, user-set values preserved.
 * Without this, a profile saved before a new key existed crashes every formula
 * that reads it.
 */
export function migrateCabinetProfile(profile) {
  if (!profile) return null;
  const D = DEFAULT_CABINET_PROFILE;
  if (profile.schema !== PROFILE_SCHEMA) {
    // Unknown/older shape: nothing user-set is safely transferable yet.
    if (!profile.carcass || !profile.puzzle || !profile.wardrobe) return { ...D };
  }
  return {
    ...D, ...profile,
    schema: PROFILE_SCHEMA,
    board: { ...D.board, ...profile.board },
    front: { ...D.front, ...profile.front, types: { ...D.front.types, ...profile.front?.types } },
    carcass: { ...D.carcass, ...profile.carcass },
    doors: { ...D.doors, ...profile.doors },
    hinges: {
      ...D.hinges, ...profile.hinges,
      rules: { ...D.hinges.rules, ...profile.hinges?.rules },
      cups: { ...D.hinges.cups, ...profile.hinges?.cups,
        baseOffsets: { ...D.hinges.cups.baseOffsets, ...profile.hinges?.cups?.baseOffsets } },
    },
    shelfHoles: { ...D.shelfHoles, ...profile.shelfHoles },
    puzzle: { ...D.puzzle, ...profile.puzzle, layers: { ...D.puzzle.layers, ...profile.puzzle?.layers } },
    wardrobe: {
      ...D.wardrobe, ...profile.wardrobe,
      defaults: { ...D.wardrobe.defaults, ...profile.wardrobe?.defaults },
      drawers: { ...D.wardrobe.drawers, ...profile.wardrobe?.drawers },
      drawerPanel: { ...D.wardrobe.drawerPanel, ...profile.wardrobe?.drawerPanel },
      runners: { ...D.wardrobe.runners, ...profile.wardrobe?.runners },
      rail: { ...D.wardrobe.rail, ...profile.wardrobe?.rail },
    },
    baseUnit: { ...D.baseUnit, ...profile.baseUnit, defaults: { ...D.baseUnit.defaults, ...profile.baseUnit?.defaults } },
    cnc: { ...D.cnc, ...profile.cnc },
    csv: { ...D.csv, ...profile.csv, codes: { ...D.csv.codes, ...profile.csv?.codes } },
    editor: { ...D.editor, ...profile.editor },
  };
}

/** Called by cabinetProfileStore whenever the persisted profile changes. */
export function setActiveCabinetProfile(profile) {
  activeProfile = profile ? migrateCabinetProfile(profile) : null;
}

/** The engine's single read point. Falls back to the Skylon defaults. */
export function getCabinetProfile() {
  return activeProfile || DEFAULT_CABINET_PROFILE;
}

/** Temporarily compute with a frozen (snapshot) profile. */
export function withProfile(profile, fn) {
  const prev = activeProfile;
  if (profile) activeProfile = migrateCabinetProfile(profile);
  try { return fn(); } finally { activeProfile = prev; }
}
