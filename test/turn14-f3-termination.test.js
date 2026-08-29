// ─── Turn 14, F3: the top infill ENDS at what is in the way ─────────────────
//
// #55 was parked at turn 8 and is now live, and the owner has added a second
// case out of using the app:
//
//   1. a wall-unit run's top infill stops AT an end panel that runs to the
//      ceiling — a TALL cabinet's panel. The tall cabinet is not in the run and
//      never can be: it stands on the floor and the run hangs at 1500, so they
//      are two different runs on the same wall.
//   2. a tall unit's top infill ends ON a side infill instead of cutting
//      through it.
//
// CLAUDE.md asks for ONE rule covering both, in the run logic the top infill
// already owns. They are the same sentence — "between this run and the wall, is
// there anything standing all the way up?" — and turn 8 could only ask it of
// the run's OWN end unit, which is exactly why neither case worked: in both of
// them the thing in the way belongs to somebody else.

import test from 'node:test';
import assert from 'node:assert/strict';

import { useProjectStore, paramsForEngine } from '../src/stores/projectStore.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  buildRuns, ceilingVerticals, paddedSpan, runEnd, unitTop,
} from '../src/engine/runs.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const WALL = 5000;
const CEILING = 2500;

function project(infillWidth = 20) {
  store().loadProject({
    id: null,
    name: 'f3',
    room: migrateRoom({ height: CEILING, corners: rectCorners(WALL, 3000) }),
    design: { infill: { sideWidth: infillWidth } },
  }, []);
}

const unitOf = (id) => store().units.find((u) => u.id === id);
const resultOf = (id) => computeCabinet(paramsForEngine(unitOf(id)), P);
const panelOf = (id, panelId) => resultOf(id).panels.find((p) => p.id === panelId);
const endsOf = (id) => panelOf(id, 'INFILL-T-FACE')?.meta?.ends;
/** Where the run's element starts and finishes, in WALL millimetres. */
// T48-F2: the SPAN a run covers is the piece that stands in the room — the
// BOX. `face.w` is the blank, and the blank now leaves the machine 20 mm long
// for the site cut (*"plus 20 mm dluzsze na odciecie, z jednej strony"*), which
// is an allowance and not a length the run reaches to.
const spanOf = (id) => {
  const face = panelOf(id, 'INFILL-T-FACE');
  const x = unitOf(id).position.x_mm;
  return { from: face.box.x + x, to: face.box.x + face.box.w + x };
};

const place = (type, x) => {
  const { id, error } = store().addUnit(type);
  assert.equal(error, null, error || '');
  store().moveUnit(id, x, 0);
  return id;
};

// ─── F3.1 — a wall-unit run stops at a tall cabinet's ceiling-height panel ───

test('F3.1 — a WUD run wraps past a tall unit’s end panel until the panel goes up', () => {
  project();
  // A tall cabinet at 1000 with a masking panel on its right, and a run of two
  // wall units butted against the OUTSIDE of that panel — which is the order a
  // joiner builds them in, and the only order that does not put the wall units
  // inside the panel.
  const tall = place('BUDTALL', 1000);
  const { id: ep } = store().addEndPanel(tall, { side: 'R' });
  const edge = paddedSpan(unitOf(tall)).right;
  const a = place('WUD', edge);
  const b = place('WUD', edge + unitOf(a).params.width);
  store().addTopInfill(a);

  // The wall units HANG and the tall one STANDS, so they are two different runs
  // even though turn 8 lines their tops up to the millimetre — `buildRuns` keys
  // on the mounting level, not only on the height. That is precisely why the
  // run logic could never see the panel from inside the wall-unit run.
  assert.equal(unitTop(unitOf(a), P), unitTop(unitOf(tall), P), 'the tops line up…');
  assert.equal(buildRuns(store().units, P).length, 2, '…and they are still two runs');

  // A panel that stops at the tall cabinet's own top is not in the way of
  // something hanging above it: nothing changes, exactly as turn 8 behaved.
  assert.equal(endsOf(a).left, 'open', 'a carcass-height panel blocks nothing');
  assert.equal(
    resultOf(a).panels.filter((p) => p.meta?.segment === 'return-left').length, 2,
    'and the element turns the corner and runs back to the wall, over the panel',
  );

  store().endPanelToCeiling(tall, ep);
  assert.equal(endsOf(a).left, 'end-panel', 'now it runs all the way up, and the run meets it');
  assert.equal(
    Math.round(spanOf(a).from),
    Math.round(edge),
    'it butts into the panel’s NEAR face — no wrapping past it',
  );
  // …and an end that has something to finish against does not turn a corner.
  assert.equal(
    resultOf(a).panels.filter((p) => p.meta?.segment === 'return-left').length, 0,
  );
  assert.ok(b, 'the second wall unit is in the run');
});

