// ─── Cut-part groups and export presets ───
// Which parts of a unit belong together on a sheet, and the four selections
// Piotr asked for by name (CLAUDE.md turn 3, phase 8).
//
// One place decides what a "drawer part" is, so the checkbox list, the presets,
// the preview and the exported DXF can never disagree about it.
//
// Pure data + pure functions — no React, no store imports.

export const PART_GROUPS = [
  { id: 'carcass', label: 'Carcass', hint: 'Sides, top, bottom, back, plinth, infill' },
  { id: 'shelves', label: 'Shelves', hint: 'Shelves, partition, rail partition' },
  { id: 'drawers', label: 'Drawers', hint: 'Drawer boxes and drawer panels' },
  { id: 'fronts', label: 'Fronts & doors', hint: 'Doors and drawer fronts' },
];

export const PART_GROUP_IDS = PART_GROUPS.map((g) => g.id);

/**
 * Which group a cut part belongs to.
 *
 * Decided on the engine's own `part` and `role`, never on the id string: a
 * panel called "RAIL-PART" is a shelf, and "D1-SL" is a drawer part, and no
 * amount of substring matching would get both right.
 */
export function groupOfPanel(panel) {
  const part = panel?.part;
  const role = panel?.role;
  if (role === 'front') return 'fronts';
  if (role === 'drawer_box') return 'drawers';
  if (part === 'DP' || part === 'FILLER') return 'drawers';   // the drawer panel and its fillers
  if (role === 'shelf') return 'shelves';                     // SHELF, PARTITION, RAIL-PART, FIXED
  return 'carcass';                                           // sides, top/bottom, back, holders, spurs, plinth, infill
}

/**
 * The parts that can actually go on a sheet: the ones with a real outline.
 *
 * The checkbox list, the preview and the exported DXF all start from THIS —
 * a part the machine could not cut must not appear in the list as a tick the
 * export then silently drops.
 */
export function exportablePanels(panels = []) {
  return panels.filter((p) => p?.cnc && Array.isArray(p.cnc.outline) && p.cnc.outline.length >= 2);
}

/** Group → the parts of this unit in it, in cut-list order. */
export function groupPanels(panels) {
  const out = new Map(PART_GROUP_IDS.map((id) => [id, []]));
  for (const p of panels) out.get(groupOfPanel(p)).push(p);
  return out;
}

/**
 * The presets, by name. Each one answers "is this part in?" — so a preset is
 * evaluated against the real parts of the real unit and cannot go stale when
 * a type adds a part nobody thought of.
 */
export const EXPORT_PRESETS = [
  { id: 'all', label: 'All', includes: () => true },
  { id: 'carcass', label: 'Carcass only', includes: (p) => groupOfPanel(p) === 'carcass' },
  { id: 'no-drawers', label: 'All without drawers', includes: (p) => groupOfPanel(p) !== 'drawers' },
  { id: 'fronts', label: 'Fronts & doors only', includes: (p) => groupOfPanel(p) === 'fronts' },
];

export function presetById(id) {
  return EXPORT_PRESETS.find((p) => p.id === id) || null;
}

/** The panel ids a preset selects out of this unit. */
export function panelIdsForPreset(panels, presetId) {
  const preset = presetById(presetId);
  if (!preset) return panels.map((p) => p.id);
  return panels.filter((p) => preset.includes(p)).map((p) => p.id);
}

/**
 * Which preset a hand-made selection happens to be, or 'custom'.
 * The export file is named after this, so a file called "…-carcass.dxf"
 * really does contain the carcass and nothing else.
 */
export function presetOfSelection(panels, selectedIds) {
  const selected = new Set(selectedIds);
  for (const preset of EXPORT_PRESETS) {
    const ids = panels.filter((p) => preset.includes(p)).map((p) => p.id);
    if (ids.length !== selected.size) continue;
    if (ids.every((id) => selected.has(id))) return preset.id;
  }
  return 'custom';
}
