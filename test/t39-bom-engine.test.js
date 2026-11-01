// ─── THE BOM ENGINE (turn 39, CLAUDE.md F5) ─────────────────────────────────
//
// The owner: *"jeśli ten sam wszędzie to połączyć w jedno"*.
//
// F1 collapsed many engine elements into one assignable PART. This is the
// SECOND collapse: many parts into one PURCHASE LINE, keyed on the assigned
// material's id, so if the sides, the top, the bottom, the partitions and the
// shelves all point at one Egger board, the BOM shows ONE line with the summed
// area. There is no special case for it anywhere — it falls out of the key, and
// the first test below is the proof.
//
// CLAUDE.md F5 names five things to test and every one of them is here:
//   two parts on one material merge to one line with summed qty · yield
//   arithmetic · unassigned parts appear as `part:` lines with zero cost ·
//   the sheet estimate rounds up · a two-cabinet project equals the sum of its
//   two single-cabinet BOMs

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  buildBom, buildCabinetPartQtys, mergeUnitMaterials, purchaseBom, sheetsFor,
  sheetFamilyOfPart, resolvePartTotal, formatQty,
} from '../src/engine/bom.js';
import { PART_REGISTRY, partIdForElement } from '../src/engine/partRegistry.js';
import { sheetFamilyOfPanel } from '../src/engine/checks.js';
// T-CC2a: the hinge catalogue of record the app always loads, so a hinge line has its angle and its product.
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';

loadHardwareCatalogues();

// ─── Fixtures ───────────────────────────────────────────────────────────────
//
// T-CC2a (CLAUDE.md T-CC2a laws 2 to 7) REWRITES the purchase-list half of this
// file by name: the list is keyed by the CATALOGUE (engine/catalogue.js) and
// priced through the COMPANY'S LINKS, never by the per-part assignment blob of
// T39. The owner, 01.11.2026, 12:34: *"jedne produkt osobna linia, proste"*.
// Each rewritten test keeps the T39 sentence it stood for where the new law
// still says it (one board, one line; the project is the sum of its cabinets)
// and says the new law where T39's is reversed (a link, not an assignment).

const DESIGN = {
  carcass: {
    types: [
      { id: 'c1', label: 'Carcass 1', source: 'egger', finish_id: 'egger:W1000_9' },
      { id: 'c2', label: 'Carcass 2', source: 'egger', finish_id: 'egger:H3325_28' },
    ],
  },
  fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#5e2129', name: '3005 Wine Red', system: 'RAL' } }] },
};
const WHITE = 'sheet.egger.w1000_9.18';
const STOCK = [
  { id: 's-white', name: 'Egger W1000 ST9 18', unit: 'sheet', price: 41 },
  { id: 's-mdf', name: 'MDF 18', unit: 'sheet', price: 30 },
  { id: 's-pin', name: 'Shelf pin', unit: 'pcs', price: 0.09 },
];
const link = (cc, stock, extra = {}) => [cc, {
  cc_material_id: cc, stock_item_id: stock, yield: null, sheet_width_mm: 2800, sheet_length_mm: 2070, coverage_m2_per_l: null, ...extra,
}];

function cabinet(typeId, extra = {}) {
  const params = { ...defaultParamsFor(typeId, P), unit_num: '01', ...extra };
  return { unit: { id: `u_${typeId}`, type: typeId, params }, result: computeCabinet(params, P) };
}

const WARDROBE = cabinet('WARDROBE', { doors: true, plinth: true, shelves: 3, rail: true });
// ─── TURN 42 (CLAUDE.md F1) ─────────────────────────────────────────────────
// A wardrobe WITH A DRAWER STACK, for the one test whose sentence names
// partitions. The fixture above has no partition any more: its only one was the
// RAIL-PART board — the rail's partitioner, which the engine does not cut. The
// real partition is the horizontal board over a drawer stack, which is what
// that sentence has always meant, so the test gets a cabinet that has one
// rather than the shared fixture being changed under every other test here.
const WARDROBE_WITH_PARTITION = cabinet('WARDROBE', {
  doors: true, plinth: true, shelves: 3, rail: true, drawers: 2,
});
const BUD = cabinet('BUD', { doors: true, plinth: true, shelves: 1 });

