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

    // ─── WHAT A SQUARE METRE OF BOARD WEIGHS (turn 19, CLAUDE.md F5.1) ─────
    //
    // The owner's own numbers, and they are the floor under the lift-selection
    // engine: an AVENTOS is chosen on POWER FACTOR, which is the cabinet's
    // height times the FRONT'S WEIGHT, and a front's weight is its area times
    // one of these. A workshop that stocks a heavier board assigns it and its
    // `kg_m2` wins (engine/lifts.js `boardKgM2`); this is what the app knows
    // when nobody has assigned anything, which is most of the time while a job
    // is being drawn.
    //
    // Two families because they are genuinely different boards: chipboard with
    // a melamine face, and MDF with lacquer on it. `reference/hardware/
    // aventos.json → board_kg_m2` carries the same table — it is the CATALOGUE
    // OF RECORD (F0.3) and test/turn19-lifts.test.js holds the two to each
    // other, so neither can drift.
    kgM2: {
      mfc: { 18: 12, 22: 14.5, 25: 16.5 },
      mdf_lacquered: { 18: 14, 22: 17, 25: 19 },
    },
    // Which of those families a board belongs to when nothing says otherwise.
    // A sprayed front is lacquered MDF in this workshop; everything else is
    // faced chipboard.
    defaultKgM2Kind: 'mfc',
    sprayedKgM2Kind: 'mdf_lacquered',
  },
  front: {
    thickness: 25,                    // 18 = MDF, 19 = melamine, 25 = shaker
    thicknessOptions: [18, 19, 25],
    types: {
      // ─── TURN 25 (CLAUDE.md F3): A SHAKER THAT LOOKS LIKE ONE ────────────
      //
      // Until this turn a shaker rendered as a flat slab and only its 25 mm
      // thickness said otherwise. What makes it a shaker is a RECESS in its
      // face, and the numbers of that recess are here.
      //
      // `frameWidth` was 50 — the AutoLISP elevation's `off`, traced in turn 5
      // for a line on a drawing rather than for a cut. The owner's number for
      // the piece is 70, and it is now ONE number: the elevation draws the
      // frame the machine pockets, so the picture and the door cannot disagree.
      //
      // EQUAL ON ALL FOUR SIDES — "shaker zawsze równy". There is deliberately
      // no rail/stile pair here: a second number is a second thing to get
      // wrong, and the owner does not want one.
      //
      // `minPanel` is OURS and is said so plainly. The owner gave the frame's
      // range and the recess depth; he did not give the narrowest panel worth
      // cutting, and the engine has to have one or a 148 mm frame on a 300 mm
      // door leaves a 4 mm slot and calls it a shaker. 60 mm is a workshop
      // judgement — a panel narrower than the frame around it does not read as
      // a panel — and it is a DEFAULT in the profile, so a workshop that
      // disagrees changes one line. What it must never do is silently move the
      // frame instead (F3.2).
      // ─── TURN 34 (CLAUDE.md F7): THE DEFAULT BECOMES 60 ──────────────────
      // The owner, 16.08.2026: *"zmienimy default z 70 na 60, ale nie teraz"*
      // — "nie teraz" was the chat; the turn is now. It is a DEFAULT for NEW
      // projects and nothing more: a saved job with Shaker in it and no
      // explicit `fronts.shakerFrame` is PINNED to 70 on the way in
      // (`engine/shaker.js legacyShakerFrame`, applied by `loadProject`),
      // because a changed default must never redraw a job that is already
      // cut. The range, 10–200, does not move.
      S: {
        label: 'Shaker',
        frameWidth: 60,          // equal on all four sides
        // What a project saved BEFORE 16.08.2026 was cut to. Read only by the
        // pin above; nothing else in the app may use it as an answer.
        legacyFrameWidth: 70,
        frameMin: 10,
        frameMax: 200,
        recessDepth: 6,          // panel face sits at frontT − 6
        minPanel: 60,
        pocketLayer: 'SHAKER_PANEL_POCKET',
      },
      H: { label: 'Handleless (J-groove)', grooveDepth: 30 },
      F: { label: 'Flat' },
      // ─── TURN 30 (CLAUDE.md F21): THE GLASS DOOR ──────────────────────────
      //
      // "Front style `glass`: frame + translucent panel in 3D, BOM says glass
      // door; hinge rule unchanged."
      //
      // A glass door is a SHAKER whose panel is not there: the same frame, of
      // the same width, cut by the same arithmetic — `engine/shaker.js` — and
      // the recess taken all the way through instead of 6 mm deep. Borrowing
      // the frame rather than giving glass a number of its own is deliberate:
      // a kitchen whose glass doors wear a different frame from its solid ones
      // is a kitchen nobody meant to build, and one law is one thing to get
      // right.
      //
      // What is NOT here is a rebate. The glass sits in the aperture the way
      // this workshop glazes a door, and no LISP line and no published pattern
      // states that detail — so nothing is cut for it and the gap is named in
      // the report.
      GL: { label: 'Glass', apertureLayer: 'GLASS_APERTURE' },
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
    // ─── Turn 8 (CLAUDE.md F4) ───
    // The same 20 mm, for the pieces the AutoLISP cut FULL depth: a FIX shelf
    // and a partition. An adjustable shelf has stood 20 mm back from the face
    // since the LISP (the line above) and a joiner reads that gap as the front
    // of the cabinet; a partition flush with the face beside it reads as a
    // mistake, and it is the piece a hinge arm swings closest to.
    //
    // It is a DEFAULT, not a rule: every one of these pieces may be pulled out
    // to the face on its own (`front_mm` on the item, `partition_front_mm` on
    // the unit), because a partition under a worktop sometimes has to be.
    //
    // The TOP and BOTTOM stay full depth and are not in this: they carry the
    // puzzle joint, and shortening them is shortening the carcass.
    interiorSetback: 20,
  },

  // ─── HANDLES (turn 25, CLAUDE.md F4) ────────────────────────────────────
  //
  // The owner's reference law is `engine/handles.js`; these are the numbers it
  // reads. Every one of them is his except `holeDiameter` and the model
  // proportions, which are said to be ours below.
  handles: {
    // "50 from the TOP … 50 in from the opening edge" — the one inset, used on
    // both axes and by all four classes, because it is one number in his head.
    inset: 50,
    // A shaker's handle goes on the centre line of the FRAME. Under this the
    // frame is too narrow to centre anything on and the 50 × 50 rule answers
    // instead — the owner's own fallback, and his number.
    shakerMinFrame: 30,
    // OURS: a handle screw is an M4 through a front, which is a ⌀5 clearance
    // hole on any bench in the country. It gets a NAMED LAYER of its own for
    // the reason BISCUIT_4MM and SHAKER_PANEL_POCKET did — it is a tool of its
    // own on the bed, and VCarve matches tools by layer name.
    holeDiameter: 5,
    layer: 'HANDLES_5MM',
    // The centres a bar comes in. A typed number is accepted too (F4), so this
    // is the list the picker offers rather than a set of allowed values.
    barCentres: [96, 128, 160, 192, 224],
    defaultCentres: 128,
    // ─── The procedural models (F4.3) ───
    // GOLD "for now": catalogue models arrive later by the bucket route, and
    // what this turn fixes is the CONTRACT — the mount point and the axis —
    // rather than the shape. These proportions are OURS: a 12 mm bar on 32 mm
    // posts and a 30 mm hemisphere are the commonest things in a catalogue,
    // and they are here so that a bought model that replaces them arrives at
    // the same place with the same axis.
    bar: { rodDiameter: 12, standoff: 32, postDiameter: 10, overhang: 20 },
    knob: { diameter: 30, standoff: 22, stemDiameter: 8 },
    finish: 'gold',
  },

  // ─── TURN 31 (CLAUDE.md F4.4 / F4.4a): APPLIANCE FACES ────────────────────
  //
  // An appliance is a BOUGHT thing with a published size, and rule 4a turns on
  // it: "every front above/below the appliance takes the APPLIANCE's width
  // (oven 598 → drawer front below is 598)".
  //
  // The owner's own two numbers, 15.08.2026. Rule 2 of the turn — no hole
  // without truth — applies to sizes as well: a machine that is not named here
  // gets no invented width, and `applianceFaceWidth` falls back to the
  // carcass less the matrix's own 3 + 3, which is what a 594-in-600 dishwasher
  // already is.
  appliances: {
    faceWidth: {
      oven: 598,     // the owner's example, verbatim
      dw: 594,       // 594 in a 600 opening — the appliance provides the 3
    },
    defaultInsetMm: 3,
  },

  // ─── TURN 31 (CLAUDE.md F6): CHECK v1's OWN NUMBERS ───────────────────────
  //
  // "Rules, with the owner's colours; thresholds are profile numbers marked as
  // owner-tunable." Each of these is his, agreed 15.08.2026, and each moves
  // alone. The rules themselves are engine/checks.js.
  checks: {
    // #3 — over this height, a cabinet with shelves and none of them FIXED is
    // a cabinet whose sides will bow. OWNER'S NUMBER: 1200.
    tallNoFixHeightMm: 1200,
    // #5 — the window of OPEN gap above a run that wants a filler. Under 20 is
    // a shadow line; over 80 is a decision somebody has already made.
    // OWNER'S NUMBERS: 20–80.
    openGapFromMm: 20,
    openGapToMm: 80,
    // #8 — over this width, a 110° hinge will not open the door far enough to
    // get a drawer out past it. OWNER'S NUMBER: 600.
    wideFrontMm: 600,
  },

  // ─── Doors / fronts ───
  doors: {
    // ─── TURN 30 (CLAUDE.md F12): HOW NEAR TWO FRONTS MAY COME ────────────
    //
    // Room level: the gap between NEIGHBOURING fronts in a run — the last door
    // of one cabinet and the first of the next. Two cabinets that each measure
    // perfectly can still be set out 1.5 mm apart, and nothing in this app said
    // so until tonight.
    //
    // Under this, the pair's meeting edges are painted RED and the value is
    // shown. It is a WARNING OVERLAY and not a block: the cabinets are built
    // exactly as they were asked for.
    minNeighbourGapMm: 3,
    // ─── TURN 33 (CLAUDE.md F4): MIRRORS ON DOORS ──────────────────────────
    // The ordered glass is the FRONT minus this margin a side. ONE profile
    // line, 15.08.2026 — 20 ships marked `owner to confirm`. A mirror is
    // BONDED, never drilled: no number in this block can reach a hole.
    mirror: { marginPerSide: 20 },
    // ─── TURN 31 (CLAUDE.md F4.16 / F4.18): AND HOW WIDE IS TOO WIDE ───────
    //
    // OWNER'S DEFAULT, 15.08.2026 (his word: "one profile number"). Over this,
    // the gap is a YELLOW question rather than a fault — "too wide — infill or
    // front correction?" — because a 9 mm joint is not dangerous, it is ugly,
    // and which of the two answers is right is the joiner's call.
    maxNeighbourGapMm: 6,
    // How far away a thing can be and still be THE NEIGHBOUR of a front.
    // OWNER-TUNABLE DEFAULT, 15.08.2026 — the owner has not named it. A side
    // filler is at most 120 (autoParts.sideInfill.maxWidth), so 200 catches
    // everything that is a joint and nothing that is the next cabinet along.
    neighbourReachMm: 200,
    // ─── TURN 31 (CLAUDE.md F4.A): THE CLEARANCE MATRIX, THE OWNER'S OWN ───
    //
    // How far a front's edge stands INSIDE its own carcass end, decided by what
    // is beside it. Left and right independent (rule 8). Agreed point by point
    // on 15.08.2026; the L-shape corner (rule 7) is PARKED with the L-shape
    // unit and has no number here on purpose — engine/frontClearance.js reads
    // `null` for it and the Check says "parked" rather than passing it.
    clearance: {
      front: 1.5,      // 1. another cabinet's front → 1.5 + 1.5 = the 3 a client sees
      endPanel: 3,     // 2. an end panel
      infill: 3,       // 3. an infill/filler — same category as a panel
      appliance: 0,    // 4. an appliance with its own front provides the 3 itself
      wall: 3,         // 5. a bare wall, + the yellow "infill? (dust collection)"
      none: 1.5,       // 6. the end of a run
    },
    // 1 door while (width − widthDeduction) ≤ singleDoorMaxWidth → 2 doors from
    // width 705 mm (704 is still ONE door — BLOCKERS.md #2)
    widthDeduction: 4,
    singleDoorMaxWidth: 700,
    gap: 3,                    // overlay clearance: single front = (W−gap) × (H−gap)
    doubleTotalGap: 6,         // pair of fronts = ((W − doubleTotalGap)/2) × (H − gap)
    defaultHinge: 'L',
    // ─── How far a door opens in the 3D view (turn 8, CLAUDE.md F5) ───
    // `openAngle` is what a door in the middle of a run swings to when you
    // double-click it: a little past square, which is what a hinge does and
    // what makes the inside of the cabinet readable.
    //
    // `openAngleAtWall` is the answer when there is a WALL on the hinge side.
    // Past 90° a door starts to come BACK towards that wall — its free edge
    // crosses the hinge line — so a run of cabinets in a corner would animate
    // its end door straight through the plaster. Square is where it stops.
    // Neither number reaches the cut list; a swing is a picture.
    openAngle: 99,
    openAngleAtWall: 90,
  },

  // ─── Hinge drilling ───
  hinges: {
    // ─── Turn 17 (CLAUDE.md F7.1): THE PROJECT STANDARD ────────────────────
    // "Project setup gains 'Standard hinges: 2 / 3', default 3." Three is what
    // the kits have always drilled, so a project that never opens the setting
    // cuts what it cut yesterday. Two takes ONE MIDDLE hinge off each door and
    // leaves the outer ones exactly where the rule put them
    // (engine/cabinet.js `hingeRows`).
    standard: 3,
    standardOptions: [2, 3],
    holeDiameter: 5,
    // ─── TURN 35 (CLAUDE.md F8): THE PILOT THE PLATE IS SCREWED WITH ────────
    //
    // Owner, 16.08.2026: *"nie mamy ustawienia w ogóle 5 mm czy 3 mm screws
    // zawiasy wiercenie — niektórzy używają tak, inni inaczej"*; where it
    // goes: *"to ustawienie musi być w hardware ustawieniach"*; and the
    // default: *"5, jak jest teraz"*.
    //
    // `holeDiameter` above is the number this app has drilled since turn 1 and
    // it does not move — it is what a bare `computeCabinet()` and every golden
    // fixture take. `platePilotD` is the WORKSHOP's answer, and it opens on
    // the same 5, so nothing that has never touched the setting is re-cut. A
    // shop that knocks its plates in on ⌀3 screws says so once here.
    //
    // The diameter travels in the LAYER NAME and nowhere else — `HINGES_3MM`
    // beside `HINGES_5MM` in engine/cnc/layers.js. NO text style rides with
    // it: the DXF writer has no STYLE table, which is the 02.08 VCarve crash
    // law, and a layer name is what VCarve maps a tool by anyway.
    platePilotD: 5,
    platePilotOptions: [3, 5],
    holePairOffset: 16,        // 2 holes per centre at centre ± 16
    // ─── TURN 31 (CLAUDE.md F3 / Check #10): HOW NEAR TWO ROWS MAY COME ────
    //
    // OWNER'S NUMBER, 15.08.2026: 60 mm.
    //
    // The fault it stops is live in the app today, not hypothetical:
    // `hinge_rows [100, 100, 470]` is storable from the editor and makes the
    // engine emit the cups at 84 and 116 TWICE, on one panel, on one layer, at
    // one coordinate. On the machine that is a 5 mm bit going back into a hole
    // it has already made.
    //
    // 60 is the physical line as well as the arithmetic one: a CLIP top cup is
    // 35 across and its plate reaches further again, so two rows inside 60 are
    // two hinges that cannot both be fitted whatever the drilling says.
    minSpacingMm: 60,
    // ─── TURN 31 (CLAUDE.md F4.10 / F4.11 / F4.18) ─────────────────────────
    // How much a fitted hinge can absorb on its OWN side adjustment. Under
    // this, a front correction is soaked up silently and the plates on the
    // carcass never move (rule 10); over it, the Check says "beyond the
    // hinge's adjustment — check" in yellow (rule 11).
    // OWNER'S NUMBER, 15.08.2026: ±1.5.
    sideAdjustMm: 1.5,
    // CLAUDE.md F3: "One profile line flips block→warn if the owner ever wants
    // it loose." This is the line. It ships BLOCKING, because what it stops is
    // a board in the skip; `false` leaves the move allowed and the yellow said.
    spacingBlocks: true,
    xFromFrontEdge: 37,        // measured from the FRONT edge of the side panel
    layer: 'HINGES_5MM',
    endOffset: 100,            // first/last hinge centre, from panel end
    // ─── TURN 30 (CLAUDE.md F11): TWO HINGES UNDER … ───────────────────────
    //
    // The LISP's ladders are what they are — Base is ALWAYS three, Low takes
    // two under 800 — and `null` is those ladders. The owner's own standard is
    // ANY door under 600 mm on TWO hinges, at 100 and `wys − 100`, and it
    // arrives on the OVERRIDE CHANNEL (company row → project → `hinge_two_
    // below_mm`) rather than as a changed ladder. Null here is what keeps a
    // bare `computeCabinet()` — every golden fixture — drilling the AutoLISP's
    // own count.
    twoBelowMm: null,
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
    // ─── TURN 33 (CLAUDE.md F10): THE OWNER'S DECLARED STANDARD ────────────
    // OWNER, 15.08.2026: "piny do półek default 50 mm bez ustawiania —
    // kiedyś było ustawiane, teraz już nie trzeba." This is the PROFILE'S
    // ANSWER on the OVERRIDE CHANNEL — every app project drills 50 unless a
    // saved design still carries its own number (that field stays honoured).
    // HONEST NOTE, written where the numbers sit: the app's DXF now drills
    // 50 while the workshop's own LISP macros drill 70 (`columnFromEdge`
    // above — the BARE engine's answer, which every golden fixture holds);
    // the day the LISP moves to 50, the bare engine follows it. ONE line,
    // owner-tunable.
    ownerPinSetback: 50,
    pinsPerShelf: 4,                // one pin in each corner — the hardware count
    layer: 'SHELVES_7_5MM',
    // Row spacing is (H − 2×G)/(n+1) measured over the FULL carcass height,
    // even when a drawer stack occupies the bottom (KIT_WARDROBE_FULL v1
    // behaviour, recorded in golden-wardrobe.json → shelf_holes_quirk).
    spanMode: 'fullHeight',
    // When the UI supplies explicit shelf positions, drill the rows there
    // instead of on the even-spacing formula.
    followPositions: true,
    // ─── TURN 30 (CLAUDE.md F3): WHICH FACE OF A DIVIDER IS BORED ─────────
    //
    // The owner: a partition shows shelf-pin drilling on BOTH faces, and a
    // machine drills one. He is right, and it was worse than a picture: a
    // partition serving two bays had the SAME ladder emitted twice, once for
    // each bay's shelves, at identical x and y — six positions, twelve holes,
    // the bit going down the same hole a second time.
    //
    // A divider is bored from ONE face and this is which. It is a per-divider
    // setting (the item's own `drill_face`, from the divider's modal) and this
    // is the answer a divider that has not been asked falls back to.
    //
    // LEFT ships tonight, and CLAUDE.md is explicit about what that means: the
    // owner wants a longer conversation about dividers, so this is a SAFE
    // PLACEHOLDER — one line to change — and the SETTING is not in question.
    // The Q1 in the push message is this line and nothing else.
    partitionFace: 'L',
  },

  // ─── Skylon puzzle joint (SKYLON_COMMON drawBUL / drawBUR / drawTOP_ROT90) ───
  puzzle: {
    tabCentresFromEnd: 95,     // outer tab centres; the third sits at mid-length
    tabHalfOpening: 19,        // half-width of the slot mouth at the edge
    tabHalfWidth: 25,          // half-width once past the shoulder
    // ─── OWNER, 12.08.2026: 13, FOR THE ½″ CUTTER ────────────────────────
    // 10.5 was set out for a ⌀10 tool; the workshop is on ⌀12.7 now (the
    // biggest bit anyone cuts board with) and at 10.5 the neck's own corner
    // radius left the joint tight. His bench number, both LISPs and this
    // line: change together, never apart.
    shoulderDepth: 13,         // depth at which the slot widens
    dogboneHalfHeight: 30,     // relief pocket ± this around the tab centre
    socketHalfWidth: 25.5,     // socket pocket on the mating edge
    socketOvershoot: 6,        // pocket runs 6 mm past the panel edge
    socketHoleOffset: 24.5,    // 2 holes per socket at ± this
    socketHoleDiameter: 7.5,
    socketHoleInset: 1,        // holes sit 1 mm inside the pocket
    // ─── Turn 7 (CLAUDE.md F4 / BACKLOG #28) ───
    // Below this run length the two sockets COLLIDE, and one socket goes in the
    // middle instead. The AutoLISP never met this case — its kits are 558 and
    // 578 deep — so there is no LISP number to trace and the threshold is
    // DERIVED from the geometry above:
    //
    //   190    the two socket centres, `tabCentresFromEnd` (95) in from each end
    // + 56.5   each socket's own footprint across the run. Not the pocket:
    //          the HOLES are wider than it. ±max(socketHalfWidth 25.5,
    //          socketHoleOffset 24.5 + socketHoleDiameter/2 3.75) = ±28.25,
    //          and two of those halves is 56.5.
    // + 18     the minimum bridge — the narrowest web of board a cutter should
    //          be asked to leave standing between two pockets, which is one
    //          standard board thickness (board.thickness).
    // = 264.5
    //
    // A workshop on a different board or different sockets recomputes it the
    // same way; test/single-socket.test.js recomputes it on every run, so the
    // number and the reasoning cannot drift apart.
    singleSocketBelow: 264.5,
    // ─── TURN 25 (CLAUDE.md F2): ONE CENTRED JOINT ON A SHALLOW CABINET ─────
    //
    // From the owner's CORRECTED `panel_joints.lsp`, and it is his arithmetic
    // rather than ours: a socket is 51 mm wide and a dog bone is 60, and both
    // are set out 95 mm in from each end of the run. Two of them therefore
    // collide on a narrow panel —
    //
    //     sockets    2 × 95 + 51 = 241     …below 241 the pockets meet
    //     dog bones  2 × 95 + 60 = 250     …below 250 the reliefs meet
    //
    // — which is the same collision `singleSocketBelow` was derived for in
    // turn 7, arrived at from the other end. The difference is what the answer
    // is keyed on. `singleSocketBelow` asks about the RUN, one panel at a time;
    // the owner asks about the CABINET, once, and every mating panel takes the
    // same answer so the joints still line up. A side whose socket is centred
    // and a top whose tab is at 95 is not a joint at all.
    //
    // ONE RESOLVED INSET PER UNIT (`engine/puzzle.js resolvedJointInset`):
    // depth at or under `singleJointMaxDepth` ⇒ one joint on the panel's own
    // centre line; above it ⇒ the pair at `tabCentresFromEnd`, exactly as
    // before. 300 is the owner's number and it stands clear of both collisions
    // with room to spare: a 300 mm carcass has a 282 mm run, which is 32 mm
    // above the dog bones' own limit — the margin is deliberate, because a
    // joint that only just fits is a joint that fails on a board cut 2 mm under.
    //
    // Same features, fewer of them. No new entity class, no new layer.
    singleJointMaxDepth: 300,
    // ─── Turn 8 (F0 / BLOCKERS #37 / BACKLOG #47) ───
    // The same family of problem on the OTHER axis. `tabCentres()` puts three
    // tabs down the back edge of a side panel — 95 in from each end and one in
    // the middle — and on a LOW carcass the middle one walks into the outer
    // ones. The tab itself is ±25, but the DOG BONE around it is ±30, and it is
    // the dog bone that has to clear:
    //
    //   190    the two outer centres, `tabCentresFromEnd` (95) in from each end
    // + 120    each outer tab's own footprint plus the middle tab's, both ends:
    //          2 × 2 × max(tabHalfWidth 25, dogboneHalfHeight 30) = 120
    // + 36     the minimum bridge, one board thickness on EACH side of the
    //          middle tab — there are two gaps to keep open here, not one
    // = 346
    //
    // Below this the middle tab is not cut and the panel has two, exactly as it
    // has two sockets below `singleSocketBelow`. `LOW_CABINET.minHeight` is 300,
    // so the case is reachable from the UI. test/low-tabs.test.js recomputes the
    // number on every run, so it and the reasoning cannot drift apart.
    //
    // ─── TURN 52 (CLAUDE.md F3): 346 IS THE FLOOR NOW, NOT THE SWITCH ──────
    //
    // The owner, 26.08.2026: *"jak niska szafka poniżej 600 mm to już zrób 2
    // dog bonesy, a jak poniżej 300 to jeden dog bones — na plecach i BUL i
    // BUR."*
    //
    // So this is the OWNER'S NUMBER from tonight and no longer the derived one.
    // The derivation above (190 + 120 + 36 = 346) stops being the explanation
    // of THIS field and becomes the FLOOR it may never go below: under 346 the
    // three dog bones genuinely collide, so a workshop that lowers the switch
    // past it is asking for a hole through the middle of a panel rather than a
    // joint. `engine/puzzle.js middleTabThreshold` still computes it and
    // `test/low-tabs.test.js` still holds this number above it.
    //
    // LISP IS LAW, FIRST (iron rule 3): born in `reference/lisp/
    // SKYLON_COMMON.lsp` as `SKY:tabCount` / `SKY:tabCentres` /
    // `SKY:middleTabFloor`, and this is the application following it.
    middleTabBelow: 600,   // 26.08.2026 (T52-F3), was 346 — the derived floor
    // ─── …AND ONE TAB ON A REALLY LOW CARCASS ──────────────────────────────
    //
    // *"a jak poniżej 300 to jeden dog bones."*  At or under this there is ONE
    // tenon, on the panel's own middle line — the twin, on the height axis, of
    // `singleSocketBelow` on the depth axis.
    //
    // AT OR UNDER, and the boundary is the whole of it: `lowCabinet.minHeight`
    // is EXACTLY 300, so a rule written as `< 300` could never fire on the one
    // cabinet it exists for and the feature would ship dead. He said "poniżej
    // 300" of a cabinet he can only build AT 300. `middleTabBelow` above keeps
    // the ordinary reading — at 600 there are still three — because 600 is not
    // a boundary anything is pinned to.
    singleTabAtOrBelow: 300,
    screwDiameter: 3,
    screwFromEnd: 50,          // screws at 50, mid, length−50
    // ─── TURN 24 (CLAUDE.md F4): `centrelineExtra` IS GONE ─────────────────
    //
    // It read `centrelineExtra: 0.5` and put every screw and socket centreline
    // at `G/2 + 0.5`. The owner: he does not remember it, it is wrong, and it
    // skews the whole calculation. A screw driven into the EDGE of a board goes
    // down the middle of that board — 9.00 on an 18, 9.25 on a measured 18.5 —
    // and half a millimetre of nothing on top of it is half a millimetre of
    // nothing in every DXF the workshop cuts.
    //
    // The law is now `thicknessOf(part) / 2` (engine/thickness.js), which is
    // also what makes F3's measured board reach the drilling: the axis follows
    // the caliper because it is derived from it rather than from a nominal with
    // a fudge on it.
    //
    // THE DELTA IS GLOBAL AND IT IS NAMED: every DXF containing a screw axis
    // shifts that axis by −0.5. Golden fixtures and fingerprints REGENERATE
    // under this name and no other; `scripts/cnc-axis-classifier.mjs` is the
    // proof of innocence, and `verify/t24/cnc-export-identity.md` prints it.
    layers: {
      outline: 'OUTLINE',
      socket: 'PUZZLE_SOCKET',
      dogbone: 'PUZZLE_DOG_BONES',
      socketHole: 'PUZZLE_HOLES_7_5MM',
      screw: 'SCREWS_3MM',
    },
  },

  // ─── HOVER DIMENSIONS (turn 23, CLAUDE.md F8) ───────────────────────────
  //
  // Owner: the corner caption is not what he asked for. He wants thin, small,
  // beautiful BLUE dimension arrows that appear on hover and vanish on leave —
  // like a drawing.
  //
  // ONE STYLE (F8.3), here, consumed by BOTH surfaces: the CNC part detail's
  // SVG and the 3-D scene's meshes. The geometry that turns it into a drawing
  // is `engine/dimensionArrows.js`, and neither surface invents an arrowhead.
  //
  // Everything is in MILLIMETRES, in the drawing's own frame, so a dimension is
  // the same weight on a 300 mm shelf as on a 2400 mm side — the same rule
  // `dimensions` below has followed since turn 5.
  hoverDimensions: {
    // Thin blue. Deliberately NOT the drawing-office navy or the red of the
    // permanent dimensions (`dimensions.colours`): this is a MOMENT — it
    // appears under the pointer and goes — and it has to read as something the
    // hand is doing rather than as something the drawing says.
    colour: '#3B82F6',
    strokeMm: 0.8,
    arrowMm: 6,                // the open head's stroke length
    arrowAngle: 20,            // …and how far it opens, in degrees
    textMm: 11,
    offsetMm: 14,              // how far a measurement stands clear of the line
    extensionMm: 4,            // how far the extension line runs past it
    gapMm: 2,                  // …and the gap it leaves at the feature itself
    minSpanMm: 0.5,            // under this there is nothing to dimension
    // ─── TURN 25 (CLAUDE.md F14.1): THE CHAIN MOVES DOWN ──────────────────
    //
    // Turn 24 drew the partition chain across the bay's own MID-HEIGHT, which
    // is exactly where the add (+) button stands — so the number a joiner had
    // just asked for was hidden behind the control he had asked it with.
    //
    // It drops by a FRACTION of the bay's height rather than by a fixed number
    // of millimetres, because the button is placed the same way: a fixed 80 mm
    // is clear on a wardrobe bay and off the bottom of a 300 mm one. A quarter
    // of the way down puts it in the lower half and well below the button on
    // any bay the app will build.
    chainDropFraction: 0.25,
    // ─── TURN 27 (CLAUDE.md F4 / R12): THE DIMENSIONS GO BACK TO BLACK ────
    //
    // R12's first debt. Turn 26 was asked to give shelves, sides and fronts
    // the partition chain's BEHAVIOUR; it also repainted every label on the
    // way — a white halo and the line's own ink instead of the quiet dark
    // plate the chain had carried since turn 17. The owner did not ask for
    // that and does not want it.
    //
    // So the palette is BACK, and it is here rather than in `3d/constants.js`
    // because the test reads it from the profile and a workshop that wants a
    // different one changes a value rather than a component. The two hexes are
    // the app's own tones, unchanged from turn 17: the shell the panels are
    // drawn in, and the ink they print in.
    //
    // The UNIFICATION stays — one component, one geometry, 0.5 mm precision,
    // floor-lying chains. Only the paint returns.
    label: {
      plate: '#1c1c1a',
      ink: '#e8e4dc',
      // A plate, not a sticker: it lets a hair of the room through so a
      // number lying on the floor still reads as an annotation.
      plateAlpha: 0.9,

      // ─── TURN 29 (CLAUDE.md F4): A THIRD BIGGER, HALF THE WEIGHT ────────
      //
      // The owner, verbatim: *"napisy troszeczkę za małe — jakby były o 30%
      // większe ale o połowę mniej tłuste na tych wymiarowaniach wszędzie, to
      // by było super."*
      //
      // Three numbers, here rather than in the component, because they are the
      // drawing office's TYPE and a workshop tunes type in one block (rule 3).
      // Nothing else about the plate moves: same ground, same ink, same square
      // corners, same layout laws.
      //
      //   heightM   what the eye actually measures — the sprite's own height
      //             in the room. Turn 25's 0.044 × 1.3. Growing the canvas
      //             alone would only have made a sharper label the same size.
      //   pixels    the canvas the glyphs are drawn on, grown by the same 1.3
      //             so the type keeps its texel density instead of softening.
      //   weight    600 was "bold-ish mono"; half of it is 300, a light cut of
      //             the SAME family — the owner asked for less fat, not for a
      //             different face.
      heightM: 0.0572,
      pixels: 49,
      weight: 300,
      // The plate's padding and the letter-spacing, as fractions of `pixels`,
      // so the plate grows WITH the type instead of tightening round it.
      padFraction: 0.42,
      trackingFraction: 0.09,
    },
    // The magnet that holds a shown set on screen is `editor.hoverMagnetMm` —
    // it is a property of the TOOL rather than of the drawing's ink, and
    // CLAUDE.md F10.1 names it there. `dimensionStyle` reads it through, so
    // both surfaces still get one answer from one call.
    //
    // ─── TURN 28 (CLAUDE.md F8.3/F8.4): WHERE A FRONT'S OWN TWO LABELS SIT ──
    //
    // The owner, with "Show front dimensions" on: the two numbers crossed each
    // other in the middle of every door, and the middle is also where the add
    // (+) buttons stand — so a leaf wore a width, a height and a button in one
    // square inch and none of the three could be read.
    //
    // They move apart, and both moves are HIS: the width label drops to a
    // QUARTER of the front's height from its bottom, and the height label
    // stands clear to the right of the centre line.
    frontLabels: {
      // A fraction rather than a number of millimetres, for the same reason
      // `chainDropFraction` above is one: a fixed drop that clears a 2 100 mm
      // door is off the bottom of a 140 mm drawer front.
      widthFromBottom: 0.25,
      // …and this one IS a number, because it is a distance from a control of
      // a fixed size. 75 mm is the owner's "about 50 px" at the zoom a cabinet
      // is worked on at; it is clamped to a share of the front's own width
      // below, so it can never carry the number off a narrow piece.
      heightOffsetMm: 75,
      heightOffsetMaxShare: 0.4,
    },
  },

  // ─── THE BACK HOLDS EVERY PARTITION (turn 23, CLAUDE.md F6) ─────────────
  //
  // The owner's law, and it is the LISP's own pattern densified rather than a
  // new idea: the drawer-panel partitions already screw through the back
  // (`drawWardrobeDPHolesBACK`, KIT_WARDROBE_FULL L389-400 — `SCREWS_3MM`, one
  // hole 50 mm above the partition's bottom and one 50 mm below its top). The
  // INTERACTIVE vertical partition gets the same joint, with the run filled in
  // so a 2.4 m divider is not held by two screws.
  //
  //   THE 50 IS THE LISP'S.   `(+ y0 dpBottomY 50.0)` / `(+ y0 dpTopY -50.0)`.
  //   THE 400 IS THE OWNER'S. "the pitch never exceeds 400."
  //
  // Read together they are one derivation and it is worth writing out, because
  // it is the sort of rule that gets remembered as "about every 400":
  //
  //   a 2400 partition ⇒ span 2400 − 2×50 = 2300
  //                    ⇒ gaps = ceil(2300 / 400) = 6
  //                    ⇒ SEVEN screws at 2300 / 6 = 383.3 mm
  //
  // The ends are ALWAYS at 50 and the intermediates are spread EVENLY between
  // them: a run of 383s with a short last gap is what you get from marching a
  // tape from one end, and it is not what a joiner sets out.
  partitionBack: {
    fromEnd: 50,               // the LISP's own number, both ends
    maxPitch: 400,             // the owner's cap on what is left in between
    screwDiameter: 3,          // the ⌀3 the whole carcass is screwed with
    layer: 'SCREWS_3MM',       // the LISP's own layer — joined, never duplicated
  },

  // ─── THE DIVIDER'S FOOT (turn 30, CLAUDE.md F4) ─────────────────────────
  //
  // Owner, of the joint where a divider meets the board it stands on: "chyba
  // kiedyś było ale się zagineło." It was — turn 13 put the owner's BISCUIT set
  // there, turn 23 correctly removed it (no kit names `BISCUIT_4MM`), and in
  // doing so it also removed the LISP's OWN fixing for the same joint, which is
  // not a biscuit at all:
  //
  //     (defun drawWardrobeDPHolesBOTTOM …
  //       (drawCircle "SCREWS_3MM" (+ x0 dpScrewDepth)       (+ y0 dpInsetCenter) 1.5)
  //       (drawCircle "SCREWS_3MM" (+ x0 drawerPanelD -50.0) (+ y0 dpInsetCenter) 1.5) …)
  //                            — reference/lisp/KIT_WARDROBE_FULL.lsp L377-385,
  //                              called on the BOTTOM panel at L934
  //
  // TWO ⌀3 screws per divider, up through the bottom board into the divider's
  // own bottom edge, on its centre line across the width. Both numbers are
  // stated FROM THE FRONT EDGE — the LISP's own comment says so — and
  // `engine/partitionFixings.js` converts them into the BOTTOM's own rotated
  // frame, which runs from the back.
  //
  // `fromFrontEdge` is the SAME 99 that `wardrobe.drawerPanel.screwDepth`
  // carries for this divider's side holes; a test asserts the two agree, so the
  // day somebody re-measures it they cannot drift apart.
  //
  // THE TOP TAKES NOTHING, and that is the LISP too: there is no
  // `drawWardrobeDPHolesTOP`, because in that kit the divider stops at the
  // horizontal partition over the drawers and never reaches the top. No kit in
  // `reference/lisp/` drills a TOP for a vertical member, so nothing is
  // invented — the gap is named in the report instead.
  partitionFoot: {
    fromFrontEdge: 99,         // the LISP's `dpScrewDepth`
    fromFarEnd: 50,            // the LISP's `drawerPanelD − 50`, reproduced verbatim
    screwDiameter: 3,
    layer: 'SCREWS_3MM',
  },

  // ─── Partition fixing: the biscuit set (turn 13, CLAUDE.md F8 / #59) ─────
  //
  // The owner's workshop truth, given as the reference pattern for a butt
  // joint: screw ⌀3 → 10 mm gap → biscuit mark 70 mm → 10 mm gap → screw ⌀3,
  // starting no closer than 50 mm from the element's edge, two sets up to
  // 700 mm wide and three above it. The arithmetic is engine/biscuits.js; every
  // number it uses is here, which is what lets a workshop with a different
  // cutter or a different habit change the pattern without touching code.
  //
  // ─── TURN 23 (CLAUDE.md F5): IT IS APPLIED TO NOTHING ───────────────────
  // Turn 13 applied this set to the vertical partition. The LISP does not:
  // `drawWDR_PARTITION_PANEL` (KIT_WARDROBE_FULL L254-257) draws an OUTLINE and
  // a LABEL and nothing else, and no kit in `reference/lisp/` names a
  // `BISCUIT_4MM` layer at all. So the partition lost the borrowed set this
  // turn and gained `partitionBack` above, which is the LISP's own joint.
  //
  // The BLOCK STAYS, and is not dead weight: it is the workshop's recorded
  // standard for a butt joint (BLOCKERS #59, answered by the owner in turn 13),
  // the layer name is part of his VCarve tool mapping, and `engine/biscuits.js`
  // is still tested against his four widths. What it has today is no consumer.
  biscuits: {
    markLength: 70,            // the biscuit mark itself
    markTool: 4,               // …cut with the owner's dedicated 4 mm in-and-out program
    gap: 10,                   // CLEAR space between a screw and the mark
    screwDiameter: 3,          // the same ⌀3 the rest of the carcass is screwed with
    edgeMin: 50,               // a set STARTS no closer than this to the edge — never less
    wideThreshold: 700,        // wider than this and a third set goes in the middle
    // How far in from the partition's END its half of the mark is drawn. The
    // joint's other half is an END and a flat bed cannot reach it, so what the
    // partition carries is the set-out transferred onto its face.
    markFromEnd: 20,
    layer: 'BISCUIT_4MM',      // the name is the tool mapping — never tidied up
    screwLayer: 'SCREWS_3MM',  // the turn-8 family, joined rather than duplicated
    // Where a through-screw is allowed: the receiving face must be CONCEALED.
    // A carcass top is under a worktop and a bottom is inside the plinth void;
    // a fixed shelf's faces are what you look at with the doors open, so a
    // partition landing on one takes the biscuit-only set.
    concealedReceivers: ['TOP', 'BOTTOM'],
  },

  // ─── Wardrobe specifics (KIT_WARDROBE_FULL constants, lines 498-508) ───
  wardrobe: {
    legHeight: 100,
    legsPerUnit: 4,
    minHeight: 1800,
    // CHAT FIX 15.08.2026, owner's standard: 568 deep — an 18 back leaves a
    // 550 CLEAR interior, which is the number he actually wants ("chcę mieć
    // minimum 550 w środku"). The golden fixture's own CASES keep their
    // explicit 578 inputs: a pinned input is a pinned input, and the bare-kit
    // answers do not move.
    defaults: { width: 600, height: 2150, depth: 568, railOffset: 1400 },

    // ─── TURN 36 (CLAUDE.md F7): THE TOP BOX ─────────────────────────────
    //
    // The owner's reason, verbatim: *"wysokie szafy nie wejdą do domu"* — a
    // 2600 wardrobe cannot be carried up a staircase and through a door, so
    // it is BUILT as two: a main carcass and a small one that rides on top of
    // it. Its DEPTH is not listed here on purpose: a top box takes the depth
    // of the main it stands on, because a box that overhangs its own carcass
    // is not a top box, it is a mistake. `minHeight` is a workshop judgement
    // — under 200 the doors are not worth hanging — and it is a DEFAULT, so a
    // shop that disagrees changes one line.
    topBox: {
      defaults: { width: 600, height: 500, depth: 568 },
      minHeight: 200,
      // ─── TURN 53 (CLAUDE.md F5): …AND A MINIMUM WIDTH ─────────────────────
      // One main may carry SEVERAL boxes side by side now, so "is there room
      // for another one" is a question with a number behind it. The same
      // workshop judgement as `minHeight` one line up — under 200 the doors are
      // not worth hanging — asked of the other axis, and a DEFAULT: a shop that
      // disagrees changes one line.
      minWidth: 200,
    },

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
      // ─── TURN 54 (CLAUDE.md F7): THE SHOE DRAWER'S SIDE ──────────────────
      // The owner: *"prosiłem żeby cała szuflada miała logikę szuflad …
      // tylko wysokość miała być mniejsza."* A `variant: 'shoe'` drawer is a
      // STANDARD drawer with exactly one dimensional override — this side
      // height, his old 80 (veto "inna wysokość: N"). The bottom is FLAT and
      // standard: *"cała logika szuflad"* leaves no floor slope and no
      // battens (veto "spadek dna zostaje"). The old shoe-box world
      // (engine/shoeBox.js, KIT_SHOE_BOX.lsp, steps and battens) died with
      // T54-F7 under licence 2.
      shoeSideMm: 80,
      firstFrontAdjust: 3,     // bottom front is 3 mm shorter (clears the base)
      // ─── TURN 21 (CLAUDE.md F1.4): THE FAÇADE'S PILOT HOLES ────────────────
      //
      // KIT_WARDROBE_FULL `drawWDR_DRAWER_FRONT` L313-322, verbatim: "drawerNum
      // = drawer number (1=first, 93.5mm; rest=96.5mm from bottom)". The two
      // numbers are ONE number: the bottom front is `firstFrontAdjust` shorter
      // and starts that much higher, so 93.5 = 96.5 − 3 and both pilots land on
      // the SAME world line — `runner bottom + 96.5` — exactly as the BUDR
      // kit's do with its own `+ G` on drawer 1.
      //
      // They are here so the pilot gate can read the law rather than carry a
      // copy of it, and so a workshop that moves its drawer screws moves them
      // in one place. The wardrobe's fronts are not DRILLED by the engine yet
      // (the LISP drills them, the engine emits a plain rectangle) — that gap
      // is recorded in verify/t21/hole-alignment.md and in BLOCKERS, because
      // closing it is a CNC delta and this turn's iron rule is zero.
      frontScrewFromBottom: 96.5,
      firstFrontScrewFromBottom: 93.5,   // = frontScrewFromBottom − firstFrontAdjust
      gap: 3,                  // gap between drawer fronts
      boxSideThickness: 18,
      boxWidthClearance: 10,   // box W = internal W − this − drawer-panel reduction
      frontOversize: 4,        // front W = box W + this (2 mm each side)
      boxFrontBoards: 4,       // box front/back length = W − 4×G − clearance − reduction
      // ─── TURN 24 (CLAUDE.md F3.2): WHICH OF THE FOUR IS WHICH ─────────────
      // The LISP's four board thicknesses are two DIFFERENT boards: the two
      // CARCASS sides the box lives between, and the two of the BOX'S OWN
      // sides the front is cut to fit between. One number could say so only
      // while both boards measured 18. This says which two are the carcass's;
      // the remainder is the box's, so a workshop that changes the total
      // changes one number and the split follows.
      boxFrontCarcassBoards: 2,
      boxFrontClearance: 10,
      boxFrontHeightDeduction: 15,   // box front H = box side H − 15 − G − 1
      boxFrontHeightExtra: 1,
      bottomOversize: 13,      // bottom W = box front length + this
      // Turn 20 (CLAUDE.md F1): the wardrobe's box hung `boxDropFromRunner`
      // BELOW the runner row and the BUDR's sat ON it — two laws for the same
      // Blum runner. Both kits read `baseDrawerUnit.boxAboveRunner` now, which
      // is where every other number measured off A DRAWER SIDE already lives,
      // and this key is gone rather than left behind saying something untrue.
      // ─── TURN 25 (CLAUDE.md F9): THE SHORT RUNNERS ─────────────────────
      //
      // The ladder started at 390, so a 350 mm deep cabinet was told "too
      // shallow for drawers" and then cut a 390 mm box anyway — a box LONGER
      // THAN THE CARCASS. The owner asked for NL 250, 270, 300, 320, 350 and
      // 380, and every one of them is already in the bucket: they are in
      // `test/fixtures/bucket/runners-blum-movento-manifest.json`, which is the
      // live manifest verbatim (R3), in both S and T.
      //
      // The SELECTION rule is unchanged and is what makes this safe: the
      // largest step that fits, found by walking the ladder FROM THE SHORTEST
      // UPWARD and keeping the last one that still fits
      // (`engine/runners.js runnerNominalLength`). Adding shorter rungs cannot
      // change what the largest-that-fits is for a deep cabinet, which is why
      // every existing unit keeps today's runner — and there is a test that
      // says so rather than a sentence.
      depthSteps: [250, 270, 300, 320, 350, 380, 390, 440, 490, 540, 590, 640, 690],
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

  // ─── TURN 33 (CLAUDE.md F3): THE WARDROBE'S INTERIOR ACCESSORIES ──────────
  //
  // The standing doctrine: what we CUT and what we BUY. The shoe shelf and its
  // stop rail are CUT; the trouser pull-out, the tie rack and the pull-down
  // rail are BOUGHT — a named BOM spec and a labelled placeholder body until
  // the owner supplies files and articles. ZERO holes ride any of this: the
  // shoe shelf rests on the STANDARD ⌀7.5 pin rows the kit has always drilled
  // (the front pair simply set lower — the workshop's own way), and no bought
  // mechanism has a published fixing pattern (rule 3).
  wardrobeAccessories: {
    shoeShelf: {
      // OWNER'S NUMBER, 15.08.2026: the shoe shelf tilts 15° — owner-tunable.
      tiltDeg: 15,
      // The front stop rail (listwa) the owner named, CUT with the shelf.
      // Its SECTION is Claude's seed, 15.08.2026 — the owner named the piece,
      // not the numbers; owner-tunable like everything in this block. It ships
      // UNDRILLED: no LISP line fixes a listwa, so the fixing is the
      // workshop's own (the WINE lattice precedent).
      stopRail: { height: 60, thickness: 18 },
    },

    // ─── TURN 54 (CLAUDE.md F7): THE SHOE BOX'S CONSTANTS ARE BURIED ─────
    //
    // T34's `shoeBox` block (SHOE_WALL_H 80, SHOE_FRONT_H 120, the grooves,
    // the battens, the pilot and runner maps) died with its world under
    // licence 2 — the shoe is a standard `variant:'shoe'` DRAWER now, with
    // one number of its own: `wardrobe.drawers.shoeSideMm` (his old 80).
    // The T33 shoeShelf block above is UNTOUCHED, as ever.
    // OWNER'S THRESHOLD, 15.08.2026: a column's hanging rail above this many
    // millimetres FROM THE FLOOR makes the UI SUGGEST the pull-down — a grey
    // hint, never a block.
    pulldownSuggestMm: 2000,
    // The BOUGHT mechanisms' placeholder bodies — VIEW numbers only (the room
    // each one takes, drawn translucent until a GLB arrives), never a cut and
    // never a hole. `posMm` is where the body's underside sits above the
    // carcass base when the item does not say; the pull-down hangs down from
    // the top by `topDrop` instead, because that is where such a rail lives.
    kits: {
      trouser: { label: 'Trouser pull-out', bodyHeight: 120, posMm: 900 },
      tie_rack: { label: 'Tie rack', bodyHeight: 300, posMm: 1100 },
      pulldown_rail: {
        label: 'Pull-down rail',
        // The REAL mechanism (30.08, the owner's sheet): base underside to
        // rail top = 830. `topDrop` = the parked ROD's default from the top.
        bodyHeight: 830,
        topDrop: 50,
        // The one GLB the owner supplied (Kesseböhmer/Rejs CONERO, set 730).
        // Bucket is the shop; offline truth here is only what the sheet says:
        // 27 mm side gap clears hinges, rail modelled at 730.
        conero: {
          bucket: 'hardware',
          path: 'lifts/conero/',
          file: 'conero-pantograf-730.glb',
          article: '674367/674569',
        },
      },
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
    // ─── Turn 22 (CLAUDE.md F4.3): the toe kick's OWN floor ─────────────────
    //
    // "the 100 mm leg minimum is a bug: a default, never a floor". `min` above
    // guards CARCASS heights, where 100 is a sane refusal — a 40 mm tall unit
    // is a typing mistake. The toe kick is not a carcass: 50 mm legs are a
    // real kitchen, a plinth-less run is 0, and the engine's own sanity
    // (plinth ≥ 0, the front not through the floor) is the guard that belongs
    // there. `toeKick: 100` above stays the SEED every new project starts on.
    toeKickMin: 0,
  },

  // ─── Project types (turn 7, CLAUDE.md F2 / BACKLOG #41) ───
  // What KIND of job this is. The type is picked once, on the second screen of
  // the new-project flow, and all it does is choose better starting points:
  // which Library category opens first, which scope is suggested, and — where
  // the workshop genuinely builds that kind of job to a different height —
  // which project heights it starts from.
  //
  // The heights are DELIBERATELY sparse. A kitchen is the Skylon standard, so
  // it overrides nothing; a type only appears here when there is a real reason
  // for it to differ, and the two that do are flagged in BLOCKERS for Piotr to
  // confirm against what the workshop actually builds. Everything is editable
  // in Design Settings the moment the project opens — this is a starting point,
  // not a rule.
  //
  // The LIST (order, labels, category, scope) is engine/projectTypes.js; the
  // millimetres are here, because millimetres are always here.
  projectTypes: {
    // ─── TURN 50 (CLAUDE.md F13): THE WARDROBE OVERRIDES NOTHING ──────────
    //
    // The owner, 25.08.2026: *"default wysokości szaf 2150."*  F13: *"this
    // feature is to make sure it is the ONLY one."*
    //
    // This row said `{ tall: 2400 }`, which made THREE default heights for one
    // cabinet: 2400 here, 2100 in the wizard's own seed (T44-F3's literal, now
    // gone), and the 2150 that `projectHeights.tall` and
    // `wardrobe.defaults.height` have both carried all along. A new wardrobe
    // job opened at 2400 or at 2100 depending on which door it came in by.
    //
    // A wardrobe is built to the project's own TALL height, which is 2150, and
    // that is now the only place the figure lives. The row stays — with nothing
    // in it — because the MECHANISM is not the fault and the vanity below still
    // uses it; a workshop that really does build 2400 wardrobes puts one number
    // back here and nothing else changes.
    wardrobe: { heights: {} },
    // A vanity carcass hangs or stands under a basin, and 770 + 100 legs + a
    // top is a worktop at 890 — too high for a bathroom.
    vanity: { heights: { base: 600 } },
  },

  // ─── Joinery (turn 7, CLAUDE.md F2) ───
  // HOW the carcass is held together. Today there is exactly one system and it
  // is the one the whole engine is traced from — the Skylon puzzle joint, tabs
  // and dog-bone relief pockets, `profile.puzzle` above. It is listed rather
  // than assumed so that the second system (dowels, CamLock, Lamello) is a
  // profile entry and a geometry module, not a rewrite of the settings screen.
  //
  // `geometryKey` names the block of numbers that system's geometry reads, so a
  // preview can draw a joint it has never heard of by looking there.
  joinery: {
    types: [
      {
        id: 'dogbone',
        label: 'Dog bones (Skylon puzzle)',
        hint: 'Tabs and dog-bone relief — the joint every AutoLISP kit is cut for',
        geometryKey: 'puzzle',
      },
    ],
    defaultType: 'dogbone',
  },

  // ─── What a PROJECT is set up with (turn 11, CLAUDE.md F9) ───────────────
  //
  // Step 5 of the new-project flow asks a workshop how it builds THIS job, and
  // every answer it offers is here: where a board comes from, how thick that
  // makes it, how many types of each are in play, and which variant of each
  // piece of ironmongery is fitted.
  //
  // The shape of it is the owner's: the user picks a SOURCE and a VARIANT, and
  // everything else — the thickness, the legs and clips under a plinth, the edge
  // banding — follows automatically from these numbers. That is what "the user
  // only ever picks a VARIANT" means, and it is why the automatic parts are
  // listed here rather than being decided in a component.
  projectSettings: {
    // A carcass board, and where it comes from. `thickness` is what that source
    // IS: an EGGER decor board is 18, and a sprayed carcass is 18 of MDF.
    // ─── Turn 15 (CLAUDE.md F3) ───
    // `picker` is WHICH QUESTION this source asks, and it is data because the
    // owner's verdict was that the app kept asking the wrong one: a veneer
    // front offered a RAL palette. A source names its own picker, so adding a
    // fifth source is a line here and not a branch in a component.
    //   'decor'  → the 85-EGGER picker
    //   'veneer' → the veneer collection (engine/veneers.js)
    //   'colour' → the RAL / F&B / custom colour picker
    //   null     → nothing to pick yet (the wood range is a later turn)
    carcassSources: [
      { id: 'egger', label: 'EGGER decor', thickness: 18, kind: 'decor', picker: 'decor' },
      { id: 'sprayed', label: 'Sprayed', thickness: 18, kind: 'spray', picker: 'colour' },
      // Owner, turn 15 F3.3: a carcass can be veneered too, from the SAME
      // collection the fronts pick from — and 19 mm is pinned by the source
      // exactly the way an EGGER board pins 18.
      { id: 'veneer', label: 'Veneer', thickness: 19, kind: 'board', picker: 'veneer' },
    ],
    // A front. The two sprayed systems are the colour ranges a workshop orders
    // by name; veneer is the one that is genuinely a different thickness.
    frontSources: [
      // Owner, 09.08: ONE spray source. RAL vs Farrow & Ball is a choice the
      // COLOUR PICKER offers underneath (it always has), not a source button —
      // two buttons here made the same finish look like two finishes.
      { id: 'spray', label: 'Spray', thickness: 18, kind: 'spray', picker: 'colour' },
      // ─── TURN 20 (CLAUDE.md F12.3): BOTH FACED FRONTS PICK A DECOR ───────
      // Owner's verdict: "Veneer and Laminate open the SAME decor picker
      // (catalogue grid, attribution string, reproduction note) as melamine —
      // not a colour palette. Spray keeps its palette."
      //
      // Turn 15 gave the VENEER front a picker of its own — twelve curated
      // timbers — on the reasoning that a species is not a decor. The owner
      // works the other way round: he chooses the LOOK off the same catalogue
      // for every faced board and the workshop knows what to order from it.
      // So the front's veneer source joins the laminate's on the 85-decor
      // grid. The CARCASS's veneer source is untouched below — that question
      // was not asked and its picker still answers it.
      //
      // The THICKNESS is still the source's own 19 mm, and the assignment
      // plumbing has carried a decor id since turn 16, so nothing about what
      // is cut, grouped or ordered moves: this is the picker, routed.
      { id: 'veneer', label: 'Veneer', thickness: 19, kind: 'board', picker: 'decor' },
      // …and a laminate front picks a DECOR — the same 85-EGGER picker the
      // carcass has used since turn 5 (F3.1). It was offering RAL palettes,
      // which is a paint range for a board that is never painted.
      { id: 'laminate', label: 'Laminate', thickness: 18, kind: 'board', picker: 'decor' },
      // The wood RANGE is a later turn's (CLAUDE.md F9.2 says so in as many
      // words: "wood colour range comes later — leave the option present,
      // colours coming soon"). The option is real; the colours are not yet.
      { id: 'wood', label: 'Wood', thickness: 20, kind: 'board', coloursSoon: true, picker: null },
    ],
    // The selector beside the automatic thickness. "Other" is not in the list —
    // it is the absence of a choice from it, and the number is then typed.
    boardThicknessOptions: [18, 22, 25],
    maxCarcassTypes: 3,
    // ─── TURN 32 (CLAUDE.md F1.4): THREE FRONT TYPES ────────────────────────
    // OWNER'S NUMBER, 15.08.2026: "How many front types in this project?
    // [1] [2] [3]" — kitchens get the same three. Was 2 since turn 11.
    maxFrontTypes: 3,
    // ─── TURN 32 (CLAUDE.md F1.3): THE CEILING QUESTION ─────────────────────
    // OWNER-TUNABLE DEFAULT, 15.08.2026: under this much headroom the wizard
    // asks "To the ceiling, with no infill?" — an infill can be scribed to the
    // ceiling's real shape; ceilings are rarely straight.
    ceilingQuestionMm: 40,
    // The ironmongery. Every one of these is FITTED AUTOMATICALLY — the plinth
    // gets its legs, bases and clips, a door gets its hinges, a drawer gets its
    // runners, a wall unit gets its handles, and every cut edge that shows gets
    // its banding. The only question a user is ever asked is which VARIANT, and
    // `automat` names what the automatic then picks the concrete item from.
    hardware: {
      plinth: { label: 'Plinth', fits: ['legs', 'bases', 'clips'], automat: 'legs' },
      hinges: {
        label: 'Hinges',
        variants: [
          { id: 'soft-close', label: 'Soft-close' },
          { id: 'standard', label: 'Standard' },
        ],
        // soft-close default — owner to confirm 15.08 (TURN 32 F2 ships YES;
        // the question travels with the PR as Q1).
        default: 'soft-close',
        automat: 'hinge',
      },
      runners: {
        label: 'Runners',
        variants: [
          { id: 'soft-close', label: 'Soft-close' },
          { id: 'push-open', label: 'Push-open' },
        ],
        default: 'soft-close',
        automat: 'runner',
      },
      handles: {
        label: 'Handles',
        hint: 'Wall units',
        variants: [
          { id: 'j-pull', label: 'J-pull' },
          { id: 'bar', label: 'Bar' },
          { id: 'none', label: 'Handleless' },
        ],
        default: 'j-pull',
        automat: 'handle',
      },
      edgeBanding: { label: 'Edge banding', auto: 'Matched to each material', automat: 'edge' },
    },
  },

  // ─── What goes INSIDE a unit of this kind (turn 11, CLAUDE.md F4.4) ───
  //
  // "Add items" used to offer the same four things to every cabinet, so a
  // kitchen base unit was asked whether it wanted a hanging rail and a wardrobe
  // was not offered a cargo. What a workshop actually fits depends on what the
  // cabinet IS, and that is DATA — keyed on the type's own `family`
  // (engine/types.js), listed in the order a joiner reaches for them.
  //
  // It is a FILTER AND NEVER A BLOCK. The panel puts a "Show all" under the
  // list, and everything the KIT supports is still one click away: this decides
  // what is offered first, not what is possible. A cabinet that supports a thing
  // the list for its family does not mention is still a cabinet that can have
  // one, and the workshop that fits hanging rails in its pantries changes four
  // characters here rather than arguing with a component.
  itemsByContext: {
    kitchen: ['shelves', 'drawers', 'partition', 'cargo', 'bins'],
    // Turn 33 (CLAUDE.md F3): the wardrobe's interior grows its accessories —
    // the shoe shelf (cut) and the two bought mechanisms beside the pull-down.
    // CHAT-FIX 16.08 (owner): the shoe BOX takes the shelf's slot in the
    // wardrobe's own offer — "modal plusika ma zwinięte menu i trzeba
    // rozwijać, żeby zobaczyć, że jest shoe box; niech będzie [widoczny]".
    // TURN 40 (CLAUDE.md F3b): …and the OVERLAY stack, *"beside the existing
    // internal drawers, clearly distinguished"*. It sits next to them in the
    // list because that is where a joiner looks for it — the question is
    // "drawers", and the answer is which kind.
    // T54-F7: 'shoe_box' left this list with its world — the menu row adds
    // a `variant:'shoe'` DRAWER into the stack instead.
    wardrobe: ['shelves', 'hanger', 'drawers', 'overlay_drawers', 'partition', 'pulldown', 'trouser', 'tie_rack'],
    // Anything whose family is not listed. Deliberately the plain furniture
    // answer rather than a union of the two.
    default: ['shelves', 'drawers', 'partition'],
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

  // ─── Cargo 300, the pull-out larder (turn 30, CLAUDE.md F13) ───────────────
  //
  // "Parent geometry: KIT_BUDTALL. Proposed width 300. Carcass + full door per
  // the kit; the pull-out frame is HARDWARE (BOM + GLB slot when the owner
  // uploads one), no invented runners drilling — the mechanism mounts to floor
  // and top per manufacturer, which is not this repo's truth yet."
  //
  // So the only thing that is its OWN here is the width. The carcass, the door
  // and every hole in both are KIT_BUDTALL_FULL's, and the test asserts that
  // hole for hole against a tall unit of the same size.
  cargoUnit: {
    minHeight: 1100,
    defaults: { width: 300, height: 2100, depth: 558 },
  },

  // ─── Pantry (turn 30, CLAUDE.md F14) ──────────────────────────────────────
  //
  // KIT_BUDTALL's carcass wearing the wardrobe kit's INTERNAL drawer machinery.
  // 600 is the width a larder is built at and 2100 is the tall unit's own
  // height — the kit it is made of, said once.
  pantryUnit: {
    minHeight: 1100,
    // ─── TURN 31 (CLAUDE.md F11): AND IT ARRIVES WITH ITS DRAWERS ──────────
    //
    // "PANTRY defaults include its drawers (today it computes 6 bare panels
    // until `drawers` is set)."
    //
    // He is right, and it is the same class of fault turn 28 fixed on the D/W
    // panel: a kit whose DRAWERS ARE THE KIT arrived without them, so a joiner
    // who placed a pantry got a tall empty box and had to know to ask for the
    // thing he had just chosen. Turn 30 built the machinery — the wardrobe
    // drawer, hole for hole — and left the count at zero.
    //
    // OWNER'S NUMBER, 15.08.2026: three, which is what turn 30's own proof
    // photographed ("three Blum boxes and no drawer faces").
    defaults: {
      width: 600, height: 2100, depth: 558, drawers: 3,
    },
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
    // ─── The drawer-unit variants (turn 12, CLAUDE.md F3.2) ───
    //
    // "Drawer unit — expandable group: 1× (drawerline), 2×, 3× (today's BUDR),
    // 4×. Derive them from the EXISTING BUD/BUDR mathematics … parameterised by
    // count/heights; NO new joint formulas."
    //
    // And that is all a variant is: a RATIO. Every other number in this block —
    // the box side ratio, the runner rows, the front width deduction, the screw
    // positions — is already written per front rather than per unit, so 2 and 4
    // fronts run through KIT_BUDR_FULL's arithmetic unchanged. `x3` repeats the
    // kit's own 4:3:2 and is what BUDR has always used; it is listed so that the
    // group reads as four of one thing rather than three plus an exception.
    //
    // 1× is DISABLED, and deliberately: a drawer over a DOOR needs a door of
    // partial height, and no kit in reference/lisp defines one — the hinge rule
    // (`hinges.rules.base`) measures its centres from the carcass, and mapping
    // them onto a shorter front is exactly the "inventing" CLAUDE.md F3.2
    // forbids. It is held open here with the reason attached (BLOCKERS #63).
    variants: [
      {
        id: 'x1',
        label: '1×',
        count: 1,
        hint: 'Drawerline — one drawer over a door',
        ratio: null,
        enabled: false,
        soon: 'No kit defines a partial-height door yet — the pattern comes first',
      },
      // `exact` — does the last front take up whatever the rounding left, so
      // that the stack fills the carcass exactly? The kit's own 4:3:2 says NO
      // and is frozen there by rule 7 (see BLOCKERS #64 and the note on
      // cabinet.js `budrFrontHeights`); the variants turn 12 adds say YES,
      // because four equal fronts standing 2 mm proud of the carcass is not
      // something to ship on purpose.
      {
        id: 'x2',
        label: '2×',
        count: 2,
        hint: 'Two equal deep drawers',
        ratio: [1, 1],
        exact: true,
        enabled: true,
      },
      {
        id: 'x3',
        label: '3×',
        count: 3,
        hint: 'The workshop standard — 4:3:2',
        ratio: [4, 3, 2],
        exact: false,
        enabled: true,
      },
      {
        id: 'x4',
        label: '4×',
        count: 4,
        hint: 'Four equal drawers',
        ratio: [1, 1, 1, 1],
        exact: true,
        enabled: true,
      },
    ],
    gap: 3,                     // between fronts, and the top clearance
    frontWidthDeduction: 3,     // front W = W − 3 (overlay, like a single door)
    sideRatio: 0.7,             // box side height = round(0.7 × front height)
    boxWidthClearance: 10,      // box W = internal W − 10
    boxFrontBoards: 4,          // box front/back length = W − 4G − 10
    // Turn 24 (CLAUDE.md F3.2): two of the four are the CARCASS's sides and
    // two are the BOX's own. See wardrobe.drawers above for the derivation.
    boxFrontCarcassBoards: 2,
    boxFrontClearance: 10,
    boxFrontHeightDeduction: 15,
    boxFrontHeightExtra: 1,
    bottomOversize: 13,
    depthAllowance: 20,         // usable depth = D − G − 20 (NOT the wardrobe rule)
    firstRowFromBottom: 38,     // runner row above each front's base
    // ─── Turn 17 (CLAUDE.md F8.3): THE OWNER'S CLAMP ───────────────────────
    // "A drawer may come no closer than 10 mm below the bottom runner — 28 + 10
    // mm measured from the screw centres."
    //
    // Two numbers and a sum, and it is the SUM that is the rule: a drawer front
    // shorter than 38 mm has its bottom edge inside the runner it hangs on.
    // They are kept apart rather than written as one 38, because they are two
    // different facts — where the runner's screws are, and how much air the
    // owner wants under them — and a workshop that changes runners changes one
    // of them and not the other.
    //
    // (38 is also `firstRowFromBottom` above, and that is not a coincidence: it
    // is the same distance measured from the same place, once as "where the
    // runner row goes" and once as "how short a front may be". They are left as
    // two entries because the day they stop agreeing, the app must cut the
    // runner row where the kit says and refuse the front on the owner's rule.)
    runnerScrewFromBase: 28,    // the bottom runner's screw centres, from the front's base
    clearanceBelowRunner: 10,   // …and the air the owner wants under them
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
    // ─── TURN 20 (CLAUDE.md F1): THE BOX TAKES ITS HEIGHT FROM THE RUNNER ───
    //
    // Owner, eye test of turn 18: "the holes are right, the runners are right,
    // the fronts are right — only the BOX sits wrong against them."
    //
    // ONE formula for every drawer in the app, the bottom one included, and it
    // is measured off the RUNNER — the row the engine drills and the row the
    // runner's own underside stands on (`drillSummary.runner_rows_carcass_y`,
    // which is where 3d/Hardware.jsx puts the bottom of the profile). Before
    // this turn the two kits disagreed about it: a BUDR box sat exactly ON the
    // row and a wardrobe's hung 9 mm BELOW it, which is two laws for one piece
    // of hardware.
    //
    //   boxAboveRunner     the drawer SIDE's lower edge, above the runner's
    //                      bottom — the side hangs down past the runner and
    //                      the 2 mm × 15 mm relief at its foot is what the
    //                      runner sits in.
    //   bottomAboveRunner  the underside of the drawer BOTTOM, which stands in
    //                      its groove `runnerPocketWidth` above the side's own
    //                      lower edge: 13.5 + 15 = 28.5. Derived, not a second
    //                      independent number — test/turn20-phases.test.js
    //                      pins the sum, so the day a workshop changes the
    //                      groove the two cannot drift apart silently.
    //
    // Neither reaches a HOLE: every pocket, groove and drilling on a box part
    // is measured from that part's own edges, and none of those move.
    boxAboveRunner: 13.5,
    bottomAboveRunner: 28.5,    // = boxAboveRunner + runnerPocketWidth
    // ─── TURN 25 (CLAUDE.md F8): A FLOOR AND A CEILING ─────────────────────
    //
    // "The cap is what stopped a tall top drawer breaking the top panel; the
    // owner has seen it happen." A box hangs off its runner and stands up from
    // it, and a front tall enough makes a box tall enough to foul whatever is
    // above it — the next runner down the stack, or, for the top drawer, the
    // underside of the top panel. Neither is negotiable, so the SIDE gives.
    //
    // FIVE, and it is the owner's number and not the LISP's three: he has
    // watched a box lift a top panel off its tabs and wants the margin.
    boxTopClearance: 5,
    // …and the floor at the other end. A box front is `side − 15 − G − 1`, so
    // a short enough front produces a box front of nothing and, below that, of
    // a negative number. `minBoxInside` is the shallowest box a workshop will
    // actually build — a cutlery tray — and it is OURS: the owner gave the
    // arithmetic (`minimum inside + 15 + G + 1`) and not the minimum.
    minBoxInside: 40,
    // ─── Turn 17 (CLAUDE.md F4.3): THE POCKETS ARE CUTS, AND CUTS HAVE DEPTH ─
    // The two grooves in a drawer-box side have been in the cutting data since
    // turn 3 as flat rectangles on their own layers — which is everything a
    // 2.5-D machine needs to know EXCEPT how deep to go. The owner's numbers,
    // and they are not interchangeable: the runner groove is shallow because
    // the runner has to sit FLUSH in it, the bottom groove is deep because a
    // board has to stand in it.
    //
    // They reach no coordinate: a pocket is still the same four corners on the
    // same layer, so every existing DXF is byte-for-byte what it was. What they
    // reach is the DRAWING — the element view and the detail window say "2 mm
    // deep" about the groove a joiner is looking at (F4.1/F4.3).
    runnerPocketDepth: 2,       // DRAWER_RUNNER_POCKET — the runner sits flush
    bottomPocketDepth: 7,       // DRAWER_BOTTOM_POCKET — the bottom stands in it
  },

  // ─── D/W PANEL (turn 17, CLAUDE.md F9) ──────────────────────────────────
  //
  // The owner's words, and ONLY his numbers. It is the piece that closes the
  // face of a dishwasher, a washing machine or an under-counter fridge: "a
  // front and nothing else — no hinges, flat, no door furniture."
  //
  // Everything here was dictated. What was NOT dictated — the fixings, the
  // gaps, how it meets its neighbours — is in BLOCKERS and is not in the kit.
  // A guessed workshop number costs two turns to unpick (CLAUDE.md 0).
  // ─── TURN 27 (CLAUDE.md F2.5): WHAT IS LEFT OF IT ──────────────────────
  //
  // The measured numbers moved to the TYPE, where they belong: 594 (the front
  // width, rigid — over 600 and the appliance door cannot swing past its
  // neighbours), the 20 mm strip the plinth notch leaves at the top, and the
  // angle the front drops to. Nothing was lost; what went is the GEOMETRY the
  // parallel path owned — `topWidth: 600`, the one panel a carcass-less D/W
  // needed — because a D/W is an ordinary unit now and its top is the run's
  // top, cut by the same arithmetic as the cabinet beside it.
  //
  // What stays here is what this block was always for: the size a new one of
  // these arrives at, which is a PROJECT default and not a fact about the kit.
  dwPanel: {
    defaults: { width: 600, height: 770, depth: 558 },
  },

  // ─── OVEN BASE UNIT (turn 17, CLAUDE.md F10) ────────────────────────────
  ovenUnit: {
    defaults: { width: 600, height: 770, depth: 558 },
    // The appliance itself, and the number that follows from it. Written down
    // because it is the sort of number that gets "corrected" later: the oven is
    // 595 high, so THE SHELF IT STANDS ON SITS 598 MM FROM THE TOP OF THE
    // CABINET — from the TOP, not from a centre line and not from the floor.
    ovenHeight: 595,
    shelfFromTop: 598,
    // "A drawer below" — one, so the stack is a ratio of one.
    drawerRatio: [1],

    // ─── Turn 18 (CLAUDE.md F5.2): THE TOP IS TWO RAILS ────────────────────
    //
    // The owner's review of turn 17: an oven housing with a full TOP panel over
    // it is a lid, and the appliance wants the air. So the kit takes the SINK's
    // own answer — two holders instead of a top — with ONE change he was
    // explicit about: the FRONT rail lies FLAT, not on edge.
    //
    // The numbers are the OVEN's own, here, and the sink's stay where they are:
    // `sinkUnit.railHeight` and `sinkUnit.holderScrewFromTop` are not read from
    // this kit and fixtures/golden-sink.json proves the sink did not move.
    topRails: {
      // The BACK rail, standing on edge across the back of the opening — the
      // sink's 100, quoted rather than shared, so a workshop that changes one
      // kit's rail does not silently change the other's.
      backHeight: 100,
      // …and where the two 3 mm screws through each side panel catch it:
      // 30 and 70 down from the top of the carcass, which is the sink's own
      // two-holder pattern (the phrase CLAUDE.md F5.2 uses).
      backScrewFromTop: [30, 70],
      // The FRONT rail, LYING FLAT at the top front of the opening: 100 mm of
      // board, one board thick, so what you see from the front is an 18 mm
      // edge and the oven's flue has the whole opening behind it.
      frontWidth: 100,
      // ─── WHERE THE FLAT RAIL'S SCREWS GO ───────────────────────────────
      // A flat rail is screwed through the side panel into its EDGE, so the row
      // is on the board's own centreline (G/2, from the top
      // of the carcass) and the positions are measured along the rail's WIDTH,
      // front to back. That much is the app's ordinary horizontal-board rule.
      //
      // The SPACING is not, and the AutoLISP does not know this piece: the
      // shared rule is `[screwFromEnd, mid, length − screwFromEnd]`, and on a
      // 100 mm run `screwFromEnd` (50) IS the middle, so the rule collapses to
      // a single screw and a rail on one screw per side is a rail that pivots.
      // Two screws, at a quarter and three quarters of the rail's own width, is
      // therefore the ENGINE's decision where the kit is silent — the same
      // footing `puzzle.singleSocketBelow` stands on, said out loud rather than
      // dressed up as a traced number. BLOCKERS #76 asks the owner to confirm
      // it; until he does, this is what the machine drills.
      frontScrewFromEdge: 25,
    },
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

  // ─── Glass wall unit (turn 30, CLAUDE.md F21) ─────────────────────────────
  //
  // KIT_WUD_FULL's own defaults, said again so the kit has a home of its own to
  // be tuned in. A glass wall unit is a wall unit; what differs is the FRONT
  // STYLE it arrives wearing.
  glassWallUnit: {
    defaults: {
      width: 600, height: 720, depth: 400, mountHeight: 1500,
    },
  },

  // ─── TURN 31 (CLAUDE.md F9): THE HOOD WALL UNIT ───────────────────────────
  //
  // The KIT_WUD envelope, with the bottom open. `aperture` is the clear height
  // the extractor hangs in, and the door is what is left above it.
  //
  // OWNER-TUNABLE DEFAULTS, 15.08.2026 — the owner named the FEATURE and not
  // these numbers. 600 × 720 × 400 is the wall unit's own box (a hood cabinet
  // is a wall cabinet), the mount height is a wall unit's, and 350 of aperture
  // is what a standard chimney extractor's body wants under a 720 box while
  // leaving a door worth having above it. Every one of them is a number the
  // owner changes in Settings, not a rule.
  hoodWallUnit: {
    defaults: {
      width: 600, height: 720, depth: 400, mountHeight: 1500, aperture: 350,
    },
  },

  // ─── Corner unit (turn 30, CLAUDE.md F19) ─────────────────────────────────
  //
  // "Ship the L-carcass geometry + BOM; any hinge/drilling beyond the parent
  // kit's own lines waits for a LISP."
  //
  // There IS no parent kit — KIT_BUDR_FULL turned out to be the three-drawer
  // base unit — so these numbers are a SHAPE and nothing more. `armMm` is the
  // depth of each arm of the L; the two openings it leaves are `width − armMm`
  // and `depth − armMm`, which at 1000 / 600 is 400 apiece.
  cornerUnit: {
    defaults: { width: 1000, height: 770, depth: 1000 },
    armMm: 600,
  },

  // ─── Twin cupboard (turn 30, CLAUDE.md F18) ───────────────────────────────
  //
  // "Expose it in the Kitchen category with its own defaults." A two-door base
  // cupboard: 900 is the width a pair of leaves is worth hanging at, and the
  // leaves themselves are `doors.doubleTotalGap` — the engine's own arithmetic
  // since turn 1, which is KIT_BUD_FULL's.
  //
  // See the type for what KIT_DOOR_DOUBLE.lsp actually turned out to be.
  twinCupboard: {
    defaults: { width: 900, height: 770, depth: 558 },
  },

  // ─── Wine rack (turn 30, CLAUDE.md F17) ───────────────────────────────────
  //
  // "Geometry-only type: carcass per KIT_BUD/KIT_WUD envelope + the lattice as
  // panels in the BOM. No drilling truth exists → no drilling ships."
  //
  // `cellMm` is the bottle, in effect: the clear opening one cradle wants. The
  // engine fits as many whole cells as the carcass takes and shares the rest
  // out evenly, so a wider rack gets MORE cells rather than fatter ones.
  wineRack: {
    defaults: { width: 600, height: 770, depth: 558 },
    cellMm: 100,
  },

  // ─── Bin unit (turn 30, CLAUDE.md F16) ────────────────────────────────────
  //
  // "Parent: KIT_BUD. Pull-out bin = hardware on the door/carcass per
  // manufacturer: BOM + visual, no invented holes."
  //
  // A base unit at the width a bin pull-out is bought at, and nothing else of
  // its own. Every hole is KIT_BUD_FULL's.
  binUnit: {
    defaults: { width: 600, height: 770, depth: 558 },
  },

  // ─── American fridge housing (turn 30, CLAUDE.md F15) ─────────────────────
  //
  // "Parent: KIT_FRIDGE.lsp — it EXISTS and is the truth. Widen the parameter
  // envelope to american sizes; drilling stays the kit's own."
  //
  // So this block is a SIZE and nothing else. Every panel of KIT_FRIDGE already
  // follows the width and the aperture height — the fixed panel, the spurs
  // panel, the two back rails and the back above them are all written in terms
  // of them — and the drilling follows the panels. Widening the envelope is
  // therefore a set of defaults, not a change to the kit, and the test asserts
  // that a US housing is drilled exactly as KIT_FRIDGE drills a housing of the
  // same size.
  //
  // The numbers are a STARTING SIZE for a side-by-side, not a specification:
  // a joiner types the appliance's own width and height off its data sheet, as
  // he does today for a built-in. The depth stays the run's, because an
  // american fridge stands proud of the units and always has.
  americanFridgeUnit: {
    // The minimum has to clear the kit's OWN aperture: above the fixed panel
    // KIT_FRIDGE puts a spurs panel and the back over it, and `spursH` must be
    // more than a board for either to exist. 1900 of appliance + the fixed
    // panel + a spurs panel worth of room is 2000, so 2000 it is — the same
    // question `fridgeUnit.minHeight` answers for a 1786 built-in.
    minHeight: 2000,
    defaults: { width: 1000, height: 2100, depth: 558, fridgeH: 1900 },
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
    // ─── THE WORKTOP (turn 30, CLAUDE.md F8) ───────────────────────────
    //
    // Owner: two or more base cabinets take ONE worktop "od ściany aż do
    // paneli" — from the wall right out to the end panels. CLAUDE.md decides
    // the three numbers so this turn does not have to, and they live here
    // rather than in the engine because they are the workshop's:
    //
    //   thickness 38    UK standard. 770 carcass + 100 legs + 38 lands on the
    //                   900 line, which is why it is 38 and not 40.
    //   front 20        proud of the DOOR plane. A slab flush with the doors
    //                   would drip down them.
    //   side 10         past an END PANEL — past the panel, not the carcass.
    //   wall            flush, and there is no number for it: nothing hangs
    //                   over a wall, and the scribe closes that side.
    //
    // A DESIGN-LAYER auto-part like the end panels: it reaches no hole and no
    // fixture, and `computeCabinet()` neither knows nor asks about it.
    worktop: {
      enabled: true,
      thickness: 38,
      frontOverhang: 20,
      sideOverhang: 10,
      minUnits: 2,          // "select 2+ base cabinets"
    },
    // ─── TURN 47 (CLAUDE.md F4): EVERY INFILL LEAVES THE MACHINE OVERSIZE ──
    //
    // The owner, 24.08.2026: *"wszystkie infille jak mamy ustawione na 40 mm to
    // CNC powinien rysowac o 20 mm szerszy (docinanie na miejscu przez
    // stolarzy)."*
    //
    // A scribe filler is fitted to a wall, and a wall is not straight. The
    // workshop has always cut them long and planed them in on site; what was
    // missing is that the FILE did not say so, so the machine cut the nominal
    // and the joiner had nothing to take off.
    //
    // It is the same idiom as the drawer's `frontOversize` and `bottomOversize`
    // (`drawers`, below): a number in the profile that a workshop can change,
    // added to ONE edge of the piece, with the nominal still stated so nobody
    // prices the extra. And it goes on the WALL edge only — a mitre is a JOINT,
    // not an allowance, and its long point is exactly where the geometry puts
    // it.
    fillerOversize: 20,
    topInfill: {
      defaultHeight: 40,    // the visible face; "40" is what a workshop says
      minHeight: 10,
      thickness: null,
      // How close two units have to stand to be ONE run. The clamp lands them
      // edge to edge, so this only absorbs the 0.5 mm grid.
      runGap: 1,
      // The open end turns the corner and runs back to the wall (the fourth of
      // the four end conditions). This is the shortest return worth making;
      // below it the mitre is longer than the piece.
      minReturn: 60,
    },
    sideInfill: {
      // ─── Turn 11 (CLAUDE.md F5.2) ───
      // What a NEW project's infill width starts at, and therefore how far from
      // the wall a unit parks. Owner verdict: 40, not the 20 turn 3 shipped —
      // 20 mm of board is a strip that flexes and a gap you cannot get a screw
      // into, and every job was being retyped to 40 on the first day.
      //
      // It lives here rather than in engine/design.js because it is a NUMBER
      // (CLAUDE.md rule 2); the DESIGN still owns the per-project value, and
      // this is what it starts from.
      defaultWidth: 40,
      // The width comes from Design Settings (project level). This is the
      // widest gap the workshop will close with a scribe filler at all — a
      // 200 mm "filler" is a cabinet, not a scribe.
      //
      // A PINNED filler (turn 11, CLAUDE.md F5.1) is deliberately not held to
      // it: pinning is a joiner saying "there IS a piece here and it is this
      // wide", and CLAUDE.md asks for it to stretch past 100 mm on demand.
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

      // ─── TURN 50 (CLAUDE.md F4): …WITH ONE EXCEPTION ────────────────────
      //
      // The owner: *"w kuchni jak dodamy niską szafkę do wysokiej bez panela,
      // powinien się dodać panel automatycznie."*
      //
      // How big a STEP between two neighbours makes a side that shows. A
      // worktop's own thickness is not a step and a 100 mm difference in a run
      // of base units is not either; a base unit against a tall one is a metre
      // and a half of raw board at eye level, which is the case he is
      // describing. 300 is where the line is drawn — above any plinth or
      // worktop difference a run can have, well below the smallest real step
      // between a base cabinet and a tall one.
      autoStepMm: 300,
      defaultHeight: 'floor',       // 'floor' | 'carcass' ('unit' is the old name)
      // ─── Turn 13 (CLAUDE.md F4) ───
      // The owner's bug: a WALL unit's end panel ran to the FLOOR — a masking
      // panel hanging in mid-air down the wall under a cabinet that stops at
      // 2100. The verdict is that it ends flush with the hanging cabinet's
      // bottom, so the DEFAULT is per unit class rather than per project.
      //
      // 'carcass' means "ends with the cabinet". The fourth value the slot is
      // shaped for is 'extended' — the door/panel EXTENSION below a wall unit,
      // parked as BACKLOG #45 — which is why this is a table of classes and not
      // a boolean: when the extension lands, a wall unit opts into it by name
      // and nothing about the data has to change shape.
      defaultHeightByMount: { wall: 'carcass', floor: 'floor' },
    },
    // ─── The bottom masking panel (turn 14, CLAUDE.md F5 / BACKLOG #45) ─────
    //
    // The panel under a run of WALL units. The two numbers it needs are here
    // for the reason every number is: a workshop that cuts it from 12 mm rather
    // than from the door board changes one line.
    //
    // `depthExtra` is the ten millimetres the piece exists for — every cabinet
    // in this app stands `room.wallBackClearance` off the wall, and a panel cut
    // to the carcass depth would stop at the edge of that slot instead of
    // hiding it. It is written as its OWN number rather than read straight off
    // `room.wallBackClearance` at the panel-building site because they are two
    // decisions that happen to agree today: one is how far a cabinet stands off
    // a bowed wall, the other is how far past the carcass this board reaches.
    mask: {
      enabled: true,
      thickness: null,      // null = the project's FRONT thickness (F5.2)
      depthExtra: null,     // null = the wall standoff, which is what F5 asks for
    },
    // ─── THE CORNICE (turn 22, CLAUDE.md F1) ────────────────────────────────
    //
    // The owner's numbers, written down once. Turn 21 dropped this phase by
    // protocol and BLOCKERS #88 carried the ask so that this turn is a build
    // and not a re-derivation:
    //
    //   • two heights, 70 and 100, and "none";
    //   • forward projection 48 for the 70 and 65 for the 100 — "the owner's
    //     numbers to veto", so they are numbers in the profile and a veto is
    //     one line here;
    //   • the SHAPE is a parametric bead-and-cove approximation, because the
    //     supplier's DXF does not exist yet. When it does it replaces
    //     `engine/cornice.js corniceSection` 1:1 and nothing else moves — the
    //     run logic, the BOM and the 3D all read the section as a polygon.
    //
    // IT IS BOUGHT MOULDING, NOT A CUT PIECE. There is no thickness and no
    // edging here because there is no board: the BOM orders LINEAR METRES and
    // the CNC export never hears about it, which is what makes this phase's
    // fingerprint delta zero.
    cornice: {
      // What the per-unit option may be. 0 is "none" and is the default.
      heights: [70, 100],
      // How far the moulding stands proud of the door plane, per height.
      projection: { 70: 48, 100: 65 },
      // The piece it is fixed to: the 40 mm top infill, standing above the
      // carcass top in the door plane. Setting a cornice asks for at least
      // this much infill, and the ceiling clamp still has the last word.
      infillHeight: 40,
      // The bead-and-cove, as fractions of the height and of the projection.
      // Three members, bottom to top: a small convex bead, a concave sweep,
      // and a flat land at the top.
      section: {
        beadHeight: 0.16,        // of the height
        beadProjection: 0.3,     // of the projection
        landHeight: 0.14,        // the flat top land, of the height
        steps: 6,                // points per curved member
        // ─── TURN 25 (CLAUDE.md F12.2): THE 100 IS RICHER, NOT BIGGER ──────
        //
        // Turn 22 gave both heights the SAME fractions, so a 100 was a 70
        // photocopied at 143 % — which is not what a bigger moulding is. The
        // owner asks for "a larger bottom bead, a deeper cove, a pronounced
        // top land, projection 65", and those are three different proportions
        // rather than one scale factor.
        //
        //   beadHeight     0.16 → 0.20   a larger bottom bead
        //   beadProjection 0.30 → 0.26   …standing proud LESS far, which is
        //                                what leaves the cove a deeper sweep:
        //                                it now travels 48 mm of projection
        //                                where the scaled shape travelled 45
        //   landHeight     0.14 → 0.20   a pronounced top land
        //
        // ─── BLOCKER, STATED (F12.2) ──────────────────────────────────────
        // The owner has a reference drawing he sent long ago. It is NOT in
        // this repository — `reference/` has the eleven LISP kits, the colour
        // packs and the hardware catalogues, and no cornice section anywhere.
        // So this is the parametric richer profile F12.2 asks for in that
        // case, and the drawing SUPERSEDES it in a later turn WITHOUT touching
        // the plumbing: the section is already read through one function
        // (`engine/cornice.js corniceSection`) by the run logic, the BOM and
        // the 3-D, so replacing these three numbers with traced ones changes
        // nothing else.
        byHeight: {
          100: { beadHeight: 0.2, beadProjection: 0.26, landHeight: 0.2 },
        },
      },
      // What a mitred corner costs in ORDERED length. A joiner cuts the 45°
      // out of a longer piece; this is the allowance per corner.
      mitreAllowance: 100,
      // The shortest return worth making at an open end — the top infill's own
      // rule, for the same reason: below this the mitre is longer than the
      // piece.
      minReturn: 60,
      // ─── TURN 26 (CLAUDE.md F9.3/F9.4): WHEN IS IT A CORNER? ─────────────
      // How close two mouldings have to be — in TOP and in DEPTH — to be
      // treated as meeting. Two millimetres is a scribe, not a step: a run
      // fitted to a bowed wall is not a different depth from its neighbour and
      // must not be refused as one. Past it the two really are different
      // pieces and the corner is refused out loud (BLOCKERS #92).
      cornerToleranceMm: 2,
    },
  },

  // ─── Appearance (turn 4, BACKLOG #4–#6) ───
  // What the furniture LOOKS like. Not one number of it reaches the cut list —
  // but it is still workshop configuration ("our carcass board is broken
  // white"), so it lives here with every other number rather than as literals
  // scattered through the 3D view.
  appearance: {
    // ─── TURN 34 (CLAUDE.md F2): THE LEDs THE OWNER CAN SEE ────────────────
    //
    // His two verdicts, 16.08.2026: F1 lighting *"działa super ale … są zbyt
    // słabe — nic nie widać, za słabo świecą"*, and on the demo *"turn on the
    // light działa ale ledy za słabo świecą"*.
    //
    // T33 shipped emissive 0.85 with a ×2.6 demo boost — 2.21 at its
    // brightest — which under ACES Filmic at the default viewport exposure is
    // a slightly pale strip and not a light. Three.js r180 with physical
    // light units: an emissive surface is not tone-mapped away, it is ADDED
    // after the lighting, so what it needs is simply a bigger number.
    //
    // These are the SPEC's own home for them (`profile.appearance.lighting.*`,
    // never a literal in a component). `engine/ledStrips.js lightingSpec`
    // prefers them and falls back to `profile.lighting.view/demo` — a profile
    // saved before this turn keeps working and keeps its own numbers.
    lighting: {
      // What a placed strip glows at in the ORDINARY working view. Emissive
      // only — no real light source, because a point light per strip costs the
      // whole scene (T33's rule, unchanged).
      // CHAT-FIX 16.08 (owner, after seeing 3.4 live): *"za słabo świecą —
      // w rzeczywistości świecą o wiele lepiej"*. First swing of the tuning
      // loop: 8.0 burns a hot white core at the default exposure. The demo
      // boost comes DOWN so the demo lands ~24 and not 34 — hot, not nuclear.
      emissive: 8.0,
      // …and what it comes UP by while "Turn on the light" is on: 8.0 × 3.0 =
      // 24, unmistakable at the default exposure.
      emissiveBoost: 3.0,
      // The spot discs read smaller than a strip, so they carry their own
      // multiplier rather than borrowing the strip's and looking dim.
      spotEmissiveMultiplier: 1.35,
      // How far the whole studio rig is scaled down in the demo — the T33
      // number, unmoved, because the owner's complaint was the LEDs and not
      // the room (0.15, `profile.lighting.demo.dimFactor`, still the source).
      demoDimFactor: 0.15,
    },
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
    //
    // ─── Turn 15 (CLAUDE.md F2): AND THEY WIN THE DEPTH WAR ───
    // The owner: "the outer contour is crisp, the interior edges vanish". They
    // do, and it is not a colour problem. An edge line INSIDE a cabinet lies
    // exactly ON a neighbouring panel's face — a shelf's front arris is in the
    // plane of the side panel it butts into — so line and face are at the same
    // depth and the winner is whichever the GPU rasterises last. Outside the
    // cabinet there is nothing behind the line, so the silhouette was always
    // crisp; that is the tell.
    //
    // The textbook fix is `polygonOffset` on the FILL: every panel face is
    // pushed a hair back in the depth buffer, so a line lying on it is nearer
    // the camera and always wins. It moves nothing in the scene — only what the
    // depth test believes — so no dimension, no cut and no fixture is touched.
    //
    // `factor` scales with the polygon's slope (it is what makes a face seen
    // nearly edge-on offset more, which is exactly where the fight is worst)
    // and `units` is a flat push in depth-buffer steps. 1 and 1 is the
    // conventional starting pair and is enough here — bigger numbers start to
    // show as bleed-through at silhouette edges, which is the artefact this
    // must not trade for.
    //
    // ─── TURN 20 (CLAUDE.md F12.1): AND THE LINE LEANS FORWARD AS WELL ─────
    // Turn 15 pushed the FACE back and that closed most of it, but a line and
    // a face a hair apart in a depth buffer of finite precision still trade
    // pixels at grazing angles — which is where an interior edge is always
    // seen. So the OUTLINE takes the opposite bias: the face steps back, the
    // line steps forward, and the gap between them is twice what either could
    // buy alone. Same mechanism, same "nothing moves in the scene", and the
    // two numbers are kept apart because they are two decisions: how far a
    // face may sink, and how far a line may lean out before it starts showing
    // through the board in front of it.
    outline: {
      colour: '#1A1A1A',
      width: 1,
      threshold: 12,
      polygonOffset: {
        factor: 1, units: 1, outlineFactor: -1, outlineUnits: -1,
      },
    },
    // ─── TURN 20 (CLAUDE.md F8.2): WHAT A CUT LOOKS LIKE ────────────────────
    //
    // Owner: every drilling and pocket must read as REMOVED material, "the cut
    // faces a medium-dark grey". One number, read by both scenes.
    //
    // It is a COLOUR and never a finish: a decor or a sprayed lacquer is on the
    // FACE of a board, and the moment a cutter has been through it what is
    // there is raw core. Painting a decor onto the inside of a hinge cup is the
    // thing this exists to stop.
    cutFace: '#4a4a4a',

    // ─── TURN 21 (CLAUDE.md F3): THE 3-D WOUND-CARVING IS RETIRED ───────────
    //
    // The owner, after seeing pilot dots on his door faces and stray dashes
    // inside carcasses: THE CNC SHEET IS THE DOCUMENT; the 3-D carving is not
    // worth its problems. His call, and the right one.
    //
    // So turn 20's feature-carving — every drilling, pocket and groove cut out
    // of the board as a real absence, with its own cut-face buffer — renders
    // only when this is true, and it is false. What was there BEFORE turn 20
    // is NOT behind the flag and never was: the dog-bone sockets and the tabs
    // are part of the board's own OUTLINE (turn 11 and turn 12) and the
    // construction pockets the scene has always shown are still shown. The
    // pre-turn-20 look is the reference, and verify/t21 carries the pair.
    //
    // No UI toggle, deliberately — it is a profile flag for a future change of
    // heart, one line, and turning it on is the owner's word and nobody else's.
    // The z-fighting he saw goes with the default; the carving is RETIRED, not
    // debugged.
    //
    // ─── TURN 26 (CLAUDE.md R10 / F3): AND HIS WORD IS THE OTHER WAY NOW ────
    //
    // "cut CNC musi być twoją drogą do wizualizacji, nie na odwrót." R10
    // outranks the retirement, and the owner's example is the reason: a side
    // panel with three ⌀7.5 holes per level on the sheet and NO holes at all in
    // the scene, X-ray included.
    //
    // What was actually wrong in turn 20 was never the carving. It was that no
    // drilling stated a DEPTH, so every one of them read as a hole straight
    // through the board — which is precisely the pilot dots he saw on his door
    // faces. Depth is a property of the record now (engine/cabinet.js writes
    // the cup's own 11 mm) and of the workshop's own table for the rest
    // (`editor.drillDefaults`), and WHICH CLASSES are bored at all is a named
    // policy with a reason per class (engine/machining.js). The flag is TRUE.
    cuts: {
      enabled: true,
    },
    // ~20 % sheen: a hint of clear coat over a matt board. Not plastic.
    // Kept as the fallback a piece takes when it belongs to no finish family.
    sheen: { roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.35, metalness: 0.0 },

    // ─── The sheen SCALE (turn 8; corrected turn 9, CLAUDE.md F5) ───
    // A lacquer is specified as a PERCENTAGE of gloss, and that is the number a
    // sprayer, a paint supplier and a customer all already use: 5 % is dead
    // matt, 100 % is full gloss, in fives. Turn 8 ran a 0–25 scale, which is the
    // same information in a language the industry does not speak — and it had a
    // 0 on it, which nothing is. There is no such thing as a lacquer with no
    // sheen at all; the flattest one anybody sells is a 5.
    //
    //     roughness = 1 − sheen / 100
    //
    // 60 is the default: a two-pack satin at roughness 0.4. It is turn 8's own
    // default (15) on the new scale, which is what the migration multiplies
    // every stored value by — engine/design.js `migrateDesign`.
    sheenScale: { min: 5, max: 100, step: 5, default: 60 },

    // ─── Sprayed surfaces (turn 8, CLAUDE.md F1) ───
    // The Spraying philosophy, in three numbers: A SPRAYED COLOUR IS THE COLOUR.
    // Nothing in the room may tint it, so the environment probe is switched OFF
    // for a sprayed piece — a white lacquer door that picks up the walnut carcass
    // beside it is not white any more, and a client matching a RAL chip against
    // the screen is being lied to. What is left is the surface itself: the fine
    // orange peel a gun leaves, done on the normals at a tenth of the strength
    // the board edges use.
    // `peelMm` is the size of one orange-peel cell — the gun leaves a texture
    // between about one and three millimetres, and it is the reason a sprayed
    // white door does not read as a white rectangle even in flat light.
    // ─── Sprayed surfaces (turn 8, CLAUDE.md F1; amended hotfix 08.08) ───
    // The Spraying philosophy stands: A SPRAYED COLOUR IS THE COLOUR. Turn 8
    // enforced it by switching the environment probe fully OFF — and that was
    // one caution too many. The probe here is three's RoomEnvironment: a
    // SYNTHETIC neutral grey studio, not a capture of the scene, so a white
    // door cannot pick up the walnut carcass beside it — walnut is simply not
    // in the map. What intensity 0 actually removed was every reflection the
    // clearcoat had to work with, and with it the gloss the sheen slider is
    // supposed to drive. 0.25 of a neutral studio reads as lacquer and shifts
    // a RAL chip by nothing a spray booth could measure.
    //
    // normalScale 0 (hotfix 08.08, earlier the same day): the peel was a
    // procedural sine at ~2 mm, per fragment — 1–2 px per period on screen,
    // below Nyquist, and a shader sin() has no mipmaps. It aliased into the
    // shimmering moiré Piotr filmed. bevel.js now band-limits it by pixel
    // footprint, so turning it back up can no longer stripe; Spraying-Calc
    // gets the same effect the other correct way, as a mipmapped TEXTURE.
    spray: { envMapIntensity: 0.25, normalScale: 0, metalness: 0, peelMm: 2 },

    // ─── Manufacturer decor textures (turn 8, Piotr 07.08) ───
    // The full-board scans that ship with the decor pack (`tex` in the JSON).
    // `scanHeightMm` is what one image is worth on a real board — the scan is a
    // full sheet along the grain — so a 720 mm door shows the part of the board
    // it would be cut from instead of a repeat that reads as wallpaper.
    decor: { scanHeightMm: 2800, anisotropy: 8 },

    // ─── The studio rig (turn 8, CLAUDE.md F1 — from Spraying-Calc) ───
    // Turn 7's answer to "the white walls must stay white" was an ambient at
    // 1.25 with a key at 0.85, and Piotr's verdict on it is the reason this
    // block exists: "no shadow, no depth, white runs into white". A light that
    // is weaker than the fill it is meant to beat cannot model anything.
    //
    // So the balance is inverted to the one a photographer uses, and it is the
    // SAME rig in the working view and in a still: what the joiner is looking at
    // while he works is what the customer will be shown. ACES holds the
    // highlights at both ends of it.
    //
    // `shadowPadding` is room millimetres of margin around the furniture: the
    // key light's shadow camera is fitted to the CABINETS rather than to the
    // room, so every texel of the map lands on something that casts a shadow
    // instead of on four metres of empty floor.
    //
    // ─── Turn 9 (CLAUDE.md F1): THE STRIPES, AND WHY THE FILL WENT UP ───
    // Piotr's report was diagonal stripes across the fronts, in the working view
    // and in a 4K still alike. That is SHADOW ACNE — a surface shadowing itself
    // because the depth it is compared against was sampled at texel centres that
    // do not line up with it — and turn 8 had three of the four classic causes
    // at once: a shadow frustum spanning the whole run at 1024 px (~5 mm per
    // texel on a 4 m kitchen), no `normalBias` at all, and a render preset that
    // raised the map size while LOWERING the bias.
    //
    // The map size and the two bias numbers are in `render.shadow` below, where
    // the rest of the shadow settings live. What belongs HERE is the fourth
    // cause, which is a lighting decision rather than a shadow one: ambient 0.2
    // against key 1.0 makes every band of acne a high-contrast band, and the
    // clearcoat on a lacquered door doubles it.
    //
    // Prime-Sash-Windows is the reference for the target look, and its answer is
    // the one adopted here: flood the scene with fill so the colour reads bright
    // and clean from every angle, keep exactly ONE shadow-casting light, and
    // ground the object with a soft contact blob. The key stays 1.0 and stays
    // the only caster — the modelling turn 8 bought is not being given back —
    // but the flat light under it is raised so that what the key leaves in
    // shadow is still a colour rather than a hole.
    //
    // ─── Turn 10 (CLAUDE.md F1/F3): THE JUPITERS, AND WHY THE AMBIENT CAME DOWN ──
    // Piotr's verdict on turn 9 plus the hotfix day was "realism gone": the room
    // was one white blur, the fronts read as flat matt, and there was no
    // travelling highlight to be found. Two numbers here are the answer.
    //
    // The first is the AMBIENT. 0.45 of light from every direction at once is
    // 0.45 of the frame that no light can shape and no shadow can darken; on a
    // white wall in front of a white floor it is most of what you see. It drops
    // to 0.20 and the energy moves to the hemisphere (which at least has a top
    // and a bottom) and to the new spots (which have a POOL and a falloff). The
    // wall gets a gradient instead of a value: measured over a hundred columns
    // of the working view, top of wall to skirting, it went from 0.004 of
    // luminance (which is nothing, and is what "one white blur" means
    // arithmetically) to 0.023 (verify/t10/measurements.json).
    //
    // The second is `spots` below — the studio jupiters Piotr asked for by name.
    studio: {
      // ─── TURN 50 (CLAUDE.md F14): THE WHOLE RIG SHIPS A QUARTER DARKER ───
      //
      // The owner, 25.08.2026: *"default oświetlenia jasności … teraz 100 to
      // niech będzie jakby teraz było 75."*
      //
      // ONE NAMED NUMBER, multiplied into the same `gain` the brightness slider
      // already produces (`3d/Scene.jsx`). It is deliberately NOT mixed into the
      // lamps' own intensities: the bands, the pillars, the key, the fill and
      // the rim keep their own numbers so each can still be tuned on its own,
      // and every ratio turn 10 measured survives untouched.
      //
      // NAMED CONSEQUENCE: the CEILING drops with it. What the slider calls
      // 100 % now lands where 75 % landed, so the top of the slider is a
      // quarter dimmer than it could reach yesterday — which is what was asked
      // for. If a bright kitchen ever needs the old maximum, THIS is the one
      // number to raise, and CLAUDE.md F14 is the paragraph to come back to.
      //
      // Nothing else about the slider changes: its min, max, step and default
      // stay exactly as the profile has them.
      baseGain: 0.75,
      ambient: 0.2,
      key: 1.0,
      fill: 0.55,
      rim: 0.3,
      exposure: 1.0,
      shadowPadding: 600,
      // ─── CHAT-FIX 25.08.2026: THE SHOWROOM BANDS ───────────────────────────
      //
      // The owner, four hot circles on a four-metre run: *"4 reflektory takie
      // skupione na szafe"*, and what he wants instead is a showroom —
      // *"ma byc jak w studio, jak showroom"* — with the gloss still reading:
      // *"chce zeby polysk byl widoczny."*
      //
      // A tube as long as the run, hung above the fronts and set a little
      // proud of them. Even along the whole length because the source is as
      // long as the thing it lights, and a long soft streak in a gloss door
      // instead of a hard white dot. One band per run: an L kitchen gets two,
      // which is how a real showroom lights a corner.
      band: {
        intensity: 2.2,
        colour: '#ffffff',
        aboveMm: 700, // above the tallest cabinet in the run
        forwardMm: 250, // proud of the fronts, the way a tube hangs
        widthMm: 400, // the tube's own width — the short side of the source
        spillMm: 300, // past each end, so the last cabinet is lit like the rest
      },
      // The jupiters are OFF and not deleted — the owner: *"narazie wylacz,
      // ale nie usuwaj — w razie czego poprosimy, wlacz spoty."* Flip to true
      // and every number below comes back exactly as turn 10 tuned it.
      // The jupiters are back ON — the owner, 25.08 evening: *"czyli spoty
      // zaswiecamy spowrotem."* They were never the four circles he
      // photographed; that was `points`, below. Left as a named flag so they
      // can be taken out again without hunting for them.
      spotsOn: true,
      // ─── CHAT-FIX 25.08.2026: THE PILLARS, AND WHY THE POINTS GO ───────────
      //
      // The four hot circles on the owner's screenshot were `points` — the
      // eye-level pair at 1650 and the low pair at 500, `decay: 2`. They exist
      // for a real reason (T14: a specular highlight is the MIRROR of the
      // source, so a lamp at 3 m and an eye at 1.65 m can only meet on a
      // vertical door when the viewer looks up at it — which nobody does), and
      // the owner is right that killing them kills the gloss: *"jak zgasisz
      // dolne to nie bedzie polysku na kuchni."*
      //
      // His own answer is better than lowering them: *"a jakby zamiast kolek
      // dał od góry do dołu pas światła, coś jak ledy w szafie, ale na ścianie?
      // wtedy będzie widoczne na każdej wysokości."* A VERTICAL source spans
      // every height at once, so an eye at 1650 sees its upper part reflected
      // and an eye at the plinth sees its lower — one source doing what three
      // horizontal ones would. And it reflects in a lacquered door the way a
      // window does, which is what a showroom actually looks like.
      //
      // They stand IN FRONT of the fronts, on the viewer's side: a reflection
      // shows what faces the door, so a strip on the wall BEHIND the units
      // would light their backs and gloss nothing. Two per run, one at each
      // end (owner's call), floor to ceiling (his call too).
      pillars: {
        // The scale a RectAreaLight works on is NOT the scale a point light
        // does. The LED halos — the only area lights this app had before
        // T47, and the only ones known to read correctly — run at 22, and the
        // first cut of the pillars guessed 3.2. Seven times too little, which
        // is most of why the owner saw nothing.
        //
        // ─── TURN 50 (CLAUDE.md F14): …AND THEN HALVED, ON THEIR OWN ────────
        //
        // The owner, the same evening, on the showroom pillars specifically:
        // *"za jasno świecą, ściemnij o połowę."*  22 → 11, its own number,
        // changed on its own — which is exactly why `baseGain` above is kept
        // out of the individual lamps: it lets this one move alone.
        //
        // THE TWO REDUCTIONS COMPOUND, and that is intended. A pillar ends the
        // night at 11 × 0.75 = 8.25 of the gain it had at 22, which is 37.5 %
        // of what it was. If that turns out to be a quarter too dark it is THIS
        // number that comes back up, not `baseGain`.
        //
        // ─── AND A THIRD REDUCTION ARRIVED FROM THE OTHER SIDE ─────────────
        //
        // While T50 was being written the owner pushed his own chat-fix to
        // main: the mirrored PAIR became ONE pillar (`count: 1`, below), which
        // by itself halves the light in the room. Merged, the three compose —
        // one lamp instead of two, at 11 instead of 22, times 0.75 — and the
        // room is a good deal darker than F14 was reasoning about when it said
        // "a quarter".
        //
        // Kept at 11 because CLAUDE.md F14 names the number and the owner's own
        // *"za jasno świecą, ściemnij o połowę"* is what it is executing. But
        // this is the paragraph to come back to, and THIS is the number to
        // raise: it moves alone, which is the whole reason `baseGain` is kept
        // out of the lamps. BACKLOG 130.
        intensity: 11,
        colour: '#ffffff',
        widthMm: 420, // the slab's width — a tall window, not a line
        forwardMm: 900, // how far in front of the fronts it stands
        // ONE, not a mirrored pair: the owner, 25.08 night — *"dwa paski …
        // przez to że są symetryczne wydają się jakby były częścią mebla."* A
        // real room reflects from one side, and asymmetry is what makes it
        // read as a reflection rather than as decor.
        count: 1,
        side: 'right',
        // How far OUT along the run it stands, as a share of the half-length.
        // Below 1 it is inside the run; ABOVE 1 it walks out past the end,
        // toward the side wall — which is where the owner wanted to see it:
        // *"na prawej ścianie od mebli, gdzieś w połowie."* From there it
        // fires almost ALONG the fronts, the most grazing angle there is.
        spread: 1.7,
      },
      // The points are OFF and still here — the pillars replace what they were
      // for. Flip to true and both pairs come back exactly as T14 and T16
      // tuned them.
      pointsOn: false,
      // ─── The shadow budget (turn 10, CLAUDE.md F1.4) ───
      // At most this many lights in the whole rig own a shadow map. It is a
      // COST rule, and the working view is where the cost is felt: every caster
      // is a full extra depth pass over the furniture, every frame the scene is
      // dirty. Two is the ceiling; the rig ships with one.
      //
      // `keyCastsShadow` is the other half of the decision CLAUDE.md F1.4 asks
      // to be made BY LOOKING, and it was: the key keeps the shadow and the
      // spots do not. A spot hung in the upper front corner throws its shadow
      // down and BACKWARDS — straight under the carcass and into the wall,
      // where the cabinet itself already hides it — so it buys a depth pass and
      // shows almost nothing. The key comes in from the front quarter and lays
      // its shadow ACROSS the open floor beside the run, which is the one place
      // it can be seen. Screenshots of both are in verify/t10.
      shadowCasters: 2,
      keyCastsShadow: true,
      // ─── The sky and the floor (turn 9, CLAUDE.md F1) ───
      // An ambient light is one number in every direction, which is the one
      // thing real light never is: in a room the light from above is warm
      // daylight or a warm lamp, and the light from below has bounced off a
      // floor and carries the floor's colour. A hemisphere costs the same as an
      // ambient — no shadow map, no extra pass — and it is what stops a raised
      // fill from reading as fog.
      //
      // `sky` is a warm off-white (a room with the lights on), `ground` is the
      // warm grey a timber or a screed floor bounces back. It casts NOTHING:
      // the key is still the only shadow in the scene.
      //
      // Turn 10 takes it DOWN with the ambient, 0.5 to 0.45, but by a quarter
      // of the ambient's share: what matters is the ratio between the light
      // that has a direction and the light that has none, and that has moved
      // from 0.45 : 0.50 to 0.20 : 0.45. The room is no darker to look at — the
      // floor still reads 0.90 of white — it simply has somewhere left to go.
      hemisphere: { sky: '#fdf6e8', ground: '#c8c0b0', intensity: 0.45 },

      // ─── The jupiters (turn 10, CLAUDE.md F1) ───
      //
      // Piotr described the light he wants in the language of the trade: two
      // studio spots hung in the UPPER FRONT CORNERS, aimed roughly 45° DOWN
      // across the furniture, and "maybe a second one lower". Turn 9's point
      // lights were the wrong instrument for that — a point light has no
      // direction at all, so it lights the ceiling, the back wall and the floor
      // as happily as the doors, and there is no pool for the wall to show.
      //
      // A spot has a cone, and the cone is what buys BOTH of this turn's
      // complaints at once: the pool it throws on the wall behind the run is the
      // vertical gradient that stops the room reading as one white blur (F3),
      // and its hotspot on a lacquered door TRAVELS as the camera orbits, which
      // is what the eye reads as gloss (F4.B).
      //
      // THE GEOMETRY. `x/y/z` are fractions of the rig's own distance from the
      // furniture's centre — the same convention the key, the fill, the rim and
      // the points use — so the rig scales with the job instead of being tuned
      // for one kitchen. The aim is always the fit centre, so the angle below
      // the horizon is atan(y / hypot(x, z)): at (±0.50, 0.62, 0.40) that is
      // atan(0.62 / 0.64) = 44.1°, which is Piotr's "~45° w dół" to within the
      // precision the phrase carries.
      //
      // THE INTENSITIES ARE PHYSICAL (three r0.180, decay 2, candela-like): the
      // light fades with distance SQUARED, and these hang ~0.88 of the rig
      // distance out, so the useful numbers are an order up from a directional's.
      // 38 at 3.9 m is ~2.5 of irradiance at the centre of the pool, which is
      // the key's own order. The bracket was measured rather than guessed: at 0
      // the wall has no gradient at all, at 300 the fronts blow out to pink
      // (rgb 228,113,120 against a RAL 3005 that is 135,48,57) and the white
      // carcass picks up 0.29 of chroma. See verify/t10/measurements.json.
      //
      // The pair is UNEQUAL — 38 and 32 — because a rig of two identical lights
      // at mirrored positions is a rig with no key side, and a run lit dead
      // evenly from both front corners has no modelling across its length.
      //
      // `angle` is the half-angle of the cone in radians; `penumbra` is how much
      // of it is soft edge. 0.68 means the hard core is the inner third and
      // everything outside it is gradient, which is what a real softbox does
      // and what makes the wall pool read as light rather than as a circle.
      // Tightening the cone instead (angle 0.55) was tried and rejected: it
      // sharpens the pool but cuts the floor in front of the run out of it, and
      // the toe shadow lost two thirds of its contrast.
      //
      // IT IS AN ARRAY BY DESIGN. Piotr tunes the COUNT and the numbers here
      // without anybody touching a component: a third, lower spot is four lines
      // in this file. It ships with two — the F4 loop found the third one only
      // ever fought the first two for the same wall, and what it was really
      // asking for was more penumbra on the pair.
      // The COLOURS are barely warm on purpose. The hotfix's #fff6ea reads as
      // tungsten and, poured over a broken-white carcass at this strength, took
      // it to 0.11 of chroma — a white board that is visibly cream is a white
      // board a client will query. At #fffaf0 the same measurement is 0.015,
      // against the board's own 0.024: warm light, white board.
      spots: [
        {
          x: 0.5, y: 0.62, z: 0.4, intensity: 38, angle: 0.62, penumbra: 0.68,
          colour: '#fffaf0', castShadow: false,
        },
        {
          x: -0.5, y: 0.62, z: 0.4, intensity: 32, angle: 0.62, penumbra: 0.73,
          colour: '#fff8f2', castShadow: false,
        },
      ],
      // Falloff limit as a multiple of the rig distance, for the spots as well
      // as the points; decay stays physical inside it. It is ALSO the spot
      // shadow camera's far plane, because three takes `light.distance` for it
      // (SpotLightShadow.updateMatrices) — read there before it was relied on.
      spotReach: 4,

      // ─── TURN 26 (CLAUDE.md F10): THE LIGHT COMES FROM THE CEILING ───────
      //
      // The owner's proposal, and his constraint in the same breath: "one broad
      // ceiling source at real ceiling height above the tall units, set back
      // 1.5 m from the fronts, medium intensity" — and "whatever is added above
      // is SUBTRACTED from the facing spots; the scene's total luminous
      // contribution stays as it is today."
      //
      // `share` is what makes that an identity rather than a tuning session.
      // It is the fraction of the FACING SPOTS' contribution at the subject
      // that the ceiling source takes over, so the spots are scaled by
      // `1 − share` and the sum is unchanged EXACTLY, at any room size and any
      // camera fit. The lamp's own candela is derived from it and from where it
      // hangs (`engine/lighting.js balanceRig`), which is why there is no
      // intensity in this block: a number here would be a second answer to a
      // question the share has already answered.
      //
      // 0.35 is "medium": the room reads as lit from above without the fronts
      // losing the modelling the pair of jupiters gives them. It is a fraction,
      // so the owner turns it without re-balancing anything.
      ceiling: {
        enabled: true,
        share: 0.35,
        // A BROAD source: a wide cone, mostly penumbra, which is what a ceiling
        // plane does. Tighter than this and it is a downlight; wider and it
        // stops having a direction at all and might as well be the ambient.
        angle: 1.05,
        penumbra: 0.9,
        // How far BACK from the fronts it hangs, in ROOM millimetres. The
        // owner's own number, and it is absolute for the same reason turn 14's
        // eye height is: a metre and a half is a metre and a half in a galley
        // and in a six-metre kitchen.
        setbackMm: 1500,
        // The room's ceiling where nobody has said what it is.
        fallbackCeilingMm: 2700,
        // Barely warm, like the jupiters — a white board that is visibly cream
        // is a white board a client will query.
        colour: '#fffaf0',
      },

      // ─── TURN 26 (CLAUDE.md F10.3): THE BRIGHTNESS SLIDER ────────────────
      //
      // "A brightness slider in the View menu scales every source
      // proportionally, state remembered."
      //
      // PROPORTIONALLY is the whole of it: ONE multiplier on every lamp, so the
      // ratios turn 10 measured — the key against the fill, the spots against
      // the ambient — are exactly the ones the rig was balanced at whatever the
      // slider says. A slider that touched one lamp would be a slider that
      // re-lights the scene; this one only turns it up.
      brightness: {
        min: 0.5, max: 1.5, step: 0.05, default: 1,
      },
      // ─── The glints: EMPTY, and that is the finding (turn 10, F1.5) ───
      //
      // PSW's gloss was never an environment map — its painted wood has none.
      // It is close sources whose hotspots TRAVEL across a panel as the camera
      // orbits; that movement is what the eye reads as lacquer, and the 08.08
      // hotfix bought it with four point lights.
      //
      // CLAUDE.md F1.5 asked whether the spots could take that job over, and
      // said to decide it by running the orbit. It was run both ways. With the
      // four points, with the two viewer-side ones, and with none at all, the
      // highlight patch on a sheen-90 door lands in the same three places along
      // the orbit at the same strength — (0.77, 0.19) ×1.11, (0.88, 0.21) ×1.19,
      // (0.88, 0.30) ×1.12 with the array empty, against ×1.11 / ×1.20 / ×1.13
      // with it full. The travelling glint was never the points' doing: it is
      // the spots' hotspot plus the 0.25 environment probe, and the points were
      // two more lights per fragment for a difference in the second decimal.
      //
      // So the array ships EMPTY and the structure stays, which is the whole
      // point of it being data: a workshop that wants a fifth source types one
      // line. Kept as an example rather than deleted, so the shape is obvious.
      // Intensities are PHYSICAL (three r0.180, decay 2, candela-like) — a
      // point light fades with distance SQUARED, so a working value at ~5 m is
      // in the tens; 0.9 would be invisible and 45 blows the scene out. `x/y/z`
      // are fractions of the rig distance, as everywhere else in this block.
      //
      //   points: [
      //     { x:  0.60, y: 0.45, z: 0.85, intensity: 9, colour: '#fff8f0' },
      //     { x: -0.60, y: 0.45, z: 0.85, intensity: 9, colour: '#fff4e8' },
      //   ],
      //
      // ─── TURN 14 (CLAUDE.md F9): THE EYE-LEVEL PAIR, AND `yMm` ─────────────
      //
      // The owner's finding, and it is a geometric one rather than a taste one:
      // the gloss reads only at STEEP angles, because every strong light in the
      // rig is high. A specular highlight is the mirror of the source, so a
      // source at 3 m and a viewer at 1.65 m can only meet on a vertical door
      // when the viewer is looking up at it — which is not how anybody looks at
      // a kitchen. Turn 10 was right that the SPOTS carry the travelling glint;
      // it measured that from an orbit that was mostly above the furniture.
      //
      // So the pair is a pair of EYES, and that is why `yMm` exists. Every other
      // position in this block is a fraction of the rig distance, which is
      // correct for a studio rig — it scales with the subject. An eye does not:
      // a joiner standing in a 2 m vanity and a joiner standing in a 6 m kitchen
      // both have their eyes at 1650. So `yMm` is an ABSOLUTE height above the
      // floor in millimetres and OVERRIDES `y` where it is given; x and z stay
      // rig-distance fractions, so the pair still opens out with the job.
      //
      // The numbers are the owner's own starting values (F9.1) and he will turn
      // them. Intensities are PHYSICAL — decay 2, so a point light fades with
      // distance squared and a working value at a few metres is in the teens.
      // NO SHADOWS: the caster budget (`shadowCasters`) is untouched, and a
      // point light casting one would be six depth passes for a cube map.
      // ─── The levels, after the owner saw the low pair in his own kitchen ───
      // The eye pair came in at 12 in turn 14 and the low pair joined it at 6.
      // With four lights in the room instead of two the verdict was "za dużo
      // świateł, zrobiło się za jasno" — the complaint is the SUM, not either
      // pair, so both come down rather than one being blamed. The low pair
      // halves (it is fill, and fill that competes with the key is what flattens
      // a picture); the eye pair comes off its top by a sixth, enough to be seen
      // without losing the highlight that turn 14 built it for.
      points: [
        {
          x: 0.35, yMm: 1650, z: 0.7, intensity: 10, colour: '#fff6ec',
        },
        {
          x: -0.35, yMm: 1650, z: 0.7, intensity: 10, colour: '#fff3e4',
        },
        // ─── Turn 16: THE LOW PAIR (the owner's own request) ───
        // The eye-level pair lights what is at eye level. Below the worktop a
        // base unit's doors were falling away into the floor's shadow, because
        // the only light reaching them arrives at a glancing angle from 1650 and
        // there is no bounce off a floor the rig does not really light.
        //
        // So: the same pair again, at 500 — the height of a door's middle on a
        // base unit — and at HALF the intensity, which is what "not so strong,
        // just enough to throw a glow" asks for. A point light is spherical
        // already; softness here is a matter of how hard it lands, and 6 at a
        // couple of metres is a wash rather than a hot spot. Still no shadows,
        // for the same reason as the pair above: the caster budget is spent.
        {
          x: 0.35, yMm: 500, z: 0.7, intensity: 3, colour: '#fff6ec',
        },
        {
          x: -0.35, yMm: 500, z: 0.7, intensity: 3, colour: '#fff3e4',
        },
      ],
      // Falloff limit as a multiple of the rig distance; decay stays physical.
      pointReach: 4,
      // ─── The bounce the rig cannot produce ───
      // A three-light studio rig is built for a subject on a seamless backdrop.
      // Point it at a ROOM and the walls come out grey, because most of what
      // lights a real wall is light that has already bounced off the floor, the
      // ceiling and the wall opposite — and a directional light has no bounce.
      //
      // Turn 7 answered that with an ambient at 1.25, which lit the walls and
      // flattened the furniture with them. This is the same answer aimed only
      // where it belongs: the ROOM's own surfaces carry this fraction of their
      // colour as emission. The furniture sees the studio rig and nothing else,
      // so the modelling on a white door is untouched and the wall behind it is
      // still white.
      //
      // ─── Turn 10: THIS NUMBER IS WHY THE FLOOR SHADOW WAS BARELY THERE ───
      // Emission is ADDED after the lighting, so it is the one part of a
      // surface's brightness that no shadow can take away. At 0.42 the floor
      // carried 42 % of itself as light a shadow map cannot touch — and the
      // contact blob, which is alpha over the top, was fighting it too. The
      // walls still want it (they are lit by nothing else); the floor does not.
      // So it is now a per-surface number in `appearance.room.bounce` and this
      // one is the fallback a profile saved before turn 10 falls back to.
      roomBounce: 0.42,
    },

    // ─── THE EDITOR'S OWN RIG (turn 16, CLAUDE.md F7) ───────────────────────
    //
    // The owner, of the element detail window and the exploded editor: "serio
    // nic nie widać" — you genuinely cannot see anything. He is right, and the
    // reason is that both windows carried THREE LIGHTS AS LITERALS in their own
    // components (an ambient at 0.75 and two directionals), which is both a
    // rule-3 violation and a rig nobody could turn up without editing JSX.
    //
    // It is a rig of its own and NOT the studio's, deliberately: the studio rig
    // lights a room from a viewer's height for a picture of furniture, and this
    // lights ONE PART held up to the light on a bench. What has to read here is
    // the machining — a dog bone, a 5 mm hinge hole, the break on an edge — and
    // those are read off the shading inside a 6 mm feature, not off the front
    // face of a door.
    //
    // So: the old three, each raised about a quarter, plus three lamps from the
    // angles the old rig had NOTHING in — the side, from below, and from behind
    // — because a socket's far wall facing away from the key is black however
    // bright the key is. Positions are FRACTIONS of the window's own orbit
    // radius, so a 300 mm drawer front and a 2.4 m wardrobe are lit alike.
    //
    // The numbers were tuned by MEASURING (verify/t16/editor-light.json): mean
    // luminance over a detail region, before and after, in a real browser.
    editorRig: {
      ambient: 0.95,                                    // was 0.75 in the JSX
      hemisphere: { sky: '#fff6ec', ground: '#c8c2b4', intensity: 0.85 },
      lamps: [
        { id: 'key', x: 1.0, y: 1.6, z: 1.0, intensity: 2.0 },        // was 1.6
        { id: 'fill', x: -1.0, y: 0.6, z: -0.4, intensity: 0.65 },    // was 0.5
        // The three new ones (F7: "add fill lamps from other angles").
        { id: 'side', x: -1.35, y: 0.25, z: 0.85, intensity: 0.9 },
        { id: 'under', x: 0.25, y: -1.15, z: 0.8, intensity: 0.55 },
        { id: 'back', x: 0.4, y: 0.85, z: -1.4, intensity: 0.7 },
      ],
    },

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
    // ─── Turn 8 (CLAUDE.md F1) ───
    // The two intensities are now the SAME, and that is the whole of "one rig".
    // Turn 6 turned the probe up for a still because the working view ran flat
    // and untone-mapped and needed the still to compensate; the working view is
    // tone-mapped now, and a probe turned up on top of the studio key washes out
    // exactly the modelling the key is there to put in.
    //
    // Kept as two numbers rather than collapsed to one: a workshop that wants a
    // glossier still has the knob, and the render pass still reads it.
    environment: { intensity: 0.5, renderIntensity: 0.5, blur: 0.05 },

    // ─── Contact shadow (turn 6; rebuilt turn 9, CLAUDE.md F1.3) ───
    // The dark that says a cabinet is STANDING on the floor rather than hovering
    // a millimetre above it. The key light cannot give you one: it comes in from
    // off to the side, so its shadow lands BESIDE the unit and the floor between
    // the legs stays as bright as the open room.
    //
    // Turn 6 answered that with one hand-painted quad per unit. Turn 9 replaces
    // it with drei's <ContactShadows>, fitted to the whole run from the same
    // furniture bounds the key light's frustum uses — because the thing that
    // reads as wrong is not one cabinet floating, it is a RUN floating, and a
    // per-unit blob leaves a bright seam at every joint between two of them.
    // It is rendered ONCE per layout change (`frames={1}` plus a React key), so
    // orbiting costs nothing: the price is paid when the furniture moves.
    //
    //   opacity  how dark the blob is under the carcass.
    //   blur     how far the edge of it is smeared. A room has no point source
    //            in it, so a contact shadow has no hard edge either.
    //   farMm    how high above the floor the shadow camera still sees. Past
    //            this, nothing contributes — so a wall unit hanging at 1500 mm
    //            does not print a second blob on the floor under it.
    //
    // ─── Turn 10 (CLAUDE.md F2) ───
    // The blob was invisible on main for a reason that had nothing to do with
    // these three numbers — drei multiplies width/height by its `scale` prop,
    // whose DEFAULT is 10, so a 1.8 m run was being baked onto an 18 m canvas
    // (3d/Scene.jsx FloorShadow carries the fix and the note). With the bake
    // finally landing where the furniture is, these could be tuned by looking
    // at it rather than in the dark:
    //
    //   opacity 0.5 → 0.62. The room is brighter than turn 9's and the floor's
    //   own emission is down (studio.roomBounce → appearance.room.bounce), so
    //   the blob has to do more of the work and can afford to.
    //   farMm 400 → 300. 400 mm reached up past the plinth and into the carcass
    //   sides, which smeared the dark out into a soft pool a hand's width wider
    //   than the furniture. 300 keeps it hugging the legs, which is the whole
    //   point of a CONTACT shadow.
    //
    // …and `blur` is gone, replaced by numbers that mean something:
    //
    //   blurMm         how far the edge of the shadow is smeared, IN
    //                  MILLIMETRES. drei's own `blur` is in UV units — a
    //                  fraction of the canvas — so the same number is twice the
    //                  softness on half a canvas, and the canvas size now
    //                  depends on where in the room the furniture is standing.
    //                  Turn 9's 2.5 over a 1.8 m bake was 18 mm; 22 is that,
    //                  a touch softer, and it stays 22 on a six-metre kitchen.
    //   texelMm        how much floor one texel of the bake is worth. The bake
    //                  is centred on the room (3d/Scene.jsx FloorShadow says
    //                  why), so its canvas grows with the room and the
    //                  RESOLUTION has to grow with it or a leg stops being
    //                  resolved — which is exactly what turn 9's accidental
    //                  18 m canvas did.
    //   maxResolution  the ceiling on that. 1024² RGBA is 4 MB, allocated
    //                  twice by drei and paid for on a layout change, never per
    //                  frame. A 4 m room lands at 1024 and 4.1 mm per texel,
    //                  which is turn 9's intended density to within a whisker.
    contactShadow: {
      opacity: 0.62, farMm: 300, blurMm: 22, texelMm: 4, maxResolution: 1024,
    },

    // ─── The room's own three tones (turn 10, CLAUDE.md F3) ───
    //
    // The complaint this answers is one sentence long: "the back wall and the
    // floor melt into one white blur". They did, and it was not subtle — the
    // wall was #ffffff, the floor #f2f0ec and the background #fafaf8, which is
    // three values inside 5 % of each other, and then both room surfaces
    // carried 42 % of themselves as emission on top of a 0.45 ambient. There
    // was nothing left for a junction to be made of.
    //
    // So: THREE DISTINGUISHABLE VALUES, warm as they go down. The background is
    // the lightest (it is the sky above the walls and it must not read as a
    // surface), the wall sits a step under it, and the floor is a clear step
    // darker AND warmer — a floor is timber, screed or tile, and none of them
    // is the colour of paint. Subtle by intent: this is a workshop tool and not
    // a showroom render, so the steps are ~4 % and ~9 % of luminance, which is
    // enough for an edge and not enough to look art-directed.
    //
    // `bounce` is the emission fraction per surface (Room.jsx `bounce`), split
    // out of `studio.roomBounce` this turn — and both halves come DOWN, because
    // emission is the part of a surface that no light shapes and no shadow
    // darkens, and turn 9 was carrying 0.42 of the room as exactly that.
    //
    // The wall's 0.42 → 0.18 is what buys criterion C: with 42 % of the wall
    // nailed to a constant, the spot pool had 58 % of a tone-mapped near-white
    // to work in and produced 0.004 of gradient over a hundred columns. At 0.18
    // the same pool produces 0.023, and the wall still reads 0.78 of white —
    // which is a white wall in a photograph, not a grey one. The floor's
    // 0.16 → 0.10 is the same argument for criterion A: the floor is the one
    // surface in the scene whose whole job this turn is to RECEIVE a shadow,
    // and emission is precisely the light a shadow cannot take away.
    room: {
      wall: '#f7f5f1',
      floor: '#e6e0d5',
      background: '#fafaf8',
      bounce: { wall: 0.18, floor: 0.1 },
      // How far the room's own surfaces stand BELOW the furniture datum, so the
      // contact shadow's bake camera — which must sit at the world origin at
      // floor level, looking up — cannot see the floor, and so the blob is a
      // hair proud of it instead of z-fighting. Half a millimetre: the app's
      // finest unit, and a quarter of a pixel at the closest the orbit goes.
      // The whole room moves, not just the floor, so the junction stays sealed.
      floorOffsetMm: 0.5,
    },
    // Presentation mode (View ▸ Contour): the material fades out, the contour
    // stays. Changes nothing in the BOM.
    contour: { opacity: 0.06, hex: '#ffffff', outline: '#101010' },
    // A shade off the base finish, so a drawer box and a back panel read as
    // separate pieces inside an open carcass instead of one flat mass.
    shade: { drawer_box: 0.1, back: 0.07, plinth: 0.04, infill: 0.02, end_panel: 0.02 },
    // Parts that are not a "finish" at all.
    // Parts that are not a "finish" at all. `hinge` is turn 11's (CLAUDE.md
    // F3.5): a hinge is drawn in SOLID now, not only in X-ray, and on a broken
    // white door a bright bracket grey reads as a smudge. This is the tone of
    // the nickel-plated body a workshop actually screws in — dark enough to be
    // an object, quiet enough not to be a diagram.
    // ─── TURN 25 (CLAUDE.md F4.3 / F6.1): THE TWO METALS ────────────────────
    //
    // The owner asks for the same two things twice this turn — a GOLD handle
    // (F4.3: "procedural, gold for now") and gold-or-silver shelf sleeves
    // (F6.1: "he wants to SEE gold or silver") — so there is one block of two
    // metals rather than a colour in each feature. A third piece of brass next
    // turn reads this and adds nothing.
    //
    // They sit here, beside the hardware finishes, because that is what they
    // are: a plated metal is a surface, and the numbers are the same three the
    // hinge finishes carry (colour, metalness, roughness).
    metals: {
      gold: { label: 'Gold', colour: '#c9a227', metalness: 0.95, roughness: 0.22 },
      silver: { label: 'Silver', colour: '#c8ccd0', metalness: 0.95, roughness: 0.18 },
      // ─── TURN 32 (CLAUDE.md F2): THE WIZARD'S METAL COLOURS ───────────────
      // OWNER'S MENU, 15.08.2026: chrome / onyx / gold on the Hardware step.
      // Chrome and onyx join the palette; silver stays for the projects that
      // already carry it. Same three numbers as every plated surface here.
      chrome: { label: 'Chrome', colour: '#cfd4d8', metalness: 0.95, roughness: 0.12 },
      onyx: { label: 'Onyx', colour: '#2f2f33', metalness: 0.9, roughness: 0.35 },
    },
    metalDefault: 'gold',
    // ─── TURN 32 (CLAUDE.md F2): THE AUTOMAT'S FINISH ROW ───────────────────
    // Which PUBLISHED hinge finish each metal colour buys — a rule-table row,
    // never code. Blum publishes nickel and onyx; a gold hinge has no
    // published article, so gold answers null and the BOM prints a NAMED SPEC
    // line rather than an invented number (CLAUDE.md rule 3).
    metalHingeFinish: {
      chrome: 'nickel', silver: 'nickel', onyx: 'onyx', gold: null,
    },
    hardware: {
      rail: '#8d8d92', leg: '#4a4a4a', bracket: '#8d8d92', hinge: '#5b5f63',
      // ─── Turn 13 (CLAUDE.md F7) ───
      // Are the hinge bodies drawn in SOLID, without switching to X-ray? Yes,
      // and the owner's verdict is that the switch now exists to HIDE them.
      //
      // It is a profile number rather than a `true` in the ui store because it
      // is workshop configuration like every other appearance answer here
      // (rule 2) — a shop that wants a clean working view sets it once instead
      // of asking every joiner to find the toggle.
      showInSolid: true,
    },

    // ─── Which ink the dimensions are written in (turn 11, CLAUDE.md F1.5) ──
    // Owner verdict: RED by default, with the drawing-office navy as the option
    // — the reverse of turn 5, which had it the other way round because that is
    // what a paper drawing does. On a screen, over furniture, red is the one
    // that reads at a glance and cannot be mistaken for a part.
    //
    // These are KEYS into `profile.dimensions.colours`, which is where the two
    // hexes live: one home for the colour, one for the choice. `alt` is what
    // View ▸ Dimension colour offers as the other one, so a workshop that adds
    // a third ink to `colours` decides here which two are on the menu by
    // default without touching a component.
    dimensions: { colour: 'red', alt: 'navy' },

    // ─── The joint, drawn (turn 8, CLAUDE.md F8) ───
    // The joint is the identity of the system, and a carcass that shows none is
    // six boxes meeting at nothing. Two answers to two questions:
    //
    //   `solid` — the division lines a tab leaves where a side meets a wieniec.
    //   Quiet: a shade off the board, not a diagram drawn on the furniture.
    //
    //   the rest — X-ray, where the question is "how is this held together" and
    //   the answer may be as loud as it needs to be. One colour per kind, so a
    //   socket and the relief pocket beside it are not one shape.
    joinery: {
      solid: '#8f8a82',
      solidOpacity: 0.5,
      // Near-black for the tab PROFILE: it is a cut line, it has to read
      // against a panel at a fifth of its opacity, and it must not be mistaken
      // for the selection mark — which is a mid blue and a dashed box, and was
      // exactly what a blue profile line looked like.
      outline: '#2A2A2A',
      socket: '#B4783C',
      dogbone: '#8C182B',
      // ─── Turn 13 (CLAUDE.md F8): the partition's fixing ───
      // The biscuit MARK and the ⌀3 screws that flank it, drawn in X-ray so a
      // joiner can see the set-out on the furniture and not only on the sheet.
      // The mark takes the same warm tone its DXF layer has in the CNC preview,
      // so the same thing is the same colour in both places; the screws take a
      // cooler one, because a set is three things and has to read as three.
      biscuit: '#E08A3C',
      screw: '#3D7F9C',
      // Off the face, in mm. The same trick and the same reason as the edge
      // handle's (3d/EdgeHandle.jsx): a line drawn ON a surface is a coin toss
      // per pixel per frame.
      lift: 0.4,
    },

    // ─── X-ray (turn 7, CLAUDE.md F3 / BACKLOG #42) ───
    // Look THROUGH the furniture: the board goes translucent, the contours
    // stay, and the hardware the workshop has to buy appears where it is
    // fitted. Two opacities, not one, and the difference is the whole trick —
    // a front stays readable as a front (it is the face of the cabinet) while
    // the carcass fades far enough back to see a hinge through it.
    xray: { carcass: 0.2, front: 0.42 },

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
      // ─── Turn 8 (CLAUDE.md F2.5) ───
      // It WAS the dimension arrows' navy (#1B2A4A). On paper that is a colour;
      // on a screen, one pixel wide against a dark canvas, it is black — Piotr
      // could not tell a selected cabinet from an unselected one. The mark is a
      // legible mid blue now, and thinner, because a mark you can see does not
      // need to be heavy. The ARROWS keep the navy: they are a drawing.
      colour: '#2B6CB0',
      width: 0.75,
      offset: 10,               // clear of the solid — CLAUDE.md asks for 8–12
      dash: 34,
      gap: 20,
      // ─── Turn 14 (CLAUDE.md F1.4) ───
      // `hoverOpacity` is GONE, and the absence is the setting. Turn 6 drew
      // this same mark a second time and quieter under the cursor; the owner's
      // verdict after living with it is that in a room full of cabinets a mark
      // that appears without being asked for stops saying "this one" and starts
      // saying "the mouse is somewhere". Highlight is what a CLICK does.
    },

    // ─── The two pluses (turn 11, CLAUDE.md F4.3) ───
    // They ask different questions and must not look alike. The RUN plus stands
    // in the gap at the end of a run and means "another CABINET here"; the INNER
    // plus stands in the middle of the selected cabinet and means "something
    // inside THIS one". Piotr asked for the second in a different colour, and he
    // is right for a reason worth writing down: two identical discs a hand's
    // width apart, one of which adds a wardrobe and one of which adds a shelf,
    // is a mistake waiting for a Friday afternoon.
    //
    // `run` is the app's selection blue, which is where it started; `inner` is
    // the app's gold, the colour every other "this is the thing you are working
    // on" mark in the app already wears.
    // ─── TURN 30 (CLAUDE.md F12): THE COLOUR OF A FRONT-GAP FAULT ─────────
    // Red, because that is what CLAUDE.md asks for and what everybody already
    // means by it. A PICTURE number: nothing downstream of it is cut.
    frontGapWarning: { colour: '#e2483c' },
    // ─── TURN 30 (CLAUDE.md F8): WHAT A WORKTOP LOOKS LIKE ────────────────
    // Until a per-worktop decor arrives (CLAUDE.md puts it in a later
    // chat-fix), a slab is drawn in the workshop's own worktop grey. It is a
    // PICTURE number and nothing downstream of it is cut.
    worktop: { colour: '#6f6f72' },

    addPlus: { run: '#2B6CB0', inner: '#C9A227' },
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
    // Shadow map size and softness. `high` is a render-only cost: twice the map
    // in each direction is four times the pixels, and the working view must not
    // pay for it (CLAUDE.md: heavy things ONLY in the render).
    //
    // ─── Turn 9 (CLAUDE.md F1): THE THREE NUMBERS THAT KILL THE STRIPES ───
    //
    //   mapSize    how many texels the key light's frustum is divided into. The
    //              frustum is fitted to the FURNITURE (studio.shadowPadding), so
    //              on a 4 m run 1024 was ~5 mm per texel — wider than the gap
    //              between two cabinets. 2048 halves that for the working view;
    //              a render doubles it again.
    //
    //   bias       a flat depth offset. It fixes acne and buys peter-panning
    //              (the shadow detaching from the foot of the thing casting it)
    //              — so it is kept SMALL and the work is done by normalBias.
    //              Turn 8's render preset had it at −0.00018 against the working
    //              view's −0.0006: the 4K still was the LEAST biased picture in
    //              the app, which is exactly why the stripes survived at 4K.
    //              It scales the other way now: a bigger map needs less bias.
    //
    //   normalBias the modern fix, and the one turn 8 did not have at all. It
    //              moves the shadow lookup along the surface NORMAL rather than
    //              along the light, so a flat panel stops sampling its own depth
    //              without the whole shadow sliding. In world units — 0.02 is
    //              20 mm at the working view's texel size, 0.01 at the render's
    //              finer one, because a finer map needs less of it.
    shadow: {
      normal: {
        label: 'Normal', mapSize: 2048, radius: 4, bias: -0.0002, normalBias: 0.02,
      },
      high: {
        label: 'High', mapSize: 4096, radius: 7, bias: -0.0001, normalBias: 0.01,
      },
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
    // ─── Turn 8 (CLAUDE.md F1) ───
    // The exposure the STUDIO RIG is balanced at — `appearance.studio.exposure`
    // — and no longer a second number for the still. Turn 7 ran the working view
    // flat and untone-mapped and had to raise the exposure to compensate when
    // ACES came in for a render; the working view is tone-mapped now, so there
    // is nothing left to compensate for.
    exposure: 1.0,
    // …and for the same reason there is nothing left to rebalance. Turn 7 lit
    // the editor one way and the still another, which meant a joiner could not
    // judge from the screen what the customer would be sent. The rig is one rig
    // now (3d/Scene.jsx Lights), so these are all 1 and the render's contrast
    // comes from the same key light the editor is showing.
    //
    // Kept as a block rather than deleted: a workshop that wants a punchier
    // still than its working view has the knob, and the render pass still reads
    // it. It just has nothing to say by default.
    //
    // `spot` joins them in turn 10 with the jupiters (CLAUDE.md F1.6). The
    // capture loop skips a role it does not recognise, so the rig would have
    // worked without it — but a knob that exists for four of the five lights
    // and silently not for the fifth is a trap, not a saving.
    lightScale: {
      ambient: 1, key: 1, fill: 1, rim: 1, point: 1, spot: 1,
    },
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
    // above is already dimensioned for — cup ⌀35, 11 deep, cup centre 21.5 in
    // from the door edge).
    hinge: {
      cupDiameter: 35,
      // ─── TURN 26 (CLAUDE.md F1.1): PIOTR MEASURED IT ────────────────────
      // The owner put a rule on the real thing: **a CLIP top cup is 11 mm deep
      // in a 25 mm door.** Not 12.5, which is the number the app has carried
      // since turn 1 and which nobody in this building had checked against a
      // hinge. It is HIS number and it decides three things at once — how deep
      // the bore is cut on the sheet (`cup` drills now state this depth), how
      // far the procedural cylinder goes into the leaf, and where the
      // downloaded model's flange plane sits (`modelOrigin.z` below is derived
      // from it, and a test holds the derivation).
      cupDepth: 11,
      // How much board a blind cup must leave under it. The bore is clamped to
      // `thickness − this` so an 18 mm front cannot be drilled through by a law
      // written for a 25 mm one (engine/doors.js `cupBoreOf`).
      //
      // ─── TURN 53 (CLAUDE.md F9): ONE MILLIMETRE STOPS BEING LEGAL ───────
      //
      // T52's finding 2, standing since its morning audit. This was ONE, and
      // one is not a number: an 18 mm shaker whose ⌀35 cup overhangs the frame
      // was bored to leave a single millimetre of skin — and
      // SKYLON_COMMON.lsp's own note says what that is worth, *"one millimetre
      // reads through a sprayed face"*. The ring telegraphs the first time the
      // door is knocked, and it is found by the customer.
      //
      // DECISION TAKEN for the owner (veto in one line): THREE.
      //
      // Where three cannot be kept the bore SHORTENS — the existing clamp in
      // `engine/doors.js cupBoreOf`, unchanged — and where the shortened bore
      // no longer seats the hinge the existing `cupTooThin` check names the
      // leaf. Refuse and report, the house way, never a 1 mm floor. The law is
      // stated in `SKY:cupFloorKeep` beside the cup maths it belongs to.
      cupFloorKeepMm: 3,
      bossHeight: 16,        // the cup body standing proud of the door's back face
      armLength: 62,         // cup centre → the far end of the arm, along the depth
      armWidth: 22,          // across the door's height
      armThickness: 11,
      plateLength: 56,       // mounting plate on the carcass side, front to back
      plateWidth: 34,
      plateThickness: 12,
      // ─── TURN 36 (CLAUDE.md F4b): THE PLATE BITES INTO THE SIDE ─────────
      // The owner, re-issued from T35-F5: the plate GLB stood ON the inner
      // face of the carcass side, so its knock-in dowels and its screws sat
      // in air. It moves 5 mm INTO the board, which is where the ⌀5 pattern
      // this app has drilled since turn 1 actually goes. A number in the
      // profile, not in a component: a workshop that fits a different plate
      // changes one line here. It reaches the PICTURE and nothing else — no
      // hole, no cut and no BOM line moves with it.
      // ─── TURN 37 (CLAUDE.md F3): FIVE MORE MILLIMETRES ──────────────────
      // The owner walked T36 the same day it merged and looked at the seated
      // plate: *"zawiasy — dociśnij o następne 5 mm."* Five MORE, on top of
      // T36's five — so the bite is 10, and the sentence above stays true of
      // every word of it. He is reading a picture, not a drawing: the plate
      // GLB's own body is deeper than the 5 mm T36 gave it, so at 5 the
      // casting still stood proud of the inner face he was looking at. This
      // is the eye's correction to the eye's number.
      //
      // The 10 is still under `plateThickness` (12), which is the only
      // ceiling this number has — a plate bitten deeper than it is thick
      // would have its BACK face outside the board, and the picture would be
      // lying in the other direction. Nothing else constrains it, because
      // nothing else reads it: `plateHoles`' ⌀5 pattern is drilled from the
      // hinge law in `engine/hinges.js` and has never consulted this field,
      // and turn36-f4-hinges.test.js keeps the four engine files honest
      // about that.
      plateBiteMm: 10,   // 17.08.2026 (T37-F3), was 5 in T36-F4b

      // ─── BLUM CLIP top BLUMOTION (turn 19, CLAUDE.md F1) ────────────────
      //
      // The owner brought the whole CLIP top world as GLB and the KNOWLEDGE
      // with it: `reference/hardware/cliptop-hinges.json` is the CATALOGUE OF
      // RECORD (F0.3) and carries the articles, the finishes and the ANGLE
      // RULE. Nothing of that is repeated here, deliberately — a rule copied
      // into two files is a rule that will disagree with itself — and the
      // engine reads it from the catalogue it is handed (engine/hinges.js,
      // pushed in by lib/hardwareCatalogue.js, exactly as the runners are).
      //
      // What IS here is the workshop's side of it: which system it stocks,
      // which finishes it will order, which plate it drills for, and where the
      // models are served from. Those are choices, not catalogue facts.
      //
      // NOTHING IN THIS BLOCK REACHES THE DRILLING. The default hinge IS
      // today's drilling — same ⌀35 cup, same ⌀3 cup screws, same ⌀5 plate
      // holes, same layers — and CLAUDE.md's iron rule for this turn is ZERO
      // CNC deltas. Finish, angle and article change what is BOUGHT and what is
      // DRAWN, never what is bored.
      cliptop: {
        system: 'cliptop_blumotion',
        systemLabel: 'CLIP top BLUMOTION',
        // The one system in the catalogue today. It is a list because the next
        // one the workshop stocks is an entry, not a rewrite.
        systems: [
          {
            id: 'cliptop_blumotion',
            label: 'CLIP top BLUMOTION',
            hint: 'Blum’s soft-close cup hinge — the angle follows the front, not a menu.',
          },
        ],
        // ─── FINISH (F1.1) ───
        // "nickel / onyx — drives which GLB is drawn and which ARTICLE the BOM
        // lists. Nothing else." Two finishes of the same hinge are the same
        // hole in the same place.
        //
        // ─── TURN 23 (CLAUDE.md F4.1): …AND WHAT IT LOOKS LIKE ────────────
        // Owner: "the model renders WHITE — raw file material." A converted
        // GLB carries whatever material the conversion wrote, so the finish
        // reached the BOM and the file name and stopped there. `material` is
        // the three numbers the view paints the clone with (3d/hardwareFinish
        // .js), and it is here for the same reason every other appearance
        // number is: it is a workshop answer, and the owner tunes it in one
        // block rather than in the renderer. Sane metallic defaults — a
        // bright plate and a dark one — not a measurement of anybody's
        // sample.
        //
        // ─── TURN 24 (CLAUDE.md F12): …AND SOMETHING TO REFLECT ────────────
        // The owner compared the STEP-grade model to the catalogue photo:
        // still far. Nickel without an environment is GREY PAINT — a metal is
        // a mirror, and a mirror with nothing in front of it renders as a flat
        // swatch whatever its metalness says. `envMapIntensity` is how much of
        // the hardware's own probe (3d/hardwareEnv.js) each finish takes, and
        // `clearcoat` is the thin lacquer over a plated part. They are here,
        // beside the colour, because they are the same kind of fact and a
        // workshop tunes them in one block rather than in the renderer.
        //
        // NOTHING ELSE IN THE ROOM SEES THE PROBE. `scene.environment` stays
        // null and the map attaches per MATERIAL — the no-HDRI philosophy
        // exists for the LACQUERS and stays for them (F12.2).
        finishes: [
          {
            id: 'nickel',
            label: 'Nickel',
            hint: 'The bright plated finish — the shop’s default.',
            material: {
              colour: '#c9ccd1',
              metalness: 0.95,
              roughness: 0.22,
              envMapIntensity: 1.35,
              clearcoat: 0.25,
              clearcoatRoughness: 0.1,
            },
          },
          {
            id: 'onyx',
            label: 'Onyx',
            hint: 'The dark finish. Same hinge, same drilling, black.',
            material: {
              colour: '#2a2b2e',
              metalness: 0.9,
              roughness: 0.34,
              envMapIntensity: 1.1,
              clearcoat: 0.2,
              clearcoatRoughness: 0.15,
            },
          },
        ],
        defaultFinish: 'nickel',

        // ─── THE PLASTIC STAYS PLASTIC (F4.2) ──────────────────────────────
        // "Plastic sub-meshes (the CLIP lever, caps) keep a plastic look:
        // override by material-name ALLOWLIST, not blanket." A chrome release
        // lever is a hinge that does not exist, which is worse than a white
        // one. The needles are matched as case-insensitive SUBSTRINGS of the
        // material name, because the same lever comes out of one converter as
        // `plastic_black` and another as `POM.001` — the mesh table in
        // `verify/t23/hinge-meshes.md` is where a workshop reads the names its
        // own files use, and this list is where it adds them.
        plasticMaterials: ['plastic', 'pom', 'nylon', 'rubber', 'lever', 'cap'],
        plastic: { colour: '#1c1c1e', metalness: 0.05, roughness: 0.55 },

        // ─── THE MOUNTING PLATE (F1.5) ───
        // Knock-in ⌀5 is what the LISP drills and what every project cut so far
        // is bored for. The screw-on ⌀3 plate is a DIFFERENT PATTERN and nobody
        // has supplied it, so it ships DISABLED: an enabled option that
        // silently drilled the ⌀5 pattern would make the export lie about what
        // is on the machine. BLOCKERS carries what is needed (the Blum 173L
        // card or its `.mpr`).
        plates: [
          {
            id: 'plate_knockin5',
            label: 'Knock-in ⌀5',
            enabled: true,
            hint: 'Two ⌀5 holes at 32 mm centres — what the kits have drilled since turn 1.',
          },
          {
            id: 'plate_screw3',
            label: 'Screw-on ⌀3',
            enabled: false,
            hint: 'drilling pattern pending',
          },
        ],
        defaultPlate: 'plate_knockin5',

        // ─── WHERE THE MODELS LIVE ───
        // The bucket holds only the GLB bytes (F0.3); the catalogue names the
        // file and this says which bucket and which path to hang it off.
        // ─── TURN 20 (CLAUDE.md F2.2): WHERE THE PACK ACTUALLY IS ──────────
        // Turn 19 wrote `hardware/hinges/blum/cliptop/` — the bucket name
        // doubled, AND a `cliptop` level the owner never created. The manifest
        // and all 19 GLBs answer at `hinges/blum/` INSIDE the `hardware`
        // bucket. If the owner later moves the pack into `cliptop/`, this one
        // line follows it and nothing else has to.
        bucket: 'hardware',
        path: 'hinges/blum/',

        // A downloaded model's origin is somebody else's decision and the LISP
        // owns the POSITION: the hinge aligns to the drilled cup, never the
        // other way round. Measured at first mount and not before — the same
        // honest zero the MOVENTO block carries, and the same rule that the
        // first person to see one sitting proud of its cup corrects THESE
        // THREE NUMBERS and nothing else. BLOCKERS.
        // ─── MEASURED, 11/08 (chat hotfix, owner: "koduj te zawiasy") ───
        // 71B3550 GLB, parsed headless: bbox x −26.5..11, y ±28.5, z −29.48
        // ..51.3; cup slab 37.5×57×16 at z 35.3..51.3 ⇒ authored axes ALREADY
        // match the unit's (y up, +z into the door, arm to −z). The wrong
        // picture the owner shot was the BBOX-MIN datum alone.
        //
        // ─── TURN 26 (CLAUDE.md F1.2): AND THE FLANGE PLANE WAS WRONG ───────
        //
        // Turn 24 read the cup slab's NEAR end (z 35.3) as the flange plane and
        // stood that on the door's inner face — so the model's ⌀35 body went
        // SIXTEEN millimetres into the leaf. That is the "roughly 15" the owner
        // measured off the screen, and on an 18 or 19 mm front it is a hinge
        // standing in the last two millimetres of the board.
        //
        // The cup slab's FAR end is the bottom of the bore, and the owner's
        // caliper says the bore is 11 mm. So the flange plane is DERIVED, not
        // typed a third time:
        //
        //   flangeZ = cupBoreFileZ − hardware.hinge.cupDepth = 51.3 − 11 = 40.3
        //   modelOrigin.z = min.z − flangeZ = −29.48 − 40.3 = −69.78
        //
        // `test/turn26-f1-no-pierce.test.js` asserts that identity, so the day
        // the owner re-measures the cup the origin cannot be left behind.
        //
        // These origins put the CUP CENTRE (x −7.75, y 0) at the drilled point
        // with the FLANGE PLANE on the door's INNER face:
        //   modelOrigin = min − (cupX, 0, flangeZ)
        // 173L6100 plate: 8.5×53×41.5, base at x −8.5 ⇒ after the −min shift
        // the base already sits on the panel face growing +x; the origin
        // centres the dowel line (y, z) on the drilled point.
        //
        // The file z of the cup's DEEPEST point — the bottom of the ⌀35 bore.
        // A measurement, like `min` above, and the one the flange is derived
        // from. A pack whose cup is authored differently changes this line.
        cupBoreFileZ: 51.3,
        fileMinZ: -29.48,
        // ─── HISTORY (turns 19–29): `modelOrigin` is MIN-RELATIVE ──────────
        // It answers "how far must this file's bounding-box corner move so the
        // cup lands on the drilled point" — and the answer is only right for
        // the file whose min was baked into it (`fileMinZ` above, the
        // `42542984` export). It keeps that job for the PLATE path, where the
        // owner's plate is right today and where a second family has not yet
        // arrived to disagree with it.
        //
        // ─── TURN 30 F1: `fileDatum` IS THE JOB ────────────────────────────
        //
        // The owner, of a 155° wardrobe hinge: "jest za głęboko osadzony w
        // drzwiach i się nie otwiera." Measured in the chat lab 14.08.2026 and
        // FINAL: every Blum hinge GLB in the bucket shares ONE authoring
        // frame, and the cup datum sits at this point in FILE millimetres,
        // ABSOLUTE — x on the cup's own centre line, y on the row, z the
        // FLANGE PLANE (the same 40.3 the bore derivation above produces:
        // `cupBoreFileZ − hardware.hinge.cupDepth`).
        //
        // Absolute is the whole of the fix. A 155° file has a bigger body and
        // therefore a different `min`; placed by `−min + modelOrigin` it lands
        // ~17 mm deep in an 18 mm leaf — a hinge in the last millimetre of the
        // board, which is the door that would not open. Placed by `−fileDatum`
        // it lands on the flange plane whatever the body around it is.
        //
        // For `42542984` the two transforms are BYTE-IDENTICAL by
        // construction, because `modelOrigin` was derived from this very
        // datum and that file's own min:
        //   −min + modelOrigin = −min + (min − fileDatum) = −fileDatum
        // `test/turn30-f1-hinge-datum.test.js` proves that identity rather
        // than asserting it, so the day somebody re-measures the cup the two
        // cannot drift apart in silence.
        fileDatum: { x: -7.75, y: 0, z: 40.3 },
        modelOrigin: { x: -18.75, y: -28.5, z: -69.78 },
        plateOrigin: { x: 0, y: -26.5, z: -20.75 },
        // ─── CHAT FIX 14.08.2026: THE PLATE FACES ITS PANEL ────────────────
        // Owner, off the live scene: the screws stood proud towards the
        // MIDDLE of the cabinet instead of biting the side panel — his
        // bucket's own plate file (`174E6100.01…`) is authored facing the
        // room. Half a turn about z puts the screws into the board and the
        // arm rail towards the opening. The spin is taken about the file's
        // own BBOX in x/y (`3d/hingeModels.js`), so the datum still means
        // what `plateOrigin` says and the body stays ON the face rather than
        // inside it. Same standing as `modelOrigin`: the first person to see
        // a plate that mounts the other way round corrects THIS ONE number
        // (0 switches the turn off; only 0 and 180 exist for a plate).
        plateSpinDeg: 180,
        // The hand the FILE is authored for. The body's bulk sits at −x of
        // the cup, which mounted reads as a RIGHT-hung door; the view mirrors
        // the clone (about the cup, scale.x) whenever the door's side differs.
        // If a real render shows the release lever on the wrong side, flip
        // this ONE letter — nothing else.
        fileHand: 'R',

        // ─── TURN 24 (CLAUDE.md F1): THE HINGE BREAKS IN THE MIDDLE ────────
        //
        // Owner's verdict on turn 23: the whole model rides the leaf, and it
        // must BREAK — cup side with the door, body side with the plate — or,
        // failing that, disappear when open. A better FILE will not fix it: a
        // GLB is a rigid cast. A RIG will.
        //
        // ONE JOINT, NAMED AS AN APPROXIMATION. A real CLIP top is a
        // SEVEN-LINK cross (Blum's own drawings: four bars, three couplers)
        // and the cup's path is a curve nobody here has the geometry for.
        // This is ONE hinge at the arm's front pivot, turned by the door's own
        // opening angle so the arm visually follows the cup into the opening
        // while its rear stays at the plate. CLAUDE.md F1.2 asks for exactly
        // that and forbids attempting the real four-bar; the name is in the
        // code beside the maths (3d/hingeModels.js `foldMemberB`).
        rig: {
          // The FLAG (F1.4). ON, the model folds. OFF — the owner's explicit
          // fallback if his eye test rejects the fold — an opening door HIDES
          // the body beyond `hideBeyondDeg` and shows the plate only, which is
          // honest in a way a wrong pose is not.
          enabled: true,
          hideBeyondDeg: 15,

          // ─── THE SPLIT, BY NODE NAME (F1.1 / F1.3) ──────────────────────
          //
          // The five components of the STEP-derived standard model, measured
          // per node, z in FILE millimetres (verify/t24/rig-members.md):
          //
          //   bau0015089612   35.3 … 51.3    5216 tris   cup
          //   bau0015088783   39.4 … 50.1     332        clip cap
          //   bau0015088853   31.1 … 44.9     416        link cover
          //   bau0015088251  −28.0 … 46.2    2634        arm + rear body
          //   bau0019416036  −29.4 … 22.5     364        lever
          //
          // MEMBER A parents to the DOOR and rides the leaf exactly as turn 23
          // left it. MEMBER B parents to the CARCASS beside the plate and
          // folds at the axis below.
          //
          // A name that is in NEITHER list falls back to the z threshold —
          // `z > 30 ⇒ member A` — which is the honest answer for a family
          // nobody has opened yet. It is a FALLBACK and not the rule, and
          // `bau0015088251` is why: that node spans −28 … 46.2, so a threshold
          // asked about its box would split the arm down the middle.
          // ─── CHAT FIX 14.08.2026: EVERY FAMILY'S OWN NAMES ──────────────
          // The five above are `71B3550_42542984`'s. The OTHER bucket files
          // wear other bau numbers, so on a 155° wardrobe door the fallback
          // put the MAIN ARM on the leaf — the owner's "stara wersja" —
          // and a 95°/onyx door was one finish away from the same. Measured
          // per file on the live bucket (node × z-span × role, 14.08):
          // cups, caps and covers to the DOOR; arms, links and levers to
          // the CARCASS. `71B3550_43192717` (names `Geom3D*`) stays on the
          // fallback and is never auto-picked — the family's leading
          // article is 42542984; BACKLOG carries its re-export.
          memberA: [
            'bau0015089612', 'bau0015088783', 'bau0015088853', // 71B3550
            'bau0015157579',                                   // 71B3590 cup
            'bau0079302490', 'bau0079324562', 'bau0079298416', // 71B7550 155°
            'bau0081900639',                                   // 71B7590 cup
            'bau0015166285', 'bau0015167707', 'bau0015167363', // 71B9550 95°
            'bau0016962400',                                   // 71B9590 cup
          ],
          memberB: [
            'bau0015088251', 'bau0019416036',                  // 71B3550
            'bau0079291413', 'bau0079262819',                  // 155° arm+link
            'bau0025540121', 'bau0082114196',                  // 155° levers
            'bau0015166656', 'bau0019426112',                  // 95° arm+lever
          ],
          zThresholdMm: 30,

          // ─── THE AXIS (F1.2) ────────────────────────────────────────────
          // Horizontal, parallel to the hinge row — the file's Y — at the
          // arm's front pivot.
          //
          // ─── TURN 29 (CLAUDE.md F5): MEASURED, AND FINAL ────────────────
          //
          // Turn 24 shipped starting numbers and said in as many words that
          // the first person to see the fold beside a real cabinet corrects
          // THESE TWO and nothing else. They have been measured on
          // `71B3550_42542984.glb` and render-verified, and CLAUDE.md hands
          // them over as final: the fold axis is the Y-parallel line through
          //
          //     x = −0.01808 m      z = +0.04286 m
          //
          // The file is authored in METRES like every GLB this app loads, and
          // everything in this block is in FILE MILLIMETRES, so they are ×1000
          // here. `foldPivotMm` puts them through the very transform
          // `glbClone` places the model by, which is what keeps this a
          // derivation rather than a third number that could disagree.
          //
          // On this file that lands the pin at (−10.33, 0, +2.56) mm from the
          // cup's centre: ten millimetres towards the arm and a whisker inside
          // the leaf, which is where a CLIP top's knuckle is.
          axis: { x: -18.08, z: 42.86 },

          // ─── WHICH WAY, AND HOW FAR ─────────────────────────────────────
          // "+θ opens, range 0 → 110°." The direction is the CUP's about the
          // pin, which is how the rig was measured in the lab; the app turns
          // the ARM relative to the leaf, so it is the same joint driven from
          // its other end and the sign is negated where it is applied
          // (`3d/hingeModels.js foldMemberB`, which says so beside the line).
          //
          // The cap is the ironmongery's own: a CLIP top opens to 110° and a
          // door drawn past it would be a hinge bent further than it goes.
          maxFoldDeg: 110,

          // ─── CHAT FIX 14.08.2026: THE ARM SLIDES INBOARD ────────────────
          //
          // The owner's verdict on the T29 fold, from his own screenshot: at
          // 90° the arm crosses the leaf, and the cup and the base are right
          // ("podstawa zawiasu jest super"). So ONE node — the arm body,
          // `bau0015088251…` — takes a PURE TRANSLATION and nothing turns:
          //
          //   −x   off the SIDE PANEL, towards the cabinet's middle — the
          //        file's +x runs TOWARD the panel (lab-measured, both
          //        hands, 14.08.2026: +15 buried the arm 14.7 mm in the
          //        side at 0°; −x clears leaf AND side at 0° exactly)
          //   −z   out of the LEAF, deeper into the carcass
          //
          // — both of them "inboard", 20 mm each (owner's bench verdict
          // 14.08: 15 cleared the shut door but grazed at 90°; +5 makes 90°
          // exact and halves the 110° residue), in FILE millimetres like
          // every other number in this block. The slide is written INSIDE the
          // mirrored clone (`3d/hingeModels.js offsetArmNode`), so the hand
          // needs no second sign: `scale.x = −1` mirrors it with the metal
          // and inboard stays inboard on either hand. The LEVER
          // (`bau0019416036…`) and the CUP do not move; the JOINT keeps the
          // measured axis above, so the drawn arm stands a constant
          // √(20² + 20²) ≈ 28.3 mm off its knuckle — the cost, asserted in
          // `test/turn29-f5`, of clearing the leaf without touching the
          // axis. And — costume on the screws — no hole moves either.
          armOffset: { node: 'bau0015088251', xMm: -20, zMm: -20 },
        },

        // A cup hinge is a small object. A file whose longest axis is bigger
        // than this is not a CLIP top and the view draws the procedural body
        // instead of something the wrong size (the runners' `lengthTolerance`
        // rule, in the shape a hinge needs it).
        maxModelLengthMm: 160,
      },
    },
    // A side-mounted runner pair: two L-profiles, one on the box and one on the
    // carcass, at the runner rows the engine drills. `length` comes from
    // result.hardware ('runner_pairs' → spec.length_mm), never from here.
    runner: {
      profileHeight: 45,     // the visible face of the profile
      profileThickness: 12.5, // how far it stands off the panel it is screwed to
      flangeDepth: 6,        // the return of the L

      // ─── BLUM MOVENTO 760H (turn 18, CLAUDE.md F6) ──────────────────────
      //
      // The owner uploaded the whole ladder as GLB — bucket `hardware`, path
      // `hardware/runners/blum/movento/`, 40 files plus a `manifest.json` that
      // names each one's system, nominal length, variant and ARTICLE NUMBER.
      // That manifest is the parts list for now (F6.8: `cc_hardware` waits for
      // the data module), and everything here is the OFFLINE TRUTH beside it:
      // with the bucket unreachable the app still knows which runner a drawer
      // takes and whether it needs a rod. What it will not know is the article
      // number, and it says so rather than inventing one.
      movento: {
        system: '760H',
        // ─── TURN 20 (CLAUDE.md F2.1): THE PATH IS BUCKET-RELATIVE ─────────
        // It read `hardware/runners/blum/movento/` and the URL builder puts
        // the BUCKET in front of it, so every request went to
        // `…/public/hardware/hardware/runners/…` and came back 400. The bucket
        // is called `hardware` and the folder inside it is `runners/blum/
        // movento/`; those are two different words that happened to be spelled
        // the same, and writing them once was the bug.
        bucket: 'hardware',
        path: 'runners/blum/movento/',
        manifest: 'manifest.json',

        // ─── THE VARIANT IS HARDWARE, NOT GEOMETRY (F6.4) ─────────────────
        // "Gaps, pockets, drilling: IDENTICAL for both." Blum's own
        // installation page says the pattern does not change with the motion
        // technology, so nothing downstream of this branches on it: it decides
        // which MODEL is loaded and which ARTICLE is ordered, and that is all.
        //
        // T is the project default — the owner's "90% of what we make". SU is
        // in the manifest and is deliberately not offered.
        variants: [
          {
            id: 'T',
            label: 'TIP-ON BLUMOTION',
            hint: 'Press the front to open; BLUMOTION adds the soft close.',
          },
          {
            id: 'S',
            label: 'Standard',
            hint: 'Pull to open, with the ordinary soft close.',
          },
        ],
        defaultVariant: 'T',

        // ─── TURN 23 (CLAUDE.md F4.3): THE RUNNER WEARS A FINISH TOO ───────
        // "Runners get the SAME treatment through the same helper — one
        // override function, two families." Blum sells the MOVENTO in orion
        // grey and silk white, and this repository does not have either
        // number: inventing a RAL is precisely what CLAUDE.md forbids here.
        // So the list is EMPTY and there is ONE honest neutral metal, which
        // `3d/hardwareFinish.js` falls through to. The day the owner supplies
        // the two, they are two entries with a `material` each, exactly like
        // the hinge's nickel and onyx above — and nothing else changes.
        finishes: [],
        // Turn 24 (CLAUDE.md F12): the runner takes the same probe through the
        // same helper — one override function, two families, as turn 23 wrote.
        finish: {
          colour: '#b9bcc0', metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2,
        },
        plasticMaterials: ['plastic', 'pom', 'nylon', 'rubber', 'cap'],
        plastic: { colour: '#1c1c1e', metalness: 0.05, roughness: 0.55 },

        // ─── WHERE THE MODEL'S OWN ORIGIN IS ──────────────────────────────
        // A downloaded model has an origin somebody else chose, and the LISP
        // owns the POSITION (F6.2): the runner aligns to the drilled row, never
        // the other way round. So the model is moved by this much, in the
        // runner's own frame — x across the cabinet from the panel it is
        // screwed to, y up from the drilled row, z from the front of the box.
        //
        // MEASURED AT FIRST MOUNT and not before: nothing in this repository
        // has opened one of the owner's files, so the honest value today is
        // zero on all three with the bounding box centred by the loader
        // (3d/runnerModels.js does that part). The first person to see a model
        // sitting proud of its row corrects THESE THREE NUMBERS and nothing
        // else — which is what stops the offset being scattered through the
        // view code. BLOCKERS #77.
        modelOrigin: { x: 0, y: 0, z: 0 },
        // Units in the files are true millimetres — validated at conversion,
        // where an NL450 file measures 450.5 long. A file whose longest
        // is not within this of its nominal length is not the runner it claims
        // to be, and the view falls back to the grey box rather than drawing
        // something the wrong size (F6.6).
        lengthTolerance: 5,

        // ─── TURN 33 (CLAUDE.md F9): THE OWNER'S LADDER, AT LAST ──────────
        // His list, 15.08.2026: runner lengths EVERY 50 mm UP TO 600. The
        // LOWER BOUND is marked: his message read "od 00" — shipped as 300,
        // owner to confirm (Q1 travels with the PR). ONE profile line; the
        // snap (engine/runners.js runnerEntry) lands on a RUNG of this
        // ladder and orders the article standing there — a rung the bucket
        // has no article for prints YELLOW in the BOM, never a substitute.
        // This closes the long-parked "wyrównanie drabinki długości
        // prowadnic — czeka na listę MOVENTO". The BOX ladder
        // (wardrobe.drawers.depthSteps — what the saw cuts) is untouched:
        // that one is the LISP's, and the fixtures stand on it.
        // ─── TURN 34 (CLAUDE.md F3), 16.08.2026 ──────────────────────────
        // The owner closed the F9 review with the bounds — "od 250" …
        // "dopisujemy do 700" — so Q1's marked lower bound is answered and
        // the ladder runs 250 to 700 every 50.
        nominalLadder: [250, 300, 350, 400, 450, 500, 550, 600, 650, 700],

        // ─── TURN 34 (CLAUDE.md F3): THE NOMINAL IS THE BOX + 10 ──────────
        // His standing workshop rule, said out loud on 16.08.2026 while
        // closing the F9 review: *"powinien być skrzynka +10 mm"* — nominal
        // 450 ↔ box 440, 500 ↔ 490. T33 asked the ladder for the BOX depth
        // and every drawer in the app landed one rung SHORT of the runner
        // the workshop actually orders. ONE profile line, one adder, read by
        // `engine/runners.js runnerAskFor` and by nothing else.
        nominalOverBoxMm: 10,

        // ─── THE SYNCHRONISATION ROD (F6.5) ───────────────────────────────
        // Catalogue thresholds, on the CABINET OPENING width — blum.com,
        // TIP-ON BLUMOTION for MOVENTO. Written out because they are exactly
        // the sort of number that gets rounded to "about 300".
        rod: {
          unitAloneBelow: 314,      // under this the unit works on its own
          narrow: [281, 305],       // …except here, where the NARROW rod goes
          withAdapters: [314, 1385], // and here, the rod with its adapters
          // The rod spans the drawer BOX and loses the fixed ends the adapters
          // take up — parametric, so a workshop that changes box widths gets a
          // rod that changes with it. 2 × 8 mm of adapter.
          endAllowance: 16,
          diameter: 10,
        },
      },

      // T54-F7: the side-mounted shoe runner family died with the shoe box —
      // the shoe drawer buys the SAME Blum runner every drawer buys, by the
      // same NL law (licence 2).
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
    // ─── TURN 37 (CLAUDE.md F2): THE HANGER BRACKET'S OWN DROP ──────────────
    //
    // The owner buried T35's "height above support" in one breath: *"dlaczego
    // drążek nie może być z półką powyżej… Zrób półkę nad drążkiem — półka, a
    // drążek dołącz do półki i tyle."* A rail is no longer a number typed into
    // a box; it is a FIX SHELF with a rod hung under it, and the only number
    // left is the bracket's own drop — shelf UNDERSIDE down to the ROD AXIS.
    //
    // The default is DERIVED, not invented: `wardrobe.rail.partitionAbove` is
    // 40, and it is the distance the rail partitioner has stood above the rod
    // since turn 1 — the very geometry the 3D already draws. So a rail hung
    // 40 mm under the board above it is the rail this app has always drawn,
    // and F2 moves nothing on the screen. `[OWNER — by silence]`: he was
    // shown the bracket and said only "dołącz do półki".
    //
    // A workshop whose bracket drops further changes this one line; the shelf
    // does not move, the rod does.
    hanger: { dropMm: 40 },
    // ─── THE SHELF SUPPORT (turn 25, CLAUDE.md F6) ──────────────────────────
    //
    // The owner: he wants to SEE gold or silver sleeves — and they are the
    // ⌀7.5 this engine has drilled since turn 1, not a new 5 mm system. So
    // there is nothing new to cut here and nothing new to order beyond what
    // `shelfHoles.pinsPerShelf` has always counted; what is new is that the
    // fitting is DRAWN.
    //
    // A support is two pieces and a joiner buys them as one: the SLEEVE, a
    // knock-in collar that lines the ⌀7.5 hole, and the PIN — the "spon" — that
    // goes into it and that the shelf rests on. The sleeve is what shows when
    // the shelf is out, and it is what the owner is asking to see.
    //
    // These proportions are OURS: the ⌀7.5 is his, and a collar for a 7.5 hole
    // is about 11 across with a 2 mm flange, and the pin that goes in it is a
    // 5 mm peg standing 9 mm proud. A catalogue fitting replaces the numbers
    // and nothing else.
    shelfPin: {
      sleeveOuter: 11,
      sleeveFlange: 2,
      // ─── TURN 26 (CLAUDE.md F3.2): THE COLLAR GOES IN THE HOLE ───────────
      //
      // "Sleeves and pins mount INSIDE the holes that actually carry a shelf.
      // The hole is the panel's; the sleeve is the hardware's."
      //
      // Until this turn there was no hole to be inside: the scene bored none
      // (turn 21's retirement), so the collar was a disc standing on a blank
      // face and it read as one. The BARREL is the part that lines the bore,
      // and its diameter is not a number here — it is the DRILLING's own,
      // read off the instance, because a sleeve that did not fit the hole the
      // machine cuts would be exactly the parallel idea R10 forbids.
      //
      // How far it goes in is a fitting's own length and the workshop's to
      // change; it must never exceed the bore, and the view clamps it to the
      // hole's stated depth.
      sleeveDepth: 9,
      pinDiameter: 5,
      pinLength: 9,
      // A little shoulder under the shelf, so the board is seen to be resting
      // ON something rather than floating beside a peg.
      shoulderDiameter: 8,
      shoulderThickness: 1.5,
    },
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

    // ─── THE WALL DRAWING (turn 40, CLAUDE.md F5) ───────────────────────
    //
    // A sheet is a WALL, and the numbers below are what makes a composition of
    // per-unit views read as one drawing rather than as several. Everything is
    // in DRAWING millimetres (it travels with the geometry through the scale)
    // unless it says otherwise.
    wallDrawing: {
      // A whole kitchen wall is four metres of drawing on 420 mm of paper, so
      // the text is set smaller than a card's — at 1:20 a 55 mm figure is
      // 2.75 mm on paper, which is what a drawing office sets a dimension at.
      // The floor is still `minTextHeight`.
      textHeight: 55,
      unitNumberHeight: 90,
      // THE TWO CHAINS. `chainFirst` is the inner one — the detailed run above
      // and the front heights on the right; `chainStep` is how much further
      // out the grouped one sits. Wide enough that two chains never read as
      // one, which is the fault the whole feature exists to avoid.
      chainFirst: 190,
      chainStep: 230,
      // How far the floor and ceiling lines run past the end cabinet, so the
      // building fabric reads as continuing rather than as stopping there.
      fabricOverhang: 250,
      // A handle's screw centre, marked with a short cross.
      handleTick: 14,
      // The plan: the cabinet number in green, the wall's own name beside it.
      planNumberHeight: 90,
      planLabelHeight: 110,
      wallLabelOffset: 320,
      noteHeight: 55,
      // His title block: Client Name, Client Address, Project, Drawing name,
      // Date, Job No, Scale, Rev — read straight off the set he supplied.
      titleRows: ['CABINET CORE', 'Client', 'Address', 'Project', 'Drawing', 'Job No', 'Scale', 'Rev', 'Date'],
      titleWidth: 112,
      // *"Scale reads 'No Scale' — he does not print to a scale, he trusts the
      // dimensions. Do not invent a scale label."* The sheet still has to be
      // laid out at SOME ratio to fit the paper; what the title block says is
      // his.
      scaleLabel: 'No Scale',
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
    // ─── TURN 31 (CLAUDE.md F6, check #7): THE BOARD ON THE BED ────────────
    // A panel bigger than the sheet is a panel nobody can cut, and until this
    // turn nothing in the app ever compared the two. OWNER'S DEFAULT,
    // 15.08.2026: 2790 × 2060. It is a sheet size, so it moves alone and it
    // moves the moment the workshop's supplier changes.
    sheet: { width: 2790, height: 2060 },
    // ─── TURN 35 (CLAUDE.md F15): A LIST PER FAMILY ────────────────────────
    //
    // Owner, 16.08.2026: *"musimy wpisywać wymiary w setup produkcyjne płyt —
    // jak mamy bok 2600 a maksymalna płyta 2400, to niech nie pozwoli"*, and
    // the list itself: *"z listy wybór — Jumbo 2070 × 2800, Standard 1220 ×
    // 2440, 10 foot 1020 × 3050, i Other, i tu wpisujemy sami. To musi być w
    // carcases I fronty."*
    //
    // (His "207" is read as 2070 — the Egger XL format. Flagged in the T35 PR
    // Q-list; accepted by silence.)
    //
    // TWO sheets, because a workshop does not buy its carcass board and its
    // front board off the same rack: the carcasses come off whatever is
    // cheapest in 18 mm and the fronts off the range the door is faced in. One
    // number for both was never the shop's truth, it was just all this app
    // could say.
    //
    // THE OPTIONS ARE THE APP'S SHAPE, NOT THE WORKSHOP'S VALUE. The list is
    // rebuilt from here on every migration (see `migrateCabinetProfile`), so a
    // profile stored before a format was added cannot outvote the code that
    // knows about it — the same law `appearance.lighting` travels under, and
    // the lesson T35-F7 is written about.
    sheetOptions: [
      { id: 'jumbo', label: 'Jumbo 2070 × 2800', width: 2070, height: 2800 },
      { id: 'standard', label: 'Standard 1220 × 2440', width: 1220, height: 2440 },
      { id: 'tenfoot', label: '10 ft 1020 × 3050', width: 1020, height: 3050 },
      // `Other…` is the two number fields, and it carries no size of its own —
      // what it means is "the width and height below are typed".
      { id: 'other', label: 'Other…', width: null, height: null },
    ],
    // …and the two the workshop has actually chosen. BOTH OPEN ON NOTHING —
    // `null` is "nobody has said", which falls back to `cnc.sheet` above, so a
    // shop that never opens this panel is checked against exactly the board it
    // has been checked against since turn 31 and no cabinet changes. It is the
    // `twoBelowMm: null` pattern: the default is silence, not a number.
    sheetCarcass: { width: null, height: null },
    sheetFronts: { width: null, height: null },
    // ─── TURN 20 (CLAUDE.md F4): HALF AGAIN ────────────────────────────────
    // Owner: the wrapping and the placement have been right since turn 18; the
    // SIZE is still double what he wants, on the glass and in the file. 40 was
    // the LISP's own `drawText` height and the LISP drew one cabinet a sheet.
    //
    // ONE number moves. `exportLabelScale` stays 0.5, so the exported DXF text
    // follows it down 20 → 10 without a second decision; `labelMinHeight` (6)
    // and `labelFitRatio` (0.12) stay exactly where they are — a small part
    // already sizes by the ratio and must NOT shrink twice.
    labelHeight: 20,                 // LISP drawText height on the CNC sheet, halved
    labelMinHeight: 6,               // …shrunk to fit a small part, never below this
    labelFitRatio: 0.12,             // label height ≤ this × the part's short side
    // ─── Turn 18 (CLAUDE.md F1): THE LABEL IS A BLOCK, NOT A LINE ─────────
    //
    // The owner's export screenshot — `F01 TOP 564x540 F01 BOTTOM 564x…`
    // running over the parts and into the neighbours. A one-line caption on a
    // small board can only fit by shrinking to nothing or by hanging over its
    // own edges, so it breaks onto up to three lines at its own word breaks
    // (`F-01` / `BUR` / `597x568`) and the block is centred in the part.
    //
    // The layout is engine/cnc/annotation.js `labelBlock`, and it is the SAME
    // function for the sheet and for the file (F1.1).
    labelMaxLines: 3,                // …up to three centred lines
    labelLineGap: 0.25,              // leading between two of them, × the size
    // How much of the part's own rectangle the block may fill. 0.94 until this
    // turn, and 0.94 was measured against OUR font. The DXF carries no font,
    // the reader's CAD picks its own, and Piotr's is wider than ours — so the
    // block is laid out to fit in the WORST reasonable face, not the best
    // (F1.3; the other half of it is `MONO_ADVANCE`, 0.62 → 0.85).
    labelFillRatio: 0.85,
    // ─── HALF THE SIZE IN THE EXPORT (F1.2) ───────────────────────────────
    // "The exported DXF writes the label at 50% of the sheet's height for the
    // same part. The sheet on screen keeps its size." One number, because the
    // two labels are otherwise laid out by the same call with the same box —
    // which is what stops them disagreeing about the WORDS while differing in
    // size on purpose. Never below `labelMinHeight`: a label a joiner cannot
    // read off the board is not a label.
    exportLabelScale: 0.5,
    layoutGap: 50,                   // LISP `odstep` — gap between parts laid out flat
    layoutRowWidth: 3600,            // wrap to a new row past this (preview only)
    // ─── Turn 11 (CLAUDE.md F6) ───
    // The cutter the workshop runs these files on. It reaches the CUT LIST
    // nowhere and the DXF nowhere — the machine's own post-processor owns the
    // toolpath — but the SHAPE the tool leaves is visible in the furniture, and
    // that is what F6 is about: an internal corner comes out filleted at the
    // tool's radius, never square, and a joint drawn with square corners is a
    // joint drawn from a drawing rather than from the part.
    //
    // 8 mm is the standard two-flute compression bit a board is cut with. A
    // workshop on a 6 or a 10 changes this line and the picture follows.
    toolDiameter: 8,

    // ─── Turn 16 (CLAUDE.md F3): THE SHEET'S OWN LETTERING ─────────────────
    //
    // Every one of these is a SHEET MILLIMETRE, not a pixel — that is the whole
    // fix. Turn 11 sized the captions in pixels and converted to millimetres at
    // the current zoom, so text grew as the drawing shrank until the sheet was
    // a mat of overlapping words. Annotation is part of the drawing: a part
    // code is 22 mm tall on the sheet whether you are looking at one cabinet or
    // at fourteen, and it is laid out inside the outline of the part it names.
    //
    // The two `min…Px` numbers are the ONLY screen-space values here, and they
    // decide one thing each: whether a thing is drawn at all. A caption too
    // small to read is hidden rather than inflated; a drilling symbol under a
    // pixel across is hidden rather than drawn as a smudge. That is CLAUDE.md
    // F3's "truncates/hides rather than overlapping a neighbour".
    annotation: {
      // ─── Turn 17 (CLAUDE.md F1.3): ONE TYPE SCALE ON THE SHEET ──────────
      // "The size of the yellow heading above the CNC view. Same type scale, in
      // world space." The in-part label carries the cabinet's name now — it is
      // the string a joiner picks a board off a pallet by — so it is set at the
      // heading's own size and SHRINKS to fit the part it is cut into, rather
      // than being a second, smaller scale nobody chose. The two numbers are
      // held equal by test/turn17-cnc-truth.test.js: a sheet with two type
      // scales on it is what turn 16 F3 was about.
      partLabelMm: 70,        // the cabinet, the part code and its cut size
      blockLabelMm: 45,       // the cabinet's NAME over its block
      sectionLabelMm: 70,     // the material section's header
      // (`partLabelInset` stood here until turn 18: how far inside its own
      // bottom edge a part's caption sat. A block centred in the part both ways
      // has no edge to stand off, so the number went with the rule — F1.1.)
      minLabelPx: 5,          // under five pixels tall, a caption is not drawn
      minSymbolPx: 0.75,      // …and a hole under three quarters of one is not
      // ─── Turn 20 (CLAUDE.md F9.1): WHEN A PRESS BECOMES A PAN ───────────
      // The sheet takes the pointer capture on the first move PAST this, not
      // on the press — a captured pointer makes the browser compose `click`
      // and `dblclick` on the container, which is what left turn 19's
      // double-click dead to a real mouse. Four pixels is the shake in a hand
      // that meant to click; anything further along was a drag.
      panThresholdPx: 4,
      // ─── Turn 20 (CLAUDE.md F7.4): THE SMALLEST THING YOU CAN HOVER ─────
      // A ⌀5 hole at sheet zoom is a couple of pixels across, and a rollover
      // you have to hunt for is not a rollover. The hover zone is the drawn
      // symbol or this, whichever is bigger ON SCREEN — the drawing is not
      // changed, only what counts as pointing at it.
      hoverGracePx: 7,
    },
  },

  // ─── Cutting-list CSV (must stay byte-identical to the LISP output) ───
  csv: {
    header: 'UNIT,PANEL,SZER,WYS,EDGE,EDG_L,SQM',
    dimDecimals: 0,
    edgingDecimals: 2,
    areaDecimals: 3,
    codes: { left: '<', right: '>', topBottom: '^v', all: '<>^v', none: '' },
  },

  // ─── TURN 32 (CLAUDE.md F5): THE BOM THE WORKSHOP CAN INVOICE FROM ────────
  //
  // The sheets question is a DIVISION with a label ("~N sheets of
  // 2800×2070"), never a cutting plan — nesting is explicitly parked. The
  // PURCHASE sheet here is not the CNC bed above (`cnc.sheet`, the owner's
  // 2790×2060): one is what the supplier sells, the other is what the
  // machine holds, and they move separately.
  //
  //   wastePct — OWNER — unanswered; ship 15, owner to confirm (15.08.2026).
  //   sheet    — OWNER — unanswered; ship 2800×2070, owner to confirm
  //              (15.08.2026).
  bom: {
    wastePct: 15,
    sheet: { width: 2800, height: 2070 },
  },

  // ─── TURN 39 (CLAUDE.md F2/F4): THE WORKSHOP'S OWN MATERIAL ANSWERS ───────
  //
  // The owner: *"każdy jeden projekt powinien mieć Assign materials"* — so an
  // ASSIGNMENT belongs to a project, not to the workshop. What belongs to the
  // workshop is the STARTING POINT: the Egger boards already chosen elsewhere,
  // and the rules that pick a leg or a hinge without anybody being asked.
  //
  // *"A project that has never been assigned opens with the defaults already in
  // place, not empty."*
  materials: {
    // partId → material id (a `cc_materials` row), or { material_id, yield }.
    // Keys are `engine/partRegistry.js` ids; `seedFromDefaults()` ignores any
    // key the registry does not know, so a stale profile cannot inject a row.
    //
    // EMPTY BY DEFAULT, and that is not an oversight. A material id is a
    // WORKSHOP NUMBER — it names a row in this workshop's own stock list — and
    // this app does not invent workshop numbers (the `enabled: false` pattern,
    // `twoBelowMm: null`, `sheetCarcass: null`). A shop that has never opened
    // the panel gets an honestly empty set of defaults and an Assign Materials
    // modal that says so, rather than a board somebody in Warsaw made up.
    defaults: {},

    // ─── THE LEG LADDER (F4) ────────────────────────────────────────────────
    //
    // *"nóżki też automatycznie w zależności od wysokości"*. A plinth height
    // picks a leg, and a leg has an ADJUSTMENT RANGE — a 100 mm leg that winds
    // from 95 to 120 covers a 110 mm toe kick and does not cover a 150 one.
    //
    // Shape of one rule:
    //   { material_id, label, nominal_mm, min_mm, max_mm }
    // `legProductFor(height, rules)` takes the rule whose [min_mm, max_mm]
    // contains the height and, among those, the one whose `nominal_mm` is
    // nearest. Nothing in range → NOTHING is assigned, and the modal says why.
    //
    // Empty for the same reason `defaults` is: every field in a rule but the
    // millimetres is a product this workshop buys, and nobody here knows it.
    legRules: [],

    // ─── THE HINGE LADDER (F4) ──────────────────────────────────────────────
    //
    // *"zawiasy automatycznie po wyborze koloru"*. The colour is
    // `design.hardware.shelfSleeve` (gold | silver | chrome | onyx); the app
    // already turns it into a HINGE finish through
    // `appearance.metalHingeFinish` — chrome and silver are nickel, onyx is
    // onyx, and GOLD IS NULL because Blum publishes no gold cup hinge and this
    // app does not invent one.
    //
    // One rule: { material_id, label, finish, system?, angle?, softClose? }.
    // `finish` is the hinge finish, not the metal, so one entry covers both the
    // colours that resolve to it. The best match wins: a rule that names the
    // system and the angle beats one that names only the finish.
    hingeRules: [],
    hingePlateRules: [],

    // ─── THE RUNNER LADDER (F4) ─────────────────────────────────────────────
    //
    // Keyed on the SNAPPED nominal length the engine already chose
    // (`result.hardware[runner_pairs].spec.nl`) — CLAUDE.md F4 is explicit:
    // *"Do NOT re-derive lengths here; read what the engine already decided."*
    // One rule: { material_id, label, nl_mm, variant? }.
    runnerRules: [],

    // ─── LIGHTING (F4) ──────────────────────────────────────────────────────
    // Straight ids: the strip, the channel it sits in, the driver, the switch
    // and the spots. The QUANTITY is already the design's own (F5 reads the
    // metres off the strips the job actually carries); this is only which
    // product those metres are bought as.
    ledRules: {
      strip: null, profile: null, driver: null, switch: null, spot: null,
    },
  },

  // ─── TURN 33 (CLAUDE.md F11): THE INSERT CATALOGUE — specs, never articles ─
  //
  // Label + NOMINAL WIDTHS per insert kind, profile-listed. The BOM's insert
  // line names the largest nominal not above the box's interior (the runner
  // ladder's own snap-below grammar); a box no nominal fits keeps the plain
  // named spec. SEEDED by Claude 15.08.2026 with a plain 50-step width run —
  // the owner fills the real trade list; every line stays YELLOW until the
  // register (F6, T32) knows products. No number here reaches a hole or a cut.
  drawerInserts: {
    catalogue: [
      { id: 'shoe', label: 'Shoe drawer insert', widths: [300, 350, 400, 450, 500, 550, 600, 700, 800, 900] },
      { id: 'belt_tie', label: 'Belt/tie divider insert', widths: [300, 350, 400, 450, 500, 550, 600, 700, 800, 900] },
    ],
  },

  // ─── TURN 52 (CLAUDE.md F5): THE WATCH DRAWER ────────────────────────────
  //
  // The owner, 26.08.2026:
  //
  //   *"szuflada z przegródkami na zegarki, krawaty etc … szkło i
  //   podświetlenie … rama z Eggera ale podświetlone zegarki … oczywiście
  //   szuflada nasza standardowa, tylko przegródki z 9 mm zrób, i szuflada
  //   płytka w środku, myślę że około 60 mm."*
  //
  // *"szuflada nasza standardowa, tylko przegródki"* — an INSERT, not a drawer
  // type. The box is untouched; the tray drops into it and is its own BOM line
  // (decision 3), so a customer can have it in one drawer of six.
  //
  // LISP IS LAW, FIRST (iron rule 3): every rule these numbers feed is born in
  // `reference/lisp/KIT_WATCH_DRAWER.lsp`. `engine/watchDrawer.js` follows it
  // and `test/turn52-f5-the-watch-drawer.test.js` holds the two together.
  //
  // NOTHING HERE REACHES AN EXISTING HOLE. Every rectangle these numbers cut is
  // in a piece that did not exist before this turn, and the six goldens carry
  // no insert at all.
  watchDrawer: {
    // ─── THE OWNER'S TWO NUMBERS ──────────────────────────────────────────
    // *"przegródki z 9 mm zrób"* — the divider stock, and the frame and base
    // are cut from the same board because a tray made of two thicknesses is a
    // tray with an offcut problem.
    dividerT: 9,
    frameT: 9,
    baseT: 9,
    // *"szuflada płytka w środku, myślę że około 60 mm."*  The TRADE standard
    // is about 50 mm for a watch pocket; 60 carries a chronograph and a
    // lining, which is why his number is the better one and is the one kept.
    // Both are written down because the next reader will ask.
    //
    // T54-F4 (28.08.2026): the owner re-sized — *"120 proszę."* The front
    // height DERIVES (`watchDrawerFixedHeight`: 40 + 9 + 2 + 15 + 18 + 36 =
    // 120), so this is the one number that moves: 60 → 40. TRADE NOTE,
    // amended (his veto line, written beside the number): at 40 a 44–48 mm
    // chronograph will no longer lie flat — it rests on its crown or stands
    // proud of the glass line. The 26.08 note above stays as history; the
    // pocket floor (60 CLEAR WIDTH, below) is across, not down, and does not
    // move. (KIT_WATCH_DRAWER.lsp carries the same amendment — LISP first.)
    insideDepthMm: 40,          // owner, 28.08.2026 — "120 proszę"; trade standard is ~50
    // ─── THE POCKET ───────────────────────────────────────────────────────
    //
    // CLAUDE.md: *"Pocket ~110 × 95 … five across; the count follows the
    // width, never a fixed five. A watch case runs 30–48 mm, so a pocket must
    // never fall below 60 mm clear."*
    //
    // 110 is the pocket's DEPTH front-to-back and 95 its WIDTH: a watch lies
    // across its cushion, so the long way is the way the drawer runs. Five
    // across is what those numbers give an insert of about 500 mm inside width
    // — 5 × 95 + 4 × 9 = 511 — which is a 600 mm drawer. A 900 mm drawer gets
    // EIGHT by the same rule, and that is the point of having a rule.
    pocketTargetMm: 95,
    pocketRowDepthMm: 110,
    // THE FLOOR, and it is the one number the count gives way to keep. A watch
    // CASE is 30–48 mm across; a pocket under this will not take one.
    pocketMinMm: 60,
    // ─── AND THE LONG SECTIONS BEHIND IT ──────────────────────────────────
    // *"ONE row of pockets, at the FRONT. Behind it, long sections for ties,
    // cufflinks and straps."*  A tie wants LENGTH, so these are aimed wide and
    // there are few of them — never the pocket rule again.
    sectionTargetMm: 220,
    // ─── DECISION 1: THE GLASS LIFTS OUT ──────────────────────────────────
    // 4 mm is what a drawer is glazed with (the same pane the display drawer
    // has taken since T33). It bears on a rebate cut in the top of all four
    // rails and nothing holds it down — no bead, no stop, no screw.
    // ─── TURN 53 (CLAUDE.md F8b/F8c): THE PANE AND THE STRIP MOVE UPSTAIRS ─
    //
    // The owner, 27.08.2026: *"opcja: dodać szybę ponad szufladą — wtedy
    // wycinamy w półce otwór, offset od półki na 50 mm, i wstawiamy szybę w
    // ten otwór. i dookoła tej szyby masz LED od spodu, offset około 15 mm na
    // LED."*  His two numbers, here rather than in the engine.
    openingOffsetMm: 50,       // the opening, inset from every shelf edge
    ledOffsetMm: 15,           // the ring, outside the opening, on the underside
    glassT: 4,
    // How far the pane bears ON the rail. 5 of a 9 mm rail, which leaves a 4 mm
    // lip standing proud of the glass all round: 5 + 4 = 9, and the pane sits
    // DOWN in the frame rather than on top of it. A bearing as wide as the rail
    // would be a rail with nothing left of it.
    glassBearingMm: 5,
    // How deep a divider is housed in the rail it stands against. A housing,
    // not a through slot: 3 of a 9 mm rail leaves two thirds of the board.
    slotDepthMm: 3,
    // ─── DECISION 2: THE LED LIGHTS THE WATCHES ───────────────────────────
    // How far UNDER the glass the strip runs, in the inner face of the front
    // rail. Below the pane, firing back and down across the pockets: a groove
    // in the rail's top face would light the pane, which is a shop display.
    // The GROOVE itself is the app's own (`lib/ledGroove.js`, T48's +10 mm at
    // each end) — same catalogue, same law, not a second one.
    ledBelowGlassMm: 12,
    // Air over the glass, and the hair the tray is inset by so it lifts out.
    headroomMm: 2,
    clearanceMm: 2,
  },

  // ─── TURN 33 (CLAUDE.md F1/F2): THE LED SYSTEM'S OWN NUMBERS ──────────────
  //
  // LIGHTING DRILLS NOTHING (rule 3): everything in this block is a picture in
  // the 3D view and a NAMED SPEC line in the BOM — no number here reaches a
  // hole, a cut or a fixture. The register knows no LED articles today, so
  // every BOM line prints yellow until the owner names products (Q4).
  lighting: {
    // OWNER'S MENU, 15.08.2026: "3000 / 4000 / 6000 etc" — the list is his and
    // EXTENDABLE here; a fourth temperature is one more row, not a code change.
    // The hex is only the tint the VIEW paints the strip in.
    temperatures: [
      // CHAT-FIX 16.08 (owner): *"nie widać zmiany pomiędzy 3, 4 i 6 k"*.
      // At a hot emissive the CENTRE of every strip clips to white under
      // ACES — the tint lives on the fringe, so the hexes must be SATURATED
      // enough to survive that. T33's near-whites (#ffd9a8/#fff3e0/#eaf4ff)
      // all read as the same strip; these three read warm / neutral / cool.
      { k: 3000, label: '3000 K', hint: 'Warm white', hex: '#ffa94d' },
      { k: 4000, label: '4000 K', hint: 'Neutral white', hex: '#ffe9c2' },
      { k: 6000, label: '6000 K', hint: 'Cool white', hex: '#a8d0ff' },
    ],
    // OWNER-TUNABLE DEFAULT, 15.08.2026 — the owner has not named one; 4000 K
    // ships marked `owner to confirm 15.08` (Q-list travels with the PR).
    defaultTemperature: 4000,
    // The drawn strip's cross-section, view-only. `sideLineWidth` is the one
    // number the OWNER gave (15.08.2026): "a 4 mm line, top to bottom" on the
    // carcass side's interior face.
    strip: {
      width: 12,          // front-to-back, under a shelf / at a plinth line
      thickness: 3,       // the strip's own height in the picture
      sideLineWidth: 4,   // OWNER'S NUMBER, 15.08.2026 — the side line is 4 mm
      // Where the depth slider STARTS for a fresh under-shelf strip, measured
      // back from the shelf's front edge. Claude's seed, 15.08.2026 — the
      // owner's ask is the SLIDER ("przesuwasz jak głęboko ma być led"), not
      // this number; owner-tunable like every default in this block.
      shelfDepthDefault: 30,
    },
    // Under-cabinet spotlights for KITCHEN WALL UNITS ("małe spotlighty w
    // szafkach wiszących"). Diameter is the disc the VIEW draws; the count is
    // where the per-unit stepper starts. Both view/BOM-only — no holes.
    spot: { diameter: 55, defaultCount: 2 },
    // How bright a placed strip glows in the ORDINARY working view — emissive
    // only, no real light source (rule: do not tank the frame rate).
    view: { emissive: 0.85 },
    // ─── F2: "TURN ON THE LIGHT" — the client demo ────────────────────────
    // OWNER-TUNABLE DEFAULTS, 15.08.2026 (the owner named the FEATURE, not
    // the numbers): `dimFactor` scales every lamp of the studio rig down —
    // the whole rig together, so the balance turn 26 computed does not move —
    // and `emissiveBoost` is what the placed LEDs come UP by while it is on.
    // Both derived at render time and never stored, which is what makes
    // "toggling back restores exactly the previous scene state" true by
    // construction.
    demo: { dimFactor: 0.15, emissiveBoost: 2.6 },
  },

  // ─── The room a unit stands in (turn 8, CLAUDE.md F3) ───
  // Not the room's SHAPE — that is the project's (engine/room.js). This is what
  // the workshop knows about walls in general.
  room: {
    // ─── TURN 51 (CLAUDE.md F8): THE SIDE WALLS' DEFAULT ──────────────────
    //
    // The owner, 26.08.2026: *"default bocznych ścian zrób na 2000 mm, nie jak
    // teraz 1500."*
    //
    // A ONE-WALL job is drawn as the wall plus, optionally, a RETURN at each
    // end — the two side walls he means, the field the room editor calls
    // "Side returns". Turn 14 shipped them at 1000 and they have been 1000
    // ever since; the 1500 in his sentence is a number he has typed into that
    // field rather than one the app ever defaulted to. The instruction is one
    // instruction either way, and this is it.
    //
    // *"One number, in the profile, read by everything that starts a room."*
    // This is the number. `engine/room.js DEFAULT_WALL_STUB` is the fallback
    // for a caller with no profile to hand, and the two are held EQUAL by
    // `test/turn51-f8-the-side-walls.test.js` — two literals that must agree
    // is exactly how a default drifts apart.
    //
    // A room that STATES its own length still wins: that is a joiner's answer,
    // and a changed default must never re-draw a saved job.
    sideWallMm: 2000,

    // EVERY unit stands this far off the wall behind it. Base, wall and tall
    // alike, and not because anybody asked for a gap: because a wall is not
    // flat and a hung cabinet needs somewhere for its bracket to be.
    //
    // Piotr's two reasons, in his order: walls are never straight, and a wall
    // unit hangs on hooks that stand it off anyway. Ten millimetres is what the
    // workshop builds to; a workshop with a plaster wall and a different hanger
    // changes this number and the whole app follows it — the plan, the arrows,
    // the drawing, the depth clamp and the door swing.
    //
    // It is SEPARATE from `params.inset_back_mm` (turn 7), and the two add up.
    // That inset is a decision about ONE cabinet with a pipe behind it; this is
    // a fact about all of them.
    wallBackClearance: 10,
  },

  // ─── The editor's own affordances (turn 9, CLAUDE.md F2) ───
  // Not clearances and not geometry: numbers that decide when a CONTROL is
  // offered. They are here rather than in the component for the same reason
  // every other number is — a workshop that wants the plus to appear sooner
  // changes one number and the canvas and the test both follow it.
  ui: {
    // How much clear room there has to be at the end of a run before the "+"
    // that adds a cabinet there is offered at all.
    //
    // Piotr's verdict on the arrow-based side picker was that it is confusing,
    // so adding is a "+" standing at the free end of the run itself — you point
    // at the gap you mean. Which means the plus has to be HONEST: offering one
    // in a 60 mm slot is offering to put a cabinet where no cabinet goes, and
    // the placement would refuse it a moment later.
    //
    // 100 mm is the narrowest gap a workshop would still call a gap rather than
    // a scribe — `autoParts.sideInfill.maxWidth` is 120, so anything under this
    // is a filler's job and not a cabinet's.
    addPlusMinGapMm: 100,

    // ─── TURN 50 (CLAUDE.md F2): THE SHARE-OUT ────────────────────────────
    //
    // The owner, 25.08.2026: *"jak dodaję ostatnią szafkę do ściany i zostanie
    // mniej niż 400 mm … czy chcesz wyśrodkować?"*
    shareOut: {
      // His own number. Under this much leftover at the wall, the bar offers.
      gapMm: 400,

      // …and the width past which a shared-out cabinet is OFFERED as two
      // rather than taken as one (decision 2 at the top of CLAUDE.md — the app
      // never adds a cabinet on its own).
      //
      // The owner's own worked example names both ends of the bracket: 3900
      // over six is 650 of front, *"wider than one door should be"*, and seven
      // at 557 is the answer it offers instead. So the line falls between the
      // two, and 620 is where it is drawn: 600 is the workshop's standard
      // cabinet and 620 is that cabinet with the scribe shared into it, which
      // is exactly what a share-out is for. Past it the run is being asked to
      // carry a cabinet nobody would have chosen, and the app SAYS so rather
      // than building it.
      //
      // It is deliberately NOT `doors.singleDoorMaxWidth`: that number decides
      // how many leaves a carcass takes (705 → two), which is a different
      // question from how wide a carcass a joiner wants in a run.
      maxWidthMm: 620,
    },

    // ─── TURN 31 (CLAUDE.md F2): THE THREE MESSAGE LEVELS ─────────────────
    //
    // The owner, 15.08.2026, on a toast slot of one that erased itself every
    // four seconds: "he has never seen one." His three rules are contracts and
    // live in engine/messages.js; these are the two NUMBERS in them, here
    // because rule 2 says a number lives in the profile.
    messages: {
      // "GREY — a few seconds." Three is a few: long enough to read a file
      // name, short enough that a bulk action does not paper the screen.
      // OWNER'S DEFAULT, 15.08.2026 — one number, and it moves alone.
      greyMs: 3000,
      // How many may stand at once before the queue sheds the least important
      // OLDEST one. Never a red (engine/messages.js `trimQueue`).
      // OWNER-TUNABLE DEFAULT, 15.08.2026 — the owner has not named it; five
      // is what fits over a 3D view without becoming the view.
      maxOnScreen: 5,
    },

    // ─── THE MODAL RULE (turn 12, CLAUDE.md rule 15) ───
    // "Every modal in this application is DRAGGABLE by its header and opens
    // BESIDE the object it concerns — never covering it." The owner said
    // "na zawsze", so the two numbers that decide what "beside" means are here
    // rather than in a component: one shell reads them and every modal in the
    // app is placed by it.
    modal: {
      // Clear screen pixels left between the object and the modal. Enough that
      // the edge of the cabinet and the edge of the panel are plainly two
      // things, and not so much that the panel stops feeling attached to it.
      gapPx: 14,
      // How close to a viewport edge a modal may come. The same 8 px the
      // right-click menu has used since turn 11.
      marginPx: 8,
      // ─── Turn 13 (CLAUDE.md F2.1 / rule 15's one exception) ───
      // How much room a MAXIMISED window leaves round itself. The cabinet
      // editor is a workspace rather than a side dialog and the owner asked for
      // it near-fullscreen; "near" is this number, and it is a number rather
      // than a `inset-6` in a class list because rule 2 says so. Big enough
      // that the room behind still reads as the thing underneath, small enough
      // that the window is the screen.
      maximiseMarginPx: 28,

      // ─── Turn 19 (CLAUDE.md F3 / W37) ─────────────────────────────────────
      //
      // Owner: "klikam na drzwi, a modal mi się otwiera na drzwiach i chuj
      // widzę." Turn 12 opened a modal BESIDE its object, which is right for a
      // cabinet and wrong for a POINT: a double-click on a door hands the shell
      // a rectangle of zero size, "beside" it is a millimetre away, and the
      // panel lands on the door.
      //
      // ─── TURN 20 (CLAUDE.md F5): THE OWNER'S OWN TWO NUMBERS ────────────
      //
      // "140 px to the side (right; left when the right has no room), and the
      // TOP of the panel level with the click."
      //
      // ─── TURN 21 (CLAUDE.md F4): HE USED IT FOR A DAY AND ASKED FOR MORE ─
      //
      // 240, same law. ONE NUMBER MOVES: right first, left where the right
      // lacks room, clamped to the viewport, draggable — all exactly as turn 20
      // wrote it. Every test and the acceptance walk read the number from HERE
      // rather than pinning a literal, which is what makes "one number moves"
      // true rather than aspirational.
      //
      //   x  140 — how much clear glass there is between the object and the
      //            panel. A thumb's width was not enough: the owner works at
      //            arm's length from a large screen and 24 px of air still
      //            reads as ON the door.
      //   y    0 — the offset of the panel's TOP from the click. Zero is
      //            LEVEL, which is where it was before turn 19 lifted the
      //            whole panel above the pointer; a negative number would
      //            raise it.
      //
      // Positive x is right, negative y is up — the screen's own signs. Every
      // modal in the app inherits both through the shell; there is no
      // per-modal copy of this arithmetic (F5.4).
      anchorOffset: { x: 240, y: 0 },
    },
    // ─── Turn 20 (CLAUDE.md F12.2): THE SAVE THAT SAYS SO ──────────────────
    // "A successful save turns the Save control green with a check for ~2 s,
    // then returns to rest." Two seconds is long enough to catch out of the
    // corner of an eye and short enough that it is plainly about the click
    // that just happened rather than a state the app is in.
    saveConfirmMs: 2000,
    // ─── TURN 54 (CLAUDE.md F6): DIMENSIONS GO TO SLEEP ────────────────────
    // The owner: *"wyłączenie dimension po 30 sekundach lub po minucie"* —
    // first number wins (veto "60"). A profile constant, like every other
    // interval in this block, so a workshop that wants the minute changes ONE
    // number. The mechanism is `lib/dimensionSleep.js`; the timer flips the
    // existing Hide-dimensions toggle through the store's own action and
    // never turns dimensions ON.
    dimensionsIdleMs: 30000,
  },

  // ─── Editor defaults ───
  // The clearances the collision clamp enforces. A move STOPS at these values
  // (src/engine/collision.js) — they are not advisory.
  editor: {
    // ─── TURN 31 (CLAUDE.md F7): THE HOVER AURA ────────────────────────────
    //
    // The owner: "Not a snap — a CATCHMENT." An invisible box a little bigger
    // than the piece, so pointing at a 12 mm bar handle or a 4 mm hinge arm on
    // a canvas showing a whole kitchen stops being pixel-hunting.
    hoverAura: {
      // How far past the piece the catchment reaches, in SCENE mm.
      // OWNER'S NUMBER, 15.08.2026: ~8.
      mm: 8,
      // How long the label stays after the cursor leaves. This is what stops
      // the flicker: three.js raycasts per frame, and a hand held still on the
      // boundary crosses it several times a second.
      // OWNER'S NUMBER, 15.08.2026: ~300.
      lingerMs: 300,
      // ORANGE. "red is reserved for Check" — an informational number wearing
      // the fault colour trains an eye to ignore the fault colour.
      colour: '#e08a2e',
      // F7's own note: "one number — default the owner may extend to two".
      // This is the extension, as one line.
      showBothAxes: false,
    },
    snapSteps: [0.5, 1, 32],
    defaultSnap: 1,
    // The precision the WORKSHOP works to (BACKLOG #33). Every millimetre field
    // in the app commits on this grid and every millimetre on screen is shown
    // to it, so "196.5" can be typed, seen and cut. Nothing to do with the drag
    // snap above — that is a user preference, this is what the tool measures in.
    mmStep: 0.5,
    // ─── CHAT FIX 14.08.2026: THE HINGE'S OWN NUDGE ───────────────────────
    // Owner: one workshop step per click "trwa za długo" on a 2250 door.
    // Five millimetres is a stride a joiner recognises; the NumberField
    // still takes any exact figure, so nothing is lost — only clicks.
    hingeNudgeMm: 5,
    minShelfGap: 40,           // minimum clear space between two shelves
    minShelfEdgeGap: 40,       // …and between a shelf and the top / base / partition
    // ─── TURN 24 (CLAUDE.md F10): THE HOVER ARROWS GROW A MAGNET ───────────
    //
    // Owner: turn 23's arrows vanish at a pixel's twitch. They did — the set
    // was tied to `onPointerLeave` on a hairline shape, so the smallest hand
    // movement off the feature took the measurement away mid-read.
    //
    // Once SHOWN, the set STAYS while the cursor is within this much of the
    // feature; leave the radius and they fade. In SHEET millimetres, like the
    // part editor's own magnet above and for the same reason: a print is a
    // drawing at a known scale and a joiner thinks in millimetres on it. The
    // 3-D scene uses the same number in the cabinet's own millimetres.
    hoverMagnetMm: 5,

    // ─── TURN 21 (CLAUDE.md F11): THE HEIGHT MAGNET ────────────────────────
    //
    // Owner: dragging a shelf near the height of a shelf in the next bay — or
    // the next CABINET — should catch, softly. His words: a PROPOSAL, not
    // force. This is how near "near" is; drag on through and it lets go, and
    // the numeric field never goes near it at all.
    shelfMagnetMm: 10,
    // ─── Turn 12 (CLAUDE.md F7) ───
    // How much HEIGHT two units have to share before one blocks the other. A
    // wall unit hung exactly level with the top of a tall cabinet beside it is a
    // kitchen finished flush and not a collision, so touching is not overlapping
    // — but a millimetre of float should not turn into a phantom obstacle
    // either. The tolerance is the workshop's own grid.
    levelOverlapMm: 0.5,
    unitMagnet: 40,            // butt a unit against its neighbour within this
    minUnitGap: 0,             // units stand edge to edge; > 0 forces a scribe gap
    // The widest deliberate clearance a unit may be given (turn 7, BACKLOG
    // #32). A joiner insets a cabinet to clear a soil pipe or a wall that bows;
    // past this it is not a clearance, it is a gap you would put another
    // cabinet in — and the app has a filler and a cabinet for that.
    maxInset: 300,
    // Auto-order (turn 4): the gap the next shelf leaves below the last one.
    // Never allowed to close up tighter than minShelfGap — that is the clamp.
    itemStackPitch: 350,
    // ─── Turn 9 (CLAUDE.md F4) ───
    // The shallowest a piece inside a carcass may be pulled back to and still
    // be a piece. A shelf slides in DEPTH now — grab it and pull, between the
    // face of the cabinet and the construction plane behind it — and a clamp
    // with no floor under it would let a joiner drag a 560 mm shelf back until
    // it was a 4 mm strip with a full cut list entry and two edges banded.
    //
    // 100 mm is a spice rack: the narrowest thing a workshop would still cut,
    // edge and drill as a shelf rather than call an offcut.
    minElementDepth: 100,

    // ─── Undo / redo (turn 12, CLAUDE.md F9) ───
    // How far back it goes, and how long a burst of writes has to stop for
    // before it counts as one edit. A shelf drag writes on every pointer frame;
    // 400 ms of stillness is a hand that has let go, and it is what makes one
    // gesture one Ctrl+Z rather than a hundred.
    history: {
      depth: 50,
      coalesceMs: 400,
    },

    // ─── The cabinet coming apart (turn 12, CLAUDE.md F4.1) ───
    // "Each panel slides out along its face normal … like the cabinet was
    // unscrewed." How far is a FRACTION of the cabinet's own size, not a number
    // of millimetres, so a 300 mm vanity drawer and a 2.4 m wardrobe explode to
    // the same picture. The maths is engine/explode.js.
    explode: {
      // Far enough to see the joint; near enough that it still reads as one
      // cabinet rather than a parts diagram.
      distanceFactor: 0.45,
      // Extra separation between pieces travelling the same way — three shelves
      // all lifting would otherwise stay stacked. Fans them out like a hand.
      spreadFactor: 0.18,
      // How long the animation takes, out and back.
      seconds: 0.6,
    },

    // ─── THE RULER'S SNAPS (turn 20, CLAUDE.md F6) ─────────────────────────
    //
    // Owner: "the tape grabs wherever the ray lands. It must catch the points a
    // joiner means — corner, end, middle, the meeting of two parts."
    //
    // AutoCAD's osnap, which is his home ground, so it uses AutoCAD's own
    // vocabulary and nothing has to be explained: a SQUARE on an endpoint, a
    // TRIANGLE on a midpoint, a CROSS on an intersection.
    ruler: {
      // How near the cursor has to be, IN SCREEN PIXELS, before a point is
      // caught. Screen space and not millimetres: a magnet measured in
      // millimetres would be unusable zoomed out and hair-trigger zoomed in,
      // which is exactly why AutoCAD's aperture is in pixels too.
      snapPx: 12,
      // The two panels are "touching" within this. The workshop's own grid
      // (`mmStep`), because a joint drawn a quarter of a millimetre open is a
      // joint, and an INT marker that vanished on it would be a bug a joiner
      // could not explain.
      contactMm: 0.5,
      // The marker's size on screen, in pixels. It is drawn at a constant size
      // however far away the point is — a snap marker is a piece of the tool,
      // not a piece of the furniture.
      markerPx: 11,
    },

    // ─── THE PENCIL ON A PRINT (turn 24, CLAUDE.md F2) ────────────────────
    //
    // The part editor draws with the MOUSE now, and the cursor carries osnap
    // markers — AutoCAD's language, which the ruler above already speaks. What
    // is here is the WORKSHOP's side of it: how big the magnet is, how big the
    // marker is, and what a hole gets when nobody has said otherwise.
    partSnap: {
      // ─── ONE NUMBER (F2.3) ───
      // "magnet radius ONE number in `profile.js` (sheet-space equivalent of
      // ~5 mm)". It is in the PART's own millimetres and not in pixels, unlike
      // the ruler's, and that is deliberate: a print is a drawing at a known
      // scale and a joiner setting out on it thinks in millimetres. The detail
      // window's zoom is bounded (10 mm … 5 m across), so 5 mm never becomes
      // either unusable or hair-trigger.
      magnetMm: 5,
      // The marker, in SCREEN pixels — it is a piece of the tool, drawn the
      // same size however far in the drawing is zoomed.
      markerPx: 12,
      // How near two features have to be to count as sharing a line, for the
      // live horizontal/vertical dimensions (F2.4). The workshop's own grid.
      alignMm: 0.5,
    },

    // ─── WHAT A DRILL IS, UNTIL SOMEBODY SAYS OTHERWISE (F2.6) ────────────
    //
    // "Drill asks ⌀ and depth ONCE per session in a compact popover on first
    // placement (defaults from the picked layer's convention), then stamps
    // repeatedly." These are those conventions, by LAYER NAME, because the
    // layer IS the convention in this app: `SCREWS_3MM` is a ⌀3 and
    // `SHELVES_7_5MM` is a ⌀7.5, and a joiner who picks the layer has already
    // said most of what the popover asks.
    //
    // `depth` is a THROUGH hole where the number is 0 — which is what a screw
    // through a side panel is, and what the export has always written.
    // ─── TURN 26 (CLAUDE.md R10 / F3.3): AND THE SCENE READS THE SAME TABLE ──
    //
    // This block was the hand-editor's stamping convention. It is now also what
    // `engine/machining.js` bores a blind hole to when the RECORD does not
    // state a depth — one table, so the hole a joiner stamps and the hole the
    // scene shows are the same hole. Two rows are corrected this turn, both on
    // the owner's own words.
    drillDefaults: {
      SCREWS_3MM: { d: 3, depth: 0 },
      SHELVES_7_5MM: { d: 7.5, depth: 12 },
      HINGES_5MM: { d: 5, depth: 12 },
      // Turn 35 (CLAUDE.md F8): the ⌀3 pilot the other half of the trade uses
      // for the same plate. Same depth — it is the same plate in the same
      // board; only the screw is different.
      HINGES_3MM: { d: 3, depth: 12 },
      // The owner measured the cup: ELEVEN, not 12.5 (CLAUDE.md F1.1). The
      // engine states this depth on the hole itself, so the record is what is
      // actually bored; this row is what a hand-stamped cup takes.
      FRONT_HINGES_35MM: { d: 35, depth: 11 },
      // …and the cup's own two fixing screws follow the cup rather than going
      // through the leaf. A ⌀3 straight through a door is turn 21's "pilot dots
      // on his door faces", which is what retired the whole carving pass.
      FRONT_HINGES_3MM: { d: 3, depth: 11 },
      PUZZLE_HOLES_7_5MM: { d: 7.5, depth: 0 },
      RUNNERS_3MM: { d: 3, depth: 0 },
      BISCUIT_4MM: { d: 4, depth: 12 },
      // A layer the table has not met. Never invented per hole: a joiner who
      // wants something else types it in the popover once and stamps.
      fallback: { d: 5, depth: 12 },
    },
    // …and what a DOWEL LINE steps at when nobody has typed a pitch. 32 is the
    // system-32 line every European cabinet is drilled on.
    dowelPitchMm: 32,
  },

  // ─── Distance arrows on the canvas (turn 3 phase 8; redrawn turn 5, #34) ───
  // The measurements the toolbar draws: unit to unit, and unit to wall.
  //
  // Turn 5 draws them the way a drawing office does. Filled cones pointing the
  // wrong way are gone; what is left is a thin line, extension lines out to the
  // faces being measured, an architectural tick across each end, and the value
  // in the middle. Every number below is in ROOM millimetres, so the annotation
  // scales with the drawing instead of with the camera.
  //
  // ─── TURN 26 (CLAUDE.md R11): THE END-STYLE KNOBS ARE GONE ────────────────
  //
  // `arrowHead`, `tickAngle`, `head` and `labelOffset` described how THIS file
  // drew an arrow, and this file no longer draws one: R11 gives the whole app
  // ONE dimension component (`3d/DimensionChain.jsx`), whose ends, weight and
  // caption are the partition chain's — `hoverDimensions` above. Four knobs
  // that no longer reach a pixel are four ways to spend an afternoon; they are
  // removed rather than left as a trap, and a stored profile that still carries
  // them simply keeps them and is ignored.
  //
  // What is LEFT here is what a ROOM DISTANCE is about and what the chain
  // cannot know: how close two things have to be to count as touching, how far
  // in front of the run the line lies, how high it floats, and the two inks a
  // technical drawing is written in.
  dimensions: {
    minGap: 2,            // below this the two things are touching, not spaced
    standoff: 90,         // how far in front of the units the line is drawn
    height: 120,          // how high above a unit's base the line floats
    // "1 px look": the thinnest bar that survives being rasterised at the
    // distances this scene is viewed from. Thinner and the line strobes.
    lineWeight: 3,
    extension: 110,       // extension line, from the measured face outwards
    extensionGap: 18,     // …starting this far off the face, as a draughtsman does
    // The two inks of a technical drawing. Navy is the default; red is the
    // option in View ▸ Dimension colour. Nothing else on the canvas is either
    // colour, so a measurement never reads as part of the furniture.
    colours: {
      navy: '#1B2A4A',
      red: '#8C182B',
    },
    // WHICH of them is the default lives in `appearance.dimensions.colour`
    // (turn 11, CLAUDE.md F1.5) — one home for the choice, this one for the
    // hexes. It was 'navy' here; it is 'red' there.
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
    board: {
      ...D.board,
      ...profile.board,
      // Turn 19 (F5.1): a profile saved before the board weights existed comes
      // back with them, and one that tunes a single thickness keeps the rest —
      // the key-by-key merge every nested block in this function gets.
      kgM2: {
        ...D.board.kgM2,
        ...profile.board?.kgM2,
        mfc: { ...D.board.kgM2.mfc, ...profile.board?.kgM2?.mfc },
        mdf_lacquered: { ...D.board.kgM2.mdf_lacquered, ...profile.board?.kgM2?.mdf_lacquered },
      },
    },
    front: { ...D.front, ...profile.front, types: { ...D.front.types, ...profile.front?.types } },
    // ─── CHAT-FIX 16.08 (owner): THE LIGHTING SPEC IS THE APP'S ─────────────
    // There was NO merge for top-level `lighting`, so a stored profile
    // replaced it WHOLESALE — the owner switched 3000/4000/6000 K and saw
    // nothing, because his browser's old near-white hexes outvoted the code
    // ("nie zmienia się jak zmienię 3, 4 lub 6 k"). The LOOK is the app's:
    // the temperature list and the strip/spot geometry come from code, same
    // law as the finish list and `appearance.lighting`. What stays his:
    // `defaultTemperature` (an owner-tunable, T33) and anything else a
    // profile names that the look does not own.
    lighting: {
      ...D.lighting,
      ...profile.lighting,
      temperatures: D.lighting.temperatures.map((t) => ({ ...t })),
      strip: { ...D.lighting.strip },
      spot: { ...D.lighting.spot },
    },
    carcass: { ...D.carcass, ...profile.carcass },
    doors: {
      ...D.doors,
      ...profile.doors,
      // Turn 31 (CLAUDE.md F4.18): the clearance matrix, key by key — a
      // workshop that has tuned ONE of the six keeps the owner's answer for
      // the rest, and a profile saved before this turn gets all six.
      clearance: { ...D.doors.clearance, ...profile.doors?.clearance },
    },
    handles: {
      ...D.handles,
      ...profile.handles,
      bar: { ...D.handles.bar, ...profile.handles?.bar },
      knob: { ...D.handles.knob, ...profile.handles?.knob },
    },
    hinges: {
      ...D.hinges, ...profile.hinges,
      rules: { ...D.hinges.rules, ...profile.hinges?.rules },
      cups: { ...D.hinges.cups, ...profile.hinges?.cups,
        baseOffsets: { ...D.hinges.cups.baseOffsets, ...profile.hinges?.cups?.baseOffsets },
        sinkOffsets: { ...D.hinges.cups.sinkOffsets, ...profile.hinges?.cups?.sinkOffsets } },
    },
    shelfHoles: { ...D.shelfHoles, ...profile.shelfHoles },
    puzzle: { ...D.puzzle, ...profile.puzzle, layers: { ...D.puzzle.layers, ...profile.puzzle?.layers } },
    // Turn 23 (F6 / F8): stored profiles made before these blocks existed come
    // back with them, like every other block here.
    partitionBack: { ...D.partitionBack, ...profile.partitionBack },
    // Turn 30 (CLAUDE.md F4): the divider's foot, restored from the LISP.
    partitionFoot: { ...D.partitionFoot, ...profile.partitionFoot },
    hoverDimensions: {
      ...D.hoverDimensions,
      ...profile.hoverDimensions,
      // Turn 27 (CLAUDE.md F4.3): the label palette is a BLOCK, so a stored
      // profile that overrides one of its two tones keeps the other rather
      // than dropping it — the same one-level merge every block here gets.
      label: { ...D.hoverDimensions.label, ...profile.hoverDimensions?.label },
    },
    // Turn 13 (F8): a stored profile made before the biscuit pattern existed
    // must come back with it, exactly as every other block here does.
    biscuits: { ...D.biscuits, ...profile.biscuits },
    wardrobe: {
      ...D.wardrobe, ...profile.wardrobe,
      defaults: { ...D.wardrobe.defaults, ...profile.wardrobe?.defaults },
      drawers: { ...D.wardrobe.drawers, ...profile.wardrobe?.drawers },
      drawerPanel: { ...D.wardrobe.drawerPanel, ...profile.wardrobe?.drawerPanel },
      runners: { ...D.wardrobe.runners, ...profile.wardrobe?.runners },
      rail: { ...D.wardrobe.rail, ...profile.wardrobe?.rail },
    },
    // 30.08 (the lighting law again): a stored profile was outvoting the code —
    // old kit sizes, no CONERO source. The CATALOGUE (kits) is the app's;
    // the owner's own thresholds beside it stay his.
    wardrobeAccessories: {
      ...D.wardrobeAccessories,
      ...profile.wardrobeAccessories,
      kits: JSON.parse(JSON.stringify(D.wardrobeAccessories.kits)),
    },
    baseUnit: { ...D.baseUnit, ...profile.baseUnit, defaults: { ...D.baseUnit.defaults, ...profile.baseUnit?.defaults } },
    projectHeights: { ...D.projectHeights, ...profile.projectHeights },
    projectTypes: { ...D.projectTypes, ...profile.projectTypes },
    projectSettings: {
      ...D.projectSettings, ...profile.projectSettings,
      carcassSources: mergeList(D.projectSettings.carcassSources, profile.projectSettings?.carcassSources),
      frontSources: mergeList(D.projectSettings.frontSources, profile.projectSettings?.frontSources),
      boardThicknessOptions: mergeList(
        D.projectSettings.boardThicknessOptions, profile.projectSettings?.boardThicknessOptions,
      ),
      hardware: { ...D.projectSettings.hardware, ...profile.projectSettings?.hardware },
    },
    itemsByContext: { ...D.itemsByContext, ...profile.itemsByContext },
    joinery: {
      ...D.joinery, ...profile.joinery,
      types: Array.isArray(profile.joinery?.types) && profile.joinery.types.length
        ? profile.joinery.types
        : D.joinery.types,
    },
    legs: { ...D.legs, ...profile.legs },
    wallUnit: {
      ...D.wallUnit, ...profile.wallUnit,
      defaults: { ...D.wallUnit.defaults, ...profile.wallUnit?.defaults },
      hangers: { ...D.wallUnit.hangers, ...profile.wallUnit?.hangers },
    },
    tallUnit: { ...D.tallUnit, ...profile.tallUnit, defaults: { ...D.tallUnit.defaults, ...profile.tallUnit?.defaults } },
    cargoUnit: { ...D.cargoUnit, ...profile.cargoUnit, defaults: { ...D.cargoUnit.defaults, ...profile.cargoUnit?.defaults } },
    pantryUnit: { ...D.pantryUnit, ...profile.pantryUnit, defaults: { ...D.pantryUnit.defaults, ...profile.pantryUnit?.defaults } },
    lowCabinet: { ...D.lowCabinet, ...profile.lowCabinet, defaults: { ...D.lowCabinet.defaults, ...profile.lowCabinet?.defaults } },
    baseDrawerUnit: {
      ...D.baseDrawerUnit,
      ...profile.baseDrawerUnit,
      defaults: { ...D.baseDrawerUnit.defaults, ...profile.baseDrawerUnit?.defaults },
      // The variant LIST is the app's, like the finishes above: a profile saved
      // before turn 12 has no variants at all, and a stored one that predates a
      // new variant must not hide it from the library.
      variants: mergeById(D.baseDrawerUnit.variants, profile.baseDrawerUnit?.variants),
    },
    sinkUnit: { ...D.sinkUnit, ...profile.sinkUnit, defaults: { ...D.sinkUnit.defaults, ...profile.sinkUnit?.defaults } },
    // ─── Turn 18 (CLAUDE.md F5.2) ───
    // The two appliance kits joined the profile in turn 17 and never joined
    // THIS list, which is a migration hole with a fuse on it: the return above
    // is `{ ...D, ...profile }`, so a profile saved by turn 17 replaces the
    // whole block and would come back without this turn's `topRails` — an oven
    // base with no top at all. Merged key by key now, like every other nested
    // block here.
    ovenUnit: {
      ...D.ovenUnit,
      ...profile.ovenUnit,
      defaults: { ...D.ovenUnit.defaults, ...profile.ovenUnit?.defaults },
      topRails: { ...D.ovenUnit.topRails, ...profile.ovenUnit?.topRails },
    },
    dwPanel: { ...D.dwPanel, ...profile.dwPanel, defaults: { ...D.dwPanel.defaults, ...profile.dwPanel?.defaults } },
    fridgeUnit: { ...D.fridgeUnit, ...profile.fridgeUnit, defaults: { ...D.fridgeUnit.defaults, ...profile.fridgeUnit?.defaults } },
    binUnit: { ...D.binUnit, ...profile.binUnit, defaults: { ...D.binUnit.defaults, ...profile.binUnit?.defaults } },
    wineRack: { ...D.wineRack, ...profile.wineRack, defaults: { ...D.wineRack.defaults, ...profile.wineRack?.defaults } },
    twinCupboard: { ...D.twinCupboard, ...profile.twinCupboard, defaults: { ...D.twinCupboard.defaults, ...profile.twinCupboard?.defaults } },
    cornerUnit: { ...D.cornerUnit, ...profile.cornerUnit, defaults: { ...D.cornerUnit.defaults, ...profile.cornerUnit?.defaults } },
    hoodWallUnit: {
      ...D.hoodWallUnit,
      defaults: { ...D.hoodWallUnit.defaults, ...profile.hoodWallUnit?.defaults },
    },
    glassWallUnit: {
      ...D.glassWallUnit,
      ...profile.glassWallUnit,
      defaults: { ...D.glassWallUnit.defaults, ...profile.glassWallUnit?.defaults },
    },
    americanFridgeUnit: {
      ...D.americanFridgeUnit,
      ...profile.americanFridgeUnit,
      defaults: { ...D.americanFridgeUnit.defaults, ...profile.americanFridgeUnit?.defaults },
    },
    autoParts: {
      ...D.autoParts, ...profile.autoParts,
      plinth: { ...D.autoParts.plinth, ...profile.autoParts?.plinth },
      topInfill: { ...D.autoParts.topInfill, ...profile.autoParts?.topInfill },
      sideInfill: { ...D.autoParts.sideInfill, ...profile.autoParts?.sideInfill },
      endPanel: { ...D.autoParts.endPanel, ...profile.autoParts?.endPanel },
      cornice: {
        ...D.autoParts.cornice,
        ...profile.autoParts?.cornice,
        projection: { ...D.autoParts.cornice.projection, ...profile.autoParts?.cornice?.projection },
        section: {
          ...D.autoParts.cornice.section,
          ...profile.autoParts?.cornice?.section,
          byHeight: {
            ...D.autoParts.cornice.section.byHeight,
            ...profile.autoParts?.cornice?.section?.byHeight,
          },
        },
      },
    },
    appearance: {
      ...D.appearance, ...profile.appearance,
      // The finish LIST is the app's, not the stored profile's: a project saved
      // before a decor existed must still be able to show it.
      finishes: mergeFinishes(D.appearance.finishes, profile.appearance?.finishes),
      // CHAT-FIX 16.08 (owner's tuning loop): the LED emission numbers are the
      // APP'S LOOK, not workshop data — a browser that persisted yesterday's
      // profile froze `appearance.lighting` and every knob turned in code
      // never reached the owner's screen ("nic nie widzę co powinno się
      // zmienić"). Code wins, always — same law as the finish list above.
      lighting: { ...D.appearance.lighting },
      outline: {
        ...D.appearance.outline,
        ...profile.appearance?.outline,
        // A profile saved before turn 15 has no `polygonOffset` at all, and a
        // stored one that overrides only `factor` must keep the app's `units`.
        polygonOffset: {
          ...D.appearance.outline.polygonOffset,
          ...profile.appearance?.outline?.polygonOffset,
        },
      },
      sheen: { ...D.appearance.sheen, ...profile.appearance?.sheen },
      // Turn 30 (CLAUDE.md F8): a profile saved before the worktop existed has
      // no colour for one, and a slab drawn in `undefined` is a black slab.
      worktop: { ...D.appearance.worktop, ...profile.appearance?.worktop },
      // Turn 30 (CLAUDE.md F12): and the colour a too-near pair is painted.
      frontGapWarning: { ...D.appearance.frontGapWarning, ...profile.appearance?.frontGapWarning },
      // Turn 21 (CLAUDE.md F3): a profile stored before this turn has no
      // `cuts` at all and must read as the default — off.
      cuts: { ...D.appearance.cuts, ...profile.appearance?.cuts },
      metals: {
        ...D.appearance.metals,
        ...profile.appearance?.metals,
        gold: { ...D.appearance.metals.gold, ...profile.appearance?.metals?.gold },
        silver: { ...D.appearance.metals.silver, ...profile.appearance?.metals?.silver },
      },
      sheenScale: { ...D.appearance.sheenScale, ...profile.appearance?.sheenScale },
      spray: { ...D.appearance.spray, ...profile.appearance?.spray },
      decor: { ...D.appearance.decor, ...profile.appearance?.decor },
      studio: {
        ...D.appearance.studio, ...profile.appearance?.studio,
        hemisphere: { ...D.appearance.studio.hemisphere, ...profile.appearance?.studio?.hemisphere },
        // Turn 26 (CLAUDE.md F10): the two new blocks merge key by key, so a
        // profile saved before this turn gains them whole and one that has
        // tuned the share keeps it.
        ceiling: { ...D.appearance.studio.ceiling, ...profile.appearance?.studio?.ceiling },
        brightness: { ...D.appearance.studio.brightness, ...profile.appearance?.studio?.brightness },
        // Chat-fix 25.08.2026: the showroom bands merge the same way, so a
        // project saved before today gains them whole and one that has tuned
        // its own tube keeps every number it set.
        band: { ...D.appearance.studio.band, ...profile.appearance?.studio?.band },
        // …and the pillars with it (chat-fix 25.08.2026, the evening).
        pillars: { ...D.appearance.studio.pillars, ...profile.appearance?.studio?.pillars },
        // ─── Turn 10 (CLAUDE.md F1/F5) ───
        // The lights that are LISTS — the jupiters and the glints — merge like
        // the other lists in this file: a stored profile that names them wins
        // whole, and one that has never heard of them takes the app's. Merging
        // them entry by entry would be wrong twice over, because the COUNT is
        // half the setting ("maybe a second one lower") and a workshop that has
        // deliberately turned a rig down to one spot must not have a second
        // grafted back on by an upgrade.
        spots: mergeLightArray(D.appearance.studio.spots, profile.appearance?.studio?.spots),
        points: mergeLightArray(D.appearance.studio.points, profile.appearance?.studio?.points),
      },
      // Turn 16 (F7): the editor's rig, merged the way the studio's is — the
      // scalars key by key, the LAMPS as a whole list (a workshop that has cut
      // the rig down to two must not have three grafted back on by an upgrade).
      editorRig: {
        ...D.appearance.editorRig,
        ...profile.appearance?.editorRig,
        hemisphere: {
          ...D.appearance.editorRig.hemisphere,
          ...profile.appearance?.editorRig?.hemisphere,
        },
        lamps: mergeLightArray(D.appearance.editorRig.lamps, profile.appearance?.editorRig?.lamps),
      },
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
      room: {
        ...D.appearance.room, ...profile.appearance?.room,
        bounce: { ...D.appearance.room.bounce, ...profile.appearance?.room?.bounce },
      },
      contour: { ...D.appearance.contour, ...profile.appearance?.contour },
      shade: { ...D.appearance.shade, ...profile.appearance?.shade },
      hardware: { ...D.appearance.hardware, ...profile.appearance?.hardware },
      joinery: { ...D.appearance.joinery, ...profile.appearance?.joinery },
      xray: { ...D.appearance.xray, ...profile.appearance?.xray },
      selection: { ...D.appearance.selection, ...profile.appearance?.selection },
      dimensions: { ...D.appearance.dimensions, ...profile.appearance?.dimensions },
      addPlus: { ...D.appearance.addPlus, ...profile.appearance?.addPlus },
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
      // ─── Turn 10 (CLAUDE.md F1.6) ───
      // Per KEY, not wholesale. A profile saved before the jupiters existed
      // carries a `lightScale` with five roles in it, and a plain spread would
      // let that stale block delete the sixth — leaving the spots with no knob
      // at all, which is exactly the trap F1.6 asks to be closed.
      lightScale: { ...D.render.lightScale, ...profile.render?.lightScale },
    },
    hardware: {
      ...D.hardware, ...profile.hardware,
      hinge: {
        ...D.hardware.hinge,
        ...profile.hardware?.hinge,
        // ─── TURN 40 (CLAUDE.md F7): plateBiteMm — THE CODE WINS ───────────
        //
        // The owner, 18.08.2026: he changed the number in T37-F3 (5 → 10) and
        // *reports seeing no change*. Nothing is wrong with the number: this is
        // the localStorage FREEZE this project has now hit three times — the
        // LED kelvins ("nie zmienia się jak zmienię 3, 4 lub 6 k") and the
        // design migration before it. `cc.profile.v1` is written whole on every
        // `setProfile`, so a browser that has ever saved a profile carries a
        // `hardware.hinge` block with the SUPERSEDED 5 in it, and the plain
        // spread two lines above lets that stale block outvote the code for
        // ever. A user would have to rebuild his workshop profile to see a
        // number he never chose.
        //
        // So the code wins, unconditionally — which is the same law three
        // things in this very block already follow (`plates`, `rig.memberA/B`,
        // `bucketLocation`) and for the same reason: HOW FAR THE PLATE MODEL
        // SINKS INTO THE SIDE is a fact about the file and the fitting, not a
        // workshop preference. Nothing in Settings edits it and nothing ever
        // has.
        //
        // IDEMPOTENT BY CONSTRUCTION, and deliberately not a guarded fill. The
        // T-round lesson is `null !== 0`: a guard written `if (!stored)` or
        // `stored || D.…` treats a stored 0 as "nothing said", and 0 is a legal
        // bite (a plate that does not sink at all). An unconditional
        // assignment has no such branch to get wrong, and running the
        // migration twice — which every load does, through `setProfile` —
        // cannot produce a different answer the second time.
        plateBiteMm: D.hardware.hinge.plateBiteMm,
        // Turn 19 (CLAUDE.md F1): the CLIP top block, merged key by key so a
        // profile saved before it existed comes back with it and one that
        // renames a finish keeps the plates.
        cliptop: {
          ...D.hardware.hinge.cliptop,
          ...profile.hardware?.hinge?.cliptop,
          // ─── Turn 20 (CLAUDE.md F2.2) ───
          // WHERE THE PACK IS is the app's own knowledge, not a workshop
          // preference — nothing in Settings edits it, and the two values that
          // shipped were both wrong about the owner's bucket. Merged back from
          // the defaults for the same reason `plates` below is: a stored
          // profile carrying `hardware/hinges/blum/cliptop/` would go on
          // asking for a folder that does not exist.
          ...bucketLocation(D.hardware.hinge.cliptop),
          systems: mergeById(D.hardware.hinge.cliptop.systems, profile.hardware?.hinge?.cliptop?.systems),
          finishes: mergeById(D.hardware.hinge.cliptop.finishes, profile.hardware?.hinge?.cliptop?.finishes),
          // Turn 23 (CLAUDE.md F4.2): the plastic answer and the names it is
          // applied to. Merged rather than spread so a turn-19 profile — whose
          // finishes carry no `material` at all — comes back able to paint.
          plastic: { ...D.hardware.hinge.cliptop.plastic, ...profile.hardware?.hinge?.cliptop?.plastic },
          // The PLATES are not merged by id from a stored profile: whether the
          // ⌀3 plate may be chosen is a question about what this repository
          // knows how to drill (F1.5), not a workshop preference, and a saved
          // profile must not be able to switch it on.
          plates: D.hardware.hinge.cliptop.plates,
          // Turn 30 (CLAUDE.md F1): the ABSOLUTE cup datum the hinge BODY is
          // placed by. Merged key by key like the origins beside it, so a
          // profile saved before this turn — which has no datum at all — comes
          // back able to place a hinge that is not `42542984`.
          fileDatum: {
            ...D.hardware.hinge.cliptop.fileDatum,
            ...profile.hardware?.hinge?.cliptop?.fileDatum,
          },
          modelOrigin: {
            ...D.hardware.hinge.cliptop.modelOrigin,
            ...profile.hardware?.hinge?.cliptop?.modelOrigin,
          },
          plateOrigin: {
            ...D.hardware.hinge.cliptop.plateOrigin,
            ...profile.hardware?.hinge?.cliptop?.plateOrigin,
          },
          // Turn 24 (CLAUDE.md F1): the rig. Key by key, because a profile
          // saved before this turn has no member lists at all and a hinge that
          // could not be split would be a hinge that never folds. The MEMBER
          // LISTS come back from the app for the same reason `plates` does:
          // which node of Blum's own export is the cup is a fact about the
          // FILE, not a workshop preference — the flag and the axis are the
          // two things a workshop tunes, and both survive the merge.
          rig: {
            ...D.hardware.hinge.cliptop.rig,
            ...profile.hardware?.hinge?.cliptop?.rig,
            memberA: D.hardware.hinge.cliptop.rig.memberA,
            memberB: D.hardware.hinge.cliptop.rig.memberB,
            axis: {
              ...D.hardware.hinge.cliptop.rig.axis,
              ...profile.hardware?.hinge?.cliptop?.rig?.axis,
            },
          },
        },
      },
      runner: {
        ...D.hardware.runner,
        ...profile.hardware?.runner,
        // Turn 18 (CLAUDE.md F6): a profile saved before the Movento block
        // existed comes back with it, and one that tunes a rod threshold keeps
        // the rest — the same key-by-key merge every nested block here gets.
        movento: {
          ...D.hardware.runner.movento,
          ...profile.hardware?.runner?.movento,
          // Turn 20 (CLAUDE.md F2.1): the doubled path shipped, so it is in
          // stored profiles. See the hinge block above for why this comes back
          // from the app rather than from the file.
          ...bucketLocation(D.hardware.runner.movento),
          variants: mergeById(D.hardware.runner.movento.variants, profile.hardware?.runner?.movento?.variants),
          // Turn 23 (CLAUDE.md F4.3): the finish list and the single neutral
          // metal behind it, merged like every other nested block — a profile
          // saved before this turn comes back with them rather than with a
          // runner that has no finish at all.
          finishes: mergeById(D.hardware.runner.movento.finishes, profile.hardware?.runner?.movento?.finishes),
          finish: { ...D.hardware.runner.movento.finish, ...profile.hardware?.runner?.movento?.finish },
          plastic: { ...D.hardware.runner.movento.plastic, ...profile.hardware?.runner?.movento?.plastic },
          modelOrigin: { ...D.hardware.runner.movento.modelOrigin, ...profile.hardware?.runner?.movento?.modelOrigin },
          rod: { ...D.hardware.runner.movento.rod, ...profile.hardware?.runner?.movento?.rod },
        },
      },
      leg: { ...D.hardware.leg, ...profile.hardware?.leg },
      shelfPin: { ...D.hardware.shelfPin, ...profile.hardware?.shelfPin },
      rail: { ...D.hardware.rail, ...profile.hardware?.rail },
      // T37-F2: the hanger bracket's drop, shelf underside → rod axis.
      hanger: { ...D.hardware.hanger, ...profile.hardware?.hanger },
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
      // TURN 40 (CLAUDE.md F5): the wall drawing's own metrics, key by key so a
      // profile saved before tonight comes back with every one of them rather
      // than with `undefined` millimetres — the same merge every block above
      // gets, for the same reason.
      wallDrawing: {
        ...D.drawings.wallDrawing, ...profile.drawings?.wallDrawing,
        titleRows: Array.isArray(profile.drawings?.wallDrawing?.titleRows)
          && profile.drawings.wallDrawing.titleRows.length
          ? profile.drawings.wallDrawing.titleRows
          : D.drawings.wallDrawing.titleRows,
      },
    },
    room: { ...D.room, ...profile.room },
    // Turn 31 (CLAUDE.md F6): key by key, so a profile saved before Check v1
    // comes back with every threshold rather than with `undefined` millimetres.
    checks: { ...D.checks, ...profile.checks },
    // Turn 31 (CLAUDE.md F4.4a): key by key, so a profile saved before the
    // appliance faces existed comes back with the published widths rather than
    // with an empty table and an invented number.
    appliances: {
      ...D.appliances,
      ...profile.appliances,
      faceWidth: { ...D.appliances.faceWidth, ...profile.appliances?.faceWidth },
    },
    ui: {
      ...D.ui,
      ...profile.ui,
      // Turn 19 (CLAUDE.md F3): the shell's placement numbers, key by key, so a
      // profile saved before the up-and-right offset existed comes back with
      // it rather than placing every modal at {0,0} — which is ON the click.
      modal: {
        ...D.ui.modal,
        ...profile.ui?.modal,
        anchorOffset: { ...D.ui.modal.anchorOffset, ...profile.ui?.modal?.anchorOffset },
      },
      // Turn 31 (CLAUDE.md F2): key by key, like every other nested block — a
      // profile saved before the message levels existed comes back with a grey
      // that expires rather than one that hangs on `undefined` milliseconds.
      messages: { ...D.ui.messages, ...profile.ui?.messages },
      // Turn 50 (CLAUDE.md F2): likewise — a profile saved before the share-out
      // existed comes back with the owner's 400 and 620 rather than with two
      // undefineds that would offer the bar over every gap in the app.
      shareOut: { ...D.ui.shareOut, ...profile.ui?.shareOut },
    },
    // Turn 16 (F3): `annotation` is merged key by key, like every other nested
    // block here — a workshop that has tuned ONE caption height keeps the app's
    // answer for the rest, and a profile saved before this turn gets all of it.
    cnc: {
      ...D.cnc,
      ...profile.cnc,
      annotation: { ...D.cnc.annotation, ...profile.cnc?.annotation },
      // Turn 31 (F6 #7): key by key, like every other nested block.
      sheet: { ...D.cnc.sheet, ...profile.cnc?.sheet },
      // Turn 35 (CLAUDE.md F15): the two family sheets, key by key like the
      // one above them — so a profile saved before this turn gains both, at
      // `null`, which is the fallback to `cnc.sheet` and therefore no change.
      sheetCarcass: { ...D.cnc.sheetCarcass, ...profile.cnc?.sheetCarcass },
      sheetFronts: { ...D.cnc.sheetFronts, ...profile.cnc?.sheetFronts },
      // …and the OPTION LIST is taken from the code, never from the store. The
      // FORM is the app's and the values are the workshop's (T35-F7's law): a
      // profile saved before a format joined the list must not be able to hide
      // that format from the panel that now offers it.
      sheetOptions: D.cnc.sheetOptions,
    },
    csv: { ...D.csv, ...profile.csv, codes: { ...D.csv.codes, ...profile.csv?.codes } },
    // Turn 32 (CLAUDE.md F5): key by key, like every other nested block.
    bom: { ...D.bom, ...profile.bom, sheet: { ...D.bom.sheet, ...profile.bom?.sheet } },
    // Turn 39 (F2): the workshop's own answers survive a migration key by key,
    // the same merge every nested block above gets. `defaults` and `legRules`
    // are WORKSHOP VALUES, not app shape, so unlike `sheetOptions` they are NOT
    // rebuilt from code — a shop that named its boards keeps them.
    materials: {
      ...D.materials,
      ...profile.materials,
      defaults: { ...D.materials.defaults, ...profile.materials?.defaults },
      legRules: Array.isArray(profile.materials?.legRules)
        ? profile.materials.legRules
        : D.materials.legRules,
      hingeRules: Array.isArray(profile.materials?.hingeRules)
        ? profile.materials.hingeRules
        : D.materials.hingeRules,
      hingePlateRules: Array.isArray(profile.materials?.hingePlateRules)
        ? profile.materials.hingePlateRules
        : D.materials.hingePlateRules,
      runnerRules: Array.isArray(profile.materials?.runnerRules)
        ? profile.materials.runnerRules
        : D.materials.runnerRules,
      ledRules: { ...D.materials.ledRules, ...profile.materials?.ledRules },
    },
    editor: {
      ...D.editor,
      ...profile.editor,
      // Turn 31 (CLAUDE.md F7): key by key, like every other nested block.
      hoverAura: { ...D.editor.hoverAura, ...profile.editor?.hoverAura },
      // Turn 20 (CLAUDE.md F6.2): key by key, like every other nested block —
      // a profile saved before the ruler had snaps comes back with all three
      // numbers rather than with a magnet of `undefined` pixels.
      ruler: { ...D.editor.ruler, ...profile.editor?.ruler },
      // Turn 24 (CLAUDE.md F2): the part editor's magnet and the drill's
      // conventions, merged key by key like every other nested block — a
      // profile saved before this turn comes back able to draw.
      partSnap: { ...D.editor.partSnap, ...profile.editor?.partSnap },
      drillDefaults: { ...D.editor.drillDefaults, ...profile.editor?.drillDefaults },
      explode: { ...D.editor.explode, ...profile.editor?.explode },
      history: { ...D.editor.history, ...profile.editor?.history },
    },
    dimensions: { ...D.dimensions, ...profile.dimensions },
  };
}

/**
 * A list the workshop may replace WHOLE: its own if it has one, ours otherwise.
 * Never merged entry by entry — a workshop that has deliberately deleted an
 * option must not have it grafted back on by an upgrade (the same rule the light
 * arrays follow, turn 10).
 */
function mergeList(defaults, stored) {
  return Array.isArray(stored) && stored.length ? stored : defaults;
}

/**
 * Where a hardware family's models live — always the APP's answer (turn 20,
 * CLAUDE.md F2.1/F2.2).
 *
 * Not a preference: no screen edits it, and the two values that shipped both
 * described a bucket the owner does not have. A stored profile that carried
 * one would go on producing `…/public/hardware/hardware/…` for ever, which is
 * the exact shape of the bug this turn is closing.
 */
function bucketLocation(defaults) {
  return { bucket: defaults.bucket, path: defaults.path, manifest: defaults.manifest };
}

/**
 * A rig's list of lights: the workshop's if it has one, ours otherwise
 * (turn 10, CLAUDE.md F1). Entries are normalised so a half-written spec — a
 * spot with no penumbra, a point with no colour — cannot reach three.js as
 * `undefined` and light nothing.
 */
function mergeLightArray(defaults, stored) {
  const list = Array.isArray(stored) ? stored : defaults;
  return list
    .filter((l) => l && Number.isFinite(Number(l.intensity)))
    .map((l) => ({ ...l, intensity: Number(l.intensity) }));
}

/**
 * Finishes a stored profile carries, plus every finish the app ships. A user's
 * own entry wins on its id; anything new arrives on top, so a project saved
 * before "light oak" existed still opens with light oak available.
 */
/**
 * A list of {id,...} records: the app's own, with a stored profile's overrides
 * merged onto them by id. An id the stored list has never heard of survives —
 * which is what lets a profile saved before turn 12 still see the drawer
 * variants that turn 12 added.
 */
function mergeById(defaults, stored) {
  if (!Array.isArray(stored) || !stored.length) return defaults.map((f) => ({ ...f }));
  const byId = new Map(defaults.map((f) => [f.id, { ...f }]));
  for (const f of stored) {
    if (!f?.id) continue;
    byId.set(f.id, { ...(byId.get(f.id) || {}), ...f });
  }
  return [...byId.values()];
}

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
