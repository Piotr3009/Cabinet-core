import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  T44_DEFAULTS, TILE_SWATCH_PX, WARDROBE_DEPTH_MM, dimensionAsked,
} from '../src/lib/wizardTabs.js';
import {
  FRONT_OPENINGS, FRONT_OPENING_IDS, J_HANDLE_STYLE, frontOpening, frontOpeningLabel,
  frontOpeningPatch,
} from '../src/lib/frontOpening.js';
import { migrateDesign, projectHeights, roughnessFromSheen } from '../src/engine/design.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { projectDepth } from '../src/engine/projectSettings.js';

// ─── TURN 44 · F3 · F4 · F5 — THE FIRST THREE TABS ──────────────────────────
//
// F3 (Ustawienia): read-only basics, the settings-set dropdown, the three
// dimensions with their T44 defaults, and the kitchen-only heights.
// F4 (Carcases): the counting question, N submodals, the picker that stops
// fighting you, the sheets assignment.
// F5 (Fronts): the same procedure, then front type + opening + shine.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('../src/components/MaterialChoicePanel.jsx', import.meta.url), 'utf8');

// ══ F3 ═════════════════════════════════════════════════════════════════════

// ─── T45 F2 SUPERSEDES THIS ONE ────────────────────────────────────────────
// T44 made Number and Client read-only; T45's F2 removes them from 5.1
// altogether (iron rule 4, by name) because a greyed copy of an answer step 1
// already took is still two places one fact is written down. What survives is
// the TYPE, and it survives as a label. See
// test/turn45-f2-one-codebase-two-entries.test.js for the rest.
test('F3 — the Type is a LABEL in the wizard, editable from the menu', () => {
  assert.match(WIZ, /data-wizard-type-label="1"/, 'the type is a label in the wizard');
  assert.match(WIZ, /data-project-type="1"/, '…and an editable select from the menu, which has no step 2 to go back to');
});
test('F3 — the saved settings set is a DROPDOWN, default “Default settings”', () => {
  assert.match(WIZ, /const DEFAULT_SET_LABEL = 'Default settings';/);
  assert.match(WIZ, /data-settings-set-select="1"/);
  assert.match(WIZ, /<option value="">\{DEFAULT_SET_LABEL\}<\/option>/);
  assert.match(WIZ, /data-set-load=\{s\.id\}/, 'every set is still loadable by id');
});

