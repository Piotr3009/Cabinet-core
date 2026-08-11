// ─── WHERE THIS APP'S OWN STORAGE IS (turn 21, CLAUDE.md F2) ────────────────
//
// The owner's console, and the whole of F2's diagnosis:
//
//     /hinges/blum/71B3550_42542984.glb  →  404
//
// No host and no bucket, so the app asked its own domain. The URL composition
// was right; what it had nothing to compose WITH was a host, because the build
// was made without `VITE_SUPABASE_URL` — and a hinge, unlike a runner, always
// has a file to ask for (its catalogue ships in the repository), so the missing
// host went straight out as a request.
//
// Two answers, and this file is the second one:
//
//   1. A path with no host is not a URL. `engine/hardwareUrl.js →
//      hardwareModelSrc` returns null instead, and the view draws the stand-in
//      it has drawn since turn 7. No request leaves the page.
//
//   2. THE HOST COMES BACK. Configuration is the first place to look and the
//      app should not be helpless when it is silent, because it is already
//      carrying absolute URLs into that very bucket: the EGGER decor pack it
//      fetches on start names its full-board scans as
//      `https://….supabase.co/storage/v1/object/public/decors/egger/…`. So the
//      host is DERIVED from the app's own registry rather than typed anywhere,
//      which is exactly how `scripts/bucket-live.mjs` has derived it for R2
//      since turn 20 — and that script calls the same engine function now, so
//      the walk and the app cannot disagree about where the bucket is (R4).
//
// A change of answer is an EVENT: the decor pack lands after the scene has
// mounted, so a view that asked once and got '' has to be told. `onStorageBase`
// is that telling, and `useStorageBase` is the hook the two canvases use.

import { useEffect, useState } from 'react';

import { storageBaseFrom } from '../engine/hardwareUrl.js';
import { getDecorCatalogue } from '../engine/decors.js';

/** What the build was configured with, or ''. */
export function configuredStorageBase() {
  try {
    const url = import.meta.env?.VITE_SUPABASE_URL;
    if (typeof url === 'string' && url) return `${url.replace(/\/+$/, '')}/storage/v1/object/public`;
  } catch { /* not a vite build (node, a test) */ }
  return '';
}

/**
 * The host the decor pack is being served from, or ''.
 *
 * The pack's rows carry `tex` (the swatch, which may be a local path) and
 * `scan` (the full board, which is in Storage). Either one that is absolute
 * answers the question; the first that does wins.
 */
export function derivedStorageBase(catalogue = getDecorCatalogue()) {
  for (const decor of catalogue?.decors || []) {
    for (const value of [decor?.scan, decor?.tex, decor?.thumb, decor?.url]) {
      const base = storageBaseFrom(value);
      if (base) return base;
    }
  }
  return '';
}

const listeners = new Set();
let known = null;

/**
 * The public storage root, or '' where this app has no way to know one.
 *
 * '' is a complete answer and a supported one: mock mode, a node test, a build
 * with no configuration and no decor pack. The models are not drawn; the
 * workshop's own profile draws the stand-in and the BOM orders by spec.
 */
export function storageBaseUrl() {
  if (known != null) return known;
  const base = configuredStorageBase() || derivedStorageBase();
  // Only REMEMBER a real answer. '' before the decor pack lands is "not yet",
  // not "never", and caching it would be the 404 all over again in reverse.
  if (base) known = base;
  return base;
}

/**
 * Tell the views the host is known now.
 *
 * Called by the decor loader once the pack is parsed. Idempotent and quiet
 * where nothing changed, so a second load costs no re-render.
 */
export function noteStorageBase() {
  const before = known;
  const base = configuredStorageBase() || derivedStorageBase();
  if (base) known = base;
  if (known && known !== before) for (const cb of [...listeners]) cb(known);
  return known || '';
}

/** Subscribe to "the host is known now". Returns the unsubscribe. */
export function onStorageBase(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** For tests, and for a workshop switching bucket. */
export function clearStorageBase() {
  known = null;
  listeners.clear();
}

/**
 * The host, as a React value that arrives when it arrives.
 *
 * The canvases used `useMemo(() => storageBaseUrl(), [])` — asked once, at
 * mount, which on a build with no configuration is before the decor pack has
 * landed and therefore forever ''. This re-renders them when it is known.
 */
export function useStorageBase() {
  const [base, setBase] = useState(() => storageBaseUrl());
  useEffect(() => {
    if (base) return undefined;
    // It may have landed between the first render and this effect.
    const now = storageBaseUrl();
    if (now) { setBase(now); return undefined; }
    return onStorageBase((next) => setBase(next));
  }, [base]);
  return base;
}
