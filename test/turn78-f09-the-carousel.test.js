// ─── T78 · F9 · THE CAROUSEL ────────────────────────────────────────────────
//
// The owner, 11.10.2026: *"krecacy sie naroznik na garnki w srodku."*
//
// T78 LAWS: *"A bought mechanism is a line and a body, never a hole, until its
// manufacturer's drilling is in reference/hardware/ with a page number."*  So
// the carousel on an L is `params.carousel` (Add items, Carousel, the L only):
// one BOM line (role carousel, readiness bought), one placeholder body (two
// round trays on a post in the L's inner-corner square), zero holes; the L's
// adjustable shelves step aside when it is fitted; a fixed shelf in its way is
// refused in words, by the store and by the engine.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CORNER_KIT_KINDS, computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { cornerKitInstances, hardwareInstances } from '../src/engine/hardware3d.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { readinessOf } from '../src/engine/readiness.js';
import { KIT_MODEL_SLOTS, kitModelUrl } from '../src/3d/hardwareRegistry.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const G = P.board.thickness;
const L = (over = {}) => computeCabinet({
  ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, shelves: 1, ...over,
}, P);

test('F9 · the kind, the registry row and the profile\'s placeholder numbers (proposed)', () => {
  assert.deepEqual(CORNER_KIT_KINDS, ['carousel']);
  assert.equal(HARDWARE_TO_PART_ID.carousel, 'kit_carousel');
  assert.equal(PART_REGISTRY.kit_carousel.materialType, 'hardware');
  assert.deepEqual(P.corner.carousel, {
    label: 'Carousel (pots)', trays: 2, trayMm: 15, postMm: 25, clearMm: 10,
  });
  assert.match(read('src/engine/profile.js'), /clearMm: 10, \/\/ T78 proposed, owner to confirm/);
});

test('F9 · fitted: one BOM line (bought), one body in the inner-corner square, the shelves step aside, not one hole moves', () => {
  const plain = L();
  const r = L({ carousel: true });
  assert.equal(plain.panels.filter((p) => p.part === 'SHELF').length, 1);
  assert.equal(r.panels.filter((p) => p.part === 'SHELF').length, 0, 'the adjustable shelf stepped aside');
  assert.deepEqual(r.drills, plain.drills, 'a hole moved');
  assert.deepEqual(
    r.panels.map((p) => p.id),
    plain.panels.map((p) => p.id).filter((id) => !/^SHELF-L/.test(id)),
    'every other board is the plain L\'s',
  );
  const line = r.hardware.find((h) => h.role === 'carousel');
  assert.ok(line);
  assert.equal(line.qty, 1);
  assert.equal(line.label, 'Carousel (pots)');
  assert.equal(readinessOf({ ...line, kind: 'hardware' }), 'bought');
  const arm = P.baseUnit.defaults.depth;
  assert.deepEqual(line.spec, {
    opening_width_mm: arm - G, opening_height_mm: 770 - 2 * G, opening_depth_mm: arm - G, trays: 2,
  });
  const [body] = r.assemblies.cornerKits;
  assert.equal(body.kind, 'carousel');
  assert.equal(body.placeholder, true);
  assert.deepEqual(body.box, {
    x: G, y: G, z: G, w: arm - G, h: 770 - 2 * G, d: arm - G,
  }, 'the inner-corner square, between the boards');
  assert.deepEqual(body.centre, { x: G + (arm - G) / 2, z: G + (arm - G) / 2 });
  assert.equal(body.radius, (arm - G) / 2 - 10);
  assert.equal(body.trays.length, 2);
  assert.ok(body.trays.every((y) => y > G && y < 770 - G), 'the trays stand between the bottom and the top');
  assert.equal(body.shelvesStoodAside, 1);
  assert.equal(plain.assemblies.cornerKits, undefined, 'absent rather than empty on an L without one');
});

