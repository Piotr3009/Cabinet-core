// ─── TURN 28 F5 + F6 — the shelf-support family, and where a collar belongs ──
//
// F5. The owner: the gold/silver choice governs the WHOLE family — the
// SLEEVES, the PINS and the drill-ring COLLARS. One selector, three consumers,
// zero second sources.
//
// There were two sources. `3d/DrillRings.jsx` carried its own table of two
// metals and its own fallback (silver); `3d/Hardware.jsx` read
// `profile.appearance.metals` with `metalDefault` (gold) behind it. A project
// that had never touched the selector therefore drew SILVER collars around
// GOLD sleeves, and "one place" was two places that happened to agree on the
// spelling of two ids.
//
// F6. The chat fix of 12.08 gave EVERY round drilling a metal collar. The
// owner, layer by layer:
//
//   ⌀7.5 on the SHELF layer (`SHELVES_7_5MM`)  collar + dark core — a sleeve
//                                              lines that hole
//   ⌀7.5 puzzle holes, ⌀3, ⌀5, everything else a plain dark disc, NO collar —
//                                              nothing lines them
//
// The ⌀7.5 puzzle socket is the case that proves it: same bit, same diameter,
// and a dowel goes in it. So the branch is on the LAYER, which is the fact
// about what the hole is FOR.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateDesign } from '../src/engine/design.js';
import { shelfSupportMetal } from '../src/3d/hardwareFinish.js';
import { shelfSupportInstances } from '../src/engine/hardware3d.js';

const RINGS = readFileSync(new URL('../src/3d/DrillRings.jsx', import.meta.url), 'utf8');
const HW = readFileSync(new URL('../src/3d/Hardware.jsx', import.meta.url), 'utf8');
const VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');

const design = (shelfSleeve) => migrateDesign({ hardware: { shelfSleeve } });

// ─── F5 — one selector, three consumers ─────────────────────────────────────

test('F5 the selector answers for the family, both ways', () => {
  for (const id of ['gold', 'silver']) {
    const metal = shelfSupportMetal(design(id), P);
    assert.equal(metal.id, id);
    assert.equal(metal.colour, P.appearance.metals[id].colour);
    assert.equal(metal.metalness, P.appearance.metals[id].metalness);
    assert.equal(metal.roughness, P.appearance.metals[id].roughness);
  }
});

test('F5 nothing chosen is the PROFILE’s default — one fallback, not two', () => {
  const fallback = shelfSupportMetal(design(null), P);
  assert.equal(fallback.id, P.appearance.metalDefault);
  assert.equal(fallback.id, 'gold');
  // The fault, said as the two answers that used to come back for one project:
  // the ring pass fell back to SILVER while the sleeve fell back to GOLD.
  assert.notEqual(fallback.id, 'silver');
  // …and the same answer for a design that has no hardware block at all.
  assert.deepEqual(shelfSupportMetal(null, P), fallback);
  assert.deepEqual(shelfSupportMetal({}, P), fallback);
});

test('F5 a metal the workshop does not stock is refused, not drawn', () => {
  const odd = shelfSupportMetal({ hardware: { shelfSleeve: 'bronze' } }, P);
  assert.equal(odd.id, P.appearance.metalDefault, 'an unknown id is not a colour anybody can order');
  assert.ok(odd.colour);
});

test('F5 all three consumers read THAT function and nothing else', () => {
  // The sleeve and the pin (3d/Hardware.jsx → ShelfSupports)…
  assert.match(HW, /import \{ shelfSupportMetal \} from '\.\/hardwareFinish\.js';/);
  assert.match(HW, /const shelfMetal = shelfSupportMetal\(design, profile\);/);
  assert.match(HW, /<ShelfSupports[\s\S]{0,160}metal=\{shelfMetal\}/);
  // …and the collar (3d/DrillRings.jsx).
  assert.match(RINGS, /import \{ shelfSupportMetal \} from '\.\/hardwareFinish\.js';/);
  assert.match(RINGS, /const metal = shelfSupportMetal\(design, profile\);/);
  // The second source is GONE: no private metal table, no second fallback.
  const code = RINGS.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /const METALS = \{/, 'the private table is gone');
  assert.doesNotMatch(code, /shelfSleeve/, '…and so is the second reading of the key');
  assert.doesNotMatch(code, /'silver'/, '…and the silver fallback with it');
  // …and the id no longer travels as a prop for somebody else to resolve.
  assert.doesNotMatch(HW.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n'),
    /profile\.appearance\.metalDefault/, 'the fallback is not spelled out twice');
  assert.match(VIEW, /design=\{design\}/, 'the view hands over the design, not a resolved id');
});

