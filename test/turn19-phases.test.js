// ─── TURN 19: THE MODAL RULE TIGHTENED, AND THE LOST VERDICT ────────────────
//
// Two phases, two properties.
//
// F3 (W37). Owner: "klikam na drzwi, a modal mi się otwiera na drzwiach i chuj
// widzę." Turn 12's rule was right and under-specified — "beside" needs a
// DISTANCE and a DIRECTION, and a click point is a rectangle of zero size, so
// "beside" it was a millimetre away. The tightened rule is UP AND TO THE RIGHT,
// clamped, flipping hands rather than sliding back over the object, and the
// property to hold is the one turn 12 stated: THE MODAL AND THE OBJECT DO NOT
// OVERLAP — now with clear air between them, and with everything below the
// pointer left in shot.
//
// F4. The turn-17 verdict my transcription dropped: "kliknięcie 2 razy na dany
// element zabiera nas do listy po prawej, otwiera i podświetla który to
// element." Pure navigation, so what there is to test is the pure navigation
// function the tree is driven by — and the fact that it drives nothing else.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MODAL_OFFSET_SIDES, placeAnchoredModal, placeBesideAnchor,
} from '../src/lib/menuPlacement.js';
import { anchorAtPoint } from '../src/lib/modalAnchor.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  PART_GROUPS, exportablePanels, groupOfPanel, treePathOfPanel,
} from '../src/engine/cnc/groups.js';

const VIEW = { width: 1600, height: 1000 };
const OFF = P.ui.modal.anchorOffset;
const M = P.ui.modal.marginPx;

const rectOf = (at, size) => ({
  x: at.left, y: at.top, width: size.width, height: size.height,
});

function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width
    && a.y < b.y + b.height && b.y < a.y + a.height;
}

const inside = (r, v, margin = 0) => r.x >= margin - 1e-9 && r.y >= margin - 1e-9
  && r.x + r.width <= v.width - margin + 1e-9
  && r.y + r.height <= v.height - margin + 1e-9;

const place = (anchor, size, viewport = VIEW) => placeAnchoredModal({
  anchor, size, viewport, offset: OFF, gap: P.ui.modal.gapPx, margin: M,
});

// ─── F3: the numbers ────────────────────────────────────────────────────────

test('F5 — the offset is a PROFILE number: 240 across, level with the click', () => {
  // ─── Turn 20 (CLAUDE.md F5) ───
  // These assertions pinned turn 19's law — "up and to the right, by y PLUS
  // the panel's own height" — and the owner's verdict is that lifting the
  // panel over the pointer is exactly what he did not want. They are REWRITTEN
  // rather than deleted, because the property they exist to hold is unchanged:
  // THE MODAL AND THE OBJECT DO NOT OVERLAP, with clear glass between them.
  // ─── TURN 21 (CLAUDE.md F4) ───
  // The owner used 140 for a day and asked for 240. The number is the
  // PROFILE's and every assertion below reads it from there; what is pinned
  // here is that it is a real, usable clearance and that the vertical offset is
  // still zero — LEVEL with the click — which is the half of F5 that is a law
  // rather than a taste.
  assert.ok(OFF.x >= 140, 'a real clearance beside the object, the owner’s own number');
  assert.equal(OFF.x, 240, 'turn 21 (F4): 240, same law');
  assert.equal(OFF.y, 0, 'zero is LEVEL — the top of the panel on the click’s line');
  assert.deepEqual(MODAL_OFFSET_SIDES, ['right', 'left'], 'the "up" went with the old law');
});

test('a profile saved before the offset existed comes back with it', () => {
  // Without the deep merge a stored `ui.modal` block would delete the offset and
  // every modal would open at {0,0} of its anchor — which is ON the click.
  const merged = migrateCabinetProfile({
    ...P, schema: P.schema, ui: { ...P.ui, modal: { gapPx: 20, marginPx: 8, maximiseMarginPx: 28 } },
  });
  assert.deepEqual(merged.ui.modal.anchorOffset, OFF);
  assert.equal(merged.ui.modal.gapPx, 20, 'and the workshop’s own gap survives');
});

// ─── F5: the property ───────────────────────────────────────────────────────

test('a double-click ON a door: the modal goes RIGHT, level with the click', () => {
  const click = anchorAtPoint(700, 400);
  const size = { width: 340, height: 420 };
  const at = place(click, size);
  assert.equal(at.side, 'right');
  assert.equal(at.left, 700 + OFF.x, 'right of the pointer by the profile offset');
  assert.equal(at.top, 400, 'and its TOP on the click’s own line');
  assert.equal(overlaps(rectOf(at, size), click), false);
  assert.ok(inside(rectOf(at, size), VIEW, M));
});

