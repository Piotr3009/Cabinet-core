/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After the no-yellow chat fix (f52) . the owner, 31.10.2026, of the eighth cabinet's label colour (yellow last since his
// 17.10 "zolty ostatecznie"): *"nie chce zoltego"*. The eighth cabinet is a rose: ACI 230 in the DXF (no yellow family) and
// #d6336c on the sticker; the fallback palette of partNumbers.js (a profile with no colours) drops its yellow too. Colours
// only: computeCabinet() reads neither change (the label plan is read by the labels road and the DXF text layer); no gate,
// no golden; the six hold byte for byte.

const OWNER = '*"nie chce zoltego"* (the owner, 31.10.2026, of the eighth cabinet\'s colour; 17.10.2026: *"zamien zolty na '
  + 'inny, malo widoczny na nadrukach, zolty ostatecznie"*)';

export const GATES = {};

export const LICENSED = {
  'src/engine/profile.js': {
    why: `Chat fix 31.10.2026: profile.labels.unitColours[7] #e0a100 to #d6336c and unitAci[7] 2 to 230 (the eighth `
      + `cabinet a rose, no yellow); nothing else of the profile. ${OWNER}`,
    gates: [],
  },
  'src/engine/partNumbers.js': {
    why: `Chat fix 31.10.2026: the fallback palette's third colour #e0a100 / ACI 2 to #e4572e / 30 (the profile's own `
      + `orange); the cycle, the lift and the plan untouched. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
