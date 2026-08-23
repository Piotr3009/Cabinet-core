import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  FACTORY_ROUTE, RETAIL_ROUTE, audienceForPath, entryAudience, isRetailRoute,
} from '../src/lib/appEntry.js';
import { nodeVisible, tabVisible, visibleTabs } from '../src/lib/wizardTabs.js';

// ─── TURN 45 · F2 — THE TOGGLE DIES, AND 5.1 IS CLEANED ─────────────────────
//
// CLAUDE.md, 23.08.2026:
//
//   *"Number + Client: REMOVED from 5.1 (step 1 owns them). Type stays,
//   read-only."*
//   *"The Factory/Retail toggle: REMOVED. One codebase, TWO entries: the
//   workshop app hardwires `factory`; a separate route `/client` (the future
//   retail site mounts it) hardwires `retail`. The audience tree from T44 stays
//   as the single filter."*
//
// Both are iron-rule-4 removals, named in the spec and named in the PR body.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const UI = readFileSync(new URL('../src/stores/uiStore.js', import.meta.url), 'utf8');
const TOP = readFileSync(new URL('../src/components/TopBar.jsx', import.meta.url), 'utf8');
const START = readFileSync(new URL('../src/components/StartScreen.jsx', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

// ══ the two entries ═════════════════════════════════════════════════════════

test('F2 — /client is the retail door and everything else is the workshop’s', () => {
  assert.equal(RETAIL_ROUTE, '/client');
  assert.equal(FACTORY_ROUTE, '/');
  assert.equal(audienceForPath('/client'), 'retail');
  assert.equal(audienceForPath('/client/'), 'retail');
  assert.equal(audienceForPath('/client/kitchens'), 'retail');
  assert.equal(isRetailRoute('/client'), true);

  assert.equal(audienceForPath('/'), 'factory');
  assert.equal(audienceForPath(''), 'factory');
  assert.equal(audienceForPath('/project/17'), 'factory');
  // A path that merely BEGINS with the letters is not the door — `/clients` is
  // somebody's page about clients, not the client's configurator.
  assert.equal(audienceForPath('/clients'), 'factory');
  assert.equal(audienceForPath('/clientele'), 'factory');
});

test('F2 — outside a browser the honest answer is the workshop’s', () => {
  assert.equal(entryAudience(null), 'factory');
  assert.equal(entryAudience({ pathname: '/client' }), 'retail');
  assert.equal(entryAudience({ pathname: '/' }), 'factory');
});

test('F2 — the store reads the DOOR, and remembers nothing', () => {
  assert.match(UI, /audience: entryAudience\(\),/);
  assert.match(UI, /setAudience: \(v\) => set\(\{ audience: normaliseAudience\(v\) \}\)/);
  // The persistence went with the switch it served.
  assert.doesNotMatch(UI, /AUDIENCE_KEY/);
  assert.doesNotMatch(UI, /saveAudience|loadAudience/);
  // …and so did the switch's own verb.
  assert.doesNotMatch(UI, /toggleAudience/);
});

test('F2 — the page SAYS which door it was opened through', () => {
  assert.match(APP, /data-app-entry/);
});

// ══ the removal itself ══════════════════════════════════════════════════════

test('F2 — the Factory/Retail toggle is gone from every surface that carried it', () => {
  assert.equal(
    existsSync(new URL('../src/components/AudienceToggle.jsx', import.meta.url)),
    false,
    'the component IS the toggle — it goes with it',
  );
  for (const [name, src] of [['TopBar', TOP], ['StartScreen', START], ['WizardSettings', WIZ]]) {
    assert.doesNotMatch(src, /<AudienceToggle/, `${name} still renders the switch`);
    assert.doesNotMatch(src, /from '\.\/AudienceToggle\.jsx'/, `${name} still imports it`);
  }
  // Nothing anywhere may set the head by hand any more.
  assert.doesNotMatch(WIZ, /setAudience/);
  assert.doesNotMatch(TOP, /setAudience/);
  assert.doesNotMatch(START, /setAudience/);
});

test('F2 — the T44 audience TREE is untouched: one tree, one filter', () => {
  // Iron rule 4 removes the SWITCH, never the filter it drove. Retail still
  // sees the client's rows and none of the workshop's, off the same table.
  assert.equal(tabVisible('carcases', 'retail'), true);
  assert.equal(nodeVisible('carcases.picker', 'retail'), true);
  assert.equal(nodeVisible('carcases.cnc-corner', 'retail'), false);
  assert.equal(nodeVisible('carcases.stock-board', 'retail'), false);
  assert.ok(visibleTabs('factory').length >= visibleTabs('retail').length);
});

// ══ 5.1, cleaned ════════════════════════════════════════════════════════════

test('F2 — Number and Client are not ASKED on 5.1; step 1 owns them', () => {
  // T44's half-answer — a read-only copy — is gone with the fields.
  assert.doesNotMatch(WIZ, /readOnly=\{!editDoor\}/);
  assert.doesNotMatch(WIZ, /title=\{editDoor \? undefined : 'Chosen in step 1 — go Back to change it'\}/);
  // What stands in their place is one sentence that SAYS them.
  assert.match(WIZ, /data-identity-said="1"/);
  assert.match(WIZ, /asked on step 1, and changed there/);
});

test('F2 — the EDIT door keeps them, because there they are the only copy', () => {
  // Settings ▸ Project settings has no step 1 to have asked, so the fields are
  // real inputs there and nothing a joiner could set has been taken away.
  assert.match(WIZ, /data-project-number="1"/);
  assert.match(WIZ, /data-project-client="1"/);
  assert.match(WIZ, /\{editDoor \? \(/);
});

test('F2 — the Type stays, and stays a LABEL in the wizard', () => {
  assert.match(WIZ, /data-wizard-type-label="1"/);
  assert.match(WIZ, /data-project-type="1"/, 'and an editable select from the menu door');
  assert.match(WIZ, /Chosen in step 2 — go Back to change it/);
});
