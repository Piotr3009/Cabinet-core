// ─── TURN 69 · F7 — ADDING A SHOE DRAWER MUST NOT KILL THE LIGHT ───────────
//
// CLAUDE.md, F7, verbatim:
//
//   *"Probe: add shoe, dump the light flag before/after, find the writer. Fix
//   to one law: nothing writes the light but the LIGHTS button and the client.
//   Commit the verdict."*
//
// `scripts/t69-f7-probe.mjs` is the probe and `verify/t69/f7-probe.md` the
// verdict: the law F7 asks for is the law that is already there. Nothing was
// patched, because nothing on any path a client walks was broken.
//
// WHAT THIS FILE IS, THEN. A law nobody can state is a law that will be broken
// by accident, and this is the statement: the flag survives every add, and the
// number of things that can write it is ONE. The second half is the one that
// matters in six months — it fails the day a seventh site appears that is not
// the LIGHTS control.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { rectCorners } from '../src/engine/room.js';
import { migrateDesign } from '../src/engine/design.js';
import { stripsForUnit } from '../src/engine/ledStrips.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const S = () => useProjectStore.getState();

const lightOn = () => Boolean(migrateDesign(S().project.design).lighting?.on);
const stored = () => (migrateDesign(S().project.design).lighting?.items || []).length;
const shelvesOf = (id) => (S().unitResult(id)?.panels || []).filter((p) => p.role === 'shelf');

/** What the ENGINE says is lit — not what the project stores. */
function lit(id) {
  const unit = S().units.find((u) => u.id === id);
  const result = S().unitResult(id);
  if (!unit || !result) return 0;
  return stripsForUnit({
    unit, result, design: migrateDesign(S().project.design), profile: getCabinetProfile(),
  }).length;
}

/** A wardrobe with the light ON and a strip under every shelf — the client's own two acts. */
function litWardrobe() {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1000, height: 2200, depth: 600 } });
  S().updateUnitParams(id, { width: 1000, height: 2200 });
  S().addShelves(id, 3);
  A.setLighting(true);
  for (const p of shelvesOf(id)) A.setShelfStrip(id, p.id, true);
  return id;
}

// ═══ 1 · THE SYMPTOM, MEASURED ══════════════════════════════════════════════

test('F7 · a shoe drawer added to a lit wardrobe leaves it lit', () => {
  const id = litWardrobe();
  assert.equal(lightOn(), true, 'this scene is meant to start lit');
  const before = lit(id);
  assert.ok(before >= 3, `only ${before} strips lit before the shoe — the scene proves nothing`);

  const made = S().addShoeDrawer(id);
  assert.ok(made, 'the shoe drawer was refused — this scene proves nothing');

  assert.equal(lightOn(), true, 'adding a shoe drawer turned the light off');
  assert.equal(stored(), before, 'adding a shoe drawer dropped a stored strip');
  assert.equal(lit(id), before, 'adding a shoe drawer put a strip out');
});

test('F7 · and neither does anything else a client can add', () => {
  for (const [label, add] of [
    ['a drawer', (id) => S().addDrawers(id, 1)],
    ['a shelf', (id) => S().addShelves(id, 1)],
    ['doors', (id) => S().addDoors(id)],
    ['an end panel', (id) => S().addEndPanel(id, { side: 'L' })],
  ]) {
    const id = litWardrobe();
    const before = lit(id);
    add(id);
    assert.equal(lightOn(), true, `${label} turned the light off`);
    assert.ok(lit(id) >= before, `${label} put a strip out`);
  }
});

test('F7 · the LIGHTS control still works — the guard is not "nothing can change it"', () => {
  const id = litWardrobe();
  assert.equal(lit(id) > 0, true);
  A.setLighting(false);
  assert.equal(lightOn(), false, 'the LIGHTS button stopped working');
  assert.equal(lit(id), 0, 'the strips still light with the job switched off');
  A.setLighting(true);
  assert.equal(lightOn(), true);
  assert.ok(lit(id) > 0, 'the strips did not come back');
});

