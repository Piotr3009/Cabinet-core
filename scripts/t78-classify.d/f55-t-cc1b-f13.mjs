/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T-CC1b F13 . THE AI VISUALISATION (law 8). No engine delta: engine/design.js is read, not written.
const WHY = '*"wizualizacja AI z renderu, max 3 proby, wybierasz jedna i dodajesz do rysunkow, tanie API"*; *"przyjmiemy GPT, open AI, zaprojektuj polaczenie"* (the owner, 01.11.2026)';
export const GATES = {};
export const LICENSED = {
  'src/lib/aiVisualise.js': { why: `T-CC1b F13.1: NEW, pure: buildPrompt (at most 2000 chars), visualise through jcFetch('/api/ai/visualise') one call one picture, the input size guard, JC's words for 401/403/429/503/504. CC holds no key. ${WHY}`, gates: [] },
};
export const LIVENESS = {};
export const GOLDENS = [];
export const REPINNED = [];
