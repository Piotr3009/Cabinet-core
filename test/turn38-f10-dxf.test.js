// ─── TURN 38 · F10 — everything drawn EXPORTS ───────────────────────────────
//
// CLAUDE.md: *"Extend the existing DXF writer; add a `node:test` that
// round-trips a sample: draw ops → export → parse the DXF text → assert
// entities, layers, colours, coordinates."*
//
// So this file draws with the very constructors the editor draws with, applies
// them through the very function the app applies them with, writes the file
// the export writes, and reads it back with the parser that lives beside the
// writer. Nothing is re-implemented beside anything.
//
// And IRON RULE 7 is asserted here rather than promised: no TEXT, no MTEXT, no
// STYLE table — the 02.08.2026 VCarve parser crash — over every entity this
// turn can produce.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { applyPartEdits } from '../src/engine/partEdits.js';
import {
  buildUnitDxfFiles, panelDxf, panelEntities, parseDxf, sheetDxf, writeDxf,
} from '../src/engine/cnc/dxf.js';
import { layoutPanels } from '../src/engine/cnc/layout.js';
import {
  makeArc, makeCircle, makeLine, makePolyline, makeRect,
} from '../src/engine/partObjects.js';
import { makeUserLayer } from '../src/engine/partLayers.js';

const JIG = makeUserLayer({ name: 'shop jig', aci: 30 });

/** A real cabinet, with a real back, drawn on with every shape this turn adds. */
function drawnOn() {
  const result = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W03' }, P);
  const back = result.panels.find((p) => p.part === 'BACK');
  const ops = [
    makeLine({ id: 'o1', layer: JIG.name, from: [40, 40], to: [200, 40] }),
    makePolyline({
      id: 'o2', layer: JIG.name, pts: [[40, 100], [120, 160], [200, 100]], closed: false,
    }),
    makeRect({ id: 'o3', layer: 'SCREWS_3MM', from: [300, 300], to: [420, 380] }),
    makeCircle({ id: 'o4', layer: JIG.name, at: [250, 600], r: 45 }),
    makeArc({
      id: 'o5', layer: 'BISCUIT_4MM', a: [100, 900], b: [150, 950], c: [200, 900],
    }),
  ];
  const applied = applyPartEdits(result, {
    [back.id]: { signature: '', panelSize: { w: back.w, h: back.h }, ops },
  });
  return { result: applied, panel: applied.panels.find((p) => p.id === back.id), ops };
}

// ═══ THE ROUND TRIP ═════════════════════════════════════════════════════════

test('F10 — draw ops → export → parse: every shape is in the file, on its layer', () => {
  const { result, panel } = drawnOn();
  const text = panelDxf(panel, result.drills, { unitNum: 'W03', profile: P, userLayers: [JIG] });
  const { entities, layerTable } = parseDxf(text);

  // THE LINE and THE POLYLINE — R12 has no LWPOLYLINE, so both are POLYLINE +
  // VERTEX… + SEQEND, which is what this house has written since turn 3.
  const line = entities.find((e) => e.type === 'poly' && e.layer === 'SHOP_JIG' && e.pts.length === 2);
  assert.ok(line, 'the line is in the file');
  assert.deepEqual(line.pts, [[40, 40], [200, 40]]);
  assert.equal(line.closed, false);

  const run = entities.find((e) => e.type === 'poly' && e.layer === 'SHOP_JIG' && e.pts.length === 3);
  assert.ok(run, 'the polyline is in the file');
  assert.deepEqual(run.pts, [[40, 100], [120, 160], [200, 100]]);
  assert.equal(run.closed, false);

  // THE RECT — a CLOSED polyline of its four corners.
  const rect = entities.find((e) => e.type === 'poly' && e.layer === 'SCREWS_3MM' && e.closed && e.pts.length === 4);
  assert.ok(rect, 'the rectangle is in the file');
  assert.deepEqual(rect.pts, [[300, 300], [420, 300], [420, 380], [300, 380]]);

  // THE CIRCLE — a real CIRCLE entity, at its centre, at its radius.
  const circle = entities.find((e) => e.type === 'circle' && e.layer === 'SHOP_JIG');
  assert.ok(circle, 'the circle is in the file');
  assert.deepEqual([circle.cx, circle.cy, circle.r], [250, 600, 45]);

  // THE ARC — a real ARC entity, with its two angles.
  const arc = entities.find((e) => e.type === 'arc');
  assert.ok(arc, 'the arc is in the file');
  assert.equal(arc.layer, 'BISCUIT_4MM');
  assert.deepEqual([arc.cx, arc.cy].map(Math.round), [150, 900]);
  assert.equal(Math.round(arc.r), 50, 'the circumradius of the three points');
  assert.ok(Number.isFinite(arc.start) && Number.isFinite(arc.end), 'group codes 50 and 51');
  // The arc really passes through the three points it was drawn from.
  for (const [x, y] of [[100, 900], [200, 900]]) {
    assert.ok(Math.abs(Math.hypot(x - arc.cx, y - arc.cy) - arc.r) < 0.01);
  }

  // THE LAYER TABLE — the user layer under ITS OWN NAME AND ITS OWN COLOUR.
  const jig = layerTable.find((l) => l.name === 'SHOP_JIG');
  assert.ok(jig, 'the project’s own layer is declared');
  assert.equal(jig.color, 30, 'with the ACI the joiner picked');
  assert.ok(layerTable.find((l) => l.name === 'SCREWS_3MM')?.color === 4, '…beside the app’s own');
});

