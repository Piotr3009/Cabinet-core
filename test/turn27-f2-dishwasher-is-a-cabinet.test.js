// ─── TURN 27 F2 — the dishwasher stops being a species of its own ───────────
//
// The owner: *"dlaczego zmywarki nie traktujesz jak szafki?"* He is right, and
// the record proves it — legs ignored the run (turn 22), the front sat 3 mm
// high (turn 26), no shaker, no handle, no plinth, and it opened the wrong way.
// That is not six faults; it is ONE fault six times, and the cause was
// `dwPanel`: a parallel path that had to be remembered every time anything was
// added.
//
//   F2.1  an ORDINARY unit with two properties — `interiorOccupied` and
//         `frontOpens: 'drop'` — and the drop is FORWARD, to 45°.
//   F2.2  everything a front has, it has: shaker, handle, material, the 3 mm
//         gaps, the dimension chain. No `if (dwPanel)` in any of it.
//   F2.3  NO cup hinges and NO cup drilling — it screws to the appliance door.
//   F2.4  the plinth in front of it is the run's plinth passing through.
//   F2.5  `dwPanel`'s dead geometry is gone; every MEASURED number moved into
//         the unit type.
//   F2.6  a D/W beside a BUD of the same width shares carcass laws exactly.
//
// ─── TURN 28 (CLAUDE.md F1): THE OWNER WALKED IT AND CORRECTED F2.1 ────────
//
// *"nie ma całego korpusu oprócz górnego panela, który ma 600 mm bez żadnych
// dog bonów — tak jak było, tylko chciałem żeby to było podciągnięte pod logikę
// szafki."*
//
// Turn 27 read "an ordinary unit" as "a carcass" and cut BUL, BUR, TOP, BOTTOM
// and BACK around a machine. What he asked for was the LOGIC, not the boards:
// the kit declares what it is made of in the same keys every other kit answers
// (`carcass.top/sides/bottom/back`) and the engine reads the declaration. What
// the declaration then emits is three pieces — a FRONT, a RAIL and a PLINTH.
//
// So F2.1's carcass half and F2.6 are rewritten to THIS law below. The half of
// turn 27 that was right — the INHERITANCE: shaker, handle, the 3 mm gaps, the
// dimension chain, the drop sign, no cups, the notched toe kick — is untouched,
// because none of it was ever about the boards.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { handleClassOf } from '../src/engine/handles.js';
import { frontDimensionRows } from '../src/engine/frontDimensions.js';
import { doorHingeDatum } from '../src/engine/doors.js';
import { autoPartsFor, takesPlinth } from '../src/engine/autoparts.js';

const build = (type, extra = {}) => computeCabinet(
  { ...defaultParamsFor(type, P), unit_num: '01', ...extra }, P,
);
const dw = (extra = {}) => build('DW_PANEL', extra);
const frontOf = (r) => r.panels.find((p) => p.part === 'FRONT');

const CARCASS = ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'];

// ─── F2.1 — an ordinary unit with two properties ────────────────────────────

test('F2.1 the type declares the two properties, and nothing else is special', () => {
  const type = getUnitType('DW_PANEL');
  assert.equal(type.interiorOccupied, true, 'the appliance is what is inside');
  assert.equal(type.frontOpens, 'drop');
  assert.equal(type.frontOpenAngleDeg, 45, 'the owner’s number — enough to read');
  // ─── TURN 28 (CLAUDE.md F1) ───────────────────────────────────────────────
  // …and it declares what it is MADE OF, in the very keys `top` and `back` have
  // been read from since turn 3. That is the difference between this and the
  // `dwPanel` path turn 27 burned: `sides` and `bottom` are questions the TYPE
  // answers, absent on every kit that has them, and the engine never learns the
  // word "dishwasher".
  assert.deepEqual(type.carcass, {
    top: 'rail', sides: 'none', bottom: 'none', back: 'none',
  });
});

