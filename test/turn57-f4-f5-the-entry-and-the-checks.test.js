import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { runChecks, CHECKS } from '../src/engine/checks.js';
import { migrateDesign } from '../src/engine/design.js';
import {
  FRONT_OPENINGS, FRONT_OPENING_IDS, frontOpening, frontOpeningPatch, frontOpeningLabel,
} from '../src/lib/frontOpening.js';
import { HANDLE_TYPES, jpullSpec } from '../src/engine/handles.js';

// ─── TURN 57 · F4 — THE UI ENTRY, AND F5 — THE CHECKS SAY WHY ──────────────
//
// F4.1: *"Wherever the handle system is chosen today, `J-pull handleless`
// appears — the EXISTING selector learns one option; no new modal."* There are
// exactly two places a handle system is chosen in this app, and both learn it
// from a list rather than from a new screen: the project-level opening
// selector (`lib/frontOpening.js` → WizardSettings) and the per-front one
// (`engine/handles.js HANDLE_TYPES` → DoorModal).
//
// F5: a J-pull IS the whole handle. A leaf that quietly missed its machining
// is a door with no way to open it, so the refusal and the clamp both SPEAK,
// in the house voice, with the unit and the leaf named.

const SETTINGS = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');
const DOOR = readFileSync(new URL('../src/components/DoorModal.jsx', import.meta.url), 'utf8');
const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');

/** A file with its PROSE taken out — the house quotes what it deletes, so a
 *  grep for a dead name finds the quotation unless the comments come out. */
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^\s*\*.*$/gm, '');

