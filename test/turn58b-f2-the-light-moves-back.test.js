import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { watchDrawerFixedHeight } from '../src/engine/watchDrawer.js';
import { lightingBomLines, lightingSpec, stripsForUnit } from '../src/engine/ledStrips.js';
import { grooveCount, withLedGrooves } from '../src/lib/ledGroove.js';

// ─── TURN 58b · F2 — THE PANE'S LIGHT COMES FROM THE BACK OF THE SHELF ─────
//
// The owner, live: *"światło jest na krawędzi półki i oświetla fronty szuflad,
// a powinno być z tyłu na półce."*
//
// The cause is one law, and it is not a bug: an ordinary shelf strip measures
// its depth FROM THE FRONT EDGE (30 mm by default), so any strip under the
// pane shelf sits at the front and floodlights the drawer fronts below it.
// The glass had no strip of its own at all — only `led_mm`, a length that fed
// the BOM and lit nothing.
//
// So the glass births ONE ordinary strip, at the BACK.

const SPEC = lightingSpec(P).strip;
const H = watchDrawerFixedHeight(P);

/** A wardrobe stack whose top drawer takes the watch insert and its pane. */
const job = ({ glass = true } = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 900,
  sections: [{
    width_mm: 900,
    items: [
      { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
      {
        id: 'd2', kind: 'drawer', index: 2, height_mm: H, watch_insert: true, watch_shelf_glass: glass,
      },
    ],
  }],
}, P);

const unitOf = (r) => ({
  id: 'u1',
  type: 'WARDROBE',
  params: { ...defaultParamsFor('WARDROBE', P), width: 900 },
  result: r,
});
const design = (items = []) => ({ lighting: { on: true, items } });
const strips = (r, items = []) => stripsForUnit({
  unit: unitOf(r), result: r, design: design(items), profile: P,
});

// ═══ 1. ONE STRIP, BORN BY THE GLASS, AT THE REAR ══════════════════════════

test('F2 · the pane shelf carries EXACTLY ONE born strip, and it is ordinary', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  assert.ok(pane, 'the fixture cuts a pane');
  assert.ok(pane.strip, 'and the glass births a strip beside its aperture');
  assert.equal(pane.strip.kind, 'shelf', 'an ORDINARY shelf strip — no new kind');
  assert.equal(pane.strip.round, false);
  const drawn = strips(r);
  assert.equal(drawn.length, 1, 'one strip in the unit, and the glass is why');
  assert.equal(drawn[0].id, pane.strip.id);
  // The two fields that belong to the PROJECT and not to the cabinet are
  // stamped on by the same hand that stamps every other strip.
  assert.equal(drawn[0].temperature, P.lighting.defaultTemperature ?? 4000);
  assert.match(drawn[0].hex, /^#[0-9a-f]{6}$/i);
});

test('F2 · it stands at the BACK of the shelf, not at the front edge', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  const shelf = r.panels.find((p) => p.id === pane.shelfId);
  const s = pane.strip;
  const off = P.watchDrawer.openingOffsetMm;
  const led = P.watchDrawer.ledOffsetMm;

  // `z` runs from the wall FORWARD, so the shelf's back edge is `shelf.box.z`.
  const fromBack = s.box.z - shelf.box.z;
  assert.equal(fromBack, off - led,
    'the plan\'s own LED line: the opening offset less the LED offset');
  assert.equal(s.rear_inset_mm, off - led, 'and the record says so in its own field');
  assert.ok(fromBack < off,
    `${fromBack} is within the ${off} mm band of board behind the aperture — it stands ON board`);

  // The ordinary front-edge law would have put it HERE. It did not.
  const atFront = shelf.box.z + shelf.box.d - SPEC.shelfDepthDefault - SPEC.width - SPEC.insetDefault;
  assert.ok(s.box.z < atFront,
    `the born strip is at ${s.box.z}, not at the front-edge law's ${atFront}`);
  // Nearer the back of the shelf than the front, by a long way.
  assert.ok(fromBack < (shelf.box.z + shelf.box.d - s.box.z),
    'measured from the back, not from the front');
});

test('F2 · it is APERTURE-WIDE, hung under the shelf on the usual thickness law', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  const shelf = r.panels.find((p) => p.id === pane.shelfId);
  const off = P.watchDrawer.openingOffsetMm;
  const s = pane.strip;
  assert.equal(s.box.x, shelf.box.x + off, 'it starts at the aperture\'s own edge');
  assert.equal(s.box.w, shelf.box.w - 2 * off, 'and spans the aperture\'s width');
  assert.equal(s.length_mm, s.box.w, 'its length is that width — the BOM\'s single source');
  assert.equal(s.box.h, SPEC.thickness, 'the project\'s own strip thickness, never a literal');
  assert.equal(s.box.d, SPEC.width, '…and its width');
  assert.equal(s.box.y, shelf.box.y - SPEC.thickness, 'hung UNDER the shelf');
});

