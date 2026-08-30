import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { CNC_LAYERS } from '../src/engine/cnc/layers.js';
import { CHECKS, runChecks } from '../src/engine/checks.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { canonical } from '../scripts/t54-classify.mjs';

// ─── T54 · F7 — THE SHOE BECOMES A DRAWER; THE PARALLEL WORLD DIES ─────────
//
// The owner, screenshot in hand: *"prosiłem żeby cała szuflada miała logikę
// szuflad, czyli wiercenie, runners etc etc, głębokość etc — tylko wysokość
// miała być mniejsza. usuń stary kod na shoes i zrób z logiką drawers."*
// That sentence is licence 2 and the whole design.
//
// THE GRAVES, NAMED (licence 2): `engine/shoeBox.js` whole; the shoe
// emission block, `shoeBoxBoxFor`, the drill pass, the BOM line and the
// assemblies key in `cabinet.js`; the steps and battens and their DXF names
// (SHOEBOX-SL/-SR/-BK/-BF/-BT/-DV/-BATTEN-L/-BATTEN-R/-FR); Check #12's
// hinge-collision rule over the dead geometry (the number re-used for the
// migration notice); the SHOE_GROOVE_6MM / SHOE_RUNNER_5MM layers and
// machining classes; the `shoe_box_carcase` / `shoe_runner` registry rows;
// the `wardrobeAccessories.shoeBox` constants and the side-shoe runner
// family; `reference/lisp/KIT_SHOE_BOX.lsp` (the paren walk ends at 13,
// derived). The tilted shoe SHELF (15°, T33) is a DIFFERENT entity and is
// NOT touched.
//
// THIS FILE REPLACES the old shoe tests, each named here as F7.1 asks:
//   · turn34-f4-shoe-box.test.js and turn34-f4-shoe-box-cnc.test.js
//     (the old world's geometry and CNC — the world is gone);
//   · turn36-f3-shoe-front-switch.test.js (the front switch died with the
//     fixed 120 face — the shoe front IS a drawer front now);
//   · turn37-f6-shoe-front.test.js (battens and reveal — DECISION TAKEN,
//     veto "T37 zostaje": the 10 mm reveal is NOT restored);
//   · turn53-f7-the-shoe-front-joins-the-drawer-law.test.js (its claim —
//     the face on the drawer plane with the stack's gap — is now true BY
//     CONSTRUCTION and asserted below).
//
// DECISIONS TAKEN for the owner, veto in one line each: the bottom is FLAT
// and standard (veto "spadek dna zostaje"); side height 80 (veto "inna
// wysokość: N"); the front obeys the drawer-front law (veto "T37 zostaje").

const store = () => useProjectStore.getState();
const DR = P.wardrobe.drawers;
const SHOE_FRONT = DR.shoeSideMm + DR.frontToSideDelta; // 80 + 36 = 116

const wardrobeWith = (items) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 900,
  sections: [{ width_mm: 900, items }],
}, P);

