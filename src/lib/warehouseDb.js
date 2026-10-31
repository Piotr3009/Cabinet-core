// ─── cc_warehouse — THE MATERIALS WAREHOUSE'S OWN TABLE (turn 51, F7) ───────
//
// CLAUDE.md F7: *"Own table, not shared with PC."*  It is also not shared with
// Cabinet Core's own `cc_materials`, which is the six-column stock list the
// assignment modal reads (turn 39). Two lists with different jobs and different
// shapes are two tables, and merging them would have cost one of the two
// screens fields it needs.
//
//   `supabase/migrations/t51_warehouse.sql` — SQL PRZED push (iron rule 7).
//   Piotr runs it by hand, before the deploy. Nothing here creates a table.
//
// ─── DEGRADATION IS THE DEFAULT, NOT THE FALLBACK (CLAUDE.md F7) ────────────
//
// *"Degrades gracefully with no network: the warehouse opens, says it is
// offline, and does not lose a typed row."*
//
// Every function answers `{ rows|ok, source, error }` and NEVER throws.
// `withDb` already turns mock mode, a dead network and a table that has not had
// the migration run against it into the same quiet `null`, so all three are one
// code path: `source: 'local'`, and the surface says so in an amber line. The
// LOCAL SHELF is written first and always (`stores/warehouseStore.js`), so a
// typed row is never lost because a database was slow.

import { withDb } from './jcApi.js';
import { CSV_COLUMNS, migrateMaterial } from '../engine/warehouse.js';

const TABLE = 'cc_warehouse';

/**
 * The columns the table carries — the model's twelve, plus ours.
 * T78 F21 - `paint` (jsonb, the Paints department's five fields) is ours too:
 * supabase/migrations/t78_warehouse_paint.sql, SQL PRZED push like T51's.
 */
const COLUMNS = ['id', ...CSV_COLUMNS, 'price_source', 'paint'].join(',');

/** A row from the table, in the shape the app already speaks. */
function rowOf(row) {
  return migrateMaterial(row);
}

/**
 * The whole catalogue.
 *
 * @returns {Promise<{rows:Array, source:'db'|'local', error:string|null}>}
 */
export async function listWarehouse() {
  const { data, error, mock } = await withDb(
    (db) => db.from(TABLE).select(COLUMNS).order('item_number', { ascending: true }),
    null,
  );
  if (mock || error || !Array.isArray(data)) {
    return { rows: [], source: 'local', error: error ? (error.message || String(error)) : null };
  }
  return { rows: data.map(rowOf), source: 'db', error: null };
}

// T-CC1a F3: the three writes (saveMaterialDb, saveManyDb, removeMaterialDb) are deleted; the rows stay in this
// browser until T-CC2 moves the warehouse to Joinery Core (*"oczywiscie do CC laczysz sie tylko przez JC"*).

/** The amber line the warehouse prints when it is working on its own. */
export const OFFLINE_NOTICE = 'Offline — this warehouse is in this browser only. '
  + 'Rows are kept and nothing is lost; run supabase/migrations/t51_warehouse.sql '
  + 'and sign in to share it across machines.';
