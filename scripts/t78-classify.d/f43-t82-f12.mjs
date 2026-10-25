/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F12 (slice B3) · THE SERVICE VOID, A NOTE AND A HATCH. The owner, 25.10.2026 (12:57): *"nastepnie to bedzie
// miejsce z tylu na rurki minimum potrzebujemy okolo 80 mm do 100 mm"*; (13:03) *"3 - 80"*. engine/checks.js: Check
// #45 (CLAUDE.md's #40, BRIEF 6) at the new level 'note'; engine/drawings/setSection.js: the void band hatched and
// named, and hatchLines. E3 commits the SERVICE_VOID layer (F12-B3-to-E3-layers.diff) and the base plan's hatch
// (F12-B3-to-E3-setPlan.diff) under this F. None of it is read by computeCabinet.
// Draft for INT: drop into scripts/t78-classify.d/ as f43-t82-f12.mjs; keep the E3 rows once E3's commit lands.

const OWNER = 'The owner, 25.10.2026 (12:57): *"nastepnie to bedzie miejsce z tylu na rurki minimum potrzebujemy '
  + 'okolo 80 mm do 100 mm"*; (13:03) *"3 - 80"*.';

export const GATES = {};

export const LICENSED = {
  'src/engine/checks.js': {
    why: 'T82 F12: Check #45 "Service void 80 behind the vanity for the pipes." at the level \'note\' (sorted after '
      + 'the yellows, never a fault, never a gate), read from worktop.js serviceVoidOf. After the review (topbasin '
      + '6): findingsToAct, the findings that ask something of a person (every one but a note), read by checkSummary, '
      + `the export preflights and the toolbar's count. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setSection.js': {
    why: 'T82 F12: behind a vanity the space from the wall to the carcass back hatched on SERVICE_VOID and named; '
      + `hatchLines, the house's 45 degree hatch, handed out once (the plan reads it). ${OWNER}`,
    gates: [],
  },
  // E3's two (committed by E3 under this F when it applies the B3 patches):
  'src/engine/drawings/layers.js': {
    why: `T82 F12: SERVICE_VOID, a grey ink of its own, in the pen order after WORKTOP. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setPlan.js': {
    why: `T82 F12: the base plan hatches a vanity's service void on SERVICE_VOID (setSection.js hatchLines). ${OWNER}`,
    gates: [],
  },
  // E1's one (setSheet.js's writer, applying E3's patch under this F):
  'src/engine/drawings/setSheet.js': {
    why: `T82 F12: SET_LEGEND gains the service void's row on SERVICE_VOID (E1 applies E3's patch). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
