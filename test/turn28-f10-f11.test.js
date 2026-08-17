// ─── TURN 28 F10 + F11 — the two at the bottom ──────────────────────────────
//
// F10  A second BRIGHTNESS slider, on the top toolbar. The View menu's control
//      gets a twin: same state, two controls, one source (R11). Nothing else
//      about the lighting changes.
//
// F11  The LAYER LIST leaves the editor toolbar. Turn 26 F12 was asked to
//      remove it and did not — it turned the permanent dropdown into a
//      question asked once, which is the right grammar, and then rendered the
//      question INSIDE the toolbar box, so a list of every CNC layer in the
//      app still opened on the toolbar. Nothing else on the toolbar moves.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { brightnessScale } from '../src/engine/lighting.js';

const read = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');
const TOP = read('components/TopBar.jsx');
const PART = read('components/PartDetailModal.jsx');

// ─── F10 — the twin ─────────────────────────────────────────────────────────

test('F10 the toolbar carries a brightness slider, and the View menu still does', () => {
  // The MENU entry, exactly as turn 26 shipped it…
  assert.match(TOP, /label: 'Brightness',/);
  assert.match(TOP, /slider: \{\s*\n\s*min: profile\.appearance\.studio\.brightness\.min,/);
  // …and its TWIN on the bar.
  assert.match(TOP, /data-brightness-control="1"/);
  const at = TOP.indexOf('data-brightness-control="1"');
  const block = TOP.slice(at, at + 900);
  assert.match(block, /type="range"/);
  assert.match(block, /min=\{profile\.appearance\.studio\.brightness\.min\}/);
  assert.match(block, /max=\{profile\.appearance\.studio\.brightness\.max\}/);
  assert.match(block, /step=\{profile\.appearance\.studio\.brightness\.step\}/);
});

test('F10 ONE source: both read the same value and call the same setter', () => {
  // There is exactly one subscription to each, and both controls use it.
  assert.equal([...TOP.matchAll(/useUiStore\(\(s\) => s\.brightness\)/g)].length, 1);
  assert.equal([...TOP.matchAll(/useUiStore\(\(s\) => s\.setBrightness\)/g)].length, 1);
  assert.match(TOP, /value: brightness,/, 'the menu shows the state');
  assert.match(TOP, /run: setBrightness,/, '…and writes it');
  const at = TOP.indexOf('data-brightness-control="1"');
  const block = TOP.slice(at, at + 900);
  assert.match(block, /value=\{brightness\}/, 'the bar shows the same state');
  assert.match(block, /onChange=\{\(e\) => setBrightness\(Number\(e\.target\.value\)\)\}/, '…and writes it the same way');
});

test('F10 the state itself is the one turn 26 built, clamped by the same function', () => {
  const ui = useUiStore.getState();
  const B = P.appearance.studio.brightness;
  ui.setBrightness(B.max + 10);
  assert.equal(useUiStore.getState().brightness, brightnessScale(B.max + 10, P));
  assert.equal(useUiStore.getState().brightness, B.max, 'clamped up');
  ui.setBrightness(B.min - 10);
  assert.equal(useUiStore.getState().brightness, B.min, '…and down');
  ui.setBrightness(1);
  assert.equal(useUiStore.getState().brightness, 1);
});

test('F10 nothing else about the lighting changed', () => {
  // The rig is turn 10's and the multiplier is turn 26's — one number on every
  // lamp. F10 adds a control, not a light.
  const lighting = read('engine/lighting.js');
  assert.match(lighting, /export function brightnessScale/);
  assert.match(lighting, /export function balanceRig/);
  const scene = read('3d/Scene.jsx');
  assert.match(scene, /brightnessScale/);
  // …and the slider is dead in the CNC view, exactly as the menu entry is.
  const at = TOP.indexOf('data-brightness-control="1"');
  assert.match(TOP.slice(at, at + 900), /disabled=\{viewMode !== '3d'\}/);
});

// ─── F11 — the layer list leaves the toolbar ────────────────────────────────

/**
 * The toolbar box, from its own marker to the element after it.
 *
 * ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F2) ──────────────────────────
 * The box used to run down to the layer question, which stood directly under
 * it. F2's shell puts the CANVAS under the toolbar and floats the question
 * over the drawing, so the block now ends where the canvas begins — the same
 * question asked of the same file, against the shell it actually has.
 */
function toolbarBlock(src) {
  const at = src.indexOf('data-part-tools="1"');
  assert.ok(at > 0, 'the toolbar is there');
  const end = src.indexOf('data-editor-canvas="1"', at);
  assert.ok(end > at, 'and the canvas comes after it');
  return src.slice(at, end);
}

test('F11 the toolbar carries NO layer list — not a dropdown, not the question', () => {
  const bar = toolbarBlock(PART);
  assert.doesNotMatch(bar, /CNC_LAYERS/, 'no list of every layer in the app');
  assert.doesNotMatch(bar, /data-layer-ask/, '…and not the question either');
  assert.doesNotMatch(bar, /data-part-layer="1"/, 'the turn-24 dropdown is long gone');
});

test('F11 …and everything else on it is exactly where it was (R12)', () => {
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F2) ────────────────────────
  //
  // R12 was "nothing else on the toolbar moved", and turn 38 is the turn that
  // moves things on purpose: F2 rebuilds the window round the canvas, and the
  // readouts — the prompt, the pitch, the drill spec, the Delete button, the
  // layer this session is on — go to the STATUS BAR, which is where F2 puts
  // every persistent readout. What this test protects is that none of them was
  // LOST, so it asks the file rather than the bar.
  const bar = toolbarBlock(PART);
  assert.ok(bar.includes('data-part-tool={t.id}'), 'every tool stamps its own id');
  const TOOLS_SRC = read('lib/partTools.js');
  for (const tool of ['select', 'drill', 'line', 'dowels']) {
    assert.ok(TOOLS_SRC.includes(`id: '${tool}'`), `${tool} is still on the toolbar`);
  }
  for (const marker of ['data-part-undo="1"', 'data-back-to-computed="1"']) {
    assert.ok(bar.includes(marker), `${marker} did not move`);
  }
  const statusAt = PART.indexOf('data-editor-status="1"');
  assert.ok(statusAt > 0, 'F2 gave the window a status bar');
  const status = PART.slice(statusAt);
  for (const marker of [
    'data-part-prompt="1"',
    'data-delete-feature="1"',
    'data-part-pitch="1"',
    'data-part-drill-spec="1"',
  ]) {
    assert.ok(status.includes(marker), `${marker} is on the status bar`);
  }
  // The snap panel is the `snap ▾` dropdown now (F4) — a re-housing of the
  // very same `partSnapStore` state, which is F4's own word for it.
  assert.ok(bar.includes('data-snap-menu="1"'), 'the snaps are a dropdown on the bar');
  assert.ok(PART.includes('data-snap-panel="1"'), '…and the panel itself still exists');
  // …including the one-word readout of which layer this session is on, which
  // is not a list and was never the complaint.
  assert.ok(status.includes('data-part-layer-chosen={layer || undefined}'));
});

