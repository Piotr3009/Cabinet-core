// ─── Turn 15: the pickers, the gallery, the catalogue and the CNC views ─────
//
// Four of the owner's verdicts, and what a node test can hold each of them to.
//
//   F2  the outlines inside a cabinet — the NUMBERS that fix the depth war
//   F3  "mega ważne": a source shows the RIGHT picker, and a veneer is its own
//       extensible collection
//   F4  door styles are a gallery of drawings, built to scale from day one
//   F8  Remove doors, in one action and one undo step
//   F9  the two CNC views — which are VIEWS and touch nothing that is exported
//
// F5's half of this (the catalogue) lives with the rest of the library data in
// test/turn12-library.test.js, where the list it replaced was already held.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  FRONT_STYLE_OPTIONS, finishById, migrateDesign, resolveFinishes,
} from '../src/engine/design.js';
import {
  carcassSources, facingMatchesSource, frontSources, pickerForSource, projectFrontThickness,
  sourceById, sourceTakesFacing,
} from '../src/engine/projectSettings.js';
import {
  DEFAULT_VENEERS, filterVeneers, getVeneers, normaliseVeneer, setVeneerCatalogue,
  veneerFinish, veneerFinishId, veneerIdFromFinishId, veneerLabel,
} from '../src/engine/veneers.js';
import { FRONT_STYLE_ART, drawnFrontStyleIds, frontStyleArt } from '../src/engine/frontStyleArt.js';
import { setDecorCatalogue } from '../src/engine/decors.js';
import {
  CNC_VIEWS, cncViewById, groupByCabinet, groupByMaterial, isRunPart, materialSection,
} from '../src/engine/cnc/views.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import {
  flushHistory, unwatchProjectHistory, useHistoryStore, watchProjectHistory,
} from '../src/stores/historyStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const history = () => useHistoryStore.getState();

test.before(() => watchProjectHistory());
test.after(() => unwatchProjectHistory());

// ─── F2 — the depth war, as numbers ────────────────────────────────────────

test('F2 — the outline offset is a PROFILE number, not a literal in the view', () => {
  // The owner: "the outer contour is crisp, the interior edges vanish." An edge
  // line inside a cabinet is coplanar with the face it butts into, so the two
  // are at the same depth and the winner is draw order. `polygonOffset` pushes
  // the FILL back a hair and the line always wins.
  // Turn 20 (CLAUDE.md F12.1) adds the OUTLINE's own bias beside the fill's:
  // the face steps back, the line steps forward, and an interior edge finally
  // reads. Two decisions, two pairs of numbers, one profile block.
  assert.deepEqual(P.appearance.outline.polygonOffset, {
    factor: 1, units: 1, outlineFactor: -1, outlineUnits: -1,
  });

  // A profile saved before this turn has no such key at all, and must come back
  // with the app's — otherwise the fix is off for every existing workshop.
  const saved = (outline) => migrateCabinetProfile({
    ...P, appearance: { ...P.appearance, outline },
  });
  const old = saved({ colour: '#000000', width: 1, threshold: 12 });
  assert.deepEqual(old.appearance.outline.polygonOffset, P.appearance.outline.polygonOffset);
  assert.equal(old.appearance.outline.colour, '#000000', 'and its own overrides survive');
  // …and a workshop that tunes ONE of the two keeps the app's other.
  const tuned = saved({ colour: '#1A1A1A', width: 1, threshold: 12, polygonOffset: { factor: 2 } });
  assert.deepEqual(tuned.appearance.outline.polygonOffset, {
    ...P.appearance.outline.polygonOffset, factor: 2,
  });
});

// ─── F3 — the right picker, and the veneer collection ──────────────────────

