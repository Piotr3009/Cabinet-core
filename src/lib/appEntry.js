// ─── ONE CODEBASE, TWO ENTRIES (turn 45, CLAUDE.md F2) ──────────────────────
//
// The owner, 23.08.2026, on the header switch T44 shipped:
//
//   *"The Factory/Retail toggle: REMOVED. One codebase, TWO entries: the
//   workshop app hardwires `factory`; a separate route `/client` (the future
//   retail site mounts it) hardwires `retail`. The audience tree from T44 stays
//   as the single filter."*
//
// A toggle in the header was a decision nobody had made and everybody could
// make by accident: a joiner who nudged it lost half the workshop's fields and
// had no idea why, and a laptop turned round to a client was one stray click
// from showing him the CNC corner. The head that is reading is not a preference
// — it is WHICH DOOR THE APP WAS OPENED THROUGH — so it is decided by the URL
// once, at boot, and nothing in the running app can move it.
//
// What did NOT change is the filter. `lib/wizardTabs.js` is still the one tree
// and the one `nodeVisible()`; this file only answers which head is asking.
// That is the whole of iron rule 5's "one tree, one filter — never two parallel
// wizards", and it is why there is no second component, no `<RetailWizard/>`
// and no second route table anywhere in this repository.
//
// Pure. No React, no store, no engine — it reads a string and returns a word.

import { normaliseAudience } from './wizardTabs.js';

/** The retail door. The future retail site mounts the app here. */
export const RETAIL_ROUTE = '/client';

/** …and the workshop's, which is everything that is not the retail door. */
export const FACTORY_ROUTE = '/';

/**
 * Which head this entry is for.
 *
 * `/client`, `/client/`, `/client/anything` — retail. Everything else, the
 * workshop. The prefix rather than an exact match, because the retail site will
 * grow pages under it and every one of them is still the client's door.
 *
 * A BASE PATH (a build served from `/app/`) is handled by the caller, which
 * hands in a pathname already stripped of it — `entryAudience()` below does
 * that with vite's own `BASE_URL`, and this function stays a pure string rule
 * so a node test can ask it without a browser.
 *
 * @param {string} pathname
 * @returns {'factory'|'retail'}
 */
export function audienceForPath(pathname) {
  const path = String(pathname || '/');
  if (path === RETAIL_ROUTE || path.startsWith(`${RETAIL_ROUTE}/`)) return 'retail';
  return 'factory';
}

/** Is this the retail door? */
export function isRetailRoute(pathname) {
  return audienceForPath(pathname) === 'retail';
}

/** The build's own base, with the leading and trailing slash a route needs. */
function basePath() {
  try {
    const base = import.meta.env?.BASE_URL;
    if (typeof base === 'string' && base.startsWith('/')) {
      return base.endsWith('/') ? base.slice(0, -1) : base;
    }
  } catch { /* not a vite build (node, a test) */ }
  return '';
}

/**
 * The head THIS app was opened as — read once, at boot, from the location.
 *
 * Outside a browser (a node test, a build step) there is no location and the
 * honest answer is the workshop's: the app that has no door is the one the
 * workshop runs.
 */
export function entryAudience(location = (typeof window === 'undefined' ? null : window.location)) {
  if (!location) return normaliseAudience(null);
  const base = basePath();
  const raw = String(location.pathname || '/');
  const path = base && raw.startsWith(base) ? (raw.slice(base.length) || '/') : raw;
  return audienceForPath(path);
}
