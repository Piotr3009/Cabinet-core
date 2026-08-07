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
      // KIT_SINK L323: the top hinge drops 50 mm to clear the front holder.
      sink: { mode: 'sink', secondFromTop: 300, topFromTop: 150 },
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
      // KIT_SINK L434 — the top cup follows its hinge 50 mm down the door.
      sinkOffsets: { bottom: 100, upperFromTop: 297, topFromTop: 147 },
    },
  },

  // ─── Shelf pin holes ───
  shelfHoles: {
    diameter: 7.5,
    clusterOffsets: [-50, 0, 50],   // 3 holes per row
    columnFromEdge: 70,             // x = 70 and panelWidth − 70
    pinsPerShelf: 4,                // one pin in each corner — the hardware count
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

  // ─── Project heights (turn 5, BACKLOG #29) ───
  // A workshop builds a whole KITCHEN to one set of heights, not each cabinet
  // to its own. These are where a new project starts; Design Settings ▸ Project
  // heights then owns them per project, and a unit inherits the one for its
  // height group (engine/types.js `heightGroup`). A unit may still be given its
  // own height — that is a deliberate exception and the panel marks it custom.
  //
  // The numbers are the SKYLON standard: 720 carcass base and wall units, 2150
  // tall, hung at 1500, on a 100 mm toe kick. They are separate from the
  // per-type `defaults` above, which stay what the AutoLISP kits ship with —
  // the kit default is the factory setting, this is the job.
  projectHeights: {
    base: 770,
    wall: 720,
    tall: 2150,
    wallMount: 1500,
    toeKick: 100,          // = legHeight; the plinth follows it
    // What a project height is allowed to be at all. Outside this the field is
    // clamped, exactly as every other millimetre field is.
    min: 100,
    max: 3000,
  },

  // ─── Legs (shared rule for every standing type) ───
  // Four in the corners; over `extraLegOverWidth` a FIFTH goes in the
  // geometric centre of the footprint (Piotr, turn 3). The AutoLISP only ever
  // draws a PAIR in the elevation view (drawLegPair, legW 78 inset by G) and
  // carries no leg drilling at all, so nothing here emits holes — this is the
  // hardware count and the 3D placement.
  legs: {
    cornerCount: 4,
    extraLegOverWidth: 1000,
    width: 78,              // LISP drawLegPair legW
    insetFromSide: null,    // null = one board thickness, as the LISP does
    insetFromFront: 50,
    insetFromBack: 50,
  },

  // ─── Wall unit (KIT_WUD_FULL) ───
  wallUnit: {
    defaults: { width: 600, height: 720, depth: 400, mountHeight: 1500 },
    doorExtend: 38,          // handleless grab edge: front runs this far below
    hangers: {
      count: 2,
      holeDiameter: 5,
      fromBackEdge: [21, 53],  // two holes per side panel
      fromTop: 53,
      layer: 'HINGES_5MM',
      // Cut-outs in the back panel, both top corners
      cutoutWidth: 30,
      cutoutHeight: 58,
      cutoutLayer: 'HANGER_HOLE',
    },
  },

  // ─── Tall unit (KIT_BUDTALL_FULL) ───
  tallUnit: {
    minHeight: 1100,
    defaults: { width: 600, height: 2100, depth: 558 },
  },

  // ─── Low cabinet (KIT_LOW_CABINET_FULL) ───
  lowCabinet: {
    minHeight: 300,
    defaults: { width: 600, height: 600, depth: 578, railOffset: 200 },
  },

  // ─── Base drawer unit, 3 drawers 4:3:2 (KIT_BUDR_FULL) ───
  baseDrawerUnit: {
    defaults: { width: 600, height: 770, depth: 558 },
    ratio: [4, 3, 2],           // front heights split of (H − stackGaps)
    gap: 3,                     // between fronts, and the top clearance
    frontWidthDeduction: 3,     // front W = W − 3 (overlay, like a single door)
    sideRatio: 0.7,             // box side height = round(0.7 × front height)
    boxWidthClearance: 10,      // box W = internal W − 10
    boxFrontBoards: 4,          // box front/back length = W − 4G − 10
    boxFrontClearance: 10,
    boxFrontHeightDeduction: 15,
    boxFrontHeightExtra: 1,
    bottomOversize: 13,
    depthAllowance: 20,         // usable depth = D − G − 20 (NOT the wardrobe rule)
    firstRowFromBottom: 38,     // runner row above each front's base
    frontScrewFromSide: 50,     // + 2×G + halfDiameter, see cabinet.js
    frontScrewExtra: 3.5,
    frontScrewFromBottom: 96.5, // + G on the bottom drawer
    frontScrewDiameter: 3,
    frontScrewLayer: 'FRONT_HINGES_3MM',
    boxScrewFromEdge: 50,
    bottomScrewFromSide: 70,
    bottomScrewFromEnd: 9,
    runnerPocketWidth: 15,      // DRAWER_RUNNER_POCKET strip on the box side
    bottomPocketExtra: 1,       // DRAWER_BOTTOM_POCKET strip = G + 1 wide
    pocketOvershoot: 10,
  },

  // ─── Sink base (KIT_SINK) ───
  sinkUnit: {
    defaults: { width: 600, height: 770, depth: 558 },
    railHeight: 100,            // two holders on edge instead of a TOP panel
    backSetback: 50,            // back panel sits this far forward, inside
    backHeightDeduction: 120,   // back H = H − 120 − G
    backWidthClearance: 4,      // back W = W − 2G − 4
    backScrewFromBackEdge: 37,
    backScrewFromEnd: 100,
    holderScrewFromTop: [30, 70],
    shelfBackColumnFromEdge: 120,  // shelf pin back column (not the usual 70)
  },

  // ─── Fridge housing (KIT_FRIDGE) ───
  fridgeUnit: {
    minHeight: 1900,
    defaults: { width: 600, height: 2100, depth: 558, fridgeH: 1786 },
    railHeight: 200,            // the two back strips
    spursFromFront: 100,
    spursWidthClearance: 8,
    blockSize: 25,              // 25 × 25 wood blocks carrying the spurs panel
    blockScrewFromFront: 100,
    blockScrewOffsets: [37.5, 87.5],
    blockScrewFromTop: 50,
    fixedScrewFromEnd: 50,
  },

  // ─── Construction automatics (turn 3, phase 7) ───
  // Parts nobody draws by hand: the plinth under a run of units, the scribe
  // filler between a unit and the wall, and the panel that closes the gap
  // between a unit and the ceiling. They are cut pieces like any other — they
  // go in the BOM and on the CNC sheet — so their numbers live here.
  autoParts: {
    plinth: {
      enabled: true,
      // height: null = the unit's own leg height, so raising the legs raises
      // the plinth with them instead of leaving a gap.
      height: null,
      setback: 50,          // recessed from the front face (toe kick)
      thickness: null,      // null = the unit's board thickness
    },
    topInfill: {
      defaultHeight: 40,    // the visible face; "40" is what a workshop says
      minHeight: 10,
      thickness: null,
      // ─── Turn 6 (CLAUDE.md F4 / BACKLOG #20) ───
      // The top infill is an L in section: a face strip standing on the units
      // and a shelf running back off the top of it, the two mitred at 45° and
      // glued. `shelfDepth` is the horizontal leg. It is what stops the piece
      // reading as a flap of board stuck to the front of a run — and it is what
      // the joiner actually screws to the ceiling or the wall.
      shelfDepth: 80,
      // How close two units have to stand to be ONE run. The clamp lands them
      // edge to edge, so this only absorbs the 0.5 mm grid.
      runGap: 1,
      // The open end turns the corner and runs back to the wall (the fourth of
      // the four end conditions). This is the shortest return worth making;
      // below it the mitre is longer than the piece.
      minReturn: 60,
    },
    sideInfill: {
      // The width comes from Design Settings (project level). This is the
      // widest gap the workshop will close with a scribe filler at all — a
      // 200 mm "filler" is a cabinet, not a scribe.
      maxWidth: 120,
      minWidth: 3,
      thickness: null,
      // ─── Turn 6 (CLAUDE.md F4) ───
      // The vertical filler is an L too: arm B closes the gap in the plane of
      // the doors, arm A is screwed to the carcass side and runs back. This is
      // how far back — enough to take two screws, not so far it fouls a hinge.
      returnDepth: 60,
      // An L only fits when the gap is wider than the board it is made of.
      // Under that the piece stays a plain scribe strip, which is what a
      // workshop would cut anyway for a 12 mm gap.
      minLWidth: 24,
      // Turn 4 (BACKLOG #15): the unit STOPS one infill width from the wall, and
      // the filler appears when it is parked there. This is how much slop counts
      // as "parked at the stop" — the clamp lands it exactly, so 1 mm is plenty
      // and a unit sitting out in the room grows no filler at all.
      stopTolerance: 1,
    },
    endPanel: {
      // A masking panel screwed to the outside of a carcass side. Manual, like
      // the plinth: it exists when somebody adds it (BACKLOG #17).
      // `thickness: null` = the project's front thickness, which is what a
      // workshop means by "same as the doors".
      thickness: null,
      defaultHeight: 'floor',       // 'floor' | 'unit'
    },
  },

  // ─── Appearance (turn 4, BACKLOG #4–#6) ───
  // What the furniture LOOKS like. Not one number of it reaches the cut list —
  // but it is still workshop configuration ("our carcass board is broken
  // white"), so it lives here with every other number rather than as literals
  // scattered through the 3D view.
  appearance: {
    // The finishes a project can pick from. `colour` is a painted/melamine
    // board; `decor` is a wood decor whose image is generated by
    // scripts/gen-textures.mjs (no downloaded artwork — BACKLOG #19).
    finishes: [
      { id: 'broken_white', label: 'Broken white', kind: 'colour', hex: '#F2F0EC' },
      { id: 'light_grey', label: 'Light grey', kind: 'colour', hex: '#E8E8E6' },
      {
        id: 'dark_walnut', label: 'Dark walnut', kind: 'decor',
        hex: '#6B4A32', texture: 'textures/dark-walnut.png', repeatMm: 900,
      },
      {
        id: 'light_oak', label: 'Light oak', kind: 'decor',
        hex: '#C9A87C', texture: 'textures/light-oak.png', repeatMm: 900,
      },
    ],
    defaultCarcassFinish: 'broken_white',
    // null = the fronts are whatever the carcass is, which is what a workshop
    // means by "same material throughout".
    defaultFrontFinish: null,
    // Thin BLACK contours — an edges pass, not the old thick brown lines.
    outline: { colour: '#1A1A1A', width: 1, threshold: 12 },
    // ~20 % sheen: a hint of clear coat over a matt board. Not plastic.
    // Kept as the fallback a piece takes when it belongs to no finish family.
    sheen: { roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.35, metalness: 0.0 },

    // ─── PBR per finish family (turn 6, CLAUDE.md F2) ───
    // Turn 4 gave every piece the same 20 % sheen, which is why a melamine
    // carcass and a sprayed door looked like the same material with two
    // colours. They are not the same material and a client can see it: melamine
    // is a matt foil with a wide, soft highlight; two-pack lacquer is a thin
    // clear film over colour, with a tighter one you can read the room in.
    //
    // Which family a piece is in is NOT a list of panel ids — it is the
    // finish_exposed flag the engine already sets (BACKLOG #35): the pieces
    // that go to the spray booth get lacquer, everything else is board.
    materials: {
      melamine: { roughness: 0.58, clearcoat: 0.0, clearcoatRoughness: 0.4, metalness: 0.0 },
      lacquer: { roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.12, metalness: 0.0 },
    },

    // ─── Edge break (turn 6) ───
    // A real board edge is not a mathematical corner: the saw and the edge
    // bander leave 0.5–1 mm of break that catches the light, and its absence is
    // most of what makes a CG cabinet read as CG. Done on the NORMALS, in the
    // shader — a mesh dense enough to model it would cost the whole frame rate
    // for something under a millimetre wide (BACKLOG #37 says so explicitly).
    //
    // `ao` is the same trick used for the other half of the problem: panels
    // meeting panels should darken slightly where they meet. `strength` is what
    // the working view carries, `render` is what a render carries.
    bevel: {
      mm: 0.8,
      strength: 1.0,
      ao: { mm: 7, strength: 0.16, render: 0.3 },
    },

    // The room the furniture is lit BY. RoomEnvironment (three/examples, no
    // download, no .hdr file — CLAUDE.md forbids both) through PMREM. The
    // working view keeps it low so white walls stay white with no tone mapping;
    // a render turns it up and lets ACES hold the highlights.
    environment: { intensity: 0.5, renderIntensity: 0.85, blur: 0.05 },

    // Contact shadow: the dark that says a cabinet is STANDING on the floor
    // rather than hovering a millimetre above it. Not a shadow map — a soft
    // footprint under the unit, which costs one transparent quad per unit.
    contactShadow: { spread: 1.55, opacity: 0.34, softness: 0.55 },
    // Presentation mode (View ▸ Contour): the material fades out, the contour
    // stays. Changes nothing in the BOM.
    contour: { opacity: 0.06, hex: '#ffffff', outline: '#101010' },
    // A shade off the base finish, so a drawer box and a back panel read as
    // separate pieces inside an open carcass instead of one flat mass.
    shade: { drawer_box: 0.1, back: 0.07, plinth: 0.04, infill: 0.02, end_panel: 0.02 },
    // Parts that are not a "finish" at all.
    hardware: { rail: '#8d8d92', leg: '#4a4a4a', bracket: '#8d8d92' },

    // ─── Selection (turn 6, CLAUDE.md F5) ───
    // Turn 4 drew the selected unit's own edges in the app's gold. Two things
    // were wrong with that. The gold is the FURNITURE's colour — a brass
    // handle, a bronze frame — so a selected cabinet read as a cabinet made of
    // something else; and drawing the piece's own outline meant the selection
    // was a property of the object rather than a mark on top of it.
    //
    // What replaces it is what a CAD package draws: a thin DASHED box in the
    // drawing-office navy, standing clear of the solid, following its bounding
    // box and not its geometry. Nothing about it can be mistaken for a part.
    // `offset` is in millimetres of ROOM, so the gap stays 10 mm of furniture
    // whatever the camera is doing.
    selection: {
      colour: '#1B2A4A',        // the same navy the dimension arrows use
      width: 1,
      offset: 10,               // clear of the solid — CLAUDE.md asks for 8–12
      dash: 34,
      gap: 20,
      // Hover is the same mark, quieter: it says "this is what you would get".
      hoverOpacity: 0.32,
    },
  },

  // ─── Render (turn 6, CLAUDE.md F2 / BACKLOG #37) ───
  // An OUTPUT setting, like the CNC sheet metrics below: what size the picture
  // is, what lens it is taken with, how good the shadows are. The maths that
  // uses them is engine/render.js; the 3D layer only points a camera.
  render: {
    resolutions: [
      { id: 'preview', label: '1080p preview', long: 1920, hint: 'Quick look, a second or two' },
      { id: '4k', label: '4K', long: 3840, hint: '3840 px on the longer side — print and proposals' },
    ],
    defaultResolution: 'preview',
    // Shadow map size and softness. `high` is a render-only cost: four times
    // the map in each direction is sixteen times the pixels, and the working
    // view must not pay for it (CLAUDE.md: heavy things ONLY in the render).
    shadow: {
      normal: { label: 'Normal', mapSize: 1024, radius: 3, bias: -0.0006 },
      high: { label: 'High', mapSize: 4096, radius: 7, bias: -0.00018 },
    },
    defaultShadows: 'normal',
    // A 35 mm lens on full frame: 37.8° vertical. Wide enough to take a run of
    // units in without the barrel distortion of a 24, close enough to keep the
    // perspective an interior photograph has.
    focalMm: 35,
    sensorHeightMm: 24,
    // Air around the subject. 1.0 = the furniture touches the frame edge; the
    // framing fits the box's own corners, so this is real breathing room and
    // not slack in the fit.
    margin: 1.1,
    // ACES needs a little more light through it than the flat working view.
    exposure: 1.05,
    // How the lights are scaled for a still: contrast comes from RAISING THE
    // KEY, not from crushing the ambient.
    //
    // That distinction is the whole of this line. The furniture is lit by the
    // lights AND the environment probe; the room is lit by the lights alone
    // (its walls are Lambert, so the probe never reaches them — see Room.jsx).
    // Pull the ambient down far and the two come apart: the cabinets stay
    // bright and the white walls behind them go grey, which is a render that
    // looks like it was taken in a basement.
    lightScale: { ambient: 0.72, key: 1.9, fill: 1.1 },
  },

  // ─── Bought hardware, to catalogue size (turn 7, CLAUDE.md F1/F3) ───
  // Not `appearance.hardware` — that one is COLOURS. This is the CATALOGUE: the
  // millimetres of the things a workshop buys rather than cuts, so the top view
  // can draw a hinge and the X-ray can model one from the same numbers.
  //
  // Nothing here reaches the cutting list. The engine still decides HOW MANY of
  // each and WHERE (result.hardware + result.drillSummary); this only says what
  // one of them looks like. A workshop on a different hinge system changes these
  // numbers and both the drawing and the 3D follow.
  hardware: {
    // A 35 mm cup hinge (the Blum/Hettich standard the drilling in `hinges`
    // above is already dimensioned for — cup ⌀35, 12.5 deep, cup centre 21.5 in
    // from the door edge).
    hinge: {
      cupDiameter: 35,
      cupDepth: 12.5,
      bossHeight: 16,        // the cup body standing proud of the door's back face
      armLength: 62,         // cup centre → the far end of the arm, along the depth
      armWidth: 22,          // across the door's height
      armThickness: 11,
      plateLength: 56,       // mounting plate on the carcass side, front to back
      plateWidth: 34,
      plateThickness: 12,
    },
    // A side-mounted runner pair: two L-profiles, one on the box and one on the
    // carcass, at the runner rows the engine drills. `length` comes from
    // result.hardware ('runner_pairs' → spec.length_mm), never from here.
    runner: {
      profileHeight: 45,     // the visible face of the profile
      profileThickness: 12.5, // how far it stands off the panel it is screwed to
      flangeDepth: 6,        // the return of the L
    },
    // An adjustable leg: a plate, a stem and a foot.
    leg: {
      plateThickness: 4,     // the plate screwed under the carcass; its footprint
                             // is profile.legs.width (78), from the LISP
      stemDiameter: 26,
      footDiameter: 48,
      footHeight: 8,
    },
    // The hanging rail. The 3D drew a ⌀30 tube with the number written into the
    // mesh; it lives here now, with everything else that is bought and not cut.
    rail: { diameter: 30 },
  },

  // ─── Technical drawings (turn 6, CLAUDE.md F7; turn 7, F1) ───
  // The sheet metrics for a printed elevation: what scales the workshop draws
  // at, how big the text is, and the title block that makes a printout read as
  // a drawing rather than a screenshot. Paper millimetres unless noted.
  drawings: {
    // A drawing is at 1:10 or 1:20 — never at 1:13.7. The largest that fits
    // wins, so a 600 mm base unit comes out at 1:5 and a 3.6 m run at 1:20.
    scales: [5, 10, 20, 25, 50],
    margin: 8,             // border, in from the paper edge
    padding: 6,            // inside the border, before the drawing may start
    // In DRAWING millimetres — these are scaled down with the geometry, then
    // held at minTextHeight so a label never becomes a smudge.
    unitNumberHeight: 120,
    textHeight: 90,
    dimensionOffset: 140,
    // …and this is paper millimetres: the floor under all of it.
    minTextHeight: 2.4,
    titleBlock: {
      rows: ['CABINET CORE', 'Project', 'Unit', 'View', 'Scale', 'Date'],
      width: 74,
      rowHeight: 6.5,
      labelWidth: 20,
      labelHeight: 2.5,
      valueHeight: 3.0,
      titleHeight: 3.6,
    },

    // ─── The production card (turn 7, CLAUDE.md F1) ───
    // Three views of one cabinet on one sheet. Every number below is in DRAWING
    // millimetres (they travel with the geometry through the scale), except
    // where it says otherwise.
    unitCard: {
      // Between two views. Wide enough that one view's dimensions never read as
      // the neighbour's.
      viewGap: 280,
      // A card sets its text SMALLER than a single elevation does, and that is
      // not a cosmetic choice: three views and six runs of dimensions have to
      // share one sheet, and every millimetre of drawing-mm text height costs
      // roughly two millimetres of run spacing on all four sides of every view.
      // At 60 the whole card of a base unit fits A3 at 1:10 where 90 forced
      // 1:20 — one whole scale step, bought by setting the numbers at 3 mm on
      // paper instead of 4.5, which is what a drawing office sets them at
      // anyway. The floor is still `minTextHeight`.
      textHeight: 60,
      unitNumberHeight: 100,
      // The caption under each view ("FRONT", "CARCASS (no fronts)", "TOP").
      viewLabelHeight: 75,
      viewLabelGap: 70,
      // Where the detailed dimensions hang. `first` is the innermost run; each
      // further run steps out by `step`, which is what keeps a stack of shelf
      // positions readable instead of overwritten.
      dimFirst: 100,
      dimStep: 125,
      // The title block of a card carries what the workshop asks for at the
      // bench: what it is, and what it is made of.
      titleRows: ['CABINET CORE', 'Project', 'Unit', 'Type', 'Carcass', 'Fronts', 'Scale', 'Date'],
      titleWidth: 108,
      // The front gap (the 3 mm all round a front) is worth SAYING once rather
      // than dimensioning four times — at this scale the arrow would be longer
      // than the gap.
      noteHeight: 55,
    },

    // ─── The project booklet (turn 7, CLAUDE.md F1) ───
    booklet: {
      // The cover: a list of the units in the project, so the first page
      // answers "what is in this job".
      titleHeight: 9,        // paper mm
      headingHeight: 4.2,
      rowHeight: 5.4,
      textHeight: 3.2,
      // Two columns once the list is longer than this.
      rowsPerColumn: 24,
    },
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
    // The precision the WORKSHOP works to (BACKLOG #33). Every millimetre field
    // in the app commits on this grid and every millimetre on screen is shown
    // to it, so "196.5" can be typed, seen and cut. Nothing to do with the drag
    // snap above — that is a user preference, this is what the tool measures in.
    mmStep: 0.5,
    minShelfGap: 40,           // minimum clear space between two shelves
    minShelfEdgeGap: 40,       // …and between a shelf and the top / base / partition
    unitMagnet: 40,            // butt a unit against its neighbour within this
    minUnitGap: 0,             // units stand edge to edge; > 0 forces a scribe gap
    // Auto-order (turn 4): the gap the next shelf leaves below the last one.
    // Never allowed to close up tighter than minShelfGap — that is the clamp.
    itemStackPitch: 350,
  },

  // ─── Distance arrows on the canvas (turn 3 phase 8; redrawn turn 5, #34) ───
  // The measurements the toolbar draws: unit to unit, and unit to wall.
  //
  // Turn 5 draws them the way a drawing office does. Filled cones pointing the
  // wrong way are gone; what is left is a thin line, extension lines out to the
  // faces being measured, an architectural tick across each end, and the value
  // in the middle. Every number below is in ROOM millimetres, so the annotation
  // scales with the drawing instead of with the camera.
  dimensions: {
    minGap: 2,            // below this the two things are touching, not spaced
    arrowHead: 45,        // length of the tick / open head, in room mm
    standoff: 90,         // how far in front of the units the line is drawn
    height: 120,          // how high above a unit's base the line floats
    // "1 px look": the thinnest bar that survives being rasterised at the
    // distances this scene is viewed from. Thinner and the line strobes.
    lineWeight: 3,
    extension: 110,       // extension line, from the measured face outwards
    extensionGap: 18,     // …starting this far off the face, as a draughtsman does
    tickAngle: 45,        // the oblique architectural tick, in degrees
    // How the ends are drawn: 'tick' = the 45° slash of an architectural
    // drawing, 'open' = a two-stroke arrowhead with nothing filled in.
    head: 'tick',
    // Which way the value sits off the line.
    labelOffset: 70,
    // The two inks of a technical drawing. Navy is the default; red is the
    // option in View ▸ Dimension colour. Nothing else on the canvas is either
    // colour, so a measurement never reads as part of the furniture.
    colours: {
      navy: '#1B2A4A',
      red: '#8C182B',
    },
    defaultColour: 'navy',
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
        baseOffsets: { ...D.hinges.cups.baseOffsets, ...profile.hinges?.cups?.baseOffsets },
        sinkOffsets: { ...D.hinges.cups.sinkOffsets, ...profile.hinges?.cups?.sinkOffsets } },
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
    projectHeights: { ...D.projectHeights, ...profile.projectHeights },
    legs: { ...D.legs, ...profile.legs },
    wallUnit: {
      ...D.wallUnit, ...profile.wallUnit,
      defaults: { ...D.wallUnit.defaults, ...profile.wallUnit?.defaults },
      hangers: { ...D.wallUnit.hangers, ...profile.wallUnit?.hangers },
    },
    tallUnit: { ...D.tallUnit, ...profile.tallUnit, defaults: { ...D.tallUnit.defaults, ...profile.tallUnit?.defaults } },
    lowCabinet: { ...D.lowCabinet, ...profile.lowCabinet, defaults: { ...D.lowCabinet.defaults, ...profile.lowCabinet?.defaults } },
    baseDrawerUnit: { ...D.baseDrawerUnit, ...profile.baseDrawerUnit, defaults: { ...D.baseDrawerUnit.defaults, ...profile.baseDrawerUnit?.defaults } },
    sinkUnit: { ...D.sinkUnit, ...profile.sinkUnit, defaults: { ...D.sinkUnit.defaults, ...profile.sinkUnit?.defaults } },
    fridgeUnit: { ...D.fridgeUnit, ...profile.fridgeUnit, defaults: { ...D.fridgeUnit.defaults, ...profile.fridgeUnit?.defaults } },
    autoParts: {
      ...D.autoParts, ...profile.autoParts,
      plinth: { ...D.autoParts.plinth, ...profile.autoParts?.plinth },
      topInfill: { ...D.autoParts.topInfill, ...profile.autoParts?.topInfill },
      sideInfill: { ...D.autoParts.sideInfill, ...profile.autoParts?.sideInfill },
      endPanel: { ...D.autoParts.endPanel, ...profile.autoParts?.endPanel },
    },
    appearance: {
      ...D.appearance, ...profile.appearance,
      // The finish LIST is the app's, not the stored profile's: a project saved
      // before a decor existed must still be able to show it.
      finishes: mergeFinishes(D.appearance.finishes, profile.appearance?.finishes),
      outline: { ...D.appearance.outline, ...profile.appearance?.outline },
      sheen: { ...D.appearance.sheen, ...profile.appearance?.sheen },
      materials: {
        melamine: { ...D.appearance.materials.melamine, ...profile.appearance?.materials?.melamine },
        lacquer: { ...D.appearance.materials.lacquer, ...profile.appearance?.materials?.lacquer },
      },
      bevel: {
        ...D.appearance.bevel, ...profile.appearance?.bevel,
        ao: { ...D.appearance.bevel.ao, ...profile.appearance?.bevel?.ao },
      },
      environment: { ...D.appearance.environment, ...profile.appearance?.environment },
      contactShadow: { ...D.appearance.contactShadow, ...profile.appearance?.contactShadow },
      contour: { ...D.appearance.contour, ...profile.appearance?.contour },
      shade: { ...D.appearance.shade, ...profile.appearance?.shade },
      hardware: { ...D.appearance.hardware, ...profile.appearance?.hardware },
      selection: { ...D.appearance.selection, ...profile.appearance?.selection },
    },
    render: {
      ...D.render, ...profile.render,
      resolutions: Array.isArray(profile.render?.resolutions) && profile.render.resolutions.length
        ? profile.render.resolutions
        : D.render.resolutions,
      shadow: {
        normal: { ...D.render.shadow.normal, ...profile.render?.shadow?.normal },
        high: { ...D.render.shadow.high, ...profile.render?.shadow?.high },
      },
    },
    hardware: {
      ...D.hardware, ...profile.hardware,
      hinge: { ...D.hardware.hinge, ...profile.hardware?.hinge },
      runner: { ...D.hardware.runner, ...profile.hardware?.runner },
      leg: { ...D.hardware.leg, ...profile.hardware?.leg },
      rail: { ...D.hardware.rail, ...profile.hardware?.rail },
    },
    drawings: {
      ...D.drawings, ...profile.drawings,
      scales: Array.isArray(profile.drawings?.scales) && profile.drawings.scales.length
        ? profile.drawings.scales
        : D.drawings.scales,
      titleBlock: {
        ...D.drawings.titleBlock, ...profile.drawings?.titleBlock,
        rows: Array.isArray(profile.drawings?.titleBlock?.rows) && profile.drawings.titleBlock.rows.length
          ? profile.drawings.titleBlock.rows
          : D.drawings.titleBlock.rows,
      },
      unitCard: {
        ...D.drawings.unitCard, ...profile.drawings?.unitCard,
        titleRows: Array.isArray(profile.drawings?.unitCard?.titleRows) && profile.drawings.unitCard.titleRows.length
          ? profile.drawings.unitCard.titleRows
          : D.drawings.unitCard.titleRows,
      },
      booklet: { ...D.drawings.booklet, ...profile.drawings?.booklet },
    },
    cnc: { ...D.cnc, ...profile.cnc },
    csv: { ...D.csv, ...profile.csv, codes: { ...D.csv.codes, ...profile.csv?.codes } },
    editor: { ...D.editor, ...profile.editor },
    dimensions: { ...D.dimensions, ...profile.dimensions },
  };
}

/**
 * Finishes a stored profile carries, plus every finish the app ships. A user's
 * own entry wins on its id; anything new arrives on top, so a project saved
 * before "light oak" existed still opens with light oak available.
 */
function mergeFinishes(defaults, stored) {
  if (!Array.isArray(stored) || !stored.length) return defaults.map((f) => ({ ...f }));
  const byId = new Map(defaults.map((f) => [f.id, { ...f }]));
  for (const f of stored) {
    if (!f?.id) continue;
    byId.set(f.id, { ...(byId.get(f.id) || {}), ...f });
  }
  return [...byId.values()];
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