test('F3 — the two licensed removals, and NOTHING else', () => {
  // 1 · `Keep as…` — relocated to F8's finale modal.
  assert.doesNotMatch(WIZ, /placeholder="Keep as…"/);
  assert.doesNotMatch(WIZ, /data-set-name="1"/);
  const finale = readFileSync(new URL('../src/components/SaveSettingsSetModal.jsx', import.meta.url), 'utf8');
  assert.match(finale, /data-set-name="1"/, 'it lives in the finale now');
  // 2 · `Room setup…` — it belongs to the Scope/Room step.
  assert.doesNotMatch(WIZ, /data-room-setup="1"/);
  assert.doesNotMatch(WIZ, /Room setup…<\/button>/);
  // …and the prop is still accepted, so no caller breaks.
  assert.match(WIZ, /export default function WizardSettings\(\{\n  onRoomSetup/);
});

test('F3 — the plinth says what it is, and the totals line stays', () => {
  assert.match(WIZ, /Plinth height \(toe kick\)/);
  assert.match(WIZ, /data-total-line="1"/);
  assert.match(WIZ, /total item = wardrobe \+ legs/);
});

test('F3 — the owner’s baked-in defaults: 2100 · 100 · 568', () => {
  assert.deepEqual(T44_DEFAULTS, { height: 2100, plinth: 100, depth: 568 });
  assert.equal(WARDROBE_DEPTH_MM, 568);
  // The DEPTH is already the profile's own — the spec keeps it ("depth default
  // stays 568"), and `projectDepth` has answered 568 for a wardrobe since T32.
  assert.equal(projectDepth(migrateDesign({ projectType: 'wardrobe' }), P), WARDROBE_DEPTH_MM);
  // The other two are a SEED the wizard writes through the ordinary setter, on
  // the project — never a workshop default. Iron rule 2 freezes src/engine/**
  // byte-for-byte tonight, and a moved profile number would recut every
  // wardrobe the six standard configs answer for.
  const flow = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');
  assert.match(flow, /setProjectHeights\(\{ tall: T44_DEFAULTS\.height, toeKick: T44_DEFAULTS\.plinth \}\)/);
  assert.match(flow, /if \(isWardrobeSeed\(type\.id\)\)/);
  // …and the profile it sits on is untouched: 2150 is still the workshop's.
  assert.equal(projectHeights(migrateDesign({ projectType: 'wardrobe' }), P).tall, 2150);
  assert.equal(projectHeights(migrateDesign({}), P).toeKick, T44_DEFAULTS.plinth);
});

test('F3 — a wardrobe never sees the three kitchen heights', () => {
  assert.match(WIZ, /\.filter\(\(d\) => dimensionAsked\(d\.key, design\.projectType\)\)/);
  assert.match(WIZ, /\{dimensionAsked\('wallMount', design\.projectType\) && \(/);
  assert.equal(dimensionAsked('base', 'wardrobe'), false);
  assert.equal(dimensionAsked('base', 'kitchen'), true);
});

// ══ F4 ═════════════════════════════════════════════════════════════════════

test('F4 — the opening question is the owner’s own, and it is 1–3', () => {
  assert.match(WIZ, /Ile typów materiału carcase\?/);
  assert.match(WIZ, /data-carcass-count=\{n\}/);
  assert.match(WIZ, /\[1, 2, 3\]\.map/);
});

test('F4 — N types make N submodals, each with its own dot', () => {
  assert.match(WIZ, /const carcStops = \[\s*\n\s*'count',\s*\n\s*\.\.\.carcassTypes\.map\(\(t\) => t\.id\)/);
  assert.match(WIZ, /data-carcass-dots="1"/);
  assert.match(WIZ, /data-carcass-dot=\{stop\}/);
  assert.match(WIZ, /data-carcass-submodal=\{carcTypeAt\.id\}/);
  // …and a count changed from 3 to 1 cannot strand the walk on a dead type.
  assert.match(WIZ, /const carcAt = carcStops\.includes\(carcStop\) \? carcStop : 'count';/);
});

// ─── T45 F3 SUPERSEDES THE SIX ASSERTIONS THAT STOOD HERE ──────────────────
//
// T44 answered *"okno w oknie"* by making the picker a full-width PANEL inside
// the step. On 23.08 the owner met the result and said the other half of the
// same sentence — *"okno w oknie, roll w dół, wkurw na maxa"* — because a grid
// inside a scrolling step inside a draggable window is three scrollbars deep.
//
// The approved mockup splits the two jobs: the TAB holds one slot and one
// chosen tile and no grid at all, and the CATALOGUE has its own window with its
// own single scrolling grid. What used to be asserted of `MaterialChoicePanel`
// is therefore asserted of `DecorPickerModal` now, and it is asserted in
// test/turn45-f3-the-picker-is-a-modal.test.js — including every clause of the
// EGGER licence, which travels with the picture wherever the picture goes.
//
// The two rules below are T44's and still hold, so they stay here.

test('F4 — the three categories are the three SOURCES, separated hard', () => {
  assert.match(PANEL, /data-material-categories="1"/);
  assert.match(WIZ, /categoryStrip=\{sourceSeg\(kind, t, \{ big: true \}\)\}/);
  assert.match(WIZ, /data-material-category=\{id\}/);
  // the owner's per-container orders are untouched (the 15.08 rebuild's law)
  assert.match(WIZ, /CARCASS_ORDER = \['egger', 'veneer', 'sprayed'\]/);
  assert.match(WIZ, /FRONT_ORDER = \['spray', 'veneer', 'laminate'\]/);
});

test('F4 — the owner’s 96 px floor is still stated once and read', () => {
  assert.equal(TILE_SWATCH_PX, 96, 'the owner’s floor, stated once');
  const TILE = readFileSync(new URL('../src/components/ChosenDecorTile.jsx', import.meta.url), 'utf8');
  const MODAL = readFileSync(new URL('../src/components/DecorPickerModal.jsx', import.meta.url), 'utf8');
  assert.match(TILE, /TILE_SWATCH_PX/, 'the chosen tile reads the floor');
  assert.match(MODAL, /TILE_SWATCH_PX/, '…and so does every tile in the grid');
});

test('F4 — the drawers question closes each submodal, and writes the BOM’s flag', () => {
  assert.match(WIZ, /data-wizard-node="carcases\.drawers"/);
  assert.match(WIZ, /data-drawer-boxes-option=\{id\}/);
  assert.match(WIZ, /setDesign\(\{ drawerBoxes: \{ mode: id \} \}\)/);
  assert.match(WIZ, /\['same', 'Same board as carcass'\], \['ready', 'Ready-made system'\]/);
});

test('F4 — the sheets assignment comes AFTER the last submodal, factory only', () => {
  assert.match(WIZ, /\.\.\.\(show\('carcases\.sheets'\) \? \['sheets'\] : \[\]\),/);
  assert.match(WIZ, /data-sheets-assignment="1"/);
  assert.match(WIZ, /data-sheet-assign=\{t\.id\}/);
  assert.match(WIZ, /family="carcasses"/);
});

test('F4 — the tab ends with a summary of the chosen types', () => {
  assert.match(WIZ, /carcAt === 'summary'/);
  assert.match(WIZ, /data-carcass-chosen="1"/);
  assert.match(WIZ, /data-save-carcasses="1"/);
});

// ══ F5 ═════════════════════════════════════════════════════════════════════

test('F5 — the same procedure, asked in the owner’s words', () => {
  assert.match(WIZ, /Ile kolorów frontów\?/);
  assert.match(WIZ, /data-front-count=\{n\}/);
  assert.match(WIZ, /data-front-dots="1"/);
  assert.match(WIZ, /data-front-submodal=\{frontTypeAt\.id\}/);
  assert.match(WIZ, /const frontStops = \['count', \.\.\.frontTypes\.map\(\(t\) => t\.id\), 'tail'\];/);
});

test('F5 — the opening options are EXACTLY the owner’s four', () => {
  assert.deepEqual(FRONT_OPENING_IDS, ['push', 'handles', 'knobs', 'jhandle']);
  assert.deepEqual(FRONT_OPENINGS.map((o) => o.label), ['Push-to-open', 'Handles', 'Knobs', 'J-handle']);
  assert.equal(frontOpeningLabel('knobs'), 'Knobs');
  assert.equal(frontOpeningLabel('nonsense'), 'Push-to-open');
  // "no separate 'pull'" — the spec says so in as many words.
  assert.ok(!FRONT_OPENING_IDS.includes('pull'));
});

test('F5 — not one of the four invents a field: each writes what the project carries', () => {
  const base = migrateDesign({});
  // J-handle IS the shape.
  const j = frontOpeningPatch(base, 'jhandle');
  assert.equal(j.fronts.style, J_HANDLE_STYLE);
  assert.equal(j.fronts.handle, null);
  assert.equal(frontOpening(migrateDesign(j)), 'jhandle');
  // handles / knobs write the handle record engine/handles.js already fits.
  const h = frontOpeningPatch(base, 'handles');
  assert.deepEqual(h.fronts.handle, { type: 'bar' });
  assert.equal(frontOpening(migrateDesign(h)), 'handles');
  const k = frontOpeningPatch(base, 'knobs');
  assert.deepEqual(k.fronts.handle, { type: 'knob' });
  assert.equal(frontOpening(migrateDesign(k)), 'knobs');
  // push-to-open IS the MOVENTO TIP-ON variant the Hardware step writes.
  const p = frontOpeningPatch(base, 'push');
  assert.equal(p.fronts.handle, null);
  assert.equal(p.runners.variant, 'T');
  assert.equal(frontOpening(migrateDesign(p)), 'push');
});

test('F5 — leaving the J-handle puts the door back to the shape somebody chose', () => {
  const shaker = migrateDesign({ fronts: { style: 'S' } });
  const asJ = migrateDesign(frontOpeningPatch(shaker, 'jhandle'));
  assert.equal(asJ.fronts.style, 'HJ');
  const back = frontOpeningPatch(asJ, 'handles', { previousStyle: 'S' });
  assert.equal(back.fronts.style, 'S', 'the shape it replaced');
  // …and with nothing remembered it falls to Flat, the plain slab, never to HJ.
  assert.equal(frontOpeningPatch(asJ, 'handles').fronts.style, 'F');
});

test('F5 — a handle’s CENTRES survive a round trip through the four', () => {
  const withCentres = migrateDesign({ fronts: { handle: { type: 'bar', centres: 160 } } });
  const again = frontOpeningPatch(withCentres, 'handles');
  assert.deepEqual(again.fronts.handle, { type: 'bar', centres: 160 });
});

test('F5 — the tail carries the opening and the shine, in that order', () => {
  // T45 F4 / iron rule 4: *"Fronts: ONE front-type choice (the tail repeat
  // goes)."* The tail's second gallery is removed; the per-front gallery in the
  // counting stop is the one that stays, and slot 1's shape is still the
  // project's. What the tail still carries, in the owner's order, is the
  // OPENING and the SHINE.
  const tail = WIZ.slice(WIZ.indexOf("frontAt === 'tail'"));
  const opening = tail.indexOf('fronts.opening');
  const shine = tail.indexOf('fronts.shine');
  assert.ok(opening > -1 && shine > -1, 'both are on the tail');
  assert.ok(opening < shine, 'the opening comes before the shine');
  // …and the shape is asked ONCE, in the slot card.
  assert.match(WIZ, /data-style-slot=\{t\.id\}/);
  assert.match(WIZ, /data-style-gallery-for=\{t\.id\}/);
});
test('F5 — the SHINE reaches the 3D material: the formula is the engine’s', () => {
  // The control is `SheenSlider`, which writes `design.sheen`; `3d/materials.js`
  // turns that into the sprayed surface's roughness through this one function,
  // so the slider and the scene cannot disagree about what a 60 looks like.
  assert.match(WIZ, /<SheenSlider design=\{design\} setDesign=\{setDesign\} profile=\{profile\} \/>/);
  const mats = readFileSync(new URL('../src/3d/materials.js', import.meta.url), 'utf8');
  assert.match(mats, /roughness: sprayed && sheen != null \? roughnessFromSheen\(sheen, profile\) : pbr\.roughness/);
  assert.equal(roughnessFromSheen(5, P).toFixed(2), '0.95', 'dead matt');
  assert.equal(roughnessFromSheen(100, P).toFixed(2), '0.00', 'full gloss');
  assert.notEqual(roughnessFromSheen(5, P), roughnessFromSheen(100, P), 'matte and shine are different surfaces');
});
