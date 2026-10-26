/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F3 . THE MIRROR CABINET IN THE ROOM (slice M2). CLAUDE.md T83 F3: *"`3d/MirrorCabinet.jsx` (new, M2) through the
// one mount point in `UnitView.jsx` ... The back's click: `openModal('mirror-back', ...)` asks "Mirror on the back?"
// (Yes / No, the store's `setMirrorBack`)"*. The room is src/3d (not asked here) and the store is src/stores (not
// asked here); the one file of src/engine or src/lib this F touches is the modal registry's row. No cut moves: no
// golden is reached, no gate is opened. Draft for INT: drop into scripts/t78-classify.d/ as f44-t83-f03.mjs.

const OWNER = 'The owner, 25.10.2026 (14:09): *"czasami jak ktos chce to bedzie mial na plecach tez, klikasz na plecy i '
  + 'wyskakuje ci opcja chcesz lustro na plecach?"*.';

export const LICENSED = {
  'src/lib/modalLayer.js': {
    why: `T83 F3 . one registry row, 'mirror-back': the MIRROR ON THE BACK question is an OBJECT window held to an anchor, `
      + `opened at the click on a mirror cabinet's back (3d/mirrorCabinetRoom.js askMirrorBack). A registry, not a cut. ${OWNER}`,
    gates: [],
  },
};

export const REPINNED = [];
