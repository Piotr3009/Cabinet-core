import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ─── TURN 44 · THE RELOCATION AUDIT (CLAUDE.md iron rule 3) ─────────────────
//
// *"Sanctity. No function deleted. `SettingsPanel.jsx` leaves the
// does-not-touch list for the FIRST time since T41 — restructure is licensed,
// deletion is not: every existing field survives, relocated. Named removals
// only: the `Keep as…` control (relocated to F8's final modal) and `Room
// setup…` button (belongs to Scope/Room step)."*
//
// The morning audit runs exactly this check by hand. This file runs it in the
// suite, so it cannot be forgotten and cannot be argued with: the INVENTORY
// below is every `data-` hook the settings surface carried at the branch
// point (commit 4b69dd0, the tip of T43), pinned. One hundred of them; three
// are the two licensed removals (`Keep as…` is an input AND a button) and are
// listed separately, by name, with where they went.
//
// A field that moves tabs keeps its hook, so this passes. A field that is
// QUIETLY DROPPED does not, and the failure names it.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const FINALE = readFileSync(new URL('../src/components/SaveSettingsSetModal.jsx', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('../src/components/MaterialChoicePanel.jsx', import.meta.url), 'utf8');
const OLD = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');

/** Every `data-` hook the surface carried before tonight, minus the removals. */
const PINNED = [
  'data-box-gate', 'data-box-gate-message', 'data-carcass-chosen', 'data-carcass-container',
  'data-carcass-count', 'data-carcass-material', 'data-carcass-missing', 'data-carcass-ok',
  'data-carcass-picker', 'data-carcass-slot', 'data-carcass-source', 'data-carcass-thickness',
  'data-carcass-type', 'data-ceiling-answer', 'data-ceiling-error', 'data-ceiling-question',
  'data-chosen-row', 'data-cnc-corner', 'data-cnc-corner-option', 'data-dimension',
  'data-door-style', 'data-door-style-remove', 'data-door-styles', 'data-drawer-boxes',
  'data-drawer-boxes-option', 'data-folded-thickness', 'data-front-count', 'data-front-facing',
  'data-front-material', 'data-front-slot', 'data-front-source', 'data-front-thickness-gate',
  'data-front-thickness-gate-apply', 'data-front-thickness-gate-keep', 'data-front-type',
  'data-fronts-chosen', 'data-fronts-container', 'data-fronts-locked', 'data-fronts-missing',
  'data-fronts-ok', 'data-hardware-choice', 'data-hardware-choice-option',
  'data-hinge-plate-pilot', 'data-hinge-plate-pilot-option', 'data-hinge-standard',
  'data-hinge-standard-option', 'data-infill-side-width',
  'data-material-picker-for', 'data-material-slot', 'data-more-dimensions', 'data-new-style',
  'data-project-type', 'data-run-material', 'data-run-material-stock', 'data-run-materials',
  'data-runner-system', 'data-runner-variant', 'data-runner-variant-option',
  'data-same-as-fronts', 'data-save-carcasses', 'data-save-fronts', 'data-set-load',
  'data-set-remove', 'data-settings-door', 'data-settings-section', 'data-settings-sets',
  'data-settings-surface', 'data-shaker-frame', 'data-shaker-frame-slot', 'data-shelf-sleeve',
  'data-shelf-sleeve-option', 'data-slot-confirmed', 'data-slot-dirty', 'data-slot-gate-apply',
  'data-slot-gate-keep', 'data-slot-measured', 'data-slot-nominal', 'data-slot-thickness-gate',
  'data-source-option', 'data-source-seg', 'data-spray-picker', 'data-stock-board',
  'data-style-gallery-for', 'data-style-slot', 'data-thickness-gate',
  'data-thickness-gate-apply', 'data-thickness-gate-keep', 'data-thickness-slot',
  'data-thickness-slots', 'data-total-line', 'data-wizard-dim', 'data-wizard-dimensions',
  'data-wizard-fronts', 'data-wizard-sets', 'data-wizard-settings', 'data-wizard-type-label',
];

/** The ones that went, what they were, and where they are now. */
const LICENSED_REMOVALS = [
  ['data-set-name', 'the `Keep as…` name field', 'SaveSettingsSetModal.jsx (F8)'],
  ['data-set-save', 'the `Keep as…` Save set button', 'SaveSettingsSetModal.jsx (F8)'],
  ['data-room-setup', 'the `Room setup…` button', 'the Scope/Room step, and Settings ▸ Room setup…'],
  // ─── TURN 45 (CLAUDE.md F4 / iron rule 4) ───────────────────────────────
  // *"Carcases: ONE CNC-corner block (the repeated joinery table goes)."* The
  // wizard drew the joint twice — the CNC-corner block, and then a second
  // `Joinery type` table with the same preview under it. The CHOICE is not
  // lost: it writes `design.joinery`, and Settings ▸ Project settings offers
  // every type the profile carries, with the same preview.
  ['data-joinery-option', 'the repeated joinery table', 'SettingsPanel.jsx (Settings ▸ Project settings)'],
];

