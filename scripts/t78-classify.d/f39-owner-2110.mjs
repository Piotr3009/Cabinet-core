/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T79 · the owner, 21.10.2026 (20:15): *"nie mamy w ogole polysku, czy mozemy zrobic polysk od 0 do 100
// procent? przeanalizuj prosze"*. Shown the two ways (a neutral studio at full strength, a probe of the room
// itself) he chose (20:31): *"1 - wariant A"*, *"minimum 5 zostaw"*, *"3 - chat zip"*. MEASURED first: a RAL 5008
// door at 5 % and at 100 % differed by one unit in 255 (verify/chatfix-2110/). THE GLOSS RIDE: six numbers in
// `profile.appearance.gloss` ride the sheen on a sprayed or veneered piece (3d/materials.js surfaceFor): the coat to
// 1.0 (was capped at the lacquer's 0.35), its roughness 0.5 to 0.03 (was pinned at 0.12), the studio probe's weight
// 0.25 to 1.0 (was pinned at the 08.08 quarter), over a 256 px studio (3d/Scene.jsx Environment; was 64, a blur
// with no highlight in it). The studio stays three's neutral RoomEnvironment, so a sprayed colour stays the colour
// (turn 8); the lights (FROZEN 4) are not touched; a laminate, raw MDF and the hardware keep every number. No cut
// moves: nothing here reaches computeCabinet, so every golden holds by construction.

const OWNER = '*"nie mamy w ogole polysku, czy mozemy zrobic polysk od 0 do 100 procent?"*; *"wariant A"*; *"minimum 5 '
  + 'zostaw"* (21.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/profile.js': {
    why: `Owner 21.10.2026: appearance.gloss { coatMax 1.0, coatRoughnessMin 0.03, coatRoughnessMax 0.5, envMin 0.25, envMax `
      + '1.0, probeSize 256 }, PROPOSED, merged key by key; read by the view only (3d/materials.js, 3d/Scene.jsx), never by '
      + `a cut. ${OWNER}`,
    gates: [],
  },
  'src/3d/materials.js': {
    why: `Owner 21.10.2026: surfaceFor rides the clear coat, its roughness and the sprayed probe's weight on the sheen `
      + '(gloss.coatMax, coatRoughnessMin/Max, envMin/envMax) for a sheen-driven piece (spray, veneer); a laminate, a raw '
      + `board, a lacquered piece with no sheen handed in and the hardware keep every number they had. ${OWNER}`,
    gates: [],
  },
  'src/3d/Scene.jsx': {
    why: `Owner 21.10.2026: Environment builds the neutral studio probe at gloss.probeSize (256; the editor windows read `
      + 'the profile themselves); the same RoomEnvironment, the same intensity, the lights untouched (FROZEN 4 holds: '
      + `engine/lighting.js, lightRig.js, ledStrips.js and the panels not one line). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
