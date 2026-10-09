// ─── T75 · F19 · HOOKS AND THE VALET ROD ───────────────────────────────────
//
// CLAUDE.md T75 F19: *"Two rows in Add items for the wardrobe family: `Hooks`
// (a row of N, BOM line, placeholder bodies, zero holes) and `Valet rod`
// (pull-out, BOM line, placeholder, zero holes), the `hardwareKit` grammar."*
//
// verify/t75/p05-probe.md: the grammar that fits is the ITEM the trouser
// pull-out and the tie rack already are (`WARDROBE_KIT_KINDS`, one body and
// one BOM line per kit, zero holes); `hardwareKit` is a TYPE's line, not an
// Add items row. The normaliser carried no count, so the hooks' N is new.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet, WARDROBE_KIT_KINDS } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { wardrobeKitInstances } from '../src/engine/hardware3d.js';
import { buildBom } from '../src/engine/bom.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';
import { REASONS } from '../src/retail/design/reasons.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const wardrobe = (items) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', sections: [{ items }],
}, P);

test('F19 · two more kinds of the trouser pull-out\'s item, and their placeholder numbers proposed', () => {
  assert.deepEqual(WARDROBE_KIT_KINDS.slice(-2), ['hooks', 'valet_rod']);
  const kits = P.wardrobeAccessories.kits;
  assert.deepEqual(kits.hooks, {
    label: 'Hooks', bodyHeight: 80, bodyDepth: 60, posMm: 1500, count: 4,
  });
  assert.deepEqual(kits.valet_rod, { label: 'Valet rod', bodyHeight: 40, posMm: 1700 });
  const src = read('src/engine/profile.js');
  for (const key of ['      hooks: {', '      valet_rod: {']) {
    const at = src.indexOf(key);
    assert.ok(at > 0, key);
    assert.match(src.slice(at, at + 160), /T75 proposed, owner to confirm/, `${key.trim()} is not marked proposed`);
  }
});

test('F19 · a row of N hooks: one placeholder body on the back, one BOM line of N, zero holes', () => {
  const plain = wardrobe([]);
  const r = wardrobe([{ id: 'h', kind: 'hooks', count: 6 }]);
  assert.deepEqual(r.drills, plain.drills, 'a hole moved');
  assert.deepEqual(r.panels.map((p) => p.id), plain.panels.map((p) => p.id), 'a board was cut');
  const [body] = r.assemblies.wardrobeKits;
  assert.equal(body.kind, 'hooks');
  assert.equal(body.count, 6);
  assert.equal(body.box.y, P.wardrobeAccessories.kits.hooks.posMm);
  assert.equal(body.box.h, 80);
  assert.equal(body.box.d, 60, 'the strip is as deep as the hooks, not the opening');
  const line = r.hardware.find((h) => h.role === 'wardrobe_kit_hooks');
  assert.equal(line.qty, 6, 'the BOM orders the hooks, not one row');
  // With no count the profile's 4 stand.
  assert.equal(wardrobe([{ id: 'h', kind: 'hooks' }]).hardware.find((h) => h.role === 'wardrobe_kit_hooks').qty, 4);
  // The 3D draws the placeholder by the same grammar as the trouser pull-out.
  const [inst] = wardrobeKitInstances(r);
  assert.equal(inst.role, 'wardrobe_kit_hooks');
  assert.equal(inst.placeholder, true);
});

test('F19 · the valet rod: one body, one line, zero holes; and the trouser pull-out is exactly as it was', () => {
  const plain = wardrobe([]);
  const r = wardrobe([{ id: 'v', kind: 'valet_rod' }]);
  assert.deepEqual(r.drills, plain.drills);
  const [body] = r.assemblies.wardrobeKits;
  assert.equal(body.kind, 'valet_rod');
  assert.equal('count' in body, false);
  assert.equal(body.box.y, 1700);
  assert.equal(r.hardware.find((h) => h.role === 'wardrobe_kit_valet_rod').qty, 1);
  // The kits written before tonight: no count, the opening's depth, qty 1.
  const t = wardrobe([{ id: 't', kind: 'trouser' }]);
  const [tb] = t.assemblies.wardrobeKits;
  assert.equal('count' in tb, false);
  assert.ok(tb.box.d > 500);
  assert.equal(t.hardware.find((h) => h.role === 'wardrobe_kit_trouser').qty, 1);
  // A kitchen kit takes none: the family gate is the engine's own.
  const bud = computeCabinet({ ...defaultParamsFor('BUD', P), sections: [{ items: [{ kind: 'hooks' }] }] }, P);
  assert.equal(bud.hardware.some((h) => /wardrobe_kit/.test(h.role)), false);
});

