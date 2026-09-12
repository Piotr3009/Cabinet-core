// ─── TURN 68 · F9 — THE RIGHT-CLICK MENU SLIMS TO PLACEMENT ────────────────
//
// Approved: six actions stay — Rotate 90° · Back to wall · Side to wall ·
// Rename · Save as template · Delete. Everything else dies or is already
// homed, and each removed row is named in the PR with its new home.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { menuActions } from '../src/lib/contextActions.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import * as A from '../src/retail/design/adapter.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import decorPack from '../public/decors/egger/egger-decors.json' with { type: 'json' };
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';

setDecorCatalogue(parseDecorCatalogue(decorPack, { basePath: '/decors/egger/' }));

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const CSS = () => read('src/retail/styles/room.css');

/** The six, in the owner's own order. */
const THE_SIX = ['rotate-90', 'back-to-wall', 'side-to-wall', 'rename', 'save-template', 'delete'];

function wardrobe() {
  useUiStore.getState().clearSelection();
  A.startDesign('T68 F9');
  return A.addFirstWardrobe();
}

/** Every row the SHARED table offers for this cabinet. */
function rowsFor(unitId) {
  const unit = useProjectStore.getState().units.find((u) => u.id === unitId);
  return menuActions({
    unit, selection: [unit], panelPart: null, panelDrawer: null,
    dimensions: false, store: {}, profile: P,
  }).map((a) => a.id);
}

test('F9 · the retail menu shows exactly the six, and nothing else', () => {
  const css = CSS();
  // Every row hides…
  assert.match(css, /\.pbi-room\[data-workshop-tools="no"\] \[data-menu-entry\],\n\.pbi-room\[data-workshop-tools="no"\] \[data-menu-divider\] \{\n {2}display: none !important;/,
    'the menu does not hide its rows by default');
  // …and exactly six are named back.
  const shown = [...css.matchAll(/\[data-menu-entry="([a-z0-9-]+)"\]\s*,?\s*\n?/g)]
    .map((m) => m[1]);
  assert.deepEqual([...new Set(shown)].sort(), [...THE_SIX].sort(),
    `the sheet names ${[...new Set(shown)].join(', ')}`);
});

test('F9 · the six are ids the SHARED table actually offers', () => {
  const id = wardrobe();
  const rows = rowsFor(id);
  for (const want of THE_SIX) {
    assert.ok(rows.includes(want), `${want} is not a row the menu has — the sheet names a ghost`);
  }
});

test('F9 · every row that went is homed, and the home is named', () => {
  // The claim of this test is the claim of F9: NOTHING was simply taken away.
  const id = wardrobe();
  const gone = rowsFor(id).filter((r) => !THE_SIX.includes(r));
  assert.ok(gone.length > 0, 'the menu had nothing beyond the six to slim');

  const options = read('src/retail/design/Options.jsx');
  const viewTools = read('src/retail/design/viewTools.js');
  const dock = read('src/retail/design/detail/docked.jsx');
  const HOMES = {
    'top-infill': /testid="details-top-infill"/.test(options),
    'side-infill': /testid="details-scribe-fillers"/.test(options),
    plinth: /testid="extras-plinth"/.test(options),
    'end-panel-L': /testid="details-end-panels"/.test(options),
    'end-panel-R': /testid="details-end-panels"/.test(options),
    'end-panel-B': /testid="details-end-panels"/.test(options),
    'cornice-0': /testid="details-cornice"/.test(options),
    'cornice-40': /testid="details-cornice"/.test(options),
    'cornice-70': /testid="details-cornice"/.test(options),
    'cornice-100': /testid="details-cornice"/.test(options),
    'unit-colour': /MaterialSlot kind="front"/.test(options),
    'edit-cabinet': /props: \{ panel, item, omit: omitted\(\) \}/.test(dock),
    'edit-drawer': /modal: 'element'/.test(dock),
    'drawer-fronts': /modal: 'element'/.test(dock),
    'center-shelves': /modal: 'element'/.test(dock),
    'bottom-mask': /testid="details-top-infill"/.test(options),
    dimensions: /id: 'dimensions'/.test(viewTools),
    'close-fronts': /id: 'open-all'/.test(viewTools),
  };
  const homeless = gone.filter((r) => {
    if (/^pin-infill-/.test(r)) return !/testid="details-scribe-fillers"/.test(options);
    return HOMES[r] !== true;
  });
  assert.deepEqual(homeless, [],
    `a row left the menu with nowhere to go: ${homeless.join(', ')}`);
});

test('F9 · they are HIDDEN in retail, never cut — PRO keeps its whole menu', () => {
  // The rows live in the SHARED table PRO's own menu reads, so a filter there
  // would take them off a joiner's menu too.
  const actions = read('src/lib/contextActions.js');
  for (const id of ['top-infill', 'side-infill', 'unit-colour', 'save-template', 'rename']) {
    assert.ok(actions.includes(`id: '${id}'`) || actions.includes(`id: \`${id}\``)
      || new RegExp(`id: .${id}.`).test(actions), `the shared table lost ${id} — PRO's menu shrank`);
  }
  // And the COPY is still PRO's own length, to the line.
  const pro = read('src/components/ContextMenu.jsx');
  const copy = read('src/retail/design/detail/ContextEdits.jsx');
  assert.equal(copy.replace(/\n$/, '').split('\n').length, pro.replace(/\n$/, '').split('\n').length,
    'the copy was edited rather than the sheet');
  assert.doesNotMatch(copy, /RETAIL_SHOW_WORKSHOP_TOOLS/, 'a flag was written into a copy');
  // PRO's page never stamps the attribute the rule keys on.
  assert.doesNotMatch(read('src/App.jsx'), /data-workshop-tools/);
});

test('F9 · the six stand in the owner\'s own order', () => {
  const css = CSS();
  const order = THE_SIX.map((id) => {
    const m = css.match(new RegExp(`\\[data-menu-entry="${id}"\\] \\{ order: (\\d+); \\}`));
    assert.ok(m, `${id} carries no order`);
    return Number(m[1]);
  });
  assert.deepEqual(order, [1, 2, 3, 4, 5, 6],
    'the six are not in the order the owner listed them');
  // The group wrappers are transparent so an order can cross them, and the
  // menu itself is the column that reads it.
  assert.match(css, /div:has\(> \[data-menu-entry\]\) \{ display: contents; \}/);
  assert.match(css, /\.pbi-re-panel:has\(> div > \[data-menu-entry\]\) \{\n {2}display: flex;/);
});

test('F9 · the menu is still the COPY, mounted by the room, reading the shared table', () => {
  const copy = read('src/retail/design/detail/ContextEdits.jsx');
  assert.match(copy, /from '\.\.\/\.\.\/\.\.\/lib\/contextActions\.js'/);
  assert.match(copy, /data-menu-entry=\{a\.id\}/, 'the rows lost the hook the sheet keys on');
  assert.match(copy, /data-menu-divider=\{group\.id\}/);
  assert.match(read('src/retail/design/DesignRoom.jsx'), /<ContextEdits \/>/);
});
