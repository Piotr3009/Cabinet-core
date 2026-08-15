// ─── Turn 32, CLAUDE.md F2: hardware as its own step, and the AUTOMAT ───────
//
// Two heads, two screens: the client-facing choices (step 4) and the workshop
// choices (this step). What this file pins:
//
//   · the metal colours — chrome / onyx / gold — live in the profile palette
//     and survive migration on the design;
//   · the AUTOMAT extends the angle table to pick the ARTICLE: angle + metal
//     + soft-close → one row. The registry (F6) is asked first; the in-repo
//     Blum catalogue answers what it can; anything else is a NAMED SPEC with
//     no number — never invented (CLAUDE.md rule 3);
//   · soft-close ships YES — the profile line is marked "owner to confirm
//     15.08" and the question travels with the PR (Q1);
//   · plinth clips + connectors are counted FROM FRONT LEGS ONLY.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign } from '../src/engine/design.js';
import { hardwareVariant } from '../src/engine/projectSettings.js';
import { hingeAutomat, metalHingeFinish } from '../src/engine/hinges.js';
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { frontLegCount, frontLegPositions, legLayout } from '../src/engine/legs.js';
import { shelfSupportMetal } from '../src/3d/hardwareFinish.js';

loadHardwareCatalogues();

// ─── the metal colours ──────────────────────────────────────────────────────

test('chrome / onyx / gold are in the palette, and the design keeps them', () => {
  for (const id of ['chrome', 'onyx', 'gold']) {
    assert.ok(P.appearance.metals[id], `${id} is a metal the profile knows`);
  }
  for (const id of ['chrome', 'onyx', 'gold', 'silver']) {
    assert.equal(migrateDesign({ hardware: { shelfSleeve: id } }).hardware.shelfSleeve, id);
  }
  assert.equal(migrateDesign({ hardware: { shelfSleeve: 'brass' } }).hardware.shelfSleeve, null,
    'a metal nobody can order is not a choice');
});

test('the family follows the one choice — sleeve, rail, all of it', () => {
  const design = migrateDesign({ hardware: { shelfSleeve: 'onyx' } });
  const metal = shelfSupportMetal(design, P);
  assert.equal(metal.id, 'onyx');
  assert.equal(metal.colour, P.appearance.metals.onyx.colour);
});

// ─── the automat ────────────────────────────────────────────────────────────

test('the finish row is a table in the profile, and gold honestly buys nothing', () => {
  assert.equal(metalHingeFinish(P, 'chrome'), 'nickel');
  assert.equal(metalHingeFinish(P, 'silver'), 'nickel');
  assert.equal(metalHingeFinish(P, 'onyx'), 'onyx');
  assert.equal(metalHingeFinish(P, 'gold'), null, 'no published gold hinge — no invented article');
  assert.equal(metalHingeFinish(P, 'brass'), null);
});

test('angle + metal + soft-close → one row from the catalogue', () => {
  const std = hingeAutomat({ frontThickness: 18, metal: 'chrome', softClose: true }, { profile: P });
  assert.equal(std.angle, 110, 'standard front → 110°');
  assert.equal(std.finish, 'nickel');
  assert.equal(std.resolved, true);
  assert.match(std.family, /^71B/, 'a real Blum family');
  assert.ok(std.article, 'with a real article number');
  assert.equal(std.source, 'catalogue');

  const thick = hingeAutomat({ frontThickness: 30, metal: 'onyx', softClose: true }, { profile: P });
  assert.equal(thick.angle, 95, 'thick front → 95° — a ROW in the table, not special code');
  assert.equal(thick.finish, 'onyx');
  assert.equal(thick.resolved, true);

  const inner = hingeAutomat({
    frontThickness: 18, innerDrawer: true, metal: 'chrome', softClose: true,
  }, { profile: P });
  assert.equal(inner.angle, 155, 'internal drawer → 155°');
});

test('what the registry does not know prints as a NAMED SPEC, never a number', () => {
  const gold = hingeAutomat({ frontThickness: 18, metal: 'gold', softClose: true }, { profile: P });
  assert.equal(gold.resolved, false);
  assert.equal(gold.article, null);
  assert.equal(gold.spec_label, 'Hinge 110° · soft-close · gold');

  // The catalogue is BLUMOTION — soft-close by construction — so "standard"
  // has no published article either.
  const std = hingeAutomat({ frontThickness: 18, metal: 'chrome', softClose: false }, { profile: P });
  assert.equal(std.resolved, false);
  assert.equal(std.spec_label, 'Hinge 110° · standard · chrome');
});

test('the REGISTRY is asked first, and its row wins over the catalogue', () => {
  const lookup = (q) => (q.category === 'hinge' && q.angle === 110 && q.variant === 'soft'
    ? {
      family: 'OWN-110', article: 'W-001', articles: ['W-001'], source: 'registry',
    }
    : null);
  const own = hingeAutomat({ frontThickness: 18, metal: 'chrome', softClose: true }, { profile: P, lookup });
  assert.equal(own.family, 'OWN-110');
  assert.equal(own.article, 'W-001');
  assert.equal(own.source, 'registry');
});

// ─── soft-close ships YES, marked ───────────────────────────────────────────

test('soft-close default is YES — the profile line carries the owner-to-confirm mark', async () => {
  assert.equal(P.projectSettings.hardware.hinges.default, 'soft-close');
  assert.equal(hardwareVariant(migrateDesign(null), P, 'hinges'), 'soft-close');
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  assert.ok(source.includes('soft-close default — owner to confirm 15.08'),
    'the marked line CLAUDE.md dictated');
});

// ─── the front row ──────────────────────────────────────────────────────────

test('clips + connectors count FROM FRONT LEGS ONLY — the row at z ≈ front', () => {
  const narrow = { width: 600, depth: 568, boardT: 18 };
  assert.equal(frontLegCount(narrow, P), 2, 'four corners → two at the front');

  // A wide unit grows a CENTRE leg — mid-depth, holding no plinth.
  const wide = { width: 1200, depth: 568, boardT: 18 };
  assert.equal(legLayout({ ...wide, height: 100 }, P).count, 5);
  assert.equal(frontLegCount(wide, P), 2, 'the centre leg is not a front leg');

  const zFront = 568 - P.legs.insetFromFront - P.legs.width;
  for (const p of frontLegPositions(wide, P)) assert.equal(p.z, zFront);
});
