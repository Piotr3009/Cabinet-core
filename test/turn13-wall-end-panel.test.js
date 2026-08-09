// ─── A wall unit's end panel ends with the CABINET (turn 13, F4) ────────────
//
// The owner's bug, off a real job: a WUD end panel ran to the FLOOR. A masking
// panel hanging in mid-air the whole way down a bare wall under a cabinet that
// stops at 2100 — and it went into the cut list at that height, so a workshop
// would have cut it.
//
// The verdict: it ends flush with the hanging cabinet's bottom.
//
// THE SHAPE OF THE FIX. Not a special case at the panel-building site, but a
// per-unit-CLASS default in the profile and one function that reads it —
// because "to the floor" is the right answer for something standing on the
// floor and a meaningless one for something screwed to a wall, and that is a
// property of the class.
//
// AND THE SLOT LEFT OPEN. CLAUDE.md names exactly one future exception: the
// door/panel EXTENSION below a wall unit, parked as BACKLOG #45. So the value
// is a NAME and not a boolean, and 'extended' already drops when it is asked
// to — nothing about the stored shape has to change when the feature lands.
//
// FIXTURES: diff 0. An end panel is a DESIGN-layer input (`params.end_panels`)
// and no golden fixture has one, so nothing the AutoLISP cuts moves. What DOES
// move is the BOM height of a wall unit's end panel, and that is the fix.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { endPanelDrop, endPanelHeightDefault, END_PANEL_HEIGHTS } from '../src/engine/autoparts.js';
import { buildBom } from '../src/engine/bom.js';
import { defaultParamsFor, getUnitType, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const withPanel = (typeId, ep = {}) => computeCabinet({
  ...defaultParamsFor(typeId, P),
  end_panels: [{ id: 'ep1', side: 'R', ...ep }],
}, P);

const panelOf = (result) => result.panels.find((p) => p.part === 'END-PANEL');

// ─── the numbers live in the profile (rule 2) ───────────────────────────────

test('the per-class default is a profile table, not a branch in the engine', () => {
  const EP = P.autoParts.endPanel;
  assert.deepEqual(EP.defaultHeightByMount, { wall: 'carcass', floor: 'floor' });
  assert.equal(endPanelHeightDefault(getUnitType('WUD'), P), 'carcass');
  assert.equal(endPanelHeightDefault(getUnitType('BUD'), P), 'floor');
});

test('the slot is named, and it has room for the parked extension (#45)', () => {
  assert.ok(END_PANEL_HEIGHTS.includes('carcass'));
  assert.ok(END_PANEL_HEIGHTS.includes('extended'), 'BACKLOG #45 opts back in by name');
  assert.ok(END_PANEL_HEIGHTS.includes('floor'));
  // 'unit' is what turn 6 called it. A stored project must still read.
  assert.ok(END_PANEL_HEIGHTS.includes('unit'));
});

// ─── THE FIX ────────────────────────────────────────────────────────────────

test('THE FIX: a WUD end panel is exactly as tall as its carcass', () => {
  const params = defaultParamsFor('WUD', P);
  const result = withPanel('WUD');
  const ep = panelOf(result);
  assert.equal(ep.box.y, 0, 'it starts at the bottom of the carcass');
  assert.equal(ep.h, params.height, 'and it is the carcass height, full stop');
});

test('…even when the stored value says "floor", because that was never a decision', () => {
  // Every wall unit in every project made before turn 13 says 'floor': the
  // project default was project-WIDE. Overruled rather than migrated.
  const params = defaultParamsFor('WUD', P);
  assert.equal(panelOf(withPanel('WUD', { height: 'floor' })).h, params.height);
  assert.equal(panelOf(withPanel('WUD', { height: 'unit' })).h, params.height);
  assert.equal(panelOf(withPanel('WUD', { height: 'carcass' })).h, params.height);
});

test('a STANDING unit is untouched — "to the floor" still means the floor', () => {
  const params = defaultParamsFor('BUD', P);
  // A base unit's legs come from the profile, not from the params — so the
  // number is taken where the engine takes it, and a workshop that changes it
  // does not have to remember this test.
  const legs = P.baseUnit.legHeight;
  const ep = panelOf(withPanel('BUD', { height: 'floor' }));
  assert.equal(ep.box.y, -legs, 'past the legs, as it always has');
  assert.equal(ep.h, params.height + legs);
  // …and its "unit height" answer is unchanged too.
  assert.equal(panelOf(withPanel('BUD', { height: 'unit' })).h, params.height);
});

test('the panel still runs ABOVE the unit when it is asked to (turn 8, F3)', () => {
  const params = defaultParamsFor('WUD', P);
  const ep = panelOf(withPanel('WUD', { top_mm: 250 }));
  assert.equal(ep.h, params.height + 250, 'up is a separate question from down');
  assert.equal(ep.box.y, 0);
});

test('THE PARKED SLOT: "extended" drops a wall unit’s panel, and only that value does', () => {
  const params = defaultParamsFor('WUD', P);
  const ep = panelOf(withPanel('WUD', { height: 'extended' }));
  assert.equal(ep.box.y, -params.mount_height);
  assert.equal(ep.h, params.height + params.mount_height,
    'the shape BACKLOG #45 needs already works — it is the default that changed');
});

test('the rule is one function, and it holds for every kit in the library', () => {
  const legs = P.baseUnit.legHeight;
  for (const id of UNIT_TYPE_ORDER) {
    const type = getUnitType(id);
    const params = defaultParamsFor(id, P);
    const drop = endPanelDrop({
      height: null, type, mountHeight: params.mount_height, legHeight: legs, profile: P,
    });
    if (type.mount === 'wall') assert.equal(drop, 0, `${id}: a hanging cabinet's panel must not drop`);
    else assert.equal(drop, legs, `${id}: a standing one drops past its legs`);
  }
});

test('a nonsense height falls back to the class default rather than to zero', () => {
  const type = getUnitType('BUD');
  assert.equal(endPanelDrop({ height: 'sideways', type, legHeight: 100, profile: P }), 100);
  // …and on a wall unit the class default is what stops it, not the fallback.
  assert.equal(
    endPanelDrop({ height: 'sideways', type: getUnitType('WUD'), mountHeight: 1500, profile: P }),
    0,
  );
});

// ─── the BOM, which is the number a workshop cuts ───────────────────────────

test('THE ASSERTION CLAUDE.md ASKS FOR: the BOM height shrinks', () => {
  const params = { ...defaultParamsFor('WUD', P), end_panels: [{ id: 'ep1', side: 'R' }] };
  const result = computeCabinet(params, P);
  const unit = { id: 'u1', type: 'WUD', params };
  const bom = buildBom([{ unit, result }]);
  const row = bom.units[0].rows.find((r) => r.part === 'END-PANEL');

  assert.equal(row.h, params.height, 'the cut list says the carcass height');
  // What it WOULD have said before: carcass + the mounting height.
  const old = params.height + params.mount_height;
  assert.ok(row.h < old, `${row.h} must be less than the old ${old}`);
  assert.equal(old - row.h, params.mount_height, 'exactly the mounting height less — no more, no less');
});

test('the meta says what was CUT, so a label cannot disagree with the piece', () => {
  assert.equal(panelOf(withPanel('WUD', { height: 'floor' })).meta.height, 'carcass');
  assert.equal(panelOf(withPanel('BUD', { height: 'floor' })).meta.height, 'floor');
  assert.equal(panelOf(withPanel('WUD', { height: 'extended' })).meta.height, 'extended');
});

// ─── and nothing the machine cuts has moved ─────────────────────────────────

test('FIXTURES DIFF 0: an end panel is design-layer and no kit emits one', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const bare = computeCabinet(defaultParamsFor(id, P), P);
    assert.equal(bare.panels.some((p) => p.part === 'END-PANEL'), false,
      `${id}: a bare kit call must cut exactly what the AutoLISP cuts`);
  }
});
