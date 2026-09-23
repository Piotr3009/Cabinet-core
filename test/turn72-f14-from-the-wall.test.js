// ─── TURN 72 · F14 — FROM THE WALL, PER WARDROBE ────────────────────────────
//
// The owner, 22.09.2026, fourteenth of fourteen, on the SIZE step:
//
//   *"tutaj jeszcze brakuje odsunięcia od ściany."*
//
// Answered the same day: PER UNIT, with the project's own number as the
// default. CLAUDE.md F14: *"SIZE gets a fourth field FROM THE WALL, in mm,
// default the project's `room.wallBackClearance` (10). It is the unit's own
// `params.wall_gap`; when absent, the profile number, so every saved job opens
// unchanged."*
//
// And the law it lives under (FROZEN 1): *"The one engine change (F14, the
// wall gap per unit) is PLACEMENT, read by `engine/runs.js` and the room,
// never by the cut path."*  `scripts/t72-classify.mjs` puts the key to
// `computeCabinet` itself and hashes the answer; what follows is the same
// sentence asked of each reader by name — runs, panels, plans and sections.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, getCabinetProfile } from '../src/engine/profile.js';
import { runEnd, wallGapOf } from '../src/engine/runs.js';
import { backStandoff, wallClearance } from '../src/engine/collision.js';
import { sideIsVisible } from '../src/engine/endPanelAuto.js';
import { roomFitRefusal } from '../src/engine/roomFit.js';
import { buildPlan, cutHeight } from '../src/engine/drawings/setPlan.js';
import { buildStation, sectionStations } from '../src/engine/drawings/setSection.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { hhEntries, hhWorktops, HH_ROOM } from './fixtures/t71-herbal-hill.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const S = () => useProjectStore.getState();

const src = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

/** A wardrobe standing 40 mm from the left wall, with or without a typed gap. */
const wardrobe = (gap = null, extra = {}) => ({
  id: 'u1',
  type: 'WARDROBE',
  params: {
    width: 1000, height: 2200, depth: 600, front_t: 18, ...(gap == null ? {} : { wall_gap: gap }), ...extra,
  },
  position: { x_mm: 40, wall: 0 },
});

// ─── THE HELPER, AND THE DEFAULT THAT KEEPS EVERY SAVED JOB ─────────────────

test('F14 `wallGapOf` is the unit’s own number, and the project’s until one is typed', () => {
  assert.equal(wallGapOf(wardrobe(), P), 10, 'nothing said: `room.wallBackClearance`');
  assert.equal(wallGapOf(wardrobe(), P), wallClearance(P), '…which is the project’s own number, not a second ten');
  assert.equal(wallGapOf(wardrobe(60), P), 60, 'typed: the unit’s own');
  assert.equal(wallGapOf(wardrobe(0), P), 0, 'zero is a number a client may mean — hard against the plaster');
  // `Number(null)` is 0, so "nobody has said" has to be asked before the
  // number is read or a saved job silently loses its ten (rule 13).
  assert.equal(wallGapOf({ params: { wall_gap: null } }, P), 10);
  assert.equal(wallGapOf({ params: { wall_gap: '' } }, P), 10);
  assert.equal(wallGapOf({ params: { wall_gap: 'x' } }, P), 10);
  assert.equal(wallGapOf({ params: { wall_gap: -5 } }, P), 10, 'a cabinet cannot stand inside the wall');
  assert.equal(wallGapOf(null, P), 10, 'and no unit at all is still the project’s number');
});

test('F14 every saved job opens unchanged: no unit in it carries the key', () => {
  // The default IS the old behaviour, so the proof is that the two answers
  // agree for a unit that has never heard of the field.
  const old = wallClearance(P);
  for (const depth of [350, 500, 600, 700]) {
    assert.equal(wallGapOf(wardrobe(null, { depth }), P), old);
    assert.equal(backStandoff(wardrobe(null, { depth }), P), old, 'the placement read too');
  }
});

// ─── IT REACHES RUNS ────────────────────────────────────────────────────────

test('F14 `wall_gap` reaches RUNS — `runEnd`’s stop at the wall', () => {
  const run = (u) => ({ units: [u], wall: 0, mount: 'floor' });
  const where = { wallWidth: 3000, roomHeight: 2700 };
  // 40 mm from the left wall. At the project's ten that is a gap, not a wall.
  assert.equal(runEnd(run(wardrobe()), 'left', where, P).kind, 'open');
  // Stood 60 mm out, the same 40 mm IS the wall: the scribe the run is parked
  // in is this unit's own, which is the sentence CLAUDE.md F14 names by
  // pointing at `atWall`.
  assert.equal(runEnd(run(wardrobe(60)), 'left', where, P).kind, 'wall');
});

