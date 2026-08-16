// ─── Turn 33, CLAUDE.md F10: shelf pins — default 50, the control goes ──────
//
// Owner: "piny do półek default 50 mm bez ustawiania — kiedyś było ustawiane,
// teraz już nie trzeba." The PROFILE answers 50 on the override channel
// (dated line, with the honest LISP-70 divergence note beside it); the
// SettingsPanel field is the turn's sanctioned removal; a saved project's own
// number still wins; and the BARE ENGINE drills the LISP's 70, which is what
// every golden fixture holds.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

function project(design = {}) {
  store().loadProject({
    id: null,
    name: 't33-f10',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design,
  }, []);
}

const pinXs = (result) => [...new Set(result.drills
  .filter((d) => d.kind === 'shelf_pin' || /SHELVES/.test(d.layer || ''))
  .map((d) => d.x))].sort((a, b) => a - b);

test('the profile line: 50, dated, beside the LISP-70 it deliberately diverges from', () => {
  assert.equal(P.shelfHoles.ownerPinSetback, 50, 'the owner’s declared standard');
  assert.equal(P.shelfHoles.columnFromEdge, 70, 'the bare engine’s answer does not move');
});

test('an app project with nothing said drills the owner’s 50', () => {
  project();
  const { id } = store().addUnit('BUD');
  store().addShelves(id, 1);
  const result = store().unitResult(id);
  const xs = pinXs(result);
  assert.ok(xs.length >= 2, 'pin columns are drilled');
  assert.equal(xs[0], 50, 'the near column stands at the owner’s 50');
});

test('a saved project that set its own number keeps it — the field stays honoured', () => {
  project({ shelves: { pinSetback: 60 } });
  const { id } = store().addUnit('BUD');
  store().addShelves(id, 1);
  assert.equal(pinXs(store().unitResult(id))[0], 60, 'the project’s own 60 wins over the profile’s 50');
});

test('a BARE kit call drills the LISP’s 70 — every golden fixture stands', () => {
  const bare = computeCabinet({
    type: 'BUD', width: 600, height: 720, depth: 560, unit_num: '01', shelves: 1,
  }, P);
  assert.equal(pinXs(bare)[0], 70, 'the AutoLISP’s own x, untouched');
});

test('the SettingsPanel control is GONE — the turn’s sanctioned removal', () => {
  const src = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');
  assert.ok(!src.includes('data-shelf-pin-setback'), 'the field left the panel');
  assert.ok(!/pinSetback: v/.test(src), 'nothing in the panel writes the field any more');
  assert.match(src, /TURN 33 \(CLAUDE\.md F10\)/, 'and the spot says why, rather than going silent');
});
