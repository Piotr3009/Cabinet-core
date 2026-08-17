import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { shoeBoxPlan } from '../src/engine/shoeBox.js';
import { buildBom } from '../src/engine/bom.js';

// ─── TURN 36 (CLAUDE.md F3): SHOE FIX — THE FRONT BECOMES A SWITCH ──────────
//
// Re-issued from T35-F3 with the owner's closing word: *"punkt 3 — tak, z
// przełącznikiem"*. Modal toggle Front: on / off, DEFAULT ON; front off drops
// SHOEBOX-FR from panels, BOM and 3-D; KIT_SHOE_BOX.lsp gains the one-line
// note.

const box = (over = {}) => shoeBoxPlan({
  openingW: 864, depth: 550, boardT: 18, frontT: 18, variant: 'F', dividers: 1, profile: P, ...over,
});

const wardrobe = (item, over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: '01',
  width: 900,
  sections: [{ items: [{ id: 'sb1', kind: 'shoe_box', variant: 'F', dividers: 1, ...item }] }],
  ...over,
}, P);

test('F3 — DEFAULT ON: a box that has said nothing is the box it was', () => {
  const on = box();
  assert.equal(on.front, true);
  assert.equal(on.panels.filter((p) => p.role === 'front').length, 1);
  // …and so is one the caller passed nothing about.
  assert.deepEqual(box({ front: undefined }).panels.length, on.panels.length);
});

test('F3 — OFF cuts no face, and touches nothing else', () => {
  const on = box();
  const off = box({ front: false });
  assert.equal(off.front, false);
  assert.equal(off.panels.filter((p) => p.role === 'front').length, 0);
  assert.equal(off.panels.length, on.panels.length - 1, 'one board fewer, exactly');
  // Every other board is the board it was, to the millimetre.
  const without = (plan) => plan.panels.filter((p) => p.role !== 'front');
  assert.deepEqual(without(off), without(on));
  // …and so is every hole, the runner, the slope and the box's own width.
  assert.deepEqual(off.drills, on.drills);
  assert.deepEqual(off.slope, on.slope);
  assert.equal(off.boxW, on.boxW);
  assert.equal(off.axisY, on.axisY);
});

test('F3 — the DRAWER variant switches the same way', () => {
  const on = box({ variant: 'D', hingedLeft: true, hingedRight: true });
  const off = box({ variant: 'D', hingedLeft: true, hingedRight: true, front: false });
  assert.equal(on.panels.filter((p) => p.role === 'front').length, 1);
  assert.equal(off.panels.filter((p) => p.role === 'front').length, 0);
  assert.deepEqual(off.runner, on.runner, 'the runner does not care about the face');
});

test('F3 — the ENGINE drops SHOEBOX-FR from the panels', () => {
  const on = wardrobe({});
  const off = wardrobe({ front: false });
  assert.equal(on.panels.filter((p) => p.part === 'SHOEBOX-FR').length, 1);
  assert.equal(off.panels.filter((p) => p.part === 'SHOEBOX-FR').length, 0);
  assert.equal(
    off.panels.filter((p) => p.id.startsWith('SHOE1-')).length,
    on.panels.filter((p) => p.id.startsWith('SHOE1-')).length - 1,
  );
  // The switch is echoed on the published record, so one answer reaches the
  // modal, the 3-D and the walk.
  assert.equal(on.assemblies.shoeBoxes[0].front, true);
  assert.equal(off.assemblies.shoeBoxes[0].front, false);
});

test('F3 — …and therefore from the BOM and the 3-D, because all three read it', () => {
  const on = wardrobe({});
  const off = wardrobe({ front: false });
  const unit = { id: 'u1', type: 'WARDROBE', params: {} };
  const rows = (r) => buildBom([{ unit, result: r }]).units[0].rows;
  assert.equal(rows(on).filter((x) => x.part === 'SHOEBOX-FR').length, 1);
  assert.equal(rows(off).filter((x) => x.part === 'SHOEBOX-FR').length, 0);
  assert.equal(rows(off).length, rows(on).length - 1, 'one cut piece fewer');
  // The 3-D draws `result.panels`, so a board that is not cut is not drawn —
  // there is no second list to keep in step. Its BOX went with it.
  assert.equal(off.panels.some((p) => p.part === 'SHOEBOX-FR' && p.box), false);
});

test('F3 — the board COUNT is the only thing that moved', () => {
  const on = wardrobe({});
  const off = wardrobe({ front: false });
  assert.equal(off.panels.length, on.panels.length - 1, 'one board fewer in the cabinet');
  // The kit's own LISP panel count does NOT move, and that is correct rather
  // than a miss: the face is `role: 'front'` (the FIX one is cut from carcass
  // BOARD, but it is still a front), and `panels_lisp` counts the carcass and
  // the drawer fronts. It is the FRONT area and the cut list that shrink.
  assert.equal(off.totals.panels_lisp, on.totals.panels_lisp);
  assert.ok(off.totals.front_area_m2 < on.totals.front_area_m2
    || off.totals.board_area_m2 < on.totals.board_area_m2, 'a board of area went');
  // Not one hole in the carcass follows from the face.
  assert.deepEqual(
    off.drills.filter((d) => d.kind.startsWith('shoe_')),
    on.drills.filter((d) => d.kind.startsWith('shoe_')),
  );
});

test('F3 — the SWITCH is on the item, the modal and the store', () => {
  const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
  // The item's own field, whitelisted into the engine — anything not on that
  // list never reaches the plan.
  assert.match(src('engine/cabinet.js'), /front: i\.front !== false,/);
  // The field, and the two words the owner asked for.
  assert.match(src('engine/elements.js'), /'shoe-box': \['shoe-box-variant', 'shoe-box-front'/);
  assert.match(src('components/ElementProperties.jsx'), /data-shoe-box-front="1"/);
  assert.match(src('components/ElementProperties.jsx'), /<option value="on">On<\/option>/);
  assert.match(src('components/ElementProperties.jsx'), /<option value="off">Off<\/option>/);
  assert.match(src('stores/projectStore.js'), /if \(patch\?\.front != null\) clean\.front = /);
});

test('F3 — the KIT says so, in its own header, and still balances', () => {
  const kit = readFileSync(new URL('../reference/lisp/KIT_SHOE_BOX.lsp', import.meta.url), 'utf8');
  assert.match(kit, /THE FRONT IS A SWITCH/);
  assert.match(kit, /punkt 3 - tak, z przelacznikiem/);
  assert.match(kit, /DEFAULT ON/);
  // The note is a COMMENT and changes no geometry: every line of it starts
  // with the kit's own `;;;`.
  const at = kit.indexOf('THE FRONT IS A SWITCH');
  const block = kit.slice(kit.lastIndexOf('\n', at) + 1, kit.indexOf('- A FRONT on BOTH variants', at));
  for (const line of block.split('\n')) {
    if (line.trim()) assert.match(line, /^;;;/, `a comment, not code: ${line}`);
  }
});
