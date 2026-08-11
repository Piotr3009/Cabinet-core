import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  partitionBackScrewRun, partitionBackScrews, partitionBackSpec,
} from '../src/engine/partitionFixings.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { panelDxf } from '../src/engine/cnc/dxf.js';

// ─── TURN 23 · F5 (no borrowed biscuits) + F6 (screws in the back) ──────────
//
// Two named CNC classes and they are one correction to the same joint. The
// LISP lines that justify both are quoted in `engine/partitionFixings.js` and
// again in `verify/t23/cnc-export-identity.md`.

/** A cabinet with N partitions at the given x positions. */
function withPartitions(type, xs, extra = {}) {
  const base = { ...defaultParamsFor(type, P), ...extra };
  return computeCabinet({
    ...base,
    sections: [{
      width_mm: base.width,
      items: [
        ...(extra.items || []),
        ...xs.map((x, i) => ({ id: `p${i + 1}`, kind: 'partition', x_mm: x })),
      ],
    }],
  }, P);
}

const backScrews = (result) => result.drills
  .filter((d) => d.kind === 'partition_back_screw')
  .sort((a, b) => a.x - b.x || a.y - b.y);

// ─── F6 — THE SPACING LAW, as arithmetic ───────────────────────────────────

test('F6.1 — CLAUDE.md\'s own worked example: 2400 ⇒ 2300 span ⇒ 7 screws at ~383', () => {
  const run = partitionBackScrewRun({ from: 0, to: 2400, profile: P });
  assert.equal(run.length, 7);
  assert.equal(run[0], 50, 'the first is 50 from the end — the LISP\'s number');
  assert.equal(run[run.length - 1], 2350, '…and so is the last');
  const pitch = run[1] - run[0];
  assert.ok(Math.abs(pitch - 383.3333) < 0.001, `pitch ${pitch}`);
  assert.ok(pitch <= P.partitionBack.maxPitch, 'never over the owner\'s cap');
});

test('F6.1 — the intermediates are spread EVENLY, not marched from one end', () => {
  const run = partitionBackScrewRun({ from: 0, to: 2400, profile: P });
  const pitches = run.slice(1).map((y, i) => y - run[i]);
  for (const p of pitches) assert.ok(Math.abs(p - pitches[0]) < 1e-9, 'one pitch, not a short last gap');
});

test('F6.1 — the ends are ALWAYS 50, at every height', () => {
  for (const h of [400, 700, 900, 1000, 1600, 2100, 2400, 3000]) {
    const run = partitionBackScrewRun({ from: 0, to: h, profile: P });
    assert.equal(run[0], 50, `${h}: first`);
    assert.equal(run[run.length - 1], h - 50, `${h}: last`);
    const pitches = run.slice(1).map((y, i) => y - run[i]);
    for (const p of pitches) assert.ok(p <= P.partitionBack.maxPitch + 1e-9, `${h}: pitch ${p}`);
  }
});

test('F6.1 — the count is the smallest that honours the cap, never one more', () => {
  // Exactly ON the cap takes no extra: a 900 partition is an 800 span, two
  // gaps of 400, three screws.
  const on = partitionBackScrewRun({ from: 0, to: 900, profile: P });
  assert.deepEqual(on, [50, 450, 850]);
  // One millimetre over and a third gap appears — and all three even out.
  const over = partitionBackScrewRun({ from: 0, to: 901, profile: P });
  assert.equal(over.length, 4);
  assert.ok(over[1] - over[0] < 400);
});

test('F6.1 — the run is measured in the cabinet\'s frame, not from zero', () => {
  const run = partitionBackScrewRun({ from: 18, to: 2382, profile: P });
  assert.equal(run[0], 68);
  assert.equal(run[run.length - 1], 2332);
});

test('F6 — a run too short for two ends gets ONE screw, centred, never a hole off the board', () => {
  const short = partitionBackScrewRun({ from: 1000, to: 1080, profile: P });
  assert.deepEqual(short, [1040]);
  assert.deepEqual(partitionBackScrewRun({ from: 100, to: 100, profile: P }), []);
  assert.deepEqual(partitionBackScrewRun({ from: 100, to: 50, profile: P }), []);
  assert.deepEqual(partitionBackScrewRun({ from: NaN, to: 50, profile: P }), []);
});

