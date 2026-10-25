/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F4 · BOM AND THE PART LIST. CLAUDE.md T82 F4: *"The BOM adds, per pocket: "Hawa Concepta III 25 Push, left" (or
// 35, Pull, right), one set per door; "Hawa Connector 55" or "Connector 110", one per pocket; the hinges (3 or 4 per
// door) as the set's own; the top track and bottom track cut to T1 - 7 (one line, the length named); for III/35 the
// steel stiffening profile, length TB - M + 3; the adjustable foot ... The pocket panels, top, bottom and door are
// ordinary cut parts on the cut list and the CNC sheets"*. engine/cnc/hawa.js (NEW) reads the pocket's figures
// (result.hawa, A2's one derivation) into order lines computeCabinet pushes through its own hw(), each role by name;
// six registry rows; the pocket's panels and door with the fronts (the tree, the stickers, the board they are bought
// off, the spray law). Every line is reached only by a HAWA_POCKET (A2's gate `hawaPocket`, named once, in F2).
// A2's two NEW goldens of the kit (verify/t82/goldens/golden-hawa-pocket-1door.json, -2door.json) carry the order
// lines in their summary: written again by `node scripts/t78-goldens.mjs --write` in this F, never re-pinned.

const OWNER = '*"zaczniemy od hawa dodanie"*, *"wysuwasz pocket door i zakrywasz szafke lub szafki"* (25.10.2026); '
  + '*"panele po bokach to jest nie carcas tylko front zawsze"* (13:46)';

export const GATES = {};

export const LICENSED = {
  'src/engine/cnc/hawa.js': {
    why: `T82 F4: NEW. hawaHardwareLines reads result.hawa (KIT_HAWA.lsp D16 D19 D22): one set per door by its name, `
      + `the connector 55 or 110, the set's own hinges, the tracks T1 - 7, the III/35 profile TB - M + 3 per groove, `
      + `the foot; the articles off profile.hawa.articles, an empty one prints the name alone. ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/cabinet.js': {
    why: `T82 F4: the import and the pocket's order lines through hw(), the six roles hawa_set, hawa_connector, `
      + `hawa_hinges, hawa_tracks, hawa_stiffener, hawa_foot written by name (the registry's scan), only where `
      + `result.hawa exists. ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/partRegistry.js': {
    why: `T82 F4: six hardware rows (hawa_set, hawa_connector, hawa_hinge, hawa_track, hawa_steel_profile, hawa_foot) `
      + `and their HARDWARE_TO_PART_ID roles. ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/bom.js': {
    why: `T82 F4: FRONT_SHEET_PARTS gains pocket_panel, so the pocket's panels are estimated off the board groups.js `
      + `checks them on (the front board). ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/cnc/groups.js': {
    why: `T82 F4: groupOfPanel puts roles pocket_panel and pocket_door in the fronts group of the tree; the export `
      + `presets are untouched. ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/partNumbers.js': {
    why: `T82 F4: labelKindOf numbers and stickers pocket_panel and pocket_door with the fronts the tree lists them `
      + `with. ${OWNER}`,
    gates: ['hawaPocket'],
  },
  'src/engine/spray.js': {
    why: `T82 F4: sprayRuleFor: pocket_door the door's rule 1, pocket_panel the end panel's rule 7 (PROPOSED). ${OWNER}`,
    gates: ['hawaPocket'],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
