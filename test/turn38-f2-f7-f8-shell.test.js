// ─── TURN 38 · F2 / F7 / F8 — the shell, the measure and the thumbnail ──────
//
//   F2  full screen, a slim top bar, an AutoCAD-style toolbar, the canvas
//       taking everything else, a status bar under it.
//   F7  measure — screen only, never exported (iron rule 7).
//   F8  the 3-D preview becomes a thumbnail that grows, over the canvas.
//
// These are SURFACES, so most of what can be pinned in node is pinned off the
// source; the pictures are `verify/t38/` and the acceptance walk takes them
// from real pointer input.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { THUMB_SIZES, TOOLS, measureText, promptFor, TOOL_BY_ID } from '../src/lib/partTools.js';
import { maximiseInViewport } from '../src/lib/menuPlacement.js';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const PART = read('components/PartDetailModal.jsx');
const MODAL = read('components/Modal.jsx');

// ═══ F2 — THE SHELL ═════════════════════════════════════════════════════════

test('F2 — the editor covers the WHOLE viewport, with no page chrome behind it', () => {
  assert.match(PART, /\n      fullscreen\n/, 'the window asks for it');
  assert.match(MODAL, /fullscreen = false,/, 'and the ONE shell grants it, opt-in');
  // Margin zero, which is what "covers the whole viewport" means in arithmetic.
  assert.match(MODAL, /margin: fullscreen \? 0 : maximiseMarginPx/);
  const full = maximiseInViewport({ viewport: { width: 1600, height: 1000 }, margin: 0 });
  assert.deepEqual(full, {
    left: 0, top: 0, width: 1600, height: 1000,
  });
  // The body's own padding goes too — a canvas that IS the window cannot have
  // a 16 px frame round it.
  assert.match(MODAL, /fullscreen && big \? 'p-0 overflow-hidden'/);
  // …and the walk can read it off the DOM.
  assert.match(MODAL, /data-modal-fullscreen=/);
  // Rule 15's exception stays OPT-IN: every other window is unchanged.
  assert.equal((MODAL.match(/fullscreen = false/g) || []).length, 1);
});

test('F2 — the top bar is the title, the size and the close ×', () => {
  assert.match(PART, /data-editor-topbar="1"/);
  assert.match(PART, /data-editor-size="1"/);
  assert.match(PART, /formatMmPair\(panel\.w, panel\.h, ' × '\)/, 'the size, in the app’s own formatter');
  assert.match(PART, /formatMm\(panel\.thickness\)/);
  assert.match(MODAL, /data-modal-close="1"/, 'and the shell’s own ×');
  // The badge rides in the top bar, where the title is (turn 23, F9.3).
  assert.match(PART, /data-hand-edited=\{String\(changes\)\}/);
});

test('F2 — the toolbar is draw · modify · measure, in AutoCAD’s own groups', () => {
  assert.deepEqual(TOOLS.map((g) => g.group), ['draw', 'modify', 'measure']);
  const draw = TOOLS[0].items.map((t) => t.id);
  for (const t of ['line', 'polyline', 'circle', 'rect', 'arc']) assert.ok(draw.includes(t), `draw: ${t}`);
  const modify = TOOLS[1].items.map((t) => t.id);
  for (const t of ['move', 'copy', 'rotate', 'mirror', 'offset', 'trim', 'fillet', 'array']) {
    assert.ok(modify.includes(t), `modify: ${t}`);
  }
  assert.deepEqual(TOOLS[2].items.map((t) => t.id), ['measure']);
  // Every tool carries a GLYPH and a TOOLTIP — "small icons with tooltips".
  for (const g of TOOLS) {
    for (const t of g.items) {
      assert.ok(t.glyph, `${t.id} has an icon`);
      assert.ok(t.hint || t.id === 'select', `${t.id} has a tooltip`);
      assert.ok(t.label, `${t.id} has a name`);
    }
  }
  assert.match(PART, /data-tool-group=\{g\.group\}/, 'and the groups are readable from outside');
  // The two dropdowns are right-aligned, after a spacer.
  const at = PART.indexOf('data-layers-menu="1"');
  const spacer = PART.lastIndexOf('<span className="flex-1" />', at);
  assert.ok(spacer > 0 && spacer < at, 'layers ▾ and snap ▾ are pushed right');
});

