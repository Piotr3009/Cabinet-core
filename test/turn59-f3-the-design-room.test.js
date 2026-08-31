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
  // happened by the time `setPersistence('none')` runs.
  //
  // T60 ADDED A THIRD SWITCH, `3d/picking.js`, and the rule it has to obey is
  // not "import nothing" but the reason for it: NOTHING THIS ENTRY NAMES MAY
  // REACH A STORE before the two setters have run. `picking.js` imports
  // `engine/elements.js`, which is pure data and pure functions and imports
  // nothing itself — so its whole graph is two files, neither of which has a
  // module-scope read of anybody's disk. That is checked below rather than
  // asserted, by walking each switch's imports one level and requiring the
  // whole reachable set to be import-free.
  const SWITCHES = {
    '../3d/chrome.js': 'src/3d/chrome.js',
    '../3d/picking.js': 'src/3d/picking.js',
    '../stores/persistence.js': 'src/stores/persistence.js',
  };
  const statics = [...code.matchAll(/^import\s[^;]*?from\s*'(\.\.\/[^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(statics.sort(), Object.keys(SWITCHES).sort(),
    `main-retail.jsx statically imports shared-core modules it must not: ${statics.join(', ')}`);

  const reached = new Set();
  const walk = (rel) => {
    if (reached.has(rel)) return;
    reached.add(rel);
    const text = readFileSync(join(ROOT, rel), 'utf8');
    for (const m of stripComments(text).matchAll(/^import\s[^;]*?from\s*'(\.[^']+)'/gm)) {
      const next = join(rel, '..', m[1]).replace(/^\/+/, '');
      assert.ok(!/stores\//.test(next),
        `${rel} reaches ${next} — a switch may not touch a store before it has been thrown`);
      walk(next);
    }
  };
  for (const rel of Object.values(SWITCHES)) walk(rel);
  for (const rel of reached) {
    const text = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    assert.ok(!/localStorage/.test(text),
      `${rel} is reachable from the entry and reads localStorage at module scope`);
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

// ─── AMENDED BY T60 F2 ──────────────────────────────────────────────────────
//
// Four of the eleven now ask a CHANNEL instead of the master switch, because
// PBI's VIEW BAR carries PRO's own dimension, outline and measure entries and
// a button that flips a flag nothing draws is the dead control the standing
// law forbids. `chromeOn(part)` falls through to the master switch wherever no
// channel is set — which is PRO, always — so PRO's behaviour is byte for byte
// what it was and every one of these guards still reads `if (!true)`.
//
// What the test asserts is unchanged in substance: each overlay asks ONE
// question in its own first line, BEFORE any hook, and returns null on a no.
const CHANNELLED = {
  DimLabel: 'dimensions', DimensionChain: 'dimensions', DistanceArrows: 'dimensions', Ruler: 'measure',
};

test('F3.6 · every PRO overlay asks the switch in its own first line', () => {
  for (const name of GUARDED) {
    const text = readFileSync(join(ROOT, 'src/3d', `${name}.jsx`), 'utf8');
    const part = CHANNELLED[name] || null;
    const ask = part ? `chromeOn('${part}')` : 'proChromeOn()';
    const imported = part
      ? /import \{ chromeOn \} from '\.\/chrome\.js';/
      : /import \{ proChromeOn \} from '\.\/chrome\.js';/;
    assert.match(text, imported, `${name}.jsx does not import the switch`);
    const at = text.search(/^export default function \w+\(/m);
    assert.ok(at >= 0, `${name}.jsx has no default component`);
    // A generous window with the prose taken out: several of these components
    // carry a paragraph of argument inside their own parameter list.
    const head = stripComments(text.slice(at, at + 2600));
    const guard = `if (!${ask}) return null;`;
    assert.ok(head.includes(guard), `${name}.jsx does not return null when the chrome is off`);
    // BEFORE any hook, so the hook count cannot change between renders.
    const guardAt = head.indexOf(guard);
    const firstHook = head.search(/\buse[A-Z]\w*\(/);
    if (firstHook >= 0) {
      assert.ok(guardAt < firstHook, `${name}.jsx guards AFTER a hook — the hook order would change`);
    }
  }
});

test('F3.6 · a channel is an override of the switch, and PRO sets none', () => {
  const chrome = readFileSync(join(ROOT, 'src/3d/chrome.js'), 'utf8');
  // The fall-through IS the guarantee: with no channel set the answer is the
  // master switch, which is how PRO cannot tell this file grew.
  assert.match(chrome, /if \(part !== undefined && parts\.has\(part\)\) return parts\.get\(part\);/);
  assert.match(chrome, /return on;/);
  for (const rel of ['src/App.jsx', 'src/main.jsx', 'src/pages/ConfiguratorPage.jsx']) {
    assert.ok(!/setChromePart|chromeOn/.test(readFileSync(join(ROOT, rel), 'utf8')),
      `${rel} must know nothing of the channels`);
  }
  // …and the retail entry claims exactly the three its bar needs.
  const entry = readFileSync(join(ROOT, 'src/retail/main-retail.jsx'), 'utf8');
  for (const part of ['dimensions', 'outlines', 'measure']) {
    assert.match(entry, new RegExp(`setChromePart\\('${part}', true\\)`),
      `the retail entry does not claim the ${part} channel`);
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

// ─── AMENDED BY T60 F1, ON THE OWNER'S OWN ORDER ────────────────────────────
//
// t59 asserted five raw pixel tokens in `tokens.css` and four inline
// backgrounds in the components. T60 supersedes BOTH halves and the brief says
// why in the owner's words:
//
//   *"nr 2 może być spokojnie 15% węższe"* — the RAIL narrows to 187px, and
//   *"ludzie mają małe komputery … będzie do dupy widać jak wszystko będzie 25%
//   większe"* — every dimension in the room is now `calc(<base> × --pbi-scale)`
//   in `styles/scale.css`, and the components hold a CLASS rather than a colour.
//
// The claim is the same claim: four columns, four named tones, the widths the
// brief names. It is read where those facts now live.
test('F3 · the columns are the widths and the tones the brief names', () => {
  const scale = readFileSync(join(RETAIL, 'styles/scale.css'), 'utf8');
  for (const [name, base] of Object.entries({
    '--pbi-col-categories': '187',   // 220 × 0.85 — T60 F1.3
    '--pbi-col-options': '320',      // *"nr 3 zostaw jak jest"*
    '--pbi-col-detail': '300',
    '--pbi-header-h-room': '60',
  })) {
    assert.match(scale, new RegExp(`${name}\\s*:\\s*calc\\(${base} \\* var\\(--pbi-scale\\)\\)`),
      `${name} is not ${base} × the scale`);
  }

  const room = readFileSync(join(RETAIL, 'styles/room.css'), 'utf8');
  const tone = (selector, want) => {
    const at = room.indexOf(`${selector} {`);
    assert.ok(at >= 0, `${selector} has no rule`);
    const block = room.slice(at, room.indexOf('}', at));
    assert.match(block, new RegExp(`background:\\s*var\\(${want}\\)`), `${selector} is not on ${want}`);
  };
  tone('.pbi-rail', '--pbi-ivory');        // Signature Ivory
  tone('.pbi-options', '--pbi-soft-ivory');
  tone('.pbi-stage', '--pbi-porcelain');
  tone('.pbi-detail', '--pbi-warm-white');

  // …and the components wear those classes, so the two halves cannot drift.
  const wears = (file, cls) => assert.match(
    readFileSync(join(RETAIL, 'design', file), 'utf8'), new RegExp(`className="${cls}"`),
    `${file} does not wear ${cls}`,
  );
  wears('Categories.jsx', 'pbi-rail');
  wears('Options.jsx', 'pbi-options');
  wears('Stage.jsx', 'pbi-stage');
  wears('Detail.jsx', 'pbi-detail');
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
  // T60: the same guard, one statement longer — a selection made before the
  // trip into full screen is CLEARED on the way in as well as ignored, so the
  // detail column cannot come back holding a menu for something the client can
  // no longer see.
  // T60: two statements now, and the second is what keeps a menu opened from
  // the INTERIOR list alive through its own edits — see `adapter.resolveTarget`.
  assert.match(room, /if \(fullScreen\) \{ setTarget\(null\); return; \}/,
    'full screen must drop the selection');
  assert.match(room, /if \(!selectedElement\) return;/,
    'a click in looking mode must select nothing');
  assert.ok(!/setActive\(['"]space['"]\)/.test(room.slice(room.indexOf('setFullScreen'))),
    'nothing may be reset on the way back');
});
