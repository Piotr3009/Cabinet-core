// ─── TURN 28 F1 — the dishwasher is a FRONT, a RAIL and a PLINTH ────────────
//
// The owner walked turn 27 with his own eyes and said, verbatim:
//
//   *"nie ma całego korpusu oprócz górnego panela, który ma 600 mm bez żadnych
//   dog bonów — tak jak było, tylko chciałem żeby to było podciągnięte pod
//   logikę szafki."*
//
// Turn 27 read his earlier *"dlaczego zmywarki nie traktujesz jak szafki?"* as
// "cut it a carcass" and put BUL, BUR, TOP, BOTTOM and BACK around a machine
// that stands on the floor. What he asked for was the LOGIC and not the boards.
//
//   F1.1  the RAIL — 600 × 540 × 18, plain: full unit width (NOT internal),
//         full run depth, zero pockets, zero holes, no dog bones, no sockets,
//         no screw rows. The piece turn 26 cut (`bd7cec4`), to the hundredth.
//   F1.2  the FRONT — unchanged from turn 27: 594 × 767 × 25, `opening:'drop'`,
//         45° OUTWARD, shaker / handle / material laws inherited, no cups.
//   F1.3  the PLINTH — DEFAULT ON, notched 20 mm from the top, joining a run
//         exactly as turn 27 F2.4 built it.
//   F1.4  …and the LOGIC: the type declares what it is made of in the same
//         keys every kit answers, and no line of the engine knows the word
//         "dishwasher". This is what CLOSES BLOCKERS #94.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import {
  defaultParamsFor, getUnitType, UNIT_TYPES, UNIT_TYPE_ORDER,
} from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const build = (type, extra = {}) => computeCabinet(
  { ...defaultParamsFor(type, P), unit_num: '01', ...extra }, P,
);
const dw = (extra = {}) => build('DW_PANEL', extra);
const partOf = (r, part) => r.panels.find((p) => p.part === part);

