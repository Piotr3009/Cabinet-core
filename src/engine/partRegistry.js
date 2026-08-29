// ─────────────────────────────────────────────────────────────────────────────
// THE PART REGISTRY (turn 39, CLAUDE.md F1)
//
// The owner, 18.08.2026: *"teraz mam osobno wszystkie BUL BUR — a po co? Jak
// powinny być carcase materials (jeśli ten sam wszędzie to połączyć w jedno)?"*
//
// Cabinet Core had no layer between the ENGINE's part names and the things a
// joiner BUYS. This is that layer, and it is lifted from Production Core
// (`Piotr3009/Sash-Planner-Web`, `src/engine/partRegistry.js`), where
// `'JAMB LEFT': 'jambs'` and `'JAMB RIGHT': 'jambs'` have collapsed two engine
// elements into one assignable part in production use for months.
//
// TWO COLLAPSES, and only the FIRST one lives here:
//
//   Collapse 1 (this file)  — many engine part names → ONE assignable PART.
//                             BUL and BUR are both `carcase_side`. You assign a
//                             board once and both sides are cut from it.
//   Collapse 2 (engine/bom) — many parts → ONE PURCHASE LINE, keyed by the
//                             assigned material id. It needs no special case:
//                             it falls out of keying on `mat:{id}`.
//
// PURITY. This module imports `types.js` (pure data) and nothing else. No
// store, no React, no `cabinet.js`. The registry reads the engine's answer; the
// engine does not read the registry, and `computeCabinet()` does not import
// this file — which is what makes T39 a byte-identity turn (iron rule 2).
//
// ─── THE CASEMENT DROP BUG ───────────────────────────────────────────────────
//
// Production Core carries a scar and a comment about it: a part name absent
// from `ELEMENT_TO_PART_ID` is not an error anywhere — it is simply DROPPED,
// silently, from every BOM that has ever been printed. Casement windows lost
// their whole frame that way and nobody noticed until an audit counted the
// lines.
//
// `test/t39-part-registry.test.js` walks a full wardrobe AND a kitchen cabinet
// — every unit type this app ships, at every feature combination the engine
// will emit a panel for — and asserts ZERO unmapped part names. That test is
// the reason this file can be trusted; do not weaken it.
// ─────────────────────────────────────────────────────────────────────────────

import { UNIT_TYPES } from './types.js';

// ─── THE VARIANT KEY: A CABINET FAMILY ──────────────────────────────────────
//
// Production Core's variant is the FRAME TYPE (standard / slim / heritage /
// triple). Cabinet Core's, per CLAUDE.md F2, is the CABINET FAMILY: a workshop
// that puts one board in its wardrobes and another in its kitchen bases says so
// once, here, rather than twice per part.
export const VARIANT_ORDER = ['wardrobe', 'base', 'wall', 'tall', 'pantry'];

// Exported the moment something shows them — the Assign Materials modal (F3).
const VARIANT_LABELS = {
  wardrobe: 'Wardrobe',
  base: 'Base',
  wall: 'Wall',
  tall: 'Tall',
  pantry: 'Pantry',
};

/**
 * Which family a unit type belongs to.
 *
 * `cabinetFamilyOf`, not `familyOf`: `UNIT_TYPES[].family` already means
 * something else in this app (kitchen | wardrobe — which LIBRARY a kit is in),
 * and `engine/library.js` takes a `familyOf` of its own as a parameter. Two
 * different questions must not share one name.
 *
 * Read off the type's OWN fields rather than off a second list that could drift
 * from `types.js`: `family: 'wardrobe'` answers first (a top box is a wardrobe
 * even though it hangs), the PANTRY names itself because the owner's list names
 * it, and everything else falls to its `heightGroup` — which is already the
 * app's word for "is this a base, a wall or a tall unit".
 *
 * A type this app has never heard of is 'base', because a base unit is what a
 * cabinet is when nothing else is known about it.
 */
export function cabinetFamilyOf(typeId) {
  const t = UNIT_TYPES[typeId];
  if (!t) return 'base';
  if (t.id === 'PANTRY') return 'pantry';
  if (t.family === 'wardrobe') return 'wardrobe';
  if (t.heightGroup === 'wall' || t.heightGroup === 'base' || t.heightGroup === 'tall') return t.heightGroup;
  return t.mount === 'wall' ? 'wall' : 'base';
}

