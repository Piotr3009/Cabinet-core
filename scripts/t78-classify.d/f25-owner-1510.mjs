// After T78 · the owner's night turn of 15.10.2026 ("OK TERAZ POWAZNIE"), named here so the strict run says why.
// *"musi byc 3 layery 1 to cabineo 15 mm, drugi to cabineo oblamowka, czyli zebranie 0.5 mm laminatu, 3 to
// przeciwlegle nawiercenie ... jak mamy cabineo to nie robimy dog bonsow, i to samo jak mamy biscuits czy
// standardowe tradycyjne dowels ... nie ma wogole mozliwosci wyciecia naroznika w szafkach wiszacych ...
// wneka zrobiona nie pozwala szafkom jakby wpasc w wneke, komin nie ma mozliwosci automatycznego wycinania
// w szafce naroznika jak przesuwamy - patrz skos, w szafach to samo"*.

export const LICENSED = {
  'src/engine/screwedBack.js': {
    why: 'Owner 15.10.2026: no dog bones under Cabineo or biscuits. The back joint (the sides\' and the TOP\'s and BOTTOM\'s '
      + 'back tenons with their dog bones, the BACK\'s sockets and dia 7.5 holes) goes whole on such a unit and the BACK is '
      + 'held by drawBACK\'s own dia 3 rows. LISP first: SKYLON_JOINTS_CABINEO.lsp head, F and H.0; SKYLON_JOINTS_BISCUIT.lsp '
      + 'head, C and F',
  },
  'src/engine/cabineo.js': {
    why: 'Owner 15.10.2026: the three layers. The defaults are his own machining (drill15, flush, skimMm 0.5); the flush '
      + 'collar recess is drawn (DERIVED round the third lobe, the sheet\'s own reading) as THE SKIM LAYER; the side hole is '
      + 'X deep (DERIVED, holeDepthMm overrides); the axis 5 + the skim; CABINEO_LEAVES empty, the BACK screwed',
  },
  'src/engine/biscuitJoints.js': {
    why: 'Owner 15.10.2026: BISCUIT_LEAVES empty and the back sentence says the BACK is screwed (the LISP\'s '
      + 'biscuit-back-refusal, amended the same day)',
  },
  'src/engine/cabinet.js': {
    why: 'Owner 15.10.2026: computeCabinet runs screwedBackStrip after the Cabineo or biscuit strip, before the drilling pass',
  },
  'src/engine/profile.js': {
    why: 'Owner 15.10.2026: joints.cabineo defaults drill15 / flush / skimMm 0.5 / holeDepthMm null; a T78 snapshot carrying '
      + 'the proposed pair (flushCap, cutter12) and no skimMm is migrated to the owner\'s choice; notch.obstacleClearanceMm 10 '
      + '(the scribe room round a chimney or a box the notch is cut for, proposed)',
  },
  'src/engine/notch.js': {
    why: 'Owner 15.10.2026: the wall unit (KIT_WUD) is a notch parent, its hanger cut-outs step in beside the notch '
      + '(notchHangerCutouts) and its hanger holes step forward with the shortened side (notchDrills); notch-obstacle-limits, '
      + 'the obstacle clearance in the profile table, a derived notch says auto and what for (notchOf, notchSummary). '
      + 'LISP first: KIT_NOTCH.lsp section 1',
  },
  'src/engine/collision.js': {
    why: 'Owner 15.10.2026: a box span carries near / far and an `enter` (how far a notchable cabinet may drive into a '
      + 'chimney or a box); clampUnitX stops `enter` inside such an obstacle with no clearance; unitIssues forgives a corner '
      + 'overlap within it; unitFootprint allows a negative back inset (a cabinet standing in a recess). No golden reaches it: '
      + 'a bare computeCabinet never asks the room',
  },
  'src/engine/runs.js': {
    why: 'Owner 15.10.2026: wallGapOf takes `params.recess_mm` off the gap, so a cabinet standing in a recess stands against '
      + 'the recess\'s back wall for every reader of the one helper (the scene, the clamp, the worktop, the plan, the section). '
      + 'A placement number, as the wall gap itself: it does not reach computeCabinet',
  },
};

export const LISP = {
  'reference/lisp/SKYLON_JOINTS_CABINEO.lsp': 'Owner 15.10.2026: the three layers (head, A.1, D.7, D.8, cabineo-recess-depth, '
    + 'cabineo-hole-depth, the axis with the skim) and the screwed back (head, F, H.0, the puzzle-loses paragraph)',
  'reference/lisp/SKYLON_JOINTS_BISCUIT.lsp': 'Owner 15.10.2026: the back joint goes on a biscuit unit, the BACK is screwed '
    + '(head point 2, C, biscuit-back-refusal, F, H)',
  'reference/lisp/KIT_NOTCH.lsp': 'Owner 15.10.2026: KIT_WUD a parent (its hangers carried), the obstacle notch law and '
    + 'notch-obstacle-limits, notch.obstacleClearance in notch-profile, the parent prompt [B / W / U]; the top-hung and the '
    + 'window notch named as not yet in the file',
};

// Re-pinned knowingly: the three joint-system goldens moved with the owner's law.
export const REPINNED = [
  {
    file: 'fixtures/golden-cabineo8-bud.json',
    why: 'Owner 15.10.2026: three layers (36 dia 15 holes 11.5 deep and 12 skims 0.5 deep from the outside face, 12 dia 5 '
      + 'holes 8 deep on the axis 5.5), the back joint gone (every carcass board a plain rectangle, the BACK keeps its 14 screws '
      + 'and loses 10 sockets and 20 dia 7.5); the cut moved with SKYLON_JOINTS_CABINEO.lsp H.0',
  },
  {
    file: 'fixtures/golden-cabineo12-bud.json',
    why: 'Owner 15.10.2026: as the Cabineo 8 golden, the dia 5 holes 12 deep; SKYLON_JOINTS_CABINEO.lsp H.0',
  },
  {
    file: 'fixtures/golden-biscuit-bud.json',
    why: 'Owner 15.10.2026: no dog bones with biscuits either: the back joint gone, every carcass board a plain rectangle, '
      + 'the BACK keeps its 14 screws and loses its sockets and dia 7.5 holes; SKYLON_JOINTS_BISCUIT.lsp F and H',
  },
];
