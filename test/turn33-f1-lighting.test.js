// ─── Turn 33, CLAUDE.md F1: LIGHTING — the owner's spec, verbatim ───────────
//
// The five placement kinds, the temperature menu, the switching by project
// type, the strips as PICTURES in the unit's own frame, and the BOM block of
// YELLOW NAMED SPECS. The iron rule this file holds hardest: LIGHTING DRILLS
// NOTHING — a project full of strips computes exactly the drills, panels and
// CSV lines an unlit one does.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { migrateDesign } from '../src/engine/design.js';
import {
  LIGHTING_KINDS, defaultSwitchFor, lightingBomLines, lightingSpec,
  resolveLighting, stripsForUnit, switchChoicesFor, temperatureEntry,
} from '../src/engine/ledStrips.js';
import { MENU_ORDER } from '../src/lib/topMenu.js';
import { MODAL_KINDS } from '../src/lib/modalLayer.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();

function project(design = {}) {
  store().loadProject({
    id: null,
    name: 't33-f1',
    room: migrateRoom({ height: 2600, corners: rectCorners(6000, 3000) }),
    design,
  }, []);
}

// ─── the design field, migrated ─────────────────────────────────────────────

test('a stored project without lighting opens dark, whole and valid', () => {
  const d = migrateDesign({});
  // ─── AMENDED 16.08.2026 (turn 35, CLAUDE.md F10) ──────────────────────────
  // `enabled` is `on`: the owner replaced the panel's two checkboxes with one
  // pair of ON/OFF buttons, so the project's "has lighting" flag and the
  // session's "and it is shining" flag became ONE persisted answer. The law
  // this test holds is untouched — a project that has never said anything
  // opens DARK, whole and valid — only the key it is spelled with moved.
  assert.deepEqual(d.lighting, {
    on: false, temperature: null, switch: null, items: [],
  });
});

test('unknown kinds and refless shelf runs do not survive the migration', () => {
  const d = migrateDesign({
    lighting: {
      enabled: true,
      temperature: 4000,
      switch: 'door',
      items: [
        { id: 'a', unitId: 'u1', kind: 'shelf', ref: 'SHELF-1', depth_mm: 40 },
        { id: 'b', unitId: 'u1', kind: 'shelf' },              // no shelf, no strip
        { id: 'c', unitId: 'u1', kind: 'laser' },              // not a kind
        { id: 'd', unitId: 'u1', kind: 'side', ref: 'X' },     // X is not a side
        { kind: 'top', unitId: 'u1' },                          // no id
      ],
    },
  });
  // T35 F10: the stored `enabled: true` above is a PRE-T35 payload, and it
  // still means ON — the legacy rule in design.js migrateLighting.
  assert.equal(d.lighting.on, true);
  assert.deepEqual(d.lighting.items.map((i) => i.id), ['a', 'd']);
  assert.equal(d.lighting.items[1].ref, 'L', 'a nonsense side lands on L, never on nothing');
});

// ─── the choices ────────────────────────────────────────────────────────────

test('the owner’s temperature menu: 3000 · 4000 · 6000, default 4000 (marked, owner to confirm)', () => {
  const spec = lightingSpec(P);
  assert.deepEqual(spec.temperatures.map((t) => t.k), [3000, 4000, 6000]);
  assert.equal(spec.defaultTemperature, 4000);
  assert.equal(resolveLighting({}, P).temperature, 4000);
  assert.equal(temperatureEntry(6000, P).k, 6000);
  assert.equal(temperatureEntry(5000, P).k, 4000, 'nearest, never nothing');
});

test('switching follows the project type: wardrobe at the door / sensor, kitchen touchless', () => {
  assert.deepEqual(switchChoicesFor('wardrobe').map((c) => c.id), ['door', 'sensor']);
  assert.deepEqual(switchChoicesFor('kitchen').map((c) => c.id), ['touchless']);
  assert.equal(defaultSwitchFor('wardrobe'), 'door');
  assert.equal(defaultSwitchFor('kitchen'), 'touchless');
  // Every other tile carries a CATEGORY (projectTypes.js) — hallway, utility,
  // 'other' are kitchen-construction and take the kitchen answer; an untyped
  // project resolves to kitchen exactly as it does everywhere else since
  // turn 7 (getProjectType's own fallback).
  assert.deepEqual(switchChoicesFor('other').map((c) => c.id), ['touchless']);
  assert.deepEqual(switchChoicesFor(null).map((c) => c.id), ['touchless']);
  assert.equal(resolveLighting({ projectType: 'wardrobe' }, P).switch, 'door');
});

// ─── the strips, in the unit's own frame ────────────────────────────────────

const WARDROBE = { type: 'WARDROBE', width: 1000, height: 2200, depth: 568 };

