import { parseDecorCatalogue, setDecorCatalogue, setDecorScale } from '../engine/decors.js';
import { getCabinetProfile } from '../engine/profile.js';

// ─── Loading the decor pack (BACKLOG #19) ───
//
// The catalogue is a FILE in the repo (public/decors/egger/egger-decors.json,
// 85 decors + 256 px thumbnails), so this is a fetch and nothing more. The
// engine never reaches for the network; it is handed the parsed list and keeps
// it (engine/decors.js setDecorCatalogue).
//
// Loading is: the LIST immediately, from one small JSON, and the thumbnails
// lazily — every <img> in the picker carries loading="lazy", and a uni colour
// has no image at all. Opening the picker therefore costs one request, not 85.
//
// TURN 8 moves the pack into its own folder and adds the third piece: the
// full-board SCANS. They are not in the repo — 69 of them at a megabyte each is
// not a git repository — they live in Supabase Storage and each row carries the
// url. Nothing is fetched here; a scan is downloaded by the texture loader when
// a panel actually wears that decor, which is one image per decor in use rather
// than 69 on start-up.
//
// Zero new dependencies (CLAUDE.md): fetch is the platform's.

export const DECOR_DIR = 'decors/egger/';
export const DECOR_FILE = 'egger-decors.json';

/** Where public/ is served from, whatever base the build was made with. */
function baseUrl() {
  try {
    const base = import.meta.env?.BASE_URL;
    if (typeof base === 'string' && base) return base.endsWith('/') ? base : `${base}/`;
  } catch { /* not a vite build (node, a test) */ }
  return '/';
}

let pending = null;

/**
 * Load the decor pack once and hand it to the engine's registry.
 *
 * Idempotent: repeated calls share one request. A failure is NOT fatal — the
 * app runs with the finishes it ships with, and the picker says the pack could
 * not be read rather than showing an empty grid with no explanation.
 *
 * @returns {Promise<{decors:Array, meta:object|null, error:string|null}>}
 */
export function loadDecorCatalogue({ fetchImpl = null } = {}) {
  if (pending) return pending;
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) {
    return Promise.resolve({ decors: [], meta: null, error: 'No fetch available in this environment.' });
  }

  const base = `${baseUrl()}${DECOR_DIR}`;
  pending = doFetch(`${base}${DECOR_FILE}`)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    })
    .then((json) => {
      const parsed = parseDecorCatalogue(json, { basePath: base });
      // How many millimetres of board one scan is worth. A CALIBRATION, so it
      // is a profile number and is pushed in here rather than being a literal
      // beside the loader (CLAUDE.md rule 3).
      setDecorScale(getCabinetProfile().appearance?.decor?.scanHeightMm);
      setDecorCatalogue(parsed);
      return { ...parsed, error: null };
    })
    .catch((e) => {
      // Reset, so a picker opened after a flaky first load can try again.
      pending = null;
      return { decors: [], meta: null, error: e?.message || 'The decor pack could not be read.' };
    });

  return pending;
}
