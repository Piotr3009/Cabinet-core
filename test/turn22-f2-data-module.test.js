// ─── TURN 22 F2 — the data module: hardware and company defaults ────────────
//
// Parked since turn 15, named in every turn since. What is proved here:
//
//   F2a.1  the table exists as a numbered SQL file, with RLS and its policies
//          written out — the "SQL PRZED push" rule, checked as a fact about
//          the repository rather than as a promise in a log;
//   F2a.2  ONE resolution function, both families: DB row → bucket manifest →
//          mock, with a fake row, with no row, and with no network at all;
//   F2a.2  …and NOTHING about model URL composition changes (R4);
//   F2b.1  the validator refuses the keys a RULE owns;
//   F2b.3  the cascade at all four levels, and the prefill equivalence probe:
//          a project made with a company row present equals the same project
//          made with the equivalent settings typed in by hand.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  BOARD_FAMILIES, RULE_OWNED_KEYS, cascade, clearCompanyDefaults, companyDefaults,
  hasCompanyDefaults, levelsOf, prefillDesignFromCompany, setCompanyDefaults,
  validateCompanyDefaults,
} from '../src/engine/companyDefaults.js';
import {
  HARDWARE_FAMILIES, clearHardwareSources, hardwareFamilySpec, hardwareSourceOf, manifestUrl,
  resolveHardwareCatalogue,
} from '../src/lib/hardwareSource.js';
import {
  clearHingeCatalogue, hingeCatalogue, hingeModelUrl, resolveHingeFinish, resolveHingePlate,
  resolveHingeSystem, setHingeCatalogue,
} from '../src/engine/hinges.js';
import {
  clearRunnerCatalogue, runnerCatalogue, resolveRunnerVariant,
} from '../src/engine/runners.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign } from '../src/engine/design.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const sql = (name) => readFileSync(new URL(`../sql/${name}`, import.meta.url), 'utf8');
const bucketFixture = (name) => JSON.parse(
  readFileSync(new URL(`./fixtures/bucket/${name}`, import.meta.url), 'utf8'),
);

const store = () => useProjectStore.getState();

// ─── F2a.1 — SQL PRZED push ─────────────────────────────────────────────────

test('F2a.1 both tables ship as a numbered SQL file with RLS and policies', () => {
  const text = sql('004_tura22.sql');
  assert.ok(/SQL PRZED push/.test(text), 'the file says what it is, in the owner’s own words');
  for (const table of ['cc_hardware', 'cc_company_defaults']) {
    assert.ok(new RegExp(`create table if not exists public\\.${table}`).test(text),
      `${table} is created, idempotently`);
    assert.ok(new RegExp(`alter table public\\.${table}\\s+enable row level security`).test(text),
      `${table} has RLS ENABLED — the iron rule`);
    // …and the policies are written out, per verb, per auth.uid().
    for (const verb of ['select', 'insert', 'update', 'delete']) {
      assert.ok(new RegExp(`create policy ${table}_${verb} on public\\.${table}`).test(text),
        `${table} has a ${verb} policy`);
    }
  }
  // Owner scoping is the project's existing model — `auth.uid()`, as in 001.
  assert.ok(/owner = auth\.uid\(\)/.test(text));
  // Nothing here is EXECUTED by the app: the migration is named in a comment
  // (so the next reader knows where the table came from) and nowhere else —
  // no `create table`, no `alter table`, no rpc that would run one.
  const client = readFileSync(new URL('../src/lib/cloudSync.js', import.meta.url), 'utf8');
  assert.ok(!/create table|alter table|enable row level security/i.test(client),
    'the app never runs its own schema — Piotr does, before the push');
});

test('F2a.1 the SQL refuses a rule-owned key too — the app is not the only door', () => {
  const text = sql('004_tura22.sql');
  assert.ok(/cc_company_defaults_no_rule_keys/.test(text));
  assert.ok(/hinge_angle/.test(text), 'the angle is named in the constraint');
});

// ─── F2a.2 — one function, both families, three sources ─────────────────────

const RUNNERS = bucketFixture('runners-blum-movento-manifest.json');
const HINGES = bucketFixture('hinges-blum-manifest.json');

