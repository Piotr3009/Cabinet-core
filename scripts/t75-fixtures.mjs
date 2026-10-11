#!/usr/bin/env node
// T75 · THE THREE PROOF PROJECTS, BUILT THROUGH THE REAL STORE
//
// CLAUDE.md T75, TESTS AND PROOF: *"the T71 drawing set green on the Herbal
// Hill fixture and on one new fixture per part (`fixtures/t75-corner-
// kitchen.json`, `fixtures/t75-island.json`, `fixtures/t75-wardrobe-
// corner.json`)"*.
//
// Every unit, island, worktop and notch below is placed by the store's own
// actions, the calls the UI makes (`newProject`, `setRoom`, `setDesign`,
// `addUnit`, `setUnitWall`, `moveUnit`, `addDoors`, `addWorktop`,
// `addUpstand`, `addIsland`, `seatingOverhang`, `setUnitNotch`). Nothing is
// written into a unit by hand: a placement the store refuses stops the script
// with the store's own words, so a fixture can never hold a layout the
// interface could not have made.
//
// Deterministic: the store names things with `Math.random`, so the script
// seeds it (mulberry32, one fixed seed per fixture) BEFORE the store is
// imported. The same source tree writes the same three files, byte for byte.
//
// Run:   node scripts/t75-fixtures.mjs           (writes the three files)
//        node scripts/t75-fixtures.mjs --check   (rebuilds, compares, writes nothing)
//
// Each file is `{ project, units }`, the shape `loadProject(project, units)`
// takes.

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url).pathname;

// ─── the seed ─────────────────────────────────────────────────────────────
let seed = 0;
function mulberry32() {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const reseed = (n) => { seed = n | 0; };
Math.random = mulberry32;

const { useProjectStore } = await import('../src/stores/projectStore.js');
const { rectCorners, roomWalls } = await import('../src/engine/room.js');
const { cornersOf } = await import('../src/engine/corners.js');
const { getCabinetProfile } = await import('../src/engine/profile.js');
const { heightsForProjectType } = await import('../src/engine/projectTypes.js');
const { wardrobeSeed } = await import('../src/lib/wizardTabs.js');
const { shakerFrameMm } = await import('../src/engine/shaker.js');

const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);

/** A store answer that refuses stops the script, in the store's own words. */
function must(answer, what) {
  if (answer == null) throw new Error(`${what}: the store answered nothing`);
  if (typeof answer === 'object') {
    const said = answer.error || answer.said || answer.message;
    if (answer.ok === false || answer.blocked === true || (said && answer.id === null)) {
      throw new Error(`${what}: refused: ${said || JSON.stringify(answer)}`);
    }
  }
  return answer;
}

function add(type, opts, what) {
  const r = must(S().addUnit(type, opts), `addUnit ${type} (${what})`);
  if (!r.id) throw new Error(`addUnit ${type} (${what}): no id`);
  return r.id;
}

function toWall(id, wall, x, what) {
  must(S().setUnitWall(id, wall), `setUnitWall ${what}`);
  return must(S().moveUnit(id, x, 0), `moveUnit ${what}`);
}

function doors(id) {
  S().addDoors(id);
  return id;
}

/** The finished job, as `loadProject` takes it back. */
function snapshot() {
  return JSON.parse(JSON.stringify({ project: S().project, units: S().units }));
}

/**
 * Saved and opened again, as the app does it: the file is what the store
 * holds AFTER `loadProject` (the shelf stamp and every migration applied), so
 * loading the fixture gives back the fixture, byte for byte.
 */
function savedAndReopened() {
  const saved = snapshot();
  S().loadProject(saved.project, saved.units);
  return snapshot();
}

/**
 * A new job, its room, and its shaker frame STATED, the way Settings writes it
 * (`setDesign({ fronts: { ...design.fronts, shakerFrame } })`). Left unstated,
 * `loadProject` reads a job with units and Shaker fronts as one cut before
 * T34 and pins the legacy 70 on the way back in (`legacyShakerFrame`); the
 * fixture would then not be the job it was built as.
 */
