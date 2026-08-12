// ─── F3 — THE SHAKER DOOR LOOKS LIKE A SHAKER (turn 25) ─────────────────────
//
// Until this turn a shaker rendered as a flat slab and only its 25 mm thickness
// said otherwise. What makes it a shaker is a RECESS 6 mm deep in the face,
// leaving a frame of equal width all round — "shaker zawsze równy".

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  frameFitProblem, frameRangeProblem, isShakerFront, shakerFits, shakerFrameMm,
  shakerPanelFloor, shakerPanelRect, shakerPocket, shakerSpec,
} from '../src/engine/shaker.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { hingeAngleFor, setHingeCatalogue, clearHingeCatalogue } from '../src/engine/hinges.js';
import { panelFindings, windingOf } from '../src/engine/cnc/edgeGuard.js';
import { cncLayer } from '../src/engine/cnc/layers.js';
import { buildUnitDxfFiles, parseDxf } from '../src/engine/cnc/dxf.js';
import { frontDetail } from '../src/engine/drawings/frontElevation.js';
import { DEFAULT_DESIGN, migrateDesign } from '../src/engine/design.js';

const spec = shakerSpec(P);
const unit = (extra) => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', ...extra }, P);
const doorOf = (r) => r.panels.find((p) => p.id === '01-F');

// ─── F3.1 — the geometry ────────────────────────────────────────────────────

test('F3.1 — 6 mm deep, 70 by default, 10…200, equal on all four sides', () => {
  assert.equal(spec.recessDepth, 6);
  assert.equal(spec.frameWidth, 70);
  assert.equal(spec.frameMin, 10);
  assert.equal(spec.frameMax, 200);
  // ONE number. A rail/stile pair would be a second thing to get wrong, and the
  // owner does not want one — so there is deliberately nothing else to read.
  assert.equal(P.front.types.S.railWidth, undefined);
  assert.equal(P.front.types.S.stileWidth, undefined);
});

test('F3.1 — the panel face sits at 25 − 6 = 19', () => {
  assert.equal(shakerPanelFloor(25, P), 19);
  assert.equal(doorOf(unit()).meta.shaker.panelFloor, 19);
});

test('F3.1 — the frame is equal on all four sides, on any leaf', () => {
  for (const [w, h] of [[597, 767], [400, 2100], [900, 300]]) {
    const rect = shakerPanelRect({ w, h, frame: 70 }, P);
    assert.ok(rect, `${w}×${h} should take a 70 mm frame`);
    assert.equal(rect.x1, 70, 'left');
    assert.equal(w - rect.x2, 70, 'right');
    assert.equal(rect.y1, 70, 'bottom');
    assert.equal(h - rect.y2, 70, 'top');
  }
});

test('F3.1 — the project setting is read where it is set, the profile where it is not', () => {
  assert.equal(shakerFrameMm(null, P), 70);
  assert.equal(shakerFrameMm({ fronts: { shakerFrame: null } }, P), 70);
  assert.equal(shakerFrameMm({ fronts: { shakerFrame: 120 } }, P), 120);
  // A number outside the profile's own range is a project saved by a different
  // profile, and the default is the honest answer to it.
  assert.equal(shakerFrameMm({ fronts: { shakerFrame: 400 } }, P), 70);
  assert.equal(unit({ shaker_frame_mm: 100 }).panels.find((p) => p.id === '01-F').meta.shaker.frame, 100);
});

test('F3.1 — the design carries it, and an older project is filled in', () => {
  assert.equal(DEFAULT_DESIGN.fronts.shakerFrame, null);
  const older = migrateDesign({ fronts: { style: 'S' } });
  assert.equal(older.fronts.shakerFrame, null, 'nobody has said — the profile answers');
  assert.equal(migrateDesign({ fronts: { shakerFrame: 90 } }).fronts.shakerFrame, 90);
});

// ─── F3.2 — refused, never clamped ──────────────────────────────────────────

test('F3.2 — a 200 mm frame on a 300 mm door is REFUSED with a plain message', () => {
  const problem = frameFitProblem({ w: 300, h: 700, frame: 200 }, P);
  assert.ok(problem, 'a 200 mm frame cannot fit a 300 mm door');
  assert.match(problem, /200 mm shaker frame/);
  assert.match(problem, /300 mm wide/);
  assert.match(problem, /cut plain/);
  // And it is a SENTENCE, not a code — this is what a joiner reads.
  assert.ok(problem.length > 40 && !problem.includes('_'), problem);
});

