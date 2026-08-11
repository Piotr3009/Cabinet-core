// ─── TURN 20 F7: THE CNC SHEET ANSWERS THE POINTER ──────────────────────────
//
// Owner: hover any hole, pocket or groove on the sheet and be told what it is —
// like AutoCAD's rollover. Leave, and it goes.
//
// F7.2 splits the feature in two: "the data derivation is a pure function over
// the part's `cnc` block (unit-tested); the tooltip is presentation only." This
// is the unit test of the pure half, and it holds the numbers against the
// ENGINE's own cnc block — the same records the DXF is written from — because a
// rollover that agreed with itself and not with the machine would be worse than
// no rollover at all.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  edgeDistances, featureReadout, featureSpan, partRollovers, toolRadius,
} from '../src/engine/cnc/rollover.js';
import { partSize } from '../src/engine/drawings/partDetail.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { formatMm } from '../src/engine/format.js';

const budr = () => computeCabinet({
  type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01',
}, P);

const wardrobe = () => computeCabinet({
  type: 'WARDROBE',
  width: 600,
  height: 2150,
  depth: 578,
  board_t: 18,
  front_t: 25,
  front_type: 'S',
  hinge: 'L',
  unit_num: '01',
  shelves: 2,
  drawers: 2,
  doors: true,
}, P);

const rowOf = (readout, label) => readout.rows.find((r) => r.label === label)?.value;

test('F7.1 — a ⌀35 cup drill says what it is, how big, how deep and where', () => {
  const r = wardrobe();
  const front = r.panels.find((p) => p.part === 'FRONT');
  const features = partRollovers(front, r.drills, P);
  const cup = features.find((f) => f.layer === 'FRONT_HINGES_35MM');
  assert.ok(cup, 'the door carries its hinge cups');

  const drill = r.drills.find((d) => d.panel === front.id && d.layer === 'FRONT_HINGES_35MM');
  const size = partSize(front);

  assert.equal(cup.readout.title, 'Drill · Hinge cups ⌀35');
  assert.equal(cup.readout.subtitle, 'FRONT_HINGES_35MM');
  assert.equal(rowOf(cup.readout, '⌀'), `${formatMm(drill.d)} mm`);
  assert.equal(rowOf(cup.readout, 'Depth'), 'through', 'the LISP carries no cup depth — it does not invent one');
  // Measured from the CENTRE, off the part's own four edges (F7.1).
  assert.equal(rowOf(cup.readout, 'From X edges'), `${formatMm(drill.x)} / ${formatMm(size.w - drill.x)} mm`);
  assert.equal(rowOf(cup.readout, 'From Y edges'), `${formatMm(drill.y)} / ${formatMm(size.h - drill.y)} mm`);
  // A hole has no corner for the tool to round.
  assert.equal(rowOf(cup.readout, 'Corner R'), undefined);
});

test('F7.1 — a runner pocket says its W×H, its true depth and its corner radius', () => {
  const r = budr();
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const features = partRollovers(side, r.drills, P);
  const groove = features.find((f) => f.layer === 'DRAWER_RUNNER_POCKET');
  assert.ok(groove, 'a BUDR drawer side carries the runner reduction');

  const pocket = side.cnc.pockets.find((p) => p.layer === 'DRAWER_RUNNER_POCKET');
  const size = partSize(side);
  const w = Math.abs(pocket.x2 - pocket.x1);
  const h = Math.abs(pocket.y2 - pocket.y1);

  assert.equal(groove.readout.title, 'Pocket · Runner groove');
  assert.equal(rowOf(groove.readout, 'Size'), `${formatMm(w)} × ${formatMm(h)} mm`);
  assert.equal(rowOf(groove.readout, 'Depth'), `${formatMm(P.baseDrawerUnit.runnerPocketDepth)} mm`);
  assert.equal(rowOf(groove.readout, 'Depth'), `${formatMm(pocket.depth)} mm`, 'the engine’s own number');
  assert.equal(rowOf(groove.readout, 'Corner R'), `${formatMm(P.cnc.toolDiameter / 2)} mm`);

  // Measured from the NEAREST EDGE of the cut, not from its centre.
  const left = Math.min(pocket.x1, pocket.x2);
  const right = Math.max(pocket.x1, pocket.x2);
  assert.equal(rowOf(groove.readout, 'From X edges'), `${formatMm(left)} / ${formatMm(size.w - right)} mm`);
});

test('F7.1 — the bottom groove is 7 mm deep and says so, beside a 2 mm one', () => {
  const r = budr();
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const features = partRollovers(side, r.drills, P);
  const bottom = features.find((f) => f.layer === 'DRAWER_BOTTOM_POCKET');
  assert.equal(rowOf(bottom.readout, 'Depth'), `${formatMm(P.baseDrawerUnit.bottomPocketDepth)} mm`);
  const runner = features.find((f) => f.layer === 'DRAWER_RUNNER_POCKET');
  assert.notEqual(rowOf(bottom.readout, 'Depth'), rowOf(runner.readout, 'Depth'),
    'two cuts, two depths — that is the question a joiner asks first');
});

