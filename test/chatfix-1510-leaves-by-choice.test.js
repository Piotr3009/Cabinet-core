// ─── CHAT FIX 15.10.2026: ONE LEAF OR TWO, BY CHOICE ────────────────────────
//
// The owner: *"jak mamy małe drzwi, ale wciąż chcę zrobić 2, to żebym miał
// możliwość podzielenia ich na 2."*
//
// Nothing in `computeCabinet` moves: the engine has cut a pinned `doors.count`
// since turn 8 and the six goldens carry no pin. What this fix adds is the one
// law that says when a pin may not be cut (`leafCountRefusal`), the PRO Leaves
// row that writes the pin, retail's HOW MANY reading the same law for "2", and
// a resize that returns a pair to the ladder instead of cutting a leaf under
// the minimum silently.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { computeCabinet, doorCountFor, leafCountRefusal } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (rel) => readFileSync(join(ROOT, 'src', rel), 'utf8');
const P = getCabinetProfile();

// ─── the number ─────────────────────────────────────────────────────────────

test('the narrowest leaf a chosen pair may cut is a PROFILE number, beside the ladder it bends', () => {
  assert.equal(P.doors.minLeafWidth, 200);
  assert.equal(P.doors.singleDoorMaxWidth, 700, 'the ladder itself does not move');
  assert.equal(P.doors.doubleTotalGap, 6);
});

// ─── the law ────────────────────────────────────────────────────────────────

test('leafCountRefusal: a pair on a narrow carcass is allowed down to the minimum leaf', () => {
  assert.equal(leafCountRefusal(600, 2, P), '', '600 → two leaves of 297, allowed');
  assert.equal(leafCountRefusal(406, 2, P), '', '406 → two leaves of 200, the minimum itself is allowed');
  assert.match(leafCountRefusal(405, 2, P), /199\.5 mm each, under the 200 mm minimum/, '405 → 199.5, refused in words, the half said');
  assert.match(leafCountRefusal(300, 2, P), /147 mm each/, '300 → 147, refused');
});

test('leafCountRefusal speaks only of the PAIR: a single leaf over the ladder stays the person\'s decision (15.08)', () => {
  assert.equal(leafCountRefusal(600, 1, P), '');
  assert.equal(leafCountRefusal(705, 1, P), '', 'the 15.08 rule: a chosen single wide leaf is not overruled here');
  assert.equal(leafCountRefusal(1300, 1, P), '');
  assert.equal(leafCountRefusal(900, 2, P), '', 'two over the ladder is the ladder\'s own answer');
});

// ─── the engine, unchanged: a pinned pair is cut by the pair arithmetic ─────

test('a pinned pair on a 600 wardrobe cuts two leaves of (600 − 6) / 2, the same line a wide pair uses', () => {
  const r = computeCabinet({ ...defaultParamsFor('WARDROBE', P), width: 600, height: 2150, doors: { count: 2 } }, P);
  const leaves = r.panels.filter((p) => p.part === 'FRONT');
  assert.equal(leaves.length, 2);
  assert.deepEqual(leaves.map((p) => p.w), [297, 297]);
  assert.equal(doorCountFor(600, P), 1, 'the ladder alone would have said one');
});

// ─── the store: the choice survives a resize, until a leaf would fall under the minimum ──

const store = () => useProjectStore.getState();
const freshProject = () => store().loadProject({
  id: null, name: 'chatfix-1510', design: {},
  room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
}, []);
const doorsOf = (id) => store().units.find((x) => x.id === id).params.doors;

test('a pair chosen on a narrow wardrobe is a decision: a resize within the minimum keeps it', () => {
  freshProject();
  const u = store().addUnit('WARDROBE');
  store().addDoors(u.id);
  assert.equal(Number(doorsOf(u.id).count), 1, 'at 600 the ladder says one');
  store().setDoors(u.id, { ...doorsOf(u.id), count: 2 });
  assert.equal(Number(doorsOf(u.id).count), 2, 'the owner chose two');
  store().updateUnitParams(u.id, { width: 500 });
  assert.equal(Number(doorsOf(u.id).count), 2, '500 → leaves of 247, the choice stands');
});

test('…narrowed until a leaf would be under the minimum, the pin returns to the ladder and SAYS so', () => {
  freshProject();
  const u = store().addUnit('WARDROBE');
  store().addDoors(u.id);
  store().setDoors(u.id, { ...doorsOf(u.id), count: 2 });
  const out = store().updateUnitParams(u.id, { width: 300 });
  assert.equal(Number(doorsOf(u.id).count), 1, '300 → a 147 leaf is not cut silently');
  const notices = JSON.stringify(out ?? '');
  assert.match(notices, /Doors follow the width: 1 now/);
  assert.match(notices, /147 mm each, under the 200 mm minimum leaf/);
});

// ─── the surfaces: PRO's Leaves row and retail's HOW MANY read the one law ──

test('PRO: the Doors section has a Leaves row of two chips writing the same setDoors pin, disabled by the law', () => {
  const panel = src('components/RightPanel.jsx');
  assert.match(panel, /import \{ doorCountFor, leafCountRefusal, minDrawerFrontHeight \} from '\.\.\/engine\/cabinet\.js'/);
  assert.match(panel, /data-leaf-count="1"/);
  assert.match(panel, /data-leaf-count-chip=\{n\}/);
  assert.match(panel, /const refusal = leafCountRefusal\(unit\.params\.width, n, profile\)/);
  assert.match(panel, /disabled=\{Boolean\(refusal\)\}/);
  assert.match(panel, /!type\.doorCount && !type\.blind && !type\.corner && !bayDoorModes/, 'not on kits whose count is their identity, nor on bay doors');
});

test('the 15.08 rule survives: a chosen single wide leaf is still not overruled by a resize', () => {
  freshProject();
  const u = store().addUnit('WARDROBE');
  store().addDoors(u.id);
  store().updateUnitParams(u.id, { width: 1200 });
  store().setDoors(u.id, { count: 1, hinge: 'L' });
  store().updateUnitParams(u.id, { width: 1300 });
  assert.equal(Number(doorsOf(u.id).count), 1);
});

test('retail: HOW MANY asks the same law before the "2" chip', () => {
  const adapter = src('retail/design/adapter.js');
  assert.match(adapter, /import \{ doorCountFor, leafCountRefusal \} from '\.\.\/\.\.\/engine\/cabinet\.js'/);
  assert.match(adapter, /if \(count === 2\) \{\s*const said = leafCountRefusal\(width, 2, p\);\s*if \(said\) return said;/);
});