const ctx = (links = [], design = DESIGN, profile = P) => ({ links: new Map(links), stock: STOCK, profile, design });
const rowFor = (rows, key) => rows.find((r) => r.key === key);
/** The cut area of a cabinet's pieces on one catalogue board (the cut list's own resolution). */
const cutArea = (entries, id, design = DESIGN, parts = null) => buildBom(entries, { design, profile: P }).cutRows
  .filter((r) => r.catalogue_id === id && (!parts || parts.includes(partIdForElement(r.part))))
  .reduce((s, r) => s + r.area_m2 * r.qty, 0);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-4, `${msg}: ${a} vs ${b}`);

// ─── THE COLLAPSE ───────────────────────────────────────────────────────────

test('two parts on ONE board merge into ONE line with the summed area (T-CC2a: the board is the catalogue entry)', () => {
  const qtys = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  assert.ok(qtys.carcase_side.m2 > 0 && qtys.carcase_horizontal.m2 > 0, 'the fixture must actually have both');
  const rows = mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 's-white')]));
  const line = rowFor(rows, `cat:${WHITE}`);
  assert.ok(line, 'the carcass parts did not merge onto their board');
  near(line.m2, cutArea([WARDROBE], WHITE), 'every piece cut from the board');
  assert.ok(line.m2 >= qtys.carcase_side.m2 + qtys.carcase_horizontal.m2);
  assert.equal(line.status, 'linked');
  assert.ok(line.parts.includes('carcase_side') && line.parts.includes('carcase_horizontal'));
  assert.equal(rows.filter((r) => r.key === `cat:${WHITE}`).length, 1, 'exactly ONE line for that board');
});

test('the owner’s sentence, whole: sides + top + bottom + partitions + shelves, one line', () => {
  const cab = WARDROBE_WITH_PARTITION;   // T42-F1: see the note beside it
  const q = buildCabinetPartQtys(cab.result, cab.unit, { profile: P });
  const want = ['carcase_side', 'carcase_horizontal', 'partition', 'shelf'];
  const line = rowFor(mergeUnitMaterials([cab], ctx([link(WHITE, 's-white')])), `cat:${WHITE}`);
  for (const id of want) assert.ok(line.parts.includes(id), `${id} on the one line`);
  near(cutArea([cab], WHITE, DESIGN, want), want.reduce((s, id) => s + (q[id]?.m2 || 0), 0), 'the four parts\' area');
});

test('different boards do NOT merge: a back moved to its own sheet keeps its own line (T-CC2a F11.2)', () => {
  const moved = { ...DESIGN, boards: { back: { source: 'mdf' }, drawerBottom: null } };
  const rows = mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 's-white')], moved));
  const back = buildBom([WARDROBE], { design: moved, profile: P }).cutRows.filter((r) => r.role === 'back');
  assert.ok(back.length && back.every((r) => r.catalogue_id === 'sheet.mdf.18'), 'the cut list moves the back');
  assert.ok(rowFor(rows, `cat:${WHITE}`) && rowFor(rows, 'cat:sheet.mdf.18'), 'two boards, two lines');
  near(rowFor(rows, 'cat:sheet.mdf.18').m2, cutArea([WARDROBE], 'sheet.mdf.18', moved), 'the back with the plinth on MDF 18, as cut');
  near(rowFor(rows, `cat:${WHITE}`).m2, cutArea([WARDROBE], WHITE) - back.reduce((s, r) => s + r.area_m2 * r.qty, 0), 'the white line lost the back');
});

// ─── Yield ──────────────────────────────────────────────────────────────────

test('the yield is the LINK\'s, applied to the line\'s m2 for the sheet count (T-CC2a law 6)', () => {
  const line = rowFor(mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 's-white', { yield: 1.25 })])), `cat:${WHITE}`);
  assert.equal(line.yield, 1.25);
  assert.equal(line.sheets, Math.ceil((line.m2 * 1.25) / ((2800 * 2070) / 1e6)));
  assert.equal(line.lineCost, line.sheets * 41, 'a per-sheet price costs sheets x price');
});