test('F7.1 — a biscuit mark is a cutter PASS, with its length', () => {
  const r = computeCabinet({
    type: 'WARDROBE',
    width: 1200,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    front_type: 'S',
    hinge: 'L',
    unit_num: '01',
    partition: true,
  }, P);
  const marked = r.panels.find((p) => (p.cnc?.marks || []).length);
  if (!marked) return; // this kit has no biscuits configured — nothing to assert
  const features = partRollovers(marked, r.drills, P);
  const mark = features.find((f) => f.kind === 'mark');
  assert.match(mark.readout.title, /^Cutter pass · /);
  assert.ok(rowOf(mark.readout, 'Pass'), 'a pass says how long it is');
  assert.equal(rowOf(mark.readout, 'Corner R'), undefined, 'an in-and-out pass leaves no corner');
});

test('F7.2 — EVERY feature of EVERY part of every kit answers, and none throws', () => {
  for (const type of ['WARDROBE', 'BUDR', 'BUDR4', 'WUD', 'SINK', 'OVEN_BASE', 'FRIDGE', 'BUDTALL']) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01' }, P);
    for (const panel of r.panels.filter((p) => p.cnc)) {
      const size = partSize(panel);
      for (const f of partRollovers(panel, r.drills, P)) {
        assert.ok(f.readout.title.includes('·'), `${type} ${panel.id} ${f.id}: kind + layer`);
        assert.ok(f.readout.rows.length >= 3, `${type} ${panel.id} ${f.id}: too few rows`);
        for (const row of f.readout.rows) {
          assert.ok(typeof row.value === 'string' && row.value.length, `${f.id}: ${row.label} is empty`);
          assert.ok(!/NaN|undefined/.test(row.value), `${f.id}: ${row.label} = ${row.value}`);
        }
        // Every distance is inside the board it is measured on.
        const { edges } = f.readout;
        for (const [name, value] of Object.entries(edges)) {
          assert.ok(Number.isFinite(value), `${f.id}: ${name} is not a number`);
          assert.ok(value >= -1e-6 - (size.w + size.h), `${f.id}: ${name} is nonsense`);
        }
      }
    }
  }
});

test('F7.2 — the derivation reaches nothing: hovering cannot change a byte', () => {
  const r = budr();
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const before = JSON.stringify({ panels: r.panels, drills: r.drills });
  for (let i = 0; i < 50; i += 1) partRollovers(side, r.drills, P);
  assert.equal(JSON.stringify({ panels: r.panels, drills: r.drills }), before,
    'a thousand hovers and the record is the record');
});

// ─── the arithmetic on its own ──────────────────────────────────────────────

test('F7 — a drill is measured from its centre and a pocket from its edges', () => {
  const size = { w: 600, h: 400 };
  const hole = featureSpan({ kind: 'hole', x: 100, y: 50, d: 8 });
  assert.deepEqual(edgeDistances(hole, size, true), {
    left: 100, right: 500, bottom: 50, top: 350,
  });
  const pocket = featureSpan({
    kind: 'pocket', x: 100, y: 50, w: 40, h: 20,
  });
  assert.deepEqual(edgeDistances(pocket, size, false), {
    left: 100, right: 460, bottom: 50, top: 330,
  });
});

test('F7 — a part nested TURNED is measured in its own drawn frame', () => {
  // A BUDR drawer side is laid out rotated, so its CNC width is the side's
  // height. Measuring against `panel.w`/`panel.h` would put every distance on
  // the wrong axis, which is the bug turn 17 fixed for the LABEL and this must
  // not reintroduce for the rollover.
  const r = budr();
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  assert.equal(side.cnc.rotated, true);
  const size = partSize(side);
  assert.equal(size.w, side.cnc.drawn_w);
  const groove = partRollovers(side, r.drills, P).find((f) => f.kind === 'pocket');
  assert.ok(groove.readout.edges.left + groove.readout.edges.right <= size.w + 1e-9);
  assert.ok(groove.readout.edges.bottom + groove.readout.edges.top <= size.h + 1e-9);
});

test('F7 — the corner radius is the profile’s cutter, and zero without one', () => {
  assert.equal(toolRadius(P), P.cnc.toolDiameter / 2);
  assert.equal(toolRadius(null), 0);
  const bare = featureReadout(
    { w: 100, h: 100, cnc: {} },
    {
      id: 'pocket-0', kind: 'pocket', layer: 'PUZZLE_SOCKET', x: 0, y: 0, w: 10, h: 10,
    },
    null,
  );
  assert.equal(rowOf(bare, 'Corner R'), undefined, 'no cutter named, no corner claimed');
});