test('F3.2 — it is never silently clamped', () => {
  // The whole point. A joiner who set 200 and got 120 has a kitchen where some
  // doors wear one frame and some another, and nothing ever told him.
  assert.equal(shakerPanelRect({ w: 300, h: 700, frame: 200 }, P), null);
  assert.equal(shakerPocket({ w: 300, h: 700, frame: 200 }, P), null);

  const r = unit({ width: 304, shaker_frame_mm: 200 });
  const door = doorOf(r);
  assert.deepEqual(door.cnc.pockets || [], [], 'a refused front is cut PLAIN');
  assert.equal(door.meta.shaker, undefined, 'and carries no frame it did not get');
  const said = r.warnings.find((w) => w.code === 'SHAKER_FRAME_TOO_WIDE');
  assert.ok(said, 'the cabinet must SAY so');
  assert.match(said.message, /01-F/);
});

test('F3.2 — the rule is 2 × frame + a minimum panel, on the narrow axis', () => {
  const need = 2 * 70 + spec.minPanel;
  assert.equal(need, 200);
  assert.ok(shakerFits({ w: 600, h: need, frame: 70 }, P), 'exactly enough is enough');
  assert.ok(!shakerFits({ w: 600, h: need - 1, frame: 70 }, P), 'one short is one too few');
  // A tall door fails on its width and a drawer front on its height, and the
  // message says which.
  assert.match(frameFitProblem({ w: 150, h: 2000, frame: 70 }, P), /150 mm wide/);
  assert.match(frameFitProblem({ w: 2000, h: 150, frame: 70 }, P), /150 mm high/);
});

test('F3.2 — a frame outside 10…200 is refused before anything else is asked', () => {
  assert.match(frameRangeProblem(5, P), /10–200 mm/);
  assert.match(frameRangeProblem(250, P), /10–200 mm/);
  assert.equal(frameRangeProblem(10, P), null);
  assert.equal(frameRangeProblem(200, P), null);
});

// ─── F3.4 — the CNC ─────────────────────────────────────────────────────────

test('F3.4 — a NAMED class on the front’s sheet, and only on shaker fronts', () => {
  assert.equal(spec.pocketLayer, 'SHAKER_PANEL_POCKET');
  assert.equal(cncLayer('SHAKER_PANEL_POCKET').aci, 41);
  assert.equal(cncLayer('SHAKER_PANEL_POCKET').kind, 'pocket');

  const shaker = unit();
  const flat = unit({ front_type: 'F' });
  const pocketsOn = (r, id) => (r.panels.find((p) => p.id === id).cnc.pockets || [])
    .filter((k) => k.layer === 'SHAKER_PANEL_POCKET');
  assert.equal(pocketsOn(shaker, '01-F').length, 1);
  assert.equal(pocketsOn(flat, '01-F').length, 0, 'a FLAT front is flat');
  assert.equal(pocketsOn(unit({ front_type: 'H' }), '01-F').length, 0, 'so is a J-groove');

  // …and on nothing that is not a front.
  for (const p of shaker.panels.filter((x) => x.role !== 'front')) {
    assert.deepEqual(
      (p.cnc?.pockets || []).filter((k) => k.layer === 'SHAKER_PANEL_POCKET'), [], p.id,
    );
  }
});

test('F3.4 — the appliance panel’s face is a FRONT, and takes the shaker (turn 26, F5.5)', () => {
  // Turn 25 read turn 17's "no hinges, flat, no door furniture" as covering the
  // rebate too, and cut a D/W face plain whatever the job's front style said.
  // The owner's turn-26 verdict: "A D/W front is a front: F3-turn-25's shaker
  // applies to it, and so do handles. The `dwPanel` path must stop being a
  // special case for anything a front normally has." So a run of shaker
  // kitchen no longer has one flat door in the middle of it.
  const dw = computeCabinet({ ...defaultParamsFor('DW_PANEL', P), unit_num: '01', front_type: 'S' }, P);
  const face = dw.panels.find((p) => p.part === 'FRONT');
  assert.ok(face, 'the D/W panel has a face');
  assert.equal(isShakerFront(face), true);
  assert.equal((face.cnc.pockets || []).length, 1, 'one recess, like every other shaker leaf');
  assert.equal(face.cnc.pockets[0].layer, 'SHAKER_PANEL_POCKET');
  assert.equal(face.meta.shaker.frame, P.front.types.S.frameWidth);

  // …and a FLAT job still cuts it flat, which is the same law read the other
  // way: the piece follows the project's front style like any other front.
  const flat = computeCabinet({ ...defaultParamsFor('DW_PANEL', P), unit_num: '01', front_type: 'F' }, P);
  assert.deepEqual(flat.panels.find((p) => p.part === 'FRONT').cnc.pockets || [], []);
});

