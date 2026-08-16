// ─── Turn 34, CLAUDE.md F9: "Front dimensions", the twin toggle ────────────
//
// The owner, 16.08.2026: *"górne menu: obok 3D dimensions dodaj taki sam
// przycisk — Front dimensions (show front dimensions)."*
//
// "Taki sam" is the whole of it: the same button, beside its twin, on the flag
// that already existed and already persisted. What it must NOT do is change
// what anybody sees until it is clicked — and what it must do is switch ONE
// layer, F5's merged meeting-line figure included.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useUiStore } from '../src/stores/uiStore.js';

const TOOLBAR = readFileSync(new URL('../src/components/CanvasToolbar.jsx', import.meta.url), 'utf8');
const VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const SCENE = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('../src/components/DoorModal.jsx', import.meta.url), 'utf8');
const TOPBAR = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');

test('the button stands BESIDE the 3D-dimensions control', () => {
  assert.match(TOOLBAR, /data-front-dimensions-toggle="1"/);
  const dims = TOOLBAR.indexOf("{showDimensions ? 'Hide dimensions' : 'Show dimensions'}");
  const fronts = TOOLBAR.indexOf('data-front-dimensions-toggle');
  assert.ok(dims > 0 && fronts > dims, 'it comes after its twin, not somewhere else');
  // …and with nothing but a divider between them.
  const between = TOOLBAR.slice(dims, fronts);
  assert.ok(!/onClick=\{toggle(?!FrontDimensions)/.test(between), 'no third control crept in between');
});

test('it is the SAME button — same classes, same disabled rule, same aria', () => {
  const twin = TOOLBAR.slice(TOOLBAR.indexOf('aria-pressed={showDimensions}'));
  const mine = TOOLBAR.slice(TOOLBAR.indexOf('aria-pressed={showFrontDimensions}'));
  const shape = (s) => [
    /aria-pressed=\{show/.test(s),
    /disabled=\{viewMode !== '3d'\}/.test(s),
    /px-2\.5 py-1 text-xs rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed/.test(s),
    /bg-gold text-shell-900 font-medium/.test(s),
    /text-ink-100 hover:bg-shell-700/.test(s),
  ];
  assert.deepEqual(shape(mine), shape(twin.slice(0, 900)), '"taki sam przycisk"');
});

test('it runs the flag that already existed — same persistence grammar', () => {
  assert.match(TOOLBAR, /onClick=\{toggleFrontDimensions\}/);
  // The flag itself: persisted under its own key since turn 25, and the View
  // menu's own entry still drives the very same one.
  assert.match(TOPBAR, /run: toggleFrontDimensions/);
  const before = useUiStore.getState().showFrontDimensions;
  useUiStore.getState().toggleFrontDimensions();
  assert.equal(useUiStore.getState().showFrontDimensions, !before);
  useUiStore.getState().toggleFrontDimensions();
  assert.equal(useUiStore.getState().showFrontDimensions, before, 'twice is the identity');
  // …and the door modal's checkbox is the third door onto the one flag.
  assert.match(MODAL, /checked=\{showFrontDimensions\}/);
});

test('DEFAULT is the current visibility — nothing changes until it is clicked', () => {
  // The flag's default is `false` and this feature does not move it: adding a
  // second way to reach a switch must not flip the switch.
  const UI = readFileSync(new URL('../src/stores/uiStore.js', import.meta.url), 'utf8');
  assert.match(UI, /showFrontDimensions: loadFlag\(FRONT_DIMS_KEY, false\)/);
});

test('ONE layer, ONE switch: the merged meeting figure rides the same flag', () => {
  // F5's merged leaf-to-leaf figure is concatenated into the SAME row list the
  // per-front figures are in, inside the same `showFrontDimensions` guard —
  // so "off" hides the merged 3 too, with no second condition to keep in step.
  assert.match(VIEW, /if \(!showFrontDimensions\) return \[\];/);
  assert.match(VIEW, /\.\.\.\(meetingDimRows \|\| \[\]\),/);
  const guard = VIEW.indexOf('if (!showFrontDimensions) return [];');
  const merged = VIEW.indexOf('...(meetingDimRows || []),');
  assert.ok(guard > 0 && merged > guard, 'the merged rows are inside the guard');
  // …and the group that draws them is the one the flag gates.
  assert.match(VIEW, /\{showFrontDimensions && !contour && !hideFronts && \(/);
  // The scene hands both halves to every cabinet from one place.
  assert.match(SCENE, /suppressEdgeDims=\{meetingDims\[unit\.id\]\?\.suppress \|\| null\}/);
  assert.match(SCENE, /meetingDimRows=\{meetingDims\[unit\.id\]\?\.rows \|\| null\}/);
});

test('it is disabled in the CNC view, like its twin — never hidden', () => {
  // A control that disappears reads as a bug; the toolbar's own rule, and this
  // button follows it rather than inventing a second behaviour.
  const from = TOOLBAR.indexOf('aria-pressed={showFrontDimensions}');
  const mine = TOOLBAR.slice(from, from + 900);
  assert.match(mine, /disabled=\{viewMode !== '3d'\}/);
  assert.match(mine, /disabled:opacity-35 disabled:cursor-not-allowed/);
});
