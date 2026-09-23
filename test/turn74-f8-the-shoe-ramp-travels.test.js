// ─── TURN 74 · F8 · THE SLOPED SHOE DRAWER BOTTOM TRAVELS WITH ITS DRAWER ──
//
// The owner, 23.09.2026 (list point 6):
//
//   *"skośne dno szuflady na buty zostaje w szafie przy otwieraniu, nie
//   wysuwa się z szufladą."*
//
// The probe (`verify/t74/f08-probe.md`, real hands, committed before the fix):
// the ramp WAS in its drawer's moving group, but the slide moved the piece's
// own group and a leaning piece's group sits inside its lean, so it slid along
// its tilted axis, out and 114 mm down, 222 mm under the open drawer's floor.
// Shut, it already leant the wrong way: its pivot was the BACK edge, so the
// lean dropped the front 108 mm through the floor. After (`f08-probe-after.md`):
// on the floor shut, 440 mm out with the box open.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { drawerMotion } from '../src/engine/drawerMotion.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();

function aShoeDrawer() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2150, depth: 568 } });
  assert.ok(S().addShoeDrawer(id), 'no shoe drawer');
  const r = S().unitResult(id);
  const ramp = r.panels.find((p) => p.part === 'SHOE-RAMP');
  const n = ramp.meta.drawer;
  const of = (part) => r.panels.find((p) => p.part === part && p.meta?.drawer === n);
  return {
    id, r, ramp, floor: of('DRAWER-BOTTOM'), front: of('DRAWER-BOX-FRONT') || r.panels.find((p) => p.id === `D${n}-BF`),
    back: r.panels.find((p) => p.id === `D${n}-BB`), n,
  };
}

/** A point of the ramp's bottom face, leant about its pivot the way the 3-D leans it (x-rotation by +tilt). */
function lean(ramp, z) {
  const t = (ramp.meta.tilt_deg * Math.PI) / 180;
  const { y: py, z: pz } = ramp.meta.tilt_pivot;
  const dy = ramp.box.y - py; const dz = z - pz;
  return { y: py + dy * Math.cos(t) - dz * Math.sin(t), z: pz + dy * Math.sin(t) + dz * Math.cos(t) };
}

test('T74 F8 · the ramp is hung from its FRONT bottom edge, and its board runs back from it', () => {
  const { ramp } = aShoeDrawer();
  assert.equal(ramp.meta.tilt_pivot.y, ramp.box.y, 'the pivot is not on the drawer floor');
  assert.ok(Math.abs(ramp.meta.tilt_pivot.z - (ramp.box.z + ramp.box.d)) < 1e-3,
    'the pivot is not the board\'s front edge');
});

test('T74 F8 · leant, the front stays on the floor and the back RISES, inside the box', () => {
  const { ramp, floor, back, front } = aShoeDrawer();
  const floorTop = floor.box.y + floor.box.h;
  const f = lean(ramp, ramp.box.z + ramp.box.d);
  const b = lean(ramp, ramp.box.z);
  assert.ok(Math.abs(f.y - floorTop) < 1e-6, `the front edge is ${floorTop - f.y} mm off the floor`);
  assert.ok(b.y > floorTop + 50, 'the back does not rise: the ramp leans the wrong way');
  // Inside the box, back board to front board.
  const inBack = back ? back.box.z + back.box.d : floor.box.z;
  const inFront = front ? front.box.z : floor.box.z + floor.box.d;
  assert.ok(b.z >= inBack - 1e-3, `the back edge pokes ${inBack - b.z} mm through the box back`);
  assert.ok(f.z <= inFront + 1e-3, `the front edge pokes ${f.z - inFront} mm through the box front`);
});

test('T74 F8 · the ramp rides its drawer: the same open amount and the same travel as the box', () => {
  const { id, r, ramp, floor } = aShoeDrawer();
  const openFront = r.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta?.drawer === ramp.meta.drawer);
  const motion = drawerMotion(r.panels, { [openFront.id]: 1 });
  const a = motion.forPanel(ramp);
  const b = motion.forPanel(floor);
  assert.ok(a && b, `${id}: the ramp or the floor is not in a moving group`);
  assert.equal(a.open, b.open);
  assert.equal(a.travel, b.travel);
});

test('T74 F8 · the 3-D: a piece that leans AND travels slides outside its lean (the drawer\'s straight line)', () => {
  const src = uncomment(read('src/3d/UnitView.jsx'));
  assert.match(src, /const leans = Boolean\(Number\(p\.meta\?\.tilt_deg\) && p\.meta\?\.tilt_pivot\);/);
  assert.match(src, /if \(leans && glide\.current\) \{\s*glide\.current\.position\.z = off;\s*group\.current\.position\.z = pivot\[2\];/);
  assert.match(src, /return travels \? <group ref=\{glide\}>\{leaning\}<\/group> : leaning;/);
  // …and everything that does not lean moves exactly as it did.
  assert.match(src, /group\.current\.position\.z = pivot\[2\] \+ off;/);
});
