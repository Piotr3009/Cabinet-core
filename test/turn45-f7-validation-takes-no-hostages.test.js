import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  conflictsAtField, conflictsOnTab, crossTabConflicts, culpritScreen, tabIsBlocked,
} from '../src/lib/wizardConflicts.js';
import { migrateDesign, projectHeights } from '../src/engine/design.js';
import { wizardStartBlockers } from '../src/engine/projectSettings.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

// ─── TURN 45 · F7 — VALIDATION STOPS TAKING HOSTAGES ────────────────────────
//
// The owner, 23.08.2026: *"musiałem wszystko od nowa przechodzić — to jest
// chore."* He had set a wardrobe taller than the room. The wizard would not let
// him leave step 5, said so in a tooltip on a disabled button, named nothing he
// could act on, and the fix was two steps back where going back meant walking
// the whole thing forward again.
//
// CLAUDE.md:
//
//   *"A cross-tab conflict (wardrobe taller than the room) = a red note AT THE
//   FIELD naming the culprit + a one-click jump to it (Wall/Room).
//   Fixing it returns the user STRAIGHT to where they were (Summary included).
//   Every earlier choice survives — nothing resets, nothing re-asks.
//   Next validates ONLY the current tab. Visited tabs stay clickable through
//   any error state.
//   Test: seed the conflict, fix the room, assert every prior field value
//   intact and Summary reachable in one click."*

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const SUM = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');
const FLOW = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');

/** A wardrobe project, at a given height, in a room of a given height. */
const seed = (extra = {}) => migrateDesign({
  projectType: 'wardrobe',
  scope: 'room',
  heights: { tall: 2100, toeKick: 100 },
  ...extra,
});
const conflictsFor = (design, roomHeight) => crossTabConflicts({
  design, heights: projectHeights(design, P), roomHeight, profile: P,
});

// ══ the reader ══════════════════════════════════════════════════════════════

test('F7 — a wardrobe taller than the room is a NAMED conflict, not a mood', () => {
  const design = seed({ heights: { tall: 2400, toeKick: 100 } });
  const [c, ...rest] = conflictsFor(design, 2100);
  assert.equal(rest.length, 0, 'one problem, said once');
  assert.equal(c.code, 'over-ceiling');
  assert.equal(c.field, 'tall', 'the note belongs beside the height it is about');
  assert.equal(c.tab, 'settings');
  // NAMING THE CULPRIT: both numbers, so the hand knows which one it means to
  // change before it has gone anywhere.
  assert.match(c.message, /2500 mm/, 'the wardrobe, stacked');
  assert.match(c.message, /2100 mm/, '…and the room it will not fit in');
  assert.equal(c.culprit, 'room');
  assert.match(c.jumpLabel, /Fix the room/);
});

test('F7 — a ONE-WALL job is sent to the WALL, not to a plan it has never seen', () => {
  const design = seed({ scope: 'wall', heights: { tall: 2400, toeKick: 100 } });
  const [c] = conflictsFor(design, 2100);
  assert.equal(c.culprit, 'wall');
  assert.match(c.message, /the wall/);
  assert.match(c.jumpLabel, /Fix the wall/);
  assert.deepEqual(culpritScreen('wall'), { step: 'wall', label: 'the wall', noun: 'wall' });
  assert.deepEqual(culpritScreen('room'), { step: 'room', label: 'the room', noun: 'room' });
});

test('F7 — the ceiling QUESTION has no culprit: the answer is three lines down', () => {
  // Inside the profile's question gap, and never answered: a 2100 stack in a
  // 2120 room is 20 mm off the ceiling.
  const design = seed({ heights: { tall: 2000, toeKick: 100 }, ceiling: null });
  const list = conflictsFor(design, 2120);
  const q = list.find((c) => c.code === 'ceiling-question');
  assert.ok(q, 'the unanswered question is a conflict too');
  assert.equal(q.culprit, null, 'a jump here would be a door to the room you are in');
  assert.equal(q.jumpLabel, null);
  // …and answering it makes it go away.
  assert.equal(conflictsFor(seed({ heights: { tall: 2000, toeKick: 100 }, ceiling: 'flush' }), 2120)
    .some((c) => c.code === 'ceiling-question'), false);
});

