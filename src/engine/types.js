// ─── Unit type configuration ───
// The AutoLISP kits are ~86% identical code; the differences are legs, hangers,
// doorExtend, what closes the back and what lives inside. So Cabinet Core runs
// ONE parametric engine plus these small per-type configs (SPEC section 3).
//
// Every field below is a DIFF against the shared core, traced from the kit it
// names. Nothing here is behaviour — cabinet.js reads these flags, so adding a
// type is a config entry plus (at most) one small builder, never a second copy
// of the carcass maths.
//
// Pure data — no React, no store imports.

import { KITCHEN_LIBRARY, libraryTypeIds } from './library.js';

/**
 * carcass.top      — 'panel' (TOP + BOTTOM) | 'holders' (SINK: 2 rails on edge)
 *                    | 'ovenRails' (OVEN_BASE: a rail at the back on edge and
 *                      one at the front lying FLAT, turn 18 F5.2)
 *                    | 'rail' (DW_PANEL, turn 28 F1: ONE plain board across the
 *                      opening, at the unit's own width — see below)
 * carcass.back     — 'full' | 'inset' (SINK) | 'rails' (FRIDGE) | 'none'
 * carcass.sides    — 'panel' (default, when the key is absent) | 'none'
 * carcass.bottom   — 'panel' (default, when the key is absent) | 'none'
 *
 * ─── TURN 28 (CLAUDE.md F1): SIDES AND A BOTTOM ARE QUESTIONS TOO ──────────
 *
 * `top` and `back` have been answers-per-kit since turn 3; `sides` and `bottom`
 * were assumed. They were assumed because every kit written before the D/W has
 * them — and turn 27 read that assumption as a law and cut a carcass around a
 * dishwasher. They are keys now, absent everywhere but on the one kit that
 * genuinely has neither, which is what "podciągnięte pod logikę szafki" asks
 * for: the D/W says what it is made of in the same words every other kit uses,
 * rather than being remembered by the engine.
 * drawerStyle      — null | 'wardrobe' (internal, behind doors) | 'budr' (fronts)
 * mount            — 'floor' | 'wall'
 *
 * supports.topInfill (turn 8, CLAUDE.md F2.7) — is there anything ABOVE this
 * kit for an infill to close against? For a base unit, no: what goes on top of
 * it is a WORKTOP, not two metres of air, and offering to fill the gap to the
 * ceiling over a base cabinet is offering to build a wall out of 18 mm board.
 * A wall unit, a tall unit, a fridge housing and a wardrobe all finish somewhere
 * below the ceiling, and that gap is exactly what the piece is for.
 */