// ─── IT REACHES THE PANELS ──────────────────────────────────────────────────

test('F14 `wall_gap` reaches THE PANELS — a shallower neighbour stood out covers the side', () => {
  const at = { atWall: false };
  const deep = wardrobe(null, { depth: 600 });
  const shallow = { ...wardrobe(null, { depth: 550 }), id: 'u2' };
  // Backs on one line: the shallow one does not reach as far, so the deep
  // one's side shows and a panel is right. This is turn 65's own answer and
  // it is unchanged.
  assert.equal(sideIsVisible(deep, 'R', shallow, at, P).visible, true);
  assert.equal(sideIsVisible(deep, 'R', shallow, at, P).why, 'the neighbour is shallower');
  // The owner's own case: *"the client who wants flush fronts types a bigger
  // gap on the shallower one."*  550 + 60 reaches past 600 + 10, so there is
  // no side left to see and no panel to hang.
  const flush = { ...shallow, params: { ...shallow.params, wall_gap: 60 } };
  assert.equal(sideIsVisible(deep, 'R', flush, at, P).visible, false);
  assert.equal(sideIsVisible(deep, 'R', flush, at, P).why, 'the neighbour covers it');
  // …and the other way round: the deep one stood out now reaches past it.
  const stoodOut = { ...deep, params: { ...deep.params, wall_gap: 70 } };
  assert.equal(sideIsVisible(stoodOut, 'R', flush, at, P).visible, true);
});

// ─── IT REACHES THE PLANS AND THE SECTIONS ──────────────────────────────────

/** Every number in an entity list, in one flat array, in a fixed order. */
function coords(entities) {
  const out = [];
  for (const e of entities) {
    for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'w', 'h', 'r']) {
      if (typeof e[k] === 'number') out.push(e[k]);
    }
    for (const p of e.pts || []) out.push(p[0], p[1]);
  }
  return out;
}

/** Every coordinate that moved between two drawings of the same sheet. */
function shifts(before, after) {
  return after
    .map((v, i) => v - before[i])
    .filter(Number.isFinite)
    .map((d) => Math.round(d * 1000) / 1000)
    .filter((d) => d !== 0);
}

/** The T71 kitchen, with one unit stood further off its wall. */
function hhWith(gap, unitNum = '04') {
  return hhEntries(P).map((e) => (e.unit.params?.unit_num === unitNum
    ? { ...e, unit: { ...e.unit, params: { ...e.unit.params, wall_gap: gap } } }
    : e));
}

test('F14 `wall_gap` reaches THE PLANS — and moves that one unit, by exactly the extra', () => {
  const opts = { which: 'base', room: HH_ROOM, worktops: hhWorktops(P), profile: P, ctx: drawingContext(20, P) };
  const before = coords(buildPlan(hhEntries(P), opts).entities);
  const after = coords(buildPlan(hhWith(60), opts).entities);
  assert.equal(before.length, after.length, 'the same sheet, drawn the same way');
  const moved = shifts(before, after);
  assert.ok(moved.length > 0, 'the unit with the gap moved');
  // 50 is the extra over the project's ten, and 25 is where a chain figure
  // sits: on the middle of a span that moved at one end only. Nothing on the
  // sheet moves by anything else, and nothing else on the sheet moves.
  assert.deepEqual([...new Set(moved.map(Math.abs))].sort((a, b) => a - b), [25, 50]);
  // …and with nothing typed the plan is the plan it was: byte for byte the
  // sheet a job saved before tonight comes out as.
  assert.deepEqual(coords(buildPlan(hhWith(10), opts).entities), before);
});

test('F14 `wall_gap` reaches THE SECTIONS — each member cut at its own gap', () => {
  const ctx = drawingContext(15, P);
  const cut = (list) => {
    const group = wallGroups(list, P)[0];
    const station = sectionStations(group)[0];
    return buildStation(group, station, { room: HH_ROOM, worktops: hhWorktops(P).map((w) => w.geometry || w), profile: P, ctx });
  };
  // The unit's number stands in its carcass at `gap + depth * 0.55`, so where
  // that figure is IS where the knife found the cabinet. The station cuts two
  // members and only one of them was stood out.
  const numberX = (st, num) => st.entities
    .find((e) => e.kind === 'text' && e.layer === 'UNIT_NUMBER' && String(e.text) === num)?.x;
  const before = cut(hhEntries(P));
  const after = cut(hhWith(60));
  assert.equal(Math.round(numberX(after, '04') - numberX(before, '04')), 50, 'the unit stood out moved with its gap');
  assert.equal(numberX(after, '11'), numberX(before, '11'), 'the member beside it did not');
  // The whole station, coordinate by coordinate. A section re-lays its depth
  // chain around the faces that moved, so the figures and their leaders take
  // fractions of the shift; what may NOT happen is anything moving further
  // than the gap itself grew.
  const moved = shifts(coords(before.entities), coords(after.entities));
  assert.ok(moved.length > 0, 'the station was redrawn');
  assert.equal(Math.max(...moved.map(Math.abs)), 50, 'nothing moves further than the extra 50 mm');
  assert.deepEqual(coords(cut(hhWith(10)).entities), coords(before.entities), 'the project’s own number draws the old sheet');
});

