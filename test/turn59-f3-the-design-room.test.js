// ─── TURN 59 · F3 — THE DESIGN ROOM, AND THE FOUR SHARED-CORE OPTIONS ──────
//
// This file answers for the three claims F3 makes that are not visible in a
// screenshot:
//
//   1. the retail mount runs the SHARED stores in a MEMORY-ONLY mode — *"none
//      of PRO's localStorage keys, none of PRO's Supabase, ever"*;
//   2. the PRO overlays are OFF, and off by a switch whose DEFAULT is PRO's
//      behaviour today;
//   3. the columns are the widths and the tones the brief names, and the
//      full-screen mode is a LOOKING mode that restores what it left.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  PERSISTENCE_MODES, persistenceMode, persistenceOn, setPersistence,
} from '../src/stores/persistence.js';
import { proChromeOn, setProChrome } from '../src/3d/chrome.js';
import {
  CAMERA_PRESETS, presetPlacement, viewHandle,
} from '../src/3d/cameraPresets.js';

const ROOT = new URL('../', import.meta.url).pathname;
const RETAIL = join(ROOT, 'src/retail');

function filesUnder(dir, re = /\.(js|jsx|css)$/) {
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, re));
    else if (re.test(path)) out.push(path);
  }
  return out;
}

const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

// ─── 1 · THE MEMORY-ONLY MODE ──────────────────────────────────────────────

test('F3.7 · persistence: PRO\'s default is untouched, and \'none\' is a real mode', () => {
  assert.deepEqual(PERSISTENCE_MODES, ['local', 'none']);
  // The DEFAULT is what PRO has always done. Nothing in PRO calls the setter,
  // so this is the value PRO runs on.
  assert.equal(persistenceMode(), 'local');
  assert.equal(persistenceOn(), true);

  assert.throws(() => setPersistence('disk'), /persistence must be one of/,
    'an unknown mode must be refused, not silently taken — a typo here hands a client PRO\'s cache');

  setPersistence('none');
  assert.equal(persistenceOn(), false);
  setPersistence('local');
  assert.equal(persistenceOn(), true);
});

test('F3.7 · EVERY localStorage call in both shared stores is behind the gate', () => {
  for (const rel of ['src/stores/projectStore.js', 'src/stores/uiStore.js']) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const lines = text.split('\n');
    const calls = lines
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => /localStorage\.(get|set|remove)Item/.test(line)
        && !/^\s*(\/\/|\*)/.test(line));
    assert.ok(calls.length > 0, `${rel} — the scan found no localStorage at all; the test is broken`);

    // Every one of them must sit inside a function or a statement that has
    // already asked `persistenceOn()`. Read backwards to the nearest gate.
    for (const [n] of calls) {
      const before = lines.slice(Math.max(0, n - 30), n).join('\n');
      assert.match(before, /persistenceOn\(\)/,
        `${rel}:${n} writes or reads localStorage with no persistence gate above it`);
    }
  }
});

test('F3.7 · the retail tree names no Supabase, no PRO key, and no PRO file', () => {
  const bad = [];
  for (const file of filesUnder(RETAIL)) {
    const text = stripComments(readFileSync(file, 'utf8'));
    if (/supabase/i.test(text)) bad.push(`${relative(ROOT, file)}: supabase`);
    if (/localStorage|sessionStorage|indexedDB/.test(text)) {
      bad.push(`${relative(ROOT, file)}: browser storage`);
    }
    if (/cc\.project\.cache|cc\.showHinges|cc\.brightness|cc\.audience/.test(text)) {
      bad.push(`${relative(ROOT, file)}: a PRO localStorage key`);
    }
  }
  assert.deepEqual(bad, [], `the PBI side keeps nothing and knows nobody:\n  ${bad.join('\n  ')}`);
});

