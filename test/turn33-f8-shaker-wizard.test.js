// ─── Turn 33, CLAUDE.md F8: the shaker frame width returns to the wizard ────
//
// The 15.08 chat rebuild lost the field; the ENGINE never stopped reading the
// number (T25: equal on all four sides, 10–200, profile default 70). It
// stands in the FRONT SLOT CARD now, visible only when that slot's style is
// Shaker, writing the PROJECT-WIDE design.fronts.shakerFrame — and the label
// says so. Placement is Claude's proposal accepted by silence, marked
// [OWNER — placement to confirm] in the component.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { shakerFrameMm } from '../src/engine/shaker.js';
import { migrateDesign } from '../src/engine/design.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const SRC = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');

test('the field stands in the front slot card, Shaker-only, and un-saves the fronts gate', () => {
  assert.match(SRC, /data-shaker-frame-slot=\{t\.id\}/, 'the field lives in the slot card');
  assert.match(SRC, /\(t\.style \|\| design\.fronts\.style\) === 'S'/,
    'shown only when THIS slot resolves to Shaker — an unstyled slot inherits the project');
  assert.match(SRC, /Frame width \(all shaker fronts\)/, 'the owner-specified label, saying project-wide');
  // The rebuild's own law: any write inside the fronts container un-saves it.
  const field = SRC.slice(SRC.indexOf('data-shaker-frame-slot'));
  assert.ok(field.slice(0, 600).includes('touchFronts()'), 'the gate is touched before the write');
  assert.match(SRC, /\[OWNER — placement to confirm\]/, 'the placement marker travels in the code');
});

test('the field writes the ONE project-wide number the engine cuts to', () => {
  store().loadProject({
    id: null,
    name: 't33-f8',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design: {},
  }, []);
  assert.equal(shakerFrameMm(migrateDesign(store().project.design), P), P.front.types.S.frameWidth,
    'nobody has said: the profile 70 answers');

  store().setDesign({ fronts: { ...migrateDesign(store().project.design).fronts, shakerFrame: 90 } });
  const design = migrateDesign(store().project.design);
  assert.equal(design.fronts.shakerFrame, 90);
  assert.equal(shakerFrameMm(design, P), 90, 'the resolver hands the wizard’s number to the engine');

  // …and it reaches the CUT: a shaker front's pockets move with it.
  const { id } = store().addUnit('BUD');
  store().updateUnitParams(id, { doors: { count: 1 } });
  const front = store().unitResult(id).panels.find((p) => p.role === 'front');
  assert.equal(front.meta.shaker?.frame, 90, 'the value reaches the scene’s own panels');
});