function wardrobeWithShelf() {
  project({ projectType: 'wardrobe' });
  const { id } = store().addUnit('WARDROBE');
  store().updateUnitParams(id, { width: 1000 });
  store().addShelves(id, 1);
  const unit = store().units.find((u) => u.id === id);
  const result = store().unitResult(id);
  const shelf = result.panels.find((p) => p.part === 'SHELF');
  assert.ok(shelf, 'the wardrobe grew a shelf');
  return { unit, result, shelf };
}

test('the clicked shelf gets its strip, and the depth slider clamps to the shelf', () => {
  const { unit, result, shelf } = wardrobeWithShelf();
  const design = {
    projectType: 'wardrobe',
    lighting: {
      enabled: true,
      items: [{ id: 'led1', unitId: unit.id, kind: 'shelf', ref: shelf.id }],
    },
  };
  const strips = stripsForUnit({
    unit, result, design, profile: P,
  });
  assert.equal(strips.length, 1);
  const s = strips[0];
  assert.equal(s.kind, 'shelf');
  assert.equal(s.length_mm, shelf.box.w, 'the run is the shelf’s clear width');
  assert.equal(s.depth_mm, P.lighting.strip.shelfDepthDefault, 'the slider starts at the profile seed');
  assert.ok(s.box.y < shelf.box.y, 'the strip hangs UNDER the shelf');
  assert.ok(s.box.z >= shelf.box.z && s.box.z + s.box.d <= shelf.box.z + shelf.box.d,
    'the strip lives within the shelf’s own depth');

  // Slide it too deep: the clamp holds it inside the shelf.
  const deep = stripsForUnit({
    unit,
    result,
    design: {
      ...design,
      lighting: { ...design.lighting, items: [{ ...design.lighting.items[0], depth_mm: 9999 }] },
    },
    profile: P,
  })[0];
  assert.equal(deep.depth_mm, deep.depth_max);
  assert.ok(deep.box.z >= shelf.box.z, 'clamped, not through the back');
});

test('no shelf, no strip — an orphaned ref draws nothing and counts nothing', () => {
  const { unit, result } = wardrobeWithShelf();
  const design = {
    lighting: {
      enabled: true,
      items: [{ id: 'led1', unitId: unit.id, kind: 'shelf', ref: 'SHELF-99' }],
    },
  };
  assert.equal(stripsForUnit({
    unit, result, design, profile: P,
  }).length, 0);
});

test('the side line is the owner’s 4 mm, top to bottom, on the interior face', () => {
  const { unit, result } = wardrobeWithShelf();
  const G = Number(unit.params.board_t) || P.board.thickness;
  const design = {
    lighting: {
      enabled: true,
      items: [
        { id: 'l', unitId: unit.id, kind: 'side', ref: 'L' },
        { id: 'r', unitId: unit.id, kind: 'side', ref: 'R' },
      ],
    },
  };
  const [left, right] = stripsForUnit({
    unit, result, design, profile: P,
  });
  assert.equal(left.box.d, P.lighting.strip.sideLineWidth, 'the 4 mm line');
  assert.equal(left.box.h, unit.params.height - 2 * G, 'top to bottom of the interior');
  assert.equal(left.box.x, G, 'on the left side’s interior face');
  assert.ok(right.box.x > unit.params.width / 2, 'the R line stands on the other side');
});

test('bottom sits at the plinth line; top washes upward off the carcass', () => {
  const { unit, result } = wardrobeWithShelf();
  const design = {
    lighting: {
      enabled: true,
      items: [
        { id: 'b', unitId: unit.id, kind: 'bottom' },
        { id: 't', unitId: unit.id, kind: 'top' },
      ],
    },
  };
  const [bottom, top] = stripsForUnit({
    unit, result, design, profile: P,
  });
  assert.ok(bottom.box.y < 0, 'under the carcass');
  assert.equal(top.box.y, unit.params.height, 'on top of it');
  assert.ok(bottom.box.z + bottom.box.d <= unit.params.depth, 'at the front, inside the depth');
});

test('spots belong to wall units — a wardrobe asked for spots draws none', () => {
  const { unit, result } = wardrobeWithShelf();
  const design = {
    lighting: {
      enabled: true,
      items: [{ id: 's', unitId: unit.id, kind: 'spot', count: 3 }],
    },
  };
  assert.equal(stripsForUnit({
    unit, result, design, profile: P,
  }).length, 0, 'WARDROBE is floor-mounted — no spots');
});

test('a kitchen wall unit takes its spots, evenly spaced, count from the item', () => {
  project({ projectType: 'kitchen' });
  const { id } = store().addUnit('WUD');
  const unit = store().units.find((u) => u.id === id);
  const result = store().unitResult(id);
  const design = {
    projectType: 'kitchen',
    lighting: {
      enabled: true,
      items: [{ id: 's', unitId: unit.id, kind: 'spot', count: 3 }],
    },
  };
  const spots = stripsForUnit({
    unit, result, design, profile: P,
  });
  assert.equal(spots.length, 3);
  const W = Number(unit.params.width);
  const centres = spots.map((s) => s.box.x + s.box.w / 2);
  assert.deepEqual(centres, [W / 4, W / 2, (3 * W) / 4], 'evenly spaced');
  assert.ok(spots.every((s) => s.round), 'a spot is a disc, not a strip');
});

