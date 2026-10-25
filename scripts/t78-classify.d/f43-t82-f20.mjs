/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F20 · THE LOGO AND THE COMPANY ON THE SHEET. The owner, 25.10.2026 (11:40): *"do tego dodawanie loga do
// rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"*. The title strip's 24 x 24 LOGO box (T71,
// engine/drawings/setSheet.js titleStrip) draws the logo kept with the company (`project.titleBlock.company.logo`)
// as an `image` entity on SHEET_MUTED, fitted with its own ratio and centred; the PDF writer (lib/drawingExport.js)
// embeds it, an SVG logo by the PNG drawn for it when it was chosen (`readLogoFile`). Two numbers enter
// profile.drawings.set.logo (maxPx 400, maxKb 256, PROPOSED). Nothing here is read by computeCabinet: this F
// draws, it never cuts.

const OWNER = '*"do tego dodawanie loga do rysunkow musze miec dzisiaj profesjonalne rysunki dla klientow"* (25.10.2026, 11:40)';

export const GATES = {};

export const LICENSED = {
  'src/engine/drawings/setSheet.js': {
    why: `T82 F20: the title strip draws the stored logo as an image entity on SHEET_MUTED inside the 24 x 24 box `
      + `(logoOf, imageSizeOf, fitLogo: the ratio kept, centred); no logo, the box as T71 drew it. ${OWNER}`,
    gates: [],
  },
  'src/lib/drawingExport.js': {
    why: `T82 F20: the PDF embeds an image entity's raster when it has one (pdfImageOf: the SVG logo's PNG), never `
      + `an SVG; readLogoFile reads the chosen PNG, JPG or SVG in the browser for the Drawings window. ${OWNER}`,
    gates: [],
  },
  'src/engine/profile.js': {
    why: `T82 F20: profile.drawings.set gains logo { maxPx 400, maxKb 256 } (PROPOSED), the APP'S numbers as the `
      + `set's law is. computeCabinet reads no drawings key. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {};

export const GOLDENS = [];

export const REPINNED = [];
