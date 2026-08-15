// ─── TURN 32 (CLAUDE.md F6): THE HARDWARE REGISTER ──────────────────────────
//
// The owner's ruling: CabinetCore keeps a registry of EXISTENCE, never of
// stock. Stock lives in JoineryCore; the export there is parked. One row =
// one article the automat may write into the BOM.
//
// Registered = the automat resolves an article. Unregistered = the yellow
// named-spec line (F5). NOTHING BLOCKS on the registry — it informs.
//
// Graceful degradation is the iron rule: mock mode, no table, a failed read —
// every lookup answers null, every yellow line does the honest talking, and
// the app is fully alive. Same shape as lib/hardwareSource.js: injectable
// reads so node tests drive every branch, a memoised load that never
// rejects, and a cache the answers are read from.

import { isMockMode, supabase, withDb } from './supabase.js';

let cache = [];
let pending = null;

/** Rows from any source, kept only when they can answer for an article. */
export function parseRegisterRows(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => ({
      category: r?.category ? String(r.category).toLowerCase() : null,
      family: r?.family ? String(r.family) : '',
      finish: r?.finish ? String(r.finish).toLowerCase() : null,
      variant: r?.variant === 'soft' || r?.variant === 'std' ? r.variant : null,
      angle: Number.isFinite(Number(r?.angle)) && r?.angle !== null && r?.angle !== ''
        ? Number(r.angle) : null,
      article: r?.article ? String(r.article) : null,
      source: r?.source === 'joinerycore' ? 'joinerycore' : 'own',
      label: r?.label ? String(r.label) : '',
    }))
    .filter((r) => r.category && r.article);
}

/**
 * The one lookup the automat and the BOM ask (F2/F5's injectable `lookup`).
 *
 * A question names what it knows — category always; angle, finish, variant,
 * nominal length where they matter — and a row answers only when it does not
 * disagree with any of it. The nominal length lives in the LABEL ("NL 450"),
 * because a length is a fact about a runner article, not a column every
 * category drags along.
 */
export function makeRegisterLookup(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return (q = {}) => {
    if (!list.length || !q.category) return null;
    const cat = String(q.category).toLowerCase();
    const finish = q.finish ? String(q.finish).toLowerCase() : null;
    const hit = list.find((r) => {
      if (r.category !== cat) return false;
      if (q.angle != null && r.angle !== Number(q.angle)) return false;
      if (finish && r.finish && r.finish !== finish) return false;
      if (q.variant && r.variant && r.variant !== q.variant) return false;
      if (q.nl != null) {
        const m = /NL\s*(\d+(?:\.\d+)?)/i.exec(r.label);
        if (!m || Number(m[1]) !== Number(q.nl)) return false;
      }
      return true;
    });
    if (!hit) return null;
    return {
      family: hit.family || null,
      article: hit.article,
      articles: [hit.article],
      finish: hit.finish,
      variant: hit.variant,
      angle: hit.angle,
      source: hit.source === 'joinerycore' ? 'joinerycore' : 'registry',
      label: hit.label || null,
    };
  };
}

async function readTable() {
  if (isMockMode || !supabase) return null;
  const { data } = await withDb(
    (db) => db.from('cc_hardware_register')
      .select('category, family, finish, variant, angle, article, source, label'),
    null,
  );
  return data;
}

/**
 * Load once, cache, never reject. Mock mode / no table / an error → an empty
 * cache, which is a lookup that answers null — the app was born knowing how
 * to live with that (the yellow lines).
 */
export function loadHardwareRegister({ readRows = readTable } = {}) {
  if (pending) return pending;
  pending = Promise.resolve()
    .then(() => readRows())
    .then((data) => { cache = parseRegisterRows(data); return cache; })
    .catch(() => { cache = []; return cache; })
    .finally(() => { pending = null; });
  return pending;
}

/**
 * THE lookup — reads whatever the cache holds at call time, so a consumer
 * may keep one function reference for the whole session.
 */
export function registerLookup(q) {
  return makeRegisterLookup(cache)(q);
}

/** Everything the register knows right now (diagnostics and tests). */
export function hardwareRegisterRows() {
  return [...cache];
}

/** Tests: put the shelf back the way a fresh session finds it. */
export function clearHardwareRegister() {
  cache = [];
  pending = null;
}

/** Tests: install rows directly, as a seeded session would hold them. */
export function installHardwareRegister(rows) {
  cache = parseRegisterRows(rows);
  return cache;
}
