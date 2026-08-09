// ─── The modal rule, as arithmetic (turn 12, CLAUDE.md rule 15 / F2) ────────
//
// "Every modal in this application is (a) DRAGGABLE by its header, and (b)
// opens BESIDE the object it concerns — never covering it." The owner marked it
// PERMANENT. (a) is a gesture and is checked in the browser walk; (b) is a
// calculation, and this is it.
//
// The property that matters is stated once and tested from several directions:
// WHEN THERE IS ROOM ON ANY SIDE, THE MODAL AND THE OBJECT DO NOT OVERLAP. Not
// "usually", not "if the object is small" — the four-side search exists so that
// the answer is yes for a cabinet at the left edge, at the right edge, and for
// a panel that only fits above.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MODAL_SIDES, clampMenuPosition, clampToViewport, placeBesideAnchor,
} from '../src/lib/menuPlacement.js';
import { anchorAtPoint, anchorOfElement, anchorOfEvent } from '../src/lib/modalAnchor.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const VIEW = { width: 1440, height: 900 };

/** Do two rectangles share a pixel? The whole rule, in one predicate. */
function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width
    && a.y < b.y + b.height && b.y < a.y + a.height;
}

const rectOf = (at, size) => ({
  x: at.left, y: at.top, width: size.width, height: size.height,
});

const inside = (r, v, margin = 0) => r.x >= margin - 1e-9 && r.y >= margin - 1e-9
  && r.x + r.width <= v.width - margin + 1e-9
  && r.y + r.height <= v.height - margin + 1e-9;

test('the numbers the shell places with live in profile.js (rule 2)', () => {
  assert.ok(Number.isFinite(P.ui.modal.gapPx), 'a gap between object and modal');
  assert.ok(Number.isFinite(P.ui.modal.marginPx), 'a viewport margin');
  assert.ok(P.ui.modal.gapPx > 0);
});

test('a cabinet on the left: the modal opens to its RIGHT and touches nothing', () => {
  const anchor = {
    x: 120, y: 300, width: 260, height: 380,
  };
  const size = { width: 420, height: 500 };
  const at = placeBesideAnchor({ anchor, size, viewport: VIEW });
  assert.equal(at.side, 'right');
  assert.equal(at.fits, true);
  assert.equal(overlaps(rectOf(at, size), anchor), false);
  assert.ok(inside(rectOf(at, size), VIEW));
});

test('a cabinet against the right edge: it flips to the LEFT rather than hanging off', () => {
  const anchor = {
    x: 1180, y: 200, width: 220, height: 400,
  };
  const size = { width: 420, height: 500 };
  const at = placeBesideAnchor({ anchor, size, viewport: VIEW });
  assert.equal(at.side, 'left');
  assert.equal(overlaps(rectOf(at, size), anchor), false);
  assert.ok(inside(rectOf(at, size), VIEW));
});

test('an object spanning the width: neither side fits, so it goes BELOW it', () => {
  const anchor = {
    x: 40, y: 40, width: 1360, height: 180,
  };
  const size = { width: 420, height: 400 };
  const at = placeBesideAnchor({ anchor, size, viewport: VIEW });
  assert.equal(at.side, 'below');
  assert.equal(overlaps(rectOf(at, size), anchor), false);
});

test('…and ABOVE it when the room below has gone', () => {
  const anchor = {
    x: 40, y: 640, width: 1360, height: 220,
  };
  const size = { width: 420, height: 400 };
  const at = placeBesideAnchor({ anchor, size, viewport: VIEW });
  assert.equal(at.side, 'above');
  assert.equal(overlaps(rectOf(at, size), anchor), false);
});

test('a click point is an anchor of zero size, and the modal still misses it', () => {
  const anchor = anchorAtPoint(700, 450);
  const size = { width: 300, height: 260 };
  const at = placeBesideAnchor({ anchor, size, viewport: VIEW });
  assert.equal(overlaps(rectOf(at, size), anchor), false);
  assert.ok(inside(rectOf(at, size), VIEW));
});

