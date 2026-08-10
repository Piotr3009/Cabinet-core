// ─── The editor window, grown up (turn 13, CLAUDE.md F2) ────────────────────
//
// Four owner verdicts, and two of them are arithmetic a node test can hold.
//
//   F2.1  the window opens MAXIMISED — rule 15's one sanctioned exception,
//         because the cabinet editor is a WORKSPACE and not a side dialog. The
//         rectangle is `maximiseInViewport`, in the same file as the other two
//         placements, and the margin is a profile number.
//   F2.4  the room view selects the WHOLE CABINET again. Only the pieces a
//         joiner ADDED — shelves, partitions, rails — stay directly clickable
//         there; sides, top, bottom, back and the fronts are edited in the
//         editor. The element paths themselves are untouched, and that is the
//         thing this file is most careful to prove: `isSelectableElement` still
//         answers for every piece, because the editor is driven by it.
//
// F2.2 (pan) and F2.3 (the "Edit element" heading) are gestures and pixels;
// they are in the browser walk, verify/t13.

import test from 'node:test';
import assert from 'node:assert/strict';

import { maximiseInViewport } from '../src/lib/menuPlacement.js';
import {
  elementKind, elementLabel, isMainViewElement, isSelectableElement,
} from '../src/engine/elements.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const VIEW = { width: 1440, height: 900 };
const unit = (id, extra = {}) => computeCabinet({ ...defaultParamsFor(id, P), ...extra }, P);

// ─── F2.1 — the maximised window ────────────────────────────────────────────

test('the maximise margin is a profile number, not a class name (rule 2)', () => {
  assert.ok(Number.isFinite(P.ui.modal.maximiseMarginPx));
  assert.ok(P.ui.modal.maximiseMarginPx > 0, 'near-fullscreen, not fullscreen');
});

test('maximised is the viewport less one margin on every side', () => {
  const m = P.ui.modal.maximiseMarginPx;
  const at = maximiseInViewport({ viewport: VIEW, margin: m });
  assert.deepEqual(at, {
    left: m, top: m, width: VIEW.width - m * 2, height: VIEW.height - m * 2,
  });
  // "Near-fullscreen" has to mean it: most of the screen, and not all of it.
  const area = (at.width * at.height) / (VIEW.width * VIEW.height);
  assert.ok(area > 0.9, `a maximised window covers ${(area * 100).toFixed(1)}% of the screen`);
  assert.ok(area < 1, 'the room behind must still read as the thing underneath');
});

test('a viewport too small for the margin gives it up rather than going negative', () => {
  const at = maximiseInViewport({ viewport: { width: 60, height: 40 }, margin: 28 });
  assert.ok(at.width > 0 && at.height > 0, 'a window with no area is a window you cannot close');
  assert.ok(at.left >= 0 && at.top >= 0);
  assert.ok(at.left + at.width <= 60 && at.top + at.height <= 40);
});

test('a missing viewport is zero, not NaN', () => {
  assert.deepEqual(maximiseInViewport({}), {
    left: 0, top: 0, width: 0, height: 0,
  });
});

// ─── F2.4 — what a click in the ROOM lands on ───────────────────────────────

test('THE VERDICT: a carcass panel is no longer a click target in the room', () => {
  const carcass = ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'];
  for (const id of UNIT_TYPE_ORDER) {
    for (const p of unit(id).panels) {
      if (!carcass.includes(p.part)) continue;
      assert.equal(isMainViewElement(p), false,
        `${id} ${p.id}: clicking a ${elementKind(p)} in the room must select the cabinet`);
    }
  }
});

test('…and the element path it used to take is still there, for the editor', () => {
  // The half of F2.4 that is easy to get wrong: "keep the element-selection
  // code paths — the editor uses them". A side panel is still a piece with a
  // name and a set of fields; it is only the ROOM that stopped routing to it.
  const side = unit('BUD').panels.find((p) => p.part === 'BUL');
  assert.equal(isSelectableElement(side), true);
  assert.equal(elementKind(side), 'side');
  assert.equal(elementLabel(side), 'Left side');
});

test('an ADDED interior item stays clickable — that is the whole exception', () => {
  const withShelves = unit('BUD', { items: undefined, shelves: 2 });
  const shelves = withShelves.panels.filter((p) => p.part === 'SHELF');
  assert.ok(shelves.length > 0, 'a base unit with two shelves has shelf panels');
  for (const s of shelves) {
    assert.equal(isMainViewElement(s), true, `${s.id}: a shelf is dragged by hand in the room`);
  }
});

test('the clickable set is exactly shelves, partitions and rails', () => {
  const kinds = new Set();
  for (const id of UNIT_TYPE_ORDER) {
    for (const p of unit(id).panels) if (isMainViewElement(p)) kinds.add(elementKind(p));
  }
  // Whatever the kits happen to build, nothing outside the three may creep in.
  for (const k of kinds) {
    assert.ok(['shelf', 'partition', 'fixed-shelf'].includes(k), `${k} is not an added interior item`);
  }
});

test('a mechanism is not a piece in either view, and never was', () => {
  // Turn 17 (CLAUDE.md F4.2) moves the drawer BOX out of this set — it is four
  // boards with grooves in them and the owner edits it now. The panel that
  // carries the runners stays: nobody chooses it, it follows the stack. It is
  // the WARDROBE's internal stack that has one (the BUDR's fronts are its face),
  // so that is the kit this half asks.
  const mech = unit('WARDROBE', { drawers: 3 }).panels.filter((p) => p.part === 'DP' || p.part === 'FILLER');
  assert.ok(mech.length > 0, 'a drawer unit has a mechanism to exclude');
  for (const p of mech) {
    assert.equal(isSelectableElement(p), false);
    assert.equal(isMainViewElement(p), false);
  }
  // The box is selectable, and it is STILL not a room-view click: the turn-13
  // verdict — a click on a cabinet selects the cabinet — is untouched.
  const boxes = unit('BUDR').panels.filter((p) => p.role === 'drawer_box');
  assert.ok(boxes.length > 0);
  for (const p of boxes) {
    assert.equal(isSelectableElement(p), true);
    assert.equal(isMainViewElement(p), false);
  }
});

test('every main-view element is a selectable element — the narrower question', () => {
  for (const id of UNIT_TYPE_ORDER) {
    for (const p of unit(id).panels) {
      if (isMainViewElement(p)) assert.equal(isSelectableElement(p), true, `${id} ${p.id}`);
    }
  }
});