test('a link with no yield takes the profile\'s 1.10, and a broken yield is the profile\'s too', () => {
  for (const y of [null, undefined, 0, -3, 'x', NaN]) {
    const line = rowFor(mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 's-white', { yield: y })])), `cat:${WHITE}`);
    assert.equal(line.yield, P.materials.sheetYield, `yield ${String(y)}`);
  }
  assert.equal(rowFor(mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 's-white', { yield: 1 })])), `cat:${WHITE}`).yield, 1);
});

test('a piece line is counted in pieces, never by a yield', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const pin = rowFor(mergeUnitMaterials([WARDROBE], ctx([link('shelf-pin.7.5', 's-pin', { yield: 2 })])), 'cat:shelf-pin.7.5');
  assert.equal(pin.qty, q.shelf_pin.pcs);
  assert.equal(pin.sheets, undefined);
  assert.equal(pin.lineCost, Math.round(q.shelf_pin.pcs * 0.09 * 100) / 100);
});

test('resolvePartTotal reads whichever measure the entry carries', () => {
  assert.deepEqual(resolvePartTotal({ m2: 4, unit: 'm²' }, 1.25), { total: 5, unit: 'm²' });
  assert.deepEqual(resolvePartTotal({ m: 10, unit: 'm' }, 1.1), { total: 11, unit: 'm' });
  assert.deepEqual(resolvePartTotal({ pcs: 6, unit: 'pcs' }), { total: 6, unit: 'pcs' });
  assert.deepEqual(resolvePartTotal(null), { total: 0, unit: 'pcs' });
});

// ─── What is missing ────────────────────────────────────────────────────────

test('a line with no link is "Not linked", priced at nothing, and FIRST (T-CC2a law 7)', () => {
  const rows = mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 's-white')]));
  const doors = rows.find((r) => r.roles.includes('front'));
  assert.ok(doors, 'the doors are not linked and must be VISIBLE, not absent');
  assert.deepEqual([doors.status, doors.words, doors.price, doors.lineCost], ['not-linked', 'Not linked', null, null]);
  const firstLinked = rows.findIndex((r) => r.status === 'linked');
  const lastIncomplete = rows.map((r) => r.status !== 'linked').lastIndexOf(true);
  assert.ok(lastIncomplete < firstLinked, 'a linked line came before a not-linked one');
});

test('a link to a stock row the company deleted reads "removed", never priced at zero (T-CC2a law 5)', () => {
  const rows = mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 'deleted_last_year')]));
  const line = rowFor(rows, `cat:${WHITE}`);
  assert.deepEqual([line.status, line.words, line.price], ['removed', 'Not linked (removed from your Joinery Core stock)', null]);
});

test('a BOM with anything not linked is INCOMPLETE, and says so', () => {
  const partial = purchaseBom([WARDROBE], ctx([link(WHITE, 's-white')]));
  assert.equal(partial.totals.complete, false);
  assert.ok(partial.totals.incomplete > 0);
  assert.ok(partial.totals.cost > 0, 'the money that IS known is still shown');
  assert.match(partial.totals.words, /^Incomplete total, \d+ lines? not linked$/);
  const nothing = purchaseBom([WARDROBE], ctx([]));
  assert.equal(nothing.totals.complete, false);
  assert.equal(nothing.totals.cost, 0);
  assert.equal(nothing.rows.every((r) => r.status !== 'linked'), true);
});

test('a fully linked cabinet is COMPLETE and has no incomplete line at all', () => {
  const ids = purchaseBom([WARDROBE], ctx([])).rows.map((r) => r.catalogueId).filter(Boolean);
  const bom = purchaseBom([WARDROBE], ctx(ids.map((id) => link(id, id.startsWith('sheet.mdf') ? 's-mdf' : 's-white'))));
  assert.equal(bom.rows.filter((r) => r.status === 'not-in-catalogue').length, 0, 'every line of this cabinet is in the catalogue');
  assert.equal(bom.totals.complete, true);
  assert.equal(bom.totals.incomplete, 0);
  assert.equal(bom.totals.words, undefined);
  assert.ok(bom.totals.cost > 0);
});

