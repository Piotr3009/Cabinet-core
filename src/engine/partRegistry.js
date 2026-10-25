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
  // T74 F13 · the free-standing panel: one board in the room, cut from the
  // carcass board and banded all round. Its own row, so a joiner pricing a job
  // sees the boards the client built with apart from the cabinets.
  free_panel: {
    id: 'free_panel', name: 'Free panels', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'Free-standing boards in the room, banded on all four edges (T74 F13)',
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
  front_moulding: {
    id: 'front_moulding', name: 'Applied front mouldings', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'Separate strip stock at its own thickness, bonded to the front with mitred ends',
  },
  false_front: {
    id: 'false_front', name: 'False fronts', group: G('front'), unit: 'm²', materialType: 'front',
    // Kept because CLAUDE.md F1 names the row, and T75 is the day the engine
    // learned to say "FIX": the blind kit's BLANK (F3) is a fixed front piece
    // beside the door, front material, no hinge, and it lands here.
    // T75 F14 · …and the hob unit's dummy over its drawers, the same piece.
    note: 'FIX fronts: the blind corner\'s blank (T75 F3) and the hob unit\'s dummy (T75 F14)',
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
  // T80 F3 · the in-frame frame: ONE routed MDF board per run, sprayed with the
  // fronts (the owner, 21.10.2026: *"raczej plyta"*). Its own row: it is 25 and
  // the doors in it are 22, so it is not bought as a door.
  frame: {
    id: 'frame', name: 'In-frame frames', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'One routed frame per run, the openings cut through (T80); no banding, the edges are painted',
  },
  // T82 F2 · the HAWA pocket's two panels (KIT_HAWA.lsp D3): the owner,
  // 25.10.2026, *"panele po bokach to jest nie carcas tylko front zawsze, wiec
  // jesli jest 18 mm to daj zawsze 22 mm"*. Front material; their own row,
  // because on an 18 front they are 22 and so not cut from the doors' board.
  pocket_panel: {
    id: 'pocket_panel', name: 'HAWA pocket panels', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'POCKET-A and POCKET-B: the front material, 22 when the front is 18 (T82, KIT_HAWA.lsp)',
  },
  // T75 F10 · the back panel on an island's empty long face, front material.
  back_panel: {
    id: 'back_panel', name: 'Back panels', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'The board on an island face no cabinet stands against (T75 F10)',
  },
  // T75 F15 · the plain pelmet: a strip in the door plane under a run of wall
  // units, front material, cut (a cut list line), its returns with it.
  pelmet: {
    id: 'pelmet', name: 'Pelmet', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'The strip under a run of wall units, hiding the light',
  },
  // T75 F5 · the worktop's upstand along the wall, cut from worktop material.
  upstand: {
    id: 'upstand', name: 'Upstands', group: G('board'), unit: 'm²', materialType: 'board',
    note: 'The strip on the worktop against the wall, worktop material (T75 F5)',
  },
  // T75 F2 · the corner post: a front-material board in the door plane of the
  // run that stops on the corner (`engine/corners.js`).
  corner_post: {
    id: 'corner_post', name: 'Corner posts', group: G('front'), unit: 'm²', materialType: 'front',
    note: 'The board in the door plane at an internal corner, beside the run that stops on the corner',
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
  // T75 F12 · the machine an appliance tower's aperture is ordered for (oven,
  // microwave, washer, dryer, fridge freezer): bought, one line per aperture.
  appliance: {
    id: 'appliance', name: 'Appliance', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'The machine an appliance tower\'s aperture is built around',
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
  // ─── TURN 58 (CLAUDE.md F2): THE SHOE DRAWER'S INSERT ──────────────────
  //
  // The same shape as the watch line above and for the same reason: the ramp
  // and its two dividers are CUT — they are in the cut list and on the sheet
  // like every other board — so this line is the ASSEMBLY, one per drawer
  // that carries one.
  //
  // NOTE on `drawer_insert` above, whose note still reads "Shoe insert …
  // a bought tray": that was written when the shoe was a bought insert. It is
  // left standing (nothing is deleted without licence) and is not what a shoe
  // drawer resolves to any more — this row is.
  shoe_insert: {
    id: 'shoe_insert', name: 'Shoe drawer insert', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Cut, not bought — the ramp and its two dividers are on the sheet. One line per shoe drawer',
  },
  kit_trouser: {
    id: 'kit_trouser', name: 'Trouser pull-out', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought wardrobe mechanism',
  },
  kit_tie_rack: {
    id: 'kit_tie_rack', name: 'Tie rack', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought wardrobe mechanism',
  },
  // T75 F19 · the two bought fittings Add items gained, ordered as the others are.
  kit_hooks: {
    id: 'kit_hooks', name: 'Hooks', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought wardrobe fitting: one line, the row\'s count of hooks, zero holes',
  },
  kit_valet_rod: {
    id: 'kit_valet_rod', name: 'Valet rod', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought wardrobe mechanism: a pull-out rod, zero holes',
  },
  // T78 F9 · the L corner unit's carousel (the owner: *"krecacy sie naroznik
  // na garnki w srodku"*): bought, one line per L, a placeholder body, zero holes.
  kit_carousel: {
    id: 'kit_carousel', name: 'Carousel', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought corner mechanism: round trays on a post in the L\'s inner corner, zero holes',
  },
  // T78 F7 · the L's SPACE CORNER kit (the owner: *"szuflady w narozniku L
  // shape"*): the corner front pieces and the rear fixing bracket of a drawer
  // row, one line per row, a placeholder body, zero holes.
  // T78 F8 · the bi-fold corner hinge (the owner: *"zawiasy podwojne czyli
  // jedne drzwiczki do carcasu a pozniej zawiasy od drzwiczek do drzwiczek"*):
  // bought, counted per hinge row of leaf B, zero holes until the catalogue's
  // cup pattern is in reference/hardware/blum-hinges.json.
  hinge_bifold: {
    id: 'hinge_bifold', name: 'Bi-fold corner hinge', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Blum CLIP top 60 degree bi-fold corner hinge: leaf B hangs on leaf A, a line and a body, zero holes',
  },
  // T78 F11 · the Hafele blind-corner pull-out (the owner: *"hafele naroznik
  // slepy czyli wysuwane"*): bought, one line per blind kit, a placeholder body
  // of two wire trays, zero holes.
  kit_blind_pullout: {
    id: 'kit_blind_pullout', name: 'Blind corner pull-out', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought blind-corner mechanism (Hafele): two wire trays swinging out of the blind part, zero holes',
  },
  kit_space_corner: {
    id: 'kit_space_corner', name: 'SPACE CORNER kit', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'A bought corner drawer mechanism (Blum SPACE CORNER): joins the two boxes of an L drawer row, zero holes',
  },
  // ─── T78 F18 · THE LIFT-UP WALL UNIT'S BOUGHT LIFT (BLUM AVENTOS) ────────
  // The owner: *"szafki poziome otwierane do gory system blum ... podwojne
  // drzwi pojedyncze etc."*  Five lines a lift unit orders (engine/
  // liftSystems.js liftPlanFor, off reference/hardware/aventos.json): the
  // lift mechanism set, the lever arm set (HS, HL, HF), the cover cap set,
  // the front fixing bracket set, and the HF top's hinge set. A line and a
  // body, zero holes (the fixing patterns are null in the catalogue file).
  lift_mechanism: {
    id: 'lift_mechanism', name: 'AVENTOS lift mechanism set', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'Blum AVENTOS HK / HS / HL / HF top lift mechanism set (two mechanisms), chosen off the catalogue file by power factor or by cabinet height and front weight; owner to confirm',
  },
  lift_lever_arm: {
    id: 'lift_lever_arm', name: 'AVENTOS lever arm set', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'The HS / HL / HF top lever arm set, by cabinet height; the HK top has none',
  },
  lift_cover_caps: {
    id: 'lift_cover_caps', name: 'AVENTOS cover cap set', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One set per lift unit (22K8000 for the HK top, 22.8000 for HS / HL / HF top), owner to confirm',
  },
  lift_front_bracket: {
    id: 'lift_front_bracket', name: 'AVENTOS front fixing bracket set', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One set (two brackets) per lift leaf; its holes on the leaf are marked with the ZML.2200 template, never bored here',
  },
  hinge_aventos_hf: {
    id: 'hinge_aventos_hf', name: 'AVENTOS HF hinge set', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'CLIP top 120 degree unsprung hinge and centre hinge of the HF top bi-fold, counted per the catalogue rule; cup pattern not read, zero holes',
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
  // ─── T82 F4 · THE HAWA POCKET'S ORDER LINES (engine/cnc/hawa.js) ─────────
  // CLAUDE.md T82 F4, KIT_HAWA.lsp D22: one set per door, one connector per
  // pocket, the set's own hinges, the tracks cut to T1 - 7, the III/35 steel
  // profile, one adjustable foot. The only article the documents give is the
  // NBS sheet's 408.30.711 (III/25-35 Push, left); the rest are the owner's
  // to fill (profile.hawa.articles), so each is a product to assign here.
  hawa_set: {
    id: 'hawa_set', name: 'HAWA Concepta III sets', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One set per pocket door, by class (III/25, III/35), Push or Pull and HAWA\'s hand (T82, KIT_HAWA.lsp D16 D19)',
  },
  hawa_connector: {
    id: 'hawa_connector', name: 'HAWA Connectors', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One per pocket: Connector 55 for one door, Connector 110 for two (31418)',
  },
  hawa_hinge: {
    id: 'hawa_hinge', name: 'HAWA Concepta III hinges', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'The set\'s own: 3 a door for III/25, 4 for III/35 (52676); no plate, never a house cup hinge',
  },
  hawa_track: {
    id: 'hawa_track', name: 'HAWA top and bottom tracks', group: G('hardware'), unit: 'pairs', materialType: 'hardware',
    note: 'One pair per door, cut to T1 - 7 (at most 560), from 5 behind panel B\'s front edge (160704, 52676)',
  },
  hawa_steel_profile: {
    id: 'hawa_steel_profile', name: 'HAWA steel stiffening profiles', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'III/35 only: one per routed groove of the door, TB - M + 3 long (160704 "Stahlprofil")',
  },
  hawa_foot: {
    id: 'hawa_foot', name: 'Adjustable feet under a pocket', group: G('hardware'), unit: 'pcs', materialType: 'hardware',
    note: 'One per pocket, in the bottom board\'s fi 35 hole (160704 "Recommendation: use adjustable foot", 169313)',
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
  // T78 F20 · the Cabineo connector and its cover cap: order lines of a
  // Cabineo unit (engine/cabineo.js cabineoHardwareLines, pushed by
  // computeCabinet), counted off the engine's pockets, never recomputed. The
  // articles are NOT on Lamello's sheet (reference/hardware/cabineo/
  // cabineo.json: null), so the product is the workshop's assignment, as
  // every hardware row here is.
  cabineo_connector: {
    id: 'cabineo_connector', name: 'Cabineo connectors', group: G('consumable'), unit: 'pcs', materialType: 'consumable',
    note: 'One per Cabineo pocket (8 or 12, the company default); article owner to supply',
  },
  cabineo_cap: {
    id: 'cabineo_cap', name: 'Cabineo cover caps', group: G('consumable'), unit: 'pcs', materialType: 'consumable',
    note: 'One per Cabineo pocket under caps all, per fixed-shelf pocket under caps shelves; article owner to supply',
  },
  // T78 F21 - THE PAINT OF THE SPRAYED SETS, by the LITRE (CLAUDE.md PART F).
  // Set 1 is the fronts and every element of the spray law (doors, drawer
  // fronts, end panels, plinths, infills, masks, posts, blanks, strips,
  // pelmets, cornices, open shelves); set 2 is a veneer or sprayed CARCASS.
  // The quantity is the spray schedule's (engine/spray.js paintPurchaseQtys:
  // m2 x coats / coverage + the waste), never typed; the material is a row of
  // the warehouse's Paints department, offered to the picker by
  // engine/spray.js withPaints with `category: 'paint'`.
  paint_fronts: {
    id: 'paint_fronts', name: 'Paint, set 1 (fronts and run pieces)', group: G('consumable'), unit: 'L', materialType: 'paint',
    note: 'Litres off the spray schedule for the fronts, the run pieces and every element of the spray law (T78 F21)',
  },
  paint_carcass: {
    id: 'paint_carcass', name: 'Paint, set 2 (veneer or sprayed carcass)', group: G('consumable'), unit: 'L', materialType: 'paint',
    note: 'Litres off the spray schedule for the inside faces of a veneer or sprayed carcass (T78 F21)',
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
  // T82 F9 · the vanity's two rails (KIT_VANITY.lsp D2): what is left of its
  // back, but in the CARCASS board (the owner: *"4 - 100 na material carcasa
  // grubosc"*), so they are bought with the carcass horizontals, as the sink's
  // holders are, never with the back.
  'RAIL-BOTTOM': 'carcase_horizontal',
  'RAIL-TOP': 'carcase_horizontal',

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
  // T58 (CLAUDE.md F2): the shoe drawer's ramp and its two dividers. CUT
  // boards, so they are mapped like the boards they are — an unmapped part
  // name is silently dropped from every BOM, which is what this table exists
  // to make impossible.
  'SHOE-RAMP': 'shoe_insert',
  'SHOE-DIVIDER': 'shoe_insert',

  // Partitions — horizontal, vertical, and the one that carries a rail.
  PARTITION: 'partition',
  VPART: 'partition',
  // T42-F1: `'RAIL-PART': 'partition'` DELETED. The engine cannot emit that
  // panel any more — the owner's rail partitioner is gone — and this file's own
  // invariant (`test/t39-part-registry.test.js`, "the registry maps nothing the
  // engine cannot emit") is what says an orphan row may not stand here.

  PLINTH: 'plinth',

  // T80 F3 · the in-frame frame of a run (FRAME, or FRAME-1 .. FRAME-n when joined).
  FRAME: 'frame',

  // Fronts.
  FRONT: 'door',
  'DRAWER-FRONT': 'drawer_front',
  'FRONT-MOULDING': 'front_moulding',

  // The pieces that FINISH a run. Front material since turn 6, and each its own
  // row because a workshop prices a 2.4 m filler differently from a door.
  'END-PANEL': 'end_panel',
  INFILL: 'infill',
  MASK: 'mask',
  // T75 F2 · the corner post.
  'CORNER-POST': 'corner_post',
  // T75 F5 · the worktop's upstand.
  UPSTAND: 'upstand',
  // T75 F3 · the blind kit's blank: a FIX front.
  'BLIND-BLANK': 'false_front',
  // T75 F14 · the hob unit's dummy: the same FIX front.
  'FALSE-FRONT': 'false_front',
  // T75 F7 · the corner notch's box (KIT_NOTCH.lsp D1, D2), carcass board
  // standing where the carcass's own boards stand: the RETURN is the side of
  // the full-depth part, the STEP the shallow part's own back (the BACK's
  // corner, moved forward), the LID a horizontal over a part-height notch.
  // T75 F15 · the pelmet's strip and its returns.
  'NOTCH-RETURN': 'carcase_side',
  'NOTCH-STEP': 'back',
  PELMET: 'pelmet',
  'NOTCH-LID': 'carcase_horizontal',
  // T79 F4 (KIT_NOTCH.lsp D21) · the FLOOR under a notch from the top, the LID's twin.
  'NOTCH-FLOOR': 'carcase_horizontal',
  // T74 F13 · the free-standing panel's one board.
  'FREE-PANEL': 'free_panel',
  // T82 F2 · the HAWA pocket (KIT_HAWA.lsp D20): the two panels in the front
  // material, the bottom and the top as a carcass's horizontals, the door as
  // a door.
  'POCKET-A': 'pocket_panel',
  'POCKET-B': 'pocket_panel',
  'POCKET-TOP': 'carcase_horizontal',
  'POCKET-BOTTOM': 'carcase_horizontal',
  'POCKET-DOOR': 'door',

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
  // T78 F20 · the Cabineo order lines (engine/cabineo.js, pushed by computeCabinet's `hw`).
  cabineo_connector: 'cabineo_connector',
  cabineo_cap: 'cabineo_cap',
  runner_pairs: 'runner',
  runner_sync_rods: 'runner_sync_rod',
  legs: 'leg',
  rail: 'rail_tube',
  shelf_pins: 'shelf_pin',
  hangers: 'hanger',
  bin_pullout: 'bin_pullout',
  cargo_frame: 'cargo_frame',
  extractor: 'extractor',
  appliance: 'appliance',
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
  // T75 F19 · the two kinds WARDROBE_KIT_KINDS gained.
  wardrobe_kit_hooks: 'kit_hooks',
  wardrobe_kit_valet_rod: 'kit_valet_rod',
  // T78 F9 · `hw(kit.kind, …)` for CORNER_KIT_KINDS: the L's carousel.
  carousel: 'kit_carousel',
  // T78 F7 · `hw('space_corner', …)`, one per L drawer row.
  space_corner: 'kit_space_corner',
  // T78 F11 · `hw(kit.kind, …)` for BLIND_KIT_KINDS: the blind kit's pull-out.
  blind_pullout: 'kit_blind_pullout',
  // T78 F8 · `hw('bifold_hinges', …)`, leaf B's hinge rows.
  bifold_hinges: 'hinge_bifold',
  // T78 F18 · `hw('lift_*', …)`, the lift-up wall unit's bought lift.
  lift_unit: 'lift_mechanism',
  lift_arm: 'lift_lever_arm',
  lift_caps: 'lift_cover_caps',
  lift_bracket: 'lift_front_bracket',
  lift_hinges: 'hinge_aventos_hf',
  // T82 F4 · `hw('hawa_*', ...)`, the HAWA pocket's order lines (engine/cnc/hawa.js).
  hawa_set: 'hawa_set',
  hawa_connector: 'hawa_connector',
  hawa_hinges: 'hawa_hinge',
  hawa_tracks: 'hawa_track',
  hawa_stiffener: 'hawa_steel_profile',
  hawa_foot: 'hawa_foot',
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
  // T74 F13 · a free panel's four seen edges are banded as a shelf's is.
  free_panel: 'edge_shelf',
  door: 'edge_front',
  drawer_front: 'edge_front',
  false_front: 'edge_front',
  front_moulding: 'edge_front',
  end_panel: 'edge_front',
  infill: 'edge_front',
  mask: 'edge_front',
  // T75 F15 · the pelmet is banded as the mask is: front edging.
  pelmet: 'edge_front',
  corner_post: 'edge_front',
  upstand: 'edge_carcase',
  back_panel: 'edge_front',
  // T80 F3 · the in-frame frame is never banded (its edges are painted); the
  // row is here so a frame that ever were would pay for it as a front does.
  frame: 'edge_front',
  // T82 F2 · the HAWA pocket panels are banded as an end panel is: front edging.
  pocket_panel: 'edge_front',
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