// ─── THE GROUPS ─────────────────────────────────────────────────────────────
// The left-hand column of the Assign Materials modal (F3), in this order.
export const PART_GROUPS = [
  { id: 'board', label: 'BOARD', hint: 'Carcass boards — bought by the sheet' },
  { id: 'front', label: 'FRONT', hint: 'What the room sees' },
  { id: 'drawer_box', label: 'DRAWER BOX', hint: 'The box behind the front' },
  { id: 'edging', label: 'EDGING', hint: 'Banding, bought by the metre' },
  { id: 'hardware', label: 'HARDWARE', hint: 'Counted in pieces and pairs' },
  { id: 'lighting', label: 'LIGHTING', hint: 'Strip, driver, channel' },
  { id: 'consumable', label: 'CONSUMABLE', hint: 'Screws, dowels, glue' },
];

const G = (id) => PART_GROUPS.find((g) => g.id === id)?.id || id;

/**
 * THE REGISTRY.
 *
 * The rule CLAUDE.md F1 sets, in one line: **separate ids where the MATERIAL
 * genuinely differs, merged ids where it does not.** A back is 6 mm and a side
 * is 18, so they are two rows. A left side and a right side come off the same
 * sheet, so they are one.
 */
export const PART_REGISTRY = {
  // ─── BOARD ────────────────────────────────────────────────────────────────
  carcase_side: {
    id: 'carcase_side', name: 'Carcase sides', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'BUL + BUR, and every other vertical board inside the box',
  },
  carcase_horizontal: {
    id: 'carcase_horizontal', name: 'Carcase top / bottom', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'TOP and BOTTOM are one board, and so are the rails that replace them',
  },
  partition: {
    id: 'partition', name: 'Partitions', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'Horizontal, vertical and rail partitions',
  },
  shelf: {
    id: 'shelf', name: 'Shelves', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'Fixed and adjustable alike — one board cuts both',
  },
  back: {
    id: 'back', name: 'Backs', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'SEPARATE: usually 6 mm, not 18',
  },
  plinth: {
    id: 'plinth', name: 'Plinth', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'The toe kick under a standing unit',
  },
  top_box_carcase: {
    id: 'top_box_carcase', name: 'Top box carcase', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'The small box that rides on a wardrobe — its own row because it is often cut from an offcut',
  },
  // T54-F7: `shoe_box_carcase` is DELETED with the world it priced — the
  // shoe is a standard drawer now (licence 2; the grave is named in the
  // verdict). The tilted shoe SHELF's rail below is a different entity.

  // ─── FRONT ────────────────────────────────────────────────────────────────
  door: {
    id: 'door', name: 'Doors', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'Door leaves, including every leaf of a split door',
  },
  drawer_front: {
    id: 'drawer_front', name: 'Drawer fronts', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'Drawer fronts — the shoe drawer’s face included (T54-F7)',
  },
  false_front: {
    id: 'false_front', name: 'False fronts', group: G('front'), unit: 'm²', materialType: 'front',
    // Kept because CLAUDE.md F1 names the row. No engine part maps here TODAY —
    // a fixed dummy panel comes out of the engine as a `FRONT` and is a door as
    // far as the cut list is concerned. The row is here so that the day the
    // engine learns to say "FIX", the BOM already has somewhere to put it.
    note: 'FIX fronts — no engine part reaches this row yet',
  },
  end_panel: {
    id: 'end_panel', name: 'End panels', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'Masking panels on the outside of a run — front material since turn 6',
  },
  infill: {
    id: 'infill', name: 'Infill / scribe', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'Fillers at the wall and up to the ceiling',
  },
  mask: {
    id: 'mask', name: 'Bottom mask', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'The board under a run of wall units, hiding the standoff',
  },

  // ─── DRAWER BOX ───────────────────────────────────────────────────────────
  drawer_box_side: {
    id: 'drawer_box_side', name: 'Drawer box sides', group: G('drawer_box'), unit: 'm²', materialType: 'board',
    note: 'Sides, box front and box back — one board for the three',
  },
  drawer_bottom: {
    id: 'drawer_bottom', name: 'Drawer bottoms', group: G('drawer_box'), unit: 'm²', materialType: 'board',
    note: 'SEPARATE: a thin board, never the box board',
  },

  // ─── EDGING ───────────────────────────────────────────────────────────────
  // Length, not area. The engine already decided WHICH edges are banded
  // (`panel.edging.code`) and HOW LONG that banding is (`panel.edging.len_m`);
  // this splits the metres three ways so a workshop can put ABS on its
  // carcasses and a matching lacquered edge on its fronts.
  edge_carcase: {
    id: 'edge_carcase', name: 'Carcase edging', group: G('edging'), unit: 'm', materialType: 'edging',
    note: 'Banding on sides, tops, bottoms, backs, plinths and drawer boxes',
  },
  edge_front: {
    id: 'edge_front', name: 'Front edging', group: G('edging'), unit: 'm', materialType: 'edging',
    note: 'Banding on doors, drawer fronts, end panels, infills and masks',
  },
  edge_shelf: {
    id: 'edge_shelf', name: 'Shelf edging', group: G('edging'), unit: 'm', materialType: 'edging',
    note: 'Banding on shelves and partitions — the edge a hand touches',
  },

  // ─── HARDWARE ─────────────────────────────────────────────────────────────
  hinge: {
    id: 'hinge', name: 'Hinges', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'From the engine’s own hinge count, per door',
  },
  hinge_plate: {
    id: 'hinge_plate', name: 'Hinge plates', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One per hinge — the engine counts hinges, and a hinge without its plate does not hang',
  },
  runner: {
    id: 'runner', name: 'Drawer runners', group: G('hardware'), unit: 'pairs', materialType: 'hardware',
    note: 'One pair per drawer, at the length the engine snapped to',
  },
  runner_sync_rod: {
    id: 'runner_sync_rod', name: 'Runner sync rods', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One per wide drawer — Blum’s own threshold, turn 18',
  },
  // T54-F7: `shoe_runner` DELETED — the shoe drawer buys the same Blum
  // runner every drawer buys, by the same NL law.
  leg: {
    id: 'leg', name: 'Legs', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Chosen from the plinth height — see profile.materials.legRules (F4)',
  },
  rail_tube: {
    id: 'rail_tube', name: 'Hanging rail', group: G('hardware'), unit: 'm', materialType: 'hardware',
    note: 'Cut to the internal width, bought by the metre',
  },
  rail_support: {
    id: 'rail_support', name: 'Rail supports', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Two per rail — the end cups the tube sits in',
  },
  handle: {
    id: 'handle', name: 'Handles', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One per placement the engine published',
  },
  shelf_pin: {
    id: 'shelf_pin', name: 'Shelf pins', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Four per adjustable shelf',
  },
  hanger: {
    id: 'hanger', name: 'Wall hangers', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Two per hung unit',
  },
  top_box_connector: {
    id: 'top_box_connector', name: 'Top box connectors', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'What ties a top box to the wardrobe under it',
  },
  bin_pullout: {
    id: 'bin_pullout', name: 'Bin pull-out', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought mechanism, named by its opening',
  },
  cargo_frame: {
    id: 'cargo_frame', name: 'Cargo frame', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought mechanism, named by its opening',
  },
  extractor: {
    id: 'extractor', name: 'Extractor', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'The machine the hood unit is built around',
  },
  glass_pane: {
    id: 'glass_pane', name: 'Glass panes', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Filed here because it is bought in pieces, not cut from a sheet',
  },
  drawer_glass: {
    id: 'drawer_glass', name: 'Glass — display drawer top', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'The pane over a display drawer',
  },
  mirror: {
    id: 'mirror', name: 'Mirrors', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A door’s mirror, inside or outside, bought to the leaf’s size',
  },
  cornice: {
    id: 'cornice', name: 'Cornice moulding', group: G('hardware'), unit: 'm', materialType: 'hardware',
    note: 'Bought by the metre like the rail tube, not cut from a sheet',
  },
  drawer_insert: {
    id: 'drawer_insert', name: 'Drawer inserts', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Shoe insert, belt / tie divider — a bought tray',
  },
  // ─── TURN 52 (CLAUDE.md F5, decision 3) ────────────────────────────────
  // *"The insert is its own BOM line, addable to any drawer — not a drawer
  // type. That way a customer can have it in one drawer of six."*
  //
  // It is CUT, not bought — its frame and dividers are in the cut list and on
  // the sheet like every other board — so this line is the ASSEMBLY: which
  // drawer, how many pockets, how big they are. A joiner reads one line and
  // knows what he is making.
  watch_insert: {
    id: 'watch_insert', name: 'Watch / tie drawer insert', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Cut, not bought — the frame and dividers are on the sheet. One line per drawer that carries one',
  },
  kit_trouser: {
    id: 'kit_trouser', name: 'Trouser pull-out', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought wardrobe mechanism',
  },
  kit_tie_rack: {
    id: 'kit_tie_rack', name: 'Tie rack', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought wardrobe mechanism',
  },
  kit_pulldown_rail: {
    id: 'kit_pulldown_rail', name: 'Pull-down rail', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought wardrobe mechanism — T33 put it on the order form, zero holes',
  },
  plinth_clip: {
    id: 'plinth_clip', name: 'Plinth clips', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One per front leg — what holds the toe kick on',
  },
  plinth_clip_connector: {
    id: 'plinth_clip_connector', name: 'Plinth clip connectors', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'The clip’s own fixing into the plinth board',
  },
  ready_drawer_box: {
    id: 'ready_drawer_box', name: 'Ready-made drawer boxes', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'When the project buys its boxes instead of cutting them (turn 32)',
  },

  // ─── LIGHTING ─────────────────────────────────────────────────────────────
  led_strip: {
    id: 'led_strip', name: 'LED strip', group: G('lighting'), unit: 'm', materialType: 'lighting',
    note: 'Metres from the strips the design actually carries',
  },
  led_profile: {
    id: 'led_profile', name: 'LED profile', group: G('lighting'), unit: 'm', materialType: 'lighting',
    note: 'The aluminium channel — one metre of channel per metre of strip',
  },
  led_driver: {
    id: 'led_driver', name: 'LED driver / PSU', group: G('lighting'), unit: 'pcs', materialType: 'lighting',
    note: 'Sized to the strip run',
  },
  led_switch: {
    id: 'led_switch', name: 'LED switch / sensor', group: G('lighting'), unit: 'pcs', materialType: 'lighting',
    note: 'The project’s switching choice',
  },
  led_spot: {
    id: 'led_spot', name: 'LED spotlights', group: G('lighting'), unit: 'pcs', materialType: 'lighting',
    note: 'Under-cabinet spots',
  },

  // ─── CONSUMABLE ───────────────────────────────────────────────────────────
  screw_confirmat: {
    id: 'screw_confirmat', name: 'Confirmat screws', group: G('consumable'), unit: 'pcs', materialType: 'consumable',
    note: 'Counted from the engine’s own carcass joints',
  },
  puzzle_screw: {
    id: 'puzzle_screw', name: 'Puzzle screws', group: G('consumable'), unit: 'pcs', materialType: 'consumable',
    note: 'Counted from the puzzle holes the engine drilled',
  },
  dowel: {
    id: 'dowel', name: 'Dowels', group: G('consumable'), unit: 'pcs', materialType: 'consumable',
    note: 'Counted from the biscuit / dowel joints the engine drilled',
  },
  glue: {
    id: 'glue', name: 'Glue', group: G('consumable'), unit: 'L', materialType: 'consumable',
    note: 'A quantity the joiner types — there is no honest engine answer for it',
  },
};