test('F3 — every source names the picker it asks for', () => {
  const picker = (kind, id) => pickerForSource(
    sourceById(kind === 'front' ? frontSources(P) : carcassSources(P), id),
  );
  // The owner's "mega ważne": a laminate front was offering RAL palettes and so
  // was a veneer front. Neither is a paint.
  assert.equal(picker('front', 'laminate'), 'decor');
  // Turn 20 (CLAUDE.md F12.3): the owner's verdict is that BOTH faced fronts
  // pick off the same catalogue grid he already knows. The CARCASS's veneer
  // source is untouched — that question was not asked.
  assert.equal(picker('front', 'veneer'), 'decor');
  assert.equal(picker('front', 'spray'), 'colour');
  // Spray stays exactly as shipped — the colours are right there.
  assert.equal(picker('carcass', 'sprayed'), 'colour');
  assert.equal(picker('carcass', 'egger'), 'decor');
  // F3.3: carcasses gain the veneer source, wired to the same collection.
  assert.equal(picker('carcass', 'veneer'), 'veneer');
  // The wood RANGE is still a later turn's: the option is real, the colours are
  // not, and it asks nothing.
  assert.equal(picker('front', 'wood'), null);

  assert.equal(sourceTakesFacing(sourceById(frontSources(P), 'laminate')), true);
  assert.equal(sourceTakesFacing(sourceById(frontSources(P), 'spray')), false);
});

test('F3 — a facing the new source cannot mean is dropped', () => {
  const veneerSrc = sourceById(frontSources(P), 'veneer');
  const laminateSrc = sourceById(frontSources(P), 'laminate');
  const spraySrc = sourceById(frontSources(P), 'spray');
  // Turn 20 (CLAUDE.md F12.3): a veneer FRONT picks decors now, and a project
  // saved before it keeps the veneer it was faced in — the look and the 19 mm
  // board are the same either way, so dropping the choice would throw away a
  // decision for nothing.
  assert.equal(facingMatchesSource('veneer:oak-natural', veneerSrc), true);
  assert.equal(facingMatchesSource('egger:H1180_37', veneerSrc), true);
  assert.equal(facingMatchesSource('veneer:oak-natural', sourceById(carcassSources(P), 'veneer')), true);
  assert.equal(facingMatchesSource('egger:H1180_37', sourceById(carcassSources(P), 'veneer')), false,
    'on a CARCASS a decor is still not a veneer');
  assert.equal(facingMatchesSource('egger:H1180_37', laminateSrc), true);
  assert.equal(facingMatchesSource('veneer:oak-natural', laminateSrc), false);
  assert.equal(facingMatchesSource('egger:H1180_37', spraySrc), false, 'a sprayed front is not faced');
  assert.equal(facingMatchesSource(null, spraySrc), true, 'nothing to drop is nothing to argue about');
});

test('F3.2 — veneers are their OWN collection, and adding one is a data entry', () => {
  // The structure, seeded minimally (owner decision (a)-minimal): three-four
  // timber-like decors flagged as veneers.
  assert.equal(getVeneers(), getVeneers(), 'one catalogue, read through one door');
  assert.ok(DEFAULT_VENEERS.length >= 3 && DEFAULT_VENEERS.length <= 4);
  for (const v of DEFAULT_VENEERS) {
    assert.ok(v.id && v.label && v.species, `${v.id} is described`);
    // A REFERENCE into the decor catalogue, never an inlined picture: when the
    // owner's own scan arrives the entry gains its own `tex` and the reference
    // goes — and every project that chose "Natural oak" keeps its choice.
    assert.ok(v.decorId, `${v.id} points at the decor that stands in for it`);
  }
  // The ids a saved project stores are the VENEER's, not the decor's.
  assert.equal(veneerFinishId('oak-natural'), 'veneer:oak-natural');
  assert.equal(veneerIdFromFinishId('veneer:oak-natural'), 'oak-natural');
  assert.equal(veneerIdFromFinishId('egger:H1180_37'), null);

  // …and dropping one in is a data entry. No component, no store, no engine
  // function has to be opened (CLAUDE.md F3.2).
  const before = getVeneers().length;
  setVeneerCatalogue([...DEFAULT_VENEERS, { id: 'walnut-own', label: 'Our walnut', species: 'Walnut', hex: '#5a4130' }]);
  assert.equal(getVeneers().length, before + 1);
  const own = veneerFinish('veneer:walnut-own');
  assert.equal(own.kind, 'veneer');
  assert.equal(own.label, 'Our walnut veneer', 'a veneer with its own picture credits nobody else');
  assert.equal(own.hex, '#5A4130');
  setVeneerCatalogue(DEFAULT_VENEERS);

  assert.equal(normaliseVeneer({}), null, 'a row with no id is not a veneer');
  assert.equal(normaliseVeneer({ id: 'x', tex: 'javascript:alert(1)' }).tex, null, 'only http(s)');
  assert.equal(filterVeneers(getVeneers(), { query: 'hick' }).length, 1);
});

