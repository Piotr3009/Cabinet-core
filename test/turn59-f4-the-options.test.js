// ─── TURN 59 · F4 — EVERY CONTROL, THROUGH THE ONE ADAPTER ─────────────────
//
// CLAUDE.md F4: *"Tests (`test/turn59-f4-the-options.test.js`): every control's
// adapter call yields the expected engine params; a preset applies its decors;
// the slope chip yields a `slope_cut` the engine accepts; disabled reasons are
// the engine's."*
//
// The adapter is driven against the REAL stores and the REAL profile — not a
// mock. A test that mocked the engine would prove the adapter talks to a mock.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';

// The retail app's own first act, so this file runs the stores exactly as the
// browser does — and, in a test, so it cannot touch a developer's own cache.
setPersistence('none');

const { useProjectStore } = await import('../src/stores/projectStore.js');
const { getCabinetProfile } = await import('../src/engine/profile.js');
const { wideFrontMm, CHECKS } = await import('../src/engine/checks.js');
const { doorCountFor } = await import('../src/engine/cabinet.js');
const { parseDecorCatalogue, setDecorCatalogue, finishIdForDecor } = await import('../src/engine/decors.js');
const { HANDLE_TYPES } = await import('../src/engine/handles.js');
const A = await import('../src/retail/design/adapter.js');
const { COLLECTIONS, collectionById, collectionDecorIds } = await import('../src/retail/design/collections.js');
const { REASONS } = await import('../src/retail/design/reasons.js');

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();

// The EGGER pack, loaded the way retail loads it — from the same file, through
// the engine's own parser, into the engine's own registry.
const PACK = JSON.parse(readFileSync(join(ROOT, 'public/decors/egger/egger-decors.json'), 'utf8'));
setDecorCatalogue(parseDecorCatalogue(PACK, { basePath: '/decors/egger/' }));

const fresh = () => {
  const id = A.startDesign('Test wardrobe');
  assert.ok(id, 'no wardrobe was made');
  return id;
};

// ─── BOUNDS ────────────────────────────────────────────────────────────────

test('F4 · every bound is the profile\'s own, never a number typed into retail', () => {
  const p = getCabinetProfile();
  const b = A.designBounds();
  assert.equal(b.wardrobeHeight.min, p.wardrobe.minHeight);
  assert.equal(b.drawerFront.min, p.wardrobe.drawers.minFrontHeight);
  assert.equal(b.drawerFront.max, p.wardrobe.drawers.maxFrontHeight);
  assert.equal(b.drawerFront.standard, p.wardrobe.drawers.frontHeight);
  assert.equal(b.drawerCount.max, p.wardrobe.drawers.maxCount);
  assert.equal(b.wideFront, wideFrontMm(p));
  assert.deepEqual(b.defaults, p.wardrobe.defaults);
  // The shaker frame is `front.types.S`'s own block — 60 is what the workshop
  // cuts; 70 is `legacyFrameWidth` and is read only when an OLD job is opened.
  assert.equal(b.shakerFrame.standard, p.front.types.S.frameWidth);
  assert.equal(b.shakerFrame.min, p.front.types.S.frameMin);
  assert.equal(b.shakerFrame.max, p.front.types.S.frameMax);
  assert.equal(b.singleDoorMax, p.doors.singleDoorMaxWidth);
  // The two the engine has no opinion about are LABELLED as retail's own, so
  // nobody reads them later as an engine law.
  assert.match(b.wall.from, /retail/);
  assert.match(b.ceiling.from, /retail/);
});

// ─── F4.1 · YOUR SPACE ─────────────────────────────────────────────────────

test('F4.1 · the wall and the ceiling reach the project\'s own room', () => {
  fresh();
  A.setSpace({ wallMm: 3200, ceilingMm: 2600 });
  const room = S().project.room;
  assert.equal(Math.round(room.corners[1].x), 3200);
  assert.equal(room.height, 2600);
  // A second edit moves one without losing the other.
  A.setSpace({ ceilingMm: 2400 });
  assert.equal(Math.round(S().project.room.corners[1].x), 3200);
  assert.equal(S().project.room.height, 2400);
});

