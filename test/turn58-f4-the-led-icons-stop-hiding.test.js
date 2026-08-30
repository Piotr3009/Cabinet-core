import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ledIconsOn } from '../src/stores/uiStore.js';

// ─── TURN 58 · F4 — THE LED ICONS STOP HIDING ───────────────────────────────
//
// T54-F5 answered a real complaint — *"ludzie nie wiedzą, że takie funkcje
// istnieją"* — by drawing a clickable L LED / R LED badge on every unit WHILE
// the Lighting panel is open, and it wrote its own gate down as the feature:
//
//     const lightingOpen = useUiStore((s) => s.modal === 'lighting');
//     if (!lightingOpen) return null;          // "the gate IS the feature"
//
// Right about the PURPOSE, wrong about the HOME, and this turn's second
// licensed deletion.
//
//   · A MODAL BEING OPEN IS NOT A WAY OF LOOKING at a cabinet. The icons could
//     be learnt but never USED: the moment the panel closed to reach anything
//     else — the right panel, another unit, the toolbar — they went.
//   · ONE PIECE OF THE SCENE DECIDED ITS OWN VISIBILITY. X-ray, Hide fronts,
//     Contour view, the hinges and the front dimensions all ask the view store
//     and are all remembered; this one asked a modal.
//
// THE LAW, one home: `uiStore.ledIconsOn`. Two ways in and one answer — the
// joiner turns them on and they STAY on (View ▸ LED icons, remembered like
// X-ray), and opening the Lighting panel still shows them whether he has or
// not. T54's discoverability is kept ON PURPOSE and is asserted below, because
// deleting a gate is not a licence to delete what the gate was for.

const LED_ICONS = readFileSync('src/3d/LedIcons.jsx', 'utf8');
/**
 * The file with its PROSE taken out.
 *
 * The house quotes what it deletes — that is how a later reader learns what
 * used to stand somewhere and why it does not — so the deleted gate appears
 * verbatim in the comment above `LedIcons`. A grep for it would find that
 * quotation and call the deletion a failure. This turn's claim is about CODE
 * THAT RUNS, so the comments come out before it is asked.
 */
const LED_ICONS_CODE = LED_ICONS
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const UI_STORE = readFileSync('src/stores/uiStore.js', 'utf8');
const TOP_BAR = readFileSync('src/components/TopBar.jsx', 'utf8');

// ═══ 1. THE LAW, AND ITS ONE HOME ═══════════════════════════════════════════

test('F4 · the icons are on when the joiner has asked for them', () => {
  assert.equal(ledIconsOn({ ledIcons: true, modal: null }), true);
  assert.equal(ledIconsOn({ ledIcons: true, modal: 'lighting' }), true);
});

test('F4 · …and while the Lighting panel is open, whether he has or not', () => {
  // T54-F5's whole purpose, kept. This is the assertion that stops a later
  // turn from reading "the gate is gone" as "the discovery is gone".
  assert.equal(ledIconsOn({ ledIcons: false, modal: 'lighting' }), true);
});

test('F4 · …and off otherwise, which is every scene that had them off before', () => {
  assert.equal(ledIconsOn({ ledIcons: false, modal: null }), false);
  assert.equal(ledIconsOn({ ledIcons: false, modal: 'room' }), false);
  assert.equal(ledIconsOn({}), false);
  assert.equal(ledIconsOn(undefined), false, 'and it never throws on a bare read');
});

test('F4 · it is a SELECTOR, so there is no second boolean to keep in step', () => {
  // A flag written when the panel opens could be stranded on when it closed.
  // Derived, that state cannot exist.
  assert.equal(typeof ledIconsOn, 'function');
  assert.equal(ledIconsOn({ ledIcons: false, modal: 'lighting' }), true);
  assert.equal(ledIconsOn({ ledIcons: false, modal: null }), false,
    'closing the panel takes them away again with nothing to unset');
});

// ═══ 2. THE LICENSED DELETION, CONFIRMED ════════════════════════════════════

test('F4 · the gate is GONE from the component', () => {
  assert.ok(!/const lightingOpen\s*=/.test(LED_ICONS_CODE),
    'the component no longer reads the modal for itself');
  assert.ok(!/if \(!lightingOpen\)/.test(LED_ICONS_CODE),
    'and the gate is deleted rather than left standing');
  assert.ok(!/s\.modal/.test(LED_ICONS_CODE),
    'the component asks nothing about modals at all now');
  assert.match(LED_ICONS_CODE, /useUiStore\(ledIconsOn\)/,
    'it asks the one law instead');
  // …and the quotation IS kept, because a deletion nobody can read about is a
  // deletion the next turn re-introduces.
  assert.match(LED_ICONS, /if \(!lightingOpen\) return null;/,
    'the dead gate is quoted in the prose, by the house rule');
});

test('F4 · the law lives beside the other view flags, and is remembered', () => {
  assert.match(UI_STORE, /export function ledIconsOn/, 'one home, and it is the store');
  assert.match(UI_STORE, /const LED_ICONS_KEY = 'cc\.ledIcons';/);
  assert.match(UI_STORE, /ledIcons: loadFlag\(LED_ICONS_KEY, false\)/,
    'remembered in the same two helpers as X-ray and the hinges');
  assert.match(UI_STORE, /toggleLedIcons:/);
});

// ═══ 3. THE VISIBLE ENTRY ═══════════════════════════════════════════════════

test('F4 · there is a door to it in the View menu', () => {
  assert.match(TOP_BAR, /label: 'LED icons'/, 'the entry exists');
  assert.match(TOP_BAR, /run: toggleLedIcons/, 'and it is wired to the one toggle');
  assert.match(TOP_BAR, /checked: ledIcons/, 'and it shows its own state');
  // Beside the other ways of LOOKING, and disabled outside 3-D exactly as they
  // are — a badge in an elevation would be a badge on a drawing.
  const entry = TOP_BAR.slice(TOP_BAR.indexOf("label: 'LED icons'"));
  assert.match(entry.slice(0, 400), /disabled: viewMode !== '3d'/);
});