test('F2.1 it is a FRONT, a RAIL and a PLINTH, and there is no fourth piece', () => {
  const r = dw({ plinth: true });
  assert.deepEqual(r.panels.map((p) => p.part).sort(), ['FRONT', 'PLINTH', 'TOP']);
  // The RAIL, to the owner's own number: "górnego panela, który ma 600 mm bez
  // żadnych dog bonów — tak jak było" — the piece the turn-26 engine cut.
  const rail = r.panels.find((p) => p.part === 'TOP');
  assert.equal(rail.w, r.params.width, 'the full opening, not the internal width');
  assert.equal(rail.w, 600, 'which on his 600 mm appliance gap is the 600 he said');
  assert.equal(rail.h, r.params.depth - P.board.thickness, 'the run’s own top depth');
  assert.equal(rail.h, 540);
  assert.equal(rail.thickness, P.board.thickness);
  assert.deepEqual(rail.cnc.outline, [[0, 0], [540, 0], [540, 600], [0, 600]], 'a bare rectangle');
  assert.deepEqual(rail.cnc.pockets, []);
  assert.deepEqual(rail.cnc.holes, []);
  // …and it finishes on the same line as the tops either side of it.
  assert.deepEqual(rail.box, {
    x: 0, y: r.params.height - P.board.thickness, z: P.board.thickness, w: 600, h: 18, d: 540,
  });
  // No carcass, and therefore nothing to drill and nothing to buy.
  for (const part of CARCASS.filter((x) => x !== 'TOP')) {
    assert.ok(!r.panels.some((p) => p.part === part), `a D/W has no ${part}`);
  }
  assert.equal(r.drills.length, 0, 'not one hole in the whole kit');
  assert.deepEqual(r.hardware, [], 'no legs, no hinges, no hardware');
});

test('F2.1 the PLINTH is on by DEFAULT — the piece he cares about most', () => {
  // The owner: *"najważniejszego czyli plinth i tak nie ma"*. A plinth is a
  // DECISION on every other kit and stays one; on the kit whose toe kick is one
  // of its three pieces the decision arrives already made.
  assert.equal(defaultParamsFor('DW_PANEL', P).plinth, true);
  assert.equal(defaultParamsFor('BUD', P).plinth, undefined, 'and nowhere else');
  const bare = dw();
  const kick = bare.panels.find((p) => p.part === 'PLINTH');
  assert.ok(kick, 'a bare default D/W has its toe kick');
  assert.equal(kick.h, P.baseUnit.legHeight, 'at the run’s own height');
  const ys = kick.cnc.outline.map(([, y]) => y);
  assert.ok(ys.includes(kick.h - getUnitType('DW_PANEL').plinthCutFromTop), 'notched, 20 from the top');
});

test('F2.1 interiorOccupied: nothing goes in, whatever is asked for', () => {
  const r = dw({
    shelves: 3,
    drawers: 2,
    rail: true,
    sections: [{
      width_mm: 600,
      items: [
        { id: 's1', kind: 'shelf', pos_mm: 400 },
        { id: 'p1', kind: 'partition', x_mm: 300 },
      ],
    }],
  });
  assert.equal(r.panels.filter((p) => p.role === 'shelf').length, 0, 'no shelves, no partitions');
  assert.equal(r.panels.filter((p) => p.role === 'drawer_box').length, 0, 'no drawer boxes');
  assert.equal(r.panels.filter((p) => p.part === 'DRAWER-FRONT').length, 0);
  assert.equal(r.drills.filter((d) => d.layer === P.shelfHoles.layer).length, 0, 'and no pin ladder');
  // …and the carcass is exactly the carcass of a bare one: nothing asked for
  // inside has moved a board.
  const cuts = (x) => x.panels.filter((p) => CARCASS.includes(p.part)).map((p) => `${p.id}:${p.w}x${p.h}`);
  assert.deepEqual(cuts(r), cuts(dw()));
});

