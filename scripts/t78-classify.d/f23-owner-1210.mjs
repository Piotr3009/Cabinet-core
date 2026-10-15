/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's chat-fixes of 12.10.2026, named here so the strict run says why.
// The island automat is deleted on his order ("usuń te panele"); its traces go with it.

export const LICENSED = {
  'src/engine/island.js': {
    why: 'Owner 12.10.2026: the island automat deleted (`isIslandAutoPanel`, `islandPanelPlan`); nothing cut changes for units on faces',
  },
  'src/engine/room.js': {
    why: 'Owner 12.10.2026: the room check no longer skips `island_auto` boards, because none are made any more',
  },
  'src/engine/roomFit.js': {
    why: 'Owner 12.10.2026: the width law no longer exempts the deleted automat\'s end panel',
  },
};
