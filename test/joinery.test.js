// ─── Seeing the joint (turn 8, CLAUDE.md F8) ───
//
// The joint IS the identity of the system: WoodExpert shows its confirmats, and
// a Skylon carcass that shows nothing is six boxes meeting at invisible lines.
//
// CLAUDE.md names the test in as many words: "liczba rysowanych tabów == dane
// cnc dla fixtures". That is the whole contract and it is the right one — the
// drawing is a READING of the cutting data, not a second drawing of the same
// idea, so if the two ever disagree the picture is lying about the furniture.
//
// The other half is the one that makes a future system free: nothing here knows
// what a tab is. The layer names come through the joint system's own
// `geometryKey`, so a second system arrives as a block of numbers and a
// geometry module rather than as a rewrite of everything that draws.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  jointLines, joineryLayers, panelPlacement, socketCount, tabCount, unitJointLines,
} from '../src/engine/joinery.js';

const layers = joineryLayers(P);

const fixtures = readdirSync(new URL('../fixtures/', import.meta.url))
  .filter((f) => f.startsWith('golden-') && f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(`../fixtures/${f}`, import.meta.url), 'utf8')));

const casesFromFixtures = fixtures.flatMap((j) => (j.cases || []).map((c) => c.inputs)).filter(Boolean);

// ─── the layer names come from the SYSTEM, not from a constant ──────────────

test('the layers are read through the joint system’s own geometry key', () => {
  assert.equal(layers, P.puzzle.layers, 'today there is one system, and it is the puzzle');
  assert.equal(joineryLayers(P, 'dogbone'), P.puzzle.layers);
  // A system this install has never heard of falls back rather than drawing
  // nothing — the same rule a removed decor gets.
  assert.equal(joineryLayers(P, 'cabineo'), P.puzzle.layers);
  assert.equal(joineryLayers({}), null, 'and a profile with no joint at all draws none');
});

test('a second system would need a block of numbers and nothing else', () => {
  // The indirection, exercised: point a system at a different geometry key and
  // the drawing follows it, with no branch anywhere in this module.
  const withCabineo = {
    ...P,
    cabineo: { layers: { outline: 'OUTLINE', socket: 'CAB_SOCKET', dogbone: 'CAB_RELIEF', screw: 'CAB_SCREW' } },
    joinery: {
      types: [...P.joinery.types, { id: 'cabineo', label: 'Cabineo', geometryKey: 'cabineo' }],
      defaultType: 'dogbone',
    },
  };
  assert.equal(joineryLayers(withCabineo, 'cabineo').socket, 'CAB_SOCKET');
});

// ─── the count is the contract ──────────────────────────────────────────────

test('every tab in the cutting data is a tab in the picture — on every fixture', () => {
  assert.ok(casesFromFixtures.length >= 8, 'the fixtures moved');
  for (const inputs of casesFromFixtures) {
    const r = computeCabinet(inputs, P);
    for (const panel of r.panels) {
      const tabs = tabCount(panel, layers);
      const sockets = socketCount(panel, layers);
      const drawn = jointLines(panel, layers, { xray: true });
      if (!panelPlacement(panel)) {
        assert.equal(drawn.length, 0, `${inputs.unit_num} ${panel.id}: drew a joint on a part that has none`);
        continue;
      }
      assert.equal(
        drawn.filter((l) => l.kind === 'dogbone').length,
        tabs,
        `${inputs.unit_num} ${panel.id}: ${drawn.filter((l) => l.kind === 'dogbone').length} tabs drawn, ${tabs} cut`,
      );
      assert.equal(
        drawn.filter((l) => l.kind === 'socket').length,
        sockets,
        `${inputs.unit_num} ${panel.id}: sockets drawn ≠ sockets cut`,
      );
    }
  }
});

test('SOLID draws the division lines, two per socket, and nothing else', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const side = r.panels.find((p) => p.id === 'BUL');
  const solid = jointLines(side, layers, { xray: false });
  assert.equal(solid.length, socketCount(side, layers) * 2, 'one break at each shoulder of each tab');
  assert.ok(solid.every((l) => l.kind === 'tab'));
  assert.ok(solid.every((l) => l.points.length === 2), 'a division line is a line');
  // Discreet: nothing but those.
  assert.equal(solid.filter((l) => l.kind === 'dogbone' || l.kind === 'outline').length, 0);
});

