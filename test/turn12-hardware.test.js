// ─── Hardware you can see (turn 12, CLAUDE.md F6) ───────────────────────────
//
// Two complaints, one cause each, and both causes are checkable in node even
// though the symptom is a picture.
//
//   F6.1 HINGES INVISIBLE IN SOLID. They were drawn, in the right place, every
//   frame — and every part of one was inside solid board. The cup is bored INTO
//   the door; the arm and plate are inside the carcass behind a shut door. What
//   was missing is the BOSS, the part that stands proud of the door's back face
//   and the part a joiner actually sees. `profile.hardware.hinge.bossHeight` has
//   carried the number since turn 7 and nothing drew it.
//
//   F6.2 THE TABS. A socket is a POCKET (`cnc.pockets`, PUZZLE_SOCKET) and turn
//   11 cut those out of the solid. A TAB is part of the OUTLINE — `cnc.outline`
//   leaves the nominal rectangle, goes round the tab and its two dog-bone
//   reliefs, and comes back — and nothing read that, so every board was extruded
//   from its rectangle and the tabs went with it.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { cncRect, hasTabs, tabOutlines } from '../src/engine/socketFace.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const unit = (id, over = {}) => computeCabinet({ ...defaultParamsFor(id, P), ...over }, P);

// ─── F6.1 — the hinge ───────────────────────────────────────────────────────

test('the boss is a real number in the profile, and it is what stands proud', () => {
  const H = P.hardware.hinge;
  assert.equal(H.cupDiameter, 35, 'the ⌀35 cup the drilling is already dimensioned for');
  assert.ok(H.bossHeight > 0);
  assert.ok(H.cupDepth > 0 && H.armLength > 0 && H.plateThickness > 0);
});

test('a hinge is drawn from the SAME numbers the machine drills', () => {
  const r = unit('BUD');
  const inst = hardwareInstances(r, P);
  const centres = r.drillSummary.hinge_centers;
  assert.ok(centres.length > 0);
  assert.equal(inst.hinges.length, centres.length * r.derived.doors);
  // Every hinge sits at a row the engine drills, and at the cup offset the
  // front panel is bored at — not at a number this layer chose.
  const front = r.panels.find((p) => p.part === 'FRONT');
  for (const h of inst.hinges) {
    assert.ok(centres.some((y) => Math.abs(y - h.y) < 1e-6), `hinge at y=${h.y} is on no drilled row`);
    assert.equal(h.z, front.box.z, 'the cup is referenced to the door’s BACK face');
  }
  const edgeX = front.meta?.hinge === 'R' ? front.box.x + front.box.w : front.box.x;
  const dir = front.meta?.hinge === 'R' ? -1 : 1;
  assert.equal(inst.hinges[0].x, edgeX + dir * P.hinges.cups.xFromHingeEdge);
});

test('THE DIAGNOSIS: cup, arm and plate are all inside solid board', () => {
  // This is the test that explains the bug rather than the fix. Every piece
  // turn 7 drew is buried; the boss is the one that is not, which is why
  // adding it is the whole of F6.1's visibility half.
  const r = unit('BUD');
  const [h] = hardwareInstances(r, P).hinges;
  const front = r.panels.find((p) => p.part === 'FRONT');
  const H = P.hardware.hinge;

  const doorBack = front.box.z;
  const doorFront = front.box.z + front.box.d;
  const cupCentreZ = h.z + H.cupDepth / 2;
  assert.ok(cupCentreZ > doorBack && cupCentreZ < doorFront,
    'the cup is inside the door — correct, and invisible in Solid');

  // The boss goes the OTHER way, out of the door's back face into the opening.
  const bossCentreZ = h.z - H.bossHeight / 2;
  assert.ok(bossCentreZ < doorBack, 'the boss stands proud of the door');
  assert.ok(bossCentreZ > doorBack - H.bossHeight, '…by its own height and no more');

  // The arm and the plate live behind the door, in the carcass.
  assert.ok(h.z - H.armLength / 2 < doorBack);
  assert.ok(h.plateZ < doorBack);
});

test('a hinge belongs to ONE door, so it can hang off that door and swing', () => {
  // The fix hangs the cup and the boss off the door's own group. That is only
  // possible because every instance names the front it belongs to.
  const r = unit('WARDROBE', { width: 900 });
  const inst = hardwareInstances(r, P);
  const fronts = r.panels.filter((p) => p.part === 'FRONT').map((p) => p.id);
  assert.ok(fronts.length >= 2, 'a wide unit for the two-door case');
  for (const h of inst.hinges) assert.ok(fronts.includes(h.panelId), `${h.panelId} is not a front`);
  // …and each door gets its own set, not the whole unit's.
  for (const id of fronts) {
    const mine = inst.hinges.filter((h) => h.panelId === id);
    assert.equal(mine.length, r.drillSummary.hinge_centers.length);
  }
});