test('the five corners — the object stays visible beside the panel', () => {
  // CLAUDE.md F5.3 keeps turn 19's corner walk and asks it to pass under the
  // new numbers. This is that walk as arithmetic, and it states the guarantee
  // the implementation rests on:
  //
  //   the panel is separated from the object ACROSS the screen — a clear
  //   `offset.x` to one side of it — whatever the vertical clamp does.
  //
  // That is what makes the rule hold in every corner. The panel's TOP is level
  // with the click wherever the viewport allows it; low down the screen the
  // clamp slides it UP so the whole panel is visible, and it is the horizontal
  // air that keeps it off the door while it does.
  const size = { width: 340, height: 420 };
  const corners = [
    ['low-left', 120, 880],
    ['low-right', 1480, 880],
    ['top-right', 1480, 90],
    ['top-left', 60, 60],
    ['dead-centre', 800, 500],
  ];
  for (const [name, x, y] of corners) {
    const click = anchorAtPoint(x, y);
    const at = place(click, size);
    const panel = rectOf(at, size);
    assert.ok(inside(panel, VIEW, M), `${name}: wholly on screen`);
    assert.equal(overlaps(panel, click), false, `${name}: not over the pointer`);
    assert.ok(MODAL_OFFSET_SIDES.includes(at.side), `${name}: one hand or the other`);

    const clearAcross = at.side === 'right'
      ? panel.x - x >= OFF.x - 1e-9
      : x - (panel.x + panel.width) >= OFF.x - 1e-9;
    assert.ok(clearAcross, `${name}: a clear ${OFF.x} px of glass beside the click`);

    // LEVEL, where the screen allows it: the top of the panel on the click's
    // own line. Only a click too near the BOTTOM gives that up — the clamp
    // slides the panel up so all of it is visible — and it gives up nothing
    // else, because the panel never comes back across the click.
    const roomBelow = y + size.height <= VIEW.height - M;
    if (roomBelow) {
      assert.equal(panel.y, y, `${name}: the panel’s top is level with the click`);
    } else {
      assert.equal(panel.y, VIEW.height - size.height - M, `${name}: slid up off the bottom margin`);
      assert.ok(panel.y < y, `${name}: …and only upwards`);
    }
  }
});

test('against the right edge it goes LEFT rather than hanging off', () => {
  const click = anchorAtPoint(VIEW.width - 30, 400);
  const size = { width: 340, height: 420 };
  const at = place(click, size);
  assert.equal(at.side, 'left');
  assert.equal(at.left, click.x - OFF.x - size.width);
  assert.equal(at.top, 400, 'still level with the click');
  assert.equal(overlaps(rectOf(at, size), click), false);
  assert.ok(inside(rectOf(at, size), VIEW, M));
});

test('near the BOTTOM it slides up — and horizontal air keeps it off the object', () => {
  // The vertical clamp is free to move the panel up the screen, and that is
  // safe precisely because the SIDE has already separated the two: this is the
  // property the implementation rests on, so it is asserted directly.
  const click = anchorAtPoint(700, VIEW.height - 40);
  const size = { width: 340, height: 420 };
  const at = place(click, size);
  assert.equal(at.top, VIEW.height - size.height - M, 'pinned above the bottom margin');
  assert.ok(at.top < click.y, 'it really has been pushed up past the click');
  assert.equal(overlaps(rectOf(at, size), click), false, '…and still does not cover it');
  assert.ok(inside(rectOf(at, size), VIEW, M));
});

test('EVERY modal inherits it — a button anchor is never covered either', () => {
  // "One shell, no per-modal copies" (F5.4). A menu entry is a rectangle rather
  // than a point, and the same call has to be right about it.
  const button = {
    x: 300, y: 120, width: 160, height: 32,
  };
  const size = { width: 420, height: 500 };
  const at = place(button, size);
  assert.equal(at.side, 'right');
  assert.equal(at.left, button.x + button.width + OFF.x);
  assert.equal(at.top, button.y, 'level with the top of the control it is about');
  assert.equal(overlaps(rectOf(at, size), button), false);
  assert.ok(inside(rectOf(at, size), VIEW, M));
});

