// ─── T51 · F2 + F3 — THE LAYOUT SETTLES ITSELF ──────────────────────────────
//
// Two rulings of the owner's, 26.08.2026, and they are ONE mechanism:
//
//   *"nie działa ustawianie automatyczne, nie ma zapytania, nie pokazuje się a
//   jest poniżej 400."*
//   *"jak dojedziesz to już nie wymusza panela, a powinno: dojeżdżam — panel
//   się pojawia, nie dojeżdżam — panel znika. proste."*
//
// T50 hung both on `addUnit` alone. He reaches a sub-400 gap by DRAGGING or by
// RESIZING, and neither had ever asked him anything.
//
// The store's own behaviour is walked in `scripts/e2e-turn51.mjs`. What is
// asserted here is the PURE half — the junction geometry, which is what decides
// whether a panel appears at all — plus the wiring, read off the store's source,
// because "is `settleLayout` actually called from `moveUnit`" is a fact about a
// file and a node test can hold it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { autoEndPanelJunctions, autoEndPanelStrays } from '../src/engine/endPanelAuto.js';
import { getCabinetProfile } from '../src/engine/profile.js';

const STORE = readFileSync(new URL('../src/stores/projectStore.js', import.meta.url), 'utf8');
const profile = getCabinetProfile();

/** A kitchen cabinet, as the store makes one, with only what matters here. */
const unit = (id, { type, x, w, h, panels = [], declined = null }) => ({
  id,
  type,
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: {
    width: w, height: h, depth: 558, front_t: 18, leg_height: 100,
    end_panels: panels,
    ...(declined ? { end_panel_declined: declined } : {}),
  },
});

const tallAt = (x, extra = {}) => unit('tall', { type: 'BUDTALL', x, w: 600, h: 2150, ...extra });
const lowAt = (x, extra = {}) => unit('low', { type: 'BUD', x, w: 600, h: 770, ...extra });

// ─── F3: the junction is made and unmade by the hand ───────────────────────

test('F3 — apart, there is no junction and nothing is wanted', () => {
  const units = [tallAt(1000), lowAt(3000)];
  assert.deepEqual(autoEndPanelJunctions(units, profile), []);
});

test('F3 — driven up, the junction stands and a panel is wanted', () => {
  const units = [tallAt(1000), lowAt(1601)];
  const want = autoEndPanelJunctions(units, profile);
  assert.equal(want.length, 1, 'one junction');
  assert.equal(want[0].unitId, 'tall', 'the TALL one carries it');
  assert.equal(want[0].side, 'R', 'on the side facing the low one');
});

test('F3 — a panel whose junction has gone is a STRAY, and is named as one', () => {
  const panel = { id: 'ep1', side: 'R', thickness: 18, auto_added: true };
  // Driven up: the panel is doing its job and is not a stray.
  const meeting = [tallAt(1000, { panels: [panel] }), lowAt(1619)];
  assert.deepEqual(autoEndPanelStrays(meeting, profile).panels, [], 'not while the junction stands');

  // Retreated: the junction has gone and the board is standing in mid-air.
  const apart = [tallAt(1000, { panels: [panel] }), lowAt(3000)];
  const strays = autoEndPanelStrays(apart, profile).panels;
  assert.equal(strays.length, 1);
  assert.deepEqual(strays[0], { unitId: 'tall', panelId: 'ep1', side: 'R' });
});

test('F3 — a panel the JOINER put there is never a stray', () => {
  const byHand = { id: 'ep1', side: 'R', thickness: 18 };        // no `auto_added`
  const apart = [tallAt(1000, { panels: [byHand] }), lowAt(3000)];
  assert.deepEqual(autoEndPanelStrays(apart, profile).panels, [],
    '`auto_added` is the whole test — T50 wrote that flag for exactly this');
});

// ─── F3: the decline lasts as long as its junction, and no longer ──────────

