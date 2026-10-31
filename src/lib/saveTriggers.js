/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T-CC1a F8 · FOUR TRIGGERS, ONE SAVE (CLAUDE.md T-CC1a law 6) ────────────
//
// The owner, 30.10.2026: *"moje zdanie to powinno sie wszystko zapisywac na
// pamiec podreczna, dopiero caly json powinien sie zapisac do DB przy
// nacisnieciu Zapisz lub co 5 minut automatycznie"*.
//
// The four doors to the one save (lib/persist.js persistProject):
//   Ctrl+S / Cmd+S        handleSaveKey, called by the page's key handler
//                         beside Ctrl+Z (pages/ConfiguratorPage.jsx);
//   the autosave          every profile.save.autosaveMinutes, only when the
//                         item is dirty and no save is in flight;
//   leaving the page      pagehide and visibilitychange to hidden: the crash
//                         buffer flushed synchronously, then, when dirty and
//                         the body is under profile.save.keepaliveMaxKb, ONE
//                         keepalive fetch to Joinery Core's /api/rpc (JC's
//                         apiFetch has no keepalive, so this one road is
//                         written here, once); a bigger body relies on the
//                         boot question (F9);
//   before an export      makeSaveFirst: the six export callbacks run after
//                         the save settles when the item is dirty; a failed
//                         save does not stop a local export, it says so.
// Pure of React and of the stores: everything is handed in, so the test drives
// it with fake timers, a fake window and a fake fetch.

import { byteSize, SAVE_DEFAULTS } from './saveNumbers.js';

/** Joinery Core's rpc endpoint (CLAUDE.md T-CC1a, WHAT THE OTHER SIDE GIVES). */
export const RPC_ENDPOINT = '/api/rpc';

/** The rpc the keepalive carries: the same one save as F7. */
export const SAVE_RPC = 'cc_save_item';

/** Is this key press Ctrl+S or Cmd+S (no Alt, no Shift)? */
export function isSaveKey(e) {
  return Boolean(e && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && String(e.key || '').toLowerCase() === 's');
}

/**
 * Ctrl+S / Cmd+S: the browser's own "save page" is prevented and the one save runs when an item is open.
 * Answers whether the key was taken.
 */
export function handleSaveKey(e, { save, hasItem }) {
  if (!isSaveKey(e)) return false;
  if (typeof e.preventDefault === 'function') e.preventDefault();
  if (hasItem()) save();
  return true;
}

/** The token JC's script keeps (`localStorage.authToken`), or ''. */
function jcToken() {
  try { return globalThis.localStorage?.getItem('authToken') || ''; } catch { return ''; }
}

/**
 * The keepalive save on leaving: ONE POST to /api/rpc carrying `{ name: 'cc_save_item', params }` (the JC rpc
 * body, PROPOSED as the fake JC reads it), only when the body is within `maxKb`. Answers 'sent', 'too-large',
 * 'clean' or 'no-fetch'.
 */
export function keepaliveSave({ payload, isDirty, hasItem, maxKb = SAVE_DEFAULTS.keepaliveMaxKb, fetchFn = globalThis.fetch, token = jcToken }) {
  if (!hasItem() || !isDirty()) return { sent: false, why: 'clean' };
  const params = payload();
  if (!params) return { sent: false, why: 'clean' };
  const body = JSON.stringify({ name: SAVE_RPC, params });
  if (byteSize(body) > Number(maxKb) * 1024) return { sent: false, why: 'too-large', body };
  if (typeof fetchFn !== 'function') return { sent: false, why: 'no-fetch', body };
  try {
    fetchFn(RPC_ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { Authorization: `Bearer ${typeof token === 'function' ? token() : token}`, 'Content-Type': 'application/json' },
      body,
    });
  } catch { /* the page is going; the crash buffer holds the work */ }
  return { sent: true, why: 'sent', body };
}

/**
 * Install the autosave timer and the leaving roads. `save` resolves when the one save settles; `buffer.flush()`
 * writes the crash buffer synchronously; `payload()` is the one request's parameters (lib/persist.js itemPayload).
 * Returns uninstall().
 */
export function installSaveTriggers({
  save, isDirty, hasItem, buffer = null, now = Date.now, payload = null, numbers = SAVE_DEFAULTS,
  win = globalThis.window, doc = globalThis.document, fetchFn = undefined, token = undefined,
  setIntervalFn = globalThis.setInterval, clearIntervalFn = globalThis.clearInterval,
}) {
  let inFlight = false;
  let lastSentBody = null;
  const state = { autosaves: 0, lastTickAt: null };

  const tick = () => {
    state.lastTickAt = now();
    if (inFlight || !hasItem() || !isDirty()) return;
    inFlight = true;
    state.autosaves += 1;
    Promise.resolve()
      .then(() => save({ autosave: true }))
      .catch(() => { /* the save says its own words */ })
      .finally(() => { inFlight = false; });
  };
  const minutes = Number(numbers?.autosaveMinutes) || SAVE_DEFAULTS.autosaveMinutes;
  const timer = setIntervalFn(tick, minutes * 60 * 1000);

  const leave = () => {
    try { buffer?.flush?.(); } catch { /* the buffer says its own words */ }
    if (typeof payload !== 'function') return;
    const base = fetchFn === undefined ? globalThis.fetch : fetchFn;
    const r = keepaliveSave({
      payload, isDirty, hasItem, maxKb: numbers?.keepaliveMaxKb ?? SAVE_DEFAULTS.keepaliveMaxKb,
      fetchFn: lastSentBody ? onceAfter(base, lastSentBody) : base,
      ...(token === undefined ? {} : { token }),
    });
    if (r.sent) lastSentBody = r.body;
  };
  const onHidden = () => { if (doc?.visibilityState === 'hidden') leave(); };
  win?.addEventListener?.('pagehide', leave);
  doc?.addEventListener?.('visibilitychange', onHidden);

  const uninstall = () => {
    clearIntervalFn(timer);
    win?.removeEventListener?.('pagehide', leave);
    doc?.removeEventListener?.('visibilitychange', onHidden);
  };
  uninstall.tick = tick;
  uninstall.leave = leave;
  uninstall.state = state;
  return uninstall;
}

// The same body twice in a row (visibilitychange to hidden, then pagehide) is sent once.
function onceAfter(fetchFn, lastBody) {
  return (url, init) => (init?.body === lastBody ? undefined : fetchFn(url, init));
}

/**
 * The save before an export: `saveFirst(rerun)` answers false when the export may run now (the item is clean, or
 * this IS the re-run); otherwise it starts the one save, answers true (the callback returns), and runs `rerun` once
 * the save has settled. A failed save does not stop the export (CNC, DXF, PDF are local): it says so.
 */
export function makeSaveFirst({ isDirty, hasItem, save, notify = () => {} }) {
  let passing = false;
  return function saveFirst(rerun) {
    if (passing || !hasItem() || !isDirty()) return false;
    let started;
    try { started = Promise.resolve(save()); } catch (err) { started = Promise.reject(err); }
    started
      .then((r) => {
        if (r && r.stored === false) notify(`${r.message} The export goes ahead from this browser.`, 'warn');
      }, () => notify('The save before the export failed. The export goes ahead from this browser.', 'warn'))
      .then(() => {
        passing = true;
        try { return rerun(); } finally { passing = false; }
      });
    return true;
  };
}
