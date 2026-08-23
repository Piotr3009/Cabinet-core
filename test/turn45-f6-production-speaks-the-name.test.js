import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { NO_BOARD, blockNeedsBoard, productionBlockTitle } from '../src/lib/productionNames.js';
import { WIZARD_NODES, hiddenNodes } from '../src/lib/wizardTabs.js';

// ─── TURN 45 · F6 — PRODUCTION SPEAKS THE MATERIAL'S NAME OUT LOUD ──────────
//
// CLAUDE.md, 23.08.2026:
//
//   *"The assigned material name per block: FULL-SIZE text (it is the
//   information, not a footnote) — 'Carcass 1 — MFC Halifax Oak 18 mm' as the
//   block's title line.
//   The sheet-size picker: REMOVED here (rule 4) — it lives at the material
//   step. Measured-thickness fields and infill: untouched, the owner likes
//   them."*

const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');

// ══ the title line ══════════════════════════════════════════════════════════

test('F6 — the title is the owner’s own sentence, verbatim in shape', () => {
  assert.equal(
    productionBlockTitle({ label: 'Carcass 1', boardName: 'MFC Halifax Oak', thickness: 18 }),
    'Carcass 1 — MFC Halifax Oak 18 mm',
  );
});

test('F6 — the board answers first, the decor second, and the hole says so loudest', () => {
  // The BOARD is what the shop buys and what the caliper is on.
  assert.match(
    productionBlockTitle({ label: 'Front 1', boardName: 'MDF 18', decorName: 'EGGER H1180', thickness: 18 }),
    /Front 1 — MDF 18 18 mm/,
  );
  // A decor with no board behind it is still worth saying — it is what the
  // client chose.
  assert.match(
    productionBlockTitle({ label: 'Front 1', decorName: 'EGGER · H1180', thickness: 18 }),
    /Front 1 — EGGER · H1180 18 mm/,
  );
  // …and "nothing yet" belongs in the TITLE, not in a grey line under it.
  assert.equal(productionBlockTitle({ label: 'Front 2' }), `Front 2 — ${NO_BOARD}`);
  assert.equal(blockNeedsBoard({}), true);
  assert.equal(blockNeedsBoard({ boardName: 'MFC 18' }), false);
  assert.equal(blockNeedsBoard({ decorName: 'EGGER H1180' }), false);
});

test('F6 — a block with no measured number yet still has a name', () => {
  assert.equal(
    productionBlockTitle({ label: 'Drawer box', boardName: 'Ready-made system' }),
    'Drawer box — Ready-made system',
  );
  assert.equal(
    productionBlockTitle({ label: 'Carcass 1', boardName: 'MFC 18', thickness: 18.5, suffix: 'the carcass board' }),
    'Carcass 1 — MFC 18 18.5 mm (the carcass board)',
  );
});

test('F6 — the surface draws it FULL-SIZE, as the block’s title', () => {
  assert.match(WIZ, /import \{ blockNeedsBoard, productionBlockTitle \} from '\.\.\/lib\/productionNames\.js'/);
  assert.match(WIZ, /data-material-block-title=\{b\.key\}/);
  assert.match(WIZ, /text-base leading-snug/, 'full-size type, not a 10 px footnote');
  assert.match(WIZ, /productionBlockTitle\(\{/);
  // The 10 px grey name at the far right of the row is gone with the footnote
  // it was.
  assert.doesNotMatch(WIZ, /<span className="text-\[10px\] text-ink-400">\{b\.boardName\}<\/span>/);
});

// ══ the removal, and where the row went ════════════════════════════════════

test('F6 — the sheet-size picker is REMOVED from Production', () => {
  const production = WIZ.slice(WIZ.indexOf("tab === 'produkcja'"));
  assert.doesNotMatch(production, /<SheetSizeRow/, 'not one sheet row left in Production');
  assert.doesNotMatch(WIZ, /b\.sheet/, 'and the field the blocks carried for it went too');
});

test('F6 — it lives at the material step: the carcasses’ stop, and now the fronts’', () => {
  // The carcasses' has stood at theirs since T44…
  assert.match(WIZ, /data-sheets-assignment="1"/);
  assert.match(WIZ, /family="carcasses"/);
  assert.match(WIZ, /sheetCarcass: size/);
  // …and this turn the fronts get theirs, so nothing was taken away.
  assert.match(WIZ, /data-front-sheets-assignment="1"/);
  assert.match(WIZ, /family="fronts"/);
  assert.match(WIZ, /sheetFronts: size/);
  assert.match(WIZ, /\.\.\.\(show\('fronts\.sheets'\) \? \['sheets'\] : \[\]\),/);
  assert.match(WIZ, /if \(stop === 'sheets'\) return 'Sheets assignment';/);
  // It is a WORKSHOP row, like the carcasses'.
  assert.ok(WIZARD_NODES.some((n) => n.id === 'fronts.sheets' && n.tab === 'fronts'));
  assert.ok(hiddenNodes('retail').includes('fronts.sheets'));
});

test('F6 — the measured fields and the infill are untouched', () => {
  assert.match(WIZ, /data-thickness-slots="1"/);
  assert.match(WIZ, /data-slot-measured=\{b\.row\.id\}/);
  assert.match(WIZ, /data-slot-confirmed=\{b\.row\.id\}/);
  assert.match(WIZ, /data-slot-nominal=\{b\.row\.id\}/);
  assert.match(WIZ, /data-slot-thickness-gate="1"/, 'the recut gate still asks first');
  assert.match(WIZ, /data-infill-side-width="1"/);
  assert.match(WIZ, /data-wizard-node="produkcja\.infill"/);
});
