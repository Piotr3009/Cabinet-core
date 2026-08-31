import { parseDecorCatalogue, setDecorCatalogue, setDecorScale } from '../engine/decors.js';
import { getCabinetProfile } from '../engine/profile.js';

// ─── THE EGGER PACK, FETCHED BY RETAIL'S OWN HAND ──────────────────────────
//
// The catalogue is a file in `public/` and the engine never reaches for the
// network — it is HANDED the parsed list (`engine/decors.js setDecorCatalogue`).
// PRO's loader is `src/lib/decorCatalogue.js`, which the iron boundary puts out
// of retail's reach, so this is the same three engine calls made from this
// side of the wall. Twenty lines rather than a boundary violation.
//
// What is NOT here, deliberately: PRO's `noteStorageBase()`. That exists to
// teach the app where the workshop's Supabase bucket is, and the PBI site has
// no business knowing. A decor with no scan falls back to the procedural
// grain, which is what a build with no network gets in PRO too.

export const DECOR_DIR = 'decors/egger/';
const DECOR_FILE = 'egger-decors.json';

let pending = null;

/**
 * Load the pack once. A failure is NOT fatal: the app runs with the finishes it
 * ships with, and a swatch whose decor is unknown says so (`swatch().known`)
 * rather than rendering a blank tile with no explanation.
 */
export function loadDecors({ fetchImpl = null } = {}) {
  if (pending) return pending;
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return Promise.resolve({ decors: [], error: 'No fetch in this environment.' });

  let base = '/';
  try {
    const configured = import.meta.env?.BASE_URL;
    if (typeof configured === 'string' && configured) {
      base = configured.endsWith('/') ? configured : `${configured}/`;
    }
  } catch { /* not a vite build */ }
  const dir = `${base}${DECOR_DIR}`;

  pending = doFetch(`${dir}${DECOR_FILE}`)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    })
    .then((json) => {
      const parsed = parseDecorCatalogue(json, { basePath: dir });
      setDecorScale(getCabinetProfile().appearance?.decor?.scanHeightMm);
      setDecorCatalogue(parsed);
      return { ...parsed, error: null };
    })
    .catch((e) => {
      pending = null;
      return { decors: [], error: e?.message || 'The decor pack could not be read.' };
    });
  return pending;
}