test('F3.2 — the EGGER attribution travels with the borrowed picture', () => {
  // The licence, unchanged (engine/decors.js): the artwork may not be shown
  // without the credit, and the label is what the BOM, the tile and the unit
  // card all print.
  setDecorCatalogue([{
    id: 'H1180_37', code: 'H1180', texture: 'ST37', name: 'H1180 ST37 Natural Halifax Oak', hex: '#B59571', category: 'woodgrain',
  }]);
  const finish = veneerFinish('veneer:oak-natural');
  assert.equal(finish.kind, 'veneer');
  assert.match(finish.label, /^Natural oak veneer · EGGER H1180/);
  assert.equal(veneerLabel(getVeneers()[0]), finish.label);
  // A veneer id resolves through the ordinary finish door, ahead of the decor
  // registry — or the veneer's name would never reach a cut list.
  assert.equal(finishById(P, 'veneer:oak-natural').label, finish.label);
  setDecorCatalogue([]);
});

test('F3.1 — a laminate front stores a DECOR, renders as one and is named as one', () => {
  setDecorCatalogue([{
    id: 'H1180_37', code: 'H1180', texture: 'ST37', name: 'H1180 ST37 Natural Halifax Oak', hex: '#B59571', category: 'woodgrain',
  }]);
  store().loadProject({
    id: null, name: 't15-f3', room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }), design: {},
  }, []);
  // A front that HAS a sprayed colour, then becomes a laminate. This is the
  // owner's bug in one line: the leftover paint used to win, so a front ordered
  // in H1180 rendered and printed as wine red.
  store().setFrontType('f1', { source: 'spray' });
  store().setFrontColour({ hex: '#7B1E28', name: 'Wine Red', system: 'RAL' }, 'f1');
  assert.equal(resolveFinishes(null, store().project.design, P).front.kind, 'spray');

  store().setFrontType('f1', { source: 'laminate' });
  store().setFrontType('f1', { finish_id: 'egger:H1180_37' });
  const design = migrateDesign(store().project.design);
  assert.equal(design.fronts.types[0].finish_id, 'egger:H1180_37');
  assert.equal(design.colour.front, null, 'a faced front is not a painted one');
  const { front } = resolveFinishes(null, design, P);
  assert.match(front.label, /EGGER H1180/, 'and the cut list names the decor');
  assert.ok(front.texture, 'it renders as a decor');

  // …and back the other way: choosing a colour un-faces it.
  store().setFrontColour({ hex: '#7B1E28', name: 'Wine Red', system: 'RAL' }, 'f1');
  assert.equal(migrateDesign(store().project.design).fronts.types[0].finish_id, null);
  setDecorCatalogue([]);
});

test('F3 — the source pins the thickness, veneer at 19', () => {
  const design = migrateDesign({ fronts: { types: [{ id: 'f1', source: 'veneer' }] } });
  assert.equal(projectFrontThickness(design, P), 19);
  assert.equal(projectFrontThickness(migrateDesign({ fronts: { types: [{ id: 'f1', source: 'laminate' }] } }), P), 18);
  // …and the carcass source the same way (F3.3), which is why choosing it goes
  // through the same hard gate a board assignment does.
  assert.equal(sourceById(carcassSources(P), 'veneer').thickness, 19);
});

