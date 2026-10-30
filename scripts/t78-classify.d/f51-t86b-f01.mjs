/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T86B F1 . THE L'S ARM IS A NEIGHBOUR (CLAUDE.md T86B law 1). The arm B of a Corner L on the adjacent wall is, to
// the run that ends against it, a cabinet side: no side infill and no wall gap there. ONE arithmetic: the stand-in
// unit of `cornerLAdjacentSpan`'s span (runs.js cornerArmStandIns, the stand-in T78 F1's plus already stood), read
// now by the plus, the side infill (projectStore.refreshAutoParts) and the share-out (shareOut.js runFor). A room
// reader: never read by computeCabinet, so no gate, no golden; the six, every fixture and every golden untouched.

const OWNER = '*"jak mamy szafy dochodzace do L shape szafy to liczy infill a nie powinien"* (the owner, 30.10.2026, '
  + '22:26)';

export const LICENSED = {
  'src/engine/runs.js': {
    why: `T86B F1: \`cornerArmStandIns\` (the stand-in unit of an L's arm B on the adjacent wall, at the run's level, `
      + `from \`cornerLAdjacentSpan\`); \`addPlusPoints\` reads it instead of its own inline loop (the same stand-in, `
      + `byte for byte). A room reader, never read by computeCabinet. ${OWNER}`,
    gates: [],
  },
  'src/engine/shareOut.js': {
    why: `T86B F1: \`runFor\` stands the arm's stand-in in the run's \`others\`, so the share-out's boundary at an L is `
      + `the arm's end (no margin reserved, the run laid out up to the arm and not into it). A room reader, never read `
      + `by computeCabinet. ${OWNER}`,
    gates: [],
  },
};
