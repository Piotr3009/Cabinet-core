// ─── TURN 48, CLAUDE.md F6: ONE BUTTON — THE LED TOGGLES ────────────────────
//
// The owner, 25.08.2026: *"mamy przycisk dodania LED, to i ten sam przycisk
// usuwa LED — proste."*
//
// Every placement control in the lighting panel was `disabled={hasOf(…)}`:
// press it once and it went grey, and the only way back was to find the line in
// the list below and press its ×. A control that does a thing and then refuses
// to undo it has half a job.
//
// The panel is React, and this house tests React by READING it (the pattern
// `chatfix-1508-design.test.js` set): no component is mounted anywhere in this
// suite, and a JSX file cannot be imported by `node --test` at all. So the
// STORE half — that the mechanism the button now calls really does remove the
// line — is exercised for real, and the WIRING is read.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateDesign } from '../src/engine/design.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const PANEL = readFileSync(new URL('../src/components/LightingPanel.jsx', import.meta.url), 'utf8');

const store = () => useProjectStore.getState();
const itemsOf = () => migrateDesign(store().project.design).lighting.items;

function project() {
  store().loadProject({
    id: null,
    name: 't48-f6',
    room: migrateRoom({ height: 2500, corners: rectCorners(6000, 3000) }),
    design: { projectType: 'kitchen' },
  }, []);
  const { id } = store().addUnit('WUD');
  return id;
}

// ══ F6 — ONE BUTTON, BOTH WAYS ═════════════════════════════════════════════

test('F6 — the mechanism: what the button adds, the button removes', () => {
  const id = project();
  const led = store().addLightingItem({ unitId: id, kind: 'top_under' });
  assert.equal(itemsOf().length, 1);
  store().removeLightingItem(led);
  assert.equal(itemsOf().length, 0, 'and the project is back where it started');
  // …and it is a REAL round trip: adding again after removing works, which is
  // what a joiner does when he presses the wrong cabinet.
  store().addLightingItem({ unitId: id, kind: 'top_under' });
  assert.equal(itemsOf().length, 1);
});

test('F6 — NO placement control is disabled-when-present any more', () => {
  // Every one of them used to be `disabled={hasOf(…)}`: press it once, it went
  // grey, and the only way back was the × on the line in the list below.
  // The CODE, not the comments — the note that records the fault names it.
  const code = PANEL.replace(/\/\/[^\n]*/g, '');
  assert.equal(/disabled=\{hasOf\(/.test(code), false,
    'a control that does a thing and then refuses to undo it has half a job');
});

test('F6 — the SAME button removes, through the store action that already existed', () => {
  // One helper, not six copies of an if.
  assert.match(PANEL, /const toggle = \(kind, ref, make, added, removed\) => \{/);
  assert.match(PANEL, /const there = itemOf\(kind, ref\);/);
  assert.match(PANEL, /removeLightingItem\(there\.id\);/);
  // …and every placement tool goes through it.
  const tools = PANEL.match(/onClick=\{\(\) => toggle\(/g) || [];
  assert.equal(tools.length, 6, 'shelf, side, bottom, top, top_under, spot');
});

test('F6 — the label is HONEST both ways: Add … / Remove …', () => {
  for (const [what, added, removed] of [
    ['the shelf strip', "{shelfItem ? 'Remove LED' : 'Add LED'} under this shelf", null],
    ['the side lines', "{hasOf('side', side) ? 'Remove ' : 'Add '}", null],
    ['the bottom', "{hasOf('bottom') ? 'Remove from' : 'Add under'}", null],
    ['the top wash', "{hasOf('top') ? 'Remove above' : 'Add above'}", null],
    ['under the top', "{hasOf('top_under') ? 'Remove from' : 'Add under'}", null],
  ]) {
    assert.ok(PANEL.includes(added), `${what}: the label does not say which way it will go`);
    assert.equal(removed, null);
  }
  // The spots say it as a whole sentence, because "Add 3 spots" and "Remove the
  // spots" are not the same shape.
  assert.match(PANEL, /Remove the spots under \$\{unit\.params\.unit_num\}/);
  // English copy, both ways (CLAUDE.md rule 5).
  assert.equal(/Usuń|Dodaj/.test(PANEL.replace(/\/\/[^\n]*/g, '')), false);
});

test('F6 — and it says what just happened, in the tense it happened in', () => {
  assert.match(PANEL, /LED removed from \$\{shelfPanel\.id\}/);
  assert.match(PANEL, /Side line removed/);
  assert.match(PANEL, /Bottom strip removed/);
  assert.match(PANEL, /Top wash removed/);
  assert.match(PANEL, /Under-the-top strip removed/);
  assert.match(PANEL, /Spotlights removed/);
});
