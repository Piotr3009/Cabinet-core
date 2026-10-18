/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── T79 F11 · A SAVED T37 RAIL ASSEMBLY, FOR THE TESTS THAT HOLD ITS LAW ───
//
// The owner, 18.10.2026: *"zlikwiduj propozycję install rail with or without
// shelf, bez sensu, usuń to"*. `addHangerRail` adds the rod ALONE now, and the
// T37 assembly (a FIX shelf with the rod hung under it) lives on only in the
// projects saved with one; the engine's shelf-mounted branch still reads them.
//
// This writes one exactly as such a project carries it: the FIX shelf, and a
// hanger that names it (`mount: 'shelf'`, `shelf_id`) with the T35 pair T37's
// add path wrote beside the link (`pos_mm` above the floor, `datum` floor).
// One helper, so every test that holds the assembly's law builds it one way.

import { useProjectStore } from '../src/stores/projectStore.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { hangerDropMm } from '../src/engine/railAssembly.js';

/**
 * @param {string} unitId
 * @param {{shelfAt?:number, zone?:number|null}} [opts] the shelf's height and bay
 * @returns {{shelfId:string, railId:string}}
 */
export function hangSavedAssembly(unitId, { shelfAt = 1600, zone = null } = {}) {
  const S = useProjectStore.getState();
  const unit = S.units.find((u) => u.id === unitId);
  const G = unit?.params?.board_t ?? P.board.thickness;
  const inBay = zone == null ? {} : { zone };
  const shelfId = S.addItem(unitId, { kind: 'shelf', variant: 'fixed', pos_mm: shelfAt, ...inBay });
  const railId = useProjectStore.getState().addItem(unitId, {
    kind: 'hanger',
    mount: 'shelf',
    shelf_id: shelfId,
    pos_mm: shelfAt - hangerDropMm(P) - G,
    datum: { kind: 'floor', id: null },
    ...inBay,
  });
  return { shelfId, railId };
}
