// ─── Turn 34, CLAUDE.md F1: the board behind EVERY look, and a gate that holds
//
// The owner, 16.08.2026, on finding the fronts container without a board
// assignment: "w ustawieniach frontów nie ma przypisania materiałów, jest w
// carcasach ale nie ma we frontach — to jest karygodne, niewybaczalne,
// podstawowe przypisanie materiałów to podstawa tego programu." And the scope:
// "przywracamy przypisanie materiałów bez różnicy jaki to wybór — czy laminat
// czy mdf czy spray etc — to jest podstawa wszystkiego" … "bez przypisania
// materiałów nie powinno puścić dalej — to jest mega ważne."
//
// Two halves, and the feature is only done with both: the SELECT must stand on
// every picker path (source level, the grammar turn33-f7 used on DoorModal),
// and the GATE must count only `material_id` — a colour or a finish alone is
// not an answer to "what board is this cut from".

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { materialsAssigned, wizardStartBlockers } from '../src/engine/projectSettings.js';
import { migrateDesign, projectHeights } from '../src/engine/design.js';

const SRC = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');

// ─── source level: ONE select, on EVERY path ───────────────────────────────

test('the stock-board select is ONE thing, lifted out of the decor branch', () => {
  // Exactly one select in the file carries the board list — if a second copy
  // ever appears the two can drift, which is how the colour path lost its own.
  const selects = SRC.match(/data-stock-board=/g) || [];
  assert.equal(selects.length, 1, 'one select, one grammar');
  assert.match(SRC, /const stockBoardSelect = \(kind, t\) =>/,
    'the select is a shared helper, not a branch-local block');
  // The grammar itself: the two optgroups and the soft-start wording.
  assert.match(SRC, /data-stock-board=\{`\$\{kind\}:\$\{t\.id\}`\}/,
    'addressable per kind and per slot on every path');
  assert.match(SRC, /<optgroup label="Generic — geometry only, assign a real board before check-out">/);
  assert.match(SRC, /<optgroup label="Stock">/);
  // Wired to the existing pickers, both kinds.
  assert.match(SRC, /\? pickCarcassBoard\(t\.id, e\.target\.value \|\| null\)/);
  assert.match(SRC, /: pickFrontBoard\(t\.id, e\.target\.value \|\| null\)\)\}/);
});

test('the colour path and the veneer path both render it — the two holes closed', () => {
  // The colour branch (Spraying — the DEFAULT front source).
  const colour = SRC.slice(SRC.indexOf("if (picker === 'colour')"), SRC.indexOf("if (picker === 'veneer'"));
  assert.match(colour, /data-spray-picker/, 'still the ColourPicker…');
  assert.match(colour, /\{stockBoardSelect\(kind, t\)\}/, '…and now the board under it');

  // The carcass veneer branch.
  const veneer = SRC.slice(SRC.indexOf("if (picker === 'veneer'"), SRC.indexOf('// decor grid'));
  assert.match(veneer, /<VeneerPicker/);
  assert.match(veneer, /\{stockBoardSelect\(kind, t\)\}/);

  // And the decor grid keeps it — three paths, three renders, one helper.
  const decor = SRC.slice(SRC.indexOf('// decor grid'));
  assert.match(decor.slice(0, decor.indexOf('const sourceSeg')), /\{stockBoardSelect\(kind, t\)\}/);
  assert.equal((SRC.match(/\{stockBoardSelect\(kind, t\)\}/g) || []).length, 3,
    'every picker kind renders the same select');
});

test('the Save buttons are still wired to the missing lists', () => {
  assert.match(SRC, /disabled=\{carcassMissing\.length > 0 \|\| carcSaved\}/);
  assert.match(SRC, /disabled=\{frontsMissing\.length > 0 \|\| frontsSaved\}/);
});

// ─── logic level: the hard gate ────────────────────────────────────────────

const slot = (over = {}) => migrateDesign({
  carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
  fronts: { types: [{ id: 'f1', label: 'Front 1', material_id: 'generic-18' }] },
  ...over,
});

test('a SPRAY front with a colour and no board is MISSING — and Generic clears it', () => {
  const sprayed = slot({
    fronts: {
      types: [{
        id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#334455', name: 'Hague Blue' },
      }],
    },
  });
  const missing = materialsAssigned(sprayed, P).fronts.filter((a) => !a.assigned);
  assert.deepEqual(missing.map((s) => s.label), ['Front 1'],
    'a colour is what it LOOKS like, not what it is CUT FROM');

  const answered = slot({
    fronts: {
      types: [{
        id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#334455', name: 'Hague Blue' }, material_id: 'generic-18',
      }],
    },
  });
  assert.equal(materialsAssigned(answered, P).all, true, 'Generic counts — the soft-start law stands');
});

test('a DECOR front with a finish and no board is STILL missing', () => {
  const faced = slot({
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'laminate', finish_id: 'decor:W1000' }] },
  });
  assert.deepEqual(
    materialsAssigned(faced, P).fronts.filter((a) => !a.assigned).map((s) => s.label),
    ['Front 1'],
  );
});

test('the carcass answers the same question on veneer and on spray', () => {
  const veneered = slot({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'veneer', finish_id: 'veneer:oak' }] },
  });
  assert.deepEqual(
    materialsAssigned(veneered, P).carcass.filter((a) => !a.assigned).map((s) => s.label),
    ['Carcass 1'],
  );
  // The project-wide sprayed carcass colour no longer answers for a slot
  // either — T32 read it as an assignment, 16.08 says it is not one.
  const sprayed = slot({
    colour: { carcass: { hex: '#ffffff', name: 'White' } },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1' }] },
  });
  assert.deepEqual(
    materialsAssigned(sprayed, P).carcass.filter((a) => !a.assigned).map((s) => s.label),
    ['Carcass 1'],
  );
  const answered = slot({
    colour: { carcass: { hex: '#ffffff', name: 'White' } },
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', material_id: 'generic-18' }] },
  });
  assert.equal(materialsAssigned(answered, P).all, true);
});

test('nothing assigned anywhere → Start is blocked, and the message names the board', () => {
  const empty = migrateDesign({
    carcass: { types: [{ id: 'c1', label: 'Carcass 1', source: 'spray' }] },
    fronts: { types: [{ id: 'f1', label: 'Front 1', source: 'spray', colour: { hex: '#123456' } }] },
  });
  const { blockers } = wizardStartBlockers({
    design: empty, heights: projectHeights(empty, P), roomHeight: 2400, profile: P,
  });
  assert.deepEqual(blockers.map((b) => b.code), ['materials']);
  assert.match(blockers[0].message, /Assign a stock board to Carcass 1, Front 1/);
  assert.match(blockers[0].message, /a colour or a decor alone does not/);
});

test('boards on both containers → nothing blocks', () => {
  const design = slot();
  const { blockers } = wizardStartBlockers({
    design, heights: projectHeights(design, P), roomHeight: 2400, profile: P,
  });
  assert.deepEqual(blockers, []);
});