test('F4.1 · the slope chip yields a rake the ENGINE accepts, and takes it back', () => {
  const unitId = fresh();
  A.setSpace({ wallMm: 3000, ceilingMm: 2500 });
  assert.equal(S().unitUnderSlope(unitId), false, 'a new wardrobe stands on a flat wall');

  const id = A.setSlope({ on: true, leftMm: 1300, rightMm: 2500 });
  assert.ok(id, 'the store refused the rake');
  const slope = S().project.wallSlopes.find((s) => s.kind === 'slope');
  assert.ok(slope, 'no slope on the project');

  // THE ENGINE'S OWN ELEVATION, not a shape retail invented: which side the
  // ceiling comes down on, how high it is there, and how far the rake runs.
  assert.equal(slope.side, 'L', 'the lower of the two heights is the side it drops on');
  assert.equal(slope.startHeight, 1300);
  assert.equal(slope.run, 3000, 'the far side is AT the ceiling, so the rake runs the whole wall');

  // …and the engine now says the wardrobe is under it, which is the only
  // thing the two sliders were ever for.
  assert.equal(S().unitUnderSlope(unitId), true);

  // The two sliders read back out of the engine's three numbers, unchanged.
  assert.deepEqual(A.slopeHeights(S().project), { on: true, left: 1300, right: 2500 });

  // Moving a slider UPDATES the same element rather than stacking a second.
  A.setSlope({ on: true, leftMm: 1500, rightMm: 2500 });
  assert.equal(S().project.wallSlopes.filter((s) => s.kind === 'slope').length, 1);
  assert.equal(S().project.wallSlopes[0].startHeight, 1500);

  // The other hand: a low RIGHT drops the ceiling on the right.
  A.setSlope({ on: true, leftMm: 2500, rightMm: 1400 });
  assert.equal(S().project.wallSlopes[0].side, 'R');
  assert.equal(S().project.wallSlopes[0].startHeight, 1400);
  assert.deepEqual(A.slopeHeights(S().project), { on: true, left: 2500, right: 1400 });

  A.setSlope({ on: false });
  assert.equal(S().project.wallSlopes.filter((s) => s.kind === 'slope').length, 0);
  assert.equal(A.slopeHeights(S().project).on, false);
});

// ─── F4.2 · LAYOUT ─────────────────────────────────────────────────────────

test('F4.2 · width and depth land on the unit\'s own params', () => {
  const unitId = fresh();
  A.setSpace({ wallMm: 3000, ceilingMm: 2500 });
  A.setWardrobeSize(unitId, { width: 1800 });
  assert.equal(S().units[0].params.width, 1800);
  A.setWardrobeSize(unitId, { depth: 650 });
  assert.equal(S().units[0].params.depth, 650);
  assert.deepEqual(A.designBounds().depths, [450, 600, 650]);
});

test('F4.2 · a door COUNT is n bays, and the store centres the partitions', () => {
  const unitId = fresh();
  A.setSpace({ wallMm: 3000, ceilingMm: 2500 });
  A.setWardrobeSize(unitId, { width: 2000 });

  const partitions = () => (S().units[0].params.sections?.[0]?.items || [])
    .filter((i) => i.kind === 'partition');

  A.setDoorCount(unitId, 3);
  assert.equal(partitions().length, 2, 'three doors is two partitions');
  const xs = partitions().map((p) => p.x_mm).sort((a, b) => a - b);
  // Centred: the two gaps either side of each partition are equal to within a
  // snap step. The arithmetic is `centrePartitions`', not retail's.
  const width = S().units[0].params.width;
  assert.ok(Math.abs((xs[0] - 0) - (xs[1] - xs[0])) < 40, `partitions are not centred: ${xs}`);
  assert.ok(Math.abs((width - xs[1]) - (xs[1] - xs[0])) < 40, `partitions are not centred: ${xs}`);

  A.setDoorCount(unitId, 1);
  assert.equal(partitions().length, 0, 'one door is no partitions');
  A.setDoorCount(unitId, 4);
  assert.equal(partitions().length, 3);

  // AND THE ENGINE AGREES. The count that matters is the number of leaves it
  // will actually cut, not the number of dividers retail arranged to get them:
  // a divider set back 20 mm divides the interior and not the front, and
  // `params.doors` decides whether there are any fronts at all.
  for (const want of [2, 3, 4]) {
    assert.equal(A.setDoorCount(unitId, want), want, `asked for ${want} doors`);
    assert.equal(A.doorCount(unitId), want, `the engine cut a different number for ${want}`);
    for (const part of partitions()) {
      assert.equal(Number(part.front_mm), 0, 'a divider that is not flush does not divide the front');
    }
  }

  // ONE DOOR IS THE ENGINE'S DECISION. Over its own width threshold it cuts a
  // pair whatever the chip said — which is exactly why the chip for one is
  // refused at this width.
  A.setDoorCount(unitId, 1);
  assert.equal(A.doorCount(unitId), 2, 'a 2000 mm carcass is two leaves, by the engine\'s own law');
  assert.ok(A.doorCountRefusal(2000, 1), 'and the chip that asked for one is refused');
});

