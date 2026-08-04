// ─── Unit type configuration ───
// The 11 AutoLISP kits are ~86% identical code; the differences are legs,
// hangers, doorExtend, interior fittings. So Cabinet Core runs ONE parametric
// engine plus these small per-type configs (SPEC section 3).
//
// Pure data — no React, no store imports.

export const UNIT_TYPES = {
  WARDROBE: {
    id: 'WARDROBE',
    label: 'Wardrobe',
    family: 'wardrobe',
    hingeRule: 'tall',
    cupRule: 'hingeCentres',      // KIT_WARDROBE_FULL passes hinge centres straight to the door
    legs: true,
    legSource: 'wardrobe',        // profile.wardrobe.legHeight
    hangers: false,
    minHeightKey: 'wardrobe.minHeight',
    defaultsKey: 'wardrobe.defaults',
    supports: { drawers: true, shelves: true, rail: true, pulldown: false, partition: true },
    available: true,
  },
  BUD: {
    id: 'BUD',
    label: 'Base unit',
    family: 'kitchen',
    hingeRule: 'base',
    cupRule: 'baseOffsets',       // KIT_BUD_FULL measures cups on the front panel
    legs: true,
    legSource: 'baseUnit',
    hangers: false,
    minHeightKey: null,
    defaultsKey: 'baseUnit.defaults',
    supports: { drawers: false, shelves: true, rail: false, pulldown: false, partition: false },
    available: true,
  },
};

/** Ordered list for the Library panel (UI never reads Object.keys of stored JSON). */
export const UNIT_TYPE_ORDER = ['WARDROBE', 'BUD'];

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
    drawers: 0,
    rail: false,
    rail_offset: d.railOffset ?? null,
    hinge: profile.doors.defaultHinge,
    doors: null,          // null = derive from the width threshold
    unit_num: '01',
  };
}
