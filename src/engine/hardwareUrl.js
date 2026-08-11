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
