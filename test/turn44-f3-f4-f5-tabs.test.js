import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  wardrobeSeed, TILE_SWATCH_PX, WARDROBE_DEPTH_MM, dimensionAsked,
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
  // ─── T50-F13: THE SEED READS THE PROFILE ────────────────────────────────
  // T44 wrote `{ height: 2100, plinth: 100, depth: 568 }` as a literal, with
  // its reason: iron rule 2 froze `src/engine/**` that night. The owner has
  // since ruled *"default wysokości szaf 2150"*, and F13 asks that the number
  // live in ONE place — so the seed is derived, and it is the profile's own.
  assert.deepEqual(wardrobeSeed(P), {
    height: P.projectHeights.tall,
    plinth: P.projectHeights.toeKick,
    depth: P.wardrobe.defaults.depth,
  });
  assert.equal(wardrobeSeed(P).height, 2150, 'which is his 2150');
  // …and a workshop that moves its own tall height moves the seed with it,
  // which is the whole of "one place".
  assert.equal(wardrobeSeed({ ...P, projectHeights: { ...P.projectHeights, tall: 2400 } }).height, 2400);
  assert.equal(WARDROBE_DEPTH_MM, 568);
  // The DEPTH is already the profile's own — the spec keeps it ("depth default
  // stays 568"), and `projectDepth` has answered 568 for a wardrobe since T32.
  assert.equal(projectDepth(migrateDesign({ projectType: 'wardrobe' }), P), WARDROBE_DEPTH_MM);
  // The other two are a SEED the wizard writes through the ordinary setter, on
  // the project — never a workshop default. Iron rule 2 freezes src/engine/**
  // byte-for-byte tonight, and a moved profile number would recut every
  // wardrobe the six standard configs answer for.
  const flow = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');
  assert.match(flow, /setProjectHeights\(\{ tall: seed\.height, toeKick: seed\.plinth \}\)/);
  assert.match(flow, /if \(isWardrobeSeed\(type\.id\)\)/);
  // …and the profile it sits on is untouched: 2150 is still the workshop's.
  assert.equal(projectHeights(migrateDesign({ projectType: 'wardrobe' }), P).tall, 2150);
  assert.equal(projectHeights(migrateDesign({}), P).toeKick, wardrobeSeed(P).plinth);
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

test('F4 — the sheets assignment is asked once, IN the material dialog, factory only', () => {
  // ─── TURN 49 (CLAUDE.md F4): THE SECOND STOP WENT ────────────────────────
  // *"przy carcasach jest 2 stopnie wybierania … a dlaczego nie dodac rozmiar
  // plyty w pierwszym modalu i drugi usunac, jeden mniej bedzie."* T44 put the
  // sheets on a stop of their OWN, after the last submodal; that stop also
  // re-drew the stock-board select the submodal had already drawn, and only the
  // sheet was new. So the stop is gone and the sheet is in the first dialog —
  // where the board it is a sheet of is chosen — with every hook it had.
  assert.doesNotMatch(WIZ, /\.\.\.\(show\('carcases\.sheets'\) \? \['sheets'\] : \[\]\),/);
  assert.match(WIZ, /data-sheets-assignment="1"/);
  assert.match(WIZ, /data-sheet-assign=\{t\.id\}/);
  assert.match(WIZ, /family="carcasses"/);
  assert.match(WIZ, /data-wizard-node="carcases\.sheets"/, 'same node, same audience filter');
  // …and it is drawn because the material dialog ASKED for it.
  assert.match(WIZ, /sheetSize=\{sheets \? sheetSizeRow\(kind, t\) : null\}/);
  assert.match(WIZ, /sheets: true,/);
});

test('F4 — the tab ends with a summary of the chosen types', () => {
  assert.match(WIZ, /carcAt === 'summary'/);
  assert.match(WIZ, /data-carcass-chosen="1"/);
  assert.match(WIZ, /data-save-carcasses="1"/);
});

// ══ F5 ═════════════════════════════════════════════════════════════════════

test('F5 — the same procedure, asked in the owner’s words', () => {
  // T45 F8, by name: `Ile kolorów frontów? → How many front colours?`. The
  // owner's own words survive in the comment above the block, which is where
  // the evidence belongs; the SCREEN speaks English.
  // T49 F5 re-worded it on the owner's order — types first, colours later —
  // and made it bigger. It is still English, which is what F8's law asks.
  assert.match(WIZ, /How many types and colours\?/);
  assert.doesNotMatch(WIZ, /<p className="text-sm text-ink-100">Ile /);
  assert.match(WIZ, /data-front-count=\{n\}/);
  assert.match(WIZ, /data-front-dots="1"/);
  assert.match(WIZ, /data-front-submodal=\{frontTypeAt\.id\}/);
  // T45 F6 puts a SHEETS stop between the colours and the tail, mirroring the
  // carcasses' — the sheet-size picker left Production by name (iron rule 4)
  // and lives at the material step.
  assert.match(WIZ, /\.\.\.frontTypes\.map\(\(t\) => t\.id\),/);
  // T49 F6 merges the fronts' modals 2 and 3 exactly as F4 merged the
  // carcasses' — the stop is gone, the sheet row is in the colour dialog.
  assert.doesNotMatch(WIZ, /\.\.\.\(show\('fronts\.sheets'\) \? \['sheets'\] : \[\]\),/);
  assert.match(WIZ, /data-front-sheets-assignment="1"/);
  assert.match(WIZ, /'tail',\n  \];/);
});

