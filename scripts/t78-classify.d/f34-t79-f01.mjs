/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F1 · MESSAGES GO TO THE LEFT, AND KEEP A HISTORY. The owner, 18.10.2026: *"wszystkie informacje po zmianach
// które pokazujesz na ekranie proszę zrób po lewej, niech one tam znikają, można na dole po lewej zrobić jakby listę
// rozwijaną i tam historia zmian; powód: teraz wszystkie informacje pokazują się na środku i zasłaniają nam widok
// pracy."*  NO GATES, and why: engine/messages.js is pure message arithmetic that no part of computeCabinet imports
// (only stores/uiStore.js, components/Messages.jsx and App.jsx read it), and the one new profile key,
// ui.messages.historyMax, is read by messages.js `historyMax` alone. Neither can reach a cut, a drill, a BOM line or
// a drawing, so no golden can open them and every golden is byte for byte what it was.

export const LICENSED = {
  'src/engine/messages.js': {
    why: 'T79 F1: LEVELS place \'left\' for red, yellow and grey (one bottom-left column); the Changes list helpers '
      + '(historyMax, historyRow, recordHistory: newest first, a fold updated in place, the oldest past the number '
      + 'dropped; historyTime HH:MM). Not on computeCabinet\'s import graph: it cannot reach a cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'T79 F1: ui.messages.historyMax 50 (T79 proposed, owner to confirm), read only by messages.js historyMax; '
      + 'no cut reads it',
    gates: [],
  },
};