test('a viewport with no room on either hand falls back to turn 12’s search', () => {
  // An object as wide as the screen. The four-side search has known what to do
  // about that since turn 12 and it is not re-implemented here.
  const wide = {
    x: 20, y: 40, width: 1560, height: 180,
  };
  const size = { width: 420, height: 400 };
  const at = place(wide, size);
  const fallback = placeBesideAnchor({
    anchor: wide, size, viewport: VIEW, gap: P.ui.modal.gapPx, margin: M,
  });
  assert.deepEqual(at, fallback);
  assert.equal(at.side, 'below');
  assert.equal(overlaps(rectOf(at, size), wide), false);
});

test('no offset configured is not a licence to open ON the object', () => {
  const click = anchorAtPoint(700, 600);
  const size = { width: 340, height: 420 };
  const at = placeAnchoredModal({
    anchor: click, size, viewport: VIEW, offset: null, gap: P.ui.modal.gapPx, margin: M,
  });
  assert.equal(overlaps(rectOf(at, size), click), false);
  assert.ok(['right', 'left', 'below', 'above'].includes(at.side), 'turn 12’s rule answers instead');
});

test('a modal taller than the screen is still wholly on it', () => {
  const click = anchorAtPoint(700, 500);
  const size = { width: 340, height: 1400 };
  const at = place(click, size);
  assert.ok(at.top <= M + 1e-9, 'pinned to the top, where a joiner reads first');
  assert.equal(overlaps(rectOf(at, size), click), false);
});

// ─── F4: double-click a part on the CNC sheet ───────────────────────────────

const unit = () => computeCabinet({
  type: 'BUD',
  width: 600,
  height: 720,
  depth: 560,
  unit_num: '01',
  doors: { count: 2 },
  shelves: 2,
}, P);

test('a part on the sheet knows which branch of the tree it is in', () => {
  const parts = exportablePanels(unit().panels);
  assert.ok(parts.length > 4);
  for (const p of parts) {
    const path = treePathOfPanel(parts, p.id);
    assert.ok(path, `${p.id} is findable`);
    assert.equal(path.panelId, p.id);
    assert.equal(path.group, groupOfPanel(p), 'the tree’s own grouping, not a second one');
    assert.ok(PART_GROUPS.some((g) => g.id === path.group));
    assert.ok(path.index >= 0, 'and where in that branch it sits');
  }
});

test('a door lands in Fronts, a side in Carcass, a shelf in Shelves', () => {
  const parts = exportablePanels(unit().panels);
  const groupOf = (id) => treePathOfPanel(parts, id)?.group;
  assert.equal(groupOf('01-FL'), 'fronts');
  assert.equal(groupOf('01-FR'), 'fronts');
  // Turn 25 (CLAUDE.md F7.1): the group is called `carcasses` now, and its
  // membership widened — see test/turn25-f7-export-tree.test.js.
  assert.equal(groupOf('BUL'), 'carcasses');
  assert.equal(groupOf('BUR'), 'carcasses');
  assert.equal(groupOf('BACK'), 'carcasses');
  const shelf = parts.find((p) => groupOfPanel(p) === 'shelves');
  assert.ok(shelf, 'the cabinet really has one');
  assert.equal(groupOf(shelf.id), 'shelves');
});

test('the index is the position INSIDE its own branch, which is what a scroll needs', () => {
  const parts = exportablePanels(unit().panels);
  const fronts = parts.filter((p) => groupOfPanel(p) === 'fronts');
  for (const [i, p] of fronts.entries()) {
    assert.equal(treePathOfPanel(parts, p.id).index, i, `${p.id} is #${i} of the fronts`);
  }
});

test('a part that is not on this unit’s sheet answers null rather than throwing', () => {
  const parts = exportablePanels(unit().panels);
  assert.equal(treePathOfPanel(parts, '99-NOPE'), null);
  assert.equal(treePathOfPanel(parts, null), null);
  assert.equal(treePathOfPanel(null, '01-FL'), null);
  assert.equal(treePathOfPanel([], '01-FL'), null);
});

test('it is PURE NAVIGATION — nothing about the cabinet or the sheet changes', () => {
  // The whole verdict is "zabiera nas do listy": it moves the eye. So the thing
  // worth proving is that the function has nothing to change — it takes panels
  // and an id and returns three facts, and the parts it was given come back
  // untouched.
  const r = unit();
  const parts = exportablePanels(r.panels);
  const before = JSON.stringify(parts);
  const drillsBefore = JSON.stringify(r.drills);
  for (const p of parts) treePathOfPanel(parts, p.id);
  assert.equal(JSON.stringify(parts), before, 'the parts are not touched');
  assert.equal(JSON.stringify(r.drills), drillsBefore, 'and neither is a single hole');
});