/**
 * FLAT LIST FOR LOOKUPS — Production Core's `ALL_PARTS`, and its comment
 * applies here word for word: `mergeUnitMaterials` iterates THIS list, so
 * anything missing from it is silently dropped from every BOM.
 */
export const ALL_PARTS = Object.values(PART_REGISTRY);

/** What a cabinet family is called on screen. */
export function familyLabel(family) {
  return VARIANT_LABELS[family] || String(family || '');
}

/** The parts of one group, in registry order. */
export function partsInGroup(groupId) {
  return ALL_PARTS.filter((p) => p.group === groupId);
}

// ─── ENGINE PART NAME → ASSIGNABLE PART ID ──────────────────────────────────
//
// This is the mapping CLAUDE.md F1 is about, and it is the same object shape as
// Production Core's. The left-hand side is `panel.part` as `computeCabinet()`
// writes it; the right-hand side is a key of PART_REGISTRY.
//
// EVERY engine part name that can reach a cut list is here. The completeness
// test walks every unit type in `types.js` at every feature combination and
// fails on the first name that is not.
export const ELEMENT_TO_PART_ID = {
  // Carcase sides — the owner's own example. BUL and BUR are one board.
  BUL: 'carcase_side',
  BUR: 'carcase_side',
  // The L-shape's corner boards: two more sides, cut from the same sheet.
  SIDE: 'carcase_side',
  // A drawer PANEL is the internal side a wardrobe drawer runs on…
  DP: 'carcase_side',
  // …a FILLER is the strip that makes up the difference beside it…
  FILLER: 'carcase_side',
  // …and the fridge housing's SPURS are the same board again.
  SPURS: 'carcase_side',

  // Carcase horizontals — TOP and BOTTOM are one board, and so is the pair of
  // rails a sink or an oven base gets INSTEAD of a top.
  TOP: 'carcase_horizontal',
  BOTTOM: 'carcase_horizontal',
  HOLDER: 'carcase_horizontal',

  // Backs — SEPARATE, because a back is 6 mm and a side is 18. A fridge
  // housing's back RAILS are back material too: they are what closes it.
  BACK: 'back',
  'BACK-RAIL': 'back',

  // Shelves — fixed and adjustable alike, and the wine rack's lattice, which is
  // the same board sawn into strips.
  SHELF: 'shelf',
  FIXED: 'shelf',
  'LATTICE-H': 'shelf',
  'LATTICE-V': 'shelf',
  // T33's stop rail: a strip sawn off the same board, along the front edge of a
  // shoe shelf. It is a CUT part and it is in the list, so it is here — this is
  // the exact name a greedy walk of the engine can miss, because it needs a
  // shelf whose variant is `shoe` before it exists at all.
  'SHOE-RAIL': 'shelf',

  // Partitions — horizontal, vertical, and the one that carries a rail.
  PARTITION: 'partition',
  VPART: 'partition',
  // T42-F1: `'RAIL-PART': 'partition'` DELETED. The engine cannot emit that
  // panel any more — the owner's rail partitioner is gone — and this file's own
  // invariant (`test/t39-part-registry.test.js`, "the registry maps nothing the
  // engine cannot emit") is what says an orphan row may not stand here.

  PLINTH: 'plinth',

  // Fronts.
  FRONT: 'door',
  'DRAWER-FRONT': 'drawer_front',

  // The pieces that FINISH a run. Front material since turn 6, and each its own
  // row because a workshop prices a 2.4 m filler differently from a door.
  'END-PANEL': 'end_panel',
  INFILL: 'infill',
  MASK: 'mask',

  // The drawer box: three boards that are one board to buy, and a bottom that
  // is not.
  'DRAWER-SIDE': 'drawer_box_side',
  'DRAWER-BOX-FRONT': 'drawer_box_side',
  'DRAWER-BOX-BACK': 'drawer_box_side',
  'DRAWER-BOTTOM': 'drawer_bottom',

  // KIT_SHOE_BOX (turn 34) put seven SHOEBOX-* boards here. T54-F7 buried
  // that world (licence 2): a shoe is a `variant:'shoe'` DRAWER now, so its
  // boards arrive as DRAWER-SIDE/-BOX-FRONT/-BOX-BACK/-BOTTOM above and its
  // front as a DRAWER-FRONT — no row of its own to keep in step.
};

