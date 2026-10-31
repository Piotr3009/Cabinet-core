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
// ─── CHAT FIX 31.10.2026: NO YELLOW, AND THE SHEET WEARS THE DXF'S COLOURS ──
// The owner, 31.10.2026: *"zmien prosze layer cabineo dziury kolor z zoltego,
// raczej staraj sie wszedzie omijac zolty bo on jest mega nie widoczny na
// bialym tle (na takim pracuje vcarve)"*; on the mapping: *"1 ok, ale staraj
// sie trzymac w exporcie do DXF i u nas te same kolory"*; *"cyjan jest ok,
// tylko jasny zolty jest nie widoczny"*; *"koduj"*. VCarve draws the DXF on a
// WHITE sheet, so the yellow family of the index (2 and 40 to 59: yellow,
// amber, the pale yellows) is gone from every layer the app or the LISP
// declares; cyan (4) stays. The numbers were chosen for the white sheet: each
// hue's darker rungs (the index ladder 255 / 189 / 129 per hue), one hue per
// feature family (reds for the puzzle and the corner mark, oranges for the
// biscuit and the shaker pocket, greens for the dowel, blues for the plate
// pilots and the Cabineo side hole, violets for the Cabineo pockets, the
// magentas and pinks for HAWA and the drawer groove).
//
// `screen` FOLLOWS `aci` from this day: the same colour the DXF states, lifted
// toward white only as far as a 3.5 : 1 contrast on the black sheet (#131313,
// components/CncView.jsx) needs, the house's own way for the sticker colours
// (engine/partNumbers.js unitScreenColourOf). A bright index is painted as it
// is; a dark rung is lifted (the percentage stands beside each row), so the
// hue a joiner sees here is the hue he sees in VCarve. The rows this fix did
// not touch keep their tones (the ACI 5 twins above, the rest already in the
// family of their index).
//
// Pure data — no React, no store imports (engine rule).