test('F7 — no conflict when the job fits, and none at all for a kitchen', () => {
  assert.deepEqual(conflictsFor(seed(), 2600), []);
  const kitchen = migrateDesign({ projectType: 'kitchen', heights: { tall: 2400 } });
  assert.deepEqual(conflictsFor(kitchen, 2100), [], 'a kitchen has no wardrobe stack to be too tall');
});

test('F7 — SEED THE CONFLICT, FIX THE ROOM: every prior field survives', () => {
  // CLAUDE.md's own test. The design is the record of every earlier choice;
  // the fix is a ROOM height, which is not on the design at all — so "nothing
  // resets, nothing re-asks" is structural rather than a promise.
  const design = seed({
    heights: { tall: 2400, toeKick: 100 },
    fronts: { style: 'S', types: [{ id: 'f1', label: 'Front 1', finish_id: 'egger:H1180_37' }] },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', finish_id: 'egger:U702_9', source: 'egger' }] },
    sheen: 35,
    infill: { sideWidth: 22 },
  });
  const before = JSON.stringify(design);
  assert.equal(conflictsFor(design, 2100).length, 1, 'seeded');

  // …the room grows. Nothing about the DESIGN moves.
  assert.deepEqual(conflictsFor(design, 2700), [], 'fixed');
  assert.equal(JSON.stringify(design), before, 'not one earlier answer was touched');
  assert.equal(design.fronts.style, 'S');
  assert.equal(design.carcass.types[0].finish_id, 'egger:U702_9');
  assert.equal(design.sheen, 35);
  assert.equal(design.infill.sideWidth, 22);

  // …and the job can now start, off the gate that has answered since T32.
  assert.equal(
    wizardStartBlockers({
      design, heights: projectHeights(design, P), roomHeight: 2700, profile: P,
    }).blockers.some((b) => b.code === 'over-ceiling'),
    false,
  );
});

test('F7 — the reader agrees with the gate: one opinion, seen from two ends', () => {
  const design = seed({ heights: { tall: 2400, toeKick: 100 } });
  const { blockers } = wizardStartBlockers({
    design, heights: projectHeights(design, P), roomHeight: 2100, profile: P,
  });
  const conflicts = conflictsFor(design, 2100);
  assert.ok(blockers.some((b) => b.code === 'over-ceiling'));
  assert.ok(conflicts.some((c) => c.code === 'over-ceiling'));
  // A second opinion about what is wrong is exactly what the owner would have
  // to walk twice.
  assert.deepEqual(
    conflicts.map((c) => c.code).sort(),
    blockers.filter((b) => b.code !== 'materials').map((b) => b.code).sort(),
  );
});

test('F7 — the helpers a surface asks: by field, by tab, and by whose turn it is', () => {
  const design = seed({ heights: { tall: 2400, toeKick: 100 } });
  const list = conflictsFor(design, 2100);
  assert.equal(conflictsAtField(list, 'tall').length, 1);
  assert.equal(conflictsAtField(list, 'depth').length, 0);
  assert.equal(conflictsOnTab(list, 'settings').length, 1);
  assert.equal(conflictsOnTab(list, 'fronts').length, 0);
  assert.equal(conflictsAtField(null, 'tall').length, 0);
});

// ══ NEXT VALIDATES ONLY THE CURRENT TAB ═══════════════════════════════════

test('F7 — a tab is gated by its OWN answer and by nothing else', () => {
  assert.equal(tabIsBlocked('carcases', { carcassesSaved: false }), true);
  assert.equal(tabIsBlocked('fronts', { frontsSaved: false }), true);
  assert.equal(tabIsBlocked('carcases', { carcassesSaved: true, frontsSaved: false }), false,
    'the fronts are not the carcasses’ business');
  // A conflict on 5.1 gates NO tab. That is the hostage-taking, named.
  assert.equal(tabIsBlocked('settings', {}), false);
  assert.equal(tabIsBlocked('production', {}), false);
});