/**
 * THE TOP BOX ROUTE.
 *
 * A top box's carcase comes out of `computeCabinet()` under the SAME part names
 * as any other wardrobe — BUL, BUR, TOP, BOTTOM, BACK — because it is the same
 * kit. So a flat name→id map cannot tell one from the other, and CLAUDE.md F1
 * asks for `top_box_carcase` as its own row.
 *
 * Production Core solved exactly this shape of problem exactly this way: its
 * `partIdFor()` takes the flat map's answer and re-routes `head`/`jambs` to
 * `head_slim` / `jambs_triple` by the window's FRAME TYPE. Here the context is
 * the UNIT TYPE, and the re-route is one line.
 *
 * @param {string} partName  `panel.part` as the engine wrote it
 * @param {object} [ctx]     { typeId } — the unit the panel came off
 */
const TOP_BOX_CARCASE_PARTS = new Set(['carcase_side', 'carcase_horizontal', 'back']);

export function partIdForElement(partName, { typeId = null } = {}) {
  const base = ELEMENT_TO_PART_ID[partName] || null;
  if (!base) return null;
  if (typeId === 'WARDROBE_TOP' && TOP_BOX_CARCASE_PARTS.has(base)) return 'top_box_carcase';
  return base;
}

// ─── ENGINE HARDWARE ROLE → ASSIGNABLE PART ID ──────────────────────────────
//
// `result.hardware[].role`, which is the engine's own word for what it counted.
// The same completeness rule applies: a role missing from here is a hardware
// line nobody ever sees.
export const HARDWARE_TO_PART_ID = {
  hinges: 'hinge',
  runner_pairs: 'runner',
  runner_sync_rods: 'runner_sync_rod',
  legs: 'leg',
  rail: 'rail_tube',
  shelf_pins: 'shelf_pin',
  hangers: 'hanger',
  bin_pullout: 'bin_pullout',
  cargo_frame: 'cargo_frame',
  extractor: 'extractor',
  glass_pane: 'glass_pane',
  drawer_glass: 'drawer_glass',
  mirror: 'mirror',
  cornice: 'cornice',
  drawer_insert: 'drawer_insert',
  // ─── TURN 52 (CLAUDE.md F5) ──────────────────────────────────────────────
  // The watch insert's own line (decision 3), and the strip that lights it
  // (decision 2). `led_strip` already had a registry row — it is what
  // `engine/ledStrips.js lightingBomLines()` emits — and this is the first
  // time `computeCabinet()` itself emits one, so the ROLE map has to know it
  // as well as the lighting map does. Same part, same product, one row.
  watch_insert: 'watch_insert',
  led_strip: 'led_strip',
  // `hw(\`wardrobe_kit_\${kit.kind}\`, …)` — one role per WARDROBE_KIT_KINDS
  // entry. A template literal is still a role string a BOM has to know.
  wardrobe_kit_trouser: 'kit_trouser',
  wardrobe_kit_tie_rack: 'kit_tie_rack',
  wardrobe_kit_pulldown_rail: 'kit_pulldown_rail',
};