/** A fetch that answers one url and 404s everything else. */
const fetchOf = (map) => async (url) => {
  if (!(url in map)) return { ok: false, status: 404, statusText: 'Not Found' };
  return { ok: true, status: 200, json: async () => map[url] };
};

const reset = () => {
  clearHardwareSources();
  clearRunnerCatalogue();
  clearHingeCatalogue();
  clearCompanyDefaults();
};

test('F2a.2 a DB ROW WINS — it simply replaces the fetched JSON', async () => {
  reset();
  const base = 'https://example.supabase.co/storage/v1/object/public';
  const spec = hardwareFamilySpec('runners', P);
  const url = manifestUrl(spec, base);
  // The bucket answers with the real fixture; the row carries a SHORTER list,
  // so which one won is a fact and not an opinion.
  const row = {
    family: 'runners',
    manifest: { system: '760H', items: RUNNERS.items.slice(0, 3) },
    bucket_path: 'hardware/runners/blum/movento/manifest.json',
  };
  const answer = await resolveHardwareCatalogue({
    family: 'runners',
    profile: P,
    readRow: async () => row,
    fetchImpl: fetchOf({ [url]: RUNNERS }),
    storageBase: base,
  });
  assert.equal(answer.source, 'db');
  assert.equal(answer.rows, 3);
  assert.equal(runnerCatalogue().files.length, 3, 'and the ENGINE was handed the row');
  reset();
});

test('F2a.2 no row → the BUCKET manifest, exactly as turns 18–21 read it', async () => {
  reset();
  const base = 'https://example.supabase.co/storage/v1/object/public';
  const url = manifestUrl(hardwareFamilySpec('runners', P), base);
  const answer = await resolveHardwareCatalogue({
    family: 'runners',
    profile: P,
    readRow: async () => null,
    fetchImpl: fetchOf({ [url]: RUNNERS }),
    storageBase: base,
  });
  assert.equal(answer.source, 'bucket');
  assert.equal(answer.url, url);
  assert.equal(answer.rows, runnerCatalogue().files.length);
  assert.ok(answer.rows > 0);
  reset();
});

test('F2a.2 no row, NO NETWORK → mock, and nothing throws or waits', async () => {
  reset();
  const answer = await resolveHardwareCatalogue({
    family: 'runners',
    profile: P,
    readRow: async () => null,
    fetchImpl: null,
    storageBase: '',
  });
  // The runners have no repository catalogue on purpose (turn 19), so mock
  // mode is the profile's own ladder and no article numbers — which is what
  // every turn since 18 has shipped.
  assert.equal(answer.source, 'mock');
  assert.equal(answer.rows, 0);
  assert.equal(runnerCatalogue(), null);
  reset();
});

test('F2a.2 a table that does not exist is not an error the joiner sees', async () => {
  reset();
  const base = 'https://example.supabase.co/storage/v1/object/public';
  const url = manifestUrl(hardwareFamilySpec('runners', P), base);
  const answer = await resolveHardwareCatalogue({
    family: 'runners',
    profile: P,
    readRow: async () => { throw new Error('relation "cc_hardware" does not exist'); },
    fetchImpl: fetchOf({ [url]: RUNNERS }),
    storageBase: base,
  });
  assert.equal(answer.source, 'bucket', 'the next source down answered');
  assert.ok(answer.rows > 0);
  reset();
});

