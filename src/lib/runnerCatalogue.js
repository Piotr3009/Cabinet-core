// ─── READING THE RUNNER BUCKET (turn 18, CLAUDE.md F6.1/F6.8) ───────────────
//
// The owner's MOVENTO ladder lives in Supabase Storage: bucket `hardware`
// (public), path `hardware/runners/blum/movento/`, 40 GLB files and a
// `manifest.json` beside them naming each one's system, nominal length, variant
// and article number.
//
// That manifest IS the parts list for now — `cc_hardware` waits for the data
// module (F6.8) — so this fetches it once and hands it to the engine's registry
// (engine/runners.js), exactly as lib/decorCatalogue.js hands the EGGER pack to
// engine/decors.js. The engine never reaches for the network.
//
// Zero new dependencies: `fetch` is the platform's, and the bucket is PUBLIC,
// so no Supabase client is needed to read it — which is also what keeps this
// working in mock mode, where there is no client at all.
//
// GRACEFUL DEGRADATION IS THE IRON RULE (CLAUDE.md 0, F6.6). Every failure
// here — no url configured, mock mode, a dead network, a 404, a file that is
// not the shape we expect — resolves to the same thing: no catalogue. The 3D
// draws the plain profile it has drawn since turn 7 and the BOM orders a runner
// by its spec with no article number against it. Nothing throws, nothing waits.

import { setRunnerCatalogue } from '../engine/runners.js';
import { getCabinetProfile } from '../engine/profile.js';
import { isMockMode } from './supabase.js';

/** The public storage root, or '' where the app is running without a project. */
export function storageBaseUrl() {
  try {
    const url = import.meta.env?.VITE_SUPABASE_URL;
    if (typeof url === 'string' && url) return `${url.replace(/\/+$/, '')}/storage/v1/object/public`;
  } catch { /* not a vite build (node, a test) */ }
  return '';
}

let pending = null;

/**
 * Load the runner manifest once and hand it to the engine.
 *
 * Idempotent: repeated calls share one request, exactly like the decor pack.
 *
 * @returns {Promise<{files:Array, error:string|null, mock:boolean}>}
 */
export function loadRunnerCatalogue({ fetchImpl = null, profile = null } = {}) {
  if (pending) return pending;
  const P = profile || getCabinetProfile();
  const M = P.hardware.runner.movento;
  const base = storageBaseUrl();
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);

  if (!doFetch || !base || isMockMode) {
    // Mock mode is not a degraded mode here, it is a SUPPORTED one: the
    // workshop's own numbers are in profile.js and the runner is drawn from
    // them. What is missing is the picture and the article number.
    pending = Promise.resolve({ files: [], error: null, mock: true });
    return pending;
  }

  const url = `${base}/${M.bucket}/${M.path}${M.manifest}`;
  pending = doFetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    })
    .then((json) => {
      const parsed = setRunnerCatalogue(json);
      return { files: parsed?.files || [], error: null, mock: false };
    })
    .catch((e) => {
      // Reset, so a session that started offline can try again later.
      pending = null;
      return { files: [], error: e?.message || 'The runner manifest could not be read.', mock: false };
    });

  return pending;
}