/**
 * The lines `engine/bomInvoice.js` SYNTHESISES rather than reads off the
 * engine — a hinge has a plate, a rail has two supports, a front leg has a
 * plinth clip. They are counted from the engine's own answer (its hinge count,
 * its `rail_bracket` drills, its front legs), never invented, and turn 32's
 * invoice has printed them for four turns. They get registry rows so the same
 * quantities can be ASSIGNED a product rather than only named.
 */
export const INVOICE_TO_PART_ID = {
  hinge_plates: 'hinge_plate',
  rail_supports: 'rail_support',
  plinth_clips: 'plinth_clip',
  plinth_clip_connectors: 'plinth_clip_connector',
  ready_boxes: 'ready_drawer_box',
};

// `engine/ledStrips.js lightingBomLines()` role → part id.
export const LIGHTING_TO_PART_ID = {
  led_strip: 'led_strip',
  led_driver: 'led_driver',
  led_switch: 'led_switch',
  led_spots: 'led_spot',
};

// ─── EDGING: WHICH OF THE THREE METRE LINES A PANEL'S BANDING GOES ON ───────
//
// The engine has already decided WHICH edges are banded and HOW LONG the run
// is. This only says which of the three edging products pays for it, and it is
// read off the part id so it can never disagree with the board decision above.
const EDGE_OF_PART = {
  carcase_side: 'edge_carcase',
  carcase_horizontal: 'edge_carcase',
  back: 'edge_carcase',
  plinth: 'edge_carcase',
  top_box_carcase: 'edge_carcase',
  drawer_box_side: 'edge_carcase',
  drawer_bottom: 'edge_carcase',
  shelf: 'edge_shelf',
  partition: 'edge_shelf',
  door: 'edge_front',
  drawer_front: 'edge_front',
  false_front: 'edge_front',
  end_panel: 'edge_front',
  infill: 'edge_front',
  mask: 'edge_front',
};