test('F2a.2 the HINGES climb the same ladder, in the same function', async () => {
  reset();
  const base = 'https://example.supabase.co/storage/v1/object/public';
  const url = manifestUrl(hardwareFamilySpec('hinges', P), base);

  // 1 — the bucket.
  const fromBucket = await resolveHardwareCatalogue({
    family: 'hinges', profile: P, readRow: async () => null, fetchImpl: fetchOf({ [url]: HINGES }), storageBase: base,
  });
  assert.equal(fromBucket.source, 'bucket');
  assert.ok(fromBucket.rows > 0);

  // 2 — a row, which wins.
  reset();
  const fromDb = await resolveHardwareCatalogue({
    family: 'hinges',
    profile: P,
    readRow: async () => ({ manifest: { ...HINGES, items: HINGES.items.slice(0, 2) } }),
    fetchImpl: fetchOf({ [url]: HINGES }),
    storageBase: base,
  });
  assert.equal(fromDb.source, 'db');
  assert.equal(fromDb.rows, 2);

  // 3 — nothing at all: the CATALOGUE OF RECORD that ships in the repository.
  reset();
  const mock = await resolveHardwareCatalogue({
    family: 'hinges', profile: P, readRow: async () => null, fetchImpl: null, storageBase: '',
  });
  assert.equal(mock.source, 'mock');
  assert.ok(mock.rows > 0, 'the hinges are never without a catalogue — it ships with the app');
  assert.ok(hingeCatalogue().rules.byThickness.length > 0, 'and the ANGLE RULE came with it');
  reset();
});

test('F2a.2 every family is resolvable and remembers where it came from', async () => {
  reset();
  assert.deepEqual(HARDWARE_FAMILIES, ['runners', 'hinges', 'lifts']);
  for (const family of HARDWARE_FAMILIES) {
    // eslint-disable-next-line no-await-in-loop
    await resolveHardwareCatalogue({
      family, profile: P, readRow: async () => null, fetchImpl: null, storageBase: '',
    });
    assert.ok(hardwareSourceOf(family), `${family} recorded its answer`);
  }
  reset();
});

test('F2a.2 NOTHING about model URL composition changes (R4)', () => {
  reset();
  setHingeCatalogue(HINGES);
  const entry = (hingeCatalogue().items || []).find((i) => i.file);
  const base = 'https://example.supabase.co/storage/v1/object/public';
  const url = hingeModelUrl(entry, P, base);
  // Absolute, the bucket exactly once, the file beside its manifest — turn 21's
  // three assertions, unmoved by this turn's plumbing.
  assert.ok(url.startsWith('https://'));
  assert.equal(url.split('/hardware/').length, 2);
  assert.ok(url.endsWith('.glb'));
  // …and the SAME url whether the catalogue came from a row or from the bucket:
  // the row replaces the JSON, not the arithmetic over it.
  clearHingeCatalogue();
  setHingeCatalogue({ ...HINGES });
  assert.equal(hingeModelUrl((hingeCatalogue().items || []).find((i) => i.file), P, base), url);
  reset();
});

// ─── F2b.1 — the validator ──────────────────────────────────────────────────

test('F2b.1 a key a RULE owns is REFUSED, by name, with a reason', () => {
  const { value, rejected } = validateCompanyDefaults({
    hinge_finish: 'onyx',
    hinge_angle: 110,
  }, P);
  assert.equal(value.hinge_finish, 'onyx', 'the preference is kept');
  assert.equal(value.hinge_angle, undefined, 'the rule-owned key never reaches the row');
  const hit = rejected.find((r) => r.key === 'hinge_angle');
  assert.ok(hit, 'and it is said out loud rather than dropped quietly');
  assert.ok(/rule/.test(hit.why));
  // Every name on the list is refused, in every casing the app uses.
  for (const key of RULE_OWNED_KEYS) {
    const out = validateCompanyDefaults({ [key]: 1 }, P);
    assert.ok(out.rejected.some((r) => r.key === key), `${key} must be refused`);
  }
});

test('F2b.1 a preference this workshop does not offer is refused too', () => {
  const { value, rejected } = validateCompanyDefaults({
    hinge_finish: 'chartreuse', runner_variant: 'Z', plate: 'plate_screw3',
  }, P);
  assert.equal(value.hinge_finish, null);
  assert.equal(value.runner_variant, null);
  assert.equal(value.plate, null, 'a plate this build cannot drill for is not an override');
  assert.equal(rejected.length, 3);
});

