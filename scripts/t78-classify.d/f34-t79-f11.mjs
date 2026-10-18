/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T79 F11 · THE RAIL IS ALONE, AND IT SNAPS 50 MM UNDER A SHELF. The owner, 18.10.2026: *"zlikwiduj propozycję
// install rail with or without shelf, bez sensu, usuń to; a jak będziemy instalować rail to przy przesuwaniu
// zaproponuj 50 mm poniżej półki, jak jakąś wyczuje."*  The road is the store and the UI: `addHangerRail` adds the
// rod alone, `moveRail` catches it under a shelf by the shelf magnet's own `applyMagnet`. The one engine file is
// profile.js, for the number; no cut reads it, so no gate: a bare `computeCabinet()` never meets it and every
// golden holds. The engine's shelf-mounted branch (railAssembly.js) is untouched (NOT THIS TURN).

export const LICENSED = {
  'src/engine/profile.js': {
    why: 'T79 F11: `hardware.hanger.belowShelfMm` (50, the owner\'s: *"przy przesuwaniu zaproponuj 50 mm poniżej '
      + 'półki"*), where a dragged rod is proposed under a shelf\'s underside; read by the store\'s drag '
      + '(`railMagnetCandidates`) and the Add notice only, never by a cut',
    gates: [],
  },
};