/** Which edging part pays for this part's banding, or null when none does. */
export function edgePartFor(partId) {
  return EDGE_OF_PART[partId] || null;
}

// ─── LEGACY ID → CANONICAL ──────────────────────────────────────────────────
//
// Cabinet Core has had a flat `BOM_ROLES` assignment map since turn 3, saved
// under `cc.assignments.v2` in every joiner's browser. Those ids are the ROLES
// the engine puts on a panel, not the parts a joiner buys, and this is the
// bridge — Production Core's `legacyToCanonical`, with cabinet nouns.
//
// SANCTITY (iron rule 3): nothing is deleted and nothing is lost. A workshop
// that assigned a board to `side` two turns ago opens the new modal with that
// board already on `carcase_side`.
const LEGACY_ID_MAP = {
  side: 'carcase_side',
  top: 'carcase_horizontal',
  bottom: 'carcase_horizontal',
  back: 'back',
  shelf: 'shelf',
  front: 'door',
  drawer_box: 'drawer_box_side',
  plinth: 'plinth',
  infill: 'infill',
  end_panel: 'end_panel',
  hinges: 'hinge',
  runner_pairs: 'runner',
  runner_sync_rods: 'runner_sync_rod',
  legs: 'leg',
  rail: 'rail_tube',
  shelf_pins: 'shelf_pin',
  hangers: 'hanger',
};

/**
 * `legacyToCanonical('side')` → `{ key: 'carcase_side', variantKey: null }`
 * `legacyToCanonical('shelf@wardrobe')` → `{ key: 'shelf', variantKey: 'wardrobe' }`
 *
 * The `@variant` suffix is the flat view's own notation (`expandAssignments`
 * writes it), so a value read out of the flat map can be written back through
 * the same door it came out of.
 */
export function legacyToCanonical(id) {
  const raw = String(id ?? '');
  const at = raw.indexOf('@');
  if (at > 0) {
    const key = raw.slice(0, at);
    const variantKey = raw.slice(at + 1);
    return {
      key: PART_REGISTRY[key] ? key : (LEGACY_ID_MAP[key] || key),
      variantKey: VARIANT_ORDER.includes(variantKey) ? variantKey : null,
    };
  }
  if (PART_REGISTRY[raw]) return { key: raw, variantKey: null };
  return { key: LEGACY_ID_MAP[raw] || raw, variantKey: null };
}