test('F4.2 · the door-width refusal is the ENGINE\'s number and the ENGINE\'s check', () => {
  const wide = wideFrontMm(getCabinetProfile());
  const check8 = CHECKS.find((c) => c.n === 8);
  assert.ok(check8, 'the engine has no wide-front check any more — this refusal must be re-sourced');

  // Two doors on a 1200 wall is 600 each — exactly at the limit, and allowed.
  assert.equal(A.doorCountRefusal(wide * 2, 2), '', 'a leaf AT the limit is not refused');

  // THREE OR FOUR is a question about a LEAF, and CHECK #8 is the law: over
  // `profile.checks.wideFrontMm` a 110° hinge will not open far enough.
  // …and it is a NOTE, not a refusal: CHECK #8 is a YELLOW finding ("consider
  // 155°"), which is advice about a hinge. A chip greyed out over a yellow
  // would be retail inventing a law the workshop has not got.
  assert.equal(A.doorCountRefusal(wide * 6, 3), '', 'a yellow finding must not disable a chip');
  const note = A.doorCountNote(wide * 6, 3);
  assert.ok(note, 'a leaf over the limit must still be remarked on');
  assert.match(note, new RegExp(String(wide)), 'the note must say the engine\'s own number');
  assert.match(note, new RegExp(check8.label), 'the note must carry the engine\'s own words');
  assert.match(note, new RegExp(`${wide * 2} mm`), 'and the leaf width, so the client sees WHY');
  assert.equal(A.doorCountNote(wide * 2, 2), '', 'a leaf AT the limit gets no note');

  // ONE DOOR is a DIFFERENT law, and the engine has a function for it:
  // `doorCountFor(width, profile)` — one leaf up to `singleDoorMaxWidth`, two
  // above. Retail asks it rather than re-deriving it.
  const singleMax = getCabinetProfile().doors.singleDoorMaxWidth;
  assert.equal(A.doorCountRefusal(singleMax, 1), '', `a ${singleMax} mm wardrobe is one door`);
  const oneRefused = A.doorCountRefusal(singleMax + 200, 1);
  assert.ok(oneRefused, 'over the single-door width, one door must be refused');
  assert.match(oneRefused, new RegExp(String(singleMax)), 'and the refusal says the engine\'s number');
  assert.equal(doorCountFor(singleMax, getCabinetProfile()), 1);
  assert.equal(doorCountFor(singleMax + 200, getCabinetProfile()), 2);
});

// ─── F4.3 · FRONTS AND THE COLLECTIONS ─────────────────────────────────────

test('F4.3 · the three live styles are the engine\'s, and the other two say why', () => {
  const styles = A.frontStyles();
  const live = styles.filter((s) => !s.soon).map((s) => s.id);
  assert.deepEqual(live, ['F', 'S', 'HJ'], 'SLAB, SHAKER and J-PULL are what the engine cuts today');
  const soon = styles.filter((s) => s.soon);
  assert.deepEqual(soon.map((s) => s.id), ['G', 'A']);
  for (const s of soon) assert.equal(s.reason, REASONS.styleComingSoon);
  assert.deepEqual(styles.map((s) => s.label).slice(0, 3), ['SLAB', 'SHAKER', 'J-PULL']);

  fresh();
  A.setFrontStyle('S');
  assert.equal(S().project.design.fronts.style, 'S');
  A.setShakerFrame(40);
  assert.equal(S().project.design.fronts.shakerFrame, 40);
});

test('F4.3 · a collection is a PRESET: front decor, carcass decor, handle', () => {
  for (const collection of COLLECTIONS) {
    fresh();
    const applied = A.applyCollection(collection.id);
    assert.ok(applied, `${collection.id} did not apply`);

    const design = S().project.design;
    assert.equal(design.fronts.types[0].finish_id, finishIdForDecor({ id: collection.frontDecor }),
      `${collection.id}: the front decor did not land`);
    assert.equal(design.carcass.types[0].finish_id, finishIdForDecor({ id: collection.carcassDecor }),
      `${collection.id}: the carcass decor did not land`);
    assert.equal(design.fronts.handle?.type, collection.handle,
      `${collection.id}: the handle default did not land`);
  }
  assert.equal(collectionById('nothing-like-it'), null);
});