// ─── The sheet estimate ─────────────────────────────────────────────────────

test('the sheet estimate ROUNDS UP — half a sheet is a sheet you bought', () => {
  const sheet = { width: 2800, height: 2070 };          // 5.796 m²
  assert.equal(sheetsFor(0.01, sheet), 1);
  assert.equal(sheetsFor(5.795, sheet), 1);
  assert.equal(sheetsFor(5.796, sheet), 1);
  assert.equal(sheetsFor(5.797, sheet), 2);
  assert.equal(sheetsFor(11.592, sheet), 2);
  assert.equal(sheetsFor(11.593, sheet), 3);
  // Nothing to buy, or no sheet size to measure against, is not zero sheets —
  // it is no answer, and the column stays empty rather than printing 0.
  assert.equal(sheetsFor(0, sheet), null);
  assert.equal(sheetsFor(4, { width: 0, height: 0 }), null);
  assert.equal(sheetsFor(4, null), null);
});

test('a board line counts sheets; a metre or a piece line does not', () => {
  const rows = mergeUnitMaterials([WARDROBE], ctx([link(WHITE, 's-white'), link('edge.egger.w1000_9', 's-pin'), link('shelf-pin.7.5', 's-pin')]));
  assert.ok(rowFor(rows, `cat:${WHITE}`).sheets >= 1);
  assert.equal(rowFor(rows, 'cat:edge.egger.w1000_9').sheets, undefined, 'metres of banding');
  assert.equal(rowFor(rows, 'cat:edge.egger.w1000_9').unit, 'm');
  assert.equal(rowFor(rows, 'cat:shelf-pin.7.5').sheets, undefined, 'pieces');
});

test('the sheet a part is ESTIMATED against is the sheet the engine CHECKS it against', () => {
  // One decider. If these two ever disagree, a cut list passes the fits-the-
  // sheet check against one board and is ordered against another.
  for (const c of [WARDROBE, BUD, cabinet('WUD', { doors: true, bottom_mask: true, mount_height: 1500 }),
    cabinet('BUDR', { doors: true, plinth: true, end_panels: [{ side: 'L' }], top_infill_mm: 200 })]) {
    for (const panel of c.result.panels) {
      const partId = partIdForElement(panel.part, { typeId: c.result.type });
      if (!partId || PART_REGISTRY[partId].unit !== 'm²') continue;
      assert.equal(
        sheetFamilyOfPart(partId), sheetFamilyOfPanel(panel),
        `${panel.part} (${panel.role}) → ${partId}: the BOM and the check disagree about which board it comes off`,
      );
    }
  }
});

test('carcass parts are measured against the carcass board, fronts against the front board (T-CC2a: each board its link\'s size)', () => {
  assert.equal(sheetFamilyOfPart('carcase_side'), 'carcasses');
  assert.equal(sheetFamilyOfPart('shelf'), 'carcasses');
  assert.equal(sheetFamilyOfPart('drawer_box_side'), 'carcasses');
  assert.equal(sheetFamilyOfPart('door'), 'fronts');
  assert.equal(sheetFamilyOfPart('end_panel'), 'fronts');
  assert.equal(sheetFamilyOfPart('mask'), 'fronts');
  // …and the two the engine puts on the carcass board despite their spray.
  assert.equal(sheetFamilyOfPart('plinth'), 'carcasses');
  assert.equal(sheetFamilyOfPart('infill'), 'carcasses');
  // A company whose MDF sheet is SMALL gets more MDF sheets for the same area:
  // the size is the link's (law 6), never the CNC family sheet.
  const rows = mergeUnitMaterials([WARDROBE], ctx([
    link(WHITE, 's-white'), link('sheet.mdf.18', 's-mdf', { sheet_width_mm: 1220, sheet_length_mm: 2440 }),
  ]));
  const mdf = rows.find((r) => r.catalogueId && r.catalogueId.startsWith('sheet.mdf.'));
  const white = rowFor(rows, `cat:${WHITE}`);
  if (mdf.catalogueId === 'sheet.mdf.18') assert.equal(mdf.sheets, Math.ceil((mdf.m2 * 1.10) / ((1220 * 2440) / 1e6)));
  assert.equal(white.sheets, Math.ceil((white.m2 * 1.10) / ((2800 * 2070) / 1e6)));
});

