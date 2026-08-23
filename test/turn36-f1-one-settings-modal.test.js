import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ─── TURN 36 (CLAUDE.md F1): ONE SETTINGS MODAL ─────────────────────────────
//
// The owner, 17.08.2026, seeing the T35 sheet sizes in one panel and not the
// other: *"mamy new project i edit project — 2 różne setup modale, a powinien
// to być ten sam modal. Sprawdź dokładnie i dołóż wszystkie funkcje ze starego
// do nowego."*
//
// These asserts are the INVENTORY the spec asks for: "every
// `data-settings-section` and every named control of the old panel has a
// counterpart in the unified one; the edit door opens the unified panel."
//
// It is a SOURCE-level test on purpose. The two panels are React components
// wired to four zustand stores and a decor catalogue fetch; a DOM render would
// need a renderer this repo does not ship (zero new dependencies, iron rule 6),
// and the thing that actually went wrong in T35 — a control landing in one file
// and not the other — is visible in the source and only in the source. The
// PICTURE that proves the two doors show the same sections is
// `verify/t36/f1-*.png`, driven by real pointer input.

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

const OLD = read('components/SettingsPanel.jsx');
// ─── TURN 44 (CLAUDE.md F2/F3/F7/F8): THE SURFACE BECAME A SEQUENCE ─────────
// T36's law — one settings modal, every control alive on it — is untouched.
// What T44 did was RESTRUCTURE that one surface into six tabs and move two
// named controls: `Keep as…` to F8's finale modal, `Room setup…` off the
// screen it never belonged on. Where an assert below pointed at a line that
// moved, it now points at where it moved TO; not one of them was weakened.
const FINALE = read('components/SaveSettingsSetModal.jsx');
const WIZ = read('components/WizardSettings.jsx');
const DOOR = read('components/DesignSettingsModal.jsx');
const FLOW = read('components/NewProjectFlow.jsx');

/**
 * The unified panel's WHOLE source — its own file plus the sibling components
 * it imports from.
 *
 * The unified panel shows the old panel's sheet-size row and hinge block by
 * IMPORTING them rather than copying them (one implementation, two surfaces),
 * so an inventory that read one file would call those two rows missing and be
 * wrong. One level of relative imports is enough and is deliberately not more:
 * a control three files away from the panel is not a control on the panel.
 */
function unifiedSource() {
  const parts = [WIZ];
  const seen = new Set(['components/WizardSettings.jsx']);
  for (const m of WIZ.matchAll(/from '\.\/([A-Za-z0-9_.-]+\.jsx)'/g)) {
    const rel = `components/${m[1]}`;
    if (seen.has(rel)) continue;
    seen.add(rel);
    parts.push(read(rel));
  }
  return parts.join('\n');
}
const UNIFIED = unifiedSource();

/** Every `data-foo` attribute NAME a source declares. */
function markers(text) {
  return new Set([...text.matchAll(/data-([a-z0-9-]+)=/g)].map((m) => m[1]));
}

// ── 1. the edit door opens the unified panel ──
test('F1 — the EDIT door opens the unified panel, told which door it is', () => {
  assert.match(DOOR, /import WizardSettings from '\.\/WizardSettings\.jsx'/);
  assert.match(DOOR, /<WizardSettings\s+door="project"/);
  assert.doesNotMatch(DOOR, /<SettingsPanel/, 'the edit door no longer opens the old panel');
});

test('F1 — the NEW-PROJECT door opens the same component, as it always did', () => {
  assert.match(FLOW, /import WizardSettings from '\.\/WizardSettings\.jsx'/);
  assert.match(FLOW, /<WizardSettings/);
});

// ── 2. the sanctity rule: nothing was deleted ──
test('F1 — SettingsPanel.jsx STAYS in the tree, whole and exported', () => {
  assert.match(OLD, /export default function SettingsPanel/);
  // Its two reusable rows are now exported so the unified panel can show THEM
  // rather than a copy — additive, and the old panel still renders both.
  assert.match(OLD, /export function SheetSizeRow/);
  assert.match(OLD, /export function HingeHardware/);
  assert.match(OLD, /<SheetSizeRow/);
  assert.match(OLD, /<HingeHardware/);
  // And the unified panel really does import them rather than duplicate them.
  assert.match(WIZ, /import \{ HingeHardware, SheetSizeRow \} from '\.\/SettingsPanel\.jsx'/);
});

