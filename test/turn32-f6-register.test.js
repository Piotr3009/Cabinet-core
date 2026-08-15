// ─── Turn 32, CLAUDE.md F6: the hardware REGISTER — the only SQL ────────────
//
// The owner's ruling: CabinetCore keeps a registry of EXISTENCE, never of
// stock. Registered = the automat resolves an article; unregistered = the
// yellow BOM line. NOTHING BLOCKS on the registry — it informs. Mock mode /
// no table → every lookup answers null → the app fully alive.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import {
  clearHardwareRegister, hardwareRegisterRows, installHardwareRegister,
  loadHardwareRegister, makeRegisterLookup, parseRegisterRows, registerLookup,
} from '../src/lib/hardwareRegister.js';
import { hingeAutomat } from '../src/engine/hinges.js';
import { loadHardwareCatalogues } from '../src/lib/hardwareCatalogue.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

loadHardwareCatalogues();

const sql = readFileSync(new URL('../sql/005_tura32.sql', import.meta.url), 'utf8');

// ─── the table, as the owner dictated it ────────────────────────────────────

test('cc_hardware_register carries exactly the owner’s columns, with RLS on', () => {
  assert.match(sql, /create table if not exists public\.cc_hardware_register/);
  for (const col of ['category', 'family', 'finish', 'variant', 'angle', 'article', 'source', 'label']) {
    assert.match(sql, new RegExp(`^  ${col} `, 'm'), `column ${col}`);
  }
  assert.match(sql, /variant in \('soft', 'std'\)/, 'variant (soft|std)');
  assert.match(sql, /source in \('own', 'joinerycore'\)/, 'source (own|joinerycore)');
  assert.match(sql, /alter table public\.cc_hardware_register enable row level security/);
  for (const verb of ['select', 'insert', 'update', 'delete']) {
    assert.match(sql, new RegExp(`create policy cc_hardware_register_${verb} `), `RLS ${verb}`);
  }
  // Idempotent, like every migration before it, and labelled the house way.
  assert.match(sql, /^-- SQL PRZED push\./);
  assert.match(sql, /on_conflict|owner_article_idx/, 'an upsert identity');
});

// ─── the lookup ─────────────────────────────────────────────────────────────

const ROWS = [
  {
    category: 'hinge', family: '71B3550', finish: 'nickel', variant: 'soft', angle: 110, article: '42542984', label: '71B3550 110° nickel',
  },
  {
    category: 'runner', family: '760H', variant: 'std', article: '44182964', label: 'MOVENTO 760H NL 450 S',
  },
  {
    category: 'clip', article: 'CL-77', label: 'Plinth clip', source: 'joinerycore',
  },
];

test('a question names what it knows; a row answers when it does not disagree', () => {
  const lookup = makeRegisterLookup(parseRegisterRows(ROWS));
  const hinge = lookup({
    category: 'hinge', angle: 110, finish: 'nickel', variant: 'soft',
  });
  assert.equal(hinge.article, '42542984');
  assert.equal(hinge.source, 'registry');
  assert.equal(lookup({ category: 'hinge', angle: 95, finish: 'nickel' }), null, 'no 95° row');
  // The runner's nominal length lives in the LABEL — "NL 450".
  assert.equal(lookup({ category: 'runner', nl: 450, variant: 'std' }).article, '44182964');
  assert.equal(lookup({ category: 'runner', nl: 500, variant: 'std' }), null);
  // A JoineryCore row says where it came from.
  assert.equal(lookup({ category: 'clip' }).source, 'joinerycore');
  assert.equal(lookup({}), null, 'no category, no answer');
});

test('mock mode: every lookup answers null and NOTHING blocks', async () => {
  clearHardwareRegister();
  await loadHardwareRegister({ readRows: async () => null });   // no table
  assert.deepEqual(hardwareRegisterRows(), []);
  assert.equal(registerLookup({ category: 'hinge', angle: 110, finish: 'nickel' }), null);
  // …and a failed read is the same honest nothing, never a throw.
  clearHardwareRegister();
  await loadHardwareRegister({ readRows: async () => { throw new Error('offline'); } });
  assert.deepEqual(hardwareRegisterRows(), []);
});

test('the automat asks the register FIRST, and a registered row wins', async () => {
  clearHardwareRegister();
  installHardwareRegister([{
    category: 'hinge', family: 'OWN-95', finish: 'onyx', variant: 'soft', angle: 95, article: 'W-095', label: 'workshop 95',
  }]);
  const auto = hingeAutomat({ frontThickness: 30, metal: 'onyx', softClose: true }, {
    profile: P, lookup: registerLookup,
  });
  assert.equal(auto.article, 'W-095');
  assert.equal(auto.source, 'registry');
  clearHardwareRegister();
});

// ─── the seed — 40 MOVENTO articles and the Blum hinge articles, once ───────

test('the seed script reads the catalogues, refuses nothing-burgers, writes nothing dry', () => {
  const out = execFileSync('node', [new URL('../scripts/seed-hardware-register.mjs', import.meta.url).pathname], {
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', CC_OWNER: '' },
  });
  assert.match(out, /DRY RUN/);
  assert.match(out, /runners\s+40 articles/, 'the MOVENTO manifest’s 40');
  assert.match(out, /hinges\s+\d+ articles/);
  assert.match(out, /plates\s+\d+ articles/);
  assert.match(out, /Dry run complete — nothing was written\./);
  // Spot-check a real MOVENTO article rides with its NL label.
  assert.match(out, /runner\s+44182964\s+MOVENTO 760H NL 250 S/);
});
