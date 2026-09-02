// ─── TURN 60 · F2 — THE VIEW BAR: PRO'S TOOLS, ONE FOR ONE ─────────────────
//
// The owner, numbering the screen by the agreed names:
//
//   *"nr 4 musi być identyczne jak mamy w PRO, identyczne ma mieć funkcje."*
//
// CLAUDE.md F2 spells that out as a TABLE TEST — *"every bar entry maps to the
// same store flag PRO uses; the three workshop tools are absent while the flag
// is false"* — and this file is it. Every claim below is made by reading
// `src/components/CanvasToolbar.jsx` and `src/retail/design/viewTools.js` side
// by side, so parity is checked rather than asserted.
//
// ─── AND THE HALF THAT MATTERS MOST ────────────────────────────────────────
//
// Four of PRO's entries draw through components `setProChrome(false)` switches
// off for the retail mount. Copying the flag would have given the client four
// buttons that flip a boolean and change nothing on the glass — the DEAD
// CONTROL the standing law forbids, and a worse failure than leaving them out.
// So `src/3d/chrome.js` gained CHANNELS this turn, and the last three tests
// here are the ones that would catch that regression coming back.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { VIEW_TOOLS, WORKSHOP_TOOLS } from '../src/retail/design/viewTools.js';
import { RETAIL_SHOW_WORKSHOP_TOOLS } from '../src/retail/config.js';
import { chromeOn, proChromeOn, setChromePart, setProChrome } from '../src/3d/chrome.js';
import { useUiStore } from '../src/stores/uiStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const PRO_BAR = read('src/components/CanvasToolbar.jsx');
const BAR = read('src/retail/design/ViewBar.jsx');

/** The entries taken FROM PRO — the camera, the light and the page are PBI's. */
const FROM_PRO = VIEW_TOOLS.filter((t) => !t.own);

// ─── 1 · THE TABLE, AGAINST PRO'S OWN TOOLBAR ──────────────────────────────

test('F2 · every entry flips the SAME store flag PRO flips', () => {
  const missing = [];
  for (const tool of FROM_PRO) {
    // The ACTION: the identical name on the identical shared store. Not a
    // retail mirror kept in sync — the same function.
    if (!new RegExp(`\\b${tool.action}\\b`).test(PRO_BAR)) {
      missing.push(`${tool.id}: PRO's toolbar never calls ${tool.action}`);
    }
    if (tool.flag && !new RegExp(`s\\.${tool.flag}\\b`).test(PRO_BAR)) {
      missing.push(`${tool.id}: PRO's toolbar never reads ${tool.flag}`);
    }
    // …and it is a real member of the store, not a name that only exists here.
    const state = useUiStore.getState();
    if (tool.flag && !(tool.flag in state)) missing.push(`${tool.id}: uiStore has no ${tool.flag}`);
    if (typeof state[tool.action] !== 'function' && tool.action !== 'toggleAllFronts') {
      missing.push(`${tool.id}: uiStore has no ${tool.action}()`);
    }
  }
  assert.deepEqual(missing, [], `the bar is not PRO's:\n  ${missing.join('\n  ')}`);
  // ─── AMENDED BY T63 F5, ON THE OWNER'S OWN ORDER ───────────────────────
  // T60 carried eight of PRO's tools. The owner, 01.09.2026: *"front
  // dimensions wywal, po co mi to"* · *"measure wyrzuć też."* Two removed from
  // the RETAIL bar only — PRO's `CanvasToolbar.jsx` keeps both, untouched, and
  // the six that remain are still PRO's, flag for flag.
  assert.equal(FROM_PRO.length, 6, 'six of PRO\'s view tools — eight, less the two the owner struck');
  assert.ok(!VIEW_TOOLS.some((t) => t.id === 'front-dimensions' || t.id === 'measure'),
    'FRONT DIMENSIONS or MEASURE is back in the retail bar');
  assert.match(PRO_BAR, /toggleFrontDimensions/, 'PRO lost its front dimensions — that was retail\'s removal, not PRO\'s');
  assert.match(PRO_BAR, /toggleRuler/, 'PRO lost its ruler — that was retail\'s removal, not PRO\'s');
});