test('F5 the key itself is the project’s, and only two values survive a load', () => {
  assert.equal(migrateDesign({ hardware: { shelfSleeve: 'gold' } }).hardware.shelfSleeve, 'gold');
  assert.equal(migrateDesign({ hardware: { shelfSleeve: 'silver' } }).hardware.shelfSleeve, 'silver');
  assert.equal(migrateDesign({ hardware: { shelfSleeve: 'bronze' } }).hardware.shelfSleeve, null);
  assert.equal(migrateDesign({}).hardware.shelfSleeve, null);
});

// ─── F6 — a collar only where a sleeve goes ─────────────────────────────────

/**
 * The classification the ring pass makes, stated here in the same terms: the
 * LAYER the engine drilled the hole on.
 */
const sleeved = (drill) => drill.layer === P.shelfHoles.layer;

test('F6 one cabinet with shelf rows, puzzle sockets and screws: the split', () => {
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 2,
  }, P);
  const layers = new Set(r.drills.map((d) => d.layer));
  assert.ok(layers.has(P.shelfHoles.layer), 'it has a pin ladder');
  assert.ok(layers.has(P.puzzle.layers.socketHole), '…and puzzle holes');
  assert.ok(layers.size >= 3, '…and other classes besides');

  const shelfHoles = r.drills.filter((d) => d.layer === P.shelfHoles.layer);
  const puzzle = r.drills.filter((d) => d.layer === P.puzzle.layers.socketHole);
  assert.ok(shelfHoles.length > 0 && puzzle.length > 0);
  // THE CASE THAT PROVES IT IS THE LAYER: the two are the same diameter.
  assert.equal(shelfHoles[0].d, 7.5);
  assert.equal(puzzle[0].d, 7.5);
  assert.ok(shelfHoles.every(sleeved), 'the pin ladder is sleeved');
  assert.ok(puzzle.every((d) => !sleeved(d)), '…and the puzzle socket is not, at the same ⌀7.5');
  // …and everything else on the board takes the plain disc.
  for (const d of r.drills.filter((x) => x.layer !== P.shelfHoles.layer)) {
    assert.ok(!sleeved(d), `${d.layer} ⌀${d.d} takes no collar`);
  }
});

test('F6 the ring pass branches on the LAYER, and says so', () => {
  assert.match(RINGS, /const sleeveLayer = profile\?\.shelfHoles\?\.layer;/);
  assert.match(RINGS, /const sleeved = Boolean\(sleeveLayer\) && line\.layer === sleeveLayer;/);
  // …and the bucket key carries it, so a ⌀7.5 puzzle hole and a ⌀7.5 shelf
  // hole cannot end up in one instanced set wearing one look.
  assert.match(RINGS, /const key = `\$\{radius\.toFixed\(2\)\}\|\$\{sleeved \? 'sleeve' : 'plain'\}`;/);
  // The collar geometry EXISTS only for the sleeved set.
  assert.match(RINGS, /const flange = collar \? Math\.min\(1, Math\.max\(0\.35, radius \* 0\.27\)\) : 0;/);
  assert.match(RINGS, /\(collar \? new THREE\.RingGeometry\(mm\(inner\), mm\(radius\), RING_SEGMENTS\) : null\)/);
  assert.match(RINGS, /\{ringGeom && \(/, 'no ring mesh at all where there is no collar');
  // …and the walk can read the split off the scene rather than off a pixel.
  assert.match(RINGS, /ccDrillRing: 'collar'/);
  assert.match(RINGS, /ccDrillRing: collar \? 'core' : 'plain'/);
  // NOTHING branches on the diameter, which is what the 12.08 fix did.
  const code = RINGS.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /radius === 7\.5|\bd === 7\.5|diameter === 7\.5/);
});

test('F6 a hole with a real sleeve modelled in it is still skipped entirely', () => {
  // Turn 25's brass is drawn where a shelf actually stands; a decal at the same
  // centre would be a second, flatter sleeve fighting the first. F6 changes
  // which of the REMAINING holes take a collar, and not that rule.
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1,
  }, P);
  const supports = shelfSupportInstances(r, P);
  assert.ok(supports.length > 0, 'the shelf stands on real sleeves');
  assert.equal(supports.length, P.shelfHoles.pinsPerShelf, 'four of them, as the BOM orders');
  assert.match(RINGS, /if \(dressed\(x, y, z\)\) continue;/);
});

test('F6 the dark core is one colour, named once', () => {
  assert.match(RINGS, /const DARK_CORE = '#141414';/);
  const uses = [...RINGS.matchAll(/#141414/g)].length;
  assert.equal(uses, 1, 'the ink is not spelled out beside every mesh');
  assert.match(RINGS, /color=\{DARK_CORE\}/);
});
