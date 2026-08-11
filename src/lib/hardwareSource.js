// ─── WHERE A HARDWARE CATALOGUE COMES FROM (turn 22, CLAUDE.md F2a) ─────────
//
// The data module has been parked since turn 15 and named in every turn since
// (turn 18 F6.8: "`cc_hardware` waits for the data module"). This is it, and it
// is deliberately ONE function for every family rather than a loader per
// catalogue:
//
//     DB ROW  →  BUCKET MANIFEST  →  MOCK
//
// * a row in `cc_hardware` simply REPLACES the fetched JSON. Same shape, same
//   tolerant turn-20 parser, same registry — the row is the file, moved;
// * the bucket is what turns 18–21 built and is untouched;
// * mock is what ships in the repository (`reference/hardware/*.json`, the
//   CATALOGUE OF RECORD from turn 19 F0.3) or, where a family has none, the
//   workshop's own numbers in `profile.js` and no article numbers.
//
// ─── THREE KINDS OF "NO", AND ALL OF THEM ARE FINE ─────────────────────────
//
// No table (the SQL has not been run), no session (nobody is signed in), no
// network (a desert island, mock mode): each falls through to the next source
// and NONE of them throws, blocks or waits. That is CLAUDE.md's own rule 0 for
// this turn — "database over localStorage, degradation over blocking".
//
// ─── R4 IS PROTECTED HERE BY DOING NOTHING ─────────────────────────────────
//
// "NOTHING about model URL composition changes." This module hands catalogues
// to the engine's registries and never composes a model URL: that stays
// `engine/hardwareUrl.js`, called by `engine/runners.js runnerModelUrl` and
// `engine/hinges.js hingeModelUrl`, exactly as turn 21 left it. A DB row can
// change WHICH article a drawer takes; it cannot change where the app looks
// for the model of it.
//
// Zero new dependencies. `fetch` is the platform's and the bucket is public,
// which is what keeps this working with no Supabase client at all.

import { parseHingeCatalogue, setHingeCatalogue } from '../engine/hinges.js';
import { parseRunnerManifest, setRunnerCatalogue } from '../engine/runners.js';
import { getCabinetProfile } from '../engine/profile.js';
import { storageBaseUrl as resolveStorageBase } from './storageBase.js';
import { supabase, isMockMode, withDb } from './supabase.js';
import { CLIPTOP_HINGE_CATALOGUE, MOVENTO_CATALOGUE, AVENTOS_CATALOGUE } from './hardwareCatalogue.js';

/** The families `cc_hardware.family` may name — the SQL's own CHECK, in JS. */
export const HARDWARE_FAMILIES = ['runners', 'hinges', 'lifts'];

/**
 * The answer this session settled on, per family. A DIAGNOSTIC and never an
 * input: nothing in the app reads it back to decide anything, which is the
 * same rule `3d/hardwareRegistry.js` is written under.
 */
const answers = new Map();

/** Where this family's catalogue came from, this session. */
export function hardwareSourceOf(family) {
  return answers.get(family) || null;
}

/** Every family that has been resolved, in the order the table lists them. */
export function hardwareSources() {
  return HARDWARE_FAMILIES.map((f) => answers.get(f)).filter(Boolean);
}

/** For tests, and for a session that has just signed in. */
export function clearHardwareSources() {
  answers.clear();
}

/**
 * Everything one family needs to be resolved, from the profile.
 *
 * `manifestPath` is bucket-relative and is the SAME pair of strings the model
 * URLs are built from (`profile.hardware.*.bucket` / `.path`), so a workshop
 * that moves a pack moves it in one place and the manifest follows the models.
 *
 * `lifts` has no published manifest of its own: the AVENTOS knowledge is the
 * repository file and always has been (turn 19 F0.3). It is listed anyway,
 * because the TABLE has a row shape for it and a workshop that publishes one
 * should be read without a code change.
 */
export function hardwareFamilySpec(family, profile = getCabinetProfile()) {
  const M = profile.hardware.runner.movento;
  const C = profile.hardware.hinge.cliptop;
  switch (family) {
    case 'runners':
      return {
        id: 'runners',
        label: 'MOVENTO runners',
        system: M.system,
        bucket: M.bucket,
        path: M.path,
        manifest: M.manifest,
        // No repository catalogue is ADOPTED for the runners, deliberately:
        // turn 19 wrote why (`lib/hardwareCatalogue.js` — `movento.json` names
        // its pair articles differently and pushing it through the registry
        // would change a BOM line nobody asked to change). Mock mode is the
        // profile's own ladder and no article numbers, which is what turns
        // 18–21 shipped.
        fallback: null,
        parse: parseRunnerManifest,
        rows: (parsed) => parsed?.files || [],
        apply: setRunnerCatalogue,
      };
    case 'hinges':
      return {
        id: 'hinges',
        label: 'CLIP top hinges',
        system: C.system,
        bucket: C.bucket,
        path: C.path,
        manifest: 'manifest.json',
        fallback: CLIPTOP_HINGE_CATALOGUE,
        parse: parseHingeCatalogue,
        rows: (parsed) => parsed?.items || [],
        apply: setHingeCatalogue,
      };
    case 'lifts':
      return {
        id: 'lifts',
        label: 'AVENTOS lifts',
        system: 'aventos',
        bucket: C.bucket,
        path: 'lifts/blum/',
        manifest: 'manifest.json',
        fallback: AVENTOS_CATALOGUE,
        // The lift catalogue is consumed by engine/lifts.js, which owns its own
        // parser; this module only ever decides WHICH JSON that parser sees.
        parse: (raw) => (raw && typeof raw === 'object' ? raw : null),
        rows: (parsed) => parsed?.components || parsed?.items || [],
        apply: null,
        // …and it is not fetched from the bucket until the owner publishes one:
        // asking for a file nobody has uploaded is a 404 in his console for no
        // reason at all (turn 21's whole F2).
        bucketPublished: false,
      };
    default:
      return null;
  }
}

