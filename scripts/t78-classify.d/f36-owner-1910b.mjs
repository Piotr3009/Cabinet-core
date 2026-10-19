/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T79 · the owner's eye-test of 19.10.2026, point F6, named here so the strict run says why. His words
// (09:16): *"nie na pierwszych plecach tylko na tych drugich ktore sa we wnetrzu recess, na tych pierwszych nie, to juz
// bylo usuniete i znowu trzeba usunac"*; 10:15: *"koduj, nic juz nie pytaj"*. T79 F6 drew the dia 3 rows of the FIRST
// back along the notch's box (the RETURN, the LID, the FLOOR) and round the recess window; F8 carried them onto the
// extension's BACK piece. All of that is WITHDRAWN: the first back carries drawBACK's rows only, as on 17.10.2026
// (KIT_NOTCH.lsp D10, KIT_RECESS.lsp D17). What stays of 18.10: the SECOND back, the recess's EXT-BACK, drilled with its
// twelve rows round the band and a cut part. LISP first, then the engine, then the goldens re-pinned with his words.
// The gate is F6's own (backRowsRoundTheBox, f34-t79-f06.mjs, its LIVENESS rewritten there): a unit without a back
// notch or a recess reaches no changed line, so the six and every other golden hold byte for byte.

const OWNER = '*"nie na pierwszych plecach tylko na tych drugich ktore sa we wnetrzu recess, na tych pierwszych nie, to juz '
  + 'bylo usuniete i znowu trzeba usunac"* (19.10.2026)';

export const LICENSED = {
  'src/engine/notch.js': {
    why: `Owner 19.10.2026: notchBackJoints back to D10 of 17.10 (no row into the RETURN at full height, none beside a `
      + 'part-height notch, none into the LID or the FLOOR; the side\'s own rows above or under the notch stay); '
      + 'notchBackBoxRows, SHORT, cut.backRowsShort and derived.notch.backRowsShort DELETED (deleted, not kept); '
      + `notchEdgeRow stays for the EXT-BACK; git: 62 deleted, 12 added. ${OWNER}`,
    gates: ['backRowsRoundTheBox'],
  },
  'src/engine/extension.js': {
    why: `Owner 19.10.2026: recessBackJoints back to D17 of 17.10 (no column into RETURN-L's / RETURN-R's front ends, no `
      + 'row into the FLOOR\'s / the LID\'s front edges, no row into a notch\'s box on the piece that holds it); '
      + 'recessNotchBoxRows and recessPutHole DELETED (deleted, not kept; git: 59 deleted, 12 added); recessExtBackScrews and the drilled '
      + `EXT-BACK of 18.10 UNCHANGED. ${OWNER}`,
    gates: ['backRowsRoundTheBox'],
  },
};

export const REPINNED = [
  {
    file: 'fixtures/golden-notch.json',
    why: `19.10.2026: KIT_NOTCH.lsp D10 as on 17.10: the column into the RETURN's end gone again (SCREWS_3MM|BACK 14 -> 10, `
      + `the BACK's holes 28 -> 24); nothing else moves. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-notch-top.json',
    why: `19.10.2026: KIT_NOTCH.lsp D10 (I2): beside the notch from the top no row into the RETURN, under it none into the `
      + `FLOOR (SCREWS_3MM|BACK 19 -> 13); nothing else moves. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-recess.json',
    why: `19.10.2026: KIT_RECESS.lsp D17 (CASE A): the column through the BACK into RETURN-L's end gone again `
      + `(SCREWS_3MM|BACK 13 -> 10); the EXT-BACK keeps its twelve. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-recess-band.json',
    why: `19.10.2026: KIT_RECESS.lsp D17 (CASE B): the twelve round the window gone again (SCREWS_3MM|BACK 26 -> 14); `
      + `the EXT-BACK keeps its twelve. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-notch-and-recess.json',
    why: `19.10.2026: KIT_RECESS.lsp D13 with D10 and D17 (CASE D): no column into the notch's RETURN (x 209) and none `
      + `into RETURN-L's end (x 319) on the 128 wide BACK (SCREWS_3MM|BACK 13 -> 6); the EXT-BACK keeps its rows. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-notch-end-panel.json',
    why: `19.10.2026: KIT_NOTCH.lsp D10 on the notched BACK beside its end panel (SCREWS_3MM|BACK 19 -> 13); the end `
      + `panel untouched. ${OWNER}`,
  },
  {
    file: 'fixtures/golden-recess-end-panel.json',
    why: `19.10.2026: KIT_RECESS.lsp D17 on the recess BACK beside its end panel (SCREWS_3MM|BACK 22 -> 13); the EXT-BACK `
      + `and the end panel untouched. ${OWNER}`,
  },
];

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': `Owner 19.10.2026: D10's 18.10 amendment WITHDRAWN. ${OWNER} notch-back-joints as on `
    + '17.10 (no row into the box, no "SHORT"); notch-back-box-rows and the NUMBERS block I5 deleted; NUMBERS I and I2 say '
    + '10 and 13 holes; the command says the BACK\'s dia 3 count. notch-edge-row stays for KIT_RECESS\'s EXT-BACK.',
  'reference/lisp/KIT_RECESS.lsp': `Owner 19.10.2026: D17's 18.10 amendment HALF WITHDRAWN. ${OWNER} recess-back-joints `
    + 'as on 17.10 (no rows round the window, none into a notch\'s box, D13); recess-notch-box-rows and recess-put-hole '
    + 'deleted; NUMBERS CASE A, CASE B and CASE D say the BACK\'s 10, 14 and 6; recess-ext-back-screws and the drilled '
    + 'EXT-BACK of 18.10 unchanged.',
};
