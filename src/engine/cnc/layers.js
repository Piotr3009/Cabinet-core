// ─── CNC layer table ───
// ONE place that knows what a CNC layer is called, what colour AutoCAD gives it
// and what colour the on-screen CNC view paints it.
//
// The NAMES are a hard contract: VCarve on Piotr's machine recognises the tool
// mapping by layer name, and the names come straight from
// reference/lisp/SKYLON_COMMON.lsp → createCNCLayers. Renaming one here breaks
// a real machine, so they are never "tidied up".
//
// `aci` is the AutoCAD Color Index the LISP assigns (createCNCLayers), written
// into the DXF layer table unchanged. `screen` is a separate, deliberately
// DISTINCT colour for the app's CNC preview: the LISP reuses ACI 5 for both
// HINGES_5MM and RUNNERS_3MM, which is fine in AutoCAD (you toggle layers) but
// useless in a read-only preview where the whole point is telling them apart.
//
// Pure data — no React, no store imports (engine rule).

/** kind: how the layer is drawn — 'outline' | 'pocket' | 'hole' | 'mark' | 'text'. */
export const CNC_LAYERS = [
  { name: 'OUTLINE',            aci: 7,  screen: '#f0ece4', label: 'Outline',        kind: 'outline' },
  { name: 'PUZZLE_SOCKET',      aci: 1,  screen: '#ff6b6b', label: 'Puzzle socket',  kind: 'pocket' },
  { name: 'PUZZLE_DOG_BONES',   aci: 2,  screen: '#ffd166', label: 'Dog bones',      kind: 'pocket' },
  { name: 'PUZZLE_HOLES_7_5MM', aci: 3,  screen: '#8ce99a', label: 'Puzzle ⌀7.5',    kind: 'hole' },
  { name: 'SCREWS_3MM',         aci: 4,  screen: '#63e6e2', label: 'Screws ⌀3',      kind: 'hole' },
  // ─── Turn 13 (CLAUDE.md F8 / #59): the partition biscuit ───
  // The 70 mm marks of the owner's joiner-biscuit set. A LAYER OF ITS OWN
  // because it is a TOOL of its own: a dedicated 4 mm in-and-out program in
  // VCarve, matched by layer name like every other entry here. The name is
  // written exactly as CLAUDE.md gives it and is a hard contract.
  //
  // ACI 40 is unused by the LISP's own table, so nothing it already draws
  // changes colour in AutoCAD; the screen tone is a warm one, distinct from the
  // cool ⌀3 screws it sits between so a set reads as three things.
  { name: 'BISCUIT_4MM',        aci: 40, screen: '#ffb066', label: 'Biscuit 70 mm',  kind: 'mark' },
  { name: 'HINGES_5MM',         aci: 5,  screen: '#74a9ff', label: 'Hinges ⌀5',      kind: 'hole' },
  { name: 'SHELVES_7_5MM',      aci: 6,  screen: '#e599f7', label: 'Shelf pins ⌀7.5', kind: 'hole' },
  { name: 'RUNNERS_3MM',        aci: 5,  screen: '#ff922b', label: 'Runners ⌀3',     kind: 'hole' },
  { name: 'FRONT_HINGES_35MM',  aci: 3,  screen: '#38d9a9', label: 'Hinge cups ⌀35', kind: 'hole' },
  { name: 'FRONT_HINGES_3MM',   aci: 30, screen: '#f783ac', label: 'Cup screws ⌀3',  kind: 'hole' },
  { name: 'UNIT_NUMBER',        aci: 94, screen: '#8d8d92', label: 'Labels',         kind: 'text' },
  // Drawer-kit layers (KIT_BUDR_FULL createDrawerCNCLayers) — the runner and
  // bottom grooves in a drawer box side are real machining, so they keep the
  // names and ACI colours the kit gives them.
  { name: 'DRAWER_RUNNER_POCKET', aci: 1, screen: '#ffa8a8', label: 'Runner groove', kind: 'pocket' },
  { name: 'DRAWER_BOTTOM_POCKET', aci: 2, screen: '#ffe066', label: 'Bottom groove', kind: 'pocket' },
  // Wall-unit hanger cut-outs in the back panel (KIT_WUD_FULL L192).
  { name: 'HANGER_HOLE',        aci: 4,  screen: '#4dd4c8', label: 'Hanger cut-out', kind: 'pocket' },
  // Elevation-view outline layer. The CNC section of the LISP draws on OUTLINE,
  // the TOP/FRONT views on CARCASE; both mean "this is the edge of the part",
  // so a panel that arrives on either is drawn the same way.
  { name: 'CARCASE',            aci: 7,  screen: '#f0ece4', label: 'Carcase',        kind: 'outline' },
];

const BY_NAME = new Map(CNC_LAYERS.map((l) => [l.name, l]));

/** Fallback for a layer the engine emits that this table has not seen yet. */
const UNKNOWN = { name: '?', aci: 7, screen: '#c0c0c0', label: 'Other', kind: 'hole' };

export function cncLayer(name) {
  return BY_NAME.get(name) || { ...UNKNOWN, name: String(name || UNKNOWN.name) };
}

/** Screen colour for the CNC preview. */
export function layerScreenColor(name) {
  return cncLayer(name).screen;
}

/** AutoCAD Color Index for the DXF layer table. */
export function layerAci(name) {
  return cncLayer(name).aci;
}

/**
 * The layer rows a DXF file must declare, given the layers its entities use.
 * Order follows CNC_LAYERS so two files never disagree about layer order.
 */
export function layerTableFor(usedNames) {
  const used = new Set(usedNames);
  const rows = CNC_LAYERS.filter((l) => used.has(l.name)).map((l) => ({ name: l.name, color: l.aci }));
  // Anything the engine invented that the table does not know still has to be
  // declared, or the DXF references an undefined layer.
  for (const name of used) {
    if (!BY_NAME.has(name)) rows.push({ name, color: UNKNOWN.aci });
  }
  return rows;
}
