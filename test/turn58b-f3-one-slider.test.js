import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { jpullEdgeHeight, jpullSpec } from '../src/engine/handles.js';
import { onJpullStrip } from '../src/3d/jpullProfile.js';

// ─── TURN 58b · F3 — THE NUMBERS LEAVE THE SCREEN, ONE SLIDER REMAINS ──────
//
// The owner, 30.08.2026:
//
//   *"jakieś dziwne ustawienia, po co mi to? ja nie chcę tego… jak już to
//   pasek albo pokrętło… jedynie wysokość — jeden pasek, przedłuż wycięcie J
//   na pionowych i tyle, nic więcej."*
//   *"będzie w 2 miejscach do włączenia — do zmiany."*
//
// T57 put NINE jpull numbers on the screen in TWO places. Eight of them go
// back to being what they always were — engine constants in the workshop's
// profile — and the ninth, the RUN, becomes a per-LEAF override on one
// slider, reached by clicking the J strip itself.

const MODAL = readFileSync(new URL('../src/components/JpullRunModal.jsx', import.meta.url), 'utf8');
const SETTINGS = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');
const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const UNIT_VIEW = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
const SCENE = readFileSync(new URL('../src/3d/Scene.jsx', import.meta.url), 'utf8');
const STORE = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
const LAYER = readFileSync(new URL('../src/lib/modalLayer.js', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../src/pages/ConfiguratorPage.jsx', import.meta.url), 'utf8');

/** A file with its PROSE taken out — the house quotes what it deletes. */
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '');

const WARDROBE = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const JPULL = { type: 'jpull' };
const build = (over = {}) => computeCabinet({
  ...WARDROBE, width: 1000, height: 2200, door_count: 2, project_handle: JPULL, ...over,
}, P);
/** The first leaf that actually carries a stopped vertical run. */
const tallLeaf = (r) => r.panels.find((p) => p.role === 'front' && p.meta?.jpull?.run);

// ═══ 1. THE DELETION IS PHYSICAL, AND IT IS BOTH PLACES ═══════════════════

test('F3.1 · the nine numeric fields are gone from BOTH entry points', () => {
  const s = code(SETTINGS);
  const w = code(WIZ);
  assert.ok(!/JPULL_FIELDS/.test(s), 'the table is gone');
  assert.ok(!/JpullHardware/.test(s), 'the component is gone');
  assert.ok(!/data-jpull-settings/.test(s), 'and its hook with it');
  assert.ok(!/jpullSpec/.test(s), 'the import that fed it is gone too — no dead reader');
  assert.ok(!/JpullHardware/.test(w), 'the wizard renders none of it');
  assert.ok(!/data-wizard-node="hardware\.jpull"/.test(w), 'and its node is gone');
  // The house rule: what is deleted is QUOTED where the next reader will find
  // it, or the next turn writes it again.
  assert.match(SETTINGS, /JPULL_FIELDS` and `JpullHardware` stood here/);
  assert.match(WIZ, /licensed deletion 2/);
});

test('F3.1 · the constants are UNEXPOSED, not lost — the profile still has all nine', () => {
  const spec = jpullSpec(P);
  for (const k of ['runMm', 'fromBottomMm', 'rampR', 'lipT', 'slotW', 'slotDepth', 'slotR', 'rearLeg', 'reliefMm']) {
    assert.ok(Number.isFinite(spec[k]), `${k} is still a workshop number`);
  }
  // …and no component in the app offers any of them as a field.
  const components = readdirSync(new URL('../src/components/', import.meta.url))
    .filter((f) => f.endsWith('.jsx'))
    .map((f) => readFileSync(new URL(`../src/components/${f}`, import.meta.url), 'utf8'))
    .join('\n');
  for (const k of ['fromBottomMm', 'rampR', 'lipT', 'slotW', 'slotDepth', 'slotR', 'rearLeg', 'reliefMm']) {
    assert.ok(!new RegExp(`k: '${k}'`).test(code(components)), `${k} is typeable nowhere`);
  }
});

test('F3.1 · the handle-system CHOICE is untouched, in both of its homes', () => {
  // The owner deleted the NUMBERS, never the choice. It stays exactly where
  // handle systems have always been chosen.
  assert.match(WIZ, /data-wizard-node="fronts\.opening"/, 'the project-level tiles stand');
  assert.match(WIZ, /FRONT_OPENINGS\.map/);
  const door = readFileSync(new URL('../src/components/DoorModal.jsx', import.meta.url), 'utf8');
  assert.match(door, /HANDLE_TYPES/, 'and the per-front chooser stands');
});

// ═══ 2. ONE SLIDER, AND NOTHING ELSE IN THAT WINDOW ═══════════════════════

test('F3.2 · the window holds exactly ONE control', () => {
  const ranges = MODAL.match(/type="range"/g) || [];
  assert.equal(ranges.length, 1, 'one slider — the owner counted');
  assert.equal((MODAL.match(/<input/g) || []).length, 1, 'and it is the only input');
  assert.ok(!/<NumberField/.test(MODAL), 'a slider, not a number field');
  assert.ok(!/<select/.test(MODAL), 'and no second control of any kind');
  assert.match(MODAL, /aria-label="J run length"/);
  assert.match(MODAL, /const MIN_RUN_MM = 300;/, '300 is the floor the spec names');
  assert.match(MODAL, /const STEP_MM = 10;/, 'step 10');
  // Start height and ramp radius are NOT exposed — engine constants.
  assert.ok(!/rampR/.test(MODAL));
  assert.ok(!/setProfile/.test(MODAL), 'nothing here writes the workshop profile');
});

test('F3.2 · it is the house shell, named, anchored and draggable', () => {
  assert.match(MODAL, /import Modal from '\.\/Modal\.jsx'/, 'rule 15: one shell');
  assert.match(MODAL, /<Modal\b/);
  assert.match(MODAL, /name="jpull-run"/);
  assert.match(MODAL, /anchor=\{anchor\}/, 'BESIDE the object it concerns');
  assert.ok(!/fixed inset-0/.test(MODAL), 'it draws no backdrop of its own');
  assert.match(LAYER, /'jpull-run': \{ about: 'object'/, 'registered, and about an OBJECT');
  assert.match(PAGE, /modal === 'jpull-run' && <JpullRunModal \/>/, 'and mounted');
});

test('F3.2 · the click path exists: J strip → Scene → the window, with an anchor', () => {
  assert.match(UNIT_VIEW, /onJpullStrip\(p, local\.x \/ MM, local\.y \/ MM\)/,
    'the view recognises the strip in the leaf\'s own frame');
  assert.match(UNIT_VIEW, /onEditJpull\(p\.id, \{ x: e\.clientX, y: e\.clientY \}\)/,
    'and hands out a raw client point, as every other 3-D gesture does');
  assert.match(SCENE, /openModal\('jpull-run', \{/);
  assert.match(SCENE, /anchor: \{\n\s*x: at\.x, y: at\.y, width: 0, height: 0,/,
    'the parent makes the anchor — the shell guard demands one');
});

// ═══ 3. THE HIT TEST IS ARITHMETIC, NOT AN EYE ════════════════════════════

test('F3.2 · the strip answers a click on it, and the door does not', () => {
  const r = build();
  const leaf = tallLeaf(r);
  assert.ok(leaf, 'a 2200 tall wardrobe door carries a stopped run');
  const { edge, run } = leaf.meta.jpull;
  assert.ok(edge === 'L' || edge === 'R', 'and it is the VERTICAL strip');
  const w = leaf.box.w;
  const h = leaf.box.h;
  const depth = leaf.cnc.jpull.profile.slotDepth;
  const onSide = (x) => (edge === 'R' ? w / 2 - x : x + w / 2);
  // Mid-run, one millimetre in from the machined edge: a hit.
  const midY = (run.from + run.to) / 2 - h / 2;
  const inX = edge === 'R' ? w / 2 - 1 : 1 - w / 2;
  assert.equal(onJpullStrip(leaf, inX, midY), true, 'mid-run, on the edge');
  // The same height, out in the middle of the door: not the strip.
  assert.equal(onJpullStrip(leaf, 0, midY), false, 'the door face is not the J');
  // On the edge but BELOW where the run starts: not the strip.
  assert.equal(onJpullStrip(leaf, inX, run.from - h / 2 - 10), false, 'below the run');
  assert.equal(onJpullStrip(leaf, inX, run.to - h / 2 + 10), false, 'above the run');
  // The OTHER edge is not the J either.
  const otherX = edge === 'R' ? 1 - w / 2 : w / 2 - 1;
  assert.equal(onJpullStrip(leaf, otherX, midY), false, 'the hinge edge carries no J');
  // The band is exactly the slot's own depth.
  assert.ok(onSide(inX) < depth);
});

test('F3.2 · a front with no J, or a TOP-edge J, answers nothing', () => {
  const plain = computeCabinet({ ...WARDROBE, width: 1000, height: 2200, door_count: 2 }, P);
  const door = plain.panels.find((p) => p.role === 'front');
  assert.equal(onJpullStrip(door, 0, 0), false, 'no J, no strip');
  // A DRAWER front takes its J on the TOP edge and has no run to lengthen.
  const drawers = build({ drawers: 3 });
  const df = drawers.panels.find((p) => p.part === 'DRAWER-FRONT' && p.meta?.jpull);
  if (df) {
    assert.equal(df.meta.jpull.run ?? null, null, 'a top-edge J has no stopped run');
    assert.equal(onJpullStrip(df, 0, 0), false);
  }
});

// ═══ 4. THE VALUE IS PER LEAF, AND THE ENGINE READS IT ════════════════════

test('F3.3 · nothing said means the profile\'s own run — byte for byte', () => {
  const r = build();
  const leaf = tallLeaf(r);
  const spec = jpullSpec(P);
  assert.equal(leaf.meta.jpull.run.from, spec.fromBottomMm);
  assert.equal(leaf.meta.jpull.run.to - leaf.meta.jpull.run.from, spec.runMm);
  // An empty override map is the same as no map at all.
  const empty = build({ front_jpull: {} });
  assert.deepEqual(tallLeaf(empty).meta.jpull.run, leaf.meta.jpull.run);
  assert.deepEqual(tallLeaf(empty).cnc.jpull, leaf.cnc.jpull);
});

test('F3.3 · one leaf\'s own run is believed, and reaches the machining', () => {
  const base = build();
  const leaf = tallLeaf(base);
  const want = 900;
  const r = build({ front_jpull: { [leaf.id]: { jpull_run_mm: want } } });
  const mine = r.panels.find((p) => p.id === leaf.id);
  const spec = jpullSpec(P);
  assert.equal(mine.meta.jpull.run.from, spec.fromBottomMm, 'the START is not exposed and does not move');
  assert.equal(mine.meta.jpull.run.to - mine.meta.jpull.run.from, want, 'the RUN is the leaf\'s own');
  assert.equal(mine.cnc.jpull.to, mine.meta.jpull.run.to, 'and the cut follows it');
  // …and it is ONE leaf. The other door keeps the workshop's run.
  const other = r.panels.find((p) => p.role === 'front' && p.meta?.jpull?.run && p.id !== leaf.id);
  if (other) {
    assert.equal(other.meta.jpull.run.to - other.meta.jpull.run.from, spec.runMm,
      'a per-LEAF override moves one leaf');
  }
});

test('F3.3 · the leaf still clamps rather than running off its own edge', () => {
  const base = build();
  const leaf = tallLeaf(base);
  const edgeH = jpullEdgeHeight(leaf, leaf.meta.jpull.edge);
  const spec = jpullSpec(P);
  const tooLong = Math.round(edgeH - spec.fromBottomMm) + 500;
  const r = build({ front_jpull: { [leaf.id]: { jpull_run_mm: tooLong } } });
  const mine = r.panels.find((p) => p.id === leaf.id);
  assert.equal(mine.meta.jpull.run.clamped, true, 'the engine clamps, it does not obey blindly');
  assert.equal(mine.meta.jpull.run.to, edgeH, 'and stops at the leaf\'s own edge');
  assert.ok((r.warnings || []).some((w) => w.code === 'JPULL_RUN_CLAMPED'), 'and it says so');
});

test('F3.3 · the store keeps it in the house grammar, and hands it back', () => {
  assert.match(STORE, /setFrontJpullRun: \(unitId, panelId, runMm\) => \{/);
  assert.match(STORE, /front_jpull: Object\.keys\(map\)\.length \? map : null/,
    'null when the map empties — the same shape front_handles keeps');
  assert.match(STORE, /front_jpull: p\.front_jpull \|\| null,/, 'and it reaches the engine');
  assert.match(STORE, /frontJpullRunOf: \(unitId, panelId\)/, 'with a reader beside it');
});
