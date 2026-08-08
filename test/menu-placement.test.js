// ─── Turn 11, CLAUDE.md F1.4: the right-click menu stays on screen ──────────
//
// Piotr, on a laptop: the menu runs off the bottom and the last entries cannot
// be reached. Turn 5 placed it with two `Math.min`s against a GUESSED height
// (`actions.length * 30 + 40`), which is wrong twice — it had no lower bound, so
// on a short viewport the answer went NEGATIVE and the menu lost its TOP instead
// of its bottom, and it never measured the thing it was placing.
//
// The rule is arithmetic now, and this is it: flip first, clamp second.

import test from 'node:test';
import assert from 'node:assert/strict';

import { clampMenuPosition } from '../src/lib/menuPlacement.js';

const viewport = { width: 1280, height: 800 };
const menu = { width: 180, height: 420 };

/** Is the whole menu inside the viewport? The one thing that must always hold. */
function assertInside(at, size = menu, vp = viewport) {
  assert.ok(at.left >= 0, `left ${at.left} is off the screen`);
  assert.ok(at.top >= 0, `top ${at.top} is off the screen`);
  assert.ok(at.left + size.width <= vp.width + 1e-9, `right edge at ${at.left + size.width} of ${vp.width}`);
  assert.ok(at.top + size.height <= vp.height + 1e-9, `bottom edge at ${at.top + size.height} of ${vp.height}`);
}

test('a click with room below opens where it was clicked', () => {
  const at = clampMenuPosition({
    x: 300, y: 120, ...menu, viewport,
  });
  assert.deepEqual([at.left, at.top], [300, 120]);
  assert.equal(at.flippedX, false);
  assert.equal(at.flippedY, false);
  assertInside(at);
});

test('a click near the BOTTOM opens upwards, not off the screen', () => {
  const at = clampMenuPosition({
    x: 300, y: 700, ...menu, viewport,
  });
  assert.equal(at.flippedY, true);
  // Upwards FROM the pointer, so the cursor is still on the menu's edge.
  assert.equal(at.top, 700 - menu.height);
  assertInside(at);
});

test('a click near the RIGHT edge opens leftwards', () => {
  const at = clampMenuPosition({
    x: 1240, y: 100, ...menu, viewport,
  });
  assert.equal(at.flippedX, true);
  assert.equal(at.left, 1240 - menu.width);
  assertInside(at);
});

test('a corner click flips both ways at once', () => {
  const at = clampMenuPosition({
    x: 1270, y: 780, ...menu, viewport,
  });
  assert.equal(at.flippedX, true);
  assert.equal(at.flippedY, true);
  assertInside(at);
});

test('when it fits in NEITHER direction it sits against the far edge', () => {
  // A click 200 px down a viewport that has 420 px of menu to place: there is
  // no room below (580 left, needs 420 + margin — fine actually), so take a
  // genuinely tight one.
  const tight = { width: 180, height: 420 };
  const at = clampMenuPosition({
    x: 40, y: 300, ...tight, viewport: { width: 1280, height: 600 },
  });
  // 300 + 420 = 720 > 600, and 300 − 420 is negative: neither fits, so it is
  // pinned to the bottom edge with its margin.
  assert.equal(at.flippedY, false);
  assert.equal(at.top, 600 - 420 - 8);
  assertInside(at, tight, { width: 1280, height: 600 });
});

test('a menu TALLER than the screen keeps its top, which is what is read first', () => {
  // The case that used to produce a negative `top`. It cannot fit; the entries
  // a joiner reads first are at the top, so that is the end that is kept.
  const tall = { width: 180, height: 900 };
  const at = clampMenuPosition({
    x: 200, y: 400, ...tall, viewport: { width: 1280, height: 700 },
  });
  assert.ok(at.top <= 0 + 1e-9);
  assert.ok(at.top >= 0, 'and never negative — that is the bug');
  assert.equal(at.left, 200);
});

test('the margin is respected on the edges it can be', () => {
  const at = clampMenuPosition({
    x: 0, y: 0, ...menu, viewport, margin: 12,
  });
  assert.deepEqual([at.left, at.top], [12, 12]);
});

test('a nonsense viewport cannot produce a NaN', () => {
  const at = clampMenuPosition({
    x: 10, y: 10, ...menu, viewport: { width: 0, height: 0 },
  });
  assert.ok(Number.isFinite(at.left) && Number.isFinite(at.top));
  assert.ok(at.left >= 0 && at.top >= 0);
});

test('every click on a 1366 × 640 laptop lands a whole menu on screen', () => {
  // The sweep, because "it works where I tried it" is what turn 5 had.
  const vp = { width: 1366, height: 640 };
  for (const height of [180, 320, 420, 520]) {
    for (let x = 0; x <= vp.width; x += 61) {
      for (let y = 0; y <= vp.height; y += 37) {
        const size = { width: 180, height };
        assertInside(clampMenuPosition({
          x, y, ...size, viewport: vp,
        }), size, vp);
      }
    }
  }
});
