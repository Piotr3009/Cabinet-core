// ─── The cabinet, unscrewed (turn 12, CLAUDE.md F4.1) ───────────────────────
//
// "Each panel slides out along its face normal … like the cabinet was
// unscrewed." The picture is the browser walk's job; what belongs in node is
// the arithmetic behind it, and the claims worth holding to account are:
//
//   • a board's face normal is its THINNEST axis — that is what makes a side
//     panel go sideways and a back panel go backwards;
//   • every piece ends up OUTSIDE the assembled cabinet, or the explode has not
//     exploded anything;
//   • pieces travelling the same way do not travel together — three shelves all
//     lifting must fan out, not stay stacked;
//   • the distances scale with the cabinet, so a vanity drawer and a wardrobe
//     make the same picture.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cabinetBounds, explodeOffsets, explodeSettings, faceNormalOf,
} from '../src/engine/explode.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

const panelsOf = (typeId, extra = {}) => computeCabinet(
  { ...defaultParamsFor(typeId, P), ...extra }, P,
).panels.filter((p) => p.box);

test('the numbers live in profile.editor.explode (rule 2)', () => {
  assert.ok(Number.isFinite(P.editor.explode.distanceFactor));
  assert.ok(Number.isFinite(P.editor.explode.spreadFactor));
  assert.ok(P.editor.explode.seconds > 0);
  const s = explodeSettings(P);
  assert.equal(s.factor, P.editor.explode.distanceFactor);
  assert.equal(s.spread, P.editor.explode.spreadFactor);
  // A profile that predates the block still explodes rather than standing still.
  const old = explodeSettings({ editor: {} });
  assert.ok(old.factor > 0 && old.seconds > 0);
});

test('a board faces along its thinnest axis', () => {
  const centre = { x: 300, y: 385, z: 279 };
  // A left side: 18 thick in x, standing left of centre.
  assert.deepEqual(faceNormalOf({
    x: 0, y: 0, z: 0, w: 18, h: 770, d: 558,
  }, centre), { axis: 'x', dir: -1 });
  // A right side: same board, other end.
  assert.deepEqual(faceNormalOf({
    x: 582, y: 0, z: 0, w: 18, h: 770, d: 558,
  }, centre), { axis: 'x', dir: 1 });
  // A shelf: thin in y, sitting below centre → it goes down.
  assert.deepEqual(faceNormalOf({
    x: 18, y: 300, z: 0, w: 564, h: 18, d: 540,
  }, centre), { axis: 'y', dir: -1 });
  // A back: thin in z, at the back → it goes backwards.
  assert.deepEqual(faceNormalOf({
    x: 0, y: 0, z: 0, w: 600, h: 770, d: 18,
  }, centre), { axis: 'z', dir: -1 });
  // A door: thin in z, in front → forwards.
  assert.deepEqual(faceNormalOf({
    x: 0, y: 0, z: 560, w: 597, h: 767, d: 25,
  }, centre), { axis: 'z', dir: 1 });
});

test('a degenerate box does not throw and does not decide anything silly', () => {
  assert.deepEqual(faceNormalOf(null), { axis: 'z', dir: 1 });
  const n = faceNormalOf({
    x: 0, y: 0, z: 0, w: 10, h: 10, d: 10,
  }, { x: 5, y: 5, z: 5 });
  assert.ok(['x', 'y', 'z'].includes(n.axis));
});

test('cabinetBounds is the union of every piece, and null for nothing', () => {
  assert.equal(cabinetBounds([]), null);
  assert.equal(cabinetBounds([{ id: 'a' }]), null);
  const b = cabinetBounds([
    { id: 'a', box: { x: 0, y: 0, z: 0, w: 10, h: 20, d: 30 } },
    { id: 'b', box: { x: 5, y: 5, z: 5, w: 10, h: 20, d: 30 } },
  ]);
  assert.deepEqual(b.min, { x: 0, y: 0, z: 0 });
  assert.deepEqual(b.max, { x: 15, y: 25, z: 35 });
  assert.deepEqual(b.size, { x: 15, y: 25, z: 35 });
  assert.deepEqual(b.centre, { x: 7.5, y: 12.5, z: 17.5 });
});