// ── 3. every `data-settings-section` of the old panel has a counterpart ──
test('F1 — every data-settings-section of the old panel exists in the unified one', () => {
  const sectionsOf = (text) => new Set(
    [...text.matchAll(/data-settings-section="([a-z-]+)"/g)].map((m) => m[1]),
  );
  const old = sectionsOf(OLD);
  const now = sectionsOf(UNIFIED);
  assert.ok(old.size >= 5, `the old panel names its sections (${[...old].join(', ')})`);
  const missing = [...old].filter((s) => !now.has(s));
  assert.deepEqual(missing, [], `sections missing from the unified panel: ${missing.join(', ')}`);
});

// ── 4. every NAMED CONTROL of the old panel has a counterpart ──
//
// A handful of the old panel's markers are the SAME control under another name
// in the unified one — the wizard's two containers carry their own Save, and
// its slots are `carcass-slot`/`front-slot` rather than `carcass-type`/
// `front-type` (both are present now, but the map is written down so the
// audit can see WHICH answer each one got rather than trusting a regex).
const COUNTERPART = {
  // the old panel's per-section Save/fold trio → the wizard's two container saves
  'save-section': ['save-carcasses', 'save-fronts'],
  saved: ['save-carcasses', 'save-fronts'],
  folded: ['save-carcasses', 'save-fronts'],
  'folded-thickness': ['folded-thickness'],
  // the old panel's picker button → the wizard's Choose… button, which now
  // carries the same name as well
  'carcass-picker': ['carcass-picker'],
};

test('F1 — every named control of the old panel has a counterpart in the unified one', () => {
  const old = markers(OLD);
  const now = markers(UNIFIED);
  const missing = [];
  for (const name of old) {
    if (now.has(name)) continue;
    const alt = COUNTERPART[name];
    if (alt && alt.every((a) => now.has(a))) continue;
    missing.push(name);
  }
  assert.deepEqual(missing, [], `controls missing from the unified panel: ${missing.join(', ')}`);
});

