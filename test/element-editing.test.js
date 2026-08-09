// ─── Per-element editing (turn 9, CLAUDE.md F4) ─────────────────────────────
//
// Until turn 9 the smallest thing in this app that could be edited was a whole
// cabinet. A shelf was a row in a list with a height on it, and the answer to
// "that one carries the microwave, make it 25 in oak" was a second cabinet.
//
// Three things one shelf can now say for itself:
//
//   how far back it stands   `front_mm`      — turn 8's field, now draggable
//   how thick it is          `thickness_mm`  — new
//   what it is made of       `material_*`    — new, the same pair the hanger
//                                              rail has carried since turn 4
//
// The constraint on all three is fixtures/README rule 1, and it is absolute:
// they arrive as INPUTS on the unit's own config and travel to the engine
// through `paramsForEngine()`, exactly the way the plinth and the top infill
// do. The engine gained three inputs and not one formula — so a bare
// `computeCabinet()` still cuts what the AutoLISP kit cuts, and that is
// asserted here as well as by every golden fixture.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  useProjectStore, paramsForEngine, elementDepthBoundsFor,
} from '../src/stores/projectStore.js';
import { computeCabinet, shelfMaterial, shelfThickness } from '../src/engine/cabinet.js';
import { clampElementDepth, elementDepthBounds } from '../src/engine/collision.js';
import { elementMaterialChoices, migrateDesign } from '../src/engine/design.js';
import { buildBom } from '../src/engine/bom.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { groupOfPanel, exportablePanels } from '../src/engine/cnc/groups.js';

const store = () => useProjectStore.getState();
const G = P.board.thickness;

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const itemsOf = (id) => unitOf(id).params.sections[0].items;
const shelfPanels = (id) => resultOf(id).panels.filter((p) => p.part === 'SHELF');