function begin(name, { wardrobe = false } = {}) {
  S().newProject(name, { number: '075/2026', client: 'T75 proof' });
  if (wardrobe) {
    S().setDesign({ scope: 'room' });
    S().setDesign({ projectType: 'wardrobe' });
    S().setProjectHeights(heightsForProjectType('wardrobe', getCabinetProfile()));
    const tall = wardrobeSeed(getCabinetProfile());
    S().setProjectHeights({ tall: tall.height, toeKick: tall.plinth });
  }
  const { design } = S().project;
  S().setDesign({ fronts: { ...design.fronts, shakerFrame: shakerFrameMm(design, getCabinetProfile()) } });
  must(S().setRoom({ corners: rectCorners(5000, 4000), height: 2500 }), 'setRoom');
}

function cornerSolutions() {
  return cornersOf({ units: S().units, walls: roomWalls(S().project.room), profile: getCabinetProfile() })
    .map((c) => `${c.wallA}/${c.wallB}:${c.solution}`);
}

// ═══ 1. THE CORNER KITCHEN (PART A) ═══════════════════════════════════════
//
// A 5000 x 4000 room, 2500 high. Three of its four corners turned three ways:
//   wall 3 / wall 0  CORNER_L_BASE (F4), a base unit on each side of it, its
//                    own L-shaped slab;
//   wall 0 / wall 1  a base run into the corner and a second run on wall 1
//                    landing on the stop: the CORNER POST (F2); the wall
//                    units above turn the same corner with a post of their own;
//   wall 1 / wall 2  BLIND_BASE (F3), the run on wall 2 landing on its stop.
// One worktop over the two runs that turn the post corner: two slabs and ONE
// butt joint (F5), the SINK under slab A proposing its cut-out, an upstand
// on wall 0's run; a second worktop turns the blind corner, the L carries its
// own L slab, the run beside the L a straight one. A 1050 gap on wall 0 is
// the freestanding range.
export function buildCornerKitchen() {
  reseed(7501);
  begin('T75 corner kitchen');

  // wall 3 / wall 0: the true L, then its neighbours on both walls.
  const l = doors(add('CORNER_L_BASE', {}, 'the L into the first free corner'));
  if (U(l).position.wall !== 0 || U(l).params.corner_side !== 'left') {
    throw new Error(`the L stood at wall ${U(l).position.wall}, ${U(l).params.corner_side}: expected wall 0, left`);
  }
  const n0 = doors(add('BUD', { near: l, side: 'R' }, 'wall 0, beside the L'));
  const dr0 = add('BUDR', { near: n0, side: 'R' }, 'wall 0, drawers beside it');
  const w3 = doors(add('BUD', {}, 'wall 3, on the L arm B end'));
  toWall(w3, 3, 4000, 'wall 3 unit to the L');

  // wall 0 / wall 1: the post corner.
  const a = doors(add('BUD', {}, 'wall 0, into the corner'));
  must(S().moveUnit(a, 5000, 0), 'moveUnit wall 0 corner unit');
  const sink = doors(add('SINK', { near: a, side: 'L' }, 'wall 0, the sink'));
  const dw = add('DW_PANEL', { near: sink, side: 'L' }, 'wall 0, the dishwasher');
  const b = doors(add('BUD', {}, 'wall 1, onto the stop'));
  toWall(b, 1, 0, 'wall 1 unit onto the post stop');
  const b2 = add('BUDR', { near: b, side: 'R' }, 'wall 1, drawers');
  const b3 = doors(add('BUD', { near: b2, side: 'R' }, 'wall 1, cupboard'));

  // wall 1 / wall 2: the blind corner, wall 1's run closed up to it.
  const bl = doors(add('BLIND_BASE', {}, 'the blind base'));
  toWall(bl, 1, 4000, 'blind base into the wall 1 / wall 2 corner');
  // AMENDED BY T78 F10: the run on wall 1 stands on the post stop, which is the
  // owner's 40 now (it was 50), so the filler closes whatever is left to the blind.
  const fillerW = U(bl).position.x_mm - (U(b3).position.x_mm + U(b3).params.width);
  const b4 = doors(add('BUD', { near: b3, side: 'R', params: { width: fillerW } }, 'wall 1, the filler cupboard'));
  if (U(b4).position.x_mm + U(b4).params.width !== U(bl).position.x_mm) {
    throw new Error(`wall 1 is not closed: ${U(b4).position.x_mm} + ${U(b4).params.width} against the blind at ${U(bl).position.x_mm}`);
  }
  const c = doors(add('BUD', {}, 'wall 2, onto the blind stop'));
  toWall(c, 2, 0, 'wall 2 unit onto the blind stop');
  const c2 = add('BUDR', { near: c, side: 'R' }, 'wall 2, drawers');

  // The wall units turn the post corner too.
  const wa = doors(add('WUD', {}, 'wall unit, wall 0 corner'));
  must(S().moveUnit(wa, 5000, 0), 'moveUnit wall unit into the corner');
  doors(add('WUD', { near: wa, side: 'L' }, 'wall unit, wall 0'));
  const wb = doors(add('WUD', {}, 'wall unit, wall 1 corner'));
  toWall(wb, 1, 0, 'wall unit onto the wall 1 stop');
  doors(add('WUD', { near: wb, side: 'R' }, 'wall unit, wall 1'));

  // F5: one worktop over the two runs that turn the post corner (two slabs,
  // one butt joint), a second over the blind corner (one record turns one
  // corner, so wall 1 is jointed between its cupboards), the L's own slab,
  // and the straight run between the L and the range.
  must(S().addWorktop([dw, sink, a, b, b2, b3]), 'worktop over the post corner');
  must(S().addWorktop([b4, bl, c, c2]), 'worktop over the blind corner');
  must(S().addWorktop([l]), 'the L\'s own slab');
  must(S().addWorktop([n0, dr0]), 'worktop beside the L');
  if (!S().addUpstand(a)) throw new Error('addUpstand: no upstand on wall 0\'s run');

  return { posts: { base: b, wall: wb }, blind: bl, l, sink, upstand: a };
}

