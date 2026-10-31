/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T-CC1a . the owner's chat fix of 31.10.2026, named here so the strict run says why. His words: *"zmien prosze
// layer cabineo dziury kolor z zoltego, raczej staraj sie wszedzie omijac zolty bo on jest mega nie widoczny na bialym
// tle (na takim pracuje vcarve)"*; on the mapping: *"1 ok, ale staraj sie trzymac w exporcie do DXF i u nas te same
// kolory, prosze upewnij sie ze wszystkie nasze figury w cnc sa zamkniete"*; *"cyjan jest ok, tylko jasny zolty jest
// nie widoczny"*; *"koduj"* (31.10.2026). NO YELLOW ON THE MACHINE FILE: AutoCAD's index 2 and 40 to 59 leave every
// layer the app and the LISP declare; each moves to a rung of another hue chosen for VCarve's white sheet, and the
// sheet's ink follows the DXF's colour (lifted toward white only until it reads on the black sheet). The watch
// drawer's three layers enter the engine's table at the kit's new numbers. COLOURS ONLY: no outline, pocket or hole
// moves; computeCabinet() reaches none of the three files' changes (the layer names are the profile's and the kits'),
// no gate, no golden; the six hold byte for byte. test/chatfix-3110-no-yellow.test.js walks every golden job's DXF
// and proves every outline and pocket polyline closed.

const OWNER = '*"raczej staraj sie wszedzie omijac zolty bo on jest mega nie widoczny na bialym tle (na takim pracuje '
  + 'vcarve)"*; *"staraj sie trzymac w exporcie do DXF i u nas te same kolory"*; *"koduj"* (the owner, 31.10.2026)';

export const GATES = {};

export const LICENSED = {
  'src/engine/cnc/layers.js': {
    why: `Chat fix 31.10.2026: the ACI of 21 rows leaves the yellow family (PUZZLE_DOG_BONES 12, BISCUIT_4MM 22, `
      + `SHAKER_PANEL_POCKET 32, HANDLES_5MM 170, HINGES_3MM 162, DOWEL_8MM 84, DOWEL_EDGE_8MM 86, the Cabineo five 200 `
      + `202 204 212 150, RECESS_WINDOW 142, CORNER_4MM 14, the HAWA six 220 222 224 190 192 194, DRAWER_BOTTOM_POCKET `
      + `230); their screen tones are the same colours lifted for the black sheet; WATCH_DIVIDER_SLOT 34, `
      + `WATCH_GLASS_REBATE 172 and WATCH_GLASS_OPENING 174 enter the table. Names, kinds and every other row untouched; `
      + `nothing cut. ${OWNER}`,
    gates: [],
  },
  'src/engine/cnc/frontOperations.js': {
    why: `Chat fix 31.10.2026: a decorated front's pockets wear the shaker pocket's 32 and #bd5e00 instead of the `
      + `yellow family's 41 and #c3a06a; the centre lines keep the cyan 4. Colour only, no geometry. ${OWNER}`,
    gates: [],
  },
  'src/lib/ledGroove.js': {
    why: `Chat fix 31.10.2026: LED_GROOVE_LAYER states ACI 180 and the sheet's #7345ff (the same 180 lifted) in place `
      + `of 44 and the LED gold; the groove's geometry and the rule of KIT_LED_GROOVE.lsp untouched. ${OWNER}`,
    gates: [],
  },
};

export const LISP = {
  'reference/lisp/SKYLON_COMMON.lsp': `Chat fix 31.10.2026: createCNCLayers PUZZLE_DOG_BONES "_C" "2" to "12", one `
    + `dated comment; no routine changes. ${OWNER}`,
  'reference/lisp/KIT_BUDR_FULL.lsp': `Chat fix 31.10.2026: createDrawerCNCLayers DRAWER_BOTTOM_POCKET "_C" "2" to `
    + `"230", one dated comment; no routine changes. ${OWNER}`,
  'reference/lisp/KIT_WARDROBE_FULL.lsp': `Chat fix 31.10.2026: createWardrobeDrawerCNCLayers DRAWER_BOTTOM_POCKET `
    + `"_C" "2" to "230", one dated comment; no routine changes. ${OWNER}`,
  'reference/lisp/KIT_FRONT_JPULL.lsp': `Chat fix 31.10.2026: jpullMakeLayers JPULL_EDGE "_C" "45" to "92", one dated `
    + `comment; no routine changes. ${OWNER}`,
  'reference/lisp/KIT_HAWA.lsp': `Chat fix 31.10.2026: createHawaLayers 54 to 59 become 220 194 222 224 190 192, one `
    + `dated comment; no routine changes. ${OWNER}`,
  'reference/lisp/KIT_LED_GROOVE.lsp': `Chat fix 31.10.2026: ledMakeLayers LED_GROOVE "_C" "44" to "180", one dated `
    + `comment; no routine changes. ${OWNER}`,
  'reference/lisp/KIT_CORNER_L.lsp': `Chat fix 31.10.2026: CL:ensureCornerLayer CORNER_4MM "_C" "53" to "14", one dated `
    + `comment; no routine changes (T78 F4's grain amendment stands as it was). ${OWNER}`,
  'reference/lisp/KIT_NOTCH.lsp': `Chat fix 31.10.2026: notch-ensure-corner-layer CORNER_4MM "_C" "53" to "14", one `
    + `dated comment; no routine changes (the earlier amendments of this file stand as they were). ${OWNER}`,
  'reference/lisp/KIT_WATCH_DRAWER.lsp': `Chat fix 31.10.2026: watchMakeLayers 41 42 43 become 34 172 174, one dated `
    + `comment; no routine changes. ${OWNER}`,
  'reference/lisp/SKYLON_JOINTS_CABINEO.lsp': `Chat fix 31.10.2026: the drawing command's cab-layer colours follow the `
    + `engine's (the pocket by its tool 200 / 202 / 204, the recess 212, the hole 150 as before), a dated comment in D.9 `
    + `and G.2; no pattern, no number of the joint changes (the earlier amendments of this file stand as they were). `
    + `${OWNER}`,
  'reference/lisp/KIT_RECESS.lsp': `Chat fix 31.10.2026: the D9 comment names RECESS_WINDOW's 142 (the 52 being the `
    + `yellow family); comment only, no routine changes (the earlier amendments of this file stand as they were). `
    + `${OWNER}`,
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [
  {
    file: 'fixtures/golden-inframe-run.json',
    why: 'Chat fix 31.10.2026: the frame\'s openings are cut on RECESS_WINDOW, whose colour row moved from ACI 52 (the '
      + 'yellow family) to 142 in the DXF layer table, so 01-FRAME.dxf\'s fingerprint moved (70c1bd58 to a7b45d3e); not a '
      + 'point of the frame, its openings or its stiles moved (the rest of the golden is byte for byte)',
  },
  {
    file: 'fixtures/golden-inframe-wud.json',
    why: 'Chat fix 31.10.2026: as golden-inframe-run (W01-FRAME.dxf 599b9cf3 to da1aea71, the one colour row)',
  },
];
