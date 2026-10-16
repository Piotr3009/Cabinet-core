/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's DAY turn of 15.10.2026 (his answers of 08:11 and the list that followed), named here so the
// strict run says why. *"plecy tez na cabineo ... otworz ... zasada: wpisujesz prawa ... szafka calkowicie sie skraca,
// nie zostawia w srodku szafki mniej niz 100 mm ... nie dziala to z szafkami wiszacymi ... wstawia mi szafki na
// zewnatrz wyspy zamiast w srodku ... plusiki dopiero jak najedziesz na szafke ... klamki i orientacja drzwi na L shape
// w ogole nie ma sensu ... drzwiczki musza sie skrocic ... otwieranie drzwiczek razem, polaczone zawiasami ...
// standardowo zawiasy 155 degree"*.

export const LICENSED = {
  'src/engine/cabineo.js': {
    why: 'Owner 15.10.2026 (morning): the BACK on Cabineo too. The four back joints of SKYLON_JOINTS_CABINEO.lsp D.2b: '
      + 'the sides\' back pockets from the INSIDE face (an x channel at the back end), the TOP\'s and BOTTOM\'s from the '
      + 'outside face, 14 dia 5 holes in the BACK; the gate open (confirmed !== false); the BACK\'s screw rows gone',
  },
  'src/engine/screwedBack.js': {
    why: 'Owner 15.10.2026 (morning): with Cabineo the BACK\'s dia 3 rows go too (screws: false); biscuits keep them',
  },
  'src/engine/cabinet.js': {
    why: 'Owner 15.10.2026 (day): screwedBackStrip with screws: !cabineoPlan; every hinged leaf carries its hinge\'s angle '
      + '(meta.openAngleDeg, the standard 155 to 24 mm) for the picture; the L\'s bi-fold carrier leaf A takes no handle '
      + 'and keeps its own hinge family; the pair\'s overlapping leaf B clears leaf A\'s face by clearance.corner '
      + '(gap + front_t + clearance.corner from the corner line, was front_t + clearance.corner: its end stood on A\'s face)',
  },
  'src/engine/types.js': {
    why: 'Owner 15.10.2026: a new L corner opens as a bi-fold pair (corner_doors: bifold in its defaults; the two '
      + 'carcass-hung leaves stay the panel\'s "Pair"). The goldens carry their own params and do not reach it',
  },
  'src/engine/profile.js': {
    why: 'Owner 15.10.2026: joints.cabineo confirmed true (the gate open); notch.obstacleClearanceMm 10 ("dobrze"), '
      + 'notch.minInteriorMm 100 (the least interior a notch may leave; below it the whole cabinet goes shallower)',
  },
  'src/engine/notch.js': {
    why: 'Owner 15.10.2026: the tall unit (KIT_BUDTALL) is a notch parent; notch.minInterior 100 in the limits '
      + '(notchObstacleLimits keeps max(minEdge, minInterior) inside the cabinet)',
  },
  'src/engine/collision.js': {
    why: 'Owner 15.10.2026: a span carries its kind (box / island) and an `enter` of Infinity passes through; the store\'s '
      + 'obstacle law (clear / notch / shallow / standoff / stop) reads them. No golden reaches it',
  },
  'src/engine/runs.js': {
    why: 'Owner 15.10.2026: wallGapOf adds params.standoff_mm (a cabinet made shallower by a chimney stands off the wall '
      + 'by what it lost; a wall unit stands on the chimney\'s face at full depth). A placement number, not a cut',
  },
  'src/engine/islandPlan.js': {
    why: 'Owner 15.10.2026: the plan\'s rectangle is the island\'s OUTER footprint; the cabinets stand inside it, each face '
      + 'taking a band (gap + depth) and T75\'s core is what they leave (planBands, planCore, planCoreRefusal); a '
      + 'rectangle too small for its cabinets is refused in words. The store inserts the derived core',
  },
  'src/engine/checks.js': {
    why: 'Owner 15.10.2026: with the 155 the standard hinge, Check #33 (a wide swing into a neighbour) reads only a leaf '
      + 'the owner chose the wide family for; a 155 door swinging over its neighbour\'s closed front is what the '
      + 'zero-protrusion hinge is for',
  },
  'src/engine/doors.js': {
    why: 'Owner 15.10.2026: the swing reads every leaf\'s own angle now (comment only; the law is unchanged)',
  },
  'src/engine/corners.js': {
    why: 'Owner 15.10.2026: lArmKinds knows the bi-fold pair (A covered, B bifold), lLeafTrimMm the bi-fold leaf\'s trim '
      + '(front_t + 1.5 gap) and the overlapping leaf\'s with the gap (gap + front_t + clearance.corner); lDoorsModeOf '
      + 'reads corner_doors. The store\'s wall-L-follows law reads the wall L\'s own doors mode',
  },
  'src/engine/frontClearance.js': {
    why: 'Owner 15.10.2026: the corner clearance matrix wants what the L builder cuts: CORNER_OVERLAP gap + front_t + '
      + 'clearance.corner (was front_t + clearance.corner), the new CORNER_BIFOLD front_t + 2 gaps; a leaf\'s cornerEdge '
      + 'kind bifold maps to it. A verdict, never a cut',
  },
  'src/lib/hardwareSource.js': {
    why: 'Owner 15.10.2026 ("standardowo zawiasy 155"): a hinge manifest from the bucket, the cc_hardware row or an '
      + 'override base names the MODELS; the angle ladder (hinge_by_front_thickness, the inner-drawer 155) is the catalogue '
      + 'of record\'s (reference/hardware/cliptop-hinges.json), so the T19 manifest with the 110 ladder cannot undo the 155',
  },
};