// ═══ 2. THE BOM: ONE LINE, ONE LENGTH, AND `led_mm` GONE ═══════════════════

test('F2 · `led_mm` and its hardware line are gone — the strip replaces them', () => {
  const r = job();
  const born = (r.assemblies.watchInserts || [])[0];
  assert.ok(born.shelf_glass, 'the row still describes the pane');
  assert.equal(born.shelf_glass.led_mm, undefined, 'the T53 ring length is gone');
  assert.equal(born.shelf_glass.led_strip_mm, (r.assemblies.watchGlass || [])[0].strip.length_mm,
    'and what stands in its place IS the strip\'s own length');
  assert.equal((r.hardware || []).filter((h) => h.role === 'led_strip').length, 0,
    'the T53 hardware line is gone with it — not kept beside');
  // The engine quotes what it deleted, by the house rule.
  const engine = readFileSync(new URL('../src/engine/cabinet.js', import.meta.url), 'utf8');
  assert.match(engine, /hw\('led_strip', 'LED strip', roundTo\(w\.shelf_glass\.led_mm/,
    'the dead line is quoted where the next reader will find it');
});

test('F2 · `lightingBomLines` counts it like any strip', () => {
  const r = job();
  const lines = lightingBomLines({
    entries: [{ unit: unitOf(r), result: r }], design: design(), profile: P,
  });
  const led = lines.filter((l) => l.role === 'led_strip');
  assert.equal(led.length, 1, 'one metres line');
  const strip = (r.assemblies.watchGlass || [])[0].strip;
  assert.equal(led[0].qty, Math.round((strip.length_mm / 1000) * 100) / 100,
    'and its metres are the strip\'s own length');
});

// ═══ 3. NOTHING IS ADDED AT THE FRONT, AND NOTHING IS DRILLED ══════════════

test('F2 · nothing is auto-added at the FRONT of the pane shelf', () => {
  const r = job();
  const shelf = r.panels.find((p) => p.id === (r.assemblies.watchGlass || [])[0].shelfId);
  const front = shelf.box.z + shelf.box.d;
  for (const s of strips(r)) {
    assert.ok(s.box.z + s.box.d < shelf.box.z + shelf.box.d / 2,
      `a born strip at ${s.box.z} would be in the front half of the shelf (front edge ${front})`);
  }
});

test('F2 · a user\'s own front strip on that shelf is still the user\'s business', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  const mine = { id: 'led1', unitId: 'u1', kind: 'shelf', ref: pane.shelfId };
  const both = strips(r, [mine]);
  assert.equal(both.length, 2, 'the born strip and the placed one, side by side');
  const placed = both.find((s) => s.id === 'led1');
  assert.ok(placed, 'his line is untouched');
  // …and it obeys the front-edge law it always did — the slider law is not
  // touched by this turn.
  const shelf = r.panels.find((p) => p.id === pane.shelfId);
  assert.equal(
    placed.box.z,
    shelf.box.z + shelf.box.d - placed.depth_mm - SPEC.width - placed.inset_mm,
    'measured back from the FRONT edge, exactly as T33/T34 left it',
  );
});

test('F2 · LIGHTING DRILLS NOTHING — the born strip cuts no groove', () => {
  const r = job();
  const pane = (r.assemblies.watchGlass || [])[0];
  assert.equal(pane.strip.ref, undefined,
    '`ref` is what ledGroove looks a panel up by; the born strip carries none');
  const before = grooveCount(r);
  const after = withLedGrooves({
    result: r, strips: strips(r), items: [], ledSpec: P.lighting,
  });
  assert.equal(grooveCount(after), before, 'no groove is cut for it');
});

// ═══ 4. A PLAIN SHELF IS BYTE FOR BYTE WHAT IT WAS ═════════════════════════

test('F2 · a shelf without glass births no strip at all', () => {
  const plain = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W02', shelves: 2 }, P);
  assert.equal(plain.assemblies.watchGlass, undefined, 'no pane');
  assert.equal(strips(plain).length, 0, 'and no strip — the early return still returns');
  assert.equal(lightingBomLines({
    entries: [{ unit: unitOf(plain), result: plain }], design: design(), profile: P,
  }).length, 0, 'and no BOM line');
});

test('F2 · the drawer with the insert but NO glass births nothing either', () => {
  const r = job({ glass: false });
  assert.equal((r.assemblies.watchGlass || []).length, 0, 'no pane, so no strip to bring');
  assert.equal(strips(r).length, 0);
});

// ═══ 5. NO SPECIAL CASE ANYWHERE DOWNSTREAM ════════════════════════════════

test('F2 · `LedStrips.jsx` draws it as it draws every strip', () => {
  const view = readFileSync(new URL('../src/3d/LedStrips.jsx', import.meta.url), 'utf8');
  assert.ok(!/watchGlass|watch_glass|pane\.strip/.test(view),
    'the renderer knows nothing about panes — the record is ordinary');
});