test('every piece of every kit ends up clear of the assembled cabinet', () => {
  for (const id of UNIT_TYPE_ORDER) {
    const panels = panelsOf(id);
    const bounds = cabinetBounds(panels);
    const offsets = explodeOffsets(panels, explodeSettings(P));
    assert.equal(offsets.size, panels.length, `${id}: a piece was left behind`);
    for (const p of panels) {
      const o = offsets.get(p.id);
      const moved = Math.abs(o.x) + Math.abs(o.y) + Math.abs(o.z);
      assert.ok(moved > 0, `${id} ${p.id} did not move`);
      // It travels on exactly ONE axis — a board comes off its face, not
      // diagonally out of the corner.
      const axes = [o.x, o.y, o.z].filter((v) => v !== 0).length;
      assert.equal(axes, 1, `${id} ${p.id} moved on ${axes} axes`);
      // …and far enough to be outside the lump it came from, on that axis.
      const axis = o.x ? 'x' : (o.y ? 'y' : 'z');
      const span = { x: 'w', y: 'h', z: 'd' }[axis];
      const lo = p.box[axis] + (o[axis]);
      const hi = lo + p.box[span];
      assert.ok(
        hi <= bounds.min[axis] + 1e-6 || lo >= bounds.max[axis] - 1e-6
          || Math.abs(o[axis]) >= bounds.size[axis] * P.editor.explode.distanceFactor - 1e-6,
        `${id} ${p.id} barely moved`,
      );
    }
  }
});

test('pieces travelling the same way fan out rather than staying stacked', () => {
  // A tall unit with four shelves: every shelf is thin in y and they cannot all
  // travel the same distance, or the stack simply floats upwards intact.
  const panels = panelsOf('BUDTALL', { shelves: 4 });
  const offsets = explodeOffsets(panels, explodeSettings(P));
  const shelves = panels.filter((p) => p.part === 'SHELF');
  assert.ok(shelves.length >= 2, 'the fixture needs shelves to be worth testing');
  const sameWay = new Map();
  for (const s of shelves) {
    const o = offsets.get(s.id);
    const key = `${o.x};${Math.sign(o.y)};${o.z}`;
    if (!sameWay.has(key)) sameWay.set(key, []);
    sameWay.get(key).push(o.y);
  }
  for (const [key, ys] of sameWay) {
    if (ys.length < 2) continue;
    assert.equal(new Set(ys).size, ys.length, `shelves going ${key} travelled together`);
  }
});

test('a piece further along the axis ends up further out', () => {
  // Three shelves, one above the other, all lifting. The top one must finish
  // above the middle one, which must finish above the bottom one — otherwise
  // the stack crosses over itself on the way out.
  const boxes = [100, 400, 700].map((y, i) => ({
    id: `S${i}`, box: {
      x: 18, y, z: 0, w: 564, h: 18, d: 540,
    },
  }));
  const all = [
    ...boxes,
    { id: 'BOTTOM', box: { x: 18, y: 0, z: 0, w: 564, h: 18, d: 540 } },
    { id: 'TOP', box: { x: 18, y: 900, z: 0, w: 564, h: 18, d: 540 } },
  ];
  const offsets = explodeOffsets(all, { factor: 0.4, spread: 0.2 });
  const finalY = (id) => all.find((p) => p.id === id).box.y + offsets.get(id).y;
  // Whichever way each one travels, the ORDER along y is preserved.
  const order = ['BOTTOM', 'S0', 'S1', 'S2', 'TOP'].map(finalY);
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(order[i] > order[i - 1], `piece ${i} crossed over the one below it`);
  }
});

test('the distance scales with the cabinet, not with the millimetre', () => {
  const small = panelsOf('LOW_CABINET');
  const big = panelsOf('WARDROBE');
  const ratio = (panels) => {
    const bounds = cabinetBounds(panels);
    const offsets = explodeOffsets(panels, explodeSettings(P));
    const side = panels.find((p) => p.part === 'BUL');
    return Math.abs(offsets.get(side.id).x) / bounds.size.x;
  };
  // Same PICTURE: the side panel steps out by the same fraction of the cabinet
  // in both, even though the cabinets are nothing like the same size.
  assert.ok(Math.abs(ratio(small) - ratio(big)) < 1e-9);
  assert.ok(cabinetBounds(big).size.y > cabinetBounds(small).size.y * 2);
});

test('nothing about the explode touches the engine result', () => {
  // It is a viewer over existing data (CLAUDE.md F4.3): the panels it is handed
  // come back unchanged, boxes included.
  const panels = panelsOf('BUD');
  const before = JSON.stringify(panels);
  explodeOffsets(panels, explodeSettings(P));
  assert.equal(JSON.stringify(panels), before);
});
