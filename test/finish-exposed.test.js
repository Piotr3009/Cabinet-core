import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet, isFinishExposed } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { EXPORT_PRESETS, isExposed, panelIdsForPreset } from '../src/engine/cnc/groups.js';
import { UNIT_TYPE_ORDER } from '../src/engine/types.js';

// ─── finish_exposed, and the preset built on it (BACKLOG #35, turn 5 F2) ───
//
// "Carcass only" was a lie: it selected the carcass GROUP, which put the plinth
// and the infills — pieces that go to the spray booth — on the same sheet as the
// boxes, and left the shelves and drawer boxes off it entirely. The workshop's
// real question is "what do I cut that nobody sprays?", so the engine answers it
// once, per panel, from the role.

const at = (result, id) => result.panels.find((p) => p.id === id);

test('the flag is decided on the role, and every role has an answer', () => {
  assert.equal(isFinishExposed('front'), true);
  assert.equal(isFinishExposed('infill'), true);
  assert.equal(isFinishExposed('plinth'), true);
  assert.equal(isFinishExposed('end_panel'), true);

  for (const role of ['side', 'top', 'bottom', 'back', 'shelf', 'drawer_box']) {
    assert.equal(isFinishExposed(role), false, `${role} is not a sprayed surface`);
  }
  // An unknown role is NOT sprayed: a new part goes to the machine with the
  // carcass, which is the safe half of the mistake — it is cut either way, and
  // nobody sprays something they were not asked to.
  assert.equal(isFinishExposed('something_new'), false);
});

test('every panel of every unit type carries the flag', () => {
  for (const type of UNIT_TYPE_ORDER) {
    const r = computeCabinet({
      type, width: 600, height: type === 'WARDROBE' || type === 'FRIDGE' ? 2100 : 900,
      depth: 558, unit_num: '01', doors: true, shelves: 1, plinth: true, top_infill_mm: 40,
      end_panels: [{ id: 'ep1', side: 'L', height: 'floor', thickness: 25 }],
    }, P);
    for (const p of r.panels) {
      assert.equal(typeof p.finish_exposed, 'boolean', `${type}/${p.id} has no flag`);
      assert.equal(p.finish_exposed, isFinishExposed(p.role), `${type}/${p.id} disagrees with its role`);
    }
  }
});

test('the named parts land on the side CLAUDE.md puts them on', () => {
  // A wardrobe with everything on it: drawers behind doors, a drawer panel and
  // its fillers, a rail partition, the plinth, both infills and an end panel.
  const r = computeCabinet({
    type: 'WARDROBE', width: 900, height: 2150, depth: 578, unit_num: 'W01',
    doors: true, shelves: 1, drawers: 2, rail: true, plinth: true, top_infill_mm: 40,
    side_infill_left_mm: 20,
    end_panels: [{ id: 'ep1', side: 'R', height: 'floor', thickness: 25 }],
  }, P);

  // IN the non-sprayed sheet
  // T42-F1: `RAIL-PART` leaves this list because the kit stopped cutting it —
  // not because the flag changed. Every other board is where it was.
  for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'SHELF-1', 'PARTITION',
    'DP-L', 'DP-R', 'FILLER-1', 'D1-SL', 'D1-SR', 'D1-BF', 'D1-BB', 'D1-DNO']) {
    const p = at(r, id);
    assert.ok(p, `${id} is missing from this unit — the test is wrong, not the flag`);
    assert.equal(p.finish_exposed, false, `${id} must be in the non-sprayed sheet`);
  }

  // OUT of it
  // Turn 6 (CLAUDE.md F4) splits both infills into the two strips of an L.
  for (const id of ['PLINTH', 'INFILL-T-FACE', 'INFILL-T-SHELF', 'INFILL-L-FACE', 'END-R']) {
    const p = at(r, id);
    assert.ok(p, `${id} is missing from this unit`);
    assert.equal(p.finish_exposed, true, `${id} is a finished surface`);
  }
  for (const p of r.panels.filter((x) => x.part === 'FRONT' || x.part === 'DRAWER-FRONT')) {
    assert.equal(p.finish_exposed, true, `${p.id} is a front`);
  }
});

test('the preset filters on the flag, not on a list of ids', () => {
  const r = computeCabinet({
    type: 'BUDR', width: 600, height: 770, depth: 558, unit_num: 'DR01',
    plinth: true, top_infill_mm: 40,
  }, P);

  const bare = panelIdsForPreset(r.panels, 'non-sprayed');
  const sprayed = panelIdsForPreset(r.panels, 'sprayed');

  // A drawer unit's three fronts ARE its face — they are sprayed; its boxes are
  // not. Turn 4's "Carcass only" put neither on the right sheet.
  assert.equal(bare.some((id) => id.startsWith('DR01-F')), false);
  assert.ok(bare.includes('D1-DNO') && bare.includes('D1-SL'), 'the boxes come with the carcass');
  assert.ok(sprayed.includes('PLINTH') && sprayed.includes('INFILL-T-FACE'));
  assert.ok(sprayed.some((id) => id.startsWith('DR01-F')));
  assert.equal(bare.length + sprayed.length, r.panels.length);
});

test('the four presets are the four Piotr asked for, by name and in order', () => {
  assert.deepEqual(EXPORT_PRESETS.map((p) => p.id), ['all', 'non-sprayed', 'sprayed', 'fronts']);
  assert.deepEqual(EXPORT_PRESETS.map((p) => p.label),
    ['All', 'Non-sprayed', 'Sprayed only', 'Fronts & doors only']);
});

test('a panel cached before the flag existed still reads correctly', () => {
  // Projects live in localStorage and in the database; a result recomputed from
  // an old cache has the role but not the flag, and the doors of that unit must
  // not quietly join the non-sprayed sheet.
  assert.equal(isExposed({ role: 'front' }), true);
  assert.equal(isExposed({ role: 'side' }), false);
  // …and an explicit flag always wins over the fallback.
  assert.equal(isExposed({ role: 'side', finish_exposed: true }), true);
});
