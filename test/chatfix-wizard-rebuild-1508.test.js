import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateDesign } from '../src/engine/design.js';

// ─── CHAT FIX 15.08.2026 (evening): THE WIZARD, REBUILT TO THE MOCKUP ───────
//
// The owner rejected T32's one-list step 4 ("nie oddzielone są carcasy od
// frontów… bardzo źle") and the replacement was ITERATED AS A MOCKUP,
// v1 → v4, his corrections at every step, v4 his "podoba mi się". These
// asserts hold the code to that mockup's LETTER — the two containers, the
// gate, HIS orders of the source buttons (deliberately different per
// container), the returned dog-bone, the returned swatches, the hardware
// re-rulings — so the next rebuild cannot quietly drop them again.

const ws = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');
const wh = readFileSync(new URL('../src/components/WizardHardware.jsx', import.meta.url), 'utf8');
const flow = readFileSync(new URL('../src/components/NewProjectFlow.jsx', import.meta.url), 'utf8');

// ── the recorded CNC corner ──
test('cncCorner: dogbone is the default, square survives, junk falls back', () => {
  assert.equal(migrateDesign({}).cncCorner, 'dogbone');
  assert.equal(migrateDesign({ cncCorner: 'square' }).cncCorner, 'square');
  assert.equal(migrateDesign({ cncCorner: 'mitre45' }).cncCorner, 'dogbone');
});

// ── two containers, and the fronts' lock ──
test('materials keep separate containers; the setup workspace allows direct editing', () => {
  assert.match(ws, /data-carcass-container="1"/);
  assert.match(ws, /data-fronts-container="1"/);
  // The October approved sidebar makes sections directly accessible. The old
  // standalone form keeps its lock; material validity still gates confirmation.
  assert.match(ws, /data-fronts-locked=\{carcSaved \|\| embedded \? '0' : '1'\}/);
  assert.match(ws, /aria-disabled=\{!carcSaved && !embedded\}/);
  assert.match(ws, /nextBlocked = missing\.length > 0;/);
  assert.match(ws, /data-save-carcasses="1"/);
  assert.match(ws, /data-save-fronts="1"/);
});

// ── the owner's button orders — deliberately DIFFERENT per container ──
test("carcasses offer Laminate · Veneer · Spraying, in the owner's order", () => {
  assert.match(ws, /CARCASS_ORDER = \['egger', 'veneer', 'sprayed'\]/);
  assert.match(ws, /egger: 'Laminate'/);
  assert.match(ws, /sprayed: 'Spraying'/);
});
test("fronts offer Spraying · Veneer · Laminate — his order, the mirror", () => {
  assert.match(flowOrWs(/FRONT_ORDER = \['spray', 'veneer', 'laminate'\]/), /spray/);
  assert.match(ws, /spray: 'Spraying'/);
  assert.match(ws, /laminate: 'Laminate'/);
});
function flowOrWs(re) { const m = ws.match(re); assert.ok(m, `missing ${re}`); return m[0]; }

// ── the returned pieces ──
test('the dog-bone choice returns, drawn by the ORIGINAL JoineryPreview', () => {
  assert.match(ws, /import JoineryPreview from '\.\/JoineryPreview\.jsx'/);
  assert.match(ws, /data-cnc-corner="1"/);
  assert.match(ws, /data-cnc-corner-option=\{id\}/);
  assert.match(ws, /setDesign\(\{ cncCorner: id \}\)/);
});
test('the chosen list returns, with the mini swatches', () => {
  assert.match(ws, /data-carcass-chosen="1"/);
  assert.match(ws, /data-fronts-chosen="1"/);
  assert.match(ws, /function ChosenRow/);
  assert.match(ws, /loadDecorCatalogue/, 'swatch hexes come from the real catalogue');
});
test('spray is the colour LISTS — the picker the sources already name', () => {
  // ─── TURN 44 (CLAUDE.md F4): AND NOW IT IS A LIST AND ONLY A LIST ────────
  // The owner said it twice — "bez cholernych kafelek", and again on 23.08:
  // *"Spray: dropdown list, NO tiles"*.
  //
  // ─── TURN 45 (CLAUDE.md F3): …IN THE PICKER'S OWN WINDOW ─────────────────
  // The path is still the one the sources have always named. What moved is
  // WHERE the list is drawn: `MaterialChoicePanel` holds one slot and one
  // chosen tile now, and the list itself is in `DecorPickerModal`, which is
  // still a list and still draws no tiles at all.
  assert.match(ws, /data-spray-picker=/);
  const modal = readFileSync(new URL('../src/components/DecorPickerModal.jsx', import.meta.url), 'utf8');
  assert.match(modal, /data-spray-list="1"/);
  assert.match(modal, /data-spray-option=/);
  assert.match(modal, /COLOUR_SYSTEMS/, 'the same RAL / F&B lists ColourPicker reads');
});