test('F11 the question is asked ONCE, at the commit, and it is its own strip', () => {
  // The gate: an op that names no layer is HELD and the question is asked.
  assert.match(PART, /if \(!layer\) \{ setAskLayer\(op\); return; \}/);
  assert.match(PART, /const \[layer, setLayer\] = useState\(null\);/);
  // …answered once and remembered for the session.
  assert.match(PART, /setLayer\(chosen\);/);
  // …in the owner's own words, findable by the walk, OUTSIDE the toolbar.
  const ask = PART.indexOf('data-layer-ask="1"');
  const tools = PART.indexOf('data-part-tools="1"');
  assert.ok(tools > 0 && ask > tools, 'the strip stands after the toolbar box');
  assert.match(PART, /Which layer should these go on\?/);
  assert.match(PART, /data-layer-ask-list="1"/);
  assert.match(PART, /data-layer-ask-ok="1"/);
  assert.match(PART, /data-layer-ask-cancel="1"/);
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F3) ────────────────────────
  // "Custom layers are still parked" was true when this line was written and
  // the owner unparked them on 17.08. The list the question offers is ONE
  // list — the CNC table plus this project's own — which is what `layerList`
  // is and why there is only one of it.
  assert.match(PART, /\{layerList\.map\(\(l\) => \(/);
});

test('F11 the toolbar’s own note no longer promises a layer picker', () => {
  // ─── RE-PINNED 17.08.2026 (TURN 38, CLAUDE.md F2/F3) ─────────────────────
  //
  // Turn 28's note said the toolbar is *"Select · Drill · Line · Dowel line"*
  // and carries no layer list. F2 rewrote the bar — seventeen tools in three
  // groups — and F3 put `layers ▾` on it deliberately, as a DROPDOWN of the
  // one list, which is the opposite of the permanent per-layer control turn 26
  // and turn 28 were both removing.
  //
  // What survives is the fact underneath: the bar does not make a joiner pick
  // a layer before he draws. The question is still asked ONCE, at the commit.
  const TOOLS_SRC = read('lib/partTools.js');
  const at = TOOLS_SRC.indexOf('THE TOOLBAR, IN AUTOCAD');
  assert.ok(at > 0, 'the toolbar says what it is');
  const note = TOOLS_SRC.slice(at, at + 900);
  assert.match(note, /Draw, then modify, then measure/);
  assert.doesNotMatch(note, /and a LAYER picker/, 'the promise is gone with the control');
  const bar = toolbarBlock(PART);
  assert.doesNotMatch(bar, /data-part-layer="1"/, 'no permanent per-layer control');
  assert.match(bar, /data-layers-menu="1"/, '…a dropdown of the one list instead (F3)');
});
