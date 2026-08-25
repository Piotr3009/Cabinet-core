import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign, projectHeights } from '../src/engine/design.js';
import { wizardStartBlockers } from '../src/engine/projectSettings.js';
import { visibleTabs, tabNumber } from '../src/lib/wizardTabs.js';

// ─── TURN 49 · F7 — EDITING A SETUP IS NOT A CHAIN ──────────────────────────
//
// The owner, 25.08.2026: *"jak juz mamy edit setup to powinno byc mozliwosc
// przeskakiwania z 5.1 do 5.4 etc, bo juz bylo ustawione i nie potrzebujemy
// sztywnego lancucha — bo zmieniamy tylko niektore itemy, i jest po zmianie
// przycisk update and save."*
//
// A NEW project keeps its chain: the steps carry each other and skipping one
// would leave a hole. An EXISTING project is the opposite case — everything is
// already answered and he opens the window to change one thing.

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const DOOR = readFileSync(new URL('../src/components/DesignSettingsModal.jsx', import.meta.url), 'utf8');

// ══ the jump ═══════════════════════════════════════════════════════════════

test('F7 — through the EDIT door every tab is a place you can be', () => {
  assert.match(WIZ, /const canJump = editDoor \|\| !ahead;/);
  assert.match(WIZ, /disabled=\{!canJump\}/);
  assert.match(WIZ, /data-tab-jump=\{canJump \? '1' : '0'\}/);
  assert.match(WIZ, /data-wizard-jumpable=\{editDoor \? '1' : '0'\}/);
  // An answered step reads as answered: `visited`, not a grey `ahead`.
  assert.match(WIZ, /const state = t\.id === tab \? 'current' : \(\(editDoor \|\| !ahead\) \? 'visited' : 'ahead'\);/);
});

test('F7 — 5.1 → 5.4 is one move, and the strip really does carry those numbers', () => {
  const tabs = visibleTabs('factory');
  const numbers = tabs.map((t) => tabNumber(t.n));
  assert.ok(numbers.includes('5.1') && numbers.includes('5.4'), numbers.join(' '));
  // The jump is `goTab`, the same one the chain uses — one navigation, two
  // rules about when it is offered, never two navigations.
  assert.match(WIZ, /onClick=\{\(\) => goTab\(t\.id\)\}/);
  assert.match(WIZ, /const goTab = \(id\) => \{/);
  // …and it marks the tab visited on arrival, which is what makes it "back and
  // forth" rather than a one-way jump in a new project too.
  assert.match(WIZ, /visited: visited\.includes\(id\) \? visited : \[\.\.\.visited, id\]/);
});

test('F7 — the submodal dots jump too, through the same door', () => {
  assert.match(WIZ, /disabled=\{!editDoor && carcStops\.indexOf\(stop\) > carcStops\.indexOf\(carcAt\)\}/);
  assert.match(WIZ, /disabled=\{!editDoor && frontStops\.indexOf\(stop\) > frontStops\.indexOf\(frontAt\)\}/);
});

test('F7 — the chain in NEW-project mode is untouched', () => {
  // `editDoor` is FALSE for the wizard, so `canJump` collapses to `!ahead` —
  // exactly the rule T44 wrote and T45 kept.
  assert.match(WIZ, /const editDoor = door === 'project';/);
  assert.match(WIZ, /const ahead = !visited\.includes\(t\.id\);/);
  // Nothing else in the strip is gated on anything: not a conflict, not a
  // blocker. T45 F7's ruling, still standing.
  assert.doesNotMatch(WIZ, /disabled=\{[^}]*conflict/);
  assert.doesNotMatch(WIZ, /disabled=\{[^}]*blocker/);
});

// ══ Update and save ════════════════════════════════════════════════════════

test('F7 — the footer carries Update and save, and it is the ONE save path', () => {
  assert.match(DOOR, /data-update-and-save="1"/);
  assert.match(DOOR, /Update and save/);
  // The same function File ▸ Save and the top bar's Save button call. One save
  // path, so a project saved from this window is a project saved.
  assert.match(DOOR, /import \{ persistProject \} from '\.\.\/lib\/persist\.js'/);
  assert.match(DOOR, /await persistProject\(\{ project, units \}\)/);
  assert.match(DOOR, /markSaved\(saved\)/);
  // It commits from WHEREVER the user stands: nothing about the tab, the walk
  // or the sequence is read before it saves.
  const commit = DOOR.slice(DOOR.indexOf('const updateAndSave'), DOOR.indexOf('return ('));
  assert.doesNotMatch(commit, /tab|walk|stop|Next/);
});

test('F7 — Done is untouched (iron rule 4)', () => {
  assert.match(DOOR, /Done\n?\s*<\/button>/);
  assert.match(DOOR, /onClick=\{closeModal\}/);
});

test('F7 — a jump may not commit a setup that was never finished', () => {
  assert.match(DOOR, /import \{ wizardStartBlockers \}/);
  assert.match(DOOR, /disabled=\{blockers\.length > 0 \|\| saving\}/);
  // …and it SAYS so, beside the button, not only in a tooltip.
  assert.match(DOOR, /data-settings-unanswered="1"/);
  assert.match(DOOR, /\{blockers\[0\]\.message\}/);

  // The gate is real: the same pure engine function the wizard's one committing
  // button is held to, so the two doors cannot disagree about a buildable job.
  const unanswered = migrateDesign({});
  const answered = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'egger', material_id: 'gen18' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'laminate', material_id: 'gen18' }] },
  });
  const ask = (d) => wizardStartBlockers({
    design: d, heights: projectHeights(d, P), roomHeight: 2400, profile: P,
  }).blockers;
  assert.ok(ask(unanswered).length > 0, 'a setup with no boards is refused');
  assert.equal(ask(unanswered)[0].code, 'materials');
  assert.equal(ask(answered).length, 0, '…and a finished one is not');
});

test('F7 — the sequence says the chain is optional when the door is the edit door', () => {
  assert.match(WIZ, /if \(editDoor && !nextBlocked\) \{/);
  assert.match(WIZ, /Every step above is one click away/);
});