// ─── THE ROOM REFUSES FIRST ─────────────────────────────────────────────────

test('F14 the room refuses a gap that will not fit, in the room’s own words', () => {
  const unit = { ...wardrobe(), params: { ...wardrobe().params, unit_num: '01', depth: 600 } };
  // A room 3000 along wall 1 and 700 back from it, given as the corners the
  // app itself holds a room in.
  const room = {
    height: 2700,
    corners: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 700 }, { x: 0, y: 700 }],
  };
  assert.equal(roomFitRefusal({ unit, patch: { wall_gap: 60 }, room, profile: P }), null, '660 into 700 goes');
  const no = roomFitRefusal({ unit, patch: { wall_gap: 160 }, room, profile: P });
  assert.ok(no, '760 into 700 does not');
  assert.equal(no.key, 'wall_gap');
  assert.equal(no.limit, 100, 'and it says what is left');
  assert.match(no.message, /01: the room reaches 700 mm back from wall 1 and this is 600 mm deep/);
  assert.match(no.message, /100 mm is what is left/);
  // The other three branches are untouched: the same patch, the same answers.
  assert.equal(roomFitRefusal({ unit, patch: { depth: 700 }, room, profile: P }), null);
  assert.equal(roomFitRefusal({ unit, patch: { depth: 800 }, room, profile: P })?.key, 'depth');
});

// ─── THE FIELD, AND THE ONE PATH IT WRITES THROUGH ──────────────────────────

test('F14 SIZE carries a fourth field, and it writes through the one setter', () => {
  const options = src('retail/design/Options.jsx');
  const panel = options.slice(options.indexOf('function SizePanel'), options.indexOf('TOMBSTONE: `LayoutPanel`'));
  const code = panel.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  assert.match(panel, /<Field label="FROM THE WALL">/);
  assert.match(panel, /testid="size-wall-gap"/);
  // The SAME setter the other three use — which asks the room first — and no
  // second path: `wall_gap` appears in this panel once, in that call.
  assert.match(panel, /onCommit=\{\(v\) => A\.setUnitSize\(unit\.id, \{ wall_gap: v \}\)\.said\}/);
  assert.equal((code.match(/wall_gap/g) || []).length, 1, 'one path writes it');
  // Four fields, in the owner's order, and no fifth.
  assert.deepEqual(
    [...panel.matchAll(/<Field label="([^"]+)">/g)].map((m) => m[1]),
    ['WIDTH', 'HEIGHT', 'DEPTH', 'FROM THE WALL'],
  );
  // Its ends are the engine's, read through the same bounds call as the rest.
  assert.match(panel, /min=\{b\.wallGap\.min\}/);
  assert.match(panel, /max=\{b\.wallGap\.max\}/);
  assert.match(panel, /standardAt=\{b\.wallGap\.standard\}/);
  // Retail speaks engine through the adapter and nowhere else (T59 F4).
  assert.match(panel, /A\.wallGapOfUnit\(unit\.id\)/);
  assert.doesNotMatch(code, /wallBackClearance/, 'retail never names an engine key');
});

