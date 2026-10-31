/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T-CC1a F1 · ONE CLIENT, AND IT IS JOINERY CORE'S (CLAUDE.md T-CC1a law 2) ──
//
// The owner, 30.10.2026: *"oczywiscie do CC laczysz sie tylko przez JC"*.
//
// Cabinet Core creates NO database client of its own and holds no key. Joinery
// Core's classic script (`/js/api-client.js`, loaded by index.html before the
// module script) puts three globals on the window: `apiFetch`, `rpc` and
// `supabaseClient`, a look-alike whose `from(table).select(...)` goes to JC's
// `/api/db/query`. Two clients refreshing one rotating token sign the user out,
// so this file only READS those globals; it never makes one.
//
// `withDb` keeps the contract every call site has used since turn 3: `{ data,
// error, mock }`, never a throw. `mock: true` now means one thing only: Joinery
// Core did not answer (no script, no client), and where the user sees it the
// words are JC_OFFLINE.

/** The words a user reads when Joinery Core is not there (PROPOSED, CLAUDE.md T-CC1a F1). */
export const JC_OFFLINE = 'Joinery Core did not answer. Your work is kept in this browser until it does.';

/** JC's client off the window, or null. */
export function jcClient() {
  const c = typeof globalThis !== 'undefined' ? globalThis.supabaseClient : null;
  return c && typeof c === 'object' ? c : null;
}

/** JC's `apiFetch`, or the offline answer in words. Never throws. */
export async function jcFetch(endpoint, options = {}) {
  const f = typeof globalThis !== 'undefined' ? globalThis.apiFetch : null;
  if (typeof f !== 'function') return { data: null, error: { message: JC_OFFLINE } };
  try {
    const res = await f(endpoint, options);
    return res && typeof res === 'object' ? res : { data: res ?? null, error: null };
  } catch (err) {
    return { data: null, error: { message: err?.message || JC_OFFLINE } };
  }
}

/** Whether this browser holds a Joinery Core token (JC's own key, `authToken`). */
export function hasToken() {
  try {
    const t = globalThis.localStorage?.getItem('authToken');
    return typeof t === 'string' && t.length > 0;
  } catch {
    return false;
  }
}

/** No client or no token: nothing can be asked of Joinery Core. */
export function isJcOffline() {
  return !jcClient() || !hasToken();
}

/**
 * Run a call through JC's client, degrading to the mock value.
 * Never throws: callers get `{ data, error, mock }`.
 */
export async function withDb(fn, mockValue = null) {
  const client = jcClient();
  if (!client) return { data: mockValue, error: null, mock: true };
  try {
    const result = await fn(client);
    if (result?.error) return { data: mockValue, error: result.error, mock: false };
    return { data: result?.data ?? result, error: null, mock: false };
  } catch (err) {
    // A dead network or a table JC does not serve must not take the
    // configurator down: the caller falls back to local state.
    return { data: mockValue, error: err, mock: false };
  }
}
