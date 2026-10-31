/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1a F7 to F9 . THE SAVE'S NUMBERS (CLAUDE.md T-CC1a, THE NUMBERS)
//
// The owner, 30.10.2026: *"dopiero caly json powinien sie zapisac do DB przy
// nacisnieciu Zapisz lub co 5 minut automatycznie"*. The four numbers of the
// save live in the profile under `profile.save`; this turn touches no engine
// file, so the defaults stand here and a profile that carries its own `save`
// block wins key by key. Pure: the caller hands in getCabinetProfile().

/** The defaults: autosave 5 min (CONFIRMED), keepalive 64 KiB, body 3.5 MB, crash buffer 1 MB (PROPOSED). */
export const SAVE_DEFAULTS = Object.freeze({
  autosaveMinutes: 5,
  keepaliveMaxKb: 64,
  maxBodyMb: 3.5,
  bufferMaxMb: 1,
});

/** The save's numbers for a profile: the defaults, then the profile's own `save` block over them. */
export function saveNumbers(profile) {
  const own = profile && typeof profile.save === 'object' && profile.save ? profile.save : {};
  return { ...SAVE_DEFAULTS, ...own };
}

/** The UTF-8 size of a string in bytes (what a request body or a stored value weighs). */
export function byteSize(text) {
  const s = String(text ?? '');
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
  return s.length;
}