const WARDROBE = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const JPULL = { type: 'jpull' };
const STEEP = { pts: [{ x: 0, y: 700 }, { x: 700, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 };
const SHALLOW = { pts: [{ x: 0, y: 1000 }, { x: 600, y: 2200 }, { x: 1000, y: 2200 }], infill: 40 };

const build = (over = {}) => computeCabinet({
  ...WARDROBE, width: 1000, height: 2200, door_count: 2, project_handle: JPULL, ...over,
}, P);
/** One unit, wrapped the way `runChecks` takes it. */
const checksFor = (result, num = '01') => runChecks({
  entries: [{ unit: { id: 'u1', params: { unit_num: num } }, result }], profile: P,
});

// ─── F4.1 · THE EXISTING SELECTORS LEARN ONE OPTION ────────────────────────

test('F4 — the project-level opening selector offers J-pull handleless', () => {
  assert.deepEqual(FRONT_OPENING_IDS, ['push', 'handles', 'knobs', 'jhandle'],
    'still exactly the owner\'s four — no fifth button, no new modal');
  assert.equal(frontOpeningLabel('jhandle'), 'J-pull handleless');
  const entry = FRONT_OPENINGS.find((o) => o.id === 'jhandle');
  assert.match(entry.hint, /own edge/, 'and it says what it is');
  assert.match(entry.hint, /nothing is screwed on/);
  // It is rendered by the ONE selector that already exists (T44's), which is
  // what "no new modal" means when it is checked rather than promised.
  assert.match(WIZ, /data-wizard-node="fronts\.opening"/);
  assert.match(WIZ, /FRONT_OPENINGS\.map/);
});

test('F4 — choosing it puts the project on the HANDLE axis, and leaves the shape', () => {
  const shaker = migrateDesign({ fronts: { style: 'S' } });
  const patch = frontOpeningPatch(shaker, 'jhandle');
  assert.deepEqual(patch.fronts.handle, { type: 'jpull' });
  assert.equal(patch.fronts.style, 'S', 'a shaker door with a J edge is sayable');
  assert.equal(frontOpening(migrateDesign(patch)), 'jhandle', 'and it reads back');
});

test('F4 — the per-front selector learns it too, from the same list', () => {
  const j = HANDLE_TYPES.find((t) => t.id === 'jpull');
  assert.ok(j, 'HANDLE_TYPES carries it');
  assert.equal(j.label, 'J-pull handleless');
  // DoorModal renders HANDLE_TYPES — it needed no edit at all, which is the
  // point of putting the system in the list the UI already reads.
  assert.match(DOOR, /HANDLE_TYPES/);
  assert.match(DOOR, /HANDLE_TYPES\.map/);
});

// ─── F4.2 · THE MILLIMETRES ARE ON A SETTINGS SURFACE ──────────────────────

// ─── OVERTURNED IN TURN 58b (CLAUDE.md F3.1, licensed deletion 2) ──────────
//
// T57's F4.2 put NINE jpull numbers on the screen, in TWO places. The owner,
// 30.08.2026, on being shown them:
//
//   *"jakieś dziwne ustawienia, po co mi to? ja nie chcę tego… jak już to
//   pasek albo pokrętło… jedynie wysokość — jeden pasek, przedłuż wycięcie J
//   na pionowych i tyle, nic więcej."*
//   *"będzie w 2 miejscach do włączenia — do zmiany."*
//
// So the block is DELETED — physically, from both entry points — and the test
// that demanded it is inverted rather than removed: the claim a later turn
// needs to be held to is that these numbers do not come back.
test('F4 (T58b) — the jpull numeric block is GONE from both entry points', () => {
  assert.ok(!/data-jpull-settings="1"/.test(code(SETTINGS)), 'the block is gone from Settings');
  assert.ok(!/export function JpullHardware/.test(code(SETTINGS)), '…and so is its component');
  assert.ok(!/JPULL_FIELDS = \[/.test(code(SETTINGS)), '…and its field table');
  assert.ok(!/import \{ jpullSpec \}/.test(code(SETTINGS)), '…and the import that fed it');
  assert.ok(!/JpullHardware/.test(code(WIZ)), 'the wizard imports and renders nothing of it');
  assert.ok(!/<div data-wizard-node="hardware\.jpull">/.test(code(WIZ)), '…and its node is gone');
  // Not one of the nine is a typeable field anywhere in the components tree.
  const components = readdirSync(new URL('../src/components/', import.meta.url))
    .filter((f) => f.endsWith('.jsx'))
    .map((f) => readFileSync(new URL(`../src/components/${f}`, import.meta.url), 'utf8'))
    .join('\n');
  // …and the prose of every one of them, out: the house QUOTES what it deletes.
  for (const k of ['runMm', 'fromBottomMm', 'rampR', 'lipT', 'slotW', 'slotDepth', 'slotR', 'rearLeg', 'reliefMm']) {
    assert.ok(!new RegExp(`k: '${k}'`).test(code(components)), `${k} has no field anywhere`);
  }
});

test('F4 (T58b) — the constants stay in the PROFILE, exactly where they were', () => {
  // Deleted from the screen is not deleted from the workshop: `jpullSpec`
  // still answers all nine, and the engine still reads them live.
  const spec = jpullSpec(P);
  for (const k of ['runMm', 'fromBottomMm', 'rampR', 'lipT', 'slotW', 'slotDepth', 'slotR', 'rearLeg', 'reliefMm']) {
    assert.ok(Number.isFinite(spec[k]), `${k} is still a profile number`);
  }
});

test('F4 (T58b) — ONE slider remains, and it is the RUN', () => {
  const modal = readFileSync(new URL('../src/components/JpullRunModal.jsx', import.meta.url), 'utf8');
  const ranges = modal.match(/type="range"/g) || [];
  assert.equal(ranges.length, 1, 'one control, and nothing else — the owner counted');
  assert.match(modal, /aria-label="J run length"/);
  assert.match(modal, /min=\{MIN_RUN_MM\}/);
  assert.match(modal, /step=\{STEP_MM\}/);
  assert.match(modal, /const MIN_RUN_MM = 300;/, 'the owner\'s own floor');
  assert.match(modal, /const STEP_MM = 10;/);
  // The two he did NOT ask for are not controls here: the start height is READ
  // (it is the slider's ceiling) and never written, and the ramp radius is not
  // mentioned at all.
  assert.ok(!/rampR/.test(modal), 'the ramp radius is an engine constant');
  assert.ok(!/setProfile/.test(modal), 'and nothing here writes the workshop profile');
  assert.ok(!/<NumberField/.test(modal), 'a slider, not a number field');
});

test('F4 — and the engine reads them live, the way doors.gap is read', () => {
  const tuned = { ...P, handles: { ...P.handles, jpull: { ...P.handles.jpull, runMm: 300, fromBottomMm: 800 } } };
  assert.equal(jpullSpec(tuned).runMm, 300);
  const r = computeCabinet({
    ...WARDROBE, width: 1000, height: 2200, door_count: 2, project_handle: JPULL,
  }, tuned);
  const [front] = r.panels.filter((p) => p.role === 'front');
  assert.deepEqual(front.meta.jpull.run, { from: 800, to: 1100, clamped: false },
    'a typed number reaches the cut without a rebuild of anything');
});

// ─── F5 · THE CHECKS SAY WHY ───────────────────────────────────────────────

test('F5 — the rule is in the list, with a label a person can read', () => {
  const row = CHECKS.find((c) => c.n === 25);
  assert.ok(row, 'rule 25 exists');
  assert.equal(row.level, 'red');
  assert.match(row.label, /J-pull/);
});

test('F5 — a REFUSED run is RED, and names the unit and the leaf', () => {
  const r = build({ slope_cut: STEEP });
  const found = checksFor(r).filter((f) => f.check === 25);
  assert.equal(found.length, 1, 'one leaf refused');
  const [f] = found;
  assert.equal(f.level, 'red');
  assert.equal(f.unitNum, '01', 'the unit');
  assert.equal(f.panelId, '01-FL', 'and the leaf');
  assert.match(f.message, /^01 01-FL: /, 'both, at the front of the sentence');
  assert.match(f.message, /there is no leaf to machine/);
  assert.match(f.message, /no handle at all/, 'and what that MEANS for the door');
  assert.equal(f.reason, 'too-short');
  // A click flies to the piece, like every other per-panel rule.
  assert.deepEqual(f.subject, { unitId: 'u1', panelId: '01-FL', editor: 'element' });
});

test('F5 — a CLAMPED run is YELLOW: the app did the right thing and says so', () => {
  const r = build({ slope_cut: SHALLOW });
  const found = checksFor(r).filter((f) => f.check === 25);
  assert.equal(found.length, 1);
  const [f] = found;
  assert.equal(f.level, 'yellow', 'a shorter run is a working handle, not a fault');
  assert.equal(f.panelId, '01-FL');
  assert.match(f.message, /cut short to/);
  assert.match(f.message, /It is machined with the run it can hold/);
  assert.equal(f.reason, 'clamped');
});

test('F5 — no silent skips: every jpull warning the engine raises reaches a line', () => {
  for (const cut of [STEEP, SHALLOW]) {
    const r = build({ slope_cut: cut });
    const raised = r.warnings.filter((w) => /^JPULL_/.test(w.code));
    const said = checksFor(r).filter((f) => f.check === 25);
    assert.equal(said.length, raised.length, `${raised.length} raised, ${said.length} said`);
    for (const w of raised) {
      assert.ok(said.some((f) => f.panelId === w.panel), `${w.panel} was raised and never said`);
    }
  }
});

test('F5 — a J-pull kitchen with nothing wrong says NOTHING', () => {
  const r = build();
  assert.equal(r.warnings.filter((w) => /^JPULL_/.test(w.code)).length, 0);
  assert.equal(checksFor(r).filter((f) => f.check === 25).length, 0);
});

test('F5 — and a project with no J-pull at all never hears of the rule', () => {
  const bar = computeCabinet({
    ...WARDROBE, width: 1000, height: 2200, door_count: 2, project_handle: { type: 'bar' },
  }, P);
  assert.equal(checksFor(bar).filter((f) => f.check === 25).length, 0);
  const bare = computeCabinet({ ...WARDROBE, width: 1000, height: 2200, door_count: 2 }, P);
  assert.equal(checksFor(bare).filter((f) => f.check === 25).length, 0);
});
