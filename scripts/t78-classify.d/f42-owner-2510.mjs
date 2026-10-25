/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T81 . the owner's order of 25.10.2026 (11:40 to 12:03), named here so the strict run says why.
// *"mamy teraz free standing panel ale on tylko sie przykleja do sciany i tyle, nic z tym nie moge wiecej zrobic"*,
// *"zebym ja mogl go przykleic do tej powierzchni jakiej chce"*, *"chce tez oblozyc boxy lub kominy tez prosze z
// odsunieciem od nich"*, *"3 nie jedzie"* (the panel does not travel with the surface), *"ten panel musi byc w miare
// mozliwe do ustawienia gdzie bede chcial, naprzyklad bede chcial polozyc na szafkach jako daszek albo oblozyc komin
// w kacie"*, then *"koduj prosze"*. One new engine file, the arithmetic of a surface; no gate, no golden: it writes
// the panel's place (wall, x, mount height, back inset, stance), never its cut, and a bare computeCabinet() reaches
// none of it, so every golden holds byte for byte. The store action and the right panel's Attach section live
// outside this contract.

export const GATES = {};

export const LICENSED = {
  'src/engine/attachPanel.js': {
    why: 'NEW. Owner 25.10.2026 ("zebym ja mogl go przykleic do tej powierzchni jakiej chce", "koduj prosze"): '
      + 'attachTargets lists the surfaces a free panel can be stuck to (the wall, the floor, the ceiling, every other '
      + 'unit\'s left side, right side and top, every chimney\'s or box\'s front, left and right), attachPlan reads the '
      + 'numbers a surface asks of the panel (its wall, x, mount_height, inset_back_mm and its stance through '
      + 'freePanelPatch), obstaclesBeyond keeps for moveUnit\'s clamp only the obstacles that reach past the panel\'s '
      + 'own back line. Placement only, nothing cut',
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