export const LISP = {
  'reference/lisp/SKYLON_JOINTS_CABINEO.lsp': 'Owner 15.10.2026 (morning, "plecy tez na cabineo"): the head paragraph, A.1 '
    + 'confirmed T, D.2b the four back joints (cabineo-back-joint, cabineo-back-table, cabineo-back-pockets, '
    + 'cabineo-back-holes, cabineo-back-board-pt), F and H.0 (26 pockets, 78 dia 15, 26 skims, 26 dia 5 of which 14 in the BACK)',
  'reference/lisp/KIT_NOTCH.lsp': 'Owner 15.10.2026 (day): KIT_BUDTALL a parent, notch.minInterior 100 in notch-profile and '
    + 'notch-obstacle-limits, the PAST THE NOTCH paragraph (the whole cabinet shallower below 100 of interior, the wall unit '
    + 'on the face at full depth, the far side\'s notch returning)',
  'reference/lisp/KIT_CORNER_L.lsp': 'Owner 15.10.2026: section 8 THE DOORS: the bi-fold pair the default (door B on door A\'s '
    + 'free edge, one handle on B, door A\'s own hinge), the carcass-hung pair\'s door B clearing door A\'s face by '
    + 'clearance.corner (was on its face), a thicker front shortens door B',
};

// Re-pinned knowingly: the four L goldens with two carcass-hung leaves moved with the owner's law (leaf B 3 shorter).
export const REPINNED = [
  {
    file: 'fixtures/golden-corner-l-base.json',
    why: 'Owner 15.10.2026: the pair\'s door B clears door A\'s face by clearance.corner (3): 01-B-F 309.5 wide at z 589 '
      + '(was 312.5 at 586, its end on A\'s face). Hardware and drills unchanged; KIT_CORNER_L.lsp section 8',
  },
  {
    file: 'fixtures/golden-corner-l-wall.json',
    why: 'Owner 15.10.2026: as the base L: 01-B-F 167.5 wide at z 431 (was 170.5 at 428)',
  },
  {
    file: 'fixtures/golden-corner-l-wardrobe.json',
    why: 'Owner 15.10.2026: as the base L: 01-B-F 399.5 wide at z 599 (was 402.5 at 596)',
  },
  {
    file: 'fixtures/golden-corner-l-mask.json',
    why: 'Owner 15.10.2026: as the wall L: 01-B-F 167.5 wide at z 431 (was 170.5 at 428); the mask is untouched',
  },
];
