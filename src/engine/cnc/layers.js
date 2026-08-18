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
  // ─── Turn 25 (CLAUDE.md F3.4): the shaker panel POCKET ───
  // Until this turn the front DXF was an outline and its hinge holes and
  // nothing else. A shaker's face is machined — a 6 mm recess leaving the frame
  // standing — and that is a TOOL of its own on the bed: a large flat-bottomed
  // pocket, not a profile cut and not a drilling. It gets its own layer for the
  // same reason BISCUIT_4MM did, and appears ONLY on shaker fronts.
  //
  // ACI 41 sits beside the biscuit's 40 and is unused by the LISP's own table,
  // so nothing it already draws changes colour in AutoCAD.
  { name: 'SHAKER_PANEL_POCKET', aci: 41, screen: '#c3a06a', label: 'Shaker panel', kind: 'pocket' },
  // ─── Turn 25 (CLAUDE.md F4.2): the handle screws ───
  // ⌀5 through the front, one for a knob and two for a bar. A layer of its own
  // for the same reason the two above have one: it is a separate operation on
  // the bed, matched by name, and a handle hole mixed in with the hinge plate's
  // ⌀5 would be drilled by the plate's program on the plate's side of the door.
  { name: 'HANDLES_5MM',        aci: 42, screen: '#ffd43b', label: 'Handles ⌀5',    kind: 'hole' },
  { name: 'HINGES_5MM',         aci: 5,  screen: '#74a9ff', label: 'Hinges ⌀5',      kind: 'hole' },
  // ─── TURN 35 (CLAUDE.md F8): THE SAME PLATE, THE OTHER PILOT ───────────
  // Owner, 16.08.2026: "nie mamy ustawienia w ogóle 5 mm czy 3 mm screws
  // zawiasy wiercenie — niektórzy używają tak, inni inaczej". A workshop that
  // knocks its plates in on ⌀3 screws drills ⌀3, and the diameter says so the
  // only way this app has ever let a diameter speak: in the LAYER NAME, by the
  // house grammar `{FEATURE}_{DIAMETER}MM`. No text style rides with it — the
  // DXF writer has no STYLE table (the 02.08 VCarve crash law), and the name
  // is what VCarve maps the tool by regardless.
  //
  // ACI 43 sits beyond the handles' 42 and is unused by the LISP's own table,
  // so nothing AutoCAD already draws changes colour. The screen tone is a
  // DEEPER blue than HINGES_5MM's #74a9ff: the same feature, read at a glance
  // as the other diameter, never mistaken for it.
  { name: 'HINGES_3MM',         aci: 43, screen: '#4c6ef5', label: 'Hinges ⌀3',      kind: 'hole' },
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
  // ─── Turn 34 (CLAUDE.md F4): the SHOE BOX's two new layers ───
  // Straight out of KIT_SHOE_BOX.lsp `shoeMakeLayers`, ACI colours included:
  // the sloped bottom's groove (6 deep, in all four walls) and the side
  // runner's ⌀5 euro fixings in the carcass side. `SCREWS_3MM` is REUSED for
  // the FIX variant's three through-pilots — the kit reuses it, so we do.
  // NO TEXT STYLE rides either of them (the 02.08 VCarve crash law).
  { name: 'SHOE_GROOVE_6MM',    aci: 1,  screen: '#ff9f43', label: 'Shoe groove',   kind: 'pocket' },
  { name: 'SHOE_RUNNER_5MM',    aci: 5,  screen: '#5fd0ff', label: 'Shoe runner ⌀5', kind: 'hole' },
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

// ─── TURN 35 (CLAUDE.md F8): ⌀3 OR ⌀5 → THE LAYER THAT CARRIES IT ──────────
//
// ONE place turns the hinge-plate pilot into a layer name, so the engine, the
// 3-D bore and the hand-editor's defaults can never disagree about which layer
// a ⌀3 plate hole lands on. It is the house grammar spelled out —
// `{FEATURE}_{DIAMETER}MM`, the decimal point written as `_` — and it is
// deliberately a LOOKUP rather than string arithmetic: a diameter this table
// has never met falls back to the ⌀5 the app has drilled since turn 1 rather
// than inventing a layer no machine has a tool mapped to.
const HINGE_PLATE_LAYERS = { 3: 'HINGES_3MM', 5: 'HINGES_5MM' };

/**
 * The carcass-side hinge-plate layer for a pilot diameter.
 * @param {number} d  the pilot, ⌀3 or ⌀5
 * @param {string} fallback  what an unknown diameter takes — the app's own ⌀5
 */
export function hingePlateLayer(d, fallback = 'HINGES_5MM') {
  return HINGE_PLATE_LAYERS[Math.round(Number(d))] || fallback;
}


/**
 * The layer rows a DXF file must declare, given the layers its entities use.
 * Order follows CNC_LAYERS so two files never disagree about layer order.
 */
export function layerTableFor(usedNames, userLayers = []) {
  const used = new Set(usedNames);
  const rows = CNC_LAYERS.filter((l) => used.has(l.name)).map((l) => ({ name: l.name, color: l.aci }));
  // ─── TURN 38 (CLAUDE.md F3/F10): THE PROJECT'S OWN LAYERS ────────────────
  //
  // "User layers … export to DXF under their given name and colour." A user
  // layer is a NAME and an ACI (`engine/partLayers.js` says why the colour is
  // an index rather than a hex: an R12 LAYER row has group code 62 and nowhere
  // to put an RGB), so it declares exactly like a built-in one and the only
  // thing that changes is where the row came from.
  //
  // They go AFTER the built-ins, in the order the project made them, so two
  // files of the same job never disagree about layer order — the same reason
  // the built-in block follows `CNC_LAYERS` rather than the used-set's
  // iteration order.
  const own = new Map();
  for (const l of userLayers || []) {
    const name = String(l?.name || '');
    if (!name || BY_NAME.has(name) || own.has(name)) continue;
    own.set(name, Number(l.aci) || UNKNOWN.aci);
  }
  for (const [name, color] of own) {
    if (used.has(name)) rows.push({ name, color });
  }
  // Anything the engine invented that the table does not know still has to be
  // declared, or the DXF references an undefined layer.
  for (const name of used) {
    if (!BY_NAME.has(name) && !own.has(name)) rows.push({ name, color: UNKNOWN.aci });
  }
  return rows;
}
