/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F18 . THE THICKNESS SHOWS (slice D2). The owner, 25.10.2026 13:36: *"nie moge wizualnie zwiekszyc tez grubosci
// tego panela"*. One link (verify/t82/f18-probe.md): cabinet.js cuts the free panel's board from its own board_t, read
// before the carcass slot. Inside the FP branch only (type.carcass.top === 'free'): a cabinet's own board_t (every
// unit is born with one, projectStore.js 533) never reaches it, so the gate is a free panel whose board_t differs from
// the carcass slot it is handed; no golden is a free panel, the six and every T75 to T81 golden hold byte for byte.
// profile.js gains freePanel.thicknessLadder, read by the Thickness field only.

import { getUnitType, defaultParamsFor } from '../../src/engine/types.js';
import { computeCabinet } from '../../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER = '*"nie moge wizualnie zwiekszyc tez grubosci tego panela"* (25.10.2026 13:36)';

export const GATES = {
  freePanelOwnBoard: {
    what: 'a FREE_PANEL (type.carcass.top === \'free\') whose board_t differs from the carcass slot it is handed '
      + '(thickness_slots.carcass1); no golden is a free panel',
    opens: (params, typeId) => {
      if (getUnitType(typeId || params?.type)?.carcass?.top !== 'free') return false;
      const own = Number(params?.board_t);
      const slot = Number(params?.thickness_slots?.carcass1);
      return own > 0 && slot > 0 && own !== slot;
    },
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T82 F18: the FP part's thickness is the panel's own board_t when it is a positive number, else G (the `
      + `carcass slot), so the engine, the room, the cut list, the plan and the Thickness field agree. ${OWNER}`,
    gates: ['freePanelOwnBoard'],
  },
  'src/engine/profile.js': {
    why: `T82 F18: freePanel.thicknessLadder [18, 22, 25, 30, 36] (PROPOSED, CLAUDE.md T82 THE NUMBERS), the `
      + `Thickness field's chips; computeCabinet reads no freePanel key but the defaults it read before. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  freePanelOwnBoard: () => {
    const params = {
      ...defaultParamsFor('FREE_PANEL', P), unit_num: 'FP01', board_t: 36, thickness_slots: { carcass1: 18 },
    };
    const fp = computeCabinet(params, P).panels.find((p) => p.id === 'FP');
    return {
      live: Boolean(fp && fp.thickness === 36 && fp.box.d === 36),
      said: `a free panel at board_t 36 handed a carcass slot of 18: FP thickness ${fp?.thickness}, box.d ${fp?.box?.d}`,
    };
  },
};

export const GOLDENS = [];

export const REPINNED = [];