// ═══ 2. THE ISLAND (PART B) ═══════════════════════════════════════════════
//
// A 5000 x 4000 kitchen with the profile's 1800 x 900 island in the middle:
// face A carries a sink run (BUD, SINK, BUD), face B a drawer run back to
// back with it, end E1 an END UNIT turned to face out; end E2 is left empty,
// so the automat closes it with its end panel. ONE worktop over the whole,
// with the seating overhang on E2. A short wall run on wall 0, wall units
// above it.
export function buildIsland() {
  reseed(7502);
  begin('T75 island kitchen');
  const island = must(S().addIsland(), 'addIsland').id;
  const faces = roomWalls(S().project.room).filter((w) => w.island === island);
  const face = (f) => faces.find((w) => w.face === f).index;

  // Face A: BUD, SINK, BUD, from the face's left end.
  const a1 = doors(add('BUD', { wall: face('A') }, 'face A, first'));
  must(S().moveUnit(a1, 0, 0), 'face A to its left end');
  const sink = doors(add('SINK', { near: a1, side: 'R' }, 'face A, the sink'));
  const a3 = doors(add('BUD', { near: sink, side: 'R' }, 'face A, last'));
  // Face B: drawers back to back.
  const b1 = add('BUDR', { wall: face('B') }, 'face B, drawers');
  must(S().moveUnit(b1, 0, 0), 'face B to its left end');
  const b2 = doors(add('BUD', { near: b1, side: 'R' }, 'face B, cupboard'));
  const b3 = add('BUDR', { near: b2, side: 'R' }, 'face B, drawers');
  // End E1: an end unit turned to face out.
  const e1 = add('BUDR', { wall: face('E1') }, 'end E1, the end unit');
  // ONE worktop over the island, the seating overhang on the empty end.
  const wt = must(S().addWorktop([a1, sink, a3, b1, b2, b3, e1]), 'the island worktop').id;
  must(S().seatingOverhang(wt, 'E2'), 'seating overhang on E2');

  // A short run on wall 0, wall units above it.
  const w1 = doors(add('BUD', {}, 'wall 0, base'));
  must(S().moveUnit(w1, 1500, 0), 'wall 0 base along the wall');
  const w2 = add('BUDR', { near: w1, side: 'R' }, 'wall 0, drawers');
  const w3 = doors(add('BUD', { near: w2, side: 'R' }, 'wall 0, base'));
  must(S().addWorktop([w1, w2, w3]), 'the wall run worktop');
  const h1 = doors(add('WUD', {}, 'wall 0, wall unit'));
  must(S().moveUnit(h1, 1500, 0), 'wall unit over the run');
  doors(add('WUD', { near: h1, side: 'R' }, 'wall 0, wall unit'));
  doors(add('WUD', { near: S().units.at(-1).id, side: 'R' }, 'wall 0, wall unit'));

  return { island, sink, e1, worktop: wt };
}