// ─── ASSIGNMENTS, SCHEMA 2 ──────────────────────────────────────────────────
//
//   { schema: 2,
//     base:      { [partId]: { material_id, yield, category, subcategory } },
//     overrides: { [partId]: { [family]: { … } } },
//     customParts: [ { id, name, unit, qtyPerUnit } ],
//     auto:      { [partId]: true } }
//
// CLAUDE.md F2 prints `schema: 1` in its code block and calls it "the schema-2
// shape copied from Production Core" in the sentence above it. The two halves
// of that paragraph disagree; the SHAPE is what the spec is describing, and the
// shape is schema 2 — which is also what Production Core writes and what
// Cabinet Core has already been writing under `cc.assignments.v2` since turn 3.
// A blob stamped `schema: 1` is read here without complaint, so neither reading
// loses data.
export const ASSIGNMENT_SCHEMA = 2;

const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** One assignment value, cleaned: never a NaN yield, never a stray key. */
function cleanValue(val) {
  const y = Number(val?.yield);
  return {
    material_id: val?.material_id ?? '',
    yield: Number.isFinite(y) && y > 0 ? y : 1.0,
    category: val?.category || '',
    subcategory: val?.subcategory || '',
    ...(val?.auto ? { auto: true } : {}),
  };
}

/**
 * Any shape in, canonical schema-2 out. Idempotent — `normalize(normalize(x))`
 * is `normalize(x)`, which is what makes it safe to call on every read.
 *
 * Three inputs are accepted and this is deliberate:
 *   • schema 2 (or the spec's `schema: 1` stamp)  — passed through, cleaned.
 *   • Cabinet Core's own flat `{ side: {...} }`   — turn 3's shape.
 *   • Production Core's `{ base, overrides }` without a stamp.
 */
export function normalizeAssignments(raw) {
  if (!isObj(raw)) return { schema: ASSIGNMENT_SCHEMA, base: {}, overrides: {}, customParts: [], auto: {} };

  // A blob that carries ANY canonical key is canonical. `customParts` and
  // `auto` count: a project whose only assignment is one custom consumable has
  // no `base` yet, and reading it as turn 3's flat role map would drop the row
  // on the floor.
  const hasCanonicalShape = isObj(raw.base) || isObj(raw.overrides)
    || Array.isArray(raw.customParts) || isObj(raw.auto) || raw.schema != null;
  const out = {
    schema: ASSIGNMENT_SCHEMA, base: {}, overrides: {}, customParts: [], auto: {},
  };

  if (hasCanonicalShape) {
    for (const [id, val] of Object.entries(raw.base || {})) {
      if (!isObj(val)) continue;
      // A CUSTOM part id (F8) is not in the registry and must not be mapped
      // through the legacy table — it is its own key and stays its own key.
      const { key } = legacyToCanonical(id);
      // First writer wins. TOP and BOTTOM both collapse onto
      // `carcase_horizontal`, and a legacy blob may carry a value for each; the
      // one that arrives first is kept rather than silently overwritten, so the
      // migration is deterministic and never depends on key order luck.
      if (!out.base[key]) out.base[key] = cleanValue(val);
    }
    for (const [id, byVariant] of Object.entries(raw.overrides || {})) {
      if (!isObj(byVariant)) continue;
      const { key } = legacyToCanonical(id);
      for (const [variant, val] of Object.entries(byVariant)) {
        if (!isObj(val) || !VARIANT_ORDER.includes(variant)) continue;
        out.overrides[key] = out.overrides[key] || {};
        if (!out.overrides[key][variant]) out.overrides[key][variant] = cleanValue(val);
      }
    }
    out.customParts = (Array.isArray(raw.customParts) ? raw.customParts : [])
      .filter(isObj)
      .map((cp) => ({
        id: String(cp.id || ''),
        name: String(cp.name || '').trim() || 'Custom consumable',
        unit: cp.unit || 'pcs',
        qtyPerUnit: Number(cp.qtyPerUnit ?? cp.qtyPerWindow) > 0 ? Number(cp.qtyPerUnit ?? cp.qtyPerWindow) : 1,
      }))
      .filter((cp) => cp.id);
    for (const [id, on] of Object.entries(isObj(raw.auto) ? raw.auto : {})) {
      if (on) out.auto[legacyToCanonical(id).key] = true;
    }
    return out;
  }

  // A FLAT map: turn 3's shape, and Production Core's legacy shape too.
  for (const [id, val] of Object.entries(raw)) {
    if (!isObj(val)) continue;
    const { key, variantKey } = legacyToCanonical(id);
    if (variantKey) {
      out.overrides[key] = out.overrides[key] || {};
      if (!out.overrides[key][variantKey]) out.overrides[key][variantKey] = cleanValue(val);
    } else if (!out.base[key]) {
      out.base[key] = cleanValue(val);
      if (val.auto) out.auto[key] = true;
    }
  }
  return out;
}

