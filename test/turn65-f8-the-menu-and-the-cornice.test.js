// ─── TURN 65 · F8 — THE MENU PRO HAS AND RETAIL NEVER GOT ───────────────────
//
// The owner: *"nie widzę przycisków: top infill, cornice, panels."* They live
// in `src/components/ContextMenu.jsx` — the one surface the T63 ledger listed
// as OWED, and the reason none of them was reachable from the client's room.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { corniceOption } from '../src/engine/cornice.js';
import { ALL_COPIES, isCopy } from '../scripts/t63-copies.mjs';
import * as A from '../src/retail/design/adapter.js';

setPersistence('none');
const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const S = () => useProjectStore.getState();

const wardrobe = (height = 2150) => {
  A.startDesign('T65 F8');
  const id = A.addFirstWardrobe();
  S().updateUnitParams(id, { height });
  A.applyAutoCornice(id);
  return id;
};

// ═══ 1 · THE COPY ══════════════════════════════════════════════════════════

test('F8 · ContextMenu is COPIED, not re-written — same line count, same labels', () => {
  const pro = read('src/components/ContextMenu.jsx');
  const retail = read('src/retail/design/detail/ContextMenu.jsx');
  const lines = (t) => t.replace(/\n$/, '').split('\n').length;
  // CLAUDE.md names the file's size, and the copy is the same file.
  assert.equal(lines(pro), 334, "PRO's ContextMenu is not 334 lines any more");
  assert.equal(lines(retail), lines(pro), 'the copy is not the same shape');
  // It is in the manifest, so the fidelity test and the classifier both see it.
  assert.ok(isCopy('src/retail/design/detail/ContextMenu.jsx'), 'the copy is not in the manifest');
  assert.equal(ALL_COPIES.length, 26);
  // The four the owner could not find are not strings in this file at all —
  // they are rows in the SHARED action table, and the copy reaches the same
  // one PRO reaches. That is what makes it a copy rather than a lookalike.
  assert.match(retail, /from '\.\.\/\.\.\/\.\.\/lib\/contextActions\.js'/);
  const actions = read('src/lib/contextActions.js');
  for (const id of ['cornice-0', 'cornice-70', 'cornice-100', 'bottom-mask']) {
    assert.ok(actions.includes(id), `the shared action table lost "${id}"`);
  }
  assert.match(actions, /top infill \+ plinth/);
  assert.match(actions, /all end panels/);
});

test('F8 · …and PRO is untouched by it', () => {
  // The copy imports the SHARED stores, three directories up — it is a copy,
  // not a fork with a state of its own.
  const retail = read('src/retail/design/detail/ContextMenu.jsx');
  assert.match(retail, /from '\.\.\/\.\.\/\.\.\/stores\/uiStore\.js'/);
  assert.match(retail, /from '\.\.\/\.\.\/\.\.\/stores\/projectStore\.js'/);
  // …and it wears PBI's skin, never PRO's classes.
  assert.ok(!/\bcc-panel\b/.test(retail), 'the copy still wears PRO\'s own class');
  assert.match(retail, /pbi-re-panel/);
});

test('F8 · the room MOUNTS it — that omission is the whole of "nie widzę przycisków"', () => {
  const room = read('src/retail/design/DesignRoom.jsx');
  assert.match(room, /import ContextMenu from '\.\/detail\/ContextMenu\.jsx'/);
  assert.match(room, /<ContextMenu \/>/);
  // The gesture was already firing: Scene has opened the menu since T13.
  assert.match(read('src/3d/Scene.jsx'), /onContextMenu=\{\(menu\) => openContextMenu\(/);
});

// ═══ 2 · THE CORNICE, AND THE TWO DECISIONS ════════════════════════════════

test('F8 · a client\'s wardrobe arrives wearing a cornice, automatically', () => {
  const id = wardrobe(2150);
  assert.ok(A.corniceOf(id) > 0, 'the wardrobe arrived bare');
  assert.equal(A.corniceOf(id), A.corniceAutoHeight());
  assert.equal(A.corniceAutoHeight(), P.autoParts.cornice.retail.autoHeight);
});

test('F8 · DECISION 1 · a gap of 100 mm or less is closed by the cornice GROWING', () => {
  // The space above the carcass, not above what is already standing on it.
  assert.equal(A.corniceForGap(100), 100, 'a 100 mm space does not take the 100');
  assert.equal(A.corniceForGap(80), 70, 'an 80 mm space should take the 70 — the largest that FITS');
  assert.equal(A.corniceForGap(70), 70);
  // …and it never drives a moulding into the plaster.
  for (const space of [40, 60, 80, 95, 100]) {
    const grown = A.corniceForGap(space);
    if (grown !== null) assert.ok(grown <= space, `a ${grown} was chosen for a ${space} mm space`);
  }
  // A space too small for even the smallest moulding gets none.
  assert.equal(A.corniceForGap(30), null);
});

test('F8 · DECISION 2 · a gap over 100 mm is LEFT ALONE — no proposal, no nagging', () => {
  assert.equal(P.autoParts.cornice.retail.closesGapUpToMm, 100);
  for (const space of [101, 140, 250, 400]) {
    assert.equal(A.corniceForGap(space), null, `a ${space} mm space was proposed a cornice`);
  }
  // A short wardrobe in a tall room keeps the standard cornice and nothing more.
  const id = wardrobe(2000);
  assert.ok(A.corniceSpaceMm(id) > 100);
  assert.equal(A.corniceOf(id), A.corniceAutoHeight(), 'a big gap grew the cornice anyway');
});

test('F8 · the chips are the profile\'s own sizes, and NONE is the way back out', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /testid="details-cornice"/, 'EXTRAS has no cornice chips');
  assert.match(options, /A\.corniceHeights\(\)/, 'the chips are not the profile\'s list');
  assert.match(options, /id: '0', label: 'NONE'/, 'there is no way back out');
  assert.deepEqual(A.corniceHeights(), P.autoParts.cornice.heights);
  const id = wardrobe(2150);
  assert.equal(A.setCorniceHeight(id, 0).height, 0, 'NONE did not take it off');
  assert.equal(A.corniceOf(id), 0);
});

// ═══ 3 · THE SKIP, NAMED ═══════════════════════════════════════════════════

test('F8 · the 40 mm size is SKIPPED, and the two walls it ran into are still there', () => {
  // 1. `corniceOption` admits only the profile's list, and `cornice.js` is not
  //    one of the three engine files licensed tonight.
  assert.deepEqual(P.autoParts.cornice.heights, [70, 100]);
  assert.equal(corniceOption(40, P), 0, 'a 40 is now a moulding this workshop buys');
  // 2. …and the list is PRO's too — turn22 pins it as "none | 70 | 100".
  assert.match(read('test/turn22-f1-cornice.test.js'), /the option is none \| 70 \| 100, and nothing else/);
  // The skip is stated in the profile, where the next turn will look.
  assert.match(read('src/engine/profile.js'), /THE 40 IS NOT HERE, AND THIS IS WHY/);
});

test('F8 · the panels and the cornice reach the ESTIMATE, so the client sees what he pays for', () => {
  const id = wardrobe(2150);
  const panels = A.endPanelSides(id);
  assert.ok(Array.isArray(panels), 'the estimate cannot read the panels');
  // A panel asked for by hand is permanent (F6) and is a line like any other.
  const before = panels.length;
  A.addEndPanelByHand(id, 'L');
  assert.equal(A.endPanelSides(id).length, before + 1);
  assert.ok(A.endPanelSides(id).find((p) => p.side === 'L').permanent, 'the hand-added panel is not permanent');
});
