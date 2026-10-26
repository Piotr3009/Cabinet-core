/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T83 F1 . THE LISP OF THE MIRROR CABINET, FIRST (slice M1). The owner, 25.10.2026 (14:09): *"teraz zaprojektujmy
// dokladnie to co masz na rysunku szafka wiszaca"*; *"lustro opcjonalnie, wtedy pamietaj ze drzwiczki 18 plus 4 mm
// lustro, przedluzamy panele do grubosci drzwiczek i lustra"*; (22:41) *"daj wszystkie mozliwosci z panelami, z ledami,
// bez, szerokosc ustawianych drzwiczek etc"*. A NEW kit, reference/lisp/KIT_MIRROR.lsp (the wall unit KIT_WUD_FULL with
// its panels round, the typed door widths and the stiles, the dividers that carry the doors, the mirror door 18 + 4
// hung by its weight on the Blum table, the glass shelves, the bottom box, the back's mirror, the light, the recess,
// D1 to D21), and its numbers as profile.mirror. Nothing here is read by computeCabinet: F1 writes the law, F2 cuts it.
// A new LISP file needs no LISP licence (the export is for an existing file an F amends); its paren row is
// test/turn35-lisp-parens.test.js. Draft for INT: drop into scripts/t78-classify.d/ as f44-t83-f01.mjs.

const OWNER = '*"lustro opcjonalnie, wtedy pamietaj ze drzwiczki 18 plus 4 mm lustro, przedluzamy panele do grubosci '
  + 'drzwiczek i lustra"* (25.10.2026, 14:09)';

export const GATES = {};

export const LICENSED = {
  'src/engine/profile.js': {
    why: 'T83 F1: profile.mirror { defaults (1350 x 1100 x 215 at 1250, 400 over the top, bays 3, door widths 330 / 480 / '
      + '330, stile led 75, panels L R top bottom at 30, mirror doors on, the back\'s mirror off, five shelves a bay, the LED '
      + 'under and inside, the bottom box, recess 0), doorBoardMm 18, mirrorMm 4, glassShelfMm 6, bottomBoxMm 100, '
      + 'boardKgM3 700, mirrorKgM2 10, ledKelvin 4000, ledInsideSide, ledDriverVolts 24, hangers, articles }, each the '
      + 'constant of KIT_MIRROR.lsp section 3 (CONFIRMED in the owner\'s words or by the drawing, or PROPOSED), and its '
      + 'key-by-key merge in migrateCabinetProfile. computeCabinet reads no mirror key (test/turn83-f01-mirror-lisp.test.js '
      + `cuts BUD, BUDR, WUD, WUD_GLASS, WARDROBE, SINK, VANITY3 and HAWA_POCKET with and without the block). ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