test('F2 · PRO\'s labels and PRO\'s tooltips, character for character', () => {
  const wrong = [];
  for (const tool of FROM_PRO) {
    for (const key of ['label', 'labelOn', 'title', 'titleOn']) {
      const said = tool[key];
      if (!said) continue;
      if (!PRO_BAR.includes(said)) wrong.push(`${tool.id}.${key}: PRO does not say "${said}"`);
    }
  }
  assert.deepEqual(wrong, [], `the copy is not PRO's:\n  ${wrong.join('\n  ')}`);

  // The CAPITALS are `text-transform`, not a different string — which is the
  // only reason the check above can exist at all.
  const room = read('src/retail/styles/room.css');
  const at = room.indexOf('.pbi-viewbar-btn {');
  assert.ok(at >= 0, 'the bar has no rule');
  assert.match(room.slice(at, room.indexOf('}', at)), /text-transform:\s*uppercase/);
});

test('F2 · PRO\'s order, entry by entry', () => {
  // Read off PRO's file by where each entry's own ACTION is CALLED — its
  // `onClick`, which is the last mention of it and therefore the button rather
  // than the selector at the top or a paragraph of argument beside it. A
  // reshuffle in either bar fails here rather than in somebody's eye.
  const at = (tool) => PRO_BAR.lastIndexOf(tool.action);
  const ours = FROM_PRO.map(at);
  const sorted = [...ours].sort((a, b) => a - b);
  assert.deepEqual(ours, sorted,
    `the bar does not follow PRO's order:\n  ${FROM_PRO.map((t, i) => `${t.label} (${t.action}) @${ours[i]}`).join('\n  ')}`);
});

// ─── 2 · WHAT IS ABSENT, AND ON WHOSE ORDER ────────────────────────────────

