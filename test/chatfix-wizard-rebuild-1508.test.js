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
test('step 4 is TWO containers, and the fronts are locked until the carcasses save', () => {
  assert.match(ws, /data-carcass-container="1"/);
  assert.match(ws, /data-fronts-container="1"/);
  assert.match(ws, /data-fronts-locked=\{carcSaved \? '0' : '1'\}/);
  assert.match(ws, /pointer-events-none/, 'the lock is real, not decorative');
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
test('the step-5 Next waits for BOTH saves — and for nothing else', () => {
  // T45 F7: *"Next validates ONLY the current tab."* The mockup's own gate —
  // both containers saved — is untouched; what left is T44's `blocked`, which
  // held a joiner on step 5 for a number answered on another screen and said
  // so in a tooltip. That conflict is stated at its field now, with a door
  // beside it, and `Start designing` still refuses a job that cannot be built.
  assert.match(flow, /disabled=\{!gates\.carcasses \|\| !gates\.fronts\}/);
});
test('the footer is ONE button now, and it starts AT ONCE', () => {
  // ─── TURN 45 (CLAUDE.md F4 / iron rule 4) ────────────────────────────────
  // *"(`Save as set & start` is gone; the standard was already offered at the
  // settings finale.)"* Two buttons that both started the job, one of which
  // grew a name field in the footer first, are one button. The OFFER survives
  // on the summary itself — `data-open-save-set`, with the naming done in
  // `SaveSettingsSetModal`, which is where it has had room since T44 F8.
  assert.equal(flow.indexOf('data-save-as-set="1"'), -1, 'the second button is gone by name');
  assert.ok(flow.indexOf('data-start-designing="1"') > -1);
  assert.match(flow, /data-start-designing="1"[\s\S]{0,120}onClick=\{\(\) => onStart\(\)\}/,
    'the primary starts AT ONCE — no naming detour');
  const summary = readFileSync(new URL('../src/components/WizardSummary.jsx', import.meta.url), 'utf8');
  assert.match(summary, /data-open-save-set="1"/, 'the offer is on the summary');
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