// ── 5. the five rows the spec names, one by one, so a regression says WHICH ──
test('F1 — thickness: the six measured slots and their hard gate', () => {
  assert.match(WIZ, /data-settings-section="thickness"/);
  assert.match(WIZ, /data-thickness-slots="1"/);
  assert.match(WIZ, /data-slot-measured=\{b\.row\.id\}/);   // T44 F7: per material, not in one pile
  assert.match(WIZ, /data-slot-confirmed=\{b\.row\.id\}/);
  assert.match(WIZ, /data-slot-thickness-gate="1"/);
  assert.match(WIZ, /thicknessSlotRows\(/);
  assert.match(WIZ, /drawerBoxGate\(/);
});

test('F1 — sheet sizes: both families, the T35 row itself', () => {
  // T44 F4/F7: the sheet rows stand with the material they are for.
  assert.match(WIZ, /data-sheets-assignment="1"/);
  // The CARCASS sheet is asked where the carcass boards are chosen (F4's
  // "Sheets assignment"); the FRONT sheet stands in Produkcja beside the front
  // material it is for (F7's per-material blocks). Both families, both setters.
  assert.match(WIZ, /family="carcasses"/);
  assert.match(WIZ, /family: 'fronts'/);
  assert.match(WIZ, /sheetCarcass: size/);
  assert.match(WIZ, /key: 'sheetFronts'/);
  assert.match(WIZ, /\[b\.sheet\.key\]: size/);
});

test('F1 — door style: the gallery, + New style, the shaker number, the workshop styles', () => {
  // ─── TURN 45 (CLAUDE.md F4 / iron rule 4): THE TAIL REPEAT WENT ──────────
  // *"Fronts: ONE front-type choice (the tail repeat goes)."* The
  // `door-style` SECTION was the second gallery — the per-front cards already
  // carry one each, and F4 keeps those. Everything the section held that was
  // not the repeat is still here: `+ New style`, the three door-style setters,
  // the gallery itself (in the slot card) and the shaker number.
  assert.doesNotMatch(WIZ, /data-settings-section="door-style"/);
  assert.match(WIZ, /data-new-style="1"/);
  assert.match(WIZ, /addDoorStyle\(/);
  assert.match(WIZ, /updateDoorStyle\(/);
  assert.match(WIZ, /removeDoorStyle\(/);
  assert.match(WIZ, /<FrontStyleGallery/);
  assert.match(WIZ, /shakerFrameMm\(design, profile\)/);
});

test('F1 — runner variant at project level, standard / tip-on', () => {
  assert.match(WIZ, /data-runner-variant="1"/);
  assert.match(WIZ, /data-runner-variant-option=\{v\.id\}/);
  assert.match(WIZ, /setRunnerVariant\(v\.id\)/);
  assert.match(WIZ, /resolveRunnerVariant\(/);
});

test('F1 — the hinge-plate pilot ⌀3/⌀5 writes the PROFILE, not the design', () => {
  assert.match(WIZ, /data-hinge-plate-pilot="1"/);
  assert.match(WIZ, /data-hinge-plate-pilot-option=\{d\}/);
  assert.match(WIZ, /platePilotD: d/);
  assert.match(WIZ, /hingePlatePilotD\(profile\)/);
});

// ── 6. behaviour is MOVED, not redesigned ──
test('F1 — the T15-B hard gate travels with the material assignment', () => {
  assert.match(WIZ, /data-thickness-gate="1"/, 'the carcass gate');
  assert.match(WIZ, /data-front-thickness-gate="1"/, 'the fronts gate');
  assert.match(WIZ, /const gateOrApply = /);
  // Every SOURCE goes through it, not only the board — the spec's
  // "material assignment keeps the T34 hard gate on every source".
  for (const fn of ['pickCarcassSource', 'pickCarcassDecor', 'pickCarcassVeneer', 'pickCarcassBoard']) {
    const at = WIZ.indexOf(`const ${fn} = `);
    assert.notEqual(at, -1, `${fn} exists`);
    const body = WIZ.slice(at, WIZ.indexOf('\n  const ', at + 10));
    assert.match(body, /gateOrApply\(/, `${fn} goes through the gate`);
  }
});

test('F1 — the T34 rule holds: the stock board select is on EVERY picker path', () => {
  const at = WIZ.indexOf('const slotPicker = ');
  assert.notEqual(at, -1);
  const body = WIZ.slice(at, WIZ.indexOf('\n  const sourceSeg', at));
  const paths = body.split('return (').length - 1;
  const selects = body.split('stockBoardSelect(kind, t)').length - 1;
  assert.equal(selects, paths, 'one stock-board select per picker path');
});

test('F1 — the wizard door still gates the fronts behind the carcass save', () => {
  assert.match(WIZ, /data-fronts-locked=\{carcSaved \? '0' : '1'\}/);
  assert.match(WIZ, /pointer-events-none/);
  // …and the EDIT door starts satisfied, so nothing is dead under the hand.
  assert.match(WIZ, /useState\(editDoor\)/);
  assert.match(WIZ, /const touchCarcass = \(\) => \{ if \(!editDoor\) setCarcSaved\(false\); \};/);
  assert.match(WIZ, /const touchFronts = \(\) => \{ if \(!editDoor\) setFrontsSaved\(false\); \};/);
});

test('F1 — the project TYPE is editable from the edit door and a label in the wizard', () => {
  assert.match(WIZ, /data-project-type="1"/);
  assert.match(WIZ, /data-wizard-type-label="1"/);
  assert.match(WIZ, /editDoor \? \(/);
});

test('F1 — the wall mount height, the one dimension the wizard never had', () => {
  assert.match(WIZ, /data-dimension="wallMount"/);
  assert.match(WIZ, /heights\.wallMount/);
  // and nothing is asked twice: the extra grid is rendered BY DIFFERENCE
  assert.match(WIZ, /const rest = all\s*\n?\s*\.filter\(\(d\) => !shown\.has\(d\.key\)\)/);
});

test('F1 — the run pieces (infills, plinths, end panels, masking) came across', () => {
  assert.match(WIZ, /data-run-materials="1"/);
  assert.match(WIZ, /RUN_MATERIAL_GROUPS\.map/);
  assert.match(WIZ, /data-same-as-fronts=\{g\.id\}/);
  assert.match(WIZ, /data-run-material-stock=\{g\.id\}/);
});

test('F1 — saved settings sets can still be MADE, not only loaded', () => {
  // T44 iron rule 3, licensed removal 1 of 2: the `Keep as…` control left the
  // settings screen for F8's finale, which asks it once and at the end. The
  // capability is what T36 was protecting and the capability is still here —
  // this assert follows it to its new window rather than mourning the old one.
  assert.match(FINALE, /data-set-save="1"/);
  assert.match(FINALE, /data-set-name="1"/);
  assert.match(FINALE, /saveSet\(label, design\)/);
  // …and the list is still a LOAD list on the settings screen, with its delete.
  assert.match(WIZ, /data-set-load=\{s\.id\}/);
  assert.match(WIZ, /data-set-remove=\{loadedSet\}/);
});
