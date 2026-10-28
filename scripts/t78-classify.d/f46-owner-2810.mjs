/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T84 . the owner's chat fix of 28.10.2026, named here so the strict run says why. *"ok robie merge a ty prosze
// napraw ten fail"*: main's CI had been red since the setup workspace of 26.10 (commit 4f3e33c, the owner: *"zakoduj mi
// prosze te zmiany"*), fifteen older tests in nine files. Thirteen read source the setup workspace reshaped on purpose
// and are amended in place; two were real. One of those two lives in src/lib: the window registry never learnt the
// name the setup workspace's island planner gives. The other is the retail wall copy's palette, outside this table.
// No gate, no golden: a registry row, nothing cut, and a bare computeCabinet() reaches none of it.

export const GATES = {};

export const LICENSED = {
  'src/lib/modalLayer.js': {
    why: 'Chat fix 28.10.2026 ("ok robie merge a ty prosze napraw ten fail"): MODAL_KINDS gains the row the setup '
      + 'workspace of 26.10 left out, \'island-plan\' { about: \'project\', label: \'Plan island\' }. RoomModal.jsx draws '
      + 'that window inside the setup workspace only (embedded, both apps), centred as every workspace and never opened '
      + 'through openModal, so no anchor is asked of it and nothing changes at run time. A registry row, nothing cut',
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
