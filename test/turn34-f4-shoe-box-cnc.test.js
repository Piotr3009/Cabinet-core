// ─── Turn 34, CLAUDE.md F4: the shoe box ON THE MACHINE ────────────────────
//
// The geometry is pinned next door (turn34-f4-shoe-box.test.js). This is the
// half that reaches a bed: the DXF the box writes, the two new layers it
// introduces, the one it reuses, and the two laws that have governed every
// export in this app since turn 2 —
//
//   · NO TEXT STYLE rides a new layer (the 02.08 VCarve crash law);
//   · a doubled edge is a board in the skip (the T25 guard, which runs over
//     every shoe-box panel of every probe scenario in turn25-f1).

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildUnitDxfFiles, panelDxf, parseDxf } from '../src/engine/cnc/dxf.js';
import { layoutPanels, panelBounds, sheetRect } from '../src/engine/cnc/layout.js';
import { CNC_LAYERS, cncLayer } from '../src/engine/cnc/layers.js';
import { machiningFor } from '../src/engine/machining.js';
import { panelFindings } from '../src/engine/cnc/edgeGuard.js';

const wardrobe = (variant, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  doors: true,
  width: 900,
  ...over,
  sections: [{
    width_mm: over.width ?? 900,
    items: [{
      id: 'sb1', kind: 'shoe_box', variant, dividers: 1,
    }],
  }],
}, P);

// ─── the layers ────────────────────────────────────────────────────────────

test('the kit\'s two new layers are in the table of record, with its ACI colours', () => {
  assert.equal(cncLayer('SHOE_GROOVE_6MM').aci, 1);
  assert.equal(cncLayer('SHOE_GROOVE_6MM').kind, 'pocket');
  assert.equal(cncLayer('SHOE_RUNNER_5MM').aci, 5);
  assert.equal(cncLayer('SHOE_RUNNER_5MM').kind, 'hole');
  // …and neither of them is an unknown falling through the table's default.
  assert.ok(CNC_LAYERS.some((l) => l.name === 'SHOE_GROOVE_6MM'));
  assert.ok(CNC_LAYERS.some((l) => l.name === 'SHOE_RUNNER_5MM'));
  // Both have a machining policy — F3.3 forbids silence.
  assert.ok(machiningFor('SHOE_GROOVE_6MM', P));
  assert.ok(machiningFor('SHOE_RUNNER_5MM', P));
});

test('SCREWS_3MM is REUSED for the FIX pilots — the kit reuses it, so do we', () => {
  const r = wardrobe('F');
  const pilots = r.drills.filter((d) => d.kind === 'shoe_pilot');
  assert.ok(pilots.length > 0);
  for (const d of pilots) assert.equal(d.layer, 'SCREWS_3MM');
});

// ─── the files themselves ──────────────────────────────────────────────────

test('every shoe-box board writes a DXF, and the groove is on its own layer', () => {
  const r = wardrobe('F');
  const boards = r.panels.filter((p) => p.id.startsWith('SHOE1-'));
  assert.equal(boards.length, 7);

  for (const board of boards) {
    const parsed = parseDxf(panelDxf(board, r.drills, { unitNum: '01', profile: P }));
    const outline = parsed.entities.filter((e) => e.type === 'poly' && e.layer === 'OUTLINE');
    assert.equal(outline.length, 1, `${board.id}: one outline`);
  }

  // The four WALLS carry the groove; the bottom, divider and front do not.
  const grooveOn = (id) => parseDxf(panelDxf(
    boards.find((b) => b.id === id), r.drills, { unitNum: '01', profile: P },
  )).entities.filter((e) => e.layer === 'SHOE_GROOVE_6MM');
  for (const id of ['SHOE1-SL', 'SHOE1-SR', 'SHOE1-BK', 'SHOE1-BF']) {
    assert.equal(grooveOn(id).length, 1, `${id} is grooved`);
  }
  for (const id of ['SHOE1-BT', 'SHOE1-DV', 'SHOE1-FR']) {
    assert.equal(grooveOn(id).length, 0, `${id} is not`);
  }
});

test('the SIDE groove is written as the kit\'s four-point PARALLELOGRAM', () => {
  const r = wardrobe('F');
  const side = r.panels.find((p) => p.id === 'SHOE1-SL');
  const parsed = parseDxf(panelDxf(side, r.drills, { unitNum: '01', profile: P }));
  const groove = parsed.entities.find((e) => e.layer === 'SHOE_GROOVE_6MM');
  assert.equal(groove.type, 'poly');
  assert.equal(groove.closed, true);
  assert.equal(groove.pts.length, 4, 'four corners — not an axis-aligned box');
  // It RISES: the two lower corners are at different heights, which a rectangle
  // could never be. That is the whole reason the writer learnt `pocket.pts`.
  assert.ok(Math.abs(groove.pts[1][1] - groove.pts[0][1]) > 1,
    'the groove climbs the slope');
  // …and its four sides are a parallelogram: opposite edges equal.
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [a, b, c, d] = groove.pts;
  assert.ok(Math.abs(len(a, b) - len(d, c)) < 1e-3);
  assert.ok(Math.abs(len(b, c) - len(a, d)) < 1e-3);
});

