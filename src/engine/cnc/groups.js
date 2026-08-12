// ─── Cut-part groups and export presets ───
// Which parts of a unit belong together on a sheet, and the four selections
// Piotr asked for by name (CLAUDE.md turn 3, phase 8).
//
// One place decides what a "drawer part" is, so the checkbox list, the presets,
// the preview and the exported DXF can never disagree about it.
//
// Pure data + pure functions — no React, no store imports.

// ─── FOUR GROUPS (turn 25, CLAUDE.md F7) ────────────────────────────────────
//
// The owner's list, in his order:
//
//   Carcasses               BUL, BUR, TOP, BOTTOM, BACK
//   Shelves                 shelves + VPART
//   Doors, fronts & panels
//   Infills & plinths
//
// Two things move and both are named. INFILL-* LEAVES the carcass group, where
// turn 3 put it because it was cut from board and nobody had asked: an infill
// is a finishing piece that stands in the room beside the doors, is sprayed
// with them, and belongs with the plinth. And the old DRAWERS group is gone —
// a drawer BOX is carcass board, cut and assembled exactly as a carcass is, and
// a joiner ticking "Carcasses" to fill a sheet with everything that is not a
// front wants the boxes on it. The drawer FRONTS were never in that group and
// are not now.
//
// The four cover every part the engine cuts, which is the property that makes
// the quick-select buttons add up to All.
export const PART_GROUPS = [
  {
    id: 'carcasses',
    label: 'Carcasses',
    hint: 'Sides, top, bottom, back — and the drawer boxes, which are the same board',
  },
  { id: 'shelves', label: 'Shelves', hint: 'Shelves and vertical partitions' },
  {
    id: 'fronts',
    label: 'Doors, fronts & panels',
    hint: 'Doors, drawer fronts, end panels and masking panels',
  },
  { id: 'infills', label: 'Infills & plinths', hint: 'Scribe fillers, top infill and the toe kick' },
];

export const PART_GROUP_IDS = PART_GROUPS.map((g) => g.id);

/**
 * The quick-select buttons, in the owner's order (turn 25, CLAUDE.md F7.2):
 * All · Carcasses · Shelves · Doors, fronts & panels · Infills & plinths.
 *
 * Each one ticks its WHOLE group. They are derived from `PART_GROUPS` rather
 * than typed out beside it, so a fifth group next turn is one entry and not two
 * that can disagree — which is the fault the old row had, where the buttons
 * were EXPORT PRESETS and the headers below them were groups, and the two
 * answered different questions with the same word.
 */
export const QUICK_SELECTS = [
  { id: 'all', label: 'All', hint: 'Every cut part of this cabinet', includes: () => true },
  ...PART_GROUPS.map((g) => ({
    id: g.id,
    label: g.label,
    hint: g.hint,
    includes: (p) => groupOfPanel(p) === g.id,
  })),
];

/** The panel ids one quick-select button ticks. */
export function panelIdsForQuickSelect(panels, id) {
  const entry = QUICK_SELECTS.find((q) => q.id === id);
  if (!entry) return [];
  return (panels || []).filter((p) => entry.includes(p)).map((p) => p.id);
}

/**
 * Which group a cut part belongs to.
 *
 * Decided on the engine's own `part` and `role`, never on the id string: a
 * panel called "RAIL-PART" is a shelf, and no amount of substring matching
 * would get that right — nor would it get "INFILL-T" right for the group it
 * moved to this turn, which is exactly the sort of thing that was matched by
 * name in a rewrite and quietly wrong.
 */
export function groupOfPanel(panel) {
  const role = panel?.role;
  // Everything that stands in the room beside the doors and is finished with
  // them: doors, drawer fronts, end panels, the wall unit's masking board.
  if (role === 'front' || role === 'end_panel' || role === 'mask') return 'fronts';
  if (role === 'infill' || role === 'plinth') return 'infills';
  if (role === 'shelf') return 'shelves';                     // SHELF, VPART, RAIL-PART, FIXED
  // …and everything else is board that lives inside a carcass: the sides, the
  // top and bottom, the back, the holders and spurs, the drawer panel and its
  // fillers, and every part of a drawer box.
  return 'carcasses';
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

/**
 * WHERE A PART SITS IN THE TREE (turn 19, CLAUDE.md F4).
 *
 * The owner asked for this in the turn-17 list and my transcription dropped it:
 * "kliknięcie 2 razy na dany element zabiera nas do listy po prawej, otwiera i
 * podświetla który to element."
 *
 * Double-clicking a part on the sheet is PURE NAVIGATION — nothing is edited,
 * nothing is ticked, nothing is rotated. What the right-hand tree needs in
 * order to obey is three facts, and this is the pure function that gives them,
 * so the tree can be driven from a test as well as from a pointer.
 *
 * @param {Array} panels   this unit's exportable parts
 * @param {string} panelId the part that was double-clicked
 * @returns {{panelId:string, group:string, index:number}|null}
 *   null where the part is not on this unit's sheet at all, which is an honest
 *   answer and not an error: a joiner may double-click a part of the unit
 *   beside the one the tree is scrolled to.
 */
export function treePathOfPanel(panels, panelId) {
  if (!panelId) return null;
  const panel = (panels || []).find((p) => p?.id === panelId);
  if (!panel) return null;
  const group = groupOfPanel(panel);
  const mine = (panels || []).filter((p) => groupOfPanel(p) === group);
  return { panelId: panel.id, group, index: mine.findIndex((p) => p.id === panel.id) };
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
    // ─── TURN 25 (CLAUDE.md F7.1): READ OFF THE ROLE, NOT OFF THE GROUP ────
    //
    // It was `groupOfPanel(p) === 'fronts'`, and this turn's regrouping widened
    // that group to "Doors, fronts & panels" — which would have put a wall
    // unit's masking board into a file called `…-cnc-fronts.dxf`. The PRESET
    // and the GROUP are two different questions that happen to share a word:
    // the preset names an export file and is a machine contract (rule 0), the
    // group is how the tree is laid out. So the preset asks the piece what it
    // IS, which is what it always meant and what it now cannot drift from.
    includes: (p) => p?.role === 'front',
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