function project() {
  store().loadProject({
    id: null,
    name: 'elements',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
}

function withShelves(type = 'BUD', count = 2) {
  project();
  const { id } = store().addUnit(type);
  store().addShelves(id, count);
  return id;
}

// ─── the engine takes it as an INPUT ────────────────────────────────────────

test('a shelf that says nothing is the carcass board — the kit, untouched', () => {
  assert.equal(shelfThickness(undefined, G), G);
  assert.equal(shelfThickness({}, G), G);
  assert.equal(shelfThickness({ thickness_mm: null }, G), G);
  // A zero-thickness shelf is not a thin shelf, it is a missing one.
  assert.equal(shelfThickness({ thickness_mm: 0 }, G), G);
  assert.equal(shelfThickness({ thickness_mm: -5 }, G), G);
  assert.equal(shelfThickness({ thickness_mm: 25 }, G), 25);
});

test('a bare computeCabinet with no overrides cuts exactly what it cut before', () => {
  // fixtures/README rule 1, restated as a unit test: this is the call every
  // golden fixture makes, and turn 9 must not have moved a millimetre of it.
  const kit = computeCabinet({
    type: 'WARDROBE', width: 600, height: 2150, depth: 578, unit_num: '01', shelves: 2,
  }, P);
  for (const p of kit.panels.filter((x) => x.part === 'SHELF')) {
    assert.equal(p.thickness, G, 'the carcass board');
    assert.equal(p.box.h, G);
    assert.equal(p.meta.material_label, undefined, 'and no material anybody chose');
  }
});

test('a material nobody chose is not a material', () => {
  assert.equal(shelfMaterial(undefined), null);
  assert.equal(shelfMaterial({}), null);
  // Turn 16 (CLAUDE.md F1.3): the palette KEY travels with the pair, and a
  // shelf saved before this turn simply has none.
  assert.deepEqual(shelfMaterial({ material_label: 'Oak MFC 25' }),
    { material_id: null, material_label: 'Oak MFC 25', material_key: null });
});

// ─── the depth clamp, as pure arithmetic ────────────────────────────────────

test('a piece may be pulled out to the face and no further back than a piece', () => {
  // A 558 deep carcass on 18 mm board: the shelf loses one board to the back,
  // so 540 mm of it is available. The floor is `editor.minElementDepth`.
  const b = elementDepthBounds({ depth: 558, boardT: G }, P);
  assert.equal(b.min, 0, 'flush with the face');
  assert.equal(b.deepest, 540);
  assert.equal(b.max, 540 - P.editor.minElementDepth);
  assert.equal(b.shallowest, P.editor.minElementDepth);
});

test('the clamp STOPS at the boundary, however far the cursor keeps going', () => {
  const b = elementDepthBounds({ depth: 558, boardT: G }, P);
  assert.equal(clampElementDepth(-200, b), b.min, 'a drag past the face stops at the face');
  assert.equal(clampElementDepth(9999, b), b.max, '…and a drag into the back stops short of it');
  assert.equal(clampElementDepth(120, b), 120);
  assert.equal(clampElementDepth('nonsense', b), b.min);
});

test("a sink's back panel is 50 mm forward, so its shelves have that much less to give", () => {
  // KIT_SINK L425-426: the back sits inside the box, and a shelf in one is
  // already shorter before anybody drags anything.
  const plain = elementDepthBounds({ depth: 558, boardT: G }, P);
  const sink = elementDepthBounds({ depth: 558, boardT: G, backLoss: P.sinkUnit.backSetback + G }, P);
  assert.equal(plain.deepest - sink.deepest, P.sinkUnit.backSetback + G);
  assert.ok(sink.max < plain.max);
});

test('a carcass too shallow to hold a shelf at all offers no range, not a negative one', () => {
  const b = elementDepthBounds({ depth: 80, boardT: G }, P);
  assert.equal(b.max, 0);
  assert.equal(clampElementDepth(50, b), 0);
});

test('the store reads the bounds off the unit, sink and all', () => {
  project();
  const { id: base } = store().addUnit('BUD');
  const { id: sink } = store().addUnit('SINK');
  const b = elementDepthBoundsFor(unitOf(base), P);
  const s = elementDepthBoundsFor(unitOf(sink), P);
  assert.equal(b.min, 0);
  assert.ok(s.deepest < b.deepest, 'the sink loses its back setback before anything else');
});

// ─── the store writes them, clamped ─────────────────────────────────────────

test('a depth typed or dragged past the limit stops at the limit', () => {
  const id = withShelves();
  const [sh] = itemsOf(id);
  const bounds = elementDepthBoundsFor(unitOf(id), P);

  const far = store().setElementDepth(id, sh.id, 99999);
  assert.equal(far.setback, bounds.max);
  assert.equal(itemsOf(id).find((i) => i.id === sh.id).front_mm, bounds.max);

  store().setElementDepth(id, sh.id, -400);
  assert.equal(itemsOf(id).find((i) => i.id === sh.id).front_mm, 0, 'flush with the face');
});

test('a depth lands on the 0.5 mm grid, whatever the pointer said', () => {
  const id = withShelves();
  const [sh] = itemsOf(id);
  store().setElementDepth(id, sh.id, 137.31982);
  const stored = itemsOf(id).find((i) => i.id === sh.id).front_mm;
  assert.equal(stored % P.editor.mmStep, 0, `${stored} is off the workshop grid`);
  assert.equal(stored, 137.5);
});

test('null puts a piece back on the standard setback, and that is not the same as 0', () => {
  const id = withShelves();
  const [sh] = itemsOf(id);
  // By ITEM, never by index: shelves are added top-down, so the stored array
  // runs the opposite way to the engine's bottom-up panel order.
  const panelOf = () => shelfPanels(id).find((p) => p.meta.itemId === sh.id);

  store().setElementDepth(id, sh.id, 0);
  assert.equal(panelOf().meta.front_mm, 0, 'out at the face');
  assert.equal(panelOf().h, unitOf(id).params.depth - G, 'and cut to the full depth');

  store().setElementDepth(id, sh.id, null);
  assert.equal(itemsOf(id).find((i) => i.id === sh.id).front_mm, null);
  assert.equal(panelOf().meta.front_mm, P.carcass.shelfDepthClearance,
    'and back on the profile default, which is what "not set" means');
});

test('a thickness is refused if it is not a thickness', () => {
  const id = withShelves();
  const [sh] = itemsOf(id);
  assert.equal(store().setElementThickness(id, sh.id, 0), null);
  assert.equal(store().setElementThickness(id, sh.id, -8), null);
  assert.equal(itemsOf(id).find((i) => i.id === sh.id).thickness_mm, undefined);
  // …and a slipped keystroke is a rail, not a cut part.
  store().setElementThickness(id, sh.id, 250);
  assert.ok(itemsOf(id).find((i) => i.id === sh.id).thickness_mm < 250);
});

// ─── …and the piece is CUT that way ─────────────────────────────────────────

test('a 25 mm shelf is a 25 mm part, in the panel and in the box', () => {
  const id = withShelves();
  const [a, b] = itemsOf(id);
  store().setElementThickness(id, a.id, 25);

  const panels = shelfPanels(id);
  const thick = panels.find((p) => p.meta.itemId === a.id);
  const plain = panels.find((p) => p.meta.itemId === b.id);
  assert.equal(thick.thickness, 25);
  assert.equal(thick.box.h, 25, 'and it is drawn 25 thick, not 18');
  assert.equal(plain.thickness, G, 'its neighbour is untouched');
  // The face it is cut to is unchanged: thickness is the third dimension.
  assert.equal(thick.w, plain.w);
  assert.equal(thick.h, plain.h);
});

test('a thicker shelf grows UP from the pin row it sits on', () => {
  // `pos_mm` is the shelf's BOTTOM face and has been since the LISP, which
  // draws the board from shelfY upwards. A shelf that grew downwards would
  // drop through the row of pins holding it.
  const id = withShelves();
  const [a] = itemsOf(id);
  const before = shelfPanels(id).find((p) => p.meta.itemId === a.id).box.y;
  store().setElementThickness(id, a.id, 25);
  assert.equal(shelfPanels(id).find((p) => p.meta.itemId === a.id).box.y, before);
});

test('a SCREWED shelf is screwed on its OWN centre line', () => {
  // Three ⌀3 screws through each carcass side into the edge of the board. A
  // 25 mm shelf drilled on the carcass board's centre line is drilled 3.5 mm
  // out — which on a 25 mm edge is the difference between a screw in the middle
  // and a screw that splits it.
  const id = withShelves();
  const [a] = itemsOf(id);
  store().setShelfVariant(id, a.id, 'fixed');
  store().setElementThickness(id, a.id, 25);

  const shelf = itemsOf(id).find((i) => i.id === a.id);
  const rows = resultOf(id).drillSummary.shelf_screw_row_y;
  assert.equal(rows.length, 1);
  assert.equal(rows[0], shelf.pos_mm + 25 / 2);
});

// ─── downstream: the cut list, the drawings, the sheet ──────────────────────

test('the BOM reflects the override — thickness AND material', () => {
  const id = withShelves();
  const [a] = itemsOf(id);
  store().setElementThickness(id, a.id, 25);
  store().setElementMaterial(id, a.id, { material_id: 'm_oak', material_label: 'Oak MFC 25' });

  const design = store().project.design;
  const bom = buildBom([{ unit: unitOf(id), result: resultOf(id) }], { design, profile: P });
  const rows = bom.units[0].rows.filter((r) => r.part === 'SHELF');
  const overridden = rows.find((r) => r.material_label === 'Oak MFC 25');
  assert.ok(overridden, 'the override reached the cut list');
  assert.equal(overridden.thickness, 25);
  const plain = rows.find((r) => r.material_label !== 'Oak MFC 25');
  assert.equal(plain.thickness, G);
  assert.notEqual(plain.material_label, 'Oak MFC 25', 'and its neighbour is on the project board');
});

test('two shelves the same size do not merge once one of them is a different board', () => {
  const id = withShelves('BUD', 2);
  const design = store().project.design;
  const before = buildBom([{ unit: unitOf(id), result: resultOf(id) }], { design, profile: P });
  assert.equal(before.cutRows.filter((r) => r.part === 'SHELF').length, 1,
    'two identical shelves are one line, as they always were');

  const [a] = itemsOf(id);
  store().setElementMaterial(id, a.id, { material_id: 'm_oak', material_label: 'Oak MFC 25' });
  const after = buildBom([{ unit: unitOf(id), result: resultOf(id) }], { design, profile: P });
  assert.equal(after.cutRows.filter((r) => r.part === 'SHELF').length, 2,
    'and two different boards are two lines, or half of them get cut wrong');
});

test('an overridden shelf goes down the SAME pipeline — no fork', () => {
  // CLAUDE.md F4.5: the drawings and the CNC grouping pick it up through the
  // existing part pipeline. So the piece must still be an ordinary cut part:
  // same group, same outline, same everything but its numbers.
  const id = withShelves();
  const [a] = itemsOf(id);
  store().setElementThickness(id, a.id, 25);
  store().setElementMaterial(id, a.id, { material_id: 'm_oak', material_label: 'Oak MFC 25' });

  const panel = shelfPanels(id).find((p) => p.meta.itemId === a.id);
  assert.equal(groupOfPanel(panel), 'shelves', 'still a shelf to the CNC sheet');
  assert.ok(exportablePanels([panel]).length === 1, 'still has an outline the machine can cut');
  assert.ok(panel.cnc.outline.length >= 2);
  assert.ok(panel.area_m2 > 0 && panel.edging.len_m >= 0, 'still counted and still edged');
  // …and the engine reports it in the assemblies the drawings read.
  const shelf = resultOf(id).assemblies.shelves.find((s) => s.itemId === a.id);
  assert.equal(shelf.thickness, 25);
});

// ─── it survives a save and a reload ────────────────────────────────────────

test('overrides round-trip through save and load in mock mode', () => {
  const id = withShelves();
  const [a] = itemsOf(id);
  store().setElementDepth(id, a.id, 60);
  store().setElementThickness(id, a.id, 25);
  store().setElementMaterial(id, a.id, { material_id: 'm_oak', material_label: 'Oak MFC 25' });

  // What persistence stores is the project and the units, verbatim — so the
  // round trip is exactly this: serialise, come back, and re-open.
  const saved = JSON.parse(JSON.stringify({ project: store().project, units: store().units }));
  store().loadProject(saved.project, saved.units);

  const back = store().units[0].params.sections[0].items.find((i) => i.id === a.id);
  assert.equal(back.front_mm, 60);
  assert.equal(back.thickness_mm, 25);
  assert.equal(back.material_label, 'Oak MFC 25');
  assert.equal(back.material_id, 'm_oak');
  // …and the piece is still cut that way after the reload.
  const panel = shelfPanels(store().units[0].id).find((p) => p.meta.itemId === a.id);
  assert.equal(panel.thickness, 25);
  assert.equal(panel.meta.front_mm, 60);
});

// ─── what a piece may be made OF ────────────────────────────────────────────

test('the material list is the project\'s own boards plus the fronts, and nothing else', () => {
  const design = migrateDesign({
    carcass: {
      types: [
        { id: 'c1', label: 'Carcass 1', finish_id: 'broken_white' },
        { id: 'c2', label: 'Carcass 2', finish_id: 'dark_walnut' },
      ],
    },
    finish: { front: 'light_oak' },
  });
  const choices = elementMaterialChoices(design, P, []);
  assert.equal(choices.length, 3, 'two carcass boards and the fronts');
  assert.equal(choices[0].material_label, 'Broken white');
  assert.equal(choices[1].material_label, 'Dark walnut');
  // Turn 16 (CLAUDE.md F1.3): the front row is ONE PER FRONT TYPE and carries
  // the palette's own key, so two types can never collapse into one row —
  // `front` alone said "the fronts" and meant whichever one the resolver
  // happened to pick.
  assert.equal(choices[2].key, 'front:f1');
  assert.equal(choices[2].kind, 'front');
  assert.equal(choices[2].material_label, 'Light oak');
});

test('…and it names a SPRAYED front the way the cut list does (F6)', () => {
  const design = migrateDesign({
    colour: { front: { hex: '#b32428', name: '3005 Wine Red', system: 'RAL' } },
  });
  const choices = elementMaterialChoices(design, P, []);
  assert.equal(choices.find((c) => c.kind === 'front').material_label, 'RAL 3005 Wine Red spray');
});

test('an assigned material shows its own name when no decor is set', () => {
  const design = migrateDesign({ carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'm1' }] } });
  const choices = elementMaterialChoices(design, P, [{ id: 'm1', name: 'MFC 18 white', category: 'board' }]);
  assert.equal(choices[0].material_label, 'MFC 18 white');
});
