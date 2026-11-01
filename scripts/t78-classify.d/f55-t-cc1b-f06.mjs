/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F6 to F8 . THE DRAWINGS WINDOW. The drawing set's sheets (engine/drawings) are read by the drawings road only, never by computeCabinet; no gate, no golden.
const WHY = '*"usunac przyciski all units i drawing set pdf, tylko export pdf"*; *"logo domyslne z JC albo przycisk wstaw inne logo"*; *"dodac wizualizacje z drugiego kata, render wedlug wyboru"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/jcLogo.js': { why: `T-CC1b F7: NEW, the company's logo from ONE company_settings read (logo_url) through withDb, fetched once into a data URL and cached per session; a refused fetch is said in one line. ${WHY}`, gates: [] },
  'src/engine/drawings/setSheet.js': { why: `T-CC1b F7.3: logoOf takes the company's logo as the fallback when the item has none; nothing else moves. ${WHY}`, gates: [] },
  'src/engine/drawings/wallSheets.js': { why: `T-CC1b F8.2: renderImage becomes visuals { isoLeft, isoRight, render, ai }: up to four Visualisation sheets after the sections, each ticked like any other. ${WHY}`, gates: [] },
  'src/lib/keepPicture.js': { why: `T-CC1b F8.1: NEW, a picture kept under profile.visuals.maxKb (re-encoded as JPEG at a lower quality, then smaller); the encoder injectable for node. ${WHY}`, gates: [] },
  'src/lib/visualNumbers.js': { why: `T-CC1b F8 and F13: NEW, profile.visuals defaults (maxKb 400, aiInputMaxMb 3 after the chat fix of 01.11.2026, 4 before: base64 of 3 MB stays under Vercel's 4.5 MB wall; aiInputLongPx 1536, aiTries 3), the model of lib/saveNumbers.js. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