test('F14 one helper, and every reader calls it', () => {
  // CLAUDE.md F14: *"they read the unit's gap instead, through one helper
  // `wallGapOf(unit, profile)` in `runs.js`"*. So it is declared once…
  assert.equal((src('engine/runs.js').match(/export function wallGapOf/g) || []).length, 1);
  // …and the readers the brief names ask it rather than the profile.
  const bare = (file) => src(file).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const file of ['engine/collision.js', 'engine/endPanelAuto.js', 'engine/drawings/setPlan.js', 'engine/drawings/setSection.js']) {
    assert.match(bare(file), /wallGapOf/, `${file} asks the helper`);
  }
  for (const file of ['engine/endPanelAuto.js', 'engine/drawings/setPlan.js', 'engine/drawings/setSection.js']) {
    assert.doesNotMatch(bare(file), /wallBackClearance/, `${file} no longer reads the project number directly`);
  }
  // `collision.js` keeps ONE reading of it, and it is the right one:
  // `wallClearance(profile)` is the PROJECT's own number — the default
  // `wallGapOf` falls to, and what the side margin and the filler boards
  // still stand at. `backStandoff`, the placement read, asks the helper.
  assert.equal((bare('engine/collision.js').match(/wallBackClearance/g) || []).length, 1);
  assert.match(bare('engine/collision.js'), /export function backStandoff\(unit, profile\) \{\n\s*return wallGapOf\(unit, profile\) \+ insetPads\(unit\)\.back;/);
  // THE CUT PATH DOES NOT. `computeCabinet` keeps the project's own number for
  // the end panel's DEPTH, which is a board on a sheet: FROZEN 1 says the one
  // engine change is placement, and `scripts/t72-classify.mjs` hashes the six
  // to prove it.
  //
  // ─── AMENDED BY T73 F8 ────────────────────────────────────────────────
  // The owner, 23.09.2026, on this very feature: *"działa, ale panele i
  // cornice się nie przedłużają, a to źle."*  So the end panel's depth and the
  // cornice return's far end now ask the helper too. With nothing typed it
  // answers the project's own number, and the six goldens are unchanged
  // (`test/turn73-f8-panels-and-cornice-reach-the-wall.test.js`).
  const cab = src('engine/cabinet.js');
  assert.match(cab, /const wallGap = wallGapOf\(\{ params \}, P\);/);
  assert.match(cab, /backZ: -wallGapOf\(\{ params \}, P\),/);
  assert.doesNotMatch(cab, /wall_gap/, 'the cut path names the key itself');
});

// ─── THE STORE: THE FIELD'S END AND THE SETTER'S CLAMP ARE ONE NUMBER ───────

/** One wardrobe in a room 700 mm deep: enough for the carcass and little else. */
function aTightRoom(depth = 600) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 700), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth } });
  return id;
}

test('F14 the store writes the gap, and the room clamps it', () => {
  const id = aTightRoom(600);
  assert.equal(A.wallGapOfUnit(id), 10, 'it is born at the project’s own number');
  A.setUnitSize(id, { wall_gap: 60 });
  assert.equal(A.wallGapOfUnit(id), 60);
  assert.equal(S().units.find((u) => u.id === id).params.wall_gap, 60, 'on the unit, as `params.wall_gap`');
  // The bounds the field's max is read from, and the clamp the setter
  // applies, are the same call on the same numbers: 700 of room less a
  // 600 mm carcass leaves 100.
  const b = S().unitSizeBoundsFor(id);
  assert.equal(b.wallGap.min, 0);
  assert.equal(b.wallGap.max, 100);
  assert.equal(b.wallGap.standard, 10, 'and the project’s own number is the standard');
  // THE ROOM REFUSES FIRST, and it is the room that speaks: `setUnitSize`
  // asks `roomFitRefusalFor` before it writes anything, so a gap that will
  // not fit is not clamped quietly, it is declined in a whole sentence and
  // the wardrobe does not move.
  const no = A.setUnitSize(id, { wall_gap: 400 });
  assert.equal(no.ok, false);
  assert.match(no.said, /the room reaches 700 mm back from wall 1 and this is 600 mm deep/);
  assert.match(no.said, /100 mm is what is left/);
  assert.equal(A.wallGapOfUnit(id), 60, 'and it stays where it was');
  // The store's own clamp is the backstop under that, for the paths that do
  // not ask the room first (PRO's panel, an imported job). It holds the gap
  // at the very number the field's max publishes, and it says so.
  const done = S().updateUnitParams(id, { wall_gap: 400 });
  assert.equal(A.wallGapOfUnit(id), 100, 'held at what the room has left');
  assert.ok(done.notices.some((n) => /From the wall limited to 100 mm/.test(n)), 'nothing is clipped silently');
});

test('F14 a shallower wardrobe may stand further out — the owner’s flush fronts', () => {
  // *"Two units of different depth with the same gap have their backs on one
  // line and their fronts not; the client who wants flush fronts types a
  // bigger gap on the shallower one."*
  const id = aTightRoom(550);
  assert.equal(S().unitSizeBoundsFor(id).wallGap.max, 150, '700 less a 550 carcass');
  A.setUnitSize(id, { wall_gap: 60 });
  const unit = S().units.find((u) => u.id === id);
  // Its FRONT now stands where a 600 deep one at the project's ten does, and
  // the placement read says so.
  assert.equal(backStandoff(unit, getCabinetProfile()) + unit.params.depth, 10 + 600);
});