test('F3.7 · the retail entry throws both switches BEFORE it imports the app', () => {
  const entry = readFileSync(join(RETAIL, 'main-retail.jsx'), 'utf8');
  const code = stripComments(entry);
  const persistAt = code.indexOf("setPersistence('none')");
  const chromeAt = code.indexOf('setProChrome(false)');
  const appAt = code.indexOf("import('./RetailApp.jsx')");
  assert.ok(persistAt > 0 && chromeAt > 0 && appAt > 0, 'the entry is not shaped as expected');
  assert.ok(persistAt < appAt, 'persistence must be set before the app (and so the stores) is imported');
  assert.ok(chromeAt < appAt, 'the chrome switch must be thrown before the first render');
  // A STATIC import of the app would hoist above the setters and undo all of it.
  assert.ok(!/^import RetailApp/m.test(code), 'the app must arrive by dynamic import');

  // …AND SO WOULD A STATIC IMPORT OF ANY STORE. `uiStore.js` reads five of
  // PRO's localStorage keys while `create()` builds its initial state, at
  // module scope. Import it at the top of this file for any reason at all —
  // one line to set the audience was enough — and that read has already
  // happened by the time `setPersistence('none')` runs. The ONLY shared-core
  // modules this entry may name statically are the two switches themselves,
  // and neither of them imports anything.
  const statics = [...code.matchAll(/^import\s[^;]*?from\s*'(\.\.\/[^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(statics.sort(), ['../3d/chrome.js', '../stores/persistence.js'],
    `main-retail.jsx statically imports shared-core modules it must not: ${statics.join(', ')}`);
  for (const rel of ['src/3d/chrome.js', 'src/stores/persistence.js']) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(!/^import\s/m.test(text), `${rel} must import nothing — it is thrown before everything`);
  }
});

// ─── 2 · THE PRO OVERLAYS ──────────────────────────────────────────────────

const GUARDED = [
  'AddPlus', 'DimLabel', 'DimensionChain', 'DistanceArrows', 'DrillRings', 'EdgeHandle',
  'HoverDimensions', 'LedIcons', 'PartMachining', 'Ruler', 'ShareOutBar',
];

test('F3.6 · the chrome switch defaults to PRO, and PRO never touches it', () => {
  assert.equal(proChromeOn(), true, 'the default IS PRO\'s behaviour today');
  setProChrome(false);
  assert.equal(proChromeOn(), false);
  // Anything but an explicit `false` restores PRO, so the switch cannot get
  // stuck by a typo.
  setProChrome(undefined);
  assert.equal(proChromeOn(), true);
  setProChrome(true);

  for (const rel of ['src/App.jsx', 'src/main.jsx']) {
    assert.ok(!/setProChrome|proChromeOn/.test(readFileSync(join(ROOT, rel), 'utf8')),
      `${rel} must know nothing of the switch`);
  }
});