test('a pocket with no points of its own is still the rectangle it always was', () => {
  // The regression that matters: teaching the writer `pts` must not move a
  // single existing byte. A drawer box side's two grooves are rectangles.
  const r = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01' }, P);
  const boxSide = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  assert.ok(boxSide);
  const parsed = parseDxf(panelDxf(boxSide, r.drills, { unitNum: '01', profile: P }));
  const pockets = parsed.entities.filter((e) => /DRAWER_.*_POCKET/.test(e.layer));
  assert.ok(pockets.length >= 2);
  for (const p of pockets) {
    assert.equal(p.pts.length, 4);
    // Axis-aligned: two distinct x values and two distinct y values.
    assert.equal(new Set(p.pts.map(([x]) => x)).size, 2);
    assert.equal(new Set(p.pts.map(([, y]) => y)).size, 2);
  }
});

test('NOT ONE TEXT STYLE rides the new layers — the 02.08 VCarve crash law', () => {
  const r = wardrobe('D');
  for (const file of buildUnitDxfFiles(r, P)) {
    // The only text this exporter has ever written is the part label, and it
    // is on UNIT_NUMBER. Nothing else, and certainly not a STYLE table entry.
    assert.ok(!/^STYLE$/m.test(file.dxf), `${file.name} writes a STYLE table`);
    const parsed = parseDxf(file.dxf);
    for (const e of parsed.entities) {
      if (e.type !== 'text') continue;
      assert.equal(e.layer, P.cnc.unitNumberLayer, `${file.name}: text on ${e.layer}`);
    }
  }
});

test('the DRAWER variant drills ⌀5 on SHOE_RUNNER_5MM, in the carcass sides only', () => {
  const r = wardrobe('D');
  const fixings = r.drills.filter((d) => d.layer === 'SHOE_RUNNER_5MM');
  assert.equal(fixings.length, 4, 'two per side');
  for (const d of fixings) {
    assert.equal(d.d, 5);
    assert.ok(['BUL', 'BUR'].includes(d.panel), 'the CARCASS side takes the runner');
  }
  // …and nothing at all on the box's own boards.
  const boxBoards = new Set(r.panels.filter((p) => p.id.startsWith('SHOE1-')).map((p) => p.id));
  assert.ok(!r.drills.some((d) => boxBoards.has(d.panel)),
    'the box is grooved, never drilled — no hole without truth');
});

// ─── the guard and the sheet ───────────────────────────────────────────────

test('every shoe-box board passes the duplicate-edge guard, both variants', () => {
  for (const variant of ['F', 'D']) {
    const r = wardrobe(variant);
    for (const p of r.panels.filter((x) => x.id.startsWith('SHOE1-'))) {
      assert.deepEqual(panelFindings(p), [], `${variant}/${p.id}`);
    }
  }
});

test('the angled groove is inside its board\'s own bounds, and lays out with it', () => {
  const r = wardrobe('F');
  const side = r.panels.find((p) => p.id === 'SHOE1-SL');
  const b = panelBounds(side, r.drills);
  // The bounds must have SEEN the parallelogram: a pocket read as {x1..x2}
  // would have contributed NaN and blown the layout.
  assert.ok(Number.isFinite(b.minX) && Number.isFinite(b.maxY));
  assert.ok(b.w >= side.w - 1e-6 && b.h >= side.h - 1e-6);

  // ─── THE DIVERGENCE, PINNED (iron rule 3, reported in the PR body) ───────
  // Along its LENGTH the groove stays on the board — it runs (G, 0) to
  // (depth − G, rear), which is inside the outline both ways.
  const [p1, p2] = side.cnc.pockets[0].pts;
  for (const [x, y] of [p1, p2]) {
    assert.ok(x >= -1e-6 && x <= side.w + 1e-6, 'the groove\'s lower edge stays on the board');
    assert.ok(y >= -1e-6 && y <= side.h + 1e-6);
  }
  // ─── REWRITTEN 16.08.2026 (chat-fix, owner) ──────────────────────────────
  // The overshoot this block used to PIN is the very thing the owner called
  // a bug on sight: "dno ma za duży skos, wychodzi poza obręb boxa". Law v2
  // (cap = wall − board·cos a, fixed point) plus his 7° ceiling put the WHOLE
  // groove inside the board — the upper edge now finishes at or under the
  // wall's own 80, and the kit's law moved first.
  const [, , upperRear] = side.cnc.pockets[0].pts;
  assert.ok(upperRear[1] <= side.h + 1e-6,
    'the groove finishes inside the board — the owner\'s v2 law');
  assert.ok(upperRear[1] > 0, 'and it exists');
  // …and the sheet places it: `sheetRect` answers real numbers for a `pts`
  // pocket (the hover target), rather than NaN.
  const layout = layoutPanels(r.panels.filter((p) => p.cnc?.outline?.length), r.drills, {
    gap: P.cnc.layoutGap, rowWidth: P.cnc.layoutRowWidth,
  });
  const place = layout.places.find((pl) => pl.panel.id === side.id);
  assert.ok(place, 'the board is on the sheet');
  const rect = sheetRect(place, side.cnc.pockets[0]);
  for (const v of [rect.x, rect.y, rect.w, rect.h]) assert.ok(Number.isFinite(v));
  assert.ok(rect.w > 0 && rect.h > 0);
});