// ─── The project is the sum of its cabinets ─────────────────────────────────

test('a two-cabinet project EQUALS the sum of its two single-cabinet BOMs', () => {
  const links = [link(WHITE, 's-white'), link('sheet.mdf.18', 's-mdf')];
  const both = mergeUnitMaterials([WARDROBE, BUD], ctx(links));
  const a = mergeUnitMaterials([WARDROBE], ctx(links));
  const b = mergeUnitMaterials([BUD], ctx(links));
  const sum = new Map();
  for (const r of [...a, ...b]) sum.set(r.key, (sum.get(r.key) || 0) + r.qty);
  assert.deepEqual(
    [...sum.keys()].sort(), both.map((r) => r.key).sort(),
    'the project has lines the two cabinets do not, or the other way round',
  );
  for (const r of both) near(r.qty, sum.get(r.key), `${r.key} disagrees between project and cabinet`);
});

test('…and so does the money', () => {
  const links = [link(WHITE, 's-white'), link('shelf-pin.7.5', 's-pin')];
  const both = purchaseBom([WARDROBE, BUD], ctx(links));
  const a = purchaseBom([WARDROBE], ctx(links));
  const b = purchaseBom([BUD], ctx(links));
  // Sheets are counted over the WHOLE project (law 6), so a shared board may need fewer sheets than two cabinets apart.
  assert.ok(both.totals.cost <= a.totals.cost + b.totals.cost + 0.02);
  const pins = (pb) => rowFor(pb.rows, 'cat:shelf-pin.7.5').lineCost;
  assert.ok(Math.abs(pins(both) - (pins(a) + pins(b))) < 0.02, 'a piece line\'s money is exactly the sum');
});

test('the same cabinet twice is exactly double one of it', () => {
  const links = [link(WHITE, 's-white', { sheet_width_mm: 100, sheet_length_mm: 100 })];
  const one = rowFor(mergeUnitMaterials([WARDROBE], ctx(links)), `cat:${WHITE}`);
  const two = rowFor(mergeUnitMaterials([WARDROBE, WARDROBE], ctx(links)), `cat:${WHITE}`);
  near(two.m2, one.m2 * 2, 'the area');
  assert.ok(two.sheets >= one.sheets * 2 - 1 && two.sheets <= one.sheets * 2, 'the sheets, counted over the whole project');
});

// ─── A cabinet on its own board reaches the purchase list ──────────────────

test('a wardrobe on its own carcass type buys a different board from the base unit beside it', () => {
  const own = { ...WARDROBE, unit: { ...WARDROBE.unit, params: { ...WARDROBE.unit.params, carcass_type_id: 'c2' } } };
  const rows = mergeUnitMaterials([own, BUD], ctx([]));
  near(rowFor(rows, 'cat:sheet.egger.h3325_28.18').m2, cutArea([own], 'sheet.egger.h3325_28.18'), 'the wardrobe\'s Gladstone Oak');
  near(rowFor(rows, `cat:${WHITE}`).m2, cutArea([BUD], WHITE), 'the base unit\'s white');
});

// ─── The read of the engine ─────────────────────────────────────────────────