test('F4.3 · every swatch is a decor the app ALREADY has, with EGGER beside it', () => {
  for (const id of collectionDecorIds()) {
    const s = A.swatchFor(id);
    assert.equal(s.known, true, `${id} is not in the catalogue — no new textures this turn`);
    assert.match(s.hex, /^#[0-9a-fA-F]{6}$/, `${id} has no colour`);
    assert.match(s.label, /EGGER/, `${id} has no attribution — the licence asks for it unconditionally`);
    assert.ok(s.finishId, `${id} yields no finish id`);
  }
  const unknown = A.swatchFor('NOT_A_DECOR');
  assert.equal(unknown.known, false);
  assert.equal(unknown.finishId, null);
});

// ─── F4.4 · THE INTERIOR ───────────────────────────────────────────────────

test('F4.4 · every interior row goes in through the STORE\'s own add', () => {
  const unitId = fresh();
  A.setSpace({ wallMm: 3000, ceilingMm: 2600 });
  A.setWardrobeSize(unitId, { width: 1200 });

  const store = S();
  for (const row of A.INTERIOR_ROWS) {
    if (row.id === 'watch' || row.id === 'shoe') continue;   // the exclusion has its own test
    // ─── AMENDED BY T61 F4 ────────────────────────────────────────────────
    // The OVERLAY stack has an exclusion of its own and it is the store's:
    // `addOverlayDrawers` DELETES the internal stack it replaces (*"T41-F3:
    // choosing overlay clears the internal stack"*). Adding both in one loop
    // and then asserting both exist would be asserting something the shared
    // core has never done. It has its own test below.
    if (row.id === 'overlay') continue;
    row.add(store, unitId);
  }
  const counts = A.interiorCounts(S().units[0]);
  assert.ok(counts.hanger >= 1, 'no hanging rail');
  assert.ok(counts.shelves >= 1, 'no shelves');
  assert.ok(counts.drawers >= 1, 'no drawers');
  assert.ok(counts.pulldown_rail >= 1, 'no pull-down rail');
  // T61 F4: the four that joined the list.
  assert.ok(counts.partition >= 1, 'no vertical divider');
  assert.ok(counts.trouser >= 1, 'no trouser pull-out');
  assert.ok(counts.tie_rack >= 1, 'no tie rack');
});

// ─── ADDED BY T61 F4 ────────────────────────────────────────────────────────
test('F4.4 · the overlay stack REPLACES the drawers inside — the store\'s own law', () => {
  const unitId = fresh();
  A.setSpace({ wallMm: 3000, ceilingMm: 2600 });
  A.setWardrobeSize(unitId, { width: 1200 });
  const store = S();

  const drawers = A.INTERIOR_ROWS.find((r) => r.id === 'drawers');
  const overlay = A.INTERIOR_ROWS.find((r) => r.id === 'overlay');
  drawers.add(store, unitId);
  assert.ok(A.interiorCounts(S().units[0]).drawers >= 1, 'the internal stack was not made');

  overlay.add(store, unitId);
  const after = A.interiorCounts(S().units[0]);
  assert.ok(after.overlay >= 1, 'the overlay stack was not made');
  assert.equal(after.drawers, 0, 'the internal stack survived the overlay one');

  // …and the room SAYS so before the press rather than after it, which is the
  // difference between a law and a surprise.
  assert.match(A.interiorNotes(S().units[0]).drawers, /replace the overlay stack/);
});

test('F4.4 · the pull-down\'s refusal is decided by the STORE, not by retail', () => {
  const unitId = fresh();
  A.setSpace({ wallMm: 3000, ceilingMm: 2600 });

  assert.equal(S().unitUnderSlope(unitId), false);
  assert.equal(A.interiorRefusals(unitId, S().units[0]).pulldown_rail, '',
    'a flat wall refuses nothing');

  A.setSlope({ on: true, leftMm: 1300, rightMm: 2600 });
  // THE PREDICATE IS THE STORE'S. If `unitUnderSlope` ever changes its mind,
  // this chip changes with it and retail is not consulted.
  assert.equal(S().unitUnderSlope(unitId), true);
  assert.equal(A.interiorRefusals(unitId, S().units[0]).pulldown_rail, REASONS.pulldownUnderSlope);
});

test('F4.4 · watches and shoes exclude each other, in both directions', () => {
  const unitId = fresh();
  A.setSpace({ wallMm: 3000, ceilingMm: 2600 });
  A.setWardrobeSize(unitId, { width: 900 });
  S().addDrawers(unitId, 3);

  assert.equal(A.interiorRefusals(unitId, S().units[0]).watch, '', 'nothing excludes a watch yet');

  S().addShoeDrawer(unitId);
  assert.ok(A.interiorCounts(S().units[0]).shoe >= 1, 'the shoe drawer did not go in');
  assert.equal(A.interiorRefusals(unitId, S().units[0]).watch, REASONS.watchWithShoe);

  // …and the STORE says the same thing in its own words when pressed anyway.
  const drawers = (S().units[0].params.sections[0].items || []).filter((i) => i.kind === 'drawer');
  const plain = drawers.find((d) => !d.variant);
  const took = S().setDrawerWatchInsert(unitId, plain.id, true);
  assert.equal(took, false, 'the store let a watch in beside a shoe');
  assert.match(A.lastEngineWord(), /watches or shoes, never both/,
    'the store\'s own sentence must be what the client is shown');
});

// ─── F4.5 · DETAILS ────────────────────────────────────────────────────────

test('F4.5 · handles, lighting and the plinth', () => {
  const unitId = fresh();
  const ids = A.handleSystems().map((h) => h.id);
  assert.deepEqual(ids, [...HANDLE_TYPES.map((h) => h.id), 'none'],
    'the handle systems are the engine\'s, plus NONE');

  A.setHandle('bar');
  assert.equal(S().project.design.fronts.handle.type, 'bar');
  A.setHandle('jpull');
  assert.equal(S().project.design.fronts.handle.type, 'jpull');
  assert.equal(S().project.design.fronts.handle.centres, undefined,
    'a J-pull carries no centres — there is nothing screwed on');
  A.setHandle('none');
  assert.equal(S().project.design.fronts.handle, null, 'NONE is the engine\'s own null');

  assert.equal(A.REASON_JPULL, REASONS.jpullTakesNoHandle);

  A.setPlinth(unitId, 150);
  assert.equal(S().units[0].params.leg_height, 150);
  A.setLighting(true);
  // The LED answer lives on `design.lighting` under the key `on` — which is
  // what `migrateDesign` normalises the block to. A patch of `{ enabled }`
  // would be dropped on the way through it without a word.
  assert.equal(S().project.design.lighting.on, true);
  assert.equal(A.lightingOn(S().project), true);
  A.setLighting(false);
  assert.equal(A.lightingOn(S().project), false);
});

// ─── THE DISCIPLINE ────────────────────────────────────────────────────────

test('F4 · the adapter is the ONLY place retail speaks engine', () => {
  const RETAIL = join(ROOT, 'src/retail');
  const walk = (dir) => readdirSync(dir).sort().flatMap((e) => {
    const path = join(dir, e);
    return statSync(path).isDirectory() ? walk(path) : (/\.(js|jsx)$/.test(path) ? [path] : []);
  });

  // Which retail files may reach into src/engine, src/3d or src/stores at all.
  // Everything else asks the adapter. The list is SHORT on purpose and every
  // entry is argued: the adapter itself; the stage, which mounts the shared
  // viewer; the entry, which throws the two switches; the decor loader; the
  // estimate, which reads engine vocabulary to put a design into words; and
  // the two design-room files that read live store state to render it.
  const ALLOWED = new Set([
    'design/adapter.js', 'design/Stage.jsx', 'design/DesignRoom.jsx', 'design/Detail.jsx',
    'design/Options.jsx', 'design/ViewBar.jsx', 'main-retail.jsx', 'decorPack.js',
    'estimate/store.js', 'estimate/document.js',
  ]);

  // ─── AMENDED BY T62 F2/F3 ────────────────────────────────────────────────
  //
  // The adapter law binds the components RETAIL WRITES. `design/room/` holds
  // four it did not: `RoomModal.jsx`, `WallElevationModal.jsx`, `Modal.jsx` and
  // `NumberField.jsx` are `src/components/`'s own files, copied on the owner's
  // order — *"jak piszę 1 do 1 to KOPIUJ. ale kopiuj — nie kasuj, nie zmieniaj
  // PRO, tylko zrób identycznie w retail."* They speak the engine because PRO's
  // files speak the engine, and routing them through an adapter would be
  // re-writing them, which is the one thing this turn forbids.
  //
  // The exemption is per FILE and per ORIGINAL, not per directory:
  // `RoomEditor.jsx` sits in the same folder, is retail's own work, and still
  // answers to the law in full — which is why it imports nothing but the two
  // copies and React.
  const copiedFromPro = (rel) => rel.startsWith('design/room/')
    && existsSync(join(ROOT, 'src/components', rel.slice('design/room/'.length)));

  const strays = [];
  for (const file of walk(RETAIL)) {
    const rel = file.slice(RETAIL.length + 1);
    if (ALLOWED.has(rel) || copiedFromPro(rel)) continue;
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/from '\.\.[^']*\/(engine|3d|stores)\/[^']*'/g)) {
      strays.push(`${rel} reaches ${m[0]}`);
    }
  }
  assert.deepEqual(strays, [],
    `these should be asking the adapter:\n  ${strays.join('\n  ')}`);
});
