import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { WIZARD_STEPS, backStep, stepsInScope } from '../src/lib/wizardSteps.js';
import { WIZARD_NODES, WIZARD_TABS, hiddenNodes, tabAfter } from '../src/lib/wizardTabs.js';

// ─── TURN 45 · F4 — THE DUPLICATES DIE, AND STEP 6 IS THE SUMMARY ───────────
//
// CLAUDE.md, 23.08.2026:
//
//   *"Carcases: ONE CNC-corner block (the repeated joinery table goes).
//   Fronts: ONE front-type choice (the tail repeat goes).
//   Wizard step `6. Hardware` REMOVED → replaced by `6. Summary`: the whole
//   project in miniatures — chosen decor tiles, base dimensions, hardware —
//   `Change` per section, and ONE button: `Start designing`. (`Save as set &
//   start` is gone; the standard was already offered at the settings finale.)"*
//
// Four removals, all four named in iron rule 4, and this file is what holds
// them to "nothing else dies": every one of them names where the FUNCTION it
// carried still lives.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const SUM = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');
const FLOW = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('../src/components/SettingsPanel.jsx', import.meta.url), 'utf8');

// ══ the duplicates ══════════════════════════════════════════════════════════

test('F4 — ONE CNC-corner block: the repeated joinery table is gone', () => {
  // What stays: the corner itself, drawn by the ORIGINAL JoineryPreview, with
  // the dog-bone / square choice the owner asked back in T32.
  assert.match(WIZ, /data-cnc-corner="1"/);
  assert.match(WIZ, /data-cnc-corner-option=\{id\}/);
  assert.match(WIZ, /<JoineryPreview/);
  assert.equal((WIZ.match(/<JoineryPreview/g) || []).length, 1, 'ONE drawing of the joint, not two');
  // What goes: the second table, and its node with it.
  assert.doesNotMatch(WIZ, /data-settings-section="joinery"/);
  assert.doesNotMatch(WIZ, /data-joinery-option=/);
  assert.equal(WIZARD_NODES.some((n) => n.id === 'carcases.joinery'), false);
  // …and the CHOICE is not lost: it writes `design.joinery`, from the panel
  // T36 preserved whole.
  assert.match(PANEL, /data-joinery-option=\{t\.id\}/);
  assert.match(PANEL, /setDesign\(\{ joinery: t\.id \}\)/);
});

test('F4 — ONE front-type choice: the tail repeat is gone, the per-front gallery stays', () => {
  // The per-front gallery — F4 says it stays, by name.
  assert.match(WIZ, /data-style-slot=\{t\.id\}/);
  assert.match(WIZ, /data-style-gallery-for=\{t\.id\}/);
  assert.match(WIZ, /<FrontStyleGallery/);
  assert.equal((WIZ.match(/<FrontStyleGallery/g) || []).length, 1, 'ONE gallery, not two');
  // Slot 1's shape IS the project's shape, so nothing became unreachable.
  assert.match(WIZ, /setProjectDefaults\(\{ fronts: \{ style: id \} \}\)/);
  // The tail's second gallery and its node are gone.
  assert.doesNotMatch(WIZ, /data-settings-section="door-style"/);
  assert.equal(WIZARD_NODES.some((n) => n.id === 'fronts.style'), false);
  // `+ New style` was in that section's header and is NOT part of the repeat —
  // it makes one of the workshop's own named styles, so it moved to the list
  // of them rather than going with the gallery.
  assert.match(WIZ, /data-new-style="1"/);
  assert.match(WIZ, /data-wizard-node="fronts\.door-styles"/);
  const styles = WIZ.slice(WIZ.indexOf('fronts.door-styles'));
  assert.ok(styles.indexOf('data-new-style="1"') > -1, '+ New style stands with the styles it makes');
});

// ══ step 6 ══════════════════════════════════════════════════════════════════