// ─── F4 — the gallery ──────────────────────────────────────────────────────

test('F4 — every shape in the list has a drawing, and a new one costs two lines', () => {
  // "Never a bare dropdown." A tile per shape with a small SVG of the front.
  for (const option of FRONT_STYLE_OPTIONS) {
    assert.ok(FRONT_STYLE_ART[option.id], `${option.id} (${option.label}) has no drawing`);
    assert.ok(frontStyleArt(option.id).length >= 1);
  }
  assert.deepEqual(drawnFrontStyleIds().sort(), FRONT_STYLE_OPTIONS.map((o) => o.id).sort());

  // Built for scale from day one (F4.2): a style with no drawing yet is a plain
  // slab rather than a blank tile, so the gallery is a gallery on the day the
  // thirtieth id is added and its picture is not drawn.
  assert.deepEqual(frontStyleArt('does-not-exist'), FRONT_STYLE_ART.F);

  // The drawings are DATA in one frame — the seed of the owner's "małe
  // instrukcje" — and every primitive is one of the three the renderer knows.
  for (const [id, art] of Object.entries(FRONT_STYLE_ART)) {
    for (const bit of art) {
      assert.ok(bit.rect || bit.line || bit.path, `${id} has a primitive nothing can draw`);
      if (bit.rect) assert.equal(bit.rect.length, 4);
      if (bit.line) assert.equal(bit.line.length, 4);
    }
  }
});

// ─── F8 — Remove doors ─────────────────────────────────────────────────────

test('F8 — Remove doors strips a whole selection in ONE undo step', () => {
  store().loadProject({
    id: null, name: 't15-f8', room: migrateRoom({ height: 2500, corners: rectCorners(5000, 3000) }), design: {},
  }, []);
  const ids = [store().addUnit('BUD').id, store().addUnit('BUD').id, store().addUnit('BUD').id];
  store().addDoorsBulk(ids);
  for (const id of ids) assert.ok(store().units.find((u) => u.id === id).params.doors, 'doors on');

  flushHistory();
  const before = store().units.map((u) => u.params.doors);
  const { stripped, already } = store().removeDoorsBulk(ids);
  flushHistory();
  assert.equal(stripped, 3);
  assert.equal(already, 0);
  for (const id of ids) {
    assert.equal(store().units.find((u) => u.id === id).params.doors, false, 'doors off');
  }

  // ONE undo step for the lot — the turn-13 F5 bulk rule, and the reason this
  // goes through `runBatch` like every other bulk action rather than being a
  // loop in a component.
  assert.equal(history().undo(), true);
  assert.deepEqual(store().units.map((u) => u.params.doors), before, 'all three came back together');

  // Asked twice, it says so instead of pretending to work.
  store().removeDoorsBulk(ids);
  assert.deepEqual(store().removeDoorsBulk(ids), { stripped: 0, already: 3 });
});

// ─── F9 — the two views ────────────────────────────────────────────────────

test('F9 — a view is a VIEW: it buckets parts and touches nothing else', () => {
  assert.deepEqual(CNC_VIEWS.map((v) => v.id), ['material', 'cabinet']);
  assert.equal(cncViewById('cabinet').id, 'cabinet');
  assert.equal(cncViewById('nonsense').id, 'material', 'an unknown id falls back, never throws');

  // The toggle is view state and nothing else — it is never persisted and never
  // reaches the project (the note at the top of stores/uiStore.js).
  useUiStore.getState().setCncView('cabinet');
  assert.equal(useUiStore.getState().cncView, 'cabinet');
  useUiStore.getState().setCncView('anything else');
  assert.equal(useUiStore.getState().cncView, 'material');
});