/**
 * The FLAT, inheritance-applied view: every part id resolves to its effective
 * assignment, and `partId@family` resolves to the family's own.
 *
 * Production Core keeps this for the same reason: the panel, the counter and
 * every flat consumer keep working unchanged, and "assign base once → every
 * family covered" becomes VISIBLE rather than a rule you have to know.
 */
export function expandAssignments(data) {
  const d = normalizeAssignments(data);
  const flat = {};
  for (const [key, val] of Object.entries(d.base)) {
    flat[key] = { ...val };
    for (const variant of VARIANT_ORDER) {
      flat[`${key}@${variant}`] = { ...(d.overrides?.[key]?.[variant] || val) };
    }
  }
  // An override whose part has no base yet still surfaces — otherwise a joiner
  // who set a wardrobe-only board before setting the project default would
  // watch it vanish.
  for (const [key, byVariant] of Object.entries(d.overrides || {})) {
    for (const [variant, val] of Object.entries(byVariant)) {
      const id = `${key}@${variant}`;
      if (!flat[id]) flat[id] = { ...val };
    }
  }
  // ─── THE LEGACY ALIASES, AND WHY THEY ARE NOT OPTIONAL ────────────────────
  //
  // `engine/bom.js materialDemand()` has looked up `assignments[role.role]`
  // since turn 3 — `side`, `top`, `front`, `drawer_box` — and `hardwareDemand`
  // looks up the engine's hardware role. Both are shipping code with shipping
  // callers, and iron rule 3 says zero removals.
  //
  // So the flat view answers to BOTH vocabularies. This is Production Core's
  // own move: its `expandAssignments` writes every legacy id (`head_slim`,
  // `jambs_triple`) into the same flat map beside the canonical key, so the
  // consumers it already had keep working while the new ones read part ids.
  for (const [legacyId, partId] of Object.entries(LEGACY_ID_MAP)) {
    if (flat[legacyId]) continue;              // a real part id of that name wins
    if (flat[partId]) flat[legacyId] = { ...flat[partId] };
  }
  return flat;
}

/**
 * The effective assignment for ONE part in ONE cabinet family.
 * Overrides win, base inherits — Production Core's `assignmentFor`, verbatim.
 */
export function assignmentFor(data, partId, variantKey = null) {
  const d = normalizeAssignments(data);
  const { key, variantKey: fromId } = legacyToCanonical(partId);
  const variant = variantKey || fromId;
  return (variant ? d.overrides?.[key]?.[variant] : null) || d.base?.[key] || null;
}

/** Is this part assigned at all, for this family? */
export function isAssigned(data, partId, variantKey = null) {
  return Boolean(assignmentFor(data, partId, variantKey)?.material_id);
}

/** The yield coefficient in force for a part, defaulting to 1.0. */
export function yieldFor(data, partId, variantKey = null) {
  const y = Number(assignmentFor(data, partId, variantKey)?.yield);
  return Number.isFinite(y) && y > 0 ? y : 1.0;
}

/**
 * SEED A NEW PROJECT FROM THE WORKSHOP'S DEFAULTS (CLAUDE.md F2).
 *
 * *"A project that has never been assigned opens with the defaults already in
 * place, not empty."* — so this fills in only what is MISSING. An assignment a
 * joiner made by hand is never overwritten by a default, in this direction or
 * any other.
 *
 * @param {object} data      the project's assignments (any shape)
 * @param {object} defaults  `profile.materials.defaults` — { [partId]: material_id | {material_id, yield} }
 */
export function seedFromDefaults(data, defaults = {}) {
  const d = normalizeAssignments(data);
  if (!isObj(defaults)) return d;
  for (const [id, raw] of Object.entries(defaults)) {
    const { key } = legacyToCanonical(id);
    if (!PART_REGISTRY[key]) continue;
    if (d.base[key]?.material_id) continue;
    const val = typeof raw === 'string' ? { material_id: raw } : raw;
    if (!isObj(val) || !val.material_id) continue;
    d.base[key] = cleanValue(val);
  }
  return d;
}

/** Every part that has no material behind it, for one family. */
export function unassignedParts(data, variantKey = null, { parts = ALL_PARTS } = {}) {
  return parts.filter((p) => !isAssigned(data, p.id, variantKey));
}

/** Unassigned counts per group — the dots beside the modal's left column. */
export function unassignedByGroup(data, variantKey = null, { parts = ALL_PARTS } = {}) {
  const counts = {};
  for (const g of PART_GROUPS) counts[g.id] = 0;
  for (const p of unassignedParts(data, variantKey, { parts })) {
    counts[p.group] = (counts[p.group] || 0) + 1;
  }
  return counts;
}