test('EVERY pre-existing settings field is alive in its new tab', () => {
  const missing = PINNED.filter((hook) => !WIZ.includes(hook));
  assert.deepEqual(missing, [], `${missing.length} field(s) were dropped, not relocated:\n${missing.join('\n')}`);
  assert.equal(PINNED.length, 96, 'the inventory itself has not been trimmed');
});

test('…and the ONLY things missing are the two named removals', () => {
  for (const [hook, what, where] of LICENSED_REMOVALS) {
    assert.ok(!WIZ.includes(hook), `${what} (${hook}) is still on the settings surface`);
  }
  // `Keep as…` was RELOCATED, so its two hooks must be findable at the address
  // the licence names — a removal that landed nowhere is a deletion.
  assert.match(FINALE, /data-set-name="1"/);
  assert.match(FINALE, /data-set-save="1"/);
  // `Room setup…` is a BUTTON that went; the editor it opened is untouched and
  // is reached from the Scope step and from the Settings menu.
  const TOP = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
  assert.match(TOP, /label: 'Room setup…'/);
  const FLOW = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');
  assert.match(FLOW, /<RoomModal/);
  // …and the prop the old button used is still accepted, so no caller breaks.
  assert.match(WIZ, /onRoomSetup/);
});

test('NO FUNCTION DELETED — every helper the surface had still exists', () => {
  for (const fn of [
    'gateOrApply', 'recutFronts', 'commitMeasured', 'loadSet', 'chosenOf', 'stockBoardSelect',
    'slotPicker', 'sourceSeg', 'toggle', 'touchCarcass', 'touchFronts',
    'pickCarcassSource', 'pickCarcassDecor', 'pickCarcassVeneer', 'pickCarcassBoard',
    'pickCarcassColour', 'pickFrontSource', 'pickFrontDecor', 'pickFrontBoard', 'pickFrontColour',
    'runnerVariantHint', 'doorsWithOwnHinge', 'CornerArt', 'ChosenRow', 'SectionLabel',
  ]) {
    assert.ok(
      new RegExp(`(?:const|function) ${fn}\\b`).test(WIZ),
      `${fn} was deleted, not relocated`,
    );
  }
});

test('…and every STORE SETTER it wrote through is still called', () => {
  // 27 setters at the branch point. `setSetName` was the `Keep as…` field's own
  // local useState — it went WITH the control, to the finale, which is where
  // the assertion follows it.
  for (const setter of [
    'setProjectInfo', 'setDesign', 'setProjectDefaults', 'setProjectHeights',
    'setFrontTypes', 'setFrontType', 'setFrontMaterial', 'setCarcassTypes', 'setCarcassSource',
    'setCarcassMaterial', 'setCarcassFinish', 'setSlotThickness', 'setHingeStandard',
    'setHingeHardware', 'setRunnerVariant', 'setShelfSleeve', 'setRunMaterial',
    'addDoorStyle', 'updateDoorStyle', 'removeDoorStyle', 'updateUnitParamsBulk', 'setProfile',
  ]) {
    // Called, or handed to a child as its `onChange` — `setHingeHardware` goes
    // to T19's HingeHardware block that way and always has.
    assert.ok(
      WIZ.includes(`${setter}(`) || WIZ.includes(`={${setter}}`),
      `${setter} is no longer wired from the settings surface`,
    );
  }
  assert.match(FINALE, /setName\(/, 'the Keep-as field’s own state went with the field');
});

test('SettingsPanel.jsx is still whole — the sanctity rule, unchanged since T36', () => {
  assert.match(OLD, /export default function SettingsPanel/);
  assert.match(OLD, /export function SheetSizeRow/);
  assert.match(OLD, /export function HingeHardware/);
  // T57 AMENDED (30.08.2026): the list grew a third name, `JpullHardware`.
  // The claim is that the unified panel IMPORTS these rows rather than
  // duplicating them, and it is stronger with three than with two.
  assert.match(WIZ, /import \{ HingeHardware, JpullHardware, SheetSizeRow \} from '\.\/SettingsPanel\.jsx'/);
});

test('the pickers that were replaced are still in the tree, and still reachable', () => {
  // T44 gave the wizard a new picker (F4). The three old ones are NOT deleted:
  // ColourPicker is still what a door STYLE picks its colour with, right here,
  // and SettingsPanel — the panel T36 preserved whole — still imports all three.
  assert.match(WIZ, /<ColourPicker/);
  assert.match(OLD, /import DecorPicker from '\.\/DecorPicker\.jsx'/);
  assert.match(OLD, /import VeneerPicker from '\.\/VeneerPicker\.jsx'/);
  // …and the new one reads the SAME catalogues, so nothing forked. T45 F3 split
  // it in two — the tab holds one slot and one tile, the WINDOW holds the
  // catalogue — and both halves still read the pack the 3D reads.
  assert.match(PANEL, /loadDecorCatalogue/);
  const MODAL = readFileSync(new URL('../src/components/DecorPickerModal.jsx', import.meta.url), 'utf8');
  assert.match(MODAL, /loadDecorCatalogue/);
  assert.match(MODAL, /getVeneers\(\)/);
  assert.match(MODAL, /COLOUR_SYSTEMS/);
});
