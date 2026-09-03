// ─── TURN 61 · F1 — THE EIGHT OVERLAYS RETURN ──────────────────────────────
//
// The owner, asked which of the tool's overlays a client should get back:
//
//   *"takwlacz praktycznei wszystko"* · *"1 all 8, 2 - jal dzis"*
//
// T59 killed all tool chrome in retail with one boot-time switch. T60 gave
// three overlays back through NAMED CHANNELS. Tonight the remaining eight come
// back the same way — and "the same way" is the whole of what this file checks.
//
// ─── WHAT THE FALL-THROUGH PROVES, AND WHY IT IS THE PROOF ─────────────────
//
// `chromeOn(part)` answers the master switch for any channel nobody has
// claimed. PRO claims none. So every one of the eleven guards still reads
// `if (!true) return null` on PRO's side, and PRO's rendered output cannot have
// moved — not because somebody looked, but because there is no value the
// channel could have taken. That sentence is asserted here rather than trusted.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  chromeOn, proChromeOn, setChromePart, setProChrome,
} from '../src/3d/chrome.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** The eight of CLAUDE.md F1's table, in its own order, with their channels. */
const EIGHT = [
  ['DrillRings', 'drill'],
  ['AddPlus', 'plus'],
  ['PartMachining', 'machining'],
  ['LedIcons', 'led-icons'],
  ['HoverDimensions', 'hover-dims'],
  ['EdgeHandle', 'edge'],
  // #7 is UnitView's hover-shelf ghost — a JSX condition, checked on its own.
  ['ShareOutBar', 'share'],
];

test('F1 · each of the seven components asks its own channel, in its first line', () => {
  for (const [name, part] of EIGHT) {
    const text = read(`src/3d/${name}.jsx`);
    assert.match(text, /import \{ chromeOn \} from '\.\/chrome\.js';/,
      `${name}.jsx does not import the channel reader`);
    assert.ok(!/\bproChromeOn\b\s*\(/.test(text.replace(/\/\/[^\n]*/g, '')),
      `${name}.jsx still calls the master switch directly`);
    assert.ok(text.includes(`if (!chromeOn('${part}')) return null;`),
      `${name}.jsx does not guard on the '${part}' channel`);
  }
});

test('F1 · the eighth is UnitView\'s hover-shelf ghost, and it is a condition', () => {
  const text = read('src/3d/UnitView.jsx');
  assert.ok(text.includes("chromeOn('hover') && hoverShelf"),
    'the shelf-gap readout does not ask the `hover` channel');
  // T60's contour pass is untouched — the two live in the same file and a
  // careless edit to one is how the other quietly changes.
  assert.ok(text.includes("chromeOn('outlines') && (outlines || contour || xray)"),
    'the contour pass lost its channel');
  assert.ok(!/\bproChromeOn\s*\(/.test(text.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')),
    'UnitView still calls the master switch');
});

test('F1 · a channel nobody set IS the master switch — the no-change proof', () => {
  // PRO: the default, and every channel falling through to it.
  assert.equal(proChromeOn(), true);
  for (const [, part] of EIGHT) assert.equal(chromeOn(part), true, `${part} did not fall through`);
  assert.equal(chromeOn('hover'), true);
  assert.equal(chromeOn('a-channel-nobody-will-ever-add'), true);

  // Retail: the switch off, and only what it claims comes back.
  setProChrome(false);
  assert.equal(chromeOn('drill'), false, 'an unclaimed channel is not the switch');
  setChromePart('drill', true);
  assert.equal(chromeOn('drill'), true);
  assert.equal(chromeOn('plus'), false, 'claiming one channel claimed another');

  // …and the master switch is the last word: it clears every channel past it.
  setProChrome(true);
  assert.equal(chromeOn('drill'), true);
  assert.equal(chromeOn('plus'), true);
});

test('F1 · the retail entry claims eleven, once, before the first render', () => {
  const entry = read('src/retail/main-retail.jsx');
  const claimed = [...entry.matchAll(/setChromePart\('([^']+)', true\)/g)].map((m) => m[1]);
  assert.deepEqual(claimed, [
    // T60's three…
    'dimensions', 'outlines', 'measure',
    // …and T61's eight, in CLAUDE.md F1's own order.
    'drill', 'plus', 'machining', 'led-icons', 'hover-dims', 'edge', 'hover', 'share',
    // …and T63 F1's one: hinge plates and runners in every view, for the
    // client who is buying them. *"1 — zawiasy zawsze."*
    'hardware-always',
  ], 'the entry does not claim exactly the twelve, in order');

  // BOOT-TIME, and that is load-bearing: these guards sit before their
  // components' hooks, so a value that changed between renders would change a
  // hook count. Every claim is at module scope, above the dynamic import.
  const app = entry.indexOf("import('./RetailApp.jsx')");
  for (const m of entry.matchAll(/setChromePart\(/g)) {
    assert.ok(m.index < app, 'a channel is claimed after the app has been asked for');
  }
});

test('F1 · both `+` routes default to exactly what PRO does', () => {
  const scene = read('src/3d/Scene.jsx');
  // ADDITIVE, and PRO passes neither — CLAUDE.md F3.6's own licence: *"additive,
  // default = today's PRO behaviour."*
  assert.match(scene, /onAddPlus = null/);
  assert.match(scene, /onAddInside = null/);
  assert.match(scene, /if \(onAddPlus\) \{ onAddPlus\(point\); return; \}/);
  assert.match(scene, /if \(onAddInside\) \{ onAddInside\(unit\.id, at \|\| null\); return; \}/);
  // PRO's own two lines are still there, under the routes.
  assert.match(scene, /openLibraryToInsert\(categoryOf\(near\?\.type\)\?\.id \|\| null/);
  assert.match(scene, /openModal\('add-items', \{ unitId: unit\.id, anchor: at \|\| null \}\)/);

  // …and the retail Stage is where the handlers come from, so they live in
  // src/retail and reach the store only through the adapter.
  const stage = read('src/retail/design/Stage.jsx');
  assert.match(stage, /onAddPlus=\{onAddPlus\}/);
  assert.match(stage, /onAddInside=\{onAddInside\}/);
  const room = read('src/retail/design/DesignRoom.jsx');
  assert.match(room, /onAddPlus=\{\(point\) => setSaid\(A\.addBesidePlus\(point\)\.said\)\}/);
  assert.match(room, /onAddInside=\{\(unitId\) => \{/);
});
