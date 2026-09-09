// ─── TURN 65 · F4 — STRAIGHT ON AND CLOSER, AS IN PRO ───────────────────────
//
// The owner: *"default ustawienie sceny pokoju prosto i bliżej — dokładnie jak
// w PRO."*
//
// CLAUDE.md F4 sends the reader to `src/3d/cameraPresets.js` "and whatever
// PRO's first-mount uses". The first half of that is a false lead, and the
// file says so itself — which is the whole finding of this feature.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

test('F4 · PRO does not use cameraPresets.js at all — its default is the Canvas\'s own', () => {
  // The file's own claim, still true: nothing under PRO's frozen tree imports
  // it. So "PRO's default camera" cannot be one of its three presets.
  for (const rel of ['src/App.jsx', 'src/main.jsx', 'index.html']) {
    assert.ok(!/cameraPresets/.test(read(rel)), `${rel} imports cameraPresets.js`);
  }
  // …and no file under PRO's two frozen component trees names it either.
  for (const dir of ['src/components', 'src/pages']) {
    for (const f of readdirSync(join(ROOT, dir))) {
      if (!/\.jsx?$/.test(f)) continue;
      assert.ok(!/cameraPresets/.test(read(`${dir}/${f}`)), `${dir}/${f} imports cameraPresets.js`);
    }
  }
  // PRO's default IS this, on the Canvas both applications mount:
  assert.match(code('src/3d/Scene.jsx'),
    /camera=\{\{ position: \[0, roomH \* 0\.95, mm\(bounds\.depth\) \* 1\.25 \+ roomW \* 0\.35\], fov: 38/,
    "PRO's Canvas camera has moved — F4's whole reference point");
});

test('F4 · retail parks NOTHING on the first frame, so its first view IS PRO\'s', () => {
  const room = code('src/retail/design/DesignRoom.jsx');
  // T64's park is gone…
  assert.ok(!/applyPreset\('front', h\)/.test(room), 'the first frame still parks a preset');
  // …and what happens instead is a READ, not a write.
  assert.match(room, /requestAnimationFrame\(\(\) => \{ rememberHome\(h\); \}\)/);
  // Nothing else moves the camera at boot either.
  assert.ok(!/parkCamera\(/.test(room), 'the room parks the camera somewhere');
  // The bar lights no preset, because the room is not standing at one.
  assert.match(room, /useState\(null\);/);
});

test('F4 · RESET VIEW returns to that same view — the same number by construction', () => {
  const stage = code('src/retail/design/Stage.jsx');
  // The home view is READ from the live scene once and written back on reset.
  assert.match(stage, /export function rememberHome\(\) \{[\s\S]*?home = readCamera\(\) \|\| null;/);
  assert.match(stage, /export function resetStageView\(handle\) \{[\s\S]*?writeCamera\(home\)/);
  // It is remembered ONCE — a second read after an orbit would make RESET
  // return to wherever the client last happened to be.
  assert.match(stage, /if \(home\) return home;/);
  // No arithmetic on this side: the position is never recomputed here, so
  // there is no second copy of PRO's number to drift from it.
  assert.ok(!/roomH \* 0\.95|roomW \* 0\.35/.test(stage), 'retail has copied PRO\'s camera arithmetic');
});

test('F4 · the three presets are untouched — FRONT is still a place to stand', () => {
  const presets = read('src/3d/cameraPresets.js');
  assert.match(presets, /export const CAMERA_PRESETS = \['front', 'inside', 'room'\]/);
  assert.match(presets, /if \(preset === 'front'\)/);
  // …and FRONT remains the honest fallback for a reset before the first frame.
  assert.match(code('src/retail/design/Stage.jsx'), /return applyPreset\('front', handle\)/);
});