test('a preferred side is honoured when it fits and abandoned when it does not', () => {
  const anchor = {
    x: 700, y: 400, width: 100, height: 100,
  };
  const size = { width: 300, height: 200 };
  assert.equal(placeBesideAnchor({
    anchor, size, viewport: VIEW, prefer: 'below',
  }).side, 'below');
  // No room below for a 700-tall panel — the preference gives way to the rule.
  const tall = { width: 300, height: 700 };
  const at = placeBesideAnchor({
    anchor, size: tall, viewport: VIEW, prefer: 'below',
  });
  assert.notEqual(at.side, 'below');
  assert.equal(overlaps(rectOf(at, tall), anchor), false);
});

test('nowhere to stand: it says so, and is still fully on the screen', () => {
  // An object filling the viewport. Every side is refused; the answer must
  // still be somewhere a person can see and reach.
  const anchor = {
    x: 0, y: 0, width: VIEW.width, height: VIEW.height,
  };
  const size = { width: 420, height: 500 };
  const at = placeBesideAnchor({ anchor, size, viewport: VIEW });
  assert.equal(at.fits, false);
  assert.ok(MODAL_SIDES.includes(at.side));
  assert.ok(inside(rectOf(at, size), VIEW));
});

test('every side of a small object is tried before the modal gives up', () => {
  // Walk an object around the screen; the modal must never sit on it.
  const size = { width: 360, height: 420 };
  for (let x = 0; x <= VIEW.width - 200; x += 100) {
    for (let y = 0; y <= VIEW.height - 200; y += 100) {
      const anchor = {
        x, y, width: 200, height: 200,
      };
      const at = placeBesideAnchor({ anchor, size, viewport: VIEW });
      assert.equal(at.fits, true, `no side found at ${x},${y}`);
      assert.equal(overlaps(rectOf(at, size), anchor), false, `overlap at ${x},${y}`);
      assert.ok(inside(rectOf(at, size), VIEW), `off screen at ${x},${y}`);
    }
  }
});

// ─── The drag clamp ───

test('a dragged modal goes where it is put — clamped, never flipped', () => {
  const size = { width: 400, height: 300 };
  assert.deepEqual(
    clampToViewport({
      left: 500, top: 200, size, viewport: VIEW,
    }),
    { left: 500, top: 200 },
  );
  // Off the right and the bottom: pulled back, not thrown to the other side.
  assert.deepEqual(
    clampToViewport({
      left: 5000, top: 5000, size, viewport: VIEW,
    }),
    { left: 1040, top: 600 },
  );
  assert.deepEqual(
    clampToViewport({
      left: -400, top: -400, size, viewport: VIEW,
    }),
    { left: 0, top: 0 },
  );
});

test('a modal taller than the screen keeps its TOP, as the menu does', () => {
  const size = { width: 400, height: 1200 };
  const { top } = clampToViewport({
    left: 100, top: -300, size, viewport: VIEW, margin: 8,
  });
  assert.equal(top, 0);
  // …and the same is true of the menu clamp it is modelled on.
  const menu = clampMenuPosition({
    x: 100, y: 500, width: 400, height: 1200, viewport: VIEW,
  });
  assert.ok(menu.top >= 0);
});

// ─── The adapter ───

test('anchorOfElement reads a rectangle; a bad target is null, not a crash', () => {
  const el = {
    getBoundingClientRect: () => ({
      left: 10, top: 20, width: 30, height: 40,
    }),
  };
  assert.deepEqual(anchorOfElement(el), {
    x: 10, y: 20, width: 30, height: 40,
  });
  assert.equal(anchorOfElement(null), null);
  assert.equal(anchorOfElement({}), null);
});

test('anchorOfEvent prefers the control, and falls back to the point', () => {
  const el = {
    getBoundingClientRect: () => ({
      left: 4, top: 5, width: 6, height: 7,
    }),
  };
  assert.deepEqual(anchorOfEvent({ currentTarget: el, clientX: 99, clientY: 99 }), {
    x: 4, y: 5, width: 6, height: 7,
  });
  assert.deepEqual(anchorOfEvent({ clientX: 12, clientY: 13 }), {
    x: 12, y: 13, width: 0, height: 0,
  });
  assert.equal(anchorOfEvent({}), null);
  assert.equal(anchorAtPoint(undefined, 3), null);
});