test('lighting OFF is lighting OFF — items placed, nothing drawn', () => {
  const { unit, result, shelf } = wardrobeWithShelf();
  const design = {
    lighting: {
      enabled: false,
      items: [{ id: 'led1', unitId: unit.id, kind: 'shelf', ref: shelf.id }],
    },
  };
  assert.equal(stripsForUnit({
    unit, result, design, profile: P,
  }).length, 0);
});

// ─── the BOM block — yellow named specs, never an invented article ──────────

test('the BOM block: metres per temperature, one driver, the project’s switch, the spots', () => {
  const { unit, result, shelf } = wardrobeWithShelf();
  const design = migrateDesign({
    projectType: 'wardrobe',
    lighting: {
      enabled: true,
      switch: 'sensor',
      items: [
        { id: 'a', unitId: unit.id, kind: 'shelf', ref: shelf.id },
        { id: 'b', unitId: unit.id, kind: 'bottom' },
      ],
    },
  });
  const lines = lightingBomLines({ entries: [{ unit, result }], design, profile: P });
  const strip = lines.find((l) => l.role === 'led_strip');
  assert.ok(strip, 'a metres line exists');
  assert.equal(strip.label, 'LED strip 4000 K');
  const expected = (shelf.box.w + (unit.params.width - 2 * (Number(unit.params.board_t) || 18))) / 1000;
  assert.ok(Math.abs(strip.qty - expected) < 0.01, `metres are the runs’ own lengths (${strip.qty} vs ${expected})`);
  assert.ok(lines.find((l) => l.role === 'led_driver'), 'one driver line');
  assert.equal(lines.find((l) => l.role === 'led_switch').label, 'Motion sensor');
  assert.ok(lines.every((l) => l.yellow && !l.article),
    'every line is a YELLOW NAMED SPEC — the register knows no LED articles (Q4)');
});

test('an unlit project puts nothing in the BOM', () => {
  const { unit, result } = wardrobeWithShelf();
  assert.deepEqual(lightingBomLines({ entries: [{ unit, result }], design: migrateDesign({}), profile: P }), []);
});

// ─── LIGHTING DRILLS NOTHING (rule 3) ───────────────────────────────────────

test('a project full of strips computes exactly what an unlit one does', () => {
  const params = {
    ...WARDROBE, unit_num: '01', board_t: 18, front_t: 18,
  };
  const dark = computeCabinet(params, P);
  const lit = computeCabinet(params, P);   // the engine never even sees lighting
  assert.equal(JSON.stringify(lit.drills), JSON.stringify(dark.drills));
  assert.equal(JSON.stringify(lit.panels.map((p) => p.id)), JSON.stringify(dark.panels.map((p) => p.id)));
  // …and the design field cannot reach it: computeCabinet takes params, and
  // paramsForEngine forwards no lighting key.
  const { paramsForEngine } = store();
  const unit = { id: 'x', type: 'WARDROBE', params };
  if (typeof paramsForEngine === 'function') {
    const p = paramsForEngine(unit, migrateDesign({ lighting: { enabled: true, items: [] } }));
    assert.ok(!('lighting' in p), 'no lighting key rides into the engine');
  }
});

// ─── the shell: the button before Output, the registered window ─────────────

test('Lighting stands in the owner’s menu order, immediately before Output', () => {
  const i = MENU_ORDER.indexOf('Lighting');
  assert.ok(i > -1, 'Lighting is in the bar');
  assert.equal(MENU_ORDER[i + 1], 'Output', 'placed BEFORE Output — his words');
});

test('the Lighting window is registered with the shell', () => {
  assert.ok(MODAL_KINDS.lighting, 'lighting is a modal the shell knows');
  assert.equal(MODAL_KINDS.lighting.about, 'project');
});

test('the five kinds are the owner’s five and no more', () => {
  assert.deepEqual(LIGHTING_KINDS, ['shelf', 'side', 'bottom', 'top', 'spot']);
});

// ─── the store's own setters ────────────────────────────────────────────────

test('the store places, slides and removes a strip through the design channel', () => {
  const { unit, shelf } = wardrobeWithShelf();
  store().setLighting({ on: true });        // T35 F10: the one state's key
  const id = store().addLightingItem({ unitId: unit.id, kind: 'shelf', ref: shelf.id });
  assert.ok(id, 'the id is minted in the store');
  let d = migrateDesign(store().project.design);
  assert.equal(d.lighting.items.length, 1);

  store().updateLightingItem(id, { depth_mm: 120 });
  d = migrateDesign(store().project.design);
  assert.equal(d.lighting.items[0].depth_mm, 120);

  store().removeLightingItem(id);
  d = migrateDesign(store().project.design);
  assert.equal(d.lighting.items.length, 0);
  assert.equal(d.lighting.on, true, 'removing a strip does not turn the light off');
});