test('F7.2 · the ONE override: the shoe drawer\'s side is the law\'s 80', () => {
  assert.equal(DR.shoeSideMm, 80, 'his old number (veto "inna wysokość: N")');
  const r = wardrobeWith([
    { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
    { id: 's1', kind: 'drawer', index: 2, height_mm: SHOE_FRONT, variant: 'shoe' },
  ]);
  const side = (n) => r.panels.find((p) => p.part === 'DRAWER-SIDE' && p.meta?.drawer === n && p.meta?.side === 'L');
  assert.equal(side(2).h, 80, 'the shoe side is 80');
  assert.equal(side(1).h, 200 - DR.frontToSideDelta, 'the plain drawer keeps its own law');
  // FLAT bottom, standard: no tilt, no battens, no steps (veto "spadek dna
  // zostaje" — refused: "cała logika szuflad" leaves no floor slope).
  const bottom = r.panels.find((p) => p.part === 'DRAWER-BOTTOM' && p.meta?.drawer === 2);
  assert.ok(bottom, 'a standard drawer bottom');
  assert.equal(bottom.meta?.tilt_deg, undefined, 'flat');
  assert.equal(r.panels.filter((p) => /BATTEN|SHOEBOX/.test(p.id)).length, 0, 'no battens, no old boards');
});

test('F7.6 · board for board: a shoe drawer IS a plain drawer of the same numbers', () => {
  // The whole claim, made byte-sharp: a plain drawer whose FRONT height puts
  // its side at the shoe's own 80 (116 − 36 = 80) and the shoe drawer must
  // cut the SAME boards — every field — except what names the variant.
  const plain = wardrobeWith([{ id: 'd1', kind: 'drawer', index: 1, height_mm: SHOE_FRONT }]);
  const shoe = wardrobeWith([{ id: 'd1', kind: 'drawer', index: 1, height_mm: SHOE_FRONT, variant: 'shoe' }]);
  const boards = (r) => r.panels
    .filter((p) => p.role === 'drawer_box' || p.part === 'DRAWER-FRONT')
    .map((p) => ({ ...p, meta: { ...p.meta, variant: undefined } }));
  assert.equal(boards(plain).length, 6, 'two sides, box front, box back, bottom — plus the front');
  assert.equal(canonical(boards(plain)), canonical(boards(shoe)),
    'sides, back, bottom, front, pockets, grooves — field by field, the same cut');
  // …the hole pattern in the carcass is the same drilling…
  assert.equal(canonical(plain.drills), canonical(shoe.drills), 'every hole, the same');
  // …and the runner is the same Blum pair by the same NL law.
  const runner = (r) => (r.hardware || []).filter((h) => /runner/i.test(String(h.role)) || /runner/i.test(String(h.label)));
  const rp = runner(plain);
  const rs = runner(shoe);
  assert.ok(rp.length >= 1, 'the plain drawer buys a runner');
  assert.equal(canonical(rp), canonical(rs), 'same runner line, article for article');
});

test('F7.3 · the front obeys the drawer-front law — plane, stack split, gap', () => {
  const r = wardrobeWith([
    { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
    { id: 's1', kind: 'drawer', index: 2, height_mm: SHOE_FRONT, variant: 'shoe' },
  ]);
  const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT');
  assert.equal(fronts.length, 2);
  const [f1, f2] = fronts.sort((a, b) => a.box.y - b.box.y);
  assert.equal(f1.box.z, f2.box.z, 'one plane — the shoe face is a drawer front');
  assert.ok(Math.abs((f2.box.y - (f1.box.y + f1.box.h)) - DR.gap) < 1e-6,
    'the stack\'s own gap between them');
  assert.equal(f2.h, SHOE_FRONT, 'the fixed 120 face died with the old world — the front is the stack\'s');
});

test('F7.2 · the column twin: a shoe drawer in a BAY takes the same 80', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 1200,
    sections: [{
      width_mm: 1200,
      items: [
        // A full-depth partition (setback 0), so the column can take drawers.
        { id: 'p1', kind: 'partition', x_mm: 600, front_mm: 0 },
        { id: 's1', kind: 'drawer', index: 1, zone: 0, height_mm: SHOE_FRONT, variant: 'shoe' },
      ],
    }],
  }, P);
  const side = r.panels.find((p) => p.id === 'Z1D1-SL');
  assert.ok(side, 'the bay cut its drawer');
  assert.equal(side.h, 80, 'the same law in a column');
});

// ─── F7.5 · MIGRATION: a saved shoe box loads as a shoe drawer ──────────────