test('F2b.1 the row takes only preferences, and per-family boards', () => {
  const { value, rejected } = validateCompanyDefaults({
    hinge_system: 'cliptop_blumotion',
    hinge_finish: 'ONYX',
    plate: P.hardware.hinge.cliptop.defaultPlate,
    runner_variant: 't',
    boards: {
      wardrobe: { carcass_thickness: 18 },
      spaceship: { carcass_thickness: 18 },
      kitchen: { carcass_thickness: 999 },
    },
  }, P);
  assert.equal(value.hinge_finish, 'onyx', 'case is not a different finish');
  assert.equal(value.runner_variant, 'T');
  assert.deepEqual(Object.keys(value.boards), ['wardrobe']);
  assert.ok(rejected.some((r) => r.key === 'boards.spaceship'));
  assert.ok(rejected.some((r) => r.key === 'boards.kitchen.carcass_thickness'));
  assert.deepEqual(BOARD_FAMILIES, ['kitchen', 'wardrobe']);
});

// ─── F2b.3 — the cascade, at all four levels ───────────────────────────────

test('F2b.3 cascade: profile → company → project → element, later wins', () => {
  const allowed = new Set(['a', 'b', 'c', 'd']);
  assert.equal(cascade(levelsOf({ profile: 'a' }), { allowed }), 'a');
  assert.equal(cascade(levelsOf({ profile: 'a', company: 'b' }), { allowed }), 'b');
  assert.equal(cascade(levelsOf({ profile: 'a', company: 'b', project: 'c' }), { allowed }), 'c');
  assert.equal(cascade(levelsOf({
    profile: 'a', company: 'b', project: 'c', element: 'd',
  }), { allowed }), 'd');
  // A layer that has not said is skipped, not counted as an answer.
  assert.equal(cascade(levelsOf({ profile: 'a', company: null, project: 'c' }), { allowed }), 'c');
  // A stale value is not an override — the ladder carries on below it.
  assert.equal(cascade(levelsOf({ profile: 'a', company: 'b', project: 'zzz' }), { allowed }), 'b');
});

test('F2b.3 the hinge resolvers climb it — and with no row are what they were', () => {
  clearCompanyDefaults();
  const C = P.hardware.hinge.cliptop;
  const design = (h) => migrateDesign({ hinges: h });

  // No row: exactly turn 19's answers.
  assert.equal(resolveHingeFinish(design({}), P), C.defaultFinish);
  assert.equal(resolveHingeFinish(design({ finish: 'onyx' }), P), 'onyx');
  assert.equal(resolveHingeSystem(design({}), P), C.system);
  assert.equal(resolveHingePlate(design({}), P), C.defaultPlate);

  // A row: it beats the profile…
  setCompanyDefaults({ hinge_finish: 'onyx' }, P);
  assert.equal(resolveHingeFinish(design({}), P), 'onyx');
  // …and the PROJECT beats the row, because that is the next storey up.
  assert.equal(resolveHingeFinish(design({ finish: 'nickel' }), P), 'nickel');
  clearCompanyDefaults();
  assert.equal(resolveHingeFinish(design({}), P), C.defaultFinish, 'and it is forgotten cleanly');
});

test('F2b.3 the runner variant climbs the same four rungs', () => {
  clearCompanyDefaults();
  const M = P.hardware.runner.movento;
  const other = M.variants.find((v) => v.id !== M.defaultVariant)?.id;
  assert.ok(other, 'the workshop offers more than one variant, or this proves nothing');

  assert.equal(resolveRunnerVariant({ profile: P }), M.defaultVariant);
  setCompanyDefaults({ runner_variant: other }, P);
  assert.equal(resolveRunnerVariant({ profile: P }), other, 'the company row');
  assert.equal(
    resolveRunnerVariant({ design: { runners: { variant: M.defaultVariant } }, profile: P }),
    M.defaultVariant,
    'the project overrules it',
  );
  assert.equal(
    resolveRunnerVariant({
      design: { runners: { variant: M.defaultVariant } },
      unit: { params: { runner_variant: other } },
      profile: P,
    }),
    other,
    'the element overrules the project',
  );
  assert.equal(
    resolveRunnerVariant({
      drawer: 2,
      design: { runners: { variant: M.defaultVariant } },
      unit: { params: { runner_variant: M.defaultVariant, runner_variants: { 2: other } } },
      profile: P,
    }),
    other,
    '…and one drawer overrules the cabinet',
  );
  clearCompanyDefaults();
});