// ═══ 3. THE WARDROBE CORNER (PART A, the wardrobe family) ═════════════════
//
// A wardrobe job (`design.projectType: 'wardrobe'`) in a 5000 x 4000 room,
// 2500 high:
//   wall 0 / wall 1  two WARDROBEs meeting in the corner: the CORNER POST;
//   wall 1 / wall 2  a BLIND_WARDROBE, the wardrobe on wall 2 on its stop;
//   wall 3 / wall 0  a CORNER_L_WARDROBE, a wardrobe on each side of it;
//   wall 3 at wall 2 a WARDROBE with a CUT CORNER, 200 x 200 BL, full height,
//                    for the pipe in the room corner behind it (F7).
// The job is made the way the new-project flow makes a wardrobe job: the
// type through `setDesign`, its heights through `setProjectHeights`, the
// wardrobe seed after them (NewProjectFlow.jsx `commitType`).
export function buildWardrobeCorner() {
  reseed(7503);
  begin('T75 wardrobe corner', { wardrobe: true });

  const l = doors(add('CORNER_L_WARDROBE', {}, 'the L into the first free corner'));
  if (U(l).position.wall !== 0 || U(l).params.corner_side !== 'left') {
    throw new Error(`the wardrobe L stood at wall ${U(l).position.wall}, ${U(l).params.corner_side}: expected wall 0, left`);
  }
  doors(add('WARDROBE', { near: l, side: 'R' }, 'wall 0, beside the L'));
  const w3 = doors(add('WARDROBE', {}, 'wall 3, on the L arm B end'));
  toWall(w3, 3, 4000, 'wall 3 wardrobe to the L');
  const a = doors(add('WARDROBE', {}, 'wall 0, into the corner'));
  must(S().moveUnit(a, 5000, 0), 'moveUnit wall 0 wardrobe into the corner');
  const b = doors(add('WARDROBE', {}, 'wall 1, onto the post stop'));
  toWall(b, 1, 0, 'wall 1 wardrobe onto the post stop');
  const bl = doors(add('BLIND_WARDROBE', {}, 'the blind wardrobe'));
  toWall(bl, 1, 4000, 'blind wardrobe into the wall 1 / wall 2 corner');
  const c = doors(add('WARDROBE', {}, 'wall 2, onto the blind stop'));
  toWall(c, 2, 0, 'wall 2 wardrobe onto the blind stop');
  const n = doors(add('WARDROBE', {}, 'wall 3, the notched one'));
  toWall(n, 3, 0, 'wall 3 wardrobe to the room corner');
  must(S().setUnitNotch(n, { corner: 'BL', w: 200, d: 200, h: 0 }), 'CUT CORNER 200 x 200 BL full');

  return { l, post: b, blind: bl, notched: n };
}

export const FIXTURES = [
  ['fixtures/t75-corner-kitchen.json', buildCornerKitchen],
  ['fixtures/t75-island.json', buildIsland],
  ['fixtures/t75-wardrobe-corner.json', buildWardrobeCorner],
];

function report(file) {
  const lines = S().units.map((u) => `  ${String(u.params.unit_num).padEnd(5)} ${u.type.padEnd(18)} wall ${u.position.wall} x ${u.position.x_mm} w ${u.params.width}`);
  const red = S().runChecks().filter((f) => f.level === 'red');
  return [
    `${file}: ${S().units.length} units, corners ${cornerSolutions().join(' ') || 'none'}, slabs ${S().worktopsOf().length}, red ${red.length}`,
    ...lines,
    ...red.map((f) => `  RED #${f.check}: ${f.message}`),
  ].join('\n');
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  const check = process.argv.includes('--check');
  let moved = 0;
  for (const [file, build] of FIXTURES) {
    build();
    const text = `${JSON.stringify(savedAndReopened(), null, 2)}\n`;
    if (/[\u2013\u2014]/.test(text)) throw new Error(`${file}: an em or en dash reached the fixture`);
    if (check) {
      let had = null;
      try { had = readFileSync(`${ROOT}${file}`, 'utf8'); } catch { had = null; }
      if (had !== text) { moved += 1; console.log(`${file}: MOVED`); } else console.log(`${file}: same`);
    } else {
      writeFileSync(`${ROOT}${file}`, text);
      console.log(report(file));
    }
  }
  if (check && moved) process.exit(1);
}
