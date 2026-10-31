/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T-CC1a F9 · NOTHING IS LOST IN A CRASH (CLAUDE.md T-CC1a law 7) ─────────
//
// The owner, 30.10.2026: *"moje zdanie to powinno sie wszystko zapisywac na
// pamiec podreczna, dopiero caly json powinien sie zapisac do DB przy
// nacisnieciu Zapisz lub co 5 minut automatycznie"*. A change is memory; the
// browser keeps the open item as a CRASH BUFFER, one key per tenant and item:
//
//   cc.<tenantId>.item.<itemId>.buffer.v1   { savedAt, dirty, at, design }
//
// (PROPOSED key). The store writes it (projectStore.js flushCrashBuffer, at
// most once per 250 ms and once more by markSaved with dirty false); on boot
// the start screen OFFERS every dirty buffer of the tenant whose `at` is newer
// than its row's `updated_at` ("Restore unsaved changes to <item>?"), never
// applies one in silence, never drops one in silence. A buffer of another
// tenant is never shown and is cleared (CC-1 R6). A design over
// profile.save.bufferMaxMb is not buffered, and the words say so. Pure: the
// storage is handed in.

import { byteSize, SAVE_DEFAULTS } from './saveNumbers.js';

const PREFIX = 'cc.';
const KEY_RE = /^cc\.(.+?)\.item\.(.+)\.buffer\.v1$/;

/** The key of one item's buffer (PROPOSED, CLAUDE.md T-CC1a F9.1). */
export const bufferKey = (tenantId, itemId) => `cc.${tenantId}.item.${itemId}.buffer.v1`;

/** { tenantId, itemId } of a buffer key, or null for any other key. */
export function parseBufferKey(key) {
  const m = KEY_RE.exec(String(key || ''));
  return m ? { tenantId: m[1], itemId: m[2] } : null;
}

/** The words of an item too big to buffer (PROPOSED). */
export const bufferOffWords = (mb = SAVE_DEFAULTS.bufferMaxMb) => `Crash buffer off: the item is over ${mb} MB`;

/** The browser's refusal in a joiner's words (lib/projectLibrary.js storageRefusal is the model). */
export function refusalWords(err) {
  const name = String(err?.name || '');
  if (/quota/i.test(name) || /quota/i.test(String(err?.message || ''))) {
    return 'Crash buffer off: this computer\'s storage for the app is full';
  }
  return `Crash buffer off: this computer's storage refused it (${String(err?.message || name || 'no reason given')})`;
}

/**
 * Write one buffer. Resolves `{ ok, error }`: a design over `maxMb` is not written (error: bufferOffWords), a
 * browser refusal is returned in words, never swallowed.
 */
export function writeBuffer(storage, key, { savedAt = null, dirty = false, at = Date.now(), design = null } = {}, { maxMb = SAVE_DEFAULTS.bufferMaxMb } = {}) {
  if (!storage) return { ok: false, error: refusalWords(new Error('no storage')) };
  const text = JSON.stringify({ savedAt, dirty: Boolean(dirty), at, design });
  if (byteSize(text) > Number(maxMb) * 1024 * 1024) return { ok: false, error: bufferOffWords(maxMb) };
  try {
    storage.setItem(key, text);
  } catch (err) {
    return { ok: false, error: refusalWords(err) };
  }
  return { ok: true, error: null };
}

/** One buffer read back, or null (absent or unreadable). */
export function readBuffer(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}

/** Remove one buffer. */
export function clearBuffer(storage, key) {
  try { storage?.removeItem(key); } catch { /* nothing to keep */ }
}

/** Every key the storage holds (a browser's localStorage, or a test's fake with key()/length). */
function keysOf(storage) {
  if (!storage) return [];
  if (typeof storage.length === 'number' && typeof storage.key === 'function') {
    const out = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (typeof k === 'string') out.push(k);
    }
    return out;
  }
  return Object.keys(storage).filter((k) => k.startsWith(PREFIX));
}

/** Every buffer of a tenant: [{ key, itemId, savedAt, dirty, at, design }]. */
export function listBuffers(storage, tenantId) {
  if (!tenantId) return [];
  return keysOf(storage)
    .map((key) => ({ key, parsed: parseBufferKey(key) }))
    .filter(({ parsed }) => parsed && parsed.tenantId === String(tenantId))
    .map(({ key, parsed }) => ({ key, itemId: parsed.itemId, ...(readBuffer(storage, key) || {}) }))
    .filter((b) => b.design !== undefined);
}

/** Clear the buffers of every tenant but this one (the session names the tenant). Returns the keys removed. */
export function clearOtherTenants(storage, tenantId) {
  const gone = keysOf(storage).filter((key) => {
    const p = parseBufferKey(key);
    return p && p.tenantId !== String(tenantId);
  });
  for (const key of gone) clearBuffer(storage, key);
  return gone;
}

const timeOf = (v) => {
  const t = typeof v === 'number' ? v : Date.parse(v || '');
  return Number.isFinite(t) ? t : 0;
};

/**
 * The boot question's list (CLAUDE.md T-CC1a F9.2): after the list loads, every buffer of the tenant with
 * `dirty: true` whose `at` is newer than its item row's `updated_at`. An item no longer in the list (archived
 * or gone) is offered with `exists: false` (Save as new item). Another tenant's buffers are cleared first.
 * Returns [{ key, itemId, name, at, design, item, exists }], newest first.
 */
export function bootOffers({ storage, tenantId, items = [] }) {
  if (!tenantId) return [];
  clearOtherTenants(storage, tenantId);
  const byId = new Map((items || []).map((it) => [it.id, it]));
  return listBuffers(storage, tenantId)
    .filter((b) => b.dirty === true && b.design && typeof b.design === 'object')
    .map((b) => {
      const item = byId.get(b.itemId) || null;
      const live = Boolean(item && !item.archived_at);
      return {
        key: b.key, itemId: b.itemId, at: b.at, design: b.design, item, exists: live,
        name: item?.name || b.design?.project?.name || 'Untitled item',
      };
    })
    .filter((o) => !o.exists || timeOf(o.at) > timeOf(o.item?.updated_at))
    .sort((a, b) => timeOf(b.at) - timeOf(a.at));
}

/** The boot question's sentence (PROPOSED words). */
export function offerQuestion(offer, { at = offer?.at } = {}) {
  const d = new Date(timeOf(at));
  const when = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `Restore unsaved changes to ${offer?.name || 'this item'} (${when})?`;
}

/** What the status says after a Restore (PROPOSED words). */
export const RESTORED_WORDS = 'Not saved yet: press Ctrl+S';