test('F6 — both numbers are profile values, and a stored profile gets them back', () => {
  assert.equal(P.partitionBack.fromEnd, 50);
  assert.equal(P.partitionBack.maxPitch, 400);
  assert.equal(P.partitionBack.layer, 'SCREWS_3MM', 'the LISP\'s own layer, joined not duplicated');
  assert.equal(P.partitionBack.screwDiameter, P.puzzle.screwDiameter);

  // A profile saved before this turn. It has to carry the three blocks the
  // migration treats as "this is a real profile" or it is replaced wholesale.
  const stored = (extra) => migrateCabinetProfile({
    carcass: { ...P.carcass }, puzzle: { ...P.puzzle }, wardrobe: { ...P.wardrobe }, ...extra,
  });
  assert.deepEqual(stored({}).partitionBack, P.partitionBack);
  // …and a workshop that changes the cap changes the answer, with no code edit.
  const tighter = stored({ partitionBack: { maxPitch: 300 } });
  assert.equal(tighter.partitionBack.fromEnd, 50, 'the rest of the block survives');
  assert.equal(partitionBackScrewRun({ from: 0, to: 2400, profile: tighter }).length, 9);
});

test('F6.2 — a SPLIT partition is drilled per SEGMENT, never as one long run', () => {
  const runs = [
    { x: 459, from: 18, to: 1000 },
    { x: 459, from: 1018, to: 2382 },
  ];
  const screws = partitionBackScrews(runs, P);
  const lower = screws.filter((s) => s.y < 1009).map((s) => s.y);
  const upper = screws.filter((s) => s.y > 1009).map((s) => s.y);
  assert.equal(lower[0], 68, 'the lower segment starts 50 off its own bottom');
  assert.equal(lower[lower.length - 1], 950, '…and ends 50 off its own top');
  assert.equal(upper[0], 1068, 'the upper segment starts 50 off ITS bottom');
  assert.equal(upper[upper.length - 1], 2332);
  // No screw lands in the shelf between the two segments.
  assert.equal(screws.some((s) => s.y > 950 && s.y < 1068), false);
});

// ─── F6 — on the engine ────────────────────────────────────────────────────

test('F6 — one screw line per partition, on the partition\'s own axis', () => {
  const result = withPartitions('WARDROBE', [450], { width: 900, height: 2400 });
  const vp = result.panels.find((p) => p.part === 'VPART');
  const rows = backScrews(result);
  assert.equal(rows.length, 7, 'a 2364 partition takes seven');
  assert.deepEqual([...new Set(rows.map((r) => r.x))], [vp.box.x + vp.box.w / 2],
    'the line is on the middle of the partition\'s edge');
  assert.deepEqual([...new Set(rows.map((r) => r.layer))], [partitionBackSpec(P).layer]);
  assert.deepEqual([...new Set(rows.map((r) => r.d))], [3]);
  assert.equal(rows[0].y, vp.box.y + 50);
  assert.equal(rows[rows.length - 1].y, vp.box.y + vp.box.h - 50);
});

test('F6 — TWO partitions are TWO lines', () => {
  const result = withPartitions('WARDROBE', [400, 800], { width: 1400 });
  const xs = [...new Set(backScrews(result).map((r) => r.x))];
  assert.equal(xs.length, 2);
  const vparts = result.panels.filter((p) => p.part === 'VPART');
  assert.deepEqual(xs.sort((a, b) => a - b), vparts.map((v) => v.box.x + v.box.w / 2).sort((a, b) => a - b));
});

test('F6 — every screw lands ON the BACK panel, in the BACK\'s own frame', () => {
  const result = withPartitions('WARDROBE', [450], { width: 900 });
  const back = result.panels.find((p) => p.part === 'BACK');
  assert.ok(back, 'this kit has a back');
  for (const row of backScrews(result)) {
    assert.equal(row.panel, back.id);
    assert.ok(row.x > 0 && row.x < back.w, `x ${row.x} is off a ${back.w} back`);
    assert.ok(row.y > 0 && row.y < back.h, `y ${row.y} is off a ${back.h} back`);
  }
});