export const UNIT_TYPES = {
  WARDROBE: {
    id: 'WARDROBE',
    // Height group (turn 5, BACKLOG #29): which PROJECT height a new one of
    // these inherits. null = this kit's height is its identity and is left alone.
    heightGroup: 'tall',
    label: 'Wardrobe',
    family: 'wardrobe',
    lisp: 'KIT_WARDROBE_FULL.lsp',
    hingeRule: 'tall',
    cupRule: 'hingeCentres',      // KIT_WARDROBE_FULL passes hinge centres straight to the door
    legs: true,
    legSource: 'wardrobe',        // profile.wardrobe.legHeight
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: 'wardrobe',
    minHeightKey: 'wardrobe.minHeight',
    defaultsKey: 'wardrobe.defaults',
    supports: {
      drawers: true, shelves: true, rail: true, pulldown: false, partition: true, doors: true, topInfill: true,
      // Turn 22 (CLAUDE.md F1.1): the cornice is offered on wardrobes and tall
      // units — the kits that finish below the ceiling with a face somebody
      // looks up at. A base unit has a worktop on it and a wall unit has the
      // owner's own answer still to come.
      cornice: true,
    },
    available: true,
  },
  BUD: {
    id: 'BUD',
    heightGroup: 'base',
    label: 'Base unit',
    family: 'kitchen',
    lisp: 'KIT_BUD_FULL.lsp',
    hingeRule: 'base',
    cupRule: 'baseOffsets',       // KIT_BUD_FULL measures cups on the front panel
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: null,
    minHeightKey: null,
    defaultsKey: 'baseUnit.defaults',
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true, topInfill: false },
    available: true,
  },
  BUDR: {
    id: 'BUDR',
    heightGroup: 'base',
    label: 'Drawer unit — 3 drawers',
    // Which split its fronts are cut to (turn 12, CLAUDE.md F3.2). The ratio
    // itself lives in profile.baseDrawerUnit.variants — rule 2.
    drawerVariant: 'x3',
    family: 'kitchen',
    lisp: 'KIT_BUDR_FULL.lsp',
    // No doors at all: the three fronts ARE the face of the unit.
    hingeRule: 'base',
    cupRule: 'baseOffsets',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: 'budr',
    minHeightKey: null,
    defaultsKey: 'baseDrawerUnit.defaults',
    supports: { drawers: true, shelves: false, rail: false, pulldown: false, partition: false, doors: false, topInfill: false },
    // KIT_BUDR_FULL counts its 20 panels WITHOUT the drawer fronts (L863) and
    // lists the three fronts separately (L882-888) — the opposite of the
    // wardrobe kit, which folds drawer fronts into totalPanels.
    countsDrawerFrontsInPanels: false,
    available: true,
  },
  // ─── The drawer-unit variants (turn 12, CLAUDE.md F3.2) ─────────────────
  // KIT_BUDR_FULL with a different front split and nothing else. Every number
  // the kit uses is written per FRONT — the box side ratio, the runner rows,
  // the screw positions, the front width — so two fronts and four fronts run
  // through the same arithmetic three did. The ratio is the only difference,
  // and it lives in profile.baseDrawerUnit.variants.
  BUDR2: {
    id: 'BUDR2',
    heightGroup: 'base',
    label: 'Drawer unit — 2 drawers',
    // Which split its fronts are cut to (turn 12, CLAUDE.md F3.2). The ratio
    // itself lives in profile.baseDrawerUnit.variants — rule 2.
    drawerVariant: 'x2',
    family: 'kitchen',
    lisp: 'KIT_BUDR_FULL.lsp',
    // No doors at all: the fronts ARE the face of the unit.
    hingeRule: 'base',
    cupRule: 'baseOffsets',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: 'budr',
    minHeightKey: null,
    defaultsKey: 'baseDrawerUnit.defaults',
    supports: { drawers: true, shelves: false, rail: false, pulldown: false, partition: false, doors: false, topInfill: false },
    // KIT_BUDR_FULL counts its carcass panels WITHOUT the drawer fronts (L863)
    // and lists the fronts separately (L882-888) — the opposite of the wardrobe
    // kit, which folds drawer fronts into totalPanels.
    countsDrawerFrontsInPanels: false,
    available: true,
  },
  BUDR4: {
    id: 'BUDR4',
    heightGroup: 'base',
    label: 'Drawer unit — 4 drawers',
    // Which split its fronts are cut to (turn 12, CLAUDE.md F3.2). The ratio
    // itself lives in profile.baseDrawerUnit.variants — rule 2.
    drawerVariant: 'x4',
    family: 'kitchen',
    lisp: 'KIT_BUDR_FULL.lsp',
    // No doors at all: the fronts ARE the face of the unit.
    hingeRule: 'base',
    cupRule: 'baseOffsets',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: 'budr',
    minHeightKey: null,
    defaultsKey: 'baseDrawerUnit.defaults',
    supports: { drawers: true, shelves: false, rail: false, pulldown: false, partition: false, doors: false, topInfill: false },
    // KIT_BUDR_FULL counts its carcass panels WITHOUT the drawer fronts (L863)
    // and lists the fronts separately (L882-888) — the opposite of the wardrobe
    // kit, which folds drawer fronts into totalPanels.
    countsDrawerFrontsInPanels: false,
    available: true,
  },
  WUD: {
    id: 'WUD',
    heightGroup: 'wall',
    label: 'Wall unit',
    family: 'kitchen',
    lisp: 'KIT_WUD_FULL.lsp',
    hingeRule: 'base',
    cupRule: 'baseOffsets',
    legs: false,                  // hangs on the wall
    legSource: null,
    hangers: true,
    doorExtend: true,             // optional +38 mm below the carcass
    mount: 'wall',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: null,
    minHeightKey: null,
    defaultsKey: 'wallUnit.defaults',
    supports: {
      drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true, topInfill: true,
      // ─── TURN 26 (CLAUDE.md F9.2): A WALL UNIT JOINS THE RUN ─────────────
      // "A cornice run continues across ANY adjacent cornice-bearing unit
      // whose top edges meet — tall and wall alike, not just floor-standing."
      // Turn 22 offered the moulding on wardrobes and tall units because those
      // are what stand up to the ceiling; a run of wall units finishes at the
      // same height and takes the same moulding, and leaving it off was the
      // app deciding a joinery question by unit type.
      cornice: true,
    },
    available: true,
  },
  BUDTALL: {
    id: 'BUDTALL',
    heightGroup: 'tall',
    label: 'Tall unit',
    family: 'kitchen',
    lisp: 'KIT_BUDTALL_FULL.lsp',
    hingeRule: 'tall',
    cupRule: 'hingeCentres',      // hingeCupList = hingePositions (L211)
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: null,
    minHeightKey: 'tallUnit.minHeight',
    defaultsKey: 'tallUnit.defaults',
    supports: {
      drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true, topInfill: true,
      cornice: true,
    },
    available: true,
  },
  // ─── TURN 30 (CLAUDE.md F13): CARGO 300, THE PULL-OUT LARDER ──────────────
  //
  // "Parent geometry: KIT_BUDTALL. Proposed width 300. Carcass + full door per
  // the kit; the pull-out frame is HARDWARE (BOM + GLB slot when the owner
  // uploads one), no invented runners drilling — the mechanism mounts to floor
  // and top per manufacturer, which is not this repo's truth yet."
  //
  // Every field below is BUDTALL's, because that is what "parent geometry"
  // means: the carcass, the door, the hinge ladder and every hole in them are
  // KIT_BUDTALL_FULL's own, and the test asserts that hole for hole against a
  // tall unit of the same size. What is different is the WIDTH it arrives at,
  // that it holds no shelves — the frame is what fills it — and the frame in
  // the BOM.
  //
  // `hardwareKit` is the library rule in one field: a bought mechanism gets a
  // LINE TO ORDER and nothing else. No hole, no runner row, no invented model.
  CARGO: {
    id: 'CARGO',
    heightGroup: 'tall',
    label: 'Cargo 300',
    family: 'kitchen',
    lisp: 'KIT_BUDTALL_FULL.lsp',
    hingeRule: 'tall',
    cupRule: 'hingeCentres',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: null,
    minHeightKey: 'cargoUnit.minHeight',
    defaultsKey: 'cargoUnit.defaults',
    hardwareKit: {
      role: 'cargo_frame',
      label: 'Pull-out larder frame',
      // What a joiner orders it BY. The mechanism mounts to the floor and the
      // top of the carcass per the manufacturer's own instructions, so what
      // this repo can honestly say is the opening it has to fit.
      by: 'opening',
    },
    supports: {
      drawers: false, shelves: false, rail: false, pulldown: false, partition: false, doors: true, topInfill: true,
      cornice: true,
    },
    available: true,
  },
  // ─── TURN 30 (CLAUDE.md F14): THE PANTRY, WITH BLUM DRAWERS ("koniecznie") ─
  //
  // "Parent: KIT_BUDTALL + the existing drawer machinery (KIT_LOW/KIT_SINK
  // rows, MOVENTO catalogue). Internal drawers behind doors: existing drawer
  // boxes and runner drilling, front omitted (see F20's mechanism — build it
  // once, use it in both)."
  //
  // So it is BUDTALL's carcass and door, wearing `drawerStyle: 'wardrobe'` —
  // the INTERNAL drawer machinery this engine has had since turn 3: the drawer
  // panels the runners screw to, the MOVENTO rows on `RUNNERS_3MM`, the box
  // sides, backs and bottoms, and the sync rod. Not one of those numbers is
  // touched here; a pantry's drawer holes are the same holes a wardrobe of the
  // same size is drilled with, which is what the test asserts.
  //
  // `internalDrawers: 'all'` is F20's mechanism, declared once on the kit: a
  // pantry's drawers live BEHIND ITS DOORS and never had faces.
  PANTRY: {
    id: 'PANTRY',
    heightGroup: 'tall',
    label: 'Pantry',
    family: 'kitchen',
    lisp: 'KIT_BUDTALL_FULL.lsp',
    hingeRule: 'tall',
    cupRule: 'hingeCentres',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: 'wardrobe',
    internalDrawers: 'all',
    minHeightKey: 'pantryUnit.minHeight',
    defaultsKey: 'pantryUnit.defaults',
    supports: {
      drawers: true, shelves: true, rail: false, pulldown: false, partition: true, doors: true, topInfill: true,
      cornice: true,
    },
    available: true,
  },
  LOW_CABINET: {
    id: 'LOW_CABINET',
    // A low cabinet that inherits the 720 mm base height is a base unit with
    // another name; its whole point is to be lower, so it keeps its own.
    heightGroup: null,
    label: 'Low cabinet',
    family: 'kitchen',
    lisp: 'KIT_LOW_CABINET_FULL.lsp',
    hingeRule: 'low',
    cupRule: 'hingeCentres',      // hingeCupList = hingePositions (L377)
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'full' },
    drawerStyle: null,
    minHeightKey: 'lowCabinet.minHeight',
    defaultsKey: 'lowCabinet.defaults',
    supports: { drawers: false, shelves: true, rail: true, pulldown: false, partition: false, doors: true, topInfill: false },
    // The LISP counts the rail partition in PANELS for this kit (L464-465),
    // unlike the wardrobe — recorded so the totals stay honest per type.
    countsRailPartInPanels: true,
    available: true,
  },
  SINK: {
    id: 'SINK',
    heightGroup: 'base',
    label: 'Sink base',
    family: 'kitchen',
    lisp: 'KIT_SINK.lsp',
    hingeRule: 'sink',            // [100, H−300, H−150] — top hinge 50 lower
    cupRule: 'sinkOffsets',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'holders', back: 'inset' },
    drawerStyle: null,
    minHeightKey: null,
    defaultsKey: 'sinkUnit.defaults',
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true, topInfill: false },
    available: true,
  },
  // ─── D/W UNIT (turn 17 F9; turn 27, CLAUDE.md F2) ───────────────────────
  //
  // The owner: *"dlaczego zmywarki nie traktujesz jak szafki?"* He is right,
  // and the record proves it — the legs ignored the run (turn 22), the front
  // sat 3 mm high (turn 26), no shaker, no handle, no plinth, and it opened
  // the wrong way. That is not six faults; it is ONE fault six times, and the
  // cause was `dwPanel`: a parallel path that had to be remembered every time
  // anything was added.
  //
  // So it is an ORDINARY unit with two properties — `interiorOccupied` and
  // `frontOpens` — and everything else about it is the run's own law. The same
  // kit answers for a washing machine and for an under-counter fridge, which
  // is why it is called what he calls it rather than after one of the three.
  DW_PANEL: {
    id: 'DW_PANEL',
    heightGroup: 'base',
    label: 'D/W panel',
    family: 'kitchen',
    lisp: null,
    appliance: 'dw',
    hingeRule: 'base',
    cupRule: 'baseOffsets',
    // NO LEGS. "nie ma nóg w ogóle, bo tam gdzie są nogi, tam jest D/W" — the
    // appliance occupies the floor this unit would otherwise stand on, and a
    // leg drawn there is a leg the joiner would try to fit. It still STANDS on
    // the run's own leg height: turn 22's F4 reads `plinth`, not `legs`.
    legs: false,
    legSource: null,
    // No legs, but the TOE KICK still runs past the machine — notched for it.
    plinth: true,
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    // ─── TURN 28 (CLAUDE.md F1): A FRONT, A RAIL AND A PLINTH ─────────────
    //
    // The owner, verbatim: *"nie ma całego korpusu oprócz górnego panela,
    // który ma 600 mm bez żadnych dog bonów — tak jak było, tylko chciałem
    // żeby to było podciągnięte pod logikę szafki."*
    //
    // Turn 27 read "an ordinary unit" as "a carcass" and cut BUL, BUR, TOP,
    // BOTTOM and BACK around a machine. There is no box: a dishwasher stands
    // on the floor between two carcasses and the only board above it is the
    // rail that ties them together and carries the worktop. So the kit DECLARES
    // what it is made of, in the same three keys every other kit answers, and
    // the engine reads the declaration rather than remembering the kit.
    //
    //   top: 'rail'    ONE plain board, the unit's own width by the run's own
    //                  internal depth — the piece turn 26 cut (bd7cec4): zero
    //                  pockets, zero holes, no dog bones, no sockets, no screw
    //                  rows. Nothing joins to it, because there is nothing for
    //                  it to join to.
    //   sides: 'none'  the neighbours' sides are the sides of the opening.
    //   bottom:'none'  the machine stands on the floor.
    //   back: 'none'   and there is nothing behind it to close.
    //
    // This is what CLOSES BLOCKERS #94 (which board does the D/W's bottom
    // socket land in?): there is no carcass, so there is no bottom to argue
    // about.
    carcass: {
      top: 'rail', sides: 'none', bottom: 'none', back: 'none',
    },
    // ─── THE FIRST OF THE TWO PROPERTIES (F2.1) ──────────────────────────
    // Nothing goes inside it, because what goes inside it is a dishwasher. It
    // is a fact about the CARCASS and not a list of controls to hide: no
    // shelves, no rail, no drawers, no back furniture.
    interiorOccupied: true,
    // ─── …AND THE SECOND ─────────────────────────────────────────────────
    // Its front falls FORWARD about its BOTTOM edge, to 45° — the owner's
    // number, "enough to read" — and it answers "Open all" with every other
    // front. It is screwed to the appliance's own door, so it carries no cup
    // hinges and no cup drilling (F2.3; R9 and R10 agree).
    frontOpens: 'drop',
    frontOpenAngleDeg: 45,
    // ─── THE MEASURED NUMBERS (F2.5) ─────────────────────────────────────
    // "594 IS THE WIDTH, RIGID. Not a default and not a maximum: the value."
    // Over 600 and the appliance door cannot swing past its neighbours, and
    // the app must not be the thing that let that happen. The HEIGHT is not
    // fixed at all: this front stands in a run of base fronts and lines up
    // with them, so it is `H − gap` like every one of them.
    //
    // These lived in `profile.dwPanel` while there was a parallel path to read
    // them. The path is gone; the numbers are properties of the TYPE, which is
    // what they always were.
    frontWidth: 594,
    // "The plinth is cut out at that position, 20 mm from the top" — the toe
    // kick that runs past this unit is relieved so the appliance door can drop
    // (F2.4: the run's plinth passing through, as turn 26 shipped it).
    plinthCutFromTop: 20,
    drawerStyle: null,
    minHeightKey: null,
    defaultsKey: 'dwPanel.defaults',
    // ─── TURN 29 (CLAUDE.md F3): THE FRONT JOINS THE STANDARD CONTROLS ────
    //
    // The owner: *"front i plinth powinien być tak samo włączany jak cała
    // reszta szafek, tymi samymi przyciskami."* Turn 28 hard-wired both — the
    // face was emitted whenever the kit was a D/W and the plinth toggle was
    // hidden because the kit has no legs — so the two pieces a joiner is most
    // likely to want off were the two he could not switch.
    //
    // `doors: true` is not a claim that the face is a DOOR. It is the answer
    // to "does this kit have a front you add and remove", which is the
    // question the control asks, and it is yes. What the face IS stays where
    // it was: `frontOpens` emits it, `meta.appliance` keeps the cups out of
    // it, and `leafCount` below does not count it as a leaf to hang hinges on.
    supports: {
      drawers: false, shelves: false, rail: false, pulldown: false, partition: false, doors: true, topInfill: false,
    },
    available: true,
  },
  // ─── OVEN BASE UNIT (turn 17, CLAUDE.md F10) ────────────────────────────
  // A base carcass with the oven's shelf 598 mm from the TOP and one drawer
  // under it. Its back is the fridge's own back-rail pattern (turn 14): four
  // dog bones, one into each side and two into the bottom of the cabinet.
  OVEN_BASE: {
    id: 'OVEN_BASE',
    // It is a BASE unit and it stands in a run of them, so it takes the
    // project's base height like the rest (owner, turn 17 review: "szafka
    // zamiast standardowych jak wszystkie 770 ma 870, nie wiem dlaczego").
    // Turn 17 shipped it off the group with a made-up 870 — declared in
    // BLOCKERS #71, and now answered: the worktop decides, not the appliance.
    heightGroup: 'base',
    label: 'Oven base unit',
    family: 'kitchen',
    lisp: null,
    appliance: 'oven',
    hingeRule: 'base',
    cupRule: 'baseOffsets',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    // ─── Turn 18 (CLAUDE.md F5.2): A RAIL TOP, NOT A TOP PANEL ─────────────
    // The owner's review: an oven wants air out of the top of its housing, and
    // a full TOP panel across it is a lid. So the kit takes the SINK's own
    // two-holder answer — a rail at the back and a rail at the front, with the
    // opening between them — with one change: the FRONT rail lies FLAT.
    carcass: { top: 'ovenRails', back: 'oven' },
    drawerStyle: 'budr',
    drawerRatioKey: 'ovenUnit.drawerRatio',
    minHeightKey: null,
    defaultsKey: 'ovenUnit.defaults',
    supports: {
      drawers: true, shelves: false, rail: false, pulldown: false, partition: false, doors: false, topInfill: false,
    },
    countsDrawerFrontsInPanels: false,
    available: true,
  },
  FRIDGE: {
    id: 'FRIDGE',
    heightGroup: 'tall',
    label: 'Fridge housing',
    family: 'kitchen',
    lisp: 'KIT_FRIDGE.lsp',
    hingeRule: 'tall',
    cupRule: 'hingeCentres',
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    carcass: { top: 'panel', back: 'rails' },
    drawerStyle: null,
    minHeightKey: 'fridgeUnit.minHeight',
    defaultsKey: 'fridgeUnit.defaults',
    // The fridge fills the lower zone: no shelves, no drawers, no rail.
    supports: {
      drawers: false, shelves: false, rail: false, pulldown: false, partition: false, doors: true, topInfill: true,
      cornice: true,
    },
    available: true,
  },
};

