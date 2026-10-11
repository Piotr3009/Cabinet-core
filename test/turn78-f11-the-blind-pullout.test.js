// ─── T78 · F11 · THE HAFELE BLIND-CORNER PULL-OUT ────────────────────────────
//
// The owner, 11.10.2026: *"hafele naroznik slepy czyli wysuwane."*  CLAUDE.md
// T78 F11: `hardwareKit` on the three blind kits (role blind_pullout, by
// opening, body blind_pullout, label "Hafele blind corner pull-out"): BOM
// line, a placeholder body (two wire trays that swing out of the blind part),
// zero holes, GLB slot in 3d/hardwareRegistry for the day the owner drops a
// model in. Shelves in the blind part are refused while it is fitted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet, BLIND_KIT_KINDS, CORNER_KIT_KINDS } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { KIT_MODEL_SLOTS, kitModelUrl } from '../src/3d/hardwareRegistry.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);

test('F11 · the grammar: BLIND_KIT_KINDS beside CORNER_KIT_KINDS, the registry row, the GLB slot, the proposed numbers', () => {
  assert.deepEqual(BLIND_KIT_KINDS, ['blind_pullout']);
  assert.deepEqual(CORNER_KIT_KINDS, ['carousel']);
  assert.equal(HARDWARE_TO_PART_ID.blind_pullout, 'kit_blind_pullout');
  assert.ok(PART_REGISTRY.kit_blind_pullout);
  assert.equal(KIT_MODEL_SLOTS.blind_pullout, null, 'the slot is empty until the owner drops a model in');
  assert.equal(kitModelUrl('blind_pullout', 'https://x/y'), null);
  assert.deepEqual(P.corner.blindPullout, {
    label: 'Hafele blind corner pull-out', trays: 2, trayMm: 20, clearMm: 10,
  });
});

test('F11 · fitted on each blind kit: one BOM line, a body of two trays in the blind part, zero holes, the shelves stepped aside', () => {
  for (const type of ['BLIND_BASE', 'BLIND_WALL', 'BLIND_WARDROBE']) {
    const p = { ...defaultParamsFor(type, P), unit_num: 'BB01', doors: true, shelves: 2, blind_pullout: true };
    const r = computeCabinet(p, P);
    const line = r.hardware.filter((h) => h.role === 'blind_pullout');
    assert.equal(line.length, 1, `${type}: one line`);
    assert.equal(line[0].label, 'Hafele blind corner pull-out');
    assert.deepEqual([line[0].qty, line[0].unit], [1, 'pcs']);
    assert.match(line[0].spec_label, /blind part/);
    const kit = r.assemblies.cornerKits.find((k) => k.kind === 'blind_pullout');
    assert.ok(kit && kit.placeholder === true);
    const G = p.board_t || P.carcass.thickness;
    const blank = r.panels.find((x) => x.role === 'blind_blank');
    assert.equal(kit.box.x, G, 'behind the blank, inside the side');
    assert.equal(kit.box.w, blank.w - G, 'the blind part\'s inner width');
    assert.equal(kit.trays.length, 2);
    assert.ok(kit.trays.every((y) => y > kit.box.y && y < kit.box.y + kit.box.h));
    assert.equal(r.panels.filter((x) => x.part === 'SHELF').length, 0, `${type}: the shelves stepped aside`);
    assert.equal(r.drills.some((d) => /pullout/i.test(String(d.panel))), false, 'zero holes');
    assert.equal(r.warnings.some((w) => w.code === 'BLIND_PULLOUT_REFUSED'), false);
    // The scene's instance, through the one reader.
    const inst = hardwareInstances(r, P).kits.filter((k) => k.body === 'blind_pullout');
    assert.equal(inst.length, 1);
    assert.equal(inst[0].trays.length, 2);
    // Not fitted: the shelves are cut, no line.
    const off = computeCabinet({ ...p, blind_pullout: null }, P);
    assert.equal(off.panels.filter((x) => x.part === 'SHELF').length, 2);
    assert.equal(off.hardware.some((h) => h.role === 'blind_pullout'), false);
  }
});

test('F11 · a fixed shelf in the way refuses the pull-out in words; the shelf is cut as asked', () => {
  const r = computeCabinet({
    ...defaultParamsFor('BLIND_BASE', P), unit_num: 'BB01', doors: true, blind_pullout: true,
    sections: [{ items: [{ id: 's1', kind: 'shelf', pos_mm: 300, variant: 'fixed' }] }],
  }, P);
  const said = r.warnings.find((w) => w.code === 'BLIND_PULLOUT_REFUSED');
  assert.ok(said);
  assert.match(said.message, /a fixed shelf stands in the blind corner pull-out's way/);
  assert.equal(r.panels.filter((x) => x.part === 'SHELF').length, 1);
  assert.equal(r.hardware.some((h) => h.role === 'blind_pullout'), false);
});

test('F11 · the store: setCornerKit fits it on a blind kit only, refuses an L and a plain unit, refuses a fixed shelf', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const blind = S().addUnit('BLIND_BASE').id;
  // The blank, the strip and the pull-out's body come with the kit's fronts (T75 F3's law for the blank).
  S().addDoors(blind);
  const bud = S().addUnit('BUD').id;
  const l = S().addUnit('CORNER_L_BASE').id;
  assert.equal(S().setCornerKit(bud, 'blind_pullout', true).ok, false);
  assert.match(S().setCornerKit(l, 'blind_pullout', true).error, /blind corner unit only/);
  assert.equal(S().setCornerKit(blind, 'carousel', true).ok, false, 'the carousel is the L\'s');
  assert.equal(S().setCornerKit(blind, 'blind_pullout', true).ok, true);
  assert.equal(U(blind).params.blind_pullout, true);
  assert.equal(S().unitResult(blind).hardware.filter((h) => h.role === 'blind_pullout').length, 1);
  assert.equal(S().setCornerKit(blind, 'blind_pullout', false).ok, true);
  assert.equal(U(blind).params.blind_pullout, null);
  // A fixed shelf stands in the way: refused in words, nothing written.
  S().addItem(blind, { id: 'fx', kind: 'shelf', pos_mm: 300, variant: 'fixed' });
  const no = S().setCornerKit(blind, 'blind_pullout', true);
  assert.equal(no.ok, false);
  assert.match(no.error, /fixed shelf .* stands in the pull-out's way/);
  assert.equal(U(blind).params.blind_pullout, null);
});

test('F11 · Add items offers the row on the blind kits; the scene has the body; the copies hold', () => {
  const src = read('src/components/AddItems.jsx');
  assert.match(src, /id: 'blind_pullout',\s*label: 'Blind corner pull-out',\s*families: \['kitchen'\],\s*disabled: !type\.blind,/);
  assert.match(src, /data-corner-kit="blind_pullout"/);
  assert.match(src, /onCornerKit\('blind_pullout', 'Blind corner pull-out', !blindPulloutOn\)/);
  assert.equal(read('src/retail/design/detail/AddItems.jsx').includes('data-corner-kit="blind_pullout"'), true, 'the retail copy was re-made');
  const hw = read('src/3d/Hardware.jsx');
  assert.match(hw, /k\.body === 'blind_pullout'/);
  assert.match(hw, /function BlindPulloutBody/);
  assert.match(hw, /kitModelUrl\('blind_pullout', storageBase\)/);
});
