// T78 F21 . the spray schedule, its law, its page and the paint order (the
// owner, 11.10.2026: "cale sprayowanie jako osobne menu Cabinet Core"). The
// spray engine READS the panels every kit cuts and prices the paint; it cuts
// nothing, drills nothing and changes no panel, so it opens no gate and no
// golden can reach it. profile.spray is a block no cut reads.

export const GATES = {};

export const LICENSED = {
  'src/engine/spray.js': {
    why: 'T78 F21: the spray law worked on the engine\'s panels (`sprayRuleFor`, `sprayAreaFor`, `sprayScheduleFor`, the paint order, `withPaints`); a reader of results off profile.spray, it cuts nothing.',
    gates: [],
  },
  'src/engine/drawings/spraySheets.js': {
    why: 'T78 F21: the Spraying PDF sheets in the T71 report frame; drawing only.',
    gates: [],
    drawing: true,
  },
  'src/lib/sprayExport.js': {
    why: 'T78 F21: the Export PDF of the Spraying page; a download, no cut.',
    gates: [],
  },
  'src/engine/warehouse.js': {
    why: 'T78 F21: the Paints department (PAINT_TYPES, PAINT_FIELDS, parseTinSizes, paintOf; migrateMaterial keeps `paint`); the CSV stays the twelve columns; no cut reads it.',
    gates: [],
  },
  'src/lib/warehouseDb.js': {
    why: 'T78 F21: the paint column of the warehouse row (supabase/migrations/t78_warehouse_paint.sql); persistence only.',
    gates: [],
  },
  'src/lib/modalLayer.js': {
    why: 'T78 F21: the spraying modal registered on the layer; UI plumbing.',
    gates: [],
  },
  'src/lib/outputMenu.js': {
    why: 'T78 F21: the Output menu\'s Spraying entry goes live (onOpenSpraying); UI plumbing.',
    gates: [],
  },
  'src/engine/cnc/partLabel.js': {
    why: 'T78 F21: `paintTag`, the paint code beside the part number on the CNC label (`partLabelText` with set2 / openUnit); a label, never a cut; a carcass board prints nothing unless set 2.',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'T78 F21: `paintPurchaseQtys` consumed into the purchase list (litres per sprayed set); the BOM adds lines, the cut list is what it was.',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'T78 F21: two consumable rows, paint_fronts and paint_carcass (unit L, materialType paint); registry only.',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'T78 F21: the `spray` block (wastePct 10, edgesInM2, frameMm 100, the twenty rows, the proposed defaults) and its migrate; no cut reads it.',
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];
