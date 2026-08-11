// ─── WHERE A DOWNLOADED MODEL ACTUALLY IS (turn 20, CLAUDE.md F2.3) ─────────
//
// One rule, for every hardware family the workshop keeps in the bucket:
//
//   THE MODELS LIVE BESIDE THEIR MANIFEST.
//
// That is the fact turn 18 and turn 19 both got wrong, in two different ways
// and for the same reason — they trusted the `file` string in the owner's
// manifest to be a path. It is not. The runner manifest says
// `hardware/blum/movento/760H2500S_44182964.glb` and the hinge manifest says
// `hardware/hinges/blum/cliptop/71B3550_42542984.glb`, and NEITHER of those
// folders exists in the bucket. What does exist is a folder per family with the
// manifest and its models side by side, which is how anybody uploads a pack.
//
// So the URL is built from three things the app is sure of — the bucket, the
// family's folder (one line of profile.js each), and the LAST SEGMENT of
// whatever the row called the file — and from nothing the manifest guessed at.
// A pack the owner moves is one profile line; a manifest he re-exports with
// yet another path prefix changes nothing at all.
//
// Pure functions — no React, no fetch, no store (engine rule).

/**
 * The basename of whatever a manifest row called a file.
 *
 * Splits on both separators: the owner's files are written on Windows as often
 * as not, and a backslash in a manifest is not a filename character.
 *
 * @param {string} file
 * @returns {string} '' where there is nothing usable
 */
export function modelBasename(file) {
  return String(file || '').split(/[\\/]/).pop().trim();
}

/**
 * A model URL, or the bucket-relative path where no storage host is known.
 *
 * A missing `storageBase` is the honest answer in mock mode and in a node test:
 * the path is still true, it simply has no host in front of it, and the loader
 * treats a path with no host as "no bucket" and draws the stand-in.
 *
 * @param {object} args
 *   file         the manifest row's own string
 *   bucket       the storage bucket name
 *   path         the family's folder INSIDE the bucket, trailing slash
 *   storageBase  `…/storage/v1/object/public`, or ''
 * @returns {string|null}
 */
export function hardwareModelUrl({
  file, bucket, path, storageBase = '',
}) {
  const name = modelBasename(file);
  if (!name) return null;
  const withinBucket = `${String(path || '')}${name}`;
  if (!storageBase) return withinBucket;
  return `${String(storageBase).replace(/\/+$/, '')}/${bucket}/${withinBucket}`;
}

// ─── TURN 21 (CLAUDE.md F2): A PATH WITH NO HOST IS NOT A URL ───────────────
//
// The owner's console, the whole of the diagnosis in one line:
//
//     /hinges/blum/71B3550_42542984.glb  →  404
//
// No Supabase host, no `hardware` bucket — the app asked its OWN domain for the
// file. `hardwareModelUrl` above returns the bucket-relative PATH when it has
// no host, which is a true answer to "where is this inside the bucket" and a
// catastrophic one to give a loader: the browser resolves it against the page
// and fetches a 404 from the app itself.
//
// The runners never hit it because their catalogue is bucket-gated — no host,
// no manifest, no entry, no url. The HINGE catalogue ships in the repository
// (`reference/hardware/cliptop-hinges.json`), so it always has a `file`, and
// turn 19 and turn 20 both handed the bare path straight to the GLTFLoader.
//
// So the two questions are separated, and it is the SECOND one every fetching
// caller asks: a model SOURCE is a URL or it is nothing. Where there is no
// host there is no source, and the caller draws the stand-in it has drawn since
// turn 7 — the iron rule, and no request leaves the page.

/**
 * A fetchable model URL — host, bucket, family folder and basename — or null.
 *
 * ONE helper for every hardware family, so a third copy is impossible (F2.1):
 * `engine/hinges.js → hingeModelSrc` and `engine/runners.js → runnerModelSrc`
 * are each one line over this, and the view fetches nothing else.
 *
 * @returns {string|null} null where there is no host, no bucket or no file
 */
export function hardwareModelSrc({
  file, bucket, path, storageBase = '',
}) {
  if (!String(storageBase || '').trim()) return null;
  if (!String(bucket || '').trim()) return null;
  return hardwareModelUrl({
    file, bucket, path, storageBase,
  });
}

/**
 * The public storage root of an absolute Supabase Storage URL — everything up
 * to and including `/object/public`.
 *
 * Why the app needs this at all: the host is configuration
 * (`VITE_SUPABASE_URL`), and a build made without it had no host to put in
 * front of a hinge — which is precisely the 404 above. The app ALREADY carries
 * absolute URLs into the same bucket, in the decor pack it fetches on start
 * (`public/decors/egger/egger-decors.json` → `tex`), so where configuration is
 * silent the app can still say where its own storage is. Derived, never typed.
 *
 * `scripts/bucket-live.mjs` derives the host for R2 the same way; it calls THIS
 * function now, so the walk and the app cannot disagree about where the bucket
 * is (rule R4).
 *
 * @returns {string} '' where the string is not an absolute storage URL
 */
export function storageBaseFrom(url) {
  const text = String(url || '');
  if (!/^https?:\/\//i.test(text)) return '';
  const marker = '/object/public';
  const at = text.indexOf(marker);
  if (at < 0) return '';
  return text.slice(0, at + marker.length);
}