test('F4 — the wizard’s sixth step is the SUMMARY, not a second Hardware', () => {
  assert.deepEqual(WIZARD_STEPS, ['info', 'type', 'scope', 'room', 'wall', 'settings', 'summary']);
  assert.equal(WIZARD_STEPS.includes('hardware'), false, 'removed by name (iron rule 4)');
  assert.deepEqual(stepsInScope('wall'), ['info', 'type', 'scope', 'wall', 'settings', 'summary']);
  assert.deepEqual(stepsInScope('room'), ['info', 'type', 'scope', 'room', 'settings', 'summary']);
  assert.equal(backStep('summary', 'wall'), 'settings');
  // The flow renders it, and no longer renders a hardware step at all.
  assert.match(FLOW, /<WizardSummary/);
  assert.doesNotMatch(FLOW, /<WizardHardware/);
  assert.doesNotMatch(FLOW, /step === 'hardware'/);
  // …and its fields already live in tab 5.4, which is where `Change…` sends a
  // hand that wants them.
  assert.match(WIZ, /<WizardHardware audience=\{audience\}/);
  assert.match(SUM, /onChangeTab\('hardware'\)/);
});

test('F4 — ONE button leaves step 6, and `Save as set & start` is gone', () => {
  assert.match(FLOW, /data-start-designing="1"/);
  assert.doesNotMatch(FLOW, /data-save-as-set/);
  assert.doesNotMatch(FLOW, /Save as set &amp; start<\/button>/);
  assert.doesNotMatch(FLOW, /Name this set…/, 'the footer’s naming detour went with it');
  // The OFFER survives, on the summary, with its own modal to be named in.
  assert.match(SUM, /data-open-save-set="1"/);
  assert.match(SUM, /Save these as your standard\?/);
  assert.match(SUM, /<SaveSettingsSetModal/);
});

test('F4 — the whole project in miniatures, with a Change per section', () => {
  for (const node of ['summary.project', 'summary.decors', 'summary.dimensions',
    'summary.hardware', 'summary.production']) {
    assert.ok(SUM.includes(`node="${node}"`), `${node} has a section`);
  }
  assert.match(SUM, /data-summary-change=\{node\}/);
  // The decor tiles are the SAME single tile the tabs show (F3).
  assert.match(SUM, /import ChosenDecorTile from '\.\/ChosenDecorTile\.jsx'/);
  assert.match(SUM, /chosenTile\(\{/);
  assert.match(SUM, /data-summary-tile=\{`carcass:\$\{t\.id\}`\}/);
  assert.match(SUM, /data-summary-tile=\{`front:\$\{t\.id\}`\}/);
  // …and the numbers the job is cut at.
  assert.match(SUM, /projectDimensions\(design, profile, heights\)/);
});

test('F4 — the settings’ own summary sub-tab folded into it', () => {
  assert.equal(WIZARD_TABS.some((t) => t.id === 'podsumowanie'), false);
  assert.equal(tabAfter('production', 'factory'), null, 'the settings walk ends at Produkcja');
  assert.doesNotMatch(WIZ, /tab === 'podsumowanie'/);
  // Its rows are step 6's, and still filtered by the same tree.
  assert.ok(WIZARD_NODES.some((n) => n.tab === 'summary'));
  const hidden = hiddenNodes('retail');
  assert.ok(hidden.includes('summary.production'), 'a client is not shown the measured thicknesses');
  assert.ok(hidden.includes('summary.save-set'), '…nor the workshop’s settings sets');
  assert.equal(hidden.includes('summary.decors'), false, 'the decors are exactly what he IS shown');
});

test('F4 — where the user stands in step 5 survives leaving it', () => {
  // The `Change…` on a summary section is a DETOUR: it goes back to step 5,
  // and coming back must not have forgotten the tab, the strip or the walk.
  // That is only possible if the flow holds the position rather than the
  // component that unmounts.
  assert.match(FLOW, /const \[walk, setWalk\] = useState\(\{/);
  assert.match(FLOW, /walk=\{walk\}\s*\n\s*onWalk=\{setWalk\}/);
  assert.match(WIZ, /walk = null, onWalk = null/);
  assert.match(WIZ, /const raw = \(walk && walk\.tab\) \? walk : ownWalk;/);
  // …and left out — the Settings ▸ Project settings door — it keeps its own.
  assert.match(WIZ, /const \[ownWalk, setOwnWalk\] = useState/);
});