test('F7.5 · a T5x project with the old shoe loads: same zone, stamped, Check names it', () => {
  const ROOM = migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });
  // A saved unit exactly as T34–T53 wrote one: a drawer stack and the old
  // shoe box item above it, in the same (only) zone.
  const saved = [{
    id: 'u1',
    type: 'WARDROBE',
    position: { wall: 0, x_mm: 40, rotation_deg: 0 },
    params: {
      type: 'WARDROBE',
      width: 900,
      height: 2150,
      depth: 568,
      unit_num: 'W01',
      sections: [{
        width_mm: 900,
        items: [
          { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
          { id: 'sb1', kind: 'shoe_box', variant: 'D', dividers: 1, pos_mm: 260 },
        ],
      }],
    },
  }];
  store().loadProject({
    id: null, name: 'a T5x job', number: '53', client: 'the owner', room: ROOM, design: {},
  }, JSON.parse(JSON.stringify(saved)));
  const items = store().units[0].params.sections[0].items;
  const shoe = items.find((i) => i.id === 'sb1');
  assert.ok(shoe, 'the item keeps its id');
  assert.equal(shoe.kind, 'drawer', 'a drawer now');
  assert.equal(shoe.variant, 'shoe');
  assert.equal(shoe.index, 2, 'appended to the same zone\'s stack');
  assert.equal(shoe.height_mm, SHOE_FRONT, 'at the height the side law derives');
  assert.equal(shoe.migrated_from, 'shoe_box', 'stamped, so the Check can say so');
  assert.equal(items.some((i) => i.kind === 'shoe_box'), false, 'no old item survives');
  // The engine cuts it as a drawer: no SHOEBOX board, no batten, no step.
  const result = store().unitResult('u1');
  assert.equal(result.panels.filter((p) => /SHOEBOX|BATTEN/.test(p.id)).length, 0,
    'steps and battens vanish');
  assert.ok(result.panels.some((p) => p.part === 'DRAWER-SIDE' && p.meta?.drawer === 2 && p.h === 80),
    'the shoe drawer is cut, side 80');
  // …and the Check names the conversion, once per unit, in words.
  const findings = runChecks({
    entries: [{ unit: store().units[0], result }], units: store().units, profile: P,
  });
  const notice = (findings || []).find((f) => f.check === 12);
  assert.ok(notice, 'Check #12 speaks');
  assert.match(notice.message, /shoe rebuilt as a drawer — review fronts/);
});

// ─── THE KILL, WITNESSED ────────────────────────────────────────────────────

test('F7.1 · the graves: the old world is gone, file by file', () => {
  assert.equal(existsSync(new URL('../src/engine/shoeBox.js', import.meta.url)), false,
    'engine/shoeBox.js — whole');
  assert.equal(existsSync(new URL('../reference/lisp/KIT_SHOE_BOX.lsp', import.meta.url)), false,
    'KIT_SHOE_BOX.lsp — the kit');
  const kits = readdirSync(new URL('../reference/lisp/', import.meta.url))
    .filter((f) => f.toLowerCase().endsWith('.lsp'));
  // T57 AMENDED (30.08.2026): 13 → 14. F7's claim is that the shoe kit is GONE
  // and the count is derived rather than typed, and both still hold — the
  // folder simply gained `KIT_FRONT_JPULL.lsp` tonight. The number is written
  // out here so that a kit deleted by accident still fails this test; what is
  // asserted is the grave above, not the size of the shelf.
  assert.equal(kits.length, 14, 'the paren walk ends at 14 — derived, never typed');
  assert.equal(kits.includes('KIT_SHOE_BOX.lsp'), false, 'and the grave is still a grave');
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.doesNotMatch(engine, /shoeBoxPlan|shoeBoxBoxFor|SHOEBOX-/,
    'the emission block, the placer and the DXF names');
  assert.equal(CNC_LAYERS.some((l) => /^SHOE_/.test(l.name)), false, 'the two layers');
  const rule12 = CHECKS.find((r) => r.n === 12);
  assert.equal(rule12.label, 'Shoe box rebuilt as a drawer', 'the check polices the new world');
});

test('F7 · the tilted shoe SHELF (15°, T33) is NOT touched', () => {
  const r = computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    sections: [{ width_mm: 600, items: [{ id: 'sh1', kind: 'shelf', variant: 'shoe', pos_mm: 400 }] }],
  }, P);
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  assert.ok(shelf, 'the shelf is cut');
  assert.equal(shelf.meta.tilt_deg, P.wardrobeAccessories.shoeShelf.tiltDeg, 'still leaning 15°');
  assert.ok(r.panels.some((p) => p.part === 'SHOE-RAIL'), 'with its stop rail');
});

test('F7 · the probe\'s claim: no golden carries a shoe item', () => {
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const params = { ...defaultParamsFor(id, P), unit_num: '01' };
    const items = (params.sections || []).flatMap((s) => s?.items || []);
    assert.equal(items.filter((i) => i?.kind === 'shoe_box' || i?.variant === 'shoe').length, 0,
      `${id} carries none`);
  }
});
