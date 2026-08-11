import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateDesign } from '../src/engine/design.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';
import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import {
  CARCASS_SLOTS, DRAWER_BOX_SLOT, THICKNESS_SLOTS, drawerBoxGate, partitionSlot,
  projectThicknesses, slotConfirmed, slotNominal, slotThickness, thicknessOf, thicknessSlotRows,
} from '../src/engine/thickness.js';

// ─── TURN 24 · F3 — THICKNESS BECOMES A PER-SLOT, MEASURED TRUTH ────────────
//
// The owner's law, verbatim intent: the manufacturer never tells you the board
// is really 18.5 — the CALIPER does, and the engine must compute from the
// caliper. And the box gets a hard gate.
//
// The SECOND iron rule of this turn is here too: where F3 lands, a screw axis
// is `measured G / 2` — 18.5 means 9.25 — and NOTHING may round, nudge or
// "correct" it.

const store = () => useProjectStore.getState();

function project(design = {}) {
  store().loadProject({
    id: null,
    name: 't24',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design,
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);

/**
 * The screw axis on the left side, in that panel's own frame.
 *
 * The carcass screws are drilled in a column at each end of the side; the
 * LOWEST of them is on the BOTTOM panel's centre line, which is the number
 * CLAUDE.md's iron rule is about.
 */
function screwAxis(result) {
  const ys = (result.drills || [])
    .filter((d) => d.kind === 'screw' && d.panel === 'BUL')
    .map((d) => d.y);
  return Math.min(...ys);
}

// ─── F3.1 — six slots, a seed, a caliper and a tick ─────────────────────────

test('F3.1 — the six slots are Carcass 1–3, Front 1–2 and the Drawer box', () => {
  assert.deepEqual(
    THICKNESS_SLOTS.map((s) => s.id),
    ['carcass1', 'carcass2', 'carcass3', 'front1', 'front2', 'box'],
  );
  assert.deepEqual(CARCASS_SLOTS, ['carcass1', 'carcass2', 'carcass3']);
  assert.equal(DRAWER_BOX_SLOT, 'box');
});

test('F3.1 — the nominal is the SEED and the caliper is the answer', () => {
  const design = migrateDesign({});
  // Nothing measured: the manufacturer's number stands, and it is the profile's.
  assert.equal(slotNominal('carcass1', { design, profile: P }), P.board.thickness);
  assert.equal(slotThickness('carcass1', { design, profile: P }), P.board.thickness);
  assert.equal(slotNominal('front1', { design, profile: P }), P.front.thickness);
  // The DRAWER BOX has a nominal of its own — the workshop's own box board,
  // which is what the engine has cut a box from since turn 1.
  assert.equal(slotNominal('box', { design, profile: P }), P.wardrobe.drawers.boxSideThickness);

  // …and the caliper wins outright, to the tenth.
  const measured = migrateDesign({ thickness: { slots: { carcass1: { measured: 18.5, confirmed: true } } } });
  assert.equal(slotThickness('carcass1', { design: measured, profile: P }), 18.5);
  assert.equal(slotNominal('carcass1', { design: measured, profile: P }), P.board.thickness,
    'the label is still the label — the two are different facts');
  assert.equal(slotConfirmed(measured, 'carcass1'), true);
});

test('F3.1 — the surface reads ONE derivation, and it says when the two disagree', () => {
  const design = migrateDesign({ thickness: { slots: { carcass1: { measured: 18.5, confirmed: true } } } });
  const rows = thicknessSlotRows({ design, profile: P });
  const c1 = rows.find((r) => r.id === 'carcass1');
  assert.equal(c1.measured, 18.5);
  assert.equal(c1.nominal, 18);
  assert.equal(c1.dirty, true, '18.5 ≠ 18 is worth SHOWING, not hiding');
  assert.equal(rows.find((r) => r.id === 'carcass2').dirty, false);
});

// ─── F3.1 — the hard gate ──────────────────────────────────────────────────

test('F3.1 — no thickness, no drawers: the gate is closed until the box is ticked', () => {
  assert.equal(drawerBoxGate(migrateDesign({})).blocked, true);
  assert.match(drawerBoxGate(migrateDesign({})).message, /No thickness, no drawers/);
  // A MEASUREMENT alone is not the answer — the tick is somebody saying they
  // did it. A seeded number that nobody checked is exactly the label.
  const seeded = migrateDesign({ thickness: { slots: { box: { measured: 18, confirmed: false } } } });
  assert.equal(drawerBoxGate(seeded).blocked, true);
  const done = migrateDesign({ thickness: { slots: { box: { measured: 18, confirmed: true } } } });
  assert.equal(done ? drawerBoxGate(done).blocked : true, false);
  assert.equal(drawerBoxGate(done).message, null);
});

test('F3.1 — a drawer-bearing unit is refused, in the plain message', () => {
  project();
  const attempt = store().addUnit('BUDR');
  assert.equal(attempt.id, null, 'a ratio drawer unit IS its drawers');
  assert.match(attempt.error, /No thickness, no drawers/);
  // A cabinet with no drawers in it is not blocked: the gate is about boxes.
  const plain = store().addUnit('BUD');
  assert.equal(plain.error, null);
  // …and adding drawers to that cabinet is refused by the same gate.
  const added = store().addDrawers(plain.id, 2);
  assert.equal(added.ok, false);
  assert.match(added.error, /No thickness, no drawers/);
  assert.equal(
    unitOf(plain.id).params.sections[0].items.filter((i) => i.kind === 'drawer').length,
    0,
    'and nothing was added behind the refusal',
  );

  // Measure it, tick it, and the same three calls go through.
  store().setSlotThickness('box', { measured: 18, confirmed: true });
  assert.equal(store().drawerBoxGate().blocked, false);
  assert.equal(store().addDrawers(plain.id, 2).ok, true);
  assert.equal(store().addUnit('BUDR').error, null);
});

test('F3.1 — removing a stack is never gated: the door only closes one way', () => {
  project();
  store().setSlotThickness('box', { measured: 18, confirmed: true });
  const { id } = store().addUnit('WARDROBE');
  store().addDrawers(id, 2);
  store().setSlotThickness('box', { confirmed: false });
  assert.equal(store().drawerBoxGate().blocked, true);
  assert.equal(store().addDrawers(id, 0).ok, true, 'you may always take them out again');
});

// ─── F3.2 — thicknessOf, one door, and the RIGHT side's number ──────────────

const T = {
  carcass1: 18.5, carcass2: 22, carcass3: 12, front1: 25, front2: 19, box: 16,
};

test('F3.2 — thicknessOf names the side, part by part', () => {
  // A slot id asked for directly.
  assert.equal(thicknessOf('carcass1', T), 18.5);
  assert.equal(thicknessOf('carcass2', T), 22);
  assert.equal(thicknessOf('box', T), 16);
  // A carcass part.
  assert.equal(thicknessOf('BUL', T), 18.5);
  assert.equal(thicknessOf('TOP', T), 18.5);
  assert.equal(thicknessOf('BACK', T), 18.5);
  // The DRAWER BOX's four boards.
  for (const part of ['DRAWER-SIDE', 'DRAWER-BOX-FRONT', 'DRAWER-BOX-BACK', 'DRAWER-BOTTOM']) {
    assert.equal(thicknessOf(part, T), 16, `${part} is the box's board`);
  }
  // The two faces.
  assert.equal(thicknessOf('FRONT', T), 25);
  assert.equal(thicknessOf('DRAWER-FRONT', T), 25);
  assert.equal(thicknessOf({ part: 'FRONT', meta: { frontType: 'f2' } }, T), 19);
  // A partition on a named slot.
  assert.equal(thicknessOf({ part: 'VPART', meta: { slot: 'carcass3' } }, T), 12);
  // …and one that says nothing is carcass 1, which is every project before now.
  assert.equal(thicknessOf({ part: 'VPART', meta: {} }, T), 18.5);
});

test('F3.2 — a panel the engine has CUT says what it is, override and all', () => {
  // Turn 9's per-element override is a fact about one board and outranks the
  // slot: a shelf somebody made 25 mm is 25 mm.
  assert.equal(thicknessOf({ part: 'SHELF', thickness: 25 }, T), 25);
  assert.equal(thicknessOf({ part: 'SHELF' }, T), 18.5);
});

test('F3.3 — a partition picks a CARCASS slot, and nothing else', () => {
  assert.equal(partitionSlot({ slot: 'carcass2' }), 'carcass2');
  assert.equal(partitionSlot({ slot: 'carcass3' }), 'carcass3');
  // A front board is not on offer: a partition is a carcass board standing on
  // its end, and offering it a door blank is offering to build a cabinet out
  // of doors.
  assert.equal(partitionSlot({ slot: 'front1' }), 'carcass1');
  assert.equal(partitionSlot({}), 'carcass1');
  assert.equal(partitionSlot(null), 'carcass1');
});

// ─── F3 — the ENGINE computes from the caliper ──────────────────────────────

const base = (over = {}) => ({
  ...defaultParamsFor('BUD', P), unit_num: '01', ...over,
});

test('F3 — nothing said is exactly what the kit cut: the slots are a no-op', () => {
  const stock = computeCabinet(base(), P);
  const slotted = computeCabinet(base({
    thickness_slots: {
      carcass1: 18, carcass2: 18, carcass3: 18, front1: 25, front2: 25, box: 18,
    },
  }), P);
  assert.deepEqual(
    slotted.panels.map((p) => [p.id, p.w, p.h, p.thickness]),
    stock.panels.map((p) => [p.id, p.w, p.h, p.thickness]),
  );
  assert.deepEqual(slotted.drills, stock.drills);
});

test('F3 — the 18.5 PROBE: every carcass number follows the caliper', () => {
  const probe = computeCabinet(base({ thickness_slots: { carcass1: 18.5 } }), P);
  const panel = (id) => probe.panels.find((p) => p.id === id);
  const W = probe.params.width;
  const D = probe.params.depth;

  // The side loses one board of depth, the top two boards of width — the same
  // laws, on the measured number. NOTHING rounds.
  assert.equal(panel('BUL').w, D - 18.5);
  assert.equal(panel('TOP').w, W - 2 * 18.5);
  assert.equal(panel('BUL').thickness, 18.5);

  // ─── THE IRON RULE: a screw axis is measured G / 2 ───
  // 18.5 means 9.25, and nothing may round, nudge or "correct" it.
  // (The `+ profile.puzzle.centrelineExtra` still sitting on top of it is F4's
  // to remove, and F4 removes it in the very next phase — at which point these
  // two numbers become 9.25 and 9.)
  const extra = P.puzzle.centrelineExtra;
  assert.equal(screwAxis(probe), 9.25 + extra, 'the axis is measured G / 2');
  // …and the same probe at the nominal is the nominal's half, exactly.
  assert.equal(screwAxis(computeCabinet(base(), P)), 9 + extra);
});

test('F3.2 — the DRAWER BOX is cut from the box slot, not from the carcass', () => {
  const stock = computeCabinet(base({
    type: 'WARDROBE', height: 2400, drawers: 2, width: 900,
  }), P);
  const thick = computeCabinet(base({
    type: 'WARDROBE',
    height: 2400,
    drawers: 2,
    width: 900,
    thickness_slots: { carcass1: 18, box: 16 },
  }), P);
  const boxOf = (r, id) => r.panels.find((p) => p.id === id);

  for (const id of ['D1-SL', 'D1-SR', 'D1-BF', 'D1-BB', 'D1-DNO']) {
    assert.equal(boxOf(stock, id).thickness, 18, `${id} starts at the workshop's own 18`);
    assert.equal(boxOf(thick, id).thickness, 16, `${id} follows the BOX slot`);
  }
  // The box FRONT is cut to fit between the box's own sides, so a thinner box
  // board makes it LONGER by exactly two boards — and the carcass, which has
  // not moved, contributes nothing to the difference.
  assert.equal(boxOf(thick, 'D1-BF').w - boxOf(stock, 'D1-BF').w, 2 * (18 - 16));
  // …and the carcass beside it is untouched.
  assert.equal(boxOf(thick, 'BUL').thickness, 18);
  assert.equal(boxOf(thick, 'BUL').w, boxOf(stock, 'BUL').w);
});

test('F3.2 — the GROOVE in the box side is sized by the BOTTOM that goes in it', () => {
  const groove = (t) => {
    const r = computeCabinet(base({
      type: 'WARDROBE', height: 2400, drawers: 1, width: 900, thickness_slots: { box: t },
    }), P);
    const side = r.panels.find((p) => p.id === 'D1-SL');
    const p = side.cnc.pockets.find((x) => x.layer === 'DRAWER_BOTTOM_POCKET');
    return p.y2 - p.y1;
  };
  const B = P.baseDrawerUnit;
  assert.equal(groove(18), 18 + B.bottomPocketExtra);
  assert.equal(groove(16), 16 + B.bottomPocketExtra);
  assert.equal(groove(18.5), 18.5 + B.bottomPocketExtra, 'and it is not rounded either');
});

test('F3.3 — a partition on carcass 2 is CUT at carcass 2, and its bays follow', () => {
  const params = base({
    width: 900,
    sections: [{
      width_mm: 900,
      items: [{ id: 'p1', kind: 'partition', x_mm: 450, slot: 'carcass2' }],
    }],
    thickness_slots: { carcass1: 18, carcass2: 25 },
  });
  const r = computeCabinet(params, P);
  const vpart = r.panels.find((p) => p.part === 'VPART');
  assert.equal(vpart.thickness, 25, 'the piece is cut at its slot');
  assert.equal(vpart.box.w, 25, '…and it occupies that much of the cabinet');
  assert.equal(vpart.meta.slot, 'carcass2', 'and the panel says which slot');
  // The carcass either side of it did not move.
  assert.equal(r.panels.find((p) => p.id === 'BUL').thickness, 18);
});

test('F3.3 — and a shelf in a bay is cut to the light that will actually be there', () => {
  const bayShelf = (slot, t) => {
    const r = computeCabinet(base({
      width: 900,
      sections: [{
        width_mm: 900,
        items: [
          { id: 'p1', kind: 'partition', x_mm: 450, slot },
          { id: 's1', kind: 'shelf', pos_mm: 300, zone: 0 },
        ],
      }],
      thickness_slots: { carcass1: 18, carcass2: t },
    }), P);
    return r.panels.find((p) => p.part === 'SHELF').w;
  };
  // The left bay runs from the side's inner face (18) to the partition's near
  // face (450), so its light is the same whatever the partition measures…
  assert.equal(bayShelf('carcass1', 25), bayShelf('carcass2', 25));
  // …and the shelf in the RIGHT bay is the one that moves. Asserted through
  // the whole engine rather than through the zone helper, so the wiring is
  // what is under test.
  const right = (slot, t) => {
    const r = computeCabinet(base({
      width: 900,
      sections: [{
        width_mm: 900,
        items: [
          { id: 'p1', kind: 'partition', x_mm: 450, slot },
          { id: 's1', kind: 'shelf', pos_mm: 300, zone: 1 },
        ],
      }],
      thickness_slots: { carcass1: 18, carcass2: t },
    }), P);
    return r.panels.find((p) => p.part === 'SHELF').w;
  };
  assert.equal(right('carcass1', 25) - right('carcass2', 25), 25 - 18);
});

// ─── F3.4 — the identity gate stays, and extends ────────────────────────────

test('F3.4 — the store hands the engine the six measured numbers', () => {
  project();
  store().setSlotThickness('carcass1', { measured: 18.5, confirmed: true });
  const { id } = store().addUnit('BUD');
  const params = paramsForEngine(unitOf(id), store().project.design);
  assert.equal(params.thickness_slots.carcass1, 18.5);
  const r = computeCabinet(params, P);
  assert.equal(r.panels.find((p) => p.id === 'BUL').thickness, 18.5);
  assert.equal(screwAxis(r), 9.25 + P.puzzle.centrelineExtra, 'the caliper reaches the drilling');
});

test('F3.4 — a confirmed measurement round-trips through save and load', () => {
  project();
  store().setSlotThickness('carcass1', { measured: 18.4, confirmed: true });
  store().setSlotThickness('box', { measured: 15.8, confirmed: true });
  const saved = JSON.parse(JSON.stringify(store().project.design));
  project(saved);
  const design = migrateDesign(store().project.design);
  assert.equal(slotThickness('carcass1', { design, profile: P }), 18.4);
  assert.equal(slotThickness('box', { design, profile: P }), 15.8);
  assert.equal(slotConfirmed(design, 'box'), true);
  assert.equal(drawerBoxGate(design).blocked, false);
});

test('F3 — projectThicknesses answers all six, always', () => {
  const design = migrateDesign({ thickness: { slots: { carcass2: { measured: 22.2, confirmed: true } } } });
  const all = projectThicknesses({ design, profile: P });
  assert.deepEqual(Object.keys(all).sort(), ['box', 'carcass1', 'carcass2', 'carcass3', 'front1', 'front2']);
  assert.equal(all.carcass2, 22.2);
  assert.equal(all.carcass1, P.board.thickness);
  for (const v of Object.values(all)) assert.ok(Number(v) > 0, 'no slot is ever null');
});