/** Ordered list for the Library panel (UI never reads Object.keys of stored JSON). */
export const UNIT_TYPE_ORDER = ['WARDROBE', 'BUD', 'BUDR2', 'BUDR', 'BUDR4', 'WUD', 'BUDTALL', 'CARGO', 'PANTRY', 'LOW_CABINET', 'SINK', 'DW_PANEL', 'OVEN_BASE', 'FRIDGE'];

/**
 * How the Library is grouped (turn 4, BACKLOG #9): the menu offers a CATEGORY
 * and the category opens one panel with just those types in it — no categories
 * nested inside a single long list.
 *
 * `soon: true` is a place already held in the menu for work that is not done:
 * saved sets and media walls. Every type must belong to exactly one category,
 * which test/library-categories.test.js enforces — a new kit that nobody can
 * reach from the menu is a kit nobody can insert.
 */
export const UNIT_CATEGORIES = [
  // ─── Turn 12 (CLAUDE.md F3): ONE Kitchen list, in the owner's order ───
  // Base, wall and tall units were three menus, which meant that placing a run
  // of kitchen furniture meant opening three of them. Piotr wrote the order he
  // wants them in and it is one list: engine/library.js holds it, and this
  // category carries it. `types` is derived from the same data so that
  // `categoryOf` and everything else that has asked "which category is this
  // kit in" since turn 4 keeps working.
  {
    id: 'kitchen', label: 'Kitchen', entries: KITCHEN_LIBRARY, types: libraryTypeIds(),
  },
  // ─── …and the categories beyond Kitchen stay as they were ───
  // CLAUDE.md F3.7 is explicit — "rework is a separate, still-to-be-discussed
  // item — do not touch". The wardrobe is not a kitchen kit and keeps its own
  // place; saved sets and media walls are untouched.
  { id: 'wardrobe', label: 'Wardrobes', types: ['WARDROBE'] },
  // Turn 5 (BACKLOG #30): its contents are the workshop's OWN saved units
  // rather than kits, so it carries no `types` — the panel reads them from the
  // template store.
  { id: 'sets', label: 'Saved sets', types: [], saved: true },
  { id: 'media', label: 'Media walls', types: [], soon: true },
];