test('X-RAY draws the profile as well — which is the shape the system is named for', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const side = r.panels.find((p) => p.id === 'BUL');
  const xray = jointLines(side, layers, { xray: true });
  const outline = xray.find((l) => l.kind === 'outline');
  assert.ok(outline, 'no outline — the tab profiles would be invisible');
  // A plain rectangle is 4 points; a side panel with three tabs on its back
  // edge is 4 + 3 × 10, and the closing point makes it one more.
  assert.equal(outline.points.length, side.cnc.outline.length + 1);
  assert.ok(xray.some((l) => l.kind === 'dogbone'));
  assert.ok(xray.some((l) => l.kind === 'socket'));
});

// ─── the mapping onto the cabinet ───────────────────────────────────────────

test('the two sides are mirrored, and the DRILLING is what proves it', () => {
  // A hinge hole is cut at `xFromFrontEdge` on whichever side is hung. If the
  // two CNC frames were mapped the same way round, one of them would land 37 mm
  // from the BACK — which is where nothing goes.
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const D = 558;
  const G = P.board.thickness;
  const front = P.hinges.xFromFrontEdge;

  const bul = panelPlacement(r.panels.find((p) => p.id === 'BUL'));
  const bur = panelPlacement(r.panels.find((p) => p.id === 'BUR'));
  const zOf = (pl, x) => pl.origin[2] + pl.u[2] * x;
  const sideW = D - G;

  assert.equal(zOf(bul, front), D - front, 'BUL: 37 from the front');
  assert.equal(zOf(bur, sideW - front), D - front, 'BUR: the same 37, from the other end of its own drawing');
  // …and the back edges of both land at the back of the carcass.
  assert.equal(zOf(bul, sideW), G);
  assert.equal(zOf(bur, 0), G);
});

test('a side’s tabs are drawn where the BACK panel is, not floating in the room', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const side = r.panels.find((p) => p.id === 'BUL');
  const dogbones = jointLines(side, layers, { xray: true }).filter((l) => l.kind === 'dogbone');
  const G = P.board.thickness;
  for (const line of dogbones) {
    for (const [, , z] of line.points) {
      // The relief pockets sit in the board thickness behind the side panel —
      // which is exactly where the back panel is.
      assert.ok(z >= -1e-6 && z <= G + 1e-6, `a dog bone at z=${z} is not on the back edge`);
    }
  }
});

test('the top and bottom draw their tabs along the cabinet’s own depth', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const top = r.panels.find((p) => p.id === 'TOP');
  const drawn = jointLines(top, layers, { xray: true });
  assert.equal(drawn.filter((l) => l.kind === 'dogbone').length, tabCount(top, layers));
  const ys = drawn.flatMap((l) => l.points.map((p) => p[1]));
  assert.ok(ys.every((y) => Math.abs(y - (770 - 0)) < 1 || Math.abs(y - 770) < 1),
    'the top panel’s joint is drawn at the top of the cabinet');
});

// ─── what it must not touch ─────────────────────────────────────────────────

test('a shelf, a front and a drawer box have no joint to draw', () => {
  const r = computeCabinet({
    type: 'WARDROBE', width: 1200, height: 2150, depth: 578, unit_num: 'W01',
    shelves: 2, drawers: 2, rail: true, doors: { count: 2 },
  }, P);
  for (const panel of r.panels) {
    if (['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'].includes(panel.part)) continue;
    assert.equal(jointLines(panel, layers, { xray: true }).length, 0, `${panel.id} grew a joint`);
  }
});

test('the whole unit answers in one call, and only for the parts that have one', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const all = unitJointLines(r, layers, { xray: true });
  assert.deepEqual(all.map((e) => e.panel).sort(), ['BACK', 'BOTTOM', 'BUL', 'BUR', 'TOP']);
  assert.ok(all.every((e) => e.lines.length > 0));
  // Nothing at all when the profile carries no joint system.
  assert.deepEqual(unitJointLines(r, null, {}), []);
});

test('the lines stand OFF the board, or they would fight it for every pixel', () => {
  const r = computeCabinet({
    type: 'BUD', width: 600, height: 770, depth: 558, unit_num: '01', doors: { count: 1, hinge: 'L' },
  }, P);
  const side = r.panels.find((p) => p.id === 'BUL');
  const flat = jointLines(side, layers, { xray: true, lift: 0 });
  const lifted = jointLines(side, layers, { xray: true, lift: 5 });
  // BUL's outward face is −X, so lifting moves the lines to negative x.
  assert.equal(flat[0].points[0][0], 0);
  assert.equal(lifted[0].points[0][0], -5);
  assert.ok(P.appearance.joinery.lift > 0, 'and the profile ships a lift, not a zero');
});