test('F9 · the right hand mirrors the body; the wall L and the wardrobe L take it too', () => {
  const r = L({ carousel: true, corner_side: 'right' });
  const [body] = r.assemblies.cornerKits;
  const arm = P.baseUnit.defaults.depth;
  assert.equal(body.box.x, 900 - G - (arm - G));
  assert.equal(body.centre.x, 900 - G - (arm - G) / 2);
  for (const type of ['CORNER_L_WALL', 'CORNER_L_WARDROBE']) {
    const rr = computeCabinet({ ...defaultParamsFor(type, P), unit_num: '01', doors: true, carousel: true }, P);
    assert.equal(rr.assemblies.cornerKits?.length, 1, type);
    assert.equal(rr.hardware.filter((h) => h.role === 'carousel').length, 1, type);
  }
});

test('F9 · a FIXED shelf in its way: the engine says so in words and fits nothing; the shelves are cut as before', () => {
  const r = L({ carousel: true, sections: [{ items: [{ id: 's1', kind: 'shelf', variant: 'fixed', pos_mm: 400 }] }], shelves: 0 });
  const w = r.warnings.find((x) => x.code === 'CAROUSEL_REFUSED');
  assert.ok(w, JSON.stringify(r.warnings.map((x) => x.code)));
  assert.match(w.message, /fixed shelf .*stands in its way/);
  assert.equal(r.assemblies.cornerKits, undefined);
  assert.equal(r.hardware.some((h) => h.role === 'carousel'), false);
  assert.ok(r.panels.some((p) => p.part === 'SHELF'), 'the fixed shelf is still cut');
});

test('F9 · the scene: the body is a kit instance with the trays and the post; the GLB slot is empty (a placeholder, said so)', () => {
  const r = L({ carousel: true });
  const kits = hardwareInstances(r, P).kits.filter((k) => k.body === 'carousel');
  assert.equal(kits.length, 1);
  assert.deepEqual(cornerKitInstances(r), kits);
  const [k] = kits;
  assert.equal(k.placeholder, true);
  assert.equal(k.trays.length, 2);
  assert.ok(k.radius > 0 && k.post.dia > 0);
  assert.equal(KIT_MODEL_SLOTS.carousel, null, 'no model yet');
  assert.equal(kitModelUrl('carousel', 'https://x/y'), null);
  assert.match(read('src/3d/Hardware.jsx'), /k\.body === 'carousel'/);
  assert.match(read('src/3d/Hardware.jsx'), /function CarouselBody/);
});

test('F9 · the store: Add items fits it on an L only, refuses in words over a fixed shelf, and takes it out again', () => {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const bud = S().addUnit('BUD').id;
  const no = S().setCornerKit(bud, 'carousel', true);
  assert.equal(no.ok, false);
  assert.match(no.error, /L corner unit only/);
  const l = S().addUnit('CORNER_L_BASE').id;
  S().addDoors(l);
  const fixedId = S().addItem(l, { kind: 'shelf', variant: 'fixed', pos_mm: 400 });
  const blocked = S().setCornerKit(l, 'carousel', true);
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /fixed shelf .*stands in the carousel's way/);
  assert.notEqual(U(l).params.carousel, true);
  S().removeItem?.(l, fixedId) ?? S().deleteItem?.(l, fixedId);
  const ok = S().setCornerKit(l, 'carousel', true);
  assert.equal(ok.ok, true, ok.error);
  assert.equal(U(l).params.carousel, true);
  const r = computeCabinet(U(l).params, P);
  assert.equal(r.hardware.filter((h) => h.role === 'carousel').length, 1);
  const off = S().setCornerKit(l, 'carousel', false);
  assert.equal(off.ok, true);
  assert.notEqual(U(l).params.carousel, true);
  assert.equal(S().setCornerKit(l, 'rotisserie', true).ok, false, 'an unknown kind is refused');
});

test('F9 · Add items offers Carousel on the L only, through setCornerKit', () => {
  const src = read('src/components/AddItems.jsx');
  assert.match(src, /id: 'carousel',\s*label: 'Carousel',\s*families: \['kitchen'\],\s*disabled: !type\.corner,/);
  assert.match(src, /setCornerKit\(unit\.id, kind, on\)/);
  assert.match(src, /data-corner-kit="carousel"/);
});
