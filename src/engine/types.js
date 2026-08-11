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
 * carcass.back     — 'full' | 'inset' (SINK) | 'rails' (FRIDGE)
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
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true, topInfill: true },
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
  // ─── D/W PANEL (turn 17, CLAUDE.md F9) ──────────────────────────────────
  // "It is a front and nothing else." So it is: `appliance: 'dw'` switches the
  // carcass off — no sides, no bottom, no back — and what is left is the front
  // and the one top panel the owner named. The same kit answers for a washing
  // machine and for an under-counter fridge, which is why it is called what he
  // calls it rather than after one of the three.
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
    // leg drawn there is a leg the joiner would try to fit.
    legs: false,
    legSource: null,
    // No legs, but the TOE KICK still runs past the machine — notched for it.
    plinth: true,
    hangers: false,
    doorExtend: false,
    mount: 'floor',
    // The TOP is the owner's one panel; there is no back and there are no sides.
    carcass: { top: 'panel', back: 'none', sides: 'none' },
    drawerStyle: null,
    minHeightKey: null,
    defaultsKey: 'dwPanel.defaults',
    // No hinges, flat, no door furniture — and nothing goes inside it, because
    // what goes inside it is a dishwasher.
    supports: {
      drawers: false, shelves: false, rail: false, pulldown: false, partition: false, doors: false, topInfill: false,
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
export const UNIT_TYPE_ORDER = ['WARDROBE', 'BUD', 'BUDR2', 'BUDR', 'BUDR4', 'WUD', 'BUDTALL', 'LOW_CABINET', 'SINK', 'DW_PANEL', 'OVEN_BASE', 'FRIDGE'];

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
    doors: null,          // null = derive from the width threshold
    ...(type.mount === 'wall' ? { mount_height: d.mountHeight ?? 1500 } : {}),
    ...(type.doorExtend ? { door_extend: false } : {}),
    ...(type.id === 'FRIDGE' ? { fridge_h: profile.fridgeUnit.defaults.fridgeH } : {}),
    unit_num: '01',
  };
}

/** Unit-number prefix per type, so a project reads like the LISP unit numbers. */
export const UNIT_NUM_PREFIX = {
  WARDROBE: 'W', BUD: '', BUDR: 'DR', BUDR2: 'DR', BUDR4: 'DR', WUD: 'WU', BUDTALL: 'T', LOW_CABINET: 'LC', SINK: 'S', DW_PANEL: 'DW', OVEN_BASE: 'OV', FRIDGE: 'F',
};
