/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F11 (slice B3) · THE BASIN, ONLY TO THE EYE. The owner, 25.10.2026 (12:57): *"dodanie 1 sink or 2 sink?
// dodajesz tylko do widoku"*. engine/worktop.js: basinSpec, basinCentresOf (READS engine/vanity.js vanityWastes and
// wasteFromBackMm, the LISP's one source), and the basin's oval cut-out in cutoutsFor, never machined. No board, no
// cut list line, no CNC: computeCabinet never reads worktop.js. E3 commits the projector's basin solid under this F
// (patch F11-B3-to-E3-projector.diff) and the plan's oval (F11-B3-to-E3-setPlan.diff): drawing modules only.
// Draft for INT: drop into scripts/t78-classify.d/ as f43-t82-f11.mjs; keep the two E3 rows once E3's commit lands.

const OWNER = 'The owner, 25.10.2026 (12:57): *"dodanie 1 sink or 2 sink? dodajesz tylko do widoku"*.';

export const GATES = {};

export const LICENSED = {
  'src/engine/worktop.js': {
    why: 'T82 F11: basinSpec, basinCentresOf (engine/vanity.js vanityWastes read, never re-derived) and one oval '
      + 'cut-out per basin over a vanity in cutoutsFor (readiness manual, never machined: a BOM note under the '
      + 'worktop, nothing in the cut list); fitBasins, the basins the stone can take (wholly inside the slab with '
      + 'the cut-out margin, clear of those cut before), the others refused in words with the width or depth that '
      + 'lets them in (Check #48), on every slab road (withCutouts, the island\'s, whose basin centres ride into its '
      + `frame). ${OWNER} CLAUDE.md T82: *"The room refuses in words, the engine never squashes"*.`,
    gates: [],
  },
  'src/engine/checks.js': {
    why: 'T82 F11: Check #48 (yellow), the basins a vanity\'s top cannot take, read off the slabs\' basinRefusals '
      + `(engine/worktop.js fitBasins), once per vanity. CLAUDE.md T82: *"The room refuses in words, the engine `
      + `never squashes"*. ${OWNER}`,
    gates: [],
  },
  // E3's two (committed by E3 under this F when it applies the B3 patches):
  'src/engine/drawings/projector.js': {
    why: 'T82 F11: the basin as a section-only solid on the APPLIANCE ink (views [\'section\'], one filter line in '
      + `buildScene; no solid before tonight names views). ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/setPlan.js': {
    why: `T82 F11: a basin cut-out drawn as an oval on the APPLIANCE ink, named on the wall plan. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