/** kind: how the layer is drawn — 'outline' | 'pocket' | 'hole' | 'mark' | 'text'. */
export const CNC_LAYERS = [
  { name: 'OUTLINE',            aci: 7,  screen: '#f0ece4', label: 'Outline',        kind: 'outline' },
  { name: 'PUZZLE_SOCKET',      aci: 1,  screen: '#ff6b6b', label: 'Puzzle socket',  kind: 'pocket' },
  // 31.10.2026: was ACI 2 (yellow); 12 is the puzzle socket's red, one rung
  // darker. Screen: 12 lifted 19 %.
  { name: 'PUZZLE_DOG_BONES',   aci: 12, screen: '#ca3030', label: 'Dog bones',      kind: 'pocket' },
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
  // 31.10.2026: was ACI 40 (amber, the yellow family); 22 is a dark orange
  // red, warm as before. Screen: 22 lifted 7 %.
  { name: 'BISCUIT_4MM',        aci: 22, screen: '#c23d12', label: 'Biscuit 70 mm',  kind: 'mark' },
  // ─── Turn 25 (CLAUDE.md F3.4): the shaker panel POCKET ───
  // Until this turn the front DXF was an outline and its hinge holes and
  // nothing else. A shaker's face is machined — a 6 mm recess leaving the frame
  // standing — and that is a TOOL of its own on the bed: a large flat-bottomed
  // pocket, not a profile cut and not a drilling. It gets its own layer for the
  // same reason BISCUIT_4MM did, and appears ONLY on shaker fronts.
  //
  // ACI 41 sits beside the biscuit's 40 and is unused by the LISP's own table,
  // so nothing it already draws changes colour in AutoCAD.
  // 31.10.2026: was ACI 41 (pale amber, the yellow family); 32 is a dark
  // orange, the front pockets' colour (engine/cnc/frontOperations.js takes the
  // same 32 for a decorated front's pockets). Screen: 32 as it is.
  { name: 'SHAKER_PANEL_POCKET', aci: 32, screen: '#bd5e00', label: 'Shaker panel', kind: 'pocket' },
  // ─── Turn 25 (CLAUDE.md F4.2): the handle screws ───
  // ⌀5 through the front, one for a knob and two for a bar. A layer of its own
  // for the same reason the two above have one: it is a separate operation on
  // the bed, matched by name, and a handle hole mixed in with the hinge plate's
  // ⌀5 would be drilled by the plate's program on the plate's side of the door.
  // 31.10.2026: was ACI 42 (the yellow family); 170 is the pure blue of the
  // index ladder, the plates' family at full brightness. Screen: 170 lifted
  // 32 % (pure blue is dim on the black sheet).
  { name: 'HANDLES_5MM',        aci: 170, screen: '#5252ff', label: 'Handles ⌀5',    kind: 'hole' },
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
  // 31.10.2026: was ACI 43 (the yellow family); 162 is a deep blue, the ⌀5
  // plate's family one rung darker. Screen: 162 lifted 27 %.
  { name: 'HINGES_3MM',         aci: 162, screen: '#4566cf', label: 'Hinges ⌀3',      kind: 'hole' },
  // ─── T75 F23 (SKYLON_JOINTS_DOWEL.lsp): THE DOWEL, ITS TWO HALVES ────────
  // The owner: *"lisp najpierw."*  A dowel unit's joint is a FACE hole in one
  // board and an EDGE bore in the other. The face half is a blind ⌀8 drilled
  // from above like a hinge plate, a tool of its own, so a layer of its own by
  // the house grammar `{FEATURE}_{DIAMETER}MM`. The edge half is a horizontal
  // bore a 3-axis bed cannot make: it is named so the sheet and the drawings
  // can say where it goes, and the machine file never carries it
  // (engine/cnc/dxf.js). ACI 45 and 46: beyond the LED groove's 44, unused by
  // the LISP's own table, so nothing AutoCAD already draws changes colour.
  // 31.10.2026: were ACI 45 and 46 (the yellow family); 84 and 86 are two
  // rungs of one green, the face hole the brighter. Screen: 84 as it is, 86
  // lifted 13 %.
  { name: 'DOWEL_8MM',          aci: 84, screen: '#1f8100', label: 'Dowels ⌀8',      kind: 'hole' },
  { name: 'DOWEL_EDGE_8MM',     aci: 86, screen: '#377c21', label: 'Dowel edge bores ⌀8 (by hand)', kind: 'hole' },
  // ─── T78 F20 (SKYLON_JOINTS_CABINEO.lsp): THE CABINEO'S FIVE ─────────────
  // The owner: *"lisp najpierw."*  A Cabineo pocket is milled into the FACE of
  // the horizontal board at its end, from the carcass's OUTSIDE face, by one
  // of Lamello's three machining options (page 2 of the sheet: a dia 15 drill,
  // a cutter of at least dia 10, a dia 12 cutter): three layers, one per tool,
  // by the house grammar `{FEATURE}_{DIAMETER}MM` (the LISP's D.9, T78
  // proposed). The cover cap's recess (2.1 deep, 18.8 wide under the flush
  // cover cap mounting) is a second, shallower pocket and a layer of its own;
  // the side's dia 5 counterpart hole is drilled from the inside face like a
  // hinge plate, a tool of its own. ACI 47 to 51: beyond the dowel's 46,
  // unused by the LISP's own table, so nothing AutoCAD already draws changes
  // colour. The engine names them in engine/cabineo.js.
  // 31.10.2026: were ACI 47 to 51 (the yellow family; the owner: *"zmien
  // prosze layer cabineo dziury kolor z zoltego"*). The three pockets are
  // three rungs of one violet (200, 202, 204), the cap recess the magenta 212,
  // the side's dia 5 hole the azure 150 that SKYLON_JOINTS_CABINEO.lsp's own
  // drawing command already gave it. Screen: 200 as it is, 202 lifted 21 %,
  // 204 lifted 32 %, 212 lifted 3 %, 150 as it is.
  { name: 'CABINEO_POCKET_15MM', aci: 200, screen: '#bf00ff', label: 'Cabineo pocket (drill ⌀15)', kind: 'hole' },
  { name: 'CABINEO_POCKET_10MM', aci: 202, screen: '#a536cb', label: 'Cabineo pocket (cutter ⌀10)', kind: 'pocket' },
  { name: 'CABINEO_POCKET_12MM', aci: 204, screen: '#9352a9', label: 'Cabineo pocket (cutter ⌀12)', kind: 'pocket' },
  { name: 'CABINEO_RECESS',      aci: 212, screen: '#bf08bf', label: 'Cabineo cap recess', kind: 'pocket' },
  { name: 'CABINEO_HOLE_5MM',    aci: 150, screen: '#007fff', label: 'Cabineo ⌀5 (side)', kind: 'hole' },
  // ─── 15.10.2026 (KIT_RECESS.lsp D9): THE WINDOW INTO THE RECESS ──────────
  // The owner: *"front zawsze trzyma sie linii a jak wpada do reces to wtedy
  // sie wydluza szafka."*  A cabinet partly in a recess grows an extension
  // behind its BACK, and the BACK loses a WINDOW into it: a THROUGH pocket
  // (its record states the board's own depth) on a layer of its own, so the
  // cutter that clears it is matched by name as every other tool here is.
  // ACI 52: beyond the Cabineo's 51, unused by COMMON's table.
  // 31.10.2026: was ACI 52 (the yellow family); 142 is a sea blue, apart from
  // the cyan of the screws and the hanger cut-out. Screen: 142 as it is.
  { name: 'RECESS_WINDOW',       aci: 142, screen: '#008dbd', label: 'Recess window (through)', kind: 'pocket' },
  // ─── CHAT FIX 17.10.2026: THE CORNER MARK ───────────────────────────────
  // The owner, on every L-shaped board: *"nie, nie dodawaj wiercenia, dodaj
  // jeden layer w samym cornerze okolo 40 mm w kazda strone na linii L shape i
  // nazwij to corner 4 mm, wtedy ja wytne ten korner."*  A MARK, the biscuit
  // line's own kind: two open two-point polylines at a re-entrant corner, each
  // along one of the outline edges that meet there (profile.cnc.cornerMark
  // legMm 40), on which the owner runs his own 4 mm program to square the
  // fillet the 8 mm cutter leaves. The dog-bone circle that stood there until
  // this day is gone (KIT_NOTCH.lsp D9, KIT_RECESS.lsp D18, KIT_CORNER_L.lsp
  // section 4). ACI 53: the next number after RECESS_WINDOW's 52.
  // 31.10.2026: was ACI 53 (the yellow family); 14 is the darkest rung of the
  // puzzle's red (the mark stands on an outline corner, where the socket's 1
  // and the dog bones' 12 are its neighbours). Screen: 14 lifted 32 %.
  { name: 'CORNER_4MM',         aci: 14, screen: '#a95252', label: 'Corner mark (4 mm cutter)', kind: 'mark' },
  // ─── T82 F5 (KIT_HAWA.lsp D15): THE HAWA POCKET'S FIVE ───────────────────
  // CLAUDE.md T82 F5: *"the hole patterns of F1(d) as drill operations on the
  // pocket panels (fi 4.5 pilot PROPOSED 3 mm diameter 10 deep ...), on the
  // layer grammar the CNC already has for hinge plates; the door's cups and
  // holes as the hinge drilling is done today (fi 35 x 13, fi 5 x 13, fi 8 x
  // 13)"*. The house grammar `{FEATURE}_{DIAMETER}MM`, one tool each: the
  // panels' pilots; the door's cups, its two fixing holes and its sleeve
  // holes, the FRONT_HINGES family at their own diameters; the foot's hole
  // through the bottom board; the III/35 steel profile's groove, a pocket.
  // ACI 54 to 59, the next free after CORNER_4MM's 53 (KIT_HAWA.lsp
  // createHawaLayers).
  //
  // AFTER THE REVIEW (T82 F5): a DXF circle carries no depth, so the shop sets
  // ONE depth per layer, and the house's FRONT_HINGES_35MM is the owner's 11.
  // The HAWA cup is 13 (160704 section C - C): on the house's layer either the
  // HAWA cup or the house cup on the same sheet would be bored wrong. So the
  // door's three take layers of their own whose NAMES carry their depth, the
  // house's grammar for a depth-bearing layer (engine/frontDecoration.js
  // `FRONT_{KIND}_D{depth}`): one layer, one depth, said in the name.
  // 31.10.2026: were ACI 54 to 59 (the pure yellows). The HAWA pilots and the
  // door's two D13 holes are three rungs of one pink (220, 222, 224); the foot,
  // the groove and the D13 cup three rungs of one violet (190, 192, 194), apart
  // from the Cabineo's 200 family by a hue step. Screen: 220 as it is, 222
  // lifted 11 %, 224 lifted 29 %, 190 lifted 16 %, 192 lifted 29 %, 194
  // lifted 35 %.
  { name: 'HAWA_3MM',           aci: 220, screen: '#ff00bf', label: 'HAWA pilots ⌀3', kind: 'hole' },
  { name: 'FRONT_HINGES_5MM_D13', aci: 222, screen: '#c41c9a', label: 'Hinge screws ⌀5 x 13 (HAWA)', kind: 'hole' },
  { name: 'FRONT_HINGES_8MM_D13', aci: 224, screen: '#a64a8e', label: 'Sleeves ⌀8 x 13 (HAWA)', kind: 'hole' },
  { name: 'HAWA_FOOT_35MM',     aci: 190, screen: '#9329ff', label: 'HAWA foot ⌀35 (through)', kind: 'hole' },
  { name: 'HAWA_GROOVE_12MM',   aci: 192, screen: '#8d4ad0', label: 'HAWA steel profile groove', kind: 'pocket' },
  { name: 'FRONT_HINGES_35MM_D13', aci: 194, screen: '#8359ad', label: 'Hinge cups ⌀35 x 13 (HAWA)', kind: 'hole' },
  { name: 'SHELVES_7_5MM',      aci: 6,  screen: '#e599f7', label: 'Shelf pins ⌀7.5', kind: 'hole' },
  { name: 'RUNNERS_3MM',        aci: 5,  screen: '#ff922b', label: 'Runners ⌀3',     kind: 'hole' },
  { name: 'FRONT_HINGES_35MM',  aci: 3,  screen: '#38d9a9', label: 'Hinge cups ⌀35', kind: 'hole' },
  { name: 'FRONT_HINGES_3MM',   aci: 30, screen: '#f783ac', label: 'Cup screws ⌀3',  kind: 'hole' },
  { name: 'UNIT_NUMBER',        aci: 94, screen: '#8d8d92', label: 'Labels',         kind: 'text' },
  // Drawer-kit layers (KIT_BUDR_FULL createDrawerCNCLayers) — the runner and
  // bottom grooves in a drawer box side are real machining, so they keep the
  // names and ACI colours the kit gives them.
  { name: 'DRAWER_RUNNER_POCKET', aci: 1, screen: '#ffa8a8', label: 'Runner groove', kind: 'pocket' },
  // 31.10.2026: was ACI 2 (yellow; KIT_BUDR_FULL.lsp and KIT_WARDROBE_FULL.lsp
  // amended the same day); 230 is a rose, apart from the runner groove's red
  // on the same board. Screen: 230 as it is.
  { name: 'DRAWER_BOTTOM_POCKET', aci: 230, screen: '#ff007f', label: 'Bottom groove', kind: 'pocket' },
  // ─── CHAT FIX 31.10.2026: THE WATCH DRAWER'S THREE, NAMED HERE AT LAST ────
  // KIT_WATCH_DRAWER.lsp's watchMakeLayers declares them (engine/watchDrawer.js
  // WATCH_LAYERS cuts on them) and this table never did, so the DXF declared
  // them at the fallback's 7 and the sheet painted them grey. The kit's own
  // numbers were 41, 42 and 43 (the yellow family); from this day the slot is
  // the brown 34 (the shaker pocket's orange, two rungs darker), the rebate the
  // blue 172 and the opening the blue 174 (the plates' family, the deeper the
  // more it cuts). Screen: 34 lifted 17 %, 172 lifted 37 %, 174 lifted 39 %.
  { name: 'WATCH_DIVIDER_SLOT',  aci: 34,  screen: '#96602b', label: 'Watch divider slot', kind: 'pocket' },
  { name: 'WATCH_GLASS_REBATE',  aci: 172, screen: '#5e5ed5', label: 'Watch glass rebate', kind: 'pocket' },
  { name: 'WATCH_GLASS_OPENING', aci: 174, screen: '#6363b2', label: 'Watch glass opening (through)', kind: 'pocket' },
  // Wall-unit hanger cut-outs in the back panel (KIT_WUD_FULL L192).
  { name: 'HANGER_HOLE',        aci: 4,  screen: '#4dd4c8', label: 'Hanger cut-out', kind: 'pocket' },
  // T54-F7: the shoe box's two layers (SHOE_GROOVE_6MM, SHOE_RUNNER_5MM)
  // died with KIT_SHOE_BOX — the shoe drawer machines on the drawer's own
  // layers (licence 2; the grave is named in the verdict).
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