test('F6 — a partition SPLIT BY A FIXED SHELF drills per segment on the engine too', () => {
  const base = defaultParamsFor('WARDROBE', P);
  const result = computeCabinet({
    ...base,
    width: 900,
    height: 2400,
    sections: [{
      width_mm: 900,
      items: [
        { id: 's1', kind: 'shelf', pos_mm: 1200, variant: 'fixed' },
        { id: 'p1', kind: 'partition', x_mm: 450 },
      ],
    }],
  }, P);
  const vparts = result.panels.filter((p) => p.part === 'VPART');
  const rows = backScrews(result);
  // Whether the shelf splits the partition or carries it, the invariant is the
  // same and it is the one F6.2 states: every VPART's own run is bounded by its
  // own ends, 50 in from each.
  for (const vp of vparts) {
    const mine = rows.filter((r) => Math.abs(r.x - (vp.box.x + vp.box.w / 2)) < 1e-6
      && r.y >= vp.box.y - 1e-6 && r.y <= vp.box.y + vp.box.h + 1e-6);
    assert.ok(mine.length >= 1, `${vp.id} is held by something`);
    const first = Math.min(...mine.map((r) => r.y));
    const last = Math.max(...mine.map((r) => r.y));
    if (vp.box.h > 100) {
      assert.ok(Math.abs(first - (vp.box.y + 50)) < 1e-6, `${vp.id} first at ${first}`);
      assert.ok(Math.abs(last - (vp.box.y + vp.box.h - 50)) < 1e-6, `${vp.id} last at ${last}`);
    }
    const ys = mine.map((r) => r.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i += 1) {
      assert.ok(ys[i] - ys[i - 1] <= P.partitionBack.maxPitch + 1e-6, `${vp.id} pitch`);
    }
  }
  assert.equal(rows.length, vparts.reduce((n, vp) => n + backScrews(result)
    .filter((r) => Math.abs(r.x - (vp.box.x + vp.box.w / 2)) < 1e-6
      && r.y >= vp.box.y - 1e-6 && r.y <= vp.box.y + vp.box.h + 1e-6).length, 0),
  'no screw belongs to no partition');
});

test('F6 — it reaches the DXF as ⌀3 circles on SCREWS_3MM', () => {
  const result = withPartitions('WARDROBE', [450], { width: 900 });
  const back = result.panels.find((p) => p.part === 'BACK');
  const dxf = panelDxf(back, result.drills, { unitNum: '01', profile: P });
  assert.ok(dxf.includes('SCREWS_3MM'));
  const circles = (dxf.match(/\r\n40\r\n1\.5\r\n/g) || []).length;
  assert.ok(circles >= 7, `only ${circles} ⌀3 circles on the back`);
});

// ─── F6.3 — the LISP's own lines are UNTOUCHED ─────────────────────────────

test('F6.3 — the DP-partition back line keeps its own law', () => {
  const base = defaultParamsFor('WARDROBE', P);
  const result = computeCabinet({ ...base, drawers: 3 }, P);
  const dp = result.drills.filter((d) => d.kind === 'partition_screw' && d.panel === 'BACK');
  // Three across the back on the horizontal partition's centre line, exactly as
  // `drawWardrobeDPHolesBACK`'s neighbours have drilled since turn 1.
  assert.equal(dp.length, 3);
  assert.deepEqual([...new Set(dp.map((d) => d.y))].length, 1, 'one row');
  const own = result.drills.filter((d) => d.kind === 'dp_screw' && d.panel === 'BACK');
  assert.ok(own.length >= 2, 'and the drawer panel\'s own pair survives');
  for (const d of own) assert.equal(d.layer, 'SCREWS_3MM');
});

