// ─── T75 · WHAT THE WALK OF PARTS A AND B FOUND, AND THE FIX ────────────────
//
// `scripts/t75-walk.mjs` (a real mouse) found one FAIL and three gestures the
// interface could not make; `verify/t75/walk.txt` holds them. Each is
// asserted here as it reads after the fix; the walk re-walks them.
//
//   f09 FAIL: a click on the island's width figure opened its field and the
//       same press's mousedown took the focus off it (RoomModal.jsx).
//   f04: no click put a worktop over a lone Corner L.
//   f11: the island's seating overhang had no button.
//   f03r: a one-wall retail job's ADD CORNER WARDROBE placed blind wardrobes
//       on walls the job does not draw.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { rectCorners } from '../src/engine/room.js';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

test('f09 · the island figure keeps the field it opens, in PRO and in the retail copy', () => {
  for (const rel of ['src/components/RoomModal.jsx', 'src/retail/design/room/RoomModal.jsx']) {
    const src = read(rel);
    const at = src.indexOf('data-island-dim=');
    assert.ok(at > 0, rel);
    const tag = src.slice(at, src.indexOf('>', src.indexOf('onPointerDown', at)));
    assert.match(tag, /onMouseDown=\{\(e\) => e\.preventDefault\(\)\}/, `${rel}: the press takes the focus back off the field`);
  }
});

test('f04 / f11 · the one selected cabinet\'s Worktop row: Add worktop alone, Remove, Seating overhang per empty face', () => {
  const src = read('src/components/RightPanel.jsx');
  assert.match(src, /<WorktopRow unit=\{unit\} \/>/);
  const row = src.slice(src.indexOf('function WorktopRow('));
  assert.match(row, /worktopEligible\(\[unit\], profile, \{ walls \}\)/, 'the store\'s own gate decides who carries a slab alone');
  assert.match(row, /addWorktop\(\[unit\.id\]\)/);
  assert.match(row, /removeWorktop\(record\.id\)/);
  assert.match(row, /seatingOverhang\(record\.id, f\.face\)/);
  assert.match(row, /extendIslandWorktop\(record\.id, f\.face, 0\)/);
  assert.doesNotMatch(row, /NumberField|type="number"/, 'no proposed number is typed in the UI');
});

test('f03r · a one-wall retail job\'s corner wardrobes stand on that wall, at its two ends, and a third is refused', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  S().setDesign({ scope: 'wall' });
  assert.deepEqual(A.wallsShown(S().project, S().project.room), [0]);
  const placed = [A.addCornerWardrobe(), A.addCornerWardrobe(), A.addCornerWardrobe()];
  assert.equal(placed.filter((r) => r.id).length, 2, 'the wall has two ends');
  assert.match(placed[2].said, /no free corner/);
  for (const u of S().units.filter((x) => x.type === 'BLIND_WARDROBE')) assert.equal(u.position.wall ?? 0, 0);
});
