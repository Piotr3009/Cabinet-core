/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T78 · the owner's AFTERNOON of 17.10.2026 (13:07 to 13:18), named here so the strict run says why. *"musimy
// zaprojektowac naklejki, 44 na A4 bo takie mam, kolorami: 3 szafy to 3 kolory, drugi kolor to kolor elementu, czyli
// polki, boki, plecy i top and bottom, parami ten sam kolor; szuflady nie trzeba; napis co to; i strzalka co
// oklejamy"*; *"czy to nam sie przeniesie do VCarve? jak nie, to przynajmniej kolory napisow pod kolory szafki"*;
// *"zamiast H1180 ST37 ... ponumerujemy wszystkie elementy"*; *"ok koduj"*. No cut geometry moved: a file written
// without a plan is byte for byte yesterday's, which is why the six and every golden hold.

export const LICENSED = {
  'src/engine/partNumbers.js': {
    why: 'Owner 17.10.2026 · NEW: the part number plan (16:40: labelSettings falls back to the L7160 paper and reads '
      + 'insetMm; labelSheetGrid hands the inset on). 14:10 edgeArrowGeometry: the sticker\'s arrow on the board '
      + 'itself in its drawn frame (the line inside the banded edge, the shaft, the head, the word EDGE), the one '
      + 'geometry the DXF and the sheet draw (*"na projekcie nie ma strzalek ktora strone oklejamy"*). '
      + 'labelKindOf (sides with dividers and the DP, top with bottom, '
      + 'shelves with a stack\'s PARTITION and the FIXED board, back; fronts and drawers none), partNumberPlan (one '
      + 'number through the project, cabinet by cabinet, the cabinet\'s colour, ACI and LABEL_<cabinet> layer), '
      + 'dxfLabelsFor, edgeArrowOf off the part\'s edging code, labelRecords, labelSheetGrid and labelPages off '
      + 'profile.labels. Pure data; nothing cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'Owner 17.10.2026: the labels block, every number of the sticker: the paper (13:07: 44 per A4, 4 x 11, 48.3 x '
      + '25.4; 16:40: "naklejki robimy na papierze 21 sztuk, 44 to za male ... z marginesami, 3 kolumny": Avery L7160, '
      + '3 x 7, 63.5 x 38.1, 2.5 between the columns, centred, insetMm 2.5 for "nadruk mniejszy od naklejek"; the 44-up '
      + 'kept in `sheets` as a preset; a saved sheet with no preset name is the 13:07 block and gives way), the cabinet '
      + 'palette and its ACI twin (14:15: yellow last, the third cabinet orange: "zamien zolty na inny, malo widoczny na '
      + 'nadrukach, zolty ostatecznie"), the four element pairs and their colours, the DXF layer prefix, the number '
      + 'padding, the edge arrow\'s numbers (inset 3, head 7, shaft 45, the 60 mm floor, the 0.8 span); migrated block by '
      + 'block. No cut number touched',
    gates: [],
  },
  'src/engine/cnc/partLabel.js': {
    why: 'Owner 17.10.2026: numberTag and partLabelText({ no }): the number leads the label (#07 W01 TOP 1071x550) '
      + 'when the caller has one; without it the words are yesterday\'s to the byte',
    gates: [],
  },
  'src/engine/cnc/dxf.js': {
    why: 'Owner 17.10.2026: the label option. panelEntities({ label: { no, layer } }) writes the part\'s text on the '
      + 'cabinet\'s layer, numbered; labelFor and labelLayerRow; buildUnitDxfFiles, sheetEntities, sheetDxf, '
      + 'materialSheetEntities and materialSheetDxf take `labels` (per cabinet) and declare the layer with its colour '
      + 'index; 14:10 a numbered board\'s file carries the EDGE arrow (three open polylines and the word) on the same '
      + 'layer. Left out, every writer produces the bytes it produced yesterday (asserted)',
    gates: [],
  },
  'src/lib/cncExport.js': {
    why: 'Owner 17.10.2026: exportUnitDxfZip and exportSheetDxf take `labels`, exportMaterialDxf takes the project\'s '
      + '`plan` and hands each block its cabinet\'s slice; nothing else in the three moves',
    gates: [],
  },
  'src/lib/outputMenu.js': {
    why: 'Owner 17.10.2026: Output > Part labels (PDF) beside the BOM PDF, run by onExportLabels',
    gates: [],
  },
  'src/lib/partLabels.js': {
    why: 'Owner 17.10.2026 · NEW: the app\'s one door to the plan: planUnits over the project\'s units in order with '
      + 'each unit\'s CNC answer, projectLabelPlan, labelsForUnit, projectLabelRecords',
    gates: [],
  },
  'src/lib/labelsPdf.js': {
    why: 'Owner 17.10.2026 · NEW: the sticker sheets in jsPDF: the cabinet\'s band and name, the element\'s strip with '
      + 'the name and the code, the cut size, the number, the edge icon with the arrow at the banded edge; one page '
      + 'per sheet (21 on L7160 since 16:40, 44 on the 13:07 paper); the design drawn on the 48.3 x 25.4 face and '
      + 'SCALED into the sticker less insetMm on every side, centred ("nadruk mniejszy od naklejek"); the hairline cut '
      + 'guide on the sticker\'s edge gone with it; measured by assertPdfBytes; named by exportFileName (labels)',
    gates: [],
  },
};
