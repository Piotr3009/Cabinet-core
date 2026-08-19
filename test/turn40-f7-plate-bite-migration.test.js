// ─── TURN 40 (CLAUDE.md F7): plateBiteMm — THE FROZEN VALUE ─────────────────
//
// `profile.js` has carried `hardware.hinge.plateBiteMm: 10` since T37-F3 (it
// was 5 in T36-F4b, and the owner asked for *"następne 5 mm"* — five MORE).
// He reports seeing no change.
//
// ─── THE DIAGNOSIS: THE localStorage FREEZE, FOR THE THIRD TIME ─────────────
//
// Nothing is wrong with the number. `stores/cabinetProfileStore.js` writes the
// WHOLE profile to `cc.profile.v1` on every `setProfile`, and
// `migrateCabinetProfile` merges a stored block over the default with a plain
// spread. So a browser that has ever saved a workshop profile carries a
// `hardware.hinge` block with the superseded 5 in it, and that stale block
// outvotes the code for ever — a user would have to rebuild his profile to see
// a number he never chose. It is the same fault as the LED kelvins
// ("nie zmienia się jak zmienię 3, 4 lub 6 k", 16.08) and the design
// migration, and it is fixed the same way those were: the CODE WINS.
//
// These asserts pin the fix as BEHAVIOUR — a stored profile carrying 5, put
// through the real migration — rather than as a line of source.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';

/** A profile as a browser would have stored it, with one value overridden. */
const storedWith = (bite) => {
  const clone = JSON.parse(JSON.stringify(P));
  clone.hardware.hinge.plateBiteMm = bite;
  return clone;
};

test('F7 — the code still says 10, which is the number T37-F3 landed', () => {
  assert.equal(P.hardware.hinge.plateBiteMm, 10);
});

test('F7 — AN EXISTING PROFILE CARRYING 5 PICKS UP 10', () => {
  // The owner's own case, and the reason this feature exists.
  const stored = storedWith(5);
  assert.equal(stored.hardware.hinge.plateBiteMm, 5, 'this is what his browser holds');
  const migrated = migrateCabinetProfile(stored);
  assert.equal(migrated.hardware.hinge.plateBiteMm, 10, 'and this is what the app uses');
});

test('F7 — IDEMPOTENT: running it again cannot produce a third answer', () => {
  // Every load runs the migration, and `setProfile` runs it again on the way
  // out — so "twice" is not a hypothetical, it is the ordinary path.
  const once = migrateCabinetProfile(storedWith(5));
  const twice = migrateCabinetProfile(once);
  const thrice = migrateCabinetProfile(twice);
  assert.equal(once.hardware.hinge.plateBiteMm, 10);
  assert.equal(twice.hardware.hinge.plateBiteMm, 10);
  assert.equal(thrice.hardware.hinge.plateBiteMm, 10);
});

test('F7 — `null !== 0`: a stored ZERO is not "nothing said" (the T-round lesson)', () => {
  // The trap this feature was told to avoid. A guarded fill written
  // `stored || D.plateBiteMm` or `if (!stored)` treats a stored 0 as unset —
  // and 0 is a legal bite, a plate that does not sink into the side at all. An
  // unconditional assignment has no such branch to get wrong, and the assert
  // below is what says so: BOTH a 0 and a null come out as the code's 10, by
  // the same line, with no branch between them.
  assert.equal(migrateCabinetProfile(storedWith(0)).hardware.hinge.plateBiteMm, 10);
  assert.equal(migrateCabinetProfile(storedWith(null)).hardware.hinge.plateBiteMm, 10);
  assert.equal(migrateCabinetProfile(storedWith(undefined)).hardware.hinge.plateBiteMm, 10);
  assert.equal(migrateCabinetProfile(storedWith(999)).hardware.hinge.plateBiteMm, 10);
  // And the source really has no conditional on this key, which is the claim.
  const src = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  assert.match(src, /plateBiteMm: D\.hardware\.hinge\.plateBiteMm,/);
});

test('F7 — and NOTHING ELSE in the hinge block was taken away from the workshop', () => {
  // A migration that fixed one key by flattening the block would be a worse
  // bug than the one it fixed. Everything a workshop genuinely tunes survives.
  const stored = storedWith(5);
  stored.hardware.hinge.cupDiameter = 36;
  stored.hardware.hinge.plateThickness = 14;
  const migrated = migrateCabinetProfile(stored);
  assert.equal(migrated.hardware.hinge.cupDiameter, 36, 'his cup measurement stands');
  assert.equal(migrated.hardware.hinge.plateThickness, 14, 'and his plate');
  assert.equal(migrated.hardware.hinge.plateBiteMm, 10, '…and the code still owns the bite');
});

test('F7 — a profile that has never been saved is unaffected', () => {
  assert.equal(migrateCabinetProfile(JSON.parse(JSON.stringify(P))).hardware.hinge.plateBiteMm, 10);
  assert.equal(migrateCabinetProfile(null), null);
});

test('F7 — the bite is still smaller than the casting it bites into', () => {
  // T37-F3's own guard, re-asserted here because this feature changes WHO wins
  // and a migration that resurrected a nonsense value would be worse than the
  // freeze. A plate bitten deeper than it is thick would vanish into the side.
  const H = migrateCabinetProfile(storedWith(5)).hardware.hinge;
  assert.ok(H.plateBiteMm < H.plateThickness,
    `a plate bitten ${H.plateBiteMm} into ${H.plateThickness} of casting would disappear`);
});