const store = () => useProjectStore.getState();
function project() {
  store().loadProject({
    id: null,
    name: 't28-f1',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
}

// ─── F1.1 — THE RAIL ────────────────────────────────────────────────────────

test('F1.1 a bare D/W is exactly three pieces, and they are the three he named', () => {
  assert.deepEqual(dw().panels.map((p) => p.part).sort(), ['FRONT', 'PLINTH', 'TOP']);
});

test('F1.1 the rail is 600 × 540 × 18 — full UNIT width, full run depth', () => {
  const r = dw();
  const rail = partOf(r, 'TOP');
  // A TOP PANEL sits BETWEEN two sides and is `W − 2G`; this board has no sides
  // to sit between, so it spans the whole opening. On his 600 mm appliance gap
  // that is the 600 he measured — and it is a LAW, not a constant, so a 500 mm
  // gap gets a 500 mm rail rather than one hanging 50 mm over each neighbour.
  assert.equal(rail.w, 600);
  assert.equal(rail.w, r.params.width, 'the unit’s own width');
  assert.notEqual(rail.w, r.params.width - 2 * P.board.thickness, 'and not the internal width');
  assert.equal(rail.h, 540, 'the run’s own top depth');
  assert.equal(rail.h, r.params.depth - P.board.thickness);
  assert.equal(rail.thickness, 18);
  for (const width of [500, 600, 800, 900]) {
    assert.equal(partOf(dw({ width }), 'TOP').w, width, `a ${width} gap takes a ${width} rail`);
  }
});

test('F1.1 "bez żadnych dog bonów" — nothing is machined into it at all', () => {
  const rail = partOf(dw(), 'TOP');
  assert.deepEqual(rail.cnc.outline, [[0, 0], [540, 0], [540, 600], [0, 600]],
    'four corners of a plain rectangle');
  assert.deepEqual(rail.cnc.pockets, [], 'zero pockets');
  assert.deepEqual(rail.cnc.holes, [], 'zero holes');
  assert.equal(rail.cnc.rotated, true, 'drawn turned, as every top has been');
  assert.equal(rail.cnc.drawn_w, 540);
  assert.equal(rail.cnc.drawn_h, 600);
  // …and no drilling pass puts anything back into it later.
  assert.equal(dw().drills.filter((d) => d.panel === 'TOP').length, 0);
});

test('F1.1 …and it is the piece turn 26 cut — same board, same place', () => {
  // `bd7cec4`, the turn-26 merge: `panel({ id: 'TOP', w: 600, h: topH, ...
  // box: { x: 0, y: H − G, z: G, w: 600, h: G, d: topH },
  // cnc: rectGeometry(topH, 600) })`. Written out as a value so the claim in
  // CLAUDE.md F1 ("match it") is a test rather than a promise.
  const r = dw();
  const rail = partOf(r, 'TOP');
  assert.deepEqual(rail.box, {
    x: 0,
    y: r.params.height - P.board.thickness,
    z: P.board.thickness,
    w: 600,
    h: P.board.thickness,
    d: 540,
  });
});

test('F1.1 no BUL, no BUR, no BOTTOM, no BACK — and nothing to drill or buy', () => {
  // Whatever it is asked for, at whatever size.
  for (const width of [500, 600, 900]) {
    for (const height of [720, 770, 900]) {
      const r = dw({
        width, height, shelves: 3, rail: true, drawers: 2, plinth: true,
      });
      for (const part of ['BUL', 'BUR', 'BOTTOM', 'BACK']) {
        assert.ok(!r.panels.some((p) => p.part === part), `${width}×${height}: no ${part}`);
      }
      assert.equal(r.drills.length, 0, `${width}×${height}: not one hole`);
      assert.deepEqual(r.hardware, [], `${width}×${height}: no legs, no hinges, no hardware`);
      assert.equal(r.totals.hinges, 0);
      assert.equal(r.totals.legs, 0);
    }
  }
});

// ─── F1.2 — THE FRONT IS UNCHANGED ──────────────────────────────────────────

test('F1.2 the front is turn 27’s front, to the millimetre and to the flag', () => {
  const face = partOf(dw(), 'FRONT');
  assert.equal(face.w, 594, 'the measured number');
  assert.equal(face.h, 770 - P.doors.gap, 'and it lines up with the run');
  assert.equal(face.thickness, P.front.thickness);
  assert.equal(face.box.x, 3, '(600 − 594) / 2');
  // `−cfg.doorExtend`, which on a base unit is a signed zero — the same datum
  // every door, pair of doors and bay leaf in the run takes.
  assert.equal(face.box.y + 0, 0, 'from the carcass floor, like every base front');
  assert.equal(face.meta.opening, 'drop');
  assert.equal(face.meta.openAngleDeg, 45, 'OUTWARD, to 45°');
  assert.equal(face.meta.appliance, 'dw');
  assert.equal(face.meta.frontType, P.front.defaultType, 'the project’s own front type');
  // F2.3 of turn 27 stands: it screws to the appliance's own door.
  assert.equal(dw().drills.filter((d) => d.kind === 'cup').length, 0);
});

test('F1.2 the shaker and the handle still apply to it', () => {
  const shaker = partOf(dw({ front_type: 'S' }), 'FRONT');
  assert.ok(shaker.meta.shaker, 'a shaker leaf');
  assert.ok((shaker.cnc.pockets || []).some((x) => x.layer === 'SHAKER_PANEL_POCKET'));
  const handled = dw({ project_handle: { type: 'bar', centres: 160 } });
  const face = partOf(handled, 'FRONT');
  assert.ok(face.meta.handle, 'and it takes a handle');
  assert.equal(face.meta.handle.axis, 'horizontal', 'gripped from above, like a drop front');
  // The handle's own holes are the ONLY holes a D/W ever carries, and they are
  // in the FRONT — never in a carcass, because there is not one.
  assert.ok(handled.drills.length > 0);
  assert.ok(handled.drills.every((d) => d.panel === face.id), 'all of them in the leaf');
});

// ─── F1.3 — THE PLINTH, DEFAULT ON ──────────────────────────────────────────

test('F1.3 a bare default D/W arrives WITH its toe kick', () => {
  // The owner: *"najważniejszego czyli plinth i tak nie ma"*.
  assert.equal(defaultParamsFor('DW_PANEL', P).plinth, true);
  const kick = partOf(dw(), 'PLINTH');
  assert.ok(kick, 'the piece he cares about most is there');
  assert.equal(kick.h, P.baseUnit.legHeight, 'at the run’s own height');
  assert.equal(kick.box.y, -kick.h, 'standing under the carcass, where a toe kick stands');
});

test('F1.3 …and it is on THIS kit only: a plinth stays a decision everywhere else', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const wanted = UNIT_TYPES[id].plinth === true;
    assert.equal(defaultParamsFor(id, P).plinth, wanted ? true : undefined,
      `${id}: ${wanted ? 'declared' : 'no ghost row in the cut list'}`);
    if (!wanted) assert.ok(!build(id).panels.some((p) => p.part === 'PLINTH'), `${id} cuts none`);
  }
  assert.equal(UNIT_TYPE_ORDER.filter((id) => UNIT_TYPES[id].plinth === true).length, 1,
    'exactly one kit whose toe kick IS one of its pieces');
});