test('F7 — the flow’s Next no longer holds a joiner for another screen’s number', () => {
  // ─── TURN 49 (CLAUDE.md F3): THE SAME GATE, ONE ROW LOWER ────────────────
  // The step-5 Next is drawn at the end of the SEQUENCE's own navigation row
  // now, because the flow's footer drew a second Back and a second Next an inch
  // under it. The gate did not move an inch: both containers saved, and F7's
  // ruling — no hostage for another screen's number — holds exactly as it did.
  const WIZS = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
  assert.match(WIZS, /nextBlocked = !carcSaved \|\| !frontsSaved;/);
  assert.doesNotMatch(WIZS, /nextBlocked = blockers/, 'no all-blockers gate reappeared in the sequence');
  assert.doesNotMatch(FLOW, /disabled=\{blocked \|\|/, 'T44’s all-blockers gate is gone');
  assert.doesNotMatch(FLOW, /const blocked = /);
  // `Start designing` — the one button that commits — still refuses a job that
  // cannot be built.
  const from = FLOW.indexOf("step === 'summary' && (");
  const start = FLOW.slice(from, FLOW.indexOf('Start designing', from));
  assert.match(start, /disabled=\{blockers\.length > 0\}/);
});

// ══ the note, the door, and the way back ═══════════════════════════════════

test('F7 — the red note stands AT THE FIELD, with the door beside it', () => {
  assert.match(WIZ, /import \{ conflictsAtField, crossTabConflicts \} from '\.\.\/lib\/wizardConflicts\.js'/);
  // A plain function CALLED from the JSX, never a component declared inside a
  // render: a component defined in a render body is a new TYPE every time, so
  // React rebuilds its DOM and the button is replaced between the mouse-down
  // and the mouse-up of a real click. The jump looked perfect and did nothing.
  assert.match(WIZ, /const conflictNotes = \(field\) => \{/);
  assert.match(WIZ, /\{conflictNotes\('tall'\)\}/);
  assert.doesNotMatch(WIZ, /const ConflictNote = /);
  assert.match(WIZ, /data-conflict=\{c\.code\}/);
  assert.match(WIZ, /data-conflict-field=\{c\.field\}/);
  assert.match(WIZ, /data-conflict-jump=\{c\.culprit\}/);

  assert.match(WIZ, /onClick=\{\(\) => onJump\(c\.culprit\)\}/);
});

test('F7 — the SUMMARY carries the same note, the same door, and its blockers out loud', () => {
  assert.match(SUM, /crossTabConflicts\(\{/);
  assert.match(SUM, /data-conflict-jump=\{c\.culprit\}/);
  assert.match(SUM, /data-blocker=\{b\.code\}/);
  assert.match(SUM, /data-blocker-goto="carcases"/);
});

test('F7 — the jump is a DETOUR: it remembers the step it left from', () => {
  assert.match(FLOW, /const \[detour, setDetour\] = useState\(null\);/);
  assert.match(FLOW, /const jumpTo = \(culprit\) => \{\s*\n\s*setDetour\(\{ back: step \}\);/);
  assert.match(FLOW, /setStep\(culprit === 'wall' \? 'wall' : 'room'\);/);
  assert.match(FLOW, /const leaveEditor = \(fallback\) => \{/);
  // Both editors return through it — the × as well as the Save, because a
  // detour abandoned is still a detour.
  assert.match(FLOW, /onClose=\{\(\) => leaveEditor\('scope'\)\}/);
  assert.match(FLOW, /onApplied=\{\(\) => leaveEditor\('settings'\)\}/);
  assert.match(FLOW, /onBack=\{\(\) => leaveEditor\('scope'\)\}/);
  assert.match(FLOW, /onSave=\{\(\) => leaveEditor\('settings'\)\}/);
  // …and both screens that can raise a conflict can raise the jump.
  assert.match(FLOW, /onJump=\{jumpTo\}/);
  assert.equal((FLOW.match(/onJump=\{jumpTo\}/g) || []).length, 2, 'step 5 AND the summary');
});

test('F7 — visited tabs stay clickable through any error state', () => {
  // Nothing about a conflict reaches the strip: the only thing that disables a
  // tab is being AHEAD of the walk.
  assert.match(WIZ, /disabled=\{state === 'ahead'\}/);
  assert.doesNotMatch(WIZ, /disabled=\{[^}]*conflict/);
  assert.doesNotMatch(WIZ, /disabled=\{[^}]*blocker/);
  // …and the walk survives the detour, so landing back on the strip finds it
  // exactly as it was (F4 lifted it; this is the reason it was lifted).
  assert.match(FLOW, /walk=\{walk\}/);
  assert.match(WIZ, /const raw = \(walk && walk\.tab\) \? walk : ownWalk;/);
});