test('F2.1 the front drops FORWARD, and 45° is the limit', () => {
  const face = frontOf(dw());
  assert.equal(face.meta.opening, 'drop');
  assert.equal(face.meta.openAngleDeg, 45);

  const view = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  // The pivot is the leaf's own BOTTOM edge…
  assert.match(view, /drops\s*\n\s*\? \[mm\(p\.box\.x \+ p\.box\.w \/ 2\), mm\(p\.box\.y\), mm\(p\.box\.z \+ p\.box\.d \/ 2\)\]/);
  // …and the turn about +x is POSITIVE. THE FAULT: a rotation by θ about +x
  // carries a point at +y to z = y·sin θ, so turn 26's negative sign sent the
  // top edge to −z — back INTO the carcass. Forward is plus.
  assert.match(view, /group\.current\.rotation\.x = a \* \(swing \?\? Math\.PI \/ 4\);/);
  assert.doesNotMatch(view, /rotation\.x = -a \*/, 'the inverted axis is gone');
  // The angle is the PIECE's, not a profile block a parallel path owned.
  assert.match(view, /if \(panel\?\.meta\?\.opening === 'drop'\) \{/);
  assert.match(view, /Number\(panel\.meta\.openAngleDeg\) \|\| 45/);
});

test('F2.1 it answers "Open all" with every other front', () => {
  const bar = readFileSync(new URL('../src/components/CanvasToolbar.jsx', import.meta.url), 'utf8');
  const at = bar.indexOf('const doorEntries');
  assert.ok(at > 0);
  const block = bar.slice(at, at + 400);
  assert.match(block, /p\.part === 'FRONT'/);
  assert.doesNotMatch(block, /meta\?\.appliance/, '“Open all” means all');
});

// ─── F2.2 — everything a front has ──────────────────────────────────────────

test('F2.2 the shaker applies to it, like any other leaf', () => {
  const face = frontOf(dw({ front_type: 'S' }));
  assert.ok(face.meta.shaker, 'it is a shaker');
  const pocket = (face.cnc.pockets || []).find((x) => x.layer === 'SHAKER_PANEL_POCKET');
  assert.ok(pocket, 'and the pocket is on its sheet');
  assert.equal(face.meta.shaker.depth, pocket.depth);
});

test('F2.2 the handle applies to it — horizontal, and off the GESTURE', () => {
  const r = dw({ project_handle: { type: 'bar', centres: 160 } });
  const face = frontOf(r);
  assert.ok(face.meta.handle, 'it takes a handle');
  assert.equal(face.meta.handle.axis, 'horizontal');
  assert.equal(face.meta.handle.class, 'horizontal');
  assert.equal(r.drills.filter((d) => d.panel === face.id && d.layer === P.handles.layer).length, 2);
  // The class is decided on how the front is GRIPPED and not on `appliance`:
  // a front that falls forward about its bottom edge is gripped from above.
  assert.equal(
    handleClassOf({ role: 'front', part: 'FRONT', meta: { opening: 'drop' } }, getUnitType('DW_PANEL')),
    'horizontal',
  );
  // …and the FLAT rule, where there is no frame to centre on: 50 from the top.
  const flat = frontOf(dw({ front_type: 'F', project_handle: { type: 'knob' } }));
  assert.equal(flat.meta.handle.y, flat.h - P.handles.inset, '50 from the top');
  assert.equal(flat.meta.handle.x, flat.w / 2, 'centred on the width');
});

test('F2.2 the 3 mm gaps are the run’s, top and sides', () => {
  const r = dw();
  const face = frontOf(r);
  const H = defaultParamsFor('DW_PANEL', P).height;
  // `-cfg.doorExtend`, which on a base unit is a signed zero — the same datum
  // every door, pair of doors and bay leaf in the run takes.
  assert.equal(face.box.y + 0, 0, 'it starts at the carcass floor, like every base front');
  assert.equal(H - (face.box.y + face.h), P.doors.gap, 'the gap is at the top');
  assert.equal(face.box.z, r.params.depth + P.doors.gap, 'and it stands the gap off the face');
  // Turn 26's F5.1 fault, said as the number the owner measured, and gone.
  assert.notEqual(face.box.y, P.doors.gap, 'not three millimetres high');
});

test('F2.2 the dimension chain has it, like any other front', () => {
  const rows = frontDimensionRows(dw());
  assert.ok(rows.length > 0, 'a D/W front is dimensioned');
  const face = frontOf(dw());
  assert.ok(rows.some((r) => r.a === face.id || r.b === face.id || r.kind),
    'and the rows are about this piece');
});

test('F2.2 no `if (dwPanel)` is left in the engine or the scene', () => {
  // Grep-level, exactly as turn 26's R11 test guards the one dimension
  // component: the point of F2 is that a D/W stops being something every new
  // law has to remember, and a second path that reads a `dwPanel` block is how
  // it grows back.
  for (const file of [
    '../src/engine/cabinet.js',
    '../src/engine/handles.js',
    '../src/engine/shaker.js',
    '../src/engine/doors.js',
    '../src/3d/UnitView.jsx',
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    const code = src.split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    assert.doesNotMatch(code, /dwPanel/, `${file} does not read a dwPanel block`);
  }
});

// ─── F2.3 — no cups, anywhere ───────────────────────────────────────────────

test('F2.3 no cup hinges, no cup drilling, no plate pattern, nothing in the BOM', () => {
  const r = dw();
  const face = frontOf(r);
  assert.equal(r.totals.hinges, 0, 'it screws to the appliance’s own door');
  assert.equal(r.drills.filter((d) => d.panel === face.id && d.kind === 'cup').length, 0);
  assert.equal(r.drills.filter((d) => d.panel === face.id && d.kind === 'cup_screw').length, 0);
  assert.equal(r.drills.filter((d) => d.layer === P.hinges.layer).length, 0, 'no plate pattern in the sides');
  assert.equal(doorHingeDatum(face), null, 'and no datum for a hinge to stand on');
  // R10: the sheet and the scene agree, because they read the same record.
  assert.equal((r.drillSummary.hinge_centers || []).length, 0);
});

// ─── F2.4 — the plinth passes through ───────────────────────────────────────

test('F2.4 the toe kick is one piece, relieved 20 mm below its top edge', () => {
  const r = dw({ plinth: true, leg_height: 50 });
  const plinth = r.panels.find((p) => p.part === 'PLINTH');
  assert.equal(plinth.h, 50, 'at the run’s own height (turn 22, F4)');
  const ys = plinth.cnc.outline.map(([, y]) => y);
  assert.ok(ys.includes(plinth.h - getUnitType('DW_PANEL').plinthCutFromTop));
  assert.equal(Math.max(...ys), plinth.h, 'the top edge runs right through');
  // A BUD's plinth is a plain rectangle — the notch is the drop front's, and
  // it is keyed on the gesture rather than on the kit.
  const bud = build('BUD', { plinth: true, leg_height: 50 });
  const plain = bud.panels.find((p) => p.part === 'PLINTH');
  assert.equal(plain.cnc.outline.length, 4, 'four corners and no notch');
});

// ─── F2.5 — the measured numbers moved; the dead geometry went ──────────────

test('F2.5 594 and the 20 mm strip live on the TYPE now, and are unchanged', () => {
  const type = getUnitType('DW_PANEL');
  assert.equal(type.frontWidth, 594);
  assert.ok(type.frontWidth < 600, 'or the appliance door cannot swing past its neighbours');
  assert.equal(type.plinthCutFromTop, 20);
  for (const width of [500, 600, 900]) {
    assert.equal(frontOf(dw({ width })).w, 594, `a ${width} mm opening still cuts 594`);
  }
  for (const height of [700, 770, 900]) {
    assert.equal(frontOf(dw({ height })).h, height - P.doors.gap, 'and it lines up with the run');
  }
});

test('F2.5 `dwPanel` keeps its defaults and has lost its geometry', () => {
  assert.deepEqual(Object.keys(P.dwPanel), ['defaults'], 'the size a new one arrives at, and nothing else');
  assert.equal(P.dwPanel.topWidth, undefined, 'the 600 mm top was the parallel path’s');
  assert.equal(P.dwPanel.openAngleDeg, undefined);
  assert.equal(P.dwPanel.frontWidth, undefined);
  assert.equal(P.dwPanel.plinthCutFromTop, undefined);
});

// ─── F2.6 — parity with a BUD of the same width ─────────────────────────────

test('F2.6 a D/W beside a BUD of the same width stands in the run, piece for piece', () => {
  // ─── TURN 28 (CLAUDE.md F1) ───────────────────────────────────────────────
  // Turn 27 proved parity by comparing BOARDS, which is what led it to cut a
  // carcass in the first place. The parity that was ever the point is the one
  // the eye sees down a run: the toe kick on one line, the face on one line,
  // and the worktop lying flat across both. That is what is asserted now, and
  // it holds without the D/W owning a single board a dishwasher would displace.
  for (const width of [500, 600, 800]) {
    for (const height of [720, 770]) {
      const a = dw({ width, height, plinth: true });
      const b = build('BUD', {
        width, height, plinth: true, unit_num: '01',
      });
      // THE TOE KICK — the run's, at the same height, on the same line. Only
      // its OUTLINE differs, because the appliance door has to drop past it.
      const kick = (r) => r.panels.find((p) => p.part === 'PLINTH');
      assert.equal(kick(a).h, kick(b).h, `${width}×${height}: the same kick height`);
      assert.equal(kick(a).w, kick(b).w);
      assert.deepEqual(kick(a).box, kick(b).box, 'and on the same line');
      // THE FACE — same height, same datum, same standoff. Only the WIDTH
      // differs, and it differs by the measured 594 (F2.5).
      const fa = frontOf(a); const fb = frontOf(b);
      assert.equal(fa.h, fb.h, `${width}×${height}: the fronts line up`);
      assert.equal(fa.box.y, fb.box.y);
      assert.equal(fa.box.z, fb.box.z);
      // THE WORKTOP LINE — the D/W's rail finishes level with the BUD's top,
      // and to the same depth, so a worktop lies flat across the two.
      const topA = a.panels.find((p) => p.part === 'TOP');
      const topB = b.panels.find((p) => p.part === 'TOP');
      assert.equal(topA.box.y, topB.box.y, `${width}×${height}: level tops`);
      assert.equal(topA.box.z, topB.box.z);
      assert.equal(topA.h, topB.h, 'the same depth of board');
      // …and it spans the whole opening, where the BUD's sits between two sides.
      assert.equal(topA.w, width, 'the rail spans the opening');
      assert.equal(topB.w, width - 2 * P.board.thickness, '…and a BUD’s top does not');
      // The BUD is a box and carries a box's drilling; the D/W is not and does
      // not — named here rather than filtered away quietly.
      assert.equal(a.drills.length, 0, 'nothing to drill');
      assert.ok(b.drills.some((d) => d.layer === P.hinges.layer), '…and a BUD has a plate pattern');
    }
  }
});

test('F2.6 the FRONT is where the two differ, and it differs in the two ways named', () => {
  const a = frontOf(dw({ width: 600 }));
  const b = frontOf(build('BUD', { width: 600 }));
  assert.equal(a.h, b.h, 'the same height — it stands in the run');
  assert.equal(a.box.y, b.box.y, 'on the same line');
  assert.equal(a.box.z, b.box.z, 'at the same depth');
  assert.equal(a.w, 594, 'and 594 wide, which is the measured number');
  assert.equal(a.meta.opening, 'drop');
  assert.equal(b.meta.opening, undefined, 'an ordinary door says nothing of the kind');
});

test('F2.4 the STORE asks the same question the engine does about a plinth', () => {
  // The other half of "no plinth" on the owner's list of six. The engine has
  // gated on `type.plinth ?? type.legs` since turn 22 — legs and a toe kick are
  // two questions, and they only coincided until the D/W — while
  // `autoparts.takesPlinth` still asked `type.legs`. So the engine would cut it
  // and the app never asked for it. One gate now.
  assert.equal(takesPlinth('DW_PANEL', P), true, 'no legs, and a toe kick all the same');
  assert.equal(takesPlinth('BUD', P), true);
  assert.equal(takesPlinth('WUD', P), false, 'a wall unit hangs; it stands on nothing');
  const parts = autoPartsFor({
    unit: { type: 'DW_PANEL', params: { plinth: true, width: 600, height: 770 }, position: { x_mm: 0 } },
    wallWidth: 4000,
    others: [],
    roomHeight: 2500,
    design: {},
  }, P);
  assert.equal(parts.plinth, true, 'so the store carries it through to the engine');
});
