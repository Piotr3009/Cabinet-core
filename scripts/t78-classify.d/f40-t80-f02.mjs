/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F2 · IN-FRAME PER PROJECT, ONE ROW IN SETTINGS. The owner, 21.10.2026 (22:40): *"3 per projekt."*  The decision
// lives in the project's design beside the sheen (design.inframe, false by default and for every project saved
// before tonight); the owner's numbers live in profile.inframe (KIT_INFRAME.lsp's constants). Nothing here is read
// by a cut: the engine hears in-frame only through paramsForEngine (stores/projectStore.js), and F2 hands it a key
// the kits do not read yet. Every golden holds by construction; no golden is re-pinned.

const OWNER = '*"3 per projekt."*; *"wszedzie ramke 38 mm"*; *"ramka 25, drzwi 22"*; *"3 mm zawsze"*; *"wariant C"*; '
  + '*"raczej plyta, malo kiedy bedzie jeden ciag dluzszy jak 2800"* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/design.js': {
    why: `T80 F2: design.inframe (DEFAULT_DESIGN false; migrateDesign keeps a stored true only), INFRAME_CHOICES, `
      + `inframeOn, inframeHint and inframeTooltip (the FRONTS row's words, built from profile.inframe). A design key `
      + `and the row's words; no cut reads them. ${OWNER}`,
    gates: [],
  },
  'src/engine/profile.js': {
    why: `T80 F2: profile.inframe { stile 38, rail 38, frameT 25, frontT 22, gap 3, outside 19, boardMax 2800, unitTypes } `
      + `(KIT_INFRAME.lsp's constants), merged key by key; read only by a project that switched in-frame on. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