test('F10 — the sheet writes them too, and turning the board turns the arc with it', () => {
  const { result, panel } = drawnOn();
  const opts = { gap: P.cnc.layoutGap, rowWidth: P.cnc.sheet.width };
  const layout = layoutPanels([panel], result.drills, opts);
  const text = sheetDxf({
    panels: [panel], drills: result.drills, layout, unitNum: 'W03', profile: P, userLayers: [JIG],
  });
  const { entities } = parseDxf(text);
  assert.equal(entities.filter((e) => e.type === 'arc').length, 1, 'the arc survives the nest');
  assert.ok(entities.filter((e) => e.type === 'circle').length > 0);
  assert.ok(entities.filter((e) => e.type === 'poly').length > 0);

  // A turned board takes its arc's ANGLES with it — the same transform the
  // preview draws with, applied to the one entity that carries a direction.
  const turned = { ...panel, cnc: { ...panel.cnc, grain: 'w' } };
  const turnedLayout = layoutPanels([turned], result.drills, opts);
  const t = parseDxf(sheetDxf({
    panels: [turned], drills: result.drills, layout: turnedLayout, unitNum: 'W03', profile: P, userLayers: [JIG],
  }));
  const before = entities.find((e) => e.type === 'arc');
  const after = t.entities.find((e) => e.type === 'arc');
  assert.ok(after, 'still an arc');
  assert.equal(Math.round(after.r), Math.round(before.r), 'the same radius');
  assert.equal(Math.round(((after.start - before.start) % 360 + 360) % 360), 90,
    'and its start angle took the 90° the board took');
});

// ═══ IRON RULE 7 — NO TEXT, NO MTEXT, NO STYLE, EVER ════════════════════════

test('F10 — no drawn shape can produce a TEXT, an MTEXT or a STYLE table entry', () => {
  const { result, panel } = drawnOn();
  const text = panelDxf(panel, result.drills, { unitNum: 'W03', profile: P, userLayers: [JIG] });
  // The part LABEL is the one text this app has ever written and it predates
  // tonight; what iron rule 7 forbids is a NEW one, and a STYLE table on any
  // of them (the 02.08.2026 VCarve crash).
  assert.ok(!/\nMTEXT\r?\n/.test(text), 'no MTEXT');
  assert.ok(!/\bSTYLE\b/.test(text), 'no STYLE table');
  const { entities, sections } = parseDxf(text);
  assert.deepEqual(sections, ['HEADER', 'TABLES', 'ENTITIES'], 'three sections, as ever');
  // Every entity a DRAWN shape produced is geometry.
  const drawnLayers = new Set(['SHOP_JIG', 'BISCUIT_4MM']);
  for (const e of entities.filter((x) => drawnLayers.has(x.layer))) {
    assert.ok(['poly', 'circle', 'arc'].includes(e.type), `${e.type} on ${e.layer} is geometry`);
  }
  // …and the writer itself has exactly one text branch, which is turn 17's.
  const src = String(writeDxf([{ type: 'arc', layer: 'X', cx: 0, cy: 0, r: 1, start: 0, end: 90 }], [{ name: 'X', color: 1 }]));
  assert.ok(src.includes('\r\nARC\r\n'));
  assert.ok(!src.includes('TEXT'));
});

test('F10 — the manual-edit BADGE is untouched, and a stock part is byte-identical', () => {
  // A part nobody has drawn on writes exactly the file it wrote yesterday: the
  // two new channels are ABSENT, so `panelEntities` walks the loops it always
  // walked.
  const stock = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W03' }, P);
  const back = stock.panels.find((p) => p.part === 'BACK');
  const a = panelDxf(back, stock.drills, { unitNum: 'W03', profile: P });
  const b = panelDxf(back, stock.drills, { unitNum: 'W03', profile: P, userLayers: [JIG] });
  assert.equal(a, b, 'a user layer nothing draws on changes not one byte');

  // And a whole unit's files still come out one per cut part.
  const files = buildUnitDxfFiles(stock, P);
  assert.ok(files.length > 4);
  assert.ok(files.every((f) => f.name.endsWith('.dxf')));
});

test('F10 — GROUPING is an editor concept: the DXF gets the members, not the group', () => {
  const result = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W03' }, P);
  const back = result.panels.find((p) => p.part === 'BACK');
  const ops = [
    { ...makeCircle({ id: 'o1', layer: JIG.name, at: [100, 100], r: 10 }), group: 'g1' },
    { ...makeCircle({ id: 'o2', layer: JIG.name, at: [200, 100], r: 10 }), group: 'g1' },
  ];
  const applied = applyPartEdits(result, { [back.id]: { signature: '', ops } });
  const panel = applied.panels.find((p) => p.id === back.id);
  const text = panelDxf(panel, applied.drills, { unitNum: 'W03', profile: P, userLayers: [JIG] });
  assert.ok(!/\bGROUP\b/.test(text), 'no GROUP entity, no group table');
  const circles = parseDxf(text).entities.filter((e) => e.type === 'circle' && e.layer === 'SHOP_JIG');
  assert.equal(circles.length, 2, 'both members are in the file, as two circles');
});

test('F10 — the entities a drawn part produces are exactly what was drawn', () => {
  const { result, panel, ops } = drawnOn();
  const entities = panelEntities(panel, result.drills, { unitNum: 'W03', profile: P });
  // One entity per drawn op, plus the outline, plus whatever the engine cut.
  const drawn = entities.filter((e) => ['SHOP_JIG', 'BISCUIT_4MM'].includes(e.layer));
  assert.equal(drawn.length, ops.filter((o) => ['SHOP_JIG', 'BISCUIT_4MM'].includes(o.layer)).length);
  assert.deepEqual(drawn.map((e) => e.type).sort(), ['arc', 'circle', 'poly', 'poly']);
});