// ── the flow's gate and the footer's order ──
test('review is reachable while Start requires both material confirmations', () => {
  // The unified sidebar allows review before completion. Confirmation belongs
  // to the data held by the flow, not an effect in a screen that may unmount.
  assert.match(flow, /carcasses: Boolean\(walk\.carcSaved\), fronts: Boolean\(walk\.frontsSaved\)/);
  assert.match(flow, /!gates\.carcasses \? \['Confirm the carcases section\.'/);
  assert.match(flow, /!gates\.fronts \? \['Confirm the fronts section\.'/);
  const expression = flow.match(/const canStart = ([^;]+);/)[1];
  const canStart = new Function('created', 'blockers', 'confirmationHints', `return ${expression}`);
  assert.equal(canStart(true, [], []), true);
  assert.equal(canStart(false, [], []), false);
  assert.equal(canStart(true, [{ code: 'materials' }], []), false);
  assert.equal(canStart(true, [], ['Confirm the fronts section.']), false);
});
test('one primary action starts immediately from review, without naming a set', () => {
  assert.equal(flow.indexOf('data-save-as-set="1"'), -1);
  assert.equal((flow.match(/data-setup-primary="1"/g) || []).length, 1);
  assert.match(flow, /data-start-designing=\{step === 'summary' \? '1' : undefined\}/);
  assert.match(flow, /step === 'summary' \? onStart : nav\?\.next/);
  assert.match(flow, /disabled=\{primaryDisabled\} onClick=\{primaryAction\}/);
  const summary = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');
  assert.match(summary, /data-open-save-set="1"/);
  assert.match(summary, /Save these as your standard\?/);
});

// ── the hardware re-rulings ──
test('hinges: Silver / Onyx and NOTHING ELSE — no gold on a hinge', () => {
  assert.match(wh, /HINGE_FINISHES = \[\['nickel', 'Silver'\], \['onyx', 'Onyx'\]\]/);
  assert.doesNotMatch(wh, /HINGE_FINISHES.*gold/);
});
test('internal metal: Silver / Gold — the rail may be brass, the cup may not', () => {
  assert.match(wh, /INTERNAL_METALS = \[\['chrome', 'Silver'\], \['gold', 'Gold'\]\]/);
});
test('push-to-open is the runner variant the design already carries', () => {
  // ─── TURN 45 (CLAUDE.md F5) ──────────────────────────────────────────────
  // Still the same field and still no new one. What changed is that the WRITE
  // goes through the rule — *"any handles chosen → push-to-open is forced OFF
  // and LOCKED"* — so a handled job cannot be given TIP-ON from this control
  // any more than from the workshop's runner-variant row.
  assert.match(wh, /data-push-to-open="1"/);
  assert.match(wh, /setDesign\(pushToOpenPatch\(design, id === 'T'\)\)/);
  const PTO = readFileSync(new URL('../src/lib/pushToOpen.js', import.meta.url), 'utf8');
  assert.match(PTO, /runners: \{ \.\.\.\(design\?\.runners \|\| \{\}\), variant \}/);
  assert.match(wh, /TIP-ON/);
});