test('F2 — the canvas takes everything else, and keeps every gesture it had', () => {
  assert.match(PART, /data-editor-canvas="1"/);
  assert.match(PART, /className="flex-1 min-h-0 relative/);
  // Wheel zoom, drag pan, double-click fit — turn 23's, through the shared
  // `lib/sheetView.js`, unchanged.
  assert.match(PART, /useSheetView\(\{/);
  assert.match(PART, /data-part-fit="1"/);
  assert.match(PART, /view\.fit\(\)/);
  assert.match(PART, /MIN_VIEW_MM/);
});

test('F2 — the chrome’s height is a CONSTANT, so the canvas never moves', () => {
  // ─── FOUND BY THE ACCEPTANCE WALK, 17.08.2026 ────────────────────────────
  //
  // Two clicks meant to be level came out 28 mm apart, every time, and only
  // ever the FIRST pair after a tool was armed. The cause was the chrome: the
  // toolbar grew by a button's height the moment a part had its first edit
  // (Undo and Back to computed appeared), and the status bar grew and shrank
  // with the tool in hand (Delete with Select, the pitch with the dowel line).
  // Either one pushes the canvas, the drawing re-fits to its new height, and
  // the set-out a joiner had lined up moves under his hand mid-gesture.
  //
  // So both strips are a fixed height and the two buttons are always there,
  // disabled until there is something to undo — which is this app's own
  // grammar for "nothing to act on" (turn 26's F12.4).
  assert.match(PART, /border-b border-shell-600 shrink-0 h-\[34px\]/, 'the toolbar');
  assert.match(PART, /border-t border-shell-600 text-\[11px\] text-ink-400 h-\[30px\]/, 'the status bar');
  assert.match(PART, /data-part-undo="1"\n\s*disabled=\{!changes\}/, 'Undo is always there');
  assert.match(PART, /data-back-to-computed="1"\n\s*disabled=\{!changes\}/, '…and so is Back to computed');
  assert.doesNotMatch(PART, /shrink-0 flex-wrap/, 'and nothing on the bar wraps to a second row');
});

test('F2 — the status bar carries the four things F2 names', () => {
  const at = PART.indexOf('data-editor-status="1"');
  assert.ok(at > 0, 'there is a status bar');
  const bar = PART.slice(at, at + 3000);
  assert.match(bar, /data-status-cursor="1"/, 'live cursor x/y in mm');
  assert.match(bar, /data-status-snap=/, 'the active snap kind');
  assert.match(bar, /data-status-layer=/, 'the active layer');
  assert.match(bar, /data-part-prompt="1"/, 'and the current tool hint');
  assert.match(bar, /formatMm\(cursor\.x\)/, 'the cursor is in the app’s own millimetres');
});

test('F2 — the tool hint says what the tool is waiting for', () => {
  assert.match(promptFor({
    tool: 'select', spec: TOOL_BY_ID.get('select'), pending: [], picked: null, selected: [],
  }), /Click a shape/);
  assert.match(promptFor({
    tool: 'select', spec: TOOL_BY_ID.get('select'), pending: [], picked: null, selected: ['o1', 'o2'],
  }), /2 selected.*Move, Copy, Rotate, Group, Delete/);
  assert.match(promptFor({
    tool: 'arc', spec: TOOL_BY_ID.get('arc'), pending: [{}], picked: null, selected: [],
  }), /Arc: 1 of 3 points/);
  assert.equal(promptFor({
    tool: 'array', spec: TOOL_BY_ID.get('array'), pending: [], picked: null, selected: [],
  }), TOOL_BY_ID.get('array').hint, 'a tool that takes no points says its own hint');
});

// ═══ F7 — MEASURE, AND IT NEVER LEAVES THE SCREEN ═══════════════════════════

test('F7 — a measurement is a distance, a dx and a dy', () => {
  const said = measureText({ from: { x: 100, y: 100 }, to: { x: 130, y: 140 } });
  assert.match(said, /measure 50/);
  assert.match(said, /dx 30/);
  assert.match(said, /dy 40/);
  assert.equal(measureText(null), '');
});

test('F7 — measurements are SCREEN state and cannot reach an override or a file', () => {
  // The list is component state, and the only things that ever go into it are
  // two points. It is never handed to `addOp`, `commitOps` or `addPartEdit`.
  assert.match(PART, /const \[measures, setMeasures\] = useState\(\[\]\)/);
  assert.match(PART, /setMeasures\(\(was\) => \[\.\.\.was, \{ from: next\[0\], to: next\[1\] \}\]\)/);
  assert.ok(!/addOp\([^)]*measure/i.test(PART), 'no measurement is ever committed');
  assert.ok(!/commitOps\([^)]*measures/.test(PART), '…nor written to the op list');
  // Iron rule 7: the ops the app can store are the eight in `partEdits.js`,
  // and `measure` is not one of them.
  const edits = read('engine/partEdits.js');
  const list = /const EDIT_OPS = \[([^\]]+)\]/.exec(edits)[1];
  assert.ok(!list.includes('measure'), 'the override list has no measure op');
  // They stack until Esc or a tool change clears them.
  assert.match(PART, /if \(measures\.length\) \{ e\.stopImmediatePropagation\(\); setMeasures\(\[\]\); return; \}/);
  assert.match(PART, /if \(id !== 'measure'\) setMeasures\(\[\]\)/);
  // …and they are drawn as an annotation, in their own ink.
  assert.match(PART, /data-measure=\{i\}/);
});

// ═══ F8 — THE THUMBNAIL THAT GROWS ══════════════════════════════════════════

test('F8 — three sizes, cycled by a double-click, and the last one comes round', () => {
  assert.deepEqual(THUMB_SIZES.map((s) => s.id), ['small', 'medium', 'large']);
  for (let i = 1; i < THUMB_SIZES.length; i += 1) {
    assert.ok(THUMB_SIZES[i].w > THUMB_SIZES[i - 1].w, 'each is bigger than the last');
    assert.ok(THUMB_SIZES[i].h > THUMB_SIZES[i - 1].h);
  }
  assert.match(PART, /setThumb\(\(was\) => \(was \+ 1\) % THUMB_SIZES\.length\)/, 'small → medium → large → small');
  assert.match(PART, /onDoubleClick=\{\(\) => setThumb/);
  assert.match(PART, /data-thumb-size=\{THUMB_SIZES\[thumb\]\.id\}/, 'and the walk can read which size it is');
});

test('F8 — it FLOATS over the canvas and never resizes the drawing area', () => {
  const at = PART.indexOf('data-part-canvas="1"');
  assert.ok(at > 0);
  const block = PART.slice(at - 400, at + 500);
  assert.match(block, /absolute left-2 bottom-2/, 'docked bottom-left, over the canvas');
  assert.match(block, /width: THUMB_SIZES\[thumb\]\.w/, 'sized by itself');
  // The 3-D CONTENT is the existing one, unchanged — the same `PartCanvas`
  // built on the room's own `MovingPanel`.
  assert.match(PART, /<PartCanvas\n/);
  assert.match(PART, /<MovingPanel/);
  assert.match(PART, /useContextGuard\('part-detail'\)/, 'and turn 20’s context guard rides with it');
});
