/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's island plan of 14.10.2026, named here so the strict run says why.
// *"przy dodaniu wyspy chciałbym żeby był widok z góry i proponowana na podłodze plan wyspy"*.

export const LICENSED = {
  'src/engine/islandPlan.js': {
    why: 'Owner 14.10.2026: the island planned from above. Pure arithmetic on the room (faces, plan cabinets, clearances to '
      + 'the first thing in front of each face, the draft of an existing island); it computes no cabinet and cuts nothing. '
      + 'The store inserts a plan through the same setRoom and addUnit every island and cabinet already go through.',
  },
};