test('F2b.3 the engine is told about the row, and knows when there is none', () => {
  clearCompanyDefaults();
  assert.equal(companyDefaults(), null);
  assert.equal(hasCompanyDefaults(null), false);
  assert.equal(hasCompanyDefaults({ boards: {} }), false, 'an empty row is the same as no row');
  setCompanyDefaults({ hinge_finish: 'onyx' }, P);
  assert.equal(companyDefaults().hinge_finish, 'onyx');
  // …and a row of nothing but refused keys is no row at all.
  setCompanyDefaults({ hinge_angle: 110 }, P);
  assert.equal(companyDefaults(), null);
  clearCompanyDefaults();
});

// ─── F2b.3 / F2b.5 — the prefill equivalence probe ─────────────────────────

function project(design = null, company = undefined) {
  store().loadProject({
    id: null,
    name: 't22-f2',
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design: {},
  }, []);
  store().newProject('probe', {
    room: migrateRoom({ height: 2500, corners: rectCorners(4000, 3000) }),
    design,
    company,
  });
  return store().project.design;
}

test('F2b.3 a NEW project is prefilled from the row — and untouched without one', () => {
  clearCompanyDefaults();
  const bare = project(null);
  assert.equal(bare.hinges.finish, null, 'no row, nothing written — turn 21’s project exactly');
  assert.equal(bare.runners.variant, null);

  const row = { hinge_finish: 'onyx', runner_variant: 'S' };
  const filled = project(null, row);
  assert.equal(filled.hinges.finish, 'onyx');
  assert.equal(filled.runners.variant, 'S');
  clearCompanyDefaults();
});

test('F2b.3 the prefill never overwrites something the design already says', () => {
  clearCompanyDefaults();
  const filled = project({ hinges: { finish: 'nickel' } }, { hinge_finish: 'onyx' });
  assert.equal(filled.hinges.finish, 'nickel', 'a template has already answered');
  clearCompanyDefaults();
});

test('F2b.5 THE EQUIVALENCE PROBE — a company row equals its manual-settings twin', () => {
  // CLAUDE.md F2b.5: "a probe scenario with a company row shows only
  // differences the equivalent manual project settings would show — assert
  // exactly that equivalence."
  clearCompanyDefaults();
  const row = { hinge_finish: 'onyx', hinge_system: 'cliptop_blumotion', runner_variant: 'S' };

  // A — created with the row present.
  const fromRow = project(null, row);
  const rowUnit = store().addUnit('BUD');
  store().setDoors(rowUnit.id, { count: 1 });
  const rowResult = store().unitResult(rowUnit.id);

  // B — created with NO row, and the equivalent settings typed into the
  // project by hand.
  clearCompanyDefaults();
  const manual = project({
    hinges: { finish: 'onyx', system: 'cliptop_blumotion' },
    runners: { variant: 'S' },
  });
  const manualUnit = store().addUnit('BUD');
  store().setDoors(manualUnit.id, { count: 1 });
  const manualResult = store().unitResult(manualUnit.id);

  // The DESIGN is the same answer either way…
  assert.deepEqual(fromRow.hinges, manual.hinges);
  assert.deepEqual(fromRow.runners, manual.runners);
  // …and so is everything the engine makes of it: the same cut pieces, the
  // same drilling, the same hardware.
  const shape = (r) => ({
    panels: r.panels.map((p) => `${p.id}|${p.w}x${p.h}x${p.thickness}`).sort(),
    drills: r.drills.length,
    hardware: r.hardware.map((h) => `${h.role}|${h.qty}|${h.spec_label}`).sort(),
  });
  assert.deepEqual(shape(rowResult), shape(manualResult));
  clearCompanyDefaults();
});

test('F2b.5 golden defaults — no row — leave the engine exactly where it was', () => {
  clearCompanyDefaults();
  const before = project(null);
  assert.deepEqual(before.hinges, {
    standard: null, system: null, finish: null, plate: null,
  });
  assert.deepEqual(before.runners, { system: null, variant: null });
  // And `prefillDesignFromCompany` with nothing to say is the identity.
  const design = migrateDesign({});
  assert.equal(prefillDesignFromCompany(design, null, P), design);
});