test('F19 · the registry knows both lines (a BOM line nobody can buy is not a line)', () => {
  assert.equal(HARDWARE_TO_PART_ID.wardrobe_kit_hooks, 'kit_hooks');
  assert.equal(HARDWARE_TO_PART_ID.wardrobe_kit_valet_rod, 'kit_valet_rod');
  assert.equal(PART_REGISTRY.kit_hooks.name, 'Hooks');
  assert.equal(PART_REGISTRY.kit_valet_rod.name, 'Valet rod');
});

test('F19 · the store: a row of hooks says its count; one of a kind per column; never in a chest, a desk, a low unit', () => {
  S().newProject('Hooks', { design: { projectType: 'wardrobe' } });
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const w = S().addUnit('WARDROBE', { params: { width: 1000 } }).id;
  const h = S().addWardrobeKit(w, 'hooks', null, { count: 6 });
  assert.ok(h);
  assert.equal(U(w).params.sections[0].items.find((i) => i.id === h).count, 6);
  assert.equal(S().addWardrobeKit(w, 'hooks'), null, 'a second row in the same column');
  assert.ok(S().addWardrobeKit(w, 'valet_rod'));
  const entries = S().units.map((u) => ({ unit: u, result: S().unitResult(u.id) }));
  const bom = buildBom(entries, { design: S().project.design, profile: P, room: S().project.room });
  assert.equal(bom.hardware.find((x) => x.role === 'wardrobe_kit_hooks').qty, 6);
  assert.equal(bom.hardware.find((x) => x.role === 'wardrobe_kit_valet_rod').qty, 1);
  // Save and reload: the row and its count survive.
  const saved = JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
  S().newProject();
  S().loadProject(saved.project, saved.units);
  assert.equal(S().unitResult(w).hardware.find((x) => x.role === 'wardrobe_kit_hooks').qty, 6);
  for (const type of ['WARDROBE_CHEST3', 'WARDROBE_DESK', 'WARDROBE_LOW']) {
    const id = S().addUnit(type, { near: w, side: 'right' }).id;
    assert.equal(S().addWardrobeKit(id, 'hooks'), null, `hooks went into a ${type}`);
    assert.equal(A.interiorRefusals(id, U(id)).hooks, REASONS.kitGoesInAWardrobe);
    assert.equal(A.interiorRefusals(id, U(id)).trouser, REASONS.kitGoesInAWardrobe);
    S().removeUnit(id);
  }
});

test('F19 · Add items: two rows for the wardrobe family, through the bought-mechanism panel; retail\'s are a copy', () => {
  const pro = read('src/components/AddItems.jsx');
  for (const [id, label] of [['hooks', 'Hooks'], ['valet_rod', 'Valet rod']]) {
    assert.match(pro, new RegExp(`id: '${id}',\\n\\s+label: '${label}',\\n\\s+disabled: type\\.family !== 'wardrobe' \\|\\| Boolean\\(type\\.besideWardrobe\\),`));
  }
  assert.match(pro, /\['pulldown', 'trouser', 'tie_rack', 'hooks', 'valet_rod'\]\.includes\(kind\.id\)/);
  assert.equal(read('src/retail/design/detail/AddItems.jsx').includes("id: 'valet_rod',"), true, 'the retail copy was not re-made');
  // Retail's INTERIOR rows are PRO's (turn61-f4 diffs the two lists): the two
  // new rows add, count and are re-homed on the left like the trouser pull-out.
  const rows = A.INTERIOR_ROWS.map((r) => r.id);
  assert.deepEqual(rows.slice(-2), ['hooks', 'valet_rod']);
  assert.match(read('src/retail/design/detail/ReHomed.jsx'), /row\.id === 'hooks' \|\| row\.id === 'valet_rod'/);
  assert.equal(A.kitWords('hooks').label, 'Hooks');
  assert.equal(A.kitWords('valet_rod').label, 'Valet rod');
});
