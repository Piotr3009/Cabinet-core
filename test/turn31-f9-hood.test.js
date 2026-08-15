// ─── F9: THE HOOD WALL UNIT (turn 31, CLAUDE.md F9) ─────────────────────────
//
// "New Kitchen type: hood wall unit (parent geometry KIT_WUD envelope, shorter
// door above an open appliance aperture). The extractor itself is HARDWARE: BOM
// line + GLB slot for when the owner uploads a model (the Blum pattern). Rule 2
// applies: no invented holes — the aperture is geometry, the fixings wait for
// truth."
//
// Rule 2 is the sentence this file is mostly about, and it is the one it would
// be easiest to break: an extractor is screwed into a cabinet somehow, and it
// would take five minutes to invent four holes for it. Every make fixes
// differently, this repo has no published pattern for any of them, and a hole
// this app cannot cite is a hole it does not drill.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { UNIT_TYPES, UNIT_TYPE_ORDER, defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import { KITCHEN_LIBRARY } from '../src/engine/library.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const hood = (patch = {}) => computeCabinet({
  ...defaultParamsFor('WUD_HOOD', P), doors: { count: 1 }, ...patch,
});
const wud = (patch = {}) => computeCabinet({
  ...defaultParamsFor('WUD', P), doors: { count: 1 }, ...patch,
});

test('it is a WALL UNIT, and its parent geometry is the KIT_WUD envelope', () => {
  const type = getUnitType('WUD_HOOD');
  assert.equal(type.lisp, 'KIT_WUD_FULL.lsp', 'the parent kit, in as many words');
  assert.equal(type.mount, 'wall');
  assert.equal(type.heightGroup, 'wall');
  assert.equal(type.hangers, true);
  // A hood's door is a wall door and takes the same cups.
  assert.equal(type.hingeRule, getUnitType('WUD').hingeRule);
  assert.equal(type.cupRule, getUnitType('WUD').cupRule);
});

test('the APERTURE: no bottom board, and the door stands above it', () => {
  const r = hood();
  assert.equal(getUnitType('WUD_HOOD').carcass.bottom, 'none');
  assert.ok(!r.panels.some((p) => p.part === 'BOTTOM'), 'a board across the aperture is a lid');
  // …and the sides, top and back are the wall unit's own.
  for (const part of ['BUL', 'BUR', 'TOP', 'BACK']) {
    assert.ok(r.panels.some((p) => p.part === part), `the envelope lost its ${part}`);
  }

  const front = r.panels.find((p) => p.role === 'front');
  const aperture = P.hoodWallUnit.defaults.aperture;
  const plain = wud().panels.find((p) => p.role === 'front');
  // SHORTER by exactly the aperture, and STANDING ON it.
  assert.equal(front.h, plain.h - aperture);
  assert.equal(front.box.y, aperture);
  assert.equal(front.box.y + front.h, plain.box.y + plain.h, 'the top of the door has not moved');
});

test('the aperture is an INPUT, so no other kit in the app subtracts anything', () => {
  // A bare `computeCabinet()` with no `hood_aperture_mm` — every golden fixture
  // — is byte-for-byte what it was.
  const base = { ...defaultParamsFor('WUD', P), doors: { count: 1 } };
  assert.deepEqual(computeCabinet(base), computeCabinet({ ...base, hood_aperture_mm: 0 }));
  assert.deepEqual(computeCabinet(base).panels, computeCabinet({ ...base }).panels);
  // …and no kit but the hood carries the field at all.
  for (const id of UNIT_TYPE_ORDER) {
    const params = defaultParamsFor(id, P);
    if (getUnitType(id).appliance === 'extractor') {
      assert.equal(params.hood_aperture_mm, P.hoodWallUnit.defaults.aperture, id);
    } else {
      assert.equal(params.hood_aperture_mm, undefined, `${id} carries an aperture it has no use for`);
    }
  }
});