test('F5 — the opening options are EXACTLY the owner’s four', () => {
  assert.deepEqual(FRONT_OPENING_IDS, ['push', 'handles', 'knobs', 'jhandle']);
  // T57 AMENDED (30.08.2026): 'J-handle' → 'J-pull handleless'. The owner's
  // FOUR are still exactly four and still in his order; the fourth is called
  // what he calls it now that it is a real handle system rather than a shape.
  assert.deepEqual(FRONT_OPENINGS.map((o) => o.label), ['Push-to-open', 'Handles', 'Knobs', 'J-pull handleless']);
  assert.equal(frontOpeningLabel('knobs'), 'Knobs');
  assert.equal(frontOpeningLabel('nonsense'), 'Push-to-open');
  // "no separate 'pull'" — the spec says so in as many words.
  assert.ok(!FRONT_OPENING_IDS.includes('pull'));
});

test('F5 — not one of the four invents a field: each writes what the project carries', () => {
  const base = migrateDesign({});
  // ─── T57 AMENDED (30.08.2026): THE J IS NOT THE SHAPE ──────────────────
  // This line used to read "J-handle IS the shape" and wrote `style: 'HJ'`
  // with `handle: null`. That was the wrong axis, and CLAUDE.md T57 says so
  // in the open: a J-pull is a HANDLE SYSTEM — how the front is HELD — and
  // the face pattern is a separate question. On the pattern axis "shaker AND
  // J-pull" was unsayable, which is a kitchen the owner sells. So the patch
  // writes the HANDLE and leaves the shape exactly as somebody chose it.
  const j = frontOpeningPatch(base, 'jhandle');
  assert.deepEqual(j.fronts.handle, { type: 'jpull' });
  assert.equal(j.fronts.style, base.fronts.style, 'the shape is not touched');
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

test('F5 — the J-pull leaves the shape alone, and a legacy HJ still comes back', () => {
  // ─── T57 AMENDED (30.08.2026) ──────────────────────────────────────────
  // There is nothing to put back any more, because nothing was taken away: a
  // SHAKER door that goes on J-pull is a shaker door with a J edge, which is
  // the whole reason the J moved to the handle axis.
  const shaker = migrateDesign({ fronts: { style: 'S' } });
  const asJ = migrateDesign(frontOpeningPatch(shaker, 'jhandle'));
  assert.equal(asJ.fronts.style, 'S', 'still a shaker');
  assert.deepEqual(asJ.fronts.handle, { type: 'jpull' });
  assert.equal(frontOpening(asJ), 'jhandle');
  const back = migrateDesign(frontOpeningPatch(asJ, 'handles'));
  assert.equal(back.fronts.style, 'S', 'and it is still a shaker on the way out');
  assert.deepEqual(back.fronts.handle, { type: 'bar' });

  // …and T44's own path is still honoured for every project SAVED with it:
  // `style: 'HJ'` and no handle still reads as J-pull, and leaving it still
  // puts the door back to the shape somebody chose — or to Flat.
  const legacy = migrateDesign({ fronts: { style: J_HANDLE_STYLE, handle: null } });
  assert.equal(frontOpening(legacy), 'jhandle', 'a project saved before tonight');
  assert.equal(frontOpeningPatch(legacy, 'handles', { previousStyle: 'S' }).fronts.style, 'S');
  assert.equal(frontOpeningPatch(legacy, 'handles').fronts.style, 'F');
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
  // ─── TURN 49 (CLAUDE.md F9): SPRAY *AND VENEER* ─────────────────────────
  // *"suwak powinien dzialac tylko na spray i veneer, nie na laminat."* The
  // gate widened by one word; the FORMULA — which is what this test is about —
  // did not move, and it is still the engine's one function.
  assert.match(mats, /roughness: sheenDriven && sheen != null \? roughnessFromSheen\(sheen, profile\) : pbr\.roughness/);
  assert.match(mats, /const sheenDriven = sprayed \|\| veneer;/);
  assert.equal(roughnessFromSheen(5, P).toFixed(2), '0.95', 'dead matt');
  assert.equal(roughnessFromSheen(100, P).toFixed(2), '0.00', 'full gloss');
  assert.notEqual(roughnessFromSheen(5, P), roughnessFromSheen(100, P), 'matte and shine are different surfaces');
});