export function getCategory(id) {
  return UNIT_CATEGORIES.find((c) => c.id === id) || null;
}

/** Which category a type is filed under, or null. */
export function categoryOf(typeId) {
  return UNIT_CATEGORIES.find((c) => c.types.includes(typeId)) || null;
}

/**
 * Which PROJECT height a type inherits (turn 5, BACKLOG #29), or null when the
 * type's own height is the point of it.
 */
export const HEIGHT_GROUPS = [
  { id: 'base', label: 'Base height', hint: 'Base, drawer and sink units' },
  { id: 'wall', label: 'Wall unit height', hint: 'Wall units' },
  { id: 'tall', label: 'Tall height', hint: 'Tall, fridge housing and wardrobe' },
];

export function heightGroupOf(typeId) {
  return getUnitType(typeId).heightGroup ?? null;
}

export function getUnitType(typeId) {
  return UNIT_TYPES[typeId] || UNIT_TYPES.WARDROBE;
}

/** Resolve a dotted key ("wardrobe.defaults") against the profile. */
export function profilePath(profile, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), profile);
}

/** Factory defaults for a new unit of this type. */
export function defaultParamsFor(typeId, profile) {
  const type = getUnitType(typeId);
  const d = profilePath(profile, type.defaultsKey) || {};
  return {
    type: type.id,
    width: d.width ?? 600,
    height: d.height ?? 770,
    depth: d.depth ?? 558,
    board_t: profile.board.thickness,
    front_t: profile.front.thickness,
    front_type: profile.front.defaultType,
    shelves: 0,
    // BUDR is a three-drawer unit by definition (LISP has no count question).
    drawers: type.drawerStyle === 'budr' ? profile.baseDrawerUnit.ratio.length : 0,
    rail: false,
    rail_offset: d.railOffset ?? null,
    hinge: profile.doors.defaultHinge,
    // null = derive from the width threshold. A kit whose face is the
    // APPLIANCE's own front rather than a door arrives with it FITTED (turn
    // 29, CLAUDE.md F3): it is one of the three pieces the kit is, exactly as
    // its toe kick is, so the decision arrives already made and the joiner
    // unticks it if he disagrees. Everywhere else doors are the LAST step
    // (SPEC 4.10) and this line is what it always was.
    doors: type.frontOpens ? true : null,
    // ─── TURN 28 (CLAUDE.md F1): THE PLINTH IS ON BY DEFAULT — ON THIS KIT ──
    //
    // The owner: *"najważniejszego czyli plinth i tak nie ma"* — the piece he
    // cares about most was the one a bare D/W still arrived without. A plinth
    // is a DECISION everywhere else (turn 4, BACKLOG #16: no ghost rows in the
    // cut list) and that stays true; but a D/W panel is three pieces, and the
    // toe kick notched for the appliance door is one of the three. A kit that
    // declares `plinth: true` is a kit whose toe kick IS the kit, so the
    // decision arrives already made and the joiner unticks it if he disagrees.
    //
    // Spread rather than a constant, so that every type written before this
    // line carries no `plinth` key at all and behaves exactly as it did.
    ...(type.plinth ? { plinth: true } : {}),
    ...(type.mount === 'wall' ? { mount_height: d.mountHeight ?? 1500 } : {}),
    ...(type.doorExtend ? { door_extend: false } : {}),
    ...(type.id === 'FRIDGE' ? { fridge_h: profile.fridgeUnit.defaults.fridgeH } : {}),
    unit_num: '01',
  };
}

/** Unit-number prefix per type, so a project reads like the LISP unit numbers. */
export const UNIT_NUM_PREFIX = {
  WARDROBE: 'W', BUD: '', BUDR: 'DR', BUDR2: 'DR', BUDR4: 'DR', WUD: 'WU', BUDTALL: 'T', CARGO: 'CG', PANTRY: 'PY', LOW_CABINET: 'LC', SINK: 'S', DW_PANEL: 'DW', OVEN_BASE: 'OV', FRIDGE: 'F',
};