test('F9.1 — the sections are one per MATERIAL, never per colour', () => {
  // ─── Turn 16 (CLAUDE.md F2.1) ─────────────────────────────────────────────
  // The RULE is turn 15's, word for word: one section per assigned material,
  // identity by material and never by colour. What changed is WHOSE assignment
  // is read. Turn 15 asked the purchasing table by BOM role — one board per
  // role for the whole project — which cannot tell a cabinet on Front 1 from a
  // cabinet on Front 2 and knows nothing about a plinth cut from its own board.
  // Turn 16 asks the PROJECT's own assignment, which is the same source the
  // BOM, the picture and the check-out read (F1.5).
  const materials = [
    { id: 'm_mdf', code: 'MDF-18', name: 'MDF 18 mm', thickness: 18 },
    { id: 'm_egger', code: 'W980 SM', name: 'MFC White 18 mm', thickness: 18 },
  ];
  const design = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'm_egger' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', material_id: 'm_mdf' }] },
  });
  const named = (panel) => materialSection(panel, { unit: null, design, profile: P, materials });

  // Two doors off the same MDF are ONE section whatever they are sprayed: it is
  // one board on the bed of the machine.
  assert.equal(named({ role: 'front', thickness: 18 }).key, named({ role: 'front', thickness: 22 }).key);
  assert.equal(named({ role: 'front', thickness: 18 }).label, 'MDF-18 · MDF 18 mm');
  // Two ROLES on the same board are one section too — a side and a top are both
  // the carcass board.
  assert.equal(named({ role: 'side', thickness: 18 }).key, named({ role: 'top', thickness: 18 }).key);
  // …and the two boards are two sections.
  assert.notEqual(named({ role: 'front', thickness: 18 }).key, named({ role: 'side', thickness: 18 }).key);

  // Nothing assigned yet is honest about it rather than inventing a name.
  const bare = migrateDesign({});
  const open = materialSection({ role: 'back', thickness: 18 }, {
    unit: null, design: bare, profile: P, materials,
  });
  assert.equal(open.assigned, false);
  assert.match(open.label, /18 mm/);

  const entries = [{
    unit: { id: 'u1', params: {} },
    result: {},
    panels: [
      { id: 'D1', role: 'front', material_role: 'front', thickness: 18 },
      { id: 'BUL', role: 'side', material_role: 'board', thickness: 18 },
      { id: 'PLINTH', role: 'plinth', material_role: 'front', thickness: 18 },
    ],
  }];
  const sections = groupByMaterial(entries, { design, profile: P, materials });
  // Two boards → TWO sections, and the plinth is in the fronts' one because
  // "Same as fronts" is an ASSIGNMENT and not a display state (F2.2).
  assert.equal(sections.length, 2);
  const fronts = sections.find((s) => s.material_id === 'm_mdf');
  assert.deepEqual(fronts.units[0].panels.map((p) => p.id).sort(), ['D1', 'PLINTH']);
  assert.deepEqual(sections.flatMap((s) => s.units[0].panels.map((p) => p.id)).sort(), ['BUL', 'D1', 'PLINTH']);
});

test('F9.2 — a square per cabinet, and the run parts in a group of their own', () => {
  // The owner, in as many words: "infille i plinthy osobno".
  const result = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', plinth: true, side_infill_left_mm: 40,
  }, P);
  const entries = [{ unit: { id: 'u1', params: { unit_num: '01' } }, result, panels: result.panels }];
  const { cabinets, run } = groupByCabinet(entries);

  assert.equal(cabinets.length, 1);
  assert.equal(run.length, 1);
  for (const p of run[0].panels) assert.ok(isRunPart(p), `${p.id} is a run part`);
  for (const p of cabinets[0].panels) assert.ok(!isRunPart(p), `${p.id} belongs to the carcass`);
  assert.ok(run[0].panels.some((p) => p.role === 'plinth'), 'the plinth is out of the square');
  assert.ok(run[0].panels.some((p) => p.role === 'infill'), '…and so are the infills');
  // Nothing is LOST between the two — every part is in exactly one of them.
  assert.equal(cabinets[0].panels.length + run[0].panels.length, result.panels.length);
});