test('F3 — a decline SURVIVES the removal of its own panel', () => {
  // Taking the panel off leaves the low unit standing one board clear: read on
  // the strict 2 mm run gap the junction would look gone, and the joiner's "no"
  // would be forgotten by the very act that expressed it.
  const justRemoved = [tallAt(1000, { declined: ['R'] }), lowAt(1618)];
  assert.deepEqual(autoEndPanelStrays(justRemoved, profile).declines, [],
    'the decline stands while the two cabinets are still meeting');
  // …and no panel is offered there either, which is what "stays deleted" means.
  assert.deepEqual(autoEndPanelJunctions(justRemoved, profile), []);
});

test('F3 — …and is FORGOTTEN once the two are genuinely apart', () => {
  const apart = [tallAt(1000, { declined: ['R'] }), lowAt(3000)];
  assert.deepEqual(autoEndPanelStrays(apart, profile).declines, [{ unitId: 'tall', side: 'R' }]);
});

test('F3 — so moving away and back is a NEW junction, and may be offered again', () => {
  const forgotten = [tallAt(1000), lowAt(1601)];     // the decline has been cleared by the prune
  assert.equal(autoEndPanelJunctions(forgotten, profile).length, 1);
});

// ─── F2: the wiring — every edit that can move an edge settles ─────────────

test('F2 — settleLayout is called from all four actions, and nowhere else matters', () => {
  assert.match(STORE, /settleLayout: \(focusId = null\) => \{/, 'the action exists');
  for (const [action, call] of [
    ['addUnit', /get\(\)\.settleLayout\(unit\.id\);\s*\n\s*return \{ id: unit\.id/],
    ['moveUnit', /get\(\)\.settleLayout\(unitId\);\s*\n\s*return \{ \.\.\.result, x \}/],
    ['removeUnit', /get\(\)\.settleLayout\(null\);/],
  ]) {
    assert.match(STORE, call, `${action} settles`);
  }
  // …and `updateUnitParams` only where a DIMENSION moved: a colour change must
  // not pay for it.
  assert.match(
    STORE,
    /if \(applied\.width != null \|\| applied\.depth != null \|\| applied\.height != null\) \{\s*\n\s*get\(\)\.settleLayout\(unitId\);/,
    'a resize settles, a recolour does not',
  );
});

test('F2 — the recursion guard exists, and it is at MODULE scope', () => {
  // `growAutoEndPanels` widens cabinets through `updateUnitParams`, which
  // settles the layout. CLAUDE.md names this in advance: an unfloored loop, and
  // the suite finds it as a blown stack rather than as a bug with a name.
  assert.match(STORE, /^let settling = false;$/m, 'module scope, not store state');
  assert.match(STORE, /if \(settling\) return \{ grown: \[\], strays: 0, offered: false \};/,
    'the outermost call does the work; inner ones return at once');
  assert.match(STORE, /function withoutSettling\(fn\) \{/, 'and a caller can hold it deliberately');
});

test('F2 — the run’s own fillers stand down while it is laid out', () => {
  assert.match(STORE, /^let layingOut = null;$/m);
  assert.match(STORE, /function withRunStoodDown\(unitIds, fn\) \{/);
  // The stand-down is applied where the obstacles are gathered…
  assert.match(STORE, /\.filter\(\(v\) => !\(layingOut && layingOut\.has\(v\.unitId\)\)\);/);
  // …and only around the LAY-OUT, never around anything else.
  assert.match(STORE, /withRunStoodDown\(units\.map\(\(u\) => u\.id\), \(\) => withoutSettling\(\(\) => \{/);
  assert.equal((STORE.match(/withRunStoodDown\(/g) || []).length, 2,
    'declared once, used once — a stand-down anywhere else would be a cabinet allowed to overlap');
});

test('F2 — one action is ONE undo step', () => {
  // `refreshAutoParts` and `settleLayout` are each a batch of their own, and an
  // unbatched action calling both closes two at depth 0 — which is two entries
  // on the undo stack for one typed width. `test/turn12-undo.test.js` is the
  // guard; this is the reason, written where the change is.
  for (const action of ['addUnit', 'moveUnit', 'removeUnit', 'updateUnitParams']) {
    const re = new RegExp(`${action}: \\([^)]*\\) => runBatch\\(\\(\\) => \\{`);
    assert.match(STORE, re, `${action} is one batch`);
  }
});