test('F3.4 — the pocket reaches the DXF, on its own layer, wound as a cut-out', () => {
  const r = unit();
  const file = buildUnitDxfFiles(r, P).find((f) => f.name === '01-F.dxf');
  const polys = parseDxf(file.dxf).entities.filter((e) => e.type === 'poly');
  const pocket = polys.filter((e) => e.layer === 'SHAKER_PANEL_POCKET');
  assert.equal(pocket.length, 1, 'one recess on the door');
  assert.equal(pocket[0].closed, true);

  // ─── F1.2 ON ITS FIRST REAL SUBJECT ───────────────────────────────────────
  // This is the first loop this engine has ever cut that lies WHOLLY INSIDE a
  // board. The outline runs anticlockwise and the cut-out runs the other way,
  // because that opposition is what tells VCarve which side of the line the
  // material is on.
  const outline = polys.find((e) => e.layer === 'OUTLINE');
  assert.equal(windingOf(outline.pts), 'ccw');
  assert.equal(windingOf(pocket[0].pts), 'cw');

  // …and the guard agrees, on the panel itself.
  assert.deepEqual(panelFindings(doorOf(r)), []);
});

test('F3.4 — the layer table declares it', () => {
  const r = unit();
  const file = buildUnitDxfFiles(r, P).find((f) => f.name === '01-F.dxf');
  const names = parseDxf(file.dxf).layerTable.map((l) => l.name);
  assert.ok(names.includes('SHAKER_PANEL_POCKET'), `the DXF references an undeclared layer: ${names.join(', ')}`);
});

// ─── F3.5 — the hinge rule reads the FULL board ─────────────────────────────

test('F3.5 — the angle law reads 25, never the 19 mm floor', () => {
  // Exactly the kind of thing that silently picks the wrong article: the
  // catalogue's ladder is "up to 25 → the 110°, thicker → the 95°", and a
  // shaker's panel floor is 19. If anything ever started measuring the floor,
  // a 25 mm door would still get the 110° and nobody would notice — until a
  // 26 mm one did too.
  // The catalogue's own shape — reference/hardware/cliptop-hinges.json, whose
  // ladder really is "up to 25 → the 110°, up to 32 → the 95°".
  setHingeCatalogue({
    system: 'CLIP top',
    rules: { hinge_by_front_thickness: [{ max: 25, angle: 110 }, { max: 32, angle: 95 }] },
    items: [{ family: '71B3550', article: '1', role: 'hinge', angle: 110 }],
  });
  try {
    const door = doorOf(unit());
    assert.equal(door.thickness, 25, 'the BOARD is 25 and stays 25');
    assert.equal(door.box.d, 25, 'and so is the box the mesh occupies');
    assert.equal(door.meta.shaker.panelFloor, 19, 'the floor is a floor, not a thickness');
    assert.equal(hingeAngleFor({ frontThickness: door.thickness }), 110);
    // The number that must never reach it.
    assert.equal(hingeAngleFor({ frontThickness: door.meta.shaker.panelFloor }), 110);
    assert.notEqual(
      hingeAngleFor({ frontThickness: 26 }), hingeAngleFor({ frontThickness: 25 }),
      'the ladder really does step at 25 — otherwise this test proves nothing',
    );
  } finally {
    clearHingeCatalogue();
  }
});

test('F3.5 — the cup drilling is where it always was on a shaker door', () => {
  // The recess is a face, not a thickness: nothing about the hinge changes.
  const cupsOf = (r) => r.drills
    .filter((d) => d.panel === '01-F' && d.kind === 'cup')
    .map((d) => `${d.x},${d.y},${d.d}`);
  assert.deepEqual(cupsOf(unit()), cupsOf(unit({ front_type: 'F' })));
});

// ─── the drawing follows the cut ────────────────────────────────────────────

test('F3 — the elevation draws the frame the machine pockets', () => {
  // Before this turn the drawing carried a heuristic of its own (`w > off ×
  // 2.2`), which left a 10 mm panel on a 230 mm front — a rectangle the machine
  // would have refused. One law now.
  const box = { x: 0, y: 0, w: 597, h: 767 };
  const [drawn] = frontDetail(box, 'S', P);
  assert.ok(drawn, 'a 597 × 767 door has a frame');
  assert.equal(drawn.x, 70);
  assert.equal(drawn.w, 597 - 140);

  // …and where the machine refuses, the drawing draws nothing.
  assert.deepEqual(frontDetail({ x: 0, y: 0, w: 597, h: 197 }, 'S', P), []);
  // The frame the caller is holding wins over the profile's default.
  const [wide] = frontDetail(box, 'S', P, 100);
  assert.equal(wide.x, 100);
});
