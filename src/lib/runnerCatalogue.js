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
import { storageBaseUrl as resolveStorageBase } from './storageBase.js';

// ─── TURN 21 (CLAUDE.md F2) ────────────────────────────────────────────────
// Where the app's storage is has become a question of its own — configuration
// first, and the app's own decor registry where configuration is silent (a
// build with no `VITE_SUPABASE_URL` was asking its own domain for hinge
// models) — so it lives in lib/storageBase.js and every caller imports it from
// there. This file asks the same question the same way.

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
  const base = resolveStorageBase();
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);

  if (!doFetch) {
    // Mock mode is not a degraded mode here, it is a SUPPORTED one: the
    // workshop's own numbers are in profile.js and the runner is drawn from
    // them. What is missing is the picture and the article number.
    pending = Promise.resolve({ files: [], error: null, mock: true });
    return pending;
  }
  // ─── TURN 21 (CLAUDE.md F2) ──────────────────────────────────────────────
  //
  // "No host" is NOT "never". On a build made without `VITE_SUPABASE_URL` the
  // host arrives with the decor pack, a moment later — so this answers
  // honestly and does NOT memoise the answer, and App.jsx asks again when the
  // host is known. Turn 18 cached the empty result here and the session was
  // stuck with grey ironmongery for as long as it lasted.
  //
  // `isMockMode` is no longer part of the gate, and that is the same fact
  // stated once: mock mode means there is no DATABASE — no projects, no auth,
  // no keys. The manifest is a PUBLIC file in a PUBLIC bucket, fetched with
  // the platform's own `fetch` and no client, exactly as the decor pack's
  // full-board scans already are in mock mode. Refusing to read it because the
  // database is absent was two unrelated facts wearing one flag.
  if (!base) return Promise.resolve({ files: [], error: null, mock: true });

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