test('F3.6 · every PRO overlay asks the switch in its own first line', () => {
  for (const name of GUARDED) {
    const text = readFileSync(join(ROOT, 'src/3d', `${name}.jsx`), 'utf8');
    assert.match(text, /import \{ proChromeOn \} from '\.\/chrome\.js';/,
      `${name}.jsx does not import the switch`);
    const at = text.search(/^export default function \w+\(/m);
    assert.ok(at >= 0, `${name}.jsx has no default component`);
    // A generous window with the prose taken out: several of these components
    // carry a paragraph of argument inside their own parameter list.
    const head = stripComments(text.slice(at, at + 2600));
    assert.match(head, /if \(!proChromeOn\(\)\) return null;/,
      `${name}.jsx does not return null when the chrome is off`);
    // BEFORE any hook, so the hook count cannot change between renders.
    const guardAt = head.indexOf('if (!proChromeOn()) return null;');
    const firstHook = head.search(/\buse[A-Z]\w*\(/);
    if (firstHook >= 0) {
      assert.ok(guardAt < firstHook, `${name}.jsx guards AFTER a hook — the hook order would change`);
    }
  }
});

test('F3.3 · the stage is the SHARED viewer, not a copy of it', () => {
  const stage = readFileSync(join(RETAIL, 'design/Stage.jsx'), 'utf8');
  assert.match(stage, /import Scene from '\.\.\/\.\.\/3d\/Scene\.jsx';/,
    'the stage must mount the same Scene ConfiguratorPage mounts');
  // …and PRO's own mount is untouched.
  const page = readFileSync(join(ROOT, 'src/pages/ConfiguratorPage.jsx'), 'utf8');
  assert.match(page, /from '\.\.\/3d\/Scene\.jsx'/);
});

// ─── 3 · THE FOUR COLUMNS, AND THE CAMERA ──────────────────────────────────

test('F3 · the columns are the widths and the tones the brief names', () => {
  const tokens = readFileSync(join(RETAIL, 'styles/tokens.css'), 'utf8');
  for (const [name, value] of Object.entries({
    '--pbi-col-categories': '220px',
    '--pbi-col-options': '320px',
    '--pbi-col-detail': '300px',
    '--pbi-view-bar-h': '40px',
    '--pbi-header-h-room': '60px',
  })) {
    assert.match(tokens, new RegExp(`${name}\\s*:\\s*${value}\\s*;`), `${name} is not ${value}`);
  }

  const tone = (file, want) => {
    const text = readFileSync(join(RETAIL, 'design', file), 'utf8');
    assert.match(text, new RegExp(`background:\\s*'var\\(${want}\\)'`), `${file} is not on ${want}`);
  };
  tone('Categories.jsx', '--pbi-ivory');        // Signature Ivory
  tone('Options.jsx', '--pbi-soft-ivory');
  tone('Stage.jsx', '--pbi-porcelain');
  tone('Detail.jsx', '--pbi-warm-white');
});

test('F3.1 · nothing folds open in place — no accordion in the retail tree', () => {
  const bad = [];
  for (const file of filesUnder(RETAIL, /\.jsx$/)) {
    const text = stripComments(readFileSync(file, 'utf8'));
    if (/<details[\s>]|<summary[\s>]/i.test(text)) bad.push(relative(ROOT, file));
  }
  assert.deepEqual(bad, [], `the PSW law: two columns, never a fold — ${bad.join(', ')}`);
});

test('F3.3 · three camera presets, parked off the furniture\'s own box', () => {
  assert.deepEqual(CAMERA_PRESETS, ['front', 'inside', 'room']);
  assert.equal(viewHandle('room'), null, 'no scene is mounted in a node test');

  const box = { min: [-0.3, 0, -0.28], max: [0.3, 2.15, 0.28] };
  const front = presetPlacement('front', box);
  // Square on: level with the middle, on the centre line, in front of the piece.
  assert.equal(Math.round(front.from[0] * 1000), 0);
  assert.ok(front.from[2] > box.max[2], 'FRONT stands in front of the wardrobe');
  assert.deepEqual(front.at.map((n) => Math.round(n * 100)), [0, 108, 0]);

  const inside = presetPlacement('inside', box);
  assert.ok(inside.from[2] < front.from[2], 'INSIDE is nearer than FRONT');
  assert.ok(inside.from[2] > box.max[2], 'INSIDE stands in the doorway, not inside the box');
  // Far enough back that the whole opening is in the picture: a camera 0.35 m
  // from a 2.15 m wardrobe photographs one board and no wardrobe.
  assert.ok(inside.from[2] - box.max[2] > (box.max[1] - box.min[1]) * 0.6,
    'INSIDE is too close to frame the opening');
  assert.ok(inside.at[2] < box.max[2], 'INSIDE looks INTO the carcass');

  const room = presetPlacement('room', box);
  assert.ok(room.from[0] < 0, 'ROOM comes from a corner, off to one side');
  assert.ok(room.from[1] > box.max[1] * 0.4, 'ROOM stands above eye height');

  assert.equal(presetPlacement('front', null), null, 'no bounds, no placement');
});

test('F3.5 · full screen is a LOOKING mode that restores what it left', () => {
  const room = readFileSync(join(RETAIL, 'design/DesignRoom.jsx'), 'utf8');
  // Esc, the ⛶ and BACK TO DESIGN are all the same one state change.
  assert.match(room, /e\.key === 'Escape'/, 'Esc must leave full screen');
  assert.match(room, /useCameraMemory\(fullScreen\)/, 'the camera must be held across the trip');
  // The columns are NOT unmounted-and-reset; they are simply not rendered, so
  // `active`, `target` and the selection are still there on the way back.
  assert.match(room, /\{!fullScreen \? \(\s*<Categories/);
  assert.match(room, /if \(fullScreen \|\| !selectedElement\) return;/,
    'a click in looking mode must select nothing');
  assert.ok(!/setActive\(['"]space['"]\)/.test(room.slice(room.indexOf('setFullScreen'))),
    'nothing may be reset on the way back');
});