test('F3.1 — and the run is still one piece over both wall units', () => {
  project();
  const tall = place('BUDTALL', 1000);
  const { id: ep } = store().addEndPanel(tall, { side: 'R' });
  store().endPanelToCeiling(tall, ep);
  const edge = paddedSpan(unitOf(tall)).right;
  const a = place('WUD', edge);
  const b = place('WUD', edge + 600);
  store().addTopInfill(a);

  const span = spanOf(a);
  assert.equal(Math.round(span.from), Math.round(edge), 'it starts at the panel');
  assert.equal(Math.round(span.to - span.from), unitOf(a).params.width + unitOf(b).params.width,
    'one length across the run, stopping at the panel');
  assert.equal(panelOf(b, 'INFILL-T-FACE'), undefined, 'the member cuts nothing of its own');
});

// ─── F3.2 — a tall unit's top infill ends ON a side infill ──────────────────

test('F3.2 — a scribe filler UNDER the run is covered; one taken to the ceiling is not', () => {
  project(40);
  // A tall unit parked at its stop against the left wall: the 40 mm gap beside
  // it becomes a scribe filler.
  const tall = place('BUDTALL', -5000);
  store().addTopInfill(tall);
  assert.equal(unitOf(tall).params.side_infill_left_mm, 40, 'the filler is there');

  // T55 AMENDED (29.08.2026, the owner): the vertical owns the gap and runs
  // to the ceiling — the top piece stops PLUMB on the carcass face either
  // way. Turn 6's "runs OVER, out to the wall" is retired.
  assert.equal(endsOf(tall).left, 'infill');
  assert.equal(Math.round(spanOf(tall).from), Math.round(unitOf(tall).position.x_mm),
    'on the carcass face — never over the scribe (T55)');

  // …and taken to the ceiling it is a piece the top infill must END on.
  store().sideInfillToCeiling(tall, 'L');
  assert.equal(endsOf(tall).left, 'infill');
  assert.equal(
    Math.round(spanOf(tall).from),
    Math.round(unitOf(tall).position.x_mm),
    'it stops at the filler’s inner face instead of cutting through it',
  );
});

test('F3.2 — the filler that reaches the ceiling is the one that blocks', () => {
  project(40);
  const tall = place('BUDTALL', -5000);
  store().addTopInfill(tall);
  const u = unitOf(tall);
  const verticals = ceilingVerticals(store().units, { roomHeight: CEILING }, P);
  assert.deepEqual(verticals, [], 'a filler that stops at the carcass top is not a blocker');

  store().sideInfillToCeiling(tall, 'L');
  const now = ceilingVerticals(store().units, { roomHeight: CEILING }, P);
  assert.equal(now.length, 1);
  assert.equal(now[0].kind, 'infill');
  assert.equal(now[0].unitId, tall);
  assert.equal(Math.round(now[0].to), Math.round(u.position.x_mm));
  assert.ok(now[0].top >= CEILING - P.autoParts.topInfill.runGap);
});

// ─── one rule, asked directly ───

test('F3 — ONE termination rule: the nearest ceiling-height vertical, whoever owns it', () => {
  project();
  const only = {
    wall: 0,
    units: [{
      id: 'solo', type: 'BUDTALL', position: { wall: 0, x_mm: 1000, rotation_deg: 0 }, params: { width: 600, height: 2000 },
    }],
    top: 2000,
    left: 1000,
    right: 1600,
  };
  const ask = (side, verticals) => runEnd(only, side, { wallWidth: WALL, roomHeight: CEILING, verticals }, P);

  assert.equal(ask('left', []).kind, 'open');
  // Somebody else's ceiling-height panel, 400 mm to the left.
  const other = [{
    wall: 0, from: 580, to: 600, top: CEILING, kind: 'end-panel', unitId: 'tall',
  }];
  assert.equal(ask('left', other).kind, 'end-panel');
  assert.equal(ask('left', other).x, 600, 'the NEAR face — the one the eye sees');
  assert.equal(ask('left', other).blockedBy, 'tall');
  // …and it is not in the way of the OTHER end.
  assert.equal(ask('right', other).kind, 'open');
  // A vertical on another wall is nobody's business.
  assert.equal(ask('left', [{ ...other[0], wall: 2 }]).kind, 'open');
});

test('F3 — the wall still wins: a run parked at the wall finishes ON it', () => {
  project(0);
  const a = place('BUDTALL', -5000);
  store().addTopInfill(a);
  assert.equal(endsOf(a).left, 'wall');
});

test('F3 — turned cabinets contribute no vertical: they have no span along the wall', () => {
  project();
  const tall = place('BUDTALL', 1000);
  const { id: ep } = store().addEndPanel(tall, { side: 'R' });
  store().endPanelToCeiling(tall, ep);
  assert.equal(ceilingVerticals(store().units, { roomHeight: CEILING }, P).length, 1);
  store().rotateUnit(tall, 'side', 90);
  assert.deepEqual(ceilingVerticals(store().units, { roomHeight: CEILING }, P), []);
});