// ═══ 2 · ONE WRITER — THE HALF THAT MATTERS IN SIX MONTHS ═══════════════════

const CODE = /\.(js|jsx)$/;
const walk = (dir) => readdirSync(dir).sort().flatMap((e) => {
  const path = join(dir, e);
  return statSync(path).isDirectory() ? walk(path) : (CODE.test(path) ? [path] : []);
});
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

test('F7 · every site that names `lighting.on` is the LIGHTS control or the default', () => {
  const strays = [];
  const throughSetter = [];
  const previews = [];

  for (const file of walk(join(ROOT, 'src'))) {
    const rel = relative(ROOT, file);
    const text = uncomment(readFileSync(file, 'utf8'));

    // The one setter, wherever it is called from.
    for (const m of text.matchAll(/setLighting\(\s*\{[^}]*\bon\b/g)) {
      throughSetter.push(`${rel}:${text.slice(0, m.index).split('\n').length}`);
    }
    // …and anything that builds a `lighting: { on: … }` object by hand.
    for (const m of text.matchAll(/lighting:\s*\{[^}]*\bon\b\s*:/g)) {
      const at = `${rel}:${text.slice(0, m.index).split('\n').length}`;
      const near = text.slice(Math.max(0, m.index - 60), m.index);
      // A LOCAL PREVIEW spreads an existing design into a NEW object for a
      // renderer and never reaches the store. It is not a writer.
      if (/\.\.\.design,|\.\.\.migrated,|\.\.\.d,/.test(near)) { previews.push(at); continue; }
      // `DEFAULT_DESIGN` is the shape, not a write.
      if (/on: false, temperature/.test(text.slice(m.index, m.index + 60))) continue;
      strays.push(at);
    }
  }

  assert.deepEqual(strays, [],
    `something other than the LIGHTS control writes the light:\n  ${strays.join('\n  ')}`);
  // Counted, so a test that had stopped finding anything would be caught
  // rather than believed.
  assert.ok(throughSetter.length >= 4,
    `only ${throughSetter.length} calls to setLighting found — the scan has gone blind`);
  assert.ok(previews.length > 0, 'the preview scan has gone blind');
});

test('F7 · and the ONE setter is the store\'s, in both apps', () => {
  const store = readFileSync(join(ROOT, 'src/stores/projectStore.js'), 'utf8');
  assert.match(store, /setLighting: \(patch\) => \{/, 'the store lost its lighting setter');
  // Retail reaches it through the adapter and nowhere else.
  const adapter = readFileSync(join(ROOT, 'src/retail/design/adapter.js'), 'utf8');
  assert.equal((adapter.match(/S\(\)\.setLighting\(/g) || []).length, 1,
    'retail has more than one door to the light');
  // PRO's own two: the LIGHTING panel's ON/OFF and the View menu's toggle.
  const panel = readFileSync(join(ROOT, 'src/components/LightingPanel.jsx'), 'utf8');
  assert.match(panel, /setLighting\(\{ on: true \}\)/);
  assert.match(panel, /setLighting\(\{ on: false \}\)/);
  assert.match(readFileSync(join(ROOT, 'src/components/TopBar.jsx'), 'utf8'),
    /setLighting\(\{ on: !lightOn \}\)/);
});

test('F7 · no ADD action anywhere so much as mentions the light', () => {
  const store = uncomment(readFileSync(join(ROOT, 'src/stores/projectStore.js'), 'utf8'));
  for (const name of ['addShoeDrawer', 'addDrawers', 'addShelves', 'addDoors', 'addUnit', 'addItem']) {
    const from = store.indexOf(`  ${name}: (`);
    assert.ok(from > 0, `${name} is gone from the store`);
    // To the next top-level action, which is where this one ends.
    const next = store.slice(from + 1).search(/\n {2}[a-zA-Z]+: \(/);
    const body = store.slice(from, next > 0 ? from + 1 + next : from + 6000);
    assert.ok(!/setLighting|lighting:/.test(body), `${name} touches the light`);
  }
});