test('F2 · BOM, Check and CNC are absent — behind one word', () => {
  assert.equal(RETAIL_SHOW_WORKSHOP_TOOLS, false,
    'the workshop tools are the owner\'s to turn on, and they are off');
  assert.deepEqual(WORKSHOP_TOOLS.map((t) => t.id), ['bom', 'check', 'cnc']);

  // They are not DELETED — the doubt CLAUDE.md raised was answered with a flag
  // so that one word from the owner turns them on, and a flag with nothing
  // behind it is a promise rather than a switch.
  assert.match(BAR, /RETAIL_SHOW_WORKSHOP_TOOLS \? \(/, 'the bar does not read the flag');
  for (const t of WORKSHOP_TOOLS) {
    assert.ok(PRO_BAR.includes(t.label), `PRO's bar does not carry ${t.label} — the list is stale`);
  }

  // …and no view tool is one of them by another name.
  for (const tool of VIEW_TOOLS) {
    assert.ok(!/bom|check|cnc/i.test(tool.id), `${tool.id} is a workshop tool in the view list`);
  }
});

// ─── 3 · NO DEAD CONTROL — THE CHANNELS ────────────────────────────────────

test('F2 · every entry that draws through a guarded overlay claims its channel', () => {
  const entry = read('src/retail/main-retail.jsx');
  const need = [...new Set(FROM_PRO.map((t) => t.channel).filter(Boolean))];
  // T63 F5: MEASURE left the bar, so the bar no longer needs the `measure`
  // channel. The entry still claims it (T61's *"1 all 8"* — the Ruler is the
  // client's overlay to own), which is asserted in turn61-f1, not here.
  assert.deepEqual(need.sort(), ['dimensions', 'outlines'],
    'the set of channels the bar needs has changed');
  for (const part of need) {
    assert.match(entry, new RegExp(`setChromePart\\('${part}', true\\)`),
      `the retail entry does not claim the ${part} channel — those buttons would be dead`);
  }

  // And each channel has an overlay actually asking for it, or it is a word
  // nobody reads.
  const asks = {
    dimensions: ['DimLabel', 'DimensionChain', 'DistanceArrows'],
    outlines: ['UnitView'],
    measure: ['Ruler'],
  };
  for (const [part, files] of Object.entries(asks)) {
    for (const name of files) {
      assert.match(read(`src/3d/${name}.jsx`), new RegExp(`chromeOn\\('${part}'\\)`),
        `${name}.jsx does not ask the ${part} channel`);
    }
  }
});

test('F2 · a channel is an OVERRIDE, and PRO sets none — so PRO is unchanged', () => {
  // The default: no channel anywhere, every answer the master switch.
  setProChrome(true);
  assert.equal(proChromeOn(), true);
  for (const part of ['dimensions', 'outlines', 'measure', 'anything-at-all']) {
    assert.equal(chromeOn(part), true, `${part} does not fall through to the switch`);
  }

  // Retail's own boot: everything off, three channels back on, and nothing
  // else follows them.
  setProChrome(false);
  setChromePart('dimensions', true);
  setChromePart('outlines', true);
  setChromePart('measure', true);
  assert.equal(chromeOn('dimensions'), true);
  assert.equal(chromeOn('outlines'), true);
  assert.equal(chromeOn('measure'), true);
  assert.equal(chromeOn('hinges'), false, 'an unclaimed overlay must stay off');
  assert.equal(chromeOn(), false, 'the master switch is still off');
  assert.equal(proChromeOn(), false);

  // The master switch is the LAST WORD: it clears every channel on its way
  // past, so a channel cannot get stuck on.
  setProChrome(true);
  assert.equal(chromeOn('dimensions'), true);
  setProChrome(false);
  assert.equal(chromeOn('dimensions'), false, 'setProChrome did not clear the channels');
  setProChrome(true);
});

test('F2 · nothing in PRO knows the channels exist', () => {
  for (const rel of ['src/App.jsx', 'src/main.jsx', 'src/pages/ConfiguratorPage.jsx',
    'src/components/CanvasToolbar.jsx']) {
    assert.ok(!/setChromePart|chromeOn\(/.test(read(rel)), `${rel} names a channel`);
  }
});

// ─── 4 · THE BAR IS PBI'S, NOT PRO'S ───────────────────────────────────────

test('F2 · the styling is the design system\'s, and gold is a hairline', () => {
  const room = read('src/retail/styles/room.css');
  const active = room.slice(room.indexOf('.pbi-viewbar-btn.is-on'));
  assert.match(active, /color:\s*var\(--pbi-deep-gold\)/, 'the active entry is not Deep Gold');
  const rule = active.slice(active.indexOf('::after'), active.indexOf('}', active.indexOf('::after')));
  assert.match(rule, /height:\s*1px/, 'the underline is not a hairline');
  assert.match(rule, /background:\s*var\(--pbi-champagne\)/, 'the underline is not Champagne');

  // Not one Tailwind class travelled across the boundary with the copy.
  assert.ok(!/className="[^"]*\b(bg-shell|text-ink|bg-gold)\b/.test(BAR),
    'a PRO class reached the retail bar');
});

test('F2 · a disabled entry carries the reason it cannot act', () => {
  // Every branch of `stateOf` that can answer `off: true` also answers a
  // sentence, and the button shows it as its title. A greyed control with no
  // reason is the thing the standing law is about.
  const branches = [...BAR.matchAll(/off:\s*([^,]+),\s*why:\s*([^}]+)}/g)];
  assert.ok(branches.length >= 4, `only ${branches.length} disable branches — the scan is broken`);
  for (const [, off, why] of branches) {
    if (off.trim() === 'false') {
      assert.match(why.trim(), /^''$/, `a branch that never disables carries a reason: ${why}`);
    } else {
      assert.ok(why.trim() !== "''", `a disable branch with no reason: off=${off.trim()}`);
    }
  }
});
