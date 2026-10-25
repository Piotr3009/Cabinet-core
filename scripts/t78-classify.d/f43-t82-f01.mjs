/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F1 · THE LISP OF THE HAWA POCKET, FIRST. The owner, 25.10.2026 (11:40): *"musimy zrobic nowy projekt i
// zakodowac w kuchni nowy system to sie nazywa hawa III sa to drzwi ktore sa pocket doors ... wysuwasz pocket door i
// zakrywasz szafke lub szafki"*, (13:40) *"zaczniemy od hawa dodanie"*. A new kit, reference/lisp/KIT_HAWA.lsp
// (D1 to D22, every number with its HAWA drawing and page; a new LISP file is the F's own, no existing kit amended),
// the two kg tables of drawing 160704 p1 as reference/hawa/weight-25.json and weight-35.json, and profile.hawa, the
// LISP's constants key by key. No gate, no golden: computeCabinet reads no hawa key in F1 (the HAWA_POCKET kit that
// reads them is F2 and F3's), so every golden holds byte for byte.

const OWNER = '*"zaczniemy od hawa dodanie"* (25.10.2026, 13:40); CLAUDE.md T82: *"The manufacturer\'s sheet is the law of the hardware"*';

export const GATES = {};

export const LICENSED = {
  'src/engine/profile.js': {
    why: 'T82 F1: profile.hawa, every number of reference/lisp/KIT_HAWA.lsp under the constant\'s own name with its HAWA '
      + 'drawing and page (160704, 169313, 52676, 31418) or PROPOSED: the pocket clear 55 / 110, the panels 19 / 22 / 18, '
      + 'the boards 18, the cap 6.5, the gaps 3, the door and class ranges, the kg-table files, the density 700, the depth '
      + 'rules (92, 3, 320, 414, 560, 7, 5), RE 20, the hinge drilling and the TA tables, the III/35 steel rows, the panel '
      + 'rows, the foot, the CNC layer names, Push by default, the articles (408.30.711, the rest empty); and '
      + 'migrateCabinetProfile merges hawa key by key (a profile saved before the turn comes back with all of them). '
      + `computeCabinet reads no hawa key. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