/** The absolute manifest URL for a family, or null where there is no host. */
export function manifestUrl(spec, base) {
  if (!spec || !base) return null;
  return `${base}/${spec.bucket}/${spec.path}${spec.manifest}`;
}

/**
 * Read this owner's `cc_hardware` row for one family, or null.
 *
 * Never throws and never waits on a table that does not exist: `withDb`
 * degrades a missing table, a dead network and mock mode to the same `null`,
 * which is the whole point of it.
 */
export async function readHardwareRow(family, { system = null } = {}) {
  if (isMockMode || !supabase) return null;
  const { data } = await withDb(async (db) => {
    let q = db.from('cc_hardware').select('family, system, manifest, bucket_path, updated_at')
      .eq('family', family);
    if (system) q = q.eq('system', system);
    return q.order('updated_at', { ascending: false }).limit(1);
  }, null);
  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

/**
 * WHERE THIS FAMILY'S CATALOGUE COMES FROM — the one function (F2a.2).
 *
 * Everything is injectable so a node test can run all three branches without a
 * database, a network or a browser: `readRow` stands in for Supabase,
 * `fetchImpl` for the bucket, and leaving both out is the desert island.
 *
 * @param {object} args
 *   family      'runners' | 'hinges' | 'lifts'
 *   profile
 *   readRow     async (family, {system}) => row|null
 *   fetchImpl   the bucket fetch, or null for "no network"
 *   storageBase the public storage root, or '' for "no host"
 *   adopt       false to resolve WITHOUT handing the answer to the registry —
 *               which is what the health row and the tests want
 * @returns {Promise<{source:'db'|'bucket'|'mock'|'none', rows:number,
 *                    system:string|null, url:string|null, error:string|null,
 *                    catalogue:object|null}>}
 */
export async function resolveHardwareCatalogue({
  family,
  profile = getCabinetProfile(),
  readRow = readHardwareRow,
  fetchImpl = (typeof fetch === 'function' ? fetch : null),
  storageBase = null,
  adopt = true,
} = {}) {
  const spec = hardwareFamilySpec(family, profile);
  if (!spec) return {
    source: 'none', rows: 0, system: null, url: null, error: `Unknown hardware family "${family}"`, catalogue: null,
  };

  const note = (answer) => {
    // What the app CHOSE, remembered — so the health line (F3) reads the same
    // answer the registry was handed rather than asking the network again.
    answers.set(family, { ...answer, family });
    return answer;
  };

  const take = (raw, source, url, error = null) => {
    const parsed = spec.parse(raw);
    if (!parsed) return null;
    const rows = spec.rows(parsed).length;
    if (!rows) return null;
    if (adopt && spec.apply) spec.apply(raw);
    return {
      source, rows, system: parsed.system || spec.system || null, url, error, catalogue: parsed,
    };
  };

  let error = null;

  // 1 — THE DATABASE. A row, when there is one, WINS.
  try {
    const row = await readRow(family, { system: null });
    const got = row?.manifest ? take(row.manifest, 'db', row.bucket_path || null) : null;
    if (got) return note(got);
  } catch (e) {
    // A table that has not had sql/004_tura22.sql run against it is not an
    // error the joiner needs to see: it is the app running as it did before
    // this turn. It is recorded and the next source is asked.
    error = e?.message || 'the hardware table could not be read';
  }

  // 2 — THE BUCKET, exactly as turns 18–21 read it.
  const base = storageBase == null ? resolveStorageBase() : storageBase;
  const url = spec.bucketPublished === false ? null : manifestUrl(spec, base);
  if (url && fetchImpl) {
    try {
      const res = await fetchImpl(url);
      if (!res?.ok) throw new Error(`${res?.status} ${res?.statusText || ''}`.trim());
      const json = await res.json();
      const got = take(json, 'bucket', url, error);
      if (got) return note(got);
      error = error || 'the manifest was read but carried no usable rows';
    } catch (e) {
      error = e?.message || 'the manifest could not be read';
    }
  }

  // 3 — MOCK. What ships in the repository, or the workshop's own numbers.
  const got = spec.fallback ? take(spec.fallback, 'mock', null, error) : null;
  if (got) return note(got);
  return note({
    source: 'mock', rows: 0, system: spec.system || null, url, error, catalogue: null,
  });
}

/** All three families, resolved together. Never rejects. */
export async function resolveAllHardwareCatalogues(options = {}) {
  const out = {};
  for (const family of HARDWARE_FAMILIES) {
    // Sequential on purpose: three requests that all wait on the same missing
    // table is three timeouts, and the first one already knows the answer.
    // eslint-disable-next-line no-await-in-loop
    out[family] = await resolveHardwareCatalogue({ ...options, family });
  }
  return out;
}

/** Unused today; the seeding script's own shape, kept beside the reader. */
export function hardwareRowFor(family, manifest, profile = getCabinetProfile()) {
  const spec = hardwareFamilySpec(family, profile);
  if (!spec) return null;
  const parsed = spec.parse(manifest);
  return {
    family,
    system: parsed?.system || spec.system || '',
    manifest,
    bucket_path: `${spec.bucket}/${spec.path}${spec.manifest}`,
  };
}

export { MOVENTO_CATALOGUE };
