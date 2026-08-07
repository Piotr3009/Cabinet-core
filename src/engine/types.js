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

/**
 * carcass.top      — 'panel' (TOP + BOTTOM) | 'holders' (SINK: 2 rails on edge)
 * carcass.back     — 'full' | 'inset' (SINK) | 'rails' (FRIDGE)
 * drawerStyle      — null | 'wardrobe' (internal, behind doors) | 'budr' (fronts)
 * mount            — 'floor' | 'wall'
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
    supports: { drawers: true, shelves: true, rail: true, pulldown: false, partition: true, doors: true },
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
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true },
    available: true,
  },
  BUDR: {
    id: 'BUDR',
    heightGroup: 'base',
    label: 'Base unit — 3 drawers',
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
    supports: { drawers: true, shelves: false, rail: false, pulldown: false, partition: false, doors: false },
    // KIT_BUDR_FULL counts its 20 panels WITHOUT the drawer fronts (L863) and
    // lists the three fronts separately (L882-888) — the opposite of the
    // wardrobe kit, which folds drawer fronts into totalPanels.
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
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true },
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
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true },
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
    supports: { drawers: false, shelves: true, rail: true, pulldown: false, partition: false, doors: true },
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
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false, doors: true },
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
    supports: { drawers: false, shelves: false, rail: false, pulldown: false, partition: false, doors: true },
    available: true,
  },
};

/** Ordered list for the Library panel (UI never reads Object.keys of stored JSON). */
export const UNIT_TYPE_ORDER = ['WARDROBE', 'BUD', 'BUDR', 'WUD', 'BUDTALL', 'LOW_CABINET', 'SINK', 'FRIDGE'];

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
  { id: 'base', label: 'Base units', types: ['BUD', 'BUDR', 'SINK', 'LOW_CABINET'] },
  { id: 'wall', label: 'Wall units', types: ['WUD'] },
  { id: 'tall', label: 'Tall units', types: ['BUDTALL', 'FRIDGE', 'WARDROBE'] },
  // Turn 5 (BACKLOG #30): no longer a held-open place. Its contents are the
  // workshop's OWN saved units rather than kits, so it carries no `types` —
  // the panel reads them from the template store.
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
  WARDROBE: 'W', BUD: '', BUDR: 'DR', WUD: 'WU', BUDTALL: 'T', LOW_CABINET: 'LC', SINK: 'S', FRIDGE: 'F',
};
