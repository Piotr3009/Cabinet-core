import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ─── TURN 58 · F7 — LIGHTING: THE ICONS STOP HIDING, THE ROOM MOVES DOWN ───
//
// …and the owner's live amendment on the watch pane, which overrides the file
// where they differ:
//
//   *"nie przezroczysta i nie widać szuflady w środku przez szybę …
//   przezroczysta lub jakaś bardziej smoky brąz, a nie szara — nic nie
//   widać."*
//   *"światło powinno być z tyłu na półce — przy zamkniętej fajnie
//   oświetla."*

const ICONS = readFileSync(new URL('../src/3d/LedIcons.jsx', import.meta.url), 'utf8');
const UNIT_VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('../src/components/LightingPanel.jsx', import.meta.url), 'utf8');

/** A file with its PROSE taken out — the house quotes what it deletes, so a
 *  grep for a dead line finds the quotation unless the comments come out. */
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '');

// ═══ 1. THE ICONS ARE ALWAYS VISIBLE (licensed deletion 2) ══════════════════

test('F7.1 · the lightingOpen gate is GONE from the component', () => {
  const live = code(ICONS);
  assert.ok(!/const lightingOpen\s*=/.test(live), 'no modal read of its own');
  assert.ok(!/if \(!lightingOpen\) return null;/.test(live), 'and no gate');
  // ─── AMENDED BY T64 F1.3 ─────────────────────────────────────────────────
  // The owner, 03.09.2026: *"ikony LED … dopiero po włączeniu menu lights —
  // i też powinny zniknąć jak włączę światło ON."* The CLIENT'S room reads the
  // panel's flag again (`s.modal === 'lighting'`) — through the existing
  // channel gate and the `audience` flag, never through a gate of its own —
  // and PRO's branch is T58's, unchanged: `scripts/t64-led-law.mjs` runs the
  // file's own `ledIconState` and PRO answers "show" whatever the flags say.
  assert.ok(!/const lightingOpen\s*=/.test(live) && !/if \(!panelOpen\) return null;/.test(live),
    'the component grew a gate of its own again');
  // …and the dead line IS quoted in the prose, by the house rule: a deletion
  // nobody can read about is a deletion the next turn re-introduces.
  assert.match(ICONS, /if \(!lightingOpen\) return null;/,
    'the gate is quoted where the next reader will find it');
});

test('F7.1 · the T54 header is RE-HEADED with the order that overruled it', () => {
  assert.match(ICONS, /RE-HEADED IN TURN 58/, 'the header says which order won');
  assert.match(ICONS, /ALWAYS SHOW/i);
  // T54's own words are kept — they are still why the icons exist.
  assert.match(ICONS, /ludzie nie wiedzą, że takie funkcje istnieją/,
    'and T54\'s order is left standing, verbatim');
});

test('F7.1 · they are helpers, so no render, capture or PDF can carry them', () => {
  // Not loosened, and asserted on the FLAG rather than on a picture: every
  // mesh here is `ccHelper`, which is what the capture path strips.
  const live = code(ICONS);
  assert.match(live, /userData=\{\{ ccHelper: true \}\}/, 'the sprite is a helper');
  const groups = live.match(/ccHelper: true/g) || [];
  assert.ok(groups.length >= 2, 'the group and the sprite both carry it');
});

// ═══ 2. THE ROOM SECTION MOVES TO THE BOTTOM ════════════════════════════════

test('F7.2 · the room lamps stand BELOW the strip controls', () => {
  const rig = PANEL.indexOf('data-light-rig="1"');
  const strips = PANEL.indexOf('data-scene-light="1"');
  assert.ok(rig > 0 && strips > 0, 'both sections are still in the panel');
  assert.ok(rig > strips,
    'the four lamps and the room light come after the strip controls now');
});

test('F7.2 · ORDER ONLY — not one control is added, removed or renamed', () => {
  // Every hook the panel offered before this turn is still offered.
  for (const hook of [
    'data-light-rig="1"',
    'data-scene-light="1"',
    'data-scene-light-slider="1"',
    'data-scene-light-read="1"',
  ]) {
    assert.ok(PANEL.includes(hook), `${hook} survived the move`);
  }
  assert.match(PANEL, /ORDER ONLY/, 'and the move says so in the file');
});

// ═══ 3. THE PANE — THE OWNER'S AMENDMENT ════════════════════════════════════

test('F7.3 · the pane is off the TRANSMISSION path — the fault opacity could not fix', () => {
  const live = code(UNIT_VIEW);
  const pane = live.slice(live.indexOf('ccWatchGlass'), live.indexOf('ccWatchGlass') + 900);
  assert.ok(!/transmission=/.test(pane),
    'transmission renders through its own pass and comes back a slab where that pass has nothing to give it');
  assert.match(pane, /transparent/, 'plain alpha blending, which cannot silently fail');
  assert.match(pane, /depthWrite=\{false\}/, 'so the drawer under it draws through');
});

test('F7.3 · the tint is SMOKY BROWN and never grey', () => {
  assert.match(UNIT_VIEW, /const WATCH_GLASS_HEX = '#6b4f3a';/, 'his word, as a number');
  // The old cold blue-grey is gone from the pane.
  const live = code(UNIT_VIEW);
  assert.ok(!/#e6f1f2/.test(live), '"a nie szara" — the grey is not in the code any more');
  // Warm: red is the strongest channel, blue the weakest. That is what makes
  // it brown rather than grey, and it is checkable rather than a matter of eye.
  const hex = '#6b4f3a';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  assert.ok(r > g && g > b, `${hex} is warm: r ${r} > g ${g} > b ${b}`);
});

test('F7.3 · the material is REMOUNTED on its own flags — this file\'s own law', () => {
  // T11 wrote it down for X-ray and T57 walked into it here: a material three
  // has already compiled a program for does not grow a new one when a flag
  // changes. The key is how a new one is asked for.
  assert.match(UNIT_VIEW, /key=\{`watchglass-\$\{xray \? 'xray' : 'solid'\}`\}/);
});

test('F7.3 · the LED is ONE strip at the REAR — it cannot spill onto the fronts', () => {
  const live = code(UNIT_VIEW);
  const ring = live.slice(live.indexOf('const ring = useMemo'), live.indexOf('const ring = useMemo') + 900);
  // Four strips became one, and it is the one at z0 — the BACK of the aperture.
  assert.match(ring, /return \[\{ x: \(x0 \+ x1\) \/ 2, z: z0, w: x1 - x0, d: t \}\];/,
    'the rear strip, and nothing at the front edge to flood the drawer fronts');
  assert.ok(!/z: z1/.test(ring), 'the front strip is gone');
  // …and the area light went with it, or the spill comes straight back.
  assert.match(UNIT_VIEW, /mm\(ring\[0\]\?\.z \?\? \(pane\.box\.z \+ pane\.box\.d \/ 2\)\)/,
    'the light sits over the strip, not over the whole pane');
});

test('F7.3 · engine bytes do not move — this is paint and placement only', () => {
  // The cut, the rebate and the BOM line are T53/T55 law. Nothing in this
  // feature is outside src/3d and src/components.
  assert.ok(UNIT_VIEW.includes('ccWatchGlass'), 'the pane is still drawn from the engine\'s own record');
  assert.match(UNIT_VIEW, /pane\.box\.w/, 'and to the engine\'s own box');
});