test('F1.3 it is the turn-27 notch, unchanged, and it joins a run', () => {
  const type = getUnitType('DW_PANEL');
  const kick = partOf(dw({ leg_height: 50 }), 'PLINTH');
  assert.equal(kick.h, 50, 'the run’s number, not a constant');
  const ys = kick.cnc.outline.map(([, y]) => y);
  assert.ok(ys.includes(kick.h - type.plinthCutFromTop), 'relieved 20 mm below the top');
  assert.equal(Math.max(...ys), kick.h, 'and the top edge runs right through');
  // A `member` of a run cuts nothing — the long piece is next door. That is the
  // run law and the D/W is in it, which is the whole of turn 27 F2.4.
  const member = computeCabinet({
    ...defaultParamsFor('DW_PANEL', P),
    unit_num: '01',
    run_plinth: { role: 'member' },
  }, P);
  assert.ok(!member.panels.some((p) => p.part === 'PLINTH'), 'the run owns it');
});

test('F1.3 the STORE carries the default through: a placed D/W has a plinth', () => {
  project();
  const a = store().addUnit('DW_PANEL');
  assert.equal(store().units.find((u) => u.id === a.id).params.plinth, true);
  const kicks = store().allResults()
    .flatMap((e) => e.result.panels).filter((p) => p.part === 'PLINTH');
  assert.equal(kicks.length, 1, 'and it is in the cut list without anybody asking');
});

// ─── F1.4 — THE LOGIC, WHICH IS WHAT HE ACTUALLY ASKED FOR ──────────────────

test('F1.4 the kit DECLARES what it is made of, in the keys every kit answers', () => {
  assert.deepEqual(getUnitType('DW_PANEL').carcass, {
    top: 'rail', sides: 'none', bottom: 'none', back: 'none',
  });
  // Turn 30 (CLAUDE.md F19): the corner unit answers all four with 'none' —
  // its carcass is an L and the standard one is not that shape, so the engine
  // emits none of it and the L builder puts the boards in instead. It is the
  // second kit to answer these keys, and it answers them in the same words.
  assert.deepEqual(getUnitType('CORNER').carcass, {
    top: 'none', sides: 'none', bottom: 'none', back: 'none',
  });
  // …and on every kit that HAS the standard carcass they are still absent, so
  // nothing but those two moved a hundredth.
  for (const id of UNIT_TYPE_ORDER) {
    if (id === 'DW_PANEL' || id === 'CORNER') continue;
    const { carcass } = UNIT_TYPES[id];
    assert.equal(carcass.sides, undefined, `${id} says nothing about sides`);
    assert.equal(carcass.bottom, undefined, `${id} says nothing about a bottom`);
    const r = build(id);
    assert.ok(r.panels.some((p) => p.part === 'BUL'), `${id} still has BUL`);
    assert.ok(r.panels.some((p) => p.part === 'BUR'), `${id} still has BUR`);
    assert.ok(r.panels.some((p) => p.part === 'BOTTOM'), `${id} still has a BOTTOM`);
  }
});

test('F1.4 the engine reads the declaration and never the kit', () => {
  // R12 and turn 27's own point: a second path that has to be REMEMBERED is
  // how six faults happened over five turns. There is no `dwPanel`, no
  // `applianceFront` gate and no `if (type.id === 'DW_PANEL')` in the engine.
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
    assert.doesNotMatch(code, /applianceFront/, `${file} has no appliance gate`);
    assert.doesNotMatch(code, /DW_PANEL/, `${file} does not name the kit`);
  }
});

test('F1.4 BLOCKERS #94 is closed, in the owner’s own words', () => {
  const doc = readFileSync(new URL('../BLOCKERS.md', import.meta.url), 'utf8');
  const at = doc.indexOf('## #94');
  assert.ok(at > 0, 'the question is on the list');
  const entry = doc.slice(at, at + 3000);
  assert.match(entry, /ZAMKNIĘTY W TURZE 28/);
  assert.match(entry, /nie ma całego korpusu/, 'answered verbatim');
  assert.match(entry, /nie ma\s+korpusu, więc nie ma dna/);
});
