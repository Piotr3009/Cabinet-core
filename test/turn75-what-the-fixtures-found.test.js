// ─── T75 · WHAT THE FIXTURES FOUND, AND THE FIX ─────────────────────────────
//
// The three proof projects (`fixtures/t75-*.json`, built through the real
// store by `scripts/t75-fixtures.mjs`) measured three faults on the branch
// head. Each is asserted here as it reads after the fix.
//
//   1. *"Every island has a red Check #20"*: the island automat's END PANEL,
//      sized to the whole island (F10), was refused by the room-fit width rule
//      against the 900 mm end FACE as if it stood on a wall ("FP04: wall 8 is
//      900 mm ..."). CLAUDE.md F9: a face is NOT plaster.
//   2. *"The drawing set treats island faces as walls"*: "Wall E / F / G / H"
//      front views with CEILING 2500. CLAUDE.md F9: faces are *"not
//      dimensioned as walls, ... not elevated"*, and NOT THIS TURN names
//      *"wall elevations of island faces"*.
//   3. *"Two worktops meeting end to end on one wall overlap by 20 mm"* (each
//      kept its 10 mm side overhang), and the L's slab ran 10 mm into the slab
//      beside it. F17's law for the desk (an end that butts what stands beside
//      it takes no overhang) is now every straight slab's, and the L's arm end.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCabinetProfile } from '../src/engine/profile.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { realWalls, roomWalls } from '../src/engine/room.js';
import { roomFitRefusal } from '../src/engine/roomFit.js';
import { wallDrawingSheets, wallSetReport } from '../src/engine/drawings/wallSheets.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const P = getCabinetProfile();
const S = () => useProjectStore.getState();
const open = (name) => {
  const { project, units } = JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
  S().loadProject(project, units);
};
const theSet = () => {
  const { project } = S();
  return wallDrawingSheets({
    entries: S().allResults(),
    project,
    room: project.room,
    worktops: S().worktopsOf(),
    frontTypeOf: (u) => resolveUnitDesign(u, project.design).frontType,
    design: project.design,
    profile: P,
    date: '10.10.2026',
  });
};

test('1 · the island\'s own end panel raises no room-fit Check; a cabinet too wide for a face is refused naming the FACE', () => {
  open('t75-island');
  const red20 = S().runChecks().filter((f) => f.check === 20);
  assert.deepEqual(red20.map((f) => f.message), []);
  const room = S().project.room;
  const walls = roomWalls(room);
  const onFace = S().units.find((u) => walls[u.position?.wall ?? 0]?.island && !u.params?.island_auto);
  assert.ok(onFace, 'a cabinet stands on a face');
  const face = walls[onFace.position.wall];
  const said = roomFitRefusal({ unit: onFace, patch: { width: face.width + 100 }, room, profile: P });
  assert.match(said.message, /face [A-Z0-9]+ of island 1 is \d+ mm: a \d+ mm unit will not fit on it\./);
});

test('2 · the set draws no elevation of an island face; the face\'s units are on the plans and the census says why', () => {
  open('t75-island');
  const room = S().project.room;
  const plaster = realWalls(room).length;
  const sheets = theSet();
  assert.ok(sheets.length > 0);
  for (const s of sheets) {
    if (s.wall == null) continue;
    assert.ok(s.wall < plaster, `${s.name}: an island face is not a wall`);
  }
  assert.ok(sheets.some((s) => s.variant === 'plan-base'), 'the plans draw the island');
  const report = wallSetReport({ entries: S().allResults(), profile: P });
  const faceRows = report.walls.filter((w) => w.wall >= plaster);
  assert.ok(faceRows.length > 0);
  for (const row of faceRows) {
    assert.equal(row.elevation, false);
    assert.ok(row.skipped.every((x) => x.reason === 'stands on an island face: no elevation this turn, see the plans'));
  }
});

test('3 · slabs on one wall never overlap: two records meeting end to end butt, and the L\'s arm end butts its neighbour', () => {
  open('t75-corner-kitchen');
  const slabs = S().worktopsOf().map((w) => ({ id: w.slabId || w.id, g: w.geometry || w }));
  const span = (g) => (g.outline ? [Math.min(...g.outline.map((p) => p[0])), Math.max(...g.outline.map((p) => p[0]))] : [g.x, g.x + g.w]);
  let pairs = 0;
  for (let i = 0; i < slabs.length; i += 1) {
    for (let j = i + 1; j < slabs.length; j += 1) {
      const a = slabs[i].g;
      const b = slabs[j].g;
      if ((a.wall ?? 0) !== (b.wall ?? 0)) continue;
      const [a0, a1] = span(a);
      const [b0, b1] = span(b);
      const overlap = Math.min(a1, b1) - Math.max(a0, b0);
      if (overlap > -50) pairs += 1;
      assert.ok(overlap <= 0.5, `${slabs[i].id} and ${slabs[j].id} overlap by ${overlap} mm on wall ${a.wall}`);
    }
  }
  assert.ok(pairs > 0, 'the fixture has slabs meeting on one wall');
});
