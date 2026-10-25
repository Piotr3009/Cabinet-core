/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F6, AFTER THE REVIEW . THE DOOR'S HOLES RIDE THE DOOR
//
// CLAUDE.md T82 F6: *"The hinge cups on the door's back as the engine drills
// them."* The review of PART A found the room drawing the HAWA door's holes
// TWICE: once on the moving leaf, on its back, by `3d/PocketDoor.jsx`
// (right), and once by `3d/DrillRings.jsx`, mounted for the whole unit, which
// skipped a front but not the HAWA door (role `pocket_door`, part
// `POCKET-DOOR`). So the shut door showed 3 cups and 8 screw holes as dark
// discs on the face the client sees, and when the door turned into its
// pocket those discs stayed in the air where its face had been.
//
// The rule, one predicate (`3d/drillRingPanels.js ringsOn`): the unit's rings
// are drawn on every board that does not move. A front swings (T26's skip,
// kept) and the HAWA door turns and slides, so neither takes a static ring;
// the door's holes are its own leaf's. Every other board takes the rings it
// took before, by the same arithmetic, untouched.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { machiningLines } from '../src/engine/joinery.js';
import { isPocketDoor } from '../src/engine/pocketDoorPose.js';
import { ringsOn } from '../src/3d/drillRingPanels.js';

const P = () => getCabinetProfile();
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const golden = (name) => JSON.parse(read(`verify/t82/goldens/${name}`)).params.unit;
const holesOn = (r, p) => machiningLines(p, r.drills, { lift: 0 }).filter((l) => l.kind === 'hole').length;
// T26's rule, as DrillRings wrote it before this fix: a front animates.
const before = (p) => !(p.role === 'front' || p.part === 'FRONT');

test('T82 F6 . the HAWA door takes no static ring: its 11 holes (one door) and 18 a leaf (two doors) are its own leaf\'s', () => {
  for (const [file, want] of [
    ['golden-hawa-pocket-1door.json', { 'POCKET-DOOR': 11 }],
    ['golden-hawa-pocket-2door.json', { 'POCKET-DOOR-L': 18, 'POCKET-DOOR-R': 18 }],
  ]) {
    const r = computeCabinet(golden(file), P());
    const doors = r.panels.filter((p) => isPocketDoor(p));
    assert.deepEqual(doors.map((d) => d.id).sort(), Object.keys(want).sort(), file);
    for (const d of doors) {
      assert.equal(holesOn(r, d), want[d.id], `${file} ${d.id} carries the engine's holes`);
      assert.equal(before(d), true, `${file} ${d.id}: the old rule drew them, the review's find`);
      assert.equal(ringsOn(d), false, `${file} ${d.id}: no ring stays behind in the air`);
    }
  }
});

test('T82 F6 . the pocket\'s own boards keep their rings: the panels, the top and the bottom stand still', () => {
  for (const file of ['golden-hawa-pocket-1door.json', 'golden-hawa-pocket-2door.json']) {
    const r = computeCabinet(golden(file), P());
    for (const p of r.panels.filter((q) => q.box && !isPocketDoor(q))) {
      assert.equal(ringsOn(p), true, `${file} ${p.id}`);
    }
    assert.ok(r.panels.some((p) => p.part === 'POCKET-B' && holesOn(r, p) > 0), `${file}: panel B's track holes are drawn`);
  }
});

test('T82 F6 . every other board of every kit takes exactly the rings it took before', () => {
  let boards = 0;
  for (const type of UNIT_TYPE_ORDER) {
    const r = computeCabinet(defaultParamsFor(type, P()), P());
    for (const p of r.panels.filter((q) => q.box)) {
      boards += 1;
      assert.equal(ringsOn(p), before(p), `${type} ${p.id} (${p.part}, ${p.role})`);
    }
  }
  assert.ok(boards > 500, `a real sweep: ${boards} boards`);
  // A front, by part or by role, is still skipped (T26).
  assert.equal(ringsOn({ part: 'FRONT', role: 'front', box: {} }), false);
  assert.equal(ringsOn({ part: 'DRAWER-FRONT', role: 'front', box: {} }), false);
});

test('T82 F6 . DrillRings asks the one predicate, and its ring arithmetic is the file it was', () => {
  const src = uncomment(read('src/3d/DrillRings.jsx'));
  assert.match(src, /import \{ ringsOn \} from '\.\/drillRingPanels\.js';/);
  assert.match(src, /if \(!ringsOn\(panel\)\) continue;/);
  assert.equal(/panel\.role === 'front' \|\| panel\.part === 'FRONT'/.test(src), false, 'the rule lives in one place');
  // The T28 lines, held by test/turn28-f5-f6-shelf-metal.test.js, are still here.
  assert.match(src, /const sleeved = Boolean\(sleeveLayer\) && line\.layer === sleeveLayer;/);
  assert.match(src, /if \(dressed\(x, y, z\)\) continue;/);
  // The door's holes are drawn on its back, on the moving leaf (A5's PocketDoor.jsx).
  assert.match(read('src/3d/PocketDoor.jsx'), /HoleDisc/);
});
