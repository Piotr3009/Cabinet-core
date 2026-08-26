// ─── T51 · F8 — THE SIDE WALLS DEFAULT TO 2000 ──────────────────────────────
//
// The owner, 26.08.2026: *"default bocznych ścian zrób na 2000 mm, nie jak
// teraz 1500."*
//
// A ONE-WALL job is drawn as the wall plus, optionally, a RETURN at each end —
// the two side walls he means, and the field the room editor calls "Side
// returns". They shipped at 1000 at T14 and have been 1000 ever since; the 1500
// in his sentence is a number he has typed into that field, not one the app
// ever defaulted to. The instruction is one instruction either way.
//
// CLAUDE.md: *"One number, in the profile, read by everything that starts a
// room."*

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_WALL_STUB, migrateRoom, rectCorners, wallStub, wallsInScope,
} from '../src/engine/room.js';
import { getCabinetProfile, migrateCabinetProfile } from '../src/engine/profile.js';

const P = getCabinetProfile();
const room = () => migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) });

test('F8 — the number is 2000, and it is in the PROFILE', () => {
  assert.equal(P.room.sideWallMm, 2000);
});

test('F8 — …and the engine’s fallback is the SAME number', () => {
  // Two literals that must agree is exactly how a default drifts apart. This is
  // the test that stops it, and it is why the number is asserted twice rather
  // than once.
  assert.equal(DEFAULT_WALL_STUB, P.room.sideWallMm,
    'engine/room.js DEFAULT_WALL_STUB and profile.room.sideWallMm are one number');
});

test('F8 — a one-wall job gets two 2000 mm returns', () => {
  const shown = wallsInScope(room(), 'wall', P);
  assert.equal(shown.length, 3, 'the wall and its two returns');
  for (const stub of shown.slice(1)) assert.equal(Math.round(stub.width), 2000);
});

test('F8 — a workshop that sets its own is obeyed', () => {
  const tuned = migrateCabinetProfile({ ...P, room: { ...P.room, sideWallMm: 1200 } });
  assert.equal(wallStub(room(), tuned), 1200);
  assert.equal(Math.round(wallsInScope(room(), 'wall', tuned)[1].width), 1200);
  // …and the keys it did not name still arrive (the block merges key by key).
  assert.equal(tuned.room.wallClearance, P.room.wallClearance);
});

test('F8 — a room that STATES a length still wins, whatever the default is', () => {
  // A changed default must never re-draw a saved job — the same law T34 wrote
  // for the shaker frame. This is a joiner's answer and it stands.
  const stated = migrateRoom({ ...room(), wall_stub_mm: 900 });
  assert.equal(wallStub(stated, P), 900);
  // …including zero, which means NO returns and is a real answer.
  const none = migrateRoom({ ...room(), wall_stub_mm: 0 });
  assert.equal(wallStub(none, P), 0);
  assert.equal(wallsInScope(none, 'wall', P).length, 1);
});

test('F8 — a caller with no profile still gets the house’s answer', () => {
  assert.equal(wallStub(room()), 2000);
  assert.equal(wallStub(room(), null), 2000);
  assert.equal(Math.round(wallsInScope(room(), 'wall')[1].width), 2000);
});

test('F8 — and a return is still never longer than the wall it comes off', () => {
  // T14's own clamp, unchanged: 2000 of return off a 600 mm wall is 600.
  const shallow = migrateRoom({ height: 2500, corners: rectCorners(4000, 600) });
  for (const stub of wallsInScope(shallow, 'wall', P).slice(1)) {
    assert.ok(stub.width <= 600 + 1e-6, `${stub.width} is longer than the wall it comes off`);
  }
});