// ─── F6.2 — the tabs ────────────────────────────────────────────────────────

test('a side panel carries three tabs, and they are the LISP\'s own profile', () => {
  const r = unit('BUD');
  const bul = r.panels.find((p) => p.part === 'BUL');
  const tabs = tabOutlines(bul);
  assert.equal(tabs.length, 3, 'KIT_BUD_FULL puts three tabs on the back edge');

  const { w } = cncRect(bul);
  const pz = P.puzzle;
  for (const tab of tabs) {
    // It stands proud of the nominal rectangle by exactly one board thickness.
    const out = Math.max(...tab.map(([x]) => x));
    assert.equal(out - w, P.board.thickness, 'a tab is one board deep');
    // Its full width is 2 × tabHalfWidth…
    const ys = tab.map(([, y]) => y);
    assert.equal(Math.max(...ys) - Math.min(...ys), 2 * pz.tabHalfWidth);
    // …and it carries the two dog-bone reliefs, which is what CLAUDE.md means
    // by "with their round reliefs": the shoulder steps back by shoulderDepth.
    const shoulders = tab.filter(([x]) => Math.abs(x - (w + pz.shoulderDepth)) < 1e-6);
    assert.equal(shoulders.length, 4, 'two reliefs, two points each');
  }
});

test('the tab polygons close, and every one of them is outside the board', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const r = unit(id);
    for (const panel of r.panels) {
      const { w, h } = cncRect(panel);
      for (const tab of tabOutlines(panel)) {
        assert.ok(tab.length >= 4, `${id} ${panel.id}: a tab of ${tab.length} points`);
        // The first and last points are ON the rectangle — that is the edge the
        // tab leaves from and returns to, and it is what closes the polygon.
        const onEdge = ([x, y]) => Math.abs(x - w) < 1e-6 || Math.abs(y - h) < 1e-6
          || Math.abs(x) < 1e-6 || Math.abs(y) < 1e-6;
        assert.ok(onEdge(tab[0]), `${id} ${panel.id}: a tab starting off the board`);
        assert.ok(onEdge(tab[tab.length - 1]), `${id} ${panel.id}: a tab ending off the board`);
        // …and the middle of it is genuinely outside, or it is not a tab.
        const outside = tab.some(([x, y]) => x > w + 1e-6 || y > h + 1e-6 || x < -1e-6 || y < -1e-6);
        assert.ok(outside, `${id} ${panel.id}: a "tab" that never leaves the board`);
      }
    }
  }
});

test('a joint has BOTH halves: the panel with the tabs, and the one with the socket', () => {
  const r = unit('BUD');
  const layers = joineryLayers(P, null);
  const bul = r.panels.find((p) => p.part === 'BUL');
  const back = r.panels.find((p) => p.part === 'BACK');

  // The side has the tabs…
  assert.ok(hasTabs(bul));
  // …and the back has the sockets they go into, and no tabs of its own.
  assert.equal(hasTabs(back), false);
  assert.ok((back.cnc.pockets || []).some((q) => q.layer === layers.socket));

  // The TOP is machined too and had NO sockets at all, which is why turn 11
  // drew it as a plain box: `machinedPanelGeometry` gave up on a panel with no
  // notches, and its tabs went with the rectangle.
  const top = r.panels.find((p) => p.part === 'TOP');
  assert.ok(hasTabs(top), 'the top carries tabs');
  assert.equal((top.cnc.pockets || []).filter((q) => q.layer === layers.socket).length, 0);
});

test('a plain board has no tabs and is left alone', () => {
  const r = unit('BUD');
  const front = r.panels.find((p) => p.part === 'FRONT');
  assert.deepEqual(tabOutlines(front), []);
  assert.deepEqual(tabOutlines(null), []);
  assert.deepEqual(tabOutlines({ cnc: { outline: [[0, 0], [10, 0], [10, 10], [0, 10]] }, w: 10, h: 10 }), []);
});

test('every kit that is puzzle-jointed shows both halves of it', () => {
  const layers = joineryLayers(P, null);
  for (const id of UNIT_TYPE_ORDER) {
    const r = unit(id);
    const tabbed = r.panels.filter(hasTabs);
    const socketed = r.panels.filter((p) => (p.cnc?.pockets || []).some((q) => q.layer === layers.socket));
    // A kit either has the joint or it does not; what it may not do is have one
    // half of it, which is exactly what the picture showed before turn 12.
    assert.equal(tabbed.length > 0, socketed.length > 0, `${id}: half a joint`);
  }
});
