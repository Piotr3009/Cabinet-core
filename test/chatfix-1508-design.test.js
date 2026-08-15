// ─── CHAT FIXES 15.08.2026 — the design batch, pinned ────────────────────────
//
// Four small owner's corrections from one testing afternoon, each with the
// one assertion that keeps it: the hanging rail mid-depth and in the metal
// family, the wardrobe's 568 default, and the runner catalogue's snap-down.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { setRunnerCatalogue, clearRunnerCatalogue, runnerEntry } from '../src/engine/runners.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

test('the rail hangs MID-DEPTH — no longer borrowing the drawer setback', () => {
  const c = src('engine/cabinet.js');
  assert.match(c, /rail: hasRail \? \{ y: railY, x1: G, x2: W - G, z: \(D \+ G\) \/ 2 \} : null,/);
  assert.doesNotMatch(c, /z: D - DR\.setback \} : null/);
});

test('the wardrobe default is the owner\'s 568 — and the fixture says so too', () => {
  assert.equal(P.wardrobe.defaults.depth, 568);
  const fx = JSON.parse(readFileSync(new URL('../fixtures/golden-wardrobe.json', import.meta.url), 'utf8'));
  assert.equal(fx.wardrobe_constants.defaults.depth, 568);
  // The CASES keep their explicit 578: pinned inputs, unchanged bare answers.
  for (const c of fx.cases) assert.equal(c.inputs.depth, 578);
});

test('runnerEntry snaps DOWN to the catalogue when the ladder overshoots', () => {
  clearRunnerCatalogue();
  setRunnerCatalogue({ system: 'movento', files: [
    { file: 'a400.glb', nl: 400, variant: 'S' },
    { file: 'a420.glb', nl: 420, variant: 'S' },
    { file: 'a450.glb', nl: 450, variant: 'S' },
  ] });
  const snapped = runnerEntry({ system: '760H', nl: 440, variant: 'S', side: 'L' });
  assert.equal(snapped.nl, 420, 'the largest length NOT above the ask');
  assert.equal(snapped.snappedFromNl, 440, 'and it says where it came from');
  const exact = runnerEntry({ system: '760H', nl: 450, variant: 'S', side: 'L' });
  assert.equal(exact.nl, 450);
  assert.equal(exact.snappedFromNl, undefined, 'an exact hit is not a snap');
  clearRunnerCatalogue();
});

test('the rail wears the family metal — the ONE resolved answer, not its own', () => {
  const h = src('3d/Hardware.jsx');
  assert.match(h, /metal=\{shelfMetal\}/);
  assert.match(h, /const tone = metal\?\.colour \|\| colour;/);
});


// ─── 15.08.2026, evening: two more from the owner's live scene ──────────────

const store = () => useProjectStore.getState();
const freshProject = () => store().loadProject({
  id: null, name: 'chatfix', design: {},
  room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
}, []);

test('a widened wardrobe RE-DERIVES its door count — the LISP 700 rule survives a resize', () => {
  freshProject();
  const u = store().addUnit('WARDROBE');
  store().addDoors(u.id);
  const one = store().units.find((x) => x.id === u.id).params.doors;
  assert.equal(Number(one.count), 1, 'at 600 the ladder says one');
  store().updateUnitParams(u.id, { width: 1200 });
  const two = store().units.find((x) => x.id === u.id).params.doors;
  assert.equal(Number(two.count), 2, 'at 1200 the ladder says two, and the resize obeys it');
});

test('…but a count somebody CHOSE against the ladder is a decision a resize must not overrule', () => {
  freshProject();
  const u = store().addUnit('WARDROBE');
  store().addDoors(u.id);
  store().updateUnitParams(u.id, { width: 1200 });   // auto → 2
  store().setDoors(u.id, { count: 1, hinge: 'L' });   // the owner insists on one wide leaf
  store().updateUnitParams(u.id, { width: 1300 });
  assert.equal(Number(store().units.find((x) => x.id === u.id).params.doors.count), 1);
});

test('the runner model is judged against the SNAPPED length, not the ask', () => {
  const h = src('3d/Hardware.jsx');
  assert.match(h, /runnerModelFits\(source, w\.entry\?\.nl \?\? w\.row\.length, profile\)/);
});

// ─── 15.08.2026: the drawer side lies down, in BOTH kits ─────────────────────
//
// The owner's scene: "boki szuflad stoją". Engine 18×164×440, scene
// 18×440×164 — standing on end in a WARDROBE, right in a KITCHEN, because the
// two kits draw the same part in different orientations and `panelPlacement`
// had one fixed answer for the name. It reads the drawn rectangle now.

test('the drawer side frame agrees with the board the engine cut — every kit', async () => {
  const { panelPlacement } = await import('../src/engine/joinery.js');
  const { computeCabinet } = await import('../src/engine/cabinet.js');
  const { defaultParamsFor } = await import('../src/engine/types.js');
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
  ];
  const items = [
    { id: 'd1', kind: 'drawer', index: 1, mount: 'overlay', height_mm: 200 },
    { id: 'd2', kind: 'drawer', index: 2, mount: 'overlay', height_mm: 200 },
  ];
  const cases = [
    ['WARDROBE', { width: 1200, items, sections: [{ width_mm: 1200, items }] }],
    ['BUDR', { width: 600 }],
    ['BUDR2', { width: 800 }],
    ['BUDR4', { width: 900 }],
    ['PANTRY', { items, sections: [{ width_mm: 600, items }] }],
  ];
  let seen = 0;
  for (const [type, extra] of cases) {
    const r = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', ...extra }, P);
    for (const panel of r.panels.filter((x) => x.part === 'DRAWER-SIDE')) {
      seen += 1;
      const pl = panelPlacement(panel);
      // Handedness, the file's own rule.
      //  normalises the −0 a negation makes: deepEqual tells them apart
      // and a signed zero is not a fact about the frame.
      const c = cross(pl.u, pl.v).map((v) => v + 0);
      assert.deepEqual(c, pl.n.map((v) => -v + 0), `${type} ${panel.id} handedness`);
      // …and the frame must SPAN the board the engine cut: the drawn rectangle,
      // mapped through u and v, has to come out the box's own height and depth.
      const dw = panel.cnc.outline.reduce((m, q) => Math.max(m, q[0]), 0);
      const dh = panel.cnc.outline.reduce((m, q) => Math.max(m, q[1]), 0);
      const worldY = Math.abs(pl.u[1]) * dw + Math.abs(pl.v[1]) * dh;
      const worldZ = Math.abs(pl.u[2]) * dw + Math.abs(pl.v[2]) * dh;
      assert.equal(worldY, panel.box.h, `${type} ${panel.id} stands its own height`);
      assert.equal(worldZ, panel.box.d, `${type} ${panel.id} runs its own depth`);
    }
  }
  assert.ok(seen >= 20, `the battery really carried drawer sides (${seen})`);
});
