/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T79 · the owner's eye-test of 19.10.2026 (09:16, answers 09:59), named here so the strict run says why.
// *"komunikaty: ma sie chowac po kilku sekundach i byc przezroczysty"*; asked "wszystkie chowaja sie po 4 s, czerwone
// po 8 s, historia zostaje, tlo przezroczyste 70 procent?": *"tak pls, mowimy o komunikatach po lewej"*. Two engine
// files, the message clock and its numbers; no gate, no golden: a message is never a cut, so no computeCabinet() can
// reach either and every golden holds byte for byte. (Delete in the editor window and the CUT EDGE squares of the same
// package live in src/components, src/3d and the uiStore: outside this contract.)

export const LICENSED = {
  'src/engine/messages.js': {
    why: 'Owner 19.10.2026 ("wszystkie chowaja sie po 4 s, czerwone po 8 s, historia zostaje": "tak pls"): hideMs(profile, '
      + 'level) replaces greyMs; every level gets expiresAt = at + hideMs (grey and yellow 4000, red 8000), the red\'s '
      + 'click and the yellow\'s click-away stay as the quicker way out, `expired` sweeps every level, the Changes row '
      + 'stays. Nothing cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'Owner 19.10.2026 ("tak pls"): ui.messages.hideMs { grey: 4000, yellow: 4000, red: 8000 } replaces greyMs 3000 '
      + '(15.08.2026); maxOnScreen and historyMax untouched. A UI number, nothing cut',
    gates: [],
  },
};
