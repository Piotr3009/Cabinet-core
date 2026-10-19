/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 (KIT_SITE_TRIM.lsp): THE NOMINAL A TEST ASKS FOR ────
//
// The owner, 19.10.2026: *"side panele powinny byc wieksze o 20 mm, to samo z
// plinth, panele 20mm gora + dol + bok (nie przod, 0 to zawsze powinno byc
// ok)"*. An END panel and a PLINTH are CUT `siteTrim` bigger on the edges a
// joiner scribes on site (`engine/siteTrim.js`), so `panel.w / h` is the cut
// and the board the room draws is `meta.oversize.nominal`. A test written
// before tonight about the ROOM's board (how deep an end panel reaches, how
// tall a plinth stands) reads the nominal through these; a test about the
// CUT reads `panel.w / h` as it did. Nothing here is a number.

import { siteTrimMm, sceneBoard } from '../src/engine/siteTrim.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';

/** The nominal size of a panel: the record's own where nothing grew. */
export function nominal(panel) {
  const n = panel?.meta?.oversize?.nominal;
  return n && typeof n === 'object' ? { w: n.w, h: n.h } : { w: panel?.w, h: panel?.h };
}

/** The nominal outline (the cut's where nothing grew). */
export function nominalOutline(panel) {
  const n = panel?.meta?.oversize?.nominal;
  return n && typeof n === 'object' && n.cnc ? n.cnc.outline : panel?.cnc?.outline;
}

/** The panel as the NOMINAL board (the record the room draws): w, h, area, edging, outline, notch, marks. */
export function asNominal(panel) {
  return sceneBoard(panel);
}

/** The profile's allowance for this panel's part. */
export function trimOf(panel, profile = P) {
  return siteTrimMm(profile, panel?.part);
}

/** A profile with the allowance switched off: every board cut as before tonight. */
export function withoutSiteTrim(profile = P) {
  return {
    ...profile,
    autoParts: {
      ...profile.autoParts,
      endPanel: { ...profile.autoParts.endPanel, siteTrim: 0 },
      plinth: { ...profile.autoParts.plinth, siteTrim: 0 },
    },
  };
}