test('the quantities come from the ENGINE’s own numbers, not from a re-derivation', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const panels = WARDROBE.result.panels;
  const areaOf = (...parts) => panels
    .filter((p) => parts.includes(p.part))
    .reduce((s, p) => s + p.area_m2 * p.qty, 0);
  assert.equal(q.carcase_side.m2, areaOf('BUL', 'BUR'));
  assert.equal(q.carcase_horizontal.m2, areaOf('TOP', 'BOTTOM'));
  assert.equal(q.back.m2, areaOf('BACK'));
  assert.equal(q.door.m2, areaOf('FRONT'));

  // Edging is READ, not re-derived from a perimeter — CLAUDE.md F5 is explicit.
  const edgeOf = (...parts) => panels
    .filter((p) => parts.includes(p.part))
    .reduce((s, p) => s + p.edging.len_m * p.qty, 0);
  // The FRONT's banding only: a plinth is a BOARD part in the registry
  // (CLAUDE.md F1 files it there) so its banding is carcase edging, and the
  // engine measures a plinth against the carcass sheet for the same reason.
  assert.equal(q.edge_front.m, edgeOf('FRONT'));

  // Hardware counts are the engine's, to the piece.
  const hw = (role) => (WARDROBE.result.hardware || [])
    .filter((h) => h.role === role).reduce((s, h) => s + h.qty, 0);
  assert.equal(q.hinge.pcs, hw('hinges'));
  assert.equal(q.leg.pcs, hw('legs'));
  assert.equal(q.shelf_pin.pcs, hw('shelf_pins'));
  // One plate per hinge, off that same count.
  assert.equal(q.hinge_plate.pcs, hw('hinges'));
});

test('a hanging rail is bought by the METRE, though the engine counts pieces', () => {
  const q = buildCabinetPartQtys(WARDROBE.result, WARDROBE.unit, { profile: P });
  const rail = (WARDROBE.result.hardware || []).find((h) => h.role === 'rail');
  assert.ok(rail, 'the fixture must carry a rail');
  assert.equal(rail.unit, 'pcs');
  assert.equal(q.rail_tube.unit, 'm');
  assert.equal(q.rail_tube.m, (rail.spec.length_mm * rail.qty) / 1000);
});

test('a top box’s carcase is bought on its own row', () => {
  const box = cabinet('WARDROBE_TOP', { doors: true });
  const q = buildCabinetPartQtys(box.result, box.unit, { profile: P });
  assert.ok(q.top_box_carcase?.m2 > 0, 'a top box put nothing on its own row');
  assert.equal(q.carcase_side, undefined);
  assert.equal(q.carcase_horizontal, undefined);
  assert.equal(q.back, undefined);
  // …and its door is still a door.
  assert.ok(q.door?.m2 > 0);
});

test('every part a cabinet produces is a registry part with a unit', () => {
  for (const c of [WARDROBE, BUD, cabinet('BUDR', { doors: true }), cabinet('WUD', { doors: true, shelves: 2 })]) {
    const q = buildCabinetPartQtys(c.result, c.unit, { profile: P });
    for (const [id, entry] of Object.entries(q)) {
      assert.ok(PART_REGISTRY[id], `${id} is not a registry part`);
      assert.equal(entry.unit, PART_REGISTRY[id].unit, id);
      const measures = ['m2', 'm', 'pcs'].filter((k) => entry[k] != null);
      assert.equal(measures.length, 1, `${id} is counted in two currencies: ${measures.join(' + ')}`);
    }
  }
});

test('nothing at all in, nothing at all out — and no throw', () => {
  assert.deepEqual(buildCabinetPartQtys(null, null), {});
  assert.deepEqual(mergeUnitMaterials([], {}), []);
  assert.deepEqual(mergeUnitMaterials(null, {}), []);
  assert.equal(purchaseBom([], {}).totals.complete, true);
  assert.deepEqual(mergeUnitMaterials([{ unit: null, result: null }], {}), []);
});

test('formatQty says pieces whole and everything else to two places', () => {
  assert.equal(formatQty(6.0, 'pcs'), '6 pcs');
  assert.equal(formatQty(6.4, 'pcs'), '6 pcs');
  assert.equal(formatQty(3.9648, 'm²'), '3.96 m²');
  assert.equal(formatQty(2, 'pairs'), '2 pairs');
  assert.equal(formatQty(null, 'm'), '0.00 m');
});