test('F6.3 — the rail partitioner keeps its own law', () => {
  const base = defaultParamsFor('WARDROBE', P);
  const result = computeCabinet({ ...base, rail: true }, P);
  const rail = result.drills.filter((d) => d.kind === 'rail_partition_screw');
  assert.ok(rail.length > 0, 'the wardrobe still drills its rail partitioner');
  for (const d of rail) assert.equal(d.layer, 'SCREWS_3MM');
  // One row, on the rail partitioner's own centre line — not this turn's class.
  assert.equal([...new Set(rail.map((d) => d.y))].length, 1);
  assert.equal(result.drills.some((d) => d.kind === 'partition_back_screw'), false,
    'a cabinet with no vertical partition takes none of F6');
});

// ─── The identity promise ──────────────────────────────────────────────────

test('F5 + F6 — a cabinet with NO partition emits neither class, in any kit', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const result = computeCabinet(defaultParamsFor(id, P), P);
    assert.equal(result.drills.some((d) => d.kind === 'partition_back_screw'), false, `${id} grew a back screw`);
    assert.equal(result.drills.some((d) => d.kind === 'biscuit_screw'), false, `${id} grew a biscuit screw`);
    for (const panel of result.panels) {
      assert.equal(panel.cnc?.marks, undefined, `${id} ${panel.id} grew a mark`);
    }
  }
});

test('F5 + F6 — a cabinet WITH a partition changes only the BACK and the partition', () => {
  const plain = computeCabinet({ ...defaultParamsFor('WARDROBE', P), width: 900 }, P);
  const parted = withPartitions('WARDROBE', [450], { width: 900 });
  const key = (r) => `${r.panel}|${r.kind}|${r.layer}|${r.x}|${r.y}|${r.d}`;
  const before = new Set(plain.drills.map(key));
  const grew = parted.drills.filter((d) => !before.has(key(d)));
  // Everything new is either this turn's named class or the drilling a
  // partition has always brought with it — and none of it is a biscuit.
  assert.ok(grew.length > 0);
  assert.equal(grew.some((d) => d.kind === 'biscuit_screw'), false);
  const onBack = grew.filter((d) => d.panel === 'BACK');
  assert.deepEqual([...new Set(onBack.map((d) => d.kind))], ['partition_back_screw']);
  // …and no panel that is not the back or a partition lost or gained a drill.
  const lost = plain.drills.filter((d) => !new Set(parted.drills.map(key)).has(key(d)));
  assert.deepEqual(lost, [], 'F5 removes nothing from a cabinet that has no partition');
});

test('F5 — the partition itself is CUT exactly as before, and machined less', () => {
  const parted = withPartitions('WARDROBE', [450], { width: 900 });
  const vp = parted.panels.find((p) => p.part === 'VPART');
  assert.ok(vp);
  assert.equal(vp.cnc?.marks, undefined, 'no end preparation at all');
  assert.equal(parted.drills.some((d) => d.panel === vp.id), false, 'and nothing bored into it');
  // Its outline is still the outline the sheet lays out.
  assert.equal(vp.w, vp.box.h);
  assert.equal(vp.h, vp.box.d);
});

test('F5 — no warning is raised about a joint that no longer exists', () => {
  const parted = withPartitions('WARDROBE', [450], { width: 900, depth: 300 });
  assert.equal(parted.warnings.some((w) => w.code === 'BISCUIT_JOINT_TOO_SHORT'), false);
});

test('F5/F6 — the numbers of the LISP are quoted where the code lives', async () => {
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(new URL('../src/engine/partitionFixings.js', import.meta.url), 'utf8');
  assert.match(text, /drawWDR_PARTITION_PANEL/);
  assert.match(text, /drawWardrobeDPHolesBACK/);
  assert.match(text, /L254-257/);
  assert.match(text, /L389-400/);
});

test('a partition is still a piece of furniture: the board count did not move', () => {
  const plain = computeCabinet({ ...defaultParamsFor('WARDROBE', P), width: 900 }, P);
  const parted = withPartitions('WARDROBE', [450], { width: 900 });
  assert.equal(parted.panels.length, plain.panels.length + 1);
  assert.equal(parted.totals.panels_lisp, plain.totals.panels_lisp + 1);
});
