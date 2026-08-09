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
 * Is this part a finished surface? The engine stamps `finish_exposed` on every
 * panel from its role (engine/cabinet.js); this is the reader, with the same
 * answer for a panel that predates the flag — a project cached before turn 5
 * must not send its doors to the machine as "not sprayed".
 */
export function isExposed(panel) {
  if (typeof panel?.finish_exposed === 'boolean') return panel.finish_exposed;
  return EXPOSED_ROLES.has(panel?.role);
}

const EXPOSED_ROLES = new Set(['front', 'infill', 'plinth', 'end_panel']);

/**
 * The presets, by name. Each one answers "is this part in?" — so a preset is
 * evaluated against the real parts of the real unit and cannot go stale when
 * a type adds a part nobody thought of.
 *
 * Turn 5 (BACKLOG #35): "Carcass only" was a lie. It selected the carcass GROUP,
 * which put the plinth and the infills — pieces that get sprayed — on the same
 * sheet as the boxes, and left the shelves and the drawer boxes off it. What
 * the workshop actually wants to cut in one go is EVERYTHING THAT IS NOT
 * SPRAYED, which is the flag above and not a group at all: carcasses, shelves,
 * backs, partitions and rail partitions, drawer panels, fillers and drawer
 * boxes in; doors, drawer fronts, infills, plinth and end panels out.
 */
export const EXPORT_PRESETS = [
  { id: 'all', label: 'All', includes: () => true },
  {
    id: 'non-sprayed',
    label: 'Non-sprayed',
    hint: 'Everything the spray booth never sees — carcasses, shelves, backs, drawer boxes',
    includes: (p) => !isExposed(p),
  },
  {
    id: 'sprayed',
    label: 'Sprayed only',
    hint: 'The finished faces — fronts, infills, plinth, end panels',
    includes: (p) => isExposed(p),
  },
  {
    id: 'fronts',
    label: 'Fronts & doors only',
    hint: 'Doors and drawer fronts, nothing else',
    includes: (p) => groupOfPanel(p) === 'fronts',
  },
];

export function presetById(id) {
  return EXPORT_PRESETS.find((p) => p.id === id) || null;
}

/**
 * ─── Turn 16 (CLAUDE.md F2.1): THE SPRAYED/NON-SPRAYED TOGGLE GOES ──────────
 *
 * "Remove it from the CNC view. Sheets group by ASSIGNED MATERIAL only."
 *
 * It goes from the VIEW, and only from the view. The presets themselves stay
 * exactly where they are, because they are part of the EXPORT: `sheetDxfFileName`
 * names a file after the preset a selection happens to be, and
 * `presetOfSelection` is what reads it — so deleting them would change what the
 * machine's folder is called, which rule 0 forbids and
 * test/cnc-export-identity.test.js pins to the byte.
 *
 * What the sheet offers a joiner is now the two things that are true of a part:
 * the whole unit, and the fronts. Which BOARD a part comes off is the sheet's
 * own grouping and no longer a button.
 */
const VIEW_PRESET_IDS = new Set(['all', 'fronts']);

export const VIEW_PRESETS = EXPORT_PRESETS.filter((p) => VIEW_PRESET_IDS.has(p.id));

/** The panel ids a preset selects out of this unit. */
export function panelIdsForPreset(panels, presetId) {
  const preset = presetById(presetId);
  if (!preset) return panels.map((p) => p.id);
  return panels.filter((p) => preset.includes(p)).map((p) => p.id);
}

/**
 * Which preset a hand-made selection happens to be, or 'custom'.
 * The export file is named after this, so a file called "…-fronts.dxf" really
 * does contain the fronts and nothing else.
 *
 * Two presets can pick the same parts out of a particular unit — a wardrobe
 * with no plinth, no infill and no end panels has nothing sprayed except its
 * doors, so "Sprayed only" and "Fronts & doors only" are the same sheet. The
 * list runs widest to narrowest and the LAST match wins, so the file takes the
 * most specific true name it can: "fronts", not "sprayed".
 */
export function presetOfSelection(panels, selectedIds) {
  const selected = new Set(selectedIds);
  let match = 'custom';
  for (const preset of EXPORT_PRESETS) {
    const ids = panels.filter((p) => preset.includes(p)).map((p) => p.id);
    if (ids.length !== selected.size) continue;
    if (ids.every((id) => selected.has(id))) match = preset.id;
  }
  return match;
}
