import { parseDecorCatalogue, setDecorCatalogue, setDecorScale } from '../engine/decors.js';
import { getCabinetProfile } from '../engine/profile.js';
import { noteStorageBase } from '../lib/storageBase.js';

// ─── THE EGGER PACK, FETCHED BY RETAIL'S OWN HAND ──────────────────────────
//
// The catalogue is a file in `public/` and the engine never reaches for the
// network — it is HANDED the parsed list (`engine/decors.js setDecorCatalogue`).
// PRO's loader is `src/lib/decorCatalogue.js`, which the iron boundary puts out
// of retail's reach, so this is the same three engine calls made from this
// side of the wall. Twenty lines rather than a boundary violation.
//
// ─── T63 F1 · …AND THE BUCKET IS TOLD, AFTER ALL ───────────────────────────
//
// T59 left PRO's `noteStorageBase()` out on purpose: *"the PBI site has no
// business knowing"* where the workshop's bucket is. That decision is what
// stood between the client and the hinges. A hinge plate is *"the downloaded
// GLB or nothing"* (T36) and a runner the same (T43) — the models live in the
// bucket, `useStorageBase` learns the bucket only when this call fires, and
// retail never fired it. So every gate in `Hardware.jsx` could open and draw
// NOTHING, which is what *"nadal nie widać zawiasów"* looked like from the
// owner's chair. The bucket is the same public host the pack's own scan URLs
// already name; nothing new is learnt and nothing is written. `src/lib` is
// shared core and unchanged — this is one retail file calling it.

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
      // T63 F1: the views are told the host is known — the hinge and runner
      // models are fetched from it, and a view that asked before the pack
      // landed would otherwise draw nothing for ever.
      noteStorageBase();
      return { ...parsed, error: null };
    })
    .catch((e) => {
      pending = null;
      return { decors: [], error: e?.message || 'The decor pack could not be read.' };
    });
  return pending;
}