test('the aperture is TUNABLE, and the door follows it', () => {
  const shallow = hood({ hood_aperture_mm: 250 });
  const deep = hood({ hood_aperture_mm: 450 });
  const f = (r) => r.panels.find((p) => p.role === 'front');
  assert.equal(f(deep).h, f(shallow).h - 200);
  assert.equal(f(deep).box.y - f(shallow).box.y, 200);
  // …and it is a PROFILE default, merged key by key like every other kit's.
  assert.equal(P.hoodWallUnit.defaults.aperture, 350);
  assert.equal(migrateCabinetProfile({}).hoodWallUnit.defaults.aperture, 350);
  assert.equal(
    migrateCabinetProfile({ hoodWallUnit: { defaults: { aperture: 400 } } }).hoodWallUnit.defaults.width,
    600,
    'a workshop that tunes one number keeps the app’s answer for the rest',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// RULE 2 — NO INVENTED HOLES
// ═══════════════════════════════════════════════════════════════════════════

test('NOT ONE HOLE for the extractor — the fixings wait for truth', () => {
  const r = hood();
  // Every layer the hood drills is one the PARENT kit drills: the puzzle
  // joints, the carcass screws, and the door's own hinge pattern. There is no
  // extractor layer, because there is no published pattern for one.
  const layers = [...new Set(r.drills.map((d) => d.layer))].sort();
  const parent = [...new Set(wud().drills.map((d) => d.layer))].sort();
  for (const layer of layers) {
    assert.ok(parent.includes(layer), `the hood invented a ${layer} the wall unit does not drill`);
  }
  // …and nothing in the engine mentions one.
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.ok(!/EXTRACTOR_|HOOD_[A-Z]*MM/.test(engine), 'an extractor drilling layer appeared');
  // The pockets are the parent's too: nothing was cut for the machine.
  const pockets = r.panels.flatMap((p) => (p.cnc?.pockets || []).map((k) => k.layer));
  const parentPockets = wud().panels.flatMap((p) => (p.cnc?.pockets || []).map((k) => k.layer));
  for (const layer of new Set(pockets)) {
    assert.ok(new Set(parentPockets).has(layer), `the hood cut a ${layer} pocket nobody asked for`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// THE EXTRACTOR IS HARDWARE
// ═══════════════════════════════════════════════════════════════════════════

test('a BOM LINE, ordered to the APERTURE it hangs in', () => {
  const r = hood();
  const row = r.hardware.find((h) => h.role === 'extractor');
  assert.ok(row, 'the machine is nowhere in the BOM');
  assert.equal(row.qty, 1);
  assert.equal(row.unit, 'pcs');
  // The APERTURE and not the carcass: that is the number a joiner reads off a
  // data sheet when he buys one.
  assert.equal(row.spec.aperture_height_mm, P.hoodWallUnit.defaults.aperture);
  assert.match(row.spec_label, /mm aperture$/);
  // …and it is not board: it reaches no panel and no cut list.
  assert.ok(!r.panels.some((p) => /EXTRACT/i.test(p.id)));
  assert.ok(!r.csvLines.some((l) => /extract/i.test(l)));
});

test('…and no other kit orders one', () => {
  assert.ok(!wud().hardware.some((h) => h.role === 'extractor'));
  assert.ok(!computeCabinet({ ...defaultParamsFor('BUD', P) }).hardware.some((h) => h.role === 'extractor'));
});

test('a GLB SLOT — the Blum pattern, declared with its reason', () => {
  const hw = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');
  assert.match(hw, /export function Extractor\(/);
  assert.match(hw, /reportHardware\(surface, 'extractor'/);
  // `model: false` WITH A REASON is what tells `hardwareHealth` the difference
  // between "the owner has not uploaded it yet" and "this app forgot about
  // extractors".
  assert.match(hw, /reason: 'no model uploaded yet'/);
  // NOTHING IS DRAWN. Turn 30's own lesson: a procedural stand-in is worse than
  // an empty aperture, because an empty aperture is honest.
  const at = hw.indexOf('export function Extractor');
  const body = hw.slice(at, hw.indexOf('// ─── THE ADJUSTABLE'));
  assert.match(body, /return null;/);
  assert.ok(!/<mesh|cylinderGeometry|boxGeometry/.test(body), 'a stand-in extractor got drawn');
});

// ═══════════════════════════════════════════════════════════════════════════
// IT IS IN THE APP
// ═══════════════════════════════════════════════════════════════════════════

test('the Library offers it, in the wall group, and it can be placed', () => {
  const wall = KITCHEN_LIBRARY.find((g) => g.id === 'wall-units');
  const entry = wall.items.find((e) => e.typeId === 'WUD_HOOD');
  assert.ok(entry, 'the hood is not in the Library');
  assert.equal(entry.label, 'Hood unit');
  assert.ok(entry.hint, 'a Library row with no hint is a row nobody understands');
  assert.equal(UNIT_TYPES.WUD_HOOD.available, true);
  assert.ok(UNIT_TYPE_ORDER.includes('WUD_HOOD'));
});

test('…and the store really places one, drills the parent’s holes and orders one machine', () => {
  store().loadProject({
    id: null, name: 'hood', room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }), design: {},
  }, []);
  const u = store().addUnit('WUD_HOOD');
  assert.ok(u.id, u.error);
  const r = store().unitResult(u.id);
  assert.ok(!r.panels.some((p) => p.part === 'BOTTOM'));
  assert.ok(r.hardware.some((h) => h.role === 'extractor'));
  // The cabinet number carries its own prefix, like every other kit.
  assert.match(r.unitNum, /^HD/);
});

test('the door cannot ALSO run below the box', () => {
  // `door_extend` runs a wall front below the carcass — into the space the
  // extractor occupies. The kit says so itself rather than the engine having to
  // know which cabinets are hoods.
  assert.equal(getUnitType('WUD_HOOD').doorExtend, false);
  assert.equal(getUnitType('WUD').doorExtend, true);
});
